import { describe, expect, it } from 'vitest';
import { standardDeckIdentities } from './cards';
import { PhraseLibrary, STATIC_TYPES, emptyVocab, stubFor, suggestNames, vocabFrom } from './phrases';
import { VOCAB_TYPES } from './refs';
import { fixtureBoardGame } from './testing';
import type { EffectFn, ParamType } from './types';

const V = emptyVocab();
const lib = () => new PhraseLibrary(STATIC_TYPES);

describe('PhraseLibrary.match', () => {
  it('ignores case, extra spaces and one trailing period', () => {
    const l = lib().effect('deal {int} cards', (env) => env.state);
    expect(l.match('effect', 'Deal  3 cards.', V)).toEqual({ status: 'ok', pattern: 'deal {int} cards', args: [3] });
  });

  it('supports an optional (s)', () => {
    const l = lib().score('scores {int} point(s)', () => 0);
    expect(l.match('score', 'scores 1 point', V).status).toBe('ok');
    expect(l.match('score', 'scores 2 points', V).status).toBe('ok');
  });

  it('{count} reads digits or a number word', () => {
    const l = lib().effect('there are {count} dice', (env) => env.state);
    expect(l.match('effect', 'There are two dice', V)).toEqual({ status: 'ok', pattern: 'there are {count} dice', args: [2] });
    expect(l.match('effect', 'There are 3 dice', V)).toEqual({ status: 'ok', pattern: 'there are {count} dice', args: [3] });
    expect(l.match('effect', 'There are Twelve dice', V)).toMatchObject({ status: 'ok', args: [12] });
    expect(l.match('effect', 'There are eleven dice', V)).toMatchObject({ status: 'ok', args: [11] });
    expect(l.match('effect', 'There are lots dice', V).status).toBe('unknown');
  });

  it('{string} accepts straight and curly quotes and keeps case', () => {
    const l = lib().expect('it is rejected because {string}', () => true);
    expect(l.match('expect', 'It is rejected because “They Can’t”.', V)).toMatchObject({ status: 'ok', args: ['They Can’t'] });
    expect(l.match('expect', 'it is rejected because "x"', V)).toMatchObject({ status: 'ok', args: ['x'] });
  });

  it('keeps kinds separate', () => {
    const l = lib().condition('hearts are broken', () => true).effect('hearts are broken', (e) => e.state);
    expect(l.match('condition', 'Hearts are broken', V).status).toBe('ok');
    expect(l.match('effect', 'Hearts are broken', V).status).toBe('ok');
    expect(l.match('turn', 'Hearts are broken', V).status).toBe('unknown');
  });

  it('reports ambiguity', () => {
    const l = lib().effect('move {name}', (e) => e.state).effect('move the {name}', (e) => e.state);
    expect(l.match('effect', 'move the deck', V)).toEqual({ status: 'ambiguous', patterns: ['move {name}', 'move the {name}'] });
  });

  it('suggests the closest phrases of the same kind', () => {
    const l = lib()
      .effect('shuffle {name}', (e) => e.state)
      .effect('deal {int} cards from the deck', (e) => e.state)
      .effect('flip a coin', (e) => e.state);
    const r = l.match('effect', 'Deal 3 card from the deck', V);
    expect(r.status).toBe('unknown');
    if (r.status === 'unknown') {
      expect(r.suggestions[0]).toBe('deal [number] cards from the deck');
      expect(r.suggestions).not.toContain('flip a coin');
    }
  });

  it('reports a parameter that fails to resolve as invalid', () => {
    const even: ParamType = { name: 'even', label: '[even]', source: () => '\\d+', resolve: (t) => (Number(t) % 2 === 0 ? { value: Number(t) } : { error: `${t} is odd` }) };
    const l = new PhraseLibrary([...STATIC_TYPES, even]).condition('{even} things', () => true);
    expect(l.match('condition', '3 things', V)).toEqual({ status: 'invalid', message: '3 is odd' });
  });

  it('rejects unknown parameter types at registration', () => {
    expect(() => lib().effect('do {foo}', (e) => e.state)).toThrow('unknown parameter type {foo} in "do {foo}"');
  });

  it('resolves the static parameter types', () => {
    const l = lib().zone('{name} is a {layout} that {visibility}, tagged {word}', () => ({ name: '', perPlayer: false, layout: 'pile', visibility: 'secret' }));
    expect(l.match('zone', 'The Deck is a Row that Only they can see, tagged X1.', V)).toEqual({
      status: 'ok',
      pattern: '{name} is a {layout} that {visibility}, tagged {word}',
      args: ['the deck', 'row', 'owner', 'X1'],
    });
  });

  it('matches a curly apostrophe against a straight one in the pattern, and the other way round', () => {
    const l = lib().condition("it's their turn", () => true).condition('it’s my turn', () => true);
    expect(l.match('condition', 'It’s their turn', V).status).toBe('ok');
    expect(l.match('condition', 'it‘s their turn', V).status).toBe('ok');
    expect(l.match('condition', "It's their turn.", V).status).toBe('ok');
    expect(l.match('condition', "it's my turn", V).status).toBe('ok');
  });

  it('keeps curly characters in captured text when the phrase itself has an apostrophe', () => {
    const l = lib().expect("it's rejected because {string}", () => true);
    expect(l.match('expect', 'It’s rejected because “They Can’t”.', V)).toEqual({
      status: 'ok',
      pattern: "it's rejected because {string}",
      args: ['They Can’t'],
    });
  });

  it('finds a phrase from a typo', () => {
    const l = lib().effect('shuffle {name}', (e) => e.state).effect('flip a coin', (e) => e.state);
    expect(l.match('effect', 'Shufle the deck', V)).toEqual({ status: 'unknown', suggestions: ['shuffle [name]'] });
  });

  it('looks a registered phrase up by kind and pattern', () => {
    const fn = () => true;
    const l = lib().condition('it is their move', fn, { needsMove: true }).condition('hearts are broken', () => true);
    expect(l.get('condition', 'it is their move')).toEqual({ fn, needsMove: true, needsPlayer: false, needsSpace: false, needsPayment: false });
    expect(l.get('condition', 'hearts are broken')?.needsMove).toBe(false);
    expect(l.get('effect', 'it is their move')).toBeUndefined();
  });
});

