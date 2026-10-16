import { describe, expect, it } from 'vitest';
import { zoneCards, type GameState } from '../game-state';
import { compileGame } from './compile';
import { runExamples } from './examples';
import { createDefaultLibrary } from './library';
import type { PhraseLibrary } from './phrases';
import { COUNTER_GAME, ROUNDS_GAME, TEST_DUEL, TINY_BOARD, deckGameText } from './testing';
import { GUILD_GAME } from './testing';
import { createEngine, initialState } from './build';
import { namedChoices } from './declared-actions';
import { relocate } from './zones';
import type { CompiledGame } from './types';

const lib = createDefaultLibrary();
const LINES = TEST_DUEL.split('\n');

/** Compiles designer text that may still lack phrases; anything worse fails the test. */
function compiled(text: string, library: PhraseLibrary = lib): CompiledGame {
  const { game, diagnostics } = compileGame(text, library);
  if (!game) throw new Error(JSON.stringify(diagnostics));
  return game;
}

/** The Test Duel with `lines` inserted after line `n`. */
const insertAfter = (n: number, ...lines: string[]) => [...LINES.slice(0, n), ...lines, ...LINES.slice(n)].join('\n');
/** The Test Duel with line `n` (1-based) replaced by `lines`. */
const replaceLine = (n: number, ...lines: string[]) => [...LINES.slice(0, n - 1), ...lines, ...LINES.slice(n)].join('\n');

const EXAMPLES = [
  '',
  'Example: playing a club is fine',
  '  Given p0 holds the 3 of clubs and the 4 of clubs',
  '  And p1 holds the 9 of diamonds',
  '  When p0 plays the 3 of clubs',
  '  Then it is accepted',
  "  And it is p1's turn",
  '',
  'Example: hearts are refused',
  '  Given p0 holds the 3 of hearts and the 4 of clubs',
  '  And p1 holds the 9 of diamonds',
  '  When p0 plays the 3 of hearts',
  '  Then it is rejected because “The card is not a heart.”',
  '',
  'Example: a wrong expectation fails',
  '  Given p0 holds the 3 of clubs and the 4 of clubs',
  '  And p1 holds the 9 of diamonds',
  '  When p0 plays the 3 of clubs',
  '  Then it is rejected',
  '',
  'Example: blocked by a missing phrase',
  '  Given p0 holds the 3 of clubs and the 4 of clubs',
  '  And the moon is full',
  '  When p0 plays the 3 of clubs',
  '  Then it is accepted',
];
const withExamples = (text: string) => [text, ...EXAMPLES].join('\n');
/** The line (1-based) containing `wanted`, or, when `whole`, being exactly it once indented. */
const lineOf = (text: string, wanted: string, whole = false) =>
  text.split('\n').findIndex((l) => (whole ? l.trim() === wanted : l.includes(wanted))) + 1;

const duel = withExamples(TEST_DUEL);
const game = compiled(duel);

/** An extra example appended to the Test Duel, and what running it gives. */
function runOne(...example: string[]) {
  const text = [TEST_DUEL, '', ...example].join('\n');
  return { text, result: runExamples(compiled(text), lib)[0] };
}

