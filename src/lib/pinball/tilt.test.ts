import test from "node:test";
import assert from "node:assert/strict";
import { TiltManager } from "./tilt";

test("the first nudge is normal, the second is a warning, the third tilts", () => {
  const tilt = new TiltManager();
  assert.equal(tilt.registerNudge(0), "normal");
  assert.equal(tilt.registerNudge(100), "warning");
  assert.equal(tilt.registerNudge(200), "tilted");
});

test("nudges outside the rolling window don't accumulate toward a tilt", () => {
  const tilt = new TiltManager();
  tilt.registerNudge(0);
  tilt.registerNudge(5000); // more than 3s later — the first nudge should have expired
  assert.equal(tilt.state, "normal", "two nudges far apart must not trigger a warning");
});

test("once tilted, further nudges don't change the state", () => {
  const tilt = new TiltManager();
  tilt.registerNudge(0);
  tilt.registerNudge(100);
  tilt.registerNudge(200);
  assert.equal(tilt.state, "tilted");
  tilt.registerNudge(300);
  assert.equal(tilt.state, "tilted", "tilt only clears via reset(), never by nudging more");
});

test("reset() clears tilt back to normal for the next ball", () => {
  const tilt = new TiltManager();
  tilt.registerNudge(0);
  tilt.registerNudge(100);
  tilt.registerNudge(200);
  assert.equal(tilt.state, "tilted");
  tilt.reset();
  assert.equal(tilt.state, "normal");
  assert.equal(tilt.registerNudge(1000), "normal", "the nudge count must also be cleared, not just the label");
});
