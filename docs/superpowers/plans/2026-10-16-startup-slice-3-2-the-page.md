# Startup Simulator Slice 3-2 (The Page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The playtest page shows what slice 3's rules work out, and asks what they leave to the player.
- Each card on a Board shows its tier, Tag and requirements, its cubes against the need left after Domain Expertise's cut, and "stalled" when it has no lead it can use.
- A Greenlight that asks whom to pay a License, or how to cut a hybrid, asks it under the seat's buttons. It asks one question at a time and names the requirement each License is for.

**Architecture:**
- **This is plan 3-2 of two** (spec R8). It runs after plan 3-1 is complete: Tasks 7–8, its final review and its fix wave. It takes 3-1's language, view and rules text as given (see "Assumed from earlier plans").
  - No phrase or rule meaning changes here.
  - There is one exception, the Stalled line (call 2).
- **Nothing in shared code knows Startup Simulator.** The page works from what the view carries and what the game declares.
  - **Core (pure).**
    - `lang/worked-view.ts` reads from the compiled game which worked values the page may show.
    - `seatExtras` gains `worked`: for each card on a Board, the numbers worked out in place of its columns, and the flags that change a value.
    - `choices.ts` gains `comparedColumn`.
  - **Rendering.** `CardDecor` gains a `badge`, a red corner label drawn by `CardSprite`.
  - **Page** (`src/pages/designer`).
    - `board-text.ts` reads counts against the worked numbers, lists a card's words, and gives badges.
    - `choice-step.ts` and `choice-picker.tsx` ask a press's choices.
    - `playtest.tsx` and `tableaux.tsx` wire them.
  - **Rules text.** The product tables put `tier | tag | requires | also requires | sector` first, and `Stalled:` gains a zone line.
- **Calls this plan makes** (spec: "Exact wordings; how choices appear on the page" are the builder's):
  1. **What the view carries (`SeatExtras.worked`).**
     - **Which cards.** Only cards in a zone each player has that everyone can see (the `onCards` zones included), whose face the seat sees. Every seat gets the same values.
     - **Stand-ins.** A worked number whose section's first line reads `A card's X is its <column>.` stands in for that column. If several do, the first in section order wins. So Startup's `blue need` stands in for `blue cost`.
     - **Shown flags.** A worked flag is shown when some value line turns on it (`A stalled card's blue team output is 0.`, `An efficient in ops card's salary is 1.`). Those are the flags that change what a card makes or costs.
     - **Flags not shown.** The others (`leading software`, `fully led`, `feature complete`) are the rules' own working, or a button's gate, which the button's greyed reason already says. Showing every worked flag would put them on every staff card.
  2. **Stalled holds only for a project in development.** `Stalled:` gains `Only if it is in a development.` as its first line. (Controller: plan 3-1's final fix wave makes this rules change, since it is a rules fix; Task 1 here only checks it is present.)
     - **Why.** R2's definition holds vacuously for staff and for Launched products. A probe at `630ac81` reads `stalled` on a Search Engine in operations, on the Engineer in the ops team and on the Architect on a project.
     - **No outcome changes.** Stalled is read only for development cards: by team output in the engine phase, and by 3-1's long-run invariant.
  3. **Faces.** README: "A card face shows its name and its first three columns, so a card table puts its key columns first."
     - **The new order.** Startup's two product tables become `| name | tier | tag | requires | also requires | sector | blue cost | red cost | rev | val | blue maint | red maint | copies |`.
     - **What the face then shows:**
       - a Tier 2 or 3: tier, tag and requires;
       - a Tier 1: tier, tag and sector;
       - an expansion Tier 3 with no tag: tier, requires and also requires.
     - **What leaves the face, and where it shows instead.**
       - The costs leave the face. The caption shows the need under a Board card, and the hover line shows every column.
       - A Tier 3 with a tag and two requirements shows its second requirement in its Board line and the hover line.
     - **Why not keep a cost.** Keeping one cost would show `blue cost: 0` on a Genetics Kit (0/8).
  4. **Board lines name a card's words.** A card with count parts lists each of its columns that holds text, as `column value`, in its data order. These come before its flags, in the same brackets: `Neobank (tier Tier 2, tag Crypto, requires Commerce, sector FinTech, stalled) [Blue 0/10, Red 0/0]`. Rivals' Boards are never on the viewer's canvas, so this line is where a seat learns who provides which Tag.
  5. **The need.** A count is read against its column's stand-in, and riders are as before: `Blue 3/4 +2 cut` means 3 of the 4 needed, of the 6 printed, 2 having been cut.
  6. **The badge.** Shown flags go in a red label inside the card's top-right corner, joined by `, `. It stays visible in a stack's 34-unit strip too. A third caption line would run into the first staff card, since `STACK_GAP` (36) fits two (1b-3 m18).
  7. **Choices** open where the card picker opens, one question at a time.
     - **The question** is the view's prompt up to its first `: `. When a player choice's clause compares a column of the press's card, the column and the card's value follow in brackets: `Pick who to pay the license to (requires Commerce)`. This settles 3-1's parked "two alike prompts" for a Tier 3 needing two Licenses.
     - **What is asked.** A choice with one answer is never asked: the press sends it.
     - **Sending.** The press goes when the last question is answered. If it is refused, the step goes back to that question.
     - **What drops it:** Cancel, pressing another button, a tab click (the canvas remounts, as an offer does), or the view no longer listing the choice. None of these sends anything.
     - **A click on the table** while a question is open explains with `{question}.`
- **Parked, unchanged:**
  - **A face-down card's choice** (slice 9). The view gives a card the seat can't see no choices.
  - **The presser's prompt lists who qualifies.** That is the same exposure as an `Only if` reading those zones (3-1's ruling).
  - **Worked values in the hover line, and on shared rows.**

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19, PixiJS 8; Playwright (global install, Chromium in `/opt/pw-browsers`) for the browser check.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-3-tiers-tags-leads-design.md` is binding:
- "The page";
- R1's view of choices;
- R2 and R3's worked values;
- R8's plan 3-2: "faces and tableaux show tier, Tag, requires, the need and 'Stalled' (worked values read through the runtime per visible card); payee and cut pickers; happy-dom tests and the browser check".

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding: "The page", and the anti-goals, above all hidden information leaking.

The inputs are:
- 1b-3's final review (`final-review-startup-1b-3.md`, m18) and its pre-flight (`preflight-startup-1b-3.md`, C18), in the session scratchpad;
- plan 3-1 and its ledger (`.superpowers/sdd/2026-10-16-startup-slice-3-1-language-and-rules/progress.md`).

## Global Constraints

- **Controller amendment (pre-flight).** The scan is in the plan's SDD workspace (`preflight.md` §3, P1–P13 and F1–F2);
  each task's brief carries its rulings. In short:
  - **P1 (Task 2).** The badge's lines and back are sized with `boldTextWidth`; a `Text` is never measured (it throws under
    happy-dom).
  - **P2, P7 (Task 4).** The browser rules insert the six `Move` lines after the Market Crash line (every seed sets up);
    screenshot 06 clicks `rowCard(dev, 0, 2, BOARD)`.
  - **P3 (Task 1, hidden information).** A worked value is shown only when its lines read just the card and the cards on
    it; a card with cards on it in a non-public zone is left out.
  - **P4 (Task 1).** Plan 3-1's fix wave adds `Only if it is in a development.` to `Stalled:`; Task 1's example is a guard
    (or skipped if the fix wave added one); N₁ is read from the committed test.
  - **P5 (Task 2).** `board-text.ts`'s `lead`/`leadingWords` are renamed (slice 3's banned word).
  - **P6, P9, P10 (Task 3).** A question closes once nothing is left to ask, its picker and rings derived in render; the
    card comes from `view.scene.cards`; a dropped move closes an open question.
  - **P8, P11 (Task 1).** Each card's worked entry is computed in `try`/`catch` (a throwing value leaves the card out);
    a `WorkedCard` always has both keys, and `worked` is left out when empty.
  - **P12.** Plan 3-2 runs before 4-1.
  - **P13.** `license 3` stays on the bank line; "the press asks for 0 players" wording goes to plan 3-1's final review.

