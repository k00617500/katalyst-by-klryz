"use client";

import { CircleHelp, Pause, Play, Sparkles, Volume2, VolumeX, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PinballHudState } from "./use-pinball-game";

export function PinballHud({
  hud,
  onTogglePause,
  onToggleMute,
  onShowInstructions,
  onNudge,
}: {
  hud: PinballHudState;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onShowInstructions: () => void;
  onNudge: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-1.5 p-3 font-mono text-[11px] text-white/90">
      <div className="flex items-start justify-between gap-2">
        <div className="pointer-events-auto flex flex-col gap-1 rounded-lg bg-black/50 px-3 py-2 backdrop-blur-sm">
          <span className="text-[10px] uppercase tracking-wider text-white/50">Score</span>
          <span className="text-xl font-semibold tabular-nums">{hud.score.toLocaleString()}</span>
          <span className="text-[10px] text-white/50">Best {hud.highScore.toLocaleString()}</span>
        </div>

        <div className="pointer-events-auto flex flex-col items-center gap-1 rounded-lg bg-black/50 px-3 py-2 text-center backdrop-blur-sm">
          <span className="text-[10px] uppercase tracking-wider text-white/50">{hud.level.tierName}</span>
          <span className="tabular-nums">Ball {hud.ballNumber}/3</span>
          <div className="flex gap-2 text-[10px]">
            {hud.comboHits > 1 && <span className="text-brand-ink">COMBO ×{hud.comboMultiplier}</span>}
          </div>
          {hud.targetProgress.completed > 0 && (
            <span className="text-[10px] text-white/60">Targets {hud.targetProgress.completed}/{hud.targetProgress.total}</span>
          )}
        </div>

        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            aria-label="Nudge the machine"
            onClick={onNudge}
            disabled={hud.phase !== "playing"}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70",
              hud.phase !== "playing" && "opacity-40",
            )}
          >
            <Zap className="size-4" />
          </button>
          <button
            type="button"
            aria-label="How to play"
            onClick={onShowInstructions}
            className="inline-flex size-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <CircleHelp className="size-4" />
          </button>
          <button
            type="button"
            aria-label={hud.muted ? "Unmute" : "Mute"}
            onClick={onToggleMute}
            className="inline-flex size-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            {hud.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button
            type="button"
            aria-label={hud.phase === "paused" ? "Resume" : "Pause"}
            onClick={onTogglePause}
            disabled={hud.phase !== "playing" && hud.phase !== "paused"}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70",
              hud.phase !== "playing" && hud.phase !== "paused" && "opacity-40",
            )}
          >
            {hud.phase === "paused" ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
        </div>
      </div>

      {hud.mission && (
        <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur-sm">
          <span className="truncate text-[10px] text-white/70">{hud.mission.title}</span>
          <span className={cn("shrink-0 text-[10px]", hud.mission.state === "completed" ? "text-brand-ink" : "text-white/50")}>
            {hud.mission.state === "completed" ? "COMPLETE" : hud.mission.progress}
          </span>
        </div>
      )}

      {hud.jackpotState === "lit" && (
        <div className="pointer-events-none flex items-center justify-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-center text-[11px] font-semibold tracking-wide text-black">
          <Sparkles className="size-3.5" /> JACKPOT LIT — HIT THE CENTER BUMPER
        </div>
      )}

      {hud.activeRandomEvent && (
        <div className="pointer-events-none flex items-center justify-center rounded-full bg-brand px-3 py-1 text-center text-[11px] font-semibold tracking-wide text-brand-foreground">
          {hud.activeRandomEvent.label}!
        </div>
      )}

      {hud.tiltState === "warning" && (
        <div className="pointer-events-none flex items-center justify-center rounded-full bg-yellow-500/90 px-3 py-1 text-center text-[11px] font-semibold tracking-wide text-black">
          TILT WARNING
        </div>
      )}
      {hud.tiltState === "tilted" && (
        <div className="pointer-events-none flex items-center justify-center rounded-full bg-red-600/90 px-3 py-1 text-center text-[11px] font-semibold tracking-wide text-white">
          TILTED — FLIPPERS DISABLED
        </div>
      )}

      {hud.phase === "paused" && (
        <div className="absolute inset-0 top-14 flex items-center justify-center">
          <span className="rounded-full bg-black/70 px-4 py-2 text-sm tracking-wide text-white">PAUSED — Esc to resume</span>
        </div>
      )}
      {hud.phase === "ball-lost" && hud.ballNumber <= 3 && (
        <div className="absolute inset-0 top-14 flex items-center justify-center">
          <span className="rounded-full bg-black/70 px-4 py-2 text-sm tracking-wide text-white">BALL {hud.ballNumber - 1} LOST</span>
        </div>
      )}
    </div>
  );
}
