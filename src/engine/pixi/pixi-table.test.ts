import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { PixiTable } from './pixi-table';
import { FaceTextureCache } from './face-texture-cache';
import { CardSprite } from './card-sprite';
import type { Scene } from '../core/scene';

const faces = () => new FaceTextureCache(() => Texture.EMPTY, () => Texture.EMPTY);
const scene = (ids: string[]): Scene => ({
  cards: ids.map((id) => ({ id, zoneId: 'deck', faceUp: false, faceKey: 'back' })),
  zones: [{ id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } }],
});

describe('PixiTable', () => {
  it('creates one sprite per card and removes departed sprites', () => {
    const table = new PixiTable({ faces: faces(), createSprite: () => new CardSprite() });
    table.setScene(scene(['a', 'b']));
    expect(table.spriteCount).toBe(2);
    table.setScene(scene(['a']));
    expect(table.spriteCount).toBe(1);
  });

  it('advances the model so placed cards are available for hit-testing', () => {
    const table = new PixiTable({ faces: faces(), createSprite: () => new CardSprite() });
    table.setScene(scene(['a']));
    table.advance(0.016);
    expect(table.getPlacedCards().map((c) => c.id)).toEqual(['a']);
  });
});