- **Hard constraints (verbatim):**
  - Protected files must not change: `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, and anything under `src/pages/hearts-demo/**`.
  - The core is pure: no pixi/react/DOM imports in `src/engine/core/**`, no `Math.random` or `Date.now`.
  - State stays Json-only, with new keys under `lang:*`. This plan adds no `state.data` key, no card `data` key and no move field (a press's `choices` is 3-1's). The view's `worked` is Json; an empty part is left out, never set to `undefined`.
  - No Startup Simulator words in shared code. The banned words are 1b-2's list plus slice 3's:
    - 1b-2's list: capital, talent, agency, junior, backlog, growth, crash, vaporware, university, bench, ideation, startup, research, recruit, product, job market, idea pool, "seed" meaning a deck/market/card/product, greenlight, launch, pivot, salary, payroll, project, cube, ops, operations, onboarding, scouting, source/sourcing in the game sense, market share;
    - slice 3's: tag, lead, license, tier, stall, sector, expertise, in every form (tags, leading, licence, tiers, stalled, sectors…).

    "Lead" is banned in its plain sense too. Doc comments in shared code take their examples from fixtures (`A busy card's red pay is 1.`, `Pick who to pay the fee to (wants clay)`), never from Startup.
  - Hearts, Color Match, Venom and Rent Day look and play as before. Their views carry no `worked` key, their tables get no `decor` (1b-3), and Hearts' clicks and drags are pinned by 1b-3's guards.
  - **Hidden information.** Nothing on the page reveals a card, value or choice a seat can't see.
    - Worked values come only for cards in public per-player zones whose face the seat sees.
    - Choices come only from the view, which lists them only for a press the engine would take (3-1).
    - A choice's bracket reads only the card the seat picked.
  - `bun run typecheck` clean; full `bun run test` passes.
  - The browser check uses the pre-installed Chromium (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; never `playwright install`). Its scripts and screenshots stay in `/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-3-2/`, never in the repo.
- **Where the banned words may appear:**
  - `src/games/startup-simulator.rules` and `.test.ts`;
  - `src/pages/designer/designer-page.test.tsx`, `playtest-fitted.test.tsx` and `tableaux.test.ts`;
  - `src/pages/designer/samples.ts`, `README.md` and `docs/`.

  New fixtures use general words: guild, jobs, hands, workshop, stash, hall, scrap, crew, idle, coins, moves, fee, mark, wants, mood, size, trim, done, cut, busy, working.
- **Example counts.** Let N₁ be the count the committed `startup-simulator.rules` has once plan 3-1 is complete. It is 84 at `630ac81`; 3-1's Task 7 fix round adds four. Task 1 ends at N₁ + 1.
- **Existing tests.** No existing test line changes, except these:
  - **Task 1:** the example count in `startup-simulator.test.ts` (`results` length); the Startup test's name and its `… of … examples pass` text in `designer-page.test.tsx`.
  - **Task 2:** in `playtest-fitted.test.tsx`, the four Board lines named in Task 2 (1b-3's `BOARD` constant and the three `boardOf` expectations), which gain the cards' words.
  - New names are imported on new `import` lines (1b-3 C15).
  - If any other existing test fails, stop and report it.
- **Page copy (exact):**
  - **A Board card:** `{name}{ ({words, flags})}{ [{counts}]}{ with {cards on it}}`.
    - Words are `{column} {value}`.
    - Flags are the kept flags that are on, then the shown worked flags that hold, all joined by `, `.
  - **A count part:** `{Leading words} {count}/{stand-in, else the column}{ +{n} {rider words}}`.
  - **A badge:** the shown flags that hold, joined by `, `.
  - **The choice step:** `<div role="group" aria-label="Choices">` holding:
    - `<span>{question}</span>`;
    - one `<button type="button">` per option, labelled with its value. A refused one has `aria-disabled="true"` and its verdict as `title`.
    - `<button type="button">Cancel</button>`.
  - **A table click while asking** flashes `{question}.`
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1, record `BASE=$(git rev-parse HEAD)` (after 3-1's fix wave) and run `bun run test` once to get the passing count.
- **No new dependencies.**
- **Style and commits.**
  - 2-space indent, single quotes, comments that say why.
  - Stage files by path, never `git add -A`.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.
  - A test marked "(guard)" passes before its task's change, and says so.

## Review Focus

- **A flag that holds vacuously** (stalled on staff or on a Launched product).
  - Expected: it is shown only on a project in development, and nothing else carries `stalled`.
  - Tests: Task 1's example and view test; Task 2's decor test (the Search Engine and the Engineer).
- **A press with two choices where only one has several answers** (a Fusion Reactor with one AI provider).
  - Expected: only that question is asked, and the other License is still paid.
  - Test: Task 3.
- **An open choice whose press stops asking it** (an Undo, or the turn moving on).
  - Expected: the step closes and nothing is sent.
  - Test: Task 3 (Undo).
- **Leaving a choice half answered:** Cancel, another button, a tab click, or a click on the table.
  - Expected: nothing is sent. A table click explains with the question and keeps the step.
  - Tests: Task 3.
- **Worked values of a card the seat can't see** (a rival's backlog, its own stash or backlog).
  - Expected: never in the view's `worked`, a caption, a badge or a Board line.
  - Tests: Task 1 (view) and Task 2 (page).

## Assumed from earlier plans (check before Task 1)

Lines are at `630ac81`. Plan 3-1's last task, final review and fix wave may move them. Check each item against the code before Task 1, and stop and report one that is missing or differs.

- **1b-3 (built):**
  - `src/pages/designer/board-text.ts`:
    - `isBoardZone` :18 and `cardLabel` :23;
    - `countParts(card, game)` :41, which reads the first numeric data key with the count's leading words, and riders;
    - `flagsOn` :64;
    - `boardText(game, cards, seat)` :105;
    - `boardCaptions(game, cards)` :129.
  - `src/pages/designer/tableaux.tsx:33`: `Tableaux({ game, seats, board, cards })`, with its `texts` memo.
  - `src/pages/designer/playtest.tsx`, `SeatCanvas` :123:
    - `openPicker`/`closePicker` :147–154, `offer` :156, `extras` :157 and `choosingCards` :163;
    - `placed` :181, `picksCards` :188, `captions` :189 and `decor` :195;
    - `sendPick` :208, `clickOnTable` :215 and `submit` :227;
    - `press` :265 and `startPicking` :272;
    - the `Tableaux` call :301;
    - `chooseOffered` :306, `cardOffer` :323 and `cardPicker` :327;
    - the `seat-buttons` room :358.
  - `card-pick.ts`: `PickChosen` :10, `clickCard` :48 and `ringsOf` :76.
  - `card-picker.tsx:13`: `CardPicker`. `card-offer.tsx:9`: `CardOffer`. `board-controls.tsx`: `seatNumber` :8 and `BUTTON_STYLE` :63.
  - Rendering:
    - `scene.ts:51`: `CardDecor = { ring?; caption? }`;
    - `pixi/card-sprite.ts`: `setDecor` :35, `setCaption` :61, `dropChild` :82 and `destroy` :88;
    - `pixi/pixi-table.ts:71`: `setDecor`;
    - `fit-layout.ts:36`: `STACK_GAP = 36`.
  - Test scaffolds:
    - `playtest-fitted.test.tsx`:
      - the mocks and helpers at :37–62 (`table`, `mount`, `cardsIn`, `lineOf`, `status`, `press`, `picker`, `pickNamed`);
      - :411–417 (`setUp`, `idOf`, `S`, `N`, `O`);
      - :511–523 (`click`, `offer`, `choose`, `ring`, `inOrder`, `named`, `offered`).
    - `playtest-clicks.test.tsx` :18–38: the mocks, `propsOf`, `panelOf`, `tableOf` and `clickOn`.
    - `card-sprite.test.ts:36`: `kids`.
- **3-1 (Tasks 1–7 built):**
  - `board-view.ts`:
    - `ChoiceView = { at; prompt; options: { value; allowed }[] }` :71;
    - `PickCardView.choices?` :78, `CardPickView` :85, `ActionView.choices?` :98 and `SeatExtras` :102;
    - `pressView` :254. It lists choices only when the press is allowed.
    - `seesFace` :332;
    - `pickVerdict` :366. Choices sit on a one-card pick's card, or on its target entries in `onto.targets`. A set or a hidden card gets none.
    - `seatExtras` :449, and `isChoices`/`readSeatExtras` :480–495.
  - `choices.ts`:
    - `CHOOSE_PLAYER` :12, with args `[at, guard, who, effect]` (`askPlayer` :50), and `CHOOSE_ONE` :17;
    - `choicesOf` :28;
    - the prompts `Pick who to {doing} to: p1 or p2.` (:40) and `Choose one: {labels}.` (:67).

    A probe at `630ac81` gives the Greenlight's views `Pick who to pay the license to: p0 or p1.` (`at` 0, 1) and `Choose one: Cut 2 blue, Cut 2 red or Cut 1 of each.` (`at` 2).
  - `declared-actions.ts:256`: `pressChoices`.
  - `types.ts`:
    - `CardFilter` :19, with `sameAs: { of: 'the card' | 'it'; attribute }`;
    - `WorkedValue` :129;
    - `CompiledGame.worked` :147, in section order.
  - `runtime.ts`: `workedValue` :385, which reads 0 for a card lacking the column a line reads, and `workedFlag` :403.
  - Phrases:
    - `library/card-subject-phrases.ts:58`: `a card's {attribute} is its {attribute}`, with args `[name, column]`;
    - `library/card-value-phrases.ts:29–30`: `a/an {cardflag} card's {attribute} is {int}`, with args `[flag, name, n]`.
  - `testing.ts`: `CREW_GAME` :385, `WORKED_GAME` :418, `SUBJECT` :434, and `GUILD_GAME` :448 with its `open` (payee) and `trim` (options) buttons. GUILD fits one table at 3 players, and p0 acts first.
  - `startup-simulator.rules`:
    - the product tables :35 and :67, columns `name | tier | blue cost | red cost | rev | val | blue maint | red maint | sector | requires | also requires | tag | copies`;
    - `Cards can have cut blue cubes and cut red cubes.` :106;
    - `A stalled card's blue team output is 0.` :139;
    - `Blue need:` :145;
    - `Stalled:` :167, with no zone line;
    - `Efficient in ops:` :186 and `Salary:` :190;
    - the greenlight :292.
  - **Parked to this plan by 3-1:**
    - two alike payee prompts for a Tier 3;
    - worked flags in the card view (1b-3 C18);
    - the caption reading the printed column (1b-3 m18).

---

### Task 1: What the view says the rules work out for each card on a Board

**Files:**
- Create: `src/engine/core/lang/worked-view.ts`, `src/engine/core/lang/worked-view.test.ts`
- Modify: `src/engine/core/lang/board-view.ts`; `library/card-subject-phrases.ts` and `library/card-value-phrases.ts` (export their phrase texts); `src/engine/core/lang/testing.ts` (`SHOWN`)
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `src/pages/designer/designer-page.test.tsx` (count), `README.md` (count)

**Interfaces:**
- **`card-subject-phrases.ts`:** `export const FROM_COLUMN = "a card's {attribute} is its {attribute}"`, used in its registration.
- **`card-value-phrases.ts`:** `export const FLAGGED_VALUES = ["a {cardflag} card's {attribute} is {int}", "an {cardflag} card's {attribute} is {int}"] as const`, used in its registrations.
- **`worked-view.ts`** (pure; reads only the compiled game):
  - `standIns(game: CompiledGame): { [column: string]: string }`. Each column that a worked number's section starts from, mapped to that section's name. The section's first ref has phrase `FROM_COLUMN`, and the column is its `args[1]`. The first section wins.
  - `shownFlags(game: CompiledGame): string[]`. The worked flags (`kind: 'flag'`) that some worked number's ref reads as `args[0]` of a `FLAGGED_VALUES` phrase. They come in `game.worked` order, once each. Kept flags are not among them: the page shows those already.
- **`board-view.ts`:**

```ts
/** What the rules work out for a card on a Board, the same for every seat: the number worked out in place of each of its columns, by column, and the shown flags that hold for it, in the order the game works them out. */
export type WorkedCard = { columns: { [column: string]: number }; flags: string[] };
/** Each card on a Board with something worked out to show, by id. */
export type WorkedView = { [cardId: string]: WorkedCard };
export type SeatExtras = { board: BoardView | null; actions: ActionView[]; worked?: WorkedView };
```

  - **`seatExtras`** adds `worked` only when `standIns` or `shownFlags` is non-empty. Its cards are those in a zone with `perPlayer` and `visibility: 'public'` (`onCards` zones too) for which `seesFace(game, card, seat)` holds.
    - `columns[c]` is `runtime.workedValue(state, id, standIns[c])` for each stand-in column `c` the card holds as a number, when that value is a number.
    - `flags` are the shown flags for which `runtime.workedFlag` holds.
    - A card with neither is left out.
  - **`readSeatExtras`** accepts `worked` when it is absent, or a map whose entries have `columns` (a map of numbers) and `flags` (a list of text). Anything else is null.
- **`testing.ts`:**

```ts
/**
 * CREW_GAME with a count of red done read against a job's red need, and what the rules work out from them: a job's red left (its red
 * need less its cut red done), whether a hand is working and a job busy, and a red pay that a busy job's flag turns on.
 */
