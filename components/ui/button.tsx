import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/components/ui/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
        size === "md" && "h-10 px-4",
        size === "sm" && "h-9 px-3",
        size === "icon" && "h-10 w-10",
        variant === "primary" && "border-graphite bg-graphite text-milk hover:bg-ink",
        variant === "secondary" && "border-graphite/15 bg-white/70 text-graphite hover:bg-white",
        variant === "ghost" && "border-transparent bg-transparent text-graphite hover:bg-graphite/5",
        variant === "danger" && "border-red-700 bg-red-700 text-white hover:bg-red-800",
        className
      )}
      {...props}
    />
  );
}
