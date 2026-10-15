import type { GameState } from '../../game-state';
import type { PlayerId } from '../../scene';
import { bankOf, ownerOf, setBank, setSpaceFact, spaceFact } from '../board-state';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import { singularForms } from '../refs';
import type {
  BoardSpec, ConditionFn, DeclareFn, EffectFn, ExpectFn, FactItem, FactSpec, MomentFn, PhraseEnv, SpaceClass, SpaceSpec, TargetFn,
} from '../types';
import { itOf, theyOf } from './support';

/** Every fact in the list, told what it is on. */
const declares = (on: FactSpec['on']): DeclareFn => ([facts]) => (facts as FactItem[]).map((fact) => ({ ...fact, on }));

/** A card that "can be poisoned" has something it is or is not, with no count. */
const cardIs: DeclareFn = ([name]) => [{ name: name as string, on: 'card', kind: 'flag' }];

/**
 * The board a phrase plays on. Each phrase that calls this says `needsBoard`, so the compiler only lets it into a game with
 * one: a missing board is a bug.
 */
export function boardOf(env: PhraseEnv): BoardSpec {
  if (!env.game.board) throw new Error('This phrase needs a board, but this game has none.');
  return env.game.board;
}

/** How many a space holds of a fact: its count, or 1 for a flag that is set. A fact nobody set holds none. */
export function heldBy(state: GameState, space: number, fact: string): number {
  const value = spaceFact(state, space, fact);
  return typeof value === 'number' ? value : value === true ? 1 : 0;
}

/** The fact on spaces that stands for the bank's item of this name: the number of the same name, or else the flag named its singular. */
function factForBank(env: PhraseEnv, name: string): FactItem {
  const onSpaces = env.game.facts.filter((fact) => fact.on === 'space');
  const found = onSpaces.find((fact) => fact.kind === 'number' && fact.name === name)
    ?? onSpaces.find((fact) => fact.kind === 'flag' && singularForms(name).includes(fact.name));
  if (!found) throw new RuleError(`No fact goes with the bank's ${name}.`);
  return found;
}

/** Moves what a space holds of a fact into the bank's item of this name: a count goes to 0 and a flag is cleared. */
function giveBack(state: GameState, space: number, fact: FactItem, bank: string): GameState {
  const returned = setBank(state, bank, bankOf(state, bank) + heldBy(state, space, fact.name));
  return setSpaceFact(returned, space, fact.name, fact.kind === 'flag' ? false : 0);
}

/** "1 token" or "3 tokens": a name the game declares is plural, and of the singulars it may come from, the last has the most taken off. */
function counted(n: number, name: string): string {
  const singulars = singularForms(name);
  return `${n} ${n === 1 && singulars.length > 0 ? singulars[singulars.length - 1] : name}`;
}