export const SHOWN = [
  CREW_GAME.replace('  Cards can be tired.', '  Cards can be tired.\n  Cards can have red done and cut red done.'), '',
  'Red left:', "  A card's red left is its red need.", "  A card's red left goes down by its cut red done.", '',
  'Working:', '  Only if it is a red card.', '  Only if it is not tired.', '',
  'Busy:', '  Only if some card on it is working.', '',
  'Red pay:', "  A busy card's red pay is 1.",
].join('\n');
```

- **Rules text.** Check that `Stalled:`'s first line is `  Only if it is in a development.` (plan 3-1's final fix wave adds it); add it only if it is missing, and say so in the report.

- [ ] **Step 1: Write the failing tests.**

  In the new `worked-view.test.ts`:
  - **Compiling.** `SHOWN` compiles with `[]`.
  - **What the game says.**
    - `standIns(SHOWN)` is `{ 'red need': 'red left' }`, and `shownFlags(SHOWN)` is `['busy']`.
    - `SUBJECT` gives `{ 'red need': 'red left' }` and `[]`.
    - `WORKED_GAME` gives `{}` and `[]`. Its `A tired card's …` reads a kept flag.
  - **`SHOWN` arranged.** A 2-player engine at seed 1. With `relocate`, `putOn` and `changeCard`:
    - the first Vase and the first Statue go to `workshop-p0`;
    - Potters 1 and 2 go on the Vase (`crew-p0`);
    - the Vase gets `red done` 1 and `cut red done` 1;
    - the second Statue goes to `stash-p1`;
    - the first Tinker goes to `idle-p0`.

    The checks:
    - `seatExtras(…, 'p1').worked` equals `{ [vase]: { columns: { 'red need': 1 }, flags: ['busy'] }, [statue]: { columns: { 'red need': 1 }, flags: [] } }`, and `'p0'` gives the same.
    - **Review Focus: hidden.** The stash Statue is in neither, not even for p1, whose stash it is.
    - With both Potters tired, the Vase's `flags` are `[]`.
  - **`readSeatExtras`.**
    - It returns `SHOWN`'s extras after a JSON round trip.
    - It returns null when a `worked` entry has `flags: 'busy'`, or `columns: { 'red need': '1' }`.
    - It accepts extras with no `worked`.
  - **The four games (guard).** For Hearts, Color Match, Venom and Rent Day (their `.rules?raw`, at their minimum players), `'worked' in seatExtras(…)` is false. `CREW_GAME` too.

  In `startup-simulator.test.ts`, append `describe('what the view says the rules work out')`:
  - `standIns(game)` is `{ 'blue cost': 'blue need', 'red cost': 'red need' }`, and `shownFlags(game)` is `['stalled', 'efficient in ops']`.
  - **The arrangement.** A 3-player engine at seed 1, with S its start player and O another seat:
    - a Neobank goes to `development-S`;
    - a Viral Video App goes to `development-S`, with `cut blue cubes` 2;
    - a Search Engine goes to `operations-S`;
    - the Engineer goes to `ops-team-S`;
    - a Streaming Service goes to `backlog-O`.
  - **The check.** `seatExtras(…, O).worked` has exactly four keys:
    - the Neobank: `{ columns: { 'blue cost': 10, 'red cost': 0 }, flags: ['stalled'] }`;
    - the Viral Video App: `{ columns: { 'blue cost': 4, 'red cost': 0 }, flags: [] }`;
    - the Search Engine: `{ columns: { 'blue cost': 12, 'red cost': 0 }, flags: [] }`. This is the Review Focus case. Before the zone line it reads `['stalled']`.
    - the Engineer: `{ columns: {}, flags: ['efficient in ops'] }`.

  Append this example to the rules text (N₁ + 1):

