"use client";

import * as React from "react";
import { Github, Linkedin, Mail } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/visual/reveal";

export function ContactSection() {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.4);
  const smx = useSpring(mx, { stiffness: 30, damping: 22 });
  const smy = useSpring(my, { stiffness: 30, damping: 22 });
  const glow = useMotionTemplate`radial-gradient(800px 420px at ${smx} ${smy}, rgba(6, 182, 212, 0.2), transparent 60%)`;

  const onMove = (e: React.MouseEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };

  return (
    <section
      id="contact"
      className="relative scroll-mt-28 overflow-hidden border-b border-white/[0.07] px-4 py-20 sm:px-6 sm:py-28"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/[0.06] via-cyan-500/[0.04] to-transparent"
        aria-hidden
      />
      <div
        ref={ref}
        onMouseMove={onMove}
        className="hero-border-shimmer relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/[0.1] bg-zinc-950/50 px-5 py-12 text-center shadow-[0_0_0_1px_rgba(6,182,212,0.1),0_30px_60px_-30px_rgba(0,0,0,0.75),0_0_80px_-20px_rgba(99,102,241,0.12)] backdrop-blur-xl sm:px-10 sm:py-16"
      >
        {!reduce && (
          <motion.div
            className="pointer-events-none absolute -inset-16 opacity-90"
            style={{ background: glow }}
            aria-hidden
          />
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-grid-fine opacity-20"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, rgba(255,255,255,0.04) 0%, transparent 40%, rgba(6,182,212,0.04) 100%)",
            mixBlendMode: "screen",
            opacity: 0.4,
          }}
          aria-hidden
        />
        <Reveal>
          <h2 className="relative text-balance text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl md:text-4xl">
            Looking for an engineer who can own real product features end to end?
          </h2>
        </Reveal>
        <div
          className="relative mx-auto mt-6 h-px max-w-md bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
          aria-hidden
        />
        <Reveal delay={0.06} className="relative mt-6">
          <p className="text-balance text-sm text-zinc-400 sm:text-base">
            I&apos;m open to remote roles, relocation opportunities, and
            product-focused teams building SaaS platforms, CRM systems, fintech
            tools, internal systems, integrations, or mobile products.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="relative mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <Button
            asChild
            size="lg"
            className="bg-cyan-500 text-zinc-950 shadow-[0_0_40px_rgba(6,182,212,0.35)] hover:bg-cyan-400"
          >
            <a href="mailto:kareemabualsoud8@gmail.com">
              <Mail className="h-4 w-4" />
              Email Me
            </a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="subtle"
            className="border-white/15 bg-white/[0.04] hover:bg-white/[0.08]"
          >
            <a
              href="https://www.linkedin.com/in/abd-alkareem-abu-alsoud-843738227/"
              target="_blank"
              rel="noreferrer"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="subtle"
            className="border-white/15 bg-white/[0.04] hover:bg-white/[0.08]"
          >
            <a
              href="https://github.com/maxmodlol"
              target="_blank"
              rel="noreferrer"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
