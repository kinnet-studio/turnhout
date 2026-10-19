# Pre-flight — plan 5-3, Task 1 only ("A fitted table that needs more room grows taller")

- **HEAD scanned:** `c3ac18a` (5-2a's last commit; re-checked at the end of the scan, unchanged, working tree clean).
- **Inputs:** plan `docs/superpowers/plans/2026-10-16-startup-slice-5-3-the-page.md` (header, Call 1, Global Constraints, Review Focus, "Assumed from earlier plans", Task 1, G1, Sequencing), `task-1-brief.md`, `constraints.md`, 5-2b's Table edits (its Task 1 and Task 3), the code and tests named below.
- **Probe paths** (all under `/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/`):
  - `pf53t1/`: `git archive HEAD`, `node_modules` symlinked, with Task 1 built as the plan writes it (source and tests).
  - `pf53t1-base/`: an untouched `git archive HEAD`, used for the baseline.
  - `pf53t1-impl/`: the four changed source files.
  - `pf53t1.diff`: the full probe diff against HEAD.
  - `pf53t1-full.log` and `pf53t1-base.log`: full-suite runs.
  - `pf53t1/src/zprobe/probe.test.ts` and `pf53t1-base/src/zprobe/probe.test.ts`: the number probes, which lie outside the diff.

**Result:** Task 1 works as written. Every number in the plan is what the code computes, Task 1's own tests pass before and after 5-2b's zones, and no existing test changes (3594 → 3617, +23, 119 files). The scan found 2 medium findings and 5 low ones. All of them can be fixed with brief edits. None needs a plan rewrite or an interface change.

- F1: the plan's init-app assertion doesn't typecheck.
- F2: G1 misses that 5-2b must also re-point the old `misfits` line.
- F3 to F7: Step 1/Step 3 wording, one weak zoom assertion, and stale comments.

## 1. Names Task 1 consumes or edits, at HEAD

| # | Item | ✓/✗/differs | Evidence |
|---|---|---|---|
| 1 | `fittedLayout(zones, viewer)` | ✓ | `fit-layout.ts:117`; strip from `TABLE_BOUNDS.max.y − MARGIN` (:127), shared lines from `TABLE_BOUNDS.min.y + MARGIN + LABEL_ROOM` (:135), band `floor((bottom − top − (n−1)·40)/n)` (:146) |
| 2 | private `wrap` | ✓ | `:70`, `LINE_WIDTH` 1560 (:29) |
| 3 | `MARGIN` 20, `LABEL_ROOM` 24, `LINE_GAP` 16 | ✓ | `:24/:26/:28` (module-private consts) |
| 4 | `STACK_GAP` 36, `STACK_STEP` 34 | ✓ | `:36/:38`, exported |
| 5 | `stackOnHolders` | ✓ | `:200`; reads slot bounds only, unaffected |
| 6 | `CARD_HEIGHT` 140, `TABLE_BOUNDS` ±800 × ±600 | ✓ | `scene.ts:2/:5` (`as const`) |
| 7 | 4-3's `LayoutOptions.keepPlaced` | ✓ | `scene.ts:35`, `layout.ts:26`, `boardDef` |
| 8 | `makeInitApp(renderer, { showEmptyZones?, size? })` | ✓ | `init-app.ts:27-28`. Camera `boundaries`, fit zoom and `setPosition({0,0})` all come from `TABLE_BOUNDS` (`:128-134`). |
| 9 | playtest's fitted canvas | ✓ (changes as planned) | `FITTED_WIDTH` 1200 / `FITTED_HEIGHT` 900 / module-level `initFittedApp` (`playtest.tsx:47-50`), `Wrapper initFunction` (:301), `canvasBox` (:417). `FITTED_HEIGHT`/`initFittedApp` are used nowhere else. |
| 10 | `Wrapper` re-init | ✓ | `useInitializePixiApp`'s effect deps are `[setResult, option]`, so a new `initFunction` identity never re-inits. `SeatCanvas` is keyed by seat, and every rules edit ends the Playtest (`designer-page.tsx:81`), so memoising on `game` is enough. |
| 11 | `TABLE_BOUNDS` elsewhere | ✓ | Its only non-test users are `fit-layout.ts` and `init-app.ts`. No clamp or felt is sized to it, so a taller world needs nothing more. |
| 12 | `fit-layout.test.ts` scaffolds `MARKET`, `BOARD`, `TWO_LINES`, `box`, `overlap`, `seats`, `lib`, `at` | ✓ | module scope; `misfits`/`inside` read `TABLE_BOUNDS` (:192, :41) |
| 13 | `init-app.test.ts` `start`, `fakeBase` | **differs** | `fakeBase().camera` has no `boundaries` in its type. `base.camera.boundaries` therefore fails `tsc` (F1). |
| 14 | `playtest-fitted.test.tsx` `mount`, `canvasMadeWith`, `fullBox`, `boxesOverlap`, `inWorld`, `misfits`, `fittedZone`, `seatsOf`, `game`, `table` | ✓ | The init-app mock returns `{ opts }` (:45). `misfits` reads `TABLE_BOUNDS` (:353-372). "the canvas" is at :307-316, and "the Board's place on the table" (band 416, unreachable pin) at :376-408. |
| 15 | `CREW_GAME` (idle row line last in Table; `skill` column) | ✓ | `testing.ts:400-431`, idle line `'  Each player has an idle row that everyone can see.'` |
| 16 | `unreachableZones` | ✓ | `testing.ts:801` |
| 17 | `compileGame` result | ✓ | `{ game?, diagnostics }` (`compile.ts:22`) |
| 18 | Typecheck covers tests | ✓ | `tsconfig` `include: ["src"]`, `strict`, `noUnusedLocals` |
| 19 | Other `makeInitApp` users | ✓ | `hearts-demo` (protected), `net-demo` and `table-demo` pass no `world`, so their camera is unchanged: `TABLE_BOUNDS`, `setPosition({0,0})`, same fit. |

Counts: 18 ✓, 1 differs, 0 missing.

## 2. Probes

### 2a. Task 1 built as written (`pf53t1/`)
- **Source:**
  - `HANG_ONE`/`HANG_FOUR`, `fittedBounds` (wraps shared/strip/band as `fittedLayout` does, `spent` formula, returns the `TABLE_BOUNDS` object itself when not grown, `ceil(.../8)*8`);
  - `fittedLayout` reads the bounds;
  - `makeInitApp` `world` (boundaries, fit over the world, centre);
  - `playtest.tsx`'s `useMemo([game])` making `{ showEmptyZones, size: 1200 × ¾·height, ...(world !== TABLE_BOUNDS && { world }) }`, with the canvas box at the same size;
  - `TALL_GAME` after `CREW_GAME`.
- **Tests:** every Step 1 bullet, appended, with new names on new import lines.
- **Step 1 files:** `fit-layout` 64 → 80, `init-app` 6 → 7, `playtest-fitted` 80 → 86. All pass.
- **Step 2 state** (tests + `TALL_GAME`, no source change): 22 fail.
  - 1 init-app test: boundaries only, because the zoom is 0.75 either way.
  - 15 fit-layout tests, including the `fittedBounds is TABLE_BOUNDS` "(guard)" (F4).
  - 6 playtest tests.
  - Every existing test passes, and "the fixture compiles / doesn't fit" passes.
- **Step 2 without `TALL_GAME`:** `fit-layout.test.ts` fails at collection (`TypeError: Cannot read properties of undefined (reading 'zones')`), so no guard can be seen (F3).
- **`bun run typecheck`:** one error, `init-app.test.ts: TS2339 Property 'boundaries' does not exist on type '{ viewPortWidth… }'` (F1). It is clean once the assertion reads `(fake.base as BaseAppComponents).camera.boundaries`.
- **Full suite:** 3617 pass in 119 files (baseline `pf53t1-base`: 3594). That is +23, with no failures, no existing test changed and no removed test lines. Time is 111 s against 126 s at baseline.
- **The plan's Step 4 greps** (Startup words in shared code, "badge" in core, core purity, removed test lines) run on `pf53t1.diff` and print nothing. Task 1 changes no rules and no protected files.

### 2b. The plan's numbers (`zprobe/probe.test.ts`)

| Table | `fittedBounds` | canvas | band rows | development team bottom / strip top | misfits vs bounds | unreachable |
|---|---|---|---|---|---|---|
| Startup @HEAD | `TABLE_BOUNDS` | 1200×900, no `world` | 416 ×1 line | 120 / 260 | `[]` | `[development-pN → development-team-pN]` (unchanged) |
| Startup + 5-2b T1 zones | ±692 (964 + 418 = 1382 → 1384) | 1200×1038 | 420 ×1 | 208 / 352 | `[]` (8 "leaves" vs `TABLE_BOUNDS`) | same |
| Startup + 5-2b T3 zones (slice 5) | ±920 (1004 + 836 = 1840) | 1200×1380 | 418 ×2 (milestones at (0,192)) | −20 / 580 | `[]` (16 vs `TABLE_BOUNDS`) | same |
| TALL | ±920 | 1200×1380 | 418 ×2 | −20 / 580 | `[]` | `[workshop-pN → crew-pN]` |
| TALL without rack | ±692 | 1200×1038 | 420, workshop (−420, −38) | — | `[]` | same |
| Hearts, Color Match, Venom, Rent Day | `TABLE_BOUNDS` | not fitted (fit at every count) | — | — | — | — |
| Chores (TURN_GAME + 4 rows, "the buttons' room") | `TABLE_BOUNDS` (no band) | 1200×900 | — | — | `[]` | `[]` |

- **Every position in Task 1's `fittedLayout(TALL, 'p1')` bullet matches:**
  - shared lines at −806, −626 and −446, with x values −630, −360, 60, 480 / −420, 0, 420 / 0;
  - the strip at 830 and 650;
  - the band at −266 and 192, each row's bounds `{400, 418, anchor 70/418}`;
  - `crew-p1` at (−420, −90).
- **G1 holds at HEAD's code with 5-2b's zones** (`pf53t1-base`):
  - after T1, the band is 236 and the first development-team card is at y 230 (bottom 300, past the strip top of 260), and `unreachableZones` is `[]`;
  - after T3, the rows are 98 and `misfits` gives four "less than a card tall".
- **5-2b adds Table lines only in its Tasks 1 and 3**, so 1840 / 1380 is the final slice-5 size.

### 2c. Task 1 + 5-2b's zones over the existing page tests
Probe: zone lines only, in `pf53t1/`. The rules were restored afterwards and `cmp` confirms they match.

`playtest-fitted.test.tsx` has 11 failing tests, the same 11 after T1's and after T3's zones:
- the tableau-line tests "lists every player's tableau" and "recruits from every source…" (5-2b's own pins);
- "the canvas" 1200 × 900;
- 3 pins in "the Board's place on the table";
- that describe's `it.each` p0…p4, which fails on **`misfits(placed)`** with `bench-p0 leaves the world`, … because the old helper reads `TABLE_BOUNDS` (F2).

Task 1's new Startup describe passes in both states, so the plan's claim that "its Startup tests hold before and after 5-2b" is true.

### 2d. Other pages
- Hearts, Color Match, Venom and Rent Day fit at every player count, so the page never takes the fitted path for them.
- The playtest's unfitted canvas is unchanged (`{ showEmptyZones: true }`; "the canvas" Color Match guard passes).
- `fittedBounds` is `TABLE_BOUNDS` for all four.
- The hearts-demo, net-demo and table-demo apps pass no `world`, so their camera is unchanged.
- Rent Day's rules are unchanged, so its 108 examples stay.

## 3. Rulings

**F1 — medium. The init-app test's `base.camera.boundaries` fails typecheck.**
- Evidence: `fakeBase()`'s `camera` literal has no `boundaries`, and `tsc` reports TS2339 (2a). Vitest alone passes.
- Ruling: assert `expect((fake.base as BaseAppComponents).camera.boundaries).toEqual(world)`. `BaseAppComponents` is already imported there, so `fakeBase` (an existing line) is left alone.
- Probe: typecheck is clean and 7/7 pass.
- Cost if wrong: Step 4's typecheck fails, and the implementer either improvises or edits `fakeBase`, which breaches "no existing test line changes".

**F2 — medium (affects 5-2b; G1 incomplete). The old Startup `misfits` line fails once the table grows.**
- Evidence: 2c. "the Board's place on the table"'s `it.each` runs `misfits(placed)`, whose `inWorld` reads `TABLE_BOUNDS`. With 5-2b's zones and Task 1, 8 (T1) or 16 (T3) slots "leave the world". That is a helper reading the wrong world, not a pin, and G1 and 5-2b's constraints list only pins.
- Ruling, part 1: in Task 1, define the bounds-reading helper for `playtest-fitted.test.tsx` at **module scope**, as new lines after `misfits`: `misfitsIn(defs, bounds)`, reusing `fullBox` and `boxesOverlap`. Task 1's new describe uses it.
- Ruling, part 2: the controller adds to 5-2b's Task 1 brief a step that re-points that one line to `misfitsIn(placed, fittedBounds(game.zones))` and re-takes the grown pins. Every value is from the probe:
  - **After 5-2b T1:**
    - "the canvas": `{ opts: { showEmptyZones: true, size: { width: 1200, height: 1038 }, world: { min: { x: -800, y: -692 }, max: { x: 800, y: 692 } } } }`;
    - strip: bench/backlog/research at (−420/0/420, 602); scouting at **(−420, 422)** (x moves from 0); strategy hand (0, 422); brainstorm (420, 422);
    - board: development/operations/ops-team y −38, each 420 tall;
    - development-team at (−420, 138);
    - the unreachable pin is unchanged.
  - **After 5-2b T3:**
    - size 1380, world ±920;
    - strip y 830/650;
    - board y −266, each 418 tall; milestones at (0, 192);
    - development-team at (−420, −90).
- Probe: 2c, with the values from 2b.
- Cost if wrong: 5-2b's Task 1 stops and reports at Step 4, or its executor loosens a guard ad hoc.

**F3 — low. `TALL_GAME` must be written in Step 1, after `CREW_GAME`.**
- Evidence: without it, `fit-layout.test.ts` fails at collection (2a), so Step 2's "the guards pass" can't be observed. If it is placed above `CREW_GAME`, a TDZ ReferenceError breaks every importer of `testing.ts`.
- Ruling: write `TALL_GAME` in Step 1 as fixture scaffolding, below `CREW_GAME`.
- Probe: 2a.
- Cost if wrong: a confusing Step 2.

**F4 — low. One "(guard)" can't pass before the change, and one zoom assertion doesn't discriminate.**
- Evidence:
  - The "(guard) `fittedBounds` is `TABLE_BOUNDS` for MARKET, BOARD and TWO_LINES" fails at Step 2 (`fittedBounds is not a function`).
  - The init-app `setZoomLevel(0.75)` is 0.75 with or without `world` (1380/1200 doesn't bind), so it doesn't test the world's height.
- Ruling, part 1: drop "(guard)" from the `TABLE_BOUNDS` assertion. The guard is "every existing test in the file passes unchanged".
- Ruling, part 2 (optional, recommended): add `start({ size: { width: 1200, height: 920 }, world: ±920 })` → `setZoomLevel(0.5)`.
- Probe: the 0.5 case fails at HEAD (0.75) and passes with Task 1.
- Cost if wrong: TDD-step confusion, or a fit that ignores the world's height slips through.

**F5 — low. The test for leaving `world` out.**
- Ruling: `fittedBounds` returns the **`TABLE_BOUNDS` object itself** when nothing grows, and playtest leaves `world` out when `bounds === TABLE_BOUNDS`. If it returned a fresh equal object, `world` would be passed and "the canvas" guard would fail.
- Probe: 2a uses identity, and the guard passes.
- Cost if wrong: one failing guard.

**F6 — low. The brief's "re-check the HEAD names above" points at nothing.**
- Evidence: the brief is Task 1 verbatim and has no "Assumed from earlier plans" list.
- Ruling: paste the Task 1 subset from table §1 into the brief.

**F7 — low (no test sees it). Comments that go stale.**
- Ruling: update them.
  - `init-app.ts:120-127` ("…`fit` zoom computed from TABLE_BOUNDS below");
  - `playtest.tsx:47` ("draws the 1600 x 1200 world at three quarters");
  - `fit-layout.ts` header ("the fixed table world") and `fittedLayout`'s doc (band "between").

## 4. Gaps (not Task 1's to fix)
- **Ga:** a fitted table with **no band** (n = 0) never grows, even if its shared and strip lines would overrun 1200. This was true before Task 1, and no game reaches it today (Chores has no band and fits). Parked.
- **Gb:** no real browser sees the grown canvas until Task 4, after 5-2b.
  - Optional: in Task 1, run a one-shot Playwright smoke (pre-installed Chromium) with `TALL_GAME` pasted in the designer. Check the canvas is 1200×1380, then click a strip card near y 830 and check that the hover detail names it.
  - Low cost if skipped: a pointer-mapping bug would surface at Task 4.
- **Gc:** 5-2b's tableau-line pins ("lists every player's tableau", "recruits from every source…") are 5-2b's own concern. They are listed in 2c for its controller.

## 5. Brief edits for Task 1
1. **Top of the brief:** replace "re-check the HEAD names above" with the list in table §1:
   - `fittedLayout`, private `wrap`, `MARGIN` 20, `LABEL_ROOM` 24, `LINE_GAP` 16, `STACK_GAP` 36, `STACK_STEP` 34, `stackOnHolders`, `keepPlaced`;
   - `makeInitApp(renderer, { showEmptyZones?, size? })` with its `TABLE_BOUNDS` camera block;
   - the playtest `FITTED_WIDTH`/`FITTED_HEIGHT`/`initFittedApp`;
   - the scaffolds `MARKET`, `BOARD`, `TWO_LINES`, `box`, `overlap`, `seats`, `start`, `fakeBase`, `mount`, `canvasMadeWith`, `fullBox`, `boxesOverlap`, `misfits`;
   - `CREW_GAME`'s idle line.
2. **Step 1, first:** add `TALL_GAME` to `testing.ts` below `CREW_GAME` (fixture scaffolding, so Step 2 can show the guards passing). (F3)
3. **Step 1, `fit-layout.test.ts`:** drop "(guard)" from "`fittedBounds` is `TABLE_BOUNDS` for MARKET, BOARD and TWO_LINES". It is a new test that fails at Step 2, and the guard is "every existing test passes unchanged". (F4)
4. **Step 1, `init-app.test.ts`:** assert `(fake.base as BaseAppComponents).camera.boundaries` toEqual the world. Leave `fakeBase` as it is. Optionally add `size 1200×920, world ±920 → setZoomLevel(0.5)`. (F1, F4)
5. **Step 1, `playtest-fitted.test.tsx`:** "its `misfits` read against `b`" means a new **module-scope** `misfitsIn(defs, bounds)` defined right after `misfits` (reusing `fullBox` and `boxesOverlap`). Plan 5-2b will point the old Startup `it.each` at it. (F2)
6. **Step 3:** `fittedBounds` returns the `TABLE_BOUNDS` object itself when nothing grows. `playtest.tsx` leaves `world` out exactly when `bounds === TABLE_BOUNDS`. Update the stale comments in F7. (F5, F7)
7. **Step 2 expectation:** the new tests fail, and the existing ones and "the fixture compiles / doesn't fit" pass.
   - In the probe that was 22 failing: 1 init-app, 15 fit-layout and 6 playtest. Step 4 then gives the baseline 3594 + new tests.
   - Typecheck must be clean (F1).

**Controller note for plan 5-2b (not a Task 1 edit):** after Task 1 lands, 5-2b Task 1's brief should list two kinds of fitted-page edits:
- the re-pointing of the `misfits(placed)` line to `misfitsIn(placed, fittedBounds(game.zones))`;
- the pins in F2: canvas 1038 / ±692, strip at 602/422 with scouting x −420, board y −38 h 420, development team at (−420, 138); then at T3, 1380 / ±920, strip at 830/650, board y −266 h 418, milestones at (0, 192), development team at (−420, −90).

The unreachable pin and Task 1's new describe stay as they are.
