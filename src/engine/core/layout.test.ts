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
