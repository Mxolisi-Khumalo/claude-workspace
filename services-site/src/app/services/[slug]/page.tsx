import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
import { caseStudiesFor, getService, profile, services } from "@/content";
import { Marquee } from "@/components/ui/Marquee";
import { CaseStudyCard } from "@/components/pages/shared/CaseStudyCard";
import { CtaBand } from "@/components/pages/shared/CtaBand";
import { EvidenceBadge } from "@/components/pages/shared/EvidenceBadge";
import { GlowGroup } from "@/components/pages/shared/GlowGroup";
import { Reveal } from "@/components/pages/shared/Reveal";
import { SectionHeading } from "@/components/pages/shared/SectionHeading";
import { glowStyle } from "@/components/pages/shared/accent";
import { pad } from "@/components/pages/shared/helpers";
import { EvidenceGrid } from "@/components/pages/service/EvidenceGrid";
import { Faq } from "@/components/pages/service/Faq";
import { Packages } from "@/components/pages/service/Packages";
import { PrevNext } from "@/components/pages/service/PrevNext";
import { ProcessTimeline } from "@/components/pages/service/ProcessTimeline";
import { ServiceHero } from "@/components/pages/service/ServiceHero";
import "@/components/pages/pages.css";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return {
    title: service.title,
    description: service.tagline,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: {
      type: "website",
      siteName: `${profile.shortName}.dev`,
      title: `${service.title} — ${profile.name}`,
      description: service.tagline,
      url: `/services/${service.slug}`,
    },
  };
}

