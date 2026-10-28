"use client";

import { useSyncExternalStore } from "react";

const fmt = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 15_000);
  return () => clearInterval(id);
}

/** Live Johannesburg time (client only — the server renders a placeholder). */
export function LocalTime({ className }: { className?: string }) {
  const time = useSyncExternalStore(subscribe, fmt, () => "--:--");
  return (
    <time className={className} suppressHydrationWarning>
      {time}
    </time>
  );
}
