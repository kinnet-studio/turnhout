import { describe, expect, it } from 'vitest';
import type { GameState } from '../game-state';
import type { Json } from '../table-def';
import { markOut, placePiece, queueRoll, setBank, setCounter, setGameNumber, setOwner, setPlayerFact, setSpaceFact, withBoardData } from './board-state';
import { readSeatExtras, seatExtras } from './board-view';
import { changeCard } from './card-facts';
import { createEngine, initialState, seatsFor } from './build';
import { compileGame } from './compile';
import { RuleError } from './diagnostics';
import { createDefaultLibrary } from './library';
import { AMOUNT_BOARD, ANY_PLAYER_BOARD, deckGameText, HOLDING_BOARD, INTERRUPT_BOARD, PICK_BOARD, TEST_DUEL, TINY_BOARD, TINY_BOARD_HEAD } from './testing';
import type { CompiledGame } from './types';
import { relocate, zoneIdFor } from './zones';

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
/** TINY_BOARD where players can also be in jail, and have jail turns and a crown. */
const JAILING = TINY_BOARD.replace(
  '  There are two six-sided dice.',
  '  There are two six-sided dice.\n  Players can be in jail.\n  Players can have jail turns and a crown.',
);

describe('seat views of a board game', () => {
  it('shows the board and the buttons from each seat', () => {
    const { engine, runtime } = createEngine(game, lib, 2, initialState(game, 1));
    const p0 = seatExtras(engine, runtime, engine.getState(), 'p0');
    expect(p0.board!.spaces[1]).toEqual({ name: 'Mill Lane', color: 'brown', details: { kind: 'street', price: 60, rent: 2 }, facts: {}, stripes: [], owner: null });
    expect(p0.board!.pieces).toEqual({ p0: 0, p1: 0 });
    expect(p0.board!.counters).toEqual([{ name: 'money', values: { p0: 1500, p1: 1500 } }]);
    expect(p0.actions).toEqual([
      { move: 'roll the dice', label: 'Roll the dice', allowed: true, target: null, amount: false, players: null },
      { move: 'buy the space they are on', label: 'Buy the space you are on', allowed: 'they have rolled this turn', target: null, amount: false, players: null },
      { move: 'end their turn', label: 'End your turn', allowed: 'they have rolled this turn', target: null, amount: false, players: null },
    ]);
    expect(seatExtras(engine, runtime, engine.getState(), 'p1').actions.every((a) => a.allowed === "It's p0's turn.")).toBe(true);
  });

  it('shows the buttons any player may press as allowed from a seat whose turn it is not', () => {
    const anyone = compileGame(ANY_PLAYER_BOARD, lib).game!;
    const { engine, runtime } = createEngine(anyone, lib, 2, initialState(anyone, 1));
    const p1 = seatExtras(engine, runtime, engine.getState(), 'p1');
    expect(p1.actions.map((a) => [a.move, a.allowed])).toEqual([
      ['roll the dice', "It's p0's turn."], ['end their turn', "It's p0's turn."], ['wave', true], ['plant a flag on a street they own', 'There is no street you own.'],
    ]);
  });

  it('shows every button as out of the game to a seat that is out, even one any player may press', () => {
    const anyone = compileGame(ANY_PLAYER_BOARD, lib).game!;
    // Three players: with two, one going out would end the game at once.
    const start = markOut(withBoardData(initialState(anyone, 1), anyone, seatsFor(3)), 'p1');
    const { engine, runtime } = createEngine(anyone, lib, 3, start);
    const views = (seat: string) => seatExtras(engine, runtime, engine.getState(), seat).actions.map((a) => [a.move, a.allowed]);
    expect(views('p1')).toEqual(Array.from({ length: 4 }, (_, i) => [anyone.phases[0].actions[i].words, "You're out of the game."]));
    expect(views('p2').find(([move]) => move === 'wave')).toEqual(['wave', true]);
  });

  it('keeps a space with no color without one, and lists every space in loop order', () => {
    const { engine, runtime } = createEngine(game, lib, 2, initialState(game, 1));
    const { board } = seatExtras(engine, runtime, engine.getState(), 'p0');
    expect(board!.spaces.map((s) => s.name)).toEqual(['Go', 'Mill Lane', 'Income Tax', 'Rose Lane']);
    expect(board!.spaces[0]).toEqual({ name: 'Go', color: null, details: { kind: 'go' }, facts: {}, stripes: [], owner: null });
    expect(board!.spaces[2]).toEqual({ name: 'Income Tax', color: null, details: { kind: 'tax', tax: 200 }, facts: {}, stripes: [], owner: null });
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
      move: 'buy the space they are on', label: 'Buy the space you are on', allowed: 'Line 24 (“they have at least its price in money”): Go has no price.', target: null, amount: false, players: null,
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
      target: { prompt: 'Pick a street you own', spaces: { [ROSE]: 'no street of its color has fewer buildings', [LILY]: true } }, amount: false, players: null,
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
      target: { prompt: 'Pick a street you own', spaces: { [ROSE]: 'no street of its color has fewer buildings' } }, amount: false, players: null,
    });
  });

  it('says there is no such space for a seat that has none to pick', () => {
    expect(build('p1')).toEqual({
      move: BUILD, label: 'Build a house', allowed: 'There is no street you own.',
      target: { prompt: 'Pick a street you own', spaces: {} }, amount: false, players: null,
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

  it('greys a button whose target cannot be answered with that sentence, with nothing to pick, instead of failing the view', () => {
    // A phrase only this test has, whose code fails as a careless one might.
    const cursedLib = createDefaultLibrary().target('a cursed street', () => {
      throw new RuleError('Nobody knows which street is cursed.');
    });
    const source = BUILDING.replace(BUILD, 'build a house on a cursed street');
    const cursed = compileGame(source, cursedLib);
    expect(cursed.diagnostics).toEqual([]);
    const { engine, runtime } = createEngine(cursed.game!, cursedLib, 2, initialState(cursed.game!, 1));
    const line = source.split('\n').findIndex((text) => text.includes('cursed')) + 1;
    const { actions } = seatExtras(engine, runtime, engine.getState(), 'p0');
    expect(actions.find((a) => a.move === 'build a house on a cursed street')).toEqual({
      move: 'build a house on a cursed street', label: 'Build a house', allowed: `Line ${line} (“a cursed street”): Nobody knows which street is cursed.`,
      target: { prompt: 'Pick a cursed street', spaces: {} }, amount: false, players: null,
    });
    // The other buttons are as they would be.
    expect(actions.find((a) => a.move === 'roll the dice')!.allowed).toBe(true);
    // Once the game is over, that is what it says, as every button does: p0 rolls onto Income Tax with too little to pay it.
    const broke = queueRoll(setCounter(withBoardData(initialState(cursed.game!, 1), cursed.game!, ['p0', 'p1']), 'money', 'p0', 100), [1, 1]);
    const over = createEngine(cursed.game!, cursedLib, 2, broke);
    over.engine.dispatch({ type: 'roll the dice', by: 'p0' });
    expect(over.engine.getState().result).toBeDefined();
    expect(seatExtras(over.engine, over.runtime, over.engine.getState(), 'p0').actions.find((a) => a.target !== null)).toMatchObject({
      allowed: 'The game is over.', target: { spaces: {} },
    });
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
      target: { prompt: 'Pick a street you own', spaces: {} }, amount: false, players: null,
    });
  });

  it('is plain data, and readSeatExtras reads it back', () => {
    const extras = view('p0');
    const sent: Json = JSON.parse(JSON.stringify(extras));
    expect(sent).toEqual(extras);
    expect(readSeatExtras(sent)).toEqual(extras);
  });
});

