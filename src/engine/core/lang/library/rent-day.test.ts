import { describe, expect, it } from 'vitest';
import type { GameState } from '../../game-state';
import { counterOf, setOwner, setRoll, setSpaceFact } from '../board-state';
import { compileGame } from '../compile';
import { LangRuntime } from '../runtime';
import { fixtureBoardState, runPhrase } from '../testing';
import type { CompiledGame } from '../types';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();

const STATION_LINE = "A station's rent is 25, 50, 100 or 200 when its owner has 1, 2, 3 or 4 stations.";
const UTILITY_LINE = "A utility's rent is 4 times the roll, or 10 times when its owner has both.";

/** Three orange streets, two stations and two utilities; the rent of a station or a utility is left to the Rent: section. */
const text = (stationLine = STATION_LINE) => [
  'Game: Rent Test',
  'Players: 2 to 4',
  '',
  'Board:',
  '  The board is a loop of spaces, starting at Go:',
  '    | space         | kind    | color  | price | house price | rent | 1 house | 2 houses | 3 houses | 4 houses | with hotel |',
  '    | Go            | go      |        |       |             |      |         |          |          |          |            |',
  '    | Rose Lane     | street  | orange | 180   | 100         | 14   | 70      | 200      | 550      | 750      | 950        |',
  '    | North Station | station |        | 200   |             |      |         |          |          |          |            |',
  '    | Lily Lane     | street  | orange | 180   | 100         | 14   | 70      | 200      | 550      | 750      | 950        |',
  '    | Power Works   | utility |        | 150   |             |      |         |          |          |          |            |',
  '    | Iris Road     | street  | orange | 200   | 100         | 16   | 70      | 200      | 550      | 750      | 950        |',
  '    | East Station  | station |        | 200   |             |      |         |          |          |          |            |',
  '    | Pump House    | utility |        | 150   |             |      |         |          |          |          |            |',
  '    | Mill Lane     | street  | brown  | 60    | 50          | 2    | 10      | 30       | 90       | 160      | 250        |',
  '  Each player has a piece that starts on Go.',
  '  Each player has 1500 money that everyone can see.',
  '  Players pay with money.',
  '  There are two six-sided dice.',
  '  Spaces can have houses and a hotel.',
  '  The bank has 32 houses and 12 hotels.',
  '',
  'Rent:',
  "  A street's rent depends on its houses and hotel.",
  '  A street in a full set with no buildings has double rent.',
  `  ${stationLine}`,
  `  ${UTILITY_LINE}`,
  '',
  'Phase: playing',
  '  Players take turns.',
].join('\n');

const lineOf = (source: string, part: string): number => source.split('\n').findIndex((line) => line.includes(part)) + 1;

function compiled(source: string): CompiledGame {
  const { game, diagnostics } = compileGame(source, lib);
  const errors = diagnostics.filter((d) => d.severity === 'error');
  if (!game || errors.length > 0) throw new Error(JSON.stringify(errors));
  return game;
}

const ROSE = 1;
const NORTH = 2;
const LILY = 3;
const POWER = 4;
const IRIS = 5;
const EAST = 6;
const PUMP = 7;
const MILL = 8;
const SEATS = ['p0', 'p1'];

const game = compiled(text());
const runtime = new LangRuntime(game, lib, SEATS);
const fresh = () => fixtureBoardState(game, SEATS);
const owning = (...owned: [space: number, seat: string][]) => owned.reduce((state, [space, seat]) => setOwner(state, space, seat), fresh());
const rentOf = (state: GameState, space: number, runtimeOf = runtime) => runtimeOf.valueOf(state, space, 'rent');
const withHouses = (state: GameState, space: number, n: number) => setSpaceFact(state, space, 'houses', n);
const withHotel = (state: GameState, space: number) => setSpaceFact(state, space, 'hotel', true);
const about = (state: GameState, space: number, player: string | null = 'p1') => runtime.env(state, undefined, undefined, { player, space, card: null });

describe('the Rent: section of Rent Day', () => {
  it('is read with no problems', () => {
    expect(game.columns.rent.map((ref) => ref.kind)).toEqual(['column', 'column', 'column', 'column']);
  });
});

