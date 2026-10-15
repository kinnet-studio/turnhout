import { describe, expect, it } from 'vitest';
import { buildCards, expandCardTable, parseTextFaceKey, standardDeckIdentities, textFaceKey } from './cards';
import { makeRng } from '../rng';

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
    const two = [
      { kind: 'standard' as const, identities: standardDeckIdentities().slice(0, 2), start: 'draw pile', acesHigh: false },
      { kind: 'table' as const, identities: expandCardTable(COLOR_TABLE).slice(0, 3), start: 'deck', acesHigh: false },
    ];
    const { cards } = buildCards(two, makeRng(3));
    expect(cards).toHaveLength(5);
    expect(cards.filter((c) => c.zoneId === 'draw-pile').map((c) => c.faceKey).sort()).toEqual(['1S', '2S']);
    expect(cards.filter((c) => c.zoneId === 'deck')).toHaveLength(3);
  });
});
