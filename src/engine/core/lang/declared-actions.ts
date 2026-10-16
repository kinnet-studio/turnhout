import { cardById, zoneCards, type GameState } from '../game-state';
import type { Move, MoveHandler } from '../moves';
import type { PlayerId } from '../scene';
import { addToCounter, clearTurnLog, counterOf, endsTurn, isOut, playersIn, recordAction } from './board-state';
import { moveZoneId, yours } from './declared-moves';
import { counted, secondPersonWords } from './refs';
import type { LangRuntime } from './runtime';
import type { CardPick, CompiledPhase, DeclaredAction, MoveInfo, Subject } from './types';
import { relocate, topCard, zoneInfo } from './zones';

const OUT = "You're out of the game.";

/**
 * What a refusal calls a button: its wording without the space it picks, in the second person. A button that picks a player is called
 * by its whole wording, since its base alone reads wrong (“You can't challenge now.”). A move no phase declares is called by itself.
 */
function calledBy(move: string, runtime: LangRuntime): string {
  const declared = runtime.game.phases.flatMap((p) => p.actions).find((a) => a.words === move);
  return secondPersonWords(declared?.picksPlayer ? declared.words : declared?.base ?? move);
}

/** The space the move picks, or null when it carries none that the board has. */
function pickedBy(m: Move, runtime: LangRuntime): number | null {
  const { target } = m;
  const spaces = runtime.game.board?.spaces.length ?? 0;
  return typeof target === 'number' && Number.isInteger(target) && target >= 0 && target < spaces ? target : null;
}

/**
 * The amount the move carries, or null when it carries none that is a whole number of 0 or more. It must be one that is exact,
 * too: past 2**53 two different numbers can be equal, and “more than” could not be trusted.
 */
