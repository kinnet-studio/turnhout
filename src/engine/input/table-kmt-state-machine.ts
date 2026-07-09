import {
  type BaseContext,
  type DefaultOutputMapping,
  type EventReactions,
  NO_OP,
  type StateMachine,
  TemplateState,
  TemplateStateMachine,
} from '@ue-too/being';
import type { Vec2 } from '../core/scene';
import type { TableInputTracker } from './table-input-tracker';

export type TableInputStates = 'IDLE' | 'DRAGGING';

export interface TableInputSMContext extends BaseContext {
  pickUp(world: Vec2): void;
  dragTo(world: Vec2): void;
  drop(world: Vec2): void;
  hoverAt(world: Vec2): void;
}

export type TableInputEvents = {
  pointerDown: { world: Vec2 };
  pointerMove: { world: Vec2 };
  pointerUp: { world: Vec2 };
};

type SM = StateMachine<TableInputEvents, TableInputSMContext, TableInputStates, DefaultOutputMapping<TableInputEvents>>;

class IdleState extends TemplateState<TableInputEvents, TableInputSMContext, TableInputStates, DefaultOutputMapping<TableInputEvents>> {
  protected _eventReactions: EventReactions<TableInputEvents, TableInputSMContext, TableInputStates, DefaultOutputMapping<TableInputEvents>> = {
    pointerMove: { action: (context, payload) => context.hoverAt(payload.world) },
    pointerDown: { action: (context, payload) => context.pickUp(payload.world), defaultTargetState: 'DRAGGING' },
    pointerUp: { action: NO_OP },
  };
}

class DraggingState extends TemplateState<TableInputEvents, TableInputSMContext, TableInputStates, DefaultOutputMapping<TableInputEvents>> {
  protected _eventReactions: EventReactions<TableInputEvents, TableInputSMContext, TableInputStates, DefaultOutputMapping<TableInputEvents>> = {
    pointerMove: { action: (context, payload) => context.dragTo(payload.world) },
    pointerUp: { action: (context, payload) => context.drop(payload.world), defaultTargetState: 'IDLE' },
    pointerDown: { action: NO_OP },
  };
}

export function createTableInputStateMachine(context: TableInputSMContext): SM {
  return new TemplateStateMachine({ IDLE: new IdleState(), DRAGGING: new DraggingState() }, 'IDLE', context);
}

/**
 * Adapts a TableInputTracker to the SM context. The tracker's public methods take
 * client coords, but here we already have world points — so we call the tracker's
 * world-level primitives directly.
 */
export function trackerToSMContext(tracker: TableInputTracker): TableInputSMContext {
  return {
    setup: NO_OP,
    cleanup: NO_OP,
    pickUp: (world) => tracker.pickUpWorld(world),
    dragTo: (world) => tracker.dragToWorld(world),
    drop: (world) => tracker.dropWorld(world),
    hoverAt: (world) => tracker.hoverAtWorld(world),
  };
}
