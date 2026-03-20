import type { PaRequirement, PayerRule, PayerTransparencyMetrics } from "@ufi/shared";

export interface CmsApiStatus {
  readonly id: number;
  readonly message: string;
}

export interface CmsApiMeta {
  readonly status: CmsApiStatus;
  readonly next_token?: string;
  readonly notes?: string;
}

export interface CmsApiEnvelope<T> {
  readonly meta: CmsApiMeta;
  readonly data: T[];
}

export type CmsFetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface CmsClientOptions {
  readonly fetchImplementation?: CmsFetchLike;
  readonly fetch?: CmsFetchLike;
  readonly baseUrl?: string;
  readonly now?: () => Date;
  readonly licenseTokenTtlMs?: number;
}

export interface CmsListingPageOptions {
  readonly pageSize?: number;
  readonly nextToken?: string;
}

export interface CmsLcdReportRow {
  readonly document_id: number;
  readonly document_version: number;
  readonly document_display_id: string;
  readonly document_type: "LCD";
  readonly note: string;
  readonly title: string;
  readonly contractor_name_type: string;
  readonly updated_on: string;
  readonly updated_on_sort: string;
  readonly effective_date: string;
  readonly retirement_date: string;
  readonly url: string;
}

export interface CmsLcdDetailRow {
  readonly lcd_id: number;
  readonly lcd_version: number;
  readonly title: string;
  readonly orig_det_eff_date: string;
  readonly ent_det_end_date: string;
  readonly rev_eff_date: string;
  readonly rev_end_date: string;
  readonly indication: string;
  readonly associated_info: string;
  readonly cms_cov_policy: string;
  readonly doc_reqs: string;
  readonly coding_guidelines: string;
  readonly status: string;
  readonly last_updated: string;
}

export interface CmsLcdRelatedDocumentRow {
  readonly lcd_id: number;
  readonly lcd_version: number;
  readonly r_article_id: number | null;
  readonly r_article_version: number | null;
  readonly url: string;
}

export interface CmsArticleHcpcRow {
  readonly article_id: number;
  readonly article_version: number;
  readonly hcpc_code_id: string;
  readonly long_description: string;
  readonly short_description: string;
}

export interface CmsArticleDetailRow {
  readonly article_id: number;
  readonly article_version: number;
  readonly title: string;
  readonly description: string;
  readonly article_eff_date: string;
  readonly article_end_date: string;
  readonly last_updated: string;
}

export interface CmsNcdReportRow {
  readonly document_id: number;
  readonly document_version: number;
  readonly document_display_id: string;
  readonly last_updated: string;
  readonly last_updated_sort: string;
  readonly document_type: "NCD";
  readonly title: string;
  readonly chapter: string;
  readonly is_lab: number;
  readonly url: string;
}

export interface CmsNcdDetailRow {
  readonly document_id: string;
  readonly document_version: number;
  readonly document_display_id: string;
  readonly title: string;
  readonly effective_date: string;
  readonly effective_end_date: string;
  readonly item_service_description: string;
  readonly indications_limitations: string;
  readonly revision_history: string;
  readonly reasons_for_denial: string;
}

export interface CmsSyncCursor {
  readonly source: "cms_lcd" | "cms_ncd";
  readonly cursor: string | null;
  readonly lastSuccessfulRunAt: string;
}

export interface CmsCoverageSyncOptions {
  readonly client: CmsCoverageClientLike;
  readonly repository: PayerRulesRepositoryLike;
  readonly pageSize?: number;
  readonly now?: () => Date;
}

export interface CmsCoverageSyncResult {
  readonly processedDocuments: number;
  readonly upsertedRules: number;
}

export interface CmsCoverageClientLike {
  listAllFinalLcds(pageSize?: number): Promise<CmsLcdReportRow[]>;
  getLcd(lcdId: number, version: number): Promise<CmsLcdDetailRow>;
  getLcdRelatedDocuments(lcdId: number, version: number): Promise<CmsLcdRelatedDocumentRow[]>;
  getArticleHcpcCodes(articleId: number, version: number, pageSize?: number): Promise<CmsArticleHcpcRow[]>;
  listAllNationalNcds(pageSize?: number): Promise<CmsNcdReportRow[]>;
  getNcd(ncdId: number, version: number): Promise<CmsNcdDetailRow>;
}

export interface PayerRulesRepositoryLike {
  migrate(): Promise<void>;
  getSyncCursor(source: CmsSyncCursor["source"]): Promise<CmsSyncCursor | null>;
  setSyncCursor(cursor: CmsSyncCursor): Promise<void>;
  upsertRules(rules: readonly PayerRule[]): Promise<void>;
  upsertPaRequirements(requirements: readonly PaRequirement[]): Promise<void>;
  getPaRequirements(cptCode: string): Promise<PaRequirement[]>;
  upsertTransparencyMetrics(metrics: readonly PayerTransparencyMetrics[]): Promise<void>;
  getTransparencyMetrics(payer: string): Promise<PayerTransparencyMetrics[]>;
  getAllTransparencyMetrics(): Promise<PayerTransparencyMetrics[]>;
}
