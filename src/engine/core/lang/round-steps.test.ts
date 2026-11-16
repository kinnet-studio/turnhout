import { describe, expect, it } from 'vitest';
import { zoneCards, type GameState } from '../game-state';
import type { PlayerId } from '../scene';
import { counterOf, markOut, setCounter, withBoardData } from './board-state';
import { createEngine, flowDefFor, initialState, seatsFor } from './build';
import { compileGame } from './compile';
import { RuleError } from './diagnostics';
import { runExamples } from './examples';
import { createDefaultLibrary } from './library';
import { LEVY_GAME, ROUNDS_GAME } from './testing';
import { ROUND_KEY, ROUND_STEPS_KEY, TURN_OF_KEY, clearTurnMarkers, roundFinished } from './turns';
import type { CompiledGame } from './types';
import { relocate, zoneIdFor } from './zones';

const lib = createDefaultLibrary();
const SEATS = seatsFor(3);
const lineOf = (text: string, line: string) => text.split('\n').indexOf(line) + 1;

/** Compiles designer text that may still lack phrases; anything worse fails the test. */
function compiled(text: string): CompiledGame {
  const { game, diagnostics } = compileGame(text, lib);
  if (!game) throw new Error(JSON.stringify(diagnostics));
  return game;
}

/** What went wrong with the text, warnings left out. */
const errorsOf = (text: string) => compileGame(text, lib).diagnostics.filter((d) => d.severity === 'error');

function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected it to throw.');
}

/** The round-start line that gives each player the levy, and the one before it. */
const STEPS_LINE = '    Each player has the levy, in turn from the start player.';
const ROUND_LINE = '    Move the top card of the pile to the done pile.';
/** working's stop button, up to its last line. */
const STOP = '  A player may stop.\n    Then:\n      Their moves go back to 0.';
const levy = compiled(LEVY_GAME);

/**
 * A 3-player engine of `game` whose turn is p0's in working, with no round started yet: p0, the first seat, is the start player, so
 * round 1 starts as the engine is built. Its counters are full; `prepare` may set coins, fill a list or mark a seat out before.
 */
function table(game = levy, prepare: (state: GameState) => GameState = (state) => state) {
  const start = withBoardData({ ...initialState(game, 1), turn: { current: 'p0', phase: 'working' } }, game, SEATS);
  return createEngine(game, lib, 3, prepare(start)).engine;
}
type Engine = ReturnType<typeof table>;

/** p0, p1 and p2 each stop, which finishes their turn and so the round. */
const round = (engine: Engine) => {
  for (const by of SEATS) expect(engine.dispatch({ type: 'stop', by }).reason).toBeUndefined();
};
const coinsOf = (state: GameState) => SEATS.map((seat) => counterOf(state, 'coins', seat));
/** p0, p1 and p2 start with these coins. */
const coins = (...values: number[]) => (state: GameState) => values.reduce((s, value, i) => setCounter(s, 'coins', SEATS[i], value), state);
const listOf = (state: GameState, seat: PlayerId) => zoneCards(state, zoneIdFor('list', seat));
const doneOf = (state: GameState) => zoneCards(state, zoneIdFor('done pile')).length;
const pileOf = (state: GameState) => zoneCards(state, zoneIdFor('pile')).length;
/** The first `n` cards of the pile go to the seat's list. */
const toList = (n: number, seat: PlayerId) => (state: GameState) =>
  relocate(state, zoneCards(state, zoneIdFor('pile')).slice(0, n).map((card) => card.id), zoneIdFor('list', seat), levy);
const both = (...steps: ((state: GameState) => GameState)[]) => (state: GameState) => steps.reduce((s, step) => step(s), state);

const PAWN = 'pawn a card in their list';
/** The seat pawns the first card of their list. */
const pawn = (engine: Engine, by: PlayerId) => {
  const [card] = listOf(engine.getState(), by);
  expect(engine.dispatch({ type: PAWN, by, cardId: card.id }).reason).toBeUndefined();
};

// How the numbers come: every turn start gives the player 1 coin (ROUNDS_GAME), tidying gives 1 coin, the levy takes 2 from each seat
// that has 2 coins or more, and the round's start moves 1 card from the pile to the done pile.

