"use client";

import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import type { EvidenceStrength } from "@/content/types";
import { useFinePointer, usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { accentGroupHoverText, accentText, glowStyle, type Accent } from "../shared/accent";
import { EvidenceBadge } from "../shared/EvidenceBadge";
import { GradientArt } from "../shared/GradientArt";

export interface IndexRow {
  slug: string;
  n: string;
  title: string;
  tagline: string;
  strength: EvidenceStrength;
  fromZar: string;
  fromUsd: string;
  accent: Accent;
  image?: string;
}

/**
 * The services index as a big numbered list. On fine pointers a preview card
 * (project screenshot or generative art) follows the cursor over the list —
 * the classic agency hover-reveal. Rows are plain links; the preview is
 * decorative.
 */
export function ServiceIndexList({ rows }: { rows: IndexRow[] }) {
  const list = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const fine = useFinePointer();
  const reduced = usePrefersReducedMotion();
  const enabled = fine && !reduced;

  useEffect(() => {
    const host = list.current;
    const card = preview.current;
    if (!host || !card || !enabled) return;
    const xTo = gsap.quickTo(card, "x", { duration: 0.7, ease: "power3.out" });
    const yTo = gsap.quickTo(card, "y", { duration: 0.7, ease: "power3.out" });
    const rot = gsap.quickTo(card, "rotation", { duration: 0.9, ease: "power3.out" });
    let lastX = 0;
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      xTo(e.clientX - r.left);
      yTo(e.clientY - r.top);
      rot(gsap.utils.clamp(-8, 8, (e.clientX - lastX) * 0.4));
      lastX = e.clientX;
    };
    const onEnter = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      gsap.set(card, { x: e.clientX - r.left, y: e.clientY - r.top });
      lastX = e.clientX;
    };
    const onLeave = () => setActive(null);
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled]);

  return (
    <div ref={list} className="relative">
      <ol className="mkp-rows border-t border-line">
        {rows.map((row, i) => (
          <li key={row.slug} className="border-b border-line" style={glowStyle(row.accent)}>
            <Link
              href={`/services/${row.slug}`}
              onPointerEnter={() => setActive(i)}
              data-cursor="view"
              data-cursor-label="Open"
              className="group relative isolate grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 gap-y-5 py-8 md:grid-cols-[4rem_minmax(0,1fr)_auto] md:items-start md:gap-x-8 md:py-10"
            >
              <span
                aria-hidden
                className="absolute inset-0 -z-10 origin-bottom scale-y-0 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--glow)_10%,transparent),transparent_70%)] transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-y-100"
              />
              {/* Light (md+): number | title | meta as ruled cells, each spanning the row's height. */}
              <span
                className={clsx(
                  "pt-2 font-mono text-sm md:pt-[1.6vw] xl:pt-6 md:light:-my-10 md:light:self-stretch md:light:border-r md:light:border-line md:light:pb-10 md:light:pt-[calc(2.5rem+1.6vw)] xl:light:pt-[calc(2.5rem+1.5rem)]",
                  accentText[row.accent],
                )}
              >
                {row.n}
              </span>
              <span className="min-w-0">
                <span
                  className={clsx(
                    "display block text-[clamp(1.9rem,5vw,4.5rem)] transition-[color,transform] duration-700 ease-[var(--ease-out)] md:group-hover:translate-x-4",
                    accentGroupHoverText[row.accent],
                  )}
                >
                  {row.title}
                </span>
                <span className="mt-3 block max-w-[56ch] text-base leading-relaxed text-fg-muted md:text-lg">{row.tagline}</span>
              </span>
              <span className="col-start-2 flex flex-wrap items-center gap-x-6 gap-y-3 md:col-start-3 md:row-start-1 md:flex-col md:items-end md:pt-3 md:light:-my-10 md:light:self-stretch md:light:border-l md:light:border-line md:light:pb-10 md:light:pl-8 md:light:pt-[calc(2.5rem+0.75rem)]">
                <EvidenceBadge strength={row.strength} />
                <span className="text-sm text-fg-muted">
                  From <span className="font-semibold text-fg">{row.fromZar}</span>
                  <span className="text-fg-subtle"> · {row.fromUsd}</span>
                </span>
                <span
                  aria-hidden
                  className="hidden h-12 w-12 place-items-center rounded-full border border-line-strong text-lg transition-[background,color,border-color,transform] duration-500 group-hover:-rotate-45 group-hover:border-[var(--glow)] group-hover:bg-[var(--glow)] group-hover:text-bg md:grid light:rounded-[6px] light:bg-fg/5 light:group-hover:translate-x-1 light:group-hover:rotate-0 light:group-hover:text-white"
                >
                  →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {enabled && (
        <div
          ref={preview}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-20 hidden lg:block"
        >
          <div
            className={clsx(
              "relative -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radius-lg)] border border-line-strong shadow-[0_40px_100px_-30px_rgb(0_0_0/0.9)] transition-[opacity,scale] duration-500 ease-[var(--ease-out)] light:rounded-none light:shadow-[var(--shadow-panel)]",
              "aspect-[4/3] w-[320px]",
              active === null ? "scale-75 opacity-0" : "scale-100 opacity-100",
            )}
          >
            {rows.map((row, i) => (
              <div
                key={row.slug}
                style={glowStyle(row.accent)}
                className={clsx(
                  "absolute inset-0 transition-[opacity,clip-path] duration-700 ease-[var(--ease-out)]",
                  active === i ? "opacity-100 [clip-path:inset(0_0_0_0)]" : "opacity-0 [clip-path:inset(100%_0_0_0)]",
                )}
              >
                {row.image ? (
                  <Image src={row.image} alt="" fill sizes="320px" className="object-cover object-top" />
                ) : (
                  <GradientArt className="absolute inset-0" mark={row.n} seed={i} />
                )}
                <span className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/85 backdrop-blur light:bottom-0 light:left-0 light:rounded-none light:border-0 light:bg-tint-neon light:px-2.5 light:py-1.5 light:text-xs light:normal-case light:tracking-normal light:text-black light:backdrop-blur-none">
                  {row.image ? "From the evidence" : `Service ${row.n}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
