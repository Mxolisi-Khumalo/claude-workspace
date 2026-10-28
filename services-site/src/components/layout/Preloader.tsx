"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useRef, useState } from "react";

gsap.registerPlugin(useGSAP);

const LINES = ["resolving services…", "linking evidence…", "waking up the robot…", "ready."];

/**
 * A short "build output" intro shown once per browser session. Skipped for
 * reduced-motion users and repeat page views; never blocks longer than ~1.6s.
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const seen = sessionStorage.getItem("mk-preloaded") === "1";
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (seen || reduced) {
        setDone(true);
        return;
      }
      sessionStorage.setItem("mk-preloaded", "1");
      document.documentElement.style.overflow = "hidden";

      const progress = { v: 0 };
      const tl = gsap.timeline({
        onComplete: () => {
          document.documentElement.style.overflow = "";
          setDone(true);
        },
      });
      tl.to(progress, {
        v: 100,
        duration: 1.1,
        ease: "power2.inOut",
        onUpdate: () => {
          if (count.current) count.current.textContent = String(Math.round(progress.v)).padStart(3, "0");
        },
      })
        .from(".pl-line", { opacity: 0, x: -8, stagger: 0.22, duration: 0.3 }, 0)
        .to(".pl-bar", { scaleX: 1, duration: 1.1, ease: "power2.inOut" }, 0)
        .to(".pl-inner", { opacity: 0, y: -20, duration: 0.35, ease: "power2.in" }, ">")
        .to(el, { clipPath: "inset(0 0 100% 0)", duration: 0.75, ease: "expo.inOut" }, "<0.1");
    },
    { scope: root },
  );

  if (done) return null;

  return (
    <div
      ref={root}
      className="preloader fixed inset-0 z-[200] grid place-items-center bg-bg"
      style={{ clipPath: "inset(0 0 0% 0)" }}
      aria-hidden
    >
      <div className="pl-inner w-[min(420px,80vw)] font-mono text-sm">
        <p className="mb-4 text-fg-muted">
          <span className="text-accent">$</span> npm run build <span className="text-fg-subtle">--target=you</span>
        </p>
        <ul className="mb-8 space-y-1 text-fg-subtle">
          {LINES.map((l, i) => (
            <li key={l} className="pl-line">
              <span className={i === LINES.length - 1 ? "text-accent" : "text-violet"}>✓</span> {l}
            </li>
          ))}
        </ul>
        <div className="flex items-end justify-between">
          <span className="display text-6xl text-fg" ref={count}>
            000
          </span>
          <span className="text-fg-subtle">%</span>
        </div>
        <div className="mt-3 h-px w-full bg-line">
          <div className="pl-bar h-px origin-left scale-x-0 bg-accent" />
        </div>
      </div>
    </div>
  );
}
