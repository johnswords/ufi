import { describe, expect, it } from "vitest";

import { extractCriteriaFromCmsTexts } from "../src/index.js";

describe("extractCriteriaFromCmsTexts", () => {
  it("extracts structured thresholds, comorbidities, failed treatment, and documentation requirements", () => {
    const criteria = extractCriteriaFromCmsTexts([
      `
      The beneficiary has a body-mass index (BMI) >= 35 kg/m2.
      The beneficiary has at least one co-morbidity related to obesity (e.g., diabetes, sleep apnea, hypertension).
      The beneficiary has been previously unsuccessful with medical treatment for obesity.
      Documentation of the severity of the comorbid condition must be included in the medical record.
      `
    ]);

    expect(criteria).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "threshold",
          measure: "BMI",
          operator: ">=",
          value: 35
        }),
        expect.objectContaining({
          type: "comorbidity",
          conditions: expect.arrayContaining(["diabetes", "sleep apnea", "hypertension"])
        }),
        expect.objectContaining({
          type: "failed_treatment",
          treatment: "medical treatment for obesity"
        }),
        expect.objectContaining({
          type: "documentation_required"
        })
      ])
    );
  });

  it("keeps narrative fallback when a segment is not safely parseable", () => {
    const criteria = extractCriteriaFromCmsTexts([
      "Facilities are no longer required to be certified for this procedure."
    ]);

    expect(criteria).toEqual([
      {
        type: "narrative",
        text: "Facilities are no longer required to be certified for this procedure."
      }
    ]);
  });
});
