"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, registerGsap } from "@/components/providers/gsap-provider";

interface HorizontalScrollProps {
  children: ReactNode;
  className?: string;
  trackClassName?: string;
}

registerGsap();

export function HorizontalScroll({
  children,
  className,
  trackClassName,
}: HorizontalScrollProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current || !trackRef.current) return;
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      if (prefersReduced || !isDesktop) return;

      const track = trackRef.current;
      const distance = track.scrollWidth - window.innerWidth;
      if (distance <= 0) return;

      gsap.to(track, {
        x: -distance,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => `+=${distance}`,
          scrub: 1,
          pin: true,
          invalidateOnRefresh: true,
        },
      });
    },
    { scope: sectionRef },
  );

  return (
    <div ref={sectionRef} className={className}>
      <div
        ref={trackRef}
        className={`flex flex-col gap-6 lg:w-max lg:flex-row ${trackClassName ?? ""}`}
      >
        {children}
      </div>
    </div>
  );
}
