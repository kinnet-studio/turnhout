# Rule Engine (Game Flow) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A declarative, serializable game-flow layer (phases, actor gating, condition-based triggers, end conditions, named turn policies) interpreted inside `GameEngine.dispatch`, proven by a 4-player Hearts demo over the loopback net stack.

**Architecture:** A `FlowDef` (pure JSON data) plus a `FlowRegistry` of named predicates/effects/policies, interpreted by pure functions (`gateMove` → before a move's `legal`; `runFlow` → fixpoint loop after every `apply`; `initFlow` → once at construction). The move log stays player-intents-only; replay re-runs flow deterministically, so undo/`loadLog`/net sync inherit correctness. Spec: `docs/superpowers/specs/2026-07-15-rule-engine-design.md`.

**Tech Stack:** TypeScript (strict), Vitest, React + PixiJS confined to `src/pages/`.

## Global Constraints

- Work in worktree `/Users/vincent.yy.chang/dev/turnhout/rule`, branch `feat/rule-engine`. All commands run from that directory.
- Path alias `@/` = `src/`. Run a single test file with `npx vitest run <path>`; full suite `npm test`; types `npm run typecheck`.
- No new dependencies.
- `src/engine/**` stays framework-pure: no pixi/react imports, no side effects, all state transitions pure (randomness only via `state.rng` + `src/engine/core/rng.ts` helpers).
- `FlowDef` and everything inside it must be `Json`-serializable (`Json` from `src/engine/core/table-def.ts`). Behavior only via named registry entries.
- Card ids are opaque (`c0`…`c51`) — never encode suit/rank in the id (SP3 invariant).
- Follow existing code style: 2-space indent, single quotes, `m.foo as string` casts for move fields, registries with chainable `register*`.
- Commit prefixes: `feat(core):`, `feat(net):`, `feat(net-demo):`, `feat(hearts-demo):`, `test:`, `docs:`.
- TDD: write the failing test first, watch it fail, implement, watch it pass, commit.

---

### Task 1: `GameState.result` + `FlowRegistry`

**Files:**
- Create: `src/engine/core/flow-registry.ts`
- Test: `src/engine/core/flow-registry.test.ts`
- Modify: `src/engine/core/game-state.ts` (add one field to `GameState`)

**Interfaces:**
- Consumes: `GameState` (`./game-state`), `MoveContext` (`./moves`), `Json` (`./table-def`), `PlayerId` (`./scene`).
- Produces (used by every later task):
  - `type NamedRef = string | { name: string; params?: Json }`
  - `refName(ref: NamedRef): string`, `refParams(ref: NamedRef): Json | undefined`
  - `type FlowPredicate = (state: GameState, ctx: MoveContext, params?: Json) => boolean`
  - `type FlowEffect = (state: GameState, ctx: MoveContext, params?: Json) => GameState`
  - `type TurnPolicy = (state: GameState, order: PlayerId[], ctx: MoveContext, params?: Json) => PlayerId`
  - `class FlowRegistry` with `registerPredicate/registerEffect/registerPolicy` (chainable), `predicate/effect/policy` (getters), `hasPredicate/hasEffect/hasPolicy`
  - `GameState.result?: Json`

- [ ] **Step 1: Write the failing test**

```ts
// src/engine/core/flow-registry.test.ts
import { describe, expect, it } from 'vitest';
import { FlowRegistry, refName, refParams } from './flow-registry';
import type { GameState } from './game-state';
import { makeRng } from './rng';

const state: GameState = { cards: [], data: {}, rng: makeRng(1) };

describe('NamedRef helpers', () => {
  it('reads name and params from both forms', () => {
    expect(refName('foo')).toBe('foo');
    expect(refParams('foo')).toBeUndefined();
    expect(refName({ name: 'bar', params: { n: 1 } })).toBe('bar');
    expect(refParams({ name: 'bar', params: { n: 1 } })).toEqual({ n: 1 });
  });
});

describe('FlowRegistry', () => {
  it('registers and resolves the three kinds independently', () => {
    const reg = new FlowRegistry()
      .registerPredicate('p', () => true)
      .registerEffect('e', (s) => s)
      .registerPolicy('t', (_s, order) => order[0]);
    expect(reg.hasPredicate('p')).toBe(true);
    expect(reg.hasEffect('e')).toBe(true);
    expect(reg.hasPolicy('t')).toBe(true);
    // namespaces are separate: 'p' is only a predicate
    expect(reg.hasEffect('p')).toBe(false);
    expect(reg.hasPolicy('p')).toBe(false);
    expect(reg.predicate('p')!(state, { tableDef: { zones: [] }, rules: null as never })).toBe(true);
    expect(reg.effect('missing')).toBeUndefined();
  });
});

describe('GameState.result', () => {
  it('is optional and Json-typed', () => {
    const s: GameState = { cards: [], data: {}, rng: makeRng(1), result: { winner: 'p0' } };
    expect(s.result).toEqual({ winner: 'p0' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/core/flow-registry.test.ts`
Expected: FAIL — cannot resolve `./flow-registry`.

- [ ] **Step 3: Implement**

Add to `GameState` in `src/engine/core/game-state.ts` (after the `rng` field; `Json` is already imported):

```ts
export interface GameState {
  cards: CardState[];
  turn?: TurnState;
  data: Record<string, Json>;
  rng: RngState;
  /** Set once by an end condition's result effect; the flow gate rejects all moves when defined. */
  result?: Json;
}
```

Create `src/engine/core/flow-registry.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/core/flow-registry.test.ts`
Expected: PASS (3 tests). Also run `npm run typecheck` — no errors.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/flow-registry.ts src/engine/core/flow-registry.test.ts src/engine/core/game-state.ts
git commit -m "feat(core): FlowRegistry (named predicates/effects/policies) + GameState.result"
```

---

### Task 2: `FlowDef` types + `validateFlowDef`

**Files:**
- Create: `src/engine/core/flow.ts` (types only in this task; functions come in Tasks 3–4)
- Create: `src/engine/core/flow-def-validate.ts`
- Test: `src/engine/core/flow-def-validate.test.ts`

**Interfaces:**
- Consumes: `NamedRef`, `FlowRegistry`, `refName` (Task 1); `PlayerId` (`./scene`).
- Produces:
  - `interface FlowDef { turn: { order: PlayerId[]; next?: NamedRef }; phases: PhaseDef[]; triggers?: TriggerDef[]; end?: EndDef[] }`
  - `interface PhaseDef { id: string; allow: string[] | 'any'; actor?: 'current' | 'any'; anyActor?: string[]; onEnter?: NamedRef[]; advance?: { when: NamedRef; to: string }; endTurn?: { when: NamedRef } }`
  - `interface TriggerDef { id: string; when: NamedRef; then: NamedRef[] }`
  - `interface EndDef { when: NamedRef; result: NamedRef }`
  - `validateFlowDef(flow: FlowDef, registry: FlowRegistry): { ok: boolean; errors: string[] }`

- [ ] **Step 1: Write the failing test**

```ts
// src/engine/core/flow-def-validate.test.ts
import { describe, expect, it } from 'vitest';
import { validateFlowDef } from './flow-def-validate';
import type { FlowDef } from './flow';
import { FlowRegistry } from './flow-registry';

const reg = () =>
  new FlowRegistry()
    .registerPredicate('always', () => true)
    .registerEffect('noop', (s) => s)
    .registerPolicy('rr', (_s, order) => order[0]);

const base = (): FlowDef => ({
  turn: { order: ['a', 'b'] },
  phases: [{ id: 'main', allow: 'any' }],
});

describe('validateFlowDef', () => {
  it('accepts a minimal valid flow', () => {
    expect(validateFlowDef(base(), reg())).toEqual({ ok: true, errors: [] });
  });

  it('rejects empty phases and empty turn order', () => {
    const v = validateFlowDef({ turn: { order: [] }, phases: [] }, reg());
    expect(v.ok).toBe(false);
    expect(v.errors).toContain('flow has no phases');
    expect(v.errors).toContain('turn.order is empty');
  });

  it('rejects duplicate phase ids', () => {
    const f = base();
    f.phases.push({ id: 'main', allow: 'any' });
    expect(validateFlowDef(f, reg()).errors).toContain('duplicate phase id: main');
  });

  it('rejects advance.to naming an unknown phase', () => {
    const f = base();
    f.phases[0].advance = { when: 'always', to: 'nope' };
    expect(validateFlowDef(f, reg()).errors).toContain('phase main advances to unknown phase: nope');
  });

  it('rejects unresolved named refs of each kind', () => {
    const f: FlowDef = {
      turn: { order: ['a'], next: 'missingPolicy' },
      phases: [
        {
          id: 'p',
          allow: ['x'],
          onEnter: ['missingEffect'],
          advance: { when: 'missingPred', to: 'p' },
          endTurn: { when: { name: 'missingPred2', params: null } },
        },
      ],
      triggers: [{ id: 't1', when: 'missingPred3', then: ['missingEffect2'] }],
      end: [{ when: 'missingPred4', result: 'missingEffect3' }],
    };
    const v = validateFlowDef(f, reg());
    expect(v.ok).toBe(false);
    expect(v.errors).toContain('turn.next references unknown policy: missingPolicy');
    expect(v.errors).toContain('phase p onEnter references unknown effect: missingEffect');
    expect(v.errors).toContain('phase p advance references unknown predicate: missingPred');
    expect(v.errors).toContain('phase p endTurn references unknown predicate: missingPred2');
    expect(v.errors).toContain('trigger t1 references unknown predicate: missingPred3');
    expect(v.errors).toContain('trigger t1 references unknown effect: missingEffect2');
    expect(v.errors).toContain('end[0] references unknown predicate: missingPred4');
    expect(v.errors).toContain('end[0] references unknown effect: missingEffect3');
  });

  it('rejects anyActor entries missing from allow', () => {
    const f = base();
    f.phases[0] = { id: 'main', allow: ['play'], anyActor: ['reorder'] };
    expect(validateFlowDef(f, reg()).errors).toContain('phase main anyActor lists move not in allow: reorder');
  });

  it("accepts anyActor entries when allow is 'any'", () => {
    const f = base();
    f.phases[0] = { id: 'main', allow: 'any', anyActor: ['reorder'] };
    expect(validateFlowDef(f, reg()).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/core/flow-def-validate.test.ts`
Expected: FAIL — cannot resolve `./flow-def-validate` / `./flow`.

- [ ] **Step 3: Implement**

Create `src/engine/core/flow.ts` (types only for now):

```ts
import type { PlayerId } from './scene';
import type { NamedRef } from './flow-registry';

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
```

Create `src/engine/core/flow-def-validate.ts`:

```ts
import type { FlowDef } from './flow';
import { refName, type FlowRegistry, type NamedRef } from './flow-registry';

export function validateFlowDef(flow: FlowDef, registry: FlowRegistry): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const pred = (ref: NamedRef, where: string) => {
    if (!registry.hasPredicate(refName(ref))) errors.push(`${where} references unknown predicate: ${refName(ref)}`);
  };
  const eff = (ref: NamedRef, where: string) => {
    if (!registry.hasEffect(refName(ref))) errors.push(`${where} references unknown effect: ${refName(ref)}`);
  };

  if (flow.phases.length === 0) errors.push('flow has no phases');
  if (flow.turn.order.length === 0) errors.push('turn.order is empty');
  if (flow.turn.next && !registry.hasPolicy(refName(flow.turn.next))) {
    errors.push(`turn.next references unknown policy: ${refName(flow.turn.next)}`);
  }

  const ids = new Set<string>();
  for (const p of flow.phases) {
    if (ids.has(p.id)) errors.push(`duplicate phase id: ${p.id}`);
    ids.add(p.id);
  }
  for (const p of flow.phases) {
    for (const e of p.onEnter ?? []) eff(e, `phase ${p.id} onEnter`);
    if (p.advance) {
      pred(p.advance.when, `phase ${p.id} advance`);
      if (!ids.has(p.advance.to)) errors.push(`phase ${p.id} advances to unknown phase: ${p.advance.to}`);
    }
    if (p.endTurn) pred(p.endTurn.when, `phase ${p.id} endTurn`);
    if (p.anyActor && p.allow !== 'any') {
      for (const t of p.anyActor) {
        if (!p.allow.includes(t)) errors.push(`phase ${p.id} anyActor lists move not in allow: ${t}`);
      }
    }
  }
  for (const t of flow.triggers ?? []) {
    pred(t.when, `trigger ${t.id}`);
    for (const e of t.then) eff(e, `trigger ${t.id}`);
  }
  (flow.end ?? []).forEach((e, i) => {
    pred(e.when, `end[${i}]`);
    eff(e.result, `end[${i}]`);
  });
  return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/core/flow-def-validate.test.ts`
Expected: PASS (7 tests). `npm run typecheck` clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/flow.ts src/engine/core/flow-def-validate.ts src/engine/core/flow-def-validate.test.ts
git commit -m "feat(core): FlowDef types + validateFlowDef (load-time, fail-loud)"
```

---

### Task 3: `gateMove`

**Files:**
- Modify: `src/engine/core/flow.ts` (append)
- Test: `src/engine/core/flow.test.ts` (new file)

**Interfaces:**
- Consumes: `FlowDef`/`PhaseDef` (Task 2), `GameState` (`./game-state`), `Move` (`./moves`).
- Produces: `gateMove(state: GameState, move: Move, flow: FlowDef): true | string` — no registry needed (gating is pure data lookup).

- [ ] **Step 1: Write the failing test**

```ts
// src/engine/core/flow.test.ts
import { describe, expect, it } from 'vitest';
import { gateMove } from './flow';
import type { FlowDef } from './flow';
import type { GameState } from './game-state';
import { makeRng } from './rng';

const flow: FlowDef = {
  turn: { order: ['a', 'b'] },
  phases: [
    { id: 'main', allow: ['play', 'reorder'], anyActor: ['reorder'] },
    { id: 'open', allow: 'any', actor: 'any' },
  ],
};

const st = (over?: Partial<GameState>): GameState => ({
  cards: [],
  turn: { current: 'a', phase: 'main' },
  data: {},
  rng: makeRng(1),
  ...over,
});

describe('gateMove', () => {
  it('rejects everything once the game is over', () => {
    expect(gateMove(st({ result: { winner: 'a' } }), { type: 'play', by: 'a' }, flow)).toBe('game is over');
  });

  it('fails closed on unknown or missing phase', () => {
    expect(gateMove(st({ turn: { current: 'a', phase: 'nope' } }), { type: 'play', by: 'a' }, flow)).toBe('unknown phase: nope');
    expect(gateMove(st({ turn: undefined }), { type: 'play', by: 'a' }, flow)).toBe('unknown phase: (none)');
  });

  it('rejects move types not allowed in the phase', () => {
    expect(gateMove(st(), { type: 'deal', by: 'a' }, flow)).toBe('move deal not allowed in phase main');
  });

  it('rejects off-turn and anonymous actors', () => {
    expect(gateMove(st(), { type: 'play', by: 'b' }, flow)).toBe("not b's turn");
    expect(gateMove(st(), { type: 'play' }, flow)).toBe('move has no actor (by)');
  });

  it('lets the current actor play', () => {
    expect(gateMove(st(), { type: 'play', by: 'a' }, flow)).toBe(true);
  });

  it('anyActor exempts listed move types from the actor gate', () => {
    expect(gateMove(st(), { type: 'reorder', by: 'b' }, flow)).toBe(true);
  });

  it("actor 'any' phases accept any seat and allow 'any' accepts any move type", () => {
    const s = st({ turn: { current: 'a', phase: 'open' } });
    expect(gateMove(s, { type: 'whatever', by: 'b' }, flow)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/core/flow.test.ts`
Expected: FAIL — `gateMove` is not exported.

- [ ] **Step 3: Implement** — append to `src/engine/core/flow.ts` (add the two imports to the top of the file):

```ts
import type { GameState } from './game-state';
import type { Move } from './moves';
```

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/core/flow.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/flow.ts src/engine/core/flow.test.ts
git commit -m "feat(core): gateMove — phase/actor/game-over gating, fail-closed on unknown phase"
```

---

### Task 4: `runFlow` + `initFlow`

**Files:**
- Modify: `src/engine/core/flow.ts` (append)
- Test: `src/engine/core/flow.test.ts` (append)

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `MAX_FLOW_ITERATIONS = 100` (exported const)
  - `runFlow(state: GameState, flow: FlowDef, reg: FlowRegistry, ctx: MoveContext): GameState`
  - `initFlow(state: GameState, flow: FlowDef, reg: FlowRegistry, ctx: MoveContext): GameState`
- Fixed per-iteration order: end check → first matching trigger → phase advance (+ target `onEnter`) → endTurn (at most once per invocation) → settle. Missing turn policy defaults to round-robin over `flow.turn.order` (no registry entry required).

- [ ] **Step 1: Write the failing tests** — append to `src/engine/core/flow.test.ts`:

```ts
import { initFlow, runFlow, MAX_FLOW_ITERATIONS } from './flow';
import { FlowRegistry } from './flow-registry';
import { zoneCards } from './game-state';
import type { MoveContext } from './moves';
import { RuleRegistry } from './rules';
import type { CardState } from './scene';

const ctx: MoveContext = {
  tableDef: { zones: [
    { id: 'a', layout: 'pile', transform: { x: 0, y: 0 } },
    { id: 'b', layout: 'pile', transform: { x: 0, y: 0 } },
  ] },
  rules: new RuleRegistry(),
};

const card = (id: string, zoneId: string): CardState => ({ id, zoneId, faceUp: false, faceKey: 'x' });

const reg = () =>
  new FlowRegistry()
    .registerPredicate('always', () => true)
    .registerPredicate('never', () => false)
    .registerPredicate('aHasCards', (s) => zoneCards(s, 'a').length > 0)
    .registerEffect('drainA', (s) => ({ ...s, cards: s.cards.map((c) => (c.zoneId === 'a' ? { ...c, zoneId: 'b' } : c)) }))
    .registerEffect('noop', (s) => s)
    .registerEffect('finish', (s) => ({ ...s, result: { done: true } }))
    .registerEffect('mark', (s) => ({ ...s, data: { ...s.data, marked: true } }));

const mk = (over?: Partial<GameState>): GameState => ({
  cards: [card('c1', 'a')],
  turn: { current: 'a', phase: 'main' },
  data: {},
  rng: makeRng(1),
  ...over,
});

describe('runFlow', () => {
  it('fires a trigger to fixpoint and settles', () => {
    const flow: FlowDef = {
      turn: { order: ['a', 'b'] },
      phases: [{ id: 'main', allow: 'any' }],
      triggers: [{ id: 'drain', when: 'aHasCards', then: ['drainA'] }],
    };
    const out = runFlow(mk(), flow, reg(), ctx);
    expect(zoneCards(out, 'a')).toHaveLength(0);
    expect(zoneCards(out, 'b')).toHaveLength(1);
  });

  it('throws at the iteration cap naming the runaway trigger', () => {
    const flow: FlowDef = {
      turn: { order: ['a'] },
      phases: [{ id: 'main', allow: 'any' }],
      triggers: [{ id: 'runaway', when: 'always', then: ['noop'] }],
    };
    expect(() => runFlow(mk(), flow, reg(), ctx)).toThrow(new RegExp(`${MAX_FLOW_ITERATIONS} iterations.*trigger runaway`));
  });

  it('checks end conditions before triggers and stops permanently', () => {
    const flow: FlowDef = {
      turn: { order: ['a'] },
      phases: [{ id: 'main', allow: 'any' }],
      triggers: [{ id: 'drain', when: 'aHasCards', then: ['drainA'] }],
      end: [{ when: 'aHasCards', result: 'finish' }],
    };
    const out = runFlow(mk(), flow, reg(), ctx);
    expect(out.result).toEqual({ done: true });
    expect(zoneCards(out, 'a')).toHaveLength(1); // trigger never ran
  });

  it('throws if an end result effect forgets to set state.result', () => {
    const flow: FlowDef = {
      turn: { order: ['a'] },
      phases: [{ id: 'main', allow: 'any' }],
      end: [{ when: 'always', result: 'noop' }],
    };
    expect(() => runFlow(mk(), flow, reg(), ctx)).toThrow(/did not set state.result/);
  });

  it("advances phase and runs the target's onEnter", () => {
    const flow: FlowDef = {
      turn: { order: ['a'] },
      phases: [
        { id: 'main', allow: 'any', advance: { when: 'always', to: 'next' } },
        { id: 'next', allow: 'any', onEnter: ['mark'] },
      ],
    };
    const out = runFlow(mk(), flow, reg(), ctx);
    expect(out.turn?.phase).toBe('next');
    expect(out.data.marked).toBe(true);
  });

  it('endTurn fires at most once per invocation (default round-robin)', () => {
    const flow: FlowDef = {
      turn: { order: ['a', 'b', 'c'] },
      phases: [{ id: 'main', allow: 'any', endTurn: { when: 'always' } }],
    };
    const out = runFlow(mk(), flow, reg(), ctx);
    expect(out.turn?.current).toBe('b'); // exactly one step, not b→c→a…
  });

  it('uses the named turn policy when turn.next is set', () => {
    const r = reg().registerPolicy('toC', () => 'c');
    const flow: FlowDef = {
      turn: { order: ['a', 'b', 'c'], next: 'toC' },
      phases: [{ id: 'main', allow: 'any', endTurn: { when: 'always' } }],
    };
    expect(runFlow(mk(), flow, r, ctx).turn?.current).toBe('c');
  });

  it('throws on an unknown phase in state', () => {
    const flow: FlowDef = { turn: { order: ['a'] }, phases: [{ id: 'main', allow: 'any' }] };
    expect(() => runFlow(mk({ turn: { current: 'a', phase: 'ghost' } }), flow, reg(), ctx)).toThrow(/unknown phase: ghost/);
  });
});

describe('initFlow', () => {
  const flow: FlowDef = {
    turn: { order: ['a', 'b'] },
    phases: [
      { id: 'setup', allow: [], onEnter: ['mark'], advance: { when: 'always', to: 'main' } },
      { id: 'main', allow: 'any' },
    ],
  };

  it('fills in turn, runs first-phase onEnter, then runs flow (auto-advance)', () => {
    const out = initFlow(mk({ turn: undefined }), flow, reg(), ctx);
    expect(out.turn).toEqual({ current: 'a', phase: 'main' });
    expect(out.data.marked).toBe(true);
  });

  it('respects a preset turn and skips onEnter for a non-first phase', () => {
    const out = initFlow(mk({ turn: { current: 'b', phase: 'main' } }), flow, reg(), ctx);
    expect(out.turn).toEqual({ current: 'b', phase: 'main' });
    expect(out.data.marked).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/core/flow.test.ts`
Expected: FAIL — `runFlow`/`initFlow`/`MAX_FLOW_ITERATIONS` not exported.

- [ ] **Step 3: Implement** — append to `src/engine/core/flow.ts` (extend the imports: `refName, refParams, type FlowRegistry` from `./flow-registry`, `type MoveContext` from `./moves`, `type PlayerId` already imported):

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/core/flow.test.ts`
Expected: PASS (17 tests). `npm run typecheck` clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/flow.ts src/engine/core/flow.test.ts
git commit -m "feat(core): runFlow fixpoint interpreter + initFlow (end→trigger→advance→endTurn)"
```

---

### Task 5: Core flow library

**Files:**
- Create: `src/engine/core/flow-library.ts`
- Test: `src/engine/core/flow-library.test.ts`

**Interfaces:**
- Consumes: Task 1 types, `zoneCards` (`./game-state`), `shuffleWithRng` (`./rng`).
- Produces: `registerCoreFlow(reg: FlowRegistry): FlowRegistry` registering
  predicates `always`, `zoneEmpty {zone}`, `zonesEmpty {zones}`, `zoneCount {zone, count}`, `zonesCount {zones, count}`;
  effects `moveZone {from, to}` (drops `slot`), `setData {key, value}`, `deal {from, to, count, faceUp?}` (top N, drops `slot`), `shuffleZone {zone}`;
  policy `roundRobin`.

- [ ] **Step 1: Write the failing test**

```ts
// src/engine/core/flow-library.test.ts
import { describe, expect, it } from 'vitest';
import { registerCoreFlow } from './flow-library';
import { FlowRegistry } from './flow-registry';
import { zoneCards, type GameState } from './game-state';
import type { MoveContext } from './moves';
import { makeRng } from './rng';
import { RuleRegistry } from './rules';
import type { CardState } from './scene';

const reg = registerCoreFlow(new FlowRegistry());
const ctx: MoveContext = { tableDef: { zones: [] }, rules: new RuleRegistry() };
const card = (id: string, zoneId: string, slot?: number): CardState => ({ id, zoneId, faceUp: false, faceKey: 'x', slot });
const mk = (cards: CardState[]): GameState => ({ cards, turn: { current: 'a' }, data: {}, rng: makeRng(7) });

describe('core flow predicates', () => {
  const s = mk([card('c1', 'a'), card('c2', 'a'), card('c3', 'b')]);
  it('always / zoneEmpty / zonesEmpty', () => {
    expect(reg.predicate('always')!(s, ctx)).toBe(true);
    expect(reg.predicate('zoneEmpty')!(s, ctx, { zone: 'z' })).toBe(true);
    expect(reg.predicate('zoneEmpty')!(s, ctx, { zone: 'a' })).toBe(false);
    expect(reg.predicate('zonesEmpty')!(s, ctx, { zones: ['z', 'y'] })).toBe(true);
    expect(reg.predicate('zonesEmpty')!(s, ctx, { zones: ['z', 'a'] })).toBe(false);
  });
  it('zoneCount / zonesCount are exact', () => {
    expect(reg.predicate('zoneCount')!(s, ctx, { zone: 'a', count: 2 })).toBe(true);
    expect(reg.predicate('zoneCount')!(s, ctx, { zone: 'a', count: 1 })).toBe(false);
    expect(reg.predicate('zonesCount')!(s, ctx, { zones: ['b'], count: 1 })).toBe(true);
    expect(reg.predicate('zonesCount')!(s, ctx, { zones: ['a', 'b'], count: 1 })).toBe(false);
  });
});

describe('core flow effects', () => {
  it('moveZone moves every card and drops slots', () => {
    const out = reg.effect('moveZone')!(mk([card('c1', 'a', 3), card('c2', 'a', 1), card('c3', 'b', 0)]), ctx, { from: 'a', to: 'b' });
    expect(zoneCards(out, 'a')).toHaveLength(0);
    expect(zoneCards(out, 'b')).toHaveLength(3);
    expect(out.cards.find((c) => c.id === 'c1')!.slot).toBeUndefined();
  });
  it('setData writes a key', () => {
    const out = reg.effect('setData')!(mk([]), ctx, { key: 'k', value: 42 });
    expect(out.data.k).toBe(42);
  });
  it('deal moves the top N and can flip', () => {
    const out = reg.effect('deal')!(mk([card('c1', 'a', 0), card('c2', 'a', 1), card('c3', 'a', 2)]), ctx, { from: 'a', to: 'b', count: 2, faceUp: true });
    expect(zoneCards(out, 'a').map((c) => c.id)).toEqual(['c1']);
    expect(zoneCards(out, 'b').every((c) => c.faceUp)).toBe(true);
  });
  it('shuffleZone is deterministic from state.rng and advances it', () => {
    const s = mk([card('c1', 'a', 0), card('c2', 'a', 1), card('c3', 'a', 2), card('c4', 'a', 3)]);
    const out1 = reg.effect('shuffleZone')!(s, ctx, { zone: 'a' });
    const out2 = reg.effect('shuffleZone')!(s, ctx, { zone: 'a' });
    expect(out1.cards.map((c) => c.slot)).toEqual(out2.cards.map((c) => c.slot)); // same rng in → same order
    expect(out1.rng.count).toBeGreaterThan(s.rng.count);
  });
});

describe('roundRobin policy', () => {
  it('advances one seat and wraps', () => {
    const p = reg.policy('roundRobin')!;
    expect(p(mk([]), ['a', 'b', 'c'], ctx)).toBe('b');
    const s: GameState = { cards: [], turn: { current: 'c' }, data: {}, rng: makeRng(1) };
    expect(p(s, ['a', 'b', 'c'], ctx)).toBe('a');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/core/flow-library.test.ts`
Expected: FAIL — cannot resolve `./flow-library`.

- [ ] **Step 3: Implement** `src/engine/core/flow-library.ts`:

```ts
import { zoneCards } from './game-state';
import type { FlowEffect, FlowPredicate, FlowRegistry, TurnPolicy } from './flow-registry';
import { shuffleWithRng } from './rng';
import type { Json } from './table-def';

const always: FlowPredicate = () => true;

const zoneEmpty: FlowPredicate = (s, _ctx, p) => zoneCards(s, (p as { zone: string }).zone).length === 0;

const zonesEmpty: FlowPredicate = (s, _ctx, p) =>
  (p as { zones: string[] }).zones.every((z) => zoneCards(s, z).length === 0);

const zoneCount: FlowPredicate = (s, _ctx, p) => {
  const { zone, count } = p as { zone: string; count: number };
  return zoneCards(s, zone).length === count;
};

const zonesCount: FlowPredicate = (s, _ctx, p) => {
  const { zones, count } = p as { zones: string[]; count: number };
  return zones.every((z) => zoneCards(s, z).length === count);
};

const moveZone: FlowEffect = (s, _ctx, p) => {
  const { from, to } = p as { from: string; to: string };
  return { ...s, cards: s.cards.map((c) => (c.zoneId === from ? { ...c, zoneId: to, slot: undefined } : c)) };
};

const setData: FlowEffect = (s, _ctx, p) => {
  const { key, value } = p as { key: string; value: Json };
  return { ...s, data: { ...s.data, [key]: value } };
};

const deal: FlowEffect = (s, _ctx, p) => {
  const { from, to, count, faceUp } = p as { from: string; to: string; count: number; faceUp?: boolean };
  const top = count > 0 ? zoneCards(s, from).slice(-count) : [];
  const ids = new Set(top.map((c) => c.id));
  return {
    ...s,
    cards: s.cards.map((c) =>
      ids.has(c.id) ? { ...c, zoneId: to, slot: undefined, ...(faceUp !== undefined ? { faceUp } : {}) } : c,
    ),
  };
};

const shuffleZone: FlowEffect = (s, _ctx, p) => {
  const zoneId = (p as { zone: string }).zone;
  const inZone = zoneCards(s, zoneId);
  const { items, rng } = shuffleWithRng(inZone, s.rng);
  const slotById = new Map(items.map((c, i) => [c.id, i]));
  return {
    ...s,
    rng,
    cards: s.cards.map((c) => (slotById.has(c.id) ? { ...c, slot: slotById.get(c.id) } : c)),
  };
};

const roundRobin: TurnPolicy = (s, order) => order[(order.indexOf(s.turn!.current) + 1) % order.length];

export function registerCoreFlow(reg: FlowRegistry): FlowRegistry {
  return reg
    .registerPredicate('always', always)
    .registerPredicate('zoneEmpty', zoneEmpty)
    .registerPredicate('zonesEmpty', zonesEmpty)
    .registerPredicate('zoneCount', zoneCount)
    .registerPredicate('zonesCount', zonesCount)
    .registerEffect('moveZone', moveZone)
    .registerEffect('setData', setData)
    .registerEffect('deal', deal)
    .registerEffect('shuffleZone', shuffleZone)
    .registerPolicy('roundRobin', roundRobin);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/core/flow-library.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/flow-library.ts src/engine/core/flow-library.test.ts
git commit -m "feat(core): core flow library — zone predicates, deal/shuffle/move effects, roundRobin"
```

---

### Task 6: `GameEngine` flow integration

**Files:**
- Modify: `src/engine/core/game-engine.ts`
- Test: `src/engine/core/game-engine.test.ts` (append a `describe` block)

**Interfaces:**
- Consumes: everything above.
- Produces: `NewGameArgs` gains `flow?: FlowDef; flowRegistry?: FlowRegistry`. Behavior without `flow` is byte-identical to today (the existing test suite is the guard — do not modify existing tests).

- [ ] **Step 1: Write the failing tests** — append to `src/engine/core/game-engine.test.ts` (reuse the file's existing fixtures/imports where they exist; add these imports if missing: `FlowRegistry` from `./flow-registry`, `registerCoreFlow` from `./flow-library`, `type FlowDef` from `./flow`, `zoneCards` from `./game-state`):

```ts
describe('GameEngine with flow', () => {
  const FLOW: FlowDef = {
    turn: { order: ['a', 'b'] },
    phases: [
      { id: 'setup', allow: [], onEnter: [{ name: 'deal', params: { from: 'deck', to: 'hand', count: 1 } }], advance: { when: 'always', to: 'main' } },
      // NOTE: not `when: 'always'` — endTurn fires whenever its predicate is true
      // during any runFlow, including the construction-time one after setup→main
      // advance, which would flip the turn before any move. Use a predicate that
      // is false at construction settle (no card is faceUp until a flip move).
      { id: 'main', allow: ['flip'], endTurn: { when: 'anyFaceUp' } },
    ],
    triggers: [{ id: 'refill', when: { name: 'zoneEmpty', params: { zone: 'hand' } }, then: [{ name: 'deal', params: { from: 'deck', to: 'hand', count: 1 } }] }],
    end: [],
  };
  const table: TableDef = { zones: [
    { id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } },
    { id: 'hand', layout: 'pile', transform: { x: 0, y: 0 } },
  ] };
  const cards = (): CardState[] => [
    { id: 'c1', zoneId: 'deck', faceUp: false, faceKey: 'x' },
    { id: 'c2', zoneId: 'deck', faceUp: false, faceKey: 'y' },
  ];
  const mkEngine = () =>
    new GameEngine({
      tableDef: table,
      rules: new RuleRegistry(),
      moves: registerCoreMoves(new MoveRegistry()),
      initial: { cards: cards(), data: {}, rng: makeRng(3) },
      flow: FLOW,
      flowRegistry: registerCoreFlow(new FlowRegistry()).registerPredicate('anyFaceUp', (s) => s.cards.some((c) => c.faceUp)),
    });

  it('throws when flow and flowRegistry are not provided together', () => {
    expect(() => new GameEngine({ tableDef: table, rules: new RuleRegistry(), moves: new MoveRegistry(), initial: { cards: [], data: {}, rng: makeRng(1) }, flow: FLOW })).toThrow(/together/);
  });

  it('throws at construction on an invalid FlowDef', () => {
    const bad: FlowDef = { turn: { order: ['a'] }, phases: [{ id: 'p', allow: 'any', onEnter: ['ghost'] }] };
    expect(() => new GameEngine({ tableDef: table, rules: new RuleRegistry(), moves: new MoveRegistry(), initial: { cards: [], data: {}, rng: makeRng(1) }, flow: bad, flowRegistry: new FlowRegistry() })).toThrow(/invalid FlowDef.*ghost/);
  });

  it('initFlow runs at construction: setup dealt, phase advanced', () => {
    const e = mkEngine();
    expect(e.getState().turn).toEqual({ current: 'a', phase: 'main' });
    expect(zoneCards(e.getState(), 'hand')).toHaveLength(1);
  });

  it('gate rejects without touching the log; legal handlers still run', () => {
    const e = mkEngine();
    expect(e.dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 1, by: 'a' })).toMatchObject({ ok: false, reason: 'move deal not allowed in phase main' });
    expect(e.dispatch({ type: 'flip', cardId: 'c1', by: 'b' })).toMatchObject({ ok: false, reason: "not b's turn" });
    expect(e.getLog()).toHaveLength(0);
  });

  it('dispatch runs flow: endTurn passes the turn each move', () => {
    const e = mkEngine();
    const inHand = zoneCards(e.getState(), 'hand')[0];
    expect(e.dispatch({ type: 'flip', cardId: inHand.id, by: 'a' }).ok).toBe(true);
    expect(e.getState().turn?.current).toBe('b');
  });

  it('undo replays through flow deterministically', () => {
    const e = mkEngine();
    const before = e.getState();
    const inHand = zoneCards(before, 'hand')[0];
    e.dispatch({ type: 'flip', cardId: inHand.id, by: 'a' });
    e.undo();
    expect(e.getState()).toEqual(before);
  });

  it('loadLog reproduces byte-identical state in a fresh engine', () => {
    const e1 = mkEngine();
    const inHand = zoneCards(e1.getState(), 'hand')[0];
    e1.dispatch({ type: 'flip', cardId: inHand.id, by: 'a' });
    const e2 = mkEngine();
    e2.loadLog([...e1.getLog()]);
    expect(e2.getState()).toEqual(e1.getState());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/core/game-engine.test.ts`
Expected: existing tests PASS, new block FAILS (`flow` is not a known property / no gating).

- [ ] **Step 3: Implement** — modify `src/engine/core/game-engine.ts`:

Add imports:

```ts
import { gateMove, initFlow, runFlow, type FlowDef } from './flow';
import { validateFlowDef } from './flow-def-validate';
import type { FlowRegistry } from './flow-registry';
```

Extend `NewGameArgs`:

```ts
export interface NewGameArgs {
  tableDef: TableDef;
  rules: RuleRegistry;
  moves: MoveRegistry;
  initial: GameState;
  /** Optional declarative game flow. Provide flow and flowRegistry together. */
  flow?: FlowDef;
  flowRegistry?: FlowRegistry;
}
```

Add fields and rework the constructor:

```ts
  private flow?: FlowDef;
  private flowReg?: FlowRegistry;

  constructor(args: NewGameArgs) {
    this.ctx = { tableDef: args.tableDef, rules: args.rules };
    this.registry = args.moves;
    if (!!args.flow !== !!args.flowRegistry) throw new Error('flow and flowRegistry must be provided together');
    if (args.flow && args.flowRegistry) {
      const v = validateFlowDef(args.flow, args.flowRegistry);
      if (!v.ok) throw new Error(`invalid FlowDef: ${v.errors.join('; ')}`);
      this.flow = args.flow;
      this.flowReg = args.flowRegistry;
      this.initial = initFlow(args.initial, args.flow, args.flowRegistry, this.ctx);
    } else {
      this.initial = args.initial;
    }
    this.current = this.initial;
  }
```

Rework `canDispatch`, `dispatch`, and `replay`:

```ts
  canDispatch(move: Move): true | string {
    if (this.flow) {
      const g = gateMove(this.current, move, this.flow);
      if (g !== true) return g;
    }
    return this.handlerFor(move).legal(this.current, move, this.ctx);
  }

  dispatch(move: Move): DispatchResult {
    const handler = this.handlerFor(move);
    if (this.flow) {
      const g = gateMove(this.current, move, this.flow);
      if (g !== true) return { ok: false, state: this.current, reason: g };
    }
    const verdict = handler.legal(this.current, move, this.ctx);
    if (verdict !== true) return { ok: false, state: this.current, reason: verdict };
    let next = handler.apply(this.current, move, this.ctx);
    if (this.flow) next = runFlow(next, this.flow, this.flowReg!, this.ctx);
    this.current = next;
    this.log.push(move);
    this.notify();
    return { ok: true, state: this.current };
  }

  private replay(): void {
    let s = this.initial;
    for (const m of this.log) {
      s = this.handlerFor(m).apply(s, m, this.ctx);
      if (this.flow) s = runFlow(s, this.flow, this.flowReg!, this.ctx);
    }
    this.current = s;
  }
```

Everything else (`undo`, `reset`, `loadLog`, `getState`, `getLog`, `subscribe`, `notify`) is unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/core/game-engine.test.ts` — all PASS (old + new).
Run: `npm test` — full suite green (no-flow behavior unchanged).
Run: `npm run typecheck` — clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/game-engine.ts src/engine/core/game-engine.test.ts
git commit -m "feat(core): interpret FlowDef in GameEngine dispatch/replay (gate → legal → apply → runFlow)"
```

---

### Task 7: Project `result` into `ClientView`

**Files:**
- Modify: `src/engine/net/protocol.ts` (add field), `src/engine/net/game-server.ts` (project it)
- Test: `src/engine/net/game-server.test.ts` (append one test)

**Interfaces:**
- Consumes: `GameState.result` (Task 1).
- Produces: `ClientView.result?: Json` — every seat's view carries the game outcome once set.

- [ ] **Step 1: Write the failing test** — append to `src/engine/net/game-server.test.ts` (reuse its existing fixtures for building a `GameServer`; the essential shape):

```ts
it('projects state.result into every seat view once the game ends', () => {
  // Build a server whose engine has a flow with an immediate end condition.
  const flowReg = registerCoreFlow(new FlowRegistry()).registerEffect('declare', (s) => ({ ...s, result: { winner: 'me' } }));
  const flow: FlowDef = {
    turn: { order: ['me', 'opp'] },
    phases: [{ id: 'main', allow: 'any' }],
    end: [{ when: 'always', result: 'declare' }],
  };
  const engine = new GameEngine({
    tableDef: TABLE, // the file's existing table fixture
    rules: new RuleRegistry(),
    moves: registerCoreMoves(new MoveRegistry()),
    initial: { cards: [], data: {}, rng: makeRng(1) },
    flow,
    flowRegistry: flowReg,
  });
  const server = new GameServer({ engine, tableDef: TABLE, seats: ['me', 'opp'] });
  expect(server.viewFor('me').result).toEqual({ winner: 'me' });
  expect(server.viewFor('opp').result).toEqual({ winner: 'me' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/net/game-server.test.ts`
Expected: new test FAILS (`result` undefined on `ClientView`).

- [ ] **Step 3: Implement**

`src/engine/net/protocol.ts` — add the import and field:

```ts
import type { Json } from '../core/table-def';

export interface ClientView {
  seat: PlayerId;
  scene: Scene;
  turn?: TurnState;
  /** Game outcome, authored by the game's end-condition result effect. Undefined while live. */
  result?: Json;
}
```

`src/engine/net/game-server.ts` — in `viewFor`, add one line:

```ts
    return {
      seat,
      scene: deriveScene(this.tableDef, { cards: state.cards }, seat),
      turn: state.turn,
      result: state.result,
    };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/net/game-server.test.ts` — PASS. `npm test` green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/net/protocol.ts src/engine/net/game-server.ts src/engine/net/game-server.test.ts
git commit -m "feat(net): project GameState.result into ClientView"
```

---

### Task 8: Net demo adopts flow (delete hand-rolled turn check)

**Files:**
- Modify: `src/pages/net-demo/game.ts`
- Test: `src/pages/net-demo/net-demo.test.ts` (existing tests must stay green; add one)

**Interfaces:**
- Consumes: Tasks 5–7.
- Produces: `createDemoServer()` unchanged in signature; the demo now runs a `FlowDef` (`setup` → `main`), setup deals via `onEnter`, and the `play`/`endTurn` handlers no longer check turn (the gate does).

- [ ] **Step 1: Add the new failing test** — append to `src/pages/net-demo/net-demo.test.ts`:

```ts
it('starts in the main phase after flow setup', () => {
  const server = createDemoServer();
  expect(server.viewFor('me').turn).toEqual({ current: 'me', phase: 'main' });
});
```

Run: `npx vitest run src/pages/net-demo/net-demo.test.ts` — the new test FAILS (`phase` undefined).

- [ ] **Step 2: Implement** — modify `src/pages/net-demo/game.ts`:

Add imports:

```ts
import type { FlowDef } from '@/engine/core/flow';
import { FlowRegistry } from '@/engine/core/flow-registry';
import { registerCoreFlow } from '@/engine/core/flow-library';
```

In `play.legal`, delete the line:

```ts
    if (state.turn && state.turn.current !== by) return 'not your turn';
```

Replace the `endTurn` handler's `legal` (the gate now enforces turn ownership):

```ts
/** End your turn (passes to the other seat). Turn ownership is enforced by the flow gate. */
const endTurn: MoveHandler = {
  legal: () => true,
  apply: (s) => nextPlayer(s, ['me', 'opp']),
};
```

Add the flow definition after `TABLE`:

```ts
const FLOW: FlowDef = {
  turn: { order: ['me', 'opp'] },
  phases: [
    {
      id: 'setup',
      allow: [],
      onEnter: [
        { name: 'deal', params: { from: 'deck', to: 'hand-me', count: 3 } },
        { name: 'deal', params: { from: 'deck', to: 'hand-opp', count: 3 } },
      ],
      advance: { when: 'always', to: 'main' },
    },
    { id: 'main', allow: ['play', 'endTurn', 'reorder'], actor: 'current', anyActor: ['reorder'] },
  ],
};
```

Rework `createDemoServer` (setup deals move into the flow; the two `engine.dispatch({ type: 'deal', ... })` calls are deleted):

```ts
export function createDemoServer(): GameServer {
  const moves = registerCoreMoves(new MoveRegistry()).register('play', play).register('endTurn', endTurn);
  const initial: GameState = { cards: demoDeck(), turn: { current: 'me' }, data: {}, rng: makeRng(20260709) };
  const engine = new GameEngine({
    tableDef: TABLE,
    rules: registerStarterRules(new RuleRegistry()),
    moves,
    initial,
    flow: FLOW,
    flowRegistry: registerCoreFlow(new FlowRegistry()),
  });
  return new GameServer({ engine, tableDef: TABLE, seats: ['me', 'opp'] });
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run src/pages/net-demo/net-demo.test.ts`
Expected: ALL 7 tests PASS — the existing off-turn-rejection test now passes via the gate (`not opp's turn`), off-turn reorder still works via `anyActor`, deals still land via `onEnter`.

Run: `npm test` — full suite green.

- [ ] **Step 4: Commit**

```bash
git add src/pages/net-demo/game.ts src/pages/net-demo/net-demo.test.ts
git commit -m "feat(net-demo): adopt FlowDef — flow gate replaces hand-rolled turn check, setup deals via onEnter"
```

---

### Task 9: Hearts cards, table, and move handlers

**Files:**
- Create: `src/pages/hearts-demo/cards.ts`, `src/pages/hearts-demo/moves.ts`
- Test: `src/pages/hearts-demo/hearts.test.ts`

**Interfaces:**
- Consumes: core engine types only.
- Produces:
  - `SEATS: PlayerId[]` (`['p0','p1','p2','p3']`), `TABLE: TableDef`, `heartsDeck(): CardState[]` (52 cards, opaque ids `c0`…`c51`, `faceKey` = `` `${rank}${suit}` ``, `data: { suit, rank }`, all in `deck`)
  - `trickPlays(state): { cardId: string; by: string; suit: string; rank: number }[]` (reads `state.data.trickPlays`)
  - Move handlers `play` (one card to the trick; follow-suit + hearts-broken legality) and `pass` (one card to own pass pile, max 3)

- [ ] **Step 1: Write the failing tests**

```ts
// src/pages/hearts-demo/hearts.test.ts
import { describe, expect, it } from 'vitest';
import { heartsDeck, SEATS, TABLE } from './cards';
import { pass, play, trickPlays } from './moves';
import type { GameState } from '@/engine/core/game-state';
import type { MoveContext } from '@/engine/core/moves';
import { makeRng } from '@/engine/core/rng';
import { RuleRegistry } from '@/engine/core/rules';

const ctx: MoveContext = { tableDef: TABLE, rules: new RuleRegistry() };

/** Deal deterministically for unit tests: card index i goes to hand-p{i % 4}. */
const dealt = (): GameState => ({
  cards: heartsDeck().map((c, i) => ({ ...c, zoneId: `hand-p${i % 4}`, faceUp: true })),
  turn: { current: 'p0', phase: 'playing' },
  data: {},
  rng: makeRng(1),
});

const findCard = (s: GameState, suit: string, rank: number, zonePrefix = 'hand-') =>
  s.cards.find((c) => c.data?.suit === suit && c.data?.rank === rank && c.zoneId.startsWith(zonePrefix))!;

describe('cards', () => {
  it('builds a full 52-card deck with opaque ids', () => {
    const deck = heartsDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
    expect(deck.every((c) => c.zoneId === 'deck' && /^c\d+$/.test(c.id))).toBe(true);
  });
  it('declares all hearts zones', () => {
    const ids = TABLE.zones.map((z) => z.id);
    for (const s of SEATS) expect(ids).toEqual(expect.arrayContaining([`hand-${s}`, `pass-${s}`, `won-${s}`]));
    expect(ids).toContain('deck');
    expect(ids).toContain('trick');
  });
});

describe('play move', () => {
  it("rejects a card that is not in the actor's hand", () => {
    const s = dealt();
    const other = s.cards.find((c) => c.zoneId === 'hand-p1')!;
    expect(play.legal(s, { type: 'play', cardId: other.id, by: 'p0' }, ctx)).toBe('not your card');
  });

  it('rejects leading a heart before hearts are broken', () => {
    const s = dealt();
    const heart = s.cards.find((c) => c.zoneId === 'hand-p0' && c.data?.suit === 'H')!;
    expect(play.legal(s, { type: 'play', cardId: heart.id, by: 'p0' }, ctx)).toBe('hearts not broken');
  });

  it('allows leading a heart once broken', () => {
    const s = dealt();
    s.data.heartsBroken = true;
    const heart = s.cards.find((c) => c.zoneId === 'hand-p0' && c.data?.suit === 'H')!;
    expect(play.legal(s, { type: 'play', cardId: heart.id, by: 'p0' }, ctx)).toBe(true);
  });

  it('enforces follow-suit when the hand can follow', () => {
    let s = dealt();
    const lead = s.cards.find((c) => c.zoneId === 'hand-p0' && c.data?.suit === 'C')!;
    s = play.apply(s, { type: 'play', cardId: lead.id, by: 'p0' }, ctx);
    const offSuit = s.cards.find((c) => c.zoneId === 'hand-p1' && c.data?.suit !== 'C')!;
    const club = s.cards.find((c) => c.zoneId === 'hand-p1' && c.data?.suit === 'C')!;
    expect(play.legal(s, { type: 'play', cardId: offSuit.id, by: 'p1' }, ctx)).toBe('must follow C');
    expect(play.legal(s, { type: 'play', cardId: club.id, by: 'p1' }, ctx)).toBe(true);
  });

  it('apply moves the card to the trick face-up, records the play, breaks hearts', () => {
    let s = dealt();
    s.data.heartsBroken = true;
    const heart = findCard(s, 'H', 5);
    const seat = heart.zoneId.replace('hand-', '');
    s = { ...s, turn: { current: seat, phase: 'playing' } };
    const out = play.apply(s, { type: 'play', cardId: heart.id, by: seat }, ctx);
    const moved = out.cards.find((c) => c.id === heart.id)!;
    expect(moved.zoneId).toBe('trick');
    expect(moved.faceUp).toBe(true);
    expect(moved.slot).toBe(0);
    expect(trickPlays(out)).toEqual([{ cardId: heart.id, by: seat, suit: 'H', rank: 5 }]);
    expect(out.data.heartsBroken).toBe(true);
  });
});

describe('pass move', () => {
  it('moves a hand card to the pass pile, max 3', () => {
    let s = dealt();
    s = { ...s, turn: { current: 'p0', phase: 'passing' } };
    const hand = () => s.cards.filter((c) => c.zoneId === 'hand-p0');
    for (let i = 0; i < 3; i++) {
      const c = hand()[0];
      expect(pass.legal(s, { type: 'pass', cardId: c.id, by: 'p0' }, ctx)).toBe(true);
      s = pass.apply(s, { type: 'pass', cardId: c.id, by: 'p0' }, ctx);
    }
    expect(s.cards.filter((c) => c.zoneId === 'pass-p0')).toHaveLength(3);
    expect(pass.legal(s, { type: 'pass', cardId: hand()[0].id, by: 'p0' }, ctx)).toBe('already passed 3 cards');
  });

  it("rejects passing another seat's card", () => {
    const s = dealt();
    const other = s.cards.find((c) => c.zoneId === 'hand-p1')!;
    expect(pass.legal(s, { type: 'pass', cardId: other.id, by: 'p0' }, ctx)).toBe('not your card');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/hearts-demo/hearts.test.ts`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Implement**

Create `src/pages/hearts-demo/cards.ts`:

```ts
import type { PlayerId, CardState } from '@/engine/core/scene';
import type { TableDef } from '@/engine/core/table-def';

export const SEATS: PlayerId[] = ['p0', 'p1', 'p2', 'p3'];

/** Opaque ids (c0..c51) — projection scrubs faceKey/data but preserves id (SP3 invariant). */
export function heartsDeck(): CardState[] {
  const suits = ['S', 'H', 'D', 'C'];
  const cards: CardState[] = [];
  let n = 0;
  for (const s of suits) {
    for (let r = 1; r <= 13; r++) {
      cards.push({ id: `c${n++}`, zoneId: 'deck', faceUp: false, faceKey: `${r}${s}`, data: { suit: s, rank: r } });
    }
  }
  return cards;
}

const hand = (seat: PlayerId, x: number, y: number) =>
  ({ id: `hand-${seat}`, layout: 'fan', transform: { x, y }, layoutOptions: { fanAngleDeg: 48 }, owner: seat, visibility: 'owner', ordering: 'free' }) as const;
const pile = (id: string, x: number, y: number, visibility: 'public' | 'owner' | 'secret', owner?: PlayerId) =>
  ({ id, layout: 'pile', transform: { x, y }, visibility, ...(owner ? { owner } : {}) }) as const;

export const TABLE: TableDef = {
  players: SEATS,
  zones: [
    pile('deck', 0, 0, 'secret'),
    { id: 'trick', layout: 'row', transform: { x: -110, y: 0 }, layoutOptions: { spacing: 75 }, visibility: 'public' },
    hand('p0', 0, 300),
    hand('p1', -350, 0),
    hand('p2', 0, -300),
    hand('p3', 350, 0),
    pile('pass-p0', 0, 170, 'owner', 'p0'),
    pile('pass-p1', -190, 0, 'owner', 'p1'),
    pile('pass-p2', 0, -170, 'owner', 'p2'),
    pile('pass-p3', 190, 0, 'owner', 'p3'),
    pile('won-p0', 300, 280, 'public'),
    pile('won-p1', -300, 280, 'public'),
    pile('won-p2', -300, -280, 'public'),
    pile('won-p3', 300, -280, 'public'),
  ],
};
```

Create `src/pages/hearts-demo/moves.ts`:

```ts
import { cardById, zoneCards, type GameState } from '@/engine/core/game-state';
import type { MoveHandler } from '@/engine/core/moves';
import type { Json } from '@/engine/core/table-def';

export interface TrickPlay {
  cardId: string;
  by: string;
  suit: string;
  rank: number;
}

export function trickPlays(state: GameState): TrickPlay[] {
  return (state.data.trickPlays as unknown as TrickPlay[] | undefined) ?? [];
}

/** Play one card from your hand to the trick. Flow gates phase/turn; this checks card-level legality. */
export const play: MoveHandler = {
  legal(state, m) {
    const by = m.by as string | undefined;
    if (!by) return 'play requires an actor';
    const card = cardById(state, m.cardId as string);
    if (!card) return `unknown card: ${m.cardId as string}`;
    if (card.zoneId !== `hand-${by}`) return 'not your card';
    const suit = card.data?.suit as string;
    const hand = zoneCards(state, `hand-${by}`);
    const plays = trickPlays(state);
    if (plays.length === 0) {
      const onlyHearts = hand.every((c) => c.data?.suit === 'H');
      if (suit === 'H' && state.data.heartsBroken !== true && !onlyHearts) return 'hearts not broken';
    } else {
      const leadSuit = plays[0].suit;
      const canFollow = hand.some((c) => c.data?.suit === leadSuit);
      if (canFollow && suit !== leadSuit) return `must follow ${leadSuit}`;
    }
    return true;
  },
  apply(state, m) {
    const by = m.by as string;
    const card = cardById(state, m.cardId as string)!;
    const suit = card.data?.suit as string;
    const rank = card.data?.rank as number;
    const plays = [...trickPlays(state), { cardId: card.id, by, suit, rank }];
    return {
      ...state,
      data: {
        ...state.data,
        trickPlays: plays as unknown as Json,
        ...(suit === 'H' ? { heartsBroken: true } : {}),
      },
      cards: state.cards.map((c) =>
        c.id === card.id ? { ...c, zoneId: 'trick', slot: plays.length - 1, faceUp: true } : c,
      ),
    };
  },
};

/** Pass one card to your own pass pile (three per seat during the passing phase). */
export const pass: MoveHandler = {
  legal(state, m) {
    const by = m.by as string | undefined;
    if (!by) return 'pass requires an actor';
    const card = cardById(state, m.cardId as string);
    if (!card) return `unknown card: ${m.cardId as string}`;
    if (card.zoneId !== `hand-${by}`) return 'not your card';
    if (zoneCards(state, `pass-${by}`).length >= 3) return 'already passed 3 cards';
    return true;
  },
  apply(state, m) {
    const by = m.by as string;
    const n = zoneCards(state, `pass-${by}`).length;
    return {
      ...state,
      cards: state.cards.map((c) => (c.id === (m.cardId as string) ? { ...c, zoneId: `pass-${by}`, slot: n } : c)),
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/hearts-demo/hearts.test.ts` — PASS (8 tests). `npm run typecheck` clean.

- [ ] **Step 5: Commit**

```bash
git add src/pages/hearts-demo/cards.ts src/pages/hearts-demo/moves.ts src/pages/hearts-demo/hearts.test.ts
git commit -m "feat(hearts-demo): deck, table, and play/pass move handlers (follow-suit, hearts-broken)"
```

---

### Task 10: Hearts flow entries + `FlowDef` + `createHeartsServer`

**Files:**
- Create: `src/pages/hearts-demo/flow.ts`, `src/pages/hearts-demo/game.ts`
- Test: `src/pages/hearts-demo/hearts.test.ts` (append)

**Interfaces:**
- Consumes: Tasks 5, 9.
- Produces:
  - `registerHeartsFlow(reg: FlowRegistry): FlowRegistry` — predicate `heartsTurnOver`; effects `setLeaderTwoOfClubs`, `awardTrick`, `scoreHand`; policy `heartsNext`
  - `FLOW: FlowDef` (setup → passing → playing, award-trick trigger, hand-over end)
  - `createHeartsServer(seed?: number): GameServer`

- [ ] **Step 1: Write the failing tests** — append to `src/pages/hearts-demo/hearts.test.ts` (add imports: `registerHeartsFlow` from `./flow`, `createHeartsServer` from `./game`, `FlowRegistry` from `@/engine/core/flow-registry`, `registerCoreFlow` from `@/engine/core/flow-library`):

```ts
describe('hearts flow entries', () => {
  const reg = registerHeartsFlow(registerCoreFlow(new FlowRegistry()));

  it('awardTrick gives the trick to the highest card of the lead suit (ace high)', () => {
    let s = dealt();
    s.data.heartsBroken = true;
    // p0 leads C5; p1 plays C1 (ace); p2 plays C9; p3 dumps a diamond (void simulation not needed — follow if possible)
    const c5 = findCard(s, 'C', 5);
    const lead = c5.zoneId.replace('hand-', '');
    // build the trick directly through play.apply to keep this a unit test
    s = { ...s, turn: { current: lead, phase: 'playing' } };
    s = play.apply(s, { type: 'play', cardId: c5.id, by: lead }, ctx);
    const ace = findCard(s, 'C', 1);
    s = play.apply(s, { type: 'play', cardId: ace.id, by: ace.zoneId.replace('hand-', '') }, ctx);
    const c9 = findCard(s, 'C', 9);
    s = play.apply(s, { type: 'play', cardId: c9.id, by: c9.zoneId.replace('hand-', '') }, ctx);
    const d3 = findCard(s, 'D', 3);
    s = play.apply(s, { type: 'play', cardId: d3.id, by: d3.zoneId.replace('hand-', '') }, ctx);
    const aceSeat = trickPlays(s).find((p) => p.rank === 1)!.by;
    const out = reg.effect('awardTrick')!(s, ctx);
    expect(out.data.trickWinner).toBe(aceSeat);
    expect(out.cards.filter((c) => c.zoneId === `won-${aceSeat}`)).toHaveLength(4);
    expect(out.cards.filter((c) => c.zoneId === 'trick')).toHaveLength(0);
    expect(trickPlays(out)).toEqual([]);
  });

  it('setLeaderTwoOfClubs sets current to the 2C holder', () => {
    const s = dealt();
    const holder = findCard(s, 'C', 2).zoneId.replace('hand-', '');
    expect(reg.effect('setLeaderTwoOfClubs')!(s, ctx).turn?.current).toBe(holder);
  });

  it('scoreHand scores 1/heart + 13/QS and picks the lowest score as winner', () => {
    let s = dealt();
    // stack the piles: give p1 all hearts, p2 the queen of spades, rest elsewhere
    s = {
      ...s,
      cards: s.cards.map((c) => {
        if (c.data?.suit === 'H') return { ...c, zoneId: 'won-p1' };
        if (c.data?.suit === 'S' && c.data?.rank === 12) return { ...c, zoneId: 'won-p2' };
        return { ...c, zoneId: 'won-p0' };
      }),
    };
    const out = reg.effect('scoreHand')!(s, ctx);
    expect(out.result).toEqual({ scores: { p0: 0, p1: 13, p2: 13, p3: 0 }, winner: 'p0' });
  });

  it('heartsNext: round-robin mid-trick, winner leads after an award', () => {
    const policy = reg.policy('heartsNext')!;
    let s = dealt(); // trick empty, no winner recorded → round-robin
    expect(policy(s, ['p0', 'p1', 'p2', 'p3'], ctx)).toBe('p1');
    s = { ...s, data: { trickWinner: 'p2' } }; // trick empty + winner recorded → winner leads
    expect(policy(s, ['p0', 'p1', 'p2', 'p3'], ctx)).toBe('p2');
  });
});

describe('createHeartsServer', () => {
  it('boots into the passing phase with 13 cards per hand', () => {
    const server = createHeartsServer(42);
    const view = server.viewFor('p0');
    expect(view.turn?.phase).toBe('passing');
    for (const seat of SEATS) {
      expect(view.scene.cards.filter((c) => c.zoneId === `hand-${seat}`)).toHaveLength(13);
    }
    expect(view.scene.cards.filter((c) => c.zoneId === 'deck')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/hearts-demo/hearts.test.ts`
Expected: new blocks FAIL — `./flow` / `./game` missing.

- [ ] **Step 3: Implement**

Create `src/pages/hearts-demo/flow.ts`:

```ts
import type { FlowDef } from '@/engine/core/flow';
import type { FlowEffect, FlowPredicate, FlowRegistry, TurnPolicy } from '@/engine/core/flow-registry';
import { zoneCards } from '@/engine/core/game-state';
import type { Json } from '@/engine/core/table-def';
import { SEATS } from './cards';
import { trickPlays } from './moves';

const heartsValue = (rank: number) => (rank === 1 ? 14 : rank);

/** True mid-trick (pass to next seat) or right after an award (winner leads). */
const heartsTurnOver: FlowPredicate = (state) => {
  const n = trickPlays(state).length;
  if (n >= 1 && n <= 3) return true;
  return n === 0 && typeof state.data.trickWinner === 'string' && zoneCards(state, 'trick').length === 0;
};

const setLeaderTwoOfClubs: FlowEffect = (state) => {
  const holder = state.cards.find((c) => c.data?.suit === 'C' && c.data?.rank === 2)!;
  return { ...state, turn: { ...state.turn!, current: holder.zoneId.replace('hand-', '') } };
};

/** Move the completed trick to the winner's pile; record the winner; clear the plays. */
const awardTrick: FlowEffect = (state) => {
  const plays = trickPlays(state);
  const lead = plays[0].suit;
  const winner = plays
    .filter((p) => p.suit === lead)
    .reduce((a, b) => (heartsValue(b.rank) > heartsValue(a.rank) ? b : a)).by;
  const ids = new Set(plays.map((p) => p.cardId));
  return {
    ...state,
    data: { ...state.data, trickPlays: [], trickWinner: winner },
    cards: state.cards.map((c) =>
      ids.has(c.id) ? { ...c, zoneId: `won-${winner}`, faceUp: false, slot: undefined } : c,
    ),
  };
};

/** 1 point per heart, 13 for the queen of spades; lowest score wins the hand. */
const scoreHand: FlowEffect = (state) => {
  const scores: Record<string, number> = {};
  for (const seat of SEATS) {
    scores[seat] = zoneCards(state, `won-${seat}`).reduce((sum, c) => {
      if (c.data?.suit === 'H') return sum + 1;
      if (c.data?.suit === 'S' && c.data?.rank === 12) return sum + 13;
      return sum;
    }, 0);
  }
  const winner = SEATS.reduce((a, b) => (scores[b] < scores[a] ? b : a));
  return { ...state, result: { scores, winner } as unknown as Json };
};

const heartsNext: TurnPolicy = (state, order) => {
  const w = state.data.trickWinner;
  if (trickPlays(state).length === 0 && typeof w === 'string') return w;
  return order[(order.indexOf(state.turn!.current) + 1) % order.length];
};

export function registerHeartsFlow(reg: FlowRegistry): FlowRegistry {
  return reg
    .registerPredicate('heartsTurnOver', heartsTurnOver)
    .registerEffect('setLeaderTwoOfClubs', setLeaderTwoOfClubs)
    .registerEffect('awardTrick', awardTrick)
    .registerEffect('scoreHand', scoreHand)
    .registerPolicy('heartsNext', heartsNext);
}

const HANDS = SEATS.map((s) => `hand-${s}`);
const PASSES = SEATS.map((s) => `pass-${s}`);

export const FLOW: FlowDef = {
  turn: { order: [...SEATS], next: 'heartsNext' },
  phases: [
    {
      id: 'setup',
      allow: [],
      onEnter: [
        { name: 'shuffleZone', params: { zone: 'deck' } },
        ...SEATS.map((s) => ({ name: 'deal', params: { from: 'deck', to: `hand-${s}`, count: 13 } })),
      ],
      advance: { when: 'always', to: 'passing' },
    },
    {
      id: 'passing',
      allow: ['pass', 'reorder'],
      actor: 'any',
      advance: { when: { name: 'zonesCount', params: { zones: PASSES, count: 3 } }, to: 'playing' },
    },
    {
      id: 'playing',
      allow: ['play', 'reorder'],
      actor: 'current',
      anyActor: ['reorder'],
      onEnter: [
        { name: 'moveZone', params: { from: 'pass-p0', to: 'hand-p1' } },
        { name: 'moveZone', params: { from: 'pass-p1', to: 'hand-p2' } },
        { name: 'moveZone', params: { from: 'pass-p2', to: 'hand-p3' } },
        { name: 'moveZone', params: { from: 'pass-p3', to: 'hand-p0' } },
        'setLeaderTwoOfClubs',
      ],
      endTurn: { when: 'heartsTurnOver' },
    },
  ],
  triggers: [{ id: 'award-trick', when: { name: 'zoneCount', params: { zone: 'trick', count: 4 } }, then: ['awardTrick'] }],
  end: [{ when: { name: 'zonesEmpty', params: { zones: [...HANDS, 'trick'] } }, result: 'scoreHand' }],
};
```

Create `src/pages/hearts-demo/game.ts`:

```ts
import { GameEngine } from '@/engine/core/game-engine';
import type { GameState } from '@/engine/core/game-state';
import { MoveRegistry } from '@/engine/core/moves';
import { registerCoreMoves } from '@/engine/core/moves-library';
import { FlowRegistry } from '@/engine/core/flow-registry';
import { registerCoreFlow } from '@/engine/core/flow-library';
import { makeRng } from '@/engine/core/rng';
import { RuleRegistry } from '@/engine/core/rules';
import { GameServer } from '@/engine/net/game-server';
import { heartsDeck, SEATS, TABLE } from './cards';
import { FLOW, registerHeartsFlow } from './flow';
import { pass, play } from './moves';

export function createHeartsServer(seed = 20260715): GameServer {
  const moves = registerCoreMoves(new MoveRegistry()).register('play', play).register('pass', pass);
  const flowRegistry = registerHeartsFlow(registerCoreFlow(new FlowRegistry()));
  const initial: GameState = { cards: heartsDeck(), data: {}, rng: makeRng(seed) };
  const engine = new GameEngine({ tableDef: TABLE, rules: new RuleRegistry(), moves, initial, flow: FLOW, flowRegistry });
  return new GameServer({ engine, tableDef: TABLE, seats: [...SEATS] });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/hearts-demo/hearts.test.ts` — PASS (13 tests). `npm run typecheck` clean.

- [ ] **Step 5: Commit**

```bash
git add src/pages/hearts-demo/flow.ts src/pages/hearts-demo/game.ts src/pages/hearts-demo/hearts.test.ts
git commit -m "feat(hearts-demo): hearts flow entries, FlowDef, and server factory"
```

---

### Task 11: Keystone end-to-end test — a full seeded hand

**Files:**
- Test: `src/pages/hearts-demo/hearts-e2e.test.ts` (new)

**Interfaces:**
- Consumes: `createHeartsServer` (Task 10). No production code should change in this task — if a test here fails, fix the bug where it lives (likely `flow.ts`/`moves.ts` of the demo, or `runFlow` ordering) and note it in the commit.

- [ ] **Step 1: Write the test**

```ts
// src/pages/hearts-demo/hearts-e2e.test.ts
import { describe, expect, it } from 'vitest';
import { SEATS } from './cards';
import { createHeartsServer } from './game';

/** Pass phase helper: each seat passes its first three cards. */
function passAll(server: ReturnType<typeof createHeartsServer>) {
  for (const seat of SEATS) {
    for (let i = 0; i < 3; i++) {
      const hand = server.viewFor(seat).scene.cards.filter((c) => c.zoneId === `hand-${seat}`);
      expect(server.submit(seat, { type: 'pass', cardId: hand[0].id }).ok).toBe(true);
    }
  }
}

describe('hearts end-to-end (seeded)', () => {
  it('plays a complete hand: pass, 13 tricks, scored result', () => {
    const server = createHeartsServer(42);
    passAll(server);
    expect(server.viewFor('p0').turn?.phase).toBe('playing');
    // every hand is back to 13 after passes resolve
    for (const seat of SEATS) {
      expect(server.viewFor(seat).scene.cards.filter((c) => c.zoneId === `hand-${seat}`)).toHaveLength(13);
    }

    // auto-player: current seat tries each hand card until one is legal
    let plays = 0;
    for (let step = 0; step < 52; step++) {
      const view = server.viewFor('p0');
      expect(view.result).toBeUndefined();
      const cur = view.turn!.current;
      const hand = server.viewFor(cur).scene.cards.filter((c) => c.zoneId === `hand-${cur}`);
      const played = hand.some((c) => server.submit(cur, { type: 'play', cardId: c.id }).ok);
      expect(played).toBe(true);
      plays++;
    }
    expect(plays).toBe(52);

    const final = server.viewFor('p0');
    const result = final.result as { scores: Record<string, number>; winner: string };
    expect(result).toBeDefined();
    expect(Object.values(result.scores).reduce((a, b) => a + b, 0)).toBe(26); // 13 hearts + QS
    expect(SEATS).toContain(result.winner);
    // all 52 cards ended in won piles; hands and trick are empty
    const wonTotal = SEATS.reduce((n, s) => n + final.scene.cards.filter((c) => c.zoneId === `won-${s}`).length, 0);
    expect(wonTotal).toBe(52);

    // game over: further moves are rejected by the gate
    expect(server.submit(result.winner, { type: 'play', cardId: 'c0' })).toMatchObject({ ok: false, reason: 'game is over' });
  });

  it('rejects out-of-turn plays via the gate (no per-game turn code)', () => {
    const server = createHeartsServer(42);
    passAll(server);
    const cur = server.viewFor('p0').turn!.current;
    const other = SEATS.find((s) => s !== cur)!;
    const card = server.viewFor(other).scene.cards.find((c) => c.zoneId === `hand-${other}`)!;
    expect(server.submit(other, { type: 'play', cardId: card.id })).toMatchObject({ ok: false, reason: `not ${other}'s turn` });
  });

  it('rejects playing during the passing phase', () => {
    const server = createHeartsServer(42);
    const card = server.viewFor('p0').scene.cards.find((c) => c.zoneId === 'hand-p0')!;
    expect(server.submit('p0', { type: 'play', cardId: card.id })).toMatchObject({ ok: false, reason: 'move play not allowed in phase passing' });
  });

  it('allows off-turn hand reorder during play (anyActor)', () => {
    const server = createHeartsServer(42);
    passAll(server);
    const cur = server.viewFor('p0').turn!.current;
    const other = SEATS.find((s) => s !== cur)!;
    const hand = server.viewFor(other).scene.cards.filter((c) => c.zoneId === `hand-${other}`);
    expect(server.submit(other, { type: 'reorder', cardId: hand[0].id, slot: 3 }).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run src/pages/hearts-demo/hearts-e2e.test.ts`
Expected: PASS. If the full-hand test fails, debug with the seed fixed at 42 — the state is fully deterministic; print `server.viewFor('p0').turn` and `trickPlays` at the failing step. Common causes: endTurn predicate not firing (check `heartsTurnOver`), award ordering (end check must see the trick emptied first — the end condition includes `trick` in its `zonesEmpty`), or follow-suit rejecting every card (auto-player then reports `played === false`).

- [ ] **Step 3: Run the whole suite**

Run: `npm test` — everything green.

- [ ] **Step 4: Commit**

```bash
git add src/pages/hearts-demo/hearts-e2e.test.ts
git commit -m "test(hearts-demo): keystone e2e — full seeded hand through pass, 13 tricks, scoring"
```

---

### Task 12: Hearts demo page

**Files:**
- Create: `src/pages/hearts-demo/hearts-demo-page.tsx`
- Modify: `src/main.tsx` (point at the hearts page — the repo convention is that `main.tsx` renders the latest demo; net-demo remains importable)

**Interfaces:**
- Consumes: `GameSession`, `loopbackChannel`, `ClientView` (net), `CardTable`/`Wrapper`/`initApp` (render stack), `createHeartsServer`, `TABLE`, `SEATS`.
- Produces: a page with four 800×600 seat canvases (2×2 grid) over one loopback server. Drag mapping: same zone → `reorder`; onto `trick` → `play`; onto your own pass pile → `pass`.

- [ ] **Step 1: Implement the page** (mirrors `net-demo-page.tsx`; the sizing NOTE there explains the fixed 800×600 boxes):

```tsx
// src/pages/hearts-demo/hearts-demo-page.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Wrapper } from '@/components/PixiCanvas';
import { CardTable } from '@/engine/react';
import type { Placement } from '@/engine/core/table-def';
import type { DropIntent } from '@/engine/input/table-input-context';
import { initApp } from '@/utils/init-app';
import { GameSession } from '@/engine/net/game-session';
import { loopbackChannel } from '@/engine/net/loopback';
import type { ClientChannel, ClientView } from '@/engine/net/protocol';
import { createHeartsServer } from './game';
import { SEATS, TABLE } from './cards';

function useSeat(session: GameSession, seat: string): { view: ClientView | null; submit: (m: DropIntent) => void } {
  const chan = useRef<ClientChannel | null>(null);
  const [view, setView] = useState<ClientView | null>(null);
  useEffect(() => {
    const { server, client } = loopbackChannel();
    chan.current = client;
    client.onMessage((msg) => { if (msg.type === 'view') setView(msg.view); });
    const disconnect = session.connect(seat, server);
    return () => { disconnect(); chan.current = null; };
  }, [session, seat]);
  const submit = (i: DropIntent) => {
    if (!i.toZoneId) return;
    if (i.toZoneId === i.fromZoneId) {
      chan.current?.send({ type: 'move', move: { type: 'reorder', cardId: i.cardId, slot: i.slot } });
    } else if (i.toZoneId === 'trick') {
      chan.current?.send({ type: 'move', move: { type: 'play', cardId: i.cardId } });
    } else if (i.toZoneId === `pass-${seat}`) {
      chan.current?.send({ type: 'move', move: { type: 'pass', cardId: i.cardId } });
    }
  };
  return { view, submit };
}

// Fixed 800x600 per seat — see the sizing NOTE in net-demo-page.tsx.
const SEAT_WIDTH = 800;
const SEAT_HEIGHT = 600;

function SeatCanvas({ session, seat }: { session: GameSession; seat: string }) {
  const { view, submit } = useSeat(session, seat);
  const option = useMemo(() => ({ fullScreen: false, limitEntireViewPort: false }), []);
  const placement: Placement = { cards: view?.scene.cards ?? [] };
  const status = view?.result
    ? `game over — ${JSON.stringify(view.result)}`
    : view?.turn
      ? `phase: ${view.turn.phase ?? '?'} — turn: ${view.turn.current}`
      : '';
  return (
    <div style={{ width: SEAT_WIDTH, height: SEAT_HEIGHT, flex: '0 0 auto', position: 'relative', border: '1px solid #ccc' }}>
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, pointerEvents: 'none', font: '14px sans-serif', color: '#eee' }}>
        seat: {seat}{status ? ` — ${status}` : ''}
      </div>
      <Wrapper option={option} initFunction={initApp}>
        <CardTable tableDef={TABLE} placement={placement} viewer={undefined} onDrop={submit} />
      </Wrapper>
    </div>
  );
}

export function HeartsDemoPage() {
  // Page-lifetime session — no dispose effect (StrictMode would unsubscribe it; see net-demo-page).
  const session = useMemo(() => new GameSession(createHeartsServer()), []);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', width: '100vw', height: '100vh', alignContent: 'flex-start', justifyContent: 'center', gap: 12, background: '#222', overflow: 'auto' }}>
      {SEATS.map((seat) => (
        <SeatCanvas key={seat} session={session} seat={seat} />
      ))}
    </div>
  );
}
```

Update `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HeartsDemoPage } from '@/pages/hearts-demo/hearts-demo-page';

createRoot(document.getElementById('root')!).render(<StrictMode><HeartsDemoPage /></StrictMode>);
```

- [ ] **Step 2: Verify it builds and the suite is green**

Run: `npm run typecheck` — clean.
Run: `npm test` — green.
Run: `npm run build` — succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/pages/hearts-demo/hearts-demo-page.tsx src/main.tsx
git commit -m "feat(hearts-demo): four-seat loopback page over one authoritative server"
```

---

### Task 13: Browser verification

**Files:** none (verification only; fix bugs where they live if found).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (background). Note the local URL (default `http://localhost:5173`).

- [ ] **Step 2: Verify in a real browser** (use the agent-browser skill or ask the user to check). Checklist:

1. Four canvases render; each seat sees 13 face-up cards in its own hand and backs in the other three hands (SP3 projection intact).
2. Status line shows `phase: passing`.
3. In each seat's canvas, drag 3 cards from the hand onto that seat's pass pile (the small pile between hand and center). After the 12th pass, the status flips to `phase: playing` and the passed cards appear in the neighbors' hands.
4. The status shows whose turn it is. Drag a card from a *different* seat's hand to the trick — it must snap back (gate rejection).
5. Play a full trick (4 legal plays from the current seats). The four cards must leave the trick and stack on the winner's won pile, and the turn label must show the winner leading.
6. Reorder a hand by dragging within it while it is not that seat's turn — must work.

- [ ] **Step 3: Record the outcome**

If all six checks pass, note it in the final commit / PR description. Any failure: use superpowers:systematic-debugging, fix, re-run `npm test`, re-verify.

- [ ] **Step 4: Final review gate**

Run the full suite one last time (`npm test`, `npm run typecheck`, `npm run build`), then use superpowers:requesting-code-review for the whole branch before merging (house standard: final whole-branch review, then PR via superpowers:finishing-a-development-branch).

---

## Self-Review Notes (already applied)

- Task 11's auto-player relies on `submit` being side-effect-free on rejection — `GameEngine.dispatch` returns early before `apply`/log-push on a `legal` failure, so probing cards with `submit` is safe.
- `heartsTurnOver` + at-most-once `endTurn` + `heartsNext` interplay: after the 4th card, `award-trick` fires first (trigger precedes endTurn in `runFlow`), emptying the trick and recording `trickWinner`; the subsequent `endTurn` hands the lead to the winner. On the 13th trick the end condition (`zonesEmpty` over hands **and trick**) stays false until the award empties the trick, so the last trick is awarded before scoring.
- `deal`/`shuffleZone` effects intentionally mirror the `deal`/`shuffle` move handlers (a few lines each); sharing code would couple the flow library to move internals for no real DRY win.
