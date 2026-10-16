import { zoneCards, type GameState } from '../game-state';
import type { CardState, PlayerId } from '../scene';
import { clearTurnLog } from './board-state';
import { RuleError } from './diagnostics';
import type { CardMatch, CompiledGame, PhraseEnv, SeatRef, ZoneRef, ZoneSpec } from './types';

/** Out-of-play zone used by examples; it is not part of any game. */
export const BOX_ZONE = '__box';
/** `state.data` key holding the seat that won the last trick or round. */
export const WINNER_KEY = 'lang:winner';
/** The key in a card's own `data` holding the id of the card it sits on; a card that sits on nothing has none. */
export const HOLDER_KEY = 'lang:on';

/** What is said when “the other player” is asked of a game that is not for two. */
export const NEEDS_TWO = '“the other player” needs a game for two players.';

const SEAT_SUFFIX = /^p\d+$/;

/** 'pass pile' → 'pass-pile': lowercase words joined by dashes. */
export function slug(name: string): string {
  return name
    .replace(/['‘’]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/** The zone id for a named zone: shared zones are just the slug, per-player zones add the seat. */
export function zoneIdFor(name: string, seat?: PlayerId): string {
  return seat === undefined ? slug(name) : `${slug(name)}-${seat}`;
}

/** Which of the game's zones an id names, and whose it is; null for ids the game does not have. */
export function zoneInfo(game: CompiledGame, zoneId: string): { spec: ZoneSpec; seat: PlayerId | null } | null {
  for (const spec of game.zones) {
    const base = slug(spec.name);
    if (!spec.perPlayer) {
      if (base === zoneId) return { spec, seat: null };
    } else if (zoneId.startsWith(`${base}-`)) {
      const seat = zoneId.slice(base.length + 1);
      if (SEAT_SUFFIX.test(seat)) return { spec, seat };
    }
  }
  return null;
}

/** A zone by its id, as a designer names it: “the shop”, “p0's stash”; an id the game does not have, as it is. */
export function zoneNameOf(game: CompiledGame, zoneId: string): string {
  const info = zoneInfo(game, zoneId);
  if (!info) return zoneId;
  return info.seat === null ? `the ${info.spec.name}` : `${info.seat}'s ${info.spec.name}`;
}

/** The one seat that is not `seat`, at a table of two. */
export function otherSeat(seats: PlayerId[], seat: PlayerId): PlayerId {
  if (seats.length !== 2) throw new RuleError(NEEDS_TWO);
  const others = seats.filter((s) => s !== seat);
  if (others.length !== 1) throw new RuleError(`There is no player ${seat} at this table.`);
  return others[0];
}

/** Who “their” and “the other player” mean: who was asked for, else whoever makes the move, else whoever the rule is about. */
const actorOf = (env: PhraseEnv, actor?: PlayerId): PlayerId | undefined => actor ?? env.move?.by ?? env.subject?.player ?? undefined;

export function resolveSeat(ref: SeatRef, env: PhraseEnv, actor?: PlayerId): PlayerId {
  if ('seat' in ref) {
    if (!env.seats.includes(ref.seat)) throw new RuleError(`There is no player ${ref.seat} at this table.`);
    return ref.seat;
  }
  if (ref.who === 'actor') {
    const by = actorOf(env, actor);
    if (by === undefined) throw new RuleError('Only a rule about a player\'s move can say “their”.');
    return by;
  }
  if (ref.who === 'other') {
    const by = actorOf(env, actor);
    if (by === undefined) throw new RuleError('Only a rule about a player can say “the other player”.');
    return otherSeat(env.seats, by);
  }
  const winner = env.state.data[WINNER_KEY];
  if (typeof winner !== 'string') throw new RuleError('There is no winner yet.');
  return winner;
}

export function resolveZoneIds(ref: ZoneRef, env: PhraseEnv, actor?: PlayerId): string[] {
  if ('shared' in ref) return [zoneIdFor(ref.shared)];
  if ('each' in ref) return env.seats.map((seat) => zoneIdFor(ref.each, seat));
  return [zoneIdFor(ref.zone, resolveSeat(ref.of, env, actor))];
}

/** The seat's hand: the per-player zone called “hand”, else the first per-player zone laid out as a hand. */
export function handZoneOf(game: CompiledGame, seat: PlayerId): string {
  const owned = game.zones.filter((z) => z.perPlayer && z.layout === 'hand');
  const hand = owned.find((z) => slug(z.name) === 'hand') ?? owned[0];
  if (!hand) throw new RuleError('This game has no hand. Give each player one, like “Each player has a hand that only they can see.”');
  return zoneIdFor(hand.name, seat);
}

/** The next seat in turn order. */
export function leftOf(seat: PlayerId, seats: PlayerId[]): PlayerId {
  const i = seats.indexOf(seat);
  if (i < 0) throw new RuleError(`There is no player ${seat} at this table.`);
  return seats[(i + 1) % seats.length];
}

export function matchesCard(card: CardState, match: CardMatch): boolean {
  return Object.entries(match).every(([key, value]) => card.data?.[key] === value);
}

/** The card on top of a zone: the last one in slot order. */
export function topCard(state: GameState, zoneId: string): CardState | undefined {
  return zoneCards(state, zoneId).at(-1);
}

/** The card off whatever card it sat on; a card that sat on none comes back as it is, `data` and all. */
export function withoutHolder(card: CardState): CardState {
  if (card.data === undefined || !Object.hasOwn(card.data, HOLDER_KEY)) return card;
  const data = { ...card.data };
  delete data[HOLDER_KEY];
  return { ...card, data };
}

/**
 * Moves cards to the end of a zone, in the order given. Cards end up face up only in public
 * zones of the game; any other zone (secret, owner, or outside the game) holds them face down.
 * A card that moves comes off any card it sat on: a rule that puts it on one says so after the move.
 */
export function relocate(state: GameState, cardIds: string[], toZoneId: string, game: CompiledGame): GameState {
  const moving = new Set(cardIds);
  const existing = zoneCards(state, toZoneId).filter((c) => !moving.has(c.id));
  // A card with no slot sorts by its place in state.cards, so a moved card numbered after it could tie with it and
  // land second from the end. Number such a zone's cards 0 to n-1 in their current order first, as toBottom does.
  const unslotted = existing.some((c) => c.slot === undefined);
  const renumbered = new Map(existing.map((c, i) => [c.id, i] as const));
  const start = unslotted ? existing.length : Math.max(existing.length, ...existing.map((c) => (c.slot ?? -1) + 1));
  const faceUp = zoneInfo(game, toZoneId)?.spec.visibility === 'public';
  const byId = new Map(state.cards.map((c) => [c.id, c] as const));
  const moved = new Map<string, CardState>();
  cardIds.forEach((id, i) => {
    const card = byId.get(id);
    if (!card) throw new Error(`No card ${id} to move.`);
    moved.set(id, { ...withoutHolder(card), zoneId: toZoneId, slot: start + i, faceUp });
  });
  return {
    ...state,
    cards: state.cards.map((c) => {
      const slot = unslotted ? renumbered.get(c.id) : undefined;
      return moved.get(c.id) ?? (slot === undefined ? c : { ...c, slot });
    }),
  };
}

/**
 * Puts a card under every other card of a zone and numbers the zone's slots 0 to n-1 with it first, so a pile that is drawn
 * from the top comes round to the card again only after all the others. Like `relocate`, it ends up face up only in a public zone,
 * on no card.
 */
export function toBottom(state: GameState, cardId: string, zoneId: string, game: CompiledGame): GameState {
  if (!state.cards.some((c) => c.id === cardId)) throw new Error(`No card ${cardId} to move.`);
  const faceUp = zoneInfo(game, zoneId)?.spec.visibility === 'public';
  const slots = new Map([cardId, ...zoneCards(state, zoneId).filter((c) => c.id !== cardId).map((c) => c.id)].map((id, slot) => [id, slot] as const));
  return {
    ...state,
    cards: state.cards.map((c) => {
      if (c.id === cardId) return { ...withoutHolder(c), zoneId, slot: 0, faceUp };
      const slot = slots.get(c.id);
      return slot === undefined ? c : { ...c, slot };
    }),
  };
}

/**
 * Makes `seat` the next player; the flow then skips its usual end-of-turn step. The turn passes, so what every seat
 * did in it stops counting.
 */
export function chooseNext(state: GameState, seat: PlayerId): GameState {
  const chosen = { ...state, turn: { ...state.turn, current: seat, chosen: true } };
  return clearTurnLog(chosen);
}
