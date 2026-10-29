import type { Faq as FaqItem } from "@/content/types";

/** FAQ accordion on native <details> — keyboard and no-JS friendly. */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="border-t border-line">
      {items.map((f) => (
        <details key={f.q} className="mkp-faq group border-b border-line">
          <summary className="flex cursor-pointer items-start justify-between gap-6 py-6 text-left text-lg font-medium leading-snug text-fg transition-colors hover:text-[var(--glow)] md:py-7 md:text-xl light:font-normal">
            <span>{f.q}</span>
            <span
              aria-hidden
              className="mkp-faq-icon mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-strong text-lg leading-none text-fg-muted group-open:border-[var(--glow)] group-open:text-[var(--glow)] light:rounded-[6px] light:bg-fg/5"
            >
              +
            </span>
          </summary>
          <p className="mkp-measure pb-7 pr-12 leading-relaxed text-fg-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
