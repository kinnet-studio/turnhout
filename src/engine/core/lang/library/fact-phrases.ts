import { cardById, zoneCards, type GameState } from '../../game-state';
import type { CardState, PlayerId } from '../../scene';
import { bankOf, ownerOf, setBank, setSpaceFact, spaceFact } from '../board-state';
import { cardAttribute, cardFact, changeCard } from '../card-facts';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import { counted, singularForms } from '../refs';
import type {
  BoardSpec, CardMatch, ConditionFn, DeclareFn, EffectFn, ExpectFn, FactItem, FactSpec, MomentFn, PhraseEnv, SpaceClass, SpaceSpec, TargetFn,
  WhichFn, WinnerFn, ZoneRef,
} from '../types';
import { matchesCard, relocate, resolveZoneIds, zoneIdFor } from '../zones';
import { transfer } from './board-phrases';
import { describeCard } from './example-phrases';
import { cardOf, describeZone, itOf, movedCard, soleZone, theyOf } from './support';

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

const withArticle = (noun: string): string => `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;

const nameOfSpace = (env: PhraseEnv, space: number): string => boardOf(env).spaces[space].name;

// ---- conditions ------------------------------------------------------------------------------

const hasFlag: ConditionFn = (env, [fact]) => spaceFact(env.state, itOf(env), fact as string) === true;

const hasNoFlag: ConditionFn = (env, args) => !hasFlag(env, args);

const hasCount: ConditionFn = (env, [n, fact]) => heldBy(env.state, itOf(env), fact as string) === n;

const hasFewer: ConditionFn = (env, [n, fact]) => heldBy(env.state, itOf(env), fact as string) < (n as number);

const bankHasOne: ConditionFn = (env, [name]) => bankOf(env.state, name as string) > 0;

/** The card a rule about a card is about. */
function itCard(env: PhraseEnv): CardState {
  const id = cardOf(env);
  const card = cardById(env.state, id);
  if (!card) throw new Error(`No card ${id} to judge.`);
  return card;
}

/** A flag on a card is so only when it was set: a card never given it, or given it as no, is not. */
const isFlagged = (card: CardState, fact: string): boolean => cardFact(card, fact) === true;

const itIsFlagged: ConditionFn = (env, [fact]) => isFlagged(itCard(env), fact as string);

const theCardIsFlagged: ConditionFn = (env, [fact]) => isFlagged(movedCard(env), fact as string);

// ---- which: the cards a rule is about ---------------------------------------------------------

/**
 * The cards in every seat's zone of that name that have that much of an attribute: seat by seat, slot by slot. A count the
 * game declares on cards is 0 on a card nothing has changed it on, so such a card is one of those with 0.
 */
const cardsWithNumber: WhichFn = (env, [zone, n, attribute]) =>
  env.seats
    .flatMap((seat) => zoneCards(env.state, zoneIdFor(zone as string, seat)))
    .filter((card) => cardAttribute(card, attribute as string, env.game) === n)
    .map((card) => card.id);

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

/** Pays the bank an amount for every one of a bank item that sits on the spaces they own: a count as many, a flag set as one. */
const paysForEach: EffectFn = (env, [n, name]) => {
  const they = theyOf(env);
  const fact = factForBank(env, name as string);
  const held = boardOf(env).spaces.reduce((sum, _space, at) => (ownerOf(env.state, at) === they ? sum + heldBy(env.state, at, fact.name) : sum), 0);
  return transfer(env, they, null, (n as number) * held);
};

/** Every card in the zones a reference names, zone by zone and slot by slot. */
const cardsInZones = (env: PhraseEnv, ref: ZoneRef): CardState[] => resolveZoneIds(ref, env).flatMap((id) => zoneCards(env.state, id));

/** Its facts go with it: a move only changes where the card is. */
const moveItTo: EffectFn = (env, [zone]) => relocate(env.state, [cardOf(env)], soleZone(zone as ZoneRef, env), env.game);

const everyCardIsFlagged: EffectFn = (env, [zone, fact]) =>
  cardsInZones(env, zone as ZoneRef)
    .filter((card) => !isFlagged(card, fact as string))
    .reduce((state, card) => changeCard(state, card.id, { [fact as string]: true }, env.game), env.state);

/**
 * Changes a number a card has, from what it has now, and refreshes the face with it. A card that has no such number, or whose
 * value is no number, is left as it is; a declared count it was never given is 0 to change from.
 */
function changeNumber(env: PhraseEnv, state: GameState, card: CardState, attribute: string, next: (have: number) => number): GameState {
  const have = cardAttribute(card, attribute, env.game);
  return typeof have === 'number' ? changeCard(state, card.id, { [attribute]: next(have) }, env.game) : state;
}

/** The card the rule is about gains that much of a number it has. */
const itGains: EffectFn = (env, [n, attribute]) => changeNumber(env, env.state, itCard(env), attribute as string, (have) => have + (n as number));

/** Each card with the flag has a number it has changed, whichever way `change` says. */
const eachFlaggedChanges = (change: (have: number, n: number) => number): EffectFn => (env, [fact, zone, n, attribute]) =>
  cardsInZones(env, zone as ZoneRef)
    .filter((card) => isFlagged(card, fact as string))
    .reduce((state, card) => changeNumber(env, state, card, attribute as string, (have) => change(have, n as number)), env.state);

const eachFlaggedGains = eachFlaggedChanges((have, n) => have + n);

/** Down to 0 and no lower, so that a rule about cards at 0 still finds it. */
const eachFlaggedLoses = eachFlaggedChanges((have, n) => Math.max(0, have - n));

// ---- winners -----------------------------------------------------------------------------------

/** The seat with the most cards in its zone of that name; a tie goes to the earliest seat. */
const mostCardsWins: WinnerFn = (env, [zone]) => {
  const count = (seat: PlayerId) => zoneCards(env.state, zoneIdFor(zone as string, seat)).length;
  return env.seats.reduce((best, seat) => (count(seat) > count(best) ? seat : best));
};

// ---- examples: given ---------------------------------------------------------------------------

// These arrange the table as the example says; whatever the bank would have given is not taken from it.
const spaceHasGiven: EffectFn = (env, [space, n, fact]) => setSpaceFact(env.state, space as number, fact as string, n as number);

const spaceHasFlagGiven: EffectFn = (env, [space, fact]) => setSpaceFact(env.state, space as number, fact as string, true);

const bankHasGiven: EffectFn = (env, [n, name]) => setBank(env.state, name as string, n as number);

/** “the Knight” for the match of a card, as an example says it. */
const theCard = (match: CardMatch): string => describeCard(match).replace(/^an? /, 'the ');

/** The first card of the zone, in slot order, that is the named one. */
const namedCardIn = (env: PhraseEnv, match: CardMatch, ref: ZoneRef): CardState | undefined =>
  zoneCards(env.state, soleZone(ref, env)).find((card) => matchesCard(card, match));

/** What an example found instead of the card: “no Viper in p0's camp”. */
const noCardIn = (match: CardMatch, ref: ZoneRef): string => `no ${describeCard(match).replace(/^(?:an?|the) /, '')} in ${describeZone(ref)}`;

const cardInZoneIsGiven: EffectFn = (env, [match, zone, fact]) => {
  const card = namedCardIn(env, match as CardMatch, zone as ZoneRef);
  if (!card) throw new RuleError(`There is ${noCardIn(match as CardMatch, zone as ZoneRef)}.`);
  return changeCard(env.state, card.id, { [fact as string]: true }, env.game);
};

/** Sets the number the first card of the zone that is the named one has, whatever it had. */
const cardInZoneHasGiven: EffectFn = (env, [match, zone, n, attribute]) => {
  const card = namedCardIn(env, match as CardMatch, zone as ZoneRef);
  if (!card) throw new RuleError(`There is ${noCardIn(match as CardMatch, zone as ZoneRef)}.`);
  return changeCard(env.state, card.id, { [attribute as string]: n as number }, env.game);
};

// ---- examples: expect --------------------------------------------------------------------------

/** Whether the named card of the zone has the flag, as wanted; otherwise what an example should say about it. */
const cardInZoneIsExpected = (wanted: boolean): ExpectFn => (env, [match, zone, fact]) => {
  const [named, where] = [match as CardMatch, zone as ZoneRef];
  const card = namedCardIn(env, named, where);
  const expected = `Expected ${theCard(named)} in ${describeZone(where)} ${wanted ? 'to be' : 'not to be'} ${fact}`;
  if (!card) return `${expected}, but there is ${noCardIn(named, where)}.`;
  return isFlagged(card, fact as string) === wanted ? true : `${expected}, but ${wanted ? "it isn't" : 'it is'}.`;
};

const cardInZoneHasExpected: ExpectFn = (env, [match, zone, n, attribute]) => {
  const [named, where] = [match as CardMatch, zone as ZoneRef];
  const card = namedCardIn(env, named, where);
  const expected = `Expected ${theCard(named)} in ${describeZone(where)} to have ${counted(n as number, attribute as string)}`;
  if (!card) return `${expected}, but there is ${noCardIn(named, where)}.`;
  const have = cardAttribute(card, attribute as string, env.game);
  if (have === n) return true;
  return `${expected}, but it has ${typeof have === 'number' ? have : `no ${attribute}`}.`;
};

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
 * that say which spaces a button may pick. And those about cards: which cards a rule is about, whether one has a flag,
 * changing every card of a zone, raising or lowering a number a card has, moving the card a rule is about, and the player
 * with the most cards.
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
    .condition('it is {cardflag}', itIsFlagged, { needsCard: true })
    .condition('the card is {cardflag}', theCardIsFlagged, { needsMove: true })
    .condition('the bank has a {banked}', bankHasOne)
    .condition('the bank has an {banked}', bankHasOne)
    .condition('they own every {spacekind} of its {spaceattr}', ownsEverySpaceOfSet, { needsPlayer: true, needsSpace: true, needsBoard: true })
    .target('a {spacekind} they own', ofKindTheyOwn, { needsPlayer: true, needsBoard: true })
    .target('an {spacekind} they own', ofKindTheyOwn, { needsPlayer: true, needsBoard: true })
    .target('a {spacekind}', ofKind, { needsBoard: true })
    .target('an {spacekind}', ofKind, { needsBoard: true })
    .target('a space they own', theyOwn, { needsPlayer: true, needsBoard: true })
    .moment('a player lands on a space someone else owns', landsOnSpaceOwnedByOther)
    .which('a card in a {perzone} has {int} {attribute}', cardsWithNumber)
    .effect('it gets a {banked} from the bank', getsFromBank, { needsSpace: true })
    .effect('it gets an {banked} from the bank', getsFromBank, { needsSpace: true })
    .effect('its {spacenumber} go back to the bank', countGoesBack, { needsSpace: true })
    .effect('their {banked} go back to the bank', theirGoBack, { needsPlayer: true, needsBoard: true })
    .effect('they pay {int} for each of their {banked}', paysForEach, { needsPlayer: true, needsBoard: true, needsPayment: true })
    .effect('move it to {zone}', moveItTo, { needsCard: true })
    .effect('every card in {zone} is {cardflag}', everyCardIsFlagged)
    .effect('it gains {int} {attribute}', itGains, { needsCard: true })
    .effect('each {cardflag} card in {zone} gains {int} {attribute}', eachFlaggedGains)
    .effect('each {cardflag} card in {zone} loses {int} {attribute}', eachFlaggedLoses)
    .winner('the player with the most cards in their {perzone} wins', mostCardsWins)
    .given('{space} has {int} {spacenumber}', spaceHasGiven)
    .given('{space} has a {spaceflag}', spaceHasFlagGiven)
    .given('{space} has an {spaceflag}', spaceHasFlagGiven)
    .given('the bank has {int} {banked}', bankHasGiven)
    .given('{card} in {zone} is {cardflag}', cardInZoneIsGiven)
    .given('{card} in {zone} has {int} {attribute}', cardInZoneHasGiven)
    .expect('{space} has {int} {spacenumber}', spaceHasExpected)
    .expect('{space} has a {spaceflag}', spaceHasFlagExpected)
    .expect('{space} has an {spaceflag}', spaceHasFlagExpected)
    .expect('{space} has no {spaceflag}', spaceHasNoFlagExpected)
    .expect('the bank has {int} {banked}', bankHasExpected)
    .expect('{card} in {zone} is {cardflag}', cardInZoneIsExpected(true))
    .expect('{card} in {zone} is not {cardflag}', cardInZoneIsExpected(false))
    .expect('{card} in {zone} has {int} {attribute}', cardInZoneHasExpected);
}
