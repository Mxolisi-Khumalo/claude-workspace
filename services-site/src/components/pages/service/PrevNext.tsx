import Link from "next/link";
import { clsx } from "clsx";
import type { Service } from "@/content/types";
import { accentGroupHoverText, accentText } from "../shared/accent";

function Item({ service, dir }: { service: Service; dir: "prev" | "next" }) {
  const next = dir === "next";
  return (
    <Link
      href={`/services/${service.slug}`}
      data-cursor="view"
      data-cursor-label={next ? "Next" : "Prev"}
      className={clsx(
        "group relative flex min-h-[220px] flex-col justify-between gap-10 overflow-hidden px-[var(--gutter)] py-10 transition-colors duration-500 hover:bg-white/[0.02] md:min-h-[300px] md:py-14",
        next && "md:items-end md:text-right",
      )}
    >
      <span className="eyebrow flex items-center gap-3">
        {!next && <span aria-hidden className="transition-transform duration-500 group-hover:-translate-x-1.5">←</span>}
        {next ? "Next service" : "Previous service"}
        {next && <span aria-hidden className="transition-transform duration-500 group-hover:translate-x-1.5">→</span>}
      </span>
      <span>
        <span
          className={clsx(
            "display block text-[clamp(2rem,4.6vw,4.5rem)] text-fg transition-colors duration-500",
            accentGroupHoverText[service.accent],
          )}
        >
          {service.title}
        </span>
        <span className={clsx("mt-4 block max-w-[46ch] text-fg-muted", next && "md:ml-auto")}>{service.tagline}</span>
      </span>
      <span
        aria-hidden
        className={clsx(
          "absolute bottom-0 h-px w-full scale-x-0 transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-x-100",
          next ? "right-0 origin-right" : "left-0 origin-left",
          accentText[service.accent],
          "bg-current",
        )}
      />
    </Link>
  );
}

export function PrevNext({ prev, next }: { prev: Service; next: Service }) {
  return (
    <nav aria-label="More services" className="grid border-y border-line md:grid-cols-2">
      <Item service={prev} dir="prev" />
      <div className="border-t border-line md:border-l md:border-t-0">
        <Item service={next} dir="next" />
      </div>
    </nav>
  );
}
