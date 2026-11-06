import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TextReveal } from "@/components/animations/text-reveal";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { experienceEntries } from "@/data/experience";
import { profile } from "@/data/profile";
import { webinarSessions } from "@/data/participation";

export const metadata: Metadata = {
  title: "Experience",
  description:
    "Professional experience, startup work, and organizational leadership.",
};

const typeLabels: Record<string, string> = {
  work: "Full-time",
  startup: "Startup",
  organization: "Organization",
  freelance: "Freelance",
  research: "Undergraduate Research",
};

export default function ExperiencePage() {
  return (
    <>
      <section className="container-page section-y">
        <span className="font-mono text-xs tracking-[0.2em] text-brand-ink uppercase">
          Experience
        </span>
        <TextReveal
          text="Professional work, startups, and leadership."
          as="h1"
          className="mt-4 max-w-3xl text-balance text-4xl font-medium tracking-tight md:text-6xl"
        />
      </section>

      <section className="container-page section-y border-t border-border/60">
        <SectionHeading
          eyebrow="Overview"
          title="A record of where I've contributed"
          description="From founding a startup to leading creative and media teams, here's where I've put in the work."
          className="mb-14"
        />

        <div className="space-y-10">
          {experienceEntries.map((entry, i) => (
            <ScrollReveal
              key={entry.id}
              delay={(i % 4) * 0.05}
              className="flex gap-5"
            >
              <div aria-hidden="true" className="flex w-3 shrink-0 flex-col items-center pt-2">
                <div className="size-2 rounded-full bg-accent-cyan" />
                {i < experienceEntries.length - 1 && (
                  <div className="mt-2 w-px flex-1 bg-border" />
                )}
              </div>

              <div className="flex-1 pb-2">
                <h3 className="text-xl font-medium tracking-tight">
                  {entry.website ? (
                    <a href={entry.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition-colors hover:text-accent-cyan">
                      {entry.organization}<ArrowUpRight className="size-4" />
                    </a>
                  ) : entry.organization}
                </h3>
                <p className="font-mono text-xs text-muted-foreground uppercase">
                  {typeLabels[entry.type]}
                  {entry.location ? ` · ${entry.location}` : ""}
                </p>

                <div className="mt-4">
                  <p className="font-medium">{entry.position}</p>
                  {entry.dateLabel && <p className="font-mono text-xs text-muted-foreground">{entry.dateLabel}</p>}
                  {entry.startDate && (
                    <p className="font-mono text-xs text-muted-foreground">
                      {entry.startDate.toUpperCase()}
                      {entry.current
                        ? " — PRESENT"
                        : entry.endDate
                          ? ` — ${entry.endDate.toUpperCase()}`
                          : ""}
                    </p>
                  )}
                  {entry.description && (
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                      {entry.description}
                    </p>
                  )}
                  {entry.responsibilities && entry.responsibilities.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {entry.responsibilities.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  )}
                  {entry.skills && entry.skills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {entry.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md border border-border px-3 py-1 font-mono text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="container-page section-y border-t border-border/60">
        <SectionHeading eyebrow="Participation" title="Attended webinar sessions" description="West Visayas State University · Zoom · Certificates of Participation" className="mb-10" />
        <div className="divide-y divide-border border-t border-border">
          {webinarSessions.map((session) => <article key={session.title} className="grid gap-3 py-6 md:grid-cols-[160px_1fr] md:gap-8">
            <time dateTime={session.date} className="font-mono text-xs text-muted-foreground">{new Date(`${session.date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time>
            <div><h3 className="text-lg font-medium">{session.title}</h3><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{session.summary}</p><p className="mt-2 font-mono text-xs text-muted-foreground">Certificate issued {new Date(`${session.issued}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p></div>
          </article>)}
        </div>
      </section>
      <section className="container-page section-y border-t border-border/60">
        <ScrollReveal className="flex flex-wrap items-center gap-6">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href={profile.resumeUrl} target="_blank">
              Download Résumé
            </Link>
          </Button>
        </ScrollReveal>
      </section>
    </>
  );
}
