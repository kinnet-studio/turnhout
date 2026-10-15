import { describe, expect, it } from 'vitest';
import type { Json } from '../table-def';
import { queueRoll, setCounter, withBoardData } from './board-state';
import { readSeatExtras, seatExtras } from './board-view';
import { createEngine, initialState } from './build';
import { compileGame } from './compile';
import { createDefaultLibrary } from './library';
import { TEST_DUEL, TINY_BOARD } from './testing';

const lib = createDefaultLibrary();
const game = compileGame(TINY_BOARD, lib).game!;

describe('seat views of a board game', () => {
  it('shows the board and the buttons from each seat', () => {
    const { engine, runtime } = createEngine(game, lib, 2, initialState(game, 1));
    const p0 = seatExtras(engine, runtime, engine.getState(), 'p0');
    expect(p0.board!.spaces[1]).toEqual({ name: 'Mill Lane', color: 'brown', details: { kind: 'street', price: 60, rent: 2 }, owner: null });
    expect(p0.board!.pieces).toEqual({ p0: 0, p1: 0 });
    expect(p0.board!.counters).toEqual([{ name: 'money', values: { p0: 1500, p1: 1500 } }]);
    expect(p0.actions).toEqual([
      { verb: 'roll', label: 'Roll the dice', allowed: true },
      { verb: 'buy', label: 'Buy the space you are on', allowed: 'they have rolled this turn' },
      { verb: 'end', label: 'End your turn', allowed: 'they have rolled this turn' },
    ]);
    expect(seatExtras(engine, runtime, engine.getState(), 'p1').actions.every((a) => a.allowed === "It's p0's turn.")).toBe(true);
  });

  it('keeps a space with no color without one, and lists every space in loop order', () => {
    const { engine, runtime } = createEngine(game, lib, 2, initialState(game, 1));
    const { board } = seatExtras(engine, runtime, engine.getState(), 'p0');
    expect(board!.spaces.map((s) => s.name)).toEqual(['Go', 'Mill Lane', 'Income Tax', 'Rose Lane']);
    expect(board!.spaces[0]).toEqual({ name: 'Go', color: null, details: { kind: 'go' }, owner: null });
    expect(board!.spaces[2]).toEqual({ name: 'Income Tax', color: null, details: { kind: 'tax', tax: 200 }, owner: null });
    expect(board!.roll).toBeNull();
    expect(board!.out).toEqual([]);
  });

  it('shows the roll, the pieces and the owners as the game moves', () => {
    const start = queueRoll(initialState(game, 1), [1, 2]);
    const { engine, runtime } = createEngine(game, lib, 2, start);
    engine.dispatch({ type: 'roll', by: 'p0' });
    engine.dispatch({ type: 'buy', by: 'p0' });
    const { board, actions } = seatExtras(engine, runtime, engine.getState(), 'p1');
    expect(board!.roll).toEqual([1, 2]);
    expect(board!.pieces).toEqual({ p0: 3, p1: 0 });
    expect(board!.spaces[3].owner).toBe('p0');
    expect(board!.counters).toEqual([{ name: 'money', values: { p0: 1320, p1: 1500 } }]);
    expect(actions.map((a) => a.allowed)).toEqual(Array(3).fill("It's p0's turn."));
    expect(seatExtras(engine, runtime, engine.getState(), 'p0').actions.map((a) => a.allowed)).toEqual(['they have not rolled this turn', 'no one owns it', true]);
  });

  it('hides numbers only their owner can see', () => {
    const secretGame = compileGame(TINY_BOARD.replace('  Players pay with money.', '  Each player has 3 secrets that only they can see.\n  Players pay with money.'), lib).game!;
    const { engine, runtime } = createEngine(secretGame, lib, 2, initialState(secretGame, 1));
    expect(seatExtras(engine, runtime, engine.getState(), 'p1').board!.counters[1]).toEqual({ name: 'secrets', values: { p0: null, p1: 3 } });
  });

  it('greys every button once the game is over', () => {
    const start = queueRoll(setCounter(withBoardData(initialState(game, 1), game, ['p0', 'p1']), 'money', 'p0', 100), [1, 1]);
    const { engine, runtime } = createEngine(game, lib, 2, start);
    engine.dispatch({ type: 'roll', by: 'p0' });
    expect(seatExtras(engine, runtime, engine.getState(), 'p1').actions.map((a) => a.allowed)).toEqual(['The game is over.', 'The game is over.', 'The game is over.']);
  });

  it('greys the buttons of a seat that is out while the game goes on', () => {
    const start = queueRoll(setCounter(withBoardData(initialState(game, 1), game, ['p0', 'p1', 'p2']), 'money', 'p0', 100), [1, 1]);
    const { engine, runtime } = createEngine(game, lib, 3, start);
    engine.dispatch({ type: 'roll', by: 'p0' });
    expect(engine.getState().result).toBeUndefined();
    expect(seatExtras(engine, runtime, engine.getState(), 'p0').actions.every((a) => a.allowed === "You're out of the game.")).toBe(true);
    const { board } = seatExtras(engine, runtime, engine.getState(), 'p1');
    expect(board!.out).toEqual(['p0']);
    expect(board!.pieces).toEqual({ p1: 0, p2: 0 });
  });

  it('greys a button whose rule cannot be answered with that sentence, instead of failing the view', () => {
    const careless = compileGame(TINY_BOARD.replace('    Only if it has a price.\n', '').replace('    Only if they have rolled this turn.\n    Only if no one owns it.\n', ''), lib).game!;
    const { engine, runtime } = createEngine(careless, lib, 2, initialState(careless, 1));
    // The sentence names the designer's line, so they can find the rule that needs an “Only if it has a price.”
    expect(seatExtras(engine, runtime, engine.getState(), 'p0').actions[1]).toEqual({
      verb: 'buy', label: 'Buy the space you are on', allowed: 'Line 24 (“they have at least its price in money”): Go has no price.',
    });
  });

  it('is plain data: it survives a trip through JSON', () => {
    const { engine, runtime } = createEngine(game, lib, 2, initialState(game, 1));
    const extras: Json = seatExtras(engine, runtime, engine.getState(), 'p0'); // the extras callback must be able to return it
    expect(JSON.parse(JSON.stringify(extras))).toEqual(extras);
  });

  it('has no board and no buttons for a game without either', () => {
    const cardGame = compileGame(TEST_DUEL, lib).game!;
    const { engine, runtime } = createEngine(cardGame, lib, 2, initialState(cardGame, 1));
    expect(seatExtras(engine, runtime, engine.getState(), 'p0')).toEqual({ board: null, actions: [] });
  });
});

