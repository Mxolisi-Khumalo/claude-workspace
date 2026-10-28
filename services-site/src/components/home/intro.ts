"use client";

/**
 * Calls `cb` once the global preloader (shown on the first visit of a session)
 * starts revealing the page, so the hero's entrance isn't wasted behind it.
 * Returns a cancel function.
 */
export function whenIntroDone(cb: () => void): () => void {
  const pre = document.querySelector<HTMLElement>(".preloader");
  const active = () => !!pre && pre.isConnected && getComputedStyle(pre).display !== "none";

  if (!active()) {
    const raf = requestAnimationFrame(cb);
    return () => cancelAnimationFrame(raf);
  }

  let done = false;
  let timer = 0;
  const mo = new MutationObserver(() => {
    if (!active()) finish();
  });
  function finish() {
    if (done) return;
    done = true;
    mo.disconnect();
    clearTimeout(timer);
    cb();
  }
  // The preloader wipes away ~1.5s after hydration; start just as it does,
  // or as soon as it is removed, whichever comes first.
  mo.observe(document.body, { childList: true, subtree: true });
  timer = window.setTimeout(finish, 1550);

  return () => {
    done = true;
    mo.disconnect();
    clearTimeout(timer);
  };
}
