#!/usr/bin/env bash
set -euo pipefail

echo "=== UFI MedEnt — Seed All Payer Data ==="
echo ""

SKIP_CMS="${SKIP_CMS:-false}"

# Step 1: Commercial payer rules (Aetna, Cigna, UHC)
echo "Loading commercial payer rules..."
npx tsx packages/payer-rules/scripts/seed-commercial.ts
echo ""

# Step 2: CMS Medicare live sync (optional — takes ~5 minutes)
if [ "$SKIP_CMS" = "true" ]; then
  echo "Skipping CMS Medicare sync (SKIP_CMS=true)."
  echo "Run without SKIP_CMS to fetch 7,500+ rules from api.coverage.cms.gov."
else
  echo "Syncing CMS Medicare coverage data from api.coverage.cms.gov..."
  echo "This fetches LCD/NCD data and takes ~5 minutes. Set SKIP_CMS=true to skip."
  echo ""
  npx tsx packages/payer-rules/scripts/live-sync.ts
fi

echo ""
echo "=== Seed complete ==="
