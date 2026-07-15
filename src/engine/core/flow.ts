import type { PlayerId } from './scene';
import type { NamedRef } from './flow-registry';
import type { GameState } from './game-state';
import type { Move } from './moves';

export interface FlowDef {
  turn: {
    order: PlayerId[];
    /** Turn-order policy (FlowRegistry policy name); default: round-robin over `order`. */
    next?: NamedRef;
  };
  /** Ordered; the first entry is the starting phase. */
  phases: PhaseDef[];
  triggers?: TriggerDef[];
  end?: EndDef[];
}

export interface PhaseDef {
  /** Stored in state.turn.phase. */
  id: string;
  /** Move types legal in this phase. */
  allow: string[] | 'any';
  /** Who may submit (default 'current'). */
  actor?: 'current' | 'any';
  /** Move types exempt from the actor gate (still phase-gated via allow). */
  anyActor?: string[];
  /** Effects run when the phase is entered. */
  onEnter?: NamedRef[];
  /** Phase transition, checked after each move. */
  advance?: { when: NamedRef; to: string };
  /** When the turn passes to the policy's pick. Fires at most once per runFlow. */
  endTurn?: { when: NamedRef };
}

export interface TriggerDef {
  /** For error messages / debugging. */
  id: string;
  when: NamedRef;
  /** Effects, applied in order; must falsify `when` or the iteration cap throws. */
  then: NamedRef[];
}

export interface EndDef {
  when: NamedRef;
  /** Effect that writes the outcome into state.result. */
  result: NamedRef;
}

/** Flow gate, checked before a move handler's own `legal`. Pure data lookup — no registry. */
export function gateMove(state: GameState, move: Move, flow: FlowDef): true | string {
  if (state.result !== undefined) return 'game is over';
  const phase = flow.phases.find((p) => p.id === state.turn?.phase);
  if (!phase) return `unknown phase: ${state.turn?.phase ?? '(none)'}`;
  if (phase.allow !== 'any' && !phase.allow.includes(move.type)) {
    return `move ${move.type} not allowed in phase ${phase.id}`;
  }
  const exempt = phase.anyActor?.includes(move.type) ?? false;
  if ((phase.actor ?? 'current') === 'current' && !exempt) {
    const by = move.by;
    if (typeof by !== 'string') return 'move has no actor (by)';
    if (by !== state.turn?.current) return `not ${by}'s turn`;
  }
  return true;
}
