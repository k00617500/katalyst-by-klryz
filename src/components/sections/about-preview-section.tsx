import Link from "next/link";
import { ProfilePortrait } from "@/components/ui/profile-portrait";
import { ArrowUpRight } from "lucide-react";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { profile } from "@/data/profile";

export function AboutPreviewSection() {
  return (
    <section className="container-page section-y border-t border-border/60">
      <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <ScrollReveal>
          <ProfilePortrait className="mx-auto max-w-[340px]" />
        </ScrollReveal>
        <ScrollReveal delay={0.1} className="space-y-6">
          <SectionHeading eyebrow="About" title="A builder with a designer's eye." />
          <p className="text-balance text-lg text-muted-foreground md:text-xl">
            {profile.bio[0]}
          </p>
          <p className="text-balance text-base text-muted-foreground">
            {profile.bio[1]}
          </p>
          <Button asChild variant="link" className="h-auto px-0 text-base">
            <Link href="/about">
              More about me
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
}
