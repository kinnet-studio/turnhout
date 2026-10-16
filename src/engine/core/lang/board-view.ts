// What one seat sees of a board game beyond the table: the board with its pieces and numbers, and the seat's buttons.
// Everything here is plain `Json`, so the net layer can carry it in a view without knowing a board exists.
import { isRevealed } from '../derive-scene';
import type { GameEngine } from '../game-engine';
import { cardById, zoneCards, type GameState } from '../game-state';
import type { Move } from '../moves';
import type { CardState, PlayerId } from '../scene';
import type { Json } from '../table-def';
import { bankItemOf } from './board';
import {
  bankOf, counterOf, gameNumber, interruptedTurn, isOut, lastDrawn, latestRoll, owedTo, ownerOf, pieceAt, playerFact, spaceFact, type Creditor, type LastDrawn,
} from './board-state';
import { cardFact, cardName, pickName } from './card-facts';
import { choicesOf, type AskedChoice } from './choices';
import {
  amountPrompt, amountReady, cardCandidates, cardPrompt, faceDownReady, noCardIn, ontoCandidates, ontoPrompt, playerCandidates, pressChoices,
  targetCandidates,
} from './declared-actions';
import { friendlyError, friendlyReason } from './friendly';
import { secondPersonWords } from './refs';
import type { LangRuntime } from './runtime';
import { startPlayerOf, usesTurns } from './turns';
import type { CompiledGame, DeclaredAction } from './types';
import { zoneIdFor, zoneInfo } from './zones';

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
 * see, `[]` for none. `playerCardFlags` runs parallel to it: for each card shown, the flags set on it, in the order the game
 * declares them. Nothing else about a card or a pile is in a view, least of all the order of a pile.
 * `owes` has an entry for each seat still in that owes someone, whom it owes; `{}` while no one does, and for a board with no
 * counter to pay with. Whom a player owes is public, so every seat sees the same.
 * `gameNumbers` lists the numbers that belong to the game itself and are not 0, in the order the game declares them; they are
 * public too, so every seat sees the same.
 * `interrupted` is true while another phase holds a turn that will be gone back to, which the page says in a seat's status so a
 * phase that is not the first is not mistaken for the game's ordinary turns.
 * `startPlayer` is the seat that takes each round's first turn, null in a game that does not take turns; every seat sees the same.
 */
export type BoardView = {
  spaces: SpaceView[]; pieces: { [seat: string]: number }; roll: number[] | null; counters: CounterView[]; out: PlayerId[]; bank: BankView[];
  playerFacts: { [seat: string]: FactsView }; lastDrawn: LastDrawn | null; playerCards: { [seat: string]: string[] };
  playerCardFlags: { [seat: string]: string[][] }; owes: { [seat: string]: Creditor };
  gameNumbers: { name: string; value: number }[]; interrupted: boolean; startPlayer: PlayerId | null;
};
/**
 * For a button that picks a space: what to ask the player, and every space its target phrase allows, by the space's place on
 * the board, each `true` when the move accepts it and otherwise the sentence for why it does not.
 */
export type TargetView = { prompt: string; spaces: { [space: string]: true | string } };
/**
 * A choice a press asks, as the view shows it: `at` is its place in the move's `choices`, `prompt` what to ask, and each value that
 * may answer it with the engine's verdict on the press given that value and every other choice's first option.
 */
export type ChoiceView = { at: number; prompt: string; options: { value: string; allowed: true | string }[] };
/**
 * A card a button may pick, by its id: `name` is how the seat sees it, and `allowed` is true when the move takes it, else why not.
 * `choices` is there only when the press of the card asks a choice: of the card alone, or of the card with this one as its target in
 * `onto.targets`. A card is allowed when only a choice is missing: the engine is asked with each choice at its first option.
 */
export type PickCardView = { id: string; name: string; allowed: true | string; choices?: ChoiceView[] };
/**
 * For a button that picks cards: what to ask the player, without its period, and every card it may pick, each judged alone. `some` is
 * true for a set. `onto` is null for a button that picks no card for the cards to go to; for one that does, it has what to ask once
 * the cards are picked, and for each card every card it may go to, judged with that card alone. A card may be picked when any of its
 * targets takes it.
 */
