import { addToCounter, counterOf } from '../board-state';
import type { PhraseLibrary } from '../phrases';
import type { CardGroup, ConditionFn, EffectFn, ValueFn } from '../types';
import { payCounter, transfer } from './board-phrases';
import { theyOf, totalOf } from './support';
import { cardNumber, cardsIn, playerValueOf } from './support';
import { changeable, loseCount } from './card-number-phrases';

const totalIs: ConditionFn = (env, [attribute, group, n]) => totalOf(env, attribute as string, group as CardGroup) === n;

const haveAtLeastTheTotal: ConditionFn = (env, [attribute, group, counter]) =>
  counterOf(env.state, counter as string, theyOf(env)) >= totalOf(env, attribute as string, group as CardGroup);

/** The total goes to what they pay with, as “They pay the card's cost.” takes from it. */
const getTheTotal: EffectFn = (env, [attribute, group]) =>
  addToCounter(env.state, payCounter(env), theyOf(env), totalOf(env, attribute as string, group as CardGroup));

/** Paid to the bank, like any amount: a total that leaves them below 0 is owed to it. */
const payTheTotal: EffectFn = (env, [attribute, group]) => transfer(env, theyOf(env), null, totalOf(env, attribute as string, group as CardGroup));

/** The line of a value worked out for a card that adds up a group: the page shows it only when the group is the cards on it. */
export const FROM_CARDS_TOTAL = "a card's {attribute} is the total {attribute} of {cardgroup}";

/** The first {attribute} is the value its section works out, which the compiler checks; the line says what it comes to. */
const valueIsTheTotal: ValueFn = (env, [, attribute, group]) => totalOf(env, attribute as string, group as CardGroup);

/** The line of a value worked out for a card that adds a group's total to it: the page shows it as it shows `FROM_CARDS_TOTAL`. */
export const GOES_UP_BY_TOTAL = "a card's {attribute} goes up by the total {attribute} of {cardgroup}";

/** The value so far and the group's total. Nothing so far stays nothing, as there is nothing to add to. */
const goesUpByTheTotal: ValueFn = (env, [, attribute, group], value) =>
  (value === null ? null : value + totalOf(env, attribute as string, group as CardGroup));

/**
 * One amount shared among the cards of a group: as much as one of their values comes to, which the cards use up in the group's order.
 * Each loses what it has of the count, up to what is left, and the rest goes on to the next card; a card at 0 uses none of it. A count
 * that reaches 0 has its key removed, as “It loses its …” leaves it. Only a count the game keeps on cards can go down, even over no card.
 */
const loseBetweenThem: EffectFn = (env, [group, name, shared]) => {
  const count = changeable(env, name as string);
  let left = Math.max(0, playerValueOf(env, theyOf(env), shared as string));
  let state = env.state;
  for (const card of cardsIn(env, group as CardGroup)) {
    const used = Math.min(cardNumber(env, card, count), left);
    if (used <= 0) continue;
    state = loseCount(env, state, card, count, used);
    left -= used;
  }
  return state;
};

/**
 * The sentences that add up a number over a group of cards (R6): the cards in some zones, maybe only those whose number is more than
 * some, the cards on “it”, or the picked cards. Each card's number is read as every phrase reads it, through the values worked out for
 * cards, and a card without it counts as 0, since a group may well hold cards of several kinds. A value's line may be the total, or go up
 * by it. And one of their values shared among the cards of a group, each losing a count up to what is left of it. What a group needs (a
 * player for their zones, a card for “it”, a button that picks some cards) the compiler asks of the group itself; a value's line is about
 * the card it works the value out for, as every such line is.
 */
export function registerTotalPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('the total {attribute} of {cardgroup} is {int}', totalIs)
    .condition('they have at least the total {attribute} of {cardgroup} in {counter}', haveAtLeastTheTotal, { needsPlayer: true })
    .effect('they get the total {attribute} of {cardgroup}', getTheTotal, { needsPlayer: true, needsPayment: true })
    .effect('they pay the total {attribute} of {cardgroup}', payTheTotal, { needsPlayer: true, needsPayment: true })
    .effect('{cardgroup} lose {attribute} between them, up to their {playervalue}, first card first', loseBetweenThem, { needsPlayer: true, writes: 1 })
    .value(FROM_CARDS_TOTAL, valueIsTheTotal, { needsCard: true })
    .value(GOES_UP_BY_TOTAL, goesUpByTheTotal, { needsCard: true });
}
