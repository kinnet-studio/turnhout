import type { Json } from '../table-def';
import { RuleError, type Diagnostic } from './diagnostics';
import type { OutlineNode } from './outline';
import { normalizeLine, stubFor, type MatchResult, type Misnamed, type PhraseLibrary, type PhraseOpts } from './phrases';
import type { ParamType, PhraseKind, PhraseRef, Vocab } from './types';

/**
 * What every line of one compile stage shares. Never change `vocab` after a line has been matched with it. `inMove`,
 * `player`, `space` and `card` say what the rule around a line is about: a card move, a player ("they"), a space or a
 * card ("it"). `drawn` is true only for the sentences of a card's says column: they are run for a card that was just drawn.
 */
export type LineCtx = {
  library: PhraseLibrary; vocab: Vocab; gameName: string; inMove: boolean; player: boolean; space: boolean; card: boolean; drawn: boolean;
  diagnostics: Diagnostic[];
};

const MAX_SUGGESTIONS = 3;
const NOT_INDENTED = "This line shouldn't be indented under the line above.";
const NEEDS_PAYMENT = 'Say what players pay with, like “Players pay with coins.” under Board:.';
const NEEDS_BOARD = (clean: string) => `“${clean}” needs a board. Add a Board: section with a line like “The board is a loop of spaces, starting at Go:”.`;
const NEEDS_DICE = (clean: string) => `“${clean}” needs dice. Add a line like “There are two six-sided dice.” under Board:.`;
const NEEDS_TWO_DICE = 'A double needs exactly two dice.';
const IF_FRAME = /^if\s+(.+)$/i;
const COMMA = /, /g;
const PHASE_NAME = /^phase\s*:\s*(.*)$/i;

/** Records a problem found while reading the rules. Structure errors unless `extra` says otherwise. */
export function addProblem(diagnostics: Diagnostic[], line: number, message: string, extra: Partial<Diagnostic> = {}): void {
  diagnostics.push({ line, severity: 'error', kind: 'structure', message, ...extra });
}

/** Lines that take no lines of their own: each line indented under one is reported. */
export function rejectChildren(node: OutlineNode, diagnostics: Diagnostic[]): void {
  for (const child of node.children) addProblem(diagnostics, child.line, NOT_INDENTED);
}

