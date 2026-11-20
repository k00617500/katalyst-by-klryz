"use client";

import { useEffect, useRef } from "react";
import { Hand } from "lucide-react";
import { resolveChristmas } from "@/lib/christmas";

const words = ["HI", "I'M", "MERYLL", "KLARYZE"];
const colors = ["#D8FF73", "#B6F500", "#76B900", "#328339", "#174D2A"];

// Christmas season: each stamp picks a random red / green / white look, solid or candy-striped.
const stripe = (a: string, b: string) => `repeating-linear-gradient(45deg, ${a} 0 7px, ${b} 7px 14px)`;
const festive: { background: string; color: string; shadow?: string }[] = [
  { background: "#c8182b", color: "#ffffff" },
  { background: "#1f7a3a", color: "#ffffff" },
  { background: "#fdf6f0", color: "#b5121f" },
  { background: "#0f5a32", color: "#ffffff" },
  { background: "#e0364a", color: "#ffffff" },
  { background: stripe("#c8182b", "#fdf6f0"), color: "#7a0f1c", shadow: "0 0 3px #fff, 0 0 3px #fff, 0 0 5px #fff" },
  { background: stripe("#1f7a3a", "#fdf6f0"), color: "#0b3d20", shadow: "0 0 3px #fff, 0 0 3px #fff, 0 0 5px #fff" },
  { background: stripe("#c8182b", "#1f7a3a"), color: "#ffffff", shadow: "0 1px 2px #00000099" },
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
        mark.style.background = look.background;
        mark.style.color = look.color;
        if (look.shadow) mark.style.textShadow = look.shadow;
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
