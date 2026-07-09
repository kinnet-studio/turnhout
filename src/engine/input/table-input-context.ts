import type { CardState, PlacedCard, PlacedZone, Scene, Vec2 } from '../core/scene';

export interface DropIntent {
  cardId: string;
  fromZoneId: string;
  toZoneId: string | null;
  slot: number;
  worldPoint: Vec2;
}

export interface TableIntents {
  onDrop?: (intent: DropIntent) => void;
  onCardClick?: (cardId: string) => void;
  onHover?: (cardId: string | null) => void;
}

export interface TableInputDeps {
  clientToWorld: (clientX: number, clientY: number) => Vec2;
  getPlacedCards: () => PlacedCard[];
  getPlacedZones: () => PlacedZone[];
  getScene: () => Scene;
  beginDrag: (id: string) => void;
  dragTo: (id: string, world: Vec2) => void;
  endDrag: (id: string) => void;
  intents: TableIntents;
}

export type { CardState, PlacedCard, PlacedZone, Scene, Vec2 };
