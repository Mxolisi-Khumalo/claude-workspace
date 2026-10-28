"use client";

/**
 * A single shared, passive pointer tracker. Components read the latest
 * position inside their own rAF loops instead of each attaching listeners.
 */
export const pointer = {
  x: typeof window === "undefined" ? 0 : window.innerWidth / 2,
  y: typeof window === "undefined" ? 0 : window.innerHeight / 2,
  /** Normalised -1..1 relative to the viewport centre. */
  nx: 0,
  ny: 0,
  active: false,
};

let attached = false;

export function ensurePointerTracking() {
  if (attached || typeof window === "undefined") return;
  attached = true;
  const update = (x: number, y: number) => {
    pointer.x = x;
    pointer.y = y;
    pointer.nx = (x / window.innerWidth) * 2 - 1;
    pointer.ny = (y / window.innerHeight) * 2 - 1;
    pointer.active = true;
  };
  window.addEventListener("pointermove", (e) => update(e.clientX, e.clientY), { passive: true });
  window.addEventListener(
    "touchmove",
    (e) => {
      const t = e.touches[0];
      if (t) update(t.clientX, t.clientY);
    },
    { passive: true },
  );
  document.documentElement.addEventListener("pointerleave", () => {
    pointer.active = false;
  });
}
