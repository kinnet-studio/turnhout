import { describe, expect, it } from 'vitest';
import { MAX_FLOW_ITERATIONS } from '../flow';
import { zoneCards, type GameState } from '../game-state';
import type { Move, MoveContext } from '../moves';
import { RuleRegistry } from '../rules';
import {
  TURN_KEY, counterOf, gameNumber, isOut, markOut, ownerOf, pieceAt, placePiece, playerFact, queueRoll, setCounter, setOwner, setSpaceFact, spaceFact,
  withBoardData,
} from './board-state';
import { createEngine, flowDefFor, initialState, seatsFor } from './build';
import { compileGame } from './compile';
import { amountPrompt, amountReady, declaredActionHandler, pickPlayerPrompt, playerCandidates, targetCandidates } from './declared-actions';
import { friendlyError } from './friendly';
import { runExamples } from './examples';
import { createDefaultLibrary } from './library';
import { MAX_MOMENT_DEPTH } from './runtime';
import { AMOUNT_BOARD, ANY_PLAYER_BOARD, INTERRUPT_BOARD, MARK_BOARD, PICK_BOARD, TEST_DUEL, TINY_BOARD, TINY_BOARD_HEAD } from './testing';

const lib = createDefaultLibrary();
const game = compileGame(TINY_BOARD, lib).game!;
/** A two-player engine whose starting board has been arranged by `arrange`. */
const engineWith = (arrange: (s: GameState) => GameState, g = game) =>
  createEngine(g, lib, 2, arrange(withBoardData(initialState(g, 1), g, ['p0', 'p1']))).engine;

/** A board game with cards: a player may roll once a turn and play a card at any time, and playing passes the turn. */
const ROLL_AND_PLAY = [
  'Game: Roll and Play', 'Players: 2', '',
  'Cards:', '  A deck called tiles, starting in the draw pile:', '    | color | number | copies |', '    | red   | 1 to 9 | 2      |', '',
  'Table:', '  The draw pile is a pile in the center that no one can see.', '  The discard pile is a pile in the center that everyone can see.',
  '  Each player has a hand that only they can see.', '',
  'Board:', '  The board is a loop of spaces, starting at Go:', '    | space     | kind   |', '    | Go        | go     |', '    | Mill Lane | street |',
  '    | Rose Lane | street |', '    | Lily Lane | street |', '  Each player has a piece that starts on Go.', '  There are two six-sided dice.', '',
  'Setup:', '  Deal 3 cards from the draw pile to each hand.', '',
  'Phase: playing', '  Players take turns.',
  '  A player may roll the dice.', '    Only if they have not rolled this turn.', '    Then:', '      Roll the dice.', '      Their piece moves forward by the roll.',
  '  A player may play a card from their hand to the discard pile.',
  '  After a player plays, the turn passes to the left.',
].join('\n');

/** A roll button that everyone may press at once, each once. */
const EVERYONE_ROLLS = [
  TINY_BOARD_HEAD.replace('  Players take turns.', '  Everyone acts at once.'),
  '  A player may roll the dice.', '    Only if they have not rolled this turn.', '    Then:', '      Roll the dice.', '      Their piece moves forward by the roll.',
].join('\n');

/** TINY_BOARD with its tax rule moving the piece again: from Income Tax, a roll of 4 lands on Income Tax again. */
const LOOPING = TINY_BOARD.replace('  When a player lands on a tax space:\n    They pay its tax.', '  When a player lands on a tax space:\n    Their piece moves forward by the roll.');

