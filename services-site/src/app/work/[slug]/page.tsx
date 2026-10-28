import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { caseStudies, getCaseStudy, getService, profile } from "@/content";
import type { Service } from "@/content/types";
import { RevealText } from "@/components/ui/RevealText";
import { Breadcrumbs } from "@/components/pages/shared/Breadcrumbs";
import { caseStudyNumber } from "@/components/pages/shared/CaseStudyCard";
import { EvidenceBadge } from "@/components/pages/shared/EvidenceBadge";
import { ExternalButton } from "@/components/pages/shared/ExternalButton";
import { GlowGroup } from "@/components/pages/shared/GlowGroup";
import { Reveal } from "@/components/pages/shared/Reveal";
import { glowStyle } from "@/components/pages/shared/accent";
import { Gallery } from "@/components/pages/work/Gallery";
import { NextCase } from "@/components/pages/work/NextCase";
import "@/components/pages/pages.css";

type Props = { params: Promise<{ slug: string }> };

/**
 * Every slug is prerendered from src/content via generateStaticParams, so the
 * page awaits `params` at the top (real 404 status for unknown slugs) and a
 * client navigation simply waits for the static payload instead of flashing
 * a placeholder. This opts the segment out of instant-navigation validation.
 */
export const instant = false;

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) return {};
  return {
    title: `${study.title} — case study`,
    description: study.summary,
    alternates: { canonical: `/work/${study.slug}` },
    openGraph: {
      type: "article",
      siteName: `${profile.shortName}.dev`,
      title: `${study.title} — case study by ${profile.name}`,
      description: study.summary,
      url: `/work/${study.slug}`,
    },
  };
}

