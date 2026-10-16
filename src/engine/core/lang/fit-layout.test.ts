import { describe, expect, it } from 'vitest';
import { computeZoneLayout } from '../layout';
import { TABLE_BOUNDS, type CardState } from '../scene';
import type { ZoneDef } from '../table-def';
import { placeZone } from '../zone-geometry';
import { autoLayout } from './auto-layout';
import { compileGame } from './compile';
import { fitsTable, fittedLayout } from './fit-layout';
import { createDefaultLibrary } from './library';
import { unreachableZones } from './testing';
import type { ZoneSpec } from './types';
import COLOR_MATCH from '@/games/color-match.rules?raw';
import HEARTS from '@/games/hearts.rules?raw';
import RENT_DAY from '@/games/rent-day.rules?raw';
import VENOM from '@/games/venom.rules?raw';

const lib = createDefaultLibrary();
const seats = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

const shared = (name: string, layout: ZoneSpec['layout']): ZoneSpec => ({ name, perPlayer: false, layout, visibility: 'public' });
const owned = (name: string, layout: ZoneSpec['layout'] = 'row'): ZoneSpec => ({ name, perPlayer: true, layout, visibility: 'owner' });

// A game with too many shared zones for one line: five on the first line, five on the second, then the viewer's own rows.
const MARKET: ZoneSpec[] = [
  shared('stock', 'pile'), shared('stall', 'row'), shared('lost and found', 'row'), shared('red pile', 'pile'), shared('blue pile', 'pile'),
  shared('red market', 'row'), shared('blue market', 'row'), shared('pool', 'row'), shared('stop pile', 'pile'), shared('box', 'pile'),
  owned('stash'), owned('list'), owned('peek'),
];

