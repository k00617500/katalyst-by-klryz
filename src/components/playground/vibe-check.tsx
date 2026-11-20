"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { ArrowRight, Download, Loader2, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_RATINGS, MOODS, memojiSrc, vibeMemojis, type Ratings } from "@/data/vibe-check";
import { POSTER_H, POSTER_W, describeVibe, drawPoster, type PosterColors } from "@/lib/vibe-poster";

type Step = "setup" | "rate" | "loading" | "result";
type Selection = { kind: "memoji"; id: string } | { kind: "upload"; file: File; previewUrl: string };
type Removal = "idle" | "removing" | "done";

const LOADING_LINES = [
  "reading your aura…",
  "stretching your face (lovingly)…",
  "consulting the vibe oracle…",
  "almost there, no peeking…",
];
const MIN_LOADING_MS = 2600;

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

function readColors(): PosterColors {
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

/** Downsizes (and strips EXIF from) the photo before it leaves the browser. */
async function toUploadBlob(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode"))), "image/jpeg", 0.9));
}

/** Pads the cut-out onto a transparent square so stretching never squashes the subject. */
async function cutoutToSquare(blob: Blob): Promise<Sized> {
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
    return { source: canvas, w: side, h: side };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function PosterCanvas({ face, username, ratings, placeholder, resetKey, onFrame }: {
  face: Sized | null;
  username: string;
  ratings: Ratings;
  placeholder?: string;
  resetKey: number;
  onFrame?: never;
}) {
  void onFrame;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = useRef<Ratings>({ ...ratings });
  const latest = useRef({ face, username, ratings, placeholder });
  const frame = useRef(0);
  const lastReset = useRef(resetKey);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { face: faceNow, username: name, ratings: target, placeholder: hint } = latest.current;
    const scale = canvas.width / POSTER_W;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawPoster(ctx, {
      source: faceNow?.source ?? null,
      sourceSize: { w: faceNow?.w ?? 1, h: faceNow?.h ?? 1 },
      thumb: faceNow?.source ?? null,
      thumbSize: { w: faceNow?.w ?? 1, h: faceNow?.h ?? 1 },
      ratings: current.current,
      username: name,
      blurb: describeVibe(target),
      colors: readColors(),
      fontFamily: posterFont(),
      placeholder: hint,
    });
  }, []);

  const ratingsKey = MOODS.map((mood) => ratings[mood.key]).join();
  useEffect(() => {
    latest.current = { face, username, ratings, placeholder };
    if (lastReset.current !== resetKey) {
      lastReset.current = resetKey;
      current.current = { moody: 0.4, flowy: 0.4, deep: 0.4, playful: 0.4, edgy: 0.4 };
    }
    cancelAnimationFrame(frame.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = { ...ratings };
      draw();
      return;
    }
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ease = 1 - Math.exp(-dt * 7);
      let moving = false;
      for (const mood of MOODS) {
        const diff = latest.current.ratings[mood.key] - current.current[mood.key];
        if (Math.abs(diff) > 0.005) {
          current.current[mood.key] += diff * ease;
          moving = true;
        } else current.current[mood.key] = latest.current.ratings[mood.key];
      }
      draw();
      if (moving) frame.current = requestAnimationFrame(step);
    };
    step(last);
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [face, username, ratingsKey, placeholder, resetKey, draw]);

  useEffect(() => {
    const observer = new MutationObserver(() => draw());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    void document.fonts?.ready.then(draw);
    return () => observer.disconnect();
  }, [draw]);

  return (
    <canvas ref={canvasRef} width={810} height={1440} role="img" aria-label="Your vibe chart"
      className="block h-auto w-full text-foreground" style={{ aspectRatio: `${POSTER_W} / ${POSTER_H}` }} />
  );
}

