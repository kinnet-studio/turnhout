import { zoneCards } from '../../game-state';
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
  if (typeof rank !== 'number') return 0;
  return rank === 1 && env.game.cards.some((set) => set.acesHigh) ? ACE_HIGH_RANK : rank;
}

const highestLedCardWins: EffectFn = (env, args) => {
  const ref = args[0] as ZoneRef;
  const [led, ...rest] = zoneCards(env.state, soleZone(ref, env));
  if (!led) throw new RuleError(`${describeZone(ref)} is empty, so no card can win it.`);
  // A tie goes to the card played first.
  const best = rest.reduce(
    (top, card) => (card.data?.suit === led.data?.suit && rankOf(card, env) > rankOf(top, env) ? card : top),
    led,
  );
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