describe('button actions on a board', () => {
  it('compiles TINY_BOARD with no diagnostics', () => expect(compileGame(TINY_BOARD, lib).diagnostics).toEqual([]));

  it('starts with every piece on Go and 1500 money each', () => {
    const s = createEngine(game, lib, 2, initialState(game, 1)).engine.getState();
    expect([pieceAt(s, 'p0'), counterOf(s, 'money', 'p1')]).toEqual([0, 1500]);
  });

  it("a button's move type is its wording", () => {
    const engine = engineWith((s) => queueRoll(s, [1, 2]));
    // The engine throws for a type it has no move of; the old one-word type is not one.
    expect(() => engine.dispatch({ type: 'roll', by: 'p0' })).toThrow('unknown move type: roll');
    expect(engine.dispatch({ type: 'roll the dice', by: 'p0' }).ok).toBe(true);
  });

  it('rolls once per turn, ends the turn, and passes it to the left', () => {
    const engine = engineWith((s) => queueRoll(s, [1, 2]));
    expect(engine.dispatch({ type: 'roll the dice', by: 'p0' }).ok).toBe(true);
    expect(engine.dispatch({ type: 'roll the dice', by: 'p0' })).toMatchObject({ ok: false, reason: 'they have not rolled this turn' });
    expect(engine.dispatch({ type: 'end their turn', by: 'p0' }).ok).toBe(true);
    expect(engine.getState().turn?.current).toBe('p1');
    expect(engine.canDispatch({ type: 'end their turn', by: 'p1' })).toBe('they have rolled this turn');
  });

  it('lets either roll button count as having rolled, and records only the one pressed', () => {
    const twoRolls = compileGame(TINY_BOARD.replace('  A player may end their turn.', [
      '  A player may roll for a double.', '    Only if they have not rolled this turn.', '    Then:', '      Roll the dice.',
      '  A player may end their turn.',
    ].join('\n')), lib).game!;
    for (const first of ['roll the dice', 'roll for a double']) {
      const engine = engineWith((s) => queueRoll(s, [1, 2]), twoRolls);
      expect(engine.dispatch({ type: 'end their turn', by: 'p0' }).reason).toBe('they have rolled this turn');
      expect(engine.dispatch({ type: first, by: 'p0' }).ok).toBe(true);
      expect(engine.getState().data[TURN_KEY]).toEqual({ p0: [first] });
      expect(engine.dispatch({ type: 'end their turn', by: 'p0' }).ok).toBe(true);
    }
  });

  it('forgets what was done when a card move the After line names passes the turn', () => {
    const { game: g, diagnostics } = compileGame(ROLL_AND_PLAY, lib);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const { engine } = createEngine(g!, lib, 2, initialState(g!, 1));
    const play = (by: string) => engine.dispatch({ type: 'play', by, cardId: zoneCards(engine.getState(), `hand-${by}`)[0].id });
    expect(engine.dispatch({ type: 'roll the dice', by: 'p0' }).ok).toBe(true);
    expect(play('p0').ok).toBe(true);
    expect(play('p1').ok).toBe(true);
    expect(engine.getState().turn?.current).toBe('p0');
    expect(engine.dispatch({ type: 'roll the dice', by: 'p0' }).ok).toBe(true);
  });

  it('remembers what each player did apart when everyone acts at once', () => {
    const { game: g, diagnostics } = compileGame(EVERYONE_ROLLS, lib);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const { engine } = createEngine(g!, lib, 2, initialState(g!, 1));
    expect(engine.dispatch({ type: 'roll the dice', by: 'p0' }).ok).toBe(true);
    expect(engine.dispatch({ type: 'roll the dice', by: 'p1' }).ok).toBe(true);
    expect(engine.dispatch({ type: 'roll the dice', by: 'p0' })).toMatchObject({ ok: false, reason: 'they have not rolled this turn' });
    expect(engine.dispatch({ type: 'roll the dice', by: 'p1' })).toMatchObject({ ok: false, reason: 'they have not rolled this turn' });
  });

  it('keeps a card game free of any record of the turn', () => {
    const duel = compileGame(TEST_DUEL, lib).game!;
    const { engine } = createEngine(duel, lib, 2, initialState(duel, 1));
    expect(engine.dispatch({ type: 'draw', by: 'p0', cardId: zoneCards(engine.getState(), 'deck').at(-1)!.id }).ok).toBe(true);
    expect(engine.getState().turn?.current).toBe('p1');
    expect(engine.getState().data).not.toHaveProperty(TURN_KEY);
  });

  it('buys the space a piece is on, after rolling, and charges rent to whoever lands there next', () => {
    const engine = engineWith((s) => queueRoll(queueRoll(s, [1, 2]), [2, 1])); // both go Go → Rose Lane
    engine.dispatch({ type: 'roll the dice', by: 'p0' });
    expect(engine.dispatch({ type: 'buy the space they are on', by: 'p0' }).ok).toBe(true);
    expect(engine.canDispatch({ type: 'buy the space they are on', by: 'p0' })).toBe('no one owns it');
    engine.dispatch({ type: 'end their turn', by: 'p0' });
    engine.dispatch({ type: 'roll the dice', by: 'p1' });
    const s = engine.getState();
    expect(ownerOf(s, 3)).toBe('p0');
    expect([counterOf(s, 'money', 'p0'), counterOf(s, 'money', 'p1')]).toEqual([1500 - 180 + 14, 1500 - 14]);
  });

  it('pays 200 once for passing Go and once for landing on it', () => {
    const passing = engineWith((s) => queueRoll(placePiece(s, 'p0', 3), [1, 1])); // 3 → Go → Mill Lane
    passing.dispatch({ type: 'roll the dice', by: 'p0' });
    expect(counterOf(passing.getState(), 'money', 'p0')).toBe(1700);
    const landing = engineWith((s) => queueRoll(placePiece(s, 'p0', 2), [1, 1])); // 2 → Rose Lane → Go
    landing.dispatch({ type: 'roll the dice', by: 'p0' });
    expect(pieceAt(landing.getState(), 'p0')).toBe(0);
    expect(counterOf(landing.getState(), 'money', 'p0')).toBe(1700);
  });

  it('a player who goes below 0 is out, loses their spaces, and the last player left wins', () => {
    const engine = engineWith((s) => queueRoll(setCounter(setOwner(s, 1, 'p0'), 'money', 'p0', 100), [1, 1]));
    engine.dispatch({ type: 'roll the dice', by: 'p0' }); // Go → Income Tax: 100 - 200 < 0
    const s = engine.getState();
    expect(isOut(s, 'p0')).toBe(true);
    expect(pieceAt(s, 'p0')).toBeNull();
    expect(ownerOf(s, 1)).toBeNull();
    expect(s.result).toEqual({ winner: 'p1' });
  });

  it('a player who goes out while two others are still in hands the turn on, and the game goes on', () => {
    const start = withBoardData(initialState(game, 1), game, ['p0', 'p1', 'p2']);
    const { engine } = createEngine(game, lib, 3, queueRoll(setCounter(start, 'money', 'p0', 100), [1, 1]));
    engine.dispatch({ type: 'roll the dice', by: 'p0' });
    const s = engine.getState();
    expect(isOut(s, 'p0')).toBe(true);
    expect(s.turn).toEqual({ current: 'p1', phase: 'playing' });
    expect(s.result).toBeUndefined();
  });

  it('says a moment rule that keeps moving pieces never settles', () => {
    const looping = TINY_BOARD.replace('  When a player lands on a tax space:\n    They pay its tax.', '  When a player lands on a tax space:\n    Their piece moves forward by the roll.');
    expect(looping).not.toBe(TINY_BOARD);
    const g = compileGame(looping, lib).game!;
    // From Income Tax, a roll of 4 goes once round the 4-space loop and lands on Income Tax again, forever.
    const engine = engineWith((s) => queueRoll(placePiece(s, 'p0', 2), [2, 2]), g);
    let thrown: unknown;
    try { engine.dispatch({ type: 'roll the dice', by: 'p0' }); } catch (e) { thrown = e; }
    expect(friendlyError(thrown)).toMatch(/^Line \d+ \(“When a player lands on a tax space”\): It keeps moving pieces without stopping\.$/);
  });

  it('lets moment rules move a piece as many times in a row as the flow lets its rules fire', () => {
    expect(MAX_MOMENT_DEPTH).toBe(MAX_FLOW_ITERATIONS);
    // Every step space sends the piece on by the roll, so a roll of 1 from Go lands on each step in turn, then on Rest.
    const steps = MAX_FLOW_ITERATIONS - 1;
    const chain = [
      'Game: Chain', 'Players: 2', '', 'Board:', '  The board is a loop of spaces, starting at Go:', '    | space | kind |', '    | Go | go |',
      ...Array.from({ length: steps }, (_, i) => `    | Step ${i + 1} | step |`), '    | Rest | rest |',
      '  Each player has a piece that starts on Go.', '  There is one six-sided die.', '',
      'Phase: playing', '  Players take turns.',
      '  A player may roll the dice.', '    Then:', '      Roll the dice.', '      Their piece moves forward by the roll.',
      '  When a player lands on a step space:', '    Their piece moves forward by the roll.',
    ].join('\n');
    const g = compileGame(chain, lib).game!;
    const engine = engineWith((s) => queueRoll(s, [1]), g);
    expect(engine.dispatch({ type: 'roll the dice', by: 'p0' }).ok).toBe(true);
    expect(pieceAt(engine.getState(), 'p0')).toBe(steps + 1);
  });

  it('runs moment rules again once one has kept moving pieces', () => {
    const g = compileGame(LOOPING, lib).game!;
    const start = queueRoll(placePiece(withBoardData(initialState(g, 1), g, ['p0', 'p1']), 'p0', 2), [2, 2]);
    const { engine, runtime } = createEngine(g, lib, 2, start);
    let thrown: unknown;
    try { engine.dispatch({ type: 'roll the dice', by: 'p0' }); } catch (e) { thrown = e; }
    // Line 37 is the tax rule, whose line moves the piece; not the Go rule (line 33) that the move sets off first.
    expect(friendlyError(thrown)).toBe('Line 37 (“When a player lands on a tax space”): It keeps moving pieces without stopping.');
    // Had the depth stayed raised, the next rule to fire would be refused at once.
    const passed = runtime.announce(engine.getState(), { kind: 'pass', seat: 'p0', space: 0 });
    expect(counterOf(passed, 'money', 'p0')).toBe(1700);
  });

  it('replays rolls and moments exactly', () => {
    const { engine } = createEngine(game, lib, 3, initialState(game, 9));
    for (let turn = 0; turn < 12; turn++) {
      const cur = engine.getState().turn!.current;
      engine.dispatch({ type: 'roll the dice', by: cur });
      if (engine.canDispatch({ type: 'buy the space they are on', by: cur }) === true) engine.dispatch({ type: 'buy the space they are on', by: cur });
      engine.dispatch({ type: 'end their turn', by: cur });
    }
    const fresh = createEngine(game, lib, 3, initialState(game, 9)).engine;
    fresh.loadLog([...engine.getLog()]);
    expect(fresh.getState()).toEqual(engine.getState());
  });
});

