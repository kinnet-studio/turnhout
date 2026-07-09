import type { Scene } from '../core/scene';
import type { DropIntent } from '../input/table-input-context';

export interface CardTableHandle {
  deal(staggerMs?: number): void;
  shuffle(zoneId: string): void;
}

export interface CardTableProps {
  scene: Scene;
  onDrop?: (intent: DropIntent) => void;
  onCardClick?: (cardId: string) => void;
  onHover?: (cardId: string | null) => void;
}
