import { describe, expect, it } from 'vitest';
import { STANDARD_RANKS, STANDARD_SUITS, VOCAB_TYPES, parseParam, thirdPerson } from './refs';
import { PhraseLibrary, STATIC_TYPES, emptyVocab, stubFor } from './phrases';
import type { Vocab } from './types';

const V: Vocab = {
  ...emptyVocab(),
  sharedZones: ['trick', 'deck', 'draw pile'], playerZones: ['hand', 'pass pile', 'won pile'], maxPlayers: 4,
  phases: ['passing', 'playing'], verbs: ['play', 'pass', 'draw'], attributes: ['color', 'number'], standardDeck: true,
  cardValues: [{ attribute: 'color', value: 'red' }, { attribute: 'color', value: 'blue' }, { attribute: 'number', value: 7 }, { attribute: 'number', value: 2 }],
};

describe('vocabulary types', () => {
  it('declares every type with its label and stub order', () => {
    expect(VOCAB_TYPES.map((t) => [t.name, t.label])).toEqual([
      ['zone', '[zone]'], ['zones', '[zones]'], ['perzone', '[zone]'], ['player', '[player]'], ['phase', '[phase]'],
      ['move', '[action]'], ['attribute', '[attribute]'], ['card', '[card]'], ['cardlist', '[cards]'], ['cardclass', '[kind of card]'],
    ]);
    const order = Object.fromEntries(VOCAB_TYPES.filter((t) => t.stubOrder !== undefined).map((t) => [t.name, t.stubOrder]));
    expect(order).toEqual({ card: 2, zone: 3, player: 4 });
  });

  it.each([V, emptyVocab()])('sources have no capture groups and do not match empty text', (vocab) => {
    for (const type of VOCAB_TYPES) {
      const source = type.source(vocab);
      expect(new RegExp(`${source}|`).exec('')).toHaveLength(1);
      expect(new RegExp(`^(?:${source})$`, 'i').test('')).toBe(false);
    }
  });

  it('answers null for text a type does not cover and throws for an unknown type', () => {
    expect(parseParam('zone', 'the moon', V)).toBeNull();
    expect(parseParam('player', 'bob', V)).toBeNull();
    expect(() => parseParam('nope', 'x', V)).toThrow('unknown parameter type');
  });
});

