import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { CardSprite } from './card-sprite';
import type { CardRenderState } from '../core/table-model';

const rs = (over: Partial<CardRenderState> = {}): CardRenderState => ({
  id: 'a', faceUp: true, faceKey: 'AS', draggable: true,
  current: { x: 12, y: 34, rotation: 0.5, scale: 1, z: 7 },
  target: { x: 12, y: 34, rotation: 0.5, scale: 1, z: 7 },
  ownedByDrag: false, flipProgress: 1, ...over,
});

describe('CardSprite', () => {
  it('applies transform from a render state', () => {
    const s = new CardSprite();
    s.setFaces(Texture.EMPTY, Texture.EMPTY);
    s.applyRenderState(rs());
    expect(s.x).toBeCloseTo(12);
    expect(s.y).toBeCloseTo(34);
    expect(s.rotation).toBeCloseTo(0.5);
    expect(s.zIndex).toBe(7);
  });

  it('shows the up face when settled face-up, the down face when face-down', () => {
    const s = new CardSprite();
    s.setFaces(Texture.EMPTY, Texture.EMPTY);
    s.applyRenderState(rs({ faceUp: true, flipProgress: 1 }));
    expect(s.faceUpVisible).toBe(true);
    s.applyRenderState(rs({ faceUp: false, flipProgress: 1 }));
    expect(s.faceUpVisible).toBe(false);
  });
});
