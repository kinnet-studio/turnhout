import type { Json } from '../table-def';
import type {
  ActionFn, BoardFn, BoardSpec, CardSetSpec, CardsFn, ConditionFn, EffectFn, ExpectFn, MomentFn, NameProblem, ParamType, PhraseKind,
  ScoreFn, TurnFn, Vocab, WhoFn, WinnerFn, ZoneFn, ZoneSpec,
} from './types';

const VISIBILITY: Record<string, string> = {
  'no one can see': 'secret',
  'only they can see': 'owner',
  'everyone can see': 'public',
};

const COUNT_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

/** Parameter types that need no game vocabulary. */
export const STATIC_TYPES: ParamType[] = [
  { name: 'int', label: '[number]', stubOrder: 5, source: () => '-?\\d+', resolve: (t) => ({ value: Number(t) }) },
  // Small counts read the way people say them ("two dice"); no stubOrder, since a stub should keep a digit as an {int}.
  {
    name: 'count',
    label: '[number]',
    source: () => `\\d+|${COUNT_WORDS.join('|')}`,
    resolve: (t) => ({ value: /^\d/.test(t) ? Number(t) : COUNT_WORDS.indexOf(t.toLowerCase()) + 1 }),
  },
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
  return {
    sharedZones: [], playerZones: [], maxPlayers: 0, phases: [], verbs: [], attributes: [], cardValues: [], standardDeck: false,
    spaces: [], spaceAttributes: [], spaceValues: [], counters: [], payWith: null, actions: [], dice: false,
    facts: [], bank: [],
  };
}

/**
 * The words a designer may use about a game: its zones, card attributes and values, phases and move verbs, and for a
 * board game its spaces, the words of their table, its counters and the actions a player may take.
 * Always make a new one per compile stage: the library caches what it builds from a Vocab by object.
 */
