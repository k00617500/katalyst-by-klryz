"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { ArrowLeft, ArrowRight, Download, Loader2, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_RATING, MAX_MOODS, MIN_MOODS, MOOD_OPTIONS, memojiSrc, vibeMemojis } from "@/data/vibe-check";
import { POSTER_H, POSTER_W, colorsForBackground, describeVibe, drawPoster, type PosterColors } from "@/lib/vibe-poster";

type Step = "name" | "face" | "moods" | "rate" | "loading" | "result";
type Selection = { kind: "memoji"; id: string } | { kind: "upload"; file: File; previewUrl: string };
type Removal = "idle" | "finding" | "cutting" | "done";

const STEP_NUMBER: Record<Step, number> = { name: 1, face: 2, moods: 3, rate: 4, loading: 4, result: 5 };
const STEP_COUNT = 5;
const NEUTRAL_LABELS = ["", "", "", "", ""];
const NEUTRAL_VALUES = [5, 5, 5, 5, 5];
const LOADING_LINES = [
  "reading your aura…",
  "stretching your face (lovingly)…",
  "consulting the vibe oracle…",
  "almost there, no peeking…",
];
const MIN_LOADING_MS = 2600;
const RATING_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const BACKGROUNDS = [
  { value: "#ffffff", label: "White" },
  { value: "#f5efe3", label: "Cream" },
  { value: "#cfe8ff", label: "Sky" },
  { value: "#d8f5e4", label: "Mint" },
  { value: "#ffd9e2", label: "Blush" },
  { value: "#e3d9ff", label: "Lilac" },
  { value: "#ffeaa7", label: "Sunny" },
  { value: "#0b0b0c", label: "Ink" },
];

interface Sized {
  source: CanvasImageSource;
  w: number;
  h: number;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string) {
  let cached = imageCache.get(src);
  if (!cached) {
    cached = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("image failed"));
      image.src = src;
    });
    imageCache.set(src, cached);
  }
  return cached;
}

function readColors(background: string | null = null): PosterColors {
  const base = readThemeColors();
  return background ? colorsForBackground(background, base) : base;
}

