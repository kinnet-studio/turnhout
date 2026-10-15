import type { Json } from '../table-def';
import { RuleError, type Diagnostic } from './diagnostics';
import type { OutlineNode } from './outline';
import { normalizeLine, stubFor, type MatchResult, type Misnamed, type PhraseLibrary } from './phrases';
import type { ParamType, PhraseKind, PhraseRef, Vocab } from './types';

/** What every line of one compile stage shares. Never change `vocab` after a line has been matched with it. */
export type LineCtx = { library: PhraseLibrary; vocab: Vocab; gameName: string; inMove: boolean; diagnostics: Diagnostic[] };

const MAX_SUGGESTIONS = 3;
const NOT_INDENTED = "This line shouldn't be indented under the line above.";
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

/** A pattern the way a designer reads it: `{zone}` shown as `[zone]`. */
function displayPattern(pattern: string, types: ParamType[]): string {
  return pattern.replace(/\{([^{}]+)\}/g, (whole, name: string) => types.find((t) => t.name === name)?.label ?? whole);
}

/** True when a value names the player making the move, as in “their hand”. */
function mentionsActor(value: Json): boolean {
  if (Array.isArray(value)) return value.some(mentionsActor);
  if (value !== null && typeof value === 'object') return value.who === 'actor' || Object.values(value).some(mentionsActor);
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

/** A name in a line no phrase matched that the game never defined; a library that fails here just says nothing. */
function tryMisnamed(kinds: PhraseKind[], text: string, ctx: LineCtx): Misnamed | null {
  try {
    return ctx.library.misnamed(kinds, text, ctx.vocab);
  } catch {
    return null;
  }
}

/**
 * Reads one line as a phrase of `kind` (`text` has no leading keyword); `fallback` is a second kind to try. A line no
 * phrase matches becomes a placeholder. When it is shaped like a phrase but names something the game never defined, the
 * designer is told which name, with the closest real ones; otherwise it gets an unknown-phrase diagnostic with
 * suggestions and a stub for a developer.
 */
export function matchLine(kind: PhraseKind, text: string, line: number, ctx: LineCtx, fallback?: PhraseKind): PhraseRef {
  const clean = normalizeLine(text);
  let found = kind;
  let result = tryMatch(kind, clean, ctx);
  if (result.status === 'unknown' && fallback) {
    const second = tryMatch(fallback, clean, ctx);
    if (second.status === 'unknown') {
      result = { status: 'unknown', suggestions: [...new Set([...result.suggestions, ...second.suggestions])].slice(0, MAX_SUGGESTIONS) };
    } else {
      result = second;
      found = fallback;
    }
  }

  switch (result.status) {
    case 'ok': {
      const needsMove = ctx.library.get(found, result.pattern)?.needsMove ?? false;
      if (!ctx.inMove && (needsMove || result.args.some(mentionsActor))) {
        addProblem(ctx.diagnostics, line, `“${clean}” only makes sense in a rule about a player's move.`, { kind: 'invalid', text: clean });
        return missingRef(found, clean, line);
      }
      return { kind: found, phrase: result.pattern, args: result.args, line, text: clean };
    }
    case 'unknown': {
      const misnamed = tryMisnamed(fallback ? [kind, fallback] : [kind], clean, ctx);
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
  const reads = (kind: PhraseKind, part: string) => tryMatch(kind, part, ctx).status === 'ok';
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