describe('a button the After line names', () => {
  it('that goes back to an interrupted turn keeps the turn it went back to', () => {
    const engine = engineWith((s) => queueRoll(s, [1, 2]), compileGame(INTERRUPT_BOARD, lib).game!);
    for (const [type, by] of [['roll the dice', 'p0'], ['call a vote', 'p0'], ['close the vote', 'p1']]) {
      expect(engine.dispatch({ type, by }).reason).toBeUndefined();
    }
    const s = engine.getState();
    expect(s.turn).toEqual({ current: 'p0', phase: 'playing' });
    expect(s.data[TURN_KEY]).toEqual({ p0: ['roll the dice', 'call a vote'] });
  });
});

describe('declaredActionHandler', () => {
  const { runtime, tableDef } = createEngine(game, lib, 2, initialState(game, 1));
  const ctx: MoveContext = { tableDef, rules: new RuleRegistry() };
  const roll = declaredActionHandler('roll the dice', runtime);
  const playing = (s: GameState): GameState => ({ ...withBoardData(s, game, ['p0', 'p1']), turn: { current: 'p0', phase: 'playing' } });

  it('refuses an action the phase does not declare', () => {
    const setup: GameState = { ...playing(initialState(game, 1)), turn: { current: 'p0', phase: '__setup' } };
    expect(roll.legal(setup, { type: 'roll the dice', by: 'p0' }, ctx)).toBe("You can't roll the dice now.");
    expect(declaredActionHandler('jump', runtime).legal(playing(initialState(game, 1)), { type: 'jump', by: 'p0' }, ctx)).toBe("You can't jump now.");
  });

  it('speaks to the player: “end their turn” cannot be done now is “end your turn”', () => {
    const setup: GameState = { ...playing(initialState(game, 1)), turn: { current: 'p0', phase: '__setup' } };
    expect(declaredActionHandler('end their turn', runtime).legal(setup, { type: 'end their turn', by: 'p0' }, ctx)).toBe("You can't end your turn now.");
  });
  it('refuses a player who is out before asking the Only if lines', () => {
    const out = markOut(playing(initialState(game, 1)), 'p0');
    expect(roll.legal(out, { type: 'roll the dice', by: 'p0' }, ctx)).toBe("You're out of the game.");
  });

  it('will not apply an action that is not allowed', () => {
    const out = markOut(playing(initialState(game, 1)), 'p0');
    expect(() => roll.apply(out, { type: 'roll the dice', by: 'p0' }, ctx)).toThrow(Error);
  });
});

