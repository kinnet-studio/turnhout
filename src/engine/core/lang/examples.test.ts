import { describe, expect, it } from 'vitest';
import { zoneCards, type GameState } from '../game-state';
import { compileGame } from './compile';
import { runExamples } from './examples';
import { createDefaultLibrary } from './library';
import type { PhraseLibrary } from './phrases';
import { TEST_DUEL } from './testing';
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
