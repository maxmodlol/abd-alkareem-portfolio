"use client";

import * as React from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

import { cn } from "@/lib/utils";

const spring = { stiffness: 120, damping: 18, mass: 0.4 };

type TiltCard3DProps = {
  children: React.ReactNode;
  className?: string;
  max?: number;
};

export function TiltCard3D({ children, className, max = 7 }: TiltCard3DProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, spring);
  const sry = useSpring(ry, spring);
  const transform = useMotionTemplate`perspective(1200px) rotateX(${srx}deg) rotateY(${sry}deg)`;

  const onMove = (e: React.MouseEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * (max * 2));
    rx.set((0.5 - py) * (max * 2));
  };

  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={cn("transform-gpu will-change-transform", className)}
      style={{ transform }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.div>
  );
}
