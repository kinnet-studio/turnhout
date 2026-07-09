import { describe, expect, it } from 'vitest';
import { RuleRegistry, canAccept } from './rules';
import { registerStarterRules } from './rules-library';
import type { CardState } from './scene';
import type { ZoneDef } from './table-def';

const reg = registerStarterRules(new RuleRegistry());
const card = (suit: string, rank: number, tags: string[] = []): CardState => ({
  id: `${rank}${suit}`, zoneId: 'src', faceUp: true, faceKey: `${rank}${suit}`, data: { suit, rank, tags },
});
const zone = (accept: ZoneDef['accept'], extra: Partial<ZoneDef> = {}): ZoneDef => ({
  id: 'z', layout: 'pile', transform: { x: 0, y: 0 }, accept, ...extra,
});

describe('descAltColor', () => {
  const z = zone({ rule: 'descAltColor' });
  it('accepts a King onto an empty zone', () => {
    expect(canAccept(z, card('S', 13), [], reg)).toBe(true);
  });
  it('rejects a non-King onto an empty zone', () => {
    expect(canAccept(z, card('S', 12), [], reg)).toBe(false);
  });
  it('accepts red 6 on black 7', () => {
    expect(canAccept(z, card('H', 6), [card('S', 7)], reg)).toBe(true);
  });
  it('rejects red 6 on red 7 (same color)', () => {
    expect(canAccept(z, card('H', 6), [card('D', 7)], reg)).toBe(false);
  });
  it('rejects red 5 on black 7 (not one below)', () => {
    expect(canAccept(z, card('H', 5), [card('S', 7)], reg)).toBe(false);
  });
});

describe('sameSuitAscending', () => {
  const z = zone({ rule: 'sameSuitAscending' });
  it('accepts an Ace onto empty', () => {
    expect(canAccept(z, card('S', 1), [], reg)).toBe(true);
  });
  it('accepts same-suit next rank up', () => {
    expect(canAccept(z, card('S', 2), [card('S', 1)], reg)).toBe(true);
  });
  it('rejects a different suit', () => {
    expect(canAccept(z, card('H', 2), [card('S', 1)], reg)).toBe(false);
  });
});

describe('matchRankOrSuit', () => {
  const z = zone({ rule: 'matchRankOrSuit' });
  it('accepts same rank', () => {
    expect(canAccept(z, card('H', 7), [card('S', 7)], reg)).toBe(true);
  });
  it('accepts same suit', () => {
    expect(canAccept(z, card('S', 3), [card('S', 7)], reg)).toBe(true);
  });
  it('rejects a mismatch', () => {
    expect(canAccept(z, card('H', 3), [card('S', 7)], reg)).toBe(false);
  });
});

describe('byTag and emptyOnly', () => {
  it('byTag accepts when a required tag is present', () => {
    const z = zone({ rule: 'byTag', params: { tags: ['creature'] } });
    expect(canAccept(z, card('S', 3, ['creature']), [], reg)).toBe(true);
    expect(canAccept(z, card('S', 3, ['land']), [], reg)).toBe(false);
  });
  it('emptyOnly accepts only when the zone is empty', () => {
    const z = zone({ rule: 'emptyOnly' });
    expect(canAccept(z, card('S', 3), [], reg)).toBe(true);
    expect(canAccept(z, card('S', 3), [card('H', 9)], reg)).toBe(false);
  });
});