describe('steps each player takes in turn when a round starts, as written', () => {
  it('compiles with nothing to report: the phase the steps name is reached', () => {
    expect(compileGame(LEVY_GAME, lib).diagnostics).toEqual([]);
  });
  it('keeps the phase and the line with the rules for every phase', () => {
    expect(levy.everyPhase.roundSteps).toEqual({ phase: 'levy', line: lineOf(LEVY_GAME, STEPS_LINE) });
  });
  it('(guard) is left out for a game whose rounds have no steps', () => {
    expect(compiled(ROUNDS_GAME).everyPhase).not.toHaveProperty('roundSteps');
  });
  it('(guard) start through the flow\'s rule for a turn that waits, ahead of every other rule', () => {
    expect(flowDefFor(levy, SEATS).triggers?.[0].id).toBe('a turn starts');
  });
});

describe('steps when a round starts, refused when the rules are read', () => {
  it('anywhere but under “When a round starts:”', () => {
    const LINE = '      Each player has the levy, in turn from the start player.';
    const text = LEVY_GAME.replace(STOP, `${STOP}\n${LINE}`);
    expect(errorsOf(text)).toEqual([expect.objectContaining({
      line: lineOf(text, LINE),
      message: '“Each player has the levy, in turn from the start player” only makes sense under “When a round starts:”.',
    })]);
  });
  it('twice, on the second line', () => {
    const text = LEVY_GAME.replace(STEPS_LINE, `${STEPS_LINE}\n${STEPS_LINE}`);
    expect(errorsOf(text)).toEqual([expect.objectContaining({
      line: lineOf(LEVY_GAME, STEPS_LINE) + 1, message: 'There is already a line giving each player a step at the start of a round.',
    })]);
  });
  it('before another line that starts a round', () => {
    const text = LEVY_GAME.replace(`${ROUND_LINE}\n${STEPS_LINE}`, `${STEPS_LINE}\n${ROUND_LINE}`);
    expect(errorsOf(text)).toEqual([expect.objectContaining({
      line: lineOf(text, STEPS_LINE),
      message: 'The players take their steps once the other lines that start a round have run, so this must be the last line under “When a round starts:”.',
    })]);
  });
  it('in a phase where everyone acts at once, on the steps line', () => {
    const text = LEVY_GAME.replace('Phase: levy\n  Players take turns.', 'Phase: levy\n  Everyone acts at once.');
    // The phase then takes no turns, so its lines about “they” have problems of their own, and nothing else goes to it.
    expect(errorsOf(text)).toContainEqual(expect.objectContaining({
      line: lineOf(text, STEPS_LINE),
      message: 'The steps at the start of a round are taken in turn, so “levy” can\'t be a phase where everyone acts at once.',
    }));
  });
  it('with a “go to” in the phase, on that line', () => {
    const GO_TO = '  When they have at least 5 coins, go to working.';
    const text = LEVY_GAME.replace('Phase: levy\n  Players take turns.', `Phase: levy\n  Players take turns.\n${GO_TO}`);
    expect(errorsOf(text)).toEqual([expect.objectContaining({
      line: lineOf(text, GO_TO),
      message: 'The players take the levy in turn at the start of a round, so it can\'t go to another phase: pass it on with “The levy passes to the left.”',
    })]);
  });
  it('when no line passes the step on, as an error on the steps line', () => {
    const text = LEVY_GAME.replaceAll('    The levy passes to the left.', '    They get 1 coin.');
    expect(errorsOf(text)).toEqual([expect.objectContaining({
      line: lineOf(text, STEPS_LINE), severity: 'error',
      message: 'No line passes the levy on to the next player, so the first player\'s levy would never end. '
        + 'Write “The levy passes to the left.” where a player\'s levy ends.',
    })]);
  });
  it('naming a phase the game lacks', () => {
    const text = LEVY_GAME.replace(STEPS_LINE, '    Each player has the levvy, in turn from the start player.');
    expect(errorsOf(text)).toEqual([expect.objectContaining({ message: 'There is no phase called “levvy”.' })]);
  });
});

