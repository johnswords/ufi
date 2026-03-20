import type { PayerRule } from "@ufi/shared";

import {
  CmsCoverageClient,
  type CmsArticleDocument,
  type CmsArticleHcpcCode,
  type CmsLcdDocument,
  type CmsLcdSummary,
  type CmsNcdDocument,
  type CmsNcdSummary
} from "./cms-client.js";
import { extractCriteriaFromCmsTexts } from "./criteria-extractor.js";
import { type CmsSyncCursor, PayerRulesRepository } from "./storage.js";

export const CMS_SYNC_CURSOR_KEY = "cms-coverage-sync";

export interface SyncCmsCoverageOptions {
  readonly client: CmsCoverageClient;
  readonly repository: PayerRulesRepository;
  readonly now?: () => Date;
}

function sortMax(current: string | null, next: string | undefined): string | null {
  if (!next) {
    return current;
  }

  if (!current || next > current) {
    return next;
  }

  return current;
}

function isUpdatedAfter(candidate: string, lastSeen: string | null): boolean {
  return !lastSeen || candidate > lastSeen;
}

function buildLcdRules(
  summary: CmsLcdSummary,
  lcd: CmsLcdDocument,
  hcpcCodes: CmsArticleHcpcCode[],
  article: CmsArticleDocument | null,
  syncedAt: string
): PayerRule[] {
  const criteria = extractCriteriaFromCmsTexts([
    lcd.indication,
    lcd.doc_reqs,
    lcd.associated_info
  ]);

  const active = summary.retirement_date === "N/A";
  const codes = hcpcCodes.length > 0 ? hcpcCodes : [{ hcpc_code_id: `LCD:${summary.document_display_id}`, long_description: summary.title, short_description: summary.title }];

  return codes.map((code) => ({
    sourceType: "cms_lcd",
    sourceDocumentId: summary.document_display_id,
    sourceDocumentVersion: summary.document_version,
    sourceUrl: summary.url,
    cptCode: code.hcpc_code_id,
    cptDescription: code.long_description || code.short_description,
    payer: "CMS Medicare",
    payerPlanCategory: summary.contractor_name_type,
    title: summary.title,
    criteria,
    effectiveDate: lcd.rev_eff_date || summary.effective_date,
    expirationDate: active ? undefined : summary.retirement_date,
    active,
    lastSyncedAt: syncedAt
  }));
}

function buildNcdRules(summary: CmsNcdSummary, ncd: CmsNcdDocument, syncedAt: string): PayerRule[] {
  return [
    {
      sourceType: "cms_ncd",
      sourceDocumentId: summary.document_display_id,
      sourceDocumentVersion: summary.document_version,
      sourceUrl: `https://api.coverage.cms.gov/v1/data/ncd/?ncdid=${summary.document_id}&ncdver=${summary.document_version}`,
      cptCode: `NCD:${summary.document_display_id}`,
      cptDescription: summary.title,
      payer: "CMS Medicare",
      payerPlanCategory: "National Coverage Determination",
      title: summary.title,
      criteria: extractCriteriaFromCmsTexts([
        ncd.item_service_description,
        ncd.indications_limitations,
        ncd.reasons_for_denial
      ]),
      effectiveDate: ncd.effective_date,
      expirationDate: ncd.effective_end_date === "N/A" ? undefined : ncd.effective_end_date,
      active: ncd.effective_end_date === "N/A",
      lastSyncedAt: syncedAt
    }
  ];
}

async function resolveLcdArticleCodes(
  client: CmsCoverageClient,
  summary: CmsLcdSummary,
  token: string
): Promise<{ article: CmsArticleDocument | null; hcpcCodes: CmsArticleHcpcCode[] }> {
  const related = await client.getLcdRelatedDocuments(summary.document_id, summary.document_version, token);
  const articleRef = related.find((item) => item.r_article_id && item.r_article_version);
  if (articleRef?.r_article_id && articleRef.r_article_version) {
    const article = await client.getArticle(articleRef.r_article_id, articleRef.r_article_version, token);
    const hcpcCodes = await client.getArticleHcpcCodes(articleRef.r_article_id, articleRef.r_article_version, token);
    return { article, hcpcCodes };
  }

  const hcpcCodes = await client.getLcdHcpcCodes(summary.document_id, summary.document_version, token);
  return { article: null, hcpcCodes };
}

export async function syncCmsCoverage(options: SyncCmsCoverageOptions): Promise<{
  readonly insertedRuleCount: number;
  readonly cursor: CmsSyncCursor;
}> {
  const syncedAt = (options.now ?? (() => new Date()))().toISOString();
  const cursor = await options.repository.getCursor(CMS_SYNC_CURSOR_KEY);
  const token = await options.client.fetchLicenseToken();

  const lcdSummaries = await options.client.listFinalLcds();
  const ncdSummaries = await options.client.listNationalNcds();

  const lcdCursor = lcdSummaries.reduce<string | null>(
    (maxValue, item) => sortMax(maxValue, item.updated_on_sort),
    cursor?.lcdUpdatedOnSort ?? null
  );
  const ncdCursor = ncdSummaries.reduce<string | null>(
    (maxValue, item) => sortMax(maxValue, item.last_updated_sort),
    cursor?.ncdUpdatedOnSort ?? null
  );

  const rules: PayerRule[] = [];

  for (const summary of lcdSummaries.filter((item) => isUpdatedAfter(item.updated_on_sort, cursor?.lcdUpdatedOnSort ?? null))) {
    const lcd = await options.client.getLcd(summary.document_id, summary.document_version, token);
    const { article, hcpcCodes } = await resolveLcdArticleCodes(options.client, summary, token);
    rules.push(...buildLcdRules(summary, lcd, hcpcCodes, article, syncedAt));
  }

  for (const summary of ncdSummaries.filter((item) => isUpdatedAfter(item.last_updated_sort, cursor?.ncdUpdatedOnSort ?? null))) {
    const ncd = await options.client.getNcd(summary.document_id, summary.document_version);
    rules.push(...buildNcdRules(summary, ncd, syncedAt));
  }

  await options.repository.upsertRules(rules);

  const nextCursor: CmsSyncCursor = {
    lcdUpdatedOnSort: lcdCursor,
    ncdUpdatedOnSort: ncdCursor,
    lastRunAt: syncedAt
  };

  await options.repository.setCursor(CMS_SYNC_CURSOR_KEY, nextCursor);

  return {
    insertedRuleCount: rules.length,
    cursor: nextCursor
  };
}