```text
Example: only a project in development can be Stalled, not a Launched product or its staff (section 3)
  Given p0's operations has a Search Engine
  And p0's ops team has the Engineer
  And p0's development has a Neobank
  And the Neobank in p0's development has the Architect on it
  Then the Search Engine in p0's operations is not stalled
  And the Engineer in p0's ops team is not stalled
  And the Architect in p0's development team is not stalled
```

  Update the counts to N₁ + 1: `results` in `startup-simulator.test.ts`, the Startup test's name and text in `designer-page.test.tsx`, and "Its N examples" in the README's Startup paragraph.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/worked-view.test.ts src/games/startup-simulator.test.ts`. Expected: FAIL. `worked-view.ts` is missing, and the new example's three checks fail.
- [ ] **Step 3: Implement** the interfaces and the rules line.
- [ ] **Step 4: Run** `bunx vitest run src/engine/core/lang src/games src/pages/designer`, then `bun run test` and `bun run typecheck`.
  - 3-1's long runs must still pass: Stalled is read only for development cards.
  - If they take more than a third longer, report the timing.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/worked-view.ts src/engine/core/lang/worked-view.test.ts src/engine/core/lang/board-view.ts \
  src/engine/core/lang/library/card-subject-phrases.ts src/engine/core/lang/library/card-value-phrases.ts src/engine/core/lang/testing.ts \
  src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -m "feat(lang): the view gives each card on a Board the numbers worked out in place of its columns and the flags that change a value, and only a project in development is Stalled"
```

---

### Task 2: Faces and Board lines show tier, Tag, requires, the need and Stalled

**Files:**
- Modify: `src/games/startup-simulator.rules` (product columns), `src/games/startup-simulator.test.ts`
- Modify: `src/engine/core/scene.ts` (`CardDecor.badge`), `src/engine/pixi/card-sprite.ts`
- Modify: `src/pages/designer/board-text.ts`, `src/pages/designer/tableaux.tsx`, `src/pages/designer/playtest.tsx`
- Test: `src/engine/pixi/card-sprite.test.ts` (append), `src/pages/designer/board-text.test.ts` (append), `src/pages/designer/playtest-fitted.test.tsx` (append; four existing lines change)

**Interfaces:**
- Consumes Task 1's `WorkedCard`, `WorkedView` and `SeatExtras.worked`.
- **Rules text.**
  - Both product tables take the column order of call 3, and each row's cells move with their columns, the Market Crash row included.
  - Do it with a one-off script in the scratchpad.
  - 3-1's card-table tests (`sums`, `toMatchObject`) must pass unchanged.
