import { cardsOn } from '../attach';
import type { PhraseLibrary } from '../phrases';
import type { CardMatch, ConditionFn, ValueFn } from '../types';
import { matchesCard, zoneInfo } from '../zones';
import { itCard } from './fact-phrases';
import { cardHasFlag, cardNumber } from './support';

// ---- conditions ------------------------------------------------------------------------------

const itIsOfKind = (wanted: boolean): ConditionFn => (env, [match]) => matchesCard(itCard(env), match as CardMatch) === wanted;

/** A flag read as every phrase reads one, so a flag worked out from lines is not so when its lines say it is not. */
const itIsNotFlagged: ConditionFn = (env, [flag]) => !cardHasFlag(env, itCard(env), flag as string);

/** A card without the number is the rule's mistake, as in every rule about the numbers of the one card it is about. */
const itsNumberIs: ConditionFn = (env, [name, n]) => cardNumber(env, itCard(env), name as string) === n;

/** In that zone of any player's: a rule about a card asks what kind of place it is in, whoever's it is. */
const itIsIn: ConditionFn = (env, [zone]) => {
  const info = zoneInfo(env.game, itCard(env).zoneId);
  return info !== null && info.seat !== null && info.spec.name === zone;
};

/** Each card on it is read as every phrase reads a flag, so a flag worked out for those cards may be worked out from another. */
const someCardOnItIs = (wanted: boolean): ConditionFn => (env, [flag]) =>
  cardsOn(env.state, itCard(env).id).some((card) => cardHasFlag(env, card, flag as string)) === wanted;

// ---- values ----------------------------------------------------------------------------------

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
 * The sentences about the card a rule is about: what kind of card it is, a flag it does not have, a number it has, the zone it is in
 * (that zone of any player's), and whether some card, or no card, on it is so. Then two lines of a value worked out for cards: any
 * card's is one of its numbers, and it goes down by another. Every one reads “it”, so each needs a card: a face-down view and a hidden
 * pick are judged by that.
 */
export function registerCardSubjectPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('it is {cardclass}', itIsOfKind(true), { needsCard: true })
    .condition('it is not {cardclass}', itIsOfKind(false), { needsCard: true })
    .condition('it is not {cardflag}', itIsNotFlagged, { needsCard: true })
    .condition('its {attribute} is {int}', itsNumberIs, { needsCard: true })
    .condition('it is in a {perzone}', itIsIn, { needsCard: true })
    .condition('it is in an {perzone}', itIsIn, { needsCard: true })
    .condition('some card on it is {cardflag}', someCardOnItIs(true), { needsCard: true })
    .condition('no card on it is {cardflag}', someCardOnItIs(false), { needsCard: true })
    .value("a card's {attribute} is its {attribute}", isIts, { needsCard: true })
    .value("a card's {attribute} goes down by its {attribute}", goesDownByIts, { needsCard: true });
}
