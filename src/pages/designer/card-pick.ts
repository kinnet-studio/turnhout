// Picking cards for a button, as one state that the list under the buttons and clicks on the table share: what is picked so far,
// what a click on a card does next, which cards to ring, and which buttons a clicked card may be offered to.
import type { ActionView, CardPickView, PickCardView } from '@/engine/core/lang/board-view';

/** The cards picked so far, in the order clicked, and whether the player has gone on to pick the card they go to. */
export type PickAt = { picked: string[]; onto: boolean };
export const PICK_START: PickAt = { picked: [], onto: false };
/** What a press that picks cards carries besides its move type: the card or the set picked, and the card they go to if any. */
export type PickChosen = { cardId: string; onto?: string } | { cardIds: string[]; onto?: string };
/** What a click or a Confirm comes to: picks to keep, a press to send, or why nothing happens. */
export type PickOutcome = { at: PickAt } | { send: PickChosen } | { refused: string };
/** A button that may take a clicked card, live when the card's verdict is true, else greyed with it. */
export type Taker = { move: string; label: string; allowed: true | string };
export const NOTHING_TAKES = 'No button takes this card now.';

/**
 * The picks still listed in the view, in the order picked: a card that has left (an Undo took it back) drops out, so it is never
 * sent, and with none left the pick starts over. Nothing pruned gives `at` itself, so an owner can tell when to store the result.
 */
export function liveAt(pick: CardPickView, at: PickAt): PickAt {
  const picked = at.picked.filter((id) => pick.cards.some((card) => card.id === id));
  if (picked.length === 0) return PICK_START;
  return picked.length === at.picked.length ? at : { picked, onto: at.onto };
}

/**
 * Each card the picked cards may go to, judged for all of them at once: it takes them when it takes each, and otherwise says why the
 * first it refuses is refused. A picked card with no verdict for a target leaves it to the press, which judges the whole set. The
 * view lists the same targets for every card (board-view.test.ts pins it), so the first card's list names them.
 */
export function ontoChoices(pick: CardPickView, at: PickAt): PickCardView[] {
  const { picked } = liveAt(pick, at);
  if (pick.onto === null || picked.length === 0) return [];
  const { targets } = pick.onto;
  return (targets[picked[0]] ?? []).map((target) => {
    const refusal = picked.map((id) => targets[id]?.find((t) => t.id === target.id)?.allowed ?? true).find((verdict) => verdict !== true);
    return { ...target, allowed: refusal ?? true };
  });
}

/**
 * What a click on a card does. Picking the card they go to, a target sends and anything else explains. Before that, a card the
 * button may pick is sent (one card), taken on to its targets (one card that goes onto a card) or toggled (a set); a card already
 * picked into a set always unpicks, even one the view has since refused, so a player can take back their own pick. A target clicked
 * straight after picking a set confirms it and goes there. Anything else explains with the prompt.
 */
export function clickCard(pick: CardPickView, at: PickAt, cardId: string): PickOutcome {
  const live = liveAt(pick, at);
  const toTarget = (): PickOutcome => {
    const target = ontoChoices(pick, live).find((t) => t.id === cardId);
    if (target === undefined) return { refused: `${pick.onto!.prompt}.` };
    if (target.allowed !== true) return { refused: target.allowed };
    return { send: pick.some ? { cardIds: live.picked, onto: cardId } : { cardId: live.picked[0], onto: cardId } };
  };
  if (live.onto && pick.onto !== null) return toTarget();
  const card = pick.cards.find((c) => c.id === cardId);
  if (card !== undefined) {
    if (pick.some && live.picked.includes(cardId)) return { at: liveAt(pick, { picked: live.picked.filter((id) => id !== cardId), onto: false }) };
    if (card.allowed !== true) return { refused: card.allowed };
    if (pick.some) return { at: { picked: [...live.picked, cardId], onto: false } };
    return pick.onto === null ? { send: { cardId } } : { at: { picked: [cardId], onto: true } };
  }
  if (pick.some && pick.onto !== null && live.picked.length > 0 && ontoChoices(pick, live).some((t) => t.id === cardId)) return toTarget();
  return { refused: `${pick.prompt}.` };
}

/** What Confirm does with a set: explains when nothing is picked, sends it, or goes on to the card it goes to. */
export function confirmSet(pick: CardPickView, at: PickAt): PickOutcome {
  const { picked } = liveAt(pick, at);
  if (picked.length === 0) return { refused: `${pick.prompt}.` };
  return pick.onto === null ? { send: { cardIds: picked } } : { at: { picked, onto: true } };
}

/** The rings on the table: the picked cards are chosen, and the cards a click may pick next (live ones only) are choices. */
export function ringsOf(pick: CardPickView, at: PickAt): { [cardId: string]: 'choice' | 'chosen' } {
  const live = liveAt(pick, at);
  const rings: { [cardId: string]: 'choice' | 'chosen' } = {};
  const choices = live.onto ? ontoChoices(pick, live) : pick.cards.filter((card) => !live.picked.includes(card.id));
  for (const card of choices) if (card.allowed === true) rings[card.id] = 'choice';
  for (const id of live.picked) rings[id] = 'chosen';
  return rings;
}

/** The buttons that may pick this card, in button order, each live or greyed with the view's verdict for the card. */
export function takersOf(actions: ActionView[], cardId: string): Taker[] {
  return actions.flatMap(({ move, label, cards }) => {
    const card = cards?.cards.find((c) => c.id === cardId);
    return card === undefined ? [] : [{ move, label, allowed: card.allowed }];
  });
}
