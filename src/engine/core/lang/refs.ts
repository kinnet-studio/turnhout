import type { Json } from '../table-def';
import { SEPARATORS, listSource, separatorSource, splitList, suggestNames } from './phrases';
import type { FactSpec, NameProblem, ParamType, SpaceClass, Vocab } from './types';
import { NEEDS_TWO } from './zones';

type Parsed = { value: Json } | { error: string };

export const STANDARD_RANKS: Record<string, number> = {
  ace: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, jack: 11, queen: 12, king: 13,
};
export const STANDARD_SUITS: Record<string, string> = { clubs: 'C', diamonds: 'D', hearts: 'H', spades: 'S' };

/** Suits as designers write them: plural ('hearts') or singular ('a heart'). */
const SUIT_FORMS = new Map(
  Object.entries(STANDARD_SUITS).flatMap(([plural, letter]) => [[plural, letter], [plural.slice(0, -1), letter]] as const),
);

/** `-ies` for a consonant and y (bury), `+es` after s/sh/ch/x/z/o, else `+s`. */
export function thirdPerson(verb: string): string {
  if (/[^aeiou]y$/i.test(verb)) return `${verb.slice(0, -1)}ies`;
  return /(?:s|sh|ch|x|z|o)$/i.test(verb) ? `${verb}es` : `${verb}s`;
}

/** A noun's plural: `-ies` for a consonant and y (penny), `+es` after s/sh/ch/x/z (box), else `+s`. */
export function plural(noun: string): string {
  if (/[^aeiou]y$/i.test(noun)) return `${noun.slice(0, -1)}ies`;
  return /(?:s|sh|ch|x|z)$/i.test(noun) ? `${noun}es` : `${noun}s`;
}

/**
 * The words a plural noun may be the plural of. English does not say whether "boxes" comes from box or boxe, or "caches"
 * from cache or cach, so every way that makes a word is given; the odd one among them is only ever an odd name.
 */
export function singularForms(noun: string): string[] {
  const forms: string[] = [];
  if (/[^s]s$/i.test(noun)) forms.push(noun.slice(0, -1));
  if (/(?:ss|sh|ch|x|z)es$/i.test(noun)) forms.push(noun.slice(0, -2));
  if (/[^aeiou]ies$/i.test(noun)) forms.push(`${noun.slice(0, -3)}y`);
  return forms;
}

/**
 * "1 token" or "3 tokens": a name the game declares is plural, and of the singulars it may come from, the last has the most
 * taken off. A name ending in “us” (bonus, status) is a singular already, and shortened it would read “1 bonu”, so it stays.
 */
export function counted(n: number, name: string): string {
  const singulars = /us$/i.test(name) ? [] : singularForms(name);
  return `${n} ${n === 1 && singulars.length > 0 ? singulars[singulars.length - 1] : name}`;
}

/** The first word of an action in the third person: 'end their turn' is 'ends their turn'. */
export const thirdPersonWords = (words: string): string => words.replace(/^\S+/, (first) => thirdPerson(first));

