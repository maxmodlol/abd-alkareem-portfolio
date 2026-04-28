import { CockpitCodeOrb } from "./cockpit-code-orb";
import { CockpitHero } from "./cockpit-hero";
import { CockpitRightPanels } from "./cockpit-right-panels";
import { CockpitSystemOverview } from "./cockpit-system-overview";

export function CockpitDashboard() {
  return (
    <section
      className="relative w-full min-w-0 border-b border-white/[0.05] px-3 pb-5 pt-3 sm:px-5 sm:pb-6 sm:pt-4 lg:pt-5"
      aria-label="System overview"
    >
      <div className="mx-auto w-full min-w-0 max-w-[1600px]">
        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="grid items-start gap-6 sm:gap-6 lg:grid-cols-12 lg:gap-5 xl:gap-7">
            <div className="order-1 min-h-0 min-w-0 lg:col-span-4">
              <CockpitHero id="overview" />
            </div>
            <div className="order-2 flex min-h-0 min-w-0 justify-center overflow-visible lg:col-span-4">
              <CockpitCodeOrb />
            </div>
            <div className="order-3 min-h-0 min-w-0 lg:col-span-4">
              <CockpitRightPanels />
            </div>
          </div>
          <div className="w-full min-w-0 border-t border-white/[0.06] pt-3">
            <CockpitSystemOverview />
          </div>
        </div>
      </div>
    </section>
  );
}
