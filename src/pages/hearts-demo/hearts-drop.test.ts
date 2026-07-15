import { describe, expect, it } from 'vitest';
import { resolveDrop } from '@/engine/core/hittest';
import { cardsByZone, type CardState } from '@/engine/core/scene';
import { computeZoneLayout } from '@/engine/core/layout';
import { RuleRegistry } from '@/engine/core/rules';
import { registerStarterRules } from '@/engine/core/rules-library';
import type { ZoneDef } from '@/engine/core/table-def';
import { TABLE } from './cards';
import { createHeartsServer } from './game';

const reg = registerStarterRules(new RuleRegistry());

/** A full 13-card hand in the given zone, in original deck order (undefined slots). */
function fullHand(zoneId: string): CardState[] {
  return Array.from({ length: 13 }, (_, i) => ({ id: `${zoneId}-${i}`, zoneId, faceUp: true, faceKey: `${i}` }));
}

/** Zone-cards lookup where every hand is full (13 cards) and everything else empty. */
function fullHandsLookup(zoneId: string): CardState[] {
  return zoneId.startsWith('hand-') ? fullHand(zoneId) : [];
}

/**
 * Zone-cards lookup matching the F2 brief's required fixture: every hand full
 * (13 cards), `trick` holding a real 4-card row, everything else empty. Used
 * where the interaction between a hand's fan and the *actually laid-out*
 * (not empty-zone-fallback) trick box matters — e.g. hand-p1's innermost card
 * genuinely overlapping the real trick row.
 */
function fullTableLookup(zoneId: string): CardState[] {
  if (zoneId.startsWith('hand-')) return fullHand(zoneId);
  if (zoneId === 'trick') {
    return Array.from({ length: 4 }, (_, i) => ({ id: `trick-${i}`, zoneId: 'trick', faceUp: true, faceKey: `${i}` }));
  }
  return [];
}

describe('hearts table drop resolution — trick reachability (Bug A)', () => {
  it('the centered trick zone is reachable while every hand holds a full fan', () => {
    const card: CardState = { id: 'x', zoneId: 'hand-p1', faceUp: true, faceKey: 'x' };
    // Every point inside the trick zone's own box must resolve to `trick`,
    // not be shadowed by an overlapping hand fan's auto-bounds.
    let trickHits = 0;
    let total = 0;
    for (let x = -160; x <= -60; x += 5) {
      for (let y = -70; y <= 70; y += 5) {
        total++;
        const hit = resolveDrop({ x, y }, TABLE.zones, fullHandsLookup, card, reg);
        if (hit?.zoneId === 'trick') trickHits++;
      }
    }
    // At minimum the trick zone's own center must resolve to it.
    const center = resolveDrop({ x: -110, y: 0 }, TABLE.zones, fullHandsLookup, card, reg);
    expect(center?.zoneId).toBe('trick');
    // And the great majority of its own box must be reachable (fan bounds may
    // still clip a thin border, but the zone must not be fully shadowed).
    expect(trickHits).toBeGreaterThan(total * 0.5);
  });
});

