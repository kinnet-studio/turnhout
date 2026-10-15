import type { GameState, TurnState } from '../game-state';
import type { PlayerId } from '../scene';
import type { Json } from '../table-def';
import { RuleError } from './diagnostics';
import type { CompiledGame, CompiledPhase, GameNumber } from './types';
import { leftOf } from './zones';

// The state of a board game lives in `GameState.data` under these keys, so it travels with the engine's state
// (saved games, the network) without the engine knowing a board exists. Card games never get any of them, except the
// last card drawn, which a card game gets as soon as a card is drawn to do what it says.

/** `{ [seat]: space index }`; a seat with no piece on the board is absent. */
export const PIECES_KEY = 'lang:pieces';
/** `{ [space index]: seat }` for spaces somebody owns. */
export const OWNERS_KEY = 'lang:owners';
/** `{ [counter]: { [seat]: number } }` */
export const COUNTERS_KEY = 'lang:counters';
/** The faces of the latest roll: `number[]`. */
export const ROLL_KEY = 'lang:roll';
/** Rolls an example fixed ahead of time, taken first in first out: `number[][]`. */
export const NEXT_ROLLS_KEY = 'lang:next-rolls';
/**
 * What each seat has done this turn: `{ [seat]: move types }`, emptied whenever the turn passes. It is written only when a
 * button is pressed (or an example says what was done), so a card game without buttons never gets it.
 */
export const TURN_KEY = 'lang:turn';
/**
 * The faces of every roll each seat made this turn, in the order rolled: `{ [seat]: number[][] }`. Emptied whenever the turn
 * passes, with the log above. It is written only when a player rolls, so a game without dice never gets it.
 */
export const TURN_ROLLS_KEY = 'lang:turn-rolls';
/**
 * The turn another phase interrupted, kept to go back to: an `InterruptedTurn`. Written only while a turn is interrupted, so a game
 * where none ever is never gets it.
 */
export const INTERRUPTED_KEY = 'lang:interrupted';
/** Seats that have left the game, in the order they went: `PlayerId[]`. */
export const OUT_KEY = 'lang:out';
/**
 * Facts that change during play, on spaces and on players, and the numbers of the game itself: `{ spaces: { [space index]: { [fact]:
 * value } }, players: { [seat]: { [fact]: value } }, game: { [number]: value } }`. A fact nobody set has no entry. Facts on cards live
 * in the card's own `data`, not here.
 */
export const FACTS_KEY = 'lang:facts';
/** What is left in the bank, by name: `{ [name]: number }`. */
export const BANK_KEY = 'lang:bank';
/**
 * Whom each seat owes, from the latest payment that left it below 0: `{ [seat]: Creditor }`. It is written only then, so a game
 * where nobody goes below 0 never gets it.
 */
export const OWES_KEY = 'lang:owes';
/** The card drawn last, for the page to show: a `LastDrawn`. Written only when a card is drawn, so a game with no such cards never gets it. */
export const LAST_DRAWN_KEY = 'lang:last-drawn';

/** Who drew the card, from which pile (said with its owner, “the lucky pile” or “p1's deck”), the card's name and what it said. */
export type LastDrawn = { seat: PlayerId; zone: string; name: string; says: string };

/**
 * The turn as it stood when another phase interrupted it: its phase (null for none), whose it was, and what was done and rolled
 * in it, as the turn log and the turn's rolls held them (null where the state had none).
 */
export type InterruptedTurn = { phase: string | null; current: PlayerId; log: Json | null; rolls: Json | null };

/** Whom a payment was owed to: a player, or the bank. */
export type Creditor = PlayerId | 'bank';

type Pieces = { [seat: string]: number };
type Owners = { [space: string]: PlayerId };
type Counters = { [counter: string]: { [seat: string]: number } };
type TurnLog = { [seat: string]: string[] };
type TurnRolls = { [seat: string]: number[][] };
type FactValue = number | boolean;
type FactTable = { [who: string]: { [fact: string]: FactValue } };
type Facts = { spaces: FactTable; players: FactTable; game: { [name: string]: number } };
type Bank = { [name: string]: number };
type Debts = { [seat: string]: Creditor };

const withData = (state: GameState, key: string, value: Json): GameState => ({ ...state, data: { ...state.data, [key]: value } });

