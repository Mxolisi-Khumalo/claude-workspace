"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { RevealText } from "@/components/ui/RevealText";
import { ConciergeCta } from "./ConciergeCta";
import { pad2 } from "./utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STEPS = [
  {
    title: "Discover",
    copy: "Tell me what you're building — on a short call or in a chat with Byte. We cover goals, audience, constraints and what success looks like, in plain language.",
    out: "A shared understanding of the problem",
  },
  {
    title: "Scope & quote",
    copy: "I turn that conversation into a written scope with a package, timeline and price. Starting prices are published, so the number won't surprise you. A deposit via a secure payment link books your slot.",
    out: "Quote PDF · timeline · deposit link",
  },
  {
    title: "Build in weekly demos",
    copy: "Work ships in small increments to a live staging link. Every week you see real progress, give feedback and can change direction while it is still cheap to do so.",
    out: "A weekly demo on staging",
  },
  {
    title: "Harden & launch",
    copy: "Tests for the logic that matters, accessibility and performance checks, and a security pass on anything that takes input. Then deployment to your domain and a handover walkthrough.",
    out: "Production launch + documentation",
  },
  {
    title: "Support",
    copy: "Every build includes a short warranty period for bugs. If you want to keep improving the product, ongoing work continues on a simple monthly retainer you can cancel any time.",
    out: "Warranty, then optional retainer",
  },
];

/**
 * Five universal steps; a vertical line fills with scroll and lights each step.
 * Light: an agenda-style column of ruled rows beside the sticky heading.
 */
export function Process() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const steps = gsap.utils.toArray<HTMLElement>(".hm-step");
        steps.forEach((step) => step.classList.remove("is-on"));
        el.dataset.anim = "";
        gsap.fromTo(
          ".hm-line-fill",
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: { trigger: ".hm-steps", start: "top 62%", end: "bottom 62%", scrub: 0.4 },
          },
        );
        steps.forEach((step) => {
          ScrollTrigger.create({
            trigger: step,
            start: "top 62%",
            toggleClass: { targets: step, className: "is-on" },
          });
        });
        return () => {
          delete el.dataset.anim;
          steps.forEach((step) => step.classList.add("is-on"));
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="process"
      aria-label="Process"
      className="hm-process relative scroll-mt-24 py-20 md:py-32 light:py-16 md:light:py-24"
    >
      <div className="container-x grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20 light:gap-0 light:border-y light:border-line">
        <div className="lg:sticky lg:top-28 lg:self-start light:py-12 lg:light:py-10 lg:light:pr-12">
          <p className="eyebrow mb-5">{"// 03 — Process"}</p>
          <RevealText as="h2" className="display text-[clamp(2.5rem,4.4vw,4.25rem)]">
            A calm, predictable way to build.
          </RevealText>
          <p className="mt-6 max-w-md text-base leading-relaxed text-fg-muted md:text-lg">
            The same five steps whether you need a landing page or a product. You always know what happens next, what it
            costs and when you will see it.
          </p>
          <div className="mt-8">
            <ConciergeCta variant="outline" seedPrompt="I'd like to start a project. What do you need from me?">
              Start with step one <span aria-hidden>→</span>
            </ConciergeCta>
          </div>
        </div>

        <ol className="hm-steps relative">
          <span aria-hidden className="hm-steps-line absolute bottom-6 left-[1.4rem] top-6 w-px -translate-x-1/2 bg-line-strong">
            <span className="hm-line-fill absolute inset-0 origin-top bg-gradient-to-b from-accent via-sky to-violet" />
          </span>
          {STEPS.map((s, i) => (
            <li key={s.title} className="hm-step is-on relative grid grid-cols-[2.8rem_minmax(0,1fr)] gap-x-6 pb-14 last:pb-0 md:gap-x-8">
              <span className="hm-step-dot relative z-[1] grid h-11 w-11 place-items-center rounded-full border border-accent bg-accent font-mono text-xs font-semibold text-accent-ink shadow-[var(--glow-accent)] light:rounded-none light:shadow-none">
                {pad2(i + 1)}
              </span>
              <div className="pt-1.5">
                <h3 className="display text-[clamp(1.6rem,2.8vw,2.4rem)]">{s.title}</h3>
                <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-fg-muted md:text-[1.05rem]">{s.copy}</p>
                <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-1.5 font-mono text-[11px] text-fg-muted light:rounded-[4px] light:bg-surface light:text-xs">
                  <span className="text-accent">↳</span> {s.out}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
