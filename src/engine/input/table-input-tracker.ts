import { cardAtPoint, resolveDrop } from '../core/hittest';
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

  // --- world-level primitives (used by the state machine) ---
  pickUpWorld(world: Vec2): void {
    this.downWorld = world;
    this.moved = false;
    const id = cardAtPoint(world, this.deps.getPlacedCards(), { draggableOnly: true });
    if (id == null) return;
    this.dragId = id;
    this.dragFromZone = this.deps.getCards().find((c) => c.id === id)?.zoneId ?? null;
    this.deps.beginDrag(id);
  }

  dragToWorld(world: Vec2): void {
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

  hoverAtWorld(world: Vec2): void {
    if (this.dragId) return;
    const id = cardAtPoint(world, this.deps.getPlacedCards());
    if (id !== this.hoverId) {
      this.hoverId = id;
      this.deps.intents.onHover?.(id);
    }
  }

  dropWorld(world: Vec2): void {
    const id = this.dragId;
    if (id == null) return;
    this.deps.endDrag(id);
    this.dragId = null;
    if (!this.moved) {
      this.deps.intents.onCardClick?.(id);
      return;
    }
    const cards = this.deps.getCards();
    const card = cards.find((c) => c.id === id);
    const zoneCardsOf = (zoneId: string) => cards.filter((c) => c.zoneId === zoneId);
    const hit = card ? resolveDrop(world, this.deps.getZones(), zoneCardsOf, card, this.deps.registry) : null;
    this.deps.intents.onDrop?.({
      cardId: id, fromZoneId: this.dragFromZone ?? '', toZoneId: hit?.zoneId ?? null, slot: hit?.slot ?? 0, worldPoint: world,
    });
  }

  pointerDown(clientX: number, clientY: number): void { this.pickUpWorld(this.deps.clientToWorld(clientX, clientY)); }
  pointerMove(clientX: number, clientY: number): void { this.dragToWorld(this.deps.clientToWorld(clientX, clientY)); }
  pointerUp(clientX: number, clientY: number): void { this.dropWorld(this.deps.clientToWorld(clientX, clientY)); }
}
