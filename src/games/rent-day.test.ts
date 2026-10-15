import { describe, expect, it } from 'vitest';
import RENT_DAY from './rent-day.rules?raw';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { runExamples } from '@/engine/core/lang/examples';
import { createEngine, initialState, seatsFor } from '@/engine/core/lang/build';
import { counterOf, isOut, latestRoll, ownerOf, pieceAt, playersIn } from '@/engine/core/lang/board-state';
import type { GameEngine } from '@/engine/core/game-engine';
import type { GameState } from '@/engine/core/game-state';
import type { Move } from '@/engine/core/moves';
import type { PlayerId } from '@/engine/core/scene';

const lib = createDefaultLibrary();
const { game, diagnostics } = compileGame(RENT_DAY, lib);
const SPACES = 40;

/** What a test wants to look at around each move the auto-player makes. */
type Watch = (before: GameState, move: Move, after: GameState) => void;

/**
 * One turn of a player who always buys when allowed: roll, buy if they may, then end their turn, unless the roll put
 * them out (the turn has passed already) or ended the game.
 */
function playTurn(engine: GameEngine, watch: Watch = () => {}): void {
  const by = engine.getState().turn!.current;
  const make = (move: Move) => {
    const before = engine.getState();
    const outcome = engine.dispatch(move);
    expect(outcome.ok, `${by} could not ${move.type}: ${outcome.reason}`).toBe(true);
    watch(before, move, engine.getState());
  };
  make({ type: 'roll', by });
  const stillTheirs = () => engine.getState().result === undefined && engine.getState().turn!.current === by;
  if (!stillTheirs()) return;
  if (engine.canDispatch({ type: 'buy', by }) === true) make({ type: 'buy', by });
  make({ type: 'end', by });
}

const totalMoney = (state: GameState, seats: PlayerId[]) => seats.reduce((sum, seat) => sum + counterOf(state, 'money', seat), 0);

describe('Rent Day (designer language)', () => {
  it('compiles with no diagnostics', () => expect(diagnostics).toEqual([]));

  it('has the 40 spaces of the table, starting at Go', () => {
    const spaces = game!.board!.spaces;
    expect(spaces).toHaveLength(SPACES);
    expect(spaces[0]).toEqual({ name: 'Go', attrs: { kind: 'go' } });
    expect(spaces[39]).toEqual({ name: 'The Promenade', attrs: { kind: 'street', color: 'dark blue', price: 400, rent: 50 } });
  });

  it('passes every example', () => {
    const results = runExamples(game!, lib);
    expect(results).toHaveLength(16);
    expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
  });

  it.each([2, 3, 4, 5, 6, 7, 8])('plays 60 rounds at %i players without breaking a rule of money', (n) => {
    const { engine } = createEngine(game!, lib, n, initialState(game!, 200 + n));
    const seats = seatsFor(n);
    const { spaces } = game!.board!;

    // Money only comes in through Go and only leaves through tax and purchases; rent moves it between players.
    const watch: Watch = (before, move, after) => {
      const by = move.by as PlayerId;
      const change = totalMoney(after, seats) - totalMoney(before, seats);
      if (move.type === 'roll') {
        const from = pieceAt(before, by)!;
        const roll = latestRoll(after)!;
        expect(roll).toHaveLength(2);
        expect(roll.every((face) => Number.isInteger(face) && face >= 1 && face <= 6)).toBe(true);
        const to = from + roll[0] + roll[1];
        const landed = spaces[to % SPACES].attrs;
        const salary = to >= SPACES ? 200 : 0;
        const tax = landed.kind === 'tax' ? (landed.tax as number) : 0;
        expect(change, `${by} rolled ${roll} from space ${from}`).toBe(salary - tax);
        if (!isOut(after, by)) expect(pieceAt(after, by)).toBe(to % SPACES);

        // Rent only moves money from the mover to the owner of the space they landed on.
        const owner = ownerOf(before, to % SPACES);
        const charged = owner !== null && owner !== by;
        const rent = !charged ? 0
          : landed.kind === 'utility' ? 4 * (roll[0] + roll[1])
            : landed.kind === 'street' || landed.kind === 'station' ? (landed.rent as number) : 0;
        for (const seat of seats) {
          const expected = seat === by ? salary - tax - rent : seat === owner ? rent : 0;
          const got = counterOf(after, 'money', seat) - counterOf(before, 'money', seat);
          expect(got, `${seat}'s money after ${by} rolled ${roll} from space ${from}`).toBe(expected);
        }
      } else if (move.type === 'buy') {
        const at = pieceAt(before, by)!;
        expect(change).toBe(-(spaces[at].attrs.price as number));
        expect(ownerOf(after, at)).toBe(by);
      } else {
        expect(change).toBe(0);
      }

      for (let space = 0; space < SPACES; space++) {
        const owner = ownerOf(after, space);
        if (owner !== null) expect(isOut(after, owner), `${owner} is out but owns space ${space}`).toBe(false);
      }
      expect(isOut(after, after.turn!.current)).toBe(false);
      for (const seat of seats) {
        if (isOut(after, seat)) expect(pieceAt(after, seat)).toBeNull();
        else expect(pieceAt(after, seat)).not.toBeNull();
      }
    };

    let turns = 0;
    for (; turns < 60 * n && engine.getState().result === undefined; turns++) playTurn(engine, watch);
    // Sixty rounds were played, or the game came to an end with one player left.
    if (turns < 60 * n) expect(playersIn(engine.getState(), seats)).toHaveLength(1);
  });

  it.each([[2, 1], [4, 2], [8, 3]])('a game with little money and no Go salary ends with a winner at %i players (seed %i)', (n, seed) => {
    const salary = '  When a piece passes Go:\n    Its player gets 200 money.\n';
    expect(RENT_DAY).toContain('Each player has 1500 money');
    expect(RENT_DAY).toContain(salary);
    // Without a Go salary money only leaves the table (taxes and purchases), so someone always runs out in the end.
    const lean = RENT_DAY.replace('Each player has 1500 money', 'Each player has 300 money').replace(salary, '');
    const compiled = compileGame(lean, lib);
    expect(compiled.diagnostics).toEqual([]);
    const g = compiled.game!;
    const { engine } = createEngine(g, lib, n, initialState(g, seed));
    for (let turns = 0; turns < 20000 && engine.getState().result === undefined; turns++) playTurn(engine);
    const winner = (engine.getState().result as { winner: string }).winner;
    expect(playersIn(engine.getState(), seatsFor(n))).toEqual([winner]);
  });

  it('undo takes back every move, and the log rebuilds the same game', () => {
    const fresh = () => createEngine(game!, lib, 4, initialState(game!, 42)).engine;
    const engine = fresh();
    const states = [engine.getState()];
    for (let turn = 0; turn < 40 && engine.getState().result === undefined; turn++) {
      playTurn(engine, (_before, _move, after) => states.push(after));
    }
    const log = [...engine.getLog()];
    expect(log.length).toBe(states.length - 1);
    expect(log.length).toBeGreaterThanOrEqual(80);
    expect(log.some((move) => move.type === 'buy')).toBe(true);

    // The same moves from the same seed roll the same dice and fire the same moments.
    const replayed = fresh();
    replayed.loadLog(log);
    expect(replayed.getState()).toEqual(engine.getState());

    for (let i = states.length - 2; i >= 0; i--) {
      engine.undo();
      expect(engine.getState()).toEqual(states[i]);
    }
    expect(engine.getState()).toEqual(fresh().getState());
  });
});
