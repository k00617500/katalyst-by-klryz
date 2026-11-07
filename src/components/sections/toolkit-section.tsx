"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import Image from "next/image";
import { Menu, Music2, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { watchToolkitTabAudio } from "@/lib/toolkit-tab-audio";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSound } from "@/components/providers/sound-provider";
import { toolkitItems } from "@/data/toolkit";
import { createToolkitSong, toolkitSongs, type ToolkitSong } from "@/data/toolkit-songs";

const PLAYLIST_URL = "https://open.spotify.com/playlist/37i9dQZF1DXe3Jzj3uus9u?theme=0";

interface SpotifyPlaybackState {
  playingURI: string;
  isBuffering: boolean;
  isPaused: boolean;
  position: number;
  duration: number;
}

interface SpotifyEmbedController {
  play: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  seek: (seconds: number) => void;
  loadUri: (uri: string) => void;
  addListener(event: "ready", callback: () => void): void;
  addListener(event: "playback_started", callback: (event: { data: { playingURI: string } }) => void): void;
  addListener(event: "playback_update", callback: (event: { data: SpotifyPlaybackState }) => void): void;
  destroy: () => void;
}

interface SpotifyIframeApi {
  createController: (
    element: HTMLElement,
    options: ({ uri: string } | { url: string }) & { width?: string | number; height?: string | number },
    callback: (controller: SpotifyEmbedController) => void,
  ) => void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (IFrameAPI: SpotifyIframeApi) => void;
  }
}

const C4 = 261.63;
const NOTE_FLASH_MS = 130;
const TRACK_END_WINDOW_MS = 1200;
// A couple of extra seconds of buffer so a slow-starting preview gets a fair chance before we retry it.
const PLAYBACK_START_TIMEOUT_MS = 6500;
// Spotify previews report progress roughly once a second in the foreground. A few added seconds of
// slack here avoids flipping to "paused" during brief background-tab throttling.
const STALL_WATCHDOG_MS = 3600;
let spotifyApi: SpotifyIframeApi | undefined;

function SpotifyPlaylistPicker({ api, onSelect }: { api?: SpotifyIframeApi; onSelect: (id: string) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!api || !host) return;
    const target = document.createElement("div");
    host.replaceChildren(target);
    let controller: SpotifyEmbedController | undefined;
    let closed = false;
    let handedOff = false;

    api.createController(target, { url: PLAYLIST_URL, width: "100%", height: 352 }, (embed) => {
      if (closed) { embed.destroy(); return; }
      controller = embed;
      host.querySelector("iframe")?.setAttribute("title", "Viral Hits Philippines — full Spotify playlist");

      const handOff = (uri: string) => {
        if (closed || handedOff) return;
        const match = /^spotify:track:([a-zA-Z0-9]{22})$/.exec(uri);
        if (!match) return;
        handedOff = true;
        embed.pause();
        onSelect(match[1]);
      };

      embed.addListener("playback_started", ({ data }) => handOff(data.playingURI));
      embed.addListener("playback_update", ({ data }) => {
        if (!data.isPaused && !data.isBuffering && data.position > 0) handOff(data.playingURI);
      });
    });

    return () => {
      closed = true;
      controller?.destroy();
    };
  }, [api, onSelect]);

  return <div ref={hostRef} className="h-[352px] overflow-hidden rounded-xl [&>iframe]:block [&>iframe]:border-0" />;
}

// Every tile sounds a note of the CURRENTLY playing song's motif, spread across a few octaves for variety.
const noteFrequency = (tileIndex: number, song: ToolkitSong) => {
  const motif = song.motif;
  const noteInMotif = tileIndex % motif.length;
  const octaveGroup = Math.floor(tileIndex / motif.length) % 3;
  const semitone = motif[noteInMotif] + (octaveGroup - 1) * 12;
  return C4 * Math.pow(2, semitone / 12);
};

