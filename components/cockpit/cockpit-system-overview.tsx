"use client";

import { motion, useReducedMotion } from "framer-motion";

import { TiltCard3D } from "@/components/visual/tilt-card-3d";

const stats = [
  { label: "Projects", value: "28", sub: "Shipped" },
  { label: "Experiments", value: "17", sub: "In progress" },
  { label: "Coffee", value: "∞", sub: "Fuel consumed" },
] as const;

function Waveform() {
  const reduce = useReducedMotion();
  const bars = 48;
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-end justify-center gap-px overflow-hidden opacity-45"
      aria-hidden
    >
      {Array.from({ length: bars }, (_, i) => {
        const hRaw = 12 + ((i * 5) % 32) + Math.sin(i * 0.4) * 6;
        const h = Math.round(hRaw * 100) / 100;
        return (
          <motion.span
            key={i}
            className="w-px rounded-t bg-gradient-to-t from-neon-purple/40 to-neon-lime/80"
            style={{ height: `${h.toFixed(2)}%` }}
            animate={
              reduce
                ? undefined
                : { scaleY: [0.4, 1, 0.6], opacity: [0.3, 0.8, 0.4] }
            }
            transition={{
              duration: 2.4,
              delay: (i % 12) * 0.08,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}

export function CockpitSystemOverview() {
  return (
    <TiltCard3D className="relative w-full" max={4}>
      <div className="cockpit-glass relative overflow-hidden rounded-2xl px-3 py-4 sm:rounded-3xl sm:px-5 sm:py-5">
        <Waveform />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-lime/25 to-transparent" />
        <div className="relative z-10 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/[0.06]">
          {stats.map((s) => (
            <div
              key={s.label}
              className="text-center sm:px-2 sm:py-0.5 first:pl-0 last:pr-0"
            >
              <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 sm:text-[10px]">
                {s.label}
              </p>
              <p className="mt-0.5 font-display text-2xl font-extrabold text-neon-purple [text-shadow:0_0_20px_rgba(191,0,255,0.35)] sm:mt-1 sm:text-3xl lg:text-4xl">
                {s.value}
              </p>
              <p className="text-[11px] text-zinc-500 sm:text-xs">{s.sub}</p>
            </div>
          ))}
        </div>
        <div className="relative z-10 mt-4 border-t border-white/[0.08] pt-4 sm:mt-5 sm:pt-4">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-neon-lime/25 bg-zinc-950/90 px-3 py-1 text-[9px] font-mono font-medium uppercase tracking-widest text-neon-lime shadow-[0_0_16px_rgba(223,255,0,0.1)] [text-shadow:0_0_6px_rgba(223,255,0,0.2)] sm:px-3.5 sm:py-1.5 sm:text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-lime shadow-[0_0_6px_#dfff00]" />
              Flow State Activated
            </span>
          </div>
        </div>
      </div>
    </TiltCard3D>
  );
}
