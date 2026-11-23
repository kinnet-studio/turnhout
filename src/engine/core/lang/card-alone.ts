// Which of the values a game works out for cards read nothing but the card they are worked out for: its own numbers, counts and flags,
// what kind of card it is and the kind of zone it is in, and other such values of the same card, all the way down. Such a value comes to
// the same for one card object in every state that holds it, since a card is never changed once made (a change makes a new card), so
// the runtime may keep what it worked out for that object (see `LangRuntime.workedValue`). Whether a value is one hangs on the rules
// alone, read from the compiled game, as worked-view's `readsOnlyCards` reads them; but a line that reads the cards on it, or the card
// it sits on, reads other cards, which change while this one stays as it is, so no such line counts here.
import { registerCardNumberPhrases } from './library/card-number-phrases';
import { CARDS_ON_IT, registerCardSubjectPhrases } from './library/card-subject-phrases';
import { registerCardValuePhrases } from './library/card-value-phrases';
import { IT_IS_FLAGGED } from './library/fact-phrases';
import { PhraseLibrary, STATIC_TYPES } from './phrases';
import { VOCAB_TYPES } from './refs';
import type { CardFilter, CompiledGame, PhraseRef } from './types';

/**
 * The phrases about the card a value is worked out for: its kind, numbers, flags and zone, and how its numbers compare. Two of them read
 * the cards on it (`CARDS_ON_IT`), which don't count; and of the card-number phrases only the conditions and values do, not the effects.
 */
const ABOUT_THE_CARD = registerCardNumberPhrases(registerCardValuePhrases(registerCardSubjectPhrases(
  new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES]),
)));
const PARAM = /\{([^{}]+)\}/g;
const cardsOnIt: readonly string[] = CARDS_ON_IT;
/** The kinds of argument a line about the card alone may take: names it reads the card by, a kind of card or zone, a whole number, a test. */
const OF_THE_CARD = new Set(['attribute', 'cardflag', 'cardclass', 'perzone', 'int', 'cardfilter']);

/** The names a test reads the card by; null for a test against “the card” a press moves, which is another card. */
export const testedBy = (filter: CardFilter): string[] | null => {
  if ('flag' in filter) return [filter.flag];
  if ('sameAs' in filter) return filter.sameAs.of === 'it' ? [filter.attribute, filter.sameAs.attribute] : null;
  // Only a test of a number against a number or a value reads the card alone; a kind of test added later is not trusted until looked at.
  return 'above' in filter || 'is' in filter ? [filter.attribute] : null;
};

/** The names a line reads the card by, when it reads nothing but the card; null for any other line. */
function namesRead(ref: PhraseRef): string[] | null {
  if (ref.kind !== 'condition' && ref.kind !== 'value') return null;
  const flagged = ref.kind === 'condition' && ref.phrase === IT_IS_FLAGGED;
  if (!flagged && (ABOUT_THE_CARD.get(ref.kind, ref.phrase) === undefined || cardsOnIt.includes(ref.phrase))) return null;
  const names: string[] = [];
  for (const [i, [, type]] of [...ref.phrase.matchAll(PARAM)].entries()) {
    if (!OF_THE_CARD.has(type)) return null;
    if (type === 'attribute' || type === 'cardflag') names.push(ref.args[i] as string);
    if (type !== 'cardfilter') continue;
    const tested = testedBy(ref.args[i] as CardFilter);
    if (tested === null) return null;
    names.push(...tested);
  }
  return names;
}

const isWorked = (game: CompiledGame, name: string): boolean => game.worked !== undefined && Object.hasOwn(game.worked, name);

/**
 * Whether every line of the value `name` reads only the card, and so does every line of each value they read, all the way down. `seen`
 * holds the values looked at already: one met again is being looked at, and adds no line of its own.
 */
function readsTheCardAlone(game: CompiledGame, name: string, seen: Set<string>): boolean {
  if (seen.has(name)) return true;
  seen.add(name);
  const value = game.worked![name];
  const refs = value.kind === 'number' ? value.refs : value.conditions.flatMap((group) => group.refs);
  return refs.every((ref) => {
    const names = namesRead(ref);
    return names !== null && names.filter((read) => isWorked(game, read)).every((read) => readsTheCardAlone(game, read, seen));
  });
}

const known = new WeakMap<CompiledGame, ReadonlySet<string>>();

/** The values `game` works out for cards that read nothing but the card, worked out once for each compiled game. */
export function cardAloneValues(game: CompiledGame): ReadonlySet<string> {
  let names = known.get(game);
  if (names === undefined) {
    names = new Set(Object.keys(game.worked ?? {}).filter((name) => readsTheCardAlone(game, name, new Set())));
    known.set(game, names);
  }
  return names;
}
