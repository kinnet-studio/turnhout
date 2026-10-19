import { cardById, zoneCards } from '../zone-index';
import type { CardState, PlayerId } from '../../scene';
import type { Json } from '../../table-def';
import { cardsOn } from '../attach';
import { pieceAt } from '../board-state';
import { cardAttribute, cardFact } from '../card-facts';
import { WORKED_KEPT } from '../compile-util';
import { noSuchNumber, RuleError } from '../diagnostics';
import { canon } from '../refs';
import type { CardFilter, CardGroup, MoveInfo, PhraseEnv, ZoneRef } from '../types';
import { resolveSeat, resolveZoneIds } from '../zones';
import { zoneInfo } from '../zones';

const OWNER_WORDS = { actor: 'their', winner: "the winner's", other: "the other player's" };

/** How a designer would say the zone: “the trick”, “each hand”, “their hand”, “the other player's camp”. */
export function describeZone(ref: ZoneRef): string {
  if ('shared' in ref) return `the ${ref.shared}`;
  if ('each' in ref) return `each ${ref.each}`;
  if ('seat' in ref.of) return `${ref.of.seat}'s ${ref.zone}`;
  return `${OWNER_WORDS[ref.of.who]} ${ref.zone}`;
}

/** The one zone a rule is about; “each hand” names several, which this rule cannot use. `actor` is who “their” means. */
export function soleZone(ref: ZoneRef, env: PhraseEnv, actor?: PlayerId): string {
  const ids = resolveZoneIds(ref, env, actor);
  if (ids.length !== 1) throw new RuleError(`${describeZone(ref)} is more than one zone, but this rule needs just one.`);
  return ids[0];
}

/** The move a `needsMove` phrase is judging. The compiler only lets such phrases into moves, so a missing one is a bug. */
export function currentMove(env: PhraseEnv): MoveInfo {
  if (!env.move) throw new Error('This phrase needs a move, but none is being judged.');
  return env.move;
}

/** The card being moved. */
export function movedCard(env: PhraseEnv): CardState {
  const { cardId } = currentMove(env);
  const card = cardById(env.state, cardId);
  if (!card) throw new Error(`No card ${cardId} to judge.`);
  return card;
}

/** The player a `needsPlayer` phrase is about. The compiler only lets such phrases into rules that have one, so a missing one is a bug. */
export function theyOf(env: PhraseEnv): PlayerId {
  const player = env.subject?.player;
  if (player === undefined || player === null) throw new Error('This phrase needs a player, but none is being judged.');
  return player;
}

/** The amount a `needsAmount` phrase reads. The compiler only lets such phrases into a button that carries one, so a missing amount is a bug. */
export function theAmount(env: PhraseEnv): number {
  const amount = env.subject?.amount;
  if (amount === undefined) throw new Error('This phrase needs an amount, but the button carries none.');
  return amount;
}

/** The player a `needsPick` phrase reads, the one the button's press picked. The compiler only lets such phrases into a button that picks one, so a missing pick is a bug. */
export function thePick(env: PhraseEnv): PlayerId {
  const picked = env.subject?.picked;
  if (picked === undefined) throw new Error('This phrase needs a player picked, but the button carries none.');
  return picked;
}

/** The card a `needsCard` phrase is about, by its id. The compiler only lets such phrases into rules that have one, so a missing one is a bug. */
export function cardOf(env: PhraseEnv): string {
  const card = env.subject?.card;
  if (card === undefined || card === null) throw new Error('This phrase needs a card, but none is being judged.');
  return card;
}

/**
 * The card a `needsOnto` phrase reads, the one the button's press picked for its cards to go to. The compiler only lets such phrases
 * into a button that picks one, so a missing one is a bug.
 */
export function theTargetCard(env: PhraseEnv): CardState {
  const onto = env.subject?.onto;
  const card = onto === undefined ? undefined : cardById(env.state, onto);
  if (!card) throw new Error('This phrase needs a target card, but the button carries none.');
  return card;
}

/**
 * The ids of the cards a `needsCards` phrase reads, the set the button's press picked, in the order it gave them. The compiler only
 * lets such phrases into a button that picks some cards, so a missing set is a bug.
 */
export function thePickedCards(env: PhraseEnv): string[] {
  const cards = env.subject?.cards;
  if (cards === undefined) throw new Error('This phrase needs the picked cards, but the button carries none.');
  return cards;
}

