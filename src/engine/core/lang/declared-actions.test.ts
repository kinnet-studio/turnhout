import { describe, expect, it } from 'vitest';
import { MAX_FLOW_ITERATIONS } from '../flow';
import { zoneCards, type GameState } from '../game-state';
import type { Move, MoveContext } from '../moves';
import { RuleRegistry } from '../rules';
import type { Json } from '../table-def';
import {
  TURN_KEY, counterOf, gameNumber, isOut, markOut, ownerOf, pieceAt, placePiece, playerFact, queueRoll, setCounter, setOwner, setSpaceFact, spaceFact,
  withBoardData,
} from './board-state';
import { createEngine, flowDefFor, initialState, seatsFor } from './build';
import { compileGame } from './compile';
import {
  amountPrompt, amountReady, cardCandidates, cardPrompt, costRefusal, declaredActionHandler, faceDownReady, hasCost, noCardIn, ontoCandidates, ontoPrompt,
  payCost, pickPlayerPrompt, playerCandidates, targetCandidates,
} from './declared-actions';
import { friendlyError } from './friendly';
import { runExamples } from './examples';
import { createDefaultLibrary } from './library';
import { MAX_MOMENT_DEPTH } from './runtime';
import type { DeclaredAction } from './types';
import {
  AMOUNT_BOARD, ANY_PLAYER_BOARD, CARD_PICK_GAME, INTERRUPT_BOARD, MARK_BOARD, PICK_BOARD, TEST_DUEL, TINY_BOARD, TINY_BOARD_HEAD, TURN_GAME,
} from './testing';
import { relocate, topCard } from './zones';
import { cardsOn, putOn } from './attach';
import { changeCard } from './card-facts';
import { COACH_GAME } from './testing';
import { cardById } from './zone-index';

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

