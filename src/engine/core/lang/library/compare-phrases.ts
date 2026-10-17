import { zoneCards } from '../zone-index';
import type { PlayerId } from '../../scene';
import { cardsOn } from '../attach';
import { playersIn } from '../board-state';
import type { PhraseLibrary } from '../phrases';
import type { CardFilter, ConditionFn, EffectFn, PhraseEnv, ZoneRef } from '../types';
import { relocate, zoneIdFor } from '../zones';
import { itCard } from './fact-phrases';
import { cardOf, cardsInZones, cardValueOf, movedCard, passes, soleZone, theyOf } from './support';

// ---- a card of theirs, or of anyone's ----------------------------------------------------------

/**
 * Whether they have a card in the zones that passes every test. Their zones are those of the player the line is about, whoever makes the
 * move: a choice judged about each player who might be picked reads that player's zones, with the card of the press still the one moved.
 */
const theyHave = (env: PhraseEnv, zones: ZoneRef[], filters: CardFilter[]): boolean =>
  zones.some((ref) => cardsInZones(env, ref, theyOf(env)).some((card) => passes(env, card, filters)));

/** A card that passes the test written after “whose”. */
const theyHaveACard = (wanted: boolean): ConditionFn => (env, [zones, filter]) =>
  theyHave(env, zones as ZoneRef[], [filter as CardFilter]) === wanted;

/** A card that is, or is not, so, and passes the test written after “and whose” when there is one: the tests of the clause. */
const theyHaveACardThatIs = (wanted: boolean): ConditionFn => (env, [zones, clause]) =>
  theyHave(env, zones as ZoneRef[], clause as CardFilter[]) === wanted;

/** Whether a card in that zone of the seat's passes the test. */
const seatHasACard = (env: PhraseEnv, seat: PlayerId, zone: string, filter: CardFilter): boolean =>
  zoneCards(env.state, zoneIdFor(zone, seat)).some((card) => passes(env, card, [filter]));

/** A player who is out has no say: only the seats still in are asked, the one the line is about among them. */
const somePlayerHasACard: ConditionFn = (env, [zone, filter]) =>
  playersIn(env.state, env.seats).some((seat) => seatHasACard(env, seat, zone as string, filter as CardFilter));

const anotherPlayerHasACard: ConditionFn = (env, [zone, filter]) => {
  const they = theyOf(env);
  return playersIn(env.state, env.seats).some((seat) => seat !== they && seatHasACard(env, seat, zone as string, filter as CardFilter));
};

// ---- a value a card has none of ------------------------------------------------------------------

/** A blank cell, or a name the card has no column or count for: read as every phrase reads a card's value. */
const theCardHasNo: ConditionFn = (env, [attribute]) => cardValueOf(env, movedCard(env), attribute as string) === null;
const itHasNo: ConditionFn = (env, [attribute]) => cardValueOf(env, itCard(env), attribute as string) === null;

// ---- the cards on it that pass a test ------------------------------------------------------------

/**
 * The cards on it that pass go in the order they sit, each coming off it as it moves; the rest stay on it. The zone is worked out first,
 * so that a rule naming no single zone is a mistake whether or not a card passes.
 */
const everyCardOnItWhoseGoesTo: EffectFn = (env, [filter, zone]) => {
  const to = soleZone(zone as ZoneRef, env);
  const ids = cardsOn(env.state, cardOf(env)).filter((card) => passes(env, card, [filter as CardFilter])).map((card) => card.id);
  return ids.length === 0 ? env.state : relocate(env.state, ids, to, env.game);
};

/**
 * The sentences that compare cards by a test (see `passes`): whether they, some player, or another player has a card that passes it in a
 * zone, and whether they have one that is, or is not, so (maybe passing a test as well); whether the card a press moves, or “it”, has no
 * value under a name; and moving the cards on it that pass. A test that compares with “the card's” value needs a card move and one that
 * compares with “its” needs a card; the compiler asks that of the test itself, in a clause as well.
 */
export function registerComparePhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('they have a card in {zones} whose {cardfilter}', theyHaveACard(true), { needsPlayer: true })
    .condition('they have no card in {zones} whose {cardfilter}', theyHaveACard(false), { needsPlayer: true })
    .condition('they have a card in {zones} {cardclause}', theyHaveACardThatIs(true), { needsPlayer: true })
    .condition('they have no card in {zones} {cardclause}', theyHaveACardThatIs(false), { needsPlayer: true })
    .condition('some player has a card in their {perzone} whose {cardfilter}', somePlayerHasACard)
    .condition('another player has a card in their {perzone} whose {cardfilter}', anotherPlayerHasACard, { needsPlayer: true })
    .condition('the card has no {attribute}', theCardHasNo, { needsMove: true })
    .condition('it has no {attribute}', itHasNo, { needsCard: true })
    .effect('every card on it whose {cardfilter} goes to {zone}', everyCardOnItWhoseGoesTo, { needsCard: true });
}
