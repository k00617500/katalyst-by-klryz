"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { Download, Gift, Loader2, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SnowCanvas } from "@/components/playground/snow-canvas";
import { loadQr, saveGif, savePng } from "@/lib/christmas-card-image";
import { COVER_BOX, COVER_COUNT, COVER_FELT, SPECKS, coverArt } from "@/lib/christmas-cover";
import { startDeckTheHalls, type DeckTheHalls } from "@/lib/deck-the-halls";
import { useSound } from "@/components/providers/sound-provider";
import type { Ornament } from "@/lib/christmas-tree";

const LAST_COVER_KEY = "katalyst-card-cover-last";

/** A different random cover (snowflake, deer, tree or gift) each time a card is saved, never the same one twice in a row. */
export function pickCardCover(): number {
  let last = -1;
  try { last = Number(window.sessionStorage.getItem(LAST_COVER_KEY) ?? -1); } catch { /* storage can be unavailable */ }
  let chosen = Math.floor(Math.random() * COVER_COUNT);
  if (chosen === last) chosen = (chosen + 1 + Math.floor(Math.random() * (COVER_COUNT - 1))) % COVER_COUNT;
  try { window.sessionStorage.setItem(LAST_COVER_KEY, String(chosen)); } catch { /* storage can be unavailable */ }
  return chosen;
}

const FELT = COVER_FELT;
const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.22'/%3E%3C/svg%3E\")";

