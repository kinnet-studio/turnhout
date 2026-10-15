import type { GameState } from '../../game-state';
import { nextInt } from '../../rng';
import type { PlayerId } from '../../scene';
import type { Json } from '../../table-def';
import { numberIn, readSpaceTable } from '../board';
import {
  addToCounter, counterOf, didThisTurn, isOut, latestRoll, markOut, nextIn, ownerOf, pieceAt, placePiece, playersIn, queueRoll, recordAction,
  recordRoll, rollsThisTurn, setCounter, setOwner, setRoll, setRollsThisTurn, takeQueuedRoll,
} from '../board-state';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import { canon, joinOr, participle } from '../refs';
import type {
  ActionFn, BankSpec, BoardFn, BoardSpec, ConditionFn, EffectFn, ExpectFn, MomentFn, PhraseEnv, PhraseRef, SpaceClass, WhoFn, WinnerFn,
} from '../types';
import { chooseNext } from '../zones';
import { itOf, seatOf, theyOf } from './support';

const MIN_DICE = 1;
const MAX_DICE = 10;
const MIN_SIDES = 2;
const MAX_SIDES = 100;

/** The most dice an example can fix a roll for: the Given lines take one number or two. */
const MAX_FIXED_DICE = 2;

/** Said by anything that rolls or fixes a roll in a game that has no dice. */
const NO_DICE = 'This game has no dice. Add a line like “There are two six-sided dice.” under Board:';

/** The wording of the effect that rolls the dice: a button whose lines say it is the button that rolls. */
const ROLL_THE_DICE = 'roll the dice';

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

const bank: BoardFn = ([items]) => {
  const things = items as BankSpec[];
  // A name listed twice would leave the bank with only the last count, so the designer is told instead.
  const twice = things.find((thing, at) => things.findIndex((other) => other.name === thing.name) !== at);
  if (twice) throw new RuleError(`There are two bank items called “${twice.name}”.`);
  return { kind: 'bank', bank: things };
};

function diceOf(count: number, sides: number) {
  if (count < MIN_DICE || count > MAX_DICE || sides < MIN_SIDES || sides > MAX_SIDES) {
    throw new RuleError(`Dice need ${MIN_DICE} to ${MAX_DICE} dice of ${MIN_SIDES} to ${MAX_SIDES} sides.`);
  }
  return { kind: 'dice' as const, count, sides };
}

// ---- what a rule about a piece or a space can ask --------------------------------------------

/**
 * The board a board phrase plays on. Each phrase that needs one says so (`needsBoard`, or `needsDice`, since dice only
 * come with a board) or names spaces, details or counters only a board has, so the compiler only lets it into a game
 * with a board: a missing one is a bug.
 */
function boardIn(env: PhraseEnv): BoardSpec {
  if (!env.game.board) throw new Error('This phrase needs a board, but this game has none.');
  return env.game.board;
}

const nameOfSpace = (env: PhraseEnv, space: number): string => boardIn(env).spaces[space].name;

/**
 * The number a detail of the space comes to, or the sentence that says why it comes to none. It is what the game's own lines
 * make of the table's cell when the runtime can say (`env.columnValue`), else the cell.
 */
function amountOf(env: PhraseEnv, attr: string): number {
  const space = itOf(env);
  const value = env.columnValue ? env.columnValue(env.state, space, attr) : numberIn(boardIn(env).spaces[space], attr);
  if (value === null) throw new RuleError(`${nameOfSpace(env, space)} has no ${attr}.`);
  return value;
}

/** What the dice showed last, added up. */
export function rollTotal(state: GameState): number {
  const faces = latestRoll(state);
  if (!faces) throw new RuleError('Nobody has rolled the dice yet.');
  return faces.reduce((sum, face) => sum + face, 0);
}

/** A double is exactly two dice that show the same face: one die, or three alike, is not a double. */
export function isDouble(faces: number[]): boolean {
  return faces.length === 2 && faces[0] === faces[1];
}

const doublesRolled = (state: GameState, seat: PlayerId): number => rollsThisTurn(state, seat).filter(isDouble).length;

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

/** Any of the move types the wording names counts: “rolled” holds once either roll button has been pressed. */
const hasDoneThisTurn = (done: boolean): ConditionFn => (env, [moves]) =>
  (moves as string[]).some((move) => didThisTurn(env.state, theyOf(env), move)) === done;

/** Reads the player's own latest roll this turn, so another seat's double, or one from an earlier turn, never counts. */
const rolledADouble = (expected: boolean): ConditionFn => (env) => {
  const last = rollsThisTurn(env.state, theyOf(env)).at(-1);
  return (last !== undefined && isDouble(last)) === expected;
};

