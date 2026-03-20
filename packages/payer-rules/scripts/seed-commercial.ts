/**
 * Loads hand-curated commercial payer rules into a PGlite database.
 *
 * Creates the schema, upserts all Cigna/eviCore and UnitedHealthcare rules,
 * and prints a summary by payer and CPT code.
 *
 * Usage: npx tsx scripts/seed-commercial.ts
 */

import { payerRuleSchema } from "@ufi/shared";

import { commercialPayerRules } from "../src/commercial-seeds.js";
import { PayerRulesRepository } from "../src/repository.js";

async function main() {
  console.log("=== UFI MedEnt — Commercial Payer Rules Seed ===\n");

  // 1. Validate all seeds against schema before touching the DB
  console.log(`Validating ${commercialPayerRules.length} seed rules...`);
  for (const rule of commercialPayerRules) {
    payerRuleSchema.parse(rule);
  }
  console.log("All rules pass schema validation.\n");

  // 2. Initialize repository and migrate
  const repository = new PayerRulesRepository();
  await repository.migrate();
  console.log("Database migrated.\n");

  // 3. Upsert rules
  console.log("Upserting commercial payer rules...");
  await repository.upsertRules(commercialPayerRules);

  // 4. Summary
  const byPayer = new Map<string, number>();
  const byCpt = new Map<string, { description: string; count: number }>();

  for (const rule of commercialPayerRules) {
    byPayer.set(rule.payer, (byPayer.get(rule.payer) ?? 0) + 1);

    const existing = byCpt.get(rule.cptCode);
    if (existing) {
      existing.count += 1;
    } else {
      byCpt.set(rule.cptCode, { description: rule.cptDescription ?? rule.cptCode, count: 1 });
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total rules loaded: ${commercialPayerRules.length}\n`);

  console.log("By Payer:");
  for (const [payer, count] of [...byPayer.entries()].sort()) {
    console.log(`  ${payer}: ${count} rules`);
  }

  console.log("\nBy CPT Code:");
  for (const [cpt, info] of [...byCpt.entries()].sort()) {
    console.log(`  ${cpt} — ${info.description} (${info.count} rule${info.count > 1 ? "s" : ""})`);
  }

  const totalInDb = await repository.countRules();
  console.log(`\nTotal rules in DB after seed: ${totalInDb}`);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
