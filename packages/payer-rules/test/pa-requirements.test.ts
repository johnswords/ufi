import { paRequirementSchema } from "@ufi/shared";
import { beforeAll, describe, expect, it } from "vitest";
import { paRequirementSeeds } from "../src/pa-requirement-seeds.js";
import { PayerRulesRepository } from "../src/repository.js";

describe("PA requirement seeds", () => {
  it("all seeds validate against paRequirementSchema", () => {
    for (const seed of paRequirementSeeds) {
      expect(() => paRequirementSchema.parse(seed)).not.toThrow();
    }
  });

  it("covers all four target payers", () => {
    const payers = new Set(paRequirementSeeds.map((s) => s.payer));
    expect(payers).toContain("Aetna");
    expect(payers).toContain("Cigna");
    expect(payers).toContain("UnitedHealthcare");
    expect(payers).toContain("Medicare");
  });

  it("covers all 13 target CPT codes", () => {
    const codes = new Set(paRequirementSeeds.map((s) => s.cptCode));
    const expected = [
      "27447",
      "27446",
      "22612",
      "22630",
      "22633",
      "63650",
      "63685",
      "22856",
      "29881",
      "64721",
      "29888",
      "23412",
      "29827"
    ];
    for (const code of expected) {
      expect(codes).toContain(code);
    }
  });

  it("has 4 records per CPT code (one per payer)", () => {
    const counts = new Map<string, number>();
    for (const seed of paRequirementSeeds) {
      counts.set(seed.cptCode, (counts.get(seed.cptCode) ?? 0) + 1);
    }
    for (const [, count] of counts) {
      expect(count).toBe(4);
    }
  });
});

describe("PA requirements repository", () => {
  let repo: PayerRulesRepository;

  beforeAll(async () => {
    repo = new PayerRulesRepository();
    await repo.migrate();
  });

  it("upserts and queries PA requirements by CPT code", async () => {
    await repo.upsertPaRequirements(paRequirementSeeds);

    const results = await repo.getPaRequirements("27447");
    expect(results.length).toBe(4);
    for (const r of results) {
      expect(r.cptCode).toBe("27447");
    }
  });

  it("returns correct payer list for a CPT code", async () => {
    const results = await repo.getPaRequirements("64721");
    const payers = results.map((r) => r.payer);
    expect(payers).toContain("Aetna");
    expect(payers).toContain("Cigna");
    expect(payers).toContain("UnitedHealthcare");
    expect(payers).toContain("Medicare");
  });

  it("returns empty array for unknown CPT code", async () => {
    const results = await repo.getPaRequirements("99999");
    expect(results).toHaveLength(0);
  });

  it("handles upsert (update existing records) without error", async () => {
    await repo.upsertPaRequirements(paRequirementSeeds);
    const results = await repo.getPaRequirements("27447");
    expect(results.length).toBe(4);
  });
});
