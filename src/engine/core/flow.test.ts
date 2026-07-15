import { describe, expect, it } from 'vitest';
import { gateMove } from './flow';
import type { FlowDef } from './flow';
import type { GameState } from './game-state';
import { makeRng } from './rng';

const flow: FlowDef = {
  turn: { order: ['a', 'b'] },
  phases: [
    { id: 'main', allow: ['play', 'reorder'], anyActor: ['reorder'] },
    { id: 'open', allow: 'any', actor: 'any' },
  ],
};

const st = (over?: Partial<GameState>): GameState => ({
  cards: [],
  turn: { current: 'a', phase: 'main' },
  data: {},
  rng: makeRng(1),
  ...over,
});

describe('gateMove', () => {
  it('rejects everything once the game is over', () => {
    expect(gateMove(st({ result: { winner: 'a' } }), { type: 'play', by: 'a' }, flow)).toBe('game is over');
  });

  it('fails closed on unknown or missing phase', () => {
    expect(gateMove(st({ turn: { current: 'a', phase: 'nope' } }), { type: 'play', by: 'a' }, flow)).toBe('unknown phase: nope');
    expect(gateMove(st({ turn: undefined }), { type: 'play', by: 'a' }, flow)).toBe('unknown phase: (none)');
  });

  it('rejects move types not allowed in the phase', () => {
    expect(gateMove(st(), { type: 'deal', by: 'a' }, flow)).toBe('move deal not allowed in phase main');
  });

  it('rejects off-turn and anonymous actors', () => {
    expect(gateMove(st(), { type: 'play', by: 'b' }, flow)).toBe("not b's turn");
    expect(gateMove(st(), { type: 'play' }, flow)).toBe('move has no actor (by)');
  });

  it('lets the current actor play', () => {
    expect(gateMove(st(), { type: 'play', by: 'a' }, flow)).toBe(true);
  });

  it('anyActor exempts listed move types from the actor gate', () => {
    expect(gateMove(st(), { type: 'reorder', by: 'b' }, flow)).toBe(true);
  });

  it("actor 'any' phases accept any seat and allow 'any' accepts any move type", () => {
    const s = st({ turn: { current: 'a', phase: 'open' } });
    expect(gateMove(s, { type: 'whatever', by: 'b' }, flow)).toBe(true);
  });
});

import { initFlow, runFlow, MAX_FLOW_ITERATIONS } from './flow';
import { FlowRegistry } from './flow-registry';
import { zoneCards } from './game-state';
import type { MoveContext } from './moves';
import { RuleRegistry } from './rules';
import type { CardState } from './scene';

const ctx: MoveContext = {
  tableDef: { zones: [
    { id: 'a', layout: 'pile', transform: { x: 0, y: 0 } },
    { id: 'b', layout: 'pile', transform: { x: 0, y: 0 } },
  ] },
  rules: new RuleRegistry(),
};

const card = (id: string, zoneId: string): CardState => ({ id, zoneId, faceUp: false, faceKey: 'x' });

const reg = () =>
  new FlowRegistry()
    .registerPredicate('always', () => true)
    .registerPredicate('never', () => false)
    .registerPredicate('aHasCards', (s) => zoneCards(s, 'a').length > 0)
    .registerEffect('drainA', (s) => ({ ...s, cards: s.cards.map((c) => (c.zoneId === 'a' ? { ...c, zoneId: 'b' } : c)) }))
    .registerEffect('noop', (s) => s)
    .registerEffect('finish', (s) => ({ ...s, result: { done: true } }))
    .registerEffect('mark', (s) => ({ ...s, data: { ...s.data, marked: true } }));

const mk = (over?: Partial<GameState>): GameState => ({
  cards: [card('c1', 'a')],
  turn: { current: 'a', phase: 'main' },
  data: {},
  rng: makeRng(1),
  ...over,
});

