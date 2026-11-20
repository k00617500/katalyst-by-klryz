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
  const context = useRef<AudioContext | null>(null);
  const lastId = useRef<string | undefined>(undefined);

  const shouldPlay = wanted && siteSound && choice && !spotifyPlaying;

  useEffect(() => {
    if (!shouldPlay) return;
    let current: Playing | null = null;
    let timer = 0;
    let cancelled = false;
    const next = () => {
      if (cancelled) return;
      try {
        context.current ??= new AudioContext();
        if (context.current.state === "suspended") void context.current.resume();
        const chosen = pickSong(lastId.current);
        lastId.current = chosen.id;
        setSong(chosen);
        current = playSong(context.current, chosen, next);
      } catch { /* no audio available */ }
    };
    timer = window.setTimeout(next, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      current?.stop();
      setSong(null);
    };
  }, [shouldPlay]);

  useEffect(() => () => { if (context.current) void context.current.close(); context.current = null; }, []);

  const toggle = useCallback(() => setChoice((value) => !value), []);
  return { playing: shouldPlay && song !== null, song, siteMuted: !siteSound, on: choice, toggle };
}
