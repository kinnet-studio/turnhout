import { deriveScene } from '../core/derive-scene';
import type { GameEngine } from '../core/game-engine';
import type { Move } from '../core/moves';
import type { PlayerId } from '../core/scene';
import type { TableDef } from '../core/table-def';
import type { ClientView } from './protocol';

export interface SubmitResult {
  ok: boolean;
  reason?: string;
}

export class GameServer {
  private engine: GameEngine;
  private tableDef: TableDef;
  private seatList: PlayerId[];
  private listeners = new Set<() => void>();

  constructor(args: { engine: GameEngine; tableDef: TableDef; seats: PlayerId[] }) {
    this.engine = args.engine;
    this.tableDef = args.tableDef;
    this.seatList = args.seats;
  }

  submit(by: PlayerId, move: Move): SubmitResult {
    const stamped: Move = { ...move, by };
    const res = this.engine.dispatch(stamped);
    if (!res.ok) return { ok: false, reason: res.reason };
    for (const fn of this.listeners) fn();
    return { ok: true };
  }

  viewFor(seat: PlayerId): ClientView {
    const state = this.engine.getState();
    return {
      seat,
      scene: deriveScene(this.tableDef, { cards: state.cards }, seat),
      turn: state.turn,
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
