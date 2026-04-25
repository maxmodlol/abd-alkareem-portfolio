import { cn } from "@/lib/utils";

const DEFAULT_CHIPS = [
  "3+ Years Experience",
  "20+ Projects Delivered",
  "100% Client Satisfaction",
  "24/7 System Focused",
] as const;

type HeroProofChipsProps = {
  className?: string;
  items?: readonly string[];
};

export function HeroProofChips({
  className,
  items = DEFAULT_CHIPS,
}: HeroProofChipsProps) {
  return (
    <ul
      className={cn("flex list-none flex-wrap gap-2", className)}
      aria-label="Quick highlights"
    >
      {items.map((c) => (
        <li key={c}>
          <span
            className="inline-block rounded-full border border-cyan-500/15 bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-2.5 py-1.5 text-[11px] font-medium text-zinc-200/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_20px_rgba(6,182,212,0.08)] sm:text-xs"
          >
            {c}
          </span>
        </li>
      ))}
    </ul>
  );
}
