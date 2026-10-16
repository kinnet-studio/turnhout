import { cardById } from '../../game-state';
import type { CardState, PlayerId } from '../../scene';
import type { Json } from '../../table-def';
import { pieceAt } from '../board-state';
import { cardAttribute, cardFact } from '../card-facts';
import { noSuchNumber, RuleError } from '../diagnostics';
import type { MoveInfo, PhraseEnv, ZoneRef } from '../types';
import { resolveSeat, resolveZoneIds } from '../zones';

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

/** A value worked out from lines is what they say, so a rule that would change one under that name is a mistake in the rule. */
export function mustBeKept(env: PhraseEnv, name: string): void {
  if (isWorked(env, name)) throw new RuleError(`“${name}” is worked out from its lines, so no rule can change it.`);
}

/**
 * The number a card has under a name, as `cardValueOf` reads it, else the sentence that says why it has none. Every phrase that does
 * arithmetic on a card's numbers reads them here. A card with no such number says so with `noSuchNumber`, which a value worked out for
 * cards takes as a line not about that card; anywhere else it is the rule's mistake, like any RuleError.
 */
export function cardNumber(env: PhraseEnv, card: CardState, name: string): number {
  const value = cardValueOf(env, card, name);
  if (value === null) throw noSuchNumber(`This card has no ${name}.`);
  if (typeof value !== 'number') throw new RuleError(`This card's ${name} isn't a number.`);
  return value;
}

/** The seat an example line names; it has to be sitting at the table. */
export const seatOf = (env: PhraseEnv, seat: Json): PlayerId => resolveSeat({ seat: seat as string }, env);

/** The space a rule is about: the one it names, else the one their piece is on. Space 0 is a space, so no `||`. */
export function itOf(env: PhraseEnv): number {
  const space = env.subject?.space ?? pieceAt(env.state, theyOf(env));
  if (space === null) throw new RuleError('They have no piece on the board.');
  return space;
}
