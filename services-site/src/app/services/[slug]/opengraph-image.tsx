import { ImageResponse } from "next/og";
import { getService, services } from "@/content";
import { OG_ACCENTS, OG_SIZE, OgCard } from "@/components/pages/og";

export const alt = "Service overview — Mxolisi Khumalo, full-stack developer";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getService(slug);
  const index = services.findIndex((s) => s.slug === slug);
  return new ImageResponse(
    (
      <OgCard
        eyebrow={service ? `// Service ${String(index + 1).padStart(2, "0")}` : "// Services"}
        title={service?.title ?? "Full-stack development services"}
        subtitle={service?.tagline ?? "Each backed by real, inspectable work."}
        chips={service?.tech.slice(0, 4) ?? []}
        accent={service ? OG_ACCENTS[service.accent] : undefined}
      />
    ),
    { ...size },
  );
}
