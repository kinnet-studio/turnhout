import type { GameState } from '../game-state';
import type { Move, MoveHandler } from '../moves';
import type { PlayerId } from '../scene';
import { clearTurnLog, endsTurn, isOut, recordAction } from './board-state';
import { secondPersonWords } from './refs';
import type { LangRuntime } from './runtime';
import type { CompiledPhase, DeclaredAction, Subject } from './types';

const OUT = "You're out of the game.";

/** What a refusal calls a button: its wording without the space it picks, in the second person. A move no phase declares is called by itself. */
function calledBy(move: string, runtime: LangRuntime): string {
  const declared = runtime.game.phases.flatMap((p) => p.actions).find((a) => a.words === move);
  return secondPersonWords(declared?.base ?? move);
}

/** The space the move picks, or null when it carries none that the board has. */
function pickedBy(m: Move, runtime: LangRuntime): number | null {
  const { target } = m;
  const spaces = runtime.game.board?.spaces.length ?? 0;
  return typeof target === 'number' && Number.isInteger(target) && target >= 0 && target < spaces ? target : null;
}

/**
 * Who a button is about: the player who presses it and, through “it”, the space it picks, else the space their piece is on.
 * A button that picks a space is refused, in the player's words, when the move names none or one its target does not allow.
 */
function aboutPress(action: DeclaredAction, runtime: LangRuntime, state: GameState, m: Move, by: PlayerId): Subject | string {
  if (action.target === null) return { player: by, space: null, card: null };
  const space = pickedBy(m, runtime);
  if (space === null) return `Pick where to ${secondPersonWords(action.base)}.`;
  const subject: Subject = { player: by, space, card: null };
  return runtime.allowsTarget(action.target, state, subject, space) ? subject : `That isn't ${secondPersonWords(action.target.text.toLowerCase())}.`;
}

/** The current phase's button whose move type is `move` and that allows it, with who it is about; else why not. */
function choose(
  move: string, runtime: LangRuntime, state: GameState, m: Move,
): { phase: CompiledPhase; action: DeclaredAction; by: PlayerId; subject: Subject } | string {
  const phase = runtime.game.phases.find((p) => p.id === state.turn?.phase);
  const action = phase?.actions.find((a) => a.words === move);
  // Nobody can press a button without being someone at the table: a move with no player, or from a seat the game does not
  // have, is refused as if the button were not there. The turn gate lets a button any player may press through for anyone.
  const by = m.by as PlayerId | undefined;
  if (!phase || !action || typeof by !== 'string' || !runtime.seats.includes(by)) return `You can't ${calledBy(move, runtime)} now.`;
  if (isOut(state, by)) return OUT;
  const subject = aboutPress(action, runtime, state, m, by);
  if (typeof subject === 'string') return subject;
  return runtime.failedGroup(action.conditions, state, undefined, subject) ?? { phase, action, by, subject };
}

/**
 * The move handler for one button the designer declared, like “A player may roll the dice.” It refuses in the
 * designer's own words, then notes the action for the player (so “they have rolled this turn” holds) and runs its Then
 * lines. A button the After line names passes the turn, and with it everything done in the turn stops counting. A button
 * any player may press (“Any player may wave.”) may be sent by any seat still in, whoever's turn it is; it is no part of
 * anyone's turn, so it is not noted for the turn, and the After line can't name it. A button that picks a space
 * (“A player may plant a flag on a field they own.”) takes it from the move's `target`, the index of the space on the
 * board, and its lines are about that space.
 */
export function declaredActionHandler(move: string, runtime: LangRuntime): MoveHandler {
  return {
    legal(state, m) {
      const choice = choose(move, runtime, state, m);
      return typeof choice === 'string' ? choice : true;
    },
    apply(state, m) {
      const choice = choose(move, runtime, state, m);
      if (typeof choice === 'string') throw new Error(`The “${move}” button was applied though it is not allowed: ${choice}`);
      const { phase, action, by, subject } = choice;
      // A press anyone may make is no part of anyone's turn, so it is not noted among what the player did in it.
      const recorded = action.anyone ? state : recordAction(state, by, move);
      const done = action.effects.reduce((s, ref) => runtime.run(ref, s, undefined, undefined, subject), recorded);
      return endsTurn(phase, move) ? clearTurnLog(done) : done;
    },
  };
}

/**
 * The spaces the button's target phrase allows `seat` to pick, in board order; none for a button that picks no space. It
 * asks only the target phrase, so the button's `Only if` lines may still refuse a space it lists: a caller must ask the move
 * itself (`canDispatch` with the `target`) before offering a candidate as one the player can pick.
 */
export function targetCandidates(runtime: LangRuntime, action: DeclaredAction, state: GameState, seat: PlayerId): number[] {
  const { target } = action;
  if (target === null) return [];
  const spaces = Array.from({ length: runtime.game.board?.spaces.length ?? 0 }, (_, space) => space);
  return spaces.filter((space) => runtime.allowsTarget(target, state, { player: seat, space, card: null }, space));
}
