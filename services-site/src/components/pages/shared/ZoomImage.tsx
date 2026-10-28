"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { useLenis } from "lenis/react";

const noop = () => () => {};

/**
 * A thumbnail that opens an accessible lightbox: modal dialog semantics,
 * focus moved in and trapped, Escape / backdrop / button to close, focus
 * returned to the thumbnail, page scroll paused. Rendered through a portal
 * so ancestor transforms can't break its fixed positioning, and kept below
 * the custom cursor's layer.
 */
export function ZoomImage({
  src,
  alt,
  width,
  height,
  caption,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  className,
  imageClassName,
  priority,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  sizes?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const lenis = useLenis();
  const titleId = useId();
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeBtn.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== "Tab" || !dialog.current) return;
      const focusables = dialog.current.querySelectorAll<HTMLElement>("button, a[href]");
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.documentElement.style.overflow = prevOverflow;
      lenis?.start();
    };
  }, [open, close, lenis]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Enlarge image: ${alt}`}
        data-cursor="view"
        data-cursor-label="Zoom"
        className={clsx(
          "group/zoom relative block w-full overflow-hidden rounded-[var(--radius)] bg-surface text-left",
          className,
        )}
      >
        <Image
          src={src}
          alt=""
          width={width}
          height={height}
          sizes={sizes}
          priority={priority}
          className={clsx(
            "h-full w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out)] group-hover/zoom:scale-[1.04]",
            imageClassName,
          )}
        />
        <span
          aria-hidden
          className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full border border-line-strong bg-bg/70 font-mono text-sm text-fg backdrop-blur transition-colors group-hover/zoom:border-accent group-hover/zoom:text-accent"
        >
          ⤢
        </span>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-lenis-prevent
            className="mkp-lightbox fixed inset-0 z-[90] flex flex-col bg-[rgb(4_5_8/0.9)] backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
              <p id={titleId} className="eyebrow truncate">
                Image preview
              </p>
              <button
                ref={closeBtn}
                type="button"
                onClick={close}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line-strong bg-surface/80 text-lg text-fg transition-colors hover:border-accent hover:text-accent"
                aria-label="Close image preview"
              >
                ✕
              </button>
            </div>
            <figure
              className="mkp-lightbox-figure flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 pb-6 md:px-10 md:pb-10"
              onClick={(e) => {
                if (e.target === e.currentTarget) close();
              }}
            >
              <Image
                src={src}
                alt={alt}
                width={width}
                height={height}
                sizes="(min-width: 1024px) 85vw, 100vw"
                className="h-auto max-h-[78dvh] w-auto max-w-full rounded-[var(--radius)] border border-line object-contain shadow-[0_40px_120px_-40px_rgb(0_0_0/0.9)]"
              />
              {caption && (
                <figcaption className="max-w-2xl text-center text-sm leading-relaxed text-fg-muted">{caption}</figcaption>
              )}
            </figure>
          </div>,
          document.body,
        )}
    </>
  );
}
