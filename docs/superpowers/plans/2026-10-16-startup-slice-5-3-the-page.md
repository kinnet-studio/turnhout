# Startup Simulator Slice 5-3 (The page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The playtest page shows slice 5. Talent faces carry XP by colour, Skill tokens, Pending tokens and Badges, and the flags a press reads (Agile and the pending Badge among them). The Strategy Hand and the Brainstorm row sit in the private strip with only their sizes shown to rivals. The Milestones sit on the shared table and in their claimant's row. Training, Brainstorm and graduation are played under the buttons. A fitted table too short for all of it grows taller.

**Architecture:**
- **This is plan 5-3 of three** (spec R13). It runs after plans 4-3, 5-1, 5-2a and 5-2b, except Task 1 (see G1), and takes them as given (see "Assumed from earlier plans").
  - It changes no rules text and no phrase's meaning.
  - What the page needs and those plans don't provide is listed under "Gaps", not planned here.
- **Four tasks:**
  1. a fitted table that needs more room grows taller (core layout, the app's camera, the page's canvas);
  2. the view labels the flags a press reads, and works out a flag read through the card a card sits on only for a seat that sees that card (core);
  3. faces off the Board, and slice 5 played on the page (page code, happy-dom tests);
  4. the browser check, the README and the final checks.
- **Nothing in shared code knows Startup Simulator.**
  - Core: `fit-layout.ts` gains `fittedBounds`; `worked-view.ts` gains `pressFlags` and `holderFlags`; `board-view.ts`'s `workedView` uses them; `attach-phrases.ts` exports `HOLDER_PHRASES`.
  - App: `makeInitApp`'s options gain `world`.
  - Page: `board-text.ts` gains `keptBadges`; `playtest.tsx` sizes the fitted canvas from `fittedBounds` and merges `keptBadges` into the decor.
- **Calls this plan makes** (the spec leaves "the faces' token display" to the builder):
  1. **A fitted table grows taller** (Task 1).
     - Slice 5's zones make three shared lines, two strip lines and two band lines (the claimed-Milestones row wraps onto a second band line). In the 1200-tall world each band line is then 98 tall, and with plan 5-2b's Strategy zones alone the development team's hanging cards already reach the strip (G1).
     - When the band's lines, shared equally as today, would be shorter than `HANG_ONE` (316: a card, its caption's gap and one card hanging under it), the world grows evenly up and down until each band line is `HANG_FOUR` (418: four cards hanging at a full step). The height is rounded up to a multiple of 8.
     - The canvas still draws the world at three quarters: 1200 wide and ¾ of the world tall. For Startup Simulator after slice 5 that is a 1840-tall world on a 1200 × 1380 canvas.
     - A table that fits today keeps every place: Startup up to plan 5-2a has a band of 416. Rows are not narrowed, since squeezed cards hide each other's corner labels, and no zone is left off, since a seat may need to click a card in it.
  2. **Flags a press reads are labelled** (Task 2).
     - A worked flag is also labelled when a button's `Then:` lines name it. That covers the condition of an `If` line (`If some card on it is helping, …`), a flag an effect tests (`Every card on it that is eager is keen.`) and a group's flag test (`The picked cards that are clinging go …`).
     - It never covers an `Only if` line, an option's included. Those flags already show as the button's verdicts.
     - The flags this keeps change what a press does to the cards it moves and the cards they join. In Startup Simulator they are:
       - `managing` and `agile`: Synergy, the Agile spare at Assign and Reassign, and Brainstorm's third card;
       - `coaching`: the working Veteran's Mentor;
       - `pending badge`: the pending Badge;
       - `attaching`: the Growth Hacker and the Sales Rep.
     - Training's fits, `choosing a token`, `mentorable` and the learners are not labelled.
  3. **The card it is on** (Task 2).
     - A labelled flag may read the card its card sits on (plan 5-1's two conditions, `HOLDER_PHRASES`) as well as the card and the cards on it.
     - Which flags are labelled is still decided by the rules alone. For each card, such a flag is worked out only when the seat sees the face of the card it sits on, or it sits on none. So the view never carries a value read from a card the seat can't see.
     - That is the pending Badge: every seat sees a project in development today. In slice 9, a face-down project leaves it off for the seats it is hidden from, whatever the project's tier.
  4. **Tokens on faces** (Task 3).
     - Tokens are counts and flags that cards keep. 4-3's label already names them on a Board, for example `badged, 2 blue xp, 1 red skill, 1 pending blue`, and so does its Board line, in square brackets. A Pending token is marked by its name.
     - Off a Board, a card whose face the seat is given is labelled with what it keeps (`keptBadges`). Examples: a trained Junior on its owner's bench, and one in the open job market that every seat may hire for $1 (R4).
     - Nothing is worked out off a Board, as before.
  5. **Counting player values stay unshown.**
     - `active tags` is a count, and `operational revenue` reads `rev`, which reads its owner's ops team (Bug Decay). 4-3's `shownPlayerValues` keeps neither.
     - The page shows player values only as gauges, and no button waits on either.
     - Platform Power's progress can be read off the Board line, which names each Active product's tag. Task 2 pins this as a guard.
  6. **No new page code for the strip, the Milestones or the buttons.**
     - `fittedLayout` already puts rows only their owner sees in the private strip and shared rows at the top.
     - The tableau line counts every seat's zones, for example `strategy hand 2 · brainstorm 0 · milestones 1`.
     - 3-2's picker, offer and choice step already play Training (targets offered zone by zone, plan 5-1), Brainstorm, the strategy cleanup and graduation. Task 3 pins each through the page.
- **Parked, unchanged:** a band line that no card hangs in (the claimed-Milestones row) is as tall as the others; the hover line, which lists a card's kept facts from its face key already.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19, PixiJS 8; Playwright (global install, Chromium in `/opt/pw-browsers`) for the browser check.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-5-talent-growth-design.md` is binding, above all "The page" and the rulings R1–R13:
- "Talent faces show XP by color, Skill tokens, Pending tokens (marked as pending) and Badges";
- "The Strategy Hand sits in the private strip; rivals see its size";
- "The revealed Milestones sit on the shared table with their claimant";
- R8: "The Pending Badge is a worked flag … for the face only";
- R13: "5-3, the page (about 3)".

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding: its anti-goals (hidden information leaking, the Strategy Hand among it; Startup words in shared code) and "Designers never see engine words". These plans are inputs:
- 4-3 (`…-4-3-the-page.md`): the model for this plan, and the view's player values, gauges, faded cards, count labels and mode labels;
- 5-1: its "Left to 5-3";
- 5-2a and 5-2b: their forward notes for 5-3.

## Global Constraints

- **Sequencing (controller ruling).** Task 1 runs before plan 5-2b (5-2b's zones need the taller fitted table); Tasks 2–4 run after 5-2b. The Pending Badge flag is `pending badge` (renamed from `up for promotion` in 5-2a, the rulebook's term).

- **Controller amendment (Task 1 pre-flight at `c3ac18a`).** The scan is in the plan's SDD workspace (`preflight-t1.md`; probes in the scratchpad's `pf53t1/`). Task 1 built as written works: every number matches the code (band 416 at HEAD, not grown; 1200×1038 after 5-2b Task 1; a 1840-tall world on a 1200×1380 canvas after 5-2b Task 3), the other games' layouts are unchanged, no existing test changes. Rulings for Task 1 (Tasks 2–4 get their own pre-flight after 5-2b):
  - **F1.** `init-app.test.ts` asserts `expect((fake.base as BaseAppComponents).camera.boundaries).toEqual(world)`; `fakeBase` stays as it is (its camera literal has no `boundaries`, so the plan's `base.camera.boundaries` fails typecheck).
  - **F2 (forward to 5-2b).** `playtest-fitted.test.tsx` gains a module-scope `misfitsIn(defs, bounds)` right after `misfits` (reusing `fullBox` and `boxesOverlap`); Task 1's new describe uses it. Plan 5-2b's Task 1 re-points the old Startup `misfits(placed)` line to `misfitsIn(placed, fittedBounds(game.zones))` and re-takes the grown pins (listed in `preflight-t1.md` F2).
  - **F3.** `TALL_GAME` is written in Step 1 as fixture scaffolding, in `testing.ts` below `CREW_GAME` (above it is a TDZ error).
  - **F4.** "`fittedBounds` is `TABLE_BOUNDS` for MARKET, BOARD and TWO_LINES" is a new test, not a guard; add the zoom case `size 1200×920, world ±920 → setZoomLevel(0.5)` (the plan's 0.75 doesn't see the world's height).
  - **F5.** `fittedBounds` returns the `TABLE_BOUNDS` object itself when nothing grows; `playtest.tsx` leaves `world` out exactly when `bounds === TABLE_BOUNDS`.
  - **F6.** The HEAD names Task 1 re-checks: `fittedLayout`, private `wrap`, `MARGIN` 20, `LABEL_ROOM` 24, `LINE_GAP` 16, `STACK_GAP` 36, `STACK_STEP` 34, `stackOnHolders`, `keepPlaced`; `makeInitApp(renderer, { showEmptyZones?, size? })` with its `TABLE_BOUNDS` camera block; playtest's `FITTED_WIDTH`/`FITTED_HEIGHT`/`initFittedApp`; the scaffolds `MARKET`, `BOARD`, `TWO_LINES`, `box`, `overlap`, `seats`, `start`, `fakeBase`, `mount`, `canvasMadeWith`, `fullBox`, `boxesOverlap`, `misfits`; `CREW_GAME`'s idle line.
  - **F7.** Update the comments that go stale: `init-app.ts` (~120–127, the `fit` zoom from TABLE_BOUNDS), `playtest.tsx` (~47, "draws the 1600 x 1200 world at three quarters"), `fit-layout.ts`'s header and `fittedLayout`'s doc.
  - Step 2 expects the new tests to fail (22 in the probe: 1 init-app, 15 fit-layout, 6 playtest) and every existing test to pass; Step 4 gives 3594 plus the new tests, typecheck clean.
- **Controller amendment (Tasks 2–4 pre-flight at `2a6147d`).** The scan is in the plan's SDD workspace (`preflight.md`; probes in the scratchpad's `pf53/`, `pf53-t2s2/`, `pf53-browser/`). With the seven rulings applied in a probe copy the full suite passes (3637 + 17), typecheck is clean, the long runs are no slower and the browser check runs all 13 steps with no page errors. No hidden-information leak was found (a flag read through the card it sits on is worked out only for seats that see that card; off-Board labels only on faces the seat is given; rivals see only the Strategy Hand's and Brainstorm's sizes). Exact texts: `preflight.md` §4 and §6.
  - **R1 (High, Task 2).** `agile` reads `It is managing.` and `It is badged.` through `it is {cardflag}`, which `cardOnlyNames` doesn't count as card-only, so `agile` is never labelled. `library/fact-phrases.ts` exports `IT_IS_FLAGGED`, and `cardOnlyNames` treats a `condition` `it is {cardflag}` as card-only exactly as it treats `it is not {cardflag}` (tracing the flag's own lines). Task 2 adds `fact-phrases.ts` to its files and a proud/watched/nosy test; no other existing test or shown value changes.
  - **R2 (Medium, Task 3).** 4-3's "badges no card in a backlog" pin breaks: the seat's own backlog card is now labelled `3 bugs`, as intended. Rename that test and change its ~l.1271 to expect the label; its rival half still holds.
  - **R3 (Medium, Tasks 3–4; plan lines ~40, ~127, ~186).** Labels and fixtures use 5-2a's P2 names: `2 red xp tokens`, `1 blue skill token` (singular at 1), and so on.
  - **R4 (Low, Task 3).** The brainstorm status reads `seat: S — brainstorm — Your turn — …`; `inOrder` returns cards, so map them to names.
  - **R5 (Low, Tasks 2, 4).** `pressFlags(SHOWN)` is a new test, not a "(guard)"; write `PERCH_GAME` first (below `SORT_GAME`); add a test for a flag tested through a group of cards (`{cardgroup}`). Task 4's checks run over `bbe5c92^..bbe5c92` and `BASE2..HEAD`, where `BASE2` is HEAD when Task 2 starts.
  - **R6 (Medium, Task 4).** The browser script as written fails: (a) set the ~200 KB rules text directly with one input event, not Playwright's `fill`; (b) keep 4-3's dialog handler; (c) after the Setup edit the designer shows `241 of 243 examples pass` (the two failures are expected); (d) `at()` centres on the canvas box; (e) step 11's name check looks only in the playtest area (the Examples panel names Training cards); (f) labels on the squeezed ops team are read from the Board line.
  - **R7 (Low, Task 4 README).** 5-1's "Beyond the card" bullet says the playtest never shows such a flag on a face; Task 2 makes that false for the card it sits on — amend it, and add the `agile` line with R1.
  - **Gaps (parked):** milestone faces break names mid-word ("Clean Launc|h") in the face renderer; greyed reasons for an `Only if one of:` group read "… or The target card is …" with mid-sentence capitals (5-1/5-2b friendly reasons); 5-2b's G1 (plan 6-1).
