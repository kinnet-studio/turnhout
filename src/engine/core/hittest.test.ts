import { describe, expect, it } from 'vitest';
import { cardAtPoint } from './hittest';
import type { PlacedCard } from './scene';

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
