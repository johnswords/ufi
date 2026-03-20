# Surface Spec: Cloud API

## Purpose

> **Status: Placeholder scaffold.** This package contains only workspace configuration and type re-exports. No service implementation exists yet. The target contracts below define the planned API surface.

Optional cloud endpoint that receives de-identified structured criteria from on-prem agents, stores them for analytics, and serves payer rule updates back to agents. This component NEVER receives PHI.

## Owned Surface

- REST API: criteria ingestion and payer rules query endpoints
- PHI rejection middleware: allowlist validation on all inbound payloads
- Postgres schema: de-identified criteria storage, analytics tables
- Agent authentication: identify which practice/agent is syncing (without patient identifiers)

## Interfaces and Dependencies

### Inbound

- `POST /criteria` -- receive de-identified structured criteria from agent
  - Validates payload against PHI allowlist schema
  - Stores for analytics and pattern learning
- `GET /payer-rules/{cpt}` -- serve current payer rules for a CPT code
  - Optional query param: `?payer=<identifier>` to filter by payer
  - Used by agent to sync local payer rule cache

### Outbound

- None. Agents pull; cloud does not push to on-prem networks.

### Dependencies

| Dependency | Type | Location |
|------------|------|----------|
| `@ufi/shared` | workspace lib | `packages/shared` (types, schemas) |
| `hono` or `fastify` | npm | HTTP framework |
| `drizzle-orm` | npm | Postgres query builder |

## Current Contracts

None -- greenfield.

## Target Contracts

> These contracts are NOT yet active. Promote to Current Contracts after implementation lands.

### TC-1: Criteria Ingest Endpoint

- Accepts `StructuredCriteria` payload (defined in `@ufi/shared`)
- Validates against PHI allowlist schema (rejects if unknown fields present)
- Stores with timestamp and source agent identifier (not patient identifier)
- Returns acknowledgment with stored record ID

-- *Source: `docs/specs/cloud-api/criteria-ingest-endpoint.md`*

### TC-2: Payer Rules Query Endpoint

- Serves `PayerRule[]` for a given CPT code and optional payer identifier
- Rules sourced from `payer-rules` pipeline output in Postgres
- Supports versioned rules (returns rules effective as of a given date)
- Cache-friendly: ETag or Last-Modified headers for agent-side caching

-- *Source: future feature spec*

### TC-3: PHI Rejection Validation

- Request-level middleware on all inbound routes
- Uses allowlist schema: only fields defined in `StructuredCriteria` are accepted
- Logs and rejects payloads with unexpected fields
- Alert mechanism for potential PHI leakage attempts (operational monitoring)

-- *Source: `docs/specs/cloud-api/criteria-ingest-endpoint.md`*

## When Feature Specs Are Required

- New API endpoint
- Changes to the PHI validation allowlist
- New storage schema or analytics capability
- Authentication/authorization model changes
- Adding FHIR PAS compatibility (CMS-0057-F)

## Validation

- Unit tests for route handlers with synthetic payloads
- PHI rejection: adversarial test suite (payloads containing names, DOBs, MRNs, SSNs) -- must all be rejected
- Integration tests with test Postgres instance
- No dependency on agent or EHR in tests
- API contract tests (request/response shape validation)

## References

- PHI allowlist definition: aligned with `@ufi/shared` StructuredCriteria type
- Agent PHI gate spec: `docs/specs/agent/phi-gate.md` (defines what the agent strips; cloud validates)
