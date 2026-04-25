"use client";

import { ArrowRight, Download, Mail } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { HeroBackdrop } from "@/components/hero/hero-backdrop";
import { HeroDiveIntro } from "@/components/hero/hero-dive-intro";
import { HeroGlowBadge } from "@/components/hero/hero-glow-badge";
import { HeroProofChips } from "@/components/hero/hero-proof-chips";
import { HeroScrollHint } from "@/components/hero/hero-scroll-hint";
import { HeroSubheadlineTech } from "@/components/hero/hero-subheadline-tech";
import { HeroSystemScene } from "@/components/hero/hero-system-scene";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.2, 0.85, 0.22, 1];

const item = (delay: number) => ({
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, delay, ease: EASE },
  },
});

const backdropFade = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.28, ease: "easeOut" as const },
  },
};

export function HeroSection() {
  const reduce = useReducedMotion();

  const rightColumn = (
    <div className="relative flex min-h-0 w-full max-w-lg min-w-0 max-h-full flex-col justify-start self-stretch justify-self-stretch overflow-x-clip overflow-y-hidden lg:max-w-none">
      <div
        className="pointer-events-none absolute -inset-4 -z-10 opacity-60 blur-3xl sm:-inset-6"
        style={{
          background:
            "radial-gradient(closest-side at 50% 55%, rgba(6,182,212,0.14), transparent 72%)",
        }}
        aria-hidden
      />
      <div className="relative max-h-full min-h-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-950/35 p-2.5 shadow-[0_0_0_1px_rgba(6,182,212,0.06),inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:rounded-3xl sm:p-3 lg:p-4 lg:max-h-full">
        <HeroDiveIntro>
          <HeroSystemScene />
        </HeroDiveIntro>
      </div>
    </div>
  );

  if (reduce) {
    return (
      <section
        id="top"
        className="relative min-h-[100svh] overflow-x-clip border-b border-white/[0.06] scroll-smooth lg:min-h-0 lg:h-[calc(100svh-5.5rem)] lg:max-h-[calc(100svh-5.5rem)] lg:overflow-y-hidden"
      >
        <HeroBackdrop />
        <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[100rem] flex-1 flex-col content-stretch justify-center gap-2 px-4 py-3 sm:gap-3 sm:px-5 sm:py-4 md:px-6 lg:h-full lg:max-h-full lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-6 lg:px-8 lg:py-5 xl:gap-8 xl:px-10 2xl:px-12">
          <div className="min-h-0 min-w-0 w-full max-w-full self-stretch lg:max-h-full">
            <HeroLeftStatic />
          </div>
          {rightColumn}
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex justify-center pb-2 sm:pb-2.5 lg:pb-1.5 [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto">
            <HeroScrollHint href="#projects" className="max-lg:scale-95 lg:scale-90" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="top"
      className="relative min-h-[100svh] overflow-x-clip border-b border-white/[0.06] scroll-smooth lg:min-h-0 lg:h-[calc(100svh-5.5rem)] lg:max-h-[calc(100svh-5.5rem)] lg:overflow-y-hidden"
    >
      <motion.div
        initial="hidden"
        animate="show"
        variants={backdropFade}
        className="absolute inset-0 -z-0"
      >
        <HeroBackdrop />
      </motion.div>
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-0 h-px max-w-[100rem] mx-auto bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[100rem] flex-1 flex-col content-stretch justify-center gap-2 px-4 py-3 sm:gap-3 sm:px-5 sm:py-4 md:px-6 lg:h-full lg:max-h-full lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-6 lg:px-8 lg:py-5 xl:gap-8 xl:px-10 2xl:px-12">
        <div className="flex min-h-0 min-w-0 w-full max-w-none flex-col lg:h-full lg:min-h-0 lg:justify-between lg:gap-4 lg:pr-1">
          <div className="space-y-1.5 sm:space-y-2.5 lg:space-y-3">
            <motion.div variants={item(0)} initial="hidden" animate="show">
              <HeroGlowBadge>
                Open to remote &amp; relocation opportunities
              </HeroGlowBadge>
            </motion.div>
            <motion.h1
              variants={item(0.04)}
              initial="hidden"
              animate="show"
              className="text-balance text-[1.45rem] font-semibold leading-[1.1] tracking-[-0.02em] text-zinc-50 sm:text-[1.5rem] md:text-[1.65rem] lg:text-[1.85rem] lg:leading-[1.08] xl:text-[2rem] xl:leading-[1.07] 2xl:text-[2.1rem]"
            >
              <span className="text-gradient">Backend-leaning full-stack</span>{" "}
              <span>engineer building SaaS platforms, APIs, and web/mobile products.</span>
            </motion.h1>
            <motion.div variants={item(0.24)} initial="hidden" animate="show" className="min-h-0">
              <HeroSubheadlineTech className="text-sm leading-[1.65] text-zinc-400/95 sm:text-base sm:leading-[1.62] lg:line-clamp-none lg:max-w-none lg:text-[1.05rem] lg:leading-[1.6] xl:max-w-[48rem] xl:text-[1.1rem] 2xl:text-[1.12rem]" />
            </motion.div>
            <motion.div
              variants={item(0.12)}
              initial="hidden"
              animate="show"
              className="pt-0"
            >
              <HeroProofChips className="gap-1.5 sm:gap-2.5 [&>li>span]:px-3 [&>li>span]:py-1.5 [&>li>span]:text-[10px] sm:[&>li>span]:text-xs" />
            </motion.div>
          </div>
          <div className="mt-4 space-y-2.5 sm:mt-5 lg:mt-0">
            <motion.div
              variants={item(0.16)}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-2 pt-0.5 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <Button
                asChild
                size="default"
                className={cn(
                  "h-10 border-0 bg-gradient-to-r from-cyan-500 via-cyan-400 to-violet-600 px-5 text-sm text-zinc-950 sm:h-11 sm:px-6 sm:text-base",
                  "shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_32px_rgba(6,182,212,0.22)]",
                  "transition hover:brightness-110",
                )}
              >
                <a href="#projects">
                  View Projects
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </a>
              </Button>
              <Button
                asChild
                size="default"
                variant="subtle"
                className="h-10 border border-cyan-500/20 bg-white/[0.04] px-5 text-sm text-zinc-100 shadow-[0_0_20px_rgba(6,182,212,0.06)] backdrop-blur-sm hover:border-cyan-500/30 hover:bg-white/[0.08] sm:h-11 sm:px-6 sm:text-base"
              >
                <a href="#contact" className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4 text-cyan-300/80 sm:h-5 sm:w-5" />
                  Contact Me
                </a>
              </Button>
              <Button
                asChild
                size="default"
                variant="subtle"
                className="h-10 border border-white/12 bg-white/[0.03] px-5 text-sm text-zinc-200 sm:h-11 sm:px-6 sm:text-base"
              >
                <a
                  href="/cv.pdf"
                  download
                  className="inline-flex items-center gap-2"
                >
                  <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                  Download CV
                </a>
              </Button>
            </motion.div>
            <motion.div
              variants={item(0.2)}
              initial="hidden"
              animate="show"
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-normal text-zinc-500/95 sm:gap-x-2.5"
            >
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                  aria-hidden
                />
                Palestine
              </span>
              <span className="h-1 w-1 rounded-full bg-zinc-600" aria-hidden />
              <span>Remote / relocation</span>
              <span className="h-1 w-1 rounded-full bg-zinc-600" aria-hidden />
              <span className="text-emerald-400/90">Open to work</span>
            </motion.div>
          </div>
        </div>
        {rightColumn}
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex justify-center pb-2 sm:pb-2.5 lg:pb-1.5 [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))]">
        <motion.div
          className="pointer-events-auto"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.35, ease: EASE }}
        >
          <HeroScrollHint href="#projects" className="max-lg:scale-95 lg:scale-90" />
        </motion.div>
      </div>
    </section>
  );
}