/** TINY_BOARD with houses to build, a bank to take them from, and a button that builds one where the player points. */
const BUILDING = TINY_BOARD
  .replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  Spaces can have houses and a hotel.\n  The bank has 32 houses and 12 hotels.')
  .replace('  A player may end their turn.', [
    '  A player may build a house on a street they own.',
    '    Only if it has fewer than 3 houses.',
    '    Then:',
    '      It gets a house from the bank.',
    '  A player may end their turn.',
  ].join('\n'));
const BUILD = 'build a house on a street they own';

describe('a button that picks a target', () => {
  const g = compileGame(BUILDING, lib).game!;
  const MILL = 1;
  const INCOME_TAX = 2;
  const ROSE = 3;
  /** p0 owns Mill Lane and Income Tax; p1 owns Rose Lane. */
  const owned = (s: GameState): GameState => setOwner(setOwner(setOwner(s, MILL, 'p0'), INCOME_TAX, 'p0'), ROSE, 'p1');
  const { runtime, tableDef } = createEngine(g, lib, 2, initialState(g, 1));
  const ctx: MoveContext = { tableDef, rules: new RuleRegistry() };
  const handler = declaredActionHandler(BUILD, runtime);
  const playing = (arrange: (s: GameState) => GameState = owned): GameState => ({
    ...arrange(withBoardData(initialState(g, 1), g, ['p0', 'p1'])), turn: { current: 'p0', phase: 'playing' },
  });
  const action = g.phases[0].actions.find((a) => a.words === BUILD)!;

  it('compiles with no diagnostics', () => expect(compileGame(BUILDING, lib).diagnostics).toEqual([]));

  it('asks where when the move carries no target, or one that is not a space of the board', () => {
    const moves: Move[] = [{ type: BUILD, by: 'p0' }, { type: BUILD, by: 'p0', target: 99 }, { type: BUILD, by: 'p0', target: -1 }];
    for (const move of moves) expect(handler.legal(playing(), move, ctx)).toBe('Pick where to build a house.');
    // The board has four spaces, 0 to 3.
    expect(handler.legal(playing(), { type: BUILD, by: 'p0', target: 4 }, ctx)).toBe('Pick where to build a house.');
    for (const target of [1.5, '1', null, true]) {
      expect(handler.legal(playing(), { type: BUILD, by: 'p0', target }, ctx), String(target)).toBe('Pick where to build a house.');
    }
  });
  it('speaks to the player in what it says: “their” is “your”', () => {
    const theirs = compileGame(BUILDING.replace('build a house on a street they own', 'build their house on a street they own'), lib).game!;
    const engine = engineWith(owned, theirs);
    const move = 'build their house on a street they own';
    expect(engine.dispatch({ type: move, by: 'p0' })).toMatchObject({ ok: false, reason: 'Pick where to build your house.' });
    expect(engine.dispatch({ type: move, by: 'p0', target: ROSE })).toMatchObject({ ok: false, reason: "That isn't a street you own." });
    expect(theirs.phases[0].actions.find((a) => a.words === move)).toMatchObject({ base: 'build their house', label: 'Build your house' });
  });
  it('refuses a space the target phrase does not allow, in the second person', () => {
    expect(handler.legal(playing(), { type: BUILD, by: 'p0', target: ROSE }, ctx)).toBe("That isn't a street you own.");
    expect(handler.legal(playing(), { type: BUILD, by: 'p0', target: INCOME_TAX }, ctx)).toBe("That isn't a street you own.");
    expect(handler.legal(playing(), { type: BUILD, by: 'p0', target: 0 }, ctx)).toBe("That isn't a street you own.");
  });
  it('accepts one of their own streets, and the lines under the button are about it', () => {
    expect(handler.legal(playing(), { type: BUILD, by: 'p0', target: MILL }, ctx)).toBe(true);
    const done = handler.apply(playing(), { type: BUILD, by: 'p0', target: MILL }, ctx);
    expect([spaceFact(done, MILL, 'houses'), spaceFact(done, 0, 'houses')]).toEqual([1, null]);
  });
  it('is about the target, not the space their piece is on: “it” in an Only if line is the target', () => {
    // Their piece is on Go, which has no houses; the street they point at has 3, the most there may be.
    const full = playing((s) => setSpaceFact(owned(s), MILL, 'houses', 3));
    expect(pieceAt(full, 'p0')).toBe(0);
    expect(handler.legal(full, { type: BUILD, by: 'p0', target: MILL }, ctx)).toBe('it has fewer than 3 houses');
  });
  it('refuses in this order: not this phase, out, no target, the wrong target, then the Only if lines', () => {
    const setup: GameState = { ...playing(), turn: { current: 'p0', phase: '__setup' } };
    expect(handler.legal(setup, { type: BUILD, by: 'p0' }, ctx)).toBe("You can't build a house now.");
    expect(handler.legal(markOut(setup, 'p0'), { type: BUILD, by: 'p0' }, ctx)).toBe("You can't build a house now.");
    const out = markOut(playing(), 'p0');
    expect(handler.legal(out, { type: BUILD, by: 'p0' }, ctx)).toBe("You're out of the game.");
    expect(handler.legal(playing(), { type: BUILD, by: 'p0' }, ctx)).toBe('Pick where to build a house.');
    const full = playing((s) => setSpaceFact(owned(s), ROSE, 'houses', 3));
    expect(handler.legal(full, { type: BUILD, by: 'p0', target: ROSE }, ctx)).toBe("That isn't a street you own.");
  });
  it('will not apply a move whose target is refused', () => {
    expect(() => handler.apply(playing(), { type: BUILD, by: 'p0', target: ROSE }, ctx)).toThrow(Error);
  });

  it('notes the button as done this turn, by its whole wording', () => {
    const engine = engineWith(owned, g);
    expect(engine.dispatch({ type: BUILD, by: 'p0', target: MILL }).ok).toBe(true);
    expect(engine.getState().data[TURN_KEY]).toEqual({ p0: [BUILD] });
  });
  it('builds up to the limit and no further, through the engine', () => {
    const engine = engineWith(owned, g);
    for (let built = 1; built <= 3; built++) {
      expect(engine.dispatch({ type: BUILD, by: 'p0', target: MILL }).ok).toBe(true);
      expect(spaceFact(engine.getState(), MILL, 'houses')).toBe(built);
    }
    expect(engine.dispatch({ type: BUILD, by: 'p0', target: MILL })).toMatchObject({ ok: false, reason: 'it has fewer than 3 houses' });
  });
  it('says why through the engine, as for any move', () => {
    const engine = engineWith(owned, g);
    expect(engine.dispatch({ type: BUILD, by: 'p0' })).toMatchObject({ ok: false, reason: 'Pick where to build a house.' });
    expect(engine.dispatch({ type: BUILD, by: 'p0', target: ROSE })).toMatchObject({ ok: false, reason: "That isn't a street you own." });
    expect(engine.dispatch({ type: BUILD, by: 'p1', target: ROSE })).toMatchObject({ ok: false, reason: expect.stringMatching(/turn/) });
  });

  describe('targetCandidates', () => {
    it('lists exactly the streets they own, in board order', () => {
      const both = playing((s) => setOwner(owned(s), ROSE, 'p0'));
      expect(targetCandidates(runtime, action, both, 'p0')).toEqual([MILL, ROSE]);
      expect(targetCandidates(runtime, action, playing(), 'p0')).toEqual([MILL]);
      expect(targetCandidates(runtime, action, playing(), 'p1')).toEqual([ROSE]);
    });
    it('lists nothing for a player who owns no street, and nothing for a button that takes no target', () => {
      expect(targetCandidates(runtime, action, playing((s) => s), 'p0')).toEqual([]);
      const roll = g.phases[0].actions.find((a) => a.words === 'roll the dice')!;
      expect(targetCandidates(runtime, roll, playing(), 'p0')).toEqual([]);
    });
    it('lists exactly the spaces the move gets past its target check with', () => {
      const state = playing();
      const pastTarget = [0, 1, 2, 3].filter((target) => handler.legal(state, { type: BUILD, by: 'p0', target }, ctx) !== "That isn't a street you own.");
      expect(targetCandidates(runtime, action, state, 'p0')).toEqual(pastTarget);
    });
    it('still lists a space the Only if lines then refuse: the move itself says whether it can be picked', () => {
      // Mill Lane is a street they own, so the target phrase allows it, but it already has the most houses there may be.
      const full = playing((s) => setSpaceFact(owned(s), MILL, 'houses', 3));
      expect(targetCandidates(runtime, action, full, 'p0')).toEqual([MILL]);
      expect(handler.legal(full, { type: BUILD, by: 'p0', target: MILL }, ctx)).toBe('it has fewer than 3 houses');
      expect(createEngine(g, lib, 2, full).engine.canDispatch({ type: BUILD, by: 'p0', target: MILL })).toBe('it has fewer than 3 houses');
    });
  });

  describe('as an example', () => {
    const example = (...lines: string[]) => {
      const { game: withExample, diagnostics } = compileGame(`${BUILDING}\n\nExample: building\n${lines.map((l) => `  ${l}`).join('\n')}`, lib);
      expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      return runExamples(withExample!, lib)[0];
    };
    it('names the space after the button, and runs through runExamples', () => {
      expect(example('Given p0 owns Rose Lane', 'When p0 builds a house on Rose Lane', 'Then Rose Lane has 1 house', 'And the bank has 31 houses'))
        .toMatchObject({ status: 'pass', message: null });
    });
    it('can be refused, with the sentence for the designer', () => {
      expect(example('Given p1 owns Rose Lane', 'When p0 builds a house on Rose Lane', "Then it is rejected because \"That isn't a street you own.\""))
        .toMatchObject({ status: 'pass' });
      expect(example('Given p0 owns Mill Lane', 'When p0 builds a house on Rose Lane', 'Then it is accepted'))
        .toMatchObject({ status: 'fail', message: "Expected the move to be accepted, but it was rejected: That isn't a street you own." });
    });
    it('does not read a button that takes a target as a plain one, or the other way round', () => {
      const bare = compileGame(`${BUILDING}\n\nExample: no target\n  When p0 builds a house`, lib);
      expect(bare.diagnostics.map((d) => d.message)).toEqual(['“p0 builds a house” isn\'t in the phrase library yet.']);
      const wrong = compileGame(`${BUILDING}\n\nExample: wrong\n  When p0 ends their turn on Rose Lane`, lib);
      expect(wrong.diagnostics.map((d) => d.message)).toEqual(['“p0 ends their turn on Rose Lane” isn\'t in the phrase library yet.']);
    });
  });
});

