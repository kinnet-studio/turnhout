import { describe, expect, it } from 'vitest';
import { registerCoreMoves } from './moves-library';
import { MoveRegistry, type MoveContext } from './moves';
import { zoneCards, type GameState } from './game-state';
import { makeRng } from './rng';
import { RuleRegistry } from './rules';
import { registerStarterRules } from './rules-library';
import type { CardState } from './scene';
import type { TableDef } from './table-def';

const card = (id: string, zoneId: string, extra: Partial<CardState> = {}): CardState => ({
  id, zoneId, faceUp: false, faceKey: id, ...extra,
});

const tableDef: TableDef = {
  zones: [
    { id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } },
    { id: 'hand', layout: 'row', transform: { x: 0, y: 300 } },
    { id: 'foundation', layout: 'pile', transform: { x: 300, y: 0 }, accept: { rule: 'sameSuitAscending' } },
    { id: 'guarded', layout: 'pile', transform: { x: 600, y: 0 }, accept: { rule: 'ghostRule' } },
    { id: 'fan', layout: 'fan', transform: { x: 0, y: 600 }, owner: 'p1', visibility: 'owner', ordering: 'free' },
    { id: 'open-fan', layout: 'row', transform: { x: 0, y: 900 }, ordering: 'free' },
  ],
};

const ctx: MoveContext = { tableDef, rules: registerStarterRules(new RuleRegistry()) };
const registry = registerCoreMoves(new MoveRegistry());
const state = (cards: CardState[], seed = 1): GameState => ({ cards, data: {}, rng: makeRng(seed) });

describe('move', () => {
  const h = registry.get('move')!;
  it('is legal when the target zone accepts and applies the zone change', () => {
    const s = state([card('AS', 'deck', { data: { suit: 'S', rank: 1 } })]);
    const m = { type: 'move', cardId: 'AS', toZone: 'foundation' };
    expect(h.legal(s, m, ctx)).toBe(true);
    expect(h.apply(s, m, ctx).cards[0].zoneId).toBe('foundation');
  });
  it('rejects when the rule rejects the card', () => {
    const s = state([card('5S', 'deck', { data: { suit: 'S', rank: 5 } })]);
    expect(h.legal(s, { type: 'move', cardId: '5S', toZone: 'foundation' }, ctx)).toBeTypeOf('string');
  });
  it('rejects (does not throw) when the zone references an unknown rule', () => {
    const s = state([card('AS', 'deck', { data: { suit: 'S', rank: 1 } })]);
    expect(h.legal(s, { type: 'move', cardId: 'AS', toZone: 'guarded' }, ctx)).toBeTypeOf('string');
  });
  it('rejects unknown card / zone', () => {
    const s = state([card('AS', 'deck')]);
    expect(h.legal(s, { type: 'move', cardId: 'ZZ', toZone: 'hand' }, ctx)).toBeTypeOf('string');
    expect(h.legal(s, { type: 'move', cardId: 'AS', toZone: 'ghostzone' }, ctx)).toBeTypeOf('string');
  });
  it('sets slot when provided', () => {
    const s = state([card('AS', 'deck')]);
    const out = h.apply(s, { type: 'move', cardId: 'AS', toZone: 'hand', slot: 3 }, ctx);
    expect(out.cards[0].slot).toBe(3);
  });
  it('inserts at the drop slot in a free-ordered zone and renormalizes', () => {
    const s = state([card('a', 'fan', { slot: 0 }), card('b', 'fan', { slot: 1 }), card('x', 'deck')]);
    const out = h.apply(s, { type: 'move', cardId: 'x', toZone: 'fan', slot: 1 }, ctx);
    expect(zoneCards(out, 'fan').map((c) => c.id)).toEqual(['a', 'x', 'b']);
    expect(zoneCards(out, 'fan').map((c) => c.slot)).toEqual([0, 1, 2]);
  });
});

describe('flip', () => {
  const h = registry.get('flip')!;
  it('toggles by default and sets explicitly', () => {
    const s = state([card('AS', 'deck', { faceUp: false })]);
    expect(h.apply(s, { type: 'flip', cardId: 'AS' }, ctx).cards[0].faceUp).toBe(true);
    expect(h.apply(s, { type: 'flip', cardId: 'AS', faceUp: false }, ctx).cards[0].faceUp).toBe(false);
  });
});

describe('deal', () => {
  const h = registry.get('deal')!;
  const deck = state([card('a', 'deck'), card('b', 'deck'), card('c', 'deck')]);
  it('moves the top count cards to the target zone', () => {
    const out = h.apply(deck, { type: 'deal', fromZone: 'deck', toZone: 'hand', count: 2, faceUp: true }, ctx);
    expect(zoneCards(out, 'hand').map((c) => c.id).sort()).toEqual(['b', 'c']);
    expect(zoneCards(out, 'hand').every((c) => c.faceUp)).toBe(true);
    expect(zoneCards(out, 'deck').map((c) => c.id)).toEqual(['a']);
  });
  it('rejects when the source has too few cards', () => {
    expect(h.legal(deck, { type: 'deal', fromZone: 'deck', toZone: 'hand', count: 9 }, ctx)).toBeTypeOf('string');
  });
  it('rejects dealing into an unknown zone', () => {
    expect(h.legal(deck, { type: 'deal', fromZone: 'deck', toZone: 'ghostzone', count: 1 }, ctx)).toBeTypeOf('string');
  });
  it('moves nothing when count is 0', () => {
    const out = h.apply(deck, { type: 'deal', fromZone: 'deck', toZone: 'hand', count: 0 }, ctx);
    expect(zoneCards(out, 'hand')).toHaveLength(0);
    expect(zoneCards(out, 'deck')).toHaveLength(3);
  });
});

