import { describe, expect, it } from 'vitest';
import { compileGame } from './compile';
import { moveForDrop } from './drops';
import { createDefaultLibrary } from './library';
import { TEST_DUEL } from './testing';

const game = compileGame(TEST_DUEL, createDefaultLibrary()).game!;
const seats = ['p0', 'p1'];

/** What p0 dragging card c1 from one zone to another means in `phase`. */
const drop = (fromZoneId: string, toZoneId: string | null, slot = 0, phase: string | undefined = 'play') =>
  moveForDrop(game, seats, phase, 'p0', { cardId: 'c1', fromZoneId, toZoneId, slot });

describe('moveForDrop', () => {
  it('maps drags to declared moves, rearranging, or nothing', () => {
    expect(drop('hand-p0', 'middle')).toEqual({ type: 'play', cardId: 'c1', toZone: 'middle' });
    expect(drop('deck', 'hand-p0')).toEqual({ type: 'draw', cardId: 'c1', toZone: 'hand-p0' });
    expect(drop('hand-p0', 'hand-p0', 2)).toEqual({ type: 'reorder', cardId: 'c1', slot: 2 });
    expect(drop('hand-p0', 'won-pile-p0')).toBeNull();
    expect(drop('hand-p0', null)).toBeNull();
  });

  it('only maps a drag the dragging player could make', () => {
    expect(drop('hand-p1', 'middle')).toBeNull();
    expect(drop('deck', 'hand-p1')).toBeNull();
    expect(drop('hand-p1', 'hand-p1', 1)).toBeNull();
  });

  it('only rearranges a zone the phase lets players rearrange', () => {
    expect(drop('won-pile-p0', 'won-pile-p0', 1)).toBeNull();
    expect(drop('middle', 'middle', 1)).toBeNull();
    expect(drop('hand-p0', 'hand-p0', 1, '__setup')).toBeNull();
  });

  it('maps nothing before a phase has started', () => {
    expect(moveForDrop(game, seats, undefined, 'p0', { cardId: 'c1', fromZoneId: 'hand-p0', toZoneId: 'middle', slot: 0 })).toBeNull();
  });
});