describe('seat views of a board whose players have facts', () => {
  const built = compileGame(JAILING, lib);
  const g = built.game!;
  /** p0 is in jail with 1 jail turn; p1 has 0 jail turns and has taken its crown down. */
  const arranged = setPlayerFact(setPlayerFact(setPlayerFact(setPlayerFact(
    withBoardData(initialState(g, 1), g, ['p0', 'p1']), 'p0', 'in jail', true), 'p0', 'jail turns', 1), 'p1', 'jail turns', 0), 'p1', 'crown', false);
  const view = (seat: string, start = arranged) => {
    const { engine, runtime } = createEngine(g, lib, 2, start);
    return seatExtras(engine, runtime, engine.getState(), seat);
  };

  it('compiles with no diagnostics', () => expect(built.diagnostics).toEqual([]));

  it('shows every seat the facts of every player, and only the ones that are set', () => {
    for (const seat of ['p0', 'p1']) {
      expect(view(seat).board!.playerFacts, seat).toEqual({ p0: { 'in jail': true, 'jail turns': 1 }, p1: {} });
    }
  });

  it('has an empty entry for every seat when nothing is set, or when the game has no player facts', () => {
    const fresh = createEngine(g, lib, 2, initialState(g, 1));
    expect(seatExtras(fresh.engine, fresh.runtime, fresh.engine.getState(), 'p0').board!.playerFacts).toEqual({ p0: {}, p1: {} });
    const plain = createEngine(game, lib, 2, initialState(game, 1));
    expect(seatExtras(plain.engine, plain.runtime, plain.engine.getState(), 'p1').board!.playerFacts).toEqual({ p0: {}, p1: {} });
  });

  it('keeps the facts in the order the game declares them, whatever order they were set in', () => {
    const backwards = setPlayerFact(setPlayerFact(setPlayerFact(withBoardData(initialState(g, 1), g, ['p0', 'p1']), 'p0', 'crown', true), 'p0', 'jail turns', 2), 'p0', 'in jail', true);
    expect(Object.keys(view('p1', backwards).board!.playerFacts.p0)).toEqual(['in jail', 'jail turns', 'crown']);
  });

  it('is plain data, and readSeatExtras reads it back', () => {
    const extras = view('p0');
    const sent: Json = JSON.parse(JSON.stringify(extras));
    expect(sent).toEqual(extras);
    expect(readSeatExtras(sent)).toEqual(extras);
  });

  it('refuses player facts that are not numbers or flags, or that are missing', () => {
    const extras = JSON.parse(JSON.stringify(view('p0')));
    expect(readSeatExtras({ ...extras, board: { ...extras.board, playerFacts: { p0: { 'in jail': 'yes' } } } })).toBeNull();
    const { playerFacts: _gone, ...without } = extras.board;
    expect(readSeatExtras({ ...extras, board: without })).toBeNull();
  });
});

