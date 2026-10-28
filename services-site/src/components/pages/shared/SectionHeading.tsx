import { clsx } from "clsx";
import { RevealText } from "@/components/ui/RevealText";

/**
 * Numbered section heading: "// 03 — Process" eyebrow + kinetic display h2.
 * Pass `className="mkp-head"` for a full-width heading that sits in its own
 * ruled cell in the light theme.
 */
export function SectionHeading({
  index,
  label,
  title,
  intro,
  className,
  align = "left",
  size = "lg",
}: {
  index?: string;
  label: string;
  title: string;
  intro?: React.ReactNode;
  className?: string;
  align?: "left" | "split";
  /** "sm" for headings that sit in a narrow column. */
  size?: "sm" | "lg";
}) {
  return (
    <div
      className={clsx(
        align === "split" ? "grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16" : "max-w-4xl",
        className,
      )}
    >
      <div>
        {/* Light reads like a Universe slug ("01 — overview/"): no "//", lowercase label. */}
        <p className="eyebrow mb-5 flex items-center gap-3">
          <span className="text-[var(--glow,var(--accent))] light:hidden">{"//"}</span>
          {index && <span className="text-fg">{index}</span>}
          {index && <span aria-hidden className="h-px w-8 bg-line-strong" />}
          <span className="mkp-slug">{label}</span>
        </p>
        <RevealText
          as="h2"
          by="lines"
          className={clsx(
            "display",
            size === "sm" ? "text-[clamp(2.25rem,3.6vw,3.5rem)]" : "text-[clamp(2.25rem,5.2vw,4.75rem)]",
          )}
        >
          {title}
        </RevealText>
      </div>
      {intro && (
        <div className={clsx("mkp-measure text-lg leading-relaxed text-fg-muted", align === "left" && "mt-6")}>{intro}</div>
      )}
    </div>
  );
}