describe('buttons that cost part of the turn budget', () => {
  const WORK = '  A player may work.\n    Only if they have at least 1 move.\n    Then:\n      They spend 1 move.\n';
  const COSTED = TURN_GAME.replace(WORK, '  A player may work.\n    It costs 1 move.\n    Then:\n');
  const COST2 = COSTED.replace('    It costs 1 move.', '    It costs 2 moves.\n    Only if they have at least 5 coins.');
  /** A started turn: p0 to act in working, everyone at their 2 moves. */
  const base = (text: string): GameState => {
    const g = compileGame(text, lib).game!;
    return createEngine(g, lib, 2, { ...initialState(g, 1), turn: { current: 'p0', phase: 'working' } }).engine.getState();
  };
  /** A new engine on the started turn of `text`, arranged by `arrange`. */
  const engineAt = (text: string, arrange: (s: GameState) => GameState = (s) => s) => {
    const g = compileGame(text, lib).game!;
    return createEngine(g, lib, 2, arrange(base(text))).engine;
  };
  const WORKS = { type: 'work', by: 'p0' };

  it('compiles the fixtures with no diagnostics', () => {
    expect(TURN_GAME).toContain(WORK);
    for (const text of [COSTED, COST2]) expect(compileGame(text, lib).diagnostics).toEqual([]);
  });
  it('starts the turn with p0 at 2 moves', () => expect(counterOf(base(COSTED), 'moves', 'p0')).toBe(2));
  it('spends the cost when the press is accepted', () => {
    const engine = engineAt(COSTED);
    expect(engine.dispatch(WORKS).ok).toBe(true);
    expect([counterOf(engine.getState(), 'moves', 'p0'), counterOf(engine.getState(), 'coins', 'p0')]).toEqual([1, 1]);
  });
  it('spends the cost before the Then lines, so they see what is left', () => {
    const text = COSTED.replace('      They get 1 coin.\n', '      They get 1 coin.\n      If they have at least 2 moves, they get 10 coins.\n');
    expect(text).not.toBe(COSTED);
    expect(compileGame(text, lib).diagnostics).toEqual([]);
    const engine = engineAt(text);
    expect(engine.dispatch(WORKS).ok).toBe(true);
    expect(counterOf(engine.getState(), 'coins', 'p0')).toBe(1);
  });
  it('refuses in order (R5): the turn, then the cost, then each Only if', () => {
    const turnOf = (moves: number, coins: number) => engineAt(COST2, (s) => setCounter(setCounter(s, 'moves', 'p0', moves), 'coins', 'p0', coins));
    expect(turnOf(2, 0).canDispatch({ type: 'work', by: 'p1' })).toBe("not p1's turn");
    // The cost comes before the Only if, though both would refuse.
    expect(turnOf(1, 0).canDispatch(WORKS)).toBe('they have at least 2 moves');
    expect(turnOf(2, 0).canDispatch(WORKS)).toBe('they have at least 5 coins');
    expect(turnOf(2, 5).canDispatch(WORKS)).toBe(true);
  });
  it('Review Focus: spends nothing on a refusal, and undo gives back what an accepted press spent', () => {
    const engine = engineAt(COST2, (s) => setCounter(s, 'moves', 'p0', 1));
    expect(engine.dispatch(WORKS)).toMatchObject({ ok: false, reason: 'they have at least 2 moves' });
    expect(counterOf(engine.getState(), 'moves', 'p0')).toBe(1);

    const paid = engineAt(COSTED);
    expect(paid.dispatch(WORKS).ok).toBe(true);
    expect([counterOf(paid.getState(), 'moves', 'p0'), counterOf(paid.getState(), 'coins', 'p0')]).toEqual([1, 1]);
    paid.undo();
    expect([counterOf(paid.getState(), 'moves', 'p0'), counterOf(paid.getState(), 'coins', 'p0')]).toEqual([2, 0]);
  });
  it('can cost nothing, and is still a button with a cost', () => {
    const free = COSTED.replace('It costs 1 move.', 'It costs 0 moves.');
    expect(hasCost(compileGame(free, lib).game!.phases[0].actions[0])).toBe(true);
    const engine = engineAt(free);
    expect(engine.dispatch(WORKS).ok).toBe(true);
    expect([counterOf(engine.getState(), 'moves', 'p0'), counterOf(engine.getState(), 'coins', 'p0')]).toEqual([2, 1]);
  });

  describe('costRefusal and payCost', () => {
    const [work, stop]: DeclaredAction[] = compileGame(COST2, lib).game!.phases[0].actions;
    const state = base(COST2);
    it('refuse and spend nothing without a cost', () => {
      expect(hasCost(stop)).toBe(false);
      expect(costRefusal(stop, setCounter(state, 'moves', 'p0', 0), 'p0')).toBeNull();
      expect(payCost(stop, state, 'p0')).toBe(state);
    });
    it('refuse a seat that has less than the cost, in the words of the budget', () => {
      expect(hasCost(work)).toBe(true);
      expect(costRefusal(work, state, 'p0')).toBeNull();
      expect(costRefusal(work, setCounter(state, 'moves', 'p0', 1), 'p0')).toBe('they have at least 2 moves');
      expect(costRefusal(work, setCounter(state, 'moves', 'p0', 1), 'p1')).toBeNull();
    });
    it('spend the cost from the seat that pays it', () => {
      const paid = payCost(work, state, 'p1');
      expect([counterOf(paid, 'moves', 'p1'), counterOf(paid, 'moves', 'p0')]).toEqual([0, 2]);
    });
  });

  describe('on a button that carries an amount', () => {
    const POT = AMOUNT_BOARD.replace('  The game has a pot of 0.', '  The game has a pot of 0.\n  Each player has 2 moves each turn.')
      .replace('  A player may raise an amount.', '  A player may raise an amount.\n    It costs 1 move.');
    const g = compileGame(POT, lib).game!;
    const { engine, runtime } = createEngine(g, lib, 2, initialState(g, 1));
    const state = engine.getState();
    const raise = g.phases[0].actions.find((a) => a.words === 'raise an amount')!;
    it('compiles', () => expect(compileGame(POT, lib).diagnostics).toEqual([]));
    it('asks for the cost before the lines that do not read the amount', () => {
      expect(amountReady(runtime, raise, setCounter(state, 'moves', 'p0', 0), 'p0')).toBe('they have at least 1 move');
      // With the budget left, the line about having rolled speaks.
      expect(amountReady(runtime, raise, state, 'p0')).toBe('they have rolled this turn');
    });
  });

  describe('as an example', () => {
    const EXAMPLE = [
      "Example: a press that can't pay costs nothing",
      '  Given p0 has 1 move',
      '  When p0 works',
      '  Then it is rejected because "they have at least 2 moves"',
      '  And p0 has 1 move',
    ].join('\n');
    it('runs on the engine and passes', () => {
      const { game: withExample, diagnostics } = compileGame(`${COSTED.replace('It costs 1 move.', 'It costs 2 moves.')}\n\n${EXAMPLE}\n`, lib);
      expect(diagnostics).toEqual([]);
      const results = runExamples(withExample!, lib);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ status: 'pass', message: null });
    });
  });
});

