import { payerRuleSchema, type PayerRule } from "@ufi/shared";

import { extractCriteriaFromNarrative, inferProcedureCodesFromCmsTexts } from "./extractor.js";
import { htmlToPlainText } from "./text.js";
import type {
  CmsCoverageSyncOptions,
  CmsCoverageSyncResult,
  CmsLcdDetailRow,
  CmsLcdReportRow,
  CmsNcdDetailRow,
  CmsNcdReportRow
} from "./types.js";

function normalizeExpirationDate(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === "N/A") {
    return undefined;
  }

  return trimmed;
}

function normalizeCmsSourceUrl(baseUrl: string): string {
  if (/^https?:\/\//u.test(baseUrl)) {
    return baseUrl;
  }

  if (baseUrl.startsWith("/data/")) {
    return `https://api.coverage.cms.gov${baseUrl}`;
  }

  return `https://api.coverage.cms.gov${baseUrl}`;
}

function toLcdRules(
  listing: CmsLcdReportRow,
  detail: CmsLcdDetailRow,
  articleCodes: Array<{ hcpc_code_id: string; long_description: string; short_description: string }>,
  syncedAt: string
): PayerRule[] {
  const criteria = extractCriteriaFromNarrative(
    detail.indication,
    detail.associated_info,
    detail.doc_reqs,
    detail.coding_guidelines
  );

  return articleCodes.map((articleCode) =>
    payerRuleSchema.parse({
      sourceType: "cms_lcd",
      sourceDocumentId: listing.document_display_id || `L${listing.document_id}`,
      sourceDocumentVersion: listing.document_version,
      sourceUrl: normalizeCmsSourceUrl(listing.url),
      cptCode: articleCode.hcpc_code_id,
      cptDescription: articleCode.long_description || articleCode.short_description,
      payer: "CMS Medicare",
      payerPlanCategory: listing.contractor_name_type,
      title: listing.title,
      criteria,
      effectiveDate: listing.effective_date || detail.rev_eff_date || detail.orig_det_eff_date,
      ...(normalizeExpirationDate(listing.retirement_date) ? { expirationDate: normalizeExpirationDate(listing.retirement_date) } : {}),
      active: normalizeExpirationDate(listing.retirement_date) === undefined,
      lastSyncedAt: syncedAt
    })
  );
}

function toNcdRules(listing: CmsNcdReportRow, detail: CmsNcdDetailRow, syncedAt: string): PayerRule[] {
  const criteria = extractCriteriaFromNarrative(
    detail.indications_limitations,
    detail.item_service_description,
    detail.revision_history
  );
  const codes = inferProcedureCodesFromCmsTexts([
    htmlToPlainText(`${detail.item_service_description}\n${detail.indications_limitations}`)
  ]);

  return codes.map((code) =>
    payerRuleSchema.parse({
      sourceType: "cms_ncd",
      sourceDocumentId: detail.document_display_id,
      sourceDocumentVersion: detail.document_version,
      sourceUrl: normalizeCmsSourceUrl(listing.url),
      cptCode: code.cptCode,
      cptDescription: code.cptDescription,
      payer: "CMS Medicare",
      payerPlanCategory: "National Coverage Determination",
      title: detail.title,
      criteria,
      effectiveDate: detail.effective_date,
      ...(normalizeExpirationDate(detail.effective_end_date) ? { expirationDate: normalizeExpirationDate(detail.effective_end_date) } : {}),
      active: normalizeExpirationDate(detail.effective_end_date) === undefined,
      lastSyncedAt: syncedAt
    })
  );
}

export async function syncCmsCoverageRules(
  options: CmsCoverageSyncOptions
): Promise<CmsCoverageSyncResult> {
  const now = options.now ?? (() => new Date());
  const syncedAt = now().toISOString();
  const pageSize = options.pageSize ?? 100;

  await options.repository.migrate();

  let processedDocuments = 0;
  let upsertedRules = 0;

  const lcdCursor = await options.repository.getSyncCursor("cms_lcd");
  const lcdListings = await options.client.listAllFinalLcds(pageSize);
  const nextLcdCursor = lcdListings
    .map((listing) => listing.updated_on_sort)
    .sort()
    .at(-1) ?? lcdCursor?.cursor ?? null;

  for (const listing of lcdListings) {
    if (lcdCursor?.cursor && listing.updated_on_sort <= lcdCursor.cursor) {
      continue;
    }

    const detail = await options.client.getLcd(listing.document_id, listing.document_version);
    const relatedDocuments = await options.client.getLcdRelatedDocuments(
      listing.document_id,
      listing.document_version
    );
    const article = relatedDocuments.find(
      (document) => document.r_article_id !== null && document.r_article_version !== null
    );
    if (!article?.r_article_id || !article.r_article_version) {
      continue;
    }

    const articleCodes = await options.client.getArticleHcpcCodes(
      article.r_article_id,
      article.r_article_version,
      pageSize
    );
    const rules = toLcdRules(listing, detail, articleCodes, syncedAt);
    await options.repository.upsertRules(rules);
    processedDocuments += 1;
    upsertedRules += rules.length;
  }

  if (nextLcdCursor) {
    await options.repository.setSyncCursor({
      source: "cms_lcd",
      cursor: nextLcdCursor,
      lastSuccessfulRunAt: syncedAt
    });
  }

  const ncdCursor = await options.repository.getSyncCursor("cms_ncd");
  const ncdListings = await options.client.listAllNationalNcds(pageSize);
  const nextNcdCursor = ncdListings
    .map((listing) => listing.last_updated_sort)
    .sort()
    .at(-1) ?? ncdCursor?.cursor ?? null;

  for (const listing of ncdListings) {
    if (ncdCursor?.cursor && listing.last_updated_sort <= ncdCursor.cursor) {
      continue;
    }

    const detail = await options.client.getNcd(listing.document_id, listing.document_version);
    const rules = toNcdRules(listing, detail, syncedAt);
    if (rules.length === 0) {
      continue;
    }

    await options.repository.upsertRules(rules);
    processedDocuments += 1;
    upsertedRules += rules.length;
  }

  if (nextNcdCursor) {
    await options.repository.setSyncCursor({
      source: "cms_ncd",
      cursor: nextNcdCursor,
      lastSuccessfulRunAt: syncedAt
    });
  }

  return {
    processedDocuments,
    upsertedRules
  };
}
