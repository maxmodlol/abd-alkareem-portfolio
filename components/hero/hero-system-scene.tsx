"use client";

import * as React from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import {
  Activity,
  Cloud,
  Database,
  Forward,
  Globe,
  Server,
} from "lucide-react";

import { cn } from "@/lib/utils";

const TERMINAL_LINES = [
  "systems.online()",
  "building: SaaS / APIs / Integrations",
  "mobile: Flutter / Firebase",
  "cloud: Vercel / Cloudflare / AWS",
  "status: open_to_work",
] as const;

const MODULES: {
  id: string;
  label: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "api", label: "API Gateway", detail: "TLS · rate limits", icon: Forward },
  { id: "db", label: "Database", detail: "PostgreSQL", icon: Database },
  { id: "cache", label: "Redis", detail: "Sessions", icon: Server },
  { id: "dep", label: "Deploy", detail: "Vercel", icon: Activity },
  { id: "cloud", label: "Cloud", detail: "AWS", icon: Cloud },
  { id: "ops", label: "Monitoring", detail: "Operational", icon: Globe },
];

function ModuleChip({
  label,
  detail,
  icon: Icon,
  compact = false,
}: {
  label: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm",
        compact
          ? "min-h-0 gap-1 px-1.5 py-1"
          : "min-h-[3.25rem] gap-2 rounded-xl px-2.5 py-2",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md border border-cyan-500/20 bg-gradient-to-br from-cyan-500/15 to-violet-500/5 text-cyan-200",
          compact ? "h-6 w-6" : "h-9 w-9 rounded-lg",
        )}
      >
        <Icon className={compact ? "h-3 w-3" : "h-4 w-4"} aria-hidden />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p
          className={cn(
            "truncate font-mono uppercase leading-tight text-cyan-200/95",
            compact
              ? "text-[6.5px] tracking-[0.08em] sm:text-[7px]"
              : "text-[9px] tracking-[0.12em] sm:text-[10px]",
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "truncate text-zinc-500",
            compact ? "text-[6px] sm:text-[6.5px]" : "mt-0.5 text-[9px] sm:text-[10px]",
          )}
        >
          {detail}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]",
          compact ? "h-1 w-1" : "h-1.5 w-1.5",
        )}
        title="OK"
        aria-label="OK"
      />
    </div>
  );
}

function CornerBrackets() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <span className="absolute left-2 top-2 h-3 w-3 border-l-2 border-t-2 border-cyan-400/35" />
      <span className="absolute right-2 top-2 h-3 w-3 border-r-2 border-t-2 border-cyan-400/35" />
      <span className="absolute bottom-2 left-2 h-3 w-3 border-b-2 border-l-2 border-cyan-400/35" />
      <span className="absolute bottom-2 right-2 h-3 w-3 border-b-2 border-r-2 border-cyan-400/35" />
    </div>
  );
}

function CoreTerminal({
  lineCount,
  lightweight,
  className,
}: {
  lineCount: number;
  lightweight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative z-[1] w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-cyan-500/30 bg-zinc-950/85 p-2.5 shadow-[0_0_0_1px_rgba(6,182,212,0.2),0_0_40px_rgba(6,182,212,0.1),0_16px_40px_-16px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.07)] backdrop-blur-2xl sm:rounded-2xl sm:p-3",
        !lightweight && "hero-border-shimmer",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-scanlines opacity-[0.1]" />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-30",
          !lightweight && "hero-scan-sweep",
        )}
        aria-hidden
      />
      <CornerBrackets />
      <div className="relative z-10 mb-2 flex min-h-0 flex-wrap items-center gap-1.5 border-b border-white/10 pb-1.5 sm:mb-2 sm:pb-2">
        <div className="h-1.5 w-1.5 rounded-full bg-red-500/90" />
        <div className="h-1.5 w-1.5 rounded-full bg-amber-500/85" />
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/90" />
        <span className="ml-0.5 min-w-0 flex-1 font-mono text-[8px] uppercase leading-tight tracking-widest text-zinc-500 sm:text-[9px]">
          system.boot // secure channel
        </span>
        <span className="shrink-0 font-mono text-[7px] text-emerald-400/90 sm:text-[8px]">
          LIVE
        </span>
      </div>
      <div className="relative z-10 space-y-0.5 font-mono text-[9.5px] leading-relaxed text-cyan-100/90 sm:space-y-1 sm:text-[10.5px] lg:text-[11.5px] xl:text-xs">
        {TERMINAL_LINES.map((line, i) => (
          <p
            key={line}
            className="break-words transition duration-500"
            style={{
              opacity: i < lineCount ? 1 : 0.18,
              transform: i < lineCount ? "translateX(0)" : "translateX(-2px)",
            }}
          >
            <span className="text-cyan-400/90">&gt;</span>{" "}
            <span
              className={i === TERMINAL_LINES.length - 1 ? "text-emerald-300" : ""}
            >
              {line}
            </span>
          </p>
        ))}
      </div>
      <p className="relative z-10 mt-1.5 font-mono sm:mt-2" aria-hidden>
        <span className={cn("inline-block h-2.5 w-px bg-cyan-400", !lightweight && "animate-pulse")} />
      </p>
    </div>
  );
}

