import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { GlowPageHeader } from "@/components/sections/glow-page-header";
import { ProjectCarousel } from "@/components/sections/project-carousel";
import { ProjectsGrid } from "@/components/projects/projects-grid";
import { projects } from "@/data/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "Software, design, and startup work I've developed and led.",
};

const marqueeCategories = [
  "Web Development",
  "Mobile Applications",
  "UI/UX Design",
  "Startup & Entrepreneurship",
  "Research & Innovation",
  "Creative Design",
];

export default function ProjectsPage() {
  return (
    <>
      <GlowPageHeader
        eyebrow="Projects"
        title="Software and systems, built end to end."
        description="A record of what I've designed, built, and shipped — from government-backed project management systems to startup platforms."
        marqueeItems={marqueeCategories}
      />

      <ProjectCarousel showIntro={false} ariaLabel="Project gallery" compact />

      <section className="container-page section-y border-t border-border/60">
        <ProjectsGrid projects={projects} />
        <a href="https://foreal-solutions.vercel.app/" target="_blank" rel="noopener noreferrer" className="group mt-10 flex items-center justify-between gap-6 border-y border-border py-6 transition-colors hover:text-accent-cyan">
          <div>
            <p className="font-medium">Foreal Solutions</p>
            <p className="mt-1 text-sm text-muted-foreground">Visit the startup website</p>
          </div>
          <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
        </a>
        <a href="http://asenxo-main.vercel.app/" target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between gap-6 border-b border-border py-6 transition-colors hover:text-brand-ink">
          <div><p className="font-medium">ASENXO Website</p><p className="mt-1 text-sm text-muted-foreground">Visit the project management system</p></div>
          <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
        </a>
      </section>
    </>
  );
}
