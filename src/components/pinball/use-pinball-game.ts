"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PinballEngine, type GamePhase, type NudgeDirection } from "@/lib/pinball/engine";
import { PinballAudio } from "@/lib/pinball/audio";
import { levelForScore, STARTING_BALLS, type LevelConfig } from "@/lib/pinball/config";
import { loadRestartDeadline, restartDeadline, saveRestartDeadline } from "@/lib/pinball/restart";
import type { ScoreAward } from "@/lib/pinball/scoring";
import type { MissionDef, MissionManagerState } from "@/lib/pinball/missions";
import type { JackpotState } from "@/lib/pinball/jackpot";
import type { TiltState } from "@/lib/pinball/tilt";
import type { RandomEventId } from "@/lib/pinball/random-events";
import { markPinballPlayed, PINBALL_RESET_EVENT, readPinballRound, recordScore, savePinballRound } from "@/lib/pinball/leaderboard";

export interface PinballHudState {
  phase: GamePhase;
  score: number;
  highScore: number;
  lastRound: number;
  ballsRemaining: number;
  ballNumber: number;
  comboHits: number;
  comboMultiplier: number;
  level: LevelConfig;
  targetProgress: { completed: number; total: number };
  lastAward: ScoreAward | null;
  muted: boolean;
  submitted: boolean;
  mission: { title: string; description: string; progress: string; state: MissionManagerState } | null;
  jackpotState: JackpotState;
  tiltState: TiltState;
  activeRandomEvent: { id: RandomEventId; label: string } | null;
  ballScores: number[];
  plungerReady: boolean;
  launchStrength: number;
}

const RANDOM_EVENT_LABELS: Record<RandomEventId, string> = {
  multiball: "MULTIBALL",
  "double-score": "DOUBLE SCORE",
  "speed-rush": "SPEED RUSH",
  "target-rush": "TARGET RUSH",
  "bonus-ball": "BONUS BALL",
};

function missionHud(mission: MissionDef, state: MissionManagerState, progress: string) {
  return { title: mission.title, description: mission.description, progress, state };
}

