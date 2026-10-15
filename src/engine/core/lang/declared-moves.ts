import { cardById, type GameState } from '../game-state';
import type { Move, MoveHandler } from '../moves';
import type { PlayerId } from '../scene';
import type { LangRuntime } from './runtime';
import type { DeclaredMove, MoveInfo, ZoneRef } from './types';
import { relocate, topCard, zoneIdFor, zoneInfo } from './zones';

const NOT_ON_TABLE = "That card isn't on the table.";

/**
 * The zone a move line names when `by` makes the move: “their hand” is the mover's own. Null when the line names a
 * seat that is not at this table (or several zones, which the compiler does not let a move do).
 */
export function moveZoneId(ref: ZoneRef, seats: PlayerId[], by: PlayerId): string | null {
  if ('shared' in ref) return zoneIdFor(ref.shared);
  if ('each' in ref) return null;
  const seat = 'seat' in ref.of ? ref.of.seat : ref.of.who === 'actor' ? by : null;
  return seat !== null && seats.includes(seat) ? zoneIdFor(ref.zone, seat) : null;
}

/** The zone as the designer named it, said to the player making the move: “their hand” becomes “your hand”. */
const yours = (text: string) => text.replace(/^their\s+/i, 'your ');

const joinOr = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`);

/** The current phase's declaration of `verb` that allows the move, with the move as its phrases see it; else why not. */
function choose(verb: string, runtime: LangRuntime, state: GameState, m: Move): { decl: DeclaredMove; info: MoveInfo } | string {
  const by = m.by as string | undefined;
  const card = cardById(state, m.cardId as string);
  if (by === undefined || !card) return NOT_ON_TABLE;
  const declared = runtime.game.phases.find((p) => p.id === state.turn?.phase)?.moves.filter((d) => d.verb === verb) ?? [];
  if (declared.length === 0) return `You can't ${verb} a card now.`;

  const fromHere = declared.filter((d) => moveZoneId(d.from, runtime.seats, by) === card.zoneId);
  if (fromHere.length === 0) return `You can only ${verb} a card from ${joinOr([...new Set(declared.map((d) => yours(d.fromText)))])}.`;

  const toZone = m.toZone as string | undefined;
  const there = fromHere.flatMap((decl) => {
    const to = moveZoneId(decl.to, runtime.seats, by);
    return to !== null && (toZone === undefined || to === toZone) ? [{ decl, to }] : [];
  });
  if (there.length === 0) return `You can't ${verb} a card there.`;

  const pile = zoneInfo(runtime.game, card.zoneId)?.spec.layout === 'pile';
  if (pile && topCard(state, card.zoneId)?.id !== card.id) return `You can only take the top card of ${yours(there[0].decl.fromText)}.`;

  let failure: string | undefined;
  for (const { decl, to } of there) {
    const info: MoveInfo = { verb, by, cardId: card.id, from: card.zoneId, to };
    const failed = runtime.failedGroup(decl.conditions, state, info);
    if (failed === null) return { decl, info };
    failure ??= failed;
  }
  return failure!;
}

/**
 * The move handler for one verb the designer declared, like “A player may play a card from their hand to the
 * trick.” It refuses a move in the designer's own words, then moves the card and runs the declaration's Then lines.
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
      const { decl, info } = choice;
      const moved = relocate(state, [info.cardId], info.to, runtime.game);
      // `movedBy` is how phrases such as “the highest card of the led suit wins” tell who played a card.
      const marked: GameState = {
        ...moved,
        cards: moved.cards.map((c) => (c.id === info.cardId ? { ...c, data: { ...c.data, movedBy: info.by } } : c)),
      };
      return decl.effects.reduce((s, ref) => runtime.run(ref, s, info), marked);
    },
  };
}
