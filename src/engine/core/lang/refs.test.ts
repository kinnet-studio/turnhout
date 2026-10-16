import { describe, expect, it } from 'vitest';
import {
  STANDARD_RANKS, STANDARD_SUITS, VOCAB_TYPES, counted, misnamedParam, parseParam, participle, pastWording, plural, secondPersonWords, singularForms, thirdPerson, thirdPersonWords,
} from './refs';
import { PhraseLibrary, STATIC_TYPES, emptyVocab, stubFor, vocabFrom } from './phrases';
import { FIXTURE_SPACES, fixtureBoardGame } from './testing';
import type { Vocab } from './types';

const V: Vocab = {
  ...emptyVocab(),
  sharedZones: ['trick', 'deck', 'draw pile'], playerZones: ['hand', 'pass pile', 'won pile'], maxPlayers: 4,
  phases: ['passing', 'playing'], verbs: ['play', 'pass', 'draw'], attributes: ['color', 'number'], standardDeck: true,
  cardValues: [{ attribute: 'color', value: 'red' }, { attribute: 'color', value: 'blue' }, { attribute: 'number', value: 7 }, { attribute: 'number', value: 2 }],
};

// The fixture's loop plus Bishop's Row (index 8); "Chance" is two of the spaces.
const BOARD = vocabFrom({
  maxPlayers: 2,
  board: {
    ...fixtureBoardGame().board!,
    spaces: [...FIXTURE_SPACES, { name: "Bishop's Row", attrs: { kind: 'street', color: 'green', price: 300, rent: 26 } }],
  },
  actions: [
    { verb: 'roll', words: 'roll the dice', base: 'roll the dice', targeted: false, anyone: false, amount: false, picksPlayer: false },
    { verb: 'end', words: 'end their turn', base: 'end their turn', targeted: false, anyone: false, amount: false, picksPlayer: false },
    { verb: 'buy', words: 'buy the space they are on', base: 'buy the space they are on', targeted: false, anyone: false, amount: false, picksPlayer: false },
    { verb: 'build', words: 'build a house on a street they own', base: 'build a house', targeted: true, anyone: false, amount: false, picksPlayer: false },
  ],
});

// What a game that declares facts and a bank says: the board's table, two facts on spaces and two on cards, and the bank.
const FACTS = vocabFrom({
  maxPlayers: 2,
  board: { ...fixtureBoardGame().board!, bank: [{ name: 'houses', start: 32 }, { name: 'hotels', start: 12 }] },
  facts: [
    { name: 'houses', on: 'space', kind: 'number' }, { name: 'hotel', on: 'space', kind: 'flag' },
    { name: 'poisoned', on: 'card', kind: 'flag' }, { name: 'health', on: 'card', kind: 'number' }, { name: 'in jail', on: 'player', kind: 'flag' },
  ],
});

