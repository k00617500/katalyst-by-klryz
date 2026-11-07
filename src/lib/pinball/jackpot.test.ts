import test from "node:test";
import assert from "node:assert/strict";
import { JackpotManager } from "./jackpot";

test("a jackpot can only be collected while lit and inside its window", () => {
  const jackpot = new JackpotManager();
  assert.equal(jackpot.collect(0), false, "nothing to collect before it's lit");
  assert.equal(jackpot.light(0), true);
  assert.equal(jackpot.state, "lit");
  assert.equal(jackpot.collect(5000), true, "collected within the window");
  assert.equal(jackpot.state, "collected");
});

test("an expired jackpot cannot be collected, and reverts to idle on tick", () => {
  const jackpot = new JackpotManager();
  jackpot.light(0);
  assert.equal(jackpot.collect(99999), false, "window already passed");
  jackpot.tick(99999);
  assert.equal(jackpot.state, "idle");
});

test("lighting an already-lit jackpot is a no-op (no duplicate awards)", () => {
  const jackpot = new JackpotManager();
  jackpot.light(0);
  assert.equal(jackpot.light(100), false);
});

test("a collected jackpot cannot be collected again without reset", () => {
  const jackpot = new JackpotManager();
  jackpot.light(0);
  jackpot.collect(0);
  assert.equal(jackpot.collect(0), false, "already collected");
  jackpot.reset();
  assert.equal(jackpot.state, "idle");
  assert.equal(jackpot.light(0), true, "can be lit again after reset");
});
