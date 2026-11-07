"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, useGSAP, registerGsap } from "@/components/providers/gsap-provider";
import { ScrambleText } from "@/components/animations/scramble-text";
import { archetypes } from "@/data/archetypes";

registerGsap();

const DEFAULT_TEXT = "why 'the katalyst?'";

const ROW_1 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
const ROW_2 = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
const ROW_3 = ["z", "x", "c", "v", "b", "n", "m"];

function pickArchetype(excludeIndex: number | null) {
  if (archetypes.length <= 1) return 0;
  let next = excludeIndex;
  while (next === excludeIndex) {
    next = Math.floor(Math.random() * archetypes.length);
  }
  return next!;
}

export function ArchetypeKeyboardSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pressedKeys = useRef<Set<string>>(new Set());

  const [index, setIndex] = useState<number | null>(null);
  const [trigger, setTrigger] = useState(0);

  const pressEnterVisual = useCallback((el: HTMLElement | null, pressed: boolean) => {
    if (!el) return;
    gsap.to(el, {
      y: pressed ? 3 : 0,
      scale: pressed ? 0.96 : 1,
      duration: pressed ? 0.08 : 0.22,
      ease: pressed ? "power2.out" : "elastic.out(1, 0.5)",
    });
  }, []);

  const generate = useCallback(() => {
    setIndex((prev) => pickArchetype(prev));
    setTrigger((t) => t + 1);
  }, []);

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return;

      gsap.to("[data-enter-key]", {
        boxShadow: "0 6px 0 0 var(--brand-ink), 0 0 20px 4px color-mix(in oklch, var(--brand), transparent 40%)",
        duration: 1.3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });

      gsap.from("[data-vkey]", {
        opacity: 0,
        y: 14,
        duration: 0.5,
        ease: "power2.out",
        stagger: { each: 0.012, from: "start" },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      const keys = gsap.utils.toArray<HTMLElement>("[data-vkey]:not([data-enter-key])");
      const shimmer = gsap.timeline({ repeat: -1, delay: 1 });
      const tick = () => {
        const key = keys[Math.floor(Math.random() * keys.length)];
        if (!key) return;
        shimmer.to(key, { opacity: 0.45, duration: 0.12, ease: "power1.out" })
          .to(key, { opacity: 1, duration: 0.35, ease: "power1.inOut" })
          .call(() => {}, [], "+=" + (0.15 + Math.random() * 0.5));
      };
      for (let i = 0; i < 40; i++) tick();
    },
    { scope: sectionRef },
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.85 && rect.bottom > window.innerHeight * 0.15;
      if (!inView || event.key !== "Enter") return;

      event.preventDefault();
      if (!pressedKeys.current.has("Enter")) {
        pressedKeys.current.add("Enter");
        const enterEl = sectionRef.current.querySelector<HTMLElement>("[data-enter-key]");
        pressEnterVisual(enterEl, true);
      }
      generate();
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.key !== "Enter") return;
      pressedKeys.current.delete("Enter");
      const enterEl = sectionRef.current?.querySelector<HTMLElement>("[data-enter-key]");
      pressEnterVisual(enterEl ?? null, false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [generate, pressEnterVisual]);

  const archetype = index !== null ? archetypes[index] : null;
  const displayText = archetype
    ? `${archetype.name} — ${archetype.description}`.toLowerCase()
    : DEFAULT_TEXT;

  return (
    <section
      ref={sectionRef}
      className="archetype-section container-page section-y relative overflow-hidden border-t border-border/60"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="archetype-display min-h-[5.5rem]" aria-live="polite">
          <ScrambleText
            key={index ?? "default"}
            text={displayText}
            trigger={trigger || 1}
            speed={1.8}
            as="p"
            className="font-mono text-balance text-xl leading-relaxed text-muted-foreground md:text-2xl"
          />
        </div>

        <div
          className="vkeyboard mt-10"
          role="group"
          aria-label="Press the Enter key to generate an archetype"
        >
          <div className="vkeyboard-row">
            {ROW_1.map((k) => (
              <span key={k} data-vkey className="vkey">
                {k}
              </span>
            ))}
          </div>
          <div className="vkeyboard-row">
            {ROW_2.map((k) => (
              <span key={k} data-vkey className="vkey">
                {k}
              </span>
            ))}
            <button
              type="button"
              data-vkey
              data-enter-key
              className="vkey vkey-enter"
              aria-label="Generate a Katalyst archetype"
              onClick={generate}
              onPointerDown={(e) => pressEnterVisual(e.currentTarget, true)}
              onPointerUp={(e) => pressEnterVisual(e.currentTarget, false)}
              onPointerLeave={(e) => pressEnterVisual(e.currentTarget, false)}
            >
              enter
            </button>
          </div>
          <div className="vkeyboard-row">
            {ROW_3.map((k) => (
              <span key={k} data-vkey className="vkey">
                {k}
              </span>
            ))}
          </div>
          <div className="vkeyboard-row">
            <span data-vkey className="vkey vkey-space" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
