import test from "node:test";
import assert from "node:assert/strict";
import { awardScore, canScore, createScoringState, creditPoints, grantAchievementMultiplier, resetCombo } from "./scoring";

test("normal hits and mission bonuses share the 100,000-point ceiling", () => {
  const state = createScoringState();
  state.score = 99_500;
  assert.equal(awardScore(state, "jackpot", 1, 0)?.finalPoints, 500);
  assert.equal(creditPoints(state, 2500), 0);
  assert.equal(state.score, 100_000);
});

test("awardScore computes FINAL = BASE x COMBO x ACHIEVEMENT x DIFFICULTY, rounded", () => {
  const state = createScoringState();
  state.achievementMultiplier = 2;
  const award = awardScore(state, "dropTarget", 1, 0, 1.1);
  assert.ok(award);
  // base 500 * combo 1 (first hit) * achievement 2 * difficulty 1.1 = 1100
  assert.equal(award.basePoints, 500);
  assert.equal(award.finalPoints, Math.round(500 * 1 * 2 * 1.1));
  assert.equal(state.score, award.finalPoints);
});

test("a collision cooldown blocks farming the same body repeatedly", () => {
  const state = createScoringState();
  const first = awardScore(state, "bumper", 42, 0);
  assert.ok(first);
  const immediateRepeat = awardScore(state, "bumper", 42, 50); // 50ms later, inside the cooldown
  assert.equal(immediateRepeat, null, "a sustained/rapid repeat contact must not score again");
  assert.ok(canScore(state, 42, 50 + 300), "the cooldown must expire eventually");
});

test("combo resets after the combo window elapses", () => {
  const state = createScoringState();
  awardScore(state, "bumper", 1, 0);
  const withinWindow = awardScore(state, "bumper", 2, 1000);
  assert.equal(withinWindow?.comboHits, 2, "a hit inside the combo window extends the combo");

  const afterWindow = awardScore(state, "bumper", 3, 1000 + 5001);
  assert.equal(afterWindow?.comboHits, 1, "a hit after the combo window must restart the combo at 1");
});

test("resetCombo zeroes the streak without touching the score", () => {
  const state = createScoringState();
  awardScore(state, "bumper", 1, 0);
  awardScore(state, "bumper", 2, 100);
  const scoreBefore = state.score;
  resetCombo(state);
  assert.equal(state.comboHits, 0);
  assert.equal(state.score, scoreBefore, "losing a ball resets combo, not the already-earned score");
});

test("score can never go negative", () => {
  const state = createScoringState();
  state.score = 0;
  // Even a pathological base/multiplier combination should clamp at zero, never dip negative.
  state.achievementMultiplier = -10;
  const award = awardScore(state, "bumper", 1, 0);
  assert.ok(award);
  assert.ok(state.score >= 0, "accumulated score must never go negative");
});

test("grantAchievementMultiplier never exceeds the configured cap and expires on time", () => {
  const state = createScoringState();
  grantAchievementMultiplier(state, 999, 1000, 0);
  assert.ok(state.achievementMultiplier <= 5, "multiplier must respect MAX_MULTIPLIER");

  const award = awardScore(state, "bumper", 1, 1000 + 1); // just past expiry
  assert.equal(award?.achievementMultiplier, 1, "an expired multiplier must not apply to the next score event");
});