export type CardPickView = {
  some: boolean; prompt: string; cards: PickCardView[]; onto: { prompt: string; targets: { [cardId: string]: PickCardView[] } } | null;
};
/**
 * `move` is the move type to send when the button is pressed. `allowed` is true when the button works now, otherwise the
 * sentence to show for why it does not; for a button that picks a space it is true when any space may be picked, and for a button
 * that carries an amount when only the amount is left to say, and for a button that picks another player when any player may be
 * picked, and for a button that picks a card when any card may be. `target` is null for a button that picks no space. `amount` is
 * true for a button that carries an amount, which the player types before pressing it. `players` is null for every button but one
 * that picks another player; for that one it has each player to pick, `true` when the move accepts that player and otherwise the
 * sentence for why it does not. `cards` is there only on a button that picks a card: the cards to pick from. `choices` is there only
 * on a button that picks nothing whose press asks a choice; it is allowed when only a choice is missing, as a card is.
 */
export type ActionView = {
  move: string; label: string; allowed: true | string; target: TargetView | null; amount: boolean; players: { [seat: string]: true | string } | null;
  cards?: CardPickView; choices?: ChoiceView[];
};
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
 * The cards each seat keeps where everyone can see them: those in its per-player zones that are public, zone by zone in Table
 * order and slot by slot. A zone only its owner can see, or nobody, is left out, and so is a zone shared by all.
 */
function cardsKept(runtime: LangRuntime, state: GameState): { [seat: string]: CardState[] } {
  const shown = runtime.game.zones.filter((zone) => zone.perPlayer && zone.visibility === 'public');
  return Object.fromEntries(runtime.seats.map((seat) => [seat, shown.flatMap((zone) => zoneCards(state, zoneIdFor(zone.name, seat)))]));
}

