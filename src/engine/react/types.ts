import type { Placement, TableDef } from '../core/table-def';
import type { DropIntent } from '../input/table-input-context';

export interface CardTableHandle {
  deal(staggerMs?: number): void;
  shuffle(zoneId: string): void;
}

export interface CardTableProps {
  tableDef: TableDef;
  placement: Placement;
  onDrop?: (intent: DropIntent) => void;
  onCardClick?: (cardId: string) => void;
  onHover?: (cardId: string | null) => void;
}
