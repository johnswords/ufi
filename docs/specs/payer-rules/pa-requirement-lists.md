# Feature: Payer Prior Auth Requirement Lists

## Metadata

| Field | Value |
|-------|-------|
| Status | Draft |
| Implementation | Not Started |
| Feature Flag | -- |
| Last Verified | -- |
| Depends On | `docs/specs/payer-rules/cms-coverage-sync.md` |
| Truth Mode | target |

## Context

Major payers publish lists of which CPT codes require prior authorization. This is a binary signal ("does this procedure need PA with this carrier?") that the prediction engine can check before running the full extraction pipeline. If PA isn't required, the answer is instant: "no prior auth needed."

This data also enriches the carrier dropdown in the web demo — showing which carriers require PA for the selected CPT code.

## Goal

A curated dataset of PA requirement status by CPT code and payer, queryable alongside the existing payer rules. Displayed in the web demo as a pre-check before running LLM extraction.

## Non-goals

- Real-time API integration with payer portals (most require provider auth)
- Automating PA submission (that's the FHIR PAS work for 2027)

## PHI Boundary Impact

None. PA requirement lists are public policy data.

## Design

### Data Model

```typescript
interface PaRequirement {
  cptCode: string;
  payer: string;
  requiresPriorAuth: boolean;
  effectiveDate: string;
  sourceUrl: string;
  notes?: string;  // e.g., "Gold Card exempt", "eviCore manages"
}
```

### Sources (Phase 1 — hand-curated from published PDFs)

- UnitedHealthcare: PA code lists at uhcprovider.com
- Aetna: precertification lists (updated March 1, 2026)
- Cigna: precertification code list via CignaforHCP.com
- CMS Medicare: DMEPOS PA required list (PDF, updated Jan 2026)

### Integration Points

1. **New table**: `pa_requirements` in PayerRulesRepository
2. **New API endpoint**: `GET /api/pa-check/:cpt` — returns which carriers require PA
3. **Web demo enhancement**: Show PA requirement badges next to carrier names in dropdown
4. **Prediction shortcut**: If PA not required for this CPT+carrier, skip extraction and return "No prior authorization required"

## Acceptance Criteria

- [ ] PA requirement data seeded for target ortho/spinal CPT codes across Aetna, Cigna, UHC, Medicare
- [ ] `GET /api/pa-check/:cpt` returns PA status by carrier
- [ ] Web demo carrier dropdown shows PA requirement status
- [ ] Prediction endpoint returns early if PA not required
