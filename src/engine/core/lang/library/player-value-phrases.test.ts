import { describe, expect, it } from 'vitest';
import type { GameState } from '../../game-state';
import type { PlayerId } from '../../scene';
import { putOn } from '../attach';
import { createEngine, initialState } from '../build';
import { changeCard } from '../card-facts';
import { compileGame } from '../compile';
import { RuleError } from '../diagnostics';
import { FORCE_GAME, fixtureEnv, runPhrase } from '../testing';
import type { CompiledGame } from '../types';
import { relocate } from '../zones';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();

/** Compiles rules that must have no problems at all. */
function compiled(text: string): CompiledGame {
  const { game, diagnostics } = compileGame(text, lib);
  expect(diagnostics).toEqual([]);
  return game!;
}

const game = compiled(FORCE_GAME);
// Setup deals 2 jobs to each stash, more than the pile holds for three: a state with p0's turn set skips it.
const { engine, runtime } = createEngine(game, lib, 3, { ...initialState(game, 1), turn: { current: 'p0', phase: 'working' } });
/** The state as p0's turn starts, from seed 1: the jobs in the pile, the hands in the hall. */
const setUp = engine.getState();
const all = (name: string) => setUp.cards.filter((card) => card.data?.name === name).map((card) => card.id);
const [vase] = all('Vase');
const [statue, secondStatue] = all('Statue');
const [potter] = all('Potter');
const [tinker] = all('Tinker');
const [smith] = all('Smith');

/**
 * p0's workshop holding a Vase (red need 2) with a Potter (red work 1) and a Tinker (red work 1) on it, and p1's a Statue (red need 1)
 * with a Smith (gold, so no red work) on it. p2 has neither.
 */
const table = [
  (state: GameState) => relocate(state, [vase], 'workshop-p0', game),
  (state: GameState) => relocate(state, [statue], 'workshop-p1', game),
  (state: GameState) => putOn(state, [potter, tinker], 'crew-p0', vase, game),
  (state: GameState) => putOn(state, [smith], 'crew-p1', statue, game),
].reduce((state, arrange) => arrange(state), setUp);

/** What a seat's value comes to, as the runtime works it out. */
const value = (seat: PlayerId, name: string, state: GameState = table) => runtime.playerValue(state, seat, name);
/** A condition judged about `seat`, with the values the runtime works out. */
const holds = (seat: PlayerId, text: string, state: GameState = table) => runPhrase<boolean>(lib, 'condition', text, fixtureEnv(state, {
  game, seats: runtime.seats, subject: { player: seat, space: null, card: null },
  playerValue: runtime.playerValue, workedValue: runtime.workedValue, workedFlag: runtime.workedFlag,
}));

describe('values about a player', () => {
  it('adds up a number over the cards in their zones, from 0', () => {
    expect(['p0', 'p1', 'p2'].map((seat) => [value(seat, 'red force'), value(seat, 'red load')])).toEqual([[2, 2], [0, 1], [0, 0]]);
  });
  it('reads each card’s number as its value is worked out', () => {
    // A tired card's red work is 0, so only the Tinker's counts.
    const tired = changeCard(table, potter, { tired: true }, game);
    expect(value('p0', 'red force', tired)).toBe(1);
  });
  it('counts a card without the number as nothing', () => {
    const worth = compiled(FORCE_GAME.replace('the total red work of the cards in their crew.', 'the total worth of the cards in their crew.'));
    const built = createEngine(worth, lib, 3, table).runtime;
    // Hands have no worth.
    expect(built.playerValue(table, 'p0', 'red force')).toBe(0);
  });
  it('is a mistake in the code, not in the rules, for a name no section works out', () => {
    const thrown = (() => {
      try {
        return value('p0', 'red forse');
      } catch (error) {
        return error;
      }
    })();
    expect(thrown).toEqual(new Error('No value called “red forse” is worked out for players.'));
    expect(thrown).not.toBeInstanceOf(RuleError);
  });
});

describe('comparing values about a player', () => {
  it('compares one of their values with another', () => {
    expect(['p0', 'p1'].map((seat) => holds(seat, 'their red force is at least their red load'))).toEqual([true, false]);
    expect(['p0', 'p1'].map((seat) => holds(seat, 'their red load is more than their red force'))).toEqual([false, true]);
  });
  it('compares one of their values with a whole number', () => {
    expect(holds('p0', 'their red force is 2')).toBe(true);
    expect(holds('p0', 'their red force is at least 3')).toBe(false);
    expect(holds('p0', 'their red force is more than 1')).toBe(true);
  });
});

describe('a value about a player in a button', () => {
  const stopping = compiled(FORCE_GAME.replace('  A player may stop.', '  A player may stop.\n    Only if their red force is at least their red load.'));
  const stop = { type: 'stop', by: 'p0' };

  it('refuses the press while the condition does not hold', () => {
    const { engine: playing } = createEngine(stopping, lib, 3, relocate(table, [secondStatue], 'workshop-p0', stopping));
    expect(playing.dispatch(stop)).toMatchObject({ ok: false, reason: 'their red force is at least their red load' });
  });
  it('accepts it once it does', () => {
    const { engine: playing } = createEngine(stopping, lib, 3, table);
    expect(playing.dispatch(stop)).toMatchObject({ ok: true });
  });
});
