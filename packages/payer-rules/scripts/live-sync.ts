/**
 * Live CMS Coverage API sync + commercial seed loader.
 *
 * Fetches real LCD/NCD data from api.coverage.cms.gov, loads hand-curated
 * commercial payer rules (Cigna/eviCore, UHC), syncs everything into PGlite,
 * and reports what payer rules we have for target ortho/spinal CPT codes.
 *
 * Usage: npx tsx scripts/live-sync.ts
 */

import { CmsCoverageClient } from "../src/client.js";
import { commercialPayerRules } from "../src/commercial-seeds.js";
import { PayerRulesRepository } from "../src/repository.js";
import { syncCmsCoverageRules } from "../src/sync.js";

const TARGET_CPT_CODES = [
  "27447", // Total knee replacement
  "27446", // Partial knee arthroplasty
  "29888", // ACL reconstruction
  "23412", // Rotator cuff repair (open)
  "29827", // Rotator cuff repair (arthroscopic)
  "29881", // Knee arthroscopy / meniscectomy
  "29806", // Shoulder arthroscopy / labral repair
  "64721", // Carpal tunnel release
  "22612", // Lumbar spinal fusion (single level)
  "22630", // Lumbar spinal fusion (posterolateral)
  "22633", // Lumbar spinal fusion (multilevel)
  "22856", // Cervical disc arthroplasty
  "63030", // Lumbar discectomy
  "63047", // Lumbar decompression
  "63650", // Spinal cord stimulator (percutaneous trial)
  "63685", // Spinal cord stimulator (implant)
  "43775", // Bariatric (sleeve gastrectomy) - existing test
  "43644", // Bariatric (Roux-en-Y) - existing test
];

async function main() {
  console.log("=== UFI MedEnt — Live CMS Coverage Sync ===\n");

  // 1. Initialize real CMS client and PGlite repository
  const client = new CmsCoverageClient();
  const repository = new PayerRulesRepository();

  // 2. Run sync
  console.log("Fetching license token from CMS...");
  const token = await client.getLicenseToken();
  console.log(`License token acquired (${token.slice(0, 20)}...)\n`);

  console.log("Starting LCD/NCD sync (this may take a few minutes)...");
  const startTime = Date.now();
  const result = await syncCmsCoverageRules({ client, repository, pageSize: 100 });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\nCMS sync complete in ${elapsed}s:`);
  console.log(`  Documents processed: ${result.processedDocuments}`);
  console.log(`  Rules upserted: ${result.upsertedRules}`);

  // 3. Load commercial payer seeds (Cigna/eviCore, UnitedHealthcare)
  console.log(`\nLoading ${commercialPayerRules.length} commercial payer rules...`);
  await repository.upsertRules(commercialPayerRules);
  console.log(`Commercial rules loaded (${commercialPayerRules.length} Cigna/eviCore + UHC rules).`);

  // 4. Query for target CPT codes
  const allRules = await repository.listRules();
  console.log(`\nTotal rules in DB: ${allRules.length}\n`);

  console.log("=== Rules for Target Ortho/Spinal CPT Codes ===\n");

  let matchedCount = 0;
  for (const cpt of TARGET_CPT_CODES) {
    const rules = allRules.filter((r) => r.cptCode === cpt);
    if (rules.length === 0) continue;

    matchedCount += rules.length;
    for (const rule of rules) {
      console.log(`CPT ${rule.cptCode} — ${rule.cptDescription}`);
      console.log(`  Source: ${rule.sourceType} ${rule.sourceDocumentId} (${rule.title})`);
      console.log(`  Payer: ${rule.payer} / ${rule.payerPlanCategory}`);
      console.log(`  Effective: ${rule.effectiveDate}${rule.expirationDate ? ` → ${rule.expirationDate}` : ""}`);
      console.log(`  Active: ${rule.active}`);
      console.log(`  Criteria (${rule.criteria.length}):`);
      for (const c of rule.criteria) {
        switch (c.type) {
          case "threshold":
            console.log(`    [threshold] ${c.measure} ${c.operator} ${c.value}${c.unit ? ` ${c.unit}` : ""}`);
            break;
          case "failed_treatment":
            console.log(`    [failed_tx] ${c.treatment}${c.durationWeeks ? ` (${c.durationWeeks} weeks)` : ""}`);
            break;
          case "comorbidity":
            console.log(`    [comorbidity] ${c.conditions.join(", ")}`);
            break;
          case "documentation_required":
            console.log(`    [doc_required] ${c.description.slice(0, 100)}...`);
            break;
          case "diagnosis_required":
            console.log(`    [diagnosis] ICD-10: ${c.icd10Codes.join(", ")}`);
            break;
          case "narrative":
            console.log(`    [narrative] ${c.text.slice(0, 100)}...`);
            break;
        }
      }
      console.log();
    }
  }

  console.log(`=== Summary ===`);
  console.log(`Total rules matching target CPT codes: ${matchedCount}`);
  console.log(`CPT codes with no coverage rules found:`);
  for (const cpt of TARGET_CPT_CODES) {
    if (!allRules.some((r) => r.cptCode === cpt)) {
      console.log(`  ${cpt} — no rules found (CMS or commercial)`);
    }
  }

  // 5. Show all unique CPT codes we have rules for (sample)
  const uniqueCpts = [...new Set(allRules.map((r) => r.cptCode))].sort();
  console.log(`\nTotal unique CPT codes in DB: ${uniqueCpts.length}`);
  console.log(`First 30: ${uniqueCpts.slice(0, 30).join(", ")}`);
}

main().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
