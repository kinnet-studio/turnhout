import { describe, expect, it } from 'vitest';
import type { Json } from '../table-def';
import { markOut, queueRoll, setBank, setCounter, setOwner, setSpaceFact, withBoardData } from './board-state';
import { readSeatExtras, seatExtras } from './board-view';
import { createEngine, initialState } from './build';
import { compileGame } from './compile';
import { createDefaultLibrary } from './library';
import { TEST_DUEL, TINY_BOARD } from './testing';

const lib = createDefaultLibrary();
const game = compileGame(TINY_BOARD, lib).game!;

/**
 * TINY_BOARD with a second orange street, houses and a hotel, a bank to take them from and a button that builds on a street the
 * player points at. Spaces: Go 0, Mill Lane 1, Income Tax 2, Rose Lane 3, Lily Lane 4.
 */
const BUILDING = TINY_BOARD
  .replace('    | Rose Lane  | street | orange | 180   | 14   |     |', '    | Rose Lane  | street | orange | 180   | 14   |     |\n    | Lily Lane  | street | orange | 180   | 14   |     |')
  .replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  Spaces can have houses and a hotel.\n  The bank has 32 houses and 12 hotels.')
  .replace('  A player may end their turn.', [
    '  A player may build a house on a street they own.',
    '    Only if no street of its color has fewer buildings.',
    '    Then:',
    '      It gets a house from the bank.',
    '  A player may end their turn.',
  ].join('\n'));
const BUILD = 'build a house on a street they own';
const ROSE = 3;
const LILY = 4;