function repoLabel(url: string) {
  return url.replace(/^https?:\/\/(www\.)?github\.com\//, "");
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) notFound();

  const index = caseStudies.findIndex((c) => c.slug === study.slug);
  const next = caseStudies[(index + 1) % caseStudies.length];
  const related = study.services.map((s) => getService(s)).filter((s): s is Service => Boolean(s));
  const n = caseStudyNumber(study.slug);
  const chapters = [
    { label: "Challenge", body: study.challenge },
    { label: "Approach", body: study.approach },
    { label: "Outcome", body: study.outcome },
  ];

  return (
    <article style={glowStyle(related[0]?.accent ?? "accent")}>
      <header className="relative overflow-hidden pt-[calc(var(--nav-h)+2.5rem)] md:pt-[calc(var(--nav-h)+4rem)]">
        <div aria-hidden className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-full opacity-60" />
        <div className="container-x relative">
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/work", label: "Work" }, { label: study.title }]} />
          <p className="eyebrow mt-10 flex items-center gap-3 md:mt-14">
            <span className="text-[var(--glow)]">{"//"}</span> Case study {n}
          </p>
          <RevealText
            as="h1"
            by="words"
            immediate
            className="display mt-6 max-w-[16ch] text-[clamp(2.5rem,7.5vw,7rem)] [overflow-wrap:anywhere]"
          >
            {study.title}
          </RevealText>

          <Reveal immediate delay={0.3} className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-8">
            <p data-reveal className="mkp-measure text-[clamp(1.2rem,1.9vw,1.6rem)] leading-snug text-fg lg:col-span-7">
              {study.summary}
            </p>
            <div data-reveal className="flex flex-col gap-6 lg:col-span-4 lg:col-start-9">
              <dl className="grid gap-5 border-t border-line pt-6 text-sm">
                <div>
                  <dt className="eyebrow mb-3">Stack</dt>
                  <dd>
                    <ul className="flex flex-wrap gap-2" aria-label="Technologies">
                      {study.stack.map((t) => (
                        <li key={t} className="rounded-full border border-line px-2.5 py-1 font-mono text-[11px] text-fg-muted">
                          {t}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
                {related.length > 0 && (
                  <div>
                    <dt className="eyebrow mb-3">Evidence for</dt>
                    <dd className="flex flex-wrap gap-x-4 gap-y-2">
                      {related.map((s) => (
                        <Link
                          key={s.slug}
                          href={`/services/${s.slug}`}
                          className="text-fg underline decoration-[var(--glow)] decoration-1 underline-offset-4 transition-colors hover:text-[var(--glow)]"
                        >
                          {s.title}
                        </Link>
                      ))}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="eyebrow mb-3">Source</dt>
                  <dd className="font-mono text-xs text-fg-muted">{repoLabel(study.repoUrl)}</dd>
                </div>
              </dl>
              <div>
                <ExternalButton href={study.repoUrl} cursorLabel="Code">
                  View the code
                </ExternalButton>
              </div>
            </div>
          </Reveal>
        </div>
      </header>

      <section aria-label="Screenshots" className="container-x pt-16 md:pt-24">
        <Reveal y={48}>
          <Gallery images={study.images} title={study.title} mark={n} />
        </Reveal>
      </section>

      <div className="container-x py-16 md:py-24">
        {chapters.map((c, i) => (
          <section key={c.label} className="grid gap-6 border-t border-line py-14 md:py-20 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-4">
              <span aria-hidden className="display mkp-ghost mkp-figures block text-[clamp(5rem,13vw,11rem)] leading-[0.8]">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <p className="eyebrow mb-4">
                <span className="text-[var(--glow)]">{"//"}</span> {String(i + 1).padStart(2, "0")}
              </p>
              <RevealText as="h2" className="display text-[clamp(2.25rem,5vw,4.5rem)]">
                {c.label}
              </RevealText>
              <Reveal>
                <p className="mkp-measure mt-8 text-lg leading-relaxed text-fg-muted md:text-xl md:leading-relaxed">{c.body}</p>
              </Reveal>
            </div>
          </section>
        ))}
      </div>

      {related.length > 0 && (
        <section className="container-x pb-20 md:pb-28" aria-labelledby="related-heading">
          <p className="eyebrow mb-5">
            <span className="text-[var(--glow)]">{"//"}</span> Related services
          </p>
          <h2 id="related-heading" className="display max-w-3xl text-[clamp(2rem,4.4vw,3.75rem)]">
            Want something like this?
          </h2>
          <GlowGroup as="ul" className="mt-12 grid gap-5 md:grid-cols-2">
            {related.map((s) => (
              <li key={s.slug} className="mkp-card group relative flex flex-col gap-6 p-6 md:p-8" style={glowStyle(s.accent)}>
                <span className="mkp-card-edge" />
                <EvidenceBadge strength={s.evidenceStrength} className="self-start" />
                <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  <Link
                    href={`/services/${s.slug}`}
                    data-cursor="view"
                    data-cursor-label="Open"
                    className="after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-accent"
                  >
                    {s.title}
                  </Link>
                </h3>
                <p className="leading-relaxed text-fg-muted">{s.tagline}</p>
                <p aria-hidden className="mt-auto flex items-center gap-2 text-sm font-semibold">
                  View service
                  <span className="text-[var(--glow)] transition-transform duration-500 group-hover:translate-x-1.5">→</span>
                </p>
              </li>
            ))}
          </GlowGroup>
        </section>
      )}

      <section className="container-x pb-20 md:pb-28">
        <div className="mkp-card relative overflow-hidden px-6 py-10 md:px-12 md:py-14">
          <span className="mkp-card-edge" />
          <div aria-hidden className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow mb-3">{"// Don't take my word for it"}</p>
              <h2 className="display text-[clamp(1.75rem,3.4vw,2.75rem)]">The code is public. Read it.</h2>
              <p className="mt-3 font-mono text-sm text-fg-muted">{repoLabel(study.repoUrl)}</p>
            </div>
            <ExternalButton href={study.repoUrl} cursorLabel="Code" className="self-start md:self-auto">
              View the code
            </ExternalButton>
          </div>
        </div>
      </section>

      <NextCase study={next} />
    </article>
  );
}
