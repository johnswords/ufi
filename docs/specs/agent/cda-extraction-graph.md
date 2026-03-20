# Feature: CDA Extraction LangGraph Pipeline

## Metadata

| Field | Value |
|-------|-------|
| Status | Draft |
| Implementation | Not Started |
| Feature Flag | -- |
| Last Verified | -- |
| Depends On | `docs/specs/cda-parser/cda-r2-section-mapping.md`, `docs/specs/agent/mapi-client.md`, `docs/specs/payer-rules/cms-coverage-sync.md` |
| Truth Mode | target |

## Context

This is the core intelligence pipeline: a LangGraph state machine that orchestrates the full flow from CDA document to approval prediction. It chains together MAPI data retrieval, CDA parsing, LLM-based criteria extraction, payer rule matching, and prediction output.

Sprint 2 feature. Depends on the foundations built in Sprint 1 (MAPI client, CDA parser, payer rules).

## Goal

A LangGraph graph that takes a (CPT code + clinical text + carrier) input and produces a `PredictionResult` with verdict, confidence, reasoning, and specific missing documentation items.

The pipeline must support two input modes:
1. **MAPI mode** (on-prem agent): retrieves patient data via MAPI, parses CDA, extracts text
2. **Direct text mode** (web demo): accepts pasted physician notes directly, skips MAPI/CDA

The core pipeline (extract → match → predict → gaps) is shared between both modes. Only the input adapter differs.

## Non-goals

- Replacing human clinical review (this is decision support, not autonomous authorization)
- FHIR PAS output format (future feature for CMS-0057-F compliance)
- Multi-procedure batch analysis (single procedure per graph invocation initially)

## PHI Boundary Impact

**High.** The graph processes PHI throughout its internal nodes. PHI containment:
- All PHI stays within the LangGraph state (in-memory, on-prem)
- The only exit point for data is through the PHI gate (TC-4)
- LangGraph checkpoints (if persisted) must be stored locally, never in cloud storage

## Affected Surfaces

- `agent` (primary)
- `web-demo` (consumer of shared core pipeline functions)
- `cda-parser` (consumed for CDA parsing in MAPI mode)
- `payer-rules` (consumed for rule matching)
- `shared` (StructuredCriteria, PredictionResult types)

## Design

### Graph Shape

The graph has swappable input adapters feeding a shared core pipeline:

```
INPUT ADAPTERS (one or the other):

  MAPI mode:                          Direct text mode:
  [CPT + patient context]             [CPT + noteText + carrier]
           |                                    |
           v                                    |
   retrievePatientData (MAPI)                   |
           |                                    |
           v                                    |
     parseCdaDocument (@ufi/cda-parser)         |
           |                                    |
           v                                    v
      clinicalText  ◄──────────────────── clinicalText

SHARED CORE PIPELINE:

   extractCriteria      -- LLM (Ollama or cloud), returns StructuredCriteria
         |
         v
   matchPayerRules      -- query payer rules DB by CPT + carrier
         |
         v
   predictOutcome       -- compare criteria vs rules, produce verdict
         |
         v
   identifyGaps         -- list missing/insufficient documentation
         |
    ┌────┴────┐
    v         v
  [done]   [humanReview]  -- conditional: if confidence < threshold
              |
              v
           [done]          -- after human provides additional input
```

### Shared Core Functions

These must be importable independently of the LangGraph state machine:

```typescript
// packages/agent/src/pipeline/core.ts
export function extractCriteria(noteText: string, llm: BaseChatModel): Promise<StructuredCriteria>;
export function matchPayerRules(cptCode: string, carrier: string, db: PayerRulesDB): Promise<PayerRule[]>;
export function predictOutcome(criteria: StructuredCriteria, rules: PayerRule[]): PredictionResult;
export function identifyGaps(criteria: StructuredCriteria, rules: PayerRule[]): MissingCriteriaItem[];
```

The on-prem agent wraps these in LangGraph with MAPI + CDA adapters. The web demo calls them directly.

### LangGraph State

```typescript
interface ApprovalGraphState {
  // Input (one of two modes)
  cptCode: string;
  carrier: string;
  inputMode: 'mapi' | 'direct';

  // MAPI mode input
  patientContext?: { pocId: string; token: string };

  // Direct mode input
  noteText?: string;

  // Pipeline outputs (accumulated through nodes)
  clinicalText?: string;           // normalized text from either input path
  cdaPayload?: string;             // MAPI mode only
  cdaDocument?: CdaDocument;       // MAPI mode only
  extractedCriteria?: StructuredCriteria;
  matchedRules?: PayerRule[];
  prediction?: PredictionResult;
  gaps?: MissingCriteriaItem[];

  // Control
  confidenceThreshold: number;
  requiresHumanReview: boolean;
}
```

## Open Questions

1. What confidence threshold should trigger human-in-the-loop review?
2. Should the graph support mid-pipeline amendment (e.g., staff adds a missing document mid-flow)?
3. What Ollama model and parameters produce the best criteria extraction for medical text?
4. Should we implement retry/fallback if Ollama extraction fails or returns low-confidence results?

## Acceptance Criteria

- [ ] Graph executes full pipeline from CPT input to PredictionResult
- [ ] Human-in-the-loop interrupt triggers when confidence below threshold
- [ ] Each node is independently testable with fixture inputs
- [ ] Graph state is fully typed (TypeScript compilation catches state mismatches)
- [ ] No PHI leaves the graph state without passing through PHI gate

## Validation

- [ ] End-to-end test with recorded MAPI + Ollama fixtures
- [ ] Node-level unit tests with synthetic inputs
- [ ] Human-in-the-loop interrupt and resume test
- [ ] Confidence threshold routing test

## Risks / Rollback

- **Risk:** LLM extraction quality varies by note style and model. Mitigation: fixture-based testing, confidence scoring, human review fallback.
- **Risk:** LangGraph state machine complexity. Mitigation: start with linear pipeline, add conditional routing incrementally.
- **Rollback:** Individual nodes can be replaced without changing the graph topology.
