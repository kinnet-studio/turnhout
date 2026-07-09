import { cardAtPoint, zoneAtPoint } from '../core/hittest';
import type { Vec2 } from '../core/scene';
import type { TableInputDeps } from './table-input-context';

const CLICK_THRESHOLD = 5;

export class TableInputTracker {
  private dragId: string | null = null;
  private dragFromZone: string | null = null;
  private downWorld: Vec2 | null = null;
  private moved = false;
  private hoverId: string | null = null;

  constructor(private deps: TableInputDeps) {}

  pointerDown(clientX: number, clientY: number): void {
    const world = this.deps.clientToWorld(clientX, clientY);
    this.downWorld = world;
    this.moved = false;
    const id = cardAtPoint(world, this.deps.getPlacedCards(), { draggableOnly: true });
    if (id == null) return;
    this.dragId = id;
    this.dragFromZone = this.deps.getScene().cards.find((c) => c.id === id)?.zoneId ?? null;
    this.deps.beginDrag(id);
  }

  pointerMove(clientX: number, clientY: number): void {
    const world = this.deps.clientToWorld(clientX, clientY);
    if (this.dragId) {
      if (this.downWorld && Math.hypot(world.x - this.downWorld.x, world.y - this.downWorld.y) > CLICK_THRESHOLD) {
        this.moved = true;
      }
      this.deps.dragTo(this.dragId, world);
      return;
    }
    const id = cardAtPoint(world, this.deps.getPlacedCards());
    if (id !== this.hoverId) {
      this.hoverId = id;
      this.deps.intents.onHover?.(id);
    }
  }

  pointerUp(clientX: number, clientY: number): void {
    const world = this.deps.clientToWorld(clientX, clientY);
    const id = this.dragId;
    if (id == null) return;
    this.deps.endDrag(id);
    this.dragId = null;

    if (!this.moved) {
      this.deps.intents.onCardClick?.(id);
      return;
    }
    const card = this.deps.getScene().cards.find((c) => c.id === id);
    const hit = zoneAtPoint(world, this.deps.getPlacedZones(), card);
    this.deps.intents.onDrop?.({
      cardId: id,
      fromZoneId: this.dragFromZone ?? '',
      toZoneId: hit?.zoneId ?? null,
      slot: hit?.slot ?? 0,
      worldPoint: world,
    });
  }
}
