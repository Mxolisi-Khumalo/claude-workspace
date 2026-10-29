"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { openConcierge } from "@/lib/chat/concierge-store";
import { ScrambleLabel } from "@/components/ui/ScrambleLabel";
import { Magnetic } from "@/components/ui/Magnetic";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const LINKS = [
  { href: "/#services", label: "Services", n: "01" },
  { href: "/#proof", label: "Proof", n: "02" },
  { href: "/#process", label: "Process", n: "03" },
  { href: "/#pricing", label: "Pricing", n: "04" },
  { href: "/#concierge", label: "Concierge", n: "05" },
];

export function Nav() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      // Ignore sub-2px moves: Lenis eases out in tiny steps, which must not
      // count as scrolling back up and slide the bar in after every scroll.
      if (y <= 240 || y < last - 2) setHidden(false);
      else if (y > last + 2) setHidden(true);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-transform duration-500 ease-[var(--ease-out)]",
        // Slide back in whenever keyboard focus lands inside the hidden bar
        // (not after a mouse click, so a clicked link doesn't pin it open).
        hidden && !menuOpen && "-translate-y-full has-[:focus-visible]:translate-y-0",
      )}
    >
      {/* Dark: transparent until scrolled. Light: always a paper bar on a 1px rule, like GitHub Universe. */}
      <div
        className={clsx(
          "absolute inset-0 border-b transition-colors duration-500 light:border-line light:bg-bg/90 light:backdrop-blur-xl",
          scrolled ? "border-line bg-bg/70 backdrop-blur-xl" : "border-transparent",
        )}
      />
      {/* Light: a row of bordered cells between the page rails — logo | links … toggle | solid green CTA. */}
      <nav
        className="container-x relative flex h-[var(--nav-h)] items-center justify-between light:items-stretch light:border-x light:border-line light:pr-0"
        aria-label="Main"
      >
        <Link
          href="/"
          className="group flex items-center gap-2 font-mono text-sm font-semibold tracking-tight light:border-line light:pr-4 md:light:border-r lg:light:pr-6"
          aria-label="Mxolisi Khumalo — home"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-ink transition-transform duration-500 group-hover:rotate-[360deg] light:rounded-none">
            MK
          </span>
          <span className="text-fg">
            mxolisi<span className="text-accent">.</span>dev
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex light:mr-auto light:items-stretch light:gap-0">
          {LINKS.map((l) => (
            <li key={l.href} className="light:flex">
              <Link
                href={l.href}
                className="group flex items-baseline gap-1.5 rounded-full px-3.5 py-2 text-sm text-fg-muted transition-colors hover:text-fg light:items-center light:rounded-none light:border-r light:border-line light:px-2.5 light:py-0 light:text-fg light:hover:bg-black/[0.04] lg:light:px-4 xl:light:px-5"
              >
                {/* Light: numbers return at lg, where the ruled cells have room for them. */}
                <span className="font-mono text-[10px] text-fg-subtle transition-colors group-hover:text-accent light:hidden lg:light:inline">
                  {l.n}
                </span>
                <ScrambleLabel text={l.label} />
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 light:items-stretch light:gap-0">
          <ThemeToggle className="w-10 justify-center px-0 max-sm:hidden light:h-auto light:w-14 light:border-y-0 light:border-r-0 light:border-l-line lg:light:w-[var(--nav-h)]" />
          {/* Light: a full-height square cell that doesn't drift with the pointer. */}
          <Magnetic className="light:transform-none!">
            <button
              type="button"
              onClick={() => openConcierge()}
              className={clsx(
                "hidden items-center gap-2 rounded-full border border-line-strong bg-surface/60 py-2 pl-2.5 pr-4 text-sm font-medium text-fg backdrop-blur transition-colors hover:border-accent sm:inline-flex",
                "light:h-full light:gap-3 light:whitespace-nowrap light:rounded-none light:border-0 light:bg-accent light:px-4 light:font-[550] light:text-accent-ink light:backdrop-blur-none light:hover:bg-accent-hover lg:light:gap-6 lg:light:px-6",
              )}
            >
              <span className="relative flex h-2 w-2 light:hidden">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Start a project
              <span aria-hidden className="hidden light:inline">
                ↗
              </span>
            </button>
          </Magnetic>
          <button
            type="button"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-line-strong md:hidden light:h-auto light:w-[var(--nav-h)] light:rounded-none light:border-y-0 light:border-r-0 light:border-l-line"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className={clsx("absolute h-px w-4 bg-fg transition-transform", menuOpen ? "rotate-45" : "-translate-y-1")} />
            <span className={clsx("absolute h-px w-4 bg-fg transition-transform", menuOpen ? "-rotate-45" : "translate-y-1")} />
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        className={clsx(
          "fixed inset-x-0 top-[var(--nav-h)] bottom-0 bg-bg/95 backdrop-blur-xl transition-[opacity,visibility] duration-500 md:hidden light:bg-bg",
          menuOpen ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <ul className="container-x flex flex-col gap-2 pt-8 light:gap-0 light:pt-0">
          {LINKS.map((l, i) => (
            <li
              key={l.href}
              className="border-b border-line transition-[transform,opacity] duration-700 ease-[var(--ease-out)]"
              style={{
                transform: menuOpen ? "none" : "translateY(24px)",
                opacity: menuOpen ? 1 : 0,
                transitionDelay: menuOpen ? `${80 + i * 50}ms` : "0ms",
              }}
            >
              <Link href={l.href} onClick={() => setMenuOpen(false)} className="flex items-baseline gap-3 py-4 light:py-5">
                <span className="font-mono text-xs text-accent">{l.n}</span>
                <span className="display text-4xl">{l.label}</span>
              </Link>
            </li>
          ))}
          <li className="pt-6">
            <ThemeToggle showLabel className="mb-3 w-full justify-center light:h-12 light:rounded-[6px] light:bg-black/5" />
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                openConcierge();
              }}
              className="flex w-full items-center justify-center rounded-[var(--radius-button)] bg-accent py-4 text-center font-semibold text-accent-ink light:justify-between light:px-5 light:font-[550]"
            >
              Start a project
              <span aria-hidden className="hidden light:inline">
                ↗
              </span>
            </button>
          </li>
        </ul>
      </div>
    </header>
  );
}
