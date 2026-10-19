import { cardsOn } from '../attach';
import type { PhraseLibrary } from '../phrases';
import type { CardMatch, ConditionFn, ValueFn } from '../types';
import { matchesCard, zoneInfo } from '../zones';
import { itCard } from './fact-phrases';
import { cardHasFlag, cardNumber } from './support';
import type { CardFilter } from '../types';
import { passes } from './support';

// ---- conditions ------------------------------------------------------------------------------

const itIsOfKind = (wanted: boolean): ConditionFn => (env, [match]) => matchesCard(itCard(env), match as CardMatch) === wanted;

/** A flag read as every phrase reads one, so a flag worked out from lines is not so when its lines say it is not. */
const itIsNotFlagged: ConditionFn = (env, [flag]) => !cardHasFlag(env, itCard(env), flag as string);

/** A card without the number is the rule's mistake, as in every rule about the numbers of the one card it is about. */
const itsNumberIs: ConditionFn = (env, [name, n]) => cardNumber(env, itCard(env), name as string) === n;

/**
 * A test of any column or value, read as every phrase reads one (see `passes`), so a value worked out for cards counts as it comes to: a
 * card without the value does not pass, and so is “not a card whose …”.
 */
const itIsACardWhose = (wanted: boolean): ConditionFn => (env, [filter]) => passes(env, itCard(env), [filter as CardFilter]) === wanted;

/** In that zone of any player's: a rule about a card asks what kind of place it is in, whoever's it is. */
const itIsIn: ConditionFn = (env, [zone]) => {
  const info = zoneInfo(env.game, itCard(env).zoneId);
  return info !== null && info.seat !== null && info.spec.name === zone;
};

/** The lines that read the cards on it: the page shows a value read through them only where everyone sees every card on a card. */
export const CARDS_ON_IT = ['some card on it is {cardflag}', 'no card on it is {cardflag}'] as const;

/** Each card on it is read as every phrase reads a flag, so a flag worked out for those cards may be worked out from another. */
const someCardOnItIs = (wanted: boolean): ConditionFn => (env, [flag]) =>
  cardsOn(env.state, itCard(env).id).some((card) => cardHasFlag(env, card, flag as string)) === wanted;

// ---- values ----------------------------------------------------------------------------------

/** The line a number worked out from one of the card's own numbers starts with: the page shows such a number in place of that column. */
export const FROM_COLUMN = "a card's {attribute} is its {attribute}";

// The first {attribute} of each line is the value its section works out; the compiler checks it names that one, so the lines here
// need only say what the value comes to.

/** Any card has its other number. A card without it says so as `cardNumber` does, which a worked value takes as a line not about it. */
const isIts: ValueFn = (env, [, other]) => cardNumber(env, itCard(env), other as string);

/**
 * The value so far less the other number. Nothing so far stays nothing, as there is nothing to take from. There is no floor at 0:
 * a floor would hide a cut larger than what it cuts, which is the rule's to say, not the language's.
 */
const goesDownByIts: ValueFn = (env, [, other], value) => (value === null ? null : value - cardNumber(env, itCard(env), other as string));

/**
 * The value so far, raised to the whole number when it is less: a floor, which the rule says where it wants one, since a line that takes a
 * value down has none. Nothing so far stays nothing, as there is nothing to raise.
 */
const isAtLeast: ValueFn = (_env, [, n], value) => (value === null ? null : Math.max(value, n as number));

/**
 * The sentences about the card a rule is about: what kind of card it is, a flag it does not have, a number it has (a count reads plural:
 * “its cracks are 0”), the zone it is in (that zone of any player's), and whether some card, or no card, on it is so. Then three lines of
 * a value worked out for cards: any card's is one of its numbers, it goes down by another, and it is at least a whole number. Then whether
 * it passes, or fails, a test of any column or value. Every one reads “it”, so each needs a card: a face-down view and a hidden pick are
 * judged by that.
 */
export function registerCardSubjectPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('it is {cardclass}', itIsOfKind(true), { needsCard: true })
    .condition('it is not {cardclass}', itIsOfKind(false), { needsCard: true })
    .condition('it is not {cardflag}', itIsNotFlagged, { needsCard: true })
    .condition('its {attribute} is {int}', itsNumberIs, { needsCard: true })
    .condition('its {attribute} are {int}', itsNumberIs, { needsCard: true })
    .condition('it is in a {perzone}', itIsIn, { needsCard: true })
    .condition('it is in an {perzone}', itIsIn, { needsCard: true })
    .condition(CARDS_ON_IT[0], someCardOnItIs(true), { needsCard: true })
    .condition(CARDS_ON_IT[1], someCardOnItIs(false), { needsCard: true })
    .value(FROM_COLUMN, isIts, { needsCard: true })
    .value("a card's {attribute} goes down by its {attribute}", goesDownByIts, { needsCard: true })
    .value("a card's {attribute} is at least {int}", isAtLeast, { needsCard: true })
    .condition('it is a card whose {cardfilter}', itIsACardWhose(true), { needsCard: true })
    .condition('it is not a card whose {cardfilter}', itIsACardWhose(false), { needsCard: true });
}
