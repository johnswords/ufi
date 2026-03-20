# Surface Spec: Cross-Cutting

## Purpose

Houses specs for work that spans multiple surfaces and cannot honestly live under only one. This is not a deployable surface — it's an organizational home for cross-cutting contracts and feature specs.

## When to Use

Create a feature spec here when:
- The work affects 3+ surfaces and no single surface is the natural owner
- The work defines shared test infrastructure or data contracts
- The work establishes conventions that all surfaces must follow

Do NOT use this for work that primarily affects one surface with minor ripple effects — file that under the primary surface.

## Current Specs

- `test-data-matrix.md` — Structured test data generation for CPT + carrier + note combinations with expected outcomes
- `practice-data-request.md` — Formal data request to Medent practice: denial exports, MAPI XML samples, de-identified office notes
- `sprint-1-foundations.md` — Monorepo and package foundations spanning shared, agent, cda-parser, and payer-rules
