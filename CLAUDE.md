# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: UFI MedEnt

Predictive surgical approval intelligence. Takes a CPT code, analyzes physician documentation patterns, and cross-references payer rules/contracts to predict whether a procedure will be approved, denied, or needs additional documentation before submission.

## Critical Architectural Constraint: PHI Isolation

The entire architecture is designed so that **no PHI ever leaves the practice's premises**, minimizing or eliminating HIPAA obligations on our company.

- **On-premise local LLM** reads physician notes at the practice site
- The LLM extracts only **structured, de-identified clinical criteria** (CPT code, ICD codes, "6 weeks PT failed," "BMI 34," payer plan type)
- Only those **anonymized outputs** optionally sync to our cloud platform for analytics, model improvement, or payer rules updates
- Raw notes and PHI **never transit the network**

Any code that touches the boundary between on-premise and cloud must enforce this separation. When in doubt, keep data local.

## Medent EHR Integration

The practice-side component integrates with Medent EHR (v23.0+) via their patient portal API. Reference docs: `docs/mapi.pdf`.

Key integration points:
- **Auth flow**: Registration ID → POC ID acquisition → Patient credentials → Patient token → Data queries
- **API base**: `https://www.medentmobile.com/mapi/services/`
- **Response format**: XML wrapper with base64-encoded HL7 CDA R2 payloads
- **Relevant data queries**: `patient_procedures`, `patient_clinical_notes`, `patient_problems`, `patient_insurance_providers`, `patient_medications`, `patient_assessment_plan`
- **Token lifetime**: Set by the POC office; expires with status code 427 (EXPIRED) or 432 (TOKEN_EXPIRED)

## Tech Stack

- TypeScript monorepo (pnpm workspaces + turborepo)
- LangGraph JS/TS (`@langchain/langgraph`) for agent orchestration
- Ollama for local LLM inference (quantized 7B-14B models, CPU-only, 16GB RAM budget)
- `fast-xml-parser` for CDA R2 XML parsing
- Hono or Fastify for cloud API
- Drizzle ORM + Postgres for payer rules and analytics storage
- Vitest for testing

## Data Flow (Target Architecture)

Two input paths feed a shared prediction pipeline:

```
ON-PREM PATH:
Medent EHR ──(MAPI)──► On-Prem Agent ──(local LLM)──► Structured Criteria
                              │                              │
                              │ (PHI stays here)             │ (de-identified only)
                              ▼                              ▼
                        Local Prediction          Optional Cloud Sync

WEB DEMO PATH (no EHR required):
Pasted Notes ──► Demo API ──(LLM)──► Structured Criteria ──► Prediction
  + CPT code                              (ephemeral,
  + Carrier                                not stored)
```

The core pipeline (extract → match → predict → gaps) is shared. Only the input adapter differs.

## Spec Hierarchy

Read the relevant surface spec before implementing changes to that surface.

```
docs/SPEC.md                              # Repo-wide contracts and invariants
docs/specs/agent/SPEC.md                  # On-prem agent (owns PHI)
docs/specs/cda-parser/SPEC.md             # CDA R2 parser library
docs/specs/cloud-api/SPEC.md              # Cloud analytics API (no PHI)
docs/specs/payer-rules/SPEC.md            # Payer rules ingestion pipeline
docs/specs/web-demo/SPEC.md              # Paste-in web demo (no EHR required)
docs/specs/cross-cutting/SPEC.md         # Multi-surface specs (test data, etc.)
docs/specs/<surface>/<feature>.md         # Feature-level specs
```

Feature specs are required before implementing work that introduces a new public interface, changes a contract between surfaces, or touches the PHI boundary.

## Monorepo Packages

| Package | Type | Description |
|---------|------|-------------|
| `packages/agent` | On-prem service | LangGraph agent: EHR data, local LLM, predictions |
| `packages/cda-parser` | Library | CDA R2 XML parsing, typed domain objects |
| `packages/cloud-api` | Cloud service | De-identified criteria ingest, payer rules API |
| `packages/payer-rules` | Pipeline | CMS and commercial payer rule ingestion |
| `packages/web-demo` | Web app | Paste-in demo: notes + CPT/carrier → prediction |
| `packages/shared` | Library | Shared types, schemas, PHI validation |

## Domain Concepts

- **CPT code**: Current Procedural Terminology — identifies the surgical procedure
- **ICD code**: Diagnosis codes that justify medical necessity
- **Prior authorization (prior auth)**: Payer approval required before a procedure
- **Medical necessity criteria**: Clinical evidence a payer requires to approve (failed conservative treatment, severity thresholds, etc.)
- **POC**: Point of Care — a Medent-affiliated medical practice location
- **CDA R2**: HL7 Clinical Document Architecture Release 2 — the XML format Medent returns patient data in
