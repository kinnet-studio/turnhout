# Semantic Zone Model + Serializable Table Schema — Design

**Status:** Approved (design), pending implementation plan.
**Sub-project:** 1 of 4 in the turnhout multiplayer card-toolkit roadmap.
**Date:** 2026-07-09.

## Context

`turnhout` today is a rendering-and-interaction engine: a pure `core/` (scene
types, layout, diff, hit-testing, tween, choreography, `TableModel`) with `pixi/`,
`input/`, and `react/` adapter layers. It renders a declarative `Scene = { cards,
zones }` and emits interaction intents; game rules live in the consuming app.

The goal is to grow turnhout into a **full-stack toolkit for web-based card game
development, including multiplayer**. That is too large for one spec, so it is
decomposed into four dependency-ordered sub-projects:

| # | Sub-project | Adds |
|---|---|---|
| **1** | **Semantic zone model + serializable table schema** (this spec) | Zones gain owner, visibility, capacity, real bounds, serializable accept-rules. Splits static table definition from dynamic card placement. |
| 2 | Authoritative game-state + move engine | Full-truth state, deterministic seeded moves, reducer, turn/phase hooks, move validation. |
| 3 | Per-player view projection | `deriveScene(state, viewer)` — hide unseen faces, collapse opponent hands, filter private zones. |
| 4 | Networking / authority / sync | Client sends move → server validates → broadcasts per-player projected diffs. Reconnect, spectators. A Cloudflare Durable Object per room is a strong fit. |

Each sub-project gets its own spec → plan → build cycle. This spec covers **only
sub-project 1**, but its shape is deliberately forward-compatible with 2–4.

### Target genres

All four of: trick-takers/traditional, TCG/deck-builders, solitaire/patience,
hidden-role/social. This forces the zone model to be a **general, composable
primitive set** (not genre-specific), while still applying YAGNI — general ≠ the
union of every feature.

### Problems in the current zone handling (motivation)

1. **Zone drop-bounds are faked.** `ZoneState` has no width/height; `init-app.ts`
   fabricates the drop region as `(layoutOptions.spacing ?? CARD_WIDTH) * 4 ×
   CARD_HEIGHT * 2`. Drop targets are guessed, not authored, and mis-centered for
   `grid` layouts.
2. **`accepts` is a function** (`ZoneState.accepts?: (card) => boolean`) — cannot
   be serialized. A table cannot be saved to JSON or sent over the wire.
3. **No zone semantics** beyond layout: no ownership, capacity, visibility, or
   ordering rules.
4. **No slot addressing** — `zoneAtPoint` always returns `slot: 0`.

## Architecture

### The structural move: split definition from placement

Today `Scene` conflates the *static table definition* with the *dynamic card
placement*. Multiplayer needs them separate: the projection layer (SP3) filters
placement against a fixed table def; the move engine (SP2) mutates placement over
an unchanging def.

```ts
// STATIC — authored once per game, fully serializable, shared client + server.
interface TableDef {
  zones: ZoneDef[];
  players?: PlayerId[];        // seats; optional (solitaire has none)
}

// DYNAMIC — placement of cards; evolves every move (SP2 owns mutation).
interface Placement {
  cards: CardState[];          // existing CardState, extended with revealTo (below)
}

// The renderer still eats a Scene. Scene becomes a *derived* view:
//   deriveScene(tableDef, placement, viewer?) -> Scene
// SP1 ships the omniscient-viewer identity implementation (viewer sees all),
// so the existing demo keeps rendering unchanged. SP3 replaces the body.
```

`PlayerId = string`.

### ZoneDef — the semantic zone

Every semantic field is optional so a trick-taker's hand is one line and a
solitaire tableau is fully specified.

```ts
type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

interface ZoneDef {
  id: string;
  layout: LayoutKind;                          // 'pile'|'fan'|'row'|'grid'|'free'
  transform: { x: number; y: number; rotation?: number };
  layoutOptions?: LayoutOptions;

  // Geometry (Section: Geometry). Optional — auto-derived from layout if omitted.
  bounds?: { width: number; height: number; anchor?: { x: number; y: number } };

  // Semantics.
  owner?: PlayerId | 'shared';                 // default 'shared'
  visibility?: 'public' | 'owner' | 'secret';  // who sees FACES; default 'public'
  capacity?: number;                            // max cards; default Infinity
  accept?: { rule: string; params?: Json };    // registry ref; default: accept anything
  ordering?: 'stack' | 'ordered' | 'free';     // default 'stack'
}
```

### CardState extension

```ts
interface CardState {
  // ...existing fields (id, zoneId, faceUp, faceKey, slot?, draggable?, data?)...
  revealTo?: PlayerId[] | 'all';   // per-card visibility override (peek/reveal)
}
```

`revealTo` is used by SP3's projection; SP1 only carries it through the schema.

## Visibility model

Visibility is **orthogonal** to a card's `faceUp` orientation:

- `faceUp` is the physical table state that drives the flip animation.
- `visibility` decides who additionally sees a face-down/private card's true
  identity in *their own projection*.

