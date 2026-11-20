"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image, { getImageProps } from "next/image";
import { animate, motion, motionValue, useAnimationFrame, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { Dialog } from "radix-ui";
import { ArrowLeft, ArrowRight, Expand, LayoutGrid, Layers, Shrink, X } from "lucide-react";
import type { PlaygroundItem } from "@/data/playground";

const SPEEDS = [0.5, 1, 1.5, 2, 2.5, 3] as const; // playback multiplier: 3x is the fastest
const BASE_PHOTO_MS = 1500; // time one photo takes to move one slot at 1x
const DEFAULT_SPEED = 1;
const GRID_ROWS = 4;
const MIN_TILE_SLOTS = 30; // keeps the diagonal row full and connected, however few photos there are
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

const TUG_RADIUS = 120; // a pulled photo never strays further than this from its place in the queue (px)

type Tug = { x: MotionValue<number>; y: MotionValue<number> };

function GalleryPhoto({ item, itemIndex, count, phase, selected, tug, onHover, onOpen, onWarm }: {
  item: PlaygroundItem;
  itemIndex: number;
  count: number;
  phase: MotionValue<number>;
  selected: boolean;
  tug: Tug;
  onHover: (hovered: boolean) => void;
  onOpen: () => void;
  onWarm: () => void;
}) {
  // The photos stand in one diagonal row, like cases in a rack, receding toward the upper right. `depth` grows as a
  // photo travels away from the viewer: it slides up the diagonal, shrinks, fades, and is pulled into the distance.
  const depth = useTransform(phase, (value) => wrap(value - itemIndex + count / 2, count) - count / 2);
  // Hovering slides the case out of the row toward the viewer, like pulling a book off a shelf.
  const pull = useSpring(0, { stiffness: 240, damping: 24 });
  const x = useTransform([depth, pull, tug.x], ([value, out, tx]: number[]) => `calc(-50% + ${(value - 3.5) * 3.8 - out * 2.2}cqw + ${tx}px)`);
  const y = useTransform([depth, pull, tug.y], ([value, out, ty]: number[]) => `calc(-50% - ${(value - 3.5) * 3 + 1 - out * 3.5}cqh + ${ty}px)`);
  const z = useTransform([depth, pull, tug.x, tug.y], ([value, out, tx, ty]: number[]) => -value * 16 + out * 190 + Math.min(1, Math.hypot(tx, ty) / 20) * 60);
  const rotateY = useTransform(pull, (out) => -28 + out * 20);
  const opacity = useTransform(depth, (value) => clamp01(Math.min((value + 7) / 1, (14 - value) / 3.5)));
  const zIndex = useTransform([depth, pull, tug.x, tug.y], ([value, out, tx, ty]: number[]) => 1000 - Math.round(value * 10) + (out > 0.02 || Math.hypot(tx, ty) > 1 ? 3000 : 0));
  const pointerEvents = useTransform(depth, (value) => (value < -6 || value > 10 ? "none" : "auto"));
  return (
    <motion.button type="button" className="playground-photo" data-slot={itemIndex}
      aria-label={`Preview ${item.title}`} aria-current={selected ? "true" : undefined}
      tabIndex={selected ? 0 : -1}
      onMouseEnter={() => { pull.set(1); onHover(true); onWarm(); }} onMouseLeave={() => { pull.set(0); onHover(false); }}
      onClick={onOpen}
      style={{ x, y, z, rotateY, zIndex, pointerEvents, "--case-opacity": opacity } as never}>
      <span className="case-face case-back" aria-hidden />
      <span className="case-face case-spine" aria-hidden />
      <span className="case-face case-right" aria-hidden />
      <span className="case-face case-top" aria-hidden />
      <span className="case-face case-bottom" aria-hidden />
      <span className="case-face case-front"><span className="playground-photo-art"><Image src={item.image} alt="" fill loading="eager" sizes={THUMB_SIZES} draggable={false} className="pointer-events-none object-cover" /></span></span>
    </motion.button>
  );
}

type View = "tile" | "grid";

// Every photo sits in a grid cell with echoes of itself trailing behind it toward the centre of the grid.
function GridView({ items, cols, page, onOpen, onWarm }: {
  items: PlaygroundItem[];
  cols: number;
  page: number;
  onOpen: (item: PlaygroundItem) => void;
  onWarm: (item: PlaygroundItem) => void;
}) {
  const pageSize = cols * GRID_ROWS;
  const slice = items.slice(page * pageSize, (page + 1) * pageSize);
  const halfCols = (cols - 1) / 2;
  const halfRows = (GRID_ROWS - 1) / 2;
  // Each hovered photo waves on its own: it rises and its stack of echoes ripples. Sweep across several and each one waves in turn.
  const [waves, setWaves] = useState<Record<number, number>>({});
  const reducedMotion = useReducedMotion();
  const settleTimers = useRef(new WeakMap<HTMLElement, number>());
  // The photo leans with the cursor and its echoes trail behind the motion, easing back when the cursor stops.
  const settle = (cell: HTMLElement) => {
    for (const name of ["--mx", "--my", "--fx", "--fy"]) cell.style.setProperty(name, "0px");
    cell.dataset.vx = "0";
    cell.dataset.vy = "0";
  };
  const trackMotion = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const cell = event.currentTarget;
    const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
    const vx = (Number(cell.dataset.vx) || 0) * 0.8 + event.movementX * 0.2;
    const vy = (Number(cell.dataset.vy) || 0) * 0.8 + event.movementY * 0.2;
    cell.dataset.vx = String(vx);
    cell.dataset.vy = String(vy);
    cell.style.setProperty("--mx", `${clamp(-vx * 1.1, 11)}px`);
    cell.style.setProperty("--my", `${clamp(-vy * 1.1, 9)}px`);
    cell.style.setProperty("--fx", `${clamp(vx * 0.7, 9)}px`);
    cell.style.setProperty("--fy", `${clamp(vy * 0.7, 9)}px`);
    window.clearTimeout(settleTimers.current.get(cell));
    settleTimers.current.set(cell, window.setTimeout(() => settle(cell), 180));
  };
  return (
    <div key={page} className="playground-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)` }}>
      {slice.map((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const toCenterX = halfCols - col;
        const toCenterY = halfRows - row;
        const ux = (toCenterX < 0 ? -1 : 1) * (0.35 + 0.65 * Math.abs(toCenterX) / halfCols);
        const uy = (toCenterY < 0 ? -1 : 1) * (0.35 + 0.65 * Math.abs(toCenterY) / halfRows);
        const waveId = waves[i] ?? 0;
        const waving = waveId > 0;
        const parity = waveId % 2 ? "a" : "b";
        return (
          <div key={item.id} className={`playground-cell${waving ? " is-waving" : ""}`}
            onMouseEnter={() => setWaves((previous) => ({ ...previous, [i]: (previous[i] ?? 0) + 1 }))}
            onPointerMove={trackMotion}
            onMouseLeave={(event) => settle(event.currentTarget)}
            style={{
              "--dx": `${ux * 17}px`, "--dy": `${uy * 11}px`,
              "--wave-amp": reducedMotion ? 0.5 : 1,
              animationName: waving ? `playground-wave-${parity}` : undefined,
            } as React.CSSProperties}>
            {[4, 3, 2, 1].map((n) => (
              <span key={n} aria-hidden className="grid-echo" style={{ "--n": n, animationName: waving ? `playground-echo-${parity}` : undefined } as React.CSSProperties}>
                <Image src={item.image} alt="" fill sizes="(max-width: 640px) 30vw, 150px" draggable={false} className="object-cover" />
              </span>
            ))}
            <button type="button" className="grid-face" aria-label={`Preview ${item.title}`} onMouseEnter={() => onWarm(item)} onClick={() => onOpen(item)}>
              <Image src={item.image} alt="" fill sizes="(max-width: 640px) 30vw, 150px" draggable={false} className="object-cover" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function PlaygroundStack({ items }: { items: PlaygroundItem[] }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  // True fullscreen where the browser allows it; a full-window layout on devices that don't (e.g. iPhone Safari).
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const expanded = fullscreen || pseudoFullscreen;
  const [speed, setSpeed] = useState<number>(DEFAULT_SPEED);
  const [view, setView] = useState<View>("grid");
  const [cols, setCols] = useState(6);
  const [page, setPage] = useState(0);
  const phase = useMotionValue(0);
  const indexRef = useRef(0);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; phase: number; active: boolean; slot: number | null } | null>(null);
  // One spring-driven offset per photo; a drag moves only the photo it started on.
  const tugs = useRef(new Map<number, Tug>());
  const tugFor = (slot: number): Tug => {
    let tug = tugs.current.get(slot);
    if (!tug) { tug = { x: motionValue(0), y: motionValue(0) }; tugs.current.set(slot, tug); }
    return tug;
  };
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
  const running = view === "tile" && !hovered && !open && !reduced && items.length > 1;
  const pageCount = Math.max(1, Math.ceil(items.length / (cols * GRID_ROWS)));
  // Repeat the photos until the diagonal row has enough slots, so it is always one connected, endless loop.
  const slotCount = items.length ? items.length * Math.ceil(MIN_TILE_SLOTS / items.length) : 0;

  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const apply = () => setCols(query.matches ? 3 : 6);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  useEffect(() => { setPage((value) => Math.min(value, pageCount - 1)); }, [pageCount]);

  useEffect(() => {
    if (!items.length) return;
    for (const delta of [0, 1, -1]) warmPreview(items[wrap(index + delta, items.length)]);
  }, [index, items, warmPreview]);

  useAnimationFrame((_, delta) => {
    if (!running || dragRef.current) return;
    // Recycle only beyond the viewport; every card keeps moving through the seam.
    const next = wrap(phase.get() - Math.min(delta, 64) * speed / BASE_PHOTO_MS, slotCount);
    phase.set(next);
    const nextIndex = wrap(Math.round(next), slotCount) % items.length;
    if (nextIndex !== indexRef.current) {
      indexRef.current = nextIndex;
      setIndex(nextIndex);
    }
  });

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === sectionRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  useEffect(() => {
    if (!pseudoFullscreen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !open) setPseudoFullscreen(false); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [pseudoFullscreen, open]);

  const toggleFullscreen = async () => {
    const section = sectionRef.current;
    if (!section) return;
    if (pseudoFullscreen) { setPseudoFullscreen(false); return; }
    if (document.fullscreenElement) { await document.exitFullscreen().catch(() => {}); return; }
    try {
      if (!section.requestFullscreen) throw new Error("unsupported");
      await section.requestFullscreen();
    } catch {
      setPseudoFullscreen(true);
    }
  };

  if (!items.length) return null;
  const active = items[index];
  const select = (next: number) => {
    const selected = wrap(next, items.length);
    phase.set(selected);
    indexRef.current = selected;
    setIndex(selected);
  };
  const navigate = (delta: number) => select(index + delta);
  const turnPage = (delta: number) => setPage((value) => wrap(value + delta, pageCount));
  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (drag.slot !== null) {
      const tug = tugFor(drag.slot);
      const spring = { type: "spring", stiffness: 260, damping: 22 } as const;
      animate(tug.x, 0, spring);
      animate(tug.y, 0, spring);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const target = document.elementFromPoint(event.clientX, event.clientY);
    setHovered(event.pointerType === "mouse" && !!target?.closest(".playground-photo"));
  };
  const handleKeys = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      const delta = event.key === "ArrowLeft" ? -1 : 1;
      if (view === "grid" && !open) turnPage(delta);
      else navigate(delta);
    }
  };

  return (
    <section id="playground-gallery" ref={sectionRef} className={`playground-experience${pseudoFullscreen ? " is-pseudo-fullscreen" : ""}`} aria-label="Photography playground" aria-roledescription="carousel" onKeyDown={handleKeys}>
      <h2 className="sr-only">Explore the Playground collection</h2>
      {view === "tile" && (
      <div className="playground-rail cursor-grab touch-pan-y select-none active:cursor-grabbing"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          suppressClick.current = false;
          const photo = (event.target as HTMLElement).closest<HTMLElement>("[data-slot]");
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, phase: phase.get(), active: false, slot: photo ? Number(photo.dataset.slot) : null };
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
          if (drag.slot !== null) {
            // Pull just this photo out of the queue, with growing resistance so it stays close to home.
            const distance = Math.hypot(dx, dy) || 1;
            const reach = TUG_RADIUS * Math.tanh(distance / TUG_RADIUS);
            const tug = tugFor(drag.slot);
            tug.x.set((dx / distance) * reach);
            tug.y.set((dy / distance) * reach);
            return;
          }
          const step = Math.max(110, Math.min(260, event.currentTarget.clientWidth * 0.2));
          const next = wrap(drag.phase + (-dx + dy * 0.5) / step, slotCount);
          phase.set(next);
          indexRef.current = wrap(Math.round(next), slotCount) % items.length;
          setIndex(indexRef.current);
        }}
        onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}
        onPointerLeave={(event) => { if (dragRef.current && !dragRef.current.active) finishDrag(event); }}
        onClickCapture={(event) => {
          if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); }
        }}>
        {Array.from({ length: slotCount }, (_, slot) => {
          const item = items[slot % items.length];
          return (
            <GalleryPhoto key={slot} item={item} itemIndex={slot} count={slotCount} phase={phase}
              selected={index === slot % items.length} tug={tugFor(slot)} onHover={setHovered}
              onWarm={() => warmPreview(item)}
              onOpen={() => { warmPreview(item); select(slot % items.length); setOpen(true); }} />
          );
        })}
      </div>
      )}
      {view === "grid" && (
        <GridView items={items} cols={cols} page={page} onWarm={warmPreview}
          onOpen={(item) => { warmPreview(item); select(items.indexOf(item)); setOpen(true); }} />
      )}
      <div className="playground-bottom">
        <div className="flex items-center gap-2">
          <button type="button" className="showcase-control size-10" aria-label={view === "grid" ? "Previous page" : "Previous photograph"} onClick={() => (view === "grid" ? turnPage(-1) : navigate(-1))}><ArrowLeft className="size-4" /></button>
          <button type="button" className="showcase-control size-10" aria-label={view === "grid" ? "Next page" : "Next photograph"} onClick={() => (view === "grid" ? turnPage(1) : navigate(1))}><ArrowRight className="size-4" /></button>
          <button type="button" className="showcase-control size-10" aria-label={expanded ? "Exit full screen" : "View the gallery full screen"} aria-pressed={expanded} onClick={() => void toggleFullscreen()}>{expanded ? <Shrink className="size-4" /> : <Expand className="size-4" />}</button>
        </div>
        <div className="playground-speed" role="group" aria-label="View">
          <button type="button" aria-pressed={view === "grid"} aria-label="Grid view" title="Grid view" onClick={() => { setHovered(false); setView("grid"); }}><LayoutGrid className="mx-auto size-4" /></button>
          <button type="button" aria-pressed={view === "tile"} aria-label="Tile view" title="Tile view" onClick={() => { setHovered(false); setView("tile"); }}><Layers className="mx-auto size-4" /></button>
        </div>
        {view === "tile" ? (
          <div className="playground-speed" role="group" aria-label="Playback speed">
            {SPEEDS.map((value) => (
              <button key={value} type="button" aria-pressed={speed === value} onClick={() => setSpeed(value)}>{value}x</button>
            ))}
          </div>
        ) : pageCount > 1 ? (
          <div className="playground-speed" role="group" aria-label="Pages">
            {Array.from({ length: pageCount }, (_, i) => (
              <button key={i} type="button" aria-label={`Page ${i + 1}`} aria-pressed={page === i} onClick={() => setPage(i)}>{i + 1}</button>
            ))}
          </div>
        ) : null}
      </div>
      <Dialog.Root open={open} onOpenChange={(value) => { setOpen(value); if (!value) setHovered(false); }}>
        <Dialog.Portal container={expanded ? sectionRef.current : undefined}>
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
