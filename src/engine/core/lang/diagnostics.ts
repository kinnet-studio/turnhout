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
