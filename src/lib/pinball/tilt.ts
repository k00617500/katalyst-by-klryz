export type TiltState = "normal" | "warning" | "tilted";

const NUDGE_WINDOW_MS = 3000;
const WARNING_AT = 2;
const TILT_AT = 3;

/** Nudging the cabinet is a real physics impulse applied to the ball elsewhere (see
 * nudgeImpulse in config) — this class only tracks how often the player has nudged recently and
 * decides whether that crosses into a warning or a tilt. Valid transitions: normal -> warning ->
 * tilted, and tilted only clears on reset() (a new ball) — never automatically mid-ball. */
export class TiltManager {
  state: TiltState = "normal";
  private nudgeTimestamps: number[] = [];

  constructor(private onChange?: (state: TiltState) => void) {}

  registerNudge(now: number): TiltState {
    if (this.state === "tilted") return this.state;
    this.nudgeTimestamps = this.nudgeTimestamps.filter((t) => now - t < NUDGE_WINDOW_MS);
    this.nudgeTimestamps.push(now);
    const count = this.nudgeTimestamps.length;
    const next: TiltState = count >= TILT_AT ? "tilted" : count >= WARNING_AT ? "warning" : "normal";
    if (next !== this.state) {
      this.state = next;
      this.onChange?.(next);
    }
    return this.state;
  }

  reset() {
    this.nudgeTimestamps = [];
    if (this.state !== "normal") {
      this.state = "normal";
      this.onChange?.("normal");
    }
  }
}
