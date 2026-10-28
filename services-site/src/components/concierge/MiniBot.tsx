"use client";

import { useEffect, useRef } from "react";
import { clsx } from "clsx";
import type { BotMood } from "./BotHead";
import { ensurePointerTracking, pointer } from "@/hooks/usePointer";

/**
 * Lightweight 2D version of the concierge robot (pure CSS + a short rAF loop)
 * for the floating launcher and chat avatar, where a WebGL canvas would be
 * overkill. Its pupils glance toward the cursor.
 */
export function MiniBot({ mood = "idle", size = 40, className }: { mood?: BotMood; size?: number; className?: string }) {
  const eyes = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = eyes.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ensurePointerTracking();
    let frame = 0;
    let x = 0;
    let y = 0;
    let onScreen = false;
    // Runs only until the pupils settle; pointer moves and scrolling wake it.
    const tick = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const dx = pointer.x - (r.left + r.width / 2);
      const dy = pointer.y - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, d / 300);
      const tx = (dx / d) * reach * size * 0.06;
      const ty = (dy / d) * reach * size * 0.05;
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      el.style.transform = `translate(${x}px, ${y}px)`;
      if (Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05) frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (frame || !onScreen) return;
      // Skip copies nobody can see: the closed dock panel, the hidden launcher
      // or a preview card that hasn't been revealed.
      if (typeof el.checkVisibility === "function" && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return;
      frame = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      wake();
    });
    io.observe(el);
    window.addEventListener("pointermove", wake, { passive: true });
    window.addEventListener("scroll", wake, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("scroll", wake);
    };
  }, [size]);

  const eyeColor =
    mood === "thinking" ? "bg-violet text-violet" : mood === "happy" ? "bg-amber text-amber" : "bg-accent text-accent";

  return (
    <div
      aria-hidden
      className={clsx("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <span
        className={clsx("absolute left-1/2 top-0 h-[18%] w-[6%] -translate-x-1/2 rounded-full bg-fg-subtle")}
        style={{ top: -size * 0.08 }}
      />
      <span
        className={clsx("absolute left-1/2 -translate-x-1/2 rounded-full", eyeColor, mood === "thinking" && "animate-pulse")}
        style={{ top: -size * 0.16, width: size * 0.14, height: size * 0.14, boxShadow: "0 0 8px currentColor" }}
      />
      <div
        className="grid h-full w-full place-items-center rounded-[32%] border border-line-strong bg-gradient-to-b from-[var(--bot-shell-from)] to-[var(--bot-shell-to)] shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]"
      >
        <div className="grid h-[52%] w-[74%] place-items-center rounded-[40%] bg-black">
          <div ref={eyes} className="flex gap-[18%]" style={{ width: "70%", justifyContent: "center" }}>
            {[0, 1].map((i) =>
              mood === "happy" ? (
                <span
                  key={i}
                  className="block rounded-t-full border-2 border-b-0 border-amber"
                  style={{ width: size * 0.13, height: size * 0.08 }}
                />
              ) : (
                <span
                  key={i}
                  className={clsx("block rounded-full transition-colors", eyeColor, "animate-[blink_4.5s_infinite]")}
                  style={{ width: size * 0.1, height: size * (mood === "listening" ? 0.2 : 0.17), boxShadow: "0 0 6px currentColor" }}
                />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
