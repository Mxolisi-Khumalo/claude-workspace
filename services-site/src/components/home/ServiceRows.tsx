"use client";

import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import { MiniBot } from "@/components/concierge/MiniBot";
import { useFinePointer, usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { STRENGTH, formatPrice, pad2 } from "./utils";
import type { EvidenceStrength, Service } from "@/content/types";

export interface ServiceRowData {
  slug: string;
  title: string;
  tagline: string;
  accent: Service["accent"];
  strength: EvidenceStrength;
  fromZar: number;
  fromUsd: number;
  preview: { image?: string; caption: string; tech: string[] };
}

function StrengthBadge({ strength }: { strength: EvidenceStrength }) {
  const s = STRENGTH[strength];
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line-strong bg-bg/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
      <span aria-hidden className="flex items-end gap-[2px]">
        {[1, 2, 3].map((b) => (
          <span
            key={b}
            className="w-[3px] rounded-[1px]"
            style={{ height: 4 + b * 2, background: b <= s.bars ? s.color : "var(--line-strong)" }}
          />
        ))}
      </span>
      {s.label}
    </span>
  );
}

const W = 300;
const H = 200;
/** Offset of the card's bottom-left corner from the pointer. */
const GAP = 28;

/**
 * OFF+BRAND-style numbered service index. On fine pointers a preview card
 * follows the cursor and slides between each service's evidence image; on
 * touch the rows are plain, tappable cards.
 */
export function ServiceRows({ items }: { items: ServiceRowData[] }) {
  const fine = useFinePointer();
  const reduced = usePrefersReducedMotion();
  const showPreview = fine && !reduced;
  const list = useRef<HTMLUListElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const host = list.current;
    const el = card.current;
    if (!showPreview || !host || !el) return;
    gsap.set(el, { scale: 0.6, autoAlpha: 0, transformOrigin: "0% 100%" });
    // Sit above-right of the pointer so the hovered row stays readable; flip
    // left/below near the viewport edges.
    const place = (cx: number, cy: number) => ({
      x: cx + GAP + W > window.innerWidth - 16 ? cx - GAP - W : cx + GAP,
      y: cy - GAP - H < 16 ? cy + GAP : cy - GAP - H,
    });
    const xTo = gsap.quickTo(el, "x", { duration: 0.65, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.65, ease: "power3.out" });
    const rTo = gsap.quickTo(el, "rotation", { duration: 0.8, ease: "power3.out" });
    let lastX = 0;
    let settle = 0;

    const onMove = (e: PointerEvent) => {
      const p = place(e.clientX, e.clientY);
      xTo(p.x);
      yTo(p.y);
      rTo(gsap.utils.clamp(-7, 7, (e.clientX - lastX) * 0.35));
      lastX = e.clientX;
      clearTimeout(settle);
      settle = window.setTimeout(() => rTo(0), 120);
    };
    const onEnter = (e: PointerEvent) => {
      lastX = e.clientX;
      gsap.set(el, place(e.clientX, e.clientY));
      gsap.to(el, { scale: 1, autoAlpha: 1, duration: 0.5, ease: "expo.out", overwrite: "auto" });
    };
    const onLeave = () => gsap.to(el, { scale: 0.6, autoAlpha: 0, duration: 0.35, ease: "power2.in", overwrite: "auto" });

    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      clearTimeout(settle);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [showPreview]);

  return (
    <div className="relative">
      <ul ref={list} className="grid gap-4 md:gap-0 md:border-t md:border-line">
        {items.map((s, i) => (
          <li key={s.slug} className="hm-row" style={{ "--svc": `var(--${s.accent})` } as React.CSSProperties}>
            <Link
              href={`/services/${s.slug}`}
              data-cursor="view"
              data-cursor-label="Explore"
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className="group relative isolate flex flex-col gap-4 overflow-hidden rounded-[var(--radius)] border border-line bg-bg-elevated/70 p-6 md:grid md:grid-cols-[4.5rem_minmax(0,1fr)_auto] md:items-center md:gap-x-8 md:rounded-none md:border-0 md:border-b md:bg-transparent md:px-4 md:py-9 lg:grid-cols-[5.5rem_minmax(0,1fr)_11.5rem_15rem] lg:py-10"
            >
              <span aria-hidden className="hm-row-fill" />
              <span aria-hidden className="hm-row-line hidden md:block" />

              <span className="flex items-center justify-between md:block">
                <span className="font-mono text-sm text-fg-subtle transition-colors duration-300 group-hover:text-[var(--svc)]">
                  {pad2(i + 1)}
                </span>
                <span className="md:hidden">
                  <StrengthBadge strength={s.strength} />
                </span>
              </span>

              <span className="hm-row-shift min-w-0">
                <span className="hm-row-title display block text-[clamp(1.85rem,3.5vw,3.2rem)] leading-[0.95] transition-colors duration-300">
                  {s.title}
                </span>
                <span className="mt-3 block max-w-[58ch] text-base leading-relaxed text-fg-muted">{s.tagline}</span>
              </span>

              <span className="hidden lg:flex lg:justify-end">
                <StrengthBadge strength={s.strength} />
              </span>

              <span className="flex items-center justify-between gap-6 md:justify-end">
                <span className="flex flex-col md:items-end">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">From</span>
                  <span className="whitespace-nowrap text-lg font-semibold tabular-nums text-fg">
                    {formatPrice(s.fromZar, "ZAR")}
                    <span className="text-fg-subtle"> / </span>
                    <span className="text-fg-muted">{formatPrice(s.fromUsd, "USD")}</span>
                  </span>
                  <span className="mt-1.5 hidden md:block lg:hidden">
                    <StrengthBadge strength={s.strength} />
                  </span>
                </span>
                <span
                  aria-hidden
                  className="hm-row-arrow grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line-strong text-lg text-fg"
                >
                  →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {showPreview && (
        <div
          ref={card}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-30 overflow-hidden rounded-[var(--radius)] border border-line-strong bg-surface shadow-[0_40px_100px_-30px_rgb(0_0_0/0.9)]"
          style={{ width: W, height: H, visibility: "hidden" }}
        >
          <div
            className="absolute inset-x-0 top-0 transition-transform duration-700 ease-[var(--ease-out)]"
            style={{ transform: `translateY(${-active * H}px)` }}
          >
            {items.map((s) => (
              <div key={s.slug} className="relative" style={{ height: H }}>
                {s.preview.image ? (
                  <Image src={s.preview.image} alt="" fill sizes={`${W}px`} className="object-cover object-top" />
                ) : (
                  <div
                    className="absolute inset-0 flex flex-col justify-between p-5"
                    style={{
                      background: `radial-gradient(circle at 75% 20%, color-mix(in srgb, var(--${s.accent}) 45%, transparent), transparent 60%), radial-gradient(circle at 10% 100%, rgb(163 113 247 / 0.35), transparent 55%), var(--bg-elevated)`,
                    }}
                  >
                    <div className="flex justify-end">
                      {s.slug === "ai-assistants" ? <MiniBot size={72} /> : <span className="display text-5xl text-fg/80">{"{}"}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.preview.tech.map((t) => (
                        <span key={t} className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 font-mono text-[10px] text-fg">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/85 to-transparent px-4 pb-3 pt-10 font-mono text-[10px] uppercase tracking-[0.14em] text-fg">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: `var(--${s.accent})` }} />
                  <span className="truncate">{s.preview.caption}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