describe('steps when a round starts', () => {
  const pawning = both(coins(5, 0, 3), toList(2, 'p1'));

  it('start from the start player before their turn, and no turn starts', () => {
    const engine = table(levy, pawning);
    const state = engine.getState();
    // p0 paid and passed the levy on; p1 has too few coins and pawns.
    expect(state.turn).toEqual({ current: 'p1', phase: 'levy' });
    expect(coinsOf(state)).toEqual([3, 0, 3]);
    expect(state.data[ROUND_KEY]).toBe(1);
    expect(doneOf(state)).toBe(1);
    expect(state.data).not.toHaveProperty(TURN_OF_KEY);
    expect(state.data[ROUND_STEPS_KEY]).toEqual({ phase: 'levy', first: 'p0', back: 'working' });
    expect(engine.dispatch({ type: 'work', by: 'p0' }).reason).toBe('move work not allowed in phase levy');
    expect(engine.dispatch({ type: PAWN, by: 'p0', cardId: listOf(state, 'p1')[0].id }).reason).toBe("not p0's turn");
  });

  it('pass on once the player can pay, and the start player\'s turn starts after the last, in the round already started', () => {
    const engine = table(levy, pawning);
    pawn(engine, 'p1');
    expect(engine.getState().turn?.phase).toBe('levy');
    expect(coinsOf(engine.getState())).toEqual([3, 1, 3]);
    pawn(engine, 'p1');
    const state = engine.getState();
    expect(state.turn).toEqual({ current: 'p0', phase: 'working' });
    // p1 paid 2 and p2 paid 2; p0's turn started with a coin.
    expect(coinsOf(state)).toEqual([4, 0, 1]);
    expect(state.data[ROUND_KEY]).toBe(1);
    expect(state.data[TURN_OF_KEY]).toBe('p0');
    expect(state.data).not.toHaveProperty(ROUND_STEPS_KEY);
    expect(listOf(state, 'p1')).toEqual([]);
    expect(pileOf(state)).toBe(11);
  });

  it('may all pass at once, by their rules or their own start lines, and the turn starts once (Review Focus)', () => {
    const state = table(levy, coins(2, 2, 2)).getState();
    expect(state.turn).toEqual({ current: 'p0', phase: 'working' });
    expect(coinsOf(state)).toEqual([1, 0, 0]);
    expect(state.data[ROUND_KEY]).toBe(1);
    expect(state.data).not.toHaveProperty(ROUND_STEPS_KEY);
    // Each step's start lines give a coin and pass it on, so the next step starts inside them.
    const passing = LEVY_GAME.replace('Phase: levy\n  Players take turns.',
      'Phase: levy\n  Players take turns.\n  When this phase starts:\n    They get 1 coin.\n    The levy passes to the left.');
    const passed = table(compiled(passing), coins(0, 0, 0)).getState();
    expect(passed.turn).toEqual({ current: 'p0', phase: 'working' });
    expect(coinsOf(passed)).toEqual([2, 1, 1]);
    expect(passed.data[ROUND_KEY]).toBe(1);
    expect(passed.data[TURN_OF_KEY]).toBe('p0');
    expect(passed.data).not.toHaveProperty(ROUND_STEPS_KEY);
  });

  it('skip a seat that is out (Review Focus)', () => {
    const state = table(levy, both(coins(2, 0, 2), toList(1, 'p1'), (s) => markOut(s, 'p1'))).getState();
    expect(coinsOf(state)).toEqual([1, 0, 0]);
    expect(state.turn?.phase).toBe('working');
    expect(listOf(state, 'p1')).toHaveLength(1);
  });

  it('start again with the next round', () => {
    const engine = table(levy, coins(9, 9, 9));
    expect(coinsOf(engine.getState())).toEqual([8, 7, 7]);
    // Each player's turn gives 1 coin and their tidying 1 more, and the levy takes 2 back.
    round(engine);
    const state = engine.getState();
    expect(coinsOf(state)).toEqual([8, 7, 7]);
    expect(state.data[ROUND_KEY]).toBe(2);
    expect(state.turn).toEqual({ current: 'p0', phase: 'working' });
    expect(doneOf(state)).toBe(2);
  });
});

