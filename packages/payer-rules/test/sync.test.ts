import { describe, expect, it } from "vitest";

import { CmsCoverageClient } from "../src/client.js";
import { PayerRulesRepository } from "../src/repository.js";
import { syncCmsCoverageRules } from "../src/sync.js";
import type { CmsFetchLike } from "../src/types.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixtureDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "cms"
);

function loadFixture(name: string): string {
  return readFileSync(path.join(fixtureDirectory, name), "utf8");
}

function createFixtureFetch(requestLog: string[]): CmsFetchLike {
  return async (input) => {
    const url = new URL(input);
    requestLog.push(`${url.pathname}${url.search}`);

    if (url.pathname === "/v1/metadata/license-agreement/") {
      return new Response(loadFixture("license-agreement.json"), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.pathname === "/v1/reports/local-coverage-final-lcds/") {
      return new Response(loadFixture("reports-local-coverage-final-lcds.json"), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.pathname === "/v1/data/lcd/") {
      return new Response(loadFixture("data-lcd-33411.json"), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.pathname === "/v1/data/lcd/related-documents") {
      return new Response(loadFixture("data-lcd-related-documents-33411.json"), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.pathname === "/v1/data/article/hcpc-code") {
      return new Response(loadFixture("data-article-hcpc-codes-a57145.json"), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.pathname === "/v1/reports/national-coverage-ncd/") {
      return new Response(loadFixture("reports-national-coverage-ncd.json"), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.pathname === "/v1/data/ncd/") {
      return new Response(loadFixture("data-ncd-57.json"), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    throw new Error(`Unexpected request: ${url.pathname}${url.search}`);
  };
}

describe("syncCmsCoverageRules", () => {
  it("upserts rules idempotently and tracks sync cursors for reruns", async () => {
    const requestLog: string[] = [];
    const repository = new PayerRulesRepository();
    const client = new CmsCoverageClient({
      fetchImplementation: createFixtureFetch(requestLog),
      now: () => new Date("2026-03-19T15:00:00.000Z")
    });

    const firstRun = await syncCmsCoverageRules({
      client,
      repository,
      pageSize: 2,
      now: () => new Date("2026-03-19T15:00:00.000Z")
    });
    const firstState = await repository.listRules();
    const requestCountAfterFirstRun = requestLog.length;

    const secondRun = await syncCmsCoverageRules({
      client,
      repository,
      pageSize: 2,
      now: () => new Date("2026-03-19T16:00:00.000Z")
    });
    const secondState = await repository.listRules();

    expect(firstRun.processedDocuments).toBeGreaterThanOrEqual(2);
    expect(firstRun.upsertedRules).toBeGreaterThanOrEqual(8);
    expect(secondRun.processedDocuments).toBe(0);
    expect(secondRun.upsertedRules).toBe(0);
    expect(secondState).toEqual(firstState);
    expect(await repository.countRules()).toBe(firstState.length);
    expect(await repository.getSyncCursor("cms_lcd")).toEqual(
      expect.objectContaining({
        source: "cms_lcd",
        cursor: "20191002160124"
      })
    );
    expect(await repository.getSyncCursor("cms_ncd")).toEqual(
      expect.objectContaining({
        source: "cms_ncd",
        cursor: "20250409101001"
      })
    );

    const secondRunRequests = requestLog.slice(requestCountAfterFirstRun);
    expect(secondRunRequests).toContain("/v1/reports/local-coverage-final-lcds/?page_size=2");
    expect(secondRunRequests).toContain("/v1/reports/national-coverage-ncd/?page_size=2");
    expect(secondRunRequests).not.toContain("/v1/data/lcd/?lcdid=33411&ver=29");
    expect(secondRunRequests).not.toContain("/v1/data/ncd/?ncdid=57&ncdver=5");
  });
});
