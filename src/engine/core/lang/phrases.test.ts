import { describe, expect, it } from 'vitest';
import VENOM_TEXT from '@/games/venom.rules?raw';
import { expandCardTable, standardDeckIdentities } from './cards';
import { compileGame } from './compile';
import { createDefaultLibrary } from './library';
import { PhraseLibrary, STATIC_TYPES, emptyVocab, stubFor, suggestNames, vocabFrom } from './phrases';
import { VOCAB_TYPES } from './refs';
import { FIXTURE_SPACES, TINY_BOARD_HEAD, fixtureBoardGame } from './testing';
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
    expect(l.get('condition', 'it is their move')).toEqual({
      fn, needsMove: true, needsPlayer: false, needsSpace: false, needsCard: false, needsDrawnCard: false, needsPayment: false, needsBoard: false,
      needsDice: false, needsTwoDice: false, needsAmount: false,
    });
    expect(l.get('condition', 'hearts are broken')?.needsMove).toBe(false);
    expect(l.get('effect', 'it is their move')).toBeUndefined();
  });

  it('registers a phrase that needs a card that was just drawn, which no other phrase does', () => {
    const l = lib().effect('keep it', (e) => e.state, { needsDrawnCard: true }).effect('toss it', (e) => e.state);
    expect([l.get('effect', 'keep it')?.needsDrawnCard, l.get('effect', 'toss it')?.needsDrawnCard]).toEqual([true, false]);
  });

  it('registers the phrases that pick out the cards a rule is about, which may need a card too', () => {
    const fn = () => ['c1'];
    const l = lib().which('a card has {int} health', fn).condition('it is marked', () => true, { needsCard: true });
    expect(l.get('which', 'a card has {int} health')).toMatchObject({ fn, needsCard: false });
    expect(l.get('condition', 'it is marked')?.needsCard).toBe(true);
    expect(l.match('which', 'A card has 3 health', V)).toEqual({ status: 'ok', pattern: 'a card has {int} health', args: [3] });
    expect(l.match('condition', 'A card has 3 health', V)).toMatchObject({ status: 'unknown' });
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

  it('prefers a misspelt kind of space to a space name, whichever phrase was registered first', () => {
    const board = vocabFrom({ maxPlayers: 2, board: fixtureBoardGame().board });
    const spaceFirst = new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES])
      .moment('a player lands on {space}', () => true).moment('a player lands on {spaceclass}', () => true);
    const kindFirst = new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES])
      .moment('a player lands on {spaceclass}', () => true).moment('a player lands on {space}', () => true);
    for (const l of [spaceFirst, kindFirst]) {
      expect(l.misnamed(['moment'], 'a player lands on a taks space', board)?.problem)
        .toEqual({ message: 'There is no kind of space called “taks”.', suggestions: ['tax'] });
      expect(l.misnamed(['moment'], 'a player lands on Rose Lan', board)?.problem)
        .toEqual({ message: 'There is no space called “Rose Lan”.', suggestions: ['Rose Lane'] });
    }
  });
});

describe('PhraseLibrary.misnamed between phrases with the same words', () => {
  // A detail of a space and a fact on it are read the same way: “it has a …”.
  const board = vocabFrom({ maxPlayers: 2, board: fixtureBoardGame().board, facts: [{ name: 'hotel', on: 'space', kind: 'flag' }] });
  const detailFirst = new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES])
    .condition('it has a {spaceattr}', () => true).condition('it has a {spaceflag}', () => true);
  const factFirst = new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES])
    .condition('it has a {spaceflag}', () => true).condition('it has a {spaceattr}', () => true);

  it('prefers the one whose names the text is nearest to, whichever was registered first', () => {
    for (const l of [detailFirst, factFirst]) {
      expect(l.misnamed(['condition'], 'it has a hotl', board)?.problem)
        .toEqual({ message: 'There is no space fact called “hotl”.', suggestions: ['hotel'] });
      expect(l.misnamed(['condition'], 'it has a prise', board)?.problem)
        .toEqual({ message: 'There is no space detail called “prise”.', suggestions: ['price'] });
    }
  });
  it('keeps the one registered first when the text is near no name of either', () => {
    expect(detailFirst.misnamed(['condition'], 'it has a zzz', board)?.problem.message).toBe('There is no space detail called “zzz”.');
    expect(factFirst.misnamed(['condition'], 'it has a zzz', board)?.problem.message).toBe('There is no space fact called “zzz”.');
  });
});

