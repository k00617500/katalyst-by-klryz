"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSound } from "@/components/providers/sound-provider";
import { useMusic } from "@/components/providers/music-provider";
import { pickSong, playSong, type Playing, type Song } from "@/lib/christmas-music";

export interface ChristmasMusic {
  /** True while a song is actually sounding. */
  playing: boolean;
  /** The current song, if any. */
  song: Song | null;
  /** The site's navbar sound switch is off, which silences all Christmas music too. */
  siteMuted: boolean;
  /** The visitor's own on/off choice for this music. */
  on: boolean;
  /** The browser is holding the audio back until the visitor clicks something. */
  blocked: boolean;
  /** Call from a click or tap handler so the browser lets the audio start. */
  unlock: () => void;
  toggle: () => void;
}

/**
 * Random Christmas instrumentals (Filipino songs favoured) while `wanted` is true: when a visitor starts decorating the
 * tree and while the card is on screen. A different random song follows each one. Muting the site with the navbar sound
 * switch stops it at once, and it stays quiet while the Toolkit's Spotify player is playing.
 */
export function useChristmasMusic(wanted: boolean): ChristmasMusic {
  const { enabled: siteSound } = useSound();
  const { isPlaying: spotifyPlaying } = useMusic();
  const [choice, setChoice] = useState(true);
  const [song, setSong] = useState<Song | null>(null);
  const [running, setRunning] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const lastId = useRef<string | undefined>(undefined);

  const shouldPlay = wanted && siteSound && choice && !spotifyPlaying;

  /** One shared audio context, created and resumed right inside a user gesture when possible. */
  const audio = useCallback(() => {
    if (!context.current) {
      const created = new AudioContext();
      created.onstatechange = () => setRunning(created.state === "running");
      context.current = created;
    }
    if (context.current.state !== "running") void context.current.resume().then(() => setRunning(context.current?.state === "running")).catch(() => {});
    return context.current;
  }, []);

  const unlock = useCallback(() => {
    try { audio(); } catch { /* no audio available */ }
  }, [audio]);

  useEffect(() => {
    if (!shouldPlay) return;
    let current: Playing | null = null;
    let timer = 0;
    let cancelled = false;
    const next = () => {
      if (cancelled) return;
      try {
        const ctx = audio();
        const chosen = pickSong(lastId.current);
        lastId.current = chosen.id;
        setSong(chosen);
        current = playSong(ctx, chosen, next);
      } catch { /* no audio available */ }
    };
    timer = window.setTimeout(next, 0);
    // If the browser still holds the audio back, the next click or key press anywhere releases it.
    const release = () => { try { audio(); } catch { /* no audio available */ } };
    window.addEventListener("pointerdown", release);
    window.addEventListener("keydown", release);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", release);
      window.removeEventListener("keydown", release);
      current?.stop();
      setSong(null);
    };
  }, [shouldPlay, audio]);

  useEffect(() => () => { if (context.current) void context.current.close(); context.current = null; }, []);

  const toggle = useCallback(() => { unlock(); setChoice((value) => !value); }, [unlock]);
  return {
    playing: shouldPlay && song !== null && running,
    song,
    siteMuted: !siteSound,
    on: choice,
    blocked: shouldPlay && song !== null && !running,
    unlock,
    toggle,
  };
}
