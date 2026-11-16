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
import { isOut } from './board-state';
import { END_STEPS_KEY } from './turns';

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

describe('steps when a round starts, fix round 1', () => {
  it('end on the next seat still in when the seat that took the first went out in its step', () => {
    // A player with no coins and an empty list goes out instead of passing the levy on; going out hands the step to the next seat.
    const EMPTY = '  When their list is empty:\n    The levy passes to the left.';
    const text = LEVY_GAME.replace(EMPTY, [
      '  When their list is empty:', '    Only if they have at least 1 coin.', '    The levy passes to the left.',
      '  When their list is empty:', '    Only if they have less than 1 coin.', '    They are out.',
    ].join('\n'));
    const state = table(compiled(text), coins(0, 1, 1)).getState();
    expect(isOut(state, 'p0')).toBe(true);
    // p1 and p2 passed it on unpaid, and p1's turn started with a coin.
    expect(state.turn).toEqual({ current: 'p1', phase: 'working' });
    expect(state.data[TURN_OF_KEY]).toBe('p1');
    expect(state.data[ROUND_KEY]).toBe(1);
    expect(state.data).not.toHaveProperty(ROUND_STEPS_KEY);
    expect(coinsOf(state)).toEqual([0, 2, 1]);
  });

  it('are refused when the only line that passes them on can never run while they do', () => {
    const NEVER = 'No line passes the levy on to the next player, so the first player\'s levy would never end. '
      + 'Write “The levy passes to the left.” where a player\'s levy ends.';
    const RULES = '  When they have at least 2 coins:\n    They pay 2.\n    The levy passes to the left.\n'
      + '  When their list is empty:\n    The levy passes to the left.';
    const withoutPasses = LEVY_GAME.replace(RULES, '  When they have at least 2 coins:\n    They pay 2.');
    // In working's stop button, which never runs in the levy.
    const inStop = withoutPasses.replace(STOP, `${STOP}\n      The levy passes to the left.`);
    expect(errorsOf(inStop)).toEqual([expect.objectContaining({ line: lineOf(inStop, STEPS_LINE), severity: 'error', message: NEVER })]);
    // Among the lines that start a round, before the steps begin.
    const inRoundStart = withoutPasses.replace(STEPS_LINE, `    The levy passes to the left.\n${STEPS_LINE}`);
    expect(errorsOf(inRoundStart)).toEqual([
      expect.objectContaining({ line: lineOf(inRoundStart, STEPS_LINE), severity: 'error', message: NEVER }),
    ]);
  });

  it('refuse a “Go to …” from a rule for every phase, on that line, and still end once passed on', () => {
    const GO_TO = '    Go to tidying.';
    // A rule for every phase that goes to tidying once the done pile has three cards, and a levy button that adds one.
    const text = LEVY_GAME.replace('    Move the done pile to the pile.', `    Move the done pile to the pile.\n${GO_TO}`)
      .replace('  A player may pawn a card in their list.',
        '  A player may tally.\n    Then:\n      Move the top card of the pile to the done pile.\n  A player may pawn a card in their list.');
    expect(errorsOf(text)).toEqual([]);
    const game = compiled(text);
    // The done pile has 1 card, and the round's start makes it 2: the levy waits for p1, who has too few coins.
    const toDone = (state: GameState) =>
      relocate(state, zoneCards(state, zoneIdFor('pile')).slice(0, 1).map((card) => card.id), zoneIdFor('done pile'), game);
    const engine = table(game, both(toDone, coins(5, 0, 3), toList(2, 'p1')));
    const before = engine.getState();
    expect(before.turn).toEqual({ current: 'p1', phase: 'levy' });
    const error = thrown(() => engine.dispatch({ type: 'tally', by: 'p1' }));
    expect(error).toBeInstanceOf(RuleError);
    expect(error).toMatchObject({
      message: 'The players take the levy in turn at the start of a round, so no line can go to another phase until they have all taken it.',
      line: lineOf(text, GO_TO),
    });
    expect(engine.getState()).toBe(before);
    // The press was refused and nothing changed, so the levy goes on and ends with p0's turn.
    pawn(engine, 'p1');
    pawn(engine, 'p1');
    const state = engine.getState();
    expect(state.turn).toEqual({ current: 'p0', phase: 'working' });
    expect(coinsOf(state)).toEqual([4, 0, 1]);
    expect(state.data).not.toHaveProperty(ROUND_STEPS_KEY);
  });

  it('hold back the steps before the score while they run, which start once they are done', () => {
    const text = `${LEVY_GAME.replace('  The game ends when the pile is empty.', [
      '  The game ends when the done pile is not empty.',
      '  Before the score, each player has the final count, in turn from the start player.'].join('\n'))}\n\n${[
      'Phase: final count', '  Players take turns.', '  When this phase starts:', '    The final count passes to the left.'].join('\n')}`;
    expect(errorsOf(text)).toEqual([]);
    // The round's start leaves a card in the done pile, so the game is decided while the levy waits for p1.
    const engine = table(compiled(text), both(coins(5, 0, 3), toList(2, 'p1')));
    const waiting = engine.getState();
    expect(waiting.turn).toEqual({ current: 'p1', phase: 'levy' });
    expect(waiting.data).not.toHaveProperty(END_STEPS_KEY);
    expect(waiting.result).toBeUndefined();
    pawn(engine, 'p1');
    pawn(engine, 'p1');
    const state = engine.getState();
    expect(state.data[END_STEPS_KEY]).toBe(true);
    expect(state.result).toBeDefined();
  });

  it('refuse an After line in their phase, on that line', () => {
    const AFTER = '  After a player pawns, the turn passes to the left.';
    const text = `${LEVY_GAME}\n${AFTER}`;
    expect(errorsOf(text)).toEqual([expect.objectContaining({
      line: lineOf(text, AFTER),
      message: 'The players take the levy in turn at the start of a round, so it can\'t have an After line: pass it on with “The levy passes to the left.”',
    })]);
  });
});

