"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink, Github, Terminal } from "lucide-react";

import { TiltCard3D } from "@/components/visual/tilt-card-3d";
import { cn } from "@/lib/utils";

const GITHUB = "https://github.com/maxmodlol";

const stack = [
  "TypeScript",
  "Next.js",
  "Node.js",
  "React",
  "Tailwind",
  "PostgreSQL",
  "Docker",
  "AWS",
] as const;

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
      {children}
    </h3>
  );
}

/** Mini GitHub-style contribution heatmap — reads as “activity” at a glance */
function GitHubActivityVisual() {
  const reduce = useReducedMotion();
  const levels = [
    0, 1, 2, 1, 3, 2, 1, 0, 2, 2, 3, 1, 0, 1, 2, 2, 1, 3, 2, 0, 1, 1, 2, 3, 0, 2, 1, 2, 1, 2,
  ] as const;
  const levelClass = (n: number) => {
    const c = [
      "bg-zinc-800/80",
      "bg-neon-lime/20",
      "bg-neon-lime/50",
      "bg-neon-lime/90 shadow-[0_0_6px_rgba(223,255,0,0.35)]",
    ];
    return c[n] ?? c[0];
  };
  return (
    <div
      className="relative flex h-[5.5rem] w-[5.5rem] shrink-0 flex-col justify-center overflow-hidden rounded-2xl border border-white/[0.12] bg-zinc-950/90 p-1.5 shadow-[inset_0_0_0_1px_rgba(191,0,255,0.12),0_0_20px_rgba(0,0,0,0.45)]"
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg, transparent, transparent 3px, rgba(191,0,255,0.4) 3px, rgba(191,0,255,0.4) 4px
          )`,
        }}
      />
      <div className="grid w-full flex-1 grid-cols-6 grid-rows-5 gap-0.5 pb-0.5">
        {levels.map((lev, i) => (
          <motion.span
            key={i}
            className={cn("rounded-[2px]", levelClass(lev))}
            initial={false}
            animate={reduce ? undefined : { opacity: [0.65, 1, 0.75, 1] }}
            transition={{
              duration: 2.2 + (i % 4) * 0.2,
              delay: (i % 6) * 0.12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** HUD frame + live “nodes” for the product being built */
function NowBuildingVisual() {
  const reduce = useReducedMotion();
  return (
    <div
      className="relative h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-2xl border border-white/[0.12] bg-zinc-950/95 shadow-[0_0_0_1px_rgba(223,255,0,0.1),0_0_24px_rgba(191,0,255,0.15),inset_0_0_32px_rgba(0,0,0,0.6)]"
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.2]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(223,255,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(191,0,255,0.12) 1px, transparent 1px)`,
          backgroundSize: "8px 8px",
        }}
      />
      <span className="absolute left-0.5 top-0.5 h-2.5 w-2.5 border-l-2 border-t-2 border-neon-lime/80" />
      <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 border-r-2 border-t-2 border-neon-purple/70" />
      <span className="absolute bottom-0.5 left-0.5 h-2.5 w-2.5 border-b-2 border-l-2 border-neon-purple/60" />
      <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 border-b-2 border-r-2 border-neon-lime/50" />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 64 64" className="h-[70%] w-[70%]" fill="none">
          <path
            d="M20 40 L32 22 L44 40 M32 22 L32 46"
            className="stroke-zinc-600/80"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {[
            [20, 40],
            [32, 22],
            [44, 40],
            [32, 46],
          ].map(([cx, cy], i) => (
            <motion.circle
              key={i}
              cx={cx}
              cy={cy}
              r="4.5"
              className="fill-zinc-900 stroke-neon-lime/70"
              strokeWidth="1.2"
              initial={false}
              animate={reduce ? undefined : { r: [4, 4.8, 4] }}
              transition={{ duration: 1.6, delay: i * 0.25, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </svg>
      </div>
      {!reduce && (
        <motion.div
          className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-neon-lime/50 to-transparent"
          animate={{ top: ["12%", "88%", "20%"] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

function TechPill({ children, i }: { children: React.ReactNode; i: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 bg-zinc-950/70 px-2.5 py-1 text-[10px] font-mono text-zinc-200",
        "shadow-[0_0_0_1px_rgba(191,0,255,0.08),0_0_12px_rgba(223,255,0,0.05)]",
      )}
      initial={false}
      animate={reduce ? undefined : { y: [0, -2, 0] }}
      transition={{ duration: 3.2, delay: i * 0.12, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.span>
  );
}

export function CockpitRightPanels() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5 lg:gap-3">
      <TiltCard3D max={5}>
        <div className="cockpit-glass rounded-3xl p-3 sm:p-4">
          <PanelTitle>{"// Now building"}</PanelTitle>
          <div className="mt-3 flex items-start gap-3.5">
            <NowBuildingVisual />
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-zinc-100 sm:text-base">
                Realtime Collaboration Platform
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Built with Next.js, Liveblocks, and a sprinkle of madness.
              </p>
            </div>
          </div>
          <Link
            href="#projects"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-neon-lime hover:underline"
          >
            Sneak Peek
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </TiltCard3D>

      <TiltCard3D max={5}>
        <div className="cockpit-glass rounded-3xl p-3 sm:p-4">
          <div className="flex items-start gap-4">
            <GitHubActivityVisual />
            <div className="min-w-0 flex-1">
              <PanelTitle>{"// GitHub activity"}</PanelTitle>
              <ul className="mt-2 space-y-1.5 text-xs text-zinc-300">
                <li className="flex justify-between gap-2">
                  <span className="text-zinc-500">Commits (month)</span>
                  <span className="font-mono text-neon-lime">142</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span className="text-zinc-500">PRs opened</span>
                  <span className="font-mono text-neon-lime">32</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span className="text-zinc-500">Issues solved</span>
                  <span className="font-mono text-neon-lime">28</span>
                </li>
              </ul>
            </div>
          </div>
          <a
            href={GITHUB}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-neon-purple [text-shadow:0_0_8px_rgba(191,0,255,0.35)]"
          >
            <Github className="h-4 w-4" />
            View GitHub
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </a>
        </div>
      </TiltCard3D>

      <TiltCard3D max={4}>
        <div className="cockpit-glass overflow-hidden rounded-3xl p-3 sm:p-4">
          <PanelTitle>{"// Tech stack"}</PanelTitle>
          <p className="mt-2 text-xs text-zinc-500">
            The usual suspects — tuned for real production systems.
          </p>
          <div
            className="relative mt-3 flex flex-wrap gap-1.5 rounded-2xl border border-white/5 bg-zinc-950/40 p-3"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(191,0,255,0.12), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(223,255,0,0.1), transparent)",
            }}
          >
            {stack.map((t, i) => (
              <TechPill key={t} i={i}>
                {t}
              </TechPill>
            ))}
          </div>
        </div>
      </TiltCard3D>

      <TiltCard3D max={4}>
        <div className="cockpit-glass rounded-3xl p-0 font-mono text-xs text-zinc-300">
          <div className="flex items-center gap-1.5 rounded-t-3xl border-b border-white/10 bg-zinc-900/80 px-3 py-2 text-[10px] text-zinc-500">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            <Terminal className="ml-auto h-3.5 w-3.5 text-zinc-600" />
          </div>
          <div className="space-y-2 p-3 sm:p-4">
            <p>
              <span className="text-neon-lime/90">&gt;</span> whoami
            </p>
            <p className="text-zinc-400 pl-2">
              Engineer. Problem solver. Builder.
            </p>
            <p>
              <span className="text-neon-lime/90">&gt;</span> currently
            </p>
            <p className="text-zinc-400 pl-2">
              Turning caffeine into code
              <span className="terminal-cursor" aria-hidden />
            </p>
          </div>
        </div>
      </TiltCard3D>
    </div>
  );
}
