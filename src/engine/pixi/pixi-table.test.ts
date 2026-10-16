import { Graphics, Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { PixiTable } from './pixi-table';
import { FaceTextureCache } from './face-texture-cache';
import { CardSprite } from './card-sprite';
import type { Scene } from '../core/scene';
import { Container, Text } from 'pixi.js';

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

describe('zone names', () => {
  const named: Scene = {
    cards: [],
    zones: [
      { id: 'shop', layout: 'row', transform: { x: 0, y: 0 }, bounds: { width: 400, height: 140 }, label: 'shop' },
      { id: 'pile', layout: 'pile', transform: { x: 300, y: 0 } },
    ],
  };
  const texts = (c: Container): Text[] =>
    c.children.flatMap((ch) => [...(ch instanceof Text && ch.label === 'zone-label' ? [ch] : []), ...(ch instanceof Container ? texts(ch) : [])]);

  it('draws a zone\'s name above its box, with or without the empty-zone outlines', () => {
    for (const showEmptyZones of [false, true]) {
      const table = new PixiTable({ faces: faces(), createSprite: () => new CardSprite(), showEmptyZones });
      table.setScene(named);
      const names = texts(table);
      expect(names.map((t) => t.text)).toEqual(['shop']);
      expect(names[0]).toMatchObject({ x: 0, y: -74 });
      expect(names[0].anchor.y).toBe(1);
      expect(names[0].style).toMatchObject({ fontSize: 18, fill: 0xd1d5db });
    }
  });

  it('draws it once however often the scene is set, and drops it with the zone', () => {
    const table = new PixiTable({ faces: faces(), createSprite: () => new CardSprite() });
    table.setScene(named);
    table.setScene(named);
    expect(texts(table)).toHaveLength(1);
    table.setScene({ ...named, zones: named.zones.slice(1) });
    expect(texts(table)).toHaveLength(0);
  });

  it('puts it behind the cards', () => {
    const table = new PixiTable({ faces: faces(), createSprite: () => new CardSprite() });
    table.setScene(named);
    const holder = table.children.find((ch) => ch instanceof Container && texts(ch).length > 0)!;
    expect(holder.zIndex).toBe(-1);
  });

  it('draws none for zones without a name', () => {
    const table = new PixiTable({ faces: faces(), createSprite: () => new CardSprite(), showEmptyZones: true });
    table.setScene(scene(['a']));
    expect(texts(table)).toHaveLength(0);
  });
});
