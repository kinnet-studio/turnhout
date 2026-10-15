import { deriveScene } from '../core/derive-scene';
import type { GameEngine } from '../core/game-engine';
import type { GameState } from '../core/game-state';
import type { Move } from '../core/moves';
import type { PlayerId } from '../core/scene';
import type { Json, TableDef } from '../core/table-def';
import type { ClientView } from './protocol';

export interface SubmitResult {
  ok: boolean;
  reason?: string;
}

export class GameServer {
  private engine: GameEngine;
  private tableDef: TableDef;
  private seatList: PlayerId[];
  private extras?: (state: GameState, seat: PlayerId) => Json;
  private listeners = new Set<() => void>();

  /**
   * `extras` lets a game add to each seat's view what the table cannot show (a board, the seat's buttons). It stays a
   * callback so the net layer knows nothing of any game's language, and a view carries `extras` only when it is given.
   */
  constructor(args: {
    engine: GameEngine; tableDef: TableDef; seats: PlayerId[]; extras?: (state: GameState, seat: PlayerId) => Json;
  }) {
    this.engine = args.engine;
    this.tableDef = args.tableDef;
    this.seatList = args.seats;
    this.extras = args.extras;
  }

  submit(by: PlayerId, move: Move): SubmitResult {
    const stamped: Move = { ...move, by };
    const res = this.engine.dispatch(stamped);
    if (!res.ok) return { ok: false, reason: res.reason };
    for (const fn of this.listeners) fn();
    return { ok: true };
  }

  /** Takes back the last move and pushes the rewound view to every subscriber. */
  undo(): void {
    this.engine.undo();
    for (const fn of this.listeners) fn();
  }

  viewFor(seat: PlayerId): ClientView {
    const state = this.engine.getState();
    return {
      seat,
      scene: deriveScene(this.tableDef, { cards: state.cards }, seat),
      turn: state.turn,
      result: state.result,
      ...(this.extras ? { extras: this.extras(state, seat) } : {}),
    };
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  seats(): PlayerId[] {
    return this.seatList;
  }
}
