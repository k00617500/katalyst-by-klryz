"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Mouse, Pause, Play } from "lucide-react";
import { gsap, useGSAP, registerGsap } from "@/components/providers/gsap-provider";
import { projects } from "@/data/projects";

registerGsap();

const introSlide = { slug: "intro", title: "Hello, I'm Meryll Klaryze", thumbnail: "/images/project (1).png", href: "" };
const projectSlides = projects.map((project) => ({ ...project, href: `/projects/${project.slug}` }));
type Mode = "scroll" | "paused" | "autoplay";

export function ProjectCarousel({ showIntro = true, ariaLabel = "Project showcase", compact = false }: { showIntro?: boolean; ariaLabel?: string; compact?: boolean }) {
  const slides = showIntro ? [introSlide, ...projectSlides] : projectSlides;
  // Matching end cards let the track cross either boundary before resetting invisibly.
  const loopSlides = [slides[slides.length - 1], ...slides, slides[0]];
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<Mode>("autoplay");
  const scrollProgressRef = useRef(0);
  const movingRef = useRef(false);
  const touchStartRef = useRef<number | null>(null);
  const [position, setPosition] = useState(1);
  const [instant, setInstant] = useState(false);
  const [mode, setMode] = useState<Mode>("autoplay");
  const reduced = useReducedMotion();
  const index = (position - 1 + slides.length) % slides.length;
  const autoplay = mode === "autoplay" && !reduced;

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setInterval(() => {
      if (movingRef.current) return;
      movingRef.current = true;
      setInstant(false);
      setPosition((previous) => previous + 1);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [autoplay, index]);

  const selectSlide = (next: number) => {
    if (movingRef.current) return;
    setMode("paused");
    setInstant(false);
    movingRef.current = true;
    setPosition(next);
  };

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(frameRef.current, { y: 24 }, {
        y: -24,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
          onUpdate: (self) => {
            scrollProgressRef.current = self.progress;
            if (modeRef.current === "scroll") {
              setInstant(false);
              setPosition(Math.min(slides.length, Math.floor(self.progress * slides.length) + 1));
            }
          },
        },
      });
    });
    return () => media.revert();
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} aria-label={ariaLabel} aria-roledescription="carousel" className={`showcase-carousel border-t border-border/60 py-12 md:py-16 ${compact ? "showcase-carousel--compact" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          selectSlide(position + (event.key === "ArrowLeft" ? -1 : 1));
        }
      }}>
      <div ref={frameRef}>
        <div className="overflow-hidden py-1"
          onTouchStart={(event) => { touchStartRef.current = event.touches[0].clientX; }}
          onTouchEnd={(event) => {
            if (touchStartRef.current === null) return;
            const distance = touchStartRef.current - event.changedTouches[0].clientX;
            if (Math.abs(distance) > 45) selectSlide(position + (distance > 0 ? 1 : -1));
            touchStartRef.current = null;
          }}>
          <motion.div className="showcase-track"
            initial={false}
            animate={{ x: `calc(-${position * 100}% - ${position} * var(--showcase-gap))` }}
            transition={{ duration: reduced || instant ? 0 : 0.85, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => {
              movingRef.current = false;
              if (position === 0 || position === slides.length + 1) {
                setInstant(true);
                setPosition(position === 0 ? slides.length : 1);
              }
            }}>
            {loopSlides.map((slide, slidePosition) => {
              const active = slidePosition === position;
              const image = (
                <motion.div className="absolute inset-0" initial={false}
                  animate={{ x: reduced ? 0 : Math.max(-1, Math.min(1, slidePosition - position)) * 24 }}
                  transition={{ duration: instant || reduced ? 0 : 1, ease: [0.22, 1, 0.36, 1] }}>
                  <Image src={slide.thumbnail} alt={slide.title} fill sizes="(min-width: 1440px) 1200px, 86vw" className="object-contain" />
                </motion.div>
              );
              return (
                <div key={`${slide.slug}-${slidePosition}`} role="group" aria-roledescription="slide" aria-label={`${(slidePosition - 1 + slides.length) % slides.length + 1} of ${slides.length}: ${slide.title}`} aria-hidden={!active} className="showcase-card relative aspect-video shrink-0 overflow-hidden rounded-3xl border border-border bg-black md:rounded-[32px]">
                  {slide.href ? <Link href={slide.href} tabIndex={active ? 0 : -1} aria-label={`View ${slide.title}`} className="absolute inset-0">{image}</Link> : image}
                </div>
              );
            })}
          </motion.div>
        </div>
        <div className="mx-auto mt-6 flex w-fit max-w-full flex-wrap items-center justify-center gap-3 px-4">
          <div className="flex h-12 items-center gap-2 rounded-full bg-secondary px-4" aria-label="Choose a slide">
            {slides.map((slide, i) => (
              <button key={slide.slug} type="button" aria-label={`Go to ${slide.title}`} aria-current={i === index ? "true" : undefined} onClick={() => { if (i !== index) selectSlide(i + 1); }} className="flex h-10 items-center justify-center px-0.5 focus-visible:outline-2 focus-visible:outline-brand">
                <span className={`block h-1.5 overflow-hidden rounded-full bg-foreground/30 transition-[width] duration-300 ${i === index ? "w-8 sm:w-10" : "w-1.5"}`}>
                  {i === index && <span key={`${index}-${autoplay}`} className={`block h-full origin-left rounded-full bg-foreground ${autoplay ? "carousel-progress" : ""}`} />}
                </span>
              </button>
            ))}
          </div>
          <button type="button" aria-label={autoplay ? "Pause carousel" : "Play carousel"} onClick={() => setMode(autoplay ? "paused" : "autoplay")} className="showcase-control size-12">{autoplay ? <Pause className="size-5" fill="currentColor" /> : <Play className="size-5" fill="currentColor" />}</button>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous slide" onClick={() => selectSlide(position - 1)} className="showcase-control size-10"><ArrowLeft className="size-4" /></button>
            <button type="button" aria-label="Next slide" onClick={() => selectSlide(position + 1)} className="showcase-control size-10"><ArrowRight className="size-4" /></button>
            <button type="button" aria-label="Follow page scroll" aria-pressed={mode === "scroll"} onClick={() => { movingRef.current = false; setMode("scroll"); setInstant(false); setPosition(Math.min(slides.length, Math.floor(scrollProgressRef.current * slides.length) + 1)); }} className={`showcase-control size-10 ${mode === "scroll" ? "ring-2 ring-brand" : ""}`}><Mouse className="size-4" /></button>
          </div>
        </div>
        <p className="sr-only" aria-live={autoplay ? "off" : "polite"}>{slides[index].title}</p>
      </div>
    </section>
  );
}
