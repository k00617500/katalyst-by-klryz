"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { ChevronRight, Music2, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { useMusic } from "@/components/providers/music-provider";

const STORAGE_KEY = "katalyst-mini-player-collapsed";
const COLLAPSED_WIDTH = 60;
const EXPANDED_WIDTH = 304;
const SPRING = { type: "spring", stiffness: 380, damping: 34, mass: 0.9 } as const;

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span aria-hidden="true" className="flex h-3 items-end gap-[2px]">
      {[0, 1, 2].map((bar) => (
        <motion.span key={bar} className="w-[2px] rounded-full bg-brand-ink"
          animate={{ height: playing ? ["25%", "100%", "45%", "85%", "30%"] : "25%" }}
          transition={playing ? { duration: 1.1 + bar * 0.2, repeat: Infinity, ease: "easeInOut", delay: bar * 0.12 } : { duration: 0.3 }} />
      ))}
    </span>
  );
}

const iconButton = "inline-flex size-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground";

/** A small floating "now playing" card that follows visitors around the site while a song is going. */
export function MiniPlayer({ visible }: { visible: boolean }) {
  const { song, isPlaying, positionMs, durationMs, loop, shuffle, togglePlay, skipSong, seekToRatio, toggleLoop, toggleShuffle } = useMusic();
  const reduced = useReducedMotion();
  const dragControls = useDragControls();
  const barRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [scrub, setScrub] = useState<number | null>(null);
  const [width, setWidth] = useState(EXPANDED_WIDTH);

  useEffect(() => {
    try { setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1"); } catch { /* storage can be unavailable */ }
    const fit = () => setWidth(Math.min(EXPANDED_WIDTH, window.innerWidth - 32));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const updateCollapsed = (value: boolean) => {
    setCollapsed(value);
    try { window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0"); } catch { /* storage can be unavailable */ }
  };

  const ratioFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = barRef.current?.getBoundingClientRect();
    return rect ? Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) : 0;
  };
  const onScrubStart = (event: PointerEvent<HTMLDivElement>) => {
    if (!durationMs) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setScrub(ratioFromPointer(event));
  };
  const onScrubMove = (event: PointerEvent<HTMLDivElement>) => {
    if (scrub !== null) setScrub(ratioFromPointer(event));
  };
  const onScrubEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (scrub === null) return;
    seekToRatio(ratioFromPointer(event));
    setScrub(null);
  };

  const ratio = scrub ?? (durationMs ? Math.min(1, positionMs / durationMs) : 0);
  const shownPosition = scrub !== null ? scrub * durationMs : positionMs;
  const transition = reduced ? { duration: 0 } : SPRING;

  return (
    <motion.div
      role="region"
      aria-label="Now playing"
      inert={!visible}
      drag="x"
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.25, right: 0.5 }}
      onDragEnd={(_, info) => {
        if (!collapsed && (info.offset.x > 50 || info.velocity.x > 450)) updateCollapsed(true);
        else if (collapsed && (info.offset.x < -24 || info.velocity.x < -300)) updateCollapsed(false);
      }}
      initial={false}
      animate={{
        width: collapsed ? COLLAPSED_WIDTH : width,
        height: collapsed ? COLLAPSED_WIDTH : "auto",
        right: collapsed ? 0 : 16,
        y: visible ? 0 : 28,
        opacity: visible ? 1 : 0,
        borderTopRightRadius: collapsed ? 0 : 22,
        borderBottomRightRadius: collapsed ? 0 : 22,
        borderTopLeftRadius: collapsed ? 16 : 22,
        borderBottomLeftRadius: collapsed ? 16 : 22,
      }}
      whileHover={collapsed ? { right: 6 } : undefined}
      transition={transition}
      className="fixed bottom-4 z-[60] overflow-hidden rounded-[1.4rem] border border-foreground/10 bg-background/75 backdrop-blur-2xl backdrop-saturate-150"
      style={{ pointerEvents: visible ? "auto" : "none" }}
    >
      <div className="p-2" style={{ width }}>
        <div className="flex items-center gap-3">
          {/* Collapsed, only this cover shows; pressing it opens the player. */}
          <motion.button
            type="button"
            aria-label={collapsed ? "Open the player" : undefined}
            tabIndex={collapsed ? 0 : -1}
            onClick={() => collapsed && updateCollapsed(false)}
            animate={collapsed && isPlaying && !reduced ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={collapsed && isPlaying && !reduced ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
            whileTap={{ scale: 0.94 }}
            className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-muted"
            style={{ touchAction: "none" }}
            onPointerDown={(event) => collapsed && dragControls.start(event)}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={song.cover || song.id} className="absolute inset-0" initial={{ opacity: 0, scale: 1.12 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                {song.cover
                  ? <Image src={song.cover} alt={`${song.title} cover art`} width={88} height={88} className="size-full object-cover" draggable={false} />
                  : <div className="grid size-full place-items-center text-muted-foreground"><Music2 className="size-5" aria-hidden="true" /></div>}
              </motion.div>
            </AnimatePresence>
          </motion.button>

          <div className="min-w-0 flex-1 cursor-grab select-none active:cursor-grabbing" onPointerDown={(event) => dragControls.start(event)} style={{ touchAction: "none" }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={song.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] leading-tight font-semibold">{song.title}</p>
                  <Equalizer playing={isPlaying} />
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{song.artist}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <motion.button type="button" aria-label="Collapse the player to the side" tabIndex={collapsed ? -1 : 0} onClick={() => updateCollapsed(true)}
            whileHover={{ x: 2 }} whileTap={{ scale: 0.85 }}
            className="mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground">
            <ChevronRight className="size-4" aria-hidden="true" />
          </motion.button>
        </div>

        <motion.div inert={collapsed} animate={{ opacity: collapsed ? 0 : 1 }} transition={{ duration: 0.18 }} className="mt-2.5 flex flex-col gap-2.5 px-1 pb-1">
          <div className="flex items-center gap-2">
            <span className="w-8 text-right font-mono text-[10px] text-muted-foreground tabular-nums">{formatTime(shownPosition)}</span>
            <div ref={barRef} role="slider" aria-label="Playback position" aria-valuemin={0} aria-valuemax={durationMs} aria-valuenow={Math.round(shownPosition)} tabIndex={0}
              onPointerDown={onScrubStart} onPointerMove={onScrubMove} onPointerUp={onScrubEnd} onPointerCancel={() => setScrub(null)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") seekToRatio(Math.min(1, ratio + 0.05));
                if (event.key === "ArrowLeft") seekToRatio(Math.max(0, ratio - 0.05));
              }}
              className="group relative flex h-5 flex-1 cursor-pointer touch-none items-center">
              <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/15 transition-[height] duration-150 group-hover:h-1.5">
                <div className="h-full rounded-full bg-foreground/80" style={{ width: `${ratio * 100}%`, transition: scrub !== null ? "none" : "width 150ms linear" }} />
              </div>
              <span aria-hidden="true" className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground transition-[opacity,transform] ${scrub !== null ? "scale-125 opacity-100" : "scale-75 opacity-0 group-hover:opacity-100"}`} style={{ left: `${ratio * 100}%` }} />
            </div>
            <span className="w-9 font-mono text-[10px] text-muted-foreground tabular-nums">-{formatTime(durationMs - shownPosition)}</span>
          </div>

          <div className="flex items-center justify-center gap-1.5">
            <motion.button type="button" aria-label={loop ? "Disable loop" : "Loop this song"} aria-pressed={loop} onClick={toggleLoop} whileTap={{ scale: 0.85 }} style={loop ? { color: "var(--brand-ink)" } : undefined} className={iconButton}>
              <Repeat className="size-4" aria-hidden="true" />
            </motion.button>
            <motion.button type="button" aria-label="Previous song" onClick={() => skipSong(-1)} whileTap={{ scale: 0.85, x: -3 }} className={iconButton}>
              <SkipBack className="size-[18px] fill-current" aria-hidden="true" />
            </motion.button>
            <motion.button type="button" aria-label={isPlaying ? "Pause" : "Play"} onClick={togglePlay} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.9 }}
              className="inline-flex size-11 items-center justify-center rounded-full bg-foreground text-background">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={isPlaying ? "pause" : "play"} initial={{ scale: 0.5, opacity: 0, rotate: -40 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.5, opacity: 0, rotate: 40 }} transition={{ duration: 0.16 }} className="flex">
                  {isPlaying ? <Pause className="size-5 fill-current" aria-hidden="true" /> : <Play className="ml-0.5 size-5 fill-current" aria-hidden="true" />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
            <motion.button type="button" aria-label="Next song" onClick={() => skipSong(1)} whileTap={{ scale: 0.85, x: 3 }} className={iconButton}>
              <SkipForward className="size-[18px] fill-current" aria-hidden="true" />
            </motion.button>
            <motion.button type="button" aria-label={shuffle ? "Disable smart shuffle" : "Smart shuffle"} aria-pressed={shuffle} onClick={toggleShuffle} whileTap={{ scale: 0.85, rotate: 12 }} style={shuffle ? { color: "var(--brand-ink)" } : undefined} className={iconButton}>
              <Shuffle className="size-4" aria-hidden="true" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