describe('runExamples', () => {
  it('reports pass, fail and blocked with designer-readable messages', () => {
    const results = runExamples(game, lib);
    expect(results.map((r) => r.status)).toEqual(['pass', 'pass', 'fail', 'blocked']);
    expect(results[0]).toEqual({ name: 'playing a club is fine', line: lineOf(duel, 'Example: playing'), status: 'pass', message: null, atLine: null });
    expect(results[2]).toMatchObject({ message: 'Expected the move to be rejected, but it was accepted.', atLine: lineOf(duel, 'Then it is rejected', true) });
    expect(results[3].message).toMatch(/^Blocked by “the moon is full” \(line \d+\), which isn't implemented yet\.$/);
  });

  it('keeps the examples’ order and names', () => {
    expect(runExamples(game, lib).map((r) => r.name)).toEqual([
      'playing a club is fine', 'hearts are refused', 'a wrong expectation fails', 'blocked by a missing phrase',
    ]);
  });

  it('points a failed expectation at its own line', () => {
    const { text, result } = runOne(
      'Example: wrong turn',
      '  Given p0 holds the 3 of clubs and the 4 of clubs',
      '  And p1 holds the 9 of diamonds',
      '  When p0 plays the 3 of clubs',
      "  Then it is p0's turn",
    );
    expect(result).toMatchObject({
      status: 'fail', message: "Expected it to be p0's turn, but it is p1's turn.", atLine: lineOf(text, "Then it is p0's turn"),
    });
  });

  it('names the line and phrase a missing phrase is on', () => {
    const results = runExamples(game, lib);
    expect(results[3]).toMatchObject({
      status: 'blocked', message: `Blocked by “the moon is full” (line ${lineOf(duel, 'the moon is full')}), which isn't implemented yet.`,
      atLine: lineOf(duel, 'the moon is full'),
    });
  });

  it('is blocked by a missing phrase in the rules when a move reaches it', () => {
    const text = [
      replaceLine(25, '      The winner sings.'), '',
      'Example: sings',
      '  Given p0 holds the 3 of clubs and the 4 of clubs',
      '  And p1 holds the 9 of diamonds',
      '  When p0 plays the 3 of clubs',
      '  Then it is accepted',
    ].join('\n');
    expect(runExamples(compiled(text), lib)[0]).toMatchObject({
      status: 'blocked', message: "Blocked by “The winner sings” (line 25), which isn't implemented yet.", atLine: lineOf(text, 'When p0 plays'),
    });
  });

  it('gives the engine’s refusal in a designer’s words, using whose turn it was', () => {
    const { result } = runOne(
      'Example: out of turn',
      '  Given p0 holds the 3 of clubs',
      '  And p1 holds the 9 of diamonds',
      '  When p1 plays the 9 of diamonds',
      "  Then it is rejected because “It's p0's turn.”",
    );
    expect(result).toMatchObject({ status: 'pass', message: null });
  });

  it('tells a failed expectation what the engine really said', () => {
    const { result } = runOne(
      'Example: expecting too much',
      '  Given p0 holds the 3 of hearts and the 4 of clubs',
      '  And p1 holds the 9 of diamonds',
      '  When p0 plays the 3 of hearts',
      '  Then it is accepted',
    );
    expect(result).toMatchObject({ status: 'fail', message: 'Expected the move to be accepted, but it was rejected: the card is not a heart' });
  });

  it('fails an example whose When line cannot be made, on that line', () => {
    const { text, result } = runOne(
      'Example: no such card',
      '  Given p1 holds the 9 of diamonds',
      '  And p1 holds the 5 of spades',
      '  When p0 plays the 9 of diamonds',
      '  Then it is accepted',
    );
    expect(result).toEqual({
      name: 'no such card', line: lineOf(text, 'Example: no such card'), status: 'fail',
      message: `Line ${lineOf(text, 'When p0 plays')} (“p0 plays the 9 of diamonds”): I can't find the 9 of diamonds for p0 to play.`,
      atLine: lineOf(text, 'When p0 plays'),
    });
  });

  it('fails a Given line that cannot be carried out, on that line', () => {
    const { text, result } = runOne('Example: no hearts left', '  Given p0 holds the 3 of hearts and the 3 of hearts', '  Then p0 holds 2 cards');
    const line = lineOf(text, 'the 3 of hearts and the 3 of hearts');
    expect(result).toMatchObject({
      status: 'fail', message: `Line ${line} (“p0 holds the 3 of hearts and the 3 of hearts”): No card matches “the 3 of hearts”.`, atLine: line,
    });
  });

  it('runs the game’s setup when an example asks for it', () => {
    const { result } = runOne(
      'Example: dealt hands',
      '  Given the game is set up',
      '  Then p0 holds 3 cards',
      '  And p1 holds 3 cards',
      '  And the phase is play',
      "  And it is p0's turn",
    );
    expect(result).toMatchObject({ status: 'pass', message: null });
  });

  it('lets a Given line rearrange the hands the setup dealt', () => {
    const { result } = runOne(
      'Example: choosing the hand',
      '  Given the game is set up',
      '  And p0 holds the 3 of clubs',
      '  When p0 plays the 3 of clubs',
      '  Then the middle has the 3 of clubs',
    );
    expect(result).toMatchObject({ status: 'pass', message: null });
  });

  it('judges each Then against the table as it is after the When before it', () => {
    const steps = [
      '  Given p0 holds the 3 of clubs and the 4 of clubs',
      '  And p1 holds the 9 of diamonds and the 5 of clubs',
      '  When p0 plays the 3 of clubs',
      "  Then it is p1's turn",
      '  When p1 plays the 9 of diamonds',
      '  Then it is rejected because “the middle is empty or they follow the led suit when they can”',
    ];
    expect(runOne('Example: two moves', ...steps, "  And it is p1's turn").result).toMatchObject({ status: 'pass', message: null });
    const { text, result } = runOne('Example: two moves', ...steps, '  And it is accepted');
    expect(result).toMatchObject({ status: 'fail', atLine: lineOf(text, 'And it is accepted') });
    expect(result.message).toMatch(/^Expected the move to be accepted, but it was rejected: /);
  });

  it('plays an example with the number of players it asks for', () => {
    const rules = compiled([
      replaceLine(2, 'Players: 2 to 4'), '', 'Example: three at the table', '  Given 3 players', '  And p2 holds the 5 of clubs',
      '  Then p2 holds 1 card',
      '',
      'Example: default seats',
      '  Given p1 holds the 5 of clubs',
      '  Then p1 holds 1 card',
    ].join('\n'));
    expect(rules.examples.map((e) => e.players)).toEqual([3, null]);
    expect(runExamples(rules, lib).map((r) => r.status)).toEqual(['pass', 'pass']);
  });

  it('fails an example for a player count the game is not for, with the engine’s message', () => {
    const result = runExamples({ ...game, examples: [{ name: 'too many', line: 40, players: 5, steps: [] }] }, lib)[0];
    expect(result).toEqual({ name: 'too many', line: 40, status: 'fail', message: 'This game is for 2 players.', atLine: 40 });
  });

  it('runs each example from the same starting table, whatever ran before it', () => {
    const results = runExamples(game, lib);
    expect(runExamples(game, lib)).toEqual(results);
    const reversed = runExamples({ ...game, examples: [...game.examples].reverse() }, lib);
    expect(reversed.map((r) => r.status)).toEqual(['blocked', 'fail', 'pass', 'pass']);
  });

  it('finds no examples to run in a game without any', () => {
    expect(runExamples(compiled(TEST_DUEL), lib)).toEqual([]);
  });

  it('fails an example whose rules never settle, in plain words', () => {
    const runaway = withExamples(insertAfter(31, '  When the deck is not empty:', '    Shuffle the deck.'));
    const results = runExamples(compiled(runaway), lib);
    // The last example never gets as far as building the table: its Given line is already missing a phrase.
    expect(results.map((r) => r.status)).toEqual(['fail', 'fail', 'fail', 'blocked']);
    for (const r of results.slice(0, 3)) {
      expect(r.message).toMatch(/keeps firing/);
      expect(r.message).not.toMatch(/Error|at \w+\.ts|flow did not settle/);
      expect(r.atLine).toBe(r.line);
    }
  });

  it('puts the table back the way a Given line says, even after a move', () => {
    const { result } = runOne(
      'Example: a second arrangement',
      '  Given p0 holds the 3 of clubs and the 4 of clubs',
      '  And p1 holds the 9 of diamonds',
      '  When p0 plays the 3 of clubs',
      "  Then it is p1's turn",
      "  Given it is p0's turn",
      "  Then it is p0's turn",
      '  And the middle has the 3 of clubs',
    );
    expect(result).toMatchObject({ status: 'pass', message: null });
  });
});

describe('claiming cards', () => {
  const COLOR_PAIR = [
    'Game: Color Pair',
    'Players: 2',
    '',
    'Cards:',
    '  A deck called color cards, starting in the deck:',
    '    | color | number | copies |',
    '    | red   | 7      | 2      |',
    '    | blue  | 3      | 2      |',
    '',
    'Table:',
    '  The deck is a pile in the center that no one can see.',
    '  The middle is a row in the center that everyone can see.',
    '  Each player has a hand that only they can see.',
    '',
    'Phase: play',
    '  Players take turns.',
    '  A player may play a card from their hand to the middle.',
    '  After a player plays, the turn passes to the left.',
    '',
    'End:',
    "  The game ends when a player's hand is empty.",
    '  The player with an empty hand wins.',
    '',
  ].join('\n');

  /** A library whose “Then look” step hands the table to `seen`. */
  function spying() {
    const seen: GameState[] = [];
    const library = createDefaultLibrary().expect('look', (env) => {
      seen.push(env.state);
      return true;
    });
    return { library, seen };
  }

  it('claims distinct copies for repeated cards', () => {
    const { library, seen } = spying();
    const rules = compiled([COLOR_PAIR, 'Example: pair', '  Given p0 holds a red 7 and a red 7', '  Then look'].join('\n'), library);
    expect(runExamples(rules, library)[0]).toMatchObject({ status: 'pass', message: null });
    const ids = zoneCards(seen[0], 'hand-p0').map((c) => c.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(zoneCards(seen[0], 'hand-p0').every((c) => c.data?.color === 'red' && c.data?.number === 7)).toBe(true);
  });

  it('hands out the lowest-numbered matching card first', () => {
    const { library, seen } = spying();
    const rules = compiled([COLOR_PAIR, 'Example: lowest', '  Given p0 holds a red 7', '  And p1 holds a red 7', '  Then look'].join('\n'), library);
    expect(runExamples(rules, library)[0].status).toBe('pass');
    const state = seen[0];
    const reds = state.cards.filter((c) => c.data?.color === 'red').map((c) => Number(c.id.slice(1))).sort((a, b) => a - b);
    expect(zoneCards(state, 'hand-p0').map((c) => c.id)).toEqual([`c${reds[0]}`]);
    expect(zoneCards(state, 'hand-p1').map((c) => c.id)).toEqual([`c${reds[1]}`]);
  });

  it('puts c3 before c12: ids go by number, not by text', () => {
    const { library, seen } = spying();
    const many = COLOR_PAIR.replace('| red   | 7      | 2      |', '| red   | 7      | 40     |');
    const twelve = `${Array(11).fill('a red 7').join(', ')} and a red 7`;
    const rules = compiled([many, 'Example: many', `  Given p0 holds ${twelve}`, '  Then look'].join('\n'), library);
    expect(runExamples(rules, library)[0]).toMatchObject({ status: 'pass', message: null });
    const reds = seen[0].cards.filter((c) => c.data?.color === 'red').map((c) => Number(c.id.slice(1))).sort((a, b) => a - b);
    expect(zoneCards(seen[0], 'hand-p0').map((c) => c.id)).toEqual(reds.slice(0, 12).map((n) => `c${n}`));
    expect(reds[11]).toBeGreaterThan(9);
  });

  it('runs out of copies in plain words', () => {
    const rules = compiled([COLOR_PAIR, 'Example: too many', '  Given p0 holds a red 7 and a red 7 and a red 7', '  Then p0 holds 3 cards'].join('\n'));
    expect(runExamples(rules, lib)[0]).toMatchObject({
      status: 'fail', message: 'Line 25 (“p0 holds a red 7 and a red 7 and a red 7”): No card matches “a red 7”.', atLine: 25,
    });
  });

  it('does not let a later example see the cards an earlier one claimed', () => {
    const rules = compiled([
      COLOR_PAIR,
      'Example: first', '  Given p0 holds a red 7 and a red 7', '  Then p0 holds 2 cards',
      '',
      'Example: second', '  Given p1 holds a red 7 and a red 7', '  Then p1 holds 2 cards',
    ].join('\n'));
    expect(runExamples(rules, lib).map((r) => r.status)).toEqual(['pass', 'pass']);
  });
});

describe('board examples', () => {
  /** The Tiny Board with these example blocks under it. */
  const onBoard = (...blocks: string[]) => compileGame(`${TINY_BOARD}\n\n${blocks.join('\n\n')}`, lib);

  it('runs a board example', () => {
    const { game } = onBoard([
      'Example: rent goes to the owner', '  Given p1 owns Rose Lane', '  And p0 is on Mill Lane', '  And the next roll is 1 and 1',
      '  When p0 rolls the dice', '  Then p0 is on Rose Lane', '  And p0 has 1486 money', '  And p1 has 1514 money',
    ].join('\n'));
    expect(runExamples(game!, lib)).toEqual([expect.objectContaining({ status: 'pass' })]);
  });

  it('says what a board example found instead', () => {
    const { game } = onBoard([
      'Example: wrong amount', '  Given p0 is on Mill Lane', '  And the next roll is 1 and 1', '  When p0 rolls the dice', '  Then p0 has 1 money',
    ].join('\n'));
    expect(runExamples(game!, lib)[0]).toMatchObject({ status: 'fail', message: 'Expected p0 to have 1 money, but they have 1500.' });
  });

  it('refuses a fixed roll with the wrong number of dice or an impossible face, on its own line', () => {
    const { game } = onBoard(
      ['Example: one number', '  Given the next roll is 3', '  When p0 rolls the dice', '  Then p0 has 1500 money'].join('\n'),
      ['Example: a seven', '  Given the next roll is 7 and 1', '  When p0 rolls the dice', '  Then p0 has 1500 money'].join('\n'),
    );
    const [one, seven] = runExamples(game!, lib);
    expect(one).toMatchObject({ status: 'fail', message: expect.stringContaining('This game rolls 2 dice, so give 2 numbers.') });
    expect(seven).toMatchObject({ status: 'fail', message: expect.stringContaining("A 6-sided die can't roll 7.") });
    expect(one.atLine).toBe(seven.atLine! - 5);
  });

  it('starts a board example with the pieces and counters of a new game, and keeps what Given lines changed', () => {
    const { game } = onBoard([
      'Example: arranged before the game starts', '  Given p1 has 100 money', '  And the next roll is 1 and 2',
      '  Then p0 is on Go', '  And p0 has 1500 money',
      '  When p0 rolls the dice', '  Then p0 is on Rose Lane', '  And p0 has 1500 money', '  And p1 has 100 money',
    ].join('\n'));
    expect(runExamples(game!, lib)).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
  });

  it('puts a player out in a Given line and leaves the other pieces where a new game has them', () => {
    // With only one player left a game is over, so this example rolls nothing.
    const { game } = onBoard(['Example: out before it starts', '  Given p1 is out', '  Then p1 is out', '  And p0 is on Go'].join('\n'));
    expect(runExamples(game!, lib)[0]).toMatchObject({ status: 'pass', message: null });
  });

  it('cannot fix a roll in a game with more than two dice, and says so on that line', () => {
    const threeDice = TINY_BOARD.replace('There are two six-sided dice.', 'There are three six-sided dice.');
    const example = ['Example: three dice', '  Given the next roll is 1 and 2', '  When p0 rolls the dice'].join('\n');
    const { game } = compileGame(`${threeDice}\n\n${example}`, lib);
    const [result] = runExamples(game!, lib);
    expect(result).toMatchObject({
      status: 'fail', message: expect.stringContaining('Examples can only fix the next roll in a game with one or two dice.'),
    });
    expect(result.atLine).toBe(result.line + 1);
  });

  it('buys the space a player is on after they have rolled, and ends their turn', () => {
    const { game } = onBoard(
      [
        'Example: buying', '  Given p0 is on Mill Lane', '  And p0 has rolled this turn',
        '  When p0 buys the space they are on', '  Then p0 owns Mill Lane', '  And no one owns Rose Lane', '  And p0 has 1440 money',
      ].join('\n'),
      [
        'Example: ending the turn', '  Given p0 has rolled this turn', '  When p0 ends their turn', "  Then it is p1's turn",
      ].join('\n'),
    );
    expect(runExamples(game!, lib).map((r) => r.status)).toEqual(['pass', 'pass']);
  });

  it('refuses a player who is not at the table, on its own line', () => {
    const { game } = onBoard(['Example: a stranger', '  Given p3 is on Mill Lane', '  Then p0 has 1500 money'].join('\n'));
    expect(runExamples(game!, lib)[0]).toMatchObject({ status: 'fail', message: expect.stringContaining('There is no player p3 at this table.') });
  });
});

describe('cards that say what they do, in examples', () => {
  const FATE = ['| name | says |', '| Calm | They get 0 money. |'];

  it('names the cards of a pile by their name, leaving what they say out', () => {
    const example = ['', 'Example: the pile', '  Given the lucky pile has a Dividend', '  Then the lucky pile has a Fine'].join('\n');
    const text = `${deckGameText(['| name | says |', '| Dividend | They get 50 money. |', '| Fine | They pay 15. |'], FATE)}\n${example}`;
    const { game, diagnostics } = compileGame(text, lib);
    expect(diagnostics).toEqual([]);
    const results = runExamples(game!, lib);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ status: 'fail', message: 'Expected the lucky pile to have a Fine, but it has a Dividend.' });
  });
});

