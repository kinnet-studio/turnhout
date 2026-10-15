import { describe, expect, it } from 'vitest';
import COLOR_MATCH from '@/games/color-match.rules?raw';
import HEARTS from '@/games/hearts.rules?raw';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import type { CompiledGame } from '@/engine/core/lang/types';
import type { ClientView } from '@/engine/net/protocol';
import { seatStatus } from './seat-status';

const lib = createDefaultLibrary();
const colorMatch = compileGame(COLOR_MATCH, lib).game!;
const hearts = compileGame(HEARTS, lib).game!;

const HINT = 'Play a card matching the color or number, or draw one.';

const view = (turn: ClientView['turn'], result?: ClientView['result']): ClientView => ({
  seat: 'p0',
  scene: { cards: [], zones: [] },
  turn,
  result,
});

describe('seatStatus', () => {
  it('is empty before the seat has a view', () => {
    expect(seatStatus(colorMatch, null, 'p0')).toBe('');
  });

  it('tells the seat whose turn it is', () => {
    expect(seatStatus(colorMatch, view({ current: 'p0', phase: 'playing' }), 'p0')).toBe(`Your turn — ${HINT}`);
  });

  it('tells the other seats who they are waiting for', () => {
    expect(seatStatus(colorMatch, view({ current: 'p1', phase: 'playing' }), 'p0')).toBe(`${HINT} — waiting for p1`);
  });

  it('shows just the hint when everyone acts at once', () => {
    expect(seatStatus(hearts, view({ current: 'p1', phase: 'passing' }), 'p0')).toBe('Drag 3 cards to your pass pile.');
    expect(seatStatus(hearts, view({ current: 'p1', phase: 'passing' }), 'p1')).toBe('Drag 3 cards to your pass pile.');
  });

  it('announces the winner when the game is over', () => {
    expect(seatStatus(colorMatch, view({ current: 'p0', phase: 'playing' }, { winner: 'p1' }), 'p0')).toBe('Game over — p1 wins');
  });

  it('adds the scores when the game has them', () => {
    const result = { scores: { p0: 14, p1: 1, p2: 0, p3: 0 }, winner: 'p3' };
    expect(seatStatus(hearts, view({ current: 'p0', phase: 'playing' }, result), 'p0')).toBe(
      'Game over — p3 wins (p0 14, p1 1, p2 0, p3 0)',
    );
  });

  it('falls back to the phase name when the phase has no hint or is not one of the game phases', () => {
    const unhinted: CompiledGame = { ...colorMatch, phases: colorMatch.phases.map((p) => ({ ...p, hint: null })) };
    expect(seatStatus(unhinted, view({ current: 'p0', phase: 'playing' }), 'p0')).toBe('Your turn — playing');
    expect(seatStatus(colorMatch, view({ current: 'p1', phase: '__setup' }), 'p0')).toBe('__setup — waiting for p1');
  });

  it('is empty while there is no turn yet', () => {
    expect(seatStatus(colorMatch, view(undefined), 'p0')).toBe('');
  });
});
