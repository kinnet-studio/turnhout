# Startup Simulator Slice 7-2b (Rules text and long runs: Equity moved) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Startup Simulator plays the half of slice 7 in which Equity moves:
- **the Veto:** any holder of a Founder's Equity may burn one of their tokens back to the Founder's supply to cancel an action the Founder declares that costs AP. The AP is spent and nothing else happens. Free actions open no window, and a Founder may Veto a sale of their own token (R2).
- **Buyback and Secondary Trade:** each at the current Share Price, with consent; a buyer may place the token as a Consultant.
- **the Non-Compete Suit:** $4, $5 to the Investor, who must return a token.

The long runs play all of it at 2 to 5 players.

**Architecture:**
- **This is plan 7-2b, the second half of slice 7's rules plan** (it grew past eight tasks, so it is two plans).
  - Plan 7-2a (`docs/superpowers/plans/2026-10-16-startup-slice-7-2a-rules-and-runs-equity-held.md`, Equity held: cards, Invest, dividends, Partners, Consultants) is built first. Plan 7-3 (the page) comes after.
  - The seam: 7-2a adds only ordinary actions and steps. This plan adds the Veto window and the consent and lawsuit phases, which change how the long runs judge a move.
- This plan writes only the rules text, its examples and the long runs. It adds no phrase and changes no shared code.
- **Four tasks:**
  1. the Veto: the window line, the veto phase, and the long runs judging a move across a window;
  2. Buyback and Secondary Trade, with the buyer's placement;
  3. the Non-Compete Suit;
  4. long runs: every slice-7b path tallied, whole games replayed; the README and the checks.
- **Phases.** Three are added after `Phase: event check` (the last):
  - `veto`, 7-1's window phase;
  - `offer`, an interrupt like Rent Day's trade, started for the Investor (Buyback) or handed to the buyer (Secondary Trade);
  - `lawsuit`, an interrupt like `research`.

  Phase order after this plan: `modes`, `ops check`, `income`, `actions`, `research`, `sourcing`, `graduation`, `brainstorm`, `engine`, `commit`, `bench cleanup`, `strategy cleanup`, `backlog cleanup`, `final check`, `event check`, `veto`, `offer`, `lawsuit`.
