"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Briefcase,
  FileText,
  Github,
  Home,
  Layers,
  LineChart,
  Mail,
  MessageCircle,
  Search,
  User,
  X,
} from "lucide-react";

const OPEN_EVENT = "cockpit:open-command-palette";

export function openCommandPalette() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

type Item = {
  id: string;
  label: string;
  detail?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
};

const commands: Item[] = [
  { id: "overview", label: "Overview", href: "#overview", icon: Home },
  { id: "projects", label: "Projects", href: "#projects", icon: Layers },
  { id: "insights", label: "Insights", href: "#insights", icon: LineChart },
  {
    id: "experience",
    label: "Experience",
    href: "#experience",
    icon: Briefcase,
  },
  { id: "about", label: "About", href: "#about", icon: User },
  { id: "contact", label: "Contact", href: "#contact", icon: MessageCircle },
  {
    id: "email",
    label: "Email",
    detail: "kareemabualsoud8@gmail.com",
    href: "mailto:kareemabualsoud8@gmail.com",
    icon: Mail,
    external: true,
  },
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/maxmodlol",
    icon: Github,
    external: true,
  },
  {
    id: "cv",
    label: "Open CV (PDF)",
    href: "/cv.pdf",
    icon: FileText,
    external: true,
  },
];

function matchesQuery(item: Item, q: string) {
  if (!q.trim()) return true;
  const s = q.toLowerCase();
  return (
    item.label.toLowerCase().includes(s) ||
    item.id.includes(s) ||
    (item.detail?.toLowerCase().includes(s) ?? false)
  );
}

export function CockpitCommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const reduce = useReducedMotion();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setQ("");
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (!o) {
            setQ("");
            return true;
          }
          return false;
        });
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  React.useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const filtered = React.useMemo(
    () => commands.filter((item) => matchesQuery(item, q)),
    [q],
  );

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="command-palette-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[min(20vh,8rem)] sm:pt-24"
          initial={reduce ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <motion.div
            key="command-palette-panel"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-white/12 bg-zinc-950/95 shadow-[0_0_0_1px_rgba(191,0,255,0.12),0_24px_80px_-20px_rgba(0,0,0,0.9),0_0_40px_rgba(223,255,0,0.06)]"
            initial={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
          >
            <div className="border-b border-white/10 bg-zinc-900/60 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-neon-lime/70" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Jump to section, email, GitHub, CV…"
                  className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                  aria-label="Close palette"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <ul className="max-h-[min(50vh,320px)] overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <li className="px-3 py-4 text-center text-sm text-zinc-500">
                  No matches. Try a different term.
                </li>
              ) : (
                filtered.map((item) => {
                  const Icon = item.icon;
                  const common =
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-200 transition hover:bg-white/[0.06] hover:text-white focus:bg-white/[0.08] focus:outline-none";
                  return (
                    <li key={item.id}>
                      {item.external ? (
                        <a
                          href={item.href}
                          className={common}
                          onClick={() => setOpen(false)}
                          {...(item.href.startsWith("http")
                            ? { target: "_blank", rel: "noreferrer" }
                            : {})}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-neon-lime/90">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{item.label}</span>
                            {item.detail ? (
                              <span className="block truncate text-xs text-zinc-500">
                                {item.detail}
                              </span>
                            ) : null}
                          </span>
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          className={common}
                          onClick={() => setOpen(false)}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-neon-lime/90">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
            <p className="border-t border-white/5 px-3 py-2 text-[10px] text-zinc-600">
              <kbd className="rounded border border-white/10 bg-zinc-900 px-1 font-mono">
                Esc
              </kbd>{" "}
              close ·{" "}
              <kbd className="rounded border border-white/10 bg-zinc-900 px-1 font-mono">
                ⌘K
              </kbd>{" "}
              toggle
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
