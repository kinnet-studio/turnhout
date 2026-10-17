// Which of the values a game works out for cards (R4) the page may show beside a card on a Board, read from the compiled game alone:
// a number that stands in for a column of a card table, and a flag that changes a value. A value is shown only when its lines, and the
// lines of every value they read, all the way down, read nothing but the card and the cards on it; and a line that reads the cards on a
// card counts only in a game where everyone sees every card that sits on a card. So a seat that sees a card sees all that its shown
// values read, however deep the cards on cards go, and whether a value is shown hangs on the rules alone, never on where cards are.
import { CARDS_ON_IT, FROM_COLUMN, registerCardSubjectPhrases } from './library/card-subject-phrases';
import { FLAGGED_VALUES, registerCardValuePhrases } from './library/card-value-phrases';
import { FROM_CARDS_TOTAL, GOES_UP_BY_TOTAL } from './library/total-phrases';
import { PhraseLibrary, STATIC_TYPES } from './phrases';
import { VOCAB_TYPES } from './refs';
import type { CardFilter, CardGroup, CompiledGame, PhraseRef } from './types';

/**
 * The phrases about the card a value is worked out for and the cards on it: what kind of card it is, its own numbers and flags, its zone
 * and the flags of the cards on it. Asked by kind and pattern, as a line's ref names its phrase.
 */
const CARD_ONLY = registerCardValuePhrases(registerCardSubjectPhrases(new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES])));
const PARAM = /\{([^{}]+)\}/g;

const isWorked = (game: CompiledGame, name: string): boolean => game.worked !== undefined && Object.hasOwn(game.worked, name);
/**
 * Whether everyone sees every card that sits on a card: only a zone marked for cards on cards may hold one, whether every card in it sits
 * on a card or only some do, so it is so when each such zone is public. Then the cards on a card are seen wherever the card is, and the
 * cards on those too.
 */
const cardsOnCardsArePublic = (game: CompiledGame): boolean => game.zones.every((zone) => zone.onCards === undefined || zone.visibility === 'public');
const cardsOnIt: readonly string[] = CARDS_ON_IT;

/** The names a test reads a card by: the flag of a flag test, else the number or value it tests and the one it compares that with. */
const testNames = (filter: CardFilter): string[] =>
  ('flag' in filter ? [filter.flag] : [filter.attribute, ...('sameAs' in filter ? [filter.sameAs.attribute] : [])]);

/**
 * The names a line reads a card's numbers and flags by, each of which may be a value worked out in turn, when the line reads only the card
 * and the cards on it; null for any other line, and for a line that reads the cards on it in a game that hides some card on a card. A
 * phrase's args follow its parameters in order. The tests of a group of the cards on it, and of a clause, are read too: a flag a group is
 * tested by (“the cards on it that are hoarded”) may read beyond the card as surely as a line of the value does.
 */
function cardOnlyNames(game: CompiledGame, ref: PhraseRef): string[] | null {
  // A value that is a total, or goes up by one, reads only the card when its group is the cards on it.
  const total = ref.kind === 'value' && (ref.phrase === FROM_CARDS_TOTAL || ref.phrase === GOES_UP_BY_TOTAL);
  if (!total && (ref.kind === 'lang' || CARD_ONLY.get(ref.kind, ref.phrase) === undefined)) return null;
  if ((total || cardsOnIt.includes(ref.phrase)) && !cardsOnCardsArePublic(game)) return null;
  const names: string[] = [];
  for (const [i, [, type]] of [...ref.phrase.matchAll(PARAM)].entries()) {
    if (type === 'attribute' || type === 'cardflag') names.push(ref.args[i] as string);
    // No card-only phrase takes a clause yet; one that does has its tests traced like a group's.
    if (type === 'cardclause') names.push(...(ref.args[i] as CardFilter[]).flatMap(testNames));
    if (type !== 'cardgroup') continue;
    const group = ref.args[i] as CardGroup;
    if (group.kind !== 'on it') return null;
    names.push(...(group.whose ?? []).flatMap(testNames));
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
    const names = cardOnlyNames(game, ref);
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
