import { describe, expect, it } from 'vitest';
import { placeZone, slotAtPoint } from './zone-geometry';
import { CARD_HEIGHT, CARD_WIDTH, type CardState } from './scene';
import type { ZoneDef } from './table-def';

const card = (id: string, extra: Partial<CardState> = {}): CardState => ({
  id, zoneId: 'z', faceUp: true, faceKey: id, ...extra,
});

describe('placeZone — authored bounds', () => {
  it('centers the box on transform for a centered anchor', () => {
    const z: ZoneDef = { id: 'z', layout: 'pile', transform: { x: 10, y: 20 }, bounds: { width: 100, height: 140, anchor: { x: 0.5, y: 0.5 } } };
    expect(placeZone(z, [])).toEqual({ id: 'z', x: 10, y: 20, width: 100, height: 140 });
  });

  it('offsets the box when the anchor is top-left', () => {
    const z: ZoneDef = { id: 'z', layout: 'grid', transform: { x: 0, y: 0 }, bounds: { width: 100, height: 140, anchor: { x: 0, y: 0 } } };
    // transform is the top-left corner → center is +half-size.
    expect(placeZone(z, [])).toEqual({ id: 'z', x: 50, y: 70, width: 100, height: 140 });
  });
});

describe('placeZone — auto bounds', () => {
  it('falls back to a single card footprint at transform when empty', () => {
    const z: ZoneDef = { id: 'z', layout: 'pile', transform: { x: 5, y: 7 } };
    expect(placeZone(z, [])).toEqual({ id: 'z', x: 5, y: 7, width: CARD_WIDTH, height: CARD_HEIGHT });
  });

  it('encloses a two-card row (default spacing 110)', () => {
    const z: ZoneDef = { id: 'z', layout: 'row', transform: { x: 0, y: 0 } };
    const p = placeZone(z, [card('a'), card('b')]);
    // card centers at x=-55 and x=55; box spans -55-50 .. 55+50 = 210 wide.
    expect(p.x).toBeCloseTo(0);
    expect(p.width).toBeCloseTo(210);
    expect(p.height).toBeCloseTo(CARD_HEIGHT);
  });
});

describe('slotAtPoint', () => {
  it('stack always appends at the top', () => {
    const z: ZoneDef = { id: 'z', layout: 'pile', transform: { x: 0, y: 0 }, ordering: 'stack' };
    expect(slotAtPoint(z, [card('a'), card('b')], { x: 0, y: 0 })).toBe(2);
  });

  it('free returns the nearest existing card index', () => {
    const z: ZoneDef = { id: 'z', layout: 'row', transform: { x: 0, y: 0 }, ordering: 'free' };
    // 'a' centers at x=-55, 'b' at x=55; a point at x=50 is nearest to 'b' (index 1).
    expect(slotAtPoint(z, [card('a'), card('b')], { x: 50, y: 0 })).toBe(1);
  });

  it('free returns 0 for an empty zone', () => {
    const z: ZoneDef = { id: 'z', layout: 'free', transform: { x: 0, y: 0 }, ordering: 'free' };
    expect(slotAtPoint(z, [], { x: 0, y: 0 })).toBe(0);
  });
});
