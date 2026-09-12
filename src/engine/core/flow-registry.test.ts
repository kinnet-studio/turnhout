import { describe, expect, it } from 'vitest';
import { FlowRegistry, refName, refParams } from './flow-registry';
import type { GameState } from './game-state';
import { makeRng } from './rng';

const state: GameState = { cards: [], data: {}, rng: makeRng(1) };

describe('NamedRef helpers', () => {
  it('reads name and params from both forms', () => {
    expect(refName('foo')).toBe('foo');
    expect(refParams('foo')).toBeUndefined();
    expect(refName({ name: 'bar', params: { n: 1 } })).toBe('bar');
    expect(refParams({ name: 'bar', params: { n: 1 } })).toEqual({ n: 1 });
  });
});

describe('FlowRegistry', () => {
  it('registers and resolves the three kinds independently', () => {
    const reg = new FlowRegistry()
      .registerPredicate('p', () => true)
      .registerEffect('e', (s) => s)
      .registerPolicy('t', (_s, order) => order[0]);
    expect(reg.hasPredicate('p')).toBe(true);
    expect(reg.hasEffect('e')).toBe(true);
    expect(reg.hasPolicy('t')).toBe(true);
    // namespaces are separate: 'p' is only a predicate
    expect(reg.hasEffect('p')).toBe(false);
    expect(reg.hasPolicy('p')).toBe(false);
    expect(reg.predicate('p')!(state, { tableDef: { zones: [] }, rules: null as never })).toBe(true);
    expect(reg.effect('missing')).toBeUndefined();
  });
});

describe('GameState.result', () => {
  it('is optional and Json-typed', () => {
    const s: GameState = { cards: [], data: {}, rng: makeRng(1), result: { winner: 'p0' } };
    expect(s.result).toEqual({ winner: 'p0' });
  });
});
