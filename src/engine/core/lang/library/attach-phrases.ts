import type { GameState } from '../../game-state';
import { cardById } from '../zone-index';
import type { PlayerId } from '../../scene';
import { cardsOn, holderIdOf, onCardsZoneOf, putOn } from '../attach';
import { changeCard } from '../card-facts';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import { joinAnd } from '../refs';
import type { CardMatch, ConditionFn, EffectFn, ExpectFn, MomentFn, PhraseEnv, ZoneRef } from '../types';
import { matchesCard, relocate, zoneInfo } from '../zones';
import { changeable } from './card-number-phrases';
import { claimCards, coversExactly, describeCard, describeCards } from './example-phrases';
import { itCard, namedCardIn, noCardIn, theCard } from './fact-phrases';
import { cardHasFlag, cardNumber, cardOf, describeZone, mustBeKept, soleZone, theTargetCard, thePickedCards } from './support';

// ---- the lines of a rule ----------------------------------------------------------------------

/** The one zone a line puts cards on a card in; one whose cards don't sit on cards is a mistake in the rule, said with how to mark it. */
function onCardsZone(env: PhraseEnv, ref: ZoneRef): string {
  const zoneId = soleZone(ref, env);
  if (zoneInfo(env.game, zoneId)?.spec.onCards === undefined) {
    throw new RuleError(`${describeZone(ref)} doesn't hold cards on cards. End its Table line with “, where every card is on a card”.`);
  }
  return zoneId;
}

const isOnTarget = (wanted: boolean): ConditionFn => (env) => (holderIdOf(itCard(env)) === theTargetCard(env).id) === wanted;

/** The player whose zone a card that has just joined a card sits in: only a zone each player has holds cards on cards. */
function joinedBy(env: PhraseEnv, state: GameState, cardId: string): PlayerId {
  const zoneId = cardById(state, cardId)?.zoneId;
  const seat = zoneId === undefined ? null : (zoneInfo(env.game, zoneId)?.seat ?? null);
  if (seat === null) throw new Error(`The card ${cardId} joined a card outside any player's zone.`);
  return seat;
}

/**
 * Tells the rules that each card joined the card `holderId`, one moment for each in the order given, once they all sit on it in `state`:
 * each moment is about the player whose zone the card joined, and its rules see what the rules for the cards before it did. Every line
 * that puts cards on a target card calls it. Without `env.announce` nothing is told; an example's Given puts cards on a card without it.
 */
export function announceJoins(env: PhraseEnv, state: GameState, cardIds: string[], holderId: string): GameState {
  const { announce } = env;
  if (!announce) return state;
  const joins = cardIds.map((card) => ({ kind: 'join' as const, seat: joinedBy(env, state, card), card, holder: holderId }));
  return joins.reduce((s, join) => announce(s, join), state);
}

const itGoesOnTarget: EffectFn = (env, [zone]) => {
  const card = cardOf(env);
  const to = onCardsZone(env, zone as ZoneRef);
  const holder = theTargetCard(env).id;
  return announceJoins(env, putOn(env.state, [card], to, holder, env.game), [card], holder);
};

/** In the press's order, so that the card picked first sits first and joins first. */
const pickedGoOnTarget: EffectFn = (env, [zone]) => {
  const cards = thePickedCards(env);
  const to = onCardsZone(env, zone as ZoneRef);
  const holder = theTargetCard(env).id;
  return announceJoins(env, putOn(env.state, cards, to, holder, env.game), cards, holder);
};

/** Whether it, the card the rule is about, sits on any card. */
const isOnACard: ConditionFn = (env) => holderIdOf(itCard(env)) !== null;

/** Whether the card it sits on is, or is not, of that kind. A card on no card is on no card of any kind, so neither holds of it. */
const theCardItIsOnIs = (wanted: boolean): ConditionFn => (env, [match]) => {
  const holderId = holderIdOf(itCard(env));
  const holder = holderId === null ? undefined : cardById(env.state, holderId);
  return holder !== undefined && matchesCard(holder, match as CardMatch) === wanted;
};

/** The ids of the picked cards, in the press's order, that are so, or with `wanted` false are not, read as every phrase reads a flag. */
function pickedThatAre(env: PhraseEnv, flag: string, wanted: boolean): string[] {
  return thePickedCards(env).filter((id) => {
    const card = cardById(env.state, id);
    if (!card) throw new Error(`No card ${id} among the picked cards.`);
    return cardHasFlag(env, card, flag) === wanted;
  });
}

const noPickedCardIs: ConditionFn = (env, [flag]) => pickedThatAre(env, flag as string, true).length === 0;

/**
 * The picked cards that are so go on the target card, in the press's order, and each joins it. The zone is worked out first, so that a
 * zone whose cards don't sit on cards is a mistake whether or not a card is so.
 */