describe('runFlow', () => {
  it('fires a trigger to fixpoint and settles', () => {
    const flow: FlowDef = {
      turn: { order: ['a', 'b'] },
      phases: [{ id: 'main', allow: 'any' }],
      triggers: [{ id: 'drain', when: 'aHasCards', then: ['drainA'] }],
    };
    const out = runFlow(mk(), flow, reg(), ctx);
    expect(zoneCards(out, 'a')).toHaveLength(0);
    expect(zoneCards(out, 'b')).toHaveLength(1);
  });

  it('throws at the iteration cap naming the runaway trigger', () => {
    const flow: FlowDef = {
      turn: { order: ['a'] },
      phases: [{ id: 'main', allow: 'any' }],
      triggers: [{ id: 'runaway', when: 'always', then: ['noop'] }],
    };
    expect(() => runFlow(mk(), flow, reg(), ctx)).toThrow(new RegExp(`${MAX_FLOW_ITERATIONS} iterations.*trigger runaway`));
  });

  it('checks end conditions before triggers and stops permanently', () => {
    const flow: FlowDef = {
      turn: { order: ['a'] },
      phases: [{ id: 'main', allow: 'any' }],
      triggers: [{ id: 'drain', when: 'aHasCards', then: ['drainA'] }],
      end: [{ when: 'aHasCards', result: 'finish' }],
    };
    const out = runFlow(mk(), flow, reg(), ctx);
    expect(out.result).toEqual({ done: true });
    expect(zoneCards(out, 'a')).toHaveLength(1); // trigger never ran
  });

  it('throws if an end result effect forgets to set state.result', () => {
    const flow: FlowDef = {
      turn: { order: ['a'] },
      phases: [{ id: 'main', allow: 'any' }],
      end: [{ when: 'always', result: 'noop' }],
    };
    expect(() => runFlow(mk(), flow, reg(), ctx)).toThrow(/did not set state.result/);
  });

  it("advances phase and runs the target's onEnter", () => {
    const flow: FlowDef = {
      turn: { order: ['a'] },
      phases: [
        { id: 'main', allow: 'any', advance: { when: 'always', to: 'next' } },
        { id: 'next', allow: 'any', onEnter: ['mark'] },
      ],
    };
    const out = runFlow(mk(), flow, reg(), ctx);
    expect(out.turn?.phase).toBe('next');
    expect(out.data.marked).toBe(true);
  });

  it('endTurn fires at most once per invocation (default round-robin)', () => {
    const flow: FlowDef = {
      turn: { order: ['a', 'b', 'c'] },
      phases: [{ id: 'main', allow: 'any', endTurn: { when: 'always' } }],
    };
    const out = runFlow(mk(), flow, reg(), ctx);
    expect(out.turn?.current).toBe('b'); // exactly one step, not b→c→a…
  });

  it('uses the named turn policy when turn.next is set', () => {
    const r = reg().registerPolicy('toC', () => 'c');
    const flow: FlowDef = {
      turn: { order: ['a', 'b', 'c'], next: 'toC' },
      phases: [{ id: 'main', allow: 'any', endTurn: { when: 'always' } }],
    };
    expect(runFlow(mk(), flow, r, ctx).turn?.current).toBe('c');
  });

  it('throws on an unknown phase in state', () => {
    const flow: FlowDef = { turn: { order: ['a'] }, phases: [{ id: 'main', allow: 'any' }] };
    expect(() => runFlow(mk({ turn: { current: 'a', phase: 'ghost' } }), flow, reg(), ctx)).toThrow(/unknown phase: ghost/);
  });
});

describe('initFlow', () => {
  const flow: FlowDef = {
    turn: { order: ['a', 'b'] },
    phases: [
      { id: 'setup', allow: [], onEnter: ['mark'], advance: { when: 'always', to: 'main' } },
      { id: 'main', allow: 'any' },
    ],
  };

  it('fills in turn, runs first-phase onEnter, then runs flow (auto-advance)', () => {
    const out = initFlow(mk({ turn: undefined }), flow, reg(), ctx);
    expect(out.turn).toEqual({ current: 'a', phase: 'main' });
    expect(out.data.marked).toBe(true);
  });

  it('respects a preset turn and skips onEnter for a non-first phase', () => {
    const out = initFlow(mk({ turn: { current: 'b', phase: 'main' } }), flow, reg(), ctx);
    expect(out.turn).toEqual({ current: 'b', phase: 'main' });
    expect(out.data.marked).toBeUndefined();
  });
});
