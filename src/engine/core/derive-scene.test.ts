import { describe, expect, it } from 'vitest';
import { deriveScene } from './derive-scene';
import type { Placement, TableDef } from './table-def';

describe('deriveScene (identity)', () => {
  it('maps ZoneDefs to render zones and passes cards through', () => {
    const def: TableDef = {
      zones: [
        { id: 'deck', layout: 'pile', transform: { x: -400, y: 0 }, layoutOptions: { jitter: 0.02 }, visibility: 'secret', capacity: 52 },
      ],
    };
    const placement: Placement = { cards: [{ id: 'AS', zoneId: 'deck', faceUp: false, faceKey: 'AS' }] };
    const scene = deriveScene(def, placement);
    expect(scene.zones).toEqual([
      { id: 'deck', layout: 'pile', transform: { x: -400, y: 0 }, layoutOptions: { jitter: 0.02 } },
    ]);
    expect(scene.cards).toEqual(placement.cards);
  });
});
