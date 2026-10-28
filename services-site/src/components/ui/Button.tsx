import Link from "next/link";
import { clsx } from "clsx";
import { Magnetic } from "./Magnetic";

type Variant = "primary" | "ghost" | "outline";

const base =
  "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3 text-sm font-semibold tracking-tight transition-[color,background,border-color,box-shadow] duration-300";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:shadow-[var(--glow-accent)]",
  outline: "border border-line-strong text-fg hover:border-accent hover:text-accent",
  ghost: "text-fg-muted hover:text-fg",
};

function Inner({ children, variant }: { children: React.ReactNode; variant: Variant }) {
  return (
    <>
      {variant === "primary" && (
        <span
          aria-hidden
          className="absolute inset-0 -translate-x-full bg-[linear-gradient(100deg,transparent,rgb(255_255_255/0.45),transparent)] transition-transform duration-700 ease-[var(--ease-out)] group-hover:translate-x-full"
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </>
  );
}

interface CommonProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  magnetic?: boolean;
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
  magnetic = true,
  ...rest
}: CommonProps & { href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  const el = (
    <Link href={href} className={clsx(base, variants[variant], className)} {...rest}>
      <Inner variant={variant}>{children}</Inner>
    </Link>
  );
  return magnetic ? <Magnetic>{el}</Magnetic> : el;
}

export function Button({
  children,
  variant = "primary",
  className,
  magnetic = true,
  ...rest
}: CommonProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">) {
  const el = (
    <button type="button" className={clsx(base, variants[variant], className)} {...rest}>
      <Inner variant={variant}>{children}</Inner>
    </button>
  );
  return magnetic ? <Magnetic>{el}</Magnetic> : el;
}
