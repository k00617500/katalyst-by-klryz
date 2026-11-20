"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSound } from "@/components/providers/sound-provider";
import { useMusic, type SpotifyEmbedController } from "@/components/providers/music-provider";
import { CHRISTMAS_TRACKS, type ChristmasTrack } from "@/data/christmas-songs";
import { pickSong, playSong, type Playing } from "@/lib/christmas-music";

export interface NowPlaying {
  title: string;
  artist?: string;
  /** Extra words for the label, e.g. when only the chords are played. */
  note?: string;
}

export interface ChristmasMusic {
  /** True while a song is actually sounding. */
  playing: boolean;
  song: NowPlaying | null;
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

const PREVIEW_MS = 31000; // Spotify's logged-out previews run about 30 seconds.

function randomTrack(previous?: string): ChristmasTrack {
  const pool = CHRISTMAS_TRACKS.filter((track) => track.id !== previous);
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Random Filipino Christmas songs, played through Spotify's official embed, while `wanted` is true: when a visitor
 * starts decorating the tree and while the card is on screen. A different random song follows each one. Muting the site
 * with the navbar sound switch stops it at once, and it stays quiet while the Toolkit's Spotify player is playing.
 * If the Spotify player can't load, soft synthesised chords are used instead (and labelled as such).
 */
export function useChristmasMusic(wanted: boolean, prepare = wanted): ChristmasMusic {
  const { enabled: siteSound } = useSound();
  const { isPlaying: toolkitPlaying, playlistApi } = useMusic();
  const [choice, setChoice] = useState(true);
  const [song, setSong] = useState<NowPlaying | null>(null);
  const [sounding, setSounding] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const shouldPlay = wanted && siteSound && choice && !toolkitPlaying;

  const controller = useRef<SpotifyEmbedController | null>(null);
  const host = useRef<HTMLDivElement | null>(null);
  const ready = useRef(false);
  const startedAt = useRef(0);
  const lastId = useRef<string | undefined>(undefined);
  const wantRef = useRef(false);
  const advanceRef = useRef<() => void>(() => {});
  const soundingRef = useRef(false);
  const audio = useRef<AudioContext | null>(null);

  // A hidden Spotify player, loaded as soon as the section is on screen so it is ready when the first ornament goes up.
  useEffect(() => {
    if (!prepare || !playlistApi || controller.current) return;
    const element = document.createElement("div");
    element.setAttribute("inert", "");
    element.setAttribute("aria-hidden", "true");
    element.style.cssText = "position:fixed;right:0;bottom:0;width:320px;height:152px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1";
    const target = document.createElement("div");
    element.append(target);
    document.body.append(element);
    host.current = element;
    let cancelled = false;
    const first = randomTrack(lastId.current);
    playlistApi.createController(target, { uri: `spotify:track:${first.id}`, width: "100%", height: 152 }, (embed) => {
      if (cancelled) { embed.destroy(); return; }
      controller.current = embed;
      embed.addListener("ready", () => { ready.current = true; });
      embed.addListener("playback_started", () => { setSounding(true); setBlocked(false); });
      embed.addListener("playback_update", ({ data }) => {
        if (!wantRef.current) return;
        if (!data.isPaused && !data.isBuffering && data.position > 0) { setSounding(true); setBlocked(false); }
        // The preview has reached its end: line up the next random song.
        if (data.duration > 0 && data.position >= data.duration - 1200 && Date.now() - startedAt.current > 4000) advanceRef.current();
      });
    });
    return () => {
      cancelled = true;
      try { controller.current?.destroy(); } catch { /* already gone */ }
      controller.current = null;
      ready.current = false;
      element.remove();
      host.current = null;
    };
  }, [prepare, playlistApi]);

  useEffect(() => { soundingRef.current = sounding; }, [sounding]);

  useEffect(() => {
    wantRef.current = shouldPlay;
    if (!shouldPlay) {
      try { controller.current?.pause(); } catch { /* player not ready */ }
      return;
    }
    let cancelled = false;
    let watchdog = 0;
    let synth: Playing | null = null;

    const playSynthFallback = () => {
      try {
        audio.current ??= new AudioContext();
        if (audio.current.state === "suspended") void audio.current.resume();
        const chosen = pickSong(lastId.current);
        lastId.current = chosen.id;
        setSong({ title: chosen.title, note: chosen.melody ? "instrumental" : "chords only, from the songbook" });
        setSounding(true);
        synth = playSong(audio.current, chosen, () => { if (!cancelled) advanceRef.current(); });
      } catch { setBlocked(true); }
    };

    const startNext = () => {
      if (cancelled) return;
      window.clearTimeout(watchdog);
      const embed = controller.current;
      if (!embed) { playSynthFallback(); return; }
      const track = randomTrack(lastId.current);
      lastId.current = track.id;
      setSong({ title: track.title, artist: track.artist });
      startedAt.current = Date.now();
      try {
        embed.loadUri(`spotify:track:${track.id}`);
        embed.play();
        // If the browser holds the playback back, say so rather than pretending.
        window.setTimeout(() => { if (!cancelled && !soundingRef.current) setBlocked(true); }, 3500);
      } catch { setBlocked(true); }
      // Previews end on their own; this keeps the shuffle going even if no end event arrives.
      watchdog = window.setTimeout(() => { if (!cancelled) advanceRef.current(); }, PREVIEW_MS);
    };
    advanceRef.current = () => { synth?.stop(); synth = null; setSounding(false); startNext(); };

    const timer = window.setTimeout(startNext, 0);
    // A click or key press anywhere releases a held-back player.
    const release = () => { try { controller.current?.resume(); } catch { /* player not ready */ } };
    window.addEventListener("pointerdown", release);
    window.addEventListener("keydown", release);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(watchdog);
      window.removeEventListener("pointerdown", release);
      window.removeEventListener("keydown", release);
      synth?.stop();
      try { controller.current?.pause(); } catch { /* player not ready */ }
      setSounding(false);
      setSong(null);
    };
  }, [shouldPlay]);

  useEffect(() => () => { if (audio.current) void audio.current.close(); audio.current = null; }, []);

  // Called from clicks: if music is wanted but the browser is holding it back, start the next song right now,
  // inside the click, which is when browsers allow playback.
  const unlock = useCallback(() => {
    if (wantRef.current && !soundingRef.current) advanceRef.current();
    try { if (audio.current?.state === "suspended") void audio.current.resume(); } catch { /* none */ }
  }, []);
  const toggle = useCallback(() => { unlock(); setChoice((value) => !value); }, [unlock]);

  return {
    playing: shouldPlay && song !== null && sounding,
    song,
    siteMuted: !siteSound,
    on: choice,
    blocked: shouldPlay && song !== null && blocked && !sounding,
    unlock,
    toggle,
  };
}
