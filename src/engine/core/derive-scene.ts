import type { PlayerId, Scene } from './scene';
import type { Placement, TableDef } from './table-def';

/**
 * Project a TableDef + Placement into a renderable Scene.
 * SP1 ships the omniscient identity: the viewer sees everything, so `viewer`
 * is accepted but unused. SP3 replaces the body with per-player hiding.
 */
export function deriveScene(def: TableDef, placement: Placement, _viewer?: PlayerId): Scene {
  return {
    zones: def.zones.map((z) => ({
      id: z.id,
      layout: z.layout,
      transform: z.transform,
      layoutOptions: z.layoutOptions,
    })),
    cards: placement.cards,
  };
}
