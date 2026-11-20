import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Download } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/project-card";
import { getProjectBySlug, projects } from "@/data/projects";

// Beta/open-source projects that spectators can try live via a QR code, and the beta-tester call-out that goes with it.
const betaProjects = new Set(["merkaventures", "dwellr"]);

// Every project with a live link shows a QR code. Projects that aren't open for beta testing say who they are for instead.
const liveAccessCopy: Record<string, { eyebrow: string; body: string }> = {
  asenxo: {
    eyebrow: "DOST SETUP 4.0 · WVSU CICT · Live",
    body: "Scan the QR code or use the link to open the running system. ASENXO is built for the DOST SETUP 4.0 iFund Program and the WVSU College of Information and Communications Technology, so it isn\u2019t open for beta testing.",
  },
};

async function getManualUrl(slug: string) {
  const filename = `${slug}-user-manual.pdf`;
  try {
    const file = await stat(join(process.cwd(), "public", "docs", filename));
    return file.isFile() && file.size > 0 ? `/docs/${filename}` : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

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

  const manualUrl = await getManualUrl(project.slug);
  const showLiveAccess = !!project.liveUrl;
  const isBeta = betaProjects.has(project.slug);
  const customCopy = liveAccessCopy[project.slug];
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

      {showLiveAccess && project.liveUrl && (
        <section
          id="try-it-live"
          aria-labelledby="try-it-live-title"
          className="mx-auto mt-10 w-full max-w-[840px] px-6 md:mt-12 md:px-10"
        >
          <div className="flex flex-col items-center gap-6 rounded-lg border border-border bg-card p-6 text-card-foreground sm:flex-row md:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/qr/${project.slug}.svg`}
              alt={`QR code that opens ${project.title} live`}
              width={176}
              height={176}
              className="size-40 shrink-0 rounded-md bg-white p-2 md:size-44"
            />
            <div className="text-center sm:text-left">
              <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                {customCopy ? customCopy.eyebrow : isBeta ? "Open source \u00b7 Live \u00b7 Beta" : "Live"}
              </p>
              <h2 id="try-it-live-title" className="mt-2 text-xl font-medium tracking-tight md:text-2xl">
                Try {project.title} live
              </h2>
              <p className="mt-3 font-space text-sm leading-relaxed text-muted-foreground md:text-base">
                {customCopy
                  ? customCopy.body
                  : isBeta
                    ? "Scan the QR code or use the link to open the running app. This is an open-source project, and I\u2019d be glad to have beta-testers \u2014 try it out and tell me what you think."
                    : "Scan the QR code or use the link to open the running app."}
              </p>
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block break-all font-mono text-sm underline underline-offset-4"
              >
                {project.liveUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Button asChild className="rounded-full">
                  <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                    Open Live App
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                </Button>
                {isBeta && (
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href="/contact">Become a Beta-Tester</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

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

      {manualUrl && (
        <section
          id="user-manual"
          aria-labelledby="user-manual-title"
          className="mx-auto w-full max-w-[840px] scroll-mt-28 px-6 pb-12 md:px-10 md:pb-16"
        >
          <div className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 md:p-5">
              <h2 id="user-manual-title" className="text-xl font-medium tracking-tight">
                User Manual
              </h2>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="rounded-full">
                  <a href={manualUrl} target="_blank" rel="noopener noreferrer">
                    Open PDF
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                </Button>
                <Button asChild className="rounded-full">
                  <a href={manualUrl} download>
                    <Download aria-hidden="true" />
                    Download PDF
                  </a>
                </Button>
              </div>
            </div>
            <iframe
              src={`${manualUrl}#view=FitH`}
              title={`${project.title} user manual`}
              loading="lazy"
              className="block h-[min(75vh,48rem)] min-h-96 w-full border-0 bg-muted"
            />
          </div>
        </section>
      )}

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
