"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CornerDownLeft } from "lucide-react";
import { gsap, useGSAP, registerGsap } from "@/components/providers/gsap-provider";
import { SectionHeading } from "@/components/ui/section-heading";
import { ScrambleText } from "@/components/animations/scramble-text";
import { archetypes } from "@/data/archetypes";

registerGsap();

type SceneControls = { pulse: () => void; dispose: () => void };

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
  const sceneHost = useRef<HTMLDivElement>(null);
  const sceneControls = useRef<SceneControls | null>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const pressedKeys = useRef<Set<string>>(new Set());

  const [index, setIndex] = useState<number | null>(null);
  const [trigger, setTrigger] = useState(0);
  const [count, setCount] = useState(0);
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    import("./archetype-scene").then(({ createArchetypeScene }) => {
      if (cancelled || !sceneHost.current) return;
      const scene = createArchetypeScene(sceneHost.current);
      sceneControls.current = scene;
      dispose = scene.dispose;
    }).catch(() => {});
    return () => { cancelled = true; sceneControls.current = null; dispose?.(); };
  }, []);

  const pressKeyVisual = useCallback((el: HTMLElement | null, pressed: boolean) => {
    if (!el) return;
    gsap.to(el, {
      y: pressed ? 4 : 0,
      scale: pressed ? 0.97 : 1,
      boxShadow: pressed
        ? "0 1px 0 0 var(--keycap-shadow)"
        : "0 6px 0 0 var(--keycap-shadow)",
      duration: pressed ? 0.08 : 0.22,
      ease: pressed ? "power2.out" : "elastic.out(1, 0.5)",
    });
  }, []);

  const generate = useCallback(() => {
    setIndex((prev) => pickArchetype(prev));
    setTrigger((t) => t + 1);
    setCount((c) => c + 1);
    setRevealing(true);
    sceneControls.current?.pulse();
    if (enterRef.current) {
      gsap.fromTo(
        enterRef.current,
        { boxShadow: "0 0 0 0 color-mix(in oklch, var(--brand), transparent 30%)" },
        {
          boxShadow: "0 0 0 14px color-mix(in oklch, var(--brand), transparent 100%)",
          duration: 0.6,
          ease: "power2.out",
        },
      );
    }
  }, []);

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return;

      gsap.to("[data-key-glow]", {
        boxShadow: "0 6px 0 0 var(--keycap-shadow), 0 0 22px 4px color-mix(in oklch, var(--brand), transparent 35%)",
        duration: 1.4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: 0.3,
      });

      gsap.from("[data-key]", {
        opacity: 0,
        y: 24,
        scale: 0.85,
        duration: 0.6,
        ease: "back.out(2)",
        stagger: 0.07,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });
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
      if (!inView) return;

      const key = event.key === " " ? "Space" : event.key;
      const keyEl = sectionRef.current.querySelector<HTMLElement>(`[data-physical-key="${key}"]`);
      if (keyEl && !pressedKeys.current.has(key)) {
        pressedKeys.current.add(key);
        pressKeyVisual(keyEl, true);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        generate();
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      const key = event.key === " " ? "Space" : event.key;
      pressedKeys.current.delete(key);
      const keyEl = sectionRef.current?.querySelector<HTMLElement>(`[data-physical-key="${key}"]`);
      pressKeyVisual(keyEl ?? null, false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [generate, pressKeyVisual]);

  const archetype = index !== null ? archetypes[index] : null;

  return (
    <section
      ref={sectionRef}
      className="archetype-section container-page section-y relative overflow-hidden border-t border-border/60"
    >
      <div ref={sceneHost} aria-hidden="true" className="archetype-scene-host" />

      <div className="relative grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <SectionHeading
            eyebrow="Interactive"
            title="Why &apos;The Katalyst?&apos;"
            className="mb-6 max-w-none"
          />
          <p className="font-space text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
            Every catalyst needs a trigger. Press{" "}
            <span className="font-heading font-semibold text-foreground">Enter</span> — on
            screen or on your own keyboard — and let it generate the role I play in the work I
            take on.
          </p>

          <div className="mt-10 flex flex-wrap items-end gap-6">
            <div className="keyboard-cluster" role="group" aria-label="Press Enter to generate an archetype">
              <div
                data-key
                data-key-glow
                data-physical-key="w"
                aria-hidden="true"
                className="keycap keycap-accent keycap-w"
                onPointerDown={(e) => pressKeyVisual(e.currentTarget, true)}
                onPointerUp={(e) => pressKeyVisual(e.currentTarget, false)}
                onPointerLeave={(e) => pressKeyVisual(e.currentTarget, false)}
              >
                w
              </div>
              <div
                data-key
                data-key-glow
                data-physical-key="h"
                aria-hidden="true"
                className="keycap keycap-accent keycap-h"
                onPointerDown={(e) => pressKeyVisual(e.currentTarget, true)}
                onPointerUp={(e) => pressKeyVisual(e.currentTarget, false)}
                onPointerLeave={(e) => pressKeyVisual(e.currentTarget, false)}
              >
                h
              </div>
              <div
                data-key
                data-physical-key="y"
                aria-hidden="true"
                className="keycap keycap-y"
                onPointerDown={(e) => pressKeyVisual(e.currentTarget, true)}
                onPointerUp={(e) => pressKeyVisual(e.currentTarget, false)}
                onPointerLeave={(e) => pressKeyVisual(e.currentTarget, false)}
              >
                y
              </div>
              <div
                data-key
                data-physical-key="?"
                aria-hidden="true"
                className="keycap keycap-q"
                onPointerDown={(e) => pressKeyVisual(e.currentTarget, true)}
                onPointerUp={(e) => pressKeyVisual(e.currentTarget, false)}
                onPointerLeave={(e) => pressKeyVisual(e.currentTarget, false)}
              >
                ?
              </div>
              <button
                ref={enterRef}
                type="button"
                data-key
                data-physical-key="Enter"
                className="keycap keycap-enter"
                aria-label="Generate a Katalyst archetype"
                onPointerDown={(e) => pressKeyVisual(e.currentTarget, true)}
                onPointerUp={(e) => pressKeyVisual(e.currentTarget, false)}
                onPointerLeave={(e) => pressKeyVisual(e.currentTarget, false)}
                onClick={generate}
              >
                <CornerDownLeft className="size-5" strokeWidth={2.5} />
                <span>Enter</span>
              </button>
            </div>

            <p className="font-mono text-xs tracking-[0.15em] text-muted-foreground uppercase">
              {count === 0 ? "Press to begin" : `Generated ${count} time${count === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <div className="archetype-readout" aria-live="polite">
          <div className="archetype-readout-chrome">
            <span className="archetype-dot" />
            <span className="archetype-dot" />
            <span className="archetype-dot" />
            <span className="ml-3 font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              archetype.exe
            </span>
          </div>
          <div className="archetype-readout-body">
            {!archetype ? (
              <p className="font-mono text-sm text-muted-foreground">
                <span className="archetype-cursor">_</span> waiting for input…
              </p>
            ) : (
              <>
                <p className="font-mono text-xs tracking-[0.2em] text-brand-ink uppercase">
                  You are
                </p>
                <ScrambleText
                  key={index}
                  text={archetype.name}
                  trigger={trigger}
                  speed={1.6}
                  as="h3"
                  className="font-heading mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
                  onDone={() => setRevealing(false)}
                />
                <p
                  className="font-space mt-4 text-balance text-sm leading-relaxed text-muted-foreground transition-opacity duration-500 md:text-base"
                  style={{ opacity: revealing ? 0.3 : 1 }}
                >
                  {archetype.description}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
