import { describe, expect, it, vi } from 'vitest';
import { FaceTextureCache } from './face-texture-cache';
import type { CardState } from '../core/scene';

const card = (faceKey: string): CardState => ({ id: 'x', zoneId: 'z', faceUp: true, faceKey });

describe('FaceTextureCache', () => {
  it('renders once per faceKey and memoizes', () => {
    const fakeTexture = { id: 'tex' } as never;
    const renderer = vi.fn(() => fakeTexture);
    const drawToTexture = vi.fn();
    const cache = new FaceTextureCache(renderer, drawToTexture);

    expect(cache.get(card('AS'))).toBe(fakeTexture);
    expect(cache.get(card('AS'))).toBe(fakeTexture);
    expect(renderer).toHaveBeenCalledTimes(1);
  });

  it('routes a draw callback through drawToTexture', () => {
    const drawn = { id: 'drawn' } as never;
    const draw = () => {};
    const cache = new FaceTextureCache(() => draw, () => drawn);
    expect(cache.get(card('back'))).toBe(drawn);
  });
});
