import test from "node:test";
import assert from "node:assert/strict";
import { comboMultiplierFor, levelForScore, launchVelocityForStrength, PLUNGER, plungerStrength } from "./config";

test("comboMultiplierFor returns 1x below the first combo tier", () => {
  assert.equal(comboMultiplierFor(0), 1);
  assert.equal(comboMultiplierFor(1), 1);
  assert.equal(comboMultiplierFor(2), 1);
});

test("comboMultiplierFor steps up at each tier threshold", () => {
  assert.equal(comboMultiplierFor(3), 1.25);
  assert.equal(comboMultiplierFor(4), 1.25);
  assert.equal(comboMultiplierFor(5), 1.5);
  assert.equal(comboMultiplierFor(8), 2);
  assert.equal(comboMultiplierFor(11), 2.5);
  assert.equal(comboMultiplierFor(50), 2.5, "multiplier never exceeds the highest configured tier");
});

test("levelForScore picks the highest level the score has reached, never further", () => {
  assert.equal(levelForScore(0).level, 1);
  assert.equal(levelForScore(2199).level, 1);
  assert.equal(levelForScore(2200).level, 2);
  assert.equal(levelForScore(5199).level, 2);
  assert.equal(levelForScore(5200).level, 3);
  assert.equal(levelForScore(27999).level, 4);
  assert.equal(levelForScore(28000).level, 5);
  assert.equal(levelForScore(999999).level, 5, "score past the last threshold stays at the final level");
});

test("launchVelocityForStrength is zero at zero strength and clamps to [0,1]", () => {
  assert.equal(launchVelocityForStrength(0), 0);
  assert.equal(launchVelocityForStrength(-5), launchVelocityForStrength(0));
  assert.equal(launchVelocityForStrength(5), launchVelocityForStrength(1));
});

test("launchVelocityForStrength matches Hooke's law: v = eta * x * sqrt(k / m)", () => {
  const strength = 0.6;
  const displacement = strength * PLUNGER.maxDisplacement;
  const ballMass = 0.04 * Math.PI * 10 * 10; // BALL_DENSITY * pi * BALL_RADIUS^2, recomputed independently of config.ts
  const expected = PLUNGER.efficiency * displacement * Math.sqrt(PLUNGER.springStiffness / ballMass);
  const actual = launchVelocityForStrength(strength);
  assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${expected}, got ${actual}`);
});

test("launchVelocityForStrength is monotonically increasing with strength", () => {
  const samples = [0, 0.25, 0.5, 0.75, 1];
  const velocities = samples.map(launchVelocityForStrength);
  for (let i = 1; i < velocities.length; i++) {
    assert.ok(velocities[i] > velocities[i - 1], "more charge must always launch at least as fast");
  }
});

test("charge increases continuously from tap strength to full power", () => {
  assert.equal(plungerStrength(-1), PLUNGER.minStrength);
  assert.equal(plungerStrength(0), PLUNGER.minStrength);
  const holds = [0, 40, 150, 500, PLUNGER.maxChargeMs];
  for (let index = 1; index < holds.length; index++) {
    assert.ok(plungerStrength(holds[index]) > plungerStrength(holds[index - 1]));
  }
  assert.equal(plungerStrength(PLUNGER.maxChargeMs + 500), 1);
});