const hasRolledDoubles: ConditionFn = (env, [n]) => doublesRolled(env.state, theyOf(env)) === n;

const hasRolledFewerDoubles: ConditionFn = (env, [n]) => doublesRolled(env.state, theyOf(env)) < (n as number);

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

const rolledDoubles: WhoFn = (env, [n]) => playersIn(env.state, env.seats).filter((seat) => doublesRolled(env.state, seat) === n);

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

/** Rolls every die from the rng; the state comes back with the rng moved on. */
function drawFaces(state: GameState, dice: { count: number; sides: number }): { faces: number[]; state: GameState } {
  let { rng } = state;
  const faces: number[] = [];
  for (let die = 0; die < dice.count; die++) {
    const drawn = nextInt(rng, dice.sides);
    rng = drawn.rng;
    faces.push(drawn.value + 1);
  }
  return { faces, state: { ...state, rng } };
}

const rollDice: EffectFn = (env) => {
  const { dice } = boardIn(env);
  if (!dice) throw new RuleError(NO_DICE);
  const queued = takeQueuedRoll(env.state);
  // An example that fixed the roll gets exactly it, and the rng stays where it was.
  const { faces, state } = queued.faces ? { faces: queued.faces, state: queued.state } : drawFaces(env.state, dice);
  const seat = env.subject?.player ?? null;
  // Whoever rolls, by any button, has it counted; a roll that is nobody's in particular is only the latest roll.
  return setRoll(seat === null ? state : recordRoll(state, seat, faces), faces);
};

/**
 * One space at a time, so a rule about passing a space (like collecting on the way) sees every space on the way. If such a
 * rule moves the piece somewhere else, or takes the player out, the walk ends there: the move is over and nothing lands.
 */
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
    if (pieceAt(state, they) !== space || isOut(state, they)) return state;
  }
  return env.announce(state, { kind: 'land', seat: they, space });
};

/** Puts the piece on the space without a walk, so nothing is passed or landed on and no rule waiting for either happens. */
const goesStraightTo: EffectFn = (env, [space]) => {
  const they = theyOf(env);
  // Without this check the piece would appear on the board for a player who has none (one who is out).
  if (pieceAt(env.state, they) === null) throw new RuleError('They have no piece on the board.');
  return placePiece(env.state, they, space as number);
};

const gets: EffectFn = (env, [n, counter]) => addToCounter(env.state, counter as string, theyOf(env), n as number);

const paysBank: EffectFn = (env, [attr]) => transfer(env, theyOf(env), null, amountOf(env, attr as string));

const paysAmount: EffectFn = (env, [n]) => transfer(env, theyOf(env), null, n as number);

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

// ---- examples: given ---------------------------------------------------------------------------

const isOnGiven: EffectFn = (env, [seat, space]) => placePiece(env.state, seatOf(env, seat), space as number);

const ownsGiven: EffectFn = (env, [seat, space]) => setOwner(env.state, space as number, seatOf(env, seat));

const hasGiven: EffectFn = (env, [seat, n, counter]) => setCounter(env.state, counter as string, seatOf(env, seat), n as number);

// Going out in an example only arranges the table: whose turn it is stays as the example set it.
const isOutGiven: EffectFn = (env, [seat]) => markOut(env.state, seatOf(env, seat));

/** Only one button is pressed at a time, so a participle that stands for several buttons cannot say which one the player did. */
const hasDoneGiven: EffectFn = (env, [seat, moves]) => {
  const who = seatOf(env, seat);
  const [move, ...others] = moves as string[];
  if (others.length > 0) {
    const said = participle(move.split(' ')[0]);
    throw new RuleError(`“${said}” could mean ${joinOr([move, ...others].map((m) => `“${m}”`))}; write the whole wording.`);
  }
  return recordAction(env.state, who, move);
};

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** A roll an example fixes has to be one these dice could show, or the example would test something that cannot happen. */
function fixedFaces(env: PhraseEnv, faces: Json[]): number[] {
  // A card game has no board to read, but it can still be told about the dice it lacks.
  const dice = env.game.board?.dice ?? null;
  if (!dice) throw new RuleError(NO_DICE);
  // “So give 3 numbers” would be no help: there is no line that takes three.
  if (dice.count > MAX_FIXED_DICE) throw new RuleError('Examples can only fix the next roll in a game with one or two dice.');
  if (faces.length !== dice.count) {
    throw new RuleError(`This game rolls ${plural(dice.count, 'die', 'dice')}, so give ${plural(dice.count, 'number', 'numbers')}.`);
  }
  const impossible = (faces as number[]).find((face) => face < 1 || face > dice.sides);
  if (impossible !== undefined) throw new RuleError(`A ${dice.sides}-sided die can't roll ${impossible}.`);
  return faces as number[];
}

