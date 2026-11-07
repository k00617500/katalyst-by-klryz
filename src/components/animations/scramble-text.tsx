"use client";

import { Fragment, useRef } from "react";
import { gsap, useGSAP } from "@/components/providers/gsap-provider";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!<>-_[]{}=+*^?#01";
const START_DELAY = 0.12;
const REVEAL_SPAN = 1.2;
const SCRAMBLE_DURATION = 0.08;

function scrambleWord(word: string) {
  return word.replace(/[a-z]/gi, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
}

export function ScrambleText({ text, animate }: { text: string; animate: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const announcementRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const announcement = announcementRef.current;
    if (!announcement || !ref.current) return;
    if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      announcement.textContent = text;
      return;
    }

    announcement.textContent = "";
    const words = ref.current.querySelectorAll<HTMLElement>("[data-scramble-word]");
    const wordInterval = REVEAL_SPAN / Math.max(1, words.length - 1);
    const reveal = gsap.timeline({ onComplete: () => { announcement.textContent = text; } });

    words.forEach((word, index) => {
      const letters = word.querySelector<HTMLElement>("[data-letters]")!;
      const glyphs = word.querySelector<HTMLElement>("[data-glyphs]")!;
      const original = letters.textContent ?? "";
      const start = START_DELAY + index * wordInterval;

      gsap.set([letters, glyphs], { visibility: "hidden" });
      reveal.call(() => { glyphs.textContent = scrambleWord(original); }, [], start)
        .set(glyphs, { visibility: "visible" }, start)
        .call(() => { glyphs.textContent = scrambleWord(original); }, [], start + SCRAMBLE_DURATION / 2)
        .set(glyphs, { visibility: "hidden" }, start + SCRAMBLE_DURATION)
        .set(letters, { visibility: "visible" }, start + SCRAMBLE_DURATION);
    });
  }, { scope: ref, dependencies: [text, animate], revertOnUpdate: true });

  return (
    <p ref={ref} className="font-sans text-balance text-xl leading-relaxed text-muted-foreground md:text-2xl">
      <span aria-hidden="true">
        {text.split(" ").map((word, index) => (
          <Fragment key={index}>
            {index > 0 && " "}
            <span data-scramble-word className="relative inline-block">
              <span data-letters>{word}</span>
              <span data-glyphs className="invisible absolute inset-0 overflow-hidden whitespace-nowrap opacity-50" />
            </span>
          </Fragment>
        ))}
      </span>
      <span ref={announcementRef} role="status" className="sr-only" />
    </p>
  );
}
