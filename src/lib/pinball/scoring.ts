import { BASE_POINTS, COMBO_WINDOW_MS, MAX_MULTIPLIER, MAX_SCORE, comboMultiplierFor, type ScoreEvent } from "./config";

export interface ScoringState {
  score: number;
  comboHits: number;
  lastHitAt: number;
  achievementMultiplier: number;
  multiplierExpiresAt: number | null;
  /** Cooldown per physics body id, so one sustained contact can't fire the same event repeatedly. */
  cooldowns: Map<number, number>;
}

export function createScoringState(): ScoringState {
  return {
    score: 0,
    comboHits: 0,
    lastHitAt: 0,
    achievementMultiplier: 1,
    multiplierExpiresAt: null,
    cooldowns: new Map(),
  };
}

export interface ScoreAward {
  event: ScoreEvent;
  basePoints: number;
  comboMultiplier: number;
  achievementMultiplier: number;
  finalPoints: number;
  comboHits: number;
}

const COLLISION_COOLDOWN_MS = 180;

/** Returns false (and awards nothing) if this body scored too recently — prevents farming a single sustained contact. */
export function canScore(state: ScoringState, bodyId: number, now: number): boolean {
  const last = state.cooldowns.get(bodyId);
  return last === undefined || now - last >= COLLISION_COOLDOWN_MS;
}

export function awardScore(
  state: ScoringState,
  event: ScoreEvent,
  bodyId: number,
  now: number,
  difficultyFactor = 1,
): ScoreAward | null {
  if (!canScore(state, bodyId, now)) return null;
  state.cooldowns.set(bodyId, now);

  if (now - state.lastHitAt > COMBO_WINDOW_MS) state.comboHits = 0;
  state.comboHits += 1;
  state.lastHitAt = now;

  if (state.multiplierExpiresAt !== null && now > state.multiplierExpiresAt) {
    state.achievementMultiplier = 1;
    state.multiplierExpiresAt = null;
  }

  const basePoints = BASE_POINTS[event];
  const comboMultiplier = comboMultiplierFor(state.comboHits);
  const achievementMultiplier = Math.min(state.achievementMultiplier, MAX_MULTIPLIER);
  const finalPoints = creditPoints(state, basePoints * comboMultiplier * achievementMultiplier * difficultyFactor);

  return { event, basePoints, comboMultiplier, achievementMultiplier, finalPoints, comboHits: state.comboHits };
}

export function creditPoints(state: ScoringState, points: number): number {
  const awarded = Math.max(0, Math.min(MAX_SCORE - state.score, Math.round(points)));
  state.score += awarded;
  return awarded;
}

export function resetCombo(state: ScoringState) {
  state.comboHits = 0;
}

export function grantAchievementMultiplier(state: ScoringState, multiplier: number, durationMs: number, now: number) {
  state.achievementMultiplier = Math.min(MAX_MULTIPLIER, Math.max(state.achievementMultiplier, multiplier));
  state.multiplierExpiresAt = now + durationMs;
}
