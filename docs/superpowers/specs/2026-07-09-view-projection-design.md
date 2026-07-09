# Per-Player View Projection — Design

**Status:** Approved (design), pending implementation plan.
**Sub-project:** 3 of 4 in the turnhout multiplayer card-toolkit roadmap.
**Date:** 2026-07-09.
**Builds on:** SP1 (semantic zones) + SP2 (game-state engine), both merged to `main`.

## Context

SP1 gave zones a `visibility` field (`public`/`owner`/`secret`) and cards a
`revealTo` override, but `deriveScene(def, placement, viewer?)` shipped as the
**omniscient identity** — it ignored `viewer` and showed everything. SP2 added the
authoritative `GameState` whose `cards` feed `deriveScene`.

SP3 fills in `deriveScene` to perform **real per-player projection**: given the
table, the placement, and a viewer, produce the `Scene` that viewer is allowed to
see — hiding the faces (and identity data) of cards they may not see. This is the
hidden-information heart of multiplayer card games; SP4 will run it server-side
and send each client only their projection.

### Roadmap position

| # | Sub-project | Status |
|---|---|---|
| 1 | Semantic zone model + serializable table schema | ✅ shipped |
| 2 | Authoritative game-state + move engine | ✅ shipped |
| **3** | **Per-player view projection** (this spec) | Real `deriveScene(state, viewer)` enforcing zone `visibility` + `revealTo`. |
| 4 | Networking / authority / sync | Server runs projection; sends per-viewer logs/diffs. |

### Decisions taken during brainstorming

1. **faceUp reveals to all.** A card with authoritative `faceUp === true`
   (physically turned up on the table) is visible to every viewer regardless of
   zone visibility. Zone visibility governs only face-down cards.
2. **Keep real ids.** Hidden cards keep their true `id` (only identity is
   scrubbed). The renderer's `TableModel` keys on `id` to animate cards, so an
   opponent's card still animates as it moves. Id anonymization is deferred (SP4).
3. **Projected `faceUp` = `isRevealed`** (for a named viewer). Because `faceUp`
   drives which texture renders, a per-viewer scene must render a card face-up iff
   that viewer may see its face — this is what lets an owner see their own
   face-down hand while opponents see backs.
4. **`undefined` viewer = identity** (omniscient / god view), preserving SP1/SP2
   behavior and backward compatibility.

## Architecture

### Reveal predicate

For a **named** viewer (the `undefined` case is handled separately, below):

```ts
// zone = def.zones.find(z => z.id === card.zoneId); visibility defaults to 'public'
function isRevealed(card: CardState, zone: ZoneDef | undefined, viewer: PlayerId): boolean {
  return (
    card.faceUp === true                                          // turned up on the table → all see
    || (zone?.visibility ?? 'public') === 'public'               // public zone (also the default)
    || (zone?.visibility === 'owner' && zone.owner === viewer)   // your own owned zone (e.g. hand)
    || card.revealTo === 'all'
    || (Array.isArray(card.revealTo) && card.revealTo.includes(viewer))
  );
}
```

Notes:
- Unmarked visibility defaults to `'public'` (matches SP1). A card in a zone not
  found in `def` is treated as public (visible) — consistent with the default.
- `'secret'` face-down cards are revealed only via `faceUp` or `revealTo`.
- `zone.owner === 'shared'` never matches a viewer (players are real ids), so a
  `visibility:'owner'` zone owned by `'shared'` reveals to nobody by owner — an
  odd combination the author is responsible for avoiding.

### Card projection

```ts
export const HIDDEN_FACE_KEY = 'back';   // reuses the renderer's back texture (pixi-table.ts:45)

function projectCard(card: CardState, zone: ZoneDef | undefined, viewer: PlayerId): CardState {
  if (isRevealed(card, zone, viewer)) {
    return { ...card, faceUp: true };                 // may see it → render the face
  }
  return {
    ...card,                                          // id, zoneId, slot, draggable preserved
    faceUp: false,                                    // → renders the back
    faceKey: HIDDEN_FACE_KEY,                         // identity scrubbed
    data: keepPositionalOnly(card.data),              // keep only x/y; drop suit/rank/tags/etc.
  };
}
```

`keepPositionalOnly(data)`: returns `undefined` if `data` is undefined; otherwise
a new object containing only the numeric `x`/`y` keys that the `free` layout reads
(`layout.ts`), dropping every other key so identity-bearing fields (e.g.
`suit`/`rank`/`tags`) never reach a client that shouldn't see them.

Rationale for scrubbing `data`: without it, a client could recover a hidden card's
identity from `card.data.suit`/`rank` despite the masked `faceKey`. Positional
`x`/`y` are safe (a viewer already sees *where* the card is) and are needed to
render the back in the right place for `free`-layout zones.

### deriveScene

```ts
export function deriveScene(def: TableDef, placement: Placement, viewer?: PlayerId): Scene {
  const zones = def.zones.map((z) => ({ id: z.id, layout: z.layout, transform: z.transform, layoutOptions: z.layoutOptions }));
  if (viewer === undefined) {
    return { zones, cards: placement.cards };         // identity (omniscient) — unchanged from SP1
  }
  const zoneById = new Map(def.zones.map((z) => [z.id, z]));
  const cards = placement.cards.map((c) => projectCard(c, zoneById.get(c.zoneId), viewer));
  return { zones, cards };
}
```