describe('PhraseLibrary.misnamed', () => {
  const same: EffectFn = (env) => env.state;
  const named = () => new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES])
    .effect('move {zone} to {zone}', same)
    .effect('move the top card of {zone} to {zone}', same)
    .effect('shuffle {zone}', same)
    .condition('{zone} is empty', () => true);
  const vocab = vocabFrom({
    maxPlayers: 4,
    zones: [
      { name: 'deck', perPlayer: false, layout: 'pile', visibility: 'secret' },
      { name: 'trick', perPlayer: false, layout: 'row', visibility: 'public' },
      { name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' },
    ],
  });

  it('names the zone of a line shaped like a phrase, on the phrase written most specifically', () => {
    expect(named().misnamed(['effect'], 'Move the top card of the dek to the trick.', vocab)).toEqual({
      kind: 'effect', problem: { message: 'There is no zone called “dek”.', suggestions: ['deck'] },
    });
    expect(named().misnamed(['effect', 'condition'], 'The dek is empty', vocab)).toMatchObject({ kind: 'condition' });
  });

  it('finds nothing for a line no phrase is shaped like, or whose names are all fine', () => {
    expect(named().misnamed(['effect'], 'Shufle the deck', vocab)).toBeNull();
    expect(named().misnamed(['effect'], 'Shuffle the deck twice', vocab)).toBeNull();
    expect(named().misnamed(['effect'], 'Shuffle the deck', vocab)).toBeNull();
    expect(named().misnamed(['turn'], 'Shuffle the dek', vocab)).toBeNull();
  });

  it('leaves the strict answer alone', () => {
    expect(named().match('effect', 'Shuffle the dek', vocab).status).toBe('unknown');
  });
});

describe('stubFor', () => {
  it('writes a ready-to-paste stub with typed parameters', () => {
    expect(stubFor('effect', 'The winner draws 2 cards.', V, STATIC_TYPES, { game: 'Hearts', line: 31 })).toBe(
      [
        '// Requested by a designer — game "Hearts", line 31:',
        '//   "The winner draws 2 cards"',
        "library.effect('the winner draws {int} cards', (env, [a1]) => {",
        "  throw new Error('not implemented yet');",
        '});',
      ].join('\n'),
    );
  });

  it('replaces quoted text before numbers and matches the callback to the kind', () => {
    expect(stubFor('score', 'Scores 3 points for "Hearts".', V, STATIC_TYPES, { game: 'G', line: 2 })).toContain(
      "library.score('scores {int} points for {string}', (env, [a1, a2], seat) => {",
    );
  });

  it('gives board and moment stubs the parameters their callbacks take', () => {
    expect(stubFor('board', 'The board has 2 dice.', V, STATIC_TYPES, { game: 'G', line: 2 })).toContain(
      "library.board('the board has {int} dice', ([a1], table) => {",
    );
    expect(stubFor('moment', 'A piece passes space 3', V, STATIC_TYPES, { game: 'G', line: 2 })).toContain(
      "library.moment('a piece passes space {int}', (env, [a1], moment) => {",
    );
  });

  it('escapes apostrophes in the pattern', () => {
    expect(stubFor('condition', "It's their turn", V, STATIC_TYPES, { game: 'G', line: 2 })).toContain("library.condition('it\\'s their turn', (env) => {");
  });
});

