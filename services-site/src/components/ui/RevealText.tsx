"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

type Tag = "h1" | "h2" | "h3" | "p" | "span" | "div";

/**
 * Masked line-by-line (or word-by-word) reveal as the element scrolls into
 * view. Text stays fully readable without JS and for reduced-motion users.
 */
export function RevealText({
  as: Tag = "div",
  children,
  className,
  by = "lines",
  delay = 0,
  immediate = false,
}: {
  as?: Tag;
  children: React.ReactNode;
  className?: string;
  by?: "lines" | "words" | "chars";
  delay?: number;
  /** Animate on mount instead of on scroll (for above-the-fold headings). */
  immediate?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create(el, {
          type: by === "chars" ? "words,chars" : by === "words" ? "words" : "lines",
          mask: by === "chars" ? "words" : by,
          autoSplit: by === "lines",
          onSplit(self) {
            // The masks clip at the line box, which cuts descenders (g, p, y)
            // at .display's tight line-height; extend them without moving layout.
            for (const m of self.masks as HTMLElement[]) {
              m.style.paddingBottom = "0.14em";
              m.style.marginBottom = "-0.14em";
            }
            const targets = by === "chars" ? self.chars : by === "words" ? self.words : self.lines;
            return gsap.from(targets, {
              yPercent: 110,
              opacity: 0,
              rotate: by === "chars" ? 6 : 2,
              duration: 1.1,
              ease: "expo.out",
              stagger: by === "chars" ? 0.018 : 0.08,
              delay,
              scrollTrigger: immediate ? undefined : { trigger: el, start: "top 88%", once: true },
            });
          },
        });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [by, delay, immediate] },
  );

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={className}>
      {children}
    </Tag>
  );
}
