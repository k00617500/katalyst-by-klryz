"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image, { getImageProps } from "next/image";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { Dialog } from "radix-ui";
import { ArrowLeft, ArrowRight, Expand, X } from "lucide-react";
import type { PlaygroundItem } from "@/data/playground";

const PHOTO_DURATION_MS = 1800;
const wrap = (value: number, length: number) => ((value % length) + length) % length;
const THUMB_SIZES = "(max-width: 640px) 34vw, 220px";

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
  const offset = useTransform(phase, (value) => wrap(itemIndex - value + count / 2, count) - count / 2);
  const spread = useTransform(offset, (value) => {
    const distance = Math.abs(value);
    return Math.sign(value) * (distance <= 1 ? distance * 1.35 : 1.35 + (distance - 1) * 0.29);
  });
  const x = useTransform(spread, (value) => `calc(-50% + ${value} * var(--photo-step))`);
  const y = useTransform(spread, (value) => `calc(-50% - ${value} * var(--photo-rise))`);
  const scale = useTransform(offset, (value) => 1.08 - Math.min(1, Math.abs(value)) * 0.22);
  const zIndex = useTransform(offset, (value) => count - Math.round(Math.abs(value)));
  return (
    <motion.button type="button" className="playground-photo"
      aria-label={`Preview ${item.title}`} aria-current={selected ? "true" : undefined}
      tabIndex={selected ? 0 : -1}
      onMouseEnter={() => { onHover(true); onWarm(); }} onMouseLeave={() => onHover(false)}
      onClick={onOpen}
      style={{ x, y, scale, zIndex, rotateY: -32, rotateZ: 5 }}>
      <Image src={item.image} alt={item.title} fill loading="eager" sizes={THUMB_SIZES} draggable={false} className="pointer-events-none object-cover" />
      <span className="playground-photo-label">{String(itemIndex + 1).padStart(2, "0")} <Expand className="size-3" /></span>
    </motion.button>
  );
}

export function PlaygroundStack({ items }: { items: PlaygroundItem[] }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
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
    const next = wrap(phase.get() + Math.min(delta, 64) / PHOTO_DURATION_MS, items.length);
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
          const step = Math.max(125, Math.min(270, event.currentTarget.clientWidth * 0.17));
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
            selected={index === itemIndex} onHover={setHovered}
            onWarm={() => warmPreview(item)}
            onOpen={() => { warmPreview(item); select(itemIndex); setOpen(true); }} />
        ))}
      </div>
      <div className="playground-bottom">
        <div><p className="font-mono text-xs uppercase" aria-live={running ? "off" : "polite"}>{active.title}</p><p className="mt-2 text-xs text-muted-foreground">Drag to explore · Click to preview</p></div>
        <div className="flex items-center gap-2">
          <span className="mr-3 font-mono text-xs tabular-nums">{String(index + 1).padStart(2, "0")} / {items.length}</span>
          <button type="button" className="showcase-control size-10" aria-label="Previous photograph" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /></button>
          <button type="button" className="showcase-control size-10" aria-label="Next photograph" onClick={() => navigate(1)}><ArrowRight className="size-4" /></button>
          <button type="button" className="showcase-control ml-2 size-10" aria-label="Open selected photograph preview" onClick={() => setOpen(true)}><Expand className="size-4" /></button>
        </div>
      </div>
      <Dialog.Root open={open} onOpenChange={(value) => { setOpen(value); if (!value) setHovered(false); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/95" />
          <Dialog.Content className="fixed inset-0 z-[101] flex flex-col items-center justify-center px-14 py-20 outline-none sm:px-24" onKeyDown={handleKeys}>
            <Dialog.Title className="sr-only">{active.title}</Dialog.Title>
            <Dialog.Description className="sr-only">Full photograph preview. Drag or swipe horizontally, or use the arrow keys to browse the collection.</Dialog.Description>
            <PhotoPreview key={active.id} item={active} onNavigate={navigate} />
            <div className="absolute bottom-7 flex max-w-[90vw] items-center gap-5 font-mono text-xs text-white/80"><span className="truncate">{active.title}</span><span className="shrink-0">{index + 1} / {items.length}</span></div>
            <button type="button" aria-label="Previous photo" className="absolute top-1/2 left-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:left-6" onClick={() => navigate(-1)}><ArrowLeft className="size-5" /></button>
            <button type="button" aria-label="Next photo" className="absolute top-1/2 right-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:right-6" onClick={() => navigate(1)}><ArrowRight className="size-5" /></button>
            <Dialog.Close aria-label="Close preview" className="absolute top-5 right-5 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"><X className="size-5" /></Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