describe('seat views of a board with cards', () => {
  type Table = ReturnType<typeof createEngine>;
  const LUCKY = ['| name | says |', '| Free Pass | They keep this card in their kept cards. |', '| Dividend | They get 50 money. |'];
  const FATE = ['| name | says |', '| Calm | They get 0 money. |'];
  const built = compileGame(deckGameText(LUCKY, FATE), lib);
  const g = built.game!;
  const idOf = (state: GameState, name: string) => state.cards.find((c) => c.data?.name === name)!.id;
  /** p0 to move on Go, the named lucky card on top of its pile and a 1 and a 1 to roll, which land on the first Lucky space. */
  function started(game: CompiledGame, top: string, arrange: (s: GameState) => GameState = (s) => s): Table {
    let s: GameState = { ...withBoardData(initialState(game, 1), game, seatsFor(2)), turn: { current: 'p0', phase: 'playing' } };
    s = relocate(s, [idOf(s, top)], 'lucky-pile', game);
    return createEngine(game, lib, 2, arrange(queueRoll(placePiece(s, 'p0', 0), [1, 1])));
  }
  const view = ({ engine, runtime }: Table, seat: string) => seatExtras(engine, runtime, engine.getState(), seat);
  const rollDice = ({ engine }: Table) => engine.dispatch({ type: 'roll the dice', by: 'p0' });

  it('compiles with no diagnostics', () => expect(built.diagnostics).toEqual([]));

  it('shows no last card drawn before one is drawn, and then the same card to every seat', () => {
    const table = started(g, 'Dividend');
    for (const seat of ['p0', 'p1']) expect(view(table, seat).board!.lastDrawn, seat).toBeNull();
    expect(rollDice(table).ok).toBe(true);
    for (const seat of ['p0', 'p1']) {
      expect(view(table, seat).board!.lastDrawn, seat).toEqual({ seat: 'p0', zone: 'the lucky pile', name: 'Dividend', says: 'They get 50 money.' });
    }
  });

  it('shows the cards each player keeps where everyone can see them, to every seat', () => {
    const table = started(g, 'Free Pass');
    for (const seat of ['p0', 'p1']) expect(view(table, seat).board!.playerCards, seat).toEqual({ p0: [], p1: [] });
    rollDice(table);
    for (const seat of ['p0', 'p1']) expect(view(table, seat).board!.playerCards, seat).toEqual({ p0: ['Free Pass'], p1: [] });
  });

  it("lists a seat's cards zone by zone in Table order, and slot by slot in each", () => {
    // The bench is written after the kept cards, though it would sort before them.
    const benched = compileGame(deckGameText(LUCKY, FATE).replace(
      '  Each player has a kept cards row that everyone can see.',
      '  Each player has a kept cards row that everyone can see.\n  Each player has a bench row that everyone can see.',
    ), lib);
    expect(benched.diagnostics).toEqual([]);
    const bg = benched.game!;
    const table = started(bg, 'Dividend', (s) => relocate(relocate(s, [idOf(s, 'Dividend'), idOf(s, 'Free Pass')], 'kept-cards-p0', bg), [idOf(s, 'Calm')], 'bench-p0', bg));
    for (const seat of ['p0', 'p1']) expect(view(table, seat).board!.playerCards, seat).toEqual({ p0: ['Dividend', 'Free Pass', 'Calm'], p1: [] });
  });

  it('Review Focus: a zone only its owner can see is never listed, and no name of a card in a pile or a hand reaches a view', () => {
    const hidden = compileGame(deckGameText(LUCKY, FATE).replace(
      '  Each player has a kept cards row that everyone can see.',
      '  Each player has a kept cards row that everyone can see.\n  Each player has a hand that only they can see.',
    ), lib);
    expect(hidden.diagnostics).toEqual([]);
    const hg = hidden.game!;
    const table = started(hg, 'Free Pass', (s) => relocate(s, [idOf(s, 'Dividend')], 'hand-p0', hg));
    for (const seat of ['p0', 'p1']) {
      const extras = view(table, seat);
      expect(extras.board!.playerCards, seat).toEqual({ p0: [], p1: [] });
      // Dividend is in p0's hand and Free Pass is on top of the lucky pile: neither is anything a view may say.
      expect(JSON.stringify(extras), seat).not.toMatch(/Dividend|Free Pass/);
    }
  });

  it('is plain data, and readSeatExtras reads it back after a card is drawn', () => {
    const table = started(g, 'Dividend');
    rollDice(table);
    const extras = view(table, 'p1');
    expect(extras.board!.lastDrawn).toMatchObject({ name: 'Dividend' });
    expect(readSeatExtras(JSON.parse(JSON.stringify(extras)))).toEqual(extras);
  });

  it('refuses a last card drawn that is not four texts, and cards kept that are not lists of names, or are missing', () => {
    const table = started(g, 'Free Pass');
    rollDice(table);
    const extras = JSON.parse(JSON.stringify(view(table, 'p0')));
    const withBoard = (over: { [k: string]: Json }) => ({ ...extras, board: { ...extras.board, ...over } });
    const { lastDrawn: _drawn, ...noLastDrawn } = extras.board;
    const { playerCards: _kept, ...noPlayerCards } = extras.board;
    expect(readSeatExtras(extras)).not.toBeNull();
    expect(readSeatExtras(withBoard({ lastDrawn: { seat: 'p0' } }))).toBeNull();
    expect(readSeatExtras(withBoard({ lastDrawn: { seat: 'p0', zone: 'the lucky pile', name: 'Dividend', says: 7 } }))).toBeNull();
    expect(readSeatExtras(withBoard({ lastDrawn: 'Dividend' }))).toBeNull();
    expect(readSeatExtras({ ...extras, board: noLastDrawn })).toBeNull();
    expect(readSeatExtras(withBoard({ playerCards: { p0: [1] } }))).toBeNull();
    expect(readSeatExtras(withBoard({ playerCards: { p0: 'Free Pass' } }))).toBeNull();
    expect(readSeatExtras(withBoard({ playerCards: [] }))).toBeNull();
    expect(readSeatExtras({ ...extras, board: noPlayerCards })).toBeNull();
  });
});

