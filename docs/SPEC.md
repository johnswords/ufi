# UFI MedEnt -- Repository Specification

## Purpose

Predictive surgical approval intelligence. Given a CPT code and a patient's clinical record from Medent EHR, predict whether a procedure will be approved, denied, or requires additional documentation before payer submission.

This repository owns the full system: on-premise agent, CDA parsing, payer rules ingestion, and optional cloud analytics. It does not own the Medent EHR itself, payer systems, or the Ollama runtime.

## Scope

| Package | Type | Description |
|---------|------|-------------|
| `packages/agent` | On-prem service | LangGraph agent: reads EHR data, runs local LLM, produces predictions |
| `packages/cda-parser` | Library | CDA R2 XML parsing and structured clinical data extraction |
| `packages/cloud-api` | Cloud service | Optional analytics endpoint, receives only de-identified data |
| `packages/payer-rules` | Pipeline | Payer rule ingestion from CMS and commercial sources |
| `packages/web-demo` | Web app | Paste-in demo: physician notes + CPT/carrier → prediction (no EHR required) |
| `packages/shared` | Library | Shared types: CPT, ICD-10, payer rule schemas, domain models |

## Specification Hierarchy

```
docs/SPEC.md                              <-- you are here (repo-wide)
docs/specs/agent/SPEC.md                  <-- on-prem agent surface
docs/specs/cda-parser/SPEC.md             <-- CDA R2 parser library surface
docs/specs/cloud-api/SPEC.md              <-- cloud analytics API surface
docs/specs/payer-rules/SPEC.md            <-- payer rules ingestion surface
docs/specs/web-demo/SPEC.md              <-- paste-in web demo surface
docs/specs/cross-cutting/SPEC.md         <-- cross-cutting specs (multi-surface)
docs/specs/<surface>/<feature>.md         <-- change-level feature specs
```

**Rules:**

1. Every deployable or independently-tested package gets a surface spec.
2. Feature specs are required before implementing work that introduces a new public interface, changes a contract between surfaces, or touches the PHI boundary.
3. Feature specs are NOT required for internal refactors, dependency bumps, or test-only changes that do not alter contracts.
4. Pure-type packages (`shared`) do not get surface specs. Type changes that affect contracts are documented in the consuming surface's feature spec.

## Current Invariants

Sprint 1 foundations are now implemented and verified. Only invariants backed by code and tests are promoted here; later-sprint system behavior remains in Target Invariants.

### INV-3: Medent API Compatibility

- Target: Medent API (MAPI) v23.0+
- Auth chain: Registration ID -> POC ID -> Patient credentials -> Patient token -> Data queries
- API base: `https://www.medentmobile.com/mapi/services/`
- All responses are XML with base64-encoded CDA R2 payloads
- Token expiry handled gracefully (427 EXPIRED / 432 TOKEN_EXPIRED trigger re-auth)

-- *Source: `docs/specs/agent/mapi-client.md`*

### INV-4: Monorepo Conventions

- Package manager: pnpm (workspaces)
- Build orchestration: turborepo
- Language: TypeScript (strict mode) across all packages
- Test runner: vitest
- Shared types imported via workspace protocol (`workspace:*`)

-- *Source: `docs/specs/cross-cutting/sprint-1-foundations.md`*

### INV-5: StructuredCriteria PHI Gate Primitives

- `@ufi/shared` owns the allowlist schema and deterministic PHI scanner for `StructuredCriteria`
- `@ufi/agent` re-exports the gate used before optional cloud sync
- Unknown fields are rejected rather than silently dropped
- Audit callbacks capture pass/reject outcomes without echoing rejected payload contents

-- *Source: `docs/specs/agent/phi-gate.md`*

## Target Invariants

> These invariants are not yet active end-to-end. They will be promoted to Current Invariants as later features land and are verified.

### INV-1: PHI Isolation (HIPAA Safe Harbor)

No PHI ever leaves the practice network. This is the single most important architectural constraint.

- The on-prem agent is the only component that touches PHI.
- The agent's output boundary enforces HIPAA Safe Harbor de-identification by stripping all 18 identifier categories before any data leaves the process.
- The cloud API contract rejects payloads containing PHI-indicative fields. Defense-in-depth: the gate is at the agent, but the cloud validates.
- The PHI gate uses an **allowlist** (only explicitly permitted fields pass), not a blocklist. Unknown data is rejected by default.

The 18 Safe Harbor identifiers that must be removed:

1. Names
2. Geographic data smaller than state (street address, city, ZIP beyond first 3 digits if population < 20k)
3. Dates (except year) related to an individual (birth, admission, discharge, death; ages > 89 grouped as 90+)
4. Phone numbers
5. Fax numbers
6. Email addresses
7. Social Security numbers
8. Medical record numbers
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate/license numbers
12. Vehicle identifiers and serial numbers
13. Device identifiers and serial numbers
14. Web URLs
15. IP addresses
16. Biometric identifiers
17. Full-face photographs
18. Any other unique identifying number, characteristic, or code

**Validation:** Every feature spec that touches data flowing from agent to cloud must include a "PHI Boundary Impact" section. -- *Source: `docs/specs/agent/phi-gate.md`*

### INV-2: On-Prem Viability

The agent will run on commodity hardware available in a medical practice:

- No GPU requirement (CPU inference via Ollama with quantized models)
- Memory budget: 16GB RAM assumed available
- No internet dependency for core prediction path (payer rules cached locally)
- Prediction latency target: under 30 seconds for a single procedure evaluation

-- *Source: `docs/specs/agent/SPEC.md`*

## Change Workflow

1. For changes that affect a surface contract or introduce a new interface: write or update the feature spec first.
2. Feature spec is reviewed before implementation begins.
3. Implementation PR references the feature spec file path.
4. Surface SPEC.md "Target Contracts" entries are promoted to "Current Contracts" only after implementation lands and validation passes.

## Validation

- `turbo test` runs all surface test suites.
- PHI boundary tests are tagged and run as a dedicated CI step.
- CDA parser tests use fixture files (real-shaped CDA R2 documents with synthetic data).
- Integration tests against MAPI use recorded responses (no live EHR in CI).
- Payer rules tests use recorded CMS API responses.

## References

- Medent API documentation: `docs/mapi.pdf`
- CMS Coverage API: `https://api.coverage.cms.gov/` ([Swagger docs](https://api.coverage.cms.gov/docs/swagger/index.html))
- CMS Interoperability & Prior Authorization Final Rule (CMS-0057-F): mandates FHIR PAS APIs by January 2027
- HIPAA Safe Harbor de-identification: 45 CFR 164.514(b)
