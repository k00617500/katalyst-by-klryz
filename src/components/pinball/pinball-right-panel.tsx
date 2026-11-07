"use client";

import { Gauge, Keyboard, Radio } from "lucide-react";
import { STARTING_BALLS } from "@/lib/pinball/config";
import type { PinballScoreRow } from "@/lib/pinball/leaderboard";
import { PinballScoreList } from "./pinball-score-list";
import type { PinballHudState } from "./use-pinball-game";

const controls = [
  [["A", "←"], "Left flipper"],
  [["D", "→"], "Right flipper"],
  [["Space", "S", "↓"], "Charge & launch"],
  [["Z", "C", "X"], "Nudge"],
] as const;

export function PinballRightPanel({ hud, scores, loading, deviceId, personalBest }: {
  hud: PinballHudState;
  scores: PinballScoreRow[];
  loading: boolean;
  deviceId: string | null;
  personalBest: number;
}) {
  const activeBall = hud.phase === "playing" || hud.phase === "paused" ? hud.ballNumber : 0;
  return (
    <aside className="pb-panel pb-scoreboard">
      <section className="pb-run" aria-label="Run scores">
        <h3><Gauge size={17} /> Run scores
          <span className="pb-panelTag">{hud.phase === "game-over" ? "Game over" : `Ball ${hud.ballNumber} / ${STARTING_BALLS}`}</span>
        </h3>
        <dl className="pb-runTotals">
          <div className="pb-currentScore">
            <dt>Last Round</dt>
            <dd>{(deviceId ? hud.lastRound : 0).toLocaleString()}</dd>
          </div>
          <div><dt>Personal Best</dt><dd>{personalBest.toLocaleString()}</dd></div>
        </dl>
        <dl className="pb-ballScores">
          {hud.ballScores.map((score, index) => (
            <div key={index} data-active={index + 1 === activeBall}>
              <dt>Ball {index + 1}</dt><dd>{score.toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="pb-live">
        <h3><Radio size={17} /> Live Scoreboard</h3>
        {scores.length === 0 && <p className="pb-empty">{loading ? "Loading scores…" : "Waiting for completed runs."}</p>}
        <PinballScoreList scores={scores} deviceId={deviceId} label="Recently updated personal bests" />
      </div>

      <div className="pb-keys">
        <h3><Keyboard size={17} /> Controls</h3>
        {controls.map(([keys, action]) => (
          <div key={action} className="flex items-center justify-between gap-2 text-xs">
            <span className="pb-keyGroup">{keys.map((key) => <kbd key={key}>{key}</kbd>)}</span>
            <span className="text-right text-muted-foreground">{action}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

