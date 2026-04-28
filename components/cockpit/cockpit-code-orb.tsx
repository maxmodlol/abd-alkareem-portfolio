"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

const ORBIT_TEXT =
  "backend • frontend • cloud • design • systems • backend • frontend • cloud • design • systems";

function CurrentVibeCard() {
  const reduce = useReducedMotion();
  const bars = 20;
  return (
    <div className="pointer-events-none w-full rounded-2xl border border-white/12 bg-zinc-950/85 p-2.5 shadow-[0_0_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:max-w-[9.5rem]">
      <p className="text-[8px] font-mono font-semibold uppercase tracking-[0.2em] text-zinc-400">
        Current vibe
      </p>
      <p className="mt-0.5 text-[9px] font-medium text-neon-lime/90 [text-shadow:0_0_10px_rgba(223,255,0,0.25)]">
        In flow — building
      </p>
      <div
        className="mt-2 flex h-7 items-end justify-center gap-px overflow-hidden rounded-md bg-black/30 px-0.5 py-0.5"
        aria-hidden
      >
        {Array.from({ length: bars }, (_, i) => (
          <motion.span
            key={i}
            className="w-0.5 min-w-[2px] origin-bottom rounded-t bg-gradient-to-t from-neon-purple/50 to-neon-lime"
            initial={reduce ? undefined : { height: "32%" }}
            animate={
              reduce
                ? undefined
                : {
                    height: ["18%", "100%", "28%", "92%", "22%", "70%"],
                    opacity: [0.35, 1, 0.45, 0.9, 0.4, 0.75],
                  }
            }
            transition={{
              duration: 1.45 + (i % 5) * 0.1,
              repeat: Infinity,
              delay: i * 0.05,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function CockpitCodeOrb() {
  const reduce = useReducedMotion();
  const pathId = React.useId().replace(/:/g, "");

  return (
    <div className="relative mx-auto w-full max-w-[min(100%,460px)] sm:max-w-lg lg:max-w-[min(100%,28rem)] xl:max-w-[min(100%,32rem)]">
      <div className="relative flex aspect-square w-full max-w-full items-center justify-center">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-[-20%] rounded-full bg-gradient-to-tr from-neon-lime/15 via-transparent to-neon-purple/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 scale-110 bg-[radial-gradient(circle_at_50%_50%,rgba(191,0,255,0.15),transparent_55%)]"
          aria-hidden
        />

        {/* Outer organic blobs */}
        {!reduce && (
          <>
            <motion.div
              className="pointer-events-none absolute inset-[6%] rounded-[40%] border border-white/5 bg-gradient-to-br from-neon-purple/20 via-zinc-950/40 to-neon-lime/10 opacity-80 blur-[1px]"
              animate={reduce ? undefined : { rotate: 360, scale: [1, 1.03, 1] }}
              transition={{
                rotate: { duration: 80, repeat: Infinity, ease: "linear" },
                scale: { duration: 6, repeat: Infinity, ease: "easeInOut" },
              }}
            />
            <motion.div
              className="pointer-events-none absolute inset-[2%] rounded-[50%] border border-neon-lime/10"
              style={{ borderRadius: "45% 55% 50% 50% / 55% 50% 50% 45%" }}
              animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}

        {/* Main glass mass */}
        <div className="relative h-[78%] w-[78%]">
          <div
            className="absolute inset-0 motion-safe:animate-orb-morph"
            style={{
              borderRadius: "55% 45% 48% 52% / 48% 55% 45% 52%",
              willChange: "border-radius",
              background: `
              linear-gradient(145deg, rgba(255,255,255,0.1) 0%, transparent 45%),
              linear-gradient(200deg, rgba(191,0,255,0.35) 0%, rgba(12,12,14,0.85) 50%, rgba(223,255,0,0.1) 100%)
            `,
              boxShadow: `
              inset 0 0 40px rgba(255,255,255,0.15),
              inset 0 -20px 40px rgba(191,0,255,0.25),
              0 0 60px rgba(191,0,255,0.2),
              0 0 30px rgba(223,255,0,0.1)
            `,
              filter: "blur(0.2px)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              borderRadius: "inherit",
              border: "1px solid rgba(255,255,255,0.12)",
              background:
                "linear-gradient(120deg, rgba(255,255,255,0.06), transparent 60%)",
              mixBlendMode: "soft-light",
            }}
          />
        </div>

        {/* Floating nodes + trails */}
        {!reduce &&
          [
            { x: "12%", y: "18%", color: "lime" as const, delay: 0 },
            { x: "82%", y: "24%", color: "purple" as const, delay: 0.4 },
            { x: "20%", y: "78%", color: "purple" as const, delay: 0.2 },
            { x: "88%", y: "70%", color: "lime" as const, delay: 0.6 },
          ].map((n, i) => (
            <motion.span
              key={i}
              className="absolute h-2 w-2 rounded-full"
              style={{
                top: n.y,
                left: n.x,
                background:
                  n.color === "lime"
                    ? "radial-gradient(circle, #dfff00, rgba(223,255,0,0))"
                    : "radial-gradient(circle, #bf00ff, rgba(191,0,255,0))",
                boxShadow:
                  n.color === "lime"
                    ? "0 0 12px 2px rgba(223, 255, 0, 0.45)"
                    : "0 0 12px 2px rgba(191, 0, 255, 0.45)",
              }}
              initial={{ scale: 0.8, opacity: 0.6 }}
              animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
              transition={{
                duration: 4.2,
                delay: n.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}

        {/* Circular label — unique id avoids duplicate-id / hydration issues */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="h-full w-full max-w-[100%] overflow-visible"
            viewBox="0 0 200 200"
            aria-hidden
          >
            <defs>
              <path
                id={pathId}
                d="M 100,100 m -80,0 a 80,80 0 1,1 160,0 a 80,80 0 1,1 -160,0"
              />
            </defs>
            <g>
              {!reduce && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 100 100"
                  to="360 100 100"
                  dur="48s"
                  repeatCount="indefinite"
                />
              )}
              <text
                className="fill-zinc-400/90 font-mono uppercase [letter-spacing:0.28em]"
                style={{ fontSize: "6.2px" }}
              >
                <textPath href={`#${pathId}`} startOffset="0%">
                  {ORBIT_TEXT}
                </textPath>
              </text>
            </g>
          </svg>
        </div>

        {!reduce && (
          <p className="sr-only" aria-live="polite">
            Abstract code orb: backend, frontend, cloud, design, systems
          </p>
        )}

        {/* Center symbol */}
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <motion.div
            className="flex h-24 w-24 flex-col items-center justify-center rounded-full border border-white/20 bg-zinc-950/70 shadow-[0_0_32px_rgba(191,0,255,0.35),inset_0_0_20px_rgba(223,255,0,0.08)] backdrop-blur-md sm:h-28 sm:w-28"
            animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="font-mono text-2xl text-neon-purple [text-shadow:0_0_20px_rgba(191,0,255,0.7)] sm:text-3xl">
              &lt;/&gt;
            </span>
          </motion.div>
        </div>

        {/* Particles (tiny) */}
        {!reduce &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <motion.span
              key={`p-${i}`}
              className="absolute h-1 w-1 rounded-full bg-white/30"
              style={{ top: `${15 + i * 11}%`, left: `${(i * 13) % 100}%` }}
              animate={{ opacity: [0.1, 0.8, 0.1], y: [0, -4, 0] }}
              transition={{
                duration: 3.5,
                delay: i * 0.25,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}

        {/* Desktop / tablet: card floats at top-right of the orb (reference layout) */}
        <div className="absolute -right-0 top-2 z-20 hidden sm:block sm:-right-1 sm:top-4 lg:top-6">
          <CurrentVibeCard />
        </div>
      </div>

      {/* Mobile: same card, stacked under orb so it’s visible and on-layout */}
      <div className="z-20 mt-4 flex w-full justify-center px-1 sm:hidden">
        <CurrentVibeCard />
      </div>
    </div>
  );
}
