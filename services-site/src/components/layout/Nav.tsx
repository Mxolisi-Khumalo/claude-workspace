"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { openConcierge } from "@/lib/chat/concierge-store";
import { ScrambleLabel } from "@/components/ui/ScrambleLabel";
import { Magnetic } from "@/components/ui/Magnetic";

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
      <div
        className={clsx(
          "absolute inset-0 border-b transition-colors duration-500",
          scrolled ? "border-line bg-bg/70 backdrop-blur-xl" : "border-transparent",
        )}
      />
      <nav className="container-x relative flex h-[var(--nav-h)] items-center justify-between" aria-label="Main">
        <Link href="/" className="group flex items-center gap-2 font-mono text-sm font-semibold tracking-tight" aria-label="Mxolisi Khumalo — home">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-ink transition-transform duration-500 group-hover:rotate-[360deg]">
            MK
          </span>
          <span className="text-fg">
            mxolisi<span className="text-accent">.</span>dev
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="group flex items-baseline gap-1.5 rounded-full px-3.5 py-2 text-sm text-fg-muted transition-colors hover:text-fg"
              >
                <span className="font-mono text-[10px] text-fg-subtle transition-colors group-hover:text-accent">{l.n}</span>
                <ScrambleLabel text={l.label} />
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Magnetic>
            <button
              type="button"
              onClick={() => openConcierge()}
              className="hidden items-center gap-2 rounded-full border border-line-strong bg-surface/60 py-2 pl-2.5 pr-4 text-sm font-medium text-fg backdrop-blur transition-colors hover:border-accent sm:inline-flex"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Start a project
            </button>
          </Magnetic>
          <button
            type="button"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-line-strong md:hidden"
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
          "fixed inset-x-0 top-[var(--nav-h)] bottom-0 bg-bg/95 backdrop-blur-xl transition-[opacity,visibility] duration-500 md:hidden",
          menuOpen ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <ul className="container-x flex flex-col gap-2 pt-8">
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
              <Link href={l.href} onClick={() => setMenuOpen(false)} className="flex items-baseline gap-3 py-4">
                <span className="font-mono text-xs text-accent">{l.n}</span>
                <span className="display text-4xl">{l.label}</span>
              </Link>
            </li>
          ))}
          <li className="pt-6">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                openConcierge();
              }}
              className="w-full rounded-full bg-accent py-4 text-center font-semibold text-accent-ink"
            >
              Start a project
            </button>
          </li>
        </ul>
      </div>
    </header>
  );
}
