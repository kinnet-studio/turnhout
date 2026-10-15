import type { GameState } from '../../game-state';
import { nextInt } from '../../rng';
import type { PlayerId } from '../../scene';
import { readSpaceTable } from '../board';
import {
  addToCounter, counterOf, didThisTurn, latestRoll, markOut, nextIn, ownerOf, pieceAt, placePiece, playersIn, setOwner, setRoll, takeQueuedRoll,
} from '../board-state';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import { canon } from '../refs';
import type { BoardFn, BoardSpec, ConditionFn, EffectFn, MomentFn, PhraseEnv, SpaceClass, WhoFn, WinnerFn } from '../types';
import { chooseNext } from '../zones';
import { itOf, theyOf } from './support';

const MIN_DICE = 1;
const MAX_DICE = 10;
const MIN_SIDES = 2;
const MAX_SIDES = 100;

/** A `{name}` arrives in lowercase; to show it back the way a space is usually written, each word gets a capital. */
const titled = (name: string): string => name.replace(/(^|\s)(\S)/g, (_, space: string, letter: string) => space + letter.toUpperCase());

const loop: BoardFn = ([name], table) => {
  if (!table) throw new RuleError('Add a table of spaces under this line.');
  const spaces = readSpaceTable(table);
  // The line says where the loop starts so that a reader of the rules does not have to open the table to know.
  if (canon(spaces[0].name) !== canon(name as string)) {
    throw new RuleError(`The first space in the table is “${spaces[0].name}”, but this line says the board starts at “${titled(name as string)}”.`);
  }
  return { kind: 'loop', spaces };
};

const pieces: BoardFn = ([space]) => ({ kind: 'pieces', start: space as number });

const counter: BoardFn = ([start, name, visibility]) => {
  if (visibility === 'secret') throw new RuleError('A number a player has can be seen by everyone or only by them.');
  return { kind: 'counter', counter: { name: name as string, start: start as number, visibility: visibility as 'public' | 'owner' } };
};

const payWith: BoardFn = ([name]) => ({ kind: 'pay-with', counter: name as string });

function diceOf(count: number, sides: number) {
  if (count < MIN_DICE || count > MAX_DICE || sides < MIN_SIDES || sides > MAX_SIDES) {
    throw new RuleError(`Dice need ${MIN_DICE} to ${MAX_DICE} dice of ${MIN_SIDES} to ${MAX_SIDES} sides.`);
  }
  return { kind: 'dice' as const, count, sides };
}

// ---- what a rule about a piece or a space can ask --------------------------------------------

/** The board a board phrase plays on. The compiler only lets such phrases into a game with a board, so a missing one is a bug. */
function boardIn(env: PhraseEnv): BoardSpec {
  if (!env.game.board) throw new Error('This phrase needs a board, but this game has none.');
  return env.game.board;
}

const nameOfSpace = (env: PhraseEnv, space: number): string => boardIn(env).spaces[space].name;

/** The number a space's cell holds, or the sentence that says why it holds none. */
function amountOf(env: PhraseEnv, attr: string): number {
  const space = itOf(env);
  const value = boardIn(env).spaces[space].attrs[attr];
  if (value === undefined || value === null) throw new RuleError(`${nameOfSpace(env, space)} has no ${attr}.`);
  if (typeof value !== 'number') throw new RuleError(`${nameOfSpace(env, space)}'s ${attr} isn't a number.`);
  return value;
}

/** What the dice showed last, added up. */
function rollTotal(state: GameState): number {
  const faces = latestRoll(state);
  if (!faces) throw new RuleError('Nobody has rolled the dice yet.');
  return faces.reduce((sum, face) => sum + face, 0);
}

/** The seat that owns the space the rule is about; whoever is owed must exist. */
function ownerOfIt(env: PhraseEnv): PlayerId {
  const space = itOf(env);
  const owner = ownerOf(env.state, space);
  if (owner === null) throw new RuleError(`No one owns ${nameOfSpace(env, space)}.`);
  return owner;
}

