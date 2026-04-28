"use client";

import * as React from "react";

type CockpitShellValue = {
  /** Desktop only: icon rail (narrow) vs full labels */
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
};

const CockpitShellContext = React.createContext<CockpitShellValue | null>(null);

const STORAGE_KEY = "cockpit-sidebar-collapsed";

export function CockpitShellProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") {
        setSidebarCollapsed(true);
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    setSidebarCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({
      sidebarCollapsed,
      setSidebarCollapsed: (v: boolean) => {
        setSidebarCollapsed(v);
        try {
          localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
        } catch {
          // ignore
        }
      },
      toggleSidebar,
    }),
    [sidebarCollapsed, toggleSidebar],
  );

  if (!ready) {
    return (
      <CockpitShellContext.Provider value={value}>
        {children}
      </CockpitShellContext.Provider>
    );
  }

  return (
    <CockpitShellContext.Provider value={value}>
      {children}
    </CockpitShellContext.Provider>
  );
}

export function useCockpitShell() {
  const ctx = React.useContext(CockpitShellContext);
  if (!ctx) {
    throw new Error("useCockpitShell must be used within CockpitShellProvider");
  }
  return ctx;
}

export function useCockpitShellOptional() {
  return React.useContext(CockpitShellContext);
}