function VisionHeader({ reduce, lightweight }: { reduce: boolean; lightweight?: boolean }) {
  return (
    <div
      className="relative z-[2] mb-2 w-full text-left [perspective:800px] sm:mb-2.5"
      aria-hidden
    >
      <motion.div
        className="block w-full [transform-style:preserve-3d]"
        initial={false}
        animate={
          reduce || lightweight
            ? { rotateX: 0 }
            : { rotateX: [0, 1.5, 0, -1, 0] }
        }
        transition={{
          duration: 10,
          repeat: reduce || lightweight ? 0 : Infinity,
          ease: "easeInOut",
        }}
      >
        <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.16em] text-cyan-500/85 sm:mb-1.5 sm:text-[8.5px] sm:tracking-[0.18em]">
          Command core
        </p>
        <div className="select-none">
          <span
            className="block bg-gradient-to-b from-violet-300 via-cyan-200 to-emerald-300 bg-clip-text text-[1.75rem] font-black leading-[1.05] tracking-[-0.02em] text-transparent sm:text-[1.9rem] md:text-[2.05rem] lg:text-[2.1rem] xl:text-[2.25rem] 2xl:text-[2.4rem]"
            style={{ filter: "drop-shadow(0 0 20px rgba(139, 92, 246, 0.28))" }}
          >
            FULL-STACK
          </span>
        </div>
        <p className="mt-1 font-mono text-[7px] uppercase leading-tight text-zinc-500 sm:mt-1.5 sm:text-[8px] lg:text-[8.5px]">
          APIs · SaaS · product systems
        </p>
      </motion.div>
    </div>
  );
}

function MechBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]"
      aria-hidden
    >
      <div
        className="absolute left-1/2 top-[40%] h-[min(70%,12rem)] w-[min(70%,12rem)] -translate-x-1/2 -translate-y-1/2 sm:h-[min(75%,14rem)] sm:w-[min(75%,14rem)]"
        style={{ perspective: "500px" }}
      >
        <div className="hero-mech-ring-outer absolute inset-0 rounded-full border border-cyan-500/20 opacity-50" />
        <div className="hero-mech-ring-mid absolute inset-4 rounded-full border border-violet-500/15 opacity-50" />
        <div className="hero-mech-ring-rev absolute inset-10 rounded-full border border-dashed border-cyan-500/20 opacity-40" />
      </div>
      <div
        className="absolute -bottom-10 left-1/2 h-28 w-[130%] rounded-[100%] border border-cyan-500/10 bg-gradient-to-t from-cyan-500/10 to-transparent opacity-30"
        style={{ transform: "translateX(-50%) rotateX(68deg) scale(1.15)" }}
      />
    </div>
  );
}

function TiltLayer({
  children,
  disabled,
  className,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 64, damping: 20 });
  const sry = useSpring(ry, { stiffness: 64, damping: 20 });
  const t = useMotionTemplate`perspective(1100px) rotateX(${srx}deg) rotateY(${sry}deg)`;

  const onMove = (e: React.MouseEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 7);
    rx.set((0.5 - py) * 4);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  if (reduce || disabled) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      ref={ref}
      className={cn("transform-gpu [transform-style:preserve-3d]", className)}
      style={{ transform: t }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.div>
  );
}

/**
 * Cinematic “command core”: 3D vision title + terminal (no stacked overlays) + clean module grid.
 */
export function HeroSystemScene() {
  const reduce = useReducedMotion();
  const [lightweight, setLightweight] = React.useState(false);
  const lineCount = TERMINAL_LINES.length;
  const ref = React.useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.35);
  const smx = useSpring(mx, { stiffness: 28, damping: 24 });
  const smy = useSpring(my, { stiffness: 28, damping: 24 });
  const spotlight = useMotionTemplate`radial-gradient(560px 400px at ${smx} ${smy}, rgba(6, 182, 212, 0.12), transparent 50%)`;

  const onMove = (e: React.MouseEvent) => {
    if (reduce || lightweight || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };

  React.useEffect(() => {
    const media = window.matchMedia(
      "(max-width: 1024px), (pointer: coarse), (hover: none)",
    );
    const apply = () => setLightweight(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return (
    <div
      ref={ref}
      data-hero="system-scene"
      onMouseMove={onMove}
      className="relative w-full max-w-md min-h-0 overflow-x-clip py-0 lg:max-w-none"
    >
      <motion.div
        className="pointer-events-none absolute -inset-2 rounded-[1.5rem] blur-3xl sm:-inset-3"
        style={{ background: reduce || lightweight ? "none" : spotlight }}
        aria-hidden
      />
      <MechBackdrop />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-20"
        style={{ maskImage: "radial-gradient(ellipse 80% 70% at 50% 30%, black, transparent)" }}
        aria-hidden
      />
      <TiltLayer disabled={lightweight} className="relative z-10 w-full [transform-style:preserve-3d]">
        <div className="mx-auto flex min-h-0 w-full max-w-lg flex-col items-stretch sm:max-w-md lg:max-w-none">
          <VisionHeader reduce={Boolean(reduce)} lightweight={lightweight} />
          <div className="w-full min-w-0 px-0.5 sm:px-0">
            <CoreTerminal lineCount={lineCount} lightweight={lightweight} />
          </div>
          <div className="relative z-[2] mt-1.5 grid w-full min-h-0 grid-cols-2 gap-0.5 sm:mt-2 sm:grid-cols-3 sm:gap-1">
            {MODULES.map((m) => (
              <ModuleChip
                key={m.id}
                label={m.label}
                detail={m.detail}
                icon={m.icon}
                compact
              />
            ))}
          </div>
        </div>
      </TiltLayer>
    </div>
  );
}
