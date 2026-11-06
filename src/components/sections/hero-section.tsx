"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDown } from "lucide-react";
import { gsap, useGSAP, registerGsap } from "@/components/providers/gsap-provider";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/animations/magnetic-button";
import { profile } from "@/data/profile";
import { HeroPlayground } from "@/components/sections/hero-playground";

registerGsap();

const marqueeItems = [
  ...profile.roles,
  "Available for work",
  ...profile.roles,
  "Available for work",
];

export function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReduced) {
        gsap.set("[data-hero-animate]", { opacity: 1, y: 0 });
        return;
      }

      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      tl.fromTo(
        "[data-hero-badge]",
        { opacity: 0, scale: 0.8, rotate: -8 },
        { opacity: 1, scale: 1, rotate: -6, duration: 0.7 },
      )
        .fromTo(
          "[data-hero-eyebrow]",
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.6 },
          "-=0.4",
        )
        .fromTo(
          "[data-hero-line]",
          { opacity: 0, y: "110%" },
          { opacity: 1, y: "0%", duration: 0.9, stagger: 0.1 },
          "-=0.2",
        )
        .fromTo(
          "[data-hero-sub]",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7 },
          "-=0.4",
        )
        .fromTo(
          "[data-hero-cta]",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 },
          "-=0.4",
        );

      if (blobRef.current) {
        gsap.to(blobRef.current, {
          x: 60,
          y: -40,
          duration: 10,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }

      gsap.to("[data-marquee-track]", {
        xPercent: -50,
        duration: 22,
        ease: "none",
        repeat: -1,
      });
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      className="noise-overlay relative flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden md:min-h-[calc(100svh-5rem)]"
    >
      <div
        ref={blobRef}
        aria-hidden="true"
        className="glow-blob pointer-events-none absolute top-1/4 right-[-10%] size-[60vw] max-w-[700px] rounded-full bg-accent-purple/20 blur-[130px] md:size-[40vw]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-[-10%] size-[50vw] max-w-[600px] rounded-full bg-accent-cyan/10 blur-[150px]"
      />

      <div className="container-page relative flex flex-1 flex-col justify-center gap-5 py-8 md:gap-6 md:py-10">
        <div className="flex items-start justify-between gap-6">
          <span
            data-hero-eyebrow
            className="font-mono text-xs leading-relaxed tracking-[0.2em] text-accent-cyan uppercase"
          >
            {profile.headline}
          </span>

          <div
            data-hero-badge
            className="brand-surface hidden shrink-0 -rotate-6 items-center justify-center rounded-md px-5 py-2 font-mono text-sm font-semibold text-brand-foreground sm:flex"
          >
            {new Date().getFullYear()}
          </div>
        </div>

        <div className="grid items-center gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-4">
        <div className="relative z-10 flex min-w-0 flex-col gap-5 md:gap-6">
        <h1 aria-label={profile.heroHeadline} className="font-hero max-w-4xl text-[clamp(2.5rem,min(5.5vw,8svh),5rem)] leading-[1.08] font-semibold tracking-tight">
          <span className="block overflow-hidden pb-1">
            <span data-hero-line className="block">
              Building ideas
            </span>
          </span>
          <span className="block overflow-hidden pb-1">
            <span data-hero-line className="block">into digital</span>
          </span>
          <span className="block overflow-hidden pb-1">
            <span data-hero-line className="brand-gradient-text block">
              experiences.
            </span>
          </span>
        </h1>

        <p
          data-hero-sub
          className="max-w-xl font-space text-balance text-base leading-relaxed text-muted-foreground md:text-lg"
        >
          {profile.name} — {profile.roles[0]}, {profile.roles[1]}, {profile.roles[2]}.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <div data-hero-cta>
            <MagneticButton>
              <Button asChild size="lg" className="glow-border rounded-full px-7">
                <Link href="/projects">
                  View Projects
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </MagneticButton>
          </div>
          <div data-hero-cta>
            <MagneticButton>
              <Button asChild size="lg" variant="outline" className="rounded-full px-7">
                <Link href="/contact">Let&apos;s Connect</Link>
              </Button>
            </MagneticButton>
          </div>
          <div data-hero-cta>
            <Button asChild size="lg" variant="ghost" className="rounded-full px-5">
              <Link href={profile.resumeUrl} target="_blank">
                Download Résumé
              </Link>
            </Button>
          </div>
        </div>
        </div>
        <HeroPlayground />
        </div>
      </div>

      <div
        data-hero-cta
        className="relative z-10 flex items-center gap-2 border-t border-border/60 py-3 pl-6 font-mono text-xs text-muted-foreground md:pl-10 lg:pl-16"
      >
        <ArrowDown className="size-3.5 animate-bounce" />
        Scroll to explore
      </div>

      <div
        aria-hidden="true"
        className="relative z-10 overflow-hidden border-t border-border/60 py-3"
      >
        <div
          data-marquee-track
          className="flex w-max items-center gap-10 whitespace-nowrap will-change-transform"
        >
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="flex items-center gap-10 font-mono text-sm tracking-wide text-muted-foreground uppercase"
            >
              {item}
              <span className="text-brand-ink">&bull;</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
