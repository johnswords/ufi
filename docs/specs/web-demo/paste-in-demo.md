# Feature: Paste-In Web Demo

## Metadata

| Field | Value |
|-------|-------|
| Status | Draft |
| Implementation | Not Started |
| Feature Flag | -- |
| Last Verified | -- |
| Depends On | `docs/specs/payer-rules/cms-coverage-sync.md`, `docs/specs/agent/cda-extraction-graph.md` (shared pipeline nodes) |
| Truth Mode | target |

## Context

To sell the product, prospects need to see it work without deploying an on-prem agent or connecting to Medent. A web demo where they paste physician notes, pick a CPT code and insurance carrier, and get an instant approval prediction is the fastest path to demonstrating value.

This also serves as the development testbed — it's much faster to iterate on extraction quality by pasting notes than by round-tripping through MAPI.

## Goal

A web application with:
1. A text area to paste physician/clinical notes
2. A CPT code selector (searchable, with common surgical procedures pre-populated)
3. An insurance carrier dropdown (populated from payer rules DB)
4. A "Predict" button that runs the extraction + prediction pipeline
5. A results panel showing: verdict, confidence, matched criteria, missing documentation, and reasoning

## Non-goals

- Medent/EHR integration (that's the agent surface)
- CDA R2 parsing (demo accepts raw text, not CDA XML)
- User accounts or session persistence
- Storing or logging pasted clinical notes

## PHI Boundary Impact

**Medium — depends on deployment mode.**

- If deployed with local Ollama: no PHI leaves the network. Safe.
- If deployed with cloud LLM: pasted notes transit to LLM provider. **Must disclose in UI.**
- The demo API must not persist, log, or cache the pasted note text under either mode.
- The results (`PredictionResult`) are de-identified by nature (structured criteria, no patient identifiers).

The UI must display a prominent disclaimer before the text input:
> "This demo processes text locally / via [provider]. Do not paste real patient information unless running on your local network."

The disclaimer text adapts based on the configured LLM backend.

## Affected Surfaces

- `web-demo` (primary)
- `agent` (shares pipeline nodes — extractCriteria, matchPayerRules, predictOutcome, identifyGaps)
- `payer-rules` (carrier list and rule data)
- `shared` (StructuredCriteria, PredictionResult, CarrierOption types)

## Existing Primitives

The core pipeline nodes from the agent's LangGraph graph should be reusable:

- `extractCriteria` — LLM-based extraction from text to StructuredCriteria
- `matchPayerRules` — query payer rules by CPT + carrier
- `predictOutcome` — compare criteria vs rules
- `identifyGaps` — list missing documentation

These nodes operate on `StructuredCriteria` and `PayerRule[]`, not on CDA documents or MAPI responses. The demo simply feeds them differently: raw text instead of parsed CDA.

> **Implication for agent architecture:** The extraction graph must be designed so that the first two nodes (retrievePatientData + parseCdaDocument) are swappable input adapters, not hardwired. The core pipeline (extract → match → predict → gaps) is shared.

## Constraints

- Demo API must be stateless (no session storage, no note persistence)
- Must support both local Ollama and cloud LLM backends via config
- CPT code list should be pre-populated with common surgical procedures but allow free-text entry
- Carrier list sourced from payer rules DB (only show carriers we have rules for)
- Prediction latency should be reasonable for a demo (under 15 seconds with cloud LLM, under 30 with local Ollama)

## Design

### Architecture

```
Browser (React/Next.js)
    |
    v
Demo API (Hono/Fastify)
    |
    ├── POST /demo/predict  { noteText, cptCode, carrier }
    │     └── extractCriteria(noteText) → matchPayerRules(cpt, carrier) → predict → gaps → suggestRewrite
    │     └── returns PredictionResult + suggestedRewrite
    │
    ├── POST /demo/rewrite  { noteText, prediction, rules }
    │     └── suggestRewrite(noteText, prediction, rules)
    │     └── returns { rewrittenNote: string }
    │
    ├── GET /demo/carriers
    │     └── query payer-rules DB for distinct carriers
    │
    ├── GET /demo/samples
    │     └── return bundled synthetic physician notes
    │
    └── GET /demo/cpt-codes
          └── return searchable CPT code list (common surgical procedures)
```

### Shared Pipeline Extraction

The agent's LangGraph graph should be factored so that the core nodes are importable:

```typescript
// packages/agent/src/pipeline/core.ts (shared)
export function extractCriteria(noteText: string, llm: BaseChatModel): Promise<StructuredCriteria>;
export function matchPayerRules(cptCode: string, carrier: string, db: PayerRulesDB): Promise<PayerRule[]>;
export function predictOutcome(criteria: StructuredCriteria, rules: PayerRule[]): PredictionResult;
export function identifyGaps(criteria: StructuredCriteria, rules: PayerRule[]): MissingCriteriaItem[];
```

The on-prem agent wraps these in a LangGraph state machine with MAPI + CDA input adapters. The demo calls them directly with raw text.

### UI Components

- **NoteInput**: large textarea with character count, paste-friendly, PHI disclaimer above
- **ProcedureSelector**: CPT code search/select with description display
- **CarrierSelector**: dropdown populated from `/demo/carriers`
- **SampleSelector**: optional — load a bundled example note
- **ResultsPanel**: verdict badge (approve/deny/needs-docs), confidence meter, criteria checklist (matched/missing), reasoning narrative
- **RewritePanel**: suggested rewrite of physician note addressing missing criteria, with copy-to-clipboard button. Uses `[brackets]` for values the physician must fill in. Only shown when verdict is `needs-documentation` or `denied`.

### Sample Notes

Bundle 3-5 synthetic physician notes covering:
1. Total knee replacement (CPT 27447) — should approve with proper documentation
2. Lumbar spinal fusion (CPT 22612) — should flag missing conservative treatment documentation
3. Bariatric surgery (CPT 43775) — should check BMI threshold and comorbidities
4. Rotator cuff repair (CPT 23412) — should verify failed PT documentation
5. Carpal tunnel release (CPT 64721) — straightforward approval case

## Acceptance Criteria

- [ ] Paste text, select CPT + carrier, click Predict → see PredictionResult
- [ ] Carrier dropdown populated from payer rules DB (not hardcoded)
- [ ] Sample notes loadable with one click
- [ ] PHI disclaimer visible and accurate for configured LLM backend
- [ ] Pasted note text is NOT persisted, logged, or cached by the API
- [ ] Works with both local Ollama and cloud LLM backend
- [ ] Results show: verdict, confidence, matched criteria, missing items, reasoning
- [ ] When verdict is `needs-documentation` or `denied`, a suggested rewrite is generated
- [ ] Suggested rewrite preserves all original clinical content
- [ ] Suggested rewrite adds sections addressing each missing criterion with `[bracket]` placeholders for values the physician must fill in
- [ ] Copy-to-clipboard button copies the suggested rewrite text

## Validation

- [ ] API test: POST synthetic note → valid PredictionResult returned
- [ ] API test: verify note text not present in any logs or storage after request
- [ ] UI test: full flow from paste to results render
- [ ] Carrier list test: matches payer rules DB content
- [ ] Sample notes test: each sample produces a reasonable prediction
- [ ] LLM backend switch test: same note produces structurally valid results on both Ollama and cloud LLM
- [ ] Disclaimer test: correct text shown for each LLM mode

## Risks / Rollback

- **Risk:** Users paste real PHI into cloud-hosted demo. Mitigation: prominent disclaimer, option to run locally, no persistence.
- **Risk:** Extraction quality with raw text vs. structured CDA differs. Mitigation: this is actually the easier case — LLMs handle free text well. Structured CDA may need more preprocessing.
- **Risk:** Demo latency with local Ollama on CPU. Mitigation: set expectations in UI ("Processing locally, this may take 20-30 seconds").
- **Rollback:** Demo is fully independent — can be disabled or removed without affecting agent or cloud-api surfaces.

## Open Questions

1. Should the demo be a separate deployable (`packages/web-demo`) or part of `packages/cloud-api`?
2. What frontend framework? React with Vite is simple. Next.js adds SSR but may be overkill for a demo.
3. Should we offer a hosted public demo, or only ship it as a local-run tool for prospects?
4. Should the demo support uploading a PDF/image of physician notes (OCR) in addition to paste?
