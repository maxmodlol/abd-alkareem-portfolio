"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Sparkles, X } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "#top", label: "Home" },
  { href: "#projects", label: "Projects" },
  { href: "#skills", label: "Skills" },
  { href: "#experience", label: "Experience" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState<string | null>(null);

  React.useEffect(() => {
    const ids = nav.map((n) => n.href.replace("#", ""));
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0),
          );
        if (visible[0]?.target.id) {
          setActive(visible[0].target.id);
        }
      },
      { root: null, rootMargin: "-42% 0px -42% 0px", threshold: [0, 0.1, 0.2] },
    );

    elements.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-50 px-4 pt-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12">
      {/* Multi-color “signal” line */}
      <div
        className="site-header-signal site-header-signal-anim mx-auto mb-2.5 h-[2px] w-full max-w-[100rem] flex-shrink-0 rounded-sm"
        aria-hidden
      />

      <div className="site-header-outer relative mx-auto max-w-[100rem]">
        {/* Soft aurora blobs (behind glass) */}
        <div
          className="site-header-aurora absolute -left-4 top-1/2 h-20 w-40 -translate-y-1/2 bg-cyan-500/20"
          aria-hidden
        />
        <div
          className="site-header-aurora absolute -right-2 top-1/2 h-20 w-36 -translate-y-1/2 bg-zinc-500/12 [animation-delay:2.2s]"
          aria-hidden
        />

        <div className="site-header-sheen relative z-10 border border-white/[0.06] bg-zinc-950/78 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-2xl supports-[backdrop-filter]:bg-zinc-950/65">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
            <Link
              href="#top"
              className="group relative z-10 flex min-w-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:gap-3"
              aria-label="Back to top"
              onClick={() => setOpen(false)}
            >
              <motion.span
                className={cn(
                  "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl font-mono text-sm font-extrabold tracking-tight text-white",
                  "bg-gradient-to-br from-cyan-400/95 via-cyan-600 to-slate-800",
                  "shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_0_20px_rgba(6,182,212,0.22),inset_0_1px_0_0_rgba(255,255,255,0.2)]",
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                aria-hidden
              >
                <span className="absolute inset-0 bg-gradient-to-tr from-white/15 to-transparent opacity-40" />
                <span className="relative">AA</span>
              </motion.span>
              <span className="min-w-0 sm:flex sm:flex-col sm:gap-0.5">
                <span
                  className="truncate text-sm font-semibold leading-tight sm:text-base"
                  style={{
                    background:
                      "linear-gradient(105deg, #fafafa 0%, #e4e4e7 20%, #7dd3fc 55%, #5eead4 95%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  Abd Alkareem Abu-Alsoud
                </span>
                <span className="hidden text-[11px] font-medium sm:flex sm:items-center sm:gap-1.5 sm:text-xs">
                  <span className="inline-flex max-w-prose items-center bg-gradient-to-r from-cyan-400/85 to-zinc-400/90 bg-clip-text text-transparent">
                    Software Engineer
                  </span>
                  <span
                    className="relative inline-flex h-1.5 w-1.5 items-center justify-center"
                    title="Open to opportunities"
                    aria-hidden
                  >
                    <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-500/50" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500/80 shadow-[0_0_5px_rgba(52,211,153,0.35)]" />
                  </span>
                </span>
              </span>
              <span
                className="hidden h-6 shrink-0 items-center gap-1 rounded-full border border-cyan-500/20 bg-gradient-to-b from-cyan-500/8 to-zinc-900/40 px-2.5 text-[10px] font-medium text-cyan-200/80 shadow-[0_0_8px_rgba(6,182,212,0.08)] sm:inline-flex"
                title="Location"
              >
                <span aria-hidden>🇵🇸</span>
                Palestine
              </span>
            </Link>

            <nav
              className="hidden items-center gap-0.5 lg:flex"
              aria-label="Primary"
            >
              {nav.map((item) => {
                const id = item.href.replace("#", "");
                const isActive = active === id;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-200 xl:px-3",
                      isActive
                        ? "text-cyan-100/95 [text-shadow:0_0_12px_rgba(34,211,238,0.2)]"
                        : "text-zinc-500 hover:text-zinc-200",
                    )}
                  >
                    {item.label}
                    <span
                      className={cn(
                        "absolute bottom-1 left-1/2 h-0.5 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500/80 via-cyan-400/90 to-teal-500/70 transition-all duration-200",
                        isActive
                          ? "w-[72%] max-w-[3.5rem] opacity-100 shadow-[0_0_6px_rgba(6,182,212,0.25)]"
                          : "w-0 opacity-0 group-hover:w-4 group-hover:opacity-100",
                      )}
                      aria-hidden
                    />
                  </Link>
                );
              })}
            </nav>

            <div className="relative z-10 flex items-center gap-1.5 sm:gap-2">
              <span
                className="hidden h-6 w-[2px] rounded-full bg-gradient-to-b from-cyan-500/15 via-cyan-400/25 to-zinc-600/20 md:block"
                aria-hidden
              />
              <Button
                asChild
                size="sm"
                className={cn(
                  "relative hidden h-9 items-center overflow-hidden sm:inline-flex",
                  "border border-cyan-500/20 bg-gradient-to-r from-cyan-500/12 to-zinc-800/50",
                  "px-3 text-xs font-semibold text-zinc-100 shadow-[0_0_12px_rgba(6,182,212,0.12),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
                  "ring-1 ring-cyan-500/10 transition hover:from-cyan-500/18 hover:to-zinc-800/60 hover:ring-cyan-500/16",
                )}
              >
                <a href="mailto:kareemabualsoud8@gmail.com" className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-300/70" />
                  Let&apos;s talk
                </a>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 border border-white/10 bg-zinc-950/50 text-cyan-200/90 shadow-sm hover:border-cyan-500/25 hover:bg-cyan-950/30 hover:shadow-[0_0_12px_rgba(6,182,212,0.1)] lg:hidden"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-nav"
                aria-label={open ? "Close menu" : "Open menu"}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          "mx-auto max-w-[100rem] origin-top overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl transition-all duration-250 ease-out lg:hidden",
          open
            ? "mt-2.5 max-h-[480px] translate-y-0 border-white/12 opacity-100 shadow-[0_12px_34px_-20px_rgba(6,182,212,0.28)]"
            : "pointer-events-none mt-0 max-h-0 -translate-y-2 border-transparent opacity-0 shadow-none",
        )}
      >
        <div className="from-cyan-500/6 to-transparent bg-gradient-to-br to-zinc-950/30 px-1.5 py-1.5">
          <nav className="flex flex-col gap-0.5 px-1" aria-label="Mobile">
            {nav.map((item) => {
              const id = item.href.replace("#", "");
              const isActive = active === id;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium transition",
                    isActive
                      ? "border-cyan-500/20 bg-cyan-950/40 text-cyan-100/95 [text-shadow:0_0_8px_rgba(34,211,238,0.15)]"
                      : "text-zinc-300 hover:border-white/5 hover:bg-white/[0.05] hover:text-white",
                  )}
                  onClick={() => setOpen(false)}
                >
                  <span>{item.label}</span>
                  {isActive ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/80 shadow-[0_0_6px_rgba(6,182,212,0.3)]" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