/** The flags set on a card (`true`, not merely given a value), in the order the game declares them. */
function flagsOnCard(runtime: LangRuntime, card: CardState): string[] {
  return runtime.game.facts.filter((fact) => fact.on === 'card' && fact.kind === 'flag' && cardFact(card, fact.name) === true).map((fact) => fact.name);
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

/**
 * The seat that takes each round's first turn: the one Setup chose, else the first seat, which starts a game of turns that has no
 * line choosing. Null in a game that does not take turns, where no seat starts anything.
 */
function startPlayerIn(runtime: LangRuntime, state: GameState): PlayerId | null {
  return usesTurns(runtime.game) ? startPlayerOf(state, runtime.seats) : null;
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
  const kept = Object.entries(cardsKept(runtime, state));
  return {
    spaces, pieces, roll: latestRoll(state), counters, out: runtime.seats.filter((s) => isOut(state, s)), bank, playerFacts,
    lastDrawn: lastDrawn(state), owes: debtsIn(runtime, state),
    playerCards: Object.fromEntries(kept.map(([s, cards]) => [s, cards.map((card) => cardName(card, runtime.game))])),
    playerCardFlags: Object.fromEntries(kept.map(([s, cards]) => [s, cards.map((card) => flagsOnCard(runtime, card))])),
    gameNumbers: gameNumbersIn(runtime, state), interrupted: interruptedTurn(state) !== null, startPlayer: startPlayerIn(runtime, state),
  };
}

/** What a rule says about the space a button picks, said to the player: 'a field they own' is 'a field you own'. */
const targetWords = (target: NonNullable<DeclaredAction['target']>): string => secondPersonWords(target.text.toLowerCase());
/** The same without its “a”, for saying there is none: “There is no field you own.” A target always starts with “a” or “an”. */
const noneWords = (target: NonNullable<DeclaredAction['target']>): string => targetWords(target).replace(/^an? /, '');
const pickPrompt = (target: NonNullable<DeclaredAction['target']>): string => `Pick ${targetWords(target)}`;

/** What a press picks, and the choices it names: each part goes on the move only when it is given. */
type Pick = { target?: number; player?: PlayerId; cardId?: string; cardIds?: string[]; onto?: string; choices?: (string | null)[] };

/** The move `seat` sends to press the button `move` with `pick`. */
function pressOf(seat: PlayerId, move: string, pick: Pick): Move {
  return { type: move, by: seat, ...Object.fromEntries(Object.entries(pick).filter(([, value]) => value !== undefined)) };
}

/**
 * Whether `seat` may press the button now, with the space, the player or the cards it picks when it picks any, and the choices it names;
 * a rule that cannot be answered (“Go has no price.”) greys it with that sentence.
 */
function allowedNow(engine: GameEngine, state: GameState, seat: PlayerId, move: string, pick: Pick = {}): true | string {
  try {
    const verdict = engine.canDispatch(pressOf(seat, move, pick));
    return verdict === true ? true : friendlyReason(verdict, state.turn?.current);
  } catch (e) {
    return friendlyError(e);
  }
}

/**
 * The choices the press asks, as `pressChoices` finds them; none for a button whose lines ask none, and none for a press the button
 * refuses before they are asked, or that a rule can't answer, whose verdict says so without them.
 */
function askedOf(runtime: LangRuntime, state: GameState, seat: PlayerId, action: DeclaredAction, pick: Pick): AskedChoice[] {
  if (choicesOf(action).length === 0) return [];
  try {
    const asked = pressChoices(runtime, state, pressOf(seat, action.words, pick));
    return typeof asked === 'string' ? [] : asked;
  } catch {
    return [];
  }
}

/**
 * Whether `seat` may press the button with `pick` now, and the choices that press asks with the engine's verdict on each answer. The
 * press is asked of the engine with every asked choice at its first option and null elsewhere, so that a press whose only missing piece
 * is a choice is allowed (R1); each answer, with the other choices at their first options. `choices` is left out when none is asked.
 */
function pressView(
  engine: GameEngine, runtime: LangRuntime, state: GameState, seat: PlayerId, action: DeclaredAction, pick: Pick = {},
): { allowed: true | string; choices?: ChoiceView[] } {
  const asked = askedOf(runtime, state, seat, action, pick);
  if (asked.length === 0) return { allowed: allowedNow(engine, state, seat, action.words, pick) };
  const first: (string | null)[] = Array.from({ length: choicesOf(action).length }, () => null);
  for (const { at, options } of asked) first[at] = options[0];
  const allowed = allowedNow(engine, state, seat, action.words, { ...pick, choices: first });
  const answering = (at: number, value: string): true | string => (value === first[at]
    ? allowed
    : allowedNow(engine, state, seat, action.words, { ...pick, choices: first.map((given, i) => (i === at ? value : given)) }));
  const choices = asked.map(({ at, prompt, options }): ChoiceView => ({
    at, prompt, options: options.map((value) => ({ value, allowed: answering(at, value) })),
  }));
  return { allowed, choices };
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
  for (const space of candidates) view.spaces[space] = allowedNow(engine, state, seat, action.words, { target: space });
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

/**
 * Which players a button that picks another player may be pointed at, and the button's own verdict from them. Each player still
 * in but `seat` is asked of the engine, as the move would be sent; the button works when any of them does, and otherwise says why
 * the first does not. With no one to pick it says what the move says without a pick.
 */
function playersView(
  engine: GameEngine, runtime: LangRuntime, state: GameState, seat: PlayerId, action: DeclaredAction,
): { players: { [seat: string]: true | string }; allowed: true | string } {
  const players: { [seat: string]: true | string } = {};
  for (const other of playerCandidates(runtime, state, seat)) players[other] = allowedNow(engine, state, seat, action.words, { player: other });
  const verdicts = Object.values(players);
  // Once the game is over every button says so, as the ones that pick nothing do, whoever is left to pick.
  const over = state.result === undefined ? null : friendlyReason('game is over');
  if (verdicts.length === 0) return { players, allowed: over ?? allowedNow(engine, state, seat, action.words) };
  return { players, allowed: over ?? (verdicts.includes(true) ? true : verdicts[0]) };
}

/**
 * Whether `seat` sees the card's face: the table's own rule (`isRevealed`), asked of the card's zone as the table lays it out, with the
 * zone's visibility and its seat as owner, or 'shared'.
 */
export function seesFace(game: CompiledGame, card: CardState, seat: PlayerId): boolean {
  const zone = zoneInfo(game, card.zoneId);
  return isRevealed(card, zone ? { visibility: zone.spec.visibility, owner: zone.seat ?? 'shared' } : undefined, seat);
}

/** A card as `seat` sees it among the cards to pick: by its name, or as a face-down card when its face is hidden from the seat. */
function pickedAs(runtime: LangRuntime, state: GameState, seat: PlayerId, id: string): { id: string; name: string; seen: boolean } {
  const card = cardById(state, id)!;
  const seen = seesFace(runtime.game, card, seat);
  return { id, name: seen ? pickName(card, runtime.game) : 'a face-down card', seen };
}

/**
 * Whether `seat` could pick cards it can't see all of: `cardless`, the move pressed with no card, answers for all that is no card's (the
 * turn, the phase, the game being over), and the rest is judged without the lines that read any card of the press, so that the verdict
 * is the same for every such card and gives none of them away.
 */
function faceDownVerdict(
  runtime: LangRuntime, state: GameState, seat: PlayerId, action: DeclaredAction, cardless: true | string, cardId: string, onto?: string,
): true | string {
  if (cardless !== cardPrompt(action)) return cardless;
  try {
    return faceDownReady(runtime, action, state, seat, cardId, onto);
  } catch (e) {
    return friendlyError(e);
  }
}

/**
 * Whether `seat` may press the button with `cardId`, alone for a set, and with `onto` for a button that picks a card for it to go to,
 * and the choices that press asks (see `pressView`): the engine's verdict on that move when the seat sees every card of it, else the
 * verdict `faceDownVerdict` gives with `cardless`, the verdict on the move with no card, asked only once one is needed, and no choices,
 * since what a press asks may hang on its card.
 */
function pickVerdict(
  engine: GameEngine, runtime: LangRuntime, state: GameState, seat: PlayerId, action: DeclaredAction, cardless: () => true | string,
  card: { id: string; seen: boolean }, onto?: { id: string; seen: boolean },
): { allowed: true | string; choices?: ChoiceView[] } {
  if (!card.seen || (onto && !onto.seen)) return { allowed: faceDownVerdict(runtime, state, seat, action, cardless(), card.id, onto?.id) };
  const cards = action.pick!.some ? { cardIds: [card.id] } : { cardId: card.id };
  return pressView(engine, runtime, state, seat, action, { ...cards, onto: onto?.id });
}

/** A prompt as the view gives it, without its period. */
const unstopped = (prompt: string): string => prompt.replace(/\.$/, '');

/**
 * Which cards a button that picks cards may be pointed at, and the button's own verdict from them. Each card the seat can see is asked of
 * the engine with the card (alone, for a set), as the move would be sent; the button works when any card does, and otherwise says why
 * the first does not, or that there is no card to pick. For a button that picks a card for the cards to go to, each card is asked with
 * each such card in turn, and works when any of them does, else says why the first does not, or that there is none. A card the seat
 * can't see is offered by its id as a face-down card, judged by nothing about the cards of the press (see `faceDownVerdict`), so that
 * the view tells nothing the table hides. A seat that is out picks nothing.
 */
function cardPickView(
  engine: GameEngine, runtime: LangRuntime, state: GameState, seat: PlayerId, action: DeclaredAction,
): { cards: CardPickView; allowed: true | string } {
  const { some, fromText, ontoText } = action.pick!;
  // The zone of the card they go to, as written, beside what the view says of it.
  const placing = ontoText === null
    ? null
    : { ontoText, view: { prompt: unstopped(ontoPrompt(action)), targets: {} as { [cardId: string]: PickCardView[] } } };
  const view: CardPickView = { some, prompt: unstopped(cardPrompt(action)), cards: [], onto: placing?.view ?? null };
  if (isOut(state, seat) && state.result === undefined) return { cards: view, allowed: OUT_OF_GAME };
  // The move with no card says the same for every card the seat can't see, so it is asked once for the button, and only if one is listed.
  let asked: true | string | undefined;
  const cardless = () => (asked ??= allowedNow(engine, state, seat, action.words));
  const targets = placing === null ? [] : ontoCandidates(runtime, action, state, seat).map((id) => pickedAs(runtime, state, seat, id));
  for (const id of cardCandidates(runtime, action, state, seat)) {
    const { seen, ...card } = pickedAs(runtime, state, seat, id);
    if (placing === null) {
      view.cards.push({ ...card, ...pickVerdict(engine, runtime, state, seat, action, cardless, { id, seen }) });
      continue;
    }
    const goes = targets.map(({ seen: shown, ...target }) => ({
      ...target, ...pickVerdict(engine, runtime, state, seat, action, cardless, { id, seen }, { id: target.id, seen: shown }),
    }));
    placing.view.targets[id] = goes;
    view.cards.push({ ...card, allowed: goes.some((t) => t.allowed === true) ? true : goes[0]?.allowed ?? noCardIn(placing.ontoText) });
  }
  // Once the game is over every button says so, as the ones that pick nothing do, whatever is left to pick.
  if (state.result !== undefined) return { cards: view, allowed: friendlyReason('game is over') };
  if (view.cards.length === 0) return { cards: view, allowed: noCardIn(fromText) };
  return { cards: view, allowed: view.cards.some((c) => c.allowed === true) ? true : view.cards[0].allowed };
}

/** The current phase's buttons in written order, each saying whether this seat may press it right now and if not why. */
function actionViews(engine: GameEngine, runtime: LangRuntime, state: GameState, seat: PlayerId): ActionView[] {
  const phase = runtime.game.phases.find((p) => p.id === state.turn?.phase);
  if (!phase) return [];
  // A seat that is out has nothing to press while the others play on; once the game is over the engine's own word wins.
  const out = isOut(state, seat) && state.result === undefined;
  return phase.actions.map((action): ActionView => {
    const { words: move, label, target } = action;
    if (action.pick) {
      const picking = cardPickView(engine, runtime, state, seat, action);
      return { move, label, allowed: picking.allowed, target: null, amount: false, players: null, cards: picking.cards };
    }
    if (action.amount) {
      return { move, label, allowed: out ? OUT_OF_GAME : amountView(engine, runtime, state, seat, action), target: null, amount: true, players: null };
    }
    if (action.picksPlayer) {
      if (out) return { move, label, allowed: OUT_OF_GAME, target: null, amount: false, players: {} };
      const picking = playersView(engine, runtime, state, seat, action);
      return { move, label, allowed: picking.allowed, target: null, amount: false, players: picking.players };
    }
    if (target === null) {
      if (out) return { move, label, allowed: OUT_OF_GAME, target: null, amount: false, players: null };
      return { move, label, ...pressView(engine, runtime, state, seat, action), target: null, amount: false, players: null };
    }
    if (out) return { move, label, allowed: OUT_OF_GAME, target: { prompt: pickPrompt(target), spaces: {} }, amount: false, players: null };
    const picking = pickingView(engine, runtime, state, seat, action, target);
    return { move, label, allowed: picking.allowed, target: picking.target, amount: false, players: null };
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
  && isMap(v.playerCardFlags, (cards) => isList(cards, (flags) => isList(flags, isText)))
  && isMap(v.owes, isText) && isList(v.gameNumbers, isGameNumber) && typeof v.interrupted === 'boolean'
  && (v.startPlayer === null || isText(v.startPlayer));
const isVerdict = (v: unknown): boolean => v === true || isText(v);
const isTarget = (v: unknown): boolean => isRecord(v) && isText(v.prompt) && isMap(v.spaces, isVerdict);
const isAnswer = (v: unknown): boolean => isRecord(v) && isText(v.value) && isVerdict(v.allowed);
const isChoice = (v: unknown): boolean => isRecord(v) && isNumber(v.at) && isText(v.prompt) && isList(v.options, isAnswer);
/** A view's `choices`, which may be left out. */
const isChoices = (v: unknown): boolean => v === undefined || isList(v, isChoice);
const isPickCard = (v: unknown): boolean => isRecord(v) && isText(v.id) && isText(v.name) && isVerdict(v.allowed) && isChoices(v.choices);
const isOnto = (v: unknown): boolean => isRecord(v) && isText(v.prompt) && isMap(v.targets, (cards) => isList(cards, isPickCard));
const isCardPick = (v: unknown): boolean =>
  isRecord(v) && typeof v.some === 'boolean' && isText(v.prompt) && isList(v.cards, isPickCard) && (v.onto === null || isOnto(v.onto));
const isAction = (v: unknown): boolean =>
  isRecord(v) && isText(v.move) && isText(v.label) && isVerdict(v.allowed) && (v.target === null || isTarget(v.target))
  && typeof v.amount === 'boolean' && (v.players === null || isMap(v.players, isVerdict)) && (v.cards === undefined || isCardPick(v.cards))
  && isChoices(v.choices);

/** For the page: the extras of a view when they have the shape `seatExtras` makes, null for anything else. */
export function readSeatExtras(extras: Json | undefined): SeatExtras | null {
  if (!isRecord(extras) || !isList(extras.actions, isAction)) return null;
  if (extras.board !== null && !isBoard(extras.board)) return null;
  return extras as SeatExtras;
}