describe('buttons that pick a space without “on”', () => {
  const mark = compileGame(MARK_BOARD, lib).game!;
  const MARK = 'mark a space they own';
  const MILL = 1;
  const ROSE = 3;
  /** p0 owns Mill Lane and p1 owns Rose Lane, with the turn at p0 in the playing phase. */
  const owned = (s: GameState): GameState => setOwner(setOwner(s, MILL, 'p0'), ROSE, 'p1');

  it('is accepted on a space they own, and the lines under the button are about it', () => {
    const engine = engineWith(owned, mark);
    expect(engine.dispatch({ type: MARK, by: 'p0', target: MILL }).ok).toBe(true);
    expect(spaceFact(engine.getState(), MILL, 'marked')).toBe(true);
    expect(spaceFact(engine.getState(), ROSE, 'marked')).toBeNull();
  });
  it('refuses a space the target phrase does not allow, in the second person', () => {
    expect(engineWith(owned, mark).canDispatch({ type: MARK, by: 'p0', target: ROSE })).toBe("That isn't a space you own.");
  });
  it('asks where when the move carries no target', () => {
    expect(engineWith(owned, mark).canDispatch({ type: MARK, by: 'p0' })).toBe('Pick where to mark.');
  });
  it('refuses a space its Only if line refuses, once it is marked', () => {
    const engine = engineWith(owned, mark);
    expect(engine.dispatch({ type: MARK, by: 'p0', target: MILL }).ok).toBe(true);
    expect(engine.canDispatch({ type: MARK, by: 'p0', target: MILL })).toBe('it is not marked');
  });

  describe('as an example', () => {
    const EXAMPLE = [
      'Example: marking a space',
      '  Given p0 owns Mill Lane',
      '  And p1 owns Rose Lane',
      '  When p0 marks Rose Lane',
      '  Then it is rejected because "That isn\'t a space you own."',
      '  When p0 marks Mill Lane',
      '  Then it is accepted',
      '  And Mill Lane is marked',
      '  When p0 marks Mill Lane',
      '  Then it is rejected because "it is not marked"',
    ].join('\n');
    it('names the space after the button and runs through runExamples, beside the form with “on”', () => {
      const { game: withExample, diagnostics } = compileGame(`${MARK_BOARD}\n\n${EXAMPLE}`, lib);
      expect(diagnostics).toEqual([]);
      const results = runExamples(withExample!, lib);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ status: 'pass', message: null });
      const withOn = compileGame(`${MARK_BOARD}\n\n${EXAMPLE.replace(/marks (\w+ Lane)/g, 'marks on $1')}`, lib);
      expect(withOn.diagnostics).toEqual([]);
      expect(runExamples(withOn.game!, lib)[0]).toMatchObject({ status: 'pass' });
    });
  });
});

