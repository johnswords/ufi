# Feature: CDA R2 Section Mapping

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

The Medent MAPI returns patient data as base64-encoded HL7 CDA R2 XML. Before the agent can extract clinical criteria or run LLM analysis, this XML must be parsed into typed TypeScript domain objects. CDA R2 uses HL7 RIM (Reference Information Model) with template OIDs to identify section types — this mapping layer is the foundation everything else builds on.

Risk: Medent's CDA output may deviate from generic CDA R2 spec. We need real sample data from a Medent instance to confirm the actual document structure.

## Goal

A `parseCdaDocument()` function that accepts base64-encoded or raw CDA R2 XML and returns a typed `CdaDocument` with all clinically relevant sections mapped to domain objects.

## Non-goals

- Full CDA R2 spec compliance (only map sections relevant to prior auth evaluation)
- PHI filtering (that's the agent's PHI gate, not the parser's job)
- Network access of any kind
- Logging or persistence of parsed data

## PHI Boundary Impact

None directly. The parser operates in-memory within the agent process. It does not persist, transmit, or log data. PHI flows through it but is not exported.

## Affected Surfaces

- `cda-parser` (primary)
- `agent` (consumer -- depends on `CdaDocument` interface)
- `shared` (domain types defined here)

## Existing Primitives

Greenfield -- no existing code to extend.

## Constraints

- Must handle base64 decoding (MAPI wraps CDA in `<patient_data>Base64EncodedCDA</patient_data>`)
- Must gracefully handle missing/optional CDA sections (return empty arrays, not errors)
- Must preserve unmapped sections in `raw` field for escape-hatch access
- No external dependencies beyond `fast-xml-parser` and `@ufi/shared`
- Pure synchronous library (no async, no side effects)

## Design

### Target Sections

| CDA Section | Domain Type | MAPI Query Source |
|-------------|-------------|-------------------|
| Clinical Notes | `ClinicalNote` | `patient_clinical_notes` |
| Problem List | `Problem` (ICD-10 coded) | `patient_problems` |
| Procedures | `Procedure` (CPT/HCPCS coded) | `patient_procedures` |
| Medications | `Medication` | `patient_medications` |
| Insurance/Payers | `InsuranceProvider` | `patient_insurance_providers` |
| Assessment & Plan | `AssessmentPlan` | `patient_assessment_plan` |
| Vital Signs | `VitalSign` | (within clinical data) |

### Implementation Approach

1. Base64 decode -> XML string
2. Parse XML with `fast-xml-parser` (configure to preserve attributes and namespaces)
3. Identify CDA sections by template OID or section code
4. Map each section to typed domain object via dedicated mapper functions
5. Collect unmapped sections into `raw`
6. Return `CdaDocument`

### Open Design Question

CDA R2 template OIDs vary by implementation. Need at least one real Medent CDA sample to confirm which OIDs and section structures Medent actually produces. Plan to build the mapper with a registry pattern so adding new OID mappings is straightforward.

## Acceptance Criteria

- [x] `parseCdaDocument(base64String)` returns typed `CdaDocument`
- [x] `parseCdaDocument(xmlString)` also works (auto-detects encoding)
- [x] Each mapped section type is exercised by synthetic CDA fixtures
- [x] Missing sections return empty arrays (not null, not errors)
- [x] Malformed XML throws typed `CdaParseError` with context
- [x] Snapshot tests lock down mapping stability

## Validation

- [x] `vitest` suite with synthetic CDA R2 fixtures covering complete documents, missing sections, and template-ID fallback
- [x] Error case fixtures cover malformed XML and invalid base64
- [x] Snapshot tests lock down mapping output stability
- [x] Type-check: `CdaDocument` interface matches mapper outputs

## Risks / Rollback

- **Risk:** Medent CDA output differs from standard CDA R2. Mitigation: registry-based mapper; add OID mappings as we discover them from real samples.
- **Risk:** `fast-xml-parser` doesn't handle CDA namespaces correctly. Mitigation: evaluate `libxmljs2` as fallback if namespace handling is insufficient.
- **Rollback:** Library is isolated in its own package. Replacing the parser doesn't affect other surfaces.

## Open Questions

1. Can we obtain a real CDA R2 sample from a Medent v23+ instance? This would de-risk the OID mapping significantly.
2. Does Medent produce separate CDA documents per MAPI query, or a combined document when using `patient_all`?
3. Are there Medent-specific CDA extensions or custom template OIDs?
