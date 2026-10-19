import { describe, expect, it } from 'vitest';
import { computeZoneLayout } from './layout';
import type { CardState, ZoneState } from './scene';

const card = (id: string, extra: Partial<CardState> = {}): CardState => ({
  id, zoneId: 'z', faceUp: true, faceKey: id, ...extra,
});

describe('computeZoneLayout', () => {
  it('pile stacks at the anchor with a small per-card y offset and increasing z', () => {
    const zone: ZoneState = { id: 'z', layout: 'pile', transform: { x: 10, y: 20 } };
    const m = computeZoneLayout(zone, [card('a'), card('b')], 100);
    expect(m.get('a')).toEqual({ x: 10, y: 20, rotation: 0, scale: 1, z: 100 });
    expect(m.get('b')).toEqual({ x: 10, y: 20.4, rotation: 0, scale: 1, z: 101 });
  });

  it('row centers cards horizontally with default spacing 110', () => {
    const zone: ZoneState = { id: 'z', layout: 'row', transform: { x: 0, y: 0 } };
    const m = computeZoneLayout(zone, [card('a'), card('b')]);
    expect(m.get('a')!.x).toBeCloseTo(-55);
    expect(m.get('b')!.x).toBeCloseTo(55);
    expect(m.get('a')!.y).toBe(0);
  });

  it('grid lays out by columns', () => {
    const zone: ZoneState = { id: 'z', layout: 'grid', transform: { x: 0, y: 0 }, layoutOptions: { cols: 2 } };
    const m = computeZoneLayout(zone, [card('a'), card('b'), card('c')]);
    expect(m.get('a')).toMatchObject({ x: 0, y: 0 });
    expect(m.get('b')).toMatchObject({ x: 110, y: 0 });
    expect(m.get('c')).toMatchObject({ x: 0, y: 150 });
  });

  it('fan: single card sits at the anchor with no rotation', () => {
    const zone: ZoneState = { id: 'z', layout: 'fan', transform: { x: 5, y: 5 } };
    const m = computeZoneLayout(zone, [card('a')]);
    expect(m.get('a')!.x).toBeCloseTo(5);
    expect(m.get('a')!.y).toBeCloseTo(5);
    expect(m.get('a')!.rotation).toBeCloseTo(0);
  });

  it('fan: symmetric outer cards mirror each other', () => {
    const zone: ZoneState = { id: 'z', layout: 'fan', transform: { x: 0, y: 0 }, layoutOptions: { fanAngleDeg: 30 } };
    const m = computeZoneLayout(zone, [card('a'), card('b'), card('c')]);
    expect(m.get('b')!.rotation).toBeCloseTo(0);
    expect(m.get('a')!.rotation).toBeCloseTo(-m.get('c')!.rotation);
    expect(m.get('a')!.x).toBeCloseTo(-m.get('c')!.x);
  });

  it('free: reads x/y from card.data, falling back to the anchor', () => {
    const zone: ZoneState = { id: 'z', layout: 'free', transform: { x: 1, y: 2 } };
    const m = computeZoneLayout(zone, [card('a', { data: { x: 40, y: 50 } }), card('b')]);
    expect(m.get('a')).toMatchObject({ x: 40, y: 50 });
    expect(m.get('b')).toMatchObject({ x: 1, y: 2 });
  });
});

describe('computeZoneLayout of a row with a maxWidth', () => {
  const row = (maxWidth?: number): ZoneState => ({
    id: 'z', layout: 'row', transform: { x: 0, y: 0 }, layoutOptions: { spacing: 75, ...(maxWidth === undefined ? {} : { maxWidth }) },
  });
  const xs = (zone: ZoneState, n: number) =>
    [...computeZoneLayout(zone, Array.from({ length: n }, (_, i) => card(`c${i}`))).values()].map((p) => p.x);

  it('a row with a maxWidth squeezes its cards to stay within it', () => {
    const eight = xs(row(400), 8);
    expect(eight[0]).toBeCloseTo(-150);
    expect(eight[7]).toBeCloseTo(150);
    expect(eight[1] - eight[0]).toBeCloseTo(300 / 7);

    const five = xs(row(400), 5);
    expect(five[0]).toBeCloseTo(-150);
    expect(five[4]).toBeCloseTo(150);
    expect(five[1] - five[0]).toBeCloseTo(75);

    const two = xs(row(400), 2);
    expect(two[0]).toBeCloseTo(-37.5);
    expect(two[1]).toBeCloseTo(37.5);

    expect(xs(row(400), 1)[0]).toBeCloseTo(0);

    const loose = xs(row(), 8);
    expect(loose[1] - loose[0]).toBeCloseTo(75);
  });
});

describe('computeZoneLayout of a row that keeps its placed cards', () => {
  const row = (keepPlaced?: boolean): ZoneState => ({
    id: 'z', layout: 'row', transform: { x: 0, y: 0 }, layoutOptions: { spacing: 110, ...(keepPlaced === undefined ? {} : { keepPlaced }) },
  });
  const cards = [card('a', { data: { x: 7, y: 9 } }), card('b'), card('c')];

  it('draws a card that carries its own place there, and spaces only the others, each keeping its z', () => {
    const m = computeZoneLayout(row(true), cards, 10);
    expect(m.get('a')).toEqual({ x: 7, y: 9, rotation: 0, scale: 1, z: 10 });
    expect(m.get('b')).toEqual({ x: -55, y: 0, rotation: 0, scale: 1, z: 11 });
    expect(m.get('c')).toEqual({ x: 55, y: 0, rotation: 0, scale: 1, z: 12 });
  });

  // A guard: this passes against the layout as it stands, and pins that the squeeze divides by the cards that are spaced, not by all of
  // them: four spaced cards in 400 sit (400 - CARD_WIDTH) / 3 = 100 apart, where counting the placed card too would give 75.
  it('(guard) squeezes a row by the cards it spaces, leaving the placed one out', () => {
    const zone: ZoneState = {
      id: 'z', layout: 'row', transform: { x: 0, y: 0 }, layoutOptions: { spacing: 110, maxWidth: 400, keepPlaced: true },
    };
    const five = [card('a'), card('b'), card('p', { data: { x: 7, y: 9 } }), card('c'), card('d')];
    const m = computeZoneLayout(zone, five, 10);
    expect(['a', 'b', 'c', 'd'].map((id) => m.get(id)!.x)).toEqual([-150, -50, 50, 150]);
    expect(['a', 'b', 'c', 'd'].map((id) => m.get(id)!.y)).toEqual([0, 0, 0, 0]);
    expect(m.get('p')).toEqual({ x: 7, y: 9, rotation: 0, scale: 1, z: 12 });
    // Each card keeps the z of its place in the zone, the placed one included.
    expect(['a', 'b', 'c', 'd'].map((id) => m.get(id)!.z)).toEqual([10, 11, 13, 14]);
  });

  // A guard: this passes before the change, and pins that a row told nothing spaces every card, a place it carries or not.
  it('(guard) spaces every card without keepPlaced', () => {
    const m = computeZoneLayout(row(), cards);
    expect(['a', 'b', 'c'].map((id) => m.get(id)!.x)).toEqual([-110, 0, 110]);
    expect(m.get('a')!.y).toBe(0);
  });
});
