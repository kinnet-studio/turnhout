import { describe, expect, it } from 'vitest';
import type { ActionView, CardPickView, PickCardView } from '@/engine/core/lang/board-view';
import { PICK_START, clickCard, confirmSet, liveAt, ontoChoices, ringsOf, takersOf, type PickAt } from './card-pick';

const NOT_RUBY = 'the target card is not a Ruby';
const PROMPT = 'Pick a card from your stash';
const ONTO_PROMPT = 'Pick where it goes: a card in your case';

/** A Ruby and a Pearl the button takes, and an Opal it refuses with `x`. */
const CARDS: PickCardView[] = [{ id: 'c1', name: 'Ruby', allowed: true }, { id: 'c2', name: 'Opal', allowed: 'x' }, { id: 'c3', name: 'Pearl', allowed: true }];
/** A case of an Opal any card may go to and a Ruby none may. */
const TARGETS: PickCardView[] = [{ id: 'c9', name: 'Opal', allowed: true }, { id: 'c8', name: 'Ruby', allowed: NOT_RUBY }];
const ONE: CardPickView = { some: false, prompt: PROMPT, cards: CARDS, onto: null };
const ONE_ONTO: CardPickView = { ...ONE, onto: { prompt: ONTO_PROMPT, targets: { c1: TARGETS, c3: TARGETS } } };
const SET: CardPickView = { ...ONE, some: true };
/** A set whose Pearl the case's Opal refuses with `y`. */
const SET_ONTO: CardPickView = {
  ...SET, onto: { prompt: ONTO_PROMPT, targets: { c1: TARGETS, c3: [{ ...TARGETS[0], allowed: 'y' }, TARGETS[1]] } },
};

/** The picks after clicking each card in turn from the start, failing if a click does anything but pick. */
const clicked = (pick: CardPickView, ...ids: string[]): PickAt => ids.reduce((at, id) => {
  const outcome = clickCard(pick, at, id);
  if (!('at' in outcome)) throw new Error(`clicking ${id} gave ${JSON.stringify(outcome)}`);
  return outcome.at;
}, PICK_START);

describe('clickCard', () => {
  it('sends one card the button takes, explains one it refuses, and explains any other card with the prompt', () => {
    expect(clickCard(ONE, PICK_START, 'c1')).toEqual({ send: { cardId: 'c1' } });
    expect(clickCard(ONE, PICK_START, 'c2')).toEqual({ refused: 'x' });
    expect(clickCard(ONE, PICK_START, 'zz')).toEqual({ refused: `${PROMPT}.` });
  });

  it('takes one card on to its targets, then sends it to a live one and explains the others', () => {
    const at = clicked(ONE_ONTO, 'c1');
    expect(at).toEqual({ picked: ['c1'], onto: true });
    expect(clickCard(ONE_ONTO, at, 'c9')).toEqual({ send: { cardId: 'c1', onto: 'c9' } });
    expect(clickCard(ONE_ONTO, at, 'c8')).toEqual({ refused: NOT_RUBY });
    expect(clickCard(ONE_ONTO, at, 'c3')).toEqual({ refused: `${ONTO_PROMPT}.` });
  });

  it('toggles the cards of a set, keeping the order clicked', () => {
    expect(clicked(SET, 'c1', 'c3', 'c1')).toEqual({ picked: ['c3'], onto: false });
    expect(clicked(SET, 'c3', 'c1')).toEqual({ picked: ['c3', 'c1'], onto: false });
    expect(clickCard(SET, PICK_START, 'c2')).toEqual({ refused: 'x' });
  });

  it('unpicks a picked card the view now refuses, and only then explains it', () => {
    const at = clicked(SET, 'c1', 'c3');
    const refusing: CardPickView = { ...SET, cards: [{ ...CARDS[0], allowed: 'z' }, CARDS[1], CARDS[2]] };
    const unpicked = clickCard(refusing, at, 'c1');
    expect(unpicked).toEqual({ at: { picked: ['c3'], onto: false } });
    expect(clickCard(refusing, (unpicked as { at: PickAt }).at, 'c1')).toEqual({ refused: 'z' });
  });

  it('goes on to the targets with a confirmed set, where a target any picked card refuses is refused with its verdict', () => {
    const confirmed = confirmSet(SET_ONTO, clicked(SET_ONTO, 'c1', 'c3'));
    expect(confirmed).toEqual({ at: { picked: ['c1', 'c3'], onto: true } });
    const at = (confirmed as { at: PickAt }).at;
    expect(clickCard(SET_ONTO, at, 'c9')).toEqual({ refused: 'y' });
    expect(clickCard(SET_ONTO, at, 'c8')).toEqual({ refused: NOT_RUBY });
    expect(clickCard(SET_ONTO, { picked: ['c1'], onto: true }, 'c9')).toEqual({ send: { cardIds: ['c1'], onto: 'c9' } });
  });

  it('confirms a set and sends it to a target clicked straight after picking it', () => {
    expect(clickCard(SET_ONTO, clicked(SET_ONTO, 'c1'), 'c9')).toEqual({ send: { cardIds: ['c1'], onto: 'c9' } });
    expect(clickCard(SET_ONTO, clicked(SET_ONTO, 'c1', 'c3'), 'c9')).toEqual({ refused: 'y' });
    // With nothing picked a target is just a card the button does not pick.
    expect(clickCard(SET_ONTO, PICK_START, 'c9')).toEqual({ refused: `${PROMPT}.` });
  });

  it('leaves a target that a picked card has no verdict for to the press', () => {
    const missing: CardPickView = { ...SET_ONTO, onto: { prompt: ONTO_PROMPT, targets: { c1: TARGETS, c3: [TARGETS[1]] } } };
    const at: PickAt = { picked: ['c1', 'c3'], onto: true };
    expect(ontoChoices(missing, at)).toEqual(TARGETS);
    expect(clickCard(missing, at, 'c9')).toEqual({ send: { cardIds: ['c1', 'c3'], onto: 'c9' } });
  });

  it('judges a click on the picks still in the view', () => {
    const gone: CardPickView = { ...SET_ONTO, cards: [CARDS[0], CARDS[1]] };
    expect(clickCard(gone, { picked: ['c3', 'c1'], onto: false }, 'c9')).toEqual({ send: { cardIds: ['c1'], onto: 'c9' } });
    expect(clickCard({ ...ONE_ONTO, cards: [CARDS[2]] }, { picked: ['c1'], onto: true }, 'c9')).toEqual({ refused: `${PROMPT}.` });
  });
});

