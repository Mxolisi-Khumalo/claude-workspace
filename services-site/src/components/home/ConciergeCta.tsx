"use client";

import { Button } from "@/components/ui/Button";
import { openConcierge } from "@/lib/chat/concierge-store";

/** A Button that opens the concierge chat — usable from server components. */
export function ConciergeCta({
  children,
  serviceSlug,
  seedPrompt,
  variant = "primary",
  className,
  magnetic,
}: {
  children: React.ReactNode;
  serviceSlug?: string;
  seedPrompt?: string;
  variant?: "primary" | "outline" | "ghost";
  className?: string;
  magnetic?: boolean;
}) {
  return (
    <Button
      variant={variant}
      className={className}
      magnetic={magnetic}
      onClick={() => openConcierge({ serviceSlug, seedPrompt })}
    >
      {children}
    </Button>
  );
}