- **`scene.ts`:** `export type CardDecor = { ring?: 'choice' | 'chosen'; caption?: string; badge?: string }`.
- **`CardSprite.setDecor`** also keeps at most one badge. A missing or `''` badge is removed and destroyed.
  - **The container.** A `Container` labelled `card-badge`, at `(CARD_WIDTH / 2 - 4, -CARD_HEIGHT / 2 + 4)`. It holds two parts:
    - a `Graphics` labelled `card-badge-back`: `roundRect(-w - 6, 0, w + 6, h + 2, 3)` filled `0xb91c1c`, where `w` and `h` are the text's width and height;
    - a `Text` labelled `card-badge-text`, with style `{ fontSize: 10, fontWeight: 'bold', fill: 0xffffff, align: 'right', wordWrap: true, wordWrapWidth: 56, lineHeight: 12 }`, anchor `(1, 0)` and position `(-3, 1)`.
  - A new text redraws both parts in the same container.
- **`board-text.ts`:**
  - **`countParts(card, game, worked?: WorkedCard): string[]`.** A part's column value is `worked.columns[column]` when it is there.
  - **`boardText(game, cards, seat, worked?: WorkedView): string`.** Each card reads as the copy under Global Constraints.
    - Its words come only when its count parts aren't empty. They are each data key, in order, that holds text and isn't `name`, a declared fact, or bookkeeping (`lang:…`).
    - Its flags are 1b-3's `flagsOn`, then `worked?.[id]?.flags`.
  - **`boardCaptions(game, cards, worked?: WorkedView)`.** As before, with each card's `countParts(card, game, worked?.[card.id])`.
  - **`boardBadges(cards: CardState[], worked?: WorkedView): { [cardId: string]: string }`.** For each of `cards` that `worked` lists with flags, the flags joined by `', '`.
- **`tableaux.tsx`:** `Tableaux` takes `worked?: WorkedView`, passes it to `boardText`, and adds it to the memo's inputs.
- **`playtest.tsx`, `SeatCanvas`:**
  - `captions` is `boardCaptions(game, placed, extras?.worked)`.
  - `decor` merges rings, captions and `boardBadges(placed, extras?.worked)` per id, leaving out each part that a card lacks.
  - `Tableaux` gets `worked={extras?.worked}`.

