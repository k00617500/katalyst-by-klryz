"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Eraser, Save, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SectionHeading } from "@/components/ui/section-heading";
import { resolveChristmas } from "@/lib/christmas";
import { drawSnow, makeSnow } from "@/lib/snow-field";
import {
  MAX_ORNAMENTS, ORNAMENT_LIST, TREE_ASPECT, drawLights, drawOrnament, drawTree, hitOrnament, nearTree,
  type Ornament, type OrnamentKind,
} from "@/lib/christmas-tree";
import { ChristmasCard, pickCardCover } from "@/components/playground/christmas-card";
import { useChristmasMusic } from "@/components/playground/use-christmas-music";

function Swatch({ kind }: { kind: OrnamentKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 44 * dpr;
    canvas.height = 44 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 44, 44);
    drawOrnament(ctx, kind, 22, kind === "candy" || kind === "ginger" ? 24 : 26, 12);
  }, [kind]);
  return <canvas ref={ref} aria-hidden="true" className="size-11" />;
}

const SNOW_PERIOD = 20;

/**
 * Christmas season only: decorate a dot-matrix tree (twinkling lights, falling snow), then turn it into a two-fold
 * greeting card that can be saved as a PNG or an animated GIF. The name is optional and, like the tree, is never
 * stored or sent anywhere (a short privacy notice says so).
 */
