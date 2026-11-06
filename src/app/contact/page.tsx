import type { Metadata } from "next";
import { TextReveal } from "@/components/animations/text-reveal";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { ContactForm } from "@/components/forms/contact-form";
import { SocialIconLinks } from "@/components/layout/social-icon-links";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch for collaborations, projects, or opportunities.",
};

export default function ContactPage() {
  return (
    <>
      <section className="container-page section-y">
        <span className="font-mono text-xs tracking-[0.2em] text-brand-ink uppercase">
          Contact
        </span>
        <TextReveal
          text="Have an idea? Let's build something."
          as="h1"
          className="mt-4 max-w-3xl text-balance text-4xl font-medium tracking-tight md:text-6xl"
        />
        <p className="mt-6 max-w-xl font-space text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
          {profile.availability}. Whether it&apos;s a product idea, a
          collaboration, or just a question — I&apos;d like to hear from you.
        </p>
      </section>

      <section className="container-page section-y grid gap-16 border-t border-border/60 lg:grid-cols-[1fr_1.3fr]">
        <ScrollReveal className="space-y-8">
          <div>
            <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
              Email
            </span>
            <p className="mt-2 text-lg">
              <a href={`mailto:${profile.email}`} className="hover:text-brand-ink">
                {profile.email}
              </a>
            </p>
          </div>
          <div>
            <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
              Phone
            </span>
            <p className="mt-2 text-lg">
              <a href={`tel:${profile.phone.replace(/\s/g, "")}`} className="hover:text-brand-ink">
                {profile.phone}
              </a>
            </p>
          </div>
          <div>
            <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
              Locations
            </span>
            {profile.locations.map((location) => (
              <p key={location} className="mt-2 text-lg">{location}</p>
            ))}
          </div>
          <div>
            <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
              Availability
            </span>
            <p className="mt-2 text-lg">{profile.availability}</p>
          </div>
          <div>
            <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
              Elsewhere
            </span>
            <div className="mt-3">
              <SocialIconLinks />
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <ContactForm />
        </ScrollReveal>
      </section>
    </>
  );
}
