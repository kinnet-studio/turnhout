import { describe, expect, it } from 'vitest';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { FORCE_GAME, GAUGED_GAME } from '@/engine/core/lang/testing';
import type { CompiledGame } from '@/engine/core/lang/types';
import { gaugesOf } from './gauges';

const lib = createDefaultLibrary();

/** Compiles rules that must have no problems at all. */
function compiled(text: string): CompiledGame {
  const { game, diagnostics } = compileGame(text, lib);
  expect(diagnostics).toEqual([]);
  return game!;
}

const gauged = compiled(GAUGED_GAME);
const STOP_LINE = 'Only if their red force is at least their red load.';

describe('gaugesOf', () => {
  it('reads the pair a button waits on as the first value against the second, less the words both names start with', () => {
    expect(gaugesOf(gauged, { 'red force': 2, 'red load': 2 })).toEqual([{ text: 'Red force 2 / load 2', short: false }]);
  });

  it('marks a gauge short while the first value is under the second', () => {
    expect(gaugesOf(gauged, { 'red force': 1, 'red load': 2 })).toEqual([{ text: 'Red force 1 / load 2 (short)', short: true }]);
  });

  it('Review Focus: draws no gauge for a pair whose values are not both given, nor for a seat with none', () => {
    expect(gaugesOf(gauged, { 'red force': 2 })).toEqual([]);
    expect(gaugesOf(gauged, undefined)).toEqual([]);
  });

  it('gives the second name whole when the two names start with no word alike', () => {
    const spared = GAUGED_GAME.replace(STOP_LINE, 'Only if their spare is at least their red load.');
    expect(spared).not.toBe(GAUGED_GAME);
    const game = compiled(`${spared}\n\nSpare:\n  A player's spare is the total skill of the cards in their idle.`);
    expect(gaugesOf(game, { spare: 1, 'red load': 2 })).toEqual([{ text: 'Spare 1 / red load 2 (short)', short: true }]);
  });

  it('draws none for a game whose buttons wait on no pair', () => {
    expect(gaugesOf(compiled(FORCE_GAME), { 'red force': 2, 'red load': 2 })).toEqual([]);
  });
});
