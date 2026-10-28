"use client";

import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useRef } from "react";

gsap.registerPlugin(ScrambleTextPlugin);

/** Mono label that "decodes" itself on hover — a small developer-flavoured flourish. */
export function ScrambleLabel({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const run = () => {
    if (!ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.to(ref.current, {
      duration: 0.7,
      scrambleText: { text, chars: "01<>/{}[]#$%_", speed: 0.6 },
    });
  };
  return (
    <span ref={ref} className={className} onPointerEnter={run} onFocus={run}>
      {text}
    </span>
  );
}
