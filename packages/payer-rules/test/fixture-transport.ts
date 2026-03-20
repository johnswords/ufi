import { readFileSync } from "node:fs";

const fixtureBase = new URL("./fixtures/cms/", import.meta.url);

function loadFixture(name: string): string {
  return readFileSync(new URL(name, fixtureBase), "utf8");
}

function jsonResponse(name: string): Response {
  return new Response(loadFixture(name), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

export function createCmsFixtureFetch(): typeof fetch {
  return async (input) => {
    const requestUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const url = new URL(requestUrl);
    const path = url.pathname.replace(/\/+$/u, "/");

    if (path === "/v1/metadata/license-agreement/") {
      return jsonResponse("license-agreement.json");
    }

    if (path === "/v1/reports/local-coverage-final-lcds/") {
      return jsonResponse("reports-local-coverage-final-lcds.json");
    }

    if (path === "/v1/data/lcd/") {
      return jsonResponse("data-lcd-33411.json");
    }

    if (path === "/v1/data/lcd/related-documents/") {
      return jsonResponse("data-lcd-related-documents-33411.json");
    }

    if (path === "/v1/data/lcd/hcpc-code/") {
      return jsonResponse("data-lcd-hcpc-codes-33411.json");
    }

    if (path === "/v1/data/article/") {
      return jsonResponse("data-article-a57145.json");
    }

    if (path === "/v1/data/article/hcpc-code/") {
      return jsonResponse("data-article-hcpc-codes-a57145.json");
    }

    if (path === "/v1/reports/national-coverage-ncd/") {
      return jsonResponse("reports-national-coverage-ncd.json");
    }

    if (path === "/v1/data/ncd/") {
      return jsonResponse("data-ncd-57.json");
    }

    return new Response(`Unhandled CMS fixture request: ${url.pathname}${url.search}`, { status: 404 });
  };
}
