import { describe, expect, it, vi } from 'vitest';
import { TableInputTracker } from './table-input-tracker';
import type { TableInputDeps } from './table-input-context';
import type { PlacedCard, PlacedZone, Scene, Vec2 } from '../core/scene';

function makeDeps(over: Partial<TableInputDeps> = {}): TableInputDeps {
  const placedCards: PlacedCard[] = [{ id: 'a', draggable: true, transform: { x: 0, y: 0, rotation: 0, scale: 1, z: 0 } }];
  const placedZones: PlacedZone[] = [{ id: 'hand', x: 300, y: 0, width: 200, height: 200 }];
  const scene: Scene = { cards: [{ id: 'a', zoneId: 'deck', faceUp: true, faceKey: 'AS' }], zones: [] };
  return {
    clientToWorld: (x: number, y: number): Vec2 => ({ x, y }),
    getPlacedCards: () => placedCards,
    getPlacedZones: () => placedZones,
    getScene: () => scene,
    beginDrag: vi.fn(),
    dragTo: vi.fn(),
    endDrag: vi.fn(),
    intents: {},
    ...over,
  };
}

describe('TableInputTracker', () => {
  it('picks up a draggable card on pointer down and drags it', () => {
    const deps = makeDeps();
    const t = new TableInputTracker(deps);
    t.pointerDown(0, 0);
    expect(deps.beginDrag).toHaveBeenCalledWith('a');
    t.pointerMove(50, 60);
    expect(deps.dragTo).toHaveBeenCalledWith('a', { x: 50, y: 60 });
  });

  it('emits a drop intent with the resolved zone on release after moving', () => {
    const onDrop = vi.fn();
    const deps = makeDeps({ intents: { onDrop } });
    const t = new TableInputTracker(deps);
    t.pointerDown(0, 0);
    t.pointerMove(300, 0);
    t.pointerUp(300, 0);
    expect(onDrop).toHaveBeenCalledWith({
      cardId: 'a', fromZoneId: 'deck', toZoneId: 'hand', slot: 0, worldPoint: { x: 300, y: 0 },
    });
    expect(deps.endDrag).toHaveBeenCalledWith('a');
  });

  it('emits a click (not a drop) when released without moving', () => {
    const onCardClick = vi.fn();
    const onDrop = vi.fn();
    const deps = makeDeps({ intents: { onCardClick, onDrop } });
    const t = new TableInputTracker(deps);
    t.pointerDown(0, 0);
    t.pointerUp(2, 2);
    expect(onCardClick).toHaveBeenCalledWith('a');
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('reports hover changes', () => {
    const onHover = vi.fn();
    const deps = makeDeps({ intents: { onHover } });
    const t = new TableInputTracker(deps);
    t.pointerMove(0, 0);
    t.pointerMove(999, 999);
    expect(onHover).toHaveBeenNthCalledWith(1, 'a');
    expect(onHover).toHaveBeenNthCalledWith(2, null);
  });
});
