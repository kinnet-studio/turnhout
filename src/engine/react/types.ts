import type { Placement, TableDef } from '../core/table-def';
import type { PlayerId } from '../core/scene';
import type { DropIntent } from '../input/table-input-context';

export interface CardTableHandle {
  deal(staggerMs?: number): void;
  shuffle(zoneId: string): void;
}

export interface CardTableProps {
  tableDef: TableDef;
  placement: Placement;
  viewer?: PlayerId;
  onDrop?: (intent: DropIntent) => void;
  onCardClick?: (cardId: string) => void;
  onHover?: (cardId: string | null) => void;
}
