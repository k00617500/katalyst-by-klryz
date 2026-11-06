"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, registerGsap } from "@/components/providers/gsap-provider";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  duration?: number;
  as?: "div" | "section";
  stagger?: number;
}

registerGsap();

export function ScrollReveal({
  children,
  className,
  y = 32,
  delay = 0,
  duration = 0.8,
  as = "div",
  stagger,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (prefersReduced) return;

      const targets = stagger
        ? gsap.utils.toArray<HTMLElement>(ref.current.children)
        : ref.current;

      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: "power3.out",
          stagger,
          scrollTrigger: {
            trigger: ref.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        },
      );
    },
    { scope: ref },
  );

  const Comp = as;
  return (
    <Comp ref={ref} className={className}>
      {children}
    </Comp>
  );
}
