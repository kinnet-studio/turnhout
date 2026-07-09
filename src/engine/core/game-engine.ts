import type { Move, MoveContext, MoveHandler, MoveRegistry } from './moves';
import type { RuleRegistry } from './rules';
import type { GameState } from './game-state';
import type { TableDef } from './table-def';

export interface NewGameArgs {
  tableDef: TableDef;
  rules: RuleRegistry;
  moves: MoveRegistry;
  initial: GameState;
}

export interface DispatchResult {
  ok: boolean;
  state: GameState;
  reason?: string;
}

export class GameEngine {
  private ctx: MoveContext;
  private registry: MoveRegistry;
  private initial: GameState;
  private log: Move[] = [];
  private current: GameState;
  private listeners = new Set<(s: GameState) => void>();

  constructor(args: NewGameArgs) {
    this.ctx = { tableDef: args.tableDef, rules: args.rules };
    this.registry = args.moves;
    this.initial = args.initial;
    this.current = args.initial;
  }

  private handlerFor(move: Move): MoveHandler {
    const h = this.registry.get(move.type);
    if (!h) throw new Error(`unknown move type: ${move.type}`);
    return h;
  }

  canDispatch(move: Move): true | string {
    return this.handlerFor(move).legal(this.current, move, this.ctx);
  }

  dispatch(move: Move): DispatchResult {
    const handler = this.handlerFor(move);
    const verdict = handler.legal(this.current, move, this.ctx);
    if (verdict !== true) return { ok: false, state: this.current, reason: verdict };
    this.current = handler.apply(this.current, move, this.ctx);
    this.log.push(move);
    this.notify();
    return { ok: true, state: this.current };
  }

  private replay(): void {
    let s = this.initial;
    for (const m of this.log) s = this.handlerFor(m).apply(s, m, this.ctx);
    this.current = s;
  }

  undo(): void {
    if (this.log.length === 0) return;
    this.log.pop();
    this.replay();
    this.notify();
  }

  reset(): void {
    this.log = [];
    this.current = this.initial;
    this.notify();
  }

  loadLog(log: Move[]): void {
    this.log = log.slice();
    this.replay();
    this.notify();
  }

  getState(): GameState {
    return this.current;
  }

  getLog(): readonly Move[] {
    return this.log;
  }

  subscribe(fn: (s: GameState) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify(): void {
    for (const fn of this.listeners) fn(this.current);
  }
}
