import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  extractCriteriaFromNarrative,
  extractDiagnosisRequirements,
  inferProcedureCodesFromCmsTexts
} from "../src/extractor.js";

const fixtureDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "cms");

function loadJson(name: string): unknown {
  return JSON.parse(readFileSync(path.join(fixtureDirectory, name), "utf8"));
}

describe("extractCriteriaFromNarrative", () => {
  it("extracts structured criteria from CMS LCD/NCD narrative with fallback", () => {
    const lcd = loadJson("data-lcd-33411.json").data[0];
    const ncd = loadJson("data-ncd-57.json").data[0];

    const criteria = extractCriteriaFromNarrative(lcd.indication, lcd.associated_info, ncd.indications_limitations);

    expect(
      criteria.some(
        (criterion) =>
          criterion.type === "threshold" &&
          /BMI/i.test(criterion.measure) &&
          criterion.operator === ">=" &&
          criterion.value === 35
      )
    ).toBe(true);
    expect(
      criteria.some(
        (criterion) => criterion.type === "failed_treatment" && criterion.treatment === "medical treatment for obesity"
      )
    ).toBe(true);
    expect(
      criteria.some(
        (criterion) =>
          criterion.type === "comorbidity" &&
          criterion.conditions.includes("diabetes") &&
          criterion.conditions.includes("hypertension")
      )
    ).toBe(true);
    expect(
      criteria.some(
        (criterion) => criterion.type === "documentation_required" && /medical record/i.test(criterion.description)
      )
    ).toBe(true);
    expect(
      criteria.some(
        (criterion) =>
          criterion.type === "narrative" && /facility certification|local coverage article/i.test(criterion.text)
      )
    ).toBe(true);
  });

  it("extracts diagnosis_required criteria from ICD-10 codes in narrative", () => {
    const criteria = extractCriteriaFromNarrative(
      "Covered diagnoses include M17.11 (primary osteoarthritis, right knee) and M17.12 (primary osteoarthritis, left knee)."
    );

    expect(
      criteria.some(
        (criterion) =>
          criterion.type === "diagnosis_required" &&
          criterion.icd10Codes.includes("M17.11") &&
          criterion.icd10Codes.includes("M17.12")
      )
    ).toBe(true);
  });

  it("infers CPT codes for bariatric procedures mentioned in CMS narrative", () => {
    const ncd = loadJson("data-ncd-57.json").data[0];

    const procedureCodes = inferProcedureCodesFromCmsTexts([ncd.item_service_description, ncd.indications_limitations]);

    expect(procedureCodes.map((code) => code.cptCode)).toEqual(
      expect.arrayContaining(["43644", "43846", "43770", "43775", "43845"])
    );
  });
});

describe("extractDiagnosisRequirements", () => {
  it("extracts a single ICD-10 code", () => {
    const result = extractDiagnosisRequirements("Diagnosis: M54.5");
    expect(result).toEqual([{ type: "diagnosis_required", icd10Codes: ["M54.5"] }]);
  });

  it("extracts multiple ICD-10 codes from a comma-separated list", () => {
    const result = extractDiagnosisRequirements("Applicable codes: M17.11, G56.00, S83.511A");
    expect(result).toEqual([
      {
        type: "diagnosis_required",
        icd10Codes: ["G56.00", "M17.11", "S83.511A"]
      }
    ]);
  });

  it("extracts codes with descriptions in LCD-style lists", () => {
    const result = extractDiagnosisRequirements(
      "E66.01 - Morbid obesity due to excess calories\nE66.09 - Other obesity due to excess calories"
    );
    expect(result).toEqual([
      {
        type: "diagnosis_required",
        icd10Codes: ["E66.01", "E66.09"]
      }
    ]);
  });

  it("deduplicates repeated codes", () => {
    const result = extractDiagnosisRequirements("M17.11 is required. Confirm M17.11 before submission.");
    expect(result).toEqual([{ type: "diagnosis_required", icd10Codes: ["M17.11"] }]);
  });

  it("returns empty array when no ICD-10 codes are present", () => {
    const result = extractDiagnosisRequirements("The patient must have failed conservative treatment.");
    expect(result).toEqual([]);
  });

  it("extracts codes without a decimal portion", () => {
    const result = extractDiagnosisRequirements("Diagnosis code E66 applies.");
    expect(result).toEqual([{ type: "diagnosis_required", icd10Codes: ["E66"] }]);
  });

  it("sorts extracted codes alphabetically", () => {
    const result = extractDiagnosisRequirements("Z96.641, M17.11, E66.01");
    expect(result[0]!.type === "diagnosis_required" && result[0]!.icd10Codes).toEqual(["E66.01", "M17.11", "Z96.641"]);
  });
});
