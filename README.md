# turnhout

A rendering-and-interaction engine for **web-based card & board games**, built on the [@ue-too](https://www.npmjs.com/org/ue-too) PixiJS + React integration and driven by a declarative scene.

turnhout renders cards and zones, animates deals/flips/moves, and emits interaction *intents* (`onDrop`, `onCardClick`, `onHover`). It does **not** own your game rules — you describe a table as data, turnhout draws it and tells you what the player did.

> **Status:** actively growing from a card *visual engine* into a full-stack toolkit for card-game development (including multiplayer). See [Roadmap](#roadmap).

## Highlights

- **Declarative & serializable.** A table is plain JSON: a static `TableDef` (zones) plus a dynamic `Placement` (cards). Save it, load it, send it over the wire.
- **Semantic zones.** Zones carry `owner`, `visibility` (`public`/`owner`/`secret`), `capacity`, `ordering`, and serializable accept-rules — enough to express trick-takers, TCGs, solitaire, and hidden-role games.
- **Pluggable rules.** Drop-legality lives in a `RuleRegistry` of named, unit-testable predicates (`descAltColor`, `sameSuitAscending`, `matchRankOrSuit`, `byTag`, `emptyOnly`, …). Reference them by name from a `ZoneDef`.
- **Framework-free core.** All layout, geometry, hit-testing, tweening, and reconciliation live in a pure `core/` with no PixiJS/React/DOM imports and no `Math.random`/`Date.now` — deterministic and testable in isolation.
- **Thin adapters.** `pixi/` renders, `input/` handles pointers (a custom KMT stack), `react/` bridges via `<CardTable>`.

## Architecture

```
Consumer app  ──(TableDef + Placement)──►  turnhout
                                             │
        ┌────────────────────────────────────┼───────────────────────────────┐
        │  core/  (pure, no pixi/react/DOM)   │                               │
        │   scene · table-def · layout · zone-geometry · rules · diff         │
        │   tween · choreography · hittest · derive-scene · table-model       │
        └───────┬───────────────┬───────────────┬───────────────────────────-┘
                │               │               │
            pixi/  (view)   input/ (KMT)    react/ (<CardTable>)
```

**The central idea:** the authoritative table state and what any one viewer *sees* are separate. `deriveScene(tableDef, placement, viewer?)` projects the table into a renderable `Scene`. Today it ships as the omniscient identity (everyone sees everything); per-player hidden-information projection is a planned layer. Rendering and drop hit-testing both flow through the same layout math, so drop targets can't drift from what's drawn.

## Getting started

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev        # Vite dev server + the card-table demo
bun run test       # vitest (happy-dom)
bun run typecheck  # tsc --noEmit
bun run build      # tsc --noEmit && vite build
```

Open the dev server and try the demo: deal cards to the hand, drag between deck/hand/discard, click to flip.

## Describing a table

```ts
import type { TableDef, Placement } from '@/engine/core/table-def';

const table: TableDef = {
  players: ['me'],
  zones: [
    { id: 'deck',    layout: 'pile', transform: { x: -400, y: 0 }, visibility: 'secret' },
    { id: 'hand',    layout: 'fan',  transform: { x: 0, y: 300 }, owner: 'me', visibility: 'owner', ordering: 'free' },
    { id: 'discard', layout: 'pile', transform: { x: 400, y: 0 }, visibility: 'public' },
    // a solitaire foundation: only accepts a same-suit ascending run
    { id: 'foundation', layout: 'pile', transform: { x: 400, y: -300 },
      capacity: 13, accept: { rule: 'sameSuitAscending' } },
  ],
};

const placement: Placement = {
  cards: [{ id: 'AS', zoneId: 'deck', faceUp: false, faceKey: 'AS', data: { suit: 'S', rank: 1 } }],
};
```

Render it with the React bridge:

```tsx
<CardTable
  tableDef={table}
  placement={placement}
  onDrop={(intent) => { /* apply your rules; update state */ }}
  onCardClick={(id) => { /* e.g. flip */ }}
/>
```

turnhout emits a `DropIntent` when a card is released; **you** decide whether/how to mutate your state. Flip is declarative via `CardState.faceUp`.

## Zone layouts & rules

- **Layouts:** `pile`, `fan`, `row`, `grid`, `free` (per-card `data.x`/`data.y`).
- **Accept-rules:** reference a registered rule by name. Register the starter set (or your own) on a `RuleRegistry`:

```ts
import { RuleRegistry } from '@/engine/core/rules';
import { registerStarterRules } from '@/engine/core/rules-library';

const registry = registerStarterRules(new RuleRegistry());
registry.register('myRule', ({ card, top, zoneCards }) => /* boolean */ true);
```

Validate a table before use with `validateTableDef(tableDef, registry)`.

## Project layout

```
src/
  engine/
    core/     pure engine: scene/table-def types, layout, zone-geometry,
              rules(+library), hittest, tween, choreography, diff,
              derive-scene, table-model reconciler
    pixi/     PixiTable view, card sprites, face-texture cache
    input/    pointer tracker, KMT state machine + parser (Pixi federation off)
    react/    <CardTable> declarative bridge
  pages/table-demo/   deck + demo page
  utils/init-app.ts   app wiring (registry, camera, input, deriveScene)
docs/superpowers/      design specs & implementation plans
```

## Conventions

- **Card world size:** `CARD_WIDTH = 100`, `CARD_HEIGHT = 140` (world units).
- **`core/` is pure:** no `pixi.js`/`react`/`@ue-too/*`/DOM imports; no `Math.random`/`Date.now` (jitter uses an id-hash; time is injected).
- **Interaction contract:** the engine emits intents and never mutates consumer state.

## Roadmap

turnhout is being built as four dependency-ordered sub-projects, each with its own design spec and plan under `docs/superpowers/`:

1. **Semantic zone model + serializable table schema** — ✅ shipped (this is what the sections above describe).
2. **Authoritative game-state + move engine** — full-truth state, deterministic seeded moves, reducer, turn/phase hooks.
3. **Per-player view projection** — real `deriveScene(state, viewer)` that hides unseen faces and private zones.
4. **Networking / authority / sync** — client move → server validation → per-player projected diffs (a Cloudflare Durable Object per room is the intended fit).

## Tech stack

TypeScript · Vite · React 19 · PixiJS 8 · Bun · vitest + happy-dom · `@ue-too/*`.
