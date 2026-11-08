import { supabase } from "@/lib/supabase";
import { MAX_SCORE } from "./config";

export interface PinballScoreRow {
  deviceId?: string;
  username: string;
  score: number;
  playedAt: string;
}

type NewScore = Pick<PinballScoreRow, "username" | "score"> & {
  deviceId: string;
  levelReached: number;
  ballsUsed: number;
};

type StoredScore = NewScore & PinballScoreRow & { id: string; pending: boolean };
type ScoreRecord = { device_id: string; username: string; score: number; played_at: string };

export const SCORE_STORAGE_KEY = "katalyst-pinball-scores";
export const SCORE_CHANGE_EVENT = "katalyst-pinball-score-change";
export const PINBALL_RESET_EVENT = "katalyst-pinball-scores-reset";
const HIGH_SCORE_KEY = "katalyst-pinball-follower-highscore";
const LAST_ROUND_KEY = "katalyst-pinball-last-round";
const PLAYED_KEY = "katalyst-pinball-played";
const RECENT_PLAYERS = 12;
const RECENT_RUNS = 10;
const COLUMNS = "device_id, username, score, played_at";
let memoryScores: StoredScore[] = [];
let storageAvailable = true;
let syncing: Promise<void> | null = null;

export function scoreUserKey(username: string) {
  return username.trim().toLowerCase();
}

function mapRow(row: ScoreRecord): PinballScoreRow {
  return { deviceId: row.device_id, username: row.username.trim(), score: Math.min(row.score, MAX_SCORE), playedAt: row.played_at };
}

function rankOrder(a: PinballScoreRow, b: PinballScoreRow): number {
  return b.score - a.score || Date.parse(a.playedAt) - Date.parse(b.playedAt) ||
    scoreUserKey(a.username).localeCompare(scoreUserKey(b.username));
}

function personalBests(rows: PinballScoreRow[]): PinballScoreRow[] {
  const best = new Map<string, PinballScoreRow>();
  for (const row of rows) {
    const key = scoreUserKey(row.username);
    if (!key) continue;
    const current = best.get(key);
    if (!current) best.set(key, row);
    else if (rankOrder(row, current) < 0) best.set(key, { ...row, username: current.username });
  }
  return [...best.values()];
}

export function topPlayers(rows: PinballScoreRow[]): PinballScoreRow[] {
  return personalBests(rows).sort(rankOrder);
}

export function recentScores(rows: PinballScoreRow[]): PinballScoreRow[] {
  return personalBests(rows).sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt) || rankOrder(a, b))
    .slice(0, RECENT_PLAYERS);
}

function readLocalScores(): StoredScore[] {
  if (!storageAvailable) return memoryScores;
  try {
    const raw = window.localStorage.getItem(SCORE_STORAGE_KEY);
    const rows = raw ? JSON.parse(raw) : memoryScores;
    return Array.isArray(rows) ? rows : memoryScores;
  } catch {
    return memoryScores;
  }
}

function storeLocalScores(rows: StoredScore[]) {
  memoryScores = rows;
  try { window.localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(rows)); }
  catch { storageAvailable = false; }
  window.dispatchEvent(new Event(SCORE_CHANGE_EVENT));
}

export function getLocalScores(): StoredScore[] {
  return readLocalScores();
}

export function readPinballRound() {
  try {
    return { highScore: Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0,
      lastRound: Number(localStorage.getItem(LAST_ROUND_KEY)) || 0 };
  } catch { return { highScore: 0, lastRound: 0 }; }
}

export function savePinballRound(lastRound: number, highScore: number) {
  try {
    localStorage.setItem(LAST_ROUND_KEY, String(lastRound));
    localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  } catch { /* Play still works with storage disabled. */ }
}

export function markPinballPlayed() {
  try { localStorage.setItem(PLAYED_KEY, "1"); } catch { /* Completed runs still appear in the database. */ }
}

export function hasLocalPinballPlay(deviceId: string) {
  try { return localStorage.getItem(PLAYED_KEY) === "1" || readLocalScores().some((row) => row.deviceId === deviceId); }
  catch { return false; }
}

