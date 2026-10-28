"use client";

import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";

gsap.registerPlugin(ScrambleTextPlugin, useGSAP);

const ITEMS = ["websites", "web apps", "cloud APIs", "AI assistants", "PDF workflows", "browser games"];

/**
 * "I build ___" with the blank decoding through the services. Pauses while
 * hovered, off-screen or in a background tab; static for reduced motion.
 * Screen readers get the full sentence once.
 */
export function BuildRotator({ className }: { className?: string }) {
  const root = useRef<HTMLParagraphElement>(null);
  const word = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = word.current;
      const host = root.current;
      if (!el || !host) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        let i = 0;
        let hovering = false;
        let visible = true;
        const next = () => {
          if (hovering || !visible || document.hidden) return;
          i = (i + 1) % ITEMS.length;
          gsap.to(el, {
            duration: 1,
            ease: "none",
            scrambleText: { text: ITEMS[i], chars: "01<>/{}[]#_$", speed: 0.6, revealDelay: 0.25 },
          });
        };
        const id = window.setInterval(next, 2800);
        const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
        io.observe(host);
        const enter = () => (hovering = true);
        const leave = () => (hovering = false);
        host.addEventListener("pointerenter", enter);
        host.addEventListener("pointerleave", leave);
        return () => {
          window.clearInterval(id);
          io.disconnect();
          host.removeEventListener("pointerenter", enter);
          host.removeEventListener("pointerleave", leave);
          el.textContent = ITEMS[0];
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const sentence = `I build ${ITEMS.slice(0, -1).join(", ")} and ${ITEMS[ITEMS.length - 1]}.`;

  return (
    <p ref={root} className={className}>
      <span className="sr-only">{sentence}</span>
      <span aria-hidden className="whitespace-nowrap">
        <span className="text-fg-subtle">I build </span>
        <span ref={word} className="text-fg">
          {ITEMS[0]}
        </span>
        <span className="hm-caret" />
      </span>
    </p>
  );
}
