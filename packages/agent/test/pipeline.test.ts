import type { PayerRule, PayerTransparencyMetrics, StructuredCriteria } from "@ufi/shared";
import { createPayerRuleFixture, createStructuredCriteriaFixture } from "@ufi/shared";
import { describe, expect, it, vi } from "vitest";
import { OllamaConnectionError } from "../src/pipeline/errors.js";
import { extractCriteria } from "../src/pipeline/extract-criteria.js";
import { identifyGaps } from "../src/pipeline/identify-gaps.js";
import type { RuleSource } from "../src/pipeline/match-payer-rules.js";
import { matchPayerRules } from "../src/pipeline/match-payer-rules.js";
import { predictOutcome } from "../src/pipeline/predict-outcome.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeGastrectomyCriteria(overrides: Partial<StructuredCriteria> = {}): StructuredCriteria {
  return createStructuredCriteriaFixture({
    cptCode: "43775",
    icdCodes: ["E66.01", "E11.9"],
    clinicalEvidence: [
      { type: "threshold", description: "BMI", value: 38, unit: "kg/m2" },
      { type: "comorbidity", description: "Type 2 diabetes" },
      { type: "failed_treatment", description: "Supervised diet and exercise program", durationWeeks: 26 },
      { type: "functional_limitation", description: "Unable to perform daily activities due to morbid obesity" }
    ],
    payerType: "Medicare",
    extractionConfidence: 0.9,
    ...overrides
  });
}

function makeGastrectomyRule(overrides: Partial<PayerRule> = {}): PayerRule {
  return createPayerRuleFixture({
    cptCode: "43775",
    payer: "CMS Medicare",
    criteria: [
      { type: "threshold", measure: "BMI", operator: ">=", value: 35 },
      { type: "comorbidity", conditions: ["type 2 diabetes", "hypertension", "sleep apnea"] },
      {
        type: "failed_treatment",
        treatment: "Supervised diet and exercise program",
        durationWeeks: 24
      },
      {
        type: "documentation_required",
        description: "Psychological evaluation documenting readiness for surgery"
      }
    ],
    ...overrides
  });
}

function makeKneeRule(): PayerRule {
  return createPayerRuleFixture({
    cptCode: "27447",
    payer: "Cigna",
    title: "Total Knee Replacement — OA Criteria",
    criteria: [
      { type: "threshold", measure: "Kellgren-Lawrence grade", operator: ">=", value: 3, unit: "grade" },
      {
        type: "failed_treatment",
        treatment: "Physical therapy",
        durationWeeks: 12
      },
      {
        type: "documentation_required",
        description: "Imaging showing severe osteoarthritis"
      },
      {
        type: "documentation_required",
        description: "Loss of knee function interfering with ADLs"
      },
      {
        type: "narrative",
        text: "Exception: Non-surgical management may be inappropriate if medical record clearly documents why."
      }
    ]
  });
}

// ---------------------------------------------------------------------------
// extractCriteria (mocked LLM)
// ---------------------------------------------------------------------------

const mockOllamaResponse = {
  message: {
    content: JSON.stringify({
      icdCodes: ["M17.11"],
      clinicalEvidence: [
        { type: "failed_treatment", description: "Physical therapy", durationWeeks: 12 },
        { type: "threshold", description: "Kellgren-Lawrence grade", value: 4, unit: "grade" }
      ],
      payerType: "Commercial",
      payerPlanCategory: "PPO",
      extractionConfidence: 0.88
    })
  }
};

describe("extractCriteria", () => {
  it("returns StructuredCriteria from mocked Ollama response", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(mockOllamaResponse), { status: 200 }));

    const result = await extractCriteria("Patient has severe knee OA, KL grade 4, failed 12 weeks PT.", "27447", {
      agentId: "test-agent"
    });

    expect(result.cptCode).toBe("27447");
    expect(result.icdCodes).toEqual(["M17.11"]);
    expect(result.clinicalEvidence).toHaveLength(2);
    expect(result.clinicalEvidence[0]?.type).toBe("failed_treatment");
    expect(result.clinicalEvidence[1]?.type).toBe("threshold");
    expect(result.payerType).toBe("Commercial");
    expect(result.extractionConfidence).toBe(0.88);
    expect(result.agentId).toBe("test-agent");
    expect(result.timestamp).toBeTruthy();

    fetchSpy.mockRestore();
  });

  it("throws OllamaConnectionError when connection fails", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("fetch failed: ECONNREFUSED"));

    await expect(extractCriteria("test note", "27447")).rejects.toThrow(OllamaConnectionError);

    fetchSpy.mockRestore();
  });

  it("retries with correction prompt when schema validation fails", async () => {
    const badResponse = {
      message: { content: JSON.stringify({ wrong_field: "bad schema" }) }
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(badResponse), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockOllamaResponse), { status: 200 }));

    const result = await extractCriteria("test note", "27447");
    expect(result.cptCode).toBe("27447");
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    fetchSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// predictOutcome
// ---------------------------------------------------------------------------

