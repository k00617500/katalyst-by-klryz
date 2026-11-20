"use client";

import { useEffect, useRef } from "react";
import { Hand } from "lucide-react";
import { resolveChristmas } from "@/lib/christmas";

const words = ["HI", "I'M", "MERYLL", "KLARYZE"];
const colors = ["#D8FF73", "#B6F500", "#76B900", "#328339", "#174D2A"];

// Christmas season: each stamp picks a random red / green / white look. The candy stripes only frame the edge, so
// the word always sits on a solid, high-contrast centre and stays easy to read.
const stripe = (a: string, b: string) => `repeating-linear-gradient(45deg, ${a} 0 6px, ${b} 6px 12px)`;
const festive: { fill: string; color: string; frame?: string }[] = [
  { fill: "#c8182b", color: "#ffffff" },
  { fill: "#1f7a3a", color: "#ffffff" },
  { fill: "#fdf6f0", color: "#b5121f" },
  { fill: "#0f5a32", color: "#ffffff" },
  { fill: "#e0364a", color: "#ffffff" },
  { fill: "#c8182b", color: "#ffffff", frame: stripe("#ffffff", "#c8182b") },
  { fill: "#1f7a3a", color: "#ffffff", frame: stripe("#ffffff", "#1f7a3a") },
  { fill: "#fdf6f0", color: "#b5121f", frame: stripe("#c8182b", "#1f7a3a") },
  { fill: "#0f5a32", color: "#ffffff", frame: stripe("#c8182b", "#ffffff") },
];

export function CursorStamps() {
  const layerRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let last: { x: number; y: number } | null = null;
    let index = 0;
    let audio: AudioContext | null = null;
    let christmas = false;
    let cancelled = false;
    void resolveChristmas().then((value) => { if (!cancelled) christmas = value; });
    const blocked = (event: MouseEvent) => event.target instanceof Element &&
      !!event.target.closest("a, button, input, textarea, select, [contenteditable], [role=button], [role=slider], header, img, svg, p, h1, h2, h3, h4, span, li, label, canvas, .hero-playground");
    const stop = () => { last = null; };
    const down = (event: MouseEvent) => {
      if (!media.matches || event.button !== 0 || blocked(event) || !window.getSelection()?.isCollapsed) return;
      last = { x: event.clientX, y: event.clientY };
      event.preventDefault();
    };
    const move = (event: MouseEvent) => {
      if (!media.matches || !(event.buttons & 1) || blocked(event)) return stop();
      if (!last || Math.hypot(event.clientX - last.x, event.clientY - last.y) < 70) return;
      last = { x: event.clientX, y: event.clientY };
      const layer = layerRef.current;
      if (!layer) return;
      const step = index++ % 5;
      const mark = document.createElement("span");
      mark.className = "cursor-stamp";
      mark.style.left = `${event.clientX}px`;
      mark.style.top = `${event.clientY}px`;
      if (christmas) {
        const look = festive[Math.floor(Math.random() * festive.length)];
        mark.style.color = look.color;
        if (look.frame) {
          mark.style.border = "4px solid transparent";
          mark.style.background = `linear-gradient(${look.fill}, ${look.fill}) padding-box, ${look.frame} border-box`;
        } else mark.style.background = look.fill;
      } else {
        mark.style.background = colors[step];
        mark.style.color = step < 3 ? "#142000" : "#FFFFFF";
      }
      if (step === 4 && handRef.current) mark.append(handRef.current.cloneNode(true));
      else mark.textContent = words[step];
      layer.append(mark);
      if (layer.childElementCount > 24) layer.firstElementChild?.remove();
      mark.addEventListener("animationend", () => mark.remove(), { once: true });
      try {
        audio ??= new AudioContext();
        if (audio.state === "suspended") void audio.resume();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const now = audio.currentTime;
        oscillator.type = "triangle";
        oscillator.frequency.value = [392, 440, 494, 587, 659][step];
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.035, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.14);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      } catch { /* The visual gesture still works when audio is unavailable. */ }
    };
    window.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
    window.addEventListener("blur", stop);
    return () => {
      cancelled = true;
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("blur", stop);
      if (audio) void audio.close();
    };
  }, []);

  return <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
    <div ref={layerRef} />
    <div className="hidden"><Hand ref={handRef} className="size-5" /></div>
  </div>;
}
