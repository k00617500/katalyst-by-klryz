"use client";

import { useEffect, useRef, useState } from "react";

export function HeroPlayground() {
  const host = useRef<HTMLDivElement>(null);
  const controls = useRef<{ remix: () => void; pause: (value: boolean) => void } | null>(null);
  const [ready, setReady] = useState(false);

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
        <div ref={host} className="hero-canvas" role="img" aria-label="Interactive 3D desk props: a computer mouse, a pen, a chess pawn and a camera. Drag to rotate them, or double-click to spin them fast." />
      </div>
    </div>
  );
}
