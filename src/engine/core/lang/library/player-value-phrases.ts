import type { PhraseLibrary } from '../phrases';
import type { CardGroup, ConditionFn, PhraseEnv, ValueFn } from '../types';
import { playerValueOf, theyOf, totalOf } from './support';

/** The first {playervalue} is the value its section works out, which the compiler checks; the line says what it comes to. */
const valueIsTheTotal: ValueFn = (env, [, attribute, group]) => totalOf(env, attribute as string, group as CardGroup);

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

/**
 * The sentences about a value the game works out for each player: the line of its section that adds up a number over a group of cards (each
 * card's number read as every phrase reads it, a card without it counting as 0), and the conditions that compare one of their values with
 * another of theirs or with a whole number. Every one is about a player, whose zones “their” names.
 */
export function registerPlayerValuePhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .value("a player's {playervalue} is the total {attribute} of {cardgroup}", valueIsTheTotal, { needsPlayer: true })
    .condition('their {playervalue} is at least their {playervalue}', withTheir(AT_LEAST), { needsPlayer: true })
    .condition('their {playervalue} is more than their {playervalue}', withTheir(MORE_THAN), { needsPlayer: true })
    .condition('their {playervalue} is {int}', withNumber(IS), { needsPlayer: true })
    .condition('their {playervalue} is at least {int}', withNumber(AT_LEAST), { needsPlayer: true })
    .condition('their {playervalue} is more than {int}', withNumber(MORE_THAN), { needsPlayer: true });
}
