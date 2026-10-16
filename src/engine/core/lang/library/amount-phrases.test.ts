import { describe, expect, it } from 'vitest';
import type { GameState } from '../../game-state';
import { gameNumber, setGameNumber } from '../board-state';
import { compileGame } from '../compile';
import { AMOUNT_BOARD, fixtureBoardState, fixtureEnv, runPhrase, vocabFor } from '../testing';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();
const pot = compileGame(AMOUNT_BOARD, lib).game!;
const start = fixtureBoardState(pot);
/** The env of a rule about p0 whose button carries `amount`. */
const about = (state: GameState, amount?: number) =>
  fixtureEnv(state, { game: pot, seats: ['p0', 'p1'], subject: { player: 'p0', space: null, card: null, ...(amount === undefined ? {} : { amount }) } });
const held = setGameNumber(start, 'pot', 5);

describe('phrases that read the amount a button carries', () => {
  it('compares the amount with a number of the game', () => {
    const more = (amount: number) => runPhrase<boolean>(lib, 'condition', 'the amount is more than the pot', about(held, amount));
    expect([more(6), more(5), more(4)]).toEqual([true, false, false]);
  });
  it('compares the amount with what the player has', () => {
    const has = (amount: number) => runPhrase<boolean>(lib, 'condition', 'they have at least the amount in money', about(start, amount));
    expect([has(1500), has(1501)]).toEqual([true, false]);
  });
  it('sets a number of the game to the amount', () => {
    const set = runPhrase<GameState>(lib, 'effect', 'the pot is the amount', about(start, 70));
    expect(gameNumber(set, pot, 'pot')).toBe(70);
  });
  it('says so when the rule has no amount, which the compiler lets no rule outside an amount button come to', () => {
    expect(() => runPhrase(lib, 'condition', 'the amount is more than the pot', about(held))).toThrow('This phrase needs an amount, but the button carries none.');
  });

  it('needs an amount, and the second condition a player too', () => {
    expect(lib.get('condition', 'the amount is more than the {gamenumber}')).toMatchObject({ needsAmount: true });
    expect(lib.get('condition', 'they have at least the amount in {counter}')).toMatchObject({ needsPlayer: true, needsAmount: true });
    expect(lib.get('effect', 'the {gamenumber} is the amount')).toMatchObject({ needsAmount: true });
  });

  describe('the example action', () => {
    it('reads the amount after the button, which an example may press with any number', () => {
      expect(lib.match('action', 'p1 raises 50', vocabFor(pot))).toMatchObject({ status: 'ok', args: ['p1', 'raise an amount', 50] });
      expect(runPhrase(lib, 'action', 'p1 raises 50', about(start))).toEqual({ by: 'p1', move: { type: 'raise an amount', amount: 50 } });
    });
    it('reads a negative number too, which the move itself then refuses', () => {
      expect(lib.match('action', 'p1 raises -5', vocabFor(pot))).toMatchObject({ status: 'ok', args: ['p1', 'raise an amount', -5] });
    });
    it('is for the buttons that carry an amount only', () => {
      expect(lib.match('action', 'p1 rolls the dice 50', vocabFor(pot)).status).not.toBe('ok');
      expect(lib.match('action', 'p1 raises an amount', vocabFor(pot))).toMatchObject({ status: 'ok', args: ['p1', 'raise an amount'] });
    });
  });
});
