import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, GraduationCap, Laptop, MapPin, Newspaper, Rocket } from "lucide-react";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { experienceEntries } from "@/data/experience";

const highlightIds = ["asenxo-thesis", "foreal-solutions", "wvsu-binhi-tbi", "techyger", "icon-publication"];

export function ExperienceHighlightsSection() {
  const highlights = experienceEntries.filter((entry) => highlightIds.includes(entry.id));
  return <section className="container-page section-y border-t border-border/60">
    <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <ScrollReveal><SectionHeading eyebrow="Experience" title="Where I've put in the work" description="Building products, shaping brands, and leading creative work." /></ScrollReveal>
      <Button asChild variant="outline" className="rounded-full"><Link href="/experience">Full experience <ArrowUpRight className="size-4" /></Link></Button>
    </div>
    <div className="grid gap-5 md:grid-cols-2">
      {highlights.map((entry) => {
        const Icon = entry.id === "foreal-solutions" ? Laptop : entry.type === "research" ? GraduationCap : entry.type === "startup" ? Rocket : entry.type === "organization" ? Newspaper : BriefcaseBusiness;
        return <ScrollReveal key={entry.id} className={`group rounded-lg border border-border p-6 transition-colors hover:border-brand/60 hover:bg-brand/5 md:p-7 ${entry.type === "research" ? "md:col-span-2" : ""}`}>
          <article className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4"><Icon className="size-5 text-brand-ink transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-6" /><span className="font-mono text-xs text-muted-foreground">{entry.dateLabel ?? `${entry.startDate} — ${entry.current ? "Present" : entry.endDate}`}</span></div>
            <h3 className="mt-5 text-xl font-medium tracking-tight">{entry.website ? <a href={entry.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-brand-ink">{entry.organization}<ArrowUpRight className="size-4" /></a> : entry.organization}</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed">{entry.position}</p>
            {entry.description && <p className="mt-3 max-w-3xl text-sm leading-relaxed">{entry.description}</p>}
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3" />{entry.location}</p>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{entry.responsibilities?.[0]}</p>
            <div className="mt-5 flex flex-wrap gap-2">{entry.skills?.map((skill) => <span key={skill} className="rounded border border-border px-2.5 py-1 font-mono text-xs text-muted-foreground">{skill}</span>)}</div>
          </article>
        </ScrollReveal>;
      })}
    </div>
  </section>;
}
