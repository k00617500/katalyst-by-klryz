import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { expertiseAreas } from "@/data/skills";
import { ExpertiseSymbol } from "./expertise-symbol";

export function ExpertiseSection() {
  return (
    <section className="container-page section-y border-t border-border/60">
      <ScrollReveal>
        <SectionHeading
          eyebrow="What I Do"
          title="Expertise across the product lifecycle"
          className="mb-8 md:mb-10"
        />
      </ScrollReveal>

      <ScrollReveal
        stagger={0.06}
        className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4"
      >
        {expertiseAreas.map((area, i) => (
          <div key={area} className="group flex items-center gap-5 bg-background p-6 lg:min-h-40 lg:flex-col lg:items-start lg:justify-between lg:gap-5">
            <ExpertiseSymbol index={i} />
            <p className="text-lg font-medium tracking-tight transition-colors group-hover:text-brand-ink">
              {area}
            </p>
          </div>
        ))}
      </ScrollReveal>
    </section>
  );
}
