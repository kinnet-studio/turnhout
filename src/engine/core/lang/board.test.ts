import { describe, expect, it } from 'vitest';
import { readSpaceTable } from './board';
import type { CardTable } from './types';

const table = (columns: string[], rows: string[][], firstLine = 6): CardTable => ({
  columns,
  rows: rows.map((cells, i) => ({ cells, line: firstLine + i })),
});

const COLUMNS = ['space', 'kind', 'color', 'price', 'rent', 'tax'];
const FOUR_SPACES = [
  ['Go', 'go', '', '', '', ''],
  ['Mill Lane', 'street', 'brown', '60', '2', ''],
  ['Income Tax', 'tax', '', '', '', '200'],
  ['Rose Lane', 'street', 'orange', '180', '14', ''],
];

const failure = (t: CardTable): { message: string; line?: number } => {
  try {
    readSpaceTable(t);
  } catch (error) {
    return error as { message: string; line?: number };
  }
  throw new Error('expected readSpaceTable to throw');
};

describe('readSpaceTable', () => {
  it('reads each row as a space whose attributes are its other cells', () => {
    expect(readSpaceTable(table(COLUMNS, FOUR_SPACES))).toEqual([
      { name: 'Go', attrs: { kind: 'go' } },
      { name: 'Mill Lane', attrs: { kind: 'street', color: 'brown', price: 60, rent: 2 } },
      { name: 'Income Tax', attrs: { kind: 'tax', tax: 200 } },
      { name: 'Rose Lane', attrs: { kind: 'street', color: 'orange', price: 180, rent: 14 } },
    ]);
  });

  it('lowercases and trims column names, finds the space column in any case, and trims cells', () => {
    const spaces = readSpaceTable(table([' SPACE ', ' Kind ', 'Price'], [
      ['  Go ', ' go ', ''], ['Mill Lane', 'light blue', ' 60 '], ['Chance', 'chance', ''], ['Rose Lane', 'street', '-5'],
    ]));
    expect(spaces).toEqual([
      { name: 'Go', attrs: { kind: 'go' } },
      { name: 'Mill Lane', attrs: { kind: 'light blue', price: 60 } },
      { name: 'Chance', attrs: { kind: 'chance' } },
      { name: 'Rose Lane', attrs: { kind: 'street', price: -5 } },
    ]);
  });

  it('keeps text that only looks like a number as text', () => {
    const [first] = readSpaceTable(table(['space', 'note'], [['A', '1.5'], ['B', '2nd'], ['C', ''], ['D', '']]));
    expect(first.attrs).toEqual({ note: '1.5' });
  });

  it('keeps a space that appears twice, in order', () => {
    const spaces = readSpaceTable(table(['space'], [['Go'], ['Chance'], ['Rose Lane'], ['Chance']]));
    expect(spaces.map((s) => s.name)).toEqual(['Go', 'Chance', 'Rose Lane', 'Chance']);
  });

  it('wants a space column', () => {
    expect(failure(table(['kind', 'price'], FOUR_SPACES.map((r) => r.slice(1, 3))))).toMatchObject({
      name: 'RuleError', message: 'Add a “space” column naming each space.',
    });
  });

  it('wants every space to have a name, and says which row', () => {
    const rows = FOUR_SPACES.map((r) => [...r]);
    rows[2][0] = '   ';
    expect(failure(table(COLUMNS, rows, 6))).toMatchObject({ name: 'RuleError', message: 'Every space needs a name.', line: 8 });
  });

  it('refuses ranges like “1 to 9” in any cell, and says which row', () => {
    const rows = FOUR_SPACES.map((r) => [...r]);
    rows[1][3] = '1 to 9';
    expect(failure(table(COLUMNS, rows, 6))).toMatchObject({
      name: 'RuleError', message: 'A space table can\'t use ranges like “1 to 9”; give each space its own row.', line: 7,
    });
    const named = FOUR_SPACES.map((r) => [...r]);
    named[3][0] = '1 to 9';
    expect(failure(table(COLUMNS, named, 6))).toMatchObject({ message: expect.stringContaining('can\'t use ranges'), line: 9 });
  });

  it('wants at least 4 spaces', () => {
    expect(failure(table(COLUMNS, FOUR_SPACES.slice(0, 3)))).toMatchObject({ name: 'RuleError', message: 'A board needs at least 4 spaces.' });
    expect(failure(table(COLUMNS, []))).toMatchObject({ message: 'A board needs at least 4 spaces.' });
    expect(readSpaceTable(table(COLUMNS, FOUR_SPACES))).toHaveLength(4);
  });

  it('allows at most 200 spaces, and names the row that goes over', () => {
    const many = (n: number) => table(['space'], Array.from({ length: n }, (_, i) => [`S${i}`]), 10);
    expect(readSpaceTable(many(200))).toHaveLength(200);
    expect(failure(many(201))).toMatchObject({ name: 'RuleError', message: 'A board can have at most 200 spaces.', line: 10 + 200 });
  });
});