- **Branch and commits.**
  - Develop on `claude/peaceful-curie-rdfkow`.
  - Commit by pathspec, never `git add -A`.
  - Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.**
  - This plan adds no `state.data` key, no card `data` key and no move field.
  - The view's shapes are unchanged: `WorkedCard.flags` only lists more names.
- **No Startup Simulator words in shared code** (code, comments, test names and shared test fixtures). The banned list is plan 5-1's:
  - plan 1b-2's words, slice 3's and slice 4's, as 4-3 lists them;
  - slice 5's: xp, pending, skill, badge, rank, mentor, synergy, agile, graduate, training, brainstorm, strategy, milestone, senior.
  - **Where they may appear:**
    - `src/games/startup-simulator.*`;
    - `src/pages/designer/designer-page.test.tsx`, `playtest-fitted.test.tsx` and `tableaux.test.ts`;
    - `src/pages/designer/samples.ts`;
    - `README.md` and `docs/`.
  - **The page's word "badge"** (a card's corner label, `CardDecor.badge`, `boardBadges`) is the older use plan 5-1 names. New page code may use it for the label, never for the game's Badge. Core code (`src/engine/core/**`) says "label".
  - **Ordinary words to avoid:**
    - write "waiting", not "pending";
    - "goes to", not "leads";
    - "a mistake in the code", not "a bug";
    - never "stall" or "market" as a fixture zone.
  - **`CREW_GAME`'s hands have a `skill` column.** New fixture lines never name it.
- **Hearts, Color Match, Venom and Rent Day stay unchanged** (Rent Day keeps its 108 examples).
  - Their views carry no `worked` key they didn't carry before.
  - Their tables are not grown.
  - They get no `decor` they didn't get.
- **Every number comes from the rulebook.** Each Startup test says where its numbers come from.
- **Hidden information** (overview anti-goal; 3-2's and 4-3's lessons):
  - What the view shows is decided by the compiled rules alone.
  - The view never carries a value worked out from a card or zone the seat can't see. Worked-view's card-only rule holds, and so does 4-3's rule for player values; Call 3 extends them to the card a card sits on.
  - Labels and Board text read only the cards as the seat's scene gives them, and a face-down card has no data.
- **A ring or picker never outlasts its view.** Everything this plan adds to the decor is derived from the latest view in the render that receives it, and adds no page state.
- **No measured `Text`.** A `Text`'s size is never measured under happy-dom. This plan adds no Pixi text, and any width is taken with `boldTextWidth`.
- **Earlier plans come first.** Their code is referred to by the names their Interfaces blocks give. Each task re-checks the names it consumes at HEAD before starting, and stops and reports one that differs.
- **Existing tests.**
  - No existing test line changes, except the ones Task 2 names.
  - New names are imported on new `import` lines.
  - If any other existing test fails, stop and report it.
