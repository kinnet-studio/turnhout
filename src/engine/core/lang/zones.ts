import { zoneCards, type GameState } from '../game-state';
import type { CardState, PlayerId } from '../scene';
import { endTurnLog } from './board-state';
import { RuleError } from './diagnostics';
import type { CardMatch, CompiledGame, PhraseEnv, SeatRef, ZoneRef, ZoneSpec } from './types';

/** Out-of-play zone used by examples; it is not part of any game. */
export const BOX_ZONE = '__box';
/** `state.data` key holding the seat that won the last trick or round. */
export const WINNER_KEY = 'lang:winner';

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

export function resolveSeat(ref: SeatRef, env: PhraseEnv, actor?: PlayerId): PlayerId {
  if ('seat' in ref) {
    if (!env.seats.includes(ref.seat)) throw new RuleError(`There is no player ${ref.seat} at this table.`);
    return ref.seat;
  }
  if (ref.who === 'actor') {
    const by = actor ?? env.move?.by;
    if (by === undefined) throw new RuleError('Only a rule about a player\'s move can say “their”.');
    return by;
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

/**
 * Moves cards to the end of a zone, in the order given. Cards end up face up only in public
 * zones of the game; any other zone (secret, owner, or outside the game) holds them face down.
 */
export function relocate(state: GameState, cardIds: string[], toZoneId: string, game: CompiledGame): GameState {
  const moving = new Set(cardIds);
  const existing = zoneCards(state, toZoneId).filter((c) => !moving.has(c.id));
  const start = Math.max(existing.length, ...existing.map((c) => (c.slot ?? -1) + 1));
  const faceUp = zoneInfo(game, toZoneId)?.spec.visibility === 'public';
  const byId = new Map(state.cards.map((c) => [c.id, c] as const));
  const moved = new Map<string, CardState>();
  cardIds.forEach((id, i) => {
    const card = byId.get(id);
    if (!card) throw new Error(`No card ${id} to move.`);
    moved.set(id, { ...card, zoneId: toZoneId, slot: start + i, faceUp });
  });
  return { ...state, cards: state.cards.map((c) => moved.get(c.id) ?? c) };
}

/**
 * Makes `seat` the next player; the flow then skips its usual end-of-turn step. A board game's record of what the
 * turn did ends with it, so the next player starts with a clean one.
 */
export function chooseNext(state: GameState, seat: PlayerId): GameState {
  const chosen = { ...state, turn: { ...state.turn, current: seat, chosen: true } };
  return endTurnLog(chosen);
}
