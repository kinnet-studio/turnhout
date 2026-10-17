// Rounds and turns as a game keeps them: which phases are played in turns, the player who took the first turn, whose turn has
// started and how many rounds have.
import type { GameState } from '../game-state';
import type { PlayerId } from '../scene';
import { interruptedTurn } from './board-state';
import { innerEffect } from './compile-util';
import type { CompiledGame } from './types';

/** The seat that took the game's first turn. */
export const START_PLAYER_KEY = 'lang:start-player';

/** The seat whose turn has started: until the turn passes, its start lines have run. */
export const TURN_OF_KEY = 'lang:turn-of';

/** How many rounds have started. */
export const ROUND_KEY = 'lang:round';

/** Absent before the steps before the score; while they run, the seat that took the first step; true once every seat still in has had one. */
export const END_STEPS_KEY = 'lang:end-steps';

/** The Setup line that picks the start player. A game that uses turns without it starts with the first seat. */
export const START_PLAYER_PHRASE = 'the start player is chosen at random';

/** The compiler's frame for an End condition that holds only once the round is finished: “… and the round is finished”. */
export const ROUND_FRAME = 'round';

/**
 * Whether players take turns in the phase, so that its own lines are about the player whose turn it is. Setup is not one of the
 * game's phases: its lines are about no one.
 */
export function phaseTakesTurns(game: CompiledGame, phaseId: string): boolean {
  return game.phases.find((p) => p.id === phaseId)?.actor === 'current';
}

/** The seat the state keeps as the start player when it is one of `seats`, else the first seat. */
export function startPlayerOf(state: GameState, seats: PlayerId[]): PlayerId {
  const kept = state.data[START_PLAYER_KEY];
  return typeof kept === 'string' && seats.includes(kept) ? kept : seats[0];
}

/** How many rounds have started; 0 before the first. */
export function roundOf(state: GameState): number {
  const round = state.data[ROUND_KEY];
  return typeof round === 'number' ? round : 0;
}

/**
 * Whether a round is finished and the next has yet to start: one has started, and the turn has passed back to the start player,
 * whose turn has not started again. The turn start that would start the next round waits for the flow to check End, so that is
 * the moment End sees. A turn that is interrupted is in the middle of a round, whoever stands in for it.
 */
export function roundFinished(state: GameState, seats: PlayerId[]): boolean {
  const current = state.turn?.current;
  return roundOf(state) >= 1 && current === startPlayerOf(state, seats) && state.data[TURN_OF_KEY] !== current
    && interruptedTurn(state) === null;
}

/**
 * The turn as it stands counted as started, in a round that has: an example arranges a turn mid-game, and building the engine
 * must not start it again, which would set back what the example arranged. A state with no turn comes back as it is.
 */
export function markTurnStarted(state: GameState): GameState {
  if (!state.turn) return state;
  return { ...state, data: { ...state.data, [TURN_OF_KEY]: state.turn.current, [ROUND_KEY]: Math.max(1, roundOf(state)) } };
}

/**
 * The state with no turn counted as started: the turn has passed, so the next one starts, even when it comes back to the same seat
 * (a lone player, or everyone else out).
 */
export function clearTurnOf(state: GameState): GameState {
  const { [TURN_OF_KEY]: _turnOf, ...data } = state.data;
  return { ...state, data };
}

/** The state with no turn started, no round, no start player and no steps before the score, as a game is before its Setup. */
export function clearTurnMarkers(state: GameState): GameState {
  const { [TURN_OF_KEY]: _turnOf, [ROUND_KEY]: _round, [START_PLAYER_KEY]: _start, [END_STEPS_KEY]: _steps, ...data } = state.data;
  return { ...state, data };
}

/**
 * Whether the game plays in rounds of turns that start by themselves: it has a number each player has each turn, a start player,
 * lines that start a round or a turn, or an End that waits for the round to finish. Other games never start a turn, so they run as
 * they always have.
 */
export function usesTurns(game: Pick<CompiledGame, 'board' | 'setup' | 'everyPhase' | 'end' | 'phases'>): boolean {
  const { board, setup, everyPhase, end, phases } = game;
  if (board?.counters.some((counter) => counter.perTurn)) return true;
  // Rounds are only counted as turns start, so an End that waits for one needs them started.
  if (end?.when.kind === 'lang' && end.when.phrase === ROUND_FRAME) return true;
  if (setup.some((ref) => {
    const effect = innerEffect(ref);
    return effect.kind === 'effect' && effect.phrase === START_PLAYER_PHRASE;
  })) return true;
  if (everyPhase.roundStarts.length > 0 || everyPhase.turnStarts.length > 0) return true;
  return phases.some((phase) => phase.turnStarts.length > 0);
}
