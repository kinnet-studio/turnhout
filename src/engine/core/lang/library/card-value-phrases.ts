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

/**
 * The lines that turn a value on by a flag: to a whole number or to another of the card's numbers, or up or down by a whole number, or up
 * by another of its numbers. The page shows such a flag, since it changes what a card makes or costs. Each line's first argument is the
 * flag.
 */
export const FLAGGED_VALUES = [
  "a {cardflag} card's {attribute} is {int}", "an {cardflag} card's {attribute} is {int}",
  "a {cardflag} card's {attribute} is its {attribute}", "an {cardflag} card's {attribute} is its {attribute}",
  "a {cardflag} card's {attribute} goes up by {int}", "an {cardflag} card's {attribute} goes up by {int}",
  "a {cardflag} card's {attribute} goes down by {int}", "an {cardflag} card's {attribute} goes down by {int}",
  "a {cardflag} card's {attribute} goes up by its {attribute}", "an {cardflag} card's {attribute} goes up by its {attribute}",
] as const;

/** A card that is so has the number; a flag worked out from lines is read like any other. */
const flaggedHas: ValueFn = (env, [flag, , n], value) => (cardHasFlag(env, itCard(env), flag as string) ? (n as number) : value);

/** A card that is so has its other number, read only for such a card, so another card need not have one. */
const flaggedHasIts: ValueFn = (env, [flag, , other], value) => {
  const card = itCard(env);
  return cardHasFlag(env, card, flag as string) ? cardNumber(env, card, other as string) : value;
};

/**
 * A card that is so gets the whole number more (`sign` 1) or less (`sign` -1), with no floor: a rule that wants one says so, as
 * `… is at least …` does. Nothing so far stays nothing, as there is nothing to change, and any other card keeps what the lines before made
 * of it.
 */
const flaggedGoesBy = (sign: 1 | -1): ValueFn => (env, [flag, , n], value) =>
  (value !== null && cardHasFlag(env, itCard(env), flag as string) ? value + sign * (n as number) : value);

/**
 * A card that is so gets its other number more, read only for such a card, so another card need not have one. Nothing so far stays
 * nothing; a card that is so without the number says so as `cardNumber` does, which a worked value takes as a line not about it.
 */
const flaggedGoesUpByIts: ValueFn = (env, [flag, , other], value) => {
  if (value === null) return null;
  const card = itCard(env);
  return cardHasFlag(env, card, flag as string) ? value + cardNumber(env, card, other as string) : value;
};

/**
 * The lines of a section that works out a number for cards (R4): each says what a card of a kind, or a card that is so, has (a whole
 * number, or another of its numbers), or how a card that is so changes what the lines before made of it (up or down by a whole number, or
 * up by another of its numbers), and any other card keeps what the lines before made of it. Every line is about the card the value is
 * worked out for, so each needs a card.
 */
export function registerCardValuePhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .value("{cardclass}'s {attribute} is its {attribute}", kindHasIts, { needsCard: true })
    .value("{cardclass}'s {attribute} is {int}", kindHas, { needsCard: true })
    .value(FLAGGED_VALUES[0], flaggedHas, { needsCard: true })
    .value(FLAGGED_VALUES[1], flaggedHas, { needsCard: true })
    .value(FLAGGED_VALUES[2], flaggedHasIts, { needsCard: true })
    .value(FLAGGED_VALUES[3], flaggedHasIts, { needsCard: true })
    .value(FLAGGED_VALUES[4], flaggedGoesBy(1), { needsCard: true })
    .value(FLAGGED_VALUES[5], flaggedGoesBy(1), { needsCard: true })
    .value(FLAGGED_VALUES[6], flaggedGoesBy(-1), { needsCard: true })
    .value(FLAGGED_VALUES[7], flaggedGoesBy(-1), { needsCard: true })
    .value(FLAGGED_VALUES[8], flaggedGoesUpByIts, { needsCard: true })
    .value(FLAGGED_VALUES[9], flaggedGoesUpByIts, { needsCard: true });
}
