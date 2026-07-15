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
