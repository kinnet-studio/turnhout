# Startup Simulator Slice 1a-2 (The Page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The designer's playtest plays Startup Simulator (slice 1a) in a browser. The shared table is wrapped to fit the fixed table world, with each zone named. One canvas shows one seat, chosen by seat tabs that jump to the seat that must act. That seat's own zones run along the bottom, and every player's counters and hand sizes are text. Card faces show a card's name and its first three columns, and pointing at a card shows all of it. The page is checked by happy-dom tests and in Chromium.

**Architecture:**
- **This is plan 1a-2 of two.** It runs after plan 1a-1 (`2026-10-16-startup-slice-1a-1-language-and-rules.md`) is complete, and takes its interfaces as given:
  - counters under `Players:`, which give `extras.board` with `spaces: []`;
  - the playtest panel that draws the board grid, the money line and the buttons only when a game has them (1a-1 Task 1);
  - `BoardView.startPlayer` (Task 3);
  - the shared-win status line `Game over — p0, p1 and p2 win (…)` (Task 5);
  - Startup Simulator's zone ids, move types and button labels (Tasks 9a/9b);
  - the `Startup Simulator` entry in `SAMPLES` (Task 9b).
- **A game "fits today"** when the existing auto-layout keeps every zone inside the table world. Such a game is drawn exactly as now: one panel per seat, the same `tableDefFor` layout, no tabs, no zone names, no hover line. Hearts, Color Match, Venom, Rent Day and every fixture fit at every player count (checked while writing this plan). Startup Simulator does not fit at any count: its ten shared zones make one line about 2,400 wide in a world 1,600 wide.
- **A game that doesn't fit gets the fitted page.** It is built from the game's declared zones and visibility only:
  - **Layout.** A per-viewer layout, `fittedLayout` in a new pure core file `lang/fit-layout.ts`, places every zone in its own slot:
    - the shared zones are wrapped onto lines from the top;
    - the viewer's own zones are wrapped onto lines from the bottom;
    - rivals' zones are left off the canvas.
  - **The engine keeps its layout.** The engine and server keep `tableDefFor`. Positions don't matter to the rules, so the page simply hands the canvas its own per-viewer `TableDef` with the same zone ids.
  - **The page.** `Playtest` shows seat tabs and one `SeatCanvas` for the selected seat. Its panel shows:
    - the status line;
    - every player's tableau as text (counters, a count for each of their zones, the start player);
    - the seat's buttons;
    - a 1200 × 900 canvas;
    - a line that shows the card under the pointer.
- **Room for slice 1b.** Nothing here is built for it, but nothing is in its way:
  - **1b-3's Board on the canvas:** the middle band of the fitted table (about y −236 to 416) is empty. The viewer's further per-player zones join the bottom lines and wrap upward.
  - **1b-3's rivals' Boards:** they are text, so they grow `tableauLine`.
  - **1b-1's DOM card picker:** it fits in the panel between the buttons and the canvas.
  - **Canvas clicks:** they are `CardTable`'s existing `onCardClick`, which this plan leaves unused.
- **Calls this plan makes** (the spec leaves them open):
  - **What "fits" means.** "Fits today" is `fitsTable`: autoLayout's zones, holding 4 cards per row and 3 per pile (the counts `unreachableZones` uses; a hand's box is its bounds), all lie inside `TABLE_BOUNDS`. Zones that overlap but stay inside don't count against it. Venom's rows already overlap its piles by design.
  - **Rivals' zones are left off the canvas entirely.** The page drops their cards from what it draws, and their sizes are text. This is R9's "collapsed".
  - **Fitted rows.** A fitted row is a 5-card slot, 400 wide, and squeezes its cards to stay inside it (a new `LayoutOptions.maxWidth`). Its drop box is the whole slot (`bounds`). A Bench of 8 after three hires in a turn still fits its slot.
  - **Zone names** are drawn above zones, but only where the fitted layout sets `ZoneDef.label`, so the four games look the same.
  - **The canvas** is 1200 × 900 in the fitted page, which draws the 1600 × 1200 world at three quarters.
  - **Every seat's tableau is listed, the viewer's too.** Each of the game's per-player zones is counted in Table order.
  - **The tabs jump only when the seat that must act changes,** so a player can look at another seat's tab in peace. No seat must act in an everyone-at-once phase or after the game ends.
  - **A counter at exactly 1 reads in the singular** on the money line and in the tableaux ("1 action"). No existing test shows a counter at 1.
  - **Long card names.** A named card's label shrinks only when the card has detail lines and its label is not a single word of at most 6 letters, so every face of the four games is drawn as now.
  - **The hover line is on the fitted page only.**
  - **The browser check's Crash and tie.** A Play game has a fresh random seed, so it can't be steered to a tie. So the check plays a variant of the sample with two Setup lines removed, which puts the Market Crash on top of the growth deck. Each player keeps 7 capital and 1 Tier 1 card, so every score is −1. The real game's Crash and tie are pinned by a happy-dom test on an arranged state.
  - **The controller's notes from 1a-1's Task 1 review:**
    - a game whose board has no spaces counts as a card game and always gets its card table;
    - the money line is also drawn for a board whose only numbers are its bank.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19, PixiJS 8; Playwright (installed globally, Chromium in `/opt/pw-browsers`) for the browser check.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-1a-table-money-turns-design.md`, binding: its "The page" section, R8's faces, R9 and R10. It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, binding: "The page" and the constraints. The page parts of `…-slice-1b-building-design.md` (R9) are what this plan leaves room for. The evidence is `builder-check-startup-1a.md`, M8 and M9.

## Global Constraints

- **Hard constraints (verbatim):**
  - Protected files must not change: `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, and anything under `src/pages/hearts-demo/**`.
  - The core is pure: no pixi/react/DOM imports in `src/engine/core/**`, no `Math.random` or `Date.now`.
  - No Startup Simulator words in shared code (capital, talent, agency, junior, backlog, growth, crash, vaporware, university, bench, ideation, startup, research, recruit, product, job market, idea pool, "seed" meaning a deck/market/card/product); the layout and page must work from the game's declared zones, counters and visibility, never from Startup Simulator's names.
  - Hearts, Color Match, Venom and Rent Day look and play as before: `auto-layout.test.ts` and the existing designer tests pass unchanged; the existing layout stays for games that fit today.
  - `bun run typecheck` clean; full `bun run test` passes.
  - The browser check uses the pre-installed Chromium via Playwright (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; never run `playwright install`); check package.json/README for how the dev server and any existing browser-check script run, and give the exact commands, the screenshots to take (into a scratch directory, not the repo), and what each must show.
