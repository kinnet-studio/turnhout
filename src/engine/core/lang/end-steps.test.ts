import { describe, expect, it } from 'vitest';
import { zoneCards, type GameState } from '../game-state';
import type { PlayerId } from '../scene';
import { counterOf, markOut, setCounter, withBoardData } from './board-state';
import { createEngine, flowDefFor, initialState, seatsFor } from './build';
import { compileGame } from './compile';
import { RuleError } from './diagnostics';
import { runExamples } from './examples';
import { createDefaultLibrary } from './library';
import { ROUNDS_GAME, STEPS_GAME } from './testing';
import { END_STEPS_KEY, ROUND_KEY, clearTurnMarkers } from './turns';
import type { CompiledGame } from './types';
import { zoneIdFor } from './zones';
import HEARTS from '@/games/hearts.rules?raw';
import RENT_DAY from '@/games/rent-day.rules?raw';

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

const BEFORE = '  Before the score, each player has the final count, in turn from the start player.';
/** STEPS_GAME's final count up to its start line, which gives the player whose step it is a coin. */
const STEP_STARTS = 'Phase: final count\n  Players take turns.\n  When this phase starts:\n    They get 1 coin.';
const steps = compiled(STEPS_GAME);

/**
 * A 3-player engine of `game` whose turn is p0's in working, so Setup is skipped and p0, the first seat, is the start player. Its
 * counters are full; `prepare` may set coins or mark a seat out before the engine is built.
 */
function table(game = steps, prepare: (state: GameState) => GameState = (state) => state) {
  const start = withBoardData({ ...initialState(game, 1), turn: { current: 'p0', phase: 'working' } }, game, SEATS);
  return createEngine(game, lib, 3, prepare(start)).engine;
}
type Engine = ReturnType<typeof table>;

/** An engine of `game` built from the state `engine` has come to, once `prepare` has changed it. */
const resume = (engine: Engine, prepare: (state: GameState) => GameState, game = steps) =>
  createEngine(game, lib, 3, prepare(engine.getState())).engine;

/** Each seat in turn presses the button. */
const press = (engine: Engine, type: string, ...seats: PlayerId[]) => {
  for (const by of seats) expect(engine.dispatch({ type, by }).reason).toBeUndefined();
};
/** p0, p1 and p2 each stop, which finishes their turn and so the round. */
const round = (engine: Engine) => press(engine, 'stop', 'p0', 'p1', 'p2');
const coinsOf = (state: GameState) => SEATS.map((seat) => counterOf(state, 'coins', seat));
const withCoins = (coins: number, ...seats: PlayerId[]) => (state: GameState) =>
  seats.reduce((s, seat) => setCounter(s, 'coins', seat, coins), state);
const doneOf = (state: GameState) => zoneCards(state, zoneIdFor('done pile')).length;

describe('the steps before the score, as written', () => {
  it('compiles with nothing to report: the phase the steps name is reached', () => {
    expect(compileGame(STEPS_GAME, lib).diagnostics).toEqual([]);
  });
  it('keeps the phase and its line with the End', () => {
    expect(steps.end?.steps).toEqual({ phase: 'final count', line: lineOf(STEPS_GAME, BEFORE) });
  });
  it('names the phases nearest a phase the game lacks', () => {
    const text = STEPS_GAME.replace(BEFORE, BEFORE.replace('the final count,', 'the final cont,'));
    expect(errorsOf(text)).toEqual([expect.objectContaining({
      line: lineOf(STEPS_GAME, BEFORE), message: 'There is no phase called “final cont”.', suggestions: ['final count'],
    })]);
  });
  it('refuses a second line saying what comes before the score', () => {
    const text = STEPS_GAME.replace(BEFORE, `${BEFORE}\n${BEFORE}`);
    expect(errorsOf(text)).toEqual([expect.objectContaining({
      line: lineOf(STEPS_GAME, BEFORE) + 1, message: 'There is already a line saying what comes before the score.',
    })]);
  });
  it('refuses a phase where everyone acts at once, on the line that names it', () => {
    const text = STEPS_GAME.replace('Phase: final count\n  Players take turns.', 'Phase: final count\n  Everyone acts at once.');
    expect(compileGame(text, lib).diagnostics).toContainEqual(expect.objectContaining({
      line: lineOf(text, BEFORE), severity: 'error',
      message: 'The steps before the score are taken in turn, so “final count” can\'t be a phase where everyone acts at once.',
    }));
  });
  it('refuses an After line in the phase, which would take the game out of the steps (P1)', () => {
    const AFTER = '  After a player counts, the turn passes to the left.';
    const text = STEPS_GAME.replace(STEP_STARTS, `${STEP_STARTS}\n${AFTER}`);
    expect(errorsOf(text)).toEqual([expect.objectContaining({
      line: lineOf(text, AFTER),
      message: 'The players take the final count in turn before the score, so it has no After line: pass it on with “The final count passes to the left.”',
    })]);
  });
  it('refuses a “go to” in the phase, which would take the game out of the steps (P1)', () => {
    const GO_TO = '  When they have at least 9 coins, go to working.';
    const text = STEPS_GAME.replace(STEP_STARTS, `${STEP_STARTS}\n${GO_TO}`);
    expect(errorsOf(text)).toEqual([expect.objectContaining({
      line: lineOf(text, GO_TO),
      message: 'The players take the final count in turn before the score, so it can\'t go to another phase: pass it on with “The final count passes to the left.”',
    })]);
  });
});

