"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Host for a CSS hover/focus tooltip (`.mkp-tip`) that adds the missing
 * Escape-to-dismiss (WCAG 1.4.13). The panel stays hidden until both the
 * pointer and focus have left, then shows again on the next hover or focus.
 * Without JS the tooltip still works, just without Escape.
 */
export function DismissibleTip({ children }: { children: React.ReactNode }) {
  const host = useRef<HTMLSpanElement>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    // On the window: a hovered tooltip doesn't have keyboard focus.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (el.matches(":hover") || el.matches(":focus-within"))) setDismissed(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <span
      ref={host}
      className="mkp-tip"
      data-dismissed={dismissed ? "" : undefined}
      onPointerLeave={(e) => {
        if (!e.currentTarget.matches(":focus-within")) setDismissed(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !e.currentTarget.matches(":hover")) setDismissed(false);
      }}
    >
      {children}
    </span>
  );
}
