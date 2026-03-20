# Feature: PHI De-identification Gate

## Metadata

| Field | Value |
|-------|-------|
| Status | Implemented |
| Implementation | Verified |
| Feature Flag | -- |
| Last Verified | 2026-03-19 |
| Depends On | `docs/specs/cloud-api/criteria-ingest-endpoint.md` (defines what the cloud accepts) |
| Truth Mode | current |

## Context

The on-prem agent processes PHI locally. Before any data optionally syncs to the cloud platform, it must pass through a de-identification gate that enforces HIPAA Safe Harbor requirements. This gate is the most critical security boundary in the system.

The gate uses an **allowlist** approach: only explicitly permitted fields pass through. Everything else is rejected. This is deliberately more restrictive than a blocklist ("strip these 18 things") because a blocklist fails open on novel data shapes.

## Goal

A validation layer that accepts a data object intended for cloud transmission and either returns a verified de-identified object or rejects it. No PHI can pass through this gate.

## Non-goals

- De-identifying the raw CDA document (the gate operates on structured output, not raw XML)
- Implementing re-identification capabilities
- Logging rejected PHI (the gate rejects and reports the rejection reason, not the rejected content)
- Replacing the cloud-side validation (defense-in-depth: both sides validate)

## PHI Boundary Impact

**This feature IS the PHI boundary.** It defines and enforces the line between what stays on-prem and what may optionally leave.

## Affected Surfaces

- `agent` (primary -- gate lives here)
- `cloud-api` (consumer -- validates inbound payloads against the same allowlist)
- `shared` (defines the `StructuredCriteria` type that forms the allowlist)

## Existing Primitives

Greenfield -- no existing code to extend.

## Constraints

- Must strip or reject all 18 HIPAA Safe Harbor identifier categories (45 CFR 164.514(b))
- Must use allowlist (not blocklist) -- only fields in `StructuredCriteria` pass
- Must be synchronous and deterministic (no LLM involvement in the gate itself)
- Must not log or persist rejected content (the content may contain PHI)
- Must produce an audit trail of gate decisions (pass/reject with reason, without the rejected data)

## Design

### Two-Layer Validation

**Layer 1: Structural validation (allowlist)**
- Input object must conform exactly to `StructuredCriteria` schema (Zod)
- Extra fields: rejected (unknown fields could contain PHI)
- Missing required fields: rejected (malformed extraction)
- Passes: object shape matches, all fields are expected types

**Layer 2: Content scanning**
- String values scanned for PHI patterns even within allowed fields
- Patterns checked:
  - SSN format (NNN-NN-NNNN)
  - Phone number patterns
  - Email addresses
  - Full dates with year (birth dates, admission dates)
  - Medical record number patterns (facility-specific prefixes)
  - Names (heuristic: proper noun patterns in fields that should contain clinical terms)
- Match found: reject the entire payload (fail closed)

### StructuredCriteria Allowlist (target shape)

```typescript
interface StructuredCriteria {
  // Procedure identification (de-identified by nature)
  cptCode: string;
  icdCodes: string[];

  // Clinical evidence (de-identified summaries, not raw notes)
  clinicalEvidence: ClinicalEvidenceItem[];

  // Payer context (de-identified)
  payerType: string;          // e.g., "Medicare", "Commercial PPO"
  payerPlanCategory?: string; // e.g., "Aetna PPO" (plan type, not member ID)

  // Metadata
  extractionConfidence: number;
  agentId: string;            // identifies the practice agent, not the patient
  timestamp: string;          // ISO 8601
}

interface ClinicalEvidenceItem {
  type: 'failed_treatment' | 'threshold' | 'comorbidity' | 'symptom_duration' | 'functional_limitation' | 'other';
  description: string;        // e.g., "Failed 6 weeks physical therapy"
  value?: number;             // e.g., 34 (for BMI)
  unit?: string;              // e.g., "kg/m2"
  durationWeeks?: number;
}
```

**Fields explicitly excluded (never transmitted):**
- Patient name, DOB, age > 89, address, phone, email, SSN
- Medical record number, health plan beneficiary number, account number
- Provider name, facility name (below state level)
- Any free-text clinical narrative (only structured evidence items)

### Gate API

```typescript
type GateResult =
  | { passed: true; data: StructuredCriteria }
  | { passed: false; reason: string };  // reason describes the violation type, NOT the violating content

function validateForCloudSync(input: unknown): GateResult;
```

## Acceptance Criteria

- [x] Allowlist validation: only `StructuredCriteria` fields pass
- [x] Extra fields on input object are rejected (not silently dropped)
- [x] Content scanning catches SSN, phone, email, date patterns in string values
- [x] Gate returns typed result (pass with clean data, or reject with reason)
- [x] Rejection reasons never contain the rejected content itself
- [x] Audit log records gate decisions (timestamp, pass/reject, reason) without PHI
- [x] 100% of the 18 HIPAA Safe Harbor identifier categories have adversarial test cases

## Validation

- [x] Adversarial test suite: one test per HIPAA identifier type injected into allowed fields
- [x] Structural tests: extra fields on the allowlist boundary are rejected
- [x] Content pattern tests: SSN, phone, email, dates, MRN patterns embedded in `description` strings
- [x] Pass-through tests: valid `StructuredCriteria` objects pass cleanly
- [x] Audit log tests: verify decisions are logged without PHI content
- [ ] Fuzz testing: random string injection into all string fields

## Risks / Rollback

- **Risk:** Content scanner has false positives (rejects valid clinical descriptions that happen to match PHI patterns). Mitigation: tunable sensitivity; start strict, relax based on real-world false positive rates. False positives are safer than false negatives.
- **Risk:** Novel PHI leakage vector not covered by the 18 categories. Mitigation: allowlist approach means unknown fields are rejected by default; content scanner is an additional layer.
- **Risk:** Gate adds latency to sync flow. Mitigation: gate is CPU-only, no network/LLM calls; should be sub-millisecond.
- **Rollback:** If the gate is broken, disable cloud sync entirely (safe default). The agent functions fully without cloud sync.

## Open Questions

1. Should the gate be a standalone package (importable by both agent and cloud-api for shared validation) or duplicated in each surface?
2. How aggressive should the date pattern scanner be? Clinical evidence legitimately contains duration values ("6 weeks") but should not contain specific dates ("03/15/2024").
3. Should we implement statistical de-identification verification (e.g., k-anonymity checks on aggregated synced data) in addition to per-record Safe Harbor compliance?