const piecesOf = (state: GameState): Pieces => (state.data[PIECES_KEY] ?? {}) as Pieces;
const ownersOf = (state: GameState): Owners => (state.data[OWNERS_KEY] ?? {}) as Owners;
const countersOf = (state: GameState): Counters => (state.data[COUNTERS_KEY] ?? {}) as Counters;
const outOf = (state: GameState): PlayerId[] => (state.data[OUT_KEY] ?? []) as PlayerId[];
const turnLogOf = (state: GameState): TurnLog => (state.data[TURN_KEY] ?? {}) as TurnLog;
const turnRollsOf = (state: GameState): TurnRolls => (state.data[TURN_ROLLS_KEY] ?? {}) as TurnRolls;
const factsOf = (state: GameState): Facts => ({ spaces: {}, players: {}, game: {}, ...(state.data[FACTS_KEY] as Partial<Facts> | undefined) });
const bankTable = (state: GameState): Bank => (state.data[BANK_KEY] ?? {}) as Bank;
const debtsOf = (state: GameState): Debts => (state.data[OWES_KEY] ?? {}) as Debts;

/**
 * Puts a board game's pieces, owners, counters and bank in the state the first time it is needed. A card game, or a state
 * that already has them, comes back as it is, so every caller may call this without checking.
 */
export function withBoardData(state: GameState, game: CompiledGame, seats: PlayerId[]): GameState {
  const { board } = game;
  if (!board || state.data[PIECES_KEY] !== undefined) return state;
  const pieces: Pieces = {};
  if (board.pieces) for (const seat of seats) pieces[seat] = board.pieces.start;
  const counters: Counters = {};
  for (const { name, start } of board.counters) {
    counters[name] = Object.fromEntries(seats.map((seat) => [seat, start]));
  }
  const bank: Bank = Object.fromEntries(board.bank.map(({ name, start }) => [name, start]));
  return {
    ...state,
    data: { ...state.data, [PIECES_KEY]: pieces, [OWNERS_KEY]: {}, [COUNTERS_KEY]: counters, [BANK_KEY]: bank, [OUT_KEY]: [] },
  };
}

export function pieceAt(state: GameState, seat: PlayerId): number | null {
  return piecesOf(state)[seat] ?? null;
}

/** Puts the seat's piece on a space, or takes it off the board with null. */
export function placePiece(state: GameState, seat: PlayerId, space: number | null): GameState {
  const { [seat]: _gone, ...rest } = piecesOf(state);
  return withData(state, PIECES_KEY, space === null ? rest : { ...rest, [seat]: space });
}

export function ownerOf(state: GameState, space: number): PlayerId | null {
  return ownersOf(state)[space] ?? null;
}

export function setOwner(state: GameState, space: number, seat: PlayerId | null): GameState {
  const { [space]: _gone, ...rest } = ownersOf(state);
  return withData(state, OWNERS_KEY, seat === null ? rest : { ...rest, [space]: seat });
}

/** A seat's number of a counter; 0 when it was never set. */
export function counterOf(state: GameState, counter: string, seat: PlayerId): number {
  return countersOf(state)[counter]?.[seat] ?? 0;
}

export function setCounter(state: GameState, counter: string, seat: PlayerId, value: number): GameState {
  const all = countersOf(state);
  return withData(state, COUNTERS_KEY, { ...all, [counter]: { ...all[counter], [seat]: value } });
}

export function addToCounter(state: GameState, counter: string, seat: PlayerId, delta: number): GameState {
  return setCounter(state, counter, seat, counterOf(state, counter, seat) + delta);
}

/** Notes whom the seat owes, in place of whom it owed before: only the latest payment that took them below 0 counts. */
export function recordDebt(state: GameState, seat: PlayerId, to: Creditor): GameState {
  return withData(state, OWES_KEY, { ...debtsOf(state), [seat]: to });
}

/**
 * Whom the seat owes while its counter is below 0; null once it is back to 0 or more, or when no payment ever took it below.
 * A creditor who has gone out reads as the bank, since there is no one left to hand things to.
 */
export function owedTo(state: GameState, seat: PlayerId, counter: string): Creditor | null {
  if (counterOf(state, counter, seat) >= 0) return null;
  const to = debtsOf(state)[seat] ?? null;
  return to !== null && to !== 'bank' && isOut(state, to) ? 'bank' : to;
}

