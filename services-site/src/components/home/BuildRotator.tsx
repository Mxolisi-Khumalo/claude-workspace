"use client";

import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { isMotionPaused } from "@/hooks/useMotionPaused";

gsap.registerPlugin(ScrambleTextPlugin, useGSAP);

const ITEMS = ["websites", "web apps", "cloud APIs", "AI assistants", "PDF workflows", "browser games"];

/**
 * "I build ___" with the blank decoding through the services. Pauses while
 * hovered, while keyboard focus is in the hero, after a tap (tap again to
 * resume), off-screen, in a background tab or when the site-wide "Pause
 * animations" switch is on; static for reduced motion. Screen readers get
 * the full sentence once.
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
        let focused = false;
        let held = false;
        let visible = true;
        const next = () => {
          if (hovering || focused || held || !visible || document.hidden || isMotionPaused()) return;
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
        const enter = (e: PointerEvent) => (hovering = e.pointerType !== "touch");
        const leave = () => (hovering = false);
        // Touch has no hover: a tap toggles the pause instead.
        const tap = (e: PointerEvent) => {
          if (e.pointerType === "touch") held = !held;
        };
        // The rotator itself isn't focusable, so hold it while focus is anywhere in its section.
        const region = host.closest("section") ?? host;
        const focusIn = () => (focused = true);
        const focusOut = (e: FocusEvent) => {
          if (!region.contains(e.relatedTarget as Node | null)) focused = false;
        };
        host.addEventListener("pointerenter", enter);
        host.addEventListener("pointerleave", leave);
        host.addEventListener("pointerdown", tap);
        region.addEventListener("focusin", focusIn);
        region.addEventListener("focusout", focusOut);
        return () => {
          window.clearInterval(id);
          io.disconnect();
          host.removeEventListener("pointerenter", enter);
          host.removeEventListener("pointerleave", leave);
          host.removeEventListener("pointerdown", tap);
          region.removeEventListener("focusin", focusIn);
          region.removeEventListener("focusout", focusOut);
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
