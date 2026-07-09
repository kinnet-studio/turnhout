import { cardsByZone, type CardState, type PlayerId } from './scene';
import type { Json } from './table-def';
import type { RngState } from './rng';

export type { RngState };

export interface TurnState {
  current: PlayerId;
  phase?: string;
}

export interface GameState {
  cards: CardState[];
  turn?: TurnState;
  data: Record<string, Json>;
  rng: RngState;
}

export function zoneCards(state: GameState, zoneId: string): CardState[] {
  return cardsByZone({ cards: state.cards, zones: [] }).get(zoneId) ?? [];
}

export function cardById(state: GameState, id: string): CardState | undefined {
  return state.cards.find((c) => c.id === id);
}

export function setTurn(state: GameState, turn: TurnState): GameState {
  return { ...state, turn };
}

export function nextPlayer(state: GameState, order: PlayerId[]): GameState {
  if (!state.turn || order.length === 0) return state;
  const i = order.indexOf(state.turn.current);
  const next = order[(i + 1) % order.length];
  return { ...state, turn: { ...state.turn, current: next } };
}

export function setPhase(state: GameState, phase: string): GameState {
  if (!state.turn) return state;
  return { ...state, turn: { ...state.turn, phase } };
}

/**
 * Move `cardId` into `zoneId` at position `slot` (clamped), renormalizing every
 * card in that zone to slot 0..n-1. Cards whose zone+slot are unchanged keep
 * object identity so diff/choreography see no phantom changes.
 */
export function insertAtSlot(state: GameState, cardId: string, zoneId: string, slot: number): GameState {
  const moved = cardById(state, cardId);
  if (!moved) return state;
  const rest = zoneCards(state, zoneId).filter((c) => c.id !== cardId);
  const at = Math.max(0, Math.min(slot, rest.length));
  const ordered = [...rest.slice(0, at), moved, ...rest.slice(at)];
  const slotById = new Map(ordered.map((c, i) => [c.id, i] as const));
  return {
    ...state,
    cards: state.cards.map((c) => {
      const s = slotById.get(c.id);
      if (s === undefined) return c;
      return c.zoneId === zoneId && c.slot === s ? c : { ...c, zoneId, slot: s };
    }),
  };
}
