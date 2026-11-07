export type JackpotState = "idle" | "lit" | "collected";

const LIT_WINDOW_MS = 10000;

/** Valid transitions: idle -> lit (light()), lit -> collected (collect(), only inside the
 * window) or lit -> idle (tick() after the window expires). collected -> idle only via reset()
 * (next ball/mission), so a jackpot can't be collected twice. */
export class JackpotManager {
  state: JackpotState = "idle";
  private litUntil = 0;

  constructor(private onChange?: (state: JackpotState) => void) {}

  light(now: number): boolean {
    if (this.state !== "idle") return false;
    this.state = "lit";
    this.litUntil = now + LIT_WINDOW_MS;
    this.onChange?.(this.state);
    return true;
  }

  remainingMs(now: number): number {
    return this.state === "lit" ? Math.max(0, this.litUntil - now) : 0;
  }

  collect(now: number): boolean {
    if (this.state !== "lit" || now > this.litUntil) return false;
    this.state = "collected";
    this.onChange?.(this.state);
    return true;
  }

  tick(now: number) {
    if (this.state === "lit" && now > this.litUntil) {
      this.state = "idle";
      this.onChange?.(this.state);
    }
  }

  reset() {
    if (this.state !== "idle") {
      this.state = "idle";
      this.onChange?.(this.state);
    }
  }
}
