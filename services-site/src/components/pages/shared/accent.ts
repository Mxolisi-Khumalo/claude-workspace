import type { CSSProperties } from "react";
import type { Service } from "@/content/types";

export type Accent = Service["accent"];

/**
 * Static class maps so Tailwind can see every class name at build time
 * (dynamic strings like `text-${accent}` would be purged).
 */
export const accentText: Record<Accent, string> = {
  accent: "text-accent",
  violet: "text-violet",
  amber: "text-amber",
  sky: "text-sky",
  pink: "text-pink",
};

export const accentBg: Record<Accent, string> = {
  accent: "bg-accent",
  violet: "bg-violet",
  amber: "bg-amber",
  sky: "bg-sky",
  pink: "bg-pink",
};

export const accentSoftBg: Record<Accent, string> = {
  accent: "bg-accent/10",
  violet: "bg-violet/10",
  amber: "bg-amber/10",
  sky: "bg-sky/10",
  pink: "bg-pink/10",
};

export const accentBorder: Record<Accent, string> = {
  accent: "border-accent/40",
  violet: "border-violet/40",
  amber: "border-amber/40",
  sky: "border-sky/40",
  pink: "border-pink/40",
};

const accentVar: Record<Accent, string> = {
  accent: "var(--accent)",
  violet: "var(--violet)",
  amber: "var(--amber)",
  sky: "var(--sky)",
  pink: "var(--pink)",
};

/**
 * Sets `--glow` for a subtree; glow cards, timelines and gradient art read it.
 * Inline custom properties keep class names static.
 */
export function glowStyle(accent: Accent): CSSProperties {
  return { "--glow": accentVar[accent] } as CSSProperties;
}

export const accentGroupHoverText: Record<Accent, string> = {
  accent: "group-hover:text-accent",
  violet: "group-hover:text-violet",
  amber: "group-hover:text-amber",
  sky: "group-hover:text-sky",
  pink: "group-hover:text-pink",
};
