import type { Metadata } from "next";
import { caseStudies } from "@/content";
import { RevealText } from "@/components/ui/RevealText";
import { Breadcrumbs } from "@/components/pages/shared/Breadcrumbs";
import { CaseStudyCard } from "@/components/pages/shared/CaseStudyCard";
import { CtaBand } from "@/components/pages/shared/CtaBand";
import { GlowGroup } from "@/components/pages/shared/GlowGroup";
import { Reveal } from "@/components/pages/shared/Reveal";
import { pad } from "@/components/pages/shared/helpers";
import "@/components/pages/pages.css";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Case studies behind the services: the problem, the approach and what the code does — each with a link to the public repository.",
  alternates: { canonical: "/work" },
};

export default function WorkIndexPage() {
  return (
    <>
      <header className="relative overflow-hidden pt-[calc(var(--nav-h)+2.5rem)] md:pt-[calc(var(--nav-h)+4rem)]">
        <div aria-hidden className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-full opacity-60" />
        <div className="container-x relative">
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Work" }]} />
          <p className="eyebrow mt-10 md:mt-14">
            <span className="text-accent">{"//"}</span> Work · {pad(caseStudies.length)} case studies
          </p>
          <RevealText as="h1" by="words" immediate className="display mt-6 max-w-[12ch] text-[clamp(2.75rem,9vw,8.5rem)]">
            The work behind the services.
          </RevealText>
          <Reveal immediate delay={0.3}>
            <p data-reveal className="mkp-measure mt-10 text-[clamp(1.15rem,1.8vw,1.5rem)] leading-snug text-fg-muted">
              Each case study explains the problem, the approach and what the code demonstrably does — with a link to the
              repository so you can check it yourself.
            </p>
          </Reveal>
        </div>
      </header>

      <section aria-label="Case studies" className="container-x py-20 md:py-28">
        <GlowGroup className="grid gap-5 md:grid-cols-2">
          {caseStudies.map((c, i) => (
            <CaseStudyCard key={c.slug} study={c} headingLevel="h2" sizes="(min-width: 768px) 45vw, 100vw" className={i % 2 === 1 ? "md:translate-y-16" : undefined} />
          ))}
        </GlowGroup>
      </section>

      <div className="container-x pb-8 pt-8 md:pt-16">
        <CtaBand
          title="Need something built like this?"
          body="Tell Byte, my AI project concierge, what you have in mind. It will map it to a service, show the closest evidence and give you a ballpark quote."
          buttonLabel="Start a project"
        />
      </div>
    </>
  );
}