describe('a street’s rent', () => {
  it('is the table’s rent when it is not in a full set and has no buildings', () => {
    expect(rentOf(fresh(), ROSE)).toBe(14);
    expect(rentOf(owning([ROSE, 'p0']), ROSE)).toBe(14);
    expect(rentOf(owning([ROSE, 'p0'], [LILY, 'p0']), ROSE)).toBe(14);
    expect(rentOf(owning([ROSE, 'p0'], [LILY, 'p0'], [IRIS, 'p1']), ROSE)).toBe(14);
  });
  it('doubles when its owner has every street of its color, whichever street it is', () => {
    const all = owning([ROSE, 'p0'], [LILY, 'p0'], [IRIS, 'p0']);
    expect([ROSE, LILY, IRIS].map((space) => rentOf(all, space))).toEqual([28, 28, 32]);
  });
  it('is not doubled for a street no one owns', () => {
    expect(rentOf(fresh(), IRIS)).toBe(16);
  });
  it('follows its houses, and is no longer doubled once it has any', () => {
    const all = owning([ROSE, 'p0'], [LILY, 'p0'], [IRIS, 'p0']);
    expect(rentOf(withHouses(all, ROSE, 1), ROSE)).toBe(70);
    expect(rentOf(withHouses(all, ROSE, 2), ROSE)).toBe(200);
    expect(rentOf(withHouses(all, ROSE, 3), ROSE)).toBe(550);
    expect(rentOf(withHouses(all, ROSE, 4), ROSE)).toBe(750);
    // The other streets of the set stay as they were.
    expect(rentOf(withHouses(all, ROSE, 2), LILY)).toBe(28);
  });
  it('is the hotel’s, whatever else the street has', () => {
    const all = owning([ROSE, 'p0'], [LILY, 'p0'], [IRIS, 'p0']);
    expect(rentOf(withHotel(all, ROSE), ROSE)).toBe(950);
    expect(rentOf(withHotel(withHouses(all, ROSE, 4), ROSE), ROSE)).toBe(950);
    // A hotel that was given back leaves the street with nothing again.
    expect(rentOf(setSpaceFact(withHotel(all, ROSE), ROSE, 'hotel', false), ROSE)).toBe(28);
    expect(rentOf(setSpaceFact(withHouses(all, ROSE, 3), ROSE, 'houses', 0), ROSE)).toBe(28);
  });
  it('says so when the table has no rent for the buildings it has', () => {
    const all = owning([ROSE, 'p0'], [LILY, 'p0'], [IRIS, 'p0']);
    expect(() => rentOf(withHouses(all, ROSE, 5), ROSE)).toThrow('Rose Lane has no 5 houses.');
  });
});

describe('a station’s rent', () => {
  it('goes with how many stations its owner has', () => {
    expect(rentOf(owning([NORTH, 'p0']), NORTH)).toBe(25);
    expect(rentOf(owning([NORTH, 'p0'], [EAST, 'p0']), NORTH)).toBe(50);
    expect(rentOf(owning([NORTH, 'p0'], [EAST, 'p0']), EAST)).toBe(50);
  });
  it('does not count a station someone else owns', () => {
    expect(rentOf(owning([NORTH, 'p0'], [EAST, 'p1']), NORTH)).toBe(25);
  });
  it('is the table’s for a station no one owns', () => {
    expect(rentOf(fresh(), NORTH)).toBeNull();
  });
  it('is the table’s when no amount goes with the number of stations its owner has', () => {
    const only = new LangRuntime(compiled(text("A station's rent is 50 when its owner has 2 stations.")), lib, SEATS);
    expect(rentOf(owning([NORTH, 'p0']), NORTH, only)).toBeNull();
    expect(rentOf(owning([NORTH, 'p0'], [EAST, 'p0']), NORTH, only)).toBe(50);
  });
  it('says so when the line gives different numbers of amounts and of stations', () => {
    const source = text("A station's rent is 25, 50 or 100 when its owner has 1, 2, 3 or 4 stations.");
    const uneven = new LangRuntime(compiled(source), lib, SEATS);
    const attempt = () => rentOf(owning([NORTH, 'p0']), NORTH, uneven);
    expect(attempt).toThrow("A station's rent needs one amount for each number of stations.");
    expect(attempt).toThrow(expect.objectContaining({ line: lineOf(source, "A station's rent") }));
  });
});

describe('a utility’s rent', () => {
  const rolled = (state: GameState) => setRoll(state, [1, 2]);
  it('is its owner’s roll times the first number, or the second when its owner has both', () => {
    expect(rentOf(rolled(owning([POWER, 'p0'])), POWER)).toBe(12);
    expect(rentOf(rolled(owning([POWER, 'p0'], [PUMP, 'p0'])), POWER)).toBe(30);
    expect(rentOf(rolled(owning([POWER, 'p0'], [PUMP, 'p0'])), PUMP)).toBe(30);
  });
  it('does not count a utility someone else owns', () => {
    expect(rentOf(rolled(owning([POWER, 'p0'], [PUMP, 'p1'])), POWER)).toBe(12);
  });
  it('is the table’s for a utility no one owns, and needs no roll for that', () => {
    expect(rentOf(rolled(fresh()), POWER)).toBeNull();
    expect(rentOf(fresh(), POWER)).toBeNull();
  });
  it('needs the dice to have been rolled, and says so on its own line', () => {
    const attempt = () => rentOf(owning([POWER, 'p0']), POWER);
    expect(attempt).toThrow('Nobody has rolled the dice yet.');
    expect(attempt).toThrow(expect.objectContaining({ line: lineOf(text(), "A utility's rent") }));
  });
});

