import type { CardState, PlacedCard, Vec2 } from '../core/scene';
import type { RuleRegistry } from '../core/rules';
import type { ZoneDef } from '../core/table-def';

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
  getZones: () => ZoneDef[];
  getCards: () => CardState[];
  registry: RuleRegistry;
  beginDrag: (id: string) => void;
  dragTo: (id: string, world: Vec2) => void;
  endDrag: (id: string) => void;
  intents: TableIntents;
}

export type { CardState, PlacedCard, Vec2 };
