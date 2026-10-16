# Startup Simulator Slice 1b-3 (The Board on the Page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The fitted playtest page shows each seat's Board. The viewer's own Board sits on the canvas, with each project's staff stacked under it and its cubes shown as "Blue 3/6, Red 0/0". Every seat's Board is listed as DOM text under its tableau line, and Market Share is among the counters. Cards are picked by clicking them on the canvas: click a card, see the buttons that can take it, click a target, confirm a set. The scouting row shows in the private strip during Source. Hearts' clicks and drags are pinned unchanged, and the slice is checked in Chromium.

**Architecture:**
- **This is plan 1b-3 of three** (spec R9). It runs after plans 1a-1, 1a-2, 1b-1 and 1b-2 are complete. It takes their interfaces as given; see "Assumed from earlier plans" below, which the executor checks before Task 1. No rule, phrase or rules-text line changes here.
- **Nothing in this plan knows Startup Simulator.** The page works only from what the game declares:
  - its zones' visibility and `onCards` mark (1b-2);
  - each card's holder (`data['lang:on']`, 1b-2);
  - its declared card counts and table columns;
  - its buttons' card-pick views (`ActionView.cards`, 1b-1).
- **The pieces, by layer:**
  - **Core layout** (`lang/fit-layout.ts`, pure). On a fitted table, the viewer's public per-player zones get a band of their own, between the shared lines at the top and the private strip at the bottom. Their slots are tall. A zone where every card sits on a card gets no slot: its cards are given positions under their holders by `stackOnHolders`, through the existing `'free'` layout.
  - **Shared rendering** (`pixi/card-sprite.ts`, `pixi/pixi-table.ts`, `react/card-table.tsx`, `utils/init-app.ts`). A page may put a *decor* on any card: a ring (`'choice'` or `'chosen'`) and a caption under it. A page that passes none (Hearts, the four games) draws exactly as before.
  - **Page** (`src/pages/designer`):
    - pure helpers that read counts against columns and list a seat's public cards (`board-text.ts`);
    - one pick state that the DOM picker and canvas clicks share (`card-pick.ts`);
    - an offer of the buttons that take a clicked card (`card-offer.tsx`);
    - the wiring in `playtest.tsx` and `tableaux.tsx`.
