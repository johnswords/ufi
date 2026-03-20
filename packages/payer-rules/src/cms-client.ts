export interface CmsApiMeta {
  readonly next_token?: string;
}

export interface CmsEnvelope<T> {
  readonly meta: CmsApiMeta;
  readonly data: T[];
}

export interface CmsLicenseTokenRecord {
  readonly token?: string;
  readonly Token?: string;
}

export interface CmsLcdSummary {
  readonly document_id: number;
  readonly document_version: number;
  readonly document_display_id: string;
  readonly title: string;
  readonly contractor_name_type: string;
  readonly updated_on_sort: string;
  readonly effective_date: string;
  readonly retirement_date: string;
  readonly url: string;
}

export interface CmsLcdDocument {
  readonly lcd_id: number;
  readonly lcd_version: number;
  readonly title: string;
  readonly indication: string;
  readonly diagnoses_support: string;
  readonly doc_reqs: string;
  readonly associated_info: string;
  readonly rev_eff_date: string;
  readonly rev_end_date: string;
  readonly status: string;
  readonly last_updated: string;
}

export interface CmsLcdRelatedDocument {
  readonly r_article_id: number | null;
  readonly r_article_version: number | null;
}

export interface CmsArticleDocument {
  readonly article_id: number;
  readonly article_version: number;
  readonly title: string;
  readonly description: string;
  readonly article_eff_date: string;
  readonly article_end_date: string;
  readonly last_updated: string;
}

export interface CmsArticleHcpcCode {
  readonly hcpc_code_id: string;
  readonly long_description: string;
  readonly short_description: string;
}

export interface CmsNcdSummary {
  readonly document_id: number;
  readonly document_version: number;
  readonly document_display_id: string;
  readonly title: string;
  readonly last_updated_sort: string;
  readonly url: string;
}

export interface CmsNcdDocument {
  readonly document_id: string;
  readonly document_version: number;
  readonly document_display_id: string;
  readonly title: string;
  readonly effective_date: string;
  readonly effective_end_date: string;
  readonly item_service_description: string;
  readonly indications_limitations: string;
  readonly reasons_for_denial: string;
}

export interface CmsCoverageClientOptions {
  readonly baseUrl?: string;
  readonly fetch?: typeof fetch;
}

function normalizePath(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}

export class CmsCoverageClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  public constructor(options: CmsCoverageClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://api.coverage.cms.gov";
    this.fetchImpl = options.fetch ?? fetch;
  }

  public async fetchLicenseToken(): Promise<string> {
    const response = await this.request<CmsLicenseTokenRecord>("/v1/metadata/license-agreement/");
    const token = response.data[0]?.token ?? response.data[0]?.Token;
    if (!token) {
      throw new Error("CMS license token response did not contain a token.");
    }

    return token;
  }

  public listFinalLcds(): Promise<CmsLcdSummary[]> {
    return this.requestAllPages<CmsLcdSummary>("/v1/reports/local-coverage-final-lcds/");
  }

  public async getLcd(
    lcdId: number,
    version: number,
    token: string
  ): Promise<CmsLcdDocument> {
    const response = await this.request<CmsLcdDocument>(
      "/v1/data/lcd/",
      { lcdid: String(lcdId), ver: String(version) },
      token
    );
    return this.unwrapOne(response, `LCD ${lcdId}`);
  }

  public async getLcdRelatedDocuments(
    lcdId: number,
    version: number,
    token: string
  ): Promise<CmsLcdRelatedDocument[]> {
    const response = await this.request<CmsLcdRelatedDocument>(
      "/v1/data/lcd/related-documents",
      { lcdid: String(lcdId), ver: String(version) },
      token
    );
    return response.data;
  }

  public async getLcdHcpcCodes(
    lcdId: number,
    version: number,
    token: string
  ): Promise<CmsArticleHcpcCode[]> {
    const response = await this.requestAllPages<CmsArticleHcpcCode>(
      "/v1/data/lcd/hcpc-code",
      { lcdid: String(lcdId), ver: String(version) },
      token
    );
    return response;
  }

  public async getArticle(
    articleId: number,
    version: number,
    token: string
  ): Promise<CmsArticleDocument> {
    const response = await this.request<CmsArticleDocument>(
      "/v1/data/article/",
      { articleid: String(articleId), ver: String(version) },
      token
    );
    return this.unwrapOne(response, `article ${articleId}`);
  }

  public getArticleHcpcCodes(
    articleId: number,
    version: number,
    token: string
  ): Promise<CmsArticleHcpcCode[]> {
    return this.requestAllPages<CmsArticleHcpcCode>(
      "/v1/data/article/hcpc-code",
      { articleid: String(articleId), ver: String(version) },
      token
    );
  }

  public listNationalNcds(): Promise<CmsNcdSummary[]> {
    return this.requestAllPages<CmsNcdSummary>("/v1/reports/national-coverage-ncd/");
  }

  public async getNcd(ncdId: number, version: number): Promise<CmsNcdDocument> {
    const response = await this.request<CmsNcdDocument>("/v1/data/ncd/", {
      ncdid: String(ncdId),
      ncdver: String(version)
    });
    return this.unwrapOne(response, `NCD ${ncdId}`);
  }

  private async requestAllPages<T>(
    path: string,
    params: Record<string, string> = {},
    token?: string
  ): Promise<T[]> {
    const results: T[] = [];
    let nextToken = "";

    do {
      const response = await this.request<T>(
        path,
        nextToken ? { ...params, next_token: nextToken } : params,
        token
      );
      results.push(...response.data);
      nextToken = response.meta.next_token ?? "";
    } while (nextToken);

    return results;
  }

  private async request<T>(
    path: string,
    params: Record<string, string> = {},
    token?: string
  ): Promise<CmsEnvelope<T>> {
    const url = new URL(normalizePath(path), this.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const init: RequestInit = { method: "GET" };
    if (token) {
      init.headers = { Authorization: `Bearer ${token}` };
    }

    const response = await this.fetchImpl(url.toString(), init);

    if (!response.ok) {
      throw new Error(`CMS request failed for ${url.pathname}: ${response.status} ${await response.text()}`);
    }

    return (await response.json()) as CmsEnvelope<T>;
  }

  private unwrapOne<T>(response: CmsEnvelope<T>, label: string): T {
    const item = response.data[0];
    if (!item) {
      throw new Error(`CMS response for ${label} was empty.`);
    }

    return item;
  }
}
