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
