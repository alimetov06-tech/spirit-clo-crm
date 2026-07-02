import { type HTMLAttributes } from "react";
import { cn } from "@/components/ui/utils";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "green" | "amber" | "red" | "blue" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tone === "neutral" && "border-graphite/15 bg-graphite/5 text-graphite",
        tone === "green" && "border-emerald-700/20 bg-emerald-50 text-emerald-800",
        tone === "amber" && "border-amber-700/20 bg-amber-50 text-amber-800",
        tone === "red" && "border-red-700/20 bg-red-50 text-red-800",
        tone === "blue" && "border-sky-700/20 bg-sky-50 text-sky-800",
        className
      )}
      {...props}
    />
  );
}
