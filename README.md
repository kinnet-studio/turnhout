# turnhout

A rendering-and-interaction engine for **web-based card & board games**, built on the [@ue-too](https://www.npmjs.com/org/ue-too) PixiJS + React integration and driven by a declarative scene.

turnhout renders cards and zones, animates deals/flips/moves, and emits interaction *intents* (`onDrop`, `onCardClick`, `onHover`). It does **not** own your game rules — you describe a table as data, turnhout draws it and tells you what the player did.

> **Status:** grown from a card *visual engine* into a toolkit for card-game development: a game-state engine, a flow engine, per-player views, a server-authoritative sync core, and a plain-text language for designing games. Online play is next. See [Roadmap](#roadmap).

## Highlights

- **Declarative & serializable.** A table is plain JSON: a static `TableDef` (zones) plus a dynamic `Placement` (cards). Save it, load it, send it over the wire.
- **Semantic zones.** Zones carry `owner`, `visibility` (`public`/`owner`/`secret`), `capacity`, `ordering`, and serializable accept-rules — enough to express trick-takers, TCGs, solitaire, and hidden-role games.
- **Pluggable rules.** Drop-legality lives in a `RuleRegistry` of named, unit-testable predicates (`descAltColor`, `sameSuitAscending`, `matchRankOrSuit`, `byTag`, `emptyOnly`, …). Reference them by name from a `ZoneDef`.
- **Framework-free core.** All layout, geometry, hit-testing, tweening, and reconciliation live in a pure `core/` with no PixiJS/React/DOM imports and no `Math.random`/`Date.now` — deterministic and testable in isolation.
- **Thin adapters.** `pixi/` renders, `input/` handles pointers (a custom KMT stack), `react/` bridges via `<CardTable>`.
- **Game-state engine.** A `GameEngine` owns the full truth: a `GameState` changed only by registered, seeded, deterministic `Move`s, with a move log, undo and replay.
- **Flow engine.** Turn order, phases, triggers and end conditions are declarative data (`FlowDef`) with behavior registered by name in a `FlowRegistry`, so legality and consequences are not hand-rolled in game code.
- **Per-player views.** `deriveScene(tableDef, placement, viewer)` hides the faces a viewer may not see (private zones, face-down cards) while keeping card ids stable for animation.
- **Net layer.** A `GameServer` validates each move and sends every seat only its own projected view over a `Channel`; `GameSession` and the loopback channel run a whole table in one page. (The transport is in-process today; there is no online play yet.)
- **Designer language.** A game is written as plain, readable text (cards, table, setup, phases, moves, scoring and worked `Example:`s), checked against a phrase library with hints for anything it does not know, and playtested on every seat in the browser. See [Designing a game](#designing-a-game).

## Architecture

```
Consumer app  ──(TableDef + Placement)──►  turnhout
                                             │
        ┌────────────────────────────────────┼───────────────────────────────┐
        │  core/  (pure, no pixi/react/DOM)   │                               │
        │   scene · table-def · layout · zone-geometry · rules · diff         │
        │   tween · choreography · hittest · derive-scene · table-model       │
        │   game-state · game-engine · moves · rng · flow (+ registry)        │
        │   lang/  (designer language: outline · phrases · compile · run)     │
        └───────┬───────────────┬───────────────┬───────────────────────────-┘
                │               │               │
            pixi/  (view)   input/ (KMT)    react/ (<CardTable>)

        net/  GameServer ──(per-seat projected views)──► GameSession / Channel
```

**The central idea:** the authoritative table state and what any one viewer *sees* are separate. The game-state engine holds the full truth; `deriveScene(tableDef, placement, viewer?)` projects it into a renderable `Scene` for one viewer, hiding what that viewer may not see (with no viewer it is the omniscient identity). The net layer sends each seat only its own projection, never the full state. Rendering and drop hit-testing both flow through the same layout math, so drop targets can't drift from what's drawn.

**Games as text.** `core/lang` reads a designer's rules into a compiled game, builds a `GameEngine` and `FlowDef` from it, and runs its `Example:` blocks on the real engine. It stays pure like the rest of `core/`; the designer page in `pages/designer/` is the view on top of it.

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

The app has two pages: the Hearts demo at `/`, and the game designer at `/#designer`.

## Designing a game

```bash
bun run dev        # then open http://localhost:5173/#designer
```

The designer page is a text editor for the rule language, with a line-numbered editor, a list of problems (each with a hint), and the results of the game's own `Example:`s. It checks the text as you type and keeps it in your browser.

- Start from a sample: **Load sample** has Hearts and Color Match (`src/games/hearts.rules`, `src/games/color-match.rules`).
- A phrase the language doesn't know yet is flagged with the closest phrases it does know. **Copy for developer** copies a stub for a developer to implement; designers don't write code.
- **Play** is available once the rules read cleanly. It puts every seat on one screen (pick the player count first when the game allows a range), with undo and restart. Editing the rules ends the playtest; Play starts a fresh game under the new rules.
- **Download** and **Upload** move the text to and from a `.rules` file.

A taste of the language (from `src/games/color-match.rules`):

```
Game: Color Match
Players: 2 to 5

Phase: playing
  Hint: Play a card matching the color or number, or draw one.
  Players take turns.
  A player may play a card from their hand to the discard pile.
    Only if one of:
      the card has the same color as the top card of the discard pile
      the card has the same number as the top card of the discard pile
```

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
              derive-scene, table-model reconciler,
              game-state, game-engine, moves(+library), rng,
              flow(+registry, library, validation)
      lang/   designer rule language: outline parser, phrase library,
              compiler, example runner, engine build
    net/      GameServer, GameSession, Channel protocol, loopback channel
    pixi/     PixiTable view, card sprites, face-texture cache,
              standard and text card faces
    input/    pointer tracker, KMT state machine + parser (Pixi federation off)
    react/    <CardTable> declarative bridge
  games/              Hearts and Color Match, written in the designer language
  pages/
    table-demo/       deck + demo page
    hearts-demo/      four-seat Hearts over loopback channels
    net-demo/         net-layer demo game
    designer/         the designer page: editor, problems, examples, playtest
  utils/init-app.ts   app wiring (registry, camera, input, deriveScene)
docs/superpowers/      design specs & implementation plans
```

## Conventions

- **Card world size:** `CARD_WIDTH = 100`, `CARD_HEIGHT = 140` (world units).
- **`core/` is pure:** no `pixi.js`/`react`/`@ue-too/*`/DOM imports; no `Math.random`/`Date.now` (jitter uses an id-hash; time is injected).
- **Interaction contract:** the engine emits intents and never mutates consumer state.

## Roadmap

turnhout is built as dependency-ordered sub-projects, each with its own design spec and plan under `docs/superpowers/`:

1. **Semantic zone model + serializable table schema** — ✅ shipped (this is what the sections above describe).
2. **Authoritative game-state + move engine** — ✅ shipped: full-truth state, deterministic seeded moves, reducer, undo and replay.
3. **Per-player view projection** — ✅ shipped: `deriveScene(state, viewer)` hides unseen faces and private zones.
4. **Net sync core** — ✅ shipped: client move → server validation → per-player projected views, over a transport-agnostic channel (loopback in-process).
5. **Rule engine** — ✅ shipped: declarative turn/phase flow, triggers and end conditions.
6. **Designer rule language** — ✅ shipped: games written as readable text, example checks, and an in-browser playtest page (see [Designing a game](#designing-a-game)).

**Next:**

- **Online play** — a real transport and rooms on top of the net core (a Cloudflare Durable Object per room is the intended fit).
- **Tokens and meeples** — non-card pieces, in the engine and in the designer language (the language is cards-only today).

## Tech stack

TypeScript · Vite · React 19 · PixiJS 8 · Bun · vitest + happy-dom · `@ue-too/*`.
