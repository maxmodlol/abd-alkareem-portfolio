import { SiteBackground } from "@/components/site-background";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AboutSection } from "@/components/sections/about-section";
import { ContactSection } from "@/components/sections/contact-section";
import { ExperienceSection } from "@/components/sections/experience-section";
import { FreelanceSection } from "@/components/sections/freelance-section";
import { HeroSection } from "@/components/sections/hero-section";
import { HowIWorkSection } from "@/components/sections/how-i-work-section";
import { ProjectsSection } from "@/components/sections/projects-section";
import { SkillsSection } from "@/components/sections/skills-section";

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <SiteBackground />
      <SiteHeader />
      <main>
        <HeroSection />
        <ProjectsSection />
        <ExperienceSection />
        <FreelanceSection />
        <SkillsSection />
        <AboutSection />
        <HowIWorkSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  );
}