describe('vocabulary types', () => {
  it('declares every type with its label and stub order', () => {
    expect(VOCAB_TYPES.map((t) => [t.name, t.label])).toEqual([
      ['zone', '[zone]'], ['zones', '[zones]'], ['perzone', '[zone]'], ['sharedzone', '[zone]'], ['player', '[player]'], ['players', '[players]'],
      ['phase', '[phase]'], ['move', '[action]'], ['attribute', '[attribute]'], ['card', '[card]'], ['cardlist', '[cards]'], ['cardclass', '[kind of card]'],
      ['space', '[space]'], ['spaceclass', '[kind of space]'], ['spaceattr', '[space detail]'], ['counter', '[counter]'],
      ['action', '[action]'], ['targetaction', '[action]'], ['amountaction', '[action]'], ['pickaction', '[action]'], ['cardaction', '[action]'], ['done', '[action done]'],
      ['spacekind', '[kind of space]'], ['spaceflag', '[space fact]'], ['spacenumber', '[space fact]'], ['cardflag', '[card fact]'],
      ['playerflag', '[player fact]'], ['playernumber', '[player fact]'], ['gamenumber', '[game number]'], ['banked', '[bank item]'],
      ['holder', '[the player who is …]'],
    ]);
    const order = Object.fromEntries(VOCAB_TYPES.filter((t) => t.stubOrder !== undefined).map((t) => [t.name, t.stubOrder]));
    // A stub never turns words into a space: a name like "Go To Jail" would swallow the words of an ordinary sentence.
    expect(order).toEqual({ card: 2, zone: 3, player: 4 });
  });

  it.each([V, BOARD, FACTS, emptyVocab()])('sources have no capture groups and do not match empty text', (vocab) => {
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
  describe('the other player', () => {
    const TWO: Vocab = { ...V, maxPlayers: 2 };
    const NEEDS_TWO = { error: '“the other player” needs a game for two players.' };
    it("is the other seat's zone, in a game for two, in any capitals and with either apostrophe", () => {
      for (const text of ["the other player's hand", 'The Other Player’s hand', 'the other player‘s hand']) {
        expect(parseParam('zone', text, TWO), text).toEqual({ value: { of: { who: 'other' }, zone: 'hand' } });
      }
      expect(parseParam('zones', "the trick and the other player's pass pile", TWO)).toEqual({ value: [{ shared: 'trick' }, { of: { who: 'other' }, zone: 'pass pile' }] });
    });
    it('is an error in a game that allows more than two players, or fewer', () => {
      expect(parseParam('zone', "the other player's hand", V)).toEqual(NEEDS_TWO);
      expect(parseParam('zone', "the other player's hand", { ...V, maxPlayers: 3 })).toEqual(NEEDS_TWO);
      expect(parseParam('zone', "the other player's hand", { ...V, maxPlayers: 1 })).toEqual(NEEDS_TWO);
    });
    it('has no owner for a shared zone', () => {
      expect(parseParam('zone', "the other player's trick", TWO)).toEqual({ error: '“the trick” is shared, so it has no owner.' });
    });
    it('is no zone of its own name', () => {
      expect(parseParam('zone', 'the other player', TWO)).toBeNull();
      expect(parseParam('zone', "the other players's hand", TWO)).toBeNull();
    });
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
  it('reads one or more players, each as a single player is read', () => {
    expect(parseParam('players', 'p0', V)).toEqual({ value: ['p0'] });
    expect(parseParam('players', 'P0 and p1', V)).toEqual({ value: ['p0', 'p1'] });
    expect(parseParam('players', 'p0, p1 and p2', V)).toEqual({ value: ['p0', 'p1', 'p2'] });
    expect(parseParam('players', 'p0, p1, and p2', V)).toEqual({ value: ['p0', 'p1', 'p2'] });
    expect(parseParam('players', 'p0 and p7', V)).toEqual({ error: 'This game only has players p0 to p3.' });
    expect(parseParam('players', 'p0 and bob', V)).toBeNull();
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
  it('spells -y and -o verbs the way English does', () => {
    expect([thirdPerson('bury'), thirdPerson('carry'), thirdPerson('go')]).toEqual(['buries', 'carries', 'goes']);
    // A vowel before the y keeps it.
    expect([thirdPerson('play'), thirdPerson('buy')]).toEqual(['plays', 'buys']);
    expect(parseParam('move', 'buries', { ...V, verbs: ['bury'] })).toEqual({ value: 'bury' });
  });
  it('reads phases and attributes from the vocabulary', () => {
    expect(parseParam('phase', 'Passing', V)).toEqual({ value: 'passing' });
    expect(parseParam('phase', 'scoring', V)).toBeNull();
    expect(parseParam('attribute', 'number', V)).toEqual({ value: 'number' });
    expect(parseParam('attribute', 'suit', V)).toBeNull();
  });
  it('reads a card attribute in the singular too, as a count of one says it', () => {
    const charged = vocabFrom({ maxPlayers: 2, facts: [{ name: 'charges', on: 'card', kind: 'number' }] });
    expect(parseParam('attribute', 'charge', charged)).toEqual({ value: 'charges' });
    expect(parseParam('attribute', 'charges', charged)).toEqual({ value: 'charges' });
    expect(parseParam('attribute', 'Charge', charged)).toEqual({ value: 'charges' });
    expect(parseParam('attribute', 'chargess', charged)).toBeNull();
    // A name with no singular is read as it is, and a singular is no name of its own.
    expect(parseParam('attribute', 'number', V)).toEqual({ value: 'number' });
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

describe('board references', () => {
  const v = BOARD;

  it('reads a space by name, whatever the capitals or apostrophes', () => {
    expect(parseParam('space', 'Rose Lane', v)).toEqual({ value: 5 });
    expect(parseParam('space', 'ROSE LANE', v)).toEqual({ value: 5 });
    expect(parseParam('space', 'bishop’s row', v)).toEqual({ value: 8 });
    expect(parseParam('space', 'BISHOP‘S ROW', v)).toEqual({ value: 8 });
    expect(parseParam('space', 'Go', v)).toEqual({ value: 0 });
  });
  it('refuses a name two spaces share', () => {
    expect(parseParam('space', 'Chance', v)).toEqual({ error: 'There are 2 spaces called “Chance”, so this can\'t tell which one.' });
    expect(parseParam('space', 'chance', v)).toEqual({ error: 'There are 2 spaces called “Chance”, so this can\'t tell which one.' });
  });
  it('does not find a space inside a longer word, or in a game with no board', () => {
    expect(parseParam('space', 'Gone', v)).toBeNull();
    expect(parseParam('space', 'Rose Lanes', v)).toBeNull();
    expect(parseParam('space', 'Go', emptyVocab())).toBeNull();
  });

  it('reads kinds of space from one column', () => {
    expect(parseParam('spaceclass', 'a street or station', v)).toEqual({ value: { attribute: 'kind', values: ['street', 'station'] } });
    expect(parseParam('spaceclass', 'a tax space', v)).toEqual({ value: { attribute: 'kind', values: ['tax'] } });
    expect(parseParam('spaceclass', 'an utility', v)).toEqual({ value: { attribute: 'kind', values: ['utility'] } });
    expect(parseParam('spaceclass', 'A Brown or Green space', v)).toEqual({ value: { attribute: 'color', values: ['brown', 'green'] } });
  });
  it('says when kinds of space come from different columns', () => {
    expect(parseParam('spaceclass', 'a street or brown', v)).toEqual({ error: '“a street or brown” mixes kind and color.' });
    expect(parseParam('spaceclass', 'a brown or station or orange', v)).toEqual({ error: '“a brown or station or orange” mixes color and kind.' });
  });
  it('says when one value belongs to two columns', () => {
    const both = vocabFrom({
      maxPlayers: 2,
      board: { ...fixtureBoardGame().board!, spaces: [{ name: 'A', attrs: { kind: 'green', color: 'green' } }, { name: 'B', attrs: { kind: 'tax' } }] },
    });
    expect(parseParam('spaceclass', 'a green space', both)).toEqual({ error: '“green” could be kind or color.' });
    expect(parseParam('spaceclass', 'a tax or green', both)).toEqual({ error: '“green” could be kind or color.' });
  });
  it('only reads the text cells of the table as kinds of space', () => {
    expect(parseParam('spaceclass', 'a 60 space', v)).toBeNull();
    expect(parseParam('spaceclass', 'street', v)).toBeNull();
    expect(parseParam('spaceclass', 'a street', emptyVocab())).toBeNull();
  });

  it('reads the singular of a counter the game declares in the plural, as the name it declared', () => {
    const board = {
      ...fixtureBoardGame().board!,
      counters: [
        { name: 'actions', start: 3, visibility: 'public' as const, perTurn: true },
        { name: 'money', start: 0, visibility: 'public' as const, perTurn: false },
      ],
    };
    const counting = vocabFrom({ maxPlayers: 2, board });
    expect(parseParam('counter', 'action', counting)).toEqual({ value: 'actions' });
    expect(parseParam('counter', 'actions', counting)).toEqual({ value: 'actions' });
    expect(parseParam('counter', 'money', counting)).toEqual({ value: 'money' });
  });

  it('reads counters, space details, actions and what was done', () => {
    expect(parseParam('counter', 'money', v)).toEqual({ value: 'money' });
    expect(parseParam('counter', 'Money', v)).toEqual({ value: 'money' });
    expect(parseParam('spaceattr', 'rent', v)).toEqual({ value: 'rent' });
    expect(parseParam('action', 'ends their turn', v)).toEqual({ value: 'end their turn' });
    expect(parseParam('action', 'rolls the dice', v)).toEqual({ value: 'roll the dice' });
    expect(parseParam('action', 'Buys the space they are on', v)).toEqual({ value: 'buy the space they are on' });
    expect(parseParam('done', 'rolled', v)).toEqual({ value: ['roll the dice'] });
    expect(parseParam('done', 'bought', v)).toEqual({ value: ['buy the space they are on'] });
    expect(parseParam('done', 'ended', v)).toEqual({ value: ['end their turn'] });
  });
  it('reads what was done as every button that has the verb', () => {
    const building = vocabFrom({
      maxPlayers: 2,
      actions: [
        { verb: 'build', words: 'build a house', base: 'build a house', targeted: false, anyone: false, amount: false, picksPlayer: false },
        { verb: 'build', words: 'build a hotel', base: 'build a hotel', targeted: false, anyone: false, amount: false, picksPlayer: false },
        { verb: 'end', words: 'end their turn', base: 'end their turn', targeted: false, anyone: false, amount: false, picksPlayer: false },
      ],
    });
    expect(parseParam('done', 'built', building)).toEqual({ value: ['build a house', 'build a hotel'] });
    expect(parseParam('done', 'built a hotel', building)).toEqual({ value: ['build a hotel'] });
    expect(parseParam('done', 'ended', building)).toEqual({ value: ['end their turn'] });
    expect(parseParam('action', 'builds a hotel', building)).toEqual({ value: 'build a hotel' });
    // The same wording in two phases is still one button.
    const roll = { verb: 'roll', words: 'roll the dice', base: 'roll the dice', targeted: false, anyone: false, amount: false, picksPlayer: false };
    const twice = vocabFrom({ maxPlayers: 2, actions: [roll, roll] });
    expect(parseParam('done', 'rolled', twice)).toEqual({ value: ['roll the dice'] });
  });
  it('reads a bare participle as every button with that verb, and a whole done-wording as one button', () => {
    const rolls = vocabFrom({ maxPlayers: 2, actions: [
      { verb: 'roll', words: 'roll the dice', base: 'roll the dice', targeted: false, anyone: false, amount: false, picksPlayer: false },
      { verb: 'roll', words: 'roll for a double', base: 'roll for a double', targeted: false, anyone: false, amount: false, picksPlayer: false },
      { verb: 'end', words: 'end their turn', base: 'end their turn', targeted: false, anyone: false, amount: false, picksPlayer: false },
    ] });
    expect(parseParam('done', 'rolled', rolls)).toEqual({ value: ['roll the dice', 'roll for a double'] });
    expect(parseParam('done', 'Rolled For A Double', rolls)).toEqual({ value: ['roll for a double'] });
    expect(parseParam('done', 'rolled the dice', rolls)).toEqual({ value: ['roll the dice'] });
    expect(parseParam('done', 'ended their turn', rolls)).toEqual({ value: ['end their turn'] });
    expect(parseParam('done', 'ended', rolls)).toEqual({ value: ['end their turn'] });
    expect(parseParam('done', 'rolled two doubles', rolls)).toBeNull();
  });
  it('never reads what was done as a button any player may press, and says so', () => {
    const waving = vocabFrom({
      maxPlayers: 2,
      actions: [
        { verb: 'end', words: 'end their turn', base: 'end their turn', targeted: false, anyone: false, amount: false, picksPlayer: false },
        { verb: 'wave', words: 'wave', base: 'wave', targeted: false, anyone: true, amount: false, picksPlayer: false },
        { verb: 'wave', words: 'wave to the crowd', base: 'wave to the crowd', targeted: false, anyone: false, amount: false, picksPlayer: false },
        { verb: 'plant', words: 'plant a flag on a street they own', base: 'plant a flag', targeted: true, anyone: true, amount: false, picksPlayer: false },
      ],
    });
    // The word is still recognised, so it is the reason that is given rather than “I don't understand”.
    const never = (text: string) => ({ error: `“${text}” names a button any player may press at any time, which is never part of a turn.` });
    expect(parseParam('done', 'planted', waving)).toEqual(never('planted'));
    expect(parseParam('done', 'Planted A Flag', waving)).toEqual(never('Planted A Flag'));
    expect(parseParam('done', 'waved to the crowd', waving)).toEqual({ value: ['wave to the crowd'] });
    // A bare participle that a button of the turn shares with one anyone may press is that button alone.
    expect(parseParam('done', 'waved', waving)).toEqual({ value: ['wave to the crowd'] });
    expect(parseParam('done', 'ended', waving)).toEqual({ value: ['end their turn'] });
    const alone = vocabFrom({ maxPlayers: 2, actions: [{ verb: 'wave', words: 'wave', base: 'wave', targeted: false, anyone: true, amount: false, picksPlayer: false }] });
    expect(parseParam('done', 'waved', alone)).toEqual(never('waved'));
  });
  it('reads a button that picks a target as {targetaction}, by the third person of its base, and never as {action}', () => {
    expect(parseParam('targetaction', 'builds a house', v)).toEqual({ value: 'build a house on a street they own' });
    expect(parseParam('targetaction', 'Builds a House', v)).toEqual({ value: 'build a house on a street they own' });
    // Its whole wording is not what an example says: it says the base, then where.
    expect(parseParam('targetaction', 'builds a house on a street they own', v)).toBeNull();
    expect(parseParam('action', 'builds a house', v)).toBeNull();
    expect(parseParam('action', 'builds a house on a street they own', v)).toBeNull();
    // A plain button is not one that takes a target.
    expect(parseParam('targetaction', 'rolls the dice', v)).toBeNull();
    expect(parseParam('targetaction', 'builds a house', emptyVocab())).toBeNull();
  });
  it('reads a button that carries an amount as {amountaction} by the third person of its base, and as {action} by its whole wording', () => {
    const carrying = vocabFrom({
      maxPlayers: 2,
      actions: [
        { verb: 'roll', words: 'roll the dice', base: 'roll the dice', targeted: false, anyone: false, amount: false, picksPlayer: false },
        { verb: 'raise', words: 'raise an amount', base: 'raise', targeted: false, anyone: false, amount: true, picksPlayer: false },
      ],
    });
    expect(parseParam('amountaction', 'raises', carrying)).toEqual({ value: 'raise an amount' });
    expect(parseParam('amountaction', 'Raises', carrying)).toEqual({ value: 'raise an amount' });
    expect(parseParam('amountaction', 'rolls the dice', carrying)).toBeNull();
    expect(parseParam('amountaction', 'raises', emptyVocab())).toBeNull();
    // Said with its whole wording, a press carries no amount.
    expect(parseParam('action', 'raises an amount', carrying)).toEqual({ value: 'raise an amount' });
    expect(parseParam('action', 'raises', carrying)).toBeNull();
  });
  it('reads a button that picks another player as {pickaction} by the third person of its base, and as {action} by its whole wording', () => {
    const picking = vocabFrom({
      maxPlayers: 2,
      actions: [
        { verb: 'roll', words: 'roll the dice', base: 'roll the dice', targeted: false, anyone: false, amount: false, picksPlayer: false },
        { verb: 'trade', words: 'trade with another player', base: 'trade with', targeted: false, anyone: false, amount: false, picksPlayer: true },
      ],
    });
    expect(parseParam('pickaction', 'trades with', picking)).toEqual({ value: 'trade with another player' });
    expect(parseParam('pickaction', 'Trades With', picking)).toEqual({ value: 'trade with another player' });
    expect(parseParam('pickaction', 'rolls the dice', picking)).toBeNull();
    expect(parseParam('pickaction', 'trades with', emptyVocab())).toBeNull();
    // Said with its whole wording, a press picks no one.
    expect(parseParam('action', 'trades with another player', picking)).toEqual({ value: 'trade with another player' });
    expect(parseParam('action', 'trades with', picking)).toBeNull();
  });
  it('says so when two buttons that pick a target share a base, since an example could not tell them apart', () => {
    const both = vocabFrom({
      maxPlayers: 2,
      actions: [
        { verb: 'build', words: 'build a house on a street they own', base: 'build a house', targeted: true, anyone: false, amount: false, picksPlayer: false },
        { verb: 'build', words: 'build a house on a station they own', base: 'build a house', targeted: true, anyone: false, amount: false, picksPlayer: false },
      ],
    });
    expect(parseParam('targetaction', 'builds a house', both)).toEqual({
      error: '“builds a house” could mean “build a house on a street they own” or “build a house on a station they own”.',
    });
  });
  it('reads what was done by a button that picks a target as the button, by its whole wording', () => {
    expect(parseParam('done', 'built', v)).toEqual({ value: ['build a house on a street they own'] });
    expect(parseParam('done', 'built a house on a street they own', v)).toEqual({ value: ['build a house on a street they own'] });
  });
  it('reads what was done by a button that picks a target as its base too, since the target is not part of what was done', () => {
    expect(parseParam('done', 'built a house', v)).toEqual({ value: ['build a house on a street they own'] });
    expect(parseParam('done', 'Built A House', v)).toEqual({ value: ['build a house on a street they own'] });
    // Two buttons that share a base are both what was done; a rule asking whether either was pressed is still clear.
    const both = vocabFrom({
      maxPlayers: 2,
      actions: [
        { verb: 'build', words: 'build a house on a street they own', base: 'build a house', targeted: true, anyone: false, amount: false, picksPlayer: false },
        { verb: 'build', words: 'build a house on a station they own', base: 'build a house', targeted: true, anyone: false, amount: false, picksPlayer: false },
      ],
    });
    expect(parseParam('done', 'built a house', both)).toEqual({ value: ['build a house on a street they own', 'build a house on a station they own'] });
    // A button's own wording still wins over another's base, and a base is no wording for a button that takes no target.
    const plain = vocabFrom({
      maxPlayers: 2,
      actions: [
        { verb: 'build', words: 'build a house on a street they own', base: 'build a house', targeted: true, anyone: false, amount: false, picksPlayer: false },
        { verb: 'build', words: 'build a house', base: 'build a house', targeted: false, anyone: false, amount: false, picksPlayer: false },
      ],
    });
    expect(parseParam('done', 'built a house', plain)).toEqual({ value: ['build a house'] });
    expect(parseParam('done', 'built a house on a street', v)).toBeNull();
  });
  it('does not read what the game does not have', () => {
    expect(parseParam('counter', 'gold', v)).toBeNull();
    expect(parseParam('spaceattr', 'colour', v)).toBeNull();
    expect(parseParam('action', 'roll the dice', v)).toBeNull();
    expect(parseParam('done', 'sold', v)).toBeNull();
    for (const type of ['space', 'spaceclass', 'spaceattr', 'counter', 'action', 'done']) {
      expect(parseParam(type, 'roll', emptyVocab())).toBeNull();
    }
  });
});

describe('facts and the bank', () => {
  const v = FACTS;

  it('reads a kind of space as a bare value of a column, in the singular or the plural', () => {
    expect(parseParam('spacekind', 'street', v)).toEqual({ value: { attribute: 'kind', values: ['street'] } });
    expect(parseParam('spacekind', 'streets', v)).toEqual({ value: { attribute: 'kind', values: ['street'] } });
    expect(parseParam('spacekind', 'Stations', v)).toEqual({ value: { attribute: 'kind', values: ['station'] } });
    expect(parseParam('spacekind', 'taxes', v)).toEqual({ value: { attribute: 'kind', values: ['tax'] } });
    expect(parseParam('spacekind', 'utilities', v)).toEqual({ value: { attribute: 'kind', values: ['utility'] } });
    expect(parseParam('spacekind', 'orange', v)).toEqual({ value: { attribute: 'color', values: ['orange'] } });
  });
  it('wants the kind of space without an article, an "or" or a "space" after it', () => {
    for (const text of ['a street', 'the streets', 'street or station', 'street space', '60', 'streetss', 'str']) {
      expect(parseParam('spacekind', text, v)).toBeNull();
    }
    expect(parseParam('spacekind', 'street', emptyVocab())).toBeNull();
  });
  it('says when one value belongs to two columns', () => {
    const both = vocabFrom({
      maxPlayers: 2,
      board: { ...fixtureBoardGame().board!, spaces: [{ name: 'A', attrs: { kind: 'green', color: 'green' } }, { name: 'B', attrs: { kind: 'tax' } }] },
    });
    expect(parseParam('spacekind', 'green', both)).toEqual({ error: '“green” could be kind or color.' });
    expect(parseParam('spacekind', 'greens', both)).toEqual({ error: '“greens” could be kind or color.' });
    expect(parseParam('spacekind', 'tax', both)).toEqual({ value: { attribute: 'kind', values: ['tax'] } });
  });

  it('reads the facts of spaces by kind of fact', () => {
    expect(parseParam('spaceflag', 'hotel', v)).toEqual({ value: 'hotel' });
    expect(parseParam('spaceflag', 'Hotel', v)).toEqual({ value: 'hotel' });
    expect(parseParam('spacenumber', 'houses', v)).toEqual({ value: 'houses' });
    // A number is also said in the singular beside a count of one: "1 house".
    expect(parseParam('spacenumber', 'house', v)).toEqual({ value: 'houses' });
    for (const [type, text] of [
      ['spaceflag', 'houses'], ['spaceflag', 'poisoned'], ['spaceflag', 'in jail'], ['spaceflag', 'a hotel'],
      ['spacenumber', 'hotel'], ['spacenumber', 'health'], ['spacenumber', 'an houses'],
    ]) {
      expect(parseParam(type, text, v)).toBeNull();
    }
  });
  it('reads the flags of cards, and no other fact', () => {
    expect(parseParam('cardflag', 'poisoned', v)).toEqual({ value: 'poisoned' });
    expect(parseParam('cardflag', 'POISONED', v)).toEqual({ value: 'poisoned' });
    for (const text of ['health', 'hotel', 'in jail', 'poison']) expect(parseParam('cardflag', text, v)).toBeNull();
  });
  it('reads a multi-word fact name whole', () => {
    const jail = vocabFrom({ maxPlayers: 2, facts: [{ name: 'in jail', on: 'card', kind: 'flag' }, { name: 'jail', on: 'card', kind: 'flag' }] });
    expect(parseParam('cardflag', 'in jail', jail)).toEqual({ value: 'in jail' });
    expect(parseParam('cardflag', 'jail', jail)).toEqual({ value: 'jail' });
  });

  it('reads the facts of players by kind of fact, a number in the singular too', () => {
    const players = vocabFrom({
      maxPlayers: 2,
      facts: [{ name: 'in jail', on: 'player', kind: 'flag' }, { name: 'jail turns', on: 'player', kind: 'number' }, { name: 'hotel', on: 'space', kind: 'flag' }],
    });
    expect(parseParam('playerflag', 'In Jail', players)).toEqual({ value: 'in jail' });
    expect(parseParam('playernumber', 'jail turns', players)).toEqual({ value: 'jail turns' });
    expect(parseParam('playernumber', 'Jail Turn', players)).toEqual({ value: 'jail turns' });
    for (const [type, text] of [
      ['playerflag', 'jail turns'], ['playerflag', 'jail turn'], ['playerflag', 'hotel'], ['playernumber', 'in jail'], ['playernumber', 'jail'],
    ]) {
      expect(parseParam(type, text, players)).toBeNull();
    }
    // A fact of a space or a card says nothing of players, and the other way round.
    expect(parseParam('spaceflag', 'in jail', players)).toBeNull();
    expect(parseParam('cardflag', 'in jail', players)).toBeNull();
    for (const type of ['playerflag', 'playernumber']) expect(parseParam(type, 'in jail', emptyVocab())).toBeNull();
  });

  it('reads a thing in the bank in the singular or the plural, and the article belongs to the phrase', () => {
    expect(parseParam('banked', 'house', v)).toEqual({ value: 'houses' });
    expect(parseParam('banked', 'houses', v)).toEqual({ value: 'houses' });
    expect(parseParam('banked', 'Hotel', v)).toEqual({ value: 'hotels' });
    expect(parseParam('banked', 'HOTELS', v)).toEqual({ value: 'hotels' });
    for (const text of ['a house', 'an hotel', 'the houses', 'hotelss', 'hous', 'health']) expect(parseParam('banked', text, v)).toBeNull();
  });
  it('knows the singular of a bank name that does not just lose its s', () => {
    const bank = vocabFrom({
      maxPlayers: 2,
      board: { ...fixtureBoardGame().board!, bank: ['boxes', 'pennies', 'glasses', 'tokens'].map((name) => ({ name, start: 1 })) },
    });
    expect(['box', 'penny', 'glass', 'token', 'pennies'].map((text) => parseParam('banked', text, bank))).toEqual([
      { value: 'boxes' }, { value: 'pennies' }, { value: 'glasses' }, { value: 'tokens' }, { value: 'pennies' },
    ]);
  });
  it('reads nothing of what the game does not declare', () => {
    for (const type of ['spacekind', 'spaceflag', 'spacenumber', 'cardflag', 'playerflag', 'playernumber', 'banked']) {
      expect(parseParam(type, 'hotel', emptyVocab())).toBeNull();
      expect(parseParam(type, 'hotel', BOARD)).toBeNull();
    }
  });
});

describe('the player who holds a flag', () => {
  const flags = vocabFrom({
    maxPlayers: 4, facts: [{ name: 'leading', on: 'player', kind: 'flag' }, { name: 'the rival', on: 'player', kind: 'flag' }],
  });

  it('reads “the player who is …” with any flag players can have, as that flag', () => {
    expect(parseParam('holder', 'the player who is leading', flags)).toEqual({ value: 'leading' });
    for (const text of ['the player who is the rival', 'the rival', 'The Rival']) expect(parseParam('holder', text, flags), text).toEqual({ value: 'the rival' });
  });
  it('reads a flag alone only when its name starts with “the”, and no flag the game does not declare', () => {
    expect(parseParam('holder', 'leading', flags)).toBeNull();
    expect(parseParam('holder', 'the player who is asleep', flags)).toBeNull();
  });
});

describe('plurals', () => {
  it('makes the plural of a noun', () => {
    expect(['street', 'tax', 'church', 'dish', 'glass', 'penny', 'day', 'go to jail'].map(plural)).toEqual([
      'streets', 'taxes', 'churches', 'dishes', 'glasses', 'pennies', 'days', 'go to jails',
    ]);
  });
  it('gives every singular a plural could come from', () => {
    expect(singularForms('tokens')).toEqual(['token']);
    expect(singularForms('boxes')).toEqual(['boxe', 'box']);
    expect(singularForms('pennies')).toEqual(['pennie', 'penny']);
    expect(singularForms('glasses')).toEqual(['glasse', 'glass']);
    expect(singularForms('moss')).toEqual([]);
    expect(singularForms('money')).toEqual([]);
  });
  it('counts a plural name, in its singular for one', () => {
    expect([counted(3, 'tokens'), counted(1, 'tokens'), counted(0, 'tokens')]).toEqual(['3 tokens', '1 token', '0 tokens']);
    // Of the singulars "boxes" may come from, the one with the most taken off.
    expect([counted(1, 'boxes'), counted(1, 'pennies'), counted(1, 'glasses')]).toEqual(['1 box', '1 penny', '1 glass']);
    // A name no singular comes from is left as it is.
    expect(counted(1, 'money')).toBe('1 money');
  });
  it('keeps a name that ends in “us” as it is, for one as for any other number', () => {
    expect([counted(1, 'bonus'), counted(2, 'bonus'), counted(1, 'status'), counted(1, 'extra bonus')]).toEqual(['1 bonus', '2 bonus', '1 status', '1 extra bonus']);
    expect(counted(1, 'Bonus')).toBe('1 Bonus');
  });
});

describe('verb forms', () => {
  it('puts the verb of a wording in the past, and leaves the rest as it is', () => {
    expect(['roll for a double', 'end their turn', 'build a house on a street they own', 'pay'].map(pastWording)).toEqual([
      'rolled for a double', 'ended their turn', 'built a house on a street they own', 'paid',
    ]);
  });
  it('makes participles', () => {
    expect(['roll', 'end', 'buy', 'draw', 'trade', 'bury', 'play'].map(participle))
      .toEqual(['rolled', 'ended', 'bought', 'drawn', 'traded', 'buried', 'played']);
  });
  it.each([
    ['buy', 'bought'], ['draw', 'drawn'], ['pay', 'paid'], ['build', 'built'], ['sell', 'sold'], ['take', 'taken'], ['give', 'given'],
    ['throw', 'thrown'], ['put', 'put'], ['go', 'gone'], ['make', 'made'], ['get', 'got'], ['win', 'won'], ['lose', 'lost'], ['hold', 'held'],
    ['keep', 'kept'], ['leave', 'left'], ['bid', 'bid'], ['deal', 'dealt'], ['spend', 'spent'], ['choose', 'chosen'],
  ])('knows that %s is %s', (verb, done) => expect(participle(verb)).toBe(done));
  it('doubles the last consonant of a short verb, and leaves longer verbs and w, x and y alone', () => {
    expect(['stop', 'skip', 'swap', 'plan', 'roll', 'play', 'open', 'visit', 'run'].map(participle))
      .toEqual(['stopped', 'skipped', 'swapped', 'planned', 'rolled', 'played', 'opened', 'visited', 'run']);
    expect(['show', 'fix', 'end', 'pass'].map(participle)).toEqual(['showed', 'fixed', 'ended', 'passed']);
  });
  it('adds d after an e, turns a consonant and y into ied, and otherwise adds ed', () => {
    expect(participle('use')).toBe('used');
    expect(participle('carry')).toBe('carried');
    expect(participle('stay')).toBe('stayed');
    expect(participle('pass')).toBe('passed');
  });

  it('puts only the first word of an action in the third person', () => {
    expect(thirdPersonWords('end their turn')).toBe('ends their turn');
    expect(thirdPersonWords('roll the dice')).toBe('rolls the dice');
    expect(thirdPersonWords('buy the space they are on')).toBe('buys the space they are on');
    expect(thirdPersonWords('pass')).toBe('passes');
    expect(thirdPersonWords('try again')).toBe('tries again');
    expect(thirdPersonWords('')).toBe('');
  });
  it('speaks to the player: they, their, them and themselves become you, your, you and yourself', () => {
    expect(secondPersonWords('end their turn')).toBe('end your turn');
    expect(secondPersonWords('buy the space they are on')).toBe('buy the space you are on');
    expect(secondPersonWords('a street they own')).toBe('a street you own');
    expect(secondPersonWords('swap with them')).toBe('swap with you');
    expect(secondPersonWords('save themselves')).toBe('save yourself');
    expect(secondPersonWords("skip a go if they're broke")).toBe("skip a go if you're broke");
    expect(secondPersonWords('build a house')).toBe('build a house');
  });
  it('swaps whole words only when speaking to the player, and keeps the other words as they are', () => {
    expect(secondPersonWords('thank theirs then')).toBe('thank theirs then');
    expect(secondPersonWords('gather them there')).toBe('gather you there');
    expect(secondPersonWords('Rose Lane')).toBe('Rose Lane');
    expect(secondPersonWords('')).toBe('');
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
  it('matches spaces, kinds of space, counters, actions and what was done as arguments', () => {
    const l = lib()
      .moment('a player lands on {spaceclass} someone else owns', () => true)
      .effect('they pay its {spaceattr} to {space}', (env) => env.state)
      .condition('{player} has {done} this turn and at least {count} {counter}', () => true)
      .action('{player} {action}', () => ({ by: 'p0', move: { type: 'end their turn' } }));
    expect(l.match('moment', 'A player lands on a street or station someone else owns', BOARD)).toEqual({
      status: 'ok', pattern: 'a player lands on {spaceclass} someone else owns',
      args: [{ attribute: 'kind', values: ['street', 'station'] }],
    });
    expect(l.match('effect', 'They pay its rent to Rose Lane', BOARD)).toMatchObject({ status: 'ok', args: ['rent', 5] });
    expect(l.match('effect', 'They pay its rent to Chance', BOARD)).toEqual({
      status: 'invalid', message: 'There are 2 spaces called “Chance”, so this can\'t tell which one.',
    });
    expect(l.match('condition', 'p1 has rolled this turn and at least two money', BOARD)).toMatchObject({ status: 'ok', args: ['p1', ['roll the dice'], 2, 'money'] });
    expect(l.match('action', 'p0 ends their turn', BOARD)).toMatchObject({ status: 'ok', args: ['p0', 'end their turn'] });
  });
  it('turns a space the game never defined into a designer message', () => {
    const l = lib().effect('they pay its {spaceattr} to {space}', (env) => env.state);
    expect(l.misnamed(['effect'], 'They pay its rent to Rose Lne', BOARD)).toEqual({
      kind: 'effect', problem: { message: 'There is no space called “Rose Lne”.', suggestions: ['Rose Lane'] },
    });
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

describe('names the game never defined', () => {
  /** What the type says about text shaped like it that its strict pattern does not cover. */
  const misnamed = (type: string, text: string, vocab: Vocab = V) => {
    const found = VOCAB_TYPES.find((t) => t.name === type)!;
    return found.loose!.explain(text, vocab);
  };
  const missing = (what: string, name: string, suggestions: string[]) => ({ message: `There is no ${what} called “${name}”.`, suggestions });

  // Actions and what was done are phrases of their own, not names to misspell, so they have no loose shape.
  const NAMES = VOCAB_TYPES.filter((t) => !['action', 'targetaction', 'amountaction', 'pickaction', 'cardaction', 'done'].includes(t.name));

  it('gives every type of names a loose shape, and no other', () => {
    expect(VOCAB_TYPES.filter((t) => t.loose).map((t) => t.name)).toEqual(NAMES.map((t) => t.name));
  });

  it.each([V, BOARD, FACTS, emptyVocab()])('every type has a loose source with no capture groups that does not match empty text', (vocab) => {
    for (const type of NAMES) {
      const source = type.loose!.source(vocab);
      expect(new RegExp(`${source}|`).exec('')).toHaveLength(1);
      expect(new RegExp(`^(?:${source})$`, 'i').test('')).toBe(false);
    }
  });

  it('names a zone with the closest zones, or the zones there are when none is close', () => {
    expect(misnamed('zone', 'the trik')).toEqual(missing('zone', 'trik', ['trick']));
    expect(misnamed('zone', "the winner's wonpile")).toEqual(missing('zone', 'wonpile', ['won pile']));
    expect(misnamed('zone', 'Their Hnad')).toEqual(missing('zone', 'Hnad', ['hand']));
    expect(misnamed('zone', 'the graveyard')).toEqual(missing('zone', 'graveyard', ['trick', 'deck', 'draw pile']));
  });

  it("names a misspelt zone of the other player's, not “other player's hnad”", () => {
    expect(misnamed('zone', "the other player's hnad")).toEqual(missing('zone', 'hnad', ['hand']));
    expect(misnamed('zone', "the other player's hand twice")).toBeNull();
  });

  it('leaves text that holds a real zone among other words to other phrases', () => {
    expect(misnamed('zone', 'the deck twice')).toBeNull();
    expect(misnamed('zone', 'the top card of the deck')).toBeNull();
  });

  it('finds the misnamed zone in a list', () => {
    expect(misnamed('zones', 'every hand and the trik')).toEqual(missing('zone', 'trik', ['trick']));
    expect(misnamed('zones', 'the deck twice and the trick')).toBeNull();
  });

  it('says when a zone each player has is wanted', () => {
    expect(misnamed('perzone', 'hnad')).toEqual(missing('zone', 'hnad', ['hand']));
    expect(misnamed('perzone', 'deck')).toEqual({ message: '“deck” is shared, but this needs a zone that each player has.', suggestions: ['hand', 'pass pile', 'won pile'] });
  });

  it('names a player only for text that looks like a seat', () => {
    expect(misnamed('player', 'player1')).toEqual({ message: 'There is no player called “player1”. Players are called p0 to p3.', suggestions: ['p1'] });
    expect(misnamed('player', 'player9')).toEqual({ message: 'There is no player called “player9”. Players are called p0 to p3.', suggestions: [] });
    expect(misnamed('player', 'nobody')).toBeNull();
    expect(misnamed('players', 'p0 and player1')).toEqual({ message: 'There is no player called “player1”. Players are called p0 to p3.', suggestions: ['p1'] });
    expect(misnamed('players', 'p0 and nobody')).toBeNull();
  });

  it('names phases, moves and card attributes', () => {
    expect(misnamed('phase', 'playng')).toEqual(missing('phase', 'playng', ['playing']));
    expect(misnamed('phase', 'playing now')).toBeNull();
    expect(misnamed('move', 'plyas')).toEqual(missing('move', 'plyas', ['plays']));
    expect(misnamed('attribute', 'colour')).toEqual(missing('card attribute', 'colour', ['color']));
    // The singular of a count is a name the game has, so it is not reported; a misspelling of it is.
    const charged = vocabFrom({ maxPlayers: 2, facts: [{ name: 'charges', on: 'card', kind: 'number' }] });
    expect(misnamed('attribute', 'charge', charged)).toBeNull();
    expect(misnamed('attribute', 'chrage', charged)).toEqual(missing('card attribute', 'chrage', ['charges']));
  });

  it('names the suit, rank or card value that is not one', () => {
    expect(misnamed('card', 'the 2 of clbs')).toEqual(missing('suit', 'clbs', ['clubs']));
    expect(misnamed('card', 'the jak of spades')).toEqual(missing('rank', 'jak', ['jack']));
    expect(misnamed('card', 'a purple 7')).toEqual(missing('card value', 'purple', []));
    expect(misnamed('card', 'a reed 7')).toEqual(missing('card value', 'reed', ['red']));
    expect(misnamed('cardlist', 'the 2 of clubs and the 3 of clbs')).toEqual(missing('suit', 'clbs', ['clubs']));
    expect(misnamed('cardclass', 'a hart')).toEqual(missing('suit', 'hart', ['heart', 'hearts']));
    expect(misnamed('cardclass', 'reed cards')).toEqual(missing('card value', 'reed', ['red']));
  });

  it('names a space with the closest names, counting a shared name once', () => {
    const board = vocabFrom({ maxPlayers: 2, board: fixtureBoardGame().board });
    expect(misnamed('space', 'Rose Lne', board)).toEqual(missing('space', 'Rose Lne', ['Rose Lane']));
    expect(misnamed('space', 'Chanse', board)).toEqual(missing('space', 'Chanse', ['Chance']));
    expect(misnamed('space', 'Boardwalk', board)).toEqual(missing('space', 'Boardwalk', ['Go', 'Mill Lane', 'Income Tax']));
    expect(misnamed('space', 'Rose Lane twice', board)).toBeNull();
    expect(misnamed('space', 'Chance twice', board)).toBeNull();
  });

  it('names a kind of space by the word that is no value in the board\'s table', () => {
    const board = vocabFrom({ maxPlayers: 2, board: fixtureBoardGame().board });
    expect(misnamed('spaceclass', 'a taks space', board)).toEqual(missing('kind of space', 'taks', ['tax']));
    expect(misnamed('spaceclass', 'a street or stattion', board)).toEqual(missing('kind of space', 'stattion', ['station']));
    expect(misnamed('spaceclass', 'an utilty space', board)).toEqual(missing('kind of space', 'utilty', ['utility']));
    expect(misnamed('spaceclass', 'a street or station', board)).toBeNull();
  });

  it('gives a kind of space a loose shape of its own, only on a board that has words in its table', () => {
    const board = vocabFrom({ maxPlayers: 2, board: fixtureBoardGame().board });
    const shaped = (text: string, vocab: Vocab) => {
      const loose = VOCAB_TYPES.find((t) => t.name === 'spaceclass')!.loose!;
      return new RegExp(`^(?:${loose.source(vocab)})$`, 'i').test(text);
    };
    expect(['a taks space', 'an inn', 'a street or stattion', 'A Taks Space'].map((t) => shaped(t, board))).toEqual([true, true, true, true]);
    expect(['Rose Lne', 'a free parking space', 'the taks space', 'a street, station'].map((t) => shaped(t, board))).toEqual([false, false, false, false]);
    expect(shaped('a taks space', V)).toBe(false);
  });

  it('names counters and space details', () => {
    const board = vocabFrom({ maxPlayers: 2, board: fixtureBoardGame().board });
    expect(misnamed('counter', 'mony', board)).toEqual(missing('counter', 'mony', ['money']));
    expect(misnamed('counter', 'money twice', board)).toBeNull();
    expect(misnamed('spaceattr', 'rnt', board)).toEqual(missing('space detail', 'rnt', ['rent']));
    expect(misnamed('spaceattr', 'rent twice', board)).toBeNull();
  });

  it('names a kind of space by the word that is no value in the board\'s table, in the singular or the plural', () => {
    const board = vocabFrom({ maxPlayers: 2, board: fixtureBoardGame().board });
    expect(misnamed('spacekind', 'stret', board)).toEqual(missing('kind of space', 'stret', ['street']));
    expect(misnamed('spacekind', 'taks', board)).toEqual(missing('kind of space', 'taks', ['tax']));
    // The suggestions are the words of the table, whichever way the mistake was written.
    expect(misnamed('spacekind', 'strets', board)).toEqual(missing('kind of space', 'strets', ['street']));
    expect(misnamed('spacekind', 'streets twice', board)).toBeNull();
    expect(misnamed('spacekind', 'street twice', board)).toBeNull();
  });
  it('names a fact of a space or a card, with the facts of that kind closest to it', () => {
    expect(misnamed('spaceflag', 'hotl', FACTS)).toEqual(missing('space fact', 'hotl', ['hotel']));
    // A number is no flag, and the other way round: each type suggests only the facts of its own kind.
    expect(misnamed('spaceflag', 'houses', FACTS)).toEqual(missing('space fact', 'houses', ['hotel']));
    expect(misnamed('spaceflag', 'hotel twice', FACTS)).toBeNull();
    expect(misnamed('spacenumber', 'hoses', FACTS)).toEqual(missing('space fact', 'hoses', ['houses']));
    expect(misnamed('spacenumber', 'house twice', FACTS)).toBeNull();
    expect(misnamed('cardflag', 'poisonned', FACTS)).toEqual(missing('card fact', 'poisonned', ['poisoned']));
    expect(misnamed('cardflag', 'purple', FACTS)).toEqual(missing('card fact', 'purple', ['poisoned']));
  });
  it('names a fact of a player, with the player facts of that kind closest to it', () => {
    const players = vocabFrom({
      maxPlayers: 2, facts: [{ name: 'in jail', on: 'player', kind: 'flag' }, { name: 'jail turns', on: 'player', kind: 'number' }],
    });
    expect(misnamed('playerflag', 'in jial', players)).toEqual(missing('player fact', 'in jial', ['in jail']));
    expect(misnamed('playerflag', 'jail turns', players)).toEqual(missing('player fact', 'jail turns', ['in jail']));
    expect(misnamed('playerflag', 'in jail twice', players)).toBeNull();
    expect(misnamed('playernumber', 'jail turnn', players)).toEqual(missing('player fact', 'jail turnn', ['jail turns']));
    expect(misnamed('playernumber', 'jail turn twice', players)).toBeNull();
  });
  describe('the player who holds a flag', () => {
    const holders = vocabFrom({
      maxPlayers: 4,
      facts: [
        { name: 'proposing', on: 'player', kind: 'flag' }, { name: 'the trade partner', on: 'player', kind: 'flag' },
        { name: 'the rival', on: 'player', kind: 'flag' }, { name: 'jail turns', on: 'player', kind: 'number' },
      ],
    });
    it('names the flag of “the player who is …” that players can\'t have, with the flags closest to it', () => {
      expect(misnamed('holder', 'the player who is propsing', holders)).toEqual(missing('player fact', 'propsing', ['proposing']));
      expect(misnamed('holder', 'The Player Who Is the rivel', holders)).toEqual(missing('player fact', 'the rivel', ['the rival']));
      // A count is no flag a player holds.
      expect(misnamed('holder', 'the player who is jail turns', holders)).toMatchObject({ message: 'There is no player fact called “jail turns”.' });
    });
    it('names a flag said alone that is close to one whose name starts with “the”', () => {
      expect(misnamed('holder', 'the trade partnr', holders)).toEqual(missing('player fact', 'the trade partnr', ['the trade partner']));
      expect(misnamed('holder', 'the rivel', holders)).toEqual(missing('player fact', 'the rivel', ['the rival']));
    });
    it('leaves other words to other phrases: a real holder among them, a “the …” like no flag, or a flag without “the”', () => {
      expect(misnamed('holder', 'the rival twice', holders)).toBeNull();
      expect(misnamed('holder', 'the player who is proposing now', holders)).toBeNull();
      expect(misnamed('holder', 'the bank', holders)).toBeNull();
      expect(misnamed('holder', 'the player on their left', holders)).toBeNull();
      expect(misnamed('holder', 'proposing', holders)).toBeNull();
    });
    it('has a loose shape only in a game whose players can have a flag', () => {
      const shaped = (vocab: Vocab) => new RegExp(`^(?:${VOCAB_TYPES.find((t) => t.name === 'holder')!.loose!.source(vocab)})$`, 'i').test('the rivel');
      expect([shaped(holders), shaped(FACTS), shaped(emptyVocab())]).toEqual([true, true, false]);
      expect(shaped(vocabFrom({ maxPlayers: 2, facts: [{ name: 'jail turns', on: 'player', kind: 'number' }] }))).toBe(false);
    });
    it('is explained by misnamedParam only for text shaped like one that is no holder of the game', () => {
      expect(misnamedParam('holder', 'the rivel', holders)).toEqual(missing('player fact', 'the rivel', ['the rival']));
      expect(misnamedParam('holder', 'the rival', holders)).toBeNull();
      expect(misnamedParam('holder', 'the rivel', emptyVocab())).toBeNull();
      // A type with no loose shape has nothing to explain.
      expect(misnamedParam('action', 'rolls the dice', BOARD)).toBeNull();
    });
  });
  it('names a thing in the bank with the bank\'s own names', () => {
    expect(misnamed('banked', 'hotl', FACTS)).toEqual(missing('bank item', 'hotl', ['hotels']));
    expect(misnamed('banked', 'huses', FACTS)).toEqual(missing('bank item', 'huses', ['houses']));
    expect(misnamed('banked', 'castle', FACTS)).toEqual(missing('bank item', 'castle', ['houses', 'hotels']));
    expect(misnamed('banked', 'house twice', FACTS)).toBeNull();
    expect(misnamed('banked', 'houses twice', FACTS)).toBeNull();
  });
  it('gives facts and the bank a loose shape only in a game that has some of that kind', () => {
    const shaped = (type: string, vocab: Vocab) => new RegExp(`^(?:${VOCAB_TYPES.find((t) => t.name === type)!.loose!.source(vocab)})$`, 'i').test('hotl');
    expect(['spaceflag', 'spacenumber', 'cardflag', 'banked', 'spacekind'].map((t) => shaped(t, FACTS))).toEqual([true, true, true, true, true]);
    expect(['spaceflag', 'spacenumber', 'cardflag', 'banked', 'spacekind'].map((t) => shaped(t, emptyVocab()))).toEqual([false, false, false, false, false]);
    // FACTS has a flag on players but no number on them.
    expect(['playerflag', 'playernumber'].map((t) => shaped(t, FACTS))).toEqual([true, false]);
    expect(['playerflag', 'playernumber'].map((t) => shaped(t, emptyVocab()))).toEqual([false, false]);
    // Facts of spaces say nothing of cards: a game with only card facts has no loose flag of spaces.
    const cardsOnly = vocabFrom({ maxPlayers: 2, facts: [{ name: 'poisoned', on: 'card', kind: 'flag' }] });
    expect(['spaceflag', 'spacenumber', 'cardflag'].map((t) => shaped(t, cardsOnly))).toEqual([false, false, true]);
  });

  it('leaves text that is no card to other phrases', () => {
    expect(misnamed('card', 'the top of the deck')).toBeNull();
    expect(misnamed('card', 'the most cards')).toBeNull();
    expect(misnamed('cardlist', 'the red 7 and the most cards')).toBeNull();
    // A lone word is only a misspelt suit or value when it looks like one.
    expect(misnamed('cardclass', 'playable')).toBeNull();
    expect(misnamed('card', 'the 2 of clubs', { ...emptyVocab(), maxPlayers: 4 })).toBeNull();
  });
});
