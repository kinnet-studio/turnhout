import type { Move } from '../moves';
import type { PlayerId } from '../scene';
import { tableDefFor } from './build';
import { moveZoneId } from './declared-moves';
import type { CompiledGame } from './types';
import { zoneIdFor } from './zones';

/**
 * The move a player means by dragging a card: rearranging it within a zone of their own that the phase lets them
 * rearrange, else the first move the phase declares from the zone it left to the zone it landed in. Null when no
 * rule covers the drag.
 */
export function moveForDrop(
  game: CompiledGame,
  seats: PlayerId[],
  phase: string | undefined,
  seat: PlayerId,
  intent: { cardId: string; fromZoneId: string; toZoneId: string | null; slot: number },
): Move | null {
  const { cardId, fromZoneId, toZoneId, slot } = intent;
  if (toZoneId === null) return null;
  const current = game.phases.find((p) => p.id === phase);
  if (!current) return null;

  if (fromZoneId === toZoneId && current.rearrange.some((name) => zoneIdFor(name, seat) === fromZoneId)) {
    const ordering = tableDefFor(game, seats).zones.find((z) => z.id === fromZoneId)?.ordering;
    if (ordering === 'free') return { type: 'reorder', cardId, slot };
  }

  const declared = current.moves.find((d) =>
    moveZoneId(d.from, seats, seat) === fromZoneId && moveZoneId(d.to, seats, seat) === toZoneId);
  return declared ? { type: declared.verb, cardId, toZone: toZoneId } : null;
}
