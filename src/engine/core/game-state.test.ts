import { describe, expect, it } from 'vitest';
import { cardById, insertAtSlot, nextPlayer, setPhase, setTurn, zoneCards, type GameState } from './game-state';
import { makeRng } from './rng';
import type { CardState } from './scene';

const card = (id: string, zoneId: string, extra: Partial<CardState> = {}): CardState => ({
  id, zoneId, faceUp: false, faceKey: id, ...extra,
});

const base = (cards: CardState[], turn?: GameState['turn']): GameState => ({
  cards, turn, data: {}, rng: makeRng(1),
});

describe('game-state helpers', () => {
  it('zoneCards groups and orders by slot then index (SP1 ordering)', () => {
    const s = base([
      card('a', 'h', { slot: 2 }),
      card('b', 'h', { slot: 0 }),
      card('c', 'd'),
    ]);
    expect(zoneCards(s, 'h').map((c) => c.id)).toEqual(['b', 'a']);
    expect(zoneCards(s, 'd').map((c) => c.id)).toEqual(['c']);
    expect(zoneCards(s, 'ghost')).toEqual([]);
  });

  it('cardById finds or returns undefined', () => {
    const s = base([card('a', 'h')]);
    expect(cardById(s, 'a')?.id).toBe('a');
    expect(cardById(s, 'z')).toBeUndefined();
  });

  it('setTurn / setPhase are immutable', () => {
    const s = base([], { current: 'p1' });
    const s2 = setTurn(s, { current: 'p2', phase: 'draw' });
    expect(s.turn).toEqual({ current: 'p1' });
    expect(s2.turn).toEqual({ current: 'p2', phase: 'draw' });
    expect(setPhase(s2, 'play').turn).toEqual({ current: 'p2', phase: 'play' });
  });

  it('nextPlayer advances within order and wraps', () => {
    const s = base([], { current: 'p2' });
    expect(nextPlayer(s, ['p1', 'p2', 'p3']).turn!.current).toBe('p3');
    expect(nextPlayer(base([], { current: 'p3' }), ['p1', 'p2', 'p3']).turn!.current).toBe('p1');
  });

  it('nextPlayer / setPhase no-op when there is no turn', () => {
    const s = base([card('a', 'h')]);
    expect(nextPlayer(s, ['p1', 'p2'])).toBe(s);
    expect(setPhase(s, 'x')).toBe(s);
  });
});

describe('insertAtSlot', () => {
  const hand = ['a', 'b', 'c', 'd', 'e'];
  const s = base(hand.map((id, i) => card(id, 'h', { slot: i })));

  it('moves a card right and renormalizes slots to 0..n-1', () => {
    const out = insertAtSlot(s, 'a', 'h', 3);
    expect(zoneCards(out, 'h').map((c) => c.id)).toEqual(['b', 'c', 'd', 'a', 'e']);
    expect(zoneCards(out, 'h').map((c) => c.slot)).toEqual([0, 1, 2, 3, 4]);
  });

  it('moves a card left', () => {
    const out = insertAtSlot(s, 'e', 'h', 1);
    expect(zoneCards(out, 'h').map((c) => c.id)).toEqual(['a', 'e', 'b', 'c', 'd']);
  });

  it('assigns slots to previously slot-less cards', () => {
    const noSlots = base(hand.map((id) => card(id, 'h')));
    const out = insertAtSlot(noSlots, 'a', 'h', 2);
    expect(zoneCards(out, 'h').map((c) => c.id)).toEqual(['b', 'c', 'a', 'd', 'e']);
    expect(zoneCards(out, 'h').every((c) => typeof c.slot === 'number')).toBe(true);
  });

  it('moves a card in from another zone at the given position', () => {
    const s2 = base([...hand.map((id, i) => card(id, 'h', { slot: i })), card('x', 'deck')]);
    const out = insertAtSlot(s2, 'x', 'h', 1);
    expect(zoneCards(out, 'h').map((c) => c.id)).toEqual(['a', 'x', 'b', 'c', 'd', 'e']);
    expect(cardById(out, 'x')!.zoneId).toBe('h');
    expect(zoneCards(out, 'deck')).toHaveLength(0);
  });

  it('clamps out-of-range slots', () => {
    expect(zoneCards(insertAtSlot(s, 'a', 'h', 99), 'h').map((c) => c.id)).toEqual(['b', 'c', 'd', 'e', 'a']);
    expect(zoneCards(insertAtSlot(s, 'e', 'h', -1), 'h').map((c) => c.id)).toEqual(['e', 'a', 'b', 'c', 'd']);
  });

  it('keeps object identity for cards whose slot did not change', () => {
    const out = insertAtSlot(s, 'e', 'h', 1);
    expect(out.cards.find((c) => c.id === 'a')).toBe(s.cards.find((c) => c.id === 'a'));
    expect(out.cards.find((c) => c.id === 'b')).not.toBe(s.cards.find((c) => c.id === 'b'));
  });

  it('returns the state unchanged for an unknown card', () => {
    expect(insertAtSlot(s, 'zz', 'h', 0)).toBe(s);
  });
});
