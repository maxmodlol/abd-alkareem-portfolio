"use client";

import type { ComponentType } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Code2, FlaskConical, Lightbulb } from "lucide-react";

import { Reveal } from "@/components/visual/reveal";
import { SectionShell } from "@/components/visual/section-shell";
import { TiltCard3D } from "@/components/visual/tilt-card-3d";
import { cn } from "@/lib/utils";

function LabCard({
  icon: Icon,
  kicker,
  body,
  iconClass,
}: {
  icon: ComponentType<{ className?: string }>;
  kicker: string;
  body: string;
  iconClass: string;
}) {
  const reduce = useReducedMotion();
  return (
    <Reveal eager>
      <TiltCard3D className="h-full" max={3}>
        <div className="cockpit-glass flex h-full flex-col justify-between rounded-3xl p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/60",
                  iconClass,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                {kicker}
              </h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              {body}
            </p>
          </div>
          <motion.p
            className="mt-4 font-mono text-[10px] text-zinc-600"
            initial={false}
            animate={reduce ? undefined : { opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            {"// sync · prototype · document · ship"}
          </motion.p>
        </div>
      </TiltCard3D>
    </Reveal>
  );
}

export function CockpitLabStubs() {
  return (
    <SectionShell id="insights" tone="default" className="border-0">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-4 md:grid-cols-3">
          <LabCard
            icon={FlaskConical}
            kicker="// experiments"
            body="A proving ground for APIs, data pipelines, UI prototypes, and edge-case work — the messy middle where ideas become something testable."
            iconClass="text-neon-lime [filter:drop-shadow(0_0_8px_rgba(223,255,0,0.3))]"
          />
          <LabCard
            icon={Code2}
            kicker="// codelab"
            body="Deep dives, snippets, and system sketches — the workshop where I iterate on architecture and developer ergonomics before the production cut."
            iconClass="text-neon-purple [filter:drop-shadow(0_0_8px_rgba(191,0,255,0.35))]"
          />
          <LabCard
            icon={Lightbulb}
            kicker="// insights"
            body="Practical notes on shipping SaaS, scaling backends, and designing interfaces that stay coherent when traffic and complexity go up together."
            iconClass="text-neon-lime/90"
          />
        </div>
      </div>
    </SectionShell>
  );
}
