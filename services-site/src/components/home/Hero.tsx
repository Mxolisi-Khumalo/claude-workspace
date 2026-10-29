"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useEffect, useRef } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { getTheme } from "@/hooks/useTheme";
import { openConcierge } from "@/lib/chat/concierge-store";
import { BuildRotator } from "./BuildRotator";
import { LocalTime } from "./LocalTime";
import { ProofChips } from "./ProofChips";
import { whenIntroDone } from "./intro";

gsap.registerPlugin(useGSAP);

/**
 * First viewport: availability line, the kinetic headline (masked word
 * reveal, last word in the brand gradient), the decoding "I build ___" line,
 * subhead, CTAs and floating proof chips. Visible without JS; static for
 * reduced motion.
 *
 * Light theme (GitHub Universe): the same content laid out as ruled cells
 * between the page rails — a mono meta strip, the heavy wordmark headline,
 * the rotator beside the subhead and CTAs, then the proof chips as a row of
 * white cells.
 */
export function Hero({ headline, subhead }: { headline: string; subhead: string }) {
  const root = useRef<HTMLElement>(null);
  const words = headline.split(" ");

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Release the CSS gate first so GSAP doesn't read the gate's transform
        // as the starting value; immediateRender re-hides everything in the
        // same frame, so nothing flashes.
        el.dataset.live = "";
        const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
        tl.fromTo(
          ".hm-word-inner",
          { y: 0, yPercent: 115, rotate: 5 },
          { yPercent: 0, rotate: 0, duration: 1.35, stagger: 0.07 },
        )
          .fromTo(".hm-gate:not(.hm-chip)", { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.07 }, 0.3);
        // Light lays the chips out as ruled cells: fade them in without the
        // springy pop, which would overshoot across the 1px rules.
        if (getTheme() === "light") {
          tl.fromTo(".hm-chip", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, stagger: 0.08, ease: "power2.out" }, 0.65);
        } else {
          tl.fromTo(
            ".hm-chip",
            { autoAlpha: 0, scale: 0.8, y: 12 },
            { autoAlpha: 1, scale: 1, y: 0, duration: 1, stagger: 0.09, ease: "back.out(1.7)" },
            0.65,
          );
        }
        const cancel = whenIntroDone(() => tl.play());
        return () => {
          cancel();
          tl.kill();
          delete el.dataset.live;
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  // Pointer spotlight on the dot grid (fine pointers only).
  useEffect(() => {
    const el = root.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--hx", `${e.clientX - r.left}px`);
        el.style.setProperty("--hy", `${e.clientY - r.top}px`);
      });
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      ref={root}
      aria-label="Introduction"
      className="hm-hero relative flex min-h-[100svh] flex-col overflow-hidden pt-[calc(var(--nav-h)+1.5rem)] light:border-b light:border-line light:pt-[var(--nav-h)]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="hm-dots absolute inset-0" />
        <div className="hm-dots-lit absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg/70" />
      </div>

      <div className="container-x relative flex flex-1 flex-col justify-center py-10 lg:py-14 light:justify-start light:py-0">
        <p className="hm-gate eyebrow flex flex-wrap items-center gap-x-3 gap-y-2 light:-mx-[var(--gutter)] light:normal-case light:justify-between light:gap-x-6 light:border-b light:border-line light:px-[var(--gutter)] light:py-3.5 light:text-[0.8125rem] light:text-fg md:light:text-[0.9375rem]">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent light:rounded-none light:border-0 light:bg-tint-neon light:px-2 light:py-0.5 light:text-black">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70 light:bg-black" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent light:rounded-none light:bg-black" />
            </span>
            Taking on select projects
          </span>
          <span>Full-stack developer · Johannesburg, ZA</span>
          <span className="hm-js-only hidden items-center gap-2 text-fg-subtle sm:inline-flex">
            <span aria-hidden className="light:hidden">
              ·
            </span>
            <LocalTime className="text-fg-muted" />
            <span>SAST</span>
          </span>
        </p>

        {/* On small screens this wrapper dissolves (display: contents) so the
            chips can drop below the CTAs; on desktop it anchors them. */}
        <div className="contents lg:relative lg:mt-10 lg:block lg:light:contents">
          <h1 className="display display-hero mt-8 text-[clamp(3rem,9vw,8.25rem)] [text-wrap:balance] lg:mt-0 lg:max-w-[11.5em] light:mt-0 light:flex light:flex-1 light:items-center light:py-9 light:text-[clamp(3rem,8.6vw,8.25rem)] lg:light:max-w-none lg:light:py-8">
            <span className="sr-only">{headline}</span>
            <span aria-hidden>
              {words.map((w, i) => (
                <span key={`${w}-${i}`}>
                  <span className="hm-word">
                    <span className={`hm-word-inner ${i === words.length - 1 ? "text-gradient" : ""}`}>{w}</span>
                  </span>
                  {i < words.length - 1 && " "}
                </span>
              ))}
            </span>
          </h1>

          <ProofChips className="pointer-events-none order-last mt-12 grid grid-cols-2 gap-2.5 lg:absolute lg:inset-0 lg:order-none lg:mt-0 lg:block [&_a]:pointer-events-auto light:-mx-[var(--gutter)] light:mt-0 light:gap-px light:border-t light:border-line light:bg-line lg:light:static lg:light:order-last lg:light:grid lg:light:grid-cols-4" />
        </div>

        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-end lg:gap-16 light:-mx-[var(--gutter)] light:mt-0 light:gap-0 light:border-t light:border-line lg:light:grid-cols-[minmax(0,1fr)_minmax(0,42rem)] lg:light:items-stretch">
          <BuildRotator className="hm-gate display text-[clamp(1.6rem,3.4vw,3rem)] tracking-[-0.02em] light:px-[var(--gutter)] light:py-7 light:font-mono light:text-[clamp(1.25rem,2.3vw,2rem)] light:leading-tight light:tracking-normal lg:light:self-end" />
          <div className="hm-gate light:border-t light:border-line light:px-[var(--gutter)] light:py-7 lg:light:border-l lg:light:border-t-0">
            <p className="max-w-[46ch] text-base leading-relaxed text-fg-muted md:text-lg light:leading-snug lg:light:text-[1.25rem]">{subhead}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3 light:mt-6">
              <Button onClick={() => openConcierge()} className="px-7 py-3.5 text-[0.95rem] light:min-w-[15.5rem] light:px-5 light:py-4">
                Get an instant quote <span aria-hidden>→</span>
              </Button>
              <ButtonLink href="#services" variant="outline" className="px-7 py-3.5 text-[0.95rem] light:px-5 light:py-4">
                Explore services
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-left only: the floating concierge dock owns the bottom-right corner. */}
      <div className="hm-gate container-x relative flex items-end pb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle light:border-t light:border-line light:pb-0 light:text-xs light:normal-case light:tracking-normal">
        <a href="#services" className="group flex items-center gap-3 transition-colors hover:text-fg light:py-3">
          <span aria-hidden className="hm-scroll-line block h-10 w-px bg-line-strong light:h-6" />
          Scroll to explore
        </a>
      </div>
    </section>
  );
}
