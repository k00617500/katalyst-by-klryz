import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { profile } from "@/data/profile";

export function CurrentlyExploringSection() {
  return (
    <section className="container-page section-y border-t border-border/60">
      <ScrollReveal>
        <SectionHeading
          eyebrow="Currently Exploring"
          title="What I'm learning right now"
          className="mb-10"
        />
      </ScrollReveal>

      <ScrollReveal stagger={0.05} className="flex flex-wrap gap-3">
        {profile.currentlyExploring.map((item) => (
          <span
            key={item}
            className="rounded-full border border-border px-4 py-2 font-mono text-sm text-muted-foreground"
          >
            {item}
          </span>
        ))}
      </ScrollReveal>
    </section>
  );
}
