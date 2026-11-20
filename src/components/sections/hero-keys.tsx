"use client";

import { useEffect, useRef, useState } from "react";
import { useSound } from "@/components/providers/sound-provider";

const LABELS = ["H", "I", "Exclamation mark", "Star"];
// A little major arpeggio: each key plays its own note when pressed.
const NOTES = [523.25, 659.25, 783.99, 1046.5];

/** Four clickable 3D keycaps that spell "H I ! ★". */
export function HeroKeys() {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<{ press: (index: number) => void } | null>(null);
  const { playNote } = useSound();
  const playRef = useRef(playNote);
  const [failed, setFailed] = useState(false);

  useEffect(() => { playRef.current = playNote; }, [playNote]);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    import("./hero-keys-scene").then(({ createKeysScene }) => {
      if (cancelled || !host.current) return;
      try {
        const created = createKeysScene(host.current, (index) => playRef.current(NOTES[index], true), () => setFailed(true));
        scene.current = created;
        dispose = created.dispose;
      } catch {
        setFailed(true);
      }
    }).catch(() => setFailed(true));
    return () => { cancelled = true; scene.current = null; dispose?.(); };
  }, []);

  return (
    <div className="relative mx-auto -mt-2 h-[200px] w-full max-w-[1000px] sm:h-[260px] md:h-[320px] lg:h-[340px]">
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
