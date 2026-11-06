"use client";

import { useMemo, useState } from "react";
import { ProjectCard } from "@/components/projects/project-card";
import type { Project, ProjectCategory } from "@/types/project";
import { FilterBar } from "@/components/ui/filter-bar";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { ViewToggle, type ContentView } from "@/components/ui/view-toggle";

const categories: { value: ProjectCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "web-development", label: "Web Development" },
  { value: "mobile-applications", label: "Mobile Applications" },
  { value: "ui-ux-design", label: "UI/UX Design" },
  { value: "startup-entrepreneurship", label: "Startup & Entrepreneurship" },
  { value: "research-innovation", label: "Research & Innovation" },
  { value: "creative-design", label: "Creative Design" },
];

export function ProjectsGrid({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState<ProjectCategory | "all">("all");
  const [view, setView] = useState<ContentView>("list");

  const filtered = useMemo(() => {
    if (active === "all") return projects;
    return projects.filter((project) => project.categories.includes(active));
  }, [active, projects]);

  return (
    <div>
      <div className="mb-8 flex min-w-0 items-start justify-between gap-4">
      <FilterBar label="Project categories" options={categories} value={active} onChange={setActive} />
      <ViewToggle value={view} onChange={setView} />
      </div>

      {filtered.length > 0 ? (
        view === "grid" ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div> : <div className="divide-y divide-border border-y border-border">
          {filtered.map((project) => <article key={project.slug} className="group grid gap-6 py-8 md:grid-cols-[200px_1fr] md:gap-10">
            <Link href={`/projects/${project.slug}`} className="relative block aspect-video overflow-hidden rounded-md border border-border"><Image src={project.thumbnail} alt={project.title} fill sizes="(min-width: 768px) 200px, 90vw" className="object-contain transition-transform duration-500 group-hover:scale-[1.03]" /></Link>
            <div>
              <p className="font-mono text-xs text-muted-foreground">{project.year} · {project.categories.map((category) => categories.find((item) => item.value === category)?.label).join(" / ")}</p>
              <h2 className="mt-3 text-2xl font-medium tracking-tight md:text-3xl"><Link href={`/projects/${project.slug}`} className="transition-colors hover:text-brand-ink">{project.title}</Link></h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">{project.shortDescription}</p>
              <Link href={`/projects/${project.slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand-ink">Read the project <ArrowUpRight className="size-4" /></Link>
            </div>
          </article>)}
        </div>
      ) : (
        <p className="text-muted-foreground">No projects in this category yet.</p>
      )}
    </div>
  );
}
