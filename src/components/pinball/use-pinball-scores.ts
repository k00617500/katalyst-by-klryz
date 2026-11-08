"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  fetchPersonalHistory, fetchScoreboards, getLocalScores, PINBALL_RESET_EVENT, SCORE_CHANGE_EVENT,
  SCORE_STORAGE_KEY, syncScores, topPlayers, scoreUserKey, type PinballScoreRow,
} from "@/lib/pinball/leaderboard";

const RECENT_RUNS = 10;

export function usePinballScores(deviceId: string | null, username: string | null) {
  const channelId = useId();
  const [local, setLocal] = useState(getLocalScores);
  const [top, setTop] = useState<PinballScoreRow[]>([]);
  // This device's own run history (not everyone's recent bests — that's redundant with the
  // leaderboard above it, since both would just be "who's near the top" reshuffled).
  const [history, setHistory] = useState<PinballScoreRow[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [offline, setOffline] = useState(!supabase);

  useEffect(() => {
    let active = true;
    let request = 0;
    const refresh = async () => {
      if (!active) return;
      const current = ++request;
      setLocal(getLocalScores());
      try {
        const [board, personal] = await Promise.all([
          fetchScoreboards(),
          deviceId ? fetchPersonalHistory(deviceId) : Promise.resolve([]),
        ]);
        if (!active || current !== request) return;
        setTop(board.top);
        setHistory(personal);
        setOffline(!supabase);
      } catch {
        if (!active || current !== request) return;
        setOffline(true);
      }
      setLoading(false);
    };
    const retry = () => { void syncScores().then(refresh); };
    const onStorage = (event: StorageEvent) => { if (event.key === SCORE_STORAGE_KEY) void refresh(); };
    const onReset = (event: Event) => {
      const removedDevice = (event as CustomEvent<string>).detail;
      setTop((rows) => rows.filter((row) => row.deviceId !== removedDevice));
      setHistory((rows) => rows.filter((row) => row.deviceId !== removedDevice));
      void refresh();
    };
    void refresh();
    void syncScores();
    window.addEventListener(SCORE_CHANGE_EVENT, refresh);
    window.addEventListener(PINBALL_RESET_EVENT, onReset);
    window.addEventListener("storage", onStorage);
    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    const poll = window.setInterval(() => { if (!document.hidden) retry(); }, 15_000);
    const channel = supabase?.channel(`pinball-scores-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pinball_personal_bests" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "pinball_scores" }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "followers" }, refresh)
      .subscribe();
    return () => {
      active = false;
      window.removeEventListener(SCORE_CHANGE_EVENT, refresh);
      window.removeEventListener(PINBALL_RESET_EVENT, onReset);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
      window.clearInterval(poll);
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [channelId, deviceId]);

  const visibleLocal = useMemo(() => deviceId && username ? local.filter((row) =>
    row.deviceId === deviceId && scoreUserKey(row.username) === scoreUserKey(username) && row.score > 0 && (offline || row.pending)
  ) : [], [local, offline, deviceId, username]);
  const ranked = useMemo(() => topPlayers([...top, ...visibleLocal]), [top, visibleLocal]);
  const runs = useMemo(() =>
    [...history, ...visibleLocal].sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt)).slice(0, RECENT_RUNS),
    [history, visibleLocal]);
  return { top: ranked, recent: runs, loading, offline };
}
