import { ImageResponse } from "next/og";
import { caseStudies, getCaseStudy, getService } from "@/content";
import { OG_ACCENTS, OG_SIZE, OgCard } from "@/components/pages/og";

export const alt = "Case study — Mxolisi Khumalo, full-stack developer";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  const index = caseStudies.findIndex((c) => c.slug === slug);
  const service = study ? getService(study.services[0] ?? "") : undefined;
  return new ImageResponse(
    (
      <OgCard
        eyebrow={study ? `// Case study ${String(index + 1).padStart(2, "0")}` : "// Work"}
        title={study?.title ?? "Selected work"}
        subtitle={study?.summary ?? "Case studies behind the services."}
        chips={study?.stack.slice(0, 4) ?? []}
        accent={service ? OG_ACCENTS[service.accent] : undefined}
      />
    ),
    { ...size },
  );
}
