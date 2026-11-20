"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image, { getImageProps } from "next/image";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { Dialog } from "radix-ui";
import { ArrowLeft, ArrowRight, Expand, X } from "lucide-react";
import type { PlaygroundItem } from "@/data/playground";

const SPEEDS = [0.5, 1, 1.5, 2, 2.5, 3] as const; // seconds each photo takes to move one slot
const DEFAULT_SPEED = 1.5;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const wrap = (value: number, length: number) => ((value % length) + length) % length;
const THUMB_SIZES = "(max-width: 640px) 40vw, 300px";

function previewSource(item: PlaygroundItem) {
  // A single 1200px optimized URL is shared by preloading and the lightbox.
  return getImageProps({ src: item.image, alt: item.title, width: 600, height: 600 }).props.src;
}

function PhotoPreview({ item, onNavigate }: { item: PlaygroundItem; onNavigate: (delta: number) => void }) {
  const [ready, setReady] = useState(false);
  return (
    <motion.div className="relative h-full max-h-[78vh] w-full max-w-6xl cursor-grab touch-pan-y select-none active:cursor-grabbing"
      drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} dragMomentum={false}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 55 || Math.abs(info.velocity.x) > 500) onNavigate(info.offset.x < 0 ? 1 : -1);
      }}>
      <Image src={item.image} alt="" aria-hidden fill sizes={THUMB_SIZES} loading="eager" draggable={false} className="pointer-events-none object-contain" />
      <Image src={previewSource(item)} alt={item.title} unoptimized fill loading="eager" fetchPriority="high" draggable={false}
        onLoad={() => setReady(true)}
        className={`pointer-events-none object-contain transition-opacity duration-150 ${ready ? "opacity-100" : "opacity-0"}`} />
    </motion.div>
  );
}

function GalleryPhoto({ item, itemIndex, count, phase, selected, onHover, onOpen, onWarm }: {
  item: PlaygroundItem;
  itemIndex: number;
  count: number;
  phase: MotionValue<number>;
  selected: boolean;
  onHover: (hovered: boolean) => void;
  onOpen: () => void;
  onWarm: () => void;
}) {
  // The photos stand in one diagonal row, like cases in a rack, receding toward the upper right. `depth` grows as a
  // photo travels away from the viewer: it slides up the diagonal, shrinks, fades, and is pulled into the distance.
  const depth = useTransform(phase, (value) => wrap(value - itemIndex + count / 2, count) - count / 2);
  const x = useTransform(depth, (value) => `calc(-50% + ${(value - 3.5) * 5}cqw)`);
  const y = useTransform(depth, (value) => `calc(-50% - ${(value - 3.5) * 3.6 + 1}cqh)`);
  const z = useTransform(depth, (value) => -value * 16);
  const opacity = useTransform(depth, (value) => clamp01(Math.min((value + 7) / 1, (14 - value) / 3.5)));
  const zIndex = useTransform(depth, (value) => 1000 - Math.round(value * 10));
  const pointerEvents = useTransform(depth, (value) => (value < -6 || value > 10 ? "none" : "auto"));
  return (
    <motion.button type="button" className="playground-photo"
      aria-label={`Preview ${item.title}`} aria-current={selected ? "true" : undefined}
      tabIndex={selected ? 0 : -1}
      onMouseEnter={() => { onHover(true); onWarm(); }} onMouseLeave={() => onHover(false)}
      onClick={onOpen}
      style={{ x, y, z, rotateY: -38, zIndex, pointerEvents, "--case-opacity": opacity } as never}>
      <span className="case-face case-back" aria-hidden />
      <span className="case-face case-spine" aria-hidden />
      <span className="case-face case-right" aria-hidden />
      <span className="case-face case-top" aria-hidden />
      <span className="case-face case-bottom" aria-hidden />
      <span className="case-face case-front"><span className="playground-photo-art"><Image src={item.image} alt="" fill loading="eager" sizes={THUMB_SIZES} draggable={false} className="pointer-events-none object-cover" /></span></span>
    </motion.button>
  );
}

