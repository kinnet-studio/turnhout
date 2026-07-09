import { describe, expect, it } from 'vitest';
import { TableModel } from './table-model';
import type { Scene } from './scene';

const scene = (cards: Scene['cards'], zones: Scene['zones']): Scene => ({ cards, zones });
const deckAndHand: Scene['zones'] = [
  { id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } },
  { id: 'hand', layout: 'row', transform: { x: 500, y: 400 } },
];

describe('TableModel', () => {
  it('spawns new cards already at their layout target', () => {
    const m = new TableModel();
    m.setScene(scene([{ id: 'a', zoneId: 'deck', faceUp: false, faceKey: 'back' }], deckAndHand));
    const rs = m.getRenderStates()[0];
    expect(rs.current).toEqual(rs.target);
    expect(rs.current.x).toBe(0);
  });

  it('retargets a card when it moves zones and advances toward the new target', () => {
    const m = new TableModel();
    m.setScene(scene([{ id: 'a', zoneId: 'deck', faceUp: false, faceKey: 'back' }], deckAndHand));
    m.setScene(scene([{ id: 'a', zoneId: 'hand', faceUp: false, faceKey: 'back' }], deckAndHand));
    const before = m.getRenderStates()[0].current.x;
    m.advance(0.1);
    const after = m.getRenderStates()[0].current.x;
    expect(m.getRenderStates()[0].target.x).toBe(500);
    expect(after).toBeGreaterThan(before);
  });

  it('starts a flip when faceUp changes', () => {
    const m = new TableModel();
    m.setScene(scene([{ id: 'a', zoneId: 'deck', faceUp: false, faceKey: 'back' }], deckAndHand));
    m.setScene(scene([{ id: 'a', zoneId: 'deck', faceUp: true, faceKey: 'AS' }], deckAndHand));
    expect(m.getRenderStates()[0].flipProgress).toBeLessThan(1);
    m.advance(1);
    expect(m.getRenderStates()[0].flipProgress).toBe(1);
  });

  it('drag ownership pins the card and exempts it from layout retargeting', () => {
    const m = new TableModel();
    m.setScene(scene([{ id: 'a', zoneId: 'deck', faceUp: false, faceKey: 'back' }], deckAndHand));
    m.beginDrag('a');
    m.dragTo('a', { x: 123, y: 456 });
    m.setScene(scene([{ id: 'a', zoneId: 'hand', faceUp: false, faceKey: 'back' }], deckAndHand));
    m.advance(0.1);
    const rs = m.getRenderStates()[0];
    expect(rs.current.x).toBeCloseTo(123);
    expect(rs.current.y).toBeCloseTo(456);
    m.endDrag('a');
    m.advance(0.1);
    expect(m.getRenderStates()[0].current.x).toBeGreaterThan(123);
  });

  it('drops cards that disappear from the scene', () => {
    const m = new TableModel();
    m.setScene(scene([{ id: 'a', zoneId: 'deck', faceUp: false, faceKey: 'back' }], deckAndHand));
    m.setScene(scene([], deckAndHand));
    expect(m.getRenderStates()).toHaveLength(0);
  });
});
