import { cn } from "@/lib/utils";

export type ProjectMockVariant = "crm" | "cms" | "mobile";

export function ProjectMockVisual({
  variant,
  className,
}: {
  variant: ProjectMockVariant;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-t-2xl border-b border-white/[0.08] bg-gradient-to-b from-zinc-900/95 to-zinc-950/98",
        className,
      )}
    >
      <div className="absolute inset-0 bg-grid-fine opacity-35" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-neon-lime/8 via-transparent to-violet-500/8"
        aria-hidden
      />
      {variant === "crm" && <MockCrm />}
      {variant === "cms" && <MockCms />}
      {variant === "mobile" && <MockMobile />}
    </div>
  );
}

function Bar() {
  return (
    <div className="flex items-center gap-1.5 border-b border-white/10 bg-black/35 px-2.5 py-1.5 sm:px-3 sm:py-2">
      <div className="h-1.5 w-1.5 rounded-full bg-red-500/85" />
      <div className="h-1.5 w-1.5 rounded-full bg-amber-500/80" />
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/85" />
      <div className="ml-2 h-1 flex-1 rounded-full bg-white/5" />
      <span className="font-mono text-[8px] text-zinc-600 sm:text-[9px]">crm.app</span>
    </div>
  );
}

function MockCrm() {
  return (
    <div className="relative p-2.5 sm:p-3.5">
      <Bar />
      <div className="mt-2.5 flex gap-2 sm:gap-3">
        <div className="hidden w-[22%] shrink-0 flex-col gap-1 rounded-lg border border-white/10 bg-zinc-950/80 p-1.5 sm:flex">
          {["Pipeline", "Clients", "Deals", "Reports", "Settings"].map(
            (t, i) => (
              <div
                key={t}
                className={cn(
                  "rounded-md px-1.5 py-1 text-[8px] text-zinc-500",
                  i === 0 && "bg-neon-lime/10 text-neon-lime/90",
                )}
              >
                {t}
              </div>
            ),
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {[
              { k: "Revenue", v: "$428k" },
              { k: "Commissions", v: "$31k" },
              { k: "Deals", v: "18" },
            ].map((x) => (
              <div
                key={x.k}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-1.5 sm:p-2"
              >
                <p className="text-[7px] text-zinc-500 sm:text-[8px]">{x.k}</p>
                <p className="mt-0.5 text-xs font-semibold text-zinc-200 sm:text-sm">
                  {x.v}
                </p>
              </div>
            ))}
          </div>
          <div className="h-16 rounded-lg border border-neon-lime/20 bg-gradient-to-t from-neon-lime/10 to-transparent p-1.5 sm:h-[4.5rem]">
            <div className="mb-0.5 flex items-center justify-between text-[7px] text-zinc-500 sm:text-[8px]">
              <span>Performance</span>
              <span className="font-mono text-neon-lime/90">+12%</span>
            </div>
            <div className="flex h-[calc(100%-0.75rem)] items-end gap-px sm:gap-0.5">
              {[40, 70, 45, 80, 55, 90, 60, 75].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-gradient-to-t from-neon-lime/60 to-neon-lime/20"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[7px] sm:text-[8px]">
            <div className="rounded border border-white/8 bg-zinc-950/60 p-1.5">
              <p className="text-zinc-500">Clients</p>
              <p className="mt-0.5 text-zinc-300">Acme · Northwind · ProLine</p>
            </div>
            <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-1.5 text-emerald-200/90">
              <p>Sync</p>
              <p className="mt-0.5">Webhook OK</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockCms() {
  return (
    <div className="relative p-2.5 sm:p-3.5">
      <Bar />
      <div className="mt-2.5 space-y-2">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
          <div className="rounded-lg border border-violet-500/25 bg-violet-500/8 p-1.5 sm:col-span-1">
            <p className="text-[7px] text-violet-200/90 sm:text-[8px]">Tenants</p>
            <p className="mt-0.5 font-mono text-[9px] text-zinc-300 sm:text-[10px]">12 active</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
            <p className="text-[7px] text-zinc-500 sm:text-[8px]">Domains / SSL</p>
            <p className="mt-0.5 text-[8px] text-zinc-300 sm:text-[9px]">Wildcard</p>
          </div>
          <div className="col-span-2 rounded-lg border border-white/10 bg-white/[0.03] p-1.5 sm:col-span-1">
            <p className="text-[7px] text-zinc-500 sm:text-[8px]">Storage</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full w-[62%] rounded-full bg-neon-lime/70" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-white/8 bg-zinc-950/70 p-1.5">
          <div className="mb-1 flex text-[7px] text-zinc-500 sm:text-[8px]">
            <span className="w-1/4">Post</span>
            <span className="w-1/3">Status</span>
            <span className="w-1/3">Domain</span>
            <span className="w-1/6 text-right">SEO</span>
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex border-t border-white/5 py-1 text-[6.5px] text-zinc-400 sm:text-[7.5px]"
            >
              <span className="w-1/4 truncate">Launch notes {i}</span>
              <span className="w-1/3 text-emerald-300/90">Published</span>
              <span className="w-1/3 truncate font-mono">t{i}.app</span>
              <span className="w-1/6 text-right text-neon-lime/80">98</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="h-10 flex-1 rounded border border-dashed border-white/15 bg-black/25 p-1.5 text-[7px] text-zinc-500 sm:text-[8px]">
            Analytics · sessions +18%
          </div>
          <div className="w-1/3 rounded border border-amber-500/20 bg-amber-500/5 p-1.5 text-[7px] text-amber-200/90 sm:text-[8px]">
            <p>Google Ads</p>
            <p className="mt-0.5 text-[10px] font-semibold">+12%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockMobile() {
  return (
    <div className="relative p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between text-[8px] text-zinc-500 sm:text-[9px]">
        <span>Mobile product · preview</span>
        <span className="font-mono text-neon-lime/80">Flutter</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { t: "Booking", sub: "Flow" },
          { t: "Map", sub: "Geo" },
          { t: "Listings", sub: "Rentals" },
        ].map((s) => (
          <div
            key={s.t}
            className="overflow-hidden rounded-[1.1rem] border border-white/12 bg-zinc-950/90 shadow-lg"
          >
            <div className="h-1 w-full bg-zinc-800" />
            <div className="p-1.5 sm:p-2">
              <p className="text-[7px] font-medium text-zinc-400 sm:text-[8px]">
                {s.t}
              </p>
              <div className="mt-1.5 space-y-1">
                <div className="h-1.5 w-full rounded bg-white/10" />
                <div className="h-1.5 w-[80%] rounded bg-neon-lime/30" />
                <div className="mt-2 h-8 rounded border border-neon-lime/15 bg-gradient-to-br from-neon-lime/10 to-transparent" />
              </div>
              <p className="mt-1.5 text-[6px] text-zinc-600 sm:text-[7px]">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex gap-2">
        <div className="flex-1 rounded-lg border border-violet-500/20 bg-violet-500/5 p-1.5 text-[7px] text-zinc-400 sm:text-[8px]">
          <p className="text-violet-200/90">Patient / record</p>
          <p className="mt-0.5">Workflow panel</p>
        </div>
        <div className="w-1/3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-1.5 text-center text-[7px] text-emerald-200/90 sm:text-[8px]">
          Live
        </div>
      </div>
    </div>
  );
}
