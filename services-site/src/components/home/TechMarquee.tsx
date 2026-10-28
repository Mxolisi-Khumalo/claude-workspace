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
/** Light theme ticker: GitHub Universe's saturated band segments (black text on each). */
const TINTS = ["light:bg-tint-neon", "light:bg-tint-olive", "light:bg-tint-lilac"];

/**
 * One marquee row of big display words. Dark: alternating solid and outlined
 * words with coloured glyphs. Light: the `ticker` row becomes a band of tinted
 * segments with black mono type; the other row stays big type in ink.
 */
function Row({ words, offset, ticker = false }: { words: string[]; offset: number; ticker?: boolean }) {
  return (
    <>
      {words.map((w, i) => (
        <span key={w} className={`flex items-center ${ticker ? TINTS[(i + offset) % TINTS.length] : ""}`}>
          <span
            className={`display whitespace-nowrap px-6 text-[clamp(2.25rem,5.5vw,5rem)] leading-[1.1] md:px-9 ${
              (i + offset) % 2 === 0 ? "text-fg" : "hm-outline"
            } ${
              ticker
                ? "light:py-3 light:pl-5 light:pr-4 light:font-mono light:text-[clamp(1rem,1.5vw,1.3rem)] light:leading-none light:tracking-normal light:text-black md:light:py-3.5 md:light:pl-6"
                : ""
            }`}
          >
            {w}
          </span>
          <span
            className={`text-[clamp(0.9rem,1.6vw,1.4rem)] ${ticker ? "light:pr-5 light:text-[0.8rem] light:text-black! md:light:pr-6" : ""}`}
            style={{ color: GLYPH_COLORS[(i + offset) % GLYPH_COLORS.length] }}
          >
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
    <section
      aria-label="Technologies"
      className="relative border-y border-line bg-bg/40 py-8 md:py-12 light:border-t-0 light:bg-transparent light:py-10 md:light:py-12"
    >
      <p className="sr-only">Technologies I work with: {words.join(", ")}.</p>
      <div aria-hidden className="flex flex-col gap-1 md:gap-2 light:gap-6 md:light:gap-8">
        <Marquee speed={38} className="hm-ticker">
          <Row words={words.slice(0, half)} offset={0} ticker />
        </Marquee>
        <Marquee speed={26}>
          <Row words={words.slice(half)} offset={1} />
        </Marquee>
      </div>
    </section>
  );
}
