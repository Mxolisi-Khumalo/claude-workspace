"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { isMotionPaused } from "@/hooks/useMotionPaused";

gsap.registerPlugin(useGSAP);

/**
 * Infinite marquee whose speed and direction respond to scroll velocity.
 * Hovering slows it down; the site-wide "Pause animations" switch stops it.
 * Content is duplicated for a seamless loop.
 */
export function Marquee({
  children,
  speed = 40,
  className,
}: {
  children: React.ReactNode;
  /** Pixels per second at rest. */
  speed?: number;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = track.current;
      if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      let x = 0;
      let dir = -1;
      let boost = 0;
      let factor = 1;
      let lastY = window.scrollY;
      const half = () => el.scrollWidth / 2;

      const tick = (_t: number, dt: number) => {
        const y = window.scrollY;
        const v = y - lastY;
        lastY = y;
        if (isMotionPaused()) {
          boost = 0;
          return;
        }
        if (Math.abs(v) > 0.5) dir = v > 0 ? -1 : 1;
        boost += (Math.min(Math.abs(v) * 0.6, 14) - boost) * 0.1;
        x += dir * (speed * factor * (dt / 1000) + boost * factor);
        const w = half();
        if (x <= -w) x += w;
        if (x > 0) x -= w;
        gsap.set(el, { x });
      };
      gsap.ticker.add(tick);
      const slow = () => gsap.to({ v: factor }, { v: 0.25, duration: 0.6, onUpdate() { factor = this.targets()[0].v; } });
      const fast = () => gsap.to({ v: factor }, { v: 1, duration: 0.6, onUpdate() { factor = this.targets()[0].v; } });
      const host = root.current;
      host?.addEventListener("pointerenter", slow);
      host?.addEventListener("pointerleave", fast);
      return () => {
        gsap.ticker.remove(tick);
        host?.removeEventListener("pointerenter", slow);
        host?.removeEventListener("pointerleave", fast);
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} className={`relative overflow-hidden ${className ?? ""}`}>
      <div ref={track} className="flex w-max will-change-transform">
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
