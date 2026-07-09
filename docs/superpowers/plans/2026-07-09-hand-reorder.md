# Hand Reordering (`reorder` move) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a player reorder the cards in their own hand by dragging a card within its zone, as a real engine move (`reorder`) that is undoable and replicates over the net layer.

**Architecture:** Fix `cardsByZone`'s slot sort to use zone-local fallback indices; add a pure `insertAtSlot` helper to `game-state.ts` that removes/reinserts a card and renormalizes the zone's slots to `0..n-1`; register a new core `reorder` move (owner-checked, not turn-gated); route `move` through the same helper when the destination zone is `ordering: 'free'`; branch both demos' `onDrop` on `fromZoneId === toZoneId`.

**Tech Stack:** TypeScript, Vitest (happy-dom), Bun, React (demo pages only).

**Spec:** `docs/superpowers/specs/2026-07-09-hand-reorder-design.md`

## Global Constraints

- `src/engine/core/` stays pure: no PixiJS/React/DOM imports, no `Math.random`/`Date.now`.
- All state updates are immutable; card objects whose fields don't change must keep object identity (diff/choreography animate by reference changes).
- Moves are plain JSON (`Move` extends `{ type: string; [k: string]: Json }`) — handlers read fields with `m.field as T` casts, matching the existing style in `moves-library.ts`.
- Test commands: `bun run test` (all), `bunx vitest run <file>` (single file), `bun run typecheck`.
- Commit after each task; end commit messages with the Claude co-author trailer.

---

### Task 1: Zone-local slot fallback in `cardsByZone`

Today the sort key falls back to the card's **global** scene index (`a.card.slot ?? a.index`), so an explicit zone-local slot (e.g. `slot: 2`) compares against global indices (e.g. `23`) and sorts wrongly — a card dropped on a pile with `slot = length` can land *under* the pile.