describe('zone references', () => {
  it.each([
    ['the trick', { shared: 'trick' }],
    ['trick', { shared: 'trick' }],
    ['their hand', { of: { who: 'actor' }, zone: 'hand' }],
    ['each pass pile', { each: 'pass pile' }],
    ['every pass pile', { each: 'pass pile' }],
    ["the winner's won pile", { of: { who: 'winner' }, zone: 'won pile' }],
    ["p2's hand", { of: { seat: 'p2' }, zone: 'hand' }],
  ])('%s', (text, value) => expect(parseParam('zone', text, V)).toEqual({ value }));

  it('accepts straight and curly apostrophes for owners', () => {
    for (const apostrophe of ["'", '‘', '’']) {
      expect(parseParam('zone', `the winner${apostrophe}s won pile`, V)).toEqual({ value: { of: { who: 'winner' }, zone: 'won pile' } });
      expect(parseParam('zone', `p2${apostrophe}s hand`, V)).toEqual({ value: { of: { seat: 'p2' }, zone: 'hand' } });
      expect(parseParam('zones', `p0${apostrophe}s hand and p1${apostrophe}s hand`, V)).toEqual({
        value: [{ of: { seat: 'p0' }, zone: 'hand' }, { of: { seat: 'p1' }, zone: 'hand' }],
      });
    }
  });

  it('ignores case and keeps the declared zone name', () => {
    expect(parseParam('zone', 'The Winner’s Won Pile', V)).toEqual({ value: { of: { who: 'winner' }, zone: 'won pile' } });
    expect(parseParam('zone', 'EACH Hand', V)).toEqual({ value: { each: 'hand' } });
    expect(parseParam('zone', 'P2’s hand', V)).toEqual({ value: { of: { seat: 'p2' }, zone: 'hand' } });
  });

  it('asks whose zone a per-player name means', () => {
    expect(parseParam('zone', 'the hand', V)).toEqual({ error: '“the hand” — whose hand? Say “their hand”, “each hand” or “p1\'s hand”.' });
    expect(parseParam('zone', 'pass pile', V)).toEqual({ error: '“the pass pile” — whose pass pile? Say “their pass pile”, “each pass pile” or “p1\'s pass pile”.' });
  });
  it('rejects an owner on a shared zone', () => {
    expect(parseParam('zone', 'their trick', V)).toEqual({ error: '“the trick” is shared, so it has no owner.' });
    expect(parseParam('zone', 'each deck', V)).toEqual({ error: '“the deck” is shared, so it has no owner.' });
    expect(parseParam('zone', 'p1’s trick', V)).toEqual({ error: '“the trick” is shared, so it has no owner.' });
    expect(parseParam('zone', "the winner's deck", V)).toEqual({ error: '“the deck” is shared, so it has no owner.' });
  });
  it('checks the seat of an owned zone', () => {
    expect(parseParam('zone', "p3's hand", V)).toEqual({ value: { of: { seat: 'p3' }, zone: 'hand' } });
    expect(parseParam('zone', "p7's hand", V)).toEqual({ error: 'This game only has players p0 to p3.' });
  });
  it('parses zone lists', () => {
    expect(parseParam('zones', 'every hand and the trick', V)).toEqual({ value: [{ each: 'hand' }, { shared: 'trick' }] });
    expect(parseParam('zones', 'the trick', V)).toEqual({ value: [{ shared: 'trick' }] });
    expect(parseParam('zones', 'the trick, the deck and each hand', V)).toEqual({ value: [{ shared: 'trick' }, { shared: 'deck' }, { each: 'hand' }] });
    expect(parseParam('zones', 'the trick, the deck, and each hand', V)).toEqual({ value: [{ shared: 'trick' }, { shared: 'deck' }, { each: 'hand' }] });
  });
  it('reports the first bad zone in a list', () => {
    expect(parseParam('zones', 'the trick and the hand', V)).toMatchObject({ error: expect.stringContaining('whose hand?') });
    expect(parseParam('zones', 'the trick and the moon', V)).toBeNull();
  });

  it('prefers the longest zone name', () => {
    const vocab: Vocab = { ...emptyVocab(), sharedZones: ['pile', 'discard pile'], playerZones: ['pass pile', 'pile of shame'], maxPlayers: 2 };
    expect(parseParam('zone', 'the discard pile', vocab)).toEqual({ value: { shared: 'discard pile' } });
    expect(parseParam('zone', 'each pass pile', vocab)).toEqual({ value: { each: 'pass pile' } });
    expect(parseParam('zone', 'each pile of shame', vocab)).toEqual({ value: { each: 'pile of shame' } });
    expect(parseParam('zone', 'the pile', vocab)).toEqual({ value: { shared: 'pile' } });
  });

  it('escapes zone names and accepts any apostrophe inside them', () => {
    const vocab: Vocab = { ...emptyVocab(), sharedZones: ['q.&a (deck)', "dealer's pile", 'x+y'], playerZones: ['hand'], maxPlayers: 2 };
    expect(parseParam('zone', 'the q.&a (deck)', vocab)).toEqual({ value: { shared: 'q.&a (deck)' } });
    expect(parseParam('zone', 'the qxxa (deck)', vocab)).toBeNull();
    expect(parseParam('zone', 'the x+y', vocab)).toEqual({ value: { shared: 'x+y' } });
    expect(parseParam('zone', 'the xxy', vocab)).toBeNull();
    for (const apostrophe of ["'", '‘', '’']) {
      expect(parseParam('zone', `the dealer${apostrophe}s pile`, vocab)).toEqual({ value: { shared: "dealer's pile" } });
    }
  });

  it('reads per-player zone names', () => {
    expect(parseParam('perzone', 'pass pile', V)).toEqual({ value: 'pass pile' });
    expect(parseParam('perzone', 'Hand', V)).toEqual({ value: 'hand' });
    expect(parseParam('perzone', 'trick', V)).toBeNull();
  });

  it('matches nothing when the game has no zones', () => {
    expect(parseParam('zone', 'the hand', emptyVocab())).toBeNull();
    expect(parseParam('perzone', 'hand', emptyVocab())).toBeNull();
  });
});

describe('players, phases, moves and attributes', () => {
  it('checks the player count', () => {
    expect(parseParam('player', 'p3', V)).toEqual({ value: 'p3' });
    expect(parseParam('player', 'P0', V)).toEqual({ value: 'p0' });
    expect(parseParam('player', 'p7', V)).toEqual({ error: 'This game only has players p0 to p3.' });
    expect(parseParam('player', 'p4', V)).toEqual({ error: 'This game only has players p0 to p3.' });
  });
  it('phrases the player-count error for tiny games', () => {
    expect(parseParam('player', 'p1', { ...V, maxPlayers: 1 })).toEqual({ error: 'This game only has player p0.' });
    expect(parseParam('player', 'p0', emptyVocab())).toEqual({ error: 'This game has no players.' });
  });
  it('maps third-person verbs back to declared verbs', () => {
    expect(parseParam('move', 'passes', V)).toEqual({ value: 'pass' });
    expect(parseParam('move', 'Plays', V)).toEqual({ value: 'play' });
    expect(parseParam('move', 'play', V)).toBeNull();
    expect(parseParam('move', 'throws', V)).toBeNull();
    expect([thirdPerson('play'), thirdPerson('pass'), thirdPerson('catch'), thirdPerson('fix')]).toEqual(['plays', 'passes', 'catches', 'fixes']);
    expect([thirdPerson('wash'), thirdPerson('buzz')]).toEqual(['washes', 'buzzes']);
  });
  it('reads phases and attributes from the vocabulary', () => {
    expect(parseParam('phase', 'Passing', V)).toEqual({ value: 'passing' });
    expect(parseParam('phase', 'scoring', V)).toBeNull();
    expect(parseParam('attribute', 'number', V)).toEqual({ value: 'number' });
    expect(parseParam('attribute', 'suit', V)).toBeNull();
  });
  it('accepts any apostrophe in phase names', () => {
    const vocab: Vocab = { ...emptyVocab(), phases: ["dealer's turn"] };
    for (const apostrophe of ["'", '‘', '’']) {
      expect(parseParam('phase', `dealer${apostrophe}s turn`, vocab)).toEqual({ value: "dealer's turn" });
    }
  });
});

