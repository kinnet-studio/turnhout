import { describe, expect, it } from 'vitest';
import { fixtureEnv, fixtureState, runPhrase } from '../testing';
import type { GameState } from '../../game-state';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();
const env = (data: GameState['data'] = {}) => fixtureEnv(fixtureState([], { data }));

describe('hearts phrases', () => {
  it('hearts are broken once the effect has run', () => {
    expect(runPhrase(lib, 'condition', 'hearts are broken', env())).toBe(false);
    const after = runPhrase<GameState>(lib, 'effect', 'hearts are broken', env({ other: 1 }));
    expect(after.data).toEqual({ other: 1, 'hearts:broken': true });
    expect(runPhrase(lib, 'condition', 'hearts are broken', fixtureEnv(after))).toBe(true);
  });
  it('only a true flag counts', () => {
    expect(runPhrase(lib, 'condition', 'hearts are broken', env({ 'hearts:broken': false }))).toBe(false);
    expect(runPhrase(lib, 'condition', 'hearts are broken', env({ 'hearts:broken': 'yes' }))).toBe(false);
  });
  it('setting it leaves the state it was given alone', () => {
    const state = fixtureState([]);
    runPhrase(lib, 'effect', 'hearts are broken', fixtureEnv(state));
    expect(state.data).toEqual({});
  });
});