describe('the round is not finished as its steps end (Review Focus)', () => {
  const text = LEVY_GAME.replace('  The game ends when the pile is empty.',
    '  The game ends when the done pile has more than 1 card and the round is finished.');

  it('so the game goes on into the round they started, and ends with that round', () => {
    const engine = table(compiled(text), coins(9, 9, 9));
    // Round 2's start moved a second card to the done pile, and its steps ended with the start player's turn yet to start.
    round(engine);
    const state = engine.getState();
    expect(state.result).toBeUndefined();
    expect(state.data[ROUND_KEY]).toBe(2);
    expect(state.turn).toEqual({ current: 'p0', phase: 'working' });
    round(engine);
    expect(engine.getState().result).toBeDefined();
  });

  it('while the turn that waits for them has not started', () => {
    const state: GameState = { ...initialState(levy, 1), turn: { current: 'p0', phase: 'working' }, data: { [ROUND_STEPS_KEY]: true, [ROUND_KEY]: 1 } };
    expect(roundFinished(state, SEATS)).toBe(false);
  });
});

describe('steps when a round starts, refused while playing', () => {
  it('passed on outside them, and nothing changes', () => {
    const PASS = '      The levy passes to the left.';
    const text = LEVY_GAME.replace(STOP, `${STOP}\n${PASS}`);
    const engine = table(compiled(text), coins(2, 2, 2));
    const before = engine.getState();
    const error = thrown(() => engine.dispatch({ type: 'stop', by: 'p0' }));
    expect(error).toBeInstanceOf(RuleError);
    expect(error).toMatchObject({
      message: 'The levy passes to the left only while the players take it in turn at the start of a round.', line: lineOf(text, PASS),
    });
    expect(engine.getState()).toBe(before);
  });

  it('by passing the turn instead', () => {
    const EMPTY = '  When their list is empty:';
    const text = LEVY_GAME.replace(`${EMPTY}\n    The levy passes to the left.`, `${EMPTY}\n    The turn passes to the left.`);
    // p0 has no coins and nothing to pawn as the engine is built.
    const error = thrown(() => table(compiled(text), coins(0, 0, 0)));
    expect(error).toBeInstanceOf(RuleError);
    expect(error).toMatchObject({
      message: 'The turn does not pass while the players take the levy at the start of a round: write “The levy passes to the left.” instead.',
      line: lineOf(text, EMPTY) + 1,
    });
  });
});

describe('steps when a round starts, undone and replayed (Review Focus)', () => {
  it('replay to the same state, and undo to the step before', () => {
    const prepare = both(coins(5, 0, 3), toList(2, 'p1'));
    const engine = table(levy, prepare);
    pawn(engine, 'p1');
    pawn(engine, 'p1');
    const replayed = table(levy, prepare);
    replayed.loadLog([...engine.getLog()]);
    expect(replayed.getState()).toEqual(engine.getState());
    engine.undo();
    const state = engine.getState();
    expect(state.turn).toEqual({ current: 'p1', phase: 'levy' });
    expect(coinsOf(state)).toEqual([3, 1, 3]);
  });
});

describe('steps when a round starts, forgotten and reached by an example', () => {
  it('are forgotten with the turn markers', () => {
    const state = table().getState();
    const marked: GameState = { ...state, data: { ...state.data, [ROUND_STEPS_KEY]: { phase: 'levy', first: 'p0', back: 'working' } } };
    expect(clearTurnMarkers(marked).data).not.toHaveProperty(ROUND_STEPS_KEY);
  });

  it('are taken in an example', () => {
    const EXAMPLE = [
      "Example: a round starts with a levy from the start player, before the start player's turn",
      '  Given 3 players', '  And p1 has 1 coin', "  And p1's list has a Sweep", "  And it is p2's turn",
      '  When p2 stops', '  Then the phase is levy', "  And it is p1's turn",
      '  When p1 pawns the Sweep', '  Then the phase is working', "  And it is p0's turn",
      '  And p0 has 1 coin', '  And p1 has 0 coins', '  And p2 has 1 coin',
    ].join('\n');
    expect(runExamples(compiled(`${LEVY_GAME}\n\n${EXAMPLE}`), lib)).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
  });
});
