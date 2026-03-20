import type { StructuredCriteria } from "@ufi/shared";
import { structuredCriteriaSchema } from "@ufi/shared";
import { z } from "zod";

import { ExtractionError, OllamaConnectionError } from "./errors.js";

/**
 * Schema for the raw LLM extraction output, before we augment it
 * with pipeline-level fields (agentId, timestamp, cptCode).
 */
const llmExtractionSchema = z.object({
  icdCodes: z.array(z.string()),
  clinicalEvidence: z.array(
    z.object({
      type: z.enum([
        "failed_treatment",
        "threshold",
        "comorbidity",
        "symptom_duration",
        "functional_limitation",
        "other"
      ]),
      description: z.string(),
      value: z.number().optional(),
      unit: z.string().optional(),
      durationWeeks: z.number().int().positive().optional()
    })
  ),
  payerType: z.string(),
  payerPlanCategory: z.string().optional(),
  extractionConfidence: z.number().min(0).max(1)
});

const SYSTEM_PROMPT = `You are a clinical criteria extraction engine. Extract structured clinical criteria from a physician note for prior authorization.

Extract:
1. ICD-10 codes mentioned or implied (e.g., M17.11 for knee OA)
2. Clinical evidence items with these types:
   - failed_treatment: treatment tried and failed, include durationWeeks if mentioned
   - threshold: measurable value (BMI, pain score, KL grade), include value and unit
   - comorbidity: co-existing condition
   - symptom_duration: how long symptoms lasted, include durationWeeks
   - functional_limitation: specific ADL/mobility limitation
   - other: imaging results, exam findings, lab values
3. Payer type if mentioned, otherwise "Unknown"
4. Confidence score 0-1

Rules: Extract ALL criteria. Include numeric values and durations. Do NOT hallucinate. Do NOT include PHI.

Respond with ONLY a JSON object. No explanation, no markdown, no thinking.

Required JSON shape:
{
  "icdCodes": ["M17.11"],
  "clinicalEvidence": [
    {"type": "failed_treatment", "description": "Physical therapy", "durationWeeks": 14},
    {"type": "threshold", "description": "BMI", "value": 32, "unit": "kg/m2"},
    {"type": "functional_limitation", "description": "Cannot walk more than one block"},
    {"type": "symptom_duration", "description": "Knee pain", "durationWeeks": 32},
    {"type": "comorbidity", "description": "Type 2 diabetes"},
    {"type": "other", "description": "MRI showing full-thickness tear"}
  ],
  "payerType": "Unknown",
  "extractionConfidence": 0.9
}`;

const RETRY_PROMPT = `

IMPORTANT: Your previous response used incorrect field names. You MUST use EXACTLY these field names:
- Top level: icdCodes, clinicalEvidence, payerType, extractionConfidence
- Each evidence item MUST have: type (one of: failed_treatment, threshold, comorbidity, symptom_duration, functional_limitation, other), description
- Optional evidence fields: value (number), unit (string), durationWeeks (integer)
Do NOT use fields like "condition", "procedure_code", "clinical_criteria", "duration". Use the EXACT names shown above.`;

export interface ExtractionOptions {
  readonly model?: string;
  readonly baseUrl?: string;
  readonly agentId?: string;
  readonly temperature?: number;
}

interface OllamaChatResponse {
  readonly message?: {
    readonly content?: string;
    readonly thinking?: string;
  };
}

/**
 * Call Ollama's /api/chat directly, bypassing LangChain.
 * Handles models that put output in `thinking` vs `content` fields.
 */
async function callOllama(
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  temperature: number
): Promise<string> {
  const url = `${baseUrl}/api/chat`;
  const body = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    format: "json",
    stream: false,
    think: false,
    options: { temperature, num_predict: 2048 }
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (error: unknown) {
    throw new OllamaConnectionError(`Failed to connect to Ollama at ${baseUrl}. Is the Ollama server running?`, {
      cause: error
    });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ExtractionError(`Ollama returned ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as OllamaChatResponse;

  // Some models (GLM, Qwen thinking) put output in `content`, others in `thinking`.
  // Check content first, fall back to thinking field.
  const content = data.message?.content?.trim() ?? "";
  const thinking = data.message?.thinking?.trim() ?? "";

  // Use content if it looks like JSON, otherwise try thinking field
  if (content && (content.startsWith("{") || content.startsWith("["))) {
    return content;
  }
  if (content) {
    return content;
  }

  // Content was empty — extract JSON from thinking field
  if (thinking) {
    const jsonMatch = thinking.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
  }

  throw new ExtractionError("Ollama returned empty response in both content and thinking fields.");
}

export async function extractCriteria(
  noteText: string,
  cptCode: string,
  options: ExtractionOptions = {}
): Promise<StructuredCriteria> {
  const {
    model = "glm-4.7-flash:latest",
    baseUrl = "http://localhost:11434",
    agentId = "ufi-agent",
    temperature = 0
  } = options;

  const userMessage = `CPT Code: ${cptCode}\n\nPhysician Note:\n${noteText}`;
  const maxAttempts = 2;
  let rawResult: z.infer<typeof llmExtractionSchema>;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const prompt = attempt === 1 ? SYSTEM_PROMPT : SYSTEM_PROMPT + RETRY_PROMPT;

      const responseText = await callOllama(baseUrl, model, prompt, userMessage, temperature);

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new ExtractionError("LLM response did not contain a JSON object.", {
          cause: responseText.slice(0, 300)
        });
      }

      const parsed: unknown = JSON.parse(jsonMatch[0]);
      rawResult = llmExtractionSchema.parse(parsed);
      break;
    } catch (error: unknown) {
      if (error instanceof OllamaConnectionError) throw error;
      lastError = error;

      if (attempt < maxAttempts && isSchemaError(error)) {
        // Schema validation failed — retry with correction prompt
        continue;
      }

      if (error instanceof ExtractionError) throw error;
      throw new ExtractionError(`LLM extraction failed: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!rawResult!) {
    throw new ExtractionError(
      `LLM extraction failed after ${maxAttempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
      { cause: lastError }
    );
  }

  return structuredCriteriaSchema.parse({
    cptCode,
    icdCodes: rawResult.icdCodes,
    clinicalEvidence: rawResult.clinicalEvidence,
    payerType: rawResult.payerType || "Unknown",
    payerPlanCategory: rawResult.payerPlanCategory || undefined,
    extractionConfidence: rawResult.extractionConfidence,
    agentId,
    timestamp: new Date().toISOString()
  });
}

function isSchemaError(error: unknown): boolean {
  if (error instanceof z.ZodError) return true;
  if (error instanceof SyntaxError) return true;
  if (error instanceof ExtractionError && String(error.cause).includes("JSON")) return true;
  return false;
}
