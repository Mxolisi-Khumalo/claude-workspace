import Image from "next/image";
import Link from "next/link";
import type { CaseStudy } from "@/content/types";
import { GradientArt } from "../shared/GradientArt";
import { caseStudyNumber } from "../shared/CaseStudyCard";

/** Full-bleed "next case study" link with a hover image reveal. */
export function NextCase({ study }: { study: CaseStudy }) {
  const n = caseStudyNumber(study.slug);
  const cover = study.images[0];
  return (
    <nav aria-label="Next case study" className="border-t border-line">
      <Link
        href={`/work/${study.slug}`}
        data-cursor="view"
        data-cursor-label="Next"
        className="group container-x relative grid grid-cols-[minmax(0,1fr)] gap-8 py-14 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-center md:py-20"
      >
        <span>
          <span className="eyebrow flex items-center gap-3">
            Next case study · {n}
            <span aria-hidden className="transition-transform duration-500 group-hover:translate-x-1.5">
              →
            </span>
          </span>
          <span className="display mt-6 block text-[clamp(2.25rem,6vw,5.5rem)] break-words transition-colors duration-500 group-hover:text-[var(--glow)]">
            {study.title}
          </span>
          <span className="mkp-measure mt-5 block text-lg text-fg-muted">{study.summary}</span>
        </span>
        <span
          aria-hidden
          className="relative block aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] border border-line-strong transition-[transform,clip-path] duration-1000 ease-[var(--ease-out)] md:[clip-path:inset(12%_12%_12%_12%_round_24px)] md:group-hover:[clip-path:inset(0%_0%_0%_0%_round_24px)] light:rounded-none md:light:[clip-path:inset(12%_12%_12%_12%)] md:light:group-hover:[clip-path:inset(0%_0%_0%_0%)]"
        >
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              sizes="(min-width: 768px) 22rem, 100vw"
              className="object-cover object-top transition-transform duration-1000 ease-[var(--ease-out)] group-hover:scale-105"
            />
          ) : (
            <GradientArt className="absolute inset-0" mark={n} seed={Number(n)} />
          )}
        </span>
      </Link>
    </nav>
  );
}
