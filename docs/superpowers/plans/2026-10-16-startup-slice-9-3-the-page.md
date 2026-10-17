# Startup Simulator Slice 9-3 (The page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The playtest page shows slice 9:
- a Face-Down project is drawn face up on its owner's canvas and marked `face down` there and on the owner's Board line;
- rivals see it as `a face-down card` with its staff as they are, and nothing worked out from it;
- the cards a Face-Down Greenlight renames appear in place on every canvas, with no stale sprite, ring, label or hover line;
- a card lying face down is told apart by its place (`p0's development, card 2`) in pickers and in the waiting line, never by its name;
- the Audit offer, the bid, the verdict, Fold and Settle are played through the seat tabs;
- Voluntary Disclosure, the Face-Down Launch and the Stealth Bonus show on the page.

**Architecture:**
- **This is plan 9-3, the page,** after plans 9-1 (language) and 9-2 (rules and long runs). It takes plans 4-3 to 9-2 as given (see "Assumed from earlier plans").
  - It changes no rules text, no phrase and no example.
  - What the page needs and those plans don't provide is listed under "Gaps".
- **Six tasks:**
  1. where a card lying face down lies, in words: pickers and the waiting line (core and page);
  2. the owner's mark: a label and a word (page);
  3. cards that come under new ids: placed at once, nothing stale (Pixi, page);
  4. a Face-Down project's life on Startup's tabs: greenlit, staffed, seen by rivals, disclosed, launched for the Stealth Bonus;
  5. the Audit through Startup's tabs: the offer, the bid, the verdict, Fold and Settle;
  6. the browser check with the Hearts demo, the README and the final checks.
- **Nothing in shared code knows Startup Simulator.**
  - Core: `zones.ts` gains `rowPlaceOf`; `board-view.ts`'s `WaitingView` gains `places`.
  - Pixi: `pixi-table.ts` places a sprite the moment it makes it.
  - Page: `card-pick.ts`'s `placesOf` and `seat-status.ts`'s `waitingLine` say where a face-down card lies; `board-text.ts` gains `withFaceDown` and `boardText`'s `faceDown`; `tableaux.tsx` and `playtest.tsx` pass `SeatExtras.faceDown` on.
  - A new general test file, `src/pages/designer/playtest-face-down.test.tsx`, plays 9-1's fixtures (`VEIL_GAME`, `SLIP_GAME`, `INSPECT_GAME`) on a table that fits.
- **Calls this plan makes** (the spec leaves "how hidden projects look" to the builder):
  1. **A card lying face down is told apart by its place, never by its name.**
     - Its place is its zone as `zoneNameOf` names it, then `, card {n}`. `n` counts from 1 the zone's cards that sit on no card, in slot order: the order the Board line lists them in. Example: `p0's development, card 2`.
     - Pickers carry it through 6-3's `placesOf`: `a face-down card (p0's development, card 2)`. The waiting line carries it through `WaitingView.places`: `…: a face-down card (p0's development, card 2).`
     - So a bidder knows which project is audited, and a declarer picks one of two.
     - Only a card that lies face down in a zone everyone can see gets one. A card in a zone only its owner sees keeps 6-3's `p1's stash` and 7-3's bare `a face-down card`, and their pins stand.
     - The slot is public: every seat's scene already shows a back at that slot (R1 renames ids, not slots).
  2. **The owner's mark is a label and a word, from `SeatExtras.faceDown`.**
     - On the owner's canvas, `face down` comes first in the card's label (4-3's corner badge, which shows in a stack's strip). 6-3's hover line repeats it (` — face down`).
     - On the owner's Board line, `face down` comes first in the card's round brackets: `Search Engine (face down, …)`.
     - No new decor kind. The face stays bright: 4-3's `dim` says a value is off, which a Face-Down project is not.
  3. **A rival sees the back as words.** A fitted table draws only the viewer's own zones (4-1, 7-3), so a rival's canvas never draws another seat's development.
     - The back is the rival's Board line: `development: a face-down card with Junior PM`. Its staff read as they are (R3), from `cardLabel` and the cards on it.
     - For an Investor whose Consultant sits on it, the token's caption reads `on a face-down card` / `in p0's development` (7-3's `sitsOnCaptions`).
     - On a table that draws every seat (a game that fits), the back stands in its row with `data: {}`, and its staff stand in their own row, since only a fitted table hangs cards under cards.
     - No new code: Tasks 2 and 4 pin it.
  4. **Renamed cards appear in place, on every canvas.**
     - The page never pairs an old id with a new one: `lang:renamed` never reaches a seat. So after a Face-Down Greenlight nothing slides and nothing flips, for the owner too: the backlog is redrawn, and the project appears in development.
     - Hence no rival's canvas can tell which backlog card left (R1).
     - The old sprites go with their ids. A sprite `setScene` makes is placed before `setScene` returns, so no frame shows it at the origin.
     - Rings, labels and the hover line are read from the latest view only (3-2's rule), so none outlasts the ids it named.
  5. **The offer, the bid, the verdict, Fold and Settle need no page code beyond Call 1.**
     - The offer (`declaration`) is 5-1's interrupt, so the status names its phase, and the tabs follow `turn.current`.
     - The bid (`bidding`) is 8-1's ask, written out by 7-3's waiting line. `Raise` takes Rent Day's amount box.
     - `caught`, `passed over` and `in reach` are 4-3's labels of kept flags. `under audit`, `invited` and `the whistleblower` are player flags on the tableau line, and `high bid` is on the bank line.
     - Tasks 1 and 5 pin each.
  6. **The Stealth Bonus is the tableau line's counter,** `5 stealth bonus`, as 9-2 declares it: one counter of points, scored at face value (§12.7). It is not split into +5 and +10 markers (G3).
  7. **`in reach` and `passed over` are labelled like every kept flag** while the Audit window lasts (G2).
- **Parked:** the Settlement as a number before pressing (G1); the ordinal in `sitsOn` (G4).

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19, PixiJS 8; Playwright (global install, Chromium in `/opt/pw-browsers`) for the browser check.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-9-stealth-audits-design.md` is binding, above all "The page" and its builder-check rulings:
- "A Face-Down project shows a card back with its staff; its owner sees it face up";
- "The Audit window and the bidding appear in the deciding player's strip; the result shows on the table";
- "Stealth Bonus markers join the owner's tableau";
- R1 (no id follows a Face-Down card), R3 (rivals see each staff card as it is and nothing worked out from the hidden card: no Pending Badge, Stalled, need, cut or Feature complete, and no card name in any prompt, verdict reason or tableau line), R4 (the offer restarts after each verdict).

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding. Its anti-goals bind here: hidden information leaking above all, and Startup words in shared code. Its constraint: face-down cards reach `derive-scene.ts`, which the Hearts demo uses, so the Hearts demo gets a no-regression check. "Designers never see engine words" and the seat switcher that "jumps to the seat that must act next" bind too.

These are inputs, with their Global Constraints amendments:
- plans 7-3 and 8-3 (`…-7-3-the-page.md`, `…-8-3-the-page.md`): the models for this plan, with their waiting line, seat switcher and asks;
- plan 9-1 (`…-9-1-language.md`): its "Left to 9-3" and its recorded limit on the waiting line;
- plan 9-2 (`…-9-2-rules-and-runs.md`): its forward notes for 9-3;
- `builder-check-startup-9.md` in the session scratchpad: Q1 and Q3.

## Global Constraints

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.**
  - This plan adds no `state.data` key, no card `data` key and no move field.
  - The view gains one optional key, `WaitingView.places`, left out when it would hold no place (never `undefined`).
- **No Startup Simulator words in shared code** (code, comments, test names and shared test fixtures).
  - The banned list is plan 9-1's: plan 8-1's list (7-1's, 6-1's, 1b-2's and slices 3–8's words), plus slice 9's stealth, audit, fold, settle, ghost, bluff, whistleblower, disclose / disclosure, shield, dependency, legality, fraud, bounty, secured, transient, and greenlight, in every form. "Face down" and "face up" are ordinary card-game words and are allowed.
  - **Where they may appear:** `src/games/startup-simulator.*`; `src/pages/designer/designer-page.test.tsx`, `playtest-fitted.test.tsx` and `tableaux.test.ts`; `src/pages/designer/samples.ts`; `README.md`; `docs/`.
  - Shared code says "a card lying face down", "its place", "card 2", "renamed", "the players asked". Fixtures are 9-1's (`VEIL_GAME`, `SLIP_GAME`, `INSPECT_GAME`, `PEEK_GAME`) and earlier ones: workshop, stash, crew, slip, show, inspect, offer, bidding, raise, high bidder, caught, give up, patch up.
  - Page code may say "badge" for a card's corner label (5-3's rule), never for the game's Badge.
  - Ordinary words to avoid, beyond 8-3's ("waiting", not "pending"; never "host", "client", "supply", "veto" or "partner"): "come to rest", never "settle", in comments too; "give up", never "fold"; "inspect", never "audit".
