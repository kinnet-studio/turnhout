import { describe, expect, it } from 'vitest';
import { registerCoreFlow } from './flow-library';
import { FlowRegistry } from './flow-registry';
import { zoneCards, type GameState } from './game-state';
import type { MoveContext } from './moves';
import { makeRng } from './rng';
import { RuleRegistry } from './rules';
import type { CardState } from './scene';

const reg = registerCoreFlow(new FlowRegistry());
const ctx: MoveContext = { tableDef: { zones: [] }, rules: new RuleRegistry() };
const card = (id: string, zoneId: string, slot?: number): CardState => ({ id, zoneId, faceUp: false, faceKey: 'x', slot });
const mk = (cards: CardState[]): GameState => ({ cards, turn: { current: 'a' }, data: {}, rng: makeRng(7) });

describe('core flow predicates', () => {
  const s = mk([card('c1', 'a'), card('c2', 'a'), card('c3', 'b')]);
  it('always / zoneEmpty / zonesEmpty', () => {
    expect(reg.predicate('always')!(s, ctx)).toBe(true);
    expect(reg.predicate('zoneEmpty')!(s, ctx, { zone: 'z' })).toBe(true);
    expect(reg.predicate('zoneEmpty')!(s, ctx, { zone: 'a' })).toBe(false);
    expect(reg.predicate('zonesEmpty')!(s, ctx, { zones: ['z', 'y'] })).toBe(true);
    expect(reg.predicate('zonesEmpty')!(s, ctx, { zones: ['z', 'a'] })).toBe(false);
  });
  it('zoneCount / zonesCount are exact', () => {
    expect(reg.predicate('zoneCount')!(s, ctx, { zone: 'a', count: 2 })).toBe(true);
    expect(reg.predicate('zoneCount')!(s, ctx, { zone: 'a', count: 1 })).toBe(false);
    expect(reg.predicate('zonesCount')!(s, ctx, { zones: ['b'], count: 1 })).toBe(true);
    expect(reg.predicate('zonesCount')!(s, ctx, { zones: ['a', 'b'], count: 1 })).toBe(false);
  });
});

describe('core flow effects', () => {
  it('moveZone moves every card and drops slots', () => {
    const out = reg.effect('moveZone')!(mk([card('c1', 'a', 3), card('c2', 'a', 1), card('c3', 'b', 0)]), ctx, { from: 'a', to: 'b' });
    expect(zoneCards(out, 'a')).toHaveLength(0);
    expect(zoneCards(out, 'b')).toHaveLength(3);
    expect(out.cards.find((c) => c.id === 'c1')!.slot).toBeUndefined();
  });
  it('setData writes a key', () => {
    const out = reg.effect('setData')!(mk([]), ctx, { key: 'k', value: 42 });
    expect(out.data.k).toBe(42);
  });
  it('deal moves the top N and can flip', () => {
    const out = reg.effect('deal')!(mk([card('c1', 'a', 0), card('c2', 'a', 1), card('c3', 'a', 2)]), ctx, { from: 'a', to: 'b', count: 2, faceUp: true });
    expect(zoneCards(out, 'a').map((c) => c.id)).toEqual(['c1']);
    expect(zoneCards(out, 'b').every((c) => c.faceUp)).toBe(true);
  });
  it('shuffleZone is deterministic from state.rng and advances it', () => {
    const s = mk([card('c1', 'a', 0), card('c2', 'a', 1), card('c3', 'a', 2), card('c4', 'a', 3)]);
    const out1 = reg.effect('shuffleZone')!(s, ctx, { zone: 'a' });
    const out2 = reg.effect('shuffleZone')!(s, ctx, { zone: 'a' });
    expect(out1.cards.map((c) => c.slot)).toEqual(out2.cards.map((c) => c.slot)); // same rng in → same order
    expect(out1.rng.count).toBeGreaterThan(s.rng.count);
  });
});

describe('roundRobin policy', () => {
  it('advances one seat and wraps', () => {
    const p = reg.policy('roundRobin')!;
    expect(p(mk([]), ['a', 'b', 'c'], ctx)).toBe('b');
    const s: GameState = { cards: [], turn: { current: 'c' }, data: {}, rng: makeRng(1) };
    expect(p(s, ['a', 'b', 'c'], ctx)).toBe('a');
  });
});
