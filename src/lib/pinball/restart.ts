import { COOLDOWN_MS, EARLY_RESTART_MS } from "./config";

const RESTART_KEY = "katalyst-pinball-restart-until";

export function restartDeadline(startedAt: number, now: number): number {
  return now - startedAt < EARLY_RESTART_MS ? now + COOLDOWN_MS : 0;
}

export function loadRestartDeadline(): number {
  try {
    const until = Number(window.localStorage.getItem(RESTART_KEY));
    return Number.isFinite(until) && until > Date.now() ? until : 0;
  } catch {
    return 0;
  }
}

export function saveRestartDeadline(until: number) {
  try { window.localStorage.setItem(RESTART_KEY, String(until)); }
  catch { /* The cooldown still runs in this tab when browser storage is blocked. */ }
}