describe('cards', () => {
  it('lists standard ranks and suits', () => {
    expect(STANDARD_RANKS).toMatchObject({ ace: 1, 2: 2, 10: 10, jack: 11, queen: 12, king: 13 });
    expect(Object.keys(STANDARD_RANKS)).toHaveLength(13);
    expect(STANDARD_SUITS).toEqual({ clubs: 'C', diamonds: 'D', hearts: 'H', spades: 'S' });
  });

  it('reads standard and custom cards', () => {
    expect(parseParam('card', 'the queen of spades', V)).toEqual({ value: { suit: 'S', rank: 12 } });
    expect(parseParam('card', 'the ace of clubs', V)).toEqual({ value: { suit: 'C', rank: 1 } });
    expect(parseParam('card', '10 of Diamonds', V)).toEqual({ value: { suit: 'D', rank: 10 } });
    expect(parseParam('card', 'a red 7', V)).toEqual({ value: { color: 'red', number: 7 } });
    expect(parseParam('card', 'the Blue 2', V)).toEqual({ value: { color: 'blue', number: 2 } });
    expect(parseParam('card', 'an 7', V)).toEqual({ value: { number: 7 } });
    expect(parseParam('card', 'a purple 7', V)).toBeNull();
    expect(parseParam('card', 'the 11 of hearts', V)).toBeNull();
  });
  it('only reads standard cards when the game has a standard deck', () => {
    expect(parseParam('card', 'the queen of spades', { ...V, standardDeck: false })).toBeNull();
    expect(parseParam('card', 'a red 7', { ...V, cardValues: [] })).toBeNull();
    expect(parseParam('card', 'the queen of spades', { ...V, cardValues: [] })).toEqual({ value: { suit: 'S', rank: 12 } });
    expect(parseParam('card', 'the queen of spades', emptyVocab())).toBeNull();
  });
  it('reads multi-word card values', () => {
    const vocab: Vocab = {
      ...emptyVocab(), attributes: ['name', 'kind'],
      cardValues: [{ attribute: 'name', value: 'big troll' }, { attribute: 'name', value: 'troll' }, { attribute: 'kind', value: 'monster' }],
    };
    expect(parseParam('card', 'a big troll monster', vocab)).toEqual({ value: { name: 'big troll', kind: 'monster' } });
    expect(parseParam('card', 'the troll', vocab)).toEqual({ value: { name: 'troll' } });
  });
  it('accepts any apostrophe inside card values and keeps the declared value', () => {
    const vocab: Vocab = {
      ...emptyVocab(), attributes: ['name', 'kind'], playerZones: ["dealer's hand"],
      cardValues: [{ attribute: 'name', value: "wizard's hat" }, { attribute: 'kind', value: 'gear' }],
    };
    for (const apostrophe of ["'", '‘', '’']) {
      expect(parseParam('card', `the Wizard${apostrophe}s hat`, vocab)).toEqual({ value: { name: "wizard's hat" } });
      expect(parseParam('cardclass', `wizard${apostrophe}s hat gear cards`, vocab)).toEqual({ value: { name: "wizard's hat", kind: 'gear' } });
      expect(parseParam('perzone', `dealer${apostrophe}s hand`, vocab)).toEqual({ value: "dealer's hand" });
    }
  });
  it('says which attributes a value could belong to', () => {
    const vocab: Vocab = {
      ...V, attributes: ['number', 'cost'],
      cardValues: [{ attribute: 'number', value: 7 }, { attribute: 'cost', value: 7 }, { attribute: 'color', value: 'red' }],
    };
    expect(parseParam('card', 'a red 7', vocab)).toEqual({ error: '“7” could be number or cost.' });
    expect(parseParam('cardclass', '7 cards', vocab)).toEqual({ error: '“7” could be number or cost.' });
  });
  it('rejects two values of the same attribute', () => {
    expect(parseParam('card', 'a red blue 7', V)).toEqual({ error: '“red” and “blue” are both color values, but a card has only one.' });
  });
  it('reads card lists and kinds of card', () => {
    expect(parseParam('cardlist', 'a blue 2, a red 7 and the 2 of hearts', V)).toEqual({ value: [{ color: 'blue', number: 2 }, { color: 'red', number: 7 }, { suit: 'H', rank: 2 }] });
    expect(parseParam('cardlist', 'a blue 2, a red 7, and the 2 of hearts', V)).toEqual({ value: [{ color: 'blue', number: 2 }, { color: 'red', number: 7 }, { suit: 'H', rank: 2 }] });
    expect(parseParam('cardlist', 'the ace of spades', V)).toEqual({ value: [{ suit: 'S', rank: 1 }] });
    expect(parseParam('cardlist', 'a blue 2 and a purple 7', V)).toBeNull();
    expect(parseParam('cardclass', 'a heart', V)).toEqual({ value: { suit: 'H' } });
    expect(parseParam('cardclass', 'hearts', V)).toEqual({ value: { suit: 'H' } });
    expect(parseParam('cardclass', 'an Spade', V)).toEqual({ value: { suit: 'S' } });
    expect(parseParam('cardclass', 'a red card', V)).toEqual({ value: { color: 'red' } });
    expect(parseParam('cardclass', 'red 7 cards', V)).toEqual({ value: { color: 'red', number: 7 } });
    expect(parseParam('cardclass', 'blue', V)).toEqual({ value: { color: 'blue' } });
    expect(parseParam('cardclass', 'a purple card', V)).toBeNull();
    expect(parseParam('cardclass', 'a card', V)).toBeNull();
  });
  it('only reads suits for a standard deck', () => {
    expect(parseParam('cardclass', 'hearts', { ...V, standardDeck: false })).toBeNull();
  });
  it('matches nothing when the game has no cards', () => {
    for (const type of ['card', 'cardlist', 'cardclass']) expect(parseParam(type, 'a red 7', emptyVocab())).toBeNull();
  });
});