describe('shuffle', () => {
  const h = registry.get('shuffle')!;
  const deck = state([card('a', 'd'), card('b', 'd'), card('c', 'd'), card('d', 'd'), card('e', 'd')], 123);
  const td: TableDef = { zones: [{ id: 'd', layout: 'pile', transform: { x: 0, y: 0 } }] };
  const sctx: MoveContext = { tableDef: td, rules: ctx.rules };
  it('permutes deterministically, assigns slots, advances rng, same multiset', () => {
    const out1 = h.apply(deck, { type: 'shuffle', zoneId: 'd' }, sctx);
    const out2 = h.apply(deck, { type: 'shuffle', zoneId: 'd' }, sctx);
    expect(zoneCards(out1, 'd').map((c) => c.id)).toEqual(zoneCards(out2, 'd').map((c) => c.id));
    expect(zoneCards(out1, 'd').map((c) => c.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(out1.cards.every((c) => typeof c.slot === 'number')).toBe(true);
    expect(out1.rng.count).toBe(4);
  });
  it('is legal only for an existing zone', () => {
    expect(h.legal(deck, { type: 'shuffle', zoneId: 'ghost' }, sctx)).toBeTypeOf('string');
    expect(h.legal(deck, { type: 'shuffle', zoneId: 'd' }, sctx)).toBe(true);
  });
});

describe('reorder', () => {
  const h = registry.get('reorder')!;
  const fanState = state(['a', 'b', 'c', 'd', 'e'].map((id, i) => card(id, 'fan', { slot: i })));

  it('is legal in a free-ordered zone and renormalizes the order', () => {
    const m = { type: 'reorder', cardId: 'a', slot: 3 };
    expect(h.legal(fanState, m, ctx)).toBe(true);
    const out = h.apply(fanState, m, ctx);
    expect(zoneCards(out, 'fan').map((c) => c.id)).toEqual(['b', 'c', 'd', 'a', 'e']);
    expect(zoneCards(out, 'fan').map((c) => c.slot)).toEqual([0, 1, 2, 3, 4]);
  });

  it('clamps an out-of-range slot', () => {
    const out = h.apply(fanState, { type: 'reorder', cardId: 'a', slot: 99 }, ctx);
    expect(zoneCards(out, 'fan').map((c) => c.id)).toEqual(['b', 'c', 'd', 'e', 'a']);
  });

  it('rejects a zone that is not free-ordered', () => {
    const s = state([card('a', 'deck')]);
    expect(h.legal(s, { type: 'reorder', cardId: 'a', slot: 0 }, ctx)).toBeTypeOf('string');
  });

  it('enforces zone ownership when `by` is present', () => {
    expect(h.legal(fanState, { type: 'reorder', cardId: 'a', slot: 0, by: 'p2' }, ctx)).toBeTypeOf('string');
    expect(h.legal(fanState, { type: 'reorder', cardId: 'a', slot: 0, by: 'p1' }, ctx)).toBe(true);
  });

  it('is not turn-gated (legal off-turn)', () => {
    const offTurn: GameState = { ...fanState, turn: { current: 'p2' } };
    expect(h.legal(offTurn, { type: 'reorder', cardId: 'a', slot: 0, by: 'p1' }, ctx)).toBe(true);
  });

  it('rejects an unknown card', () => {
    expect(h.legal(fanState, { type: 'reorder', cardId: 'zz', slot: 0 }, ctx)).toBeTypeOf('string');
  });

  it('rejects a missing or non-numeric slot', () => {
    expect(h.legal(fanState, { type: 'reorder', cardId: 'a' }, ctx)).toBeTypeOf('string');
    expect(h.legal(fanState, { type: 'reorder', cardId: 'a', slot: 'top' }, ctx)).toBeTypeOf('string');
  });

  it('is a harmless no-op in a single-card zone', () => {
    const s = state([card('a', 'fan')]);
    const out = h.apply(s, { type: 'reorder', cardId: 'a', slot: 5 }, ctx);
    expect(zoneCards(out, 'fan').map((c) => c.id)).toEqual(['a']);
  });

  it('allows reorder with `by` in an ownerless free zone', () => {
    const s = state([card('a', 'open-fan'), card('b', 'open-fan')]);
    expect(h.legal(s, { type: 'reorder', cardId: 'a', slot: 1, by: 'p2' }, ctx)).toBe(true);
  });
});
