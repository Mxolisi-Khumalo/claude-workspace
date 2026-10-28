"use client";

import { useRef } from "react";
import { useGlow } from "./useGlow";

/** Wraps server-rendered `.hm-glow` cards with the shared cursor glow. */
export function GlowGroup({
  as: Tag = "div",
  className,
  children,
}: {
  as?: "div" | "ul" | "ol";
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useGlow(ref);
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={`hm-glow-host ${className ?? ""}`}>
      {children}
    </Tag>
  );
}
