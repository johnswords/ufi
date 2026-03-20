import { PGlite } from "@electric-sql/pglite";
import { payerRuleSchema, type PayerRule } from "@ufi/shared";
import { and, asc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

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

export interface PayerRulesRepositoryOptions {
  readonly client?: PGlite;
}

function toIsoString(value: string): string {
  return new Date(value).toISOString();
}

function toStoredPayerRule(
  row: typeof payerRulesTable.$inferSelect
): PayerRule {
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
      .orderBy(
        asc(payerRulesTable.sourceType),
        asc(payerRulesTable.sourceDocumentId),
        asc(payerRulesTable.cptCode)
      );

    return rows.map((row) => toStoredPayerRule(row));
  }

  public async countRules(): Promise<number> {
    const rows = await this.db.select({ count: sql<number>`count(*)::int` }).from(payerRulesTable);
    return rows[0]?.count ?? 0;
  }

  public async getSyncCursor(source: CmsSyncCursor["source"]): Promise<CmsSyncCursor | null> {
    const rows = await this.db
      .select()
      .from(syncCursorsTable)
      .where(eq(syncCursorsTable.source, source))
      .limit(1);

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
}

export function createPayerRulesRepository(
  options: PayerRulesRepositoryOptions = {}
): PayerRulesRepository {
  return new PayerRulesRepository(options);
}
