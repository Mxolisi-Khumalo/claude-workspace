"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="eyebrow">Password</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          className="mt-2 w-full rounded-[var(--radius-sm)] border border-line-strong bg-bg px-4 py-3 font-mono text-sm text-fg outline-none transition-colors focus:border-accent"
        />
      </label>
      <p aria-live="polite" className="min-h-5 text-sm text-pink">
        {state.error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[var(--radius-button)] bg-accent px-6 py-3 text-sm font-semibold text-accent-ink transition-[box-shadow,background-color] hover:shadow-[var(--glow-accent)] disabled:opacity-60 light:hover:bg-accent-hover light:hover:shadow-none"
      >
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
