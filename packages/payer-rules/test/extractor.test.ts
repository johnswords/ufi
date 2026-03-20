import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { extractCriteriaFromNarrative } from "../src/extractor.js";

const fixtureDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "cms"
);

function loadJson(name: string): any {
  return JSON.parse(readFileSync(path.join(fixtureDirectory, name), "utf8"));
}

describe("extractCriteriaFromNarrative", () => {
  it("extracts structured criteria from CMS LCD/NCD narrative with fallback", () => {
    const lcd = loadJson("data-lcd-33411.json").data[0];
    const ncd = loadJson("data-ncd-57.json").data[0];

    const criteria = extractCriteriaFromNarrative(
      lcd.indication,
      lcd.associated_info,
      ncd.indications_limitations
    );

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
        (criterion) =>
          criterion.type === "failed_treatment" &&
          criterion.treatment === "medical treatment for obesity"
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
        (criterion) =>
          criterion.type === "documentation_required" &&
          /medical record/i.test(criterion.description)
      )
    ).toBe(true);
    expect(
      criteria.some(
        (criterion) => criterion.type === "narrative"
      )
    ).toBe(true);
  });
});
