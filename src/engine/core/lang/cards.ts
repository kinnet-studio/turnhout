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

/** What a table cell says: each value it stands for. 'a to b' counts up from a to b; whole numbers become numbers. */
function cellValues(cell: string, line: number): Json[] {
  const text = cell.trim();
  const range = RANGE.exec(text);
  if (range) {
    const [from, to] = [Number(range[1]), Number(range[2])];
    if (from > to) throw new RuleError(`“${text}” counts down. Write the smaller number first.`, line, text);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }
  return [INTEGER.test(text) ? Number(text) : text];
}

function copiesOf(row: CardTable['rows'][number], column: number): number {
  if (column < 0) return 1;
  const text = (row.cells[column] ?? '').trim();
  if (!WHOLE_NUMBER.test(text)) throw new RuleError('copies must be a whole number', row.line, text);
  return Number(text);
}

/** One identity per card in a designer's table: ranges expand to a row per value, `copies` repeats the row. */
export function expandCardTable(table: CardTable): CardIdentity[] {
  const copiesColumn = table.columns.indexOf('copies');
  const columns = table.columns.map((name, at) => ({ name, at })).filter((c) => c.at !== copiesColumn);
  const identities: CardIdentity[] = [];
  for (const row of table.rows) {
    const copies = copiesOf(row, copiesColumn);
    let combos: { [k: string]: Json }[] = [{}];
    for (const { name, at } of columns) {
      const values = cellValues(row.cells[at] ?? '', row.line);
      combos = combos.flatMap((attrs) => values.map((value) => ({ ...attrs, [name]: value })));
    }
    for (const attrs of combos) {
      const faceKey = textFaceKey(attrs);
      for (let n = 0; n < copies; n++) identities.push({ attrs: { ...attrs }, faceKey });
    }
  }
  return identities;
}

/** Every card of every set, shuffled before ids are handed out so an id says nothing about its face. */
export function buildCards(sets: CardSetSpec[], rng: RngState): { cards: CardState[]; rng: RngState } {
  const all = sets.flatMap((set) => set.identities.map((identity) => ({ identity, zoneId: zoneIdFor(set.start) })));
  const shuffled = shuffleWithRng(all, rng);
  const cards = shuffled.items.map(({ identity, zoneId }, i): CardState => ({
    id: `c${i}`,
    zoneId,
    faceUp: false,
    faceKey: identity.faceKey,
    data: { ...identity.attrs },
  }));
  return { cards, rng: shuffled.rng };
}
