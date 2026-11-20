"use client";

import { useEffect, useRef } from "react";
import { resolveChristmas } from "@/lib/christmas";

/**
 * A gentle snow shower when a visitor arrives and again after every minute they stay on the site (time only counts
 * while the tab is visible). Two kinds of flake: soft, fluffy ones that blur with distance, and detailed six-arm
 * crystals that tumble as they fall and glint now and then. Slow wind gusts push the whole shower one way then the
 * other, near flakes fall faster than far ones, and flakes ease away from the cursor. Each shower ends on its own.
 */
const SHOWER_EVERY_S = 60;
const SPAWN_FOR_S = 5;
// Once a shower stops, whatever is still in the air fades away within this many seconds.
const FADE_OUT_S = 2.2;

interface Flake {
  crystal: boolean;
  design: number;
  size: number;
  depth: number;
  x: number;
  y: number;
  speed: number;
  sway: number;
  swayRate: number;
  phase: number;
  spin: number;
  flip: number;
  glint: number;
  alpha: number;
  born: number;
}

const sprites = new Map<string, HTMLCanvasElement>();

function makeCanvas(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  return canvas;
}

function softSprite(color: string): HTMLCanvasElement {
  const key = "soft" + color;
  let sprite = sprites.get(key);
  if (!sprite) {
    sprite = makeCanvas(48);
    const g = sprite.getContext("2d")!;
    const gradient = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.3, color + "d9");
    gradient.addColorStop(0.65, color + "40");
    gradient.addColorStop(1, color + "00");
    g.fillStyle = gradient;
    g.fillRect(0, 0, 48, 48);
  }
  sprites.set(key, sprite);
  return sprite;
}

/** Three crystal designs: a branched star, a hexagonal plate, and a simple star with bobbles. */
function crystalSprite(design: number, color: string): HTMLCanvasElement {
  const key = "crystal" + design + color;
  let sprite = sprites.get(key);
  if (!sprite) {
    const size = 128;
    const c = size / 2;
    sprite = makeCanvas(size);
    const g = sprite.getContext("2d")!;
    const glow = g.createRadialGradient(c, c, 0, c, c, c);
    glow.addColorStop(0, color + "55");
    glow.addColorStop(1, color + "00");
    g.fillStyle = glow;
    g.fillRect(0, 0, size, size);
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.translate(c, c);
    const arm = 50;
    for (let k = 0; k < 6; k++) {
      g.save();
      g.rotate((k * Math.PI) / 3);
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(arm, 0);
      g.stroke();
      g.lineWidth = 3.6;
      if (design === 0) {
        // Dendrite: two pairs of side branches.
        for (const [at, len] of [[0.4, 17], [0.68, 12]]) {
          for (const side of [-1, 1]) {
            g.beginPath();
            g.moveTo(arm * at, 0);
            g.lineTo(arm * at + len * 0.6, side * len);
            g.stroke();
          }
        }
      } else if (design === 1) {
        // Plate: a small V near the tip and a ring of bobbles.
        for (const side of [-1, 1]) {
          g.beginPath();
          g.moveTo(arm * 0.62, 0);
          g.lineTo(arm * 0.86, side * 12);
          g.stroke();
        }
      } else {
        g.beginPath();
        g.arc(arm * 1.0, 0, 5.5, 0, Math.PI * 2);
        g.fill();
        for (const side of [-1, 1]) {
          g.beginPath();
          g.moveTo(arm * 0.5, 0);
          g.lineTo(arm * 0.68, side * 10);
          g.stroke();
        }
      }
      g.restore();
    }
    if (design === 1) {
      g.lineWidth = 3.4;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const angle = (k * Math.PI) / 3;
        const x = Math.cos(angle) * 16;
        const y = Math.sin(angle) * 16;
        if (k) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.closePath();
      g.stroke();
    }
    g.beginPath();
    g.arc(0, 0, 4.5, 0, Math.PI * 2);
    g.fill();
  }
  sprites.set(key, sprite);
  return sprite;
}

export function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    let stop = () => {};
    let cancelled = false;
    void resolveChristmas().then((christmas) => {
      if (!cancelled && christmas) stop = start(canvas);
    });
    return () => { cancelled = true; stop(); };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 size-full" />;
}