describe('PhraseLibrary.misnamed beside a phrase with words of its own where the name would be', () => {
  const board = vocabFrom({ maxPlayers: 2, board: fixtureBoardGame().board, facts: [{ name: 'mortgaged', on: 'space', kind: 'flag' }] });
  const l = new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES])
    .expect('it is accepted', () => true).expect("it is {player}'s turn", () => true).condition('it is {spaceflag}', () => true);

  it('blames no name like no real one when the line is more like the words of another phrase', () => {
    expect(l.misnamed(['expect', 'condition'], 'it is acepted', board)).toBeNull();
    expect(l.misnamed(['expect', 'condition'], 'it is p1s turn', board)).toBeNull();
  });
  it('still blames a name near a real one, and a name like no real one when no phrase is nearer', () => {
    expect(l.misnamed(['expect', 'condition'], 'it is mortgagd', board)?.problem)
      .toEqual({ message: 'There is no space fact called “mortgagd”.', suggestions: ['mortgaged'] });
    expect(l.misnamed(['expect', 'condition'], 'it is xyz', board)?.problem.message).toBe('There is no space fact called “xyz”.');
  });
});

describe('a misspelt example line with a quoted reason, in a game that declares a fact', () => {
  const full = createDefaultLibrary();
  // The quoted reason is not the line's own words: it must not pull the line away from the phrase it was meant to be.
  const LINE = 'it is rejeted because "no player has less than 0 money"';
  const SLIP = `  Then ${LINE}`;
  const problems = (text: string) => compileGame(text, full).diagnostics.filter((d) => d.severity === 'error');
  const notInTheLibrary = expect.objectContaining({
    kind: 'unknown-phrase', message: `“${LINE}” isn't in the phrase library yet.`,
    suggestions: expect.arrayContaining(['it is rejected because [text]']),
  });

  it('is not blamed on a space fact', () => {
    const text = [
      TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  Spaces can be mortgaged.'),
      '  A player may mortgage the space they are on.', '    Only if it is not mortgaged.', '    Then:', '      It is mortgaged.', '',
      'Example: a slip', '  Given p0 is on Rose Lane', '  When p0 mortgages the space they are on', SLIP,
    ].join('\n');
    expect(problems(text)).toEqual([notInTheLibrary]);
  });
  it('is not blamed on a card fact', () => {
    const text = [VENOM_TEXT, '', 'Example: a slip', "  Given p0's camp has a Knight", '  When p0 plays a Knight', SLIP].join('\n');
    expect(problems(text)).toEqual([notInTheLibrary]);
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

  it('gives a target stub the space it is asked about', () => {
    expect(stubFor('target', 'a street they love', V, STATIC_TYPES, { game: 'G', line: 2 })).toContain(
      "library.target('a street they love', (env, _args, space) => {",
    );
    expect(stubFor('target', 'a 3 they love', V, STATIC_TYPES, { game: 'G', line: 2 })).toContain(
      "library.target('a {int} they love', (env, [a1], space) => {",
    );
  });

  it('never turns words into a space name, even one that reads like a sentence', () => {
    const boardVocab = vocabFrom({
      maxPlayers: 2,
      board: { ...fixtureBoardGame().board!, spaces: [...FIXTURE_SPACES, { name: 'Go To Jail', attrs: { kind: 'jail' } }] },
    });
    expect(stubFor('effect', 'They go to jail.', boardVocab, [...STATIC_TYPES, ...VOCAB_TYPES], { game: 'G', line: 2 })).toContain(
      "library.effect('they go to jail', (env) => {",
    );
  });

  it('escapes apostrophes in the pattern', () => {
    expect(stubFor('condition', "It's their turn", V, STATIC_TYPES, { game: 'G', line: 2 })).toContain("library.condition('it\\'s their turn', (env) => {");
  });
});

describe('stubFor a declaration', () => {
  it('takes the arguments alone, as a card or board phrase does without its table', () => {
    expect(stubFor('declare', 'Spaces can have 3 houses.', V, STATIC_TYPES, { game: 'G', line: 2 })).toBe([
      '// Requested by a designer — game "G", line 2:',
      '//   "Spaces can have 3 houses"',
      "library.declare('spaces can have {int} houses', ([a1]) => {",
      "  throw new Error('not implemented yet');",
      '});',
    ].join('\n'));
    expect(stubFor('declare', 'Players can be out', V, STATIC_TYPES, { game: 'G', line: 2 })).toContain("library.declare('players can be out', (_args) => {");
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

  it('leaves the says column out of the words about cards, in any capitals', () => {
    const identities = expandCardTable({
      columns: ['name', 'Says'],
      rows: [{ cells: ['Dividend', 'They get 50 money.'], line: 1 }, { cells: ['Fine', 'They pay 15.'], line: 2 }],
    });
    const vocab = vocabFrom({ maxPlayers: 2, cards: [{ kind: 'table', identities, start: 'deck', acesHigh: false }] });
    expect(vocab.attributes).toEqual(['name']);
    expect(vocab.cardValues).toEqual([{ attribute: 'name', value: 'Dividend' }, { attribute: 'name', value: 'Fine' }]);
  });

  it('lists the facts a game declares and the names of its bank', () => {
    const facts = [{ name: 'houses', on: 'space', kind: 'number' }, { name: 'poisoned', on: 'card', kind: 'flag' }] as const;
    const board = { ...fixtureBoardGame().board!, bank: [{ name: 'houses', start: 32 }, { name: 'hotels', start: 12 }] };
    const vocab = vocabFrom({ maxPlayers: 2, board, facts: [...facts] });
    expect(vocab.facts).toEqual(facts);
    expect(vocab.bank).toEqual(['houses', 'hotels']);
    expect(vocabFrom({ maxPlayers: 2, board: fixtureBoardGame().board }).bank).toEqual([]);
    expect(vocabFrom({ maxPlayers: 2 }).facts).toEqual([]);
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
    const v = vocabFrom({
      maxPlayers: 2, board: fixtureBoardGame().board,
      actions: [
        { verb: 'roll', words: 'roll the dice', base: 'roll the dice', targeted: false, anyone: false, amount: false },
        { verb: 'build', words: 'build a house on a street they own', base: 'build a house', targeted: true, anyone: false, amount: false },
      ],
    });
    expect(v.spaces).toHaveLength(8);
    expect(v.spaceAttributes).toEqual(['kind', 'color', 'price', 'rent', 'tax']);
    expect(v.spaceValues).toContainEqual({ attribute: 'kind', value: 'street' });
    expect(v.spaceValues.some((x) => x.attribute === 'price')).toBe(false);
    expect(v.counters).toEqual(['money']);
    expect(v.payWith).toBe('money');
    expect(v.actions).toEqual([
      { verb: 'roll', words: 'roll the dice', base: 'roll the dice', targeted: false, anyone: false, amount: false },
      { verb: 'build', words: 'build a house on a street they own', base: 'build a house', targeted: true, anyone: false, amount: false },
    ]);
    expect(v.dice).toBe(true);
    expect(v.diceCount).toBe(2);
  });
  it('knows whether the board has dice, and how many', () => {
    expect(vocabFrom({ maxPlayers: 2, board: { ...fixtureBoardGame().board!, dice: null } }).dice).toBe(false);
    expect(vocabFrom({ maxPlayers: 2 }).dice).toBe(false);
    expect(vocabFrom({ maxPlayers: 2, board: { ...fixtureBoardGame().board!, dice: { count: 1, sides: 6 } } }).diceCount).toBe(1);
    expect([vocabFrom({ maxPlayers: 2 }).diceCount, emptyVocab().diceCount]).toEqual([0, 0]);
  });
  it('reports every flag a phrase was registered with', () => {
    const l = new PhraseLibrary(STATIC_TYPES)
      .effect('they rest', (env) => env.state, { needsPlayer: true })
      .effect('they roll', (env) => env.state, { needsBoard: true, needsDice: true })
      .given('they rolled a double', (env) => env.state, { needsDice: true, needsTwoDice: true });
    expect(l.get('effect', 'they rest')).toMatchObject({
      needsMove: false, needsPlayer: true, needsSpace: false, needsPayment: false, needsBoard: false, needsDice: false,
    });
    expect(l.get('effect', 'they roll')).toMatchObject({ needsPlayer: false, needsBoard: true, needsDice: true, needsTwoDice: false });
    // A Given line takes the same flags as any other phrase.
    expect(l.get('given', 'they rolled a double')).toMatchObject({ needsDice: true, needsTwoDice: true, needsPlayer: false });
  });
});

describe('the target phrases', () => {
  const targets = () => new PhraseLibrary(STATIC_TYPES).target('a space they own', () => true, { needsPlayer: true, needsBoard: true });

  it('is a kind of its own: where a button points is no condition', () => {
    expect(targets().get('target', 'a space they own')).toMatchObject({ needsPlayer: true, needsBoard: true, needsSpace: false });
    expect(targets().match('target', 'A space they own', V)).toEqual({ status: 'ok', pattern: 'a space they own', args: [] });
    expect(targets().match('condition', 'a space they own', V).status).toBe('unknown');
  });
});

describe('the declare phrases', () => {
  const declares = () => new PhraseLibrary(STATIC_TYPES).declare('spaces can have {factlist}', () => []);
  const read = (text: string) => declares().match('declare', text, V);

  it('is a kind of its own: a declaration is no board sentence and no card sentence', () => {
    expect(declares().get('declare', 'spaces can have {factlist}')).toMatchObject({ needsMove: false, needsBoard: false });
    expect(declares().match('board', 'Spaces can have houses', V).status).toBe('unknown');
    expect(declares().match('cards', 'Spaces can have houses', V).status).toBe('unknown');
  });
  it('reads a plural noun as a number and "a" or "an" and a noun as a yes/no fact', () => {
    expect(read('Spaces can have houses and a hotel.')).toEqual({
      status: 'ok', pattern: 'spaces can have {factlist}',
      args: [[{ name: 'houses', kind: 'number' }, { name: 'hotel', kind: 'flag' }]],
    });
    expect(read('Spaces can have an inn')).toMatchObject({ args: [[{ name: 'inn', kind: 'flag' }]] });
    expect(read('Spaces can have An Inn')).toMatchObject({ args: [[{ name: 'inn', kind: 'flag' }]] });
  });
  it('separates the facts as cards in a list are separated', () => {
    const three = [{ name: 'houses', kind: 'number' }, { name: 'hotel', kind: 'flag' }, { name: 'inn', kind: 'flag' }];
    for (const list of ['houses, a hotel and an inn', 'houses, a hotel, and an inn', 'houses and a hotel and an inn']) {
      expect(read(`Spaces can have ${list}`)).toMatchObject({ status: 'ok', args: [three] });
    }
  });
  it('takes names of several words, splitting at commas and “and” first', () => {
    expect(read('Spaces can have jail turns')).toMatchObject({ args: [[{ name: 'jail turns', kind: 'number' }]] });
    expect(read('Spaces can have hit points, a big hotel and an Old Inn')).toMatchObject({ args: [[
      { name: 'hit points', kind: 'number' }, { name: 'big hotel', kind: 'flag' }, { name: 'old inn', kind: 'flag' },
    ]] });
  });
  it('keeps “and” inside a longer word, and a lone “a” inside a name', () => {
    expect(read('Spaces can have android parts and a band, a hit a day')).toMatchObject({ args: [[
      { name: 'android parts', kind: 'number' }, { name: 'band', kind: 'flag' }, { name: 'hit a day', kind: 'flag' },
    ]] });
  });
  it('wants no count, no lone article and no empty name', () => {
    for (const list of ['3 houses', 'a', 'houses and', 'houses,, a hotel', 'a a', 'and', 'an and']) {
      expect(read(`Spaces can have ${list}`).status, list).toBe('unknown');
    }
  });
});

describe('lists of bank things and numbers', () => {
  const bank = new PhraseLibrary(STATIC_TYPES).board('the bank has {banklist}', () => ({ kind: 'bank', bank: [] }));
  const ints = new PhraseLibrary(STATIC_TYPES).condition('the price is {ints} here', () => true);

  it('reads a count and a noun for each thing the bank has', () => {
    expect(bank.match('board', 'The bank has 32 houses and 12 hotels.', V)).toEqual({
      status: 'ok', pattern: 'the bank has {banklist}', args: [[{ name: 'houses', start: 32 }, { name: 'hotels', start: 12 }]],
    });
    expect(bank.match('board', 'The bank has 12 Hotels, 0 houses, and 5 tokens', V)).toMatchObject({
      args: [[{ name: 'hotels', start: 12 }, { name: 'houses', start: 0 }, { name: 'tokens', start: 5 }]],
    });
  });
  it('wants a whole count before each noun', () => {
    for (const list of ['houses', 'a house', '32', '32 houses and hotels', 'two houses', '-1 houses', '3.5 houses', '3 big houses']) {
      expect(bank.match('board', `The bank has ${list}`, V).status).toBe('unknown');
    }
  });
  it('reads whole numbers joined by commas and "or"', () => {
    expect(ints.match('condition', 'The price is 25, 50, 100 or 200 here', V)).toEqual({
      status: 'ok', pattern: 'the price is {ints} here', args: [[25, 50, 100, 200]],
    });
    expect(ints.match('condition', 'The price is 25, 50, or 100 here', V)).toMatchObject({ args: [[25, 50, 100]] });
    expect(ints.match('condition', 'The price is 7 here', V)).toMatchObject({ args: [[7]] });
    expect(ints.match('condition', 'The price is 25 or 50 here', V)).toMatchObject({ args: [[25, 50]] });
  });
  it('does not read other lists as numbers', () => {
    for (const list of ['25 and', '25 50', 'a or b', '25, or', 'or 25']) {
      expect(ints.match('condition', `The price is ${list} here`, V).status).toBe('unknown');
    }
  });
});
