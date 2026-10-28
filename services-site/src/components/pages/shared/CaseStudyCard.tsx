import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";
import { caseStudies } from "@/content";
import type { CaseStudy } from "@/content/types";
import { GradientArt } from "./GradientArt";
import { pad } from "./helpers";

export function caseStudyNumber(slug: string) {
  return pad(caseStudies.findIndex((c) => c.slug === slug) + 1);
}

/** Linked case-study card with image (or generative cover) and hover reveal. */
export function CaseStudyCard({
  study,
  headingLevel: H = "h3",
  className,
  sizes = "(min-width: 1024px) 40vw, 100vw",
}: {
  study: CaseStudy;
  headingLevel?: "h2" | "h3";
  className?: string;
  sizes?: string;
}) {
  const cover = study.images[0];
  const n = caseStudyNumber(study.slug);
  return (
    <article className={clsx("mkp-card group flex flex-col overflow-hidden", className)}>
      <span className="mkp-card-edge" />
      <div className="relative aspect-[16/10] overflow-hidden border-b border-line">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes={sizes}
            className="object-cover object-top transition-transform duration-[1.4s] ease-[var(--ease-out)] group-hover:scale-[1.05]"
          />
        ) : (
          <GradientArt className="absolute inset-0" mark={n} seed={Number(n)} />
        )}
        <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 font-mono text-[11px] text-white/80 backdrop-blur">
          Case {n}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6 md:p-7">
        <H className="text-xl font-semibold leading-snug tracking-tight md:text-2xl">
          <Link
            href={`/work/${study.slug}`}
            data-cursor="view"
            data-cursor-label="Read"
            className="after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-accent"
          >
            {study.title}
          </Link>
        </H>
        <p className="mt-3 leading-relaxed text-fg-muted">{study.summary}</p>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Stack">
          {study.stack.slice(0, 4).map((t) => (
            <li key={t} className="rounded-full border border-line px-2.5 py-1 font-mono text-[11px] text-fg-subtle">
              {t}
            </li>
          ))}
        </ul>
        <p aria-hidden className="mt-auto flex items-center gap-2 pt-6 text-sm font-semibold text-fg">
          Read case study
          <span className="text-[var(--glow,var(--accent))] transition-transform duration-500 group-hover:translate-x-1.5">→</span>
        </p>
      </div>
    </article>
  );
}
