"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Staggered fade-up for `[data-reveal]` descendants (or the wrapper itself
 * when there are none). Content is server-rendered and fully visible without
 * JS; the animation only runs when motion is allowed. Hidden content stays
 * focusable (opacity, not visibility) and appears at once when keyboard
 * focus reaches it before the scroll trigger does.
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
  immediate = false,
  delay = 0,
  stagger = 0.08,
  y = 28,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "ul" | "ol" | "header" | "aside";
  immediate?: boolean;
  delay?: number;
  stagger?: number;
  y?: number;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const found = el.querySelectorAll("[data-reveal]");
        const targets = found.length ? Array.from(found) : [el];
        const tween = gsap.from(targets, {
          y,
          opacity: 0,
          duration: 1.1,
          ease: "expo.out",
          stagger,
          delay,
          clearProps: "transform,opacity",
          scrollTrigger: immediate ? undefined : { trigger: el, start: "top 86%", once: true },
        });
        const reveal = () => tween.progress(1);
        el.addEventListener("focusin", reveal);
        return () => el.removeEventListener("focusin", reveal);
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={className} id={id}>
      {children}
    </Tag>
  );
}