describe('seat views of the flags on kept cards', () => {
  const holding = compileGame(HOLDING_BOARD, lib).game!;
  const start: GameState = { ...withBoardData(initialState(holding, 1), holding, seatsFor(2)), turn: { current: 'p0', phase: 'playing' } };
  const pass = start.cards.find((c) => c.data?.name === 'Pass')!.id;
  /** p0 keeps the Pass. */
  const kept = relocate(start, [pass], zoneIdFor('kept cards', 'p0'), holding);
  const viewIn = (state: GameState, seat: string) => {
    const { engine, runtime } = createEngine(holding, lib, 2, state);
    return seatExtras(engine, runtime, engine.getState(), seat);
  };

  it('lists no flag for a card nothing has flagged, to every seat', () => {
    for (const seat of ['p0', 'p1']) {
      const board = viewIn(kept, seat).board!;
      expect([board.playerCards, board.playerCardFlags], seat).toEqual([{ p0: ['Pass'], p1: [] }, { p0: [[]], p1: [] }]);
    }
  });
  it('lists the flags set on a card, parallel to its name, to every seat', () => {
    const lent = changeCard(kept, pass, { lent: true }, holding);
    for (const seat of ['p0', 'p1']) {
      const board = viewIn(lent, seat).board!;
      expect([board.playerCards, board.playerCardFlags], seat).toEqual([{ p0: ['Pass'], p1: [] }, { p0: [['lent']], p1: [] }]);
    }
  });
  it('leaves out a flag that was cleared again', () => {
    const cleared = changeCard(changeCard(kept, pass, { lent: true }, holding), pass, { lent: null }, holding);
    expect(viewIn(cleared, 'p0').board!.playerCardFlags).toEqual({ p0: [[]], p1: [] });
  });
  it('is plain data, and readSeatExtras refuses flags that are missing or not lists of lists of text', () => {
    const extras = JSON.parse(JSON.stringify(viewIn(changeCard(kept, pass, { lent: true }, holding), 'p0')));
    const withBoard = (over: { [k: string]: Json }) => ({ ...extras, board: { ...extras.board, ...over } });
    const { playerCardFlags: _flags, ...noFlags } = extras.board;
    expect(readSeatExtras(extras)).toEqual(extras);
    expect(readSeatExtras({ ...extras, board: noFlags })).toBeNull();
    expect(readSeatExtras(withBoard({ playerCardFlags: { p0: [['lent', 3]] } }))).toBeNull();
    expect(readSeatExtras(withBoard({ playerCardFlags: { p0: ['lent'] } }))).toBeNull();
    expect(readSeatExtras(withBoard({ playerCardFlags: [] }))).toBeNull();
  });
});

