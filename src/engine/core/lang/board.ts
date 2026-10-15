import type { Json } from '../table-def';
import { RuleError } from './diagnostics';
import { singularForms } from './refs';
import type { BankSpec, CardTable, FactItem, SpaceSpec } from './types';

/** The most spaces a board can have: more would crowd the page that draws them. */
export const MAX_SPACES = 200;
const MIN_SPACES = 4;
const SPACE_COLUMN = 'space';
const INTEGER = /^-?\d+$/;
const RANGE = /^-?\d+ to -?\d+$/;

/** What a table cell says: blank means "none" (null), a whole number is a number, anything else stays as written. */
function readCell(cell: string): Json | null {
  const text = cell.trim();
  if (text === '') return null;
  return INTEGER.test(text) ? Number(text) : text;
}

/**
 * The spaces of a board, in loop order, from the designer's table. The `space` column (any case) names each one and
 * every other column becomes an attribute rules can mention; a blank cell leaves the attribute out. Unlike a table of
 * cards there are no ranges or copies: each space is its own row.
 */
export function readSpaceTable(table: CardTable): SpaceSpec[] {
  const columns = table.columns.map((name) => name.trim().toLowerCase());
  const nameAt = columns.indexOf(SPACE_COLUMN);
  if (nameAt < 0) throw new RuleError('Add a “space” column naming each space.');
  const spaces: SpaceSpec[] = [];
  for (const row of table.rows) {
    const name = (row.cells[nameAt] ?? '').trim();
    if (name === '') throw new RuleError('Every space needs a name.', row.line);
    if (row.cells.some((cell) => RANGE.test(cell.trim()))) {
      throw new RuleError('A space table can\'t use ranges like “1 to 9”; give each space its own row.', row.line);
    }
    // Counted as the rows are read, so a table of thousands of rows is refused at the row that goes over.
    if (spaces.length >= MAX_SPACES) throw new RuleError(`A board can have at most ${MAX_SPACES} spaces.`, row.line);
    const attrs: { [k: string]: Json } = {};
    columns.forEach((column, at) => {
      if (at === nameAt) return;
      const value = readCell(row.cells[at] ?? '');
      if (value !== null) attrs[column] = value;
    });
    spaces.push({ name, attrs });
  }
  if (spaces.length < MIN_SPACES) throw new RuleError(`A board needs at least ${MIN_SPACES} spaces.`);
  return spaces;
}

/** The number a space's cell holds; null when the cell is blank, and the sentence that says so when it holds anything but a number. */
export function numberIn(space: SpaceSpec, column: string): number | null {
  const cell = space.attrs[column];
  if (cell === undefined || cell === null) return null;
  if (typeof cell !== 'number') throw new RuleError(`${space.name}'s ${column} isn't a number.`);
  return cell;
}

/**
 * The bank item that goes with a fact on spaces, by name: a count goes with the item of the same name, and a flag with the item
 * named its plural. Null when the bank keeps nothing for it, as for a flag that is only ever set and cleared.
 */
export function bankItemOf(fact: FactItem, bank: BankSpec[]): string | null {
  const item = fact.kind === 'number'
    ? bank.find((banked) => banked.name === fact.name)
    : bank.find((banked) => singularForms(banked.name).includes(fact.name));
  return item?.name ?? null;
}
