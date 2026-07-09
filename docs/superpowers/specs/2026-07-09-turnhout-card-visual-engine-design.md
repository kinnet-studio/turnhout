# turnhout — Card/Board Visual Engine

**Status:** Design approved · **Date:** 2026-07-09

## 1. Summary

`turnhout` is a standalone repository providing a **visual engine for card/board
games** built on top of the ue-too PixiJS + React integration. Its
responsibility is **rendering and interaction only** — drawing cards, tokens,
and zones on a fixed table; animating them; and reporting user interactions.
It contains **no game rules**: no turns, legal-move validation, or win
conditions. The consuming game owns all authoritative state; the engine is a
pure view over that state.

### Scope

**In scope**

- Rendering cards and zones on a fixed (fit-to-play-area) table via PixiJS.
- A declarative/retained API: the game hands the engine a scene state; the
  engine diffs it and animates cards to their targets.
- Four interactions: drag & drop to zones (with snap), hover raise/peek,
  flip (face up/down), and deal/shuffle flourishes.
- A pluggable card-face renderer (texture or programmatic drawing).

**Out of scope**

- Game rules of any kind (turn order, legality, scoring, win conditions).
- Networking / multiplayer sync.
- Free camera pan/zoom (the table is fixed; see §7).
- Renderer abstraction for non-Pixi backends (Pixi is committed; YAGNI).

## 2. Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Responsibility | Pure rendering + interaction | Game rules live in the consuming app. |
| Rendering backend | PixiJS 8.14.0 | Texture- and animation-heavy card work; matches ue-too integration. |
| Integration | `@ue-too/board-pixi-react-integration` (npm) | Proven by the `azabu` app on the same stack. |
| Repo model | Standalone repo, npm deps (Option 1) | turnhout is "a separate thing"; the packages are published. |
| API model | Declarative/retained + intents + imperative flourishes | Scene state is source of truth; interactions report intents; choreography needs an imperative trigger. |
| React↔Pixi bridge | Custom reconciler (Approach A) | Fits animation-heavy interactions and the board's `Application` ownership; pure core is unit-testable. |
| Input | **Custom KMT stack (azabu style)** — Pixi event federation destroyed | House-style parity with azabu; all input through extended KMT/touch parsers + state machines. |
| Camera | Fixed table (fit + lock) | Most card games; card drag owns the pointer. |
| Card faces | Pluggable renderer (texture or programmatic) | Engine stays art-agnostic. |

## 3. Dependency & toolchain baseline

Mirror the `azabu` app (a standalone Vite + React 19 app on this exact stack).

```jsonc
// package.json (dependencies, pinned to a common ue-too release)
"@ue-too/being": "0.17.6",
"@ue-too/board": "0.17.6",
"@ue-too/board-pixi-integration": "0.17.6",
"@ue-too/board-pixi-react-integration": "0.17.6",
"@ue-too/math": "0.17.6",
"pixi.js": "8.14.0",          // exact — peer dep of the integration
"react": "19.2.x",
"react-dom": "19.2.x"
```

- Build/dev: **Vite**; package manager **bun**.
- Tests: **vitest** for the pure core; **happy-dom** + `@testing-library/react`
  for the thin adapter/bridge smoke tests (azabu parity).
- Co-development escape hatch: if the ue-too integration must change while
  building turnhout, use a local `overrides` / `npm link` / `file:` pointer at
  `/Users/vincent.yy.chang/dev/ue-too/main/packages/board-pixi-react-integration`.
  Default is to consume the published npm version.

## 4. Architecture

Three layers. Inner layers are pure and testable; outer layers touch Pixi/React.

```
┌─ react/   CardTable component, useImperativeHandle, page glue (useApp)
├─ pixi/    CardSprite, PixiTable (Container view), FaceTextureCache
├─ input/   TableInputTracker, card KMT state machine, TableKmtParser (KMT stack)
└─ core/    scene · layout · diff · hittest · tween · choreography  (PURE)
```

**Invariant:** `core/` never imports Pixi, React, or the DOM. It answers "where
should each card rest?", "what changed between two scenes?", and "which card /
zone is at this world point?" as plain data. The Pixi/input layers execute
those answers.

