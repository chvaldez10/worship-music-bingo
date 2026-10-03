import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import type { ButtonHTMLAttributes, SelectHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";
const styles: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:brightness-95 shadow-soft",
  outline: "border-2 border-border bg-card text-foreground hover:bg-secondary",
  ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
  danger: "border-2 border-destructive/40 text-destructive hover:bg-destructive/10",
};

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative mt-2 block">
      <select
        {...props}
        className={cn(
          "block min-h-12 w-full min-w-0 appearance-none rounded-xl border border-border bg-background py-3 pl-4 pr-12 text-base disabled:opacity-50",
          className,
        )}
      />
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground",
          props.disabled && "opacity-50",
        )}
      />
    </span>
  );
}

export function Btn({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-11 min-w-11 max-w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        styles[variant],
        className,
      )}
    />
  );
}
