import { zoneCards } from '../zone-index';
import type { PlayerId } from '../../scene';
import { cardsOn } from '../attach';
import { playersIn } from '../board-state';
import type { PhraseLibrary } from '../phrases';
import type { CardFilter, ConditionFn, EffectFn, PhraseEnv, ZoneRef } from '../types';
import { relocate, zoneIdFor } from '../zones';
import { itCard } from './fact-phrases';
import { cardOf, cardsInZones, cardValueOf, movedCard, passes, soleZone, theyOf } from './support';
import { ownerOf } from './support';
import { counterOf } from '../board-state';
import { playerValueOf } from './support';
import type { CardState } from '../../scene';

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

/**
 * At least that many of the cards in their zones pass the test, read as `theyHave` reads them; a zone named twice counts its cards twice,
 * as a group of cards does. At least 0 always holds.
 */
const theyHaveAtLeast: ConditionFn = (env, [n, zones, filter]) => {
  const theirs = (zones as ZoneRef[]).flatMap((ref) => cardsInZones(env, ref, theyOf(env)));
  return theirs.filter((card) => passes(env, card, [filter as CardFilter])).length >= (n as number);
};

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

/** Whether its owner has, or has no, card in a zone of theirs that passes a clause: args [the zone each player has, the clause]. */
export const OWNER_HAS_PHRASES = ['its owner has a card in their {perzone} {cardclause}', 'its owner has no card in their {perzone} {cardclause}'] as const;

/**
 * Whether its owner, the player whose zone it is in, has a card in that zone of theirs that passes the tests of the clause. A card in the
 * center has no owner, and so no owner who has such a card.
 */
const itsOwnerHas = (wanted: boolean): ConditionFn => (env, [zone, clause]) => {
  const owner = ownerOf(env, itCard(env));
  const theirs = owner === null ? [] : cardsInZones(env, { of: { seat: owner }, zone: zone as string });
  return theirs.some((card) => passes(env, card, clause as CardFilter[])) === wanted;
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
 * zone, whether they have at least some number of such cards, and whether they have one that is, or is not, so (maybe passing a test as
 * well); whether the card a press moves, or “it”, has no value under a name; moving the cards on it that pass; and whether its owner has,
 * or has no, card in a zone of theirs that is, or is not, so. A test that compares with “the card's” value needs a card move and one that
 * compares with “its” needs a card; the compiler asks that of the test itself, in a clause as well.
 */
/** Whether the card a press moves names the player the line is about: a card that names no one names nobody. */
const theyAreNamed = (wanted: boolean): ConditionFn => (env, [fact]) => (movedCard(env).data?.[fact as string] === theyOf(env)) === wanted;

/** The seat a card names under a fact, when it is a seat at this table; null when it names none. */
const namedBy = (env: PhraseEnv, card: CardState, fact: string): PlayerId | null => {
  const named = card.data?.[fact];
  return typeof named === 'string' && env.seats.includes(named) ? named : null;
};

/** Whether the owner of the card the rule is about has at least n cards in their zone of that name; a card in no player's zone: false. */
const itsOwnerHasAtLeast: ConditionFn = (env, [n, zone]) => {
  const owner = ownerOf(env, itCard(env));
  return owner !== null && zoneCards(env.state, zoneIdFor(zone as string, owner)).length >= (n as number);
};

/** Whether they have at least the value worked out for the player the card names; a card naming no one: false. */
const haveItsNamedValue: ConditionFn = (env, [fact, value, counter]) => {
  const named = namedBy(env, itCard(env), fact as string);
  return named !== null && counterOf(env.state, counter as string, theyOf(env)) >= playerValueOf(env, named, value as string);
};

/** Whether some player still in, not them, is not the player the card a press moves names. */
const someOtherIsNot: ConditionFn = (env, [fact]) => {
  const they = theyOf(env);
  const named = namedBy(env, movedCard(env), fact as string);
  return playersIn(env.state, env.seats).some((seat) => seat !== they && seat !== named);
};

/** Whether seat `a` has, in their zone of that name, a card naming `b` under any fact of the game that names a player. */
const namesIn = (env: PhraseEnv, a: PlayerId, b: PlayerId, zone: string): boolean => {
  const facts = env.game.facts.filter((fact) => fact.on === 'card' && fact.kind === 'player').map((fact) => fact.name);
  return zoneCards(env.state, zoneIdFor(zone, a)).some((card) => facts.some((fact) => card.data?.[fact] === b));
};

/**
 * Whether another player still in, tied to them by a card in the zone each has (either has there a card that names the other), has a
 * card in their own zone of the second name that passes the test.
 */
const tiedHas = (wanted: boolean): ConditionFn => (env, [tie, zone, filter]) => {
  const they = theyOf(env);
  const found = playersIn(env.state, env.seats).some((seat) => seat !== they
    && (namesIn(env, they, seat, tie as string) || namesIn(env, seat, they, tie as string))
    && zoneCards(env.state, zoneIdFor(zone as string, seat)).some((card) => passes(env, card, [filter as CardFilter])));
  return found === wanted;
};

export function registerComparePhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('they have a card in {zones} whose {cardfilter}', theyHaveACard(true), { needsPlayer: true })
    .condition('they have no card in {zones} whose {cardfilter}', theyHaveACard(false), { needsPlayer: true })
    .condition('they have at least {int} cards in {zones} whose {cardfilter}', theyHaveAtLeast, { needsPlayer: true })
    .condition('they have a card in {zones} {cardclause}', theyHaveACardThatIs(true), { needsPlayer: true })
    .condition('they have no card in {zones} {cardclause}', theyHaveACardThatIs(false), { needsPlayer: true })
    .condition('some player has a card in their {perzone} whose {cardfilter}', somePlayerHasACard)
    .condition('another player has a card in their {perzone} whose {cardfilter}', anotherPlayerHasACard, { needsPlayer: true })
    .condition('its owner has at least {int} cards in their {perzone}', itsOwnerHasAtLeast, { needsCard: true })
    .condition("they have at least its {cardplayer}'s {playervalue} in {counter}", haveItsNamedValue, { needsCard: true, needsPlayer: true })
    .condition("some other player is not the card's {cardplayer}", someOtherIsNot, { needsMove: true, needsPlayer: true })
    .condition('another player tied to them by a card in their {perzone} has a card in their {perzone} whose {cardfilter}', tiedHas(true),
      { needsPlayer: true })
    .condition('no other player tied to them by a card in their {perzone} has a card in their {perzone} whose {cardfilter}', tiedHas(false),
      { needsPlayer: true })
    .condition("they are the card's {cardplayer}", theyAreNamed(true), { needsMove: true, needsPlayer: true })
    .condition("they are not the card's {cardplayer}", theyAreNamed(false), { needsMove: true, needsPlayer: true })
    .condition('the card has no {attribute}', theCardHasNo, { needsMove: true })
    .condition('it has no {attribute}', itHasNo, { needsCard: true })
    .effect('every card on it whose {cardfilter} goes to {zone}', everyCardOnItWhoseGoesTo, { needsCard: true })
    .condition(OWNER_HAS_PHRASES[0], itsOwnerHas(true), { needsCard: true })
    .condition(OWNER_HAS_PHRASES[1], itsOwnerHas(false), { needsCard: true });
}
