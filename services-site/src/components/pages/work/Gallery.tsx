import type { CSSProperties } from "react";
import { GradientArt } from "../shared/GradientArt";
import { ZoomImage } from "../shared/ZoomImage";
import { media } from "../shared/media";

/**
 * Justified gallery: on wide screens every image in the row shares one
 * height and the row fills the container exactly (each tile grows in
 * proportion to its aspect ratio). On small screens images stack. Falls back
 * to generative art when a project has no screenshots.
 */
export function Gallery({ images, title, mark }: { images: string[]; title: string; mark: string }) {
  if (images.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-line">
        <GradientArt className="relative aspect-[16/10] md:aspect-[21/9]" mark={mark} />
        <p className="absolute bottom-5 left-5 right-5 max-w-md font-mono text-xs leading-relaxed text-white/80 md:bottom-8 md:left-8">
          No screenshots are published for this project yet — the code itself is public, linked below.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-5">
      {images.map((src, i) => {
        const m = media(src, `${title} — screenshot ${i + 1}`);
        const ratio = m.width / m.height;
        return (
          <figure
            key={src}
            className="mx-auto w-full min-w-0 md:[flex:var(--grow)_1_0%]"
            style={
              {
                "--grow": ratio.toFixed(3),
                // A lone image never grows taller than ~75% of the viewport.
                maxWidth: images.length === 1 ? `calc(75svh * ${ratio.toFixed(3)})` : undefined,
              } as CSSProperties
            }
          >
            <div style={{ aspectRatio: `${m.width} / ${m.height}` }}>
              <ZoomImage
                src={src}
                alt={m.alt}
                width={m.width}
                height={m.height}
                caption={m.alt}
                priority={i === 0}
                sizes={images.length > 1 ? "(min-width: 768px) 60vw, 100vw" : "(min-width: 1320px) 1220px, 100vw"}
                className="h-full border border-line"
              />
            </div>
          </figure>
        );
      })}
    </div>
  );
}
