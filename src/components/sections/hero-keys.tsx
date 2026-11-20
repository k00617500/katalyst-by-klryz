"use client";

import { useEffect, useRef, useState } from "react";
import { useSound } from "@/components/providers/sound-provider";

const LABELS = ["H", "I", "Exclamation mark", "Star"];

/** A mechanical-keyboard click: a short sharp "tick", a low "thock" as the key bottoms out, and a soft release tick. */
function keyClick(ctx: AudioContext, pitch: number) {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.9;
  out.connect(ctx.destination);

  const noise = (start: number, length: number, frequency: number, q: number, level: number) => {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, now + start);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + length);
    source.connect(filter).connect(gain).connect(out);
    source.start(now + start);
  };

  noise(0, 0.03, 3400 * pitch, 1.4, 0.55); // the click
  noise(0.012, 0.05, 1500 * pitch, 0.8, 0.4); // plastic clack
  const thock = ctx.createOscillator();
  const thockGain = ctx.createGain();
  thock.type = "sine";
  thock.frequency.setValueAtTime(190 * pitch, now + 0.006);
  thock.frequency.exponentialRampToValueAtTime(70 * pitch, now + 0.07);
  thockGain.gain.setValueAtTime(0.0001, now);
  thockGain.gain.linearRampToValueAtTime(0.5, now + 0.01);
  thockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  thock.connect(thockGain).connect(out);
  thock.start(now);
  thock.stop(now + 0.1);
  noise(0.075, 0.02, 4200 * pitch, 1.6, 0.18); // the key coming back up
  window.setTimeout(() => out.disconnect(), 400);
}
// Each key sounds a touch different, like keys of different sizes.
const PITCH = [1, 0.94, 1.06, 0.9];

/** Four clickable 3D keycaps that spell "H I ! ★". */
export function HeroKeys() {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<{ press: (index: number) => void } | null>(null);
  const { enabled } = useSound();
  const enabledRef = useRef(enabled);
  const audio = useRef<AudioContext | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    import("./hero-keys-scene").then(({ createKeysScene }) => {
      if (cancelled || !host.current) return;
      try {
        const created = createKeysScene(host.current, (index) => {
          if (!enabledRef.current) return;
          try {
            audio.current ??= new AudioContext();
            if (audio.current.state === "suspended") void audio.current.resume();
            keyClick(audio.current, PITCH[index] ?? 1);
          } catch { /* the visual press still works without audio */ }
        }, () => setFailed(true));
        scene.current = created;
        dispose = created.dispose;
      } catch {
        setFailed(true);
      }
    }).catch(() => setFailed(true));
    return () => { cancelled = true; scene.current = null; dispose?.(); if (audio.current) void audio.current.close(); audio.current = null; };
  }, []);

  return (
    <div className="relative mx-auto -mt-3 w-full max-w-[720px]" style={{ height: "clamp(200px, 36svh, 360px)" }}>
      <div
        ref={host}
        role="img"
        aria-label="Four 3D keycaps spelling H, I, exclamation mark, star. Click or tap a key to press it."
        className="absolute inset-0"
      />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center gap-3" aria-hidden="true">
          {["H", "I", "!", "★"].map((glyph, i) => (
            <span key={glyph} className={`grid size-16 place-items-center rounded-xl text-2xl font-extrabold shadow-lg sm:size-20 ${i === 1 ? "bg-[#8fd400] text-[#14260a]" : i === 2 ? "bg-[#131313] text-white" : "bg-[#f3f3ef] text-[#1b1b1b]"}`}>{glyph}</span>
          ))}
        </div>
      )}
      <div className="sr-only">
        {LABELS.map((label, index) => (
          <button key={label} type="button" onClick={() => scene.current?.press(index)}>
            Press the {label} key
          </button>
        ))}
      </div>
    </div>
  );
}
