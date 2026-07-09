import { describe, expect, it } from 'vitest';
import { planDeal, planShuffle } from './choreography';

describe('planDeal', () => {
  it('staggers releases and reports total duration', () => {
    const r = planDeal(['a', 'b', 'c'], 100);
    expect(r.releaseAtMs.get('a')).toBe(0);
    expect(r.releaseAtMs.get('b')).toBe(100);
    expect(r.releaseAtMs.get('c')).toBe(200);
    expect(r.totalMs).toBe(200);
  });
  it('handles the empty case', () => {
    expect(planDeal([], 100)).toEqual({ releaseAtMs: new Map(), totalMs: 0 });
  });
});

describe('planShuffle', () => {
  it('produces symmetric keyframes that start and end at zero', () => {
    const m = planShuffle(['a'], { amplitude: 30, cycles: 2 });
    const frames = m.get('a')!;
    expect(frames).toHaveLength(5);
    expect(frames[0]).toBe(0);
    expect(frames[frames.length - 1]).toBe(0);
    expect(Math.max(...frames.map(Math.abs))).toBeLessThanOrEqual(30);
  });
});
