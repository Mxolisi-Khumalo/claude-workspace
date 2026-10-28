"use client";

import { useFormStatus } from "react-dom";

/** Submit button that shows a pending label while its form's server action runs. */
export function SubmitButton({ children, pendingLabel, className }: { children: React.ReactNode; pendingLabel: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
