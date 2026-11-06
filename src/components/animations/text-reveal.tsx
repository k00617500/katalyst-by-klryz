"use client";

import { useRef, type ElementType } from "react";
import { gsap, useGSAP, registerGsap } from "@/components/providers/gsap-provider";

interface TextRevealProps {
  text: string;
  className?: string;
  as?: ElementType;
  delay?: number;
  scrollTriggered?: boolean;
}

registerGsap();

export function TextReveal({
  text,
  className,
  as: Tag = "span",
  delay = 0,
  scrollTriggered = false,
}: TextRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(" ");

  useGSAP(
    () => {
      if (!ref.current) return;
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const targets = ref.current.querySelectorAll<HTMLElement>("[data-word]");
      if (prefersReduced) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        targets,
        { opacity: 0, y: "100%" },
        {
          opacity: 1,
          y: "0%",
          duration: 0.9,
          delay,
          ease: "power4.out",
          stagger: 0.06,
          scrollTrigger: scrollTriggered
            ? {
                trigger: ref.current,
                start: "top 85%",
                toggleActions: "play none none reverse",
              }
            : undefined,
        },
      );
    },
    { scope: ref },
  );

  const Element = Tag as ElementType;

  return (
    <Element ref={ref} className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-block overflow-hidden align-top pb-[0.08em]"
          aria-hidden="true"
        >
          <span data-word className="inline-block will-change-transform">
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        </span>
      ))}
    </Element>
  );
}