export function resetPinballScores(deviceId: string) {
  storeLocalScores(readLocalScores().filter((row) => row.deviceId !== deviceId));
  try { [HIGH_SCORE_KEY, LAST_ROUND_KEY, PLAYED_KEY, "katalyst-pinball-highscore"].forEach((key) => localStorage.removeItem(key)); }
  catch { /* The database has already cleared the scores. */ }
  window.dispatchEvent(new CustomEvent(PINBALL_RESET_EVENT, { detail: deviceId }));
}

export async function fetchScoreboards(): Promise<{ top: PinballScoreRow[] }> {
  const client = supabase;
  if (!client) return { top: [] };
  const history: PinballScoreRow[] = [];
  const pageSize = 250;
  for (let offset = 0; ; offset += pageSize) {
    const page = await client.from("pinball_follower_bests").select(COLUMNS)
      .order("score", { ascending: false }).order("played_at").order("device_id").range(offset, offset + pageSize - 1);
    if (page.error?.code === "PGRST205" || page.error?.code === "42P01") break;
    if (page.error) throw page.error;
    history.push(...page.data.map(mapRow));
    if (page.data.length < pageSize) return { top: topPlayers(history) };
  }

  // Existing projects still filter legacy guest runs while the migration is pending.
  const followers = new Map<string, string>();
  for (let offset = 0; ; offset += pageSize) {
    const page = await client.from("followers").select("device_id, username").eq("is_following", true)
      .order("device_id").range(offset, offset + pageSize - 1);
    if (page.error) throw page.error;
    for (const row of page.data) followers.set(row.device_id, row.username);
    if (page.data.length < pageSize) break;
  }
  for (let offset = 0; ; offset += pageSize) {
    const page = await client.from("pinball_scores").select(COLUMNS)
      .gt("score", 0).order("played_at").order("id").range(offset, offset + pageSize - 1);
    if (page.error) throw page.error;
    for (const row of page.data) {
      const username = followers.get(row.device_id);
      if (username && scoreUserKey(username) === scoreUserKey(row.username)) history.push(mapRow({ ...row, username }));
    }
    if (page.data.length < pageSize) break;
  }
  return { top: topPlayers(history) };
}

/** This device's own run history — every completed round it has played, newest first. Unlike
 * `topPlayers`/`recentScores` (which collapse to one row per player), this never dedupes: the
 * same player legitimately shows up once per round. */
export async function fetchPersonalHistory(deviceId: string): Promise<PinballScoreRow[]> {
  const client = supabase;
  if (!client || !deviceId) return [];
  const { data, error } = await client.from("pinball_scores").select(COLUMNS)
    .eq("device_id", deviceId).gt("score", 0)
    .order("played_at", { ascending: false }).limit(RECENT_RUNS);
  if (error?.code === "PGRST205" || error?.code === "42P01") return [];
  if (error) throw error;
  return data.map(mapRow);
}

export function recordScore(score: NewScore) {
  const username = score.username.trim();
  if (!username || !Number.isFinite(score.score)) return;
  const points = Math.max(0, Math.min(MAX_SCORE, Math.round(score.score)));
  const rows = readLocalScores();
  const previous = rows.find((row) => row.deviceId === score.deviceId && scoreUserKey(row.username) === scoreUserKey(username) && row.score >= points);
  if (previous) {
    if (previous.pending) void syncScores();
    return;
  }
  const row = { ...score, username, score: points, id: crypto.randomUUID(), playedAt: new Date().toISOString(), pending: Boolean(supabase) };
  storeLocalScores([row, ...rows]);
  void syncScores();
}

export function syncScores(): Promise<void> {
  const client = supabase;
  if (!client) return Promise.resolve();
  if (syncing) return syncing;
  syncing = (async () => {
    let pending = readLocalScores().find((row) => row.pending);
    while (pending) {
      const { id, deviceId, username, score, levelReached, ballsUsed, playedAt } = pending;
      const response = await fetch("/api/pinball/scores", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, deviceId, username, score: Math.min(score, MAX_SCORE), levelReached, ballsUsed, playedAt }),
      });
      if (!response.ok && response.status !== 403 && response.status !== 400) break;
      const rows = response.ok
        ? readLocalScores().map((row) => row.id === id ? { ...row, pending: false } : row)
        : readLocalScores().filter((row) => row.id !== id);
      storeLocalScores(rows);
      pending = rows.find((row) => row.pending);
    }
  })().catch(() => { /* Pending runs are retried on return to the arcade. */ }).finally(() => { syncing = null; });
  return syncing;
}

