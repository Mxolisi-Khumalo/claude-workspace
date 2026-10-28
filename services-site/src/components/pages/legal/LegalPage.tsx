import { RevealText } from "@/components/ui/RevealText";
import { Breadcrumbs } from "../shared/Breadcrumbs";
import { pad } from "../shared/helpers";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

/**
 * Shared layout for the privacy notice and terms: big heading, status note,
 * a sticky numbered table of contents on wide screens and readable prose.
 */
export function LegalPage({
  label,
  title,
  intro,
  updated,
  notice,
  sections,
}: {
  label: string;
  title: string;
  intro: React.ReactNode;
  updated: string;
  notice: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <>
      <header className="relative overflow-hidden pt-[calc(var(--nav-h)+2.5rem)] md:pt-[calc(var(--nav-h)+4rem)]">
        <div aria-hidden className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-full opacity-50" />
        <div className="container-x relative">
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { label }]} />
          <p className="eyebrow mt-10 md:mt-14">
            <span className="text-accent">{"//"}</span> Legal · {label}
          </p>
          <RevealText as="h1" by="words" immediate className="display mt-6 max-w-[14ch] text-[clamp(2.5rem,7vw,6.5rem)]">
            {title}
          </RevealText>
          <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-8">
            <div className="mkp-measure text-lg leading-relaxed text-fg-muted lg:col-span-7">{intro}</div>
            <div className="flex flex-col gap-4 lg:col-span-4 lg:col-start-9">
              <p className="font-mono text-xs text-fg-subtle">
                Last updated: <span className="text-fg">{updated}</span>
              </p>
              <div
                role="note"
                className="rounded-[var(--radius)] border border-amber/40 bg-amber/10 p-4 text-sm leading-relaxed text-fg"
              >
                {notice}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container-x grid gap-12 py-16 md:py-24 lg:grid-cols-12 lg:gap-8">
        <nav aria-label="On this page" className="lg:col-span-3">
          <div className="lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)]">
            <p className="eyebrow mb-4">On this page</p>
            <ol className="grid gap-1 border-l border-line">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="group -ml-px flex gap-3 border-l border-transparent py-1.5 pl-4 text-sm text-fg-muted transition-colors hover:border-accent hover:text-fg"
                  >
                    <span className="font-mono text-xs text-fg-subtle transition-colors group-hover:text-accent">{pad(i + 1)}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="lg:col-span-8 lg:col-start-5">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-28 border-t border-line py-10 first:border-t-0 first:pt-0 md:py-12">
              <h2 className="flex items-baseline gap-4 text-2xl font-semibold tracking-tight md:text-3xl">
                <span className="font-mono text-sm font-normal text-accent">{pad(i + 1)}</span>
                {s.title}
              </h2>
              <div className="mkp-prose mt-6">{s.body}</div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
