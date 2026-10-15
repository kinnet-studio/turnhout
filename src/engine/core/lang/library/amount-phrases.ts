import { counterOf, gameNumber, setGameNumber } from '../board-state';
import type { PhraseLibrary } from '../phrases';
import type { ActionFn, ConditionFn, EffectFn } from '../types';
import { seatOf, theAmount, theyOf } from './support';

// ---- conditions and effects: the amount a button's press carries ---------------------------------

const amountIsMoreThan: ConditionFn = (env, [name]) => theAmount(env) > gameNumber(env.state, env.game, name as string);

const theyHaveTheAmount: ConditionFn = (env, [counter]) => counterOf(env.state, counter as string, theyOf(env)) >= theAmount(env);

const numberIsTheAmount: EffectFn = (env, [name]) => setGameNumber(env.state, name as string, theAmount(env));

// ---- examples: action --------------------------------------------------------------------------

/**
 * A player presses a button that carries an amount and says how much: the move type is the button's whole wording. The number
 * is sent as written, a negative one too, since it is the move that refuses what is not an amount.
 */
const pressesButtonWith: ActionFn = (env, [seat, move, amount]) => ({ by: seatOf(env, seat), move: { type: move as string, amount: amount as number } });

/**
 * The sentences that read the amount a button carries, “A player may raise an amount.”: the conditions that compare it, the effect
 * that keeps it, and the line of an example that presses the button with a number.
 */
export function registerAmountPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('the amount is more than the {gamenumber}', amountIsMoreThan, { needsAmount: true })
    .condition('they have at least the amount in {counter}', theyHaveTheAmount, { needsPlayer: true, needsAmount: true })
    .effect('the {gamenumber} is the amount', numberIsTheAmount, { needsAmount: true })
    .action('{player} {amountaction} {int}', pressesButtonWith);
}
