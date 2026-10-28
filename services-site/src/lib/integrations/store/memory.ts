import "server-only";

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

/** Everything the store holds, as one JSON-serialisable object. */
export interface StoreData {
  conversations: Record<string, ConversationRecord>;
  leads: Record<string, Lead>;
  quotes: Record<string, QuoteRecord>;
  invoices: Record<string, InvoiceRecord>;
  bookings: Record<string, BookingRecord>;
  actions: Record<string, PendingAction>;
  /** Newest first. */
  outbox: OutboxEntry[];
  /** `${provider}\u0000${eventId}` -> first-seen ISO time. */
  webhookEvents: Record<string, string>;
  counters: Record<string, number>;
  /** Throttle windows from incrementCounter: key -> count and window end (epoch ms). */
  rateCounters: Record<string, { count: number; resetAt: number }>;
}

export const emptyStoreData = (): StoreData => ({
  conversations: {},
  leads: {},
  quotes: {},
  invoices: {},
  bookings: {},
  actions: {},
  outbox: [],
  webhookEvents: {},
  counters: {},
  rateCounters: {},
});

const clone = <T>(v: T): T => (v === undefined ? v : structuredClone(v));
const byCreated = <T extends { createdAt: string }>(a: T, b: T) => a.createdAt.localeCompare(b.createdAt);
const eventKey = (provider: string, eventId: string) => `${provider}\u0000${eventId}`;

/**
 * In-memory Store. Records are cloned on the way in and out so callers can
 * never mutate stored state by accident. `read`/`write` are the only access
 * points, which lets the file store add loading and persistence around them.
 */
export class MemoryStore implements AppStore {
  readonly kind: string = "memory";

  constructor(protected data: StoreData = emptyStoreData()) {}

  protected async read<T>(fn: (d: StoreData) => T): Promise<T> {
    return clone(fn(this.data));
  }

  protected async write<T>(fn: (d: StoreData) => T): Promise<T> {
    return clone(fn(this.data));
  }

  getConversation(sessionId: string) {
    return this.read((d) => d.conversations[sessionId] ?? null);
  }
  async saveConversation(conv: ConversationRecord) {
    await this.write((d) => void (d.conversations[conv.sessionId] = clone(conv)));
  }
  listConversations(limit = DEFAULT_LIST_LIMIT) {
    return this.read((d) =>
      Object.values(d.conversations)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, limit),
    );
  }

  upsertLead(lead: Lead) {
    return this.write((d) => (d.leads[lead.id] = clone(lead)));
  }
  getLead(id: string) {
    return this.read((d) => d.leads[id] ?? null);
  }
  getLeadBySession(sessionId: string) {
    return this.read(
      (d) =>
        Object.values(d.leads)
          .filter((l) => l.sessionId === sessionId)
          .sort(byCreated)
          .at(-1) ?? null,
    );
  }
  listLeads(limit = DEFAULT_LIST_LIMIT) {
    return this.read((d) => Object.values(d.leads).sort(byCreated).reverse().slice(0, limit));
  }

  saveQuote(q: QuoteRecord) {
    return this.write((d) => (d.quotes[q.id] = clone(q)));
  }
  getQuote(id: string) {
    return this.read((d) => d.quotes[id] ?? null);
  }
  listQuotes(leadId?: string) {
    return this.read((d) =>
      Object.values(d.quotes)
        .filter((q) => !leadId || q.leadId === leadId)
        .sort(byCreated),
    );
  }

  saveInvoice(i: InvoiceRecord) {
    return this.write((d) => (d.invoices[i.id] = clone(i)));
  }
  getInvoice(id: string) {
    return this.read((d) => d.invoices[id] ?? null);
  }
  getInvoiceByReference(reference: string) {
    return this.read(
      (d) =>
        Object.values(d.invoices).find((i) => i.payment?.reference === reference) ??
        Object.values(d.invoices).find((i) => i.number === reference) ??
        null,
    );
  }
  listInvoices(leadId?: string) {
    return this.read((d) =>
      Object.values(d.invoices)
        .filter((i) => !leadId || i.leadId === leadId)
        .sort(byCreated),
    );
  }

  saveBooking(b: BookingRecord) {
    return this.write((d) => (d.bookings[b.id] = clone(b)));
  }
  listBookings(leadId?: string) {
    return this.read((d) =>
      Object.values(d.bookings)
        .filter((b) => !leadId || b.leadId === leadId)
        .sort((a, b) => a.start.localeCompare(b.start)),
    );
  }
  getBookingByProviderId(providerBookingId: string) {
    return this.read(
      (d) =>
        Object.values(d.bookings)
          .filter((b) => b.providerBookingId === providerBookingId)
          .sort((a, b) => b.start.localeCompare(a.start))[0] ?? null,
    );
  }

  savePendingAction(a: PendingAction) {
    return this.write((d) => (d.actions[a.id] = clone(a)));
  }
  getPendingAction(id: string) {
    return this.read((d) => d.actions[id] ?? null);
  }

  async saveOutboxEntry(e: OutboxEntry) {
    await this.write((d) => {
      d.outbox = [clone(e), ...d.outbox.filter((o) => o.id !== e.id)].slice(0, OUTBOX_CAP);
    });
  }
  listOutbox(limit = 50) {
    return this.read((d) => d.outbox.slice(0, limit));
  }

  recordWebhookEvent(provider: string, eventId: string) {
    return this.write((d) => {
      const key = eventKey(provider, eventId);
      if (d.webhookEvents[key]) return false;
      d.webhookEvents[key] = new Date().toISOString();
      return true;
    });
  }
  hasWebhookEvent(provider: string, eventId: string) {
    return this.read((d) => Boolean(d.webhookEvents[eventKey(provider, eventId)]));
  }

  nextSequence(name: "quote" | "invoice") {
    return this.write((d) => {
      const key = sequenceKey(name);
      d.counters[key] = (d.counters[key] ?? 0) + 1;
      return d.counters[key];
    });
  }

  incrementCounter(key: string, windowSeconds: number) {
    return this.write((d) => {
      const now = Date.now();
      const current = d.rateCounters[key];
      const entry =
        current && current.resetAt > now ? { ...current, count: current.count + 1 } : { count: 1, resetAt: now + windowSeconds * 1000 };
      d.rateCounters[key] = entry;
      if (entry.count === 1) {
        for (const [k, v] of Object.entries(d.rateCounters)) if (v.resetAt <= now) delete d.rateCounters[k];
      }
      return entry.count;
    });
  }
}
