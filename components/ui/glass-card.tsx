import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Reusable glass surface for cards and panels (design system primitive).
 */
export function GlassCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.1] bg-zinc-950/55 shadow-[0_0_0_1px_rgba(6,182,212,0.06),0_20px_50px_-24px_rgba(0,0,0,0.65)] backdrop-blur-md",
        "transition hover:border-neon-lime/25",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
