import type { GameState } from '../game-state';
import type { Move, MoveHandler } from '../moves';
import type { PlayerId } from '../scene';
import { isOut, recordAction } from './board-state';
import type { LangRuntime } from './runtime';
import type { CompiledPhase, DeclaredAction, Subject } from './types';

const OUT = "You're out of the game.";

/** The current phase's declaration of `verb` that allows the move, with who it is about; else why not. */
function choose(
  verb: string, runtime: LangRuntime, state: GameState, m: Move,
): { phase: CompiledPhase; action: DeclaredAction; by: PlayerId; subject: Subject } | string {
  const phase = runtime.game.phases.find((p) => p.id === state.turn?.phase);
  const action = phase?.actions.find((a) => a.verb === verb);
  // Nobody can press a button without being someone: a move with no player is refused as if the button were not there.
  const by = m.by as PlayerId | undefined;
  if (!phase || !action || typeof by !== 'string') return `You can't ${verb} now.`;
  if (isOut(state, by)) return OUT;
  // An action is about the player who presses it and, through “it”, the space their piece is on.
  const subject: Subject = { player: by, space: null };
  return runtime.failedGroup(action.conditions, state, undefined, subject) ?? { phase, action, by, subject };
}

/**
 * The move handler for one button the designer declared, like “A player may roll the dice.” It refuses in the
 * designer's own words, then notes the action on the turn (so “they have rolled this turn” holds) and runs its Then
 * lines.
 */
export function declaredActionHandler(verb: string, runtime: LangRuntime): MoveHandler {
  return {
    legal(state, m) {
      const choice = choose(verb, runtime, state, m);
      return typeof choice === 'string' ? choice : true;
    },
    apply(state, m) {
      const choice = choose(verb, runtime, state, m);
      if (typeof choice === 'string') throw new Error(`A ${verb} move was applied that is not allowed: ${choice}`);
      const { phase, action, by, subject } = choice;
      // An action the After line names ends the turn, so what was done in it stops counting for the next one.
      const endsTurn = phase.after?.verbs.includes(verb) ?? false;
      const recorded = recordAction(state, by, verb, endsTurn);
      return action.effects.reduce((s, ref) => runtime.run(ref, s, undefined, undefined, subject), recorded);
    },
  };
}
