"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-renders the server page every few seconds (bounded) while a payment is pending. */
export function AutoRefresh({ seconds = 4, max = 10 }: { seconds?: number; max?: number }) {
  const router = useRouter();
  useEffect(() => {
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      if (count > max) clearInterval(timer);
      else router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds, max]);
  return null;
}
