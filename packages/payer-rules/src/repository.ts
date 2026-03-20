import { PGlite } from "@electric-sql/pglite";
import {
  type PaRequirement,
  type PayerRule,
  type PayerTransparencyMetrics,
  paRequirementSchema,
  payerRuleSchema,
  payerTransparencyMetricsSchema
} from "@ufi/shared";
import { and, asc, eq, sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, primaryKey, real, text, timestamp } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";

import type { CmsSyncCursor } from "./types.js";

export const payerRulesTable = pgTable(
  "payer_rules",
  {
    sourceType: text("source_type").notNull(),
    sourceDocumentId: text("source_document_id").notNull(),
    sourceDocumentVersion: integer("source_document_version").notNull(),
    sourceUrl: text("source_url").notNull(),
    cptCode: text("cpt_code").notNull(),
    cptDescription: text("cpt_description"),
    payer: text("payer").notNull(),
    payerPlanCategory: text("payer_plan_category"),
    title: text("title").notNull(),
    criteria: jsonb("criteria").$type<PayerRule["criteria"]>().notNull(),
    effectiveDate: text("effective_date").notNull(),
    expirationDate: text("expiration_date"),
    active: boolean("active").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: "string" }).notNull()
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.sourceType, table.sourceDocumentId, table.cptCode]
    })
  })
);

export const syncCursorsTable = pgTable("sync_cursors", {
  source: text("source").primaryKey(),
  cursor: text("cursor"),
  lastSuccessfulRunAt: timestamp("last_successful_run_at", {
    withTimezone: true,
    mode: "string"
  }).notNull()
});

export const paRequirementsTable = pgTable(
  "pa_requirements",
  {
    cptCode: text("cpt_code").notNull(),
    payer: text("payer").notNull(),
    requiresPriorAuth: boolean("requires_prior_auth").notNull(),
    effectiveDate: text("effective_date").notNull(),
    sourceUrl: text("source_url").notNull(),
    notes: text("notes")
  },
  (table) => ({
    pk: primaryKey({ columns: [table.cptCode, table.payer] })
  })
);

export const transparencyMetricsTable = pgTable(
  "transparency_metrics",
  {
    payer: text("payer").notNull(),
    reportingPeriod: text("reporting_period").notNull(),
    serviceCategory: text("service_category"),
    totalRequests: integer("total_requests"),
    approvalRate: real("approval_rate").notNull(),
    denialRate: real("denial_rate").notNull(),
    appealApprovalRate: real("appeal_approval_rate"),
    avgTurnaroundDays: real("avg_turnaround_days"),
    medianTurnaroundDays: real("median_turnaround_days"),
    sourceUrl: text("source_url").notNull(),
    lastUpdated: text("last_updated").notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.payer, table.reportingPeriod, table.serviceCategory] })
  })
);

export interface PayerRulesRepositoryOptions {
  readonly client?: PGlite;
}

function toIsoString(value: string): string {
  return new Date(value).toISOString();
}

function toStoredPayerRule(row: typeof payerRulesTable.$inferSelect): PayerRule {
  return payerRuleSchema.parse({
    ...row,
    payerPlanCategory: row.payerPlanCategory ?? undefined,
    expirationDate: row.expirationDate ?? undefined,
    lastSyncedAt: toIsoString(row.lastSyncedAt)
  });
}

export class PayerRulesRepository {
  private readonly client: PGlite;
  private readonly db: ReturnType<typeof drizzle>;

  public constructor(options: PayerRulesRepositoryOptions = {}) {
    this.client = options.client ?? new PGlite();
    this.db = drizzle(this.client);
  }

