import type { Placement, TableDef } from '../core/table-def';
import type { PlayerId } from '../core/scene';
import type { DropIntent } from '../input/table-input-context';
import type { CardDecor } from '../core/scene';

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
  /** A ring and a caption to put on cards, by card id. A page that passes none draws its cards as they are. */
  decor?: { [cardId: string]: CardDecor };
}
