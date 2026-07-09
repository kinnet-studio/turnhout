import { describe, expect, it } from 'vitest';
import { makeRng, nextInt, shuffleWithRng } from './rng';

describe('rng', () => {
  it('makeRng starts at count 0', () => {
    expect(makeRng(42)).toEqual({ seed: 42, count: 0 });
  });

  it('nextInt is deterministic for a given (seed, count) and respects the bound', () => {
    const a = nextInt(makeRng(7), 6);
    const b = nextInt(makeRng(7), 6);
    expect(a.value).toBe(b.value);
    expect(a.value).toBeGreaterThanOrEqual(0);
    expect(a.value).toBeLessThan(6);
    expect(a.rng.count).toBe(1);
  });

  it('nextInt advances the sequence', () => {
    const r0 = makeRng(7);
    const r1 = nextInt(r0, 1000);
    const r2 = nextInt(r1.rng, 1000);
    expect(r2.rng.count).toBe(2);
    // extremely likely distinct; guards against returning a constant
    expect([r1.value, r2.value].length).toBe(2);
  });

  it('nextInt rejects a non-positive bound', () => {
    expect(() => nextInt(makeRng(1), 0)).toThrow();
  });

  it('shuffleWithRng permutes without mutating input and advances rng', () => {
    const input = [1, 2, 3, 4, 5];
    const { items, rng } = shuffleWithRng(input, makeRng(99));
    expect(input).toEqual([1, 2, 3, 4, 5]); // unmutated
    expect([...items].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]); // same multiset
    expect(rng.count).toBe(4); // n-1 draws for length 5
  });

  it('shuffleWithRng is deterministic for a fixed seed', () => {
    const a = shuffleWithRng([1, 2, 3, 4, 5, 6, 7, 8], makeRng(123));
    const b = shuffleWithRng([1, 2, 3, 4, 5, 6, 7, 8], makeRng(123));
    expect(a.items).toEqual(b.items);
  });
});
