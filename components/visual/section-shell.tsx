import { cn } from "@/lib/utils";

type SectionShellProps = {
  id?: string;
  children: React.ReactNode;
  className?: string;
  /** 'hero' = stronger top glow; 'default' = subtle */
  tone?: "default" | "hero" | "deep";
};

function SectionShell({ id, children, className, tone = "default" }: SectionShellProps) {
  return (
    <section
      id={id}
      className={cn("relative scroll-mt-28", className)}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px",
          tone === "hero" && "bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent",
          tone === "deep" && "bg-gradient-to-r from-transparent via-violet-500/25 to-transparent",
          tone === "default" && "bg-gradient-to-r from-transparent via-white/10 to-transparent",
        )}
        aria-hidden
      />
      {children}
    </section>
  );
}

export { SectionShell };
/** @alias SectionShell — semantic name for design-system docs */
export { SectionShell as SectionContainer };
