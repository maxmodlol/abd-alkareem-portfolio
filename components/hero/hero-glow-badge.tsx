import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type HeroGlowBadgeProps = {
  className?: string;
  children: ReactNode;
};

export function HeroGlowBadge({ className, children }: HeroGlowBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-cyan-400/25",
        "bg-cyan-500/10 px-3 py-1.5 text-center text-[10px] font-medium uppercase leading-snug tracking-[0.14em] text-cyan-100/95 sm:text-[11px] sm:tracking-wider",
        "shadow-[0_0_28px_rgba(6,182,212,0.14),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
        "backdrop-blur-sm",
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
        aria-hidden
      />
      {children}
    </div>
  );
}
