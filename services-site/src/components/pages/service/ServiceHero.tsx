import { ButtonLink } from "@/components/ui/Button";
import { RevealText } from "@/components/ui/RevealText";
import type { Service } from "@/content/types";
import { Breadcrumbs } from "../shared/Breadcrumbs";
import { ConciergeButton } from "../shared/ConciergeButton";
import { EvidenceBadge } from "../shared/EvidenceBadge";
import { Reveal } from "../shared/Reveal";
import { fromPrice, pad, repoCount } from "../shared/helpers";

export function ServiceHero({ service, index }: { service: Service; index: number }) {
  const n = pad(index + 1);
  const repos = repoCount(service);
  // Show two headline technologies when they fit, otherwise just the first.
  const lead = service.tech.slice(0, 2).join(" + ").length > 18 ? service.tech.slice(0, 1) : service.tech.slice(0, 2);
  const facts = [
    { k: "From", v: fromPrice(service, "ZAR"), sub: `or ${fromPrice(service, "USD")}` },
    { k: "Packages", v: String(service.packages.length), sub: service.packages.map((p) => p.name).join(" · ") },
    {
      k: "Evidence",
      v: String(service.evidence.length),
      sub: repos > 0 ? `items from ${repos} public repo${repos === 1 ? "" : "s"}` : "documented items",
    },
    { k: "Core stack", v: lead.join(" + "), sub: `+${Math.max(service.tech.length - lead.length, 0)} more` },
  ];

  return (
    <header className="relative overflow-hidden pt-[calc(var(--nav-h)+2.5rem)] md:pt-[calc(var(--nav-h)+4rem)]">
      <div aria-hidden className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[90%] opacity-60" />
      <span
        aria-hidden
        className="display mkp-ghost mkp-figures pointer-events-none absolute hidden sm:block -right-[0.04em] top-[calc(var(--nav-h)-0.05em)] select-none text-[clamp(9rem,30vw,26rem)] leading-none opacity-50"
      >
        {n}
      </span>

      <div className="container-x relative">
        <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/services", label: "Services" }, { label: service.title }]} />

        <p className="eyebrow mt-10 flex items-center gap-3 md:mt-14">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--glow)] opacity-60 light:rounded-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--glow)] light:rounded-none" />
          </span>
          {`// Service ${n}`}
        </p>

        <RevealText
          as="h1"
          by="words"
          immediate
          className="display mt-6 max-w-[14ch] text-[clamp(2.6rem,9.2vw,8.75rem)] [overflow-wrap:anywhere]"
        >
          {service.title}
        </RevealText>

        <Reveal immediate delay={0.35} className="mt-8 grid gap-10 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p data-reveal className="max-w-[38ch] text-[clamp(1.25rem,2.1vw,1.75rem)] leading-snug text-fg">
              {service.tagline}
            </p>
            <div data-reveal className="mt-6">
              <EvidenceBadge strength={service.evidenceStrength} explain id={`strength-${service.slug}`} />
            </div>
          </div>
          <div data-reveal className="flex flex-wrap items-center gap-3">
            <ConciergeButton
              serviceSlug={service.slug}
              seedPrompt={`I'm interested in ${service.title}. Can you help me scope it?`}
              className="px-7 py-4 text-base"
              cursorLabel="Quote"
            >
              Get a quote for this <span aria-hidden>→</span>
            </ConciergeButton>
            <ButtonLink href="#evidence" variant="outline" className="px-7 py-4 text-base">
              See the evidence <span aria-hidden>↓</span>
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal
          as="div"
          delay={0.55}
          immediate
          // Light: a row of ruled cells bled out to the rails; the next section draws the bottom rule.
          className="mt-16 grid grid-cols-2 border-y border-line md:mt-20 lg:grid-cols-4 light:-mx-[var(--gutter)] light:border-b-0"
        >
          {facts.map((f, i) => (
            <dl
              key={f.k}
              data-reveal
              className={
                "min-w-0 py-6 pr-4 md:py-8 light:px-6 " +
                (i % 2 === 1 ? "border-l border-line pl-4 md:pl-6 " : "") +
                (i >= 2 ? "border-t border-line lg:border-t-0 " : "") +
                (i === 0 ? "light:pl-[var(--gutter)] " : "") +
                (i === 2 ? "lg:border-l lg:pl-6 light:pl-[var(--gutter)] lg:light:pl-6" : "")
              }
            >
              <dt className="eyebrow">{f.k}</dt>
              <dd className="mt-3 text-2xl font-semibold tracking-tight text-fg [overflow-wrap:anywhere] md:text-3xl light:font-medium">{f.v}</dd>
              <dd className="mt-1 text-sm leading-snug text-fg-subtle">{f.sub}</dd>
            </dl>
          ))}
        </Reveal>
      </div>
    </header>
  );
}
