import { RevealText } from "@/components/ui/RevealText";

/** Eyebrow + display heading (+ optional intro) shared by home sections. */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  className,
  titleClassName,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div className={`grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-12 ${className ?? ""}`}>
      <div>
        <p className="eyebrow mb-5">{eyebrow}</p>
        <RevealText as="h2" className={titleClassName ?? "display max-w-4xl text-[clamp(2.5rem,6.5vw,6rem)]"}>
          {title}
        </RevealText>
      </div>
      {intro && <div className="max-w-sm text-base leading-relaxed text-fg-muted md:pb-2">{intro}</div>}
    </div>
  );
}
