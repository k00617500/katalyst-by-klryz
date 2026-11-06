import { TextReveal } from "@/components/animations/text-reveal";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { ContactForm } from "@/components/forms/contact-form";
import { SocialIconLinks } from "@/components/layout/social-icon-links";
import { profile } from "@/data/profile";

export function ContactCtaSection() {
  return (
    <section className="container-page section-y border-t border-border/60">
      <div className="grid gap-16 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-6">
          <span className="font-mono text-xs tracking-[0.2em] text-brand-ink uppercase">
            Let&apos;s talk
          </span>
          <TextReveal
            text="Let's build the next thing."
            as="h2"
            scrollTriggered
            className="max-w-sm text-balance text-4xl font-medium tracking-tight md:text-5xl"
          />
          <p className="max-w-sm font-space text-balance text-base leading-relaxed text-muted-foreground">
            Bring the rough idea, the half-built draft, or just a question —
            I&apos;ll help shape it into something worth shipping.
          </p>
          <ScrollReveal delay={0.2} className="flex flex-col gap-3">
            <a
              href={`mailto:${profile.email}`}
              className="font-mono text-sm text-muted-foreground hover:text-foreground"
            >
              {profile.email}
            </a>
            <a
              href={`tel:${profile.phone.replace(/\s/g, "")}`}
              className="font-mono text-sm text-muted-foreground hover:text-foreground"
            >
              {profile.phone}
            </a>
            <SocialIconLinks className="mt-2" />
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.1}>
          <ContactForm />
        </ScrollReveal>
      </div>
    </section>
  );
}
