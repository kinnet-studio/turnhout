import type { GameState } from '../../game-state';
import type { CardState } from '../../scene';
import { changeCard, isCardCount } from '../card-facts';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import type { ConditionFn, EffectFn, PhraseEnv } from '../types';
import { itCard } from './fact-phrases';
import { cardNumber, mustBeKept } from './support';

/**
 * The count a rule changes on the card it is about. Only a count the game declares on cards can change, since a column of a card's table
 * is part of what the card is, so naming any other number is a mistake in the rule. A value worked out from lines is said to be one
 * first, though it may be named after a column: that is what the designer can do something about.
 */
export function changeable(env: PhraseEnv, name: string): string {
  mustBeKept(env, name);
  if (!isCardCount(env.game, name)) {
    throw new RuleError(`Only a number the game keeps on cards can change, like “Cards can have charges.”; ${name} isn't one.`);
  }
  return name;
}

/** A count that goes back to 0 has its key removed, as a count never changed does, so that the face shows nothing. */
const itLoses: EffectFn = (env, [name]) => changeCard(env.state, itCard(env).id, { [changeable(env, name as string)]: null }, env.game);

/**
 * The card with `lost` taken off a count `changeable` let through: never below 0, and at 0 with its key removed, as “It loses its …”
 * leaves it. The count is read off `card`, as the rule found it.
 */
export function loseCount(env: PhraseEnv, state: GameState, card: CardState, count: string, lost: number): GameState {
  const left = Math.max(0, cardNumber(env, card, count) - lost);
  return changeCard(state, card.id, { [count]: left === 0 ? null : left }, env.game);
}

/** The count less the other number, as `loseCount` takes it off: never below 0, and with no key at 0. */
const itsGoDown: EffectFn = (env, [name, by]) => {
  const card = itCard(env);
  return loseCount(env, env.state, card, changeable(env, name as string), cardNumber(env, card, by as string));
};

/** The count gains the second number, up to the cap when there is one. A count already past the cap is never lowered. */
function goUp(env: PhraseEnv, name: string, by: string, cap?: string): GameState {
  const card = itCard(env);
  const count = changeable(env, name);
  const have = cardNumber(env, card, count);
  const gained = have + cardNumber(env, card, by);
  const next = cap === undefined ? gained : Math.max(have, Math.min(gained, cardNumber(env, card, cap)));
  return changeCard(env.state, card.id, { [count]: next }, env.game);
}

const itsGoUp: EffectFn = (env, [name, by]) => goUp(env, name as string, by as string);

const itsGoUpToCap: EffectFn = (env, [name, by, cap]) => goUp(env, name as string, by as string, cap as string);

/** A flag a card is not is a flag it never had, as “No card is …” leaves it. A flag worked out from lines is never set. */
const itIs = (wanted: boolean): EffectFn => (env, [flag]) => {
  mustBeKept(env, flag as string);
  return changeCard(env.state, itCard(env).id, { [flag as string]: wanted ? true : null }, env.game);
};

const atLeast: ConditionFn = (env, [name, other]) => {
  const card = itCard(env);
  return cardNumber(env, card, name as string) >= cardNumber(env, card, other as string);
};

const moreThan: ConditionFn = (env, [name, n]) => cardNumber(env, itCard(env), name as string) > (n as number);

/**
 * The sentences about the numbers on the card a rule is about. A count reads plural (“its red done are at least its red need”) and a
 * column of the card's table singular (“its pay is more than 1”), so each comparison reads both ways, as “go up” and “goes up” do, and
 * “go down” and “goes down”. Every one is about “it”, so each needs a card.
 */
export function registerCardNumberPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .effect('it loses its {attribute}', itLoses, { needsCard: true, writes: 0 })
    .effect('its {attribute} go up by its {attribute}', itsGoUp, { needsCard: true, writes: 0 })
    .effect('its {attribute} goes up by its {attribute}', itsGoUp, { needsCard: true, writes: 0 })
    .effect('its {attribute} go up by its {attribute}, up to its {attribute}', itsGoUpToCap, { needsCard: true, writes: 0 })
    .effect('its {attribute} goes up by its {attribute}, up to its {attribute}', itsGoUpToCap, { needsCard: true, writes: 0 })
    .effect('its {attribute} go down by its {attribute}', itsGoDown, { needsCard: true, writes: 0 })
    .effect('its {attribute} goes down by its {attribute}', itsGoDown, { needsCard: true, writes: 0 })
    .effect('it is {cardflag}', itIs(true), { needsCard: true, writes: 0 })
    .effect('it is not {cardflag}', itIs(false), { needsCard: true, writes: 0 })
    .condition('its {attribute} is at least its {attribute}', atLeast, { needsCard: true })
    .condition('its {attribute} are at least its {attribute}', atLeast, { needsCard: true })
    .condition('its {attribute} is more than {int}', moreThan, { needsCard: true })
    .condition('its {attribute} are more than {int}', moreThan, { needsCard: true });
}