const pickedThatAreGoOnTarget: EffectFn = (env, [flag, zone]) => {
  const to = onCardsZone(env, zone as ZoneRef);
  const holder = theTargetCard(env).id;
  const cards = pickedThatAre(env, flag as string, true);
  return cards.length === 0 ? env.state : announceJoins(env, putOn(env.state, cards, to, holder, env.game), cards, holder);
};

/** The picked cards that are not so go to the zone in the press's order, on no card. */
const pickedThatAreNotGoTo: EffectFn = (env, [flag, zone]) => {
  const to = soleZone(zone as ZoneRef, env);
  const cards = pickedThatAre(env, flag as string, false);
  return cards.length === 0 ? env.state : relocate(env.state, cards, to, env.game);
};

/** The ids of the cards on it, read only through `cardsOn`, in the order they sit, that are so, or with `wanted` false are not. */
const cardsOnItThatAre = (env: PhraseEnv, flag: string, wanted: boolean): string[] =>
  cardsOn(env.state, cardOf(env)).filter((card) => cardHasFlag(env, card, flag) === wanted).map((card) => card.id);

/**
 * The cards on it that are so go to the zone and stay on it, in the order they sit: it has moved, and they go along. They joined it
 * before, so no join is told. The zone is worked out first, as for every line that puts cards on a card.
 */
const cardsOnItThatAreStay: EffectFn = (env, [flag, zone]) => {
  const to = onCardsZone(env, zone as ZoneRef);
  const ids = cardsOnItThatAre(env, flag as string, true);
  return ids.length === 0 ? env.state : putOn(env.state, ids, to, cardOf(env), env.game);
};

/** The cards on it that are not so go to the zone in the order they sit, each coming off it as it moves. */
const cardsOnItThatAreNotGoTo: EffectFn = (env, [flag, zone]) => {
  const to = soleZone(zone as ZoneRef, env);
  const ids = cardsOnItThatAre(env, flag as string, false);
  return ids.length === 0 ? env.state : relocate(env.state, ids, to, env.game);
};

/**
 * A card of that kind joined a card in a zone of that name, whichever player's it is. Both cards are read as they are when the rule is
 * told, after what the rules told before it did.
 */
const joinsACardIn: MomentFn = (env, [match, zone], moment) => {
  if (moment.kind !== 'join') return false;
  const [card, holder] = [cardById(env.state, moment.card), cardById(env.state, moment.holder)];
  if (!card || !holder || !matchesCard(card, match as CardMatch)) return false;
  const at = zoneInfo(env.game, holder.zoneId);
  return at !== null && at.seat !== null && at.spec.name === zone;
};

/**
 * The card it joins gains that much of a count. Only a count the game keeps on cards can change: a column of a card's table, such as
 * what it pays, is part of what the card is, so naming one is a mistake in the rule and is refused, as “its … go up by …” refuses it.
 */
const joinedCardGains: EffectFn = (env, [n, name]) => {
  const count = changeable(env, name as string);
  const card = theTargetCard(env);
  return changeCard(env.state, card.id, { [count]: cardNumber(env, card, count) + (n as number) }, env.game);
};

/**
 * The cards on it go in the order they sit, each coming off it as it moves. The zone is worked out first, so that a rule naming no single
 * zone is a mistake whether or not a card is on it.
 */
const everyCardOnItGoesTo: EffectFn = (env, [zone]) => {
  const to = soleZone(zone as ZoneRef, env);
  const ids = cardsOn(env.state, cardOf(env)).map((card) => card.id);
  return ids.length === 0 ? env.state : relocate(env.state, ids, to, env.game);
};

/** A flag worked out from lines is refused first, whether or not a card is on it. */
const everyCardOnItIs: EffectFn = (env, [fact]) => {
  mustBeKept(env, fact as string);
  return cardsOn(env.state, cardOf(env)).reduce((state, card) => changeCard(state, card.id, { [fact as string]: true }, env.game), env.state);
};

/**
 * The second flag is set on each card on it that is the first, read as `cardHasFlag` reads a flag, and on no other: a flag worked out from
 * lines is refused first, whether or not a card is on it. The cards are those `cardsOn` gives, so one place narrows what a card holds.
 */
const cardsOnItThatAreSet: EffectFn = (env, [flag, fact]) => {
  mustBeKept(env, fact as string);
  return cardsOnItThatAre(env, flag as string, true).reduce((state, id) => changeCard(state, id, { [fact as string]: true }, env.game), env.state);
};

// ---- examples ----------------------------------------------------------------------------------

/**
 * Puts cards on the named card of a zone: each is claimed as a zone's cards are, then put in the zone its owner keeps cards on cards in,
 * after what is there: the one that names the named card's zone, else the one where every card sits on a card (`onCardsZoneOf`). A card in
 * the center belongs to no one, so nothing can sit on it. No join is told: the Given sets the table as it already is.
 */
