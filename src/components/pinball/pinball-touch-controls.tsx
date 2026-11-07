"use client";

import { useEffect, useRef } from "react";
import { ArrowDownToLine, ChevronLeft, ChevronRight } from "lucide-react";
import type { PinballEngine } from "@/lib/pinball/engine";


function HoldButton({ children, label, onPress, onRelease, onCancel = onRelease, primary = false, disabled }: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
  onRelease: () => void;
  onCancel?: () => void;
  primary?: boolean;
  disabled: boolean;
}) {
  return (
    <button type="button" aria-label={label} disabled={disabled} className={primary ? "pb-launchButton" : "pb-holdButton"}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        onPress();
      }}
      onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) onRelease(); }}
      onLostPointerCapture={onCancel}
      onKeyDown={(event) => {
        if (event.code !== "Space" && event.code !== "Enter") return;
        event.preventDefault();
        if (!event.repeat) onPress();
      }}
      onKeyUp={(event) => {
        if (event.code !== "Space" && event.code !== "Enter") return;
        event.preventDefault();
        onRelease();
      }}
      onBlur={onCancel}
    >{children}</button>
  );
}

export function PinballTouchControls({ engine, playing, plungerReady, launchStrength, onFlipper, onCharge, onRelease, onCancel }: {
  engine: PinballEngine;
  playing: boolean;
  plungerReady: boolean;
  launchStrength: number;
  onFlipper: (side: "left" | "right", held: boolean) => void;
  onCharge: () => void;
  onRelease: () => void;
  onCancel: () => void;
}) {
  const meter = useRef<HTMLSpanElement>(null);
  const amount = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    let lastStrength = -1;
    const started = performance.now();
    const draw = (now: number) => {
      const remaining = Math.max(0, 1 - (now - started) / 550);
      const strength = Math.round((plungerReady ? engine.getPlungerStrength() : launchStrength * remaining) * 100);
      if (strength !== lastStrength) {
        if (meter.current) meter.current.style.transform = "scaleX(" + strength / 100 + ")";
        if (amount.current) amount.current.textContent = strength + "%";
        lastStrength = strength;
      }
      if (plungerReady || strength > 0) frame = requestAnimationFrame(draw);
    };
    draw(started);
    return () => cancelAnimationFrame(frame);
  }, [engine, plungerReady, launchStrength]);

  return (
    <div className="pb-controlDeck">
      <HoldButton label="Left flipper" onPress={() => onFlipper("left", true)} onRelease={() => onFlipper("left", false)} disabled={!playing}>
        <ChevronLeft size={17} /> <span>Left</span>
      </HoldButton>
      <div className="pb-plunge">
        <HoldButton label="Hold and release plunger" onPress={onCharge} onRelease={onRelease} onCancel={onCancel} primary disabled={!plungerReady}>
          <ArrowDownToLine size={16} /> <span>Plunge</span>
        </HoldButton>
        <span className="pb-power" aria-hidden="true"><span ref={meter} /><b ref={amount}>0%</b></span>
      </div>
      <HoldButton label="Right flipper" onPress={() => onFlipper("right", true)} onRelease={() => onFlipper("right", false)} disabled={!playing}>
        <span>Right</span> <ChevronRight size={17} />
      </HoldButton>
    </div>
  );
}

