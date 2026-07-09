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
