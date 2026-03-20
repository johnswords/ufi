# Feature: Medent API (MAPI) Client

## Metadata

| Field | Value |
|-------|-------|
| Status | Implemented |
| Implementation | Verified |
| Feature Flag | -- |
| Last Verified | 2026-03-19 |
| Depends On | -- |
| Truth Mode | current |

## Context

The on-prem agent needs to authenticate with Medent EHR and retrieve patient clinical data. The MAPI uses a multi-step auth flow (registration -> POC -> credentials -> token) and returns XML responses with base64-encoded CDA R2 payloads. The client must handle token lifecycle, including expiry and refresh.

## Goal

A typed MAPI client that encapsulates the full authentication flow and exposes data query methods returning parsed XML responses, ready for CDA parsing.

## Non-goals

- CDA R2 parsing (delegated to `@ufi/cda-parser`)
- Caching strategy (handled by the agent orchestration layer)
- Supporting Medent versions below 23.0

## PHI Boundary Impact

**High.** The MAPI client is the entry point for PHI into the system. Patient data flows through this client. However, the client itself does not transmit data externally -- it only reads from Medent. PHI containment is handled downstream by the PHI gate.

Key concern: credential storage. The MAPI client will hold registration IDs, POC IDs, and patient tokens in memory. These must not be logged or persisted beyond the session.

## Affected Surfaces

- `agent` (primary -- the MAPI client lives here)
- `cda-parser` (consumer of the CDA payloads this client retrieves)

## Existing Primitives

Greenfield -- no existing code to extend.

## Constraints

- HTTPS POST to `https://www.medentmobile.com/mapi/services/`
- All requests require `registration_id` (obtained once via `medentmobile.com/mapi/register/`)
- Responses are XML (not JSON) -- parse with `fast-xml-parser`
- Patient tokens have variable lifetime (set by POC office)
- Must handle all MAPI status codes gracefully (see `docs/mapi.pdf` pages 4-5)

## Design

### Auth Flow

```
1. POC Discovery
   POST pocquery.php { registration_id }
   -> XML list of POC locations (pocname, pocid)

2. Patient Token Acquisition
   POST index.php { registration_id, poc_id, patient_id, patient_pw }
   -> patient_token (or error: 428 INVALID_USER, 429 INVALID_PASSWORD,
      430 PATIENT_NOT_ACTIVE, 431 PATIENT_ACCOUNT_FROZEN)

3. Data Query
   POST index.php { registration_id, poc_id, patient_token, data_query }
   -> XML with base64-encoded CDA R2 in <patient_data>
   (or error: 432 TOKEN_EXPIRED, 433 TOKEN_INVALID)
```

### Interface

```typescript
interface MapiClient {
  // Discovery
  getPocLocations(): Promise<PocLocation[]>;

  // Auth
  getPatientToken(pocId: string, patientId: string, patientPw: string): Promise<string>;

  // Data queries
  queryPatientData(pocId: string, token: string, queries: DataQuery[]): Promise<MapiResponse>;
}

type DataQuery =
  | 'patient_procedures'
  | 'patient_clinical_notes'
  | 'patient_problems'
  | 'patient_insurance_providers'
  | 'patient_medications'
  | 'patient_assessment_plan';
```

### Token Lifecycle

- Store token in memory only (never persist to disk or log)
- On 427 (EXPIRED) or 432 (TOKEN_EXPIRED): re-acquire token automatically
- On 433 (TOKEN_INVALID): surface error to caller (likely credential issue, not auto-recoverable)

### Error Handling

Map all MAPI status codes to typed errors:

| Code | Name | Handling |
|------|------|----------|
| 200 | SUCCESS | Return parsed response |
| 418 | AUTH_FAILED_NO_DATA | Throw `MapiAuthError` |
| 419 | AUTH_FAILED | Throw `MapiAuthError` |
| 420 | NOT_IMPLEMENTED | Throw `MapiUnsupportedError` |
| 421 | OVER_LIMIT | Throw `MapiRateLimitError` (implement backoff) |
| 422 | FIELD_EMPTY | Throw `MapiValidationError` |
| 423 | FIELD_INVALID | Throw `MapiValidationError` |
| 424 | NO_ACCESS | Throw `MapiAccessError` |
| 427 | EXPIRED | Auto-refresh token, retry once |
| 428-431 | Patient auth errors | Throw `MapiPatientAuthError` with specific code |
| 432 | TOKEN_EXPIRED | Auto-refresh token, retry once |
| 433 | TOKEN_INVALID | Throw `MapiTokenError` (not auto-recoverable) |

## Acceptance Criteria

- [x] `getPocLocations()` returns parsed POC list from XML response
- [x] `getPatientToken()` completes full auth flow and returns token string
- [x] `queryPatientData()` returns raw CDA payload (base64 string) for downstream parsing
- [x] Token auto-refresh on 427/432 with single retry
- [x] All MAPI error codes mapped to typed errors
- [x] No credentials or tokens logged or persisted to disk
- [x] Multiple data queries combined with `#` separator per MAPI spec

## Validation

- [x] Recorded HTTP fixture tests cover POC discovery, patient token acquisition, and data queries
- [ ] Recorded fixtures exist for every individual error code
- [x] Token refresh scenario: fixture returns 432, then success on retry
- [x] No live network calls in the test suite

## Risks / Rollback

- **Risk:** MAPI rate limiting (status 421). Mitigation: implement exponential backoff.
- **Risk:** MAPI endpoint availability. Mitigation: agent functions offline for cached data; MAPI failures surface clearly to staff.
- **Risk:** Token lifetime too short for batch operations. Mitigation: token refresh is automatic; design queries to be atomic.
- **Rollback:** Client is isolated within agent package. Can swap for a different EHR client without affecting other surfaces.

## Open Questions

1. What is a typical token lifetime set by POC offices? Minutes? Hours? Days?
2. Can we batch multiple `data_query` types in a single POST, or must each be a separate request?
3. Is there a sandbox/test environment for MAPI, or must we record fixtures from a real Medent instance?