  public async migrate(): Promise<void> {
    await this.client.exec(`
      CREATE TABLE IF NOT EXISTS payer_rules (
        source_type text NOT NULL,
        source_document_id text NOT NULL,
        source_document_version integer NOT NULL,
        source_url text NOT NULL,
        cpt_code text NOT NULL,
        cpt_description text,
        payer text NOT NULL,
        payer_plan_category text,
        title text NOT NULL,
        criteria jsonb NOT NULL,
        effective_date text NOT NULL,
        expiration_date text,
        active boolean NOT NULL,
        last_synced_at timestamptz NOT NULL,
        PRIMARY KEY (source_type, source_document_id, cpt_code)
      );

      CREATE TABLE IF NOT EXISTS sync_cursors (
        source text PRIMARY KEY,
        cursor text,
        last_successful_run_at timestamptz NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pa_requirements (
        cpt_code text NOT NULL,
        payer text NOT NULL,
        requires_prior_auth boolean NOT NULL,
        effective_date text NOT NULL,
        source_url text NOT NULL,
        notes text,
        PRIMARY KEY (cpt_code, payer)
      );

      CREATE TABLE IF NOT EXISTS transparency_metrics (
        payer text NOT NULL,
        reporting_period text NOT NULL,
        service_category text NOT NULL DEFAULT '',
        total_requests integer,
        approval_rate real NOT NULL,
        denial_rate real NOT NULL,
        appeal_approval_rate real,
        avg_turnaround_days real,
        median_turnaround_days real,
        source_url text NOT NULL,
        last_updated text NOT NULL,
        PRIMARY KEY (payer, reporting_period, service_category)
      );
    `);
  }

  public async upsertRules(rules: readonly PayerRule[]): Promise<void> {
    if (rules.length === 0) {
      return;
    }

    const records = rules.map((rule) => payerRuleSchema.parse(rule));

    for (const record of records) {
      await this.db
        .insert(payerRulesTable)
        .values(record)
        .onConflictDoUpdate({
          target: [payerRulesTable.sourceType, payerRulesTable.sourceDocumentId, payerRulesTable.cptCode],
          set: {
            sourceDocumentVersion: sql`excluded.source_document_version`,
            sourceUrl: sql`excluded.source_url`,
            cptDescription: sql`excluded.cpt_description`,
            payer: sql`excluded.payer`,
            payerPlanCategory: sql`excluded.payer_plan_category`,
            title: sql`excluded.title`,
            criteria: sql`excluded.criteria`,
            effectiveDate: sql`excluded.effective_date`,
            expirationDate: sql`excluded.expiration_date`,
            active: sql`excluded.active`,
            lastSyncedAt: sql`excluded.last_synced_at`
          }
        });
    }
  }

  public async listRules(): Promise<PayerRule[]> {
    const rows = await this.db
      .select()
      .from(payerRulesTable)
      .orderBy(asc(payerRulesTable.sourceType), asc(payerRulesTable.sourceDocumentId), asc(payerRulesTable.cptCode));

    return rows.map((row) => toStoredPayerRule(row));
  }

  public async countRules(): Promise<number> {
    const rows = await this.db.select({ count: sql<number>`count(*)::int` }).from(payerRulesTable);
    return rows[0]?.count ?? 0;
  }