describe('vocabFrom', () => {
  it('lists zones by owner, and card words only for table decks', () => {
    const zones = [
      { name: 'deck', perPlayer: false, layout: 'pile', visibility: 'secret' },
      { name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' },
    ] as const;
    const identity = (color: string, number: number) => ({ attrs: { color, number }, faceKey: `${color}${number}` });
    const vocab = vocabFrom({
      maxPlayers: 4, zones: [...zones], phases: ['main'], verbs: ['play'],
      cards: [
        { kind: 'standard', identities: standardDeckIdentities(), start: 'deck', acesHigh: false },
        { kind: 'table', identities: [identity('red', 1), identity('red', 2)], start: 'deck', acesHigh: false },
      ],
    });
    expect(vocab).toEqual({
      ...emptyVocab(),
      sharedZones: ['deck'], playerZones: ['hand'], maxPlayers: 4, phases: ['main'], verbs: ['play'],
      attributes: ['suit', 'rank', 'color', 'number'], standardDeck: true,
      cardValues: [{ attribute: 'color', value: 'red' }, { attribute: 'number', value: 1 }, { attribute: 'number', value: 2 }],
    });
  });

  it('makes a new object each time and defaults to an empty game', () => {
    expect(vocabFrom({ maxPlayers: 2 })).toEqual({ ...emptyVocab(), maxPlayers: 2 });
    expect(vocabFrom({ maxPlayers: 2 })).not.toBe(vocabFrom({ maxPlayers: 2 }));
  });
});

describe('suggestNames', () => {
  it('lists the names closest to the text first, ignoring case, at most three', () => {
    expect(suggestNames('Playing', ['placing', 'dealing', 'scoring', 'PLAYING NOW', 'plays', 'playing time'])).toEqual(['placing', 'PLAYING NOW', 'playing time']);
  });

  it('counts swapped, missing and extra letters as typos', () => {
    expect(suggestNames('hnad', ['deck', 'hand', 'trick'])).toEqual(['hand']);
    expect(suggestNames('plyas', ['plays', 'passes', 'draws'])).toEqual(['plays']);
    expect(suggestNames('dek', ['deck', 'hand'])).toEqual(['deck']);
    expect(suggestNames('trik', ['deck', 'hand', 'pass pile', 'won pile', 'trick'])).toEqual(['trick']);
  });

  it('leaves out names much further off than the closest', () => {
    expect(suggestNames('wonpile', ['trick', 'deck', 'draw pile', 'hand', 'pass pile', 'won pile'])).toEqual(['won pile']);
  });

  it('leaves out names with little in common', () => {
    expect(suggestNames('zzzz', ['main', 'placing'])).toEqual([]);
    expect(suggestNames('main', [])).toEqual([]);
  });
});

describe('board vocabulary and phrase flags', () => {
  it('builds space, counter and action words from a board game', () => {
    const v = vocabFrom({ maxPlayers: 2, board: fixtureBoardGame().board, actions: [{ verb: 'roll', words: 'roll the dice' }] });
    expect(v.spaces).toHaveLength(8);
    expect(v.spaceAttributes).toEqual(['kind', 'color', 'price', 'rent', 'tax']);
    expect(v.spaceValues).toContainEqual({ attribute: 'kind', value: 'street' });
    expect(v.spaceValues.some((x) => x.attribute === 'price')).toBe(false);
    expect(v.counters).toEqual(['money']);
    expect(v.payWith).toBe('money');
    expect(v.actions).toEqual([{ verb: 'roll', words: 'roll the dice' }]);
  });
  it('reports every flag a phrase was registered with', () => {
    const l = new PhraseLibrary(STATIC_TYPES).effect('they rest', (env) => env.state, { needsPlayer: true });
    expect(l.get('effect', 'they rest')).toMatchObject({ needsMove: false, needsPlayer: true, needsSpace: false, needsPayment: false });
  });
});
