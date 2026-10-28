import type { Evidence, EvidenceStrength, Service } from "@/content/types";

export type Currency = "ZAR" | "USD";

/**
 * Deterministic price formatting (no Intl), so server and client renders
 * always match: R18 000 / $1,000.
 */
export function price(amount: number, currency: Currency): string {
  const grouped = String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, currency === "ZAR" ? " " : ",");
  return currency === "ZAR" ? `R${grouped}` : `$${grouped}`;
}

export function fromPrice(service: Service, currency: Currency = "ZAR"): string {
  const key = currency === "ZAR" ? "priceFromZar" : "priceFromUsd";
  const min = Math.min(...service.packages.map((p) => p[key]));
  return price(min, currency);
}

export const pad = (n: number) => String(n).padStart(2, "0");

const GH = "https://github.com/Mxolisi-Khumalo/";

/**
 * Where an evidence item's file reference points.
 * `fileRef` is "<Repo>/<path>". For github.com/Mxolisi-Khumalo repos we link
 * the exact path; if the first segment isn't the repo name (e.g. a project
 * folder inside a monorepo) the whole fileRef is treated as the path.
 * Anything else (e.g. an organisation's website) links to `repoUrl` itself.
 */
export function evidenceLink(e: Evidence): { href: string; isCode: boolean; host: string } {
  if (e.repoUrl.startsWith(GH)) {
    const repo = e.repoUrl.slice(GH.length).split("/")[0];
    const [first, ...rest] = e.fileRef.split("/");
    const path = (first === repo ? rest : [first, ...rest]).map(encodeURIComponent).join("/");
    return { href: `${GH}${repo}/tree/HEAD/${path}`, isCode: true, host: "github.com" };
  }
  let host = e.repoUrl;
  try {
    host = new URL(e.repoUrl).hostname.replace(/^www\./, "");
  } catch {
    /* keep raw */
  }
  return { href: e.repoUrl, isCode: false, host };
}

/** Distinct public repositories cited as evidence for a service. */
export function repoCount(service: Service): number {
  return new Set(service.evidence.filter((e) => e.repoUrl.startsWith(GH)).map((e) => e.repoUrl)).size;
}

export const strengthCopy: Record<EvidenceStrength, { label: string; short: string; explain: string }> = {
  strong: {
    label: "Strong evidence",
    short: "Strong",
    explain:
      "Several finished projects or a substantial public codebase show this service end to end. Every item below links to the code.",
  },
  moderate: {
    label: "Moderate evidence",
    short: "Moderate",
    explain:
      "Working projects prove the core skills, but in a narrower scope than a full client engagement — for example a single product or personal builds.",
  },
  emerging: {
    label: "Emerging evidence",
    short: "Emerging",
    explain:
      "A newer offering. The proof is a working reference build (such as this site's concierge) rather than a track record of client deliveries.",
  },
};
