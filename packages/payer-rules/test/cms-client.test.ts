import { describe, expect, it } from "vitest";

import { CmsCoverageClient } from "../src/index.js";
import { createCmsFixtureFetch } from "./fixture-transport.js";

describe("CmsCoverageClient", () => {
  it("retrieves a license token from the metadata endpoint", async () => {
    const client = new CmsCoverageClient({
      baseUrl: "https://api.coverage.cms.gov",
      fetch: createCmsFixtureFetch()
    });

    await expect(client.fetchLicenseToken()).resolves.toBe("18926c74-c9e1-4d73-8140-e55254abc293");
  });

  it("loads LCD, article, and NCD records through the verified endpoints", async () => {
    const client = new CmsCoverageClient({
      baseUrl: "https://api.coverage.cms.gov",
      fetch: createCmsFixtureFetch()
    });
    const token = await client.fetchLicenseToken();

    const [lcds, lcd, relatedDocuments, articleCodes, ncds, ncd] = await Promise.all([
      client.listFinalLcds(),
      client.getLcd(33411, 29, token),
      client.getLcdRelatedDocuments(33411, 29, token),
      client.getArticleHcpcCodes(57145, 32, token),
      client.listNationalNcds(),
      client.getNcd(57, 5)
    ]);

    expect(lcds).toHaveLength(1);
    expect(lcd.title).toContain("Morbid Obesity");
    expect(relatedDocuments[0]?.r_article_id).toBe(57145);
    expect(articleCodes.length).toBeGreaterThan(3);
    expect(ncds).toHaveLength(1);
    expect(ncd.title).toContain("Bariatric Surgery");
  });
});
