import { describe, expect, it } from 'vitest';
import RENT_DAY from './rent-day.rules?raw';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { runExamples } from '@/engine/core/lang/examples';
import { createEngine, initialState, seatsFor } from '@/engine/core/lang/build';
import {
  bankOf, counterOf, isOut, latestRoll, ownerOf, pieceAt, playerFact, playersIn, rollsThisTurn, setOwner, setRoll, spaceFact,
  withBoardData,
} from '@/engine/core/lang/board-state';
import { targetCandidates } from '@/engine/core/lang/declared-actions';
import { isDouble } from '@/engine/core/lang/library/board-phrases';
import type { LangRuntime } from '@/engine/core/lang/runtime';
import type { GameEngine } from '@/engine/core/game-engine';
import type { GameState } from '@/engine/core/game-state';
import type { Move } from '@/engine/core/moves';
import type { PlayerId } from '@/engine/core/scene';

const lib = createDefaultLibrary();
const { game, diagnostics } = compileGame(RENT_DAY, lib);
const SPACES = 40;
// A button's move type is its whole wording.
const ROLL = 'roll the dice';
const BUY = 'buy the space they are on';
const BUILD = 'build a house on a street they own';
const END = 'end their turn';
const PAY = 'pay to leave jail';
const ROLL_FOR_DOUBLE = 'roll for a double';
/** Where Jail and Go To Jail are on the board, and what leaving jail costs. */
const JAIL = 10;
const GO_TO_JAIL = 30;
const FINE = 50;
/** What the bank starts with, which the board and the bank always add up to between them. */
const HOUSES = 32;
const HOTELS = 12;
/** A hotel counts as this many buildings when a street's buildings are compared, so a hotel is one more than four houses. */
const HOTEL_WORTH = 5;

/** An engine and the runtime behind it: the auto-player asks the runtime which streets the build button may pick. */
type Table = { engine: GameEngine; runtime: LangRuntime };

/** What a test wants to look at around each move the auto-player makes. */
type Watch = (before: GameState, move: Move, after: GameState) => void;

const housesOn = (state: GameState, space: number): number => (spaceFact(state, space, 'houses') ?? 0) as number;
const hasHotel = (state: GameState, space: number): boolean => spaceFact(state, space, 'hotel') === true;
const buildingsOn = (state: GameState, space: number): number => housesOn(state, space) + (hasHotel(state, space) ? HOTEL_WORTH : 0);
const inJail = (state: GameState, seat: PlayerId): boolean => playerFact(state, seat, 'in jail') === true;
/** How many rolls for a double the player has failed since going to jail; a player it was never set on has failed none. */
const jailTurns = (state: GameState, seat: PlayerId): number => (playerFact(state, seat, 'jail turns') ?? 0) as number;
const doublesThisTurn = (state: GameState, seat: PlayerId): number => rollsThisTurn(state, seat).filter(isDouble).length;

/** The first street the build button may pick that the move itself accepts, or null when there is none. */
function buildable({ engine, runtime }: Table, by: PlayerId): number | null {
  const action = runtime.game.phases.flatMap((phase) => phase.actions).find((a) => a.words === BUILD);
  if (!action) throw new Error(`The game has no “${BUILD}” button.`);
  // The target phrase lists the streets they own; only the move says which of them the Only if lines allow now.
  const accepts = (target: number) => engine.canDispatch({ type: BUILD, by, target }) === true;
  return targetCandidates(runtime, action, engine.getState(), by).find(accepts) ?? null;
}

/**
 * One turn of a player who always buys and builds when allowed. In jail, an even seat pays to leave whenever it may; an odd
 * seat never does, so it rolls for a double and sometimes reaches the third failed roll, and every way out of jail comes up
 * even with two players. Then it rolls while it may (a double rolls again, until the third sends it to jail), buying after
 * each roll if it may, builds on the first street it may until it can't, and ends its turn. It stops as soon as a move puts
 * it out (the turn has passed already) or ends the game.
 */
