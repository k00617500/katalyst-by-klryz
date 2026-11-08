"use client";

import { Trophy } from "lucide-react";
import type { PinballScoreRow } from "@/lib/pinball/leaderboard";
import { PinballScoreList } from "./pinball-score-list";
import { openFollowersModal } from "@/components/layout/followers-widget";

export function PinballLeftPanel({
  scores,
  loading,
  offline,
  username,
  deviceId,
  identityLoaded,
  onStart,
  canStart,
  hasPlayed,
}: {
  scores: PinballScoreRow[];
  loading: boolean;
  offline: boolean;
  username: string | null;
  deviceId: string | null;
  identityLoaded: boolean;
  onStart: () => void;
  canStart: boolean;
  hasPlayed: boolean;
}) {
  return (
    <aside className="pb-panel pb-leaderboard">
      <div>
        <h3><Trophy size={17} /> Leaderboard</h3>
        {offline && <p className="pb-note">Shared scores are offline. Showing saved runs.</p>}
        {scores.length === 0 && <p className="pb-empty">{loading ? "Loading scores…" : "No scores yet. Set the first record."}</p>}
        <PinballScoreList scores={scores} deviceId={deviceId} label="Player rankings" ranked />
      </div>

      <div className="pb-player">
        <span>Playing as</span>
        <strong>{username ?? "Guest"}</strong>
        <button type="button" className="pb-sideStart" onClick={username ? onStart : openFollowersModal}
          disabled={!identityLoaded || (!!username && !canStart)}>
          {!identityLoaded ? "Checking follower status…" : username ? (hasPlayed ? "Play Again!" : "Start Game!") : "Follow Me!"}
        </button>
      </div>
    </aside>
  );
}
