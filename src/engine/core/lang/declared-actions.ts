import type { GameState } from '../game-state';
import { cardById, zoneCards } from './zone-index';
import type { Move, MoveHandler } from '../moves';
import type { CardState, PlayerId } from '../scene';
import { addToCounter, clearTurnLog, counterOf, endsTurn, isOut, playersIn, recordAction } from './board-state';
import { askChoices, choicesOf, fillChoices, type AskedChoice, type ChoiceOption } from './choices';
import { isPile, isTakeable, moveZoneId, yours } from './declared-moves';
import { RuleError } from './diagnostics';
import { canon, counted, joinAnd, joinOr, secondPersonWords } from './refs';
import type { LangRuntime } from './runtime';
import type { CardPick, CompiledPhase, DeclaredAction, MoveInfo, Subject, ZoneRef } from './types';
import { relocate } from './zones';

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

/**
 * What a button that picks cards asks of the player who has not picked what it takes: “Pick a card from the shop to buy.”, and for a
 * set “Pick one or more cards from your stash to trade.”
 */
export function cardPrompt(action: DeclaredAction): string {
  const { some, to, onto, fromText } = pickOf(action);
  const doing = secondPersonWords(action.base);
  if (some) return `Pick one or more cards from ${yours(fromText)} to ${doing}.`;
  // “a card in” is how the designer wrote a pick whose card goes nowhere by itself.
  const where = to === null && onto === null ? 'in' : 'from';
  return `Pick a card ${where} ${yours(fromText)} to ${doing}.`;
}

/** The zone a button picks the card its cards go to in, as written too; a caller that asks it of a button that picks none has a bug. */
function ontoOf(action: DeclaredAction): { onto: ZoneRef; ontoText: string } {
  const { onto, ontoText } = pickOf(action);
  if (onto === null || ontoText === null) throw new Error(`The “${action.words}” button picks no card for its cards to go to.`);
  return { onto, ontoText };
}

/** What a button that picks a card for its cards to go to asks of the player who has not picked one it takes. */
export function ontoPrompt(action: DeclaredAction): string {
  return `Pick where ${pickOf(action).some ? 'they go' : 'it goes'}: a card in ${yours(ontoOf(action).ontoText)}.`;
}

/** Why a button that picks a card in a zone can't be pressed while the zone holds none. */
export const noCardIn = (zoneText: string): string => `There is no card in ${yours(zoneText)}.`;

/** The ids in the zone `zone` names for `seat` that a move may take, in slot order: only the top card of a pile. None for no seat's zone. */
function takeableIds(runtime: LangRuntime, zone: ZoneRef, state: GameState, seat: PlayerId): string[] {
  const zoneId = moveZoneId(zone, runtime.seats, seat);
  if (zoneId === null) return [];
  const ids = zoneCards(state, zoneId).map((card) => card.id);
  return isPile(runtime.game, zoneId) ? ids.slice(-1) : ids;
}

/**
 * The cards a button that picks cards offers `seat`: the ids in the zone it picks from, in slot order, or only the top card of a
 * pile. None when that zone is no seat's at this table (“the other player's stash” at a table of three).
 */
export function cardCandidates(runtime: LangRuntime, action: DeclaredAction, state: GameState, seat: PlayerId): string[] {
  return takeableIds(runtime, pickOf(action).from, state, seat);
}

/** The cards a button that picks a card for its cards to go to offers `seat` as that card, as `cardCandidates` offers the cards. */
export function ontoCandidates(runtime: LangRuntime, action: DeclaredAction, state: GameState, seat: PlayerId): string[] {
  return takeableIds(runtime, ontoOf(action).onto, state, seat);
}

/**
 * Who a press is about; for a button that picks one card, the move its lines read, as a card move's lines read theirs; and for a
 * button whose cards go to a zone, which cards go where, in the order they go.
 */
type Press = { subject: Subject; info?: MoveInfo; relocation?: { ids: string[]; to: string } };

