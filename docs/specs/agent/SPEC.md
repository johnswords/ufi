# Surface Spec: On-Prem Agent

## Purpose

The agent runs on-premise at the medical practice. It authenticates with Medent EHR via MAPI, retrieves patient clinical data, parses CDA R2 documents, runs a local LLM to extract structured clinical criteria, matches those criteria against cached payer rules, and produces an approval prediction.

This is the only component that handles PHI.

## Owned Surface

- MAPI client: authentication flow and data query execution
- CDA extraction pipeline: LangGraph state machine orchestrating note analysis
- Prediction engine: criteria matching against payer rules
- PHI de-identification gate: allowlist-based output boundary
- Local payer rules cache: synced from cloud or local Postgres

## Interfaces and Dependencies

### Inbound

- Practice staff triggers a prediction request (CPT code + patient identifier)
- Interface TBD: CLI, local web UI, or EHR-integrated trigger

### Internal

- `@ufi/cda-parser`: CDA R2 XML -> structured clinical data
- Ollama API (localhost:11434): clinical notes -> extracted criteria
- LangGraph state machine: orchestrates the multi-step analysis pipeline

### Outbound

- Prediction result: approve / deny / needs-additional-documentation (with reasoning and specific missing criteria)
- De-identified criteria sync (optional): structured criteria -> cloud API (passes through PHI gate before transmission)

### Dependencies

| Dependency | Type | Location |
|------------|------|----------|
| `@ufi/cda-parser` | workspace lib | `packages/cda-parser` |
| `@ufi/shared` | workspace lib | `packages/shared` |
| `@langchain/langgraph` | npm | LangGraph JS/TS |
| `@langchain/ollama` | npm | Ollama LangChain integration |
| `fast-xml-parser` | npm | XML parsing (MAPI response wrappers) |

## Current Contracts

### CC-1: MAPI Client

Encapsulates the full MAPI auth flow and data queries.

- Registration ID -> POC ID acquisition -> Patient credentials -> Patient token
- Token refresh on 427 (EXPIRED) / 432 (TOKEN_EXPIRED) status codes
- Returns parsed XML responses (not raw HTTP)
- Supported queries: `patient_procedures`, `patient_clinical_notes`, `patient_problems`, `patient_insurance_providers`, `patient_medications`, `patient_assessment_plan`

-- *Source: `docs/specs/agent/mapi-client.md`*

### CC-2: PHI De-identification Gate

- Input: any data object intended for cloud transmission
- Output: validated de-identified object, or rejection
- Enforces HIPAA Safe Harbor 18-identifier removal
- **Allowlist-based**: only explicitly permitted fields pass through (defaults to rejection)
- Runs a structural validator + content scanner (checks string values for patterns like SSN, phone, email, dates)

-- *Source: `docs/specs/agent/phi-gate.md`*

## Target Contracts

> These contracts are NOT yet active. Promote to Current Contracts after implementation lands.

### TC-2: Clinical Criteria Extraction

- Input: parsed CDA clinical data (from `@ufi/cda-parser`)
- Output: `StructuredCriteria` (defined in `@ufi/shared`)
  - CPT code, supporting ICD-10 codes, clinical evidence statements
  - e.g., "failed 6 weeks physical therapy", "BMI 34", "3 epidural injections"
- Backed by local Ollama LLM with structured output (JSON mode + Zod validation)
- Confidence score on each extracted criterion

-- *Source: `docs/specs/agent/cda-extraction-graph.md`*

### TC-3: Prediction Engine

- Input: `StructuredCriteria` + matched `PayerRule[]`
- Output: `PredictionResult` with verdict, confidence, reasoning, and `missingCriteria[]`
- Pure function (no side effects, no PHI) -- testable in isolation
- Verdicts: `approved` | `denied` | `needs-documentation`

-- *Source: `docs/specs/agent/cda-extraction-graph.md`*

### TC-5: Note Rewrite Suggestion

- Input: original physician note text + `PredictionResult` + matched `PayerRule[]`
- Output: rewritten note addressing missing criteria, with `[bracket]` placeholders for values the physician must supply
- Backed by local Ollama LLM (same model as extraction)
- Preserves all original clinical content; adds documentation for missing criteria
- Only invoked when verdict is `needs-documentation` or `denied`
- The rewrite is a suggestion, not a clinical document — the physician reviews and fills in placeholders before use

-- *Source: `docs/specs/agent/cda-extraction-graph.md`*

## When Feature Specs Are Required

- New MAPI data query integration
- Changes to the LangGraph state machine topology
- Any modification to the PHI gate allowlist
- New output channel (e.g., FHIR PAS output for CMS-0057-F compliance)
- Changes to the `StructuredCriteria` or `PredictionResult` types
- Adding support for a new EHR system beyond Medent

## Validation

- MAPI client: recorded HTTP fixtures (no live EHR in tests)
- CDA parsing: delegated to `cda-parser` surface tests
- LLM extraction: fixture-based (recorded Ollama responses for determinism)
- Prediction engine: unit tests with synthetic criteria + rules
- PHI gate: dedicated test suite with adversarial inputs containing each of the 18 identifier types
- Integration: end-to-end with all recorded fixtures

## References

- Medent API docs: `docs/mapi.pdf`
- LangGraph JS/TS: `@langchain/langgraph`
- Ollama structured outputs: JSON mode with Zod schema validation
