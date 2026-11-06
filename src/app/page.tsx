import { HeroSection } from "@/components/sections/hero-section";
import { AboutPreviewSection } from "@/components/sections/about-preview-section";
import { ProjectCarousel } from "@/components/sections/project-carousel";
import { ExpertiseSection } from "@/components/sections/expertise-section";
import { ToolkitSection } from "@/components/sections/toolkit-section";
import { ExperienceHighlightsSection } from "@/components/sections/experience-highlights-section";
import { AchievementsHighlightsSection } from "@/components/sections/achievements-highlights-section";
import { CurrentlyExploringSection } from "@/components/sections/currently-exploring-section";
import { ContactCtaSection } from "@/components/sections/contact-cta-section";

export default function Home() {
  return (
    <>
      <HeroSection />
      <AboutPreviewSection />
      <ExpertiseSection />
      <ProjectCarousel />
      <ToolkitSection />
      <ExperienceHighlightsSection />
      <AchievementsHighlightsSection />
      <CurrentlyExploringSection />
      <ContactCtaSection />
    </>
  );
}
