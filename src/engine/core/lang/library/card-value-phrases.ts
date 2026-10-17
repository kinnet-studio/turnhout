import type { PhraseLibrary } from '../phrases';
import type { CardMatch, ValueFn } from '../types';
import { matchesCard } from '../zones';
import { itCard } from './fact-phrases';
import { cardHasFlag, cardNumber } from './support';

// The first {attribute} of each line is the value its section works out; the compiler checks it names that one, so the lines here
// need only say what the value comes to.

/** A card of the kind has its other number. The number is read only for such a card, so another card need not have one. */
const kindHasIts: ValueFn = (env, [match, , other], value) => {
  const card = itCard(env);
  return matchesCard(card, match as CardMatch) ? cardNumber(env, card, other as string) : value;
};

const kindHas: ValueFn = (env, [match, , n], value) => (matchesCard(itCard(env), match as CardMatch) ? (n as number) : value);

/** The lines that turn a value on by a flag: the page shows such a flag, since it changes what a card makes or costs. */
export const FLAGGED_VALUES = ["a {cardflag} card's {attribute} is {int}", "an {cardflag} card's {attribute} is {int}"] as const;

/** A card that is so has the number; a flag worked out from lines is read like any other. */
const flaggedHas: ValueFn = (env, [flag, , n], value) => (cardHasFlag(env, itCard(env), flag as string) ? (n as number) : value);

/**
 * The lines of a section that works out a number for cards (R4): each says what a card of a kind, or a card that is so, has, and any
 * other card keeps what the lines before made of it. Every line is about the card the value is worked out for, so each needs a card.
 */
export function registerCardValuePhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .value("{cardclass}'s {attribute} is its {attribute}", kindHasIts, { needsCard: true })
    .value("{cardclass}'s {attribute} is {int}", kindHas, { needsCard: true })
    .value(FLAGGED_VALUES[0], flaggedHas, { needsCard: true })
    .value(FLAGGED_VALUES[1], flaggedHas, { needsCard: true });
}
