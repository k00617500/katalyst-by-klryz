"use client";

import { useEffect, useRef } from "react";
import { isChristmasActive } from "@/lib/christmas";

/**
 * A few small, quiet snowflakes drift down when a visitor arrives and again after every minute they stay on the site
 * (time only counts while the tab is visible). Flakes sway on slow, shared wind gusts, the nearer ones fall a little
 * faster and brighter, a few are tiny six-arm crystals, and they ease away from the cursor. Each shower ends on its own.
 */
const SHOWER_EVERY_S = 60;
const SPAWN_FOR_S = 9;

interface Flake {
  x: number; y: number; r: number; depth: number; speed: number; sway: number; phase: number;
  crystal: boolean; spin: number; born: number; alpha: number;
}

export function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isChristmasActive()) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const flakes: Flake[] = [];
    const pointer = { x: -999, y: -999 };
    const onPointer = (event: PointerEvent) => { pointer.x = event.clientX; pointer.y = event.clientY; };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let raf = 0;
    let last = 0;
    let clock = 0;
    let spawnLeft = 0;
    let spawnDebt = 0;

    const spawn = (now: number) => {
      const depth = Math.random();
      const crystal = Math.random() < 0.12;
      flakes.push({
        x: Math.random() * (width + 80) - 40,
        y: -12,
        r: crystal ? 2.6 + depth * 1.6 : 0.9 + depth * 1.7,
        depth,
        speed: 22 + depth * 46 + Math.random() * 10,
        sway: 6 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
        crystal,
        spin: (Math.random() - 0.5) * 0.9,
        born: now,
        alpha: 0.28 + depth * 0.5,
      });
    };

    const drawFlake = (flake: Flake, x: number, y: number, alpha: number, rotation: number, color: string) => {
      ctx.globalAlpha = alpha;
      if (!flake.crystal) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, flake.r, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.9;
      ctx.lineCap = "round";
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const angle = (k * Math.PI) / 3;
        const dx = Math.cos(angle) * flake.r;
        const dy = Math.sin(angle) * flake.r;
        ctx.moveTo(-dx, -dy);
        ctx.lineTo(dx, dy);
      }
      ctx.stroke();
      ctx.restore();
    };

    const frame = (time: number) => {
      const dt = Math.min((time - last) / 1000 || 0.016, 0.05);
      last = time;
      clock += dt;
      ctx.clearRect(0, 0, width, height);

      if (spawnLeft > 0) {
        spawnLeft -= dt;
        const density = Math.max(18, Math.min(46, width / 36)); // flakes per second
        // The shower swells in and thins out instead of switching on and off.
        const progress = 1 - spawnLeft / SPAWN_FOR_S;
        const shape = Math.sin(Math.min(1, Math.max(0, progress)) * Math.PI);
        spawnDebt += dt * density * (0.25 + 0.75 * shape);
        while (spawnDebt >= 1) { spawnDebt -= 1; spawn(clock); }
      }

      const light = document.documentElement.dataset.theme === "light";
      const color = light ? "#8fa9c4" : "#eef6ff";
      // Two slow, overlapping gusts so the whole shower leans one way, then the other.
      const gust = Math.sin(clock * 0.31) * 14 + Math.sin(clock * 0.83 + 1.7) * 7;

      for (let i = flakes.length - 1; i >= 0; i--) {
        const flake = flakes[i];
        const age = clock - flake.born;
        flake.y += flake.speed * dt;
        flake.x += gust * (0.35 + flake.depth * 0.65) * dt;
        const sway = Math.sin(age * (0.8 + flake.depth * 0.6) + flake.phase) * flake.sway;
        let x = flake.x + sway;
        let y = flake.y;
        // Ease away from the cursor.
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 90 && dist > 0.1) {
          const push = (1 - dist / 90) ** 2 * 26;
          x += (dx / dist) * push;
          y += (dy / dist) * push * 0.5;
        }
        if (flake.y > height + 14 || x < -60 || x > width + 60) { flakes.splice(i, 1); continue; }
        const fadeIn = Math.min(1, age / 1.2);
        const fadeOut = Math.min(1, (height + 14 - flake.y) / 90);
        const twinkle = flake.crystal ? 0.82 + 0.18 * Math.sin(age * 3 + flake.phase) : 1;
        drawFlake(flake, x, y, flake.alpha * fadeIn * fadeOut * twinkle * (light ? 1.15 : 1), age * flake.spin, color);
      }
      ctx.globalAlpha = 1;

      raf = flakes.length || spawnLeft > 0 ? requestAnimationFrame(frame) : 0;
    };

    const shower = () => {
      spawnLeft = SPAWN_FOR_S;
      spawnDebt = 0;
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };

    const first = window.setTimeout(shower, 1400);
    let visibleSeconds = 0;
    const ticker = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      visibleSeconds += 1;
      if (visibleSeconds % SHOWER_EVERY_S === 0) shower();
    }, 1000);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(ticker);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 size-full" />;
}
