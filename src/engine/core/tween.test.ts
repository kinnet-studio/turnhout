import { describe, expect, it } from 'vitest';
import { advanceFlip, flipScaleX, resolveFlipVisual, stepToward } from './tween';
import type { TargetTransform } from './scene';

const t = (x: number): TargetTransform => ({ x, y: 0, rotation: 0, scale: 1, z: 0 });

describe('stepToward', () => {
  it('does not move with dt=0', () => {
    expect(stepToward(t(0), t(10), 0).x).toBe(0);
  });
  it('moves toward the target and overshoots never', () => {
    const r = stepToward(t(0), t(10), 0.016);
    expect(r.x).toBeGreaterThan(0);
    expect(r.x).toBeLessThan(10);
  });
  it('is effectively at target after a long step', () => {
    expect(stepToward(t(0), t(10), 10).x).toBeCloseTo(10, 3);
  });
});

describe('flip math', () => {
  it('flipScaleX is 1 at 0, 0 at midpoint, 1 at 1', () => {
    expect(flipScaleX(0)).toBeCloseTo(1);
    expect(flipScaleX(0.5)).toBeCloseTo(0);
    expect(flipScaleX(1)).toBeCloseTo(1);
  });
  it('advanceFlip clamps to 1', () => {
    expect(advanceFlip(0.9, 1, 0.3)).toBe(1);
  });
  it('resolveFlipVisual swaps side at the midpoint', () => {
    expect(resolveFlipVisual(0.4, true).showFaceUp).toBe(false);
    expect(resolveFlipVisual(0.6, true).showFaceUp).toBe(true);
  });
});
