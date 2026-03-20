# Surface Spec: CDA Parser

## Purpose

Parses HL7 CDA R2 XML documents (as returned by Medent MAPI in base64 encoding) into structured, typed domain objects. This is a pure library with no network access, no state, and no PHI-awareness -- it maps XML to TypeScript types.

PHI passes through this library in-memory within the agent's process. The parser does not persist, transmit, or log any data.

## Owned Surface

- Base64 decode pipeline (MAPI `<patient_data>` -> XML string)
- CDA R2 XML parsing and section identification
- Section-to-domain-model mapping (template OIDs -> typed objects)
- Test fixture suite (synthetic CDA R2 documents)

## Interfaces and Dependencies

### Input

- Base64-encoded CDA R2 XML string (as received from MAPI `<patient_data>` tag)
- Or pre-decoded XML string

### Output

Typed domain objects per CDA section:

```typescript
function parseCdaDocument(input: string | Buffer): CdaDocument;

interface CdaDocument {
  clinicalNotes: ClinicalNote[];
  problems: Problem[];          // ICD-10 coded
  procedures: Procedure[];      // CPT/HCPCS coded
  medications: Medication[];
  insuranceProviders: InsuranceProvider[];
  assessmentPlan: AssessmentPlan | null;
  vitalSigns: VitalSign[];
  raw: Document;                // parsed XML for escape-hatch access
}
```

### Dependencies

| Dependency | Type | Location |
|------------|------|----------|
| `@ufi/shared` | workspace lib | `packages/shared` (domain types) |
| `fast-xml-parser` | npm | XML parsing |

## Current Contracts

None -- greenfield.

## Target Contracts

> These contracts are NOT yet active. Promote to Current Contracts after implementation lands.

### TC-1: CDA R2 Section Mapping

- Map CDA R2 template OIDs to domain model types
- Handle the specific CDA structure Medent produces (may differ from generic CDA R2 -- needs real sample data to confirm)
- Graceful handling of missing/optional sections (return empty arrays, not errors)
- No data loss: unmapped sections preserved in `raw`

-- *Source: `docs/specs/cda-parser/cda-r2-section-mapping.md`*

### TC-2: Base64 Decode Pipeline

- Accept base64-encoded input (as MAPI returns it)
- Decode, parse XML, validate basic CDA structure (root element, required headers)
- Return typed `CdaDocument` or throw typed parse error with context

-- *Source: `docs/specs/cda-parser/cda-r2-section-mapping.md`*

## When Feature Specs Are Required

- Adding support for a new CDA section type
- Changing the domain model output types (CdaDocument interface)
- Changing the XML parser library
- Handling a Medent-specific CDA variation discovered during integration

## Validation

- Fixture-driven: real-shaped CDA R2 documents with fully synthetic (fake patient) data
- One fixture per CDA section type, plus combined documents
- Snapshot tests for mapping stability
- Error case fixtures: malformed XML, missing sections, unexpected encodings
- No network access in tests (pure library)

## References

- HL7 CDA R2 standard: Clinical Document Architecture Release 2
- CDA template OIDs reference: used to identify section types within a document
- Medent MAPI response format: `docs/mapi.pdf` (base64-encoded CDA in `<patient_data>` element)
- npm packages considered: `fast-xml-parser` (primary), `cda-schematron` (validation reference)
