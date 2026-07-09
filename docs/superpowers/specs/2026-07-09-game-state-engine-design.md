# Authoritative Game-State + Move Engine — Design

**Status:** Approved (design), pending implementation plan.
**Sub-project:** 2 of 4 in the turnhout multiplayer card-toolkit roadmap.
**Date:** 2026-07-09.
**Builds on:** SP1 (`docs/superpowers/specs/2026-07-09-semantic-zone-model-design.md`), merged to `main`.

## Context

SP1 gave turnhout a serializable, semantic table model: a static `TableDef`
(zones with owner/visibility/capacity/accept/ordering) and a dynamic
`Placement` (cards), with `deriveScene(tableDef, placement)` projecting a
renderable `Scene` and a `RuleRegistry` supplying named accept-rules.

SP2 adds the **authoritative game-state engine** that sits above that model. It
mutates the placement (plus turn/phase, free-form game vars, and RNG) through
**moves** that are validated and applied deterministically, and it keeps an
append-only move log. This is the layer SP3 projects per-player and SP4 syncs
over the network.

### Roadmap position

| # | Sub-project | Adds |
|---|---|---|
| 1 | Semantic zone model + serializable table schema | ✅ shipped |
| **2** | **Authoritative game-state + move engine** (this spec) | Deterministic `GameState`, named-`Move` registry, `GameEngine` with an append-only log + replay-undo. |
| 3 | Per-player view projection | Real `deriveScene(state, viewer)` hiding unseen faces/private zones. |
| 4 | Networking / authority / sync | Client move → server validates & applies → broadcasts the log/diffs. |

### Decisions taken during brainstorming

