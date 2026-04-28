import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  /** Vertical accent bar before the title (dashboard style) */
  titlePrefix?: boolean;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  titlePrefix,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon-lime/80">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl md:text-[2rem] md:leading-tight",
          titlePrefix && "flex items-center gap-3",
          eyebrow ? "mt-2" : titlePrefix ? "mt-0" : "mt-2",
        )}
      >
        {titlePrefix ? (
          <span
            className="inline-block h-8 w-1 shrink-0 rounded-full bg-gradient-to-b from-neon-lime to-neon-purple shadow-[0_0_20px_rgba(223,255,0,0.3)]"
            aria-hidden
          />
        ) : null}
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-3 text-sm text-zinc-500 sm:text-base",
            align === "center" && "mx-auto max-w-xl",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
