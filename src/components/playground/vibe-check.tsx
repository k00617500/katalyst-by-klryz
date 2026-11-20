"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { ArrowLeft, ArrowRight, Check, Download, Loader2, RotateCcw, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VibeKpis } from "@/components/playground/vibe-kpis";
import { DEFAULT_RATING, MAX_MOODS, MAX_RATING, MIN_MOODS, MOOD_OPTIONS, memojiSrc, vibeMemojis } from "@/data/vibe-check";
import { DEFAULT_GLOW, POSTER_H, POSTER_W, STORY_H, STORY_W, describeVibe, drawPoster, overallReview, type PosterColors, type PosterImage } from "@/lib/vibe-poster";

type Step = "name" | "face" | "moods" | "rate" | "loading" | "result";
type Selection = { kind: "memoji"; id: string } | { kind: "upload"; file: File; previewUrl: string };
type Removal = "idle" | "finding" | "cutting" | "done";

const STEP_NUMBER: Record<Step, number> = { name: 1, face: 2, moods: 3, rate: 4, loading: 4, result: 5 };
const STEP_COUNT = 5;
const NEUTRAL_LABELS = ["", "", "", "", ""];
const NEUTRAL_VALUES = [3, 3, 3, 3, 3];
const LOADING_LINES = [
  "reading your aura…",
  "stretching your face (lovingly)…",
  "consulting the vibe oracle…",
  "almost there, no peeking…",
];
const MIN_LOADING_MS = 2600;
const RATING_NUMBERS = Array.from({ length: MAX_RATING }, (_, i) => i + 1);
const GLOWS = [
  { value: DEFAULT_GLOW, label: "Neon green" },
  { value: "#5ec8ff", label: "Sky" },
  { value: "#34d399", label: "Mint" },
  { value: "#ffc24a", label: "Amber" },
  { value: "#ff7ab6", label: "Pink" },
  { value: "#ff6b6b", label: "Coral" },
  { value: "#a78bfa", label: "Violet" },
  { value: "#ffffff", label: "White" },
];