- Zones are always projected (a viewer still sees the *area* of an opponent's hand
  and the deck pile; only card faces/identity are hidden). Card **count** in a
  secret zone stays visible.
- Pure function of `(def, placement, viewer)` — no RNG, no mutation of the input
  placement (all new objects). Lives in `core/` (no pixi/react/DOM).
- The signature is unchanged from SP1; only the body changes. SP2's `GameState`
  API is untouched — callers pass `{ cards: state.cards }` as today.

### Exports

`derive-scene.ts` additionally exports `isRevealed`, `projectCard`, and
`HIDDEN_FACE_KEY` for testing and reuse (SP4 server-side projection).

## Wiring (render-only; drop pipeline unchanged)

The viewer must flow from the React consumer into the existing `deriveScene` call
inside `init-app`'s `setTable`:

- `CardTableProps` gains `viewer?: PlayerId`.
- `AppComponents.setTable(def, placement, viewer?)`.
- `card-table.tsx` passes `props.viewer`; its effect re-derives when `viewer`
  changes (add `viewer` to the effect deps).
- `init-app`'s `setTable` stores/uses `viewer` and calls
  `pixiTable.setScene(deriveScene(def, placement, viewer))`.

The input/drop pipeline is untouched: it resolves drops against the authoritative
`currentCards`/zones, not the projected scene. **Drag/move authority by seat**
(should an opponent be able to grab your hidden card?) is out of scope — projection
is render-only in SP3; move legality by seat is a game-rule/SP4 concern.

## Demo (the showcase)

The table-demo is updated to visibly prove projection:

- `TABLE.players = ['me', 'opp']` (hand stays `owner:'me'`, `visibility:'owner'`).
- Deal the hand **face-down** (`deal` with `faceUp:false` — or omit `faceUp`) so
  the hand is hidden-to-table but owner-visible. (Dealing face-up would reveal to
  all, defeating the demo.)
- A **"View as: me / opp / table"** toggle button sets a `viewer` state
  (`'me'` | `'opp'` | `undefined`) passed to `<CardTable viewer={...} />`:
  - *me* → hand shows faces (owner-revealed); deck shows backs.
  - *opp* → hand shows **backs** (hidden); deck shows backs.
  - *table* → god view (identity, everything as stored).
- Click-to-flip now means "turn a card face-up on the table" (reveals to all —
  visible in the *opp* view as a back→face flip animation via the preserved id).
- Default viewer is `'me'`.

Note: because dealing is face-down, the demo's earlier "cards land face-up in hand
on drop" follow-up flip is dropped; dropping into the hand leaves the card
face-down (owner still sees it via projection).

## Components (units & interfaces)

| Unit | File | Responsibility |
|---|---|---|
| Projection | `src/engine/core/derive-scene.ts` (rewrite) | `deriveScene` (real body), `isRevealed`, `projectCard`, `HIDDEN_FACE_KEY`, `keepPositionalOnly`. |
| App wiring | `src/utils/init-app.ts` (changed) | `setTable(def, placement, viewer?)` threads viewer into `deriveScene`. |
| App type | `src/app-components.ts` (changed) | `setTable` signature gains `viewer?`. |
| React prop | `src/engine/react/types.ts` (changed) | `CardTableProps.viewer?`. |
| React bridge | `src/engine/react/card-table.tsx` (changed) | pass `viewer`; effect deps include it. |
| Demo | `src/pages/table-demo/table-demo-page.tsx` (changed) | face-down deal, `players`, View-as toggle. |
| Tests | `src/engine/core/derive-scene.test.ts` (rewrite) | reveal/projection tests (below). |

## Testing

Pure-core units, `vitest`, deterministic:

- **`isRevealed`:** faceUp→revealed for any viewer; `public` (and default)→revealed;
  `owner` revealed to the owner only, hidden from others; `secret` face-down hidden;
  `revealTo:'all'` and `revealTo:[viewer]` reveal; unknown zone treated as public.
- **`deriveScene` identity:** `viewer === undefined` returns cards unchanged
  (authoritative `faceUp` preserved), zones mapped (existing SP1 test retained).
- **`deriveScene` projection:** for `viewer='me'`, an owner's face-down hand card
  is rendered `faceUp:true` with identity intact; for `viewer='opp'`, the same card
  is masked — `faceUp:false`, `faceKey:'back'`, `data.suit`/`rank` removed, but
  `id`, `slot`, and `data.x`/`data.y` preserved; a `public` discard card is visible
  to both; a `secret` face-down deck card is masked for everyone.
- **Purity:** projection does not mutate the input `placement`/cards (originals
  unchanged after a call).
- **`keepPositionalOnly`:** drops non-positional keys, keeps `x`/`y`, returns
  `undefined` for undefined input.
- **Demo/wiring:** a controller browser check of the View-as toggle (me shows hand,
  opp hides it).

## Out of scope (deferred to SP4)

- Full `GameState` projection for what the *server sends* (scrubbing `rng`, redacting
  secret entries in `state.data`, projecting `turn`) — SP3 projects only the render
  `Scene`.
- Drag/move authority by seat (an opponent grabbing a hidden card).
- Id anonymization / anti-tracking of hidden cards across zones.
- Hanabi-style inversions (you see others' hands but not your own) — would need a
  per-card-per-viewer model beyond `revealTo`.
