// What a seat's Board says, as text under its tableau line and as captions under its cards on the canvas. A fitted table draws
// only the viewer's own zones, so every seat's Board is also listed as text, and the counts a card carries are read against the
// columns they count up to. It works from the game's declared zones, counts and flags alone, and from the cards as the viewer
// sees them: a card the viewer can't see has lost its data before it gets here, and a face-down one is never named.
import { HIDDEN_FACE_KEY } from '@/engine/core/derive-scene';
import { holderIdOf } from '@/engine/core/lang/attach';
import { cardAttribute, cardFact, pickName } from '@/engine/core/lang/card-facts';
import { joinAnd } from '@/engine/core/lang/refs';
import type { CompiledGame, ZoneSpec } from '@/engine/core/lang/types';
import { zoneIdFor, zoneInfo } from '@/engine/core/lang/zones';
import { cardsByZone, type CardState, type PlayerId } from '@/engine/core/scene';
import { seatNumber } from './board-controls';

/**
 * A zone of a seat's Board: one each player has, that everyone can see. A zone where every card sits on a card is not one: its
 * cards are listed under the cards they sit on. A zone with any other mark is, since some of its cards sit on none.
 */
const isBoardZone = (spec: ZoneSpec): boolean => spec.perPlayer && spec.visibility === 'public' && spec.onCards !== 'every';

const isFaceDown = (card: CardState): boolean => card.faceKey === HIDDEN_FACE_KEY;

/** A card as the Board names it: by its name, or as a face-down card, which says nothing of what it is. */
export function cardLabel(card: CardState, game: CompiledGame): string {
  return isFaceDown(card) ? 'a face-down card' : pickName(card, game);
}

/** A name's words but its last: 'red' for 'red done'. A name of one word has none. */
const leadingWords = (name: string): string => {
  const last = name.lastIndexOf(' ');
  return last < 0 ? '' : name.slice(0, last);
};

const upperFirst = (words: string): string => words.charAt(0).toUpperCase() + words.slice(1);

/**
 * The counts on a card read against its columns, one part each: 'Red 1/2 +3 new'. A count is read against the first column in
 * the card's own data that has the same words but the last and holds a number, so 'red done' reads against 'red need'; a count
 * whose name is one word, or that has no such column, gets no part. A count named another's name with words in front
 * ('new red done') rides beside it, and only when it isn't 0. A face-down card, or one with no data, says nothing.
 */
export function countParts(card: CardState, game: CompiledGame): string[] {
  const data = card.data;
  if (isFaceDown(card) || data === undefined) return [];
  const cardFacts = game.facts.filter((fact) => fact.on === 'card');
  // A card's own facts sit in its data beside its columns, so they are skipped when looking for a column.
  const facts = new Set(cardFacts.map((fact) => fact.name));
  const counts = cardFacts.filter((fact) => fact.kind === 'number').map((fact) => fact.name);
  const ridersOf = (count: string) => counts.filter((other) => other.endsWith(` ${count}`));
  const riders = new Set(counts.flatMap(ridersOf));
  return counts.flatMap((count) => {
    const lead = leadingWords(count);
    if (lead === '' || riders.has(count)) return [];
    const column = Object.keys(data).find((key) => !facts.has(key) && leadingWords(key) === lead && typeof data[key] === 'number');
    if (column === undefined) return [];
    const extras = ridersOf(count).flatMap((rider) => {
      const value = cardAttribute(card, rider, game);
      return value === 0 ? [] : [` +${value} ${rider.slice(0, -(count.length + 1))}`];
    });
    return [`${upperFirst(lead)} ${cardAttribute(card, count, game)}/${data[column]}${extras.join('')}`];
  });
}

/** The flags set on a card, in the order the game declares them; none for a face-down card. */
function flagsOn(card: CardState, game: CompiledGame): string[] {
  if (isFaceDown(card)) return [];
  const flags = game.facts.filter((fact) => fact.on === 'card' && fact.kind === 'flag');
  return flags.filter((fact) => cardFact(card, fact.name) === true).map((fact) => fact.name);
}

/**
 * The cards on each card, by the id of the card they sit on: from any zone and any seat, in the order the Table lists their zones,
 * then by seat, then by slot. Not `cardsOn`, which reads a game state and orders zones by their ids, where the Board reads in the
 * Table's order.
 */
function cardsOnCards(game: CompiledGame, byZone: Map<string, CardState[]>): Map<string, CardState[]> {
  const rank = (zoneId: string): [number, number] => {
    const info = zoneInfo(game, zoneId);
    if (!info) return [game.zones.length, 0];
    return [game.zones.indexOf(info.spec), info.seat === null ? 0 : seatNumber(info.seat)];
  };
  const zoneIds = [...byZone.keys()].sort((a, b) => {
    const [zoneA, seatA] = rank(a);
    const [zoneB, seatB] = rank(b);
    return zoneA - zoneB || seatA - seatB;
  });
  const on = new Map<string, CardState[]>();
  for (const zoneId of zoneIds) {
    for (const card of byZone.get(zoneId)!) {
      const holderId = holderIdOf(card);
      if (holderId === null) continue;
      const held = on.get(holderId) ?? [];
      held.push(card);
      on.set(holderId, held);
    }
  }
  return on;
}

/**
 * A seat's Board as one line: a part for each of its Board zones that holds cards, in Table order, joined by ' · '. Each part is
 * 'zone: cards', its cards in slot order joined by '; ', each read as its name, its flags in brackets, its counts in square
 * brackets and the cards on it: 'workshop: Vase [Red 1/2, Gold 0/0] with Potter (tired) and Smith'. A card that sits on a card
 * is listed only under it. Empty for a seat with nothing on its Board.
 */
export function boardText(game: CompiledGame, cards: CardState[], seat: PlayerId): string {
  const byZone = cardsByZone({ zones: [], cards });
  const on = cardsOnCards(game, byZone);
  const entry = (card: CardState): string => {
    const flags = flagsOn(card, game);
    const counts = countParts(card, game);
    const held = on.get(card.id) ?? [];
    return [
      cardLabel(card, game),
      flags.length > 0 ? ` (${flags.join(', ')})` : '',
      counts.length > 0 ? ` [${counts.join(', ')}]` : '',
      held.length > 0 ? ` with ${joinAnd(held.map(entry))}` : '',
    ].join('');
  };
  return game.zones
    .filter(isBoardZone)
    .flatMap((spec) => {
      const listed = (byZone.get(zoneIdFor(spec.name, seat)) ?? []).filter((card) => holderIdOf(card) === null);
      return listed.length === 0 ? [] : [`${spec.name}: ${listed.map(entry).join('; ')}`];
    })
    .join(' · ');
}

/** The caption under each card on any seat's Board that has counts to show: its count parts, one a line. */
export function boardCaptions(game: CompiledGame, cards: CardState[]): { [cardId: string]: string } {
  const captions: { [cardId: string]: string } = {};
  for (const card of cards) {
    const info = zoneInfo(game, card.zoneId);
    if (!info || !isBoardZone(info.spec)) continue;
    const parts = countParts(card, game);
    if (parts.length > 0) captions[card.id] = parts.join('\n');
  }
  return captions;
}
