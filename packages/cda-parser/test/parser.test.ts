import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { CdaParseError, parseCdaDocument } from "../src/index.js";

const completeFixture = readFileSync(new URL("./fixtures/complete-cda.xml", import.meta.url), "utf8");
const missingSectionsFixture = readFileSync(new URL("./fixtures/missing-sections-cda.xml", import.meta.url), "utf8");
const templateIdFixture = readFileSync(new URL("./fixtures/template-id-cda.xml", import.meta.url), "utf8");

describe("parseCdaDocument", () => {
  it("parses a raw CDA XML fixture into typed domain objects", () => {
    const document = parseCdaDocument(completeFixture);

    expect(document.clinicalNotes[0]?.text).toContain("worsening right knee pain");
    expect(document.problems).toEqual([
      {
        code: "M17.11",
        description: "Unilateral primary osteoarthritis, right knee",
        status: "active"
      }
    ]);
    expect(document.procedures[0]).toEqual({
      code: "27447",
      description: "Total knee arthroplasty",
      performedAt: "2026-03-19T00:00:00.000Z"
    });
    expect(document.medications[0]?.name).toBe("Naproxen");
    expect(document.insuranceProviders[0]?.name).toBe("Aetna");
    expect(document.assessmentPlan).toEqual({
      assessment: "Assessment: severe tricompartmental osteoarthritis of the right knee.",
      plan: "Plan: proceed with total knee replacement pending authorization."
    });
    expect(document.vitalSigns[0]).toEqual({
      type: "Body mass index",
      value: 34,
      unit: "kg/m2",
      recordedAt: "2026-03-19T10:30:00-05:00"
    });
    expect(document.raw.ClinicalDocument).toBeDefined();
    expect(JSON.stringify(document.raw).includes("This content should remain available in the raw output.")).toBe(true);
  });

  it("parses base64 encoded CDA content", () => {
    const encoded = Buffer.from(completeFixture, "utf8").toString("base64");

    const document = parseCdaDocument(encoded);

    expect(document).toMatchSnapshot();
  });

  it("returns empty collections when optional sections are missing", () => {
    const document = parseCdaDocument(missingSectionsFixture);

    expect(document.clinicalNotes).toHaveLength(1);
    expect(document.problems).toEqual([]);
    expect(document.procedures).toEqual([]);
    expect(document.medications).toEqual([]);
    expect(document.insuranceProviders).toEqual([]);
    expect(document.assessmentPlan).toBeNull();
    expect(document.vitalSigns).toEqual([]);
  });

  it("matches sections by template ID when section codes are absent", () => {
    const document = parseCdaDocument(templateIdFixture);

    expect(document.problems).toEqual([
      {
        code: "E66.01",
        description: "Morbid obesity due to excess calories",
        status: "active"
      }
    ]);
    expect(document.assessmentPlan).toEqual({
      assessment: "Assessment: patient meets qualifying obesity diagnosis criteria.",
      plan: "Plan: submit for laparoscopic sleeve gastrectomy authorization."
    });
  });

  it("throws a typed error for malformed XML", () => {
    const malformedFixture = readFileSync(new URL("./fixtures/malformed-cda.xml", import.meta.url), "utf8");

    let error: unknown;

    try {
      parseCdaDocument(malformedFixture);
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(CdaParseError);
    expect(error).toMatchObject({
      code: "XML_PARSE_ERROR",
      context: {
        error: expect.any(Object)
      }
    });
    expect((error as CdaParseError).message).toMatch(/failed validation/i);
  });

  it("throws a typed error for invalid base64 input", () => {
    const invalidBase64Fixture = readFileSync(new URL("./fixtures/invalid-base64.txt", import.meta.url), "utf8");

    let error: unknown;

    try {
      parseCdaDocument(invalidBase64Fixture);
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(CdaParseError);
    expect(error).toMatchObject({
      code: "INVALID_BASE64"
    });
    expect((error as CdaParseError).message).toMatch(/base64/i);
  });
});
