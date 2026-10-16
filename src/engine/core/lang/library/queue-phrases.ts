import { insertAtSlot, zoneCards } from '../../game-state';
import { nextInt } from '../../rng';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import type { CardMatch, ConditionFn, EffectFn, ZoneRef } from '../types';
import { BOX_ZONE, matchesCard, relocate, resolveZoneIds, toBottom, withoutHolder, zoneIdFor, zoneInfo } from '../zones';
import { describeCard } from './example-phrases';
import { deal } from './flow-phrases';
import { describeZone, soleZone, thePickedCards } from './support';

// Rows that keep their order and queues whose bottom card is the oldest: a zone's cards are in slot order, the first at the bottom.

/** Whether some card in the shared zone is that kind of card. */
const sharedZoneHas: ConditionFn = (env, args) => {
  const [zone, match] = args as [string, CardMatch];
  return zoneCards(env.state, zoneIdFor(zone)).some((card) => matchesCard(card, match));
};

const moveBottom: EffectFn = (env, args) => {
  const [fromRef, toRef] = args as [ZoneRef, ZoneRef];
  const from = soleZone(fromRef, env);
  const to = soleZone(toRef, env);
  const [bottom] = zoneCards(env.state, from);
  if (!bottom) throw new RuleError(`There is no card to move: ${describeZone(fromRef)} is empty.`);
  return relocate(env.state, [bottom.id], to, env.game);
};

/** The first card of that kind, in slot order, goes on top of the other zone. */
const moveNamed: EffectFn = (env, args) => {
  const [match, fromRef, toRef] = args as [CardMatch, ZoneRef, ZoneRef];
  const from = soleZone(fromRef, env);
  const to = soleZone(toRef, env);
  const [found] = zoneCards(env.state, from).filter((card) => matchesCard(card, match));
  if (!found) {
    const what = describeCard(match).replace(/^(?:an?|the) /, '');
    throw new RuleError(`There is no ${what} in ${describeZone(fromRef)}.`);
  }
  return relocate(env.state, [found.id], to, env.game);
};

/**
 * `deal`, for a source that may be short: each zone dealt to gets the top cards there are when its turn comes, up to the
 * number. A negative number is refused, as `deal` refuses it, whatever the source holds.
 */
export const dealUpTo: EffectFn = (env, args) => {
  const [count, fromRef, toRef] = args as [number, ZoneRef, ZoneRef];
  if (count < 0) return deal(env, args);
  const from = soleZone(fromRef, env);
  return resolveZoneIds(toRef, env).reduce((state, to) => {
    const remaining = zoneCards(state, from);
    const top = count > 0 ? remaining.slice(-count) : []; // slice(-0) would be every card
    return relocate(state, top.map((card) => card.id), to, env.game);
  }, env.state);
};

/** `dealUpTo` as many cards as the press picked: a button that picks some cards of one zone deals the same number to the zone they go to. */
const dealUpToAsManyAsPicked: EffectFn = (env, args) => dealUpTo(env, [thePickedCards(env).length, ...args]);

/**
 * Each card of the first zone, from its top card down, goes under every card of the second, so the second then holds the first's cards in
 * their slot order and then its own: a row that is over its limit loses its right end, the oldest cards, to a rule that says so. Like
 * `toBottom`, each card comes off any card it sat on and turns as the second zone shows its cards. Several zones (“each stash”) come in
 * as `move` gathers them, the first seat's cards at the very left.
 */
const moveToLeftEnd: EffectFn = (env, args) => {
  const [fromRef, toRef] = args as [ZoneRef, ZoneRef];
  const to = soleZone(toRef, env);
  const entering = [...resolveZoneIds(fromRef, env)].reverse().flatMap((id) => [...zoneCards(env.state, id)].reverse());
  return entering.reduce((state, card) => toBottom(state, card.id, to, env.game), env.state);
};

/** One card where “deal 1 cards” would read badly: `deal` with 1. */
const dealOne: EffectFn = (env, args) => deal(env, [1, ...args]);

/**
 * Puts a card back among the oldest of a zone: into one of the bottom fifth of the cards already there, but always at least the
 * bottom one, and never past the top. The place is drawn from the game's random numbers, so the same game goes the same way.
 * The card is the first one in play that is that kind, wherever it is; it is face up only in a zone everyone can see, and on no card.
 */
const goesIntoBottomFifth: EffectFn = (env, args) => {
  const [match, zoneRef] = args as [CardMatch, ZoneRef];
  const card = env.state.cards.find((c) => c.zoneId !== BOX_ZONE && matchesCard(c, match));
  if (!card) throw new RuleError(`No card is ${describeCard(match)}.`);
  const zoneId = soleZone(zoneRef, env);
  const others = zoneCards(env.state, zoneId).filter((c) => c.id !== card.id).length;
  const reach = Math.max(1, Math.ceil(others / 5));
  // With `others` cards there are only `others` + 1 places to go into, so a short zone has fewer than the fifth's.
  const { value: slot, rng } = nextInt(env.state.rng, Math.min(reach, others) + 1);
  const placed = insertAtSlot({ ...env.state, rng }, card.id, zoneId, slot);
  // insertAtSlot leaves the face and the card it sat on as they were, so both go as `relocate` would have them go.
  const faceUp = zoneInfo(env.game, zoneId)?.spec.visibility === 'public';
  return { ...placed, cards: placed.cards.map((c) => (c.id === card.id ? { ...withoutHolder(c), faceUp } : c)) };
};

/**
 * The bottom card of a zone, a shared zone that has a card, moving a named card, dealing up to a number or as many as were picked, a row's
 * left end, and the bottom fifth.
 */
export function registerQueuePhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('{sharedzone} has {card}', sharedZoneHas)
    .effect('move the bottom card of {zone} to {zone}', moveBottom)
    .effect('move {card} from {zone} to {zone}', moveNamed)
    .effect('deal up to {int} cards from {zone} to {zone}', dealUpTo)
    .effect('deal up to as many cards as they picked from {zone} to {zone}', dealUpToAsManyAsPicked, { needsCards: true })
    .effect('deal 1 card from {zone} to {zone}', dealOne)
    .effect('move {zone} to the left end of {zone}', moveToLeftEnd)
    .effect('{card} goes into the bottom fifth of {zone}', goesIntoBottomFifth);
}
