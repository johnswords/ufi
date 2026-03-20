import { structuredCriteriaSchema, type StructuredCriteria } from "../domain/index.js";

export interface PhiAuditEvent {
  readonly timestamp: string;
  readonly outcome: "passed" | "rejected";
  readonly reason: string;
}

export interface StructuredCriteriaGateResultPassed {
  readonly passed: true;
  readonly data: StructuredCriteria;
}

export interface StructuredCriteriaGateResultRejected {
  readonly passed: false;
  readonly reason: string;
}

export type StructuredCriteriaGateResult =
  | StructuredCriteriaGateResultPassed
  | StructuredCriteriaGateResultRejected;

export interface StructuredCriteriaGateOptions {
  readonly onAudit?: (event: PhiAuditEvent) => void;
}

interface Detector {
  readonly category: string;
  readonly pattern: RegExp;
}

const detectors: Detector[] = [
  { category: "person name", pattern: /\b(?:patient|member|beneficiary|name)\s*:\s*[A-Z][a-z]+\s+[A-Z][a-z]+\b/iu },
  { category: "person name", pattern: /\b(?:patient|member|beneficiary)\s+(?:is|was)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/iu },
  { category: "street address", pattern: /\b\d{1,5}\s+[A-Za-z0-9.'-]+\s(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct)\b/iu },
  { category: "city state zip", pattern: /\b[A-Z][a-z]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/u },
  { category: "date", pattern: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/u },
  { category: "date", pattern: /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}\b/iu },
  { category: "phone number", pattern: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/u },
  { category: "fax number", pattern: /\bfax[:\s]*(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/iu },
  { category: "email address", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu },
  { category: "social security number", pattern: /\b\d{3}-\d{2}-\d{4}\b/u },
  { category: "medical record number", pattern: /\b(?:MRN|medical\s+record|chart)\s*[:#-]?\s*[A-Z0-9-]{5,}\b/iu },
  { category: "health plan beneficiary number", pattern: /\b(?:member|beneficiary|subscriber)\s*(?:id|number|no)\s*[:#-]?\s*[A-Z0-9-]{5,}\b/iu },
  { category: "account number", pattern: /\baccount\s*(?:id|number|no)\s*[:#-]?\s*[A-Z0-9-]{5,}\b/iu },
  { category: "license number", pattern: /\b(?:license|certificate)\s*(?:id|number|no)\s*[:#-]?\s*[A-Z0-9-]{5,}\b/iu },
  { category: "vehicle identifier", pattern: /\b(?:VIN|license\s+plate)\s*[:#-]?\s*[A-Z0-9-]{5,}\b/iu },
  { category: "device identifier", pattern: /\b(?:device|serial)\s*(?:id|number|no)\s*[:#-]?\s*[A-Z0-9-]{5,}\b/iu },
  { category: "url", pattern: /\bhttps?:\/\/\S+\b/iu },
  { category: "url", pattern: /\bwww\.[^\s]+\b/iu },
  { category: "ip address", pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/u },
  { category: "biometric identifier", pattern: /\b(?:fingerprint|retina|iris\s+scan|voiceprint)\b/iu },
  { category: "full-face photograph", pattern: /\b(?:full[-\s]?face|facial photograph|patient photo|headshot)\b/iu },
  { category: "unique patient identifier", pattern: /\b(?:patient|case|claim)\s*(?:id|number|no)\s*[:#-]?\s*[A-Z0-9-]{5,}\b/iu }
];

const scannerIgnoredPaths = new Set(["agentId", "timestamp", "cptCode"]);

function audit(
  options: StructuredCriteriaGateOptions | undefined,
  outcome: PhiAuditEvent["outcome"],
  reason: string
): void {
  options?.onAudit?.({
    timestamp: new Date().toISOString(),
    outcome,
    reason
  });
}

function flattenStrings(value: unknown, path: string[] = []): Array<{ path: string; value: string }> {
  if (typeof value === "string") {
    return [{ path: path.join("."), value }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => flattenStrings(entry, [...path, String(index)]));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, nested]) => flattenStrings(nested, [...path, key]));
  }

  return [];
}

export function scanStructuredCriteriaForPhi(criteria: StructuredCriteria): string | null {
  for (const entry of flattenStrings(criteria)) {
    if (scannerIgnoredPaths.has(entry.path) || entry.path.startsWith("icdCodes.")) {
      continue;
    }

    const trimmed = entry.value.trim();
    if (!trimmed) {
      continue;
    }

    for (const detector of detectors) {
      if (detector.pattern.test(trimmed)) {
        return `Potential ${detector.category} detected in ${entry.path}`;
      }
    }
  }

  return null;
}

export function validateStructuredCriteriaForCloudSync(
  input: unknown,
  options?: StructuredCriteriaGateOptions
): StructuredCriteriaGateResult {
  const parsed = structuredCriteriaSchema.safeParse(input);
  if (!parsed.success) {
    audit(options, "rejected", "STRUCTURE_INVALID");
    return {
      passed: false,
      reason: "Payload does not match the StructuredCriteria allowlist."
    };
  }

  const violation = scanStructuredCriteriaForPhi(parsed.data);
  if (violation) {
    audit(options, "rejected", "PHI_DETECTED");
    return {
      passed: false,
      reason: violation
    };
  }

  audit(options, "passed", "VALIDATED");
  return {
    passed: true,
    data: parsed.data
  };
}
