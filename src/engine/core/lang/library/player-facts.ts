import type { GameState } from '../../game-state';
import type { PlayerId } from '../../scene';
import { playerFact, playersIn, setPlayerFact } from '../board-state';
import type { PhraseLibrary } from '../phrases';
import { counted } from '../refs';
import type { ConditionFn, DeclareFn, EffectFn, ExpectFn, FactItem, PhraseEnv, WhoFn } from '../types';
import { seatOf, theyOf } from './support';

/** Every fact in the list, told it is on players. */
const declaresOnPlayers: DeclareFn = ([facts]) => (facts as FactItem[]).map((fact) => ({ ...fact, on: 'player' }));

/** A player that “can be” something has something they are or are not, with no count. */
const playerIs: DeclareFn = ([name]) => [{ name: name as string, on: 'player', kind: 'flag' }];

/** A player fact is so only when it was set: a player never given it, or given it as no, is not. */
const isSet = (state: GameState, seat: PlayerId, fact: string): boolean => playerFact(state, seat, fact) === true;

/** How many a player has of a fact: its count, which is 0 for a player nothing has changed it on. */
function countOf(state: GameState, seat: PlayerId, fact: string): number {
  const value = playerFact(state, seat, fact);
  return typeof value === 'number' ? value : 0;
}

// ---- conditions ------------------------------------------------------------------------------

const theyAre: ConditionFn = (env, [fact]) => isSet(env.state, theyOf(env), fact as string);

const theyAreNot: ConditionFn = (env, args) => !theyAre(env, args);

const theyHave: ConditionFn = (env, [n, fact]) => countOf(env.state, theyOf(env), fact as string) === n;

/** Only players still in are asked: what a player had when they left counts for no one. */
const noPlayerIs: ConditionFn = (env, [fact]) => !playersIn(env.state, env.seats).some((seat) => isSet(env.state, seat, fact as string));

/** Not counting them, who the rule is about: the others still in are the ones asked. */
const noOtherPlayerIs: ConditionFn = (env, [fact]) => {
  const they = theyOf(env);
  return !playersIn(env.state, env.seats).some((seat) => seat !== they && isSet(env.state, seat, fact as string));
};

// ---- effects ---------------------------------------------------------------------------------

const theyBecome = (value: boolean): EffectFn => (env, [fact]) => setPlayerFact(env.state, theyOf(env), fact as string, value);

const theyGain: EffectFn = (env, [n, fact]) => {
  const they = theyOf(env);
  return setPlayerFact(env.state, they, fact as string, countOf(env.state, they, fact as string) + (n as number));
};

const theirGoBackTo: EffectFn = (env, [fact, n]) => setPlayerFact(env.state, theyOf(env), fact as string, n as number);

/** Every player still in; one who is out keeps what they had, and nothing reads it. */
const everyPlayerBecomes = (value: boolean): EffectFn => (env, [fact]) =>
  playersIn(env.state, env.seats).reduce((state, seat) => setPlayerFact(state, seat, fact as string, value), env.state);

// ---- who -------------------------------------------------------------------------------------

/** Players still in, in seat order. */
const playersWho = (env: PhraseEnv, has: (seat: PlayerId) => boolean): PlayerId[] => playersIn(env.state, env.seats).filter(has);

const aPlayerIs: WhoFn = (env, [fact]) => playersWho(env, (seat) => isSet(env.state, seat, fact as string));

const aPlayerHas: WhoFn = (env, [n, fact]) => playersWho(env, (seat) => countOf(env.state, seat, fact as string) === n);

// ---- examples: given ---------------------------------------------------------------------------

// These arrange the table as the example says.
const isGiven: EffectFn = (env, [seat, fact]) => setPlayerFact(env.state, seatOf(env, seat), fact as string, true);

const hasGiven: EffectFn = (env, [seat, n, fact]) => setPlayerFact(env.state, seatOf(env, seat), fact as string, n as number);

// ---- examples: expect --------------------------------------------------------------------------

/** Whether the player's fact is as wanted; otherwise what an example should say about it. */
const isExpected = (wanted: boolean): ExpectFn => (env, [seat, fact]) => {
  const who = seatOf(env, seat);
  if (isSet(env.state, who, fact as string) === wanted) return true;
  return wanted ? `Expected ${who} to be ${fact}, but they aren't.` : `Expected ${who} not to be ${fact}, but they are.`;
};

const hasExpected: ExpectFn = (env, [seat, n, fact]) => {
  const who = seatOf(env, seat);
  const have = countOf(env.state, who, fact as string);
  return have === n ? true : `Expected ${who} to have ${counted(n as number, fact as string)}, but they have ${have}.`;
};

/**
 * The sentences for facts about players, which a game declares under Board: with “Players can have …” (a count, starting at 0)
 * and “Players can be …” (a yes/no, starting at no). A name may be several words. Then the sentences a rule uses: asking what
 * the player it is about has or is, changing it, and finding the players still in who have or are something. Also a yes/no on every
 * player still in at once, and whether none of them, or none but the player it is about, has it. And the Given and Then lines
 * that set and check these in an example.
 */
export function registerPlayerFactPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .declare('players can have {factlist}', declaresOnPlayers)
    .declare('players can be {name}', playerIs)
    .condition('they are {playerflag}', theyAre, { needsPlayer: true })
    .condition('they are not {playerflag}', theyAreNot, { needsPlayer: true })
    .condition('they have {int} {playernumber}', theyHave, { needsPlayer: true })
    .condition('no player is {playerflag}', noPlayerIs)
    .condition('no other player is {playerflag}', noOtherPlayerIs, { needsPlayer: true })
    .effect('they are {playerflag}', theyBecome(true), { needsPlayer: true })
    .effect('they are not {playerflag}', theyBecome(false), { needsPlayer: true })
    .effect('they gain {int} {playernumber}', theyGain, { needsPlayer: true })
    .effect('their {playernumber} go back to {int}', theirGoBackTo, { needsPlayer: true })
    .effect('every player is {playerflag}', everyPlayerBecomes(true))
    .effect('no player is {playerflag}', everyPlayerBecomes(false))
    .who('a player is {playerflag}', aPlayerIs)
    .who('a player has {int} {playernumber}', aPlayerHas)
    .given('{player} is {playerflag}', isGiven)
    .given('{player} has {int} {playernumber}', hasGiven)
    .expect('{player} is {playerflag}', isExpected(true))
    .expect('{player} is not {playerflag}', isExpected(false))
    .expect('{player} has {int} {playernumber}', hasExpected);
}
