import type { CardState, PlayerId, Scene } from './scene';
import type { Placement, TableDef, ZoneDef } from './table-def';

export const HIDDEN_FACE_KEY = 'back';

/** Whether `viewer` (a real player id) may see the true face of `card`. */
export function isRevealed(card: CardState, zone: ZoneDef | undefined, viewer: PlayerId): boolean {
  return (
    card.faceUp === true ||
    (zone?.visibility ?? 'public') === 'public' ||
    (zone?.visibility === 'owner' && zone.owner === viewer) ||
    card.revealTo === 'all' ||
    (Array.isArray(card.revealTo) && card.revealTo.includes(viewer))
  );
}

/** Keep only the positional x/y of a card's data; drop identity-bearing fields. */
export function keepPositionalOnly(data: CardState['data']): CardState['data'] {
  if (!data) return data;
  const out: { x?: number; y?: number } = {};
  if (typeof data.x === 'number') out.x = data.x;
  if (typeof data.y === 'number') out.y = data.y;
  return out;
}

/**
 * Project one card into what `viewer` should see.
 * INVARIANT: card `id`s MUST be opaque / non-identifying. Projection preserves
 * `id` (the renderer animates by id) while scrubbing faceKey + identity data, so
 * an identity-encoding id (e.g. 'AS') would leak the card's identity to a viewer
 * who may not see its face.
 */
export function projectCard(card: CardState, zone: ZoneDef | undefined, viewer: PlayerId): CardState {
  if (isRevealed(card, zone, viewer)) return { ...card, faceUp: true };
  return { ...card, faceUp: false, faceKey: HIDDEN_FACE_KEY, data: keepPositionalOnly(card.data) };
}

/**
 * Project a TableDef + Placement into the Scene a viewer should see.
 * `viewer === undefined` returns the omniscient identity (backward-compatible);
 * a named viewer gets per-player hiding.
 */
export function deriveScene(def: TableDef, placement: Placement, viewer?: PlayerId): Scene {
  const zones = def.zones.map((z) => ({ id: z.id, layout: z.layout, transform: z.transform, layoutOptions: z.layoutOptions }));
  if (viewer === undefined) return { zones, cards: placement.cards };
  const zoneById = new Map(def.zones.map((z) => [z.id, z]));
  const cards = placement.cards.map((c) => projectCard(c, zoneById.get(c.zoneId), viewer));
  return { zones, cards };
}