- **Builder calls this plan makes** (recorded for the owner):
  - **The window asks every holder for every action with a cost** (the spec's call, R2).
    - That includes the Investor a Buyback is aimed at, and the Founder of a token being sold.
    - The burned token goes to the Founder's supply with `Move it to its founder's equity.`, placed or not; it comes off its product.
    - "Free actions and the steps of Phases B and D can't be vetoed" holds because only `actions` has buttons with a cost.
  - **Buyback and Secondary Trade share one `offer` phase** with the flag `offered`, as 7-1's `RATE_GAME` does.
    - The Investor answering a Buyback can only `sell back` (its own portfolio holds the token); a buyer can only `take` (the token is in another's portfolio).
    - A decline costs the proposer the action they spent (the spec's call).
    - The price is read as the answer is given; nothing can change it between the offer and the answer.
  - **A buyer may place the token as they take it** (the overview's "placed when the Equity is bought"; builder check, settled). The take-and-place button repeats 7-2a Task 5's three clearing lines and colour options.
  - **The Non-Compete Suit is two presses** (see Gaps):
    - the free `file a card in their strategy hand` pays the Suit's price, parks it in a public pile `the court` and starts `lawsuit`;
    - there the Founder `sue`s one of their tokens in an Investor's portfolio, paying the Suit's `buyout` ($5, read from the court) to its holder, and the Suit goes to the strategy discard.
    - The filing press checks for an Investor, and for the price plus the buyout (`suit cost`), so the lawsuit can't strand.
- **Names.**
  - Zone `court` (pile, center, public). Flag `offered`.
  - Worked numbers `buyout`, `suit cost`. Player value `buyout due`.
  - Phases `veto`, `offer`, `lawsuit`.
  - Buttons:
    - `veto with a card in their portfolio`, `let the action go ahead`;
    - `buy back a card in another player's portfolio`, `sell a card in their portfolio`, `sell back a card in their portfolio`, `take a card in another player's portfolio`, `take a card from another player's portfolio to a card in another player's development or another player's operations`, `decline the offer`;
    - `file a card in their strategy hand`, `sue a card in another player's portfolio`.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-7-equity-design.md` is binding; its "Builder-check rulings" R1–R2 win over its body. R2: a Founder may Veto a Secondary Trade of their own token when they hold the seller's Equity. It is pinned by the example "A holds B's token, B offers A's token to C, A vetoes, B's token goes back to B's supply" (Task 2).

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding, with its Veto calls (only AP actions, at declaration, before anything is paid), its rule "every number comes from the rulebook, and examples say where" and its anti-goals.

The other inputs:
- plan 7-2a, whose Global Constraints, names and test helpers this plan builds on;
- plan 7-1, whose Interfaces blocks (Tasks 3, 7–9 especially) are the phrases and runtime this plan writes with;
- `builder-check-startup-7.md` in the session scratchpad;
- `suwa/rulebook.md` v6.0 §6 (Buyback, Secondary Trade, Divest, the AP table), §17.B.5, §17.C, §17.D, §20.A (Non-Compete Suit), Rulings #22, #25;
- where those are silent, suwa's `resolvers/economy_actions.rs` (`veto`, `buyback`, `secondary_trade`) and `resolvers/strategy_effects.rs` (`non_compete_suit`).

## Global Constraints

- **All of plan 7-2a's Global Constraints apply**, its controller amendments (counts from the committed test, the removal probe each task, the auto-player steered when a tallied path would stay at 0, counts as numbers and flags as `=== true`) and its pre-flight notes included. They are repeated here where they bind.
- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.** This plan adds no key: 7-1's `lang:window` holds a waiting action, and the flag `offered` lives in the rules text.
- **No Startup Simulator words in shared code.**
  - The banned list is plan 7-1's: plan 6-1's list plus equity, investor, founder, consultant, dividend, veto, partner, immunity, portfolio, buyback, stock.
  - This plan touches no shared code. The test file may import 7-1's `waitingOf` and `Waiting` from `src/engine/core/lang/action-window.ts`.
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged. Rent Day keeps its 108 examples.
- **Files this plan changes:**
  - `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts` and `README.md`;
  - test-file pins under `src/pages/designer/**` that read the rules text: the Startup example count in `designer-page.test.tsx`; the offered-button lists, phase lists, zone lists and fitted-table pins in `playtest-fitted.test.tsx` and `tableaux.test.ts` that the new buttons, phases or `court` change.
  - Each such pin is pinned as the view now says it and reported. No page source may change, and nothing under `src/engine/**`.
- **Every number comes from the rulebook, and examples say where:** a section or ruling in each title, and each task's "How the numbers come". The numbers are: the Share Price (7-2a's lines, §17.C.4–5); $4 and $5 for the Suit (§17.C.2, §20.A).
- **Anti-goals (spec and overview):**
  - a vetoed action that pays or moves anything, other than its AP and the burned token;
  - a Founder selling their last token;
  - more than 3 Equity tokens of one Founder;
  - a Secondary Trade to a token's own Founder;
  - Startup words in shared code;
  - a game that can't end;
  - an auto-player that hides a rule that never fires.
- **Every rules line is pinned.** Each line this plan adds or changes fails some example when it alone is removed. Excepted are `Hint:` lines, `Players take turns.` lines, table rows and `Cards can …` declarations. Each task's Step 4 runs plan 5-2a's removal probe.
- **Example counts.** N₉ is the count the committed test pins when Task 1 starts: plan 7-2a's N₈ + 24, plus whatever fix waves add.
  - The tasks end at N₉ + 5, + 12 and + 15.
  - Each task updates `results` in `startup-simulator.test.ts`, the Startup test in `designer-page.test.tsx` and the README's "Its N examples".
- **Commands.**
  - Single file: `bunx vitest run src/games/startup-simulator.test.ts`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1: record `BASE=$(git rev-parse HEAD)`; run `bun run test` once for the passing count and the long runs' time; note N₉.
- **Existing tests.** Only the lines each task names change. If any other existing test fails, stop and report it.
- **Long runs.** If an invariant shows a wrong rule, fix the rules text. If a required tally stays at 0, change the auto-player, never the rules; report a key that stays unreachable and pin its path with an arranged test. If a rule can't be written with plans 4-1 to 7-1's phrases, report it. If the long runs take more than a third longer than at BASE, report the timing.
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefix `feat(games):` (`docs:` for a README-only commit).
  - TDD every task: change the test first, watch it fail, then the rules, pass, `bun run typecheck`, commit.
  - Every rules line below is exact copy. Insertion points name a line or section by its text, never by a line number.
  - **Re-read the committed rules file before each task:** the text of plans 4-2 to 7-2a is the base. If a named anchor line is missing or worded otherwise, stop and report it.
  - If a line reads two ways (an `ambiguous` diagnostic), stop and report it.

## Review Focus

- **A vetoed action that was the Founder's last, or one that would have started research, a brainstorm or an offer.**
  - Expected: its AP is spent and nothing else happens. The turn then goes on exactly as after any last action: the Engine, the cleanups, the next seat.
  - Tests: Task 1 example 5, and the long-run Veto invariant.
- **A window that asks the very player the action is aimed at:** the Investor of a Buyback, or the Founder of a token being sold (R2).
  - Expected: they are asked like any holder, in turn from the actor's left. A Veto burns the vetoer's token of the actor, never the token being traded.
  - Tests: Task 2, examples 1 and 4.
- **An offer the answerer can't or won't take:** a buyer short of the price, a decline, a 2-player game.
  - Expected: decline only; the proposer's action is spent; the token stays where it was, not offered. With two players there is no third player to sell to.
  - Tests: Task 2, examples 2, 5 and 6.
- **A Non-Compete Suit with $8, with two Investors, aimed at the wrong token or with no Investor at all.**
  - Expected: refused before anything is paid, the Suit still in hand. With $9 the Founder picks the Investor, who is paid $5; the Suit goes to the strategy discard; the court is empty again.
  - Tests: Task 3, examples 1–3.
- **Undo, replay and the page's view across a window, an offer and a lawsuit.**
  - Expected: the log alone rebuilds the finished game, and undo of the last move gives the state before it. No seat's waiting view names a card it can't see, or any card's id.
  - Tests: Task 1's view check and Task 4.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name. If one is missing or differs, stop and report it.

- **Plan 7-2a, built:**
  - the zones `equity`, `portfolio`; the fact `founder`; the flags `blue consultant`, `red consultant`, `qa consultant`;
  - `Share price:`, `Dividend:`, `Consultant qa:`;
  - the two Invest buttons; the `event check` step with `place …` and `confirm their consultants`;
  - in the test file: `EQUITY_TOKENS`, `founderOf`, `portfolioOf`, `sharePriceOf`, `dividendOf`, `tiedTo`, `INVEST`, `INVEST_PLACING`, `PLACE`, `CONFIRM_CONSULTANTS`, `CONSULTANT_COLOURS`, `foundersBoards`, `equitiesFrom`, `investing()`, the Equity conservation invariant, the attachment and colour invariants.
- **Plan 7-1, built:**
  - `WINDOW_LINE` and the window's checks;
  - `The {phase} passes to the left.` in the window phase and `The action does not go ahead.`;
  - `whose founder is the player acting`;
  - `waitingOf`, `Waiting` (`by`, `move`, `asked`, `at`, `back`), `actingPlayer`;
  - `SeatExtras.waiting` (`WaitingView`);
  - `the {phase} phase starts with its owner`, `Hand the {phase} phase to another player of their choice who …`;
  - `some other player is not the card's {cardplayer}`;
  - `they get its {cardplayer}'s {playervalue} from its {cardplayer}`;
  - the zone `its {cardplayer}'s {perzone}`.
- **Plans 6-2a and 5-2b, built:** the Strategy table with `price`; the strategy hand and discard; `isPlayable`; the Strategy-card conservation invariant (with the attributes in play); `A player may play a card in their strategy hand.` (Design Sprint).
- **Plans 6-2b and 4-2:**
  - `  The event discard is a pile in the center that everyone can see.`;
  - in the test file `TURN_OF_KEY`, `turnsIn(log, skipped)` and `Run.finalCheck` (and however 6-2b skips the `event check` moves), `ranTheEngine`, `atTheEngine`, `keepsTheBudget`, `playTurn`'s phase handling.

---

### Task 1: The Veto: the window line, the veto phase, and the long runs judging a move across a window

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` only where it pins the phase list or what a seat is offered

**Interfaces:**
- Consumes: 7-1 Tasks 7–9; 7-2a's names.
- Produces (rules): the window line; `Phase: veto` with `veto with a card in their portfolio` and `let the action go ahead`.
- Produces (test file):

```ts
const VETO = 'veto with a card in their portfolio';
const LET_IT_GO_AHEAD = 'let the action go ahead';
/** The moves a seat makes in another seat's turn, answering it: Task 2 adds the offer phase's. */
const ANSWERS: string[];                      // [VETO, LET_IT_GO_AHEAD]
/**
 * A move as the long runs judge it across the Veto window (7-1 Task 8):
 * - a press that opened a window spent its cost and did nothing else ('cost');
 * - the move that let the waiting press go ahead did what that press does, made by its presser, its cost already spent ('ahead');
 * - every other move, a Veto included, is itself ('own').
 * `press` is the press the move counts as.
 */
type Judged = { press: Move; as: 'own' | 'cost' | 'ahead' };
/** Follows one game's windows: keeps the press that opened the one now open, and judges each move. */
function windowJudge(): (before: GameState, move: Move, after: GameState) => Judged;
/** The seat whose turn it is (`TURN_OF_KEY`), and the phase its turn stands in: the phase it was interrupted from, during a window or an offer. */
function turnOf(state: GameState): { seat: PlayerId; phase: string };
```

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₉ + 5; the designer page's count too.
    - `PHASES` gains `'veto'` last.
  - **Every check and tally reads `Judged`, never the raw move:**
    - `keepsTheRules`, `happenings` and the tally of move types see `press` for `own` and `ahead`, and see nothing for `cost`;
    - `keepsTheBudget` charges `press`'s cost for `cost`, and nothing for `ahead`;
    - the long run's watch builds one `windowJudge()` per game.
  - **`ranTheEngine` and `atTheEngine`** read the seat and phase from `turnOf(before)`, not `before.turn`. A move that closes a window on the actor's last action runs the Engine for the actor, though another seat made it.
  - **`turnsIn`.** `playGame` adds to the skipped set the log index of each move whose `before.turn.phase` is `veto` (Task 2 adds `offer`), so turns are still runs of the actor's moves.
  - **`playTurn`.**
    - It goes on while `TURN_OF_KEY` is `by`'s, not while `turn.current` is.
    - In `veto`, the current seat answers:
      - it vetoes with the first card of its portfolio whose `founder` is the actor when `(t + w) % 7 === 3`, where `w` counts the windows opened so far in this turn;
      - else it presses `LET_IT_GO_AHEAD` (Task 2 adds R2's case).
    - Its picks go through the view when the run does.
  - **Invariants (Review Focus 1, the spec's anti-goal):**
    - a window is open (`waitingOf` not null) only in the `veto` phase, and its `by` is `turnOf(state).seat`;
    - when a press opens one, its `asked` is every seat still in, from the actor's left round to its right, whose portfolio held a card naming the actor in `before`;
    - a `VETO` move moves exactly one card, from the vetoer's portfolio to the actor's equity, on no card. It changes no capital, no counter and no other card, and the actor's actions are as the opening move left them. Later steps the closing move runs are judged as their own moves: the Engine, the cleanups and the next turn after a last action.
    - 7-2a Task 5's `lang:on` invariant gains: … or in a `VETO` of it, which leaves it on no card.
  - **The view (Review Focus 5).** In the run through the view (seed 1), for each move that opens a window, every seat's `seatExtras(…).waiting` has `by` the actor. The `JSON.stringify` of it holds no card id, and no name of a card in a zone that seat can't see.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **The window** (§17.B.5, the overview's Veto calls, R2). Right after `In every phase:` (before its first rule) add:

```text
  Before an action goes ahead, each player who has a card in their portfolio whose founder is the player acting has the veto, in turn from the left of the player acting.
```

  - **The phase.** After the `Phase: event check` block (the last phase) add:

```text
Phase: veto
  Players take turns.
  Hint: A Founder whose Equity you hold has declared an action. Burn one of their tokens back to them to cancel it, its action spent, or let it go ahead.
  A player may veto with a card in their portfolio.
    Only if it is a card whose founder is the player acting.
    Then:
      Move it to its founder's equity.
      The action does not go ahead.
  A player may let the action go ahead.
    Then:
      The veto passes to the left.
```

  - **Append these 5 examples.**

```text
Example: an Investor may Veto a Founder's action as it is declared, burning one of the Founder's tokens back to their supply: the Recruit is cancelled and its action spent (section 17, the overview's call)
  Given p1's portfolio has an Equity whose founder is p0
  When p0 recruits a junior software dev
  Then the phase is veto
  And it is p1's turn
  And p0 has 2 actions
  When p1 vetoes with the Equity whose founder is p0
  Then the phase is actions
  And it is p0's turn
  And p0 has 2 actions
  And p0 has 7 capital
  And p0's bench is empty
  And p0's equity has an Equity whose founder is p0
  And p1's portfolio is empty

Example: a free action opens no window: a Greenlight goes ahead at once though an Investor holds the Founder's Equity (section 17, the overview's call)
  Given p1's portfolio has an Equity whose founder is p0
  And p0's backlog has a Dating App
  When p0 greenlights the Dating App
  Then the phase is actions
  And it is p0's turn
  And p0's development has a Dating App
  And p1's portfolio has an Equity whose founder is p0

Example: every holder of the Founder's Equity is asked in turn from the Founder's left, and the action goes ahead when all let it go (section 17, the spec's call)
  Given 4 players
  And p1's portfolio has an Equity whose founder is p2
  And p2's portfolio has an Equity whose founder is p0
  And p3's portfolio has an Equity whose founder is p0
  When p0 recruits a junior software dev
  Then the phase is veto
  And it is p2's turn
  When p2 lets the action go ahead
  Then it is p3's turn
  When p3 lets the action go ahead
  Then the phase is actions
  And it is p0's turn
  And p0 has 2 actions
  And p0 has 5 capital
  And p0's bench has a Junior Software Dev

Example: only one of the Founder's own tokens can Veto their action (section 17)
  Given 3 players
  And p1's portfolio has an Equity whose founder is p0 and an Equity whose founder is p2
  When p0 recruits a junior software dev
  And p1 vetoes with the Equity whose founder is p2
  Then it is rejected because "it is a card whose founder is the player acting"
  When p1 vetoes with the Equity whose founder is p0
  Then p1's portfolio has an Equity whose founder is p2
  And p0's equity has an Equity whose founder is p0
  And p0's bench is empty

Example: a Veto of the Founder's last action still spends it, so their turn goes on to the Engine, and a Consultant burned in a Veto leaves its product (section 17, the overview's call)
  Given p0 has 1 action
  And p0's development has a Dating App
  And p1's portfolio has an Equity whose founder is p0
  And the Equity whose founder is p0 in p1's portfolio is on the Dating App in p0's development
  And the Equity whose founder is p0 in p1's portfolio is blue consultant
  When p0 recruits a junior software dev
  And p1 vetoes with the Equity whose founder is p0
  Then it is p1's turn
  And the phase is actions
  And the Dating App in p0's development has 0 blue cubes
  And p0's equity has an Equity whose founder is p0
  And the Equity whose founder is p0 in p0's equity is on no card
```

  **How the numbers come** (§6, §13.A, §17.B.5, the overview's Veto calls):
  - **The Veto:** a holder burns the token back to the Founder, the action is cancelled and the AP is wasted (§17.B.5). It is raised at declaration, before anything is paid, and only against an action that costs AP (the overview). A Recruit costs 1 action and $2 (§6, §13.A): the action is spent, the $2 never paid.
  - **Turn order:** holders are asked from the Founder's left (the spec's call). p1 holds no token of p0's and is not asked. After the Recruit goes ahead: 7 − 2 = 5.
  - **Example 5:** the Founder's last action is spent, so the Engine runs. The burned Consultant no longer sits on the Dating App, which gets no cube (§17.B.4).
  - **Lines each example pins:** 1 the window line, `Move it to its founder's equity.` and `The action does not go ahead.`; 3 `The veto passes to the left.`; 4 the veto button's guard. 2 and 5 are guards of the overview's calls.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
  - 7-1's checks give no diagnostic: the veto phase takes turns, passes on, has no go-to, After line or cost, isn't first and isn't a step phase, and its clause reads only public portfolios.
  - The long runs pass with windows opening once a seat holds Equity.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Investors may Veto an action their Founder declares that costs an action, burning one of the Founder's tokens back to their supply, the action spent and nothing else done

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: Buyback and Secondary Trade, with the buyer's placement

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` only where it pins the actions phase's offered buttons or the phase list

**Interfaces:**
- Consumes: Task 1; 7-1 Task 3's hand-offs, payments and `some other player is not the card's {cardplayer}`; 7-2a Task 5's colours.
- Produces (rules): the flag `offered`; the buttons `buy back …` and `sell a card in their portfolio`; `Phase: offer` with `sell back …`, `take …` (two forms) and `decline the offer`.
- Produces (test file): `BUY_BACK`, `SELL_EQUITY`, `SELL_BACK`, `TAKE`, `TAKE_PLACING`, `DECLINE` (those move types). `ANSWERS` gains the last four.

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₉ + 12; the designer page's count too.
    - `PHASES` gains `'offer'` after `'veto'`.
    - `playGame`'s skipped set adds moves whose `before.turn.phase` is `offer`.
  - **Money (`keepsTheRules`, judged moves):**
    - `BUY_BACK` and `SELL_EQUITY` change no capital;
    - `SELL_BACK`: the mover gains the card's founder's `share price` (in `before`) from that founder;
    - `TAKE` and `TAKE_PLACING`: the mover pays it to the card's holder in `before`;
    - `DECLINE` changes nothing. No Venture Capital Rain bonus on any of them (§20.D 1).
  - **Invariants:**
    - at most one card is `offered`, and only while the phase is `offer`;
    - in a `SELL_EQUITY` press, the seat the offer phase is handed to is neither the seller nor the card's founder (§17.C.5);
    - a `SELL_BACK` moves its card to its founder's equity, and a `TAKE` or `TAKE_PLACING` to the mover's portfolio;
    - a `TAKE_PLACING` card sits on a card of its founder's with one colour (7-2a's invariants);
    - 7-2a Task 5's `lang:on` invariant gains: … or in a `SELL_BACK` or `TAKE` of it (on no card after), or a `TAKE_PLACING` of it (on its target).
  - **The auto-player.**
    - **In `veto` (R2):** the asked seat always vetoes a waiting `SELL_EQUITY` of a token whose `founder` it is, when it holds one of the seller's tokens.
    - **`buyingBack()`**, planned when `(t + a) % 9 === 6`: buy back the first own token held by another seat whose price leaves the seat 2 or more capital.
    - **`selling()`**, planned when `(t + a) % 9 === 2` at 3 or more players: sell the first card of its portfolio. The buyer is the choice's answer as any press's is.
    - **In `offer`, the current seat answers:**
      - holding the offered card, it sells it back unless `t % 3 === 1`, when it declines;
      - else, when it can pay and `t % 4 !== 3`, it presses `TAKE_PLACING` onto the founder's first card in `foundersBoards` order when `t % 2 === 0` and the founder has one, else `TAKE`;
      - else it declines.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Cards.** After `  Cards can be qa consultant.` add `  Cards can be offered.`
  - **The proposals** (§6, §17.C.4–5, ruling 25). In `Phase: actions`, right before `  A player may end their actions.` add:

