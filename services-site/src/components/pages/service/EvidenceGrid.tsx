import { clsx } from "clsx";
import type { Evidence } from "@/content/types";
import { GlowGroup } from "../shared/GlowGroup";
import { ZoomImage } from "../shared/ZoomImage";
import { evidenceLink, pad } from "../shared/helpers";
import { media } from "../shared/media";

function FileRef({ item }: { item: Evidence }) {
  const link = evidenceLink(item);
  if (link.isCode) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        data-cursor="view"
        data-cursor-label="Code"
        className="group/ref inline-flex max-w-full items-center gap-2 rounded-lg border border-line-strong bg-bg/70 px-3 py-2 font-mono text-xs text-fg-muted transition-colors hover:border-[var(--glow)] hover:text-fg"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 fill-current">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        <span className="truncate">{item.fileRef}</span>
        <span aria-hidden className="text-[var(--glow)] transition-transform duration-300 group-hover/ref:-translate-y-0.5 group-hover/ref:translate-x-0.5">
          ↗
        </span>
        <span className="sr-only">(view the code on GitHub, opens in a new tab)</span>
      </a>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-fg-muted">
      <span>
        Documented in <span className="text-fg">{item.fileRef}</span>
      </span>
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-bg/70 px-3 py-2 transition-colors hover:border-[var(--glow)] hover:text-fg"
      >
        {link.host} <span aria-hidden>↗</span>
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </div>
  );
}

export function EvidenceGrid({ items }: { items: Evidence[] }) {
  return (
    <GlowGroup
      as="ol"
      className={clsx("gap-5 [&>li]:mb-5", items.length > 1 ? "columns-1 md:columns-2" : "max-w-3xl")}
    >
      {items.map((item, i) => {
        const img = item.image ? media(item.image, `${item.project} screenshot`) : null;
        return (
          <li key={`${item.fileRef}-${i}`} className="mkp-card flex break-inside-avoid flex-col gap-5 p-5 md:p-6">
            <span className="mkp-card-edge" />
            {img && item.image && (
              <ZoomImage
                src={item.image}
                alt={img.alt}
                width={img.width}
                height={img.height}
                caption={`${item.project} — ${img.alt}`}
                sizes="(min-width: 768px) 45vw, 100vw"
                className="max-h-[420px] border border-line"
                imageClassName={img.height > img.width ? "max-h-[420px] object-top" : undefined}
              />
            )}
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--glow)]">{item.project}</p>
              <span aria-hidden className="font-mono text-xs text-fg-subtle">
                {pad(i + 1)}
              </span>
            </div>
            <p className="text-lg leading-relaxed text-fg">{item.proofPoint}</p>
            <FileRef item={item} />
          </li>
        );
      })}
    </GlowGroup>
  );
}
