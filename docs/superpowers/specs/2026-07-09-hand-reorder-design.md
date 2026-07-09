# Hand Reordering (`reorder` move) — Design

**Status:** Approved (design), pending implementation plan.
**Date:** 2026-07-09.
**Builds on:** SP2 move engine (`docs/superpowers/specs/2026-07-09-game-state-engine-design.md`)
and SP4 net sync (`docs/superpowers/specs/2026-07-09-net-sync-design.md`), merged to `main`.

## Context

Players need to reorder the cards in their own hand by dragging a card to a new
position within the hand zone. The machinery is half-built: `slotAtPoint`
(`src/engine/core/zone-geometry.ts`) already computes a nearest-slot index for
`ordering: 'free'` zones, `DropIntent` already carries that `slot`, and the core
`move` handler writes it onto the dragged card. But only the dragged card ever
gets a `slot` — siblings keep `undefined`, and `cardsByZone`
(`src/engine/core/scene.ts`) falls back to the card's **global** scene index, so
a zone-local slot like `1` is compared against global indices like `23`. The
dragged card jumps to a semi-arbitrary position and no other card shifts.
Within-zone drops are therefore visually broken today.

### Decisions taken during brainstorming

1. **Engine move, not view state.** Reordering goes through `GameEngine.dispatch`
   like every other move: undoable, deterministic, and replicated over the net
   layer for free, since hand order already lives in authoritative `GameState`.
2. **Drag-within-zone only.** The one gesture is dragging a card inside its own
   free-ordered zone. Sort-hand helpers can come later as game-level moves.
3. **Dedicated `reorder` move (Approach A)** rather than overloading `move`/`play`
   for same-zone drops. Rationale: the net demo routes drops through `play`,
   which is turn-gated; reordering your own hand must be legal **off-turn**.
   A distinct move type answers "is this a reorder?" once, in the engine,
   instead of leaking it into every game's move rules.

## Design

### 1. Ordering fix in `cardsByZone` (`src/engine/core/scene.ts`)

Change the sort fallback from the card's global scene index to its **zone-local
position**, so `slot`-less cards keep their relative order and explicit `slot`
values compare against sane numbers. This also fixes an existing bug where a
card dropped onto a pile (`slot = length`) can sort *under* the pile because
`length` is small relative to global indices.

### 2. Slot insertion helper (core)

A pure helper:

```ts
insertAtSlot(state: GameState, cardId: string, zoneId: string, slot: number): GameState
```

Takes the zone's cards in current visual order (same ordering rule as
`cardsByZone`), removes the moved card, clamps `slot` to `[0, n-1]`, inserts,
then writes `slot: 0..n-1` back across the zone. Card objects whose slot value
did not change keep their object identity, so diff/choreography see no phantom
changes.

### 3. New core move `reorder { cardId, slot, by? }` (`moves-library.ts`)

- **Legal:** card exists; its current zone has `ordering: 'free'` (else
  "not reorderable"); if `by` is present and the zone has a non-shared `owner`,
  `by` must match ("not your zone"). **Not turn-gated.**
- **Apply:** `insertAtSlot` on the card's *current* zone. The move carries no
  `toZone` — a reorder cannot change zones by construction.

### 4. `move` handler upgrade

When the destination zone is `ordering: 'free'`, `move` applies via
`insertAtSlot`, so a cross-zone drop inserts at the drop position instead of
writing a raw slot. Non-free zones keep today's append behavior, which becomes
correct once §1 lands.

### 5. Client wiring

In both demos' `onDrop`: if `intent.fromZoneId === intent.toZoneId`, dispatch or
send `reorder { cardId, slot }` instead of `move`/`play`. `DropIntent` already
carries everything needed — no input-layer changes. The net demo's server
registers core moves, so `reorder` works over the wire as-is; the server stamps
the seat as `by` (confirm during implementation; if it does not, stamp it in
`GameServer` move handling).

### 6. Insertion feel

`slotAtPoint` picks the nearest card's index. Combined with remove-then-insert
this lands "after the nearest card" when dragging right and "before" when
dragging left — standard list-drag feel. Kept as-is for v1; midpoint-based
insertion is a possible later refinement.

### 7. Testing

- `reorder` legality: non-free zone rejected, wrong `by` vs. zone owner
  rejected, unknown card rejected, off-turn allowed.
- `reorder` apply: left and right moves renormalize to the expected order;
  out-of-range slot clamps; single-card zone is a no-op; unchanged cards keep
  object identity.
- `move` into a free-ordered zone inserts at the drop slot and renormalizes.
- `cardsByZone`: mixed slot/no-slot zone orders by zone-local fallback; pile
  append (`slot = length`) sorts on top.
- Net-level: a seat can `reorder` its own hand off-turn, while `play` off-turn
  is still rejected; a seat cannot reorder the opponent's hand.

## Accepted consequences

- Hand order lives in authoritative state, so an opponent watching your
  face-down fan sees cards visibly shuffle when you reorder. They cannot see
  faces, so nothing meaningful is revealed. Accepted.
- Reorders enter the move log and are therefore undoable via replay-undo, like
  any other move. Accepted (and consistent with decision 1).

## Out of scope

- Sort-hand buttons or other bulk-ordering helpers.
- Midpoint-based insertion-index refinement.
- Per-client cosmetic hand order kept outside `GameState`.
