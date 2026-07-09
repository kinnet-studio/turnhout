import type { BaseAppComponents } from '@ue-too/board-pixi-integration';
import type { Vec2 } from '@/engine/core/scene';
import type { Placement, TableDef } from '@/engine/core/table-def';
import type { RuleRegistry } from '@/engine/core/rules';
import type { TableIntents } from '@/engine/input/table-input-context';
import type { TableInputTracker } from '@/engine/input/table-input-tracker';
import type { PixiTable } from '@/engine/pixi/pixi-table';

export type AppComponents = BaseAppComponents & {
  type: 'table';
  pixiTable: PixiTable;
  inputTracker: TableInputTracker;
  registry: RuleRegistry;
  setTable: (def: TableDef, placement: Placement) => void;
  setIntents: (intents: TableIntents) => void;
  clientToWorld: (clientX: number, clientY: number) => Vec2;
};

declare module '@ue-too/board-pixi-react-integration' {
  interface PixiCanvasRegistry {
    components: AppComponents;
  }
}