describe('seat views of debts and of flags no bank item goes with', () => {
  // A hotel goes with the bank's hotels; mortgaged goes with nothing, so the page stripes it.
  const TEXT = ANY_PLAYER_BOARD.replace(
    '  There are two six-sided dice.',
    '  There are two six-sided dice.\n  Spaces can have a hotel.\n  Spaces can be mortgaged.\n  The bank has 12 hotels.',
  );
  const built = compileGame(TEXT, lib);
  const g = built.game!;
  /** p1 owns Rose Lane (3); p0 has 10 money and a 1 and a 2 to roll, which land on it and cost 14. */
  const arranged = queueRoll(setCounter(setOwner(withBoardData(initialState(g, 1), g, ['p0', 'p1']), ROSE, 'p1'), 'money', 'p0', 10), [1, 2]);
  const table = (start = arranged) => createEngine(g, lib, 2, start);
  const view = ({ engine, runtime }: ReturnType<typeof table>, seat: string) => seatExtras(engine, runtime, engine.getState(), seat);

  it('compiles with no diagnostics', () => expect(built.diagnostics).toEqual([]));

  it('shows every seat whom each player owes, from the payment that took them below 0 until they are back to 0', () => {
    const t = table();
    for (const seat of ['p0', 'p1']) expect(view(t, seat).board!.owes, seat).toEqual({});
    expect(t.engine.dispatch({ type: 'roll the dice', by: 'p0' }).ok).toBe(true);
    for (const seat of ['p0', 'p1']) expect(view(t, seat).board!.owes, seat).toEqual({ p0: 'p1' });
    expect(t.engine.dispatch({ type: 'wave', by: 'p0' }).ok).toBe(true);
    for (const seat of ['p0', 'p1']) expect(view(t, seat).board!.owes, seat).toEqual({});
  });

  it('shows a debt to the bank as owed to the bank', () => {
    // The tax is the bank's to collect: p0 has 10 money and a 1 and a 1 to roll, which land on Income Tax (200).
    const taxed = compileGame(TEXT.replace(
      '  After a player ends their turn', '  When a player lands on a tax space:\n    They pay its tax.\n  After a player ends their turn',
    ), lib);
    expect(taxed.diagnostics).toEqual([]);
    const tg = taxed.game!;
    const start = queueRoll(setCounter(withBoardData(initialState(tg, 1), tg, ['p0', 'p1']), 'money', 'p0', 10), [1, 1]);
    const { engine, runtime } = createEngine(tg, lib, 2, start);
    expect(engine.dispatch({ type: 'roll the dice', by: 'p0' }).ok).toBe(true);
    for (const seat of ['p0', 'p1']) expect(seatExtras(engine, runtime, engine.getState(), seat).board!.owes, seat).toEqual({ p0: 'bank' });
  });

  it('leaves out a seat that is out, though its counter is still below 0', () => {
    // Three players, so p0 going out does not end the game.
    const owing = queueRoll(setCounter(setOwner(withBoardData(initialState(g, 1), g, seatsFor(3)), ROSE, 'p1'), 'money', 'p0', 10), [1, 2]);
    const first = createEngine(g, lib, 3, owing);
    expect(first.engine.dispatch({ type: 'roll the dice', by: 'p0' }).ok).toBe(true);
    expect(view(first, 'p2').board!.owes).toEqual({ p0: 'p1' });
    // p0 goes out with the debt still on the books.
    const { board } = view(createEngine(g, lib, 3, markOut(first.engine.getState(), 'p0')), 'p2');
    expect(board!.out).toEqual(['p0']);
    expect(board!.counters[0].values.p0).toBeLessThan(0);
    expect(board!.owes).toEqual({});
  });

  it('has no debts for a board with no pay-with counter', () => {
    // Nothing on this board takes a payment, so no counter is the one a debt is kept against.
    const free = compileGame([
      TINY_BOARD_HEAD.replace('  Players pay with money.\n', ''), '  A player may roll the dice.', '    Then:', '      Roll the dice.',
      '  A player may end their turn.', '  After a player ends their turn, the turn passes to the left.',
      '', 'End:', '  The game ends when one player is left.', '  That player wins.',
    ].join('\n'), lib);
    expect(free.diagnostics).toEqual([]);
    const { engine, runtime } = createEngine(free.game!, lib, 2, initialState(free.game!, 1));
    expect(seatExtras(engine, runtime, engine.getState(), 'p0').board!.owes).toEqual({});
  });

  it('lists the flags no bank item goes with as stripes, and still keeps them in facts', () => {
    const flagged = setSpaceFact(setSpaceFact(arranged, ROSE, 'hotel', true), ROSE, 'mortgaged', true);
    for (const seat of ['p0', 'p1']) {
      const { spaces } = view(table(flagged), seat).board!;
      expect(spaces[ROSE].facts, seat).toEqual({ hotel: true, mortgaged: true });
      expect(spaces[ROSE].stripes, seat).toEqual(['mortgaged']);
      expect(spaces[1].stripes, seat).toEqual([]);
    }
  });

  it('does not stripe a count, though no bank item goes with it, and still keeps it in facts', () => {
    const counted = compileGame(TEXT.replace('  Spaces can be mortgaged.', '  Spaces can have visitors.\n  Spaces can be mortgaged.'), lib);
    expect(counted.diagnostics).toEqual([]);
    const cg = counted.game!;
    const start = setSpaceFact(setSpaceFact(withBoardData(initialState(cg, 1), cg, ['p0', 'p1']), ROSE, 'visitors', 3), ROSE, 'mortgaged', true);
    const { engine, runtime } = createEngine(cg, lib, 2, start);
    const rose = seatExtras(engine, runtime, engine.getState(), 'p0').board!.spaces[ROSE];
    expect(rose.facts).toEqual({ visitors: 3, mortgaged: true });
    expect(rose.stripes).toEqual(['mortgaged']);
  });

  it('has no stripes on a space with nothing set, or with only a flag a bank item goes with', () => {
    expect(view(table(), 'p0').board!.spaces.map((s) => s.stripes)).toEqual([[], [], [], []]);
    const hotelled = setSpaceFact(arranged, ROSE, 'hotel', true);
    expect(view(table(hotelled), 'p0').board!.spaces[ROSE].stripes).toEqual([]);
  });

  it('is plain data, and readSeatExtras reads it back while a player owes', () => {
    const t = table();
    t.engine.dispatch({ type: 'roll the dice', by: 'p0' });
    const extras = view(t, 'p1');
    expect(extras.board!.owes).toEqual({ p0: 'p1' });
    expect(readSeatExtras(JSON.parse(JSON.stringify(extras)))).toEqual(extras);
  });

  it('refuses debts that are not a map of text, or are missing, and stripes that are not a list of text, or are missing', () => {
    const t = table();
    t.engine.dispatch({ type: 'roll the dice', by: 'p0' });
    const extras = JSON.parse(JSON.stringify(view(t, 'p0')));
    const withBoard = (over: { [k: string]: Json }) => ({ ...extras, board: { ...extras.board, ...over } });
    const withSpace = (over: { [k: string]: Json }) => withBoard({ spaces: extras.board.spaces.map((s: object, i: number) => (i === ROSE ? { ...s, ...over } : s)) });
    const { owes: _owes, ...noOwes } = extras.board;
    const { stripes: _stripes, ...noStripes } = extras.board.spaces[ROSE];
    expect(readSeatExtras(extras)).not.toBeNull();
    expect(readSeatExtras(withBoard({ owes: { p0: 3 } }))).toBeNull();
    expect(readSeatExtras(withBoard({ owes: [] }))).toBeNull();
    expect(readSeatExtras({ ...extras, board: noOwes })).toBeNull();
    expect(readSeatExtras(withSpace({ stripes: [1] }))).toBeNull();
    expect(readSeatExtras(withSpace({ stripes: 'mortgaged' }))).toBeNull();
    expect(readSeatExtras(withBoard({ spaces: extras.board.spaces.map((s: object, i: number) => (i === ROSE ? noStripes : s)) }))).toBeNull();
  });
});

