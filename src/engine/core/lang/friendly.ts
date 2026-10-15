// What the engine says, in words a designer or player can act on.
import type { PlayerId } from '../scene';
import { SETUP_PHASE } from './build';
import { MissingPhraseError, RuleError } from './diagnostics';
import { secondPersonWords } from './refs';

const NOT_YOUR_TURN = /^not .+'s turn$/;
// A button's move is its whole wording, so the move may be several words; the first “not allowed in phase” ends it.
const NOT_IN_PHASE = /^move (.+?) not allowed in phase (.+)$/;
const NOT_SETTLED = /flow did not settle/;
const KEEPS_FIRING = /last fired: trigger line (\d+): (.*)\)$/;
const KEEPS_MOVING = /last fired: advance to (.+)\)$/;
const NEVER_SETTLES = 'The rules keep firing without settling. Check your “When” and “go to” rules.';

const phaseName = (id: string) => (id === SETUP_PHASE ? 'setup' : id);

/** A reason the engine refused a move. Reasons written by the designer pass through unchanged. */
export function friendlyReason(reason: string, current?: PlayerId): string {
  if (reason === 'game is over') return 'The game is over.';
  if (NOT_YOUR_TURN.test(reason)) return current === undefined ? "It's not your turn." : `It's ${current}'s turn.`;
  const notInPhase = NOT_IN_PHASE.exec(reason);
  if (notInPhase) {
    const [, move, phase] = notInPhase;
    return move === 'reorder'
      ? `You can't rearrange cards during ${phaseName(phase)}.`
      : `You can't ${secondPersonWords(move)} during ${phaseName(phase)}.`;
  }
  return reason;
}

/** Rules that never settle, named by what the engine saw fire last. */
function notSettled(message: string): string {
  const firing = KEEPS_FIRING.exec(message);
  if (firing) return `The rule on line ${firing[1]} (“${firing[2]}”) keeps firing. Its effects must change what it checks.`;
  const moving = KEEPS_MOVING.exec(message);
  if (moving) {
    return `The “go to” rules keep moving the game to ${phaseName(moving[1])} and away again. A phase's “go to” condition must stop holding once the game gets there.`;
  }
  return NEVER_SETTLES;
}

/** Anything thrown while running the rules, as one line for the designer: never a stack trace. */
export function friendlyError(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  if (e instanceof MissingPhraseError && e.line !== undefined) return `Line ${e.line}: ${message}`;
  if (e instanceof Error && NOT_SETTLED.test(message)) return notSettled(message);
  if (e instanceof RuleError) {
    if (e.line === undefined) return message;
    return e.text === undefined ? `Line ${e.line}: ${message}` : `Line ${e.line} (“${e.text}”): ${message}`;
  }
  return `Something went wrong in the rules: ${message}`;
}