/** Whole words of a rule's text that name the player, and what the player reads in their place. */
const SECOND_PERSON = new Map([['their', 'your'], ["they're", "you're"], ['they', 'you'], ['them', 'you'], ['themselves', 'yourself']]);
const THIRD_PERSON_WORD = /\b(?:they['‘’]re|themselves|their|they|them)\b/gi;

/** What a rule says about the player, said to the player: 'end their turn' is 'end your turn', 'a field they own' is 'a field you own'. */
export const secondPersonWords = (words: string): string =>
  words.replace(THIRD_PERSON_WORD, (word) => SECOND_PERSON.get(word.toLowerCase().replace(/[‘’]/g, "'")) ?? word);

const IRREGULAR_PARTICIPLES = new Map(Object.entries({
  buy: 'bought', draw: 'drawn', pay: 'paid', build: 'built', sell: 'sold', take: 'taken', give: 'given', throw: 'thrown', put: 'put',
  go: 'gone', make: 'made', get: 'got', win: 'won', lose: 'lost', hold: 'held', keep: 'kept', leave: 'left', bid: 'bid', deal: 'dealt',
  spend: 'spent', choose: 'chosen', run: 'run',
}));

/** One vowel then one consonant ends a short verb that doubles it (stop, skip, plan); w, x and y never double (show, fix). */
const DOUBLES_LAST = /^[^aeiou]*[aeiou][^aeiouwxy]$/i;

/** What a player has done by the end of the turn: 'rolled', 'bought'. Regular verbs only add `d`, `ied`, `ed` or a doubled letter and `ed`. */
export function participle(verb: string): string {
  const irregular = IRREGULAR_PARTICIPLES.get(verb.toLowerCase());
  if (irregular !== undefined) return irregular;
  if (/e$/i.test(verb)) return `${verb}d`;
  if (DOUBLES_LAST.test(verb)) return `${verb}${verb.slice(-1)}ed`;
  return /[^aeiou]y$/i.test(verb) ? `${verb.slice(0, -1)}ied` : `${verb}ed`;
}

// ---- regex building blocks -------------------------------------------------------------------

/** Matches nothing at all; stands in for a list with no words (an empty alternation would match ''). */
const NEVER = '(?!)';
/** Straight and curly apostrophes: designers paste text from word processors. */
const APOSTROPHE = "['‘’]";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Comparison form of a word: lowercase, straight apostrophes. */
export const canon = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'");

/** Regex source for a vocabulary word or phrase: escaped, with any apostrophe form accepted. */
const wordSource = (word: string) => escapeRegex(canon(word)).replace(/'/g, APOSTROPHE);

/** Any of the words, longest first so that 'pass pile' is tried before anything it overlaps. */
function anyOf(words: string[]): string {
  const sorted = [...new Set(words.map(canon))].sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
  return sorted.length === 0 ? NEVER : `(?:${sorted.map(wordSource).join('|')})`;
}

/** Keeps a reference from starting or ending inside a longer word (matters when stubs scan free text). */
const bounded = (source: string) => `(?<!\\w)(?:${source})(?!\\w)`;

const joinWith = (conjunction: string) => (words: string[]) =>
  (words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} ${conjunction} ${words.at(-1)}`);
export const joinOr = joinWith('or');
const joinAnd = joinWith('and');

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

// ---- names the game never defined -------------------------------------------------------------

/** Loose shapes for text that may name something the game never defined: any text, or one word. */
const ANY_TEXT = '.+?';
const ONE_WORD = '\\S+';
const MAX_SUGGESTIONS = 3;

const looseAs = (source: string, explain: (text: string, vocab: Vocab) => NameProblem | null): ParamType['loose'] =>
  ({ source: () => source, explain });

const missing = (what: string, name: string, suggestions: string[]): NameProblem =>
  ({ message: `There is no ${what} called “${name}”.`, suggestions });

/** The defined names closest to `name`; when none is close, the first few there are, so the designer sees what exists. */
function closestOrFirst(name: string, names: string[]): string[] {
  const close = suggestNames(name, names);
  return close.length > 0 ? close : names.slice(0, MAX_SUGGESTIONS);
}

/** True when `text` holds one of `names` as whole words: a real name with other words around it is some other phrase. */
const holdsName = (text: string, names: string[]): boolean =>
  names.some((name) => new RegExp(bounded(wordSource(name)), 'i').test(canon(text)));

const LIST_SEPARATOR = new RegExp(separatorSource(SEPARATORS), 'i');

/** The first misnamed item of a list; null when an item is not meant as one at all, or when none is misnamed. */
function misnamedItem(text: string, vocab: Vocab, item: ParamType): NameProblem | null {
  let problem: NameProblem | null = null;
  for (const part of text.split(LIST_SEPARATOR)) {
    if (fullMatch(item, part, vocab)) continue;
    const found = item.loose?.explain(part, vocab) ?? null;
    if (found === null) return null;
    problem ??= found;
  }
  return problem;
}

// ---- players ---------------------------------------------------------------------------------

/** Who the players are, for a designer who named one that is not. */
function playersAre(vocab: Vocab): string {
  if (vocab.maxPlayers <= 0) return 'This game has no players.';
  if (vocab.maxPlayers === 1) return 'The only player is p0.';
  return `Players are called p0 to p${vocab.maxPlayers - 1}.`;
}

/** “player1” or “P-2”: text that looks like a seat but is not written as one. */
const SEAT_LIKE = /^p\D*(\d+)$/i;

function misnamedPlayer(text: string, vocab: Vocab): NameProblem | null {
  const seat = SEAT_LIKE.exec(text);
  if (!seat) return null;
  const n = Number(seat[1]);
  return { message: `There is no player called “${text}”. ${playersAre(vocab)}`, suggestions: n < vocab.maxPlayers ? [`p${n}`] : [] };
}

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
  return `(?:(?:the |their |each |every )?${names}|the (?:winner|other player)${APOSTROPHE}s ${names}|p\\d+${APOSTROPHE}s ${names})`;
};

/** group 1 = the whole prefix, group 2 = a seat ('p2'), group 3 = the zone name */
const OWNER_PREFIX = /^(the winner's|the other player's|(p\d+)'s|the|their|each|every) (.+)$/;

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
  // There is one other player only at a table of two, so a game that allows more or fewer can never say it.
  if (prefix === "the other player's") return vocab.maxPlayers === 2 ? { value: { of: { who: 'other' }, zone: name } } : { error: NEEDS_TWO };
  if (prefix === 'each' || prefix === 'every') return { value: { each: name } };
  if (seat === undefined) return { value: { of: { who: 'winner' }, zone: name } };
  const owner = seatResult(seat, vocab);
  return 'error' in owner ? owner : { value: { of: { seat: owner.value }, zone: name } };
}

/** The same owner words as OWNER_PREFIX, read from the text as written; group 1 = the zone name. */
const OWNED_NAME = /^(?:the winner['‘’]s|the other player['‘’]s|p\d+['‘’]s|the|their|each|every) (.+)$/i;

const allZones = (vocab: Vocab): string[] => [...vocab.sharedZones, ...vocab.playerZones];

function misnamedZone(text: string, vocab: Vocab): NameProblem | null {
  const name = OWNED_NAME.exec(text)?.[1] ?? text;
  return holdsName(name, allZones(vocab)) ? null : missing('zone', name, closestOrFirst(name, allZones(vocab)));
}

function misnamedPlayerZone(text: string, vocab: Vocab): NameProblem | null {
  const shared = vocab.sharedZones.find((zone) => canon(zone) === canon(text));
  if (shared !== undefined) {
    return { message: `“${shared}” is shared, but this needs a zone that each player has.`, suggestions: closestOrFirst(text, vocab.playerZones) };
  }
  return holdsName(text, allZones(vocab)) ? null : missing('zone', text, closestOrFirst(text, vocab.playerZones));
}

const ZONE: ParamType = {
  name: 'zone', label: '[zone]', stubOrder: 3,
  source: (vocab) => bounded(zoneSource(vocab)),
  resolve: resolveZone,
  loose: looseAs(ANY_TEXT, misnamedZone),
};

const ZONES: ParamType = {
  name: 'zones', label: '[zones]',
  source: (vocab) => bounded(listSource(zoneSource(vocab))),
  resolve: (text, vocab) => listResult(splitList(text, (item) => (fullMatch(ZONE, item, vocab) ? resolveZone(item, vocab) : null)), text),
  loose: looseAs(ANY_TEXT, (text, vocab) => misnamedItem(text, vocab, ZONE)),
};

// ---- single words from the vocabulary ----------------------------------------------------------

/** A type whose text is one of a fixed set of words, each standing for a value. */
function wordType(
  name: string, label: string, entries: (vocab: Vocab) => [text: string, value: string][], loose: ParamType['loose'],
): ParamType {
  return {
    name, label,
    source: (vocab) => bounded(anyOf(entries(vocab).map(([text]) => text))),
    resolve: (text, vocab) => {
      const entry = entries(vocab).find(([word]) => canon(word) === canon(text));
      return entry ? { value: entry[1] } : unknownText(text);
    },
    loose,
  };
}

/** A name that is not one of `names`, unless it holds one among other words (then it is some other phrase). */
const misnamedWord = (what: string, names: (vocab: Vocab) => string[]) => (text: string, vocab: Vocab): NameProblem | null =>
  holdsName(text, names(vocab)) ? null : missing(what, text, closestOrFirst(text, names(vocab)));

const PERZONE = wordType('perzone', '[zone]', (v) => v.playerZones.map((z) => [z, z]), looseAs(ANY_TEXT, misnamedPlayerZone));
const PHASE = wordType('phase', '[phase]', (v) => v.phases.map((p) => [p, p]), looseAs(ANY_TEXT, misnamedWord('phase', (v) => v.phases)));
const MOVE = wordType(
  'move', '[action]', (v) => v.verbs.map((verb) => [thirdPerson(verb), verb]),
  looseAs(ONE_WORD, misnamedWord('move', (v) => v.verbs.map(thirdPerson))),
);
// A number a card has is said in the singular beside a count of one ("1 charge"), whether the game declares it or its table has it.
// Any text may be a misspelt attribute even in a game that has none, as it always has been; the other declared names wait
// until a game declares one.
const ATTRIBUTE = declaredWord('attribute', '[attribute]', 'card attribute', (v) => v.attributes, true, true);

const PLAYER: ParamType = {
  name: 'player', label: '[player]', stubOrder: 4,
  source: () => bounded('p\\d+'),
  resolve: (text, vocab) => seatResult(text, vocab),
  loose: looseAs(ONE_WORD, misnamedPlayer),
};

// ---- cards -----------------------------------------------------------------------------------

type ValueTable = { texts: string[]; owners: Map<string, { attribute: string; value: Json }[]> };

/** Every value of a table, by its text or by each of the `forms` it may be written in; `texts` is longest first. */
function tableOf(values: { attribute: string; value: Json }[], forms: (text: string) => string[] = (text) => [text]): ValueTable {
  const owners = new Map<string, { attribute: string; value: Json }[]>();
  for (const { attribute, value } of values) {
    for (const form of forms(String(value))) {
      const key = canon(form);
      owners.set(key, [...(owners.get(key) ?? []), { attribute, value }]);
    }
  }
  return { texts: [...owners.keys()].sort((a, b) => b.length - a.length || (a < b ? -1 : 1)), owners };
}

const valueTable = (vocab: Vocab): ValueTable => memo(vocab, 'value-table', () => tableOf(vocab.cardValues));

/** One or more card values in a row, separated by spaces. */
const valuesSource = (vocab: Vocab): string => {
  const value = anyOf(vocab.cardValues.map((v) => String(v.value)));
  return `${value}(?: ${value})*`;
};

const STANDARD_CARD = new RegExp(`^(?:the )?(${anyOf(Object.keys(STANDARD_RANKS))}) of (${anyOf(Object.keys(STANDARD_SUITS))})$`, 'i');
const STANDARD_SOURCE = `(?:the )?${anyOf(Object.keys(STANDARD_RANKS))} of ${anyOf(Object.keys(STANDARD_SUITS))}`;

/** Splits 'red 7' into its values (or 'field or forest', with ' or ' between them), trying longer values first; null if some word is not a value. */
function tokenize(body: string, texts: string[], separator = ' '): string[] | null {
  const lower = canon(body);
  const from = (pos: number): string[] | null => {
    if (pos === lower.length) return [];
    for (const text of texts) {
      const end = pos + text.length;
      if (!lower.startsWith(text, pos) || (end < lower.length && !lower.startsWith(separator, end))) continue;
      const rest = from(end < lower.length ? end + separator.length : end);
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

const RANK_NAMES = Object.keys(STANDARD_RANKS);
const SUIT_NAMES = Object.keys(STANDARD_SUITS);
const ARTICLE = /^(?:a|an|the) (.+)$/i;
const RANK_OF_SUIT = /^(.+) of (.+)$/i;

/** “the 2 of clbs”: a standard card whose rank or suit, but not both, is not one. */
function misnamedStandard(body: string): NameProblem | null {
  const found = RANK_OF_SUIT.exec(body);
  if (!found) return null;
  const [, rank, suit] = found;
  const rankKnown = RANK_NAMES.includes(canon(rank));
  const suitKnown = SUIT_NAMES.includes(canon(suit));
  if (rankKnown && !suitKnown) return missing('suit', suit, suggestNames(suit, SUIT_NAMES));
  if (suitKnown && !rankKnown) return missing('rank', rank, suggestNames(rank, RANK_NAMES));
  return null;
}

/** The words of `body` that are no card value, reading the longest values first, and how many values it holds. */
function readValues(body: string, vocab: Vocab): { unknown: string[]; known: number } {
  const { texts } = valueTable(vocab);
  const words = body.split(' ');
  const unknown: string[] = [];
  let known = 0;
  for (let at = 0; at < words.length;) {
    const rest = canon(words.slice(at).join(' '));
    const value = texts.find((text) => rest === text || rest.startsWith(`${text} `));
    if (value === undefined) {
      unknown.push(words[at]);
      at += 1;
    } else {
      known += 1;
      at += value.split(' ').length;
    }
  }
  return { unknown, known };
}

/**
 * “a purple 7”: one word that is no card value beside words that are. A word on its own counts only when it looks like
 * a value, since “the card is playable” is more likely a phrase nobody has written yet than a misspelt value.
 */
function misnamedValues(body: string, vocab: Vocab): NameProblem | null {
  const { unknown, known } = readValues(body, vocab);
  if (unknown.length !== 1) return null;
  const close = suggestNames(unknown[0], [...new Set(vocab.cardValues.map((v) => String(v.value)))]);
  return known > 0 || close.length > 0 ? missing('card value', unknown[0], close) : null;
}

function misnamedCard(text: string, vocab: Vocab): NameProblem | null {
  const article = ARTICLE.exec(text);
  const body = article?.[1] ?? text;
  const standard = vocab.standardDeck ? misnamedStandard(body) : null;
  if (standard) return standard;
  return article && vocab.cardValues.length > 0 ? misnamedValues(body, vocab) : null;
}

const CARD: ParamType = {
  name: 'card', label: '[card]', stubOrder: 2,
  source: (vocab) => bounded(cardSource(vocab)),
  resolve: resolveCard,
  loose: looseAs(ANY_TEXT, misnamedCard),
};

const CARDLIST: ParamType = {
  name: 'cardlist', label: '[cards]',
  source: (vocab) => bounded(listSource(cardSource(vocab))),
  resolve: (text, vocab) => listResult(splitList(text, (item) => (fullMatch(CARD, item, vocab) ? resolveCard(item, vocab) : null)), text),
  loose: looseAs(ANY_TEXT, (text, vocab) => misnamedItem(text, vocab, CARD)),
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

/** “a hart” or “reed cards”; like a value, a lone word counts as a misspelt suit only when it looks like one. */
function misnamedCardClass(text: string, vocab: Vocab): NameProblem | null {
  const body = /^(?:a|an) (.+)$/i.exec(text)?.[1] ?? text;
  if (vocab.standardDeck && !body.includes(' ')) {
    const close = suggestNames(body, [...SUIT_FORMS.keys()]);
    if (close.length > 0) return missing('suit', body, close);
  }
  return vocab.cardValues.length > 0 ? misnamedValues(body.replace(CARD_SUFFIX, ''), vocab) : null;
}

const CARDCLASS: ParamType = {
  name: 'cardclass', label: '[kind of card]',
  source: (vocab) => bounded(cardClassSource(vocab)),
  resolve: resolveCardClass,
  loose: looseAs(ANY_TEXT, misnamedCardClass),
};

// ---- board: spaces, counters and actions -------------------------------------------------------

/** Each space name (any capitals) with its first spelling in the table and the places it holds in the loop; a shared name holds several. */
type SpaceTable = Map<string, { name: string; at: number[] }>;

const spaceTable = (vocab: Vocab): SpaceTable =>
  memo(vocab, 'space-table', () => {
    const table: SpaceTable = new Map();
    vocab.spaces.forEach((name, at) => {
      const found = table.get(canon(name));
      if (found) found.at.push(at);
      else table.set(canon(name), { name, at: [at] });
    });
    return table;
  });

/** Each name once: suggestions and "is this a real name" both care about names, not about how many spaces carry one. */
const spaceNames = (vocab: Vocab): string[] => [...spaceTable(vocab).values()].map((space) => space.name);

function resolveSpace(text: string, vocab: Vocab): Parsed {
  const found = spaceTable(vocab).get(canon(text));
  if (!found) return unknownText(text);
  // A rule about a name several spaces share would silently be about only one of them.
  if (found.at.length > 1) return { error: `There are ${found.at.length} spaces called “${found.name}”, so this can't tell which one.` };
  return { value: found.at[0] };
}

const SPACE: ParamType = {
  name: 'space', label: '[space]',
  source: (vocab) => bounded(anyOf(vocab.spaces)),
  resolve: resolveSpace,
  loose: looseAs(ANY_TEXT, misnamedWord('space', spaceNames)),
};

const spaceValueTable = (vocab: Vocab): ValueTable => memo(vocab, 'space-value-table', () => tableOf(vocab.spaceValues));

const SPACE_SUFFIX = / space$/i;
const A_OR_AN = /^(?:a|an) (.+)$/i;

function spaceClassSource(vocab: Vocab): string {
  if (vocab.spaceValues.length === 0) return NEVER;
  const value = anyOf(vocab.spaceValues.map((v) => v.value));
  return `(?:a|an) ${value}(?: or ${value})*(?: space)?`;
}

/** “a field or forest”: spaces whose value in one column is any of those. */
function resolveSpaceClass(text: string, vocab: Vocab): Parsed {
  const body = A_OR_AN.exec(text)?.[1] ?? text;
  const { texts, owners } = spaceValueTable(vocab);
  // Try the whole body first: a value may itself end in "space".
  const tokens = tokenize(body, texts, ' or ') ?? tokenize(body.replace(SPACE_SUFFIX, ''), texts, ' or ');
  if (tokens === null || tokens.length === 0) return unknownText(text);
  const columns: string[] = [];
  const values = new Set<Json>();
  for (const token of tokens) {
    const options = owners.get(canon(token)) ?? [];
    const attributes = [...new Set(options.map((o) => o.attribute))];
    if (attributes.length !== 1) return { error: `“${token}” could be ${joinOr(attributes)}.` };
    if (!columns.includes(attributes[0])) columns.push(attributes[0]);
    for (const { value } of options) values.add(value);
  }
  if (columns.length > 1) return { error: `“${text}” mixes ${joinAnd(columns)}.` };
  const kind: SpaceClass = { attribute: columns[0], values: [...values] };
  return { value: kind };
}

/** A kind of space as a designer writes one, read loosely: “a” or “an”, one word or several joined by “or”, maybe “space”. */
const LOOSE_SPACE_CLASS = '(?:a|an) \\S+(?: or \\S+)*(?: space)?';
const OR = / or /i;

/** “a taks space” or “a field or forrest”: the first word that is no word of the board's table, with the closest that are. */
function misnamedSpaceClass(text: string, vocab: Vocab): NameProblem | null {
  const body = (A_OR_AN.exec(text)?.[1] ?? text).replace(SPACE_SUFFIX, '');
  const values = [...new Set(vocab.spaceValues.map((v) => v.value))];
  const known = new Set(values.map(canon));
  const unknown = body.split(OR).find((word) => !known.has(canon(word)));
  return unknown === undefined ? null : missing('kind of space', unknown, closestOrFirst(unknown, values));
}

const SPACECLASS: ParamType = {
  name: 'spaceclass', label: '[kind of space]',
  source: (vocab) => bounded(spaceClassSource(vocab)),
  resolve: resolveSpaceClass,
  // Narrow: “When a player lands on a taks space” is a misspelt kind of space, not a space called “a taks space”.
  loose: { source: (vocab) => (vocab.spaceValues.length === 0 ? NEVER : LOOSE_SPACE_CLASS), explain: misnamedSpaceClass, narrow: true },
};

const spaceKindTable = (vocab: Vocab): ValueTable => memo(vocab, 'space-kind-table', () => tableOf(vocab.spaceValues, (text) => [text, plural(text)]));

/** “tax” or “taxes”: the spaces whose value in one column is that, with no article and no “space” to follow it. */
function resolveSpaceKind(text: string, vocab: Vocab): Parsed {
  const options = spaceKindTable(vocab).owners.get(canon(text)) ?? [];
  const attributes = [...new Set(options.map((o) => o.attribute))];
  if (attributes.length === 0) return unknownText(text);
  if (attributes.length > 1) return { error: `“${text}” could be ${joinOr(attributes)}.` };
  const kind: SpaceClass = { attribute: attributes[0], values: [...new Set(options.map((o) => o.value))] };
  return { value: kind };
}

/** A word that is no value of the board's table, with the values closest to it; a real value among other words is some other phrase. */
function misnamedSpaceKind(text: string, vocab: Vocab): NameProblem | null {
  if (holdsName(text, spaceKindTable(vocab).texts)) return null;
  const values = [...new Set(vocab.spaceValues.map((v) => v.value))];
  return missing('kind of space', text, closestOrFirst(text, values));
}

const SPACEKIND: ParamType = {
  name: 'spacekind', label: '[kind of space]',
  source: (vocab) => bounded(anyOf(spaceKindTable(vocab).texts)),
  resolve: resolveSpaceKind,
  // Any text may be a misspelt kind, but only on a board with words in its table: elsewhere the line is some other phrase.
  loose: { source: (vocab) => (vocab.spaceValues.length === 0 ? NEVER : ANY_TEXT), explain: misnamedSpaceKind },
};

const SPACEATTR = wordType(
  'spaceattr', '[space detail]', (v) => v.spaceAttributes.map((a) => [a, a]),
  looseAs(ANY_TEXT, misnamedWord('space detail', (v) => v.spaceAttributes)),
);
const COUNTER = wordType(
  'counter', '[counter]', (v) => v.counters.map((c) => [c, c]),
  looseAs(ANY_TEXT, misnamedWord('counter', (v) => v.counters)),
);

/**
 * A type whose text is a name the game declares. With `singulars` the text may also be the singular of a plural name
 * ("token" for "tokens"), as a count of one is said; either way it resolves to the declared name. A line is read as a
 * misspelt name only in a game that declares some, unless `anyText` says any line may be one.
 */
function declaredWord(
  name: string, label: string, what: string, names: (vocab: Vocab) => string[], singulars: boolean, anyText = false,
): ParamType {
  const forms = (vocab: Vocab): [text: string, value: string][] =>
    names(vocab).flatMap((declared) => [declared, ...(singulars ? singularForms(declared) : [])].map((form): [string, string] => [form, declared]));
  return wordType(name, label, forms, {
    // With no names declared (and no `anyText`) the line is some other phrase.
    source: (vocab) => (!anyText && names(vocab).length === 0 ? NEVER : ANY_TEXT),
    explain: (text, vocab) => (holdsName(text, forms(vocab).map(([form]) => form)) ? null : missing(what, text, closestOrFirst(text, names(vocab)))),
  });
}

/** The names of the facts a game declares on something, of one kind: a count it has, or something it has or has not. */
const factNames = (on: FactSpec['on'], kind: FactSpec['kind']) => (vocab: Vocab): string[] =>
  vocab.facts.filter((fact) => fact.on === on && fact.kind === kind).map((fact) => fact.name);

const SPACEFLAG = declaredWord('spaceflag', '[space fact]', 'space fact', factNames('space', 'flag'), false);
const SPACENUMBER = declaredWord('spacenumber', '[space fact]', 'space fact', factNames('space', 'number'), true);
const CARDFLAG = declaredWord('cardflag', '[card fact]', 'card fact', factNames('card', 'flag'), false);
const PLAYERFLAG = declaredWord('playerflag', '[player fact]', 'player fact', factNames('player', 'flag'), false);
const PLAYERNUMBER = declaredWord('playernumber', '[player fact]', 'player fact', factNames('player', 'number'), true);
const GAMENUMBER = declaredWord('gamenumber', '[game number]', 'game number', factNames('game', 'number'), false);
const BANKED = declaredWord('banked', '[bank item]', 'bank item', (vocab) => vocab.bank, true);

// Actions and what was done are whole phrases ("ends their turn", "rolled") with a fixed form, not names to misspell.
// An action is its wording, which is the move a button sends. A button that picks a space is not one an example can press
// by its wording: it names the space after the base (“plants a flag” on Rose Lane), so that is a type of its own.
const ACTION = wordType('action', '[action]', (v) => v.actions.filter((a) => !a.targeted).map((a) => [thirdPersonWords(a.words), a.words]), undefined);

/** The base of a button that picks a space, in the third person; two such buttons with one base could not be told apart by it. */
const TARGETACTION: ParamType = {
  name: 'targetaction', label: '[action]',
  source: (vocab) => bounded(anyOf(vocab.actions.filter((a) => a.targeted).map((a) => thirdPersonWords(a.base)))),
  resolve: (text, vocab) => {
    const wordings = [...new Set(vocab.actions.filter((a) => a.targeted && canon(thirdPersonWords(a.base)) === canon(text)).map((a) => a.words))];
    if (wordings.length === 0) return unknownText(text);
    if (wordings.length > 1) return { error: `“${text}” could mean ${joinOr(wordings.map((w) => `“${w}”`))}.` };
    return { value: wordings[0] };
  },
};

/**
 * The base of a button that carries an amount, in the third person: an example gives the number after it (“p1 raises 50”). The
 * wording `ACTION` lists for the same button (“p1 raises an amount”) presses it with no number.
 */
const AMOUNTACTION = wordType('amountaction', '[action]', (v) => v.actions.filter((a) => a.amount).map((a) => [thirdPersonWords(a.base), a.words]), undefined);

type VocabAction = Vocab['actions'][number];

/** A button's wording with its verb, the first word, in the past: 'roll for a double' is 'rolled for a double'. */
export function pastWording(words: string): string {
  const verb = words.split(' ')[0];
  return `${participle(verb)}${words.slice(verb.length)}`;
}

/** What a button is called once it has been pressed: 'roll for a double' is 'rolled for a double', and a one-word button is its bare participle. */
const doneWording = (action: VocabAction): string => pastWording(action.words);

/**
 * What a button that picks a space is called once pressed, without the space: 'planted a flag' for 'plant a flag on a space
 * they own'. Where the player planted it is no part of having planted it, so a rule may leave it out. A button that takes no
 * target has no such name, since its whole wording is all there is to say.
 */
const doneBase = (action: VocabAction): string[] => (action.targeted ? [pastWording(action.base)] : []);

/** The ways a done-text can name a button, nearest first: a text that is several of them reads as the first. */
const DONE_NAMES: ((action: VocabAction) => string[])[] = [
  (a) => [participle(a.verb)], (a) => [doneWording(a)], doneBase,
];

/**
 * What was done names buttons by the move type each sends: a bare participle ('rolled') every button whose verb has it, a
 * whole done-wording ('rolled for a double') that one button, and the done-wording of a targeted button's base ('planted a
 * flag') every such button with that base. A one-word button's wording is also its bare participle, and a button's own
 * wording is nearer than another's base, so the first way that fits is the one read. The moves come once each, in the
 * order the buttons were declared. A button any player may press is recognised but never part of a turn, so it is left out of
 * the moves, and a text that names only such buttons is an error.
 */
const DONE: ParamType = {
  name: 'done', label: '[action done]',
  source: (vocab) => bounded(anyOf(vocab.actions.flatMap((a) => DONE_NAMES.flatMap((namesOf) => namesOf(a))))),
  resolve: (text, vocab) => {
    const named = (namesOf: (action: VocabAction) => string[]) =>
      [...new Set(vocab.actions.filter((a) => namesOf(a).some((name) => canon(name) === canon(text))).map((a) => a.words))];
    const found = DONE_NAMES.map(named).find((moves) => moves.length > 0) ?? [];
    if (found.length === 0) return unknownText(text);
    const anyone = new Set(vocab.actions.filter((a) => a.anyone).map((a) => a.words));
    const moves = found.filter((move) => !anyone.has(move));
    if (moves.length > 0) return { value: moves };
    return { error: `“${text}” names a button any player may press at any time, which is never part of a turn.` };
  },
};

// ---- the list ----------------------------------------------------------------------------------

/** Parameter types whose text depends on the game being compiled. */
export const VOCAB_TYPES: ParamType[] = [
  ZONE, ZONES, PERZONE, PLAYER, PHASE, MOVE, ATTRIBUTE, CARD, CARDLIST, CARDCLASS, SPACE, SPACECLASS, SPACEATTR, COUNTER, ACTION, TARGETACTION,
  AMOUNTACTION, DONE, SPACEKIND, SPACEFLAG, SPACENUMBER, CARDFLAG, PLAYERFLAG, PLAYERNUMBER, GAMENUMBER, BANKED,
];

const TYPES_BY_NAME = new Map(VOCAB_TYPES.map((t) => [t.name, t] as const));

/** Reads `text` as one instance of the named type; null when the type's pattern does not cover all of it. */
export function parseParam(type: string, text: string, vocab: Vocab): Parsed | null {
  const found = TYPES_BY_NAME.get(type);
  if (!found) throw new Error(`unknown parameter type {${type}}`);
  return fullMatch(found, text, vocab) ? found.resolve(text, vocab) : null;
}
