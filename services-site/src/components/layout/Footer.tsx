"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { profile, services } from "@/content";
import { openConcierge } from "@/lib/chat/concierge-store";
import { setMotionPaused, useMotionPaused } from "@/hooks/useMotionPaused";
import { Magnetic } from "@/components/ui/Magnetic";
import { RevealText } from "@/components/ui/RevealText";

const noop = () => () => {};

/** A static server value keeps prerendering deterministic; the browser shows the real year. */
function useYear() {
  return useSyncExternalStore(noop, () => new Date().getFullYear(), () => 2026);
}

/** Site-wide pause for marquees, the hero rotator and other looping motion. */
function MotionToggle() {
  const paused = useMotionPaused();
  return (
    <button
      type="button"
      onClick={() => setMotionPaused(!paused)}
      className="inline-flex items-center gap-2 transition-colors hover:text-fg light:hover:text-bg"
    >
      {/* Drawn with CSS: the ▶ glyph renders as an emoji on some phones. */}
      <span aria-hidden className="flex h-2.5 w-2.5 justify-center gap-[3px] text-accent light:text-accent-bright">
        {paused ? (
          <span className="w-full bg-current [clip-path:polygon(10%_0,100%_50%,10%_100%)]" />
        ) : (
          <>
            <span className="w-[3px] bg-current" />
            <span className="w-[3px] bg-current" />
          </>
        )}
      </span>
      {paused ? "Play animations" : "Pause animations"}
    </button>
  );
}

export function Footer() {
  const year = useYear();
  return (
    <footer className="relative mt-32 overflow-hidden border-t border-line light:flex light:flex-col">
      {/* Light: the footer is a stack of ruled cells between the page rails (GitHub Universe). */}
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
              className={
                "group inline-flex items-center gap-3 rounded-[var(--radius-button)] bg-accent px-8 py-5 text-lg font-semibold text-accent-ink transition-[box-shadow,background-color] hover:shadow-[var(--glow-accent)] " +
                // Light: a wide, tall square block — label bottom-left, arrow bottom-right.
                "light:min-h-20 light:min-w-[min(26rem,80vw)] light:items-end light:justify-between light:px-5 light:pb-4 light:pt-8 light:font-[550] light:hover:bg-accent-hover light:hover:shadow-none"
              }
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

      <div className="container-x grid gap-12 border-t border-line py-16 md:grid-cols-4 md:light:gap-0 md:light:py-0">
        <div className="md:col-span-2 md:light:py-14 md:light:pr-8">
          <p className="font-mono text-sm text-fg">
            mxolisi<span className="text-accent">.</span>dev
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-fg-muted">
            {profile.role} based in {profile.location}. Working with clients locally and remotely ({profile.timezone}).
          </p>
        </div>
        <div className="md:light:border-l md:light:border-line md:light:py-14 md:light:pl-8">
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
        <div className="md:light:border-l md:light:border-line md:light:py-14 md:light:pl-8">
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

      {/* Light: a black utility strip with mono text and neon highlights, full-bleed — the last thing on
          the page. Its extra bottom padding keeps the text and the motion switch clear of the floating
          "Ask Byte" launcher at the bottom of the scroll (dark has the watermark below for that). */}
      <div className="container-x flex flex-col justify-between gap-4 border-t border-line py-8 font-mono text-xs text-fg-subtle sm:flex-row sm:items-center light:order-last light:border-fg light:bg-fg light:pb-24 light:pt-5 light:text-bg/75 light:shadow-[0_0_0_100vmax_var(--fg)] light:[clip-path:inset(0_-100vmax)]">
        <span>© {year} {profile.name}. All rights reserved.</span>
        <span className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          <MotionToggle />
          <span>Built with Next.js, WebGL &amp; a very curious robot.</span>
        </span>
      </div>

      {/* Dark: a faint, cropped watermark under the footer. Light: a solid ink wordmark in its own
          ruled cell above the black strip, like the UNIVERSE'26 sign-off (capped to the content column). */}
      <div aria-hidden className="pointer-events-none select-none overflow-hidden light:border-t light:border-line">
        <p className="display display-hero translate-y-[18%] whitespace-nowrap text-center text-[15.5vw] leading-none text-[color:var(--watermark)] light:translate-y-0 light:py-[clamp(1.25rem,2.5vw,2.5rem)] light:text-[min(15.5vw,13rem)] light:text-fg">
          MXOLISI
        </p>
      </div>
    </footer>
  );
}
