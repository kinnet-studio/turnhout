import { describe, expect, it } from 'vitest';
import { expandCardTable } from '../cards';
import { RuleError } from '../diagnostics';
import { PhraseLibrary, STATIC_TYPES, emptyVocab } from '../phrases';
import { VOCAB_TYPES } from '../refs';
import type { CardsFn, ZoneFn } from '../types';
import { registerSetupPhrases } from './setup-phrases';

const COLOR_TABLE = { columns: ['color', 'number', 'copies'], rows: ['red', 'yellow', 'green', 'blue'].map((c, i) => ({ cells: [c, '1 to 9', '2'], line: 10 + i })) };
const lib = registerSetupPhrases(new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES]));
const vocab = { ...emptyVocab(), sharedZones: ['deck', 'draw pile'], playerZones: ['hand'], maxPlayers: 4 };

function cards(text: string, table = null as Parameters<CardsFn>[1]) {
  const m = lib.match('cards', text, vocab);
  if (m.status !== 'ok') throw new Error(`${text} → ${m.status}`);
  return (lib.get('cards', m.pattern)?.fn as CardsFn)(m.args, table);
}

function zone(text: string) {
  const m = lib.match('zone', text, vocab);
  if (m.status !== 'ok') throw new Error(`${text} → ${m.status}`);
  return () => (lib.get('zone', m.pattern)?.fn as ZoneFn)(m.args);
}

describe('card set phrases', () => {
  it('matches the standard deck with and without aces high', () => {
    const plain = cards('A standard 52-card deck, starting in the deck.');
    expect(plain).toMatchObject({ kind: 'standard', start: 'deck', acesHigh: false });
    expect(plain.identities).toHaveLength(52);
    expect(cards('A standard 52-card deck, aces high, starting in the deck.')).toMatchObject({ kind: 'standard', start: 'deck', acesHigh: true });
  });
  it('builds a table deck', () => {
    const set = cards('A deck called color cards, starting in the draw pile', COLOR_TABLE);
    expect(set).toMatchObject({ kind: 'table', start: 'draw pile', acesHigh: false });
    expect(set.identities).toEqual(expandCardTable(COLOR_TABLE));
    expect(set.identities).toHaveLength(72);
  });
  it('asks for a table when a deck has none', () => {
    expect(() => cards('A deck called color cards, starting in the deck')).toThrow('Add a table of cards under this line.');
  });
  it('only starts cards in a shared zone', () => {
    const fn = lib.get('cards', 'a standard 52-card deck, starting in {zone}')?.fn as CardsFn;
    expect(() => fn([{ each: 'hand' }], null)).toThrow(RuleError);
    expect(() => fn([{ each: 'hand' }], null)).toThrow('Cards must start in a shared zone, like “the deck”.');
    expect(() => fn([{ of: { who: 'actor' }, zone: 'hand' }], null)).toThrow('Cards must start in a shared zone');
  });
});

describe('zone phrases', () => {
  it('declares shared and per-player zones', () => {
    expect(zone('The trick is a row in the center that everyone can see')()).toEqual({ name: 'trick', perPlayer: false, layout: 'row', visibility: 'public' });
    expect(zone('Each player has a pass pile that only they can see')()).toEqual({ name: 'pass pile', perPlayer: true, layout: 'pile', visibility: 'owner' });
    expect(zone('Each player has a hand that only they can see')()).toMatchObject({ name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' });
    expect(zone('Each player has a bonus hand that no one can see')()).toMatchObject({ name: 'bonus hand', layout: 'hand', visibility: 'secret' });
  });
  it('declares a per-player row, which shows every card it holds, without reading it as a pile called "<name> row"', () => {
    expect(zone('Each player has a camp row that everyone can see')()).toEqual({ name: 'camp', perPlayer: true, layout: 'row', visibility: 'public' });
    expect(zone('Each player has a bonus pile row that only they can see')()).toEqual({ name: 'bonus pile', perPlayer: true, layout: 'row', visibility: 'owner' });
  });
  it('rejects a shared zone only its owner can see', () => {
    const declare = zone('The deck is a pile in the center that only they can see');
    expect(declare).toThrow(RuleError);
    expect(declare).toThrow('Only a player\'s own zone can be “only they can see”.');
  });
});