const cardsFor = (zone: ZoneDef, count: number): CardState[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${zone.id}#${i}`, zoneId: zone.id, faceUp: false, faceKey: 'back' }));
/** A zone's box with a row of 8 and a pile of 40, the most a long turn could put in it. */
const box = (zone: ZoneDef) => placeZone(zone, cardsFor(zone, zone.layout === 'row' ? 8 : 40));
type Box = ReturnType<typeof box>;
const overlap = (a: Box, b: Box) => Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2;
const inside = (b: Box) =>
  b.x - b.width / 2 >= TABLE_BOUNDS.min.x && b.x + b.width / 2 <= TABLE_BOUNDS.max.x &&
  b.y - b.height / 2 >= TABLE_BOUNDS.min.y && b.y + b.height / 2 <= TABLE_BOUNDS.max.y;
const at = (defs: ZoneDef[], id: string) => defs.find((d) => d.id === id)!.transform;

describe('the world', () => {
  it('is 1600 wide and 1200 tall, centred on the origin', () =>
    expect(TABLE_BOUNDS).toEqual({ min: { x: -800, y: -600 }, max: { x: 800, y: 600 } }));
});

describe('fitsTable', () => {
  const games = { Hearts: HEARTS, 'Color Match': COLOR_MATCH, Venom: VENOM, 'Rent Day': RENT_DAY };
  for (const [name, text] of Object.entries(games)) {
    const game = compileGame(text, lib).game!;
    for (let n = game.players.min; n <= game.players.max; n++) {
      it(`says ${name} fits at ${n} seats`, () => expect(fitsTable(game.zones, seats(n))).toBe(true));
    }
  }

  it.each([2, 3, 4, 5])('says a game with ten shared zones does not fit at %i seats', (n) =>
    expect(fitsTable(MARKET, seats(n))).toBe(false));
});

describe('fittedLayout', () => {
  it('has the viewer\'s zones, then the shared ones, each once', () => {
    expect(fittedLayout(MARKET, 'p1').map((d) => d.id)).toEqual([
      'stash-p1', 'list-p1', 'peek-p1',
      'stock', 'stall', 'lost-and-found', 'red-pile', 'blue-pile', 'red-market', 'blue-market', 'pool', 'stop-pile', 'box',
    ]);
  });

  it('wraps the shared zones onto lines from the top and puts the viewer\'s along the bottom', () => {
    const defs = fittedLayout(MARKET, 'p1');
    expect(at(defs, 'stock')).toEqual({ x: -540, y: -486 });
    expect(at(defs, 'stall')).toEqual({ x: -270, y: -486 });
    expect(at(defs, 'lost-and-found')).toEqual({ x: 150, y: -486 });
    expect(at(defs, 'red-pile')).toEqual({ x: 420, y: -486 });
    expect(at(defs, 'blue-pile')).toEqual({ x: 540, y: -486 });
    expect(at(defs, 'red-market')).toEqual({ x: -540, y: -306 });
    expect(at(defs, 'blue-market')).toEqual({ x: -120, y: -306 });
    expect(at(defs, 'pool')).toEqual({ x: 300, y: -306 });
    expect(at(defs, 'stop-pile')).toEqual({ x: 570, y: -306 });
    expect(at(defs, 'box')).toEqual({ x: 690, y: -306 });
    expect(at(defs, 'stash-p1')).toEqual({ x: -420, y: 510 });
    expect(at(defs, 'list-p1')).toEqual({ x: 0, y: 510 });
    expect(at(defs, 'peek-p1')).toEqual({ x: 420, y: 510 });
  });

  it('makes the same zones as the engine\'s layout: owner, visibility, layout and ordering', () => {
    const engine = autoLayout(MARKET, seats(3));
    for (const def of fittedLayout(MARKET, 'p1')) {
      const same = engine.find((d) => d.id === def.id)!;
      expect(same, def.id).toBeDefined();
      expect({ owner: def.owner, visibility: def.visibility, layout: def.layout, ordering: def.ordering })
        .toEqual({ owner: same.owner, visibility: same.visibility, layout: same.layout, ordering: same.ordering });
    }
  });

  it('names every zone, and gives a row a slot of five cards that squeezes the rest', () => {
    const defs = fittedLayout(MARKET, 'p0');
    const get = (id: string) => defs.find((d) => d.id === id)!;
    expect(get('lost-and-found').label).toBe('lost and found');
    expect(get('stash-p0').label).toBe('stash');
    for (const id of ['stash-p0', 'stall', 'pool']) {
      expect(get(id).layoutOptions).toEqual({ spacing: 75, maxWidth: 400 });
      expect(get(id).bounds).toEqual({ width: 400, height: 140 });
    }
    for (const id of ['stock', 'red-pile', 'box']) {
      expect(get(id).layoutOptions).toBeUndefined();
      expect(get(id).bounds).toBeUndefined();
    }
  });

  it('is one table for every viewer: the same shared zones, and each viewer\'s own in the same places', () => {
    const tables = seats(5).map((viewer) => fittedLayout(MARKET, viewer));
    const sharedOf = (defs: ZoneDef[]) => defs.filter((d) => d.owner === 'shared');
    const ownedBy = (defs: ZoneDef[], seat: string) => defs.filter((d) => d.owner === seat);
    const first = ownedBy(tables[0], 'p0');
    expect(first).toHaveLength(3);
    tables.forEach((defs, i) => {
      const seat = `p${i}`;
      expect(sharedOf(defs)).toEqual(sharedOf(tables[0]));
      expect(defs.filter((d) => d.owner !== 'shared' && d.owner !== seat)).toEqual([]);
      expect(ownedBy(defs, seat)).toEqual(first.map((d) => ({ ...d, id: d.id.replace('-p0', `-${seat}`), owner: seat })));
    });
  });

  // A row of 8 squeezes inside its slot, so it stays clear of the next zone, and the whole table stays inside the world.
  describe.each([2, 3, 4, 5])('with %i seats, long rows and tall piles', (n) => {
    for (const viewer of seats(n)) {
      it(`keeps every zone inside the world, apart, and reachable for ${viewer}`, () => {
        const defs = fittedLayout(MARKET, viewer);
        const boxes = defs.map((d) => [d.id, box(d)] as const);
        for (const [id, b] of boxes) expect(inside(b), `${id} leaves the world`).toBe(true);
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            expect(overlap(boxes[i][1], boxes[j][1]), `${boxes[i][0]} overlaps ${boxes[j][0]}`).toBe(false);
          }
        }
        for (const def of defs.filter((d) => d.layout === 'row')) {
          const b = placeZone(def, []);
          for (const pose of computeZoneLayout(def, cardsFor(def, 8)).values()) {
            expect(pose.x - 50, `${def.id} card reaches left of its slot`).toBeGreaterThanOrEqual(b.x - b.width / 2 - 1e-9);
            expect(pose.x + 50, `${def.id} card reaches right of its slot`).toBeLessThanOrEqual(b.x + b.width / 2 + 1e-9);
          }
        }
        expect(unreachableZones(defs, 7)).toEqual([]);
      });
    }
  });

  it('puts a hand first among the viewer\'s zones and wraps the rest above it', () => {
    const defs = fittedLayout([owned('hand', 'hand'), ...MARKET], 'p0');
    expect(at(defs, 'hand-p0')).toEqual({ x: -420, y: 491 });
    expect(at(defs, 'peek-p0')).toEqual({ x: 0, y: 292 });
    for (const def of defs) expect(inside(box(def)), `${def.id} leaves the world`).toBe(true);
    expect(unreachableZones(defs, 7)).toEqual([]);
  });
});
