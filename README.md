# UFI

Predictive surgical approval intelligence. Paste a physician note, select a CPT code and insurance carrier, and get an instant prediction of whether the procedure will be approved, denied, or needs additional documentation — with specific reasoning, missing criteria, and a suggested rewrite.

## How It Works

```
Physician Note ──► Local LLM ──► Structured Criteria ──► Payer Rule Matching ──► Prediction
                   (Ollama)       (ICD codes, failed       (Aetna, Cigna,        (approved / denied /
                                   treatments, BMI,         UHC, Medicare)         needs-documentation)
                                   pain scores, etc.)
```

The LLM extracts clinical criteria from free-text physician notes, then a deterministic prediction engine compares those criteria against real payer coverage rules to produce a verdict with confidence score, matched/missing criteria breakdown, and a suggested note rewrite addressing documentation gaps.

## Quick Start

```bash
# Prerequisites: Node.js 22+, pnpm, Ollama
./scripts/setup.sh          # install deps, check Ollama model
./scripts/start.sh          # start web demo on http://localhost:3000
./scripts/stop.sh           # stop the demo
```

Or with pnpm:

```bash
pnpm setup                  # same as ./scripts/setup.sh
pnpm start                  # same as ./scripts/start.sh
pnpm stop                   # same as ./scripts/stop.sh
```

Open **http://localhost:3000**, load a sample note, and click Predict.

## Prerequisites

| Dependency | Version | Purpose |
|------------|---------|---------|
| [Node.js](https://nodejs.org) | 22+ | Runtime |
| [pnpm](https://pnpm.io) | 10+ | Package manager |
| [Ollama](https://ollama.com) | Latest | Local LLM inference |

The default model is `glm-4.7-flash` (19GB). Set `OLLAMA_MODEL` in `.env` to use a different model.

## Configuration

Copy `.env.example` to `.env` and adjust:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Web demo server port |
| `OLLAMA_MODEL` | `glm-4.7-flash:latest` | Ollama model for extraction |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |

## Architecture

PHI never leaves the building. The local LLM reads physician notes on-premise and extracts only structured, de-identified clinical criteria. No patient data transits the network.

```
packages/
├── agent/          # Extraction pipeline, prediction engine, PHI gate
├── cda-parser/     # HL7 CDA R2 XML parsing (Medent EHR integration)
├── cloud-api/      # Optional cloud analytics (de-identified data only)
├── payer-rules/    # CMS Medicare sync + commercial payer rule seeds
├── shared/         # Domain types, Zod schemas, PHI validation
└── web-demo/       # Paste-in demo: Hono server + single-page UI
```

### Payer Data

| Source | Rules | Method |
|--------|-------|--------|
| CMS Medicare | 7,589 | Live API sync from `api.coverage.cms.gov` |
| Aetna | 13 | Hand-curated from Clinical Policy Bulletins |
| Cigna/eviCore | 9 | Hand-curated from CMM guidelines |
| UnitedHealthcare | 9 | Hand-curated from published medical policies |

Plus 52 PA requirement records (which CPT codes need prior auth per carrier) and transparency metrics from CY2024 KFF Medicare Advantage data.

### Prediction Pipeline

1. **Extract** — LLM parses physician note into structured criteria (ICD codes, failed treatments, thresholds, functional limitations)
2. **Match** — Query payer rules by CPT code + carrier, CMS Medicare fallback
3. **Predict** — Pure function: compare criteria vs. rules, produce verdict with confidence adjusted by payer transparency metrics
4. **Gaps** — Identify missing documentation
5. **Rewrite** — LLM suggests an improved note addressing gaps (with `[bracket placeholders]` for values the physician fills in)

## Development

```bash
pnpm test                   # run all 138 tests
pnpm lint                   # biome check
pnpm lint:fix               # auto-fix lint issues
pnpm typecheck              # typescript strict mode
```

### Seed Payer Data

```bash
pnpm seed                   # commercial rules + CMS Medicare sync (~5 min)
pnpm seed:quick             # commercial rules only (skip CMS API, instant)
```

The web demo auto-seeds commercial rules, PA requirements, and transparency metrics on startup. The full CMS sync adds 7,500+ Medicare coverage rules from `api.coverage.cms.gov`.

### Specs

Design docs live in `docs/specs/`. Read the relevant surface spec before making changes:

```
docs/SPEC.md                     # Repo-wide contracts, PHI invariants
docs/specs/agent/SPEC.md         # On-prem agent
docs/specs/cda-parser/SPEC.md    # CDA R2 parser
docs/specs/cloud-api/SPEC.md     # Cloud API
docs/specs/payer-rules/SPEC.md   # Payer rules ingestion
docs/specs/web-demo/SPEC.md      # Web demo
```

## PHI Isolation

The system is designed so that the operating company never receives, stores, or processes Protected Health Information:

- The on-prem agent is the only component that touches PHI
- A HIPAA Safe Harbor de-identification gate (allowlist-based, not blocklist) strips all 18 identifier categories before any data optionally syncs to cloud
- The cloud API rejects payloads with PHI-indicative fields (defense-in-depth)
- The web demo does not persist, log, or cache pasted notes
- All test data is fully synthetic

## License

Proprietary. All rights reserved.
