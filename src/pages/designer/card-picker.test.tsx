import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CardPickView } from '@/engine/core/lang/board-view';
import { CardPicker } from './card-picker';
import type { PickAt } from './card-pick';

const COST = "they have at least the card's cost in coins";
const NOT_RUBY = 'the target card is not a Ruby';

/** A shop of a Ruby the player can pay for and an Opal they can't. */
const BUYING: CardPickView = {
  some: false, prompt: 'Pick a card from the shop to buy',
  cards: [{ id: 'c1', name: 'Ruby', allowed: true }, { id: 'c2', name: 'Opal', allowed: COST }], onto: null,
};
/** A Ruby to show to a card in the case, which holds an Opal it may go to and a Ruby it may not. */
const SHOWING: CardPickView = {
  some: false, prompt: 'Pick a card from your stash to show', cards: [{ id: 'c1', name: 'Ruby', allowed: true }],
  onto: {
    prompt: 'Pick where it goes: a card in your case',
    targets: { c1: [{ id: 'c9', name: 'Opal', allowed: true }, { id: 'c8', name: 'Ruby', allowed: NOT_RUBY }] },
  },
};
/** Three cards, any of which may be traded. */
const TRADING: CardPickView = {
  some: true, prompt: 'Pick one or more cards from your stash to trade',
  cards: [{ id: 'c1', name: 'Ruby', allowed: true }, { id: 'c2', name: 'Opal', allowed: true }, { id: 'c3', name: 'Pearl', allowed: true }], onto: null,
};
/** Two cards to stack on a card in the case: the Opal there takes the Ruby but not the Opal, and the Pearl there takes both. */
const STACKING: CardPickView = {
  some: true, prompt: 'Pick one or more cards from your stash to stack',
  cards: [{ id: 'c1', name: 'Ruby', allowed: true }, { id: 'c2', name: 'Opal', allowed: true }],
  onto: {
    prompt: 'Pick where they go: a card in your case',
    targets: {
      c1: [{ id: 'c9', name: 'Opal', allowed: true }, { id: 'c8', name: 'Pearl', allowed: true }],
      c2: [{ id: 'c9', name: 'Opal', allowed: 'x' }, { id: 'c8', name: 'Pearl', allowed: true }],
    },
  },
};

const mount = (pick: CardPickView) => {
  const calls = { onSend: vi.fn(), onRefused: vi.fn(), onCancel: vi.fn() };
  const view = render(<CardPicker pick={pick} {...calls} />);
  return { ...calls, rerender: (next: CardPickView) => view.rerender(<CardPicker pick={next} {...calls} />) };
};
const picker = () => screen.getByRole('group', { name: 'Pick cards' });
const button = (name: string) => within(picker()).getByRole('button', { name });
const buttonNames = () => within(picker()).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent);
const pressed = () => within(picker()).getAllByRole('button', { name: /^Pick / }).map((b) => b.getAttribute('aria-pressed'));