**Files:**
- Modify: `src/engine/core/scene.ts:77-94` (`cardsByZone`)
- Test: `src/engine/core/scene.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `cardsByZone(scene: Scene): Map<string, CardState[]>` — same signature, but explicit `slot` values now compare against each card's position *within its zone's list*. `zoneCards` (game-state.ts) inherits the fix since it delegates to `cardsByZone`.

- [ ] **Step 1: Write the failing test**

Append to the existing `describe('cardsByZone', ...)` block in `src/engine/core/scene.test.ts`:

```ts
  it('compares explicit slots against zone-local positions, not global scene indices', () => {
    const s = scene(
      [
        { id: 'f0', zoneId: 'h', faceUp: true, faceKey: 'f0' },
        { id: 'f1', zoneId: 'h', faceUp: true, faceKey: 'f1' },
        { id: 'f2', zoneId: 'h', faceUp: true, faceKey: 'f2' },
        { id: 'a', zoneId: 'p', faceUp: true, faceKey: 'a' },
        { id: 'b', zoneId: 'p', faceUp: true, faceKey: 'b' },
        { id: 'x', zoneId: 'p', faceUp: true, faceKey: 'x', slot: 2 },
      ],
      [{ id: 'p', layout: 'pile', transform: { x: 0, y: 0 } }],
    );
    // x was dropped onto the pile with slot = 2 (append). With a global-index
    // fallback, a/b get indices 3/4 and x wrongly sorts under the pile.
    expect(cardsByZone(s).get('p')!.map((c) => c.id)).toEqual(['a', 'b', 'x']);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/engine/core/scene.test.ts`
Expected: FAIL — received order `['x', 'a', 'b']`.

- [ ] **Step 3: Replace `cardsByZone` with the zone-local version**

In `src/engine/core/scene.ts`, replace the whole `cardsByZone` function with:

```ts
export function cardsByZone(scene: Scene): Map<string, CardState[]> {
  const groups = new Map<string, { card: CardState; local: number }[]>();
  for (const card of scene.cards) {
    const list = groups.get(card.zoneId) ?? [];
    list.push({ card, local: list.length });
    groups.set(card.zoneId, list);
  }
  const out = new Map<string, CardState[]>();
  for (const [zoneId, list] of groups) {
    list.sort((a, b) => {
      const sa = a.card.slot ?? a.local;
      const sb = b.card.slot ?? b.local;
      return sa - sb || a.local - b.local;
    });
    out.set(zoneId, list.map((e) => e.card));
  }
  return out;
}
```

- [ ] **Step 4: Run the full suite to verify it passes and nothing regressed**

Run: `bun run test`
Expected: PASS (the existing `cardsByZone` test `['b', 'a', 'c']` still passes: slot-less `c` falls back to local index 2, ties still break by insertion order).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/scene.ts src/engine/core/scene.test.ts
git commit -m "fix(core): compare card slots against zone-local order in cardsByZone"
```

---

### Task 2: `insertAtSlot` helper in game-state

**Files:**
- Modify: `src/engine/core/game-state.ts` (append after `zoneCards`/`cardById`)
- Test: `src/engine/core/game-state.test.ts`

**Interfaces:**
- Consumes: `zoneCards`, `cardById` (same file), Task 1's zone-local ordering.
- Produces: `insertAtSlot(state: GameState, cardId: string, zoneId: string, slot: number): GameState` — moves `cardId` into `zoneId` at position `slot` (clamped), renormalizes every card in that zone to `slot: 0..n-1`, preserves object identity of cards whose `zoneId`+`slot` didn't change, returns `state` unchanged if the card doesn't exist. Tasks 3-4 call this.

- [ ] **Step 1: Write the failing tests**

In `src/engine/core/game-state.test.ts`, add `insertAtSlot` to the import from `'./game-state'`, then append:

```ts
describe('insertAtSlot', () => {
  const hand = ['a', 'b', 'c', 'd', 'e'];
  const s = base(hand.map((id, i) => card(id, 'h', { slot: i })));

  it('moves a card right and renormalizes slots to 0..n-1', () => {
    const out = insertAtSlot(s, 'a', 'h', 3);
    expect(zoneCards(out, 'h').map((c) => c.id)).toEqual(['b', 'c', 'd', 'a', 'e']);
    expect(zoneCards(out, 'h').map((c) => c.slot)).toEqual([0, 1, 2, 3, 4]);
  });

  it('moves a card left', () => {
    const out = insertAtSlot(s, 'e', 'h', 1);
    expect(zoneCards(out, 'h').map((c) => c.id)).toEqual(['a', 'e', 'b', 'c', 'd']);
  });

  it('assigns slots to previously slot-less cards', () => {
    const noSlots = base(hand.map((id) => card(id, 'h')));
    const out = insertAtSlot(noSlots, 'a', 'h', 2);
    expect(zoneCards(out, 'h').map((c) => c.id)).toEqual(['b', 'c', 'a', 'd', 'e']);
    expect(zoneCards(out, 'h').every((c) => typeof c.slot === 'number')).toBe(true);
  });

  it('moves a card in from another zone at the given position', () => {
    const s2 = base([...hand.map((id, i) => card(id, 'h', { slot: i })), card('x', 'deck')]);
    const out = insertAtSlot(s2, 'x', 'h', 1);
    expect(zoneCards(out, 'h').map((c) => c.id)).toEqual(['a', 'x', 'b', 'c', 'd', 'e']);
    expect(cardById(out, 'x')!.zoneId).toBe('h');
    expect(zoneCards(out, 'deck')).toHaveLength(0);
  });

  it('clamps out-of-range slots', () => {
    expect(zoneCards(insertAtSlot(s, 'a', 'h', 99), 'h').map((c) => c.id)).toEqual(['b', 'c', 'd', 'e', 'a']);
    expect(zoneCards(insertAtSlot(s, 'e', 'h', -1), 'h').map((c) => c.id)).toEqual(['e', 'a', 'b', 'c', 'd']);
  });

  it('keeps object identity for cards whose slot did not change', () => {
    const out = insertAtSlot(s, 'e', 'h', 1);
    expect(out.cards.find((c) => c.id === 'a')).toBe(s.cards.find((c) => c.id === 'a'));
    expect(out.cards.find((c) => c.id === 'b')).not.toBe(s.cards.find((c) => c.id === 'b'));
  });

  it('returns the state unchanged for an unknown card', () => {
    expect(insertAtSlot(s, 'zz', 'h', 0)).toBe(s);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/engine/core/game-state.test.ts`
Expected: FAIL — `insertAtSlot` is not exported.

- [ ] **Step 3: Implement `insertAtSlot`**

Append to `src/engine/core/game-state.ts`:

```ts
/**
 * Move `cardId` into `zoneId` at position `slot` (clamped), renormalizing every
 * card in that zone to slot 0..n-1. Cards whose zone+slot are unchanged keep
 * object identity so diff/choreography see no phantom changes.
 */
export function insertAtSlot(state: GameState, cardId: string, zoneId: string, slot: number): GameState {
  const moved = cardById(state, cardId);
  if (!moved) return state;
  const rest = zoneCards(state, zoneId).filter((c) => c.id !== cardId);
  const at = Math.max(0, Math.min(slot, rest.length));
  const ordered = [...rest.slice(0, at), moved, ...rest.slice(at)];
  const slotById = new Map(ordered.map((c, i) => [c.id, i] as const));
  return {
    ...state,
    cards: state.cards.map((c) => {
      const s = slotById.get(c.id);
      if (s === undefined) return c;
      return c.zoneId === zoneId && c.slot === s ? c : { ...c, zoneId, slot: s };
    }),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run src/engine/core/game-state.test.ts`
Expected: PASS (all, including pre-existing tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/game-state.ts src/engine/core/game-state.test.ts
git commit -m "feat(core): insertAtSlot — slot insertion with zone renormalization"
```

---

### Task 3: Core `reorder` move

**Files:**
- Modify: `src/engine/core/moves-library.ts` (new handler + register)
- Test: `src/engine/core/moves-library.test.ts`

**Interfaces:**
- Consumes: `insertAtSlot` from `./game-state` (Task 2).
- Produces: core move `{ type: 'reorder', cardId: string, slot: number, by?: string }`, registered by `registerCoreMoves`. Legal: card exists, its current zone has `ordering: 'free'`, and if `by` is present it matches the zone's non-shared `owner`. **No turn check.** Apply: `insertAtSlot` on the card's current zone. Tasks 5-6 dispatch/send this move.

- [ ] **Step 1: Write the failing tests**

In `src/engine/core/moves-library.test.ts`:

1. Add a free-ordered owned zone to the shared `tableDef` zones array:

```ts
    { id: 'fan', layout: 'fan', transform: { x: 0, y: 600 }, owner: 'p1', visibility: 'owner', ordering: 'free' },
```

2. Add `GameState` usage is already imported (`import { zoneCards, type GameState } from './game-state';`). Append a new describe block:

```ts
describe('reorder', () => {
  const h = registry.get('reorder')!;
  const fanState = state(['a', 'b', 'c', 'd', 'e'].map((id, i) => card(id, 'fan', { slot: i })));

  it('is legal in a free-ordered zone and renormalizes the order', () => {
    const m = { type: 'reorder', cardId: 'a', slot: 3 };
    expect(h.legal(fanState, m, ctx)).toBe(true);
    const out = h.apply(fanState, m, ctx);
    expect(zoneCards(out, 'fan').map((c) => c.id)).toEqual(['b', 'c', 'd', 'a', 'e']);
    expect(zoneCards(out, 'fan').map((c) => c.slot)).toEqual([0, 1, 2, 3, 4]);
  });

  it('clamps an out-of-range slot', () => {
    const out = h.apply(fanState, { type: 'reorder', cardId: 'a', slot: 99 }, ctx);
    expect(zoneCards(out, 'fan').map((c) => c.id)).toEqual(['b', 'c', 'd', 'e', 'a']);
  });

  it('rejects a zone that is not free-ordered', () => {
    const s = state([card('a', 'deck')]);
    expect(h.legal(s, { type: 'reorder', cardId: 'a', slot: 0 }, ctx)).toBeTypeOf('string');
  });

  it('enforces zone ownership when `by` is present', () => {
    expect(h.legal(fanState, { type: 'reorder', cardId: 'a', slot: 0, by: 'p2' }, ctx)).toBeTypeOf('string');
    expect(h.legal(fanState, { type: 'reorder', cardId: 'a', slot: 0, by: 'p1' }, ctx)).toBe(true);
  });

  it('is not turn-gated (legal off-turn)', () => {
    const offTurn: GameState = { ...fanState, turn: { current: 'p2' } };
    expect(h.legal(offTurn, { type: 'reorder', cardId: 'a', slot: 0, by: 'p1' }, ctx)).toBe(true);
  });

  it('rejects an unknown card', () => {
    expect(h.legal(fanState, { type: 'reorder', cardId: 'zz', slot: 0 }, ctx)).toBeTypeOf('string');
  });

  it('is a harmless no-op in a single-card zone', () => {
    const s = state([card('a', 'fan')]);
    const out = h.apply(s, { type: 'reorder', cardId: 'a', slot: 5 }, ctx);
    expect(zoneCards(out, 'fan').map((c) => c.id)).toEqual(['a']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/engine/core/moves-library.test.ts`
Expected: FAIL — `registry.get('reorder')` is undefined (`h.legal` throws on undefined).

- [ ] **Step 3: Implement the handler**

In `src/engine/core/moves-library.ts`:

1. Extend the game-state import:

```ts
import { cardById, insertAtSlot, zoneCards, type GameState } from './game-state';
```

2. Add the handler after `move`:

```ts
/** Reposition a card within its current free-ordered zone. Owner-checked, never turn-gated. */
const reorder: MoveHandler = {
  legal(state, m, ctx) {
    const cardId = m.cardId as string;
    const by = m.by as string | undefined;
    const card = cardById(state, cardId);
    if (!card) return `unknown card: ${cardId}`;
    const zone = zoneById(ctx, card.zoneId);
    if (!zone) return `unknown zone: ${card.zoneId}`;
    if ((zone.ordering ?? 'stack') !== 'free') return `zone ${zone.id} is not reorderable`;
    if (by !== undefined && zone.owner !== undefined && zone.owner !== 'shared' && zone.owner !== by) {
      return `zone ${zone.id} is not owned by ${by}`;
    }
    return true;
  },
  apply(state, m) {
    const card = cardById(state, m.cardId as string);
    if (!card) return state;
    return insertAtSlot(state, card.id, card.zoneId, m.slot as number);
  },
};
```

3. Register it in `registerCoreMoves`:

```ts
export function registerCoreMoves(registry: MoveRegistry): MoveRegistry {
  return registry
    .register('move', move)
    .register('reorder', reorder)
    .register('flip', flip)
    .register('deal', deal)
    .register('shuffle', shuffle);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run src/engine/core/moves-library.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/moves-library.ts src/engine/core/moves-library.test.ts
git commit -m "feat(core): reorder move — reposition a card within a free-ordered zone"
```

---

### Task 4: `move` inserts at slot in free-ordered zones

**Files:**
- Modify: `src/engine/core/moves-library.ts:27-34` (`move.apply`)
- Test: `src/engine/core/moves-library.test.ts`

**Interfaces:**
- Consumes: `insertAtSlot` (Task 2), the `fan` test zone (Task 3).
- Produces: `move` with a `slot` into an `ordering: 'free'` zone now inserts + renormalizes the whole destination zone; all other moves keep today's behavior (raw slot write / plain zone change).

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe('move', ...)` block in `src/engine/core/moves-library.test.ts`:

```ts
  it('inserts at the drop slot in a free-ordered zone and renormalizes', () => {
    const s = state([card('a', 'fan', { slot: 0 }), card('b', 'fan', { slot: 1 }), card('x', 'deck')]);
    const out = h.apply(s, { type: 'move', cardId: 'x', toZone: 'fan', slot: 1 }, ctx);
    expect(zoneCards(out, 'fan').map((c) => c.id)).toEqual(['a', 'x', 'b']);
    expect(zoneCards(out, 'fan').map((c) => c.slot)).toEqual([0, 1, 2]);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/engine/core/moves-library.test.ts`
Expected: FAIL — `x` gets raw `slot: 1` while `b` keeps `slot: 1`; order/slots don't match.

- [ ] **Step 3: Route free-zone moves through `insertAtSlot`**

Replace `move.apply` in `src/engine/core/moves-library.ts` with:

```ts
  apply(state, m, ctx) {
    const cardId = m.cardId as string;
    const toZone = m.toZone as string;
    const slot = m.slot as number | undefined;
    const zone = zoneById(ctx, toZone);
    if (slot !== undefined && (zone?.ordering ?? 'stack') === 'free') {
      return insertAtSlot(state, cardId, toZone, slot);
    }
    return mapCards(state, (c) =>
      c.id === cardId ? { ...c, zoneId: toZone, ...(slot !== undefined ? { slot } : {}) } : c,
    );
  },
```

- [ ] **Step 4: Run the full suite**

Run: `bun run test`
Expected: PASS — the existing `'sets slot when provided'` test still passes because `hand` has no `ordering` (defaults to `'stack'`, raw path).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/moves-library.ts src/engine/core/moves-library.test.ts
git commit -m "feat(core): move inserts at drop slot in free-ordered zones"
```

---

### Task 5: Table-demo wiring (same-zone drop → reorder)

**Files:**
- Modify: `src/pages/table-demo/table-demo-page.tsx:49-52` (`onDrop`)
- Test: `src/pages/table-demo/table-demo.test.ts`

**Interfaces:**
- Consumes: `reorder` move (Task 3); `DropIntent` already carries `fromZoneId`/`toZoneId`/`slot`.
- Produces: demo-level behavior only.

- [ ] **Step 1: Write the failing engine-level test**

Append inside `describe('demo engine', ...)` in `src/pages/table-demo/table-demo.test.ts`:

```ts
  it('reorders the hand and undoes it', () => {
    const e = build();
    e.dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand', count: 3 });
    const [c0, c1, c2] = zoneCards(e.getState(), 'hand').map((c) => c.id);
    const r = e.dispatch({ type: 'reorder', cardId: c0, slot: 2 });
    expect(r.ok).toBe(true);
    expect(zoneCards(e.getState(), 'hand').map((c) => c.id)).toEqual([c1, c2, c0]);
    e.undo();
    expect(zoneCards(e.getState(), 'hand').map((c) => c.id)).toEqual([c0, c1, c2]);
  });
```

- [ ] **Step 2: Run test to verify current behavior**

Run: `bunx vitest run src/pages/table-demo/table-demo.test.ts`
Expected: PASS already if Tasks 1-3 are done (this is an integration lock-in test; if it fails, Tasks 1-3 are incomplete — stop and fix there).

- [ ] **Step 3: Branch `onDrop` in the demo page**

In `src/pages/table-demo/table-demo-page.tsx`, replace `onDrop` with:

```ts
  const onDrop = (i: DropIntent) => {
    if (!i.toZoneId) return; // rejected → snaps back automatically
    if (i.toZoneId === i.fromZoneId) {
      dispatch({ type: 'reorder', cardId: i.cardId, slot: i.slot });
      return;
    }
    dispatch({ type: 'move', cardId: i.cardId, toZone: i.toZoneId, slot: i.slot });
  };
```

- [ ] **Step 4: Verify suite + typecheck**

Run: `bun run test && bun run typecheck`
Expected: PASS / no type errors.

- [ ] **Step 5: Manual smoke check (dev server)**

Run: `bun run dev`, open the table demo, deal 5, drag a hand card sideways within the fan.
Expected: the hand reorders (other cards shift aside); Undo restores the previous order; dragging deck→hand still inserts at the drop position.

- [ ] **Step 6: Commit**

```bash
git add src/pages/table-demo/table-demo-page.tsx src/pages/table-demo/table-demo.test.ts
git commit -m "feat(table-demo): same-zone drag dispatches reorder"
```

---

### Task 6: Net-demo wiring + off-turn/ownership tests

**Files:**
- Modify: `src/pages/net-demo/net-demo-page.tsx:22-25` (`submit` in `useSeat`)
- Test: `src/pages/net-demo/net-demo.test.ts`

**Interfaces:**
- Consumes: `reorder` move (Task 3). `GameServer.submit` already stamps `by` with the seat (`src/engine/net/game-server.ts:26`), which drives the ownership check — no server changes.
- Produces: demo-level behavior only.

- [ ] **Step 1: Write the failing tests**

Append inside `describe('net-demo', ...)` in `src/pages/net-demo/net-demo.test.ts`:

```ts
  it('lets a seat reorder its own hand off-turn', () => {
    const server = createDemoServer(); // turn starts at 'me'
    const before = server.viewFor('opp').scene.cards.filter((c) => c.zoneId === 'hand-opp').map((c) => c.id);
    const r = server.submit('opp', { type: 'reorder', cardId: before[0], slot: 2 });
    expect(r.ok).toBe(true);
    const after = server.viewFor('opp').scene.cards
      .filter((c) => c.zoneId === 'hand-opp')
      .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
      .map((c) => c.id);
    expect(after).toEqual([before[1], before[2], before[0]]);
  });

  it("rejects reordering another seat's hand", () => {
    const server = createDemoServer();
    const meCard = server.viewFor('me').scene.cards.find((c) => c.zoneId === 'hand-me')!;
    const r = server.submit('opp', { type: 'reorder', cardId: meCard.id, slot: 0 });
    expect(r.ok).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify expectations**

Run: `bunx vitest run src/pages/net-demo/net-demo.test.ts`
Expected: both new tests PASS if Tasks 1-3 are done (integration lock-in; the ownership rejection exercises the server's `by` stamping end to end). If either fails, fix in core — not here.

- [ ] **Step 3: Branch `submit` in the net demo page**

In `src/pages/net-demo/net-demo-page.tsx`, replace `submit` with:

```ts
  const submit = (i: DropIntent) => {
    if (!i.toZoneId) return;
    if (i.toZoneId === i.fromZoneId) {
      chan.current?.send({ type: 'move', move: { type: 'reorder', cardId: i.cardId, slot: i.slot } });
      return;
    }
    chan.current?.send({ type: 'move', move: { type: 'play', cardId: i.cardId, toZone: i.toZoneId, slot: i.slot } });
  };
```

- [ ] **Step 4: Full verification**

Run: `bun run test && bun run typecheck`
Expected: PASS / no type errors.

- [ ] **Step 5: Manual smoke check (dev server)**

Run: `bun run dev`, open the net demo, drag a card within seat `opp`'s own hand while it is `me`'s turn.
Expected: the reorder applies (visible in opp's fan; opponent seat sees face-down cards shift); dragging a hand card to `discard` off-turn is still rejected (snaps back).

- [ ] **Step 6: Commit**

```bash
git add src/pages/net-demo/net-demo-page.tsx src/pages/net-demo/net-demo.test.ts
git commit -m "feat(net-demo): same-zone drag sends reorder (off-turn, owner-checked)"
```
