"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Waves } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function LiquidButton({
  href,
  children,
  variant = "lime",
  className,
  onClick,
}: {
  href: string;
  children: ReactNode;
  variant?: "lime" | "ghost";
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <motion.div
      className="inline-flex w-full min-w-0 sm:min-w-[7.5rem] sm:flex-1"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        href={href}
        onClick={onClick}
        scroll={false}
        className={cn(
          "group relative inline-flex w-full items-center justify-center gap-1.5 overflow-hidden rounded-full border px-3.5 py-2 text-[12px] font-semibold leading-snug transition sm:gap-2 sm:px-4 sm:py-2 sm:text-[13px] lg:gap-2.5 lg:px-5 lg:py-2.5 lg:text-sm lg:font-semibold",
          variant === "lime" &&
            "border-neon-lime/45 bg-neon-lime text-zinc-950 shadow-[0_0_16px_rgba(223,255,0,0.18),inset_0_1px_0_rgba(255,255,255,0.35)] hover:shadow-[0_0_26px_rgba(223,255,0,0.35)]",
          variant === "ghost" &&
            "border-white/12 bg-zinc-950/70 text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-neon-purple/35 hover:text-white",
          className,
        )}
      >
        {variant === "lime" ? (
          <span
            className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100"
            style={{
              background:
                "linear-gradient(110deg, transparent, rgba(255,255,255,0.28), transparent)",
            }}
          />
        ) : null}
        {children}
      </Link>
    </motion.div>
  );
}

export function CockpitHero({ id = "overview" }: { id?: string }) {
  const reduce = useReducedMotion();

  return (
    <header
      id={id}
      className="relative flex w-full max-w-full flex-col scroll-mt-24 lg:max-w-none lg:scroll-mt-8"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500 sm:text-[11px] sm:tracking-[0.32em] lg:text-xs lg:tracking-[0.28em] xl:text-[13px]">
        Abd Alkareem Abu-Alsoud
      </p>
      <p className="mt-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.45em] text-neon-lime [text-shadow:0_0_14px_rgba(223,255,0,0.3)] sm:mt-2 sm:text-xs sm:tracking-[0.5em] lg:text-sm lg:tracking-[0.42em] xl:text-base">
        Full Stack Engineer
      </p>

      <h1 className="mt-3.5 w-full max-w-[22rem] font-display text-[clamp(1.2rem,2.2vw+0.55rem,1.95rem)] font-extrabold leading-[1.05] tracking-tight text-zinc-50 sm:mt-4 sm:max-w-[28rem] lg:mt-5 lg:max-w-none lg:text-[clamp(1.5rem,1.35vw+0.85rem,2.15rem)] lg:leading-[1.08] xl:mt-6 xl:text-[clamp(1.65rem,1.25vw+0.9rem,2.75rem)]">
        <span className="block">I BUILD DIGITAL</span>
        <span className="relative mt-1 inline-block sm:mt-1 lg:mt-1.5">
          <span
            className="bg-gradient-to-r from-neon-lime via-[#eeff66] to-neon-lime bg-clip-text text-transparent [filter:drop-shadow(0_0_18px_rgba(223,255,0,0.3))]"
            style={{
              WebkitTextStroke: "0.5px rgba(223,255,0,0.12)",
            }}
          >
            EXPERIENCES
          </span>
          {!reduce && (
            <span
              className="pointer-events-none absolute -inset-1.5 -z-10 rounded-lg opacity-35 mix-blend-screen blur-sm"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(223,255,0,0.3), transparent 70%)",
              }}
              aria-hidden
            />
          )}
        </span>
        <span className="mt-1 block sm:mt-1 lg:mt-1.5">THAT BREAK</span>
        <span className="relative mt-1 inline-block sm:mt-1 lg:mt-1.5">
          <span
            className="bg-gradient-to-r from-neon-purple via-fuchsia-400 to-neon-purple bg-clip-text text-transparent [filter:drop-shadow(0_0_20px_rgba(191,0,255,0.4))]"
            style={{
              WebkitTextStroke: "0.5px rgba(191,0,255,0.1)",
            }}
          >
            THE ORDINARY
          </span>
        </span>
      </h1>

      <p className="mt-4 max-w-md text-[13px] leading-relaxed text-zinc-400 sm:mt-5 sm:text-sm lg:mt-6 lg:max-w-none lg:text-base lg:leading-[1.65] xl:mt-7 xl:max-w-[40ch] xl:text-[1.05rem]">
        Crafting scalable systems, delightful interfaces and developer experiences
        from idea to infinity and beyond.
      </p>

      <div className="mt-5 flex w-full min-w-0 max-w-md flex-col gap-3 sm:mt-6 sm:max-w-none sm:flex-row sm:items-stretch sm:gap-3.5 lg:mt-8 lg:gap-4">
        <LiquidButton
          href="#projects"
          variant="lime"
          onClick={(e) => {
            e.preventDefault();
            scrollToId("projects");
          }}
        >
          <span className="whitespace-nowrap">View work</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
        </LiquidButton>
        <LiquidButton
          href="#contact"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault();
            scrollToId("contact");
          }}
        >
          <Waves className="h-3.5 w-3.5 shrink-0 text-neon-purple sm:h-4 sm:w-4" />
          <span className="whitespace-nowrap">Connect</span>
        </LiquidButton>
      </div>
    </header>
  );
}
