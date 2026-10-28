"use client";

import { useSyncExternalStore } from "react";

function subscribe(query: string) {
  return (onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  };
}

/** SSR-safe media query hook. Returns `serverValue` during server render. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

/** True on devices with a precise pointer that can hover (mouse / trackpad). */
export const useFinePointer = () => useMediaQuery("(hover: hover) and (pointer: fine)");
