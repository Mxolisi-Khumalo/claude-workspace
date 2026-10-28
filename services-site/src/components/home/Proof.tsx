"use client";

import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { RevealText } from "@/components/ui/RevealText";
import { useGlow } from "./useGlow";
import { numberWord, pad2 } from "./utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export interface ProofCardData {
  slug: string;
  title: string;
  repoUrl: string;
  summary: string;
  outcome: string;
  stack: string[];
  image?: string;
  accent: string;
}

function Art({ title, accent }: { title: string; accent: string }) {
  // Generated cover for case studies without screenshots.
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden"
      style={{
        background: `radial-gradient(60% 80% at 20% 0%, color-mix(in srgb, ${accent} 55%, transparent), transparent 70%), radial-gradient(50% 70% at 85% 10%, rgb(163 113 247 / 0.55), transparent 70%), radial-gradient(70% 60% at 50% 120%, rgb(255 166 87 / 0.35), transparent 70%), #0b0d12`,
      }}
    >
      <div className="grid-bg absolute inset-0 opacity-50" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.06)_0_1px,transparent_1px_22px)] [mask-image:linear-gradient(to_top,black,transparent)]" />
      <p className="display absolute bottom-4 left-5 right-5 truncate text-[clamp(1.8rem,3vw,2.6rem)] text-white/90">
        {title.split(" — ")[0]}
      </p>
      <p className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80">
        Phase one · in progress
      </p>
    </div>
  );
}

/**
 * Case studies as a pinned, scrubbed horizontal track on large screens with
 * motion allowed; a plain responsive grid everywhere else (and without JS).
 */
export function Proof({ items }: { items: ProofCardData[] }) {
  const section = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  useGlow(section);

  useGSAP(
    () => {
      const sec = section.current;
      const tr = track.current;
      if (!sec || !tr || !pin.current) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)", () => {
        sec.dataset.mode = "h";
        tr.dataset.cursor = "drag";
        tr.dataset.cursorLabel = "Scroll";
        const dist = () => Math.max(0, tr.scrollWidth - window.innerWidth);
        const n = items.length;
        gsap.to(tr, {
          x: () => -dist(),
          ease: "none",
          scrollTrigger: {
            trigger: pin.current,
            start: "top top",
            end: () => `+=${dist()}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`;
              if (count.current) count.current.textContent = pad2(Math.min(n, 1 + Math.floor(self.progress * n)));
            },
          },
        });
        document.fonts?.ready.then(() => ScrollTrigger.refresh());
        return () => {
          delete sec.dataset.mode;
          delete tr.dataset.cursor;
          delete tr.dataset.cursorLabel;
        };
      });
      return () => mm.revert();
    },
    { scope: section, dependencies: [items.length] },
  );

  return (
    <section ref={section} id="proof" aria-label="Proof" className="hm-proof hm-glow-host relative scroll-mt-24 py-20 md:py-32 lg:py-0">
      <div ref={pin} className="hm-proof-pin lg:py-32">
        <div ref={track} className="hm-proof-track container-x grid gap-6 md:grid-cols-2">
          <div className="hm-proof-intro flex flex-col justify-between gap-8 md:col-span-2 lg:mb-6">
            <div>
              <p className="eyebrow mb-5">{"// 02 — Proof"}</p>
              <RevealText as="h2" className="display max-w-4xl text-[clamp(2.5rem,6.5vw,6rem)]">
                Proof, not promises.
              </RevealText>
              <p className="mt-6 max-w-md text-base leading-relaxed text-fg-muted">
                {numberWord(items.length, true)} builds with public repositories. Read the case study, then read the code —
                every outcome below is something the code demonstrably does.
              </p>
            </div>
            <p className="hm-proof-hint hidden font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
              <span className="text-accent">→</span> Keep scrolling
            </p>
          </div>

          <p className="hm-swipe-hint -mb-2 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            Swipe through {numberWord(items.length)} case studies <span aria-hidden className="text-accent">→</span>
          </p>
          <div className="hm-swipe" role="list" aria-label="Case studies">
            {items.map((c, i) => (
              <article
                role="listitem"
                key={c.slug}
                className="hm-proof-card hm-glow group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bg-elevated/85"
                style={{ "--glow": c.accent } as React.CSSProperties}
              >
                <div className="hm-proof-media relative aspect-[16/10] overflow-hidden border-b border-line bg-surface">
                  {c.image ? (
                    <Image
                      src={c.image}
                      alt={`Screenshot of ${c.title}`}
                      fill
                      sizes="(min-width: 1024px) 500px, (min-width: 768px) 50vw, 100vw"
                      className="object-cover object-top transition-transform duration-[1.2s] ease-[var(--ease-out)] group-hover:scale-105"
                    />
                  ) : (
                    <Art title={c.title} accent={c.accent} />
                  )}
                  <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-fg backdrop-blur">
                    {pad2(i + 1)} / {pad2(items.length)}
                  </span>
                </div>

                <div className="relative flex flex-1 flex-col p-6 lg:p-7">
                  <h3 className="text-[1.45rem] font-semibold leading-tight tracking-tight text-fg">{c.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{c.summary}</p>
                  <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Stack">
                    {c.stack.slice(0, 5).map((t) => (
                      <li key={t} className="rounded-full border border-line-strong px-2.5 py-1 font-mono text-[10px] text-fg-muted">
                        {t}
                      </li>
                    ))}
                    {c.stack.length > 5 && (
                      <li className="rounded-full px-1 py-1 font-mono text-[10px] text-fg-subtle">+{c.stack.length - 5}</li>
                    )}
                  </ul>
                  <div className="mt-5 border-t border-line pt-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: c.accent }}>
                      Outcome
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-fg">{c.outcome}</p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 pt-6 text-sm font-semibold">
                    <Link
                      href={`/work/${c.slug}`}
                      data-cursor="link"
                      className="group/l inline-flex items-center gap-2 text-fg transition-colors hover:text-accent"
                    >
                      Read case study
                      <span aria-hidden className="transition-transform duration-300 group-hover/l:translate-x-1">→</span>
                    </Link>
                    <a
                      href={c.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      data-cursor="link"
                      className="inline-flex items-center gap-1.5 text-fg-muted transition-colors hover:text-fg"
                    >
                      View code <span aria-hidden>↗</span>
                      <span className="sr-only">(opens GitHub in a new tab)</span>
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="hm-proof-progress container-x mt-8 hidden items-center gap-5 font-mono text-[11px] tracking-[0.16em] text-fg-subtle">
          <span>
            <span ref={count} className="text-fg">
              01
            </span>{" "}
            / {pad2(items.length)}
          </span>
          <span className="relative h-px flex-1 overflow-hidden bg-line-strong">
            <span ref={bar} className="absolute inset-0 origin-left bg-accent" style={{ transform: "scaleX(0)" }} />
          </span>
          <span className="uppercase">Scroll</span>
        </div>
      </div>
    </section>
  );
}
