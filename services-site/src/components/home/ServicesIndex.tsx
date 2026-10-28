import type { Service } from "@/content/types";
import { SectionHeading } from "./SectionHeading";
import { ServiceRows, type ServiceRowData } from "./ServiceRows";
import { fromPrices, numberWord } from "./utils";

export function ServicesIndex({ services }: { services: Service[] }) {
  const items: ServiceRowData[] = services.map((s) => {
    const from = fromPrices(s);
    const withImage = s.evidence.find((e) => e.image);
    return {
      slug: s.slug,
      title: s.title,
      tagline: s.tagline,
      accent: s.accent,
      strength: s.evidenceStrength,
      fromZar: from.zar,
      fromUsd: from.usd,
      preview: {
        image: withImage?.image,
        caption: `Evidence · ${(withImage ?? s.evidence[0])?.project ?? s.title}`,
        tech: s.tech.slice(0, 6),
      },
    };
  });

  return (
    <section id="services" aria-label="Services" className="relative scroll-mt-24 py-20 md:py-32 light:py-16 md:light:py-24">
      <div className="container-x">
        <SectionHeading
          eyebrow="// 01 — Services"
          title="What I can build for you."
          intro={
            <>
              {numberWord(services.length, true)} services, each with a published starting price and evidence you
              can check — most of it public code — before we ever talk.
            </>
          }
        />
        <div className="mt-14 md:mt-20 light:mt-0">
          <ServiceRows items={items} />
        </div>
      </div>
    </section>
  );
}
