"use client";

import Link from "next/link";
import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import { ensurePointerTracking, pointer } from "@/hooks/usePointer";
import { useTheme } from "@/hooks/useTheme";

/**
 * Glass "proof chips" that float around the hero headline on desktop with a
 * gentle pointer parallax. Every claim comes from src/content (case studies,
 * profile and the services' evidence) and links to where it is shown.
 * In the light theme they are a still row of white, ruled cells instead.
 */
const CHIPS = [
  {
    value: "86",
    label: "automated tests",
    meta: "AWS SAM · pytest",
    href: "/work/self-storage-platform",
    color: "var(--accent)",
    depth: 22,
    pos: "lg:right-0 lg:-top-[19%]",
    float: "6.5s",
  },
  {
    value: "115+",
    label: "students mentored",
    meta: "WeThinkCode_",
    href: "/services/mentoring",
    color: "var(--violet)",
    depth: -16,
    pos: "lg:right-[1%] lg:top-[36%]",
    float: "7.5s",
  },
  {
    value: "3.12×",
    label: "parallel speed-up",
    meta: "Java Fork/Join",
    href: "/work/parallel-computing",
    color: "var(--sky)",
    depth: 30,
    pos: "lg:right-[4%] lg:top-[71%]",
    float: "5.5s",
  },
  {
    value: "Live",
    label: "WebGL on this page",
    meta: "GLSL shader",
    href: "/services/interactive-websites",
    color: "var(--pink)",
    depth: -24,
    pos: "lg:left-[34%] lg:top-[106%]",
    float: "8s",
  },
] as const;

export function ProofChips({ className }: { className?: string }) {
  const root = useRef<HTMLUListElement>(null);
  const theme = useTheme();

  useEffect(() => {
    const host = root.current;
    if (!host || theme === "light") return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    if (!mq.matches) return;
    ensurePointerTracking();
    const layers = Array.from(host.querySelectorAll<HTMLElement>("[data-depth]"));
    const setters = layers.map((el) => ({
      d: Number(el.dataset.depth),
      x: gsap.quickTo(el, "x", { duration: 1.4, ease: "power3.out" }),
      y: gsap.quickTo(el, "y", { duration: 1.4, ease: "power3.out" }),
    }));
    const tick = () => {
      if (!pointer.active) return;
      for (const s of setters) {
        s.x(pointer.nx * s.d);
        s.y(pointer.ny * s.d * 0.6);
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      // Stop in-flight quickTo tweens too, or they drift the cells off after a theme switch.
      gsap.killTweensOf(layers);
      gsap.set(layers, { x: 0, y: 0 });
    };
  }, [theme]);

  return (
    <ul ref={root} className={className} aria-label="Proof points">
      {CHIPS.map((c) => (
        <li key={c.label} className={`hm-gate hm-chip lg:absolute ${c.pos} lg:light:static`}>
          <div data-depth={c.depth} className="h-full">
            <Link
              href={c.href}
              className="hm-float group flex h-full items-center gap-3 rounded-2xl border border-line-strong bg-surface/55 py-2.5 pl-3 pr-3 shadow-[0_20px_60px_-24px_rgb(0_0_0/0.8)] backdrop-blur-md transition-[border-color,background-color] duration-300 hover:border-[var(--chip)] hover:bg-surface/80 lg:h-auto lg:py-3 lg:pr-4 light:items-start light:rounded-none light:border-0 light:bg-surface light:p-4 light:shadow-none light:backdrop-blur-none light:hover:bg-[color-mix(in_srgb,var(--chip)_7%,var(--surface))] lg:light:h-full lg:light:px-6 lg:light:py-4"
              style={{ "--chip": c.color, "--float-dur": c.float } as React.CSSProperties}
            >
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full light:mt-1.5 light:rounded-none light:shadow-none!"
                style={{ background: c.color, boxShadow: `0 0 12px ${c.color}` }}
              />
              <span className="flex flex-col leading-tight">
                <span className="text-[13px] font-semibold text-fg lg:text-sm light:font-medium">
                  <span
                    className="light:mb-1.5 light:block light:text-[1.75rem] light:font-[480] light:leading-none light:tracking-[-0.02em] lg:light:text-[2rem]"
                    style={{ color: c.color }}
                  >
                    {c.value}
                  </span>{" "}
                  {c.label}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle light:mt-1 light:text-[11px] light:normal-case light:tracking-normal">
                  {c.meta}
                </span>
              </span>
              <span aria-hidden className="ml-auto hidden text-fg-subtle transition-transform lg:ml-1 lg:inline duration-300 group-hover:translate-x-0.5 group-hover:text-fg light:inline lg:light:ml-auto">
                ↗
              </span>
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
