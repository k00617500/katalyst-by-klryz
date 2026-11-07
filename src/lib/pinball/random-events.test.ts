import test from "node:test";
import assert from "node:assert/strict";
import { createRng } from "./rng";
import { RandomEventManager, type RandomEventId } from "./random-events";

const ALL_IDS: RandomEventId[] = ["multiball", "double-score", "speed-rush", "target-rush", "bonus-ball"];

test("never triggers before the minimum interval has elapsed", () => {
  const mgr = new RandomEventManager(() => 0, 10000, 1); // chance=1 -> would always fire if allowed
  assert.equal(mgr.maybeTrigger(0, ALL_IDS), null, "nothing can fire at t=0 before any interval has passed");
});

test("never triggers with an empty eligible list", () => {
  const mgr = new RandomEventManager(() => 0, 0, 1);
  assert.equal(mgr.maybeTrigger(20000, []), null);
});

test("only one event is active at a time", () => {
  const mgr = new RandomEventManager(() => 0, 0, 1); // always eligible to fire, chance=1
  const first = mgr.maybeTrigger(0, ["double-score"]);
  assert.equal(first, "double-score");
  assert.ok(mgr.active, "a timed event must be marked active");
  const second = mgr.maybeTrigger(1000, ["double-score"]);
  assert.equal(second, null, "cannot trigger a new event while one is still active");
});

test("an instant (zero-duration) event like multiball never blocks the next trigger", () => {
  const mgr = new RandomEventManager(() => 0, 0, 1);
  const first = mgr.maybeTrigger(0, ["multiball"]);
  assert.equal(first, "multiball");
  assert.equal(mgr.active, null, "a zero-duration event has nothing to keep 'active'");
});

test("tick() fires onExpire exactly once when a timed event's window passes", () => {
  let expiredId: RandomEventId | null = null;
  const mgr = new RandomEventManager(() => 0, 0, 1, undefined, (id) => { expiredId = id; });
  mgr.maybeTrigger(0, ["double-score"]);
  mgr.tick(1000); // still within the 15s window
  assert.equal(expiredId, null);
  mgr.tick(20000);
  assert.equal(expiredId, "double-score");
  assert.equal(mgr.active, null);
});

test("the same seed produces the same sequence of triggered events", () => {
  function run(seed: number) {
    const rng = createRng(seed);
    const mgr = new RandomEventManager(rng, 0, 1);
    const picks: Array<RandomEventId | null> = [];
    let t = 0;
    for (let i = 0; i < 10; i++) {
      picks.push(mgr.maybeTrigger(t, ALL_IDS));
      t += 1; // 0 duration or not, interval is 0 so always eligible to try again
      mgr.tick(t);
    }
    return picks;
  }
  assert.deepEqual(run(7), run(7));
});

test("eligible filtering is respected — an excluded event is never picked", () => {
  const rng = createRng(1);
  const mgr = new RandomEventManager(rng, 0, 1);
  for (let i = 0; i < 20; i++) {
    const picked = mgr.maybeTrigger(i * 1000, ["bonus-ball"]);
    if (picked) assert.equal(picked, "bonus-ball");
    mgr.tick(i * 1000 + 1);
  }
});