describe('the flow of a game with steps before the score', () => {
  const flow = flowDefFor(steps, SEATS);

  it('starts the steps before any other rule, ahead of the turn', () => {
    expect(flow.triggers!.map((t) => t.id).slice(0, 2)).toEqual(['the steps before the score start', 'a turn starts']);
    expect(flow.triggers![0]).toEqual({
      id: 'the steps before the score start', when: { name: 'lang:end-steps-due' }, then: [{ name: 'lang:end-steps-start' }],
    });
  });
  it('ends once the steps are done', () => {
    expect(flow.end).toEqual([
      { when: { name: 'lang:end-when', params: { when: steps.end!.when, rules: [], afterSteps: true } }, result: 'lang:result' },
    ]);
  });
});

describe('the flow of a game without steps before the score (guard)', () => {
  /** runtime.test.ts's ENDING: ROUNDS_GAME whose End waits for the round once the done pile has a card. */
  const ENDING = ROUNDS_GAME.replace('  The game ends when the pile is empty.\n  The highest score wins.', [
    '  The game ends when the done pile is not empty and the round is finished.',
    '  Each player scores 1 point for every 2 coins.',
    '  The highest score wins, and tied players share the win.',
  ].join('\n'));

  it('is the same as before', () => {
    const ending = compiled(ENDING);
    const flow = flowDefFor(ending, SEATS);
    expect(flow.triggers!.map((t) => t.id)).toEqual([
      'a turn starts', 'line 26: When the done pile has more than 2 cards', 'line 50: When their list has fewer than 2 cards',
    ]);
    expect(flow.end).toEqual([{ when: { name: 'lang:cond', params: ending.end!.when }, result: 'lang:result' }]);
  });
  it.each([['Hearts', HEARTS], ['Rent Day', RENT_DAY]])('is the same as before for %s', (_name, text) => {
    const game = compiled(text);
    const flow = flowDefFor(game, seatsFor(game.players.min));
    expect((flow.triggers ?? []).map((t) => t.id)).not.toContain('the steps before the score start');
    expect(JSON.stringify(flow.end)).not.toContain('afterSteps');
  });
});

