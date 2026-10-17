# Startup Simulator Slice 7-3 (The page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The playtest page shows slice 7:
- every Equity token is named by its Founder wherever that isn't already said by the zone it is in;
- each tableau lists its supply and its portfolio, a placed token with the product it sits on;
- a rival's Consultant hangs under the viewer's product on the canvas, in its colour, and the viewer's own placed token says where it sits;
- an action waiting in the Veto window is written out in every seat's panel, cards named as that seat sees them, and the seat tabs follow the window, the offer and the lawsuit;
- the court sits on the shared table, and Venture Capital Rain's effect no longer says it isn't in effect.

**Architecture:**
- **This is plan 7-3, the page,** after plans 7-1, 7-2a and 7-2b. It takes plans 4-3 to 7-2b as given (see "Assumed from earlier plans").
  - It changes one cell of the rules text: Venture Capital Rain's `effect` drops `Not in effect yet.` (6-3's G4). No phrase, no rule and no example changes.
  - What the page needs and those plans don't provide is listed under "Gaps".
- **Six tasks:**
  1. cards that name a player, named by whom they name (core naming, the view's picks and waiting cards, the Board's names);
  2. where a card on another player's card sits, in words (Board text, the picker's places, a caption);
  3. other players' cards on the viewer's cards, drawn (fitted layout, the canvas, the hover line);
  4. the waiting action in every seat's panel, and the tabs following the window;
  5. consent, the lawsuit, the court and the Round Start on the page, and Venture Capital Rain's effect;
  6. the browser check, the README and the final checks.
- **Nothing in shared code knows Startup Simulator.**
  - Core: `card-facts.ts` gains `nameWithPlayers`; `board-view.ts`'s `pickedAs` uses it; `fit-layout.ts`'s `fittedLayout` gains `seats`, and it gains `drawnCards`; `stackOnHolders` keeps one column per card.
  - Page: `board-text.ts` gains `sitsOn` and `sitsOnCaptions` and names other seats' cards; `card-pick.ts`'s `placesOf` adds where a card sits; `seat-status.ts` gains `waitingLine`; `playtest.tsx` wires them up.
- **Calls this plan makes** (the spec leaves "the look of tokens and windows" to the builder):
  1. **A card that names a player is named as an example names it** (`Equity whose founder is p1`), except that a player whose zone it is in goes without saying.
     - So a supply reads `equity: Equity; Equity; Equity`: the line is the Founder's, which names them. A portfolio reads `Equity whose founder is p1`.
     - It is the one name the page gives a card it sees: in the picker, the offer, the Board text and the waiting line (`pickedAs`, `cardLabel`).
     - Rule messages, examples and `pickName` are unchanged.
  2. **Where a token sits is said on both sides** (R1's page bullet).
     - The Founder's product lists it after its own cards, with the Investor's seat: `with Junior Software Dev and p0's Equity whose founder is p1 (blue consultant)`.
     - The Investor's portfolio lists every token, a placed one with `on Dating App in p1's development`.
     - The picker gives that place too, so two tokens of one Founder, one placed, are told apart.
     - On the Investor's canvas the placed token is captioned with it, since the product isn't drawn there.
  3. **A rival's token on the viewer's product is drawn hanging under it** (R1's "draws a rival's token on the viewer's product").
     - The fitted table gains a free zone for each other seat's zone whose cards sit on other players' cards. It draws only that zone's cards sitting on the viewer's cards.
     - These zones come first in the list. So every other zone wins a drop over them, and their cards hang first in the card's column, right under the card, drawn under the card's own staff with their top strips (corner index and label) showing.
     - The token is clickable like any drawn card: the Founder clicks it to buy it back. The hover line names its seat.
     - The colour is the token's kept flag. 4-3's label shows it (`blue consultant`), and so does its face.
  4. **The waiting action** is one line under the status line in every seat's panel, in the presser's colour:
     - `p1 wants to buy back a card in another player's portfolio: Equity whose founder is p1.`;
     - the button's own rules words (third person, so "their" is the presser's), the cards as that seat's view names them, and the choices.
     - Every seat sees it, since who pressed what is public. Only the asked seat has live buttons.
  5. **The seat switcher needs no new code.** `seatToAct` reads `turn.current`, which the window, the offer and the lawsuit move seat by seat. Tasks 4 and 5 pin it.
  6. **Consent and the lawsuit need no new page code.**
     - The offer and the lawsuit are interrupts. So the status line names the phase and its Hint.
     - The offered token is labelled `offered` (a kept flag) on the canvas and in the Board text.
     - The court is a shared pile that `fittedLayout` already draws. Task 5 pins each.
- **Parked:** the Share Price on the page (G2); grouping identical entries on a Board line; clicking a rival's card on its Board line to pick it.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19, PixiJS 8; Playwright (global install, Chromium in `/opt/pw-browsers`) for the browser check.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-7-equity-design.md` is binding, above all "The page" and the rulings:
- "Each tableau shows the Equity it holds (with Founders) and its supply";
- "Consultants show on the product cards they sit on, with their color";
- "The Veto window and consent prompts appear in the deciding player's strip; the switcher jumps to them";
- R1: "The page draws a rival's token on the viewer's product in the viewer's Board, and lists the viewer's own placed tokens with the product they sit on in the viewer's tableau line".

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding. Its anti-goals bind here: hidden information leaking, Startup words in shared code. So do "Designers never see engine words" and "a seat switcher … jumps to the seat that must act next".

These plans are inputs, with their Global Constraints amendments:
- 4-3, 5-3 and 6-3 (`…-4-3-the-page.md`, `…-5-3-the-page.md`, `…-6-3-the-page.md`): the models for this plan;
- 7-1 (`…-7-1-language.md`): its "Left to 7-3";
- 7-2a and 7-2b (`…-7-2a-…`, `…-7-2b-…`): their forward notes for 7-3;
- `builder-check-startup-7.md` in the session scratchpad: Q1's page notes.

## Global Constraints

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.** This plan adds no `state.data` key, no card `data` key and no move field. The view's shapes are unchanged: names only read longer.
- **No Startup Simulator words in shared code** (code, comments, test names and shared test fixtures).
  - The banned list is plan 7-1's: plan 6-1's list, plus slice 7's equity, investor, founder, consultant, dividend, veto, partner, immunity, portfolio, buyback, stock.
  - **Where they may appear:** `src/games/startup-simulator.*`; `src/pages/designer/designer-page.test.tsx`, `playtest-fitted.test.tsx` and `tableaux.test.ts`; `src/pages/designer/samples.ts`; `README.md`; `docs/`.
  - Shared code says "a card that names a player", "a zone whose cards sit on other players' cards", "the window", "answer". Fixtures are 7-1's (`MAKER_GAME`, `BUY_GAME`, `POST_GAME`, `RIVAL_GAME`, `OBJECT_GAME`): maker, Stake, purse, holdings, workshop.
  - Ordinary words to avoid: "waiting", not "pending"; "goes to", not "leads"; "a mistake in the code", not "a bug"; never "supply", "veto" or "partner".
- **Hearts, Color Match, Venom and Rent Day stay unchanged** (Rent Day keeps its 108 examples). They have no card naming a player and no zone whose cards sit on other players' cards. So:
  - their names, Board text and fitted tables are unchanged;
  - they get no waiting line and no new decor.
- **Every number comes from the rulebook.** Each Startup test says where its numbers come from.
- **Hidden information** (overview anti-goal; 3-2's to 6-3's lessons):
  - What the view shows is decided by the compiled rules alone, and never reveals a hidden card or zone.
  - **The waiting line never reveals a hidden pick.** It names cards only as `SeatExtras.waiting` names them for that seat (`a face-down card` elsewhere, no id), and the page adds no card to it.
  - Names, places, captions and Board text read only the cards as the seat's scene gives them; a face-down card has no data and gets none.
  - The fitted table draws another seat's cards only from a zone everyone can see whose cards sit on other players' cards, and only those on the viewer's own cards.
- **A ring or picker never outlasts its view.** Everything this plan adds to the page is derived from the latest view in the render that receives it, and adds no page state.
- **No measured `Text`.** A `Text`'s size is never measured under happy-dom. This plan adds no Pixi text: a caption is a `CardDecor.caption`, and any width is taken with `boldTextWidth`.
- **Earlier plans come first.**
  - In execution order: 4-2, 4-3, 5-1, 5-2a, 5-3 Task 1, 5-2b, 5-3 Tasks 2–4, 6-1, 6-3 Task 1, 6-2a, 6-2b, 6-3 Tasks 2–5, 7-1, 7-2a, 7-2b, then this plan.
  - Their code is referred to by the names their Interfaces blocks give.
  - Each task re-checks the names it consumes at HEAD before starting, and stops and reports one that differs.
