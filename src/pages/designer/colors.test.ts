import { describe, expect, it } from 'vitest';
import { SEAT_COLORS, seatColor } from './seat-colors';
import { spaceColor } from './space-colors';

describe('seatColor', () => {
  it('gives eight distinct colors, one per seat number, wrapping after that', () => {
    expect(SEAT_COLORS).toHaveLength(8);
    expect(new Set(SEAT_COLORS).size).toBe(8);
    expect(seatColor('p0')).toBe(SEAT_COLORS[0]);
    expect(seatColor('p7')).toBe(SEAT_COLORS[7]);
    expect(seatColor('p8')).toBe(SEAT_COLORS[0]);
    expect(seatColor('p13')).toBe(SEAT_COLORS[5]);
  });
});

describe('spaceColor', () => {
  it('knows the colors of a property-trading board, in any case', () => {
    for (const name of ['brown', 'light blue', 'pink', 'orange', 'red', 'yellow', 'green', 'dark blue', 'blue', 'purple', 'black', 'white', 'gray', 'grey']) {
      expect(spaceColor(name)).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(spaceColor('Light Blue')).toBe(spaceColor('light blue'));
    expect(spaceColor('GREEN')).toBe(spaceColor('green'));
    expect(spaceColor('grey')).toBe(spaceColor('gray'));
    expect(spaceColor('light blue')).not.toBe(spaceColor('dark blue'));
  });

  it('paints a name it does not know gray, and no color as none', () => {
    expect(spaceColor('chartreuse')).toBe('#9ca3af');
    expect(spaceColor('constructor')).toBe('#9ca3af');
    expect(spaceColor(null)).toBeNull();
  });
});
