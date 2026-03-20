/**
 * Payer transparency metrics derived from published reports and KFF analysis.
 *
 * Sources (verified 2026-03-20):
 *   - KFF Medicare Advantage Prior Authorization analysis, CY2024 data
 *     https://www.kff.org/medicare/medicare-advantage-insurers-made-nearly-53-million-prior-authorization-determinations-in-2024/
 *   - UnitedHealthcare self-reported ASO statistics (uhc.com, CY2024)
 *   - UHC quarterly utilization review statistics (uhcprovider.com, AR Q1-Q4 2025)
 *   - AAOS 2025 Annual Meeting research on orthopedic PA denial rates
 *   - CMS-0057-F compliance reports due March 31, 2026 — not yet published
 *
 * Data quality flags:
 *   [KFF]       — Independent analysis of CMS-reported MA data. High confidence.
 *   [SELF]      — Payer self-reported. Medium confidence; methodology may differ.
 *   [DERIVED]   — Calculated from KFF + industry ortho differential. Medium confidence.
 *   [ESTIMATED] — No payer-specific published source; informed estimate. Low confidence.
 *
 * Each record must pass `payerTransparencyMetricsSchema.parse()`.
 */

import type { PayerTransparencyMetrics } from "@ufi/shared";

export const transparencyMetricsSeeds: PayerTransparencyMetrics[] = [
  // ---------------------------------------------------------------------------
  // UnitedHealthcare — Overall (KFF MA data CY2024)
  // KFF: 12.6% denial rate, 78.8% appeal overturn, 0.9 requests/enrollee
  // UHC self-reported (ASO): 93% approval of the ~2% of claims needing PA
  // ---------------------------------------------------------------------------
  {
    payer: "UnitedHealthcare",
    reportingPeriod: "2024-CY",
    approvalRate: 0.874, // [KFF] 100% - 12.6% denial
    denialRate: 0.126, // [KFF] highest among large MA insurers
    appealApprovalRate: 0.788, // [KFF] appeal overturn rate
    avgTurnaroundDays: 3.2, // [ESTIMATED] no published payer-specific data
    medianTurnaroundDays: 2, // [ESTIMATED]
    totalRequests: 8_100_000, // [DERIVED] ~9M MA enrollees × 0.9 req/enrollee
    sourceUrl:
      "https://www.kff.org/medicare/medicare-advantage-insurers-made-nearly-53-million-prior-authorization-determinations-in-2024/",
    lastUpdated: "2026-01-28"
  },
  // UHC — Musculoskeletal / Orthopedic
  // Ortho denial rates run ~1.6x overall rate per AAOS 2025 and industry data
  {
    payer: "UnitedHealthcare",
    reportingPeriod: "2024-CY",
    serviceCategory: "Musculoskeletal / Orthopedic",
    approvalRate: 0.8, // [DERIVED] ortho runs ~1.6x denial rate vs overall
    denialRate: 0.2, // [DERIVED] 12.6% × ~1.6 ≈ 20%
    appealApprovalRate: 0.75, // [DERIVED] slightly below overall appeal rate
    avgTurnaroundDays: 4.1, // [ESTIMATED]
    medianTurnaroundDays: 3, // [ESTIMATED]
    totalRequests: 970_000, // [DERIVED] ~12% of total volume
    sourceUrl:
      "https://www.kff.org/medicare/medicare-advantage-insurers-made-nearly-53-million-prior-authorization-determinations-in-2024/",
    lastUpdated: "2026-01-28"
  },

  // ---------------------------------------------------------------------------
  // Aetna / CVS Health — Overall (KFF MA data CY2024)
  // KFF: 11.6% denial rate, 92.6% appeal overturn, 1.1 requests/enrollee
  // Self-reported: 95% approved within 24 hours, 77% electronic PA in real-time
  // ---------------------------------------------------------------------------
  {
    payer: "Aetna",
    reportingPeriod: "2024-CY",
    approvalRate: 0.884, // [KFF] 100% - 11.6% denial
    denialRate: 0.116, // [KFF]
    appealApprovalRate: 0.926, // [KFF] highest appeal overturn among large insurers
    avgTurnaroundDays: 1.5, // [SELF] "95% within 24 hours" → low average
    medianTurnaroundDays: 1, // [SELF] "77% electronic PA in real-time"
    totalRequests: 4_840_000, // [DERIVED] ~4.4M MA enrollees × 1.1 req/enrollee
    sourceUrl:
      "https://www.kff.org/medicare/medicare-advantage-insurers-made-nearly-53-million-prior-authorization-determinations-in-2024/",
    lastUpdated: "2026-01-28"
  },
  // Aetna — Musculoskeletal / Orthopedic
  {
    payer: "Aetna",
    reportingPeriod: "2024-CY",
    serviceCategory: "Musculoskeletal / Orthopedic",
    approvalRate: 0.81, // [DERIVED] ortho ~1.6x denial rate
    denialRate: 0.19, // [DERIVED]
    appealApprovalRate: 0.9, // [DERIVED] slightly below overall
    avgTurnaroundDays: 3.0, // [ESTIMATED] ortho takes longer
    medianTurnaroundDays: 2, // [ESTIMATED]
    sourceUrl:
      "https://www.kff.org/medicare/medicare-advantage-insurers-made-nearly-53-million-prior-authorization-determinations-in-2024/",
    lastUpdated: "2026-01-28"
  },

  // ---------------------------------------------------------------------------
  // Cigna — Overall (limited public data)
  // Not individually broken out in KFF 2024 MA data (grouped in "Other Insurers")
  // Groundswell 2022 data: 85.3% appeal overturn rate
  // Self-reported: removed PA for 345 procedures, ~15% volume reduction
  // ---------------------------------------------------------------------------
  {
    payer: "Cigna",
    reportingPeriod: "2024-CY",
    approvalRate: 0.88, // [ESTIMATED] industry average range for mid-tier
    denialRate: 0.12, // [ESTIMATED]
    appealApprovalRate: 0.853, // [Groundswell 2022 data] — best available
    avgTurnaroundDays: 3.5, // [ESTIMATED]
    medianTurnaroundDays: 2, // [ESTIMATED]
    sourceUrl: "https://newsroom.thecignagroup.com/the-cigna-group-releases-its-first-customer-transparency-report",
    lastUpdated: "2026-03-20"
  },
  // Cigna — Musculoskeletal / Orthopedic
  {
    payer: "Cigna",
    reportingPeriod: "2024-CY",
    serviceCategory: "Musculoskeletal / Orthopedic",
    approvalRate: 0.81, // [ESTIMATED]
    denialRate: 0.19, // [ESTIMATED]
    appealApprovalRate: 0.82, // [ESTIMATED]
    avgTurnaroundDays: 4.5, // [ESTIMATED]
    medianTurnaroundDays: 3, // [ESTIMATED]
    sourceUrl: "https://newsroom.thecignagroup.com/the-cigna-group-releases-its-first-customer-transparency-report",
    lastUpdated: "2026-03-20"
  },

  // ---------------------------------------------------------------------------
  // Humana — Overall (KFF MA data CY2024)
  // KFF: 5.5% denial rate, 64.7% appeal overturn, 2.1 requests/enrollee
  // Self-reported: >85% outpatient decisions within 1 business day
  // ---------------------------------------------------------------------------
  {
    payer: "Humana",
    reportingPeriod: "2024-CY",
    approvalRate: 0.945, // [KFF] 100% - 5.5% denial
    denialRate: 0.055, // [KFF] well below industry average
    appealApprovalRate: 0.647, // [KFF] lowest appeal overturn among large insurers
    avgTurnaroundDays: 1.5, // [SELF] ">85% within 1 business day"
    medianTurnaroundDays: 1, // [SELF]
    totalRequests: 11_550_000, // [DERIVED] ~5.5M enrollees × 2.1 req/enrollee
    sourceUrl:
      "https://www.kff.org/medicare/medicare-advantage-insurers-made-nearly-53-million-prior-authorization-determinations-in-2024/",
    lastUpdated: "2026-01-28"
  },
  // Humana — Musculoskeletal / Orthopedic
  {
    payer: "Humana",
    reportingPeriod: "2024-CY",
    serviceCategory: "Musculoskeletal / Orthopedic",
    approvalRate: 0.91, // [DERIVED] ortho ~1.6x denial rate on low base
    denialRate: 0.09, // [DERIVED] 5.5% × ~1.6 ≈ 9%
    appealApprovalRate: 0.62, // [DERIVED]
    avgTurnaroundDays: 2.5, // [ESTIMATED]
    medianTurnaroundDays: 2, // [ESTIMATED]
    sourceUrl:
      "https://www.kff.org/medicare/medicare-advantage-insurers-made-nearly-53-million-prior-authorization-determinations-in-2024/",
    lastUpdated: "2026-01-28"
  },

  // ---------------------------------------------------------------------------
  // Elevance Health / Anthem — Overall (KFF MA data CY2024)
  // KFF: 4.1% denial rate (lowest), 87.9% appeal overturn, 2.7 requests/enrollee
  // ---------------------------------------------------------------------------
  {
    payer: "Anthem",
    reportingPeriod: "2024-CY",
    approvalRate: 0.959, // [KFF] 100% - 4.1% denial — highest approval rate
    denialRate: 0.041, // [KFF] lowest denial rate among large MA insurers
    appealApprovalRate: 0.879, // [KFF]
    avgTurnaroundDays: 2.5, // [ESTIMATED]
    medianTurnaroundDays: 2, // [ESTIMATED]
    totalRequests: 13_500_000, // [DERIVED] ~5M enrollees × 2.7 req/enrollee
    sourceUrl:
      "https://www.kff.org/medicare/medicare-advantage-insurers-made-nearly-53-million-prior-authorization-determinations-in-2024/",
    lastUpdated: "2026-01-28"
  },
  // Anthem — Musculoskeletal / Orthopedic
  {
    payer: "Anthem",
    reportingPeriod: "2024-CY",
    serviceCategory: "Musculoskeletal / Orthopedic",
    approvalRate: 0.93, // [DERIVED] ortho ~1.6x denial on very low base
    denialRate: 0.07, // [DERIVED] 4.1% × ~1.7 ≈ 7%
    appealApprovalRate: 0.85, // [DERIVED]
    avgTurnaroundDays: 3.5, // [ESTIMATED]
    medianTurnaroundDays: 2, // [ESTIMATED]
    sourceUrl:
      "https://www.kff.org/medicare/medicare-advantage-insurers-made-nearly-53-million-prior-authorization-determinations-in-2024/",
    lastUpdated: "2026-01-28"
  },

  // ---------------------------------------------------------------------------
  // Medicare Advantage — Industry Aggregate (KFF CY2024)
  // Serves as the baseline comparator for all payer-specific metrics
  // ---------------------------------------------------------------------------
  {
    payer: "Medicare",
    reportingPeriod: "2024-CY",
    approvalRate: 0.927, // [KFF] 100% - 7.3% overall denial
    denialRate: 0.073, // [KFF] industry-wide MA denial rate
    appealApprovalRate: 0.807, // [KFF] 80.7% of appeals overturned
    avgTurnaroundDays: 2.5, // [ESTIMATED] CMS 72hr urgent / 7day standard
    medianTurnaroundDays: 2, // [ESTIMATED]
    totalRequests: 52_800_000, // [KFF] total MA PA determinations
    sourceUrl:
      "https://www.kff.org/medicare/medicare-advantage-insurers-made-nearly-53-million-prior-authorization-determinations-in-2024/",
    lastUpdated: "2026-01-28"
  },
  // Medicare — Musculoskeletal / Orthopedic
  {
    payer: "Medicare",
    reportingPeriod: "2024-CY",
    serviceCategory: "Musculoskeletal / Orthopedic",
    approvalRate: 0.88, // [DERIVED] ortho ~1.6x the 7.3% base ≈ 12% denial
    denialRate: 0.12, // [DERIVED]
    appealApprovalRate: 0.78, // [DERIVED]
    avgTurnaroundDays: 3.0, // [ESTIMATED]
    medianTurnaroundDays: 2, // [ESTIMATED]
    sourceUrl:
      "https://www.kff.org/medicare/medicare-advantage-insurers-made-nearly-53-million-prior-authorization-determinations-in-2024/",
    lastUpdated: "2026-01-28"
  }
];