describe('CardPicker', () => {
  describe('one card', () => {
    it('shows the prompt and each card by name, a refused one greyed with the reason', () => {
      mount(BUYING);
      expect(within(picker()).getByText('Pick a card from the shop to buy')).toBeTruthy();
      expect(buttonNames()).toEqual(['Pick Ruby', 'Pick Opal', 'Cancel']);
      expect(button('Pick Ruby').textContent).toBe('Ruby');
      expect([button('Pick Ruby').getAttribute('aria-disabled'), button('Pick Ruby').getAttribute('title')]).toEqual(['false', null]);
      expect([button('Pick Opal').getAttribute('aria-disabled'), button('Pick Opal').getAttribute('title')]).toEqual(['true', COST]);
      expect(button('Pick Ruby').getAttribute('type')).toBe('button');
      // A card of a one-card pick is not a toggle.
      expect(button('Pick Ruby').hasAttribute('aria-pressed')).toBe(false);
      expect(within(picker()).queryByRole('button', { name: 'Confirm' })).toBeNull();
    });
    it('explains a refused card instead of sending it, and stays open', () => {
      const { onSend, onRefused } = mount(BUYING);
      fireEvent.click(button('Pick Opal'));
      expect(onRefused).toHaveBeenLastCalledWith(COST);
      expect(onSend).not.toHaveBeenCalled();
      expect(buttonNames()).toEqual(['Pick Ruby', 'Pick Opal', 'Cancel']);
    });
    it('sends a live card', () => {
      const { onSend, onRefused } = mount(BUYING);
      fireEvent.click(button('Pick Ruby'));
      expect(onSend).toHaveBeenCalledTimes(1);
      expect(onSend).toHaveBeenLastCalledWith({ cardId: 'c1' });
      expect(onRefused).not.toHaveBeenCalled();
    });
  });

  describe('a card and the card it goes to', () => {
    it('lists the targets of the card picked, under the second prompt', () => {
      const { onSend } = mount(SHOWING);
      fireEvent.click(button('Pick Ruby'));
      expect(onSend).not.toHaveBeenCalled();
      expect(within(picker()).getByText('Pick where it goes: a card in your case')).toBeTruthy();
      expect(within(picker()).queryByText('Pick a card from your stash to show')).toBeNull();
      expect(buttonNames()).toEqual(['Pick Opal', 'Pick Ruby', 'Cancel']);
    });
    it('explains a refused target and stays on the targets', () => {
      const { onSend, onRefused } = mount(SHOWING);
      fireEvent.click(button('Pick Ruby'));
      expect([button('Pick Ruby').getAttribute('aria-disabled'), button('Pick Ruby').getAttribute('title')]).toEqual(['true', NOT_RUBY]);
      fireEvent.click(button('Pick Ruby'));
      expect(onRefused).toHaveBeenLastCalledWith(NOT_RUBY);
      expect(onSend).not.toHaveBeenCalled();
      expect(within(picker()).getByText('Pick where it goes: a card in your case')).toBeTruthy();
    });
    it('sends the card with the live target picked', () => {
      const { onSend } = mount(SHOWING);
      fireEvent.click(button('Pick Ruby'));
      fireEvent.click(button('Pick Opal'));
      expect(onSend).toHaveBeenLastCalledWith({ cardId: 'c1', onto: 'c9' });
    });
    it('goes back to the cards when the card picked leaves the view', () => {
      const { rerender } = mount({ ...SHOWING, cards: [...SHOWING.cards, { id: 'c2', name: 'Opal', allowed: true }] });
      fireEvent.click(button('Pick Ruby'));
      rerender({ ...SHOWING, cards: [{ id: 'c2', name: 'Opal', allowed: true }] });
      expect(within(picker()).getByText('Pick a card from your stash to show')).toBeTruthy();
      expect(buttonNames()).toEqual(['Pick Opal', 'Cancel']);
    });
  });

  describe('a set', () => {
    it('toggles each live card, keeping the order clicked, and sends them in that order', () => {
      const { onSend } = mount(TRADING);
      expect(within(picker()).getByText('Pick one or more cards from your stash to trade')).toBeTruthy();
      expect(buttonNames()).toEqual(['Pick Ruby', 'Pick Opal', 'Pick Pearl', 'Confirm', 'Cancel']);
      expect(pressed()).toEqual(['false', 'false', 'false']);
      fireEvent.click(button('Pick Ruby'));
      expect(pressed()).toEqual(['true', 'false', 'false']);
      fireEvent.click(button('Pick Pearl'));
      expect(pressed()).toEqual(['true', 'false', 'true']);
      fireEvent.click(button('Pick Ruby'));
      expect(pressed()).toEqual(['false', 'false', 'true']);
      fireEvent.click(button('Pick Opal'));
      expect(pressed()).toEqual(['false', 'true', 'true']);
      expect(onSend).not.toHaveBeenCalled();
      fireEvent.click(button('Confirm'));
      expect(onSend).toHaveBeenLastCalledWith({ cardIds: ['c3', 'c2'] });
    });
    it('explains with the prompt when Confirm is pressed with nothing picked', () => {
      const { onSend, onRefused } = mount(TRADING);
      fireEvent.click(button('Confirm'));
      expect(onRefused).toHaveBeenLastCalledWith('Pick one or more cards from your stash to trade.');
      expect(onSend).not.toHaveBeenCalled();
    });
    it('explains a refused card instead of picking it', () => {
      const { onRefused } = mount({ ...TRADING, cards: [TRADING.cards[0], { ...TRADING.cards[1], allowed: 'y' }] });
      fireEvent.click(button('Pick Opal'));
      expect(onRefused).toHaveBeenLastCalledWith('y');
      expect(pressed()).toEqual(['false', 'false']);
    });
    it('unpicks a picked card the view now refuses, and only then explains it', () => {
      const { onSend, onRefused, rerender } = mount(TRADING);
      fireEvent.click(button('Pick Ruby'));
      fireEvent.click(button('Pick Opal'));
      rerender({ ...TRADING, cards: [TRADING.cards[0], { ...TRADING.cards[1], allowed: 'y' }, TRADING.cards[2]] });
      // It still reads as one to click, since clicking it unpicks it; why the view refuses it stays in its title.
      expect(['aria-pressed', 'aria-disabled', 'title'].map((name) => button('Pick Opal').getAttribute(name))).toEqual(['true', 'false', 'y']);
      fireEvent.click(button('Pick Opal'));
      expect(onRefused).not.toHaveBeenCalled();
      expect(pressed()).toEqual(['true', 'false', 'false']);
      fireEvent.click(button('Pick Opal'));
      expect(onRefused).toHaveBeenLastCalledWith('y');
      expect(pressed()).toEqual(['true', 'false', 'false']);
      fireEvent.click(button('Confirm'));
      expect(onSend).toHaveBeenLastCalledWith({ cardIds: ['c1'] });
    });
  });

  describe('a set and the card it goes to', () => {
    it('lists the targets once confirmed, each greyed with the first verdict of a picked card that is not true', () => {
      const { onSend, onRefused } = mount(STACKING);
      fireEvent.click(button('Pick Ruby'));
      fireEvent.click(button('Pick Opal'));
      fireEvent.click(button('Confirm'));
      expect(onSend).not.toHaveBeenCalled();
      expect(within(picker()).getByText('Pick where they go: a card in your case')).toBeTruthy();
      expect(buttonNames()).toEqual(['Pick Opal', 'Pick Pearl', 'Cancel']);
      expect([button('Pick Opal').getAttribute('aria-disabled'), button('Pick Opal').getAttribute('title')]).toEqual(['true', 'x']);
      fireEvent.click(button('Pick Opal'));
      expect(onRefused).toHaveBeenLastCalledWith('x');
      expect(onSend).not.toHaveBeenCalled();
      fireEvent.click(button('Pick Pearl'));
      expect(onSend).toHaveBeenLastCalledWith({ cardIds: ['c1', 'c2'], onto: 'c8' });
    });
    it('takes a target the one card picked may go to', () => {
      const { onSend } = mount(STACKING);
      fireEvent.click(button('Pick Ruby'));
      fireEvent.click(button('Confirm'));
      expect(button('Pick Opal').getAttribute('aria-disabled')).toBe('false');
      fireEvent.click(button('Pick Opal'));
      expect(onSend).toHaveBeenLastCalledWith({ cardIds: ['c1'], onto: 'c9' });
    });
  });

  it('Review Focus: drops a card that leaves the view from the set, and never sends it', () => {
    const { onSend, rerender } = mount(TRADING);
    fireEvent.click(button('Pick Ruby'));
    fireEvent.click(button('Pick Pearl'));
    rerender({ ...TRADING, cards: TRADING.cards.slice(0, 2) });
    expect(pressed()).toEqual(['true', 'false']);
    fireEvent.click(button('Confirm'));
    expect(onSend).toHaveBeenLastCalledWith({ cardIds: ['c1'] });
  });
  it('Review Focus: a card that left and came back is not picked any more', () => {
    const { rerender } = mount(TRADING);
    fireEvent.click(button('Pick Pearl'));
    rerender({ ...TRADING, cards: TRADING.cards.slice(0, 2) });
    rerender(TRADING);
    expect(pressed()).toEqual(['false', 'false', 'false']);
  });

  it('calls onCancel on Cancel, whether picking cards or where they go', () => {
    const first = mount(BUYING);
    fireEvent.click(button('Cancel'));
    expect(first.onCancel).toHaveBeenCalledTimes(1);
    expect(first.onSend).not.toHaveBeenCalled();
    first.rerender(SHOWING);
    fireEvent.click(button('Pick Ruby'));
    fireEvent.click(button('Cancel'));
    expect(first.onCancel).toHaveBeenCalledTimes(2);
    expect(first.onSend).not.toHaveBeenCalled();
  });
  it('wraps its prompt and buttons like the row of buttons above it', () => {
    mount(TRADING);
    expect([picker().style.display, picker().style.flexWrap]).toEqual(['flex', 'wrap']);
  });
});

