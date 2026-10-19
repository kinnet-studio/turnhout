# Startup Simulator Slice 10-2 (Rules text and long runs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Startup Simulator plays slice 10, Bankruptcy and the Broken Chain, and with it the whole rulebook:
- a caught owner Folds or Settles in a step of their own, from an Audit or from a Come Clean, and what they owe is kept in order;
- an owner who can't pay in cash goes Bankrupt: Equity seized, products sold one at a time (Market Sale, then Fire Sale) until covered, a $0 product kept, a Fold's shortfall forgiven;
- Settle needs cash plus Fire Sale value to cover everything owed, and a Bankrupt player spends only cash above what they owe;
- a sale of a Tag source offers Come Clean to the seller and the seller's Partners who lost the Tag, free after a Fire Sale and for the License after a sale to a player, with Legacy Status for that Tag;
- a Come Clean that reveals another missing Tag is a failed Audit with no Whistleblower, which may bankrupt a second player inside the first's sale;
- the whole valuation is scored line by line against §12.

The long runs play all of it at 2 to 5 players.

**Architecture:**
- **This is plan 10-2, the rules plan of slice 10.** Plan 10-1 (language) is built first, plan 10-3 (the page) after. Seven tasks, so one plan:
  1. the reckoning: Fold and Settle owed, in a step any owner can be put in;
  2. Bankruptcy: the seizure, the liquidation, the forgiven shortfall and Settle's cover;
  3. the Broken Chain after a Fire Sale: the free Come Clean and Legacy Status;
  4. the Come Clean after a Market Sale or an Acquisition, for the License;
  5. a Come Clean that reveals another missing Tag, debts set aside, two debts and levels nested;
  6. the whole valuation, and every ruling cited by an example;
  7. long runs: every slice-10 path tallied, whole games replayed; the README and the checks.

  Each rules task keeps the long runs passing. It adds the auto-player's answers in the phases and buttons it creates, and the invariants its rules need. Task 7 adds the tallies and the steers.
- This plan writes only the rules text, its examples and the long runs. It adds no phrase and changes no shared code.
- **Phases.** Four are added after 9-2's `Phase: bidding` (the last), in this order: `reckoning` (Task 1), `liquidation` (Task 2), `free come clean` (Task 3), `come clean` (Task 4).
  - `reckoning` and `liquidation` are interrupts (`The … phase starts with them.`), each a kept turn on 10-1's stack. `free come clean` and `come clean` are asks (10-1 Task 3's `Each player has the …, in turn from the left of the seller.`).
  - Phase order after this plan ends `…, placing, counter-offer, declaration, bidding, reckoning, liquidation, free come clean, come clean`.
