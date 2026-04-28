"use client";

import * as React from "react";
import Link from "next/link";
import { Command, Menu, X } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { openCommandPalette } from "./cockpit-command-palette";
import { useActiveSection } from "./use-active-section";

const nav: { id: string; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "projects", label: "Projects" },
  { id: "insights", label: "Insights" },
  { id: "experience", label: "Experience" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

export function CockpitMobileHeader() {
  const [open, setOpen] = React.useState(false);
  const active = useActiveSection();

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/[0.06] bg-zinc-950/85 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Link
          href="#overview"
          className="flex min-w-0 items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900 shadow-[0_0_16px_rgba(223,255,0,0.12)]">
            <span className="h-2 w-2 rounded-full bg-neon-lime shadow-[0_0_10px_#dfff00]" />
          </span>
          <span className="truncate font-display text-sm font-bold text-zinc-100">
            Abd Alkareem
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 border border-white/10 bg-zinc-950/60 text-zinc-400 hover:text-neon-lime"
            onClick={() => {
              setOpen(false);
              openCommandPalette();
            }}
            aria-label="Open command palette"
          >
            <Command className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 border border-white/10 bg-zinc-950/60 text-neon-lime"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="cockpit-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <motion.div
        id="cockpit-mobile-nav"
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        className="overflow-hidden border-t border-white/[0.05] bg-zinc-950/95"
      >
        <nav className="flex max-h-[min(60vh,420px)] flex-col gap-0.5 overflow-y-auto px-2 py-2" aria-label="Mobile">
          {nav.map((item) => {
            const isActive = active === item.id;
            return (
              <Link
                key={item.id}
                href={`#${item.id}`}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium",
                  isActive
                    ? "bg-neon-lime/10 text-neon-lime [text-shadow:0_0_12px_rgba(223,255,0,0.2)]"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100",
                )}
                onClick={() => setOpen(false)}
              >
                {item.label}
                {isActive ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-neon-lime shadow-[0_0_6px_#dfff00]" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </motion.div>
    </header>
  );
}
