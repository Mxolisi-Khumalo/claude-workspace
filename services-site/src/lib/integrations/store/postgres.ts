import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type {
  BookingRecord,
  ConversationRecord,
  InvoiceRecord,
  Lead,
  OutboxEntry,
  PendingAction,
  QuoteRecord,
} from "../types";
import { DEFAULT_LIST_LIMIT, OUTBOX_CAP, sequenceKey, type AppStore } from "./shared";

type Row = Record<string, unknown>;
/** The one driver call the store needs (Neon's `sql.query`); injectable for tests. */
export type QueryFn = (text: string, params?: unknown[]) => Promise<Row[]>;

/**
 * One table per entity: `id` primary key, a few indexed lookup columns and
 * the full record in `doc jsonb`. Created on first use, so a fresh Neon
 * database needs no migration step. Runs as a single DO block holding a
 * transaction-scoped advisory lock, so concurrent cold starts serialise
 * instead of racing on CREATE TABLE.
 */
const SCHEMA_LOCK_KEY = 4_820_117_303;
const SCHEMA = `DO $$
BEGIN
  PERFORM pg_advisory_xact_lock(${SCHEMA_LOCK_KEY});

  CREATE TABLE IF NOT EXISTS conversations (
    id text PRIMARY KEY, lead_id text, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, doc jsonb NOT NULL);
  CREATE INDEX IF NOT EXISTS conversations_updated_at_idx ON conversations (updated_at DESC);

  CREATE TABLE IF NOT EXISTS leads (
    id text PRIMARY KEY, session_id text NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, doc jsonb NOT NULL);
  CREATE INDEX IF NOT EXISTS leads_session_id_idx ON leads (session_id);
  CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);

  CREATE TABLE IF NOT EXISTS quotes (
    id text PRIMARY KEY, lead_id text NOT NULL, created_at timestamptz NOT NULL, doc jsonb NOT NULL);
  CREATE INDEX IF NOT EXISTS quotes_lead_id_idx ON quotes (lead_id);

  CREATE TABLE IF NOT EXISTS invoices (
    id text PRIMARY KEY, lead_id text NOT NULL, number text NOT NULL, reference text, created_at timestamptz NOT NULL, doc jsonb NOT NULL);
  CREATE INDEX IF NOT EXISTS invoices_lead_id_idx ON invoices (lead_id);
  CREATE INDEX IF NOT EXISTS invoices_reference_idx ON invoices (reference);
  CREATE INDEX IF NOT EXISTS invoices_number_idx ON invoices (number);

  CREATE TABLE IF NOT EXISTS bookings (
    id text PRIMARY KEY, lead_id text NOT NULL, start_at timestamptz NOT NULL, doc jsonb NOT NULL);
  CREATE INDEX IF NOT EXISTS bookings_lead_id_idx ON bookings (lead_id);
  CREATE INDEX IF NOT EXISTS bookings_provider_booking_id_idx ON bookings ((doc->>'providerBookingId'));

  CREATE TABLE IF NOT EXISTS pending_actions (
    id text PRIMARY KEY, session_id text NOT NULL, created_at timestamptz NOT NULL, doc jsonb NOT NULL);

  CREATE TABLE IF NOT EXISTS outbox (
    id text PRIMARY KEY, created_at timestamptz NOT NULL, doc jsonb NOT NULL);
  CREATE INDEX IF NOT EXISTS outbox_created_at_idx ON outbox (created_at DESC);

  CREATE TABLE IF NOT EXISTS webhook_events (
    provider text NOT NULL, event_id text NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (provider, event_id));

  CREATE TABLE IF NOT EXISTS counters (name text PRIMARY KEY, value integer NOT NULL);

  CREATE TABLE IF NOT EXISTS rate_counters (key text PRIMARY KEY, count integer NOT NULL, reset_at timestamptz NOT NULL);
END $$`;

/** jsonb rejects U+0000, so NUL characters are dropped from string values. */
const json = (v: unknown) =>
  JSON.stringify(v, (_key, value: unknown) => (typeof value === "string" ? value.replaceAll("\u0000", "") : value));
const docs = <T>(rows: Row[]) => rows.map((r) => r.doc as T);
const first = <T>(rows: Row[]) => (rows[0]?.doc as T | undefined) ?? null;
const limitOf = (n: number | undefined, fallback: number) => Math.max(1, Math.min(Math.floor(n ?? fallback), 1000));
/** Unscoped lists return the newest rows (oldest first, like the memory store) up to this cap. */
const UNSCOPED_LIMIT = 1000;

