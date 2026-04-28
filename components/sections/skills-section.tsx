import {
  Cloud,
  Code2,
  Database,
  Layers,
  MessageSquare,
  Smartphone,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/visual/reveal";
import { SectionHeading } from "@/components/visual/section-heading";
import { SectionShell } from "@/components/visual/section-shell";
import { TiltCard3D } from "@/components/visual/tilt-card-3d";
import { cn } from "@/lib/utils";

const groups = [
  {
    title: "Backend",
    icon: Code2,
    items: ["Node.js", "NestJS", "Spring Boot", "REST APIs", "Prisma"],
  },
  {
    title: "Frontend",
    icon: Layers,
    items: [
      "React",
      "Next.js",
      "TypeScript",
      "Angular",
      "Tailwind CSS",
      "shadcn/ui",
    ],
  },
  {
    title: "Databases & Messaging",
    icon: Database,
    items: ["PostgreSQL", "MongoDB", "Redis", "RabbitMQ"],
  },
  {
    title: "Mobile",
    icon: Smartphone,
    items: ["Flutter", "Firebase", "React Native"],
  },
  {
    title: "Cloud & DevOps",
    icon: Cloud,
    items: [
      "Cloudflare",
      "Vercel",
      "AWS S3",
      "Docker",
      "Plesk",
      "CI/CD",
    ],
  },
  {
    title: "Architecture & Integrations",
    icon: MessageSquare,
    items: [
      "SaaS",
      "Multi-tenant systems",
      "CRM integrations",
      "Webhooks",
      "JWT SSO",
      "API design",
      "iframe dashboards",
    ],
  },
] as const;

export function SkillsSection() {
  return (
    <SectionShell id="skills" tone="hero">
      <div className="px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading
              title="Skills & Technologies"
              titlePrefix
              description="Grouped by how I ship: APIs, surfaces, data, and cloud."
            />
          </Reveal>
          <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g, i) => {
              const Icon = g.icon;
              return (
                <li key={g.title}>
                  <Reveal delay={0.04 * i}>
                    <TiltCard3D max={4} className="h-full">
                      <Card
                        className={cn(
                          "group h-full border-white/[0.1] bg-zinc-950/50 transition",
                          "shadow-[0_0_0_1px_rgba(6,182,212,0.06),0_16px_40px_-20px_rgba(0,0,0,0.6)]",
                          "hover:border-neon-lime/20 hover:shadow-[0_0_0_1px_rgba(223,255,0,0.12),0_20px_50px_-20px_rgba(0,0,0,0.72)]",
                        )}
                      >
                        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-neon-lime/25 bg-gradient-to-br from-neon-lime/20 to-neon-purple/10 text-neon-lime/90 shadow-[0_0_24px_rgba(223,255,0,0.15)]"
                            aria-hidden
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <CardTitle className="text-base sm:text-lg">
                            {g.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-1.5">
                            {g.items.map((s) => (
                              <Badge
                                key={s}
                                variant="muted"
                                className="border-white/10 text-[10px] font-normal text-zinc-300 sm:text-xs"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
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
