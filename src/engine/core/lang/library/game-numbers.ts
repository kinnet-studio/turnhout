import { gameNumber, setGameNumber } from '../board-state';
import type { PhraseLibrary } from '../phrases';
import type { DeclareFn, EffectFn, ExpectFn } from '../types';
import { transfer } from './board-phrases';
import { theyOf } from './support';

/** A number of the game, and the value it starts at: it belongs to no player and no space. */
const declaresNumber: DeclareFn = ([name, start]) => [{ name: name as string, on: 'game', kind: 'number', start: start as number }];

// ---- effects ---------------------------------------------------------------------------------

const numberIs: EffectFn = (env, [name, n]) => setGameNumber(env.state, name as string, n as number);

/** Paid to the bank from the counter players pay with, so that a payment that takes them below 0 notes the debt as any other does. */
const theyPayNumber: EffectFn = (env, [name]) => transfer(env, theyOf(env), null, gameNumber(env.state, env.game, name as string));

// ---- examples: expect --------------------------------------------------------------------------

const numberIsExpected: ExpectFn = (env, [name, n]) => {
  const have = gameNumber(env.state, env.game, name as string);
  return have === n ? true : `Expected the ${name} to be ${n}, but it is ${have}.`;
};

/**
 * The sentences about numbers that belong to the game as a whole, which a game declares under Board: with “The game has a … of …”
 * (or “an”), saying where each starts. Then the sentences a rule uses to set one and to have a player pay it, and the Given and Then
 * lines that set and check it in an example.
 */
export function registerGameNumberPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .declare('the game has a {name} of {int}', declaresNumber)
    .declare('the game has an {name} of {int}', declaresNumber)
    .effect('the {gamenumber} is {int}', numberIs)
    .effect('they pay the {gamenumber}', theyPayNumber, { needsPlayer: true, needsPayment: true })
    .given('the {gamenumber} is {int}', numberIs)
    .expect('the {gamenumber} is {int}', numberIsExpected);
}
