import { cn } from "@/lib/utils";

/**
 * Body copy with brand-tinted technology names (readability first).
 */
export function HeroSubheadlineTech({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "text-pretty text-sm leading-relaxed text-zinc-400/95 sm:text-base",
        className,
      )}
    >
      I build production systems, CRM platforms, integrations, multi-tenant
      applications, dashboards, and mobile products using{" "}
      <span className="text-[#3C873A]">Node.js</span>,{" "}
      <span className="text-[#E0234E]">NestJS</span>,{" "}
      <span className="text-[#6DB33F]">Spring Boot</span>,{" "}
      <span className="text-zinc-200">Next.js</span>,{" "}
      <span className="text-[#336791]">PostgreSQL</span>,{" "}
      <span className="text-[#55C0F9]">Flutter</span>,{" "}
      <span className="text-[#FFCA28]">Firebase</span>
      {", and "}
      <span className="text-zinc-300">cloud deployment workflows</span>.
    </p>
  );
}
