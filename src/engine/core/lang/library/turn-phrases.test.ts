import { describe, expect, it } from 'vitest';
import type { GameState, TurnState } from '../../game-state';
import { nextInt } from '../../rng';
import { TURN_KEY, counterOf, markOut, recordAction } from '../board-state';
import { compileGame } from '../compile';
import { RuleError } from '../diagnostics';
import { LangRuntime } from '../runtime';
import { TURN_GAME, fixtureBoardState, runPhrase } from '../testing';
import { START_PLAYER_KEY, START_PLAYER_PHRASE, startPlayerOf } from '../turns';
import type { CompiledGame } from '../types';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();
const chores = compileGame(TURN_GAME, lib).game!;
const seats = ['p0', 'p1', 'p2'];
/** TURN_GAME's state at three seats as a new game starts, at `turn`. */
const at = (turn: TurnState, game: CompiledGame = chores): GameState => ({ ...fixtureBoardState(game, seats), turn });
/** Runs an effect or Given line on `state` as the game's runtime would, so that it could run the lines of a phase if it meant to. */
const run = (kind: 'effect' | 'given', text: string, state: GameState, game: CompiledGame = chores, among: string[] = seats) =>
  runPhrase<GameState>(lib, kind, text, new LangRuntime(game, lib, among).env(state));

describe('the turn passes to the left, as a step of the turn', () => {
  const PASS = 'the turn passes to the left';

  it('goes to the next player still in, back at the first phase, and forgets what was done in the turn', () => {
    const tidying = markOut(recordAction(at({ current: 'p0', phase: 'tidying' }), 'p0', 'work'), 'p1');
    const passed = run('effect', PASS, tidying);
    expect(passed.turn).toEqual({ current: 'p2', phase: 'working', chosen: true });
    expect(passed.data[TURN_KEY]).toEqual({});
    expect(run('effect', PASS, { ...tidying, turn: { current: 'p2', phase: 'tidying' } }).turn).toEqual({ current: 'p0', phase: 'working', chosen: true });
  });
  it('leaves a lone player the turn', () => {
    expect(run('effect', PASS, at({ current: 'p0', phase: 'tidying' }), chores, ['p0']).turn).toEqual({ current: 'p0', phase: 'working', chosen: true });
  });
  it('runs no phase’s start lines: the pass happens before the game checks whether it is over', () => {
    const started = compileGame(TURN_GAME.replace('Phase: working\n  Players take turns.\n', 'Phase: working\n  Players take turns.\n  When this phase starts:\n    They get 5 coins.\n'), lib).game!;
    expect(started.phases[0].onEnter).toHaveLength(1);
    const before = at({ current: 'p0', phase: 'tidying' }, started);
    const passed = run('effect', PASS, before, started);
    expect(passed.turn).toEqual({ current: 'p1', phase: 'working', chosen: true });
    expect(seats.map((seat) => counterOf(passed, 'coins', seat))).toEqual(seats.map((seat) => counterOf(before, 'coins', seat)));
  });
  it('says so when there is no turn to pass', () => {
    const { turn: _none, ...noTurn } = at({ current: 'p0', phase: 'tidying' });
    expect(() => run('effect', PASS, noTurn)).toThrow(RuleError);
    expect(() => run('effect', PASS, noTurn)).toThrow('There is no turn to pass.');
  });
});

describe('the start player', () => {
  const setup = at({ current: 'p0', phase: '__setup' });

  it('is chosen at random from the seed, kept, and given the first turn', () => {
    const chosen = run('effect', START_PLAYER_PHRASE, setup);
    const { value, rng } = nextInt(setup.rng, seats.length);
    expect(chosen.data[START_PLAYER_KEY]).toBe(seats[value]);
    expect(chosen.turn).toEqual({ current: seats[value], phase: '__setup', chosen: true });
    expect(chosen.rng).toEqual(rng);
    expect(chosen.rng).not.toEqual(setup.rng);
    expect(run('effect', 'The start player is chosen at random', setup).data[START_PLAYER_KEY]).toBe(seats[value]);
  });
  it('can be given in an example', () => {
    expect(run('given', 'p1 is the start player', setup).data[START_PLAYER_KEY]).toBe('p1');
  });
  it('is the seat kept, or the first seat when none at the table is', () => {
    expect(startPlayerOf({ ...setup, data: { ...setup.data, [START_PLAYER_KEY]: 'p2' } }, seats)).toBe('p2');
    expect(startPlayerOf(setup, seats)).toBe('p0');
    expect(startPlayerOf({ ...setup, data: { ...setup.data, [START_PLAYER_KEY]: 'p3' } }, seats)).toBe('p0');
  });
});
