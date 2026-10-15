import { describe, expect, it } from 'vitest';
import COLOR_MATCH from './color-match.rules?raw';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { runExamples } from '@/engine/core/lang/examples';
import { createEngine, initialState, seatsFor, tableDefFor } from '@/engine/core/lang/build';
import { unreachableZones } from '@/engine/core/lang/testing';
import { zoneCards } from '@/engine/core/game-state';

const lib = createDefaultLibrary();
const { game, diagnostics } = compileGame(COLOR_MATCH, lib);

describe('Color Match (designer language)', () => {
  it('compiles with no diagnostics', () => expect(diagnostics).toEqual([]));

  it('passes every example', () => {
    const results = runExamples(game!, lib);
    expect(results).toHaveLength(7);
    expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
  });

  it('has 72 cards drawn with text faces', () => {
    const cards = initialState(game!, 1).cards;
    expect(cards).toHaveLength(72);
    expect(cards.every((c) => c.faceKey.startsWith('t:'))).toBe(true);
  });

  it.each([2, 3, 4, 5])('plays a complete seeded game with %i players', (n) => {
    const { engine } = createEngine(game!, lib, n, initialState(game!, 100 + n));
    for (let step = 0; step < 3000 && engine.getState().result === undefined; step++) {
      const s = engine.getState();
      const cur = s.turn!.current;
      const played = zoneCards(s, `hand-${cur}`).some((c) => engine.dispatch({ type: 'play', cardId: c.id, by: cur }).ok);
      if (!played) {
        const top = zoneCards(s, 'draw-pile').at(-1);
        expect(top, `${cur} is stuck with nothing to draw`).toBeDefined();
        expect(engine.dispatch({ type: 'draw', cardId: top!.id, by: cur }).ok).toBe(true);
      }
    }
    const result = engine.getState().result as { winner: string };
    expect(result?.winner).toBeDefined();
    expect(zoneCards(engine.getState(), `hand-${result.winner}`)).toHaveLength(0);
  });

  it.each([2, 3, 4, 5])('every compiled zone is reachable by a drag at %i seats', (n) => {
    expect(unreachableZones(tableDefFor(game!, seatsFor(n)).zones, 7)).toEqual([]);
  });
});
