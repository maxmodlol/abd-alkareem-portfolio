import { Compass, LineChart, Puzzle, Target } from "lucide-react";

import { Reveal } from "@/components/visual/reveal";
import { SectionHeading } from "@/components/visual/section-heading";
import { SectionShell } from "@/components/visual/section-shell";
import { TiltCard3D } from "@/components/visual/tilt-card-3d";
import { cn } from "@/lib/utils";

const items = [
  {
    title: "API-first thinking",
    text: "I start from the data model, API contracts, and system boundaries before building the interface.",
    icon: Target,
  },
  {
    title: "Clean architecture",
    text: "I care about maintainable structure, readable code, and systems that can grow without becoming fragile.",
    icon: Compass,
  },
  {
    title: "Product ownership",
    text: "I like understanding the business problem, not just the ticket, so the solution actually fits the user flow.",
    icon: Puzzle,
  },
  {
    title: "Performance & reliability",
    text: "I focus on fast loading, stable APIs, secure communication, caching, and production-ready deployment.",
    icon: LineChart,
  },
] as const;

export function HowIWorkSection() {
  return (
    <SectionShell id="how-i-work" tone="deep">
      <div className="px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading
              eyebrow="Principles"
              title="How I work"
              titlePrefix
              description="A bento-style view of how I approach product engineering."
            />
          </Reveal>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2">
            {items.map((i, index) => {
              const Icon = i.icon;
              return (
                <li key={i.title}>
                  <Reveal delay={0.05 * index}>
                    <TiltCard3D max={4} className="h-full">
                      <div
                        className={cn(
                          "group relative h-full min-h-[9.5rem] overflow-hidden rounded-2xl border border-white/[0.1] p-5 sm:p-6",
                          "bg-gradient-to-br from-zinc-950/90 via-zinc-950/70 to-violet-950/20",
                          "shadow-[0_0_0_1px_rgba(6,182,212,0.08),0_20px_50px_-28px_rgba(0,0,0,0.65)]",
                          "hover:border-cyan-500/25",
                        )}
                      >
                        <div
                          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl transition group-hover:bg-cyan-500/15"
                          aria-hidden
                        />
                        <div className="flex items-start gap-3">
                          <div
                            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/15 to-violet-500/10 text-cyan-200 shadow-[0_0_24px_rgba(6,182,212,0.2)]"
                            aria-hidden
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold text-zinc-50 sm:text-lg">
                              {i.title}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                              {i.text}
                            </p>
                          </div>
                        </div>
                        <div
                          className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 opacity-40 mix-blend-screen"
                          style={{
                            background:
                              "linear-gradient(0deg, rgba(6,182,212,0.08) 0%, transparent 100%)",
                          }}
                          aria-hidden
                        />
                      </div>
                    </TiltCard3D>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </SectionShell>
  );
}
