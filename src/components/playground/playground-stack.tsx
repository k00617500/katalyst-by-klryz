"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { Pause, Play } from "lucide-react";
import type { PlaygroundItem } from "@/data/playground";

const VISIBLE = 7;
const STEP_MS = 2400;

function slotStyle(i: number) {
  return {
    x: i * 46,
    y: i * -38,
    rotate: -8,
    scale: Math.max(0.62, 1 - i * 0.055),
    opacity: i === 0 ? 1 : Math.max(0.16, 1 - i * 0.15),
    filter: `grayscale(${Math.min(85, i * 14)}%) blur(${i > 4 ? 1.5 : i > 2 ? 0.5 : 0}px)`,
    zIndex: VISIBLE - i,
  };
}

export function PlaygroundStack({ items }: { items: PlaygroundItem[] }) {
  const [order, setOrder] = useState(() => items.map((_, i) => i));
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const running = !hovered && !paused && !reduced && items.length > 1;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setOrder((previous) => [...previous.slice(1), previous[0]]);
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [running]);

  if (items.length === 0) return null;

  const front = items[order[0]];
  const visibleSlots = order.slice(0, Math.min(VISIBLE, items.length));

  return (
    <div>
      <div
        className="relative mx-auto h-[360px] w-full max-w-xl pl-4 sm:h-[440px] md:h-[500px]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        role="group"
        aria-roledescription="rotating photo stack"
        aria-label="Playground photography"
      >
        {visibleSlots.map((itemIndex, slot) => {
          const item = items[itemIndex];
          const style = slotStyle(slot);
          return (
            <motion.div
              key={item.id}
              className="absolute bottom-10 left-1/2 aspect-[3/4] w-40 -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-muted shadow-xl sm:w-48 md:w-56"
              initial={false}
              animate={{
                x: style.x,
                y: style.y,
                rotate: style.rotate,
                scale: style.scale,
                opacity: style.opacity,
                filter: style.filter,
              }}
              transition={reduced ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{ zIndex: style.zIndex }}
            >
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(min-width: 768px) 224px, 160px"
                className="object-cover"
                priority={slot === 0}
              />
            </motion.div>
          );
        })}
      </div>

      <div className="mx-auto mt-6 flex w-fit max-w-full items-center justify-center gap-3 px-4">
        <p className="min-w-0 max-w-[14rem] truncate font-mono text-xs text-muted-foreground uppercase">
          {front.title}
        </p>
        <button
          type="button"
          aria-label={paused ? "Play playground stack" : "Pause playground stack"}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
          className="showcase-control size-10"
        >
          {paused || hovered ? <Play className="size-4" fill="currentColor" /> : <Pause className="size-4" fill="currentColor" />}
        </button>
      </div>
      <p className="sr-only" aria-live={running ? "off" : "polite"}>
        {front.title}
      </p>
    </div>
  );
}
