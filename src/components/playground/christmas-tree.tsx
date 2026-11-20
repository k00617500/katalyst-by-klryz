"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Eraser, Save, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SectionHeading } from "@/components/ui/section-heading";
import { resolveChristmas } from "@/lib/christmas";
import {
  MAX_ORNAMENTS, ORNAMENT_LIST, TREE_ASPECT, drawOrnament, drawTree, hitOrnament, nearTree,
  type Ornament, type OrnamentKind,
} from "@/lib/christmas-tree";
import { ChristmasCard, pickCardCover } from "@/components/playground/christmas-card";

function Swatch({ kind }: { kind: OrnamentKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 48 * dpr;
    canvas.height = 48 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 48, 48);
    drawOrnament(ctx, kind, 24, kind === "candy" || kind === "ginger" ? 26 : 28, 13);
  }, [kind]);
  return <canvas ref={ref} aria-hidden="true" className="size-12" />;
}

/**
 * Christmas season only: decorate a dot-matrix tree, then turn it into a two-fold greeting card. The name is optional
 * and, like the tree, is never stored or sent anywhere (a short privacy notice says so).
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
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

  const point = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { u: (event.clientX - rect.left) / rect.width, v: (event.clientY - rect.top) / rect.height };
  }, []);

  const onDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || !width) return;
    const { u, v } = point(event);
    const existing = hitOrnament(ornaments, u, v, width);
    if (existing) {
      // Grab it: move it to the top of the pile and start dragging.
      setOrnaments((list) => [...list.filter((o) => o.id !== existing.id), existing]);
      drag.current = { id: existing.id, pointerId: event.pointerId };
      event.currentTarget.setPointerCapture(event.pointerId);
      setHint("");
      return;
    }
    if (!nearTree(u, v)) { setHint("Hang ornaments on the tree."); return; }
    if (ornaments.length >= MAX_ORNAMENTS) { setHint(`That's a full tree (${MAX_ORNAMENTS} ornaments). Undo one to add another.`); return; }
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
      // Dropped off the tree: it comes back off.
      setOrnaments((list) => list.filter((o) => o.id !== current.id));
      setHint("Ornament removed. Drop them on the tree to keep them.");
    }
  };

  const hasName = name.trim().length > 0;
  const blocked = hasName && !agreed;
  const canSave = ornaments.length > 0 && !blocked;

  const save = () => {
    if (!canSave) return;
    const outWidth = 900;
    const out = document.createElement("canvas");
    out.width = outWidth;
    out.height = Math.round(outWidth / TREE_ASPECT);
    const ctx = out.getContext("2d");
    if (!ctx) return;
    drawTree(ctx, outWidth, ornaments, "#0a0a0a");
    setCardImage(out.toDataURL("image/png"));
    setCover(pickCardCover());
    setCardOpen(true);
  };

  if (!active) return null;

  return (
    <section id="christmas-tree" className="container-page section-y scroll-mt-24 border-t border-border/60">
      <SectionHeading
        eyebrow="Christmas"
        title="Decorate your own tree"
        description="Pick your ornaments, hang them on the tree, then save it as a two-fold Christmas card."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-12">
        <div className="mx-auto w-full max-w-[560px] overflow-hidden rounded-2xl border border-border bg-[#0a0a0a] p-4 sm:p-6">
          <div ref={boxRef} className="relative w-full" style={{ aspectRatio: String(TREE_ASPECT) }}>
            <canvas
              ref={canvasRef}
              aria-label="Your Christmas tree. Click to hang the selected ornament, drag to move it, drag it off the tree to remove it."
              role="img"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              className="absolute inset-0 size-full cursor-crosshair touch-none select-none"
            />
          </div>
          <div className="mt-4 flex items-end justify-between gap-6 text-white">
            <p className="text-4xl leading-[0.95] font-medium tracking-tight sm:text-6xl">
              Merry<br />Christmas<span className="text-[#d8232a]">.</span>
            </p>
            <p className="max-w-[12rem] pb-1 text-[11px] leading-snug text-white/70">
              Wishing you clarity and joy this season. Merry Christmas from The Katalyst by Klaryze.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Ornaments</Label>
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
                  className="grid place-items-center rounded-xl border border-border bg-secondary/40 p-1.5 transition-colors hover:bg-secondary aria-checked:border-foreground aria-checked:bg-secondary"
                >
                  <Swatch kind={item.kind} />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Click the tree to hang the selected ornament. Drag to move it, or drag it off the tree to remove it.
              <span className="ml-1 font-mono">{ornaments.length}/{MAX_ORNAMENTS}</span>
            </p>
            {hint && <p role="status" className="text-xs text-brand-ink">{hint}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tree-name">Your name <span className="text-muted-foreground">(optional)</span></Label>
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

          <div className="flex flex-wrap items-center gap-3">
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
          {!ornaments.length && <p className="text-xs text-muted-foreground">Hang at least one ornament to save your card.</p>}
          {blocked && <p className="text-xs text-muted-foreground">Tick the Data Privacy box to put your name on the card, or clear the name.</p>}
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
              Your decorated tree works the same way: it exists only in your browser while this page is open.
            </p>
            <p>Close or refresh the page and both are gone. You can also leave the name empty and still save your card.</p>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setPrivacyOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChristmasCard open={cardOpen} onOpenChange={setCardOpen} image={cardImage} name={hasName ? name : ""} cover={cover} />
    </section>
  );
}
