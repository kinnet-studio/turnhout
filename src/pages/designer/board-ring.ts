/** How many cells a side of the square the spaces run round: about a quarter of them each, plus the shared corner. */
export function ringSize(n: number): number {
  return Math.ceil(n / 4) + 1;
}

/**
 * Where each of `n` spaces sits on the edge of a square grid, clockwise from the bottom-right corner (left along the
 * bottom, up the left side, along the top, down the right). 40 spaces land on an 11 by 11 ring with a corner at every
 * tenth; other counts are spread evenly, each on a cell of its own because the edge always has at least `n` cells.
 */
export function ringCells(n: number): { row: number; col: number }[] {
  const s = ringSize(n) - 1;
  const perimeter = 4 * s;
  return Array.from({ length: n }, (_, i) => {
    const k = Math.round((i * perimeter) / n);
    if (k < s) return { row: s, col: s - k };
    if (k < 2 * s) return { row: s - (k - s), col: 0 };
    if (k < 3 * s) return { row: 0, col: k - 2 * s };
    return { row: k - 3 * s, col: s };
  });
}
