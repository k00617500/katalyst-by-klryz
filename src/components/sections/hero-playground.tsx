"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Shuffle } from "lucide-react";

export function HeroPlayground() {
  const host = useRef<HTMLDivElement>(null);
  const controls = useRef<{ remix: () => void; pause: (value: boolean) => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    import("./hero-scene").then(({ createHeroScene }) => {
      if (cancelled || !host.current) return;
      const scene = createHeroScene(host.current, () => setReady(false));
      controls.current = scene;
      dispose = scene.dispose;
      setReady(true);
    }).catch(() => {
      // The CSS sculpture remains visible when WebGL is unavailable.
    });
    return () => { cancelled = true; controls.current = null; dispose?.(); };
  }, []);

  return (
    <div className="hero-playground" data-ready={ready}>
      <div className="hero-art-stage">
        <div ref={host} className="hero-canvas" role="img" aria-label="Interactive 3D desk props: a computer mouse, a pen, a chess pawn and a camera. Drag to rotate, double-click to spin them fast, or use Remix to rearrange them." />
      </div>
      <div className="hero-art-toolbar">
        <span>{ready ? "DRAG TO EXPLORE · DOUBLE-CLICK TO SPIN" : "DESIGN × CODE × CURIOSITY"}</span>
        {ready && <div className="flex items-center gap-2">
          <button type="button" className="hero-art-button" onClick={() => controls.current?.remix()}><Shuffle size={13} /> Remix</button>
          <button type="button" className="hero-art-button" aria-label={paused ? "Play sculpture animation" : "Pause sculpture animation"} aria-pressed={paused} onClick={() => { controls.current?.pause(!paused); setPaused(!paused); }}>{paused ? <Play size={13} /> : <Pause size={13} />}</button>
        </div>}
      </div>
    </div>
  );
}
