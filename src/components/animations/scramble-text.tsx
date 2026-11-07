"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/components/providers/gsap-provider";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!<>-_\\/[]{}—=+*^?#01";

interface ScrambleTextOptions {
  /** Characters revealed per tick, left to right. */
  speed?: number;
  /** How many scrambled frames a character flickers through before locking. */
  scrambleFrames?: number;
}

/**
 * Imperative matrix-style decrypt effect: scrambles random glyphs then
 * progressively locks each character into the target string, left to right.
 */
export function runScrambleText(
  el: HTMLElement,
  text: string,
  { speed = 1, scrambleFrames = 10 }: ScrambleTextOptions = {},
  onComplete?: () => void,
) {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    el.textContent = text;
    onComplete?.();
    return () => {};
  }

  const chars = text.split("");
  const revealed = chars.map(() => false);
  let frame = 0;
  let raf = 0;

  const tick = () => {
    frame += 1;
    const revealCount = Math.min(chars.length, Math.floor(frame * speed * 0.6));
    let out = "";
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      if (char === " ") {
        out += " ";
        continue;
      }
      if (i < revealCount) {
        revealed[i] = true;
        out += char;
      } else if (i < revealCount + scrambleFrames) {
        out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      } else {
        out += " ";
      }
    }
    el.textContent = out;

    if (revealed.every(Boolean) || revealCount > chars.length + scrambleFrames) {
      el.textContent = text;
      onComplete?.();
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

interface ScrambleTextProps {
  text: string;
  as?: "span" | "p" | "h3" | "h4";
  className?: string;
  trigger: number;
  speed?: number;
  onStart?: () => void;
  onDone?: () => void;
}

/** Declarative wrapper: re-runs the scramble reveal whenever `trigger` changes. */
export function ScrambleText({
  text,
  as = "span",
  className,
  trigger,
  speed,
  onStart,
  onDone,
}: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const cleanupRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!ref.current || trigger === 0) return;
    cleanupRef.current();
    onStart?.();
    gsap.fromTo(ref.current, { opacity: 0.4 }, { opacity: 1, duration: 0.3 });
    cleanupRef.current = runScrambleText(ref.current, text, { speed }, onDone) ?? (() => {});
    return () => cleanupRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, text]);

  const Comp = as;
  return (
    <Comp ref={ref as never} className={className}>
      {trigger === 0 ? "" : text}
    </Comp>
  );
}
