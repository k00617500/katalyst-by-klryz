"use client";

import { useRef } from "react";
import { gsap, useGSAP, registerGsap } from "@/components/providers/gsap-provider";

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  duration?: number;
}

registerGsap();

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  className,
  duration = 1.6,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const counter = { val: prefersReduced ? value : 0 };
      if (prefersReduced) {
        ref.current.textContent = `${prefix}${value}${suffix}`;
        return;
      }

      gsap.to(counter, {
        val: value,
        duration,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 90%",
          toggleActions: "play none none none",
        },
        onUpdate: () => {
          if (ref.current) {
            ref.current.textContent = `${prefix}${Math.round(counter.val)}${suffix}`;
          }
        },
      });
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className={className}>
      {prefix}
      {0}
      {suffix}
    </span>
  );
}