Zone visibility levels:

| Level | Who sees faces | Example zones |
|---|---|---|
| `public` | everyone | discard, trick area, TCG board, solitaire tableau |
| `owner` | only `zone.owner` | a player's hand (face-down to the table, visible to its owner) |
| `secret` | nobody, even the owner | face-down deck, solitaire stock, face-down mystery pile |

Per-card `revealTo` handles exceptions (Coup reveals, "play face up") without a
full per-card-per-viewer matrix. The full matrix — needed only for inversions like
Hanabi ("see everyone's hand but your own") — is **out of scope** unless such a
game is named later.

Enforcement (actually hiding faces) lives in SP3's `deriveScene`. SP1 defines the
fields and ships the omniscient identity projection.

## Geometry, bounds & slot resolution

### Origin vs. bounds (decoupled)

- `transform` = the zone's **origin point** in world space. Layout math is
  unchanged: `computeZoneLayout` positions cards relative to this origin (pile
  stacks at it, row centers around it, grid grows right/down from it).
- `bounds` + `anchor` = the **pickable/droppable rectangle**, positioned
  independently. `anchor` is a normalized point in `[0..1]²` locating `transform`
  inside the rect: `{0.5,0.5}` = box centered on transform (pile); `{0,0}` =
  transform at top-left (grid). The world rect spans
  `transform − anchor·size … transform + (1−anchor)·size`.

Decoupling fixes a latent bug: `grid` layout treats `transform` as the top-left of
the cards, but the current faked drop box is centered on transform, mis-aligning
grid drop regions. Explicit `anchor` makes it correct.

Anchor default per layout (when `bounds` given without `anchor`): `grid` → `{0,0}`;
all others → `{0.5,0.5}`.

### Auto-bounds (replaces the faked multiplier)

`bounds` is optional. When omitted, core computes a **tight bounds from the actual
layout** at the current card count plus the card footprint (`CARD_WIDTH ×
CARD_HEIGHT`), via `computeZoneLayout` — a correct box rather than a magic `×4`.
Authors set explicit `bounds` only for fixed-size drop targets (e.g. a foundation
that must stay one card size regardless of contents).

**Empty zones stay droppable:** auto-bounds falls back to a one-card footprint at
the anchor when the zone has 0 cards, so empty foundations / empty tableau columns
remain valid drop targets.

This replaces the `init-app.ts` hack with a core function:

```ts
placeZone(zone: ZoneDef, cards: CardState[]): PlacedZone
// returns { id, x, y, width, height } as a world-space AABB (see Rotation).
```

`PlacedZone` drops its `accepts?` function field; acceptance now goes through the
registry (below).

### Slot resolution

```ts
slotAtPoint(zone: ZoneDef, cards: CardState[], world: Vec2): number
// inverts the layout to find the nearest insertion index.
// stack  -> always the append index (cards.length)
// ordered-> append index (sequence legality is SP2)
// free   -> nearest index by layout position
```

Replaces the `slot: 0` stub in `zoneAtPoint`, enabling hand-reordering and
positional drops.

### Rotation (v1 limitation)

Hit-testing stays **axis-aligned (AABB)** even for rotated zones. `placeZone`
computes the AABB that *encloses* the rotated layout, so rotated zones (e.g.
opponent hands across the table) have some slop. Accepted for v1: players
precision-drop into their own (facing) zones; rotated opponent zones are rarely
precise drop targets. Oriented-bounding-box hit-testing is a clean later upgrade.

## Rule registry & accept evaluation

### Registry (instance, not global)

Rules are pure predicates held in a `RuleRegistry` instance passed in explicitly —
no global mutable state; tests and multiple tables never collide. The core
determinism rule holds: no `Math.random` / `Date.now` in rules (shuffle RNG is
SP2, seeded).

```ts
type AcceptRule = (args: {
  card: CardState;             // incoming card (card.zoneId = its source zone)
  zone: ZoneDef;               // target zone
  zoneCards: CardState[];      // current occupants, ordered
  top: CardState | null;       // convenience = last of zoneCards
  params?: Json;               // from zone.accept.params
}) => boolean;

class RuleRegistry {
  register(name: string, fn: AcceptRule): this;
  get(name: string): AcceptRule | undefined;
  has(name: string): boolean;
}
```

### Evaluator

```ts
canAccept(zone: ZoneDef, card: CardState, zoneCards: CardState[], registry: RuleRegistry): boolean
//  1. capacity: zoneCards.length < (zone.capacity ?? Infinity)
//  2. accept:   no zone.accept -> true; else registry.get(zone.accept.rule)(args)
//  Unknown rule name -> throw (a serialized table referencing a missing rule is a
//  real bug; fail loud).
```

### Wiring (concrete SP1 deliverable)

`zoneAtPoint` currently calls `z.accepts(card)`. It is rewired to
`canAccept(zone, card, zoneCards, registry)`. After SP1 the drop pipeline is
capacity-aware, registry-driven, and fully serializable end to end. The input
tracker/context is threaded with the active `RuleRegistry` and a way to read a
zone's current `zoneCards` (from the current `Placement`).

