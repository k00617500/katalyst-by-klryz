import type { Metadata } from "next";
import Link from "next/link";
import { ProfilePortrait } from "@/components/ui/profile-portrait";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { GlowPageHeader } from "@/components/sections/glow-page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { profile } from "@/data/profile";
import { skillGroups, languages, interests, currentlyLearning } from "@/data/skills";

export const metadata: Metadata = {
  title: "About",
  description: profile.shortBio,
};

export default function AboutPage() {
  return (
    <>
      <GlowPageHeader
        eyebrow="About"
        title="The person behind the work."
        description={profile.shortBio}
        marqueeItems={profile.roles}
      />

      <section className="container-page section-y border-t border-border/60">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <ScrollReveal>
            <SectionHeading eyebrow="My Story" title="How I got here" />
            <div className="mt-6 space-y-6 text-balance text-base text-muted-foreground md:text-lg">
              <p>
                I&apos;m <span className="font-medium text-foreground">Meryll Klaryze</span> A.
                Polaron — a Business Application Developer, UI/UX Designer, and startup founder
                studying Information Systems at West Visayas State University, majoring in
                Business Application Development.
              </p>
              <p>{profile.bio[1]}</p>
              <div className="border-l-2 border-brand/60 pl-4 text-sm">
                <p className="mb-2 font-mono text-xs tracking-wide uppercase">Based in</p>
                {profile.locations.map((location) => <p key={location}>{location}</p>)}
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <ProfilePortrait className="mx-auto mb-8 max-w-[300px]" />
            <SectionHeading eyebrow="Philosophy" title="How I approach work" />
            <p className="mt-6 text-balance text-base text-muted-foreground md:text-lg">
              {profile.philosophy}
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="container-page section-y border-t border-border/60">
        <ScrollReveal>
          <SectionHeading eyebrow="Education" title="Academic background" className="mb-10" />
        </ScrollReveal>
        <ScrollReveal className="rounded-lg border border-border p-8">
          <p className="text-lg font-medium tracking-tight">{profile.education.school}</p>
          <p className="mt-2 text-muted-foreground">{profile.education.degree}</p>
          <p className="text-muted-foreground">Major in {profile.education.major}</p>
        </ScrollReveal>
      </section>

      <section className="container-page section-y border-t border-border/60">
        <ScrollReveal>
          <SectionHeading eyebrow="Skills" title="Technical skills" className="mb-10" />
        </ScrollReveal>
        <div className="space-y-10">
          <div className="space-y-10">
          {skillGroups.map((group, i) => (
            <ScrollReveal key={group.category} delay={i * 0.06}>
              <h3 className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
                {group.category}
              </h3>
              <ul className="mt-5 flex list-none flex-wrap gap-3">
                {group.skills.map((skill) => (
                  <li
                    key={skill}
                    className="rounded-md border border-border px-4 py-2.5 font-mono text-sm text-muted-foreground transition-colors hover:border-brand hover:bg-brand/5 hover:text-foreground md:text-base"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          ))}
          </div>

          <ScrollReveal delay={0.2}>
            <h3 className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
              Languages
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {languages.map((lang) => (
                <span
                  key={lang}
                  className="rounded-md border border-border px-4 py-2.5 font-mono text-sm text-muted-foreground md:text-base"
                >
                  {lang}
                </span>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.25}>
            <h3 className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
              Interests
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span
                  key={interest}
                  className="rounded-md border border-border px-4 py-2.5 font-mono text-sm text-muted-foreground md:text-base"
                >
                  {interest}
                </span>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="container-page section-y border-t border-border/60">
        <ScrollReveal>
          <SectionHeading
            eyebrow="Currently Learning"
            title="Technologies I'm exploring"
            className="mb-10"
          />
        </ScrollReveal>
        <ScrollReveal stagger={0.05} className="flex flex-wrap gap-2">
          {currentlyLearning.map((item) => (
            <span
              key={item}
              className="rounded-md border border-dashed border-border px-4 py-2.5 font-mono text-sm text-muted-foreground md:text-base"
            >
              {item}
            </span>
          ))}
        </ScrollReveal>
      </section>

      <section className="container-page section-y border-t border-border/60">
        <ScrollReveal className="flex flex-wrap items-center gap-6">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href={profile.resumeUrl} target="_blank">
              Download Résumé
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-8">
            <Link href="/contact">Get in touch</Link>
          </Button>
        </ScrollReveal>
      </section>
    </>
  );
}