```text
  A player may buy back a card in another player's portfolio.
    It costs 1 action.
    Only if it is a card whose founder is them.
    Only if they have at least its founder's share price in capital.
    Then:
      It is offered.
      The offer phase starts with its owner.
  A player may sell a card in their portfolio.
    It costs 1 action.
    Only if some other player is not the card's founder.
    Then:
      It is offered.
      Hand the offer phase to another player of their choice who is not the card's founder.
```

  - **The answers** (§6, §17.C.4–5, ruling 22's consent pattern, the overview's "placed when bought"). After the `Phase: veto` block add:

```text
Phase: offer
  Players take turns.
  Hint: You are offered an Equity token at its Founder's Share Price. Accept it, placing it on one of the Founder's products if you like, or decline.
  A player may sell back a card in their portfolio.
    Only if it is offered.
    Then:
      They get its founder's share price from its founder.
      It is not offered.
      Move it to its founder's equity.
      Go back to the interrupted turn.
  A player may take a card in another player's portfolio.
    Only if it is offered.
    Only if they have at least its founder's share price in capital.
    Then:
      They pay its founder's share price to its owner.
      It is not offered.
      Move it to their portfolio.
      Go back to the interrupted turn.
  A player may take a card from another player's portfolio to a card in another player's development or another player's operations.
    Only if it is offered.
    Only if the target card's owner is its founder.
    Only if they have at least its founder's share price in capital.
    Then:
      They pay its founder's share price to its owner.
      It is not offered.
      It goes to their portfolio, on the target card.
      It is not blue consultant.
      It is not red consultant.
      It is not qa consultant.
      They choose one:
        Blue:
          It is blue consultant.
        Red:
          It is red consultant.
        QA:
          It is qa consultant.
      Go back to the interrupted turn.
  A player may decline the offer.
    Then:
      No card is offered.
      Go back to the interrupted turn.
```

  - **Append these 7 examples.**