### Bridge model (Approach A, azabu-aligned)

The reconciler lives **inside the Pixi view**, not in React (azabu's house
style: domain model + a `Container` subclass view are plain classes created in
`initApp` and added to `app.stage`; React reaches them via `useApp()`):

- `PixiTable extends Container` owns `setScene(scene)`, which runs
  `core/diff` → `core/layout` → sprite create/update/destroy → assigns each
  card a **target transform**. It also runs the per-tick tween loop.
- The React `<CardTable>` is a thin bridge: on a `scene` prop change it calls
  `app.pixiTable.setScene(scene)`; it subscribes to interaction intents and
  fires the consumer's callbacks; and `useImperativeHandle` exposes flourishes
  (`deal`, `shuffle`) that call into `pixiTable`.

### Per-frame data flow

```
React state (scene)
   → <CardTable> effect → pixiTable.setScene(scene)
      → core/diff(prev, next) → ops (add/remove/update/reface/flip)
      → core/layout(zone, cards) → target transform per card
      → adapter creates/destroys CardSprites, stores targets
app.ticker tick:
   → core/tween advances each card's CURRENT transform toward its TARGET
     (a card owned by an active drag is exempt)
   → CardSprites redraw
(board integration independently syncs app.stage transform to the fitted camera)
```

## 5. Data model (the declarative scene)

```ts
interface Scene {
  cards: CardState[];
  zones: ZoneState[];
}

interface CardState {
  id: string;              // stable identity → drives the diff
  zoneId: string;          // which zone it lives in
  faceUp: boolean;         // engine animates a flip when this changes
  faceKey: string;         // cache key for renderFace (e.g. "AS", "back")
  slot?: number;           // optional explicit order within the zone
  draggable?: boolean;     // default true
  data?: unknown;          // opaque passthrough for renderFace / free layout
}

interface ZoneState {
  id: string;
  layout: 'pile' | 'fan' | 'row' | 'grid' | 'free';
  transform: { x: number; y: number; rotation?: number };  // anchor on the table
  layoutOptions?: {
    spacing?: number; fanAngle?: number; cols?: number; jitter?: number;
    faceUpByDefault?: boolean; /* strategy-specific */
  };
  accepts?: (card: CardState) => boolean;  // view-level drop filter (highlight/snap only)
}
```

Principles:

- **Identity is `id`.** Moving a card between zones = same `id`, new `zoneId`;
  the diff sees a move and the engine tweens it across the table.
- **`faceUp` is declarative.** Flip is *not* an imperative call. Toggle
  `faceUp` in state; the engine plays the flip on the transition. Click-to-flip
  = the consumer handles `onCardClick` and toggles `faceUp`.
- **Resting position is computed, never given** (except `layout: 'free'`, where
  `data` supplies x/y). The scene describes *membership + layout*; layout
  functions place the cards.
- **`accepts` is a view-level filter only** (drop highlight/snap). The engine
  still only emits an intent; the consumer's rules decide validity.

## 6. Modules

| Module | Responsibility | Pure? |
|---|---|---|
| `core/scene` | Types + validation (duplicate ids, unknown `zoneId`) | ✅ |
| `core/layout` | `computeLayout(zone, cards) → Map<id, TargetTransform>`, one fn per strategy | ✅ |
| `core/diff` | `reconcile(prev, next) → Op[]` (add/remove/update/reface/flip/move) | ✅ |
| `core/hittest` | `cardAtPoint(worldPt, cards) → id \| null` (topmost by z); `zoneAtPoint(worldPt, zones) → {zoneId, slot}` | ✅ |
| `core/tween` | spring/lerp step toward target; flip curve | ✅ |
| `core/choreography` | deal/shuffle → timeline of keyframed targets | ✅ |
| `pixi/card-sprite` | `CardSprite extends Container` (shadow + face + back), applies a transform | ❌ |
| `pixi/pixi-table` | `PixiTable extends Container` — holds `Map<id, CardSprite>`, `setScene`, ticker tween loop | ❌ |
| `pixi/face-texture-cache` | `renderFace(card) → Texture`, memoized by `faceKey` | ❌ |
| `input/table-input-context` | `TableInputContext` type (extends `KmtInputContext`) | ✅ (type) |
| `input/table-input-tracker` | Implements context; hover/drag state; window→world; emits intents | ❌ |
| `input/table-kmt-state-machine` | `createTableKmtStateMachine` (HOVERING/DRAGGING expansion) | ❌ |
| `input/table-kmt-parser` | `TableKmtParser extends VanillaKMTEventParser` | ❌ |
| `input/table-touch` | Touch parser expansion (one-finger drag) | ❌ |
| `react/card-table` | `<CardTable>` bridge + `useImperativeHandle` | ❌ |
| `react/types` | Public prop / callback / handle types | ✅ (types) |

