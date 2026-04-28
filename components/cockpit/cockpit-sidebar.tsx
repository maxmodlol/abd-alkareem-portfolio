"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Briefcase,
  Home,
  Layers,
  LineChart,
  MessageCircle,
  Sparkles,
  User,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

import { openCommandPalette } from "./cockpit-command-palette";
import { useActiveSection } from "./use-active-section";

const nav: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "projects", label: "Projects", icon: Layers },
  { id: "insights", label: "Insights", icon: LineChart },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "about", label: "About", icon: User },
  { id: "contact", label: "Contact", icon: MessageCircle },
];

function formatUptime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600) % 100;
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")} : ${String(m).padStart(2, "0")} : ${String(s).padStart(2, "0")}`;
}

function ElectronLogo() {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
      <motion.div
        className="absolute inset-0.5 rounded-full border border-neon-lime/25 bg-zinc-950/90 shadow-[0_0_22px_rgba(223,255,0,0.12),inset_0_0_20px_rgba(191,0,255,0.08)]"
        animate={
          reduce
            ? undefined
            : {
                boxShadow: [
                  "0 0 18px rgba(223,255,0,0.15), inset 0 0 16px rgba(191,0,255,0.1)",
                  "0 0 28px rgba(191,0,255,0.2), inset 0 0 20px rgba(223,255,0,0.1)",
                  "0 0 18px rgba(223,255,0,0.15), inset 0 0 16px rgba(191,0,255,0.1)",
                ],
              }
        }
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute inset-1.5 rounded-full border border-dashed border-neon-purple/35" />
        <div
          className="absolute left-1/2 top-0.5 h-2 w-2 -translate-x-1/2 rounded-full bg-neon-lime shadow-[0_0_10px_#dfff00,0_0_4px_rgba(191,0,255,0.5)]"
          aria-hidden
        />
      </motion.div>
      <div className="relative z-10 h-2.5 w-2.5 rounded-full bg-zinc-950 ring-2 ring-neon-purple/50 shadow-[0_0_12px_rgba(191,0,255,0.45)]" />
    </div>
  );
}

type CockpitSidebarProps = {
  className?: string;
  /** When false, show icon rail only */
  wide: boolean;
  onToggleWide: () => void;
};

