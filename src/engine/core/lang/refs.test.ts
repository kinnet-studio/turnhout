import { describe, expect, it } from 'vitest';
import { STANDARD_RANKS, STANDARD_SUITS, VOCAB_TYPES, parseParam, participle, thirdPerson, thirdPersonWords } from './refs';
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
    { verb: 'roll', words: 'roll the dice' }, { verb: 'end', words: 'end their turn' }, { verb: 'buy', words: 'buy the space they are on' },
  ],
});

describe('vocabulary types', () => {
  it('declares every type with its label and stub order', () => {
    expect(VOCAB_TYPES.map((t) => [t.name, t.label])).toEqual([
      ['zone', '[zone]'], ['zones', '[zones]'], ['perzone', '[zone]'], ['player', '[player]'], ['phase', '[phase]'],
      ['move', '[action]'], ['attribute', '[attribute]'], ['card', '[card]'], ['cardlist', '[cards]'], ['cardclass', '[kind of card]'],
      ['space', '[space]'], ['spaceclass', '[kind of space]'], ['spaceattr', '[space detail]'], ['counter', '[counter]'],
      ['action', '[action]'], ['done', '[action done]'],
    ]);
    const order = Object.fromEntries(VOCAB_TYPES.filter((t) => t.stubOrder !== undefined).map((t) => [t.name, t.stubOrder]));
    expect(order).toEqual({ card: 2, zone: 3, space: 3, player: 4 });
  });

  it.each([V, BOARD, emptyVocab()])('sources have no capture groups and do not match empty text', (vocab) => {
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

  it('reads counters, space details, actions and what was done', () => {
    expect(parseParam('counter', 'money', v)).toEqual({ value: 'money' });
    expect(parseParam('counter', 'Money', v)).toEqual({ value: 'money' });
    expect(parseParam('spaceattr', 'rent', v)).toEqual({ value: 'rent' });
    expect(parseParam('action', 'ends their turn', v)).toEqual({ value: 'end their turn' });
    expect(parseParam('action', 'rolls the dice', v)).toEqual({ value: 'roll the dice' });
    expect(parseParam('action', 'Buys the space they are on', v)).toEqual({ value: 'buy the space they are on' });
    expect(parseParam('done', 'rolled', v)).toEqual({ value: 'roll the dice' });
    expect(parseParam('done', 'bought', v)).toEqual({ value: 'buy the space they are on' });
    expect(parseParam('done', 'ended', v)).toEqual({ value: 'end their turn' });
  });
  it('reads what was done as a button only when one button has the verb', () => {
    const building = vocabFrom({
      maxPlayers: 2,
      actions: [{ verb: 'build', words: 'build a house' }, { verb: 'build', words: 'build a hotel' }, { verb: 'end', words: 'end their turn' }],
    });
    expect(parseParam('done', 'built', building)).toEqual({ error: '“built” could mean “build a house” or “build a hotel”.' });
    expect(parseParam('done', 'ended', building)).toEqual({ value: 'end their turn' });
    expect(parseParam('action', 'builds a hotel', building)).toEqual({ value: 'build a hotel' });
    // The same wording in two phases is still one button.
    const twice = vocabFrom({ maxPlayers: 2, actions: [{ verb: 'roll', words: 'roll the dice' }, { verb: 'roll', words: 'roll the dice' }] });
    expect(parseParam('done', 'rolled', twice)).toEqual({ value: 'roll the dice' });
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

describe('verb forms', () => {
  it('makes participles', () => {
    expect(['roll', 'end', 'buy', 'draw', 'trade', 'bury', 'play'].map(participle))
      .toEqual(['rolled', 'ended', 'bought', 'drawn', 'traded', 'buried', 'played']);
  });
  it.each([
    ['buy', 'bought'], ['draw', 'drawn'], ['pay', 'paid'], ['build', 'built'], ['sell', 'sold'], ['take', 'taken'], ['give', 'given'],
    ['throw', 'thrown'], ['put', 'put'], ['go', 'gone'], ['make', 'made'], ['get', 'got'], ['win', 'won'], ['lose', 'lost'], ['hold', 'held'],
    ['keep', 'kept'], ['leave', 'left'], ['bid', 'bid'], ['deal', 'dealt'], ['spend', 'spent'], ['choose', 'chosen'],
  ])('knows that %s is %s', (verb, done) => expect(participle(verb)).toBe(done));
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
    expect(l.match('condition', 'p1 has rolled this turn and at least two money', BOARD)).toMatchObject({ status: 'ok', args: ['p1', 'roll the dice', 2, 'money'] });
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
  const NAMES = VOCAB_TYPES.filter((t) => !['action', 'done'].includes(t.name));

  it('gives every type of names a loose shape, and no other', () => {
    expect(VOCAB_TYPES.filter((t) => t.loose).map((t) => t.name)).toEqual(NAMES.map((t) => t.name));
  });

  it.each([V, BOARD, emptyVocab()])('every type has a loose source with no capture groups that does not match empty text', (vocab) => {
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
  });

  it('names phases, moves and card attributes', () => {
    expect(misnamed('phase', 'playng')).toEqual(missing('phase', 'playng', ['playing']));
    expect(misnamed('phase', 'playing now')).toBeNull();
    expect(misnamed('move', 'plyas')).toEqual(missing('move', 'plyas', ['plays']));
    expect(misnamed('attribute', 'colour')).toEqual(missing('card attribute', 'colour', ['color']));
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

  it('leaves text that is no card to other phrases', () => {
    expect(misnamed('card', 'the top of the deck')).toBeNull();
    expect(misnamed('card', 'the most cards')).toBeNull();
    expect(misnamed('cardlist', 'the red 7 and the most cards')).toBeNull();
    // A lone word is only a misspelt suit or value when it looks like one.
    expect(misnamed('cardclass', 'playable')).toBeNull();
    expect(misnamed('card', 'the 2 of clubs', { ...emptyVocab(), maxPlayers: 4 })).toBeNull();
  });
});
