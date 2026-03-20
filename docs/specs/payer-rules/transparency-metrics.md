# Feature: Payer Transparency Metrics (CMS-0057-F)

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

CMS-0057-F requires payers to publicly report prior authorization approval/denial metrics by March 31, 2026. UnitedHealthcare already publishes quarterly utilization review statistics in PDF/Excel format. These metrics directly calibrate our prediction confidence — if a payer denies 40% of lumbar fusion PAs, the prediction engine should reflect that base rate.

## Goal

Ingest payer-reported PA metrics (approval rates, denial rates, turnaround times) and use them to calibrate prediction confidence and provide contextual information in the web demo results.

## Non-goals

- Real-time payer API integration (no standardized API exists yet)
- Replacing the criteria-based prediction with pure statistical prediction
- Aggregating all payer reports (start with UHC which already publishes)

## PHI Boundary Impact

None. Payer transparency metrics are aggregate public data with no patient-level information.

## Design

### Data Model

```typescript
interface PayerTransparencyMetrics {
  payer: string;
  reportingPeriod: string;        // e.g., "2025-Q3", "2025-CY"
  serviceCategory?: string;        // e.g., "Musculoskeletal", "Orthopedic Surgery"
  totalRequests?: number;
  approvalRate: number;            // 0-1
  denialRate: number;              // 0-1
  appealApprovalRate?: number;     // 0-1 (approved after appeal)
  avgTurnaroundDays?: number;
  medianTurnaroundDays?: number;
  expeditedApprovalRate?: number;
  expeditedDenialRate?: number;
  sourceUrl: string;
  lastUpdated: string;
}
```

### Sources

**Available now:**
- UnitedHealthcare quarterly UR statistics (PDF/Excel) at uhcprovider.com — Q1, Q2, Q3 2025 published

**Available after March 31, 2026:**
- All payers subject to CMS-0057-F must publish on their websites
- No centralized CMS portal — must check each payer individually
- Expected formats: PDF, Excel, possibly web pages

### Integration Points

1. **New table**: `payer_transparency_metrics` in PayerRulesRepository
2. **Prediction calibration**: Adjust confidence based on historical approval rates
   - If payer approves 95% of TKR PAs, high base confidence
   - If payer denies 35% of lumbar fusion PAs, lower base confidence, flag risk
3. **Web demo context**: Show approval rate context in results panel
   - "Cigna approves 82% of total knee replacement prior auth requests (2025 data)"
4. **New API endpoint**: `GET /api/metrics/:payer` — returns transparency metrics

### Prediction Confidence Adjustment

```
adjustedConfidence = criteriaConfidence * (0.7 + 0.3 * payerApprovalRate)
```

This blends the criteria-based prediction (what the note contains vs. what the rules require) with the empirical approval rate (how often this payer actually approves). The criteria assessment dominates (70% weight) but the base rate shifts the needle.

## Acceptance Criteria

- [ ] UHC quarterly metrics seeded from published 2025 data
- [ ] Metrics stored in queryable format (not just PDFs)
- [ ] Prediction confidence adjusted by payer approval rate when metrics available
- [ ] Web demo results show payer approval rate context
- [ ] `GET /api/metrics/:payer` returns transparency metrics
- [ ] Scaffold for ingesting additional payer reports post-March 31
