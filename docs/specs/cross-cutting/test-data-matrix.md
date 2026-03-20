# Feature: Test Data Matrix — CPT/Carrier/Note Scenarios with Expected Outcomes

## Metadata

| Field | Value |
|-------|-------|
| Status | Draft |
| Implementation | Not Started |
| Feature Flag | -- |
| Last Verified | -- |
| Depends On | `docs/specs/payer-rules/cms-coverage-sync.md` (need real payer rules to define expected outcomes) |
| Truth Mode | target |

## Context

The system's core value proposition is predicting whether a procedure will be approved, denied, or need additional documentation. To validate this, we need structured test scenarios where the **expected outcome is known** — a matrix of (CPT code + insurance carrier + physician note) combinations with labeled verdicts and the specific criteria that drive each verdict.

Without this, we're testing that the pipeline runs without errors, but not that it produces correct predictions. This is the difference between "it works" and "it's right."

This test data serves triple duty:
1. **Validation**: ground-truth for extraction accuracy and prediction correctness
2. **Web demo samples**: the bundled sample notes come from this matrix
3. **Regression**: as we improve the LLM extraction or prediction logic, these scenarios catch regressions

## Goal

A structured test data package (`packages/shared/test-data/` or `packages/test-fixtures/`) containing:
1. Synthetic physician notes with known clinical content
2. Payer rule snapshots with known criteria
3. Expected extraction results (what the LLM should extract from each note)
4. Expected prediction outcomes (approve/deny/needs-docs for each note+rule combination)

## Non-goals

- Real patient data (all notes are synthetic)
- Comprehensive coverage of all CPT codes (start with high-volume surgical prior auth procedures)
- Replacing payer rules DB (these are frozen snapshots for deterministic testing)

## PHI Boundary Impact

None. All test data is synthetic. No real patient information.

## Affected Surfaces

- `shared` (test data types and fixtures live here)
- `agent` (consumes fixtures for extraction and prediction tests)
- `web-demo` (consumes fixtures as sample notes)
- `payer-rules` (provides the rule structure that fixtures snapshot)
- `cda-parser` (consumes CDA-formatted versions of test notes)

## Design

### Test Scenario Structure

Each scenario is a self-contained test case:

```typescript
interface TestScenario {
  id: string;                          // e.g., "tkr-medicare-approve-01"
  description: string;                 // human-readable scenario description

  // Input
  cptCode: string;                     // e.g., "27447"
  cptDescription: string;              // e.g., "Total Knee Replacement"
  carrier: CarrierFixture;             // payer identity + plan type
  physicianNote: string;               // synthetic free-text clinical note

  // Expected extraction (what the LLM should pull from the note)
  expectedCriteria: ExpectedCriteriaItem[];

  // Expected prediction (given the extracted criteria + carrier rules)
  expectedVerdict: 'approved' | 'denied' | 'needs-documentation';
  expectedConfidenceRange: [number, number];  // e.g., [0.7, 1.0]
  expectedMissingCriteria?: string[];         // specific items the note lacks

  // Reasoning
  verdictRationale: string;            // why this verdict is correct
  carrierRuleReference: string;        // which rule drives the decision

  // Tags for filtering
  tags: ScenarioTag[];
}

type ScenarioTag =
  | 'orthopedic'
  | 'spinal'
  | 'bariatric'
  | 'nerve'
  | 'should-approve'
  | 'should-deny'
  | 'should-need-docs'
  | 'edge-case'
  | 'demo-ready';                      // suitable as a web demo sample

interface CarrierFixture {
  name: string;                        // e.g., "Medicare Part B"
  type: string;                        // e.g., "medicare" | "commercial_ppo" | "commercial_hmo"
  rules: PayerRule[];                  // frozen snapshot of applicable rules
}

interface ExpectedCriteriaItem {
  type: string;
  description: string;
  shouldExtract: boolean;              // true = note contains this; false = note is missing this
  extractionDifficulty: 'easy' | 'medium' | 'hard';  // for measuring LLM capability
}
```

### Target CPT Families (Sprint 1 scope)

Focus on high-volume surgical prior auth procedures where denial rates are significant:

| CPT | Procedure | Why Include |
|-----|-----------|-------------|
| 27447 | Total knee replacement (TKR) | High volume, well-documented criteria, common prior auth |
| 22612 | Lumbar spinal fusion | Complex criteria (failed conservative tx, imaging requirements) |
| 43775 | Laparoscopic sleeve gastrectomy | BMI thresholds, comorbidity requirements, supervised program |
| 23412 | Rotator cuff repair | Failed PT documentation, imaging confirmation |
| 64721 | Carpal tunnel release | EMG/NCS requirements, conservative treatment failure |
| 29881 | Knee arthroscopy/meniscectomy | Step therapy requirements, imaging |

