"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

type CockpitBottomBarProps = {
  /** Merged on the fixed wrapper (e.g. `lg:pl-16` vs `lg:pl-[4.75rem] xl:pl-56`) */
  className?: string;
};

export function CockpitBottomBar({ className }: CockpitBottomBarProps) {
  const reduce = useReducedMotion();

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-0 left-0 right-0 z-30 flex w-full min-w-0 justify-center px-2 pb-2 pt-1 sm:px-3 sm:pb-2.5",
        "lg:pl-[4.75rem] xl:pl-56",
        className,
      )}
    >
      <div
        className="pointer-events-auto flex w-full max-w-full items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-zinc-950/75 px-2.5 py-1.5 shadow-[0_6px_28px_rgba(0,0,0,0.55),0_0_0_1px_rgba(191,0,255,0.08)] backdrop-blur-md sm:max-w-3xl sm:gap-3 sm:px-3 sm:py-2"
        role="region"
        aria-label="Availability and contact"
      >
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-400 sm:text-[10px] sm:tracking-[0.2em]">
            <span
              className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center"
              title="Status"
            >
              <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-500/25 motion-reduce:animate-none" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
            </span>
            <span className="truncate">Open to opportunities</span>
          </p>
        </div>

        <div className="hidden h-3.5 flex-1 items-center overflow-hidden sm:flex sm:px-1.5">
          {!reduce && (
            <motion.div
              className="flex h-3 w-full gap-px"
              style={{ minWidth: "4rem" }}
              animate={{ x: [0, -32, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <span
                  key={i}
                  className="h-full w-px flex-1 rounded-full bg-gradient-to-b from-neon-lime/35 to-neon-purple/35"
                  style={{ opacity: 0.1 + (i % 4) * 0.1 }}
                />
              ))}
            </motion.div>
          )}
          <span className="ml-1 shrink-0 text-[8px] font-mono font-semibold uppercase tracking-[0.3em] text-neon-purple/90 [text-shadow:0_0_6px_rgba(191,0,255,0.3)]">
            Ping
          </span>
        </div>

        <div className="shrink-0">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex"
          >
            <Link
              href="#contact"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-neon-lime/30 bg-zinc-950/90 text-neon-lime shadow-[0_0_14px_rgba(223,255,0,0.18),inset_0_0_0_1px_rgba(255,255,255,0.05)] sm:h-8 sm:w-8"
              aria-label="Open contact"
            >
              <Plus className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