/** Whether a section of the game works out a value for cards under this name. */
const isWorked = (env: PhraseEnv, name: string): boolean => env.game.worked !== undefined && Object.hasOwn(env.game.worked, name);

/**
 * What a card has under a name, as every phrase reads it: a value the game works out for cards once its lines have had their say, else a
 * column of the card's table or a count the game keeps on cards (0 until it changes); null when it has no such thing. Only a worked
 * value is asked of the runtime, which finds the card by its id: any other name is read off the card at hand, as a phrase that reads every
 * card on the table needs.
 */
export function cardValueOf(env: PhraseEnv, card: CardState, name: string): Json | null {
  return env.workedValue && isWorked(env, name) ? env.workedValue(env.state, card.id, name) : cardAttribute(card, name, env.game);
}

/**
 * Whether a card is so, as every phrase reads a flag on a card: a flag worked out from its lines, else one set on the card and not set to
 * no. Like a number, only a worked flag is asked of the runtime.
 */
export function cardHasFlag(env: PhraseEnv, card: CardState, flag: string): boolean {
  return env.workedFlag && isWorked(env, flag) ? env.workedFlag(env.state, card.id, flag) : cardFact(card, flag) === true;
}

/**
 * A value worked out from lines is what they say, so a rule that would change one under that name is a mistake in the rule, and `said` is
 * how it is told (an example's Given is told it can't set one). The compiler refuses such a line first; this is for a line run without it.
 */
export function mustBeKept(env: PhraseEnv, name: string, said: (name: string) => string = WORKED_KEPT): void {
  if (isWorked(env, name)) throw new RuleError(said(name));
}

/**
 * The number a card has under a name, as `cardValueOf` reads it, else the sentence that says why it has none. Every phrase that does
 * arithmetic on the numbers of the one card it is about reads them here; a rule about a group of cards reads them as `numberIfAny` does.
 * A card with no such number says so with `noSuchNumber`, which a value worked out for cards takes as a line not about that card;
 * anywhere else it is the rule's mistake, like any RuleError.
 */
export function cardNumber(env: PhraseEnv, card: CardState, name: string): number {
  const value = numberIfAny(env, card, name);
  if (value === null) throw noSuchNumber(`This card has no ${name}.`);
  return value;
}

/**
 * The number a card has under a name, as `cardNumber` reads it, or null when it has none: what a rule about many cards reads, since a
 * blank cell is no number and a group may well hold cards of several kinds. A value that is no number is still the rule's mistake.
 */
function numberIfAny(env: PhraseEnv, card: CardState, name: string): number | null {
  const value = cardValueOf(env, card, name);
  if (value !== null && typeof value !== 'number') throw new RuleError(`This card's ${name} isn't a number.`);
  return value;
}

/**
 * What a value the game works out for each player comes to for a seat, as every phrase reads one: through the runtime, which works it out
 * from its lines. The compiler lets such a name only into a game that works it out, so a missing runtime is a mistake in the code.
 */
export function playerValueOf(env: PhraseEnv, seat: PlayerId, name: string): number {
  if (!env.playerValue) throw new Error(`This phrase needs “${name}” worked out for ${seat}, but nothing works it out.`);
  return env.playerValue(env.state, seat, name);
}

/** Every card in the zones a reference names, zone by zone and slot by slot. `actor` is who “their” means. */
export const cardsInZones = (env: PhraseEnv, ref: ZoneRef, actor?: PlayerId): CardState[] =>
  resolveZoneIds(ref, env, actor).flatMap((id) => zoneCards(env.state, id));

/** Whose a card is: the seat of the zone each player has that it is in; null for a card in the center, which is no one's. */
export function ownerOf(env: PhraseEnv, card: CardState): PlayerId | null {
  return zoneInfo(env.game, card.zoneId)?.seat ?? null;
}

/** The card a test compares a card with: the card the press moves, or “it”, the card the rule is about. */
function comparedCard(env: PhraseEnv, of: 'the card' | 'it'): CardState {
  if (of === 'the card') return movedCard(env);
  const id = cardOf(env);
  const card = cardById(env.state, id);
  if (!card) throw new Error(`No card ${id} to judge.`);
  return card;
}

/**
 * Whether two values are the same as a test of a card compares them: text in any capitals, a number only with the same number. A card
 * without the value matches nothing, not even a card without it: a card that wants nothing is given it by no card, though some make nothing.
 */
