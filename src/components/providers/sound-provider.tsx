"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";

const SoundContext = createContext({ enabled: true, toggle: () => {} });
const SOUND_KEY = "katalyst-sound";
const SOUND_EVENT = "katalyst-sound-change";
let memoryPreference = true;

function getPreference() {
  try { return localStorage.getItem(SOUND_KEY) !== "muted"; }
  catch { return memoryPreference; }
}

function subscribePreference(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(SOUND_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(SOUND_EVENT, listener);
  };
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const enabled = useSyncExternalStore(subscribePreference, getPreference, () => true);
  const audio = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);
  const lastHover = useRef(0);

  // Browsers unlock audio inside a user gesture, including a click on empty space.
  const unlock = useCallback(() => {
    if (!enabledRef.current) return;
    try {
      const context = !audio.current || audio.current.state === "closed" ? (audio.current = new AudioContext()) : audio.current;
      if (context.state === "suspended") void context.resume().catch(() => {});
    } catch { /* Web Audio may not be available. */ }
  }, []);

  const play = useCallback(async (click: boolean) => {
    if (!enabledRef.current) return;
    try {
      const context = !audio.current || audio.current.state === "closed"
        ? (click ? (audio.current = new AudioContext()) : null)
        : audio.current;
      if (!context) return;
      if (context.state === "suspended" && click) await context.resume();
      if (!enabledRef.current || context.state !== "running") return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = click ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(click ? 1600 : 920, now);
      oscillator.frequency.exponentialRampToValueAtTime(click ? 180 : 700, now + (click ? 0.035 : 0.06));
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(click ? 0.09 : 0.025, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (click ? 0.05 : 0.085));
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.09);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { /* Sound is optional on browsers without Web Audio. */ }
  }, []);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    memoryPreference = next;
    try { localStorage.setItem(SOUND_KEY, next ? "on" : "muted"); } catch { /* Keep the preference for this visit when storage is unavailable. */ }
    window.dispatchEvent(new Event(SOUND_EVENT));
    if (next) { unlock(); void play(true); }
    else if (audio.current?.state === "running") void audio.current.suspend().catch(() => {});
  }, [play, unlock]);

  useEffect(() => {
    const selector = 'a, button, input, select, textarea, [role="button"]';
    const target = (event: Event) => event.target instanceof Element ? event.target.closest(selector) : null;
    const hover = (event: PointerEvent) => {
      const element = target(event);
      if (!element || element.matches(":disabled") || element.hasAttribute("data-sound-toggle") || (event.relatedTarget instanceof Node && element.contains(event.relatedTarget))) return;
      if (performance.now() - lastHover.current < 70) return;
      lastHover.current = performance.now();
      void play(false);
    };
    const click = (event: MouseEvent) => {
      const element = target(event);
      if (element && !element.matches(":disabled") && !element.hasAttribute("data-sound-toggle")) void play(true);
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("pointerover", hover);
    document.addEventListener("click", click, true);
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("pointerover", hover);
      document.removeEventListener("click", click, true);
    };
  }, [play, unlock]);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled && audio.current?.state === "running") void audio.current.suspend().catch(() => {});
  }, [enabled]);

  useEffect(() => () => { void audio.current?.close().catch(() => {}); }, []);
  return <SoundContext.Provider value={{ enabled, toggle }}>{children}</SoundContext.Provider>;
}

export function SoundToggle() {
  const { enabled, toggle } = useContext(SoundContext);
  return (
    <button type="button" data-sound-toggle aria-label={enabled ? "Mute interface sounds" : "Enable interface sounds"} aria-pressed={enabled} title={enabled ? "Sound on" : "Sound off"} onClick={toggle}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-brand">
      {enabled ? <Volume2 className="size-[18px]" /> : <VolumeX className="size-[18px]" />}
    </button>
  );
}