export function usePinballGame(deviceId: string | null, username: string | null) {
  // The current run's progress, read/written only from engine event callbacks and handlers
  // (never during render) — a ref, not state, since these values don't drive their own re-render.
  const runRef = useRef({ score: 0, level: levelForScore(0), ballsUsed: 0, saved: false });
  const startedAt = useRef(0);
  const [cooldownUntil, setCooldownUntil] = useState(loadRestartDeadline);
  const cooldown = useRef(cooldownUntil);
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));

  const [hud, setHud] = useState<PinballHudState>(() => ({
    phase: "ready",
    score: 0,
    ...readPinballRound(),
    ballsRemaining: STARTING_BALLS,
    ballNumber: 1,
    comboHits: 0,
    comboMultiplier: 1,
    level: levelForScore(0),
    targetProgress: { completed: 0, total: 5 },
    lastAward: null,
    muted: false,
    submitted: false,
    mission: null,
    jackpotState: "idle",
    tiltState: "normal",
    activeRandomEvent: null,
    ballScores: Array<number>(STARTING_BALLS).fill(0),
    plungerReady: false,
    launchStrength: 0,
  }));

  const [audio] = useState(() => new PinballAudio());
  const [engine] = useState(() => new PinballEngine());

  const finishRun = useCallback(() => {
    const run = runRef.current;
    const { highScore: previousBest, lastRound } = readPinballRound();
    if (!deviceId || !username || run.saved || run.ballsUsed === 0) {
      return { highScore: previousBest, lastRound, newBest: false };
    }
    const highScore = Math.max(previousBest, run.score);
    savePinballRound(run.score, highScore);
    run.saved = true;
    recordScore({ deviceId, username, score: run.score, levelReached: run.level.level, ballsUsed: run.ballsUsed });
    return { highScore, lastRound: run.score, newBest: highScore > previousBest };
  }, [deviceId, username]);

  const finishRunRef = useRef(finishRun);
  useEffect(() => { finishRunRef.current = finishRun; }, [finishRun]);

  useEffect(() => {
    if (!cooldownUntil) return;
    const refresh = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) {
        cooldown.current = 0;
        saveRestartDeadline(0);
        setCooldownUntil(0);
        audio.play("ready");
      }
    };
    const timer = window.setInterval(refresh, 200);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [cooldownUntil, audio]);

  useEffect(() => {
    engine.populate();
    engine.setEvents({
      onScore: (award, totalScore) => {
        const run = runRef.current;
        run.score = totalScore;
        setHud((prev) => ({ ...prev, score: totalScore, lastAward: award, comboHits: award.comboHits, comboMultiplier: award.comboMultiplier,
          ballScores: prev.ballScores.map((points, index) => index === prev.ballNumber - 1 ? points + award.finalPoints : points),
        }));
        const sound =
          award.event === "bumper" || award.event === "bumperConsecutive" ? "bumper"
          : award.event === "slingshot" ? "sling"
          : award.event === "laneRollover" || award.event === "skillShot" ? "rollover"
          : award.event === "rampShot" ? "ramp"
          : award.event === "jackpot" || award.event === "superJackpot" ? "jackpotCollected"
          : "target";
        audio.play(sound, award.comboHits);
        if (award.comboHits > 0 && award.comboHits % 3 === 0) audio.play("combo", award.comboHits);
      },
      onPhaseChange: (phase) => {
        if (phase === "game-over") {
          const { highScore, lastRound, newBest } = finishRunRef.current();
          audio.play(newBest ? "highScore" : "gameOver");
          setHud((prev) => ({ ...prev, phase, highScore, lastRound, submitted: runRef.current.saved, plungerReady: false }));
          return;
        }
        const plungerReady = engine.isPlungerReady();
        setHud((prev) => ({ ...prev, phase, plungerReady, launchStrength: plungerReady ? 0 : prev.launchStrength }));
      },
      onBallsChange: (ballsRemaining, ballNumber) => {
        setHud((prev) => ({ ...prev, ballsRemaining, ballNumber }));
        if (ballsRemaining < STARTING_BALLS) audio.play("drain");
      },
      onLaunch: (strength) => {
        runRef.current.ballsUsed += 1;
        markPinballPlayed();
        setHud((prev) => ({ ...prev, plungerReady: false, launchStrength: strength }));
        audio.play("launch", strength);
      },
      onImpact: (speed) => audio.play("impact", speed),
      onComboExpired: () => setHud((prev) => ({ ...prev, comboHits: 0, comboMultiplier: 1 })),
      onLevelChange: (level) => {
        runRef.current.level = level;
        setHud((prev) => ({ ...prev, level }));
        if (level.level > 1) audio.play("levelUp");
      },
      onTargetSequence: (completed, total) => {
        setHud((prev) => ({ ...prev, targetProgress: { completed: completed === total ? 0 : completed, total } }));
      },
      onMissionChange: (mission, state) => {
        setHud((prev) => ({ ...prev, mission: missionHud(mission, state, engine.missions.currentProgressLabel()) }));
      },
      onMissionComplete: (mission, totalScore) => {
        const reward = totalScore - runRef.current.score;
        runRef.current.score = totalScore;
        setHud((prev) => ({ ...prev, score: totalScore, mission: missionHud(mission, "completed", engine.missions.currentProgressLabel()),
          ballScores: prev.ballScores.map((points, index) => index === prev.ballNumber - 1 ? points + reward : points),
        }));
        audio.play("missionComplete");
      },
      onJackpotChange: (state) => {
        setHud((prev) => ({ ...prev, jackpotState: state }));
        if (state === "lit") audio.play("jackpotLit");
      },
      onTiltChange: (state) => {
        setHud((prev) => ({ ...prev, tiltState: state }));
        if (state !== "normal") audio.play(state === "tilted" ? "tilted" : "tiltWarning");
      },
      onRandomEvent: (id, phase) => {
        setHud((prev) => ({ ...prev, activeRandomEvent: phase === "start" ? { id, label: RANDOM_EVENT_LABELS[id] } : null }));
        if (phase === "start") audio.play("randomEvent");
      },
    });
    return () => { engine.destroy(); audio.dispose(); };
  }, [engine, audio]);

  const clearRun = useCallback(({ highScore, lastRound }: { highScore: number; lastRound: number }) => {
    runRef.current = { score: 0, level: levelForScore(0), ballsUsed: 0, saved: false };
    setHud((prev) => ({
      ...prev, score: 0, highScore, lastRound, comboHits: 0, comboMultiplier: 1, lastAward: null, launchStrength: 0,
      ballScores: Array<number>(STARTING_BALLS).fill(0),
      submitted: false, level: levelForScore(0), targetProgress: { completed: 0, total: 5 },
      jackpotState: "idle", tiltState: "normal", activeRandomEvent: null, mission: null,
    }));
  }, []);

  useEffect(() => {
    const reset = () => {
      clearRun({ highScore: 0, lastRound: 0 });
      cooldown.current = 0;
      saveRestartDeadline(0);
      setCooldownUntil(0);
      setSeconds(0);
      engine.resetGame(STARTING_BALLS);
    };
    window.addEventListener(PINBALL_RESET_EVENT, reset);
    return () => window.removeEventListener(PINBALL_RESET_EVENT, reset);
  }, [engine, clearRun]);

  useEffect(() => {
    if ((deviceId && username) || engine.getPhase() === "ready") return;
    // A guest must never be left mid-game — if they unfollow (or were never a follower), the
    // run is wiped. Deferred a microtask so the state update isn't synchronous within the
    // effect body itself.
    queueMicrotask(() => {
      clearRun({ highScore: 0, lastRound: 0 });
      engine.resetGame(STARTING_BALLS);
    });
  }, [engine, clearRun, deviceId, username]);

  const startGame = useCallback(() => {
    if (!deviceId || !username) return;
    const phase = engine.getPhase();
    if (phase !== "ready" && phase !== "game-over") return;
    const now = Date.now();
    if (Math.max(cooldown.current, loadRestartDeadline()) > now) return;
    startedAt.current = now;
    audio.resume();
    audio.play("start");
    clearRun(readPinballRound());
    engine.startGame();
  }, [engine, audio, clearRun, deviceId, username]);

  const restartGame = useCallback(() => {
    if (!deviceId || !username) return;
    const phase = engine.getPhase();
    if (phase !== "playing" && phase !== "paused" && phase !== "ball-lost" && phase !== "stuck") return;
    const now = Date.now();
    const until = phase === "stuck" ? 0 : restartDeadline(startedAt.current, now);
    clearRun(phase === "stuck" ? readPinballRound() : finishRun());
    if (!until) {
      startedAt.current = now;
      audio.play("start");
      engine.startGame();
      return;
    }
    cooldown.current = until;
    saveRestartDeadline(until);
    setCooldownUntil(until);
    setSeconds(Math.ceil((until - now) / 1000));
    engine.resetGame(STARTING_BALLS);
    audio.play("restart");
  }, [engine, audio, finishRun, clearRun, deviceId, username]);

  const setFlipper = useCallback((side: "left" | "right", held: boolean) => {
    engine.setFlipper(side, held);
    if (held) audio.play("flipper");
  }, [engine, audio]);

  const chargePlunger = useCallback(() => {
    engine.chargePlunger();
    audio.resume();
  }, [engine, audio]);

  const releasePlunger = useCallback(() => engine.releasePlunger(), [engine]);
  const cancelPlunger = useCallback(() => engine.cancelPlunger(), [engine]);
  const cancelInput = useCallback(() => { engine.cancelPlunger(); engine.releaseFlippers(); }, [engine]);

  const togglePause = useCallback(() => engine.togglePause(), [engine]);

  const nudge = useCallback((direction: NudgeDirection) => {
    if (!deviceId || !username || !engine.nudge(direction)) return false;
    audio.play("impact", 2);
    return true;
  }, [engine, audio, deviceId, username]);

  const toggleMute = useCallback(() => {
    const muted = !audio.muted;
    audio.setMuted(muted);
    if (!muted) audio.resume();
    setHud((prev) => ({ ...prev, muted }));
  }, [audio]);

  return { engine, hud, seconds, startGame, restartGame, setFlipper, chargePlunger, releasePlunger, cancelPlunger, cancelInput, togglePause, toggleMute, nudge };
}
