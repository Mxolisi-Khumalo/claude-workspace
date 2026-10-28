"use client";

import { useEffect, useRef } from "react";
import { clsx } from "clsx";
import { useFinePointer } from "@/hooks/useMediaQuery";

/**
 * Wraps a group of `.mkp-card` elements and feeds them the pointer position,
 * so their gradient borders light up around the cursor — neighbouring cards
 * included, GitHub Universe style. Fine pointers only; it's a static
 * highlight (no movement), so it stays on for reduced-motion users too.
 */
export function GlowGroup({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol";
}) {
  const ref = useRef<HTMLElement>(null);
  const fine = useFinePointer();

  useEffect(() => {
    const root = ref.current;
    if (!root || !fine) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      root.querySelectorAll<HTMLElement>(".mkp-card").forEach((card) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${x - r.left}px`);
        card.style.setProperty("--my", `${y - r.top}px`);
      });
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onEnter = () => root.setAttribute("data-active", "");
    const onLeave = () => root.removeAttribute("data-active");
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [fine]);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={clsx("mkp-glow-group", className)}>
      {children}
    </Tag>
  );
}
