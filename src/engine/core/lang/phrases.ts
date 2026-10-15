import type { Json } from '../table-def';
import type {
  ActionFn, CardsFn, ConditionFn, EffectFn, ExpectFn, ParamType, PhraseKind, ScoreFn, TurnFn, Vocab, WinnerFn, ZoneFn,
} from './types';

const VISIBILITY: Record<string, string> = {
  'no one can see': 'secret',
  'only they can see': 'owner',
  'everyone can see': 'public',
};

/** Parameter types that need no game vocabulary. */
export const STATIC_TYPES: ParamType[] = [
  { name: 'int', label: '[number]', stubOrder: 5, source: () => '-?\\d+', resolve: (t) => ({ value: Number(t) }) },
  { name: 'string', label: '[text]', stubOrder: 1, source: () => '["“”][^"“”]*["“”]', resolve: (t) => ({ value: t.slice(1, -1) }) },
  { name: 'word', label: '[word]', source: () => '\\S+', resolve: (t) => ({ value: t }) },
  { name: 'name', label: '[name]', source: () => '.+?', resolve: (t) => ({ value: t.toLowerCase() }) },
  { name: 'layout', label: '[layout]', source: () => 'pile|row|hand', resolve: (t) => ({ value: t.toLowerCase() }) },
  {
    name: 'visibility',
    label: '[visibility]',
    source: () => Object.keys(VISIBILITY).join('|'),
    resolve: (t) => ({ value: VISIBILITY[t.toLowerCase()] }),
  },
];

export function emptyVocab(): Vocab {
  return { sharedZones: [], playerZones: [], maxPlayers: 0, phases: [], verbs: [], attributes: [], cardValues: [], standardDeck: false };
}

/** Trims, collapses whitespace and drops one trailing period. Case is kept. */
export function normalizeLine(text: string): string {
  return text.trim().replace(/\s+/g, ' ').replace(/\.$/, '');
}

export type MatchResult =
  | { status: 'ok'; pattern: string; args: Json[] }
  | { status: 'unknown'; suggestions: string[] }
  | { status: 'ambiguous'; patterns: string[] }
  | { status: 'invalid'; message: string };

type Part = { literal: string } | { type: ParamType };
type Entry = {
  pattern: string;
  parts: Part[];
  display: string; // pattern with each {type} shown as its label
  literal: string; // pattern text with the parameters removed, for suggestions
  fn: unknown;
  needsMove: boolean;
};

const PARAM = /\{([^{}]+)\}/g;
const MIN_SUGGESTION_SCORE = 0.4;
const MAX_SUGGESTIONS = 3;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const APOSTROPHES = /['‘’]/g;

/**
 * Literal pattern text as a regex source: `(s)` is optional, runs of spaces match any whitespace,
 * and an apostrophe matches the straight and curly forms word processors swap between.
 */
function literalSource(literal: string): string {
  return escapeRegex(literal).replace(/\\\(s\\\)/g, '(?:s)?').replace(/ +/g, '\\s+').replace(APOSTROPHES, "['‘’]");
}

function bigrams(s: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const pair = s.slice(i, i + 2);
    counts.set(pair, (counts.get(pair) ?? 0) + 1);
  }
  return counts;
}

/** Dice coefficient of character bigrams: 1 for identical text, 0 for nothing in common. */
function dice(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const left = bigrams(a);
  const right = bigrams(b);
  let shared = 0;
  for (const [pair, n] of left) shared += Math.min(n, right.get(pair) ?? 0);
  return (2 * shared) / (a.length - 1 + b.length - 1);
}

/**
 * Registry of the sentences designers may write, one set per kind. A pattern is
 * lowercase text with `{type}` parameters and an optional `(s)`; it is the phrase's stable id.
 */
export class PhraseLibrary {
  private readonly typeList: ParamType[];
  private readonly typeByName = new Map<string, ParamType>();
  private readonly entries = new Map<PhraseKind, Map<string, Entry>>();
  private readonly compiled = new WeakMap<Vocab, Map<Entry, RegExp>>();

  constructor(types: ParamType[]) {
    this.typeList = [...types];
    for (const t of types) this.typeByName.set(t.name, t);
  }

  cards(p: string, fn: CardsFn): this { return this.add('cards', p, fn); }
  zone(p: string, fn: ZoneFn): this { return this.add('zone', p, fn); }
  condition(p: string, fn: ConditionFn, opts?: { needsMove?: boolean }): this { return this.add('condition', p, fn, opts?.needsMove); }
  effect(p: string, fn: EffectFn, opts?: { needsMove?: boolean }): this { return this.add('effect', p, fn, opts?.needsMove); }
  turn(p: string, fn: TurnFn): this { return this.add('turn', p, fn); }
  score(p: string, fn: ScoreFn): this { return this.add('score', p, fn); }
  winner(p: string, fn: WinnerFn): this { return this.add('winner', p, fn); }
  given(p: string, fn: EffectFn): this { return this.add('given', p, fn); }
  action(p: string, fn: ActionFn): this { return this.add('action', p, fn); }
  expect(p: string, fn: ExpectFn): this { return this.add('expect', p, fn); }

