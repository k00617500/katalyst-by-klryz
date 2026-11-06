"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGSAP, registerGsap } from "@/components/providers/gsap-provider";

interface ParallaxImageProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  strength?: number;
  sizes?: string;
  priority?: boolean;
}

registerGsap();

export function ParallaxImage({
  src,
  alt,
  className,
  wrapperClassName,
  strength = 15,
  sizes,
  priority,
}: ParallaxImageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!wrapperRef.current || !imageRef.current) return;
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (prefersReduced) return;

      gsap.fromTo(
        imageRef.current,
        { yPercent: -strength },
        {
          yPercent: strength,
          ease: "none",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    },
    { scope: wrapperRef },
  );

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden ${wrapperClassName ?? ""}`}
    >
      <div ref={imageRef} className="absolute inset-[-15%]">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={`object-cover ${className ?? ""}`}
        />
      </div>
    </div>
  );
}