function Stencil({ cover }: { cover: number }) {
  const ops = coverArt(cover);
  return (
    <svg viewBox={`0 0 ${COVER_BOX.w} ${COVER_BOX.h}`} className="absolute bottom-[7%] left-[9%] w-[58%]" aria-hidden="true">
      {ops.map((op, i) => (
        <path
          key={i}
          d={op.d}
          fill={op.mode === "fill" ? "#ffffff" : "none"}
          stroke={op.mode === "fill" ? "none" : op.mode === "cut" ? COVER_FELT : "#ffffff"}
          strokeWidth={op.width ?? 0}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {/* Felt-coloured specks printed over the stencil give it the grainy look of the reference. */}
      <g fill={COVER_FELT}>
        {SPECKS.map(([x, y, size], i) => <rect key={i} x={x} y={y} width={size} height={size} opacity={0.85} />)}
      </g>
    </svg>
  );
}

function Cover({ cover }: { cover: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-r-[0.5em] rounded-l-[0.15em]" style={{ background: FELT }}>
      <div className="absolute inset-0" style={{ backgroundImage: GRAIN }} />
      <div className="absolute top-[7%] left-[9%] text-white">
        <p className="text-[0.8em] leading-tight font-medium tracking-wide">HAPPY CHRISTMAS</p>
        <p className="text-[0.8em] leading-tight font-medium tracking-wide">2026</p>
      </div>
      <span className="absolute top-[3.5%] right-[6%] size-[1.1em] rounded-full bg-[#0b1f17] shadow-[inset_0_1px_3px_#000,0_0_0_1.5px_#c9a85a]" aria-hidden="true" />
      <Stencil cover={cover} />
    </div>
  );
}

export function ChristmasCard({ open, onOpenChange, image, name, cover, ornaments }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: string;
  name: string;
  cover: number;
  ornaments: Ornament[];
}) {
  const [opened, setOpened] = useState(false);
  const [busy, setBusy] = useState<null | "png" | "gif">(null);
  const [progress, setProgress] = useState(0);
  const label = name.trim();
  const { enabled: siteSound } = useSound();
  // null means "follow the site's sound switch" until the visitor uses the button here.
  const [musicChoice, setMusicChoice] = useState<boolean | null>(null);
  const music = musicChoice ?? siteSound;
  const context = useRef<AudioContext | null>(null);
  const song = useRef<DeckTheHalls | null>(null);
  const size = { "--w": "min(340px, 40vw, 44svh)" } as CSSProperties;

  // "Deck the Halls" plays while the card is open on screen (unless the site's sound is switched off or it is muted here).
  useEffect(() => {
    if (!open || !music) return;
    try {
      context.current ??= new AudioContext();
      if (context.current.state === "suspended") void context.current.resume();
      song.current = startDeckTheHalls(context.current);
    } catch { /* no audio available */ }
    return () => { song.current?.stop(); song.current = null; };
  }, [open, music]);
  useEffect(() => () => { if (context.current) void context.current.close(); context.current = null; }, []);

  const save = async (format: "png" | "gif") => {
    if (busy) return;
    setBusy(format);
    setProgress(0);
    try {
      const qr = await loadQr();
      const options = { ornaments, name: label, qr, cover };
      if (format === "png") await savePng(options);
      else await saveGif(options, setProgress);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(value) => { onOpenChange(value); if (!value) setOpened(false); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm" />
        <Dialog.Content onOpenAutoFocus={(event) => event.preventDefault()} className="fixed inset-0 z-[101] flex flex-col items-center justify-center gap-7 p-4 outline-none" style={{ fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}>
          <SnowCanvas count={90} period={26} scale={1.25} seed={21} className="absolute inset-0 -z-0 size-full" />
          <Dialog.Title className="sr-only">Your Christmas card</Dialog.Title>
          <Dialog.Description className="sr-only">A two-fold greeting card with your decorated tree inside. Press the card or the Open button to open it.</Dialog.Description>

          <div className="relative z-10 [perspective:2200px]" style={size}>
            <div
              className="relative transition-transform duration-[900ms] ease-[cubic-bezier(.5,0,.2,1)]"
              style={{
                width: "var(--w)",
                height: "calc(var(--w) * 1.25)",
                fontSize: "calc(var(--w) / 16)",
                transform: opened ? "translateX(calc(var(--w) / 2))" : "none",
                filter: "drop-shadow(0 24px 40px rgba(0,0,0,0.55))",
              }}
            >
              {/* Right-hand inside page: the visitor's tree. */}
              <div className="absolute inset-0 flex flex-col overflow-hidden rounded-r-[0.5em] bg-gradient-to-br from-[#d1202f] to-[#8f0d1b] p-[0.8em]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Your decorated Christmas tree" className="min-h-0 flex-1 object-contain" draggable={false} />
                <p className="mt-[0.4em] text-[1.45em] leading-[0.95] font-medium tracking-tight text-white">
                  Merry<br />Christmas<span className="text-[#ffd9d4]">.</span>
                </p>
              </div>

              {/* The cover swings open on the left edge; its back is the red note page. */}
              <button
                type="button"
                aria-label={opened ? "Close the card" : "Open the card"}
                onClick={() => setOpened((value) => !value)}
                className="absolute inset-0 cursor-pointer [transform-style:preserve-3d] transition-transform duration-[900ms] ease-[cubic-bezier(.5,0,.2,1)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                style={{ transformOrigin: "left center", transform: opened ? "rotateY(-180deg)" : "none" }}
              >
                <div className="absolute inset-0 [backface-visibility:hidden]">
                  <Cover cover={cover} />
                </div>
                <div className="absolute inset-0 flex [transform:rotateY(180deg)] flex-col justify-between overflow-hidden rounded-l-[0.5em] bg-[#1D4533] p-[1.3em] text-left text-[#fff7ee] [backface-visibility:hidden]">
                  <div className="space-y-[0.8em] pt-[1.6em]">
                    <p className="text-[1.5em] leading-[1.12] font-semibold tracking-tight break-words">
                      Have A Happy Christmas{label ? `, ${label}` : ""}
                    </p>
                    <p className="text-[0.85em] leading-snug text-[#cfe8d5]">From The Katalyst by Klaryze!</p>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-[0.6em] tracking-[0.2em] text-white/70">2026</span>
                    <Image src="/images/the-katalyst-back.png" alt="QR code for the website" width={96} height={96} className="size-[3.6em] rounded-[0.5em] bg-[#111] p-[0.25em]" />
                  </div>
                  <span className="pointer-events-none absolute inset-y-0 right-0 w-[2.2em] bg-gradient-to-l from-black/25 to-transparent" aria-hidden="true" />
                </div>
              </button>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
            <Button type="button" onClick={() => setOpened((value) => !value)}>
              <Gift className="size-4" /> {opened ? "Close the card" : "Open the card"}
            </Button>
            <Button type="button" variant="outline" aria-pressed={music} onClick={() => setMusicChoice(!music)}>
              {music ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />} {music ? "Music on" : "Music off"}
            </Button>
            <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void save("png")}>
              {busy === "png" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Save as PNG
            </Button>
            <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void save("gif")}>
              {busy === "gif" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {busy === "gif" ? `Making GIF ${Math.round(progress * 100)}%` : "Save as GIF"}
            </Button>
          </div>
          <p className="relative z-10 max-w-sm text-center text-xs text-white/60">Your card is made in this browser tab only. Nothing is saved or sent anywhere.</p>

          <Dialog.Close aria-label="Close" className="absolute top-5 right-5 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"><X className="size-5" /></Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