/** The card `id` names, when it is on the table in the zone `zone` names for `by`. */
function cardIn(runtime: LangRuntime, state: GameState, zone: ZoneRef, by: PlayerId, id: unknown): CardState | undefined {
  const card = typeof id === 'string' ? cardById(state, id) : undefined;
  const zoneId = moveZoneId(zone, runtime.seats, by);
  return card && zoneId !== null && card.zoneId === zoneId ? card : undefined;
}

/** Why the button can't put cards in its zone: the zone is no seat's at this table, which no card the player could pick would change. */
const nowhere = (action: DeclaredAction, pick: CardPick) => `You can't ${secondPersonWords(action.base)} ${pick.some ? 'cards' : 'a card'} there.`;

/**
 * The press of a button that picks one card, about the card it names: refused with the button's prompt unless `cardId` is a card on
 * the table, in the zone the button picks from for `by`, and the top card when that zone is a pile. Its lines see the card as the card a
 * move makes, from where it is to where the button puts it (the zone it is in, for a button that puts it nowhere), and “it” is the card.
 */
function aboutCard(action: DeclaredAction, pick: CardPick, runtime: LangRuntime, state: GameState, m: Move, by: PlayerId): Press | string {
  const card = cardIn(runtime, state, pick.from, by, m.cardId);
  if (!card) return cardPrompt(action);
  if (!isTakeable(runtime.game, state, card)) return `You can only take the top card of ${yours(pick.fromText)}.`;
  const to = pick.to === null ? card.zoneId : moveZoneId(pick.to, runtime.seats, by);
  if (to === null) return nowhere(action, pick);
  const info: MoveInfo = { verb: action.verb, by, cardId: card.id, from: card.zoneId, to };
  return { subject: { player: by, space: null, card: card.id }, info, ...(pick.to === null ? {} : { relocation: { ids: [card.id], to } }) };
}

/**
 * The press of a button that picks a set, about the cards it names: refused with the button's prompt unless `cardIds` names one or
 * more cards, none twice, each a card the button could pick alone. Its lines have no one card, only the picked cards, in the press's order.
 */
function aboutSet(action: DeclaredAction, pick: CardPick, runtime: LangRuntime, state: GameState, m: Move, by: PlayerId): Press | string {
  const { cardIds } = m;
  const named = Array.isArray(cardIds) && cardIds.length > 0 && new Set(cardIds).size === cardIds.length;
  const cards = named ? cardIds.map((id) => cardIn(runtime, state, pick.from, by, id)) : [];
  if (cards.length === 0 || !cards.every((card) => card !== undefined && isTakeable(runtime.game, state, card))) return cardPrompt(action);
  const ids = (cards as CardState[]).map((card) => card.id);
  const to = pick.to === null ? null : moveZoneId(pick.to, runtime.seats, by);
  if (pick.to !== null && to === null) return nowhere(action, pick);
  return { subject: { player: by, space: null, card: null, cards: ids }, ...(to === null ? {} : { relocation: { ids, to } }) };
}

/**
 * The press of a button that picks cards: one card or a set, then, for a button that picks a card for them to go to, that card,
 * refused with its own prompt unless `onto` is a card on the table in the zone the button picks it in for `by` (the top card of a pile),
 * other than the cards picked. Its lines read it as “the target card”.
 */