describe('examples in a game with rounds', () => {
  const ROUND_EXAMPLES = [
    '',
    'Example: an arranged turn has already started',
    '  Given p0 has 1 move',
    '  When p0 works',
    "  Then it is p1's turn",
    '  And p0 has 2 coins',
    '  And p1 has 1 coin',
    '  And p1 has 2 moves',
    '',
    'Example: each round starts with the start player',
    '  Given 3 players',
    '  And p1 is the start player',
    "  And it is p1's turn",
    '  When p1 stops',
    "  Then it is p2's turn",
    '  When p2 stops',
    '  And p0 stops',
    "  Then it is p1's turn",
    '  And the done pile has 1 card',
    '',
    'Example: setting up starts the first round once',
    '  Given the game is set up',
    '  Then the done pile has 1 card',
    '',
    'Example: a step that finishes the turn',
    '  Given the turn passes to the left',
    '  When p1 stops',
    "  Then it is p0's turn",
    '  And p1 has 2 coins',
  ].join('\n');

  it('starts the arranged turn already, a round only with the start player, and the first round once on setting up', () => {
    const { game, diagnostics } = compileGame(`${ROUNDS_GAME}\n${ROUND_EXAMPLES}`, lib);
    expect(diagnostics).toEqual([]);
    const results = runExamples(game!, lib);
    expect(results.map((r) => [r.name, r.status, r.message])).toEqual([
      ['an arranged turn has already started', 'pass', null],
      ['each round starts with the start player', 'pass', null],
      ['setting up starts the first round once', 'pass', null],
      ['a step that finishes the turn', 'pass', null],
    ]);
  });
});

