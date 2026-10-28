"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

/**
 * Renders the final value on the server (so it is correct without JS and for
 * reduced motion), then counts up from zero with an ease-out when scrolled
 * into view. Screen readers always get the final value.
 */
export function CountUp({ value, suffix, className }: { value: number; suffix?: string; className?: string }) {
  const num = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = num.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // already on screen: don't flash to 0
    el.textContent = "0";
    const counter = { v: 0 };
    let tween: gsap.core.Tween | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        tween = gsap.to(counter, {
          v: value,
          duration: 2,
          ease: "expo.out",
          onUpdate: () => {
            el.textContent = String(Math.round(counter.v));
          },
        });
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      tween?.kill();
      el.textContent = String(value);
    };
  }, [value]);

  return (
    <span className={className}>
      <span className="sr-only">
        {value}
        {suffix}
      </span>
      {/* No tabular-nums: Mona Sans draws a slashed zero in its tabular figures. */}
      <span aria-hidden>
        <span ref={num}>{value}</span>
        {suffix && <span className="text-accent">{suffix}</span>}
      </span>
    </span>
  );
}