function readThemeColors(): PosterColors {
  const read = (variable: string) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${variable})`;
    probe.style.display = "none";
    document.body.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  };
  return { fg: read("--foreground"), bg: read("--background"), muted: read("--muted-foreground") };
}

const posterFont = () => getComputedStyle(document.body).fontFamily;
const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode"))), type, quality));

/** Downsizes (and strips EXIF from) the photo before it leaves the browser. */
async function toUploadBlob(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return toBlob(canvas, "image/jpeg", 0.9);
}

/** Draws the cut-out onto a transparent square so stretching never squashes the subject. */
async function cutoutToCanvas(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    const side = Math.min(1024, Math.max(image.naturalWidth, image.naturalHeight));
    const scale = side / Math.max(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = side;
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    canvas.getContext("2d")!.drawImage(image, (side - w) / 2, (side - h) / 2, w, h);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Bounding box of the visible (non-transparent) pixels. */
function visibleBounds(canvas: HTMLCanvasElement) {
  const { width, height } = canvas;
  const data = canvas.getContext("2d")!.getImageData(0, 0, width, height).data;
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (data[(y * width + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : { x0: 0, y0: 0, x1: width, y1: height };
}

/**
 * Crops the cut-out to the head: Gemini's box ([ymin, xmin, ymax, xmax] on a 0-1000 scale) when we have one,
 * otherwise the top of the visible subject, which is where the head is in a single-subject photo.
 */
function cropToHead(canvas: HTMLCanvasElement, box: number[] | null): Sized {
  let left: number, top: number, headW: number, headH: number;
  if (box) {
    top = box[0] / 1000 * canvas.height;
    left = box[1] / 1000 * canvas.width;
    headH = box[2] / 1000 * canvas.height - top;
    headW = box[3] / 1000 * canvas.width - left;
  } else {
    const bounds = visibleBounds(canvas);
    const width = bounds.x1 - bounds.x0;
    const height = bounds.y1 - bounds.y0;
    headW = Math.min(width, height * 0.5);
    headH = headW * 1.15;
    left = bounds.x0 + (width - headW) / 2;
    top = bounds.y0;
  }
  const side = Math.max(headW, headH) * 1.45;
  const x = left + headW / 2 - side / 2;
  const y = top + headH / 2 - side / 2 - headH * 0.04;
  const out = Math.min(900, Math.round(side));
  const scale = out / side;
  const result = document.createElement("canvas");
  result.width = result.height = out;
  result.getContext("2d")!.drawImage(canvas, -x * scale, -y * scale, canvas.width * scale, canvas.height * scale);
  return { source: result, w: out, h: out };
}

function PosterCanvas({ face, username, labels, values, blurb, placeholder, resetKey, background }: {
  face: Sized | null;
  username: string;
  labels: string[];
  values: number[];
  blurb: string;
  placeholder?: string;
  resetKey: number;
  background: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = useRef<number[]>([...values]);
  const latest = useRef({ face, username, labels, values, blurb, placeholder, background });
  const frame = useRef(0);
  const lastReset = useRef(resetKey);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { face: faceNow, username: name, labels: axes, values: target, blurb: text, placeholder: hint, background: bg } = latest.current;
    const scale = canvas.width / POSTER_W;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawPoster(ctx, {
      source: faceNow?.source ?? null,
      sourceSize: { w: faceNow?.w ?? 1, h: faceNow?.h ?? 1 },
      thumb: faceNow?.source ?? null,
      thumbSize: { w: faceNow?.w ?? 1, h: faceNow?.h ?? 1 },
      labels: axes,
      ratings: current.current,
      finalRatings: target,
      username: name,
      blurb: text,
      colors: readColors(bg),
      fontFamily: posterFont(),
      placeholder: hint,
    });
  }, []);

  // Render at the real on-screen pixel size so text and edges stay crisp on every display.
  useEffect(() => {
    const canvas = canvasRef.current;
    const holder = canvas?.parentElement;
    if (!canvas || !holder) return;
    const resize = () => {
      const size = Math.max(1, Math.min(2160, Math.round(holder.clientWidth * (window.devicePixelRatio || 1))));
      if (canvas.width !== size) {
        canvas.width = size;
        canvas.height = size;
        draw();
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(holder);
    return () => observer.disconnect();
  }, [draw]);

  const valuesKey = `${labels.join("|")}#${values.join()}`;
  useEffect(() => {
    latest.current = { face, username, labels, values, blurb, placeholder, background };
    if (lastReset.current !== resetKey) {
      lastReset.current = resetKey;
      current.current = values.map(() => 0.4);
    }
    if (current.current.length !== values.length) current.current = [...values];
    cancelAnimationFrame(frame.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = [...values];
      draw();
      return;
    }
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ease = 1 - Math.exp(-dt * 7);
      let moving = false;
      latest.current.values.forEach((target, i) => {
        const diff = target - current.current[i];
        if (Math.abs(diff) > 0.005) {
          current.current[i] += diff * ease;
          moving = true;
        } else current.current[i] = target;
      });
      draw();
      if (moving) frame.current = requestAnimationFrame(step);
    };
    step(last);
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [face, username, valuesKey, blurb, placeholder, resetKey, background, draw]);

  useEffect(() => {
    const observer = new MutationObserver(() => draw());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    void document.fonts?.ready.then(draw);
    return () => observer.disconnect();
  }, [draw]);

  return <canvas ref={canvasRef} width={900} height={900} role="img" aria-label="Your vibe chart" className="block size-full text-foreground" />;
}

