import { describe, expect, it } from 'vitest';
import COLOR_MATCH from '@/games/color-match.rules?raw';
import STARTUP_SIMULATOR from '@/games/startup-simulator.rules?raw';
import type { GameState } from '@/engine/core/game-state';
import { markOut, setCounter } from '@/engine/core/lang/board-state';
import { seatExtras } from '@/engine/core/lang/board-view';
import { createEngine, initialState } from '@/engine/core/lang/build';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { tableauLine } from './tableaux';
import { render } from '@testing-library/react';
import { createElement } from 'react';
import { vi } from 'vitest';
import * as boardTexts from './board-text';
import { Tableaux } from './tableaux';
import { screen } from '@testing-library/react';
import { putOn } from '@/engine/core/lang/attach';
import { GAUGED_GAME } from '@/engine/core/lang/testing';
import { relocate } from '@/engine/core/lang/zones';
import { SHORT_COLOR } from './tableaux';

const lib = createDefaultLibrary();
const startup = compileGame(STARTUP_SIMULATOR, lib).game!;
const colorMatch = compileGame(COLOR_MATCH, lib).game!;
const SEED = 1;
const SEATS = ['p0', 'p1', 'p2'];

const { engine, runtime } = createEngine(startup, lib, 3, initialState(startup, SEED));
const start = engine.getState();
const S = start.data['lang:start-player'] as string;
// Every seat's line as p0 sees it in `state`.
const lines = (state: GameState) => {
  const { board } = seatExtras(engine, runtime, state, 'p0');
  return Object.fromEntries(SEATS.map((seat) => [seat, tableauLine(startup, board, state.cards, seat)]));
};

describe('tableauLine', () => {
  it('gives each seat its numbers, a count for each of its zones and the start player', () => {
    expect(SEATS).toContain(S);
    const all = lines(start);
    for (const seat of SEATS) {
      expect(all[seat]).toBe(`${seat} 7 capital, 3 actions, 0 market share · bench 3 · backlog 1 · research 0 · development 0 · operations 0 · development team 0 · ops team 0 · scouting 0 · strategy hand 0 · brainstorm 0 · milestones 0${seat === S ? ' · start player' : ''}`);
    }
  });

  it('reads a number at exactly 1 in the singular', () => {
    expect(lines(setCounter(start, 'actions', S, 1))[S]).toContain('7 capital, 1 action, 0 market share ·');
  });

  it('says only that a seat is out', () => {
    expect(lines(markOut(start, 'p1')).p1).toBe('p1 out');
  });

  it('starts with the bare seat in a game with no board', () => {
    const state = createEngine(colorMatch, lib, 3, initialState(colorMatch, SEED)).engine.getState();
    expect(tableauLine(colorMatch, null, state.cards, 'p0')).toBe('p0 · hand 7');
  });
});

describe('Tableaux', () => {
  // A hover draws the seat's panel again, and this list with it; a seat's Board changes only with the cards.
  it("reads each seat's Board once for the cards it is given, however often the list is drawn", () => {
    const text = vi.spyOn(boardTexts, 'boardText');
    try {
      const { board } = seatExtras(engine, runtime, start, 'p0');
      const props = { game: startup, seats: SEATS, board, cards: start.cards };
      const { rerender } = render(createElement(Tableaux, props));
      rerender(createElement(Tableaux, { ...props, board: board && { ...board } }));
      expect(text).toHaveBeenCalledTimes(SEATS.length);
      rerender(createElement(Tableaux, { ...props, cards: [...start.cards] }));
      expect(text).toHaveBeenCalledTimes(2 * SEATS.length);
    } finally {
      text.mockRestore();
    }
  });
});

describe('gauges', () => {
  const gauged = compileGame(GAUGED_GAME, lib).game!;
  // Setup deals 2 jobs to each stash, more than the pile holds for three: a state with p0's turn set skips it.
  const begun = createEngine(gauged, lib, 3, { ...initialState(gauged, SEED), turn: { current: 'p0', phase: 'working' } }).engine.getState();
  const all = (name: string) => begun.cards.filter((card) => card.data?.name === name).map((card) => card.id);
  const [[vase], [statue], [potter], [tinker], [smith]] = ['Vase', 'Statue', 'Potter', 'Tinker', 'Smith'].map(all);
  /**
   * p0's workshop holding the Vase (red need 2) with the Potter and the Tinker (red work 1 each) on it, and p1's the Statue (red need 1)
   * with the Smith (gold, so no red work) on it. p2 has neither.
   */
  const table = [
    (state: GameState) => relocate(state, [vase], 'workshop-p0', gauged),
    (state: GameState) => putOn(state, [potter, tinker], 'crew-p0', vase, gauged),
    (state: GameState) => relocate(state, [statue], 'workshop-p1', gauged),
    (state: GameState) => putOn(state, [smith], 'crew-p1', statue, gauged),
  ].reduce((state, arrange) => arrange(state), begun);
  /** Draws every seat's tableau as p0 is given it in `state`, with the values about each player its view carries. */
  const draw = (state: GameState) => {
    const { engine: drawn, runtime: rules } = createEngine(gauged, lib, 3, state);
    const { board, playerValues } = seatExtras(drawn, rules, drawn.getState(), 'p0');
    render(createElement(Tableaux, { game: gauged, seats: SEATS, board, cards: drawn.getState().cards, playerValues }));
  };
  const gauges = (seat: string) => screen.getByTestId(`gauges-${seat}`);

  it("gives each seat its red force against its red load, short while the force is under the load", () => {
    draw(table);
    expect(SEATS.map((seat) => gauges(seat).textContent)).toEqual(['Red force 2 / load 2', 'Red force 0 / load 1 (short)', 'Red force 0 / load 0']);
    expect(gauges('p1').querySelector('span')!.style.color).toBe(SHORT_COLOR);
  });

  it("draws a seat's gauges under its line and over its Board", () => {
    draw(table);
    expect(gauges('p0').previousElementSibling!.textContent!.startsWith('p0 ')).toBe(true);
    expect(gauges('p0').nextElementSibling!.getAttribute('data-testid')).toBe('board-p0');
  });

  it('Review Focus: draws none for a seat that is out', () => {
    draw(markOut(table, 'p1'));
    expect(screen.queryByTestId('gauges-p1')).toBeNull();
    expect(gauges('p0').textContent).toBe('Red force 2 / load 2');
  });

  it('Review Focus: draws none without the values a view carries', () => {
    const { board } = seatExtras(engine, runtime, start, 'p0');
    render(createElement(Tableaux, { game: startup, seats: SEATS, board, cards: start.cards }));
    expect(screen.queryByTestId(/^gauges-/)).toBeNull();
  });
});