## 7. Interaction & input (custom KMT stack — azabu parity)

turnhout **destroys Pixi's event federation** (`app.renderer.events.destroy()`)
and routes all input through the ue-too KMT system, exactly like azabu. It does
**not** use Pixi `eventMode`/federated pointer events.

Building blocks: `@ue-too/being` FSM primitives (`State`, `StateMachine`,
`TemplateState`) and `@ue-too/board`'s KMT system (`KmtInputContext`,
`KmtInputStates`, `VanillaKMTEventParser`, `InputOrchestrator`, and the
canonical window→world converters `convertFromWindow2Canvas` +
`convertFromCanvas2ViewPort`).

Recipe (mirrors azabu's `ExpandedInputTracker` / `KmtInputStateMachineExpansion`
/ `ExtendedKMTEventParser`):

- **`TableInputContext = KmtInputContext & { cardAt(pt), zoneAt(pt),
  beginDrag(cardId, pt), dragTo(pt), endDrag(pt), hoverAt(pt), clickCard(id) }`**
- **Expansion states `HOVERING` / `DRAGGING`** added to base `KmtInputStates`.
  Base pan/zoom states exist but are unused (fixed table).
- **`TableInputTracker`** implements the context: holds hover/drag state,
  converts `clientX/clientY → world` via the board converters + camera,
  hit-tests through `core/hittest`, tells `PixiTable` to raise/ghost the dragged
  card and highlight the hovered drop zone, and **emits intents** — never
  mutates consumer state.
- **`TableKmtParser extends VanillaKMTEventParser`** overrides
  `pointerDown/Move/Up` to drive the card state machine.

### Interaction behaviors

- **Drag & drop:** `pointerdown` on a `draggable` card → interaction "owns" it
  (exempt from reconciliation snap-back), card follows the pointer in world
  coords with z raised. `pointerup` → `core/hittest` finds the zone under the
  drop (respecting `accepts` for highlight/snap) → emit
  `onDrop({ cardId, fromZoneId, toZoneId | null, slot })`. The engine does not
  move the card; the consumer updates `scene`, and reconciliation tweens it
  home. Drop on nothing / rejected → state unchanged → card tweens back to
  origin automatically.
- **Hover raise/peek:** raise/scale the hovered card (fan neighbors in a hand
  zone) on hover-in; restore on hover-out. Transient, no intent (optional
  `onHover` callback).
- **Flip:** declarative via `faceUp`. On a `faceUp` change the diff plays a flip
  (scale-x → 0, swap face texture at the midpoint, → 1).
- **Deal / shuffle flourishes:** imperative via the ref handle.
  `handle.deal({ fromZoneId, toZoneId, order, stagger })` and
  `handle.shuffle(zoneId)` call `core/choreography` to produce a timeline of
  keyframed targets played by the same tween loop; they resolve to the current
  declared scene, so state stays the source of truth.

## 8. Camera (fixed table)

In `initApp`, after `baseInitApp`: tear down the base `kmtParser` /
`touchParser` (no pan/zoom from input), compute the table's world bounds from
the table config, fit the camera to them, and lock `zoomBoundaries` to the fit
level. Refit on `app.renderer` resize. Everything drawn is a child of
`app.stage`, so the board integration's per-tick stage-transform sync keeps the
table correctly placed.

## 9. Project structure (azabu conventions)

