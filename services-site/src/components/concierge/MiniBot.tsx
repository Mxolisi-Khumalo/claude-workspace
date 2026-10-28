"use client";

import { useEffect, useRef } from "react";
import { clsx } from "clsx";
import type { BotMood } from "./BotHead";
import { ensurePointerTracking, pointer } from "@/hooks/usePointer";

/**
 * Lightweight 2D version of the concierge robot (pure CSS + one rAF loop) for
 * the floating launcher and chat avatar, where a WebGL canvas would be
 * overkill. Its pupils glance toward the cursor.
 */
export function MiniBot({ mood = "idle", size = 40, className }: { mood?: BotMood; size?: number; className?: string }) {
  const eyes = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ensurePointerTracking();
    let frame = 0;
    let x = 0;
    let y = 0;
    const tick = () => {
      const el = eyes.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const dx = pointer.x - (r.left + r.width / 2);
        const dy = pointer.y - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, d / 300);
        x += ((dx / d) * reach * size * 0.06 - x) * 0.2;
        y += ((dy / d) * reach * size * 0.05 - y) * 0.2;
        el.style.transform = `translate(${x}px, ${y}px)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
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
        className="grid h-full w-full place-items-center rounded-[32%] border border-white/10 bg-gradient-to-b from-[#232a36] to-[#12161d] shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]"
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
