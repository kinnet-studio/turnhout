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

const view = (turn: ClientView['turn'], result?: ClientView['result'], extras?: ClientView['extras']): ClientView => ({
  seat: 'p0',
  scene: { cards: [], zones: [] },
  turn,
  result,
  extras,
});

const boardExtras = (out: string[], interrupted = false) => ({
  board: { spaces: [], pieces: {}, roll: null, counters: [], out, bank: [], playerFacts: {}, lastDrawn: null, playerCards: {}, playerCardFlags: {}, owes: {}, gameNumbers: [], interrupted, startPlayer: null },
  actions: [],
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

  it('names every player who shares the win, with the scores', () => {
    const result = { scores: { p0: 3, p1: 3, p2: 1 }, winner: 'p0', winners: ['p0', 'p1'] };
    expect(seatStatus(colorMatch, view({ current: 'p0', phase: 'playing' }, result), 'p2')).toBe('Game over — p0 and p1 win (p0 3, p1 3, p2 1)');
  });

  it('announces a lone winner as before when the result lists the winners', () => {
    const result = { scores: { p0: 3, p1: 1 }, winner: 'p0', winners: ['p0'] };
    expect(seatStatus(colorMatch, view({ current: 'p0', phase: 'playing' }, result), 'p1')).toBe('Game over — p0 wins (p0 3, p1 1)');
  });

  it('falls back to the phase name when the phase has no hint or is not one of the game phases', () => {
    const unhinted: CompiledGame = { ...colorMatch, phases: colorMatch.phases.map((p) => ({ ...p, hint: null })) };
    expect(seatStatus(unhinted, view({ current: 'p0', phase: 'playing' }), 'p0')).toBe('Your turn — playing');
    expect(seatStatus(colorMatch, view({ current: 'p1', phase: '__setup' }), 'p0')).toBe('__setup — waiting for p1');
  });

  it('is empty while there is no turn yet', () => {
    expect(seatStatus(colorMatch, view(undefined), 'p0')).toBe('');
  });

  it('tells a seat that is out, once the others play on', () => {
    const turn = { current: 'p0', phase: 'playing' };
    expect(seatStatus(colorMatch, view(turn, undefined, boardExtras(['p1'])), 'p1')).toBe("You're out.");
    expect(seatStatus(colorMatch, view(turn, undefined, boardExtras(['p1'])), 'p0')).toBe(`Your turn — ${HINT}`);
  });

  it('announces the winner instead of saying a seat is out once the game is over', () => {
    expect(seatStatus(colorMatch, view({ current: 'p0', phase: 'playing' }, { winner: 'p0' }, boardExtras(['p1'])), 'p1')).toBe('Game over — p0 wins');
  });

  it('ignores extras it does not recognise', () => {
    expect(seatStatus(colorMatch, view({ current: 'p0', phase: 'playing' }, undefined, { board: 'nope' }), 'p0')).toBe(`Your turn — ${HINT}`);
  });

  describe('while a turn is interrupted', () => {
    const turn = { current: 'p1', phase: 'playing' };

    it("starts with the phase's name, for the seat whose turn it is and for the others", () => {
      expect(seatStatus(colorMatch, view(turn, undefined, boardExtras([], true)), 'p1')).toBe(`playing — Your turn — ${HINT}`);
      expect(seatStatus(colorMatch, view(turn, undefined, boardExtras([], true)), 'p0')).toBe(`playing — ${HINT} — waiting for p1`);
    });

    it('is the status it always was when no turn is interrupted', () => {
      expect(seatStatus(colorMatch, view(turn, undefined, boardExtras([], false)), 'p1')).toBe(`Your turn — ${HINT}`);
      expect(seatStatus(colorMatch, view(turn, undefined, boardExtras([], false)), 'p0')).toBe(`${HINT} — waiting for p1`);
    });

    it('adds nothing to a phase with no hint, which already shows its name', () => {
      const unhinted: CompiledGame = { ...colorMatch, phases: colorMatch.phases.map((p) => ({ ...p, hint: null })) };
      expect(seatStatus(unhinted, view(turn, undefined, boardExtras([], true)), 'p1')).toBe('Your turn — playing');
      expect(seatStatus(unhinted, view(turn, undefined, boardExtras([], true)), 'p0')).toBe('playing — waiting for p1');
    });

    it('leaves a game with no board, and a seat that is out, as they were', () => {
      expect(seatStatus(hearts, view({ current: 'p0', phase: 'playing' }), 'p0')).toBe('Your turn — Drag a card to the center.');
      expect(seatStatus(hearts, view({ current: 'p0', phase: 'playing' }, undefined, { board: null, actions: [] }), 'p0')).toBe('Your turn — Drag a card to the center.');
      expect(seatStatus(colorMatch, view(turn, undefined, boardExtras(['p0'], true)), 'p0')).toBe("You're out.");
    });

    it('names a phase everyone acts in at once too, in front of its hint alone', () => {
      expect(seatStatus(hearts, view({ current: 'p1', phase: 'passing' }, undefined, boardExtras([], true)), 'p0')).toBe('passing — Drag 3 cards to your pass pile.');
    });
  });
});