/** Takes the amount from `from` and gives it to `to`; the bank (null) has no counter to fill. */
function transfer(env: PhraseEnv, from: PlayerId, to: PlayerId | null, amount: number): GameState {
  const counter = boardIn(env).payWith;
  if (counter === null) throw new Error('This phrase needs something to pay with, but the board names none.');
  const paid = addToCounter(env.state, counter, from, -amount);
  return to === null ? paid : addToCounter(paid, counter, to, amount);
}

// ---- conditions ------------------------------------------------------------------------------

const hasDoneThisTurn = (done: boolean): ConditionFn => (env, [verb]) => didThisTurn(env.state, theyOf(env), verb as string) === done;

const spaceHas: ConditionFn = (env, [attr]) => boardIn(env).spaces[itOf(env)].attrs[attr as string] !== undefined;

const noOneOwns: ConditionFn = (env) => ownerOf(env.state, itOf(env)) === null;

/** “Else” is relative to the subject player; with no player in the rule, any owner is someone else. */
const someoneElseOwns: ConditionFn = (env) => {
  const owner = ownerOf(env.state, itOf(env));
  return owner !== null && owner !== env.subject?.player;
};

const theyOwn: ConditionFn = (env) => ownerOf(env.state, itOf(env)) === theyOf(env);

const haveAtLeastItsAmount: ConditionFn = (env, [attr, counter]) =>
  counterOf(env.state, counter as string, theyOf(env)) >= amountOf(env, attr as string);

const haveAtLeast: ConditionFn = (env, [n, counter]) => counterOf(env.state, counter as string, theyOf(env)) >= (n as number);

const oneLeft: ConditionFn = (env) => playersIn(env.state, env.seats).length === 1;

// ---- who -------------------------------------------------------------------------------------

const lessThan: WhoFn = (env, [n, counter]) =>
  playersIn(env.state, env.seats).filter((seat) => counterOf(env.state, counter as string, seat) < (n as number));

// ---- moments ---------------------------------------------------------------------------------

const passes: MomentFn = (_env, [space], moment) => moment.kind === 'pass' && moment.space === space;

const landsOn: MomentFn = (_env, [space], moment) => moment.kind === 'land' && moment.space === space;

const isOfClass = (env: PhraseEnv, space: number, kind: SpaceClass): boolean =>
  kind.values.includes(boardIn(env).spaces[space].attrs[kind.attribute]);

const landsOnClass: MomentFn = (env, [kind], moment) => moment.kind === 'land' && isOfClass(env, moment.space, kind as SpaceClass);

const landsOnClassOwnedByOther: MomentFn = (env, args, moment) => {
  if (!landsOnClass(env, args, moment)) return false;
  const owner = ownerOf(env.state, moment.space);
  return owner !== null && owner !== moment.seat;
};

// ---- effects ---------------------------------------------------------------------------------

const rollDice: EffectFn = (env) => {
  const { dice } = boardIn(env);
  if (!dice) throw new RuleError('This game has no dice. Add a line like “There are two six-sided dice.” under Board:');
  const queued = takeQueuedRoll(env.state);
  // An example that fixed the roll gets exactly it, and the rng stays where it was.
  if (queued.faces) return setRoll(queued.state, queued.faces);
  let { rng } = env.state;
  const faces: number[] = [];
  for (let die = 0; die < dice.count; die++) {
    const drawn = nextInt(rng, dice.sides);
    rng = drawn.rng;
    faces.push(drawn.value + 1);
  }
  return setRoll({ ...env.state, rng }, faces);
};

/** One space at a time, so a rule about passing a space (like collecting on the way) sees every space on the way. */
const moveByRoll: EffectFn = (env) => {
  const they = theyOf(env);
  const steps = rollTotal(env.state);
  if (!env.announce) throw new Error('This phrase needs to announce where the piece passes and lands, but nothing is listening.');
  const from = pieceAt(env.state, they);
  if (from === null) throw new RuleError('They have no piece on the board.');
  const count = boardIn(env).spaces.length;
  let state = env.state;
  let space = from;
  for (let step = 1; step <= steps; step++) {
    space = (from + step) % count;
    state = env.announce(placePiece(state, they, space), { kind: 'pass', seat: they, space });
  }
  return env.announce(state, { kind: 'land', seat: they, space });
};

const gets: EffectFn = (env, [n, counter]) => addToCounter(env.state, counter as string, theyOf(env), n as number);

