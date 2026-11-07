"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { createPinballRenderer, type PinballTheme } from "@/lib/pinball/renderer";
import type { PinballEngine } from "@/lib/pinball/engine";

export function PinballCanvas({ engine, blurred = false }: { engine: PinballEngine; blurred?: boolean }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const { resolvedTheme } = useTheme();
  const theme: PinballTheme = resolvedTheme === "light" ? "light" : "dark";
  const rendererRef = useRef<ReturnType<typeof createPinballRenderer> | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = createPinballRenderer(host, engine, theme);
    rendererRef.current = renderer;
    return () => {
      rendererRef.current = null;
      renderer.dispose();
    };
    // Theme changes are applied imperatively by the effect below instead of recreating the renderer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  useEffect(() => {
    rendererRef.current?.setTheme(theme);
  }, [theme]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="absolute inset-0 transition-[filter] duration-200 ease-out"
      style={{ filter: blurred ? "blur(8px)" : "none" }}
    />
  );
}