- **Hearts, Color Match, Venom and Rent Day stay unchanged** (Rent Day keeps its 108 examples).
  - None has a row where cards may lie face down. So none gets a place with `card {n}`, a `places` key, a `face down` label or a renamed card.
  - The Hearts demo draws through `deriveScene` (9-1's change) and `PixiTable` (Task 3's change). Its tests pass unchanged, and Task 3 pins that it still animates by id.
- **Every number comes from the rulebook.** Each Startup test says where its numbers come from.
- **Hidden information** (overview anti-goal; 3-2's to 9-1's lessons):
  - What a seat's view shows is decided by the compiled rules alone, and never reveals a hidden card. A card lying face down is a hidden card: no rival's page contains its name, its counts, or a value worked out from it. That covers the canvas, labels, captions, Board lines, tableau lines, picker entries and their titles, the waiting line, the hover line and refusal reasons.
  - **Leak tests serialise a rival's whole page:** the panel's text and every `title` and `aria-label` in it, plus `JSON.stringify` of the canvas's `placement` and `decor`. They assert that no name, no count and no worked value of the face-down card is there.
  - A place names a card's zone and its position in its row, never the card.
  - The page adds no card to the waiting line, and pairs no old id with a new one.
- **A ring or picker never outlasts its view.** Everything this plan adds is derived from the latest view in the render that receives it, and adds no page state.
- **No measured `Text`.** A `Text`'s size is never measured under happy-dom. This plan adds no Pixi text: the mark is 4-3's badge, sized with `boldTextWidth`.
- **Earlier plans come first.**
  - In execution order: 4-1, 4-2 and the long-runs speed-up (built), 4-3, 5-1, 5-2a, 5-3 Task 1, 5-2b, 5-3 Tasks 2–4, 6-1, 6-3 Task 1, 6-2a, 6-2b, 6-3 Tasks 2–5, 7-1, 7-2a, 7-2b, 7-3, 8-1, 8-2a, 8-2b, 8-3, 9-1, 9-2, then this plan.
  - Their code is referred to by the names their Interfaces blocks give.
  - Each task re-checks the names it consumes at HEAD before starting, and stops and reports one that differs.
- **Files this plan changes outside page, Pixi and core code:**
  - `src/games/startup-simulator.test.ts`: only Task 1's named lines, if any;
  - `README.md`.
  - `src/games/startup-simulator.rules` does not change.
- **Existing tests.**
  - No existing test line changes, except this class, named by Task 1 and listed in its report: a pin of plans 9-1 or 9-2 that compares a seat's whole `waiting` view (`toEqual`) while a card lies face down in a row everyone can see. It gains `places`. At writing, that is 9-1 Task 7's `describe('an inspection, as each seat sees it')`, and 9-2 Task 2's view test if it compares the whole view.
  - New names are imported on new `import` lines.
  - If any other existing test fails, stop and report it.
- **The browser check** uses the pre-installed Chromium (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; never `playwright install`).
  - Its scripts and screenshots stay in `/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-9-3/`, never in the repo.
  - Its setup lines go where every seed sets up: right after `  3 new Equity cards go to each equity, each naming its owner as its founder.`, before Setup's deal, checked at seeds 1 to 10.
- **Page copy (exact):**
  - **The place of a card lying face down:** `{zone}, card {n}`, the zone as `zoneNameOf` names it: `p0's development, card 2`.
    - In a picker: `a face-down card (p0's development, card 2)`, aria-label `Pick a face-down card (p0's development, card 2)`.
    - In the waiting line: each such card reads `{name} ({place})`: `p1 wants to audit a card in another player's development: a face-down card (p0's development, card 2).`
  - **The owner's mark:**
    - the label: `face down`, or `face down, {the label it had}`;
    - the Board line: `face down` first in the round brackets: `Search Engine (face down)`, `Statue (face down, tired)`;
    - the hover line: 6-3's ` — {label}`, so ` — face down`.
  - **Everything else is earlier plans' copy:** 7-3's waiting line `{by} wants to {words}: {cards}.`; 4-3's labels; the tableau line's `5 stealth bonus`; the bank line's `high bid 3`.
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1, record `BASE=$(git rev-parse HEAD)`. Run `bun run test` once for the passing count and the long runs' time.
  - Task 1 adds `places` to every view the long runs read; if they take more than a third longer than at BASE, report the timing.
- **No new dependencies.**
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefix `feat(designer):` (`docs:` for Task 6).
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.
  - A test marked "(guard)" passes before its task's change, and says so.

## Review Focus

- **Two face-down projects of one owner, the second audited; then the first revealed, or the second given up.**
  - Expected: the picker lists `…, card 1` and `…, card 2` in slot order, and the waiting line places the audited one. A revealed card is named and greyed. After a give-up the one left is `card 1`. No rival's page names either.
  - Tests: Task 1 (general), Task 5 (Startup).
- **Undo across a Face-Down Greenlight while the owner hovers a backlog card, and with the picker's rings on.**
  - Expected: the old ids come back. No sprite, ring, label or hover line stays keyed to an id that has gone, either way.
  - Tests: Task 3 (general), Task 4 (Startup).
- **A rival's own Consultant on a Face-Down project, and a Junior PM with a Pending Badge on it.**
  - Expected: the Investor's caption and Board line name no card. The founder's canvas marks the project `face down` with the token hanging under it. No rival's page says `pending badge`.
  - Tests: Task 4.
- **Undo while the bid waits, and right after the verdict.**
  - Expected: the waiting line, the `caught` label, the high bid, the tabs and the owner's `face down` mark all follow the view back, and nothing is sent.
  - Tests: Task 5.
- **An Audit window nobody may use:** every rival short of $3, or a project a working CTO shields.
  - Expected: with no one able to audit, no tab moves to a rival's offer and no waiting line shows. A shielded project's entry is greyed with `no card on it is shielding`, which names no card.
  - Tests: Task 5.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name, not by line. If one is missing or differs, stop and report it.

- **HEAD (1b-3, 3-2):**
  - `pixi-table.ts`: `PixiTable.setScene`, `setDecor`, `advance`, `spriteCount`; `table-model.ts`: `TableModel.setScene`, `getRenderStates`, `CardRenderState`; `card-sprite.ts`: `applyRenderState`, `faceUpVisible`;
  - `derive-scene.ts`: `deriveScene`, `HIDDEN_FACE_KEY`; `layout.ts`: `computeZoneLayout`;
  - `zones.ts`: `zoneNameOf`, `zoneInfo`, `relocate`; `attach.ts`: `holderIdOf`, `putOn`;
  - `board-text.ts`: `cardLabel`, `boardText`, `boardCaptions`; `tableaux.tsx`: `Tableaux`, `tableauLine`; `board-controls.tsx`: `entryFor`, `bankLine`;
  - `seat-status.ts`: `seatStatus`, `seatToAct`; `playtest.tsx`: `decor`, `hovered`, `placed`, `closePicker`, `liveAt`;
  - `src/pages/hearts-demo/game.ts`: `createHeartsServer`; `cards.ts`: `TABLE`.
- **4-3 (built):** `CardDecor.dim`; `boardBadges(game, cards, worked?)`, `loneCounts`; the `playtest-fitted.test.tsx` helper `seatButtons`.
- **5-3 (built):** `keptBadges(game, cards)` and the decor merge `{ ...keptBadges(…), ...boardBadges(…) }`; 5-2a's worked flag `pending badge`; 5-3's clicking describe's `confirm`.
- **6-3 (built):** `placesOf(game, cards, seat)` and `CardPicker`'s `places`; the hover line `{cardDetail} — {label}`; decor for drawn cards only; `inPlay`, `inPlayLine`; the hover describe's `hover` and `detail`.
- **7-1 (built):** `WaitingView = { by; label; cards; choices }`, `waitingView`, `SeatExtras.waiting`.
- **7-3 (built):** `waitingLine(game, waiting)`, `<div data-testid="waiting">`; `sitsOn`, `sitsOnCaptions`; `fittedLayout(zones, viewer, seats)`, `drawnCards`; the `playtest-fitted.test.tsx` helpers `tokenOf`, `holding`, `setUp7` (`inPlay(setUp(), 'Whistleblower Protection Act')`), `waitingText`; `ASSIGN`, `VETO`, `LET_GO`; `$SCRATCH/../browser-7-3/check.cjs`.
- **8-1 (built):** the ask `Each other player has the {phase}, in turn from their left.`; `NEST_GAME`.
- **8-3 (built):** `pressPrices`, `pickNotes`, `PricesView`; the module-level `marked(state, id, facts)`; `inOrder`; `$SCRATCH/../browser-8-3/check.cjs` and its probe.
- **9-1 (built):**
  - `ZoneDef.faceDown`, `isRevealed`; `seenBy`, `seenByAll` (`zones.ts`); `SeatExtras.faceDown`, `readSeatExtras`;
  - `pickedAs` naming a card the seat can't see `a face-down card`; `BoardView.playerCards` likewise;
  - `RENAMED_KEY`, `dealtIdOf` (`cards.ts`);
  - the fixtures `VEIL_GAME`, `SLIP_GAME`, `INSPECT_GAME` (`testing.ts`).
