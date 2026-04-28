"use client";

import { ExternalLink } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { ProjectMockVisual } from "@/components/projects/project-mock-visuals";
import { Reveal } from "@/components/visual/reveal";
import { SectionHeading } from "@/components/visual/section-heading";
import { SectionShell } from "@/components/visual/section-shell";
import { TiltCard3D } from "@/components/visual/tilt-card-3d";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const projects = [
  {
    title: "CRM Platform for Financial Brokers",
    category: "CRM / SaaS",
    description:
      "Multi-tenant CRM with lead management, commissions, reports, integrations, and real-time dashboards.",
    tech: [
      "Next.js",
      "Prisma",
      "PostgreSQL",
      "NextAuth",
      "Firebase",
      "Gemini",
      "Webhooks",
    ],
    mock: "crm" as const,
  },
  {
    title: "Multi-Tenant Blog & CMS Platform",
    category: "SaaS / CMS",
    description:
      "Multi-tenant CMS with custom domains, role-based access, tenant workflows, SEO, CDN, and Google Ads integration.",
    tech: [
      "Next.js",
      "PostgreSQL",
      "Cloudflare",
      "Plesk",
      "ISR",
      "CDN",
      "Google Ads",
    ],
    mock: "cms" as const,
  },
  {
    title: "Freelance Mobile Product Work",
    category: "Mobile / Freelance",
    description:
      "Cross-platform mobile apps with clean UI/UX, backend integration, booking flows, real-time updates, and geolocation features.",
    tech: [
      "Flutter",
      "Firebase",
      "MongoDB",
      "REST APIs",
      "Geolocation",
      "Real-time Updates",
    ],
    mock: "mobile" as const,
  },
] as const;

export function ProjectsSection() {
  const reduce = useReducedMotion();

  return (
    <SectionShell id="projects" className="relative" tone="hero">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-neon-lime/[0.04] to-transparent"
        aria-hidden
      />
      <div className="px-4 py-20 sm:px-6 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading
              title="Featured Projects"
              titlePrefix
              description="Product-grade snapshots: interface mock, scope, and stack — built to read like a serious engineering portfolio."
            />
          </Reveal>
          <div className="mt-12 -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pl-1 pr-4 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {projects.map((p, index) => (
              <div
                key={p.title}
                className="w-[min(100%,22rem)] shrink-0 snap-center first:pl-0 sm:w-auto sm:pl-0 sm:first:pl-0"
              >
                <Reveal delay={0.05 * index} className="h-full">
                  <TiltCard3D max={5} className="h-full">
                    <div
                      className={cn(
                        "group relative flex h-full min-h-full flex-col overflow-hidden rounded-2xl",
                        "border border-white/[0.1] bg-zinc-950/55 shadow-[0_0_0_1px_rgba(6,182,212,0.07),0_24px_60px_-28px_rgba(0,0,0,0.75)] backdrop-blur-md",
                        "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-neon-lime/8 before:via-transparent before:to-neon-purple/6 before:opacity-0 before:transition before:duration-500 group-hover:before:opacity-100",
                        "hover:border-neon-lime/25 hover:shadow-[0_0_0_1px_rgba(223,255,0,0.12),0_32px_64px_-32px_rgba(0,0,0,0.85)]",
                      )}
                    >
                      <div className="relative aspect-[16/11] w-full min-h-[160px] sm:min-h-[180px]">
                        <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
                          <motion.div
                            className="h-full w-full"
                            whileHover={reduce ? undefined : { scale: 1.02 }}
                            transition={{ duration: 0.45 }}
                          >
                            <ProjectMockVisual
                              variant={p.mock}
                              className="h-full min-h-[160px]"
                            />
                          </motion.div>
                        </div>
                        <div
                          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/25 to-transparent"
                          aria-hidden
                        />
                        <Badge
                          variant="tech"
                          className="absolute left-3 top-3 border-neon-lime/25 bg-zinc-950/80 text-[10px] text-neon-lime/90 backdrop-blur"
                        >
                          {p.category}
                        </Badge>
                        <a
                          href="#contact"
                          className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-zinc-950/80 text-zinc-400 backdrop-blur transition hover:border-neon-lime/30 hover:text-neon-lime"
                          aria-label="Get in touch"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                        <h3 className="text-lg font-semibold leading-snug tracking-tight text-zinc-50 sm:text-xl">
                          {p.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-zinc-400">
                          {p.description}
                        </p>
                        <div className="mt-auto flex flex-wrap gap-1.5">
                          {p.tech.map((t) => (
                            <Badge
                              key={t}
                              variant="tech"
                              className="text-[10px] font-medium sm:text-[11px]"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          asChild
                          variant="glow"
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          <a href="mailto:kareemabualsoud8@gmail.com">
                            Discuss this project
                          </a>
                        </Button>
                      </div>
                    </div>
                  </TiltCard3D>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