/** Runs the snowfall on the canvas; returns a function that stops it. */
function start(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

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
  let endedAt = -1;

  const spawn = () => {
    const depth = Math.random();
    const crystal = Math.random() < 0.3;
    flakes.push({
      crystal,
      design: Math.floor(Math.random() * 3),
      size: crystal ? 10 + depth * 12 : 5 + depth * 9,
      depth,
      x: Math.random() * (width + 100) - 50,
      y: -24,
      speed: 34 + depth * 56 + Math.random() * 12,
      sway: 8 + Math.random() * 20,
      swayRate: 0.5 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.1,
      flip: 0.6 + Math.random() * 1.1,
      glint: 1.5 + Math.random() * 2.5,
      alpha: crystal ? 0.55 + depth * 0.4 : 0.35 + depth * 0.4,
      born: clock,
    });
  };

  const frame = (time: number) => {
    const dt = Math.min((time - last) / 1000 || 0.016, 0.05);
    last = time;
    clock += dt;
    ctx.clearRect(0, 0, width, height);

    if (spawnLeft > 0) {
      spawnLeft -= dt;
      if (spawnLeft <= 0) endedAt = clock;
      const density = Math.max(8, Math.min(18, width / 80)); // flakes per second
      // The shower swells in and thins out instead of switching on and off.
      const progress = 1 - spawnLeft / SPAWN_FOR_S;
      const shape = Math.sin(Math.min(1, Math.max(0, progress)) * Math.PI);
      spawnDebt += dt * density * (0.2 + 0.8 * shape);
      while (spawnDebt >= 1) { spawnDebt -= 1; spawn(); }
    }

    // After the shower ends, everything left in the air fades out together.
    const lingering = spawnLeft <= 0 && endedAt >= 0 ? Math.max(0, 1 - (clock - endedAt) / FADE_OUT_S) : 1;
    if (lingering <= 0) flakes.length = 0;
    const light = document.documentElement.dataset.theme === "light";
    const color = light ? "#8aa6c6" : "#ffffff";
    const soft = softSprite(color);
    // Two slow, overlapping gusts so the whole shower leans one way, then the other.
    const gust = Math.sin(clock * 0.31) * 16 + Math.sin(clock * 0.83 + 1.7) * 8;

    for (let i = flakes.length - 1; i >= 0; i--) {
      const flake = flakes[i];
      const age = clock - flake.born;
      flake.y += flake.speed * dt;
      flake.x += gust * (0.35 + flake.depth * 0.65) * dt;
      // A lazy figure-of-eight drift: wider side to side than up and down.
      let x = flake.x + Math.sin(age * flake.swayRate + flake.phase) * flake.sway;
      let y = flake.y + Math.sin(age * flake.swayRate * 2 + flake.phase) * flake.sway * 0.18;
      // Ease away from the cursor.
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 100 && dist > 0.1) {
        const push = (1 - dist / 100) ** 2 * 30;
        x += (dx / dist) * push;
        y += (dy / dist) * push * 0.5;
      }
      if (flake.y > height + 30 || x < -80 || x > width + 80) { flakes.splice(i, 1); continue; }

      const fadeIn = Math.min(1, age / 1.4);
      const fadeOut = Math.min(1, (height + 30 - flake.y) / 120);
      let alpha = flake.alpha * fadeIn * fadeOut * lingering * (light ? 1.2 : 1);
      ctx.save();
      ctx.translate(x, y);
      if (flake.crystal) {
        // Tumbles: spins, and flips edge-on and back, glinting as it turns.
        const turn = Math.cos(age * flake.flip + flake.phase);
        const glint = Math.max(0, Math.sin(age * flake.glint + flake.phase * 2));
        alpha = Math.min(1, alpha * (0.8 + 0.35 * glint ** 4));
        ctx.rotate(age * flake.spin + flake.phase);
        ctx.scale(0.3 + 0.7 * Math.abs(turn), 1);
        ctx.globalAlpha = alpha;
        ctx.drawImage(crystalSprite(flake.design, color), -flake.size / 2, -flake.size / 2, flake.size, flake.size);
      } else {
        ctx.globalAlpha = alpha;
        ctx.drawImage(soft, -flake.size / 2, -flake.size / 2, flake.size, flake.size);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    raf = flakes.length || spawnLeft > 0 ? requestAnimationFrame(frame) : 0;
  };

  const shower = () => {
    spawnLeft = SPAWN_FOR_S;
    spawnDebt = 0;
    endedAt = -1;
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
}
