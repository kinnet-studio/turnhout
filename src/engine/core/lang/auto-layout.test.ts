import { describe, expect, it } from 'vitest';
import { autoLayout } from './auto-layout';
import { unreachableZones } from './testing';
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