describe('the steps before the score', () => {
  it('start once the game is decided, from the start player, and no turn or round starts', () => {
    const engine = table();
    round(engine);
    const state = engine.getState();
    expect(state.turn).toEqual({ current: 'p0', phase: 'final count' });
    expect([state.data[END_STEPS_KEY], state.data[ROUND_KEY]]).toEqual(['p0', 1]);
    expect(doneOf(state)).toBe(1);
    // 1 as each turn started and 1 from tidying; p0 has 1 more from the step's start line.
    expect(coinsOf(state)).toEqual([3, 2, 2]);
    expect(state.result).toBeUndefined();
  });

  it('pass to the left, each starting with its start line, and the game is scored after the last', () => {
    const engine = table();
    round(engine);
    expect(engine.dispatch({ type: 'count', by: 'p1' }).reason).toBe("not p1's turn");
    press(engine, 'count', 'p0');
    expect(engine.getState().turn?.current).toBe('p1');
    expect(coinsOf(engine.getState())).toEqual([5, 3, 2]);
    press(engine, 'count', 'p1', 'p2');
    const state = engine.getState();
    expect(state.result).toEqual({ scores: { p0: 2, p1: 2, p2: 2 }, winner: 'p0', winners: ['p0', 'p1', 'p2'] });
    expect(state.data[END_STEPS_KEY]).toBe(true);
    expect(coinsOf(state)).toEqual([5, 5, 5]);
    expect(state.data[ROUND_KEY]).toBe(1);
  });

  it('pass on by a rule of the phase', () => {
    const engine = table(steps, withCoins(9, 'p1'));
    round(engine);
    press(engine, 'count', 'p0');
    const state = engine.getState();
    // p1's start line took them to 12, and the rule passed the step on to p2 at once.
    expect(state.turn?.current).toBe('p2');
    expect(coinsOf(state)).toEqual([5, 12, 3]);
  });

  it('may all pass at once, and the game ends with the round', () => {
    const engine = table(steps, withCoins(9, 'p0', 'p1', 'p2'));
    round(engine);
    const state = engine.getState();
    expect(coinsOf(state)).toEqual([12, 12, 12]);
    expect(state.result).toEqual({ scores: { p0: 6, p1: 6, p2: 6 }, winner: 'p0', winners: ['p0', 'p1', 'p2'] });
    expect(state.data[ROUND_KEY]).toBe(1);
  });

  it('skip a seat that is out', () => {
    const engine = table(steps, (state) => markOut(state, 'p1'));
    press(engine, 'stop', 'p0', 'p2');
    press(engine, 'count', 'p0');
    expect(engine.getState().turn?.current).toBe('p2');
    expect(coinsOf(engine.getState())[1]).toBe(0);
    press(engine, 'count', 'p2');
    expect(engine.getState().result).toBeDefined();
  });

  it('end when the first seat goes out after its step, at the seat that already had one (P4)', () => {
    const engine = table();
    round(engine);
    press(engine, 'count', 'p0');
    const resumed = resume(engine, (state) => markOut(state, 'p0'));
    press(resumed, 'count', 'p1');
    expect(resumed.getState().turn?.current).toBe('p2');
    // The next seat still in after p2 is p1, which has had its step.
    press(resumed, 'count', 'p2');
    const state = resumed.getState();
    expect(state.data[END_STEPS_KEY]).toBe(true);
    expect(state.result).toBeDefined();
  });

  it('end after the last step though a step made the End condition false: it is not asked again (P1)', () => {
    const moving = compiled(STEPS_GAME.replace(STEP_STARTS, STEP_STARTS.replace('They get 1 coin.', 'Move the done pile to the pile.')));
    const engine = table(moving);
    round(engine);
    expect(doneOf(engine.getState())).toBe(0);
    press(engine, 'count', 'p0', 'p1', 'p2');
    const state = engine.getState();
    expect(state.data[END_STEPS_KEY]).toBe(true);
    expect(state.result).toEqual({ scores: { p0: 2, p1: 2, p2: 2 }, winner: 'p0', winners: ['p0', 'p1', 'p2'] });
  });

  it('are passed on only by their own words, not by passing the turn (P1)', () => {
    const PASS = '      The turn passes to the left.';
    const text = STEPS_GAME.replace(
      '      They get 2 coins.\n      The final count passes to the left.', `      They get 2 coins.\n${PASS}`,
    );
    const engine = table(compiled(text));
    round(engine);
    const before = engine.getState();
    const error = thrown(() => engine.dispatch({ type: 'count', by: 'p0' }));
    expect(error).toBeInstanceOf(RuleError);
    expect(error).toMatchObject({
      message: 'The turn does not pass while the players take the final count before the score: write “The final count passes to the left.” instead.',
      line: lineOf(text, PASS),
    });
    expect(engine.getState()).toBe(before);
  });

  it('are passed on only while they run', () => {
    const PASS = '      The final count passes to the left.';
    const text = STEPS_GAME.replace(
      '  A player may stop.\n    Then:\n      Their moves go back to 0.', `  A player may stop.\n    Then:\n      Their moves go back to 0.\n${PASS}`,
    );
    const engine = table(compiled(text));
    const before = engine.getState();
    const error = thrown(() => engine.dispatch({ type: 'stop', by: 'p0' }));
    expect(error).toBeInstanceOf(RuleError);
    // The first such line is working's.
    expect(error).toMatchObject({
      message: 'The final count passes to the left only while the players take it before the score.', line: lineOf(text, PASS),
    });
    expect(engine.getState()).toBe(before);
  });

  it('replay and undo like any other press', () => {
    const engine = table();
    round(engine);
    press(engine, 'count', 'p0', 'p1');
    const replayed = table();
    replayed.loadLog([...engine.getLog()]);
    expect(replayed.getState()).toEqual(engine.getState());
    engine.undo();
    const state = engine.getState();
    expect(state.turn?.current).toBe('p1');
    expect(coinsOf(state)).toEqual([5, 3, 2]);
  });

  it('take no press once the game is over', () => {
    const engine = table();
    round(engine);
    press(engine, 'count', 'p0', 'p1', 'p2');
    expect(engine.dispatch({ type: 'count', by: 'p0' }).reason).toBe('game is over');
  });

  it('are forgotten with the turn markers', () => {
    const state = table().getState();
    const marked: GameState = { ...state, data: { ...state.data, [END_STEPS_KEY]: 'p0' } };
    expect(clearTurnMarkers(marked).data).not.toHaveProperty(END_STEPS_KEY);
  });

  it('are reached by an example through the round end', () => {
    const EXAMPLE = [
      'Example: everyone counts before the score, from the start player',
      '  Given 3 players', '  And the done pile has a Sweep', "  And it is p2's turn",
      '  When p2 stops', '  Then the phase is final count', "  And it is p0's turn",
      '  When p0 counts', "  Then it is p1's turn",
      '  When p1 counts', '  And p2 counts', '  Then the game is over', '  And p2 wins',
    ].join('\n');
    expect(runExamples(compiled(`${STEPS_GAME}\n\n${EXAMPLE}`), lib)).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
  });
});