describe('buttons any player may press', () => {
  const anyone = compileGame(ANY_PLAYER_BOARD, lib).game!;
  const PLANT = 'plant a flag on a street they own';
  const MILL = 1;
  const ROSE = 3;

  it('compiles with no diagnostics, and the flow lets any seat send them', () => {
    expect(compileGame(ANY_PLAYER_BOARD, lib).diagnostics).toEqual([]);
    expect(anyone.phases[0].actions.map((a) => [a.words, a.anyone]))
      .toEqual([['roll the dice', false], ['end their turn', false], ['wave', true], ['plant a flag on a street they own', true]]);
    expect(flowDefFor(anyone, ['p0', 'p1']).phases[1].anyActor).toEqual(['wave', 'plant a flag on a street they own']);
    expect(flowDefFor(game, ['p0', 'p1']).phases[1]).not.toHaveProperty('anyActor');
  });
  it('Review Focus: a press out of turn leaves the turn and every turn log as they were', () => {
    const engine = engineWith((s) => queueRoll(s, [1, 2]), anyone);
    expect(engine.dispatch({ type: 'roll the dice', by: 'p0' }).ok).toBe(true);
    expect(engine.dispatch({ type: 'wave', by: 'p1' }).ok).toBe(true);
    expect(engine.dispatch({ type: 'wave', by: 'p0' }).ok).toBe(true);
    const s = engine.getState();
    expect([counterOf(s, 'money', 'p0'), counterOf(s, 'money', 'p1'), s.turn!.current]).toEqual([1505, 1505, 'p0']);
    expect(s.data[TURN_KEY]).toEqual({ p0: ['roll the dice'] });
    expect(engine.canDispatch({ type: 'end their turn', by: 'p0' })).toBe(true);
  });

  describe('who may press', () => {
    it('refuses a seat that is out, though it is no one’s turn to be asked', () => {
      // Three players: with two, one going out would end the game at once.
      const three = createEngine(anyone, lib, 3, markOut(withBoardData(initialState(anyone, 1), anyone, seatsFor(3)), 'p1')).engine;
      expect(three.canDispatch({ type: 'wave', by: 'p1' })).toBe("You're out of the game.");
      expect(three.canDispatch({ type: 'wave', by: 'p2' })).toBe(true);
    });
    it('refuses a seat the game does not have, as if the button were not there', () => {
      const engine = engineWith((s) => s, anyone);
      expect(engine.canDispatch({ type: 'wave', by: 'p7' })).toBe("You can't wave now.");
      expect(engine.canDispatch({ type: 'wave' })).toBe("You can't wave now.");
    });
    it('still keeps the buttons of a turn to the player whose turn it is', () => {
      const engine = engineWith((s) => queueRoll(s, [1, 2]), anyone);
      // The same engine lets p1 wave: TINY_BOARD, which `engineWith` falls back to, has no such button, so this is the anyone game.
      expect(engine.canDispatch({ type: 'wave', by: 'p1' })).toBe(true);
      expect(engine.canDispatch({ type: 'roll the dice', by: 'p1' })).toBe("not p1's turn");
      expect(engine.canDispatch({ type: 'end their turn', by: 'p1' })).toBe("not p1's turn");
    });
  });

  describe('its Only if lines and its pick still decide', () => {
    const owning = (s: GameState) => setOwner(s, MILL, 'p1');
    it('accepts a street the presser owns, whoever’s turn it is, and charges them', () => {
      const engine = engineWith(owning, anyone);
      expect(engine.dispatch({ type: PLANT, by: 'p1', target: MILL }).ok).toBe(true);
      expect(counterOf(engine.getState(), 'money', 'p1')).toBe(1490);
      expect(engine.getState().turn!.current).toBe('p0');
    });
    it('refuses a street they do not own', () => {
      const engine = engineWith(owning, anyone);
      expect(engine.dispatch({ type: PLANT, by: 'p1', target: ROSE })).toMatchObject({ ok: false, reason: "That isn't a street you own." });
    });
    it('refuses while the Only if line fails', () => {
      const engine = engineWith((s) => setCounter(owning(s), 'money', 'p1', 5), anyone);
      expect(engine.dispatch({ type: PLANT, by: 'p1', target: MILL })).toMatchObject({ ok: false, reason: 'they have at least 10 money' });
    });
    it('lets a player below 0 press, since nothing in this game puts them out', () => {
      const engine = engineWith((s) => setCounter(s, 'money', 'p1', -20), anyone);
      expect(engine.dispatch({ type: 'wave', by: 'p1' }).ok).toBe(true);
      expect(counterOf(engine.getState(), 'money', 'p1')).toBe(-15);
    });
  });

  describe('as an example', () => {
    const EXAMPLE = [
      "Example: anyone may press it on someone else's turn",
      '  Given p1 owns Mill Lane',
      '  When p1 waves',
      '  And p1 plants a flag on Mill Lane',
      '  Then it is accepted',
      '  And p1 has 1495 money',
      "  And it is p0's turn",
    ].join('\n');
    it('runs on the engine and passes', () => {
      const { game: withExample, diagnostics } = compileGame(`${ANY_PLAYER_BOARD}\n\n${EXAMPLE}`, lib);
      expect(diagnostics).toEqual([]);
      const results = runExamples(withExample!, lib);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ status: 'pass', message: null });
    });
  });
});

