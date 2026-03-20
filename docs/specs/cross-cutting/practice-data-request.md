# Feature: Practice Data Request — Medent Sample Data for Development

## Metadata

| Field | Value |
|-------|-------|
| Status | Draft |
| Implementation | Not Started |
| Feature Flag | -- |
| Last Verified | -- |
| Depends On | -- |
| Truth Mode | target |

## Context

Development of the CDA parser, extraction pipeline, and prediction engine depends on real data from a Medent practice. Without it, we're building against assumed document structures and synthetic scenarios. Three categories of data are needed, ordered by priority and PHI sensitivity.

## Data Request Items

### Request 1: Denial/Approval Export (No PHI)

**Priority:** Highest — unblocks test data matrix and prediction validation.

**What to ask for:**
A report of prior authorization outcomes from the last 12 months, containing only coded data:

| Field | Example | Notes |
|-------|---------|-------|
| CPT code | 27447 | Procedure submitted |
| ICD-10 codes | M17.11, M17.12 | Diagnosis codes submitted |
| Payer name | Aetna | Insurance carrier |
| Plan type | PPO | Plan category |
| Outcome | Denied | Approved / Denied / Pending |
| Denial reason | Insufficient documentation of conservative treatment | Free text or CARC/RARC code |
| Appeal filed | Yes | Yes / No |
| Appeal outcome | Approved | Approved / Denied / Pending / N/A |
| Date | 2025-06 | Month-level granularity is sufficient |

**PHI risk:** None. No patient names, DOBs, MRNs, or identifiers. Just procedure codes, payer, and outcome.

**Source:** Practice billing system, clearinghouse reports, or payer remittance/EOB records. Most practice management systems can export this.

**What this gives us:**
- Real denial rate by CPT + carrier (calibrates prediction confidence)
- Real denial reasons (validates our payer rule criteria)
- Appeal success rates (informs "needs documentation" vs. "denied" distinction)
- Volume data (which CPT codes to prioritize in the test matrix)

### Request 2: MAPI CDA XML Sample (No PHI if using test patient)

**Priority:** Critical — unblocks CDA parser development entirely.

**What to ask for:**
A raw MAPI XML response from a **test patient** in Medent Portal v23.0+. The practice should:

1. Create or use an existing test/demo patient in Medent
2. Ensure the test patient has sample data in: clinical notes, problems, procedures, medications, insurance, assessment plan
3. Use the MAPI to pull data with this query:

```
POST https://www.medentmobile.com/mapi/services/index.php

Form parameters:
  registration_id: [their registration ID]
  poc_id: [their POC ID]
  patient_token: [test patient token]
  data_query: patient_clinical_notes#patient_problems#patient_procedures#patient_medications#patient_insurance_providers#patient_assessment_plan
```

4. Save the full XML response (including the base64-encoded `<patient_data>` payload) and send it to us

**PHI risk:** None if using a test patient. If using a real patient, the CDA contains full PHI — the practice should either use a test patient or redact before sending.

**What this gives us:**
- Actual CDA R2 template OIDs Medent uses (may differ from generic CDA R2)
- Real XML nesting structure and namespace usage
- Section organization (which CDA sections map to which MAPI queries)
- Encoding and formatting specifics (base64 wrapping, character encoding)
- Confidence to build the parser against real structure instead of assumptions

**If MAPI access is too complex**, an alternative is:
- Export a test patient's clinical summary as a CDA/CCDA document from Medent's portal interface (many EHRs support CDA export for interoperability)
- Even a screenshot of the XML structure would partially de-risk the parser

### Request 3: De-identified Office Notes with Outcomes (Contains derived PHI risk)

**Priority:** High — unblocks extraction pipeline quality and test data matrix.

**What to ask for:**
For 10-20 procedures that went through prior authorization (mix of approvals and denials):

| Field | Notes |
|-------|-------|
| Office/consultation note text | De-identified: remove patient name, DOB, MRN, SSN, address, phone. Keep clinical content. |
| CPT code | Procedure that was submitted for prior auth |
| ICD-10 codes | Diagnosis codes submitted |
| Payer + plan type | e.g., "Medicare Part B", "Aetna PPO" |
| Prior auth outcome | Approved / Denied / Needs more info |
| Denial reason (if denied) | Payer's stated reason |

