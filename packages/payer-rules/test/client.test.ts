import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { CmsCoverageClient } from "../src/client.js";
import type { CmsFetchLike } from "../src/types.js";

const fixtureDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "cms"
);

function loadFixture(name: string): string {
  return readFileSync(path.join(fixtureDirectory, name), "utf8");
}

function jsonResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json"
    }
  });
}

describe("CmsCoverageClient", () => {
  it("adds the bearer token for protected CMS endpoints and paginates article codes", async () => {
    const requests: Array<{ url: string; authorization: string | null }> = [];
    const articleFixture = JSON.parse(loadFixture("data-article-hcpc-codes-a57145.json"));
    const articlePageOne = JSON.stringify({
      meta: {
        status: { id: 200, message: "OK" },
        next_token: "page-2"
      },
      data: articleFixture.data.slice(0, 3)
    });
    const articlePageTwo = JSON.stringify({
      meta: {
        status: { id: 200, message: "OK" },
        next_token: ""
      },
      data: articleFixture.data.slice(3)
    });

    const fetchImplementation: CmsFetchLike = async (input, init) => {
      const url = new URL(input);
      requests.push({
        url: url.pathname + url.search,
        authorization: init?.headers instanceof Headers
          ? init.headers.get("authorization")
          : Array.isArray(init?.headers)
            ? null
            : (init?.headers as Record<string, string> | undefined)?.authorization ?? null
      });

      if (url.pathname === "/v1/metadata/license-agreement/") {
        return jsonResponse(loadFixture("license-agreement.json"));
      }

      if (url.pathname === "/v1/data/lcd/" && url.searchParams.get("lcdid") === "33411") {
        return jsonResponse(loadFixture("data-lcd-33411.json"));
      }

      if (url.pathname === "/v1/data/lcd/related-documents" && url.searchParams.get("lcdid") === "33411") {
        return jsonResponse(loadFixture("data-lcd-related-documents-33411.json"));
      }

      if (url.pathname === "/v1/data/article/" && url.searchParams.get("articleid") === "57145") {
        return jsonResponse(loadFixture("data-article-a57145.json"));
      }

      if (url.pathname === "/v1/data/article/hcpc-code" && url.searchParams.get("articleid") === "57145") {
        return jsonResponse(
          url.searchParams.get("next_token") === "page-2" ? articlePageTwo : articlePageOne
        );
      }

      throw new Error(`Unexpected request: ${url.pathname}${url.search}`);
    };

    const client = new CmsCoverageClient({ fetchImplementation });
    const lcd = await client.getLcd(33411, 29);
    const related = await client.getLcdRelatedDocuments(33411, 29);
    const article = await client.getArticle(57145, 32);
    const codes = await client.getArticleHcpcCodes(57145, 32, 3);

    expect(lcd.lcd_id).toBe(33411);
    expect(related).toHaveLength(1);
    expect(article.title).toContain("Surgical Management of Morbid Obesity");
    expect(codes).toHaveLength(7);

    expect(requests[0]?.url).toBe("/v1/metadata/license-agreement/");
    expect(requests[1]?.authorization).toBe("Bearer 18926c74-c9e1-4d73-8140-e55254abc293");
    expect(requests[2]?.authorization).toBe("Bearer 18926c74-c9e1-4d73-8140-e55254abc293");
    expect(requests[3]?.authorization).toBe("Bearer 18926c74-c9e1-4d73-8140-e55254abc293");
    expect(requests[4]?.authorization).toBe("Bearer 18926c74-c9e1-4d73-8140-e55254abc293");
    expect(requests[5]?.authorization).toBe("Bearer 18926c74-c9e1-4d73-8140-e55254abc293");
  });

  it("paginates the LCD report listing with next_token", async () => {
    const baseListing = JSON.parse(loadFixture("reports-local-coverage-final-lcds.json")).data[0];
    const pageOne = JSON.stringify({
      meta: {
        status: { id: 200, message: "OK" },
        next_token: "page-2"
      },
      data: [
        {
          ...baseListing,
          document_id: 11111,
          document_display_id: "L11111",
          updated_on_sort: "20240101000000"
        }
      ]
    });
    const pageTwo = JSON.stringify({
      meta: {
        status: { id: 200, message: "OK" },
        next_token: ""
      },
      data: [
        {
          ...baseListing,
          document_id: 22222,
          document_display_id: "L22222",
          updated_on_sort: "20240202000000"
        }
      ]
    });

    const fetchImplementation: CmsFetchLike = async (input) => {
      const url = new URL(input);
      if (url.pathname !== "/v1/reports/local-coverage-final-lcds/") {
        throw new Error(`Unexpected request: ${url.pathname}${url.search}`);
      }

      return jsonResponse(url.searchParams.get("next_token") === "page-2" ? pageTwo : pageOne);
    };

    const client = new CmsCoverageClient({ fetchImplementation });
    const listings = await client.listAllFinalLcds(1);

    expect(listings.map((listing) => listing.document_display_id)).toEqual(["L11111", "L22222"]);
  });
});
