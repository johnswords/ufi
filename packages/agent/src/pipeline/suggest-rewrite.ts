import type { PayerRule, PredictionResult } from "@ufi/shared";

import { OllamaConnectionError } from "./errors.js";

export interface RewriteOptions {
  readonly model?: string;
  readonly baseUrl?: string;
  readonly temperature?: number;
}

const REWRITE_SYSTEM_PROMPT = `You are a medical documentation specialist helping physicians improve their clinical notes for prior authorization approval.

Given an original physician note and a list of missing criteria, rewrite the note to address the documentation gaps while preserving all existing clinical content.

Rules:
1. PRESERVE all original clinical content.
2. ADD documentation for each missing criterion.
3. Use [BRACKET PLACEHOLDERS] for values the physician must fill in (e.g., [BMI value], [number of PT sessions], [date of MRI]).
4. Match the physician's documentation style.
5. Do NOT fabricate clinical findings.
6. Keep the rewrite concise and clinically appropriate.`;

function buildMissingCriteriaContext(prediction: PredictionResult, rules: PayerRule[]): string {
  const lines: string[] = [];

  if (prediction.missingCriteria.length > 0) {
    lines.push("Missing Criteria:");
    for (const item of prediction.missingCriteria) {
      lines.push(`- [${item.ruleType}] ${item.description} (severity: ${item.severity})`);
    }
  }

  if (rules.length > 0) {
    lines.push("\nPayer Rules:");
    for (const rule of rules.slice(0, 3)) {
      lines.push(`${rule.payer} — ${rule.title}`);
      for (const criterion of rule.criteria) {
        switch (criterion.type) {
          case "threshold":
            lines.push(
              `  - Requires: ${criterion.measure} ${criterion.operator} ${criterion.value}${criterion.unit ? ` ${criterion.unit}` : ""}`
            );
            break;
          case "failed_treatment":
            lines.push(
              `  - Requires: failure of ${criterion.treatment}${criterion.durationWeeks ? ` (${criterion.durationWeeks} weeks)` : ""}`
            );
            break;
          case "documentation_required":
            lines.push(`  - Requires: ${criterion.description.slice(0, 120)}`);
            break;
          case "comorbidity":
            lines.push(`  - Requires comorbidities: ${criterion.conditions.join(", ")}`);
            break;
          case "diagnosis_required":
            lines.push(`  - Requires ICD-10: ${criterion.icd10Codes.join(", ")}`);
            break;
          case "narrative":
            break;
        }
      }
    }
  }

  return lines.join("\n");
}

export async function suggestRewrite(
  originalNote: string,
  prediction: PredictionResult,
  rules: PayerRule[],
  options: RewriteOptions = {}
): Promise<string> {
  const { model = "glm-4.7-flash:latest", baseUrl = "http://localhost:11434", temperature = 0.3 } = options;

  if (prediction.verdict === "approved" && prediction.missingCriteria.length === 0) {
    return originalNote;
  }

  const context = buildMissingCriteriaContext(prediction, rules);
  const userMessage = `Original Note:\n${originalNote}\n\nVerdict: ${prediction.verdict}\nReasoning: ${prediction.reasoning.join("; ")}\n\n${context}\n\nRewrite the note to address ALL missing criteria. Use [BRACKET PLACEHOLDERS] for values the physician needs to fill in.`;

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: REWRITE_SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ],
        stream: false,
        think: false,
        options: { temperature, num_predict: 4096 }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    const content = data.message?.content?.trim() ?? "";

    if (!content) {
      return originalNote;
    }

    return content;
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes("ECONNREFUSED") || error.message.includes("fetch failed"))) {
      throw new OllamaConnectionError(`Failed to connect to Ollama at ${baseUrl} for rewrite.`, { cause: error });
    }
    throw error;
  }
}
