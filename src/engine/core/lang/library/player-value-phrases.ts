import type { PhraseLibrary } from '../phrases';
import type { ConditionFn, ExpectFn, PhraseEnv } from '../types';
import { playerValueOf, seatOf, theyOf } from './support';
import { valueIsTheTotal } from './total-phrases';

/** What one of their values comes to, as the lines of its section work it out. */
const theirs = (env: PhraseEnv, name: string): number => playerValueOf(env, theyOf(env), name);

type Compare = (have: number, wanted: number) => boolean;
const IS: Compare = (have, wanted) => have === wanted;
const AT_LEAST: Compare = (have, wanted) => have >= wanted;
const MORE_THAN: Compare = (have, wanted) => have > wanted;

/** One of their values against another of theirs. */
const withTheir = (compare: Compare): ConditionFn => (env, [name, other]) => compare(theirs(env, name as string), theirs(env, other as string));
/** One of their values against a whole number. */
const withNumber = (compare: Compare): ConditionFn => (env, [name, n]) => compare(theirs(env, name as string), n as number);

/** An example's check of what one of a player's values comes to, as the lines of its section work it out on the table as it is. */
const valueIsExpected: ExpectFn = (env, [seat, name, n]) => {
  const who = seatOf(env, seat);
  const have = playerValueOf(env, who, name as string);
  return have === n ? true : `Expected ${who}'s ${name as string} to be ${n as number}, but it is ${have}.`;
};

/**
 * The line of a value about a player that adds up a group of cards: the view shows such a value only when each of its lines is this one,
 * over zones everyone can see, so a new line that works one out shows nothing until the view is taught what it reads.
 */
export const PLAYER_TOTAL = "a player's {playervalue} is the total {attribute} of {cardgroup}";
/** The condition a button may wait on, one of their values reaching another: the page gauges the two side by side. */
export const AT_LEAST_THEIRS = 'their {playervalue} is at least their {playervalue}';

/**
 * The sentences about a value the game works out for each player: the line of its section that adds up a number over a group of cards (each
 * card's number read as every phrase reads it, a card without it counting as 0), and the conditions that compare one of their values with
 * another of theirs or with a whole number. Every one is about a player, whose zones “their” names. And the Then line of an example that checks
 * what one of a player's values comes to.
 */
export function registerPlayerValuePhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .value(PLAYER_TOTAL, valueIsTheTotal, { needsPlayer: true })
    .condition(AT_LEAST_THEIRS, withTheir(AT_LEAST), { needsPlayer: true })
    .condition('their {playervalue} is more than their {playervalue}', withTheir(MORE_THAN), { needsPlayer: true })
    .condition('their {playervalue} is {int}', withNumber(IS), { needsPlayer: true })
    .condition('their {playervalue} is at least {int}', withNumber(AT_LEAST), { needsPlayer: true })
    .condition('their {playervalue} is more than {int}', withNumber(MORE_THAN), { needsPlayer: true })
    .expect("{player}'s {playervalue} is {int}", valueIsExpected);
}
