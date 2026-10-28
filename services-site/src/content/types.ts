export type EvidenceStrength = "strong" | "moderate" | "emerging";

export interface Package {
  name: string;
  /** "From" price in South African rand. */
  priceFromZar: number;
  /** "From" price in US dollars for international clients. */
  priceFromUsd: number;
  timeline: string;
  includes: string[];
  /** When true the chat can sell this package directly with a deposit/payment link. */
  purchasable?: boolean;
}

export interface Evidence {
  project: string;
  repoUrl: string;
  proofPoint: string;
  /** Repo-relative path that proves the claim, e.g. "Self-Storage-Platform/template.yaml". */
  fileRef: string;
  /** Public image path under /public, or empty. */
  image?: string;
}

export interface ProcessStep {
  step: string;
  detail: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface Service {
  slug: string;
  title: string;
  tagline: string;
  priority: number;
  evidenceStrength: EvidenceStrength;
  /** Paragraphs of client-facing copy. */
  description: string[];
  idealFor: string[];
  deliverables: string[];
  process: ProcessStep[];
  tech: string[];
  packages: Package[];
  evidence: Evidence[];
  faq: Faq[];
  /** Accent token used for this service's visuals. */
  accent: "accent" | "violet" | "amber" | "sky" | "pink";
}

export interface CaseStudy {
  slug: string;
  title: string;
  repoUrl: string;
  summary: string;
  challenge: string;
  approach: string;
  outcome: string;
  stack: string[];
  /** Public image paths under /public. */
  images: string[];
  /** Service slugs this case study evidences. */
  services: string[];
}

export interface Stat {
  label: string;
  value: number;
  suffix?: string;
}

export interface Certification {
  title: string;
  issuer: string;
}

export interface Profile {
  name: string;
  shortName: string;
  role: string;
  location: string;
  timezone: string;
  languages: string[];
  email: string;
  headline: string;
  subhead: string;
  valueProps: string[];
  whoFor: string[];
  bio: string[];
  stats: Stat[];
  credibility: string[];
  certifications: Certification[];
  links: { label: string; url: string }[];
  portrait?: string;
}