describe('buttons that pick a card', () => {
  const BUY = 'buy a card from the shop to their stash';
  const SELL = 'sell a card in their stash';
  const SELL_LINE = '  A player may sell a card in their stash.';
  const g = compileGame(CARD_PICK_GAME, lib).game!;
  /** A two-player game of CARD_PICK_GAME once Setup is done: p0 to act, with 7 coins and 2 moves. */
  const started = createEngine(g, lib, 2, initialState(g, 1)).engine.getState();
  const named = (name: string) => started.cards.filter((c) => c.data?.name === name).map((c) => c.id);
  const [r1, r2] = named('Ruby');
  const [o1, o2] = named('Opal');
  /** The shop holds r1 and o1 and nothing else, and p0's stash r2 and o2. */
  const arranged = (s: GameState, game = g): GameState => {
    const emptied = relocate(s, zoneCards(s, 'shop').map((c) => c.id), 'pile', game);
    return relocate(relocate(emptied, [r1, o1], 'shop', game), [r2, o2], 'stash-p0', game);
  };
  /** An engine on the arranged table, after `arrange`; `text` is the game, CARD_PICK_GAME unless said. */
  const picks = (arrange: (s: GameState) => GameState = (s) => s, text = CARD_PICK_GAME) => {
    const game = compileGame(text, lib).game!;
    return createEngine(game, lib, 2, arrange(arranged(started, game)));
  };
  /** `text` with `line` put in after `after`, which it must hold. */
  const adding = (text: string, after: string, line: string) => {
    const added = text.replace(`${after}\n`, `${after}\n${line}\n`);
    expect(added).not.toBe(text);
    return added;
  };
  const coinsAndMoves = (s: GameState, seat = 'p0') => [counterOf(s, 'coins', seat), counterOf(s, 'moves', seat)];
  const actionNamed = (words: string, game = g) => game.phases[0].actions.find((a) => a.words === words)!;

  it('starts p0 on 7 coins and 2 moves, with the table arranged', () => {
    const s = picks().engine.getState();
    expect(coinsAndMoves(s)).toEqual([7, 2]);
    expect([zoneCards(s, 'shop').map((c) => c.id), zoneCards(s, 'stash-p0').map((c) => c.id)]).toEqual([[r1, o1], [r2, o2]]);
  });

  it('buys: the card goes to the stash, the move and the card\'s cost are spent, and nobody is marked as having moved it', () => {
    const { engine } = picks();
    expect(engine.dispatch({ type: BUY, by: 'p0', cardId: r1 })).toMatchObject({ ok: true });
    const s = engine.getState();
    expect(s.cards.find((c) => c.id === r1)!.zoneId).toBe('stash-p0');
    expect(coinsAndMoves(s)).toEqual([4, 1]);
    expect(s.cards.find((c) => c.id === r1)!.data).not.toHaveProperty('movedBy');
  });

  it('sells for free: “it” is the card picked, moved to the pile', () => {
    const { engine } = picks();
    expect(engine.dispatch({ type: SELL, by: 'p0', cardId: o2 })).toMatchObject({ ok: true });
    const s = engine.getState();
    expect(topCard(s, 'pile')?.id).toBe(o2);
    expect(coinsAndMoves(s)).toEqual([8, 2]);
  });

  it('reads “the card” as the card picked', () => {
    const { engine } = picks(undefined, adding(CARD_PICK_GAME, SELL_LINE, '    Only if the card is not a Ruby.'));
    expect(engine.dispatch({ type: SELL, by: 'p0', cardId: r2 })).toMatchObject({ ok: false, reason: 'the card is not a Ruby' });
    expect(engine.dispatch({ type: SELL, by: 'p0', cardId: o2 })).toMatchObject({ ok: true });
  });

  it('Review Focus: refuses a press without a card it can take with its prompt, before the cost, and changes nothing', () => {
    const prompt = 'Pick a card from the shop to buy.';
    expect(cardPrompt(actionNamed(BUY))).toBe(prompt);
    // A buy that costs 2 moves, with 1 move and no coins left: the cost and the Only if would refuse it too, so the pick is asked first.
    const COSTLY = CARD_PICK_GAME.replace('    It costs 1 move.', '    It costs 2 moves.');
    expect(COSTLY).not.toBe(CARD_PICK_GAME);
    const short = (s: GameState) => setCounter(setCounter(s, 'moves', 'p0', 1), 'coins', 'p0', 0);
    const presses: { [k: string]: Json }[] = [{}, { cardId: r2 }, { cardId: 'c999' }, { cardId: 7 }];
    for (const press of presses) {
      const { engine } = picks(short, COSTLY);
      const before = engine.getState();
      expect(engine.dispatch({ type: BUY, by: 'p0', ...press }), JSON.stringify(press)).toMatchObject({ ok: false, reason: prompt });
      expect(engine.getState()).toEqual(before);
    }
    const refusals: [string, (s: GameState) => GameState, Move, string?][] = [
      ["not p1's turn", (s) => s, { type: BUY, by: 'p1', cardId: r1 }],
      ["they have at least the card's cost in coins", (s) => setCounter(s, 'coins', 'p0', 2), { type: BUY, by: 'p0', cardId: r1 }],
      ['they have at least 2 moves', short, { type: BUY, by: 'p0', cardId: r1 }, COSTLY],
    ];
    for (const [reason, arrange, move, text] of refusals) {
      const { engine } = picks(arrange, text);
      const before = engine.getState();
      expect(engine.dispatch(move)).toMatchObject({ ok: false, reason });
      expect(engine.getState()).toEqual(before);
    }
  });

  it('says how to pick a card in a zone, and that there is none', () => {
    expect(cardPrompt(actionNamed(SELL))).toBe('Pick a card in your stash to sell.');
    expect(noCardIn('their stash')).toBe('There is no card in your stash.');
    expect(noCardIn('the shop')).toBe('There is no card in the shop.');
  });

  it('offers and takes only the top card of a pile', () => {
    const text = adding(CARD_PICK_GAME, '      They get 1 coin.', '  A player may take a card in the pile.');
    const { engine, runtime } = picks(undefined, text);
    const take = actionNamed('take a card in the pile', runtime.game);
    const pile = zoneCards(engine.getState(), 'pile').map((c) => c.id);
    expect(pile.length).toBeGreaterThan(1);
    const [under, top] = pile.slice(-2);
    expect(cardCandidates(runtime, take, engine.getState(), 'p0')).toEqual([top]);
    expect(engine.canDispatch({ type: 'take a card in the pile', by: 'p0', cardId: under })).toBe('You can only take the top card of the pile.');
    expect(engine.canDispatch({ type: 'take a card in the pile', by: 'p0', cardId: top })).toBe(true);
  });

  it('refuses a card it would put in a zone of a seat that is not at the table, whichever card it is', () => {
    const text = adding(CARD_PICK_GAME, '      They get 1 coin.', "  A player may gift a card from their stash to p2's case.\n    It costs 1 move.");
    expect(compileGame(text, lib).diagnostics).toEqual([]);
    const { engine } = picks(undefined, text);
    for (const cardId of [r2, o2]) expect(engine.canDispatch({ type: "gift a card from their stash to p2's case", by: 'p0', cardId })).toBe("You can't gift a card there.");
  });

  it('judges a card the player can not see by nothing about the card: where it lies, the cost, and the lines about the player', () => {
    const { engine, runtime } = picks(undefined, adding(CARD_PICK_GAME, SELL_LINE, '    Only if the card is not a Ruby.'));
    const s = engine.getState();
    const [buy, sell] = [actionNamed(BUY, runtime.game), actionNamed(SELL, runtime.game)];
    // The line about the card is left to the press.
    expect(faceDownReady(runtime, sell, s, 'p0', r2)).toBe(true);
    expect(engine.canDispatch({ type: SELL, by: 'p0', cardId: r2 })).toBe('the card is not a Ruby');
    expect(faceDownReady(runtime, sell, s, 'p0', r1)).toBe('Pick a card in your stash to sell.');
    expect(faceDownReady(runtime, sell, markOut(s, 'p0'), 'p0', r2)).toBe("You're out of the game.");
    // “the card's cost” reads the card; the move it costs does not.
    expect(faceDownReady(runtime, buy, setCounter(s, 'coins', 'p0', 0), 'p0', r1)).toBe(true);
    expect(faceDownReady(runtime, buy, setCounter(s, 'moves', 'p0', 0), 'p0', r1)).toBe('they have at least 1 move');
  });

  it('lists the cards each seat could pick, in slot order', () => {
    const { engine, runtime } = picks();
    const s = engine.getState();
    expect(cardCandidates(runtime, actionNamed(BUY), s, 'p0')).toEqual([r1, o1]);
    expect(cardCandidates(runtime, actionNamed(SELL), s, 'p0')).toEqual([r2, o2]);
    expect(cardCandidates(runtime, actionNamed(SELL), s, 'p1')).toEqual([]);
  });

  it('undoes a buy, and replays it from the log', () => {
    const { engine } = picks();
    const before = engine.getState();
    expect(engine.dispatch({ type: BUY, by: 'p0', cardId: r1 }).ok).toBe(true);
    const after = engine.getState();
    const fresh = picks().engine;
    fresh.loadLog([...engine.getLog()]);
    expect(fresh.getState()).toEqual(after);
    engine.undo();
    expect(engine.getState()).toEqual(before);
  });

  describe('a card and the card it goes to, and sets of cards', () => {
    const SHOW = 'show a card from their stash to a card in their case';
    const TRADE = 'trade some cards from their stash to the shop';
    const [, , r3] = named('Ruby');
    const [, , o3, o4] = named('Opal');
    /** The arranged table with `ids` put in `zone` too. */
    const plus = (zone: string, ...ids: string[]) => (s: GameState) => relocate(s, ids, zone, g);
    const zoneIds = (s: GameState, zone: string) => zoneCards(s, zone).map((c) => c.id);
    /** Each move is refused with `reason`, and leaves the state as it was. */
    const refusesAll = (engine: ReturnType<typeof picks>['engine'], moves: Move[], reason: string) => {
      for (const move of moves) {
        const before = engine.getState();
        expect(engine.dispatch(move), JSON.stringify(move)).toMatchObject({ ok: false, reason });
        expect(engine.getState()).toEqual(before);
      }
    };

    it('shows a card onto a card in the case: the card goes to the case and the move is spent', () => {
      const { engine } = picks(plus('case-p0', o3));
      expect(engine.dispatch({ type: SHOW, by: 'p0', cardId: o2, onto: o3 })).toMatchObject({ ok: true });
      const s = engine.getState();
      expect(zoneIds(s, 'case-p0')).toEqual([o3, o2]);
      expect(coinsAndMoves(s)).toEqual([7, 1]);
    });

    it('reads “the target card” as the card it goes to', () => {
      const { engine } = picks(plus('case-p0', r3));
      expect(engine.dispatch({ type: SHOW, by: 'p0', cardId: o2, onto: r3 })).toMatchObject({ ok: false, reason: 'the target card is not a Ruby' });
    });

    it('says how to pick where it goes, and offers each card of that zone', () => {
      const { engine, runtime } = picks(plus('case-p0', o3, r3));
      expect(ontoPrompt(actionNamed(SHOW))).toBe('Pick where it goes: a card in your case.');
      expect(cardPrompt(actionNamed(SHOW))).toBe('Pick a card from your stash to show.');
      expect(ontoCandidates(runtime, actionNamed(SHOW), engine.getState(), 'p0')).toEqual([o3, r3]);
      expect(ontoCandidates(runtime, actionNamed(SHOW), engine.getState(), 'p1')).toEqual([]);
    });

    it('Review Focus: refuses a target it can not take with its prompt, after the card, and changes nothing', () => {
      const { engine } = picks(plus('case-p0', o3));
      const show = (press: { [k: string]: Json }): Move => ({ type: SHOW, by: 'p0', cardId: o2, ...press });
      refusesAll(engine, [show({}), show({ onto: r1 }), show({ onto: o2 }), show({ onto: 5 }), show({ onto: 'c999' })], 'Pick where it goes: a card in your case.');
      refusesAll(engine, [{ type: SHOW, by: 'p0', cardId: r1, onto: 5 }], 'Pick a card from your stash to show.');
    });

    it('picks a set and the card it goes to', () => {
      const STACK = 'stack some cards from their stash to a card in their case';
      const text = CARD_PICK_GAME.replace('  A player may stop.\n', [
        `  A player may ${STACK}.`, '    Only if the target card is not a Ruby.', '    Then:', '      Move the picked cards to their case.', '  A player may stop.', '',
      ].join('\n'));
      expect(compileGame(text, lib).diagnostics).toEqual([]);
      const { engine, runtime } = picks(plus('case-p0', r3, o3), text);
      expect(ontoPrompt(actionNamed(STACK, runtime.game))).toBe('Pick where they go: a card in your case.');
      expect(engine.canDispatch({ type: STACK, by: 'p0', cardIds: [o2, r2] })).toBe('Pick where they go: a card in your case.');
      expect(engine.canDispatch({ type: STACK, by: 'p0', cardIds: [o2, r2], onto: r3 })).toBe('the target card is not a Ruby');
      expect(engine.dispatch({ type: STACK, by: 'p0', cardIds: [o2, r2], onto: o3 })).toMatchObject({ ok: true });
      expect(zoneIds(engine.getState(), 'case-p0')).toEqual([r3, o3, o2, r2]);
    });

    it('Review Focus: refuses a picked card as the card it goes to, in a zone that holds both', () => {
      const SWAP = 'swap a card from their case to a card in their case';
      const SHUFFLE = 'shuffle some cards from their case to a card in their case';
      const text = CARD_PICK_GAME.replace('  A player may stop.\n', `  A player may ${SWAP}.\n  A player may ${SHUFFLE}.\n  A player may stop.\n`);
      expect(compileGame(text, lib).diagnostics).toEqual([]);
      const { engine } = picks(plus('case-p0', r3, o3), text);
      refusesAll(engine, [{ type: SWAP, by: 'p0', cardId: o3, onto: o3 }], 'Pick where it goes: a card in your case.');
      refusesAll(engine, [{ type: SHUFFLE, by: 'p0', cardIds: [o3, r3], onto: r3 }], 'Pick where they go: a card in your case.');
      expect(engine.canDispatch({ type: SWAP, by: 'p0', cardId: o3, onto: r3 })).toBe(true);
      expect(engine.canDispatch({ type: SHUFFLE, by: 'p0', cardIds: [o3], onto: r3 })).toBe(true);
    });

    it('offers and takes only the top card of a pile as the card it goes to', () => {
      const text = CARD_PICK_GAME.replace('  A player may stop.\n', '  A player may bury a card from their stash to a card in the pile.\n  A player may stop.\n');
      expect(compileGame(text, lib).diagnostics).toEqual([]);
      const { engine, runtime } = picks(undefined, text);
      const [under, top] = zoneIds(engine.getState(), 'pile').slice(-2);
      expect(ontoCandidates(runtime, actionNamed('bury a card from their stash to a card in the pile', runtime.game), engine.getState(), 'p0')).toEqual([top]);
      const bury = (onto: string): Move => ({ type: 'bury a card from their stash to a card in the pile', by: 'p0', cardId: o2, onto });
      expect(engine.canDispatch(bury(under))).toBe('Pick where it goes: a card in the pile.');
      expect(engine.canDispatch(bury(top))).toBe(true);
    });

    it('trades a set: the cards go to the shop in the order picked, and the move is spent', () => {
      const { engine } = picks();
      expect(engine.dispatch({ type: TRADE, by: 'p0', cardIds: [o2, r2] })).toMatchObject({ ok: true });
      const s = engine.getState();
      expect(zoneIds(s, 'shop')).toEqual([r1, o1, o2, r2]);
      expect(zoneIds(s, 'stash-p0')).toEqual([]);
      expect(coinsAndMoves(s)).toEqual([7, 1]);
    });

    it('R1: judges a set as a whole when pressed, and each card alone may be pressed', () => {
      const { engine } = picks(plus('stash-p0', o4));
      expect(engine.canDispatch({ type: TRADE, by: 'p0', cardIds: [r2, o2, o4] })).toBe('they picked at most 2 cards');
      for (const id of [r2, o2, o4]) expect(engine.canDispatch({ type: TRADE, by: 'p0', cardIds: [id] }), id).toBe(true);
    });

    it('Review Focus: refuses a set it can not take with its prompt, before the cost, and changes nothing', () => {
      const prompt = 'Pick one or more cards from your stash to trade.';
      expect(cardPrompt(actionNamed(TRADE))).toBe(prompt);
      const { engine } = picks();
      const trade = (press: { [k: string]: Json }): Move => ({ type: TRADE, by: 'p0', ...press });
      const sets = [trade({ cardIds: [] }), trade({ cardIds: [r2, r2] }), trade({ cardIds: [r2, r1] }), trade({ cardIds: 'r2' }), trade({}), trade({ cardIds: [r2, 7] })];
      refusesAll(engine, sets, prompt);
    });

    it('keeps the press\'s order: the last card picked ends on top', () => {
      const TOSS = CARD_PICK_GAME.replace('  A player may stop.\n', [
        '  A player may toss some cards from their stash.', '    Then:', '      Move the picked cards to the pile.', '  A player may stop.', '',
      ].join('\n'));
      expect(compileGame(TOSS, lib).diagnostics).toEqual([]);
      const { engine } = picks(undefined, TOSS);
      expect(engine.dispatch({ type: 'toss some cards from their stash', by: 'p0', cardIds: [o2, r2] })).toMatchObject({ ok: true });
      expect(zoneIds(engine.getState(), 'pile').slice(-2)).toEqual([o2, r2]);
    });

    it('judges a card the player can not see by nothing about the cards: a set by none of its lines about the picked cards', () => {
      const { engine, runtime } = picks(plus('stash-p0', o4));
      const s = engine.getState();
      const trade = actionNamed(TRADE);
      const tight = CARD_PICK_GAME.replace('    Only if they picked at most 2 cards.', '    Only if they picked at most 0 cards.');
      expect(tight).not.toBe(CARD_PICK_GAME);
      const strict = picks(undefined, tight);
      expect(strict.engine.canDispatch({ type: TRADE, by: 'p0', cardIds: [r2] })).toBe('they picked at most 0 cards');
      expect(faceDownReady(strict.runtime, actionNamed(TRADE, strict.runtime.game), strict.engine.getState(), 'p0', r2)).toBe(true);
      expect(faceDownReady(runtime, trade, s, 'p0', r1)).toBe('Pick one or more cards from your stash to trade.');
      // A target is judged the same way: the line about it is left to the press.
      const shown = picks(plus('case-p0', r3));
      const show = actionNamed(SHOW, shown.runtime.game);
      expect(shown.engine.canDispatch({ type: SHOW, by: 'p0', cardId: o2, onto: r3 })).toBe('the target card is not a Ruby');
      expect(faceDownReady(shown.runtime, show, shown.engine.getState(), 'p0', o2, r3)).toBe(true);
      expect(faceDownReady(shown.runtime, show, shown.engine.getState(), 'p0', o2, r1)).toBe('Pick where it goes: a card in your case.');
    });

    it('Review Focus: refuses a set it can not take with its prompt before the cost, and a set it can take with the cost before its Only if', () => {
      const prompt = 'Pick one or more cards from your stash to trade.';
      const trade = (press: { [k: string]: Json }): Move => ({ type: TRADE, by: 'p0', ...press });
      // A trade that costs 2 moves, with 1 move left: the cost would refuse every press.
      const COSTLY = CARD_PICK_GAME.replace('    It costs 1 move.\n    Only if they picked at most', '    It costs 2 moves.\n    Only if they picked at most');
      expect(COSTLY).not.toBe(CARD_PICK_GAME);
      const { engine } = picks((s) => setCounter(plus('stash-p0', o4)(s), 'moves', 'p0', 1), COSTLY);
      refusesAll(engine, [trade({}), trade({ cardIds: [] }), trade({ cardIds: [r2, r1] }), trade({ cardIds: [r2, r2] })], prompt);
      // Three cards are more than its Only if allows too; the cost is asked first.
      refusesAll(engine, [trade({ cardIds: [r2, o2, o4] })], 'they have at least 2 moves');
    });

    it('Review Focus: refuses a target it can not take with its prompt before the cost, and one it can take with the cost before its Only if', () => {
      const show = (press: { [k: string]: Json }): Move => ({ type: SHOW, by: 'p0', cardId: o2, ...press });
      // A show that costs 2 moves, with 1 move left: the cost would refuse every press.
      const COSTLY = CARD_PICK_GAME.replace('    It costs 1 move.\n    Only if the target card', '    It costs 2 moves.\n    Only if the target card');
      expect(COSTLY).not.toBe(CARD_PICK_GAME);
      const { engine } = picks((s) => setCounter(plus('case-p0', r3)(s), 'moves', 'p0', 1), COSTLY);
      refusesAll(engine, [show({}), show({ onto: r1 }), show({ onto: o2 })], 'Pick where it goes: a card in your case.');
      // The Ruby in the case is refused by its Only if too; the cost is asked first.
      refusesAll(engine, [show({ onto: r3 })], 'they have at least 2 moves');
    });

    it('takes a set from a pile only as its top card', () => {
      const GRAB = 'grab some cards from the pile';
      const text = CARD_PICK_GAME.replace('  A player may stop.\n', `  A player may ${GRAB}.\n    Then:\n      Move the picked cards to their stash.\n  A player may stop.\n`);
      expect(compileGame(text, lib).diagnostics).toEqual([]);
      const { engine, runtime } = picks(undefined, text);
      const [under, top] = zoneIds(engine.getState(), 'pile').slice(-2);
      expect(cardCandidates(runtime, actionNamed(GRAB, runtime.game), engine.getState(), 'p0')).toEqual([top]);
      const grab = (cardIds: string[]): Move => ({ type: GRAB, by: 'p0', cardIds });
      refusesAll(engine, [grab([under]), grab([top, under])], 'Pick one or more cards from the pile to grab.');
      expect(engine.dispatch(grab([top]))).toMatchObject({ ok: true });
      expect(zoneIds(engine.getState(), 'stash-p0')).toEqual([r2, o2, top]);
    });

    it('refuses a set it would put in a zone of a seat that is not at the table, whichever cards they are', () => {
      const GIFT = "gift some cards from their stash to p2's case";
      const text = CARD_PICK_GAME.replace('  A player may stop.\n', `  A player may ${GIFT}.\n  A player may stop.\n`);
      expect(compileGame(text, lib).diagnostics).toEqual([]);
      const { engine } = picks(undefined, text);
      refusesAll(engine, [{ type: GIFT, by: 'p0', cardIds: [r2] }, { type: GIFT, by: 'p0', cardIds: [o2, r2] }], "You can't gift cards there.");
    });

    it('undoes a show, and replays it from the log', () => {
      const arrange = plus('case-p0', o3);
      const { engine } = picks(arrange);
      const before = engine.getState();
      expect(engine.dispatch({ type: SHOW, by: 'p0', cardId: o2, onto: o3 }).ok).toBe(true);
      const after = engine.getState();
      const fresh = picks(arrange).engine;
      fresh.loadLog([...engine.getLog()]);
      expect(fresh.getState()).toEqual(after);
      engine.undo();
      expect(engine.getState()).toEqual(before);
    });

    it('undoes a trade, and replays it from the log', () => {
      const { engine } = picks();
      const before = engine.getState();
      expect(engine.dispatch({ type: TRADE, by: 'p0', cardIds: [o2, r2] }).ok).toBe(true);
      const after = engine.getState();
      const fresh = picks().engine;
      fresh.loadLog([...engine.getLog()]);
      expect(fresh.getState()).toEqual(after);
      engine.undo();
      expect(engine.getState()).toEqual(before);
    });
  });
});

