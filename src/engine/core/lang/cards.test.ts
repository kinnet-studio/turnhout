import { describe, expect, it } from 'vitest';
import { buildCards, deckOf, expandCardTable, parseTextFaceKey, standardDeckIdentities, textFaceKey } from './cards';
import { makeRng, shuffleWithRng } from '../rng';

const COLOR_TABLE = { columns: ['color', 'number', 'copies'], rows: ['red', 'yellow', 'green', 'blue'].map((c, i) => ({ cells: [c, '1 to 9', '2'], line: 10 + i })) };

describe('standard deck', () => {
  it('has 52 identities with suit and rank attributes', () => {
    const ids = standardDeckIdentities();
    expect(ids).toHaveLength(52);
    expect(ids[0]).toEqual({ attrs: { suit: 'S', rank: 1 }, faceKey: '1S' });
    expect(ids[51]).toEqual({ attrs: { suit: 'C', rank: 13 }, faceKey: '13C' });
    expect(new Set(ids.map((c) => c.faceKey)).size).toBe(52);
  });
});

describe('card tables', () => {
  it('expands ranges and copies, numbers stay numbers', () => {
    const ids = expandCardTable(COLOR_TABLE);
    expect(ids).toHaveLength(72);
    expect(ids[0]).toEqual({ attrs: { color: 'red', number: 1 }, faceKey: 't:color=red;number=1' });
    expect(ids.filter((c) => c.attrs.color === 'blue' && c.attrs.number === 7)).toHaveLength(2);
  });
  it('defaults copies to 1 and rejects bad copies', () => {
    expect(expandCardTable({ columns: ['name'], rows: [{ cells: ['Goblin'], line: 3 }] })).toHaveLength(1);
    expect(() => expandCardTable({ columns: ['name', 'copies'], rows: [{ cells: ['Goblin', 'two'], line: 3 }] })).toThrow('copies must be a whole number');
  });
  it('reports the line of a bad copies cell', () => {
    try {
      expandCardTable({ columns: ['name', 'copies'], rows: [{ cells: ['Goblin', '1.5'], line: 7 }] });
      expect.unreachable();
    } catch (e) {
      expect(e).toMatchObject({ name: 'RuleError', line: 7 });
    }
  });
  it('keeps column order in attributes and face keys, and non-integers as text', () => {
    const [card] = expandCardTable({ columns: ['name', 'attack', 'copies'], rows: [{ cells: ['Big Troll', '4', '1'], line: 3 }] });
    expect(card).toEqual({ attrs: { name: 'Big Troll', attack: 4 }, faceKey: 't:name=Big%20Troll;attack=4' });
  });
  it('multiplies several ranges in one row', () => {
    const ids = expandCardTable({ columns: ['a', 'b'], rows: [{ cells: ['1 to 2', '5 to 6'], line: 3 }] });
    expect(ids.map((c) => c.faceKey)).toEqual(['t:a=1;b=5', 't:a=1;b=6', 't:a=2;b=5', 't:a=2;b=6']);
  });
  it('rejects a range that counts down', () => {
    expect(() => expandCardTable({ columns: ['n'], rows: [{ cells: ['9 to 1'], line: 4 }] })).toThrow('smaller number first');
  });
  it('finds the copies column whatever its case or spacing', () => {
    for (const copies of ['Copies', ' COPIES ']) {
      const ids = expandCardTable({ ...COLOR_TABLE, columns: ['Color', 'Number', copies] });
      expect(ids).toHaveLength(72);
      expect(ids[0].attrs).toEqual({ Color: 'red', Number: 1 });
    }
  });
  it('allows at most 1000 cards, counted before any card is made', () => {
    const tooMany = (cells: string[], columns = ['color', 'number', 'copies']) => () =>
      expandCardTable({ columns, rows: [{ cells: ['red', '1 to 9', '1'], line: 5 }, { cells, line: 6 }] });
    for (const cells of [['blue', '1 to 9', '2000'], ['blue', '1 to 9999', '1'], ['blue', '1 to 9999999999', '1'], ['blue', '1 to 9', '99999999999999999999']]) {
      const started = performance.now();
      expect(tooMany(cells)).toThrow(expect.objectContaining({ name: 'RuleError', message: 'A game can have at most 1000 cards.', line: 6 }));
      expect(performance.now() - started).toBeLessThan(100);
    }
    expect(expandCardTable({ columns: ['n', 'copies'], rows: [{ cells: ['1 to 100', '10'], line: 3 }] })).toHaveLength(1000);
    expect(() => expandCardTable({ columns: ['n', 'copies'], rows: [{ cells: ['1 to 100', '10'], line: 3 }, { cells: ['1', '1'], line: 4 }] }))
      .toThrow(expect.objectContaining({ message: 'A game can have at most 1000 cards.', line: 4 }));
  });
  it('round-trips text face keys', () => {
    expect(parseTextFaceKey(textFaceKey({ name: 'Big Troll', attack: 4 }))).toEqual({ name: 'Big Troll', attack: '4' });
    expect(parseTextFaceKey('12S')).toBeNull();
  });
  it('escapes separators in keys and values', () => {
    const attrs = { 'a=b': 'x;y=z', 'q&r': '100%' };
    expect(parseTextFaceKey(textFaceKey(attrs))).toEqual(attrs);
  });
});

