"use client";

import * as React from "react";

/** Top-to-bottom order of section `#id` anchors (must match page order). */
export const SECTION_SCROLL_ORDER = [
  "overview",
  "projects",
  "insights",
  "experience",
  "freelance",
  "skills",
  "about",
  "how-i-work",
  "contact",
] as const;

/** Items shown in sidebar / mobile nav (subset of scroll order). */
export const NAV_SECTION_IDS = [
  "overview",
  "projects",
  "insights",
  "experience",
  "about",
  "contact",
] as const;

const NAV_SET = new Set<string>(NAV_SECTION_IDS);
const SCROLL_SET = new Set<string>(SECTION_SCROLL_ORDER);

/**
 * Map the current scroll section to the nav item to highlight
 * (e.g. "freelance" / "skills" → "experience" until "about" is reached).
 */
export function scrollIdToActiveNavId(scrollId: string): string {
  const order = [...SECTION_SCROLL_ORDER] as string[];
  const idx = order.indexOf(scrollId);
  if (idx === -1) return NAV_SECTION_IDS[0];
  for (let i = idx; i >= 0; i -= 1) {
    const id = order[i];
    if (NAV_SET.has(id)) return id;
  }
  return NAV_SECTION_IDS[0];
}

function getScrollActiveId(): string {
  if (typeof document === "undefined") return SECTION_SCROLL_ORDER[0];
  const line = window.innerHeight * 0.22;
  let current: string = SECTION_SCROLL_ORDER[0];
  for (const id of SECTION_SCROLL_ORDER) {
    const el = document.getElementById(id);
    if (!el) continue;
    const { top } = el.getBoundingClientRect();
    if (top <= line) current = id;
  }
  return current;
}

/**
 * Active primary nav id while scrolling. Uses a viewport "activation line"
 * so the highlight tracks the current section reliably (unlike a single
 * IntersectionObserver with competing entries).
 */
export function useActiveSection() {
  const [activeScrollId, setActiveScrollId] = React.useState<string>(
    SECTION_SCROLL_ORDER[0],
  );

  React.useEffect(() => {
    const applyHash = () => {
      const raw = window.location.hash.slice(1);
      if (raw && SCROLL_SET.has(raw)) {
        setActiveScrollId(raw);
        return true;
      }
      return false;
    };

    const compute = () => {
      setActiveScrollId(getScrollActiveId());
    };

    const syncFromLocation = () => {
      if (!applyHash()) {
        compute();
      }
    };

    syncFromLocation();

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        compute();
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", compute, { passive: true });
    window.addEventListener("hashchange", syncFromLocation);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", compute);
      window.removeEventListener("hashchange", syncFromLocation);
    };
  }, []);

  return React.useMemo(
    () => scrollIdToActiveNavId(activeScrollId),
    [activeScrollId],
  );
}
