import { describe, expect, it } from 'vitest';
import type { GameState } from '../game-state';
import type { MoveContext } from '../moves';
import { RuleRegistry } from '../rules';
import { counterOf, isOut, markOut, ownerOf, pieceAt, placePiece, queueRoll, setCounter, setOwner, withBoardData } from './board-state';
import { createEngine, initialState } from './build';
import { compileGame } from './compile';
import { declaredActionHandler } from './declared-actions';
import { friendlyError } from './friendly';
import { createDefaultLibrary } from './library';
import { TINY_BOARD } from './testing';

const lib = createDefaultLibrary();
const game = compileGame(TINY_BOARD, lib).game!;
/** A two-player engine whose starting board has been arranged by `arrange`. */
const engineWith = (arrange: (s: GameState) => GameState, g = game) =>
  createEngine(g, lib, 2, arrange(withBoardData(initialState(g, 1), g, ['p0', 'p1']))).engine;

/** TINY_BOARD with its tax rule moving the piece again: from Income Tax, a roll of 4 lands on Income Tax again. */
const LOOPING = TINY_BOARD.replace('  When a player lands on a tax space:\n    They pay its tax.', '  When a player lands on a tax space:\n    Their piece moves forward by the roll.');

describe('button actions on a board', () => {
  it('compiles TINY_BOARD with no diagnostics', () => expect(compileGame(TINY_BOARD, lib).diagnostics).toEqual([]));

  it('starts with every piece on Go and 1500 money each', () => {
    const s = createEngine(game, lib, 2, initialState(game, 1)).engine.getState();
    expect([pieceAt(s, 'p0'), counterOf(s, 'money', 'p1')]).toEqual([0, 1500]);
  });

  it('rolls once per turn, ends the turn, and passes it to the left', () => {
    const engine = engineWith((s) => queueRoll(s, [1, 2]));
    expect(engine.dispatch({ type: 'roll', by: 'p0' }).ok).toBe(true);
    expect(engine.dispatch({ type: 'roll', by: 'p0' })).toMatchObject({ ok: false, reason: 'they have not rolled this turn' });
    expect(engine.dispatch({ type: 'end', by: 'p0' }).ok).toBe(true);
    expect(engine.getState().turn?.current).toBe('p1');
    expect(engine.canDispatch({ type: 'end', by: 'p1' })).toBe('they have rolled this turn');
  });

  it('buys the space a piece is on, after rolling, and charges rent to whoever lands there next', () => {
    const engine = engineWith((s) => queueRoll(queueRoll(s, [1, 2]), [2, 1])); // both go Go → Rose Lane
    engine.dispatch({ type: 'roll', by: 'p0' });
    expect(engine.dispatch({ type: 'buy', by: 'p0' }).ok).toBe(true);
    expect(engine.canDispatch({ type: 'buy', by: 'p0' })).toBe('no one owns it');
    engine.dispatch({ type: 'end', by: 'p0' });
    engine.dispatch({ type: 'roll', by: 'p1' });
    const s = engine.getState();
    expect(ownerOf(s, 3)).toBe('p0');
    expect([counterOf(s, 'money', 'p0'), counterOf(s, 'money', 'p1')]).toEqual([1500 - 180 + 14, 1500 - 14]);
  });

  it('pays 200 once for passing Go and once for landing on it', () => {
    const passing = engineWith((s) => queueRoll(placePiece(s, 'p0', 3), [1, 1])); // 3 → Go → Mill Lane
    passing.dispatch({ type: 'roll', by: 'p0' });
    expect(counterOf(passing.getState(), 'money', 'p0')).toBe(1700);
    const landing = engineWith((s) => queueRoll(placePiece(s, 'p0', 2), [1, 1])); // 2 → Rose Lane → Go
    landing.dispatch({ type: 'roll', by: 'p0' });
    expect(pieceAt(landing.getState(), 'p0')).toBe(0);
    expect(counterOf(landing.getState(), 'money', 'p0')).toBe(1700);
  });

  it('a player who goes below 0 is out, loses their spaces, and the last player left wins', () => {
    const engine = engineWith((s) => queueRoll(setCounter(setOwner(s, 1, 'p0'), 'money', 'p0', 100), [1, 1]));
    engine.dispatch({ type: 'roll', by: 'p0' }); // Go → Income Tax: 100 - 200 < 0
    const s = engine.getState();
    expect(isOut(s, 'p0')).toBe(true);
    expect(pieceAt(s, 'p0')).toBeNull();
    expect(ownerOf(s, 1)).toBeNull();
    expect(s.result).toEqual({ winner: 'p1' });
  });

  it('a player who goes out while two others are still in hands the turn on, and the game goes on', () => {
    const start = withBoardData(initialState(game, 1), game, ['p0', 'p1', 'p2']);
    const { engine } = createEngine(game, lib, 3, queueRoll(setCounter(start, 'money', 'p0', 100), [1, 1]));
    engine.dispatch({ type: 'roll', by: 'p0' });
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
    try { engine.dispatch({ type: 'roll', by: 'p0' }); } catch (e) { thrown = e; }
    expect(friendlyError(thrown)).toMatch(/^Line \d+ \(“When a player lands on a tax space”\): It keeps moving pieces without stopping\.$/);
  });

  it('runs moment rules again once one has kept moving pieces', () => {
    const g = compileGame(LOOPING, lib).game!;
    const start = queueRoll(placePiece(withBoardData(initialState(g, 1), g, ['p0', 'p1']), 'p0', 2), [2, 2]);
    const { engine, runtime } = createEngine(g, lib, 2, start);
    let thrown: unknown;
    try { engine.dispatch({ type: 'roll', by: 'p0' }); } catch (e) { thrown = e; }
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
      engine.dispatch({ type: 'roll', by: cur });
      if (engine.canDispatch({ type: 'buy', by: cur }) === true) engine.dispatch({ type: 'buy', by: cur });
      engine.dispatch({ type: 'end', by: cur });
    }
    const fresh = createEngine(game, lib, 3, initialState(game, 9)).engine;
    fresh.loadLog([...engine.getLog()]);
    expect(fresh.getState()).toEqual(engine.getState());
  });
});

describe('declaredActionHandler', () => {
  const { runtime, tableDef } = createEngine(game, lib, 2, initialState(game, 1));
  const ctx: MoveContext = { tableDef, rules: new RuleRegistry() };
  const roll = declaredActionHandler('roll', runtime);
  const playing = (s: GameState): GameState => ({ ...withBoardData(s, game, ['p0', 'p1']), turn: { current: 'p0', phase: 'playing' } });

  it('refuses an action the phase does not declare', () => {
    const setup: GameState = { ...playing(initialState(game, 1)), turn: { current: 'p0', phase: '__setup' } };
    expect(roll.legal(setup, { type: 'roll', by: 'p0' }, ctx)).toBe("You can't roll now.");
    expect(declaredActionHandler('jump', runtime).legal(playing(initialState(game, 1)), { type: 'jump', by: 'p0' }, ctx)).toBe("You can't jump now.");
  });

  it('refuses a player who is out before asking the Only if lines', () => {
    const out = markOut(playing(initialState(game, 1)), 'p0');
    expect(roll.legal(out, { type: 'roll', by: 'p0' }, ctx)).toBe("You're out of the game.");
  });

  it('will not apply an action that is not allowed', () => {
    const out = markOut(playing(initialState(game, 1)), 'p0');
    expect(() => roll.apply(out, { type: 'roll', by: 'p0' }, ctx)).toThrow(Error);
  });
});
