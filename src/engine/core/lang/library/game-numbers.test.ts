import { describe, expect, it } from 'vitest';
import type { GameState } from '../../game-state';
import { counterOf, gameNumber, owedTo, setCounter, setGameNumber } from '../board-state';
import { compileGame } from '../compile';
import { fixtureBoardState, fixtureEnv, runPhrase, TINY_BOARD_HEAD } from '../testing';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();
const POT = TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  The game has a pot of 5.');
const game = compileGame(POT, lib).game!;
const start = fixtureBoardState(game);
const about = (state: GameState) => fixtureEnv(state, { game, seats: ['p0', 'p1'], subject: { player: 'p0', space: null, card: null } });
const bare = (state: GameState) => fixtureEnv(state, { game, seats: ['p0', 'p1'] });

describe('numbers that belong to the game', () => {
  it('declares a number of the game and where it starts', () => {
    expect(compileGame(POT, lib).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game.facts).toEqual([{ name: 'pot', on: 'game', kind: 'number', start: 5 }]);
    expect(gameNumber(start, game, 'pot')).toBe(5);
  });
  it('is set by a rule, and paid to the bank from the counter players pay with', () => {
    const s = runPhrase<GameState>(lib, 'effect', 'the pot is 30', about(start));
    expect(gameNumber(s, game, 'pot')).toBe(30);
    expect(counterOf(runPhrase<GameState>(lib, 'effect', 'they pay the pot', about(s)), 'money', 'p0')).toBe(1470);
  });
  it('notes a debt to the bank when paying it takes them below 0', () => {
    const s = runPhrase<GameState>(lib, 'effect', 'they pay the pot', about(setGameNumber(setCounter(start, 'money', 'p0', 10), 'pot', 30)));
    expect([counterOf(s, 'money', 'p0'), owedTo(s, 'p0', 'money')]).toEqual([-20, 'bank']);
  });

  it('is arranged by a Given line and checked by a Then line, which says what it is when it is not what was expected', () => {
    const given = runPhrase<GameState>(lib, 'given', 'the pot is 50', bare(start));
    expect(runPhrase(lib, 'expect', 'the pot is 50', bare(given))).toBe(true);
    expect(runPhrase(lib, 'expect', 'the pot is 40', bare(given))).toBe('Expected the pot to be 40, but it is 50.');
  });
  it('reads a Then line before any rule has set the number, as the number it starts at', () => {
    expect(runPhrase(lib, 'expect', 'the pot is 5', bare(start))).toBe(true);
  });

  it('refuses two numbers of one name, on the later line', () => {
    const twice = compileGame(POT.replace('  The game has a pot of 5.', '  The game has a pot of 5.\n  The game has a pot of 0.'), lib);
    expect(twice.diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message])).toEqual([[16, 'There are two facts called “pot”.']]);
  });
  it('is declared with “an” as well as “a”, and a name of several words', () => {
    const text = TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  The game has an ante of 2.\n  The game has a high pot of 0.');
    const built = compileGame(text, lib);
    expect(built.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(built.game!.facts).toEqual([
      { name: 'ante', on: 'game', kind: 'number', start: 2 }, { name: 'high pot', on: 'game', kind: 'number', start: 0 },
    ]);
  });

  it('needs a player, and something to pay with, to be paid', () => {
    expect(lib.get('effect', 'they pay the {gamenumber}')).toMatchObject({ needsPlayer: true, needsPayment: true });
  });
  it('says the game has no number called that when it never declared one', () => {
    expect(() => gameNumber(start, game, 'ante')).toThrow('The game has no number called “ante”.');
  });
});