- **No change under `src/engine/input`.** Clicks already reach the page: a press and release that moves at most 5 world units calls `onCardClick` (builder check B1). The overview's Hearts check for clicks becomes guard tests that drive the real tracker over Hearts' table (Task 4).
- **Calls this plan makes** (the spec leaves them open; "how the page lays out attached staff and cubes" is the builder's):
  - **The band.** On a fitted table, the viewer's per-player zones split three ways:
    - *private* (visibility not `public`) are packed from the bottom, as 1a-2 packs all of them today;
    - *board* (public, no `onCards`) are packed in lines from just under the shared lines, and share the height left between;
    - *attached* (`onCards`) get no slot.

    A viewer with no public per-player zone gets 1a-2's layout unchanged, so 1a-2's layout tests pass as they are. Startup Simulator's band is one line (development, operations, ops team) 416 tall. Scouting joins bench, backlog and research in the private strip, on a second line.
  - **Stacks.** Cards on a card hang under it in a column at its x, in slot order. The first starts `STACK_GAP = 36` below the holder's bottom edge, which leaves room for the caption. Each next one is `STACK_STEP = 34` lower and drawn over the one above, which leaves its top strip (the corner index) showing. When the column would pass the bottom of the holder's slot, the steps shrink evenly to fit. Board rows space their cards `BOARD_SPACING = 110` apart (squeezed to the 400 slot), so the columns don't overlap.
  - **The attached zone's def** has layout `'free'`, no label and no bounds. It sits at the first board zone's transform and comes last in the def list. So its staff draw above everything, a drop on a stack lands in that zone, and an empty one's outline hides behind the board slot's middle card.
  - **Counts against columns.** A declared card count is shown against a table column when both names start with the same words, all but their last: `blue cubes` against `blue cost` reads `Blue 3/6`. When several columns match, the first in the card's data order wins (`blue cost` before `blue maint`). A count whose name is another count's name with words in front (`new blue cubes`) rides beside it, and only when it isn't 0: `Blue 3/6 +4 new`. Other counts show only on the hover line. In 1b, Generate and Commit run in one cascade, so new cubes are always 0 between moves. The rider is built and unit-tested for slice 9's Audit window.
  - **Captions only on the Board.** A canvas caption goes on cards in public per-player zones (not `onCards` ones), one part per line. A seed market product shows no caption.
  - **Decor and canvas clicks only for a game with a card-pick button.** So Hearts, Color Match, Venom and Rent Day get neither prop, and look and play as before.
  - **Every seat's Board as text, the viewer's too.** The text goes under each tableau line, as 1a-2 lists every tableau. The tableau line itself stops naming public cards (`entryFor(…, false)`), since the Board line names them.
  - **Market Share needs nothing new.** It is a counter (1b-2), so 1a-2's tableau line already shows `0 market share`. A page test pins it after a real Income.
  - **Clicking:**
    - A card is offered every button whose view lists it as a candidate, live or greyed with that card's verdict, even when only one button takes it. That keeps a stray click from pressing anything.
    - A card no button takes flashes `No button takes this card now.`
    - While a picker is open (opened from a DOM button or from an offer), canvas clicks go to it. The DOM picker and the canvas share one state.
    - **A shortcut for a set with a target.** Clicking a target straight after picking the set acts as `Confirm`, then that target. A click on a card that is neither a candidate nor a target refuses with the picker's prompt.
    - Canvas clicks work on any page whose game has a card-pick button, fitted or not.
  - **A wobbly click.** In a game with card-pick buttons, a drop back on the card's own zone that no rule covers counts as a click on that card. Elsewhere it stays silent, as today.
  - **Rings.** `'choice'` is amber (`0xf59e0b`, 3 wide) and `'chosen'` green (`0x22c55e`, 5 wide), 4 outside the card's edge. A caption is 13-point bold `0xf3f4f6`, centred 4 under the card's bottom edge, with line height 15.
  - **Scouting** is placed whenever the game declares it (an empty slot outside Source), as 1a-2 places research.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19, PixiJS 8; Playwright (global install, Chromium in `/opt/pw-browsers`) for the browser check.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-1b-building-design.md` (binding: "The page", R1, R3 and R9's plan 1b-3), under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md` (binding: "The page", "Keep in view", and the constraint that clicking a card needs a no-regression check on Hearts). The evidence is `builder-check-startup-1b.md` B1.6 (canvas clicking), B3 (holders and hidden data) and B11. The page base is plan 1a-2 (`2026-10-16-startup-slice-1a-2-the-page.md`), whose browser-check method this plan reuses.

## Global Constraints

- **Controller amendment (pre-flight, after plans 1a-2, 1b-1 and 1b-2 were built).** The scan is in the plan's SDD
  workspace (`preflight.md` §3, rulings C1–C18 and F1–F3); each task's brief carries its rulings. In short:
  - **C1, C2, C10 (Task 4).** The picker keeps 1b-1's built behaviour: a picked card always unpicks; a target with no
    verdict for a picked card stays allowed; picks are pruned to the live view and the pruned value is written back; one
    `sendPick` closes the picker only once the press is taken (a set refused as a whole keeps its picks, on the list and
    on the canvas); `openPicker`/`closePicker` reset the pick state where picking is set, not in an effect.
  - **C3, C4 (Task 4).** The out-of-turn test arranges a card in O's development; the CARD_PICK_GAME money line lists the
    case cards.
  - **C5, C6, C13 (Task 3).** A face-down project's staff stay listed with it (slice 9 R3); "the first column wins"
    expects `['Red 1/2']`; a one-word count has no column; `cardLabel` uses `pickName`.
  - **C7 (Tasks 1, 3).** Zones are "attached" only when `onCards === 'every'`; a card with a holder is listed only under
    its holder; the cards on a card are ordered by Table index, seat, slot (slices 4, 7 and 8 add other marks and
    cross-seat holders).
  - **C8, C9, C17 (Task 5).** Click N's tab before N ends its actions; the browser helper uses 105 in the strip and 110
    on the board; re-read 1b-2's committed labels before writing the browser check.
  - **C11 (Task 4).** `showsCards` also holds when a button picks cards (1b-1's parked m6).
  - **C12.** Import Hearts from `@/pages/hearts-demo/cards` and `/game`; the directory is protected.
  - **C14, C15, C16.** Shared test helpers at module level; new names in new import lines; Task 4's memo inputs widen.
  - **C18 (parked items).** Task 1's "fits" checks close 1a-2's top/bottom-lines guard (plus: every board row is at least
    `CARD_HEIGHT` tall); a wrapped zone name stays parked to the first game that needs one; `PickCardView.detail` is
    closed (canvas rings and stacks tell staff apart); worked flags in the card view move to plan 3-2.
  - **Start and BASE.** Task 1 starts after plan 1b-2's final fix wave; `BASE` is recorded then.

- **Hard constraints (verbatim):**
  - Protected files must not change: `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, and anything under `src/pages/hearts-demo/**`.
  - The core is pure: no pixi/react/DOM imports in `src/engine/core/**`, no `Math.random` or `Date.now`.
  - No Startup Simulator words in shared code (capital, talent, agency, junior, backlog, growth, crash, vaporware, university, bench, ideation, startup, research, recruit, product, job market, idea pool, "seed" meaning a deck/market/card/product, greenlight, launch, pivot, salary, payroll, project, cube, ops, operations, onboarding, scouting, market share); the page works from the game's declared zones, holders, counts and buttons.
  - Hidden information: a holder key or a count on a card the viewer can't see never reaches that viewer's scene or DOM.
  - Hearts, Color Match, Venom and Rent Day look and play as before; Hearts' clicks and drags behave as before (a no-regression test); existing page tests change only where 1b-1/1b-2 already changed the Startup Simulator text.
  - `bun run typecheck` clean; full `bun run test` passes. The browser check uses the pre-installed Chromium (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; never `playwright install`), screenshots into the scratchpad `/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/`, not the repo.
- **Where the banned words may appear.** They may appear only in:
  - `src/games/startup-simulator.*`;
  - `src/pages/designer/samples.ts`, `designer-page.test.tsx`, `playtest-fitted.test.tsx` and `tableaux.test.ts`;
  - README and docs.

  They may not appear anywhere else under `src/engine`, `src/pages`, `src/utils` or `src/app-components.ts`, comments included. New fixtures use 1b-2's general words (workshop, crew, idle, stash, hall, job, Vase, Potter) and 1b-1's (shop, stash, case, Ruby, Opal). Never name anything `ops`, `project`, `cube` or `source`.
- **State and moves.** No new `state.data` keys and no new move fields. Decor and stack positions exist only in what the page hands the canvas, never in game state.
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1, record `BASE=$(git rev-parse HEAD)` and run `bun run test` once to get the passing count.
- **No new dependencies.** Playwright is used from its global install, outside the repo.
- **Existing tests.**
  - No existing test line changes in this plan. New tests are appended to existing files or go in new files.
  - If an existing test fails, stop and report it instead of changing it.
- **Page copy (exact):**
  - **The offer:** `<div role="group" aria-label="Card buttons">`. It shows `{card name}:`, then one `<button type="button">` per button that takes the card, with that button's label. A greyed one has `aria-disabled="true"` and the card's verdict as its `title`. Then `Cancel`.
  - **A card nothing takes** flashes `No button takes this card now.`
  - **A seat's Board line** is `<div data-testid="board-{seat}">` right under the seat's tableau line, drawn only when non-empty. Its text is one part per public per-player zone with cards, in Table order, joined by ` · `. Each part is `{zone}: {cards}`, the cards joined by `; `. Each card reads `{name}{ (flags)}{ [counts]}{ with {cards on it}}`, for example:
    `development: Dating App [Blue 4/6, Red 0/0] with Junior Software Dev and Architect (onboarding) · operations: To-Do List [Blue 4/4, Red 0/0] · ops team: QA Engineer`
  - **Count parts** read `{Leading words, first letter capitalized} {count}/{column}`, with ` +{n} {extra words}` per rider that isn't 0. They are joined by `, ` in text (`Blue 3/6 +4 new, Red 0/0`) and by a newline in a canvas caption.
- **Style and commits.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefixes `feat(layout):`, `feat(pixi):`, `feat(designer):`.
  - Stage files by path, never `git add -A`.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit. Guard tests that pin today's behaviour pass before the change, and say so.

## Review Focus

- **A card that leaves while it is offered or picked.** For example, an Undo of the hire that brought it to the bench. It drops out of the picker and its ring goes, and `Confirm` never sends it. An offer whose card no button takes any more closes, and pressing any DOM button closes it too. Tests in Task 4.
- **Clicking out of turn, or a card nothing takes.** On a seat that isn't to act, the offer lists its buttons greyed with `It's p0's turn.`. Choosing one explains and sends nothing. A face-down deck card flashes `No button takes this card now.`. Tests in Task 4.
- **A click that wobbles into a short drag.** A drop back on the card's own zone acts as the click in a game whose buttons pick cards, and on a staff card in a stack too. Color Match's same-zone drop stays silent (its existing test). Test in Task 4.
- **Many cards on one card.** Eight, or twenty, staff on one holder stay inside its slot, above the private strip, with even steps. Test in Task 1.
- **Hidden data.** A count or a holder key on a card in a zone the viewer can't see never reaches the viewer's scene, canvas, captions or Board text, and neither does the card's name. Tests in Task 3.

## Assumed from earlier plans (check before Task 1)

None of these is built as this is written. Plan 1a-1 is in progress, and 1a-2, 1b-1 and 1b-2 have not started. Before Task 1, check each item below. If one is missing or differs, stop and report it.

- **1a-2, every task committed:**
  - `src/engine/core/lang/fit-layout.ts` with `fitsTable(zones, seats)` and `fittedLayout(zones: ZoneSpec[], viewer: PlayerId): ZoneDef[]`. Its constants are `ROW_SLOT = 400`, `GAP = 20`, `LINE_WIDTH = 1560`, `MARGIN = 20`, `LABEL_ROOM = 24` and `LINE_GAP = 16`. Shared zones are packed from the top, the viewer's zones from the bottom, a row's def has `layoutOptions: { spacing: 75, maxWidth: 400 }` and `bounds: { width: 400, height: 140 }`, and every slotted def has `label`.
  - `TABLE_BOUNDS` in `scene.ts`, `LayoutOptions.maxWidth`, `ZoneDef.label` and `ZoneState.label`, zone names drawn by `PixiTable`, and `zoneDef` and `HAND_BOUNDS` exported from `auto-layout.ts`.
  - `src/pages/designer/tableaux.tsx`: `tableauLine(game, board, cards, seat)` and `Tableaux({ game, seats, board, cards })`. `entryFor(board, seat)` is exported from `board-controls.tsx`.
  - `playtest.tsx`'s fitted page: `SeatTabs`, one `SeatCanvas` keyed on the selected seat with `fitted` and `onTurn`, a placement kept to the fitted defs' zones, `CardTable` with `onHover`, and the `card-detail` hover line.
  - `src/pages/designer/playtest-fitted.test.tsx` with the scaffold (`table`, the last `CardTableProps`; `mount`, `cardsIn`, `lineOf`, `status`, `press`, `drop`, `hint`, `startOf`, `after`, `SEED = 1`).
- **1b-1, every task committed:**
  - `board-view.ts`:
    - `PickCardView = { id; name; allowed: true | string }`;
    - `CardPickView = { some; prompt; cards: PickCardView[]; onto: { prompt; targets: { [cardId]: PickCardView[] } } | null }`;
    - `ActionView.cards?`.
  - `DeclaredAction.pick` (with `onto`).
  - `card-picker.tsx`'s `CardPicker({ pick, onSend, onRefused, onCancel })`, keeping its own state, and its tests.
  - `SeatCanvas`'s `picking` and `choosingCards`.
  - `CARD_PICK_GAME` (with show and trade) in `testing.ts`.
  - The `picker`, `pickFirst` and `pickNamed` helpers in `playtest-fitted.test.tsx`.
- **1b-2, every task committed:**
  - `ZoneSpec.onCards?: 'every'` and `HOLDER_KEY = 'lang:on'` (`zones.ts`).
  - `attach.ts`'s `holderIdOf(card)` and `putOn(state, cardIds, zoneId, holderId, game)`.
  - `CREW_GAME` in `testing.ts`.
  - Startup Simulator's Board: zones `development-pN`, `operations-pN`, `development-team-pN` (`onCards`), `ops-team-pN` and `scouting-pN` (owner), with the per-player Table order bench, backlog, research, development, operations, development team, ops team, scouting. Its phases include `sourcing`, its counts are `blue cubes`, `red cubes`, `new blue cubes` and `new red cubes`, and its flag is `onboarding`.
  - Its buttons, labelled as 1b-1's `actionLabel` makes them:
    - `Greenlight a card in your backlog`;
    - `Assign some cards from your bench to a card in your development` and `… to your ops team`;
    - `Launch a card from your development to your operations` and `Pivot a card in your development`;
    - `Lay off some cards from your bench to the open job market`;
    - `Hire a card from the agency row to your bench`, `… to a card in your development` and `… to your ops team`;
    - `Hire some cards from your scouting to your bench` (and its two siblings) and `Pass on the rest`.
  - Its tableau lines read `pN 7 capital, 3 actions, 0 market share · bench 3 · backlog 1 · research 0 · development 0 · operations 0 · development team 0 · ops team 0 · scouting 0`.
  - The start player's first turn starts in actions once Income skips at $0.

---

### Task 1: The Board's place on a fitted table

**Files:**
- Modify: `src/engine/core/lang/fit-layout.ts`
- Test: `src/engine/core/lang/fit-layout.test.ts` (append), `src/pages/designer/playtest-fitted.test.tsx` (append: the real game's places)

**Interfaces:**
- Consumes 1a-2's `fittedLayout`, its constants and `zoneDef`; 1b-2's `ZoneSpec.onCards` and `holderIdOf`; `computeZoneLayout`, `placeZone` and `cardsByZone`.
- **`fittedLayout(zones, viewer)`, extended.** The viewer's per-player zones split into private (visibility not `public`), board (`public`, no `onCards`) and attached (`onCards`).
  - **Private zones** are packed from the bottom exactly as 1a-2 packs the viewer's zones.
  - **The band.**
    - `bandTop` is the last shared line's bottom `+ LINE_GAP + LABEL_ROOM`, or `TABLE_BOUNDS.min.y + MARGIN + LABEL_ROOM` with no shared zones.
    - `bandBottom` is the highest private line's top `- LABEL_ROOM - LINE_GAP`, or `TABLE_BOUNDS.max.y - MARGIN` with no private zones.
  - **Board lines.** Board zones are packed into lines as 1a-2 packs (Table order, `LINE_WIDTH`, `GAP`, 1a-2's slot widths, each line centred on x 0).
    - With `L` lines, each is `H = Math.floor((bandBottom - bandTop - (L - 1) * (LINE_GAP + LABEL_ROOM)) / L)` tall.
    - Line `k`'s top is `bandTop + k * (H + LINE_GAP + LABEL_ROOM)`.
    - A board zone's `transform.y` is its line's top plus half its 1a-2 slot height, so its cards sit at the top of the line.
  - **A board row's def** is 1a-2's row def with `layoutOptions: { spacing: BOARD_SPACING, maxWidth: ROW_SLOT }` and `bounds: { width: ROW_SLOT, height: H, anchor: { x: 0.5, y: CARD_HEIGHT / 2 / H } }`, so its box runs from the line's top to `top + H`. A board pile or hand keeps 1a-2's def.
  - **An attached zone's def** is `{ ...zoneDef(spec, id, at, viewer), layout: 'free' }` without `layoutOptions`. `at` is the first board def's transform, else `{ x: 0, y: 0 }`. It has no `bounds` and no `label`.
  - **Order:** the private and board defs in Table order, then the shared defs, then the attached defs.
  - A viewer with no public per-player zone gets exactly 1a-2's result.
- `export const BOARD_SPACING = 110`, `export const STACK_GAP = 36`, `export const STACK_STEP = 34`.
- **`export function stackOnHolders(defs: ZoneDef[], cards: CardState[]): CardState[]`:**
  - **Holder poses.** For each def whose layout isn't `'free'`, the pose of each of its cards is `computeZoneLayout(def, <its cards in slot order>)`.
  - **Each `'free'` def's cards,** in slot order, are grouped by `holderIdOf`. For a holder with a pose `(hx, hy)` in def `d`:
    - `room = <placeZone(d, d's cards) bottom> - (hy + CARD_HEIGHT + STACK_GAP) - CARD_HEIGHT / 2`;
    - `step = n > 1 ? Math.min(STACK_STEP, Math.max(0, room) / (n - 1)) : STACK_STEP`;
    - card `k` of `n` becomes a copy with `data: { ...data, x: hx, y: hy + CARD_HEIGHT + STACK_GAP + k * step }`.
  - Every other card, including one whose holder has no pose, is returned as the same object. The result keeps `cards`' order.

- [ ] **Step 1: Write the failing tests.**

In `fit-layout.test.ts`, add `describe('a band for the seat's public zones')` on this fixture. Its numbers follow from 1a-2's constants and were worked out while writing this plan.

```ts
const BOARD: ZoneSpec[] = [
  { name: 'stock', perPlayer: false, layout: 'pile', visibility: 'secret' },
  { name: 'stall', perPlayer: false, layout: 'row', visibility: 'public' },
  { name: 'stash', perPlayer: true, layout: 'row', visibility: 'owner' },
  { name: 'peek', perPlayer: true, layout: 'row', visibility: 'owner' },
  { name: 'workshop', perPlayer: true, layout: 'row', visibility: 'public' },
  { name: 'crew', perPlayer: true, layout: 'row', visibility: 'public', onCards: 'every' },
  { name: 'idle', perPlayer: true, layout: 'row', visibility: 'public' },
];
```

- **Ids.** `fittedLayout(BOARD, 'p1')` ids are `['stash-p1', 'peek-p1', 'workshop-p1', 'idle-p1', 'stock', 'stall', 'crew-p1']`.
- **Places:**
  - stock `{ x: -210, y: -486 }` and stall `{ x: 60, y: -486 }`;
  - stash `{ x: -210, y: 510 }` and peek `{ x: 210, y: 510 }`;
  - workshop `{ x: -210, y: -306 }` and idle `{ x: 210, y: -306 }`;
  - crew `{ x: -210, y: -306 }`.
- **Board rows.**
  - workshop and idle have `label` their name, `layoutOptions` `{ spacing: 110, maxWidth: 400 }`, and `bounds` `{ width: 400, height: 776, anchor: { x: 0.5, y: 70 / 776 } }`.
  - `placeZone(workshop, [])` spans y −376 to 400.
- **The attached def.** crew has `layout: 'free'`, `owner: 'p1'` and `visibility: 'public'`. `'label' in crew`, `'bounds' in crew` and `'layoutOptions' in crew` are all false.
- **Two board lines.** BOARD plus public per-player rows `shelf`, `rack` and `bin`:
  - each board row's bounds height is 368;
  - workshop, idle and shelf are at y −306;
  - rack is at `{ x: -210, y: 102 }` and bin at `{ x: 210, y: 102 }`.
- **No public zone, no change.** 1a-2's `MARKET` tests in this file pass unchanged (no new assertion needed; run them).
- **Review Focus: fits.** For viewers p0 to p4, with `slotted` the defs that aren't `'free'`:
  - every `slotted` box (rows holding 8, piles 40) lies inside `TABLE_BOUNDS`;
  - no two `slotted` boxes overlap;
  - `unreachableZones(fittedLayout(BOARD, v), 7)` is `[]`. The crew def is last, so a drop at its transform lands in it.

Add `describe('cards stacked under the card they sit on')`. Its cards are `fixtureCard`s on `fittedLayout(BOARD, 'p1')`:
- `j1` (slot 0) and `j2` (slot 1) in `workshop-p1`;
- `w1` on j1 (slot 0), `w2` on j2 (slot 1) and `w3` on j1 (slot 2) in `crew-p1`, each with `'lang:on'`;
- `s1` in `stash-p1`.

The tests:
- **Under the holder.**
  - w1 gets `{ x: -265, y: -130 }`, w3 `{ x: -265, y: -96 }` and w2 `{ x: -155, y: -130 }`.
  - w1 keeps its `'lang:on'`.
  - j1, j2 and s1 come back as the same objects (`toBe`).
  - The result's ids are in the input's order.
- **Read by the free layout.** `computeZoneLayout(crewDef, <the result's crew cards>)` poses have exactly those x and y.
- **No holder on the table.** A crew card on `'c999'` comes back as the same object.
- **Review Focus: many on one.** With 20 cards on j1:
  - every x is −265, and the y steps are all `460 / 19`;
  - the last card's `y + 70` equals 400, the workshop box's bottom (`toBeCloseTo`).

  With 2 on j1 the step is 34.

In `playtest-fitted.test.tsx`, append `describe('the Board's place on the table')` on the real game, for viewer p1:
- bench `{ x: -420, y: 510 }`, backlog `{ x: 0, y: 510 }`, research `{ x: 420, y: 510 }` and scouting `{ x: 0, y: 330 }`;
- development `{ x: -420, y: -126 }`, operations `{ x: 0, y: -126 }` and ops team `{ x: 420, y: -126 }`, each with bounds height 416;
- development team `'free'` at `{ x: -420, y: -126 }`, last in the list;
- the Review Focus fit checks above pass for viewers p0 to p4. The layout depends only on the viewer, so this covers 2 to 5 seats.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/fit-layout.test.ts src/pages/designer/playtest-fitted.test.tsx`. Expected: the new tests FAIL, and the existing ones pass.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the two files, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/fit-layout.ts src/engine/core/lang/fit-layout.test.ts src/pages/designer/playtest-fitted.test.tsx
git commit -m "feat(layout): a fitted table gives the seat's public zones a band of their own, and cards on a card hang under it"
```

---

### Task 2: A ring and a caption a page can put on a card

**Files:**
- Modify: `src/engine/core/scene.ts` (`CardDecor`), `src/engine/pixi/card-sprite.ts`, `src/engine/pixi/pixi-table.ts`
- Modify: `src/engine/react/types.ts`, `src/engine/react/card-table.tsx`, `src/app-components.ts`, `src/utils/init-app.ts`
- Test: `src/engine/pixi/card-sprite.test.ts` (append), `src/engine/pixi/pixi-table.test.ts` (append), `src/engine/react/card-table-decor.test.tsx` (new)

**Interfaces:**
- **`scene.ts`:** `export type CardDecor = { ring?: 'choice' | 'chosen'; caption?: string }`.
- **`CardSprite.setDecor(decor: CardDecor | null): void`.** It keeps at most one child of each kind, added after the two face sprites, so it moves, turns and stacks with the card.
  - **The ring** is a `Graphics` labelled `card-ring`: `roundRect(-CARD_WIDTH / 2 - 4, -CARD_HEIGHT / 2 - 4, CARD_WIDTH + 8, CARD_HEIGHT + 8, 10)`. Its stroke is `{ color: 0xf59e0b, width: 3 }` for `'choice'` and `{ color: 0x22c55e, width: 5 }` for `'chosen'`. It is redrawn when the kind changes.
  - **The caption** is a `Text` labelled `card-caption`: style `{ fontSize: 13, fontWeight: 'bold', fill: 0xf3f4f6, align: 'center', lineHeight: 15 }`, anchor `(0.5, 0)`, at `(0, CARD_HEIGHT / 2 + 4)`.
  - A missing part is removed and destroyed.
- **`PixiTable.setDecor(decor: { [cardId: string]: CardDecor }): void`.**
  - It stores the map and calls `setDecor(decor[id] ?? null)` on every sprite.
  - `setScene` gives each sprite it creates its stored decor.
  - A table never given decor never calls `CardSprite.setDecor`.
- **`CardTableProps.decor?: { [cardId: string]: CardDecor }`.** `CardTable` calls `app.setDecor(props.decor)` in an effect on `[app, props.decor]`, only when `props.decor !== undefined`. So a page that passes none, and the existing test's mock app without `setDecor`, see no call.
- **`AppComponents.setDecor(decor: { [cardId: string]: CardDecor }): void`.** `init-app.ts` wires it to `pixiTable.setDecor`.

- [ ] **Step 1: Write the failing tests.**

In `card-sprite.test.ts`, append `describe('decor')`. `kids(s, label)` is `s.children.filter((c) => c.label === label)`.
- **Both parts.** `setDecor({ ring: 'chosen', caption: 'Blue 3/6\nRed 0/0' })` gives one `card-ring`, whose `context.bounds.width` is 113 (108 + the stroke), and one `card-caption`. The caption's text is the caption, its `y` is 74 and its `anchor.y` is 0.
- **Changing.** Then `setDecor({ ring: 'choice' })` leaves one ring, width 111, and no caption. `setDecor(null)` leaves neither. The sprite has 2 children again.
- **No pile-up.** The same decor set twice gives one of each.

In `pixi-table.test.ts`, append `describe('decor')`, with `createSprite` pushing each new sprite onto `made` (creation order is scene order):
- `setScene(scene(['a', 'b']))`, then `setDecor({ a: { caption: 'x' } })`: `made[0]` has a `card-caption` with text `x`, and `made[1]` has none.
- `setScene(scene(['a', 'b', 'c']))`: `made[0]` keeps its caption, and `made[2]` has none.
- `setDecor({ c: { ring: 'choice' } })`: `made[0]` has no caption, and `made[2]` has a `card-ring`.
- **Hearts, as before (guard; passes today).**
  - Feed a `PixiTable` the scene `deriveScene(TABLE, { cards: createHeartsServer(42).viewFor('p0').scene.cards })`, with `TABLE` and `createHeartsServer` from `@/pages/hearts-demo`, and never set decor.
  - Every made sprite has exactly 2 children.
  - No descendant of the table is labelled `card-ring` or `card-caption`.

In the new `card-table-decor.test.tsx`, mock `useApp` as `{ setTable, setIntents, setDecor }` with spies:
- with `decor={{ a: { ring: 'chosen' } }}`, `setDecor` is called with that object;
- without `decor`, `setDecor` is never called.
- The existing `card-table.test.tsx` passes unchanged. Its mock has no `setDecor`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/pixi src/engine/react`. Expected: the new decor tests FAIL. The Hearts guard and the existing tests pass.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/engine/pixi src/engine/react src/pages/hearts-demo`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/scene.ts src/engine/pixi/card-sprite.ts src/engine/pixi/pixi-table.ts src/engine/react/types.ts src/engine/react/card-table.tsx \
  src/app-components.ts src/utils/init-app.ts src/engine/pixi/card-sprite.test.ts src/engine/pixi/pixi-table.test.ts src/engine/react/card-table-decor.test.tsx
git commit -m "feat(pixi): a ring and a caption a page can put on a card, drawn with it, and nothing for a page that puts none"
```

---

### Task 3: Each seat's Board on the page

**Files:**
- Create: `src/pages/designer/board-text.ts`, `src/pages/designer/board-text.test.ts`
- Modify: `src/pages/designer/board-controls.tsx` (`entryFor`), `src/pages/designer/tableaux.tsx`, `src/pages/designer/playtest.tsx`
- Test: `src/pages/designer/playtest-fitted.test.tsx` (append), `src/engine/core/derive-scene.test.ts` (append)

**Interfaces:**
- Consumes `stackOnHolders` (Task 1), `CardDecor` and `CardTableProps.decor` (Task 2), and 1b-2's `holderIdOf`. It also uses `cardAttribute`, `cardFact` and `cardName` (`card-facts.ts`), `zoneIdFor` and `zoneInfo` (`zones.ts`), `HIDDEN_FACE_KEY` (`derive-scene.ts`), `joinAnd` (`refs.ts`) and `cardsByZone` (`scene.ts`).
- **`board-text.ts`** (pure):
  - **`cardLabel(card: CardState, game: CompiledGame): string`.** It is `'a face-down card'` when `card.faceKey === HIDDEN_FACE_KEY`. Otherwise it is the `name` column when that is text, else `cardName(card, game)`.
  - **`countParts(card: CardState, game: CompiledGame): string[]`.** It follows the "Counts against columns" call:
    - the counts are `game.facts` on cards of kind number, in declared order;
    - a count's leading words are its name without its last word, and a count with one word has none;
    - its column is the first key of `card.data`, in order, that isn't a declared fact, has the same leading words and holds a number;
    - a rider of count `c` is another count whose name ends with `' ' + c.name`;
    - riders get no part of their own.

    The values are `cardAttribute(card, name, game)`. A card with no data, or a face-down one, gives `[]`.
  - **`boardText(game: CompiledGame, cards: CardState[], seat: PlayerId): string`.**
    - It covers the zones of `game.zones` that are per-player, `public` and not `onCards`, in Table order. The cards of each are those in `zoneIdFor(name, seat)`, in slot order (`cardsByZone`).
    - The cards on a card are the cards whose `holderIdOf` is its id, zone by zone in Table order, then slot by slot.
    - Flags are the card's flag facts that are `true`, in declared order.
    - The copy is as under Global Constraints, and it is `''` with no cards.
  - **`boardCaptions(game: CompiledGame, cards: CardState[]): { [cardId: string]: string }`.** It covers every card whose zone (`zoneInfo`) is per-player, `public` and not `onCards`, and whose `countParts` aren't empty. The value is the parts joined by `'\n'`.
- **`board-controls.tsx`:** `entryFor(board, seat, withCards = true)`. With `false`, the names of the cards a seat keeps (`playerCards`) are left out. `MoneyLine` is unchanged.
- **`tableaux.tsx`:**
  - `tableauLine` uses `entryFor(board, seat, false)`.
  - `Tableaux` renders, after each seat's line, `<div data-testid={`board-${seat}`}>` with `boardText(game, cards, seat)` when it isn't empty, indented 24 in the seat's colour.
- **`playtest.tsx`, `SeatCanvas`:**
  - `picksCards` is `game.phases.some((p) => p.actions.some((a) => a.pick !== undefined))`.
  - **The fitted placement** is `stackOnHolders(tableDef.zones, <the kept cards>)`.
  - **`decor`,** when `picksCards` and a view has arrived, is `{ [id]: { caption } }` from `boardCaptions(game, placement.cards)`. It is memoized on the view and passed to `CardTable`. Otherwise `CardTable` gets no `decor`.

- [ ] **Step 1: Write the failing tests.**

In the new `board-text.test.ts`, use `CREW` = `CREW_GAME` with `  Cards can have red done, gold done and new red done.` after `  Cards can be tired.`. It compiles with `[]`. Take a 2-player engine's state after Setup (seed 1), then arrange by name with `relocate`, `putOn` and `changeCard`:
- the Vase and the Statue go to `workshop-p0`;
- the Potter and the Smith go onto the Vase, in that order, with the Potter tired;
- the Vase gets red done 1 and new red done 3;
- the Tinker goes to `idle-p0`.

The tests:
- **`countParts`:**
  - the Vase gives `['Red 1/2 +3 new', 'Gold 0/0']`;
  - the Statue gives `['Red 0/1', 'Gold 0/2']`;
  - the Potter gives `[]`;
  - with the Vase's new red done at 0, it gives `['Red 1/2', 'Gold 0/0']`.
- **The first column wins.** `fixtureCard('x', 'workshop-p0', { name: 'Vase', 'red need': 2, 'red cap': 5, 'red done': 1 })` gives `['Red 1/2', 'Gold 0/0']`.
- **A count with no column.** With `  Cards can have charges.` added and the Vase at 4 charges, the parts are unchanged.
- **`boardText(game, cards, 'p0')`** is `workshop: Vase [Red 1/2 +3 new, Gold 0/0] with Potter (tired) and Smith; Statue [Red 0/1, Gold 0/2] · idle: Tinker`.
  - `boardText(game, cards, 'p1')` is `''`.
  - The crew and the stash are never a part of their own.
- **Face down.** The Vase replaced by `{ ...vase, faceUp: false, faceKey: 'back', data: {} }` gives `workshop: a face-down card; Statue [Red 0/1, Gold 0/2] · idle: Tinker`. The Potter and the Smith lose their holder's card, so they aren't listed.
- **`boardCaptions`** is `{ [vase]: 'Red 1/2 +3 new\nGold 0/0', [statue]: 'Red 0/1\nGold 0/2' }`.

In `derive-scene.test.ts`, append a guard (it passes today, pinning B3): a card in an `owner` zone with data `{ name: 'Goblin', 'lang:on': 'c1', charges: 3 }`:
- projected for another seat, it has `faceKey: 'back'` and `data` `{}`;
- for its owner, it keeps all three keys.

In `playtest-fitted.test.tsx`, append `describe('the Board on the page')`.
- **Helpers:**
  - `setUp()` is `createEngine(game, lib, 3, initialState(game, SEED)).engine.getState()`;
  - `idOf(state, name, zoneId?)` is the first card with that `data.name`, in that zone if given;
  - `S = startOf(3)`, `N = after(S, 3)`, and `O` is a seat other than S.
- **`BUILT`.** `setUp()` with:
  - a Dating App relocated to `development-${S}`;
  - S's bench Junior Software Dev and an Architect `putOn` it, in that order (`development-team-${S}`);
  - its blue cubes set to 4 (`changeCard`);
  - a To-Do List relocated to `operations-${S}`;
  - a QA Engineer relocated to `ops-team-${S}`.

The tests, each mounting with `initial: BUILT` unless it says otherwise:
- **The Board on the canvas.**
  - `cardsIn(`development-team-${S}`)` holds the two staff.
  - Each staff's `data.x` is the Dating App's x in `computeZoneLayout(<the development def>, cardsIn(`development-${S}`))`.
  - The Junior's `data.y` is that y `+ 176` and the Architect's `+ 210` (they were put on in that order).
  - `table!.decor` is exactly `{ [dating]: { caption: 'Blue 4/6\nRed 0/0' }, [todo]: { caption: 'Blue 0/4\nRed 0/0' } }`.
- **Every seat's Board as text.**
  - `board-${S}` reads `development: Dating App [Blue 4/6, Red 0/0] with Junior Software Dev and Architect · operations: To-Do List [Blue 0/4, Red 0/0] · ops team: QA Engineer`.
  - There is no `board-${O}`.
  - Click O's tab. `cardsIn(`development-${S}`)` is empty, and `board-${S}` reads the same.
- **The tableau line counts and doesn't name.**
  - `lineOf(S)` starts `${S} 7 capital, 3 actions, 0 market share · `.
  - It contains `development 1 · operations 1 · development team 2 · ops team 1 · scouting 0`.
  - It doesn't contain `Dating App`.
- **Flags on the text.** With the Architect onboarding (`changeCard`), `board-${S}` contains `Architect (onboarding)`.
- **Market Share among the counters, and Generate on the canvas.** `BUILT` with a Trading Bot also relocated to `operations-${N}`.
  - S presses `End your actions`. N's tab is selected, and `lineOf(N)` starts `${N} 11 capital, 3 actions, 1 market share · `.
  - Click S's tab: `table!.decor[dating].caption` is `Blue 6/6\nRed 0/0`. The Junior's 1 and the Architect's 3 are capped at 6.
- **Review Focus: hidden data.** `setUp()` with O's backlog card `B` given `blue cubes` 3 (`changeCard`), mounted on S's tab:
  - `deriveScene(engineTableDef, { cards: state.cards }, S)` shows B with `faceKey` `'back'`, and its `data` keys are a subset of `['x', 'y']`. `engineTableDef` is `createEngine(…).tableDef`, which is what the server projects with.
  - `table!.placement.cards` has no card of `backlog-${O}`, and `table!.decor` has no key B.
  - `document.body.textContent` contains neither B's name nor `3/`.

- [ ] **Step 2: Run** `bunx vitest run src/pages/designer src/engine/core/derive-scene.test.ts`. Expected: the new tests FAIL (the derive-scene guard passes), and the existing ones pass.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the same, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/pages/designer/board-text.ts src/pages/designer/board-text.test.ts src/pages/designer/board-controls.tsx src/pages/designer/tableaux.tsx \
  src/pages/designer/playtest.tsx src/pages/designer/playtest-fitted.test.tsx src/engine/core/derive-scene.test.ts
git commit -m "feat(designer): each seat's Board on the page: counts against their columns under a card, cards on a card hanging under it, and every seat's public cards listed under its line"
```

---

### Task 4: Clicking cards on the canvas, and the Hearts check

**Files:**
- Create: `src/pages/designer/card-pick.ts`, `src/pages/designer/card-pick.test.ts`, `src/pages/designer/card-offer.tsx`
- Modify: `src/pages/designer/card-picker.tsx`, `src/pages/designer/playtest.tsx`
- Test: `src/pages/designer/playtest-fitted.test.tsx` (append), `src/pages/designer/playtest-clicks.test.tsx` (new), `src/engine/input/hearts-clicks.test.ts` (new)

**Interfaces:**
- Consumes `CardPickView`, `PickCardView` and `ActionView.cards` (1b-1), Task 2's decor and Task 3's `decor` memo.
- **`card-pick.ts`** (pure; the logic 1b-1's `CardPicker` keeps inside, moved here unchanged in behaviour):
  - **Types:**
    - `export type PickAt = { picked: string[]; onto: boolean }` and `export const PICK_START: PickAt = { picked: [], onto: false }`;
    - `export type PickChosen = { cardId: string; onto?: string } | { cardIds: string[]; onto?: string }`;
    - `export type PickOutcome = { at: PickAt } | { send: PickChosen } | { refused: string }`;
    - `export type Taker = { move: string; label: string; allowed: true | string }`;
    - `export const NOTHING_TAKES = 'No button takes this card now.'`.
  - **`liveAt(pick, at): PickAt`** keeps the picked ids still in `pick.cards`, in order. With none left it gives `PICK_START`.
  - **`ontoChoices(pick, at): PickCardView[]`.** With `pick.onto` and a pick, it is the targets of `at.picked[0]`. Each target's `allowed` is the first non-true verdict for it among the picked cards (`` `${pick.onto.prompt}.` `` where a picked card lacks it), else true. Otherwise it is `[]`.
  - **`clickCard(pick, at, cardId): PickOutcome`,** on `liveAt(pick, at)`:
    - **In the target step:**
      - an id among `ontoChoices` sends `{ cardId: picked[0], onto }`, or `{ cardIds: picked, onto }` for a set;
      - a refused target gives its verdict;
      - anything else gives `` `${pick.onto.prompt}.` ``.
    - **A candidate:**
      - a refused one gives its verdict;
      - one card with no target sends `{ cardId }`;
      - one card with a target gives `{ at: { picked: [id], onto: true } }`;
      - in a set, it toggles the id, keeping click order.
    - **The shortcut:** a non-candidate in a set with a target and at least one pick, which is among `ontoChoices` for that pick, is the target step's click.
    - **Anything else** gives `` `${pick.prompt}.` ``.
  - **`confirmSet(pick, at): PickOutcome`:**
    - no picks gives `` `${pick.prompt}.` ``;
    - no target sends `{ cardIds }`;
    - else it gives `{ at: { picked, onto: true } }`.
  - **`ringsOf(pick, at): { [cardId: string]: 'choice' | 'chosen' }`:**
    - the picked cards are `'chosen'`;
    - in the target step, live `ontoChoices` are `'choice'`;
    - otherwise, live candidates not picked are `'choice'`.
  - **`takersOf(actions: ActionView[], cardId: string): Taker[]`:** the buttons with `cards` whose candidates include the id, in button order, each with that card's verdict.
- **`card-picker.tsx`:** `CardPicker` gains optional `at?: PickAt` and `onAt?(at: PickAt): void`.
  - Given `at`, it shows `liveAt(pick, at)` and reports each change through `onAt`. Without it, it keeps its own state as in 1b-1.
  - Its card, target and `Confirm` handlers go through `clickCard` and `confirmSet`.
  - 1b-1's `card-picker.test.tsx` passes unchanged.
- **`card-offer.tsx`:** `CardOffer({ name, takers, onChoose, onRefused, onCancel }: { name: string; takers: Taker[]; onChoose(move: string): void; onRefused(reason: string): void; onCancel(): void })`. Its copy is under Global Constraints. A greyed button calls `onRefused(<its verdict>)`.
- **`playtest.tsx`, `SeatCanvas`:**
  - **State.** `pickAt: PickAt` (reset to `PICK_START` whenever `picking` changes or the picker closes) and `offer: string | null`.
  - **`clickOnTable(id)`, passed as `CardTable`'s `onCardClick` only when `picksCards`:**
    - With a picker open, it applies `clickCard(choosingCards.pick, pickAt, id)`:
      - `send` clears the error, ends picking and sends `{ type: move, ...chosen }`;
      - `at` sets `pickAt`;
      - `refused` flashes.
    - Otherwise, with `takersOf(extras.actions, id)` empty, it flashes `NOTHING_TAKES`. Else it opens the offer for `id`.
  - **The offer** renders right after `ActionButtons` in both panel layouts, where the picker goes. Its `name` is the first taker's view name for the card.
    - **Choosing a live button** closes the offer and applies `clickCard(<that button's cards>, PICK_START, id)`. A `send` sends, and an `at` sets `picking` to that move and `pickAt` to it.
    - **The offer closes** when its card has no taker in the latest view (an effect, like 1b-1's stale picker), and when any DOM button is pressed.
  - **`CardPicker`** is passed `at={pickAt}` and `onAt={setPickAt}`.
  - **`decor`** gains rings: `ringsOf(choosingCards.pick, pickAt)` while a picker is open, else `{ [offer]: 'chosen' }` while an offer is open. These are merged into the captions.
  - **`submit` (a drop).** When `picksCards`, `moveForDrop` gives null and `toZoneId === fromZoneId`, it calls `clickOnTable(intent.cardId)` instead of staying silent.

- [ ] **Step 1: Write the failing tests.**

In the new `card-pick.test.ts`, use hand-made views shaped like 1b-1's `card-picker.test.tsx` ones (c1 'Ruby' live, c2 'Opal' refused `x`, c3 live; targets c9 live and c8 refused `the target card is not a Ruby`):
- **One card:** `clickCard` on c1 sends `{ cardId: 'c1' }`. On c2 it gives `{ refused: 'x' }`. On `'zz'` it gives `{ refused: '<prompt>.' }`.
- **A target:**
  - c1 gives `{ at: { picked: ['c1'], onto: true } }`;
  - then c9 sends `{ cardId: 'c1', onto: 'c9' }`;
  - c8 gives its verdict;
  - c3 gives `{ refused: '<onto prompt>.' }`.
- **A set:**
  - c1, c3, c1 gives `picked: ['c3']`;
  - `confirmSet` sends `{ cardIds: ['c3'] }`;
  - with none picked it refuses `'<prompt>.'`.
- **A set and a target:**
  - `confirmSet` with c1 and c3 picked gives the target step;
  - c9 is refused with c3's verdict for it when that is `y`;
  - **the shortcut:** `clickCard` on c9 straight after picking c1 sends `{ cardIds: ['c1'], onto: 'c9' }`.
- **`liveAt`:** c3 dropped from the view leaves `picked: ['c1']`. Every pick gone gives `PICK_START`, even in the target step.
- **`ringsOf`:**
  - at the start, `{ c1: 'choice', c3: 'choice' }`;
  - with c1 picked in a set, `{ c1: 'chosen', c3: 'choice' }`;
  - in the target step, `{ c1: 'chosen', c9: 'choice' }`.
- **`takersOf`:** over three `ActionView`s (one without `cards`, two listing c1 with verdicts `true` and `'x'`), c1 gives the two in order, and `'zz'` gives `[]`.

In `playtest-fitted.test.tsx`, append `describe('picking cards by clicking them')`.
- **Helpers:**
  - `click(id)` is `act(() => table!.onCardClick!(id))`;
  - `offer()` is `screen.getByRole('group', { name: 'Card buttons' })`;
  - `choose(label)` clicks that button within `offer()`;
  - `ring(id)` is `table!.decor?.[id]?.ring`;
  - `inOrder(zoneId)` is `cardsByZone({ cards: table!.placement.cards, zones: [] }).get(zoneId) ?? []`, the zone's cards in slot order (`cardsIn` keeps state order);
  - `named(zoneId, name)` is the id of the first `inOrder(zoneId)` card whose `parseTextFaceKey(faceKey)!.name` is `name`;
  - `S`, `N` and `O` are as in Task 3, on the plain set-up game unless a test says otherwise.

The tests:
- **Greenlight.**
  - Click S's backlog card. The offer reads `{its name}:` with one live `Greenlight a card in your backlog`, and `ring(card)` is `'chosen'`.
  - Choose it:
    - `cardsIn(`development-${S}`)` has it;
    - `lineOf(S)` has `3 actions` and `development 1`;
    - the offer is gone;
    - no decor has a ring.
- **Assign a set to a target, by clicking only.** After Greenlight, click S's Junior Software Dev.
  - The offer's buttons are, in order:
    - `Assign some cards from your bench to a card in your development` (live);
    - `Assign some cards from your bench to your ops team`, greyed `their operations is not empty`;
    - `Lay off some cards from your bench to the open job market` (live).
  - Choose the first. The picker shows the Junior pressed, with `ring` `'chosen'`, and the other two bench cards `'choice'`.
  - Click the Junior Hardware Eng, then click the project on the canvas (the shortcut).
  - Then:
    - `cardsIn(`development-team-${S}`)` holds both, each with `data['lang:on']` the project's id;
    - `lineOf(S)` has `2 actions`;
    - `board-${S}` reads `development: {name} [{its parts}] with Junior Software Dev and Junior Hardware Eng`;
    - no picker is open.
- **Source, and the scouting row in the private strip.** Continue: click the Junior QA Tester, choose `Lay off some cards from your bench to the open job market`, and press the picker's `Confirm`.
  - The status is `seat: ${S} — sourcing — Your turn — ${hint('sourcing')}`.
  - `cardsIn(`scouting-${S}`)` has 1 face-up card `X`.
  - `lineOf(S)` has `1 action` and `scouting 1`.
  - Click X. The offer lists the three `Hire some cards from your scouting …` buttons.
  - Click Cancel, then click O's tab:
    - `cardsIn(`scouting-${S}`)` is empty;
    - `lineOf(S)` has `scouting 1`;
    - `board-${S}` is shown.
  - Click S's tab and press `Pass on the rest`:
    - the status is `seat: ${S} — Your turn — ${hint('actions')}`;
    - `inOrder('agency-row')[0].id` is X, at the row's left end.
- **Launch and Pivot from a project; a refused choice.** Mount on `setUp()`, arranged with:
  - a Dating App in `development-${S}` with 6 blue cubes and S's Junior Software Dev on it;
  - a Smart Lock in `development-${S}`.

  Then:
  - Click the Smart Lock. The offer has `Launch a card from your development to your operations`, greyed `it is feature complete`, and a live `Pivot a card in your development`.
  - Choosing Launch flashes `it is feature complete`, and the offer stays.
  - Cancel. Click the Dating App and choose Launch:
    - `board-${S}` reads `development: Smart Lock [Blue 0/1, Red 0/5] · operations: Dating App [Blue 6/6, Red 0/0] · ops team: Junior Software Dev`;
    - `lineOf(S)` has `2 actions`.
- **Review Focus: out of turn.**
  - On O's tab, click O's Junior Software Dev. Each offered button is greyed `It's ${S}'s turn.`.
  - Choosing one flashes that, and `lineOf(O)` is unchanged.
- **Review Focus: nothing takes it.** Click the first card of `cardsIn('talent-deck')`. `No button takes this card now.` shows, and there is no offer.
- **Review Focus: a picked card leaves.**
  - Click the first agency card whose cost is at most 7, and choose `Hire a card from the agency row to your bench`.
  - Click that card in the bench, choose the lay off, and click S's Junior Software Dev, so both are picked.
  - Press `Undo`. The hired card is back in the agency row and has no ring.
  - `Confirm` sends a lay off of the Junior alone: the open job market holds the Junior, and not the hired card.
- **Review Focus: pressing a button closes the offer.** Open an offer on a bench card, then press `End your actions`. There is no offer.
- **Review Focus: a wobbly click.** Mount on `setUp()` with a Dating App in `development-${S}` and S's Junior Hardware Eng `putOn` it.
  - `drop(<S's Junior Software Dev>, `bench-${S}`, `bench-${S}`)` opens the offer for it.
  - `drop(<the Junior Hardware Eng>, `development-team-${S}`, `development-team-${S}`)` opens its offer. That offer lists exactly `Reassign a card from your development team to a card in your development` and `Dismiss a card in your development team`.

In the new `playtest-clicks.test.tsx`, mock `Wrapper` as in `playtest.test.tsx`. Mock `CardTable` to render `<span data-testid="card-table" ref={(el) => { if (el) propsOf.set(el, p); }} />`, with `propsOf` a module-level `Map`. A counter by render order would break when one seat rerenders alone, as an open offer makes it do.
- **Helpers:**
  - `panelOf(seat)` is the parent of the seat's `seat: …` line;
  - `tableOf(seat)` is `propsOf.get(within(panelOf(seat)).getByTestId('card-table'))!`.
- **A game that fits picks by clicking too.** Use `CARD_PICK_GAME` at 2 players, arranged as in 1b-1's `Playtest: picking cards` (shop: a Ruby and an Opal; `stash-p0` and `case-p0`: a Ruby and an Opal each).
  - `tableOf('p0')` has `onCardClick` and `decor`.
  - Click the stash Opal on p0's table. The offer in p0's panel lists `Sell a card in your stash`, `Show a card from your stash to a card in your case` and `Trade some cards from your stash to the shop`.
  - Choose Show:
    - `tableOf('p0').decor` rings the case Opal `'choice'` and the stash Opal `'chosen'`, and leaves the case Ruby unringed;
    - clicking the case Ruby flashes `the target card is not a Ruby`;
    - clicking the case Opal leaves `case-p0` with 3 cards in `tableOf('p0').placement`, and the money line reads `p0 7 coins, 1 move`.
  - On p1's table, clicking p0's case Opal flashes `No button takes this card now.` in p1's panel.
- **The four games, as before.** For Hearts (4), Color Match (3), Venom (its minimum) and Rent Day (2), every `card-table` span's props have `onCardClick` and `decor` undefined.

In the new `src/engine/input/hearts-clicks.test.ts` (guards that pass today: Hearts' clicks and drags as before):
- **The table.**
  - `scene = deriveScene(TABLE, { cards: createHeartsServer(42).viewFor('p0').scene.cards })`, as Hearts' page draws it (no viewer).
  - A `TableModel` is set to it and advanced once.
  - The tracker gets `getPlacedCards`, `beginDrag`, `dragTo` and `endDrag` from the model, `getZones: () => TABLE.zones`, `getCards: () => scene.cards`, `registerStarterRules(new RuleRegistry())`, identity `clientToWorld`, and spy intents.
  - `top` is the `hand-p0` card with the highest `z`, at its pose `(x, y)`.
- **A click** (down at the pose, up 2 away) calls `onCardClick(top)` once and `onDrop` never.
- **A 4-unit wobble** is still a click.
- **A 6-unit move** back onto the hand is a drop with `toZoneId: 'hand-p0'`, which Hearts' page reads as a reorder.
- **A drag to `(0, 170)`** drops `{ cardId: top, fromZoneId: 'hand-p0', toZoneId: 'pass-p0', slot: 0, worldPoint: { x: 0, y: 170 } }`.
- **A drag to `(-110, 0)`** drops on `'trick'`.
- **After every gesture,** no render state is `ownedByDrag`.

- [ ] **Step 2: Run** `bunx vitest run src/pages/designer src/engine/input`. Expected: the new page and `card-pick` tests FAIL. `hearts-clicks.test.ts` and every existing test pass.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/pages/designer src/engine/input src/pages/hearts-demo`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/pages/designer/card-pick.ts src/pages/designer/card-pick.test.ts src/pages/designer/card-offer.tsx src/pages/designer/card-picker.tsx \
  src/pages/designer/playtest.tsx src/pages/designer/playtest-fitted.test.tsx src/pages/designer/playtest-clicks.test.tsx src/engine/input/hearts-clicks.test.ts
git commit -m "feat(designer): clicking a card offers the buttons that take it, and a button that picks cards takes clicks on the table, with Hearts' clicks and drags pinned"
```

---

### Task 5: The Board played through the page, the browser check, and the README

**Files:**
- Modify: `src/pages/designer/playtest-fitted.test.tsx` (append), `README.md`
- The browser check's scripts and screenshots go only in `/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-1b3/`.

**Interfaces:** Consumes everything above. Produces nothing new.

- [ ] **Step 1: Write the playthrough test.** In `playtest-fitted.test.tsx`, append `describe('the Board played by clicking')`, with `it('builds, generates, launches and earns Market Share, by clicking cards')`.
  - **Arrange.** On `setUp()`, a To-Do List (4 blue) goes to `development-${S}` with 3 blue cubes. `T = after(N, 3)`.
  - **Assign by clicking.** S clicks its Junior Software Dev, chooses `Assign some cards from your bench to a card in your development`, and clicks the To-Do List. `lineOf(S)` has `2 actions`.
  - **Generate.** S presses `End your actions`. Click S's tab: `table!.decor[todo].caption` is `Blue 4/4\nRed 0/0`.
  - **The next round.** N and T each press `End your actions`.
    - S's tab is selected, and `lineOf(S)` starts `${S} 7 capital, 3 actions, 0 market share · `.
    - Income paid nothing, and the payroll of $0 skipped.
  - **Launch.** S clicks the To-Do List and chooses `Launch a card from your development to your operations`. `board-${S}` reads `operations: To-Do List [Blue 4/4, Red 0/0] · ops team: Junior Software Dev`.
  - **Income.** S, N and T each press `End your actions`. `lineOf(S)` starts `${S} 8 capital, 3 actions, 1 market share · `.

  Run `bunx vitest run src/pages/designer/playtest-fitted.test.tsx`. Expected: PASS. A failure is a bug in Tasks 1–4, not in these numbers: fix it there.

- [ ] **Step 2: The browser check.** Use 1a-2 Task 4's method with `SCRATCH=/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-1b3`.
  - **Setup:**
    - `mkdir -p "$SCRATCH"`;
    - the dev server in the background on 5173 with `--strictPort`, polled with `curl -sf` (no foreground sleep);
    - Chromium launched with `['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']`;
    - a viewport of `{ width: 1600, height: 2600 }`;
    - `pageerror` and console errors collected. There must be none.
  1. Write `$SCRATCH/zones.ts` and run it with `bun`. It writes `zones.json`: for viewers p0 to p2 of the compiled sample, each fitted def's `transform`, and for board rows `room = bounds.height - 2 * CARD_HEIGHT - STACK_GAP`.
  2. Write `$SCRATCH/check.cjs` and run it with `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers NODE_PATH=/opt/node22/lib/node_modules node "$SCRATCH/check.cjs" "$SCRATCH"`. Its geometry is below; everything else goes through roles and labels. The seat to act is the first word of the tab whose name ends `— to act`.

```js
// World → screen: the fitted canvas is 1200 × 900 and shows the 1600 × 1200 world, centred.
async function at(page, wx, wy) {
  const b = await page.locator('canvas').boundingBox();
  const k = b.width / 1600;
  return { x: b.x + (wx + 800) * k, y: b.y + (wy + 600) * k };
}
// Card i of n in a row at z: s0 is 75 in the private strip and 110 on the board, squeezed into 400. Aim at the strip the next card leaves.
function rowCard(z, i, n, s0) {
  const s = n > 1 ? Math.min(s0, 300 / (n - 1)) : s0;
  const cx = z.x + (i - (n - 1) / 2) * s;
  return { x: i < n - 1 ? cx - 50 + s / 2 : cx, y: z.y };
}
// Card k of n stacked under a holder at h, in a slot with that room: aim at its top strip, the last one at its centre.
function stacked(h, k, n, room) {
  const step = n > 1 ? Math.min(34, room / (n - 1)) : 34;
  const y = h.y + 176 + k * step;
  return { x: h.x, y: k < n - 1 ? y - 70 + step / 2 : y };
}
async function click(page, w) { const p = await at(page, w.x, w.y); await page.mouse.click(p.x, p.y); await page.waitForTimeout(400); }
```

  - **Session A: the sample at 3 players** (`Load sample` → `Startup Simulator`, `No problems found.`, `3`, `Play`). At the start the bench holds Junior Software Dev, Junior Hardware Eng and Junior QA Tester, in that order, and the backlog 1 card. Each screenshot must show what is listed after it.
    - **`01-board.png`**:
      - the shared lines at the top;
      - a band named development, operations and ops team with three empty tall slots;
      - the bench, backlog and research along the bottom, with scouting on the line above them;
      - three tableau lines with `0 market share`, and no Board lines.
    - Click the backlog card. **`02-offer.png`**: the `Card buttons` group reads `{name}:` with `Greenlight a card in your backlog`, and the card has a green ring.
    - Choose it. **`03-greenlit.png`**:
      - the card at the top of the development slot, with its caption under it (`Blue 0/b`, `Red 0/r`);
      - S's Board line under its tableau line.
    - Click bench card 0 of 3 and choose `Assign some cards from your bench to a card in your development`. Click bench card 1 of 3. **`04-set.png`**: the two Juniors are ringed green, the QA Tester amber, and the picker shows both pressed and `Confirm`.
    - Press `Confirm`. **`05-targets.png`**: the project is ringed amber, and the picker reads `Pick where they go: a card in your development`.
    - Click the project. **`06-stacked.png`**:
      - two staff hang under the project, below its caption, with the first one's corner showing above the second;
      - the line has `2 actions` and `development team 2`;
      - the Board line reads `… with Junior Software Dev and Junior Hardware Eng`.
    - Click the last bench card, choose the lay off, and press `Confirm`. **`07-scouting.png`**: the status reads `… — sourcing — Your turn — Hire any of the cards…`, and the scouting slot shows one face-up card.
    - Click another seat's tab. **`08-scouting-rival.png`**: no scouting card on the canvas, S's line says `scouting 1`, and S's Board line shows.
    - Click S's tab, press `Pass on the rest`, then `End your actions`. Click S's tab. **`09-cubes.png`**: the project's caption has gone up by 1 in each colour it needs (the Juniors' output, capped at its cost).
  - **Session B: Color Match at 3** (`10-color-match.png`): three seat panels as before, no tabs, no rings, no captions.
  - **Session C: the Hearts demo at `/`.**
    - On the first canvas (800 × 600 for the 1600 × 1200 world, so `k = 0.5`), click p0's last hand card at world `(81, 317)`. **`11-hearts-click.png`**: the hint still ends `(0/3)`, and the card is back in the fan.
    - Drag it to `(0, 170)`. **`12-hearts-drag.png`**: the hint ends `(1/3)`.
  - **Afterwards.**
    - Open every screenshot (Read the PNG) and check it against its list.
    - If the canvas is blank, look at the console errors for WebGL first.
    - If a caption runs into the first stacked card, raise `STACK_GAP` and rerun Tasks 1 and 3's tests.
    - Stop the dev server.

- [ ] **Step 3: Update the README.**
  - In 1a-2's **A table too big for one screen** paragraph, add **The Board:**
    - the seat's cards that everyone can see sit in a band between the shared zones and the seat's own strip;
    - a card that sits on a card hangs under it;
    - a number kept on cards shows under a card against the column whose name starts with the same words (`blue cubes` against `blue cost` reads `Blue 3/6`), and one named with words before another's shows beside it when it isn't 0 (`+4 new`);
    - under each seat's line, its public cards are listed by zone, with what sits on each.
  - In 1b-1's **Buttons that pick cards** paragraph, add **Clicking:**
    - click a card to see the buttons that take it;
    - a button that picks cards takes clicks on the table as well as on its list;
    - a set ends with Confirm, or with a click on where it goes.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests. Then run these checks; each must print nothing.

```bash
# Startup Simulator's words in shared code
git diff "$BASE" -- src/engine src/pages src/utils src/app-components.ts ':!*.test.ts' ':!*.test.tsx' ':!src/pages/designer/samples.ts' | grep '^+' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share)\b|\bseed (decks?|markets?|cards?|products?)\b'
# …and in the new test files that use fixtures
git diff "$BASE" -- src/engine src/pages/designer/board-text.test.ts src/pages/designer/card-pick.test.ts src/pages/designer/playtest-clicks.test.tsx | grep '^+' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|bench(es)?|products?|greenlight|launch|pivot|salar(y|ies)|projects?|cubes?|ops|operations|onboarding|scouting|market share)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# no existing test line changed or removed
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
# nothing under src/engine/input changed but the new guard test
git diff --stat "$BASE" -- src/engine/input ':!src/engine/input/hearts-clicks.test.ts'
```

  Also read the `+` lines of `src/engine` and `src/pages` for "source" in the game sense, which the grep can't tell from a regex source.
- [ ] **Step 5: Run the four games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo src/engine/input` passes.
- [ ] **Step 6: Commit**

```bash
git add src/pages/designer/playtest-fitted.test.tsx README.md
git commit -m "feat(designer): the Board played by clicking through the page, checked in a browser, and the README's Board and clicking"
```