function setFact(state: GameState, table: 'spaces' | 'players', who: string, fact: string, value: FactValue): GameState {
  const facts = factsOf(state);
  return withData(state, FACTS_KEY, { ...facts, [table]: { ...facts[table], [who]: { ...facts[table][who], [fact]: value } } });
}

/** A fact of a space; null when it was never set, which is not the same as 0 or false. */
export function spaceFact(state: GameState, space: number, fact: string): FactValue | null {
  return factsOf(state).spaces[space]?.[fact] ?? null;
}

export function setSpaceFact(state: GameState, space: number, fact: string, value: FactValue): GameState {
  return setFact(state, 'spaces', String(space), fact, value);
}

/** A fact of a seat; null when it was never set. */
export function playerFact(state: GameState, seat: PlayerId, fact: string): FactValue | null {
  return factsOf(state).players[seat]?.[fact] ?? null;
}

export function setPlayerFact(state: GameState, seat: PlayerId, fact: string, value: FactValue): GameState {
  return setFact(state, 'players', seat, fact, value);
}

/**
 * A number of the game as a rule last set it, or the value it was declared to start at while none has. A name the game never
 * declared is a mistake in the rule, said as one.
 */
export function gameNumber(state: GameState, game: CompiledGame, name: string): number {
  const declared = game.facts.find((fact): fact is GameNumber => fact.on === 'game' && fact.name === name);
  if (!declared) throw new Error(`The game has no number called “${name}”.`);
  return factsOf(state).game[name] ?? declared.start;
}

export function setGameNumber(state: GameState, name: string, value: number): GameState {
  const facts = factsOf(state);
  return withData(state, FACTS_KEY, { ...facts, game: { ...facts.game, [name]: value } });
}

/** How many the bank has of something; 0 when the game has no such thing. */
export function bankOf(state: GameState, name: string): number {
  return bankTable(state)[name] ?? 0;
}

export function setBank(state: GameState, name: string, value: number): GameState {
  return withData(state, BANK_KEY, { ...bankTable(state), [name]: value });
}

/** The card drawn last; null until one is. */
export function lastDrawn(state: GameState): LastDrawn | null {
  return (state.data[LAST_DRAWN_KEY] ?? null) as LastDrawn | null;
}

export function setLastDrawn(state: GameState, drawn: LastDrawn): GameState {
  return withData(state, LAST_DRAWN_KEY, drawn);
}

export function latestRoll(state: GameState): number[] | null {
  return (state.data[ROLL_KEY] ?? null) as number[] | null;
}

export function setRoll(state: GameState, faces: number[]): GameState {
  return withData(state, ROLL_KEY, faces);
}

/** Fixes a roll for later: an example says what the dice will show before anyone rolls them. */
export function queueRoll(state: GameState, faces: number[]): GameState {
  const queued = (state.data[NEXT_ROLLS_KEY] ?? []) as number[][];
  return withData(state, NEXT_ROLLS_KEY, [...queued, faces]);
}

/** The oldest fixed roll and the state without it; null faces when none was fixed (the dice are then really rolled). */
export function takeQueuedRoll(state: GameState): { faces: number[] | null; state: GameState } {
  const [faces, ...rest] = (state.data[NEXT_ROLLS_KEY] ?? []) as number[][];
  if (faces === undefined) return { faces: null, state };
  return { faces, state: withData(state, NEXT_ROLLS_KEY, rest) };
}

export function isOut(state: GameState, seat: PlayerId): boolean {
  return outOf(state).includes(seat);
}

/** Takes a player out of the game: they keep their place in the seat order but have no piece and are skipped. */
export function markOut(state: GameState, seat: PlayerId): GameState {
  if (isOut(state, seat)) return placePiece(state, seat, null);
  return placePiece(withData(state, OUT_KEY, [...outOf(state), seat]), seat, null);
}

export function playersIn(state: GameState, seats: PlayerId[]): PlayerId[] {
  return seats.filter((seat) => !isOut(state, seat));
}

/** The next seat to the left that is still in; `leftOf` when nobody is out. */
export function nextIn(state: GameState, seat: PlayerId, seats: PlayerId[]): PlayerId {
  let next = leftOf(seat, seats);
  while (next !== seat) {
    if (!isOut(state, next)) return next;
    next = leftOf(next, seats);
  }
  throw new RuleError('No other player is still in.');
}

