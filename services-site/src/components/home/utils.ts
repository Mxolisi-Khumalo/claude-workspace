import { startingPrice } from "@/content";
import type { EvidenceStrength, Service } from "@/content/types";

export type Currency = "ZAR" | "USD";

/** CSS colour for a service accent token. */
export const accentVar = (accent: Service["accent"]) => `var(--${accent})`;

/**
 * Deterministic price formatting (no Intl), so server and client renders
 * always match: R18 000 / $1,000.
 */
export function formatPrice(amount: number, currency: Currency) {
  const digits = Math.round(amount).toString();
  if (currency === "ZAR") return `R${digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
  return `$${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/** The "from" price shown everywhere (cheapest one-off package; retainers excluded). */
export function fromPrices(service: Service): { zar: number; usd: number } {
  return startingPrice(service);
}

/** Labels match the badges on /services (see strengthCopy in components/pages/shared/helpers). */
export const STRENGTH: Record<EvidenceStrength, { label: string; bars: number; color: string }> = {
  strong: { label: "Strong evidence", bars: 3, color: "var(--accent)" },
  moderate: { label: "Moderate evidence", bars: 2, color: "var(--sky)" },
  emerging: { label: "Emerging evidence", bars: 1, color: "var(--amber)" },
};

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/** "six" for 6, "13" for 13 — reads better in headings. */
export function numberWord(n: number, capitalise = false) {
  const w = WORDS[n] ?? String(n);
  return capitalise ? w.charAt(0).toUpperCase() + w.slice(1) : w;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");
