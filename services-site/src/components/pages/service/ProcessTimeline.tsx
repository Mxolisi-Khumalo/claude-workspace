"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { clsx } from "clsx";
import type { ProcessStep } from "@/content/types";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const cols: Record<number, string> = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

/**
 * Process steps on a track that draws itself as you scroll, lighting each
 * step's node as the line reaches it. Vertical on small screens, horizontal
 * from lg. Without JS or with reduced motion the track is fully drawn.
 */
export function ProcessTimeline({ steps }: { steps: ProcessStep[] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const items = Array.from(el.querySelectorAll<HTMLElement>("[data-step]"));
        el.setAttribute("data-motion", "");
        const v = el.querySelector("[data-fill-y]");
        const h = el.querySelector("[data-fill-x]");
        gsap.set(v, { scaleY: 0 });
        gsap.set(h, { scaleX: 0 });
        const light = (p: number) =>
          items.forEach((item, i) => {
            const at = items.length > 1 ? i / (items.length - 1) : 0;
            item.toggleAttribute("data-active", p >= at - 0.001);
          });
        light(0);
        const st = ScrollTrigger.create({
          trigger: el,
          start: "top 72%",
          end: "bottom 55%",
          scrub: 0.6,
          onUpdate: (self) => {
            gsap.set(v, { scaleY: self.progress });
            gsap.set(h, { scaleX: self.progress });
            light(self.progress);
          },
        });
        gsap.from(items, {
          y: 24,
          autoAlpha: 0,
          duration: 1,
          ease: "expo.out",
          stagger: 0.09,
          clearProps: "transform,visibility,opacity",
          scrollTrigger: { trigger: el, start: "top 82%", once: true },
        });
        return () => {
          st.kill();
          el.removeAttribute("data-motion");
          items.forEach((i) => i.removeAttribute("data-active"));
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="mkp-timeline relative">
      {/* Vertical track (mobile) */}
      <span aria-hidden className="absolute bottom-6 left-[19px] top-5 w-px bg-line lg:hidden" />
      <span
        aria-hidden
        data-fill-y
        className="absolute bottom-6 left-[19px] top-5 w-px origin-top bg-[var(--glow)] shadow-[0_0_12px_var(--glow)] lg:hidden light:shadow-none"
      />
      {/* Horizontal track (desktop) */}
      <span aria-hidden className="absolute left-5 right-0 top-5 hidden h-px bg-line lg:block" />
      <span
        aria-hidden
        data-fill-x
        className="absolute left-5 right-0 top-5 hidden h-px origin-left bg-[var(--glow)] shadow-[0_0_12px_var(--glow)] lg:block light:shadow-none"
      />

      <ol className={clsx("relative grid gap-10 lg:gap-8", cols[steps.length] ?? "lg:grid-cols-4")}>
        {steps.map((s, i) => (
          <li key={s.step} data-step className="relative pl-16 lg:pl-0 lg:pt-16">
            <span className="mkp-step-node absolute left-0 top-0 grid h-10 w-10 place-items-center rounded-full border font-mono text-xs font-semibold light:rounded-none">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="pt-1.5 text-xl font-semibold tracking-tight lg:pt-0 light:font-medium">{s.step}</h3>
            <p className="mt-3 max-w-[40ch] leading-relaxed text-fg-muted">{s.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