describe('steps when a round starts, refused when a line goes into their phase from outside them', () => {
  const ENTERED = 'The players take the levy only in turn at the start of a round, so no line can go to it.';
  /** LEVY_GAME's levy phase, written last. */
  const LEVY_PHASE = LEVY_GAME.slice(LEVY_GAME.indexOf('Phase: levy'));

  it('from a button\'s lines, or a rule for every phase, on that line', () => {
    const GO_TO = '      Go to levy.';
    const inStop = LEVY_GAME.replace(STOP, `${STOP}\n${GO_TO}`);
    expect(errorsOf(inStop)).toEqual([expect.objectContaining({ line: lineOf(inStop, GO_TO), message: ENTERED })]);
    const EVERY = '    Move the done pile to the pile.';
    const IF_GO_TO = '    If the pile is empty, go to levy.';
    const inEvery = LEVY_GAME.replace(EVERY, `${EVERY}\n${IF_GO_TO}`);
    expect(errorsOf(inEvery)).toEqual([expect.objectContaining({ line: lineOf(inEvery, IF_GO_TO), message: ENTERED })]);
  });

  it('by another phase\'s go-to rule, on that rule', () => {
    const GO_TO = '  When their list has more than 5 cards, go to levy.';
    const text = LEVY_GAME.replace('Phase: tidying\n', `Phase: tidying\n${GO_TO}\n`);
    expect(text).not.toBe(LEVY_GAME);
    expect(errorsOf(text)).toEqual([expect.objectContaining({ line: lineOf(text, GO_TO), message: ENTERED })]);
  });

  it('by a line that starts their phase with a player, on that line', () => {
    const WITH_THEM = '      The levy phase starts with them.';
    const withThem = LEVY_GAME.replace(STOP, `${STOP}\n${WITH_THEM}`);
    expect(errorsOf(withThem)).toEqual([expect.objectContaining({ line: lineOf(withThem, WITH_THEM), message: ENTERED })]);
    const ON_THEIR_LEFT = '      The levy phase starts with the player on their left.';
    const onTheirLeft = LEVY_GAME.replace(STOP, `${STOP}\n${ON_THEIR_LEFT}`);
    expect(errorsOf(onTheirLeft)).toEqual([expect.objectContaining({ line: lineOf(onTheirLeft, ON_THEIR_LEFT), message: ENTERED })]);
  });

  it('by their phase coming first, so the game starts in it, on its Phase line', () => {
    const text = LEVY_GAME.slice(0, -LEVY_PHASE.length).trimEnd().replace('Phase: working', `${LEVY_PHASE}\n\nPhase: working`);
    expect(text.indexOf('Phase: levy')).toBeLessThan(text.indexOf('Phase: working'));
    expect(errorsOf(text)).toEqual([expect.objectContaining({ line: lineOf(text, 'Phase: levy'), message: ENTERED })]);
  });
});