function createShuffleOrder(songCount: number) {
  const order = Array.from({ length: songCount }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}

function randomTileIndex(previous: number | null) {
  const tileCount = toolkitItems.length;
  if (tileCount <= 1) return 0;
  if (previous === null) return Math.floor(Math.random() * tileCount);
  const index = Math.floor(Math.random() * (tileCount - 1));
  return index >= previous ? index + 1 : index;
}

export function ToolkitSection() {
  const { enabled, toggle, playNote } = useSound();
  const [songs, setSongs] = useState(toolkitSongs);
  const [playlistApi, setPlaylistApi] = useState<SpotifyIframeApi>();
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [loop, setLoop] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [beatSync, setBeatSync] = useState<"idle" | "connecting" | "ready" | "retry" | "unsupported">("idle");

  const controllerRef = useRef<SpotifyEmbedController | null>(null);
  const embedContainerRef = useRef<HTMLDivElement | null>(null);
  const activeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeTileRef = useRef<HTMLDivElement | null>(null);
  const tabAudioRef = useRef<AbortController | null>(null);
  const previousTileRef = useRef<number | null>(null);
  const resetBeatRef = useRef<(() => void) | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stallWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPlaybackRef = useRef<SpotifyPlaybackState | null>(null);
  const playingRef = useRef(false);
  const readyRef = useRef(false);
  const playRequestedRef = useRef(false);

  const songIndexRef = useRef(0);
  const songsRef = useRef(toolkitSongs);
  const loopRef = useRef(false);
  const shuffleOrderRef = useRef<number[] | null>(null);

  const clearActiveTile = useCallback(() => {
    if (activeTimeoutRef.current) clearTimeout(activeTimeoutRef.current);
    activeTimeoutRef.current = null;
    activeTileRef.current?.classList.remove("is-active");
    activeTileRef.current = null;
  }, []);

  const updatePlaying = useCallback((playing: boolean) => {
    playingRef.current = playing;
    setIsPlaying(playing);
    if (!playing) clearActiveTile();
  }, [clearActiveTile]);

  const resetPlayback = useCallback(() => {
    lastPlaybackRef.current = null;
    if (stallWatchdogRef.current) clearTimeout(stallWatchdogRef.current);
    if (playbackStartTimeoutRef.current) clearTimeout(playbackStartTimeoutRef.current);
    updatePlaying(false);
  }, [updatePlaying]);

  const requestPlayback = useCallback(() => {
    resetPlayback();
    playRequestedRef.current = true;
    playbackStartTimeoutRef.current = setTimeout(() => {
      // A preview may stall on its first start. Give the selected track one retry in place.
      if (playRequestedRef.current && readyRef.current) controllerRef.current?.resume();
    }, PLAYBACK_START_TIMEOUT_MS);
  }, [resetPlayback]);

  const loadSong = useCallback((index: number) => {
    const previousUri = songsRef.current[songIndexRef.current].uri;
    const { uri } = songsRef.current[index];
    songIndexRef.current = index;
    previousTileRef.current = null;
    resetBeatRef.current?.();
    requestPlayback();
    setCurrentSongIndex(index);
    setPositionMs(0);

    const controller = controllerRef.current;
    if (!controller) return;
    if (uri !== previousUri) {
      readyRef.current = false;
      setDurationMs(0);
      controller.loadUri(uri);
    } else if (readyRef.current) {
      controller.restart();
    }
  }, [requestPlayback]);

  const skipSong = useCallback((direction: 1 | -1) => {
    const order = shuffleOrderRef.current;
    const index = songIndexRef.current;
    const position = order ? order.indexOf(index) : index;
    const songCount = songsRef.current.length;
    const next = (position + direction + songCount) % songCount;
    loadSong(order ? order[next] : next);
  }, [loadSong]);

  const onTrackEnded = useCallback(() => {
    if (loopRef.current) loadSong(songIndexRef.current);
    else skipSong(1);
  }, [loadSong, skipSong]);

  useEffect(() => {
    let cancelled = false;
    const container = embedContainerRef.current;
    if (!container) return;

    const initialize = (api: SpotifyIframeApi) => {
      if (cancelled) return;
      spotifyApi = api;
      setPlaylistApi(api);
      const target = document.createElement("div");
      container.replaceChildren(target);
      const initialUri = songsRef.current[songIndexRef.current].uri;
      api.createController(
        target,
        { uri: initialUri, width: "100%", height: 152 },
        (controller) => {
          if (cancelled) { controller.destroy(); return; }
          controllerRef.current = controller;
          container.querySelector("iframe")?.setAttribute("title", "Toolkit Spotify player");
          controller.addListener("ready", () => {
            if (cancelled) return;
            readyRef.current = true;
            if (playRequestedRef.current) controller.play();
          });
          controller.addListener("playback_started", ({ data }) => {
            if (cancelled || !playRequestedRef.current || data.playingURI !== songsRef.current[songIndexRef.current].uri) return;
            updatePlaying(true);
            if (stallWatchdogRef.current) clearTimeout(stallWatchdogRef.current);
            stallWatchdogRef.current = setTimeout(() => updatePlaying(false), STALL_WATCHDOG_MS);
          });
          controller.addListener("playback_update", ({ data }) => {
            const { playingURI, isPaused, isBuffering, position, duration } = data;
            if (cancelled || playingURI !== songsRef.current[songIndexRef.current].uri) return;
            const previous = lastPlaybackRef.current;
            lastPlaybackRef.current = data;
            setPositionMs(position);
            setDurationMs(duration);

            // A preview can stop at its duration while still reporting isPaused: false.
            const finishedTrack =
              playRequestedRef.current && !isBuffering && previous && !previous.isPaused && duration > 0 &&
              ((position >= duration && previous.position < duration) ||
                (isPaused && (position >= duration - 250 ||
                  (position === 0 && previous.position >= duration - TRACK_END_WINDOW_MS))));
            if (finishedTrack) {
              onTrackEnded();
              return;
            }

            if (!playRequestedRef.current || isPaused || isBuffering ||
                (duration > 0 && position >= duration)) {
              if (stallWatchdogRef.current) clearTimeout(stallWatchdogRef.current);
              updatePlaying(false);
              return;
            }
            if (position <= (previous?.position ?? 0)) return;

            if (playbackStartTimeoutRef.current) clearTimeout(playbackStartTimeoutRef.current);
            updatePlaying(true);
            if (stallWatchdogRef.current) clearTimeout(stallWatchdogRef.current);
            stallWatchdogRef.current = setTimeout(() => updatePlaying(false), STALL_WATCHDOG_MS);
          });
          const selectedUri = songsRef.current[songIndexRef.current].uri;
          if (selectedUri !== initialUri) controller.loadUri(selectedUri);
        },
      );
    };
    let script: HTMLScriptElement | undefined;
    if (spotifyApi) initialize(spotifyApi);
    else {
      window.onSpotifyIframeApiReady = initialize;
      script = document.createElement("script");
      script.src = "https://open.spotify.com/embed/iframe-api/v1";
      script.async = true;
      document.body.appendChild(script);
    }
    return () => {
      cancelled = true;
      readyRef.current = false;
      controllerRef.current?.destroy();
      controllerRef.current = null;
      if (stallWatchdogRef.current) clearTimeout(stallWatchdogRef.current);
      if (playbackStartTimeoutRef.current) clearTimeout(playbackStartTimeoutRef.current);
      if (window.onSpotifyIframeApiReady === initialize) delete window.onSpotifyIframeApiReady;
      script?.remove();
    };
  }, [onTrackEnded, updatePlaying]);

  const flashBeat = useCallback(() => {
    if (!playRequestedRef.current) return;
    const playback = lastPlaybackRef.current;
    // Spotify's progress events can lag the audio. An audible beat can still light a tile
    // while the current track's last reported state says it is playing.
    if (!playingRef.current && (!playback || playback.isPaused || playback.isBuffering || playback.position === 0 ||
      (playback.duration > 0 && playback.position >= playback.duration))) return;
    const index = randomTileIndex(previousTileRef.current);
    const tile = tileRefs.current[index];
    if (!tile) return;
    previousTileRef.current = index;
    clearActiveTile();
    tile.classList.add("is-active");
    activeTileRef.current = tile;
    activeTimeoutRef.current = setTimeout(clearActiveTile, NOTE_FLASH_MS);
  }, [clearActiveTile]);

  const startTabAudio = useCallback(() => {
    if (tabAudioRef.current) return;
    const capture = new AbortController();
    tabAudioRef.current = capture;
    setBeatSync("connecting");
    void watchToolkitTabAudio(capture.signal, flashBeat, (reason) => {
      tabAudioRef.current = null;
      resetBeatRef.current = null;
      clearActiveTile();
      setBeatSync(reason);
    }, (resetBeat) => {
      resetBeatRef.current = resetBeat;
      setBeatSync("ready");
    });
  }, [clearActiveTile, flashBeat]);

  const song = songs[currentSongIndex];

  // Tempo-paced fallback so the tiles flash in sync with the song on EVERY device — desktop Safari, iOS,
  // Android, Firefox, anywhere getDisplayMedia tab-audio capture isn't available. Real captured-audio onsets
  // (beatSync === "ready") take over and this timer steps aside once that richer sync is active.
  useEffect(() => {
    if (!isPlaying || beatSync === "ready") return;
    const intervalMs = Math.round(60000 / song.bpm);
    const id = setInterval(flashBeat, intervalMs);
    return () => clearInterval(id);
  }, [isPlaying, beatSync, song.bpm, flashBeat]);

  const hitTile = useCallback((index: number, click: boolean) => {
    if (playingRef.current || playRequestedRef.current) return;
    playNote(noteFrequency(index, song), click);
  }, [playNote, song]);

  const togglePlay = useCallback(() => {
    const controller = controllerRef.current;
    if (playingRef.current) {
      playRequestedRef.current = false;
      resetPlayback();
      controller?.pause();
      return;
    }
    const position = lastPlaybackRef.current?.position ?? 0;
    requestPlayback();
    if (controller && readyRef.current) {
      if (position > 0) controller.resume();
      else controller.play();
    }
    if (beatSync === "idle") startTabAudio();
  }, [beatSync, requestPlayback, resetPlayback, startTabAudio]);

  const skipFromControls = useCallback((direction: 1 | -1) => {
    skipSong(direction);
    if (beatSync === "idle") startTabAudio();
  }, [beatSync, skipSong, startTabAudio]);

  const seek = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const controller = controllerRef.current;
    const track = trackRef.current;
    if (!controller || !track || !durationMs) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    resetPlayback();
    resetBeatRef.current?.();
    controller.seek((ratio * durationMs) / 1000);
  }, [durationMs, resetPlayback]);

  const pickSong = useCallback((index: number) => {
    loadSong(index);
    setPickerOpen(false);
  }, [loadSong]);

  const pickSpotifyTrack = useCallback((id: string) => {
    const knownIndex = songsRef.current.findIndex((entry) => entry.id === id);
    if (knownIndex !== -1) {
      pickSong(knownIndex);
      return;
    }

    // The live playlist can include tracks beyond the site's searchable catalog.
    const index = songsRef.current.length;
    const track = createToolkitSong({ id, title: "Spotify track", artist: "Spotify", cover: "" });
    songsRef.current = [...songsRef.current, track];
    shuffleOrderRef.current?.push(index);
    setSongs(songsRef.current);
    pickSong(index);

    const url = encodeURIComponent(`https://open.spotify.com/track/${id}`);
    void fetch(`https://open.spotify.com/oembed?url=${url}`)
      .then((response) => response.ok ? response.json() : null)
      .then((metadata: { title?: string; thumbnail_url?: string } | null) => {
        const title = metadata?.title;
        if (!title) return;
        const thumbnail = metadata?.thumbnail_url;
        const cover = thumbnail?.startsWith("https://i.scdn.co/image/") ? thumbnail : "";
        songsRef.current = songsRef.current.map((entry) => entry.id === id ? { ...entry, title, cover } : entry);
        setSongs(songsRef.current);
      })
      .catch(() => { /* Playback can continue when artwork and title are unavailable. */ });
  }, [pickSong]);

  useEffect(() => () => {
    tabAudioRef.current?.abort();
    tabAudioRef.current = null;
    resetBeatRef.current = null;
    clearActiveTile();
  }, [clearActiveTile]);

  const progress = durationMs ? (positionMs / durationMs) * 100 : 0;

  const filteredSongs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs.map((entry, index) => ({ ...entry, index }));
    return songs
      .map((entry, index) => ({ ...entry, index }))
      .filter((entry) => entry.title.toLowerCase().includes(q) || entry.artist.toLowerCase().includes(q));
  }, [query, songs]);

  return (
    <section id="toolkit" className="toolkit-section container-page section-y scroll-mt-24 border-t border-border/60">
      <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:justify-between">
        <ScrollReveal>
          <SectionHeading
            eyebrow="Stack"
            title="The Katalyst Toolkit"
            description="The languages, frameworks, and tools I reach for most — I love jamming to music while I build, so hover or hit play to hear them come alive."
          />
        </ScrollReveal>

        <ScrollReveal y={0} className="relative w-full shrink-0 lg:w-[360px]">
          <div data-beat-sync={beatSync} className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4">
            <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border">
              {song.cover ? <Image
                key={song.cover}
                src={song.cover}
                alt={`${song.title} cover art`}
                width={64}
                height={64}
                className="size-full object-cover"
              /> : <div className="grid size-full place-items-center text-muted-foreground"><Music2 className="size-6" /></div>}
            </div>

            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-space text-sm font-medium text-foreground">{song.title}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{song.artist}</p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    aria-label="Browse the full playlist"
                    onClick={() => setPickerOpen(true)}
                    className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Menu className="size-[15px]" />
                  </button>
                  <button
                    type="button"
                    aria-label={enabled ? "Mute interface sounds" : "Enable interface sounds"}
                    aria-pressed={enabled}
                    onClick={toggle}
                    className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {enabled ? <Volume2 className="size-[15px]" /> : <VolumeX className="size-[15px]" />}
                  </button>
                </div>
              </div>

              <div
                ref={trackRef}
                role="slider"
                aria-label="Playback position"
                aria-valuemin={0}
                aria-valuemax={durationMs}
                aria-valuenow={positionMs}
                tabIndex={0}
                onPointerDown={seek}
                className="h-1.5 w-full cursor-pointer rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-150 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  aria-label={loop ? "Disable loop" : "Loop this song"}
                  aria-pressed={loop}
                  onClick={() => {
                    loopRef.current = !loopRef.current;
                    setLoop(loopRef.current);
                  }}
                  style={loop ? { color: "var(--brand-ink)" } : undefined}
                  className="showcase-control size-7 text-muted-foreground"
                >
                  <Repeat className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Previous song"
                  onClick={() => skipFromControls(-1)}
                  className="showcase-control size-7 text-muted-foreground hover:text-foreground"
                >
                  <SkipBack className="size-3.5 fill-current" />
                </button>
                <button
                  type="button"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  onClick={togglePlay}
                  className="inline-flex size-9 items-center justify-center rounded-full bg-brand text-brand-foreground transition-transform hover:scale-105"
                >
                  {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
                </button>
                <button
                  type="button"
                  aria-label="Next song"
                  onClick={() => skipFromControls(1)}
                  className="showcase-control size-7 text-muted-foreground hover:text-foreground"
                >
                  <SkipForward className="size-3.5 fill-current" />
                </button>
                <button
                  type="button"
                  aria-label={shuffle ? "Disable smart shuffle" : "Smart shuffle"}
                  aria-pressed={shuffle}
                  onClick={() => {
                    shuffleOrderRef.current = shuffleOrderRef.current ? null : createShuffleOrder(songsRef.current.length);
                    setShuffle(shuffleOrderRef.current !== null);
                  }}
                  style={shuffle ? { color: "var(--brand-ink)" } : undefined}
                  className="showcase-control size-7 text-muted-foreground"
                >
                  <Shuffle className="size-3.5" />
                </button>
              </div>
              {beatSync === "connecting" && (
                <p role="status" className="text-xs text-muted-foreground">Choose this tab and enable tab audio in the browser picker.</p>
              )}
              {(beatSync === "retry" || (beatSync === "idle" && isPlaying)) && (
                <button type="button" onClick={startTabAudio} className="text-xs text-muted-foreground underline underline-offset-2">
                  Share this tab’s audio for sharper beat sync
                </button>
              )}
            </div>
          </div>
          {/* The compact controls own playback. Keep the Spotify controller mounted at full size. */}
          <div
            inert
            className="pointer-events-none absolute inset-x-0 top-0 h-[152px] overflow-hidden opacity-0"
          >
            <div ref={embedContainerRef} className="[&>iframe]:block [&>iframe]:rounded-xl [&>iframe]:border-0" />
          </div>
        </ScrollReveal>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] flex-col overflow-y-auto sm:max-w-xl md:max-w-4xl md:p-6">
          <DialogHeader className="pr-8">
            <DialogTitle>Viral Hits Philippines</DialogTitle>
            <DialogDescription>Pick a track to play, or browse the full Spotify playlist.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            <div className="flex min-w-0 flex-col gap-3 md:h-[375px]">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search songs or artists…"
                aria-label="Search the playlist"
                className="shrink-0"
              />
              <div className="-mx-1 min-h-0 max-h-[32dvh] flex-1 space-y-1 overflow-y-auto px-1 md:max-h-none">
                {filteredSongs.map((entry) => (
                  <button
                    key={`${entry.id}-${entry.index}`}
                    type="button"
                    onClick={() => {
                      pickSong(entry.index);
                      if (beatSync === "idle") startTabAudio();
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary",
                      entry.index === currentSongIndex && "bg-secondary",
                    )}
                  >
                    <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      {entry.cover && <Image src={entry.cover} alt="" width={40} height={40} className="size-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-space text-sm text-foreground">{entry.title}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{entry.artist}</p>
                    </div>
                  </button>
                ))}
                {filteredSongs.length === 0 && (
                  <p className="py-6 text-center font-mono text-xs text-muted-foreground">No matches.</p>
                )}
              </div>
            </div>

            <div className="min-w-0 space-y-2 border-t border-border pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Full playlist on Spotify
              </p>
              <SpotifyPlaylistPicker api={playlistApi} onSelect={pickSpotifyTrack} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ScrollReveal
        y={0}
        className={cn(
          "toolkit-grid mt-8 flex flex-wrap overflow-hidden rounded-lg border-t border-l border-border",
          isPlaying && "is-playing",
        )}
      >
        {toolkitItems.map((item, index) => {
          const Icon = item.icon;
          const isAdaptive = item.color === "adaptive";
          return (
            <div
              key={item.name}
              ref={(tile) => { tileRefs.current[index] = tile; }}
              className="toolkit-tile group relative flex min-w-0 flex-col items-center justify-center gap-2 border-r border-b border-border bg-background px-2"
              style={{ "--tool-color": isAdaptive ? "var(--foreground)" : item.color } as CSSProperties}
              onMouseEnter={() => hitTile(index, false)}
              onClick={() => hitTile(index, true)}
            >
              <Icon
                className="size-7 text-muted-foreground/60 grayscale"
              />
              <span className="font-space text-xs text-muted-foreground">
                {item.name}
              </span>
            </div>
          );
        })}
      </ScrollReveal>
    </section>
  );
}
