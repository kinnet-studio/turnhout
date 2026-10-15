// What one seat sees of a board game beyond the table: the board with its pieces and numbers, and the seat's buttons.
// Everything here is plain `Json`, so the net layer can carry it in a view without knowing a board exists.
import type { GameEngine } from '../game-engine';
import { zoneCards, type GameState } from '../game-state';
import type { PlayerId } from '../scene';
import type { Json } from '../table-def';
import { bankItemOf } from './board';
import {
  bankOf, counterOf, gameNumber, isOut, lastDrawn, latestRoll, owedTo, ownerOf, pieceAt, playerFact, spaceFact, type Creditor, type LastDrawn,
} from './board-state';
import { cardName } from './card-facts';
import { amountPrompt, amountReady, targetCandidates } from './declared-actions';
import { friendlyError, friendlyReason } from './friendly';
import { secondPersonWords } from './refs';
import type { LangRuntime } from './runtime';
import type { DeclaredAction } from './types';
import { zoneIdFor } from './zones';

/**
 * `color` is the space's color when it is written as text; `details` is every other thing the table says about it. `facts` is
 * what has come to be true of it in play, only the ones that are set: a count other than 0, a flag that is on. `stripes` names the
 * flags among those (never a count) that no bank item goes with, in the order the game declares them, for the page to stripe the
 * space with; they stay in `facts` too, so the space's title still names them.
 */
export type SpaceView = {
  name: string; color: string | null; details: { [k: string]: Json }; facts: FactsView; stripes: string[]; owner: PlayerId | null;
};
/** One number per seat; null where the seat looking may not see it. */
export type CounterView = { name: string; values: { [seat: string]: number | null } };
/** What the bank has left of one thing; `name` is plural ('tokens'). */
export type BankView = { name: string; count: number };
/** What has come to be true of a thing, only the ones that are set. */
type FactsView = { [fact: string]: number | boolean };
/**
 * `pieces` lists the seats that still have a piece, so a player who is out is absent; `bank` is in the order the game declares it.
 * `playerFacts` has every seat of the game, `{}` for one with nothing set: what is true of a player is public, so every seat sees it.
 * `lastDrawn` is the card drawn last, null until one is; every seat sees the same one, since a drawn card is shown to the table.
 * `playerCards` has every seat of the game too, with the names of the cards the seat keeps in zones of its own that everyone can
 * see, `[]` for none. Nothing else about a card or a pile is in a view, least of all the order of a pile.
 * `owes` has an entry for each seat still in that owes someone, whom it owes; `{}` while no one does, and for a board with no
 * counter to pay with. Whom a player owes is public, so every seat sees the same.
 * `gameNumbers` lists the numbers that belong to the game itself and are not 0, in the order the game declares them; they are
 * public too, so every seat sees the same.
 */
export type BoardView = {
  spaces: SpaceView[]; pieces: { [seat: string]: number }; roll: number[] | null; counters: CounterView[]; out: PlayerId[]; bank: BankView[];
  playerFacts: { [seat: string]: FactsView }; lastDrawn: LastDrawn | null; playerCards: { [seat: string]: string[] };
  owes: { [seat: string]: Creditor };
  gameNumbers: { name: string; value: number }[];
};
/**
 * For a button that picks a space: what to ask the player, and every space its target phrase allows, by the space's place on
 * the board, each `true` when the move accepts it and otherwise the sentence for why it does not.
 */
export type TargetView = { prompt: string; spaces: { [space: string]: true | string } };
/**
 * `move` is the move type to send when the button is pressed. `allowed` is true when the button works now, otherwise the
 * sentence to show for why it does not; for a button that picks a space it is true when any space may be picked, and for a button
 * that carries an amount when only the amount is left to say. `target` is null for a button that picks no space. `amount` is true
 * for a button that carries an amount, which the player types before pressing it.
 */
export type ActionView = { move: string; label: string; allowed: true | string; target: TargetView | null; amount: boolean };
export type SeatExtras = { board: BoardView | null; actions: ActionView[] };

const OUT_OF_GAME = "You're out of the game.";

/**
 * The facts of one kind of thing that are set, in the order the game declares them, as `read` finds them: a fact never given a
 * value, a count of 0 and a flag that is off are all left out.
 */
function setFacts(runtime: LangRuntime, on: 'space' | 'player', read: (fact: string) => number | boolean | null): FactsView {
  const set: FactsView = {};
  for (const fact of runtime.game.facts) {
    if (fact.on !== on) continue;
    const value = read(fact.name);
    if (value !== null && value !== 0 && value !== false) set[fact.name] = value;
  }
  return set;
}