### Scenario Matrix Per CPT

For each CPT code, create scenarios across these dimensions:

**By verdict (minimum 3 per CPT):**
- **Approve**: note contains all required criteria for the carrier
- **Deny**: note is missing a critical requirement (e.g., BMI below threshold)
- **Needs documentation**: note is ambiguous or missing non-critical supporting evidence

**By carrier (minimum 2 per CPT):**
- Medicare (baseline — criteria from CMS LCD/NCD)
- One commercial carrier (criteria may differ from Medicare)

**By note quality (minimum 2 per CPT):**
- **Clean note**: well-structured, criteria clearly stated
- **Messy note**: criteria buried in narrative, abbreviations, implicit references

**By edge case (1+ per CPT):**
- Borderline values (BMI exactly at threshold)
- Contradictory information in the note
- Missing dates/durations (conservative treatment mentioned but duration unclear)

### Minimum Matrix Size

6 CPT codes x 3 verdicts x 2 carriers x 2 note qualities = **72 scenarios minimum**

Plus ~12 edge cases = **~84 total scenarios** for Sprint 1.

This is the quality bar: if the system can correctly predict 80%+ of these labeled scenarios, it's demo-ready.

### Physician Note Generation

Notes must be medically realistic but fully synthetic. Structure:

```
[Header: visit type, date format but no real date]

Chief Complaint: [procedure-relevant complaint]

History of Present Illness: [clinical narrative with embedded criteria]
- Duration of symptoms
- Failed treatments (with specifics: type, duration, outcome)
- Functional limitations
- Relevant measurements (BMI, range of motion, pain scores)

Past Medical History: [comorbidities relevant to payer criteria]

Assessment & Plan: [procedure recommendation with clinical justification]
```

**Generation approach:**
1. Define the criteria template for each CPT+carrier combination from the payer rules
2. Write a "passing" note that includes all criteria
3. Derive "failing" and "needs-docs" variants by removing or obscuring specific criteria
4. Add messy variants with abbreviations, different note structures, implicit references

This can be partially LLM-assisted (generate note variants from a criteria template) but must be human-reviewed for medical plausibility.

### Carrier Rule Fixtures

Each carrier fixture snapshots the payer rules that apply to the scenario's CPT code. These are frozen copies — not live DB queries — so tests are deterministic regardless of payer rules DB state.

```typescript
// Example: Medicare rules for CPT 27447 (TKR)
const medicareTkrRules: PayerRule[] = [
  {
    cptCodes: ['27447'],
    payer: 'medicare',
    criteria: [
      { type: 'diagnosis_required', icd10Codes: ['M17.11', 'M17.12', 'M17.0'] },
      { type: 'failed_treatment', treatment: 'conservative management', duration_weeks: 12 },
      { type: 'documentation_required', description: 'Radiographic evidence of joint degeneration' },
      { type: 'documentation_required', description: 'Functional limitation assessment' },
      { type: 'failed_treatment', treatment: 'physical therapy', duration_weeks: 6 },
      { type: 'threshold', measure: 'pain_score', operator: '>=', value: 7, unit: 'VAS' },
    ],
    effectiveDate: '2025-01-01',
    sourceType: 'cms_lcd',
    sourceUrl: 'https://www.cms.gov/medicare-coverage-database/...',
  }
];
```

### File Organization

```
packages/shared/
└── test-data/
    ├── index.ts                        # exports all scenarios, helpers
    ├── types.ts                        # TestScenario, CarrierFixture types
    ├── scenarios/
    │   ├── tkr-27447/                  # Total knee replacement
    │   │   ├── notes/                  # Physician note text files
    │   │   │   ├── medicare-approve-clean.txt
    │   │   │   ├── medicare-approve-messy.txt
    │   │   │   ├── medicare-deny-bmi.txt
    │   │   │   ├── medicare-needs-docs-pt.txt
    │   │   │   ├── aetna-approve-clean.txt
    │   │   │   └── aetna-deny-conservative.txt
    │   │   ├── rules/                  # Frozen carrier rule snapshots
    │   │   │   ├── medicare.ts
    │   │   │   └── aetna-ppo.ts
    │   │   └── scenarios.ts            # TestScenario[] for this CPT
    │   ├── spinal-fusion-22612/
    │   ├── bariatric-43775/
    │   ├── rotator-cuff-23412/
    │   ├── carpal-tunnel-64721/
    │   └── knee-arthroscopy-29881/
    └── helpers/
        ├── load-scenario.ts            # Load by ID, tag, CPT, or carrier
        ├── validate-prediction.ts      # Compare PredictionResult to expected
        └── generate-cda-fixture.ts     # Wrap test notes in CDA R2 XML format
```

