import test from "node:test";
import assert from "node:assert/strict";
import { MissionManager } from "./missions";

test("a mission only tracks progress while active", () => {
  const mgr = new MissionManager(3);
  mgr.recordBumperHit(1); // idle — must be ignored
  assert.equal(mgr.progress.bumpersLit.size, 0);

  mgr.start();
  mgr.recordBumperHit(1);
  mgr.recordBumperHit(2);
  assert.equal(mgr.progress.bumpersLit.size, 2);
  assert.equal(mgr.state, "active");
});

test("mission 1 completes only once every bumper has been hit", () => {
  const mgr = new MissionManager(3);
  mgr.start();
  mgr.recordBumperHit(1);
  mgr.recordBumperHit(1); // same bumper again — a Set, so no double counting
  assert.equal(mgr.state, "active");
  mgr.recordBumperHit(2);
  mgr.recordBumperHit(3);
  assert.equal(mgr.state, "completed");
});

test("completing a mission stops further progress until advance()", () => {
  const mgr = new MissionManager(1);
  mgr.start();
  mgr.recordBumperHit(1);
  assert.equal(mgr.state, "completed");
  mgr.recordBumperHit(2); // completed — must be ignored
  assert.equal(mgr.progress.bumpersLit.size, 1);
});

test("advance() only works from completed or idle, and cycles to the next mission with fresh progress", () => {
  const mgr = new MissionManager(1);
  assert.equal(mgr.advance(), true, "idle -> active is a valid transition");
  assert.equal(mgr.index, 1);
  mgr.recordRampShot();
  mgr.recordRampShot();
  mgr.recordRampShot();
  assert.equal(mgr.state, "completed");

  const advanced = mgr.advance();
  assert.equal(advanced, true);
  assert.equal(mgr.index, 2);
  assert.equal(mgr.progress.rampShots, 0, "advancing resets progress for the new mission");
  assert.equal(mgr.state, "active");

  assert.equal(mgr.advance(), false, "cannot advance while a mission is still active");
});

test("mission 4 requires an actual 8-hit combo, not just any score event", () => {
  const mgr = new MissionManager(3);
  mgr.index = 3; // combo-breaker
  mgr.start();
  mgr.recordCombo(5);
  assert.equal(mgr.state, "active");
  mgr.recordCombo(8);
  assert.equal(mgr.state, "completed");
});
