import { describe, expect, it } from 'vitest';
import { cardById, nextPlayer, setPhase, setTurn, zoneCards, type GameState } from './game-state';
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
