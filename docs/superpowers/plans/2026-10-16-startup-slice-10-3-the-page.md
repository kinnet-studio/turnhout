# Startup Simulator Slice 10-3 (The page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The playtest page shows slice 10, the last:
- every open level is written out under each seat's status: the action waiting, each action waiting beneath it, and, once levels nest, how many are open over whose turn;
- the seat tabs follow the levels down and back up;
- what each player owes is on their entry, in the order owed, with whom to;
- `spare capital` and `cover`, which read only what every seat is told, are shown under each player's gauges, so Settle's cover is on the page;
- the Bankruptcy, the liquidation and both Come Cleans are played through the seat tabs, with Legacy Status as a badge;
- the nested chain of the spec is checked in a browser, with the Hearts demo.

**Architecture:**
- **This is plan 10-3, the page,** after 10-1 (language) and 10-2 (rules and long runs). It takes plans 4-3 to 10-2 as given (see "Assumed from earlier plans"). It changes no rules text, no phrase and no example. What it can't do is under "Gaps".
- **Seven tasks:**
  1. the levels in words: the turn beneath in the view, and the lines under the status (core and page);
  2. what a player owes, in words (page);
  3. values every seat may know, shown alone (core and page);
  4. the Bankruptcy through Startup's tabs: the reckoning, the liquidation, Settle's cover;
  5. the Come Clean through Startup's tabs: free and paid, Legacy Status, the offer that hides the card;
  6. levels nested through Startup's tabs: a second Bankruptcy inside the first's sale;
  7. the browser check with the Hearts demo, the README and the final checks.
- **Nothing in shared code knows Startup Simulator.**
  - Core: `board-view.ts` gains `BeneathView` and `SeatExtras.beneath`; `worked-view.ts`'s `shownPlayerValues` takes three more kinds of line, and it gains `soloValues`.
  - Page: `seat-status.ts` gains `levelLines`; `board-controls.tsx` gains `billsWords` and passes bills through `entryFor` and `MoneyLine`; `tableaux.tsx` passes bills and shows solo values; `gauges.ts` gains `soloValuesOf`; `playtest.tsx` wires them up.
  - A new general test file, `src/pages/designer/playtest-levels.test.tsx`, plays 10-1's fixtures (`NEST_GAME`, `CHAIN_GAME`, `TAB_GAME`) through the panels.
- **Calls this plan makes** (the spec leaves the page to the builder: "Bankruptcy and Come Clean prompts appear in the deciding player's strip; the switcher follows the chain"):
  1. **Every level is written out** (10-1's README promise: "the playtest shows the action being answered and those waiting beneath it").
     - The action waiting is 7-3's line, unchanged.
     - Each action waiting beneath it follows, nearest first, as `beneath: ` and 7-3's line, in its presser's colour. So a Come Clean offer names the sold product, and beneath it the sale that opened it (10-2's note).
     - Once levels nest deeper than one kept turn and one action waiting, a last line says how many are open, over whose turn: `4 levels open over p2's turn (audit).` That turn is 10-1's `turnBeneath`, the one every level goes back to.
     - The view carries it only while `lang:nest` holds the levels, that is, while they are none of the four shapes the two slots hold. So no view of Rent Day or of slices 7–9 changes.
     - Kept turns between actions aren't listed one by one. The status line names the top one (5-1's phase prefix), and the count says how deep the levels go (G3).
  2. **The seat switcher needs no new code.** `seatToAct` reads `turn.current`, which every level moves, so the tabs follow each level down and back up. The `beneath` line says whose turn it all sits in. Tasks 1 and 6 pin it.
     - 8-3's forward note "a bankrupt seat is never asked" is superseded by R2: a bankrupt seat is asked to buy when its spare capital covers the price. The page follows the view.
  3. **What a player owes is on their entry,** from `SeatExtras.bills`, in the order owed, after Rent Day's debt part and before the player's flags:
     - `p2 1 capital, 3 actions · owes 4 to p1, then 1 to the bank · bankrupt · liquidating`;
     - on the money line of a game that fits and on the tableau line of one that doesn't, the same for every seat;
     - Rent Day's `owes p1` is untouched.
  4. **Values every seat may know are shown.** This overrides 10-1's recorded limit, as the floor asks ("`spare capital`/`cover` on the page if public").
     - `shownPlayerValues` also takes 10-1's `… is their {counter}` for a counter everyone sees, 10-1's `… goes down by what they owe` (every seat is told what is owed), and 7-1's and 8-1's `… goes up/down by the total {attribute} of {cardgroup}` tested as a total is. So `spare capital` and `cover` are in every view.
     - A shown value that a button's `Only if` line compares with a number (not with another value) is shown alone, on a line under the seat's gauges: `Cover 10 · Spare capital 1`. These are Settle's cover (`Only if their cover is at least the card's settlement.`) and the paid Come Clean's spare capital.
     - The Settlement itself is still not a number before pressing (G1).
  5. **The Bankruptcy and Come Clean prompts need no page code beyond Calls 1–4.**
     - `reckoning` and `liquidation` are kept turns, so the status names the phase and its Hint (5-1, 9-3). Both Come Cleans are asks, so they get 7-3's line and 8-3's flow.
     - A picker lists the owner's own projects by name, on their page alone (9-1, 9-3); a greyed entry carries the rules' reason.
     - `bankrupt`, `liquidating` and `the seller` are player flags on the tableau line (3-2's `factWords`).
     - Tasks 4–6 pin each.
  6. **Legacy Status is a badge, as every kept flag is** (4-3): `requires legacy` or `also requires legacy` on the owner's canvas, and in the round brackets of every seat's Board line.
     - It is only ever on projects (10-2 Gap 4).
     - A long badge breaks between its parts, then at spaces (4-3). The hover line names it in full (6-3). The browser check judges it where staff hang under the card.
  7. **No seat goes out** (10-1's call), so 9-3's "a bankrupt seat's projects leave with it" doesn't arise.
- **Parked:** the Settlement as a number (G1); the Fire Sale price before pressing (G2); kept turns listed one by one (G3).

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19, PixiJS 8; Playwright (global install, Chromium in `/opt/pw-browsers`) for the browser check.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-10-bankruptcy-broken-chain-design.md` is binding, above all "The page" ("Bankruptcy and Come Clean prompts appear in the deciding player's strip; the switcher follows the chain") and its rulings:
- R1: the offer reads only public facts, and every exposed owner with a Face-Down project is asked, the seller last;
- R2: a bankrupt player spends only cash above what they owe;
- R3: Legacy Status is cleared whenever its card moves; nested interrupts are a stack.

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding. Its anti-goals bind here: hidden information leaking, a chain that leaves a player stuck, and Startup words in shared code. So do "Designers never see engine words" and the seat switcher that "jumps to the seat that must act next".

These are inputs, with their Global Constraints amendments:
- 7-3, 8-3 and 9-3 (`…-7-3-the-page.md`, `…-8-3-the-page.md`, `…-9-3-the-page.md`), the models for this plan: the waiting line, the seat switcher, asks through the tabs, press prices, face-down places, leak tests and browser checks;
- 10-1 (`…-10-1-language.md`): its "Left to 10-3" and its recorded limits;
- 10-2 (`…-10-2-rules-and-runs.md`): its "Forward notes for plan 10-3";
- `builder-check-startup-10.md` in the session scratchpad.

## Global Constraints

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.**
  - This plan adds no `state.data` key, no card `data` key and no move field.
  - The view gains one optional key, `SeatExtras.beneath`, left out unless `state.data` holds `NEST_KEY` (never `undefined`). `playerValues` may hold more names (Call 4).
- **No Startup Simulator words in shared code** (code, comments, test names and shared test fixtures).
  - The banned list is plan 10-1's: plan 9-1's list, plus slice 10's bankrupt, bankruptcy, liquidation and liquidate, broken chain, creditor, insolvent, come clean, seize and seizure, vulnerable, in every form.
  - **Where they may appear:** `src/games/startup-simulator.*`; `src/pages/designer/designer-page.test.tsx`, `playtest-fitted.test.tsx` and `tableaux.test.ts`; `src/pages/designer/samples.ts`; `README.md`; `docs/`.
  - Shared code says "levels", "beneath", "owes", "payee", "a value shown alone". Fixtures are 10-1's (`NEST_GAME`, `APPEAL_BOARD`, `TAB_GAME`, `LEEWAY_GAME`, `CHAIN_GAME`) and earlier ones (`INSPECT_GAME`, `OBJECT_GAME`, `INTERRUPT_BOARD`, `GAUGED_GAME`).
  - New lines never name the existing `Creditor` type: write `PlayerId | 'bank'`, or 10-1's `Bill`.
  - Ordinary words to avoid, beyond 9-3's: "broke", never "bankrupt"; "sell off", never "liquidate"; "levels", never "chain"; "goes unpaid", never "forgiven"; "whom they owe" or "payee", never "creditor". Page code may say "badge" for a card's corner label (5-3), never for the game's Badge.
- **Hearts, Color Match, Venom and Rent Day stay unchanged** (Rent Day keeps its 108 examples).
  - None nests levels beyond today's shapes, so none gets `beneath`, a `waiting-under` line or a `beneath` line.
  - None owes through 10-1's bills, so none gets `owes … then …` words. Rent Day's `owes p1` is as before.
  - Their shown player values and gauges are as before (Task 3's guards).
- **Every number comes from the rulebook.** Each Startup test says where its numbers come from.
- **Hidden information** (overview anti-goal; 3-2's to 10-1's lessons):
  - What a seat's view shows is decided by the compiled rules alone, and never reveals a hidden card: a bankrupt player's Face-Down projects included.
  - Every line under the status names cards only as that seat's `waiting` and `waitingUnder` name them (`a face-down card ({place})`), and the page adds no card to them.
  - `beneath` names a seat, a phase and a count, never a card.
  - A shown value reads only what every seat is told (Call 4); a value read through a counter only its owner sees is never shown.
  - Leak tests serialise a rival's whole page: the panel's text, every `title` and `aria-label` in it, plus `JSON.stringify` of the canvas's `placement` and `decor`.
- **A ring or picker never outlasts its view,** across nested levels and Undo. Everything this plan adds is derived from the latest view in the render that receives it, and adds no page state. A picker, a question and a clicked card's offer close in the render whose view no longer allows them (3-2's `stale`, `askedNoMore`, `offered`). Tasks 1, 4 and 6 pin them at depth.
- **No measured `Text`.** A `Text`'s size is never measured under happy-dom. This plan adds no Pixi text: Legacy is 4-3's badge, whose lines are broken with `boldTextWidth`, only between comma-separated parts, and at spaces only for a part too wide for a line of its own.
- **Earlier plans come first.**
  - Slices 1–4 and the speed-up plan are built. Then, in execution order: 5-1, 5-2a, 5-3 Task 1, 5-2b, 5-3 Tasks 2–4, 6-1, 6-3 Task 1, 6-2a, 6-2b, 6-3 Tasks 2–5, 7-1, 7-2a, 7-2b, 7-3, 8-1, 8-2a, 8-2b, 8-3, 9-1, 9-2, 9-3, 10-1, 10-2, then this plan.
  - Their code is referred to by the names their Interfaces blocks give.
  - Each task re-checks the names it consumes at HEAD before starting, and stops and reports one that differs.
- **Files this plan changes outside page and core code:**
  - `src/games/startup-simulator.test.ts`: Task 3's named lines and appended pins;
  - `README.md`.
  - `src/games/startup-simulator.rules` does not change.
- **Existing tests.**
  - No existing test line changes, except these classes, each named by its task and listed in its report:
    - Task 1: a pin of 10-1 or 10-2 that compares a seat's whole extras (`toEqual`) while `NEST_KEY` holds the levels; it gains `beneath`.
    - Task 3: the `shownPlayerValues(game)` pin in `startup-simulator.test.ts`, which 10-2 Task 2 pinned without `spare capital` and `cover`; any `gaugePairs(game)` pin that gains a pair; any whole-view pin (`toEqual`) of a Startup seat's `playerValues` or extras. Each gains the values now shown.
  - New names are imported on new `import` lines.
  - If any other existing test fails, stop and report it.
- **The browser check** uses the pre-installed Chromium (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; never `playwright install`).
  - Its scripts and screenshots stay in `/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-10-3/`, never in the repo.
  - Its setup lines go where every seed sets up: right after `  3 new Equity cards go to each equity, each naming its owner as its founder.`, before Setup's deal, checked at seeds 1 to 10.
- **Page copy (exact):**
  - **An action waiting beneath:** `beneath: ` then 7-3's waiting line (with 9-3's places): `beneath: p2 wants to liquidate a card in their operations: Smart Lock.` In `<div data-testid="waiting-under">`, in `seatColor(by)`, nearest first, right under 7-3's `waiting` line.
  - **The levels:** `{n} levels open over {seat}'s turn ({phase}).`, or `{n} levels open over {seat}'s turn.` with no phase. In `<div data-testid="beneath">`, in `seatColor(seat)`, after the last `waiting-under` line.
  - **What a player owes:** `owes {amount} to {seat}` or `owes {amount} to the bank`, one per bill, in the order owed, joined by `, then `: `owes 4 to p1, then 1 to the bank`. It is one ` · `-part of the entry, right after Rent Day's `owes …` part.
  - **A value shown alone:** `{Value} {n}`, first letter upper-cased as a gauge's is, joined by ` · `: `Cover 10 · Spare capital -4`. In `<div data-testid="values-{seat}">`, in the seat's colour, under its gauges and over its Board.
  - **Everything else is earlier plans' copy:** 7-3's waiting line `{by} wants to {words}: {cards}.`; 9-3's `a face-down card ({place})`; 4-3's labels; 3-2's player flags on the tableau line.
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1, record `BASE=$(git rev-parse HEAD)`. Run `bun run test` once for the passing count and the long runs' time.
  - Task 3 adds values to every Startup view the long runs read. If they take more than a third longer than at BASE, report the timing.