describe('the rent of a space no line covers', () => {
  it('is the table’s cell, which is nothing when it is blank', () => {
    expect(rentOf(fresh(), 0)).toBeNull();
    expect(runtime.valueOf(fresh(), ROSE, 'price')).toBe(180);
    expect(runtime.valueOf(fresh(), ROSE, 'house price')).toBe(100);
    expect(runtime.valueOf(fresh(), ROSE, 'nothing')).toBeNull();
  });
  it('says which cell is not a number', () => {
    expect(() => runtime.valueOf(fresh(), 0, 'kind')).toThrow("Go's kind isn't a number.");
  });
});

describe('what a player pays for a space', () => {
  const money = (state: GameState, seat: string) => counterOf(state, 'money', seat);

  it('is its rent as the Rent: section says it', () => {
    const all = owning([ROSE, 'p0'], [LILY, 'p0'], [IRIS, 'p0']);
    const paid = runPhrase<GameState>(lib, 'effect', 'they pay its rent to its owner', about(withHouses(all, ROSE, 2), ROSE));
    expect([money(paid, 'p0'), money(paid, 'p1')]).toEqual([1700, 1300]);
    const doubled = runPhrase<GameState>(lib, 'effect', 'they pay its rent to its owner', about(all, ROSE));
    expect([money(doubled, 'p0'), money(doubled, 'p1')]).toEqual([1528, 1472]);
  });
  it('is the cell for a detail no section is about', () => {
    const paid = runPhrase<GameState>(lib, 'effect', 'they pay its price', about(fresh(), ROSE));
    expect(money(paid, 'p1')).toBe(1320);
  });
  it('is the Rent: section’s even for a space whose cell is blank', () => {
    const paid = runPhrase<GameState>(lib, 'effect', 'they pay its rent to its owner', about(owning([NORTH, 'p0'], [EAST, 'p0']), NORTH));
    expect([money(paid, 'p0'), money(paid, 'p1')]).toEqual([1550, 1450]);
  });
  it('says so when there is no rent at all', () => {
    expect(() => runPhrase(lib, 'effect', 'they pay its rent to its owner', about(owning([0, 'p0']), 0))).toThrow('Go has no rent.');
  });
});

describe('no street of its color has fewer buildings', () => {
  const COLOR = 'no street of its color has fewer buildings';
  const holds = (state: GameState, space: number) => runPhrase<boolean>(lib, 'condition', COLOR, about(state, space));

  it('is false for a street while another of its color has fewer', () => {
    expect(holds(withHouses(fresh(), ROSE, 1), ROSE)).toBe(false);
  });
  it('is true for the street that has fewest, and for streets that have as many', () => {
    const one = withHouses(fresh(), ROSE, 1);
    expect(holds(one, LILY)).toBe(true);
    expect(holds(fresh(), ROSE)).toBe(true);
    expect(holds(withHouses(withHouses(withHouses(fresh(), ROSE, 1), LILY, 1), IRIS, 1), ROSE)).toBe(true);
  });
  it('counts a hotel as five houses', () => {
    const state = withHouses(withHouses(withHotel(fresh(), ROSE), LILY, 4), IRIS, 4);
    // Four houses are fewer than a hotel, so the streets with houses come first and the one with the hotel waits.
    expect([ROSE, LILY, IRIS].map((space) => holds(state, space))).toEqual([false, true, true]);
    expect(holds(withHouses(state, IRIS, 3), LILY)).toBe(false);
    expect([ROSE, LILY, IRIS].map((space) => holds([ROSE, LILY, IRIS].reduce(withHotel, fresh()), space))).toEqual([true, true, true]);
  });
  it('leaves out the streets of other colors', () => {
    const orange = [ROSE, LILY, IRIS].reduce((state, space) => withHouses(state, space, 1), fresh());
    // Mill Lane is brown and has nothing built, which is no reason for the orange streets to wait.
    expect(holds(orange, ROSE)).toBe(true);
    expect(holds(withHouses(fresh(), MILL, 2), ROSE)).toBe(true);
    expect(holds(withHouses(fresh(), MILL, 2), MILL)).toBe(true);
  });
  it('holds for a space that is in no set', () => {
    expect(holds(withHouses(fresh(), LILY, 2), NORTH)).toBe(true);
  });
  it('is a rule about a space, so the compiler only lets it into one', () => {
    const errorsOf = (source: string) => compileGame(source, lib).diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message]);
    expect(errorsOf(`${text()}\n  A player may roll the dice.\n    Only if ${COLOR}.`)).toEqual([]);
    const setup = text().replace('\nPhase: playing', `\nSetup:\n  If ${COLOR}, roll the dice.\n\nPhase: playing`);
    expect(errorsOf(setup)).toEqual([
      [lineOf(setup, 'If no street'), `“${COLOR}” only makes sense in a rule about a space, such as an action or a “lands on” rule.`],
    ]);
  });
});
