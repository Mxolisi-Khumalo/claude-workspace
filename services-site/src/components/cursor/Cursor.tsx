"use client";

import { useEffect, useRef, useState } from "react";
import { useFinePointer, usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { ensurePointerTracking, pointer } from "@/hooks/usePointer";

type CursorMode = "default" | "link" | "view" | "drag" | "text" | "hidden";

const INTERACTIVE = "a, button, [role='button'], summary, label, select";
const TEXTUAL = "input, textarea, [contenteditable='true']";

/**
 * Custom cursor: a precise dot plus a trailing ring that morphs over
 * interactive elements. Opt elements into richer states with
 *   data-cursor="view|drag|hidden"  and  data-cursor-label="Open"
 * Only mounts on fine pointers when motion is allowed; otherwise the native
 * cursor is left untouched.
 */
export function Cursor() {
  const fine = useFinePointer();
  const reduced = usePrefersReducedMotion();
  const enabled = fine && !reduced;

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<CursorMode>("default");
  const [label, setLabel] = useState("");
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    ensurePointerTracking();
    const root = document.documentElement;
    root.classList.add("has-custom-cursor");

    let ringX = pointer.x;
    let ringY = pointer.y;
    let frame = 0;

    const tick = () => {
      ringX += (pointer.x - ringX) * 0.18;
      ringY += (pointer.y - ringY) * 0.18;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const onOver = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest) return;
      const tagged = target.closest<HTMLElement>("[data-cursor]");
      if (tagged) {
        setMode((tagged.dataset.cursor as CursorMode) || "link");
        setLabel(tagged.dataset.cursorLabel ?? "");
        return;
      }
      if (target.closest(TEXTUAL)) {
        setMode("text");
        setLabel("");
        return;
      }
      if (target.closest(INTERACTIVE)) {
        setMode("link");
        setLabel("");
        return;
      }
      setMode("default");
      setLabel("");
    };
    const onMove = () => setVisible(true);
    const onLeave = () => setVisible(false);
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);

    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true, once: true });
    document.addEventListener("pointerenter", onMove);
    root.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      root.classList.remove("has-custom-cursor");
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerenter", onMove);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [enabled]);

  if (!enabled) return null;

  const ringSize =
    mode === "view" || mode === "drag" ? 96 : mode === "link" ? 56 : mode === "text" ? 4 : 34;
  const filled = mode === "view" || mode === "drag";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ opacity: visible && mode !== "hidden" ? 1 : 0, transition: "opacity 200ms" }}
    >
      <div ref={ringRef} className="absolute left-0 top-0 will-change-transform">
        <div
          className="flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-mono text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{
            width: ringSize,
            height: ringSize,
            scale: pressed ? 0.85 : 1,
            border: filled ? "none" : "1px solid var(--cursor-ring)",
            background: filled
              ? "var(--accent)"
              : mode === "link"
                ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                : "transparent",
            color: "var(--accent-ink)",
            boxShadow: mode === "link" ? "var(--glow-accent)" : "none",
            transition:
              "width 420ms var(--ease-out), height 420ms var(--ease-out), background 300ms, border 300ms, box-shadow 300ms, scale 200ms",
          }}
        >
          {filled && (label || (mode === "drag" ? "Drag" : "View"))}
        </div>
      </div>
      <div ref={dotRef} className="absolute left-0 top-0 will-change-transform">
        <div
          className="-translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
          style={{
            width: mode === "text" ? 2 : 6,
            height: mode === "text" ? 22 : 6,
            borderRadius: mode === "text" ? 1 : 999,
            opacity: filled ? 0 : 1,
            transition: "width 200ms, height 200ms, opacity 200ms",
          }}
        />
      </div>
    </div>
  );
}