describe('readSeatExtras', () => {
  it('reads extras back, and nothing else', () => {
    expect(readSeatExtras(undefined)).toBeNull();
    expect(readSeatExtras({ board: null, actions: [] })).toEqual({ board: null, actions: [] });
  });

  it('reads back what seatExtras made', () => {
    const { engine, runtime } = createEngine(game, lib, 2, initialState(game, 1));
    const extras = seatExtras(engine, runtime, engine.getState(), 'p0');
    expect(readSeatExtras(JSON.parse(JSON.stringify(extras)))).toEqual(extras);
  });

  it.each([
    ['null', null],
    ['a number', 7],
    ['a list', []],
    ['no actions', { board: null }],
    ['actions that are not a list', { board: null, actions: {} }],
    ['an action with no label', { board: null, actions: [{ verb: 'roll', allowed: true }] }],
    ['an action that is allowed with false', { board: null, actions: [{ verb: 'roll', label: 'Roll', allowed: false }] }],
    ['a board that is not an object', { board: 3, actions: [] }],
    ['a board with no spaces', { board: { pieces: {}, roll: null, counters: [], out: [] }, actions: [] }],
    ['a space with no name', { board: { spaces: [{ color: null, details: {}, owner: null }], pieces: {}, roll: null, counters: [], out: [] }, actions: [] }],
    ['a piece that is not a number', { board: { spaces: [], pieces: { p0: 'x' }, roll: null, counters: [], out: [] }, actions: [] }],
    ['a roll of text', { board: { spaces: [], pieces: {}, roll: 'six', counters: [], out: [] }, actions: [] }],
    ['a counter value that is text', { board: { spaces: [], pieces: {}, roll: null, counters: [{ name: 'm', values: { p0: 'x' } }], out: [] }, actions: [] }],
    ['seats that are out given as a number', { board: { spaces: [], pieces: {}, roll: null, counters: [], out: 1 }, actions: [] }],
  ])('refuses %s', (_name, extras) => expect(readSeatExtras(extras)).toBeNull());
});