  get(kind: PhraseKind, pattern: string): { fn: unknown; needsMove: boolean } | undefined {
    const entry = this.entries.get(kind)?.get(pattern.toLowerCase());
    return entry && { fn: entry.fn, needsMove: entry.needsMove };
  }

  types(): ParamType[] {
    return [...this.typeList];
  }

  match(kind: PhraseKind, text: string, vocab: Vocab): MatchResult {
    const line = normalizeLine(text);
    const entries = [...(this.entries.get(kind)?.values() ?? [])];
    const oks: { pattern: string; args: Json[] }[] = [];
    const invalid: string[] = [];
    for (const entry of entries) {
      const m = this.regexFor(entry, vocab).exec(line);
      if (!m) continue;
      const args: Json[] = [];
      let error: string | null = null;
      let group = 1;
      for (const part of entry.parts) {
        if (!('type' in part)) continue;
        const r = part.type.resolve(m[group++], vocab);
        if ('error' in r) { error = r.error; break; }
        args.push(r.value);
      }
      if (error === null) oks.push({ pattern: entry.pattern, args });
      else invalid.push(error);
    }
    if (oks.length === 1) return { status: 'ok', ...oks[0] };
    if (oks.length > 1) return { status: 'ambiguous', patterns: oks.map((o) => o.pattern) };
    if (invalid.length > 0) return { status: 'invalid', message: invalid[0] };
    return { status: 'unknown', suggestions: this.suggest(entries, line.toLowerCase()) };
  }

  private add(kind: PhraseKind, p: string, fn: unknown, needsMove = false): this {
    const pattern = p.toLowerCase();
    const parts: Part[] = [];
    let display = '';
    let literal = '';
    let last = 0;
    const pushLiteral = (s: string) => {
      if (s === '') return;
      parts.push({ literal: s });
      display += s;
      literal += s;
    };
    for (const m of pattern.matchAll(PARAM)) {
      const type = this.typeByName.get(m[1]);
      if (!type) throw new Error(`unknown parameter type {${m[1]}} in "${pattern}"`);
      pushLiteral(pattern.slice(last, m.index));
      parts.push({ type });
      display += type.label;
      literal += ' ';
      last = m.index + m[0].length;
    }
    pushLiteral(pattern.slice(last));
    let ofKind = this.entries.get(kind);
    if (!ofKind) this.entries.set(kind, (ofKind = new Map()));
    ofKind.set(pattern, { pattern, parts, display, literal: literal.replace(/\s+/g, ' ').trim(), fn, needsMove });
    return this;
  }

  private regexFor(entry: Entry, vocab: Vocab): RegExp {
    let perVocab = this.compiled.get(vocab);
    if (!perVocab) this.compiled.set(vocab, (perVocab = new Map()));
    let re = perVocab.get(entry);
    if (!re) {
      const body = entry.parts.map((part) => ('type' in part ? `(${part.type.source(vocab)})` : literalSource(part.literal))).join('');
      perVocab.set(entry, (re = new RegExp(`^${body}$`, 'i')));
    }
    return re;
  }

  private suggest(entries: Entry[], line: string): string[] {
    return entries
      .map((entry) => ({ display: entry.display, score: dice(line, entry.literal) }))
      .filter((s) => s.score >= MIN_SUGGESTION_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUGGESTIONS)
      .map((s) => s.display);
  }
}

/** Parameter list of the callback a developer writes for a phrase of this kind. */
function stubParams(kind: PhraseKind, argNames: string[]): string {
  const args = argNames.length > 0 ? `[${argNames.join(', ')}]` : '_args';
  switch (kind) {
    case 'cards': return `${args}, table`;
    case 'zone': return argNames.length > 0 ? args : '';
    case 'score': return `env, ${args}, seat`;
    case 'winner': return `env, ${args}, scores`;
    default: return argNames.length > 0 ? `env, ${args}` : 'env';
  }
}

/**
 * Cucumber-style snippet for a phrase nobody has written yet: parameter-shaped
 * words become `{type}`, so a developer can paste it straight into the library.
 */
export function stubFor(kind: PhraseKind, text: string, vocab: Vocab, types: ParamType[], where: { game: string; line: number }): string {
  const normalized = normalizeLine(text);
  const ordered = types
    .filter((t) => t.stubOrder !== undefined)
    .sort((a, b) => (a.stubOrder as number) - (b.stubOrder as number));
  let pattern = normalized.toLowerCase();
  for (const type of ordered) pattern = pattern.replace(new RegExp(type.source(vocab), 'gi'), () => `{${type.name}}`);
  const count = pattern.match(PARAM)?.length ?? 0;
  const argNames = Array.from({ length: count }, (_, i) => `a${i + 1}`);
  const quoted = pattern.replace(/[\\']/g, '\\$&');
  return [
    `// Requested by a designer — game "${where.game}", line ${where.line}:`,
    `//   "${normalized}"`,
    `library.${kind}('${quoted}', (${stubParams(kind, argNames)}) => {`,
    "  throw new Error('not implemented yet');",
    '});',
  ].join('\n');
}
