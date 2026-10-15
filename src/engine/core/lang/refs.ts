import type { Json } from '../table-def';
import type { ParamType, Vocab } from './types';

type Parsed = { value: Json } | { error: string };

export const STANDARD_RANKS: Record<string, number> = {
  ace: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, jack: 11, queen: 12, king: 13,
};
export const STANDARD_SUITS: Record<string, string> = { clubs: 'C', diamonds: 'D', hearts: 'H', spades: 'S' };

/** Suits as designers write them: plural ('hearts') or singular ('a heart'). */
const SUIT_FORMS = new Map(
  Object.entries(STANDARD_SUITS).flatMap(([plural, letter]) => [[plural, letter], [plural.slice(0, -1), letter]] as const),
);

/** `+es` after s/sh/ch/x/z, else `+s`. */
export function thirdPerson(verb: string): string {
  return /(?:s|sh|ch|x|z)$/i.test(verb) ? `${verb}es` : `${verb}s`;
}

// ---- regex building blocks -------------------------------------------------------------------

/** Matches nothing at all; stands in for a list with no words (an empty alternation would match ''). */
const NEVER = '(?!)';
/** Straight and curly apostrophes: designers paste text from word processors. */
const APOSTROPHE = "['‘’]";
const SEPARATORS = [', and ', ', ', ' and '];
const SEPARATOR_SOURCE = `(?:${SEPARATORS.join('|')})`;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Comparison form of a word: lowercase, straight apostrophes. */
const canon = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'");

