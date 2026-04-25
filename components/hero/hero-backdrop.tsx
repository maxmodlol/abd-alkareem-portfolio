"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type HeroBackdropProps = {
  className?: string;
};

/**
 * Hero-only environment layers (command center). Does not affect the rest of the page.
 */
export function HeroBackdrop({ className }: HeroBackdropProps) {
  const reduce = useReducedMotion();

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 -z-0 overflow-hidden", className)}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[#010409]" />
      <div className="absolute inset-0 bg-gradient-radial-hero opacity-90" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 70% at 50% 0%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.05] via-transparent to-indigo-950/30"
        style={{ mixBlendMode: "plus-lighter" }}
      />

      <div className="hero-perspective absolute inset-0 opacity-[0.32]">
        <div className="hero-grid-floor absolute -bottom-[45%] left-1/2 h-[75%] w-[170%] -translate-x-1/2" />
      </div>

      <div
        className="bg-grid-anim absolute inset-0 opacity-[0.18]"
        style={{ maskImage: "radial-gradient(ellipse 90% 65% at 50% 35%, black, transparent 72%)" }}
      />
      <div
        className="bg-grid-fine absolute inset-0 opacity-20"
        style={{ maskImage: "radial-gradient(ellipse 100% 70% at 50% 25%, black, transparent 65%)" }}
      />

      <div
        className="absolute right-[8%] top-[6%] h-64 w-64 rounded-full bg-cyan-500/20 blur-[90px]"
        style={{ willChange: "transform" }}
      />
      <div
        className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-violet-600/20 blur-[90px]"
        style={{ willChange: "transform" }}
      />

      {!reduce && (
        <>
          <motion.div
            className="absolute -left-1/4 top-0 h-full w-1/2 -rotate-12"
            style={{
              background:
                "linear-gradient(105deg, transparent, rgba(6,182,212,0.08) 42%, transparent)",
            }}
            initial={{ x: "-10%", opacity: 0 }}
            animate={{ x: ["-10%", "18%", "4%"], opacity: [0, 0.5, 0.22] }}
            transition={{ duration: 11, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute -right-1/4 top-0 h-full w-1/2 rotate-6"
            style={{
              background:
                "linear-gradient(280deg, transparent, rgba(99,102,241,0.07) 45%, transparent)",
            }}
            initial={{ x: "10%", opacity: 0 }}
            animate={{ x: ["10%", "-12%", "0%"], opacity: [0, 0.4, 0.18] }}
            transition={{ duration: 13, repeat: Infinity, ease: "linear", delay: 1.2 }}
          />
        </>
      )}

      <div className="hero-particles absolute inset-0 opacity-35" />
      <div
        className="texture-grain absolute inset-0 mix-blend-overlay opacity-[0.18]"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
