import { crystalSprite, softSprite } from "@/lib/snow-sprites";

/**
 * A small, looping snow scene. Every flake's position is a pure function of time with a whole number of falls, sways
 * and turns per `period`, so the picture repeats exactly: the same code drives the live snow on the page and the
 * frames of the saved GIF (which therefore loops without a jump).
 */
export interface Flake {
  x: number; // 0..1 across
  y: number; // 0..1 down, where it starts
  falls: number; // whole trips from top to bottom per period
  swayAmp: number; // 0..1 of the width
  swayTurns: number;
  phase: number;
  depth: number;
  crystal: boolean;
  design: number;
  spin: number; // whole turns per period
  flip: number;
}

function rng(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function makeSnow(count: number, seed = 7): Flake[] {
  const random = rng(seed);
  return Array.from({ length: count }, () => {
    const depth = random();
    return {
      x: random(),
      y: random(),
      falls: 1 + (random() < 0.35 ? 1 : 0),
      swayAmp: 0.015 + random() * 0.045,
      swayTurns: 1 + Math.floor(random() * 3),
      phase: random() * Math.PI * 2,
      depth,
      crystal: random() < 0.3,
      design: Math.floor(random() * 3),
      spin: Math.floor(random() * 3) - 1,
      flip: 1 + Math.floor(random() * 2),
    };
  });
}

/** Draws the snow at time `t` seconds (looping every `period`) into a width x height area. `scale` sizes the flakes. */
export function drawSnow(ctx: CanvasRenderingContext2D, width: number, height: number, t: number, flakes: Flake[], period: number, scale = 1, color = "#ffffff") {
  const soft = softSprite(color);
  const turn = (Math.PI * 2 * t) / period;
  const margin = 24 * scale;
  ctx.save();
  for (const flake of flakes) {
    const travel = height + margin * 2;
    const y = ((flake.y + (flake.falls * t) / period) % 1) * travel - margin;
    const x = flake.x * width + Math.sin(turn * flake.swayTurns + flake.phase) * flake.swayAmp * width;
    const size = (flake.crystal ? 11 + flake.depth * 13 : 5 + flake.depth * 9) * scale;
    const edge = Math.min(1, Math.max(0, Math.min(y + margin, height + margin - y) / (margin * 2)));
    ctx.globalAlpha = (flake.crystal ? 0.55 + flake.depth * 0.4 : 0.35 + flake.depth * 0.4) * edge;
    ctx.save();
    ctx.translate(((x % width) + width) % width, y);
    if (flake.crystal) {
      ctx.rotate(turn * flake.spin + flake.phase);
      ctx.scale(0.3 + 0.7 * Math.abs(Math.cos(turn * flake.flip + flake.phase)), 1);
      ctx.drawImage(crystalSprite(flake.design, color), -size / 2, -size / 2, size, size);
    } else {
      ctx.drawImage(soft, -size / 2, -size / 2, size, size);
    }
    ctx.restore();
  }
  ctx.restore();
}
