import { clsx } from "clsx";

/**
 * Generative cover used where a project has no screenshots: drifting colour
 * fields over a dot grid, with a mono label. Decorative only. Dark: neon
 * blooms on near-black; light: Universe tints on a green-grey sheet (the
 * blob colours and dots come from `.mkp-art` tokens in pages.css).
 */
export function GradientArt({
  label,
  mark,
  className,
  seed = 0,
}: {
  label?: string;
  /** Large glyphs shown in the corner (e.g. a number or initials). */
  mark?: string;
  className?: string;
  seed?: number;
}) {
  const flip = seed % 2 === 1;
  return (
    <div aria-hidden className={clsx("mkp-art", className)}>
      <span
        className="mkp-art-blob"
        style={{
          width: "70%",
          height: "90%",
          left: flip ? "35%" : "-10%",
          top: "-20%",
          background: "var(--glow, var(--accent))",
        }}
      />
      <span
        className="mkp-art-blob"
        style={{
          width: "55%",
          height: "75%",
          left: flip ? "-5%" : "45%",
          top: "35%",
          background: "var(--art-b)",
          animationDelay: "-6s",
          animationDuration: "19s",
        }}
      />
      <span
        className="mkp-art-blob"
        style={{
          width: "35%",
          height: "45%",
          left: "30%",
          top: "15%",
          background: "var(--art-c)",
          opacity: 0.45,
          animationDelay: "-11s",
          animationDuration: "23s",
        }}
      />
      <span className="mkp-art-dots" />
      <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgb(7_8_11/0.75))] light:bg-[linear-gradient(180deg,transparent_55%,rgb(233_237_236/0.55))]" />
      {mark && (
        <span className="display mkp-figures absolute bottom-[-0.12em] right-[0.06em] text-[clamp(5rem,16vw,12rem)] leading-none text-white/[0.14] mix-blend-overlay light:text-black/[0.07] light:mix-blend-normal">
          {mark}
        </span>
      )}
      {label && (
        <span className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/30 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-white/80 backdrop-blur light:left-0 light:top-0 light:rounded-none light:border-0 light:bg-tint-neon light:px-2.5 light:py-1.5 light:text-xs light:normal-case light:tracking-normal light:text-black light:backdrop-blur-none">
          {label}
        </span>
      )}
    </div>
  );
}
