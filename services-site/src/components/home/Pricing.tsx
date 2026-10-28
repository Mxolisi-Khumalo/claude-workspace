import type { Service } from "@/content/types";
import { PricingGrid, type PricingCardData } from "./PricingGrid";
import { SectionHeading } from "./SectionHeading";
import { fromPrices } from "./utils";

export function Pricing({ services }: { services: Service[] }) {
  const items: PricingCardData[] = services.map((s) => {
    const from = fromPrices(s);
    return {
      slug: s.slug,
      title: s.title,
      accent: `var(--${s.accent})`,
      from,
      packages: s.packages.map((p) => ({
        name: p.name,
        zar: p.priceFromZar,
        usd: p.priceFromUsd,
        timeline: p.timeline,
        purchasable: p.purchasable,
      })),
    };
  });

  return (
    <section id="pricing" aria-label="Pricing" className="relative scroll-mt-24 py-20 md:py-32 light:py-16 md:light:py-24">
      <div className="container-x">
        <SectionHeading
          eyebrow="// 04 — Pricing"
          title="Published prices. No guesswork."
          intro="Every package has a starting price and a typical timeline. Pick a service to get an exact, itemised quote in a couple of minutes."
        />
        <div className="mt-14 md:mt-20 light:mt-0">
          <PricingGrid items={items} />
        </div>
        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-fg-muted light:mt-6">
          All prices are starting points; Byte gives an exact quote in minutes.{" "}
          <span className="text-xs text-fg-subtle">Not a VAT vendor.</span>
        </p>
      </div>
    </section>
  );
}