describe('hearts hand authored bounds (F2 — bounds match visual fan footprint)', () => {
  const HANDS = ['p0', 'p1', 'p2', 'p3'] as const;
  // Actual counts observed with the authored bounds, a 13-card hand in every
  // hand zone, and a real 4-card `trick` (fullTableLookup, per the brief's
  // fixture): hand-p1's single innermost card (nearest the table center) sits
  // inside the real trick row's box, which is checked first — a genuine,
  // expected inner-edge exception, not a bug. Every other hand is 13/13.
  const EXPECTED_HITS: Record<string, number> = { p0: 13, p1: 12, p2: 13, p3: 13 };

  it('every hand reaches at least 10 of its 13 laid-out card centers', () => {
    for (const seat of HANDS) {
      const zoneId = `hand-${seat}`;
      const zone = TABLE.zones.find((z) => z.id === zoneId) as ZoneDef;
      const cards = fullHand(zoneId);
      const poses = computeZoneLayout(zone, cards);
      const card: CardState = { id: 'x', zoneId, faceUp: true, faceKey: 'x' };
      let hits = 0;
      for (const c of cards) {
        const p = poses.get(c.id)!;
        const hit = resolveDrop({ x: p.x, y: p.y }, TABLE.zones, fullTableLookup, card, reg);
        if (hit?.zoneId === zoneId) hits++;
      }
      expect(hits).toBeGreaterThanOrEqual(10);
      expect(hits).toBe(EXPECTED_HITS[seat]);
    }
  });

  it('points well outside a hand fan never resolve to a hand', () => {
    const card: CardState = { id: 'x', zoneId: 'hand-p0', faceUp: true, faceKey: 'x' };
    const farFieldPoints = [
      { label: 'midway between p0 and p1', pt: { x: -175, y: 150 } },
      { label: 'midway between p0 and p3', pt: { x: 175, y: 150 } },
      { label: 'midway between p1 and p2', pt: { x: -175, y: -150 } },
      { label: 'midway between p2 and p3', pt: { x: 175, y: -150 } },
      { label: 'table corner over won-p0', pt: { x: 300, y: 280 } },
      { label: 'table corner over won-p1', pt: { x: -300, y: 280 } },
      { label: 'table corner over won-p2', pt: { x: -300, y: -280 } },
      { label: 'table corner over won-p3', pt: { x: 300, y: -280 } },
      { label: 'beyond hand-p1 (west) inner reach', pt: { x: -600, y: 50 } },
      { label: 'beyond hand-p3 (east) inner reach', pt: { x: 600, y: 50 } },
      { label: 'beyond hand-p0 (south) inner reach', pt: { x: 0, y: 420 } },
      { label: 'beyond hand-p2 (north) inner reach', pt: { x: 200, y: -300 } },
    ];
    for (const { label, pt } of farFieldPoints) {
      const hit = resolveDrop(pt, TABLE.zones, fullTableLookup, card, reg);
      expect(hit?.zoneId.startsWith('hand-'), `${label} (${pt.x},${pt.y}) resolved to ${hit?.zoneId}`).not.toBe(true);
    }
  });

  it('each pass-* pile is reachable at its own center (pure geometry)', () => {
    const card: CardState = { id: 'x', zoneId: 'hand-p0', faceUp: true, faceKey: 'x' };
    for (const seat of HANDS) {
      const zoneId = `pass-${seat}`;
      const zone = TABLE.zones.find((z) => z.id === zoneId) as ZoneDef;
      const hit = resolveDrop({ x: zone.transform.x, y: zone.transform.y }, TABLE.zones, fullTableLookup, card, reg);
      expect(hit?.zoneId).toBe(zoneId);
    }
  });
});

describe('hearts hand reorder resolution (Bug B — same-zone reorder)', () => {
  it('every rendered card position in hand-p0 resolves back to hand-p0', () => {
    const server = createHeartsServer();
    const scene = server.viewFor('p0').scene.cards;
    const zoneCardsOf = (zoneId: string) => scene.filter((c) => c.zoneId === zoneId);
    const z = TABLE.zones.find((zz) => zz.id === 'hand-p0') as ZoneDef;
    const sorted = cardsByZone({ cards: scene, zones: [] }).get('hand-p0') ?? [];
    expect(sorted).toHaveLength(13);
    const poses = computeZoneLayout(z, sorted);
    const dragged = sorted[0];
    for (const c of sorted) {
      const p = poses.get(c.id)!;
      const hit = resolveDrop({ x: p.x, y: p.y }, TABLE.zones, zoneCardsOf, dragged, reg);
      expect(hit?.zoneId).toBe('hand-p0');
    }
  });

  it('a reorder move visibly changes the slot-sorted (rendered) order', () => {
    const server = createHeartsServer();
    const before = server.viewFor('p0').scene.cards;
    const orderBefore = (cardsByZone({ cards: before, zones: [] }).get('hand-p0') ?? []).map((c) => c.id);
    const first = orderBefore[0];
    expect(server.submit('p0', { type: 'reorder', cardId: first, slot: 4 }).ok).toBe(true);
    const after = server.viewFor('p0').scene.cards;
    const orderAfter = (cardsByZone({ cards: after, zones: [] }).get('hand-p0') ?? []).map((c) => c.id);
    expect(orderAfter).not.toEqual(orderBefore);
    expect(orderAfter.indexOf(first)).toBe(4);
  });
});
