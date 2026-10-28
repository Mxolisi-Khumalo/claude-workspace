"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { openConcierge } from "@/lib/chat/concierge-store";
import { useGlow } from "./useGlow";
import { formatPrice, type Currency } from "./utils";

export interface PricingCardData {
  slug: string;
  title: string;
  accent: string;
  from: { zar: number; usd: number };
  packages: { name: string; zar: number; usd: number; timeline: string; purchasable?: boolean }[];
}

function CurrencyToggle({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  const options: Currency[] = ["ZAR", "USD"];
  return (
    <div role="group" aria-label="Currency" className="relative inline-flex rounded-full border border-line-strong bg-bg-elevated/80 p-1 backdrop-blur">
      <span
        aria-hidden
        className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-accent transition-transform duration-500 ease-[var(--ease-out)]"
        style={{ transform: value === "ZAR" ? "translateX(0)" : "translateX(100%)" }}
      />
      {options.map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className={`relative z-[1] w-24 rounded-full py-2 font-mono text-xs font-semibold tracking-[0.12em] transition-colors duration-300 ${
            value === c ? "text-accent-ink" : "text-fg-muted hover:text-fg"
          }`}
        >
          {c === "ZAR" ? "ZAR R" : "USD $"}
        </button>
      ))}
    </div>
  );
}

/** Currency-switchable "from" prices for every service and its packages. */
export function PricingGrid({ items }: { items: PricingCardData[] }) {
  const titles = items.map((s) => ({ title: s.title, accent: s.accent }));
  const [currency, setCurrency] = useState<Currency>("ZAR");
  const host = useRef<HTMLDivElement>(null);
  useGlow(host);
  const price = (p: { zar: number; usd: number }) => formatPrice(currency === "ZAR" ? p.zar : p.usd, currency);

  return (
    <div>
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <CurrencyToggle value={currency} onChange={setCurrency} />
        <p aria-live="polite" className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          Showing {currency === "ZAR" ? "South African rand" : "US dollars"}
        </p>
      </div>

      <div ref={host} className="hm-glow-host grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <article
            key={s.slug}
            className="hm-glow flex flex-col rounded-[var(--radius-lg)] border border-line bg-bg-elevated/80 p-6 md:p-7"
            style={{ "--glow": s.accent } as React.CSSProperties}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold leading-snug tracking-tight text-fg">
                <Link href={`/services/${s.slug}`} className="transition-colors hover:text-accent">
                  {s.title}
                </Link>
              </h3>
              <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: s.accent, boxShadow: `0 0 14px ${s.accent}` }} />
            </div>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">From</p>
            <p className="display mt-1 text-[clamp(2.2rem,3.6vw,3rem)] leading-none tabular-nums">
              {price(s.from)}
            </p>

            <ul className="mt-7 divide-y divide-line border-y border-line text-sm">
              {s.packages.map((p) => (
                <li key={p.name} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="min-w-0">
                    <span className="font-medium text-fg">{p.name}</span>
                    <span className="mt-0.5 block font-mono text-[11px] text-fg-subtle">
                      {p.timeline}
                      {p.purchasable && <span className="text-accent"> · pay online</span>}
                    </span>
                  </span>
                  <span className="whitespace-nowrap tabular-nums text-fg-muted">{price(p)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-7">
              <Button
                variant="outline"
                magnetic={false}
                className="w-full"
                onClick={() => openConcierge({ serviceSlug: s.slug, seedPrompt: `I'd like a quote for ${s.title}` })}
              >
                Get an exact quote <span aria-hidden>→</span>
              </Button>
            </div>
          </article>
        ))}

        <article className="hm-glow relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-[radial-gradient(circle_at_85%_15%,rgb(126_231_135/0.14),transparent_55%)] p-6 md:p-7 lg:col-span-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">Something else?</p>
            <h3 className="display mt-4 max-w-xl text-[clamp(1.9rem,3.2vw,2.8rem)]">Custom builds and mixed scopes.</h3>
            <p className="mt-4 max-w-lg leading-relaxed text-fg-muted">
              Most projects combine a few of these. Describe yours and get a scoped quote built from the same price list —
              or book a call to talk it through.
            </p>
          </div>
          <ul aria-label="Services you can combine" className="mt-8 flex flex-wrap gap-2">
            {titles.map((t, i) => (
              <li key={t.title} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-bg/50 px-3 py-1.5 text-xs text-fg-muted">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: t.accent }} />
                  {t.title}
                </span>
                {i < titles.length - 1 && (
                  <span aria-hidden className="font-mono text-xs text-fg-subtle">
                    +
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => openConcierge({ seedPrompt: "I have a custom project that mixes a few services." })}>
              Describe your project <span aria-hidden>→</span>
            </Button>
          </div>
        </article>
      </div>
    </div>
  );
}
