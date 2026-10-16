// Cards that sit on cards (R3): a card's holder is the id under `HOLDER_KEY` in its own data. Every move takes a card off its
// holder, a rule that puts it on one says so after the move, and the table is checked after every change, so that a rule which moves
// a card and forgets the cards on it is refused with the cards named.
import { zoneCards, type GameState } from '../game-state';
import type { CardState, PlayerId } from '../scene';
import { pickName } from './card-facts';
import { RuleError } from './diagnostics';
import type { CompiledGame } from './types';
import { BOX_ZONE, HOLDER_KEY, relocate, zoneIdFor, zoneInfo, zoneNameOf } from './zones';

/** What a game with no zone for cards on cards is told when a line puts one there. */
const NO_ON_CARDS_ZONE =
  'This game has no zone where cards sit on cards. End a zone line each player has with “, where every card is on a card”.';

/** The id of the card this one sits on; null when it sits on none. */
export function holderIdOf(card: CardState): string | null {
  const holder = card.data?.[HOLDER_KEY];
  return typeof holder === 'string' ? holder : null;
}

/** The cards that sit on the card `holderId`, by zone id, then slot. */
export function cardsOn(state: GameState, holderId: string): CardState[] {
  const zones = [...new Set(state.cards.filter((card) => holderIdOf(card) === holderId).map((card) => card.zoneId))].sort();
  return zones.flatMap((zoneId) => zoneCards(state, zoneId).filter((card) => holderIdOf(card) === holderId));
}

/** Moves the cards to the end of the zone, in the order given, each to sit on the card `holderId`. */
export function putOn(state: GameState, cardIds: string[], zoneId: string, holderId: string, game: CompiledGame): GameState {
  const moved = relocate(state, cardIds, zoneId, game);
  const placed = new Set(cardIds);
  return {
    ...moved,
    cards: moved.cards.map((card) => (placed.has(card.id) ? { ...card, data: { ...card.data, [HOLDER_KEY]: holderId } } : card)),
  };
}

/**
 * The seat's zone for cards that sit on cards: the first zone each player has that every card in must sit on a card, in the order
 * the Table lists them. A zone where only some cards sit on cards is never it.
 */
export function onCardsZoneOf(game: CompiledGame, seat: PlayerId): string {
  const zone = game.zones.find((spec) => spec.perPlayer && spec.onCards === 'every');
  if (!zone) throw new RuleError(NO_ON_CARDS_ZONE);
  return zoneIdFor(zone.name, seat);
}

/**
 * What is wrong with how cards sit on cards, for the first card in the state's order that has a problem; null when nothing is, and at
 * once for a game with no zone for them. A card in a zone that every card in must sit on a card sits on none; a card in a zone with no
 * such mark sits on one; or the card it sits on is gone from the table, or has gone where the card can't follow: out of sight, to
 * another player, or to the center. A card in the box is out of the game, and nothing it says counts.
 *
 * It runs after every press and every rule, and the view runs it for each card a button offers, so it decides from ids and zones alone
 * and names only the card it reports.
 */
export function attachmentProblem(game: CompiledGame, state: GameState): string | null {
  if (!game.zones.some((zone) => zone.onCards !== undefined)) return null;
  // Only a card that sits on a card needs the one it sits on, and most sit on none.
  let byId: Map<string, CardState> | null = null;
  const theCard = (card: CardState) => `The ${pickName(card, game)} in ${zoneNameOf(game, card.zoneId)}`;
  for (const card of state.cards) {
    if (card.zoneId === BOX_ZONE) continue;
    const info = zoneInfo(game, card.zoneId);
    const holderId = holderIdOf(card);
    if (holderId === null) {
      if (info?.spec.onCards === 'every') return `${theCard(card)} isn't on any card, but every card there must be.`;
      continue;
    }
    if (info?.spec.onCards === undefined) return `${theCard(card)} is on a card, but cards there don't sit on cards.`;
    byId ??= new Map(state.cards.map((c) => [c.id, c] as const));
    const holder = byId.get(holderId);
    if (!holder || holder.zoneId === BOX_ZONE) return `${theCard(card)} is on a card that is no longer on the table.`;
    const at = zoneInfo(game, holder.zoneId);
    if (at?.spec.visibility !== 'public' || at.seat === null || at.seat !== info.seat) {
      const now = zoneNameOf(game, holder.zoneId);
      return `${theCard(card)} is on the ${pickName(holder, game)}, which is now in ${now}. Move the cards on a card along with it.`;
    }
  }
  return null;
}