### CDA Fixture Generation

For agent-side testing (MAPI mode), the same physician notes need to be wrapped in CDA R2 XML format. A helper function takes a test note and produces a valid CDA document:

```typescript
// Takes a TestScenario and wraps its note in CDA R2 XML with synthetic patient headers
function generateCdaFixture(scenario: TestScenario): string;
```

This reuses the same notes but lets us test the full MAPI → CDA → extraction pipeline.

## Acceptance Criteria

- [ ] At least 12 scenarios per CPT code (3 verdicts x 2 carriers x 2 note styles)
- [ ] At least 6 CPT code families covered
- [ ] Every scenario has labeled expected extraction (what criteria should be found)
- [ ] Every scenario has labeled expected verdict with rationale
- [ ] Carrier rule fixtures are frozen snapshots (deterministic)
- [ ] Notes are medically plausible (reviewed for realism)
- [ ] Edge cases cover borderline values, ambiguous notes, contradictory information
- [ ] Scenarios tagged for filtering (by CPT, verdict, carrier, demo-readiness)
- [ ] CDA fixture generator wraps notes in valid CDA R2 XML
- [ ] `loadScenario()` helper supports filtering by any tag/dimension
- [ ] `validatePrediction()` helper compares PredictionResult against expected with tolerance

## Validation

- [ ] All scenarios loadable via helpers without errors
- [ ] Schema validation: every TestScenario passes Zod validation
- [ ] Note realism: manual review of physician note content for medical plausibility
- [ ] Rule accuracy: carrier rule fixtures cross-referenced against actual CMS LCD/NCD text (or commercial policy)
- [ ] CDA fixtures: generated CDA documents parse correctly through `@ufi/cda-parser`
- [ ] Prediction validation helper correctly identifies pass/fail against expected outcomes

## How This Data Gets Used

| Consumer | What It Uses | How |
|----------|-------------|-----|
| Prediction engine tests | Scenarios + rules → expected verdict | Unit tests: `predictOutcome(criteria, rules)` matches `expectedVerdict` |
| LLM extraction tests | Notes → expected criteria | Compare `extractCriteria(note)` output against `expectedCriteria` |
| End-to-end pipeline tests | Full scenarios | Run entire graph, compare `PredictionResult` to expected |
| Web demo samples | `demo-ready` tagged scenarios | Serve via `GET /demo/samples` |
| CDA parser tests | CDA-wrapped notes | Verify round-trip: note → CDA XML → parse → text matches original |
| Regression suite | All scenarios | Run on every PR, flag accuracy degradation |

## Risks / Rollback

- **Risk:** Medical inaccuracy in synthetic notes. Mitigation: have notes reviewed by someone with clinical knowledge (or generate from real payer criteria templates and verify plausibility). Start with well-documented procedures (TKR, bariatric) where criteria are publicly available.
- **Risk:** Carrier rules differ from actual payer policies. Mitigation: Phase 1 uses CMS Medicare rules (publicly documented). Commercial carrier rules are approximations until we ingest real policies.
- **Risk:** Test matrix becomes stale as payer rules evolve. Mitigation: fixtures are frozen snapshots. They test that "given these rules, this note should produce this verdict." Rules evolution is tested separately in the payer-rules surface.
- **Risk:** LLM extraction never hits 100% on the matrix. **This is expected.** The matrix measures accuracy and tracks improvement. 80%+ on labeled scenarios is the demo-ready threshold; 100% is not the goal.

## Open Questions

1. Should we use an LLM to generate the initial batch of physician notes from criteria templates, then manually review? This would be much faster than writing 84 notes by hand.
2. Do we need a clinical advisor to review the notes and rules for medical accuracy, or can we bootstrap from public CMS LCD text?
3. Should the test matrix live in `packages/shared/test-data/` or in a dedicated `packages/test-fixtures/` package?
4. What's the right accuracy threshold for "demo-ready"? 80% correct verdicts? 90%? Should extraction accuracy and prediction accuracy be measured separately?
5. Should we version the test matrix so we can track accuracy improvement over time?
