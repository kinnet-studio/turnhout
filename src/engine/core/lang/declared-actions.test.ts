import { describe, expect, it } from 'vitest';
import { MAX_FLOW_ITERATIONS } from '../flow';
import { zoneCards, type GameState } from '../game-state';
import type { Move, MoveContext } from '../moves';
import { RuleRegistry } from '../rules';
import {
  TURN_KEY, counterOf, isOut, markOut, ownerOf, pieceAt, placePiece, queueRoll, setCounter, setOwner, setSpaceFact, spaceFact, withBoardData,
} from './board-state';
import { createEngine, initialState } from './build';
import { compileGame } from './compile';
import { declaredActionHandler, targetCandidates } from './declared-actions';
import { friendlyError } from './friendly';
import { runExamples } from './examples';
import { createDefaultLibrary } from './library';
import { MAX_MOMENT_DEPTH } from './runtime';
import { TEST_DUEL, TINY_BOARD, TINY_BOARD_HEAD } from './testing';

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
