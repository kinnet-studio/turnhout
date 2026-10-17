// The cards of a state by zone and by id, worked out once for each cards array. A state is never changed once made, nor is its cards
// array or any card in it, so what is worked out from one array stays true as long as anything holds it, and a WeakMap lets it go with
// the array. These answer exactly as game-state's `zoneCards` and `cardById` do (which every rule and view asks many times of the same
// state, and which game-state, being protected, cannot cache itself), and `zoneCards` hands each caller an array of its own, as
// game-state's does.
import { cardsByZone, type CardState } from '../scene';
import type { GameState } from '../game-state';

const zonesOf = new WeakMap<readonly CardState[], Map<string, CardState[]>>();
const idsOf = new WeakMap<readonly CardState[], Map<string, CardState>>();

/** The cards of `zoneId` in slot order, as game-state's `zoneCards` gives them; a new array each time. */
export function zoneCards(state: GameState, zoneId: string): CardState[] {
  let zones = zonesOf.get(state.cards);
  if (zones === undefined) {
    zones = cardsByZone({ cards: state.cards, zones: [] });
    zonesOf.set(state.cards, zones);
  }
  const cards = zones.get(zoneId);
  return cards === undefined ? [] : cards.slice();
}

/** The first card whose id is `id`, as game-state's `cardById` finds it. */
export function cardById(state: GameState, id: string): CardState | undefined {
  let ids = idsOf.get(state.cards);
  if (ids === undefined) {
    ids = new Map();
    for (const card of state.cards) if (!ids.has(card.id)) ids.set(card.id, card);
    idsOf.set(state.cards, ids);
  }
  return ids.get(id);
}
