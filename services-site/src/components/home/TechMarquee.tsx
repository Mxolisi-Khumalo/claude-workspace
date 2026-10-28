import { Marquee } from "@/components/ui/Marquee";
import type { Service } from "@/content/types";

/** Every technology named across the services, deduplicated in priority order. */
function techWords(services: Service[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of services) {
    for (const t of s.tech) {
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      // Skip compound entries ("Node.js / Express") whose parts already appear.
      const parts = t.split(/\s*\/\s*/).map((p) => p.toLowerCase());
      if (parts.length > 1 && parts.every((p) => seen.has(p))) continue;
      seen.add(key);
      parts.forEach((p) => seen.add(p));
      out.push(t);
    }
  }
  return out;
}

const GLYPH_COLORS = ["var(--accent)", "var(--violet)", "var(--sky)", "var(--amber)", "var(--pink)"];

function Row({ words, offset }: { words: string[]; offset: number }) {
  return (
    <>
      {words.map((w, i) => (
        <span key={w} className="flex items-center">
          <span
            className={`display whitespace-nowrap px-6 text-[clamp(2.25rem,5.5vw,5rem)] leading-[1.1] md:px-9 ${
              (i + offset) % 2 === 0 ? "text-fg" : "hm-outline"
            }`}
          >
            {w}
          </span>
          <span className="text-[clamp(0.9rem,1.6vw,1.4rem)]" style={{ color: GLYPH_COLORS[(i + offset) % GLYPH_COLORS.length] }}>
            ✦
          </span>
        </span>
      ))}
    </>
  );
}

/** Two velocity-reactive marquees of the stack behind the services. */
export function TechMarquee({ services }: { services: Service[] }) {
  const words = techWords(services);
  const half = Math.ceil(words.length / 2);
  return (
    <section aria-label="Technologies" className="relative border-y border-line bg-bg/40 py-8 md:py-12">
      <p className="sr-only">Technologies I work with: {words.join(", ")}.</p>
      <div aria-hidden className="flex flex-col gap-1 md:gap-2">
        <Marquee speed={38}>
          <Row words={words.slice(0, half)} offset={0} />
        </Marquee>
        <Marquee speed={26}>
          <Row words={words.slice(half)} offset={1} />
        </Marquee>
      </div>
    </section>
  );
}