```text
Example: Buyback: the Founder offers to buy a token back at their current Share Price, and the Investor consents (section 6, section 17, ruling 22)
  Given the phase is actions
  And p0 has 10 capital
  And p0's operations has a Neobank
  And p1's portfolio has an Equity whose founder is p0
  When p0 buys back the Equity whose founder is p0
  Then the phase is veto
  And it is p1's turn
  When p1 lets the action go ahead
  Then the phase is offer
  And it is p1's turn
  And the Equity whose founder is p0 in p1's portfolio is offered
  When p1 sells back the Equity whose founder is p0
  Then the phase is actions
  And it is p0's turn
  And p0 has 2 actions
  And p0 has 0 capital
  And p1 has 17 capital
  And p0's equity has an Equity whose founder is p0
  And the Equity whose founder is p0 in p0's equity is not offered
  And p1's portfolio is empty

Example: a Buyback is refused for another Founder's token or without the price, and an Investor may decline it, the Founder's action spent (section 17, the spec's call)
  Given 3 players
  And p0 has 4 capital
  And p1's portfolio has an Equity whose founder is p0 and an Equity whose founder is p2
  When p0 buys back the Equity whose founder is p2
  Then it is rejected because "it is a card whose founder is them"
  When p0 buys back the Equity whose founder is p0
  Then it is rejected because "they have at least its founder's share price in capital"
  Given p0 has 5 capital
  When p0 buys back the Equity whose founder is p0
  And p1 lets the action go ahead
  And p1 declines the offer
  Then the phase is actions
  And it is p0's turn
  And p0 has 2 actions
  And p0 has 5 capital
  And p1 has 7 capital
  And p1's portfolio has an Equity whose founder is p0 and an Equity whose founder is p2
  And the Equity whose founder is p0 in p1's portfolio is not offered

Example: a Secondary Trade sells a token to a third player at its Founder's Share Price, with the buyer's consent; the Founder is never asked, and Venture Capital Rain pays nothing (section 6, section 17, section 20, ruling 25)
  Given 3 players
  And it is p1's turn
  And the phase is actions
  And the event in play has the Venture Capital Rain
  And p0's operations has a Neobank
  And p1's portfolio has an Equity whose founder is p0
  And p2 has 10 capital
  When p1 sells the Equity whose founder is p0
  Then the phase is offer
  And it is p2's turn
  When p2 takes the Equity whose founder is p0
  Then the phase is actions
  And it is p1's turn
  And p1 has 2 actions
  And p1 has 17 capital
  And p2 has 0 capital
  And p0 has 7 capital
  And p2's portfolio has an Equity whose founder is p0
  And the Equity whose founder is p0 in p2's portfolio is not offered

Example: a Founder who holds the seller's Equity may Veto the sale of their own token, burning the seller's token back to the seller's supply (the slice's R2, section 17)
  Given 3 players
  And it is p1's turn
  And the phase is actions
  And p0's portfolio has an Equity whose founder is p1
  And p1's portfolio has an Equity whose founder is p0
  When p1 sells the Equity whose founder is p0
  Then the phase is veto
  And it is p0's turn
  When p0 vetoes with the Equity whose founder is p1
  Then the phase is actions
  And it is p1's turn
  And p1 has 2 actions
  And p1's equity has an Equity whose founder is p1
  And p1's portfolio has an Equity whose founder is p0
  And p0's portfolio is empty

Example: a buyer who can't pay the Share Price can only decline, and the seller's action is spent (section 17, ruling 25)
  Given 3 players
  And it is p1's turn
  And the phase is actions
  And p1's portfolio has an Equity whose founder is p0
  And p2 has 4 capital
  When p1 sells the Equity whose founder is p0
  And p2 takes the Equity whose founder is p0
  Then it is rejected because "they have at least its founder's share price in capital"
  When p2 declines the offer
  Then the phase is actions
  And it is p1's turn
  And p1 has 2 actions
  And p1's portfolio has an Equity whose founder is p0
  And the Equity whose founder is p0 in p1's portfolio is not offered

Example: in a two-player game there is no third player, so no Secondary Trade (section 6, section 17)
  Given p0's portfolio has an Equity whose founder is p1
  When p0 sells the Equity whose founder is p1
  Then it is rejected because "some other player is not the card's founder"
  And p0 has 3 actions

Example: a buyer may place the token as a Consultant as they take it, picking its colour afresh, never on another Founder's product (section 17, the overview's call)
  Given 4 players
  And p0's portfolio has an Equity whose founder is p1, an Equity whose founder is p2 and an Equity whose founder is p3
  And the Equity whose founder is p1 in p0's portfolio is blue consultant
  And the Equity whose founder is p1 in p0's portfolio is qa consultant
  And the Equity whose founder is p2 in p0's portfolio is red consultant
  And p1's development has a Smart Lock
  And p2's development has a Dating App
  And p3's development has a To-Do List
  When p0 sells the Equity whose founder is p1, paying p3
  Then the phase is offer
  And it is p3's turn
  When p3 takes the Equity whose founder is p1 to the Dating App, choosing red
  Then it is rejected because "the target card's owner is its founder"
  When p3 takes the Equity whose founder is p1 to the Smart Lock, choosing red
  And p0 sells the Equity whose founder is p2, paying p1
  And p1 takes the Equity whose founder is p2 to the Dating App, choosing blue
  And p0 sells the Equity whose founder is p3, paying p2
  And p2 takes the Equity whose founder is p3 to the To-Do List, choosing qa
  Then p0 has 22 capital
  And p1 has 2 capital
  And p2 has 2 capital
  And p3 has 2 capital
  And the Equity whose founder is p1 in p3's portfolio is on the Smart Lock in p1's development
  And the Equity whose founder is p1 in p3's portfolio is red consultant
  And the Equity whose founder is p1 in p3's portfolio is not blue consultant
  And the Equity whose founder is p1 in p3's portfolio is not qa consultant
  And the Equity whose founder is p2 in p1's portfolio is on the Dating App in p2's development
  And the Equity whose founder is p2 in p1's portfolio is blue consultant
  And the Equity whose founder is p2 in p1's portfolio is not red consultant
  And the Equity whose founder is p3 in p2's portfolio is on the To-Do List in p3's development
  And the Equity whose founder is p3 in p2's portfolio is qa consultant
```

  **How the numbers come** (§6, §17.A, §17.C.4–5, §20.C, §20.D 1, ruling 22, ruling 25, R2):
  - **Buyback:** the Founder offers to buy their token back at the current Share Price; if the Investor agrees, they get the cash and return the token (§17.C.4). It costs the Founder 1 AP (§6's table). A Neobank Active makes $10 (§17.A): p0 10 − 10 = 0, p1 7 + 10 = 17. With no Active product it is $5.
  - **The window** asks p1, who holds p0's token, before the offer (Task 1).
  - **Secondary Trade:** the seller spends 1 AP and names the buyer, never the Founder; the price is the current Share Price; the buyer must agree; the Founder cannot prevent it (§17.C.5).
    - p2 pays $10 to p1: p2 0, p1 17; p0 is untouched.
    - Venture Capital Rain is "not on Secondary Trades or Buybacks" (§20.D 1).
  - **R2:** the Veto covers every AP action (§17.B.5), so p0, holding p1's token, vetoes p1's sale of p0's own token, burning p1's token back to p1.
  - **Example 7:** three sales of $5 each: 7 + 15 = 22, and each buyer 7 − 5 = 2. Each buyer is named with `, paying …`, the words examples have for a player chosen.
  - **Lines each example pins:**
    - 1: the Buyback button's lines, `offered`, `sell back`'s four lines;
    - 2: the Buyback's two guards and `decline the offer`'s two lines;
    - 3: the sale's lines and `take`'s lines;
    - 5: `take`'s capital guard;
    - 6: the sale's guard;
    - 7: `take … to a card …`'s target guard, placement, clearing lines and options.
    - 4 is R2's guard.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Founders may buy their Equity back and Investors may sell it to a third player, each at the current Share Price with the other side's consent, a buyer placing it as a Consultant if they like

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: The Non-Compete Suit

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `tableaux.test.ts` and `playtest-fitted.test.tsx` only where they pin the center zones or the Strategy buttons

**Interfaces:**
- Consumes:
  - 5-1's `a card's {attribute} goes up by its {attribute}`;
  - 4-1's `{cardclass}'s {attribute} is its {attribute}` and `is {int}`, and `a player's {playervalue} is the total {attribute} of {cardgroup}`;
  - 7-1 Task 3's `they pay its {cardplayer}'s {playervalue} to its owner`;
  - 4-1's `move {zone} to {zone}`;
  - 5-2b's Strategy table.
- Produces (rules): the zone `court`; worked `buyout`, `suit cost`; player value `buyout due`; the button `file a card in their strategy hand`; `Phase: lawsuit` with `sue a card in another player's portfolio`.
- Produces (test file): `FILE`, `SUE` (those move types).

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₉ + 15; the designer page's count too.
    - `PHASES` gains `'lawsuit'` after `'offer'`.
    - The values test adds `buyout` and `suit cost` (numbers); `playerValues` gains `'buyout due'` right after `'dividend'`.
    - `'lays out the table …'`: after `['event-discard', false, 'pile', 'public']` add `['court', false, 'pile', 'public']`.
  - **The Strategy-card conservation invariant** counts the court with the deck, the discard, the hands, the brainstorm rows and the attributes in play.
  - **Invariant:** the court holds a card only while the turn stands in `lawsuit`, and then exactly one, a Non-Compete Suit.
  - **7-2a Task 5's `lang:on` invariant** gains: … or in a `SUE` of it, which leaves it on no card in its founder's equity.
  - **Money:**
    - a `FILE` press pays the Suit's `price` (in `before`) to the bank;
    - a `SUE` press pays the mover's `buyout due` (in `before`) to the holder of the card it moves.
  - **The auto-player.**
    - **`suing()`**, a free move made at most once a turn, right after `debuffing()`: when its strategy hand holds a Non-Compete Suit, another seat's portfolio holds a card naming it, and the press is allowed, it files the Suit.
    - **In `lawsuit`** it sues the card at `t % n` among the press's candidates (other seats' portfolio cards naming it, `fromZoneIds` order).
    - **`isPlayable`** counts a Non-Compete Suit as playable, so the brainstorm keeps it and the cleanup and flush spare it.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Table.** After `  The event discard is a pile in the center that everyone can see.` add `  The court is a pile in the center that everyone can see.`
  - **The Suit's numbers** (§17.C.2, §20.A). Right after 7-2a's `Consultant qa:` section add:

```text
Buyout:
  A Non-Compete Suit card's buyout is 5.

Suit cost:
  A Non-Compete Suit card's suit cost is its price.
  A card's suit cost goes up by its buyout.
```

  - Right after 7-2a's `Dividend:` section add:

```text
Buyout due:
  A player's buyout due is the total buyout of the cards in the court.
```

  - **Filing** (§17.C.2, §20.A: a Strategy play, 0 AP). In `Phase: actions`, right before `  A player may end their actions.` add:

```text
  A player may file a card in their strategy hand.
    Only if it is a Non-Compete Suit card.
    Only if another player has a card in their portfolio whose founder is them.
    Only if they have at least the card's suit cost in capital.
    Then:
      They pay the card's price.
      Move it to the court.
      The lawsuit phase starts with them.
```

  - **The lawsuit.** After the `Phase: offer` block add:

```text
Phase: lawsuit
  Hint: Pick the Investor whose token of yours comes back. You pay them the buyout.
  A player may sue a card in another player's portfolio.
    Only if it is a card whose founder is them.
    Then:
      They pay its founder's buyout due to its owner.
      Move it to their equity.
      Move the court to the strategy discard.
      Go back to the interrupted turn.
```

  - **Append these 3 examples.**

```text
Example: the Non-Compete Suit costs $4 and pays the Investor $5, who must return the token to the Founder's supply, for no action (section 17, section 20)
  Given the phase is actions
  And p0 has 9 capital
  And p0's strategy hand has a Non-Compete Suit
  And p1's portfolio has an Equity whose founder is p0
  When p0 files the Non-Compete Suit
  Then the phase is lawsuit
  And it is p0's turn
  And p0 has 5 capital
  When p0 sues the Equity whose founder is p0
  Then the phase is actions
  And p0 has 0 capital
  And p1 has 12 capital
  And p0 has 3 actions
  And p0's equity has an Equity whose founder is p0
  And p1's portfolio is empty
  And the strategy discard has a Non-Compete Suit
  And the court is empty

Example: a Founder with two Investors picks whose token comes back, needs the Suit's price and the buyout before filing, and can only take back their own token (section 17, section 20)
  Given 3 players
  And p0 has 8 capital
  And p0's strategy hand has a Non-Compete Suit
  And p1's portfolio has an Equity whose founder is p0 and an Equity whose founder is p2
  And p2's portfolio has an Equity whose founder is p0
  When p0 files the Non-Compete Suit
  Then it is rejected because "they have at least the card's suit cost in capital"
  And p0's strategy hand has a Non-Compete Suit
  Given p0 has 9 capital
  When p0 files the Non-Compete Suit
  And p0 sues the Equity whose founder is p2
  Then it is rejected because "it is a card whose founder is them"
  When p0 sues the Equity whose founder is p0 from p2's portfolio
  Then p0 has 0 capital
  And p2 has 12 capital
  And p1 has 7 capital
  And p1's portfolio has an Equity whose founder is p0 and an Equity whose founder is p2
  And p2's portfolio is empty

Example: a Founder can't file the Suit when no Investor holds their Equity, and no other Strategy card files (section 17, section 20)
  Given p0 has 9 capital
  And p0's strategy hand has a Non-Compete Suit and a Hit Piece
  When p0 files the Non-Compete Suit
  Then it is rejected because "another player has a card in their portfolio whose founder is them"
  Given p1's portfolio has an Equity whose founder is p0
  When p0 files the Hit Piece
  Then it is rejected because "it is a Non-Compete Suit card"
  And p0 has 9 capital
```

  **How the numbers come** (§6 Play Strategy Card, §17.C.2, §20.A):
  - **The Suit:** a Strategy card played for 0 AP at its printed price, $4 (§20.A). The Founder pays an Investor holding their Equity $5, and the Investor must return 1 token (§17.C.2, §20.A).
  - 9 − 4 = 5, then 5 − 5 = 0, and p1 has 7 + 5 = 12. Filing needs $4 + $5 = $9, so $8 is refused before anything is paid (suwa's `non_compete_suit` refuses a Founder who can't pay the $5).
  - **Lines each example pins:**
    - 1: `Buyout:`, `Buyout due:`, the court line in Table (a diagnostic without it), the filing button's pay, move and phase lines, and the lawsuit's four lines;
    - 2: both `Suit cost:` lines and the filing's capital guard, and the lawsuit's guard;
    - 3: the filing's Investor guard and its card guard.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Non-Compete Suit costs $4 and pays an Investor of the Founder's choice $5 to return one of the Founder's tokens to their supply

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: Long runs: every slice-7b path tallied, whole games replayed; the README and the checks