export function vocabFrom(game: {
  maxPlayers: number; zones?: ZoneSpec[]; cards?: CardSetSpec[]; phases?: string[]; verbs?: string[];
  board?: BoardSpec | null; actions?: { verb: string; words: string }[];
}): Vocab {
  const { zones = [], cards = [], board = null } = game;
  const attributes = new Set<string>();
  const cardValues: Vocab['cardValues'] = [];
  for (const set of cards) {
    for (const { attrs } of set.identities) {
      for (const [attribute, value] of Object.entries(attrs)) {
        attributes.add(attribute);
        if (set.kind === 'table' && !cardValues.some((v) => v.attribute === attribute && v.value === value)) {
          cardValues.push({ attribute, value });
        }
      }
    }
  }
  const spaceAttributes = new Set<string>();
  const spaceValues: Vocab['spaceValues'] = [];
  for (const { attrs } of board?.spaces ?? []) {
    for (const [attribute, value] of Object.entries(attrs)) {
      spaceAttributes.add(attribute);
      if (typeof value === 'string' && !spaceValues.some((v) => v.attribute === attribute && v.value === value)) {
        spaceValues.push({ attribute, value });
      }
    }
  }
  return {
    ...emptyVocab(),
    sharedZones: zones.filter((z) => !z.perPlayer).map((z) => z.name),
    playerZones: zones.filter((z) => z.perPlayer).map((z) => z.name),
    maxPlayers: game.maxPlayers,
    phases: game.phases ?? [],
    verbs: game.verbs ?? [],
    attributes: [...attributes],
    cardValues,
    standardDeck: cards.some((s) => s.kind === 'standard'),
    spaces: (board?.spaces ?? []).map((s) => s.name),
    spaceAttributes: [...spaceAttributes],
    spaceValues,
    counters: (board?.counters ?? []).map((c) => c.name),
    payWith: board?.payWith ?? null,
    actions: game.actions ?? [],
    dice: (board?.dice ?? null) !== null,
  };
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

/**
 * What a phrase needs, checked when a game is compiled: from the rule around it, a move being made, a player the rule
 * is about or a space; from the game, something to pay with, a board (a Board: loop of spaces) or dice.
 */
export type PhraseOpts = {
  needsMove?: boolean; needsPlayer?: boolean; needsSpace?: boolean; needsPayment?: boolean; needsBoard?: boolean; needsDice?: boolean;
};

type Part = { literal: string } | { type: ParamType };
type Entry = {
  pattern: string;
  parts: Part[];
  display: string; // pattern with each {type} shown as its label
  literal: string; // pattern text with the parameters removed, for suggestions
  specificity: number; // how many letters of the pattern are its own words rather than parameters
  fn: unknown;
} & Required<PhraseOpts>;

/** Regexes built for one vocabulary: each phrase strictly and loosely (null: nothing to loosen), and each whole parameter. */
type VocabCache = { strict: Map<Entry, RegExp>; loose: Map<Entry, RegExp | null>; whole: Map<ParamType, RegExp> };

/** A line `match` found no phrase for, read as a phrase of `kind` that names something the game never defined. */
export type Misnamed = { kind: PhraseKind; problem: NameProblem };

const PARAM = /\{([^{}]+)\}/g;
const MIN_SUGGESTION_SCORE = 0.4;
/** Names this much less alike than the closest one are left out of suggestions. */
const CLOSE_TO_BEST = 0.2;
const MAX_SUGGESTIONS = 3;
/**
 * What a name read by a narrow loose shape adds to a phrase's specificity when choosing which phrase a misnamed line
 * meant: less than one letter of the phrase's own words, so it only settles a tie.
 */
const NARROW_BONUS = 0.5;

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

/** Edits that turn one text into the other, a swap of neighbouring letters counting as one (optimal string alignment). */
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** How alike two names are, 0 to 1: by the letter pairs they share, or by how few typos turn one into the other. */
function nameScore(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  return Math.max(dice(a, b), longest === 0 ? 1 : 1 - editDistance(a, b) / longest);
}

/** The names that look most like `text`, closest first: for words that are not phrases, like a phase that does not exist. */
export function suggestNames(text: string, names: string[]): string[] {
  const wanted = text.toLowerCase();
  const close = names
    .map((name) => ({ name, score: nameScore(wanted, name.toLowerCase()) }))
    .filter((s) => s.score >= MIN_SUGGESTION_SCORE)
    .sort((a, b) => b.score - a.score);
  const best = close[0]?.score ?? 0;
  return close
    .filter((s) => s.score >= best - CLOSE_TO_BEST)
    .slice(0, MAX_SUGGESTIONS)
    .map((s) => s.name);
}

/**
 * Registry of the sentences designers may write, one set per kind. A pattern is
 * lowercase text with `{type}` parameters and an optional `(s)`; it is the phrase's stable id.
 */
export class PhraseLibrary {
  private readonly typeList: ParamType[];
  private readonly typeByName = new Map<string, ParamType>();
  private readonly entries = new Map<PhraseKind, Map<string, Entry>>();
  private readonly caches = new WeakMap<Vocab, VocabCache>();

  constructor(types: ParamType[]) {
    this.typeList = [...types];
    for (const t of types) this.typeByName.set(t.name, t);
  }

  cards(p: string, fn: CardsFn): this { return this.add('cards', p, fn); }
  zone(p: string, fn: ZoneFn): this { return this.add('zone', p, fn); }
  board(p: string, fn: BoardFn): this { return this.add('board', p, fn); }
  condition(p: string, fn: ConditionFn, opts?: PhraseOpts): this { return this.add('condition', p, fn, opts); }
  effect(p: string, fn: EffectFn, opts?: PhraseOpts): this { return this.add('effect', p, fn, opts); }
  turn(p: string, fn: TurnFn): this { return this.add('turn', p, fn); }
  who(p: string, fn: WhoFn, opts?: PhraseOpts): this { return this.add('who', p, fn, opts); }
  score(p: string, fn: ScoreFn): this { return this.add('score', p, fn); }
  winner(p: string, fn: WinnerFn): this { return this.add('winner', p, fn); }
  moment(p: string, fn: MomentFn): this { return this.add('moment', p, fn); }
  given(p: string, fn: EffectFn): this { return this.add('given', p, fn); }
  action(p: string, fn: ActionFn): this { return this.add('action', p, fn); }
  expect(p: string, fn: ExpectFn): this { return this.add('expect', p, fn); }

  get(kind: PhraseKind, pattern: string): ({ fn: unknown } & Required<PhraseOpts>) | undefined {
    const entry = this.entries.get(kind)?.get(pattern.toLowerCase());
    return entry && {
      fn: entry.fn, needsMove: entry.needsMove, needsPlayer: entry.needsPlayer, needsSpace: entry.needsSpace, needsPayment: entry.needsPayment,
      needsBoard: entry.needsBoard, needsDice: entry.needsDice,
    };
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

  /**
   * For a line `match` found no phrase for: whether it has the shape of a phrase of one of `kinds` once the names in it
   * are let loose, with a name the game never defined (“Shuffle the dek” is “shuffle {zone}” and there is no zone
   * “dek”). The phrase with the most words of its own wins. Null when no phrase has the line's shape that way: then it is
   * a phrase nobody has written yet. Only says what is wrong; it never makes a line match.
   */
  misnamed(kinds: PhraseKind[], text: string, vocab: Vocab): Misnamed | null {
    const line = normalizeLine(text);
    let best: (Misnamed & { rank: number }) | null = null;
    for (const kind of kinds) {
      for (const entry of this.entries.get(kind)?.values() ?? []) {
        if (best && best.rank >= entry.specificity + NARROW_BONUS) continue;
        const found = this.looseRegexFor(entry, vocab)?.exec(line);
        const named = found ? this.firstMisnamed(entry, found, vocab) : null;
        if (!named) continue;
        const rank = entry.specificity + (named.narrow ? NARROW_BONUS : 0);
        if (!best || rank > best.rank) best = { kind, problem: named.problem, rank };
      }
    }
    return best && { kind: best.kind, problem: best.problem };
  }

  private add(kind: PhraseKind, p: string, fn: unknown, opts: PhraseOpts = {}): this {
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
    const specificity = parts.reduce((n, part) => n + ('literal' in part ? part.literal.replace(/\s+/g, '').length : 0), 0);
    ofKind.set(pattern, {
      pattern, parts, display, literal: literal.replace(/\s+/g, ' ').trim(), specificity, fn,
      needsMove: opts.needsMove ?? false, needsPlayer: opts.needsPlayer ?? false, needsSpace: opts.needsSpace ?? false,
      needsPayment: opts.needsPayment ?? false, needsBoard: opts.needsBoard ?? false, needsDice: opts.needsDice ?? false,
    });
    return this;
  }

  private cacheFor(vocab: Vocab): VocabCache {
    let cache = this.caches.get(vocab);
    if (!cache) this.caches.set(vocab, (cache = { strict: new Map(), loose: new Map(), whole: new Map() }));
    return cache;
  }

  private regexFor(entry: Entry, vocab: Vocab): RegExp {
    const { strict } = this.cacheFor(vocab);
    let re = strict.get(entry);
    if (!re) {
      const body = entry.parts.map((part) => ('type' in part ? `(${part.type.source(vocab)})` : literalSource(part.literal))).join('');
      strict.set(entry, (re = new RegExp(`^${body}$`, 'i')));
    }
    return re;
  }

  /** The phrase with every name parameter matching any text of its shape; null when it has no such parameter. */
  private looseRegexFor(entry: Entry, vocab: Vocab): RegExp | null {
    const { loose } = this.cacheFor(vocab);
    if (!loose.has(entry)) {
      const hasNames = entry.parts.some((part) => 'type' in part && part.type.loose);
      const body = entry.parts
        .map((part) => ('type' in part ? `(${(part.type.loose ?? part.type).source(vocab)})` : literalSource(part.literal)))
        .join('');
      loose.set(entry, hasNames ? new RegExp(`^${body}$`, 'i') : null);
    }
    return loose.get(entry) ?? null;
  }

  /** True when the whole text is one instance of the type, read strictly. */
  private isWhole(type: ParamType, text: string, vocab: Vocab): boolean {
    const { whole } = this.cacheFor(vocab);
    let re = whole.get(type);
    if (!re) whole.set(type, (re = new RegExp(`^(?:${type.source(vocab)})$`, 'i')));
    return re.test(text);
  }

  /**
   * The first name in a loose match the game never defined, and whether its loose shape is a narrow one; null when there
   * is none, or some text is no name at all.
   */
  private firstMisnamed(entry: Entry, found: RegExpExecArray, vocab: Vocab): { problem: NameProblem; narrow: boolean } | null {
    let first: { problem: NameProblem; narrow: boolean } | null = null;
    let group = 1;
    for (const part of entry.parts) {
      if (!('type' in part)) continue;
      const text = found[group++];
      if (!part.type.loose || this.isWhole(part.type, text, vocab)) continue;
      const named = part.type.loose.explain(text, vocab);
      if (named === null) return null;
      first ??= { problem: named, narrow: part.type.loose.narrow ?? false };
    }
    return first;
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
    case 'cards':
    case 'board': return `${args}, table`;
    case 'zone': return argNames.length > 0 ? args : '';
    case 'score': return `env, ${args}, seat`;
    case 'winner': return `env, ${args}, scores`;
    case 'moment': return `env, ${args}, moment`;
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
