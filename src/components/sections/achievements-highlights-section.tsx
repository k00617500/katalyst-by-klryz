import Link from "next/link";
import { ArrowUpRight, Award } from "lucide-react";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { achievements } from "@/data/achievements";

const highlightIds = ["nextgenph-2025", "aideas-2025", "silver-medal-academic-award"];

export function AchievementsHighlightsSection() {
  const highlights = achievements.filter((a) => highlightIds.includes(a.id));

  return (
    <section className="container-page section-y border-t border-border/60">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <ScrollReveal>
          <SectionHeading eyebrow="Recognition" title="Selected achievements" />
        </ScrollReveal>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/achievements">
            All achievements
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </div>

      <ScrollReveal stagger={0.1} className="divide-y divide-border border-t border-border">
        {highlights.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-4 py-5 transition-colors"
          >
            <Award className="size-4 shrink-0 text-brand-ink transition-transform duration-300 group-hover:scale-110" />
            <p className="font-medium tracking-tight">{item.title}</p>
            {item.organization && (
              <p className="ml-auto text-sm text-muted-foreground">{item.organization}</p>
            )}
          </div>
        ))}
      </ScrollReveal>
    </section>
  );
}
