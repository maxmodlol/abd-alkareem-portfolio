import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/visual/section-heading";
import { SectionShell } from "@/components/visual/section-shell";
import { TiltCard3D } from "@/components/visual/tilt-card-3d";

const experiences = [
  {
    org: "VillageWellth CRM / RaySolution",
    role: "Full-Stack Developer",
    date: "Jun 2025 – Aug 2025",
    bullets: [
      "Built and maintained a CRM platform for financial brokers using Next.js, Prisma, and NextAuth.",
      "Integrated AI-driven pipelines using Firebase and Gemini for automated client data extraction and insights.",
      "Designed webhook-based APIs to normalize and ingest third-party CRM data.",
      "Implemented JWT-based SSO and iframe-embeddable dashboards for secure external access.",
    ],
    tech: [
      "Next.js",
      "Prisma",
      "NextAuth",
      "Firebase",
      "Gemini",
      "PostgreSQL",
      "JWT",
      "Webhooks",
    ],
  },
  {
    org: "Multi-Tenant Blog Platform",
    role: "Freelance Full-Stack Developer",
    date: "Feb 2025 – Jun 2025",
    bullets: [
      "Designed and built a multi-tenant SSR blog platform using Next.js and PostgreSQL.",
      "Implemented tenant isolation, role-based CMS features, custom themes, and content workflows.",
      "Automated domain provisioning, wildcard SSL, and deployment workflows using Cloudflare and Plesk.",
      "Improved SEO and performance using ISR caching, CDN optimization, and production-focused configuration.",
    ],
    tech: [
      "Next.js",
      "PostgreSQL",
      "Cloudflare",
      "Plesk",
      "ISR",
      "CDN",
      "Google Ads",
    ],
  },
  {
    org: "Psycode IO",
    role: "Full-Stack Developer",
    date: "Feb 2024 – Jan 2025",
    bullets: [
      "Built backend and frontend features for POS and internal business systems.",
      "Developed REST APIs using Node.js and Java Spring Boot.",
      "Implemented authentication, validation layers, and secure API communication.",
      "Built responsive Next.js interfaces based on Figma designs.",
      "Worked on Shopify projects using Liquid and customized storefront features.",
    ],
    tech: [
      "Node.js",
      "Java Spring Boot",
      "Next.js",
      "PostgreSQL",
      "Shopify Liquid",
      "REST APIs",
    ],
  },
  {
    org: "SGSoft SAS",
    role: "Full-Stack Developer",
    date: "Sep 2022 – Sep 2023",
    bullets: [
      "Developed backend services using NestJS and REST APIs within a microservices architecture.",
      "Integrated AWS S3 for secure file storage and asset management.",
      "Used RabbitMQ for asynchronous processing and event-driven communication.",
      "Built reusable Angular components shared across internal systems.",
    ],
    tech: [
      "NestJS",
      "Angular",
      "AWS S3",
      "RabbitMQ",
      "MongoDB",
      "REST APIs",
    ],
  },
] as const;

export function ExperienceSection() {
  return (
    <SectionShell id="experience" tone="deep">
      <div className="px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div>
            <SectionHeading
              eyebrow="Track record"
              title="Experience"
              titlePrefix
              description="Production work across CRM platforms, multi-tenant systems, and business-critical backends."
            />
          </div>
          <div className="relative mt-12 sm:pl-10">
            <div
              className="absolute left-[15px] top-3 h-[calc(100%-0.5rem)] w-px sm:left-[23px]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(223, 255, 0, 0.45) 0%, rgba(191, 0, 255, 0.25) 50%, rgba(223, 255, 0, 0.12) 100%)",
                boxShadow: "0 0 32px rgba(191, 0, 255, 0.2)",
              }}
              aria-hidden
            />
            <ol className="space-y-10">
              {experiences.map((exp) => (
                <li key={exp.org + exp.date} className="relative pl-9 sm:pl-12">
                  <div
                    className="absolute left-0 top-2 z-[1] flex h-7 w-7 items-center justify-center rounded-full border border-neon-lime/40 bg-zinc-950 shadow-[0_0_0_1px_rgba(223,255,0,0.3),0_0_20px_rgba(191,0,255,0.25)] sm:left-1.5"
                    aria-hidden
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-neon-lime" />
                  </div>
                  <TiltCard3D max={4} className="w-full">
                    <Card className="border-white/[0.08] bg-zinc-950/50 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_40px_-20px_rgba(0,0,0,0.55)] backdrop-blur">
                      <CardHeader className="border-b border-white/[0.06] pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div>
                          <p className="font-mono text-xs text-neon-lime/85 sm:text-sm">
                            {exp.org}
                          </p>
                          <CardTitle className="mt-1.5 text-lg sm:text-xl">
                            {exp.role}
                          </CardTitle>
                        </div>
                        <p className="shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-xs text-zinc-400 sm:text-sm">
                          {exp.date}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-5">
                        <ul className="space-y-2.5 text-sm leading-relaxed text-zinc-400">
                          {exp.bullets.map((b) => (
                            <li key={b} className="flex gap-2.5">
                              <span
                                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neon-lime/80 ring-1 ring-neon-lime/30"
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1">{b}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap gap-1.5">
                          {exp.tech.map((t) => (
                            <Badge
                              key={t}
                              variant="tech"
                              className="text-[10px] font-normal sm:text-xs"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TiltCard3D>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
