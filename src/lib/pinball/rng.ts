/** Seeded PRNG (mulberry32) — every random gameplay element (which random event fires, its
 * timing jitter) goes through this, never Math.random(), so a fixed seed reproduces the exact
 * same sequence. That's what makes the determinism tests meaningful. */
export type RandomSource = () => number;

export function createRng(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks a weighted-random entry. Falls back to the first entry if weights are degenerate. */
export function pickWeighted<T>(rng: RandomSource, entries: Array<{ value: T; weight: number }>): T {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  if (total <= 0) return entries[0].value;
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight);
    if (roll <= 0) return entry.value;
  }
  return entries[entries.length - 1].value;
}

/** A non-seeded default source for real gameplay, where true unpredictability is desired. */
export const defaultRng: RandomSource = Math.random;