const paysBank: EffectFn = (env, [attr]) => transfer(env, theyOf(env), null, amountOf(env, attr as string));

const paysOwner: EffectFn = (env, [attr]) => {
  const owner = ownerOfIt(env);
  return transfer(env, theyOf(env), owner, amountOf(env, attr as string));
};

const paysRollToOwner: EffectFn = (env, [times]) => {
  const owner = ownerOfIt(env);
  return transfer(env, theyOf(env), owner, (times as number) * rollTotal(env.state));
};

const owns: EffectFn = (env) => setOwner(env.state, itOf(env), theyOf(env));

const goesOut: EffectFn = (env) => {
  const they = theyOf(env);
  const out = markOut(env.state, they);
  // The turn moves on only when it was theirs; a player who goes out in someone else's turn leaves it alone.
  return out.turn?.current === they ? chooseNext(out, nextIn(out, they, env.seats)) : out;
};

const returnToBank: EffectFn = (env) => {
  const they = theyOf(env);
  return boardIn(env).spaces.reduce((state, _space, at) => (ownerOf(state, at) === they ? setOwner(state, at, null) : state), env.state);
};

// ---- winner ----------------------------------------------------------------------------------

const lastOneStanding: WinnerFn = (env) => {
  const [winner, ...others] = playersIn(env.state, env.seats);
  if (winner === undefined || others.length > 0) throw new RuleError('More than one player is still in, so no one has won yet.');
  return winner;
};

/** The sentences under Board: that say what the board is, who plays on it and what they roll and pay with, and the ones that play a board game. */
export function registerBoardPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .board('the board is a loop of spaces, starting at {name}', loop)
    .board('each player has a piece that starts on {space}', pieces)
    .board('each player has {int} {name} that {visibility}', counter)
    .board('players pay with {counter}', payWith)
    .board('there are {count} {count}-sided dice', ([count, sides]) => diceOf(count as number, sides as number))
    .board('there is one {count}-sided die', ([sides]) => diceOf(1, sides as number))
    .condition('they have {done} this turn', hasDoneThisTurn(true), { needsPlayer: true })
    .condition('they have not {done} this turn', hasDoneThisTurn(false), { needsPlayer: true })
    .condition('it has a {spaceattr}', spaceHas, { needsSpace: true })
    .condition('it has an {spaceattr}', spaceHas, { needsSpace: true })
    .condition('no one owns it', noOneOwns, { needsSpace: true })
    .condition('someone else owns it', someoneElseOwns, { needsSpace: true })
    .condition('they own it', theyOwn, { needsPlayer: true, needsSpace: true })
    .condition('they have at least its {spaceattr} in {counter}', haveAtLeastItsAmount, { needsPlayer: true, needsSpace: true })
    .condition('they have at least {int} {counter}', haveAtLeast, { needsPlayer: true })
    .condition('one player is left', oneLeft)
    .who('a player has less than {int} {counter}', lessThan)
    .moment('a piece passes {space}', passes)
    .moment('a player lands on {space}', landsOn)
    .moment('a player lands on {spaceclass}', landsOnClass)
    .moment('a player lands on {spaceclass} someone else owns', landsOnClassOwnedByOther)
    .effect('roll the dice', rollDice)
    .effect('their piece moves forward by the roll', moveByRoll, { needsPlayer: true })
    .effect('its player gets {int} {counter}', gets, { needsPlayer: true })
    .effect('they get {int} {counter}', gets, { needsPlayer: true })
    .effect('they pay its {spaceattr}', paysBank, { needsPlayer: true, needsSpace: true, needsPayment: true })
    .effect('they pay its {spaceattr} to its owner', paysOwner, { needsPlayer: true, needsSpace: true, needsPayment: true })
    .effect('they pay {int} times the roll to its owner', paysRollToOwner, { needsPlayer: true, needsSpace: true, needsPayment: true })
    .effect('they own it', owns, { needsPlayer: true, needsSpace: true })
    .effect('they are out', goesOut, { needsPlayer: true })
    .effect('their spaces go back to the bank', returnToBank, { needsPlayer: true })
    .winner('that player wins', lastOneStanding);
}
