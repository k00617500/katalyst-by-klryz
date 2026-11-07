"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/components/providers/gsap-provider";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!<>-_\\/[]{}—=+*^?#01";

interface ScrambleTextOptions {
  /** Characters locked in per frame, left to right — lower is slower. */
  speed?: number;
  /** Frames of full-string noise before the reveal begins (builds suspense). */
  holdFrames?: number;
}

/**
 * Matrix-style decrypt effect: the whole string flickers as random glyphs,
 * then characters lock into place left to right, slowly, so the reveal
 * reads as deliberate rather than a glitch.
 */
export function runScrambleText(
  el: HTMLElement,
  text: string,
  { speed = 0.45, holdFrames = 18 }: ScrambleTextOptions = {},
  onComplete?: () => void,
) {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    el.textContent = text;
    onComplete?.();
    return () => {};
  }

  const chars = text.split("");
  let frame = 0;
  let raf = 0;

  const tick = () => {
    frame += 1;
    const revealCount =
      frame <= holdFrames ? 0 : Math.min(chars.length, Math.floor((frame - holdFrames) * speed));
    let out = "";
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      if (char === " ") {
        out += " ";
      } else if (i < revealCount) {
        out += char;
      } else {
        out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
    }
    el.textContent = out;

    if (revealCount >= chars.length) {
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
  holdFrames?: number;
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
  holdFrames,
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
    cleanupRef.current = runScrambleText(ref.current, text, { speed, holdFrames }, onDone) ?? (() => {});
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
