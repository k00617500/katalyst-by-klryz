"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { Download, Gift, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SnowCanvas } from "@/components/playground/snow-canvas";
import { loadQr, saveGif, savePng } from "@/lib/christmas-card-image";
import type { Ornament } from "@/lib/christmas-tree";

const COVER_KEY = "katalyst-card-cover";
const COVER_COUNT = 4;

/** Each visitor gets one cover (snowflake, deer, tree or gift), picked at random the first time and then kept. */
export function pickCardCover(): number {
  try {
    const raw = window.localStorage.getItem(COVER_KEY);
    const stored = Number(raw);
    if (raw !== null && Number.isInteger(stored) && stored >= 0 && stored < COVER_COUNT) return stored;
    const chosen = Math.floor(Math.random() * COVER_COUNT);
    window.localStorage.setItem(COVER_KEY, String(chosen));
    return chosen;
  } catch {
    return Math.floor(Math.random() * COVER_COUNT);
  }
}

const FELT = "#173a2c";
const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.22'/%3E%3C/svg%3E\")";

function Stencil({ cover }: { cover: number }) {
  const common = { fill: "#ffffff", filter: "url(#stencil)" } as const;
  return (
    <svg viewBox="0 0 140 130" className="absolute bottom-[7%] left-[9%] w-[58%]" aria-hidden="true">
      <defs>
        <filter id="stencil" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.6" />
        </filter>
      </defs>
      {cover === 0 && (
        <g transform="translate(70 65)" stroke="#fff" strokeWidth="9" fill="none" filter="url(#stencil)">
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <path d="M0 0 L0 -54" />
              <path d="M-15 -42 L0 -28 L15 -42" />
              <path d="M-12 -62 L0 -50 L12 -62" strokeWidth="7" />
            </g>
          ))}
        </g>
      )}
      {cover === 1 && (
        <g {...common}>
          <path d="M26 50 H104 Q112 50 112 58 V78 H26 Z" />
          <path d="M96 52 L116 26 L130 36 L112 66 Z" />
          <path d="M112 28 L134 20 L140 34 L124 42 Z" />
          <rect x="30" y="76" width="10" height="38" />
          <rect x="50" y="76" width="10" height="38" />
          <rect x="82" y="76" width="10" height="38" />
          <rect x="98" y="76" width="10" height="38" />
          <path d="M22 52 L14 46 L22 60 Z" />
          <path d="M120 24 L112 6 M114 14 L102 10 M127 22 L136 6 M132 13 L141 14" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
      )}
      {cover === 2 && (
        <g {...common} transform="translate(8 -2)">
          <path d="M62 8 L40 40 L50 40 L30 68 L42 68 L18 102 L54 102 L54 118 L70 118 L70 102 L106 102 L82 68 L94 68 L74 40 L84 40 Z" />
        </g>
      )}
      {cover === 3 && (
        <g {...common}>
          <path d="M24 56 H116 V70 H24 Z" />
          <path d="M30 72 H110 V122 H30 Z" />
          <rect x="62" y="56" width="16" height="66" fill={FELT} />
          <path d="M70 56 C46 26 24 40 50 56 Z M70 56 C94 26 116 40 90 56 Z" />
        </g>
      )}
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
  const size = { "--w": "min(340px, 40vw, 44svh)" } as CSSProperties;

  const save = async (format: "png" | "gif") => {
    if (busy) return;
    setBusy(format);
    setProgress(0);
    try {
      const qr = await loadQr();
      const options = { ornaments, name: label, qr };
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
              <div className="absolute inset-0 flex flex-col overflow-hidden rounded-r-[0.5em] bg-[#0a0a0a] p-[0.8em]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Your decorated Christmas tree" className="min-h-0 flex-1 object-contain" draggable={false} />
                <p className="mt-[0.4em] text-[1.45em] leading-[0.95] font-medium tracking-tight text-white">
                  Merry<br />Christmas<span className="text-[#d8232a]">.</span>
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
                <div className="absolute inset-0 flex [transform:rotateY(180deg)] flex-col justify-between overflow-hidden rounded-l-[0.5em] bg-gradient-to-br from-[#d1202f] to-[#8f0d1b] p-[1.3em] text-left text-[#fff7ee] [backface-visibility:hidden]">
                  <div className="space-y-[0.8em] pt-[1.6em]">
                    <p className="text-[1.5em] leading-[1.12] font-semibold tracking-tight break-words">
                      Have A Happy Christmas{label ? `, ${label}` : ""}
                    </p>
                    <p className="text-[0.85em] leading-snug text-[#ffd9d4]">From The Katalyst by Klaryze!</p>
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