function StepNav({ onPrev, onNext, prevDisabled, nextDisabled, nextLabel = "Next" }: {
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Button type="button" variant="outline" className="rounded-full pr-5" disabled={prevDisabled} onClick={onPrev}><ArrowLeft className="size-4" />Prev</Button>
      <Button type="button" className="rounded-full pl-6" disabled={nextDisabled} onClick={onNext}>{nextLabel}<ArrowRight className="size-4" /></Button>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const active = STEP_NUMBER[step];
  return (
    <ol className="mx-auto flex items-center justify-center" aria-label={`Step ${active} of ${STEP_COUNT}`}>
      {Array.from({ length: STEP_COUNT }, (_, i) => i + 1).map((number) => (
        <li key={number} className="flex items-center">
          <span aria-current={number === active ? "step" : undefined}
            className={`grid size-7 place-items-center rounded-full border font-mono text-xs tabular-nums transition-colors ${
              number === active ? "border-brand bg-brand text-brand-foreground" : number < active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"
            }`}>{number}</span>
          {number < STEP_COUNT && <span aria-hidden className={`h-px w-5 sm:w-8 ${number < active ? "bg-foreground" : "bg-border"}`} />}
        </li>
      ))}
    </ol>
  );
}

export function VibeCheck() {
  const [step, setStep] = useState<Step>("name");
  const [username, setUsername] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [moodHint, setMoodHint] = useState("");
  const [background, setBackground] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyOk, setPrivacyOk] = useState(false);
  const [removal, setRemoval] = useState<Removal>("idle");
  const [error, setError] = useState("");
  const [cutout, setCutout] = useState<Sized | null>(null);
  const [memojiFace, setMemojiFace] = useState<Sized | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const removalPromise = useRef<Promise<boolean> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const stepRef = useRef<Step>("name");
  stepRef.current = step;

  // The picked memoji becomes the face on the poster.
  useEffect(() => {
    if (selection?.kind !== "memoji") return;
    const memoji = vibeMemojis.find((item) => item.id === selection.id);
    if (!memoji) return;
    let cancelled = false;
    void loadImage(memojiSrc(memoji)).then((image) => {
      if (!cancelled) setMemojiFace({ source: image, w: image.naturalWidth, h: image.naturalHeight });
    });
    return () => { cancelled = true; };
  }, [selection]);

  useEffect(() => {
    if (step !== "loading") return;
    const timer = setInterval(() => setLineIndex((value) => (value + 1) % LOADING_LINES.length), 700);
    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => () => { if (selection?.kind === "upload") URL.revokeObjectURL(selection.previewUrl); }, [selection]);

  const face: Sized | null = selection?.kind === "upload" ? cutout : selection ? memojiFace : null;
  const name = username.trim();
  const chosen = picked.map((label) => ({ ...MOOD_OPTIONS.find((mood) => mood.label === label)!, rating: ratings[label] ?? DEFAULT_RATING }));
  const hasAxes = chosen.length >= MIN_MOODS;
  const labels = hasAxes ? chosen.map((mood) => mood.label) : NEUTRAL_LABELS;
  const values = hasAxes ? chosen.map((mood) => mood.rating) : NEUTRAL_VALUES;
  const blurb = hasAxes ? describeVibe(chosen) : "";

  const chooseFile = () => {
    if (privacyOk) fileInput.current?.click();
    else setPrivacyOpen(true);
  };

  const confirmPrivacy = () => {
    setPrivacyOk(true);
    setPrivacyOpen(false);
    fileInput.current?.click();
  };

  /** Cuts out the background, then finds the head (Gemini) and keeps just that. */
  const startRemoval = (file: File) => {
    setRemoval("cutting");
    const job = (async () => {
      try {
        const photo = await toUploadBlob(file);
        const body = new FormData();
        body.append("image", photo, "photo.jpg");
        const response = await fetch("/api/remove-bg", { method: "POST", body });
        if (!response.ok) {
          const message = (await response.json().catch(() => null))?.error;
          throw new Error(message || "Couldn't cut out that photo.");
        }
        const subject = await cutoutToCanvas(await response.blob());
        setRemoval("finding");
        let box: number[] | null = null;
        try {
          const detect = new FormData();
          detect.append("image", await toBlob(subject, "image/png"), "subject.png");
          const reply = await fetch("/api/detect-head", { method: "POST", body: detect });
          if (reply.ok) box = (await reply.json())?.box ?? null;
        } catch { /* fall back to a head-first crop */ }
        setCutout(cropToHead(subject, box));
        setRemoval("done");
        return true;
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Something went wrong with that photo.");
        setSelection(null);
        setRemoval("idle");
        if (stepRef.current !== "result") setStep("face");
        return false;
      }
    })();
    removalPromise.current = job;
  };

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 12 * 1024 * 1024) {
      setError("Please use a JPG, PNG or WebP photo (up to 12 MB).");
      return;
    }
    setError("");
    setCutout(null);
    setSelection({ kind: "upload", file, previewUrl: URL.createObjectURL(file) });
    startRemoval(file);
  };

  const toggleMood = (label: string) => {
    setPicked((value) => (value.includes(label) ? value.filter((item) => item !== label) : value.length < MAX_MOODS ? [...value, label] : value));
  };

  const reveal = async () => {
    setStep("loading");
    setLineIndex(0);
    const [ok] = await Promise.all([removalPromise.current ?? Promise.resolve(true), new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS))]);
    if (!ok || stepRef.current !== "loading") return;
    setResetKey((value) => value + 1);
    setStep("result");
  };

  const restart = () => {
    setStep("name");
    setUsername("");
    setSelection(null);
    setCutout(null);
    setMemojiFace(null);
    setPicked([]);
    setRatings({});
    setBackground(null);
    setRemoval("idle");
    setError("");
    removalPromise.current = null;
    setResetKey((value) => value + 1);
  };

  const download = async () => {
    if (!face) return;
    const canvas = document.createElement("canvas");
    canvas.width = POSTER_W;
    canvas.height = POSTER_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawPoster(ctx, {
      source: face.source,
      sourceSize: { w: face.w, h: face.h },
      thumb: face.source,
      thumbSize: { w: face.w, h: face.h },
      labels,
      ratings: values,
      finalRatings: values,
      username,
      blurb,
      colors: readColors(background),
      fontFamily: posterFont(),
    });
    const blob = await toBlob(canvas, "image/png");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `the-katalyst-${(name || "me").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "me"}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const processing = removal === "cutting" || removal === "finding";
  const placeholder = selection?.kind === "upload" && !cutout
    ? (removal === "finding" ? "finding your face…" : "cutting out your background…")
    : "pick a face to start";
  const busyText = removal === "finding" ? "Finding your face…" : "Cutting out your background…";

  return (
    <section id="vibe-check" className="section-y mx-auto w-full max-w-[1200px] scroll-mt-24 border-t border-border/60 px-4 text-center sm:px-6">
      <span className="font-mono text-xs tracking-[0.2em] text-brand-ink uppercase">Vibe check</span>
      <h2 className="mx-auto mt-4 max-w-2xl text-balance text-3xl font-medium tracking-tight md:text-5xl">How are you feeling in here?</h2>
      <p className="mx-auto mt-4 max-w-md text-balance text-base text-muted-foreground md:text-lg">
        Feeling a bit quirky? I won&apos;t judge. Pick a face, pick your moods, and watch it get weird.
      </p>

      <div className="mt-10 grid items-stretch gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:p-6 lg:aspect-square">
          <Stepper step={step} />

          {step === "name" && (
            <form className="flex flex-1 flex-col items-center justify-center gap-5" onSubmit={(event) => { event.preventDefault(); if (name) setStep("face"); }}>
              <div>
                <p className="text-2xl font-medium tracking-tight">First things first.</p>
                <p className="mt-1.5 text-muted-foreground">What should I call you?</p>
              </div>
              <input value={username} onChange={(event) => setUsername(event.target.value.slice(0, 24))} placeholder="your name or alias" autoComplete="off" aria-label="Your name or alias"
                className="w-full max-w-xs rounded-2xl border border-border bg-background px-4 py-3 text-center text-base outline-none transition-colors focus:border-brand" />
              <div className="flex flex-wrap justify-center gap-3">
                <Button type="button" variant="outline" className="rounded-full pr-5" disabled><ArrowLeft className="size-4" />Prev</Button>
                <Button type="submit" className="rounded-full pl-6" disabled={!name}>Next<ArrowRight className="size-4" /></Button>
              </div>
            </form>
          )}

          {step === "face" && (
            <div className="flex min-h-0 flex-1 flex-col items-center gap-3">
              <div>
                <p className="text-lg font-medium tracking-tight sm:text-xl">Pick a face, or bring your own{name ? `, ${name}` : ""}.</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Upload one photo of one subject. We&apos;ll keep just the head.</p>
              </div>
              <div className="grid min-h-0 w-full flex-1 grid-cols-4 gap-2 lg:grid-rows-3">
                {vibeMemojis.map((memoji) => {
                  const active = selection?.kind === "memoji" && selection.id === memoji.id;
                  return (
                    <button key={memoji.id} type="button" aria-pressed={active} onClick={() => { setSelection({ kind: "memoji", id: memoji.id }); setError(""); }}
                      className="group flex min-h-0 flex-col items-center gap-1">
                      <span className="relative aspect-square w-full lg:min-h-0 lg:flex-1">
                        <span className={`absolute inset-y-0 left-1/2 grid aspect-square h-full -translate-x-1/2 place-items-center overflow-hidden rounded-2xl bg-muted p-1 ring-2 transition-transform group-hover:-translate-y-0.5 ${active ? "ring-brand" : "ring-transparent"}`}>
                          <Image src={memojiSrc(memoji)} alt="" width={256} height={256} className="size-full object-contain" draggable={false} />
                        </span>
                      </span>
                      <span className={`font-mono text-[10px] ${active ? "text-foreground" : "text-muted-foreground"}`}>{memoji.label}</span>
                    </button>
                  );
                })}
                <button type="button" onClick={chooseFile} aria-pressed={selection?.kind === "upload"} className="group flex min-h-0 flex-col items-center gap-1">
                  <span className="relative aspect-square w-full lg:min-h-0 lg:flex-1">
                    <span className={`absolute inset-y-0 left-1/2 grid aspect-square h-full -translate-x-1/2 place-items-center overflow-hidden rounded-2xl border-2 border-dashed bg-muted/50 text-muted-foreground ring-2 transition-transform group-hover:-translate-y-0.5 ${selection?.kind === "upload" ? "border-transparent ring-brand" : "border-border ring-transparent"}`}>
                      {selection?.kind === "upload"
                        ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={selection.previewUrl} alt="" className="size-full object-cover" />
                        : <Upload className="size-5" aria-hidden="true" />}
                    </span>
                  </span>
                  <span className={`font-mono text-[10px] ${selection?.kind === "upload" ? "text-foreground" : "text-muted-foreground"}`}>{selection?.kind === "upload" ? "Your photo" : "Upload photo"}</span>
                </button>
              </div>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1}
                onChange={(event) => { pickFile(event.target.files?.[0]); event.target.value = ""; }} />
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {processing && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{busyText}</p>}
              <StepNav onPrev={() => setStep("name")} onNext={() => setStep("moods")} nextDisabled={!selection} />
            </div>
          )}

          {step === "moods" && (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-3">
              <div>
                <p className="text-lg font-medium tracking-tight sm:text-xl">What are you feeling{name ? `, ${name}` : ""}?</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Pick {MIN_MOODS} to {MAX_MOODS}. They become your chart.</p>
              </div>
              <div className="grid w-full grid-cols-4 gap-1.5 sm:gap-2" role="group" aria-label="Moods">
                {MOOD_OPTIONS.map((mood) => {
                  const active = picked.includes(mood.label);
                  const full = !active && picked.length >= MAX_MOODS;
                  return (
                    <button key={mood.label} type="button" aria-pressed={active} disabled={full} title={mood.description}
                      onMouseEnter={() => setMoodHint(mood.description)} onFocus={() => setMoodHint(mood.description)} onClick={() => { toggleMood(mood.label); setMoodHint(mood.description); }}
                      className={`h-9 truncate rounded-xl border px-1 text-xs transition-colors sm:h-10 sm:text-sm ${
                        active ? "border-brand bg-brand text-brand-foreground" : "border-border bg-background hover:border-foreground disabled:opacity-40 disabled:hover:border-border"
                      }`}>{mood.label}</button>
                  );
                })}
              </div>
              <p className="min-h-5 text-sm text-muted-foreground" aria-live="polite">{moodHint || "Hover a mood to see what it means."}</p>
              <StepNav onPrev={() => setStep("face")} onNext={() => setStep("rate")} nextDisabled={picked.length < MIN_MOODS} />
            </div>
          )}

          {step === "rate" && (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-3">
              <div>
                <p className="text-lg font-medium tracking-tight sm:text-xl">How strongly, {name || "friend"}?</p>
                <p className="mt-0.5 text-sm text-muted-foreground">1 is barely, 10 is very much. Watch the chart move.</p>
              </div>
              <div className="flex w-full flex-col gap-2.5">
                {chosen.map((mood) => (
                  <div key={mood.label} role="group" aria-label={mood.label} className="flex flex-col gap-1">
                    <span className="font-mono text-xs tracking-widest uppercase">{mood.label}</span>
                    <div className="grid grid-cols-10 gap-1">
                      {RATING_NUMBERS.map((number) => (
                        <button key={number} type="button" aria-pressed={mood.rating === number} onClick={() => setRatings((value) => ({ ...value, [mood.label]: number }))}
                          className={`h-8 rounded-lg border font-mono text-xs tabular-nums transition-colors sm:h-9 sm:text-sm ${
                            mood.rating === number ? "border-brand bg-brand text-brand-foreground" : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
                          }`}>{number}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <StepNav onPrev={() => setStep("moods")} onNext={reveal} />
            </div>
          )}

          {step === "loading" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4" role="status" aria-live="polite">
              <Loader2 className="size-8 animate-spin text-brand-ink" aria-hidden="true" />
              <p className="font-mono text-sm">{LOADING_LINES[lineIndex]}</p>
            </div>
          )}

          {step === "result" && (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
              <div>
                <p className="text-2xl font-medium tracking-tight">Here&apos;s your vibe{name ? `, ${name}` : ""}.</p>
                <p className="mx-auto mt-1.5 max-w-xs text-muted-foreground">Screenshot-worthy, if you ask me. Grab it or go again.</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Pick a background</span>
                <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Background colour">
                  <button type="button" aria-label="Match the site theme" aria-pressed={background === null} title="Match the site theme" onClick={() => setBackground(null)}
                    className={`grid size-8 place-items-center rounded-full border bg-background font-mono text-[10px] ring-2 ring-offset-2 ring-offset-card ${background === null ? "ring-brand" : "ring-transparent"} border-border`}>Auto</button>
                  {BACKGROUNDS.map((swatch) => (
                    <button key={swatch.value} type="button" aria-label={swatch.label} aria-pressed={background === swatch.value} title={swatch.label} onClick={() => setBackground(swatch.value)}
                      style={{ backgroundColor: swatch.value }}
                      className={`size-8 rounded-full border border-border ring-2 ring-offset-2 ring-offset-card ${background === swatch.value ? "ring-brand" : "ring-transparent"}`} />
                  ))}
                  <label className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-border bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" title="Custom colour">
                    <span className="sr-only">Custom colour</span>
                    <input type="color" value={background ?? "#ffffff"} onChange={(event) => setBackground(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button type="button" variant="outline" className="rounded-full pr-5" onClick={() => setStep("rate")}><ArrowLeft className="size-4" />Prev</Button>
                <Button className="rounded-full px-6" onClick={download}><Download className="size-4" />Download</Button>
                <Button variant="outline" className="rounded-full px-6" onClick={restart}><RotateCcw className="size-4" />Restart</Button>
              </div>
            </div>
          )}
        </div>

        <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-background">
          <PosterCanvas face={face} username={username} labels={labels} values={values} blurb={blurb} placeholder={placeholder} resetKey={resetKey} background={background} />
          {step === "loading" && (
            <div className="absolute inset-0 grid place-items-center bg-background/80" aria-hidden="true">
              <Loader2 className="size-9 animate-spin text-brand-ink" />
            </div>
          )}
        </div>
      </div>

      <Dialog.Root open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-[101] w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-background p-7 text-center outline-none">
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-brand/15 text-brand-ink"><ShieldCheck className="size-5" aria-hidden="true" /></span>
            <Dialog.Title className="mt-4 text-xl font-medium tracking-tight">Data privacy, real quick</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">Are you sure you want to upload a photo?</Dialog.Description>
            <ul className="mt-5 space-y-2 text-left text-sm">
              <li className="rounded-xl bg-muted px-4 py-2.5">Your photo goes to remove.bg to cut out the background, then to Google Gemini to find the head.</li>
              <li className="rounded-xl bg-muted px-4 py-2.5">We don&apos;t save it. It&apos;s gone when you restart or leave.</li>
              <li className="rounded-xl bg-muted px-4 py-2.5">Only you see the result, unless you download and share it.</li>
            </ul>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" className="rounded-full" onClick={() => setPrivacyOpen(false)}>Use a memoji instead</Button>
              <Button className="rounded-full" onClick={confirmPrivacy}>Yes, I&apos;m sure</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
