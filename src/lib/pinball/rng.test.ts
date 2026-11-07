import test from "node:test";
import assert from "node:assert/strict";
import { createRng, pickWeighted } from "./rng";

test("the same seed produces the exact same sequence", () => {
  const a = createRng(12345);
  const b = createRng(12345);
  const seqA = Array.from({ length: 20 }, () => a());
  const seqB = Array.from({ length: 20 }, () => b());
  assert.deepEqual(seqA, seqB);
});

test("different seeds produce different sequences", () => {
  const a = createRng(1);
  const b = createRng(2);
  const seqA = Array.from({ length: 10 }, () => a());
  const seqB = Array.from({ length: 10 }, () => b());
  assert.notDeepEqual(seqA, seqB);
});

test("every draw stays within [0, 1)", () => {
  const rng = createRng(999);
  for (let i = 0; i < 500; i++) {
    const value = rng();
    assert.ok(value >= 0 && value < 1, `draw ${i} (${value}) out of range`);
  }
});

test("pickWeighted is deterministic for a given seed and reflects weighting over many draws", () => {
  const entries = [
    { value: "common", weight: 8 },
    { value: "rare", weight: 2 },
  ];
  const rngA = createRng(42);
  const rngB = createRng(42);
  const picksA = Array.from({ length: 50 }, () => pickWeighted(rngA, entries));
  const picksB = Array.from({ length: 50 }, () => pickWeighted(rngB, entries));
  assert.deepEqual(picksA, picksB, "same seed must pick the same sequence");

  const commonCount = picksA.filter((p) => p === "common").length;
  assert.ok(commonCount > 25, "the heavily-weighted entry should be picked noticeably more often");
});

test("pickWeighted falls back to the first entry when all weights are zero", () => {
  const rng = createRng(1);
  const result = pickWeighted(rng, [{ value: "a", weight: 0 }, { value: "b", weight: 0 }]);
  assert.equal(result, "a");
});
