// Which of the values a game works out for cards (R4) the page may show beside a card on a Board, read from the compiled game alone:
// a number that stands in for a column of a card table, and a flag that changes a value. A value is shown only when its lines read the
// card and the cards on it and nothing else, all the way down, so that whatever it says a seat that sees the card sees too.
import { FROM_COLUMN, registerCardSubjectPhrases } from './library/card-subject-phrases';
import { FLAGGED_VALUES, registerCardValuePhrases } from './library/card-value-phrases';
import { PhraseLibrary, STATIC_TYPES } from './phrases';
import { VOCAB_TYPES } from './refs';
import type { CardGroup, CompiledGame, PhraseRef } from './types';

/**
 * The phrases about the card a value is worked out for and the cards on it: what kind of card it is, its own numbers and flags, its zone
 * and the flags of the cards on it. Asked by kind and pattern, as a line's ref names its phrase.
 */
const CARD_ONLY = registerCardValuePhrases(registerCardSubjectPhrases(new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES])));
/** `total-phrases.ts`'s line about one card: it reads only the card and the cards on it when its group is the cards on it. */
const TOTAL_OF = "a card's {attribute} is the total {attribute} of {cardgroup}";
const PARAM = /\{([^{}]+)\}/g;

const isWorked = (game: CompiledGame, name: string): boolean => game.worked !== undefined && Object.hasOwn(game.worked, name);

/**
 * The names a line reads a card's numbers and flags by, each of which may be a value worked out in turn, when the line reads only the card
 * and the cards on it; null for any other line. A phrase's args follow its parameters in order.
 */
function cardOnlyNames(ref: PhraseRef): string[] | null {
  const total = ref.kind === 'value' && ref.phrase === TOTAL_OF;
  if (!total && (ref.kind === 'lang' || CARD_ONLY.get(ref.kind, ref.phrase) === undefined)) return null;
  const names: string[] = [];
  for (const [i, [, type]] of [...ref.phrase.matchAll(PARAM)].entries()) {
    if (type === 'attribute' || type === 'cardflag') names.push(ref.args[i] as string);
    if (type !== 'cardgroup') continue;
    const group = ref.args[i] as CardGroup;
    if (group.kind !== 'on it') return null;
    for (const filter of group.whose ?? []) names.push(filter.attribute, ...('sameAs' in filter ? [filter.sameAs.attribute] : []));
  }
  return names;
}

/**
 * Whether every line of the value `name` reads only the card and the cards on it, and so does every line of each value they read, all the
 * way down. `seen` holds the values looked at already: one met again is being looked at, and adds no line of its own.
 */
function readsOnlyCards(game: CompiledGame, name: string, seen = new Set<string>()): boolean {
  if (seen.has(name)) return true;
  seen.add(name);
  const value = game.worked![name];
  const refs = value.kind === 'number' ? value.refs : value.conditions.flatMap((group) => group.refs);
  return refs.every((ref) => {
    const names = cardOnlyNames(ref);
    return names !== null && names.filter((read) => isWorked(game, read)).every((read) => readsOnlyCards(game, read, seen));
  });
}

/**
 * Each column that a worked number's section starts from (its first line is `A card's red left is its red need.`), mapped to that number's
 * name: the page reads a count against it in place of the column. Of several such numbers for one column, the first in section order wins.
 * A number whose lines read anything but the card and the cards on it stands in for nothing.
 */
export function standIns(game: CompiledGame): { [column: string]: string } {
  const found: { [column: string]: string } = {};
  for (const [name, value] of Object.entries(game.worked ?? {})) {
    const first = value.kind === 'number' ? value.refs[0] : undefined;
    if (first?.phrase !== FROM_COLUMN) continue;
    const column = first.args[1] as string;
    if (!Object.hasOwn(found, column) && readsOnlyCards(game, name)) found[column] = name;
  }
  return found;
}

/**
 * The worked flags a line of some worked number turns a value on by (`A busy card's red pay is 1.`), in the order the game works them
 * out, each once: they change what a card makes or costs. A flag cards keep is never one, since the page shows those already, and nor is
 * one whose lines read anything but the card and the cards on it.
 */
export function shownFlags(game: CompiledGame): string[] {
  const worked = game.worked ?? {};
  const flagged: readonly string[] = FLAGGED_VALUES;
  const turnedOn = new Set(
    Object.values(worked).flatMap((value) => (value.kind === 'number' ? value.refs : []))
      .filter((ref) => flagged.includes(ref.phrase)).map((ref) => ref.args[0] as string),
  );
  return Object.entries(worked).filter(([name, value]) => value.kind === 'flag' && turnedOn.has(name) && readsOnlyCards(game, name))
    .map(([name]) => name);
}