/**
 * What each seat keeps where everyone can see it: the names of the cards in its per-player zones that are public, zone by zone in
 * Table order and slot by slot. A zone only its owner can see, or nobody, is left out, and so is a zone shared by all.
 */
function cardsInView(runtime: LangRuntime, state: GameState): { [seat: string]: string[] } {
  const shown = runtime.game.zones.filter((zone) => zone.perPlayer && zone.visibility === 'public');
  return Object.fromEntries(runtime.seats.map((seat) => [
    seat, shown.flatMap((zone) => zoneCards(state, zoneIdFor(zone.name, seat)).map((card) => cardName(card, runtime.game))),
  ]));
}

/**
 * The flags set on a space that no bank item goes with, in the order the game declares them: the ones that are only ever set and
 * cleared, which the page shows on the space itself instead of counting them out of the bank. A count is never one of them, whether
 * or not the bank keeps something for it; it stays in `facts` for the page to count.
 */
function stripesOf(runtime: LangRuntime, facts: FactsView): string[] {
  const bank = runtime.game.board?.bank ?? [];
  return runtime.game.facts
    .filter((fact) => fact.on === 'space' && fact.kind === 'flag' && Object.hasOwn(facts, fact.name) && bankItemOf(fact, bank) === null)
    .map((fact) => fact.name);
}

/** Whom each seat still in owes, for the seats that owe anyone: the board's counter to pay with is the one a debt is kept against. */
function debtsIn(runtime: LangRuntime, state: GameState): { [seat: string]: Creditor } {
  const counter = runtime.game.board?.payWith ?? null;
  const owes: { [seat: string]: Creditor } = {};
  if (counter === null) return owes;
  for (const seat of runtime.seats) {
    const to = isOut(state, seat) ? null : owedTo(state, seat, counter);
    if (to !== null) owes[seat] = to;
  }
  return owes;
}

/** The numbers of the game that are not 0, in the order the game declares them: one at 0 is as good as none for the page to show. */
function gameNumbersIn(runtime: LangRuntime, state: GameState): { name: string; value: number }[] {
  return runtime.game.facts
    .filter((fact) => fact.on === 'game')
    .map(({ name }) => ({ name, value: gameNumber(state, runtime.game, name) }))
    .filter(({ value }) => value !== 0);
}

