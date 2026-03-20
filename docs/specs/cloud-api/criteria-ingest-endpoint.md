# Feature: Criteria Ingest Endpoint

## Metadata

| Field | Value |
|-------|-------|
| Status | Draft |
| Implementation | Not Started |
| Feature Flag | -- |
| Last Verified | -- |
| Depends On | `docs/specs/agent/phi-gate.md` (defines the allowlist this endpoint validates against) |
| Truth Mode | target |

## Context

The cloud API needs an endpoint to receive de-identified structured criteria from on-prem agents. This is the cloud-side counterpart to the agent's PHI gate — it validates inbound payloads against the same allowlist schema as a defense-in-depth measure. Even though the agent gates data before transmission, the cloud independently rejects anything that doesn't match.

## Goal

A `POST /criteria` endpoint that accepts `StructuredCriteria` payloads, validates them against the PHI allowlist, stores them in Postgres, and returns an acknowledgment.

## Non-goals

- Analytics or reporting on stored criteria (future feature)
- Accepting raw clinical notes or CDA documents (cloud never touches PHI)
- Push notifications to agents (agents pull updates)
- Authentication/authorization model (future feature -- for now, assume trusted network)

## PHI Boundary Impact

**Defense-in-depth validation.** This endpoint is the cloud-side enforcement of the PHI boundary. It must reject any payload that doesn't strictly conform to the `StructuredCriteria` schema. If a payload arrives with unexpected fields or PHI-pattern content, it's rejected and an alert is generated.

The cloud never stores, logs, or forwards rejected payload content (it may contain PHI from a misconfigured agent).

## Affected Surfaces

- `cloud-api` (primary)
- `agent` (producer -- sends criteria through this endpoint)
- `shared` (`StructuredCriteria` type, PHI allowlist schema)

## Existing Primitives

Greenfield -- no existing code to extend.

## Constraints

- Must validate against the same `StructuredCriteria` Zod schema used by the agent's PHI gate
- Must reject payloads with extra fields (not silently drop them)
- Must not log or persist rejected payload content
- Must generate operational alert on rejection (potential PHI leakage from misconfigured agent)
- Postgres storage schema must have no columns capable of holding PHI

## Design

### Endpoint

```
POST /criteria
Content-Type: application/json

Request Body: StructuredCriteria (from @ufi/shared)

Response 201:
{
  "id": "uuid",
  "receivedAt": "ISO-8601"
}

Response 422:
{
  "error": "VALIDATION_FAILED",
  "reason": "description of structural violation (no payload content)"
}

Response 400:
{
  "error": "PHI_DETECTED",
  "reason": "content scan flagged potential PHI (no payload content)"
}
```

### Validation Middleware

Same two-layer validation as the agent's PHI gate:

1. **Structural:** Zod schema validation -- reject extra fields, wrong types, missing required fields
2. **Content:** Pattern scan string values for SSN, phone, email, date, MRN patterns

The validation logic should be shared with the agent (imported from `@ufi/shared` or a dedicated validation package) to guarantee both sides enforce identical rules.

### Postgres Schema

```sql
CREATE TABLE criteria_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      TEXT NOT NULL,
  cpt_code      TEXT NOT NULL,
  icd_codes     TEXT[] NOT NULL,
  payer_type    TEXT NOT NULL,
  payer_plan    TEXT,
  evidence      JSONB NOT NULL,   -- ClinicalEvidenceItem[]
  confidence    REAL NOT NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No patient-identifying columns exist in this schema by design.
-- This is a structural guarantee, not a policy decision.
```

## Acceptance Criteria

- [ ] `POST /criteria` accepts valid `StructuredCriteria` and returns 201
- [ ] Invalid schema (extra fields, wrong types) returns 422
- [ ] PHI patterns detected in content returns 400
- [ ] Rejected payloads are NOT logged or stored (only the rejection event is recorded)
- [ ] Operational alert generated on PHI_DETECTED rejections
- [ ] Stored records match Postgres schema (no PHI columns)
- [ ] Validation logic is shared with agent PHI gate (same Zod schema import)

## Validation

- [ ] Happy path: valid criteria stored, 201 returned with ID
- [ ] Structural rejection: payloads with extra fields, missing fields, wrong types
- [ ] Content rejection: SSN, phone, email, date patterns in description strings
- [ ] Postgres integration: stored record matches input (minus any server-generated fields)
- [ ] Alert generation: mock alert handler receives notification on PHI_DETECTED
- [ ] Shared validation: confirm agent gate and cloud endpoint use identical Zod schema

## Risks / Rollback

- **Risk:** Agent and cloud validation schemas drift apart. Mitigation: single source of truth in `@ufi/shared`, imported by both. CI test that compares both validation paths.
- **Risk:** False positive PHI detection blocks legitimate clinical evidence. Mitigation: same tuning strategy as agent PHI gate; cloud logs rejection frequency for monitoring.
- **Rollback:** Endpoint can be disabled without affecting agent functionality (cloud sync is optional).

## Open Questions

1. Should validation logic live in `@ufi/shared` or in a dedicated `@ufi/phi-validator` package?
2. What alerting system for PHI_DETECTED events? (Slack webhook, email, PagerDuty -- depends on operational setup)
3. Should the endpoint support batch submissions (array of criteria) or single-record only?
