// Playfield is a portrait arcade cabinet, in physics-world units (not pixels).
export const TABLE_WIDTH = 480;
export const TABLE_HEIGHT = 800;
export const WALL_THICKNESS = 20;
export const BALL_RADIUS = 10;
export const DRAIN_Y = TABLE_HEIGHT - 10;

export const STARTING_BALLS = 3;
export const COOLDOWN_MS = 30_000;
export const EARLY_RESTART_MS = 60_000;
export const MAX_SCORE = 100_000;
export const LAUNCH_X = 450;
export const LAUNCH_Y = 731;
export const LANE_DIVIDER_X = 425;
export const LANE_DIVIDER_TOP = 184;
export const MAX_MULTIPLIER = 5;
export const COMBO_WINDOW_MS = 5000;

export type DifficultyTier = "rookie" | "bumper-masters" | "legend";

export interface LevelConfig {
  level: 1 | 2 | 3 | 4 | 5;
  tier: DifficultyTier;
  tierName: string;
  /** Multiplies bumper/slingshot restitution — higher = livelier, faster-feeling table. */
  liveliness: number;
  /** Minimum cumulative score to reach this level. */
  unlockScore: number;
  /** Target zone size multiplier — smaller is harder to hit. */
  targetSize: number;
}

export const LEVELS: LevelConfig[] = [
  { level: 1, tier: "rookie", tierName: "Rookie Rollers", liveliness: 0.85, unlockScore: 0, targetSize: 1.15 },
  { level: 2, tier: "rookie", tierName: "Rookie Rollers", liveliness: 0.92, unlockScore: 2200, targetSize: 1.1 },
  { level: 3, tier: "bumper-masters", tierName: "Bumper Masters", liveliness: 1, unlockScore: 5200, targetSize: 1 },
  { level: 4, tier: "bumper-masters", tierName: "Bumper Masters", liveliness: 1.08, unlockScore: 16000, targetSize: 0.92 },
  { level: 5, tier: "legend", tierName: "Pinball Legend", liveliness: 1.18, unlockScore: 28000, targetSize: 0.8 },
];

export function levelForScore(score: number): LevelConfig {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (score >= level.unlockScore) current = level;
  }
  return current;
}

// Base points per gameplay event. Configurable in one place, per the scoring engine design.
export const BASE_POINTS = {
  bumper: 100,
  bumperConsecutive: 150,
  slingshot: 35,
  spinner: 50,
  standUpTarget: 250,
  dropTarget: 500,
  laneRollover: 50,
  rampShot: 155,
  skillShot: 300,
  targetSequence: 2500,
  jackpot: 10000,
  superJackpot: 25000,
} as const;

export type ScoreEvent = keyof typeof BASE_POINTS;

// Consecutive qualifying hits within COMBO_WINDOW_MS -> combo multiplier.
export const COMBO_TIERS: Array<{ minHits: number; multiplier: number }> = [
  { minHits: 1, multiplier: 1 },
  { minHits: 3, multiplier: 1.25 },
  { minHits: 5, multiplier: 1.5 },
  { minHits: 8, multiplier: 2 },
  { minHits: 11, multiplier: 2.5 },
];

export function comboMultiplierFor(hitCount: number): number {
  let multiplier = 1;
  for (const tier of COMBO_TIERS) {
    if (hitCount >= tier.minHits) multiplier = tier.multiplier;
  }
  return multiplier;
}

export const FLIPPER = {
  width: 90,
  height: 18,
  restAngleDeg: 28,
  activeAngleDeg: -32,
  angularSpeed: 0.31,
};

export const BALL_DENSITY = 0.04;
export const BALL_MASS = BALL_DENSITY * Math.PI * BALL_RADIUS * BALL_RADIUS;

// A real spring-plunger model (Hooke's law), not an arbitrary launch speed. Tuned so a full
// charge lands near the engine's tunneling-safety speed cap.
export const PLUNGER = {
  /** Spring stiffness (k). */
  springStiffness: 5,
  /** Maximum plunger pull-back distance in px (x_max). */
  maxDisplacement: 60,
  /** Launch energy efficiency (η) — some spring energy is always lost to friction/heat. */
  efficiency: 0.9,
  /** The tap strength reliably clears the shooter lane. */
  minStrength: 0.7,
  maxChargeMs: 1100,
};

export function plungerStrength(heldMs: number): number {
  const progress = Math.max(0, Math.min(1, heldMs / PLUNGER.maxChargeMs));
  return PLUNGER.minStrength + (1 - PLUNGER.minStrength) * progress;
}

/** v = η·x·√(k/m) — Hooke's-law spring energy converted to launch velocity. */
export function launchVelocityForStrength(strength: number): number {
  const clamped = Math.min(1, Math.max(0, strength));
  const displacement = clamped * PLUNGER.maxDisplacement;
  return PLUNGER.efficiency * displacement * Math.sqrt(PLUNGER.springStiffness / BALL_MASS);
}

// Nudging applies an instantaneous impulse (Δv = J/m) to every ball currently in play, rather
// than a cosmetic screen shake.
export const NUDGE_IMPULSE_J = 30;
export const GRAVITY = 1.05;
export const MAX_BALL_SPEED = 39;
export const BUMPER_KICK = 9;
export const SLING_KICK = 7;

export const MULTIBALL_EXTRA_BALLS = 2;

export const RANDOM_EVENT_MIN_INTERVAL_MS = 14000;
export const RANDOM_EVENT_CHANCE_PER_STEP = 0.00125;
