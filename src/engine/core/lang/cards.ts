import { shuffleWithRng, type RngState } from '../rng';
import type { CardState } from '../scene';
import type { Json } from '../table-def';
import { RuleError } from './diagnostics';
import type { CardIdentity, CardSetSpec, CardTable } from './types';
import { zoneIdFor } from './zones';

const STANDARD_SUIT_LETTERS = ['S', 'H', 'D', 'C'];
const STANDARD_RANK_COUNT = 13;
const TEXT_PREFIX = 't:';
const INTEGER = /^-?\d+$/;
const RANGE = /^(-?\d+) to (-?\d+)$/;
const WHOLE_NUMBER = /^\d+$/;

const valueText = (v: Json): string => (typeof v === 'string' ? v : JSON.stringify(v));

/** Face key of a card with free-form attributes: 't:color=red;number=7', in column order. */
export function textFaceKey(attrs: { [k: string]: Json }): string {
  const pairs = Object.entries(attrs).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(valueText(v))}`);
  return `${TEXT_PREFIX}${pairs.join(';')}`;
}

/** The attributes (as text) behind a face key made by `textFaceKey`; null for any other face key. */
export function parseTextFaceKey(key: string): Record<string, string> | null {
  if (!key.startsWith(TEXT_PREFIX)) return null;
  const body = key.slice(TEXT_PREFIX.length);
  const attrs: Record<string, string> = {};
  try {
    for (const pair of body === '' ? [] : body.split(';')) {
      const at = pair.indexOf('=');
      if (at < 0) return null;
      attrs[decodeURIComponent(pair.slice(0, at))] = decodeURIComponent(pair.slice(at + 1));
    }
  } catch {
    return null;
  }
  return attrs;
}

/** The 52 cards of a standard deck: suits S, H, D, C, each with ranks 1 (ace) to 13 (king). */
export function standardDeckIdentities(): CardIdentity[] {
  return STANDARD_SUIT_LETTERS.flatMap((suit) =>
    Array.from({ length: STANDARD_RANK_COUNT }, (_, i) => ({ attrs: { suit, rank: i + 1 }, faceKey: `${i + 1}${suit}` })),
  );
}

/** The most cards a game can have, across all its card sets: more would freeze the page that lays them out. */
export const MAX_CARDS = 1000;
export const TOO_MANY_CARDS = `A game can have at most ${MAX_CARDS} cards.`;

const COPIES = 'copies';
/** The one column name the language gives meaning to: its cells are rules for the card's player (see `compileSays`). */
export const SAYS = 'says';

/** Whether a table column is the says column: any capitals, spaces around the name ignored. */
export const isSaysColumn = (name: string): boolean => name.trim().toLowerCase() === SAYS;

/** What a table cell says: 'a to b' counts up from a to b; anything else is one value, whole numbers as numbers. */
type Cell = { from: number; to: number } | { value: Json };

/** The cell's meaning; null for a blank one, which gives the card no such attribute at all (a number is written 0, not left blank). */
function readCell(cell: string, line: number): Cell | null {
  const text = cell.trim();
  if (text === '') return null;
  const range = RANGE.exec(text);
  if (range) {
    const [from, to] = [Number(range[1]), Number(range[2])];
    if (from > to) throw new RuleError(`“${text}” counts down. Write the smaller number first.`, line, text);
    return { from, to };
  }
  return { value: INTEGER.test(text) ? Number(text) : text };
}

const countOf = (cell: Cell): number => ('value' in cell ? 1 : cell.to - cell.from + 1);

const valuesOf = (cell: Cell): Json[] =>
  'value' in cell ? [cell.value] : Array.from({ length: countOf(cell) }, (_, i) => cell.from + i);

function copiesOf(row: CardTable['rows'][number], column: number): number {
  if (column < 0) return 1;
  const text = (row.cells[column] ?? '').trim();
  if (!WHOLE_NUMBER.test(text)) throw new RuleError('copies must be a whole number', row.line, text);
  return Number(text);
}

/**
 * One identity per card in a designer's table: ranges expand to a row per value, a `copies` column (any case)
 * repeats the row, and a blank cell leaves its attribute out. Each row's cards are counted before they are made, so a
 * table of too many cards is refused at once.
 */
export function expandCardTable(table: CardTable): CardIdentity[] {
  const copiesColumn = table.columns.findIndex((name) => name.trim().toLowerCase() === COPIES);
  const columns = table.columns.map((name, at) => ({ name, at })).filter((c) => c.at !== copiesColumn);
  const identities: CardIdentity[] = [];
  for (const row of table.rows) {
    const copies = copiesOf(row, copiesColumn);
    const cells = columns.flatMap(({ name, at }) => {
      const cell = readCell(row.cells[at] ?? '', row.line);
      return cell === null ? [] : [{ name, cell }];
    });
    const count = cells.reduce((n, { cell }) => n * countOf(cell), copies);
    if (count === 0) continue; // no copies: nothing to make, however long its ranges
    // Written so that a count too big to be a number (NaN) is refused too.
    if (!(identities.length + count <= MAX_CARDS)) throw new RuleError(TOO_MANY_CARDS, row.line);
    let combos: { [k: string]: Json }[] = [{}];
    for (const { name, cell } of cells) {
      const values = valuesOf(cell);
      combos = combos.flatMap((attrs) => values.map((value) => ({ ...attrs, [name]: value })));
    }
    for (const attrs of combos) {
      const faceKey = textFaceKey(attrs);
      for (let n = 0; n < copies; n++) identities.push({ attrs: { ...attrs }, faceKey });
    }
  }
  return identities;
}

/**
 * Every card of every set. Each set is shuffled on its own, in the order listed with the rng threaded from one to the next,
 * before its ids are handed out; the sets get the next runs of ids in turn. An id says nothing about its face, only which set
 * the card came from (see `deckOf`). A game with one set is shuffled exactly as a game always was.
 */
export function buildCards(sets: CardSetSpec[], rng: RngState): { cards: CardState[]; rng: RngState } {
  const cards: CardState[] = [];
  let next = rng;
  for (const set of sets) {
    const shuffled = shuffleWithRng(set.identities, next);
    next = shuffled.rng;
    const zoneId = zoneIdFor(set.start);
    for (const identity of shuffled.items) {
      cards.push({ id: `c${cards.length}`, zoneId, faceUp: false, faceKey: identity.faceKey, data: { ...identity.attrs } });
    }
  }
  return { cards, rng: next };
}

/** An id as `buildCards` writes it: `c` and a whole number with no leading zeros. */
const CARD_ID = /^c(0|[1-9]\d*)$/;

/**
 * The set a card was dealt from, by its id: the one whose run of ids holds the id's number. Null for an id `buildCards`
 * never handed out. The set's `start` is the card's home pile.
 */
export function deckOf(sets: CardSetSpec[], cardId: string): CardSetSpec | null {
  const found = CARD_ID.exec(cardId);
  if (!found) return null;
  let rest = Number(found[1]);
  for (const set of sets) {
    if (rest < set.identities.length) return set;
    rest -= set.identities.length;
  }
  return null;
}