const cardHasOnItGiven: EffectFn = (env, [match, zone, wanted]) => {
  const [named, where] = [match as CardMatch, zone as ZoneRef];
  const at = zoneInfo(env.game, soleZone(where, env));
  if (at === null || at.seat === null) throw new RuleError(`${describeZone(where)} belongs to no player, so no card can sit on a card in it.`);
  const holder = namedCardIn(env, named, where);
  if (!holder) throw new RuleError(`There is ${noCardIn(named, where)}.`);
  const { ids, state } = claimCards(env, wanted as CardMatch[], env.state);
  return putOn(state, ids, onCardsZoneOf(env.game, at.seat, at.spec.name), holder.id, env.game);
};

/** Whether exactly the wanted cards sit on the named card of a zone, `list` saying them; otherwise what an example should say about it. */
function onItIs(env: PhraseEnv, named: CardMatch, where: ZoneRef, wanted: CardMatch[], list: string): true | string {
  const expected = `Expected ${theCard(named)} in ${describeZone(where)} to have ${list} on it`;
  const holder = namedCardIn(env, named, where);
  if (!holder) return `${expected}, but there is ${noCardIn(named, where)}.`;
  const on = cardsOn(env.state, holder.id);
  if (coversExactly(on, wanted)) return true;
  return `${expected}, but ${on.length === 0 ? 'there is nothing on it' : `it has ${describeCards(on, env.game)} on it`}.`;
}

const cardHasOnItExpected: ExpectFn = (env, [match, zone, wanted]) =>
  onItIs(env, match as CardMatch, zone as ZoneRef, wanted as CardMatch[], joinAnd((wanted as CardMatch[]).map(describeCard)));

const cardHasNothingOnItExpected: ExpectFn = (env, [match, zone]) => onItIs(env, match as CardMatch, zone as ZoneRef, [], 'no cards');

/**
 * The sentences about cards that sit on cards (R3): whether the card a press is about sits on its target card, or on any card, whether
 * the card it sits on is, or is not, of a kind, and whether any picked card is so; putting it or the picked cards (all, or those that are
 * so) on the target card, and the picked cards that are not so elsewhere; moving or marking every card on it, marking those that are so,
 * and moving those that are so along with it, still on it, and those that are not elsewhere. The rules for when a card of a kind joins a
 * card in a zone, which every line that puts cards on a target card tells, and what they do to the card it joins. And the lines of an
 * example that put cards on a card, or check what is on one. A card comes off its card whenever it moves, so a line that puts it on one
 * says so after the move.
 */
export function registerAttachPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('it is on the target card', isOnTarget(true), { needsCard: true, needsOnto: true })
    .condition('it is not on the target card', isOnTarget(false), { needsCard: true, needsOnto: true })
    .condition('it is on a card', isOnACard, { needsCard: true })
    .condition('the card it is on is {cardclass}', theCardItIsOnIs(true), { needsCard: true })
    .condition('the card it is on is not {cardclass}', theCardItIsOnIs(false), { needsCard: true })
    .condition('no picked card is {cardflag}', noPickedCardIs, { needsCards: true })
    .effect('it goes to {zone}, on the target card', itGoesOnTarget, { needsCard: true, needsOnto: true })
    .effect('the picked cards go to {zone}, on the target card', pickedGoOnTarget, { needsCards: true, needsOnto: true })
    .effect('the picked cards that are {cardflag} go to {zone}, on the target card', pickedThatAreGoOnTarget, { needsCards: true, needsOnto: true })
    .effect('the picked cards that are not {cardflag} go to {zone}', pickedThatAreNotGoTo, { needsCards: true })
    .effect('every card on it goes to {zone}', everyCardOnItGoesTo, { needsCard: true })
    .effect('every card on it is {cardflag}', everyCardOnItIs, { needsCard: true, writes: 0 })
    .effect('every card on it that is {cardflag} is {cardflag}', cardsOnItThatAreSet, { needsCard: true, writes: 1 })
    .effect('every card on it that is {cardflag} goes to {zone}, staying on it', cardsOnItThatAreStay, { needsCard: true })
    .effect('every card on it that is not {cardflag} goes to {zone}', cardsOnItThatAreNotGoTo, { needsCard: true })
    .moment('{cardclass} joins a card in a {perzone}', joinsACardIn)
    .moment('{cardclass} joins a card in an {perzone}', joinsACardIn)
    .effect('the card it joins gains {int} {attribute}', joinedCardGains, { needsOnto: true, writes: 1 })
    .given('{card} in {zone} has {cardlist} on it', cardHasOnItGiven)
    .expect('{card} in {zone} has {cardlist} on it', cardHasOnItExpected)
    .expect('{card} in {zone} has no cards on it', cardHasNothingOnItExpected);
}
