import type { GameState } from '../game-state';
import type { PlayerId } from '../scene';
import type { Json } from '../table-def';
import { RuleError } from './diagnostics';
import type { CompiledGame } from './types';
import { leftOf } from './zones';

// The state of a board game lives in `GameState.data` under these keys, so it travels with the engine's state
// (saved games, the network) without the engine knowing a board exists. Card games never get any of them.

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
/** What the current seat has done this turn: `{ seat, did: verbs, ended }`. */
export const TURN_KEY = 'lang:turn';
/** Seats that have left the game, in the order they went: `PlayerId[]`. */
export const OUT_KEY = 'lang:out';

type Pieces = { [seat: string]: number };
type Owners = { [space: string]: PlayerId };
type Counters = { [counter: string]: { [seat: string]: number } };
type TurnLog = { seat: PlayerId; did: string[]; ended: boolean };

const withData = (state: GameState, key: string, value: Json): GameState => ({ ...state, data: { ...state.data, [key]: value } });

const piecesOf = (state: GameState): Pieces => (state.data[PIECES_KEY] ?? {}) as Pieces;
const ownersOf = (state: GameState): Owners => (state.data[OWNERS_KEY] ?? {}) as Owners;
const countersOf = (state: GameState): Counters => (state.data[COUNTERS_KEY] ?? {}) as Counters;
const outOf = (state: GameState): PlayerId[] => (state.data[OUT_KEY] ?? []) as PlayerId[];
const turnLogOf = (state: GameState): TurnLog | null => (state.data[TURN_KEY] ?? null) as TurnLog | null;

/**
 * Puts a board game's pieces, owners and counters in the state the first time it is needed. A card game, or a state
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
  return {
    ...state,
    data: { ...state.data, [PIECES_KEY]: pieces, [OWNERS_KEY]: {}, [COUNTERS_KEY]: counters, [OUT_KEY]: [] },
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

/** Whether the seat has already done this on the turn it is taking now. */
export function didThisTurn(state: GameState, seat: PlayerId, verb: string): boolean {
  const log = turnLogOf(state);
  return log !== null && log.seat === seat && !log.ended && log.did.includes(verb);
}

/** Notes an action on the seat's turn; a log of another seat's turn, or of a turn that ended, starts afresh. */
export function recordAction(state: GameState, seat: PlayerId, verb: string, endsTurn: boolean): GameState {
  const log = turnLogOf(state);
  const did = log !== null && log.seat === seat && !log.ended ? log.did : [];
  return withData(state, TURN_KEY, { seat, did: [...did, verb], ended: endsTurn });
}

/** Closes the turn log, so what was done stops counting. The same state when there is no log. */
export function endTurnLog(state: GameState): GameState {
  const log = turnLogOf(state);
  if (log === null) return state;
  return withData(state, TURN_KEY, { ...log, ended: true });
}
