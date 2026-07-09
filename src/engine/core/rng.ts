export interface RngState {
  seed: number;
  count: number;
}

export function makeRng(seed: number): RngState {
  return { seed: seed >>> 0, count: 0 };
}

/** Deterministic uint32 from (seed, count) — mulberry32-style mix. */
function hash(seed: number, count: number): number {
  let t = (seed + Math.imul(count + 1, 0x6d2b79f5)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

export function nextInt(rng: RngState, boundExclusive: number): { value: number; rng: RngState } {
  if (boundExclusive <= 0) throw new Error(`nextInt bound must be > 0, got ${boundExclusive}`);
  const value = hash(rng.seed, rng.count) % boundExclusive;
  return { value, rng: { seed: rng.seed, count: rng.count + 1 } };
}

export function shuffleWithRng<T>(items: T[], rng: RngState): { items: T[]; rng: RngState } {
  const out = items.slice();
  let cur = rng;
  for (let i = out.length - 1; i > 0; i--) {
    const drawn = nextInt(cur, i + 1);
    cur = drawn.rng;
    const j = drawn.value;
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return { items: out, rng: cur };
}