- [ ] **Step 1: Write the failing tests.**

  In `startup-simulator.test.ts`, append `it('puts a product’s tier, tag and requirements first, so its face shows them')`. The checks are on `Object.keys(product(name).data!)`:
  - the Neobank's first four are `['name', 'tier', 'tag', 'requires']`;
  - the Fusion Reactor's first five are `['name', 'tier', 'tag', 'requires', 'also requires']`;
  - the Smart Lock's first four are `['name', 'tier', 'tag', 'sector']`.

  In `card-sprite.test.ts`, append `describe('badge')`, with its own `kids` (1b-3's is local to `describe('decor')`):
  - **Drawn.** `setDecor({ badge: 'busy' })` gives one `card-badge` at `(46, -66)`. It holds a `card-badge-back` `Graphics` and a `card-badge-text` `Text`:
    - the text is `busy`;
    - the anchor is `(1, 0)` and the position `(-3, 1)`;
    - the style has `fontSize` 10.
  - **With everything.** `setDecor({ ring: 'chosen', caption: 'Red 1/1', badge: 'busy' })` leaves the sprite with 5 children.
  - **Changing.** `setDecor({ badge: 'busy, tired' })` keeps the same container (`toBe`), with the new text.
  - **Removed.**
    - `setDecor({ caption: 'x' })` leaves no `card-badge`.
    - `setDecor({ badge: '' })` leaves none.
    - `setDecor(null)` leaves 2 children.
  - **No pile-up.** The same badge set twice gives one.
  - **Hearts, as before (guard).** 1b-3's Hearts guard in `pixi-table.test.ts` passes unchanged.

  In `board-text.test.ts`, append `describe('what the rules work out, on the Board')`:
  - **On `SHOWN`.** Task 1's arrangement, read with `worked = seatExtras(…, 'p0').worked`:
    - `countParts(<vase>, game)` is `['Red 1/2 +1 cut']`, and with `worked[vase]` it is `['Red 1/1 +1 cut']`;
    - `boardText(game, cards, 'p0', worked)` is `workshop: Vase (busy) [Red 1/1 +1 cut] with Potter and Potter; Statue [Red 0/1] · idle: Tinker`;
    - `boardCaptions(game, cards, worked)` is `{ [vase]: 'Red 1/1 +1 cut', [statue]: 'Red 0/1' }`;
    - `boardBadges(cards, worked)` is `{ [vase]: 'busy' }`, and `boardBadges(cards, undefined)` is `{}`.
  - **Words, on `GUILD_GAME`.** A 2-player state, with a Statue then a Vase in `workshop-p0` and a Potter `putOn` the Statue in `crew-p0`.
    - `boardText(guild, cards, 'p0')` is `workshop: Statue (mark stone, wants clay) [Red 0/2, Gold 0/4] with Potter; Vase (mark clay) [Red 0/3, Gold 0/0]`.
    - The Potter has words in its data but no count parts, so it lists none. Its `lang:on` is never a word.
  - **1b-3's tests (guard).** 1b-3's tests in this file pass unchanged: CREW's jobs hold only numbers.

  In `playtest-fitted.test.tsx`:
  - **Change only these four existing lines** (Board lines gain the cards' words):
    - :437 `BOARD` becomes `development: Dating App (tier Tier 1, tag Social, sector Consumer) [Blue 4/6, Red 0/0] with Junior Software Dev and Architect · operations: To-Do List (tier Tier 1, tag App, sector Concept) [Blue 0/4, Red 0/0] · ops team: QA Engineer`.
    - :590 becomes `` `development: ${attrs.name} (tier ${attrs.tier}, tag ${attrs.tag}, sector ${attrs.sector}) [Blue 0/${attrs['blue cost']}, Red 0/${attrs['red cost']}] with Junior Software Dev and Junior Hardware Eng` ``.
    - :665 becomes `development: Smart Lock (tier Tier 1, tag IoT, sector Deep Tech) [Blue 0/1, Red 0/5] · operations: Dating App (tier Tier 1, tag Social, sector Consumer) [Blue 6/6, Red 0/0] · ops team: Junior Software Dev`.
    - :827 becomes `operations: To-Do List (tier Tier 1, tag App, sector Concept) [Blue 4/4, Red 0/0] · ops team: Junior Software Dev`.
  - **Append `describe('what the rules work out, on the Board')`.** `STALL` is `setUp()` with Task 1's arrangement, plus `blue cubes` 1 on the Viral Video App.
    - **The canvas.** Mounted on `STALL`, `table!.decor` equals:
      - `[neobank]: { caption: 'Blue 0/10\nRed 0/0', badge: 'stalled' }`;
      - `[viral]: { caption: 'Blue 1/4 +2 cut\nRed 0/0' }`;
      - `[search]: { caption: 'Blue 0/12\nRed 0/0' }`;
      - `[engineer]: { badge: 'efficient in ops' }`.

      This is the Review Focus case: the Search Engine and the Engineer carry no `stalled`.
    - **The Board line.** `board-${S}` reads `development: Neobank (tier Tier 2, tag Crypto, requires Commerce, sector FinTech, stalled) [Blue 0/10, Red 0/0]; Viral Video App (tier Tier 1, tag Social, sector Consumer) [Blue 1/4 +2 cut, Red 0/0] · operations: Search Engine (tier Tier 2, tag AI, requires Platform, sector Infra) [Blue 0/12, Red 0/0] · ops team: Engineer (efficient in ops)`.
      - Click O's tab: it reads the same.
    - **A lead clears it.** With the Architect `putOn` the Neobank:
      - `decor[neobank]` is `{ caption: 'Blue 0/10\nRed 0/0' }`;
      - `board-${S}` contains `Neobank (tier Tier 2, tag Crypto, requires Commerce, sector FinTech) [Blue 0/10, Red 0/0] with Architect`.
    - **Review Focus: hidden.**
      - `table!.decor` has no key for the Streaming Service in `backlog-O`, nor for S's backlog card.
      - `document.body.textContent` doesn't contain `Streaming Service`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/pixi src/pages/designer src/games/startup-simulator.test.ts`. Expected: the new tests and the four changed lines FAIL, and the guards pass.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/engine/pixi src/engine/react src/pages/designer src/pages/hearts-demo src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/engine/core/scene.ts src/engine/pixi/card-sprite.ts \
  src/engine/pixi/card-sprite.test.ts src/pages/designer/board-text.ts src/pages/designer/board-text.test.ts src/pages/designer/tableaux.tsx \
  src/pages/designer/playtest.tsx src/pages/designer/playtest-fitted.test.tsx
git commit -m "feat(designer): faces and Board lines show a card's words, its need after the cut and the flags that change what it makes, and Startup Simulator puts tier, tag and requires on its faces"
```

---

### Task 3: Choosing whom to pay and how to cut, in the private strip

**Files:**
- Modify: `src/engine/core/lang/choices.ts` (`comparedColumn`); Test: `src/engine/core/lang/choices.test.ts` (append)
- Create: `src/pages/designer/choice-step.ts`, `src/pages/designer/choice-step.test.ts`, `src/pages/designer/choice-picker.tsx`, `src/pages/designer/playtest-choices.test.tsx`
- Modify: `src/pages/designer/playtest.tsx`
- Test: `src/pages/designer/playtest-fitted.test.tsx` (append)

**Interfaces:**
- **`choices.ts`:** `comparedColumn(action: DeclaredAction, at: number): string | null`. This is the column of the press's card that the player choice at `at` compares. It is the `attribute` of the first `CardFilter` with `sameAs.of === 'the card'` among its `who` ref's args, searched deeply. A block of options gives null, and so does a clause that compares a value or no column, or an `at` with no choice.
- **`choice-step.ts`** (pure):

```ts
/** The answers given so far, by the choice's `at`. */
export type Answers = { [at: number]: string };
/** A press waiting on its choices: the button, what it picked (null for a button that picks nothing), and the answers so far. */
export type Asking = { move: string; chosen: PickChosen | null; answers: Answers };
/** The choices the view lists for this press: on the button (picks nothing), on the card picked, or on the card's entry for its target; none for a set. */
export function choicesFor(action: ActionView | undefined, chosen: PickChosen | null): ChoiceView[];
/** The first choice still to answer, in `at` order: one with more than one option and no answer. Null when none is left. */
export function nextChoice(choices: ChoiceView[], answers: Answers): ChoiceView | null;
/** The press's `choices`: at each listed choice's `at`, its answer or else its only option; null at every other place. */
export function choicesOfPress(choices: ChoiceView[], answers: Answers): (string | null)[];
/** `{column} {value}` of the card a choice compares, when it shows that column with a value; else null. */
export function aboutOf(column: string | null, card: CardState | undefined): string | null;
/** The prompt up to its first ': ' (else without its final period), with ` ({about})` after it when given. */
export function questionOf(choice: ChoiceView, about: string | null): string;
```

- **`choice-picker.tsx`:**
  - `ChoicePicker({ question, choice, onAnswer, onRefused, onCancel }: { question: string; choice: ChoiceView; onAnswer(value: string): void; onRefused(reason: string): void; onCancel(): void })` renders the copy under Global Constraints.
  - A refused option calls `onRefused(<its verdict>)`.
- **`playtest.tsx`, `SeatCanvas`:**
  - **State.** `asking: Asking | null`.
  - **Derived each render:**
    - `askingAction` is `extras?.actions.find((a) => a.move === asking.move)`;
    - `askingChoices` is `choicesFor(askingAction, asking.chosen)`;
    - `current` is `nextChoice(askingChoices, asking.answers)`.
  - **Stale.** An effect closes `asking` when `askingChoices` is empty, as the stale picker does. The view no longer asks it.
  - **`askOrSend(move: string, chosen: PickChosen | null, go: () => void)`.**
    - When `nextChoice(choicesFor(<the move's ActionView>, chosen), {})` isn't null, it closes the offer and the picker and sets `asking` with `answers: {}`.
    - Otherwise it calls `go`.
    - It wraps the three sends: `sendPick` (picker and table clicks), `chooseOffered`'s `send` branch, and `press` for a button without an amount.
  - **Answering** `current` with an allowed value adds it to `answers`.
    - When `nextChoice` is then null, it sends `{ type: move, ...chosen, choices: choicesOfPress(askingChoices, answers) }`.
      - Taken: `asking` closes.
      - Refused (the seat flashes the reason): `asking` goes back to its answers without that `at`.
    - Otherwise `asking` keeps the answers and the next question shows.
  - **The question.**
    - `about` is `aboutOf(comparedColumn(<the DeclaredAction of the move>, current.at), <the scene card `chosen.cardId`>)`.
    - The `DeclaredAction` is `game.phases.flatMap((p) => p.actions).find((a) => a.words === move)`.
  - **Leaving it.**
    - `press` and `startPicking` close `asking`, as they close the offer.
    - Cancel closes it.
    - `clickOnTable` flashes `` `${question}.` `` while `asking` is open.
  - **Rings** while asking are `{ [chosen.cardId]: 'chosen' }`, plus `onto` when there is one.
  - **Where it shows.** `ChoicePicker` renders after `cardPicker`, in the same room, in both panel layouts.
- **`TIPPING`** (a button that picks nothing and asks a choice). No module exports it, so each test file that uses it defines it, as 3-1's `board-view.test.ts` does:

```ts
const TIPPING = GUILD_GAME.replace('  A player may stop.',
  '  A player may tip.\n    Then:\n      They pay the fee to another player of their choice who has a card in their workshop whose mark is clay.\n  A player may stop.');
```

- [ ] **Step 1: Write the failing tests.**

  In `choices.test.ts`, append `describe('comparedColumn')` on `GUILD_GAME`:
  - the `open a card in their stash` button at 0 gives `'wants'`, and at 1 gives null;
  - the trim button at 0 gives null;
  - `TIPPING`'s tip button at 0 gives null: its clause compares a value, not a column of the card.

  In the new `choice-step.test.ts`, use hand-made views:
  - **The choices:**
    - `P` is `{ at: 0, prompt: 'Pick who to pay the fee to: p1 or p2.', options: [p1, p2 allowed] }`;
    - `L` is `{ at: 1, …: p1. , options: [p1] }`;
    - `T` is `{ at: 2, prompt: 'Choose one: Trim 2 red, Trim 2 gold or Trim 1 of each.', … }`.
  - **`choicesFor`:**
    - a button with `choices: [P]` and `null` gives `[P]`;
    - a one-card pick with `cards: [{ id: 'c1', …, choices: [P] }, { id: 'c2', … }]` gives `[P]` for `{ cardId: 'c1' }`, and `[]` for `c2` and for `zz`;
    - a target entry `onto.targets.c1 = [{ id: 't1', …, choices: [T] }]` gives `[T]` for `{ cardId: 'c1', onto: 't1' }`;
    - `{ cardIds: ['c1'] }` gives `[]`, and an undefined action gives `[]`.
  - **`nextChoice`:**
    - `[P, L, T]` with `{}` gives `P`;
    - with `{ 0: 'p2' }` it gives `T`;
    - with `{ 0: 'p2', 2: 'Trim 2 red' }` it gives null;
    - `[L]` gives null.
  - **`choicesOfPress`:**
    - `[P, L, T]` with `{ 0: 'p2', 2: 'Trim 2 red' }` gives `['p2', 'p1', 'Trim 2 red']`;
    - `[P, T]` with the same gives `['p2', null, 'Trim 2 red']`.
  - **`aboutOf`:**
    - `('wants', <a card with data wants clay>)` gives `'wants clay'`;
    - a card without `wants`, a face-down card (`data: {}`), `undefined` and a null column each give null.
  - **`questionOf`:**
    - `P` with null gives `Pick who to pay the fee to`;
    - `P` with `'wants clay'` gives `Pick who to pay the fee to (wants clay)`;
    - `T` gives `Choose one`;
    - a prompt `Say which.` gives `Say which`.

  In the new `playtest-choices.test.tsx`, mock `Wrapper` and `CardTable` as `playtest-clicks.test.tsx` does (`propsOf`, `panelOf`, `tableOf`, `clickOn`).
  - **The arrangement.** `GUILD_GAME` at 3 players (assert `fitsTable` first, so this is the every-seat page). `ARRANGED`:
    - a Vase goes to `workshop-p1`, and a Bowl to `workshop-p2`;
    - `statue` is the only Statue in `stash-p0`: any other Statue the deal left there goes to the pile. Assert it.
  - **Helpers.**
    - `coins(seat)` is `within(panelOf('p0')).getByText(new RegExp(`^${seat} `)).textContent`.
    - `asked()` is `within(panelOf('p0')).queryByRole('group', { name: 'Choices' })`.
  - **The tests:**
    - **Whom to pay, from the list.**
      - Press `Open a card in your stash` and pick `Pick Statue`.
      - `asked()` shows `Pick who to pay the fee to (wants clay)`, with buttons `p1`, `p2` and `Cancel`.
      - There is no `Pick cards` group, and `tableOf('p0').decor[statue].ring` is `'chosen'`.
      - Click `p2`:
        - `coins('p0')` is `p0 7 coins, 2 moves` and `coins('p2')` is `p2 11 coins, 2 moves`;
        - the Statue is in `workshop-p0`;
        - `asked()` is null.
    - **A lone answer is filled in.** `ARRANGED` without the Bowl: picking the Statue sends at once, `coins('p1')` is `p1 11 coins, 2 moves`, and nothing is asked.
    - **An option, from a click on the table.**
      - The Statue is moved to `workshop-p0`. `clickOn('p0', statue)`, then choose `Trim a card in your workshop` in the offer.
      - `asked()` shows `Choose one` with `Trim 2 red`, `Trim 2 gold`, `Trim 1 of each` and `Cancel`.
      - Click `Trim 2 gold`: the Statue's placed data has `gold trim` 2.
    - **A button that picks nothing.** `TIPPING`: press `Tip`. `Pick who to pay the fee to` shows, with no brackets. Click `p1`: `p1 11 coins, 2 moves`.
    - **Review Focus: half answered.** Open the payee question, then:
      - `clickOn('p0', <a hall card>)` flashes `Pick who to pay the fee to (wants clay).` and keeps the question;
      - pressing `Start a card in your stash` closes it and opens the picker;
      - reopened, its `Cancel` closes it.

      Every seat still has 9 coins, and the Statue is in `stash-p0`.
    - **Review Focus: the press stops asking.**
      - The arrangement adds a Vase in `workshop-p0`. p0 finishes it (`Finish a card in your workshop`, `Pick Vase`), then opens the Statue, which asks.
      - Press the page's `Undo`. `asked()` is null, the Vase is back in `workshop-p0`, the Statue is in `stash-p0`, and the coins are 9 each.
    - **Review Focus: another seat sees none.** In p1's panel, `Open a card in your stash` is greyed. Pressing it flashes `It's p0's turn.`, and p1's panel has no `Choices` group.

  In `playtest-fitted.test.tsx`, append `describe('choosing whom to pay and how to cut')`:
  - **Helpers.**
    - `R1 = after(S, 3)` and `R2 = after(R1, 3)`.
    - `choices()` is the `Choices` group.
    - `answer(v)` clicks that button in it.
    - `options()` is its button names.
  - **Whom to pay, naming the Tag.**
    - The arrangement: on `setUp()`, a Neobank goes to `backlog-S`, a Mobile Wallet to `operations-R1` and a Payment Gateway to `operations-R2`.
    - Press `Greenlight a card in your backlog`, then `pickNamed('Neobank')`.
    - `choices()` has `Pick who to pay the license to (requires Commerce)`, and `options()` is `[...[R1, R2].sort(), 'Cancel']`. There is no `Pick cards` group.
    - `answer(R2)`:
      - `lineOf(R2)` starts `${R2} 10 capital`, `lineOf(R1)` `${R1} 7 capital` and `lineOf(S)` `${S} 4 capital`;
      - `table!.decor[neobank]` is `{ caption: 'Blue 0/10\nRed 0/0', badge: 'stalled' }`.
  - **How to cut a hybrid, by clicking.**
    - The arrangement: a Sleep Monitor goes to `backlog-S`, and a Health Tracker to `operations-S`.
    - `click(sleep)` and `choose('Greenlight a card in your backlog')`.
    - `choices()` has `Choose one`, and `options()` is `['Cut 2 blue', 'Cut 2 red', 'Cut 1 of each', 'Cancel']`. `ring(sleep)` is `'chosen'`.
    - `answer('Cut 1 of each')`:
      - `table!.decor[sleep].caption` is `Blue 0/1 +1 cut\nRed 0/3 +1 cut`;
      - `board-${S}` contains `Sleep Monitor (tier Tier 1, tag Data, sector Life Sci) [Blue 0/1 +1 cut, Red 0/3 +1 cut]`.
  - **Two Licenses, one after the other.**
    - The arrangement: a Fusion Reactor goes to `backlog-S`. Drone Delivery and Search Engine go to `operations-R1`, and Auto Warehouse and Quantum Prototype to `operations-R2`.
    - Greenlight it:
      - `Pick who to pay the license to (requires Robotics)`: `answer(R1)`;
      - `Pick who to pay the license to (also requires AI)`: `answer(R2)`.
    - `R1` and `R2` each have 10 capital, and S has 1.
  - **Review Focus: one License filled in.** As above without the Quantum Prototype:
    - only the Robotics question is asked;
    - after `answer(R2)` no `Choices` group is left;
    - R1 and R2 each have 10 capital, and S has 1.
  - **Review Focus: a tab click drops it.** With the Neobank question open:
    - click O's tab, then `${S} — to act`;
    - there is no `Choices` group;
    - `lineOf(S)` starts `${S} 7 capital`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/choices.test.ts src/pages/designer`. Expected: the new tests FAIL, and every existing test passes.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/engine/core/lang src/pages/designer src/engine/input src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/choices.ts src/engine/core/lang/choices.test.ts src/pages/designer/choice-step.ts src/pages/designer/choice-step.test.ts \
  src/pages/designer/choice-picker.tsx src/pages/designer/playtest-choices.test.tsx src/pages/designer/playtest.tsx src/pages/designer/playtest-fitted.test.tsx
git commit -m "feat(designer): a press that asks a choice of several answers asks it under the buttons, one question at a time, naming the column of the card it compares"
```

---

### Task 4: The browser check, the README and the final checks

**Files:**
- Modify: `README.md`
- Browser scripts and screenshots go only in `SCRATCH=/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-3-2`.

**Interfaces:** Consumes Tasks 1–3. Produces nothing new.

- [ ] **Step 1: The browser check.** Use 1b-3 Task 5's method. Copy `at()`, `rowCard()`, the launch and the error collection from `…/scratchpad/browser-1b3/check.cjs`.
  - **Setup:**
    - the dev server in the background on 5173 with `--strictPort`, polled with `curl -sf`;
    - Chromium with `['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']`;
    - a viewport of `1600 × 2600`;
    - no `pageerror` and no console error.
  - **The rules.** Load the Startup Simulator sample, then rewrite the `Rules` textarea (`fill`):
    - remove `  The start player is chosen at random.`, so p0 starts;
    - after `  Deal 1 card from the seed deck to each backlog.`, add:

```text
  Move the neobank from the growth deck to p0's backlog.
  Move the sleep monitor from the seed deck to p0's backlog.
  Move the health tracker from the seed deck to p0's operations.
  Move the mobile wallet from the seed deck to p1's operations.
  Move the payment gateway from the seed deck to p2's operations.
  Move the search engine from the growth deck to p1's operations.
```

    A probe at `630ac81` compiles this with no problem, and p0 starts in actions. Choose `3` and `Play`.
  - **Screenshots.** Each must show what is listed after it:
    1. **`01-faces.png`:**
       - the growth market's faces read `tier: Tier 2`, `tag: …` and `requires: …`;
       - p0's backlog Neobank reads `tier: Tier 2`, `tag: Crypto` and `requires: Commerce`;
       - p1's Board line lists `Search Engine (tier Tier 2, tag AI, requires Platform, sector Infra)` with no `stalled`.
    2. **`02-payee.png`.** Press `Greenlight a card in your backlog` and pick `Neobank`:
       - the `Choices` group reads `Pick who to pay the license to (requires Commerce)` with `p1`, `p2` and `Cancel`;
       - the Neobank is ringed green.
    3. **`03-paid.png`.** Click `p2`:
       - p2's capital is up 3 and p0's down 3;
       - the Neobank sits at the top of development, with `Blue 0/10` and `Red 0/0` under it and a red `stalled` label in its top-right corner;
       - p0's Board line ends `… sector FinTech, stalled) [Blue 0/10, Red 0/0]`.
    4. **`04-cut.png`.** Greenlight the Sleep Monitor from the list: `Choose one` with the three cuts.
    5. **`05-cut.png`.** Choose `Cut 1 of each`: the Sleep Monitor's caption reads `Blue 0/1 +1 cut` and `Red 0/3 +1 cut`.
    6. **`06-offer.png`.** Click the Neobank on the canvas, at the development zone's transform: the `Card buttons` offer opens, with the badge still drawn.
    7. **`07-rival.png`.** Click p1's tab: there is no `Choices` group, and p0's Board line still says `stalled`.
    8. **`08-color-match.png`.** Color Match at 3: three panels as before, with no rings, captions or badges.
  - **Afterwards.**
    - Open every PNG (Read) and check it against its list.
    - A detail line a little wider than the card (`also requires: …` on an expansion Tier 3) is the face's existing no-wrap behaviour: note it, don't fix it.
    - Stop the dev server.
- [ ] **Step 2: Update the README.**
  - **"Choices and comparing cards", the `In the playtest` bullet,** becomes: a choice with one answer is filled in. A press whose choice has several answers opens it under the buttons, one question at a time:
    - `Pick who to pay the license to (requires Commerce)` with a button for each player;
    - `Choose one` with a button for each option.

    The press goes once the last is answered. A greyed answer says why on hover. Cancel, another button or another tab sends nothing.
  - **"A table too big for one screen", `Faces`:** add that Startup Simulator's product tables put tier, tag and requires first.
  - **`The Board`:**
    - **The need.** A value a section works out from a column (`A card's blue need is its blue cost.`) is read in that column's place: `Blue 3/4 +2 cut`.
    - **Words.** A card read against columns also names its words: `Neobank (tier Tier 2, tag Crypto, requires Commerce, sector FinTech, stalled)`.
    - **Flags.** A worked yes-or-no that a value line turns on (`A stalled card's blue team output is 0.`) shows in a red label on the card's corner and in its brackets, where it holds.
    - **The example line** becomes Task 2's `BOARD` line.
- [ ] **Step 3: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests. Then run these checks; each must print nothing.

```bash
# Startup Simulator's words in shared code, slice 3's included, tests included
git diff "$BASE" -- src/engine src/pages src/utils src/app-components.ts ':!src/pages/designer/designer-page.test.tsx' \
  ':!src/pages/designer/playtest-fitted.test.tsx' ':!src/pages/designer/tableaux.test.ts' ':!src/pages/designer/samples.ts' | grep '^+[^+]' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share|tags?|leads?|leading|licen[cs]es?|tiers?|stall(s|ed|ing)?|sectors?|expertise)\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# existing test lines removed or changed: only those Global Constraints names
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
```

  - **What the last check may print.** It prints exactly the lines Global Constraints names, and nothing else:
    - Task 1's count lines;
    - Task 2's four Board lines.
  - **By eye.** Read the `+` lines of `src/engine` and `src/pages` for "source" in the game sense.
- [ ] **Step 4: Run the four games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo src/engine/input` passes, and Rent Day still has 108 examples.
- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: the Board's worked need, words and flags, and choices asked under the buttons, checked in a browser"
```