/** A phase is known by its name: lowercased, spaces tidied; empty when the `Phase:` line gives none. */
export function phaseId(node: OutlineNode): string {
  return (PHASE_NAME.exec(node.text)?.[1] ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** What the designer is told when code behind a phrase fails: the message of a RuleError, plain words for anything else. */
function describeThrown(error: unknown): string {
  if (error instanceof RuleError) return error.message;
  return `Something went wrong reading this line: ${error instanceof Error ? error.message : String(error)}`;
}

/** Runs `fn`; whatever it throws becomes a diagnostic (on the line the error names, if it names one) and the result is undefined. */
export function attempt<T>(ctx: LineCtx, line: number, text: string, fn: () => T): T | undefined {
  try {
    return fn();
  } catch (error) {
    const named = error instanceof RuleError ? error : undefined;
    addProblem(ctx.diagnostics, named?.line ?? line, describeThrown(error), { kind: 'invalid', text: named?.text ?? text });
    return undefined;
  }
}

/** The code behind a phrase that matched. */
export function phraseFn<F>(ctx: LineCtx, ref: PhraseRef): F {
  const entry = ctx.library.get(ref.kind as PhraseKind, ref.phrase);
  if (!entry) throw new Error(`No phrase “${ref.phrase}” is registered.`);
  return entry.fn as F;
}

/** A line nobody has written a phrase for yet: it stays in the game as a placeholder. */
export function missingRef(kind: PhraseKind, text: string, line: number): PhraseRef {
  return { kind: 'lang', phrase: 'missing', args: [kind], line, text };
}

/** True for the placeholder `missingRef` makes: a line no phrase could be found for. */
export const isMissing = (ref: PhraseRef): boolean => ref.kind === 'lang' && ref.phrase === 'missing';

/** A pattern the way a designer reads it: `{zone}` shown as `[zone]`. */
function displayPattern(pattern: string, types: ParamType[]): string {
  return pattern.replace(/\{([^{}]+)\}/g, (whole, name: string) => types.find((t) => t.name === name)?.label ?? whole);
}

/** True when a value names the player making the move, as in “their hand” or “the other player's hand”. */
function mentionsActor(value: Json): boolean {
  if (Array.isArray(value)) return value.some(mentionsActor);
  if (value !== null && typeof value === 'object') return value.who === 'actor' || value.who === 'other' || Object.values(value).some(mentionsActor);
  return false;
}

/** The library's answer for a line; a phrase or type that throws counts as an invalid line. */
function tryMatch(kind: PhraseKind, text: string, ctx: LineCtx): MatchResult {
  try {
    return ctx.library.match(kind, text, ctx.vocab);
  } catch (error) {
    return { status: 'invalid', message: describeThrown(error) };
  }
}

/** True when a phrase of `kind` reads `text` as it stands, with no diagnostics recorded. */
export function canRead(kind: PhraseKind, text: string, ctx: LineCtx): boolean {
  return tryMatch(kind, text, ctx).status === 'ok';
}

/** A name in a line no phrase matched that the game never defined; a library that fails here just says nothing. */
function tryMisnamed(kinds: PhraseKind[], text: string, ctx: LineCtx): Misnamed | null {
  try {
    return ctx.library.misnamed(kinds, text, ctx.vocab);
  } catch {
    return null;
  }
}

/**
 * What a phrase needs that the game or the rule around it does not give, said for the designer; null when it has all it
 * needs. The first lack is the one reported, and a board or dice comes first: no rule can make up for a game without them.
 */
function unmetNeed(entry: Required<PhraseOpts> | undefined, args: Json[], clean: string, ctx: LineCtx): string | null {
  // A game has a board when its Board: section has a loop of spaces, and dice only come with a board.
  if (entry?.needsBoard && ctx.vocab.spaces.length === 0) return NEEDS_BOARD(clean);
  if (entry?.needsDice && !ctx.vocab.dice) return NEEDS_DICE(clean);
  if (entry?.needsTwoDice && ctx.vocab.diceCount !== 2) return NEEDS_TWO_DICE;
  const aboutPlayer = ctx.inMove || ctx.player;
  if (!ctx.inMove && entry?.needsMove) return `“${clean}” only makes sense in a rule about a player's move.`;
  if (!aboutPlayer && entry?.needsPlayer) {
    return `“${clean}” only makes sense in a rule about a player, such as a move, an action or a “When a player …” rule.`;
  }
  if (!aboutPlayer && args.some(mentionsActor)) return `“${clean}” only makes sense in a rule about a player's move.`;
  if (!ctx.space && entry?.needsSpace) return `“${clean}” only makes sense in a rule about a space, such as an action or a “lands on” rule.`;
  if (!ctx.card && entry?.needsCard) return `“${clean}” only makes sense in a rule about a card, such as “When a card …”.`;
  if (!ctx.drawn && entry?.needsDrawnCard) return `“${clean}” only makes sense in a card's says column.`;
  if (entry?.needsPayment && ctx.vocab.payWith === null) return NEEDS_PAYMENT;
  return null;
}

/**
 * Reads one line as a phrase of `kind` (`text` has no leading keyword); `fallback` is the kinds to try, in order, when no
 * phrase of `kind` fits. A line no phrase matches becomes a placeholder. When it is shaped like a phrase but names
 * something the game never defined, the designer is told which name, with the closest real ones; otherwise it gets an
 * unknown-phrase diagnostic with suggestions and a stub for a developer.
 */
export function matchLine(
  kind: PhraseKind, text: string, line: number, ctx: LineCtx, fallback: PhraseKind | PhraseKind[] = [],
): PhraseRef {
  const clean = normalizeLine(text);
  const others = typeof fallback === 'string' ? [fallback] : fallback;
  let found = kind;
  let result = tryMatch(kind, clean, ctx);
  for (const other of others) {
    if (result.status !== 'unknown') break;
    const next = tryMatch(other, clean, ctx);
    if (next.status === 'unknown') {
      result = { status: 'unknown', suggestions: [...new Set([...result.suggestions, ...next.suggestions])].slice(0, MAX_SUGGESTIONS) };
    } else {
      result = next;
      found = other;
    }
  }

  switch (result.status) {
    case 'ok': {
      const entry = ctx.library.get(found, result.pattern);
      const problem = unmetNeed(entry, result.args, clean, ctx);
      if (problem) {
        addProblem(ctx.diagnostics, line, problem, { kind: 'invalid', text: clean });
        return missingRef(found, clean, line);
      }
      return { kind: found, phrase: result.pattern, args: result.args, line, text: clean };
    }
    case 'unknown': {
      const misnamed = tryMisnamed([kind, ...others], clean, ctx);
      if (misnamed) {
        const { message, suggestions } = misnamed.problem;
        addProblem(ctx.diagnostics, line, message, { kind: 'invalid', text: clean, suggestions });
        return missingRef(misnamed.kind, clean, line);
      }
      const diagnostic: Diagnostic = {
        line, severity: 'error', kind: 'unknown-phrase', message: `“${clean}” isn't in the phrase library yet.`, text: clean,
        suggestions: result.suggestions,
      };
      try {
        diagnostic.stub = stubFor(kind, clean, ctx.vocab, ctx.library.types(), { game: ctx.gameName, line });
      } catch {
        // The stub only saves a developer typing; the line is reported without it.
      }
      ctx.diagnostics.push(diagnostic);
      return missingRef(kind, clean, line);
    }
    case 'ambiguous': {
      const types = ctx.library.types();
      const patterns = result.patterns.map((p) => displayPattern(p, types)).join(' / ');
      addProblem(ctx.diagnostics, line, `“${clean}” matches more than one phrase: ${patterns}. A developer needs to make one of them more specific.`, { kind: 'ambiguous-phrase', text: clean });
      return missingRef(found, clean, line);
    }
    case 'invalid':
      addProblem(ctx.diagnostics, line, result.message, { kind: 'invalid', text: clean });
      return missingRef(found, clean, line);
  }
}

/**
 * Reads one effect line. “If <condition>, <effect>” is tried at every comma, since either part may hold commas; the
 * first comma where both parts are phrases wins. When none does, the part that needs fixing is the one reported.
 */
export function matchEffectLine(text: string, line: number, ctx: LineCtx): PhraseRef {
  const clean = normalizeLine(text);
  const frame = IF_FRAME.exec(clean);
  if (!frame) return matchLine('effect', clean, line, ctx);

  const body = frame[1];
  const splits = [...body.matchAll(COMMA)].map((m) => ({ condition: body.slice(0, m.index), effect: body.slice(m.index + 2) }));
  const reads = (kind: PhraseKind, part: string) => canRead(kind, part, ctx);
  const chosen = splits.find((s) => reads('condition', s.condition) && reads('effect', s.effect))
    ?? splits.find((s) => reads('condition', s.condition))
    ?? splits[0];
  if (!chosen) {
    addProblem(ctx.diagnostics, line, 'Say what happens when the condition is true, like “If the deck is empty, shuffle the deck.”', { kind: 'invalid', text: clean });
    return missingRef('effect', clean, line);
  }

  // With an unreadable condition that is what to fix first; its effect is only read for the placeholder.
  const effectCtx = reads('condition', chosen.condition) ? ctx : { ...ctx, diagnostics: [] };
  const condition = matchLine('condition', chosen.condition, line, ctx);
  const effect = matchLine('effect', chosen.effect, line, effectCtx);
  return { kind: 'lang', phrase: 'if', args: [condition, effect], line, text: clean };
}
