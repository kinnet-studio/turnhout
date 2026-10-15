import { describe, expect, it } from 'vitest';
import HEARTS from './hearts.rules?raw';
import { canPlay, compileGame } from '@/engine/core/lang/compile';
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

  it('replays to the same table: undoing every move gets back to the start, and the log rebuilds the end', () => {
    const fresh = () => createEngine(game!, lib, 4, initialState(game!, 42)).engine;
    const { engine } = createEngine(game!, lib, 4, initialState(game!, 42));
    const start = engine.getState();
    for (const seat of seatsFor(4)) {
      for (let i = 0; i < 3; i++) engine.dispatch({ type: 'pass', cardId: zoneCards(engine.getState(), `hand-${seat}`)[0].id, by: seat });
    }
    for (let step = 0; step < 52; step++) {
      const cur = engine.getState().turn!.current;
      zoneCards(engine.getState(), `hand-${cur}`).some((c) => engine.dispatch({ type: 'play', cardId: c.id, by: cur }).ok);
    }
    const end = engine.getState();
    const log = [...engine.getLog()];
    expect(end.result).toBeDefined();
    expect(log).toHaveLength(64);

    const replayed = fresh();
    replayed.loadLog(log);
    expect(replayed.getState()).toEqual(end);

    while (engine.getLog().length > 0) engine.undo();
    expect(engine.getState()).toEqual(start);
    expect(engine.getState()).toEqual(fresh().getState());
  });

  it('same seed → same id-to-card mapping; ids stay opaque', () => {
    const map = (seed: number) => initialState(game!, seed).cards.map((c) => `${c.id}:${c.faceKey}`);
    expect(map(7)).toEqual(map(7));
    expect(map(7)).not.toEqual(map(8));
    expect(initialState(game!, 7).cards.every((c) => /^c\d+$/.test(c.id))).toBe(true);
  });
});

describe('Hearts with a mistake in it', () => {
  const compiled = (from: string, to: string) => {
    expect(HEARTS).toContain(from);
    return compileGame(HEARTS.replace(from, to), lib);
  };

  it.each([
    ['Shuffle the deck.', 'Shuffle the dek.', 15, 'dek', 'deck'],
    ["Move the trick to the winner's won pile.", "Move the trik to the winner's won pile.", 44, 'trik', 'trick'],
    ['A player may play a card from their hand to the trick.', 'A player may play a card from their hnad to the trick.', 33, 'hnad', 'hand'],
  ])('names a misspelt zone and suggests the real one, with no developer stub: %s', (from, to, line, name, meant) => {
    const result = compiled(from, to);
    expect(result.diagnostics).toEqual([expect.objectContaining({ line, severity: 'error', kind: 'invalid', message: `There is no zone called “${name}”.`, suggestions: [meant] })]);
    expect(result.diagnostics[0].stub).toBeUndefined();
    expect(canPlay(result).ok).toBe(false);
  });

  it('reports a mistyped move line on that line as a card move, and makes no button of it', () => {
    const result = compiled('A player may pass a card from their hand to their pass pile.', 'A player may pass a card form their hand to their pass pile.');
    expect(result.diagnostics.map((d) => [d.line, d.severity, d.message])).toEqual([
      [22, 'error', 'I can\'t read this card move. Write it as “A player may <verb> a card from <zone> to <zone>.”'],
    ]);
    expect(result.game).toBeUndefined();
  });

  it('reports a broken deck line once, and holds back the card names it leaves undefined', () => {
    const result = compiled('A standard 52-card deck', 'A standard 52 card deck');
    expect(result.diagnostics.map((d) => [d.line, d.severity, d.message])).toEqual([
      [5, 'error', '“A standard 52 card deck, aces high, starting in the deck” isn\'t in the phrase library yet.'],
      [30, 'warning', 'Some lines below can\'t be checked until line 5 is fixed.'],
    ]);
    expect(result.diagnostics[0].suggestions).toContain('a standard 52-card deck, aces high, starting in [zone]');
    expect(result.diagnostics[1].stub).toBeUndefined();
    expect(canPlay(result).ok).toBe(false);
  });

  it('reports a broken player count once instead of on every line that names a player', () => {
    const result = compiled('Players: 4', 'Players: four');
    expect(result.diagnostics.map((d) => [d.line, d.severity, d.message])).toEqual([
      [2, 'error', 'Say how many players, like “Players: 4” or “Players: 2 to 5”.'],
      [56, 'warning', 'Some lines below can\'t be checked until line 2 is fixed.'],
    ]);
    expect(canPlay(result)).toEqual({ ok: false, reason: 'Fix 1 problem in the rules first.' });
  });
});
