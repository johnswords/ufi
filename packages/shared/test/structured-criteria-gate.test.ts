import { describe, expect, it } from "vitest";

import {
  createStructuredCriteriaFixture,
  validateStructuredCriteriaForCloudSync
} from "../src/index.js";

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
});