### Starter rule library (optional import)

Shipped as a separate module so trick-takers do not pay for it:

- `alwaysAccept` — default.
- `descAltColor` — solitaire tableau (descending rank, alternating color; King to empty).
- `sameSuitAscending` — solitaire foundation (same suit, ascending from Ace; Ace to empty).
- `matchRankOrSuit` — Crazy Eights / Uno-like.
- `byTag` — `params: { tags: string[] }`; TCG filtering on `card.data.tags`.
- `emptyOnly` — accept only when the zone is empty.

### Ordering

`ordering` feeds two SP1 behaviours:

- `slotAtPoint` (see Geometry).
- Drag eligibility: `stack` → only the top card is draggable, surfaced through the
  existing `draggableOnly` hit-test path. `ordered`/`free` → all cards draggable.

Deeper move legality (turn order, whose-turn) is SP2.

## Validation

```ts
validateTableDef(def: TableDef, registry: RuleRegistry): { ok: boolean; errors: string[]; warnings: string[] }
```

Mirrors the existing `validateScene`. Checks:

- zone-id uniqueness (error on duplicate);
- `owner` (when not `'shared'`) is a declared member of `def.players` (warning);
- `capacity`, when present, is `>= 1` (error otherwise);
- every `accept.rule` name resolves in `registry` (error otherwise);
- `bounds.width`/`height`, when present, are `> 0` (error otherwise).

## Serialization

`TableDef` is pure JSON (accept is `{ rule, params }`, no functions). The registry
is code shared by both ends. To load a serialized `TableDef`, the running build's
registry must contain every referenced rule name — `validateTableDef` enforces
this. `Placement` (with `revealTo`) is likewise JSON-serializable. A future
data-DSL rule type can plug into the same registry seam without breaking the
schema.

## Backward compatibility & migration

- The existing `Scene`/`ZoneState` types are retained during SP1; `ZoneDef` is the
  new authoritative shape. `deriveScene(tableDef, placement)` (omniscient identity)
  produces the `Scene` that `TableModel`/`PixiTable`/`CardTable` already consume,
  so no renderer changes are required.
- `init-app.ts`'s hand-rolled `PlacedZone` mapping is deleted in favour of
  `placeZone`.
- The demo page is migrated to author a `TableDef` + `Placement` and derive its
  `Scene`, proving the round-trip.

## Components (units & interfaces)

| Unit | File (new/changed) | Responsibility |
|---|---|---|
| Table schema types | `src/engine/core/table-def.ts` (new) | `TableDef`, `ZoneDef`, `Placement`, `PlayerId`, `Json`; `revealTo` on `CardState`. |
| Geometry | `src/engine/core/zone-geometry.ts` (new) | `placeZone`, anchor/bounds math, auto-bounds, `slotAtPoint`. |
| Rules | `src/engine/core/rules.ts` (new) | `RuleRegistry`, `AcceptRule`, `canAccept`. |
| Rule library | `src/engine/core/rules-library.ts` (new) | starter rules. |
| Validation | `src/engine/core/table-def.ts` | `validateTableDef`. |
| Projection (identity) | `src/engine/core/derive-scene.ts` (new) | `deriveScene` omniscient identity (SP3 replaces body). |
| Hit-test rewire | `src/engine/core/hittest.ts` (changed) | `zoneAtPoint` uses `canAccept` + `slotAtPoint`; `PlacedZone` loses `accepts`. |
| App wiring | `src/utils/init-app.ts` (changed) | use `placeZone` + registry; drop the faked bounds. |
| Demo | `src/pages/table-demo/*` (changed) | author `TableDef`/`Placement`, derive scene. |

## Testing

Pure-core units, `vitest`, deterministic (no RNG/time):

- **Geometry:** anchor placement for each layout; auto-bounds tightness incl.
  empty-zone fallback; grid anchor correctness (the fixed bug); `slotAtPoint` for
  stack/ordered/free; rotation AABB enclosure.
- **Rules:** `RuleRegistry` register/get/has; `canAccept` capacity + rule + unknown-rule
  throw; each starter rule's truth table (e.g. `descAltColor`: King→empty true,
  red-6 on black-7 true, red-6 on red-7 false).
- **Validation:** duplicate zone id, bad owner, `capacity < 1`, missing rule name,
  non-positive bounds.
- **Round-trip:** `TableDef`/`Placement` → `JSON.stringify` → parse → deep-equal;
  `validateTableDef` passes on the demo table.
- **Compat:** `deriveScene(tableDef, placement)` yields a `Scene` the existing
  `TableModel` renders; demo drag/flip/deal still work.

## Out of scope (deferred)

- Move mutation, turn/phase engine, seeded shuffle (SP2).
- Real hidden-info projection (SP3).
- Networking, authority, reconnection (SP4).
- Oriented-bounding-box hit-testing.
- Full per-card-per-viewer visibility matrix (Hanabi-style inversions).
- A data-only expression DSL for rules (the registry seam leaves room for it).
