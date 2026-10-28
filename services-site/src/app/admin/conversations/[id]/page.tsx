import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { clsx } from "clsx";
import { getStore } from "@/lib/integrations";
import { requireAdmin } from "../../guard";
import { toTranscript } from "../../transcript";
import { AdminHeader, Fields, Pill, Section, fmtDate } from "../../ui";

export const instant = false;

export default async function AdminConversationPage({ params }: PageProps<"/admin/conversations/[id]">) {
  await connection();
  const { id } = await params;
  await requireAdmin(`/admin/conversations/${encodeURIComponent(id)}`);

  const store = getStore();
  const conversation = await store.getConversation(id);
  if (!conversation) notFound();
  const lead = conversation.leadId
    ? await store.getLead(conversation.leadId)
    : await store.getLeadBySession(conversation.sessionId);
  const entries = toTranscript(conversation.messages);
  const usage = conversation.usage;

  return (
    <>
      <AdminHeader
        back={{ href: "/admin", label: "Dashboard" }}
        eyebrow="Conversation"
        title={<span className="font-mono text-2xl sm:text-3xl">{conversation.sessionId.slice(0, 16)}…</span>}
      />

      <Section title="Overview">
        <Fields
          items={[
            [
              "Lead",
              lead ? (
                <Link href={`/admin/leads/${lead.id}`} className="text-accent hover:underline">
                  {lead.contact?.name || lead.contact?.email || lead.id}
                </Link>
              ) : (
                "—"
              ),
            ],
            ["Turns", conversation.turns],
            ["Privacy notice", conversation.privacyAckAt ? `Acknowledged ${fmtDate(conversation.privacyAckAt)}` : "—"],
            [
              "Tokens",
              usage ? (
                <span className="font-mono text-xs">
                  in {usage.input} · out {usage.output} · cache read {usage.cacheRead} · cache write {usage.cacheWrite}
                </span>
              ) : (
                "—"
              ),
            ],
            ["Started", fmtDate(conversation.createdAt)],
            ["Updated", fmtDate(conversation.updatedAt)],
          ]}
        />
      </Section>

      <Section title="Transcript" count={entries.length}>
        {entries.length === 0 ? (
          <p className="text-sm text-fg-subtle">No messages stored.</p>
        ) : (
          <ol className="space-y-3">
            {entries.map((e, i) => (
              <li
                key={i}
                className={clsx(
                  "rounded-[var(--radius)] border p-4",
                  e.role === "user" ? "border-line bg-surface/80" : "border-accent/20 bg-accent/[0.04]",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={clsx("eyebrow", e.role === "assistant" && "text-accent")}>
                    {e.role === "user" ? "Visitor" : "Concierge"}
                  </span>
                  {e.tools.map((t, j) => (
                    <Pill key={j} tone="info">
                      tool: {t}
                    </Pill>
                  ))}
                </div>
                {e.text && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg">{e.text}</p>}
                {e.context && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
                      App context
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-fg-subtle">{e.context}</pre>
                  </details>
                )}
              </li>
            ))}
          </ol>
        )}
      </Section>
    </>
  );
}
