import type { MetadataRoute } from "next";
import { caseStudies, services } from "@/content";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "monthly" | "yearly" = "monthly") => ({
    url: `${siteUrl}${path}`,
    changeFrequency,
    priority,
  });

  return [
    page("/", 1),
    page("/services", 0.9),
    ...services.map((s) => page(`/services/${s.slug}`, 0.8)),
    page("/work", 0.7),
    ...caseStudies.map((c) => page(`/work/${c.slug}`, 0.6)),
    page("/privacy", 0.2, "yearly"),
    page("/terms", 0.2, "yearly"),
  ];
}