/** Whether the seat has already done this since the turn last passed. */
export function didThisTurn(state: GameState, seat: PlayerId, move: string): boolean {
  return turnLogOf(state)[seat]?.includes(move) ?? false;
}

/** Notes that the seat has done this; what the other seats did stays as it was, since everyone may act at once. */
export function recordAction(state: GameState, seat: PlayerId, move: string): GameState {
  const log = turnLogOf(state);
  return withData(state, TURN_KEY, { ...log, [seat]: [...(log[seat] ?? []), move] });
}

/** The faces of each roll the seat made since the turn last passed, in the order rolled; none when they have not rolled. */
export function rollsThisTurn(state: GameState, seat: PlayerId): number[][] {
  return turnRollsOf(state)[seat] ?? [];
}

/** Replaces what a seat rolled this turn; the other seats' rolls stay as they were, since everyone may act at once. */
export function setRollsThisTurn(state: GameState, seat: PlayerId, rolls: number[][]): GameState {
  return withData(state, TURN_ROLLS_KEY, { ...turnRollsOf(state), [seat]: rolls });
}

/** Notes the faces the seat just rolled, behind the rolls it made earlier this turn. */
export function recordRoll(state: GameState, seat: PlayerId, faces: number[]): GameState {
  return setRollsThisTurn(state, seat, [...rollsThisTurn(state, seat), faces]);
}

/**
 * Forgets what every seat did and rolled, as the turn passes. Each is emptied only when it has entries, so a state with
 * neither comes back as it is: a card game's state never gets a log, and a board game without dice never gets rolls.
 */
export function clearTurnLog(state: GameState): GameState {
  const forgetsActions = Object.keys(turnLogOf(state)).length > 0;
  const forgetsRolls = Object.keys(turnRollsOf(state)).length > 0;
  if (!forgetsActions && !forgetsRolls) return state;
  const data = { ...state.data };
  if (forgetsActions) data[TURN_KEY] = {};
  if (forgetsRolls) data[TURN_ROLLS_KEY] = {};
  return { ...state, data };
}

/** The turn another phase interrupted; null when none is. */
export function interruptedTurn(state: GameState): InterruptedTurn | null {
  return (state.data[INTERRUPTED_KEY] ?? null) as InterruptedTurn | null;
}

/**
 * Hands the turn to `next` in `phase`, keeping the turn as it stood to go back to. Only one turn can be interrupted at a time.
 * What was done and rolled is forgotten as the turn passes, so only the seat whose turn it now is has any of it; the kept turn
 * has its own.
 */
export function interruptTurn(state: GameState, phase: string, next: PlayerId): GameState {
  if (interruptedTurn(state) !== null) throw new RuleError('A turn is already interrupted; go back to it before interrupting another.');
  const { turn } = state;
  if (!turn) throw new RuleError('There is no turn to interrupt.');
  const kept: InterruptedTurn = {
    phase: turn.phase ?? null, current: turn.current, log: state.data[TURN_KEY] ?? null, rolls: state.data[TURN_ROLLS_KEY] ?? null,
  };
  return clearTurnLog(withData({ ...state, turn: { ...turn, phase, current: next } }, INTERRUPTED_KEY, kept));
}

/**
 * Goes back to the interrupted turn exactly as it stood: its phase, whose it is, and what was done and rolled in it, a log it
 * did not have coming back absent. Whatever was done meanwhile is forgotten.
 */
export function resumeTurn(state: GameState): GameState {
  const kept = interruptedTurn(state);
  if (kept === null) throw new RuleError('There is no interrupted turn to go back to.');
  const { [INTERRUPTED_KEY]: _kept, [TURN_KEY]: _log, [TURN_ROLLS_KEY]: _rolls, ...data } = state.data;
  if (kept.log !== null) data[TURN_KEY] = kept.log;
  if (kept.rolls !== null) data[TURN_ROLLS_KEY] = kept.rolls;
  const turn: TurnState = { ...state.turn, current: kept.current };
  if (kept.phase === null) delete turn.phase;
  else turn.phase = kept.phase;
  return { ...state, turn, data };
}

/** Whether the phase's After line names the move type: making that move or pressing that button passes the turn. */
export function endsTurn(phase: CompiledPhase, move: string): boolean {
  return phase.after?.moves.includes(move) ?? false;
}