function pickedAmount(m: Move): number | null {
  const { amount } = m;
  return typeof amount === 'number' && Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

/** What a button that carries an amount asks of the player who has not said how much. */
export function amountPrompt(action: DeclaredAction): string {
  return `Say how much to ${secondPersonWords(action.base)}.`;
}

/**
 * The player the move picks, or null when it names none that is a seat of the game, someone else than `by` and still in. The
 * move is the player's to make up, so every other kind of value is as good as none.
 */
function pickedPlayer(m: Move, runtime: LangRuntime, state: GameState, by: PlayerId): PlayerId | null {
  const { player } = m;
  return typeof player === 'string' && runtime.seats.includes(player) && player !== by && !isOut(state, player) ? player : null;
}

/** What a button that picks another player asks of the player who has not picked one. */
export function pickPlayerPrompt(action: DeclaredAction): string {
  return `Pick another player to ${secondPersonWords(action.base)}.`;
}

/** The cards a button picks; a caller that asks it of a button that picks none has a bug. */
function pickOf(action: DeclaredAction): CardPick {
  if (!action.pick) throw new Error(`The “${action.words}” button picks no card.`);
  return action.pick;
}

/** What a button that picks a card asks of the player who has not picked one it takes: “Pick a card from the shop to buy.” */
export function cardPrompt(action: DeclaredAction): string {
  const { to, onto, fromText } = pickOf(action);
  // “a card in” is how the designer wrote a pick whose card goes nowhere by itself.
  const where = to === null && onto === null ? 'in' : 'from';
  return `Pick a card ${where} ${yours(fromText)} to ${secondPersonWords(action.base)}.`;
}

/** Why a button that picks a card in a zone can't be pressed while the zone holds none. */
export const noCardIn = (zoneText: string): string => `There is no card in ${yours(zoneText)}.`;

/** Whether the zone is a pile, whose top card is the only one a move may take. */
const isPile = (runtime: LangRuntime, zoneId: string): boolean => zoneInfo(runtime.game, zoneId)?.spec.layout === 'pile';

/**
 * The cards a button that picks a card offers `seat`: the ids in the zone it picks from, in slot order, or only the top card of a
 * pile. None when that zone is no seat's at this table (“the other player's stash” at a table of three).
 */
export function cardCandidates(runtime: LangRuntime, action: DeclaredAction, state: GameState, seat: PlayerId): string[] {
  const zoneId = moveZoneId(pickOf(action).from, runtime.seats, seat);
  if (zoneId === null) return [];
  const ids = zoneCards(state, zoneId).map((card) => card.id);
  return isPile(runtime, zoneId) ? ids.slice(-1) : ids;
}

/** Who a press is about, and for a button that picks a card the move its lines read, as a card move's lines read theirs. */
type Press = { subject: Subject; info?: MoveInfo };

/**
 * The press of a button that picks a card, about the card it names: refused with the button's prompt unless `cardId` is a card on the
 * table, in the zone the button picks from for `by`, and the top card when that zone is a pile. Its lines see the card as the card a
 * move makes, from where it is to where the button puts it (the zone it is in, for a button that puts it nowhere), and “it” is the card.
 */
function aboutCards(action: DeclaredAction, pick: CardPick, runtime: LangRuntime, state: GameState, m: Move, by: PlayerId): Press | string {
  const { cardId } = m;
  const card = typeof cardId === 'string' ? cardById(state, cardId) : undefined;
  const from = moveZoneId(pick.from, runtime.seats, by);
  if (!card || from === null || card.zoneId !== from) return cardPrompt(action);
  if (isPile(runtime, from) && topCard(state, from)?.id !== card.id) return `You can only take the top card of ${yours(pick.fromText)}.`;
  const to = pick.to === null ? card.zoneId : moveZoneId(pick.to, runtime.seats, by);
  // Like a card move whose zone is no seat's at this table: no card the player could pick would change that.
  if (to === null) return `You can't ${secondPersonWords(action.base)} a card there.`;
  return { subject: { player: by, space: null, card: card.id }, info: { verb: action.verb, by, cardId: card.id, from: card.zoneId, to } };
}

/**
 * Who a button is about: the player who presses it and, through “it”, the space it picks, else the space their piece is on.
 * A button that picks a space is refused, in the player's words, when the move names none or one its target does not allow.
 * A button that carries an amount is refused, asking how much, when the move carries none; else the subject has the amount too.
 * A button that picks another player is refused, asking for one, when the move names no one else who is still in; else the subject
 * has that player too. A button that picks a card is about that card (see `aboutCards`).
 */
function aboutPress(action: DeclaredAction, runtime: LangRuntime, state: GameState, m: Move, by: PlayerId): Press | string {
  if (action.pick) return aboutCards(action, action.pick, runtime, state, m, by);
  if (action.amount) {
    const amount = pickedAmount(m);
    return amount === null ? amountPrompt(action) : { subject: { player: by, space: null, card: null, amount } };
  }
  if (action.picksPlayer) {
    const picked = pickedPlayer(m, runtime, state, by);
    return picked === null ? pickPlayerPrompt(action) : { subject: { player: by, space: null, card: null, picked } };
  }
  if (action.target === null) return { subject: { player: by, space: null, card: null } };
  const space = pickedBy(m, runtime);
  if (space === null) return `Pick where to ${secondPersonWords(action.base)}.`;
  const subject: Subject = { player: by, space, card: null };
  return runtime.allowsTarget(action.target, state, subject, space) ? { subject } : `That isn't ${secondPersonWords(action.target.text.toLowerCase())}.`;
}

/** Whether the button costs part of the turn budget: it is “an action”, the kind a veto may answer. */
export function hasCost(action: DeclaredAction): boolean {
  return action.cost !== undefined;
}

/** Why `by` can't pay the button's cost, in the words of an `Only if` line; null when they can, or when it costs nothing. */
export function costRefusal(action: DeclaredAction, state: GameState, by: PlayerId): string | null {
  const { cost } = action;
  if (!cost || counterOf(state, cost.counter, by) >= cost.amount) return null;
  return `they have at least ${counted(cost.amount, cost.counter)}`;
}

/** The state once `by` has paid the button's cost; the state itself for a button that costs nothing. */
export function payCost(action: DeclaredAction, state: GameState, by: PlayerId): GameState {
  const { cost } = action;
  return cost ? addToCounter(state, cost.counter, by, -cost.amount) : state;
}

/** The current phase's button whose move type is `move` and that allows it, with who it is about; else why not. */
function choose(
  move: string, runtime: LangRuntime, state: GameState, m: Move,
): ({ phase: CompiledPhase; action: DeclaredAction; by: PlayerId } & Press) | string {
  const phase = runtime.game.phases.find((p) => p.id === state.turn?.phase);
  const action = phase?.actions.find((a) => a.words === move);
  // Nobody can press a button without being someone at the table: a move with no player, or from a seat the game does not
  // have, is refused as if the button were not there. The turn gate lets a button any player may press through for anyone.
  const by = m.by as PlayerId | undefined;
  if (!phase || !action || typeof by !== 'string' || !runtime.seats.includes(by)) return `You can't ${calledBy(move, runtime)} now.`;
  if (isOut(state, by)) return OUT;
  const press = aboutPress(action, runtime, state, m, by);
  if (typeof press === 'string') return press;
  // The cost comes before every Only if, so that a button that can't be paid for says so whatever else it asks.
  return costRefusal(action, state, by) ?? runtime.failedGroup(action.conditions, state, press.info, press.subject) ?? { phase, action, by, ...press };
}

/**
 * The move handler for one button the designer declared, like “A player may roll the dice.” It refuses in the
 * designer's own words, then notes the action for the player (so “they have rolled this turn” holds) and runs its Then
 * lines. A button the After line names passes the turn, and with it everything done in the turn stops counting, unless its
 * lines left the phase, as going back to an interrupted turn does: the turn they went back to keeps what was done in it. A button
 * any player may press (“Any player may wave.”) may be sent by any seat still in, whoever's turn it is; it is no part of
 * anyone's turn, so it is not noted for the turn, and the After line can't name it. A button that picks a space
 * (“A player may plant a flag on a field they own.”) takes it from the move's `target`, the index of the space on the
 * board, and its lines are about that space. A button that carries an amount (“A player may raise an amount.”) takes it from the
 * move's `amount`, a whole number of 0 or more, and is refused before any `Only if` line is read when there is none. A button that
 * picks another player (“A player may challenge another player.”) takes it from the move's `player`, a seat other than the one
 * pressing that is still in, and is refused the same way when there is none. A button with a cost (“It costs 1 action.”) is refused,
 * after its pick and before any `Only if` line, when the player has less than it costs, and spends it before its Then lines. A button
 * that picks a card (“A player may buy a card from the shop to their stash.”) takes it from the move's `cardId`, and is refused the
 * same way when that is no card it takes; once paid for, the card moves to the button's zone, when it names one, before the Then
 * lines, which read it as a card move's lines read its card. Nobody is marked as having moved it: only trick games read that, and
 * they use card moves.
 */
export function declaredActionHandler(move: string, runtime: LangRuntime): MoveHandler {
  return {
    legal(state, m) {
      const choice = choose(move, runtime, state, m);
      return typeof choice === 'string' ? choice : true;
    },
    apply(state, m) {
      const choice = choose(move, runtime, state, m);
      if (typeof choice === 'string') throw new Error(`The “${move}” button was applied though it is not allowed: ${choice}`);
      const { phase, action, by, subject, info } = choice;
      // A press anyone may make is no part of anyone's turn, so it is not noted among what the player did in it.
      const recorded = action.anyone ? state : recordAction(state, by, move);
      // Spent first, so that the Then lines see what is left.
      const paid = payCost(action, recorded, by);
      const moved = action.pick?.to && info ? relocate(paid, [info.cardId], info.to, runtime.game) : paid;
      const done = action.effects.reduce((s, ref) => runtime.run(ref, s, info, undefined, subject), moved);
      // Only a turn of this phase passes: lines that went back to an interrupted turn leave that turn's log as it was.
      return endsTurn(phase, move) && done.turn?.phase === phase.id ? clearTurnLog(done) : done;
    },
  };
}

/**
 * The spaces the button's target phrase allows `seat` to pick, in board order; none for a button that picks no space. It
 * asks only the target phrase, so the button's `Only if` lines may still refuse a space it lists: a caller must ask the move
 * itself (`canDispatch` with the `target`) before offering a candidate as one the player can pick.
 */
export function targetCandidates(runtime: LangRuntime, action: DeclaredAction, state: GameState, seat: PlayerId): number[] {
  const { target } = action;
  if (target === null) return [];
  const spaces = Array.from({ length: runtime.game.board?.spaces.length ?? 0 }, (_, space) => space);
  return spaces.filter((space) => runtime.allowsTarget(target, state, { player: seat, space, card: null }, space));
}

/** The seats a button that picks another player may be pointed at for `seat`: every one still in but `seat`, in seat order. */
export function playerCandidates(runtime: LangRuntime, state: GameState, seat: PlayerId): PlayerId[] {
  return playersIn(state, runtime.seats).filter((other) => other !== seat);
}

/**
 * Whether `seat` could press the button once it says how much: true, or why not. It asks the cost first, then every `Only if` line
 * that does not read the amount, about the seat alone, and leaves the others, which can only be answered with an amount. A seat that is out
 * can press nothing. It asks nothing of the turn or the flow, which the engine's own gate decides.
 */
export function amountReady(runtime: LangRuntime, action: DeclaredAction, state: GameState, seat: PlayerId): true | string {
  if (isOut(state, seat)) return OUT;
  const waiting = action.conditions.filter((group) => !runtime.readsAmount(group));
  return costRefusal(action, state, seat) ?? runtime.failedGroup(waiting, state, undefined, { player: seat, space: null, card: null }) ?? true;
}
