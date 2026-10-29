import type { Stat } from "@/content/types";
import { RevealText } from "@/components/ui/RevealText";
import { CountUp } from "./CountUp";
import { GlowGroup } from "./GlowGroup";
import { pad2 } from "./utils";

const PROP_COLORS = ["var(--accent)", "var(--violet)", "var(--sky)", "var(--amber)"];

/**
 * Count-up stats from the profile plus the four working principles.
 * Light: heading cell, then the stats and principles as ruled cells.
 */
export function Impact({ stats, valueProps }: { stats: Stat[]; valueProps: string[] }) {
  return (
    <section aria-label="Impact" className="relative py-20 md:py-32 light:py-16 md:light:py-24">
      <div className="container-x">
        <div className="light:-mx-[var(--gutter)] light:border-t light:border-line light:px-[var(--gutter)] light:py-12 md:light:py-14">
          <p className="eyebrow mb-5">{"// By the numbers"}</p>
          <RevealText as="h2" className="display max-w-4xl text-[clamp(2.5rem,6.5vw,6rem)]">
            Years of building, teaching and shipping.
          </RevealText>
        </div>

        <dl className="mt-14 grid grid-cols-2 border-y border-line md:mt-20 lg:grid-cols-4 light:-mx-[var(--gutter)] light:mt-0">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`hm-stat flex flex-col-reverse justify-end gap-3 py-8 pr-4 md:py-12 ${i % 2 === 1 ? "pl-5 md:pl-8" : ""} ${
                i % 2 === 1 ? "border-l border-line" : ""
              } ${i >= 2 ? "border-t border-line lg:border-t-0" : ""} ${i === 2 ? "lg:border-l lg:pl-8" : ""}`}
            >
              <dt className="max-w-[22ch] text-sm leading-snug text-fg-muted md:text-base">{s.label}</dt>
              <dd className="display hm-figures text-[clamp(2.75rem,5.6vw,5.25rem)] leading-none">
                <CountUp value={s.value} suffix={s.suffix} />
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-24 grid gap-10 lg:mt-32 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16 light:-mx-[var(--gutter)] light:mt-0 light:gap-0 light:border-b light:border-line">
          <div className="light:px-[var(--gutter)] light:py-12 lg:light:py-14 lg:light:pr-10">
            <h3 className="display text-[clamp(1.9rem,3.4vw,3rem)]">What working with me looks like.</h3>
            <p className="mt-5 max-w-sm leading-relaxed text-fg-muted">
              Four principles that shape every project, from a one-page site to a full product build.
            </p>
          </div>
          <GlowGroup
            as="ul"
            className="grid gap-4 sm:grid-cols-2 light:gap-px light:border-t light:border-line light:bg-line lg:light:border-l lg:light:border-t-0"
          >
            {valueProps.map((v, i) => (
              <li
                key={v}
                className="hm-glow rounded-[var(--radius-lg)] border border-line bg-bg-elevated/75 p-7 md:p-8 light:rounded-none light:border-0 light:bg-bg light:px-[var(--gutter)] md:light:px-8"
                style={{ "--glow": PROP_COLORS[i % PROP_COLORS.length] } as React.CSSProperties}
              >
                <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle light:text-xs light:normal-case light:tracking-normal">
                  <span
                    className="h-1.5 w-1.5 rounded-full light:h-2 light:w-2 light:rounded-none"
                    style={{ background: PROP_COLORS[i % PROP_COLORS.length] }}
                  />
                  Principle {pad2(i + 1)}
                </p>
                <p className="mt-6 text-xl font-medium leading-snug tracking-tight text-fg md:text-[1.4rem]">{v}</p>
              </li>
            ))}
          </GlowGroup>
        </div>
      </div>
    </section>
  );
}