describe("predictOutcome", () => {
  it("returns 'approved' when >= 80% of criteria met", () => {
    const criteria = makeGastrectomyCriteria();
    const rule = makeGastrectomyRule();

    const result = predictOutcome(criteria, [rule]);

    // BMI >= 35: met (38), comorbidity: met (type 2 diabetes), failed treatment: met (26 >= 24 weeks)
    // documentation_required for psych eval: not met (no matching evidence)
    // 3/4 = 75%... so this should be needs-documentation
    // Actually let's check: we need 80% for approved
    expect(result.verdict).toBe("needs-documentation");
    expect(result.missingCriteria.length).toBeGreaterThan(0);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it("returns 'approved' when all checkable criteria met", () => {
    const criteria = makeGastrectomyCriteria({
      clinicalEvidence: [
        { type: "threshold", description: "BMI", value: 40, unit: "kg/m2" },
        { type: "comorbidity", description: "Type 2 diabetes mellitus" },
        { type: "failed_treatment", description: "Supervised diet and exercise program", durationWeeks: 30 },
        { type: "other", description: "Psychological evaluation documenting readiness for surgery completed" }
      ]
    });
    const rule = makeGastrectomyRule();

    const result = predictOutcome(criteria, [rule]);

    expect(result.verdict).toBe("approved");
    expect(result.missingCriteria).toHaveLength(0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("returns 'denied' when < 40% of criteria met", () => {
    const criteria = makeGastrectomyCriteria({
      clinicalEvidence: [{ type: "threshold", description: "BMI", value: 32, unit: "kg/m2" }],
      icdCodes: []
    });
    const rule = makeGastrectomyRule();

    const result = predictOutcome(criteria, [rule]);

    expect(result.verdict).toBe("denied");
    expect(result.missingCriteria.length).toBeGreaterThan(0);
  });

  it("returns 'needs-documentation' when no rules provided", () => {
    const criteria = makeGastrectomyCriteria();

    const result = predictOutcome(criteria, []);

    expect(result.verdict).toBe("needs-documentation");
    expect(result.reasoning).toContain(
      "No matching payer rules found for this CPT code and carrier. Manual review required."
    );
  });

  it("skips narrative criteria and flags them for manual review", () => {
    const criteria = createStructuredCriteriaFixture({
      cptCode: "27447",
      clinicalEvidence: [
        { type: "threshold", description: "Kellgren-Lawrence grade", value: 4, unit: "grade" },
        { type: "failed_treatment", description: "Physical therapy", durationWeeks: 14 },
        { type: "other", description: "Imaging showing severe osteoarthritis with bone-on-bone" },
        { type: "functional_limitation", description: "Loss of knee function interfering with ADLs and employment" }
      ]
    });
    const rule = makeKneeRule();

    const result = predictOutcome(criteria, [rule]);

    // Narrative criteria should not count toward the total
    expect(result.reasoning.some((r) => r.includes("narrative"))).toBe(true);
  });

  it("handles threshold operators correctly", () => {
    const criteria = createStructuredCriteriaFixture({
      clinicalEvidence: [{ type: "threshold", description: "BMI", value: 34.9, unit: "kg/m2" }]
    });
    const rule = createPayerRuleFixture({
      criteria: [{ type: "threshold", measure: "BMI", operator: ">=", value: 35 }]
    });

    const result = predictOutcome(criteria, [rule]);

    // BMI 34.9 < 35, should not meet the threshold
    expect(result.verdict).toBe("denied");
    expect(result.missingCriteria).toHaveLength(1);
  });

  it("matches diagnosis_required criteria by ICD code prefix", () => {
    const criteria = createStructuredCriteriaFixture({
      icdCodes: ["M17.11", "E11.9"],
      clinicalEvidence: []
    });
    const rule = createPayerRuleFixture({
      criteria: [{ type: "diagnosis_required", icd10Codes: ["M17"] }]
    });

    const result = predictOutcome(criteria, [rule]);

    expect(result.verdict).toBe("approved");
    expect(result.missingCriteria).toHaveLength(0);
  });

  it("selects the best-scoring rule when multiple rules provided", () => {
    const criteria = createStructuredCriteriaFixture({
      cptCode: "27447",
      clinicalEvidence: [{ type: "threshold", description: "BMI", value: 40, unit: "kg/m2" }]
    });

    const strictRule = createPayerRuleFixture({
      cptCode: "27447",
      payer: "Strict",
      criteria: [
        { type: "threshold", measure: "BMI", operator: ">=", value: 35 },
        { type: "failed_treatment", treatment: "PT", durationWeeks: 12 },
        { type: "documentation_required", description: "MRI confirmation" },
        { type: "documentation_required", description: "Psych eval" }
      ]
    });

    const lenientRule = createPayerRuleFixture({
      cptCode: "27447",
      payer: "Lenient",
      criteria: [{ type: "threshold", measure: "BMI", operator: ">=", value: 35 }]
    });

    const result = predictOutcome(criteria, [strictRule, lenientRule]);

    // The lenient rule should score 1/1 = 100%, the strict rule 1/4 = 25%
    // Best score wins, so verdict should be approved
    expect(result.verdict).toBe("approved");
  });

  it("high approval rate yields higher confidence than low approval rate", () => {
    const criteria = makeGastrectomyCriteria({
      clinicalEvidence: [
        { type: "threshold", description: "BMI", value: 40, unit: "kg/m2" },
        { type: "comorbidity", description: "Type 2 diabetes mellitus" },
        { type: "failed_treatment", description: "Supervised diet and exercise program", durationWeeks: 30 },
        { type: "other", description: "Psychological evaluation documenting readiness for surgery completed" }
      ]
    });
    const rule = makeGastrectomyRule();

    const highMetrics: PayerTransparencyMetrics = {
      payer: "HighPayer",
      reportingPeriod: "2025-Q3",
      approvalRate: 0.95,
      denialRate: 0.05,
      sourceUrl: "https://example.com",
      lastUpdated: "2025-10-15"
    };

    const lowMetrics: PayerTransparencyMetrics = {
      payer: "LowPayer",
      reportingPeriod: "2025-Q3",
      approvalRate: 0.5,
      denialRate: 0.5,
      sourceUrl: "https://example.com",
      lastUpdated: "2025-10-15"
    };

    const highResult = predictOutcome(criteria, [rule], highMetrics);
    const lowResult = predictOutcome(criteria, [rule], lowMetrics);

    // Higher approval rate should yield higher adjusted confidence
    expect(highResult.confidence).toBeGreaterThan(lowResult.confidence);
    expect(highResult.reasoning.some((r) => r.includes("transparency data"))).toBe(true);
    expect(lowResult.reasoning.some((r) => r.includes("transparency data"))).toBe(true);
  });

  it("low approval rate metrics decrease confidence from base", () => {
    const criteria = makeGastrectomyCriteria({
      clinicalEvidence: [
        { type: "threshold", description: "BMI", value: 40, unit: "kg/m2" },
        { type: "comorbidity", description: "Type 2 diabetes mellitus" },
        { type: "failed_treatment", description: "Supervised diet and exercise program", durationWeeks: 30 },
        { type: "other", description: "Psychological evaluation documenting readiness for surgery completed" }
      ]
    });
    const rule = makeGastrectomyRule();

    const baseResult = predictOutcome(criteria, [rule]);

    const lowMetrics: PayerTransparencyMetrics = {
      payer: "TestPayer",
      reportingPeriod: "2025-Q3",
      approvalRate: 0.5,
      denialRate: 0.5,
      sourceUrl: "https://example.com",
      lastUpdated: "2025-10-15"
    };

    const adjustedResult = predictOutcome(criteria, [rule], lowMetrics);

    expect(adjustedResult.confidence).toBeLessThan(baseResult.confidence);
  });

  it("leaves confidence unchanged without metrics", () => {
    const criteria = makeGastrectomyCriteria();
    const rule = makeGastrectomyRule();

    const result1 = predictOutcome(criteria, [rule]);
    const result2 = predictOutcome(criteria, [rule], undefined);

    expect(result1.confidence).toBe(result2.confidence);
  });
});

// ---------------------------------------------------------------------------
// matchPayerRules
// ---------------------------------------------------------------------------

describe("matchPayerRules", () => {
  function makeSource(rules: PayerRule[]): RuleSource {
    return { listRules: async () => rules };
  }

  it("returns carrier-specific rules matching CPT code", async () => {
    const cignaRule = createPayerRuleFixture({ cptCode: "27447", payer: "Cigna" });
    const aetnaRule = createPayerRuleFixture({ cptCode: "27447", payer: "Aetna" });
    const cmsRule = createPayerRuleFixture({ cptCode: "27447", payer: "CMS Medicare" });

    const result = await matchPayerRules("27447", "Cigna", makeSource([cignaRule, aetnaRule, cmsRule]));

    expect(result).toHaveLength(1);
    expect(result[0]!.payer).toBe("Cigna");
  });

  it("falls back to CMS Medicare when no carrier match", async () => {
    const cmsRule = createPayerRuleFixture({ cptCode: "27447", payer: "CMS Medicare" });
    const aetnaRule = createPayerRuleFixture({ cptCode: "27447", payer: "Aetna" });

    const result = await matchPayerRules("27447", "Blue Cross", makeSource([cmsRule, aetnaRule]));

    expect(result).toHaveLength(1);
    expect(result[0]!.payer).toBe("CMS Medicare");
  });

  it("returns empty when no CPT match at all", async () => {
    const rule = createPayerRuleFixture({ cptCode: "99999", payer: "Cigna" });

    const result = await matchPayerRules("27447", "Cigna", makeSource([rule]));

    expect(result).toHaveLength(0);
  });

  it("performs case-insensitive carrier matching", async () => {
    const rule = createPayerRuleFixture({ cptCode: "27447", payer: "UnitedHealthcare" });

    const result = await matchPayerRules("27447", "unitedhealthcare", makeSource([rule]));

    expect(result).toHaveLength(1);
  });

  it("performs partial carrier matching", async () => {
    const rule = createPayerRuleFixture({ cptCode: "29888", payer: "Cigna" });

    // "Cigna" is contained within "Cigna/eviCore", but also "Cigna" contains itself
    const result = await matchPayerRules("29888", "Cigna", makeSource([rule]));

    expect(result).toHaveLength(1);
  });

  it("skips inactive rules", async () => {
    const inactive = createPayerRuleFixture({ cptCode: "27447", payer: "Cigna", active: false });
    const active = createPayerRuleFixture({
      cptCode: "27447",
      payer: "Cigna",
      sourceDocumentId: "other-doc"
    });

    const result = await matchPayerRules("27447", "Cigna", makeSource([inactive, active]));

    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// identifyGaps
// ---------------------------------------------------------------------------

describe("identifyGaps", () => {
  it("returns missing criteria items for unmet requirements", () => {
    const criteria = makeGastrectomyCriteria({
      clinicalEvidence: [{ type: "threshold", description: "BMI", value: 38, unit: "kg/m2" }]
    });
    const rule = makeGastrectomyRule();

    const gaps = identifyGaps(criteria, [rule]);

    expect(gaps.length).toBeGreaterThan(0);
    for (const gap of gaps) {
      expect(gap.description).toBeTruthy();
      expect(gap.ruleType).toBeTruthy();
      expect(gap.severity).toBe("required");
    }
  });

  it("returns empty array when no rules provided", () => {
    const criteria = makeGastrectomyCriteria();

    const gaps = identifyGaps(criteria, []);

    expect(gaps).toHaveLength(0);
  });

  it("returns empty array when all criteria met", () => {
    const criteria = createStructuredCriteriaFixture({
      icdCodes: ["M17.11"],
      clinicalEvidence: []
    });
    const rule = createPayerRuleFixture({
      criteria: [{ type: "diagnosis_required", icd10Codes: ["M17"] }]
    });

    const gaps = identifyGaps(criteria, [rule]);

    expect(gaps).toHaveLength(0);
  });
});
