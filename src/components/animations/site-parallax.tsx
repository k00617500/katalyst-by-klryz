"use client";
import { usePathname } from "next/navigation";
import { gsap, useGSAP, registerGsap } from "@/components/providers/gsap-provider";
registerGsap();

export function SiteParallax() {
  const pathname = usePathname();
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>("main h1, main section h2, main [data-parallax]").forEach((element) => {
        const distance = element.hasAttribute("data-parallax") ? (Number(element.getAttribute("data-parallax")) || 24) : 10;
        gsap.fromTo(element, { y: distance }, { y: -distance, ease: "none", scrollTrigger: { trigger: element, start: "top bottom", end: "bottom top", scrub: 0.8 } });
      });
    });
    return () => media.revert();
  }, { dependencies: [pathname], revertOnUpdate: true });
  return null;
}