export function ChristmasTree() {
  const [active, setActive] = useState(false);
  const [kind, setKind] = useState<OrnamentKind>("red");
  const [ornaments, setOrnaments] = useState<Ornament[]>([]);
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardImage, setCardImage] = useState("");
  const [cover, setCover] = useState(0);
  const [hint, setHint] = useState("");
  // Random Christmas instrumentals start once the visitor begins decorating, and play while the card is shown.
  const music = useChristmasMusic(active && (ornaments.length > 0 || cardOpen), active);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const drag = useRef<{ id: number; pointerId: number } | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void resolveChristmas().then((value) => { if (!cancelled) setActive(value); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!active || !box) return;
    const fit = () => setWidth(box.clientWidth);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!active || !canvas || !ctx || !width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const height = width / TREE_ASPECT;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    drawTree(ctx, width, ornaments);
  }, [active, width, ornaments]);

  // Twinkling lights and falling snow, on a layer above the tree that never takes clicks.
  useEffect(() => {
    const canvas = overlayRef.current;
    const ctx = canvas?.getContext("2d");
    if (!active || !canvas || !ctx || !width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const height = width / TREE_ASPECT;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const flakes = makeSnow(34, 3);
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = reduced ? 2 : (now - start) / 1000;
      ctx.clearRect(0, 0, width, height);
      drawLights(ctx, width, t);
      drawSnow(ctx, width, height, t, flakes, SNOW_PERIOD, width / 340);
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, width]);

  const point = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { u: (event.clientX - rect.left) / rect.width, v: (event.clientY - rect.top) / rect.height };
  }, []);

  const onDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || !width) return;
    music.unlock(); // the click that hangs an ornament also lets the browser start the music
    const { u, v } = point(event);
    const existing = hitOrnament(ornaments, u, v, width);
    if (existing) {
      setOrnaments((list) => [...list.filter((o) => o.id !== existing.id), existing]);
      drag.current = { id: existing.id, pointerId: event.pointerId };
      event.currentTarget.setPointerCapture(event.pointerId);
      setHint("");
      return;
    }
    if (!nearTree(u, v)) { setHint("Hang ornaments on the tree."); return; }
    if (ornaments.length >= MAX_ORNAMENTS) { setHint(`That's a full tree (${MAX_ORNAMENTS}). Undo one to add another.`); return; }
    const id = nextId.current++;
    setOrnaments((list) => [...list, { id, kind, x: u, y: v }]);
    drag.current = { id, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    setHint("");
  };

  const onMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const { u, v } = point(event);
    setOrnaments((list) => list.map((o) => (o.id === current.id ? { ...o, x: u, y: v } : o)));
  };

  const onUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    const { u, v } = point(event);
    if (!nearTree(u, v)) {
      setOrnaments((list) => list.filter((o) => o.id !== current.id));
      setHint("Ornament removed. Drop it on the tree to keep it.");
    }
  };

  // A gentle 3D tilt of the whole tree panel toward the pointer.
  const tilt = (event: PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel || event.pointerType === "touch" || drag.current) return;
    const rect = panel.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    panel.style.transform = `perspective(1000px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg)`;
  };
  const untilt = () => { if (panelRef.current) panelRef.current.style.transform = ""; };

  const hasName = name.trim().length > 0;
  const blocked = hasName && !agreed;
  const canSave = ornaments.length > 0 && !blocked;

  const save = () => {
    if (!canSave) return;
    music.unlock();
    const outWidth = 900;
    const out = document.createElement("canvas");
    out.width = outWidth;
    out.height = Math.round(outWidth / TREE_ASPECT);
    const ctx = out.getContext("2d");
    if (!ctx) return;
    drawTree(ctx, outWidth, ornaments); // transparent, so the card's red page shows behind it
    drawLights(ctx, outWidth, 1.2);
    setCardImage(out.toDataURL("image/png"));
    setCover(pickCardCover());
    setCardOpen(true);
  };

  if (!active) return null;

  return (
    <section id="christmas-tree" className="container-page section-y scroll-mt-24 border-t border-border/60 text-center">
      <SectionHeading
        align="center"
        eyebrow="Christmas"
        title="Decorate your own tree"
        description="Hang your ornaments, then save the tree as a two-fold Christmas card."
      />

      <div className="mx-auto mt-10 grid max-w-4xl items-stretch gap-3 text-left lg:grid-cols-2">
        {/* Left square: the ornaments. */}
        <div className="flex flex-col justify-between gap-4 rounded-3xl border border-border bg-card p-5 sm:p-6 lg:aspect-square">
          <div className="space-y-2.5">
            <p className="text-lg font-medium tracking-tight">Pick an ornament</p>
            <div role="radiogroup" aria-label="Ornament" className="grid grid-cols-5 gap-2">
              {ORNAMENT_LIST.map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  role="radio"
                  aria-checked={kind === item.kind}
                  aria-label={item.label}
                  title={item.label}
                  onClick={() => setKind(item.kind)}
                  className="grid place-items-center rounded-xl border border-border bg-secondary/40 p-1 transition-colors hover:bg-secondary aria-checked:border-foreground aria-checked:bg-secondary"
                >
                  <Swatch kind={item.kind} />
                </button>
              ))}
            </div>
            <p className="text-xs leading-snug text-muted-foreground">
              Click the tree to hang it. Drag to move, or drag it off to remove.
              <span className="ml-1 font-mono">{ornaments.length}/{MAX_ORNAMENTS}</span>
            </p>
            {hint && <p role="status" className="text-xs text-brand-ink">{hint}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="tree-name" className="text-sm font-medium">Your name <span className="font-normal text-muted-foreground">(optional)</span></label>
            <Input
              id="tree-name"
              value={name}
              maxLength={24}
              onChange={(event) => { setName(event.target.value); if (!event.target.value.trim()) setAgreed(false); }}
              placeholder="Add it to your card"
              autoComplete="off"
            />
            {hasName && (
              <label className="flex items-start gap-2 text-xs leading-snug text-muted-foreground">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                  className="mt-0.5 size-3.5 accent-[var(--brand)]"
                />
                <span>
                  I agree to the{" "}
                  <button type="button" onClick={() => setPrivacyOpen(true)} className="text-foreground underline underline-offset-2">
                    Data Privacy Notice
                  </button>
                  .
                </span>
              </label>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={save} disabled={!canSave}>
                <Save className="size-4" /> Save my card
              </Button>
              <Button type="button" variant="outline" disabled={!ornaments.length} onClick={() => setOrnaments((list) => list.slice(0, -1))}>
                <Undo2 className="size-4" /> Undo
              </Button>
              <Button type="button" variant="outline" disabled={!ornaments.length} onClick={() => setOrnaments([])}>
                <Eraser className="size-4" /> Clear
              </Button>
            </div>
            {!ornaments.length && <p className="text-xs text-muted-foreground">Hang at least one ornament to save.</p>}
            {blocked && <p className="text-xs text-muted-foreground">Tick the Data Privacy box to add your name, or clear the name.</p>}
          </div>
        </div>

        {/* Right square: the tree. */}
        <div
          ref={panelRef}
          onPointerMove={tilt}
          onPointerLeave={untilt}
          className="relative overflow-hidden rounded-3xl border border-border bg-[#0a0a0a] transition-transform duration-200 ease-out will-change-transform max-lg:aspect-square lg:aspect-square"
        >
          <p className="pointer-events-none absolute top-4 left-5 z-10 text-xl leading-[0.95] font-medium tracking-tight text-white sm:text-2xl">
            Merry<br />Christmas<span className="text-[#d8232a]">.</span>
          </p>
          <div className="absolute inset-0 flex items-center justify-center p-1.5">
            <div ref={boxRef} className="relative h-full max-w-full" style={{ aspectRatio: String(TREE_ASPECT) }}>
              <canvas
                ref={canvasRef}
                role="img"
                aria-label="Your Christmas tree. Click to hang the selected ornament, drag to move it, drag it off the tree to remove it."
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                className="absolute inset-0 size-full cursor-crosshair touch-none select-none"
              />
              <canvas ref={overlayRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Data Privacy Notice</DialogTitle>
            <DialogDescription>How your name and tree are handled.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>The name you type is used only to personalise the greeting card on your screen.</p>
            <p>
              It is <strong className="text-foreground">not saved</strong> to any database, not sent to a server and not shared.
              Your decorated tree works the same way: it exists only in your browser while this page is open, and the card
              you save as a PNG or GIF is made on your own device.
            </p>
            <p>Close or refresh the page and both are gone. You can also leave the name empty and still save your card.</p>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setPrivacyOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChristmasCard open={cardOpen} onOpenChange={setCardOpen} image={cardImage} name={hasName ? name : ""} cover={cover} ornaments={ornaments} music={music} />
    </section>
  );
}