describe('buildCards', () => {
  const sets = [{ kind: 'standard' as const, identities: standardDeckIdentities(), start: 'deck', acesHigh: true }];
  const two = [
    { kind: 'standard' as const, identities: standardDeckIdentities().slice(0, 2), start: 'draw pile', acesHigh: false },
    { kind: 'table' as const, identities: expandCardTable(COLOR_TABLE).slice(0, 3), start: 'deck', acesHigh: false },
  ];
  const mapping = (seed: number) => buildCards(sets, makeRng(seed)).cards.map((c) => `${c.id}:${c.faceKey}`);
  it('assigns opaque ids after shuffling identities', () => {
    const { cards } = buildCards(sets, makeRng(7));
    expect(cards).toHaveLength(52);
    expect(cards.every((c, i) => c.id === `c${i}` && c.zoneId === 'deck' && !c.faceUp)).toBe(true);
    expect(mapping(7)).toEqual(mapping(7));
    expect(mapping(7)).not.toEqual(mapping(8));
    expect(cards.map((c) => c.faceKey)).not.toEqual(standardDeckIdentities().map((c) => c.faceKey));
  });
  it('copies the attributes into card data and advances the rng', () => {
    const { cards, rng } = buildCards(sets, makeRng(7));
    const card = cards.find((c) => c.faceKey === '12H');
    expect(card?.data).toEqual({ suit: 'H', rank: 12 });
    expect(rng.count).toBeGreaterThan(0);
  });
  it('mixes several sets, each into its own start zone', () => {
    const { cards } = buildCards(two, makeRng(3));
    expect(cards).toHaveLength(5);
    expect(cards.filter((c) => c.zoneId === 'draw-pile').map((c) => c.faceKey).sort()).toEqual(['1S', '2S']);
    expect(cards.filter((c) => c.zoneId === 'deck')).toHaveLength(3);
  });
  it('hands each set the next run of ids, so an id says which set a card came from and never which card of it', () => {
    const { cards } = buildCards(two, makeRng(3));
    expect(cards.map((c) => c.id)).toEqual(['c0', 'c1', 'c2', 'c3', 'c4']);
    expect(cards.map((c) => c.zoneId)).toEqual(['draw-pile', 'draw-pile', 'deck', 'deck', 'deck']);
    expect([deckOf(two, 'c1'), deckOf(two, 'c2'), deckOf(two, 'c5'), deckOf(two, 'x2')]).toEqual([two[0], two[1], null, null]);
  });
  it('shuffles each set on its own, threading the rng from one to the next', () => {
    const first = shuffleWithRng(two[0].identities, makeRng(3));
    const second = shuffleWithRng(two[1].identities, first.rng);
    const { cards, rng } = buildCards(two, makeRng(3));
    expect(cards.map((c) => c.faceKey)).toEqual([...first.items, ...second.items].map((i) => i.faceKey));
    expect(rng).toEqual(second.rng);
  });
  it('gives one set exactly the shuffle it always got', () => {
    const shuffled = shuffleWithRng(sets[0].identities, makeRng(7));
    const { cards, rng } = buildCards(sets, makeRng(7));
    expect(cards.map((c) => c.faceKey)).toEqual(shuffled.items.map((i) => i.faceKey));
    expect(rng).toEqual(shuffled.rng);
  });
});

describe('deckOf', () => {
  const sets = [
    { kind: 'standard' as const, identities: standardDeckIdentities().slice(0, 2), start: 'draw pile', acesHigh: false },
    { kind: 'table' as const, identities: [], start: 'empty', acesHigh: false },
    { kind: 'table' as const, identities: expandCardTable(COLOR_TABLE).slice(0, 3), start: 'deck', acesHigh: false },
  ];
  it('skips a set with no cards and reads only ids as buildCards writes them', () => {
    expect(['c0', 'c1', 'c2', 'c4'].map((id) => deckOf(sets, id)?.start)).toEqual(['draw pile', 'draw pile', 'deck', 'deck']);
    expect(['c5', 'c', 'c-1', 'c01', 'c1.5', 'c1x', ' c1', 'C1', '1'].map((id) => deckOf(sets, id))).toEqual(Array(9).fill(null));
  });
});