describe('inside a phrase library', () => {
  const lib = () => new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES]);

  it('matches zone references and resolves them as arguments', () => {
    const l = lib().effect('deal {int} cards from {zone} to {zone}', (env) => env.state);
    expect(l.match('effect', 'Deal 13 cards from the deck to each hand.', V)).toEqual({
      status: 'ok', pattern: 'deal {int} cards from {zone} to {zone}', args: [13, { shared: 'deck' }, { each: 'hand' }],
    });
    expect(l.match('effect', 'Deal 2 cards from the draw pile to the winner’s won pile', V)).toMatchObject({
      status: 'ok', args: [2, { shared: 'draw pile' }, { of: { who: 'winner' }, zone: 'won pile' }],
    });
  });
  it('turns an unresolvable reference into a designer message', () => {
    const l = lib().effect('shuffle {zone}', (env) => env.state);
    expect(l.match('effect', 'shuffle the hand', V)).toMatchObject({ status: 'invalid', message: expect.stringContaining('whose hand?') });
    expect(l.match('effect', 'shuffle the moon', V).status).toBe('unknown');
  });
  it('matches players, moves and cards', () => {
    const l = lib().condition('{player} {move} {card}', () => true);
    expect(l.match('condition', 'p1 plays the queen of spades', V)).toEqual({
      status: 'ok', pattern: '{player} {move} {card}', args: ['p1', 'play', { suit: 'S', rank: 12 }],
    });
    expect(l.match('condition', 'p9 plays a red 7', V)).toEqual({ status: 'invalid', message: 'This game only has players p0 to p3.' });
  });
  it('stubs do not find references inside longer words', () => {
    const types = [...STATIC_TYPES, ...VOCAB_TYPES];
    expect(stubFor('effect', 'Gain extra 7 points', V, types, { game: 'Hearts', line: 5 })).toContain("library.effect('gain extra {int} points'");
    expect(stubFor('effect', 'Shuffle the handles', V, types, { game: 'Hearts', line: 6 })).toContain("library.effect('shuffle the handles'");
  });
  it('stubs replace cards, then zones, then players', () => {
    const types = [...STATIC_TYPES, ...VOCAB_TYPES];
    expect(stubFor('effect', 'p1 plays the queen of spades to the trick', V, types, { game: 'Hearts', line: 3 })).toContain(
      "library.effect('{player} plays {card} to {zone}', (env, [a1, a2, a3]) => {",
    );
    expect(stubFor('effect', 'Deal 13 cards from the deck to each hand', V, types, { game: 'Hearts', line: 4 })).toContain(
      "library.effect('deal {int} cards from {zone} to {zone}'",
    );
  });
});
