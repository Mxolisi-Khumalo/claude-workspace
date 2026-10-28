import { clsx } from "clsx";
import { Magnetic } from "@/components/ui/Magnetic";

/** Outline pill for external links (opens in a new tab), matching ButtonLink. */
export function ExternalButton({
  href,
  children,
  className,
  cursorLabel = "Open",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  cursorLabel?: string;
}) {
  return (
    <Magnetic>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        data-cursor="view"
        data-cursor-label={cursorLabel}
        className={clsx(
          "group relative inline-flex items-center justify-center gap-2 rounded-full border border-line-strong px-6 py-3 text-sm font-semibold tracking-tight text-fg transition-colors duration-300 hover:border-accent hover:text-accent",
          className,
        )}
      >
        {children}
        <span aria-hidden className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
          ↗
        </span>
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </Magnetic>
  );
}
