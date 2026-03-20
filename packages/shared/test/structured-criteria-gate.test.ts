import { describe, expect, it } from "vitest";

import type { StructuredCriteria } from "../src/index.js";
import { createStructuredCriteriaFixture, validateStructuredCriteriaForCloudSync } from "../src/index.js";

describe("validateStructuredCriteriaForCloudSync", () => {
  it("passes a valid StructuredCriteria payload", () => {
    const result = validateStructuredCriteriaForCloudSync(createStructuredCriteriaFixture());

    expect(result.passed).toBe(true);
  });

  it("rejects payloads with extra fields", () => {
    const result = validateStructuredCriteriaForCloudSync({
      ...createStructuredCriteriaFixture(),
      patientName: "John Smith"
    });

    expect(result).toEqual({
      passed: false,
      reason: "Payload does not match the StructuredCriteria allowlist."
    });
  });

  it("records audit decisions without echoing payload contents", () => {
    const events: string[] = [];

    const result = validateStructuredCriteriaForCloudSync(
      {
        ...createStructuredCriteriaFixture(),
        clinicalEvidence: [
          {
            type: "other",
            description: "patient: John Smith"
          }
        ]
      },
      {
        onAudit: (event) => {
          events.push(`${event.outcome}:${event.reason}`);
        }
      }
    );

    expect(result.passed).toBe(false);
    expect(events).toEqual(["rejected:PHI_DETECTED"]);
    expect(events.join(" ")).not.toContain("John Smith");
  });

  const phiCases: Array<{ label: string; description: string }> = [
    { label: "names", description: "patient: John Smith" },
    { label: "street address", description: "123 Main Street" },
    { label: "city state zip", description: "Albany, NY 12207" },
    { label: "full date", description: "Seen on 03/15/2024 for worsening pain" },
    { label: "phone number", description: "Call 212-555-0199 for follow-up" },
    { label: "fax number", description: "fax: 212-555-0198" },
    { label: "email address", description: "Send records to patient@example.com" },
    { label: "social security number", description: "SSN 123-45-6789" },
    { label: "medical record number", description: "MRN: A12345" },
    { label: "health plan beneficiary number", description: "member id: ZXCVB1234" },
    { label: "account number", description: "account number 99887766" },
    { label: "certificate/license number", description: "license number ABC12345" },
    { label: "vehicle identifier", description: "VIN 1HGCM82633A004352" },
    { label: "device identifier", description: "serial number SN123456" },
    { label: "url", description: "https://portal.example.com/patient/123" },
    { label: "ip address", description: "10.20.30.40" },
    { label: "biometric identifier", description: "fingerprint scan uploaded" },
    { label: "full-face photograph", description: "full-face patient photo attached" },
    { label: "other unique patient id", description: "claim id 77334455" }
  ];

  it.each(phiCases)("rejects %s", ({ description }) => {
    const result = validateStructuredCriteriaForCloudSync({
      ...createStructuredCriteriaFixture(),
      clinicalEvidence: [
        {
          type: "other",
          description
        }
      ]
    });

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.reason).toMatch(/^Potential /u);
    }
  });

  describe("fuzz testing", () => {
    function seededRandom(seed: number): () => number {
      let state = seed;
      return () => {
        state = (state * 1664525 + 1013904223) & 0x7fffffff;
        return state / 0x7fffffff;
      };
    }

    const random = seededRandom(42);

    function randomAscii(length: number): string {
      return Array.from({ length }, () => String.fromCharCode(32 + Math.floor(random() * 95))).join("");
    }

    function randomUnicode(length: number): string {
      const ranges = [
        [0x0041, 0x005a],
        [0x00c0, 0x00ff],
        [0x0400, 0x04ff],
        [0x4e00, 0x4e50],
        [0x1f600, 0x1f64f]
      ] as const;
      return Array.from({ length }, () => {
        const range = ranges[Math.floor(random() * ranges.length)]!;
        const cp = range[0] + Math.floor(random() * (range[1] - range[0]));
        return String.fromCodePoint(cp);
      }).join("");
    }

    function randomClinicalText(): string {
      const terms = [
        "bilateral",
        "edema",
        "chronic",
        "moderate",
        "tenderness",
        "palpation",
        "effusion",
        "flexion",
        "ROM",
        "restricted",
        "conservative",
        "management",
        "radiograph",
        "narrowing",
        "osteophytes",
        "BMI",
        "ambulatory",
        "unilateral",
        "arthroscopy",
        "debridement",
        "corticosteroid",
        "NSAID",
        "physical therapy",
        "weight bearing",
        "postoperative",
        "lateral",
        "medial"
      ];
      const count = 3 + Math.floor(random() * 8);
      return Array.from({ length: count }, () => terms[Math.floor(random() * terms.length)]).join(" ");
    }

    const stringFieldPaths: Array<{
      label: string;
      inject: (value: string) => Partial<StructuredCriteria>;
    }> = [
      {
        label: "payerType",
        inject: (v) => ({ payerType: v })
      },
      {
        label: "payerPlanCategory",
        inject: (v) => ({ payerPlanCategory: v })
      },
      {
        label: "clinicalEvidence[].description",
        inject: (v) => ({
          clinicalEvidence: [{ type: "other" as const, description: v }]
        })
      }
    ];

    const fuzzInputs: Array<{ label: string; generator: () => string }> = [
      { label: "random ASCII", generator: () => randomAscii(20 + Math.floor(random() * 80)) },
      { label: "random unicode", generator: () => randomUnicode(10 + Math.floor(random() * 40)) },
      { label: "very long string", generator: () => randomAscii(490) },
      { label: "special characters", generator: () => "!@#$%^&*(){}[]|\\/<>~`" },
      { label: "null bytes and control chars", generator: () => "test\x00value\x01\x02\x03end" },
      { label: "clinical text", generator: randomClinicalText },
      { label: "empty-ish whitespace", generator: () => "   \t\n  " },
      { label: "numeric-looking", generator: () => "99887766554433" },
      { label: "partial date", generator: () => "Seen on March 2024 for pain" },
      { label: "bare number triplets", generator: () => "Group A 123 456 protocol" }
    ];

    for (const field of stringFieldPaths) {
      for (const input of fuzzInputs) {
        it(`does not crash on ${input.label} in ${field.label}`, () => {
          const value = input.generator();
          const fixture = createStructuredCriteriaFixture(field.inject(value));
          expect(() => validateStructuredCriteriaForCloudSync(fixture)).not.toThrow();
        });
      }
    }

    it("valid random clinical text does not trigger false positives", () => {
      let falsePositives = 0;
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const text = randomClinicalText();
        const result = validateStructuredCriteriaForCloudSync(
          createStructuredCriteriaFixture({
            clinicalEvidence: [{ type: "other", description: text }]
          })
        );
        if (!result.passed) {
          falsePositives++;
        }
      }

      expect(falsePositives).toBe(0);
    });

    const embeddedPhiInFuzz: Array<{ label: string; value: string }> = [
      { label: "SSN buried in noise", value: `xkcd ${randomAscii(5)} SSN 123-45-6789 ${randomAscii(5)}` },
      { label: "email in clinical text", value: `conservative management per dr@hospital.com protocol` },
      { label: "phone in mixed text", value: `ROM limited call 212-555-0199 for PT referral` },
      { label: "MRN in unicode context", value: `${randomUnicode(5)} MRN: A12345 ${randomUnicode(5)}` },
      { label: "address in long string", value: `${randomAscii(30)} 123 Main Street ${randomAscii(30)}` }
    ];

    it.each(embeddedPhiInFuzz)("catches $label embedded in random content", ({ value }) => {
      const result = validateStructuredCriteriaForCloudSync(
        createStructuredCriteriaFixture({
          clinicalEvidence: [{ type: "other", description: value }]
        })
      );
      expect(result.passed).toBe(false);
    });

    it("survives a high-volume random injection sweep without crashing", () => {
      for (let i = 0; i < 200; i++) {
        const kind = Math.floor(random() * 4);
        let value: string;
        switch (kind) {
          case 0:
            value = randomAscii(1 + Math.floor(random() * 499));
            break;
          case 1:
            value = randomUnicode(1 + Math.floor(random() * 100));
            break;
          case 2:
            value = randomClinicalText();
            break;
          default:
            value = `${randomAscii(10)}${randomUnicode(5)}${randomAscii(10)}`;
            break;
        }

        const field = stringFieldPaths[Math.floor(random() * stringFieldPaths.length)]!;
        const fixture = createStructuredCriteriaFixture(field.inject(value));
        expect(() => validateStructuredCriteriaForCloudSync(fixture)).not.toThrow();
      }
    });
  });
});
