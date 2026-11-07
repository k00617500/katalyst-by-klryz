export interface MissionProgress {
  bumpersLit: Set<number>;
  rampShots: number;
  targetSequencesCompleted: number;
  maxCombo: number;
}

export function freshProgress(): MissionProgress {
  return { bumpersLit: new Set(), rampShots: 0, targetSequencesCompleted: 0, maxCombo: 0 };
}

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  reward: number;
  isComplete: (progress: MissionProgress, bumperCount: number) => boolean;
  progressLabel: (progress: MissionProgress, bumperCount: number) => string;
}

export const MISSIONS: MissionDef[] = [
  {
    id: "light-the-bumpers",
    title: "MISSION 01 — LIGHT THE BUMPERS",
    description: "Hit every bumper at least once.",
    reward: 2500,
    isComplete: (p, bumperCount) => p.bumpersLit.size >= bumperCount,
    progressLabel: (p, bumperCount) => `${p.bumpersLit.size}/${bumperCount} bumpers`,
  },
  {
    id: "ramp-runner",
    title: "MISSION 02 — RAMP RUNNER",
    description: "Complete three ramp shots.",
    reward: 5000,
    isComplete: (p) => p.rampShots >= 3,
    progressLabel: (p) => `${Math.min(p.rampShots, 3)}/3 ramp shots`,
  },
  {
    id: "target-lock",
    title: "MISSION 03 — TARGET LOCK",
    description: "Light all five stand-up targets.",
    reward: 7500,
    isComplete: (p) => p.targetSequencesCompleted >= 1,
    progressLabel: (p) => (p.targetSequencesCompleted >= 1 ? "targets locked" : "in progress"),
  },
  {
    id: "combo-breaker",
    title: "MISSION 04 — COMBO BREAKER",
    description: "Reach an eight-hit combo.",
    reward: 10000,
    isComplete: (p) => p.maxCombo >= 8,
    progressLabel: (p) => `best combo ×${Math.min(p.maxCombo, 8)} / ×8`,
  },
  {
    id: "jackpot-hunt",
    title: "MISSION 05 — JACKPOT HUNT",
    description: "Complete the target sequence a second time to light the jackpot.",
    reward: 10000,
    isComplete: (p) => p.targetSequencesCompleted >= 2,
    progressLabel: (p) => `${Math.min(p.targetSequencesCompleted, 2)}/2 sequences`,
  },
];

export type MissionManagerState = "idle" | "active" | "completed";

/** Exactly one mission is active at a time, cycling through MISSIONS in order. Valid
 * transitions: idle -> active (start), active -> completed (progress meets isComplete), and
 * completed -> active (advance, moving to the next mission with fresh progress). Nothing updates
 * progress unless the state is "active" — a completed or idle mission can't keep racking up
 * events. */
export class MissionManager {
  state: MissionManagerState = "idle";
  index = 0;
  progress: MissionProgress = freshProgress();

  constructor(
    private bumperCount: number,
    private onChange?: (mission: MissionDef, state: MissionManagerState) => void,
    private onComplete?: (mission: MissionDef) => void,
  ) {}

  current(): MissionDef {
    return MISSIONS[this.index % MISSIONS.length];
  }

  currentProgressLabel(): string {
    return this.current().progressLabel(this.progress, this.bumperCount);
  }

  start() {
    if (this.state !== "idle") return;
    this.state = "active";
    this.onChange?.(this.current(), this.state);
  }

  advance(): boolean {
    if (this.state !== "completed" && this.state !== "idle") return false;
    this.index = (this.index + 1) % MISSIONS.length;
    this.progress = freshProgress();
    this.state = "active";
    this.onChange?.(this.current(), this.state);
    return true;
  }

  reset() {
    this.index = 0;
    this.progress = freshProgress();
    this.state = "idle";
  }

  private checkComplete() {
    if (this.state !== "active") return;
    if (this.current().isComplete(this.progress, this.bumperCount)) {
      this.state = "completed";
      this.onComplete?.(this.current());
    }
  }

  recordBumperHit(id: number) {
    if (this.state !== "active") return;
    this.progress.bumpersLit.add(id);
    this.checkComplete();
  }

  recordRampShot() {
    if (this.state !== "active") return;
    this.progress.rampShots += 1;
    this.checkComplete();
  }

  recordTargetSequenceComplete() {
    if (this.state !== "active") return;
    this.progress.targetSequencesCompleted += 1;
    this.checkComplete();
  }

  recordCombo(hits: number) {
    if (this.state !== "active") return;
    this.progress.maxCombo = Math.max(this.progress.maxCombo, hits);
    this.checkComplete();
  }
}
