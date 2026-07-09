import { describe, expect, it, vi } from 'vitest';
import { GameEngine } from './game-engine';
import { MoveRegistry } from './moves';
import { registerCoreMoves } from './moves-library';
import { nextPlayer, zoneCards, type GameState } from './game-state';
import { makeRng } from './rng';
import { RuleRegistry } from './rules';
import type { CardState } from './scene';
import type { TableDef } from './table-def';

const card = (id: string, zoneId: string): CardState => ({ id, zoneId, faceUp: false, faceKey: id });
const tableDef: TableDef = {
  players: ['p1', 'p2'],
  zones: [
    { id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } },
    { id: 'hand', layout: 'row', transform: { x: 0, y: 300 } },
  ],
};
const rules = new RuleRegistry();
const initial = (): GameState => ({
  cards: [card('a', 'deck'), card('b', 'deck'), card('c', 'deck')],
  turn: { current: 'p1' },
  data: {},
  rng: makeRng(5),
});

const makeEngine = () => new GameEngine({ tableDef, rules, moves: registerCoreMoves(new MoveRegistry()), initial: initial() });

describe('GameEngine', () => {
  it('applies a legal move, appends to the log, and notifies', () => {
    const e = makeEngine();
    const seen = vi.fn();
    e.subscribe(seen);
    const r = e.dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 2, faceUp: true });
    expect(r.ok).toBe(true);
    expect(zoneCards(e.getState(), 'hand')).toHaveLength(2);
    expect(e.getLog()).toHaveLength(1);
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('rejects an illegal move without touching the log or state', () => {
    const e = makeEngine();
    const r = e.dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 99 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBeTypeOf('string');
    expect(e.getLog()).toHaveLength(0);
    expect(zoneCards(e.getState(), 'hand')).toHaveLength(0);
  });

  it('throws on an unknown move type', () => {
    const e = makeEngine();
    expect(() => e.dispatch({ type: 'teleport' })).toThrow(/teleport/);
  });

  it('canDispatch reports legality without mutating', () => {
    const e = makeEngine();
    expect(e.canDispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 1 })).toBe(true);
    expect(e.getLog()).toHaveLength(0);
  });

  it('undo reverts via replay; undo on empty log is a no-op', () => {
    const e = makeEngine();
    e.dispatch({ type: 'flip', cardId: 'a', faceUp: true });
    e.dispatch({ type: 'flip', cardId: 'b', faceUp: true });
    e.undo();
    expect(e.getLog()).toHaveLength(1);
    expect(e.getState().cards.find((c) => c.id === 'b')!.faceUp).toBe(false);
    e.undo();
    e.undo();
    expect(e.getLog()).toHaveLength(0);
  });

  it('reset clears the log back to initial', () => {
    const e = makeEngine();
    e.dispatch({ type: 'flip', cardId: 'a' });
    e.reset();
    expect(e.getLog()).toHaveLength(0);
    expect(e.getState().cards.find((c) => c.id === 'a')!.faceUp).toBe(false);
  });

  it('unsubscribe stops notifications', () => {
    const e = makeEngine();
    const seen = vi.fn();
    const off = e.subscribe(seen);
    off();
    e.dispatch({ type: 'flip', cardId: 'a' });
    expect(seen).not.toHaveBeenCalled();
  });

  it('determinism seam: loadLog reproduces state exactly (incl. shuffle RNG)', () => {
    const a = makeEngine();
    a.dispatch({ type: 'shuffle', zoneId: 'deck' });
    a.dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 2 });
    const b = new GameEngine({ tableDef, rules, moves: registerCoreMoves(new MoveRegistry()), initial: initial() });
    b.loadLog([...a.getLog()]);
    expect(b.getState()).toEqual(a.getState());
  });

  it('supports a custom move with a turn check (extension path)', () => {
    const moves = registerCoreMoves(new MoveRegistry());
    moves.register('endTurn', {
      legal: (s, m) => (s.turn?.current === (m.player as string) ? true : 'not your turn'),
      apply: (s) => nextPlayer(s, ['p1', 'p2']),
    });
    const e = new GameEngine({ tableDef, rules, moves, initial: initial() });
    expect(e.dispatch({ type: 'endTurn', player: 'p2' }).ok).toBe(false);
    expect(e.dispatch({ type: 'endTurn', player: 'p1' }).ok).toBe(true);
    expect(e.getState().turn!.current).toBe('p2');
  });
});
