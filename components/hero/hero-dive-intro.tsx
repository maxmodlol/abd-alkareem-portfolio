"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type HeroDiveIntroProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * “Fly into the system” intro: perspective + scale + depth blur + portal rings.
 * Respects prefers-reduced-motion. After the dive, a subtle idle drift runs (CSS).
 */
export function HeroDiveIntro({ children, className }: HeroDiveIntroProps) {
  const reduce = useReducedMotion();
  const [diveDone, setDiveDone] = React.useState(false);

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative", className)}>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-48 w-48 -translate-x-1/2 -translate-y-1/2 sm:h-64 sm:w-64"
        aria-hidden
      >
        {[0, 1].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/15"
            initial={{ scale: 0.4, opacity: 0.4 }}
            animate={{ scale: 1.0, opacity: 0 }}
            transition={{
              duration: 0.9,
              delay: 0.04 + i * 0.12,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        ))}
      </div>

      <motion.div
        className="relative transform-gpu will-change-transform"
        initial={{
          scale: 0.94,
          y: 18,
          opacity: 0.35,
          filter: "blur(4px)",
        }}
        animate={{
          scale: 1,
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
        }}
        transition={{
          duration: 0.85,
          delay: 0.05,
          ease: [0.2, 0.85, 0.2, 1],
        }}
        onAnimationComplete={() => setDiveDone(true)}
      >
        <motion.div
          className="pointer-events-none absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-b from-cyan-400/12 via-transparent to-transparent opacity-0"
          initial={{ opacity: 0, x: "-12%" }}
          animate={{ opacity: [0, 0.2, 0], x: ["-12%", "8%", "8%"] }}
          transition={{ duration: 0.75, delay: 0.2, ease: "easeOut" }}
        />
        <div
          className={cn(
            diveDone && "hero-scene-drift-subtle",
          )}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}