- **No new dependencies.**
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefix `feat(designer):` (`docs:` for Task 7).
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.
  - A test marked "(guard)" passes before its task's change, and says so.

## Review Focus

- **Undo at depth while a picker, a question or a clicked card's offer is open:** a failed Come Clean's Fold picker, a nested liquidation's picker, Settle's payee question.
  - Expected: it closes in the render that receives the earlier view; no ring stays; the lines follow the view back; nothing is sent.
  - Tests: Task 1 (general), Tasks 4 and 6.
- **Today's shapes on every other game:** one kept turn (`INTERRUPT_BOARD`'s vote, Rent Day's auction), one action waiting (`OBJECT_GAME`'s window), an action waiting over a kept turn (`INSPECT_GAME`'s bid).
  - Expected: no `beneath` key, no `waiting-under` or `beneath` line, no bill words; the views as before.
  - Tests: Tasks 1 and 2.
- **A hidden card beneath a waiting action, or in a bankrupt player's development:** a `waitingUnder` entry naming a card the seat can't see, and a bankrupt seller asked to Come Clean with a project that doesn't need the Tag.
  - Expected: `a face-down card ({place})`; no rival page names the project; the greyed reason shows on its owner's page alone.
  - Tests: Task 1, Task 6.
- **Values and debts at their edges:** spare capital below 0 and at exactly 0; a $0 product in the cover; two bills to the same seat; a value read from a counter only its owner sees.
  - Expected: `Spare capital -4` and `Leeway 0`; the $0 product adds nothing; `owes 4 to p2, then 2 to p2`; that value is never shown.
  - Tests: Tasks 2, 3 and 4.
- **Two bankrupt seats at once, and the seller asked last after a Partner's nested Bankruptcy.**
  - Expected: at each press the selected tab is `turn.current`; both lines say `bankrupt`, each with its own `owes`; the levels line counts 3, 4, 4, 3, then goes.
  - Tests: Task 6.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name, not by line. If one is missing or differs, stop and report it.

- **HEAD:**
  - `playtest.tsx`: `SeatCanvas`, `Playtest` (its `initial` prop), the `seen` tab-follow, `stale`, `closePicker`, `liveAt`, `askedNoMore`, `offered`;
  - `seat-status.ts`: `seatStatus`, `seatToAct`; `seat-tabs.tsx`: `SeatTabs`; `seat-colors.ts`: `seatColor`;
  - `board-controls.tsx`: `entryFor(board, seat, withCards)`, `MoneyLine`, `bankLine`; `board-grid.tsx`: `factWords`;
  - `tableaux.tsx`: `tableauLine`, `Tableaux`, `SHORT_COLOR`; `gauges.ts`: `gaugesOf`, `Gauge`;
  - `board-text.ts`: `boardText`, `boardBadges`, `cardLabel`;
  - `worked-view.ts`: `shownPlayerValues`, `gaugePairs`, `dimFlags`, and the private `totalSeenByAll`, `everyoneSees`, `readsTheCardAlone`;
  - `board-view.ts`: `SeatExtras`, `seatExtras`, `readSeatExtras`, `PlayerValuesView`, the private `playerValuesView`;
  - `card-sprite.ts`'s badge lines; `text-faces.ts`: `boldTextWidth`; `fit-layout.ts`: `fitsTable`.
- **4-3, 5-3, 6-3 (built):** `GAUGED_GAME`; the `playtest-fitted.test.tsx` helpers `seatButtons`, `askedGroup`, `answerAsked`; 5-3's decor merge and `confirm`; 6-3's `placesOf`, `inPlay`, `bankText`, the hover line, `paidNumbers`.
- **7-3 (built):** `waitingLine(game, waiting)` and `<div data-testid="waiting">`; `fittedLayout(zones, viewer, seats)`; the helpers `tokenOf`, `holding`, `setUp7` (the Whistleblower Protection Act in play), `waitingText`; the labels `ASSIGN`, `RECRUIT`, `CONFIRM`; `$SCRATCH/../browser-7-3/check.cjs`.
- **8-3 (built):** `pressPrices`, `PricesView`, `SeatExtras.prices`, `pickNotes` (a picker entry `{name} ({place}, sale price 6)`); `marked(state, id, facts)`, `inOrder`; the labels `DIVEST_L`, `BUY_L`, `PASS_L`, `ACQUIRE_L`, `AGREE_L`.
- **9-3 (built):** `rowPlaceOf`, `WaitingView.places`, `waitingLine`'s places; `withFaceDown` and the `face down` label; `playtest-face-down.test.tsx`'s `@/engine/react` mock, `tables`, `panelOf`, `pageOf`; in `playtest-fitted.test.tsx`, `laidFaceDown`, `idsIn`, and the labels `GREENLIGHT_FD_L`, `AUDIT_L`, `PASS_AUDIT_L`, `PASS_BID_L`, `FOLD_L`, `SETTLE_L`; `$SCRATCH/../browser-9-3/check.cjs` and its probe.
- **10-1 (built):**
  - `frames.ts`: `NEST_KEY`, `framesOf`, `turnBeneath`, `newestKept`; `board-state.ts`: `BILLS_KEY`, `Bill`, `billsOf`, `owedBy`, `addBill`;
  - `board-view.ts`: `SeatExtras.waitingUnder` (oldest first), `SeatExtras.bills`, `BoardView.interrupted` as `newestKept(state) !== null`;
  - the value lines `a player's {playervalue} is their {counter}` and `… goes down by what they owe`; the conditions `their {playervalue} is less than {int}` and `… is at least the {gamenumber}`; 8-1's `their {playervalue} is at least the card's {attribute}`; 7-1's `… goes up by the total {attribute} of {cardgroup}` and 8-1's `… goes down by the total …`; `CounterSpec.visibility`;
  - the fixtures `NEST_GAME`, `APPEAL_BOARD`, `TAB_GAME`, `LEEWAY_GAME`, `CHAIN_GAME`, and the arrangements of 10-1 Task 2's `describe('an action waiting above another level')` and Task 9's `describe('levels played through, as each seat sees them')`.
- **10-2 (built):**
  - phases `reckoning`, `liquidation`, `free come clean`, `come clean`, each with its Hint;
  - player flags `bankrupt`, `liquidating`, `the seller`; card flags `requires legacy`, `also requires legacy`; values `spare capital`, `cover`;
  - its examples' arrangements; the values test's `shownPlayerValues` pin in `startup-simulator.test.ts`.
- **Second-person labels used below.** Each task defines those it uses as module-level constants in `playtest-fitted.test.tsx`, beside 7-3's, 8-3's and 9-3's. Re-check each against the view; the compiler's `actionLabel` makes them.
  - `LIQUIDATE_L` = `Liquidate a card in your operations`;
  - `REVEAL_L` = `Reveal a card in your development`; `DECLINE_REVEAL_L` = `Decline to reveal`;
  - `COME_CLEAN_L` = `Come clean with a card in your development`; `DECLINE_COME_CLEAN_L` = `Decline to come clean`;
  - `PIVOT_L` = `Pivot a card in your development`.
  - The rules' words in waiting lines: `liquidate a card in their operations`, `divest a card in their operations`, `buy a card in another player's operations`.

---

### Task 1: The levels in words

Before starting: re-check 10-1's `framesOf`, `turnBeneath`, `NEST_KEY`, `SeatExtras.waitingUnder` and `readSeatExtras`; 7-3's `waitingLine` and its `waiting` div in `playtest.tsx`; 9-3's places; 9-3's `playtest-face-down.test.tsx` mock and `panelOf`; the arrangement helpers of 10-1 Tasks 2 and 9 (copy one into the new test file if it is local to its test).

**Files:**
- Modify: `src/engine/core/lang/board-view.ts` (`BeneathView`, `SeatExtras.beneath`, `seatExtras`, `readSeatExtras`), `src/pages/designer/seat-status.ts` (`LevelLine`, `levelLines`), `src/pages/designer/playtest.tsx` (the lines)
- Create: `src/pages/designer/playtest-levels.test.tsx`
- Test (append): `src/engine/core/lang/board-view.test.ts`, `src/pages/designer/seat-status.test.ts`

**Interfaces:**
- Consumes: the names above.
- Produces (for Tasks 2–7):

```ts
// board-view.ts
/** The turn beneath every open level, and how many levels are open: the same for every seat. */
export type BeneathView = { seat: PlayerId; phase: string | null; levels: number };
// SeatExtras gains beneath?: BeneathView, from turnBeneath(state) (current → seat) and framesOf(state).length. It is left out unless
// state.data holds NEST_KEY: the open levels are none of the four shapes the two slots hold, so every view of those shapes is as before.
// readSeatExtras accepts it absent, or as a text seat, a text or null phase and a whole number of levels of at least 2; null otherwise.
// seat-status.ts
/** One line under a seat's status: its test id, the seat whose colour it takes, and its text (Page copy). */
export type LevelLine = { testId: 'waiting' | 'waiting-under' | 'beneath'; seat: PlayerId; text: string };
/**
 * The lines under a seat's status: the action waiting as waitingLine writes it, coloured by its presser; each of waitingUnder, nearest
 * first, as `beneath: ` and waitingLine; then, when the view gives beneath, `{n} levels open over {seat}'s turn ({phase}).` None for null.
 */
export function levelLines(game: CompiledGame, extras: SeatExtras | null): LevelLine[];
// playtest.tsx — 7-3's waiting div becomes one div per levelLines entry, in its place: data-testid and colour as each gives.
```

- **`playtest-levels.test.tsx`** (new; it holds no Startup word). It mocks `@/components/PixiCanvas` and `@/engine/react` as 9-3's `playtest-face-down.test.tsx` does, keeping each seat's last props in `tables`. Module level:

```ts
const tables: CardTableProps[] = [];
/** The panel of `seat`: the element its status line sits in (9-3's). */
const panelOf = (seat: string) => screen.getByText(new RegExp(`^seat: ${seat} `)).parentElement!;
/** The lines under `seat`'s status, in order, as [test id, text]. */
const linesOf = (seat: string): [string, string][];
/** A Playtest of `text` at `players` seats, started from `initial`. */
const mountAt = (text: string, initial: GameState, players = 3) => void;
```

  - Each describe first asserts that its game fits one table (`fitsTable`), so every seat has a panel. If one doesn't, stop and report it.

- [ ] **Step 1: Write the failing tests.**
  - **`board-view.test.ts`,** `describe('the turn beneath levels that nest')`. Read every seat's extras with `seatExtras` at each step.
    - `NEST_GAME`, played through 10-1 Task 2's steps:
      - step 1: no seat's extras has `beneath`;
      - step 2: every seat's `beneath` is `{ seat: 'p0', phase: 'working', levels: 2 }`;
      - step 3: `levels` is 3; step 4: 2; step 5: no `beneath`.
    - `APPEAL_BOARD` during the appeal: `{ seat: 'p0', phase: 'playing', levels: 2 }`.
    - **Review Focus (guards): today's shapes.** No `beneath` key while `INTERRUPT_BOARD`'s vote is open (one kept turn), while `OBJECT_GAME`'s window waits (one action), or while `INSPECT_GAME`'s bid waits (an action over a kept turn).
    - `readSeatExtras` takes back step 3's extras. It returns null for `levels: '2'`, for `levels: 1` and for `phase: 3`.
  - **`seat-status.test.ts`,** `describe('levelLines')`, on `INSPECT_GAME`'s compiled game, with extras made by hand:
    - `W0` = `{ by: 'p0', label: <stop's label>, cards: [], choices: [] }`;
    - `W1` = 9-3's inspect view by p1: `cards: ['a face-down card']`, `choices: []`, `places: ["p0's workshop, card 3"]`;
    - `W2` = `{ by: 'p2', label: <stop's label>, cards: [], choices: [] }`.
    - For `{ …, waiting: W2, waitingUnder: [W0, W1], beneath: { seat: 'p0', phase: 'working', levels: 4 } }`, the lines are, in order:
      - `{ testId: 'waiting', seat: 'p2', text: 'p2 wants to stop.' }`;
      - `{ testId: 'waiting-under', seat: 'p1', text: "beneath: p1 wants to inspect a card in another player's workshop: a face-down card (p0's workshop, card 3)." }`;
      - `{ testId: 'waiting-under', seat: 'p0', text: 'beneath: p0 wants to stop.' }`;
      - `{ testId: 'beneath', seat: 'p0', text: "4 levels open over p0's turn (working)." }`.
    - With `phase: null`, the last text is `4 levels open over p0's turn.`
    - **(guard)** `waiting: W2` alone gives the one line 7-3 writes. `null`, and extras with nothing waiting and no `beneath`, give `[]`.
  - **`playtest-levels.test.tsx`,** `describe('levels on the panels')`.
    - **An action above a hearing.** `NEST_GAME`, driven through 10-1 Task 2's steps 1–2 with `engine.dispatch`, then mounted at that state.
      - Every panel's `linesOf` is `[['waiting', <the claim's line>], ['beneath', "2 levels open over p0's turn (working)."]]`.
      - On p1's panel press `Put up a card in your workshop` and pick `Statue`. Then every panel's lines are:
        - `['waiting', "p1 wants to put up a card in their workshop: Statue."]`;
        - `['waiting-under', 'beneath: ' + <the claim's line>]`;
        - `['beneath', "3 levels open over p0's turn (working)."]`.
      - p2's status line is p2's turn, as `seatStatus` writes it.
      - The claim's line is `waitingLine` of that state's `waiting` for p0. Re-check the labels and words against the compiled game.
    - **Review Focus: Undo with a picker open at depth.** On p2's panel press `Bid on a card in another player's workshop` (re-check the label against the compiled game); `tables[2].decor` rings p1's Statue `choice`. Press `Undo`. Then:
      - every panel's lines are step 2's;
      - p2's panel has no `Pick cards` group;
      - no entry of `tables[2].decor` has a `ring`.
    - **Five levels.** `CHAIN_GAME`, arranged as 10-1 Task 9's view test arranges it, and pressed up to the state right before p2 sells off the Vase. Mount it there.
      - Every panel reads:
        - `['waiting', "p1 wants to bid on a card in another player's workshop: Statue."]`;
        - `['waiting-under', "beneath: p0 wants to sell off a card in their workshop: Statue."]`;
        - `['beneath', "4 levels open over p0's turn (working)."]`.
      - On p2's panel press `Sell off a card in your workshop` and pick `Vase`. Every panel reads:
        - `['waiting', "p2 wants to sell off a card in their workshop: Vase."]`;
        - `['waiting-under', "beneath: p1 wants to bid on a card in another player's workshop: Statue."]`;
        - `['waiting-under', "beneath: p0 wants to sell off a card in their workshop: Statue."]`;
        - `['beneath', "5 levels open over p0's turn (working)."]`.
      - p1's status is p1's turn, and p0's says it waits for p1.
      - On p1's panel press `Pass the bid` (the Vase goes to the bank, p2 pays and is no longer broke, 10-1 example 5). Every panel reads:
        - `['waiting', "p1 wants to bid on a card in another player's workshop: Statue."]`;
        - `['waiting-under', "beneath: p0 wants to sell off a card in their workshop: Statue."]`;
        - `['beneath', "3 levels open over p0's turn (working)."]`.

        p2's status is p2's turn.
      - On p2's panel press `Keep quiet`. Then no panel has a `waiting`, `waiting-under` or `beneath` test id, and p0's status is p0's turn.
    - **(guard)** A Color Match page at 3, and an `INTERRUPT_BOARD` page during its vote, have no `waiting-under` or `beneath` test id.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/board-view.test.ts src/pages/designer/seat-status.test.ts src/pages/designer/playtest-levels.test.tsx`. Expected: FAIL (`beneath` and `levelLines` are missing; the panels show one waiting line). The guards pass.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `SeatExtras`.
- [ ] **Step 4: Run** `bunx vitest run src/engine src/pages src/games`, then `bun run test` and `bun run typecheck`. A pin in Task 1's named class gains `beneath`: list each.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/board-view.ts src/pages/designer/seat-status.ts src/pages/designer/playtest.tsx \
  src/pages/designer/playtest-levels.test.tsx src/engine/core/lang/board-view.test.ts src/pages/designer/seat-status.test.ts
# and each test file Step 4 changed, named in the report
git commit -F - <<'EOF'
feat(designer): every open level is written out under each seat's status, the actions waiting beneath nearest first, and how many levels are open over whose turn once they nest

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: What a player owes, in words

Before starting: re-check `entryFor`, `MoneyLine`, `tableauLine`, `Tableaux`' props (9-3 added `faceDown`), 10-1's `Bill`, `SeatExtras.bills` and `TAB_GAME`, `board-parts.test.tsx`'s `MoneyLine` describe and its board helper, `tableaux.test.ts`'s Startup line pin, and Task 1's helpers.

**Files:**
- Modify: `src/pages/designer/board-controls.tsx` (`billsWords`, `entryFor`, `MoneyLine`), `src/pages/designer/tableaux.tsx` (`tableauLine`, `Tableaux`), `src/pages/designer/playtest.tsx` (passes `extras?.bills`)
- Test (append): `src/pages/designer/board-parts.test.tsx`, `src/pages/designer/tableaux.test.ts`, `src/pages/designer/playtest-levels.test.tsx`

**Interfaces:**
- Consumes: 10-1's `Bill` and `SeatExtras.bills`; Task 1's helpers.
- Produces (for Tasks 4–7):

```ts
// board-controls.tsx
/** What a seat owes, in the order owed (Page copy): `owes 4 to p2, then 1 to the bank`; '' for none or undefined. */
export function billsWords(bills: readonly Bill[] | undefined): string;
// entryFor gains a last optional parameter `bills?: readonly Bill[]`: billsWords(bills), when not '', is a part right after Rent Day's
//   `owes …` part and before the player's facts.
// MoneyLine's props gain bills?: { [seat: string]: Bill[] }, each seat's passed to its entryFor.
// tableaux.tsx — tableauLine gains a last optional parameter `bills?: readonly Bill[]`, passed to entryFor; Tableaux gains
//   bills?: { [seat: string]: Bill[] }, each seat's passed to its tableauLine.
// playtest.tsx — MoneyLine and Tableaux get bills={extras?.bills}.
```

- [ ] **Step 1: Write the failing tests.**
  - **`board-parts.test.tsx`,** `describe('what a player owes, in the order owed')`:
    - `billsWords([{ amount: 4, to: 'p2' }, { amount: 1, to: 'bank' }])` is `owes 4 to p2, then 1 to the bank`;
    - `[{ amount: 5, to: 'bank' }]` gives `owes 5 to the bank`;
    - **Review Focus:** `[{ amount: 4, to: 'p2' }, { amount: 2, to: 'p2' }]` gives `owes 4 to p2, then 2 to p2`;
    - `[]` and `undefined` give `''`.
    - Make a board as the file's `describe('facts about players')` makes one, with p0 at 3 money and the flag `asleep` set. A `MoneyLine` with `bills={{ p0: [{ amount: 4, to: 'p2' }, { amount: 1, to: 'bank' }] }}` reads p0's entry `p0 3 money · owes 4 to p2, then 1 to the bank · asleep`: the bills after the numbers, before the flags.
    - **(guard)** The file's debt tests pass unchanged: a Rent Day debtor reads `owes p1`, with no `then`.
  - **`tableaux.test.ts`,** appended to the Startup describe:
    - `tableauLine(game, board, cards, S, [{ amount: 4, to: N }, { amount: 1, to: 'bank' }])` starts with `` `${entryFor(board, S, false)} · owes 4 to ${N}, then 1 to the bank · ` ``;
    - without bills it is the file's pinned line (guard).
  - **`playtest-levels.test.tsx`,** `describe('what players owe, on the money line')`. `moneyOf(panel, seat)` is local: the text of `seat`'s entry on `panel`'s money line.
    - `TAB_GAME` at 3 players, p0's turn in working, p2 the claimant (`setPlayerFact`), a Vase in `workshop-p1`. Mount.
    - On p0's panel press `Take the blame`. On every panel, p0's entry contains `owes 4 to p2, then 1 to the bank`.
    - Press `Run a tab`; no question is asked (p1 alone has a Vase). Every panel reads `owes 4 to p2, then 1 to the bank, then 2 to p1`.
    - Press `Square up`. Then:
      - p0's entry starts `p0 2 coins` and has no `owes`;
      - p2's starts `p2 13 coins`, and p1's `p1 11 coins`.
    - **Undo** brings back the three bills on every panel.
    - **Two seats owing at depth.** On the five-level `CHAIN_GAME` state of Task 1, every panel reads:
      - p0's entry with `owes 4 to p2, then 1 to the bank`;
      - p2's with `owes 5 to the bank`;
      - p1's with no `owes`.
    - **How the numbers come:** 10-1's `TAB_GAME`, 9 coins each. The blame owes 4 to the claimant and 1 to the bank; the tab owes the fee of 2. Squaring up pays 4 + 1 + 2 = 7: 9 − 7 = 2, p2 9 + 4 = 13, p1 9 + 2 = 11.
- [ ] **Step 2: Run** `bunx vitest run src/pages/designer/board-parts.test.tsx src/pages/designer/tableaux.test.ts src/pages/designer/playtest-levels.test.tsx`. Expected: FAIL (`billsWords` is missing; no entry says `owes 4 to`). The guards pass.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/pages src/engine src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/pages/designer/board-controls.tsx src/pages/designer/tableaux.tsx src/pages/designer/playtest.tsx \
  src/pages/designer/board-parts.test.tsx src/pages/designer/tableaux.test.ts src/pages/designer/playtest-levels.test.tsx
git commit -F - <<'EOF'
feat(designer): each player's entry says what they owe and to whom, in the order they owe it, on the money line and the tableau line

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: Values every seat may know, shown alone

Before starting: re-check `shownPlayerValues`, `totalSeenByAll`, `everyoneSees`, `readsTheCardAlone`, `gaugePairs`, `dimFlags` and every other reader of `shownPlayerValues` at HEAD; the patterns of the value lines and comparisons named in "Assumed" (10-1 Task 7, 7-1, 8-1), and whether each is exported as a constant; `CounterSpec.visibility`; `gaugesOf`; `Tableaux`; 10-1's `LEEWAY_GAME`; the values test in `startup-simulator.test.ts` as 10-2 left it.

**Files:**
- Modify: `src/engine/core/lang/worked-view.ts` (`shownPlayerValues`, `dimFlags`, `soloValues`), `src/engine/core/lang/library/player-value-phrases.ts` (only to export a pattern constant the walk needs, if none is), `src/pages/designer/gauges.ts` (`soloValuesOf`), `src/pages/designer/tableaux.tsx` (the values line)
- Test (append): `src/engine/core/lang/worked-view.test.ts`, `src/engine/core/lang/board-view.test.ts`, `src/pages/designer/gauges.test.ts`, `src/pages/designer/tableaux.test.ts`, `src/games/startup-simulator.test.ts`

**Interfaces:**
- Consumes: the names above.
- Produces (for Tasks 4–7):

```ts
// worked-view.ts
// shownPlayerValues: a line now also counts as one every seat may know when it is
//  - `a player's {playervalue} goes up by the total {attribute} of {cardgroup}` or `… goes down by the total …`, tested as PLAYER_TOTAL is;
//  - `a player's {playervalue} is their {counter}`, for a counter whose visibility is 'public';
//  - `a player's {playervalue} goes down by what they owe`: every seat is told what each player owes (SeatExtras.bills).
// Any other line still leaves its value unshown.
// dimFlags reads the groups of the three total lines only.
/**
 * Each shown value that a button's Only if line compares with something that is not another value: a whole number, a number of the game
 * or a number of the card it picks. These are the conditions whose pattern starts `their {playervalue} ` and holds no second
 * {playervalue}. In phase, button and line order, once, leaving out every value gaugePairs pairs. The page shows each alone.
 */
export function soloValues(game: CompiledGame): string[];
// gauges.ts
/** Each of soloValues(game) that `values` has, as `{Value} {n}` with its first letter upper-cased: `Leeway -2`. None for undefined. */
export function soloValuesOf(game: CompiledGame, values: { [name: string]: number } | undefined): string[];
// tableaux.tsx — under a seat's gauges and over its Board, <div data-testid="values-{seat}"> holds soloValuesOf joined by ' · ', in the
//   seat's colour. There is none for a seat that is out, or with no value to show.
```

- [ ] **Step 1: Write the failing tests.**
  - **`worked-view.test.ts`,** `describe('values every seat may know, shown alone')`. `LEEWAY_GAME` is 10-1's: `A player's leeway is their coins.` and `… goes down by what they owe.`; its splurge waits on `their leeway is at least the fee`, and its fret on `their leeway is less than 0`.
    - `shownPlayerValues(compiled(LEEWAY_GAME))` contains `leeway`;
    - `soloValues(…)` is `['leeway']`;
    - `dimFlags(…)` is `[]` and doesn't throw.
    - **Review Focus: a counter only its owner sees.** Add `  Each player has 0 gems that only they can see.` and make the first leeway line `  A player's leeway is their gems.` (10-1 Task 7's variant). `shownPlayerValues` has no `leeway`, and `soloValues` is `[]`.
    - With a third leeway line `  A player's leeway goes up by the total worth of the cards in their stash.` (a row only its owner sees), there is no `leeway`. With `… in their workshop.` (a row everyone sees), there is.
    - **(guard)** `GAUGED_GAME`'s `shownPlayerValues`, `gaugePairs` and `dimFlags` pins pass unchanged, and its `soloValues` is `[]`.
  - **`board-view.test.ts`,** appended: on a 3-player `LEEWAY_GAME` engine, every seat's `playerValues` is `{ p0: { leeway: 9 }, p1: { leeway: 9 }, p2: { leeway: 9 } }`. After p0 takes the blame with p2 the claimant, every seat's `playerValues.p0.leeway` is 4.
  - **`gauges.test.ts`:**
    - `soloValuesOf(compiled(LEEWAY_GAME), { leeway: -2 })` is `['Leeway -2']`;
    - **Review Focus:** `{ leeway: 0 }` gives `['Leeway 0']`;
    - `{}` and `undefined` give `[]`.
  - **`tableaux.test.ts`,** appended:
    - `Tableaux` on `LEEWAY_GAME`'s game with `playerValues` `{ p0: { leeway: 4 }, … }`: `values-p0`'s text is `Leeway 4`, in p0's colour, right after p0's tableau line (there are no gauges) and before `board-p0` when it is there;
    - **(guard)** the file's gauge tests pass unchanged, and a `GAUGED_GAME` page has no `values-` test id.
  - **`startup-simulator.test.ts`** (Task 3's named lines):
    - the `shownPlayerValues(game)` pin gains `spare capital` and `cover` where the code puts them;
    - append `expect(soloValues(game)).toEqual(['cover', 'spare capital'])`: Settle in `reckoning` comes before the paid Come Clean in `come clean`.
    - If any other value is now shown, or `gaugePairs(game)` or `soloValues(game)` holds another name, pin what the code gives and report each.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/worked-view.test.ts src/engine/core/lang/board-view.test.ts src/pages/designer/gauges.test.ts src/pages/designer/tableaux.test.ts src/games/startup-simulator.test.ts`. Expected: FAIL (`soloValues` is missing; `leeway`, `spare capital` and `cover` are unshown). The guards pass.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/engine src/pages src/games`, then `bun run test` and `bun run typecheck`.
  - Every pin in Task 3's named class gains the values now shown: list each.
  - Report the long runs' time against BASE.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/worked-view.ts src/pages/designer/gauges.ts src/pages/designer/tableaux.tsx \
  src/engine/core/lang/worked-view.test.ts src/engine/core/lang/board-view.test.ts src/pages/designer/gauges.test.ts \
  src/pages/designer/tableaux.test.ts src/games/startup-simulator.test.ts
# and player-value-phrases.ts if a constant was exported, and each test file Step 4 changed, named in the report
git commit -F - <<'EOF'
feat(designer): a value about a player that reads only what every seat is told is shown, and one a button compares with a number is shown alone under the player's gauges

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: The Bankruptcy through Startup's tabs

Before starting: re-check 10-2's `reckoning` and `liquidation` phases, their Hints, buttons and refusal words (`its fire sale price is more than 0`, `their cover is at least the card's settlement`); 9-3's audit flow, `laidFaceDown`, `idsIn` and labels; 8-3's `marked`, `inOrder` and the buy picker's price note; 7-3's `setUp7`, `tokenOf`, `holding`; `setCounter`; Tasks 1–3's names. Read each Hint from the compiled game (`hint('reckoning')`).

**Files:**
- Test (append): `src/pages/designer/playtest-fitted.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–3. Produces no page code (Call 5).
- **Module level** (`playtest-fitted.test.tsx`): this task's labels (Assumed), and

```ts
/** The `waiting-under` lines of the drawn panel, in order. */
const underTexts = (): string[] => screen.queryAllByTestId('waiting-under').map((el) => el.textContent!);
const beneathText = (): string | null => screen.queryByTestId('beneath')?.textContent ?? null;
const valuesOf = (seat: string): string | null => screen.queryByTestId(`values-${seat}`)?.textContent ?? null;
/** Everything the drawn seat's page holds: body text, every title and aria-label, and the table's cards and decor, as one string (9-3). */
const wholePage = (): string;
```

- Status lines: `reckoning` and `liquidation` open as kept turns, so the deciding seat's status is `` `seat: ${S} — reckoning — Your turn — ${hint('reckoning')}` ``. A market sale asked inside the liquidation reads `market sale — ` first too. If HEAD writes either otherwise, pin what `seatStatus` writes and report it.

- [ ] **Step 1: Write the tests.** `describe('the Bankruptcy through the seat tabs')`, with `T = after(N, 3)`, `tab` and `boardOf` local as in 9-3's describes.
  - **Arrangement B** (10-2 Task 2 example 1): `setUp7()` with:
    - S at 1 capital (`setCounter`);
    - a To-Do List, a Dating App and a Mobile Wallet in `operations-${S}`;
    - `tokenOf(…, T, 0)` held by S on no card (`holding`);
    - T's Junior Software Dev in `ops-team-${T}`;
    - a Search Engine in `development-${S}`, laid face down.
  - **Caught.** Mount B (S's tab) and press `End your actions`. On N's tab press `AUDIT_L` and pick `` `a face-down card (${S}'s development, card 1)` ``. On T's tab press `PASS_BID_L`. Then:
    - `` tab(`${S} — to act`) `` is selected, with the reckoning status above;
    - `seatButtons()` is `[FOLD_L, SETTLE_L]`. Press `SETTLE_L`: the Search Engine, or the button, is greyed with the Platform guard's words. Pin which, as the view gives it. Press Cancel.
    - `valuesOf(S)` contains `Cover 10` and `Spare capital 1`.
  - **Folded into Bankruptcy.** Press `FOLD_L` and `pickNamed('Search Engine')`. Then:
    - `` tab(`${S} — to act`) `` is selected, with the liquidation status, and `seatButtons()` is `[LIQUIDATE_L]`;
    - `lineOf(S)` starts `` `${S} 1 capital` ``, and contains `` `owes 4 to ${N}, then 1 to the bank` ``, `bankrupt`, `liquidating` and `portfolio 0`;
    - `boardOf(T)` contains `equity: Equity; Equity; Equity`;
    - `valuesOf(S)` contains `Cover 5` and `Spare capital -4`;
    - `beneathText()` is null: one kept turn is today's shape.
  - **Review Focus: Undo with the picker open.** Press `LIQUIDATE_L`: S's three products are ringed `choice`. Press `Undo`. Then:
    - the reckoning status is back, with no `Pick cards` group;
    - no entry of `table!.decor` has a `ring`;
    - `lineOf(S)` contains neither `owes` nor `bankrupt`, and contains `portfolio 1`.

    Fold again.
  - **The liquidation.** Press `LIQUIDATE_L`; its picker's buttons before Cancel are `To-Do List`, `Dating App` and `Mobile Wallet`, all live. Pick the Dating App. Then:
    - `` tab(`${T} — to act`) `` is selected, with the market sale's status;
    - `waitingText()` is `` `${S} wants to liquidate a card in their operations: Dating App.` ``, and `underTexts()` is `[]`;
    - `lineOf(S)` contains `the seller`.

    Press `PASS_L`. Then `` tab(`${S} — to act`) `` is selected, `lineOf(S)` starts `` `${S} 4 capital` ``, and `inOrder('open-idea-pool')` names the Search Engine and the Dating App.
  - **Covered.** Liquidate the To-Do List. On T's tab press `BUY_L` and pick `` `To-Do List (${S}'s operations, sale price 6)` ``. Then:
    - `lineOf(S)` starts `` `${S} 5 capital` `` and contains neither `owes` nor `bankrupt`;
    - `lineOf(N)` starts `` `${N} 11 capital` ``, and `lineOf(T)` `` `${T} 1 capital` ``;
    - `boardOf(S)` contains `operations: Mobile Wallet`;
    - `` tab(`${N} — to act`) `` is selected with N's own turn. Pin its status as given.
  - **A $0 product is kept** (10-2 Task 2 example 2). B with the To-Do List `marked` `{ scandal: 1 }`. Catch and fold as above. Then:
    - in the `LIQUIDATE_L` picker, `To-Do List` is greyed with `title` `its fire sale price is more than 0`;
    - `valuesOf(S)` contains `Cover 2`.
  - **Settle's cover** (10-2 Task 2 example 4). Arrangement C: `setUp7()` with:
    - S at 2 capital;
    - a Dating App in `operations-${S}`;
    - a Tech Blog in `operations-${T}`;
    - a Search Engine in `development-${S}`, laid face down.

    Catch it as above. Then:
    - `valuesOf(S)` contains `Cover 5` and `Spare capital 2`;
    - press `SETTLE_L`: the Search Engine, or the button, is greyed with `title` `their cover is at least the card's settlement`. Pin which. Press Cancel.
  - C with the Dating App `marked` `{ hype: 1 }`, caught as above:
    - `valuesOf(S)` contains `Cover 7`;
    - press `SETTLE_L` and `pickNamed('Search Engine')`; no question is asked (T alone provides Platform).

    Then:
    - the liquidation status is shown;
    - `lineOf(S)` contains `` `owes 3 to the bank, then 3 to ${T}` `` and `bankrupt`;
    - `lineOf(N)` starts `` `${N} 15 capital` ``.

    Liquidate the Dating App; no tab moves. Then:
    - `lineOf(S)` starts `` `${S} 1 capital` `` and has no `owes`;
    - `lineOf(T)` starts `` `${T} 10 capital` ``;
    - `boardOf(S)` contains `Search Engine`, with no `caught` and no `face down`.
  - **How the numbers come** (§7.A–C, §7 Liquidation, §7 Bankruptcy, §17.C.3, §20.C, §20.D 17, rulings 24 and 25, R2):
    - §7.C: a caught Fold is $5, $4 of it to the Whistleblower: 1 − 5 is −4, so S goes Bankrupt and owes 4 to N, then 1 to the bank (R2: paid in the order owed).
    - §7 Bankruptcy step 1: Equity S holds goes back to its Founder unpaid.
    - §7 and §20.C: a Tier 1 product's M&A Price is $6 and its Fire Sale $3; a Scandal takes $5 off, so a To-Do List with one fire-sells for $0 and is kept.
    - R2: cover = cash + Fire Sale value − owed (1 + 9 = 10 before; 1 + 9 − 5 = 5 after); spare capital = cash − owed (1 − 5 = −4).
    - The Dating App: T has the Blue room and $7 but passes; the bank pays 3, so 4. The To-Do List sells to T for 6: 10, then 4 to N (7 + 4 = 11) and 1 to the bank: 5. T has 7 − 6 = 1.
    - The Settlement is $3 plus a $3 License to T: $6. Cover 2 + 3 = 5 is short; with a Hype the Dating App's M&A Price is $11 and its Fire Sale $5, so 2 + 5 = 7 covers it.
    - The bank pays N's $4 bounty at once, $8 under the Whistleblower Protection Act (§20.D 17): 7 + 8 = 15. No one can buy at $11, so the Fire Sale pays 5: 2 + 5 = 7, then 3 + 3: 1, and T has 7 + 3 = 10.
- [ ] **Step 2: Run** `bunx vitest run src/pages/designer/playtest-fitted.test.tsx`. Expected: PASS, since Tasks 1–3 and plans 7-3 to 10-2 provide every check. If a test fails, stop and report it: it is a page gap, not something to work around.
- [ ] **Step 3: Run** `bunx vitest run src/pages src/engine src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 4: Commit**

```bash
git add src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(designer): a Bankruptcy is played through the seat tabs: the reckoning, the seizure, the liquidation with its $0 product kept, what the player owes, and Settle beside its cover

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: The Come Clean through Startup's tabs

Before starting: re-check 10-2's `free come clean` and `come clean` phases, Hints and refusal words (`its requires is the waiting card's tag or its also requires is the waiting card's tag`, `their spare capital is at least the license`); 8-3's Divest and Market Sale flow; 9-3's `face down` label; Task 4's helpers.

**Files:**
- Test (append): `src/pages/designer/playtest-fitted.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–4. Produces no page code (Calls 1, 5 and 6).
- The Come Clean phases are asks. If no kept turn is open, the asked seat's status is `` `seat: ${N} — Your turn — ${hint('free come clean')}` ``. If HEAD writes it otherwise, pin what `seatStatus` writes and report it.

- [ ] **Step 1: Write the tests.** `describe('the Come Clean through the seat tabs')`, with `T`, `tab` and `boardOf` local.
  - **Arrangement F** (10-2 Task 3 example 2): `setUp7()` with:
    - a Tech Blog in `operations-${S}`;
    - `tokenOf(…, N, 0)` and `tokenOf(…, T, 0)` held by S on no card;
    - a Search Engine in `development-${S}`, a Server Farm in `development-${N}` and a To-Do List in `development-${T}`, each laid face down.
  - **Offered in turn from the seller's left.** Mount F; press `DIVEST_L` and pick the Tech Blog. Then:
    - `` tab(`${N} — to act`) `` is selected, with the status above;
    - `waitingText()` is `` `${S} wants to divest a card in their operations: Tech Blog.` ``; `underTexts()` is `[]`, and `beneathText()` is null;
    - `seatButtons()` is `[REVEAL_L, DECLINE_REVEAL_L]`;
    - `lineOf(S)` starts `` `${S} 10 capital, 2 actions` `` and has no `the seller`.
  - **Review Focus: the offer hides the cards.**
    - `wholePage()` on N's tab contains neither `Search Engine` nor `To-Do List`.
    - Click S's tab: `wholePage()` contains neither `Server Farm` nor `To-Do List`.
    - Click T's tab: it contains neither `Server Farm` nor `Search Engine`.

    Click N's tab.
  - **A free reveal, with Legacy Status.** Press `REVEAL_L`; `Server Farm` is live. Pick it. Then:
    - `table!.decor![serverFarm].badge` is `requires legacy`, with no `face down`;
    - `boardOf(N)` contains `Server Farm (requires legacy`. Pin the entry whole as it reads.

    Press `DECLINE_REVEAL_L`.
  - **Asked though nothing can come clean.** `` tab(`${T} — to act`) `` is selected. Press `REVEAL_L`: `To-Do List` is greyed with the one-of's words. Pin them as the view gives them. Press Cancel and `DECLINE_REVEAL_L`. Then:
    - `` tab(`${S} — to act`) `` is selected;
    - `boardOf(T)` contains `development: a face-down card`.
  - **The seller last.** Reveal the Search Engine and decline. Then:
    - the status ends with `hint('actions')`;
    - `boardOf(S)` contains `Search Engine (requires legacy`;
    - `wholePage()` on S's tab and on N's tab contains no `To-Do List`.
  - **Legacy goes with its card.** On S's tab press `PIVOT_L` and pick the Search Engine. Then:
    - no decor of S's table, and no text of `boardOf(S)`, contains `requires legacy`;
    - `inOrder('open-idea-pool')` names the Search Engine.
  - **Review Focus: Undo with the reveal picker open.** Mount F and divest the Tech Blog. On N's tab press `REVEAL_L`: the Server Farm is ringed `choice`. Press `Undo`. Then:
    - `` tab(`${S} — to act`) `` is selected, and there is no waiting line;
    - `boardOf(S)` contains `operations: Tech Blog`.

    Click N's tab: there is no `Pick cards` group, no decor `ring`, and the Server Farm's badge starts with `face down`.
  - **Arrangement P** (10-2 Task 4 example 1, at 3 players): `setUp7()` with:
    - a Tech Blog in `operations-${S}`;
    - `tokenOf(…, N, 0)` held by S on no card;
    - T's Junior Software Dev in `ops-team-${T}`;
    - N at 2 capital, and a Search Engine in `development-${N}`, laid face down.
  - **Paid, and the debt aside.** Mount P; divest the Tech Blog. `` tab(`${T} — to act`) `` is selected. Press `BUY_L` and pick `` `Tech Blog (${S}'s operations, sale price 6)` ``. Then:
    - `` tab(`${N} — to act`) `` is selected;
    - `waitingText()` is `` `${T} wants to buy a card in another player's operations: Tech Blog.` ``;
    - `underTexts()` is `` [`beneath: ${S} wants to divest a card in their operations: Tech Blog.`] ``;
    - `beneathText()` is `` `2 levels open over ${S}'s turn (actions).` ``;
    - `valuesOf(N)` contains `Spare capital 2`;
    - `COME_CLEAN_L`, or its Search Engine entry, is greyed with `title` `their spare capital is at least the license`. Pin which.

    Press `DECLINE_COME_CLEAN_L`. Then:
    - `` tab(`${S} — to act`) `` is selected, and no `waiting`, `waiting-under` or `beneath` test id is there;
    - `lineOf(S)` starts `` `${S} 13 capital, 2 actions` ``;
    - `boardOf(N)` contains `development: a face-down card`.
  - P with N at 3 capital. Divest, buy, then on N's tab press `COME_CLEAN_L` and pick the Search Engine. Then:
    - `lineOf(N)` starts `` `${N} 0 capital` ``, and `lineOf(T)` `` `${T} 4 capital` ``;
    - the Search Engine's badge is `requires legacy`.

    Press `DECLINE_COME_CLEAN_L`: `` tab(`${S} — to act`) `` is selected.
  - **How the numbers come** (§6, §7.E, §17.B.3, §20.C, ruling 25, R1, R2, R3):
    - §7.E and R1: the seller and each Partner who lost the Tag and has a Face-Down project is asked, in turn from the seller's left, the seller last. One whose project doesn't need the Tag is asked all the same, and stays hidden.
    - §20.C: the Tech Blog provides Platform, which the Search Engine and the Server Farm require; the To-Do List requires nothing.
    - §7 and §6: no rival has the Blue room for the Tech Blog in F, so it fire-sells for 3: 7 + 3 = 10. A Divest is 1 action: 3 − 1 = 2.
    - §7.E: free after a Fire Sale, with Legacy Status (R3: until the card moves, so a Pivot ends it).
    - P: T buys at $6: T 7 − 6 = 1, S 7 + 6 = 13. The Come Clean costs the $3 License to the new owner. N's $2 is short (R2's spare capital is the cash of a player who owes nothing); at $3, N pays T: 0 and 4.
- [ ] **Step 2: Run** `bunx vitest run src/pages/designer/playtest-fitted.test.tsx`. Expected: PASS. If a test fails, stop and report it: it is a page gap.
- [ ] **Step 3: Run** `bunx vitest run src/pages src/engine src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 4: Commit**

```bash
git add src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(designer): the Come Clean, free and paid, is played through the seat tabs, the sold product and the sale beneath it written out, Legacy Status badged until its card moves, and no hidden project named to another seat

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 6: Levels nested through Startup's tabs

Before starting: re-check 10-2 Task 5 example 6 and its numbers; the labels; Tasks 4–5's helpers.

**Files:**
- Test (append): `src/pages/designer/playtest-fitted.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–5. Produces no page code (Calls 1–5).

- [ ] **Step 1: Write the tests.** `describe('levels nested through the seat tabs')`, with `T`, `tab` and `boardOf` local.
  - **Arrangement X** (10-2 Task 5 example 6, plus a Face-Down To-Do List of S's that needs no Tag): `setUp7()` with:
    - S at 1 capital, a Smart Lock in `operations-${S}`, and S's Junior Software Dev in `ops-team-${S}`;
    - `tokenOf(…, S, 0)` held by N on no card;
    - a Dating App in `operations-${N}`;
    - T's Junior Hardware Eng in `ops-team-${T}`;
    - a Neobank, then a To-Do List, in `development-${S}`, each laid face down;
    - a Planetary Wi-Fi in `development-${N}`, laid face down.
  - Mount X. At every step below, the selected tab is `` `${turn.current} — to act` ``; pin each status as `seatStatus` writes it.
    1. Press `End your actions`. On N's tab press `PASS_AUDIT_L`. On T's tab press `AUDIT_L` and pick `` `a face-down card (${S}'s development, card 1)` ``. On N's tab press `PASS_BID_L`. Then:
       - S's tab is selected, in `reckoning`;
       - `lineOf(T)` contains `the whistleblower`;
       - `beneathText()` is null.
    2. Press `FOLD_L` and pick the Neobank. Then:
       - S's tab is selected, in `liquidation`;
       - `lineOf(S)` contains `bankrupt` and `` `owes 4 to ${T}, then 1 to the bank` ``;
       - no seat is `the whistleblower`.
    3. Press `LIQUIDATE_L` and pick the Smart Lock. Then:
       - T's tab is selected;
       - `waitingText()` is `` `${S} wants to liquidate a card in their operations: Smart Lock.` ``;
       - `underTexts()` is `[]` and `beneathText()` is null: an action over a kept turn is today's shape.
    4. Press `BUY_L` and pick `` `Smart Lock (${S}'s operations, sale price 6)` ``. Then:
       - N's tab is selected;
       - `waitingText()` is `` `${T} wants to buy a card in another player's operations: Smart Lock.` ``;
       - `underTexts()` is `` [`beneath: ${S} wants to liquidate a card in their operations: Smart Lock.`] ``;
       - `beneathText()` is `` `3 levels open over ${S}'s turn (audit).` ``;
       - `lineOf(T)` starts `` `${T} 1 capital` ``.
       - **Leak:** `wholePage()` contains no `To-Do List`. Click T's tab: it contains neither `To-Do List` nor `Planetary Wi-Fi`. Click N's tab.
    5. Press `COME_CLEAN_L` and pick the Planetary Wi-Fi. Then:
       - N's tab is selected, in `reckoning`;
       - `table!.decor![wifi].badge` is `caught, also requires legacy`;
       - `beneathText()` is `` `4 levels open over ${S}'s turn (audit).` ``;
       - `lineOf(N)` starts `` `${N} 4 capital` ``, and `lineOf(T)` `` `${T} 4 capital` ``;
       - `valuesOf(N)` contains `Cover 7` and `Spare capital 4`;
       - `SETTLE_L` is greyed: pin the reason as the view gives it (no one provides Cloud).
       - **Review Focus: Undo at depth.** Press `FOLD_L`: the Planetary Wi-Fi is ringed `choice`. Press `Undo`. Then:
         - N's tab is selected, in `come clean`, with no `Pick cards` group and no decor `ring`;
         - the Planetary Wi-Fi's badge starts with `face down`;
         - `beneathText()` says `3 levels`, and `lineOf(T)` starts `` `${T} 1 capital` ``.

         Come clean again.
    6. Press `FOLD_L` and pick the Planetary Wi-Fi. Then:
       - N's tab is selected, in `liquidation`;
       - `lineOf(N)` contains `bankrupt` and `owes 5 to the bank`;
       - `lineOf(S)` still contains `bankrupt` and `` `owes 4 to ${T}, then 1 to the bank` ``;
       - `boardOf(S)` contains `equity: Equity; Equity; Equity`;
       - `beneathText()` says `4 levels`.
       - **Review Focus: Undo at depth.** Press `LIQUIDATE_L` (the Dating App ringed), then `Undo`. Then:
         - the `reckoning` status is back, with no `Pick cards` group;
         - `lineOf(N)` has no `bankrupt`;
         - the badge is `caught, also requires legacy`.

         Fold again.
    7. Press `LIQUIDATE_L` and pick the Dating App. No market sale opens (R2: S has $7 but only $2 to spare; T has $4). Then:
       - N's tab is still selected, now in `come clean`, and no waiting line names the Dating App;
       - `lineOf(N)` starts `` `${N} 2 capital` `` and has neither `owes` nor `bankrupt`;
       - `beneathText()` says `3 levels`.
    8. Press `DECLINE_COME_CLEAN_L`. Then:
       - S's tab is selected, in `come clean` (the seller, asked last);
       - `valuesOf(S)` contains `Spare capital 2`;
       - `COME_CLEAN_L` is greyed (no card may be picked: the $3 License is more than S may spend). Pin its `title` as the view gives it;
       - **Leak:** click N's and T's tabs; neither `wholePage()` contains `To-Do List`. Click S's tab.
    9. Press `DECLINE_COME_CLEAN_L`. Then:
       - T's tab is selected, in `declaration` (the Audit offer starts again for the To-Do List; N's $2 is short of a bid);
       - no `waiting-under` or `beneath` test id is there;
       - `lineOf(S)` starts `` `${S} 2 capital` `` and has neither `owes` nor `bankrupt`;
       - `lineOf(T)` starts `` `${T} 8 capital` ``.
    10. Press `PASS_AUDIT_L`. N's tab is selected, with N's own turn. Pin its status as given.
  - **How the numbers come** (§7.A–E, §7 Liquidation, §7 Bankruptcy, §17.B.3, §17.C.3, §20.C, rulings 25, R1–R3):
    - §7.C: S's Fold owes $4 to T, the Whistleblower, and $1: 1 − 5 is −4, Bankrupt. The flag is cleared, so N's later Fold owes all $5 to the bank (§7.E).
    - §7 and §20.C: the Smart Lock is Tier 1 IoT, M&A $6, Red maintenance 1. N has no Red room, so only T is asked: T 7 − 6 = 1, and S 1 + 6 = 7.
    - R1: N holds S's token and lost IoT, so N is asked; so is S, the seller with a Face-Down project, asked last.
    - §7.E: N pays T the $3 License: N 4, T 4. The Planetary Wi-Fi requires Cloud, then IoT; IoT is excused, Cloud is nowhere N reaches: caught.
    - N's cover is 4 + 3 = 7. N's Fold: 4 − 5 is −1, Bankrupt, and N's token of S goes back to S (§7 Bankruptcy step 1).
    - R2: the Dating App ($6) is offered to no one, since T has $4 and S has $7 but owes $5. The bank pays 3: 7, then $5 to the bank: 2.
    - S's spare capital is 7 − 5 = 2, short of the $3 License. Then S pays 4 to T (4 + 4 = 8) and 1 to the bank: 2.
- [ ] **Step 2: Run** `bunx vitest run src/pages/designer/playtest-fitted.test.tsx`. Expected: PASS. If a test fails, stop and report it: it is a page gap.
- [ ] **Step 3: Run** `bunx vitest run src/pages src/engine src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 4: Commit**

```bash
git add src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(designer): a second Bankruptcy inside the first's sale is played through the seat tabs, each level written out and gone back to in order, and Undo at depth leaves no picker or ring behind

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 7: The browser check with the Hearts demo, the README and the final checks

**Files:**
- Modify: `README.md`
- Browser scripts and screenshots go only in `SCRATCH=/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-10-3`.

**Interfaces:** Consumes Tasks 1–6. Produces nothing new.

- [ ] **Step 1: The probe.** Write `$SCRATCH/probe.ts` and run it with `bun`. It edits a copy of `src/games/startup-simulator.rules`:
  - it removes `  The start player is chosen at random.`, so p0 starts;
  - it adds this block right after `  3 new Equity cards go to each equity, each naming its owner as its founder.`, before Setup's deal:

```text
  Move the whistleblower protection act from the event deck to the box.
  Move the whistleblower protection act from the box to the event deck.
  Move the planetary wi-fi from the growth deck to p0's backlog.
  Move the dating app from the seed deck to p0's operations.
  Move the junior software dev from p0's bench to p0's ops team.
  Move the equity from p2's equity to p0's portfolio.
  Move the server farm from the growth deck to p1's operations.
  Move the mobile wallet from the seed deck to p1's operations.
  Move the junior software dev from p1's bench to p1's ops team.
  Move the junior hardware eng from p1's bench to p1's ops team.
  A new Junior Hardware Eng goes to p1's ops team.
  A new Junior Hardware Eng goes to p1's ops team.
  Move the smart lock from the seed deck to p2's operations.
  Move the junior hardware eng from p2's bench to p2's ops team.
  Move the neobank from the growth deck to p2's backlog.
  Move the to-do list from the seed deck to p2's backlog.
```

  - **At each of seeds 1 to 10,** on a 3-player engine:
    - the edited rules compile with no diagnostics;
    - every card named above is where its line puts it, and p0's portfolio holds an Equity whose founder is p2;
    - p0 is to act in `actions`, with the Whistleblower Protection Act in play.
  - **The probe then plays the script below headless.** Each press is found by its label in the presser's `seatExtras(…).actions`, and each pick by its name in that view.
    - Wherever Income asks, it presses `Pay salaries`. Wherever the event check asks, it presses `Confirm your consultants`. Wherever a greenlight asks a question, it answers with the first option.
    - After each press it checks the phase and the seat to act in the last column. At 4, 5 and 6 it also checks `framesOf(state).length`: 3, 4, 4. At 6 it checks `billsOf` for p2 (`[4 to p1, 1 to the bank]`) and p0 (`[5 to the bank]`).
    - It prints every seat's capital after each press.
    - `N0` is the least number of `Recruit a junior software dev` presses (0–2) that leaves p0 with 3 to 7 capital at the end of its actions. `N2` is the least (0–3) that leaves p2 under 5. The probe prints both.

| # | Seat | Press and pick | Then |
| --- | --- | --- | --- |
| 1 | p0 | `GREENLIGHT_FD_L`: Planetary Wi-Fi; `ASSIGN`: Junior Hardware Eng, confirm, Planetary Wi-Fi; `N0` recruits; `End your actions` | declaration, p1 |
| 2 | p1, p2 | `PASS_AUDIT_L` each; then p1 presses `End your actions` | actions, p2 |
| 3 | p2 | `GREENLIGHT_FD_L`: Neobank; again: To-Do List; `N2` recruits; `End your actions` if still offered. p0 `PASS_AUDIT_L`; p1 `AUDIT_L`: a face-down card (p2's development, card 1); p0 `PASS_BID_L` | reckoning, p2 |
| 4 | p2 | `FOLD_L`: Neobank; `LIQUIDATE_L`: Smart Lock; p1 `BUY_L`: Smart Lock (p2's operations, sale price 6) | come clean, p0 |
| 5 | p0 | `COME_CLEAN_L`: Planetary Wi-Fi | reckoning, p0 |
| 6 | p0 | `FOLD_L`: Planetary Wi-Fi | liquidation, p0 |
| 7 | p0 | `LIQUIDATE_L`: Dating App; `DECLINE_COME_CLEAN_L` | come clean, p2 |
| 8 | p2 | `DECLINE_COME_CLEAN_L` | declaration, p1 |
| 9 | p1 | `PASS_AUDIT_L` | p0's turn |

  If a check fails at any seed, stop and report it with the seed, the press and the state's turn: a zone or card named otherwise, a step that stops for a press not listed, or a seat asked that the table doesn't list.
- [ ] **Step 2: The browser check.** Copy 9-3's `$SCRATCH/../browser-9-3/check.cjs` helpers: `at()`, `rowCard()`, `STRIP`, `BOARD`, `hover`, `click`, the launch, the error collection, `waitFor`, `press`, `pressIn`, `group`, `line`, and its Hearts session.
  - **Setup.**
    - Regenerate `zones.json` for each seat from `fittedLayout(game.zones, viewer, seats)` on the probe's rules. Work out a hanging card's place with `stackOnHolders`, as the page does.
    - Run the dev server on 5173 with `--strictPort`, polled with `curl -sf`.
    - Use Chromium with `['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']` and a viewport of `1600 × 3200`.
    - Expect no `pageerror` and no console error.
    - Load the Startup Simulator sample, fill `Rules` with the probe's text at seed 1, choose `3` and press `Play`.
    - Answer Income, the event check and a greenlight's question as the probe does. A turn that stops anywhere else: stop and report it with a screenshot.
  - **Session A: the probe's script, through the tabs.** Each screenshot must show what is listed after it. Capitals are as the probe prints them.
    1. **`01-staffed.png`** (after row 1's assign, p0's tab): the Planetary Wi-Fi labelled `face down`, the Junior Hardware Eng hanging under it with its strip clear.
    2. **`02-reckoning.png`** (row 3's end, p2's tab):
       - the status reads the reckoning Hint;
       - the Neobank is labelled `caught`;
       - p1's line contains `the whistleblower`;
       - `values-p2` contains `Cover` and `Spare capital`.
    3. **`03-liquidation.png`** (after `FOLD_L`):
       - p2's line contains `bankrupt`, `liquidating` and `owes 4 to p1, then 1 to the bank`;
       - there is no `beneath` line.
    4. **`04-market-sale.png`** (after `LIQUIDATE_L`, p1's tab):
       - the waiting line reads `p2 wants to liquidate a card in their operations: Smart Lock.`, in p2's colour;
       - p2's line contains `the seller`;
       - p1's `BUY_L` picker lists `Smart Lock (p2's operations, sale price 6)`, live.
    5. **`05-come-clean.png`** (row 4's end, p0's tab):
       - the waiting line reads `p1 wants to buy a card in another player's operations: Smart Lock.`;
       - under it is `beneath: p2 wants to liquidate a card in their operations: Smart Lock.`, then `3 levels open over p2's turn (audit).`;
       - p0's `COME_CLEAN_L` picker lists `Planetary Wi-Fi`, live;
       - the page's text has no `To-Do List`.
    6. **`06-caught.png`** (row 5):
       - the Planetary Wi-Fi is labelled `caught, also requires legacy`, with the Junior hanging under it;
       - the levels line reads `4 levels open over p2's turn (audit).`
    7. **`07-two-bankrupt.png`** (row 6):
       - p0's and p2's lines each contain `bankrupt`, p0's with `owes 5 to the bank`;
       - `board-p2` contains `equity: Equity; Equity; Equity`.
    8. **`08-seller-asked.png`** (row 7's end, p2's tab):
       - the status reads the come clean Hint, and `values-p2` contains `Spare capital`;
       - p0's line has no `owes`;
       - the levels line reads `3 levels …`.

       Click p0's and p1's tabs: neither page's text contains `To-Do List`. Click p2's tab.
    9. **`09-resumed.png`** (row 8, p1's tab):
       - the status reads the declaration Hint;
       - there is no `waiting-under` or `beneath` line;
       - no line says `bankrupt` or `owes`.

       Then row 9: the turn moves on to p0's.
  - **Session B.**
    10. **`10-color-match.png`:** Color Match at 3. Three panels as before, with no `waiting-under`, `beneath` or `values-` line and no `owes`.
    11. **The Hearts demo at `/`** (9-3's session):
        - a click on a card leaves the hint ending `(0/3)`;
        - drag a card to the pass area, then take **`11-hearts-moving.png`** 60 ms after the drop and **`12-hearts-rest.png`** 600 ms after it;
        - the hint ends `(1/3)`;
        - the first shows the card on its way or at its place, the second at its place in the pass area, the hands whole.
  - **Afterwards.**
    - Open every PNG (Read) and check it against its list.
    - Judge whether `caught, also requires legacy` reads in the Planetary Wi-Fi's strip above the hanging Junior, and whether each line under the status reads apart from the next. Report one that is covered or unreadable (G4).
    - Stop the dev server.
  - **How the numbers come:**
    - §5 Phase A: each turn's Income pays the products' revenue (§20.C: Dating App 1; Server Farm 7 and Mobile Wallet 2; Smart Lock 2). §6: a University recruit costs $2 and an action.
    - So `N0` and `N2` bring p0 into $3–7 (it can pay the $3 License, and the Fold still bankrupts it) and p2 under $5 (its Fold bankrupts it).
    - §7.A–E, §7 Bankruptcy and R1–R2 then run as Task 6: the Fold's $4 to p1 and $1 to the bank; the Smart Lock to p1 at $6; p0's $3 License to p1; p0's whole $5 to the bank; p0's token of p2 back to p2; the Dating App to the bank for $3.
    - §20.C maintenance: p0 and p2 have no Red room for the Smart Lock; p1's three Junior Hardware Engs cover the Server Farm's 2 and the Smart Lock's 1. No one has the Blue room for the Dating App.
- [ ] **Step 3: Update the README.**
  - **Plan 10-1's levels paragraph.** Add an `In the playtest` bullet before its Startup bullet:
    - the action waiting, then each beneath it, nearest first (`beneath: …`);
    - once levels nest, how many are open over whose turn (`3 levels open over p0's turn (working).`);
    - what a player owes on their entry (`owes 4 to p2, then 1 to the bank`);
    - a value a button compares with a number, shown alone under the player's gauges when it reads only what everyone is told (`Leeway 4`).
  - **"A table too big for one screen", `The other seats`.** Add: each player's values shown alone, under their gauges.
  - **The Startup paragraph** ("Startup Simulator (the whole rulebook)"). Add the page:
    - the reckoning and the liquidation in the deciding seat's strip;
    - Come Clean offers naming the sold product and the sale beneath;
    - `bankrupt`, `liquidating` and what is owed on the tableau;
    - Cover and Spare capital under each player's gauges;
    - Legacy Status as a badge;
    - the nested chain checked in a browser.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests. Then run these checks over `BASE..HEAD`. Each must print nothing, except where noted.

```bash
# Startup Simulator's words in shared code, slices 3–10, tests included
git diff "$BASE" -- src/engine src/pages src/utils ':!src/pages/designer/designer-page.test.tsx' ':!src/pages/designer/playtest-fitted.test.tsx' \
  ':!src/pages/designer/tableaux.test.ts' ':!src/pages/designer/samples.ts' | grep '^+[^+]' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share|tags?|leads?|leading|licen[cs]es?|tiers?|stall(s|ed|ing)?|sectors?|expertise|modes?|bandwidths?|bugs?|qa|online|offline|maint(enance)?|suppl(y|ies)|demands?|xp|pending|skills?|badged|ranks?|mentor(s|ed|ing)?|synerg(y|ies)|agile|graduat(e|es|ed|ing|ion)|training|trained|brainstorm(s|ed|ing)?|strateg(y|ies)|milestones?|seniors?|workaholics?|clean coders?|visionar(y|ies)|toxic|burnouts?|flight risks?|techcrunch|design sprints?|cease|desist|hype|utilit(y|ies)|buffs?|debuffs?|venture capital|bubbles?|patents?|trolls?|angels?|investors?|legacy|regulations?|audits?|open source|hackathons?|chip shortage|crunch|server crash|logjam|frenz(y|ies)|interns?|headhunt(s|ed|ing|ers?)?|course boom|whistleblowers?|trade show|events?|equit(y|ies)|founders?|consultants?|dividends?|veto(es|ed|ing)?|partners?(hips?)?|immunit(y|ies)|portfolios?|buybacks?|stocks?|poach(es|ed|ing|ers?)?|vest(s|ed|ing)?|ctos?|acqui(re|res|red|ring|sitions?)|fire sales?|hit pieces?|scandals?|integrat(e|es|ed|ing|ions?)|hosts?|host(ed|ing)|clients?|cris(is|es)|m&a|divest(s|ed|ing|ments?)?|raiders?|market sales?|counter-offers?|stealth|audit(ed|ing|ors?)?|fold(s|ed|ing)?|settle(s|d|ments?|ing)?|ghosts?|bluff(s|ed|ing)?|disclos(e|es|ed|ing|ures?)|shield(s|ed|ing)?|dependenc(y|ies)|legality|fraud(s|ulent)?|bount(y|ies)|secured|transient|bankrupt(cy|s)?|liquidat(e|es|ed|ing|ions?)|broken chains?|creditors?|insolven(t|cy)|come clean|seiz(e|es|ed|ing|ures?)|vulnerab(le|ility))\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# the rules are unchanged
git diff --stat "$BASE" -- src/games/startup-simulator.rules
# existing test lines removed or changed: only the named classes
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
```

  - The first check may print a line naming the net layer's `ClientView` or `ClientChannel`; list it, since it is not the game's word. Like 9-3's, it leaves out `badges?`.
  - The last check prints only the lines Tasks 1 and 3 named, as their reports list them.
  - Also read the `+` lines of `src/engine`, `src/pages` and `src/utils` for "chain", "forgive", "seller", "spare" or "cover" used of anything but 10-1's fixtures or an ordinary word, and for `Creditor`.
- [ ] **Step 5: Run the four games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo src/engine/pixi src/engine/input` passes, and Rent Day still has 108 examples.
- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -F - <<'EOF'
docs: levels written out on the page, what players owe, values shown alone, and slice 10 played through the seat tabs, its nested chain checked in a browser with the Hearts demo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Gaps

- **G1. The Settlement is still not a number before pressing** (9-3's G1).
  - Its lines count the `in reach` products in every player's operations, beyond the card. So neither 8-3's press prices nor any card-only stand-in may carry it.
  - The owner now sees their cover (`Cover 7`, Task 3) and Settle greyed with `their cover is at least the card's settlement`. The reckoning's Hint gives the Settlement's make-up, and the page asks whom each License goes to.
  - **Recommendation** (as 9-3's): a language plan that admits a worked number whose lines read only rows every seat sees, for a card whose face they all see, and then a guard price beside 8-3's for `Only if their {playervalue} is at least the card's {attribute}`.
- **G2. The Fire Sale price is not shown before a liquidation or a Divest.**
  - `They get its fire sale price.` is a gain, not a press price: 8-3 reads only what a press pays. Adding it would rename every Divest picker entry that 8-3's tests pick by name.
  - The hover line gives each product's `sale price` (8-3), the Hint says the Fire Sale pays half, and a $0 product is greyed with its reason. Parked.
- **G3. Kept turns between waiting actions are not listed one by one.** The status names the top one, the lines name each action, and `beneath` counts the levels and names the turn under them all. A breadcrumb of every level would need a view of each kept turn. Parked.
- **G4. A long Legacy badge in a strip.** `caught, also requires legacy` breaks into several lines in the corner (4-3's rule), and a card hanging under the project may cover the lower ones. The hover line names it in full (6-3). The browser check judges it and reports; the label is the rules' flag name, which this plan doesn't change.
- **G5. `beneath` follows the layout of the levels.** It is in the view only while `lang:nest` holds them, so a single interrupt, a single action, or an action over a kept turn shows as before. That keeps every earlier view byte-for-byte, at the cost of the line appearing only once levels nest. Recorded.
- **G6. Superseded forward notes.** 8-3's "a bankrupt seat is never asked" gives way to R2 (asked when spare capital covers the price). 9-3's "a bankrupt seat's projects leave with it" doesn't arise (no seat goes out). The page follows the view in both.
- **G7. Existing test lines change in two named classes:** Task 1's whole-extras pins of nested states gain `beneath`; Task 3's `shownPlayerValues` pin and any whole-view pin of Startup's `playerValues` gain `spare capital` and `cover`. Each is listed in its task's report, and Task 7's check prints exactly them.
