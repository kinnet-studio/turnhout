import type { GameState } from './game-state';
import type { Json, TableDef } from './table-def';
import type { RuleRegistry } from './rules';

export interface Move {
  type: string;
  [k: string]: Json;
}

export interface MoveContext {
  tableDef: TableDef;
  rules: RuleRegistry;
}

export interface MoveHandler {
  /** Returns true if legal, else a human-readable rejection reason. */
  legal(state: GameState, move: Move, ctx: MoveContext): true | string;
  /** Pure: returns the next state. Randomness only via state.rng. */
  apply(state: GameState, move: Move, ctx: MoveContext): GameState;
}

export class MoveRegistry {
  private handlers = new Map<string, MoveHandler>();

  register(type: string, handler: MoveHandler): this {
    this.handlers.set(type, handler);
    return this;
  }

  get(type: string): MoveHandler | undefined {
    return this.handlers.get(type);
  }

  has(type: string): boolean {
    return this.handlers.has(type);
  }
}
