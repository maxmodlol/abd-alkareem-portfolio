"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Toggles a stronger background glow (same dark theme, no light mode).
 * Keeps the UI professional while giving a “switch” on the right side of the nav.
 */
export function ThemeVividToggle() {
  const [vivid, setVivid] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.toggleAttribute("data-glow-vivid", vivid);
  }, [vivid]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-9 w-9 rounded-lg border border-white/10 text-zinc-300 hover:border-cyan-500/30 hover:bg-white/[0.04] hover:text-cyan-100",
        vivid && "border-cyan-500/30 text-cyan-200",
      )}
      aria-pressed={vivid}
      title={vivid ? "Standard glow" : "Boost ambient glow"}
      onClick={() => setVivid((v) => !v)}
    >
      {vivid ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