function aboutCards(action: DeclaredAction, pick: CardPick, runtime: LangRuntime, state: GameState, m: Move, by: PlayerId): Press | string {
  const press = (pick.some ? aboutSet : aboutCard)(action, pick, runtime, state, m, by);
  if (typeof press === 'string' || pick.onto === null) return press;
  const target = cardIn(runtime, state, pick.onto, by, m.onto);
  const picked = press.subject.cards ?? [press.subject.card];
  if (!target || !isTakeable(runtime.game, state, target) || picked.includes(target.id)) return ontoPrompt(action);
  return { ...press, subject: { ...press.subject, onto: target.id } };
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

/** A press the button's lines allow, with the button, its phase, who presses it and who it is about. */
type Allowed = { phase: CompiledPhase; action: DeclaredAction; by: PlayerId } & Press;

/**
 * The current phase's button whose move type is `move`, with who the press `m` is about, when its pick, cost and `Only if` lines allow
 * it; else why not. What its choices come to is not asked yet.
 */
function pressUpToChoices(move: string, runtime: LangRuntime, state: GameState, m: Move): Allowed | string {
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
 * The current phase's button whose move type is `move` and that allows it, with who it is about; else why not. A button whose `Then:`
 * lines ask for choices is allowed only once each choice its press asks is answered: filled in when one player or option qualifies,
 * else named by the move's `choices`. They are judged on the state before the press, as its `Only if` lines are, so that replaying a
 * move that named none fills in the same.
 */
function choose(move: string, runtime: LangRuntime, state: GameState, m: Move): Allowed | string {
  const press = pressUpToChoices(move, runtime, state, m);
  if (typeof press === 'string') return press;
  const count = choicesOf(press.action).length;
  if (count === 0) return press;
  const choices = fillChoices(askChoices(runtime, press.action, state, press.info, press.subject), count, m.choices);
  return typeof choices === 'string' ? choices : { ...press, subject: { ...press.subject, choices } };
}

/**
 * The choices the press of `move` asks, or why the button refuses it before they are asked: by its pick, its cost or an `Only if` line.
 * None for a button whose lines ask for none. Like a press, it asks nothing of the turn or the flow, which the engine's own gate decides.
 */
export function pressChoices(runtime: LangRuntime, state: GameState, move: Move): AskedChoice[] | string {
  const press = pressUpToChoices(move.type, runtime, state, move);
  return typeof press === 'string' ? press : askChoices(runtime, press.action, state, press.info, press.subject);
}

/** What an example is told when it names choices for a move no button makes, which would otherwise be sent without them. */
const NO_BUTTON = 'Only the press of a button can name choices, and this move presses none.';

/**
 * Why the players an example names after “paying” fit the player choices its press makes neither way: one for each choice asked among
 * several players, or one for every choice.
 */
function misnamedPlayers(players: string[], payees: AskedChoice[], among: AskedChoice[]): string {
  if (payees.length === 0) return `“paying ${joinAnd(players)}” isn't a choice here: this press chooses no player.`;
  if (among.length === payees.length) return `The press asks for ${counted(payees.length, 'players')}, but the example names ${players.length}.`;
  const alone = payees.filter((choice) => choice.options.length === 1).map((choice) => choice.options[0]);
  const filledIn = alone.length === 1 ? `${alone[0]}, the only one who qualifies` : `${joinAnd(alone)}, each the only one who qualifies`;
  const asks = among.length === 0 ? 'no player' : counted(among.length, 'players');
  return `The press asks for ${asks} and fills in ${filledIn}, but the example names ${players.length}. `
    + `Name ${among.length === 0 ? 'none' : among.length}, or all ${payees.length}.`;
}

/**
 * The `choices` of a press an example makes (“…, paying p1 and p2, choosing trim 2 gold”), from what it names: `players` fill the
 * choices of a player the press asks among several, in order, since one only a single player qualifies for is filled in as the press
 * fills it, and `option` the first block it asks that has that option, whatever its case. An example may also name a player for every
 * choice of a player the press makes, in order. A choice named nothing is left null, to be filled in or asked for as the press would be.
 * A player is sent as named, and so is an option of the block that doesn't hold for this press, so that each is refused with the
 * prompt, as a press that names it would be. Null when nothing is named, and when the button refuses the press before its choices are
 * asked: the move is then sent as it is, for the game to say why. An example is told when it names choices for a move that presses no
 * button, players that fit its choices neither way, or an option that no block it asks has, since a value for a choice that is not
 * asked would be ignored.
 */
export function namedChoices(runtime: LangRuntime, state: GameState, move: Move, players: string[], option: string | null): (string | null)[] | null {
  if (players.length === 0 && option === null) return null;
  if (!runtime.game.phases.some((phase) => phase.actions.some((action) => action.words === move.type))) throw new RuleError(NO_BUTTON);
  const press = pressUpToChoices(move.type, runtime, state, move);
  if (typeof press === 'string') return null;
  const asked = askChoices(runtime, press.action, state, press.info, press.subject);
  const choices: (string | null)[] = Array.from({ length: choicesOf(press.action).length }, () => null);
  const payees = asked.filter((choice) => choice.kind === 'player');
  const among = payees.filter((choice) => choice.options.length > 1);
  const named = players.length <= among.length ? among : players.length === payees.length ? payees : null;
  if (named === null) throw new RuleError(misnamedPlayers(players, payees, among));
  players.forEach((seat, i) => { choices[named[i].at] = seat; });
  if (option === null) return choices;
  const blocks = asked.filter((choice) => choice.kind === 'option');
  if (blocks.length === 0) throw new RuleError(`“${option}” isn't a choice here: this press chooses nothing.`);
  // Every option of an asked block, as written, whether or not it holds for this press.
  const labelsOf = ({ at }: AskedChoice): string[] =>
    (choicesOf(press.action).find((ref) => ref.args[0] === at)!.args[2] as ChoiceOption[]).map((choice) => choice.label);
  const has = (label: string) => canon(label) === canon(option);
  const block = blocks.find((choice) => labelsOf(choice).some(has));
  if (!block) throw new RuleError(`“${option}” isn't a choice here. The choices are: ${joinOr(blocks.flatMap(labelsOf))}.`);
  choices[block.at] = labelsOf(block).find(has)!;
  return choices;
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
 * lines, which read it as a card move's lines read its card. A button that picks some cards (“A player may trade some cards from their
 * stash to the shop.”) takes them from the move's `cardIds` and moves them in that order, its lines reading them as the picked cards;
 * one that picks a card for its cards to go to (“… to a card in their case.”) takes that card from the move's `onto`. A button whose
 * Then lines ask for a choice (“… to another player of their choice who …”) takes what it can't fill in itself from the move's `choices`,
 * one entry for each choice in the order written, and is refused with the choice's prompt when that names none or a wrong one. Nobody is marked
 * as having moved a card: only trick games read that, and they use card moves. A press must leave the table whole: one that strands a card
 * on a card gone elsewhere throws, on the button's line, so the engine keeps the state from before it. Only its result is checked, since
 * its lines may move a card before the cards on it.
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
      const { phase, action, by, subject, info, relocation } = choice;
      // A press anyone may make is no part of anyone's turn, so it is not noted among what the player did in it.
      const recorded = action.anyone ? state : recordAction(state, by, move);
      // Spent first, so that the Then lines see what is left.
      const paid = payCost(action, recorded, by);
      const moved = relocation ? relocate(paid, relocation.ids, relocation.to, runtime.game) : paid;
      const done = action.effects.reduce((s, ref) => runtime.run(ref, s, info, undefined, subject), moved);
      // Only a turn of this phase passes: lines that went back to an interrupted turn leave that turn's log as it was.
      return runtime.checkAttachments(endsTurn(phase, move) && done.turn?.phase === phase.id ? clearTurnLog(done) : done, { line: action.line });
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
 * Whether `seat` could press the button that picks cards with `cardId` (alone, for a set) and, for a button that picks a card for it to
 * go to, `onto`, where it can't see one of them, judged by nothing that tells one such card from another: whether each is one the
 * button takes from where it lies, the cost, and every `Only if` line that reads no card of the press, about the seat alone. A seat
 * that is out can press nothing. Like `amountReady`, it asks nothing of the turn or the flow, and the press itself still judges the cards.
 */
export function faceDownReady(
  runtime: LangRuntime, action: DeclaredAction, state: GameState, seat: PlayerId, cardId: string, onto?: string,
): true | string {
  if (isOut(state, seat)) return OUT;
  const pick = pickOf(action);
  const move: Move = { type: action.words, by: seat, ...(pick.some ? { cardIds: [cardId] } : { cardId }), ...(onto === undefined ? {} : { onto }) };
  const press = aboutCards(action, pick, runtime, state, move, seat);
  if (typeof press === 'string') return press;
  const blind = action.conditions.filter((group) => !runtime.readsCard(group));
  return costRefusal(action, state, seat) ?? runtime.failedGroup(blind, state, undefined, { player: seat, space: null, card: null }) ?? true;
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
