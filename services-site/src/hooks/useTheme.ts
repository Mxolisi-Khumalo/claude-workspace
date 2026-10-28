"use client";

import { useSyncExternalStore } from "react";

/**
 * Light / dark theme. The source of truth is `<html data-theme>`, which the
 * root layout's inline script sets from localStorage before first paint (light
 * when nothing is stored), so there is never a flash of the wrong theme.
 * Components that draw with WebGL or canvas subscribe with `useTheme()`.
 */
export type Theme = "light" | "dark";

const STORAGE_KEY = "mk-theme"; // also read by the inline script in app/layout.tsx
export const THEME_COLORS: Record<Theme, string> = { light: "#e9edec", dark: "#07080b" };
const listeners = new Set<() => void>();

export function getTheme(): Theme {
  return typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  const root = document.documentElement;
  // Suppress transitions for one frame so every surface flips at once.
  root.dataset.themeSwitching = "";
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage disabled — the choice still applies to this page view */
  }
  listeners.forEach((l) => l());
  requestAnimationFrame(() => requestAnimationFrame(() => delete root.dataset.themeSwitching));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "light");
}
