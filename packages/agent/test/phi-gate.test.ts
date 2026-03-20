import type { PhiAuditEvent } from "@ufi/shared";

import { createStructuredCriteriaFixture } from "@ufi/shared";
import { describe, expect, it, vi } from "vitest";

import { validateForCloudSync } from "../src/index.js";

describe("validateForCloudSync", () => {
  it("reuses the shared allowlist validator", () => {
    const result = validateForCloudSync(createStructuredCriteriaFixture());

    expect(result.passed).toBe(true);
  });

  it("passes valid StructuredCriteria and returns parsed data", () => {
    const fixture = createStructuredCriteriaFixture();
    const result = validateForCloudSync(fixture);

    expect(result.passed).toBe(true);
    if (result.passed) {
      expect(result.data).toEqual(fixture);
    }
  });

  it("rejects payloads with extra fields", () => {
    const result = validateForCloudSync({
      ...createStructuredCriteriaFixture(),
      patientName: "John Smith"
    });

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.reason).toMatch(/allowlist/i);
    }
  });

  it("rejects payloads with PHI in clinical evidence descriptions", () => {
    const result = validateForCloudSync(
      createStructuredCriteriaFixture({
        clinicalEvidence: [
          {
            type: "other",
            description: "patient: Jane Doe"
          }
        ]
      })
    );

    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.reason).toMatch(/person name/i);
    }
  });

  it("fires audit callback with 'passed' on valid input", () => {
    const events: PhiAuditEvent[] = [];

    validateForCloudSync(createStructuredCriteriaFixture(), {
      onAudit: (event) => events.push(event)
    });

    expect(events).toHaveLength(1);
    expect(events[0]!.outcome).toBe("passed");
    expect(events[0]!.reason).toBe("VALIDATED");
    expect(events[0]!.timestamp).toBeTruthy();
  });

  it("fires audit callback with 'rejected' on structurally invalid input", () => {
    const events: PhiAuditEvent[] = [];

    validateForCloudSync({ notValid: true }, { onAudit: (event) => events.push(event) });

    expect(events).toHaveLength(1);
    expect(events[0]!.outcome).toBe("rejected");
    expect(events[0]!.reason).toBe("STRUCTURE_INVALID");
  });

  it("fires audit callback with 'rejected' on PHI detection", () => {
    const onAudit = vi.fn();

    validateForCloudSync(
      createStructuredCriteriaFixture({
        clinicalEvidence: [
          {
            type: "other",
            description: "SSN 123-45-6789"
          }
        ]
      }),
      { onAudit }
    );

    expect(onAudit).toHaveBeenCalledOnce();
    expect(onAudit).toHaveBeenCalledWith(expect.objectContaining({ outcome: "rejected", reason: "PHI_DETECTED" }));
  });

  it("does not leak PHI content into audit events", () => {
    const events: PhiAuditEvent[] = [];
    const phi = "patient: John Smith";

    validateForCloudSync(
      createStructuredCriteriaFixture({
        clinicalEvidence: [{ type: "other", description: phi }]
      }),
      { onAudit: (event) => events.push(event) }
    );

    expect(events).toHaveLength(1);
    expect(JSON.stringify(events)).not.toContain("John Smith");
  });
});
