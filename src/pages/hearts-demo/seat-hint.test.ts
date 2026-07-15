import { describe, expect, it } from 'vitest';
import { seatHint } from './hearts-demo-page';
import type { ClientView } from '@/engine/net/protocol';

const view = (extra: Partial<ClientView> = {}): ClientView => ({
  seat: 'p0',
  scene: { cards: [], zones: [] },
  turn: { current: 'p0', phase: 'passing' },
  ...extra,
});

describe('seatHint', () => {
  it('returns empty string for a null view', () => {
    expect(seatHint(null, 'p0')).toBe('');
  });

  it('passing phase: shows progress toward 3 passed cards', () => {
    const v0 = view({ scene: { cards: [], zones: [] } });
    expect(seatHint(v0, 'p0')).toBe('passing — drag 3 cards to your pass pile (0/3)');

    const v2 = view({
      scene: {
        cards: [
          { id: 'a', zoneId: 'pass-p0', faceUp: true, faceKey: '1S' },
          { id: 'b', zoneId: 'pass-p0', faceUp: true, faceKey: '2S' },
        ],
        zones: [],
      },
    });
    expect(seatHint(v2, 'p0')).toBe('passing — drag 3 cards to your pass pile (2/3)');

    const v3 = view({
      scene: {
        cards: [
          { id: 'a', zoneId: 'pass-p0', faceUp: true, faceKey: '1S' },
          { id: 'b', zoneId: 'pass-p0', faceUp: true, faceKey: '2S' },
          { id: 'c', zoneId: 'pass-p0', faceUp: true, faceKey: '3S' },
        ],
        zones: [],
      },
    });
    expect(seatHint(v3, 'p0')).toBe('passed ✓ — waiting for the other seats');
  });

  it('playing phase: on-turn vs off-turn', () => {
    const onTurn = view({ turn: { current: 'p0', phase: 'playing' } });
    expect(seatHint(onTurn, 'p0')).toBe('your turn — drag a card to the center');

    const offTurn = view({ turn: { current: 'p1', phase: 'playing' } });
    expect(seatHint(offTurn, 'p0')).toBe('waiting for p1');
  });

  it('result set: reports game over regardless of phase', () => {
    const v = view({ result: { winner: 'p0' } });
    expect(seatHint(v, 'p0')).toBe(`game over — ${JSON.stringify({ winner: 'p0' })}`);
  });

  it('falls back to a generic phase/turn line for unrecognized phases', () => {
    const v = view({ turn: { current: 'p2', phase: 'scoring' } });
    expect(seatHint(v, 'p0')).toBe('phase: scoring — turn: p2');
  });
});