describe('confirmSet', () => {
  it('sends the set picked, or explains with the prompt when nothing is', () => {
    expect(confirmSet(SET, clicked(SET, 'c1', 'c3', 'c1'))).toEqual({ send: { cardIds: ['c3'] } });
    expect(confirmSet(SET, PICK_START)).toEqual({ refused: `${PROMPT}.` });
    expect(confirmSet(SET, { picked: ['c4'], onto: false })).toEqual({ refused: `${PROMPT}.` });
  });
});

describe('liveAt', () => {
  it('keeps the picks still in the view, in order', () => {
    const at: PickAt = { picked: ['c3', 'c1'], onto: false };
    expect(liveAt({ ...SET, cards: [CARDS[0], CARDS[1]] }, at)).toEqual({ picked: ['c1'], onto: false });
    expect(liveAt(SET, at)).toBe(at);
  });

  it('starts over once every pick is gone, even picking the card they go to', () => {
    expect(liveAt({ ...ONE_ONTO, cards: [CARDS[2]] }, { picked: ['c1'], onto: true })).toBe(PICK_START);
    expect(liveAt(SET, PICK_START)).toBe(PICK_START);
  });
});

describe('ringsOf', () => {
  it('rings the live cards to pick, then the picked cards and what is left to pick, then the live targets', () => {
    expect(ringsOf(SET, PICK_START)).toEqual({ c1: 'choice', c3: 'choice' });
    expect(ringsOf(SET, clicked(SET, 'c1'))).toEqual({ c1: 'chosen', c3: 'choice' });
    expect(ringsOf(ONE_ONTO, clicked(ONE_ONTO, 'c1'))).toEqual({ c1: 'chosen', c9: 'choice' });
  });

  it('rings no card that has left the view', () => {
    expect(ringsOf({ ...SET, cards: [CARDS[0], CARDS[1]] }, { picked: ['c3'], onto: false })).toEqual({ c1: 'choice' });
  });
});

describe('takersOf', () => {
  const plain: ActionView = { move: 'stop', label: 'Stop', allowed: true, target: null, amount: false, players: null };
  const sell: ActionView = { ...plain, move: 'sell', label: 'Sell a card in your stash', cards: ONE };
  const show: ActionView = { ...plain, move: 'show', label: 'Show a card', cards: { ...ONE, cards: [{ ...CARDS[0], allowed: 'x' }] } };

  it('lists the buttons that may pick the card, in order, each with its verdict for the card', () => {
    expect(takersOf([plain, sell, show], 'c1')).toEqual([
      { move: 'sell', label: 'Sell a card in your stash', allowed: true },
      { move: 'show', label: 'Show a card', allowed: 'x' },
    ]);
    expect(takersOf([plain, sell, show], 'zz')).toEqual([]);
  });
});
