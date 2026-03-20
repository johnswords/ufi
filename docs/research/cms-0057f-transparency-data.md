# CMS-0057-F Payer Transparency Data — Research Findings

**Compiled:** 2026-03-20
**Status:** Pre-deadline (March 31, 2026 is first CMS-0057-F compliance deadline)

---

## 1. Regulatory Context

CMS-0057-F requires impacted payers (MA organizations, Medicaid/CHIP programs, managed
care plans, QHP issuers on FFEs) to publicly report prior authorization metrics for CY2025
on their websites by **March 31, 2026**, and annually thereafter.

### Required Metrics
- Percent of PA requests approved
- Percent of PA requests denied
- Percent approved after appeal
- Average time between submission and decision
- List of all items/services requiring PA (excluding drugs)

### Reporting Levels
- MA organizations: contract level
- State Medicaid/CHIP FFS: state level
- Managed care plans: plan level
- QHP issuers on FFEs: issuer level

**Sources:**
- [CMS-0057-F Fact Sheet](https://www.cms.gov/newsroom/fact-sheets/cms-interoperability-prior-authorization-final-rule-cms-0057-f)
- [CMS Prior Authorization API FAQ](https://www.cms.gov/priorities/burden-reduction/overview/interoperability/frequently-asked-questions/prior-authorization-api)

---

## 2. KFF Medicare Advantage Prior Authorization Data (2024)

The most authoritative cross-payer dataset. Published January 2026 by Kaiser Family Foundation
using CMS-reported MA data for calendar year 2024.

### Industry Totals
| Metric | Value |
|--------|-------|
| Total PA requests | ~52.8 million |
| Requests per enrollee | 1.6 |
| Overall denial rate | 7.3% (approx. 92.7% approval) |
| Share of denials appealed | 12.2% |
| Appeal overturn rate | 80.7% |

### By Insurer (MA Plans Only, 2024)

| Insurer | Requests/Enrollee | Denial Rate | Approval Rate (derived) | Appeal Rate | Appeal Overturn Rate |
|---------|-------------------|-------------|------------------------|-------------|---------------------|
| UnitedHealth Group | 0.9 | 12.6% | 87.4% | 12.0% | 78.8% |
| CVS Health (Aetna) | 1.1 | 11.6% | 88.4% | 21.4% | 92.6% |
| Humana | 2.1 | 5.5% | 94.5% | 11.6% | 64.7% |
| Elevance Health (Anthem) | 2.7 | 4.1% | 95.9% | 9.1% | 87.9% |
| Centene | 2.7 | 11.9% | 88.1% | 7.5% | 95.3% |
| Kaiser Foundation | 0.6 | 10.3% | 89.7% | 1.7% | 50.2% |

**Source:** [KFF: Medicare Advantage Insurers Made Nearly 53 Million Prior Authorization Determinations in 2024](https://www.kff.org/medicare/medicare-advantage-insurers-made-nearly-53-million-prior-authorization-determinations-in-2024/)

---

## 3. UnitedHealthcare Published Data

### Self-Reported Statistics (ASO Book of Business, CY2024)
- 98% of claims do not require prior authorization
- Of the ~2% requiring PA, over 93% are approved
- Denial breakdown (of the 7% denied):
  - 3.6% — missing clinical information
  - 3.0% — plan design / eligibility
  - 0.4% — integrity and fraud review
  - 0.3% — medical necessity / PA denial

### Quarterly Utilization Review Statistics
UHC publishes state-specific quarterly reports per state regulatory requirements.
Available reports (Excel format) for 2025:
- **Arkansas:** Q1, Q2, Q3, Q4 2025
- **Wyoming:** Q1–Q4 2025
- Other states (CO, GA, IL, IN, MN, MS, TN, TX): mostly 2024 reports

Download base URL: `https://www.uhcprovider.com/content/dam/provider/docs/public/prior-auth/utilization/`

### 2025 Reduction Efforts
- Reduced PA volume by ~20% in 2023 for common procedures
- Targeted additional 10% reduction in 2025
- Dropped PA requirements for 231 procedures (December 2025)

**Sources:**
- [UHC Prior Auth Utilization Review Statistics](https://www.uhcprovider.com/en/prior-auth-advance-notification/prior-auth-util-review-statistics.html)
- [UHC Streamlining Prior Authorization](https://www.uhc.com/employer/news-strategies/streamlining-the-prior-authorization-process-for-a-better-health-care-experience)

---

## 4. CVS Health / Aetna Published Data

### Self-Reported Claims
- Approve more than 95% of all eligible prior authorizations within 24 hours
- 77% of electronic prior authorizations approved in real-time

### KFF MA Data (2024)
- Denial rate: 11.6% (approval: 88.4%)
- Appeal overturn rate: 92.6% (highest among large insurers)
- 1.1 requests per enrollee

**Source:** [Aetna Supports Industry Actions on Prior Authorization](https://www.cvshealth.com/news/company-news/aetna-supports-industry-actions-to-simplify-prior-authorization.html)

---

## 5. Cigna / Evernorth Published Data

### Transparency Reports
- First Customer Transparency Report published (focus on PA requirement removals)
- Removed PA requirements for 345 tests, procedures, and services
- Decreased volume of medical PAs by approximately 15%
- Evernorth publishes state-specific approval/denial statistics (Arkansas, Georgia, DC)
  but actual percentages are in downloadable PDFs, not on the web page

### KFF MA Data (2024)
Cigna is not individually broken out in the 2024 KFF MA dataset (included in "Other Insurers").

**Source:** [Cigna Group Customer Transparency Report](https://newsroom.thecignagroup.com/the-cigna-group-releases-its-first-customer-transparency-report)

---

## 6. Humana Published Data

### KFF MA Data (2024)
- Denial rate: 5.5% (approval: 94.5%) — below industry average
- 2.1 requests per enrollee
- Appeal overturn rate: 64.7% (lowest among large insurers)

### Self-Reported Commitments
- Decisions within 1 business day on >85% of outpatient procedures (current)
- Target: 95% of complete electronic PA requests decided within 1 business day by Jan 2026
- Committed to cutting one-third of PA requirements
- Will publish CMS-0057-F compliance metrics in 2026

**Source:** [Humana Accelerates Efforts to Eliminate PA Requirements](https://policy.humana.com/issue-area/news-and-resources/news-press/2025/humana-accelerates-efforts-to-eliminate-prior-authorization)

---

## 7. Elevance Health / Anthem Published Data

### KFF MA Data (2024)
- Denial rate: 4.1% (approval: 95.9%) — **lowest** among large MA insurers
- 2.7 requests per enrollee (highest volume per enrollee)
- Appeal overturn rate: 87.9%

### Industry Pledges
- Signed insurer pledge to streamline PA processes
- Committed to reducing PA-required services with progress by Jan 2026
- Transparent electronic PA solutions framework by Jan 2027

---

## 8. Musculoskeletal / Orthopedic Category Data

Orthopedic procedures consistently show **higher denial rates** than overall averages.

| Source | Overall Denial Rate | Ortho/MSK Denial Rate |
|--------|--------------------|-----------------------|
| Healthcare industry average (2024) | 11.8% | 14–22% (ASC cases) |
| Medicare Advantage (2025) | 7.4% | Higher (not quantified precisely) |
| AAOS 2025 study (THA) | 3.0% general denial | 4.8% with PA requirement |

### Key Study: AAOS 2025 Annual Meeting
- Patients with PA requirements for total hip arthroplasty experienced:
  - Higher denial rates (4.8% vs 3.0%)
  - Longer wait times (4 additional days on average)
  - PA did not reduce costs

**Sources:**
- [AAOS 2025: PA Does Not Reduce Costs for THA](https://aaos-annualmeeting-presskit.org/2025/research-news/new-study-shows-prior-authorization-does-not-reduce-costs-for-total-hip-arthroplasty-delays-patient-care/)
- [Orthopedic Denial Rate Crisis](https://www.medicalbillersandcoders.com/blog/is-denial-rate-crisis-draining-orthopedic-revenue/)

---

## 9. Turnaround Time Data

### Current State (Pre-CMS-0057-F enforcement)
- Standard medication PA: up to 14–15 days
- Average patient-reported wait: 3 days (Arthritis Foundation survey)
- 31% of patients waited over a week
- Humana: >85% decided within 1 business day (outpatient)
- CVS/Aetna: 95% within 24 hours (self-reported)

### CMS-0057-F Requirements (Effective Jan 2026)
- Urgent requests: 72 hours
- Non-urgent requests: 7 calendar days

---

## 10. CMS Aggregated Analysis Status

As of March 20, 2026 (11 days before the deadline):
- **No CMS aggregated analysis of payer PA metrics has been published yet**
- CMS has published a Prior Authorization Metrics Reporting Template for payers
- First payer reports are due March 31, 2026
- CMS aggregation of submitted data is expected after the deadline

---

## 11. Data Confidence Assessment

| Payer | Data Source | Confidence | Notes |
|-------|-----------|------------|-------|
| UnitedHealthcare (MA) | KFF 2024 analysis of CMS data | **High** | Independent analysis of reported data |
| UnitedHealthcare (ASO) | UHC self-reported | **Medium** | Self-reported, different methodology |
| CVS/Aetna (MA) | KFF 2024 | **High** | Independent analysis |
| Humana (MA) | KFF 2024 | **High** | Independent analysis |
| Elevance/Anthem (MA) | KFF 2024 | **High** | Independent analysis |
| Cigna | Industry reports only | **Low** | Not broken out in KFF MA data |
| Ortho/MSK breakdown | AAOS studies, industry surveys | **Medium** | Directional but not payer-specific |
| Turnaround times | Mixed sources | **Medium** | Self-reported vs patient-reported diverge |
| Medicare FFS | CMS published data | **Medium** | General stats, not PA-specific breakdowns |
