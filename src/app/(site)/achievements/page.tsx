import type { Metadata } from "next";
import { Award } from "lucide-react";
import { TextReveal } from "@/components/animations/text-reveal";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { achievements } from "@/data/achievements";
import type { AchievementCategory } from "@/types/achievement";

export const metadata: Metadata = {
  title: "Achievements",
  description: "Academic, startup, and competition recognition.",
};

const categoryLabels: Record<AchievementCategory, string> = {
  academic: "Academic",
  "startup-innovation": "Startup & Innovation",
  competition: "Competitions",
  certification: "Certifications",
};

const categoryIconColors: Record<AchievementCategory, string> = {
  academic: "text-brand-ink",
  "startup-innovation": "text-accent-purple",
  competition: "text-accent-pink",
  certification: "text-accent-cyan",
};

export default function AchievementsPage() {
  const grouped = achievements.reduce<Record<string, typeof achievements>>(
    (acc, item) => {
      acc[item.category] = acc[item.category] ?? [];
      acc[item.category].push(item);
      return acc;
    },
    {},
  );

  return (
    <>
      <section className="container-page section-y">
        <span className="font-mono text-xs tracking-[0.2em] text-brand-ink uppercase">
          Achievements
        </span>
        <TextReveal
          text="Recognition across academics and innovation."
          as="h1"
          className="mt-4 max-w-3xl text-balance text-4xl font-medium tracking-tight md:text-6xl"
        />
      </section>

      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="container-page section-y border-t border-border/60">
          <ScrollReveal>
            <SectionHeading
              eyebrow="Category"
              title={categoryLabels[category as AchievementCategory]}
              className="mb-10"
            />
          </ScrollReveal>
          <ScrollReveal stagger={0.08} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border p-6 transition-colors hover:border-brand"
              >
                <Award
                  className={`size-5 ${categoryIconColors[category as AchievementCategory]}`}
                />
                <p className="mt-4 text-lg font-medium tracking-tight">{item.title}</p>
                {item.organization && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.organization}
                  </p>
                )}
                {(item.dateLabel || item.year) && (
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {item.dateLabel ?? item.year}
                  </p>
                )}
                {item.description && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </ScrollReveal>
        </section>
      ))}
    </>
  );
}
