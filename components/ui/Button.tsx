import { cn } from "@/lib/utils";
import Link from "next/link";
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface BaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:scale-[1.02] hover:shadow-lift active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100",
  secondary:
    "bg-transparent text-primary border border-primary/25 hover:bg-primary/5 active:scale-[0.99] disabled:opacity-40",
  ghost:
    "bg-transparent text-ink-variant hover:bg-ink/5 active:scale-[0.99] disabled:opacity-40",
  danger:
    "bg-transparent text-error border border-error/30 hover:bg-error/5 active:scale-[0.99] disabled:opacity-40",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-4 py-2 gap-1.5",
  md: "text-sm px-6 py-3 gap-2",
  lg: "text-base px-8 py-4 gap-2",
};

const base =
  "inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 whitespace-nowrap disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: BaseProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
}: BaseProps & { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(base, variantClasses[variant], sizeClasses[size], className)}
    >
      {children}
    </Link>
  );
}
