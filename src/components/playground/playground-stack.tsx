"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { Pause, Play } from "lucide-react";
import type { PlaygroundItem } from "@/data/playground";

const VISIBLE = 7;
const STEP_MS = 2200;
const SPACING_X = 38;
const SPACING_Y = 32;
const ROTATE = -8;
const CENTER_X = ((VISIBLE - 1) * SPACING_X) / 2;
const CENTER_Y = ((VISIBLE - 1) * SPACING_Y) / 2;

function slotStyle(i: number) {
  return {
    x: `calc(-50% + ${i * SPACING_X - CENTER_X}px)`,
    y: `calc(-50% + ${-i * SPACING_Y + CENTER_Y}px)`,
    rotate: ROTATE,
    scale: Math.max(0.6, 1 - i * 0.06),
    opacity: i === 0 ? 1 : Math.max(0.15, 1 - i * 0.16),
    filter: `grayscale(${Math.min(85, i * 15)}%) blur(${i > 4 ? 1.5 : i > 2 ? 0.5 : 0}px)`,
    zIndex: VISIBLE - i,
  };
}

export function PlaygroundStack({ items }: { items: PlaygroundItem[] }) {
  const [order, setOrder] = useState(() => items.map((_, i) => i));
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const running = !hovered && !paused && items.length > 1;

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
        className="relative mx-auto h-[320px] w-full max-w-[420px] sm:h-[380px] sm:max-w-[480px] md:h-[440px] md:max-w-[540px]"
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
              className="absolute top-1/2 left-1/2 aspect-[3/4] w-36 overflow-hidden rounded-2xl border border-border bg-muted shadow-xl sm:w-44 md:w-52"
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
                sizes="(min-width: 768px) 208px, 144px"
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
