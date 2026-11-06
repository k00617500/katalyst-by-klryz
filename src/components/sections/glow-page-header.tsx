"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, registerGsap } from "@/components/providers/gsap-provider";
import { TextReveal } from "@/components/animations/text-reveal";
import { FloatingShowcaseCards } from "@/components/sections/floating-showcase-cards";

registerGsap();

interface GlowPageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  badge?: string;
  marqueeItems?: string[];
  showFloatingCards?: boolean;
  children?: ReactNode;
}

export function GlowPageHeader({
  eyebrow,
  title,
  description,
  badge,
  marqueeItems,
  showFloatingCards = false,
  children,
}: GlowPageHeaderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (blobRef.current && !prefersReduced) {
        gsap.to(blobRef.current, {
          x: 40,
          y: -30,
          duration: 9,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }

      if (marqueeItems && marqueeItems.length > 0 && !prefersReduced) {
        gsap.to("[data-glow-marquee-track]", {
          xPercent: -50,
          duration: 20,
          ease: "none",
          repeat: -1,
        });
      }
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className="noise-overlay relative overflow-hidden">
      <div
        ref={blobRef}
        aria-hidden="true"
        className="glow-blob pointer-events-none absolute top-[-10%] right-[-10%] size-[50vw] max-w-[600px] rounded-full bg-accent-purple/20 blur-[120px]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute right-1/4 bottom-0 size-[30vw] max-w-[400px] rounded-full bg-accent-cyan/10 blur-[110px]" />
      <div aria-hidden="true" className="pointer-events-none absolute top-0 right-0 size-[25vw] max-w-[300px] rounded-full bg-accent-pink/10 blur-[100px]" />

      {showFloatingCards && <FloatingShowcaseCards />}

      <section className="container-page section-y relative">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <span className="inline-block font-mono text-xs tracking-[0.2em] text-brand-ink uppercase">
              {eyebrow}
            </span>
            <TextReveal
              text={title}
              as="h1"
              className="mt-4 max-w-3xl text-balance text-4xl font-medium tracking-tight md:text-6xl"
            />
            {description && (
              <p className="mt-6 max-w-xl font-space text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
                {description}
              </p>
            )}
          </div>
          {badge && (
            <span className="shrink-0 rounded-full bg-brand px-5 py-2 font-mono text-sm font-semibold text-brand-foreground">
              {badge}
            </span>
          )}
        </div>
        {children}
      </section>

      {marqueeItems && marqueeItems.length > 0 && (
        <div
          aria-hidden="true"
          className="relative z-10 overflow-hidden border-t border-border/60 py-4"
        >
          <div
            data-glow-marquee-track
            className="flex w-max items-center gap-10 whitespace-nowrap will-change-transform"
          >
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="flex items-center gap-10 font-mono text-xs tracking-wide text-muted-foreground uppercase"
              >
                {item}
                <span className="text-brand-ink">&bull;</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
