import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/visual/reveal";
import { SectionHeading } from "@/components/visual/section-heading";
import { SectionShell } from "@/components/visual/section-shell";
import { TiltCard3D } from "@/components/visual/tilt-card-3d";
import { cn } from "@/lib/utils";

const highlights = [
  { label: "3+ Years Experience", tone: "lime" as const },
  { label: "SaaS / CRM / APIs", tone: "violet" as const },
  { label: "Web + Mobile Products", tone: "emerald" as const },
  { label: "Remote & Relocation", tone: "sky" as const },
] as const;

const toneLine = {
  lime: "from-neon-lime/50 to-neon-lime/0",
  violet: "from-neon-purple/50 to-neon-purple/0",
  emerald: "from-emerald-500/50 to-emerald-500/0",
  sky: "from-sky-500/50 to-sky-500/0",
} as const;

export function AboutSection() {
  return (
    <SectionShell id="about" tone="default">
      <div className="px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading
              title="Engineering real products, not just interfaces."
              titlePrefix
            />
          </Reveal>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <Reveal delay={0.05} className="space-y-4 text-sm text-zinc-400 sm:text-base">
              <p>
                Full-stack software engineer with 3+ years of professional
                experience designing, building, and maintaining production-grade
                SaaS platforms, CRM systems, APIs, integrations, and internal
                business systems—strong across backend architecture, API design,
                data modeling, scalable frontend delivery, cloud workflows, and
                product-focused engineering.
              </p>
              <p>
                I&apos;m Abd Alkareem, from{" "}
                <span className="text-zinc-200">Palestine</span>, focused on
                reliable production systems. My work sits between backend
                architecture, product delivery, and business needs: SaaS
                platforms, CRM tools, integrations, dashboards, authentication,
                and systems that stay maintainable and scalable.
              </p>
              <p>
                Alongside web platforms, I&apos;ve delivered freelance mobile
                products using Flutter, Firebase, MongoDB, and backend
                integrations — booking systems, location-aware apps, rental
                platforms, and healthcare-oriented workflows.
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <TiltCard3D max={4} className="h-full">
                <Card
                  className={cn(
                    "h-full overflow-hidden border-neon-lime/15 bg-zinc-950/60",
                    "bg-gradient-to-br from-neon-lime/5 via-zinc-950/80 to-neon-purple/5",
                    "shadow-[0_0_0_1px_rgba(223,255,0,0.1),0_24px_50px_-28px_rgba(0,0,0,0.7)]",
                  )}
                >
                  <CardHeader className="border-b border-white/8 pb-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-neon-lime/90">
                      Engineering focus
                    </p>
                    <CardTitle className="text-lg sm:text-xl">
                      Systems map
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4 text-sm text-zinc-400">
                    {[
                      "SaaS & multi-tenant backends",
                      "CRM + webhook integrations",
                      "Auth flows · JWT · SSO",
                      "Dashboards & data surfaces",
                    ].map((line) => (
                      <div
                        key={line}
                        className="flex items-center gap-2 rounded-lg border border-white/6 bg-zinc-950/50 px-3 py-2"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-emerald-400/90"
                          aria-hidden
                        />
                        {line}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TiltCard3D>
            </Reveal>
          </div>
          <ul className="mt-12 grid gap-3 sm:grid-cols-2">
            {highlights.map((item, i) => (
              <li key={item.label}>
                <Reveal delay={0.04 * i}>
                  <TiltCard3D max={4} className="h-full">
                    <Card
                      className={cn(
                        "relative h-full overflow-hidden border-white/[0.08] bg-zinc-950/60",
                        "hover:border-neon-lime/20",
                      )}
                    >
                      <div
                        className={cn(
                          "pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r",
                          toneLine[item.tone],
                        )}
                        aria-hidden
                      />
                      <CardContent className="p-4 sm:p-5">
                        <p className="text-sm font-medium text-zinc-100 sm:text-base">
                          {item.label}
                        </p>
                      </CardContent>
                    </Card>
                  </TiltCard3D>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionShell>
  );
}