describe('seat views of a board game', () => {
  it('shows the board and the buttons from each seat', () => {
    const { engine, runtime } = createEngine(game, lib, 2, initialState(game, 1));
    const p0 = seatExtras(engine, runtime, engine.getState(), 'p0');
    expect(p0.board!.spaces[1]).toEqual({ name: 'Mill Lane', color: 'brown', details: { kind: 'street', price: 60, rent: 2 }, facts: {}, owner: null });
    expect(p0.board!.pieces).toEqual({ p0: 0, p1: 0 });
    expect(p0.board!.counters).toEqual([{ name: 'money', values: { p0: 1500, p1: 1500 } }]);
    expect(p0.actions).toEqual([
      { move: 'roll the dice', label: 'Roll the dice', allowed: true, target: null },
      { move: 'buy the space they are on', label: 'Buy the space you are on', allowed: 'they have rolled this turn', target: null },
      { move: 'end their turn', label: 'End your turn', allowed: 'they have rolled this turn', target: null },
    ]);
    expect(seatExtras(engine, runtime, engine.getState(), 'p1').actions.every((a) => a.allowed === "It's p0's turn.")).toBe(true);
  });

  it('keeps a space with no color without one, and lists every space in loop order', () => {
    const { engine, runtime } = createEngine(game, lib, 2, initialState(game, 1));
    const { board } = seatExtras(engine, runtime, engine.getState(), 'p0');
    expect(board!.spaces.map((s) => s.name)).toEqual(['Go', 'Mill Lane', 'Income Tax', 'Rose Lane']);
    expect(board!.spaces[0]).toEqual({ name: 'Go', color: null, details: { kind: 'go' }, facts: {}, owner: null });
    expect(board!.spaces[2]).toEqual({ name: 'Income Tax', color: null, details: { kind: 'tax', tax: 200 }, facts: {}, owner: null });
    expect(board!.roll).toBeNull();
    expect(board!.out).toEqual([]);
  });

  it('shows the roll, the pieces and the owners as the game moves', () => {
    const start = queueRoll(initialState(game, 1), [1, 2]);
    const { engine, runtime } = createEngine(game, lib, 2, start);
    engine.dispatch({ type: 'roll the dice', by: 'p0' });
    engine.dispatch({ type: 'buy the space they are on', by: 'p0' });
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
    engine.dispatch({ type: 'roll the dice', by: 'p0' });
    expect(seatExtras(engine, runtime, engine.getState(), 'p1').actions.map((a) => a.allowed)).toEqual(['The game is over.', 'The game is over.', 'The game is over.']);
  });

  it('greys the buttons of a seat that is out while the game goes on', () => {
    const start = queueRoll(setCounter(withBoardData(initialState(game, 1), game, ['p0', 'p1', 'p2']), 'money', 'p0', 100), [1, 1]);
    const { engine, runtime } = createEngine(game, lib, 3, start);
    engine.dispatch({ type: 'roll the dice', by: 'p0' });
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
      move: 'buy the space they are on', label: 'Buy the space you are on', allowed: 'Line 24 (“they have at least its price in money”): Go has no price.', target: null,
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

describe('seat views of a board with houses and a bank', () => {
  const built = compileGame(BUILDING, lib);
  const g = built.game!;
  /** p0 owns both orange streets and Rose Lane has a house on it; the other spaces have nothing. */
  const arranged = setSpaceFact(setOwner(setOwner(withBoardData(initialState(g, 1), g, ['p0', 'p1']), ROSE, 'p0'), LILY, 'p0'), ROSE, 'houses', 1);
  const view = (seat: string, start = arranged) => {
    const { engine, runtime } = createEngine(g, lib, 2, start);
    return seatExtras(engine, runtime, engine.getState(), seat);
  };
  const build = (seat: string, start = arranged) => view(seat, start).actions.find((a) => a.move === BUILD)!;

  it('compiles with no diagnostics', () => expect(built.diagnostics).toEqual([]));

  it('shows the facts a space has, and only the ones that are set', () => {
    const { board } = view('p0');
    expect(board!.spaces[ROSE].facts).toEqual({ houses: 1 });
    expect(board!.spaces[LILY].facts).toEqual({});
    expect(board!.spaces[0].facts).toEqual({});
    // A count that came back to 0 and a flag that was taken down are as good as never set.
    const settled = setSpaceFact(setSpaceFact(setSpaceFact(arranged, LILY, 'houses', 0), LILY, 'hotel', false), 1, 'hotel', true);
    expect(view('p0', settled).board!.spaces.map((s) => s.facts)).toEqual([{}, { hotel: true }, {}, { houses: 1 }, {}]);
    expect(view('p0', setSpaceFact(arranged, ROSE, 'hotel', true)).board!.spaces[ROSE].facts).toEqual({ houses: 1, hotel: true });
  });

  it('shows the bank in the order it was declared, as it is now', () => {
    expect(view('p0').board!.bank).toEqual([{ name: 'houses', count: 32 }, { name: 'hotels', count: 12 }]);
    expect(view('p1', setBank(arranged, 'houses', 31)).board!.bank).toEqual([{ name: 'houses', count: 31 }, { name: 'hotels', count: 12 }]);
    // A board that declares no bank has nothing in it.
    const { engine, runtime } = createEngine(game, lib, 2, initialState(game, 1));
    expect(seatExtras(engine, runtime, engine.getState(), 'p0').board!.bank).toEqual([]);
  });

  it('lists the spaces a button may pick, by their place on the board, with why the others are refused', () => {
    expect(build('p0')).toEqual({
      move: BUILD, label: 'Build a house', allowed: true,
      target: { prompt: 'Pick a street you own', spaces: { [ROSE]: 'no street of its color has fewer buildings', [LILY]: true } },
    });
  });

  it('lists a candidate that is true only because the move itself accepts it', () => {
    // Lily Lane has caught up, so building on either is even again.
    expect(build('p0', setSpaceFact(arranged, LILY, 'houses', 1)).target!.spaces).toEqual({ [ROSE]: true, [LILY]: true });
    // The hotel counts as five houses: Rose Lane is ahead of Lily Lane's four.
    const ahead = setSpaceFact(setSpaceFact(arranged, ROSE, 'hotel', true), LILY, 'houses', 4);
    expect(build('p0', ahead).target!.spaces).toEqual({ [ROSE]: 'no street of its color has fewer buildings', [LILY]: true });
  });

  it('greys a button whose candidates are all refused, with the reason of the first', () => {
    // Lily Lane is p1's with nothing built, so Rose Lane, the only street p0 owns, has a street of its color with fewer buildings.
    expect(build('p0', setOwner(arranged, LILY, 'p1'))).toEqual({
      move: BUILD, label: 'Build a house', allowed: 'no street of its color has fewer buildings',
      target: { prompt: 'Pick a street you own', spaces: { [ROSE]: 'no street of its color has fewer buildings' } },
    });
  });

  it('says there is no such space for a seat that has none to pick', () => {
    expect(build('p1')).toEqual({
      move: BUILD, label: 'Build a house', allowed: 'There is no street you own.',
      target: { prompt: 'Pick a street you own', spaces: {} },
    });
  });

  it("gives a seat that may not play now each candidate's reason", () => {
    expect(build('p1', setOwner(arranged, LILY, 'p1')).target!.spaces).toEqual({ [LILY]: "It's p0's turn." });
    expect(build('p1', setOwner(arranged, LILY, 'p1')).allowed).toBe("It's p0's turn.");
  });

  it('greys a candidate whose rule cannot be answered with that sentence, and still lists the others', () => {
    const careless = compileGame(BUILDING
      .replace('build a house on a street they own', 'build a house on a space they own')
      .replace('    Only if no street of its color has fewer buildings.', '    Only if they have at least its price in money.'), lib).game!;
    const start = setOwner(setOwner(withBoardData(initialState(careless, 1), careless, ['p0', 'p1']), 0, 'p0'), ROSE, 'p0');
    const { engine, runtime } = createEngine(careless, lib, 2, start);
    const action = seatExtras(engine, runtime, engine.getState(), 'p0').actions.find((a) => a.move === 'build a house on a space they own')!;
    expect(action.target).toEqual({ prompt: 'Pick a space you own', spaces: { 0: expect.stringMatching(/Go has no price\.$/), [ROSE]: true } });
    expect(action.allowed).toBe(true);
    const noneOwned = createEngine(careless, lib, 2, initialState(careless, 1));
    expect(seatExtras(noneOwned.engine, noneOwned.runtime, noneOwned.engine.getState(), 'p0').actions.find((a) => a.target !== null)!.allowed).toBe('There is no space you own.');
  });

  it('greys a button that picks a space like every other once the game is over', () => {
    const start = queueRoll(setCounter(setOwner(withBoardData(initialState(g, 1), g, ['p0', 'p1']), ROSE, 'p0'), 'money', 'p0', 100), [1, 1]);
    const { engine, runtime } = createEngine(g, lib, 2, start);
    engine.dispatch({ type: 'roll the dice', by: 'p0' });
    expect(engine.getState().result).toBeDefined();
    // p0 owns a street and p1 owns none: neither is told anything but that the game is over.
    for (const seat of ['p0', 'p1']) {
      const action = seatExtras(engine, runtime, engine.getState(), seat).actions.find((a) => a.move === BUILD)!;
      expect(action.allowed, seat).toBe('The game is over.');
    }
  });

  it('gives a button that picks nothing no target', () => {
    const { actions } = view('p0');
    expect(actions.filter((a) => a.move !== BUILD).every((a) => a.target === null)).toBe(true);
  });

  it('keeps the target of a button when the seat is out, with nothing to pick', () => {
    const three = markOut(setOwner(setOwner(withBoardData(initialState(g, 1), g, ['p0', 'p1', 'p2']), ROSE, 'p2'), LILY, 'p2'), 'p2');
    const { engine, runtime } = createEngine(g, lib, 3, three);
    expect(seatExtras(engine, runtime, engine.getState(), 'p2').actions.find((a) => a.move === BUILD)).toEqual({
      move: BUILD, label: 'Build a house', allowed: "You're out of the game.",
      target: { prompt: 'Pick a street you own', spaces: {} },
    });
  });

  it('is plain data, and readSeatExtras reads it back', () => {
    const extras = view('p0');
    const sent: Json = JSON.parse(JSON.stringify(extras));
    expect(sent).toEqual(extras);
    expect(readSeatExtras(sent)).toEqual(extras);
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

  const space = { name: 'Go', color: null, details: {}, facts: {}, owner: null };
  const board = (over: { [k: string]: Json } = {}) => ({ spaces: [], pieces: {}, roll: null, counters: [], out: [], bank: [], ...over });
  const action = (over: { [k: string]: Json } = {}) => ({ move: 'roll the dice', label: 'Roll', allowed: true, target: null, ...over });
  const picking = (over: { [k: string]: Json } = {}) => action({ target: { prompt: 'Pick a street you own', spaces: { 3: true }, ...over } });

  it('reads a board with facts, a bank and a button that picks a space', () => {
    const extras = { board: board({ spaces: [{ ...space, facts: { houses: 2, hotel: true } }], bank: [{ name: 'houses', count: 32 }] }), actions: [picking({ spaces: { 3: true, 4: 'not yours' } })] };
    expect(readSeatExtras(extras)).toEqual(extras);
  });

  it.each([
    ['null', null],
    ['a number', 7],
    ['a list', []],
    ['no actions', { board: null }],
    ['actions that are not a list', { board: null, actions: {} }],
    ['an action with no label', { board: null, actions: [{ move: 'roll the dice', allowed: true, target: null }] }],
    ['an action with no move type', { board: null, actions: [{ label: 'Roll', allowed: true, target: null }] }],
    ['an action that is allowed with false', { board: null, actions: [action({ allowed: false })] }],
    ['an action with no target field', { board: null, actions: [{ move: 'roll the dice', label: 'Roll', allowed: true }] }],
    ['a target that is not an object', { board: null, actions: [action({ target: 'a street' })] }],
    ['a target with no prompt', { board: null, actions: [action({ target: { spaces: {} } })] }],
    ['a target with no spaces', { board: null, actions: [action({ target: { prompt: 'Pick a street you own' } })] }],
    ['a target space that is neither true nor a reason', { board: null, actions: [picking({ spaces: { 3: false } })] }],
    ['a target space that is a number', { board: null, actions: [picking({ spaces: { 3: 1 } })] }],
    ['a board that is not an object', { board: 3, actions: [] }],
    ['a board with no spaces', { board: { pieces: {}, roll: null, counters: [], out: [], bank: [] }, actions: [] }],
    ['a space with no name', { board: board({ spaces: [{ color: null, details: {}, facts: {}, owner: null }] }), actions: [] }],
    ['a space with no facts', { board: board({ spaces: [{ name: 'Go', color: null, details: {}, owner: null }] }), actions: [] }],
    ['a fact that is text', { board: board({ spaces: [{ ...space, facts: { houses: 'two' } }] }), actions: [] }],
    ['a fact that is null', { board: board({ spaces: [{ ...space, facts: { houses: null } }] }), actions: [] }],
    ['a board with no bank', { board: { spaces: [], pieces: {}, roll: null, counters: [], out: [] }, actions: [] }],
    ['a bank that is not a list', { board: board({ bank: {} }), actions: [] }],
    ['a bank entry with no count', { board: board({ bank: [{ name: 'houses' }] }), actions: [] }],
    ['a bank entry with no name', { board: board({ bank: [{ count: 3 }] }), actions: [] }],
    ['a piece that is not a number', { board: board({ pieces: { p0: 'x' } }), actions: [] }],
    ['a roll of text', { board: board({ roll: 'six' }), actions: [] }],
    ['a counter value that is text', { board: board({ counters: [{ name: 'm', values: { p0: 'x' } }] }), actions: [] }],
    ['seats that are out given as a number', { board: board({ out: 1 }), actions: [] }],
  ])('refuses %s', (_name, extras) => expect(readSeatExtras(extras)).toBeNull());
});
