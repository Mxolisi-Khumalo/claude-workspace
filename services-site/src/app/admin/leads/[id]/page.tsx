import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { documentUrl } from "@/lib/documents";
import { getStore } from "@/lib/integrations";
import { requireAdmin } from "../../guard";
import { AdminHeader, ExternalLink, Fields, Pill, Section, StatusPill, Table, fmtDate, money } from "../../ui";

export const instant = false;

export default async function AdminLeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  await connection();
  const { id } = await params;
  await requireAdmin(`/admin/leads/${encodeURIComponent(id)}`);

  const store = getStore();
  const lead = await store.getLead(id);
  if (!lead) notFound();
  const [quotes, invoices, bookings, conversation] = await Promise.all([
    store.listQuotes(lead.id),
    store.listInvoices(lead.id),
    store.listBookings(lead.id),
    store.getConversation(lead.sessionId),
  ]);
  const c = lead.contact;

  return (
    <>
      <AdminHeader
        back={{ href: "/admin", label: "Dashboard" }}
        eyebrow={`Lead · ${lead.id}`}
        title={c?.name || c?.email || "Anonymous visitor"}
        actions={
          <a
            href={`/admin/leads/${encodeURIComponent(lead.id)}/export`}
            className="rounded-[var(--radius-button)] bg-accent px-4 py-2 text-xs font-semibold text-accent-ink transition-[box-shadow,background-color] hover:shadow-[var(--glow-accent)] light:hover:bg-accent-hover light:hover:shadow-none"
          >
            Export JSON
          </a>
        }
      />

      <Section title="Details">
        <Fields
          items={[
            ["Status", <StatusPill key="s" status={lead.status} />],
            ["Email", c?.email ? <a href={`mailto:${c.email}`} className="text-accent hover:underline">{c.email}</a> : "—"],
            ["Email verified", lead.emailVerifiedAt ? <Pill tone="ok">{fmtDate(lead.emailVerifiedAt)}</Pill> : <Pill>not verified</Pill>],
            ["Company", c?.company || "—"],
            ["Phone", c?.phone || "—"],
            ["POPIA consent", c?.consent ? "Given with contact form" : "—"],
            ["Services", lead.serviceSlugs.join(", ") || "—"],
            ["Budget", lead.budget || "—"],
            ["Timeline", lead.timeline || "—"],
            ["Summary", lead.summary ? <p className="whitespace-pre-wrap text-fg-muted">{lead.summary}</p> : "—"],
            [
              "Conversation",
              conversation ? (
                <Link href={`/admin/conversations/${encodeURIComponent(lead.sessionId)}`} className="font-mono text-accent hover:underline">
                  {lead.sessionId.slice(0, 10)}… · {conversation.turns} turns
                </Link>
              ) : (
                <span className="font-mono">{lead.sessionId.slice(0, 10)}…</span>
              ),
            ],
            ["Source", lead.source],
            ["Created", fmtDate(lead.createdAt)],
            ["Updated", fmtDate(lead.updatedAt)],
          ]}
        />
      </Section>

      <Section title="Quotes" count={quotes.length}>
        <Table
          head={["Number", "Total", "Deposit", "Status", "Valid until", "PDF"]}
          empty="No quotes for this lead."
          rows={quotes.map((q) => [
            <span key="n" className="font-mono">{q.number}</span>,
            <span key="t" className="font-mono">{money(q.total, q.currency)}</span>,
            `${q.depositPercent}%`,
            <StatusPill key="s" status={q.status} />,
            fmtDate(q.validUntil),
            <ExternalLink key="pdf" href={documentUrl("quote", q.id)}>Open</ExternalLink>,
          ])}
        />
      </Section>

      <Section title="Invoices" count={invoices.length}>
        <Table
          head={["Number", "Purpose", "Total", "Status", "Due", "Paid at", "Payment", "PDF"]}
          empty="No invoices for this lead."
          rows={invoices.map((i) => [
            <span key="n" className="font-mono">{i.number}</span>,
            i.purpose,
            <span key="t" className="font-mono">{money(i.total, i.currency)}</span>,
            <StatusPill key="s" status={i.status} />,
            fmtDate(i.dueDate),
            fmtDate(i.paidAt),
            i.payment ? (
              <span className="font-mono text-xs">
                {i.payment.provider} · {i.payment.reference}
              </span>
            ) : (
              "—"
            ),
            <ExternalLink key="pdf" href={documentUrl("invoice", i.id)}>Open</ExternalLink>,
          ])}
        />
      </Section>

      <Section title="Bookings" count={bookings.length}>
        <Table
          head={["Start", "End", "Time zone", "Status", "Provider", "Meeting"]}
          empty="No calls booked."
          rows={bookings.map((b) => [
            fmtDate(b.start),
            fmtDate(b.end),
            b.timezone,
            <StatusPill key="s" status={b.status} />,
            b.provider,
            b.meetingUrl ? <ExternalLink key="m" href={b.meetingUrl}>Join link</ExternalLink> : "—",
          ])}
        />
      </Section>
    </>
  );
}
