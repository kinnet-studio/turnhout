# Startup Simulator Slice 8-3 (The page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The playtest page shows slice 8:
- a Client hangs under its Host on the canvas, and the Board line reads `USB Gadget over To-Do List`;
- Vest and CTO marks show on their employee, Scandal on its product, and each tableau shows its locked Equity;
- a button that pays a card's price (the M&A Price, the poaching fee) shows that price beside each card in its picker, and the hover line shows it too;
- consent, the Market Sale and the counter-offer appear in the asked seat's strip, the seat tabs follow them, and the placing step's picker works;
- Recruiter Frenzy's and Headhunter Holiday's effects no longer say they aren't in effect.

**Architecture:**
- **This is plan 8-3, the page,** after plans 8-1, 8-2a and 8-2b. It takes plans 4-3 to 8-2b as given (see "Assumed from earlier plans").
  - It changes two cells of the rules text: Recruiter Frenzy's and Headhunter Holiday's `effect` drop `Not in effect yet.` (6-3's G4). No phrase, no rule and no example changes.
  - What the page needs and those plans don't provide is listed under "Gaps".
- **Six tasks:**
  1. a card on a card of its own zone, drawn: the Client tucked under its Host (layout);
  2. stacks, marks and locked Equity in words (Board text; the labels pinned);
  3. the price a press pays, before pressing (core view, picker, hover line);
  4. products changing hands through the seat tabs: consent, the Market Sale, the Fire Sale, the Hit Piece and the crisis step;
  5. people changing hands through the seat tabs: the counter-offer, the placing step and the CTO, and the two Event cells;
  6. the browser check, the README and the final checks.
- **Nothing in shared code knows Startup Simulator.**
  - Core: `layout.ts` draws a placed card at its own `data.z`; `table-model.ts` exports `ZONE_Z`; `fit-layout.ts`'s `stackOnHolders` hangs chains of cards, depth first; `worked-view.ts` gains `pressPrices` and `pricedNames`; `board-view.ts` gains `PricesView` and `SeatExtras.prices`.
  - Page: `board-text.ts`'s `boardText` writes a card's own-zone cards after ` over `; `card-pick.ts` gains `pickNotes`; `CardPicker` gains `notes`; `playtest.tsx` passes the notes and adds prices to the hover line.
- **Calls this plan makes** (the spec leaves "how stacks and windows look" to the builder):
  1. **A Client hangs in its Host's column** (R2: the Client stays in operations, on its Host).
     - Operations is a `'some'` zone, so 4-3 made it a `keepPlaced` row. A card that sits on a card of its own row hangs under it like any card on a card, and the row spaces only the cards that don't hang.
     - **A column holds every card that hangs from its card, all the way down, depth first:** each card on it, followed by the cards on that card.
     - Among the cards on one card, those of other zones come first, in the order of the table's zones, then slot order (7-3: other seats' zones first). Those of the card's own zone (the Client) come last.
     - So a Host's column reads: an Investor's Consultant on it, its Sales Rep, then the Client, then the Client's Consultant and staff.
     - **Each card in a column is drawn over the one above it.** Its top strip (corner index and label) shows. A column's order no longer follows the zones' order, so `stackOnHolders` gives each hanging card its `z` (`data.z`): above every zone's own cards, in column order.
  2. **On a Board line, a card on a card of its own zone follows ` over `,** after the card's `with` part: `operations: USB Gadget with Sales Rep, over To-Do List with Growth Hacker`. "Over" says what the canvas shows, the Host above its tucked Client. The comma comes only after a `with` part.
  3. **Marks, Scandal and locked Equity need no new code.** They are 4-3's and 5-3's labels:
     - lone counts on a Board card: `1 vest`, `1 cto`, `2 scandal`, `1 cleared scandal`;
     - kept flags: `for sale`, `poached`, `raided`, `onboarding`;
     - off a Board, the owner's own view only: a Vested employee on its owner's bench is labelled `1 vest`, and is a back to every other seat (R1: the mark hides with it);
     - the tableau line counts `locked equity n`, and the Board line lists `locked equity: Equity; Equity` (7-3: the zone's seat goes without saying).

     Task 2 pins each.
  4. **A price is shown before pressing** (8-2b's forward note: the fee is public).
     - A worked number that a button's `Then:` lines pay from the card it picks (`They pay its sale price to its owner.`) or from its target card (`They pay the target card's poach fee.`) is a *press price*. It is kept when its lines read only the card and the cards on it (`readsOnlyCards`, with 6-3's `centre`).
     - The view carries each Board card's press prices (`SeatExtras.prices`), the same for every seat, as `worked` is.
     - The picker writes the price after the card's place: `Hacker (p1's development team, poach fee 12)`. The hover line ends with it: `… — sale price 16`.
     - So the seller in a consent reads the M&A Price on their own product, and a Market Sale's buyer reads it beside the card offered.
  5. **Asks need no new page code.**
     - 7-3's waiting line reads `SeatExtras.waiting`, which 8-1's asks fill. 7-3's `seatToAct` reads `turn.current`, which each ask moves seat by seat and back.
     - Each phase's Hint is on the status line: consent, market sale, counter-offer, placing, crisis.
     - A refusal is the rules' own words on a greyed button or picker entry, as every refusal on the page has been since 3-2: `the target card can host the card`, `the target card is not safe from poaching`. That is "the pairing's and the poach buttons' refusals in words".
     - Tasks 4 and 5 pin each flow.
  6. **The placing step needs no new page code.** The poached card is picked from the list with its place (6-3). Its destination is clicked on the canvas or picked from the list. The Hint names both kinds of target (8-2b).
- **Parked:** zone names for the viewer's own cards when one list holds cards of two of the viewer's zones (G1); the price in a waiting line (G2); labels for `integrated` and `hosting` (G3).

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19, PixiJS 8; Playwright (global install, Chromium in `/opt/pw-browsers`) for the browser check.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-8-selling-poaching-design.md` is binding, above all "The page" and the rulings:
- "Integration stacks show the Client tucked under the Host";
- "Vest and CTO tokens show on their employee; Scandal as a badge";
- "Reaction windows and offers appear in the deciding player's strip; the switcher jumps to them";
- R1 (the mark rides with the employee and hides with it on the Bench; a public locked equity pile), R2 (the Client sits on its Host inside operations), R4 (whether the counter-offer opens reads only public facts).

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding. Its anti-goals bind here: hidden information leaking, Startup words in shared code. So do "Designers never see engine words" and the seat switcher that "jumps to the seat that must act next".

These plans are inputs, with their Global Constraints amendments:
- 4-3, 5-3, 6-3 and 7-3 (`…-4-3-the-page.md` to `…-7-3-the-page.md`): the models for this plan; 7-3's waiting line and seat switcher are what the asks extend;
- 8-1 (`…-8-1-language.md`): its "Left to 8-3";
- 8-2a and 8-2b (`…-8-2a-…`, `…-8-2b-…`): their forward notes for 8-3;
- `builder-check-startup-8.md` in the session scratchpad: Q1, Q2 and Q4's page notes.

## Global Constraints

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.**
  - This plan adds no `state.data` key and no move field.
  - The only new card `data` key is `z`, written by `stackOnHolders` on the page's copies of cards beside 1b-3's `x` and `y`. It never reaches a game state.
  - The view gains one optional key, `prices`, left out when empty (never `undefined`).
- **No Startup Simulator words in shared code** (code, comments, test names and shared test fixtures).
  - The banned list is plan 8-1's: plan 7-1's list (6-1's list and slice 7's words), plus slice 8's poach, vest, cto, acquisition, fire sale, hit piece, scandal, integration, host, client, headhunter, crisis, m&a, divest, raider, market sale, counter-offer.
  - **Where they may appear:** `src/games/startup-simulator.*`; `src/pages/designer/designer-page.test.tsx`, `playtest-fitted.test.tsx` and `tableaux.test.ts`; `src/pages/designer/samples.ts`; `README.md`; `docs/`.
  - Shared code says "a card on a card of its own zone", "tucked", "a price a press pays", "the players asked". Fixtures are 8-1's (`NEST_GAME`, `TRADE_GAME`, `ASK_GAME`) and 7-1's: workshop, crew, kit, holdings, worth, wage, claim, protest.
  - Ordinary words to avoid:
    - "waiting", not "pending";
    - "goes to", not "leads";
    - "a mistake in the code", not "a bug";
    - "the card it is on" or "holder", never "host";
    - "the card on it", never "client";
    - never "supply", "veto" or "partner".
  - The net layer's `ClientView` and `ClientChannel` are not the game's word. A new line that must name them is listed in Task 6's report, not renamed.
- **Hearts, Color Match, Venom and Rent Day stay unchanged** (Rent Day keeps its 108 examples).
  - None has a card on a card of its own zone or a chain of cards on cards, so their tables draw as before.
  - None pays a card's worked number, so their views carry no `prices`.
  - Their pickers, hover lines and Board lines read as before.
- **Every number comes from the rulebook.** Each Startup test says where its numbers come from.
- **Hidden information** (overview anti-goal; 3-2's to 7-3's lessons):
  - What the view shows is decided by the compiled rules alone, and never reveals a hidden card or zone.
  - **An ask's prompt names cards only as the asked seat sees them.** The waiting line names cards only as `SeatExtras.waiting` names them for that seat (`a face-down card` elsewhere, no id), and the page adds no card to it.
  - **Whether an ask opens depends only on public facts** (slice 8 Q4 / R4). The page shows the poacher the same panel whatever the victim's hand holds.
  - **A price is carried only for a card whose face the seat sees on a Board,** and only for a number that reads nothing but the card and the cards on it. Every seat gets the same.
  - Labels, notes and Board text read only the cards as the seat's scene gives them. A face-down card has no data and gets none.
  - A chain hangs only from cards this table draws (7-3's `drawnCards` comes first).
- **A ring or picker never outlasts its view.** Everything this plan adds to the page (columns, notes, prices, labels) is derived from the latest view in the render that receives it, and adds no page state.
- **No measured `Text`.** A `Text`'s size is never measured under happy-dom. This plan adds no Pixi text: notes and prices are DOM text, labels are 4-3's badge, and any width is taken with `boldTextWidth`.
- **Earlier plans come first.**
  - In execution order: 4-2, the long-runs speed-up (`2026-10-17-startup-long-runs-speed.md`), 4-3, 5-1, 5-2a, 5-3 Task 1, 5-2b, 5-3 Tasks 2–4, 6-1, 6-3 Task 1, 6-2a, 6-2b, 6-3 Tasks 2–5, 7-1, 7-2a, 7-2b, 7-3, 8-1, 8-2a, 8-2b, then this plan.
  - Their code is referred to by the names their Interfaces blocks give.
  - Each task re-checks the names it consumes at HEAD before starting, and stops and reports one that differs.
- **Files this plan changes outside page and core code:**
  - `src/games/startup-simulator.rules`: the Recruiter Frenzy and Headhunter Holiday `effect` cells only (Task 5);
  - `src/games/startup-simulator.test.ts`: appended tests and Task 5's named line;
  - `README.md`.
- **Existing tests.**
  - No existing test line changes, except these classes, each named by its task and listed in its report:
    - Task 1: a test of plans 4-3 or 7-3 that compares a hanging card's whole transform, `z` included; it reads the column's `z`;
    - Task 2: a pin of plans 8-2a or 8-2b that lists a Client in its Host's `with` part; it reads ` over `;
    - Task 3: 6-3's and 7-3's hover-line pins of a card that now has a press price, and any whole-view comparison (`seatExtras` with `toEqual`) of a game with a press price; they gain the prices;
    - Task 5: in 7-3's `it('says Venture Capital Rain is in effect now that Invest is (§20.D 1)')`, the list of Events whose effect ends `Not in effect yet.`.
  - New names are imported on new `import` lines.
  - If any other existing test fails, stop and report it.
- **The browser check** uses the pre-installed Chromium (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; never `playwright install`).
  - Its scripts and screenshots stay in `/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-8-3/`, never in the repo.
  - Its setup lines go where every seed sets up: right after `  3 new Equity cards go to each equity, each naming its owner as its founder.`, before Setup's deal, checked at seeds 1 to 10.
- **Page copy (exact):**
  - **A card on a card of its own zone, on a Board line:** after the card's entry and its `with` part, ` over {entries joined by joinAnd}`, with `,` before ` over` when there is a `with` part:
    - `workshop: Vase over Statue`;
    - `workshop: Vase with Potter, over Statue with Smith`.
  - **A price before pressing:** a picker entry the press pays a price for reads `{name} ({place}, {price name} {n})`, or `{name} ({price name} {n})` when it has no place. Its aria-label is `Pick ` and the same: `Hacker (p1's development team, poach fee 12)`.
  - **The hover line:** 6-3's and 7-3's, then ` — {price name} {n}` for each price the view gives the card, joined by ` · `, in `pricedNames` order: `Vase — … — worth 4`; `… — poach fee 12 · raid fee 9`.
  - **Labels** are 4-3's and 5-3's, unchanged: `1 vest`, `1 cto`, `2 scandal`, `for sale`, `poached`, `onboarding`.
  - **The waiting line** is 7-3's, unchanged: `{by} wants to {words}: {cards}.`
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1, record `BASE=$(git rev-parse HEAD)`. Run `bun run test` once for the passing count and the long runs' time.
  - If the long runs take more than a third longer than at BASE after Task 3 (the view works out prices on every move of `'plays the same game through the page's view as without it'`), report the timing.
- **No new dependencies.**
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefix `feat(designer):` (`docs:` for Task 6).
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.
  - A test marked "(guard)" passes before its task's change, and says so.

## Review Focus

- **A Client that carries its own staff and an Investor's Consultant, under a Host that carries staff; then the integration undone, or the Host sold.**
  - Expected:
    - one column under the Host, depth first: the Host's cards, then the Client, then the Client's cards;
    - each card drawn over the one above it, its strip showing;
    - afterwards no copy keeps a stale `x`, `y` or `z`, and the operations row spaces the Client again;
    - the Board line drops ` over `.
  - Tests: Task 1 (the column, Undo), Task 4 (the Host sold).
- **A poach whose victim can only let it go** (no Cease & Desist in hand, or only the last token in supply).
  - Expected: the window opens on public facts alone, and the poacher's panel reads the same whether the victim's hand holds a Cease & Desist or not.
  - Test: Task 5.
- **A price that would tell what a seat can't see, or read beyond the card:** a card on the bench, a hidden zone's card, a number that totals another zone.
  - Expected: never in the view, not even the owner's; no note, no hover price.
  - Tests: Task 3.
- **Undo while a consent, a Market Sale, a counter-offer or a placing waits.**
  - Expected: the waiting line, the `for sale` and `poached` labels and the tab follow the view back; nothing is sent.
  - Tests: Tasks 4 and 5.
- **An ask that asks nobody:** no rival with the price and the room, or a victim with no Equity in supply and an empty hand.
  - Expected: no waiting line ever shows, the tabs never leave the presser, and the Fire Sale or the placing follows at once.
  - Tests: Tasks 4 and 5.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name, not by line. If one is missing or differs, stop and report it.

- **HEAD (1b-3, 3-2):**
  - `layout.ts`: `computeZoneLayout(zone, cards, zBase)`;
  - `table-model.ts`: each zone's cards at `zoneIndex * 1000`;
  - `fit-layout.ts`: `fittedLayout`, `stackOnHolders`, `STACK_GAP` (36), `STACK_STEP` (34), `BOARD_SPACING`;
  - `board-text.ts`: `cardLabel`, `boardText`, the private `cardsOnCards`;
  - `board-view.ts`: `seatExtras`, `readSeatExtras`, `seesFace`, the private `cardsKept` and `workedView`;
  - `worked-view.ts`: `standIns`, `shownFlags`, the private `readsOnlyCards`;
  - `card-picker.tsx`: `CardPicker`;
  - `seat-status.ts`: `seatStatus`, `seatToAct`;
  - `card-facts.ts`: `changeCard`; `attach.ts`: `putOn`, `holderIdOf`; `zones.ts`: `relocate`;
  - `playtest-fitted.test.tsx`: `setUp`, `idOf`, `S`, `N`, `O`, `after`, `hint`, `mount`, `cardsIn`, `lineOf`, `status`, `press`, `picker`, `pickNamed`, `click`, `choose`, `inOrder`, `offered`.
- **4-3 (built):** `LayoutOptions.keepPlaced` and `stackOnHolders`' walk of `keepPlaced` rows; `loneCounts`, `boardBadges(game, cards, worked?)`; the `playtest-fitted.test.tsx` helpers `askedGroup`, `answerAsked`, `seatButtons`.
- **5-3 (built):** `fittedBounds`; `keptBadges` and the decor merge; `pressFlags`, `holderFlags`.
- **6-3 (built):**
  - `placesOf(game, cards, seat)` and `CardPicker`'s `places`;
  - the hover line `{cardDetail}{ — label}`;
  - `thenRefs` and the `centre` reading in `worked-view.ts`;
  - the Event table's `effect` column;
  - the `playtest-fitted.test.tsx` helpers `inPlay`, `onTop`, `inPlayLine`.
- **7-1 (built):** `WaitingView`, `SeatExtras.waiting`, `ON_SEAT_KEY`, `ZoneSpec.across`.
- **7-3 (built):**
  - `nameWithPlayers`; `sitsOn`; `fittedLayout(zones, viewer, seats)` and `drawnCards`; `waitingLine`;
  - the hover line's `{seat}'s ` prefix;
  - the `playtest-fitted.test.tsx` helpers `tokenOf`, `holding`, `setUp7`, `waitingText`;
  - `it('says Venture Capital Rain is in effect now that Invest is (§20.D 1)')` in `startup-simulator.test.ts`.
- **8-1 (built):**
  - the phrases `they pay its {attribute} to its owner` (`board-phrases.ts`) and `they pay the target card's {attribute}` (`card-pick-phrases.ts`), by those patterns;
  - the zone mark `…, where some cards are on cards`, `ONTO_ITSELF`;
  - `ASK_FRAME`, `Waiting.resume`, `waitingOf`;
  - the fixtures `NEST_GAME`, `TRADE_GAME`, `ASK_GAME` (`testing.ts`).
- **8-2a (built):**
  - phases `consent`, `market sale`, `crisis`; the operations row marked `, where some cards are on cards`; the pairing `host`;
  - counts `scandal`, `cleared scandal`; flag `for sale`; worked numbers `sale price`, `fire sale price`;
  - in `startup-simulator.test.ts`: `ACQUIRE`, `AGREE`, `REFUSE_SALE`, `DIVEST`, `BUY`, `PASS_SALE`, `PUBLISH`, `CLEAR`, `INTEGRATE`.
- **8-2b (built):**
  - phases `placing`, `counter-offer`; the `locked equity` row; counts `vest`, `cto`; flags `poached`, `raided`;
  - worked numbers `poach fee`, `raid fee`, `fee paid`;
  - in `startup-simulator.test.ts`: `HEADHUNT`, `RAID`, `PLACE`, `VEST`, `BLOCK`, `LET_POACH_GO`, `PROMOTE`.
- **Second-person labels used below.** Task 1 defines the ones it uses as module-level constants in `playtest-fitted.test.tsx`, and each later task adds its own the same way. Re-check each against the view; the compiler's `actionLabel` makes them:
  - `ACQUIRE_L` = `Acquire a card in another player's operations`; `AGREE_L` = `Agree to the sale`; `REFUSE_L` = `Refuse the sale`;
  - `DIVEST_L` = `Divest a card in your operations`; `BUY_L` = `Buy a card in another player's operations`; `PASS_L` = `Pass on the sale`;
  - `PUBLISH_L` = `Publish a card from your strategy hand to a card in another player's operations`; `CLEAR_L` = `Clear a card in your operations`;
  - `INTEGRATE_L` = `Integrate a card from your operations to a card in your operations`;
  - `HEADHUNT_L` = `Headhunt with a card from your strategy hand to a card in another player's development team`;
  - `RAID_L` = `Raid with a card from your strategy hand to a card in another player's development team`;
  - `PLACE_L` = `Place a card from another player's development team to a card in your development or your operations`;
  - `VEST_L` = `Vest a card from your equity to a card in your development team`;
  - `BLOCK_L` = `Block the poach with a card from your strategy hand to a card in your development team`; `LET_GO_L` = `Let the poach go ahead`;
  - `PROMOTE_OPS_L` = `Promote a card in your ops team`;
  - 7-3's `ASSIGN`; `End your actions`; `Pay salaries`.

---

### Task 1: A card on a card of its own zone, drawn: the Client tucked under its Host

Before starting: re-check 4-3's `keepPlaced` (in `scene.ts`, `layout.ts` and `stackOnHolders`), 7-3's `stackOnHolders` order and `drawnCards`, `table-model.ts`'s `zoneIndex * 1000`, 8-1's `NEST_GAME`, and 8-2a's operations mark and `INTEGRATE`.

**Files:**
- Modify: `src/engine/core/layout.ts` (`data.z`), `src/engine/core/scene.ts` (`keepPlaced`'s doc), `src/engine/core/table-model.ts` (`ZONE_Z`), `src/engine/core/lang/fit-layout.ts` (`stackOnHolders`)
- Test (append): `src/engine/core/layout.test.ts`, `src/engine/core/lang/fit-layout.test.ts`, `src/pages/designer/playtest-fitted.test.tsx`

**Interfaces:**
- Consumes: `computeZoneLayout`, `holderIdOf`, `placeZone`, `STACK_GAP`, `STACK_STEP`, 7-3's `drawnCards`.
- Produces (for Tasks 2–6):

```ts
// table-model.ts — the z step between one zone's cards and the next zone's: zone i's cards stand at i * ZONE_Z and up
export const ZONE_Z = 1000;
// layout.ts — computeZoneLayout: a 'free' card, and a keepPlaced row's card that carries its own place, is drawn at its numeric
// data.z when it carries one; every other z is as before.
// fit-layout.ts — stackOnHolders(defs, cards), as before, and:
//  - a card hangs when the card it sits on is among `cards` in a zone of `defs` and the cards it sits on, walked up with a set of ids
//    seen, end at a card a slotted def places that sits on none of them (a root). A card in a loop, or on a chain ending in a free
//    zone, stays as it is.
//  - a slotted def's poses are worked out from its cards that don't hang, as its keepPlaced row then draws them;
//  - a root's column is the cards on it, each followed by its own column (depth first). Among the cards on one card: those of other
//    zones first, in the order of `defs`, then slot order; those of its own zone last, in slot order.
//  - each hanging card is a copy with data.x, data.y as before, and data.z = defs.length * ZONE_Z + k, k counting every hanging
//    card in column order, columns in the order their roots stand in `defs`.
//  - every other card of a free or keepPlaced def that carries x, y or z is a copy without them; every other card is the same object,
//    and the order is kept.
```

- `fit-layout.test.ts` gets a local `nested(cards)`, a 2-player `NEST_GAME` table built with `relocate` and `putOn`, as the steps below describe.

- [ ] **Step 1: Write the failing tests.**
  - **`layout.test.ts`,** `describe('a card that carries its own z')`:
    - a `'free'` zone at `(0, 0)` with `zBase` 3000 lays out `a` (`data: { x: 5, y: 6, z: 9002 }`) at `{ x: 5, y: 6, rotation: 0, scale: 1, z: 9002 }`, and `b` (`data: { x: 1, y: 1 }`) at z 3001;
    - a `'row'` with `keepPlaced` gives `a` z 9002 too;
    - (guard) a row without `keepPlaced` ignores `data.z`.
  - **`fit-layout.test.ts`,** `describe('cards on cards all the way down, and a card tucked under a card of its own zone')`. The table: `NEST_GAME`'s compiled zones, viewer p0, `seats = ['p0', 'p1']`, `defs = fittedLayout(zones, 'p0', seats)`. The cards, in this order:
    - `v`, a Vase in `workshop-p0`;
    - `s`, a Statue in `workshop-p0`, on `v`;
    - `w`, a Vase in `workshop-p0`, on no card;
    - `p`, a Potter in `crew-p0`, on `v`;
    - `k`, a Stake whose maker is p0 in `kit-p0`, on `p`;
    - `m`, a Smith in `crew-p0`, on `s`;
    - `h`, a Stake whose maker is p0 in `holdings-p1`, on `s`.

    The checks on `out = stackOnHolders(defs, cards)`:
    - **The row.** `computeZoneLayout(workshop def, out's workshop cards)` puts `v` and `w` where `computeZoneLayout(workshop def, [v, w])` puts them, as a row of two; `s` is at its own place.
    - **The column.** In order `p`, `k`, `s`, `h`, `m`: each at `v`'s x. `p`'s y is `v`'s y + `CARD_HEIGHT` + `STACK_GAP`, and each next one is lower by the same step, at most `STACK_STEP`.
    - **The z.** Their `data.z` are `defs.length * ZONE_Z` to `+ 4`, in that order.
    - `w` is the same object; the order of `out` is the order of `cards`.
    - **Loops.** Two Vases in `workshop-p0` whose `lang:on` name each other (set by hand) are the same objects in `out`.
    - **Stale places.** A Vase in `workshop-p0` on no card, given `data: { x: 1, y: 2, z: 3 }`, comes back without the three.
    - (guard) 1b-3's, 4-3's and 7-3's `stackOnHolders` tests pass, except a line in the named class.
  - **`playtest-fitted.test.tsx`,** `describe('a Client tucked under its Host')`, with `T = after(N, 3)` and `tab` local.
    - **The arrangement:** `setUp7()`, with:
      - a USB Gadget, a To-Do List and a Dating App in `operations-${S}`, in that order;
      - a Sales Rep `putOn` the USB Gadget in `ops-team-${S}`;
      - the Growth Hacker `putOn` the To-Do List in `ops-team-${S}`;
      - `tokenOf(…, S, 0)` held by N on the To-Do List, with `blue consultant` (7-3's `holding`).
    - **Refusals in words.** Mount (S's tab). Press `INTEGRATE_L` and `pickNamed('USB Gadget')`.
      - The target buttons before Cancel are pinned as the view gives them. Among them, `To-Do List` and `Dating App` are greyed (`aria-disabled` `true`), each with `title` `the target card can host the card`.
      - Press Cancel.
    - **Integrated.** Press `INTEGRATE_L`, `pickNamed('To-Do List')`, `pickNamed('USB Gadget')`. `lineOf(S)` still contains `3 actions`. Let `at` be the USB Gadget's pose from `computeZoneLayout(<the fitted operations def>, cardsIn(`operations-${S}`))`:
      - that def puts the USB Gadget and the Dating App where a row of the two alone puts them;
      - the Sales Rep is at `(at.x, at.y + 176)`;
      - the To-Do List, N's token and the Growth Hacker follow in that order at `at.x`, each lower than the last by the same step, at most `STACK_STEP`; each card's pose is read through `computeZoneLayout` of its own def;
      - their `z` rise in that order, and the Sales Rep's is above the USB Gadget's.
    - **Review Focus: Undo.** Press `Undo`:
      - the operations def spaces three cards again, the To-Do List among them;
      - no card of `table!.placement.cards` carries `data.z`;
      - N's token and the Growth Hacker hang under the To-Do List, in that order.
    - **How the numbers come:**
      - §10.B: a Device hosts App, Data, Media and AI, so the USB Gadget takes the To-Do List (App) but not the Dating App (Social); an App hosts nothing;
      - §10 / §6: Integrate costs no action;
      - 176 is `CARD_HEIGHT` 140 + `STACK_GAP` 36, as 4-3's Growth Hacker test has it.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/layout.test.ts src/engine/core/lang/fit-layout.test.ts src/pages/designer/playtest-fitted.test.tsx`. Expected: FAIL (`ZONE_Z` is missing; `s` is spaced in the row; the Growth Hacker hangs where the To-Do List stood in the row). The guards pass.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/engine src/pages src/games src/pages/hearts-demo`, then `bun run test` and `bun run typecheck`. A test in the named class reads the new `z`: list each.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/layout.ts src/engine/core/scene.ts src/engine/core/table-model.ts src/engine/core/lang/fit-layout.ts \
  src/engine/core/layout.test.ts src/engine/core/lang/fit-layout.test.ts src/pages/designer/playtest-fitted.test.tsx
# and each 4-3 or 7-3 test file Step 4 changed, named in the report
git commit -F - <<'EOF'
feat(designer): a card on a card of its own zone hangs under it on the fitted table, cards on cards hang all the way down in one column, and each is drawn over the one above it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: Stacks, marks and locked Equity in words

Before starting: re-check 7-3's `boardText` (the `{seat}'s ` entry, the `across` zone's list) and `cardsOnCards`' order; 4-3's `loneCounts` and the badge; 5-3's `keptBadges`; Task 1's arrangement; 8-2b's `locked equity` row and its zone id (`locked-equity-${seat}`).

**Files:**
- Modify: `src/pages/designer/board-text.ts` (`boardText`)
- Test (append): `src/pages/designer/board-text.test.ts`, `src/pages/designer/playtest-fitted.test.tsx`

**Interfaces:**
- Consumes: `cardsOnCards`, `joinAnd`, `nameWithPlayers` through `cardLabel`; Task 1's arrangement.
- Produces (for Tasks 4–6):
  - **`boardText`.** A card's entry is `{label}{ (…)}{ […]}{ with {cards on it of other zones}}{{,} over {cards on it of its own zone}}` (Page copy). Each list is in `cardsOnCards`' order, and each card in it is its own full entry.
  - **`playtest-fitted.test.tsx`, module level:**

```ts
/** `state` with `facts` (counts and flags it keeps) set on the card `id`, through changeCard. */
const marked = (state: GameState, id: string, facts: { [fact: string]: number | boolean }): GameState;
```

- [ ] **Step 1: Write the failing tests.**
  - **`board-text.test.ts`,** `describe('a card on a card of its own zone')`, on `NEST_GAME`, the cards of Task 1's `fit-layout` test without `w`:
    - the `workshop:` part of `boardText(game, cards, 'p0')` is `workshop: Vase with Potter with Stake, over Statue with Smith and p1's Stake whose maker is p0` (7-3: the kit's Stake is in its maker's own zone, so its maker goes without saying);
    - without `p` and `k` it is `workshop: Vase over Statue with Smith and p1's Stake whose maker is p0`;
    - (guard) the file's existing `boardText` tests pass unchanged.
  - **`playtest-fitted.test.tsx`,** `describe('stacks, marks and locked Equity in words')`, with `T = after(N, 3)`, `tab` and `boardOf` local.
    - **The stack.** Task 1's arrangement, with the To-Do List `putOn` the USB Gadget in `operations-${S}`. Mount.
      - `boardOf(S)`'s `operations:` part contains ``, over To-Do List`` after `with Sales Rep`.
      - It lists the Growth Hacker and `` `${N}'s Equity whose founder is ${S} (blue consultant)` `` after `To-Do List`.
      - It never lists `To-Do List` on its own: no `; To-Do List` and no `operations: To-Do List`.
    - **The marks** (guards). `setUp7()` with:
      - a Dating App in `development-${S}`, S's Junior Software Dev `putOn` it, `marked` `{ vest: 1 }`;
      - the Architect in `ops-team-${S}`, `marked` `{ cto: 1 }`;
      - two of S's tokens (`tokenOf(…, S, 0)`, `tokenOf(…, S, 1)`) moved to `locked-equity-${S}`;
      - S's Junior Hardware Eng on `bench-${S}`, `marked` `{ vest: 1 }`;
      - a Neobank in `operations-${N}`, `marked` `{ scandal: 2, 'for sale': true }`.

      Mount (S's tab):
      - `table!.decor![junior].badge` contains `1 vest`; the Architect's contains `1 cto`; the bench Junior Hardware Eng's is `1 vest` (5-3's off-Board label). Pin each whole as the view gives it.
      - `boardOf(S)` contains `Junior Software Dev [1 vest]` and `locked equity: Equity; Equity`.
      - `lineOf(S)` contains `equity 1` and `locked equity 2`.
      - `boardOf(N)` contains `Neobank` with `for sale` in its round brackets and `2 scandal` in its square brackets.
    - **Review Focus: the mark hides with its card.** Click N's tab:
      - `cardsIn(`bench-${S}`)` is `[]`;
      - no `decor` key is S's bench Junior's id;
      - `boardOf(S)` reads as on S's tab;
      - `document.body.textContent` names `1 vest` exactly once (the Board line's).
    - **How the numbers come:** §16.D.2 and R1: a Vest is one of the player's own Equity tokens locked on the employee; §11.G.2: a CTO likewise; §17.D: three tokens a player; §12.1: Scandal on a product; R1: the mark rides to the Bench and hides with the card there.
- [ ] **Step 2: Run** `bunx vitest run src/pages/designer/board-text.test.ts src/pages/designer/playtest-fitted.test.tsx`. Expected: the ` over ` checks FAIL; the marks and their hiding pass already (4-3's and 5-3's labels) and are guards, and the report says so.
- [ ] **Step 3: Implement** `boardText`'s ` over ` part.
- [ ] **Step 4: Run** `bunx vitest run src/pages src/engine src/games`, then `bun run test` and `bun run typecheck`. A pin of plans 8-2a or 8-2b that lists a Client in its Host's `with` part is in the named class: it reads ` over `. List each.
- [ ] **Step 5: Commit**

```bash
git add src/pages/designer/board-text.ts src/pages/designer/board-text.test.ts src/pages/designer/playtest-fitted.test.tsx
# and each test file Step 4 changed, named in the report
git commit -F - <<'EOF'
feat(designer): a card on a card of its own zone is listed on the Board line after "over", and the marks, Scandal and locked Equity are pinned on the page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: The price a press pays, before pressing

Before starting: re-check 6-3's `thenRefs`, and whether it reaches the lines after an ask line (8-1's `ASK_FRAME` ref stands among a button's effects). If it doesn't, walk the button's effects as it does and report it. Also re-check the private `readsOnlyCards` with 6-3's `centre`; `workedView` and `cardsKept`; `readSeatExtras`; 6-3's `placesOf` and `places`; the hover line in `playtest.tsx`; 8-1's two pay phrases and `TRADE_GAME`.

**Files:**
- Modify: `src/engine/core/lang/worked-view.ts` (`pressPrices`, `pricedNames`), `src/engine/core/lang/board-view.ts` (`PricesView`, `SeatExtras.prices`, `readSeatExtras`), `src/pages/designer/card-pick.ts` (`pickNotes`), `src/pages/designer/card-picker.tsx` (`notes`), `src/pages/designer/playtest.tsx` (the notes, the hover line)
- Test (append): `src/engine/core/lang/worked-view.test.ts`, `src/engine/core/lang/board-view.test.ts`, `src/pages/designer/card-pick.test.ts`, `src/pages/designer/card-picker.test.tsx`, `src/pages/designer/playtest-fitted.test.tsx`, `src/games/startup-simulator.test.ts`

**Interfaces:**
- Consumes: `thenRefs`, `readsOnlyCards`, `seesFace`, `cardsKept`, `runtime.workedValue`, `placesOf`.
- Produces (for Tasks 4–6):

```ts
// worked-view.ts
/** A button's press prices: the worked number its Then: lines first pay from the card it picks, and from its target card. */
export type PressPrice = { card?: string; target?: string };
/**
 * Each button's press prices, by its move (its words): the number of the first line `they pay its {attribute} to its owner` (the card)
 * and of the first line `they pay the target card's {attribute}` (the target), each kept when it is a worked number that readsOnlyCards.
 * A button with neither is left out.
 */
export function pressPrices(game: CompiledGame): { [move: string]: PressPrice };
/** Every number pressPrices names, once each, in game.worked order. */
export function pricedNames(game: CompiledGame): string[];
// board-view.ts
/** The press prices of each card on a Board whose face the seat sees, by card id, then by name; only the numbers the card has. */
export type PricesView = { [cardId: string]: { [name: string]: number } };
// SeatExtras gains prices?: PricesView: left out when no card has one. Each number is worked out in its own try, so a number the
// runtime throws at, or a card without it, leaves out that number alone. readSeatExtras accepts it (a map of maps of numbers).
// card-pick.ts
/** The notes on the entries of `move`'s picker: `{name} {n}` for each card or target whose press price the view gives. */
export function pickNotes(game: CompiledGame, move: string, prices: PricesView | undefined): { cards: { [id: string]: string }; targets: { [id: string]: string } };
// card-picker.tsx: CardPicker's props gain
notes?: { cards: { [id: string]: string }; targets: { [id: string]: string } };  // an entry with a note reads `{name} ({place}, {note})`
```

- **`playtest.tsx`:**
  - the `CardPicker` gets `notes={pickNotes(game, choosingCards.move, extras?.prices)}`;
  - the hover line ends with ` — {name} {n}` for each of `pricedNames(game)` in `extras.prices[id]`, joined by ` · ` (Page copy).

- [ ] **Step 1: Write the failing tests.**
  - **The fixture** (local to `worked-view.test.ts` and `board-view.test.ts`): `PRICED_GAME = TRADE_GAME + "\n\nWorth:\n  A card's worth goes up by the total skill of the cards on it."`. It compiles with `[]`.
  - **`worked-view.test.ts`,** `describe('pressPrices')`:
    - **The prices.** `pressPrices(compiled(PRICED_GAME))` is:
      - `{ "buy a card in another player's workshop": { card: 'worth' }, "bribe a card from their stash to a card in another player's crew": { target: 'wage' } }`;
      - `sell …` (`They get its worth.`) is left out.
    - `pricedNames` of it is `['wage', 'worth']`, in section order.
    - (guard) `TRADE_GAME` alone gives only the bribe: its `worth` is a column, not worked.
    - **Review Focus.** With `  A card's worth goes up by the total pay of the cards in the scrap.` added under `Worth:`, the buy is left out: the line reads beyond the card. If the line doesn't compile, use any group other than the cards on it, and say which.
    - (guard) The two patterns are registered effects of the library: each `get('effect', …)` is defined.
    - `pressPrices` of Hearts, Color Match, Venom and Rent Day is `{}`.
  - **`board-view.test.ts`,** `describe('the prices a press pays, as each seat is told them')`. A 3-player `PRICED_GAME` engine:
    - `workshop-p1` holds a Vase (worth 3), with a Potter (skill 1) and a Tinker on it in `crew-p1`;
    - `stash-p0` holds a Statue;
    - p0 to act.

    The checks:
    - `prices[vase]` is `{ worth: 5 }` (3, and the Potter's and the Tinker's skill 1 each), and `prices[potter].wage` and `prices[tinker].wage` are 1 (the Tinker's worked, the Potter's its column);
    - every seat's `seatExtras(…).prices` is the same;
    - **Review Focus:** no seat's `prices` has the Statue's id, not even p0's;
    - `readSeatExtras` takes the extras back whole, and refuses them with `prices: { x: { worth: 'a' } }`;
    - (guard) a Color Match view has no `prices` key.
  - **`card-pick.test.ts`,** `describe('pickNotes')`, on `PRICED_GAME`: for the bribe with `prices` `{ t1: { wage: 1 }, s1: { worth: 3 } }`, it is `{ cards: {}, targets: { t1: 'wage 1' } }`; for the buy, `{ cards: { s1: 'worth 3' }, targets: {} }`; for `stop`, both empty.
  - **`card-picker.test.tsx`,** `describe('notes')`. A `CardPickView` whose one card `s` (`Statue`) goes onto `c1` and `c2`, both `Vase`, with `places: { c1: "p1's workshop" }` and `notes: { cards: {}, targets: { c1: 'worth 4', c2: 'worth 3' } }`:
    - after picking `s`, the buttons read `Vase (p1's workshop, worth 4)` and `Vase (worth 3)`, with aria-labels `Pick ` and the same (the numbers are the test's own);
    - (guard) without `notes`, the existing tests pass unchanged.
  - **`startup-simulator.test.ts`,** append `it('names the prices a press pays: the M&A Price to buy, the poaching fees to poach (§7, §16.B)')`:
    - `pressPrices(game)` is `{ [ACQUIRE]: { card: 'sale price' }, [BUY]: { card: 'sale price' }, [HEADHUNT]: { target: 'poach fee' }, [RAID]: { target: 'raid fee' } }`;
    - `pricedNames(game)` is `['sale price', 'poach fee', 'raid fee']`.
    - If HEAD's `readsOnlyCards` leaves out `poach fee` or `raid fee` (through `cost` or the Event's flags), stop and report: 6-3's `centre` reading is meant to keep them.
  - **`playtest-fitted.test.tsx`,** `describe('the price before pressing')`, with `tab` and `hover`/`detail` local (as 6-3's hover describe has them).
    - **The arrangement:** `setUp7()` with:
      - a Neobank in `operations-${N}`, `marked` `{ hype: 1, bugs: 1 }`;
      - a Dating App in `development-${N}`, with the Hacker `putOn` it in `development-team-${N}`;
      - a To-Do List in `operations-${S}`;
      - S's Junior Software Dev left on `bench-${S}`;
      - the first Headhunter and the first Corporate Raider in `strategy-hand-${S}`.
    - Mount (S's tab).
    - **Acquire.** Press `ACQUIRE_L`. The button `` `Neobank (${N}'s operations, sale price 16)` `` is greyed with `title` `they have at least the card's sale price in capital`. Press Cancel.
    - **Headhunt.** Press `HEADHUNT_L` and `pickNamed('Headhunter')`. The target `` `Hacker (${N}'s development team, poach fee 12)` `` is greyed with `title` `they have at least the card's price plus the target card's poach fee in capital`. Press Cancel.
    - **Raid.** Press `RAID_L` and `pickNamed('Corporate Raider')`. The target reads `` `Hacker (${N}'s development team, raid fee 9)` ``. Press Cancel.
    - **Hover.**
      - `hover(toDo)`: `detail()` ends with ` — sale price 6`.
      - **Review Focus:** `hover(<S's bench Junior>)`: `detail()` contains no `fee` and no `sale price`.
      - Click N's tab. `hover(neobank)`: `detail()` ends with ` — sale price 16`. `hover(hacker)`: it ends with ` — poach fee 12 · raid fee 9`.
    - **How the numbers come:**
      - §7: a Tier 2 product is $12, +$5 for each Hype, −$1 for each Bug: 16 (the spec's example); a Tier 1 is $6;
      - §16.B, §20.B: the Hacker's printed $6 with no tokens, ×2 = 12 to a Headhunter, ×1.5 = 9 to a Corporate Raider;
      - §20.A: the Headhunter costs $0 and the Corporate Raider $2; S has 7.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/worked-view.test.ts src/engine/core/lang/board-view.test.ts src/pages/designer/card-pick.test.ts src/pages/designer/card-picker.test.tsx src/pages/designer/playtest-fitted.test.tsx src/games/startup-simulator.test.ts`. Expected: FAIL (`pressPrices`, `prices`, `pickNotes` and `notes` are missing).
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `SeatExtras`.
- [ ] **Step 4: Run** `bunx vitest run src/engine src/pages src/games`, then `bun run test` and `bun run typecheck`.
  - A hover pin of 6-3 or 7-3 for a card that now has a press price, and a whole-view comparison of a game with one, are in the named class: they gain the prices. List each.
  - Report the long runs' time against BASE.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/worked-view.ts src/engine/core/lang/board-view.ts src/pages/designer/card-pick.ts \
  src/pages/designer/card-picker.tsx src/pages/designer/playtest.tsx src/engine/core/lang/worked-view.test.ts \
  src/engine/core/lang/board-view.test.ts src/pages/designer/card-pick.test.ts src/pages/designer/card-picker.test.tsx \
  src/pages/designer/playtest-fitted.test.tsx src/games/startup-simulator.test.ts
# and each test file Step 4 changed, named in the report
git commit -F - <<'EOF'
feat(designer): a button that pays a card's price shows it beside each card it may pick, and the hover line shows a card's prices, read only from what every seat sees

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: Products changing hands through the seat tabs: consent, the Market Sale, the Fire Sale, the Hit Piece and the crisis step

Before starting: re-check 7-3's `waitingLine`, `waitingText`, `setUp7`, `tokenOf`, `holding`; 4-3's `seatButtons`; 8-2a's phases, Hints and buttons; `setCounter` in `board-state.ts`; Tasks 1–3's helpers. Read each Hint from the compiled game (`hint('consent')`, …).

**Files:**
- Test (append): `src/pages/designer/playtest-fitted.test.tsx`, `src/pages/designer/playtest.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–3; 7-3's waiting line and helpers. Produces no page code (Call 5).
- Status lines: 7-1 keeps a window and an ask out of the interrupted turn, so an asked seat's status is `seat: {seat} — Your turn — {Hint}`. If HEAD marks an ask as an interrupted turn, every such status below reads `… — {phase} — Your turn — …` as `seatStatus` writes it: pin that and report it.

- [ ] **Step 1: Write the tests.** Every test here is a guard: Tasks 1–3, 7-3 and 8-1 already provide what it checks.
  - **`playtest-fitted.test.tsx`,** `describe('products changing hands through the seat tabs')`, with `T = after(N, 3)`, `tab`, `boardOf`, `hover` and `detail` local.
  - **Consent.** `setUp7()` with a Dating App in `operations-${N}`, and S's Junior Software Dev in `ops-team-${S}`. Mount; press `ACQUIRE_L` and `` pickNamed(`Dating App (${N}'s operations, sale price 6)`) ``.
    - `` tab(`${N} — to act`) `` is selected, and `status()` is `` `seat: ${N} — Your turn — ${hint('consent')}` ``.
    - `waitingText()` is `` `${S} wants to acquire a card in another player's operations: Dating App.` ``, and `seatButtons()` is `[AGREE_L, REFUSE_L]`.
    - `hover(dating)`: `detail()` ends with ` — sale price 6`.
    - **S's tab.** Click it:
      - `status()` is `` `seat: ${S} — ${hint('consent')} — waiting for ${N}` ``;
      - every seat button has `aria-disabled` `true`.

      Click N's tab.
    - **Review Focus: Undo.** Press `Undo`:
      - `` tab(`${S} — to act`) `` is selected;
      - there is no waiting line;
      - `lineOf(S)` starts `` `${S} 7 capital, 3 actions` ``.

      Press `ACQUIRE_L` and pick the Dating App again.
    - Press `AGREE_L`. Then:
      - `` tab(`${S} — to act`) `` is selected;
      - `lineOf(S)` starts `` `${S} 1 capital, 2 actions` `` and `lineOf(N)` `` `${N} 13 capital` ``;
      - `boardOf(S)` contains `Dating App`, and `lineOf(N)` contains `operations 0`.
    - **Refused.** The same table, with `REFUSE_L` pressed instead: `lineOf(S)` starts `` `${S} 7 capital, 2 actions` ``, and `boardOf(N)` contains `Dating App`.
  - **Review Focus: the Host sold.** `setUp7()` with:
    - a USB Gadget and a To-Do List in `operations-${N}`, the To-Do List `putOn` the USB Gadget there;
    - `tokenOf(…, N, 0)` held by T on the USB Gadget, with `blue consultant`;
    - S's Junior Software Dev in `ops-team-${S}`.

    S acquires the USB Gadget and N agrees. Then:
    - on N's tab, `cardsIn(`operations-${N}`)` holds the To-Do List with no `x`, `y` or `z` in its data;
    - `boardOf(N)` contains no ` over `;
    - `boardOf(S)` contains `USB Gadget` and no `To-Do List`;
    - `boardOf(T)`'s `portfolio:` part has no ` on ` (7-3's forward note: a sale sends the Consultant back, and the page follows the view).
  - **The Market Sale and the Fire Sale.** `setUp7()` with:
    - a Dating App and a To-Do List in `operations-${S}`;
    - N's and T's Junior Software Devs in their ops teams.

    Mount; press `DIVEST_L` and `pickNamed('Dating App')`.
    - `` tab(`${N} — to act`) `` is selected.
    - `status()` ends with `hint('market sale')`, and `waitingText()` is `` `${S} wants to divest a card in their operations: Dating App.` ``.
    - `boardOf(S)` contains `Dating App` with `for sale` in its round brackets.
    - Press `PASS_L`: `` tab(`${T} — to act`) `` is selected, and the waiting line is unchanged.
    - Press `BUY_L`. The picker's buttons before Cancel are pinned as the view gives them, among them:
      - `` `Dating App (${S}'s operations, sale price 6)` ``, live;
      - `` `To-Do List (${S}'s operations, sale price 6)` ``, greyed with `title` `it is for sale`.

      Pick the Dating App. Then:
      - `` tab(`${S} — to act`) `` is selected;
      - `lineOf(S)` starts `` `${S} 13 capital, 2 actions` `` and `lineOf(T)` `` `${T} 1 capital` ``;
      - `boardOf(T)` contains `Dating App`, and no Board line contains `for sale`.
    - **The Fire Sale.** The same table, N and T each pressing `PASS_L`:
      - `lineOf(S)` starts `` `${S} 10 capital, 2 actions` ``;
      - `inOrder('open-idea-pool')` contains the Dating App.
    - **Review Focus: nobody asked.** The same table with N's and T's capital at 2 (`setCounter`). After the divest:
      - `` tab(`${S} — to act`) `` is selected, and no other tab's name ends `— to act`;
      - there is no waiting line;
      - `lineOf(S)` starts `` `${S} 10 capital, 2 actions` ``.
  - **The Hit Piece.** `setUp7()` with:
    - the first Hit Piece in `strategy-hand-${S}`;
    - a Dating App in `operations-${N}` and a To-Do List in `operations-${T}`;
    - `tokenOf(…, T)` held by S.

    Mount; press `PUBLISH_L` and `pickNamed('Hit Piece')`.
    - The targets before Cancel include `` `Dating App (${N}'s operations)` ``, live, and `` `To-Do List (${T}'s operations)` ``, greyed with `title` `they have no card in their portfolio whose founder is the target card's owner`.
    - Pick the Dating App. Then:
      - `lineOf(S)` starts `` `${S} 4 capital, 3 actions` ``;
      - `boardOf(N)` contains `1 scandal`, and so does the Dating App's label on N's tab.
  - **The crisis step.** `setUp7()` with:
    - a Dating App and a To-Do List in `operations-${S}`, `marked` `{ scandal: 2 }` and `{ scandal: 1 }`;
    - a QA Engineer in `ops-team-${S}`, `marked` `{ badged: true, 'training xp': 1 }`.

    Mount; press `End your actions`.
    - `status()` is `` `seat: ${S} — Your turn — ${hint('crisis')}` ``, and `seatButtons()` is `[CLEAR_L]`.
    - Press `CLEAR_L` and `pickNamed('Dating App')`: `status()` still ends with `hint('crisis')`, and `boardOf(S)` contains `1 cleared scandal`.
    - Press `CLEAR_L` and `pickNamed('To-Do List')`: `` tab(`${N} — to act`) `` is selected, and `boardOf(S)` contains `Dating App` with `1 scandal` and no `cleared`.
  - **How the numbers come:**
    - §7: a Tier 1 product is $6. 7 − 6 = 1 and 7 + 6 = 13; 7 + 6 = 13 and 7 − 6 = 1; the Fire Sale's 50% rounded down is 3, 7 + 3 = 10.
    - §6: Acquisition and Divest cost 1 action. Ruling 22: a refused sale spends it.
    - §7.2 and the spec's call: rivals are asked in turn from the seller's left, only those with the price and spare bandwidth (each has Blue 1 from its Junior). §10.D: a sale breaks the stack.
    - §20.A: the Hit Piece costs $3 and no action; §17.B.2: never on a Founder whose Equity you hold.
    - §11.D.1: a Director of QA with 1 XP removes 2 Scandal, before any Bug, so S picks with 3.
  - **`playtest.test.tsx`,** `describe('an ask that names a card the asked seat cannot see')`. This is the general guard for an ask's prompt.
    - The game: `ASK_GAME` with the claim's `      Move it to the scrap.` moved below its ask line, as 8-1 Task 7's Review Focus builds it (reuse that text; each `.replace` must find what it replaces, so assert it).
    - Assert whether the page is fitted at 3 seats, and read each seat's panel side by side, or each seat's tab in turn.
    - The arrangement, 3 players, p0 to act in working:
      - `stash-p0` holds a Statue;
      - `workshop-p1` holds a Vase with a Smith on it in `crew-p1`;
      - `purse-p1` holds a Stake whose maker is p1.
    - p0 claims the Statue to the Smith through p0's panel.
    - Each seat's panel shows one `waiting` line:
      - p0's is `p0 wants to claim a card from their stash to a card in another player's crew: Statue to Smith.`;
      - p1's and p2's are `p0 wants to claim a card from their stash to a card in another player's crew: a face-down card to Smith.`
    - Neither p1's nor p2's panel text contains `Statue`.
- [ ] **Step 2: Run** `bunx vitest run src/pages/designer/playtest-fitted.test.tsx src/pages/designer/playtest.test.tsx`. Expected: PASS. If a test fails, stop and report it: it is a page gap, not something to work around.
- [ ] **Step 3: Run** `bunx vitest run src/pages src/engine src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 4: Commit**

```bash
git add src/pages/designer/playtest-fitted.test.tsx src/pages/designer/playtest.test.tsx
git commit -F - <<'EOF'
feat(designer): Acquisition's consent, the Market Sale and the Fire Sale, the Hit Piece and the crisis step are played through the seat tabs, and an ask names a card only as the asked seat sees it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: People changing hands through the seat tabs: the counter-offer, the placing step and the CTO; and the two Event cells

Before starting: re-check 8-2b's phases, Hints and buttons; the Event table's Recruiter Frenzy and Headhunter Holiday rows; 7-3's Venture Capital Rain test; 6-3's `inPlay` and `inPlayLine`; Tasks 1–4's helpers.

**Files:**
- Modify: `src/games/startup-simulator.rules` (two `effect` cells)
- Test (append): `src/games/startup-simulator.test.ts` (and its named line), `src/pages/designer/playtest-fitted.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–4. Produces no page code (Calls 5–6).
- **The two rows** drop ` Not in effect yet.` from their `effect` cell, and nothing else in them changes. At the time of writing (6-3):

```text
    | Recruiter Frenzy             | The poach multiplier is x1 instead of x2 this round; Token Value still counts. | 1 |
    | Headhunter Holiday           | Hostile Offers (Poaching) are suspended this round. | 1 |
```

- [ ] **Step 1: Write the tests.**
  - **`startup-simulator.test.ts`.**
    - **Changed line.** In 7-3's `it('says Venture Capital Rain is in effect now that Invest is (§20.D 1)')`, the Events whose effect ends `Not in effect yet.` are exactly `Whistleblower Protection Act`.
    - Append `it('says Recruiter Frenzy and Headhunter Holiday are in effect now that poaching is (§20.D 13, 15)')`. Their `effect`s are `The poach multiplier is x1 instead of x2 this round; Token Value still counts.` and `Hostile Offers (Poaching) are suspended this round.`
  - **`playtest-fitted.test.tsx`,** `describe('people changing hands through the seat tabs')`, with `T = after(N, 3)`, `tab` and `boardOf` local.
    - **Arrangement P:** `setUp7()` with:
      - the first two Headhunters in `strategy-hand-${S}`;
      - a To-Do List in `development-${S}` and a USB Gadget in `operations-${S}`;
      - a Dating App in `development-${N}`, with N's Junior Hardware Eng and Junior QA Tester `putOn` it in `development-team-${N}`;
      - the first Cease & Desist in `strategy-hand-${N}`.
    - **The counter-offer and a Vest.** Mount P. Press `HEADHUNT_L`, `pickNamed('Headhunter')` and `` pickNamed(`Junior Hardware Eng (${N}'s development team, poach fee 4)`) ``.
      - `` tab(`${N} — to act`) `` is selected, and `status()` is `` `seat: ${N} — Your turn — ${hint('counter-offer')}` ``.
      - `waitingText()` is `` `${S} wants to headhunt with a card from their strategy hand to a card in another player's development team: Headhunter to Junior Hardware Eng.` ``.
      - `seatButtons()` is `[VEST_L, BLOCK_L, LET_GO_L]`, and `lineOf(S)` starts `` `${S} 3 capital, 3 actions` ``.
      - The Junior Hardware Eng's label on N's tab contains `poached`.
      - **Review Focus: Undo.** Press `Undo`: `` tab(`${S} — to act`) `` is selected, there is no waiting line, no label contains `poached`, and `lineOf(S)` starts `` `${S} 7 capital` ``. Headhunt again as above.
      - Press `VEST_L`, `pickNamed('Equity')` (the first) and `pickNamed('Junior Hardware Eng')`. The target `Junior QA Tester` was greyed with `title` `the target card is poached`. Then:
        - `` tab(`${S} — to act`) `` is selected, and `lineOf(S)` starts `` `${S} 7 capital, 3 actions` ``;
        - `boardOf(N)` contains `Junior Hardware Eng [1 vest]` and `locked equity: Equity`;
        - `lineOf(N)` contains `equity 2` and `locked equity 1`.
      - Press `HEADHUNT_L` and `pickNamed('Headhunter')`: `` `Junior Hardware Eng (${N}'s development team, poach fee 4)` `` is greyed with `title` `the target card is not safe from poaching`. Press Cancel.
    - **A Cease & Desist.** Mount P. Headhunt the Junior QA Tester. On N's tab press `BLOCK_L`, `pickNamed('Cease & Desist')`, `pickNamed('Junior QA Tester')`. Then:
      - `` tab(`${S} — to act`) `` is selected, and `lineOf(S)` starts `` `${S} 7 capital` ``;
      - `inOrder('strategy-discard')` names the Headhunter and the Cease & Desist.
    - **Review Focus: the window reads public facts only.**
      - Mount P, headhunt the Junior QA Tester, click S's tab and keep `document.body.textContent`.
      - Mount P with a Hit Piece in `strategy-hand-${N}` in place of the Cease & Desist, and do the same.
      - The two texts are equal.
      - On N's tab in the second, `BLOCK_L` is greyed: pin its reason as the view gives it.
    - **Let go, and the placing step.** Mount P. Headhunt the Junior QA Tester; on N's tab press `LET_GO_L`.
      - `` tab(`${S} — to act`) `` is selected, and `status()` is `` `seat: ${S} — placing — Your turn — ${hint('placing')}` `` as `seatStatus` writes an interrupt.
      - `seatButtons()` is `[PLACE_L]`.
      - Press `PLACE_L`. The picker's buttons before Cancel are `` `Junior Hardware Eng (${N}'s development team)` ``, greyed with `title` `it is poached`, and `` `Junior QA Tester (${N}'s development team)` ``, live.
      - Pick the Junior QA Tester. Its targets before Cancel are `To-Do List` and `USB Gadget`, both live.
      - **Review Focus: Undo.** Press `Undo`. It takes back N's let-go, so the counter-offer waits again:
        - `` tab(`${N} — to act`) `` is selected, the picker is gone, and `waitingText()` is back;
        - the Junior QA Tester's label still contains `poached`.

        Press `LET_GO_L` again, then `PLACE_L`, and pick the Junior QA Tester.
      - `click(toDo)` on the canvas: the press is sent (the target taken by a click, 3-2). Then:
        - `status()` ends with `hint('actions')`;
        - `boardOf(S)` contains `To-Do List` and `with Junior QA Tester (onboarding)`;
        - `lineOf(S)` starts `` `${S} 3 capital, 3 actions` ``.
    - **Review Focus: nobody asked.** P with N's three tokens moved to `portfolio-${T}` and the Cease & Desist moved to the strategy discard. Headhunt the Junior QA Tester:
      - `` tab(`${S} — to act`) `` is selected, and `status()` ends with `hint('placing')`;
      - no other tab's name ends `— to act`, and there is no waiting line.
    - **The CTO.** `setUp7()` with the Architect in `ops-team-${S}`. Mount; press `PROMOTE_OPS_L` and `pickNamed('Architect')`. Then:
      - `lineOf(S)` starts `` `${S} 2 capital, 2 actions` `` and contains `equity 2` and `locked equity 1`;
      - the Architect's label contains `1 cto`;
      - `PROMOTE_OPS_L` is greyed: pin its reason as the view gives it (the one-CTO guard's words).
    - **The two Events.**
      - Mount P's arrangement built on `inPlay(setUp(), 'Recruiter Frenzy')` in place of `setUp7()`: `inPlayLine()` is `event in play: Recruiter Frenzy — effect The poach multiplier is x1 instead of x2 this round; Token Value still counts.`
      - There, after `HEADHUNT_L` and `pickNamed('Headhunter')`, the target reads `` `Junior Hardware Eng (${N}'s development team, poach fee 2)` ``.
      - Under `'Headhunter Holiday'`, the line ends `effect Hostile Offers (Poaching) are suspended this round.`, and every headhunt target is greyed with `title` `the target card is not safe from poaching`.
    - **How the numbers come:**
      - §16.B, §16.C: a raw Junior's fee is (2 + 0) × 2 = $4, paid to the bank, for no action: 7 − 4 = 3. §20.D 13: Recruiter Frenzy makes it ×1, $2.
      - §16.D.2, ruling 24: a Vest or a Cease & Desist cancels the poach and refunds the fee: 3 + 4 = 7.
      - §17.D and R1: the Vest locks one of N's three tokens, leaving 2.
      - R4: the window opens on a token in supply or a card in hand, whatever the card.
      - §16.D.3: the employee joins the poacher's project with an Onboarding Token.
      - §11.G.2: a CTO costs 1 action and $5: 7 − 5 = 2; one per player.
      - §20.D 15: Headhunter Holiday suspends poaching.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts src/pages/designer/playtest-fitted.test.tsx`. Expected:
  - the two Event tests and the two in-play lines FAIL;
  - the page flows pass already (Calls 5–6, Tasks 1–4) and are guards; the report says so.
  - If a guard fails for another reason, stop and report it: it is a page gap, not something to work around.
- [ ] **Step 3: Change the two `effect` cells** as above. If a Startup line now reads two ways (an `ambiguous` diagnostic), stop and report it.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages src/engine`, then `bun run test` and `bun run typecheck`. Startup compiles with `[]`, and its example count is unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(designer): the counter-offer, the placing step and the CTO are played through the seat tabs, the poacher's panel says nothing of the victim's hand, and Recruiter Frenzy and Headhunter Holiday say they are in effect

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 6: The browser check, the README and the final checks

**Files:**
- Modify: `README.md`
- Browser scripts and screenshots go only in `SCRATCH=/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-8-3`.

**Interfaces:** Consumes Tasks 1–5. Produces nothing new.

- [ ] **Step 1: The probe.** Write `$SCRATCH/probe.ts` and run it with `bun`. It reads `src/games/startup-simulator.rules` and makes these edits:
  - it removes `  The start player is chosen at random.`;
  - it changes `  Each player has 7 capital that everyone can see.` to `  Each player has 30 capital that everyone can see.`;
  - it adds this block right after `  3 new Equity cards go to each equity, each naming its owner as its founder.`, before Setup's deal:

```text
  Move the whistleblower protection act from the event deck to the box.
  Move the whistleblower protection act from the box to the event deck.
  Move the usb gadget from the seed deck to p0's operations.
  Move the to-do list from the seed deck to p0's operations.
  Move the architect from the talent deck to p0's ops team.
  Move the hit piece from the strategy deck to p0's strategy hand.
  Move the dating app from the seed deck to p1's operations.
  Move the junior software dev from p1's bench to p1's ops team.
  Move the smart lock from the seed deck to p1's development.
  A new Junior QA Tester goes to p1's bench.
  Move the cease & desist from the strategy deck to p1's strategy hand.
  Move the neobank from the growth deck to p2's operations.
  Move the junior software dev from p2's bench to p2's ops team.
  Move the headhunter from the strategy deck to p2's strategy hand.
  Move the headhunter from the strategy deck to p2's strategy hand.
  Move the headhunter from the strategy deck to p2's strategy hand.
```

  The checks, for a 3-player engine at each of seeds 1 to 10:
  - the edited rules compile with no diagnostics;
  - p0 is to act, in `actions` (each seat's first ops check passes: its products' maintenance fits its ops team), and each seat has 30 capital;
  - the Whistleblower Protection Act is in play;
  - every card named above is where its line puts it; p1's bench holds a Junior Hardware Eng and two Junior QA Testers; p2's strategy hand holds three Headhunters.

  If a check fails at HEAD (a zone or card named otherwise, or a step that stops for a press), stop and report it.
- [ ] **Step 2: The browser check.** Copy 7-3's `$SCRATCH/../browser-7-3/check.cjs` helpers: `at()`, `rowCard()`, `STRIP`, `BOARD`, `hover`, `click`, the launch, the error collection, `waitFor`, `press`, `pressIn`, `group`, `line`.
  - **Setup.**
    - Regenerate `zones.json` for p0, p1 and p2 from `fittedLayout(game.zones, viewer, ['p0', 'p1', 'p2'])` on the probe's rules, and work a hanging card's place out with `stackOnHolders` as the page does.
    - Run the dev server on 5173 with `--strictPort`, polled with `curl -sf`.
    - Use Chromium with `['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']` and a viewport of `1600 × 3200`.
    - Expect no `pageerror` and no console error.
    - Load the Startup Simulator sample, fill `Rules` with the probe's text, choose `3` and press `Play`.
    - Whenever a turn starts in Income (the status reads Income's hint), press `Pay salaries`. A turn that stops at any other step not listed below: stop and report it with a screenshot.
  - **Screenshots.** Each must show what is listed after it.
    1. **`01-table.png`:** each seat's tableau line contains `locked equity 0`; `board-p0` contains `operations: USB Gadget` and `To-Do List`; p0's canvas shows both products in the operations row.
    2. **`02-integrate.png`.** p0 presses `INTEGRATE_L` and picks `USB Gadget`: the target `To-Do List` is greyed. Cancel, press it again and pick `To-Do List`, then `USB Gadget`.
       - The To-Do List hangs under the USB Gadget, its strip clear of the card above.
       - `board-p0` contains `USB Gadget`, then ` over To-Do List`.
       - p0's line still reads `3 actions`.
    3. **`03-consent.png`.** p0 presses `ACQUIRE_L`: the picker lists `Dating App (p1's operations, sale price 6)` and `Neobank (p2's operations, sale price 12)`, both live. Pick the Dating App.
       - The `p1 — to act` tab is selected, and the status reads the consent Hint.
       - The waiting line reads `p0 wants to acquire a card in another player's operations: Dating App.`, in p0's colour.
       - Hovering the Dating App, the hover line ends `sale price 6`.
    4. **`04-agree.png`.** p1 presses `AGREE_L`.
       - The `p0 — to act` tab is selected; p0's line starts `p0 24 capital, 2 actions`, and p1's `p1 36 capital`.
       - p0's operations row holds the Dating App beside the USB Gadget.
    5. **`05-market-sale.png`.** p0 presses `DIVEST_L` and picks `Dating App`.
       - The `p1 — to act` tab is selected; the waiting line reads `p0 wants to divest a card in their operations: Dating App.`
       - `board-p0` names the Dating App `for sale`.
       - p1 presses `BUY_L`: the picker lists `Dating App (p0's operations, sale price 6)` live. Cancel, and press `PASS_L`.
    6. **`06-fire-sale.png`.**
       - The `p0 — to act` tab is selected; p0's line starts `p0 27 capital, 1 action`.
       - The open idea pool on the shared table shows the Dating App.
    7. **`07-hit-piece.png`.** p0 presses `PUBLISH_L`, picks `Hit Piece` and `Neobank (p2's operations)`.
       - p0's line starts `p0 24 capital, 1 action`.
       - `board-p2` contains `1 scandal`.
    8. **`08-cto.png`.** p0 presses `PROMOTE_OPS_L` and picks `Architect`. p0 is out of actions, so its turn runs on to p1's and the `p1 — to act` tab is selected. Click p0's tab:
       - the Architect's label reads `1 cto`;
       - `board-p0` contains `locked equity: Equity`, and p0's tableau line `equity 2` and `locked equity 1`.

       Click p1's tab.
    9. **`09-assign.png`.** p1 presses `ASSIGN`, picks the Junior Hardware Eng and both Junior QA Testers, confirms, and picks `Smart Lock`. Then p1 presses `End your actions`.
       - The `p2 — to act` tab is selected.
       - `board-p1` lists the three under the Smart Lock.
    10. **`10-counter-offer.png`.** p2 presses `HEADHUNT_L`, picks `Headhunter` and `Junior Hardware Eng (p1's development team, poach fee 4)`.
        - The `p1 — to act` tab is selected, and the status reads the counter-offer Hint.
        - The waiting line reads `p2 wants to headhunt with a card from their strategy hand to a card in another player's development team: Headhunter to Junior Hardware Eng.`
        - On p1's canvas the Junior Hardware Eng's label reads `poached`, and its hover line ends `poach fee 4 · raid fee 3`.
    11. **`11-vest.png`.** p1 presses `VEST_L`, picks `Equity` and `Junior Hardware Eng`.
        - The `p2 — to act` tab is selected; p2's line starts `p2 30 capital`.
        - On p2's page, `board-p1` contains `Junior Hardware Eng [1 vest]` and `locked equity: Equity`.
    12. **`12-refused.png`.** p2 presses `HEADHUNT_L` and picks `Headhunter`: `Junior Hardware Eng (p1's development team, poach fee 4)` is greyed, its hover title `the target card is not safe from poaching`. Cancel.
    13. **`13-block.png`.** p2 headhunts the first Junior QA Tester; p1 presses `BLOCK_L` and picks `Cease & Desist` and that Junior QA Tester.
        - The `p2 — to act` tab is selected; p2's line starts `p2 30 capital`.
    14. **`14-placing.png`.** p2 headhunts the other Junior QA Tester; p1 presses `LET_GO_L`.
        - The `p2 — to act` tab is selected; the status reads the placing Hint.
        - p2 presses `PLACE_L`, picks `Junior QA Tester (p1's development team)` and `Neobank`.
        - p2's ops team row shows the Junior QA Tester labelled `onboarding`, and p2's line starts `p2 26 capital`.
    15. **`15-color-match.png`.** Color Match at 3: three panels as before, with no waiting line, no note and no new label.
  - **Afterwards.**
    - Open every PNG (Read) and check it against its list.
    - Judge each strip's readability where a Client hangs under its Host, and each note's on a picker entry. Report one whose corner index or label is covered, or that can't be read.
    - Stop the dev server.
  - **How the numbers come:**
    - §7: the Dating App is Tier 1, $6, so 30 − 6 = 24 and 30 + 6 = 36; the Neobank is Tier 2, $12. The Fire Sale pays 50% rounded down, 3: 24 + 3 = 27.
    - §7.2: p1 has the price and Blue room 1 from its Junior; p2's Blue room is 1 − 1 (the Neobank) = 0, so p2 isn't asked.
    - §20.A: the Hit Piece costs $3, 27 − 3 = 24. §11.G.2: the CTO costs $5 and an action: 24 − 5 = 19, and p0's third action ends its turn.
    - §16.B: a raw Junior is 2 × 2 = $4 to a Headhunter and 2 × 1.5 = $3 to a Corporate Raider. §16.D.2: a Vest or a Cease & Desist refunds it, 26 + 4 = 30; let go, p2 has 26.
    - §16.D.3: the employee joins the poacher's ops team with an Onboarding Token.
    - §4: three Juniors on each bench at setup, and the probe adds one.
- [ ] **Step 3: Update the README.**
  - **"A table too big for one screen", `The other seats`.** Add:
    - a card on a card of its own zone hangs under it, last in its column, and cards on cards hang all the way down, each followed by its own;
    - a button that pays a card's price shows it beside each card in its picker, and the hover line ends with a card's prices.
  - **`The Board`.** Add: a card on a card of its own zone follows ` over ` (`Vase with Potter, over Statue`).
  - **"Buttons that pick cards", `In the playtest`.** Add: an entry the press pays a price for reads `(p1's workshop, worth 4)`.
  - **Plan 8-1's paragraph.** Add an `In the playtest` bullet before its `Startup Simulator` bullet, naming the three points above and that an ask's waiting press is written out as 7-3's window is.
  - **Its `Startup Simulator` bullet.** Add the page:
    - the Client under its Host;
    - Vest, CTO and Scandal labels and the locked equity row;
    - the M&A Price and the poaching fees before pressing;
    - consent, the Market Sale, the counter-offer and the placing step through the tabs.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests. Then run these checks over `BASE..HEAD`. Each must print nothing, except where noted.

```bash
# Startup Simulator's words in shared code, slices 3–8, tests included
git diff "$BASE" -- src/engine src/pages src/utils ':!src/pages/designer/designer-page.test.tsx' ':!src/pages/designer/playtest-fitted.test.tsx' \
  ':!src/pages/designer/tableaux.test.ts' ':!src/pages/designer/samples.ts' | grep '^+[^+]' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share|tags?|leads?|leading|licen[cs]es?|tiers?|stall(s|ed|ing)?|sectors?|expertise|modes?|bandwidths?|bugs?|qa|online|offline|maint(enance)?|suppl(y|ies)|demands?|xp|pending|skills?|badged|ranks?|mentor(s|ed|ing)?|synerg(y|ies)|agile|graduat(e|es|ed|ing|ion)|training|trained|brainstorm(s|ed|ing)?|strateg(y|ies)|milestones?|seniors?|workaholics?|clean coders?|visionar(y|ies)|toxic|burnouts?|flight risks?|techcrunch|design sprints?|cease|desist|hype|utilit(y|ies)|buffs?|debuffs?|venture capital|bubbles?|patents?|trolls?|angels?|investors?|legacy|regulations?|audits?|open source|hackathons?|chip shortage|crunch|server crash|logjam|frenz(y|ies)|interns?|headhunters?|course boom|whistleblowers?|trade show|events?|equit(y|ies)|founders?|consultants?|dividends?|veto(es|ed|ing)?|partners?(hips?)?|immunit(y|ies)|portfolios?|buybacks?|stocks?|poach(es|ed|ing)?|vest(s|ed|ing)?|cto|acquisitions?|fire sales?|hit pieces?|scandals?|integrations?|hosts?|hosting|clients?|crisis|m&a|divest(s|ed|ing)?|raiders?|market sales?|counter-offers?)\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# the rules: only the two Event rows changed (prints each as removed and as added)
git diff "$BASE" -- src/games/startup-simulator.rules | grep -E '^[-+][^-+]'
# existing test lines removed or changed: only the named classes
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
```

  - The first check may print a line naming the net layer's `ClientView` or `ClientChannel`; list it, since it is not the game's word.
  - The rules check prints only the two Event rows.
  - The last check prints only the lines Tasks 1, 2, 3 and 5 named, as their reports list them.
  - Also read the `+` lines of `src/engine`, `src/pages` and `src/utils` for "stake" used of money rather than 7-1's fixture card, and "price" or "fee" naming a Startup number rather than a press price.
- [ ] **Step 5: Run the four games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo src/engine/input` passes, and Rent Day still has 108 examples.
- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -F - <<'EOF'
docs: cards tucked under cards of their own zone and chains of cards on cards on the table, prices before pressing, and slice 8 on the page, checked in a browser

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Gaps

- **G1. The viewer's own cards in two zones of one list are not told apart by zone.**
  - The placing step's targets are the poacher's projects and products: `To-Do List`, `USB Gadget`, each with no place (6-3 gives places only to other seats' cards).
  - The canvas draws both zones, and a click on the card picks it. So the step can be played, and Task 5 plays it by a click.
  - Naming own zones would change 5-3's Training picker pins. Parked.
- **G2. The consent prompt names the product, not its price.**
  - 7-1's `WaitingView` carries names, not ids, so the page can't look the price up for it.
  - The seller reads the M&A Price on its own product's hover line (Task 3). Parked.
- **G3. `integrated` and `hosting` are not labelled.**
  - Both read the card a card sits on (`the card it is on is not offline`). 8-1 Task 4 keeps that phrase out of the card-only set, so `shownFlags` fails closed (8-2a's forward note).
  - Whether a stack is live is read from the `offline` labels and fades of its two halves. Recorded.
- **G4. Existing test lines change in four named classes:**
  - Task 1: hanging cards' `z`;
  - Task 2: Client Board lines of 8-2a and 8-2b;
  - Task 3: hover pins and whole-view pins that gain prices;
  - Task 5: 7-3's list of Events not in effect.

  Each is listed in its task's report, and Task 6's check prints exactly them.
- **G5. A Market Sale's buyer sees every rival product in the `buy` picker,** each but the one for sale greyed with `it is for sale`, as every picker lists every candidate. Recorded, not changed.

## Forward notes

- **Slice 9:**
  - a Face-Down product in a column hangs as a back, and `boardText` names it `a face-down card` before or after ` over `;
  - the Audit Shield reads the `cto` mark, which the label already shows;
  - a press price must fail closed for a Face-Down card: `pricesView` already skips a card whose face the seat doesn't see.
- **Slice 10:**
  - Liquidation's Market Sale reuses Task 4's flow;
  - a bankrupt seat is never asked, and its tab never selected;
  - Come Clean's second ask would make two waiting lines; 7-3's line shows one, so slice 10's nested windows decide which.