describe('steps when a round starts, passed on by a seat that goes out in its own step', () => {
  /** LEVY_GAME where a player may give up in the levy, and goes out. */
  const GIVE_UP = LEVY_GAME.replace('Phase: levy\n  Players take turns.',
    'Phase: levy\n  Players take turns.\n  A player may give up.\n    Then:\n      They are out.');

  it('as the last seat: the steps end and the start player\'s turn starts, and no seat takes its step twice', () => {
    // p0 and p1 pay the levy; p2 has no coins and a card to pawn, so the levy waits for them.
    const engine = table(compiled(GIVE_UP), both(coins(4, 4, 0), toList(1, 'p2')));
    expect(engine.getState().turn).toEqual({ current: 'p2', phase: 'levy' });
    expect(coinsOf(engine.getState())).toEqual([2, 2, 0]);
    expect(engine.dispatch({ type: 'give up', by: 'p2' }).reason).toBeUndefined();
    const state = engine.getState();
    expect(isOut(state, 'p2')).toBe(true);
    // p0's turn started with a coin, and nobody paid the levy again.
    expect(coinsOf(state)).toEqual([3, 2, 0]);
    expect(state.turn).toEqual({ current: 'p0', phase: 'working' });
    expect(state.data[TURN_OF_KEY]).toBe('p0');
    expect(state.data).not.toHaveProperty(ROUND_STEPS_KEY);
  });

  it('before the last: the next seat takes its step, and the phase\'s start lines run about them', () => {
    const starting = GIVE_UP.replace('Phase: levy\n  Players take turns.',
      'Phase: levy\n  Players take turns.\n  When this phase starts:\n    They get 1 coin.');
    // Each step starts with a coin, too few to pay, and p0 and p1 each have a card to pawn, so the levy waits for each of them.
    const engine = table(compiled(starting), both(coins(0, 0, 0), toList(1, 'p0'), toList(1, 'p1')));
    expect(engine.getState().turn).toEqual({ current: 'p0', phase: 'levy' });
    expect(coinsOf(engine.getState())).toEqual([1, 0, 0]);
    expect(engine.dispatch({ type: 'give up', by: 'p0' }).reason).toBeUndefined();
    const state = engine.getState();
    expect(isOut(state, 'p0')).toBe(true);
    expect(state.turn).toEqual({ current: 'p1', phase: 'levy' });
    expect(coinsOf(state)).toEqual([1, 1, 0]);
    expect(state.data[ROUND_STEPS_KEY]).toEqual({ phase: 'levy', first: 'p0', back: 'working' });
  });
});

describe('steps when a round starts, refused when their line could run more than once or no line run while they do passes them on', () => {
  it('under “For each …”, on that line', () => {
    const FOR_EACH = '    For each card in the done pile, each player has the levy, in turn from the start player.';
    const text = LEVY_GAME.replace(STEPS_LINE, FOR_EACH);
    expect(text).not.toBe(LEVY_GAME);
    expect(errorsOf(text)).toEqual([expect.objectContaining({
      line: lineOf(text, FOR_EACH), message: 'The players take the levy once a round, so its line can\'t be under “For each …”.',
    })]);
  });

  it('when the only line that passes them on starts a turn in their phase, which never happens while they run', () => {
    const RULES = '  When they have at least 2 coins:\n    They pay 2.\n    The levy passes to the left.\n'
      + '  When their list is empty:\n    The levy passes to the left.';
    const text = LEVY_GAME.replace(RULES, '  When they have at least 2 coins:\n    They pay 2.')
      .replace('Phase: levy\n  Players take turns.', 'Phase: levy\n  Players take turns.\n  When a player\'s turn starts:\n    The levy passes to the left.');
    expect(text).toContain('When a player\'s turn starts:\n    The levy passes to the left.');
    expect(errorsOf(text)).toEqual([expect.objectContaining({
      line: lineOf(text, STEPS_LINE), severity: 'error',
      message: 'No line passes the levy on to the next player, so the first player\'s levy would never end. '
        + 'Write “The levy passes to the left.” where a player\'s levy ends.',
    })]);
  });
});