  public async getSyncCursor(source: CmsSyncCursor["source"]): Promise<CmsSyncCursor | null> {
    const rows = await this.db.select().from(syncCursorsTable).where(eq(syncCursorsTable.source, source)).limit(1);

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      source: row.source as CmsSyncCursor["source"],
      cursor: row.cursor,
      lastSuccessfulRunAt: toIsoString(row.lastSuccessfulRunAt)
    };
  }

  public async setSyncCursor(cursor: CmsSyncCursor): Promise<void> {
    await this.db
      .insert(syncCursorsTable)
      .values(cursor)
      .onConflictDoUpdate({
        target: syncCursorsTable.source,
        set: {
          cursor: sql`excluded.cursor`,
          lastSuccessfulRunAt: sql`excluded.last_successful_run_at`
        }
      });
  }

  public async getRule(
    sourceType: PayerRule["sourceType"],
    sourceDocumentId: string,
    cptCode: string
  ): Promise<PayerRule | null> {
    const rows = await this.db
      .select()
      .from(payerRulesTable)
      .where(
        and(
          eq(payerRulesTable.sourceType, sourceType),
          eq(payerRulesTable.sourceDocumentId, sourceDocumentId),
          eq(payerRulesTable.cptCode, cptCode)
        )
      )
      .limit(1);

    return rows[0] ? toStoredPayerRule(rows[0]) : null;
  }

  public async upsertPaRequirements(requirements: readonly PaRequirement[]): Promise<void> {
    if (requirements.length === 0) return;

    for (const req of requirements) {
      const parsed = paRequirementSchema.parse(req);
      await this.db
        .insert(paRequirementsTable)
        .values({
          ...parsed,
          notes: parsed.notes ?? null
        })
        .onConflictDoUpdate({
          target: [paRequirementsTable.cptCode, paRequirementsTable.payer],
          set: {
            requiresPriorAuth: sql`excluded.requires_prior_auth`,
            effectiveDate: sql`excluded.effective_date`,
            sourceUrl: sql`excluded.source_url`,
            notes: sql`excluded.notes`
          }
        });
    }
  }

  public async getPaRequirements(cptCode: string): Promise<PaRequirement[]> {
    const rows = await this.db
      .select()
      .from(paRequirementsTable)
      .where(eq(paRequirementsTable.cptCode, cptCode))
      .orderBy(asc(paRequirementsTable.payer));

    return rows.map((row) =>
      paRequirementSchema.parse({
        ...row,
        notes: row.notes ?? undefined
      })
    );
  }

  public async upsertTransparencyMetrics(metrics: readonly PayerTransparencyMetrics[]): Promise<void> {
    if (metrics.length === 0) return;

    for (const m of metrics) {
      const parsed = payerTransparencyMetricsSchema.parse(m);
      await this.db
        .insert(transparencyMetricsTable)
        .values({
          ...parsed,
          serviceCategory: parsed.serviceCategory ?? "",
          totalRequests: parsed.totalRequests ?? null,
          appealApprovalRate: parsed.appealApprovalRate ?? null,
          avgTurnaroundDays: parsed.avgTurnaroundDays ?? null,
          medianTurnaroundDays: parsed.medianTurnaroundDays ?? null
        })
        .onConflictDoUpdate({
          target: [
            transparencyMetricsTable.payer,
            transparencyMetricsTable.reportingPeriod,
            transparencyMetricsTable.serviceCategory
          ],
          set: {
            totalRequests: sql`excluded.total_requests`,
            approvalRate: sql`excluded.approval_rate`,
            denialRate: sql`excluded.denial_rate`,
            appealApprovalRate: sql`excluded.appeal_approval_rate`,
            avgTurnaroundDays: sql`excluded.avg_turnaround_days`,
            medianTurnaroundDays: sql`excluded.median_turnaround_days`,
            sourceUrl: sql`excluded.source_url`,
            lastUpdated: sql`excluded.last_updated`
          }
        });
    }
  }

  public async getTransparencyMetrics(payer: string): Promise<PayerTransparencyMetrics[]> {
    const rows = await this.db
      .select()
      .from(transparencyMetricsTable)
      .where(eq(transparencyMetricsTable.payer, payer))
      .orderBy(asc(transparencyMetricsTable.reportingPeriod));

    return rows.map(toStoredMetrics);
  }

  public async getAllTransparencyMetrics(): Promise<PayerTransparencyMetrics[]> {
    const rows = await this.db
      .select()
      .from(transparencyMetricsTable)
      .orderBy(asc(transparencyMetricsTable.payer), asc(transparencyMetricsTable.reportingPeriod));

    return rows.map(toStoredMetrics);
  }
}

function toStoredMetrics(row: typeof transparencyMetricsTable.$inferSelect): PayerTransparencyMetrics {
  return payerTransparencyMetricsSchema.parse({
    payer: row.payer,
    reportingPeriod: row.reportingPeriod,
    serviceCategory: row.serviceCategory || undefined,
    totalRequests: row.totalRequests ?? undefined,
    approvalRate: row.approvalRate,
    denialRate: row.denialRate,
    appealApprovalRate: row.appealApprovalRate ?? undefined,
    avgTurnaroundDays: row.avgTurnaroundDays ?? undefined,
    medianTurnaroundDays: row.medianTurnaroundDays ?? undefined,
    sourceUrl: row.sourceUrl,
    lastUpdated: row.lastUpdated
  });
}

export function createPayerRulesRepository(options: PayerRulesRepositoryOptions = {}): PayerRulesRepository {
  return new PayerRulesRepository(options);
}
