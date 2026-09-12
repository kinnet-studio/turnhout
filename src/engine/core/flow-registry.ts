import type { GameState } from './game-state';
import type { MoveContext } from './moves';
import type { PlayerId } from './scene';
import type { Json } from './table-def';

/** A serializable reference to a named FlowRegistry entry. */
export type NamedRef = string | { name: string; params?: Json };

export function refName(ref: NamedRef): string {
  return typeof ref === 'string' ? ref : ref.name;
}

export function refParams(ref: NamedRef): Json | undefined {
  return typeof ref === 'string' ? undefined : ref.params;
}

export type FlowPredicate = (state: GameState, ctx: MoveContext, params?: Json) => boolean;
/** Pure: returns the next state. Randomness only via state.rng. */
export type FlowEffect = (state: GameState, ctx: MoveContext, params?: Json) => GameState;
export type TurnPolicy = (state: GameState, order: PlayerId[], ctx: MoveContext, params?: Json) => PlayerId;

export class FlowRegistry {
  private predicates = new Map<string, FlowPredicate>();
  private effects = new Map<string, FlowEffect>();
  private policies = new Map<string, TurnPolicy>();

  registerPredicate(name: string, fn: FlowPredicate): this {
    this.predicates.set(name, fn);
    return this;
  }
  registerEffect(name: string, fn: FlowEffect): this {
    this.effects.set(name, fn);
    return this;
  }
  registerPolicy(name: string, fn: TurnPolicy): this {
    this.policies.set(name, fn);
    return this;
  }
  predicate(name: string): FlowPredicate | undefined {
    return this.predicates.get(name);
  }
  effect(name: string): FlowEffect | undefined {
    return this.effects.get(name);
  }
  policy(name: string): TurnPolicy | undefined {
    return this.policies.get(name);
  }
  hasPredicate(name: string): boolean {
    return this.predicates.has(name);
  }
  hasEffect(name: string): boolean {
    return this.effects.has(name);
  }
  hasPolicy(name: string): boolean {
    return this.policies.has(name);
  }
}
