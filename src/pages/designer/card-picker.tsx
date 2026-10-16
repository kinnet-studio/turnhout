import { useEffect, useState } from 'react';
import type { CardPickView, PickCardView } from '@/engine/core/lang/board-view';
import { BUTTON_STYLE, PICKING_BACKGROUND } from './board-controls';
import { PICK_START, clickCard, confirmSet, liveAt, ontoChoices, type PickAt, type PickChosen, type PickOutcome } from './card-pick';

/**
 * The cards a button may pick, listed under the buttons with the view's prompt. A card the move refuses stays on the list, greyed
 * with the reason on hover, and pressing it explains instead of picking. One card goes as soon as it is picked; a set is picked card
 * by card and goes on Confirm. A move that also picks the card they go to lists those cards next, under its second prompt. Given
 * `at`, it shows those picks and reports each change through `onAt`, so a page can share them with clicks on its table; without
 * it, it keeps its own.
 */
export function CardPicker({ pick, at, onAt, onSend, onRefused, onCancel }: {
  pick: CardPickView;
  at?: PickAt;
  onAt?(at: PickAt): void;
  onSend(chosen: PickChosen): void;
  onRefused(reason: string): void;
  onCancel(): void;
}) {
  const [own, setOwn] = useState<PickAt>(PICK_START);
  const stored = at ?? own;
  // The view can change while the picker is open (an Undo takes a card back): a card no longer listed drops out of what is
  // picked, so it is never sent, and stays out if it comes back. Its own picks are pruned while rendering, which makes React
  // render again at once with the pruned list, before anything is drawn; picks it is given are pruned by their owner, told after.
  const shown = liveAt(pick, stored);
  if (at === undefined && shown !== own) setOwn(shown);
  useEffect(() => {
    if (at !== undefined && shown !== at) onAt?.(shown);
  }, [at, shown, onAt]);
  const keep = (next: PickAt) => (at === undefined ? setOwn(next) : onAt?.(next));
  const apply = (outcome: PickOutcome) => {
    if ('send' in outcome) onSend(outcome.send);
    else if ('at' in outcome) keep(outcome.at);
    else onRefused(outcome.refused);
  };

  const button = (card: PickCardView, pressed?: boolean) => {
    const verdict = card.allowed;
    const live = verdict === true;
    // A card already picked always unpicks, even one the view has since refused, so a player can take back their own pick.
    const acts = live || pressed === true;
    return (
      <button
        key={card.id}
        type="button"
        aria-label={`Pick ${card.name}`}
        aria-disabled={!acts}
        aria-pressed={pressed}
        title={live ? undefined : verdict}
        onClick={() => apply(clickCard(pick, shown, card.id))}
        style={{
          ...BUTTON_STYLE, opacity: live ? 1 : 0.5, cursor: acts ? 'pointer' : 'not-allowed',
          ...(pressed ? { background: PICKING_BACKGROUND, color: '#fff' } : {}),
        }}
      >
        {card.name}
      </button>
    );
  };

  const onto = shown.onto ? pick.onto : null;
  const confirmButton = <button key="confirm" type="button" onClick={() => apply(confirmSet(pick, shown))} style={BUTTON_STYLE}>Confirm</button>;
  // Once the cards are picked, the cards they go to; before that, a set's cards to toggle and its Confirm, or the cards to take one of.
  const prompt = onto === null ? pick.prompt : onto.prompt;
  const choices = onto !== null
    ? ontoChoices(pick, shown).map((target) => button(target))
    : pick.some
      ? [...pick.cards.map((card) => button(card, shown.picked.includes(card.id))), confirmButton]
      : pick.cards.map((card) => button(card));
  return (
    <div role="group" aria-label="Pick cards" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <span>{prompt}</span>
      {choices}
      <button type="button" onClick={onCancel} style={BUTTON_STYLE}>Cancel</button>
    </div>
  );
}
