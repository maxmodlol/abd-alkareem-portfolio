import { Calendar, Hospital, MapPin, Home } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/visual/reveal";
import { SectionHeading } from "@/components/visual/section-heading";
import { SectionShell } from "@/components/visual/section-shell";
import { TiltCard3D } from "@/components/visual/tilt-card-3d";
import { cn } from "@/lib/utils";

const products = [
  {
    title: "Event Planning & Booking System",
    description:
      "A mobile-first event planning and booking system for managing reservations, user requests, event details, and booking flows.",
    focus: "Booking flow, user management, admin workflows, notifications, real-time data.",
    tech: ["Flutter", "Firebase", "MongoDB", "REST APIs"],
    tone: "lime" as const,
    icon: Calendar,
    visual: <VisualEvent />,
  },
  {
    title: "Palestinian Checkpoint Status App",
    description:
      "A location-aware app for tracking and updating checkpoint statuses between Palestinian cities with user/admin updates and status history.",
    focus:
      "Real-time status updates, checkpoint history, geolocation, user reviews, map-based information.",
    tech: ["Flutter", "Firebase", "MongoDB", "Maps", "Geolocation"],
    tone: "violet" as const,
    icon: MapPin,
    visual: <VisualCheckpoint />,
  },
  {
    title: "Renting System",
    description:
      "A rental platform for listing properties or items, browsing available rentals, managing booking requests, and connecting users with owners.",
    focus: "Listings, search/filtering, booking requests, authentication, owner dashboards.",
    tech: ["Flutter", "Firebase", "MongoDB", "Node.js"],
    tone: "emerald" as const,
    icon: Home,
    visual: <VisualRent />,
  },
  {
    title: "Hospital / Healthcare Management System",
    description:
      "A healthcare-oriented system for managing patients, appointments, records, and operational workflows.",
    focus:
      "Patient records, appointment flow, role-based access, dashboard-style management.",
    tech: ["Flutter", "Firebase", "MongoDB", "REST APIs"],
    tone: "sky" as const,
    icon: Hospital,
    visual: <VisualHealth />,
  },
];

const toneMap = {
  lime: "from-neon-lime/25 via-neon-lime/5 to-transparent",
  violet: "from-violet-500/25 via-violet-500/5 to-transparent",
  emerald: "from-emerald-500/25 via-emerald-500/5 to-transparent",
  sky: "from-sky-500/25 via-sky-500/5 to-transparent",
} as const;

function VisualEvent() {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {["Fri 12", "Sat 13", "Sun 14"].map((d) => (
        <div
          key={d}
          className="rounded border border-neon-lime/20 bg-zinc-950/80 p-1.5 text-center"
        >
          <p className="text-[7px] text-neon-lime/90">{d}</p>
          <div className="mx-auto mt-1 h-1 w-6 rounded bg-neon-lime/50" />
        </div>
      ))}
    </div>
  );
}

function VisualCheckpoint() {
  return (
    <div className="space-y-1.5">
      <div className="flex h-8 items-end gap-0.5">
        {[30, 50, 40, 70, 45].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-violet-500/40"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[7px] text-zinc-500">
        <span>Route A → B</span>
        <span className="text-emerald-400/90">Live</span>
      </div>
    </div>
  );
}

function VisualRent() {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <div className="space-y-1">
        <div className="h-6 rounded border border-white/10 bg-zinc-900/80" />
        <div className="h-1 w-[66%] rounded bg-emerald-500/40" />
      </div>
      <div className="rounded border border-emerald-500/25 bg-emerald-500/5 p-1.5 text-[7px] text-emerald-200/90">
        24 listings
      </div>
    </div>
  );
}

function VisualHealth() {
  return (
    <div className="flex gap-2">
      <div className="flex-1 space-y-1">
        <div className="h-2 w-full rounded bg-sky-500/30" />
        <div className="h-2 w-[80%] rounded bg-zinc-600" />
        <div className="h-2 w-full rounded bg-zinc-700" />
      </div>
      <div className="w-12 rounded border border-sky-500/20 bg-sky-500/5 p-1 text-center text-[7px] text-sky-200/90">
        EMR
      </div>
    </div>
  );
}

export function FreelanceSection() {
  return (
    <SectionShell id="freelance" tone="default">
      <div className="px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading
              titlePrefix
              title="Freelance product work"
              description="Mobile and product systems built around real user flows: bookings, location, listings, and healthcare operations."
            />
          </Reveal>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2">
            {products.map((p, i) => {
              const Icon = p.icon;
              return (
                <li key={p.title}>
                  <Reveal delay={0.05 * i}>
                    <TiltCard3D max={5} className="h-full">
                      <Card
                        className={cn(
                          "h-full overflow-hidden border-white/[0.1] bg-zinc-950/55",
                          "shadow-[0_0_0_1px_rgba(223,255,0,0.05),0_24px_50px_-24px_rgba(0,0,0,0.65)]",
                        )}
                      >
                        <div
                          className={cn(
                            "relative min-h-[7.5rem] overflow-hidden bg-gradient-to-br p-3 sm:min-h-[7.75rem] sm:p-4",
                            toneMap[p.tone],
                          )}
                        >
                          <div className="bg-grid-fine pointer-events-none absolute inset-0 opacity-30" />
                          <div className="relative flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-zinc-500">
                                <Icon className="h-3 w-3 text-neon-lime/80" />
                                Product module
                              </p>
                              <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug text-zinc-100">
                                {p.title}
                              </p>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-emerald-400/90 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                          </div>
                          <div className="relative mt-3 min-h-[3.25rem] text-[8px] sm:text-[9px]">
                            {p.visual}
                          </div>
                        </div>
                        <CardHeader className="border-b border-white/6 pt-4">
                          <CardTitle className="text-base sm:text-lg">
                            {p.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-zinc-400">
                          <p>{p.description}</p>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                              Focus
                            </p>
                            <p className="mt-1 text-zinc-400">{p.focus}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {p.tech.map((t) => (
                              <Badge
                                key={t}
                                variant="tech"
                                className="text-[10px] sm:text-xs"
                              >
                                {t}
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
