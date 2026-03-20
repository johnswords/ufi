# Feature: CMS Coverage API Sync

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

The prediction engine needs structured payer rules to evaluate medical necessity. CMS Medicare coverage determinations (LCDs and NCDs) are the best Phase 1 data source: free, programmatic access, JSON format, weekly updates, and they set the baseline that most commercial payers follow.

The CMS Coverage API at `api.coverage.cms.gov` provides metadata and document access for LCDs, NCDs, and associated Articles. Clinical criteria within these documents are embedded as narrative text, requiring extraction to produce structured rule checklist items.

## Goal

A sync pipeline that fetches LCD/NCD data from the CMS Coverage API, extracts structured medical necessity criteria, and upserts `PayerRule` records into Postgres. Idempotent and safe to re-run.

## Non-goals

- Commercial payer policies (Phase 2)
- Practice denial pattern learning (Phase 3)
- Real-time API to CMS (this is batch sync)
- Full LCD/NCD document archival

## PHI Boundary Impact

None. Payer rules are public policy documents. No patient data involved.

## Affected Surfaces

- `payer-rules` (primary)
- `cloud-api` (consumer -- serves rules via `GET /payer-rules/{cpt}`)
- `agent` (consumer -- caches rules locally)
- `shared` (PayerRule type definition)

## Existing Primitives

Greenfield -- no existing code to extend.

## Constraints

- CMS Coverage API rate limit: 10,000 requests/second (generous)
- LCD/Article detail endpoints require license token (accept AMA/ADA/AHA terms, 1-hour TTL)
- API returns only latest document version; retired policies available only in bulk downloads
- Clinical criteria are narrative text within documents, not structured API fields
- Weekly update cadence from CMS

## Design

### CMS API Endpoints Used

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /v1/metadata/license-agreement` | None | Obtain license token (1hr TTL) |
| `GET /v1/reports/local-coverage-final-lcds/` | None | List all final LCDs |
| `GET /v1/data/lcd/{id}` | License token | LCD document detail |
| `GET /v1/data/article/{id}` | License token | Billing/coding article (contains CPT crosswalk) |
| `GET /v1/reports/national-coverage-ncd/` | None | List all NCDs |
| `GET /v1/data/ncd/{id}` | None | NCD document detail |

### Sync Pipeline

```
1. Acquire license token
2. Fetch LCD/NCD listing (paginated)
3. For each document:
   a. Fetch detail (LCD requires token, NCD does not)
   b. Fetch associated Article (contains CPT/HCPCS code mappings)
   c. Extract clinical criteria from narrative text
   d. Map to PayerRule schema
   e. Upsert into Postgres
4. Store sync cursor (last successful document ID + timestamp)
```

### Criteria Extraction

Clinical criteria are embedded as narrative text in LCD indications/limitations sections. Examples:

- "Coverage requires HbA1c > 7% and duration of diabetes >= 2 years"
- "Patient must have failed at least 6 weeks of supervised physical therapy"
- "BMI >= 40, or >= 35 with documented comorbidities"

**Extraction approach:** Use LLM (cloud-side, not on-prem -- no PHI involved) or regex/heuristic patterns to convert narrative criteria into structured `CriteriaItem` objects:

```typescript
type CriteriaItem =
  | { type: 'threshold'; measure: string; operator: '>=' | '<=' | '>' | '<' | '=='; value: number; unit?: string }
  | { type: 'failed_treatment'; treatment: string; duration_weeks: number }
  | { type: 'comorbidity'; conditions: string[] }
  | { type: 'documentation_required'; description: string }
  | { type: 'diagnosis_required'; icd10Codes: string[] }
  | { type: 'narrative'; text: string };  // fallback for unparseable criteria
```

The `narrative` fallback ensures no criteria are lost even when extraction fails. The prediction engine can still surface these as "manual review required" items.

### PayerRule Upsert

- Primary key: `(source_type, source_document_id, cpt_code)`
- Upsert on conflict: update criteria, effective dates, version
- Soft-delete rules from retired documents (mark inactive, don't delete)
- Track `last_synced_at` for monitoring

## Acceptance Criteria

- [x] License token acquired for LCD/article detail access
- [x] LCD and NCD listings fetched through the paginated client abstraction
- [x] Document details and associated Articles fetched
- [x] CPT/HCPCS codes extracted from Articles and linked to LCDs
- [x] At least basic criteria extraction from narrative text (with `narrative` fallback)
- [x] PayerRule records upserted into Postgres-compatible storage (idempotent)
- [x] Sync cursor tracked for incremental runs
- [x] No data loss on re-run (upsert, not insert)

## Validation

- [x] Recorded CMS API response fixtures cover the license, listing, LCD, related-document, article, article-code, and NCD endpoints
- [x] Unit tests for criteria extraction run against representative LCD text samples
- [x] Postgres upsert idempotency test: run sync twice, assert identical state
- [ ] Sync cursor test proves a second run fetches only new/updated documents
- [x] Schema validation: synced `PayerRule` objects pass the shared Zod contract

## Risks / Rollback

- **Risk:** CMS API changes or breaks. Mitigation: recorded fixtures isolate tests from API; bulk downloads as fallback data source.
- **Risk:** Criteria extraction accuracy. Mitigation: `narrative` fallback captures everything; extraction accuracy improves over time without losing data.
- **Risk:** LCD/Article structure varies across MACs (Medicare Administrative Contractors). Mitigation: start with a few known LCDs, generalize incrementally.
- **Rollback:** Payer rules are additive. Drop and re-sync from CMS at any time.

## Open Questions

1. Should criteria extraction use LLM (more accurate, costs money) or heuristic patterns (free, less accurate) in Phase 1?
2. Which CPT code families should we target first? Orthopedic surgical procedures are high-volume prior auth candidates.
3. How many LCDs/NCDs are relevant to surgical prior auth? Need to scope the initial sync to avoid ingesting thousands of irrelevant coverage policies.