interface Sized {
  /** True when the head came out small or soft, so the result will look soft too. */
  lowQuality?: boolean;
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

function readColors(): PosterColors {
  return readThemeColors();
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

/** The poster is always set in Geist. */
const posterFont = () => getComputedStyle(document.documentElement).getPropertyValue("--font-geist-sans").trim() || "Geist, system-ui, sans-serif";
const loadPosterFont = () => Promise.all(["400", "500", "700"].map((weight) => document.fonts?.load(`${weight} 32px ${posterFont()}`))).catch(() => []);
const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode"))), type, quality));

/** Downsizes (and strips EXIF from) the photo before it leaves the browser. Smaller uploads mean faster results. */
async function toUploadBlob(file: Blob, maxSide = 1024, quality = 0.88) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return toBlob(canvas, "image/jpeg", quality);
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
    const offsetX = (side - w) / 2;
    const offsetY = (side - h) / 2;
    canvas.getContext("2d")!.drawImage(image, offsetX, offsetY, w, h);
    return { canvas, side, offsetX, offsetY, w, h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Gemini's box is relative to the photo; this maps it onto the square canvas the cut-out was drawn on. */
function boxOnCanvas(box: number[], placement: { side: number; offsetX: number; offsetY: number; w: number; h: number }) {
  const { side, offsetX, offsetY, w, h } = placement;
  return [
    ((offsetY + (box[0] / 1000) * h) / side) * 1000,
    ((offsetX + (box[1] / 1000) * w) / side) * 1000,
    ((offsetY + (box[2] / 1000) * h) / side) * 1000,
    ((offsetX + (box[3] / 1000) * w) / side) * 1000,
  ];
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

/** Mean x of the visible pixels inside a horizontal band, i.e. where the head sits across the photo. */
function bandCentre(canvas: HTMLCanvasElement, top: number, bottom: number, fallback: number) {
  const y0 = Math.max(0, Math.floor(top));
  const rows = Math.max(1, Math.min(canvas.height, Math.ceil(bottom)) - y0);
  const data = canvas.getContext("2d")!.getImageData(0, y0, canvas.width, rows).data;
  let sum = 0;
  let count = 0;
  for (let y = 0; y < rows; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      if (data[(y * canvas.width + x) * 4 + 3] > 24) { sum += x; count++; }
    }
  }
  return count ? sum / count : fallback;
}

/** Laplacian variance of the head crop: low means soft or blurry. */
function sharpnessOf(source: HTMLCanvasElement) {
  const n = 96;
  const probe = document.createElement("canvas");
  probe.width = probe.height = n;
  const ctx = probe.getContext("2d")!;
  ctx.drawImage(source, 0, 0, n, n);
  const { data } = ctx.getImageData(0, 0, n, n);
  const gray = (i: number) => data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < n - 1; y++) {
    for (let x = 1; x < n - 1; x++) {
      const i = y * n + x;
      if (data[i * 4 + 3] < 220) continue;
      const lap = gray(i - 1) + gray(i + 1) + gray(i - n) + gray(i + n) - 4 * gray(i);
      sum += lap; sumSq += lap * lap; count++;
    }
  }
  if (count < 200) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

/**
 * Crops the cut-out to the head only. Uses Gemini's box ([ymin, xmin, ymax, xmax] on a 0-1000 scale) when we have
 * one; otherwise estimates the head from the top of the visible subject (smaller for full-body shots) so the
 * crop is the head, never the upper body.
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
    const ratio = height / Math.max(1, width);
    const fraction = ratio >= 2.2 ? 0.14 : ratio >= 1.5 ? 0.19 : ratio >= 1 ? 0.26 : 0.4;
    headH = height * fraction;
    headW = headH * 0.85;
    top = bounds.y0;
    left = bandCentre(canvas, bounds.y0, bounds.y0 + headH, bounds.x0 + width / 2) - headW / 2;
  }
  const side = Math.max(headW, headH) * 1.18;
  const x = left + headW / 2 - side / 2;
  const y = top + headH / 2 - side / 2 - headH * 0.04;
  const out = Math.min(900, Math.max(64, Math.round(side)));
  const scale = out / side;
  const result = document.createElement("canvas");
  result.width = result.height = out;
  result.getContext("2d")!.drawImage(canvas, -x * scale, -y * scale, canvas.width * scale, canvas.height * scale);
  const lowQuality = side < 220 || sharpnessOf(result) < 8;
  return { source: result, w: out, h: out, lowQuality };
}

const QR_SRC = "/images/the-katalyst-back.png";

/** The Katalyst QR code, loaded once and drawn beside the chosen picture. */
function useQr() {
  const [qr, setQr] = useState<PosterImage | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadImage(QR_SRC).then((image) => { if (!cancelled) setQr({ source: image, w: image.naturalWidth, h: image.naturalHeight }); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return qr;
}

function PosterCanvas({ face, username, labels, values, blurb, review, placeholder, resetKey, glow, qr }: {
  face: Sized | null;
  username: string;
  labels: string[];
  values: number[];
  blurb: string;
  review: string;
  placeholder?: string;
  resetKey: number;
  glow: string;
  qr: PosterImage | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = useRef<number[]>([...values]);
  const latest = useRef({ face, username, labels, values, blurb, review, placeholder, glow, qr });
  const frame = useRef(0);
  const lastReset = useRef(resetKey);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { face: faceNow, username: name, labels: axes, blurb: text, review: verdict, placeholder: hint, glow: glowNow, qr: qrNow } = latest.current;
    const scale = canvas.width / POSTER_W;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawPoster(ctx, {
      source: faceNow?.source ?? null,
      sourceSize: { w: faceNow?.w ?? 1, h: faceNow?.h ?? 1 },
      thumb: faceNow?.source ?? null,
      thumbSize: { w: faceNow?.w ?? 1, h: faceNow?.h ?? 1 },
      labels: axes,
      ratings: current.current,
      review: verdict,
      username: name,
      blurb: text,
      colors: readColors(),
      glow: glowNow,
      qr: qrNow,
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
    latest.current = { face, username, labels, values, blurb, review, placeholder, glow, qr };
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
  }, [face, username, valuesKey, blurb, review, placeholder, resetKey, glow, qr, draw]);

  useEffect(() => {
    const observer = new MutationObserver(() => draw());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    void loadPosterFont().then(draw);
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
  const [glow, setGlow] = useState(DEFAULT_GLOW);
  const qr = useQr();
  const [kpiKey, setKpiKey] = useState(0);
  const submitted = useRef(false);
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
  const review = hasAxes ? overallReview(chosen).label : "waiting on your moods";

  const chooseFile = () => {
    if (privacyOk) fileInput.current?.click();
    else setPrivacyOpen(true);
  };

  const confirmPrivacy = () => {
    setPrivacyOk(true);
    setPrivacyOpen(false);
    fileInput.current?.click();
  };

  /**
   * Cuts out the background (remove.bg) while Gemini finds the head at the same time, then keeps just the head.
   * Gemini never holds things up: if it hasn't answered by the time the cut-out is back, a head-first crop is used.
   */
  const startRemoval = (file: File) => {
    setRemoval("cutting");
    const job = (async () => {
      try {
        const photo = await toUploadBlob(file, 1024);
        const detectPromise: Promise<number[] | null> = (async () => {
          try {
            const small = await toUploadBlob(photo, 512, 0.8);
            const detect = new FormData();
            detect.append("image", small, "photo.jpg");
            const reply = await fetch("/api/detect-head", { method: "POST", body: detect });
            return reply.ok ? ((await reply.json())?.box ?? null) : null;
          } catch {
            return null;
          }
        })();

        const body = new FormData();
        body.append("image", photo, "photo.jpg");
        const response = await fetch("/api/remove-bg", { method: "POST", body });
        if (!response.ok) {
          const message = (await response.json().catch(() => null))?.error;
          throw new Error(message || "Couldn't cut out that photo.");
        }
        const placement = await cutoutToCanvas(await response.blob());
        setRemoval("finding");
        const box = await Promise.race([detectPromise, new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500))]);
        setCutout(cropToHead(placement.canvas, box ? boxOnCanvas(box, placement) : null));
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

  const clearUpload = () => {
    removalPromise.current = null;
    setSelection(null);
    setCutout(null);
    setRemoval("idle");
    setError("");
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
    if (!submitted.current && chosen.length >= MIN_MOODS) {
      // Save the finished result anonymously (moods + ratings only), then refresh the KPI graphs.
      submitted.current = true;
      void fetch("/api/vibe-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moods: chosen.map((mood) => ({ label: mood.label, rating: mood.rating })) }),
      }).then(() => setKpiKey((value) => value + 1)).catch(() => {});
    }
  };

  const restart = () => {
    setStep("name");
    setUsername("");
    setSelection(null);
    setCutout(null);
    setMemojiFace(null);
    setPicked([]);
    setRatings({});
    setGlow(DEFAULT_GLOW);
    submitted.current = false;
    setRemoval("idle");
    setError("");
    removalPromise.current = null;
    setResetKey((value) => value + 1);
  };

  const download = async () => {
    if (!face) return;
    await loadPosterFont();
    const canvas = document.createElement("canvas");
    // Instagram story: 1080 x 1920 (9:16).
    canvas.width = STORY_W;
    canvas.height = STORY_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawPoster(ctx, {
      layout: "story",
      qr,
      source: face.source,
      sourceSize: { w: face.w, h: face.h },
      thumb: face.source,
      thumbSize: { w: face.w, h: face.h },
      labels,
      ratings: values,
      review,
      username,
      blurb,
      colors: readColors(),
      glow,
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
                <div className="flex min-h-0 flex-col items-center gap-1">
                  <button type="button" onClick={chooseFile} aria-label={selection?.kind === "upload" ? "Choose a different photo" : "Upload photo"} aria-pressed={selection?.kind === "upload"} className="group relative aspect-square w-full lg:min-h-0 lg:flex-1">
                    <span className={`absolute inset-y-0 left-1/2 grid aspect-square h-full -translate-x-1/2 place-items-center overflow-hidden rounded-2xl border-2 border-dashed bg-muted/50 text-muted-foreground ring-2 transition-transform group-hover:-translate-y-0.5 ${selection?.kind === "upload" ? "border-transparent ring-brand" : "border-border ring-transparent"}`}>
                      {selection?.kind === "upload"
                        ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={selection.previewUrl} alt="" className="size-full object-cover" />
                        : <Upload className="size-5" aria-hidden="true" />}
                    </span>
                  </button>
                  <span className="flex items-center gap-1.5">
                    <span className={`font-mono text-[10px] ${selection?.kind === "upload" ? "text-foreground" : "text-muted-foreground"}`}>{selection?.kind === "upload" ? "Your photo" : "Upload photo"}</span>
                    {selection?.kind === "upload" && (
                      <button type="button" aria-label="Delete this photo" title="Delete photo" onClick={clearUpload}
                        className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive">
                        <Trash2 className="size-3" aria-hidden="true" />
                      </button>
                    )}
                  </span>
                </div>
              </div>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1}
                onChange={(event) => { pickFile(event.target.files?.[0]); event.target.value = ""; }} />
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {processing && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{busyText}</p>}
              {selection?.kind === "upload" && removal === "done" && cutout?.lowQuality && (
                <p role="status" className="text-center text-sm text-amber-600 dark:text-amber-400">
                  This photo looks small or blurry, so your result may too. Try a sharper, closer photo of one face.
                </p>
              )}
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
                <p className="mt-0.5 text-sm text-muted-foreground">1 is barely, 5 is very much. Watch the chart move.</p>
              </div>
              <div className="flex w-full flex-col gap-2.5">
                {chosen.map((mood) => (
                  <div key={mood.label} role="group" aria-label={mood.label} className="flex flex-col gap-1">
                    <span className="font-mono text-xs tracking-widest uppercase">{mood.label}</span>
                    <div className="grid grid-cols-5 gap-2">
                      {RATING_NUMBERS.map((number) => (
                        <button key={number} type="button" aria-pressed={mood.rating === number} onClick={() => setRatings((value) => ({ ...value, [mood.label]: number }))}
                          className={`h-9 rounded-xl border font-mono text-sm tabular-nums transition-colors sm:h-10 ${
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
                <p className="mt-1.5 text-sm whitespace-nowrap text-muted-foreground sm:text-base">Screenshot-worthy, if you ask me. Grab it or go again.</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Pick a gradient color</span>
                <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Gradient color">
                  {GLOWS.map((swatch) => (
                    <button key={swatch.value} type="button" aria-label={swatch.label} aria-pressed={glow === swatch.value} title={swatch.label} onClick={() => setGlow(swatch.value)}
                      style={{ backgroundColor: swatch.value }}
                      className={`size-8 rounded-full border border-border ring-2 ring-offset-2 ring-offset-card ${glow === swatch.value ? "ring-brand" : "ring-transparent"}`} />
                  ))}
                  <label className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-border bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" title="Custom color">
                    <span className="sr-only">Custom color</span>
                    <input type="color" value={glow} onChange={(event) => setGlow(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
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
          <PosterCanvas face={face} username={username} labels={labels} values={values} blurb={blurb} review={review} placeholder={placeholder} resetKey={resetKey} glow={glow} qr={qr} />
          {step === "loading" && (
            <div className="absolute inset-0 grid place-items-center bg-background/80" aria-hidden="true">
              <Loader2 className="size-9 animate-spin text-brand-ink" />
            </div>
          )}
        </div>
      </div>

      <VibeKpis refreshKey={kpiKey} />

      <Dialog.Root open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-[101] w-[min(92vw,27rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-background p-7 text-center outline-none">
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-brand/15 text-brand-ink"><ShieldCheck className="size-5" aria-hidden="true" /></span>
            <Dialog.Title className="mt-4 text-xl font-medium tracking-tight">Data privacy, real quick</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">Are you sure you want to upload a photo?</Dialog.Description>
            <ul className="mt-5 space-y-2 text-left text-sm">
              {[
                "Sent to remove.bg and Gemini, nowhere else.",
                "Never saved. Gone when you restart.",
                "Only you see it, unless you share it.",
              ].map((point) => (
                <li key={point} className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3">
                  <Check className="size-4 shrink-0 text-brand-ink" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" className="rounded-full whitespace-nowrap" onClick={() => setPrivacyOpen(false)}>Use a memoji</Button>
              <Button className="rounded-full whitespace-nowrap" onClick={confirmPrivacy}>Yes, I&apos;m sure</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