- **Files this plan changes outside page and core code:**
  - `src/games/startup-simulator.rules`: the Venture Capital Rain `effect` cell only (Task 5);
  - `src/games/startup-simulator.test.ts`: appended tests and Task 1's named lines;
  - `README.md`.
- **Existing tests.**
  - No existing test line changes, except these classes, each named by its task and listed in its report:
    - Task 1: `viewedCards`' two name comparisons in `startup-simulator.test.ts`, and any test line of plans 7-1 to 7-2b that pins a seat's view name of a card naming a player other than its zone's seat (`'Stake'`, `'Equity'`, `equity: Equity` in a portfolio);
    - Task 3: the page-test lines that compare the fitted table's whole zone list with a two-argument `fittedLayout` (at least `"draws the seat's own zones and the shared ones, and only their cards"`).
  - New names are imported on new `import` lines.
  - If any other existing test fails, stop and report it.
- **The browser check** uses the pre-installed Chromium (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; never `playwright install`).
  - Its scripts and screenshots stay in `/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-7-3/`, never in the repo.
  - Its setup lines go where every seed sets up: right after `  3 new Equity cards go to each equity, each naming its owner as its founder.`, before Setup's deal, checked at seeds 1 to 10.
- **Page copy (exact):**
  - **A card that names a player:** `{name}`, then ` whose {fact} is {seat}` for each fact naming a player that is set on it, in declared order, leaving out one naming the seat whose zone the card is in: `Equity whose founder is p1`; `Equity` in p1's equity.
  - **Under the card it sits on, a card of another seat's zone:** `{seat}'s {entry}`, after the card's own: `with Junior Software Dev and p0's Equity whose founder is p1 (blue consultant)`.
  - **Where a card sits, when it sits on another seat's card:** `on {card} in {seat}'s {zone}`.
    - In the Board text it follows the card's entry: `portfolio: Equity whose founder is p1 (blue consultant) on Dating App in p1's development; Equity whose founder is p2`.
    - In the picker it follows the place: `Equity whose founder is p1 (p0's portfolio, on Dating App in p1's development)`, or is the place in the viewer's own zone: `(on Dating App in p1's development)`.
    - As a caption, on a table that doesn't draw the card it sits on, it takes two lines: `on Dating App` and `in p1's development`.
  - **The hover line of another seat's card:** `{seat}'s ` before 6-3's hover line: `p0's Equity — founder p1 · blue consultant yes — blue consultant`.
  - **The waiting line:** `{by} wants to {words}`, then `: {cards}` when there are any, then `, choosing {choices}` when there are any, then `.`.
    - The cards are joined by `joinAnd`; for a button that puts its cards on a card, the last is the target, after ` to `.
    - It goes in `<div data-testid="waiting">`, right under the status line, in `seatColor(by)`.
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1, record `BASE=$(git rev-parse HEAD)`. Run `bun run test` once for the passing count and the long runs' time.
- **No new dependencies.**
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefix `feat(designer):` (`docs:` for Task 6).
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.
  - A test marked "(guard)" passes before its task's change, and says so.

## Review Focus

- **Two tokens of one Founder in one portfolio, one placed** (a holder keeps both, or vetoes with one).
  - Expected: the Board line, the picker and the offer tell them apart; the placed one says where it sits, the other nothing.
  - Test: Task 2.
- **A product carrying its Founder's staff and two Investors' tokens, then pivoted through the Veto window.**
  - Expected: one column under it (tokens in seat order, then the staff), each strip showing.
  - After the Pivot, no token, ring, label or caption of theirs stays on the Founder's canvas.
  - A drop on the development's centre still lands in the development team.
  - Tests: Task 3.
- **A window opened by a press that picked cards the asked seat can't see** (Assign from the bench).
  - Expected: the asked seat's line says `a face-down card`, and no card name or id is anywhere in its panel. The actor's line names the cards.
  - Test: Task 4.
- **Undo while a window, an offer or a lawsuit is open.**
  - Expected: the waiting line, the `offered` label and the court's card go with the view. The tab returns to the seat that acts, and nothing is sent.
  - Tests: Tasks 4 and 5.
- **A window with two asked seats, watched from the actor's tab.**
  - Expected: the tab follows each asked seat from the actor's left, then returns. The actor's panel shows the line, `waiting for {seat}` and greyed buttons.
  - Test: Task 4.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name, not by line. If one is missing or differs, stop and report it.

- **HEAD (1b-3, 3-2):**
  - `card-facts.ts`: `pickName`, `cardFact`;
  - `zones.ts`: `zoneInfo`, `zoneNameOf`, `zoneIdFor`, `relocate`;
  - `board-view.ts`: the private `pickedAs`, `seesFace`, `seatExtras`, `readSeatExtras`;
  - `board-text.ts`: `cardLabel`, the private `cardsOnCards` and `isBoardZone`, `boardText`, `boardCaptions`;
  - `fit-layout.ts`: `fittedLayout`, `stackOnHolders`, `STACK_GAP` (36), `STACK_STEP` (34);
  - `hittest.ts`: `resolveDrop` (the last zone in the list that holds the point wins);
  - `seat-status.ts`: `seatStatus`, `seatToAct`;
  - `refs.ts`: `joinAnd`;
  - `seat-colors.ts`: `seatColor`;
  - `testing.ts`: `unreachableZones`.
- **4-3 (built):**
  - `boardBadges(game, cards, worked?)`, `loneCounts`;
  - `LayoutOptions.keepPlaced` and `stackOnHolders`' walk of `keepPlaced` rows;
  - the `playtest-fitted.test.tsx` helpers `askedGroup`, `askedOptions`, `answerAsked`, `seatButtons`.
- **5-3 (built):** `fittedBounds` and whatever it added to `fittedLayout`'s parameters; `keptBadges` and the decor merge.
- **6-3 (built):**
  - `placesOf(game, cards, seat)` in `card-pick.ts`; `CardPicker`'s `places`;
  - the decor kept to cards in `placed`;
  - the hover line `{cardDetail}{ — label}`;
  - `inPlayLines`;
  - the `playtest-fitted.test.tsx` helpers `inPlay`, `onTop`, `setUpTwo`, `FIRST2`, `SECOND2`, `inPlayLine`, `bankText`;
  - the Event table's `effect` column.
- **7-1 (built):**
  - `ThingFact.kind` `'player'` and the face's `maker: p0`;
  - `ZoneSpec.across`;
  - `ON_SEAT_KEY`, `putOn` setting it, `othersOn`;
  - `WaitingView = { by; label; cards; choices }` and `SeatExtras.waiting` (and how its cards are named: through `pickedAs` or beside it);
  - `MAKER_GAME`, `BUY_GAME`, `POST_GAME`, `RIVAL_GAME`, `OBJECT_GAME`;
  - the test-local `stake(state, game, zoneId, maker)`;
  - 7-1 Task 8's engine helpers in `action-window.test.ts`, and Task 9's `describe('a waiting action')`.
- **7-2a (built):**
  - zones `equity` and `portfolio` (`…, where some cards are on other players' cards`), the fact `founder`;
  - flags `blue consultant`, `red consultant`, `qa consultant`;
  - the Invest buttons, the `event check`'s `place …` and `confirm their consultants`;
  - Pivot's return line;
  - in the test file: `founderOf`, `portfolioOf`, `viewedCards` (taking a zone list), `nameOf`.
- **7-2b (built):**
  - phases `veto`, `offer` and `lawsuit`, each with its Hint;
  - the flag `offered` and the zone `court`;
  - the buttons named in its Architecture.