export function PlaygroundStack({ items }: { items: PlaygroundItem[] }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [speed, setSpeed] = useState<number>(DEFAULT_SPEED);
  const phase = useMotionValue(0);
  const indexRef = useRef(0);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; phase: number; active: boolean } | null>(null);
  const suppressClick = useRef(false);
  const previews = useRef(new Map<string, HTMLImageElement>());
  const warmPreview = useCallback((item: PlaygroundItem) => {
    if (previews.current.has(item.id)) return;
    const image = new window.Image();
    previews.current.set(item.id, image);
    image.decoding = "async";
    image.src = previewSource(item);
  }, []);
  const reduced = useReducedMotion();
  const running = !hovered && !open && !reduced && items.length > 1;

  useEffect(() => {
    if (!items.length) return;
    for (const delta of [0, 1, -1]) warmPreview(items[wrap(index + delta, items.length)]);
  }, [index, items, warmPreview]);

  useAnimationFrame((_, delta) => {
    if (!running || dragRef.current) return;
    // Recycle only beyond the viewport; every card keeps moving through the seam.
    const next = wrap(phase.get() + Math.min(delta, 64) / (speed * 1000), items.length);
    phase.set(next);
    const nextIndex = wrap(Math.round(next), items.length);
    if (nextIndex !== indexRef.current) {
      indexRef.current = nextIndex;
      setIndex(nextIndex);
    }
  });

  if (!items.length) return null;
  const active = items[index];
  const select = (next: number) => {
    const selected = wrap(next, items.length);
    phase.set(selected);
    indexRef.current = selected;
    setIndex(selected);
  };
  const navigate = (delta: number) => select(index + delta);
  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const target = document.elementFromPoint(event.clientX, event.clientY);
    setHovered(event.pointerType === "mouse" && !!target?.closest(".playground-photo"));
  };
  const handleKeys = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      navigate(event.key === "ArrowLeft" ? -1 : 1);
    }
  };

  return (
    <section className="playground-experience" aria-label="Photography playground" aria-roledescription="carousel" onKeyDown={handleKeys}>
      <h2 className="sr-only">Explore the Playground collection</h2>
      <div className="playground-rail cursor-grab touch-pan-y select-none active:cursor-grabbing"
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => { if (!dragRef.current) setHovered(false); }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          suppressClick.current = false;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, phase: phase.get(), active: false };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          if (!drag.active) {
            if (Math.hypot(dx, dy) < 7 || (event.pointerType === "touch" && Math.abs(dy) > Math.abs(dx))) return;
            drag.active = true;
            suppressClick.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          const step = Math.max(110, Math.min(260, event.currentTarget.clientWidth * 0.2));
          const next = wrap(drag.phase + (-dx + dy * 0.5) / step, items.length);
          phase.set(next);
          indexRef.current = wrap(Math.round(next), items.length);
          setIndex(indexRef.current);
        }}
        onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}
        onPointerLeave={(event) => { if (dragRef.current && !dragRef.current.active) finishDrag(event); }}
        onClickCapture={(event) => {
          if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); }
        }}>
        {items.map((item, itemIndex) => (
          <GalleryPhoto key={item.id} item={item} itemIndex={itemIndex} count={items.length} phase={phase}
            selected={index === itemIndex} onHover={() => {}}
            onWarm={() => warmPreview(item)}
            onOpen={() => { warmPreview(item); select(itemIndex); setOpen(true); }} />
        ))}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[300] bg-[radial-gradient(ellipse_22%_30%_at_88%_14%,#000_20%,transparent_75%)]" />
      </div>
      <div className="playground-bottom">
        <div className="flex items-center gap-2">
          <button type="button" className="showcase-control size-10" aria-label="Previous photograph" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /></button>
          <button type="button" className="showcase-control size-10" aria-label="Next photograph" onClick={() => navigate(1)}><ArrowRight className="size-4" /></button>
          <button type="button" className="showcase-control size-10" aria-label="Open selected photograph preview" onClick={() => setOpen(true)}><Expand className="size-4" /></button>
        </div>
        <div className="playground-speed" role="group" aria-label="Seconds per photograph">
          {SPEEDS.map((value) => (
            <button key={value} type="button" aria-pressed={speed === value} onClick={() => setSpeed(value)}>{value}s</button>
          ))}
        </div>
      </div>
      <Dialog.Root open={open} onOpenChange={(value) => { setOpen(value); if (!value) setHovered(false); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/95" />
          <Dialog.Content className="fixed inset-0 z-[101] flex flex-col items-center justify-center px-14 py-20 outline-none sm:px-24" onKeyDown={handleKeys}>
            <Dialog.Title className="sr-only">{active.title}</Dialog.Title>
            <Dialog.Description className="sr-only">Full photograph preview. Drag or swipe horizontally, or use the arrow keys to browse the collection.</Dialog.Description>
            <PhotoPreview key={active.id} item={active} onNavigate={navigate} />
            <button type="button" aria-label="Previous photo" className="absolute top-1/2 left-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:left-6" onClick={() => navigate(-1)}><ArrowLeft className="size-5" /></button>
            <button type="button" aria-label="Next photo" className="absolute top-1/2 right-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:right-6" onClick={() => navigate(1)}><ArrowRight className="size-5" /></button>
            <Dialog.Close aria-label="Close preview" className="absolute top-5 right-5 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"><X className="size-5" /></Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
