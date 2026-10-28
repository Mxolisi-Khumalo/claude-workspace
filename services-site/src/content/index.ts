import { caseStudies } from "./work";
import { profile } from "./profile";
import { services } from "./services";
import type { CaseStudy, Service } from "./types";

const sorted = [...services].sort((a, b) => a.priority - b.priority);

export { sorted as services, caseStudies, profile };

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}

export function caseStudiesFor(serviceSlug: string): CaseStudy[] {
  return caseStudies.filter((c) => c.services.includes(serviceSlug));
}
