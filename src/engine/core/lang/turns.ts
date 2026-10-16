// Rounds and turns as a game keeps them: which phases are played in turns, and the player who took the first turn.
import type { GameState } from '../game-state';
import type { PlayerId } from '../scene';
import type { CompiledGame } from './types';

/** The seat that took the game's first turn. */
export const START_PLAYER_KEY = 'lang:start-player';

/** The Setup line that picks the start player. A game that uses turns without it starts with the first seat. */
export const START_PLAYER_PHRASE = 'the start player is chosen at random';

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