describe("seat views of the game's numbers", () => {
  const POT = TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  The game has a pot of 5.');
  const built = compileGame(POT, lib);
  const g = built.game!;
  const view = (seat: string, start: GameState = initialState(g, 1), played: CompiledGame = g) => {
    const { engine, runtime } = createEngine(played, lib, 2, start);
    return seatExtras(engine, runtime, engine.getState(), seat);
  };
  const arranged = (change: (state: GameState) => GameState) => change(withBoardData(initialState(g, 1), g, ['p0', 'p1']));

  // The head of a board has no End: section, which is a warning, not a mistake.
  it('compiles with no errors', () => expect(built.diagnostics.filter((d) => d.severity === 'error')).toEqual([]));

  it('shows every seat the game numbers that are not 0, where they start', () => {
    for (const seat of ['p0', 'p1']) expect(view(seat).board!.gameNumbers, seat).toEqual([{ name: 'pot', value: 5 }]);
  });

  it('leaves out a number a rule set to 0', () => {
    for (const seat of ['p0', 'p1']) expect(view(seat, arranged((s) => setGameNumber(s, 'pot', 0))).board!.gameNumbers, seat).toEqual([]);
  });

  it('lists them in the order the game declares them, whatever order they were set in, and leaves out one that starts at 0', () => {
    const two = compileGame(POT.replace('  The game has a pot of 5.', '  The game has a pot of 5.\n  The game has a limit of 0.\n  The game has a cap of 3.'), lib).game!;
    const start = (change: (state: GameState) => GameState) => change(withBoardData(initialState(two, 1), two, ['p0', 'p1']));
    expect(view('p0', initialState(two, 1), two).board!.gameNumbers).toEqual([{ name: 'pot', value: 5 }, { name: 'cap', value: 3 }]);
    const backwards = start((s) => setGameNumber(setGameNumber(s, 'cap', 8), 'limit', 7));
    expect(view('p1', backwards, two).board!.gameNumbers).toEqual([{ name: 'pot', value: 5 }, { name: 'limit', value: 7 }, { name: 'cap', value: 8 }]);
  });

  it('has none for a board that declares none', () => {
    const plain = createEngine(game, lib, 2, initialState(game, 1));
    expect(seatExtras(plain.engine, plain.runtime, plain.engine.getState(), 'p0').board!.gameNumbers).toEqual([]);
  });

  it('is plain data, and readSeatExtras reads it back', () => {
    const extras = view('p0');
    expect(readSeatExtras(JSON.parse(JSON.stringify(extras)))).toEqual(extras);
  });

  it('refuses game numbers that are not a list of a name and a number, or that are missing', () => {
    const extras = JSON.parse(JSON.stringify(view('p0')));
    const withBoard = (over: { [k: string]: Json }) => ({ ...extras, board: { ...extras.board, ...over } });
    const { gameNumbers: _gone, ...without } = extras.board;
    expect(readSeatExtras(extras)).not.toBeNull();
    expect(readSeatExtras({ ...extras, board: without })).toBeNull();
    expect(readSeatExtras(withBoard({ gameNumbers: [{ name: 'pot', value: '5' }] }))).toBeNull();
    expect(readSeatExtras(withBoard({ gameNumbers: [{ value: 5 }] }))).toBeNull();
    expect(readSeatExtras(withBoard({ gameNumbers: { pot: 5 } }))).toBeNull();
  });
});

describe('seat views of a button that carries an amount', () => {
  const pot = compileGame(AMOUNT_BOARD, lib).game!;
  const RAISE = 'raise an amount';
  /** A two-player game of AMOUNT_BOARD with a roll of 1 and 2 queued, `arrange` having had its say on the start; p0 has rolled when `rolled`. */
  const played = (rolled: boolean, arrange: (s: GameState) => GameState = (s) => s) => {
    const built = createEngine(pot, lib, 2, arrange(queueRoll(withBoardData(initialState(pot, 1), pot, ['p0', 'p1']), [1, 2])));
    if (rolled) expect(built.engine.dispatch({ type: 'roll the dice', by: 'p0' }).ok).toBe(true);
    return built;
  };
  const actionsOf = (seat: string, built: ReturnType<typeof played>) => seatExtras(built.engine, built.runtime, built.engine.getState(), seat).actions;
  const raiseOf = (seat: string, built: ReturnType<typeof played>) => actionsOf(seat, built).find((a) => a.move === RAISE);

  it('shows the reason a rule that does not read the amount gives, before the turn has got that far', () => {
    expect(raiseOf('p0', played(false))).toEqual({ move: RAISE, label: 'Raise', allowed: 'they have rolled this turn', target: null, amount: true, players: null });
  });
  it('shows the button as live once only the amount is missing, although none has been typed', () => {
    const built = played(true);
    expect(raiseOf('p0', built)!.allowed).toBe(true);
    expect(raiseOf('p1', built)!.allowed).toBe("It's p0's turn.");
  });
  it('leaves the lines that read the amount until one is typed, so a player with no money still sees the button live', () => {
    expect(raiseOf('p0', played(true, (s) => setCounter(s, 'money', 'p0', 0)))!.allowed).toBe(true);
  });
  it('says a seat that is out is out, whatever the amount lines would say', () => {
    const three = createEngine(pot, lib, 3, markOut(withBoardData(initialState(pot, 1), pot, seatsFor(3)), 'p1'));
    expect(seatExtras(three.engine, three.runtime, three.engine.getState(), 'p1').actions.map((a) => [a.move, a.allowed]).find(([m]) => m === RAISE))
      .toEqual([RAISE, "You're out of the game."]);
  });
  it('tells the other buttons from it', () => {
    expect(actionsOf('p0', played(false)).map((a) => [a.move, a.amount])).toEqual([['roll the dice', false], [RAISE, true], ['end their turn', false]]);
  });
  it('is plain data, and readSeatExtras reads it back', () => {
    const built = played(true);
    const extras = seatExtras(built.engine, built.runtime, built.engine.getState(), 'p0');
    expect(readSeatExtras(JSON.parse(JSON.stringify(extras)))).toEqual(extras);
  });
});