const withArticle = (noun: string): string => `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;

const nameOfSpace = (env: PhraseEnv, space: number): string => boardOf(env).spaces[space].name;

// ---- conditions ------------------------------------------------------------------------------

const hasFlag: ConditionFn = (env, [fact]) => spaceFact(env.state, itOf(env), fact as string) === true;

const hasNoFlag: ConditionFn = (env, args) => !hasFlag(env, args);

const hasCount: ConditionFn = (env, [n, fact]) => heldBy(env.state, itOf(env), fact as string) === n;

const hasFewer: ConditionFn = (env, [n, fact]) => heldBy(env.state, itOf(env), fact as string) < (n as number);

const bankHasOne: ConditionFn = (env, [name]) => bankOf(env.state, name as string) > 0;

export const isOfKind = (space: SpaceSpec, kind: SpaceClass): boolean => kind.values.includes(space.attrs[kind.attribute]);

/**
 * A set is the spaces of one kind that share a value in a column with the space `at`. A space with no value in that column
 * is in no set.
 */
export function setOf(spaces: SpaceSpec[], at: number, kind: SpaceClass, attr: string): number[] {
  const shared = spaces[at].attrs[attr];
  if (shared === undefined) return [];
  return spaces.flatMap((space, other) => (isOfKind(space, kind) && space.attrs[attr] === shared ? [other] : []));
}

/** Whether the seat owns every space of the set of `at`; a set of nothing is not owned. */
export function ownsSet(state: GameState, spaces: SpaceSpec[], at: number, kind: SpaceClass, attr: string, seat: PlayerId): boolean {
  const set = setOf(spaces, at, kind, attr);
  return set.length > 0 && set.every((other) => ownerOf(state, other) === seat);
}

const ownsEverySpaceOfSet: ConditionFn = (env, [kind, attr]) =>
  ownsSet(env.state, boardOf(env).spaces, itOf(env), kind as SpaceClass, attr as string, theyOf(env));

// ---- targets: the spaces a button may pick --------------------------------------------------

const ofKind: TargetFn = (env, [kind], space) => isOfKind(boardOf(env).spaces[space], kind as SpaceClass);

const theyOwn: TargetFn = (env, _args, space) => ownerOf(env.state, space) === theyOf(env);

const ofKindTheyOwn: TargetFn = (env, args, space) => ofKind(env, args, space) && theyOwn(env, args, space);

// ---- moments ---------------------------------------------------------------------------------

/** Whatever the space is, so that a rule about owned spaces need not name each kind of them. */
const landsOnSpaceOwnedByOther: MomentFn = (env, _args, moment) => {
  if (moment.kind !== 'land') return false;
  const owner = ownerOf(env.state, moment.space);
  return owner !== null && owner !== moment.seat;
};

// ---- effects ---------------------------------------------------------------------------------

const getsFromBank: EffectFn = (env, [name]) => {
  const bank = name as string;
  const fact = factForBank(env, bank);
  const space = itOf(env);
  // The bank gives a flag once: a second one would be taken from it and lost, and the bank would stay short for good.
  if (fact.kind === 'flag' && heldBy(env.state, space, fact.name) > 0) {
    throw new RuleError(`${nameOfSpace(env, space)} already has ${withArticle(fact.name)}.`);
  }
  const left = bankOf(env.state, bank);
  if (left < 1) throw new RuleError(`The bank has no ${bank} left.`);
  const taken = setBank(env.state, bank, left - 1);
  return setSpaceFact(taken, space, fact.name, fact.kind === 'flag' ? true : heldBy(taken, space, fact.name) + 1);
};

/** A count goes back to the bank's item of the same name; a bank that keeps nothing by that name has nowhere to put it. */
const countGoesBack: EffectFn = (env, [name]) => {
  const fact: FactItem = { name: name as string, kind: 'number' };
  if (!env.game.board?.bank.some((item) => item.name === fact.name)) throw new RuleError(`No bank item goes with the fact ${fact.name}.`);
  return giveBack(env.state, itOf(env), fact, fact.name);
};

/** Every space they own gives back what it holds, a flag that is set counting for 1. */
const theirGoBack: EffectFn = (env, [name]) => {
  const they = theyOf(env);
  const fact = factForBank(env, name as string);
  return boardOf(env).spaces.reduce(
    (state, _space, at) => (ownerOf(state, at) === they ? giveBack(state, at, fact, name as string) : state), env.state,
  );
};

// ---- examples: given ---------------------------------------------------------------------------

// These arrange the table as the example says; whatever the bank would have given is not taken from it.
const spaceHasGiven: EffectFn = (env, [space, n, fact]) => setSpaceFact(env.state, space as number, fact as string, n as number);

const spaceHasFlagGiven: EffectFn = (env, [space, fact]) => setSpaceFact(env.state, space as number, fact as string, true);

const bankHasGiven: EffectFn = (env, [n, name]) => setBank(env.state, name as string, n as number);

// ---- examples: expect --------------------------------------------------------------------------

const spaceHasExpected: ExpectFn = (env, [space, n, fact]) => {
  const have = heldBy(env.state, space as number, fact as string);
  return have === n ? true : `Expected ${nameOfSpace(env, space as number)} to have ${counted(n as number, fact as string)}, but it has ${have}.`;
};

const spaceHasFlagExpected: ExpectFn = (env, [space, fact]) =>
  spaceFact(env.state, space as number, fact as string) === true
    ? true
    : `Expected ${nameOfSpace(env, space as number)} to have ${withArticle(fact as string)}, but it has none.`;

const spaceHasNoFlagExpected: ExpectFn = (env, [space, fact]) =>
  spaceFact(env.state, space as number, fact as string) !== true
    ? true
    : `Expected ${nameOfSpace(env, space as number)} to have no ${fact}, but it has one.`;

const bankHasExpected: ExpectFn = (env, [n, name]) => {
  const have = bankOf(env.state, name as string);
  return have === n ? true : `Expected the bank to have ${counted(n as number, name as string)}, but it has ${have}.`;
};

/**
 * The sentences that say what a game keeps facts about: what a space or a card can have, or be, while the game is played.
 * A plural noun is a count (starting at 0) and “a” or “an” and a noun, or an adjective, is a yes/no (starting at no). Then the
 * sentences that read and change what a space has, and what the bank holds, that ask whether a player owns a whole set, and
 * that say which spaces a button may pick.
 */
export function registerFactPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .declare('spaces can have {factlist}', declares('space'))
    .declare('cards can have {factlist}', declares('card'))
    .declare('cards can be {name}', cardIs)
    .condition('it has a {spaceflag}', hasFlag, { needsSpace: true })
    .condition('it has an {spaceflag}', hasFlag, { needsSpace: true })
    .condition('it has no {spaceflag}', hasNoFlag, { needsSpace: true })
    .condition('it has {int} {spacenumber}', hasCount, { needsSpace: true })
    .condition('it has fewer than {int} {spacenumber}', hasFewer, { needsSpace: true })
    .condition('the bank has a {banked}', bankHasOne)
    .condition('the bank has an {banked}', bankHasOne)
    .condition('they own every {spacekind} of its {spaceattr}', ownsEverySpaceOfSet, { needsPlayer: true, needsSpace: true, needsBoard: true })
    .target('a {spacekind} they own', ofKindTheyOwn, { needsPlayer: true, needsBoard: true })
    .target('an {spacekind} they own', ofKindTheyOwn, { needsPlayer: true, needsBoard: true })
    .target('a {spacekind}', ofKind, { needsBoard: true })
    .target('an {spacekind}', ofKind, { needsBoard: true })
    .target('a space they own', theyOwn, { needsPlayer: true, needsBoard: true })
    .moment('a player lands on a space someone else owns', landsOnSpaceOwnedByOther)
    .effect('it gets a {banked} from the bank', getsFromBank, { needsSpace: true })
    .effect('it gets an {banked} from the bank', getsFromBank, { needsSpace: true })
    .effect('its {spacenumber} go back to the bank', countGoesBack, { needsSpace: true })
    .effect('their {banked} go back to the bank', theirGoBack, { needsPlayer: true, needsBoard: true })
    .given('{space} has {int} {spacenumber}', spaceHasGiven)
    .given('{space} has a {spaceflag}', spaceHasFlagGiven)
    .given('{space} has an {spaceflag}', spaceHasFlagGiven)
    .given('the bank has {int} {banked}', bankHasGiven)
    .expect('{space} has {int} {spacenumber}', spaceHasExpected)
    .expect('{space} has a {spaceflag}', spaceHasFlagExpected)
    .expect('{space} has an {spaceflag}', spaceHasFlagExpected)
    .expect('{space} has no {spaceflag}', spaceHasNoFlagExpected)
    .expect('the bank has {int} {banked}', bankHasExpected);
}