/** Whether a button's Then line rolls the dice, alone or as the effect of an If line. */
const rollsTheDice = (ref: PhraseRef): boolean => {
  const effect = ref.kind === 'lang' && ref.phrase === 'if' ? (ref.args as PhraseRef[])[1] : ref;
  return effect.kind === 'effect' && effect.phrase === ROLL_THE_DICE;
};

/**
 * Every roll is `[1, 1]`: only that they were doubles matters to a rule. The first button of the phase that rolls is noted as
 * done too, so “they have rolled this turn” holds along with the doubles; for no doubles nothing was rolled, so nothing is noted.
 */
const rolledDoublesGiven: EffectFn = (env, [seat, n]) => {
  const who = seatOf(env, seat);
  const count = n as number;
  const rolled = setRollsThisTurn(env.state, who, Array.from({ length: Math.max(count, 0) }, () => [1, 1]));
  if (count <= 0) return rolled;
  const phase = env.game.phases.find((p) => p.id === env.state.turn?.phase);
  const button = phase?.actions.find((action) => action.effects.some(rollsTheDice));
  if (!button) throw new RuleError('No button in this phase rolls the dice.');
  return recordAction(rolled, who, button.words);
};

const nextRollIs: EffectFn = (env, faces) => queueRoll(env.state, fixedFaces(env, faces));

/** Goes behind the rolls already fixed, so it needs one: a lone “roll after that” would be the next roll under another name. */
const rollAfterThat: EffectFn = (env, faces) => {
  const fixed = fixedFaces(env, faces);
  if (takeQueuedRoll(env.state).faces === null) throw new RuleError('Say what the next roll is first.');
  return queueRoll(env.state, fixed);
};

// ---- examples: action --------------------------------------------------------------------------

/** A player presses one of the phase's buttons: the move type is the button's whole wording. */
const pressesButton: ActionFn = (env, [seat, move]) => ({ by: seatOf(env, seat), move: { type: move as string } });

/** A player presses a button that picks a space and names it: the move carries the space's index as its target. */
const pressesButtonOn: ActionFn = (env, [seat, move, space]) => ({ by: seatOf(env, seat), move: { type: move as string, target: space as number } });

// ---- examples: expect --------------------------------------------------------------------------

const isOnExpected: ExpectFn = (env, [seat, space]) => {
  const who = seatOf(env, seat);
  const at = pieceAt(env.state, who);
  if (at === space) return true;
  const instead = at === null ? 'they have no piece on the board' : `they are on ${nameOfSpace(env, at)}`;
  return `Expected ${who} to be on ${nameOfSpace(env, space as number)}, but ${instead}.`;
};

const ownsExpected: ExpectFn = (env, [seat, space]) => {
  const who = seatOf(env, seat);
  const owner = ownerOf(env.state, space as number);
  if (owner === who) return true;
  return `Expected ${who} to own ${nameOfSpace(env, space as number)}, but ${owner === null ? 'no one' : owner} owns it.`;
};

const noOneOwnsExpected: ExpectFn = (env, [space]) => {
  const owner = ownerOf(env.state, space as number);
  return owner === null ? true : `Expected no one to own ${nameOfSpace(env, space as number)}, but ${owner} owns it.`;
};

const hasExpected: ExpectFn = (env, [seat, n, counter]) => {
  const who = seatOf(env, seat);
  const have = counterOf(env.state, counter as string, who);
  return have === n ? true : `Expected ${who} to have ${n} ${counter}, but they have ${have}.`;
};

const isOutExpected: ExpectFn = (env, [seat]) => {
  const who = seatOf(env, seat);
  return isOut(env.state, who) ? true : `Expected ${who} to be out, but they are still in.`;
};

// A double is two equal faces, so every phrase about one needs dice, and exactly two of them.
const ABOUT_DOUBLES = { needsDice: true, needsTwoDice: true };
const THEIR_DOUBLES = { needsPlayer: true, ...ABOUT_DOUBLES };

/**
 * The sentences under Board: that say what the board is, who plays on it, what they roll and pay with and what the bank
 * holds, the ones that play a board game, and the Given, When and Then lines of its examples.
 */
