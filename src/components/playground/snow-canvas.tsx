"use client";

import { useEffect, useRef } from "react";
import { drawSnow, makeSnow } from "@/lib/snow-field";

/**
 * A quiet, looping snow shower painted on its own canvas, sized to whatever box it is placed in. Used behind the
 * greeting card and over the tree. Plain still flakes under "reduce motion".
 */
export function SnowCanvas({ count = 50, period = 22, scale = 1, seed = 5, className = "" }: {
  count?: number;
  period?: number;
  scale?: number;
  seed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const flakes = makeSnow(count, seed);
    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      drawSnow(ctx, width, height, reduced ? 3 : (now - start) / 1000, flakes, period, scale);
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, [count, period, scale, seed]);

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none ${className}`} />;
}
