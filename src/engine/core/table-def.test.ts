import { describe, expect, it } from 'vitest';
import type { Placement, TableDef } from './table-def';

describe('table schema', () => {
  it('is JSON-serializable and round-trips', () => {
    const def: TableDef = {
      players: ['p1', 'p2'],
      zones: [
        { id: 'deck', layout: 'pile', transform: { x: 0, y: 0 }, visibility: 'secret' },
        { id: 'hand', layout: 'fan', transform: { x: 0, y: 300 }, owner: 'p1', visibility: 'owner' },
        {
          id: 'foundation', layout: 'pile', transform: { x: 400, y: 0 },
          capacity: 13, accept: { rule: 'sameSuitAscending' },
          bounds: { width: 100, height: 140, anchor: { x: 0.5, y: 0.5 } },
        },
      ],
    };
    const placement: Placement = {
      cards: [{ id: 'AS', zoneId: 'deck', faceUp: false, faceKey: 'AS', revealTo: ['p1'] }],
    };
    expect(JSON.parse(JSON.stringify(def))).toEqual(def);
    expect(JSON.parse(JSON.stringify(placement))).toEqual(placement);
  });
});
