import { ImageResponse } from "next/og";
import { profile } from "@/content";
import { OG_SIZE, OgCard } from "@/components/pages/og";

export const alt = `${profile.name} — full-stack development services. ${profile.headline}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <OgCard
        eyebrow="Full-stack development services"
        title={profile.headline}
        subtitle="Interactive websites, web apps, cloud backends and AI assistants — each backed by real, inspectable work."
        chips={["Next.js", "TypeScript", "AWS", "Claude API"]}
      />
    ),
    { ...size },
  );
}
