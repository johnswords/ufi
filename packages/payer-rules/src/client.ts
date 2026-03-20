import { CmsClientError } from "./errors.js";
import type {
  CmsApiEnvelope,
  CmsArticleDetailRow,
  CmsArticleHcpcRow,
  CmsClientOptions,
  CmsFetchLike,
  CmsLcdDetailRow,
  CmsLcdRelatedDocumentRow,
  CmsLcdReportRow,
  CmsListingPageOptions,
  CmsNcdDetailRow,
  CmsNcdReportRow
} from "./types.js";

const defaultBaseUrl = "https://api.coverage.cms.gov";
const defaultTokenTtlMs = 60 * 60 * 1000;

interface LicenseTokenCache {
  readonly token: string;
  readonly expiresAtMs: number;
}

function createUrl(baseUrl: string, path: string, query: Record<string, string | number | undefined>): string {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export class CmsCoverageClient {
  private readonly fetchImplementation: CmsFetchLike;
  private readonly baseUrl: string;
  private readonly now: () => Date;
  private readonly licenseTokenTtlMs: number;
  private cachedLicenseToken: LicenseTokenCache | null = null;

  public constructor(options: CmsClientOptions = {}) {
    this.fetchImplementation = options.fetchImplementation ?? options.fetch ?? fetch;
    this.baseUrl = options.baseUrl ?? defaultBaseUrl;
    this.now = options.now ?? (() => new Date());
    this.licenseTokenTtlMs = options.licenseTokenTtlMs ?? defaultTokenTtlMs;
  }

  public async getLicenseToken(): Promise<string> {
    const nowMs = this.now().getTime();
    if (this.cachedLicenseToken && this.cachedLicenseToken.expiresAtMs - 60_000 > nowMs) {
      return this.cachedLicenseToken.token;
    }

    const envelope = await this.requestJson<{ Token?: string; token?: string }>(
      "/v1/metadata/license-agreement/",
      {}
    );
    const token = envelope.data[0]?.Token ?? envelope.data[0]?.token;
    if (!token) {
      throw new CmsClientError("CMS license agreement response did not include a bearer token.", {
        endpoint: "/v1/metadata/license-agreement/"
      });
    }

    this.cachedLicenseToken = {
      token,
      expiresAtMs: nowMs + this.licenseTokenTtlMs
    };

    return token;
  }

  public fetchLicenseToken(): Promise<string> {
    return this.getLicenseToken();
  }

  public async listFinalLcdsPage(options: CmsListingPageOptions = {}): Promise<CmsApiEnvelope<CmsLcdReportRow>> {
    return this.requestJson<CmsLcdReportRow>("/v1/reports/local-coverage-final-lcds/", {
      page_size: options.pageSize,
      next_token: options.nextToken
    });
  }

  public async listAllFinalLcds(pageSize = 100): Promise<CmsLcdReportRow[]> {
    return this.collectPages<CmsLcdReportRow>("/v1/reports/local-coverage-final-lcds/", pageSize);
  }

  public listFinalLcds(pageSize = 100): Promise<CmsLcdReportRow[]> {
    return this.listAllFinalLcds(pageSize);
  }

  public async getLcd(lcdId: number, version: number): Promise<CmsLcdDetailRow> {
    const envelope = await this.requestJson<CmsLcdDetailRow>(
      "/v1/data/lcd/",
      {
        lcdid: lcdId,
        ver: version
      },
      true
    );

    const lcd = envelope.data[0];
    if (!lcd) {
      throw new CmsClientError(`CMS LCD ${lcdId}/${version} response was empty.`, {
        endpoint: "/v1/data/lcd/"
      });
    }

    return lcd;
  }

  public async getLcdRelatedDocuments(
    lcdId: number,
    version: number
  ): Promise<CmsLcdRelatedDocumentRow[]> {
    const envelope = await this.requestJson<CmsLcdRelatedDocumentRow>(
      "/v1/data/lcd/related-documents",
      {
        lcdid: lcdId,
        ver: version
      },
      true
    );

    return envelope.data;
  }

  public async getArticleHcpcCodes(
    articleId: number,
    version: number,
    pageSize = 100
  ): Promise<CmsArticleHcpcRow[]> {
    return this.collectPages<CmsArticleHcpcRow>(
      "/v1/data/article/hcpc-code",
      pageSize,
      {
        articleid: articleId,
        ver: version
      },
      true
    );
  }

  public async getArticle(articleId: number, version: number): Promise<CmsArticleDetailRow> {
    const envelope = await this.requestJson<CmsArticleDetailRow>(
      "/v1/data/article/",
      {
        articleid: articleId,
        ver: version
      },
      true
    );

    const article = envelope.data[0];
    if (!article) {
      throw new CmsClientError(`CMS article ${articleId}/${version} response was empty.`, {
        endpoint: "/v1/data/article/"
      });
    }

    return article;
  }

  public async listNationalNcdsPage(options: CmsListingPageOptions = {}): Promise<CmsApiEnvelope<CmsNcdReportRow>> {
    return this.requestJson<CmsNcdReportRow>("/v1/reports/national-coverage-ncd/", {
      page_size: options.pageSize,
      next_token: options.nextToken
    });
  }

  public async listAllNationalNcds(pageSize = 100): Promise<CmsNcdReportRow[]> {
    return this.collectPages<CmsNcdReportRow>("/v1/reports/national-coverage-ncd/", pageSize);
  }

  public listNationalNcds(pageSize = 100): Promise<CmsNcdReportRow[]> {
    return this.listAllNationalNcds(pageSize);
  }

  public async getNcd(ncdId: number, version: number): Promise<CmsNcdDetailRow> {
    const envelope = await this.requestJson<CmsNcdDetailRow>("/v1/data/ncd/", {
      ncdid: ncdId,
      ncdver: version
    });

    const ncd = envelope.data[0];
    if (!ncd) {
      throw new CmsClientError(`CMS NCD ${ncdId}/${version} response was empty.`, {
        endpoint: "/v1/data/ncd/"
      });
    }

    return ncd;
  }

  private async collectPages<T>(
    path: string,
    pageSize: number,
    query: Record<string, string | number | undefined> = {},
    requiresToken = false
  ): Promise<T[]> {
    const rows: T[] = [];
    let nextToken: string | undefined;

    do {
      const envelope = await this.requestJson<T>(
        path,
        {
          ...query,
          page_size: pageSize,
          next_token: nextToken
        },
        requiresToken
      );
      rows.push(...envelope.data);
      nextToken = envelope.meta.next_token || undefined;
    } while (nextToken);

    return rows;
  }

  private async requestJson<T>(
    path: string,
    query: Record<string, string | number | undefined>,
    requiresToken = false
  ): Promise<CmsApiEnvelope<T>> {
    const endpoint = path;
    const headers: Record<string, string> = {
      accept: "application/json"
    };

    if (requiresToken) {
      headers.authorization = `Bearer ${await this.getLicenseToken()}`;
    }

    const response = await this.fetchImplementation(createUrl(this.baseUrl, path, query), { headers });
    const bodyText = await response.text();
    let parsed: CmsApiEnvelope<T>;

    try {
      parsed = JSON.parse(bodyText) as CmsApiEnvelope<T>;
    } catch {
      throw new CmsClientError("CMS returned a non-JSON response.", {
        endpoint,
        httpStatus: response.status
      });
    }

    const cmsStatusId = parsed.meta?.status?.id;
    if (!response.ok || cmsStatusId !== 200) {
      throw new CmsClientError(parsed.meta?.status?.message ?? "CMS request failed.", {
        endpoint,
        httpStatus: response.status,
        cmsStatusId
      });
    }

    return parsed;
  }
}

export function createCmsCoverageClient(options: CmsClientOptions = {}): CmsCoverageClient {
  return new CmsCoverageClient(options);
}
