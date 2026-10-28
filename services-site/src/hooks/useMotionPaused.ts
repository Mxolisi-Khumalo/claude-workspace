"use client";

import { useSyncExternalStore } from "react";

/**
 * Site-wide "Pause animations" switch (WCAG 2.2.2) for visitors who haven't
 * asked for reduced motion at the OS level. The source of truth is
 * `<html data-motion="paused">`, which the root layout's inline script
 * restores from localStorage before first paint, so CSS can pause looping
 * decoration and animation loops can check it cheaply on every tick.
 */
const STORAGE_KEY = "mk-motion-paused"; // also read by the inline script in app/layout.tsx
const listeners = new Set<() => void>();

export function isMotionPaused(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.motion === "paused";
}

export function setMotionPaused(paused: boolean) {
  const root = document.documentElement;
  if (paused) root.dataset.motion = "paused";
  else delete root.dataset.motion;
  try {
    if (paused) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage disabled — the choice still applies to this page view */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useMotionPaused(): boolean {
  return useSyncExternalStore(subscribe, isMotionPaused, () => false);
}