/** Neon serverless Postgres (HTTP driver). Parameterised queries only. */
export class PostgresStore implements AppStore {
  readonly kind = "postgres";
  private readonly run: QueryFn;
  private ready: Promise<void> | null = null;

  constructor(connection: string | QueryFn) {
    if (typeof connection === "function") {
      this.run = connection;
    } else {
      const sql: NeonQueryFunction<false, false> = neon(connection);
      this.run = (text, params) => sql.query(text, params) as Promise<Row[]>;
    }
  }

  /** Runs the idempotent schema once per instance; retried on the next call if it fails. */
  private init(): Promise<void> {
    this.ready ??= this.run(SCHEMA).then(
      () => undefined,
      (err) => {
        this.ready = null;
        throw err;
      },
    );
    return this.ready;
  }

  private async q(text: string, params: unknown[] = []): Promise<Row[]> {
    await this.init();
    return this.run(text, params);
  }

  async getConversation(sessionId: string) {
    return first<ConversationRecord>(await this.q(`SELECT doc FROM conversations WHERE id = $1`, [sessionId]));
  }
  async saveConversation(conv: ConversationRecord) {
    await this.q(
      `INSERT INTO conversations (id, lead_id, created_at, updated_at, doc) VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (id) DO UPDATE SET lead_id = EXCLUDED.lead_id, updated_at = EXCLUDED.updated_at, doc = EXCLUDED.doc`,
      [conv.sessionId, conv.leadId ?? null, conv.createdAt, conv.updatedAt, json(conv)],
    );
  }
  async listConversations(limit?: number) {
    return docs<ConversationRecord>(
      await this.q(`SELECT doc FROM conversations ORDER BY updated_at DESC LIMIT $1`, [limitOf(limit, DEFAULT_LIST_LIMIT)]),
    );
  }

  async upsertLead(lead: Lead) {
    await this.q(
      `INSERT INTO leads (id, session_id, created_at, updated_at, doc) VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (id) DO UPDATE SET session_id = EXCLUDED.session_id, updated_at = EXCLUDED.updated_at, doc = EXCLUDED.doc`,
      [lead.id, lead.sessionId, lead.createdAt, lead.updatedAt, json(lead)],
    );
    return lead;
  }
  async getLead(id: string) {
    return first<Lead>(await this.q(`SELECT doc FROM leads WHERE id = $1`, [id]));
  }
  async getLeadBySession(sessionId: string) {
    return first<Lead>(
      await this.q(`SELECT doc FROM leads WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1`, [sessionId]),
    );
  }
  async listLeads(limit?: number) {
    return docs<Lead>(
      await this.q(`SELECT doc FROM leads ORDER BY created_at DESC LIMIT $1`, [limitOf(limit, DEFAULT_LIST_LIMIT)]),
    );
  }

  async saveQuote(q: QuoteRecord) {
    await this.q(
      `INSERT INTO quotes (id, lead_id, created_at, doc) VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (id) DO UPDATE SET lead_id = EXCLUDED.lead_id, doc = EXCLUDED.doc`,
      [q.id, q.leadId, q.createdAt, json(q)],
    );
    return q;
  }
  async getQuote(id: string) {
    return first<QuoteRecord>(await this.q(`SELECT doc FROM quotes WHERE id = $1`, [id]));
  }
  async listQuotes(leadId?: string) {
    return docs<QuoteRecord>(
      leadId
        ? await this.q(`SELECT doc FROM quotes WHERE lead_id = $1 ORDER BY created_at`, [leadId])
        : await this.q(
            `SELECT doc FROM (SELECT doc, created_at FROM quotes ORDER BY created_at DESC LIMIT $1) newest ORDER BY created_at`,
            [UNSCOPED_LIMIT],
          ),
    );
  }