- **9-2 (built):**
  - phases `audit`, `declaration`, `bidding`, and their Hints;
  - player flags `under audit`, `invited`, `the whistleblower`; card flags `passed over`, `caught`, `in reach`; worked `shielding`, `settlement`; the counter `stealth bonus`; game numbers `high bid`, `late license`;
  - in `startup-simulator.test.ts`: `GREENLIGHT_FACE_DOWN`, `AUDIT`, `PASS_THE_AUDIT`, `RAISE`, `PASS_THE_BID`, `FOLD`, `SETTLE`, `DISCLOSE`, `faceDownCards`.
- **Second-person labels used below.** Each task defines those it uses as module-level constants in its test file. Re-check each against the view; the compiler's `actionLabel` makes them:
  - Startup (`playtest-fitted.test.tsx`):
    - `GREENLIGHT_FD_L` = `Greenlight face down a card in your backlog`; `DISCLOSE_L` = `Disclose a card in your development`;
    - `AUDIT_L` = `Audit a card in another player's development`; `PASS_AUDIT_L` = `Pass the audit`;
    - `RAISE_L` = `Raise`, with its box `Raise amount` (Rent Day's `bid an amount` is `Bid` and `Bid amount`); `PASS_BID_L` = `Pass the bid`;
    - `FOLD_L` = `Fold a card in your development`; `SETTLE_L` = `Settle a card in your development`;
    - `LAUNCH_L` = `Launch a card from your development to your operations`;
    - 7-3's `ASSIGN`, `VETO`, `LET_GO`; `End your actions`.
  - General (`playtest-face-down.test.tsx`): `Slip a card in your stash`, `Show a card in your workshop`, `Hire some cards from the hall to a card in your workshop`, `Stop`, `Inspect a card in another player's workshop`, `Pass the offer`, `Raise` / `Raise amount`, `Pass the bid`.

---

### Task 1: Where a card lying face down lies, in words: pickers and the waiting line

Before starting: re-check `zoneNameOf`, `holderIdOf`, 7-1's `WaitingView` and `waitingView`, `readSeatExtras` and its `is…` helpers, 9-1's `seenBy`, 6-3's `placesOf` (with 7-3's `sitsOn` words after the place), 7-3's `waitingLine`, 9-1's `INSPECT_GAME`, `VEIL_GAME` and 8-1's `NEST_GAME`, and the page's amount box (3-2's auction tests).

**Files:**
- Modify: `src/engine/core/lang/zones.ts` (`rowPlaceOf`), `src/engine/core/lang/board-view.ts` (`WaitingView.places`, `waitingView`, `readSeatExtras`), `src/pages/designer/card-pick.ts` (`placesOf`), `src/pages/designer/seat-status.ts` (`waitingLine`)
- Create: `src/pages/designer/playtest-face-down.test.tsx`
- Test (append): `src/engine/core/lang/zones.test.ts`, `src/engine/core/lang/board-view.test.ts`, `src/pages/designer/card-pick.test.ts`, `src/pages/designer/seat-status.test.ts`

**Interfaces:**
- Consumes: the names above.
- Produces (for Tasks 2–6):

```ts
// zones.ts
/**
 * Where a card lies, for a seat that can't see its face, by its place alone: its zone as zoneNameOf names it, then `, card {n}`, n counting
 * from 1 the cards of that zone among `cards` that sit on no card, in slot order: the order a Board line lists them in.
 */
export function rowPlaceOf(game: CompiledGame, cards: readonly CardState[], card: CardState): string;
// board-view.ts — WaitingView gains, left out when every entry would be null:
places?: (string | null)[];   // one per entry of `cards`: rowPlaceOf for a card the seat doesn't see (!seenBy) in a zone everyone can see,
                              // null for any other. readSeatExtras accepts it when absent, or a list as long as `cards` of text or null.
// seat-status.ts — waitingLine: a card whose places entry is text reads `{name} ({place})`; every other line as before.
// card-pick.ts — placesOf: a card the seat sees as a back (faceKey HIDDEN_FACE_KEY) in a zone everyone can see has rowPlaceOf as its
//   place; every other place as before (a back in a zone only its owner sees keeps 6-3's `p1's stash`).
```

- **`playtest-face-down.test.tsx`** (new; it holds no Startup word). It mocks `@/components/PixiCanvas` as `playtest.test.tsx` does. Its `@/engine/react` mock keeps each seat's last props: `tables[rendered++ % 3] = p`, since seats render in seat order (`playtest.test.tsx`'s rule). Module-level:

```ts
const tables: CardTableProps[] = [];
/** The panel of `seat`: the element its status line sits in. */
const panelOf = (seat: string) => screen.getByText(new RegExp(`^seat: ${seat} `)).parentElement!;
/** `state` with the card `id` turned face down where it lies. */
const laidFaceDown = (state: GameState, id: string): GameState;
/** Everything a seat's page holds: its panel's text, every title and aria-label in it, and its canvas's placement and decor, as one string. */
const pageOf = (seat: string, index: number): string;
```

  - Each describe first asserts the seat mapping: `tables[0]`'s placement shows `stash-p0`'s cards face up, and `tables[1]`'s shows them as backs.

- [ ] **Step 1: Write the failing tests.**
  - **`zones.test.ts`,** `describe('rowPlaceOf')`:
    - On `CREW_GAME`, `workshop-p0` holds `a` (slot 0), `b` (slot 2) and `c` (slot 1), listed in that order, and `crew-p0` a Potter on `a`. `rowPlaceOf(game, cards, b)` is `p0's workshop, card 3`, and of `c` it is `p0's workshop, card 2`.
    - On `NEST_GAME`, `workshop-p0` holds `v` (slot 0), `s` on `v` (slot 1) and `w` (slot 2). `rowPlaceOf` of `w` is `p0's workshop, card 2`: a card on a card isn't counted.
  - **`board-view.test.ts`,** `describe('where a card lying face down lies, as a waiting action says it')`. A 3-player `INSPECT_GAME` engine. `workshop-p0` holds, in slots 0–2:
    - a Vase face up (`u`);
    - a Vase lying face down (`v`);
    - a Statue lying face down (`s`).

    p0 stops and p1 inspects `s`, so p2 is to bid. Then:
    - p1's and p2's `waiting` are `{ by: 'p1', label: <inspect's label>, cards: ['a face-down card'], choices: [], places: ["p0's workshop, card 3"] }`;
    - p0's is `{ by: 'p1', label: <the same>, cards: ['Statue'], choices: [] }`, with no `places` key;
    - `JSON.stringify` of p2's `waiting` holds no id;
    - **(guard)** 7-1's `OBJECT_GAME` swap from the stash (a zone only its owner sees) still gives `cards: ['a face-down card']` with no `places` key;
    - `readSeatExtras` takes back extras with `places: [null]` and with `places: ["p0's workshop, card 1"]`, and refuses `places: [1]` and a `places` longer than `cards`.
  - **`card-pick.test.ts`,** `describe('the place of a card lying face down')`. p1's scene of the table above, before p0 stops:
    - `placesOf(game, cards, 'p1')` gives `v` `p0's workshop, card 2`, `s` `p0's workshop, card 3`, and `u` `p0's workshop`;
    - **(guard)** 6-3's face-down copy in `stash-p1` is still `p1's stash`.
  - **`seat-status.test.ts`,** `describe('waitingLine with places')`. On `INSPECT_GAME`, with views made by hand:
    - `{ by: 'p1', label: inspect.label, cards: ['a face-down card'], choices: [], places: ["p0's workshop, card 3"] }` gives `p1 wants to inspect a card in another player's workshop: a face-down card (p0's workshop, card 3).`;
    - on `OBJECT_GAME` with its workshop row marked (assert the replace finds its text), `{ by: 'p0', label: hire.label, cards: ['Potter', 'a face-down card'], choices: [], places: [null, "p0's workshop, card 1"] }` gives `p0 wants to hire some cards from the hall to a card in their workshop: Potter to a face-down card (p0's workshop, card 1).`;
    - **(guard)** 7-3's `waitingLine` tests pass unchanged.
  - **`playtest-face-down.test.tsx`,** `describe('an inspection played through the panels')`. The arrangement: a 3-player `INSPECT_GAME` start, with the table above arranged by `relocate` and `laidFaceDown`, p0 to act. Mount it.
    - On p0's panel press `Stop`. Then:
      - p1's panel's status line is p1's turn, pinned as `seatStatus` writes it;
      - on p1's panel press `Inspect a card in another player's workshop`. The picker's buttons before Cancel are:
        - `Vase (p0's workshop)`, greyed with `title` `it is face down`;
        - `a face-down card (p0's workshop, card 2)`, live;
        - `a face-down card (p0's workshop, card 3)`, live.
    - Pick `a face-down card (p0's workshop, card 3)`. Then:
      - the waiting lines of p1 and p2 read `p1 wants to inspect a card in another player's workshop: a face-down card (p0's workshop, card 3).`, and p0's ends `: Statue.`;
      - p2's buttons are `Raise` (with its box) and `Pass the bid`;
      - `pageOf('p2', 2)` contains neither `Statue` nor `dents`.
    - **Review Focus: Undo.** Press `Undo`:
      - no panel has a `waiting` test id;
      - p1's status line is p1's turn again, and p1's panel has no `Pick cards` group.

      Inspect card 3 again.
    - On p2's panel press `Pass the bid`. Then:
      - p0's money line starts `p0 12 coins`, and p1's `p1 6 coins`;
      - no panel has a `waiting` test id.
    - **Review Focus: R4.** The offer starts again with p1. On p1's panel press `Inspect a card in another player's workshop`. The buttons before Cancel are:
      - `Vase (p0's workshop)` and `Statue (p0's workshop)`, each greyed with `title` `it is face down`;
      - `a face-down card (p0's workshop, card 2)`, live.
    - **How the numbers come:** 9-1's `INSPECT_GAME`: 9 coins each; the inspection opens the bid at 3. A Statue with no dents is not faulty, so the high bidder pays the high bid to its owner: 9 + 3 = 12 and 9 − 3 = 6.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/zones.test.ts src/engine/core/lang/board-view.test.ts src/pages/designer/card-pick.test.ts src/pages/designer/seat-status.test.ts src/pages/designer/playtest-face-down.test.tsx`. Expected: FAIL (`rowPlaceOf` and `places` are missing; the picker and the waiting line say `a face-down card` alone). The guards pass.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `WaitingView`.
- [ ] **Step 4: Run** `bunx vitest run src/engine src/pages src/games`, then `bun run test` and `bun run typecheck`.
  - A pin in the named class gains `places`. List each.
  - Report the long runs' time against BASE.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/zones.ts src/engine/core/lang/board-view.ts src/pages/designer/card-pick.ts src/pages/designer/seat-status.ts \
  src/engine/core/lang/zones.test.ts src/engine/core/lang/board-view.test.ts src/pages/designer/card-pick.test.ts \
  src/pages/designer/seat-status.test.ts src/pages/designer/playtest-face-down.test.tsx
# and each test file Step 4 changed, named in the report
git commit -F - <<'EOF'
feat(designer): a card lying face down is told apart by its place in its row, in the picker and in the waiting line, never by its name

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: The owner's mark: a label and a word

Before starting: re-check `boardText`'s parameters at HEAD (7-3's and 8-3's additions), its round brackets, 4-3's `boardBadges` and 5-3's decor merge, 6-3's decor for drawn cards and the hover line, `Tableaux`' props, `readSeatExtras`' `faceDown`, Task 1's test file helpers.

**Files:**
- Modify: `src/pages/designer/board-text.ts` (`withFaceDown`, `boardText`), `src/pages/designer/tableaux.tsx` (`faceDown`), `src/pages/designer/playtest.tsx` (the decor's badges, `Tableaux`' `faceDown`)
- Test (append): `src/pages/designer/board-text.test.ts`, `src/pages/designer/playtest-face-down.test.tsx`

**Interfaces:**
- Consumes: 9-1's `SeatExtras.faceDown`; 5-3's merge; Task 1's helpers.
- Produces (for Tasks 4–6):

```ts
// board-text.ts
/** `labels` with `face down` first on each id of `faceDown`: `face down`, or `face down, {its label}`. With no list, `labels` itself. */
export function withFaceDown(labels: { [cardId: string]: string }, faceDown: readonly string[] | undefined): { [cardId: string]: string };
// boardText gains a last optional parameter `faceDown?: readonly string[]`: a card whose id is in it has `face down` first in its round
// brackets (before its words and flags), and gets the brackets for it alone.
// tableaux.tsx — Tableaux gains faceDown?: string[], passed to boardText for every seat's line.
// playtest.tsx — the decor's badges are withFaceDown(<5-3's merge>, extras?.faceDown), each id among the drawn cards only;
//   Tableaux gets faceDown={extras?.faceDown}.
```

- [ ] **Step 1: Write the failing tests.**
  - **`board-text.test.ts`,** `describe('a card its owner alone sees face up')`.
    - The cards: a 3-player `VEIL_GAME` state where `workshop-p0` holds a Statue lying face down (`statue`) and `crew-p0` a tired Potter on it. Use `deriveScene` for p0 and for p1.
    - `boardText(game, p0Cards, 'p0', undefined, [statue])`'s `workshop:` part starts `workshop: Statue (face down` and ends `with Potter (tired)`. Pin it whole as it reads.
    - Without the last argument, it has no `face down`.
    - `boardText(game, p1Cards, 'p0', undefined, [])`'s part is `workshop: a face-down card with Potter (tired)` (R3: the staff as they are).
    - `withFaceDown({ s: 'tired' }, ['s', 't'])` is `{ s: 'face down, tired', t: 'face down' }`, and `withFaceDown(b, undefined)` is `b` itself.
  - **`playtest-face-down.test.tsx`,** `describe("the owner's mark, and what the others see")`. A 3-player `VEIL_GAME` start, `stash-p0` holding a Vase and a Statue, p0 to act. Mount.
    - On p0's panel press `Slip a card in your stash` and pick `Statue`. Then:
      - `tables[0].decor[statue].badge` is `face down`, and the Statue in `tables[0].placement` is face up with its name;
      - in `tables[1].placement` the Statue is `{ faceUp: false, faceKey: 'back', data: {} }` in `workshop-p0`, and `tables[1].decor` has no key `statue`;
      - **leak test:** `pageOf('p1', 1)` and `pageOf('p2', 2)` contain neither `Statue` nor `face down`.
    - On p0's panel, hire a Potter onto the Statue. `tables[1].placement`'s Potter is face up in `crew-p0`, named, with `lang:on` the Statue's id (R3).
    - On p0's panel press `Show a card in your workshop` and pick the Statue: no decor of `tables[0]` contains `face down`, and `tables[1].placement` names the Statue.
    - **(guard)** A Color Match page at 3 has no decor and no text containing `face down`.
- [ ] **Step 2: Run** `bunx vitest run src/pages/designer/board-text.test.ts src/pages/designer/playtest-face-down.test.tsx`. Expected: FAIL (`withFaceDown` is missing; no `face down` label). The rivals' checks and the Color Match guard pass already (9-1's view, `cardLabel`) and are guards.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/pages src/engine src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/pages/designer/board-text.ts src/pages/designer/tableaux.tsx src/pages/designer/playtest.tsx \
  src/pages/designer/board-text.test.ts src/pages/designer/playtest-face-down.test.tsx
git commit -F - <<'EOF'
feat(designer): a card its owner alone sees face up is labelled "face down" on the owner's canvas and Board line, while the others see a back with the cards on it as they are

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: Cards that come under new ids: placed at once, nothing stale

Before starting: re-check `PixiTable.setScene`, 8-3's `ZONE_Z`, `TableModel`'s new-card rule ("spawns new cards already at their layout target"), `CardSprite.applyRenderState` and `faceUpVisible`, the `pixi-table.test.ts` helpers (`faces`, `scene`, `madeBy`, `kids`), `createHeartsServer` and its `submit`, 9-1's `SLIP_GAME`, `VEIL_GAME` and `RENAMED_KEY`, `createEngine`, Task 1's test file helpers.

**Files:**
- Modify: `src/engine/pixi/pixi-table.ts` (`setScene`)
- Test (append): `src/engine/pixi/pixi-table.test.ts`, `src/pages/designer/playtest-face-down.test.tsx`

**Interfaces:**
- Consumes: `TableModel.getRenderStates`, `CardSprite.applyRenderState`; Tasks 1–2.
- Produces: `PixiTable.setScene` gives each sprite it makes its card's render state before it returns: its place, turn, z and the face it shows. Every other sprite is left to `advance`, as before. No new export.

- [ ] **Step 1: Write the failing tests.**
  - **`pixi-table.test.ts`,** `describe('cards that come under new ids')`. Use `madeBy()`, and a two-row scene helper local to the describe.
    - **Placed at once.** Set a scene whose row `r` holds `a`, `b` and `c` in slots 0–2, then one where `r` holds `d` and `e` in slots 0–1 and row `w` holds `f`. With no `advance` in between:
      - `spriteCount` is 3, and the sprites of `a`, `b` and `c` are destroyed;
      - each new sprite's `x`, `y` and `zIndex` are its target from `computeZoneLayout` (with the table model's `zoneIndex * ZONE_Z` z base, 8-3), and `faceUpVisible` matches its card's `faceUp`.
      - After `advance(0.016)` none of them has moved.
    - **Nothing stale.** With `setDecor({ a: { ring: 'chosen', badge: 'x' } })` before the change of scene:
      - no sprite left on the table has a `card-ring` or `card-badge` child;
      - after `setDecor({ d: { badge: 'face down' } })`, `d`'s sprite alone has a badge.
    - **(guard) A card that keeps its id still moves.** A card moved from `r` to `w` under the same id keeps its sprite object, and after `advance(0.016)` it stands strictly between its old place and its new target.
    - **Review Focus: no rival's canvas tells which card left.** A 3-player `SLIP_GAME` engine, with `stash-p0` holding a Vase, a Statue and a Vase (`relocate`), p0 to act. Take p1's scenes (`deriveScene(tableDef, { cards }, 'p1')`) before and after p0 slips the Statue, and set them on a table one after the other. Then:
      - no sprite's id is among the three old ids;
      - with no `advance`, every sprite of `stash-p0` and `workshop-p0` stands at its target.
      - **(guard, why R1 renames)** On `VEIL_GAME`, which renames nothing, the slipped card keeps its sprite, and after `advance(0.016)` it is still between its stash place and its workshop target. That slide is what would tell p1 which slot it left.
    - **(guard) The Hearts demo animates by id.** `createHeartsServer(42)`: p0 passes the first card of its hand (`server.submit('p0', { type: 'pass', cardId })`). Set p0's scenes before and after. The passed card's sprite is the same object, and after `advance(0.016)` it stands strictly between its hand place and its new target. The file's `draws Hearts with no ring and no caption` test passes unchanged.
  - **`playtest-face-down.test.tsx`,** `describe('cards renamed while the owner picks')`. A 3-player `SLIP_GAME` start, `stash-p0` holding `v1` (Vase), `s1` (Statue) and `v2` (Vase), p0 to act. Mount.
    - On p0's panel press `Slip a card in your stash`. `tables[0].decor`'s entries for `v1`, `s1` and `v2` each have `ring: 'choice'`.
    - Pick `Statue`. Then:
      - no id in `tables[0].placement` or `tables[1].placement` is `v1`, `s1` or `v2`;
      - `stash-p0` holds two cards on each of the two tables, and `workshop-p0` one;
      - every key of `tables[0].decor` is an id of `tables[0].placement`, and no entry has a `ring`;
      - p0's panel has no `Pick cards` group.
    - **Review Focus: Undo.** Press `Undo`:
      - `tables[0].placement`'s `stash-p0` ids are `v1`, `s1` and `v2`, in slot order, and `workshop-p0` is empty;
      - every key of `tables[0].decor` is an id of its placement, and none has `face down`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/pixi/pixi-table.test.ts src/pages/designer/playtest-face-down.test.tsx`. Expected: "Placed at once" FAILS (a new sprite stands at the origin until `advance`). The rest pass already (`TableModel`, 3-2's rings, 9-1's renaming) and are guards; the report says so.
- [ ] **Step 3: Implement** `setScene`'s placing of the sprites it makes.
- [ ] **Step 4: Run** `bunx vitest run src/engine src/pages src/pages/hearts-demo`, then `bun run test` and `bun run typecheck`. The Hearts demo's tests pass unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/engine/pixi/pixi-table.ts src/engine/pixi/pixi-table.test.ts src/pages/designer/playtest-face-down.test.tsx
git commit -F - <<'EOF'
feat(designer): a card that comes under a new id is drawn in its place the moment the table makes it, so cards no one can tell apart appear where they lie, with nothing left of the ids they had

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: A Face-Down project's life on Startup's tabs

Before starting: re-check 7-3's `setUp7`, `tokenOf`, `holding`, `waitingText` and Veto labels; 8-3's `marked`; 6-3's `hover` and `detail`; 4-3's `seatButtons`; 5-3's `confirm`; 9-2's buttons, the `stealth bonus` counter and the development row's mark; Tasks 1–3's names. Read each Hint from the compiled game (`hint('veto')`).

**Files:**
- Test (append): `src/pages/designer/playtest-fitted.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–3. Produces no page code (Calls 2–4 and 6).
- **Module level** (`playtest-fitted.test.tsx`): this task's labels (Assumed), and

```ts
/** `state` with the card `id` turned face down where it lies, as a Face-Down Greenlight leaves it. */
const laidFaceDown = (state: GameState, id: string): GameState;
/** The ids of a zone's cards on the drawn table, in slot order: `inOrder(zoneId)`'s ids. */
const idsIn = (zoneId: string): string[];
```

- [ ] **Step 1: Write the tests.** `describe("a Face-Down project's life on the tabs")`, with `T = after(N, 3)`, `tab`, `boardOf`, `hover` and `detail` local.
  - **Arrangement G:** `setUp7()` with:
    - a Tech Blog in `operations-${S}`;
    - a Search Engine added to `backlog-${S}`, after the dealt card;
    - a Junior PM in `bench-${S}`.

    Keep `before = idsIn(`backlog-${S}`)` and the Search Engine's id `seOld`.
  - **Greenlit face down.** Mount G (S's tab). `hover(seOld)`: `detail()` starts with `Search Engine`. Press `GREENLIGHT_FD_L` and `pickNamed('Search Engine')`; no question is asked (an Infra card takes no cut). Then:
    - `lineOf(S)` starts `` `${S} 7 capital, 3 actions` ``;
    - `idsIn(`development-${S}`)` is one id `se`, not `seOld`, face up, and named Search Engine on the table;
    - no id of `idsIn(`backlog-${S}`)` is among `before`, and the backlog holds the dealt card's name;
    - `table!.decor![se].badge` starts with `face down`. Every key of `table!.decor` is a drawn card's id, and no entry has a `ring`;
    - `detail()` is empty: the hovered id has gone. `hover(se)`: `detail()` contains ` — face down`;
    - `boardOf(S)` contains `Search Engine (face down`.
  - **Review Focus: Undo.** Press `Undo`:
    - `idsIn(`backlog-${S}`)` equals `before`, and `idsIn(`development-${S}`)` is `[]`;
    - `document.body.textContent` contains no `face down`, and every key of `table!.decor` is a drawn card's id.

    Greenlight it face down again, and let `se` be its new id.
  - **Staffed.** Press `ASSIGN`, `pickNamed('Junior PM')`, `confirm()`, `pickNamed('Search Engine')`. Then:
    - `lineOf(S)` contains `2 actions`;
    - the Junior PM hangs under the Search Engine (4-3's column), and its label contains `pending badge` (5-2a: an unbadged Junior PM on a Tier 2 project).
  - **What a rival sees** (R3, the leak test). Click N's tab. Then:
    - `boardOf(S)`'s `development:` part is `development: a face-down card with Junior PM`, with no brackets after `a face-down card`;
    - `lineOf(S)` contains `development 1` and `development team 1`;
    - `idsIn(`development-${S}`)` is `[]`: N's table doesn't draw it;
    - N's whole page contains none of `Search Engine`, `pending badge`, `face down` (spaced) and `/12`. That is `document.body.textContent`, every `title` and `aria-label`, and `JSON.stringify({ cards: table!.placement.cards, decor: table!.decor })`.
  - **Review Focus: a rival's Consultant on it.** Arrangement G2: `setUp7()` with:
    - a Tech Blog in `operations-${S}`;
    - a Search Engine in `development-${S}`, laid face down;
    - the Junior PM put on it in `development-team-${S}`;
    - `tokenOf(…, S, 0)` held by N on the Search Engine with `blue consultant` (7-3's `holding`).

    Mount G2 and click N's tab:
    - the token's caption (`table!.decor![token].caption`) is `` `on a face-down card\nin ${S}'s development` ``;
    - `boardOf(N)` contains `` `Equity whose founder is ${S} (blue consultant) on a face-down card in ${S}'s development` ``;
    - `boardOf(S)`'s `development:` part is `` `development: a face-down card with Junior PM and ${N}'s Equity whose founder is ${S} (blue consultant)` ``;
    - nothing on N's page contains `Search Engine` or `pending badge`.

    Click S's tab:
    - the token hangs under the Search Engine, first in its column (7-3);
    - `table!.decor![se].badge` starts with `face down`.
  - **Disclosed.** On G2, S's tab: press `DISCLOSE_L` and `pickNamed('Search Engine')`; no question is asked. Then:
    - `lineOf(S)` starts `` `${S} 7 capital, 3 actions` ``;
    - `table!.decor![se].badge` has no `face down`, and `se` is still the Search Engine's id;
    - on N's tab, `boardOf(S)` contains `Search Engine` and no `a face-down card`, and the token's caption starts `on Search Engine`.
  - **Launched face down, and the Stealth Bonus.** Arrangement L: `setUp7()` with:
    - a Drone Delivery in `development-${S}`, `marked` `{ 'blue cubes': 6, 'red cubes': 6 }`;
    - the Architect and the Engineer put on it in `development-team-${S}`;
    - the Drone Delivery laid face down;
    - `tokenOf(…, S, 0)` held by N on no card.

    Mount L. `lineOf(S)` contains `0 stealth bonus`. Press `LAUNCH_L` and `pickNamed('Drone Delivery')`. If it is greyed, stop and report its reason. Then:
    - `` tab(`${N} — to act`) `` is selected, and `status()` ends with `hint('veto')`;
    - `waitingText()` is `` `${S} wants to launch a card from their development to their operations: a face-down card (${S}'s development, card 1).` ``;
    - N's page contains no `Drone Delivery`.

    Click S's tab: `waitingText()` ends `: Drone Delivery.` Click N's tab, press `LET_GO`. Then:
    - `` tab(`${S} — to act`) `` is selected;
    - `lineOf(S)` contains `5 stealth bonus`;
    - `boardOf(S)` contains `operations: Drone Delivery`, and `document.body.textContent` has no `face down`.
  - **Vetoed.** L again, with N pressing `VETO` and picking the token. Then:
    - `lineOf(S)` contains `0 stealth bonus`;
    - on N's tab, `boardOf(S)`'s `development:` part starts `development: a face-down card with Architect`.
  - **How the numbers come:**
    - §6 Greenlight: Face-Down pays no License; ruling 7: a Greenlight is 0 AP; §19.A: an Infra card takes no cut. §6: Assign is 1 AP.
    - §6 Voluntary Disclosure: free with Secured Access (S's own Tech Blog provides Platform); 0 AP.
    - §6 Launch: a Face-Down Tier 2 Launch takes a +5 VP marker. 9-2 keeps the markers as one counter of points (§12.7).
    - The Drone Delivery costs 6 Blue and 6 Red (no cut arranged), so 6 and 6 cubes make it Feature complete. The Architect (software) and the Engineer (hardware) lead it.
    - §17.B.5 (7-2b): a holder of S's Equity is asked about an action that costs AP.
    - `setUp7()`: 7 capital each. A Tier 2 Search Engine's Blue need is 12 (`/12` would be a worked count's tail).
- [ ] **Step 2: Run** `bunx vitest run src/pages/designer/playtest-fitted.test.tsx`. Expected: PASS: Tasks 1–3 and plans 7-3 to 9-2 provide every check. If a test fails, stop and report it: it is a page gap, not something to work around.
- [ ] **Step 3: Run** `bunx vitest run src/pages src/engine src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 4: Commit**

```bash
git add src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(designer): a Face-Down project is greenlit, staffed, disclosed and launched through the seat tabs, marked for its owner and a card back with its staff to everyone else, and the Stealth Bonus counts on the tableau line

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: The Audit through Startup's tabs: the offer, the bid, the verdict, Fold and Settle

Before starting: re-check 9-2's `audit`, `declaration` and `bidding` phases, their Hints and buttons; the Settle guard's words (`they have at least the card's settlement in capital`) and the Shield's (`no card on it is shielding`); how `seatStatus` writes an interrupt and an ask (7-3, 8-3); the bank line in the tableaux; `setCounter`; Task 4's helpers.

**Files:**
- Test (append): `src/pages/designer/playtest-fitted.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–4. Produces no page code (Call 5).
- Status lines: 5-1 opens `declaration` as an interrupt, so the asked seat's status is `` `seat: ${N} — declaration — Your turn — ${hint('declaration')}` ``. 8-1's ask keeps `bidding` out of the interrupted turn. If HEAD writes either otherwise, pin what `seatStatus` writes and report it.
- `bankText()` local: the tableaux's line that starts with `bank:` or with a game number, as 3-2 writes it.

- [ ] **Step 1: Write the tests.** `describe('the Audit through the seat tabs')`, with `T = after(N, 3)`, `tab`, `boardOf` and `bankText` local, and this task's labels at module level.
  - **Arrangement A:** `setUp7()` (the Whistleblower Protection Act in play) with:
    - a Tech Blog in `operations-${S}`;
    - a Search Engine and a Planetary Wi-Fi in `development-${S}`, in that order, each laid face down;
    - a Server Farm in `operations-${N}`;
    - a Smart Lock in `operations-${T}`.
  - **The offer.** Mount A (S's tab); press `End your actions`. Then:
    - `` tab(`${N} — to act`) `` is selected, with the status above, and `seatButtons()` is `[AUDIT_L, PASS_AUDIT_L]`;
    - `lineOf(S)` contains `under audit`;
    - press `AUDIT_L`. The picker's buttons before Cancel are `` `a face-down card (${S}'s development, card 1)` `` and `` `… card 2)` ``, both live.

    Press Cancel. Click S's tab:
    - `status()` ends `` `— waiting for ${N}` ``;
    - `boardOf(S)` contains `Search Engine (face down` and `Planetary Wi-Fi (face down`. Pin each entry whole as the view gives it, `passed over` among its words.

    Click N's tab.
  - **The bid.** Press `AUDIT_L` and pick card 2. Then:
    - `` tab(`${T} — to act`) `` is selected, and `seatButtons()` is `[RAISE_L, PASS_BID_L]`;
    - `waitingText()` is `` `${N} wants to audit a card in another player's development: a face-down card (${S}'s development, card 2).` ``;
    - `bankText()` contains `high bid 3`, and `lineOf(N)` contains `the whistleblower`;
    - T's page contains neither `Planetary Wi-Fi` nor `Search Engine`.

    Click S's tab: `waitingText()` ends `: Planetary Wi-Fi.` Click T's tab.
  - **Review Focus: Undo while the bid waits.** Press `Undo`:
    - `` tab(`${N} — to act`) `` is selected, and there is no waiting line;
    - `bankText()` has no `high bid`, and there is no `Pick cards` group.

    Audit card 2 again.
  - **Caught.** On T's tab type 5 in `Raise amount` and press `RAISE_L`. Then:
    - `` tab(`${S} — to act`) `` is selected, and `status()` is `` `seat: ${S} — Your turn — ${hint('audit')}` ``;
    - `seatButtons()` is `[FOLD_L, SETTLE_L]`;
    - `boardOf(S)` contains `Planetary Wi-Fi (caught` and no `Planetary Wi-Fi (face down`;
    - the Planetary Wi-Fi's label contains `caught` and not `face down`;
    - `lineOf(T)` contains `the whistleblower`;
    - `lineOf(S)`, `lineOf(N)` and `lineOf(T)` each start `{seat} 7 capital`: the bid comes back.

    Press `SETTLE_L`: `Planetary Wi-Fi` is greyed with `title` `they have at least the card's settlement in capital`, or the button itself is. Pin which, as the view gives it. Press Cancel.
  - **Review Focus: Undo after the verdict.** Press `Undo`:
    - `` tab(`${T} — to act`) `` is selected, and `waitingText()` is back;
    - no text says `caught`.

    Click S's tab: the Planetary Wi-Fi's label starts with `face down`. Click T's tab and raise 5 again.
  - **Fold.** Press `FOLD_L` and `pickNamed('Planetary Wi-Fi')`. Then:
    - `lineOf(S)` starts `` `${S} 2 capital` `` and `lineOf(T)` `` `${T} 11 capital` ``;
    - `inOrder('open-idea-pool')` names the Planetary Wi-Fi;
    - **R4:** `` tab(`${N} — to act`) `` is selected again. The `AUDIT_L` picker's one button is `` `a face-down card (${S}'s development, card 1)` ``, live.
  - **A clean verdict.** Pick it; on T's tab press `PASS_BID_L`. Then:
    - `lineOf(S)` starts `` `${S} 5 capital` `` and `lineOf(N)` `` `${N} 4 capital` ``;
    - `boardOf(S)` contains `Search Engine` and no `a face-down card`;
    - the turn has moved on: `` tab(`${N} — to act`) `` is selected with N's own turn. Pin its status as given.
  - **Settle.** A with `setCounter` putting S at 12 capital. Catch the Planetary Wi-Fi as above; press `SETTLE_L` and `pickNamed('Planetary Wi-Fi')`. Answer each question the page asks (who is paid the License) with its only answer, and pin each question as the page writes it. Then:
    - `lineOf(S)` starts `` `${S} 3 capital` ``, `lineOf(N)` `` `${N} 10 capital` ``, and `lineOf(T)` `` `${T} 18 capital` ``;
    - `boardOf(S)` contains `Planetary Wi-Fi` with no `caught`, still under `development:`;
    - `` tab(`${N} — to act`) `` is selected (R4).
  - **Review Focus: the Shield.** A with the Architect put on the Search Engine in `development-team-${S}`, `marked` `{ cto: 1 }`. End S's actions. On N's tab, the `AUDIT_L` picker lists:
    - card 1, greyed with `title` `no card on it is shielding`;
    - card 2, live.

    Neither title nor N's page names a card.
  - **Review Focus: nobody can audit.** A with N and T at 2 capital (`setCounter`). End S's actions. Then:
    - no status says `declaration`, and there is no waiting line;
    - `` tab(`${N} — to act`) `` is selected with N's own turn.
  - **How the numbers come:**
    - §7.A: an opening bid of $3, raised by at least $1; the active player never bids.
    - §7.B Missing Dependency: the Planetary Wi-Fi requires Cloud and IoT. S provides neither and has no Partner, so it is caught.
    - §7.C:
      - an illegal verdict returns the bid;
      - the Fold is $5, of which $4 goes to the Whistleblower and $1 to the bank: 7 − 5 = 2 and 7 + 4 = 11;
      - a clean verdict pays the bid to the owner: 2 + 3 = 5 and 7 − 3 = 4;
      - the Settlement is $3 plus a $3 License per missing Tag, 9, to a provider of each (N for Cloud, T for IoT): 12 − 9 = 3, 7 + 3 = 10. T also gets the bank's $4 bounty, $8 under the Whistleblower Protection Act (§20.D 17): 7 + 3 + 8 = 18.
    - The spec's call: Settle only when cash covers it: 7 < 9.
    - §11.G.2: a working CTO shields its project. R4: the offer starts again after each verdict.
- [ ] **Step 2: Run** `bunx vitest run src/pages/designer/playtest-fitted.test.tsx`. Expected: PASS. If a test fails, stop and report it: it is a page gap, not something to work around.
- [ ] **Step 3: Run** `bunx vitest run src/pages src/engine src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 4: Commit**

```bash
git add src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(designer): the Audit offer, the bid, the verdict, Fold and Settle are played through the seat tabs, the audited project placed but never named, and Undo takes each back

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 6: The browser check with the Hearts demo, the README and the final checks

**Files:**
- Modify: `README.md`
- Browser scripts and screenshots go only in `SCRATCH=/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-9-3`.

**Interfaces:** Consumes Tasks 1–5. Produces nothing new.

- [ ] **Step 1: The probes.** Write `$SCRATCH/probe.ts` and run it with `bun`. It makes two edited copies of `src/games/startup-simulator.rules`, A and B.
  - **Both copies:**
    - remove `  The start player is chosen at random.`;
    - change `  Each player has 7 capital that everyone can see.` to `  Each player has 30 capital that everyone can see.`;
    - add a setup block right after `  3 new Equity cards go to each equity, each naming its owner as its founder.`, before Setup's deal. Each block starts with `  Move the whistleblower protection act from the event deck to the box.` and `  Move the whistleblower protection act from the box to the event deck.`
  - **A's block** goes on with:

```text
  Move the tech blog from the seed deck to p0's operations.
  Move the junior software dev from p0's bench to p0's ops team.
  Move the search engine from the growth deck to p0's backlog.
  Move the planetary wi-fi from the growth deck to p0's backlog.
  Move the server farm from the growth deck to p1's operations.
  Move the junior hardware eng from p1's bench to p1's ops team.
  A new Junior Hardware Eng goes to p1's ops team.
  Move the smart lock from the seed deck to p2's operations.
  Move the junior hardware eng from p2's bench to p2's ops team.
```

  - **B's block** goes on with:

```text
  Move the smart lock from the seed deck to p0's operations.
  Move the tech blog from the seed deck to p0's operations.
  Move the junior software dev from p0's bench to p0's ops team.
  Move the junior hardware eng from p0's bench to p0's ops team.
  Move the architect from the talent deck to p0's bench.
  Move the engineer from the talent deck to p0's bench.
  Move the drone delivery from the growth deck to p0's backlog.
  Move the to-do list from the seed deck to p0's backlog.
```

  - **The checks**, for A at 3 players and B at 2, at each of seeds 1 to 10:
    - the edited rules compile with no diagnostics;
    - p0 is to act, in `actions`, and the Whistleblower Protection Act is in play;
    - every card named above is where its line puts it;
    - the probe prints each seat's capital. Every number below assumes 30. If HEAD runs Income before p0's first actions, shift each capital by the rev it paid, and report it.

  If a check fails at HEAD (a zone or card named otherwise, or a step that stops for a press), stop and report it.
- [ ] **Step 2: The browser check.** Copy 8-3's `$SCRATCH/../browser-8-3/check.cjs` helpers: `at()`, `rowCard()`, `STRIP`, `BOARD`, `hover`, `click`, the launch, the error collection, `waitFor`, `press`, `pressIn`, `group`, `line`, and its Hearts session from `$SCRATCH/../browser-1b3/check.cjs`.
  - **Setup.**
    - Regenerate `zones.json` for each seat from `fittedLayout(game.zones, viewer, seats)` on each probe's rules, and work out a hanging card's place with `stackOnHolders` as the page does.
    - Run the dev server on 5173 with `--strictPort`, polled with `curl -sf`.
    - Use Chromium with `['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']` and a viewport of `1600 × 3200`.
    - Expect no `pageerror` and no console error.
    - Load the Startup Simulator sample, fill `Rules` with the probe's text, choose the player count and press `Play`.
    - Whenever a turn starts in Income, press `Pay salaries`. A turn that stops at any other step not listed below: stop and report it with a screenshot.
  - **Session A (3 players).** Each screenshot must show what is listed after it.
    1. **`01-greenlit.png`.** p0 presses `GREENLIGHT_FD_L` and picks `Search Engine`, then again with `Planetary Wi-Fi`.
       - p0's development row shows both face up, each labelled `face down`.
       - The backlog row shows the dealt card.
       - `board-p0` contains `Search Engine (face down` and `Planetary Wi-Fi (face down`; p0's line starts `p0 30 capital, 3 actions`.
    2. **`02-staffed.png`.** p0 presses `ASSIGN`, picks `Junior Hardware Eng`, confirms and picks `Search Engine`.
       - The Junior Hardware Eng hangs under the Search Engine, its strip clear of the card above.
       - p0's line reads `2 actions`.
    3. **`03-rival.png`.** Click p1's tab.
       - p1's canvas has no development row of p0's.
       - `board-p0` reads `development: a face-down card with Junior Hardware Eng; a face-down card` (the staff entry as the page gives it).
       - The page's text contains neither `Search Engine` nor `Planetary Wi-Fi`.

       Click p0's tab.
    4. **`04-offer.png`.** p0 presses `End your actions`.
       - The `p1 — to act` tab is selected, and the status reads the declaration Hint.
       - p1 presses `AUDIT_L`: the picker lists `a face-down card (p0's development, card 1)` and `a face-down card (p0's development, card 2)`, both live.
    5. **`05-bid.png`.** p1 picks card 2.
       - The `p2 — to act` tab is selected.
       - The waiting line reads `p1 wants to audit a card in another player's development: a face-down card (p0's development, card 2).`, in p1's colour.
       - The bank line contains `high bid 3`, and p1's line `the whistleblower`.
    6. **`06-caught.png`.** p2 types 5 in `Raise amount` and presses `RAISE_L`.
       - The `p0 — to act` tab is selected, and the status reads the audit Hint.
       - The Planetary Wi-Fi is labelled `caught`, with no `face down`, and `board-p0` contains `Planetary Wi-Fi (caught`.
       - Each line starts `{seat} 30 capital`, and p2's contains `the whistleblower`.
    7. **`07-settled.png`.** p0 presses `SETTLE_L`, picks `Planetary Wi-Fi`, and answers each question with its only answer.
       - p0's line starts `p0 21 capital`, p1's `p1 33 capital`, p2's `p2 41 capital`.
       - The `p1 — to act` tab is selected again.
       - p1's `AUDIT_L` picker lists `a face-down card (p0's development, card 1)`, live, and `Planetary Wi-Fi (p0's development)`, greyed with `it is face down`.
    8. **`08-clean.png`.** p1 picks card 1, and p2 presses `PASS_BID_L`.
       - p0's line starts `p0 24 capital`, and p1's `p1 30 capital`.
       - `board-p0` names both cards and contains no `a face-down card`.
       - The turn has moved on to p1's.
  - **Session B (2 players).**
    9. **`09-disclosed.png`.** p0 does four things:
       - presses `GREENLIGHT_FD_L` and picks `Drone Delivery`, answering `Cut 1 of each`;
       - presses it again and picks `To-Do List`;
       - presses `ASSIGN`, picks `Architect` and `Engineer`, confirms and picks `Drone Delivery`;
       - presses `DISCLOSE_L` and picks `To-Do List`.

       The canvas then shows:
       - the Drone Delivery labelled `face down`, with the Architect and the Engineer hanging under it;
       - the To-Do List with no `face down`.

       On p1's tab, `board-p0` reads `development: a face-down card with Architect and Engineer; To-Do List`, as the page gives each entry.
    10. **`10-passed.png`.** p0 presses `End your actions`; on p1's tab p1 presses `PASS_AUDIT_L`.
        - `board-p0` still begins `development: a face-down card`.
        - Play on: each turn p1 presses `End your actions`. p0 presses `End your actions` at its next turn, and p1 passes the audit again.
    11. **`11-launched.png`.** At p0's third turn, p0 presses `LAUNCH_L` and picks `Drone Delivery`. If it is greyed, play up to three more rounds; then stop and report its reason.
        - p0's line contains `5 stealth bonus`.
        - The operations row shows the Drone Delivery, and no text says `face down`.
  - **Session C.**
    12. **`12-color-match.png`:** Color Match at 3. Three panels as before, with no waiting line, no `face down` and no `card ` place.
    13. **The Hearts demo at `/`** (1b-3's session):
        - a click on a card leaves the hint ending `(0/3)`;
        - drag a card to the pass area, then take **`13-hearts-moving.png`** 60 ms after the drop and **`14-hearts-rest.png`** 600 ms after it;
        - the hint ends `(1/3)`;
        - the first shows the card on its way or at its place, the second at its place in the pass area, the hands whole.
  - **Afterwards.**
    - Open every PNG (Read) and check it against its list.
    - Judge whether each `face down` label reads in its card's strip where staff hang under the card. Report one that is covered or unreadable.
    - Stop the dev server.
  - **How the numbers come:**
    - §6 and ruling 7: a Face-Down Greenlight pays no License and costs no action; §6: Assign and Launch cost 1 action, Disclosure none, and the To-Do List needs no Tag.
    - §7.A: p1 opens at $3 and p2 raises to $5. §7.B: the Planetary Wi-Fi requires Cloud (p1's Server Farm) and IoT (p2's Smart Lock), so p0 is caught.
    - §7.C: the bid comes back. Settling is $3 + $3 + $3 = 9: 30 − 9 = 21 and 30 + 3 = 33. p2 gets 30 + 3 + 8 = 41, the bounty doubled under the Whistleblower Protection Act (§20.D 17).
    - R4: the offer starts again. The Search Engine is legal (p0's own Tech Blog provides Platform), so p1 pays the $3 bid to p0: 21 + 3 = 24 and 33 − 3 = 30.
    - §19.A: the Smart Lock is Deep Tech and online, so the Drone Delivery (6 Blue, 6 Red) is cut to 5 and 5. The Architect and the Engineer make 3 each a turn, so two Engines complete it.
    - §6 Launch: a Face-Down Tier 2 takes a +5 marker.
- [ ] **Step 3: Update the README.**
  - **"A table too big for one screen", `The other seats`.** Add:
    - a card its owner alone sees face up is labelled `face down` on the owner's canvas, and the others see a back with the cards on it as they are;
    - cards given new ids appear where they lie, with nothing sliding.
  - **`The Board`.** Add: the owner's card reads `(face down)` first in its brackets, and the others read `a face-down card with …`.
  - **"Buttons that pick cards", `In the playtest`.** Add: a card lying face down is listed by its place, `a face-down card (p0's workshop, card 2)`, and so is it in the waiting line.
  - **Plan 9-1's paragraph.** Add an `In the playtest` bullet before its Startup bullet, naming the three points above.
  - **Its Startup bullet.** Add the page:
    - Face-Down projects marked for their owner and a card back with staff to everyone else;
    - the Audit offer, the bid, Fold and Settle through the tabs;
    - Disclosure and the Face-Down Launch;
    - the Stealth Bonus on the tableau line.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests. Then run these checks over `BASE..HEAD`. Each must print nothing, except where noted.

```bash
# Startup Simulator's words in shared code, slices 3–9, tests included
git diff "$BASE" -- src/engine src/pages src/utils ':!src/pages/designer/designer-page.test.tsx' ':!src/pages/designer/playtest-fitted.test.tsx' \
  ':!src/pages/designer/tableaux.test.ts' ':!src/pages/designer/samples.ts' | grep '^+[^+]' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share|tags?|leads?|leading|licen[cs]es?|tiers?|stall(s|ed|ing)?|sectors?|expertise|modes?|bandwidths?|bugs?|qa|online|offline|maint(enance)?|suppl(y|ies)|demands?|xp|pending|skills?|badged|ranks?|mentor(s|ed|ing)?|synerg(y|ies)|agile|graduat(e|es|ed|ing|ion)|training|trained|brainstorm(s|ed|ing)?|strateg(y|ies)|milestones?|seniors?|workaholics?|clean coders?|visionar(y|ies)|toxic|burnouts?|flight risks?|techcrunch|design sprints?|cease|desist|hype|utilit(y|ies)|buffs?|debuffs?|venture capital|bubbles?|patents?|trolls?|angels?|investors?|legacy|regulations?|audits?|open source|hackathons?|chip shortage|crunch|server crash|logjam|frenz(y|ies)|interns?|headhunt(s|ed|ing|ers?)?|course boom|whistleblowers?|trade show|events?|equit(y|ies)|founders?|consultants?|dividends?|veto(es|ed|ing)?|partners?(hips?)?|immunit(y|ies)|portfolios?|buybacks?|stocks?|poach(es|ed|ing|ers?)?|vest(s|ed|ing)?|ctos?|acqui(re|res|red|ring|sitions?)|fire sales?|hit pieces?|scandals?|integrat(e|es|ed|ing|ions?)|hosts?|host(ed|ing)|clients?|cris(is|es)|m&a|divest(s|ed|ing|ments?)?|raiders?|market sales?|counter-offers?|stealth|audit(ed|ing|ors?)?|fold(s|ed|ing)?|settle(s|d|ments?|ing)?|ghosts?|bluff(s|ed|ing)?|disclos(e|es|ed|ing|ures?)|shield(s|ed|ing)?|dependenc(y|ies)|legality|fraud(s|ulent)?|bount(y|ies)|secured|transient)\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# the rules are unchanged
git diff --stat "$BASE" -- src/games/startup-simulator.rules
# existing test lines removed or changed: only the named class
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
```

  - The first check may print a line naming the net layer's `ClientView` or `ClientChannel`; list it, since it is not the game's word. It leaves out 9-1's `badges?`, as 8-3's check does: page code says "badge" for a card's corner label (5-3), never for the game's Badge.
  - The last check prints only the lines Task 1 named, as its report lists them.
  - Also read the `+` lines of `src/engine`, `src/pages` and `src/utils` for "place" or "card {n}" used of anything but a card's place in its row, and "offer" or "bid" naming a Startup step rather than 9-1's fixture.
- [ ] **Step 5: Run the four games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo src/engine/pixi src/engine/input` passes, and Rent Day still has 108 examples.
- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -F - <<'EOF'
docs: cards their owner alone sees face up, cards told apart by their place, cards that come under new ids, and slice 9 on the page, checked in a browser with the Hearts demo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Gaps

- **G1. The Settlement is not shown as a number before pressing** (9-2's forward note asked for it).
  - Its lines count the `in reach` products in every player's operations, beyond the card and the cards on it. So neither 8-3's press prices nor 4-3's stand-ins may carry it: both pass only numbers that read the card alone (`readsOnlyCards`), and widening that test is a language change with leaks to rule out.
  - Meanwhile the owner has three things:
    - the audit step's Hint gives its make-up ($3 to the bank and a License for each missing Tag, or $3 more for Ghost Progress alone);
    - Settle is greyed with `they have at least the card's settlement in capital` when cash is short;
    - the page asks whom each License goes to before sending.
  - **Recommendation:** a language plan that admits a worked number whose lines read only zones every seat sees (`seenByAll`), and then a guard price beside 8-3's (`Only if they have at least the card's {attribute} in {counter}`).
- **G2. `in reach` and `passed over` are labelled while the Audit window lasts** (9-2 asked that `in reach` not be).
  - Both are kept flags, which 4-3 labels on a Board card and in its Board line. The page has no general way to tell a working mark from a flag worth showing.
  - Both are public. `in reach` tells a bidder which products give the owner Secured Access.
  - **Recommendation:** if the owner wants it hidden, a declaration word the page reads (`Cards can be in reach, unshown.` or similar), in a language plan.
- **G3. The Stealth Bonus is one number on the tableau line** (`15 stealth bonus`), not separate +5 and +10 markers.
  - 9-2 keeps one counter. Splitting it would guess how it splits: 10 is one Tier 3 launch or two Tier 2 launches.
  - §12.7 scores face value only, so nothing is lost but the look. Recorded.
- **G4. `sitsOn` gives no ordinal:** an Investor's caption reads `on a face-down card` / `in p0's development` (7-3). With two Face-Down projects, the Investor tells them apart from the founder's Board line, which lists the token under its project. Pickers and the waiting line, where a choice hangs on it, carry the place (Call 1). Parked.
- **G5. Existing test lines change in one named class** (Task 1): whole-`waiting` pins of 9-1 and 9-2 for a card lying face down in a row everyone sees gain `places`. Task 1's report lists them, and Task 6's check prints exactly them.

## Forward notes

- **Slice 10:**
  - Come Clean turns a card face up from a rule. On the owner's canvas the `face down` label goes with the view; on rivals' pages the Board line names it.
  - A bankrupt seat's Face-Down projects leave with it; the page follows the view.
  - Its Fold and Settle for any owner reuse Task 5's flow, with no Whistleblower on the tableau lines.
  - Two asks at once (Come Clean inside an Audit) would need two waiting lines; 7-3's line shows one, so slice 10's nested windows decide which.
  - G1's guard price would show slice 10's Settle cover (cash plus Fire Sale value) in the same place.
