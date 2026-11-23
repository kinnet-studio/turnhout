// The line that lets players answer an action before it goes ahead: who is asked, in which phase they answer, and the
// action that waits while they do. The action is kept in the state under WINDOW_KEY, Json only, until every player asked has answered.
import type { GameState } from '../game-state';
import type { PlayerId } from '../scene';
import type { InterruptedTurn } from './board-state';
import { RuleError } from './diagnostics';
import type { MoveInfo, Subject } from './types';

/** group 1 = the clause a player is asked by, said of one player; group 2 = the phase they answer in */
export const WINDOW_LINE =
  /^before an action goes ahead, each player who (.+) has the (.+), in turn from the left of the player acting$/i;
/** Absent while no action waits; while one does, a Waiting. Never sent to a seat: views carry the scene, the turn and the extras. */
export const WINDOW_KEY = 'lang:window';

/**
 * A press of a button with a cost, judged and paid for, that waits while the players asked answer it: who pressed it (`by`), the phase
 * it was pressed in (`from`), its move type, what it is about (choices included), the card move and the moving of cards it makes, the
 * seats asked in turn from the left of `by` and the index of the one answering, the turn as it stood, and, once answered, the verdict.
 */
export type Waiting = {
  phase: string; by: PlayerId; from: string; move: string; subject: Subject; info?: MoveInfo;
  relocation?: { ids: string[]; to: string }; asked: PlayerId[]; at: number; back: InterruptedTurn; verdict?: 'ahead' | 'stopped';
};

/** The action waiting for the players to answer it, or null when none does. */
export function waitingOf(state: GameState): Waiting | null {
  return (state.data[WINDOW_KEY] ?? null) as unknown as Waiting | null;
}

export const NO_ACTION_WAITING = 'No action is waiting for the players to answer it.';

/** The player whose action waits; RuleError NO_ACTION_WAITING when none does. */
export function actingPlayer(state: GameState): PlayerId {
  const waiting = waitingOf(state);
  if (waiting === null) throw new RuleError(NO_ACTION_WAITING);
  return waiting.by;
}
