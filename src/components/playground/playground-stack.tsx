"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
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

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 140 : -140,
    rotate: direction > 0 ? 10 : -10,
    opacity: 0,
    scale: 0.92,
  }),
  center: { x: 0, rotate: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -140 : 140,
    rotate: direction > 0 ? -10 : 10,
    opacity: 0,
    scale: 0.92,
  }),
};

export function PlaygroundStack({ items }: { items: PlaygroundItem[] }) {
  const [order, setOrder] = useState(() => items.map((_, i) => i));
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [lightboxHovered, setLightboxHovered] = useState(false);
  const reduced = useReducedMotion();
  const running = !hovered && !paused && !open && items.length > 1;
  const lightboxRunning = open && !lightboxHovered && items.length > 1;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setOrder((previous) => [...previous.slice(1), previous[0]]);
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!lightboxRunning) return;
    const timer = window.setInterval(() => {
      setDirection(1);
      setActiveIndex((previous) => (previous + 1) % items.length);
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [lightboxRunning, items.length]);

  if (items.length === 0) return null;

  const front = items[order[0]];
  const visibleSlots = order.slice(0, Math.min(VISIBLE, items.length));
  const active = items[activeIndex];

  const openAt = (itemIndex: number) => {
    setDirection(1);
    setActiveIndex(itemIndex);
    setOpen(true);
  };

  const navigate = (delta: number) => {
    setDirection(delta);
    setActiveIndex((previous) => (previous + delta + items.length) % items.length);
  };

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
            <motion.button
              key={item.id}
              type="button"
              onClick={() => openAt(itemIndex)}
              aria-label={`Open ${item.title}`}
              className="absolute top-1/2 left-1/2 aspect-[3/4] w-36 cursor-pointer overflow-hidden rounded-2xl border border-border bg-muted shadow-xl sm:w-44 md:w-52"
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
            </motion.button>
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

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 outline-none"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") navigate(-1);
              if (event.key === "ArrowRight") navigate(1);
            }}
          >
            <DialogPrimitive.Title className="sr-only">{active.title}</DialogPrimitive.Title>
            <div
              className="relative flex w-full max-w-4xl flex-1 items-center justify-center overflow-hidden"
              onMouseEnter={() => setLightboxHovered(true)}
              onMouseLeave={() => setLightboxHovered(false)}
            >
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={active.id}
                  custom={direction}
                  variants={slideVariants}
                  initial={reduced ? "center" : "enter"}
                  animate="center"
                  exit={reduced ? "center" : "exit"}
                  transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="relative aspect-[3/4] max-h-[70vh] w-auto overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
                >
                  <Image
                    src={active.image}
                    alt={active.title}
                    fill
                    sizes="90vw"
                    className="object-contain"
                  />
                </motion.div>
              </AnimatePresence>

              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => navigate(-1)}
                className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:left-4"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => navigate(1)}
                className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:right-4"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-4 font-mono text-xs text-white/70 uppercase">
              <span>
                {activeIndex + 1} / {items.length}
              </span>
            </div>

            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