export function VibeCheck() {
  const [step, setStep] = useState<Step>("setup");
  const [username, setUsername] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [ratings, setRatings] = useState<Ratings>(DEFAULT_RATINGS);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [removal, setRemoval] = useState<Removal>("idle");
  const [error, setError] = useState("");
  const [cutout, setCutout] = useState<Sized | null>(null);
  const [memojiFace, setMemojiFace] = useState<Sized | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const removalPromise = useRef<Promise<boolean> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const stepRef = useRef<Step>("setup");
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

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 12 * 1024 * 1024) {
      setError("Please use a JPG, PNG or WebP photo (up to 12 MB).");
      return;
    }
    setError("");
    setCutout(null);
    setRemoval("idle");
    setSelection({ kind: "upload", file, previewUrl: URL.createObjectURL(file) });
  };

  const startRemoval = (file: File) => {
    setRemoval("removing");
    const job = (async () => {
      try {
        const upload = await toUploadBlob(file);
        const body = new FormData();
        body.append("image", upload, "selfie.jpg");
        const response = await fetch("/api/remove-bg", { method: "POST", body });
        if (!response.ok) {
          const message = (await response.json().catch(() => null))?.error;
          throw new Error(message || "Couldn't cut out that photo.");
        }
        setCutout(await cutoutToSquare(await response.blob()));
        setRemoval("done");
        return true;
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Something went wrong with that photo.");
        setSelection(null);
        setRemoval("idle");
        if (stepRef.current !== "result") setStep("setup");
        return false;
      }
    })();
    removalPromise.current = job;
  };

  const proceed = () => {
    if (selection?.kind === "upload") setPrivacyOpen(true);
    else setStep("rate");
  };

  const confirmPrivacy = () => {
    setPrivacyOpen(false);
    if (selection?.kind === "upload") startRemoval(selection.file);
    setStep("rate");
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
    setStep("setup");
    setUsername("");
    setSelection(null);
    setCutout(null);
    setMemojiFace(null);
    setRemoval("idle");
    setError("");
    setRatings(DEFAULT_RATINGS);
    removalPromise.current = null;
    setResetKey((value) => value + 1);
  };

  const download = () => {
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
      ratings,
      username,
      blurb: describeVibe(ratings),
      colors: readColors(),
      fontFamily: posterFont(),
    });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vibe-check-${(username.trim() || "me").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  };

  const ready = username.trim().length > 0 && !!selection;
  const placeholder = selection?.kind === "upload" && !cutout
    ? (removal === "removing" ? "cutting out your background…" : "photo ready")
    : "pick a face to start";

  return (
    <section id="vibe-check" className="container-page section-y scroll-mt-24 border-t border-border/60 text-center">
      <span className="font-mono text-xs tracking-[0.2em] text-brand-ink uppercase">Vibe check</span>
      <h2 className="mx-auto mt-4 max-w-2xl text-balance text-3xl font-medium tracking-tight md:text-5xl">How are you feeling in here?</h2>
      <p className="mx-auto mt-4 max-w-md text-balance text-base text-muted-foreground md:text-lg">
        Be honest, the site won&apos;t judge. Pick a face, rate your feels, and watch it get weird.
      </p>

      <div className="mx-auto mt-12 grid max-w-5xl items-start gap-10 text-center lg:grid-cols-2 lg:gap-14">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-border bg-card p-6 md:p-8">
          {step === "setup" && (
            <div className="flex flex-col items-center gap-6">
              <label className="flex w-full flex-col items-center gap-2">
                <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">What should I call you?</span>
                <input value={username} onChange={(event) => setUsername(event.target.value.slice(0, 24))} placeholder="your name or alias"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-center text-base outline-none transition-colors focus:border-brand" />
              </label>

              <div className="w-full">
                <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Pick a face, or bring your own</p>
                <div className="mt-3 grid grid-cols-3 justify-items-center gap-3 sm:grid-cols-4">
                  {vibeMemojis.map((memoji) => {
                    const active = selection?.kind === "memoji" && selection.id === memoji.id;
                    return (
                      <button key={memoji.id} type="button" aria-pressed={active} onClick={() => { setSelection({ kind: "memoji", id: memoji.id }); setError(""); }}
                        className="group flex w-full flex-col items-center gap-1.5">
                        <span className={`grid aspect-square w-full place-items-center overflow-hidden rounded-2xl bg-muted p-1.5 ring-2 transition-all group-hover:-translate-y-0.5 ${active ? "ring-brand" : "ring-transparent"}`}>
                          <Image src={memojiSrc(memoji)} alt="" width={128} height={128} className="size-full object-contain" draggable={false} />
                        </span>
                        <span className={`font-mono text-[10px] ${active ? "text-foreground" : "text-muted-foreground"}`}>{memoji.label}</span>
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => fileInput.current?.click()} aria-pressed={selection?.kind === "upload"} className="group flex w-full flex-col items-center gap-1.5">
                    <span className={`grid aspect-square w-full place-items-center overflow-hidden rounded-2xl border-2 border-dashed bg-muted/50 text-muted-foreground ring-2 transition-all group-hover:-translate-y-0.5 ${selection?.kind === "upload" ? "border-transparent ring-brand" : "border-border ring-transparent"}`}>
                      {selection?.kind === "upload"
                        ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={selection.previewUrl} alt="" className="size-full object-cover" />
                        : <Upload className="size-5" aria-hidden="true" />}
                    </span>
                    <span className={`font-mono text-[10px] ${selection?.kind === "upload" ? "text-foreground" : "text-muted-foreground"}`}>{selection?.kind === "upload" ? "Your selfie" : "Upload selfie"}</span>
                  </button>
                </div>
                <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1}
                  onChange={(event) => { pickFile(event.target.files?.[0]); event.target.value = ""; }} />
              </div>

              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button size="lg" className="rounded-full px-8" disabled={!ready} onClick={proceed}>
                Okay, proceed to rating<ArrowRight className="size-4" />
              </Button>
            </div>
          )}

          {step === "rate" && (
            <div className="flex flex-col items-center gap-6">
              <div>
                <p className="text-lg font-medium">Now rate your feels{username.trim() ? `, ${username.trim()}` : ""}.</p>
                <p className="mt-1 text-sm text-muted-foreground">1 is barely, 10 is very much. Watch the poster move.</p>
              </div>
              <div className="flex w-full flex-col gap-4">
                {MOODS.map((mood) => (
                  <label key={mood.key} className="grid grid-cols-[72px_1fr_28px] items-center gap-3 text-left">
                    <span className="font-mono text-xs tracking-widest uppercase">{mood.label}</span>
                    <input type="range" min={1} max={10} step={1} value={ratings[mood.key]} aria-label={`${mood.label}, 1 to 10`}
                      onChange={(event) => setRatings((value) => ({ ...value, [mood.key]: Number(event.target.value) }))}
                      className="h-2 w-full cursor-pointer accent-[var(--brand)]" />
                    <span className="text-center font-mono text-sm tabular-nums">{ratings[mood.key]}</span>
                  </label>
                ))}
              </div>
              {removal === "removing" && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Cutting out your background&hellip;</p>
              )}
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" className="rounded-full" onClick={() => setStep("setup")}>Back</Button>
                <Button size="lg" className="rounded-full px-8" onClick={reveal}>Show my vibe<ArrowRight className="size-4" /></Button>
              </div>
            </div>
          )}

          {step === "loading" && (
            <div className="flex min-h-48 flex-col items-center justify-center gap-4" role="status" aria-live="polite">
              <Loader2 className="size-8 animate-spin text-brand-ink" aria-hidden="true" />
              <p className="font-mono text-sm">{LOADING_LINES[lineIndex]}</p>
            </div>
          )}

          {step === "result" && (
            <div className="flex flex-col items-center gap-5">
              <div>
                <p className="text-lg font-medium">Here&apos;s your vibe{username.trim() ? `, ${username.trim()}` : ""}.</p>
                <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">Screenshot-worthy, if you ask me. Grab it or go again.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button size="lg" className="rounded-full px-6" onClick={download}><Download className="size-4" />Download</Button>
                <Button size="lg" variant="outline" className="rounded-full px-6" onClick={restart}><RotateCcw className="size-4" />Restart</Button>
              </div>
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setStep("rate")}>Tweak my ratings</Button>
            </div>
          )}
        </div>

        <div className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-3xl border border-border bg-background">
          <PosterCanvas face={face} username={username} ratings={ratings} placeholder={placeholder} resetKey={resetKey} />
          {step === "loading" && (
            <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-sm" aria-hidden="true">
              <Loader2 className="size-10 animate-spin text-brand-ink" />
            </div>
          )}
        </div>
      </div>

      <Dialog.Root open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-[101] w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-background p-7 text-center outline-none">
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-brand/15 text-brand-ink"><ShieldCheck className="size-5" aria-hidden="true" /></span>
            <Dialog.Title className="mt-4 text-xl font-medium tracking-tight">Data privacy, real quick</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">Are you sure you want to use your selfie?</Dialog.Description>
            <ul className="mt-5 space-y-2 text-left text-sm">
              <li className="rounded-xl bg-muted px-4 py-2.5">Your photo is sent once to <span className="font-medium">remove.bg</span> to cut out the background.</li>
              <li className="rounded-xl bg-muted px-4 py-2.5">We don&apos;t save it. It vanishes when you restart or leave.</li>
              <li className="rounded-xl bg-muted px-4 py-2.5">Only you see the result, unless you download and share it.</li>
            </ul>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" className="rounded-full" onClick={() => { setPrivacyOpen(false); setSelection(null); }}>Use a memoji instead</Button>
              <Button className="rounded-full" onClick={confirmPrivacy}>Yes, I&apos;m sure</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
