import Link from "next/link";
import { connection } from "next/server";
import type { Currency } from "@/lib/chat/types";
import { getStore, integrationStatus } from "@/lib/integrations";
import { requireAdmin } from "./guard";
import { AdminHeader, ExternalLink, Pill, Section, StatusPill, Table, fmtDate, money } from "./ui";

export const instant = false;

const newestFirst = <T,>(key: (item: T) => string) => (a: T, b: T) => key(b).localeCompare(key(a));
const MOCKISH = /mock|memory|file|stub|demo|console|outbox/i;

function IntegrationChips() {
  const status = integrationStatus() as unknown as Record<string, unknown>;
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {Object.entries(status).map(([key, value]) => {
        const label = typeof value === "boolean" ? (value ? "live" : "demo") : String(value);
        const live = typeof value === "boolean" ? value : !MOCKISH.test(label);
        return (
          <Pill key={key} tone={live ? "ok" : "warn"}>
            {key}: {label}
          </Pill>
        );
      })}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface/80 p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-mono text-2xl text-fg">{value}</p>
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

async function loadDashboard() {
  const store = getStore();
  const [leads, quotes, invoices, bookings, conversations] = await Promise.all([
    store.listLeads(200),
    store.listQuotes(),
    store.listInvoices(),
    store.listBookings(),
    store.listConversations(100),
  ]);
  const now = Date.now();
  return {
    storeKind: store.kind,
    leads: leads.sort(newestFirst((l) => l.updatedAt)),
    quotes: quotes.sort(newestFirst((q) => q.createdAt)),
    invoices: invoices.sort(newestFirst((i) => i.createdAt)),
    bookings: bookings.sort(newestFirst((b) => b.start)),
    conversations: conversations.sort(newestFirst((c) => c.updatedAt)),
    upcoming: bookings.filter((b) => b.status !== "cancelled" && new Date(b.start).getTime() > now).length,
  };
}

export default async function AdminDashboard() {
  await connection();
  await requireAdmin("/admin");
  const { storeKind, leads, quotes, invoices, bookings, conversations, upcoming } = await loadDashboard();

  const leadName = new Map(leads.map((l) => [l.id, l.contact?.name || l.contact?.email || "Anonymous"]));
  const leadLink = (id: string) => (
    <Link href={`/admin/leads/${id}`} className="hover:text-accent">
      {leadName.get(id) ?? id.slice(0, 12)}
    </Link>
  );

  const paid = invoices.filter((i) => i.status === "paid");
  const revenue = (["ZAR", "USD"] as Currency[])
    .map((c) => [c, paid.filter((i) => i.currency === c).reduce((sum, i) => sum + i.total, 0)] as const)
    .filter(([, total]) => total > 0);

  return (
    <>
      <AdminHeader eyebrow={`Admin · store: ${storeKind}`} title="Dashboard" />
      <IntegrationChips />

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Leads" value={leads.length} hint={`${leads.filter((l) => l.emailVerifiedAt).length} verified`} />
        <Stat label="Quotes" value={quotes.length} hint={`${quotes.filter((q) => q.status === "accepted").length} accepted`} />
        <Stat label="Invoices" value={invoices.length} hint={`${invoices.filter((i) => i.status === "open").length} open`} />
        <Stat
          label="Paid"
          value={revenue.length ? revenue.map(([c, t]) => money(t, c)).join(" · ") : "—"}
          hint={`${paid.length} invoice${paid.length === 1 ? "" : "s"}`}
        />
        <Stat label="Upcoming calls" value={upcoming} />
      </div>

      <Section title="Leads" count={leads.length}>
        <Table
          head={["Name", "Email", "Verified", "Services", "Status", "Budget", "Updated"]}
          empty="No leads yet. They appear once a visitor starts chatting."
          rows={leads.map((l) => [
            leadLink(l.id),
            l.contact?.email ?? "—",
            l.emailVerifiedAt ? <Pill tone="ok">yes</Pill> : <Pill>no</Pill>,
            l.serviceSlugs.join(", ") || "—",
            <StatusPill key="s" status={l.status} />,
            l.budget ?? "—",
            fmtDate(l.updatedAt),
          ])}
        />
      </Section>

      <Section title="Quotes" count={quotes.length}>
        <Table
          head={["Number", "Lead", "Total", "Status", "Created", "Valid until"]}
          empty="No quotes yet."
          rows={quotes.map((q) => [
            <span key="n" className="font-mono">{q.number}</span>,
            leadLink(q.leadId),
            <span key="t" className="font-mono">{money(q.total, q.currency)}</span>,
            <StatusPill key="s" status={q.status} />,
            fmtDate(q.createdAt),
            fmtDate(q.validUntil),
          ])}
        />
      </Section>

      <Section title="Invoices" count={invoices.length}>
        <Table
          head={["Number", "Lead", "Purpose", "Total", "Status", "Paid at"]}
          empty="No invoices yet."
          rows={invoices.map((i) => [
            <span key="n" className="font-mono">{i.number}</span>,
            leadLink(i.leadId),
            i.purpose,
            <span key="t" className="font-mono">
              {money(i.total, i.currency)}
              {i.payment?.charged && (
                <span className="block text-xs text-fg-subtle">charged {money(i.payment.charged.amount, i.payment.charged.currency)}</span>
              )}
            </span>,
            <StatusPill key="s" status={i.status} />,
            fmtDate(i.paidAt),
          ])}
        />
      </Section>

      <Section title="Bookings" count={bookings.length}>
        <Table
          head={["Start", "Lead", "Status", "Provider", "Meeting"]}
          empty="No calls booked yet."
          rows={bookings.map((b) => [
            fmtDate(b.start),
            leadLink(b.leadId),
            <StatusPill key="s" status={b.status} />,
            b.provider,
            b.meetingUrl ? <ExternalLink href={b.meetingUrl}>Join link</ExternalLink> : "—",
          ])}
        />
      </Section>

      <Section title="Conversations" count={conversations.length}>
        <Table
          head={["Session", "Lead", "Turns", "Tokens (in / out / cache)", "Updated"]}
          empty="No conversations yet."
          rows={conversations.map((c) => [
            <Link key="id" href={`/admin/conversations/${encodeURIComponent(c.sessionId)}`} className="font-mono hover:text-accent">
              {c.sessionId.slice(0, 10)}…
            </Link>,
            c.leadId ? leadLink(c.leadId) : "—",
            c.turns,
            <span key="u" className="font-mono text-xs">
              {c.usage ? `${c.usage.input} / ${c.usage.output} / ${c.usage.cacheRead + c.usage.cacheWrite}` : "—"}
            </span>,
            fmtDate(c.updatedAt),
          ])}
        />
      </Section>
    </>
  );
}
