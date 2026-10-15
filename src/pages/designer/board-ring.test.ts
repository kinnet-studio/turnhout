import { describe, expect, it } from 'vitest';
import { ringCells, ringSize } from './board-ring';

const distinct = (cells: { row: number; col: number }[]) => new Set(cells.map((c) => `${c.row},${c.col}`)).size;

describe('ringCells', () => {
  it('puts 40 spaces on an 11 by 11 ring, corners at every tenth space', () => {
    const cells = ringCells(40);
    expect(ringSize(40)).toBe(11);
    expect([cells[0], cells[10], cells[20], cells[30], cells[39]]).toEqual([
      { row: 10, col: 10 }, { row: 10, col: 0 }, { row: 0, col: 0 }, { row: 0, col: 10 }, { row: 9, col: 10 },
    ]);
    expect(distinct(cells)).toBe(40);
  });

  it('spreads other counts evenly, each on its own cell', () => {
    for (const n of [4, 10, 13, 41]) expect(distinct(ringCells(n))).toBe(n);
  });

  it('keeps every space on the edge of the grid it is drawn in', () => {
    for (const n of [1, 2, 3, 7, 16, 40, 41]) {
      const size = ringSize(n);
      for (const { row, col } of ringCells(n)) {
        expect(row >= 0 && row < size && col >= 0 && col < size).toBe(true);
        expect(row === 0 || col === 0 || row === size - 1 || col === size - 1).toBe(true);
      }
    }
  });

  it('runs clockwise from the bottom-right corner: left along the bottom, then up the left side', () => {
    const cells = ringCells(40);
    expect(cells.slice(0, 3)).toEqual([{ row: 10, col: 10 }, { row: 10, col: 9 }, { row: 10, col: 8 }]);
    expect(cells.slice(10, 13)).toEqual([{ row: 10, col: 0 }, { row: 9, col: 0 }, { row: 8, col: 0 }]);
  });
});
