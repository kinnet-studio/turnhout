import { describe, expect, it } from 'vitest';
import HEARTS from './hearts.rules?raw';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { runExamples } from '@/engine/core/lang/examples';
import { createEngine, initialState, seatsFor } from '@/engine/core/lang/build';
import { zoneCards } from '@/engine/core/game-state';

const lib = createDefaultLibrary();
const { game, diagnostics } = compileGame(HEARTS, lib);

describe('Hearts (designer language)', () => {
  it('compiles with no diagnostics', () => expect(diagnostics).toEqual([]));

  it('passes every example', () => {
    const results = runExamples(game!, lib);
    expect(results).toHaveLength(11);
    expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
  });

  it('plays a complete seeded hand: pass, 52 plays, 26 points', () => {
    const { engine } = createEngine(game!, lib, 4, initialState(game!, 42));
    for (const seat of seatsFor(4)) {
      for (let i = 0; i < 3; i++) {
        const hand = zoneCards(engine.getState(), `hand-${seat}`);
        expect(engine.dispatch({ type: 'pass', cardId: hand[0].id, by: seat }).ok).toBe(true);
      }
    }
    expect(engine.getState().turn?.phase).toBe('playing');
    for (const seat of seatsFor(4)) expect(zoneCards(engine.getState(), `hand-${seat}`)).toHaveLength(13);
    for (let step = 0; step < 52; step++) {
      const cur = engine.getState().turn!.current;
      const hand = zoneCards(engine.getState(), `hand-${cur}`);
      expect(hand.some((c) => engine.dispatch({ type: 'play', cardId: c.id, by: cur }).ok)).toBe(true);
    }
    const result = engine.getState().result as { scores: Record<string, number>; winner: string };
    expect(Object.values(result.scores).reduce((a, b) => a + b, 0)).toBe(26);
    expect(seatsFor(4)).toContain(result.winner);
  });

  it('same seed → same id-to-card mapping; ids stay opaque', () => {
    const map = (seed: number) => initialState(game!, seed).cards.map((c) => `${c.id}:${c.faceKey}`);
    expect(map(7)).toEqual(map(7));
    expect(map(7)).not.toEqual(map(8));
    expect(initialState(game!, 7).cards.every((c) => /^c\d+$/.test(c.id))).toBe(true);
  });
});