describe('seat views of a button that picks another player', () => {
  const pick = compileGame(PICK_BOARD, lib).game!;
  const CHALLENGE = 'challenge another player';
  /** A three-player game of PICK_BOARD with a roll of 1 and 2 queued, `arrange` having had its say on the start; p0 has rolled when `rolled`. */
  const played = (rolled: boolean, arrange: (s: GameState) => GameState = (s) => s) => {
    const built = createEngine(pick, lib, 3, arrange(queueRoll(withBoardData(initialState(pick, 1), pick, seatsFor(3)), [1, 2])));
    if (rolled) expect(built.engine.dispatch({ type: 'roll the dice', by: 'p0' }).ok).toBe(true);
    return built;
  };
  const actionsOf = (seat: string, built: ReturnType<typeof played>) => seatExtras(built.engine, built.runtime, built.engine.getState(), seat).actions;
  const view = (seat: string, built: ReturnType<typeof played>) => actionsOf(seat, built).find((a) => a.move === CHALLENGE)!;

  it('shows each player to pick with the reason the press would be refused, before the turn has got that far', () => {
    expect(view('p0', played(false))).toEqual({
      move: CHALLENGE, label: 'Challenge another player', allowed: 'they have rolled this turn', target: null, amount: false,
      players: { p1: 'they have rolled this turn', p2: 'they have rolled this turn' },
    });
  });
  it('shows every other player as one to pick once the player has rolled, and the others the turn that is not theirs', () => {
    const built = played(true);
    expect(view('p0', built)).toMatchObject({ allowed: true, players: { p1: true, p2: true } });
    expect(view('p1', built)).toMatchObject({ allowed: "It's p0's turn.", players: { p0: "It's p0's turn.", p2: "It's p0's turn." } });
  });
  it('lists no player who is out, and says a seat that is out is out', () => {
    const built = played(true, (s) => markOut(s, 'p2'));
    expect(view('p0', built)).toMatchObject({ allowed: true, players: { p1: true } });
    expect(Object.keys(view('p0', built).players!)).toEqual(['p1']);
    expect(view('p2', built)).toMatchObject({ allowed: "You're out of the game.", players: {} });
  });
  it('has no one to pick when every other player is out, and asks for the pick that can not be made', () => {
    // The end rule that PICK_BOARD has would end the game with one player left, so this table plays on while no one has 2000 money.
    const going = compileGame(PICK_BOARD.replace('The game ends when one player is left.', 'The game ends when no player has less than 2000 money.'), lib).game!;
    const built = createEngine(going, lib, 3, markOut(markOut(withBoardData(initialState(going, 1), going, seatsFor(3)), 'p1'), 'p2'));
    expect(seatExtras(built.engine, built.runtime, built.engine.getState(), 'p0').actions.find((a) => a.move === CHALLENGE))
      .toMatchObject({ allowed: 'Pick another player to challenge.', players: {} });
  });
  it('says the game is over to every seat, whoever is left to pick', () => {
    // p0 puts themselves out by challenging, which leaves p1 the only player in.
    const ending = compileGame(PICK_BOARD.replace('      That player is the rival.', '      That player is the rival.\n      They are out.'), lib).game!;
    const over = createEngine(ending, lib, 2, queueRoll(withBoardData(initialState(ending, 1), ending, seatsFor(2)), [1, 2]));
    over.engine.dispatch({ type: 'roll the dice', by: 'p0' });
    expect(over.engine.dispatch({ type: CHALLENGE, by: 'p0', player: 'p1' }).ok).toBe(true);
    expect(over.engine.getState().result).toBeDefined();
    for (const seat of ['p0', 'p1']) {
      const challenge = seatExtras(over.engine, over.runtime, over.engine.getState(), seat).actions.find((a) => a.move === CHALLENGE);
      expect(challenge, seat).toMatchObject({ allowed: 'The game is over.' });
    }
  });
  it('is null for the buttons that pick no player', () => {
    expect(actionsOf('p0', played(false)).filter((a) => a.move !== CHALLENGE).map((a) => [a.move, a.players])).toEqual([['roll the dice', null], ['end their turn', null]]);
  });
  it('is plain data, and readSeatExtras reads it back', () => {
    const built = played(true);
    const extras = seatExtras(built.engine, built.runtime, built.engine.getState(), 'p0');
    expect(readSeatExtras(JSON.parse(JSON.stringify(extras)))).toEqual(extras);
  });
});

