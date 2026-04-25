"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type HeroScrollHintProps = {
  className?: string;
  /** Default: #projects */
  href?: string;
};

export function HeroScrollHint({
  className,
  href = "#projects",
}: HeroScrollHintProps) {
  const reduce = useReducedMotion();

  return (
    <a
      href={href}
      className={cn(
        "group flex flex-col items-center gap-2 text-zinc-500 transition hover:text-cyan-200/90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        className,
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.22em] sm:text-[11px]">
        Explore projects
      </span>
      <div className="relative flex h-10 w-5 items-start justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.02] py-1.5">
        {!reduce ? (
          <motion.span
            className="h-1.5 w-1 rounded-full bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            animate={{ y: [0, 18, 0], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
        ) : (
          <span className="h-1.5 w-1 rounded-full bg-cyan-400/60" />
        )}
      </div>
    </a>
  );
}