  async saveInvoice(i: InvoiceRecord) {
    await this.q(
      `INSERT INTO invoices (id, lead_id, number, reference, created_at, doc) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT (id) DO UPDATE SET lead_id = EXCLUDED.lead_id, number = EXCLUDED.number,
         reference = EXCLUDED.reference, doc = EXCLUDED.doc`,
      [i.id, i.leadId, i.number, i.payment?.reference ?? null, i.createdAt, json(i)],
    );
    return i;
  }
  async getInvoice(id: string) {
    return first<InvoiceRecord>(await this.q(`SELECT doc FROM invoices WHERE id = $1`, [id]));
  }
  async getInvoiceByReference(reference: string) {
    return first<InvoiceRecord>(
      await this.q(
        `SELECT doc FROM invoices WHERE reference = $1 OR number = $1
         ORDER BY (reference = $1) DESC NULLS LAST, created_at DESC LIMIT 1`,
        [reference],
      ),
    );
  }
  async listInvoices(leadId?: string) {
    return docs<InvoiceRecord>(
      leadId
        ? await this.q(`SELECT doc FROM invoices WHERE lead_id = $1 ORDER BY created_at`, [leadId])
        : await this.q(
            `SELECT doc FROM (SELECT doc, created_at FROM invoices ORDER BY created_at DESC LIMIT $1) newest ORDER BY created_at`,
            [UNSCOPED_LIMIT],
          ),
    );
  }

  async saveBooking(b: BookingRecord) {
    await this.q(
      `INSERT INTO bookings (id, lead_id, start_at, doc) VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (id) DO UPDATE SET lead_id = EXCLUDED.lead_id, start_at = EXCLUDED.start_at, doc = EXCLUDED.doc`,
      [b.id, b.leadId, b.start, json(b)],
    );
    return b;
  }
  async listBookings(leadId?: string) {
    return docs<BookingRecord>(
      leadId
        ? await this.q(`SELECT doc FROM bookings WHERE lead_id = $1 ORDER BY start_at`, [leadId])
        : await this.q(
            `SELECT doc FROM (SELECT doc, start_at FROM bookings ORDER BY start_at DESC LIMIT $1) newest ORDER BY start_at`,
            [UNSCOPED_LIMIT],
          ),
    );
  }
  async getBookingByProviderId(providerBookingId: string) {
    return first<BookingRecord>(
      await this.q(`SELECT doc FROM bookings WHERE doc->>'providerBookingId' = $1 ORDER BY start_at DESC LIMIT 1`, [
        providerBookingId,
      ]),
    );
  }

  async savePendingAction(a: PendingAction) {
    await this.q(
      `INSERT INTO pending_actions (id, session_id, created_at, doc) VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc`,
      [a.id, a.sessionId, a.createdAt, json(a)],
    );
    return a;
  }
  async getPendingAction(id: string) {
    return first<PendingAction>(await this.q(`SELECT doc FROM pending_actions WHERE id = $1`, [id]));
  }

  async saveOutboxEntry(e: OutboxEntry) {
    await this.q(
      `INSERT INTO outbox (id, created_at, doc) VALUES ($1, $2, $3::jsonb) ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc`,
      [e.id, e.createdAt, json(e)],
    );
    await this.q(
      `DELETE FROM outbox WHERE id IN (SELECT id FROM outbox ORDER BY created_at DESC OFFSET $1)`,
      [OUTBOX_CAP],
    );
  }
  async listOutbox(limit?: number) {
    return docs<OutboxEntry>(await this.q(`SELECT doc FROM outbox ORDER BY created_at DESC LIMIT $1`, [limitOf(limit, 50)]));
  }

  async recordWebhookEvent(provider: string, eventId: string) {
    const rows = await this.q(
      `INSERT INTO webhook_events (provider, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING provider`,
      [provider, eventId],
    );
    return rows.length > 0;
  }
  async hasWebhookEvent(provider: string, eventId: string) {
    const rows = await this.q(`SELECT 1 FROM webhook_events WHERE provider = $1 AND event_id = $2`, [provider, eventId]);
    return rows.length > 0;
  }

  async nextSequence(name: "quote" | "invoice") {
    const rows = await this.q(
      `INSERT INTO counters (name, value) VALUES ($1, 1)
       ON CONFLICT (name) DO UPDATE SET value = counters.value + 1 RETURNING value`,
      [sequenceKey(name)],
    );
    return Number(rows[0]?.value);
  }

  async incrementCounter(key: string, windowSeconds: number) {
    const rows = await this.q(
      `INSERT INTO rate_counters (key, count, reset_at) VALUES ($1, 1, now() + $2::int * interval '1 second')
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rate_counters.reset_at <= now() THEN 1 ELSE rate_counters.count + 1 END,
         reset_at = CASE WHEN rate_counters.reset_at <= now() THEN EXCLUDED.reset_at ELSE rate_counters.reset_at END
       RETURNING count`,
      [key, windowSeconds],
    );
    const count = Number(rows[0]?.count);
    // A new window just opened: a cheap moment to drop windows that have ended.
    if (count === 1) await this.q(`DELETE FROM rate_counters WHERE reset_at <= now()`);
    return count;
  }
}