describe('seat views while a turn is interrupted', () => {
  const vote = compileGame(INTERRUPT_BOARD, lib).game!;
  /** A two-player game of INTERRUPT_BOARD in which each of `moves` is made in turn, by the seat it names. */
  const played = (...moves: [string, string][]) => {
    const start = { ...withBoardData(initialState(vote, 1), vote, ['p0', 'p1']), turn: { current: 'p0', phase: 'playing' } };
    const built = createEngine(vote, lib, 2, queueRoll(start, [1, 2]));
    for (const [by, type] of moves) expect(built.engine.dispatch({ type, by }).ok, type).toBe(true);
    return built;
  };
  const view = (seat: string, built: ReturnType<typeof played>) => seatExtras(built.engine, built.runtime, built.engine.getState(), seat);
  const CALL: [string, string][] = [['p0', 'roll the dice'], ['p0', 'call a vote']];

  it('says no turn is interrupted while play is in the turn it started in', () => {
    for (const seat of ['p0', 'p1']) expect(view(seat, played()).board!.interrupted, seat).toBe(false);
  });
  it('says so to every seat while the vote holds the turn, and no longer once it has gone back', () => {
    const calling = played(...CALL);
    expect(calling.engine.getState().turn!.phase).toBe('vote');
    for (const seat of ['p0', 'p1']) expect(view(seat, calling).board!.interrupted, seat).toBe(true);
    const closed = played(...CALL, ['p1', 'close the vote']);
    expect(closed.engine.getState().turn!.phase).toBe('playing');
    for (const seat of ['p0', 'p1']) expect(view(seat, closed).board!.interrupted, seat).toBe(false);
  });
  it('is plain data, and readSeatExtras reads it back', () => {
    const extras = view('p0', played(...CALL));
    expect(readSeatExtras(JSON.parse(JSON.stringify(extras)))).toEqual(extras);
  });
  it('refuses a board that does not say whether a turn is interrupted', () => {
    const extras = JSON.parse(JSON.stringify(view('p0', played())));
    const { interrupted: _gone, ...without } = extras.board;
    expect(readSeatExtras(extras)).not.toBeNull();
    expect(readSeatExtras({ ...extras, board: without })).toBeNull();
    expect(readSeatExtras({ ...extras, board: { ...extras.board, interrupted: 'yes' } })).toBeNull();
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

  const space = { name: 'Go', color: null, details: {}, facts: {}, stripes: [], owner: null };
  const board = (over: { [k: string]: Json } = {}) => ({
    spaces: [], pieces: {}, roll: null, counters: [], out: [], bank: [], playerFacts: {}, lastDrawn: null, playerCards: {}, playerCardFlags: {}, owes: {}, gameNumbers: [], interrupted: false, ...over,
  });
  const action = (over: { [k: string]: Json } = {}) => ({ move: 'roll the dice', label: 'Roll', allowed: true, target: null, amount: false, players: null, ...over });
  const picking = (over: { [k: string]: Json } = {}) => action({ target: { prompt: 'Pick a street you own', spaces: { 3: true }, ...over } });

  it('reads a button that picks another player, with a verdict for each player', () => {
    const extras = { board: null, actions: [action({ players: { p1: true, p2: 'It\'s p0\'s turn.' } }), action({ players: {} })] };
    expect(readSeatExtras(extras)).toEqual(extras);
  });

  it('reads a board with facts, stripes, debts, a bank and a button that picks a space', () => {
    const extras = {
      board: board({
        spaces: [{ ...space, facts: { houses: 2, hotel: true, mortgaged: true }, stripes: ['mortgaged'] }], bank: [{ name: 'houses', count: 32 }],
        owes: { p0: 'p1', p2: 'bank' },
      }),
      actions: [picking({ spaces: { 3: true, 4: 'not yours' } })],
    };
    expect(readSeatExtras(extras)).toEqual(extras);
  });

  it.each([
    ['null', null],
    ['a number', 7],
    ['a list', []],
    ['no actions', { board: null }],
    ['actions that are not a list', { board: null, actions: {} }],
    ['an action with no label', { board: null, actions: [{ move: 'roll the dice', allowed: true, target: null, amount: false, players: null }] }],
    ['an action with no move type', { board: null, actions: [{ label: 'Roll', allowed: true, target: null, amount: false, players: null }] }],
    ['an action that is allowed with false', { board: null, actions: [action({ allowed: false })] }],
    ['an action with no target field', { board: null, actions: [{ move: 'roll the dice', label: 'Roll', allowed: true, amount: false, players: null }] }],
    ['an action with no amount field', { board: null, actions: [{ move: 'roll the dice', label: 'Roll', allowed: true, target: null, players: null }] }],
    ['an action whose amount is not a boolean', { board: null, actions: [action({ amount: 'yes' })] }],
    ['an action with no players field', { board: null, actions: [{ move: 'roll the dice', label: 'Roll', allowed: true, target: null, amount: false }] }],
    ['players that are not a map', { board: null, actions: [action({ players: [] })] }],
    ['a player that is neither true nor a reason', { board: null, actions: [action({ players: { p1: 3 } })] }],
    ['a player that is false', { board: null, actions: [action({ players: { p1: false } })] }],
    ['a target that is not an object', { board: null, actions: [action({ target: 'a street' })] }],
    ['a target with no prompt', { board: null, actions: [action({ target: { spaces: {} } })] }],
    ['a target with no spaces', { board: null, actions: [action({ target: { prompt: 'Pick a street you own' } })] }],
    ['a target space that is neither true nor a reason', { board: null, actions: [picking({ spaces: { 3: false } })] }],
    ['a target space that is a number', { board: null, actions: [picking({ spaces: { 3: 1 } })] }],
    ['a board that is not an object', { board: 3, actions: [] }],
    ['a board with no spaces', { board: { pieces: {}, roll: null, counters: [], out: [], bank: [], playerFacts: {}, lastDrawn: null, playerCards: {}, playerCardFlags: {}, owes: {}, gameNumbers: [], interrupted: false }, actions: [] }],
    ['a space with no name', { board: board({ spaces: [{ color: null, details: {}, facts: {}, stripes: [], owner: null }] }), actions: [] }],
    ['a space with no facts', { board: board({ spaces: [{ name: 'Go', color: null, details: {}, stripes: [], owner: null }] }), actions: [] }],
    ['a fact that is text', { board: board({ spaces: [{ ...space, facts: { houses: 'two' } }] }), actions: [] }],
    ['a fact that is null', { board: board({ spaces: [{ ...space, facts: { houses: null } }] }), actions: [] }],
    ['a board with no bank', { board: { spaces: [], pieces: {}, roll: null, counters: [], out: [], playerFacts: {}, lastDrawn: null, playerCards: {}, playerCardFlags: {}, owes: {}, gameNumbers: [], interrupted: false }, actions: [] }],
    ['a bank that is not a list', { board: board({ bank: {} }), actions: [] }],
    ['a bank entry with no count', { board: board({ bank: [{ name: 'houses' }] }), actions: [] }],
    ['a bank entry with no name', { board: board({ bank: [{ count: 3 }] }), actions: [] }],
    ['a piece that is not a number', { board: board({ pieces: { p0: 'x' } }), actions: [] }],
    ['a roll of text', { board: board({ roll: 'six' }), actions: [] }],
    ['a counter value that is text', { board: board({ counters: [{ name: 'm', values: { p0: 'x' } }] }), actions: [] }],
    ['a board with no player facts', { board: { spaces: [], pieces: {}, roll: null, counters: [], out: [], bank: [], lastDrawn: null, playerCards: {}, playerCardFlags: {}, owes: {}, gameNumbers: [], interrupted: false }, actions: [] }],
    ['player facts that are not a map', { board: board({ playerFacts: [] }), actions: [] }],
    ['a seat whose facts are not a map', { board: board({ playerFacts: { p0: true } }), actions: [] }],
    ['a player fact that is text', { board: board({ playerFacts: { p0: { 'in jail': 'yes' } } }), actions: [] }],
    ['a player fact that is null', { board: board({ playerFacts: { p0: { 'in jail': null } } }), actions: [] }],
    ['seats that are out given as a number', { board: board({ out: 1 }), actions: [] }],
  ])('refuses %s', (_name, extras) => expect(readSeatExtras(extras)).toBeNull());
});
