"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { profile, services } from "@/content";
import { openConcierge } from "@/lib/chat/concierge-store";
import { Magnetic } from "@/components/ui/Magnetic";
import { RevealText } from "@/components/ui/RevealText";

const noop = () => () => {};

/** A static server value keeps prerendering deterministic; the browser shows the real year. */
function useYear() {
  return useSyncExternalStore(noop, () => new Date().getFullYear(), () => 2026);
}

export function Footer() {
  const year = useYear();
  return (
    <footer className="relative mt-32 overflow-hidden border-t border-line">
      <div className="container-x py-24 md:py-32">
        <p className="eyebrow mb-6">{"// Next step"}</p>
        <RevealText as="h2" className="display max-w-5xl text-[clamp(2.75rem,8vw,7.5rem)]">
          Have something worth building? Let&apos;s ship it.
        </RevealText>
        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Magnetic>
            <button
              type="button"
              data-cursor="view"
              data-cursor-label="Chat"
              onClick={() => openConcierge()}
              className="group inline-flex items-center gap-3 rounded-full bg-accent px-8 py-5 text-lg font-semibold text-accent-ink transition-shadow hover:shadow-[var(--glow-accent)]"
            >
              Get a quote in minutes
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </button>
          </Magnetic>
          {profile.email && (
            <a href={`mailto:${profile.email}`} className="text-lg text-fg-muted underline-offset-8 transition-colors hover:text-accent hover:underline">
              {profile.email}
            </a>
          )}
        </div>
      </div>

      <div className="container-x grid gap-12 border-t border-line py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-mono text-sm text-fg">
            mxolisi<span className="text-accent">.</span>dev
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-fg-muted">
            {profile.role} based in {profile.location}. Working with clients locally and remotely ({profile.timezone}).
          </p>
        </div>
        <div>
          <p className="eyebrow mb-4">Services</p>
          <ul className="space-y-2 text-sm">
            {services.map((s) => (
              <li key={s.slug}>
                <Link href={`/services/${s.slug}`} className="text-fg-muted transition-colors hover:text-fg">
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Elsewhere</p>
          <ul className="space-y-2 text-sm">
            {profile.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer" className="text-fg-muted transition-colors hover:text-fg">
                  {l.label} ↗
                </a>
              </li>
            ))}
            <li>
              <Link href="/privacy" className="text-fg-muted transition-colors hover:text-fg">
                Privacy (POPIA)
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="container-x flex flex-col justify-between gap-4 border-t border-line py-8 font-mono text-xs text-fg-subtle sm:flex-row">
        <span>© {year} {profile.name}. All rights reserved.</span>
        <span>Built with Next.js, WebGL &amp; a very curious robot.</span>
      </div>

      <div aria-hidden className="pointer-events-none select-none overflow-hidden">
        <p className="display translate-y-[18%] whitespace-nowrap text-center text-[22vw] leading-none text-white/[0.035]">
          MXOLISI
        </p>
      </div>
    </footer>
  );
}