function sameValue(have: Json | null, wanted: Json | null): boolean {
  if (have === null || wanted === null) return false;
  if (typeof have === 'string' && typeof wanted === 'string') return canon(have) === canon(wanted);
  return have === wanted;
}

/**
 * Whether a card passes every test: a flag it is or is not, read as `cardHasFlag` reads it (a flag set to no is one it is not); a number
 * more than a whole number, read as a group reads numbers (a card without that number does not pass); or a value the same as one written,
 * or as a value of the card the test compares it with, each read as every phrase reads one.
 */
export function passes(env: PhraseEnv, card: CardState, filters: CardFilter[]): boolean {
  return filters.every((filter) => {
    if ('flag' in filter) return cardHasFlag(env, card, filter.flag) === filter.wanted;
    if ('above' in filter) {
      const have = numberIfAny(env, card, filter.attribute);
      return have !== null && have > filter.above;
    }
    const wanted = 'is' in filter ? filter.is : cardValueOf(env, comparedCard(env, filter.sameAs.of), filter.sameAs.attribute);
    return sameValue(cardValueOf(env, card, filter.attribute), wanted);
  });
}

/** The cards a group names before its tests: those in its zones, those on the card the rule is about, or the set the press picked. */
function cardsNamed(env: PhraseEnv, group: CardGroup): CardState[] {
  if (group.kind === 'on it') return cardsOn(env.state, cardOf(env));
  if (group.kind === 'in') return group.zones.flatMap((ref) => cardsInZones(env, ref));
  return thePickedCards(env).map((id) => {
    const card = cardById(env.state, id);
    if (!card) throw new Error(`No card ${id} among the picked cards.`);
    return card;
  });
}

/**
 * The cards of a group, as a rule that adds them up or walks through them reads them: those in its zones, zone by zone and slot by slot;
 * those on the card the rule is about; or the set the button's press picked, in the order it gave them. Of those, only the cards that
 * pass the group's tests, when it has some (see `passes`).
 */
export function cardsIn(env: PhraseEnv, group: CardGroup): CardState[] {
  const cards = cardsNamed(env, group);
  const whose = group.whose ?? [];
  return whose.length === 0 ? cards : cards.filter((card) => passes(env, card, whose));
}

/**
 * A number added up over the cards of a group, each read as `cardNumber` reads it, a card without it counting as 0, in a value worked out
 * for cards as anywhere else: a crew of hands and jobs adds up the pay of its jobs. 0 over no cards.
 */
export function totalOf(env: PhraseEnv, attribute: string, group: CardGroup): number {
  return cardsIn(env, group).reduce((sum, card) => sum + (numberIfAny(env, card, attribute) ?? 0), 0);
}

/** How many cards a group holds, read as `cardsIn` reads them: those that pass its tests, when it has some. 0 over no cards. */
export function numberOfCards(env: PhraseEnv, group: CardGroup): number {
  return cardsIn(env, group).length;
}

/**
 * How many different values the cards of a group have under a name, each read as every phrase reads one (`cardValueOf`), so a value
 * worked out for cards counts as it comes to, 0 included. A card without the value adds no kind. Two values are one kind as a test of a
 * card compares them: text in upper or lower case alike, a number only with the same number, and never text with a number.
 */
export function kindsAmong(env: PhraseEnv, attribute: string, group: CardGroup): number {
  const kinds = new Set<string>();
  for (const card of cardsIn(env, group)) {
    const value = cardValueOf(env, card, attribute);
    if (value === null) continue;
    // Kept apart by type, so the text “1” and the number 1 stay two kinds, as `sameValue` keeps them.
    kinds.add(typeof value === 'string' ? `text:${canon(value)}` : `json:${JSON.stringify(value)}`);
  }
  return kinds.size;
}

/** The seat an example line names; it has to be sitting at the table. */
export const seatOf = (env: PhraseEnv, seat: Json): PlayerId => resolveSeat({ seat: seat as string }, env);

/** The space a rule is about: the one it names, else the one their piece is on. Space 0 is a space, so no `||`. */
export function itOf(env: PhraseEnv): number {
  const space = env.subject?.space ?? pieceAt(env.state, theyOf(env));
  if (space === null) throw new RuleError('They have no piece on the board.');
  return space;
}