- **The browser check** uses the pre-installed Chromium (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; never `playwright install`).
  - Its scripts and screenshots stay in `/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-5-3/`, never in the repo.
  - Its setup lines go where every seed sets up: before Setup's deal, checked at seeds 1 to 10 (4-3's P2).
- **Page copy (exact):**
  - **A label** (4-3's badge), on a Board card: the flags it keeps that are set, in declared order; then the worked flags the view lists, in `game.worked` order; then its lone counts, in declared order; joined by `, `.
  - **Off a Board:** the kept flags, then the lone counts. Example: `badged, 2 red xp, 1 blue skill`.
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Record `BASE=$(git rev-parse HEAD)` before the first task this plan runs, and run `bun run test` once to get the passing count.
  - When Task 1 ran ahead of plan 5-2b (G1), also record `BASE2` before Task 2. Task 4's checks then cover Task 1's own commit and `BASE2..HEAD`.
- **No new dependencies.**
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.
  - A test marked "(guard)" passes before its task's change, and says so.

## Review Focus

- **A flag read through the card a card sits on, when the seat can't see that card.** Today that means the card is in a zone only its owner sees; in slice 9 it means a face-down card.
  - Expected: the flag is not worked out for that seat, and the owner's view keeps it.
  - Test: Task 2.
- **A card with tokens off the Board.**
  - Expected: its owner alone sees a bench card's tokens; every seat sees an open job market card's; a face-down card has none.
  - Tests: Task 3 (board-text and the page).
- **A fitted table whose band would be too short** (slice 5's zones, on one band line or two).
  - Expected: it grows, every slot stays apart inside the grown world, and the development team hangs clear of the strip.
  - A band tall enough, or none, is laid out as before.
  - Tests: Task 1.
- **A rival's tab while a seat Brainstorms or holds a full Strategy Hand.**
  - Expected: sizes only, never a name. The strategy discard's top card is seen by all.
  - Test: Task 3.
- **Undo while a question or an offer is open** (the Mentor's colour, a Brainstorm card offered).
  - Expected: it closes with its rings, and nothing is sent.
  - Test: Task 3.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name, not by line; if one is missing or differs, stop and report it.

- **HEAD (3-2, 1b-3):**
  - `fit-layout.ts`: `fittedLayout`, its private `wrap`, `MARGIN` (20), `LABEL_ROOM` (24), `LINE_GAP` (16), `STACK_GAP` (36), `STACK_STEP` (34), `stackOnHolders`.
  - `utils/init-app.ts`: `makeInitApp(renderer, { showEmptyZones?, size? })`, which sets the camera's `boundaries`, zoom and position from `TABLE_BOUNDS`.
  - `worked-view.ts`: the private `readsOnlyCards`, `cardOnlyNames`, `testNames`, `isWorked`, and `shownFlags`.
  - `board-view.ts`: `seesFace` and the private `workedView` and `cardsKept`.
  - `choices.ts`: `CHOOSE_ONE`, `CHOOSE_PLAYER`, `ChoiceOption`.
  - `attach.ts`: `holderIdOf`, `putOn`.
  - Test scaffolds:
    - `fit-layout.test.ts`: `MARKET`, `BOARD`, `TWO_LINES`, `box`, `overlap`, `seats`;
    - `init-app.test.ts`: `start`, `fakeBase`;
    - `board-text.test.ts`: `CREW`, `TIRED`, `arrange`, `idsOf`, `cardOf`;
    - `playtest-fitted.test.tsx`: `mount`, `setUp`, `idOf`, `S`, `N`, `O`, `hint`, `lineOf`, `status`, `press`, `picker`, `pickNamed`, `cardsIn`, `fittedZone`, `canvasMadeWith`, `click`, `offer`, `choose`, `ring`, `inOrder`, `named`, `offered`, `noOffer`. `tab` and `boardOf` are local to a describe, so define your own.
- **4-3 (built):**
  - `boardBadges(game, cards, worked?)` and `loneCounts(card, game)` in `board-text.ts`.
  - `LayoutOptions.keepPlaced`.
  - `shownPlayerValues` and its Startup pin.
  - The `playtest-fitted.test.tsx` helpers `askedGroup`, `askedOptions`, `answerAsked`, `seatButtons`.
  - Task 4's `a Growth Hacker hangs under its product` test and its `board-${S}` pin.
  - The README's "The Board" bullets.
- **5-1 (built):**
  - `registerAttachPhrases` with the conditions `the card it is on is {cardclass}` / `… is not {cardclass}` and the effect `every card on it that is {cardflag} is {cardflag}`.
  - `SORT_GAME`, `BOOST_GAME` and `YARD_GAME` in `testing.ts`.
  - Targets in several zones: `CardPick.ontoAlso`, and `ontoPrompt`'s `Pick where it goes: a card in your …, your … or your …`.
  - The phrase-set test titled "are these 22".
- **5-2a (built):**
  - Counts `blue xp` … `pending green`, `training xp`; flags `badged`, `graduated`.
  - Worked `experienced`, `managing`, `agile`, `coaching`, `pending badge`.
  - Phase `graduation` with `keep blue on a card in their ops team` (and red, green) and `mentor a card in their ops team`.
  - `shownFlags`' pin with `experienced` and `practised`.
- **5-2b (built):**
  - Zones `strategy deck`, `strategy discard`, `milestone deck`, `milestone row`, and each player's `strategy hand`, `brainstorm`, `milestones`.
  - Buttons `brainstorm`, `brainstorm after flushing some cards from their strategy hand`, `keep a card in their brainstorm`, `discard a card in their strategy hand`, and `play a card from their strategy hand to a card in their bench, their development team or their ops team`.
  - Phases `brainstorm` and `strategy cleanup`.
  - The six Milestone names.
  - Player values `operational revenue` and `active tags`.

---

### Task 1: A fitted table that needs more room grows taller

Before starting: re-check the HEAD names above and 4-3's `keepPlaced`. This task needs no slice 5 rules, and is meant to run before plan 5-2b (G1). Its Startup tests hold before and after 5-2b.

**Files:**
- Modify: `src/engine/core/lang/fit-layout.ts`, `src/utils/init-app.ts`, `src/pages/designer/playtest.tsx`, `src/engine/core/lang/testing.ts` (`TALL_GAME`)
- Test: `src/engine/core/lang/fit-layout.test.ts`, `src/utils/init-app.test.ts`, `src/pages/designer/playtest-fitted.test.tsx` (all append)

**Interfaces:**
- Produces (for Tasks 3–4):

```ts
// fit-layout.ts
/** A band line's least height: a card, the gap its caption takes, and one card hanging under it. */
export const HANG_ONE = 2 * CARD_HEIGHT + STACK_GAP;   // 316
/** A grown band line: a card and four hanging under it at a full step. */
export const HANG_FOUR = HANG_ONE + 3 * STACK_STEP;    // 418
/** The world a fitted table lies in: TABLE_BOUNDS, or one as wide and taller, centred on 0, when the band's lines would be shorter than HANG_ONE. */
export function fittedBounds(zones: ZoneSpec[]): { min: { x: number; y: number }; max: { x: number; y: number } };
// init-app.ts, makeInitApp's options gain:
world?: { min: Vec2; max: Vec2 };   // the camera's boundaries and the box its zoom fits; TABLE_BOUNDS when left out
// testing.ts
/**
 * CREW_GAME with five more rows in the center, three more rows only their owner sees and two more everyone sees: three shared lines,
 * two private lines and two band lines, more than the table's height holds.
 */
export const TALL_GAME: string;   // CREW_GAME with these lines added after its idle row's line, in this order:
//   The fair / The bazaar / The booth / The yard / The loft is a row in the center that everyone can see.
//   Each player has a drawer / a locker / a satchel row that only they can see.
//   Each player has a shelf / a rack row that everyone can see.
```

- **`fittedBounds`.** Wrap the zones into lines as `fittedLayout` does (shared, private, band). Then:
  - `spent` is `2·MARGIN + LABEL_ROOM`, plus each shared line's and each private line's height + `LINE_GAP` + `LABEL_ROOM`, plus `(n − 1)·(LINE_GAP + LABEL_ROOM)` for `n` band lines.
  - The result is `TABLE_BOUNDS` when `n` is 0, or when `floor((1200 − spent) / n)` is at least `HANG_ONE`.
  - Otherwise the height is `spent + n·HANG_FOUR`, rounded up to a multiple of 8, and the bounds are TABLE_BOUNDS' x by ±height/2.
- **`fittedLayout`** places the strip up from the bounds' `max.y − MARGIN`, and the shared lines down from their `min.y + MARGIN + LABEL_ROOM`. Nothing else changes.
- **`makeInitApp`** with `world` sets the camera's `boundaries` to it. Its zoom fits the world's width and height, and its position is the world's centre.
- **`playtest.tsx`.** The fitted canvas is `FITTED_WIDTH` wide and `¾ ×` the bounds' height tall, in both the app's `size` and the canvas box.
  - Its app is made with `{ showEmptyZones: true, size, world }`.
  - `world` is left out when the bounds are `TABLE_BOUNDS`, so a table that fits today is made with exactly what it was before.
  - The app is memoised on the game.

- [ ] **Step 1: Write the failing tests.**

  In `fit-layout.test.ts`, append `describe('a fitted table that needs more room')`, with `const TALL = compileGame(TALL_GAME, lib).game!.zones` and a local `fitsIn(defs, bounds)`: `misfits` read against the bounds given rather than `TABLE_BOUNDS`.
  - **The fixture.**
    - It compiles with `[]`.
    - `fitsTable(TALL, seats(n))` is false for n = 2…5.
  - **The bounds.** `fittedBounds(TALL)` is `{ min: { x: -800, y: -920 }, max: { x: 800, y: 920 } }`.
  - **The layout.** `fittedLayout(TALL, 'p1')` places:
    - shared lines at y −806 (`pile` x −630, `hall` −360, `scrap` 60, `fair` 480), −626 (`bazaar` −420, `booth` 0, `yard` 420) and −446 (`loft` 0);
    - the strip at y 830 (`stash-p1` −420, `drawer-p1` 0, `locker-p1` 420) and 650 (`satchel-p1` 0);
    - the band at y −266 (`workshop-p1` −420, `idle-p1` 0, `shelf-p1` 420) and 192 (`rack-p1` 0), each band row with bounds `{ width: 400, height: 418, anchor: { x: 0.5, y: 70 / 418 } }`;
    - `crew-p1` free at (−420, −90).
  - **One band line.** Without the rack's line:
    - the bounds are ±692 (1382 rounded up to 1384);
    - `workshop-p1`'s bounds height is 420, and it is at (−420, −38).
  - **Review Focus.** For viewers p0…p4, with and without the rack:
    - `fitsIn(table, fittedBounds(zones))` is `[]`;
    - `unreachableZones(table, 7)` is `` [`workshop-${viewer}: centre goes to crew-${viewer}`] ``, as on TWO_LINES' band.
  - **(guard)** `fittedBounds` is `TABLE_BOUNDS` for `MARKET`, `BOARD` and `TWO_LINES`, and every existing test in the file passes unchanged.

  In `init-app.test.ts`, append a test:
  - `start({ size: { width: 1200, height: 1380 }, world: { min: { x: -800, y: -920 }, max: { x: 800, y: 920 } } })`:
    - `resize` is called with `(1200, 1380)`;
    - `setZoomLevel` with `0.75`;
    - `setPosition` with `{ x: 0, y: 0 }`;
    - `base.camera.boundaries` equals the world.
  - **(guard)** The two existing size tests pass unchanged.

  In `playtest-fitted.test.tsx`, append `describe('a fitted table that grows')`:
  - Mount `{ game: compileGame(TALL_GAME, lib).game!, players: 2 }`:
    - `canvasMadeWith` is `{ opts: { showEmptyZones: true, size: { width: 1200, height: 1380 }, world: { min: { x: -800, y: -920 }, max: { x: 800, y: 920 } } } }`;
    - `table!.tableDef.zones` equals `fittedLayout(…zones, 'p0')`.
  - **Startup Simulator, for viewers p0…p4.** With `b = fittedBounds(game.zones)`:
    - its `misfits` read against `b` is `[]`;
    - every board row's `bounds.height` is at least `HANG_ONE`;
    - the development team's `transform.y + CARD_HEIGHT / 2` is above every private zone's `transform.y − CARD_HEIGHT / 2`.
  - **(guard)** At a HEAD without plan 5-2b's zones, "the canvas" and "the Board's place on the table" pass unchanged.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/fit-layout.test.ts src/utils/init-app.test.ts src/pages/designer/playtest-fitted.test.tsx`. Expected: the new tests FAIL, and the guards pass.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/engine src/utils src/pages/designer src/pages/hearts-demo src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/fit-layout.ts src/utils/init-app.ts src/pages/designer/playtest.tsx src/engine/core/lang/testing.ts \
  src/engine/core/lang/fit-layout.test.ts src/utils/init-app.test.ts src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(lang): a fitted table whose band would be too short to hang a card under another grows taller, and its canvas with it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: The view labels the flags a press reads, and reads the card a card sits on only where the seat sees it

Before starting:
- Re-check 5-1's attach phrases, `SORT_GAME`, `BOOST_GAME` and `YARD_GAME`.
- Re-check 5-2a's worked names and 4-3's `shownPlayerValues` pin.
- Read the order of `game.worked` for Startup Simulator.

**Files:**
- Modify: `src/engine/core/lang/library/attach-phrases.ts` (export `HOLDER_PHRASES`), `src/engine/core/lang/worked-view.ts`, `src/engine/core/lang/board-view.ts` (`workedView`), `src/engine/core/lang/testing.ts` (`PERCH_GAME`)
- Test: `src/engine/core/lang/worked-view.test.ts` (append), `src/games/startup-simulator.test.ts` (append)
- Changed lines: `src/pages/designer/playtest-fitted.test.tsx`, in 4-3 Task 4's `board-${S}` pin, ` with Growth Hacker ·` becomes ` with Growth Hacker (attaching) ·`.
  - The same holds for any other existing pin of a Growth Hacker's, Sales Rep's or PM's Board text or worked flags on a Board. Name each in the report.

**Interfaces:**
- Consumes: `readsOnlyCards`, `cardOnlyNames`, `testNames`, `shownFlags`, `seesFace`, `holderIdOf`, `CHOOSE_ONE`, `CHOOSE_PLAYER`.
- Produces (for Tasks 3–4):

```ts
// attach-phrases.ts: each used in its own registration
export const HOLDER_PHRASES = ['the card it is on is {cardclass}', 'the card it is on is not {cardclass}'] as const;
// worked-view.ts
/** The worked flags a button's Then: lines name (Call 2) whose lines read only the card, the cards on it and the card it is on, in game.worked order. */
export function pressFlags(game: CompiledGame): string[];
/** Those of pressFlags whose lines read the card it is on (Call 3). */
export function holderFlags(game: CompiledGame): string[];
// testing.ts
/** SORT_GAME where a Potter on a job that is not a Vase is perched, and finishing a job crowns every perched card on it. */
export const PERCH_GAME = [SORT_GAME
  .replace('  Cards can be keen.', '  Cards can be keen.\n  Cards can be crowned.')
  .replace('      Every card on it that is eager is keen.\n',
    '      Every card on it that is eager is keen.\n      Every card on it that is perched is crowned.\n'), '',
  'Perched:', '  Only if it is a Potter card.', '  Only if the card it is on is not a Vase card.',
].join('\n');
```

- **Named in `Then:` lines.**
  - It walks each button's `effects`:
    - into an `if`'s condition (whole, even when it is two) and its effect;
    - into a `for`'s and a `for each`'s effect;
    - into each option's `effects` of a `CHOOSE_ONE`, never its own or an option's `conditions`;
    - into a `CHOOSE_PLAYER`'s effect, never its clause or `conditions`.
  - It collects every `{cardflag}` argument, and the flag tests (`testNames`) of every `{cardgroup}` and `{cardclause}` argument.
  - It keeps the worked flags among them.
- **`readsOnlyCards`** takes an optional `holder` argument, false by default. With `holder` true, a condition whose phrase is in `HOLDER_PHRASES` reads no name and counts as read. The flag's own lines and every value they read follow the same rule. Existing callers are unchanged.
- **`holderFlags`** are the press flags that `readsOnlyCards` without `holder` refuses.
- **`workedView`.**
  - Its flags are those of `game.worked`, in order, that are in `shownFlags` or `pressFlags`.
  - For each card, a `holderFlags` flag is worked out only when `holderIdOf(card)` is null, or the seat `seesFace` the card it names.
  - Everything else is as before: one throw leaves that card out.

- [ ] **Step 1: Write the failing tests.**

  In `worked-view.test.ts`, append `describe('the flags a press reads')`:
  - **The fixture.** `PERCH_GAME` compiles with `[]`; assert that each `.replace` found its text.
  - **Which flags.**
    - `pressFlags(PERCH_GAME)` is `['helping', 'eager', 'perched']`, and `holderFlags` is `['perched']`.
    - `shownFlags(PERCH_GAME)` is `[]`, so the view's other flag rule is unchanged.
    - `torn` and `helpable` are only in `Only if` lines and `single` is only in a `When` rule, so none of them is a press flag.
    - With the help button's Gold option also guarded by `          Only if it is torn.`, `pressFlags` is the same.
    - `pressFlags(YARD_GAME)` is `['clinging']`, a group's flag test in an effect.
    - `pressFlags(BOOST_GAME)` is `[]`: its `high` is read by no button.
  - **Review Focus: beyond the card.** Take `SORT_GAME`, with `Watched:\n  Only if its owner has a card in their stash that is tired.` appended and `Every card on it that is watched is keen.` added after the eager line. Its `pressFlags` leaves `watched` out.
  - **The view.** A 2-player `PERCH_GAME` engine at seed 1, arranged:
    - p0's workshop holds the first Vase and the first Statue;
    - the first Potter is `putOn` the Vase, and the second Potter and the first Smith the Statue, in `crew-p0`;
    - the first Tinker goes to `idle-p0`.

    For viewers p0 and p1, `worked` is `{ [potter2]: { columns: {}, flags: ['perched'] }, [smith]: { columns: {}, flags: ['helping'] }, [tinker]: { columns: {}, flags: ['eager'] } }`. With `tired: true` on the Smith, it has no entry.
  - **Review Focus: the card it is on unseen.** Relocate the Statue to `stash-p0` (its cards stay on it):
    - p1's `worked` has no entry for the second Potter, and still has `['helping']` for the Smith;
    - p0's keeps `['perched']`.
  - **The phrases counted.**
    - Spy on `PhraseLibrary.prototype.condition` while running `registerAttachPhrases(new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES]))`. The conditions registered that start `the card it is on` are exactly `[...HOLDER_PHRASES]`.
    - **(guard)** The phrase-set test ("are these 22") passes unchanged.
  - **(guard)** `'worked' in seatExtras(…)` is false for Hearts, Color Match, Venom, Rent Day and `CREW_GAME` at every seat, and `pressFlags(SHOWN)` is `[]`, so 3-2's `worked` pins stand.

  In `startup-simulator.test.ts`, append `describe('what the page shows of slice 5')`:
  - **The lists.**
    - `pressFlags(game)` is `['managing', 'agile', 'coaching', 'pending badge', 'attaching']`, in `game.worked` order. Pin the order HEAD gives and report it.
    - `holderFlags(game)` is `['pending badge']`.
  - **(guards)**
    - `shownFlags(game)` is 5-2a's pin.
    - `shownPlayerValues(game)` is 4-3's pin: neither `operational revenue` nor `active tags` is there (Call 5).
  - **The view.** A 3-player engine at seed 1, with N the next seat:
    - the Neobank goes to `development-N`;
    - the first Junior PM is `putOn` it in `development-team-N`;
    - the Senior PM goes to `ops-team-N`.

    For each viewer:
    - `worked[juniorPm].flags` is `['managing', 'pending badge']`;
    - `worked[seniorPm].flags` is `['managing', 'agile']`;
    - `worked[neobank].flags` is `['stalled']`;
    - with `onboarding: true` on the Junior PM, its flags are `['pending badge']`;
    - with `badged: true` instead, they are `['managing', 'agile']`.
  - **How the flags come:**
    - §11.E.2: a Junior PM on a Tier 2/3 project carries a pending Badge, and a badged one has none;
    - §11.E.3: Agile is a Senior PM or any badged PM, working;
    - ruling 8: an onboarding PM gives nothing;
    - §20.B: the Junior PM is Synergy and the Senior PM Agile Synergy;
    - §20.C.2: the Neobank is Tier 2 and stalls with no Senior lead.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/worked-view.test.ts src/games/startup-simulator.test.ts src/pages/designer/playtest-fitted.test.tsx`. Expected: the new tests and the changed pin FAIL, and the guards pass.
- [ ] **Step 3: Implement** the interfaces, and change the pin(s) named above.
- [ ] **Step 4: Run** `bunx vitest run src/engine/core/lang src/games src/pages/designer`, then `bun run test` and `bun run typecheck`.
  - 4-2's "plays the same game through the page's view as without it" passes unchanged.
  - Report the long runs' time if it grew by more than a third.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/attach-phrases.ts src/engine/core/lang/worked-view.ts src/engine/core/lang/board-view.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/worked-view.test.ts src/games/startup-simulator.test.ts \
  src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(lang): the view labels the flags a press reads in its effect lines, and works out one read through the card a card sits on only for a seat that sees that card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: Faces off the Board, and slice 5 played on the page

Before starting: re-check Task 2's `pressFlags`, and 5-2a's and 5-2b's zones, buttons, phases and hints at HEAD.

**Files:**
- Modify: `src/pages/designer/board-text.ts` (`keptBadges`), `src/pages/designer/playtest.tsx` (the decor)
- Test: `src/pages/designer/board-text.test.ts` (append), `src/pages/designer/playtest-fitted.test.tsx` (append)

**Interfaces:**
- Consumes: 4-3's `loneCounts` and `boardBadges`, and board-text's private `flagsOn`.
- Produces:

```ts
// board-text.ts
/**
 * The label of each card off a Board (a shared zone, or one of a seat's own that not everyone sees) that keeps a set flag or a lone
 * count: its flags that are set, then its lone counts, joined by ', '. None for a face-down card, and none for a card on a Board.
 */
export function keptBadges(game: CompiledGame, cards: CardState[]): { [cardId: string]: string };
```

- **`playtest.tsx`.** The decor's badges become `{ ...keptBadges(game, placed), ...boardBadges(game, placed, worked) }`.
- **Arrangements** below use `setUp()`, `relocate`, `putOn` and `changeCard`, as the file's other arrangements do. "The first X" is `idOf(state, X)`.
- **Second-person labels used below:**
  - `PLAY` = `Play a card from your strategy hand to a card in your bench, your development team or your ops team`;
  - `FLUSH` = `Brainstorm after flushing some cards from your strategy hand`;
  - `KEEP_IDEA` = `Keep a card in your brainstorm`;
  - `KEEP_BLUE`, `KEEP_RED`, `KEEP_GREEN` = `Keep blue/red/green on a card in your ops team`;
  - `MENTOR` = `Mentor a card in your ops team`;
  - `LAUNCH` = `Launch a card from your development to your operations`.

- [ ] **Step 1: Write the failing tests.**

  In `board-text.test.ts`, append `describe('what a card keeps, off a Board')`. It uses `KEPT = CREW.replace(TIRED, `${TIRED}\n  Cards can have dents.`)`, laid out by `arrange(KEPT)`, with three changes:
  - the second Potter is in `stash-p0` with `tired: true, dents: 1`;
  - the second Smith stays in the hall with `dents: 2`;
  - the Vase has `dents: 1`.

  The checks:
  - `keptBadges(kept, cards)` is `{ [potter2]: 'tired, 1 dent', [smith2]: '2 dents' }`. Neither the Vase nor the tired Potter on it has an entry: they are on a Board.
  - **Review Focus.** A face-down copy of the second Potter (`faceUp: false`, `faceKey: HIDDEN_FACE_KEY`, `data: {}`) gives `{}`.

  In `playtest-fitted.test.tsx`, append `describe('slice 5 on the page')`.
  - **Tokens on faces** (Call 4; Review Focus).
    - **The arrangement.**
      - S's bench Junior Hardware Eng has `{ 'red xp': 2, 'blue skill': 1, badged: true }`.
      - O's Junior Software Dev is in `open-job-market` with `{ 'blue xp': 2 }`.
      - The Neobank is in `development-${S}`, with S's Junior Software Dev (`{ 'pending blue': 1 }`) and then the first Junior PM `putOn` it.
      - The Senior PM is in `ops-team-${S}`.
    - **Mounted**, on S's tab:
      - the decor of each card is:
        - Hardware Eng `{ badge: 'badged, 2 red xp, 1 blue skill' }`;
        - market Software Dev `{ badge: '2 blue xp' }`;
        - S's Software Dev `{ badge: '1 pending blue' }`;
        - Junior PM `{ badge: 'managing, pending badge' }`;
        - Senior PM `{ badge: 'managing, agile' }`;
        - Neobank `{ caption: 'Blue 0/10\nRed 0/0', badge: 'stalled' }`;
      - `board-${S}` reads `development: Neobank (tier Tier 2, tag Crypto, requires Commerce, sector FinTech, stalled) [Blue 0/10, Red 0/0] with Junior Software Dev [1 pending blue] and Junior PM (managing, pending badge) · ops team: Senior PM (managing, agile)`.
    - **On O's tab:**
      - the market Software Dev's badge is still `'2 blue xp'`;
      - `cardsIn(`bench-${S}`)` is `[]`;
      - `document.body.textContent` doesn't contain `2 red xp`;
      - `board-${S}` reads the same.
    - **How the numbers come:**
      - §20.C.2: the Neobank, 10 Blue, Tier 2;
      - §11.E: the pending Badge and Agile;
      - R4: a bench discard keeps its tokens.
  - **The Strategy Hand and the Brainstorm row** (Review Focus).
    - **The arrangement:** the first Hit Piece and the first Burnout are in `strategy-hand-${S}`.
    - **Mounted:**
      - `fittedZone(S, 'strategy-hand')` and `fittedZone(S, 'brainstorm')` lie below `fittedZone(S, 'milestones')`;
      - the milestone row (`'milestone-row'`) lies above `fittedZone(S, 'development')`, holding 3 cards;
      - `inOrder(`strategy-hand-${S}`)` names `['Hit Piece', 'Burnout']`;
      - `lineOf(S)` contains `strategy hand 2 · brainstorm 0 · milestones 0`.
    - **`press('Brainstorm')`.**
      - `status()` is `` `seat: ${S} — Your turn — ${hint('brainstorm')}` ``.
      - `inOrder(`brainstorm-${S}`)` holds 2 cards; keep their names as `drawn`.
      - `lineOf(S)` contains `2 actions` and `strategy hand 2 · brainstorm 2`.
    - **On O's tab:**
      - `lineOf(S)` contains `strategy hand 2 · brainstorm 2`;
      - `cardsIn(`brainstorm-${S}`)` and `cardsIn(`strategy-hand-${S}`)` are `[]`;
      - `document.body.textContent` contains no name in `drawn`, nor `Hit Piece` or `Burnout`.
    - **Back on S's tab**, `click` the first drawn card:
      - `offered()` is `[[KEEP_IDEA, true]]`;
      - `choose(KEEP_IDEA)` leaves `strategy-hand-${S}` with 3 cards and the brainstorm row empty;
      - `strategy-discard` holds the other drawn card, on O's tab too;
      - the status ends with `hint('actions')`.
    - **Review Focus: Undo.**
      - `press('Undo')`: the row holds 2 again.
      - `click` a drawn card (the offer opens and its ring is `'chosen'`), then `press('Undo')` again. Now `noOffer()` holds and no card has a ring.
    - **How the numbers come:**
      - §6: Brainstorm costs 1 action and draws 2 with no working PM (ruling 25);
      - §3 and §15.C: the hand and the look are seen by their owner alone (the spec's anti-goal);
      - R10: the discard is public.
  - **The strategy cleanup.**
    - **The arrangement:** the first Hit Piece, Burnout, Visionary and Headhunter are in `strategy-hand-${S}`.
    - Press `End your actions`:
      - the status ends with `hint('strategy cleanup')`;
      - `seatButtons()` is `['Discard a card in your strategy hand']`.
    - Click the Visionary and choose the discard:
      - `tab(`${N} — to act`)` is selected;
      - `lineOf(S)` contains `strategy hand 3`;
      - the Visionary is in `strategy-discard`.
    - **How the numbers come:** §5 Phase D step 7 and ruling 10: a limit of 3, after the bench and before the backlog.
  - **Training's target in three zones.**
    - **The arrangement:**
      - the first two Full Stack Bootcamps are in `strategy-hand-${S}`;
      - the first To-Do List is in `development-${S}`, with S's Junior Software Dev `putOn` it;
      - the first QA Engineer is in `ops-team-${S}`.
    - `click(bootcamp1)`: `offered()` is `[[PLAY, true], [FLUSH, true]]`. `choose(PLAY)`:
      - the picker reads `Pick where it goes: a card in your bench, your development team or your ops team`;
      - its buttons are, in order, `Junior Hardware Eng`, `Junior QA Tester`, `Junior Software Dev` and `QA Engineer`, the first three live and the QA Engineer greyed.
    - `click(qa)`:
      - `askedGroup()` reads `Choose one`, and `askedOptions()` is `['Blue', 'Red', 'Cancel']`;
      - `ring(bootcamp1)` and `ring(qa)` are `'chosen'`.
    - `answerAsked('Red')`:
      - the QA Tester's decor is `{ badge: '1 red skill' }`;
      - `lineOf(S)` starts `` `${S} 4 capital` ``;
      - `inOrder('strategy-discard')` names `['Full Stack Bootcamp']`;
      - no card has a ring.
    - **Review Focus.** Press `PLAY`, `pickNamed('Full Stack Bootcamp')`, then `click(qaEngineer)`: nothing is sent (`lineOf(S)` still starts `` `${S} 4 capital` ``), and the picker stays open.
    - Then `click(software)`. No question is asked, since Red is its only colour:
      - its decor is `{ badge: '1 red skill' }`;
      - `board-${S}` contains `with Junior Software Dev [1 red skill]`;
      - `lineOf(S)` starts `` `${S} 1 capital` ``.
    - **How the numbers come:**
      - §20.A: the Bootcamp costs $3 and 0 AP, and gives a Blue or Red Skill token the Junior lacks; 7 − 3 − 3 = 1;
      - R6: Bootcamp asks a colour only when both fit;
      - ruling 14: it fits no Specialist.
  - **Graduation, the Mentor and Clean Launch.**
    - **The arrangement:**
      - every Milestone is relocated to the box, then the Clean Launch and the First Mover Advantage to `milestone-row`;
      - the first Cloud Storage is in `development-${S}` with `{ 'blue cubes': 4, 'red cubes': 4 }`;
      - the Veteran, then S's Junior Software Dev, then S's Junior Hardware Eng are `putOn` it;
      - the Software Dev has `{ 'pending blue': 1 }`;
      - the Hardware Eng has `{ 'pending blue': 1, 'pending red': 1, 'pending green': 1, 'blue skill': 1, 'green skill': 1 }`.
    - Press `LAUNCH`, then `pickNamed('Cloud Storage')`:
      - the status ends with `hint('graduation')`, and `lineOf(S)` contains `2 actions` and `milestones 1`;
      - `inOrder(`milestones-${S}`)` names `['Clean Launch']`, and the milestone row `['First Mover Advantage']`;
      - the decor of each card is:
        - Software Dev `{ badge: '1 blue xp' }`;
        - Hardware Eng `{ badge: '1 blue skill, 1 green skill, 1 pending blue, 1 pending red, 1 pending green' }`;
        - Veteran `{ badge: 'coaching' }`;
      - `seatButtons()` is `[KEEP_BLUE, KEEP_RED, KEEP_GREEN, MENTOR]`.
    - `click(hardware)`: `offered()` is `[[KEEP_BLUE, true], [KEEP_RED, true], [KEEP_GREEN, true], [MENTOR, 'it is mentorable']]`. Take the reason as the view gives it, and report it if it differs.
    - `choose(KEEP_RED)`: the Hardware Eng's badge is `'graduated, 1 red xp, 1 blue skill, 1 green skill, 1 pending blue, 1 pending green'`.
    - Press `MENTOR`, then `pickNamed('Junior Hardware Eng')`: `askedOptions()` is `['Blue', 'Green', 'Cancel']`, and `ring(hardware)` is `'chosen'`.
    - **Review Focus: Undo.** `press('Undo')` takes the keep back:
      - the `Choices` group is gone and no card has a ring;
      - the Hardware Eng's badge has its five tokens again;
      - the status is still graduation.
    - Keep red again, press `MENTOR` and `answerAsked('Green')`:
      - the status ends with `hint('actions')`;
      - the Hardware Eng's decor is `{ badge: 'experienced, 1 red xp, 1 green xp, 1 blue skill, 1 green skill' }`;
      - `board-${S}` contains `ops team: Veteran (coaching); Junior Software Dev [1 blue xp]; Junior Hardware Eng (experienced) [1 red xp, 1 green xp, 1 blue skill, 1 green skill]` and `milestones: Clean Launch`.
    - On O's tab, `board-${S}` contains `milestones: Clean Launch`.
    - **How the numbers come:**
      - §20.C.1: the Cloud Storage is 4 Blue / 4 Red, Tier 1;
      - ruling 7: Launch costs 1 action, 3 − 1 = 2;
      - §11.B.2: one Pending token is made Permanent, chosen when there are several, and the rest return;
      - §20.B and ruling 25: a working Veteran mentors a second, different token;
      - §3: a Junior with 2 XP is experienced;
      - §20.G and ruling 24: Clean Launch goes to the first Launch, and First Mover needs a Tier 2.
  - **(guard)** The existing decor `toEqual` tests pass unchanged.
- [ ] **Step 2: Run** `bunx vitest run src/pages/designer`. Expected: `keptBadges` and the off-Board labels FAIL. The step tests that pass already (the strip, the buttons and the choices are 3-2's) are guards, and say so.
- [ ] **Step 3: Implement** `keptBadges` and the decor merge. If a step test fails for a reason other than the label, stop and report it: it is a page gap, not something to work around.
- [ ] **Step 4: Run** `bunx vitest run src/pages/designer src/engine src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/pages/designer/board-text.ts src/pages/designer/playtest.tsx src/pages/designer/board-text.test.ts \
  src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(designer): a card off a Board is labelled with the flags and counts it keeps for the seats that see its face, and slice 5's hand, look, Training, graduation and Milestones are pinned through the page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: The browser check, the README and the final checks

**Files:**
- Modify: `README.md`
- Browser scripts and screenshots go only in `SCRATCH=/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-5-3`.

**Interfaces:** Consumes Tasks 1–3. Produces nothing new.

- [ ] **Step 1: The probe.** Write `$SCRATCH/probe.ts`, run with `bun`. It reads `src/games/startup-simulator.rules`, removes `  The start player is chosen at random.`, and adds this block after `  A new Junior QA Tester goes to each bench.`, before the deal, so every seed sets up the same:

```text
  Move the milestone row to the box.
  Move the clean launch from the box to the milestone row.
  Move the first mover advantage from the box to the milestone row.
  Move the talent magnet from the box to the milestone row.
  Move the full stack bootcamp from the strategy deck to p0's strategy hand.
  Move the cloud storage from the seed deck to p0's development.
  Move the veteran from the talent deck to p0's bench.
  Move the senior pm from the talent deck to p0's ops team.
  For each card in p0's development, it gains 4 blue cubes.
  For each card in p0's development, it gains 4 red cubes.
  For each card in p0's bench whose skill is hardware, it gains 1 pending blue.
  For each card in p0's bench whose skill is hardware, it gains 1 pending red.
  For each card in p0's bench whose skill is hardware, it gains 1 pending green.
```

  The checks:
  - the edited rules compile with no diagnostics;
  - a 2-player engine at each of seeds 1 to 10 starts with p0 in `income`;
  - the milestone row is exactly Clean Launch, First Mover Advantage and Talent Magnet;
  - p0's strategy hand is the Full Stack Bootcamp;
  - the Cloud Storage has 4 blue and 4 red cubes;
  - `bench-p0` is the three Juniors and the Veteran;
  - the Junior Hardware Eng has one of each Pending token.

  If a check fails at HEAD, stop and report.
- [ ] **Step 2: The browser check.** Copy 4-3's `$SCRATCH/../browser-4-3/check.cjs` helpers (`at()`, `rowCard()`, the launch, the error collection, `waitFor`, `press`, `pressIn`, `group`, `line`), with two changes:
  - `at()` reads the canvas's box from the page, which is now 1200 × 1380, rather than assuming 900;
  - `zones.json` is regenerated for p0 and p1 from `fittedLayout(game.zones, viewer)` on the probe's rules.
  - **Setup.**
    - Run the dev server on 5173 with `--strictPort`, polled with `curl -sf`.
    - Use Chromium with `['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']` and a viewport of `1600 × 3000`.
    - Expect no `pageerror` and no console error.
    - Load the Startup Simulator sample, fill `Rules` with the probe's text, choose `2` and press `Play`.
  - **Screenshots.** Each must show what is listed after it.
    1. **`01-table.png`:**
       - the canvas is 1200 × 1380;
       - at the top: the milestone row (Clean Launch, First Mover Advantage, Talent Magnet), and the strategy deck and discard;
       - the band: the Cloud Storage captioned `Blue 4/4` and `Red 4/4`, the Senior PM labelled `managing, agile` in the ops team, and the milestones row on the band's second line;
       - the strip: the bench, with the Junior Hardware Eng labelled `1 pending blue, 1 pending red, 1 pending green`, the strategy hand with the Bootcamp, and the brainstorm row;
       - the status shows Income's hint.
    2. **`02-training.png`.** Press `Pay salaries` (p0's line starts `p0 4 capital`). Click the Bootcamp (`rowCard(strategy hand p0, 0, 1, STRIP)`) and choose `Play a card …`:
       - `Pick cards` reads `Pick where it goes: a card in your bench, your development team or your ops team`;
       - the three Juniors are live, and the Veteran and the Senior PM greyed;
       - the Bootcamp is ringed green.
    3. **`03-choice.png`.** Click the Junior QA Tester on the canvas: `Choices` reads `Choose one` with `Blue`, `Red` and `Cancel`.
    4. **`04-trained.png`.** Click `Red`:
       - the QA Tester is labelled `1 red skill`;
       - p0's line starts `p0 1 capital`;
       - the strategy discard shows the Bootcamp.
    5. **`05-team.png`.** Press `Assign some cards from your bench to a card in your development`, pick the three Juniors and the Veteran, then `Confirm` and `Pick Cloud Storage`:
       - the four hang under the Cloud Storage at full steps, clear of the strip;
       - `board-p0` reads `development: Cloud Storage (tier Tier 1, tag Platform, sector Infra) [Blue 4/4, Red 4/4] with Junior Software Dev, Junior Hardware Eng [1 pending blue, 1 pending red, 1 pending green], Junior QA Tester [1 red skill] and Veteran (coaching) · ops team: Senior PM (managing, agile)`.
    6. **`06-graduation.png`.** Press `Launch …` and `Pick Cloud Storage`:
       - the status shows graduation's hint;
       - Clean Launch is in p0's milestones row, and the milestone row holds the other two;
       - the three keeps are live and `Mentor a card in your ops team` is greyed.
    7. **`07-keep.png`.** Click the Junior Hardware Eng (`rowCard(ops team p0, 2, 5, BOARD)`) and choose `Keep red on a card in your ops team`:
       - its label reads `graduated, 1 red xp, 1 pending blue, 1 pending green`;
       - the Mentor button is live.
    8. **`08-mentor.png`.** Press `Mentor …` and `Pick Junior Hardware Eng`: `Choose one` with `Blue`, `Green` and `Cancel`.
    9. **`09-mentored.png`.** Click `Green`:
       - the status shows actions' hint, and p0 has 1 action;
       - the label reads `experienced, 1 red xp, 1 green xp`;
       - `board-p0` contains `milestones: Clean Launch`.
    10. **`10-brainstorm.png`.** Press `Brainstorm`:
        - the brainstorm row holds 3 cards, because the Senior PM is working;
        - read their names from `Keep a card in your brainstorm`'s picker, then `Cancel`.
    11. **`11-rival.png`.** Click the `p1` tab:
        - p0's line contains `strategy hand 0 · brainstorm 3 · milestones 1`;
        - `document.body.innerText` holds none of the three names;
        - the strategy discard shows the Bootcamp.
    12. **`12-kept.png`.** Back on p0's tab, click the first brainstorm card (`rowCard(brainstorm p0, 0, 3, STRIP)`) and keep it:
        - the `p1 — to act` tab is selected;
        - on p0's tab, the strategy hand holds the kept card and the brainstorm row is empty.
    13. **`13-color-match.png`.** Color Match at 3: three panels as before, with no labels and no grown canvas.
  - **Afterwards.** Open every PNG (Read) and check it against its list, then stop the dev server.
  - **How the numbers come:**
    - Pay salaries: the Senior PM's $3 (§20.B), 7 − 3 = 4;
    - the Bootcamp's $3 (§20.A): 4 − 3 = 1;
    - Assign and Launch each cost 1 action (ruling 7): 3 − 2 = 1;
    - Brainstorm draws 3 with a working PM on the Board (§6, ruling 25).
- [ ] **Step 3: Update the README.**
  - **"A table too big for one screen":** a table whose Board would be too short to hang a card under another grows taller, and its canvas with it. Startup Simulator's is 1200 × 1380 from slice 5.
  - **"The Board":** two more bullets.
    - A card's label also names the flags a press reads in its effect lines (`agile`, `coaching`, `pending badge`, `attaching`). One read through the card a card sits on is named only for a seat that sees that card.
    - Off a Board, a card's label names the flags and counts it keeps, for the seats its face is shown to: a trained Junior on its owner's bench, or in the open job market.
  - **Plan 5-1's paragraph** ("Counting, targets in several zones, …"): an `In the playtest` bullet saying the same, and that counting values about players are not shown (Call 5).
  - **Its `Startup Simulator` bullet:** the Strategy Hand and the Brainstorm row sit in the private strip, and rivals see only their sizes. Training picks its target on the bench, the development team or the ops team. Graduation's keeps and the Mentor are played under the buttons. The revealed Milestones sit on the shared table, and a claimed one moves to its claimant's row.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests. Then run these checks over `BASE..HEAD`, or over Task 1's commit and `BASE2..HEAD` (see Commands). Each must print nothing, except where noted.

```bash
# Startup Simulator's words in shared code, slices 3–5, tests included; the page's corner-label "badge" is the older use (Global Constraints)
git diff "$BASE" -- src/engine src/pages src/utils ':!src/pages/designer/designer-page.test.tsx' ':!src/pages/designer/playtest-fitted.test.tsx' \
  ':!src/pages/designer/tableaux.test.ts' ':!src/pages/designer/samples.ts' | grep '^+[^+]' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share|tags?|leads?|leading|licen[cs]es?|tiers?|stall(s|ed|ing)?|sectors?|expertise|modes?|bandwidths?|bugs?|qa|online|offline|maint(enance)?|suppl(y|ies)|demands?|xp|pending|skills?|badged|ranks?|mentor(s|ed|ing)?|synerg(y|ies)|agile|graduat(e|es|ed|ing|ion)|training|trained|brainstorm(s|ed|ing)?|strateg(y|ies)|milestones?|seniors?)\b|\bseed (decks?|markets?|cards?|products?)\b'
# "badge" in core code (the page may say it)
git diff "$BASE" -- src/engine/core | grep '^+[^+]' | grep -iE '\bbadges?\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# no rules changed
git diff --stat "$BASE" -- src/games/startup-simulator.rules
# existing test lines removed or changed: only Task 2's
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
```

  - The last check prints exactly the Growth Hacker pin(s) Task 2 named.
  - Also read the `+` lines of `src/engine`, `src/pages` and `src/utils` for "source" in the game sense, and for "badge" meaning the game's Badge.
- [ ] **Step 5: Run the four games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo src/engine/input` passes, and Rent Day still has 108 examples.
- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -F - <<'EOF'
docs: the fitted table that grows, labels for the flags a press reads and for what a card keeps off the Board, and slice 5's hand, look, Training, graduation and Milestones on the page, checked in a browser

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Gaps

- **G1. Plan 5-2b's zones don't fit the fitted table, and 5-2b may not change page code.** Computed at HEAD with 4-2's ops-team mark:
  - **After 5-2b Task 1** (the Strategy zones), there are three shared lines and two strip lines, so the band is 236 tall. The development team's first hanging card then sits at y 230 and reaches the strip's upper line (top 260), and further cards close up onto it. No `misfits` check fails. `unreachableZones` for Startup becomes `[]`, though `playtest-fitted.test.tsx` pins `[development-…: centre goes to development-team-…]`, and "the Board's place on the table" moves.
  - **After 5-2b Task 3** (the milestones row wraps onto a second band line), each board row is 98 tall. The Startup `misfits` test fails ("less than a card tall"), so 5-2b's Step 4 can't pass.
  - **Recommendation:** run this plan's Task 1 before plan 5-2b's Task 1. It needs no slice 5 rules.
    - 5-2b's executor then re-takes the fitted Startup pins as the grown table gives them, which its Global Constraints allow: the canvas becomes `size: { width: 1200, height: 1038 }` with `world` ±692 after its Task 1, and `height: 1380` with ±920 after its Task 3; `the Board's place on the table` moves with it.
    - The unreachable list stays as it is (the development's centre still goes to the development team).
- **G2. The pending Badge's words on the face.**
  - The face reads `pending badge`, 5-2a's name for the flag.
  - If the owner wants the spec's words ("Pending tokens (marked as pending)"), amend 5-2a's `Pending badge:` section and its two uses to `Pending badge:` / `pending badge` before 5-2a runs. This plan's pins then read `pending badge`.
  - Rules text may use Startup words, so no shared code changes.

## Forward notes

- **Slice 9 (face-down cards in a public zone):**
  - Call 3 already leaves the pending Badge off for a seat that can't see the project's face; slice 9 R3 needs nothing more for it.
  - `keptBadges` reads only the scene's data, so a face-down card gets no label.
  - 4-3's forward note on player values still stands.
- **Slice 6:** Attribute and Utility cards' effect lines may name more worked flags, and Call 2 labels each one. Check that the Board line stays readable.
- **Later:** a band line that no card hangs in (the claimed-Milestones row) could be a card tall, which would shorten the grown table (parked).
