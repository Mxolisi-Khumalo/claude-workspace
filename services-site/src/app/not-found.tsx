import type { Metadata } from "next";
import Link from "next/link";
import { services } from "@/content";
import { ButtonLink } from "@/components/ui/Button";
import { ConciergeButton } from "@/components/pages/shared/ConciergeButton";
import { CurrentPath } from "@/components/pages/shared/CurrentPath";
import "@/components/pages/pages.css";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <section className="relative overflow-hidden pb-16 pt-[calc(var(--nav-h)+3rem)] md:pt-[calc(var(--nav-h)+5rem)] light:pb-24">
      <div aria-hidden className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
      <div className="container-x relative grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className="lg:col-span-7">
          <p className="font-mono text-sm text-accent">404 — route not found</p>
          <h1
            className="display mkp-glitch mt-6 text-[clamp(3rem,10vw,9rem)]"
            data-text="Lost in the stack."
          >
            Lost in the stack.
          </h1>
          <p className="mkp-measure mt-8 text-lg leading-relaxed text-fg-muted">
            This page doesn&apos;t exist — it may have moved, or the link has a typo. Head back home, browse the services,
            or ask Byte to point you in the right direction.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <ButtonLink href="/" className="px-7 py-4 text-base">
              Back to home <span aria-hidden>→</span>
            </ButtonLink>
            <ConciergeButton
              variant="outline"
              className="px-7 py-4 text-base"
              seedPrompt="I landed on a page that doesn't exist. Can you help me find what I'm looking for?"
            >
              Ask Byte
            </ConciergeButton>
          </div>
        </div>

        <div className="lg:col-span-5">
          {/* Light: a black terminal (mkp-strip re-points the tokens to white type and neon). */}
          <div className="mkp-card mkp-strip overflow-hidden">
            <span className="mkp-card-edge" />
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-pink/70 light:rounded-none" />
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-amber/70 light:rounded-none" />
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent/70 light:rounded-none" />
              <span className="ml-2 font-mono text-xs text-fg-subtle">router.log</span>
            </div>
            <div className="space-y-2 p-5 font-mono text-[13px] leading-relaxed md:p-6">
              <p className="break-all text-fg-muted">
                <span className="text-accent">$</span> GET <span className="text-fg"><CurrentPath /></span>
              </p>
              <p className="text-pink">✖ 404 · no route matched</p>
              <p className="pt-3 text-fg-subtle">{"// did you mean:"}</p>
              <ul className="space-y-1.5">
                <li>
                  <Link href="/" className="text-sky underline-offset-4 hover:underline">
                    /
                  </Link>
                </li>
                <li>
                  <Link href="/services" className="text-sky underline-offset-4 hover:underline">
                    /services
                  </Link>
                </li>
                {services.slice(0, 4).map((s) => (
                  <li key={s.slug}>
                    <Link href={`/services/${s.slug}`} className="break-all text-sky underline-offset-4 hover:underline">
                      /services/{s.slug}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/work" className="text-sky underline-offset-4 hover:underline">
                    /work
                  </Link>
                </li>
              </ul>
              <p className="pt-3 text-fg-muted">
                <span className="text-accent">$</span> <span className="mkp-caret" aria-hidden />
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