- **Before Task 1.**
  - Plan 1a-1 is done: its Task 10 is committed, `src/games/startup-simulator.rules` passes 21 examples, and `SAMPLES` lists Startup Simulator.
  - Record `BASE=$(git rev-parse HEAD)`. Task 4's checks diff against it.
  - Run `bun run test` once to get the passing count.
- **Commands.** Single file: `bunx vitest run <path>`. Full suite: `bun run test` (it runs `vitest run`). Types: `bun run typecheck`. The dev server is `vite` (`package.json`'s `dev` script); the README opens the designer at `http://localhost:5173/#designer`. There is no browser-check script in the repo; Task 4's is throwaway and lives in your scratchpad.
- **No new dependencies.** Playwright is used from its global install, outside the repo.
- **Where Startup Simulator's words may appear:**
  - Banned (any capitals, any form): the words above, matched by Task 4's grep.
  - They may not appear in non-test files under `src/engine`, `src/pages` or `src/utils`, comments included.
  - They may appear in `src/pages/designer/playtest-fitted.test.tsx` and `src/pages/designer/tableaux.test.ts`, which play the real sample, and in README and docs.
  - Core tests (`src/engine/**`) use general words: stock, stall, stash, list, peek, Goblin.
- **Existing tests stay as they are.** No existing test line changes. New cases are appended to `src/engine/core/layout.test.ts`, `src/engine/core/derive-scene.test.ts`, `src/engine/pixi/pixi-table.test.ts`, `src/engine/pixi/text-faces.test.ts`, `src/pages/designer/playtest.test.tsx` and `src/pages/designer/seat-status.test.ts`. If an existing test fails, stop and report it instead of changing it.
- **Page copy (exact):**
  - **A seat tab** reads `p1`, or `p1 — to act` for the seat that must act.
  - **A tableau line** reads `p0 7 capital, 3 actions · bench 3 · backlog 1 · research 0 · start player`. That is the money line's entry for the seat, then `{zone} {count}` for each of the game's per-player zones in Table order, then `start player` for the start seat. A seat that is out reads `p2 out`. A game with no board starts the line with the bare seat: `p0 · hand 7`.
  - **The hover line** for a named card reads `Goblin — attack 3 · color green`: the name, then every other column as `key value`. A card with no name reads `color red · number 7`.
- **Style and commits.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefixes `feat(layout):`, `feat(designer):`, `feat(faces):`, `docs:`.
  - Stage files by path, never `git add -A`.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.

## Review Focus

- **A row longer than its slot.** After three hires a Bench holds 8 cards in Cleanup. Its cards stay inside the 400-wide slot without reaching the next zone, and every card keeps a strip to grab it by. Tests in Task 1: `layout.test.ts`, and the overlap check with 8-card rows.
- **Five players.** The fitted layout is the same table for every viewer, inside the world, with nothing overlapping, at 2 to 5 seats. There are 5 tabs and 5 tableau lines. Tests in Task 1 and Task 2.
- **Undo across a pass.** After the turn passes and the tabs jump to the next seat, Undo takes the turn back, and the tabs jump back with it. Test in Task 2.
- **A refused drag on the fitted page.** The friendly reason flashes in the selected seat's panel, and nothing moves. Test in Task 2.
- **Pointing at a face-down card** (a deck's top card) shows nothing on the hover line, so no identity leaks through it. Test in Task 3.

---

### Task 1: A per-viewer layout that fits the table

**Files:**
- Create: `src/engine/core/lang/fit-layout.ts`, `src/engine/core/lang/fit-layout.test.ts`
- Modify: `src/engine/core/scene.ts` (`TABLE_BOUNDS`, `LayoutOptions.maxWidth`), `src/engine/core/layout.ts` (the row case), `src/engine/core/table-def.ts` (`ZoneDef.label`)
- Modify: `src/engine/core/lang/auto-layout.ts`: export its `def` as `zoneDef`, and export `HAND_BOUNDS`. Its output is unchanged.
- Modify: `src/utils/init-app.ts`: use `TABLE_BOUNDS` from `scene.ts` instead of its own copy, which has the same values.
- Test: `src/engine/core/layout.test.ts` (append)

**Interfaces:**
- **`scene.ts`:**
  - `export const TABLE_BOUNDS = { min: { x: -800, y: -600 }, max: { x: 800, y: 600 } } as const`: the fixed world every table canvas fits to its size.
  - `LayoutOptions.maxWidth?: number`: the widest a row's cards may span.
- **`layout.ts`, the row case:** with `n > 1` and `maxWidth` set, the spacing is `Math.min(spacing, (maxWidth - CARD_WIDTH) / (n - 1))`. Without `maxWidth`, nothing changes.
- **`table-def.ts`:** `ZoneDef.label?: string`, the zone's name to draw beside it. Only the fitted layout sets it.
- **`auto-layout.ts`:** `export function zoneDef(spec: ZoneSpec, id: string, at: { x: number; y: number }, owner: PlayerId | 'shared'): ZoneDef` (today's `def`), and `export const HAND_BOUNDS`.
- **`fit-layout.ts`:**
  - `fitsTable(zones: ZoneSpec[], seats: PlayerId[]): boolean`. Every def of `autoLayout(zones, seats)`, placed by `placeZone` with placeholder cards (4 in a row, 3 in a pile; a fan's box is its bounds), lies inside `TABLE_BOUNDS`.
  - `fittedLayout(zones: ZoneSpec[], viewer: PlayerId): ZoneDef[]`, built like this:
    - **Slot widths:** a pile is `CARD_WIDTH` (100) wide, a row `ROW_SLOT = 400` (five cards at 75), and a hand `HAND_BOUNDS.width` (312).
    - **Slot heights:** a slot is `CARD_HEIGHT` (140) tall, a hand `HAND_BOUNDS.height` (178).
    - **Lines.** Zones are packed in Table order.
      - A zone starts a new line when the line already has a zone and the line's width plus `GAP = 20` plus the zone's slot would pass `LINE_WIDTH = 1560` (the world's width less `MARGIN = 20` each side).
      - Each line is centred on x = 0, with its slots `GAP` apart. A zone's `transform.x` is its slot's centre, and its `transform.y` is its line's centre.
      - A line is as tall as its tallest slot.
    - **Shared zones,** from the top:
      - the first line's top is `TABLE_BOUNDS.min.y + MARGIN + LABEL_ROOM` (`LABEL_ROOM = 24`, for the names);
      - each next line's top is the line above's bottom `+ LINE_GAP (16) + LABEL_ROOM`.
    - **The viewer's zones** (per-player zones, id `zoneIdFor(name, viewer)`, owner `viewer`), from the bottom:
      - the first line's bottom is `TABLE_BOUNDS.max.y - MARGIN`;
      - each next line's bottom is the line below's top `- LABEL_ROOM - LINE_GAP`.
    - **Rivals' zones** are left out.
    - **Each def** is `zoneDef(spec, id, at, owner)` with `label: spec.name`. A row also gets:
      - `layoutOptions: { spacing: 75, maxWidth: ROW_SLOT }`;
      - `bounds: { width: ROW_SLOT, height: CARD_HEIGHT }`.
    - **Order:** the viewer's zones, then the shared zones, as in autoLayout. Nothing overlaps, so drops don't depend on it.

- [ ] **Step 1: Write the failing tests.**

In `layout.test.ts`, add `it('a row with a maxWidth squeezes its cards to stay within it')`. Use a row zone at x 0 with `layoutOptions: { spacing: 75, maxWidth: 400 }`:
- with 8 cards, the first x is `-150`, the last `150`, and the step is close to `300 / 7`;
- with 5 cards, x runs −150 to 150 at 75;
- with 2 cards, x is −37.5 and 37.5;
- with 1 card, x is 0;
- the same row without `maxWidth`, holding 8 cards, still steps 75.

In `fit-layout.test.ts`, use `MARKET`: a zone list shaped like a game with too many shared zones, all `public` except `owner` for the per-player rows.
- Shared, in order: `stock` (pile), `stall` (row), `lost and found` (row), `red pile` (pile), `blue pile` (pile), `red market` (row), `blue market` (row), `pool` (row), `stop pile` (pile), `box` (pile).
- Per player: `stash`, `list` and `peek` (rows).

Write these tests:
- **The four games fit.** Hearts, Color Match, Venom and Rent Day (`@/games/*.rules?raw`, compiled) give `fitsTable(game.zones, seats(n))` true for every `n` from `game.players.min` to `max`.
- **MARKET doesn't fit.** `fitsTable(MARKET, seats(n))` is false for n = 2 to 5.
- **Ids.** `fittedLayout(MARKET, 'p1')` has ids `['stash-p1', 'list-p1', 'peek-p1', 'stock', 'stall', 'lost-and-found', 'red-pile', 'blue-pile', 'red-market', 'blue-market', 'pool', 'stop-pile', 'box']`.
- **Places:**
  - stock `{ x: -540, y: -486 }`, stall `{ x: -270, y: -486 }`, lost-and-found `{ x: 150, y: -486 }`, red-pile `{ x: 420, y: -486 }`, blue-pile `{ x: 540, y: -486 }`;
  - red-market `{ x: -540, y: -306 }`, blue-market `{ x: -120, y: -306 }`, pool `{ x: 300, y: -306 }`, stop-pile `{ x: 570, y: -306 }`, box `{ x: 690, y: -306 }`;
  - stash-p1 `{ x: -420, y: 510 }`, list-p1 `{ x: 0, y: 510 }`, peek-p1 `{ x: 420, y: 510 }`.
- **Same zones as the engine's.** For each fitted def, the def of `autoLayout(MARKET, seats(3))` with the same id has the same `owner`, `visibility`, `layout` and `ordering`.
- **Names and slots.**
  - Each def's `label` is its spec's name (`'lost and found'`, `'stash'`).
  - Rows have `layoutOptions` `{ spacing: 75, maxWidth: 400 }` and `bounds` `{ width: 400, height: 140 }`.
  - Piles have neither.
- **One table for every viewer.** At 5 seats, the shared defs are equal for viewers p0 to p4. Each viewer's own defs equal p0's with the id and owner changed.
- **Review Focus: long rows, five players.** For n = 2 to 5 and every viewer:
  - every zone's `placeZone` box lies inside `TABLE_BOUNDS`, with rows holding 8 cards and piles 40;
  - no two boxes overlap;
  - every pose `computeZoneLayout` gives a row of 8 lies within its bounds;
  - `unreachableZones(defs, 7)` is `[]`.
- **A hand.** With `{ name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' }` first in the list:
  - `hand-p0` is at `{ x: -420, y: 491 }`;
  - `peek-p0` wraps to the line above, at `{ x: 0, y: 292 }`;
  - every box is inside the world, and `unreachableZones(defs, 7)` is `[]`.
- **The world.** `TABLE_BOUNDS` equals `{ min: { x: -800, y: -600 }, max: { x: 800, y: 600 } }`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/layout.test.ts src/engine/core/lang/fit-layout.test.ts`. Expected: FAIL (`fit-layout` not found, no squeeze).
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the two files and `bunx vitest run src/engine/core/lang/auto-layout.test.ts`, which must pass unchanged. Then run `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/fit-layout.ts src/engine/core/lang/fit-layout.test.ts src/engine/core/scene.ts src/engine/core/layout.ts \
  src/engine/core/layout.test.ts src/engine/core/table-def.ts src/engine/core/lang/auto-layout.ts src/utils/init-app.ts
git commit -m "feat(layout): a per-viewer layout that wraps the shared zones to fit the table and puts the viewer's own zones along the bottom"
```

---

### Task 2: Seat tabs, the seat's own strip, and every player's tableau

**Files:**
- Create: `src/pages/designer/seat-tabs.tsx`, `src/pages/designer/tableaux.tsx`
- Create tests: `src/pages/designer/tableaux.test.ts`, `src/pages/designer/playtest-fitted.test.tsx`
- Modify: `src/pages/designer/playtest.tsx`
- Modify: `src/pages/designer/board-controls.tsx`: export `entryFor` and `bankLine`, and read a counter at exactly 1 in the singular.
- Modify: `src/pages/designer/seat-status.ts` (`seatToAct`)
- Test (append): `src/pages/designer/playtest.test.tsx`, `src/pages/designer/seat-status.test.ts`

**Interfaces:**
- **Consumes:**
  - `fitsTable` and `fittedLayout` (Task 1);
  - `BoardView.startPlayer` (1a-1 Task 3);
  - Startup Simulator's zones (`agency-row`, `open-job-market`, `seed-market`, `bench-pN`, `backlog-pN`, `research-pN`, …), its phases (`actions`, `research`, `bench cleanup`, `backlog cleanup`) and its buttons (`Recruit a junior software dev`, `Research the seed deck`, `End your actions`).
- **`board-controls.tsx`:**
  - `export function entryFor(board: BoardView, seat: string): string` and `export function bankLine(board: BoardView): string`, unchanged except for one thing:
  - a counter whose value is exactly 1 reads as `counted(1, name)` ("1 action"), and every other value as before ("1,450 money").
- **`seat-status.ts`:** `seatToAct(game: CompiledGame, view: ClientView | null): PlayerId | null` gives `view.turn.current`. It is null when:
  - there is no view;
  - the game has a result;
  - there is no turn;
  - or the turn's phase has `actor === 'any'`.
- **`seat-tabs.tsx`:** `SeatTabs({ seats, selected, toAct, onSelect }: { seats: PlayerId[]; selected: PlayerId; toAct: PlayerId | null; onSelect(seat: PlayerId): void })`.
  - It renders `<div role="tablist" aria-label="Seats">`.
  - Each seat gets a `<button type="button" role="tab" aria-selected={seat === selected}>`. Its text is the seat, plus ` — to act` when the seat is `toAct`, in `seatColor(seat)`.
- **`tableaux.tsx`:**
  - `tableauLine(game: CompiledGame, board: BoardView | null, cards: CardState[], seat: PlayerId): string` gives the exact copy under Global Constraints.
    - The counts come from `cards`, by `zoneIdFor(zone.name, seat)` for each `game.zones` entry with `perPlayer`.
    - `start player` is added when `board?.startPlayer === seat`.
    - A seat in `board.out` gets `entryFor` alone.
  - `Tableaux({ game, seats, board, cards })` renders `data-testid="tableaux"`: one line per seat in seat order, in its seat colour, then `bankLine(board)` when it isn't empty.
- **`playtest.tsx`:**
  - **The controller's notes**, for every game:
    - `showsCards` also holds when `game.board.spaces.length === 0`, since a game with no spaces is a card game however it moves its cards;
    - `MoneyLine` is also drawn when `board.bank.length > 0`.
  - `FITTED_WIDTH = 1200` and `FITTED_HEIGHT = 900`: the 1600 × 1200 world at three quarters.
  - **`Playtest`:**
    - `fitted` is `running !== null && !fitsTable(game.zones, running.seats)`, memoized.
    - The state is `selected` (starting at `seats[0]`) and `toAct`, plus a ref `lastToAct`.
    - `seen(seat: PlayerId | null)` is a stable callback. It sets `toAct`, and when `seat !== null && seat !== lastToAct.current` it selects `seat`. Then it stores `seat` in `lastToAct`.
    - Fitted, it renders `<SeatTabs …/>`, then `<SeatCanvas key={selected} seat={selected} tableDef={{ players: seats, zones: fittedLayout(game.zones, selected) }} fitted onTurn={seen} …/>`, with the def memoized on `selected`.
    - Not fitted, it renders the panels exactly as today.
  - **`SeatCanvas`** gains `fitted?: boolean` and `onTurn?(seat: PlayerId | null): void`.
    - It calls `onTurn(seatToAct(game, view))` in an effect whenever that value changes.
    - **Fitted:**
      - the placement keeps only cards whose `zoneId` is a zone of `tableDef`;
      - the panel layout is always used, `FITTED_WIDTH` wide;
      - `Tableaux` takes `MoneyLine`'s place, with `cards = view.scene.cards`, once a view has arrived;
      - `ActionButtons` appear when the game has buttons and extras have arrived;
      - the canvas box is `FITTED_WIDTH × FITTED_HEIGHT`.

- [ ] **Step 1: Write the failing tests.**

In `playtest.test.tsx`, inside `describe('Playtest of a game with counters and no board')` (from 1a-1 Task 1), append these two tests. Both variants compile with no diagnostics, which was checked while writing this plan.

```ts
it('draws the card table for a game with counters whose only lines are buttons', () => {
  const buttonsOnly = compileGame(COUNTER_GAME
    .replace('  A player may buy a card from the shop to their stash.\n    Then:\n      They pay 1.\n', '')
    .replace('After a player buys or passes,', 'After a player passes,'), lib);
  expect(buttonsOnly.diagnostics).toEqual([]);
  mount({ game: buttonsOnly.game!, players: 2 });
  expect(rendered).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: 'Pass' })).toHaveLength(2);
});
it('draws the bank line for a game whose only number is the bank', () => {
  const bankOnly = compileGame(COUNTER_GAME
    .replace('  Each player has 7 coins that everyone can see.\n  Players pay with coins.\n', '  The bank has 5 tokens.\n')
    .replace('    Then:\n      They pay 1.\n', ''), lib);
  expect(bankOnly.diagnostics).toEqual([]);
  mount({ game: bankOnly.game!, players: 2 });
  expect(screen.getAllByText('bank: 5 tokens')).toHaveLength(2);
});
```

In `seat-status.test.ts`, append `describe('seatToAct')`:
- it is null without a view;
- it is `'p1'` for Color Match at `{ current: 'p1', phase: 'playing' }`;
- it is null with a result;
- it is null with no turn;
- it is null in Hearts' everyone-at-once phase (`hearts.phases.find((p) => p.actor === 'any')`, expected defined).

In `tableaux.test.ts`, use the real game (`@/games/startup-simulator.rules?raw`) at 3 players, seed 1. Take the board from `seatExtras(engine, runtime, state, 'p0').board` and the cards from `state.cards`. `S` is `state.data['lang:start-player']`.
- **Every seat.** Each seat reads `pN 7 capital, 3 actions · bench 3 · backlog 1 · research 0`, and S's line adds ` · start player`.
- **One action.** After `setCounter(state, 'actions', S, 1)`, S's line has `7 capital, 1 action ·`.
- **A seat that is out.** After `markOut(state, 'p1')`, p1's line is `p1 out`.
- **No board.** Color Match with `board` null reads `p0 · hand 7`.

`playtest-fitted.test.tsx` mounts the real game with this scaffold. Later tasks append to it.

```tsx
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import COLOR_MATCH from '@/games/color-match.rules?raw';
import STARTUP_SIMULATOR from '@/games/startup-simulator.rules?raw';
// …createEngine, initialState, compileGame, createDefaultLibrary, fitsTable, fittedLayout, parseTextFaceKey, relocate, CardTableProps, Playtest

vi.mock('@/components/PixiCanvas', () => ({ Wrapper: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
// The fitted page draws one table: keep the props it was last drawn with.
let table: CardTableProps | null = null;
vi.mock('@/engine/react', () => ({ CardTable: (p: CardTableProps) => { table = p; return null; } }));

const lib = createDefaultLibrary();
const game = compileGame(STARTUP_SIMULATOR, lib).game!;
const SEED = 1;
const seatsOf = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
const startOf = (n: number) => createEngine(game, lib, n, initialState(game, SEED)).engine.getState().data['lang:start-player'] as string;
const after = (seat: string, n: number) => `p${(Number(seat.slice(1)) + 1) % n}`;
const hint = (phase: string) => game.phases.find((p) => p.id === phase)!.hint!;
const mount = (over: Partial<Parameters<typeof Playtest>[0]> = {}) =>
  render(<Playtest game={game} library={lib} players={3} seed={SEED} onRestart={() => {}} onStop={() => {}} {...over} />);
const cardsIn = (zoneId: string) => table!.placement.cards.filter((c) => c.zoneId === zoneId);
const lineOf = (seat: string) => within(screen.getByTestId('tableaux')).getByText(new RegExp(`^${seat} `)).textContent;
const status = () => screen.getByText(/^seat: p/).textContent;
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const drop = (cardId: string, from: string, to: string) =>
  act(() => table!.onDrop!({ cardId, fromZoneId: from, toZoneId: to, slot: 0, worldPoint: { x: 0, y: 0 } }));

beforeEach(() => { table = null; });
```

Add `describe('Playtest of a game too big for one table')`. In it, `S = startOf(3)`, `N = after(S, 3)`, and `O` is any seat other than S.
- **It doesn't fit.** `fitsTable(game.zones, seatsOf(n))` is false for n = 2 to 5.
- **One seat, on the seat that must act.**
  - The tab texts are `seatsOf(3)`, with S's reading `${S} — to act`.
  - S's tab has `aria-selected="true"`.
  - There is exactly one `seat:` line: `seat: ${S} — Your turn — ${hint('actions')}`.
- **The seat's table.**
  - `table!.tableDef.zones` ids equal `fittedLayout(game.zones, S)` ids.
  - Every placement card's zone is among them.
  - `cardsIn(`bench-${S}`)` has 3 cards, and `cardsIn(`bench-${O}`)` none.
- **Tableaux.** `lineOf(seat)` is `${seat} 7 capital, 3 actions · bench 3 · backlog 1 · research 0` for each seat, with ` · start player` added on S.
- **Looking at another seat.** Click O's tab:
  - the status is `seat: ${O} — ${hint('actions')} — waiting for ${S}`;
  - the table has `bench-${O}` and not `bench-${S}`;
  - S's tab still reads `${S} — to act`, and O's is selected.
- **Jumping to the next seat, and back with Undo (Review Focus).**
  - Press `End your actions`. N's tab reads `${N} — to act` and is selected, and the status is `seat: ${N} — Your turn — ${hint('actions')}`.
  - Press `Undo`. S's tab is to act and selected again.
- **Research is the researcher's alone.**
  - Press `Research the seed deck`:
    - the status is `seat: ${S} — research — Your turn — ${hint('research')}`;
    - `cardsIn(`research-${S}`)` has 3 cards, all `faceUp` and none `'back'`;
    - `lineOf(S)` has `research 3`.
  - Click O's tab:
    - `cardsIn(`research-${S}`)` is empty;
    - `lineOf(S)` still has `research 3`;
    - the status is `seat: ${O} — research — ${hint('research')} — waiting for ${S}`.
- **Dragging on the fitted table.**
  - Take the first card of `cardsIn('agency-row')` whose `Number(parseTextFaceKey(c.faceKey)!.cost)` is at most 7. Expect it to be defined ("seed 1 deals an affordable agency card").
  - `drop(id, 'agency-row', `bench-${S}`)`.
  - `lineOf(S)` starts `${S} ${7 - cost} capital, 2 actions · bench 4`.
- **A refused drag (Review Focus).**
  - `drop` a card of `bench-${S}` onto `seed-market`.
  - `No rule lets you move a card there.` shows, and `lineOf(S)` is unchanged.
- **Five players (Review Focus).** `mount({ players: 5 })` shows 5 tabs and 5 tableau lines.
- **A game that fits keeps a panel per seat.** Mount Color Match at 3 players. There is no `tablist`, and there are 3 `seat:` lines.

- [ ] **Step 2: Run** `bunx vitest run src/pages/designer`. Expected: the new tests FAIL, and every existing test passes.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/pages/designer src/engine/core/lang/fit-layout.test.ts`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/pages/designer/seat-tabs.tsx src/pages/designer/tableaux.tsx src/pages/designer/tableaux.test.ts \
  src/pages/designer/playtest-fitted.test.tsx src/pages/designer/playtest.tsx src/pages/designer/board-controls.tsx \
  src/pages/designer/seat-status.ts src/pages/designer/seat-status.test.ts src/pages/designer/playtest.test.tsx
git commit -m "feat(designer): a game too big for one table plays one seat at a time, with seat tabs that follow the turn and every player's tableau as text"
```

---

### Task 3: Card faces, the whole card on hover, and zone names on the table

**Files:**
- Modify: `src/engine/pixi/text-faces.ts`, `src/engine/core/scene.ts` (`ZoneState.label`), `src/engine/core/derive-scene.ts`, `src/engine/pixi/pixi-table.ts`, `src/pages/designer/playtest.tsx`
- Create: `src/pages/designer/card-detail.ts`, `src/pages/designer/card-detail.test.ts`
- Test (append): `src/engine/pixi/text-faces.test.ts`, `src/engine/core/derive-scene.test.ts`, `src/engine/pixi/pixi-table.test.ts`, `src/pages/designer/playtest-fitted.test.tsx`

**Interfaces:**
- **`text-faces.ts`:**
  - `FACE_DETAILS = 3`: a face lists only the first three of its `key: value` detail lines.
  - `labelStyleOf(label: string, hasDetails: boolean): { fontSize: number; wordWrapWidth: number; anchorY: number; y: number }`:
    - **Unchanged look.** With no details, or a label that is one word of at most 6 characters, it gives today's style: `{ fontSize: 24, wordWrapWidth: 80, anchorY: 0.5, y: -12 }`.
    - **Otherwise** it gives `fontSize: 14` when the label's longest word has at most 11 characters, else `12`. The rest is `wordWrapWidth: 88, anchorY: 1, y: DETAILS_Y - 3` (13), so the label ends just above the details.
  - `drawText` uses both. The label's anchor becomes `(0.5, anchorY)`.
- **`scene.ts`:** `ZoneState.label?: string`.
- **`derive-scene.ts`:** a zone carries `label` when its def has one, and has no `label` key otherwise.
- **`pixi-table.ts`:** every zone with a `label` gets a `Text`, redrawn on each `setScene` and drawn whether or not `showEmptyZones` is on:
  - `label: 'zone-label'`, text the label, style `{ fontSize: 18, fill: 0xd1d5db }`;
  - anchor `(0.5, 1)`, at `(box.x, box.y - box.height / 2 - 4)`, where `box = placeZone(zone, [])`;
  - it sits in a child container with `zIndex = -1`.
- **`card-detail.ts`:** `cardDetail(faceKey: string): string | null` gives the hover copy under Global Constraints from `parseTextFaceKey`. It is null for a key that isn't a text face (`'back'`, `'12S'`) or has no attributes.
- **`playtest.tsx`, fitted page only:**
  - `CardTable` gets `onHover={setHovered}`.
  - Under the canvas sits `<div data-testid="card-detail" style={{ minHeight: 20 }}>`. It shows `cardDetail(card.faceKey)` when the hovered card is in the placement and `faceUp`, and is empty otherwise.

- [ ] **Step 1: Write the failing tests.**

In `text-faces.test.ts`, append `describe('faces of cards with many columns')`:
- **Three details.** A card `{ name: 'Goblin', attack: 3, defense: 2, speed: 1, cost: 5, rarity: 'rare' }` draws `attack: 3`, `defense: 2` and `speed: 1`. It draws no `cost: 5` and no `rarity: rare`.
- **`labelStyleOf`:**
  - `('Goblin', true)`, `('Knight', true)`, `('Archer', true)`, `('Viper', true)` and `('red 7', false)` give `{ fontSize: 24, wordWrapWidth: 80, anchorY: 0.5, y: -12 }`;
  - `('Wandering Merchant', true)` and `('Big Bad', true)` give `{ fontSize: 14, wordWrapWidth: 88, anchorY: 1, y: 13 }`;
  - `('Extraordinarily Big', true)` gives `fontSize: 12`.
- **Drawn.** A `Wandering Merchant` card with an `attack` column has a label whose `style.fontSize` is 14 and whose `anchor.y` is 1.

In `derive-scene.test.ts`, append:
- a def zone with `label: 'shop'` gives a scene zone with `label: 'shop'`, for no viewer and for a named viewer;
- a zone without one has no `label` key (`'label' in zone` is false).

In `pixi-table.test.ts`, append `describe('zone names')`. `texts(c)` collects every `Text` under a container whose `label` is `'zone-label'`. The scene has `{ id: 'shop', layout: 'row', transform: { x: 0, y: 0 }, bounds: { width: 400, height: 140 }, label: 'shop' }` and an unlabelled pile at x 300.
- There is exactly one name: text `shop`, x 0, y −74, `anchor.y` 1.
- After a second `setScene` there is still one.
- The `PixiTable` scene of the existing outline tests has none.

In `card-detail.test.ts`:
- `cardDetail(textFaceKey({ name: 'Goblin', attack: 3, color: 'green' }))` is `'Goblin — attack 3 · color green'`;
- `({ name: 'Coupon' })` gives `'Coupon'`;
- `({ color: 'red', number: 7 })` gives `'color red · number 7'`;
- `'back'` and `'12S'` give null.

In `playtest-fitted.test.tsx`, append `describe('the whole card on hover')`:
- **Hovering.** Hover the first agency-row card (`act(() => table!.onHover!(id))`). The `card-detail` text equals `cardDetail(faceKey)`: it starts with the card's name and contains `trait `. `onHover(null)` empties it.
- **Review Focus: a face-down card.** Hovering the first card of `cardsIn('talent-deck')`, which is face down, leaves it empty.
- **Not on a game that fits.** On Color Match, `table!.onHover` is undefined and there is no `card-detail`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/pixi src/engine/core/derive-scene.test.ts src/pages/designer`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the same, then `bun run test` and `bun run typecheck`. Hearts' tests (`src/pages/hearts-demo`, `derive-scene`, `pixi-table`) pass unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/engine/pixi/text-faces.ts src/engine/pixi/text-faces.test.ts src/engine/core/scene.ts src/engine/core/derive-scene.ts \
  src/engine/core/derive-scene.test.ts src/engine/pixi/pixi-table.ts src/engine/pixi/pixi-table.test.ts src/pages/designer/card-detail.ts \
  src/pages/designer/card-detail.test.ts src/pages/designer/playtest.tsx src/pages/designer/playtest-fitted.test.tsx
git commit -m "feat(faces): faces with a card's name and first three columns, the whole card on hover, and zone names on a fitted table"
```

---

### Task 4: A round through the page, the Crash and a tie, the browser check, and the README

**Files:**
- Modify: `src/pages/designer/playtest-fitted.test.tsx` (append), `README.md`
- The browser check's scripts and screenshots go only in your scratchpad.

**Interfaces:** Consumes everything above, plus `relocate` (`lang/zones.ts`). It produces nothing new.

- [ ] **Step 1: Write the playthrough tests.** In `playtest-fitted.test.tsx`, append `describe('a round played through the page')`. `S`, `N = after(S, 3)` and `T = after(N, 3)` are as in Task 2.

**`it('recruits from every source, drafts, researches, discards and passes the turn')`.** Each line below is a check after the action.
1. S presses `Recruit a junior software dev` three times.
   - `lineOf(S)` is `${S} 1 capital, 0 actions · bench 6 · backlog 1 · research 0 · start player`.
   - The status is `seat: ${S} — Your turn — ${hint('bench cleanup')}`.
2. S drops the first card of `bench-${S}` on `open-job-market`.
   - N's tab reads `${N} — to act` and is selected.
   - `cardsIn('open-job-market')` has 1 card.
   - `lineOf(S)` has `bench 5`.
3. N drops that card on `bench-${N}`. `lineOf(N)` starts `${N} 6 capital, 2 actions · bench 4`.
4. N drops the first agency card whose `Number(parseTextFaceKey(c.faceKey)!.cost)` is at most 6 (expected defined) on `bench-${N}`. `lineOf(N)` starts `${N} ${6 - cost} capital, 1 action · bench 5`.
5. N presses `Research the seed deck`. `cardsIn(`research-${N}`)` has 3 face-up cards.
6. Click S's tab: `cardsIn(`research-${N}`)` is empty, and `lineOf(N)` has `research 3`. Click N's tab.
7. N drops the first research card on `backlog-${N}`.
   - T's tab is to act and selected.
   - `cardsIn('open-idea-pool')` has 2 cards.
   - `lineOf(N)` has `0 actions · bench 5 · backlog 2 · research 0`.
8. T drops the first `seed-market` card on `backlog-${T}`.
   - `lineOf(T)` starts `${T} 7 capital, 2 actions · bench 3 · backlog 2`.
   - `cardsIn('seed-market')` still has 2 cards.
9. T presses `End your actions`.
   - S's tab is to act and selected.
   - `lineOf(S)` starts `${S} 1 capital, 3 actions · bench 5`.

**`it('ends once the round is finished after the Market Crash, in a tie')`.**
- **Arrange.** Take the set-up state `createEngine(game, lib, 3, initialState(game, SEED)).engine.getState()`. Relocate its `Market Crash` card (`data.name`) to `crash-pile` with `relocate(state, [id], 'crash-pile', game)`, and mount with that `initial`.
- **The Crash.** `cardsIn('crash-pile')` is one face-up card whose `parseTextFaceKey(faceKey)!.name` is `Market Crash`.
- **The round.** Press `End your actions` three times (the tabs follow the turn).
- **The end.**
  - The status is `seat: ${T} — Game over — p0, p1 and p2 win (p0 -1, p1 -1, p2 -1)`. Each player has 7 capital, which is 1 point, and a Tier 1 card in the backlog, which is −2.
  - No tab's name ends in `— to act`, and T's tab is still selected.

- [ ] **Step 2: Run** `bunx vitest run src/pages/designer/playtest-fitted.test.tsx`. Expected: PASS. A failure is a bug in Tasks 1–3's code, not in these numbers: fix it there.

- [ ] **Step 3: The browser check.** Write throwaway scripts in `SCRATCH=<your scratchpad>/browser-1a2`, never in the repo.
  1. `mkdir -p "$SCRATCH"`.
  2. Start the dev server in the background: `cd /home/user/turnhout && bunx vite --port 5173 --strictPort`. It is `package.json`'s `dev` script with the port fixed. Poll `curl -sf http://localhost:5173/` until it answers; don't use a foreground sleep.
  3. Write `$SCRATCH/zones.ts` and run `bun "$SCRATCH/zones.ts" "$SCRATCH"`. Absolute imports into the repo work under Bun, as checked while writing this plan.
     - It writes `zones.json`, the fitted layout of each viewer of a 3-player game.
     - It writes `variant.rules`, the sample with the two Setup lines removed. It throws if either line was not found.

```ts
import { readFileSync, writeFileSync } from 'node:fs';
import { compileGame } from '/home/user/turnhout/src/engine/core/lang/compile';
import { createDefaultLibrary } from '/home/user/turnhout/src/engine/core/lang/library';
import { fittedLayout } from '/home/user/turnhout/src/engine/core/lang/fit-layout';
const dir = process.argv[2];
const text = readFileSync('/home/user/turnhout/src/games/startup-simulator.rules', 'utf8');
const game = compileGame(text, createDefaultLibrary()).game!;
const zones = Object.fromEntries(['p0', 'p1', 'p2'].map((v) => [v, Object.fromEntries(fittedLayout(game.zones, v).map((z) => [z.id, z.transform]))]));
writeFileSync(`${dir}/zones.json`, JSON.stringify(zones, null, 2));
const cut = ['  Shuffle the growth deck.\n', '  The market crash goes into the bottom fifth of the growth deck.\n'];
if (!cut.every((line) => text.includes(line))) throw new Error('the Setup lines moved');
writeFileSync(`${dir}/variant.rules`, cut.reduce((t, line) => t.replace(line, ''), text));
```

  4. Write `$SCRATCH/check.cjs` (CommonJS: `require('playwright')`) and run it:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers NODE_PATH=/opt/node22/lib/node_modules node "$SCRATCH/check.cjs" "$SCRATCH"
```

  - **Browser setup.**
    - Launch `chromium` with `args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']`. That draws the WebGL canvas headless, as checked while writing this plan.
    - Use a viewport of `{ width: 1600, height: 2600 }`. A drag must land inside the viewport, and the canvas sits below the editor.
    - Collect `pageerror` and console errors. There must be none.
  - **Geometry.** These are the only fiddly parts; everything else goes through roles and labels.

```js
// World → screen: the fitted canvas is 1200 × 900 and shows the 1600 × 1200 world, centred.
async function at(page, wx, wy) {
  const b = await page.locator('canvas').boundingBox();
  const k = b.width / 1600;
  return { x: b.x + (wx + 800) * k, y: b.y + (wy + 600) * k };
}
// Card i of n in a fitted row at z (spacing 75, squeezed into 400): grab the strip the next card leaves showing.
function rowCard(z, i, n) {
  const s = n > 1 ? Math.min(75, 300 / (n - 1)) : 75;
  const cx = z.x + (i - (n - 1) / 2) * s;
  return { x: i < n - 1 ? cx - 50 + s / 2 : cx, y: z.y };
}
async function drag(page, from, to) {
  const a = await at(page, from.x, from.y), b = await at(page, to.x, to.y);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 }); await page.mouse.up();
  await page.waitForTimeout(400);
}
```

  - **Who and how many.**
    - The seat to act is the first word of the `tab` whose name ends in `— to act`.
    - Its zones are `zones[seat]`.
    - A zone's card count is on the tableau lines (`bench 6`), or follows from the game (the agency row holds 4, a market 2).

  - **Session A: the sample at 3 players.**
    - **Start.** Open `http://localhost:5173/#designer`. Select `Startup Simulator` in `Load sample`, wait for `No problems found.`, select `3` in `Players`, and press `Play`.
    - **`01-start.png`** (full page), at the start. It must show:
      - three tabs, the start player's reading `pS — to act` and selected;
      - one status line, `seat: pS — Your turn — Spend 3 actions…`;
      - three tableau lines `pN 7 capital, 3 actions · bench 3 · backlog 1 · research 0`, one ending `· start player`;
      - on the canvas, two lines of shared zones across the top, each named above it:
        - talent deck, agency row with 4 face-up cards, open job market as an empty slot, seed deck, growth deck;
        - seed market and growth market with 2 each, open idea pool, crash pile, box;
      - along the bottom, the seat's bench (3 Juniors), backlog (1 card) and an empty research slot;
      - no other seat's zones;
      - every card name legible and clear of its three detail lines.
    - **Hover.** Point at the agency row's last card.
    - **`02-hover.png`.** Under the canvas, the hover line names that card with all of its columns, ending with its trait.
    - **Cleanup.** The seat to act presses `Recruit a junior software dev` three times.
    - **`03-cleanup.png`.** The status shows the bench cleanup hint. Six bench cards sit squeezed inside their slot, short of the backlog.
    - **The next seat.** Drag the bench's last card to the open job market's centre.
    - **`04-next-seat.png`.** The next seat's tab is selected and `— to act`, its own strip is along the bottom, and the open job market holds the card.
    - **Hiring.** This seat drags the open job market's card to its bench. Then it tries the agency row's cards from the last to the first, dragging each to its bench, until its tableau line shows `bench 5`.
    - **Research.** It presses `Research the seed deck`.
    - **`05-research.png`.** The status reads `… — research — Your turn — Keep one…`, and the research slot shows 3 face-up cards.
    - **Another seat during Research.** Click another seat's tab.
    - **`06-research-rival.png`.** There are no research cards anywhere on the canvas, and the researcher's tableau line says `research 3`.
    - **Keeping a card.** Click the researcher's tab and drag its research row's last card to its backlog. If it is still to act, press `End your actions`. The third seat's tab is now selected.
    - **The third seat.** It drags the seed market's last card to its backlog, then presses `End your actions`.
    - **`07-round-two.png`.** The start player's tab is selected again. The open idea pool holds 2 cards, and the seed market 2.
  - **Session B: the variant with the Crash on top.**
    - **Start.** Fill `Rules` with `variant.rules`, wait for `No problems found.`, select `3` and press `Play`.
    - **`08-crash.png`.** The crash pile shows the Market Crash face up, and the growth market 2 other cards.
    - **The round.** Press `End your actions` three times, each time on the seat that is to act.
    - **`09-game-over.png`.** The status reads `seat: pX — Game over — p0, p1 and p2 win (p0 -1, p1 -1, p2 -1)`, and no tab says `to act`.
  - **Session C: no change for a game that fits.**
    - Load `Color Match`, select `3` and press `Play`.
    - **`10-color-match.png`.** Three seat panels as before, no tabs and no zone names.
  - **Afterwards.**
    - Open every screenshot (Read the PNG) and check it against its list.
    - If the canvas is blank, look at the collected console errors for WebGL before suspecting the page.
    - If a name overlaps its details, adjust `labelStyleOf`'s 14/12 sizes or its `y`, never the 24-point case, and rerun Task 3's tests.
    - Stop the dev server.

- [ ] **Step 4: Update the README.**
  - In *Designing a game*, the **Play** bullet: after "It puts every seat on one screen", add "(or one seat at a time, see below)".
  - After 1a-1's **Card games with turns** paragraph, add a **A table too big for one screen** paragraph:
    - **When.** When a game's zones don't fit the table, the playtest shows one seat at a time, with a tab for each seat. The tabs jump to the seat that must act when the turn moves on, Undo included.
    - **The table.** The shared zones wrap onto lines across the top, each named. The seat's own zones run along the bottom. A row squeezes its cards to stay in its place.
    - **The other seats.** Every player's line shows their numbers, how many cards each of their zones holds, and the start player.
    - **Faces.** A card face shows its name and its first three columns, so a card table puts its key columns first. Pointing at a card shows all of it under the table.
    - **Startup Simulator** plays this way.

- [ ] **Step 5: Run** `bun run test` and `bun run typecheck`. Then run these four checks; each must print nothing.

```bash
# Startup Simulator's words in shared code
git diff "$BASE" -- src/engine src/pages src/utils ':!*.test.ts' ':!*.test.tsx' | grep '^+' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool)\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# no existing test line changed or removed
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/designer/playtest-fitted.test.tsx README.md
git commit -m "feat(designer): Startup Simulator's round, Crash and shared win played through the page, and the README's fitted table"
```
