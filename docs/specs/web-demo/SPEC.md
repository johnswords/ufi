# Surface Spec: Web Demo

## Purpose

> **Status: Placeholder scaffold.** This package contains only workspace configuration. No UI or API implementation exists yet. The target contracts below define the planned demo surface.

A browser-based demonstration interface that allows users to paste physician notes, select a CPT code and insurance carrier, and receive an approval prediction — without any Medent EHR connection. This is the primary sales and evaluation tool: prospects can see the prediction engine in action with real (or sample) clinical notes before committing to a full on-prem deployment.

## Owned Surface

- Web UI: paste-in form, carrier/CPT selection, prediction results display
- Demo API: lightweight backend that runs the same LangGraph extraction and prediction pipeline as the on-prem agent, but accepts raw text instead of MAPI/CDA input
- Sample notes: bundled example physician notes for guided demos

## Interfaces and Dependencies

### Inbound

- Browser: user pastes physician note text, selects CPT code and insurance carrier
- No authentication required for demo (may add API key gating later)

### Internal

- Reuses the agent's core pipeline nodes: `extractCriteria`, `matchPayerRules`, `predictOutcome`, `identifyGaps`
- Skips MAPI and CDA parsing entirely — raw text goes directly to LLM extraction
- Queries payer rules from cloud Postgres (same as cloud-api surface)

### Outbound

- Prediction result rendered in browser
- No data persistence by default (demo sessions are ephemeral)
- Optional: save anonymized demo submissions for product analytics

### Dependencies

| Dependency | Type | Location |
|------------|------|----------|
| `@ufi/shared` | workspace lib | `packages/shared` (types, schemas) |
| `@langchain/langgraph` | npm | LangGraph JS/TS |
| `@langchain/ollama` or cloud LLM | npm | LLM for criteria extraction |
| `hono` or `fastify` | npm | Demo API backend |

## Current Contracts

None -- greenfield.

## Target Contracts

> These contracts are NOT yet active. Promote to Current Contracts after implementation lands.

### TC-1: Paste-In Prediction API

- `POST /demo/predict`
- Input: `{ noteText: string, cptCode: string, carrierType: string }`
- Output: `PredictionResult` (same type as on-prem agent produces)
- Runs the shared extraction + prediction pipeline with raw text input
- No MAPI, no CDA parsing, no patient auth

-- *Source: `docs/specs/web-demo/paste-in-demo.md`*

### TC-2: Carrier Selection

- Serves list of supported insurance carriers from payer rules DB
- `GET /demo/carriers` returns `{ carriers: CarrierOption[] }`
- Each carrier maps to the payer rules available for prediction matching

-- *Source: `docs/specs/web-demo/paste-in-demo.md`*

### TC-3: Sample Notes

- Bundled example physician notes covering common surgical prior auth scenarios
- Available via `GET /demo/samples` for guided demos
- Notes are fully synthetic (no real patient data)

-- *Source: `docs/specs/web-demo/paste-in-demo.md`*

## PHI Considerations

The web demo has a different PHI posture than the on-prem agent:

- **Demo users may paste real patient notes into the browser.** The demo must make this risk visible.
- If the demo runs against a cloud-hosted LLM (not local Ollama), pasted notes transit the network to the LLM provider. This must be disclosed prominently in the UI.
- If the demo runs with local Ollama (same machine or local network), the PHI posture matches the on-prem agent.
- **The demo API must not persist pasted note text.** Process in memory, return result, discard input.
- A prominent disclaimer in the UI should state: "Do not paste real patient notes unless this demo is running on your local network."

## LLM Backend Options

The demo must support two modes, selectable by deployment configuration:

| Mode | LLM Backend | PHI Safety | Use Case |
|------|-------------|------------|----------|
| Local | Ollama (localhost) | Safe — notes stay local | On-site demos, self-evaluation |
| Cloud | Cloud LLM API (Anthropic, OpenAI) | Unsafe for real PHI — must disclose | Public demo site, trade shows |

The extraction pipeline is identical in both modes; only the LLM transport differs.

## When Feature Specs Are Required

- New demo UI features (e.g., comparison view, batch upload)
- Changes to the demo API endpoints
- Adding persistence or analytics for demo sessions
- Changing the LLM backend configuration
- Adding authentication or access control

## Validation

- API tests: synthetic note text -> prediction result (recorded LLM fixtures)
- UI tests: paste note, select carrier/CPT, verify result renders
- PHI disclaimer: verify disclaimer is visible before note input
- No persistence: verify pasted text is not logged, stored, or cached
- Carrier list: verify carriers match payer rules DB content

## References

- Shared pipeline nodes: `docs/specs/agent/cda-extraction-graph.md` (extractCriteria, matchPayerRules, predictOutcome, identifyGaps)
- Payer rules: `docs/specs/payer-rules/SPEC.md`
- StructuredCriteria / PredictionResult types: `packages/shared`
