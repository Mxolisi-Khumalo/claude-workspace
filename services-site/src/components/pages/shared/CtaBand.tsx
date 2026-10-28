import { profile } from "@/content";
import { RevealText } from "@/components/ui/RevealText";
import { ConciergeButton } from "./ConciergeButton";

/**
 * Compact closing call to action that opens the concierge. Dark: a glass
 * card with a glow. Light: a white cell ruled from rail to rail (callers put
 * it in a `mkp-sec` row).
 */
export function CtaBand({
  eyebrow = "// Ready when you are",
  title,
  body,
  buttonLabel = "Start with Byte",
  serviceSlug,
  seedPrompt,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  buttonLabel?: string;
  serviceSlug?: string;
  seedPrompt?: string;
}) {
  return (
    <div className="mkp-card mkp-bleed relative overflow-hidden px-6 py-12 md:px-14 md:py-16 light:py-16 md:light:py-20">
      <span className="mkp-card-edge" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-32 h-[420px] w-[420px] rounded-full bg-[var(--glow,var(--accent))] opacity-[0.14] blur-[90px] light:hidden"
      />
      <div aria-hidden className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="eyebrow mb-5">{eyebrow}</p>
          <RevealText as="h2" className="display max-w-[18ch] text-[clamp(2rem,4.6vw,4rem)]">
            {title}
          </RevealText>
          <p className="mkp-measure mt-6 text-lg leading-relaxed text-fg-muted">{body}</p>
        </div>
        <div className="flex flex-col items-start gap-4 lg:items-end">
          <ConciergeButton serviceSlug={serviceSlug} seedPrompt={seedPrompt} className="px-8 py-4 text-base">
            {buttonLabel} <span aria-hidden>→</span>
          </ConciergeButton>
          {profile.email && (
            <a
              href={`mailto:${profile.email}`}
              className="text-sm text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
            >
              or email {profile.email}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
