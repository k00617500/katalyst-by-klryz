import { pickWeighted, type RandomSource } from "./rng";

export type RandomEventId = "multiball" | "double-score" | "speed-rush" | "target-rush" | "bonus-ball";

export interface RandomEventDef {
  id: RandomEventId;
  label: string;
  /** 0 for an instant, one-shot effect (e.g. multiball) with no ongoing window to expire. */
  durationMs: number;
  weight: number;
}

export const RANDOM_EVENTS: RandomEventDef[] = [
  { id: "multiball", label: "MULTIBALL", durationMs: 0, weight: 1 },
  { id: "double-score", label: "DOUBLE SCORE", durationMs: 15000, weight: 3 },
  { id: "speed-rush", label: "SPEED RUSH", durationMs: 12000, weight: 2 },
  { id: "target-rush", label: "TARGET RUSH", durationMs: 10000, weight: 2 },
  { id: "bonus-ball", label: "BONUS BALL", durationMs: 0, weight: 1 },
];

export interface RandomEventState {
  id: RandomEventId;
  expiresAt: number;
}

/** Decides WHEN and WHICH random event fires — applying each event's actual gameplay effect
 * (and reverting it) is the engine's job, since that's where the physics/scoring state lives.
 * Only one event is "announced" at a time; its own duration (if any) is tracked here so the UI
 * can show a countdown, in sync with whatever the engine is doing for that same duration. */
export class RandomEventManager {
  active: RandomEventState | null = null;
  private lastTriggerAt = 0;

  constructor(
    private rng: RandomSource,
    private minIntervalMs = 14000,
    private chancePerCheck = 0.12,
    private onTrigger?: (id: RandomEventId) => void,
    private onExpire?: (id: RandomEventId) => void,
  ) {}

  /** Call once per physics step while playing. `eligible` lets the caller rule out events that
   * can't currently apply (e.g. no multiball while one is already in progress). */
  maybeTrigger(now: number, eligible: RandomEventId[]): RandomEventId | null {
    if (this.active) return null;
    if (now - this.lastTriggerAt < this.minIntervalMs) return null;
    if (eligible.length === 0) return null;
    if (this.rng() > this.chancePerCheck) return null;

    const candidates = RANDOM_EVENTS.filter((event) => eligible.includes(event.id));
    if (candidates.length === 0) return null;
    const picked = pickWeighted(this.rng, candidates.map((event) => ({ value: event, weight: event.weight })));

    this.lastTriggerAt = now;
    if (picked.durationMs > 0) this.active = { id: picked.id, expiresAt: now + picked.durationMs };
    this.onTrigger?.(picked.id);
    return picked.id;
  }

  tick(now: number) {
    if (this.active && now >= this.active.expiresAt) {
      const id = this.active.id;
      this.active = null;
      this.onExpire?.(id);
    }
  }

  reset() {
    this.active = null;
    this.lastTriggerAt = 0;
  }
}