export function CockpitSidebar({
  className,
  wide,
  onToggleWide,
}: CockpitSidebarProps) {
  const active = useActiveSection();
  const [seconds, setSeconds] = React.useState(0);
  const reduce = useReducedMotion();

  React.useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <aside
      className={cn(
        "cockpit-glass fixed left-0 top-0 z-30 hidden h-screen min-h-0 flex-col border-y-0 border-l-0 border-white/[0.12] py-4 shadow-[4px_0_32px_rgba(0,0,0,0.4)] transition-[width,min-width] duration-300 ease-out will-change-[width] lg:flex",
        wide
          ? "w-[4.75rem] min-w-[4.75rem] xl:w-56 xl:min-w-[14rem] xl:px-2.5"
          : "w-14 min-w-[3.5rem] max-w-[3.5rem] overflow-hidden",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-none before:border-r before:border-neon-lime/10 before:bg-gradient-to-b before:from-neon-lime/[0.04] before:via-transparent before:to-neon-purple/[0.05]",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full shrink-0 flex-col items-center gap-2 border-b border-white/[0.06] pb-3",
          wide && "xl:items-stretch",
        )}
      >
        <div
          className={cn(
            "flex w-full items-center gap-1.5 px-1",
            wide ? "justify-between xl:px-0" : "flex-col justify-center",
          )}
        >
          <ElectronLogo />
          <motion.button
            type="button"
            onClick={onToggleWide}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/90 text-zinc-400 transition hover:border-neon-lime/40 hover:text-neon-lime hover:shadow-[0_0_16px_rgba(223,255,0,0.12)]"
            title={wide ? "Narrow menu" : "Expand menu"}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            aria-label={wide ? "Narrow menu" : "Expand menu"}
          >
            {wide ? (
              <ChevronsLeft className="h-4 w-4" />
            ) : (
              <ChevronsRight className="h-4 w-4" />
            )}
          </motion.button>
        </div>

        {wide ? (
          <div className="hidden w-full items-center justify-center px-0 xl:flex">
            <button
              type="button"
              onClick={() => openCommandPalette()}
              className="inline-flex w-full max-w-full items-center justify-center gap-1 rounded-full border border-white/10 bg-zinc-950/90 px-2.5 py-1 font-mono text-[10px] text-zinc-400 transition hover:border-neon-lime/40 hover:text-neon-lime hover:shadow-[0_0_14px_rgba(223,255,0,0.12)]"
            >
              <span className="text-zinc-500">⌘ /</span> K
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openCommandPalette()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[11px] text-zinc-500 transition hover:border-neon-lime/30 hover:text-neon-lime"
            title="Command palette"
          >
            ⌘
          </button>
        )}
      </div>

      <nav
        className="cockpit-nav-no-scrollbar min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden py-2"
        aria-label="Primary"
      >
        {nav.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <Link
              key={item.id}
              href={`#${item.id}`}
              className={cn(
                "group relative mx-0.5 mb-1 flex items-center gap-2.5 rounded-2xl py-2.5 pl-0.5 transition-all",
                wide ? "xl:justify-start xl:px-2" : "justify-center",
                isActive
                  ? "text-zinc-50 [text-shadow:0_0_20px_rgba(223,255,0,0.35)]"
                  : "text-zinc-500 hover:text-zinc-100",
                !isActive && "hover:bg-white/[0.04] hover:shadow-[0_0_12px_rgba(191,0,255,0.08)]",
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-2xl border border-neon-lime/40 bg-gradient-to-r from-neon-lime/18 to-neon-purple/10 shadow-[0_0_28px_rgba(223,255,0,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              ) : null}
              <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center">
                <Icon
                  className={cn(
                    "h-4 w-4 transition-transform group-hover:scale-110",
                    isActive ? "text-neon-lime" : "text-inherit",
                  )}
                />
              </span>
              {wide ? (
                <span className="relative z-10 hidden min-w-0 text-[12px] font-medium tracking-tight text-zinc-200 xl:inline">
                  {item.label}
                </span>
              ) : null}
              {isActive && wide ? (
                <span
                  className="absolute -right-px top-1/2 z-20 hidden h-5 w-1 -translate-y-1/2 rounded-l-sm bg-gradient-to-b from-neon-lime to-neon-purple shadow-[0_0_10px_rgba(223,255,0,0.45)] xl:block"
                  aria-hidden
                />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-white/[0.07] pt-3">
        {wide ? (
          <div className="w-full max-w-full rounded-2xl border border-neon-lime/10 bg-zinc-950/70 p-2.5 text-center font-mono shadow-inner [box-shadow:inset_0_0_20px_rgba(191,0,255,0.06),0_0_20px_rgba(0,0,0,0.3)]">
            <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Uptime
            </p>
            <p className="mt-1.5 text-[11px] tabular-nums text-neon-lime [text-shadow:0_0_10px_rgba(223,255,0,0.3)] sm:text-xs">
              {formatUptime(seconds)}
            </p>
            <div
              className="mt-2.5 flex h-6 items-end justify-center gap-px overflow-hidden"
              aria-hidden
            >
              {Array.from({ length: 16 }, (_, i) => {
                const h = 22 + (i * 5) % 50;
                return (
                  <span
                    key={i}
                    className={cn(
                      "w-0.5 min-w-[2px] origin-bottom rounded-t bg-gradient-to-t from-neon-purple/50 to-neon-lime/90",
                      !reduce && "animate-uptime-bar",
                    )}
                    style={{
                      height: `${h}%`,
                      animationDelay: `${(i * 0.05).toFixed(2)}s`,
                    }}
                  />
                );
              })}
            </div>
            <p className="mt-1.5 flex items-center justify-center gap-1 text-[8px] text-zinc-500">
              <Activity className="h-2.5 w-2.5 text-neon-purple" />
              Live
            </p>
          </div>
        ) : (
          <div
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/70"
            title="System live"
          >
            <Activity className="h-3.5 w-3.5 text-neon-lime" />
          </div>
        )}

        {wide ? (
          <div className="flex justify-center">
            <Sparkles className="h-3.5 w-3.5 text-neon-lime/50" />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
