// What one seat sees of a board game beyond the table: the board with its pieces and numbers, and the seat's buttons.
// Everything here is plain `Json`, so the net layer can carry it in a view without knowing a board exists.
import type { GameEngine } from '../game-engine';
import type { GameState } from '../game-state';
import type { PlayerId } from '../scene';
import type { Json } from '../table-def';
import { counterOf, isOut, latestRoll, ownerOf, pieceAt } from './board-state';
import { friendlyError, friendlyReason } from './friendly';
import type { LangRuntime } from './runtime';

/** `color` is the space's color when it is written as text; `details` is every other thing the table says about it. */
export type SpaceView = { name: string; color: string | null; details: { [k: string]: Json }; owner: PlayerId | null };
/** One number per seat; null where the seat looking may not see it. */
export type CounterView = { name: string; values: { [seat: string]: number | null } };
/** `pieces` lists the seats that still have a piece, so a player who is out is absent. */
export type BoardView = { spaces: SpaceView[]; pieces: { [seat: string]: number }; roll: number[] | null; counters: CounterView[]; out: PlayerId[] };
/** `allowed` is true when the button works now, otherwise the sentence to show for why it does not. */
export type ActionView = { verb: string; label: string; allowed: true | string };
export type SeatExtras = { board: BoardView | null; actions: ActionView[] };

const OUT_OF_GAME = "You're out of the game.";

function boardView(runtime: LangRuntime, state: GameState, seat: PlayerId): BoardView | null {
  const { board } = runtime.game;
  if (!board) return null;
  const spaces = board.spaces.map((space, index): SpaceView => {
    const { color, ...rest } = space.attrs;
    // A color that is not text (a number, say) is not one to paint with, but it is still something the table says.
    const painted = typeof color === 'string';
    const details = painted || color === undefined ? rest : { ...rest, color };
    return { name: space.name, color: painted ? color : null, details, owner: ownerOf(state, index) };
  });
  const pieces: { [seat: string]: number } = {};
  for (const s of runtime.seats) {
    const at = pieceAt(state, s);
    if (at !== null) pieces[s] = at;
  }
  const counters = board.counters.map((counter): CounterView => ({
    name: counter.name,
    values: Object.fromEntries(runtime.seats.map((s) => [s, counter.visibility === 'public' || s === seat ? counterOf(state, counter.name, s) : null])),
  }));
  return { spaces, pieces, roll: latestRoll(state), counters, out: runtime.seats.filter((s) => isOut(state, s)) };
}

/** Whether `seat` may press the button now; a rule that cannot be answered (“Go has no price.”) greys it with that sentence. */
function allowedNow(engine: GameEngine, state: GameState, seat: PlayerId, verb: string): true | string {
  try {
    const verdict = engine.canDispatch({ type: verb, by: seat });
    return verdict === true ? true : friendlyReason(verdict, state.turn?.current);
  } catch (e) {
    return friendlyError(e);
  }
}

/** The current phase's buttons in written order, each saying whether this seat may press it right now and if not why. */
function actionViews(engine: GameEngine, runtime: LangRuntime, state: GameState, seat: PlayerId): ActionView[] {
  const phase = runtime.game.phases.find((p) => p.id === state.turn?.phase);
  if (!phase) return [];
  // A seat that is out has nothing to press while the others play on; once the game is over the engine's own word wins.
  const out = isOut(state, seat) && state.result === undefined;
  return phase.actions.map((action): ActionView => {
    if (out) return { verb: action.verb, label: action.label, allowed: OUT_OF_GAME };
    return { verb: action.verb, label: action.label, allowed: allowedNow(engine, state, seat, action.verb) };
  });
}

/** The board and buttons as `seat` sees them in `state`, which is the engine's current state; the board is null for a game without one. */
export function seatExtras(engine: GameEngine, runtime: LangRuntime, state: GameState, seat: PlayerId): SeatExtras {
  return { board: boardView(runtime, state, seat), actions: actionViews(engine, runtime, state, seat) };
}

const isRecord = (v: unknown): v is { [k: string]: Json } => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number';
const isList = (v: unknown, each: (item: unknown) => boolean): boolean => Array.isArray(v) && v.every(each);
const isMap = (v: unknown, each: (item: unknown) => boolean): boolean => isRecord(v) && Object.values(v).every(each);

const isSpace = (v: unknown): boolean =>
  isRecord(v) && isText(v.name) && (v.color === null || isText(v.color)) && isRecord(v.details) && (v.owner === null || isText(v.owner));
const isCounter = (v: unknown): boolean =>
  isRecord(v) && isText(v.name) && isMap(v.values, (n) => n === null || isNumber(n));
const isBoard = (v: unknown): boolean =>
  isRecord(v) && isList(v.spaces, isSpace) && isMap(v.pieces, isNumber) && (v.roll === null || isList(v.roll, isNumber))
  && isList(v.counters, isCounter) && isList(v.out, isText);
const isAction = (v: unknown): boolean =>
  isRecord(v) && isText(v.verb) && isText(v.label) && (v.allowed === true || isText(v.allowed));

/** For the page: the extras of a view when they have the shape `seatExtras` makes, null for anything else. */
export function readSeatExtras(extras: Json | undefined): SeatExtras | null {
  if (!isRecord(extras) || !isList(extras.actions, isAction)) return null;
  if (extras.board !== null && !isBoard(extras.board)) return null;
  return extras as SeatExtras;
}
