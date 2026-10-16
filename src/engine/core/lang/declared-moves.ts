import { cardById, type GameState } from '../game-state';
import type { Move, MoveHandler } from '../moves';
import type { CardState, PlayerId } from '../scene';
import { clearTurnLog, endsTurn } from './board-state';
import type { LangRuntime } from './runtime';
import type { CompiledGame, CompiledPhase, DeclaredMove, MoveInfo, SeatRef, ZoneRef } from './types';
import { otherSeat, relocate, topCard, zoneIdFor, zoneInfo } from './zones';

const NOT_ON_TABLE = "That card isn't on the table.";

/**
 * The zone a move line names when `by` makes the move: “their hand” is the mover's own and “the other player's hand” the
 * other seat's. Null when the line names a seat that is not at this table (or several zones, which the compiler does not
 * let a move do).
 */
export function moveZoneId(ref: ZoneRef, seats: PlayerId[], by: PlayerId): string | null {
  if ('shared' in ref) return zoneIdFor(ref.shared);
  if ('each' in ref) return null;
  const seat = seatOfMove(ref.of, seats, by);
  return seat !== null && seats.includes(seat) ? zoneIdFor(ref.zone, seat) : null;
}

/** The seat a zone's owner words name for a move by `by`; null for the winner, and for “the other player” where there is not exactly one. */
function seatOfMove(of: SeatRef, seats: PlayerId[], by: PlayerId): PlayerId | null {
  if ('seat' in of) return of.seat;
  if (of.who === 'actor') return by;
  return of.who === 'other' && seats.length === 2 && seats.includes(by) ? otherSeat(seats, by) : null;
}

/** The zone as the designer named it, said to the player making the move: “their hand” becomes “your hand”. */
export const yours = (text: string) => text.replace(/^their\s+/i, 'your ');

/** Whether the zone is a pile, whose top card is the only one a move may take. */
export const isPile = (game: CompiledGame, zoneId: string): boolean => zoneInfo(game, zoneId)?.spec.layout === 'pile';

/** Whether a move may take the card from where it lies: any card of a hand or a row, only the top card of a pile. */
export const isTakeable = (game: CompiledGame, state: GameState, card: CardState): boolean =>
  !isPile(game, card.zoneId) || topCard(state, card.zoneId)?.id === card.id;

const joinOr = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`);

/** The current phase's declaration of `verb` that allows the move, with the move as its phrases see it; else why not. */
function choose(
  verb: string, runtime: LangRuntime, state: GameState, m: Move,
): { phase: CompiledPhase; decl: DeclaredMove; info: MoveInfo } | string {
  const by = m.by as string | undefined;
  const card = cardById(state, m.cardId as string);
  if (by === undefined || !card) return NOT_ON_TABLE;
  const phase = runtime.game.phases.find((p) => p.id === state.turn?.phase);
  const declared = phase?.moves.filter((d) => d.verb === verb) ?? [];
  if (!phase || declared.length === 0) return `You can't ${verb} a card now.`;

  const fromHere = declared.filter((d) => moveZoneId(d.from, runtime.seats, by) === card.zoneId);
  if (fromHere.length === 0) return `You can only ${verb} a card from ${joinOr([...new Set(declared.map((d) => yours(d.fromText)))])}.`;

  const toZone = m.toZone as string | undefined;
  const there = fromHere.flatMap((decl) => {
    const to = moveZoneId(decl.to, runtime.seats, by);
    return to !== null && (toZone === undefined || to === toZone) ? [{ decl, to }] : [];
  });
  if (there.length === 0) return `You can't ${verb} a card there.`;

  if (!isTakeable(runtime.game, state, card)) return `You can only take the top card of ${yours(there[0].decl.fromText)}.`;

  let failure: string | undefined;
  for (const { decl, to } of there) {
    const info: MoveInfo = { verb, by, cardId: card.id, from: card.zoneId, to };
    const failed = runtime.failedGroup(decl.conditions, state, info);
    if (failed === null) return { phase, decl, info };
    failure ??= failed;
  }
  return failure!;
}

/**
 * The move handler for one verb the designer declared, like “A player may play a card from their hand to the
 * trick.” It refuses a move in the designer's own words, then moves the card and runs the declaration's Then lines.
 * A move the After line names passes the turn, so what the players did in it stops counting, as after a button.
 * The move must leave the table whole: one that strands a card on a card gone elsewhere throws, on the declaration's line, so the engine
 * keeps the state from before it. Only its result is checked, since its lines may move a card before the cards on it.
 */
export function declaredMoveHandler(verb: string, runtime: LangRuntime): MoveHandler {
  return {
    legal(state, m) {
      const choice = choose(verb, runtime, state, m);
      return typeof choice === 'string' ? choice : true;
    },
    apply(state, m) {
      const choice = choose(verb, runtime, state, m);
      if (typeof choice === 'string') throw new Error(`A ${verb} move was applied that is not allowed: ${choice}`);
      const { phase, decl, info } = choice;
      const moved = relocate(state, [info.cardId], info.to, runtime.game);
      // `movedBy` is how phrases such as “the highest card of the led suit wins” tell who played a card.
      const marked: GameState = {
        ...moved,
        cards: moved.cards.map((c) => (c.id === info.cardId ? { ...c, data: { ...c.data, movedBy: info.by } } : c)),
      };
      const done = decl.effects.reduce((s, ref) => runtime.run(ref, s, info), marked);
      return runtime.checkAttachments(endsTurn(phase, verb) ? clearTurnLog(done) : done, decl);
    },
  };
}