**Files:**
- Modify: `src/games/startup-simulator.test.ts`, `README.md`

**Interfaces:**
- Consumes: every constant and policy above and in plan 7-2a; `windowJudge`, `turnOf`, `waitingOf`.
- **`happenings` gains these keys** (on judged moves, read through the runtime):
  - **The window:**
    - `a window asked one holder` and `a window asked two or more holders`, for a move that opened one, by `waitingOf(after).asked.length`;
    - `an action vetoed`, for a `VETO`; `an action let go ahead`, for a move judged `ahead`;
    - `a last action vetoed`, for a `VETO` after which the Engine had run for the actor (`ranTheEngine` with `turnOf`);
    - `a Consultant burned in a Veto`, for a `VETO` whose card sat on a card in `before`;
    - `a Secondary Trade vetoed by its token's Founder`, for a `VETO` of a waiting `SELL_EQUITY` whose card names the vetoer (R2).
  - **The offers:** `a Buyback accepted`, for `SELL_BACK`; `a Buyback declined` and `a Secondary Trade declined`, for a `DECLINE`, by whether the offered card was in the decliner's portfolio; `a Secondary Trade accepted`, for `TAKE` or `TAKE_PLACING`; `a Consultant placed by a buyer`, for `TAKE_PLACING`.
  - **The Suit:** `a Non-Compete Suit filed`, for `FILE`; `a token sued back`, for `SUE`; `a Consultant sued back`, for a `SUE` whose card sat on a card in `before`.

