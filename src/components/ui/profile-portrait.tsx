"use client";
import Image from "next/image";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export function ProfilePortrait({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return <div data-parallax className={cn("w-full [perspective:1000px]", className)}>
    <div ref={ref} onPointerMove={(event) => {
      if (event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      event.currentTarget.style.transform = `rotateX(${-y * 12}deg) rotateY(${x * 14}deg) skew(${x}deg, ${y}deg)`;
    }} onPointerLeave={() => { if (ref.current) ref.current.style.transform = ""; }} className="relative aspect-[4/5] overflow-hidden rounded-lg transition-transform duration-200 ease-out will-change-transform">
      <Image src="/images/profile/profile-img-w.png" alt="Meryll Klaryze Polaron" fill sizes="(min-width: 1024px) 440px, 85vw" className="object-cover dark:hidden" />
      <Image src="/images/profile/profile-img-b.png" alt="Meryll Klaryze Polaron" fill sizes="(min-width: 1024px) 440px, 85vw" className="hidden object-cover dark:block" />
    </div>
  </div>;
}
