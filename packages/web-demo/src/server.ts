import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { serve } from "@hono/node-server";
import {
  extractCriteria,
  identifyGaps,
  matchPayerRules,
  OllamaConnectionError,
  predictOutcome,
  suggestRewrite
} from "@ufi/agent";
import {
  commercialPayerRules,
  createPayerRulesRepository,
  paRequirementSeeds,
  transparencyMetricsSeeds
} from "@ufi/payer-rules";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { cptCodes } from "./cpt-codes.js";
import { sampleNotes } from "./samples.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "glm-4.7-flash:latest";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

async function main(): Promise<void> {
  const repository = createPayerRulesRepository();
  await repository.migrate();
  await repository.upsertRules(commercialPayerRules);
  await repository.upsertPaRequirements(paRequirementSeeds);
  await repository.upsertTransparencyMetrics(transparencyMetricsSeeds);
  const ruleCount = await repository.countRules();
  console.log(
    `Seeded ${ruleCount} payer rules, ${paRequirementSeeds.length} PA requirements, ${transparencyMetricsSeeds.length} transparency metrics`
  );
  console.log(`Ollama model: ${OLLAMA_MODEL} at ${OLLAMA_BASE_URL}`);

  const app = new Hono();

  app.use("*", cors());
  app.use("*", logger());

  // --- API routes ---

  app.post("/api/predict", async (c) => {
    const body = await c.req.json<{ noteText?: string; cptCode?: string; carrier?: string }>();

    if (!body.noteText || !body.cptCode || !body.carrier) {
      return c.json({ error: "Missing required fields: noteText, cptCode, carrier" }, 400);
    }

    const ollamaOpts = { model: OLLAMA_MODEL, baseUrl: OLLAMA_BASE_URL };

    try {
      // Step 1: Extract structured criteria from physician note via Ollama
      const criteria = await extractCriteria(body.noteText, body.cptCode, ollamaOpts);

      // Step 2: Match payer rules for this CPT + carrier
      const rules = await matchPayerRules(body.cptCode, body.carrier, repository);

      // Step 2b: Fetch PA requirements and transparency metrics
      const paRequirements = await repository.getPaRequirements(body.cptCode);
      const paForCarrier = paRequirements.find((pa) => pa.payer.toLowerCase() === body.carrier?.toLowerCase());

      const allMetrics = await repository.getTransparencyMetrics(body.carrier);
      // Prefer MSK/orthopedic category, fall back to overall
      const metrics =
        allMetrics.find((m) => m.serviceCategory != null) ?? allMetrics.find((m) => m.serviceCategory == null);

      // Step 3: Predict outcome (pure function — no LLM), adjusted by transparency metrics
      const prediction = predictOutcome(criteria, rules, metrics);

      // Step 4: Identify documentation gaps
      const gaps = identifyGaps(criteria, rules);

      // Step 5: Suggest rewrite if not approved
      let suggestedRewrite: string | undefined;
      if (prediction.verdict !== "approved" || gaps.length > 0) {
        try {
          suggestedRewrite = await suggestRewrite(body.noteText, prediction, rules, ollamaOpts);
        } catch {
          // Rewrite is optional — don't fail the whole request
          suggestedRewrite = undefined;
        }
      }

      return c.json({
        ...prediction,
        extractedCriteria: criteria,
        matchedRules: rules.map((r) => ({
          payer: r.payer,
          title: r.title,
          sourceDocumentId: r.sourceDocumentId,
          criteriaCount: r.criteria.length
        })),
        paRequired: paForCarrier ? paForCarrier.requiresPriorAuth : undefined,
        paNote: paForCarrier?.notes,
        metricsContext: metrics
          ? {
              payer: metrics.payer,
              approvalRate: metrics.approvalRate,
              serviceCategory: metrics.serviceCategory,
              reportingPeriod: metrics.reportingPeriod
            }
          : undefined,
        suggestedRewrite
      });
    } catch (error: unknown) {
      if (error instanceof OllamaConnectionError) {
        return c.json(
          {
            error: "OLLAMA_UNAVAILABLE",
            message: `Cannot reach Ollama at ${OLLAMA_BASE_URL}. Is the Ollama server running with model ${OLLAMA_MODEL}?`
          },
          503
        );
      }

      console.error("Prediction failed:", error);
      return c.json(
        {
          error: "PREDICTION_FAILED",
          message: error instanceof Error ? error.message : "Unknown error during prediction"
        },
        500
      );
    }
  });

  app.get("/api/carriers", async (c) => {
    const rules = await repository.listRules();

    const carrierMap = new Map<string, number>();
    for (const rule of rules) {
      carrierMap.set(rule.payer, (carrierMap.get(rule.payer) ?? 0) + 1);
    }

    if (!carrierMap.has("Medicare")) {
      carrierMap.set("Medicare", 0);
    }

    const carriers = Array.from(carrierMap.entries())
      .map(([name, count]) => ({ name, ruleCount: count }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return c.json({ carriers });
  });

  app.get("/api/cpt-codes", (c) => {
    return c.json({ codes: cptCodes });
  });

  app.get("/api/samples", (c) => {
    return c.json({ samples: sampleNotes });
  });

  app.get("/api/pa-check/:cpt", async (c) => {
    const cptCode = c.req.param("cpt");
    const requirements = await repository.getPaRequirements(cptCode);
    return c.json({ cptCode, requirements });
  });

  app.get("/api/metrics/:payer", async (c) => {
    const payer = c.req.param("payer");
    const metrics = await repository.getTransparencyMetrics(payer);
    return c.json({ payer, metrics });
  });

  app.get("/api/metrics", async (c) => {
    const metrics = await repository.getAllTransparencyMetrics();
    return c.json({ metrics });
  });

  // --- Static file serving ---

  app.get("/", (c) => {
    const html = readFileSync(join(__dirname, "index.html"), "utf-8");
    return c.html(html);
  });

  // --- Start server ---

  const port = Number(process.env.PORT ?? 3000);

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`UFI MedEnt Web Demo running at http://localhost:${info.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
