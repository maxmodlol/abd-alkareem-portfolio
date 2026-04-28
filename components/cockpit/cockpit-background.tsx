"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

const PARTICLE_COUNT = 48;

function randomSeeded(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Particles are only mounted after hydration so Math.sin / style precision
 * cannot mismatch server vs client.
 */
export function CockpitBackground() {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[#020202]" />
      <div className="absolute inset-0 bg-gradient-mesh opacity-90" />
      <div className="absolute inset-0 bg-gradient-neon-bloom" />
      <div className="vignette absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-radial-hero" />
      <div
        className="bg-grid-anim absolute inset-0 opacity-[0.28]"
        style={{
          maskImage:
            "radial-gradient(ellipse 90% 65% at 50% 0%, black, transparent 75%)",
        }}
      />
      <div
        className="bg-grid-fine absolute inset-0 opacity-20"
        style={{
          maskImage:
            "radial-gradient(ellipse 100% 70% at 50% 20%, black, transparent 60%)",
        }}
      />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div
        className="texture-grain absolute inset-0 mix-blend-overlay opacity-35"
        style={{ imageRendering: "pixelated" }}
      />

      {mounted && !reduce
        ? Array.from({ length: PARTICLE_COUNT }, (_, i) => {
            const top = randomSeeded(i * 1.1) * 100;
            const left = randomSeeded(i * 2.2) * 100;
            const size = 1 + randomSeeded(i * 3.3) * 2;
            const delay = randomSeeded(i * 4.4) * 8;
            const dur = 12 + randomSeeded(i * 5.5) * 20;
            const isLime = randomSeeded(i * 6.6) > 0.45;
            return (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{
                  top: `${Number(top.toFixed(4))}%`,
                  left: `${Number(left.toFixed(4))}%`,
                  width: Number(size.toFixed(3)),
                  height: Number(size.toFixed(3)),
                  background: isLime
                    ? "rgba(223, 255, 0, 0.35)"
                    : "rgba(191, 0, 255, 0.3)",
                  boxShadow: isLime
                    ? "0 0 8px rgba(223, 255, 0, 0.5)"
                    : "0 0 8px rgba(191, 0, 255, 0.5)",
                }}
                animate={{ opacity: [0.15, 0.85, 0.2], y: [0, -10, 0] }}
                transition={{
                  duration: dur,
                  repeat: Infinity,
                  delay,
                  ease: "easeInOut",
                }}
              />
            );
          })
        : null}
    </div>
  );
}