/** Regex source for a vocabulary word or phrase: escaped, with any apostrophe form accepted. */
const wordSource = (word: string) => escapeRegex(canon(word)).replace(/'/g, APOSTROPHE);

/** Any of the words, longest first so that 'pass pile' is tried before anything it overlaps. */
function anyOf(words: string[]): string {
  const sorted = [...new Set(words.map(canon))].sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
  return sorted.length === 0 ? NEVER : `(?:${sorted.map(wordSource).join('|')})`;
}

/** Keeps a reference from starting or ending inside a longer word (matters when stubs scan free text). */
const bounded = (source: string) => `(?<!\\w)(?:${source})(?!\\w)`;

const joinOr = (words: string[]) => (words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} or ${words.at(-1)}`);

const unknownText = (text: string): { error: string } => ({ error: `I don't understand “${text}” here.` });

// ---- per-vocabulary caches (a Vocab is immutable once built) -----------------------------------

const caches = new WeakMap<Vocab, Map<string, unknown>>();

function memo<T>(vocab: Vocab, key: string, make: () => T): T {
  let perVocab = caches.get(vocab);
  if (!perVocab) caches.set(vocab, (perVocab = new Map()));
  if (!perVocab.has(key)) perVocab.set(key, make());
  return perVocab.get(key) as T;
}

/** True when the whole text is one instance of the type. */
function fullMatch(type: ParamType, text: string, vocab: Vocab): boolean {
  return memo(vocab, `full:${type.name}`, () => new RegExp(`^(?:${type.source(vocab)})$`, 'i')).test(text);
}

/** Splits 'a, b and c' into items, trying every separator position so names containing 'and' still work. */
function splitList<T>(text: string, parseItem: (item: string) => T | null): T[] | null {
  const lower = text.toLowerCase();
  const seps: { at: number; len: number }[] = [];
  for (let at = 0; at < lower.length; at++) {
    for (const sep of SEPARATORS) if (lower.startsWith(sep, at)) seps.push({ at, len: sep.length });
  }
  const from = (start: number): T[] | null => {
    const last = parseItem(text.slice(start));
    if (last !== null) return [last];
    for (const sep of seps) {
      if (sep.at <= start) continue;
      const head = parseItem(text.slice(start, sep.at));
      const rest = head === null ? null : from(sep.at + sep.len);
      if (head !== null && rest !== null) return [head, ...rest];
    }
    return null;
  };
  return from(0);
}

/** One or more items joined by the separators. */
const listSource = (item: string) => `${item}(?:${SEPARATOR_SOURCE}${item})*`;

/** The list's value, or its first error. */
function listResult(items: Parsed[] | null, text: string): Parsed {
  if (items === null) return unknownText(text);
  const values: Json[] = [];
  for (const item of items) {
    if ('error' in item) return item;
    values.push(item.value);
  }
  return { value: values };
}

// ---- players ---------------------------------------------------------------------------------

function seatResult(seatText: string, vocab: Vocab): Parsed {
  const n = Number(seatText.slice(1));
  if (n < vocab.maxPlayers) return { value: `p${n}` };
  if (vocab.maxPlayers <= 0) return { error: 'This game has no players.' };
  if (vocab.maxPlayers === 1) return { error: 'This game only has player p0.' };
  return { error: `This game only has players p0 to p${vocab.maxPlayers - 1}.` };
}

// ---- zones -----------------------------------------------------------------------------------

type ZoneTable = { names: Map<string, string>; shared: Set<string>; player: Set<string> };

const zoneTable = (vocab: Vocab): ZoneTable =>
  memo(vocab, 'zone-table', () => ({
    names: new Map([...vocab.sharedZones, ...vocab.playerZones].map((n) => [canon(n), n] as const)),
    shared: new Set(vocab.sharedZones.map(canon)),
    player: new Set(vocab.playerZones.map(canon)),
  }));

const zoneSource = (vocab: Vocab): string => {
  const names = anyOf([...vocab.sharedZones, ...vocab.playerZones]);
  return `(?:(?:the |their |each |every )?${names}|the winner${APOSTROPHE}s ${names}|p\\d+${APOSTROPHE}s ${names})`;
};

/** group 1 = the whole prefix, group 2 = a seat ('p2'), group 3 = the zone name */
const OWNER_PREFIX = /^(the winner's|(p\d+)'s|the|their|each|every) (.+)$/;

function resolveZone(text: string, vocab: Vocab): Parsed {
  const table = zoneTable(vocab);
  const t = canon(text);
  let prefix = '';
  let seat: string | undefined;
  let key = t;
  if (!table.names.has(t)) {
    const m = OWNER_PREFIX.exec(t);
    if (!m || !table.names.has(m[3])) return unknownText(text);
    [, prefix, seat, key] = m;
  }
  const name = table.names.get(key) as string;
  if (prefix === '' || prefix === 'the') {
    if (table.shared.has(key)) return { value: { shared: name } };
    return { error: `“the ${name}” — whose ${name}? Say “their ${name}”, “each ${name}” or “p1's ${name}”.` };
  }
  if (!table.player.has(key)) return { error: `“the ${name}” is shared, so it has no owner.` };
  if (prefix === 'their') return { value: { of: { who: 'actor' }, zone: name } };
  if (prefix === 'each' || prefix === 'every') return { value: { each: name } };
  if (seat === undefined) return { value: { of: { who: 'winner' }, zone: name } };
  const owner = seatResult(seat, vocab);
  return 'error' in owner ? owner : { value: { of: { seat: owner.value }, zone: name } };
}

const ZONE: ParamType = {
  name: 'zone', label: '[zone]', stubOrder: 3,
  source: (vocab) => bounded(zoneSource(vocab)),
  resolve: resolveZone,
};

const ZONES: ParamType = {
  name: 'zones', label: '[zones]',
  source: (vocab) => bounded(listSource(zoneSource(vocab))),
  resolve: (text, vocab) => listResult(splitList(text, (item) => (fullMatch(ZONE, item, vocab) ? resolveZone(item, vocab) : null)), text),
};

// ---- single words from the vocabulary ----------------------------------------------------------

/** A type whose text is one of a fixed set of words, each standing for a value. */
function wordType(name: string, label: string, entries: (vocab: Vocab) => [text: string, value: string][]): ParamType {
  return {
    name, label,
    source: (vocab) => bounded(anyOf(entries(vocab).map(([text]) => text))),
    resolve: (text, vocab) => {
      const entry = entries(vocab).find(([word]) => canon(word) === canon(text));
      return entry ? { value: entry[1] } : unknownText(text);
    },
  };
}

const PERZONE = wordType('perzone', '[zone]', (v) => v.playerZones.map((z) => [z, z]));
const PHASE = wordType('phase', '[phase]', (v) => v.phases.map((p) => [p, p]));
const MOVE = wordType('move', '[action]', (v) => v.verbs.map((verb) => [thirdPerson(verb), verb]));
const ATTRIBUTE = wordType('attribute', '[attribute]', (v) => v.attributes.map((a) => [a, a]));

const PLAYER: ParamType = {
  name: 'player', label: '[player]', stubOrder: 4,
  source: () => bounded('p\\d+'),
  resolve: (text, vocab) => seatResult(text, vocab),
};

// ---- cards -----------------------------------------------------------------------------------

type ValueTable = { texts: string[]; owners: Map<string, { attribute: string; value: Json }[]> };

/** Every card-table value, by its text; `texts` is longest first. */
const valueTable = (vocab: Vocab): ValueTable =>
  memo(vocab, 'value-table', () => {
    const owners = new Map<string, { attribute: string; value: Json }[]>();
    for (const { attribute, value } of vocab.cardValues) {
      const key = canon(String(value));
      owners.set(key, [...(owners.get(key) ?? []), { attribute, value }]);
    }
    return { texts: [...owners.keys()].sort((a, b) => b.length - a.length || (a < b ? -1 : 1)), owners };
  });

/** One or more card values in a row, separated by spaces. */
const valuesSource = (vocab: Vocab): string => {
  const value = anyOf(vocab.cardValues.map((v) => String(v.value)));
  return `${value}(?: ${value})*`;
};

const STANDARD_CARD = new RegExp(`^(?:the )?(${anyOf(Object.keys(STANDARD_RANKS))}) of (${anyOf(Object.keys(STANDARD_SUITS))})$`, 'i');
const STANDARD_SOURCE = `(?:the )?${anyOf(Object.keys(STANDARD_RANKS))} of ${anyOf(Object.keys(STANDARD_SUITS))}`;

/** Splits 'red 7' into its values, trying longer values first; null if some word is not a value. */
function tokenize(body: string, texts: string[]): string[] | null {
  const lower = canon(body);
  const from = (pos: number): string[] | null => {
    if (pos === lower.length) return [];
    for (const text of texts) {
      const end = pos + text.length;
      if (!lower.startsWith(text, pos) || (end < lower.length && lower[end] !== ' ')) continue;
      const rest = from(end < lower.length ? end + 1 : end);
      if (rest !== null) return [body.slice(pos, end), ...rest];
    }
    return null;
  };
  return from(0);
}

/** What the card values in `body` say, as attribute → value; each value must have exactly one attribute. */
function valuesResult(tokens: string[], vocab: Vocab): Parsed {
  const { owners } = valueTable(vocab);
  const found = new Map<string, { token: string; value: Json }>();
  for (const token of tokens) {
    const options = owners.get(canon(token)) ?? [];
    const attributes = [...new Set(options.map((o) => o.attribute))];
    if (attributes.length !== 1) return { error: `“${token}” could be ${joinOr(attributes)}.` };
    const [{ attribute, value }] = options;
    const earlier = found.get(attribute);
    if (earlier) return { error: `“${earlier.token}” and “${token}” are both ${attribute} values, but a card has only one.` };
    found.set(attribute, { token, value });
  }
  return { value: Object.fromEntries([...found].map(([attribute, { value }]) => [attribute, value])) };
}

function cardSource(vocab: Vocab): string {
  const forms: string[] = [];
  if (vocab.standardDeck) forms.push(STANDARD_SOURCE);
  if (vocab.cardValues.length > 0) forms.push(`(?:a|an|the) ${valuesSource(vocab)}`);
  return forms.length === 0 ? NEVER : `(?:${forms.join('|')})`;
}

function resolveCard(text: string, vocab: Vocab): Parsed {
  const standard = vocab.standardDeck ? STANDARD_CARD.exec(canon(text)) : null;
  if (standard) return { value: { suit: STANDARD_SUITS[standard[2]], rank: STANDARD_RANKS[standard[1]] } };
  const article = /^(?:a|an|the) (.+)$/i.exec(text);
  const tokens = article ? tokenize(article[1], valueTable(vocab).texts) : null;
  return tokens && tokens.length > 0 ? valuesResult(tokens, vocab) : unknownText(text);
}

const CARD: ParamType = {
  name: 'card', label: '[card]', stubOrder: 2,
  source: (vocab) => bounded(cardSource(vocab)),
  resolve: resolveCard,
};

const CARDLIST: ParamType = {
  name: 'cardlist', label: '[cards]',
  source: (vocab) => bounded(listSource(cardSource(vocab))),
  resolve: (text, vocab) => listResult(splitList(text, (item) => (fullMatch(CARD, item, vocab) ? resolveCard(item, vocab) : null)), text),
};

const CARD_SUFFIX = / cards?$/i;

function cardClassSource(vocab: Vocab): string {
  const forms: string[] = [];
  if (vocab.standardDeck) forms.push(anyOf([...SUIT_FORMS.keys()]));
  if (vocab.cardValues.length > 0) forms.push(`${valuesSource(vocab)}(?: cards?)?`);
  return forms.length === 0 ? NEVER : `(?:(?:a|an) )?(?:${forms.join('|')})`;
}

function resolveCardClass(text: string, vocab: Vocab): Parsed {
  const body = /^(?:(?:a|an) )?(.+)$/i.exec(text)?.[1] ?? text;
  const letter = vocab.standardDeck ? SUIT_FORMS.get(canon(body)) : undefined;
  if (letter !== undefined) return { value: { suit: letter } };
  const { texts } = valueTable(vocab);
  const tokens = tokenize(body, texts) ?? tokenize(body.replace(CARD_SUFFIX, ''), texts);
  return tokens && tokens.length > 0 ? valuesResult(tokens, vocab) : unknownText(text);
}

const CARDCLASS: ParamType = {
  name: 'cardclass', label: '[kind of card]',
  source: (vocab) => bounded(cardClassSource(vocab)),
  resolve: resolveCardClass,
};

// ---- the list ----------------------------------------------------------------------------------

/** Parameter types whose text depends on the game being compiled. */
export const VOCAB_TYPES: ParamType[] = [ZONE, ZONES, PERZONE, PLAYER, PHASE, MOVE, ATTRIBUTE, CARD, CARDLIST, CARDCLASS];

const TYPES_BY_NAME = new Map(VOCAB_TYPES.map((t) => [t.name, t] as const));

/** Reads `text` as one instance of the named type; null when the type's pattern does not cover all of it. */
export function parseParam(type: string, text: string, vocab: Vocab): Parsed | null {
  const found = TYPES_BY_NAME.get(type);
  if (!found) throw new Error(`unknown parameter type {${type}}`);
  return fullMatch(found, text, vocab) ? found.resolve(text, vocab) : null;
}
