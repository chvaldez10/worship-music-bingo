import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";
const styles: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:brightness-95 shadow-soft",
  outline: "border-2 border-border bg-card text-foreground hover:bg-secondary",
  ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
  danger: "border-2 border-destructive/40 text-destructive hover:bg-destructive/10",
};

export function Btn({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        styles[variant],
        className,
      )}
    />
  );
}
