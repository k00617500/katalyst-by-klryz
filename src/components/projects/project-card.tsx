import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/types/project";

const categoryLabels: Record<string, string> = {
  "web-development": "Web Development",
  "mobile-applications": "Mobile Applications",
  "ui-ux-design": "UI/UX Design",
  "startup-entrepreneurship": "Startup & Entrepreneurship",
  "research-innovation": "Research & Innovation",
  "creative-design": "Creative Design",
};

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-brand"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={project.thumbnail}
          alt={project.title}
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </div>
      <div className="space-y-3 p-6">
        <div className="flex items-center justify-between gap-2 font-mono text-xs text-muted-foreground uppercase">
          <span>{categoryLabels[project.categories[0]]}</span>
          <span>{project.year}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-medium tracking-tight">{project.title}</h3>
          <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-brand" />
        </div>
        <p className="text-sm text-muted-foreground">{project.shortDescription}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {project.technologies.slice(0, 4).map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