1. **Move model:** named, JSON-serializable `Move` objects dispatched through a
   `MoveRegistry` of handlers (mirrors SP1's `RuleRegistry`). Built-in
   structural moves ship; games register custom moves. Rationale: serializable +
   replayable + wire-ready for SP4; shared vocabulary for later layers.
2. **Turn model:** minimal, optional `turn` state on `GameState`; move handlers
   enforce whose-turn/phase in their own `legal` check. Solitaire omits it.
3. **History:** append-only move log; `state = fold(apply, initial, log)`; undo =
   drop last move(s) + replay. The log doubles as the SP4 sync primitive.
4. **Determinism:** a seeded PRNG lives *in* the state (`RngState`); no
   `Math.random`/`Date.now` in core. Same seed + same log ⇒ identical state.

## Architecture

### GameState

The dynamic authoritative state — pure JSON (serializes for both snapshots and
the log). `Json` and `PlayerId` are reused from SP1 (`scene.ts`/`table-def.ts`).

```ts
interface RngState { seed: number; count: number; }       // deterministic PRNG cursor
interface TurnState { current: PlayerId; phase?: string; }

interface GameState {
  cards: CardState[];            // the dynamic placement — feeds deriveScene
  turn?: TurnState;              // optional; games without turns omit it
  data: Record<string, Json>;    // free-form game vars (scores, trump, bid, …)
  rng: RngState;                 // seeded — the ONLY source of randomness
}
```

`deriveScene(tableDef, { cards: state.cards })` renders the state — the SP1
renderer is unchanged. The engine imports no pixi/react/DOM (same `core/` purity
rules as SP1) and uses no `Math.random`/`Date.now`.

### Determinism / RNG (`rng.ts`)

A small mulberry32-style PRNG keyed on `seed` + `count`, advanced functionally:

```ts
function makeRng(seed: number): RngState;                 // { seed, count: 0 }
function nextInt(rng: RngState, boundExclusive: number): { value: number; rng: RngState };
// value in [0, boundExclusive); returned rng has count incremented.
function shuffleWithRng<T>(items: T[], rng: RngState): { items: T[]; rng: RngState };
// deterministic Fisher–Yates; pure (returns a new array + advanced rng).
```

The seed is supplied by the caller at `newGame` (the consumer, or the server in
SP4). Core never generates a seed.

### Moves (`moves.ts`)

```ts
interface Move { type: string; [k: string]: Json }        // pure JSON

interface MoveContext {
  tableDef: TableDef;
  rules: RuleRegistry;   // SP1 — handlers reuse canAccept for structural legality
}

interface MoveHandler {
  legal(state: GameState, move: Move, ctx: MoveContext): true | string;   // string = rejection reason
  apply(state: GameState, move: Move, ctx: MoveContext): GameState;       // PURE, returns next state
}

class MoveRegistry {
  register(type: string, handler: MoveHandler): this;
  get(type: string): MoveHandler | undefined;
  has(type: string): boolean;
}
```

`legal` returns `true` or a human-readable reason string (useful for UI and
debugging). `apply` is pure and derives all randomness from `state.rng`.

### Built-in structural moves (`moves-library.ts`)

`registerCoreMoves(registry: MoveRegistry): MoveRegistry` — optional import; a
game pulls it in only if it uses these.

| Move | Params | `legal` | `apply` |
|---|---|---|---|
| `move` | `cardId, toZone, slot?` | card exists; `canAccept(zone, card, zoneCards, rules)` | set the card's `zoneId` (and `slot` if given) |
| `flip` | `cardId, faceUp?` | card exists | set `faceUp` (toggle if omitted) |
| `deal` | `fromZone, toZone, count, faceUp?` | `fromZone` has ≥ `count` cards | move the top `count` cards to `toZone` (setting `faceUp` if given) |
| `shuffle` | `zoneId` | zone exists | Fisher–Yates the zone's cards via `state.rng`, reassign their order, advance `rng.count` |

"Top" of a zone = last in `cardsByZone(state, zoneId)` order (SP1 ordering).
Structural moves are composable: a custom move's `apply` may call the same
helpers these use.

### Helpers (`game-state.ts`)

Pure, shipped with the state types so handlers stay terse:

```ts
function zoneCards(state: GameState, zoneId: string): CardState[];   // ordered per SP1 cardsByZone
function cardById(state: GameState, id: string): CardState | undefined;
function setTurn(state: GameState, turn: TurnState): GameState;
function nextPlayer(state: GameState, order: PlayerId[]): GameState;  // advances turn.current within order
function setPhase(state: GameState, phase: string): GameState;
```

All return a new `GameState` (no mutation).

### GameEngine (`game-engine.ts`)

A thin stateful shell around the pure reducer; holds the log + current state.

```ts
interface NewGameArgs {
  tableDef: TableDef;
  rules: RuleRegistry;
  moves: MoveRegistry;
  initial: GameState;    // includes the caller-provided rng seed
}

interface DispatchResult { ok: boolean; state: GameState; reason?: string; }

class GameEngine {
  constructor(args: NewGameArgs);
  dispatch(move: Move): DispatchResult; // unknown type → throw; illegal → {ok:false,reason}, log untouched; legal → apply, append, notify
  canDispatch(move: Move): true | string;   // dry-run legality, no state change
  undo(): void;                              // drop last log entry, replay from initial
  reset(): void;                             // clear log, back to initial
  getState(): GameState;
  getLog(): readonly Move[];
  loadLog(log: Move[]): void;                // replace log, replay from initial (SP4 sync / persistence)
  subscribe(fn: (state: GameState) => void): () => void;   // returns unsubscribe
}
```

Invariant: `getState() === fold(handler.apply, initial, log)` at all times.
`dispatch` on an unknown move `type` throws (a bad type is a programming bug, as
with SP1's unknown accept-rule). An illegal move returns `{ok:false, reason}` and
leaves the log and state unchanged — so an illegal drop naturally snaps back when
the unchanged state re-renders.

Determinism guarantee (tested): `loadLog(other.getLog())` on an engine with the
same `initial` reproduces `other.getState()` exactly. This is the SP4 seam.

### React binding (`react/use-game-engine.ts`)

A thin hook — no new provider/context.

```ts
function useGameEngine(engine: GameEngine): {
  state: GameState;
  dispatch: (m: Move) => DispatchResult;
  canDispatch: (m: Move) => true | string;
  undo: () => void;
};
```

Subscribes to the engine, mirrors its state into React state, and re-renders on
change. `<CardTable>` is unchanged; the consumer passes
`placement={{ cards: state.cards }}`.

### Interaction loop

```
pointer → DropIntent (SP1) → consumer builds a Move → engine.dispatch(move)
        → new GameState → deriveScene(tableDef, {cards: state.cards}) → PixiTable
```

An illegal move leaves state untouched → the card snaps back with no special
handling.

## Demo migration (proves it end-to-end)

The table-demo drops its ad-hoc `useState`/`setCards` and drives a real
`GameEngine` + `registerCoreMoves`:

- `onDrop` → `dispatch({ type:'move', cardId, toZone: intent.toZoneId, slot: intent.slot })`
- `onCardClick` → `dispatch({ type:'flip', cardId })`
- "Deal 5" → `dispatch({ type:'deal', fromZone:'deck', toZone:'hand', count:5, faceUp:true })`
- "Undo" (new button) → `engine.undo()` — demonstrates the log
- "Shuffle deck" (new button) → `dispatch({ type:'shuffle', zoneId:'deck' })` — demonstrates seeded RNG

`onDrop` no longer special-cases `faceUp` for the hand; instead the demo either
keeps that as a tiny post-move `flip` dispatch or accepts cards land face-down in
hand — the plan will pick the minimal faithful option (default: after a `move`
into `hand`, dispatch a follow-up `flip` to face-up, matching current behavior).

## Components (units & interfaces)

| Unit | File (new) | Responsibility |
|---|---|---|
| State + helpers | `src/engine/core/game-state.ts` | `GameState`, `TurnState`, `RngState`; `zoneCards`/`cardById`/`setTurn`/`nextPlayer`/`setPhase`. |
| RNG | `src/engine/core/rng.ts` | `makeRng`, `nextInt`, `shuffleWithRng` (seeded, pure). |
| Move types + registry | `src/engine/core/moves.ts` | `Move`, `MoveHandler`, `MoveContext`, `MoveRegistry`. |
| Core moves | `src/engine/core/moves-library.ts` | `registerCoreMoves` (move/flip/deal/shuffle). |
| Engine | `src/engine/core/game-engine.ts` | `GameEngine` (dispatch/canDispatch/undo/reset/getState/getLog/loadLog/subscribe). |
| React hook | `src/engine/react/use-game-engine.ts` | `useGameEngine`. |
| Demo | `src/pages/table-demo/*` (changed) | drive a `GameEngine`; Undo + Shuffle buttons. |

## Testing

Pure-core units, `vitest`, deterministic:

- **rng:** same seed ⇒ same sequence; `nextInt` bound respected; `shuffleWithRng`
  is a permutation, deterministic for a fixed seed, and advances `count`.
- **helpers:** `zoneCards` ordering matches SP1; `nextPlayer` wraps; setters are
  immutable (return new state).
- **core moves:** `move` legal/illegal via `canAccept` (capacity + accept-rule);
  `flip` toggle vs set; `deal` count + insufficient-cards rejection; `shuffle`
  permutes deterministically and advances rng.
- **engine:** dispatch appends to log on legal, rejects+no-op on illegal, throws
  on unknown type; `undo` reverts via replay; `reset` clears; `canDispatch`
  doesn't mutate; `subscribe`/unsubscribe fire correctly.
- **determinism seam:** two engines with the same `initial`+seed, one fed moves
  directly and the other via `loadLog(getLog())`, reach deep-equal state.
- **custom move:** register a tiny `playCard` with a turn check to prove the
  extension path (legal blocks off-turn; apply advances the turn).
- **react:** `useGameEngine` re-renders on dispatch; illegal dispatch leaves the
  rendered cards unchanged (snap-back).
- **demo:** deal/flip/move/shuffle/undo drive the engine; state round-trips.

## Out of scope (deferred)

- Per-player projection / hidden information (SP3 — `deriveScene` still omniscient).
- Networking, authority, reconnection (SP4 — but the log/`loadLog` seam is built and tested here).
- Inverse-move undo; snapshot/log compaction.
- AI / bots; timers/clocks (would need injected time, not core).
- The SP1 review's deferred items that intersect moves: when a move consumes
  `slot`, reconcile `slotAtPoint 'free'` ordering with `cardsByZone`; make an
  unknown accept-rule reject rather than throw. The plan will fold these in where
  the `move` handler touches them.
