import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/project-card";
import { getProjectBySlug, projects } from "@/data/projects";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.shortDescription,
  };
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-6">
      <h2 className="text-2xl font-medium tracking-tight">
        {title}
      </h2>
      <div className="mt-4 text-base leading-[1.85] text-muted-foreground md:text-lg">
        {children}
      </div>
    </section>
  );
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const cs = project.caseStudy;
  const related = projects.filter((p) => p.slug !== project.slug).slice(0, 2);

  return (
    <>
      <section className="container-page py-12 md:py-16">
        <Button asChild variant="ghost" size="sm" className="mb-8 -ml-3">
          <Link href="/projects">
            <ArrowLeft className="size-4" />
            All Projects
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-3 font-mono text-xs tracking-wide text-muted-foreground uppercase">
          <span>{project.year}</span>
          <span>&middot;</span>
          {project.categories.map((c) => (
            <span key={c}>{c.replace(/-/g, " ")}</span>
          ))}
        </div>

        <h1 className="mt-4 max-w-4xl text-balance text-4xl font-medium tracking-tight md:text-6xl">
          {project.title}
        </h1>
        <p className="mt-6 max-w-2xl font-space text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
          {project.shortDescription}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {project.liveUrl && (
            <Button asChild className="rounded-full">
              <Link href={project.liveUrl} target="_blank">
                Visit Live Project
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          )}
          {project.githubUrl && (
            <Button asChild variant="outline" className="rounded-full">
              <Link href={project.githubUrl} target="_blank">
                <FaGithub className="size-4" />
                View on GitHub
              </Link>
            </Button>
          )}
        </div>
      </section>

      <section className="px-6 md:px-10">
        <ScrollReveal className="relative mx-auto aspect-video w-full max-w-[760px] overflow-hidden rounded-lg border border-border bg-muted">
          <Image
            src={project.thumbnail}
            alt={project.title}
            fill
            sizes="(min-width: 820px) 760px, 90vw"
            className="object-contain"
            priority
          />
        </ScrollReveal>
      </section>

      <article className="mx-auto w-full max-w-[840px] px-6 py-12 md:px-10 md:py-16">
        <InfoSection title="Overview">
          <p>{project.overview}</p>
        </InfoSection>

        {cs?.background && (
          <InfoSection title="Background & Context">
            <p>{cs.background}</p>
          </InfoSection>
        )}

        {cs?.problemStatement && (
          <InfoSection title="Problem Statement">
            <p>{cs.problemStatement}</p>
          </InfoSection>
        )}

        {cs?.proposedSolution && (
          <InfoSection title="Proposed Solution">
            <p>{cs.proposedSolution}</p>
          </InfoSection>
        )}

        {cs?.objectives && cs.objectives.length > 0 && (
          <InfoSection title="Project Objectives">
            <p>The project aims to {cs.objectives.map((objective) => objective.charAt(0).toLowerCase() + objective.slice(1).replace(/[.!?]+$/, "")).join("; ")}.</p>
          </InfoSection>
        )}

        {cs?.role && (
          <InfoSection title="My Role & Responsibilities">
            <p>{cs.role}</p>
          </InfoSection>
        )}

        {cs?.team && cs.team.length > 0 && (
          <InfoSection title="Team & Collaborators">
            <p>{cs.team.join(", ")}</p>
          </InfoSection>
        )}

        {cs?.researchAndPlanning && (
          <InfoSection title="Research & Planning">
            <p>{cs.researchAndPlanning}</p>
          </InfoSection>
        )}

        {cs?.designProcess && (
          <InfoSection title="Design Process">
            <p>{cs.designProcess}</p>
          </InfoSection>
        )}

        {cs?.developmentProcess && (
          <InfoSection title="Development Process">
            <p>{cs.developmentProcess}</p>
          </InfoSection>
        )}

        <InfoSection title="Technology Stack">
          <div className="flex flex-wrap gap-2">
            {project.technologies.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border px-3 py-1 font-mono text-xs"
              >
                {t}
              </span>
            ))}
          </div>
        </InfoSection>

        {cs?.challenges && (
          <InfoSection title="Challenges & Solutions">
            <p>{cs.challenges}</p>
          </InfoSection>
        )}

        {cs?.results && (
          <InfoSection title="Results & Impact">
            <p>{cs.results}</p>
          </InfoSection>
        )}

        {cs?.lessonsLearned && (
          <InfoSection title="Lessons Learned">
            <p>{cs.lessonsLearned}</p>
          </InfoSection>
        )}
      </article>

      {related.length > 0 && (
        <section className="container-page section-y border-t border-border/60">
          <h2 className="mb-10 text-2xl font-medium tracking-tight">
            Related Projects
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {related.map((p) => (
              <ProjectCard key={p.slug} project={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
