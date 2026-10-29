import Image from "next/image";
import type { Profile } from "@/content/types";
import { Marquee } from "@/components/ui/Marquee";
import { RevealText } from "@/components/ui/RevealText";

interface Testimonial {
  quote: string;
  source: string;
  image?: string;
}

/**
 * Portrait, bio, credentials, certifications marquee and the testimonial.
 * Light: square photo and panels, and the certifications run along a black
 * utility strip in mono type with neon highlights.
 */
export function About({ profile, testimonial }: { profile: Profile; testimonial: Testimonial }) {
  return (
    <section id="about" aria-label="About" className="relative scroll-mt-24 py-20 md:py-32 light:py-16 md:light:py-24">
      <div className="container-x grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20 light:border-t light:border-line light:pt-12 md:light:pt-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          {profile.portrait && (
            <figure className="hm-portrait group relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface lg:max-w-none light:rounded-none light:border-line-strong">
              <Image
                src={profile.portrait}
                alt={`Portrait of ${profile.name}`}
                fill
                sizes="(min-width: 1024px) 40vw, (min-width: 640px) 28rem, 100vw"
                className="object-cover object-[50%_28%]"
              />
              <div aria-hidden className="hm-portrait-scan pointer-events-none absolute inset-0" />
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/90 via-transparent to-transparent light:hidden" />
              <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-fg light:border-t light:border-line-strong light:bg-surface light:px-4 light:py-3 light:text-xs light:normal-case light:tracking-normal">
                <span>
                  {profile.name}
                  <span className="mt-1 block text-fg-muted">{profile.location}</span>
                </span>
                <span className="hidden shrink-0 text-accent sm:inline">{profile.timezone}</span>
              </figcaption>
            </figure>
          )}
        </div>

        <div>
          <p className="eyebrow mb-5">{"// About"}</p>
          <RevealText as="h2" className="display text-[clamp(2.5rem,5.6vw,5.25rem)]">
            {`Hi, I'm ${profile.shortName}.`}
          </RevealText>
          <p className="mt-4 font-mono text-sm text-accent">{profile.role}</p>

          <div className="mt-8 max-w-[64ch] space-y-5 text-base leading-relaxed text-fg-muted md:text-lg">
            {profile.bio.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>

          <h3 className="eyebrow mt-12">Credentials</h3>
          <ul className="mt-5 grid gap-px overflow-hidden rounded-[var(--radius)] border border-line bg-line light:rounded-none light:border-line-strong">
            {profile.credibility.map((c) => (
              <li key={c} className="flex gap-3 bg-bg-elevated/90 px-5 py-4 text-[15px] leading-snug text-fg light:bg-surface">
                <span aria-hidden className="text-accent">
                  ✓
                </span>
                {c}
              </li>
            ))}
          </ul>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-sm">
            <div>
              <dt className="eyebrow">Languages</dt>
              <dd className="mt-2 text-fg">{profile.languages.join(" · ")}</dd>
            </div>
            <div>
              <dt className="eyebrow">Based in</dt>
              <dd className="mt-2 text-fg">
                {profile.location} · {profile.timezone}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-24 md:mt-32 light:mt-20 md:light:mt-24">
        <h3 className="container-x eyebrow mb-6">
          Certifications <span className="text-fg-subtle">· {profile.certifications.length} selected</span>
        </h3>
        <ul className="sr-only">
          {profile.certifications.map((c) => (
            <li key={c.title}>
              {c.title} — {c.issuer}
            </li>
          ))}
        </ul>
        <div aria-hidden className="border-y border-line py-5 light:border-black light:bg-black light:py-3">
          <Marquee speed={30}>
            {profile.certifications.map((c) => (
              <span
                key={c.title}
                className="mx-2 inline-flex items-center gap-3 whitespace-nowrap rounded-full border border-line-strong bg-bg-elevated/70 px-5 py-2.5 light:mx-0 light:rounded-none light:border-0 light:bg-transparent light:py-1.5"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent light:rounded-none light:bg-accent-bright" />
                <span className="text-sm font-medium text-fg light:font-mono light:font-normal light:text-white">{c.title}</span>
                <span className="font-mono text-[11px] text-fg-subtle light:text-sm light:text-accent-bright">{c.issuer}</span>
              </span>
            ))}
          </Marquee>
        </div>
      </div>

      <figure className="container-x mt-24 md:mt-32 light:mt-20 md:light:mt-24">
        <div className="relative mx-auto max-w-5xl">
          <span aria-hidden className="display pointer-events-none absolute -left-2 -top-10 select-none text-[clamp(6rem,14vw,12rem)] leading-none text-accent/25 md:-left-10 md:-top-16">
            “
          </span>
          <blockquote className="relative pt-10 md:pt-0">
            <p className="display text-[clamp(1.75rem,3.8vw,3.4rem)] leading-[1.05] tracking-[-0.03em] [text-wrap:balance]">
              {testimonial.quote}
            </p>
          </blockquote>
          <figcaption className="mt-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <span className="flex items-center gap-4">
              <span aria-hidden className="h-px w-10 bg-accent" />
              <span>
                <span className="block font-semibold text-fg">{testimonial.source}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle light:text-xs light:normal-case light:tracking-normal">
                  Original message, quoted in part
                </span>
              </span>
            </span>
            {testimonial.image && (
              <span className="block w-full max-w-sm overflow-hidden rounded-[var(--radius)] border border-line opacity-80 transition-opacity duration-500 hover:opacity-100 light:rounded-none light:border-line-strong light:opacity-100">
                <Image
                  src={testimonial.image}
                  alt="Screenshot of the original message from the mentee"
                  width={1080}
                  height={288}
                  sizes="384px"
                  className="h-auto w-full"
                />
              </span>
            )}
          </figcaption>
        </div>
      </figure>
    </section>
  );
}
