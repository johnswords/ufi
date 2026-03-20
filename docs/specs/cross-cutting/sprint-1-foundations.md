# Feature: Sprint 1 Foundations

## Metadata

| Field | Value |
|-------|-------|
| Status | Implemented |
| Implementation | Verified |
| Feature Flag | -- |
| Last Verified | 2026-03-19 |
| Depends On | `docs/SPEC.md`, `docs/specs/agent/mapi-client.md`, `docs/specs/agent/phi-gate.md`, `docs/specs/cda-parser/cda-r2-section-mapping.md`, `docs/specs/payer-rules/cms-coverage-sync.md` |
| Truth Mode | current |

## Context

Sprint 1 establishes the repository and package-level foundations needed before any extraction graph, prediction engine, or demo UI can be honest. The work is intentionally split into mostly independent streams so it can be developed and validated in parallel:

1. Monorepo scaffold
2. MAPI client
3. CDA parser
4. CMS payer-rules sync
5. PHI de-identification gate

## Goal

Land a working TypeScript monorepo with tested package contracts for the foundational surfaces:

- `@ufi/shared` provides domain types, schemas, and PHI validation primitives
- `@ufi/agent` provides Medent API access and an agent-side PHI gate wrapper
- `@ufi/cda-parser` provides CDA decode and mapping into typed domain objects
- `@ufi/payer-rules` provides CMS sync, rule normalization, and Postgres-oriented persistence

## Non-goals

- LangGraph extraction orchestration
- Prediction engine verdict logic
- Demo API or demo UI behavior
- Cloud criteria ingest endpoint
- Commercial payer ingestion

## PHI Boundary Impact

High. This sprint defines the PHI boundary primitives that later surfaces will depend on:

- `@ufi/agent` is the PHI entry point from Medent
- `@ufi/shared` defines the de-identified allowlist contract
- `@ufi/agent` enforces the on-prem PHI gate before optional sync

No Sprint 1 code may relax the Safe Harbor posture described in `docs/SPEC.md`.

## Affected Surfaces

- `shared`
- `agent`
- `cda-parser`
- `payer-rules`
- `cloud-api` (scaffold only)
- `web-demo` (scaffold only)

## Design

### Monorepo Conventions

- Package manager: pnpm workspaces
- Orchestration: turborepo
- Language/runtime: strict TypeScript on Node 22
- Testing: vitest per package, executed via `turbo test`
- Shared contracts live in `@ufi/shared`

### Package Boundaries

- `@ufi/shared` owns reusable types, Zod schemas, and PHI gate primitives
- `@ufi/agent` owns Medent transport, XML response handling, and token lifecycle
- `@ufi/cda-parser` owns base64/XML decoding and typed CDA section mapping
- `@ufi/payer-rules` owns CMS transport, criteria extraction, and durable rule storage

### Validation Strategy

- Recorded fixtures for MAPI and CMS HTTP interactions
- Synthetic CDA fixtures for parser stability
- Adversarial PHI fixtures covering all Safe Harbor identifier categories
- Idempotency tests for payer-rule sync persistence

## Acceptance Criteria

- [x] Monorepo scaffold exists and `turbo test` / `turbo typecheck` run across packages
- [x] Shared domain schemas and PHI validator are reusable across surfaces
- [x] Agent MAPI client is implemented with fixture-driven tests
- [x] CDA parser is implemented with fixture-driven tests
- [x] CMS payer-rules sync is implemented with idempotency-focused tests
- [x] Later surfaces (`cloud-api`, `web-demo`) are scaffolded without pretending to be implemented

## Risks / Rollback

- **Risk:** Shared schema drift across packages. Mitigation: single source of truth in `@ufi/shared`.
- **Risk:** Synthetic CDA fixtures diverge from Medent reality. Mitigation: keep mapping registry simple and call out the need for a real sample.
- **Risk:** CMS narrative criteria extraction is incomplete. Mitigation: preserve narrative fallback rather than overfitting heuristics.
- **Rollback:** Each package is isolated and can be iterated independently without collapsing the whole scaffold.
