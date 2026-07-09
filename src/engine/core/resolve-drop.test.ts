import { describe, expect, it } from 'vitest';
import { resolveDrop } from './hittest';
import { RuleRegistry } from './rules';
import { registerStarterRules } from './rules-library';
import type { CardState } from './scene';
import type { ZoneDef } from './table-def';

const reg = registerStarterRules(new RuleRegistry());
const card = (id: string, suit: string, rank: number): CardState => ({
  id, zoneId: 'src', faceUp: true, faceKey: id, data: { suit, rank },
});

const zones: ZoneDef[] = [
  { id: 'table', layout: 'free', transform: { x: 0, y: 0 }, bounds: { width: 2000, height: 2000 } },
  { id: 'foundation', layout: 'pile', transform: { x: 300, y: 0 }, accept: { rule: 'sameSuitAscending' }, bounds: { width: 100, height: 140 } },
];
const empty = () => [];

describe('resolveDrop', () => {
  it('returns the topmost accepting zone', () => {
    // Ace onto the empty foundation → accepted; foundation is last (topmost).
    expect(resolveDrop({ x: 300, y: 0 }, zones, empty, card('AS', 'S', 1), reg)).toEqual({ zoneId: 'foundation', slot: 0 });
  });

  it('falls through to a lower zone when the top one rejects the card', () => {
    // A 5 is rejected by the foundation (needs Ace on empty) → falls to 'table'.
    expect(resolveDrop({ x: 300, y: 0 }, zones, empty, card('5S', 'S', 5), reg)).toEqual({ zoneId: 'table', slot: 0 });
  });

  it('returns null when the point is outside every zone', () => {
    expect(resolveDrop({ x: 9999, y: 9999 }, zones, empty, card('AS', 'S', 1), reg)).toBeNull();
  });

  it('reports the append slot from the zone occupants', () => {
    const occupants = (zoneId: string): CardState[] => (zoneId === 'table' ? [card('a', 'H', 2), card('b', 'H', 3)] : []);
    // 'table' is ordering-default 'stack' → slot = occupant count = 2.
    expect(resolveDrop({ x: 0, y: 0 }, zones, occupants, card('c', 'H', 4), reg)).toEqual({ zoneId: 'table', slot: 2 });
  });
});
