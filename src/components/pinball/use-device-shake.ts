"use client";

import { useEffect, useRef } from "react";

const SHAKE_THRESHOLD = 18;
const SHAKE_COOLDOWN_MS = 600;

type MotionPermission = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/** iOS requires DeviceMotionEvent.requestPermission() from inside a user-gesture handler
 * (e.g. the Start/Play tap) before "devicemotion" will ever fire. Other platforms have no
 * such gate, so this resolves immediately there. */
export async function requestMotionPermission() {
  const ctor = window.DeviceMotionEvent as unknown as MotionPermission | undefined;
  if (typeof ctor?.requestPermission !== "function") return;
  try {
    await ctor.requestPermission();
  } catch {
    // Permission prompt dismissed or unsupported — shake simply won't fire.
  }
}

/** Fires onShake when the device is physically shaken, so the player can rattle the cabinet
 * the same way the on-screen Nudge button does. */
export function useDeviceShake(onShake: () => void, enabled: boolean) {
  const lastShakeAt = useRef(0);
  const lastAccel = useRef<{ x: number; y: number; z: number } | null>(null);
  const callback = useRef(onShake);

  useEffect(() => {
    callback.current = onShake;
  }, [onShake]);

  useEffect(() => {
    if (!enabled || typeof window.DeviceMotionEvent === "undefined") return;
    const handleMotion = (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity;
      if (accel?.x == null || accel.y == null || accel.z == null) return;
      const last = lastAccel.current;
      lastAccel.current = { x: accel.x, y: accel.y, z: accel.z };
      if (!last) return;
      const delta = Math.abs(accel.x - last.x) + Math.abs(accel.y - last.y) + Math.abs(accel.z - last.z);
      if (delta < SHAKE_THRESHOLD) return;
      const now = performance.now();
      if (now - lastShakeAt.current < SHAKE_COOLDOWN_MS) return;
      lastShakeAt.current = now;
      callback.current();
    };
    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [enabled]);
}
