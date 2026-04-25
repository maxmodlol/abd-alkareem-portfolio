"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type HeroDiveIntroProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Wrapper for the hero “command” card. The previous long blur/scale “dive”
 * was removed for faster LCP: content is visible immediately, optional subtle
 * CSS drift when motion is allowed. See `hero-scene-drift-subtle` in globals.
 */
export function HeroDiveIntro({ children, className }: HeroDiveIntroProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <div className={cn("relative transform-gpu", className)}>
      <div className="hero-scene-drift-subtle">{children}</div>
    </div>
  );
}