describe('a target card in several zones', () => {
  const COACH = 'coach a card from their stash to a card in their workshop, their crew or their idle';
  const ROUSE = 'rouse some cards from the hall to a card in their workshop';
  const PROMPT = 'Pick where it goes: a card in your workshop, your crew or your idle.';
  const g = compileGame(COACH_GAME, lib).game!;
  /** A two-player game of COACH_GAME once Setup is done: p0 to act. */
  const started = createEngine(g, lib, 2, initialState(g, 1)).engine.getState();
  const named = (name: string) => started.cards.filter((c) => c.data?.name === name).map((c) => c.id);
  const [statue] = named('Statue');
  const [vase, vase2] = named('Vase');
  const [potter, potter2, potter3] = named('Potter');
  const [smith] = named('Smith');
  /** p0's stash holds the Statue alone, their workshop the Vase with the Potter on it in their crew, and their idle the Smith. */
  const arranged = (s: GameState): GameState => {
    const jobs = [...zoneCards(s, 'stash-p0'), ...zoneCards(s, 'stash-p1')].map((c) => c.id);
    const placed = relocate(relocate(relocate(relocate(s, jobs, 'pile', g), [statue], 'stash-p0', g), [vase], 'workshop-p0', g), [smith], 'idle-p0', g);
    return putOn(placed, [potter], 'crew-p0', vase, g);
  };
  /** An engine on the arranged table, after `arrange`. */
  const coaching = (arrange: (s: GameState) => GameState = (s) => s) => createEngine(g, lib, 2, arrange(arranged(started)));
  const tired = (...ids: string[]) => (s: GameState) => ids.reduce((state, id) => changeCard(state, id, { tired: true }, g), s);
  const dataOf = (s: GameState, id: string) => cardById(s, id)!.data;
  const coach = (onto: string): Move => ({ type: COACH, by: 'p0', cardId: statue, onto });
  const coachAction = g.phases[0].actions.find((a) => a.words === COACH)!;

  it('says how to pick where it goes, naming every zone, and offers the cards of each zone in turn', () => {
    const { engine, runtime } = coaching();
    expect(ontoPrompt(coachAction)).toBe(PROMPT);
    expect(ontoCandidates(runtime, coachAction, engine.getState(), 'p0')).toEqual([vase, potter, smith]);
  });

  it('coaches onto a card in the second zone: Gold is refused for a Potter, so Plain is filled in', () => {
    const { engine } = coaching();
    expect(engine.dispatch(coach(potter))).toMatchObject({ ok: true });
    const s = engine.getState();
    expect(dataOf(s, potter)).toMatchObject({ drills: 1 });
    expect(dataOf(s, potter)).not.toHaveProperty('gold drills');
    expect(cardById(s, statue)!.zoneId).toBe('scrap');
  });

  it('coaches onto a card in the first zone and in the last', () => {
    const first = coaching().engine;
    expect(first.dispatch(coach(vase))).toMatchObject({ ok: true });
    expect(dataOf(first.getState(), vase)).toMatchObject({ drills: 1 });
    const last = coaching().engine;
    expect(last.dispatch({ ...coach(smith), choices: ['Gold'] })).toMatchObject({ ok: true });
    expect(dataOf(last.getState(), smith)).toMatchObject({ 'gold drills': 1 });
  });

  it('refuses a card in no zone it names with its prompt, and a tired one with its Only if line, changing nothing', () => {
    const { engine } = coaching();
    const before = engine.getState();
    const inHall = zoneCards(before, 'hall')[0].id;
    expect(engine.dispatch(coach(inHall))).toMatchObject({ ok: false, reason: PROMPT });
    expect(engine.dispatch(coach(statue))).toMatchObject({ ok: false, reason: PROMPT });
    expect(engine.getState()).toEqual(before);
    const worn = coaching(tired(smith)).engine;
    expect(worn.dispatch(coach(smith))).toMatchObject({ ok: false, reason: 'the target card is not tired' });
  });

  it('tires the card it goes to when a card on it is tired, and still gives it a drill', () => {
    const { engine } = coaching(tired(potter));
    expect(engine.dispatch(coach(vase))).toMatchObject({ ok: true });
    expect(dataOf(engine.getState(), vase)).toMatchObject({ drills: 1, tired: true });
  });

  it('wakes two tired hands roused onto a job, which sit on it in the crew', () => {
    const { engine } = coaching((s) => tired(potter2, potter3)(relocate(s, [vase2], 'workshop-p0', g)));
    expect(engine.dispatch({ type: ROUSE, by: 'p0', cardIds: [potter2, potter3], onto: vase2 })).toMatchObject({ ok: true });
    const s = engine.getState();
    expect(cardsOn(s, vase2).map((c) => [c.id, c.zoneId])).toEqual([[potter2, 'crew-p0'], [potter3, 'crew-p0']]);
    for (const id of [potter2, potter3]) expect(dataOf(s, id)).not.toHaveProperty('tired');
  });

  it('refuses to rouse hands onto a job a tired hand is on', () => {
    const { engine } = coaching(tired(potter));
    expect(engine.dispatch({ type: ROUSE, by: 'p0', cardIds: [potter2], onto: vase })).toMatchObject({ ok: false, reason: 'no card on the target card is tired' });
  });
});