- **Builder calls this plan makes** (the spec leaves wordings and the auto-player to the builder; each is recorded for the owner):
  - **One Fold and one Settle, in `reckoning`** (R3: "generalised to any owner at any moment … and to no Whistleblower"; 10-1 left the place to this plan).
    - The Audit step starts `reckoning` with its owner when it holds a caught card; a failed Come Clean starts it from the reveal's own press. 9-2's two buttons move out of `audit`.
    - With no Whistleblower, the Fold owes its whole $5 to the bank and Settle pays no bounty (§7.E).
  - **What a Fold or Settle costs is owed** (10-1 Task 6's bills): a Settlement's payees are fixed as it is chosen (R3). A rule for every phase pays a player who owes and is not Bankrupt at once, in the order owed.
  - **Bankruptcy is a rule for every phase:** the owner whose spare capital falls below 0 is `bankrupt`; the rule seizes their portfolio unpaid (`For each card in their portfolio, move it to its founder's equity.`, 7-2b's forward note) and starts `liquidation`. A second debt while liquidating sets nothing new (R2).
  - **Liquidation** is `liquidate a card in their operations`, no AP and no Veto (§6's table: "None (Forced)"). Its lines are Divest's: the Market Sale ask, then the Fire Sale. A product a Fire Sale would pay $0 for is refused (§7 Bankruptcy step 2; suwa's `liquidation_target`). It ends when spare capital reaches 0 or no product is left a Fire Sale would pay for; the every-phase rule then pays, the rest of a Fold forgiven.
  - **Settle's cover is a player value** `cover`: capital, plus the Fire Sale price of every product in operations, less what they owe (§7.C, R2). **Spare capital** is capital less what they owe (R2), read by every Market Sale ask and by the paid Come Clean.
  - **The seller is a player flag** `the seller`, set by Divest, Liquidate and the consent's `agree to the sale` (the acquirer's press can't flag its card's owner), and cleared after each sale's Come Clean ask and as each Come Clean phase starts, so a sale nested inside one can set it again (10-1's recorded limit).
  - **The Broken Chain is an ask after the card has moved** (R1), in four places: Divest's and Liquidate's Fire Sale lines (free), the Market Sale's buy and the Acquisition (paid). Its `Only if` lines read only public facts: the sold card provides a Tag, the asked player is the seller or tied to the seller, neither they nor any player tied to them now has that Tag, and they have a card lying face down.
  - **A product that provides no Tag breaks no chain** (§7.E "a Tag Source"; the four alternative unicorns provide none). No phrase says a card *has* a column, so two worked flags say it: `Tagless:` and `Providing:` (Gap 1).
  - **The Come Clean reveal checks Missing Dependency only, the sold Tag excused** (R3): it marks Secured Access as Voluntary Disclosure does, catches on `requires missing` or `also requires missing`, clears the marks, and starts `reckoning` when caught. A paid Come Clean grants Legacy Status too (R3).
  - **Marks move from the Audit step's start to its offer rule, and every press that marks clears after itself.** Marks are game-wide, not per level (Gap 3): a sale nested in an Audit step must never see the Audit's marks, and the next Audit of the step must find them afresh.
  - **Legacy Status is two flags that last until the card moves** (10-1 Task 8). It ends with a Pivot, a Fold or a Launch, so no product in operations ever holds it, and the spec's "a Legacy product sold" can't arise (Gap 4).
  - **A Bankrupt player plays on** (§7 Bankruptcy; 10-1's call). No seat goes out.
  - **Every rare path is reached by the auto-player** (the overview's anti-goal), with steers that read only what each seat may see (Task 7).
- **Names.**
  - Players: flags `bankrupt`, `liquidating`, `the seller`; values `spare capital`, `cover`.
  - Cards: flags `requires legacy`, `also requires legacy` (until moved); worked flags `hidden`, `tagless`, `providing`.
  - Phases: `reckoning`, `liquidation`, `free come clean`, `come clean`.
  - Buttons: `fold a card in their development` and `settle a card in their development` (moved to `reckoning`); `liquidate a card in their operations`; `reveal a card in their development`, `decline to reveal`; `come clean with a card in their development`, `decline to come clean`.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-10-bankruptcy-broken-chain-design.md` is binding, and its "Builder-check rulings" win over its body:
- R1: vulnerable means a Face-Down project needing the sold Tag whose owner had Secured Access before the sale and has none after, checked after the move (the seller and the seller's Partners); every such owner with any Face-Down project is asked, in turn from the seller's left, the seller last; the offer reads only public facts; the $0 Partner rate can't arise.
- R2: from going Bankrupt until the liquidation ends, a player spends only cash above what they owe (a Come Clean fee, a Market Sale purchase); a second audit cost joins the first with no second seizure; Settle needs cash plus Fire Sale value to cover everything owed; debts are paid in the order they arose; only a Fold fine can go unpaid; players' debts stay separate.
- R3: the Come Clean reveal checks Missing Dependency only, the sold Tag excused; Legacy is cleared whenever the card leaves its owner's Board; a paid Come Clean grants Legacy too; a Settlement's cost and payees are fixed when chosen; Fold and Settle for any owner at any moment, with no Whistleblower; nested interrupts are a stack with per-level context in facts.

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding, with its anti-goals: a game that can't end (bankruptcy happens mid-turn, mid-ask and mid-step), hidden information leaking (a Bankrupt player's hidden cards stay hidden), and its rule "every number comes from the rulebook, and examples say where".

The other inputs:
- plan 10-1 (`docs/superpowers/plans/2026-10-16-startup-slice-10-1-language.md`): its Interfaces are the phrases this plan may use, its `CHAIN_GAME` is the pattern, and its "Left to 10-2" is this plan's floor;
- `builder-check-startup-10.md` (Q1, Q2 and "Checked, not asked") and the controller's `notes-10-preflight.md` ("a bankrupt player plays on"), in the session scratchpad;
- the forward notes for slice 10 in plans 7-1, 7-2a, 7-2b, 8-1, 8-2a, 8-2b, 9-1 and 9-2 (the seizure line, Consultants returned by Liquidation, spare cash under the Market Sale ask, the second ask at a sale, Fold and Settle for any owner, Settle's cover);
- `suwa/rulebook.md` v6.0: §6 (Divest, Acquisition, Voluntary Disclosure, Launch), §7 (C, D, E, Liquidation, Bankruptcy), §12, §17.B.3, §17.C.3, §20.C, §20.D (3, 17), §20.G; Rulings #24 and #25;
- where those are silent, suwa's `resolvers/broken_chain.rs`, `resolvers/audit.rs` (`audit_choice`, `resume_liquidation`, `fold`, `settle`) and `resolvers/economy_actions.rs` (`offer_product`, `seize_equity_for_bankruptcy`, `liquidation_floor`, `liquidation_target`).

## Global Constraints

- **Plan 4-2's controller amendment applies throughout** (P1–P15), as plans 7-2a to 9-2 carry it:
  - counts are taken from the committed test when a task starts, never from this text;
  - every task runs the removal probe over the lines it added or changed, and adds an example for any survivor that isn't display text (P13);
  - the auto-player may be steered beyond a task's brief when the rules alone leave a tallied path at 0, and the report lists each change (P14);
  - checks and tallies read counts as numbers (missing = 0) and flags as `=== true`, never by whether a key exists (P6);
  - no `For each … that is/are <flag>` line (P7).
- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.** This plan adds no key: flags, values and phases live in the rules text; 10-1's `lang:nest` and `lang:bills` are written by the language.
- **No Startup Simulator words in shared code.** The banned list is plan 10-1's (its Global Constraints: plan 9-1's list plus bankrupt, bankruptcy, liquidation and liquidate, broken chain, creditor, insolvent, come clean, seize and seizure, vulnerable). This plan touches no shared code; the words may appear in `src/games/startup-simulator.*`, `README.md` and `docs/`.
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged. Rent Day keeps its 108 examples.
- **Files this plan changes:**
  - `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts` and `README.md`;
  - test-file pins under `src/pages/designer/**` that read the rules text, and no page source: the Startup example count in `designer-page.test.tsx`, and the phase lists, offered-button lists and player-value pins in `playtest-fitted.test.tsx` and `tableaux.test.ts` that the new phases, buttons and values change. Each such pin is pinned as the view now says it and reported. Nothing under `src/engine/**` changes.
- **Every number comes from the rulebook, and examples say where:** a section or ruling in each title, and each task's "How the numbers come". The numbers are:
  - the $5 Fold, $4 to the Whistleblower and $1 to the bank, and the whole $5 to the bank after a failed Come Clean (§7.C, §7.E, ruling 25);
  - the Settlement's $3, a $3 License per missing Tag, $3 more for Ghost Progress alone (§7.C);
  - the $4 bounty, $8 under Whistleblower Protection Act, and none after a failed Come Clean (§7.C, §7.E, §20.D 17);
  - the $3 Come Clean License to the new owner, $5 under Patent Trolls, and $0 after a Fire Sale (§7.E, §20.D 3);
  - the M&A Price ($6 / $12 / $20 by Tier, +$5 per Hype, −$5 per Scandal) and the Fire Sale's 50% rounded down, a $0 product kept (§7 Liquidation, §7 Bankruptcy);
  - §12's lines: 1 point per $5, 2 per Market Share, 5 per rival Equity token, +5 per Hype, −5 per Scandal, +5 for a Host, each Milestone's face value (§20.G), 1 per Permanent XP or Skill token and 2 per Badge, the Stealth Bonus's face value, −2 / −5 / −10 Vaporware;
  - the 3 starting actions and 7 starting capital of the opening block (§4), as every earlier example uses them.
- **Hidden information (the overview's anti-goal, slice 9 R3, R1).**
  - No rival's view contains a Face-Down card's name, its counts or a value worked out from it, a Bankrupt player's included: board text, scene data, worked values, waiting lines, button verdicts and refusal reasons.
  - Whether a Come Clean ask opens, and whom it asks, reads only public facts (R1); the waiting line names only the sold product.
  - The auto-player's choices for a seat read only what that seat may see, so it plays the same game through the page's view as without it.
- **Anti-goals (spec and overview):**
  - a chain of levels that resumes out of order, or leaves a player with nothing to press;
  - money below 0, or a debt kept except while its player is Bankrupt;
  - a Settlement left unpaid, or a bill paid out of the order it was owed;
  - a Bankrupt player spending cash they owe;
  - a Broken Chain on anything but a sale, or an offer that depends on a hidden card;
  - a Legacy flag on a card that has moved, or on a card lying face down;
  - a game that can't end, or an auto-player that hides a rule that never fires (Ghost Progress excepted by slice 9 R2);
  - Startup words in shared code.
- **Every rules line is pinned.** Each line this plan adds or changes fails some example, or one of its task's named tests, when it alone is removed. `Hint:` lines, `Players take turns.` lines and `Cards can …` / `A card can be …` / `Players can …` declarations are exempt.
- **Examples arrange at most 3 Equity tokens naming one player** (7-1's claim rule), and never a mid-example `Given` of an Equity token while another naming the same player is on the table.
- **Example counts.** N₁₃ is the count the committed test pins (`results` length) when Task 1 starts: plan 9-2's N₁₂ + 33, plus whatever fix waves and plans 9-3 and 10-1 add.
  - The tasks end at N₁₃ + 1, + 7, + 13, + 16, + 22 and + 23; Task 7 adds none.
  - Each task updates `results` in `startup-simulator.test.ts`, the Startup test in `designer-page.test.tsx` and the README's "Its N examples".
- **The long runs' per-move checks keep the speed-up plan's style.** Every check this plan adds to `keepsTheRules`, `happenings` or an invariant that runs after every move builds its result first and asks vitest only through `sameAs`, `sameList` or `noneOf`, with its message built lazily (`() => …`). Never a bare `expect` per move.
- **Commands.**
  - Single file: `bunx vitest run src/games/startup-simulator.test.ts`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1: record `BASE=$(git rev-parse HEAD)`; run `bun run test` once for the passing count and the long runs' time; note N₁₃.
- **Existing tests.** Only the lines each task names change. If any other existing test fails, stop and report it.
- **Long runs.**
  - If an invariant shows a wrong rule, fix the rules text.
  - If a required tally stays at 0, change the auto-player, never the rules. Task 7 says what to do if one stays at 0 after its steers.
  - If the long runs take more than a third longer than at BASE, report the timing.
- **Earlier plans come first.**
  - Execution order: 4-1, 4-2 and the speed-up plan (built), 4-3, 5-1, 5-2a, 5-3 Task 1, 5-2b, 5-3 Tasks 2–4, 6-1, 6-3 Task 1, 6-2a, 6-2b, 6-3 Tasks 2–5, 7-1, 7-2a, 7-2b, 7-3, 8-1, 8-2a, 8-2b, 8-3, 9-1, 9-2, 9-3, 10-1. Then this plan, then 10-3.
  - Their rules text is the base. Every anchor below is named by its text.
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefix `feat(games):`, or `docs:` for a README-only commit.
  - TDD every task: change the test first, watch it fail, then the rules, pass, `bun run typecheck`, commit.
  - Every rules line below is exact copy. Insertion points name a line or section by its text, never by a line number.
  - **Re-read the committed rules file before each task.** If a named anchor line is missing or worded otherwise, stop and report it. Where this plan copies a block "as it reads at HEAD" (the Fold's Pivot lines, Divest's Fire Sale lines, the Audit's marks), copy HEAD's lines.
  - In examples, a zone's `Given` comes before any `… has a … on it` Given that adds to the same zone.
  - If a line reads two ways (an `ambiguous` diagnostic), stop and report it. If an example's verb form or refusal text differs from the compiler's (a `… or …` refusal, `comes clean with`), use the compiler's and report it.

## Review Focus

- **A chain broken mid-ask, mid-step and mid-turn:** a second Bankruptcy inside a Come Clean inside a Market Sale inside a liquidation inside an Audit step; a Fold that bankrupts an owner with nothing to sell.
  - Expected: each level resumes the one beneath it, last first; the first sale's offers go on once the second player is done; no seat is left with nothing to press; the turn passes only once every level is closed.
  - Tests: Task 5 examples 1 and 6; Task 5's level invariants; Task 7's replay and undo.
- **What a seat may learn of a hidden card through an offer:** an exposed owner whose Face-Down project doesn't need the Tag; a Bankrupt player's own Face-Down projects; a refused reveal.
  - Expected: asked all the same, from public facts only; every waiting line names only the sold product; a refusal's reason goes only to its presser.
  - Tests: Task 3 examples 2–3 and its view test; Task 3's asked-set invariant; Task 7's view check.
- **Money at its edges:** a Bankrupt player with nothing left to sell, a $0 product, spare capital exactly 0, cash raised but owed, a second debt, a Settlement short of cash but covered.
  - Expected: the Whistleblower first and the rest of a Fold forgiven; the product kept; paid in full; not spendable on a Come Clean or a purchase; joined and Settle offered only when both are covered; paid in full.
  - Tests: Task 2 examples 2–4 and 9-2's changed Ghost Progress example; Task 5 examples 4–6; Task 2's money invariants.
- **Marks and Legacy across levels:** an Audit step that bankrupts its owner and audits again; a Come Clean inside an Audit step's liquidation; a Legacy card pivoted, launched or folded.
  - Expected: no Audit mark survives into the liquidation; the next Audit finds the owner's Tags afresh; Legacy dropped as the card moves.
  - Tests: Task 2 example 6; Task 3 example 6; Task 5 examples 1 and 3; the marks and Legacy invariants.
- **Undo and replay across a Bankruptcy, a liquidation and a Come Clean, levels nested and debts owed.**
  - Expected: the log alone rebuilds the finished game, and undo of the last move gives the state before it, its levels and bills included.
  - Tests: Task 7.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name. If one is missing or differs, stop and report it.

- **Plan 10-1, built (its Interfaces):**
  - `frames.ts`: `framesOf`, `withFrames`, `turnBeneath`, `newestWaiting`, `NEST_KEY`, `WINDOW_KEY`; `board-state.ts`: `keptTurnOf`, `INTERRUPTED_KEY`, `BILLS_KEY`, `Bill`, `billsOf`, `owedBy`; `action-window.ts`: `waitingOf` (the newest waiting);
  - asks: `Each player has the {phase}, in turn from the left of {holder}.`, a second ask in one button and an ask inside an answer; a button of an answering phase may start a phase (Task 2's narrowing);
  - what an offer may read: `they have a card in {zones} {cardclause}` through a flag every line of which reads only how a card lies; `another player tied to them by a card in their {perzone} is {playerflag}`; `some player is {playerflag}`;
  - `its {attribute} is the waiting card's {attribute}`; `they pay the {gamenumber} to the player acting`;
  - `they owe {int}`, `they owe {int} to {holder}`, `they owe the {gamenumber} to another player of their choice who …` (a choice line), `they pay up to what they owe`, `they owe something`, `they owe nothing`; the example words `{player} owes {int}` and `{player} owes nothing`;
  - `a player's {playervalue} is their {counter}`, `a player's {playervalue} goes down by what they owe`, `their {playervalue} is less than {int}`, `their {playervalue} is at least the {gamenumber}`;
  - `a card can be {name} until it moves`;
  - `CHAIN_GAME` and its Task 9 examples passing.
- **Plan 9-2, built:**
  - `Phase: audit` with `  When this phase starts:` holding `    They are under audit.` and the three mark lines (`    Every card in their operations is in reach.`, `    For each card in their portfolio, every card in its founder's operations is in reach.`, `    For each card in each portfolio whose founder is them, every card in its owner's operations is in reach.`); the offer rule `  When they have a card in their development that is open to audit:` with `    Only if no card in their development is caught.`; the end rule with `    No card is in reach.`; the Fold and Settle buttons; `Phase: declaration`, `Phase: bidding` (the last phase);
  - `Requires missing:`, `Also requires missing:`, `Illegal:`, `Ghost only:`, `Settlement:`; the flags `caught`, `in reach`, `the whistleblower`; `A player may disclose a card in their development.`;
  - in the test file `FOLD`, `SETTLE`, `AUDIT`, `RAISE`, `PASS_THE_BID`, `PASS_THE_AUDIT`, `DISCLOSE`, `GREENLIGHT_FACE_DOWN`, `faceDownCards`, `securedFor`, `actionNamed`, `bare`, the `describe('lines the rulebook asks the same of')` tests, the catches and marks invariants.
- **Plan 8-2b, built:** `For each card on it, it loses its vest.` and `… its cto.` in `acquire …` and `buy …`; the locked-equity rule; `Phase: counter-offer`.
- **Plan 8-2a, built:** `fire sale price`, `sale price`, `blue room`, `red room`; `acquire a card in another player's operations` (its first `Then:` line `      Its owner has the consent.`), `Phase: consent` with `agree to the sale`, `divest a card in their operations` with its Market Sale ask and Fire Sale lines, `Phase: market sale` with `buy a card in another player's operations` (its last line `      The action does not go ahead.`) and `pass on the sale`; in the test file `ACQUIRE`, `AGREE`, `REFUSE_SALE`, `DIVEST`, `BUY`, `PASS_SALE`, `askOf`, `salePriceOf`, the for-sale, asked-set and Fire Sale invariants, `divesting()`.
- **Plan 7-2b, built:** the Veto window line; `buy back a card in another player's portfolio` and `Phase: offer`'s `sell back …`; `Move it to its founder's equity.`; in the test file `windowJudge`, `turnOf`, `ANSWERS`, `VETO`.
- **Plan 7-2a, built:** `equity`, `portfolio`; the Partner lines (`Another player tied to them by a card in their portfolio has a card in their operations whose tag is the card's requires.` and the rest); `Each Equity in a player's portfolio scores 5 points.`; `Share price:`; in the test file `tiedTo`, `founderOf`, `investing()`.
- **Plans 6-2b, 6-2a, 5-2b, 5-2a:** `the license` set each Round Start (3, 5 under Patent Trolls); `the event in play has the …`; `Portfolio points:` with Hype, Scandal and Host lines; `Human capital:` and its three score lines; `Each card in a player's milestones scores its vp.`; `Each player scores 1 point for each stealth bonus.`
- **The test file:** `arrange`, `fresh`, `setUp`, `playTurn`, `playGame`, `keepsTheRules`, `keepsTheBudget`, `happenings`, `turnsIn`, `scoreOf`, `buttonOf`, `viewedCards`, `PHASES`, `seatExtras`, `sameAs`, `sameList`, `noneOf`.

---

### Task 1: The reckoning: Fold and Settle owed, in a step any owner can be put in

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` where it pins the phase list

**Interfaces:**
- Consumes: 10-1's `turnBeneath`, `framesOf`, `withFrames`, `keptTurnOf`, the owing phrases, `billsOf`; 9-2's Fold, Settle and audit step; 7-2b's `turnOf`.
- Produces (rules): `Phase: reckoning` holding the Fold and the Settle; the audit step's rule that starts it; the every-phase rule that pays what is owed.
- Produces (test file):

```ts
/** The seat whose turn it is (`TURN_OF_KEY`), and the phase its turn stands in: the turn beneath every open level (10-1's turnBeneath). */
function turnOf(state: GameState): { seat: PlayerId; phase: string };
```

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₁₃ + 1; the designer page's count too. `PHASES` gains `'reckoning'` last. `playGame` skips in `turnsIn` each move whose `before.turn.phase` is `reckoning`.
  - **`turnOf` reads the stack** (a new `describe('reading the levels of play')` after `describe('long runs, …')`): `it('reads the turn beneath every open level, however deep (the slice’s R3)')`.
    - From `fresh(1)` with `turn` set to `{ current: 'p0', phase: 'audit' }` and `TURN_OF_KEY` `'p0'`, take `K = keptTurnOf(state)`.
    - `turnOf(withFrames({ ...state, turn: { current: 'p1', phase: 'reckoning' } }, [{ kept: K }]))` is `{ seat: 'p0', phase: 'audit' }`.
    - With a second kept turn `K2` (`turn` `{ current: 'p1', phase: 'come clean' }`) on top of `K`: still `{ seat: 'p0', phase: 'audit' }`.
    - With no level: the state's own turn's phase.
    - Re-check `windowJudge` and `askOf`: each reads `waitingOf`, which 10-1 made the newest; neither changes. Report if either reads `INTERRUPTED_KEY` or `WINDOW_KEY` itself, and point it at `framesOf`.
  - **Copy tests** (`describe('lines the rulebook asks the same of')`):
    - "folds as a Pivot scraps": the Fold's effects after `Move it to the open idea pool.` now read `They owe 4 to the whistleblower.`, `They owe 1.`, `No player is the whistleblower.`, `Go back to the interrupted turn.`; `actionNamed(FOLD)` is found in `reckoning`.
    - "pays a Settlement's Tag fees as a Greenlight pays its Licenses": the two choice refs are now `they owe the {gamenumber} to that player` with the Greenlight's who-clause and the Greenlight's `Only if` lines, compared with `bare`; the `Some player has …` groups as before.
  - **Invariants (after every move):**
    - **Catches** (replaces 9-2's): a card is `caught` only while `after.turn.phase` is `reckoning`, only in the current seat's development, and only while some seat is `the whistleblower` (Task 5 drops the last clause).
    - **Marks** (widens 9-2's): no card is `in reach` unless `after.turn.phase` is `audit`, `declaration`, `bidding` or `reckoning`.
    - **Owing:** after every move, `BILLS_KEY` is absent from `data`: what a Fold or Settle owes is paid in the same move (Task 2 relaxes this).
    - 9-2's FOLD and SETTLE money checks stand as written.
  - **The auto-player.** 9-2's caught-card policy moves from `audit` to `reckoning`: as the current seat with a `caught` card, when `t % 2 === 0`, or the Event in play is Patent Trolls or Whistleblower Protection Act, it presses `SETTLE` if the rules allow it (answering the payee as any choice); otherwise, or when refused, `FOLD`.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **The audit step** (§7.C, R3). In `Phase: audit`:
    - its `  Hint:` becomes `  Hint: Your rivals may audit your Face-Down projects now, before your new cubes commit.`;
    - right before `  When they have a card in their development that is open to audit:` add:

```text
  When they have a card in their development that is caught:
    The reckoning phase starts with them.
```

    - remove the `A player may fold …` and `A player may settle …` buttons with all their lines (they move below).
  - **Paying what is owed** (§7.C, R2). At the end of `In every phase:` add:

```text
  When a player owes something:
    They pay up to what they owe.
```

  - **The reckoning** (§7.C Options A and B, ruling 9, R3). Right before `End:` add the block below. The Fold's lines down to `      Move it to the open idea pool.`, and the Settle's guards, are 9-2's as they read at HEAD; the copy tests pin them.

```text
Phase: reckoning
  Players take turns.
  Hint: Your Face-Down project was caught. Fold it, scrapping it for $5 ($4 of it to the Whistleblower), or Settle, keeping it for $3 to the bank and a $3 License for each missing Tag (or $3 more for Ghost Progress alone).
  A player may fold a card in their development.
    Only if it is caught.
    Then:
      Every card on it that is egotistic is fired.
      Every card on it whose trait is Ego goes to the open job market.
      For each card on it, it loses its pending blue.
      For each card on it, it loses its pending red.
      For each card on it, it loses its pending green.
      Every card on it goes to their bench.
      It loses its blue cubes.
      It loses its red cubes.
      It loses its new blue cubes.
      It loses its new red cubes.
      It loses its cut blue cubes.
      It loses its cut red cubes.
      It loses its bugs.
      It is not caught.
      The other players' cards on it go to their owners' portfolio.
      Move it to the open idea pool.
      They owe 4 to the whistleblower.
      They owe 1.
      No player is the whistleblower.
      Go back to the interrupted turn.
  A player may settle a card in their development.
    Only if it is caught.
    Only if one of:
      The card has no requires.
      Some player has a card in their operations whose tag is the card's requires.
    Only if one of:
      The card has no also requires.
      Some player has a card in their operations whose tag is the card's also requires.
    Only if they have at least the card's settlement in capital.
    Then:
      They owe 3.
      If it is ghost only, they owe 3.
      They owe the license to another player of their choice who has a card in their operations whose tag is the card's requires.
        Only if they have no card in their operations whose tag is the card's requires.
        Only if no other player tied to them by a card in their portfolio has a card in their operations whose tag is the card's requires.
      They owe the license to another player of their choice who has a card in their operations whose tag is the card's also requires.
        Only if they have no card in their operations whose tag is the card's also requires.
        Only if no other player tied to them by a card in their portfolio has a card in their operations whose tag is the card's also requires.
      It is not caught.
      The whistleblower gets 4 capital.
      If the event in play has the Whistleblower Protection Act, the whistleblower gets 4 capital.
      No player is the whistleblower.
      Go back to the interrupted turn.
```

  - **9-2's examples.** In the example titled `a bluff is caught at its Audit: …`, `  Then the phase is audit` becomes `  Then the phase is reckoning`. No other existing example changes; report any that fails.
  - **Append this example.**

```text
Example: a caught owner Folds or Settles in a step of their own; what they owe is paid at once, the Whistleblower first, and the Audit offer then starts again for their other Face-Down projects (section 7, the slice's R3)
  Given 3 players
  And the phase is actions
  And p1's operations has a Tech Blog
  And p0's development has a Search Engine and a Blockchain Ledger
  And the Search Engine in p0's development is face down
  And the Blockchain Ledger in p0's development is face down
  When p0 ends their actions
  And p1 audits the Search Engine in p0's development
  And p2 passes the bid
  Then the phase is reckoning
  And it is p0's turn
  And the Search Engine in p0's development is caught
  When p0 folds the Search Engine
  Then p0 has 2 capital
  And p1 has 11 capital
  And p0 owes nothing
  And the phase is declaration
  And it is p1's turn
```

  **How the numbers come** (§7.A, §7.C, §20.C): the Search Engine needs Platform, which p0 neither provides nor has from a Partner, so it is caught and the bid comes back. The Fold's $5: 7 − 5 = 2, the Whistleblower's $4 first: 7 + 4 = 11. The offer restarts from p0's left for the Blockchain Ledger (R4 of slice 9).
  - **Lines each example pins:** the audit step's reckoning rule, the Fold's owe lines and `Go back to the interrupted turn.`, and the pay rule (without it p0 still has 7). 9-2's Settle examples pin the Settle's owe lines and its `Go back …` (without it the turn never reaches commit, where the Settle example's cubes commit).
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx \
  src/pages/designer/playtest-fitted.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's caught owner Folds or Settles in a step of their own, owing what it costs, paid at once in the order owed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: Bankruptcy: the seizure, the liquidation, the forgiven shortfall and Settle's cover

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` and `tableaux.test.ts` where they pin the phase list or the player values

**Interfaces:**
- Consumes: Task 1; 10-1's value lines and `owedBy`; 8-2a's Divest lines; 7-2b's `Move it to its founder's equity.`
- Produces (rules): the flags `bankrupt`, `liquidating`; the values `spare capital`, `cover`; the Bankruptcy rule; `Phase: liquidation` with `liquidate a card in their operations`; the marks moved to the offer rule.
- Produces (test file):

```ts
const LIQUIDATE = 'liquidate a card in their operations';
/** Who is paid what when `bills` are paid in the order owed out of `available`: a seat, or the bank for the bank's bills and a seat that is out. */
function paidInOrder(state: GameState, bills: Bill[], available: number): Map<PlayerId | 'bank', number>;
/** One bill a seat owes, and whether a Fold or a Settle made it (R2: only a Fold's may go unpaid). */
type Debt = { bill: Bill; kind: 'fold' | 'settle' };
```

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₁₃ + 7; the designer page's count too.
    - `PHASES` gains `'liquidation'` after `'reckoning'`. `playGame` skips in `turnsIn` each move whose `before.turn.phase` is `liquidation`.
    - The values test: `Object.keys(game.playerValues!)` gains `'spare capital', 'cover'` where their sections fall; read the order from the compiled game and pin it. Re-pin `shownPlayerValues` from HEAD and report the change (each has a line that is no total, so neither should be shown).
  - **Copy tests:**
    - `it('sells off a product as a Divest does: the Market Sale ask, then the Fire Sale (§7 Bankruptcy, §7 Liquidation)')`: `bare` of `actionNamed(LIQUIDATE).effects` equals `bare` of `actionNamed(DIVEST).effects`, each from `It is for sale.` to `Move it to the open idea pool.`, found by the refs' `text`.
    - 9-2's Disclosure test reads the three marks from the audit step's offer rule (`When they have a card in their development that is open to audit:`, after its `Only if` line) instead of `onEnter`.
    - "folds as a Pivot scraps": the tail gains `If their spare capital is less than 0, they are bankrupt.` and `No card is in reach.` before `Go back to the interrupted turn.`
  - **Debts.** The long run's watch keeps, per game, `debts: Map<PlayerId, Debt[]>`: after each move, a seat's bills that are new behind those of `before` are appended with the kind of the move that made them (`SETTLE` → `'settle'`, otherwise `'fold'`); a seat with no bills in `after` has none.
  - **Invariants (after every move):**
    - **No seat goes out:** every seat is still in (`isOut` false for each).
    - **Money:** every seat's capital is 0 or more.
    - **Owing** (replaces Task 1's): a seat has bills in `after` only while it is `bankrupt`; a seat is `bankrupt` exactly when it is `liquidating`; no seat is `bankrupt` once `framesOf(after)` is empty.
    - **Where bills come from:** a seat's bills grow only in a `FOLD` or `SETTLE` (judged as its own), always behind the ones it had, and fall only all at once.
    - **A Settlement is always covered (R2):** for each `bankrupt` seat, its capital plus the `fire sale price` of every card in its operations is at least the sum of its `debts` up to and including its last `'settle'` debt.
    - **The debt set aside (R2):** a seat `bankrupt` in `before` and `after` ends a move with less capital only if it still has at least what it owes (`owedBy(after, seat)`).
    - **The seizure:** in the move a seat becomes `bankrupt`, its portfolio is empty after, and every card that was in it is in its founder's equity on no card.
    - **A `LIQUIDATE`:** made only by a `liquidating` seat in `liquidation`, of a card whose `fire sale price` was more than 0.
    - **Paid in order:** in a judged move after which a seat S has no bills but had some in `before`, or that is S's own `FOLD` or `SETTLE`:
      - S's available capital is its capital in `before` plus what the move brought it before paying: the card's `fire sale price` for a `LIQUIDATE` that opened no ask or a `PASS_SALE` that closed one, the card's `sale price` for a `BUY` of S's card, 0 otherwise;
      - the bills are those of `before`, or for S's own `FOLD` or `SETTLE` those it owes (Task 1's amounts, with the payees chosen);
      - S's capital after is the available less what `paidInOrder` pays, and every other seat's capital changes by what it is paid, less the price for the buyer of a `BUY`, plus the bounty for a Settle's Whistleblower.
    - **Marks:** Task 1's invariant stands as written. A liquidation now runs inside an Audit step, and its phases (`liquidation`, `market sale`) are none of the four, so the invariant is what proves the Fold's and Settle's `No card is in reach.`
    - **9-2's FOLD money check** becomes: with capital of 5 or more in `before`, the Fold pays 4 to the Whistleblower and 1 to the bank; with less, the mover is `bankrupt` after, unless no card of its operations has a `fire sale price` above 0, when it pays what it has, the Whistleblower first (the paid-in-order check). **9-2's SETTLE money check** likewise: in full at once when capital covers the `settlement`, else no capital moves from the mover and it is `bankrupt` after; the bounty is paid at once either way.
  - **The auto-player.** In `liquidation`, as the current seat: it presses `LIQUIDATE` with the first card of its operations, in slot order, that the press allows; when `t % 3 === 1`, the last such card instead.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Declarations.** After the last `  Players can …` line of the opening block add:

```text
  Players can be bankrupt.
  Players can be liquidating.
```

  - **What a player may spend and what covers a Settlement** (§7.C Option B, R2). Right after the `Red room:` section add:

```text
Spare capital:
  A player's spare capital is their capital.
  A player's spare capital goes down by what they owe.

Cover:
  A player's cover is their capital.
  A player's cover goes up by the total fire sale price of the cards in their operations.
  A player's cover goes down by what they owe.
```

  - **Bankruptcy** (§7 Bankruptcy steps 1–2, §17.C.3, rulings 24 and 25, R2). In `In every phase:`, under `  When a player owes something:` add `    Only if they are not bankrupt.` as its first line, and right after that rule add:

```text
  When a player is bankrupt:
    Only if they are not liquidating.
    They are liquidating.
    For each card in their portfolio, move it to its founder's equity.
    The liquidation phase starts with them.
```

  - **Marks found afresh at each offer** (§7.B, Gap 3). In `Phase: audit`, move the three mark lines from `  When this phase starts:` to the offer rule `  When they have a card in their development that is open to audit:`, right after its `    Only if no card in their development is caught.` line. `    They are under audit.` stays where it is.
  - **The Fold and Settle go Bankrupt** (§7.C). In `Phase: reckoning`, in both buttons, right before `      Go back to the interrupted turn.` add:

```text
      If their spare capital is less than 0, they are bankrupt.
      No card is in reach.
```

  - **Settle's cover** (§7.C Option B, ruling 25, R2). In the Settle button, `    Only if they have at least the card's settlement in capital.` becomes `    Only if their cover is at least the card's settlement.`
  - **The liquidation** (§7 Bankruptcy, §7 Liquidation steps 2–3, ruling 25). Right after the `Phase: reckoning` block add the block below. The lines from `      It is for sale.` to `      Move it to the open idea pool.` are Divest's as they read at HEAD; the copy test pins them.

```text
Phase: liquidation
  Players take turns.
  Hint: You are Bankrupt. Sell your products one at a time, in the order you choose, until what you owe is covered: each is offered to the other players at its M&A Price, then the bank buys it for half. A product a Fire Sale would pay $0 for is kept.
  A player may liquidate a card in their operations.
    Only if its fire sale price is more than 0.
    Then:
      It is for sale.
      Each other player has the market sale, in turn from their left.
        Only if they have at least the card's sale price in capital.
        Only if their blue room is at least the card's blue maint.
        Only if their red room is at least the card's red maint.
      It is not for sale.
      Every card on it in the same zone comes off it.
      The other players' cards on it go to their owners' portfolio.
      They get its fire sale price.
      Every card on it goes to their bench.
      It loses its blue cubes.
      It loses its red cubes.
      It loses its cut blue cubes.
      It loses its cut red cubes.
      It loses its bugs.
      It loses its hype.
      It loses its scandal.
      It is not offline.
      Move it to the open idea pool.
  When their spare capital is at least 0:
    They are not bankrupt.
    They are not liquidating.
    Go back to the interrupted turn.
  When they have no card in their operations whose fire sale price is more than 0:
    They are not bankrupt.
    They are not liquidating.
    Go back to the interrupted turn.
```

  - The two end rules hold no `They pay up to what they owe.`: the rule for every phase pays once the player is no longer `bankrupt` (a copy would survive the removal probe; `CHAIN_GAME`'s `PAID_UP` has one).
  - **9-2's examples.**
    - In the example titled `Ghost Progress, new cubes on a Tier 2 project with no Lead, is illegal too; …`:
      - its title's last clause `a second Fold the owner can't cover pays the Whistleblower what is left` becomes `a second Fold the owner can't cover makes them Bankrupt, and the product they sell pays the Whistleblower first`;
      - right after `  When p0 folds the Server Farm` insert `  Then p0 is bankrupt`, `  And the phase is liquidation` and `  When p0 liquidates the Tech Blog`, and the `Then` line that followed becomes `And`;
      - `  And p1 has 13 capital` becomes `  And p1 has 15 capital`.
    - In the examples titled `a Settlement costs a License for each missing Tag, …`, `Ghost Progress alone may Settle too, …` and `during Patent Trolls a Settlement's Tag fee is $5 …`, the refusal `"they have at least the card's settlement in capital"` becomes `"their cover is at least the card's settlement"`. Each owner there holds no product, so the cover is their cash.
  - **Append these 6 examples.**

```text
Example: a Fold the owner can't pay in cash makes them Bankrupt: every Equity token they hold goes back to its Founder unpaid, then they sell their products one at a time, in the order they choose, each offered to the other players at its M&A Price before the bank buys it for half, until the fine is covered; the Whistleblower is paid first and the products left are kept (section 7, section 17, ruling 25)
  Given 3 players
  And the phase is actions
  And p0 has 1 capital
  And p0's operations has a To-Do List, a Dating App and a Mobile Wallet
  And p0's portfolio has an Equity whose founder is p2
  And p2's ops team has a Junior Software Dev
  And p0's development has a Search Engine
  And the Search Engine in p0's development is face down
  When p0 ends their actions
  And p1 audits the Search Engine in p0's development
  And p2 passes the bid
  And p0 folds the Search Engine
  Then p0 is bankrupt
  And p0 owes 5
  And p0's portfolio is empty
  And p2's equity has an Equity whose founder is p2
  And the phase is liquidation
  And it is p0's turn
  When p0 liquidates the Dating App
  Then the phase is market sale
  And it is p2's turn
  When p2 passes on the sale
  Then the phase is liquidation
  And it is p0's turn
  And p0 has 4 capital
  And the open idea pool has a Search Engine and a Dating App
  When p0 liquidates the To-Do List
  And p2 buys the To-Do List
  Then p2's operations has a To-Do List
  And p2 has 1 capital
  And p1 has 11 capital
  And p0 has 5 capital
  And p0 owes nothing
  And p0 is not bankrupt
  And p0 is not liquidating
  And p0's operations has a Mobile Wallet
  And the phase is actions
  And it is p1's turn

Example: a Bankrupt player keeps a product a Fire Sale would pay $0 for, and can't sell it (section 7, ruling 24)
  Given the phase is actions
  And p0 has 4 capital
  And p0's operations has a To-Do List and a Dating App
  And the To-Do List in p0's operations has 1 scandal
  And p0's development has a Search Engine
  And the Search Engine in p0's development is face down
  When p0 ends their actions
  And p1 audits the Search Engine in p0's development
  And p0 folds the Search Engine
  Then the phase is liquidation
  When p0 liquidates the To-Do List
  Then it is rejected because "its fire sale price is more than 0"
  When p0 liquidates the Dating App
  Then p0 has 2 capital
  And p1 has 11 capital
  And p0's operations has a To-Do List
  And p0 is not bankrupt

Example: a Bankrupt player with nothing left worth selling pays what they have, the Whistleblower first; the rest of the Fold fine is forgiven, and they play on (section 7, ruling 24, ruling 25)
  Given 3 players
  And the phase is actions
  And p0 has 1 capital
  And p0's operations has a To-Do List
  And p0's development has a Search Engine
  And the Search Engine in p0's development is face down
  When p0 ends their actions
  And p1 audits the Search Engine in p0's development
  And p2 passes the bid
  And p0 folds the Search Engine
  Then the phase is liquidation
  When p0 liquidates the To-Do List
  Then p0 has 0 capital
  And p1 has 11 capital
  And p0 owes nothing
  And p0 is not bankrupt
  And the phase is actions
  And it is p1's turn
  When p1 ends their actions
  And p2 ends their actions
  Then it is p0's turn
  And the phase is actions

Example: Settle is offered when cash plus the Fire Sale value of the owner's products covers it; an owner short of cash then goes Bankrupt and sells until the Settlement is paid in full, while the bank pays the Whistleblower's bounty at once (section 7, ruling 25)
  Given 3 players
  And the phase is actions
  And p0 has 2 capital
  And p0's operations has a Dating App
  And p2's operations has a Tech Blog
  And p0's development has a Search Engine
  And the Search Engine in p0's development is face down
  When p0 ends their actions
  And p1 audits the Search Engine in p0's development
  And p2 passes the bid
  And p0 settles the Search Engine
  Then it is rejected because "their cover is at least the card's settlement"
  Given the Dating App in p0's operations has 1 hype
  When p0 settles the Search Engine
  Then p0 is bankrupt
  And p0 owes 6
  And p1 has 11 capital
  And the Dating App in p0's operations is not in reach
  And the phase is liquidation
  When p0 liquidates the Dating App
  Then p0 has 1 capital
  And p2 has 10 capital
  And p0 owes nothing
  And the Search Engine in p0's development is face up
  And the Search Engine in p0's development is not caught

Example: only an Audit can make a player Bankrupt: a player who can't pay salaries lets staff go instead, and owes nothing (section 7, ruling 25)
  Given p1 has 1 capital
  And p1's development has a To-Do List
  And the To-Do List in p1's development has the Architect on it
  And the turn passes to the left
  Then the phase is income
  And it is p1's turn
  And p1 is not bankrupt
  And p1 owes nothing

Example: a Bankruptcy in the middle of an Audit step leaves no Secured Access marked behind it, and the next Audit of the step finds the owner's own Tag afresh (section 7, the slice's R3)
  Given 3 players
  And the phase is actions
  And p0 has 2 capital
  And p0's operations has a Tech Blog, a Dating App and a Messaging App
  And p0's development has a Neobank and a Search Engine
  And the Neobank in p0's development is face down
  And the Search Engine in p0's development is face down
  When p0 ends their actions
  And p1 audits the Neobank in p0's development
  And p2 passes the bid
  And p0 folds the Neobank
  Then the phase is liquidation
  And the Tech Blog in p0's operations is not in reach
  When p0 liquidates the Dating App
  Then p0 has 0 capital
  And p1 has 11 capital
  And the phase is declaration
  And it is p1's turn
  When p1 audits the Search Engine in p0's development
  And p2 passes the bid
  Then the Search Engine in p0's development is face up
  And the Search Engine in p0's development is not caught
  And p0 has 3 capital
  And p1 has 8 capital
```

  **How the numbers come** (§7.A–C, §7 Liquidation, §7 Bankruptcy, §17.C.3, §20.C, rulings 24, 25, R2):
  - **Bankruptcy** (§7): only an Audit's Fold or Settlement the owner can't pay in cash. Equity held goes back to its Founder unpaid (step 1); products are sold one at a time in the owner's order, each to a Market Sale first, then a Fire Sale (step 2, ruling 25's "the owner chooses … which product to Liquidate"); a Fold's shortfall is forgiven (step 3).
  - **Prices** (§7, §20.C): every Tier 1 product here sells for $6 and fire-sells for $3; a Scandal takes $5 off (§7), so the To-Do List of example 2 sells for $1 and fire-sells for $0.
  - **Example 1:** the Fold owes 4 to p1 and 1 to the bank; 1 − 5 is −4. p2's token goes back unpaid. The Dating App is offered to p2 alone (p1 has no ops team, so no Blue room), who passes: the bank pays 3, so 4. The To-Do List sells to p2 for 6: p2 7 − 6 = 1, p0 4 + 6 = 10. Covered: p1 7 + 4 = 11, the bank 1, p0 5. The Mobile Wallet is kept. The turn then passes to p1, who holds nothing to earn or pay.
  - **Example 2:** 4 − 5 is −1. The Dating App fire-sells for 3: 7, then 4 to p1 (11) and 1 to the bank: 2.
  - **Example 3:** 1 + 3 = 4; nothing left worth selling, so p1 gets the 4 and the bank's $1 is forgiven. p0 plays on: p1's and p2's turns pass and p0's next turn starts (the round's start finds nothing to do). If the Round Start's event check asks for presses at HEAD, add them as 9-2's Patent Trolls example at HEAD does, and report it.
  - **Order of rules** (`flow.ts`'s `runFlow`): the first rule that holds fires, every phase's before the phase's own, and the loop starts again. So after a Fold that bankrupts, the Bankruptcy rule starts the liquidation before the Audit step's offer can mark anything, and after a liquidation goes back, the rule for every phase pays before the step's offer runs.
  - **Example 4:** the Settlement is $3 to the bank and the $3 License to p2, the only provider of Platform: $6 (§7.C). Cover first: 2 + 3 = 5, short. With a Hype the Dating App sells for $11 and fire-sells for $5: 2 + 5 = 7, covered. The bank pays p1 the $4 bounty at once: 7 + 4 = 11. The Dating App fire-sells (no one has $11 and the Blue room): 2 + 5 = 7, then 3 + 3 paid: 1; p2 7 + 3 = 10.
  - **Example 5:** a player short of salaries lets staff go (§5 Phase B, §7 Bankruptcy "Unpaid Salaries … never do").
  - **Example 6:** the Neobank needs Commerce, which p0 lacks: caught, Folded, 2 − 5 is −3. The Dating App fire-sells for 3: 5, then 4 to p1 (11) and 1 to the bank. p0 keeps Social through the Messaging App, so the sale exposes no one. The offer restarts for the Search Engine, which p0's own Tech Blog secures: clean, and p1's $3 bid goes to p0 (§7.C Scenario 1).
  - **Lines each example pins:**
    - 1: the Bankruptcy rule and its four lines (the seizure: p0's portfolio is empty), the pay rule's `bankrupt` guard, the Fold's `bankrupt` line, `Spare capital:`'s two lines, the liquidate button with its ask and Fire Sale, the first end rule's three lines;
    - 2: `Only if its fire sale price is more than 0.`;
    - 3: the second end rule;
    - 4: Settle's cover guard, `Cover:`'s first two lines (without the capital line 5 is short of 6), Settle's `bankrupt` line and its `No card is in reach.`;
    - 5: a guard of ruling 25;
    - 6: the marks in the offer rule, the Fold's `No card is in reach.`;
    - the copy test pins the liquidate's copied lines; `Cover:`'s last line is pinned by Task 5 example 5.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx \
  src/pages/designer/playtest-fitted.test.tsx src/pages/designer/tableaux.test.ts README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's owner who can't pay a Fold or Settlement in cash goes Bankrupt: Equity seized unpaid, products sold one at a time until covered, a $0 product kept and a Fold's shortfall forgiven, and Settle offered only when cash plus Fire Sale value covers it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: The Broken Chain after a Fire Sale: the free Come Clean and Legacy Status

The reveal here checks nothing: every reveal in this task's examples is legal. Task 5 adds the check.

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` where it pins the phase list

**Interfaces:**
- Consumes: Tasks 1–2; 10-1's ask from a flag's holder's left, the offer reads, `its … is the waiting card's …`, the flag until moved; 7-2a's `tiedTo`.
- Produces (rules): the flags `the seller`, `requires legacy`, `also requires legacy`; `Hidden:`, `Tagless:`, `Providing:`; the free Come Clean ask in Divest and Liquidate; `Phase: free come clean`.
- Produces (test file):

```ts
const REVEAL = 'reveal a card in their development';
const DECLINE_REVEAL = 'decline to reveal';
/** Whether `seat` reaches `tag`: a card whose tag it is lies in its operations or in those of a seat `tiedTo` it. */
function reaches(state: GameState, seat: PlayerId, tag: string): boolean;
/**
 * The seats a sale of `card` by `seller` exposes (R1), in the order the rules ask them: from the seller's left round to the seller, last,
 * each still in that is the seller or tied to it, doesn't reach the card's tag, and has a card face down in its development. None when the
 * card provides no tag. Read on the state after the card has moved.
 */
function exposedBy(state: GameState, seller: PlayerId, card: CardState): PlayerId[];
```

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₁₃ + 13; the designer page's count too. `PHASES` gains `'free come clean'` after `'liquidation'`. `ANSWERS` gains `REVEAL` and `DECLINE_REVEAL`. `playGame` skips in `turnsIn` each move whose `before.turn.phase` is `free come clean`. The values test adds the flags `hidden`, `tagless`, `providing`; re-pin `shownFlags` from HEAD and report the change.
  - **Copy test:** `it('breaks the chain after a Bankrupt player’s Fire Sale as after a Divest’s (§7.E)')`: `bare` of `actionNamed(LIQUIDATE).effects` from `They are the seller.` to `No player is the seller.` equals Divest's.
  - **Invariants (after every move):**
    - **The seller:** at most one seat is `the seller`, and only while `framesOf(after)` holds an action waiting.
    - **Who is asked (R1):** in a move that sells a product to the bank (a card that was in seat S's operations in `before` is in the open idea pool in `after`):
      - if the newest action waiting in `after` is in `free come clean` and was not in `before`, its `asked` equals `exposedBy(after, S, card)`;
      - otherwise `exposedBy(after, S, card)` is empty.
    - **A `REVEAL`:** its card lay face down in `before` and its `requires` or `also requires` is the tag of `waitingOf(before)`'s card; after, it lies face up, is `requires legacy` exactly when its `requires` is that tag and `also requires legacy` exactly when its `also requires` is; no capital moves.
    - **Legacy:** a card is `requires legacy` or `also requires legacy` only face up in a development row; a card comes to hold one only in a `REVEAL` of it (Task 4 adds `COME_CLEAN`).
    - 8-2a's Fire Sale and for-sale invariants stand: the ask that follows the Fire Sale moves no capital.
  - **The view (the slice's R1, slice 9 R3):** `it('tells every seat who is asked to Come Clean and which product was sold, and names none of the asked player’s Face-Down projects (§7.E, the slice’s R1)')`. Take example 2's table up to the free Come Clean's opening.
    - For p0, p1 and p2, `seatExtras(…).waiting` has `by: 'p0'` and `cards: ['Tech Blog']`.
    - `JSON.stringify` of p0's and p2's scene and extras holds no `Server Farm`; of p0's and p1's, no `To-Do List`; p1's own extras list its Server Farm among `REVEAL`'s cards.
    - `engine.dispatch` of p2's `REVEAL` of the To-Do List is refused with a reason that names no card of another seat.
  - **The auto-player.** In `free come clean`, as the current seat: when `(t + r) % 4 !== 3`, where `r` counts the `free come clean` presses made so far in this turn, it presses `REVEAL` with the first card of its development, in slot order, that the press allows (through the view when the run is); otherwise, or with none allowed, `DECLINE_REVEAL`.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Declarations.** After `  Players can be liquidating.` add `  Players can be the seller.` After the last `  Cards can …` line add:

```text
  A card can be requires legacy until it moves.
  A card can be also requires legacy until it moves.
```

  - **What an offer reads** (§7.E, R1, Gap 1). Right after the `Settlement:` section add:

```text
Hidden:
  Only if it is face down.

Tagless:
  Only if it has no tag.

Providing:
  Only if it is not tagless.
```

  - **The free Come Clean after a Fire Sale** (§7.E, R1). In `divest a card in their operations.` and in `liquidate a card in their operations.`:
    - right after `    Then:` add `      They are the seller.`;
    - right after `      Move it to the open idea pool.` add:

```text
      Each player has the free come clean, in turn from the left of the seller.
        Only if the card is providing.
        Only if one of:
          They are the seller.
          Another player tied to them by a card in their portfolio is the seller.
        Only if they have no card in their operations whose tag is the card's tag.
        Only if no other player tied to them by a card in their portfolio has a card in their operations whose tag is the card's tag.
        Only if they have a card in their development that is hidden.
      No player is the seller.
```

  - **A Market Sale ends the seller's flag too.** In the market sale's `buy a card in another player's operations.`, right before `      The action does not go ahead.` add `      No player is the seller.`
  - **The free Come Clean** (§7.E Fire Sale protocol, R1, R3). Right after the `Phase: liquidation` block add:

```text
Phase: free come clean
  Players take turns.
  Hint: A product you relied on for a Tag was sold to the bank, and the Tag has left the game. You may Come Clean with a Face-Down project that needs it, for free and with Legacy Status for that Tag, or keep your projects hidden.
  A player may reveal a card in their development.
    Only if it is face down.
    Only if one of:
      Its requires is the waiting card's tag.
      Its also requires is the waiting card's tag.
    Then:
      Turn it face up.
      If its requires is the waiting card's tag, it is requires legacy.
      If its also requires is the waiting card's tag, it is also requires legacy.
  A player may decline to reveal.
    Then:
      The free come clean passes to the left.
```

  - **8-2a's example.** The example titled `a Market Sale offers the product to each rival in turn from the seller's left …` gains `  And p0 is not the seller` as its last line.
  - **Append these 6 examples.**

```text
Example: when a Partner sells the product a Face-Down project relied on for its Tag to the bank, the Tag leaves the game and the project's owner may Come Clean for free, flipping it Face-Up with Legacy Status for that Tag; the seller, with no project Face-Down, isn't asked (section 7, section 17, ruling 25)
  Given the phase is actions
  And it is p1's turn
  And p1's operations has a Tech Blog
  And p1's portfolio has an Equity whose founder is p0
  And p1's development has a To-Do List
  And p0's development has a Search Engine
  And the Search Engine in p0's development is face down
  When p1 divests the Tech Blog
  Then the phase is free come clean
  And it is p0's turn
  And the open idea pool has a Tech Blog
  And p1 has 10 capital
  When p0 reveals the Search Engine
  Then the Search Engine in p0's development is face up
  And the Search Engine in p0's development is requires legacy
  And p0 has 7 capital
  When p0 declines to reveal
  Then the phase is actions
  And it is p1's turn
  And p1 has 2 actions
  And p1 is not the seller

Example: every owner the sale exposes is asked in turn from the seller's left, the seller last, whether or not a Face-Down project of theirs needs the Tag; one that doesn't can't come clean and stays hidden (section 7, the slice's R1)
  Given 3 players
  And the phase is actions
  And p0's operations has a Tech Blog
  And p0's portfolio has an Equity whose founder is p1 and an Equity whose founder is p2
  And p0's development has a Search Engine
  And the Search Engine in p0's development is face down
  And p1's development has a Server Farm
  And the Server Farm in p1's development is face down
  And p2's development has a To-Do List
  And the To-Do List in p2's development is face down
  When p0 divests the Tech Blog
  Then the phase is free come clean
  And it is p1's turn
  When p1 reveals the Server Farm
  And p1 declines to reveal
  Then it is p2's turn
  When p2 reveals the To-Do List
  Then it is rejected because "its requires is the waiting card's tag or its also requires is the waiting card's tag"
  When p2 declines to reveal
  Then it is p0's turn
  And the To-Do List in p2's development is face down
  When p0 reveals the Search Engine
  And p0 declines to reveal
  Then the phase is actions
  And it is p0's turn
  And the Search Engine in p0's development is requires legacy
  And the Server Farm in p1's development is requires legacy

Example: an owner who still has the Tag, their own or a Partner's, isn't offered Come Clean, nor is a player who never relied on the seller; and the sale of a product that provides no Tag breaks no chain (section 7, the slice's R1)
  Given 4 players
  And the phase is actions
  And p0's operations has a Tech Blog and a DAO Nation
  And p0's portfolio has an Equity whose founder is p1 and an Equity whose founder is p2
  And p1's portfolio has an Equity whose founder is p2
  And p1's development has a Server Farm
  And the Server Farm in p1's development is face down
  And p2's operations has an App Store
  And p2's development has a Search Engine
  And the Search Engine in p2's development is face down
  And p3's development has a Cybersecurity Firm
  And the Cybersecurity Firm in p3's development is face down
  When p0 divests the Tech Blog
  Then the phase is actions
  And it is p0's turn
  And the open idea pool has a Tech Blog
  When p0 divests the DAO Nation
  Then the phase is actions
  And it is p0's turn
  And p0 has 20 capital
  And p0 has 1 action

Example: a Bankrupt player's Fire Sale breaks the chain too: an Investor who holds their Equity is still their Partner and may Come Clean for free, while a Founder whose token was seized lost the Tag at the seizure, which breaks no chain (section 7, section 17, ruling 25)
  Given 3 players
  And the phase is actions
  And p0 has 1 capital
  And p0's operations has a Tech Blog
  And p0's portfolio has an Equity whose founder is p2
  And p1's portfolio has an Equity whose founder is p0
  And p0's development has a Neobank
  And the Neobank in p0's development is face down
  And p1's development has a Server Farm
  And the Server Farm in p1's development is face down
  And p2's development has a Cybersecurity Firm
  And the Cybersecurity Firm in p2's development is face down
  When p0 ends their actions
  And p1 audits the Neobank in p0's development
  And p2 passes the bid
  And p0 folds the Neobank
  Then p0 is bankrupt
  And p2's equity has an Equity whose founder is p2
  And the phase is liquidation
  When p0 liquidates the Tech Blog
  Then the phase is free come clean
  And it is p1's turn
  When p1 reveals the Server Farm
  And p1 declines to reveal
  Then the Server Farm in p1's development is requires legacy
  And the Cybersecurity Firm in p2's development is face down
  And p0 has 0 capital
  And p1 has 11 capital
  And p0 is not bankrupt
  And the phase is actions
  And it is p1's turn

Example: losing a Partnership breaks no chain: after a Buyback ends it no one is offered Come Clean, and the project that relied on it is caught at its next Audit (section 7, section 17, ruling 25)
  Given the phase is actions
  And p1's operations has a Tech Blog
  And p1's portfolio has an Equity whose founder is p0
  And p0's development has a Search Engine
  And the Search Engine in p0's development is face down
  When p0 buys back the Equity whose founder is p0
  And p1 lets the action go ahead
  And p1 sells back the Equity whose founder is p0
  Then the phase is actions
  And it is p0's turn
  And p0 has 2 capital
  When p0 ends their actions
  And p1 audits the Search Engine in p0's development
  Then the Search Engine in p0's development is caught

Example: Legacy Status stays only while its card stays in its owner's development: a Pivot or a Launch ends it, as any move does (section 7, the slice's R3)
  Given the phase is actions
  And p0's operations has a Smart Lock and a Server Farm
  And p0's development has a Planetary Wi-Fi and a Smart Grid
  And the Smart Grid in p0's development has 2 blue cubes
  And the Smart Grid in p0's development has 10 red cubes
  And the Smart Grid in p0's development has a Firmware Specialist on it
  And the Planetary Wi-Fi in p0's development is face down
  And the Smart Grid in p0's development is face down
  When p0 divests the Smart Lock
  Then the phase is free come clean
  And it is p0's turn
  When p0 reveals the Planetary Wi-Fi
  And p0 reveals the Smart Grid
  And p0 declines to reveal
  Then the Planetary Wi-Fi in p0's development is also requires legacy
  And the Smart Grid in p0's development is requires legacy
  When p0 pivots the Planetary Wi-Fi
  And p0 launches the Smart Grid
  Then the Planetary Wi-Fi in the open idea pool is not also requires legacy
  And the Smart Grid in p0's operations is not requires legacy
```

  **How the numbers come** (§6, §7.E, §7 Liquidation, §17.B.3, §17.C, §20.C, §20.F.3, rulings 25, R1, R3):
  - **Who is exposed** (§7.E "you lose access to it", R1): the seller and each Partner (either holding the other's Equity, §17.B.3) who had the Tag through the seller and has it nowhere now, own or Partner's. The Fire Sale's Tag leaves the game, so the Come Clean is free and grants Legacy Status for that one Tag (§7.E).
  - **Tags** (§20.C): the Tech Blog and the App Store provide Platform, which the Search Engine, the Server Farm and the Cybersecurity Firm require; the Smart Lock provides IoT, which the Smart Grid requires and the Planetary Wi-Fi needs second (after Cloud, the Server Farm's); DAO Nation provides no Tag (§20.F.3).
  - **Example 1:** no one has the $6 and the Blue room, so the bank pays 3: 7 + 3 = 10. p1 is tied to p0, and p1's own project is Face-Up. A Divest is 1 action: 3 − 1 = 2.
  - **Example 2:** p0 holds both rivals' tokens. From p0's left: p1, p2, then p0. p2's To-Do List needs nothing (§20.C), so it can't come clean, but p2 is asked all the same (R1).
  - **Example 3:** p2 has its own App Store, and p1 is tied to p2 as well; p3 is tied to no one. DAO Nation sells to the bank for 50% of $20: 7 + 3 + 10 = 20, after 2 actions.
  - **Example 4:** caught (no Commerce anywhere p0 reaches) and Folded: 1 − 5 is −4. The seizure ends the tie p0 held with p2 (§7 Bankruptcy step 1); p1 holds p0's token, so p1 is still a Partner. The Tech Blog fire-sells for 3: 4. With nothing else to sell, p1, the Whistleblower, gets the 4: 11; the $1 is forgiven.
  - **Example 5:** with no Active product p0's Share Price is $5 (§17.A): 7 − 5 = 2. A Buyback ends the Partnership and breaks no chain (§7.E).
  - **Example 6:** the Smart Grid is a hybrid (2 Blue, 10 Red), which the Firmware Specialist leads alone (§7.B's table); Divest, Pivot and Launch are 1 action each.
  - **Lines each example pins:**
    - 1: Divest's `They are the seller.`, the ask and the tie alternative, `Hidden:`'s line and the `hidden` line (p1's Face-Up project), `Tagless:`'s line, the reveal's button, `Turn it face up.` and its requires-legacy line, the decline's pass, Divest's `No player is the seller.`;
    - 2: the seller alternative, the reveal's `one of` group;
    - 3: `Providing:`'s line and `Only if the card is providing.`, the two `no card … whose tag is the card's tag` lines, the seller-or-tied group (p3);
    - 4: Liquidate's ask (the copy test too);
    - 5: a guard of §7.E;
    - 6: the reveal's also-requires-legacy line;
    - the buy's `No player is the seller.` is pinned by 8-2a's example's new last line.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx \
  src/pages/designer/playtest-fitted.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's sale of a Tag source to the bank offers the seller and the seller's Partners who lost the Tag a free Come Clean, in turn from the seller's left, with Legacy Status for that Tag until the card moves

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: The Come Clean after a Market Sale or an Acquisition, for the License

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` where it pins the phase list

**Interfaces:**
- Consumes: Tasks 1–3; 10-1's `they pay the {gamenumber} to the player acting`; Task 2's `spare capital`; 6-2b's `the license`.
- Produces (rules): the paid Come Clean ask in the buy and the Acquisition; `They are the seller.` in the consent's agree; `Phase: come clean`.
- Produces (test file):

```ts
const COME_CLEAN = 'come clean with a card in their development';
const DECLINE_COME_CLEAN = 'decline to come clean';
```

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₁₃ + 16; the designer page's count too. `PHASES` gains `'come clean'` after `'free come clean'`. `ANSWERS` gains `COME_CLEAN` and `DECLINE_COME_CLEAN`. `playGame` skips in `turnsIn` each move whose `before.turn.phase` is `come clean`.
  - **Copy test:** `it('breaks the chain after a sale to a player as after a Fire Sale, the phase aside (§7.E)')`: `bare` of the buy's and the acquire's `come clean` ask refs, with the phase argument read as `free come clean`, each equals Divest's ask ref; each is followed by `No player is the seller.`
  - **Invariants (after every move):**
    - **Who is asked (R1)** widens to a sale to a player (a card that was in seat S's operations in `before` is in another seat's operations in `after`, in a `BUY` or an `AGREE`): the newest waiting `come clean` ask, if new, asks `exposedBy(after, S, card)`; else that is empty.
    - **A `COME_CLEAN`:** as Task 3's `REVEAL`, and it moves exactly `the license` (read in `before`) from the mover to `waitingOf(before).by`.
    - **Legacy** widens: a card comes to hold one only in a `REVEAL` or `COME_CLEAN` of it.
  - **The auto-player.** In `come clean`, as the current seat:
    - once per ask, when its development has a card face down whose `requires` or `also requires` is the waiting card's tag and the view greys `COME_CLEAN` for `their spare capital is at least the license`, it presses `COME_CLEAN` with it anyway; the refusal costs nothing (Task 7 tallies it);
    - then as Task 3's policy, with `COME_CLEAN` and `DECLINE_COME_CLEAN`.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **The Come Clean after a sale to a player** (§7.E Market Sale protocol, §6 Acquisition, R1).
    - In the market sale's `buy …`, right before its `      No player is the seller.` (Task 3) add:

```text
      Each player has the come clean, in turn from the left of the seller.
        Only if the card is providing.
        Only if one of:
          They are the seller.
          Another player tied to them by a card in their portfolio is the seller.
        Only if they have no card in their operations whose tag is the card's tag.
        Only if no other player tied to them by a card in their portfolio has a card in their operations whose tag is the card's tag.
        Only if they have a card in their development that is hidden.
```

    - In `acquire a card in another player's operations.`, right after `      Move it to their operations, with everything on it.` add the same six lines, then `      No player is the seller.`
    - In `Phase: consent`'s `agree to the sale.`, right before `      The action goes ahead.` add `      They are the seller.`
  - **The paid Come Clean** (§7.E, §20.D 3, R1, R2, R3). Right after the `Phase: free come clean` block add:

```text
Phase: come clean
  Players take turns.
  Hint: A product you relied on for a Tag was sold to a player. You may Come Clean with a Face-Down project that needs it, paying the new owner the $3 License ($5 during Patent Trolls), with Legacy Status for that Tag, or keep your projects hidden.
  A player may come clean with a card in their development.
    Only if it is face down.
    Only if one of:
      Its requires is the waiting card's tag.
      Its also requires is the waiting card's tag.
    Only if their spare capital is at least the license.
    Then:
      Turn it face up.
      They pay the license to the player acting.
      If its requires is the waiting card's tag, it is requires legacy.
      If its also requires is the waiting card's tag, it is also requires legacy.
  A player may decline to come clean.
    Then:
      The come clean passes to the left.
```

  - **Append these 3 examples.**

```text
Example: when a Partner sells the product a project relied on to another player, the project may Come Clean by paying the new owner the $3 License, which an owner without $3 to spare can't; a Partner of the new owner keeps the Tag and isn't asked (section 7, section 17, ruling 25)
  Given 4 players
  And the phase is actions
  And p0's operations has a Tech Blog
  And p0's portfolio has an Equity whose founder is p1 and an Equity whose founder is p3
  And p2's ops team has a Junior Software Dev
  And p2's portfolio has an Equity whose founder is p3
  And p1 has 2 capital
  And p1's development has a Search Engine
  And the Search Engine in p1's development is face down
  And p3's development has a Server Farm
  And the Server Farm in p3's development is face down
  When p0 divests the Tech Blog
  Then the phase is market sale
  And it is p2's turn
  When p2 buys the Tech Blog
  Then the phase is come clean
  And it is p1's turn
  And p0 has 13 capital
  When p1 comes clean with the Search Engine
  Then it is rejected because "their spare capital is at least the license"
  Given p1 has 3 capital
  When p1 comes clean with the Search Engine
  Then the Search Engine in p1's development is face up
  And the Search Engine in p1's development is requires legacy
  And p1 has 0 capital
  And p2 has 4 capital
  When p1 declines to come clean
  Then the phase is actions
  And it is p0's turn
  And p0 has 2 actions
  And the Server Farm in p3's development is face down

Example: an Acquisition breaks the chain as a Market Sale does: once the seller consents, their Partner may Come Clean by paying the buyer the License (section 7, section 6, ruling 22)
  Given 3 players
  And the phase is actions
  And it is p2's turn
  And p2's ops team has a Junior Software Dev
  And p0's operations has a Tech Blog
  And p0's portfolio has an Equity whose founder is p1
  And p1's development has a Search Engine
  And the Search Engine in p1's development is face down
  When p2 acquires the Tech Blog
  Then the phase is consent
  And it is p0's turn
  When p0 agrees to the sale
  Then the phase is come clean
  And it is p1's turn
  When p1 comes clean with the Search Engine
  And p1 declines to come clean
  Then the phase is actions
  And it is p2's turn
  And p0 has 13 capital
  And p1 has 4 capital
  And p2 has 4 capital
  And p2's operations has a Tech Blog
  And p0 is not the seller

Example: during Patent Trolls a Come Clean after a sale to a player costs the $5 License to the new owner (section 20, section 7)
  Given 3 players
  And the event deck has the Patent Trolls
  And the phase is actions
  And it is p2's turn
  And p0's operations has a Tech Blog
  And p0's ops team has a Junior Software Dev
  And p0's portfolio has an Equity whose founder is p1
  And p1's development has a Search Engine
  And the Search Engine in p1's development is face down
  And p2's ops team has a Junior Software Dev
  When p2 ends their actions
  Then the license is 5
  And it is p0's turn
  When p0 divests the Tech Blog
  And p2 buys the Tech Blog
  And p1 comes clean with the Search Engine
  Then p0 has 14 capital
  And p1 has 2 capital
  And p2 has 6 capital
```

  **How the numbers come** (§5 Phase A–B, §6, §7.E, §17.B.3, §20.C, §20.D 3, rulings 22, 25, R1):
  - **The Market Sale protocol** (§7.E): "the same as the fire sale", but the cost is the $3 License to the new owner, or $5 during Patent Trolls (§20.D 3); without it, the owner can't Come Clean. R2's spare capital is the cash of a player who owes nothing.
  - **Example 1:** the Tech Blog is $6. From p0's left: p1 has $2, p3 has no ops team, so only p2 is asked: 7 − 6 = 1, p0 7 + 6 = 13. p1 is exposed; p3 is tied to p2, who now has Platform (R1: "a Partner of the new owner keeps access and isn't asked", so §17.B.3's $0 rate has no case). With $3, p1 pays p2: 0 and 1 + 3 = 4.
  - **Example 2:** p2's Acquisition is 1 action, $6 to p0: 13 and 1; p1 pays p2 the $3 License: 4 and 4. The agreeing seller is the seller (§6, ruling 22).
  - **Example 3:** the round starts with Patent Trolls, so the license is 5 (6-2b). p0's Income: the Tech Blog earns $1 (§5 Phase B): 8. The sale: 8 + 6 = 14, p2 1. p1 pays p2 $5: 2 and 6. The Round Start is reached as in 9-2's Patent Trolls example; if that example presses anything at HEAD (an event check), press it here too and report it.
  - **Lines each example pins:** 1: the buy's ask, the come clean button, its spare-capital guard, `Turn it face up.`, `They pay the license to the player acting.` and its requires-legacy line, the decline's pass; 2: the agree's `They are the seller.`, the acquire's ask and its `No player is the seller.`; 3: a guard of §20.D 3. The copy test pins the ask's lines in both places; the paid press's also-requires-legacy line is pinned in Task 5 by the copy test of the two presses.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx \
  src/pages/designer/playtest-fitted.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's sale of a Tag source to a player, by Market Sale or Acquisition, offers the exposed owners a Come Clean for the License to the new owner ($5 under Patent Trolls), paid only from spare cash

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: A Come Clean that reveals another missing Tag, debts set aside, two debts and levels nested

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: Tasks 1–4; 9-2's `Requires missing:`, `Also requires missing:` and the marks; 10-1's level reads.
- Produces (rules): the reveal's check in both Come Clean presses; the Legacy lines in the legality check and in Settle; Fold and Settle with no Whistleblower; the seller cleared as each Come Clean phase starts; spare capital in every Market Sale ask.

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₁₃ + 22; the designer page's count too. `ANSWERS` gains `FOLD`, `SETTLE` and `LIQUIDATE`: from now on they may be made in another seat's turn.
  - **Copy tests:**
    - `it('checks a Come Clean’s reveal with the marks of an Audit and clears them after, paid or free (§7.E, the slice’s R3)')`: in each of `actionNamed(REVEAL)` and `actionNamed(COME_CLEAN)`, `bare` of the three effects after the legacy lines equals `bare` of the three marks in the audit step's offer rule; `bare` of the paid press's effects after `They pay the license to the player acting.` equals `bare` of the free press's after `Turn it face up.`
    - "folds as a Pivot scraps": the tail's `They owe 4 to the whistleblower.` becomes the two `If … whistleblower …` lines.
    - "pays a Settlement's Tag fees as a Greenlight pays its Licenses": each of the Settle's two `Only if one of:` groups is the Greenlight's with `It is requires legacy.` (or `It is also requires legacy.`) as its second alternative; each choice's `Only if` lines are the Greenlight's with `Only if it is not requires legacy.` (or `… also requires legacy.`) first.
    - Task 2's liquidate copy test and 8-2a's asked-set invariant read the spare capital guard in both asks.
  - **Invariants (after every move):**
    - **Catches** (Task 1's, without its last clause): a card is `caught` only while `after.turn.phase` is `reckoning`, in the current seat's development.
    - **A reveal's check (R3):** in a `REVEAL` or `COME_CLEAN` judged as its own, the card is `caught` after exactly when it has a `requires` that is not the waiting card's tag and that the mover doesn't reach in `before` (`reaches`), or likewise an `also requires` (a card with none misses nothing there); when caught, `after.turn` is `{ current: mover, phase: 'reckoning' }`; no card is `in reach` after.
    - **No Whistleblower:** a `FOLD` made while no seat is `the whistleblower` owes or pays all 5 to the bank; a `SETTLE` then pays no bounty.
    - **The Settle's Licenses (R3):** a `SETTLE` owes the license for a tag only when the card holds no Legacy for it.
    - **The asked set** of every Market Sale ask (8-2a's, widened to `LIQUIDATE`): the other seats still in, from the mover's left, whose `spare capital` covers the card's `sale price` and whose rooms cover its maintenance, read in `before`.
    - **Levels:** a move opens at most one level (`framesOf(after).length` ≤ `framesOf(before).length` + 1), and the turn passes (`turnStarted`) only in a move after which no level is open.
    - **No one stuck** (in the runs through the view): after every move with no result, the current seat has an allowed button in `seatExtras(…)`.
  - **The auto-player.** Unchanged: `reckoning` is answered by Task 1's policy whoever is current; `liquidation` by Task 2's.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **The excused Tag** (§7.E, R3). At the end of `Requires missing:` add `  Only if it is not requires legacy.` At the end of `Also requires missing:` add `  Only if it is not also requires legacy.`
  - **The reveal's check** (§7.E "Crucial Restriction", R3). In both `reveal a card in their development.` and `come clean with a card in their development.`, right after `      If its also requires is the waiting card's tag, it is also requires legacy.` add the lines below. The three mark lines are the audit step's offer rule's as they read at HEAD; the copy test pins them.

```text
      Every card in their operations is in reach.
      For each card in their portfolio, every card in its founder's operations is in reach.
      For each card in each portfolio whose founder is them, every card in its owner's operations is in reach.
      If it is requires missing, it is caught.
      If it is also requires missing, it is caught.
      No card is in reach.
      If it is caught, the reckoning phase starts with them.
```

  - **A sale nested in an offer sets its own seller** (10-1's recorded limit). In `Phase: free come clean` and `Phase: come clean`, right after the `  Hint:` line add:

```text
  When this phase starts:
    No player is the seller.
```

  - **No Whistleblower** (§7.E, ruling 25). In `Phase: reckoning`:
    - in the Fold, `      They owe 4 to the whistleblower.` becomes:

```text
      If some player is the whistleblower, they owe 4 to the whistleblower.
      If no player is the whistleblower, they owe 4.
```

    - in the Settle, `      The whistleblower gets 4 capital.` becomes `      If some player is the whistleblower, the whistleblower gets 4 capital.`, and `      If the event in play has the Whistleblower Protection Act, the whistleblower gets 4 capital.` becomes `      If the event in play has the Whistleblower Protection Act and some player is the whistleblower, the whistleblower gets 4 capital.`;
    - the Hint becomes `  Hint: Your Face-Down project was caught. Fold it, scrapping it for $5 ($4 of it to the Whistleblower, all of it to the bank after a Come Clean), or Settle, keeping it for $3 to the bank and a $3 License for each missing Tag (or $3 more for Ghost Progress alone). Short of cash, you go Bankrupt.`
  - **Settle skips the excused Tag** (§7.E, R3). In the Settle:
    - in the first `    Only if one of:` group, right after `      The card has no requires.` add `      It is requires legacy.`; in the second, right after `      The card has no also requires.` add `      It is also requires legacy.`;
    - under `      They owe the license to … the card's requires.`, add `        Only if it is not requires legacy.` as its first `Only if` line; under the `also requires` one, `        Only if it is not also requires legacy.`
  - If the compiler refuses `it` in a choice line's `Only if` lines, stop and report it: no `the card is not …` form exists to fall back on (Gap 1's cousin).
  - **A Bankrupt player spends only spare cash (R2).** In both Market Sale asks (Divest's and Liquidate's), `        Only if they have at least the card's sale price in capital.` becomes `        Only if their spare capital is at least the card's sale price.`
  - **Append these 6 examples.**

```text
Example: a Come Clean that reveals another missing Tag is a failed Audit with no Whistleblower: the owner Folds or Settles at once, a Fold's whole $5 going to the bank; short of it, they go Bankrupt and sell inside the first sale, which goes on once they are done, and the Legacy Status goes with the folded card (section 7, ruling 25)
  Given 3 players
  And the phase is actions
  And p0's operations has a Smart Lock
  And p0's portfolio has an Equity whose founder is p1
  And p1 has 2 capital
  And p1's operations has a Dating App
  And p2's operations has a Server Farm
  And p1's development has a Planetary Wi-Fi
  And the Planetary Wi-Fi in p1's development is face down
  When p0 divests the Smart Lock
  Then the phase is free come clean
  And it is p1's turn
  When p1 reveals the Planetary Wi-Fi
  Then the Planetary Wi-Fi in p1's development is caught
  And the Planetary Wi-Fi in p1's development is also requires legacy
  And the phase is reckoning
  And it is p1's turn
  When p1 folds the Planetary Wi-Fi
  Then p1 is bankrupt
  And p1 owes 5
  And the Planetary Wi-Fi in the open idea pool is not also requires legacy
  And the phase is liquidation
  And it is p1's turn
  When p1 liquidates the Dating App
  Then p1 has 0 capital
  And p1 owes nothing
  And p1 is not bankrupt
  And p2 has 7 capital
  And the phase is free come clean
  And it is p1's turn
  When p1 declines to reveal
  Then the phase is actions
  And it is p0's turn
  And p0 has 10 capital

Example: a failed Come Clean may Settle instead: $3 to the bank and the $3 License for the Tag still missing, while the Tag that was sold is excused and costs nothing though it has left the game; with no Whistleblower no bounty is paid, during Whistleblower Protection Act too (section 7, section 20, ruling 25, the slice's R3)
  Given 3 players
  And the event in play has the Whistleblower Protection Act
  And the phase is actions
  And p0's operations has a Server Farm
  And p0's portfolio has an Equity whose founder is p1
  And p2's operations has a Smart Lock
  And p1's development has a Planetary Wi-Fi
  And the Planetary Wi-Fi in p1's development is face down
  When p0 divests the Server Farm
  And p1 reveals the Planetary Wi-Fi
  Then the phase is reckoning
  And the Planetary Wi-Fi in p1's development is caught
  And the Planetary Wi-Fi in p1's development is requires legacy
  When p1 settles the Planetary Wi-Fi
  Then p1 has 1 capital
  And p2 has 10 capital
  And p0 has 13 capital
  And the Planetary Wi-Fi in p1's development is not caught
  And the Planetary Wi-Fi in p1's development is face up
  And the phase is free come clean

Example: a Come Clean whose other Tag the owner has is legal: the reveal finds the owner's own Tag, the sold one is excused, and the project goes on Face-Up (section 7, the slice's R3)
  Given 3 players
  And the phase is actions
  And p0's operations has a Smart Lock
  And p0's portfolio has an Equity whose founder is p1
  And p1's operations has a Server Farm
  And p1's development has a Planetary Wi-Fi
  And the Planetary Wi-Fi in p1's development is face down
  When p0 divests the Smart Lock
  And p1 reveals the Planetary Wi-Fi
  Then the Planetary Wi-Fi in p1's development is not caught
  And the Planetary Wi-Fi in p1's development is face up
  And the Server Farm in p1's operations is not in reach
  And the phase is free come clean
  And it is p1's turn

Example: a Bankrupt player's debt is set aside: they can't spend the cash their liquidation raised on a Come Clean while they owe it, and their project stays Face-Down at risk (section 7, the slice's R2)
  Given 3 players
  And the phase is actions
  And p0 has 2 capital
  And p0's operations has a Tech Blog and a Dating App
  And p1's ops team has a Junior Software Dev
  And p2's operations has a Mobile Wallet
  And p0's development has a Neobank and a Search Engine
  And the Neobank in p0's development is face down
  And the Search Engine in p0's development is face down
  When p0 ends their actions
  And p1 audits the Neobank in p0's development
  And p2 passes the bid
  And p0 settles the Neobank
  Then p0 is bankrupt
  And p0 owes 6
  When p0 liquidates the Tech Blog
  And p1 buys the Tech Blog
  Then the phase is come clean
  And it is p0's turn
  And p0 has 8 capital
  When p0 comes clean with the Search Engine
  Then it is rejected because "their spare capital is at least the license"
  When p0 declines to come clean
  Then p0 has 2 capital
  And p2 has 10 capital
  And p0 owes nothing
  And the Search Engine in p0's development is face down
  And the phase is declaration
  And it is p1's turn

Example: a second debt of a Bankrupt player joins the first with no second seizure; Settle is offered only when cash plus Fire Sale value covers both, and the debts are paid in the order they arose (section 7, the slice's R2)
  Given 3 players
  And the phase is actions
  And p0 has 1 capital
  And p0's operations has a Server Farm and a To-Do List
  And p2's operations has a Smart Lock
  And p0's development has a Neobank and a Planetary Wi-Fi
  And the Neobank in p0's development is face down
  And the Planetary Wi-Fi in p0's development is face down
  When p0 ends their actions
  And p1 audits the Neobank in p0's development
  And p2 passes the bid
  And p0 folds the Neobank
  And p0 liquidates the Server Farm
  Then the phase is free come clean
  And it is p0's turn
  When p0 reveals the Planetary Wi-Fi
  Then the phase is reckoning
  And it is p0's turn
  When p0 settles the Planetary Wi-Fi
  Then it is rejected because "their cover is at least the card's settlement"
  Given p0's operations has a To-Do List and a Dating App
  When p0 settles the Planetary Wi-Fi
  Then p0 owes 11
  And the Planetary Wi-Fi in p0's development is not caught
  And the phase is free come clean
  When p0 declines to reveal
  Then the phase is liquidation
  When p0 liquidates the To-Do List
  And p0 liquidates the Dating App
  Then p0 has 2 capital
  And p1 has 11 capital
  And p2 has 10 capital
  And p0 owes nothing
  And the phase is actions
  And it is p1's turn

Example: levels nested: an Audit's Fold bankrupts its owner, whose Market Sale breaks a chain; the Partner's Come Clean fails, their Fold bankrupts them inside the first sale, and a Bankrupt player can't buy with the cash they owe; each level resumes the one beneath it in order (section 7, section 17, ruling 25, the slice's R2 and R3)
  Given 3 players
  And the phase is actions
  And p0 has 1 capital
  And p0's operations has a Smart Lock
  And p0's ops team has a Junior Software Dev
  And p1's portfolio has an Equity whose founder is p0
  And p1's operations has a Dating App
  And p2's ops team has a Junior Hardware Eng
  And p0's development has a Neobank
  And the Neobank in p0's development is face down
  And p1's development has a Planetary Wi-Fi
  And the Planetary Wi-Fi in p1's development is face down
  When p0 ends their actions
  And p1 passes the audit
  And p2 audits the Neobank in p0's development
  And p1 passes the bid
  And p0 folds the Neobank
  Then the phase is liquidation
  And it is p0's turn
  When p0 liquidates the Smart Lock
  And p2 buys the Smart Lock
  Then the phase is come clean
  And it is p1's turn
  When p1 comes clean with the Planetary Wi-Fi
  Then the Planetary Wi-Fi in p1's development is face up
  And the Planetary Wi-Fi in p1's development is caught
  And p2 has 4 capital
  And the phase is reckoning
  And it is p1's turn
  When p1 folds the Planetary Wi-Fi
  Then p1 is bankrupt
  And p1 owes 5
  And p0's equity has an Equity whose founder is p0
  And p0 is bankrupt
  And p0 owes 5
  And the phase is liquidation
  And it is p1's turn
  When p1 liquidates the Dating App
  Then p1 has 2 capital
  And p1 owes nothing
  And p1 is not bankrupt
  And the phase is come clean
  And it is p1's turn
  When p1 declines to come clean
  Then p0 has 2 capital
  And p2 has 8 capital
  And p0 owes nothing
  And p0 is not bankrupt
  And the phase is actions
  And it is p1's turn
```

  **How the numbers come** (§7.B–E, §7 Liquidation, §7 Bankruptcy, §17.B.3, §17.C.3, §20.C, §20.D 17, rulings 25, R1–R3):
  - **The failed Come Clean** (§7.E): only the sold Tag is excused; another missing Tag leaves the project illegal, a failed Audit with no Whistleblower: the whole $5 Fold fine to the bank, and a Settle pays no bounty (ruling 25). The Planetary Wi-Fi requires Cloud and then IoT (§20.C).
  - **Example 1:** the Smart Lock (IoT) fire-sells for 3: 7 + 3 = 10. p1, p0's Partner, reveals; IoT is excused, Cloud is nowhere p1 reaches (p2 is no Partner): caught. The Fold owes 5 to the bank: 2 − 5 is −3. p1 sells the Dating App to the bank: 5, then 5 to the bank: 0. p2 is paid nothing.
  - **Example 2:** the Server Farm (Cloud) fire-sells for 6: 13. Cloud is excused, IoT is p2's: the Settlement is $3 and p2's $3 License, $6, and p1's cash covers it: 7 − 6 = 1, p2 10. No bounty, Whistleblower Protection Act or not (§20.D 17 doubles a bounty there is none of).
  - **Example 3:** p1's own Server Farm gives Cloud; IoT is excused: legal.
  - **Example 4:** the Settlement is $3 and the $3 License to p2 (Commerce), $6; cover 2 + 3 + 3 = 8. p1 gets the $4 bounty at once: 11. The Tech Blog sells to p1 for $6: p1 5, p0 8, and p0, who lost Platform, is asked last, alone: spare 8 − 6 = 2, short of $3. Then 3 and 3 paid: p0 2, p2 10. The Search Engine is now a bluff, at risk at the offer that restarts (§7.E "If Kept Hidden").
  - **Example 5:** the Fold owes 4 to p1 and 1 to the bank: 1 − 5 is −4. The Server Farm fire-sells for 6 (no one has $12): 7. p0 is asked as the seller; the reveal excuses Cloud and misses IoT: caught. Settling costs $3 and p2's $3 License: cover 7 + 3 − 5 = 5, short; with the Dating App, 7 + 6 − 5 = 8. Owed: 5 + 6 = 11. The To-Do List and the Dating App fire-sell: 7 + 3 + 3 = 13; paid in order: 4 to p1 (11), 1 and 3 to the bank, 3 to p2 (10): 2.
  - **Example 6:** the Fold owes 4 to p2 (the Whistleblower) and 1: 1 − 5 is −4. The Smart Lock is offered to p2 alone (p1 has no Red room): p2 1, p0 7. p1, who holds p0's token, lost IoT and pays p2 the $3 License: p1 4, p2 4. Cloud is nowhere p1 reaches: caught; the Fold owes 5 to the bank: 4 − 5 is −1, and p1's token of p0's goes back to p0 (§7 Bankruptcy step 1). The Dating App is $6: p2 has 4, and p0, with $7 but owing 5, has $2 to spare: no one is asked (R2), so the bank pays 3: 7, paid to the bank: 2. Back in p0's offer p1 declines; p0's spare is 2: 4 to p2 (8) and 1 to the bank: 2.
  - **Lines each example pins:**
    - 1: `If it is requires missing, it is caught.`, `If it is caught, the reckoning phase starts with them.`, the Fold's no-Whistleblower line, `free come clean`'s start line (without it two players are the seller when p1 sells);
    - 2: `If it is also requires missing, it is caught.`, `Requires missing:`'s legacy line (without it the Settlement is $9, more than p1's cover), Settle's `It is requires legacy.` and the License's legacy guard (no one has Cloud), the two bounty lines' Whistleblower conditions;
    - 3: the reveal's own-operations mark, `Also requires missing:`'s legacy line, the reveal's `No card is in reach.`;
    - 4: a guard of R2 for the Come Clean;
    - 5: `Cover:`'s last line;
    - 6: the paid press's check (with the copy test), `come clean`'s start line, Liquidate's spare-capital guard;
    - the copy tests pin the other two marks, the paid press's copied lines, Divest's spare-capital guard, and the Settle's `also` Legacy alternative and guard.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Come Clean that reveals another missing Tag is a failed Audit with no Whistleblower, which may bankrupt a second player inside the first's sale; a Bankrupt player spends only cash above what they owe, and a second debt joins the first

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 6: The whole valuation, and every ruling cited by an example

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: every score line of plans 1a to 9-2 as it reads at HEAD (§12's lines 1–8).
- Produces (test file): `const PLAY_EFFECT_RULINGS: number[]` (1 and 3 to 25: #2 is the deck count, a document-only ruling the cards tests check).

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₁₃ + 23; the designer page's count too.
  - **`scoreOf` checks the valuation line by line** (it already sums every §12 line the earlier plans added): re-read it against §12 and the score lines at HEAD, and report any line it leaves out.
  - **Every ruling cited** (append to `describe('Startup Simulator (designer language)')`): `it('cites in some example every ruling with a play effect (the slice’s Proof 3)')`. From every `Example:` title of the rules text, read the numbers in its last parenthesis after `ruling` or `rulings` (`rulings 10 and 12` gives both); every number of `PLAY_EFFECT_RULINGS` is among them.
- [ ] **Step 2: Run** the file. Expected: FAIL (the count, until the example is appended; the citation test may already pass, which is its point).
- [ ] **Step 3: Append this example.**

```text
Example: the final valuation, line by line: each Active product's Val, +5 for each Hype, -5 for each Scandal and +5 for a Host, an offline product and a project scoring nothing; 1 point for each $5; 2 for each Market Share; 5 for each rival's Equity token and none for one's own, Vested or not; each Milestone's face value; Human Capital on the bench; the Stealth Bonus; and Vaporware (section 12, ruling 16, ruling 17, ruling 25)
  Given 3 players
  And the crash pile has the Market Crash
  And the phase is actions
  And it is p2's turn
  And p0 has 14 capital
  And p0 has 3 market share
  And p0 has 5 stealth bonus
  And p0's operations has a Dating App, a Neobank, a USB Gadget, a To-Do List and a Mobile Wallet
  And p0's ops team has the Architect and a Junior Software Dev
  And the Dating App in p0's operations has 1 hype
  And the Neobank in p0's operations has 1 scandal
  And the To-Do List in p0's operations is on the USB Gadget in p0's operations
  And the Mobile Wallet in p0's operations is offline
  And the Junior Software Dev in p0's ops team has 1 vest
  And p0's locked equity has an Equity whose founder is p0
  And p0's equity has an Equity whose founder is p0
  And p0's portfolio has an Equity whose founder is p1 and an Equity whose founder is p2
  And p0's milestones has a Clean Launch and a Revenue Leader
  And p0's bench has a Junior Software Dev and a QA Engineer
  And the Junior Software Dev in p0's bench has 2 blue xp
  And the Junior Software Dev in p0's bench has 1 red skill
  And the Junior Software Dev in p0's bench is badged
  And the QA Engineer in p0's bench has 1 training xp
  And p0's development has a Server Farm
  And p0's backlog has a Flashlight App and a Search Engine
  When p2 ends their actions
  Then the game is over
  And the Mobile Wallet in p0's operations is offline
  And p0 scores 55
  And p1 scores 1
  And p2 scores 1
```

  **How the numbers come** (§12, §10.C, §12.4, §17.D, §20.B, §20.C, §20.G, rulings 16, 17, 25):
  - **The final check** (§12 Game End 2): the Architect gives 3 Blue and the Junior 1; the four Online products need 1 Blue each, so they fit and the Mobile Wallet stays Offline (4-2's example "a player whose online products still fit keeps the others offline").
  - **Line 1, Product Portfolio:** Dating App 5 + 5 (Hype) = 10; Neobank 10 − 5 (Scandal) = 5; USB Gadget 1 + 5 (the Host of a live Integration, §10.C) = 6; To-Do List 1; Mobile Wallet (Offline) and Server Farm (Development) 0. Total 22.
  - **Line 2, Cash:** 14 / 5, rounded down: 2.
  - **Line 3, Market Share:** 3 × 2 = 6.
  - **Line 4, Portfolio:** two rival tokens × 5 = 10; p0's own token in its supply and its Vested token score 0 (ruling 16).
  - **Line 5, Milestones:** Clean Launch 5 + Revenue Leader 6 = 11 (§20.G).
  - **Line 6, Human Capital:** the bench Junior's 2 Permanent XP + 1 Skill + a Badge's 2 = 5; the QA Engineer's 1 Training XP = 1; the Architect's printed trait scores nothing. Total 6.
  - **Line 7, Stealth Launches:** 5 (ruling 17).
  - **Line 8, Vaporware:** Flashlight App (Tier 1) −2, Search Engine (Tier 2) −5 = −7.
  - **p0:** 22 + 2 + 6 + 10 + 11 + 6 + 5 − 7 = 55. p1 and p2: 7 capital = 1.
  - **Lines it pins:** none new; it guards §12 as a whole.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator scores a game's end line by line against the whole valuation, and every ruling with a play effect is cited by some example

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 7: Long runs: every slice-10 path tallied, whole games replayed; the README and the checks

**Files:**
- Modify: `src/games/startup-simulator.test.ts`, `README.md`

**Interfaces:**
- Consumes: every constant, helper and policy above and in plans 4-2 to 9-2; `turnOf`, `askOf`, `windowJudge`, `tiedTo`, `reaches`, `exposedBy`, `paidInOrder`, `Debt`, `faceDownCards`, `securedFor`; 10-1's `framesOf`, `billsOf`, `owedBy`.
- **`happenings` gains these keys** (on judged moves, read through the runtime on `before` and `after`):
  - **Bankruptcy:**
    - `a Bankruptcy from a Fold` and `a Bankruptcy from a Settle`: a `FOLD` or `SETTLE` whose mover had less capital in `before` than it then owed;
    - `an Equity token seized`, for each card that left a seat's portfolio in the move it became `bankrupt`;
    - `a liquidation sold to a player` (a `BUY` of a `liquidating` seat's card) and `a liquidation sold to the bank` (a Fire Sale of one);
    - `a product kept at $0`, for a move that ends a liquidation with a card in that seat's operations whose `fire sale price` is 0;
    - `a Fold fine left unpaid`, for a move that clears a seat's bills paying less than they held;
    - `a Settle covered by Fire Sale value`, a `SETTLE` whose mover's capital was short of the `settlement`; `a Settle refused for want of cover`, from `refused` with that reason.
  - **The Broken Chain:**
    - `a Come Clean offer after a Fire Sale`, `… after a Market Sale`, `… after an Acquisition`, for a move that opens a `free come clean` ask, or a `come clean` ask in a `BUY` or an `AGREE`;
    - `the seller asked to Come Clean` and `a Partner asked to Come Clean`, for each seat of such an ask's `asked`;
    - `a Come Clean for free` (`REVEAL`), `a Come Clean paid` (`COME_CLEAN`), `a Come Clean under Patent Trolls` (a `COME_CLEAN` with `the license` at 5);
    - `a Come Clean refused for want of spare cash`, from `refused`;
    - `an offer declined with nothing to reveal` (a `DECLINE_REVEAL` or `DECLINE_COME_CLEAN` by a seat none of whose cards the press allows) and `a project kept hidden though it could come clean` (one by a seat with such a card);
    - `a failed Come Clean`, `… folded`, `… settled`.
  - **Levels and debts:**
    - `a second debt joined the first`, for a move after which a seat that owed in `before` owes more;
    - `a second debt paid in order`, for a move that clears a seat's bills while its `debts` held entries from two presses or more;
    - `a second player going broke inside the first's sale`, for a move after which two seats are `bankrupt`;
    - `a Bankrupt player not asked to buy`, for a move that opens a Market Sale ask leaving out a `bankrupt` seat whose capital, but not its `spare capital`, covers the price and whose rooms cover the maintenance;
    - `a Legacy card moved`, for each card that held a Legacy flag in `before` and is in another zone in `after`.
- **At each run's result** the long-run `it.each` also keeps `deepestLevels`, the most levels `framesOf` held after any move of any run.

- [ ] **Step 1: Write the tests.**
  - **`'made every move in those runs …'`** also expects `LIQUIDATE`, `REVEAL`, `DECLINE_REVEAL`, `COME_CLEAN` and `DECLINE_COME_CLEAN` above 0.
  - **Append `it('played slice 10’s Bankruptcy and Broken Chain in those runs: …')`**, its title naming the paths the keys name. It expects above 0:
    - `a Bankruptcy from a Fold`, `an Equity token seized`, `a liquidation sold to a player`, `a liquidation sold to the bank`, `a Fold fine left unpaid`;
    - `a Come Clean offer after a Fire Sale`, `a Come Clean offer after a Market Sale`, `the seller asked to Come Clean`, `a Partner asked to Come Clean`, `a Come Clean for free`, `a Come Clean paid`, `an offer declined with nothing to reveal`, `a failed Come Clean`, `a failed Come Clean folded`;
    - `a second debt joined the first`, `a second debt paid in order`, `a second player going broke inside the first's sale`, `a Legacy card moved`;
    - `deepestLevels` at least 4.
    - Counted but not required, each pinned by an example named in a comment: `a Bankruptcy from a Settle` and `a Settle covered by Fire Sale value` (Task 2 example 4), `a Settle refused for want of cover` (Task 5 example 5), `a product kept at $0` (Task 2 example 2), `a Come Clean offer after an Acquisition` (Task 4 example 2), `a Come Clean under Patent Trolls` (Task 4 example 3), `a Come Clean refused for want of spare cash` (Task 4 example 1), `a project kept hidden though it could come clean`, `a failed Come Clean settled` (Task 5 example 2), `a Bankrupt player not asked to buy` (Task 5 example 6). The comment says why each is rare.
  - **Append `it('takes back the last move and rebuilds whole games from their logs, through Bankruptcies, liquidations and Come Cleans, levels nested and debts owed (Review Focus: 4 players, seeds 1 to 5)')`.**
    - Play each game to its result, keeping the state before each move.
    - A fresh engine given `loadLog(log)` equals the final state, and `engine.undo()` gives the state before the last move.
    - For the move after which `framesOf` was deepest in the five games: a fresh engine given the log up to it equals that state, its `NEST_KEY` and `BILLS_KEY` included, and `engine.undo()` gives the state before it.
    - Across the five logs, some log holds a `LIQUIDATE`, a `REVEAL` and a `COME_CLEAN`.
  - **The view check (Review Focus 2),** in the runs through the view: for each move that opens a `come clean` or `free come clean` ask, every seat's `waiting` has `cards` naming only the sold product, and `JSON.stringify` of each rival's scene and extras holds no name of a card lying face down in the asked seats' developments.
  - **Kept as they are:** `'plays the same game through the page’s view as without it'`, now through liquidations and Come Cleans answered by other seats, and every earlier tally.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`.
  - If a required key stays at 0, print the tally and steer the auto-player, never the rules (P14). Each steer reads only what its seat may see (public ties, Tags in operations, face-down counts, its own cards) and is reported:
    - **Partners' Tags under bluffs:** while its development has fewer than 3 cards, `GREENLIGHT_FACE_DOWN` first tries a Tier 3 card one of whose Tags the seat reaches only through a seat tied to it (or itself) and the other it doesn't reach, then a card whose Tag it reaches only through a tied seat;
    - **selling a Tag a Partner relies on:** before `divesting()`'s cadence, when `(t + a) % 5 === 2`, it divests a product whose Tag some seat tied to it (or itself) reaches only through that product while that seat has a card face down;
    - **Bankruptcies:** in `declaration`, a seat also audits when the active seat has less than $5 (public);
    - **a second debt:** in `liquidation`, when `t % 2 === 0`, a product whose Tag one of its own Face-Down projects needs is sold first;
    - **a second player going broke:** in `reckoning`, a seat whose caught card was revealed by a Come Clean (no `the whistleblower`) Folds unless `t % 3 === 0`;
    - **answers:** in both Come Clean phases, `(t + r) % 4 !== 3` becomes `(t + r) % 8 !== 7`.
  - If a required key stays at 0 after these steers, stop and report it with the tally and the closest game; don't move it to the counted list.
- [ ] **Step 3: Write the README.**
  - **The Startup paragraph** becomes "**Startup Simulator (the whole rulebook)**". After plan 9-2's sentence, add:
    - a caught owner Folds or Settles in a step of their own, and one who can't pay in cash goes Bankrupt: Equity seized, products sold one at a time until covered, a $0 product kept, a Fold's shortfall forgiven;
    - Settle needs cash plus Fire Sale value to cover everything owed, and a Bankrupt player spends only cash above what they owe;
    - a sale of a Tag source offers the seller and the seller's Partners who lost the Tag a Come Clean, free after a Fire Sale and for the License after a sale to a player, with Legacy Status for that Tag;
    - a Come Clean that reveals another missing Tag is a failed Audit with no Whistleblower.
    - Its rulings list adds 24 and 25's Bankruptcy and Broken Chain items.
  - **"It still leaves out"** becomes: nothing of the rulebook. List the owner's calls instead, pointing at the slice specs and plans.
  - **Plan 10-1's README paragraph** gains a Startup bullet naming these lines:
    - `Each player has the free come clean, in turn from the left of the seller.` with `Only if they have a card in their development that is hidden.`;
    - `Only if their spare capital is at least the license.` and `They pay the license to the player acting.`;
    - `If some player is the whistleblower, they owe 4 to the whistleblower.` and `They pay up to what they owe.`;
    - `A card can be requires legacy until it moves.`
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 5: Run the checks.** The first three print nothing. The fourth prints only the Startup count line in `designer-page.test.tsx` and the pins the tasks reported.

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
  - run the removal probe once more over every line this plan added or changed;
  - check the table "Rulings and their examples" below against the rules text: each example named still exists by its title's start.
- [ ] **Step 6: Run the games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
- [ ] **Step 7: Commit**

```bash
git add src/games/startup-simulator.test.ts README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's long runs go Bankrupt, liquidate, break chains, Come Clean free and paid, fail a Come Clean and bankrupt a second player inside the first's sale at 2 to 5 players, every path tallied and whole games rebuilt from their logs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## The spec's examples, and where each is

| Spec example | Here |
| :--- | :--- |
| Bankruptcy from a Fold | Task 2 example 1 |
| Keep a $0 product | Task 2 example 2 |
| Forgiven shortfall | Task 2 example 3 (and 9-2's changed Ghost Progress example) |
| Broken Chain on a Fire Sale | Task 3 example 1 (and example 4, a Bankrupt player's) |
| Broken Chain on a Market Sale | Task 4 example 1 (and example 2, an Acquisition) |
| Still illegal | Task 5 examples 1 (Fold) and 2 (Settle) |
| No chain on a lost Partnership | Task 3 example 5 (a Buyback), example 4 (a seizure) |
| Legacy reset | Task 3 example 6 (Pivot, Launch), Task 5 example 1 (Fold); "sold" can't arise (Gap 4) |
| Seller's own project | Task 3 example 2 |
| Offer hides the card | Task 3 example 2, and its view test |
| Debt set aside | Task 5 example 4 (a Come Clean) and example 6 (a Market Sale purchase) |
| Two debts | Task 5 example 5 |
| Nested | Task 5 example 6 |
| The full valuation | Task 6 |

## Rulings and their examples (the spec's Proof 3)

Every ruling with a play effect is cited by at least one example; Task 6's test checks the numbers. Titles are named by their start; the plan that adds each is in brackets.

| Ruling | Play effect | Pinned by |
| :--- | :--- | :--- |
| #1 Pending XP | yes | [5-2a] "a Junior making Blue gains one Blue Pending token, never two, …" |
| #2 Product Deck count | no: a document count; the cards tests check 87 dealt cards and the expansion | — |
| #3 Fusion Reactor's Tags | yes | [3-1] "Fusion Reactor needs Robotics and AI, …" |
| #4 Phase D order, Audit window | yes | [9-2] "rivals may audit a Face-Down project in its owner's Engine phase, …"; [4-2] "the Fixer in QA mode still leads …" |
| #5 "Active" | yes | [4-2] "an offline product still provides its Tag, …"; [9-2] "a product switched off still provides its Tag, …" |
| #6 Poaching fee | yes | [8-2b] "the poaching fee is twice the printed cost plus the Token Value, …" |
| #7 AP costs | yes | [1b-2] "greenlighting is free", "a pivot scraps the project, …", "launching needs both tracks full …" |
| #8 Onboarding and Agile | yes | [1b-2] "a reassigned staff member is onboarding until the next turn starts" |
| #9 The Diva scrapped | yes | [3-1] "a Pivot fires the Diva …"; [9-2] "a Fold fires the Diva as a Pivot does, …" |
| #10 Bench, Backlog, Strategy Hand | yes | [1a-1] "the bench is cut to 5, …", "the backlog is cut to 3"; [5-2b] "the Strategy Hand holds 3 at Cleanup, …" |
| #11 Partners and fees | yes | [7-2a] "Partners use each other's Tags for free, both ways: …"; [9-2] "Secured Access is the owner's own Tag or a Partner's, …" |
| #12 Instant FIFO | yes | [1a-1] "the cards not kept enter the open idea pool in the order they sat, …" |
| #13 Round and turn structure | yes | [1a-1] "each round starts with the start player" |
| #14 Training only with Training cards | yes | [5-2a] "a QA Engineer on a Launching team gains no XP, …" |
| #15 Poaching procedure | yes | [8-2b] "a Headhunter takes a rival's Development staff member for the fee, …" |
| #16 Equity: cap, scoring, firing | yes | [7-2a] "each rival's Equity token held scores 5 points, …"; [8-2b] Vested tokens destroyed; [10-2] Task 6 |
| #17 Stealth Bonus markers (the dividend example: no play effect) | yes | [9-2] "Stealth Bonus markers score their face value at the end, …"; [10-2] Task 6 |
| #18 Markets refill; Research; drafting needs no Tags | yes | [1a-1] "each half of the product market refills from its own deck"; [3-1] "drafting a Tier 2 needs no Tag" |
| #19 Ops bandwidth per color, Offline | yes | [4-2] "at Income an ops team with the bandwidth in both colors runs every product, …" |
| #20 Talent rules | yes | [1a-1] "the University costs 2 and hires to the bench"; [1b-2] "an agency hire may go straight onto the board" |
| #21 Stealth bluffs, card text wins (old Tag names: no play effect) | yes | [3-1] "card text wins: NFT Marketplace needs Platform, …"; [9-2] "a player without a Tag may still Greenlight Face-Down …" |
| #22 Acquisition needs consent | yes | [8-2a] "an Acquisition buys a rival's product at its M&A Price with the seller's consent; …"; [10-2] Task 4 example 2 |
| #23 Player aids ("PR Campaign" is TechCrunch Feature; strip lists: no play effect) | yes | [6-2a] "TechCrunch Feature adds 1 Hype …"; [6-2b] "during Trade Show TechCrunch Feature costs $2, …" |
| #24 Engine-update gaps | yes, item by item | Fold shortfall: [9-2] the Ghost Progress example, [10-2] Task 2 example 3. x1.5 rounds up, only a Junior's Badge in Token Value, poach refunds: [8-2b]. No Ops product limit: [1b-2] "an ops zone runs any number of products". Milestones: [5-2b] "the first Tier 2 Launch claims First Mover Advantage, …". Selling a product: [8-2a] the M&A Price and Fire Sale examples, [10-2] Task 2 example 1. Consultant tokens: [7-2a]'s Consultant examples (§17.B.4). Ties: [1a-1] "1 point for every 5 capital, vaporware, and tied players share the win". Mid-turn arrivals: [4-2] "a flex Senior hired onto a project after the declaration works in Blue". The Offline choice: [4-2] "short of Blue at Income, the player switches off a product of their choice, …" |
| #25 Print-readiness calls | yes, item by item | Slice 10's: only an Audit bankrupts and Equity is seized first: [10-2] Task 2 examples 5 and 1. Broken Chain only on a sale: Task 3 example 5. Settle only when cash plus Fire Sale value covers it: Task 2 example 4. A failed Come Clean is a failed audit, the fine to the bank: Task 5 example 1. The owner chooses which product to Liquidate: Task 2 example 1. Legacy only on Face-Up cards: Task 3 example 6 and Task 3's Legacy invariant. The other items: the slices that met them (84 example titles cite #25). |

## Forward notes for plan 10-3 (the page)

- `reckoning` and `liquidation` prompts sit in the deciding seat's strip; the switcher follows `turn.current` through the levels, with `turnBeneath`'s seat shown as whose turn it is.
- The Come Clean offers name the sold product (the waiting card) and, beneath, the sale that opened them (`waitingUnder`); the owner's own Face-Down projects that may come clean are the press's cards, shown to them alone.
- What each player owes, from `SeatExtras.bills`, with whom to; `bankrupt` and `liquidating` on the tableau. `spare capital` and `cover` stay unshown (10-1's recorded limit), so Settle's greyed reason stands in for the cover (9-3's G1).
- `requires legacy` / `also requires legacy` as badges on a Face-Up project; they never reach a product in operations (Gap 4).
- The browser check of Task 5 example 6, with the Hearts demo's no-regression check.

## Gaps against plan 10-1

None that needs a protected file or contradicts a binding call. These calls follow from what the language reads:

1. **No line says a card has a value under a name.** `the card has no {attribute}` and `it has no {attribute}` exist, but no positive form, and `the card is {cardflag}` has no `not`. So "the sold card provides a Tag" is two worked flags, `Tagless:` (`Only if it has no tag.`) and `Providing:` (`Only if it is not tagless.`), read in each ask as `Only if the card is providing.` Without them, a sale of one of the four alternative unicorns would ask exposed owners an offer nothing can answer. Task 5 also relies on `it` being bound in a choice line's `Only if` lines (the Settle's Legacy guard), and stops if it isn't.
2. **No lines can be shared between buttons** (9-2's Gap 4). Divest's Market Sale ask and Fire Sale are copied into Liquidate; the Come Clean ask into the buy and the Acquisition; the Audit's marks into both Come Clean presses; the paid press's check from the free one. Each copy is pinned by a test comparing it with its source, compiled and without line numbers.
3. **Flags aren't scoped to a level** (10-1's recorded limit). Secured Access marks (`in reach`) are game-wide, so a sale nested in an Audit step could read the Audit's marks, and the Audit's next offer could miss them. The marks move from the step's start to its offer rule, and every press that marks clears after itself; an invariant keeps marks to the four phases that set and read them. `the seller` is cleared as each Come Clean phase starts, so a nested sale can set it again.
4. **A flag that lasts until its card moves drops on any move, a Launch included.** R3 asks that Legacy be cleared "whenever the card leaves its owner's Board"; a Launch keeps the card on the Board but moves it from development to operations, and drops it too. Nothing reads Legacy after a Launch (a launched product is never checked again, §6 Launch), so play is the same; but no product in operations ever holds Legacy, and the spec's "a Legacy product sold … loses the status" can't arise (§7 Liquidation's "that status is reset" holds trivially). Recorded for the owner; 10-3 badges Legacy only on projects.
5. **The acquirer's press can't flag its card's owner** (`its owner is …` is a condition only). The consent's `agree to the sale` sets `They are the seller.`, which runs only when the seller consents, as the Come Clean needs.
6. **The end of a liquidation pays nothing itself.** `CHAIN_GAME` pays in its end rules as well as in its rule for every phase; here only the rule for every phase pays, since a copy would survive the removal probe.
7. **Recorded limits, none blocking:**
   - `spare capital` and `cover` are not shown as player values (10-1: only total lines are); `bills` shows what is owed, and Settle's refusal names the cover;
   - the long runs' rarest paths (a second player going broke inside the first's sale, a second debt paid in order) rest on Task 7's steers; if one stays at 0, Task 7 stops and reports rather than counting it unrequired;
   - Ghost Progress still never fires (slice 9 R2), so a failed Come Clean never Settles for it.