function HeroLeftStatic() {
  return (
    <div className="flex min-h-0 min-w-0 w-full max-w-none flex-col lg:h-full lg:min-h-0 lg:justify-between lg:gap-4 lg:pr-1">
      <div className="space-y-1.5 sm:space-y-2.5 lg:space-y-3">
        <HeroGlowBadge>Open to remote &amp; relocation opportunities</HeroGlowBadge>
        <h1 className="text-balance text-[1.45rem] font-semibold leading-[1.1] text-zinc-50 sm:text-[1.5rem] md:text-[1.65rem] lg:text-[1.85rem] xl:text-[2rem] 2xl:text-[2.1rem]">
          <span className="text-gradient">Backend-leaning full-stack</span>{" "}
          <span>engineer building SaaS platforms, APIs, and web/mobile products.</span>
        </h1>
        <HeroSubheadlineTech className="text-sm leading-[1.65] sm:text-base sm:leading-[1.62] lg:max-w-none lg:text-[1.05rem] xl:max-w-[48rem] xl:text-[1.1rem] 2xl:text-[1.12rem]" />
        <HeroProofChips className="gap-1.5 sm:gap-2.5 [&>li>span]:px-3 [&>li>span]:py-1.5 [&>li>span]:text-[10px] sm:[&>li>span]:text-xs" />
      </div>
      <div className="mt-4 space-y-2.5 sm:mt-5 lg:mt-0">
        <div className="flex flex-col gap-2 pt-0.5 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            asChild
            size="default"
            className="h-10 border-0 bg-gradient-to-r from-cyan-500 to-violet-600 px-5 text-sm text-zinc-950 shadow-[0_0_32px_rgba(6,182,212,0.22)] hover:brightness-110 sm:h-11 sm:px-6 sm:text-base"
          >
            <a href="#projects">
              View Projects
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </a>
          </Button>
          <Button
            asChild
            size="default"
            variant="subtle"
            className="h-10 border-cyan-500/20 px-5 text-sm sm:h-11 sm:px-6 sm:text-base"
          >
            <a href="#contact" className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
              Contact Me
            </a>
          </Button>
          <Button
            asChild
            size="default"
            variant="subtle"
            className="h-10 border-white/12 px-5 text-sm sm:h-11 sm:px-6 sm:text-base"
          >
            <a href="/cv.pdf" download className="inline-flex items-center gap-2">
              <Download className="h-4 w-4 sm:h-5 sm:w-5" />
              Download CV
            </a>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
          <span>🇵🇸 Palestine</span>
          <span>·</span>
          <span>Remote / relocation</span>
          <span>·</span>
          <span className="text-emerald-400/90">Open to work</span>
        </div>
      </div>
    </div>
  );
}