describe('buttons that carry an amount', () => {
  const pot = compileGame(AMOUNT_BOARD, lib).game!;
  const RAISE = 'raise an amount';
  /** A new game on which p0 has rolled, so that only the amount lines are left to judge. */
  const rolled = () => {
    const engine = engineWith((s) => queueRoll(s, [1, 2]), pot);
    expect(engine.dispatch({ type: 'roll the dice', by: 'p0' }).ok).toBe(true);
    return engine;
  };

  it('compiles, keeps “an amount” out of the label, and reads the amount from the move', () => {
    expect(compileGame(AMOUNT_BOARD, lib).diagnostics).toEqual([]);
    expect(pot.phases[0].actions.map((a) => [a.words, a.base, a.label, a.amount])).toEqual([
      ['roll the dice', 'roll the dice', 'Roll the dice', false], [RAISE, 'raise', 'Raise', true], ['end their turn', 'end their turn', 'End your turn', false],
    ]);
    const engine = rolled();
    expect(engine.dispatch({ type: RAISE, by: 'p0', amount: 50 }).ok).toBe(true);
    expect(gameNumber(engine.getState(), pot, 'pot')).toBe(50);
  });
  it('refuses in order: the turn, a missing amount, then every Only if line', () => {
    const fresh = engineWith((s) => s, pot);
    expect(fresh.canDispatch({ type: RAISE, by: 'p1', amount: 50 })).toBe("not p1's turn");
    expect(fresh.canDispatch({ type: RAISE, by: 'p0' })).toBe('Say how much to raise.');
    expect(fresh.canDispatch({ type: RAISE, by: 'p0', amount: 50 })).toBe('they have rolled this turn');
    const engine = rolled();
    expect(engine.canDispatch({ type: RAISE, by: 'p0', amount: 0 })).toBe('the amount is more than the pot');
    expect(engine.canDispatch({ type: RAISE, by: 'p0', amount: 1501 })).toBe('they have at least the amount in money');
  });
  it('Review Focus: an amount that is not a whole number of 0 or more is refused before any Only if line reads it', () => {
    const engine = rolled();
    // 2**53 is past the whole numbers that can be told apart exactly, so “more than the pot” could not be trusted on it.
    for (const amount of [1.5, -5, '50', null, true, 2 ** 53, NaN, Infinity]) {
      expect(engine.canDispatch({ type: RAISE, by: 'p0', amount }), String(amount)).toBe('Say how much to raise.');
    }
  });

  describe('amountReady', () => {
    const game = () => createEngine(pot, lib, 2, queueRoll(withBoardData(initialState(pot, 1), pot, ['p0', 'p1']), [1, 2]));
    const raise = pot.phases[0].actions[1];
    it('says what to ask the player who has not said how much', () => expect(amountPrompt(raise)).toBe('Say how much to raise.'));
    it('tells the Only if lines that read the amount from the ones that do not', () => {
      expect(raise.conditions.map((group) => game().runtime.readsAmount(group))).toEqual([false, true, true]);
    });
    it('asks only the lines that do not read the amount, about the seat alone', () => {
      const { engine, runtime } = game();
      expect(amountReady(runtime, raise, engine.getState(), 'p0')).toBe('they have rolled this turn');
      engine.dispatch({ type: 'roll the dice', by: 'p0' });
      expect(amountReady(runtime, raise, engine.getState(), 'p0')).toBe(true);
      // The line about what they have reads the amount, so having nothing does not matter yet.
      expect(amountReady(runtime, raise, setCounter(engine.getState(), 'money', 'p0', 0), 'p0')).toBe(true);
    });
    it('gives a seat that is out nothing to press', () => {
      const { engine, runtime } = game();
      expect(amountReady(runtime, raise, markOut(engine.getState(), 'p0'), 'p0')).toBe("You're out of the game.");
    });
  });

  describe('as an example', () => {
    const EXAMPLE = [
      'Example: raising the pot',
      '  Given the next roll is 1 and 2',
      '  When p0 rolls the dice',
      '  And p0 raises 0',
      '  Then it is rejected because "the amount is more than the pot"',
      '  When p0 raises an amount',
      '  Then it is rejected because "Say how much to raise."',
      '  When p0 raises 50',
      '  Then it is accepted',
      '  And the pot is 50',
      '  When p0 ends their turn',
      '  Then p0 has 1450 money',
      '  And the pot is 0',
    ].join('\n');
    it('runs on the engine and passes', () => {
      const { game: withExample, diagnostics } = compileGame(`${AMOUNT_BOARD}\n\n${EXAMPLE}`, lib);
      expect(diagnostics).toEqual([]);
      const results = runExamples(withExample!, lib);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ status: 'pass', message: null });
    });
  });
});

