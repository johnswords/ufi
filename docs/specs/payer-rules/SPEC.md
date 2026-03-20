# Surface Spec: Payer Rules Ingestion

## Purpose

Background pipeline that ingests payer medical necessity rules from external sources and normalizes them into a structured schema in Postgres. The agent and cloud API both consume these rules.

No patient data is involved -- payer rules are public policy documents.

## Owned Surface

- CMS Coverage API sync (Phase 1)
- Commercial payer policy parsing (Phase 2 -- future)
- Practice denial pattern learning (Phase 3 -- future)
- PayerRule schema and Postgres storage
- Sync scheduling and idempotency

## Interfaces and Dependencies

### Input (external sources)

**Phase 1: CMS Medicare**
- CMS Coverage API (`https://api.coverage.cms.gov/`)
- LCD/NCD metadata: no auth required
- LCD/Article detail: requires license token (1-hour TTL, obtained via `/v1/metadata/license-agreement`)
- JSON format, 10k requests/second rate limit
- Weekly update cadence from CMS
- Bulk downloads also available (CSV/Access) from CMS Medicare Coverage Database

**Phase 2: Commercial payers (future)**
- UnitedHealthcare Medical Policies, Aetna Clinical Policy Bulletins, Cigna Coverage Policies, Anthem/BCBS Medical Policies
- Mix of PDFs and web pages -- requires parsing/extraction pipeline

**Phase 3: Practice denial patterns (future)**
- Anonymized denial/approval outcomes from on-prem agents
- e.g., "CPT 27447 + Aetna PPO = denied 34%, top reason: insufficient conservative treatment documentation"

### Output

- `PayerRule` records in Postgres, keyed by CPT code + payer + effective date
- Schema defined in `@ufi/shared`

### Consumed By

- Cloud API: `GET /payer-rules/{cpt}` endpoint reads from these tables
- Agent: syncs local cache via cloud API, or reads directly if co-located

### Dependencies

| Dependency | Type | Location |
|------------|------|----------|
| `@ufi/shared` | workspace lib | `packages/shared` (PayerRule types) |
| `drizzle-orm` | npm | Postgres query builder |

## Current Contracts

### CC-1: CMS Coverage API Sync

- Fetch LCD/NCD data from `api.coverage.cms.gov`
- Handle license token acquisition for LCD/Article detail endpoints
- Parse JSON responses into `PayerRule` schema
- Upsert into Postgres (idempotent -- safe to re-run)
- Track sync cursor for incremental updates
- Weekly scheduled run (matching CMS update cadence)

-- *Source: `docs/specs/payer-rules/cms-coverage-sync.md`*

### CC-2: PayerRule Schema

Normalized rule structure:

- CPT/HCPCS code(s) the rule applies to
- Payer identifier (CMS Medicare initially)
- Required ICD-10 codes (diagnosis justification)
- Clinical criteria checklist (structured evidence requirements)
  - e.g., `{ type: "failed_treatment", treatment: "physical therapy", duration_weeks: 6 }`
  - e.g., `{ type: "threshold", measure: "BMI", operator: ">=", value: 40 }`
  - e.g., `{ type: "comorbidity", conditions: ["diabetes", "hypertension"] }`
- Rule effective date and expiration date
- Rule version identifier
- Source document URL (for auditability)
- Source type: `cms_lcd` | `cms_ncd` | `commercial_policy` | `denial_pattern`

**Critical note:** CMS LCD/NCD documents embed clinical criteria as narrative text, not structured fields. The sync pipeline will need NLP extraction to convert narrative criteria into structured checklist items. This is the same class of problem the on-prem LLM solves for clinical notes -- the payer rules pipeline may also use LLM extraction for Phase 1.

-- *Source: `docs/specs/payer-rules/cms-coverage-sync.md`*

## Target Contracts

### TC-3: PA Requirement Lists

- Per-CPT, per-payer binary signal: does this procedure require prior authorization?
- Queryable alongside existing payer rules
- Enables prediction shortcut (no PA required = skip extraction)

-- *Source: `docs/specs/payer-rules/pa-requirement-lists.md`*

### TC-4: Payer Transparency Metrics (CMS-0057-F)

- Payer-reported approval rates, denial rates, turnaround times
- Used to calibrate prediction confidence against empirical base rates
- Seeded from UHC quarterly stats (available now), expandable to all payers post-March 31, 2026

-- *Source: `docs/specs/payer-rules/transparency-metrics.md`*

## When Feature Specs Are Required

- Adding a new payer source (Phase 2 commercial payers)
- Changing the PayerRule schema
- Adding denial pattern learning (Phase 3)
- Changing sync schedule or strategy
- Adding LLM-based criteria extraction from policy documents

## Validation

- CMS API: recorded HTTP fixtures (no live API calls in CI)
- Parse/normalize: unit tests with real CMS response samples
- Postgres upsert: integration tests with test database
- Idempotency: run sync twice, assert no duplicates or data corruption
- Schema validation: PayerRule objects validated against Zod schema

## Deployment Notes

- **Testing and single-node on-prem:** PGlite (Postgres compiled to WASM) is used for test suites and may serve single-node on-prem deployments where installing a full Postgres server is impractical.
- **Production cloud:** Production cloud deployments should use a real Postgres instance (managed or self-hosted).
- **Transparent switch:** The Drizzle ORM abstraction layer handles the difference. Application code uses Drizzle queries and does not depend on whether the underlying engine is PGlite or Postgres. No code changes are required to switch between them — only the connection configuration differs.

## References

- CMS Coverage API: `https://api.coverage.cms.gov/` ([Swagger](https://api.coverage.cms.gov/docs/swagger/index.html))
- CMS bulk downloads: `https://www.cms.gov/medicare-coverage-database/downloads/downloads.aspx`
- CMS-0057-F (Interoperability & Prior Authorization Final Rule): mandates FHIR PAS APIs by Jan 2027
- LCD Procedure Code Crosswalk: maps CPT/HCPCS codes to applicable LCDs