export function registerBoardPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .board('the board is a loop of spaces, starting at {name}', loop)
    .board('each player has a piece that starts on {space}', pieces)
    .board('each player has {int} {name} that {visibility}', counter)
    .board('players pay with {counter}', payWith)
    .board('the bank has {banklist}', bank)
    .board('there are {count} {count}-sided dice', ([count, sides]) => diceOf(count as number, sides as number))
    .board('there is one {count}-sided die', ([sides]) => diceOf(1, sides as number))
    .condition('they have {done} this turn', hasDoneThisTurn(true), { needsPlayer: true })
    .condition('they have not {done} this turn', hasDoneThisTurn(false), { needsPlayer: true })
    .condition('they rolled a double', rolledADouble(true), THEIR_DOUBLES)
    .condition('they did not roll a double', rolledADouble(false), THEIR_DOUBLES)
    .condition('they have rolled {int} double(s) this turn', hasRolledDoubles, THEIR_DOUBLES)
    .condition('they have rolled fewer than {int} double(s) this turn', hasRolledFewerDoubles, THEIR_DOUBLES)
    .condition('it has a {spaceattr}', spaceHas, { needsSpace: true })
    .condition('it has an {spaceattr}', spaceHas, { needsSpace: true })
    .condition('no one owns it', noOneOwns, { needsSpace: true, needsBoard: true })
    .condition('someone else owns it', someoneElseOwns, { needsSpace: true, needsBoard: true })
    .condition('they own it', theyOwn, { needsPlayer: true, needsSpace: true, needsBoard: true })
    .condition('they have at least its {spaceattr} in {counter}', haveAtLeastItsAmount, { needsPlayer: true, needsSpace: true })
    .condition('they have at least {int} {counter}', haveAtLeast, { needsPlayer: true })
    .condition('one player is left', oneLeft)
    .who('a player has less than {int} {counter}', lessThan)
    .who('a player has rolled {int} double(s) this turn', rolledDoubles, ABOUT_DOUBLES)
    .moment('a piece passes {space}', passes)
    .moment('a player lands on {space}', landsOn)
    .moment('a player lands on {spaceclass}', landsOnClass)
    .moment('a player lands on {spaceclass} someone else owns', landsOnClassOwnedByOther)
    .effect(ROLL_THE_DICE, rollDice, { needsDice: true })
    .effect('their piece moves forward by the roll', moveByRoll, { needsPlayer: true, needsBoard: true, needsDice: true })
    .effect('their piece goes straight to {space}', goesStraightTo, { needsPlayer: true, needsBoard: true })
    .effect('its player gets {int} {counter}', gets, { needsPlayer: true })
    .effect('they get {int} {counter}', gets, { needsPlayer: true })
    .effect('they pay {int}', paysAmount, { needsPlayer: true, needsPayment: true })
    .effect('they pay its {spaceattr}', paysBank, { needsPlayer: true, needsSpace: true, needsPayment: true })
    .effect('they pay its {spaceattr} to its owner', paysOwner, { needsPlayer: true, needsSpace: true, needsPayment: true })
    .effect('they pay {int} times the roll to its owner', paysRollToOwner, { needsPlayer: true, needsSpace: true, needsPayment: true, needsDice: true })
    .effect('they own it', owns, { needsPlayer: true, needsSpace: true, needsBoard: true })
    .effect('they are out', goesOut, { needsPlayer: true })
    .effect('their spaces go back to the bank', returnToBank, { needsPlayer: true, needsBoard: true })
    .winner('that player wins', lastOneStanding)
    .given('{player} is on {space}', isOnGiven)
    .given('{player} owns {space}', ownsGiven)
    .given('{player} has {int} {counter}', hasGiven)
    .given('{player} is out', isOutGiven)
    .given('{player} has {done} this turn', hasDoneGiven)
    .given('{player} has rolled {int} double(s) this turn', rolledDoublesGiven, ABOUT_DOUBLES)
    .given('the next roll is {int} and {int}', nextRollIs)
    .given('the next roll is {int}', nextRollIs)
    .given('the roll after that is {int} and {int}', rollAfterThat)
    .given('the roll after that is {int}', rollAfterThat)
    .action('{player} {action}', pressesButton)
    .action('{player} {targetaction} on {space}', pressesButtonOn)
    .expect('{player} is on {space}', isOnExpected)
    .expect('{player} owns {space}', ownsExpected)
    .expect('no one owns {space}', noOneOwnsExpected)
    .expect('{player} has {int} {counter}', hasExpected)
    .expect('{player} is out', isOutExpected);
}
