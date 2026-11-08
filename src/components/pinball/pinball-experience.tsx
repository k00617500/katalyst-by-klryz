"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleHelp, Info, Pause, Play, RotateCcw, Volume2, VolumeX, Zap } from "lucide-react";
import { loadRestartDeadline } from "@/lib/pinball/restart";
import type { NudgeDirection } from "@/lib/pinball/engine";
import { PinballIntro } from "./pinball-intro";
import { PinballCanvas } from "./pinball-canvas";
import { PinballTouchControls } from "./pinball-touch-controls";
import { PinballLeftPanel } from "./pinball-left-panel";
import { PinballRightPanel } from "./pinball-right-panel";
import { PinballInstructionsModal } from "./pinball-instructions-modal";
import { usePinballGame } from "./use-pinball-game";
import { usePinballControls } from "./use-pinball-controls";
import { requestMotionPermission, useDeviceShake } from "./use-device-shake";
import { useFollowerIdentity } from "./use-follower-identity";
import { usePinballScores } from "./use-pinball-scores";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "./pinball.css";

export function PinballExperience() {
  const [storyOpen, setStoryOpen] = useState(() => !loadRestartDeadline());
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const layout = useRef<HTMLDivElement>(null);
  const cabinet = useRef<HTMLDivElement>(null);
  const shake = useRef<Animation | null>(null);
  const { isFollower, username, deviceId, loaded } = useFollowerIdentity();
  const player = isFollower ? username : null;
  const playerId = player ? deviceId : null;
  const game = usePinballGame(playerId, player);
  const scores = usePinballScores(playerId, player);
  const { hud, seconds } = game;
  const canStart = seconds === 0;
  const playing = hud.phase === "playing";
  const paused = hud.phase === "paused";
  const atRest = hud.phase === "ready" || hud.phase === "game-over";
  const gameOver = hud.phase === "game-over";
  const stuck = hud.phase === "stuck";
  const showStory = (storyOpen && seconds === 0) || !player;
  const personalBest = playerId ? Math.max(hud.highScore, scores.top.find((row) => row.deviceId === playerId)?.score ?? 0) : 0;
  const { nudge: nudgeTable } = game;
  const nudge = useCallback((direction: NudgeDirection) => {
    const moved = nudgeTable(direction);
    if (!moved || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return moved;
    const offset = direction === "up" ? "0,-4px" : direction === "left" ? "-4px,0" : "4px,0";
    const recoil = direction === "up" ? "0,2px" : direction === "left" ? "2px,0" : "-2px,0";
    shake.current?.cancel();
    shake.current = cabinet.current?.animate([
      { transform: "translate(0,0)" },
      { transform: `translate(${offset})` },
      { transform: `translate(${recoil})` },
      { transform: "translate(0,0)" },
    ], { duration: 210, easing: "ease-out" }) ?? null;
    return moved;
  }, [nudgeTable]);
  usePinballControls({ ...game, nudge }, !!player && !showStory && !instructionsOpen && !atRest && !stuck);
  useDeviceShake(() => nudge("up"), playing && !showStory && !instructionsOpen && hud.tiltState !== "tilted");

  useEffect(() => {
    const panels = layout.current?.querySelectorAll<HTMLElement>(".pb-panel");
    if (!panels || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("pb-panel-revealed");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -48px" });

    panels.forEach((panel) => observer.observe(panel));
    return () => observer.disconnect();
  }, []);

  const focusCabinet = () => cabinet.current?.focus({ preventScroll: true });
  const start = () => {
    if (!player) return;
    void requestMotionPermission();
    setStoryOpen(false);
    game.startGame();
    focusCabinet();
    const target = window.matchMedia("(min-width: 700px)").matches ? cabinet.current?.closest(".pb-arcade") : cabinet.current;
    target?.scrollIntoView({ block: "start" });
  };
  const show = (dialog: "story" | "instructions") => {
    if (playing) game.togglePause();
    if (dialog === "story") setStoryOpen(true);
    else setInstructionsOpen(true);
  };
  const clock = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");

  return (
    <section className="pb-arcade" aria-label="Playground pinball arcade">
      <h2 className="sr-only">Playground Pinball</h2>
      {player && <p className="pb-greeting">What&apos;s up, {player}?!</p>}
      <div className="pb-layout" ref={layout}>
        <PinballLeftPanel scores={scores.top} loading={scores.loading} offline={scores.offline} username={player}
          deviceId={playerId} identityLoaded={loaded} canStart={canStart && atRest} onStart={start} />
        <div className="pb-cabinet" ref={cabinet} tabIndex={-1}>
          <div className="pb-backglass">
            <span className="pb-machineLabel">Pinball</span>
            <div className="pb-toolbar">
              <button type="button" className="pb-storyButton" aria-pressed={showStory} disabled={atRest || !player || stuck}
                onClick={() => storyOpen ? setStoryOpen(false) : show("story")}><Info size={15} /> Story</button>
              <button type="button" aria-label="How to play" onClick={() => show("instructions")}><CircleHelp size={16} /></button>
              <button type="button" aria-label={hud.muted ? "Unmute" : "Mute"} onClick={() => { game.toggleMute(); focusCabinet(); }}>
                {hud.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button type="button" aria-label={paused ? "Resume" : "Pause"} disabled={!player || (!playing && !paused)} onClick={() => { game.togglePause(); focusCabinet(); }}>
                {paused ? <Play size={16} /> : <Pause size={16} />}
              </button>
            </div>
          </div>
          <div className="pb-status" aria-live="polite">
            {hud.tiltState === "tilted" && !atRest ? <><span>Tilted</span><b>Flippers disabled</b></>
              : hud.tiltState === "warning" && !atRest ? <span>Tilt warning</span>
              : hud.jackpotState === "lit" && !atRest ? <><span>Jackpot lit</span><b>Hit the center bumper</b></>
              : hud.activeRandomEvent && !atRest ? <span>{hud.activeRandomEvent.label}</span>
              : hud.mission && !atRest ? <><span>{hud.mission.title}</span><b>{hud.mission.state === "completed" ? "Complete" : hud.mission.progress}</b></>
              : null}
          </div>
          <div className="pb-playfield">
            <PinballCanvas engine={game.engine} blurred={showStory} />
            {seconds > 0 && !storyOpen && (
              <div className="pb-prompt">
                <div className="pb-badge"><span>Restart cooldown</span><strong role="timer">{clock}</strong><small>Three fresh balls when the timer ends</small></div>
              </div>
            )}
            {gameOver && !showStory && (
              <div className="pb-prompt"><div className="pb-badge" role="status"><span>Game over</span><small>Play Non-Stop from the left panel.</small></div></div>
            )}
            {paused && !storyOpen && !instructionsOpen && (
              <div className="pb-prompt"><button type="button" className="pb-startButton" onClick={() => { game.togglePause(); focusCabinet(); }}><Play size={17} /> Resume</button></div>
            )}
            {hud.phase === "ball-lost" && (
              <div className="pb-prompt"><div className="pb-badge"><span>Ball {hud.ballNumber - 1} drained</span><small>Loading ball {hud.ballNumber}</small></div></div>
            )}
            {showStory && <PinballIntro />}
          </div>
          <PinballTouchControls engine={game.engine} playing={playing && !showStory && !instructionsOpen} plungerReady={hud.plungerReady && !showStory && !instructionsOpen}
            launchStrength={hud.launchStrength}
            onFlipper={game.setFlipper} onCharge={game.chargePlunger} onRelease={game.releasePlunger} onCancel={game.cancelPlunger} />
          <div className="pb-actions">
            <button type="button" disabled={!player || !canStart || atRest || storyOpen} onClick={() => { game.restartGame(); focusCabinet(); }}><RotateCcw size={15} /> Restart</button>
            <button type="button" disabled={!player || !playing || hud.plungerReady || hud.tiltState === "tilted"} onClick={() => { nudge("up"); focusCabinet(); }}><Zap size={15} /> Nudge</button>
          </div>
        </div>
        <PinballRightPanel hud={hud} scores={scores.recent} loading={scores.loading} deviceId={playerId} personalBest={personalBest} />
      </div>
      <PinballInstructionsModal open={instructionsOpen} onOpenChange={(open) => { setInstructionsOpen(open); if (!open) focusCabinet(); }} />
      <Dialog open={stuck && !!player}>
        <DialogContent className="border border-border ring-0 shadow-none sm:max-w-xs" showCloseButton={false}
          onEscapeKeyDown={(event) => event.preventDefault()} onInteractOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => { event.preventDefault(); focusCabinet(); }}>
          <DialogHeader>
            <DialogTitle>Oops! I guess you&apos;re stuck.</DialogTitle>
            <DialogDescription>Start a fresh round with three balls.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="pb-sideStart" disabled={hud.tiltState === "tilted"} onClick={() => nudge("up")}>Try a nudge</button>
            <button type="button" className="pb-sideStart" onClick={game.restartGame}>Restart Now!</button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

