import { Graphics, Texture } from 'pixi.js';
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

describe('PixiTable empty-zone outlines (showEmptyZones)', () => {
  const twoZoneScene: Scene = {
    cards: [{ id: 'a', zoneId: 'occupied', faceUp: false, faceKey: 'back' }],
    zones: [
      { id: 'occupied', layout: 'pile', transform: { x: 0, y: 0 } },
      { id: 'empty', layout: 'pile', transform: { x: 200, y: 0 } },
    ],
  };

  const outlineOf = (table: PixiTable): Graphics | undefined =>
    table.children.find((c): c is Graphics => c instanceof Graphics);

  // The empty pile at (200, 0) draws a card-sized 100x140 box (placeZone's
  // zero-card fallback), i.e. x 150..250, y -70..70, expanded by the stroke's
  // half-width (1) on every side. Asserting the exact extents proves the one
  // empty zone was outlined AND the occupied zone at x=0 was not (drawing it
  // too would drag minX down to -51).
  const expectedOutline = { minX: 149, maxX: 251, minY: -71, maxY: 71 };

  it('outlines exactly the one empty zone when the flag is on', () => {
    const table = new PixiTable({ faces: faces(), createSprite: () => new CardSprite(), showEmptyZones: true });
    table.setScene(twoZoneScene);
    const b = outlineOf(table)!.context.bounds;
    expect({ minX: b.minX, maxX: b.maxX, minY: b.minY, maxY: b.maxY }).toEqual(expectedOutline);
  });

  it('redraws (not accumulates) outlines on subsequent setScene calls', () => {
    const table = new PixiTable({ faces: faces(), createSprite: () => new CardSprite(), showEmptyZones: true });
    table.setScene(twoZoneScene);
    table.setScene(twoZoneScene);
    const b = outlineOf(table)!.context.bounds;
    expect({ minX: b.minX, maxX: b.maxX, minY: b.minY, maxY: b.maxY }).toEqual(expectedOutline);
  });

  it('draws no outlines when the flag is off (default) — behavior unchanged', () => {
    const table = new PixiTable({ faces: faces(), createSprite: () => new CardSprite() });
    table.setScene(twoZoneScene);
    // An untouched GraphicsContext reports empty (negative) bounds extents.
    expect(outlineOf(table)!.context.bounds.width).toBeLessThanOrEqual(0);
  });
});
