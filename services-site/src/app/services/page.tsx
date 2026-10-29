import type { Metadata } from "next";
import { profile, services } from "@/content";
import type { EvidenceStrength } from "@/content/types";
import { RevealText } from "@/components/ui/RevealText";
import { Breadcrumbs } from "@/components/pages/shared/Breadcrumbs";
import { CtaBand } from "@/components/pages/shared/CtaBand";
import { EvidenceBadge } from "@/components/pages/shared/EvidenceBadge";
import { Reveal } from "@/components/pages/shared/Reveal";
import { fromPrice, pad, strengthCopy } from "@/components/pages/shared/helpers";
import { ServiceIndexList, type IndexRow } from "@/components/pages/service/ServiceIndexList";
import "@/components/pages/pages.css";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Full-stack development services — interactive websites, web apps, cloud backends, document automation, AI assistants, interactive experiences and mentoring — each backed by inspectable work.",
  alternates: { canonical: "/services" },
};

export default function ServicesIndexPage() {
  const rows: IndexRow[] = services.map((s, i) => ({
    slug: s.slug,
    n: pad(i + 1),
    title: s.title,
    tagline: s.tagline,
    strength: s.evidenceStrength,
    fromZar: fromPrice(s, "ZAR"),
    fromUsd: fromPrice(s, "USD"),
    accent: s.accent,
    image: s.evidence.find((e) => e.image)?.image,
  }));
  const strengths: EvidenceStrength[] = ["strong", "moderate", "emerging"];

  return (
    <>
      <header className="relative overflow-hidden pt-[calc(var(--nav-h)+2.5rem)] md:pt-[calc(var(--nav-h)+4rem)]">
        <div aria-hidden className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-full opacity-60" />
        <div className="container-x relative">
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Services" }]} />
          <p className="eyebrow mt-10 md:mt-14">
            <span className="text-accent">{"//"}</span> Services · {pad(services.length)} offerings
          </p>
          <RevealText as="h1" by="words" immediate className="display mt-6 max-w-[13ch] text-[clamp(2.75rem,9vw,8.5rem)]">
            Services, backed by evidence.
          </RevealText>
          <Reveal immediate delay={0.3} className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end">
            <p data-reveal className="mkp-measure text-[clamp(1.15rem,1.8vw,1.5rem)] leading-snug text-fg">
              {profile.subhead}
            </p>
            <p data-reveal className="mkp-measure text-fg-muted lg:justify-self-end">
              Every service page links to the work that proves it — usually the exact file in a public repository — with
              published starting prices and an honest rating of how much evidence there is.
            </p>
          </Reveal>
        </div>
      </header>

      <section aria-label="All services" className="container-x pt-20 md:pt-28">
        <ServiceIndexList rows={rows} />
      </section>

      <section className="mkp-sec container-x py-24 md:py-32" aria-labelledby="strength-heading">
        <div className="mkp-split grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-5">
              <span className="text-accent light:hidden">{"//"}</span> <span className="mkp-slug">Reading the badges</span>
            </p>
            <h2 id="strength-heading" className="display text-[clamp(2rem,4vw,3.5rem)]">
              How strong is the evidence?
            </h2>
          </div>
          <Reveal as="ul" className="mkp-stack grid gap-4 lg:col-span-7 lg:col-start-6">
            {strengths.map((s) => (
              <li data-reveal key={s} className="mkp-card p-6 md:p-7">
                <span className="mkp-card-edge" />
                <EvidenceBadge strength={s} />
                <p className="mt-4 leading-relaxed text-fg-muted">{strengthCopy[s].explain}</p>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      <div className="mkp-sec container-x pb-8 light:border-b light:border-line">
        <CtaBand
          eyebrow="// Not sure which you need?"
          title="Describe the problem. I'll map the service."
          body="Tell Byte, my AI project concierge, what you're trying to achieve. It will match you to the right service, show the evidence and give you a ballpark quote."
          buttonLabel="Ask Byte"
          seedPrompt="I'm not sure which service I need. Can you help me work it out?"
        />
      </div>
    </>
  );
}