**Ideal distribution:**
- 5-6 approvals (showing what "good" documentation looks like)
- 5-6 denials (showing what's missing or insufficient)
- 3-4 "needed additional documentation" cases
- Across at least 3-4 different CPT code families
- Across at least 2 carriers (Medicare + one commercial)

**PHI risk:** Medium. Even with names removed, clinical notes may contain residual identifiers (dates of service, facility references, provider names). The practice should apply their standard de-identification process, or we can work with them on-site to review notes in-place without the data leaving their network.

**What this gives us:**
- Real physician documentation patterns and writing styles
- Ground truth for extraction: "this note contains evidence of 6 weeks failed PT" — we can verify the LLM finds it
- Ground truth for prediction: "this note + this carrier = denied because..." — we can verify the prediction engine is correct
- Realistic note structure (what Medent encounter notes actually look like vs. textbook examples)

**Fallback if de-identification is too burdensome:**
- 3-5 note **templates** or **structure examples** (anonymized heavily, showing layout and section patterns)
- A description of their typical documentation workflow: what sections they use, how they document prior auth criteria, abbreviation patterns

## Delivery Format

| Request | Preferred Format | Acceptable Format |
|---------|-----------------|-------------------|
| Denial export | CSV or Excel | PDF report we can parse |
| MAPI XML sample | Raw XML file (.xml) | Copy-pasted text, screenshot of structure |
| Office notes | Plain text files (.txt) per note, with a metadata CSV | Word docs, PDFs |

## Timeline Dependency

| Request | Blocks | Can start without it? |
|---------|--------|----------------------|
| Denial export | Test data matrix accuracy, prediction calibration | Yes — use synthetic scenarios, but predictions will be uncalibrated |
| MAPI XML sample | CDA parser implementation | Partially — can build against CDA R2 spec, but risk rework |
| Office notes | Extraction pipeline quality, LLM prompt tuning | Yes — use LLM-generated synthetic notes, but extraction accuracy will be lower |

## Sample Email to Practice

> Subject: Data request for UFI MedEnt development — 3 items
>
> We're building the approval prediction engine and need three things from your Medent system. None of these require sharing patient names or identifiers.
>
> **1. Prior auth outcomes (no patient info needed)**
> Can you pull a report of prior authorization results from the last 12 months? We just need: CPT code, diagnosis codes, payer name/plan type, outcome (approved/denied), denial reason, and whether it was appealed. Just the codes and outcomes — no patient names or chart numbers.
>
> **2. One MAPI test patient export**
> If you have a test or demo patient in Medent (v23.0+), can you pull their clinical data through the Medent API and save the XML response? We need to see the exact document format so our parser handles it correctly. We can walk you through the API call if that helps.
>
> **3. Sample office notes (if feasible)**
> For 10-20 procedures that went through prior auth — mix of approvals and denials — could you share the office notes with patient identifiers removed, along with the CPT code, payer, and outcome? If full de-identification is too much work, even a few note templates showing your typical documentation structure would be valuable.
>
> Happy to jump on a call to walk through any of this. The denial export (#1) and MAPI sample (#2) are the most critical — if we can only get two things, those are the ones.

## Acceptance Criteria

- [ ] Denial export received and parsed into structured format
- [ ] At least one MAPI CDA XML sample obtained and validated against parser
- [ ] At least 5 de-identified office notes received with paired outcomes
- [ ] Data cataloged in `packages/shared/test-data/real-samples/` (or kept off-repo if sensitivity warrants)
- [ ] CDA parser OID mappings validated against real Medent output
- [ ] Test data matrix updated with scenarios derived from real denial patterns

## Open Questions

1. Does the practice have a test patient already configured in Medent Portal?
2. Can their billing system export denial data in CSV, or will it require manual compilation?
3. What's their comfort level with de-identifying clinical notes? Do they have a standard process?
4. Should we offer to do the data extraction on-site (we come to them, data never leaves the building)?
5. Are there compliance/legal review requirements before they can share even de-identified data with us?
