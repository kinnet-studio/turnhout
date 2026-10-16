import { describe, expect, it } from 'vitest';
import type { GameState } from '../../game-state';
import { playerFact } from '../board-state';
import { compileGame } from '../compile';
import { PICK_BOARD, fixtureBoardState, fixtureEnv, runPhrase, vocabFor } from '../testing';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();
const pick = compileGame(PICK_BOARD, lib).game!;
const start = fixtureBoardState(pick);
/** The env of a rule about p0 whose button picked `picked`. */
const about = (state: GameState, picked?: string) =>
  fixtureEnv(state, { game: pick, seats: ['p0', 'p1'], subject: { player: 'p0', space: null, card: null, ...(picked === undefined ? {} : { picked }) } });

describe('phrases that read the player a button picks', () => {
  it('sets a fact of the player picked, and no one else', () => {
    const set = runPhrase<GameState>(lib, 'effect', 'that player is the rival', about(start, 'p1'));
    expect([playerFact(set, 'p0', 'the rival'), playerFact(set, 'p1', 'the rival')]).toEqual([null, true]);
  });
  it('says so when the rule has no pick, which the compiler lets no rule outside a pick button come to', () => {
    expect(() => runPhrase(lib, 'effect', 'that player is the rival', about(start))).toThrow('This phrase needs a player picked, but the button carries none.');
  });

  it('needs a pick', () => {
    expect(lib.get('effect', 'that player is {playerflag}')).toMatchObject({ needsPick: true });
  });

  describe('the example action', () => {
    it('reads the player picked after the button, and sends the seat as written', () => {
      expect(lib.match('action', 'p0 challenges p1', vocabFor(pick))).toMatchObject({ status: 'ok', args: ['p0', 'challenge another player', 'p1'] });
      expect(runPhrase(lib, 'action', 'p0 challenges p1', about(start))).toEqual({ by: 'p0', move: { type: 'challenge another player', player: 'p1' } });
      // The button refuses a seat that is no one to pick, not the example.
      expect(runPhrase(lib, 'action', 'p0 challenges p0', about(start))).toEqual({ by: 'p0', move: { type: 'challenge another player', player: 'p0' } });
    });
    it('presses the button with no pick when the example says “another player”', () => {
      expect(lib.match('action', 'p0 challenges another player', vocabFor(pick))).toMatchObject({ status: 'ok', pattern: '{player} {action}' });
      expect(runPhrase(lib, 'action', 'p0 challenges another player', about(start))).toEqual({ by: 'p0', move: { type: 'challenge another player' } });
    });
    it('is for the buttons that pick a player only', () => {
      expect(lib.match('action', 'p0 rolls the dice p1', vocabFor(pick)).status).not.toBe('ok');
    });
  });
});
