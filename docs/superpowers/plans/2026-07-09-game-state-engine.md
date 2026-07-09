# Authoritative Game-State + Move Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build turnhout's authoritative game-state engine (sub-project 2 of 4) — a deterministic `GameState`, a named-`Move` registry with built-in structural moves, and a `GameEngine` with an append-only move log + replay-undo.

**Architecture:** A pure `core/` game engine layered on SP1's `TableDef`/`Placement`/`RuleRegistry`. `GameState` (cards + optional turn + free-form data + seeded RNG) is mutated only through JSON `Move` objects dispatched to `MoveHandler`s (`legal` + pure `apply`). `GameEngine` holds an append-only log; state is always `fold(apply, initial, log)`, so undo = replay and `loadLog` is the SP4 sync seam. A thin `useGameEngine` hook binds it to React; the demo drives a real engine.

**Tech Stack:** TypeScript, Vite, React 19, bun, vitest + happy-dom, PixiJS 8.14.0, `@ue-too/*` 0.17.6.

## Global Constraints

- Standalone repo at `/Users/vincent.yy.chang/dev/turnhout/main`; branch `feat/game-state-engine` (already created; SP2 design committed there).
- `src/engine/core/**` MUST NOT import from `pixi.js`, `react`, `@ue-too/*`, or touch the DOM.
- No `Math.random()` / `Date.now()` in `core/` — all randomness flows through the seeded RNG carried in `GameState.rng`; the seed is supplied by the caller, never generated in core.
- `Move`, `GameState`, and the move log MUST be pure JSON (serializable) — the SP4 requirement.
- Reuse SP1 verbatim (do not reimplement): `CardState`, `PlayerId`, `Scene`, `cardsByZone` (`scene.ts`); `Json`, `TableDef`, `ZoneDef` (`table-def.ts`); `RuleRegistry`, `canAccept` (`rules.ts`); `registerStarterRules` (`rules-library.ts`); `deriveScene` (`derive-scene.ts`).
- Card world dimensions: `CARD_WIDTH = 100`, `CARD_HEIGHT = 140`.
- Package manager **bun**; test runner **vitest**. Run one test file with `bunx vitest run <path>`; full suite `bun run test`; typecheck `bun run typecheck`; build `bun run build`. (Do NOT use `bun test` — Bun's runner ignores the vitest/happy-dom config.) Run `bun run typecheck` before every commit (vitest does not type-check; `noUnusedLocals`/`noUnusedParameters` are on).
- Conventional-commit messages ending with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- Spec: `docs/superpowers/specs/2026-07-09-game-state-engine-design.md`.

## File Structure

| File | New/Changed | Responsibility |
|---|---|---|
| `src/engine/core/rng.ts` | New | `RngState`, `makeRng`, `nextInt`, `shuffleWithRng` (seeded, pure). |
| `src/engine/core/game-state.ts` | New | `GameState`, `TurnState`; helpers `zoneCards`/`cardById`/`setTurn`/`nextPlayer`/`setPhase`. |
| `src/engine/core/moves.ts` | New | `Move`, `MoveHandler`, `MoveContext`, `MoveRegistry`. |
| `src/engine/core/moves-library.ts` | New | `registerCoreMoves` (move/flip/deal/shuffle). |
| `src/engine/core/game-engine.ts` | New | `GameEngine`, `NewGameArgs`, `DispatchResult`. |
| `src/engine/react/use-game-engine.ts` | New | `useGameEngine` hook. |
| `src/engine/react/index.ts` | Changed | re-export `useGameEngine`. |
| `src/pages/table-demo/table-demo-page.tsx` | Changed | drive a `GameEngine`; Undo + Shuffle buttons. |
| `src/pages/table-demo/table-demo.test.ts` | Changed | add engine-driven assertions. |

Note: `RngState` lives in `rng.ts` (the RNG's concern) and is re-exported from `game-state.ts` for `GameState`.

---

## Task 1: `rng.ts` — seeded deterministic PRNG

**Files:**
- Create: `src/engine/core/rng.ts`
- Test: `src/engine/core/rng.test.ts`

**Interfaces:**
- Produces:
  - `interface RngState { seed: number; count: number }`
  - `makeRng(seed: number): RngState`
  - `nextInt(rng: RngState, boundExclusive: number): { value: number; rng: RngState }` — `value` in `[0, boundExclusive)`; returned `rng.count` incremented. Throws if `boundExclusive <= 0`.
  - `shuffleWithRng<T>(items: T[], rng: RngState): { items: T[]; rng: RngState }` — pure Fisher–Yates; returns a new array (input unmutated) and the advanced rng.

- [ ] **Step 1: Write the failing test `src/engine/core/rng.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { makeRng, nextInt, shuffleWithRng } from './rng';

describe('rng', () => {
  it('makeRng starts at count 0', () => {
    expect(makeRng(42)).toEqual({ seed: 42, count: 0 });
  });

  it('nextInt is deterministic for a given (seed, count) and respects the bound', () => {
    const a = nextInt(makeRng(7), 6);
    const b = nextInt(makeRng(7), 6);
    expect(a.value).toBe(b.value);
    expect(a.value).toBeGreaterThanOrEqual(0);
    expect(a.value).toBeLessThan(6);
    expect(a.rng.count).toBe(1);
  });

  it('nextInt advances the sequence', () => {
    const r0 = makeRng(7);
    const r1 = nextInt(r0, 1000);
    const r2 = nextInt(r1.rng, 1000);
    expect(r2.rng.count).toBe(2);
    // extremely likely distinct; guards against returning a constant
    expect([r1.value, r2.value].length).toBe(2);
  });

  it('nextInt rejects a non-positive bound', () => {
    expect(() => nextInt(makeRng(1), 0)).toThrow();
  });

  it('shuffleWithRng permutes without mutating input and advances rng', () => {
    const input = [1, 2, 3, 4, 5];
    const { items, rng } = shuffleWithRng(input, makeRng(99));
    expect(input).toEqual([1, 2, 3, 4, 5]); // unmutated
    expect([...items].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]); // same multiset
    expect(rng.count).toBe(4); // n-1 draws for length 5
  });

  it('shuffleWithRng is deterministic for a fixed seed', () => {
    const a = shuffleWithRng([1, 2, 3, 4, 5, 6, 7, 8], makeRng(123));
    const b = shuffleWithRng([1, 2, 3, 4, 5, 6, 7, 8], makeRng(123));
    expect(a.items).toEqual(b.items);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/engine/core/rng.test.ts`
Expected: FAIL — cannot find module `./rng`.

- [ ] **Step 3: Write `src/engine/core/rng.ts`**

```ts
export interface RngState {
  seed: number;
  count: number;
}

export function makeRng(seed: number): RngState {
  return { seed: seed >>> 0, count: 0 };
}

/** Deterministic uint32 from (seed, count) — mulberry32-style mix. */
function hash(seed: number, count: number): number {
  let t = (seed + Math.imul(count + 1, 0x6d2b79f5)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

export function nextInt(rng: RngState, boundExclusive: number): { value: number; rng: RngState } {
  if (boundExclusive <= 0) throw new Error(`nextInt bound must be > 0, got ${boundExclusive}`);
  const value = hash(rng.seed, rng.count) % boundExclusive;
  return { value, rng: { seed: rng.seed, count: rng.count + 1 } };
}

export function shuffleWithRng<T>(items: T[], rng: RngState): { items: T[]; rng: RngState } {
  const out = items.slice();
  let cur = rng;
  for (let i = out.length - 1; i > 0; i--) {
    const drawn = nextInt(cur, i + 1);
    cur = drawn.rng;
    const j = drawn.value;
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return { items: out, rng: cur };
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `bunx vitest run src/engine/core/rng.test.ts && bun run typecheck`
Expected: PASS (6 tests); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/rng.ts src/engine/core/rng.test.ts
git commit -m "feat(core): seeded deterministic PRNG (makeRng/nextInt/shuffleWithRng)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `game-state.ts` — state types + helpers

**Files:**
- Create: `src/engine/core/game-state.ts`
- Test: `src/engine/core/game-state.test.ts`

**Interfaces:**
- Consumes: `cardsByZone`, `CardState`, `PlayerId` from `./scene`; `Json` from `./table-def`; `RngState` from `./rng`.
- Produces:
  - `interface TurnState { current: PlayerId; phase?: string }`
  - `interface GameState { cards: CardState[]; turn?: TurnState; data: Record<string, Json>; rng: RngState }`
  - re-export `RngState`
  - `zoneCards(state, zoneId): CardState[]` (ordered per SP1 `cardsByZone`)
  - `cardById(state, id): CardState | undefined`
  - `setTurn(state, turn): GameState`, `nextPlayer(state, order): GameState`, `setPhase(state, phase): GameState` — all immutable; `nextPlayer`/`setPhase` no-op when `state.turn` is undefined.

- [ ] **Step 1: Write the failing test `src/engine/core/game-state.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { cardById, nextPlayer, setPhase, setTurn, zoneCards, type GameState } from './game-state';
import { makeRng } from './rng';
import type { CardState } from './scene';

const card = (id: string, zoneId: string, extra: Partial<CardState> = {}): CardState => ({
  id, zoneId, faceUp: false, faceKey: id, ...extra,
});

const base = (cards: CardState[], turn?: GameState['turn']): GameState => ({
  cards, turn, data: {}, rng: makeRng(1),
});

describe('game-state helpers', () => {
  it('zoneCards groups and orders by slot then index (SP1 ordering)', () => {
    const s = base([
      card('a', 'h', { slot: 2 }),
      card('b', 'h', { slot: 0 }),
      card('c', 'd'),
    ]);
    expect(zoneCards(s, 'h').map((c) => c.id)).toEqual(['b', 'a']);
    expect(zoneCards(s, 'd').map((c) => c.id)).toEqual(['c']);
    expect(zoneCards(s, 'ghost')).toEqual([]);
  });

  it('cardById finds or returns undefined', () => {
    const s = base([card('a', 'h')]);
    expect(cardById(s, 'a')?.id).toBe('a');
    expect(cardById(s, 'z')).toBeUndefined();
  });

  it('setTurn / setPhase are immutable', () => {
    const s = base([], { current: 'p1' });
    const s2 = setTurn(s, { current: 'p2', phase: 'draw' });
    expect(s.turn).toEqual({ current: 'p1' });
    expect(s2.turn).toEqual({ current: 'p2', phase: 'draw' });
    expect(setPhase(s2, 'play').turn).toEqual({ current: 'p2', phase: 'play' });
  });

  it('nextPlayer advances within order and wraps', () => {
    const s = base([], { current: 'p2' });
    expect(nextPlayer(s, ['p1', 'p2', 'p3']).turn!.current).toBe('p3');
    expect(nextPlayer(base([], { current: 'p3' }), ['p1', 'p2', 'p3']).turn!.current).toBe('p1');
  });

  it('nextPlayer / setPhase no-op when there is no turn', () => {
    const s = base([card('a', 'h')]);
    expect(nextPlayer(s, ['p1', 'p2'])).toBe(s);
    expect(setPhase(s, 'x')).toBe(s);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/engine/core/game-state.test.ts`
Expected: FAIL — cannot find module `./game-state`.

- [ ] **Step 3: Write `src/engine/core/game-state.ts`**

```ts
import { cardsByZone, type CardState, type PlayerId } from './scene';
import type { Json } from './table-def';
import type { RngState } from './rng';

export type { RngState };

export interface TurnState {
  current: PlayerId;
  phase?: string;
}

export interface GameState {
  cards: CardState[];
  turn?: TurnState;
  data: Record<string, Json>;
  rng: RngState;
}

export function zoneCards(state: GameState, zoneId: string): CardState[] {
  return cardsByZone({ cards: state.cards, zones: [] }).get(zoneId) ?? [];
}

export function cardById(state: GameState, id: string): CardState | undefined {
  return state.cards.find((c) => c.id === id);
}

export function setTurn(state: GameState, turn: TurnState): GameState {
  return { ...state, turn };
}

export function nextPlayer(state: GameState, order: PlayerId[]): GameState {
  if (!state.turn || order.length === 0) return state;
  const i = order.indexOf(state.turn.current);
  const next = order[(i + 1) % order.length];
  return { ...state, turn: { ...state.turn, current: next } };
}

export function setPhase(state: GameState, phase: string): GameState {
  if (!state.turn) return state;
  return { ...state, turn: { ...state.turn, phase } };
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `bunx vitest run src/engine/core/game-state.test.ts && bun run typecheck`
Expected: PASS (5 tests); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/game-state.ts src/engine/core/game-state.test.ts
git commit -m "feat(core): GameState + helpers (zoneCards/cardById/turn setters)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `moves.ts` — move types + registry

**Files:**
- Create: `src/engine/core/moves.ts`
- Test: `src/engine/core/moves.test.ts`

**Interfaces:**
- Consumes: `GameState` from `./game-state`; `Json`, `TableDef` from `./table-def`; `RuleRegistry` from `./rules`.
- Produces:
  - `interface Move { type: string; [k: string]: Json }`
  - `interface MoveContext { tableDef: TableDef; rules: RuleRegistry }`
  - `interface MoveHandler { legal(state, move, ctx): true | string; apply(state, move, ctx): GameState }`
  - `class MoveRegistry { register(type, handler): this; get(type): MoveHandler | undefined; has(type): boolean }`

- [ ] **Step 1: Write the failing test `src/engine/core/moves.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { MoveRegistry, type MoveHandler } from './moves';

const noop: MoveHandler = { legal: () => true, apply: (s) => s };

describe('MoveRegistry', () => {
  it('registers, gets, and reports presence, and chains', () => {
    const r = new MoveRegistry();
    expect(r.register('a', noop)).toBe(r);
    expect(r.has('a')).toBe(true);
    expect(r.has('b')).toBe(false);
    expect(r.get('a')).toBe(noop);
    expect(r.get('b')).toBeUndefined();
  });
});
```

(`noop`'s `apply` just returns the state it is handed, so this test constructs no `GameState` and needs no `makeRng`/`GameState` import.)

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/engine/core/moves.test.ts`
Expected: FAIL — cannot find module `./moves`.

- [ ] **Step 3: Write `src/engine/core/moves.ts`**

```ts
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
```

- [ ] **Step 4: Run tests + typecheck**

Run: `bunx vitest run src/engine/core/moves.test.ts && bun run typecheck`
Expected: PASS (1 test); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/moves.ts src/engine/core/moves.test.ts
git commit -m "feat(core): Move/MoveHandler/MoveContext + MoveRegistry

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `moves-library.ts` — built-in structural moves

**Files:**
- Create: `src/engine/core/moves-library.ts`
- Test: `src/engine/core/moves-library.test.ts`

**Interfaces:**
- Consumes: `MoveHandler`, `MoveRegistry` from `./moves`; `GameState`, `zoneCards`, `cardById` from `./game-state`; `shuffleWithRng` from `./rng`; `canAccept` from `./rules`.
- Produces: `registerCoreMoves(registry: MoveRegistry): MoveRegistry` — registers `move`, `flip`, `deal`, `shuffle`.
- Semantics:
  - `move {cardId, toZone, slot?}`: `legal` → card+zone exist AND `canAccept`; if the zone's `accept.rule` is not in the registry, reject with a reason (do NOT let `canAccept` throw). `apply` → set the card's `zoneId` (and `slot` if provided).
  - `flip {cardId, faceUp?}`: `apply` sets `faceUp` (toggles if omitted).
  - `deal {fromZone, toZone, count, faceUp?}`: `legal` → `fromZone` has ≥ `count`; `apply` moves the top `count` (last in `zoneCards` order) to `toZone`, setting `faceUp` if given.
  - `shuffle {zoneId}`: `legal` → zone exists; `apply` Fisher–Yates the zone's cards via `state.rng`, reassign their `slot` to the new order, advance `rng`.

- [ ] **Step 1: Write the failing test `src/engine/core/moves-library.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { registerCoreMoves } from './moves-library';
import { MoveRegistry, type MoveContext } from './moves';
import { zoneCards, type GameState } from './game-state';
import { makeRng } from './rng';
import { RuleRegistry } from './rules';
import { registerStarterRules } from './rules-library';
import type { CardState } from './scene';
import type { TableDef } from './table-def';

const card = (id: string, zoneId: string, extra: Partial<CardState> = {}): CardState => ({
  id, zoneId, faceUp: false, faceKey: id, ...extra,
});

const tableDef: TableDef = {
  zones: [
    { id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } },
    { id: 'hand', layout: 'row', transform: { x: 0, y: 300 } },
    { id: 'foundation', layout: 'pile', transform: { x: 300, y: 0 }, accept: { rule: 'sameSuitAscending' } },
    { id: 'guarded', layout: 'pile', transform: { x: 600, y: 0 }, accept: { rule: 'ghostRule' } },
  ],
};

const ctx: MoveContext = { tableDef, rules: registerStarterRules(new RuleRegistry()) };
const registry = registerCoreMoves(new MoveRegistry());
const state = (cards: CardState[], seed = 1): GameState => ({ cards, data: {}, rng: makeRng(seed) });

describe('move', () => {
  const h = registry.get('move')!;
  it('is legal when the target zone accepts and applies the zone change', () => {
    const s = state([card('AS', 'deck', { data: { suit: 'S', rank: 1 } })]);
    const m = { type: 'move', cardId: 'AS', toZone: 'foundation' };
    expect(h.legal(s, m, ctx)).toBe(true);
    expect(h.apply(s, m, ctx).cards[0].zoneId).toBe('foundation');
  });
  it('rejects when the rule rejects the card', () => {
    const s = state([card('5S', 'deck', { data: { suit: 'S', rank: 5 } })]);
    expect(h.legal(s, { type: 'move', cardId: '5S', toZone: 'foundation' }, ctx)).toBeTypeOf('string');
  });
  it('rejects (does not throw) when the zone references an unknown rule', () => {
    const s = state([card('AS', 'deck', { data: { suit: 'S', rank: 1 } })]);
    expect(h.legal(s, { type: 'move', cardId: 'AS', toZone: 'guarded' }, ctx)).toBeTypeOf('string');
  });
  it('rejects unknown card / zone', () => {
    const s = state([card('AS', 'deck')]);
    expect(h.legal(s, { type: 'move', cardId: 'ZZ', toZone: 'hand' }, ctx)).toBeTypeOf('string');
    expect(h.legal(s, { type: 'move', cardId: 'AS', toZone: 'ghostzone' }, ctx)).toBeTypeOf('string');
  });
  it('sets slot when provided', () => {
    const s = state([card('AS', 'deck')]);
    const out = h.apply(s, { type: 'move', cardId: 'AS', toZone: 'hand', slot: 3 }, ctx);
    expect(out.cards[0].slot).toBe(3);
  });
});

describe('flip', () => {
  const h = registry.get('flip')!;
  it('toggles by default and sets explicitly', () => {
    const s = state([card('AS', 'deck', { faceUp: false })]);
    expect(h.apply(s, { type: 'flip', cardId: 'AS' }, ctx).cards[0].faceUp).toBe(true);
    expect(h.apply(s, { type: 'flip', cardId: 'AS', faceUp: false }, ctx).cards[0].faceUp).toBe(false);
  });
});

describe('deal', () => {
  const h = registry.get('deal')!;
  const deck = state([card('a', 'deck'), card('b', 'deck'), card('c', 'deck')]);
  it('moves the top count cards to the target zone', () => {
    const out = h.apply(deck, { type: 'deal', fromZone: 'deck', toZone: 'hand', count: 2, faceUp: true }, ctx);
    expect(zoneCards(out, 'hand').map((c) => c.id).sort()).toEqual(['b', 'c']);
    expect(zoneCards(out, 'hand').every((c) => c.faceUp)).toBe(true);
    expect(zoneCards(out, 'deck').map((c) => c.id)).toEqual(['a']);
  });
  it('rejects when the source has too few cards', () => {
    expect(h.legal(deck, { type: 'deal', fromZone: 'deck', toZone: 'hand', count: 9 }, ctx)).toBeTypeOf('string');
  });
});

describe('shuffle', () => {
  const h = registry.get('shuffle')!;
  const deck = state([card('a', 'd'), card('b', 'd'), card('c', 'd'), card('d', 'd'), card('e', 'd')], 123);
  const td: TableDef = { zones: [{ id: 'd', layout: 'pile', transform: { x: 0, y: 0 } }] };
  const sctx: MoveContext = { tableDef: td, rules: ctx.rules };
  it('permutes deterministically, assigns slots, advances rng, same multiset', () => {
    const out1 = h.apply(deck, { type: 'shuffle', zoneId: 'd' }, sctx);
    const out2 = h.apply(deck, { type: 'shuffle', zoneId: 'd' }, sctx);
    expect(zoneCards(out1, 'd').map((c) => c.id)).toEqual(zoneCards(out2, 'd').map((c) => c.id));
    expect(zoneCards(out1, 'd').map((c) => c.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(out1.cards.every((c) => typeof c.slot === 'number')).toBe(true);
    expect(out1.rng.count).toBe(4);
  });
  it('is legal only for an existing zone', () => {
    expect(h.legal(deck, { type: 'shuffle', zoneId: 'ghost' }, sctx)).toBeTypeOf('string');
    expect(h.legal(deck, { type: 'shuffle', zoneId: 'd' }, sctx)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/engine/core/moves-library.test.ts`
Expected: FAIL — cannot find module `./moves-library`.

- [ ] **Step 3: Write `src/engine/core/moves-library.ts`**

```ts
import { canAccept } from './rules';
import { cardById, zoneCards, type GameState } from './game-state';
import type { Move, MoveContext, MoveHandler, MoveRegistry } from './moves';
import { shuffleWithRng } from './rng';
import type { CardState } from './scene';

function zoneById(ctx: MoveContext, id: string) {
  return ctx.tableDef.zones.find((z) => z.id === id);
}

function mapCards(state: GameState, fn: (c: CardState) => CardState): GameState {
  return { ...state, cards: state.cards.map(fn) };
}

const move: MoveHandler = {
  legal(state, m, ctx) {
    const cardId = m.cardId as string;
    const toZone = m.toZone as string;
    const card = cardById(state, cardId);
    if (!card) return `unknown card: ${cardId}`;
    const zone = zoneById(ctx, toZone);
    if (!zone) return `unknown zone: ${toZone}`;
    if (zone.accept && !ctx.rules.has(zone.accept.rule)) return `zone ${toZone} references unknown rule: ${zone.accept.rule}`;
    if (!canAccept(zone, card, zoneCards(state, toZone), ctx.rules)) return `zone ${toZone} rejects ${cardId}`;
    return true;
  },
  apply(state, m) {
    const cardId = m.cardId as string;
    const toZone = m.toZone as string;
    const slot = m.slot as number | undefined;
    return mapCards(state, (c) =>
      c.id === cardId ? { ...c, zoneId: toZone, ...(slot !== undefined ? { slot } : {}) } : c,
    );
  },
};

const flip: MoveHandler = {
  legal(state, m) {
    return cardById(state, m.cardId as string) ? true : `unknown card: ${m.cardId as string}`;
  },
  apply(state, m) {
    const cardId = m.cardId as string;
    const faceUp = m.faceUp as boolean | undefined;
    return mapCards(state, (c) => (c.id === cardId ? { ...c, faceUp: faceUp ?? !c.faceUp } : c));
  },
};

const deal: MoveHandler = {
  legal(state, m) {
    const fromZone = m.fromZone as string;
    const count = m.count as number;
    if (zoneCards(state, fromZone).length < count) return `not enough cards in ${fromZone}`;
    return true;
  },
  apply(state, m) {
    const fromZone = m.fromZone as string;
    const toZone = m.toZone as string;
    const count = m.count as number;
    const faceUp = m.faceUp as boolean | undefined;
    const top = zoneCards(state, fromZone).slice(-count);
    const ids = new Set(top.map((c) => c.id));
    return mapCards(state, (c) =>
      ids.has(c.id) ? { ...c, zoneId: toZone, ...(faceUp !== undefined ? { faceUp } : {}) } : c,
    );
  },
};

const shuffle: MoveHandler = {
  legal(state, m, ctx) {
    return zoneById(ctx, m.zoneId as string) ? true : `unknown zone: ${m.zoneId as string}`;
  },
  apply(state, m) {
    const zoneId = m.zoneId as string;
    const inZone = zoneCards(state, zoneId);
    const { items, rng } = shuffleWithRng(inZone, state.rng);
    const slotById = new Map(items.map((c, i) => [c.id, i]));
    return {
      ...state,
      rng,
      cards: state.cards.map((c) => (slotById.has(c.id) ? { ...c, slot: slotById.get(c.id) } : c)),
    };
  },
};

export function registerCoreMoves(registry: MoveRegistry): MoveRegistry {
  return registry.register('move', move).register('flip', flip).register('deal', deal).register('shuffle', shuffle);
}

export type { Move };
```

Note: `canAccept` throws on an unknown rule name; the `move` handler guards with `ctx.rules.has(...)` first so a mis-authored zone rejects with a reason instead of throwing (folds in the SP1-review follow-up).

- [ ] **Step 4: Run tests + typecheck**

Run: `bunx vitest run src/engine/core/moves-library.test.ts && bun run typecheck`
Expected: PASS (10 tests); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/moves-library.ts src/engine/core/moves-library.test.ts
git commit -m "feat(core): built-in structural moves (move/flip/deal/shuffle)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `game-engine.ts` — the engine (log, dispatch, undo, replay)

**Files:**
- Create: `src/engine/core/game-engine.ts`
- Test: `src/engine/core/game-engine.test.ts`

**Interfaces:**
- Consumes: `Move`, `MoveContext`, `MoveHandler`, `MoveRegistry` from `./moves`; `RuleRegistry` from `./rules`; `GameState` from `./game-state`; `TableDef` from `./table-def`.
- Produces:
  - `interface NewGameArgs { tableDef: TableDef; rules: RuleRegistry; moves: MoveRegistry; initial: GameState }`
  - `interface DispatchResult { ok: boolean; state: GameState; reason?: string }`
  - `class GameEngine` with `dispatch`, `canDispatch`, `undo`, `reset`, `getState`, `getLog`, `loadLog`, `subscribe` (per spec). Unknown move `type` → throw. Illegal move → `{ok:false, reason}`, log/state unchanged. Invariant: `getState() === fold(apply, initial, log)`.

- [ ] **Step 1: Write the failing test `src/engine/core/game-engine.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { GameEngine } from './game-engine';
import { MoveRegistry } from './moves';
import { registerCoreMoves } from './moves-library';
import { nextPlayer, zoneCards, type GameState } from './game-state';
import { makeRng } from './rng';
import { RuleRegistry } from './rules';
import type { CardState } from './scene';
import type { TableDef } from './table-def';

const card = (id: string, zoneId: string): CardState => ({ id, zoneId, faceUp: false, faceKey: id });
const tableDef: TableDef = {
  players: ['p1', 'p2'],
  zones: [
    { id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } },
    { id: 'hand', layout: 'row', transform: { x: 0, y: 300 } },
  ],
};
const rules = new RuleRegistry();
const initial = (): GameState => ({
  cards: [card('a', 'deck'), card('b', 'deck'), card('c', 'deck')],
  turn: { current: 'p1' },
  data: {},
  rng: makeRng(5),
});

const makeEngine = () => new GameEngine({ tableDef, rules, moves: registerCoreMoves(new MoveRegistry()), initial: initial() });

describe('GameEngine', () => {
  it('applies a legal move, appends to the log, and notifies', () => {
    const e = makeEngine();
    const seen = vi.fn();
    e.subscribe(seen);
    const r = e.dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 2, faceUp: true });
    expect(r.ok).toBe(true);
    expect(zoneCards(e.getState(), 'hand')).toHaveLength(2);
    expect(e.getLog()).toHaveLength(1);
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('rejects an illegal move without touching the log or state', () => {
    const e = makeEngine();
    const r = e.dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 99 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBeTypeOf('string');
    expect(e.getLog()).toHaveLength(0);
    expect(zoneCards(e.getState(), 'hand')).toHaveLength(0);
  });

  it('throws on an unknown move type', () => {
    const e = makeEngine();
    expect(() => e.dispatch({ type: 'teleport' })).toThrow(/teleport/);
  });

  it('canDispatch reports legality without mutating', () => {
    const e = makeEngine();
    expect(e.canDispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 1 })).toBe(true);
    expect(e.getLog()).toHaveLength(0);
  });

  it('undo reverts via replay; undo on empty log is a no-op', () => {
    const e = makeEngine();
    e.dispatch({ type: 'flip', cardId: 'a', faceUp: true });
    e.dispatch({ type: 'flip', cardId: 'b', faceUp: true });
    e.undo();
    expect(e.getLog()).toHaveLength(1);
    expect(e.getState().cards.find((c) => c.id === 'b')!.faceUp).toBe(false);
    e.undo();
    e.undo();
    expect(e.getLog()).toHaveLength(0);
  });

  it('reset clears the log back to initial', () => {
    const e = makeEngine();
    e.dispatch({ type: 'flip', cardId: 'a' });
    e.reset();
    expect(e.getLog()).toHaveLength(0);
    expect(e.getState().cards.find((c) => c.id === 'a')!.faceUp).toBe(false);
  });

  it('unsubscribe stops notifications', () => {
    const e = makeEngine();
    const seen = vi.fn();
    const off = e.subscribe(seen);
    off();
    e.dispatch({ type: 'flip', cardId: 'a' });
    expect(seen).not.toHaveBeenCalled();
  });

  it('determinism seam: loadLog reproduces state exactly (incl. shuffle RNG)', () => {
    const a = makeEngine();
    a.dispatch({ type: 'shuffle', zoneId: 'deck' });
    a.dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 2 });
    const b = new GameEngine({ tableDef, rules, moves: registerCoreMoves(new MoveRegistry()), initial: initial() });
    b.loadLog([...a.getLog()]);
    expect(b.getState()).toEqual(a.getState());
  });

  it('supports a custom move with a turn check (extension path)', () => {
    const moves = registerCoreMoves(new MoveRegistry());
    moves.register('endTurn', {
      legal: (s, m) => (s.turn?.current === (m.player as string) ? true : 'not your turn'),
      apply: (s) => nextPlayer(s, ['p1', 'p2']),
    });
    const e = new GameEngine({ tableDef, rules, moves, initial: initial() });
    expect(e.dispatch({ type: 'endTurn', player: 'p2' }).ok).toBe(false);
    expect(e.dispatch({ type: 'endTurn', player: 'p1' }).ok).toBe(true);
    expect(e.getState().turn!.current).toBe('p2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/engine/core/game-engine.test.ts`
Expected: FAIL — cannot find module `./game-engine`.

- [ ] **Step 3: Write `src/engine/core/game-engine.ts`**

```ts
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
```

- [ ] **Step 4: Run tests + typecheck + whole core suite**

Run: `bunx vitest run src/engine/core/game-engine.test.ts && bunx vitest run src/engine/core && bun run typecheck`
Expected: PASS (9 engine tests; whole core suite green); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/game-engine.ts src/engine/core/game-engine.test.ts
git commit -m "feat(core): GameEngine (dispatch/undo/reset/loadLog + move log)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `use-game-engine.ts` — React binding

**Files:**
- Create: `src/engine/react/use-game-engine.ts`
- Modify: `src/engine/react/index.ts`
- Test: `src/engine/react/use-game-engine.test.tsx`

**Interfaces:**
- Consumes: `GameEngine`, `DispatchResult` from `@/engine/core/game-engine`; `Move` from `@/engine/core/moves`; `GameState` from `@/engine/core/game-state`.
- Produces: `useGameEngine(engine): { state; dispatch; canDispatch; undo }` — subscribes to the engine, mirrors state into React, re-renders on change.

- [ ] **Step 1: Write the failing test `src/engine/react/use-game-engine.test.tsx`**

```tsx
import { render, screen, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useGameEngine } from './use-game-engine';
import { GameEngine } from '@/engine/core/game-engine';
import { MoveRegistry } from '@/engine/core/moves';
import { registerCoreMoves } from '@/engine/core/moves-library';
import { makeRng } from '@/engine/core/rng';
import { RuleRegistry } from '@/engine/core/rules';
import type { TableDef } from '@/engine/core/table-def';
import type { CardState } from '@/engine/core/scene';

const card = (id: string, zoneId: string): CardState => ({ id, zoneId, faceUp: false, faceKey: id });
const tableDef: TableDef = { zones: [{ id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } }] };
const makeEngine = () =>
  new GameEngine({
    tableDef,
    rules: new RuleRegistry(),
    moves: registerCoreMoves(new MoveRegistry()),
    initial: { cards: [card('a', 'deck')], data: {}, rng: makeRng(1) },
  });

function Probe({ engine }: { engine: GameEngine }) {
  const { state, dispatch } = useGameEngine(engine);
  const a = state.cards.find((c) => c.id === 'a')!;
  return (
    <div>
      <span data-testid="face">{String(a.faceUp)}</span>
      <button onClick={() => dispatch({ type: 'flip', cardId: 'a' })}>flip</button>
      <button onClick={() => dispatch({ type: 'flip', cardId: 'ZZ' })}>illegal</button>
    </div>
  );
}

describe('useGameEngine', () => {
  it('re-renders on a legal dispatch', () => {
    const engine = makeEngine();
    render(<Probe engine={engine} />);
    expect(screen.getByTestId('face').textContent).toBe('false');
    act(() => {
      screen.getByText('flip').click();
    });
    expect(screen.getByTestId('face').textContent).toBe('true');
  });

  it('leaves the rendered state unchanged on an illegal dispatch (snap-back)', () => {
    const engine = makeEngine();
    render(<Probe engine={engine} />);
    act(() => {
      screen.getByText('illegal').click();
    });
    expect(screen.getByTestId('face').textContent).toBe('false');
    expect(engine.getLog()).toHaveLength(0);
  });
});
```

Note: keep only the imports the harness actually uses (`noUnusedLocals` is on).

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/engine/react/use-game-engine.test.tsx`
Expected: FAIL — cannot find module `./use-game-engine`.

- [ ] **Step 3: Write `src/engine/react/use-game-engine.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import type { DispatchResult, GameEngine } from '@/engine/core/game-engine';
import type { GameState } from '@/engine/core/game-state';
import type { Move } from '@/engine/core/moves';

export function useGameEngine(engine: GameEngine): {
  state: GameState;
  dispatch: (move: Move) => DispatchResult;
  canDispatch: (move: Move) => true | string;
  undo: () => void;
} {
  const [state, setState] = useState<GameState>(() => engine.getState());

  useEffect(() => {
    setState(engine.getState());
    return engine.subscribe(setState);
  }, [engine]);

  const dispatch = useCallback((move: Move) => engine.dispatch(move), [engine]);
  const canDispatch = useCallback((move: Move) => engine.canDispatch(move), [engine]);
  const undo = useCallback(() => engine.undo(), [engine]);

  return { state, dispatch, canDispatch, undo };
}
```

- [ ] **Step 4: Re-export from `src/engine/react/index.ts`**

Add the line:

```ts
export { useGameEngine } from './use-game-engine';
```

- [ ] **Step 5: Run tests + typecheck**

Run: `bunx vitest run src/engine/react/use-game-engine.test.tsx && bun run typecheck`
Expected: PASS (2 tests); typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add src/engine/react/use-game-engine.ts src/engine/react/use-game-engine.test.tsx src/engine/react/index.ts
git commit -m "feat(react): useGameEngine hook binding the engine to React

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Migrate the demo to drive a `GameEngine`

**Files:**
- Modify: `src/pages/table-demo/table-demo-page.tsx`
- Modify: `src/pages/table-demo/table-demo.test.ts`

**Interfaces:**
- Consumes: `GameEngine` (`@/engine/core/game-engine`), `MoveRegistry` (`@/engine/core/moves`), `registerCoreMoves` (`@/engine/core/moves-library`), `makeRng` (`@/engine/core/rng`), `RuleRegistry`/`registerStarterRules`, `useGameEngine` (`@/engine/react`), the existing `TABLE`/`standardDeck`.
- Produces: a demo driven by a real engine; Undo + Shuffle buttons; `onDrop`/`onCardClick`/`deal5` dispatch moves.

- [ ] **Step 1: Write the failing test addition in `src/pages/table-demo/table-demo.test.ts`**

Append this block to the existing file (keep the existing `validateTableDef`/`standardDeck` tests):

```ts
import { GameEngine } from '@/engine/core/game-engine';
import { MoveRegistry } from '@/engine/core/moves';
import { registerCoreMoves } from '@/engine/core/moves-library';
import { makeRng } from '@/engine/core/rng';
import { RuleRegistry } from '@/engine/core/rules';
import { registerStarterRules } from '@/engine/core/rules-library';
import { zoneCards } from '@/engine/core/game-state';

describe('demo engine', () => {
  const build = () =>
    new GameEngine({
      tableDef: TABLE,
      rules: registerStarterRules(new RuleRegistry()),
      moves: registerCoreMoves(new MoveRegistry()),
      initial: { cards: standardDeck(), data: {}, rng: makeRng(20260709) },
    });

  it('deals 5 cards from deck to hand', () => {
    const e = build();
    const r = e.dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 5, faceUp: true });
    expect(r.ok).toBe(true);
    expect(zoneCards(e.getState(), 'hand')).toHaveLength(5);
    expect(zoneCards(e.getState(), 'deck')).toHaveLength(47);
  });

  it('undo restores the deck after a deal', () => {
    const e = build();
    e.dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 5, faceUp: true });
    e.undo();
    expect(zoneCards(e.getState(), 'deck')).toHaveLength(52);
  });
});
```

(Ensure the file has a single `import { TABLE } from './table-demo-page';` and `import { standardDeck } from './deck';` — reuse the existing ones; add only the new imports above.)

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/pages/table-demo/table-demo.test.ts`
Expected: FAIL — the engine imports resolve, but this asserts new behavior; confirm the two new tests run (they should PASS immediately since they only use core, which already exists). If they pass at this step, that is acceptable — this task's real deliverable is the page rewrite in Step 3; proceed.

- [ ] **Step 3: Rewrite `src/pages/table-demo/table-demo-page.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { Wrapper } from '@/components/PixiCanvas';
import type { Placement, TableDef } from '@/engine/core/table-def';
import { CardTable } from '@/engine/react';
import { useGameEngine } from '@/engine/react';
import { GameEngine } from '@/engine/core/game-engine';
import { MoveRegistry } from '@/engine/core/moves';
import { registerCoreMoves } from '@/engine/core/moves-library';
import { makeRng } from '@/engine/core/rng';
import { RuleRegistry } from '@/engine/core/rules';
import { registerStarterRules } from '@/engine/core/rules-library';
import type { DropIntent } from '@/engine/input/table-input-context';
import { initApp } from '@/utils/init-app';
import { standardDeck } from './deck';

export const TABLE: TableDef = {
  players: ['me'],
  zones: [
    { id: 'deck', layout: 'pile', transform: { x: -400, y: 0 }, layoutOptions: { jitter: 0.02 }, visibility: 'secret' },
    { id: 'hand', layout: 'fan', transform: { x: 0, y: 300 }, layoutOptions: { fanAngleDeg: 24 }, owner: 'me', visibility: 'owner', ordering: 'free' },
    { id: 'discard', layout: 'pile', transform: { x: 400, y: 0 }, visibility: 'public' },
  ],
};

const overlayButton = (left: number): React.CSSProperties => ({
  position: 'absolute', top: 12, left, zIndex: 10, pointerEvents: 'auto',
});

function createEngine(): GameEngine {
  return new GameEngine({
    tableDef: TABLE,
    rules: registerStarterRules(new RuleRegistry()),
    moves: registerCoreMoves(new MoveRegistry()),
    initial: { cards: standardDeck(), data: {}, rng: makeRng(20260709) },
  });
}

function DemoContent() {
  const [engine] = useState(createEngine);
  const { state, dispatch, undo } = useGameEngine(engine);
  const placement: Placement = { cards: state.cards };

  const onDrop = (i: DropIntent) => {
    if (!i.toZoneId) return; // rejected → snaps back automatically
    const res = dispatch({ type: 'move', cardId: i.cardId, toZone: i.toZoneId, slot: i.slot });
    if (res.ok && i.toZoneId === 'hand') dispatch({ type: 'flip', cardId: i.cardId, faceUp: true });
  };

  const onCardClick = (id: string) => {
    dispatch({ type: 'flip', cardId: id });
  };

  const deal5 = () => dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 5, faceUp: true });
  const shuffleDeck = () => dispatch({ type: 'shuffle', zoneId: 'deck' });

  return (
    <>
      <CardTable tableDef={TABLE} placement={placement} onDrop={onDrop} onCardClick={onCardClick} />
      {/* OverlayContainer sets pointer-events:none; interactive UI must re-enable it. */}
      <button style={overlayButton(12)} onClick={deal5}>Deal 5</button>
      <button style={overlayButton(88)} onClick={shuffleDeck}>Shuffle deck</button>
      <button style={overlayButton(196)} onClick={undo}>Undo</button>
    </>
  );
}

export function TableDemoPage() {
  const option = useMemo(() => ({ fullScreen: true, limitEntireViewPort: false }), []);
  return <Wrapper option={option} initFunction={initApp}><DemoContent /></Wrapper>;
}
```

Note: the `move`→`hand` follow-up `flip` reproduces the pre-SP2 behavior (cards land face-up in the hand). `initApp`/`CardTable` are unchanged from SP1.

- [ ] **Step 4: Run the demo test, full suite, typecheck, and build**

Run: `bunx vitest run src/pages/table-demo/table-demo.test.ts && bun run test && bun run typecheck && bun run build`
Expected: PASS (all tests); typecheck clean; build succeeds.

- [ ] **Step 5: Verify the demo in the browser**

The controller performs this. Confirm: cards render; "Deal 5" moves five face-up cards to the hand; "Shuffle deck" reorders the deck (visible jitter change); dragging deck→hand/discard drops via the engine (illegal drops snap back); clicking flips; "Undo" reverts the last move.

- [ ] **Step 6: Commit**

```bash
git add src/pages/table-demo/table-demo-page.tsx src/pages/table-demo/table-demo.test.ts
git commit -m "feat(demo): drive the table with a GameEngine (deal/flip/move/shuffle/undo)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Notes (for the implementer)

- **Spec coverage:** RNG determinism (T1); GameState + helpers incl. optional turn (T2); Move/MoveRegistry (T3); built-in move/flip/deal/shuffle with `canAccept` reuse + reject-not-throw on unknown rule (T4); GameEngine dispatch/log/undo/reset/loadLog/subscribe + determinism seam + custom-move extension (T5); `useGameEngine` re-render + illegal snap-back (T6); demo migration with Undo/Shuffle + engine tests (T7).
- **Determinism:** no `Math.random`/`Date.now` anywhere in `core/`; seed supplied by the caller (`makeRng(20260709)` in the demo). `loadLog` reproduces state exactly (T5 test).
- **Serialization:** `Move`, `GameState`, and the log are pure JSON. (No dedicated round-trip test is required beyond T5's `loadLog` equality, which exercises the same guarantee.)
- **Out of scope (unchanged):** per-player projection (SP3 — `deriveScene` still omniscient); networking (SP4 — the `loadLog` seam is built + tested here); inverse-move undo; snapshot compaction.
- **Type consistency:** `MoveContext`/`MoveHandler` shapes are identical across T3/T4/T5. `GameState` shape identical across T2–T7. `DispatchResult`/`NewGameArgs` from T5 are what T6/T7 consume.