describe('examples with a stack that never runs out', () => {
  // COUNTER_GAME with a stack of coupons that Setup deals one of to each stash, and a button that makes another one.
  const STOCKED = COUNTER_GAME
    .replace('    | Opal | 1    | 4      |', '    | Opal | 1    | 4      |\n  A stack called coupons that never runs out:\n    | name   | cost |\n    | Coupon | 0    |')
    .replace('  Deal 2 cards from the pile to the shop.', '  Deal 2 cards from the pile to the shop.\n  A new Coupon goes to each stash.')
    .replace('  A player may pass.', '  A player may clip a coupon.\n    Then:\n      A new Coupon goes to their stash.\n  A player may pass.');
  const STASH_EXAMPLE = [
    '', 'Example: a stash of coupons',
    "  Given p0's stash has a Coupon, a Coupon and a Ruby",
    '  When p0 clips a coupon',
    "  Then p0's stash has a Coupon, a Coupon, a Coupon and a Ruby",
  ].join('\n');

  it('makes the coupons a Given line asks for, and the one a press makes, as the game would', () => {
    const { game, diagnostics } = compileGame(`${STOCKED}\n${STASH_EXAMPLE}`, lib);
    expect(diagnostics).toEqual([]);
    expect(runExamples(game!, lib)).toEqual([
      { name: 'a stash of coupons', line: expect.any(Number), status: 'pass', message: null, atLine: null },
    ]);
  });
  it('fails an expectation of a coupon too few, saying what the stash has', () => {
    const example = STASH_EXAMPLE.replace("Then p0's stash has a Coupon, a Coupon, a Coupon and a Ruby", "Then p0's stash has a Coupon, a Coupon and a Ruby");
    const { game } = compileGame(`${STOCKED}\n${example}`, lib);
    expect(runExamples(game!, lib)[0]).toMatchObject({
      status: 'fail', message: expect.stringMatching(/^Expected p0's stash to have a Coupon, a Coupon and a Ruby, but it has a Coupon/),
    });
  });
  it('still runs out of the cards of a deck, in plain words: only a stack that never runs out makes more', () => {
    const example = STASH_EXAMPLE.replace('a Coupon, a Coupon and a Ruby', 'a Ruby, a Ruby, a Ruby, a Ruby and a Ruby');
    const { game } = compileGame(`${STOCKED}\n${example}`, lib);
    expect(runExamples(game!, lib)[0]).toMatchObject({ status: 'fail', message: expect.stringContaining('No card matches “a Ruby”.') });
  });
});

describe('examples that name choices', () => {
  const OPENER = [
    '',
    'Example: the opener pays a provider of their choice',
    '  Given 3 players',
    "  And p1's workshop has a Vase",
    "  And p2's workshop has a Bowl",
    "  And p0's stash has a Statue",
    '  When p0 opens the Statue',
    '  Then it is rejected because "Pick who to pay the fee to: p1 or p2."',
    '  When p0 opens the Statue, paying p2',
    '  Then it is accepted',
    '  And p2 has 11 coins',
    '  And p1 has 9 coins',
  ];
  const TRIMMER = [
    '',
    'Example: a trim is chosen when more than one fits',
    "  Given p0's workshop has a Statue",
    '  When p0 trims the Statue, choosing trim 1 of each',
    "  Then the Statue in p0's workshop has 1 gold trim",
  ];
  /** GUILD_GAME (2 to 4 players) with `lines` appended, and what running its examples gives. */
  const run = (...lines: string[]) => {
    const text = [GUILD_GAME, ...lines].join('\n');
    return { text, results: runExamples(compiled(text), lib) };
  };
  /** OPENER with its last When line naming `named` instead, and nothing after it. */
  const naming = (named: string) => [...OPENER.slice(0, 8), `  When p0 opens the Statue, ${named}`, '  Then it is accepted'];

  it('presses with the payee and the option an example names', () => {
    expect(run(...OPENER, ...TRIMMER).results.map((r) => [r.name, r.status, r.message])).toEqual([
      ['the opener pays a provider of their choice', 'pass', null],
      ['a trim is chosen when more than one fits', 'pass', null],
    ]);
  });

  it('sends a named payee who does not qualify, to be refused with the prompt', () => {
    const lines = [...naming('paying p0').slice(0, -1), '  Then it is rejected because "Pick who to pay the fee to: p1 or p2."'];
    expect(run(...lines).results[0]).toMatchObject({ status: 'pass' });
  });

  it('fails an example that names more players than the press asks for, on its When line', () => {
    const { text, results } = run(...naming('paying p1 and p2'));
    expect(results[0]).toMatchObject({
      status: 'fail', message: 'The press asks for 1 player, but the example names 2.',
      atLine: lineOf(text, 'When p0 opens the Statue, paying p1 and p2', true),
    });
  });

  it('fails an example that names an option the press does not offer, listing those it does', () => {
    const { results } = run(...TRIMMER.slice(0, 3), '  When p0 trims the Statue, choosing trim 3');
    expect(results[0]).toMatchObject({
      status: 'fail', message: '“trim 3” isn\'t a choice here. The choices are: Trim 2 red, Trim 2 gold or Trim 1 of each.',
    });
  });

  it('sends an option of the block that does not fit the card, to be refused with the prompt', () => {
    const lines = [
      '', 'Example: a Vase is red alone', "  Given p0's workshop has a Vase", '  When p0 trims the Vase, choosing trim 2 gold',
      '  Then it is rejected because "Choose one: Trim 2 red."',
    ];
    expect(run(...lines).results[0]).toMatchObject({ status: 'pass' });
  });

  it('fails an example that names an option the block does not have, listing every option it has', () => {
    const { results } = run('', 'Example: a third trim', "  Given p0's workshop has a Vase", '  When p0 trims the Vase, choosing trim 3');
    expect(results[0]).toMatchObject({
      status: 'fail', message: '“trim 3” isn\'t a choice here. The choices are: Trim 2 red, Trim 2 gold or Trim 1 of each.',
    });
  });

  it('fails an example that names an option of a block the press does not ask, which would be ignored', () => {
    // The block's guard asks nothing of a Tower.
    const { text, results } = run(
      '', 'Example: a trimmed Tower', "  Given p0's workshop has a Tower", '  When p0 trims the Tower, choosing trim 2 gold',
    );
    expect(results[0]).toMatchObject({
      status: 'fail', message: '“trim 2 gold” isn\'t a choice here: this press chooses nothing.',
      atLine: lineOf(text, 'When p0 trims the Tower, choosing trim 2 gold', true),
    });
  });

  it('fails an example that names a choice for a move that presses no button, on its When line', () => {
    const { text, result } = runOne(
      'Example: a card move pays no one', '  Given p0 holds the 3 of clubs and the 4 of clubs', '  And p1 holds the 9 of diamonds',
      '  When p0 plays the 3 of clubs, paying p1',
    );
    expect(result).toMatchObject({
      status: 'fail', message: 'Only the press of a button can name choices, and this move presses none.',
      atLine: lineOf(text, 'When p0 plays the 3 of clubs, paying p1', true),
    });
  });

  it('fails an example that names an option for a press that chooses none', () => {
    expect(run(...naming('choosing trim 2 gold')).results[0]).toMatchObject({
      status: 'fail', message: '“trim 2 gold” isn\'t a choice here: this press chooses nothing.',
    });
  });

  it('sends the press as it is when the button refuses it before its choices, for the game to say why', () => {
    const lines = [
      '', 'Example: no one makes clay', "  Given p0's stash has a Statue", '  When p0 opens the Statue, paying p1 and p2',
      '  Then it is rejected because "the card has no wants or some player has a card in their workshop whose mark is the card\'s wants"',
    ];
    expect(run(...lines).results[0]).toMatchObject({ status: 'pass' });
  });

  it('names one entry for each choice of the button, the option as the block has it, and none for a press refused before its choices', () => {
    const guild = compiled(GUILD_GAME);
    const { runtime, engine } = createEngine(guild, lib, 3, initialState(guild, 1));
    const setUp = engine.getState();
    const statue = setUp.cards.find((c) => c.data?.name === 'Statue' && c.zoneId === 'stash-p0')!.id;
    const press = (type: string) => ({ type, by: 'p0', cardId: statue });
    const OPEN = press('open a card in their stash');
    // No workshop holds anything yet: the open button refuses the Statue before it asks whom to pay.
    expect(namedChoices(runtime, setUp, OPEN, ['p1'], null)).toBeNull();
    expect(namedChoices(runtime, setUp, OPEN, [], null)).toBeNull();
    const vase = setUp.cards.find((c) => c.data?.name === 'Vase' && c.zoneId === 'stash-p1')!.id;
    const bowl = setUp.cards.find((c) => c.data?.name === 'Bowl' && c.zoneId === 'stash-p2')!.id;
    const providing = relocate(relocate(setUp, [vase], 'workshop-p1', guild), [bowl], 'workshop-p2', guild);
    expect(namedChoices(runtime, providing, OPEN, ['p0'], null)).toEqual(['p0']);
    const trimming = relocate(setUp, [statue], 'workshop-p0', guild);
    expect(namedChoices(runtime, trimming, press('trim a card in their workshop'), [], 'TRIM 1 OF EACH')).toEqual(['Trim 1 of each']);
  });

  it('is blocked by a press no phrase reads yet, on its line', () => {
    const { text, results } = run('', 'Example: dancing', '  When p0 dances, paying p2');
    expect(results[0]).toMatchObject({ status: 'blocked', atLine: lineOf(text, 'When p0 dances, paying p2', true) });
  });
});
