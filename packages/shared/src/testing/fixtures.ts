import type { PayerRule, StructuredCriteria } from "../domain/index.js";

export function createStructuredCriteriaFixture(
  overrides: Partial<StructuredCriteria> = {}
): StructuredCriteria {
  return {
    cptCode: "27447",
    icdCodes: ["M17.11"],
    clinicalEvidence: [
      {
        type: "failed_treatment",
        description: "Failed 6 weeks of supervised physical therapy",
        durationWeeks: 6
      },
      {
        type: "functional_limitation",
        description: "Unable to walk more than one block without severe pain"
      }
    ],
    payerType: "Medicare",
    payerPlanCategory: "Part B",
    extractionConfidence: 0.92,
    agentId: "practice-agent-east",
    timestamp: "2026-03-19T14:00:00.000Z",
    ...overrides
  };
}

export function createPayerRuleFixture(overrides: Partial<PayerRule> = {}): PayerRule {
  return {
    sourceType: "cms_lcd",
    sourceDocumentId: "L33411",
    sourceDocumentVersion: 29,
    sourceUrl: "https://www.cms.gov/medicare-coverage-database/view/lcd.aspx?lcdid=33411&ver=29",
    cptCode: "43775",
    cptDescription: "Laparoscopic sleeve gastrectomy",
    payer: "CMS Medicare",
    payerPlanCategory: "Part B",
    title: "Surgical Management of Morbid Obesity",
    criteria: [
      {
        type: "threshold",
        measure: "BMI",
        operator: ">=",
        value: 35
      },
      {
        type: "comorbidity",
        conditions: ["type 2 diabetes", "hypertension"]
      }
    ],
    effectiveDate: "10/01/2019",
    active: true,
    lastSyncedAt: "2026-03-19T14:00:00.000Z",
    ...overrides
  };
}
