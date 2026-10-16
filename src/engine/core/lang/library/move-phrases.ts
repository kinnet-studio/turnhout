import { zoneCards } from '../../game-state';
import type { CardState } from '../../scene';
import { counterOf } from '../board-state';
import type { PhraseLibrary } from '../phrases';
import type { CardMatch, ConditionFn, EffectFn, PhraseEnv, ZoneRef } from '../types';
import { handZoneOf, matchesCard, resolveZoneIds, topCard, zoneInfo } from '../zones';
import { transfer } from './board-phrases';
import { cardNumber, cardValueOf, currentMove, movedCard, soleZone, theyOf } from './support';

const cardIs = (wanted: boolean): ConditionFn => (env, args) => matchesCard(movedCard(env), args[0] as CardMatch) === wanted;

/** A count declared on cards is 0 on a card nothing has changed it on, so two such cards have the same of it. */
const sameAsTop: ConditionFn = (env, args) => {
  const [attribute, ref] = args as [string, ZoneRef];
  const top = topCard(env.state, soleZone(ref, env));
  if (!top) return true;
  const mine = cardValueOf(env, movedCard(env), attribute);
  return mine !== null && mine === cardValueOf(env, top, attribute);
};

const holdsOnly: ConditionFn = (env, args) =>
  zoneCards(env.state, handZoneOf(env.game, currentMove(env).by)).every((c) => matchesCard(c, args[0] as CardMatch));

/** Every condition of a move is judged before the card moves, so this asks about the card where it still is. */
const haveAtLeastTheCards: ConditionFn = (env, [attribute, counter]) =>
  counterOf(env.state, counter as string, theyOf(env)) >= cardNumber(env, movedCard(env), attribute as string);

/** Like any payment to the bank: one that leaves them below 0 notes the debt. */
const paysTheCards: EffectFn = (env, [attribute]) => transfer(env, theyOf(env), null, cardNumber(env, movedCard(env), attribute as string));

/** The cards a move could take from a zone: the top card of a pile, any card of a hand or row. */
function candidates(env: PhraseEnv, zoneId: string): CardState[] {
  const cards = zoneCards(env.state, zoneId);
  return zoneInfo(env.game, zoneId)?.spec.layout === 'pile' ? cards.slice(-1) : cards;
}

const hasNoPlay: ConditionFn = (env) => {
  const { verb, by } = currentMove(env);
  const phase = env.game.phases.find((p) => p.id === env.state.turn?.phase);
  const others = (phase?.moves ?? []).filter((m) => m.verb !== verb);
  return !others.some((m) =>
    resolveZoneIds(m.from, env, by).some((zoneId) =>
      candidates(env, zoneId).some((card) => env.check(env.state, { type: m.verb, cardId: card.id, by }) === true),
    ),
  );
};

/** Conditions on the card being moved and on what its player could do instead, and paying the number the card shows. */
export function registerMovePhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('the card is {cardclass}', cardIs(true), { needsMove: true })
    .condition('the card is not {cardclass}', cardIs(false), { needsMove: true })
    .condition('the card has the same {attribute} as the top card of {zone}', sameAsTop, { needsMove: true })
    .condition('they hold only {cardclass}', holdsOnly, { needsMove: true })
    .condition('they have no card they could play', hasNoPlay, { needsMove: true })
    .condition("they have at least the card's {attribute} in {counter}", haveAtLeastTheCards, { needsMove: true, needsPlayer: true })
    .effect("they pay the card's {attribute}", paysTheCards, { needsMove: true, needsPayment: true });
}
