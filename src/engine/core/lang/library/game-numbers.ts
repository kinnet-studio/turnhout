import { counterOf, gameNumber, holderOf, setGameNumber } from '../board-state';
import type { PhraseLibrary } from '../phrases';
import type { ConditionFn, DeclareFn, EffectFn, ExpectFn } from '../types';
import { transfer } from './board-phrases';
import { theyOf } from './support';

/** A number of the game, and the value it starts at: it belongs to no player and no space. */
const declaresNumber: DeclareFn = ([name, start]) => [{ name: name as string, on: 'game', kind: 'number', start: start as number }];

// ---- conditions ------------------------------------------------------------------------------

const numberIsMoreThan: ConditionFn = (env, [name, n]) => gameNumber(env.state, env.game, name as string) > (n as number);

const theyHaveTheNumber: ConditionFn = (env, [name, counter]) =>
  counterOf(env.state, counter as string, theyOf(env)) >= gameNumber(env.state, env.game, name as string);

// ---- effects ---------------------------------------------------------------------------------

const numberIs: EffectFn = (env, [name, n]) => setGameNumber(env.state, name as string, n as number);

/** Paid to the bank from the counter players pay with, so that a payment that takes them below 0 notes the debt as any other does. */
const theyPayNumber: EffectFn = (env, [name]) => transfer(env, theyOf(env), null, gameNumber(env.state, env.game, name as string));

/** Paid to the player who holds the flag, so that a payment that takes them below 0 notes that player as whom they owe. */
const theyPayNumberTo: EffectFn = (env, [name, flag]) =>
  transfer(env, theyOf(env), holderOf(env.state, env.seats, flag as string), gameNumber(env.state, env.game, name as string));

// ---- examples: expect --------------------------------------------------------------------------

const numberIsExpected: ExpectFn = (env, [name, n]) => {
  const have = gameNumber(env.state, env.game, name as string);
  return have === n ? true : `Expected the ${name} to be ${n}, but it is ${have}.`;
};

/**
 * The sentences about numbers that belong to the game as a whole, which a game declares under Board: with “The game has a … of …”
 * (or “an”), saying where each starts. Then the sentences a rule uses to compare one with a number or with what a player has, to
 * set one and to have a player pay it, to the bank or to the player who holds a flag, and the Given and Then lines that set and
 * check it in an example.
 */
export function registerGameNumberPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .declare('the game has a {name} of {int}', declaresNumber)
    .declare('the game has an {name} of {int}', declaresNumber)
    .condition('the {gamenumber} is more than {int}', numberIsMoreThan)
    .condition('they have at least the {gamenumber} in {counter}', theyHaveTheNumber, { needsPlayer: true })
    .effect('the {gamenumber} is {int}', numberIs)
    .effect('they pay the {gamenumber}', theyPayNumber, { needsPlayer: true, needsPayment: true })
    .effect('they pay the {gamenumber} to {holder}', theyPayNumberTo, { needsPlayer: true, needsPayment: true })
    .given('the {gamenumber} is {int}', numberIs)
    .expect('the {gamenumber} is {int}', numberIsExpected);
}
