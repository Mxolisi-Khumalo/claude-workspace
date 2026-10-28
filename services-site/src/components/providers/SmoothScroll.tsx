"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";

gsap.registerPlugin(ScrollTrigger);

/**
 * Drives the root Lenis instance from GSAP's ticker so ScrollTrigger
 * animations and the smoothed scroll position stay in lock-step. ReactLenis
 * creates its instance in an effect, so this waits for `useLenis()` to
 * deliver it rather than reading a ref that is still empty on mount.
 */
function GsapLenisBridge() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    const raf = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
    };
  }, [lenis]);

  return null;
}

/**
 * Lenis smooth scrolling for the whole page. Disabled entirely (native
 * scroll) for visitors who prefer reduced motion. Lenis is mounted as a
 * sibling rather than a wrapper so `children` keep the same tree position
 * when the preference resolves after hydration or changes mid-session —
 * otherwise React would remount the entire header, page and footer.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = usePrefersReducedMotion();

  return (
    <>
      {!reduced && (
        <ReactLenis root options={{ autoRaf: false, lerp: 0.1, wheelMultiplier: 1, anchors: { offset: -80 } }}>
          <GsapLenisBridge />
        </ReactLenis>
      )}
      {children}
    </>
  );
}