```
turnhout/                         # standalone repo — Vite + React 19 + TS + bun
├─ package.json
├─ vite.config.ts
├─ src/
│  ├─ index.tsx                   # AppComponents type + PixiCanvasRegistry augmentation + root render
│  ├─ engine/                     # the reusable card engine (the deliverable)
│  │  ├─ core/  { scene, layout, diff, hittest, tween, choreography }.ts
│  │  ├─ pixi/  { card-sprite, pixi-table, face-texture-cache }.ts
│  │  ├─ input/ { table-input-context, table-input-tracker,
│  │  │           table-kmt-state-machine, table-kmt-parser, table-touch }.ts
│  │  └─ react/ { card-table.tsx, types.ts }
│  ├─ utils/init-app.ts           # initApp(canvas, option)
│  ├─ hooks/use-app.ts            # useApp() → typed AppComponents | null
│  ├─ components/PixiCanvas.tsx    # re-export Wrapper (azabu parity)
│  └─ pages/table-demo/           # demo exercising all four interactions
└─ test/                          # vitest specs for engine/core
```

`src/index.tsx` (azabu pattern):

```ts
export type AppComponents = BaseAppComponents & {
  type: 'table';
  table: Table;               // domain model (plain class)
  pixiTable: PixiTable;       // Container view on app.stage
  inputTracker: TableInputTracker;
};
declare module '@ue-too/board-pixi-react-integration' {
  interface PixiCanvasRegistry { components: AppComponents }
}
```

`useApp()` wraps `usePixiCanvas()` and returns `AppComponents | null` (azabu
parity). The demo page renders the integration `Wrapper` with a **memoized**
`option` (an inline literal re-inits Pixi and freezes the GPU — see azabu's
`GridEditorPage` comment):

```tsx
const option = useMemo(() => ({ fullScreen: true }), []);
return <Wrapper option={option} initFunction={initApp}><TableDemoContent/></Wrapper>;
```

## 10. Public API (consumer surface)

```tsx
<CardTable
  ref={tableRef}                        // handle: { deal, shuffle }
  scene={{ cards, zones }}              // declarative source of truth
  renderFace={(card) => Texture | (ctx) => void}   // pluggable card face
  layouts={customLayoutStrategies?}     // optional layout overrides
  onDrop={(e) => setScene(applyMove(...))}         // intent → you update state
  onCardClick={(id) => toggleFaceUp(id)}
  onHover={(id | null) => ...}          // optional
  animation={{ spring?, flipDuration?, dealStagger? }}
/>
```

`renderFace` returns either a Pixi `Texture` or a draw callback; results are
memoized by `faceKey`. Deal/shuffle: `tableRef.current.deal(...)`,
`tableRef.current.shuffle(zoneId)`.

## 11. Error handling

- Missing/failed `renderFace` texture → placeholder face + console warning.
- Unknown `zoneId` on a card → warn and skip that card (don't throw mid-frame).
- Duplicate card `id` in a scene → validation error (developer bug).
- Drop outside any zone or on a rejecting zone → `onDrop` with
  `toZoneId: null`; consumer leaves state unchanged; card auto-tweens home.

## 12. Testing

- **vitest over `engine/core`** (pure): layout math (fan angles, pile offsets,
  grid slots, row spacing), diff correctness (add/remove/move/reface/flip ops),
  hit-testing (`cardAtPoint` topmost-by-z, `zoneAtPoint` + `accepts` filtering),
  tween/flip curves, and choreography timelines (deal order/stagger).
- **happy-dom smoke tests** for the React bridge and a minimal adapter
  (mount `<CardTable>`, push a scene, assert `setScene` reconciles).
- **Visual/interaction correctness** verified by driving the demo page.

## 13. Demo (first consumer)

A minimal `table-demo` page — a generic 52-card sandbox with a deck, a fanned
hand, and a few piles — exercising all four interactions (drag a card
deck→hand→pile, hover-fan the hand, click-to-flip, deal sweep + shuffle). It is
a harness for the engine, not a full game.

## 14. Open questions / follow-ups

- Exact spring vs. duration-based tween choice (evaluate `@ue-too/animate` fit
  vs. a small hand-rolled spring) — settle during implementation of `core/tween`.
- Touch drag ergonomics (one-finger drag threshold) — refine against the demo.
- Whether the engine is later extracted to its own npm package; for now it
  lives in `src/engine/` importable within turnhout.
