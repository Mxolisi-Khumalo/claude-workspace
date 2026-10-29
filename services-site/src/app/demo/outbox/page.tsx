import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireOutboxAccess } from "@/app/admin/guard";
import { getStore, isMockEmail } from "@/lib/integrations";

export const metadata: Metadata = {
  title: "Demo outbox",
  robots: { index: false, follow: false },
};

export const instant = false;

const fmt = new Intl.DateTimeFormat("en-ZA", {
  timeZone: process.env.OWNER_TIMEZONE ?? "Africa/Johannesburg",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Links found in the plain-text part, so demo visitors can follow them (the preview iframe is fully sandboxed). */
function linksIn(text: string) {
  return [...new Set(text.match(/https?:\/\/[^\s<>"')\]]+/g) ?? [])].slice(0, 8);
}

/** Every email the mock provider captured instead of sending, newest first. */
export default async function OutboxPage() {
  await connection();
  if (!isMockEmail()) notFound();
  await requireOutboxAccess();

  const entries = (await getStore().listOutbox(100)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <section className="container-x pb-24 pt-32">
      <div className="mx-auto max-w-4xl">
        <p className="rounded-full border border-amber/40 bg-amber/10 px-4 py-2 text-center font-mono text-xs text-amber light:rounded-none light:border-0 light:bg-tint-olive light:text-black">
          Demo mode — emails are captured here instead of being sent
        </p>
        <p className="eyebrow mt-10">Mock email provider</p>
        <h1 className="display mt-3 text-4xl sm:text-5xl">Outbox</h1>
        <p className="mt-4 max-w-2xl text-fg-muted">
          Verification codes, quotes, invoices, booking confirmations, receipts and owner notifications from the concierge
          land here. With a Resend key configured they are delivered for real.
        </p>

        {entries.length === 0 ? (
          <p className="mt-10 rounded-[var(--radius)] border border-dashed border-line px-5 py-8 text-center text-sm text-fg-subtle">
            Nothing yet. Ask the concierge for a quote or a call and the emails will show up here.
          </p>
        ) : (
          <ol className="mt-10 space-y-3">
            {entries.map((e, i) => {
              const links = linksIn(e.text);
              return (
                <li key={e.id}>
                  <details open={i === 0} className="group rounded-[var(--radius)] border border-line bg-surface/80 backdrop-blur-md light:rounded-none light:bg-surface light:backdrop-blur-none">
                    <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4">
                      <span className="font-mono text-xs text-fg-subtle">{fmt.format(new Date(e.createdAt))}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold text-fg">{e.subject}</span>
                      <span className="font-mono text-xs text-fg-muted">to {e.to.join(", ")}</span>
                      {e.attachments.map((name) => (
                        <span key={name} className="rounded-full border border-line-strong px-2 py-0.5 font-mono text-[11px] text-sky light:rounded-[4px]">
                          {name}
                        </span>
                      ))}
                    </summary>
                    <div className="border-t border-line p-4">
                      <iframe
                        title={`Email preview: ${e.subject}`}
                        srcDoc={e.html}
                        sandbox=""
                        loading="lazy"
                        className="h-[560px] w-full rounded-[var(--radius-sm)] bg-white"
                      />
                      {links.length > 0 && (
                        <div className="mt-4">
                          <p className="eyebrow">Links in this email</p>
                          <ul className="mt-2 space-y-1">
                            {links.map((href) => (
                              <li key={href} className="truncate font-mono text-xs">
                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                                  {href}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