- [ ] **Step 1: Write the tests.**
  - **`'made every move in those runs …'`** also expects `VETO`, `LET_IT_GO_AHEAD`, `BUY_BACK`, `SELL_EQUITY`, `SELL_BACK`, `TAKE`, `TAKE_PLACING`, `DECLINE`, `FILE` and `SUE` above 0.
  - **Append `it('played slice 7’s moving Equity in those runs: windows asking one holder and several, actions vetoed and let go ahead, a last action vetoed, a Consultant burned, a sale vetoed by its token’s Founder, Buybacks and Secondary Trades accepted and declined, a buyer’s placement, and Suits filed and won')`.** It expects every key above to be above 0.
  - **Append `it('takes back the last move and rebuilds whole games from their logs, through windows, offers and lawsuits (Review Focus: 4 players, seeds 1 to 5)')`.**
    - Play each game to its result, keeping the state before each move.
    - A fresh engine given `loadLog(log)` equals the final state, and `engine.undo()` gives the state before the last move.
    - Across the five logs, some log holds a `VETO`, a `SELL_BACK` and a `SUE` (count them through the watch).
    - For one move in a window, `engine.undo()` gives the state before it, its `waitingOf` equal to the stored one.
  - **Kept as they are:** `'plays the same game through the page’s view as without it'` (now through windows and offers, answered by other seats) and every earlier tally.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`.
  - If a required key stays at 0, print the tally and change the auto-player, never the rules. Ways to reach each key:
    - **R2:** at 3 or more players, sell a token whose founder holds one of the seller's;
    - **a Consultant burned:** veto with a placed token first;
    - **a last action vetoed:** veto more often on the actor's last action;
    - **the Suit:** keep a Non-Compete Suit until an Investor holds the seat's token;
    - **declines:** decline more often at odd `t`.
  - Report a key that stays unreachable, with the tally, and pin its path with an arranged test in the shape of 6-2b Task 5's.
- [ ] **Step 3: Write the README.**
  - **The Startup paragraph** becomes "**Startup Simulator (slice 7)**". After plan 7-2a's sentence, add:
    - an Investor may Veto an action its Founder declares that costs AP, burning a token back to the Founder's supply, the action spent and nothing else done;
    - Founders buy tokens back and Investors sell them to a third player, at the Share Price, with consent;
    - the Non-Compete Suit forces a token back for $5.
    - Its rulings list adds 22.
  - **"It still leaves out"** drops the Veto, Buyback, Secondary Trade and the Non-Compete Suit.
  - **Plan 7-1's README paragraph**'s Startup bullet (7-2a's) also names these lines:
    - the window line;
    - `Move it to its founder's equity.` and `The action does not go ahead.`;
    - `Hand the offer phase to another player of their choice who is not the card's founder.`;
    - `They pay its founder's buyout due to its owner.`
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 5: Run the checks.** The first three print nothing. The fourth prints only the Startup count line in `designer-page.test.tsx` and any pin a task reported.

