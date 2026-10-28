"use client";

import { Button } from "@/components/ui/Button";
import { openConcierge } from "@/lib/chat/concierge-store";

/** A brand button that opens the concierge chat, optionally pre-seeded. */
export function ConciergeButton({
  children,
  serviceSlug,
  seedPrompt,
  variant = "primary",
  className,
  magnetic,
  cursorLabel = "Chat",
}: {
  children: React.ReactNode;
  serviceSlug?: string;
  seedPrompt?: string;
  variant?: "primary" | "outline" | "ghost";
  className?: string;
  magnetic?: boolean;
  cursorLabel?: string;
}) {
  return (
    <Button
      variant={variant}
      className={className}
      magnetic={magnetic}
      aria-haspopup="dialog"
      data-cursor="view"
      data-cursor-label={cursorLabel}
      onClick={() => openConcierge({ serviceSlug, seedPrompt })}
    >
      {children}
    </Button>
  );
}
