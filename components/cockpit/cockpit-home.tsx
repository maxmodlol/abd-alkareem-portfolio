"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { AboutSection } from "@/components/sections/about-section";
import { ContactSection } from "@/components/sections/contact-section";
import { ExperienceSection } from "@/components/sections/experience-section";
import { FreelanceSection } from "@/components/sections/freelance-section";
import { HowIWorkSection } from "@/components/sections/how-i-work-section";
import { ProjectsSection } from "@/components/sections/projects-section";
import { SkillsSection } from "@/components/sections/skills-section";
import { SiteFooter } from "@/components/site-footer";

import { CockpitBackground } from "./cockpit-background";
import { CockpitBottomBar } from "./cockpit-bottom-bar";
import { CockpitCommandPalette } from "./cockpit-command-palette";
import { CockpitDashboard } from "./cockpit-dashboard";
import { CockpitLabStubs } from "./cockpit-lab-stubs";
import { CockpitMobileHeader } from "./cockpit-mobile-header";
import { CockpitSidebar } from "./cockpit-sidebar";

export function CockpitHome() {
  const [sidebarWide, setSidebarWide] = React.useState(true);
  const mainPad = cn(
    "w-full min-w-0 max-w-full pb-[4.75rem] pt-16 transition-[padding] duration-300 ease-out will-change-[padding] sm:pb-20 lg:pt-0",
    sidebarWide ? "lg:pl-[4.75rem] xl:pl-56" : "lg:pl-16",
  );
  const barPad = cn(
    "transition-[padding] duration-300 ease-out will-change-[padding]",
    sidebarWide ? "lg:pl-[4.75rem] xl:pl-56" : "lg:pl-16",
  );

  return (
    <div className="relative min-h-screen w-full min-w-0 max-w-full overflow-x-hidden">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-[120vh] rounded-lg border border-neon-lime/40 bg-zinc-950 px-4 py-2 text-sm font-medium text-neon-lime shadow-[0_0_24px_rgba(0,0,0,0.55)] transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-neon-lime/55"
      >
        Skip to main content
      </a>
      <CockpitCommandPalette />
      <CockpitBackground />
      <CockpitMobileHeader />
      <CockpitSidebar
        wide={sidebarWide}
        onToggleWide={() => setSidebarWide((v) => !v)}
      />
      <div className={mainPad}>
        <main id="main-content" className="w-full min-w-0" tabIndex={-1}>
          <CockpitDashboard />
          <ProjectsSection />
          <CockpitLabStubs />
          <ExperienceSection />
          <FreelanceSection />
          <SkillsSection />
          <AboutSection />
          <HowIWorkSection />
          <ContactSection />
          <SiteFooter />
        </main>
      </div>
      <CockpitBottomBar className={barPad} />
    </div>
  );
}