- **Second-person labels used below** (re-check each against the view; the compiler's `actionLabel` makes them):
  - `INVEST` = `Invest in a card in another player's equity`;
  - `INVEST_PLACING` = `Invest in a card from another player's equity to a card in another player's development or another player's operations`;
  - `PLACE` = `Place a card from your portfolio to a card in another player's development or another player's operations`;
  - `CONFIRM` = `Confirm your consultants`;
  - `VETO` = `Veto with a card in your portfolio`; `LET_GO` = `Let the action go ahead`;
  - `BUY_BACK` = `Buy back a card in another player's portfolio`; `SELL` = `Sell a card in your portfolio`; `SELL_BACK` = `Sell back a card in your portfolio`;
  - `TAKE` = `Take a card in another player's portfolio`; `DECLINE` = `Decline the offer`;
  - `FILE` = `File a card in your strategy hand`; `SUE` = `Sue a card in another player's portfolio`;
  - `RECRUIT` = `Recruit a junior software dev`; `ASSIGN` = `Assign some cards from your bench to a card in your development`; `PIVOT` = `Pivot a card in your development`.

---

### Task 1: Cards that name a player, named by whom they name

Before starting: re-check `pickName`, `pickedAs`, 7-1 Task 9's naming of `WaitingView.cards`, `cardLabel`, 6-3's `placesOf`, 7-1's fixtures and `stake`, and in `startup-simulator.test.ts` `viewedCards` and `nameOf`. Also check whether `card-facts.ts` can import `zoneInfo` from `zones.ts` without an import cycle. If it can't, put `nameWithPlayers` in `board-view.ts` with the same signature, and import it from there.

**Files:**
- Modify: `src/engine/core/lang/card-facts.ts` (`nameWithPlayers`), `src/engine/core/lang/board-view.ts` (`pickedAs`; the waiting view's names if it names cards itself), `src/pages/designer/board-text.ts` (`cardLabel`)
- Test (append): `src/engine/core/lang/card-facts.test.ts`, `src/engine/core/lang/board-view.test.ts`, `src/pages/designer/board-text.test.ts`, `src/pages/designer/playtest-fitted.test.tsx`, `src/games/startup-simulator.test.ts` (and its named lines)

**Interfaces:**
- Consumes: `pickName`, `cardFact`, `zoneInfo`, `ThingFact`, 7-1's fixtures.
- Produces (for Tasks 2–6):

```ts
// card-facts.ts
/**
 * A card as a seat that sees its face is told of it, the way an example names it: `pickName`, then ` whose {fact} is {seat}` for each
 * fact naming a player that is set on it, in the order the game declares them. A fact naming the seat whose zone the card is in goes
 * without saying: `Stake whose maker is p0` in p1's holdings, `Stake` in p0's purse, `Stake whose maker is p0` in the scrap.
 */
export function nameWithPlayers(card: CardState, game: CompiledGame): string;
// playtest-fitted.test.tsx, module level, for Tasks 1–5
/** The id of the `n`th card (slot order) in `founder`'s equity. Read every id an arrangement needs before moving any. */
const tokenOf: (state: GameState, founder: string, n?: number) => string;
/** `state` with the token in `holder`'s portfolio, on the card `onto` when given (through putOn), and with the flag `colour` set when given. */
const holding: (state: GameState, tokenId: string, holder: string, onto?: string, colour?: string) => GameState;
/** A 3-player table after Setup with a neutral Event in play (6-3's `inPlay`), so recruiting costs $2 and nothing pays extra. */
const setUp7: () => GameState;   // inPlay(setUp(), 'Whistleblower Protection Act')
// T is after(N, 3), the third seat (the file's O may be N), defined in each describe that uses it, as 6-3's Task 4 does.
```

- `pickedAs` names a card the seat sees with `nameWithPlayers`. So `PickCardView.name`, the offer's name and `WaitingView.cards` follow. A card it doesn't see is still `a face-down card`.
- `cardLabel` is `nameWithPlayers` for a face-up card.

- [ ] **Step 1: Write the failing tests.**
  - **`card-facts.test.ts`,** `describe('nameWithPlayers')`, on `MAKER_GAME`'s compiled game and a 3-player state arranged with `stake` and `relocate`:
    - a Stake whose maker is p0 in `holdings-p1` is `Stake whose maker is p0`;
    - the same card in `purse-p0` is `Stake`, and in the scrap `Stake whose maker is p0`;
    - a Vase in `workshop-p0` is `Vase`;
    - (guard) `pickName` of the first is `Stake`.
  - **`board-view.test.ts`,** `describe('cards that name a player, as a seat is told of them')`:
    - A 3-player `BUY_GAME` engine, p0 to act: the buy button's `cards.cards.map((c) => c.name)` is `Stake` four times, since each lies in its maker's purse.
    - `OBJECT_GAME`, arranged as 7-1 Task 8's R2-shape test: `holdings-p0` holds a Stake whose maker is p1, `holdings-p1` one whose maker is p0, on p1's turn.
      - p1's `sell a card in their holdings` lists `Stake whose maker is p0`.
      - After p1 sells it, p0's and p2's `seatExtras(…).waiting.cards` are `['Stake whose maker is p0']`.
    - (guard) 7-1 Task 9's `waiting.cards` pins (`['Potter', 'Vase']`, `['a face-down card']`, `['Vase']`) pass unchanged.
  - **`board-text.test.ts`,** `describe('a card that names a player')`, on `MAKER_GAME`:
    - `cardLabel` of a Stake whose maker is p0 in `holdings-p1` is `Stake whose maker is p0`, and of one in `purse-p0` is `Stake`;
    - a face-down copy (`faceUp: false`, `faceKey: HIDDEN_FACE_KEY`, `data: {}`) is `a face-down card`.
  - **`startup-simulator.test.ts`.**
    - **Changed lines.** In `viewedCards`, the two name comparisons read `nameWithPlayers(card, game)` in place of `nameOf`: `zone.map(nameOf)`, and `nameOf(target)` in `named`.
    - Append `it('names an Equity token by its Founder wherever its own zone does not (§2)')`:
      - every Setup token's `nameWithPlayers` is `Equity`;
      - one whose founder is p0, moved to `portfolio-p1`, is `Equity whose founder is p0`.
  - **`playtest-fitted.test.tsx`.** Define the module-level helpers above, then append `describe('Equity named by its Founder')`, with `tab` and `boardOf` local. The arrangement: `setUp7()` with `tokenOf(…, S)` and `tokenOf(…, T)` held by N.
    - `boardOf(N)` contains `` `portfolio: Equity whose founder is ${S}; Equity whose founder is ${T}` ``, and `boardOf(S)` contains `equity: Equity; Equity` and not `whose`.
    - Press `BUY_BACK`. The picker's buttons, before Cancel, are:
      - `` `Equity whose founder is ${S} (${N}'s portfolio)` ``, live;
      - `` `Equity whose founder is ${T} (${N}'s portfolio)` ``, greyed (`aria-disabled` `true`), its reason pinned as the view gives it.

      Press Cancel.
    - Press `INVEST`. The buttons, before Cancel, are `` `Equity (${N}'s equity)` `` three times, then `` `Equity (${T}'s equity)` `` twice: seat by seat from S's left (7-1 Task 2), each Founder said by its zone.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/card-facts.test.ts src/engine/core/lang/board-view.test.ts src/pages/designer/board-text.test.ts src/pages/designer/playtest-fitted.test.tsx src/games/startup-simulator.test.ts`. Expected: FAIL (`nameWithPlayers` is missing; names read `Stake` and `Equity`).
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/engine src/pages src/games`, then `bun run test` and `bun run typecheck`.
  - A test line of plans 7-1 to 7-2b that pins a seat's view name of a card naming another seat is in the named class: it reads the new name. List each.
  - Stop on any other failure.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/card-facts.ts src/engine/core/lang/board-view.ts src/pages/designer/board-text.ts \
  src/engine/core/lang/card-facts.test.ts src/engine/core/lang/board-view.test.ts src/pages/designer/board-text.test.ts \
  src/pages/designer/playtest-fitted.test.tsx src/games/startup-simulator.test.ts
# and each 7-1 to 7-2b test file Step 4 changed, named in the report
git commit -F - <<'EOF'
feat(designer): a card that names a player is named as an example names it, wherever the page names a card it sees, the player whose zone it is in going without saying

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: Where a card on another player's card sits, in words

Before starting: re-check Task 1's names; `cardsOnCards` and `isBoardZone` in `board-text.ts`; 4-3's Board entry (`{name}{ (…)}{ […]}{ with …}`); 6-3's `placesOf` and the decor merge in `playtest.tsx`; 7-1's `ZoneSpec.across`, `RIVAL_GAME` and `putOn`.

**Files:**
- Modify: `src/pages/designer/board-text.ts` (`sitsOn`, `sitsOnCaptions`, `boardText`), `src/pages/designer/card-pick.ts` (`placesOf`), `src/pages/designer/playtest.tsx` (the caption merge)
- Test (append): `src/pages/designer/board-text.test.ts`, `src/pages/designer/card-pick.test.ts`, `src/pages/designer/playtest-fitted.test.tsx`

**Interfaces:**
- Consumes: Task 1's `nameWithPlayers`, `cardLabel`, the test helpers; `holderIdOf`, `zoneInfo`, `zoneNameOf`, `joinAnd`.
- Produces (for Tasks 3–6):

```ts
// board-text.ts
/**
 * Where a card that sits on a card of another seat's zone sits, as an example says it: `on Vase in p0's workshop`, the card it sits on
 * named by `cardLabel`. Null for a card that sits on none, on a card of its own seat's zone, or on a card not among `cards`.
 */
export function sitsOn(game: CompiledGame, card: CardState, cards: CardState[]): string | null;
/** For each of `drawn` that `sitsOn` places on a card `drawn` lacks: the same words on two lines, `on Vase` and `in p0's workshop`. */
export function sitsOnCaptions(game: CompiledGame, drawn: CardState[], cards: CardState[]): { [cardId: string]: string };
```

- **`boardText`:**
  - under the card it sits on, a card of a zone whose seat is not that card's zone's seat reads `{seat}'s {entry}`;
  - a zone whose spec has `across` lists every card it holds, and a card that `sitsOn` places is followed by ` {sitsOn}`;
  - every other line reads as before.
- **`placesOf`.** A card that `sitsOn` places has those words after its place, `p1's holdings, on Vase in p0's workshop`, or as its place in the viewer's own zone, `on Vase in p0's workshop`.
- **`playtest.tsx`.** A card's caption is its count captions, then its `sitsOnCaptions` entry, joined by `\n`. Both come from the captions memo, with `placed` and `view.scene.cards`.

- [ ] **Step 1: Write the failing tests.**
  - **`board-text.test.ts`,** `describe("cards on other players' cards")`. A 3-player `RIVAL_GAME` state arranged with `stake`, `relocate` and `putOn`, in this order:
    - `workshop-p0` holds a Vase, with a Potter put on it in `crew-p0`;
    - p1's Stake whose maker is p0 is put on it in `holdings-p1`, and set `lit`;
    - p2's Stake whose maker is p0 is put on it in `holdings-p2`;
    - `holdings-p1` also holds a Stake whose maker is p2, on no card.

    The checks:
    - The `workshop:` part of `boardText(game, cards, 'p0')` is `workshop: Vase with Potter, p1's Stake whose maker is p0 (lit) and p2's Stake whose maker is p0`.
    - The `holdings:` part of `boardText(game, cards, 'p1')` is `holdings: Stake whose maker is p0 (lit) on Vase in p0's workshop; Stake whose maker is p2`.
    - `sitsOn` of p1's placed Stake is `on Vase in p0's workshop`. It is null for the Potter, for the Stake on no card, and for the placed Stake when the Vase is left out of `cards`.
    - `sitsOnCaptions(game, <p1's cards>, cards)` is `{ [p1's placed Stake]: "on Vase\nin p0's workshop" }`. With the Vase among the drawn cards it is `{}`.
    - (guard) The file's existing `boardText` and `boardCaptions` tests pass unchanged.
  - **`card-pick.test.ts`,** `describe('placesOf, for a card on another player\'s card')`. The same state, with a second Stake whose maker is p0, on no card, in `holdings-p1` (Review Focus):
    - for p1: the placed Stake is `on Vase in p0's workshop`, and neither unplaced Stake has a place;
    - for p0: the placed Stake is `p1's holdings, on Vase in p0's workshop`, and the other two are `p1's holdings`;
    - (guard) 6-3's `JINX_GAME` tests pass unchanged.
  - **`playtest-fitted.test.tsx`,** `describe('Consultants in words')`, with `tab` and `boardOf` local. The arrangement is `setUp7()` with:
    - a Dating App in `development-${N}`;
    - `tokenOf(…, N, 0)` held by S on it, with `blue consultant`;
    - `tokenOf(…, N, 1)` held by S, on no card.

    Mount it (S's tab):
    - `boardOf(S)` contains `` `portfolio: Equity whose founder is ${N} (blue consultant) on Dating App in ${N}'s development; Equity whose founder is ${N}` ``.
    - `boardOf(N)` ends with `` ` with ${S}'s Equity whose founder is ${N} (blue consultant)` ``.
    - `table!.decor![onDating].caption` is `` `on Dating App\nin ${N}'s development` ``, where `onDating` is the placed token, and the other token's decor has no `caption`.
    - **Review Focus.** Press `SELL`. The picker's buttons, before Cancel, are `` `Equity whose founder is ${N} (on Dating App in ${N}'s development)` `` and `` `Equity whose founder is ${N}` ``. Press Cancel.
- [ ] **Step 2: Run** `bunx vitest run src/pages/designer/board-text.test.ts src/pages/designer/card-pick.test.ts src/pages/designer/playtest-fitted.test.tsx`. Expected: FAIL (`sitsOn` and `sitsOnCaptions` are missing; the portfolio lists no placed token; the rival token has no seat).
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/pages src/engine src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/pages/designer/board-text.ts src/pages/designer/card-pick.ts src/pages/designer/playtest.tsx \
  src/pages/designer/board-text.test.ts src/pages/designer/card-pick.test.ts src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(designer): a card on another player's card is listed on both players' Board lines, its place in the picker says what it sits on, and a table that doesn't draw that card captions it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: Other players' cards on the viewer's cards, drawn

Before starting:
- re-check `fittedLayout`'s parameters at HEAD (5-3 may have added one) and its free zones' rest point;
- re-check `stackOnHolders` with 4-3's `keepPlaced` walk, and `resolveDrop`'s order;
- re-check 6-3's hover line and decor filter in `playtest.tsx`;
- re-check Task 2's helpers, 7-1's `POST_GAME` and `ZoneSpec.across`.

**Files:**
- Modify: `src/engine/core/lang/fit-layout.ts` (`fittedLayout`'s `seats`, `drawnCards`, `stackOnHolders`), `src/pages/designer/playtest.tsx` (the fitted def's seats, `placed`, the hover line)
- Test (append): `src/engine/core/lang/fit-layout.test.ts`, `src/pages/designer/playtest-fitted.test.tsx` (and its named line)

**Interfaces:**
- Consumes: `zoneDef`, `ZoneDef.owner`, `holderIdOf`, `zoneInfo`; Tasks 1–2.
- Produces (for Tasks 4–6):

```ts
// fit-layout.ts — a new last parameter, after any 5-3 added
/**
 * …as before, and, for each zone each player has that everyone can see whose cards sit on other players' cards (`across`), in Table
 * order, and each seat of `seats` but the viewer, in seat order: a free zone with that seat's id for it, owned by that seat, with no
 * label, resting where the viewer's free zones rest. They come first in the list, so every other zone wins a drop over them, and the
 * cards hanging from them are drawn first in a column, under the card's own.
 */
export function fittedLayout(zones: ZoneSpec[], viewer: PlayerId, seats: PlayerId[] = [viewer]): ZoneDef[];
/**
 * The cards `viewer`'s fitted table draws, in the order given: those in a zone of `defs`, except that of a zone another seat owns only the
 * cards that sit on a card in a zone the viewer owns.
 */
export function drawnCards(defs: ZoneDef[], cards: CardState[], viewer: PlayerId): CardState[];
// stackOnHolders: one column for each card held, across every free zone and keepPlaced row, in the order of `defs`, then slot order.
```

- **`playtest.tsx`:**
  - the fitted def is `fittedLayout(game.zones, selected, running.seats)`;
  - `placed` is `stackOnHolders(tableDef.zones, drawnCards(tableDef.zones, cards, seat))` on a fitted table, and the cards as before on any other;
  - the hover line of a card in a zone of another seat starts with `{seat}'s ` (Page copy).
- Two arguments give exactly today's layout. Hearts, Color Match, Venom and Rent Day have no `across` zone, so their tables are unchanged either way.

- [ ] **Step 1: Write the failing tests.**
  - **`fit-layout.test.ts`,** `describe("other players' cards on the viewer's cards")`, on `POST_GAME`'s compiled zones, viewer p1, `seats = ['p0', 'p1', 'p2']`:
    - **The defs.**
      - The first two defs of `fittedLayout(zones, 'p1', seats)` are `holdings-p0` and `holdings-p2`. Each is `layout: 'free'`, has no `label`, has owner `p0` / `p2`, and rests at `crew-p1`'s transform.
      - The rest equal `fittedLayout(zones, 'p1')`, in order.
      - (guard) `fittedLayout(zones, 'p1')` has no `holdings-p0`.
    - **`drawnCards`,** with these cards:
      - `v`, a Vase in `workshop-p1`;
      - `a`, a Stake in `holdings-p0` on `v`;
      - `b`, a Stake in `holdings-p0` on no card;
      - `w`, a Vase in `workshop-p0`, and `c`, a Stake in `holdings-p2` on `w`;
      - `d`, a Stake in `holdings-p1` on no card.

      The result is `[v, a, d]`, the same objects.
    - **One column** (Review Focus). `stackOnHolders(defs, [v, a, potter])`, the Potter in `crew-p1` on `v`:
      - `a` is at `v`'s x, and `v`'s y + `CARD_HEIGHT` + `STACK_GAP`;
      - the Potter is at the same x, `STACK_STEP` lower.
    - **Drops** (Review Focus). `unreachableZones(fittedLayout(zones, 'p1', seats), 7)`, less the entries for `holdings-p0` and `holdings-p2`, equals `unreachableZones(fittedLayout(zones, 'p1'), 7)`.
    - (guard) 1b-3's and 4-3's `stackOnHolders` tests pass unchanged.
  - **`playtest-fitted.test.tsx`.**
    - **Changed line.** In `"draws the seat's own zones and the shared ones, and only their cards"`, `ids` is read from `fittedLayout(game.zones, S, seatsOf(3))`. Any other page-test line that compares the fitted table's whole zone list with a two-argument `fittedLayout` gets the seats the same way; name each.
    - Append `describe("a rival's Consultant hangs under the viewer's product")`, with `tab`, `boardOf`, `hover` and `detail` local (as 6-3's hover describe has them). `[A, B]` is `[N, T]` in seat order.
      - **The arrangement:** `setUp7()`, with:
        - a Dating App in `development-${S}`;
        - `tokenOf(…, S, 0)` held by A on it, with `blue consultant`;
        - `tokenOf(…, S, 1)` held by B on it, with `red consultant`;
        - S's Junior Software Dev put on it in `development-team-${S}`.
      - **The column.** Mount (S's tab).
        - The table's zone ids start with `` `portfolio-${A}` ``, `` `portfolio-${B}` ``.
        - `cardsIn(`portfolio-${A}`)` and `cardsIn(`portfolio-${B}`)` are those tokens alone.
        - Let `at` be the Dating App's pose from `computeZoneLayout(<the fitted development def>, cardsIn(`development-${S}`))`. Then:
          - A's token is at `(at.x, at.y + 176)`;
          - B's token is `STACK_STEP` lower;
          - the Junior is `2 * STACK_STEP` lower.

          Each is read through `computeZoneLayout` of its own free def.
      - **The colour.** `table!.decor![aToken].badge` is `blue consultant` and B's is `red consultant`. Pin each whole as the view gives it.
      - **The hover line.** `hover(aToken)`: `detail()` is `` `${A}'s ${cardDetail(faceKey)} — ${badge}` ``.
      - **Clicked.** `click(aToken)`: `offered()` contains `[BUY_BACK, true]`. Press the offer's Cancel.
      - **The Board line.** `boardOf(S)` contains `` `${A}'s Equity whose founder is ${S} (blue consultant) and ${B}'s Equity whose founder is ${S} (red consultant)` ``, after the Junior's entry.
      - **Review Focus: pivoted through the window.** Press `PIVOT` and `pickNamed('Dating App')`.
        - `` tab(`${N} — to act`) `` is selected. On N's own canvas, its token's caption is `` `on Dating App\nin ${S}'s development` `` (Task 2).
        - Press `LET_GO`; `` tab(`${T} — to act`) `` is selected; press `LET_GO`.
        - Then `` tab(`${S} — to act`) `` is selected, and:
          - `cardsIn(`portfolio-${N}`)` and `cardsIn(`portfolio-${T}`)` are `[]`;
          - `table!.decor` has no key for either token;
          - `lineOf(S)` contains `development 0`;
          - `inOrder('open-idea-pool')` contains the Dating App.
    - **How the numbers come:** 176 is `CARD_HEIGHT` 140 + `STACK_GAP` 36, as 4-3's Growth Hacker test has it. §17.B.4: a Consultant sits on a Founder's product, and comes back to its Investor when the product leaves the Board. §6: a Pivot costs 1 action and sends the staff to the Bench.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/fit-layout.test.ts src/pages/designer/playtest-fitted.test.tsx`. Expected: FAIL (`drawnCards` and `fittedLayout`'s seats are missing; no rival token is drawn); the guards pass.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/engine src/pages src/games src/pages/hearts-demo`, then `bun run test` and `bun run typecheck`.
  - A page test that pins a card's `z` on a fitted Startup table may move by the rival zones' count. Stop and report it.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/fit-layout.ts src/pages/designer/playtest.tsx src/engine/core/lang/fit-layout.test.ts \
  src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(designer): a card another player keeps on the viewer's card hangs under it on the fitted table, first in its column and clickable, and the hover line names whose it is

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: The waiting action in every seat's panel, and the tabs following the window

Before starting: re-check 7-1's `WaitingView` and `SeatExtras.waiting`, `DeclaredAction.words`, `label` and `pick.ontoText`, `seatStatus`, `seatToAct`, `seatColor`, 4-3's `seatButtons`, and Tasks 1–3's helpers. Read 7-2b's `veto` Hint from the compiled game (`hint('veto')`).

**Files:**
- Modify: `src/pages/designer/seat-status.ts` (`waitingLine`), `src/pages/designer/playtest.tsx` (the line)
- Test (append): `src/pages/designer/seat-status.test.ts`, `src/pages/designer/playtest-fitted.test.tsx`

**Interfaces:**
- Consumes: `WaitingView`, `readSeatExtras`, `joinAnd`, `seatColor`.
- Produces (for Tasks 5–6):

```ts
// seat-status.ts
/**
 * What every seat is told of an action that waits for the players to answer it (Page copy). `words` are the rules' own words of the first
 * button in the game whose label is the view's, so “their” is the presser's; the label, its first letter lower-cased, when none is.
 */
export function waitingLine(game: CompiledGame, waiting: WaitingView): string;
// playtest-fitted.test.tsx, module level
const waitingText = () => screen.getByTestId('waiting').textContent;
```

- **`playtest.tsx`:** in the panel, right under the status line, `<div data-testid="waiting" style={{ color: seatColor(waiting.by) }}>{waitingLine(game, waiting)}</div>` while `extras.waiting` is there; nothing otherwise.

- [ ] **Step 1: Write the failing tests.**
  - **`seat-status.test.ts`,** `describe('waitingLine')`, on `OBJECT_GAME`'s compiled game, with views made by hand (`label` from each compiled button):
    - `{ by: 'p0', label: hire.label, cards: ['Potter', 'Vase'], choices: [] }` gives `p0 wants to hire some cards from the hall to a card in their workshop: Potter to Vase.`;
    - with `cards: ['Potter', 'Smith', 'Vase']`: `…: Potter and Smith to Vase.`;
    - tidy, `cards: ['Vase']`, `choices: ['Pay']`: `p0 wants to tidy a card in their workshop: Vase, choosing Pay.`;
    - swap, `cards: ['a face-down card']`: `p0 wants to swap a card from their stash to their workshop: a face-down card.`;
    - sell by p1, `cards: ['Stake whose maker is p0']`: `p1 wants to sell a card in their holdings: Stake whose maker is p0.`;
    - stop, `cards: []`: `p0 wants to stop.`;
    - a label no button has, `Wave`: `p0 wants to wave.`
  - **`playtest-fitted.test.tsx`,** `describe('the Veto window on the page')`, with `tab` and `boardOf` local, and `confirm` as 5-3's clicking describe has it. Arrangement W: `setUp7()` with `tokenOf(…, S, 0)` held by N and `tokenOf(…, S, 1)` held by T, on no card.
    - **Asked in turn, then gone ahead** (Review Focus). Mount W; press `RECRUIT`.
      - `` tab(`${N} — to act`) `` is selected.
      - `status()` is `` `seat: ${N} — Your turn — ${hint('veto')}` ``.
      - `waitingText()` is `` `${S} wants to recruit a junior software dev.` ``.
      - `seatButtons()` is `[VETO, LET_GO]`.
      - `lineOf(S)` starts `` `${S} 7 capital, 2 actions` `` and contains `bench 3`.
      - 7-1 keeps the window out of the interrupted turn, so no status here names `veto — `. If HEAD's view marks the window as an interrupted turn, every veto status below (and Task 5's) reads `… — veto — …` as `seatStatus` writes it: pin that and report it.
    - **The actor's tab.** Click S's tab:
      - `status()` is `` `seat: ${S} — ${hint('veto')} — waiting for ${N}` ``;
      - `waitingText()` is the same;
      - every seat button has `aria-disabled` `true`.

      Click N's tab again.
    - **Passed on.** Press `LET_GO`: `` tab(`${T} — to act`) `` is selected, and `waitingText()` is unchanged. Press `LET_GO`:
      - `` tab(`${S} — to act`) `` is selected;
      - `screen.queryByTestId('waiting')` is null;
      - `lineOf(S)` starts `` `${S} 5 capital, 2 actions` `` and contains `bench 4`.
    - **A Veto.** Mount W; press `RECRUIT`. On N's tab press `VETO`; its picker's only button is `` `Equity whose founder is ${S}` ``; pick it. Then:
      - `` tab(`${S} — to act`) `` is selected, and there is no waiting line;
      - `lineOf(S)` starts `` `${S} 7 capital, 2 actions` `` and contains `bench 3` and `equity 2`;
      - `lineOf(N)` contains `portfolio 0`, and `boardOf(S)` contains `equity: Equity; Equity`.
    - **Undo** (Review Focus). Mount W; press `RECRUIT`, then `Undo`. Then `` tab(`${S} — to act`) `` is selected, there is no waiting line, and `lineOf(S)` starts `` `${S} 7 capital, 3 actions` ``.
    - **Cards the asked seat can't see** (Review Focus). W with a To-Do List in `development-${S}`. Mount; press `ASSIGN`; `pickNamed('Junior Software Dev')`, `pickNamed('Junior Hardware Eng')`, `confirm()`, `pickNamed('To-Do List')`.
      - On N's tab (selected):
        - `waitingText()` is `` `${S} wants to assign some cards from their bench to a card in their development: a face-down card and a face-down card to To-Do List.` ``;
        - `document.body.textContent` contains neither `Junior Software Dev` nor `Junior Hardware Eng`.
      - Click S's tab: `waitingText()` is `` `${S} wants to assign some cards from their bench to a card in their development: Junior Software Dev and Junior Hardware Eng to To-Do List.` ``.
    - (guard) A Color Match page at 3 never shows a `waiting` test id.
    - **How the numbers come:**
      - §17.B.5 and the overview's Veto calls: a holder may cancel an action that costs AP at declaration, before anything is paid; the AP is spent and nothing else happens; the burned token goes back to its Founder's supply.
      - The spec's call: holders are asked in turn from the Founder's left.
      - §6 and §13.A (7-2b's citation): a Recruit costs 1 action and $2, 7 − 2 = 5.
      - §4: three Juniors on the bench at setup.
- [ ] **Step 2: Run** `bunx vitest run src/pages/designer/seat-status.test.ts src/pages/designer/playtest-fitted.test.tsx`. Expected: FAIL (`waitingLine` and the `waiting` line are missing). The tabs and capital checks of the window already pass (3-2's tabs, 7-1's window).
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/pages src/engine src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/pages/designer/seat-status.ts src/pages/designer/playtest.tsx src/pages/designer/seat-status.test.ts \
  src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(designer): an action waiting for the players to answer it is written out under every seat's status, its cards as that seat sees them, and the tabs follow each player asked

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: Consent, the lawsuit, the court and the Round Start on the page, and Venture Capital Rain's effect

Before starting: re-check 7-2b's `offer` and `lawsuit` phases, their Hints, `offered` and `court`; 7-2a's `event check` buttons and Hint; 6-3's `inPlay`, `onTop`, `setUpTwo`, `FIRST2`, `SECOND2`, `inPlayLine` and its Event table; 4-3's `askedGroup`, `answerAsked`, `seatButtons`; `setCounter` in `board-state.ts`; Tasks 1–4's helpers.

**Files:**
- Modify: `src/games/startup-simulator.rules` (the Venture Capital Rain `effect` cell)
- Test (append): `src/games/startup-simulator.test.ts`, `src/pages/designer/playtest-fitted.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–4; 6-3's helpers.
- Produces: no page code (Calls 5–6). The Event table's Venture Capital Rain row becomes, exact copy:

```text
    | Venture Capital Rain         | Whenever a player Invests in a Founder this round, the Bank pays that Founder $3 extra cash (not on Secondary Trades or Buybacks). | 1 |
```

- [ ] **Step 1: Write the tests.**
  - **`startup-simulator.test.ts`,** append `it('says Venture Capital Rain is in effect now that Invest is (§20.D 1)')`:
    - the Venture Capital Rain card's `effect` is `Whenever a player Invests in a Founder this round, the Bank pays that Founder $3 extra cash (not on Secondary Trades or Buybacks).`;
    - the Events whose effect ends `Not in effect yet.` are exactly Recruiter Frenzy, Headhunter Holiday and Whistleblower Protection Act.
  - **`playtest-fitted.test.tsx`,** `describe('consent, the lawsuit and the Round Start on the page')`, with `tab` and `boardOf` local:
    - **The Event's line.** Mount `inPlay(setUp(), 'Venture Capital Rain')`: `inPlayLine()` is `event in play: Venture Capital Rain — effect Whenever a player Invests in a Founder this round, the Bank pays that Founder $3 extra cash (not on Secondary Trades or Buybacks).`
    - **A Buyback, consented in the Investor's strip.** `setUp7()` with `tokenOf(…, S)` held by N. Mount; press `BUY_BACK` and `` pickNamed(`Equity whose founder is ${S} (${N}'s portfolio)`) ``.
      - On N's tab, `waitingText()` is `` `${S} wants to buy back a card in another player's portfolio: Equity whose founder is ${S}.` ``. Press `LET_GO`.
      - `` tab(`${N} — to act`) `` is selected, and `status()` is `` `seat: ${N} — offer — Your turn — ${hint('offer')}` ``.
      - `boardOf(N)` contains `` `portfolio: Equity whose founder is ${S} (offered)` ``, and `seatButtons()` is pinned as the view gives it.
      - **Review Focus.** Press `Undo`: `status()` is `` `seat: ${N} — Your turn — ${hint('veto')}` ``, `waitingText()` is back, and `boardOf(N)` doesn't contain `offered`. Press `LET_GO` again.
      - Press `SELL_BACK` and `` pickNamed(`Equity whose founder is ${S}`) ``. Then:
        - `` tab(`${S} — to act`) `` is selected;
        - `lineOf(S)` starts `` `${S} 2 capital, 2 actions` `` and `lineOf(N)` starts `` `${N} 12 capital` ``;
        - `boardOf(S)` contains `equity: Equity; Equity; Equity`.
    - **A Secondary Trade, answered in the buyer's strip.** `setUp7()` with `tokenOf(…, N)` held by S. Mount.
      - **Declined.** Press `SELL` and `` pickNamed(`Equity whose founder is ${N}`) ``: no question is asked, since T is the only buyer.
        - `` tab(`${T} — to act`) `` is selected, and `status()` is `` `seat: ${T} — offer — Your turn — ${hint('offer')}` ``.
        - `boardOf(S)` contains `` `Equity whose founder is ${N} (offered)` ``.
        - Press `DECLINE`: `` tab(`${S} — to act`) `` is selected, `lineOf(S)` starts `` `${S} 7 capital, 2 actions` ``, and `boardOf(S)` doesn't contain `offered`.
      - **Taken.** Press `SELL` again and pick the token. On T's tab press `TAKE` and `` pickNamed(`Equity whose founder is ${N} (${S}'s portfolio)`) ``. Then:
        - `` tab(`${S} — to act`) `` is selected;
        - `lineOf(S)` starts `` `${S} 12 capital, 1 action` `` and `lineOf(T)` starts `` `${T} 2 capital` ``;
        - `boardOf(T)` contains `` `portfolio: Equity whose founder is ${N}` ``.
    - **The Non-Compete Suit and the court.** `setUp7()` with `tokenOf(…, S)` held by N, the first Non-Compete Suit in `strategy-hand-${S}`, and S's capital at 9 (`setCounter`). Mount.
      - `fittedLayout(game.zones, S)` has `court`, a shared `'pile'`.
      - `click(suit)`: `offered()` contains `[FILE, true]`. Choose it:
        - `status()` is `` `seat: ${S} — lawsuit — Your turn — ${hint('lawsuit')}` ``;
        - `inOrder('court')` is the Suit alone, face up;
        - `lineOf(S)` starts `` `${S} 5 capital, 3 actions` ``.
      - **Review Focus.** Press `Undo`: `inOrder('court')` is `[]`, the Suit is in `strategy-hand-${S}`, and `lineOf(S)` starts `` `${S} 9 capital` ``. File it again.
      - Press `SUE` and `` pickNamed(`Equity whose founder is ${S} (${N}'s portfolio)`) ``. Then:
        - `status()` ends with `hint('actions')`, and `inOrder('court')` is `[]`;
        - `lineOf(S)` starts `` `${S} 0 capital, 3 actions` `` and contains `equity 3`;
        - `lineOf(N)` starts `` `${N} 12 capital` ``.
    - **The Round Start.** Arrange `onTop(inPlay(setUpTwo(), 'Whistleblower Protection Act'), 'Headhunter Holiday')` with:
      - a To-Do List in `development-${FIRST2}` and a Dating App in `operations-${FIRST2}`;
      - `tokenOf(…, FIRST2)` held by SECOND2 on the To-Do List, with `red consultant`.

      Mount with `players: 2`.
      - Press `End your actions` (FIRST2's). On SECOND2's tab, press `Pay salaries` once the status ends with `hint('income')`, then `End your actions`.
      - `` tab(`${SECOND2} — to act`) `` is selected, and `status()` is `` `seat: ${SECOND2} — Your turn — ${hint('event check')}` ``.
      - `seatButtons()` contains `PLACE` and `CONFIRM`; pin the list as the view gives it.
      - Press `PLACE`; the picker's only button is `` `Equity whose founder is ${FIRST2} (on To-Do List in ${FIRST2}'s development)` ``. Pick it. Then:
        - the target `` `To-Do List (${FIRST2}'s development)` `` is greyed;
        - the target `` `Dating App (${FIRST2}'s operations)` `` is live: pick it;
        - `answerAsked('QA')`.
      - `boardOf(FIRST2)` contains `` `with ${SECOND2}'s Equity whose founder is ${FIRST2} (qa consultant)` `` in its `operations:` part.
      - Press `CONFIRM`: `` tab(`${FIRST2} — to act`) `` is selected, and `status()` doesn't contain `hint('event check')`.
    - **How the numbers come:**
      - §17.A: a Founder with no Active product sells at $5;
      - §17.C.4: a Buyback at the Share Price, 7 − 5 = 2 and 7 + 5 = 12;
      - §17.C.5: a Secondary Trade at the Share Price, paid by the buyer to the seller, 7 + 5 = 12 and 7 − 5 = 2;
      - the spec's call: a decline still costs the proposer the action;
      - §17.C.2 and §20.A: the Suit costs $4 and pays the Investor $5, for no action, 9 − 4 = 5, then 5 − 5 = 0 and 7 + 5 = 12;
      - §17.B.4 and the overview's call: at a Round Start the Investor may move a Consultant to another of the Founder's products, picking its colour again;
      - §20.D 15: Headhunter Holiday takes no money at the Round Start.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts src/pages/designer/playtest-fitted.test.tsx`. Expected:
  - the Venture Capital Rain test and the Event's line FAIL;
  - the page flows pass already (Calls 5–6, Tasks 1–4) and are guards; say so in the report.
  - If a guard fails for another reason, stop and report it: it is a page gap, not something to work around.
- [ ] **Step 3: Change the Venture Capital Rain cell** as above. If a Startup line now reads two ways (an `ambiguous` diagnostic), stop and report it.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages src/engine`, then `bun run test` and `bun run typecheck`. Startup compiles with `[]`, and its example count is unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(designer): Buyback, Secondary Trade, the Non-Compete Suit with its court and the Round Start's Consultants are played through the seat tabs, and Venture Capital Rain's effect says it is in effect

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 6: The browser check, the README and the final checks

**Files:**
- Modify: `README.md`
- Browser scripts and screenshots go only in `SCRATCH=/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-7-3`.

**Interfaces:** Consumes Tasks 1–5. Produces nothing new.

- [ ] **Step 1: The probe.** Write `$SCRATCH/probe.ts` and run it with `bun`. It reads `src/games/startup-simulator.rules` and makes these edits:
  - it removes `  The start player is chosen at random.`;
  - it changes `  Each player has 7 capital that everyone can see.` to `  Each player has 30 capital that everyone can see.`;
  - it adds this block right after `  3 new Equity cards go to each equity, each naming its owner as its founder.`, before Setup's deal:

```text
  Move the headhunter holiday from the event deck to the box.
  Move the headhunter holiday from the box to the event deck.
  Move the whistleblower protection act from the event deck to the box.
  Move the whistleblower protection act from the box to the event deck.
  Move the to-do list from the seed deck to p0's development.
  Move the dating app from the seed deck to p1's development.
```

  The checks, for a 3-player engine at each of seeds 1 to 10:
  - the edited rules compile with no diagnostics;
  - p0 is to act, in `actions`, and each seat has 30 capital;
  - the Whistleblower Protection Act is in play, and the event deck's top card is the Headhunter Holiday;
  - p0's development is the To-Do List, and p1's is the Dating App;
  - each seat's equity holds 3 cards whose `founder` is that seat, and every portfolio is empty.

  If a check fails at HEAD (`Shuffle the event deck.` after the anchor, say), stop and report.
- [ ] **Step 2: The browser check.** Copy 6-3's `$SCRATCH/../browser-6-3/check.cjs` helpers: `at()`, `rowCard()`, `STRIP`, `BOARD`, `hover`, `click`, the launch, the error collection, `waitFor`, `press`, `pressIn`, `group`, `line`.
  - **Setup.**
    - Regenerate `zones.json` for p0, p1 and p2 from `fittedLayout(game.zones, viewer, ['p0', 'p1', 'p2'])` on the probe's rules.
    - Run the dev server on 5173 with `--strictPort`, polled with `curl -sf`.
    - Use Chromium with `['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']` and a viewport of `1600 × 3200`.
    - Expect no `pageerror` and no console error.
    - Load the Startup Simulator sample, fill `Rules` with the probe's text, choose `3` and press `Play`.
    - Whenever a turn starts in Income (the status reads Income's hint), press `Pay salaries`. A turn that stops at any other step not listed below: stop and report it with a screenshot.
  - **Screenshots.** Each must show what is listed after it.
    1. **`01-table.png`:**
       - each seat's tableau line contains `equity 3` and `portfolio 0`;
       - `board-p0` contains `equity: Equity; Equity; Equity`;
       - on the canvas, p0's equity row shows three tokens, each face reading `Equity` and `founder: p0`;
       - the court is an empty pile on the shared lines.
    2. **`02-invest.png`.** Press `INVEST_PLACING`, pick `Equity (p1's equity)`, `Dating App (p1's development)` and `Blue`. Then press `INVEST` and pick `Equity (p1's equity)`.
       - p0's line starts `p0 20 capital, 1 action`, and p1's `p1 40 capital`;
       - `board-p0` contains `portfolio: Equity whose founder is p1 (blue consultant) on Dating App in p1's development; Equity whose founder is p1`;
       - on p0's canvas, the first portfolio token is captioned `on Dating App` / `in p1's development` and labelled `blue consultant`.
    3. **`03-hanging.png`.** Press `End your actions`.
       - The `p1 — to act` tab is selected.
       - On p1's canvas the Dating App has p0's token hanging under it, labelled `blue consultant`, its strip clear of the card above.
       - Hovering it (`hover` at its place), the hover line starts `p0's Equity — founder p1`.
    4. **`04-window.png`.** p1 presses `RECRUIT`.
       - The `p0 — to act` tab is selected, and the status reads the veto Hint.
       - The waiting line reads `p1 wants to recruit a junior software dev.`, in p1's colour.
       - The buttons are `VETO` and `LET_GO`.
    5. **`05-pass.png`.** p0 presses `LET_GO`.
       - The `p1 — to act` tab is selected, with no waiting line.
       - p1's line starts `p1 38 capital, 2 actions`, and contains `bench 4`.
    6. **`06-veto.png`.** p1 presses `BUY_BACK` and picks `Equity whose founder is p1 (p0's portfolio, on Dating App in p1's development)`. Then p0, on its tab, presses `VETO` and picks `Equity whose founder is p1`, the button without a place.
       - The `p1 — to act` tab is selected, and p1's line starts `p1 38 capital, 1 action`.
       - `board-p1` contains `equity: Equity; Equity`.
       - `board-p0`'s portfolio part is `portfolio: Equity whose founder is p1 (blue consultant) on Dating App in p1's development`.
    7. **`07-offer.png`.** p1 presses `BUY_BACK` and picks the token; p0 presses `LET_GO`.
       - The `p0 — to act` tab is selected, and the status reads `offer — Your turn — {offer Hint}`.
       - `board-p0`'s portfolio part reads `Equity whose founder is p1 (blue consultant, offered) on Dating App in p1's development`.
    8. **`08-buyback.png`.** p0 presses `SELL_BACK` and picks the token. p1 is out of actions, so its turn runs on to p2's.
       - The `p2 — to act` tab is selected.
       - p0's line starts `p0 25 capital`, and p1's `p1 33 capital`.
       - `board-p1` contains `equity: Equity; Equity; Equity`; its development part has no `with`.
    9. **`09-trade.png`.** p2 presses `INVEST` and picks `Equity (p0's equity)`, then presses `SELL` and picks `Equity whose founder is p0`.
       - The `p1 — to act` tab is selected, and the status reads the offer Hint.
       - p1 presses `TAKE` and picks `Equity whose founder is p0 (p2's portfolio)`.
       - The `p2 — to act` tab is selected; p1's line starts `p1 28 capital`, p2's `p2 30 capital` and p0's `p0 30 capital`.
       - `board-p1` contains `portfolio: Equity whose founder is p0`.
    10. **`10-round-start.png`.** p2 presses `End your actions`. At the next round start the event check passes p0 at once and stops at p1.
        - The `p1 — to act` tab is selected, the status reads the event check's Hint, and the in-play line starts `event in play: Headhunter Holiday`.
        - p1 presses `PLACE`, picks `Equity whose founder is p0`, `To-Do List (p0's development)` and `Red`, then presses `CONFIRM`.
        - Then the `p0 — to act` tab is selected.
        - On p0's canvas the To-Do List has p1's token hanging under it, labelled `red consultant`.
        - `board-p0` contains `with p1's Equity whose founder is p0 (red consultant)`.
    11. **`11-color-match.png`.** Color Match at 3: three panels as before, with no waiting line and no new label.
  - **Afterwards.**
    - Open every PNG (Read) and check it against its list.
    - Judge each caption's and label's readability where a token sits in a row or hangs in a column. Report one that covers a corner index or a neighbour's caption, or can't be read.
    - Stop the dev server.
  - **How the numbers come:**
    - §17.A: every Share Price is $5 (Tier 1 or no product). p0 30 − 5 − 5 = 20, and p1 30 + 10 = 40.
    - §17.D: p1 keeps its last token.
    - §6 and §13.A: a Recruit costs $2, 40 − 2 = 38.
    - §17.B.5: the vetoed Buyback spends its action and pays nothing.
    - §17.C.4: the Buyback pays $5, p1 38 − 5 = 33 and p0 20 + 5 = 25.
    - §17.A: p2 invests in p0, p2 30 − 5 = 25 and p0 25 + 5 = 30.
    - §17.C.5: p1 buys the token from p2 at p0's $5, p1 33 − 5 = 28 and p2 25 + 5 = 30.
    - §9: every Operational Revenue is $0, so no dividend is paid.
    - §20.B: a Junior with no XP draws no salary.
- [ ] **Step 3: Update the README.**
  - **"A table too big for one screen", `The other seats`.** Add:
    - a card another player keeps on one of yours hangs under it, first in its column, and its hover line names whose it is;
    - your card on another player's card is captioned with what it sits on;
    - an action waiting for the players to answer it is written out under every seat's status, cards named as that seat sees them, and the tabs follow each player asked.
  - **`The Board`.** Add:
    - a card that names a player is named as an example names it (`Stake whose maker is p0`), the player whose zone it is in going without saying;
    - another player's card under one of yours reads `p1's …`;
    - a zone whose cards sit on other players' cards lists each with `on Vase in p0's workshop`.
  - **"Buttons that pick cards", `In the playtest`.** Add: a card that sits on another player's card says so in its place, `(p1's holdings, on Vase in p0's workshop)`.
  - **Plan 7-1's paragraph** ("Cards that name a player, cards on other players' cards, lookups, and answering an action before it goes ahead"). Add an `In the playtest` bullet before its `Startup Simulator` one, naming the four points above.
  - **Its `Startup Simulator` bullet.** Add the page:
    - Equity named by its Founder;
    - the portfolio listing placed tokens;
    - Consultants hanging under the Founder's product in their colour;
    - the Veto window's line;
    - Buyback, Secondary Trade and the Non-Compete Suit through the tabs, and the court on the shared table.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests. Then run these checks over `BASE..HEAD`. Each must print nothing, except where noted.

```bash
# Startup Simulator's words in shared code, slices 3–7, tests included
git diff "$BASE" -- src/engine src/pages src/utils ':!src/pages/designer/designer-page.test.tsx' ':!src/pages/designer/playtest-fitted.test.tsx' \
  ':!src/pages/designer/tableaux.test.ts' ':!src/pages/designer/samples.ts' | grep '^+[^+]' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share|tags?|leads?|leading|licen[cs]es?|tiers?|stall(s|ed|ing)?|sectors?|expertise|modes?|bandwidths?|bugs?|qa|online|offline|maint(enance)?|suppl(y|ies)|demands?|xp|pending|skills?|badged|ranks?|mentor(s|ed|ing)?|synerg(y|ies)|agile|graduat(e|es|ed|ing|ion)|training|trained|brainstorm(s|ed|ing)?|strateg(y|ies)|milestones?|seniors?|workaholics?|clean coders?|visionar(y|ies)|toxic|burnouts?|flight risks?|techcrunch|design sprints?|cease|desist|hype|utilit(y|ies)|buffs?|debuffs?|venture capital|bubbles?|patents?|trolls?|angels?|investors?|legacy|regulations?|audits?|open source|hackathons?|chip shortage|crunch|server crash|logjam|frenz(y|ies)|interns?|headhunters?|course boom|whistleblowers?|trade show|events?|equit(y|ies)|founders?|consultants?|dividends?|veto(es|ed|ing)?|partners?(hips?)?|immunit(y|ies)|portfolios?|buybacks?|stocks?)\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# the rules: only the Venture Capital Rain row changed (prints it as removed and as added)
git diff "$BASE" -- src/games/startup-simulator.rules | grep -E '^[-+][^-+]'
# existing test lines removed or changed: only the named classes
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
```

  - The rules check prints only the Venture Capital Rain row.
  - The last check prints only the lines Tasks 1 and 3 named, as their reports list them.
  - Also read the `+` lines of `src/engine`, `src/pages` and `src/utils` for "court", "lawsuit", "offer" in the game's sense, and "stake" used of money rather than 7-1's fixture card.
- [ ] **Step 5: Run the four games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo src/engine/input` passes, and Rent Day still has 108 examples.
- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -F - <<'EOF'
docs: cards named by the player they name, cards on other players' cards hanging and captioned, the waiting action under every seat's status, and slice 7 on the page, checked in a browser

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Gaps

- **G1. An unplaced token keeps the colour it last had, and the page labels it.**
  - 7-2a's Gaps make the colour flags inert off a product, but they stay set. A token sent back by a Pivot, a Veto, a sell-back or a lawsuit is labelled `blue consultant` in its portfolio or supply: on its label and in the Board text.
  - The page can't tell an inert flag from a live one without walking every line of the game that reads it.
  - **Recommendation:** a 7-2 fix wave clears the three flags as a token comes off a product, with the card rule 7-1's "Left to 7-2" suggested.
  - No test here pins a returned token's flags.
- **G2. The Share Price is not on the page.** It is a lookup, not a total, so 4-3's `shownPlayerValues` leaves it out, and the page shows player values only as gauges. A player learns it from the Invest and Buyback buttons' verdicts. Parked.
- **G3. Existing test lines change in two named classes:**
  - Task 1: names of cards naming another seat, and `viewedCards`' two comparisons;
  - Task 3: whole zone lists compared with a two-argument `fittedLayout`.

  Each is listed in its task's report, and Task 6's check prints exactly them.
- **G4. On the canvas, other seats' cards hang first under a card; on its Board line they come after its own.**
  - That order on the canvas is what keeps every drop with the viewer's own zones and every strip in view (Call 3).
  - Recorded, not changed.

## Forward notes

- **Slice 8:**
  - a product sold with Consultants on it returns them, and the page follows the view;
  - an Acquisition moves a product to another Board; no rival token travels with it (slice 8 R2);
  - the Vest / Cease & Desist window can reuse Task 4's line if it stores a `WaitingView`.
- **Slice 9:**
  - a Face-Down product still shows its Consultants, since the portfolio is public;
  - `sitsOn` names it `on a face-down card in p1's development`;
  - the waiting line names a Face-Down card only as `a face-down card` (slice 9 R3), as the view gives it.
- **Slice 10:**
  - a seat that is out is never asked, and its tab never selected;
  - Bankruptcy's seizure moves every token to its Founder's supply, where it goes without saying.