function boardView(runtime: LangRuntime, state: GameState, seat: PlayerId): BoardView | null {
  const { board } = runtime.game;
  if (!board) return null;
  const spaces = board.spaces.map((space, index): SpaceView => {
    const { color, ...rest } = space.attrs;
    // A color that is not text (a number, say) is not one to paint with, but it is still something the table says.
    const painted = typeof color === 'string';
    const details = painted || color === undefined ? rest : { ...rest, color };
    const facts = setFacts(runtime, 'space', (fact) => spaceFact(state, index, fact));
    return { name: space.name, color: painted ? color : null, details, facts, stripes: stripesOf(runtime, facts), owner: ownerOf(state, index) };
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
  const bank = board.bank.map(({ name }): BankView => ({ name, count: bankOf(state, name) }));
  const playerFacts = Object.fromEntries(runtime.seats.map((s) => [s, setFacts(runtime, 'player', (fact) => playerFact(state, s, fact))]));
  return {
    spaces, pieces, roll: latestRoll(state), counters, out: runtime.seats.filter((s) => isOut(state, s)), bank, playerFacts,
    lastDrawn: lastDrawn(state), playerCards: cardsInView(runtime, state), owes: debtsIn(runtime, state),
    gameNumbers: gameNumbersIn(runtime, state),
  };
}

/** What a rule says about the space a button picks, said to the player: 'a field they own' is 'a field you own'. */
const targetWords = (target: NonNullable<DeclaredAction['target']>): string => secondPersonWords(target.text.toLowerCase());
/** The same without its “a”, for saying there is none: “There is no field you own.” A target always starts with “a” or “an”. */
const noneWords = (target: NonNullable<DeclaredAction['target']>): string => targetWords(target).replace(/^an? /, '');
const pickPrompt = (target: NonNullable<DeclaredAction['target']>): string => `Pick ${targetWords(target)}`;

/**
 * Whether `seat` may press the button now, with the space it picks when it picks one; a rule that cannot be answered
 * (“Go has no price.”) greys it with that sentence.
 */
function allowedNow(engine: GameEngine, state: GameState, seat: PlayerId, move: string, target?: number): true | string {
  try {
    const verdict = engine.canDispatch({ type: move, by: seat, ...(target === undefined ? {} : { target }) });
    return verdict === true ? true : friendlyReason(verdict, state.turn?.current);
  } catch (e) {
    return friendlyError(e);
  }
}

/**
 * Which spaces a button that picks one may be pointed at, and the button's own verdict from them. A space the target phrase
 * allows is offered as pickable only when the move itself accepts it, so each one is asked of the engine; the button works when
 * any of them does, and otherwise says why the first does not, or that the player has nothing of the kind to pick, or why
 * the target phrase itself could not say.
 */
function pickingView(
  engine: GameEngine, runtime: LangRuntime, state: GameState, seat: PlayerId, action: DeclaredAction, target: NonNullable<DeclaredAction['target']>,
): { target: TargetView; allowed: true | string } {
  const view: TargetView = { prompt: pickPrompt(target), spaces: {} };
  // Once the game is over every button says so, as the ones that pick nothing do, whatever the player owns.
  const over = state.result === undefined ? null : friendlyReason('game is over');
  let candidates: number[];
  try {
    candidates = targetCandidates(runtime, action, state, seat);
  } catch (e) {
    // A target that cannot be answered greys the button with that sentence, as a rule that cannot be answered does.
    return { target: view, allowed: over ?? friendlyError(e) };
  }
  for (const space of candidates) view.spaces[space] = allowedNow(engine, state, seat, action.words, space);
  const verdicts = Object.values(view.spaces);
  if (verdicts.length === 0) return { target: view, allowed: over ?? `There is no ${noneWords(target)}.` };
  return { target: view, allowed: verdicts.includes(true) ? true : verdicts[0] };
}

/**
 * Whether `seat` may press a button that carries an amount, before any amount is typed: the move is asked with none, and when its
 * only objection is that there is none, the lines that do not read the amount say whether the button would work.
 */
function amountView(engine: GameEngine, runtime: LangRuntime, state: GameState, seat: PlayerId, action: DeclaredAction): true | string {
  const verdict = allowedNow(engine, state, seat, action.words);
  if (verdict !== amountPrompt(action)) return verdict;
  try {
    return amountReady(runtime, action, state, seat);
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
    const { words: move, label, target } = action;
    if (action.amount) return { move, label, allowed: out ? OUT_OF_GAME : amountView(engine, runtime, state, seat, action), target: null, amount: true };
    if (target === null) return { move, label, allowed: out ? OUT_OF_GAME : allowedNow(engine, state, seat, move), target: null, amount: false };
    if (out) return { move, label, allowed: OUT_OF_GAME, target: { prompt: pickPrompt(target), spaces: {} }, amount: false };
    const picking = pickingView(engine, runtime, state, seat, action, target);
    return { move, label, allowed: picking.allowed, target: picking.target, amount: false };
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

const isFact = (v: unknown): boolean => isNumber(v) || typeof v === 'boolean';
const isSpace = (v: unknown): boolean =>
  isRecord(v) && isText(v.name) && (v.color === null || isText(v.color)) && isRecord(v.details) && isMap(v.facts, isFact)
  && isList(v.stripes, isText) && (v.owner === null || isText(v.owner));
const isDrawn = (v: unknown): boolean => isRecord(v) && isText(v.seat) && isText(v.zone) && isText(v.name) && isText(v.says);
const isGameNumber = (v: unknown): boolean => isRecord(v) && isText(v.name) && isNumber(v.value);
const isBankLine = (v: unknown): boolean => isRecord(v) && isText(v.name) && isNumber(v.count);
const isCounter = (v: unknown): boolean =>
  isRecord(v) && isText(v.name) && isMap(v.values, (n) => n === null || isNumber(n));
const isBoard = (v: unknown): boolean =>
  isRecord(v) && isList(v.spaces, isSpace) && isMap(v.pieces, isNumber) && (v.roll === null || isList(v.roll, isNumber))
  && isList(v.counters, isCounter) && isList(v.out, isText) && isList(v.bank, isBankLine) && isMap(v.playerFacts, (facts) => isMap(facts, isFact))
  && (v.lastDrawn === null || isDrawn(v.lastDrawn)) && isMap(v.playerCards, (names) => isList(names, isText))
  && isMap(v.owes, isText) && isList(v.gameNumbers, isGameNumber);
const isVerdict = (v: unknown): boolean => v === true || isText(v);
const isTarget = (v: unknown): boolean => isRecord(v) && isText(v.prompt) && isMap(v.spaces, isVerdict);
const isAction = (v: unknown): boolean =>
  isRecord(v) && isText(v.move) && isText(v.label) && isVerdict(v.allowed) && (v.target === null || isTarget(v.target))
  && typeof v.amount === 'boolean';

/** For the page: the extras of a view when they have the shape `seatExtras` makes, null for anything else. */
export function readSeatExtras(extras: Json | undefined): SeatExtras | null {
  if (!isRecord(extras) || !isList(extras.actions, isAction)) return null;
  if (extras.board !== null && !isBoard(extras.board)) return null;
  return extras as SeatExtras;
}
