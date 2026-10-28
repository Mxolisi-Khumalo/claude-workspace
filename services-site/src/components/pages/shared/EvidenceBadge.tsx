import { clsx } from "clsx";
import type { EvidenceStrength } from "@/content/types";
import { strengthCopy } from "./helpers";

const bars: Record<EvidenceStrength, number> = { strong: 3, moderate: 2, emerging: 1 };

const tone: Record<EvidenceStrength, string> = {
  strong: "border-accent/40 text-accent",
  moderate: "border-sky/40 text-sky",
  emerging: "border-amber/40 text-amber",
};

const barOn: Record<EvidenceStrength, string> = {
  strong: "bg-accent",
  moderate: "bg-sky",
  emerging: "bg-amber",
};

/** Small signal-strength meter. */
export function StrengthMeter({ strength }: { strength: EvidenceStrength }) {
  return (
    <span aria-hidden className="inline-flex items-end gap-[3px]">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={clsx("w-[3px] rounded-full", n <= bars[strength] ? barOn[strength] : "bg-white/15")}
          style={{ height: 4 + n * 3 }}
        />
      ))}
    </span>
  );
}

/**
 * Evidence-strength badge. With `explain`, it becomes a focusable trigger
 * whose honest explanation appears on hover or focus (and is announced to
 * screen readers via aria-describedby). Pure CSS — works without JS.
 */
export function EvidenceBadge({
  strength,
  explain = false,
  id,
  className,
}: {
  strength: EvidenceStrength;
  explain?: boolean;
  /** Unique id for the tooltip (required when `explain`). */
  id?: string;
  className?: string;
}) {
  const copy = strengthCopy[strength];
  const pill = (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border bg-bg/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] backdrop-blur",
        tone[strength],
        className,
      )}
    >
      <StrengthMeter strength={strength} />
      {copy.label}
      {explain && (
        <span aria-hidden className="grid h-4 w-4 place-items-center rounded-full border border-current text-[9px] leading-none">
          ?
        </span>
      )}
    </span>
  );

  if (!explain) return pill;

  const tipId = id ?? `strength-${strength}`;
  return (
    <span className="mkp-tip">
      <button type="button" aria-describedby={tipId} className="rounded-full">
        {pill}
        <span className="sr-only">: what does this mean?</span>
      </button>
      <span
        id={tipId}
        role="tooltip"
        className="mkp-tip-panel rounded-[var(--radius)] border border-line-strong bg-bg-elevated/95 p-4 text-left text-sm leading-relaxed text-fg-muted shadow-[0_24px_60px_-24px_rgb(0_0_0/0.9)] backdrop-blur-xl"
      >
        <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-fg">{copy.label}</span>
        {copy.explain}
      </span>
    </span>
  );
}
