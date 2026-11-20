"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import Image from "next/image";
import { Menu, Music2, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { watchToolkitTabAudio } from "@/lib/toolkit-tab-audio";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSound } from "@/components/providers/sound-provider";
import { toolkitItems } from "@/data/toolkit";
import { type ToolkitSong } from "@/data/toolkit-songs";
import { useMusic, type SpotifyEmbedController, type SpotifyIframeApi } from "@/components/providers/music-provider";

const PLAYLIST_URL = "https://open.spotify.com/playlist/37i9dQZF1DXe3Jzj3uus9u?theme=0";

const C4 = 261.63;
const NOTE_FLASH_MS = 130;
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

    api.createController(target, { url: PLAYLIST_URL, width: "100%", height: 640 }, (embed) => {
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

  return <div ref={hostRef} className="h-[640px] max-h-[calc(94dvh-8.5rem)] overflow-hidden rounded-xl [&>iframe]:block [&>iframe]:border-0" />;
}

// Every tile sounds a note of the CURRENTLY playing song's motif, spread across a few octaves for variety.
const noteFrequency = (tileIndex: number, song: ToolkitSong) => {
  const motif = song.motif;
  const noteInMotif = tileIndex % motif.length;
  const octaveGroup = Math.floor(tileIndex / motif.length) % 3;
  const semitone = motif[noteInMotif] + (octaveGroup - 1) * 12;
  return C4 * Math.pow(2, semitone / 12);
};

function randomTileIndex(previous: number | null) {
  const tileCount = toolkitItems.length;
  if (tileCount <= 1) return 0;
  if (previous === null) return Math.floor(Math.random() * tileCount);
  const index = Math.floor(Math.random() * (tileCount - 1));
  return index >= previous ? index + 1 : index;
}

export function ToolkitSection() {
  const { enabled, toggle, playNote } = useSound();
  const {
    song, isPlaying, positionMs, durationMs, loop, shuffle, playlistApi,
    togglePlay, skipSong, seekToRatio, toggleLoop, toggleShuffle, pickSpotifyTrack: playSpotifyTrack,
    setPanelVisible, hooksRef, lastPlaybackRef, playingRef, playRequestedRef,
  } = useMusic();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [beatSync, setBeatSync] = useState<"idle" | "connecting" | "ready" | "retry" | "unsupported">("idle");

  const panelRef = useRef<HTMLDivElement | null>(null);
  const activeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeTileRef = useRef<HTMLDivElement | null>(null);
  const tabAudioRef = useRef<AbortController | null>(null);
  const previousTileRef = useRef<number | null>(null);
  const resetBeatRef = useRef<(() => void) | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const clearActiveTile = useCallback(() => {
    if (activeTimeoutRef.current) clearTimeout(activeTimeoutRef.current);
    activeTimeoutRef.current = null;
    activeTileRef.current?.classList.remove("is-active");
    activeTileRef.current = null;
  }, []);

  // The player itself lives in the site-wide MusicProvider; this section only reacts to it with tile flashes.
  useEffect(() => {
    hooksRef.current = {
      onSongLoad: () => { previousTileRef.current = null; resetBeatRef.current?.(); },
      onSeek: () => resetBeatRef.current?.(),
      onStop: clearActiveTile,
    };
    return () => { hooksRef.current = {}; };
  }, [hooksRef, clearActiveTile]);

  // While this panel is on screen the floating mini player stays out of the way.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const observer = new IntersectionObserver(([entry]) => setPanelVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(panel);
    return () => { observer.disconnect(); setPanelVisible(false); };
  }, [setPanelVisible]);

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

  const seek = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    seekToRatio((event.clientX - rect.left) / rect.width);
  }, [seekToRatio]);

  const pickSpotifyTrack = useCallback((id: string) => {
    playSpotifyTrack(id);
    setPickerOpen(false);
  }, [playSpotifyTrack]);

  useEffect(() => () => {
    tabAudioRef.current?.abort();
    tabAudioRef.current = null;
    resetBeatRef.current = null;
    clearActiveTile();
  }, [clearActiveTile]);

  const progress = durationMs ? (positionMs / durationMs) * 100 : 0;

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

        <ScrollReveal y={0} className="relative isolate w-full shrink-0 lg:w-[360px]">
          <div ref={panelRef} data-beat-sync={beatSync} className="relative z-10 flex items-center gap-4 rounded-2xl border border-border bg-background p-4">
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
                  onClick={toggleLoop}
                  style={loop ? { color: "var(--brand-ink)" } : undefined}
                  className="showcase-control size-7 text-muted-foreground"
                >
                  <Repeat className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Previous song"
                  onClick={() => skipSong(-1)}
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
                  onClick={() => skipSong(1)}
                  className="showcase-control size-7 text-muted-foreground hover:text-foreground"
                >
                  <SkipForward className="size-3.5 fill-current" />
                </button>
                <button
                  type="button"
                  aria-label={shuffle ? "Disable smart shuffle" : "Smart shuffle"}
                  aria-pressed={shuffle}
                  onClick={toggleShuffle}
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
        </ScrollReveal>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="flex max-h-[94dvh] w-[calc(100%-2rem)] flex-col overflow-y-auto sm:max-w-xl md:p-6">
          <DialogHeader className="pr-8">
            <DialogTitle>Viral Hits Philippines</DialogTitle>
            <DialogDescription className="sr-only">Pick a track to play it on the site.</DialogDescription>
          </DialogHeader>

          <div className="min-w-0 space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Full playlist on Spotify
            </p>
            <SpotifyPlaylistPicker api={playlistApi} onSelect={pickSpotifyTrack} />
          </div>
        </DialogContent>
      </Dialog>

      <ScrollReveal
        y={0}
        className={cn(
          "toolkit-grid mt-8 overflow-hidden rounded-lg border-t border-l border-border",
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
              className="toolkit-tile group relative flex min-w-0 flex-col items-center justify-center gap-1 border-r border-b border-border bg-background px-1 sm:gap-2 sm:px-2"
              style={{ "--tool-color": isAdaptive ? "var(--foreground)" : item.color } as CSSProperties}
              onMouseEnter={() => hitTile(index, false)}
              onClick={() => hitTile(index, true)}
            >
              <Icon
                className="size-4 text-muted-foreground/60 grayscale sm:size-6 lg:size-7"
              />
              <span className="truncate font-space text-[9px] text-muted-foreground sm:text-xs">
                {item.name}
              </span>
            </div>
          );
        })}
      </ScrollReveal>
    </section>
  );
}
