import type { TurnState } from '../core/game-state';
import type { Move } from '../core/moves';
import type { PlayerId, Scene } from '../core/scene';
import type { Json } from '../core/table-def';

export interface ClientView {
  seat: PlayerId;
  scene: Scene;
  turn?: TurnState;
  /** Game outcome, authored by the game's end-condition result effect. Undefined while live. */
  result?: Json;
  /** What the game adds for this seat beyond the table, such as a board and buttons. Absent when the server has no way to compute it. */
  extras?: Json;
}

export type ClientMessage = { type: 'move'; move: Move };

export type ServerMessage =
  | { type: 'view'; view: ClientView }
  | { type: 'rejected'; reason: string };

/** The server end of one connection. */
export interface Channel {
  send(msg: ServerMessage): void;
  onMessage(cb: (msg: ClientMessage) => void): void;
  close(): void;
}

/** The client end of one connection. */
export interface ClientChannel {
  send(msg: ClientMessage): void;
  onMessage(cb: (msg: ServerMessage) => void): void;
  close(): void;
}
