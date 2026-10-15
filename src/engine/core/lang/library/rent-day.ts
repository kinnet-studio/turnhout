import type { GameState } from '../../game-state';
import type { PlayerId } from '../../scene';
import { numberIn } from '../board';
import { ownerOf } from '../board-state';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import type { ColumnFn, ConditionFn, SpaceClass, SpaceSpec } from '../types';
import { rollTotal } from './board-phrases';
import { boardOf, heldBy, isOfKind, ownsSet, setOf } from './fact-phrases';
import { itOf } from './support';

// The phrases only Rent Day needs, worded the way its rules say them: what a space's rent is, and how many buildings a street
// has. This is the one place in the language that knows what a street, a station or a house is; the compiler and the
// runtime only know that a column of the board's table may be redefined by a section of lines like these.

const STREET: SpaceClass = { attribute: 'kind', values: ['street'] };
const STATION: SpaceClass = { attribute: 'kind', values: ['station'] };
const UTILITY: SpaceClass = { attribute: 'kind', values: ['utility'] };

/** What the streets of a set share. */
const COLOR = 'color';
/** A hotel stands for as many buildings as this many houses, when streets are compared by what they have built. */
const HOTEL_WORTH = 5;

/** The table's cell for the buildings a street has, which every street is expected to fill in. */
function cellOf(spec: SpaceSpec, column: string): number {
  const value = numberIn(spec, column);
  if (value === null) throw new RuleError(`${spec.name} has no ${column}.`);
  return value;
}

/** The spaces of a kind, and how many of them the seat owns. */
function ownedOfKind(state: GameState, spaces: SpaceSpec[], kind: SpaceClass, seat: PlayerId): { owned: number; all: number } {
  const ofKind = spaces.flatMap((space, at) => (isOfKind(space, kind) ? [at] : []));
  return { owned: ofKind.filter((at) => ownerOf(state, at) === seat).length, all: ofKind.length };
}

const buildingsOn = (state: GameState, space: number): number =>
  heldBy(state, space, 'houses') + (heldBy(state, space, 'hotel') > 0 ? HOTEL_WORTH : 0);

// ---- rent ------------------------------------------------------------------------------------

/** A street with a hotel charges the table's hotel rent, and one with houses the rent for that many; with neither it keeps what it had. */
const streetRentFollowsBuildings: ColumnFn = (env, _args, value) => {
  const at = itOf(env);
  const spec = boardOf(env).spaces[at];
  if (!isOfKind(spec, STREET)) return value;
  if (heldBy(env.state, at, 'hotel') > 0) return cellOf(spec, 'with hotel');
  const houses = heldBy(env.state, at, 'houses');
  return houses >= 1 ? cellOf(spec, houses === 1 ? '1 house' : `${houses} houses`) : value;
};

/** Only a street with nothing built on it: once it has houses or a hotel, its rent is what they say. */
const fullSetDoublesRent: ColumnFn = (env, _args, value) => {
  const at = itOf(env);
  const { spaces } = boardOf(env);
  const owner = ownerOf(env.state, at);
  if (value === null || owner === null || !isOfKind(spaces[at], STREET)) return value;
  const bare = buildingsOn(env.state, at) === 0;
  return bare && ownsSet(env.state, spaces, at, STREET, COLOR, owner) ? value * 2 : value;
};

/**
 * The two lists go together: the amount at one place is for the number of stations at the same place in the other. Lists
 * that do not are a mistake in the line, said when a station's rent is read; any other space's rent has nothing to do with them.
 */
const stationRentGoesWithCount: ColumnFn = (env, [amounts, counts], value) => {
  const at = itOf(env);
  const { spaces } = boardOf(env);
  if (!isOfKind(spaces[at], STATION)) return value;
  const prices = amounts as number[];
  const numbers = counts as number[];
  if (prices.length !== numbers.length) throw new RuleError("A station's rent needs one amount for each number of stations.");
  const owner = ownerOf(env.state, at);
  if (owner === null) return value;
  const matching = numbers.indexOf(ownedOfKind(env.state, spaces, STATION, owner).owned);
  return matching < 0 ? value : prices[matching];
};

/** "Both" is every utility the board has. */
const utilityRentIsTimesRoll: ColumnFn = (env, [single, both], value) => {
  const at = itOf(env);
  const { spaces } = boardOf(env);
  const owner = ownerOf(env.state, at);
  if (owner === null || !isOfKind(spaces[at], UTILITY)) return value;
  const { owned, all } = ownedOfKind(env.state, spaces, UTILITY, owner);
  return (owned === all ? (both as number) : (single as number)) * rollTotal(env.state);
};

// ---- building --------------------------------------------------------------------------------

/** A street may be built on only while no street of its set has less built than it, so that a set is built up evenly. */
const noFewerBuildings: ConditionFn = (env, [kind, attr]) => {
  const at = itOf(env);
  const have = buildingsOn(env.state, at);
  return setOf(boardOf(env).spaces, at, kind as SpaceClass, attr as string).every((other) => buildingsOn(env.state, other) >= have);
};

/**
 * What Rent Day says about rent, and about building evenly: the lines of its Rent: section, and the one condition that its
 * rule for building a house reads.
 */
export function registerRentDayPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .column("a street's rent depends on its houses and hotel", streetRentFollowsBuildings)
    .column('a street in a full set with no buildings has double rent', fullSetDoublesRent)
    .column("a station's rent is {ints} when its owner has {ints} stations", stationRentGoesWithCount)
    .column("a utility's rent is {int} times the roll, or {int} times when its owner has both", utilityRentIsTimesRoll)
    .condition('no {spacekind} of its {spaceattr} has fewer buildings', noFewerBuildings, { needsSpace: true });
}