function playTurn(table: Table, watch: Watch = () => {}): void {
  const { engine } = table;
  const by = engine.getState().turn!.current;
  const make = (move: Move) => {
    const before = engine.getState();
    const outcome = engine.dispatch(move);
    expect(outcome.ok, `${by} could not ${move.type}: ${outcome.reason}`).toBe(true);
    watch(before, move, engine.getState());
  };
  const stillTheirs = () => engine.getState().result === undefined && engine.getState().turn!.current === by;
  const may = (type: string) => stillTheirs() && engine.canDispatch({ type, by }) === true;
  const rollWith = (type: string) => {
    make({ type, by });
    if (may(BUY)) make({ type: BUY, by });
  };
  const evenSeat = Number(by.slice(1)) % 2 === 0;
  if (evenSeat && may(PAY)) make({ type: PAY, by });
  if (may(ROLL_FOR_DOUBLE)) rollWith(ROLL_FOR_DOUBLE);
  while (may(ROLL)) rollWith(ROLL);
  if (!stillTheirs()) return;
  for (let target = buildable(table, by); target !== null; target = buildable(table, by)) make({ type: BUILD, by, target });
  make({ type: END, by });
}

/** Plays turns until someone wins or `turns` have been played; how many were played. */
function playUpTo(table: Table, turns: number, watch?: Watch): number {
  let played = 0;
  for (; played < turns && table.engine.getState().result === undefined; played++) playTurn(table, watch);
  return played;
}

const totalMoney = (state: GameState, seats: PlayerId[]) => seats.reduce((sum, seat) => sum + counterOf(state, 'money', seat), 0);

/**
 * The rules of money, of the bank and of jail, checked around every move. Money only comes in through Go and only leaves
 * through tax, purchases, building and leaving jail; rent moves it between players. Houses and hotels only move between the
 * bank and the board. A player in jail is on Jail, and only a player in jail has jail turns, never more than two.
 */
