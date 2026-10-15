// What the engine says, in words a designer or player can act on.
import type { PlayerId } from '../scene';
import { SETUP_PHASE } from './build';
import { MissingPhraseError, RuleError } from './diagnostics';

const NOT_YOUR_TURN = /^not .+'s turn$/;
const NOT_IN_PHASE = /^move (\S+) not allowed in phase (.+)$/;
const KEEPS_FIRING = /last fired: trigger line (\d+): (.*)\)$/;

const phaseName = (id: string) => (id === SETUP_PHASE ? 'setup' : id);

/** A reason the engine refused a move. Reasons written by the designer pass through unchanged. */
export function friendlyReason(reason: string, current?: PlayerId): string {
  if (reason === 'game is over') return 'The game is over.';
  if (NOT_YOUR_TURN.test(reason)) return current === undefined ? "It's not your turn." : `It's ${current}'s turn.`;
  const notInPhase = NOT_IN_PHASE.exec(reason);
  if (notInPhase) {
    const [, verb, phase] = notInPhase;
    return verb === 'reorder' ? `You can't rearrange cards during ${phaseName(phase)}.` : `You can't ${verb} during ${phaseName(phase)}.`;
  }
  return reason;
}

/** Anything thrown while running the rules, as one line for the designer: never a stack trace. */
export function friendlyError(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  if (e instanceof MissingPhraseError && e.line !== undefined) return `Line ${e.line}: ${message}`;
  const firing = KEEPS_FIRING.exec(message);
  if (e instanceof Error && firing) {
    return `The rule on line ${firing[1]} (“${firing[2]}”) keeps firing. Its effects must change what it checks.`;
  }
  if (e instanceof RuleError) {
    if (e.line === undefined) return message;
    return e.text === undefined ? `Line ${e.line}: ${message}` : `Line ${e.line} (“${e.text}”): ${message}`;
  }
  return `Something went wrong in the rules: ${message}`;
}
