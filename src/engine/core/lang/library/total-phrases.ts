import { addToCounter, counterOf } from '../board-state';
import type { PhraseLibrary } from '../phrases';
import type { CardGroup, ConditionFn, EffectFn, ValueFn } from '../types';
import { payCounter, transfer } from './board-phrases';
import { theyOf, totalOf } from './support';

const totalIs: ConditionFn = (env, [attribute, group, n]) => totalOf(env, attribute as string, group as CardGroup) === n;

const haveAtLeastTheTotal: ConditionFn = (env, [attribute, group, counter]) =>
  counterOf(env.state, counter as string, theyOf(env)) >= totalOf(env, attribute as string, group as CardGroup);

/** The total goes to what they pay with, as “They pay the card's cost.” takes from it. */
const getTheTotal: EffectFn = (env, [attribute, group]) =>
  addToCounter(env.state, payCounter(env), theyOf(env), totalOf(env, attribute as string, group as CardGroup));

/** Paid to the bank, like any amount: a total that leaves them below 0 is owed to it. */
const payTheTotal: EffectFn = (env, [attribute, group]) => transfer(env, theyOf(env), null, totalOf(env, attribute as string, group as CardGroup));

/** The first {attribute} is the value its section works out, which the compiler checks; the line says what it comes to. */
const valueIsTheTotal: ValueFn = (env, [, attribute, group]) => totalOf(env, attribute as string, group as CardGroup);

/**
 * The sentences that add up a number over a group of cards (R6): the cards in some zones, maybe only those whose number is more than
 * some, the cards on “it”, or the picked cards. Each card's number is read as every phrase reads it, through the values worked out for
 * cards, and a card without it counts as 0, since a group may well hold cards of several kinds. What a group needs (a player for their zones, a card for “it”, a button that picks
 * some cards) the compiler asks of the group itself; a value's line is about the card it works the value out for, as every such line is.
 */
export function registerTotalPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('the total {attribute} of {cardgroup} is {int}', totalIs)
    .condition('they have at least the total {attribute} of {cardgroup} in {counter}', haveAtLeastTheTotal, { needsPlayer: true })
    .effect('they get the total {attribute} of {cardgroup}', getTheTotal, { needsPlayer: true, needsPayment: true })
    .effect('they pay the total {attribute} of {cardgroup}', payTheTotal, { needsPlayer: true, needsPayment: true })
    .value("a card's {attribute} is the total {attribute} of {cardgroup}", valueIsTheTotal, { needsCard: true });
}
