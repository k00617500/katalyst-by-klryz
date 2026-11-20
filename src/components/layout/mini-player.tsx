"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Music2, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { useMusic } from "@/components/providers/music-provider";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "katalyst-mini-player-collapsed";

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** A small floating "now playing" card that follows visitors around the site while a song is going. */
export function MiniPlayer({ visible }: { visible: boolean }) {
  const { song, isPlaying, positionMs, durationMs, loop, shuffle, togglePlay, skipSong, seekToRatio, toggleLoop, toggleShuffle } = useMusic();
  const [collapsed, setCollapsed] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1"); } catch { /* storage can be unavailable */ }
  }, []);

  const updateCollapsed = (value: boolean) => {
    setCollapsed(value);
    try { window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0"); } catch { /* storage can be unavailable */ }
  };

  const seek = (event: PointerEvent<HTMLDivElement>) => {
    const bar = barRef.current;
    if (!bar || !durationMs) return;
    const rect = bar.getBoundingClientRect();
    seekToRatio((event.clientX - rect.left) / rect.width);
  };

  const progress = durationMs ? Math.min(100, (positionMs / durationMs) * 100) : 0;
  const control = "inline-flex size-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground";

  return (
    <div
      role="region"
      aria-label="Now playing"
      inert={!visible}
      className={cn(
        "fixed right-4 bottom-4 z-[60] w-[19rem] max-w-[calc(100vw-2rem)] transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
        visible ? "opacity-100" : "pointer-events-none translate-y-6 opacity-0",
        visible && collapsed && "translate-x-[calc(100%-2rem)]",
      )}
    >
      <div className="relative overflow-hidden rounded-[1.4rem] border border-foreground/10 bg-background/75 backdrop-blur-2xl backdrop-saturate-150">
        <div inert={collapsed} className="flex flex-col gap-2.5 p-3">
          <div className="flex items-center gap-3">
            <div className="size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
              {song.cover
                ? <Image key={song.cover} src={song.cover} alt={`${song.title} cover art`} width={88} height={88} className="size-full object-cover" />
                : <div className="grid size-full place-items-center text-muted-foreground"><Music2 className="size-5" aria-hidden="true" /></div>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] leading-tight font-semibold">{song.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{song.artist}</p>
            </div>
            <button type="button" aria-label="Collapse the player to the side" onClick={() => updateCollapsed(true)}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-8 text-right font-mono text-[10px] text-muted-foreground tabular-nums">{formatTime(positionMs)}</span>
            <div ref={barRef} role="slider" aria-label="Playback position" aria-valuemin={0} aria-valuemax={durationMs} aria-valuenow={positionMs} tabIndex={0}
              onPointerDown={seek} className="group flex h-4 flex-1 cursor-pointer items-center">
              <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/15 transition-[height] group-hover:h-1.5">
                <div className="h-full rounded-full bg-foreground/80 transition-[width] duration-150 ease-linear" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <span className="w-9 font-mono text-[10px] text-muted-foreground tabular-nums">-{formatTime(durationMs - positionMs)}</span>
          </div>

          <div className="flex items-center justify-center gap-1.5">
            <button type="button" aria-label={loop ? "Disable loop" : "Loop this song"} aria-pressed={loop} onClick={toggleLoop} style={loop ? { color: "var(--brand-ink)" } : undefined} className={control}>
              <Repeat className="size-4" aria-hidden="true" />
            </button>
            <button type="button" aria-label="Previous song" onClick={() => skipSong(-1)} className={control}>
              <SkipBack className="size-[18px] fill-current" aria-hidden="true" />
            </button>
            <button type="button" aria-label={isPlaying ? "Pause" : "Play"} onClick={togglePlay}
              className="inline-flex size-11 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95">
              {isPlaying ? <Pause className="size-5 fill-current" aria-hidden="true" /> : <Play className="ml-0.5 size-5 fill-current" aria-hidden="true" />}
            </button>
            <button type="button" aria-label="Next song" onClick={() => skipSong(1)} className={control}>
              <SkipForward className="size-[18px] fill-current" aria-hidden="true" />
            </button>
            <button type="button" aria-label={shuffle ? "Disable smart shuffle" : "Smart shuffle"} aria-pressed={shuffle} onClick={toggleShuffle} style={shuffle ? { color: "var(--brand-ink)" } : undefined} className={control}>
              <Shuffle className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {collapsed && (
          <button type="button" aria-label="Show the player" onClick={() => updateCollapsed(false)}
            className="absolute inset-y-0 left-0 flex w-8 items-center justify-center bg-background/40 text-foreground/70 transition-colors hover:text-foreground">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
