import { describe, expect, it } from 'vitest';
import { cardAtPoint, zoneAtPoint } from './hittest';
import type { PlacedCard, PlacedZone } from './scene';

const pc = (id: string, x: number, y: number, z: number, draggable = true): PlacedCard => ({
  id, draggable, transform: { x, y, rotation: 0, scale: 1, z },
});

describe('cardAtPoint', () => {
  it('returns the topmost card under the point', () => {
    const cards = [pc('low', 0, 0, 0), pc('high', 0, 0, 5)];
    expect(cardAtPoint({ x: 10, y: 10 }, cards)).toBe('high');
  });

  it('returns null when the point is outside every card', () => {
    expect(cardAtPoint({ x: 999, y: 999 }, [pc('a', 0, 0, 0)])).toBeNull();
  });

  it('skips non-draggable cards when draggableOnly is set', () => {
    expect(cardAtPoint({ x: 0, y: 0 }, [pc('a', 0, 0, 0, false)], { draggableOnly: true })).toBeNull();
  });
});

describe('zoneAtPoint', () => {
  const zones: PlacedZone[] = [
    { id: 'table', x: 0, y: 0, width: 1000, height: 1000 },
    { id: 'discard', x: 100, y: 100, width: 120, height: 160 },
  ];

  it('returns the last (topmost) matching zone', () => {
    expect(zoneAtPoint({ x: 100, y: 100 }, zones)).toEqual({ zoneId: 'discard', slot: 0 });
  });

  it('returns null outside all zones', () => {
    expect(zoneAtPoint({ x: 5000, y: 5000 }, zones)).toBeNull();
  });

  it('respects a zone accepts predicate', () => {
    const guarded: PlacedZone[] = [{ id: 'foundation', x: 0, y: 0, width: 200, height: 200, accepts: () => false }];
    const card = { id: 'a', zoneId: 'x', faceUp: true, faceKey: 'a' };
    expect(zoneAtPoint({ x: 10, y: 10 }, guarded, card)).toBeNull();
  });
});
