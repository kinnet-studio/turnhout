import { Container, Graphics, Text, Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { PixiTable } from './pixi-table';
import { FaceTextureCache } from './face-texture-cache';
import { CardSprite } from './card-sprite';
import type { Scene } from '../core/scene';
import { deriveScene } from '../core/derive-scene';
import { TABLE } from '@/pages/hearts-demo/cards';
import { createHeartsServer } from '@/pages/hearts-demo/game';

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

  it('drops the name of a zone that stays on the table without one', () => {
    const table = new PixiTable({ faces: faces(), createSprite: () => new CardSprite() });
    table.setScene(named);
    table.setScene({ ...named, zones: [{ id: 'shop', layout: 'row', transform: { x: 0, y: 0 }, bounds: { width: 400, height: 140 } }, named.zones[1]] });
    expect(texts(table)).toHaveLength(0);
  });

  // Zones of a line stand 20 apart, so a name as wide as its zone and that gap stops short of its neighbour's.
  it('wraps a long name to its zone\'s width and the gap beside it, centred', () => {
    const table = new PixiTable({ faces: faces(), createSprite: () => new CardSprite() });
    table.setScene({
      cards: [],
      zones: [...named.zones.slice(0, 1), { id: 'lost', layout: 'pile', transform: { x: 300, y: 0 }, label: 'lost and found pile' }],
    });
    const [shop, lost] = texts(table);
    expect(shop.style).toMatchObject({ wordWrap: true, wordWrapWidth: 420, align: 'center' });
    expect(lost.style).toMatchObject({ wordWrap: true, wordWrapWidth: 120, align: 'center' });
  });
});

describe('decor', () => {
  const madeBy = (): { table: PixiTable; made: CardSprite[] } => {
    const made: CardSprite[] = [];
    const table = new PixiTable({
      faces: faces(),
      createSprite: () => {
        const sprite = new CardSprite();
        made.push(sprite);
        return sprite;
      },
    });
    return { table, made };
  };
  const kids = (s: CardSprite, label: string) => s.children.filter((c) => c.label === label);
  const descendants = (c: Container): Container[] => c.children.flatMap((ch) => [ch, ...(ch instanceof Container ? descendants(ch) : [])]);

  it('gives a card its decor, and one that comes later its own', () => {
    const { table, made } = madeBy();
    table.setScene(scene(['a', 'b']));
    table.setDecor({ a: { caption: 'x' } });
    expect((kids(made[0], 'card-caption')[0] as Text).text).toBe('x');
    expect(kids(made[1], 'card-caption')).toHaveLength(0);

    table.setScene(scene(['a', 'b', 'c']));
    expect((kids(made[0], 'card-caption')[0] as Text).text).toBe('x');
    expect(kids(made[2], 'card-caption')).toHaveLength(0);

    table.setDecor({ c: { ring: 'choice' } });
    expect(kids(made[0], 'card-caption')).toHaveLength(0);
    expect(kids(made[2], 'card-ring')).toHaveLength(1);
  });

  it('gives a card that arrives after the decor was set the decor stored for it', () => {
    const { table, made } = madeBy();
    table.setScene(scene(['a']));
    table.setDecor({ b: { ring: 'chosen' } });
    table.setScene(scene(['a', 'b']));
    expect(kids(made[0], 'card-ring')).toHaveLength(0);
    expect(kids(made[1], 'card-ring')).toHaveLength(1);
  });

  it('leaves no ring or caption behind when a card leaves the table', () => {
    const { table, made } = madeBy();
    table.setScene(scene(['a', 'b']));
    table.setDecor({ a: { ring: 'choice', caption: 'x' }, b: { ring: 'chosen', caption: 'y' } });
    const [ring, caption] = [kids(made[1], 'card-ring')[0], kids(made[1], 'card-caption')[0]];
    expect(ring).toBeDefined();
    expect(caption).toBeDefined();

    table.setScene(scene(['a']));
    expect(table.spriteCount).toBe(1);
    expect(ring.destroyed).toBe(true);
    expect(caption.destroyed).toBe(true);
    // What is left on the table is the one card's own ring and caption.
    expect(descendants(table).filter((c) => c.label === 'card-ring' || c.label === 'card-caption')).toEqual([
      kids(made[0], 'card-ring')[0],
      kids(made[0], 'card-caption')[0],
    ]);
  });

  it('never touches a sprite\'s decor for a table that is given none', () => {
    const calls: unknown[] = [];
    const table = new PixiTable({
      faces: faces(),
      createSprite: () => {
        const sprite = new CardSprite();
        sprite.setDecor = (decor) => calls.push(decor);
        return sprite;
      },
    });
    table.setScene(scene(['a', 'b']));
    table.setScene(scene(['a', 'b', 'c']));
    expect(calls).toEqual([]);
  });

  // A guard: this passes before the change, and pins that a page that puts no decor draws Hearts as it did.
  it('draws Hearts with no ring and no caption, and two children to a card', () => {
    const { table, made } = madeBy();
    table.setScene(deriveScene(TABLE, { cards: createHeartsServer(42).viewFor('p0').scene.cards }));
    expect(made.length).toBeGreaterThan(0);
    for (const sprite of made) expect(sprite.children).toHaveLength(2);
    expect(descendants(table).filter((c) => c.label === 'card-ring' || c.label === 'card-caption')).toEqual([]);
  });
});

describe('the empty-zone outline of a free zone', () => {
  const outlineOf = (table: PixiTable): Graphics => table.children.find((c): c is Graphics => c instanceof Graphics)!;

  // Each card of a free zone says where it goes, so the zone has no place of its own to mark: on a fitted table its box lies under a
  // card on the board, and an outline there would read as a slot.
  it('draws none, and still outlines an empty pile beside it', () => {
    const table = new PixiTable({ faces: faces(), createSprite: () => new CardSprite(), showEmptyZones: true });
    table.setScene({
      cards: [],
      zones: [
        { id: 'loose', layout: 'free', transform: { x: -200, y: 0 } },
        { id: 'empty', layout: 'pile', transform: { x: 200, y: 0 } },
      ],
    });
    // The pile's card-sized box at (200, 0), and the stroke's half-width around it, as above: nothing at x -250..-150.
    const b = outlineOf(table).context.bounds;
    expect({ minX: b.minX, maxX: b.maxX, minY: b.minY, maxY: b.maxY }).toEqual({ minX: 149, maxX: 251, minY: -71, maxY: 71 });
  });
});
