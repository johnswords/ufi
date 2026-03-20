import { describe, expect, it } from "vitest";

import {
  CMS_SYNC_CURSOR_KEY,
  CmsCoverageClient,
  PayerRulesRepository,
  syncCmsCoverage
} from "../src/index.js";
import { createCmsFixtureFetch } from "./fixture-transport.js";

describe("syncCmsCoverage", () => {
  it("syncs LCD and NCD rules into the repository and records a cursor", async () => {
    const repository = new PayerRulesRepository();
    await repository.migrate();

    const client = new CmsCoverageClient({
      baseUrl: "https://api.coverage.cms.gov",
      fetch: createCmsFixtureFetch()
    });

    const result = await syncCmsCoverage({
      client,
      repository,
      now: () => new Date("2026-03-19T15:00:00.000Z")
    });

    const rules = await repository.listRules();
    const cursor = await repository.getCursor(CMS_SYNC_CURSOR_KEY);

    expect(result.insertedRuleCount).toBeGreaterThanOrEqual(2);
    expect(rules.some((rule) => rule.sourceType === "cms_lcd")).toBe(true);
    expect(rules.some((rule) => rule.sourceType === "cms_ncd")).toBe(true);
    expect(cursor).toEqual({
      lcdUpdatedOnSort: "20191002160124",
      ncdUpdatedOnSort: "20250409101001",
      lastRunAt: "2026-03-19T15:00:00.000Z"
    });
  });

  it("is idempotent when replaying the same fixtures twice", async () => {
    const repository = new PayerRulesRepository();
    await repository.migrate();

    const client = new CmsCoverageClient({
      baseUrl: "https://api.coverage.cms.gov",
      fetch: createCmsFixtureFetch()
    });

    await syncCmsCoverage({
      client,
      repository,
      now: () => new Date("2026-03-19T15:00:00.000Z")
    });
    const firstPass = await repository.listRules();

    await syncCmsCoverage({
      client,
      repository,
      now: () => new Date("2026-03-19T15:05:00.000Z")
    });
    const secondPass = await repository.listRules();

    expect(await repository.countRules()).toBe(firstPass.length);
    expect(secondPass).toEqual(firstPass);
  });
});