```bash
# no shared code and no page code changed
git diff --stat "$BASE" -- src/engine src/utils
git diff --stat "$BASE" -- src/pages ':!src/pages/designer/*.test.tsx' ':!src/pages/designer/*.test.ts'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# the page tests' changed lines
git diff "$BASE" -- src/pages/designer | grep -E '^[-+][^-+]'
```

  Also:
  - read every number in the new examples against each task's "How the numbers come";
  - check that no example arranges more than 3 Equity tokens naming one player;
  - run the removal probe once more over every line plans 7-2a and 7-2b added or changed.
- [ ] **Step 6: Run the games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
- [ ] **Step 7: Commit**

```bash
git add src/games/startup-simulator.test.ts README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's long runs veto and let go ahead, buy back, trade, decline and sue Equity at 2 to 5 players, every path tallied and whole games rebuilt from their logs through windows, offers and lawsuits

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Forward notes

- **Plan 7-3 (the page):**
  - the waiting action (`SeatExtras.waiting`) in the asked seat's strip, with its veto and let-go buttons;
  - the offer and lawsuit prompts;
  - the seat switcher following `turn.current` into `veto` and `offer` and back;
  - the court on the shared table;
  - the browser check of a veto, a let-go, a Buyback and a trade.
- **Slice 8:**
  - Divest of a product is a second kind of sale. Its consent can reuse the `offer` phase's shape, but its button words must differ from `sell a card in their portfolio`.
  - The Vest / Cease & Desist window is a different window (the victim answers after payment), and must open on public facts only (slice 8 R4).
  - A Vested or CTO token never sits in a portfolio, so the Veto, Buyback and the Suit can't take it (§16.D.2, §11.G.2).
- **Slice 10:** Bankruptcy's seizure is `For each card in their portfolio, move it to its founder's equity.`, unpaid, and needs no window (it is no action).

## Gaps against plan 7-1

None that needs a new phrase: every line above is written with plans 4-1 to 7-1's phrases. These calls follow from what the language reads:
- **The Non-Compete Suit is two presses.**
  - Nothing reads it as one: no button picks both a card in the hand and a card in another player's zone, no test of `the target card` reads the player a card names, and no guard adds a card's number to a fixed amount.
  - So `file` pays the price, parks the Suit in the public `court` and starts `lawsuit`, where the token is picked. The buyout lives on the Suit (`buyout`), its total with the price on the Suit (`suit cost`), and the payment reads it from the court (`buyout due`). Each number is written once.
- **An example names a Secondary Trade's buyer with `, paying p3`.** That is the only wording an example has for a player choice (`compile-example.ts`), so it reads oddly for a sale.
- **The buyer's placement repeats 7-2a's three clearing lines and colour options,** a third copy (see 7-2a's Gaps: no line clears a card's flags as it leaves a card).
- **Plan 7-1's recorded limit holds:** a window button that changes what the waiting action reads could make it throw as it goes ahead. Here the veto phase's only such button stops the action, and `let the action go ahead` touches nothing.
