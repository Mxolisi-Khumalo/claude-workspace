import { getService } from "@/content";
import type { Package } from "@/content/types";
import type { Currency, QuoteLine } from "@/lib/chat/types";

/**
 * Deterministic quote engine. The assistant chooses packages and sizes the
 * extra scope; every number is computed here from the published catalogue so
 * prices can never be invented or talked down by the model or the visitor.
 */

export type ExtraSize = "small" | "medium" | "large";

export interface QuoteSelection {
  serviceSlug: string;
  /** Package name from the catalogue; defaults to the service's entry package. */
  packageName?: string;
}

export interface QuoteExtra {
  label: string;
  size: ExtraSize;
}

export interface QuoteInput {
  selections: QuoteSelection[];
  extras: QuoteExtra[];
  currency: Currency;
  rush: boolean;
}

export interface PricedQuote {
  currency: Currency;
  lines: QuoteLine[];
  total: number;
  depositPercent: number;
  timeline: string;
  assumptions: string[];
  serviceSlugs: string[];
}

export const EXTRA_RATES: Record<Currency, Record<ExtraSize, number>> = {
  ZAR: { small: 3500, medium: 9500, large: 18000 },
  USD: { small: 200, medium: 550, large: 1000 },
};

const RUSH_MULTIPLIER = 0.2;
/** Above this total the deposit drops from 50% to 40%. */
const LARGE_PROJECT: Record<Currency, number> = { ZAR: 60000, USD: 3500 };
const MAX_EXTRAS = 8;

export class QuoteError extends Error {}

export function priceOf(pkg: Package, currency: Currency) {
  return currency === "ZAR" ? pkg.priceFromZar : pkg.priceFromUsd;
}

function roundMoney(n: number, currency: Currency) {
  const step = currency === "ZAR" ? 50 : 10;
  return Math.round(n / step) * step;
}

export function formatMoney(amount: number, currency: Currency) {
  return new Intl.NumberFormat(currency === "ZAR" ? "en-ZA" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function priceQuote(input: QuoteInput): PricedQuote {
  if (input.selections.length === 0) throw new QuoteError("Select at least one service.");
  if (input.extras.length > MAX_EXTRAS) throw new QuoteError(`At most ${MAX_EXTRAS} extra scope items per quote.`);

  const { currency } = input;
  const lines: QuoteLine[] = [];
  const assumptions = new Set<string>();
  const timelines: string[] = [];
  const slugs: string[] = [];

  for (const sel of input.selections) {
    const service = getService(sel.serviceSlug);
    if (!service) throw new QuoteError(`Unknown service "${sel.serviceSlug}".`);
    const pkg = sel.packageName
      ? service.packages.find((p) => p.name.toLowerCase() === sel.packageName!.toLowerCase())
      : service.packages[0];
    if (!pkg) {
      throw new QuoteError(
        `Unknown package "${sel.packageName}" for ${service.title}. Options: ${service.packages.map((p) => p.name).join(", ")}.`,
      );
    }
    if (slugs.includes(service.slug)) throw new QuoteError(`${service.title} is already on the quote.`);
    slugs.push(service.slug);
    lines.push({ label: `${service.title} — ${pkg.name} package`, amount: priceOf(pkg, currency) });
    timelines.push(pkg.timeline);
    pkg.includes.slice(0, 4).forEach((i) => assumptions.add(`${pkg.name}: ${i}`));
  }

  for (const extra of input.extras) {
    const label = extra.label.trim().slice(0, 120);
    if (!label) continue;
    lines.push({ label: `Extra scope (${extra.size}): ${label}`, amount: EXTRA_RATES[currency][extra.size] });
  }

  let subtotal = lines.reduce((s, l) => s + l.amount, 0);
  if (input.rush) {
    const rush = roundMoney(subtotal * RUSH_MULTIPLIER, currency);
    lines.push({ label: "Priority scheduling (+20%)", amount: rush });
    subtotal += rush;
  }

  const total = roundMoney(subtotal, currency);
  assumptions.add("Prices are fixed for the scope above; changes are quoted separately before work starts.");
  assumptions.add("Hosting, domains and third-party subscriptions are billed at cost to the client.");
  assumptions.add("Final scope is confirmed on a short discovery call.");

  return {
    currency,
    lines,
    total,
    depositPercent: total > LARGE_PROJECT[currency] ? 40 : 50,
    timeline: timelines.length === 1 ? timelines[0] : `${timelines.join(" + ")} (phased)`,
    assumptions: [...assumptions],
    serviceSlugs: slugs,
  };
}