describe('buttons that pick another player', () => {
  const pick = compileGame(PICK_BOARD, lib).game!;
  const CHALLENGE = 'challenge another player';
  /** A new game of `players` seats whose turn is at p0 in playing, after `arrange`. */
  const table = (players: number, arrange: (s: GameState) => GameState) =>
    createEngine(pick, lib, players, arrange(withBoardData(initialState(pick, 1), pick, seatsFor(players)))).engine;

  it('compiles, keeps “another player” out of the base, and reads the pick from the move', () => {
    expect(compileGame(PICK_BOARD, lib).diagnostics).toEqual([]);
    expect(pick.phases[0].actions[1]).toMatchObject({
      words: CHALLENGE, base: 'challenge', label: 'Challenge another player', picksPlayer: true, target: null, amount: false,
    });
    const engine = table(2, (s) => queueRoll(s, [1, 2]));
    engine.dispatch({ type: 'roll the dice', by: 'p0' });
    expect(engine.dispatch({ type: CHALLENGE, by: 'p0', player: 'p1' }).ok).toBe(true);
    expect(playerFact(engine.getState(), 'p1', 'the rival')).toBe(true);
  });
  it('refuses in order: the turn, the pick, then every Only if line', () => {
    const engine = table(2, (s) => s);
    expect(engine.canDispatch({ type: CHALLENGE, by: 'p1', player: 'p0' })).toBe("not p1's turn");
    expect(engine.canDispatch({ type: CHALLENGE, by: 'p0' })).toBe('Pick another player to challenge.');
    expect(engine.canDispatch({ type: CHALLENGE, by: 'p0', player: 'p1' })).toBe('they have rolled this turn');
  });
  it('Review Focus: a pick that names no other player still in is refused before any Only if line is asked', () => {
    const engine = table(3, (s) => markOut(s, 'p2'));
    for (const player of [null, 7, 'p9', 'P1', 'p0', 'p2']) {
      expect(engine.canDispatch({ type: CHALLENGE, by: 'p0', player }), String(player)).toBe('Pick another player to challenge.');
    }
    expect(engine.canDispatch({ type: CHALLENGE, by: 'p0' })).toBe('Pick another player to challenge.');
  });
  it('names the button by its whole wording, since its base alone reads wrong, when it is not there to press', () => {
    const { runtime, tableDef } = createEngine(pick, lib, 2, initialState(pick, 1));
    const ctx: MoveContext = { tableDef, rules: new RuleRegistry() };
    const setup: GameState = { ...withBoardData(initialState(pick, 1), pick, ['p0', 'p1']), turn: { current: 'p0', phase: '__setup' } };
    expect(declaredActionHandler(CHALLENGE, runtime).legal(setup, { type: CHALLENGE, by: 'p0', player: 'p1' }, ctx)).toBe("You can't challenge another player now.");
  });
  it('refuses a player who is out before it asks for the pick', () => {
    const engine = table(3, (s) => markOut(s, 'p0'));
    expect(engine.canDispatch({ type: CHALLENGE, by: 'p0' })).toBe("You're out of the game.");
  });

  describe('playerCandidates', () => {
    const seats = (players: number, arrange: (s: GameState) => GameState = (s) => s) => {
      const { engine, runtime } = createEngine(pick, lib, players, arrange(withBoardData(initialState(pick, 1), pick, seatsFor(players))));
      return { runtime, state: engine.getState() };
    };
    it('lists every seat still in but the one asking, in seat order', () => {
      const { runtime, state } = seats(3);
      expect([playerCandidates(runtime, state, 'p0'), playerCandidates(runtime, state, 'p1')]).toEqual([['p1', 'p2'], ['p0', 'p2']]);
    });
    it('leaves out a seat that is out', () => {
      const { runtime, state } = seats(3, (s) => markOut(s, 'p1'));
      expect(playerCandidates(runtime, state, 'p0')).toEqual(['p2']);
    });
    it('says what to ask the player who has not picked', () => expect(pickPlayerPrompt(pick.phases[0].actions[1])).toBe('Pick another player to challenge.'));
  });

  describe('as an example', () => {
    const EXAMPLE = [
      'Example: challenging',
      '  Given the next roll is 1 and 2',
      '  When p0 rolls the dice',
      '  And p0 challenges p0',
      '  Then it is rejected because "Pick another player to challenge."',
      '  When p0 challenges another player',
      '  Then it is rejected because "Pick another player to challenge."',
      '  When p0 challenges p1',
      '  Then it is accepted',
      '  And p1 is the rival',
    ].join('\n');
    it('runs on the engine and passes', () => {
      const { game: withExample, diagnostics } = compileGame(`${PICK_BOARD}\n\n${EXAMPLE}`, lib);
      expect(diagnostics).toEqual([]);
      const results = runExamples(withExample!, lib);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ status: 'pass', message: null });
    });
  });
});
