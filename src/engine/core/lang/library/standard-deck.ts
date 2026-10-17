import { zoneCards } from '../zone-index';
import type { CardState } from '../../scene';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import type { ConditionFn, EffectFn, PhraseEnv, ZoneRef } from '../types';
import { WINNER_KEY, handZoneOf } from '../zones';
import { currentMove, describeZone, movedCard, soleZone } from './support';

const ACE_HIGH_RANK = 14;

const followsLedSuit: ConditionFn = (env) => {
  const move = currentMove(env);
  const led = zoneCards(env.state, move.to)[0];
  if (!led) return true;
  const suit = led.data?.suit;
  if (typeof suit !== 'string') throw new RuleError('“Follow the led suit” needs cards that have a suit.');
  if (movedCard(env).data?.suit === suit) return true;
  return !zoneCards(env.state, handZoneOf(env.game, move.by)).some((c) => c.data?.suit === suit);
};

/** Rank for comparing; an ace counts high when any of the game's card sets says aces are high. */
function rankOf(card: CardState, env: PhraseEnv): number {
  const rank = card.data?.rank;
  if (typeof rank !== 'number') throw new RuleError('“The highest card of the led suit” needs cards that have a rank.');
  return rank === 1 && env.game.cards.some((set) => set.acesHigh) ? ACE_HIGH_RANK : rank;
}

const highestLedCardWins: EffectFn = (env, args) => {
  const ref = args[0] as ZoneRef;
  const cards = zoneCards(env.state, soleZone(ref, env));
  if (cards.length === 0) throw new RuleError(`${describeZone(ref)} is empty, so no card can win it.`);
  const suit = cards[0].data?.suit;
  if (typeof suit !== 'string') throw new RuleError('“The highest card of the led suit” needs cards that have a suit.');
  // A tie goes to the card played first.
  const best = cards
    .filter((card) => card.data?.suit === suit)
    .map((card) => ({ card, rank: rankOf(card, env) }))
    .reduce((top, next) => (next.rank > top.rank ? next : top)).card;
  const winner = best.data?.movedBy;
  if (typeof winner !== 'string') throw new RuleError('I can\'t tell who played the winning card.');
  return { ...env.state, data: { ...env.state.data, [WINNER_KEY]: winner } };
};

/** Rules about suits and ranks that only a standard deck has. */
export function registerStandardDeckPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('they follow the led suit when they can', followsLedSuit, { needsMove: true })
    .effect('the highest card of the led suit wins {zone}', highestLedCardWins);
}