function keepsTheRules(runtime: LangRuntime, seats: PlayerId[]): Watch {
  const { spaces } = runtime.game.board!;

  /** Each seat's money changed by what `moved` says for it, and nobody else's changed at all. */
  const moneyMoves = (before: GameState, after: GameState, moved: Record<PlayerId, number>, why: string) => {
    for (const seat of seats) {
      const got = counterOf(after, 'money', seat) - counterOf(before, 'money', seat);
      expect(got, `${seat}'s money after ${why}`).toBe(moved[seat] ?? 0);
    }
  };

  /**
   * The mover's piece walked from `from` by the roll the move made: Go's salary on passing it, the tax of the space it lands
   * on or its rent to the owner, and on top a fine to the bank. Go To Jail has no tax and no owner, and no walk onto it passes
   * Go, so landing there pays nothing; it sends the piece straight to Jail and the player into jail.
   */
  const walks = (before: GameState, after: GameState, by: PlayerId, from: number, fine: number) => {
    const roll = latestRoll(after)!;
    const to = from + roll[0] + roll[1];
    const at = to % SPACES;
    const landed = spaces[at].attrs;
    const salary = to >= SPACES ? 200 : 0;
    const tax = landed.kind === 'tax' ? (landed.tax as number) : 0;
    // Rent only moves money from the mover to the owner of the space they landed on, as much as the Rent: section says.
    const owner = ownerOf(before, at);
    const charged = owner !== null && owner !== by;
    const rent = charged ? runtime.columnValue(setRoll(before, roll), at, 'rent')! : 0;
    const moved: Record<PlayerId, number> = { [by]: salary - tax - rent - fine };
    if (charged) moved[owner] = rent;
    moneyMoves(before, after, moved, `${by} rolled ${roll} from space ${from}`);
    if (isOut(after, by)) return;
    const sent = at === GO_TO_JAIL;
    expect(pieceAt(after, by), `${by}'s piece after rolling ${roll} from space ${from}`).toBe(sent ? JAIL : at);
    expect(inJail(after, by), `${by} in jail after rolling ${roll} from space ${from}`).toBe(sent);
  };

  return (before, move, after) => {
    const by = move.by as PlayerId;
    const change = totalMoney(after, seats) - totalMoney(before, seats);
    if (move.type === ROLL || move.type === ROLL_FOR_DOUBLE) {
      const roll = latestRoll(after)!;
      expect(roll).toHaveLength(2);
      expect(roll.every((face) => Number.isInteger(face) && face >= 1 && face <= 6)).toBe(true);
    }
    if (move.type === ROLL && doublesThisTurn(after, by) === 3) {
      // The third double moves nothing and pays nothing: the piece goes straight to Jail.
      moneyMoves(before, after, {}, `${by} rolled a third double`);
      expect(pieceAt(after, by)).toBe(JAIL);
      expect(inJail(after, by)).toBe(true);
    } else if (move.type === ROLL) {
      walks(before, after, by, pieceAt(before, by)!, 0);
    } else if (move.type === ROLL_FOR_DOUBLE) {
      expect(inJail(before, by), `${by} rolled for a double out of jail`).toBe(true);
      expect(pieceAt(before, by)).toBe(JAIL);
      const roll = latestRoll(after)!;
      // A double lets them out at no cost, and the third failed roll lets them out for the fine; either way they walk from Jail.
      if (isDouble(roll)) walks(before, after, by, JAIL, 0);
      else if (jailTurns(before, by) === 2) walks(before, after, by, JAIL, FINE);
      else {
        moneyMoves(before, after, {}, `${by} failed to roll a double with ${roll}`);
        expect(pieceAt(after, by)).toBe(JAIL);
        expect(inJail(after, by)).toBe(true);
        expect(jailTurns(after, by)).toBe(jailTurns(before, by) + 1);
      }
    } else if (move.type === PAY) {
      moneyMoves(before, after, { [by]: -FINE }, `${by} paid to leave jail`);
      expect(inJail(after, by)).toBe(false);
      expect(jailTurns(after, by)).toBe(0);
    } else if (move.type === BUY) {
      const at = pieceAt(before, by)!;
      expect(change).toBe(-(spaces[at].attrs.price as number));
      expect(ownerOf(after, at)).toBe(by);
    } else if (move.type === BUILD) {
      // One more building on the street they picked: a house, or a hotel in place of its four houses.
      const at = move.target as number;
      expect(change, `${by} built on ${spaces[at].name}`).toBe(-(spaces[at].attrs['house price'] as number));
      expect(ownerOf(after, at)).toBe(by);
      expect(buildingsOn(after, at)).toBe(buildingsOn(before, at) + 1);
    } else {
      expect(change).toBe(0);
    }

    let houses = 0;
    let hotels = 0;
    for (let space = 0; space < SPACES; space++) {
      const owner = ownerOf(after, space);
      if (owner !== null) expect(isOut(after, owner), `${owner} is out but owns space ${space}`).toBe(false);
      const built = housesOn(after, space);
      expect(built >= 0 && built <= 4 && !(built > 0 && hasHotel(after, space)), `${spaces[space].name} has ${built} houses`).toBe(true);
      if (buildingsOn(after, space) > 0) expect(owner, `${spaces[space].name} has buildings but no owner`).not.toBeNull();
      houses += built;
      hotels += hasHotel(after, space) ? 1 : 0;
    }
    expect(houses + bankOf(after, 'houses'), `houses on the board and in the bank after ${by} ${move.type}`).toBe(HOUSES);
    expect(hotels + bankOf(after, 'hotels'), `hotels on the board and in the bank after ${by} ${move.type}`).toBe(HOTELS);
    expect(bankOf(after, 'houses')).toBeGreaterThanOrEqual(0);
    expect(bankOf(after, 'hotels')).toBeGreaterThanOrEqual(0);

    expect(isOut(after, after.turn!.current)).toBe(false);
    for (const seat of seats) {
      if (isOut(after, seat)) expect(pieceAt(after, seat)).toBeNull();
      else expect(pieceAt(after, seat)).not.toBeNull();
    }

    for (const seat of playersIn(after, seats)) {
      if (inJail(after, seat)) expect(pieceAt(after, seat), `${seat} is in jail but not on Jail`).toBe(JAIL);
      else expect(jailTurns(after, seat), `${seat} has jail turns out of jail`).toBe(0);
      expect(jailTurns(after, seat)).toBeLessThanOrEqual(2);
    }
  };
}

