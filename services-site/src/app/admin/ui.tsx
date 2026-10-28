import Link from "next/link";
import { clsx } from "clsx";
import type { Currency } from "@/lib/chat/types";
import { formatMoney } from "@/lib/concierge/pricing";
import { adminMode } from "./auth";
import { logout } from "./login/actions";

/** Small, dense building blocks for the admin screens (server components only). */

const TZ = process.env.OWNER_TIMEZONE ?? "Africa/Johannesburg";

export function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export const money = (amount: number, currency: Currency) => formatMoney(amount, currency);

export type Tone = "ok" | "warn" | "bad" | "info" | "muted";

const tones: Record<Tone, string> = {
  ok: "border-accent/30 bg-accent/10 text-accent",
  warn: "border-amber/30 bg-amber/10 text-amber",
  bad: "border-pink/30 bg-pink/10 text-pink",
  info: "border-sky/30 bg-sky/10 text-sky",
  muted: "border-line-strong bg-surface-2 text-fg-muted",
};

export function statusTone(status: string): Tone {
  if (["paid", "won", "confirmed", "accepted", "executed"].includes(status)) return "ok";
  if (["open", "sent", "invoiced", "booked", "rescheduled", "quoted"].includes(status)) return "info";
  if (["lost", "void", "cancelled", "expired", "failed"].includes(status)) return "bad";
  if (["new", "draft"].includes(status)) return "warn";
  return "muted";
}

export function Pill({ tone = "muted", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export const StatusPill = ({ status }: { status: string }) => <Pill tone={statusTone(status)}>{status}</Pill>;

export function AdminHeader({
  eyebrow,
  title,
  back,
  actions,
}: {
  eyebrow: string;
  title: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
      <div>
        {back && (
          <Link href={back.href} className="font-mono text-xs text-fg-muted hover:text-accent">
            ← {back.label}
          </Link>
        )}
        <p className="eyebrow mt-3">{eyebrow}</p>
        <h1 className="display mt-2 text-3xl sm:text-4xl">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {actions}
        {adminMode() === "password" && (
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full border border-line-strong px-4 py-2 text-xs font-semibold text-fg-muted transition-colors hover:border-accent hover:text-accent"
            >
              Sign out
            </button>
          </form>
        )}
      </div>
    </header>
  );
}

export function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="flex items-baseline gap-3 text-lg font-semibold tracking-tight">
        {title}
        {count !== undefined && <span className="font-mono text-xs text-fg-subtle">{count}</span>}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Table({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (rows.length === 0) {
    return <p className="rounded-[var(--radius)] border border-dashed border-line px-4 py-6 text-sm text-fg-subtle">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-line bg-surface/80" data-lenis-prevent>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line bg-surface-2/60">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] font-normal uppercase tracking-wider text-fg-subtle">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((cells, i) => (
            <tr key={i} className="transition-colors hover:bg-surface-2/50">
              {cells.map((c, j) => (
                <td key={j} className="px-4 py-2.5 align-top text-fg-muted first:text-fg">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Two-column label/value grid for detail pages. */
export function Fields({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-8 gap-y-3 rounded-[var(--radius)] border border-line bg-surface/80 p-5 text-sm sm:grid-cols-[180px_1fr]">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle sm:pt-0.5">{label}</dt>
          <dd className="min-w-0 break-words text-fg">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
      {children}
    </a>
  );
}
