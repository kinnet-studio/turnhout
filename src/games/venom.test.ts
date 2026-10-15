import { describe, expect, it } from 'vitest';
import VENOM from './venom.rules?raw';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { runExamples } from '@/engine/core/lang/examples';
import { createEngine, initialState, seatsFor, tableDefFor } from '@/engine/core/lang/build';
import { parseTextFaceKey } from '@/engine/core/lang/cards';
import { unreachableZones } from '@/engine/core/lang/testing';
import { zoneCards } from '@/engine/core/game-state';
import type { GameEngine } from '@/engine/core/game-engine';

const lib = createDefaultLibrary();
const { game, diagnostics } = compileGame(VENOM, lib);

const SEEDS = [1, 2, 3, 4, 5];
const nameOf = (faceKey: string): string | undefined => parseTextFaceKey(faceKey)?.name;
const campOf = (engine: GameEngine, seat: string) => zoneCards(engine.getState(), `camp-${seat}`);

/** One turn of a player who plays the first card of their hand, or draws when their hand is empty; the name of what they played. */
function takeTurn(engine: GameEngine): string | null {
  const s = engine.getState();
  const cur = s.turn!.current;
  const [first] = zoneCards(s, `hand-${cur}`);
  if (first) {
    expect(engine.dispatch({ type: 'play', cardId: first.id, by: cur }).ok, `${cur} could not play`).toBe(true);
    return nameOf(first.faceKey) ?? null;
  }
  const top = zoneCards(s, 'deck').at(-1);
  expect(top, `${cur} is stuck with nothing to draw`).toBeDefined();
  expect(engine.dispatch({ type: 'draw', cardId: top!.id, by: cur }).ok).toBe(true);
  return null;
}

describe('Venom (designer language)', () => {
  it('compiles with no diagnostics', () => expect(diagnostics).toEqual([]));

  it('passes every example', () => {
    const results = runExamples(game!, lib);
    expect(results).toHaveLength(7);
    expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
  });

  it('has 16 cards drawn with text faces', () => {
    const cards = initialState(game!, 1).cards;
    expect(cards).toHaveLength(16);
    expect(cards.every((c) => c.faceKey.startsWith('t:'))).toBe(true);
  });

  it.each(SEEDS)('plays a complete seeded game to the player with the most cards in their camp (seed %i)', (seed) => {
    const { engine } = createEngine(game!, lib, 2, initialState(game!, seed));
    for (let step = 0; step < 200 && engine.getState().result === undefined; step++) takeTurn(engine);
    const result = engine.getState().result as { winner: string };
    expect(result?.winner).toBeDefined();
    // The game is decided on the tidied table: no card at 0 health is left in a camp to be counted.
    const camps = ['p0', 'p1'].flatMap((seat) => campOf(engine, seat));
    expect(camps.filter((c) => c.data?.health === 0)).toEqual([]);
    // A tie goes to the earliest seat.
    expect(result.winner).toBe(campOf(engine, 'p1').length > campOf(engine, 'p0').length ? 'p1' : 'p0');
  });

  it.each(SEEDS)('poisons every card in the other camp when a Viper is played into it (seed %i)', (seed) => {
    const { engine } = createEngine(game!, lib, 2, initialState(game!, seed));
    let poisonings = 0;
    for (let step = 0; step < 200 && engine.getState().result === undefined; step++) {
      const cur = engine.getState().turn!.current;
      const other = cur === 'p0' ? 'p1' : 'p0';
      const targets = campOf(engine, other).length;
      if (takeTurn(engine) !== 'Viper' || targets === 0) continue;
      poisonings++;
      // The face is what a player sees: it shows the fact beside the health.
      const faces = campOf(engine, other).map((c) => parseTextFaceKey(c.faceKey));
      expect(faces.every((face) => face?.poisoned === 'yes' && face.health !== undefined), `${other}'s camp after ${cur}'s Viper`).toBe(true);
    }
    expect(poisonings).toBeGreaterThan(0);
  });

  it('shows every card in a camp: a camp is a row, never a pile that hides all but its top card', () => {
    const camps = tableDefFor(game!, seatsFor(2)).zones.filter((z) => z.id.startsWith('camp-'));
    expect(camps.map((z) => [z.id, z.layout])).toEqual([['camp-p0', 'row'], ['camp-p1', 'row']]);
  });

  it('every compiled zone is reachable by a drag at 2 seats', () => {
    expect(unreachableZones(tableDefFor(game!, seatsFor(2)).zones, 4)).toEqual([]);
  });
});
