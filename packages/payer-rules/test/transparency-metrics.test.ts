import { payerTransparencyMetricsSchema } from "@ufi/shared";
import { beforeAll, describe, expect, it } from "vitest";
import { PayerRulesRepository } from "../src/repository.js";
import { transparencyMetricsSeeds } from "../src/transparency-metrics-seeds.js";

describe("Transparency metrics seeds", () => {
  it("all seeds validate against payerTransparencyMetricsSchema", () => {
    for (const seed of transparencyMetricsSeeds) {
      expect(() => payerTransparencyMetricsSchema.parse(seed)).not.toThrow();
    }
  });

  it("covers all four target payers", () => {
    const payers = new Set(transparencyMetricsSeeds.map((s) => s.payer));
    expect(payers).toContain("UnitedHealthcare");
    expect(payers).toContain("Aetna");
    expect(payers).toContain("Cigna");
    expect(payers).toContain("Medicare");
  });

  it("has both overall and MSK/orthopedic category entries", () => {
    const withCategory = transparencyMetricsSeeds.filter((s) => s.serviceCategory != null);
    const withoutCategory = transparencyMetricsSeeds.filter((s) => s.serviceCategory == null);
    expect(withCategory.length).toBeGreaterThan(0);
    expect(withoutCategory.length).toBeGreaterThan(0);
  });

  it("has approval + denial rates summing to 1.0", () => {
    for (const seed of transparencyMetricsSeeds) {
      expect(seed.approvalRate + seed.denialRate).toBeCloseTo(1.0, 5);
    }
  });
});

describe("Transparency metrics repository", () => {
  let repo: PayerRulesRepository;

  beforeAll(async () => {
    repo = new PayerRulesRepository();
    await repo.migrate();
    await repo.upsertTransparencyMetrics(transparencyMetricsSeeds);
  });

  it("queries metrics by payer", async () => {
    const results = await repo.getTransparencyMetrics("UnitedHealthcare");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.payer).toBe("UnitedHealthcare");
    }
  });

  it("returns all metrics", async () => {
    const results = await repo.getAllTransparencyMetrics();
    expect(results.length).toBe(transparencyMetricsSeeds.length);
  });

  it("returns empty array for unknown payer", async () => {
    const results = await repo.getTransparencyMetrics("NonexistentPayer");
    expect(results).toHaveLength(0);
  });

  it("handles upsert (update existing records) without error", async () => {
    await repo.upsertTransparencyMetrics(transparencyMetricsSeeds);
    const results = await repo.getAllTransparencyMetrics();
    expect(results.length).toBe(transparencyMetricsSeeds.length);
  });
});
