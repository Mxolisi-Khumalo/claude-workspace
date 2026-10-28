"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** The current URL path, read on the client only (avoids request-time APIs). */
export function CurrentPath({ fallback = "/this-page" }: { fallback?: string }) {
  const path = useSyncExternalStore(
    noop,
    () => window.location.pathname,
    () => null,
  );
  return <>{path ?? fallback}</>;
}
