import type { PlayerId } from './scene';
import type { NamedRef, FlowRegistry } from './flow-registry';
import { refName, refParams } from './flow-registry';
import type { GameState } from './game-state';
import type { Move, MoveContext } from './moves';

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
  /**
   * When the turn passes to the policy's pick. Fires at most once per runFlow,
   * but runFlow runs after EVERY accepted move: an endTurn predicate must be
   * false except immediately after a turn-ending action, or off-turn moves
   * (e.g. anyActor reorders) will advance the turn.
   */
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

export const MAX_FLOW_ITERATIONS = 100;

function evalPred(ref: NamedRef, state: GameState, reg: FlowRegistry, ctx: MoveContext): boolean {
  const fn = reg.predicate(refName(ref));
  if (!fn) throw new Error(`unknown flow predicate: ${refName(ref)}`);
  return fn(state, ctx, refParams(ref));
}

function runEffect(ref: NamedRef, state: GameState, reg: FlowRegistry, ctx: MoveContext): GameState {
  const fn = reg.effect(refName(ref));
  if (!fn) throw new Error(`unknown flow effect: ${refName(ref)}`);
  return fn(state, ctx, refParams(ref));
}

function pickNext(state: GameState, flow: FlowDef, reg: FlowRegistry, ctx: MoveContext): PlayerId {
  if (flow.turn.next) {
    const policy = reg.policy(refName(flow.turn.next));
    if (!policy) throw new Error(`unknown turn policy: ${refName(flow.turn.next)}`);
    return policy(state, flow.turn.order, ctx, refParams(flow.turn.next));
  }
  const order = flow.turn.order;
  const i = order.indexOf(state.turn!.current);
  return order[(i + 1) % order.length];
}

/**
 * Deterministic post-apply flow step: end check → first matching trigger →
 * phase advance (+ target onEnter) → endTurn (at most once) — first match
 * restarts the loop. Replay re-runs this identically after each apply.
 */
export function runFlow(state: GameState, flow: FlowDef, reg: FlowRegistry, ctx: MoveContext): GameState {
  let s = state;
  let endTurnFired = false;
  let lastFired = '(nothing)';
  for (let i = 0; i < MAX_FLOW_ITERATIONS; i++) {
    if (s.result !== undefined) return s;

    const end = (flow.end ?? []).find((e) => evalPred(e.when, s, reg, ctx));
    if (end) {
      s = runEffect(end.result, s, reg, ctx);
      if (s.result === undefined) throw new Error(`end effect ${refName(end.result)} did not set state.result`);
      return s;
    }

    const trig = (flow.triggers ?? []).find((t) => evalPred(t.when, s, reg, ctx));
    if (trig) {
      for (const e of trig.then) s = runEffect(e, s, reg, ctx);
      lastFired = `trigger ${trig.id}`;
      continue;
    }

    const phase = flow.phases.find((p) => p.id === s.turn?.phase);
    if (!phase) throw new Error(`unknown phase: ${s.turn?.phase ?? '(none)'}`);

    if (phase.advance && evalPred(phase.advance.when, s, reg, ctx)) {
      const to = phase.advance.to;
      s = { ...s, turn: { ...s.turn!, phase: to } };
      const target = flow.phases.find((p) => p.id === to)!; // existence validated at load
      for (const e of target.onEnter ?? []) s = runEffect(e, s, reg, ctx);
      lastFired = `advance to ${to}`;
      continue;
    }

    // At most once per invocation: passing the turn rarely falsifies an endTurn
    // predicate (unlike triggers), and a turn passes at most once per player action.
    if (!endTurnFired && phase.endTurn && evalPred(phase.endTurn.when, s, reg, ctx)) {
      endTurnFired = true;
      s = { ...s, turn: { ...s.turn!, current: pickNext(s, flow, reg, ctx) } };
      lastFired = 'endTurn';
      continue;
    }

    return s;
  }
  throw new Error(`flow did not settle after ${MAX_FLOW_ITERATIONS} iterations (last fired: ${lastFired})`);
}

/** Once at engine construction/reset: fill in turn, run the first phase's onEnter, then one runFlow. */
export function initFlow(state: GameState, flow: FlowDef, reg: FlowRegistry, ctx: MoveContext): GameState {
  const first = flow.phases[0];
  let s = state;
  if (!s.turn) s = { ...s, turn: { current: flow.turn.order[0], phase: first.id } };
  else if (s.turn.phase === undefined) s = { ...s, turn: { ...s.turn, phase: first.id } };
  if (s.turn!.phase === first.id) {
    for (const e of first.onEnter ?? []) s = runEffect(e, s, reg, ctx);
  }
  return runFlow(s, flow, reg, ctx);
}
