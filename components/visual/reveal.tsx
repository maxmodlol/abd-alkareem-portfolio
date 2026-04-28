"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
  /** If true, render immediately (no opacity-0 on first paint). */
  eager?: boolean;
};

export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
  once = true,
  eager = false,
}: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce || eager) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-8% 0px -8% 0px" }}
      transition={{
        duration: 0.55,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
