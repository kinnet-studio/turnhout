/** A problem found while reading designer text, phrased for the designer. */
export type Diagnostic = {
  line: number;
  severity: 'error' | 'warning';
  kind: 'unknown-phrase' | 'ambiguous-phrase' | 'invalid' | 'structure';
  message: string; // designer-readable
  text?: string; // the offending phrase
  suggestions?: string[]; // up to 3, display form
  stub?: string; // developer stub (unknown phrases only)
};

/** Thrown by pipeline stages that cannot continue; carries where it went wrong. */
export class RuleError extends Error {
  constructor(
    message: string,
    public line?: number,
    public text?: string,
  ) {
    super(message);
    this.name = 'RuleError';
  }
}

/** A phrase the designer used that no registered phrase understands. */
export class MissingPhraseError extends RuleError {}

/** The RuleErrors `noSuchNumber` made, told apart by identity: see there. */
const NO_SUCH_NUMBER = new WeakSet<RuleError>();

/**
 * The RuleError for a card asked a number it has no column or count for. A rule that asks it is mistaken, but a value worked out for
 * cards is not: a blank cell leaves the column out, so a line of the value is simply not about such a card. `isNoSuchNumber` tells it
 * apart. It is a plain RuleError rather than a class of its own, so that whatever compares it with one (an example's verdict, a test)
 * finds the RuleError it always was; the runtime gives it its line without copying it, so it stays known.
 */
export function noSuchNumber(message: string): RuleError {
  const error = new RuleError(message);
  NO_SUCH_NUMBER.add(error);
  return error;
}

export const isNoSuchNumber = (error: unknown): boolean => error instanceof RuleError && NO_SUCH_NUMBER.has(error);
