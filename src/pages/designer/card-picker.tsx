import { useState } from 'react';
import type { CardPickView, PickCardView } from '@/engine/core/lang/board-view';
import { BUTTON_STYLE, PICKING_BACKGROUND } from './board-controls';

/** What a press that picks cards carries besides its move type: the card or the set picked, and the card they go to if any. */
type CardChoice = { cardId: string; onto?: string } | { cardIds: string[]; onto?: string };

/**
 * Each card the picked cards may go to, judged for all of them at once: it takes them when it takes each, and otherwise says why
 * the first it refuses is refused. The view lists the same targets for every card, so the first card's list names them.
 */
function targetsFor(targets: { [cardId: string]: PickCardView[] }, picked: string[]): PickCardView[] {
  return (targets[picked[0]] ?? []).map((target) => {
    // A card with no verdict for the target is left to the press, which judges the whole set.
    const refusal = picked.map((id) => targets[id]?.find((t) => t.id === target.id)?.allowed ?? true).find((verdict) => verdict !== true);
    return { ...target, allowed: refusal ?? true };
  });
}

/**
 * The cards a button may pick, listed under the buttons with the view's prompt. A card the move refuses stays on the list, greyed
 * with the reason on hover, and pressing it explains instead of picking. One card goes as soon as it is picked; a set is picked card
 * by card and goes on Confirm. A move that also picks the card they go to lists those cards next, under its second prompt.
 */
export function CardPicker({ pick, onSend, onRefused, onCancel }: {
  pick: CardPickView;
  onSend(chosen: CardChoice): void;
  onRefused(reason: string): void;
  onCancel(): void;
}) {
  // The cards picked so far, in the order clicked, and whether the player has gone on to pick the card they go to.
  const [chosen, setChosen] = useState<string[]>([]);
  const [placing, setPlacing] = useState(false);
  // The view can change while the picker is open (an Undo takes a card back): a card no longer listed drops out of what is
  // picked, so it is never sent, and stays out if it comes back. Setting state while rendering makes React render again at once
  // with the pruned list, before anything is drawn.
  const picked = chosen.filter((id) => pick.cards.some((card) => card.id === id));
  if (picked.length < chosen.length) {
    setChosen(picked);
    if (picked.length === 0) setPlacing(false);
  }

  const button = (card: PickCardView, onLive: () => void, pressed?: boolean) => {
    const verdict = card.allowed;
    const live = verdict === true;
    // A card already picked always unpicks, even one the view has since refused, so a player can take back their own pick.
    const acts = live || pressed === true;
    return (
      <button
        key={card.id}
        type="button"
        aria-label={`Pick ${card.name}`}
        aria-disabled={!live}
        aria-pressed={pressed}
        title={live ? undefined : verdict}
        onClick={() => (acts ? onLive() : onRefused(verdict))}
        style={{
          ...BUTTON_STYLE, opacity: live ? 1 : 0.5, cursor: acts ? 'pointer' : 'not-allowed',
          ...(pressed ? { background: PICKING_BACKGROUND, color: '#fff' } : {}),
        }}
      >
        {card.name}
      </button>
    );
  };

  const onto = placing && picked.length > 0 ? pick.onto : null;
  let prompt = pick.prompt;
  let choices;
  if (onto !== null) {
    prompt = onto.prompt;
    choices = targetsFor(onto.targets, picked).map((target) => button(target, () => onSend(
      pick.some ? { cardIds: picked, onto: target.id } : { cardId: picked[0], onto: target.id },
    )));
  } else if (pick.some) {
    const toggle = (id: string) => setChosen(picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id]);
    const confirm = () => {
      if (picked.length === 0) onRefused(`${pick.prompt}.`);
      else if (pick.onto === null) onSend({ cardIds: picked });
      else setPlacing(true);
    };
    choices = [
      ...pick.cards.map((card) => button(card, () => toggle(card.id), picked.includes(card.id))),
      <button key="confirm" type="button" onClick={confirm} style={BUTTON_STYLE}>Confirm</button>,
    ];
  } else {
    const take = (id: string) => {
      if (pick.onto === null) {
        onSend({ cardId: id });
      } else {
        setChosen([id]);
        setPlacing(true);
      }
    };
    choices = pick.cards.map((card) => button(card, () => take(card.id)));
  }
  return (
    <div role="group" aria-label="Pick cards" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <span>{prompt}</span>
      {choices}
      <button type="button" onClick={onCancel} style={BUTTON_STYLE}>Cancel</button>
    </div>
  );
}
