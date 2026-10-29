"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { Package } from "@/content/types";
import { ConciergeButton } from "../shared/ConciergeButton";
import { GlowGroup } from "../shared/GlowGroup";
import { pad, price, type Currency } from "../shared/helpers";

const gridCols: Record<number, string> = {
  1: "md:grid-cols-1 max-w-xl",
  2: "md:grid-cols-2 max-w-5xl",
  3: "md:grid-cols-2 xl:grid-cols-3",
};

export function Packages({
  packages,
  serviceTitle,
  serviceSlug,
}: {
  packages: Package[];
  serviceTitle: string;
  serviceSlug: string;
}) {
  const [currency, setCurrency] = useState<Currency>("ZAR");

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between light:-mx-[var(--gutter)] light:border-b light:border-line light:px-[var(--gutter)] light:py-5">
        <p className="text-sm text-fg-muted">
          “From” prices — your written quote confirms the final scope and price.
        </p>
        <div role="group" aria-label="Currency" className="inline-flex w-fit rounded-full border border-line-strong bg-bg/60 p-1 backdrop-blur light:rounded-[6px] light:bg-surface light:p-0 light:backdrop-blur-none">
          {(["ZAR", "USD"] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={currency === c}
              onClick={() => setCurrency(c)}
              className={clsx(
                "rounded-full px-4 py-1.5 font-mono text-xs font-semibold tracking-[0.1em] transition-colors duration-300 light:rounded-[5px] light:px-5 light:py-2.5 light:text-[13px] light:tracking-normal",
                currency === c ? "bg-fg text-bg light:bg-accent light:text-accent-ink" : "text-fg-muted hover:text-fg",
              )}
            >
              {c === "ZAR" ? "ZAR R" : "USD $"}
            </button>
          ))}
        </div>
      </div>

      <GlowGroup as="ul" className={clsx("mkp-cells mt-8 grid gap-5", gridCols[packages.length] ?? "md:grid-cols-2 xl:grid-cols-3")}>
        {packages.map((p, i) => {
          const amount = currency === "ZAR" ? p.priceFromZar : p.priceFromUsd;
          return (
            <li key={p.name} className="mkp-card flex flex-col p-6 md:p-8 light:py-10 md:light:py-12">
              <span className="mkp-card-edge" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--glow)] light:text-[13px] light:normal-case light:tracking-normal">Package {pad(i + 1)}</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight light:text-3xl light:font-normal">{p.name}</h3>
                </div>
                {p.purchasable && (
                  <span className="shrink-0 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-accent light:rounded-none light:border-0 light:bg-tint-neon light:px-2 light:text-xs light:normal-case light:tracking-normal light:text-black">
                    Buy online
                  </span>
                )}
              </div>

              <p className="mt-8">
                <span className="eyebrow block">From</span>
                <span className="mt-2 block overflow-hidden">
                  <span key={currency} className="mkp-price-in mkp-figures display block text-[clamp(2.5rem,4vw,3.5rem)]">
                    {price(amount, currency)}
                  </span>
                </span>
                <span className="mt-2 flex items-center gap-2 font-mono text-xs text-fg-muted">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--glow)] light:rounded-none" />
                  Timeline: {p.timeline}
                </span>
              </p>

              <ul className="mt-7 space-y-3 border-t border-line pt-6">
                {p.includes.map((inc) => (
                  <li key={inc} className="flex gap-3 text-[0.95rem] leading-relaxed text-fg-muted">
                    <svg aria-hidden viewBox="0 0 16 16" className="mt-1 h-4 w-4 shrink-0 text-[var(--glow)]">
                      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {inc}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-8">
                {p.purchasable ? (
                  <ConciergeButton
                    serviceSlug={serviceSlug}
                    seedPrompt={`I'd like to buy the ${p.name} package for ${serviceTitle}`}
                    className="w-full"
                    magnetic={false}
                    cursorLabel="Buy"
                  >
                    Buy via Byte <span aria-hidden>→</span>
                  </ConciergeButton>
                ) : (
                  <ConciergeButton
                    variant="outline"
                    serviceSlug={serviceSlug}
                    seedPrompt={`I'd like a quote for the ${p.name} package for ${serviceTitle}.`}
                    className="w-full"
                    magnetic={false}
                    cursorLabel="Quote"
                  >
                    Request a quote
                  </ConciergeButton>
                )}
              </div>
            </li>
          );
        })}
      </GlowGroup>
    </div>
  );
}
