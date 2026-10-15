import { describe, expect, it } from 'vitest';
import { placeZone } from '../zone-geometry';
import type { ZoneDef } from '../table-def';
import { autoLayout } from './auto-layout';
import { fixtureCard, unreachableZones } from './testing';
import type { ZoneSpec } from './types';

const HEARTS: ZoneSpec[] = [
  { name: 'deck', perPlayer: false, layout: 'pile', visibility: 'secret' },
  { name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' },
  { name: 'pass pile', perPlayer: true, layout: 'pile', visibility: 'owner' },
  { name: 'won pile', perPlayer: true, layout: 'pile', visibility: 'public' },
  { name: 'trick', perPlayer: false, layout: 'row', visibility: 'public' },
];
const COLOR_MATCH: ZoneSpec[] = [
  { name: 'draw pile', perPlayer: false, layout: 'pile', visibility: 'secret' },
  { name: 'discard pile', perPlayer: false, layout: 'pile', visibility: 'public' },
  { name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' },
];
// A two-player game whose players each keep a row of cards in front of them, beside the shared piles in the middle.
const ROW_GAME: ZoneSpec[] = [
  { name: 'deck', perPlayer: false, layout: 'pile', visibility: 'secret' },
  { name: 'discard pile', perPlayer: false, layout: 'pile', visibility: 'public' },
  { name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' },
  { name: 'camp', perPlayer: true, layout: 'row', visibility: 'public' },
];
const seats = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

describe('autoLayout', () => {
  it('maps specs to zone defs with ids, owners, layouts and the contract order', () => {
    const defs = autoLayout(HEARTS, seats(4));
    expect(defs.map((d) => d.id)).toEqual([
      'hand-p0', 'hand-p1', 'hand-p2', 'hand-p3',
      'pass-pile-p0', 'won-pile-p0', 'pass-pile-p1', 'won-pile-p1', 'pass-pile-p2', 'won-pile-p2', 'pass-pile-p3', 'won-pile-p3',
      'deck', 'trick',
    ]);
    expect(defs[0]).toMatchObject({ layout: 'fan', owner: 'p0', visibility: 'owner', ordering: 'free' });
    expect(defs.at(-1)).toMatchObject({ layout: 'row', owner: 'shared', ordering: 'ordered', layoutOptions: { spacing: 75 } });
  });

  it('seats p0 at the bottom and p1 on the left for 4 players', () => {
    const [p0, p1] = autoLayout(HEARTS, seats(4));
    expect(Math.abs(p0.transform.x)).toBeLessThan(1);
    expect(p0.transform.y).toBeGreaterThan(0);
    expect(p1.transform.x).toBeLessThan(0);
  });

  it('keeps every Hearts zone reachable at 4 seats', () => expect(unreachableZones(autoLayout(HEARTS, seats(4)), 13)).toEqual([]));
  it.each([2, 3, 5])('keeps every Hearts zone reachable at %i seats', (n) =>
    expect(unreachableZones(autoLayout(HEARTS, seats(n)), 13)).toEqual([]));
  it.each([2, 3, 4, 5])('keeps every Color Match zone reachable at %i seats', (n) =>
    expect(unreachableZones(autoLayout(COLOR_MATCH, seats(n)), 7)).toEqual([]));

  it('unreachableZones reports a zone shadowed by a later one', () => {
    const defs = autoLayout(COLOR_MATCH, seats(2));
    const shadow = { ...defs[defs.length - 1], id: 'shadow', transform: defs[0].transform, bounds: { width: 2000, height: 2000 } };
    expect(unreachableZones([...defs, shadow], 7)).toContainEqual(expect.stringMatching(/^hand-p0: centre goes to shadow$/));
  });

  it('unreachableZones reports a hand whose cards are mostly covered, and a centre that goes nowhere', () => {
    const defs = autoLayout(COLOR_MATCH, seats(2));
    const shadow = { ...defs[defs.length - 1], id: 'shadow', transform: defs[0].transform, bounds: { width: 2000, height: 2000 } };
    expect(unreachableZones([...defs, shadow], 7)).toContain('hand-p0: only 0 of 7 card centres reachable');
    const full = defs.map((d) => (d.id === 'draw-pile' ? { ...d, capacity: 1 } : d));
    expect(unreachableZones(full, 7)).toEqual(['draw-pile: centre goes to nothing']);
  });
});

describe('autoLayout of a row each player keeps', () => {
  const box = (def: ZoneDef, cards: number) =>
    placeZone(def, Array.from({ length: cards }, (_, i) => fixtureCard(`${def.id}#${i}`, def.id, {})));
  const overlaps = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) =>
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2;
  const zone = (defs: ZoneDef[], id: string) => defs.find((d) => d.id === id)!;

  // A card is 140 tall and a hand's drop box reaches 75 above and 103 below its seat, so a row in front of the seat has to sit
  // nearer the middle than a pile does, or it covers the corners of the hand's cards and takes the drops meant for the hand.
  it.each([1, 3, 5])('keeps the row of the top and bottom seats, of %i cards, clear of their hand at 2 seats', (cards) => {
    const defs = autoLayout(ROW_GAME, seats(2));
    for (const seat of seats(2)) {
      const hand = box(zone(defs, `hand-${seat}`), 13);
      expect(overlaps(box(zone(defs, `camp-${seat}`), cards), hand), `${seat}'s camp of ${cards} reaches into its hand`).toBe(false);
    }
  });

  it('keeps every zone reachable, the rows too', () => expect(unreachableZones(autoLayout(ROW_GAME, seats(2)), 4)).toEqual([]));

  it('keeps the two rows apart, and each on its own side of the middle', () => {
    const defs = autoLayout(ROW_GAME, seats(2));
    expect(overlaps(box(zone(defs, 'camp-p0'), 5), box(zone(defs, 'camp-p1'), 5))).toBe(false);
    expect(zone(defs, 'camp-p0').transform.y).toBeGreaterThan(0);
    expect(zone(defs, 'camp-p1').transform.y).toBeLessThan(0);
  });

  it('leaves the piles of a seat where they were, at the usual distance from the middle', () => {
    const defs = autoLayout(HEARTS, seats(4));
    expect(zone(defs, 'pass-pile-p0').transform).toEqual({ x: 60, y: 191 });
    expect(zone(defs, 'won-pile-p0').transform).toEqual({ x: -60, y: 191 });
  });

  it('leaves the rows of a seat that is not at the top or bottom where the piles go', () => {
    const defs = autoLayout(ROW_GAME, seats(3));
    const hand = zone(defs, 'hand-p1');
    const camp = zone(defs, 'camp-p1');
    expect(camp.transform.x / hand.transform.x).toBeCloseTo(0.66, 1);
    expect(camp.transform.y / hand.transform.y).toBeCloseTo(0.66, 1);
  });
});