/** Grid spans so deliverable cards always fill complete rows. */
function deliverableSpan(i: number, n: number) {
  const emptyLg = (3 - (n % 3)) % 3;
  const lgWide = (emptyLg >= 1 && i === 0) || (emptyLg === 2 && i === n - 1);
  const smWide = n % 2 === 1 && i === n - 1;
  return clsx(lgWide && "lg:col-span-2", smWide && "sm:col-span-2", smWide && !lgWide && "lg:col-span-1");
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const index = services.findIndex((s) => s.slug === service.slug);
  const prev = services[(index - 1 + services.length) % services.length];
  const next = services[(index + 1) % services.length];
  const studies = caseStudiesFor(service.slug);

  let section = 0;
  const num = () => pad(++section);
  const [lead, ...rest] = service.description;

  return (
    <article style={glowStyle(service.accent)}>
      <ServiceHero service={service} index={index} />

      {/* Overview */}
      <section className="container-x py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <SectionHeading index={num()} label="Overview" title="How I approach it" size="sm" />
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <Reveal className="space-y-6">
              <p data-reveal className="mkp-measure text-[clamp(1.25rem,1.9vw,1.6rem)] leading-snug text-fg">
                {lead}
              </p>
              {rest.map((p) => (
                <p data-reveal key={p.slice(0, 32)} className="mkp-measure text-lg leading-relaxed text-fg-muted">
                  {p}
                </p>
              ))}
            </Reveal>

            <div className="mt-14">
              <h3 className="eyebrow mb-5">Ideal for</h3>
              <Reveal as="ul" className="border-t border-line">
                {service.idealFor.map((item) => (
                  <li data-reveal key={item} className="flex items-start gap-4 border-b border-line py-5 text-lg text-fg">
                    <span aria-hidden className="mt-1 font-mono text-sm text-[var(--glow)]">
                      ↳
                    </span>
                    {item}
                  </li>
                ))}
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Deliverables */}
      <section className="container-x py-20 md:py-28">
        <SectionHeading
          index={num()}
          label="Deliverables"
          title="What's included"
          align="split"
          intro="What a typical engagement delivers. The package you choose sets the scope; your written quote lists exactly what's in it."
        />
        <GlowGroup as="ol" className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {service.deliverables.map((d, i, all) => (
            <li
              key={d}
              className={clsx(
                "mkp-card flex flex-col justify-between gap-6 p-6 sm:min-h-[180px] sm:gap-10 md:min-h-[210px] md:p-7",
                deliverableSpan(i, all.length),
              )}
            >
              <span className="mkp-card-edge" />
              <span className="flex items-center justify-between font-mono text-xs">
                <span className="text-[var(--glow)]">{pad(i + 1)}</span>
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--glow)] shadow-[0_0_12px_var(--glow)]" />
              </span>
              <p className="max-w-[34ch] text-lg leading-snug text-fg md:text-xl">{d}</p>
            </li>
          ))}
        </GlowGroup>
      </section>

      {/* Process */}
      <section className="container-x py-20 md:py-28">
        <SectionHeading
          index={num()}
          label="Process"
          title="How we'll work"
          align="split"
          intro="Clear stages with agreed outcomes, so you always know where things stand and can steer early rather than discover surprises at the end."
        />
        <div className="mt-16 md:mt-20">
          <ProcessTimeline steps={service.process} />
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="container-x scroll-mt-24 py-20 md:py-28">
        <SectionHeading
          index={num()}
          label="Packages"
          title="Packages & pricing"
          align="split"
          intro="Published starting prices in rand and US dollars. Pick a package, or ask Byte to size a custom scope."
        />
        <div className="mt-12">
          <Packages packages={service.packages} serviceTitle={service.title} serviceSlug={service.slug} />
        </div>
      </section>

      {/* Evidence */}
      <section id="evidence" className="container-x scroll-mt-24 py-20 md:py-28">
        <SectionHeading
          index={num()}
          label="Evidence"
          title="Proof, not promises"
          align="split"
          intro={
            <>
              <p>Every claim below links to the file that proves it, so you can check the work for yourself.</p>
              <div className="mt-5">
                <EvidenceBadge strength={service.evidenceStrength} explain id={`strength-evidence-${service.slug}`} />
              </div>
            </>
          }
        />
        <div className="mt-14">
          <EvidenceGrid items={service.evidence} />
        </div>
      </section>

      {/* Related case studies */}
      {studies.length > 0 && (
        <section className="container-x py-20 md:py-28">
          <SectionHeading
            index={num()}
            label="Case studies"
            title="Go deeper"
            align="split"
            intro="Full write-ups of the projects behind this evidence: the problem, the approach and what the code does."
          />
          <GlowGroup className={clsx("mt-14 grid gap-5", studies.length > 1 && "md:grid-cols-2")}>
            {studies.map((c) => (
              <CaseStudyCard key={c.slug} study={c} className={studies.length === 1 ? "md:max-w-3xl" : undefined} />
            ))}
          </GlowGroup>
        </section>
      )}

      {/* Stack */}
      <section className="py-20 md:py-28">
        <div className="container-x">
          <SectionHeading index={num()} label="Stack" title="Tools of the trade" />
        </div>
        <div aria-hidden className="mt-14 border-y border-line py-6 md:py-8">
          <Marquee speed={36}>
            {service.tech.map((t) => (
              <span key={t} className="display mkp-ghost-muted flex items-center whitespace-nowrap px-6 text-[clamp(2.5rem,6vw,5.5rem)]">
                {t}
                <span className="ml-12 text-[0.4em] text-[var(--glow)]">✦</span>
              </span>
            ))}
          </Marquee>
        </div>
        <ul className="container-x mt-10 flex flex-wrap gap-2.5" aria-label={`Technologies used for ${service.title}`}>
          {service.tech.map((t) => (
            <li key={t} className="mkp-chip">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--glow)]" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="container-x py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <SectionHeading index={num()} label="FAQ" title="Questions, answered" size="sm" />
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <Faq items={service.faq} />
          </div>
        </div>
      </section>

      <div className="container-x pb-20 md:pb-28">
        <CtaBand
          title="Tell me what you're building."
          body="Byte, my AI project concierge, can scope this with you, give you a ballpark quote from these packages and book a free 30-minute discovery call."
          buttonLabel="Get a quote for this"
          serviceSlug={service.slug}
          seedPrompt={`I'm interested in ${service.title}. Can you help me scope it?`}
        />
      </div>

      <PrevNext prev={prev} next={next} />
    </article>
  );
}