describe('CardPicker given the picks', () => {
  const mountAt = (pick: CardPickView, at: PickAt) => {
    const calls = { onSend: vi.fn(), onRefused: vi.fn(), onCancel: vi.fn(), onAt: vi.fn() };
    const view = render(<CardPicker pick={pick} at={at} {...calls} />);
    return { ...calls, rerender: (next: PickAt) => view.rerender(<CardPicker pick={pick} at={next} {...calls} />) };
  };

  it('shows the picks it is given and reports each change instead of keeping it', () => {
    const { onAt, rerender } = mountAt(TRADING, { picked: ['c3'], onto: false });
    expect(pressed()).toEqual(['false', 'false', 'true']);
    fireEvent.click(button('Pick Ruby'));
    expect(onAt).toHaveBeenLastCalledWith({ picked: ['c3', 'c1'], onto: false });
    expect(pressed()).toEqual(['false', 'false', 'true']);
    rerender({ picked: ['c3', 'c1'], onto: false });
    expect(pressed()).toEqual(['true', 'false', 'true']);
  });

  it('goes on to the targets it is given, and reports a confirmed set going on to them', () => {
    const first = mountAt(STACKING, { picked: ['c1', 'c2'], onto: false });
    fireEvent.click(button('Confirm'));
    expect(first.onAt).toHaveBeenLastCalledWith({ picked: ['c1', 'c2'], onto: true });
    first.rerender({ picked: ['c1', 'c2'], onto: true });
    expect(within(picker()).getByText('Pick where they go: a card in your case')).toBeTruthy();
    fireEvent.click(button('Pick Pearl'));
    expect(first.onSend).toHaveBeenLastCalledWith({ cardIds: ['c1', 'c2'], onto: 'c8' });
  });

  it('shows only the picks still in the view, and reports the pruned picks', () => {
    const { onAt } = mountAt(TRADING, { picked: ['c4', 'c2'], onto: false });
    expect(pressed()).toEqual(['false', 'true', 'false']);
    expect(onAt).toHaveBeenLastCalledWith({ picked: ['c2'], onto: false });
  });
});
