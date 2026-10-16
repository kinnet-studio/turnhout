// A guard: this passes before the designer's tables take clicks, and pins that Hearts' clicks and drags behave as they always have.
import { describe, expect, it, vi } from 'vitest';
import { TABLE } from '@/pages/hearts-demo/cards';
import { createHeartsServer } from '@/pages/hearts-demo/game';
import { deriveScene } from '../core/derive-scene';
import { RuleRegistry } from '../core/rules';
import { registerStarterRules } from '../core/rules-library';
import { TableModel } from '../core/table-model';
import { TableInputTracker } from './table-input-tracker';

/** Hearts' table as its page draws it (no viewer), with the real tracker over it and spies for what it reports. */
function heartsTable() {
  const scene = deriveScene(TABLE, { cards: createHeartsServer(42).viewFor('p0').scene.cards });
  const model = new TableModel();
  model.setScene(scene);
  model.advance(1 / 60);
  const intents = { onDrop: vi.fn(), onCardClick: vi.fn(), onHover: vi.fn() };
  const tracker = new TableInputTracker({
    clientToWorld: (x, y) => ({ x, y }),
    getPlacedCards: () => model.getPlacedCards(),
    getZones: () => TABLE.zones,
    getCards: () => scene.cards,
    registry: registerStarterRules(new RuleRegistry()),
    beginDrag: (id) => model.beginDrag(id),
    dragTo: (id, world) => model.dragTo(id, world),
    endDrag: (id) => model.endDrag(id),
    intents,
  });
  // The card on top of p0's hand, where it rests.
  const inHand = new Set(scene.cards.filter((c) => c.zoneId === 'hand-p0').map((c) => c.id));
  const top = model.getPlacedCards().filter((c) => inHand.has(c.id)).reduce((a, b) => (b.transform.z > a.transform.z ? b : a));
  const { x, y } = top.transform;
  /** Presses on the top card, moves to (toX, toY) and lets go there. */
  const gesture = (toX: number, toY: number) => {
    tracker.pointerDown(x, y);
    tracker.pointerMove(toX, toY);
    tracker.pointerUp(toX, toY);
    expect(model.getRenderStates().filter((s) => s.ownedByDrag)).toEqual([]);
  };
  return { intents, top: top.id, x, y, gesture };
}

describe("Hearts' clicks and drags", () => {
  it('takes a press and a release 2 away as a click on the top card of the hand', () => {
    const { intents, top, x, y, gesture } = heartsTable();
    gesture(x + 2, y);
    expect(intents.onCardClick).toHaveBeenCalledTimes(1);
    expect(intents.onCardClick).toHaveBeenCalledWith(top);
    expect(intents.onDrop).not.toHaveBeenCalled();
  });

  it('still takes a wobble of 4 as a click', () => {
    const { intents, top, x, y, gesture } = heartsTable();
    gesture(x + 4, y);
    expect(intents.onCardClick).toHaveBeenCalledWith(top);
    expect(intents.onDrop).not.toHaveBeenCalled();
  });

  it('takes a move of 6 back onto the hand as a drop on the hand, which the page reads as a reorder', () => {
    const { intents, top, x, y, gesture } = heartsTable();
    gesture(x + 6, y);
    expect(intents.onCardClick).not.toHaveBeenCalled();
    expect(intents.onDrop).toHaveBeenCalledTimes(1);
    expect(intents.onDrop.mock.calls[0][0]).toMatchObject({ cardId: top, fromZoneId: 'hand-p0', toZoneId: 'hand-p0' });
  });

  it('drops a card dragged to the pass pile there', () => {
    const { intents, top, gesture } = heartsTable();
    gesture(0, 170);
    expect(intents.onDrop).toHaveBeenCalledWith({ cardId: top, fromZoneId: 'hand-p0', toZoneId: 'pass-p0', slot: 0, worldPoint: { x: 0, y: 170 } });
    expect(intents.onCardClick).not.toHaveBeenCalled();
  });

  it('drops a card dragged to the middle on the trick', () => {
    const { intents, gesture } = heartsTable();
    gesture(-110, 0);
    expect(intents.onDrop.mock.calls[0][0].toZoneId).toBe('trick');
  });
});
