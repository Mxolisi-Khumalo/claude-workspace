"use client";

import { useEffect, type RefObject } from "react";

/**
 * One pointermove listener on `host` that feeds every `.hm-glow` descendant
 * its local pointer position (--mx/--my), producing the GitHub-style border
 * glow that follows the cursor across neighbouring cards. Fine pointers only.
 */
export function useGlow(host: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = host.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      el.querySelectorAll<HTMLElement>(".hm-glow").forEach((card) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${x - r.left}px`);
        card.style.setProperty("--my", `${y - r.top}px`);
      });
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [host]);
}
