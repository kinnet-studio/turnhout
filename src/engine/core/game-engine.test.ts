import { describe, expect, it, vi } from 'vitest';
import { GameEngine } from './game-engine';
import { MoveRegistry } from './moves';
import { registerCoreMoves } from './moves-library';
import { nextPlayer, zoneCards, type GameState } from './game-state';
import { makeRng } from './rng';
import { RuleRegistry } from './rules';
import type { CardState } from './scene';
import type { TableDef } from './table-def';
import { FlowRegistry } from './flow-registry';
import { registerCoreFlow } from './flow-library';
import type { FlowDef } from './flow';

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

describe('GameEngine with flow', () => {
  const FLOW: FlowDef = {
    turn: { order: ['a', 'b'] },
    phases: [
      { id: 'setup', allow: [], onEnter: [{ name: 'deal', params: { from: 'deck', to: 'hand', count: 1 } }], advance: { when: 'always', to: 'main' } },
      // NOTE: not `when: 'always'` — endTurn fires whenever its predicate is true
      // during any runFlow, including the construction-time one after setup→main
      // advance, which would flip the turn before any move. Use a predicate that
      // is false at construction settle (no card is faceUp until a flip move).
      { id: 'main', allow: ['flip'], endTurn: { when: 'anyFaceUp' } },
    ],
    triggers: [{ id: 'refill', when: { name: 'zoneEmpty', params: { zone: 'hand' } }, then: [{ name: 'deal', params: { from: 'deck', to: 'hand', count: 1 } }] }],
    end: [],
  };
  const table: TableDef = { zones: [
    { id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } },
    { id: 'hand', layout: 'pile', transform: { x: 0, y: 0 } },
  ] };
  const cards = (): CardState[] => [
    { id: 'c1', zoneId: 'deck', faceUp: false, faceKey: 'x' },
    { id: 'c2', zoneId: 'deck', faceUp: false, faceKey: 'y' },
  ];
  const mkEngine = () =>
    new GameEngine({
      tableDef: table,
      rules: new RuleRegistry(),
      moves: registerCoreMoves(new MoveRegistry()),
      initial: { cards: cards(), data: {}, rng: makeRng(3) },
      flow: FLOW,
      flowRegistry: registerCoreFlow(new FlowRegistry()).registerPredicate('anyFaceUp', (s) => s.cards.some((c) => c.faceUp)),
    });

  it('throws when flow and flowRegistry are not provided together', () => {
    expect(() => new GameEngine({ tableDef: table, rules: new RuleRegistry(), moves: new MoveRegistry(), initial: { cards: [], data: {}, rng: makeRng(1) }, flow: FLOW })).toThrow(/together/);
  });

  it('throws at construction on an invalid FlowDef', () => {
    const bad: FlowDef = { turn: { order: ['a'] }, phases: [{ id: 'p', allow: 'any', onEnter: ['ghost'] }] };
    expect(() => new GameEngine({ tableDef: table, rules: new RuleRegistry(), moves: new MoveRegistry(), initial: { cards: [], data: {}, rng: makeRng(1) }, flow: bad, flowRegistry: new FlowRegistry() })).toThrow(/invalid FlowDef.*ghost/);
  });

  it('initFlow runs at construction: setup dealt, phase advanced', () => {
    const e = mkEngine();
    expect(e.getState().turn).toEqual({ current: 'a', phase: 'main' });
    expect(zoneCards(e.getState(), 'hand')).toHaveLength(1);
  });

  it('gate rejects without touching the log; legal handlers still run', () => {
    const e = mkEngine();
    expect(e.dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 1, by: 'a' })).toMatchObject({ ok: false, reason: 'move deal not allowed in phase main' });
    expect(e.dispatch({ type: 'flip', cardId: 'c1', by: 'b' })).toMatchObject({ ok: false, reason: "not b's turn" });
    expect(e.getLog()).toHaveLength(0);
  });

  it('dispatch runs flow: endTurn passes the turn each move', () => {
    const e = mkEngine();
    const inHand = zoneCards(e.getState(), 'hand')[0];
    expect(e.dispatch({ type: 'flip', cardId: inHand.id, by: 'a' }).ok).toBe(true);
    expect(e.getState().turn?.current).toBe('b');
  });

  it('undo replays through flow deterministically', () => {
    const e = mkEngine();
    const before = e.getState();
    const inHand = zoneCards(before, 'hand')[0];
    e.dispatch({ type: 'flip', cardId: inHand.id, by: 'a' });
    e.undo();
    expect(e.getState()).toEqual(before);
  });

  it('loadLog reproduces byte-identical state in a fresh engine', () => {
    const e1 = mkEngine();
    const inHand = zoneCards(e1.getState(), 'hand')[0];
    e1.dispatch({ type: 'flip', cardId: inHand.id, by: 'a' });
    const e2 = mkEngine();
    e2.loadLog([...e1.getLog()]);
    expect(e2.getState()).toEqual(e1.getState());
  });
});
