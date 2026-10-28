"use client";

import { clsx } from "clsx";
import { setTheme, useTheme } from "@/hooks/useTheme";

/**
 * Sun / moon switch between the light (GitHub Universe-style) and dark themes.
 * The icon is drawn with CSS so it never renders as an emoji.
 */
export function ThemeToggle({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={clsx(
        "group inline-flex h-10 items-center gap-2 border border-line-strong px-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent",
        "rounded-[var(--radius-button)]",
        className,
      )}
    >
      <span aria-hidden className="relative block h-4 w-4">
        {/* Sun: a disc with rays; moon: the same disc with a bite taken out. */}
        <span
          className={clsx(
            "absolute inset-[3px] rounded-full bg-current transition-transform duration-500 ease-[var(--ease-out)]",
            theme === "dark" ? "scale-100" : "scale-90",
          )}
        />
        <span
          className={clsx(
            "absolute right-[-1px] top-[-1px] h-[11px] w-[11px] rounded-full bg-bg transition-transform duration-500 ease-[var(--ease-out)]",
            theme === "dark" ? "translate-x-0 translate-y-0" : "translate-x-3 -translate-y-3",
          )}
        />
        <span
          className={clsx(
            "absolute inset-0 rounded-full transition-opacity duration-300",
            "[background:repeating-conic-gradient(currentColor_0_8deg,transparent_8deg_45deg)] [mask:radial-gradient(circle,transparent_55%,#000_56%)]",
            theme === "dark" ? "opacity-0" : "opacity-100",
          )}
        />
      </span>
      {showLabel && <span>{theme === "dark" ? "Light theme" : "Dark theme"}</span>}
    </button>
  );
}
