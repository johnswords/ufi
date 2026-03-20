import { PGlite } from "@electric-sql/pglite";
import type { PayerRule, PayerRuleCriterion } from "@ufi/shared";
import { eq, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export interface CmsSyncCursor {
  readonly lcdUpdatedOnSort: string | null;
  readonly ncdUpdatedOnSort: string | null;
  readonly lastRunAt: string | null;
}

const payerRulesTable = pgTable(
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
    criteria: jsonb("criteria").$type<PayerRuleCriterion[]>().notNull(),
    effectiveDate: text("effective_date").notNull(),
    expirationDate: text("expiration_date"),
    active: boolean("active").notNull(),
    lastSyncedAt: text("last_synced_at").notNull()
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.sourceType, table.sourceDocumentId, table.cptCode]
    })
  })
);

const syncCursorTable = pgTable("sync_cursor", {
  key: text("key").primaryKey(),
  payload: jsonb("payload").$type<CmsSyncCursor>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

type Database = ReturnType<typeof drizzle>;

function toRow(rule: PayerRule) {
  return {
    sourceType: rule.sourceType,
    sourceDocumentId: rule.sourceDocumentId,
    sourceDocumentVersion: rule.sourceDocumentVersion,
    sourceUrl: rule.sourceUrl,
    cptCode: rule.cptCode,
    cptDescription: rule.cptDescription ?? null,
    payer: rule.payer,
    payerPlanCategory: rule.payerPlanCategory ?? null,
    title: rule.title,
    criteria: rule.criteria,
    effectiveDate: rule.effectiveDate,
    expirationDate: rule.expirationDate ?? null,
    active: rule.active,
    lastSyncedAt: rule.lastSyncedAt
  };
}

function fromRow(row: typeof payerRulesTable.$inferSelect): PayerRule {
  return {
    sourceType: row.sourceType as PayerRule["sourceType"],
    sourceDocumentId: row.sourceDocumentId,
    sourceDocumentVersion: row.sourceDocumentVersion,
    sourceUrl: row.sourceUrl,
    cptCode: row.cptCode,
    cptDescription: row.cptDescription ?? undefined,
    payer: row.payer,
    payerPlanCategory: row.payerPlanCategory ?? undefined,
    title: row.title,
    criteria: row.criteria,
    effectiveDate: row.effectiveDate,
    expirationDate: row.expirationDate ?? undefined,
    active: row.active,
    lastSyncedAt: row.lastSyncedAt
  };
}

export class PayerRulesRepository {
  private readonly connection: PGlite;
  private readonly db: Database;

  public constructor(connection?: PGlite) {
    this.connection = connection ?? new PGlite();
    this.db = drizzle(this.connection);
  }

  public async migrate(): Promise<void> {
    await this.connection.exec(`
      create table if not exists payer_rules (
        source_type text not null,
        source_document_id text not null,
        source_document_version integer not null,
        source_url text not null,
        cpt_code text not null,
        cpt_description text,
        payer text not null,
        payer_plan_category text,
        title text not null,
        criteria jsonb not null,
        effective_date text not null,
        expiration_date text,
        active boolean not null,
        last_synced_at text not null,
        primary key (source_type, source_document_id, cpt_code)
      );

      create table if not exists sync_cursor (
        key text primary key,
        payload jsonb not null,
        updated_at timestamptz not null default now()
      );
    `);
  }

  public async upsertRules(rules: PayerRule[]): Promise<void> {
    for (const rule of rules) {
      const row = toRow(rule);
      await this.db
        .insert(payerRulesTable)
        .values(row)
        .onConflictDoUpdate({
          target: [payerRulesTable.sourceType, payerRulesTable.sourceDocumentId, payerRulesTable.cptCode],
          set: row
        });
    }
  }

  public async listRules(): Promise<PayerRule[]> {
    const rows = await this.db.select().from(payerRulesTable);
    return rows.map(fromRow);
  }

  public async countRules(): Promise<number> {
    const rows = await this.db.select({ value: count() }).from(payerRulesTable);
    return rows[0]?.value ?? 0;
  }

  public async getCursor(key: string): Promise<CmsSyncCursor | null> {
    const rows = await this.db.select().from(syncCursorTable).where(eq(syncCursorTable.key, key));
    const row = rows[0];
    if (!row) {
      return null;
    }

    const payload = row.payload;
    return {
      lcdUpdatedOnSort: payload.lcdUpdatedOnSort ?? null,
      ncdUpdatedOnSort: payload.ncdUpdatedOnSort ?? null,
      lastRunAt: payload.lastRunAt ?? null
    };
  }

  public async setCursor(key: string, payload: CmsSyncCursor): Promise<void> {
    await this.db
      .insert(syncCursorTable)
      .values({ key, payload: { ...payload } })
      .onConflictDoUpdate({
        target: syncCursorTable.key,
        set: {
          payload: { ...payload },
          updatedAt: new Date()
        }
      });
  }
}