/** The colors of the streets, in the order the board first reaches them. */
function colorsInBoardOrder(): string[] {
  const colors = game!.board!.spaces.filter((space) => space.attrs.kind === 'street').map((space) => space.attrs.color as string);
  return [...new Set(colors)];
}

describe('Rent Day (designer language)', () => {
  it('compiles with no diagnostics', () => expect(diagnostics).toEqual([]));

  it('has the 40 spaces of the table, starting at Go', () => {
    const spaces = game!.board!.spaces;
    expect(spaces).toHaveLength(SPACES);
    expect(spaces[0]).toEqual({ name: 'Go', attrs: { kind: 'go' } });
    expect(spaces[39]).toEqual({
      name: 'The Promenade',
      attrs: {
        kind: 'street', color: 'dark blue', price: 400, 'house price': 200, rent: 50,
        '1 house': 200, '2 houses': 600, '3 houses': 1400, '4 houses': 1700, 'with hotel': 2000,
      },
    });
    // A station's and a utility's rent comes from the Rent: section alone.
    expect(spaces[5]).toEqual({ name: 'North Station', attrs: { kind: 'station', price: 200 } });
    expect(spaces[12]).toEqual({ name: 'Power Works', attrs: { kind: 'utility', price: 150 } });
  });

  it('starts with a bank of 32 houses and 12 hotels', () => {
    const { engine } = createEngine(game!, lib, 2, initialState(game!, 1));
    expect(bankOf(engine.getState(), 'houses')).toBe(HOUSES);
    expect(bankOf(engine.getState(), 'hotels')).toBe(HOTELS);
  });

  it('passes every example', () => {
    const results = runExamples(game!, lib);
    expect(results).toHaveLength(45);
    expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
  });

  it.each([2, 3, 4, 5, 6, 7, 8])('plays 60 rounds at %i players without breaking a rule of money or of the bank', (n) => {
    const table = createEngine(game!, lib, n, initialState(game!, 200 + n));
    const seats = seatsFor(n);
    const turns = playUpTo(table, 60 * n, keepsTheRules(table.runtime, seats));
    // Sixty rounds were played, or the game came to an end with one player left.
    if (turns < 60 * n) expect(playersIn(table.engine.getState(), seats)).toHaveLength(1);
  }, 30_000);

  it('ends 2-player games on its own: at least 9 of the seeds 1 to 10 reach a winner within 3000 turns, going in and out of jail every way', () => {
    const seats = seatsFor(2);
    const unfinished: number[] = [];
    // How many times, across the ten games, a player went into or out of jail each way.
    const jail = {
      'sent to jail by a third double': 0,
      'sent to jail by landing on Go To Jail': 0,
      'paid to leave jail': 0,
      'freed by a double': 0,
      'let out after a third failed roll': 0,
    };
    for (let seed = 1; seed <= 10; seed++) {
      const table = createEngine(game!, lib, 2, initialState(game!, seed));
      const rules = keepsTheRules(table.runtime, seats);
      playUpTo(table, 3000, (before, move, after) => {
        rules(before, move, after);
        const by = move.by as PlayerId;
        if (move.type === ROLL && !inJail(before, by) && inJail(after, by)) {
          jail[doublesThisTurn(after, by) === 3 ? 'sent to jail by a third double' : 'sent to jail by landing on Go To Jail']++;
        } else if (move.type === PAY) {
          jail['paid to leave jail']++;
        } else if (move.type === ROLL_FOR_DOUBLE && isDouble(latestRoll(after)!)) {
          jail['freed by a double']++;
        } else if (move.type === ROLL_FOR_DOUBLE && jailTurns(before, by) === 2) {
          jail['let out after a third failed roll']++;
        }
      });
      const { result } = table.engine.getState();
      if (result === undefined) {
        unfinished.push(seed);
        continue;
      }
      expect(playersIn(table.engine.getState(), seats)).toEqual([(result as { winner: string }).winner]);
    }
    expect(unfinished.length, `seeds with no winner after 3000 turns: ${unfinished.join(', ')}`).toBeLessThanOrEqual(1);
    for (const [way, times] of Object.entries(jail)) expect(times, `times a player was ${way}`).toBeGreaterThan(0);
  }, 60_000);

  it.each([[4, 1], [4, 2], [4, 3], [8, 1], [8, 2], [8, 3]])(
    'ends a %i-player game where every player starts with a full color set (seed %i)',
    (n, seed) => {
      const seats = seatsFor(n);
      const colors = colorsInBoardOrder();
      const { spaces } = game!.board!;
      // Seat i owns every street of the i-th color before anyone moves.
      const dealt = spaces.reduce(
        (state, space, at) => {
          const seat = colors.indexOf(space.attrs.color as string);
          return space.attrs.kind === 'street' && seat < n ? setOwner(state, at, seats[seat]) : state;
        },
        withBoardData(initialState(game!, seed), game!, seats),
      );
      const table = createEngine(game!, lib, n, dealt);
      const rules = keepsTheRules(table.runtime, seats);
      let hotelsBuilt = 0;
      let outHoldingBuildings = 0;
      const turns = playUpTo(table, 5000, (before, move, after) => {
        rules(before, move, after);
        if (move.type === BUILD && !hasHotel(before, move.target as number) && hasHotel(after, move.target as number)) hotelsBuilt++;
        const holdsBuildings = (seat: PlayerId) => spaces.some((_, at) => ownerOf(before, at) === seat && buildingsOn(before, at) > 0);
        outHoldingBuildings += seats.filter((seat) => !isOut(before, seat) && isOut(after, seat) && holdsBuildings(seat)).length;
      });
      const { result } = table.engine.getState();
      expect(result, `no winner after ${turns} turns`).toBeDefined();
      expect(playersIn(table.engine.getState(), seats)).toEqual([(result as { winner: string }).winner]);
      // The bank's rules were checked where they matter: a hotel took the place of four houses, and a player went out holding buildings.
      expect(hotelsBuilt).toBeGreaterThan(0);
      expect(outHoldingBuildings).toBeGreaterThan(0);
    },
    60_000,
  );

  it.each([[2, 1], [4, 2], [8, 3]])('a game with little money and no Go salary ends with a winner at %i players (seed %i)', (n, seed) => {
    const salary = '  When a piece passes Go:\n    Its player gets 200 money.\n';
    expect(RENT_DAY).toContain('Each player has 1500 money');
    expect(RENT_DAY).toContain(salary);
    // Without a Go salary money only leaves the table (taxes, purchases and building), so someone always runs out in the end.
    const lean = RENT_DAY.replace('Each player has 1500 money', 'Each player has 300 money').replace(salary, '');
    const compiled = compileGame(lean, lib);
    expect(compiled.diagnostics).toEqual([]);
    const g = compiled.game!;
    const table = createEngine(g, lib, n, initialState(g, seed));
    playUpTo(table, 20000);
    const winner = (table.engine.getState().result as { winner: string }).winner;
    expect(playersIn(table.engine.getState(), seatsFor(n))).toEqual([winner]);
  });

  it('undo takes back every move, and the log rebuilds the same game', () => {
    const fresh = () => createEngine(game!, lib, 4, initialState(game!, 42));
    const table = fresh();
    const { engine } = table;
    const states = [engine.getState()];
    for (let turn = 0; turn < 40 && engine.getState().result === undefined; turn++) {
      playTurn(table, (_before, _move, after) => states.push(after));
    }
    const log = [...engine.getLog()];
    expect(log.length).toBe(states.length - 1);
    expect(log.length).toBeGreaterThanOrEqual(80);
    expect(log.some((move) => move.type === BUY)).toBe(true);

    // The same moves from the same seed roll the same dice and fire the same moments.
    const replayed = fresh().engine;
    replayed.loadLog(log);
    expect(replayed.getState()).toEqual(engine.getState());

    for (let i = states.length - 2; i >= 0; i--) {
      engine.undo();
      expect(engine.getState()).toEqual(states[i]);
    }
    expect(engine.getState()).toEqual(fresh().engine.getState());
  });
});
