# Startup Simulator Slice 8-2a (Rules text and long runs: products sold, smeared and stacked) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Startup Simulator plays the half of slice 8 in which products change hands or standing:
- the M&A Price (§7): $6 / $12 / $20 by Tier, +$5 per Hype and per attached Specialist, −$5 per Scandal, −$1 per Bug, never below $0;
- Acquisition (1 AP) with the seller's consent and the buyer's spare bandwidth;
- Divest (1 AP): a Market Sale to rivals in turn from the seller's left, else a Fire Sale to the bank at half price;
- the Hit Piece ($3) and Scandal (−5 VP, −$5), with the Director of QA's Crisis Management;
- Integration (0 AP): a Client under a Host by the §10.B table, +$2 and no Bug decay for the Client, +5 VP for the Host while both run.

The long runs play all of it at 2 to 5 players.

**Architecture:**
- **Slice 8's rules plan is two plans, because it grew past eight tasks (nine).** The seam is the one a reviewer sees in the spec: what happens to products, and what happens to people.
  - **This is 8-2a, "products"** (§6 Acquisition and Divest, §7 Liquidation, §10, §11.D.1, §12.1, §20.A Hit Piece): five tasks. It adds the consent and market sale answering phases (8-1's asks) and one step phase, `crisis`.
  - **8-2b, "poaching and the CTO"** (`docs/superpowers/plans/2026-10-16-startup-slice-8-2b-rules-and-runs-poaching-and-the-cto.md`; §16, §11.G.2, §18.B, §17.D): four tasks. It adds the poach, the counter-offer (Vest, Cease & Desist), the CTO and destroyed Equity, and edits this plan's two buying buttons.
  - Plan 8-3 (the page) follows both.
- This plan writes only the rules text, its examples and the long runs. It adds no phrase and changes no shared code. It runs after plans 4-2, the long-runs speed-up, 4-3, 5-1, 5-2a, 5-3 Task 1, 5-2b, 5-3 Tasks 2–4, 6-1, 6-3 Task 1, 6-2a, 6-2b, 6-3 Tasks 2–5, 7-1, 7-2a, 7-2b, 7-3 and 8-1, in that order.
- **Five tasks:**
  1. the M&A Price, each player's room, and Acquisition with the seller's consent;
  2. Divest: the Market Sale and the Fire Sale;
  3. the Hit Piece, Scandal in the score, Crisis Management, and no Offline by choice at game end (R3);
  4. Integration;
  5. long runs: every slice-8a path tallied, whole games replayed; the README and the checks.

  Each rules task keeps the existing long runs passing. It adds the auto-player's handling of the buttons and phases it creates and the invariants its rules need. Task 5 adds the tallies.
- **Phases.** `consent` (Task 1) and `market sale` (Task 2) are 8-1 ask phases, appended after 7-2b's `Phase: lawsuit`. `crisis` (Task 3) is a step of the turn placed right before `Phase: engine`: the actions phase goes to it, and it goes to `engine`. Phase order after this plan: `modes`, `ops check`, `income`, `actions`, `research`, `sourcing`, `graduation`, `brainstorm`, `crisis`, `engine`, `commit`, `bench cleanup`, `strategy cleanup`, `backlog cleanup`, `final check`, `event check`, `veto`, `offer`, `lawsuit`, `consent`, `market sale`.
- **Builder calls this plan makes** (the spec leaves wordings and the auto-player to the builder; each is recorded here for the owner):
  - **The M&A Price is a worked number, `sale price`,** whose lines are the §7 list in order, then the $0 floor. "Attached Specialist" is a card on the product that the rules call `attaching` (5-2a: the Sales Rep and the Growth Hacker), counted by a worked number `attachments`. A Client is a product, not attaching, so it adds nothing (R2). The Fire Sale's half is `fire sale price`, 50% rounded down (8-1 Task 1).
  - **"Spare bandwidth after your Online products" is a player value `blue room` / `red room`:** the supply's lines, copied, then 8-1 Task 2's "goes down by the total … maint of the cards in their operations that are not offline". No phrase reads one player value from another, so `Blue room:` repeats `Blue supply:` (see Gaps); a test pins both copies.
  - **Acquisition** is `acquire a card in another player's operations` (1 AP), guarded on the price and both rooms, whose first `Then:` line is the ask `Its owner has the consent.` (8-1 Tasks 6–7). The lines after it run only when the seller agrees. The Veto's window (7-2b) closes before the ask opens, so a Founder's Investors are asked first.
  - **Divest of a product** is `divest a card in their operations` (1 AP). It marks the card `for sale` and asks `Each other player has the market sale, in turn from their left.` with three `Only if` lines (the price, both rooms): a rival without the cash or the bandwidth isn't asked (the spec's call). A buyer's press stops the divest's remaining lines (`The action does not go ahead.`). Those lines are the Fire Sale, which runs when no one is asked or the last asked rival passes. Every line the ask reads is public (R4 / 8-1 Task 6): capital, the rivals' ops teams and operations, the product's tokens and the staff on it.
  - **The buying lines are written twice**, in `acquire` (after the consent) and in the market sale's `buy`, since a button's lines can't be shared. Both run in R2's order:
    - break the stack (Task 4);
    - return Consultants (7-2a's line);
    - pay the M&A Price to the seller;
    - mark the product Online (§7 "A bought product arrives Online");
    - move it with everything on it (8-1 Task 4).
  - **The Fire Sale scrubs the card** before it goes to the open idea pool: its cubes, cuts, Bugs, Hype and Scandal, and the Offline and for-sale marks, as Pivot scrubs a project. The card is scrapped (§7, §15.B.3), and a card drafted again from the pool must start clean. Its attached Specialists go to the seller's bench (`Every card on it goes to their bench.`); pooled staff are on no product, so they stay.
  - **Crisis Management is a step `crisis` before the Engine** (§11.D.1, ruling 25: "removes Scandal … before any Bugs, up to its Bug-removal count"):
    - The Director's capacity is a player value `crisis supply`, the total `qa output` of the ops team's cards that are `directing` (a badged QA Engineer, §11.C's restriction).
    - Each Scandal it clears is counted on the product as `cleared scandal`, which the Engine's `qa supply` then goes down by, so what the Director spends on Scandal it no longer has for Bugs.
    - The step mirrors 4-2 R3's Ops QA. When the capacity covers every Scandal, all of it goes at once. Otherwise each `clear a card in their operations` press removes one Scandal, and the step passes on once the capacity is spent.
    - The counts are cleared as `commit` starts.
    - A separate step, not lines in the Engine: gating the Engine's three ops-QA rules and its clean button on "Scandal done" would need a fourth guard on each of them.
  - **Hit Piece** is `publish a card from their strategy hand to a card in another player's operations` (0 AP, §20.A, its printed $3), with 7-1's Immunity test `they have no card in their portfolio whose founder is the target card's owner` (§17.B.2). It may target an Offline product (§20.A "one of an opponent's Maintenance products"; suwa's `hit_piece`).
  - **No Offline by choice at game end (R3).** No line: 4-2's final check already holds. An example pins it.
  - **Integration (R2)** is `integrate a card from their operations to a card in their operations` (0 AP) under `Cards can host cards by their tag:` with §10.B's seven rows.
    - It is guarded on the table and on a worked flag `stacked`: the card sits on a product, or a product sits on it. The guard is applied both ways, which gives "one Client per Host", "a Client can't be a Host" and "no Host is a Client" (§10.A–B).
    - The table pairs no Tag with itself, so "never two cards of the same Tag" needs no line.
    - The Client's +$2 and its freedom from Bug decay, and the Host's +5 VP, read a worked flag `integrated`: a product in operations, not Offline, on a card that is not Offline (§10.E).
    - The operations row is marked `…, where some cards are on cards` with no "in their …" (8-1's "Left to 8-2").
- **Names.**
  - Zone mark: `operations` (`some`, Task 4).
  - Counts: `scandal`, `cleared scandal`. Flag kept: `for sale`.
  - Worked numbers: `attachments`, `sale price`, `fire sale price`; refined `rev`, `portfolio points`.
  - Worked flags: `directing`, `running`, `stacked`, `integrated`, `hosting`; refined `decaying`.
  - Player values: `blue room`, `red room`, `crisis supply`, `scandal load`, `crisis spent`; refined `qa supply`.
  - Pairing: `host`.
  - Phases: `consent`, `market sale`, `crisis`.
  - Buttons:
    - `acquire a card in another player's operations`, `agree to the sale`, `refuse the sale`;
    - `divest a card in their operations`, `buy a card in another player's operations`, `pass on the sale`;
    - `publish a card from their strategy hand to a card in another player's operations`, `clear a card in their operations`;
    - `integrate a card from their operations to a card in their operations`.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-8-selling-poaching-design.md` is binding, and its "Builder-check rulings" win over its body:
- R1 (8-2b's): Vest and CTO are a mark plus a parked card. A sale destroys the seller's token on an attached employee; a Fire Sale keeps it.
- R2: an Integration is attachment inside operations. Every rule that takes a product off its owner's Board breaks the stack, returns Consultants, then moves the product with everything on it.
- R3: no voluntary Offline at game end.
- R4: an ask opens on public facts only.

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding as amended by slice 7 R1 and slice 8 R1–R2, with its rule "every number comes from the rulebook, and examples say where" and its anti-goals.

The other inputs:
- plan 8-1 (`docs/superpowers/plans/2026-10-16-startup-slice-8-1-language.md`), whose Interfaces blocks are the phrases this plan writes with, and whose "Left to 8-2" list is this plan's floor (with 8-2b);
- plans 4-2 to 7-2b, whose rules text this plan edits, and plans 4-1, 5-1, 6-1 and 7-1's phrases;
- `builder-check-startup-8.md` in the session scratchpad (Q1–Q4, settled as R1–R4);
- `suwa/rulebook.md` v6.0 §5 Phase B and D, §6 (Acquisition, Divest, Integrate, Play Strategy Card), §7 Liquidation, §10, §11.C–D, §12, §15.B, §17.B.2, §17.B.4, §20.A–C, §20.F, Rulings #5, #19, #21, #22, #24, #25;
- where those are silent, suwa's `resolvers/economy_actions.rs` (`m_and_a_price`, the transfer, `liquidate_ops_product_to_bank`) and `resolvers/product_actions.rs` (Integrate).
- Slices 9–10 need these names left in place:
  - slice 9 reads `fire sale price` (Settle's cover);
  - slice 10 reuses the Market Sale's ask and the Fire Sale's lines in Liquidation, and adds Legacy Status's reset before the moves.

## Global Constraints

- **Controller amendments carried from plan 4-2** (P6, P10, P13, P14), for every task:
  - Counts are taken from the committed test when a task starts, never from this text.
  - Every task runs plan 5-2a's single-line removal probe over the lines it adds or changes. Every surviving line that isn't display text gets an example.
  - A task may steer the auto-player beyond its brief when a tallied path would stay at 0; its report lists each change.
  - Checks and tallies read counts as numbers (missing = 0) and flags as `=== true`, never by whether a key exists.
- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.** This plan adds no key: counts, flags and the pairing table live in the rules text; `lang:on` and `lang:window` are the language's.
- **No Startup Simulator words in shared code.**
  - The banned list is plan 8-1's (its Global Constraints): plan 7-1's list (6-1's and slice 7's words) plus slice 8's poach, vest, cto, acquisition, fire sale, hit piece, scandal, integration, host, client, headhunter, crisis, m&a, divest, raider, market sale, counter-offer.
  - This plan touches no shared code. The test file may import 8-1's `waitingOf`, `Waiting` (`src/engine/core/lang/action-window.ts`) and `canPair` (`src/engine/core/lang/pairings.ts`).
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged. Rent Day keeps its 108 examples.
- **Files this plan changes:**
  - `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts` and `README.md`;
  - test-file pins under `src/pages/designer/**` that read the rules text, and no page source:
    - the Startup example count in `designer-page.test.tsx`;
    - any offered-button list, phase list, zone list, marked-zone list or fitted-table pin in `playtest-fitted.test.tsx` or `tableaux.test.ts` that the new buttons, phases or the operations mark change.
  - Each such pin is pinned as the view now says it and reported. Nothing under `src/engine/**` changes.
- **Every number comes from the rulebook, and examples say where:** a section or ruling in each title, and each task's "How the numbers come". The numbers are:
  - $6 / $12 / $20, +$5, +$5, −$5, −$1 and the $0 floor (§7 Liquidation);
  - 50% rounded down (§7.3);
  - $3 for the Hit Piece (§20.A);
  - −5 VP per Scandal (§12.1);
  - +$2 and +5 VP (§10.C).
- **Anti-goals (spec and overview):**
  - a product leaving a Board with a Client or another player's Consultant still on it, or a Host left with two Clients;
  - a sale without the seller's consent (ruling 22), or to a buyer short of the price or the bandwidth;
  - a rule approximated without a recorded call;
  - Startup words in shared code;
  - a game that can't end;
  - an auto-player that hides a rule that never fires.
- **Every rules line is pinned.**
  - Each line this plan adds or changes fails some example when it alone is removed, or is named in its task as pinned by a test instead.
  - Excepted are `Hint:` lines, `Players take turns.` lines, table rows and `Cards can …` declarations.
  - Never leave a rulebook line out because no example fails without it: show it is redundant, or reach it with an example.
- **Examples arrange at most 3 Equity tokens naming one player,** and never a mid-example `Given` of an Equity token while another naming the same player is on the table (7-1: a claim takes such a card from the table).
- **Example counts.** N₁₀ is the count the committed test pins (`results` length) when Task 1 starts: plan 7-2b's N₉ + 15, plus whatever fix waves and plans 7-3 and 8-1 add.
  - The tasks end at N₁₀ + 4, + 6, + 10 and + 14.
  - Each task updates `results` in `startup-simulator.test.ts`, the Startup test in `designer-page.test.tsx` and the README's "Its N examples".
- **Commands.**
  - Single file: `bunx vitest run src/games/startup-simulator.test.ts`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1: record `BASE=$(git rev-parse HEAD)`; run `bun run test` once for the passing count and the long runs' time; note N₁₀.
- **Existing tests.** Only the lines each task names change. If any other existing test fails, stop and report it.
- **Long runs.**
  - If an invariant shows a wrong rule, fix the rules text.
  - If a required tally stays at 0, change the auto-player (cadences, targets), never the rules. Report a key that stays unreachable, and pin its path with an arranged test (6-2b Task 5's shape).
  - If a rule can't be written with plans 4-1 to 8-1's phrases, report it.
  - If the long runs take more than a third longer than at BASE, report the timing.
- **Pre-flight notes carried from plans 4-2 to 7-2b:**
  - take every `shownFlags` / `standIns` / `shownPlayerValues` pin from HEAD and apply only the change named;
  - never write `For each card … that is X` (the lines below use `whose` or no filter);
  - read counts as numbers with missing as 0, never with `hasOwn`.
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefix `feat(games):` (`docs:` for a README-only commit).
  - TDD every task: change the test first, watch it fail, then the rules, pass, `bun run typecheck`, commit.
  - Every rules line below is exact copy. Insertion points name a line or section by its text, never by a line number.
  - **Re-read the committed rules file before each task:** the text of plans 4-2 to 7-2b is the base, and line numbers have moved. If a named anchor line is missing or worded otherwise, stop and report it.
  - In examples, a zone's `Given` comes before any `… has a … on it` Given that adds to the same zone.
  - If a line reads two ways (an `ambiguous` diagnostic), stop and report it. If an example's verb form or refusal text differs from the compiler's (a `… or …` refusal, `publishes`), use the compiler's and report it.

## Review Focus

- **A product that leaves its owner's Board while it is half of a stack, carries an Investor's Consultant, or has an attached Specialist.**
  - Expected:
    - the stack breaks first, and the Client stays with its owner on no card;
    - the Consultant goes back to its Investor's portfolio, unplaced;
    - the Specialist goes with the product to a buyer, or to the seller's bench in a Fire Sale;
    - pooled staff stay put.
  - Tests: Task 4 example 4, Task 1 example 4, Task 2 examples 1–2, and the long-run transfer invariant.
- **A Divest nobody can buy, one every asked rival passes, and one on the seller's last action.**
  - Expected:
    - no one asked: the Fire Sale at once;
    - after the last pass: the Fire Sale;
    - on the last action, the turn goes on to the Engine either way, a buy included.
  - Tests: Task 2 example 2, and its arranged test.
- **Room at its edges:**
  - an Offline product in the buyer's operations, which takes no room;
  - a Consultant's colour, which gives room;
  - a hybrid product, which needs room in both colours.
  - Expected: each colour judged alone, after the buyer's Online products.
  - Tests: Task 1's room test and example 3.
- **Scandal at its edges:**
  - a product scoring below 0;
  - an M&A Price floored at $0;
  - an Offline product the Director clears;
  - Scandal left when the Director can't clear it all.
  - Expected: −5 VP each, an Online product kept Online at the end; $0; cleared; the owner picks, and the Engine has less for Bugs.
  - Tests: Task 3 examples 2–4, Task 1 example 1.
- **Undo and replay across a consent, a Market Sale, a crisis press and an Integration.**
  - Expected: the log alone rebuilds the finished game, and undo of the last move gives the state before it. No seat's waiting view names a card it can't see.
  - Tests: Task 5.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name. If one is missing or differs, stop and report it.

- **Plan 8-1, built (its Interfaces):**
  - `a card's {attribute} goes down by {int} for each {attribute}`, `a card's {attribute} is {int}% of its {attribute}, rounded down` / `rounded up`;
  - `a player's {playervalue} goes down by the total {attribute} of {cardgroup}`, `their {playervalue} is at least the card's {attribute}`;
  - `they pay its {attribute} to its owner`, `they get its {attribute}`;
  - the zone mark `…, where some cards are on cards`, `every card on it in the same zone comes off it`, `move it to {zone}, with everything on it`, `the card it is on is (not) {cardflag}`, `ONTO_ITSELF`;
  - `Cards can {verb} cards by their {column}:` with its table, `the target card can {pairing} the card`, `canPair`;
  - the ask lines `Each other player has the {phase}, in turn from their left.` and `Its owner has the consent.`, `The action goes ahead.`, `The {phase} passes to the left.`, `waitingOf`, `Waiting.resume`.
- **Plan 7-2b, built:** the window line and `Phase: veto`, `Phase: offer`, `Phase: lawsuit` (the last phase); in the test file `VETO`, `LET_IT_GO_AHEAD`, `ANSWERS`, `Judged`, `windowJudge`, `turnOf`, the skipped answer phases in `playGame`'s `turnsIn`.
- **Plan 7-2a, built:** `Blue supply:` (`  A player's blue supply is the total pool blue of the cards in their ops team.` / `  A player's blue supply goes up by the total consultant blue of the cards in their operations.`) and its Red and QA forms; `The other players' cards on it go to their owners' portfolio.`; the zones `equity`, `portfolio`; in the test file `founderOf`, `portfolioOf`, `equitiesFrom`, the attachment invariant and the Equity conservation invariant.
- **Plan 6-2b, built:** `the event in play has the …`; `Price:`; the event check phase.
- **Plan 6-2a, built:**
  - `  Cards can have hype.`;
  - `Portfolio points:` (`  A card's portfolio points is its val.` / `  A card's portfolio points goes up by 5 for each hype.` / `  An offline card's portfolio points is 0.`);
  - the Strategy buttons, `isPlayable`, `debuffing()`, `utility()`, and the hype invariant;
  - the retitled Hit Piece example "a Warfare card waits in the hand for slice 8: …".
- **Plan 5-2a, built:**
  - `Rev:` (`  A card's rev goes up by the total rev bonus of the cards on it.` / `  A card's rev goes down by its bug decay.` / `  A card's rev is at least 0.` / `  An offline card's rev is 0.`, with whatever 6-2b added);
  - `Decaying:`;
  - `Attaching:` (Viral Loop or Rainmaker);
  - the QA Engineer's `qa output`, `badged`, `training xp`.
- **Plan 4-2, built:** the `engine` phase and its ops-QA rules; `QA supply:`; `Phase: commit`'s start lines ending `    Go to bench cleanup.`; actions' `  When they have less than 1 action, go to engine.`; in the test file `CLEAN`, `BEFORE_THE_ENGINE`, `ranTheEngine`, `enteredIncome`, `scoreOf`, `PHASES`.

---

### Task 1: The M&A Price, each player's room, and Acquisition with the seller's consent

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` only where it pins the actions phase's offered buttons or the phase list

**Interfaces:**
- Consumes: 8-1 Tasks 1, 2, 4, 6, 7; 7-2a's Consultant return line; 7-2b's window and judge.
- Produces (rules):
  - the count `scandal`;
  - worked `attachments`, `sale price`, `fire sale price`;
  - player values `blue room`, `red room`;
  - the button `acquire a card in another player's operations`;
  - `Phase: consent` with `agree to the sale` and `refuse the sale`.
- Produces (test file):

```ts
const ACQUIRE = "acquire a card in another player's operations";
const AGREE = 'agree to the sale';
const REFUSE_SALE = 'refuse the sale';
/** The ask waiting in `state`, if any: 8-1's Waiting with a resume line. 7-1 windows (no resume) are not asks. */
const askOf = (state: GameState): Waiting | null;
/** A product's M&A Price as the rules work it out (§7). */
const salePriceOf = (runtime: LangRuntime, state: GameState, id: string): number;
```

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₁₀ + 4; the designer page's count too.
    - `PHASES` gains `'consent'` last. `ANSWERS` gains `AGREE` and `REFUSE_SALE`. `playGame`'s skipped set adds moves whose `before.turn.phase` is `consent`.
    - The values test adds `attachments`, `sale price`, `fire sale price` (`kind: 'number'`, `refines: false`). `Object.keys(game.playerValues!)` gains `'blue room', 'red room'` where their sections fall, right after the `Red supply:` section: read the order from the compiled game and pin it.
    - `shownFlags`, `standIns` and `shownPlayerValues` are re-read and pinned as the view gives them, and the change reported.
  - **The judge.**
    - `windowJudge` judges a move that opens an ask (`askOf(after)` set) or closes one (`askOf(before)` set) as its own (`'own'`).
    - Only 7-1's windows keep `'cost'` and `'ahead'`.
    - A Veto window's `'ahead'` move runs the press's lines up to its ask, and the money checks below say what each press pays when it opens an ask.
  - **Money (`keepsTheRules`, judged moves).**
    - An `ACQUIRE` press pays nothing: its first line asks.
    - An `AGREE` that closes an ask whose `move.type` is `ACQUIRE`: the ask's `by` pays the card's `sale price`, read in `before`, to the mover. Nobody else's capital changes.
    - `REFUSE_SALE` changes no capital.
  - **Invariants (the spec's Proof 2, R2):**
    - After an `AGREE` move:
      - the card is in the ask's `by`'s operations and not `offline`, its `hype`, `scandal` and `bugs` as in `before`;
      - each card that sat on it in `before` and was in an ops team is in the buyer's ops team, still on it;
      - no card on it is another seat's (`othersOn` empty);
      - the seller's `market share` is as in `before`;
      - every card whose seat changed is in a zone of its new seat.
    - `askOf(state)` is set only while the phase is `consent` (Task 2 adds `market sale`), and an `ACQUIRE` that opens one asks exactly the card's owner.
  - **The auto-player.**
    - `acquiring()` goes in the planned list for actions after the first, right before `investing()`.
      - When `(t + a) % 11 === 5`, it acquires the first card offered in other seats' operations (from the seat's left, `equitiesFrom`'s order, with `operations` for `equity`) whose press is allowed and whose `sale price` leaves it 2 or more capital.
      - With none, it falls through.
    - **In `consent`,** the current seat agrees unless `t % 4 === 3`, when it refuses.
  - **Append `it('works out each player’s blue and red room: the supply, a Consultant’s colour included, less the maintenance of their Online products (§7 Liquidation, §17.B.4, ruling 19)')`.** On `setUp(2, 1)`, with O the second seat and its rooms read through `runtime.playerValue`:
    - **Blue.** O's ops team two Junior Software Devs, and O's operations a To-Do List and a Dating App with `offline: true`: blue room 1. With a token naming O in the first seat's portfolio, on the To-Do List with `blue consultant: true`: 2.
    - **Red.** O's ops team a Junior Hardware Eng, and its operations a Smart Toy: red room 0. With a token on the Smart Toy with `red consultant: true`: 1.
    - This test pins the two Consultant lines of the rooms; the examples pin the rest.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Cards.** After `  Cards can have hype.` add `  Cards can have scandal.`
  - **The M&A Price** (§7 Liquidation, ruling 24). Right after the `Portfolio points:` section add:

```text
Attachments:
  A card's attachments is the number of the cards on it that are attaching.

Sale price:
  A Tier 1 card's sale price is 6.
  A Tier 2 card's sale price is 12.
  A Tier 3 card's sale price is 20.
  A card's sale price goes up by 5 for each hype.
  A card's sale price goes up by 5 for each attachment.
  A card's sale price goes down by 5 for each scandal.
  A card's sale price goes down by 1 for each bug.
  A card's sale price is at least 0.

Fire sale price:
  A card's fire sale price is 50% of its sale price, rounded down.
```

  - **Room** (§7 "Bandwidth to run it", ruling 19). Right after the `Red supply:` section add the two sections below.
    - Each copies, in order, every line of the committed `Blue supply:` / `Red supply:` section, with `blue supply` / `red supply` read `blue room` / `red room`, then one more line.
    - At the time of writing:

```text
Blue room:
  A player's blue room is the total pool blue of the cards in their ops team.
  A player's blue room goes up by the total consultant blue of the cards in their operations.
  A player's blue room goes down by the total blue maint of the cards in their operations that are not offline.

Red room:
  A player's red room is the total pool red of the cards in their ops team.
  A player's red room goes up by the total consultant red of the cards in their operations.
  A player's red room goes down by the total red maint of the cards in their operations that are not offline.
```

  - **Acquisition** (§6, §7.1, ruling 22). In `Phase: actions`, right before `  A player may end their actions.` add:

```text
  A player may acquire a card in another player's operations.
    It costs 1 action.
    Only if they have at least the card's sale price in capital.
    Only if their blue room is at least the card's blue maint.
    Only if their red room is at least the card's red maint.
    Then:
      Its owner has the consent.
      The other players' cards on it go to their owners' portfolio.
      They pay its sale price to its owner.
      It is not offline.
      Move it to their operations, with everything on it.
```

  - **The consent** (ruling 22). After the `Phase: lawsuit` block add:

```text
Phase: consent
  Players take turns.
  Hint: A rival offers to buy one of your products at its M&A Price. Agree, and they pay you and take it with everything on it, or refuse.
  A player may agree to the sale.
    Then:
      The action goes ahead.
  A player may refuse the sale.
    Then:
      The action does not go ahead.
```

  - **Append these 4 examples.**

```text
Example: the M&A Price is $6, $12 or $20 by Tier, $5 more for each Hype and each attached Specialist, $5 less for each Scandal and $1 less for each Bug, never below $0, and a Fire Sale pays half of it, rounded down (section 7, ruling 24)
  Given p1's operations has a Dating App, a Neobank, a Quantum Computer, a To-Do List and a USB Gadget
  And p1's ops team has a Junior Software Dev
  And the Quantum Computer in p1's operations has a Sales Rep on it
  And the Neobank in p1's operations has 1 hype
  And the Neobank in p1's operations has 1 bug
  And the Quantum Computer in p1's operations has 1 scandal
  And the To-Do List in p1's operations has 2 scandal
  And the USB Gadget in p1's operations has 1 bug
  Then the Dating App in p1's operations has 6 sale price
  And the Neobank in p1's operations has 16 sale price
  And the Quantum Computer in p1's operations has 1 attachment
  And the Quantum Computer in p1's operations has 20 sale price
  And the To-Do List in p1's operations has 0 sale price
  And the USB Gadget in p1's operations has 5 sale price
  And the Neobank in p1's operations has 8 fire sale price
  And the USB Gadget in p1's operations has 2 fire sale price

Example: an Acquisition buys a rival's product at its M&A Price with the seller's consent; it arrives Online with its Hype, Scandal and Bugs and its attached Specialist, and the seller keeps its Market Share (section 6, section 7, ruling 22)
  Given the phase is actions
  And p0 has 20 capital
  And p0's operations has a To-Do List
  And p0's ops team has a Junior Software Dev and a Junior Software Dev
  And p1 has 2 market share
  And p1's operations has a Neobank
  And the Neobank in p1's operations has a Sales Rep on it
  And the Neobank in p1's operations is offline
  And the Neobank in p1's operations has 1 hype
  And the Neobank in p1's operations has 1 scandal
  And the Neobank in p1's operations has 2 bugs
  When p0 acquires the Neobank
  Then the phase is consent
  And it is p1's turn
  And p0 has 2 actions
  When p1 agrees to the sale
  Then the phase is actions
  And it is p0's turn
  And p0 has 5 capital
  And p1 has 22 capital
  And p0's operations has a To-Do List and a Neobank
  And the Neobank in p0's operations has a Sales Rep on it
  And the Neobank in p0's operations is not offline
  And the Neobank in p0's operations has 1 hype
  And the Neobank in p0's operations has 1 scandal
  And the Neobank in p0's operations has 2 bugs
  And p1 has 2 market share
  And p1's operations is empty
  And p1's ops team is empty

Example: an Acquisition needs the full price and spare bandwidth in each colour after the buyer's Online products, and a seller who refuses keeps the product, the buyer's action spent (section 7, ruling 22, ruling 19)
  Given the phase is actions
  And p0's operations has a To-Do List, a Dating App and a Smart Toy
  And p0's ops team has a Junior Software Dev, a Junior Software Dev and a Junior Hardware Eng
  And the Dating App in p0's operations is offline
  And p1's operations has a Server Farm, a Trading Bot, a Smart Lock and a Mobile Wallet
  When p0 acquires the Server Farm
  Then it is rejected because "they have at least the card's sale price in capital"
  When p0 acquires the Trading Bot
  Then it is rejected because "their blue room is at least the card's blue maint"
  When p0 acquires the Smart Lock
  Then it is rejected because "their red room is at least the card's red maint"
  When p0 acquires the Mobile Wallet
  Then the phase is consent
  And it is p1's turn
  When p1 refuses the sale
  Then the phase is actions
  And it is p0's turn
  And p0 has 2 actions
  And p0 has 7 capital
  And p1's operations has a Server Farm, a Trading Bot, a Smart Lock and a Mobile Wallet

Example: an Investor's Consultant on the product bought goes back to their portfolio, unplaced (section 7, section 17, the slice's R2)
  Given 3 players
  And the phase is actions
  And p0's ops team has a Junior Hardware Eng
  And p1's operations has a Smart Lock
  And p2's portfolio has an Equity whose founder is p1
  And the Equity whose founder is p1 in p2's portfolio is on the Smart Lock in p1's operations
  And the Equity whose founder is p1 in p2's portfolio is blue consultant
  When p0 acquires the Smart Lock
  And p1 agrees to the sale
  Then p0's operations has a Smart Lock
  And the Equity whose founder is p1 in p2's portfolio is on no card
  And p0 has 1 capital
  And p1 has 13 capital
  And p2 has 7 capital
```

  **How the numbers come** (§5 Phase B, §6, §7 Liquidation, §17.B.4, §20.B–C, rulings 19, 22, 24):
  - **The M&A Price:** Tier 1 $6, Tier 2 $12, Tier 3 $20; +$5 per Hype and per attached Specialist; −$5 per Scandal and −$1 per Bug; never below $0 (§7). The Dating App and the To-Do List are Tier 1, the Neobank and the Server Farm Tier 2, the Quantum Computer Tier 3 (§20.C).
    - Neobank 12 + 5 − 1 = 16 (the spec's example);
    - Quantum Computer 20 + 5 (the Sales Rep, an attached Specialist, §20.B) − 5 = 20;
    - To-Do List 6 − 10 floored at 0;
    - USB Gadget 6 − 1 = 5.
    - The pooled Junior adds nothing.
  - **The Fire Sale:** 50% rounded down (§7.3): 16 → 8, 5 → 2.
  - **Example 2:** 12 + 5 + 5 − 5 − 2 = 15. p0 20 − 15 = 5; p1 7 + 15 = 22.
    - A bought product arrives Online (§7 Rules), with its Hype, Scandal and Bug tokens and its attached Specialists (§7 INCLUDED).
    - The seller keeps its Market Share (§7 EXCLUDED).
    - Acquisition costs the buyer 1 AP (§6's table): 3 − 1 = 2.
  - **Room:** spare Blue covers Blue Maintenance and spare Red covers Red, after the buyer's Online products (§7 Rules, ruling 19).
    - Example 3: Blue 2 − 1 (the To-Do List; the Dating App is Offline) = 1, against the Trading Bot's 2.
    - Red 1 − 1 (the Smart Toy) = 0, against the Smart Lock's 1.
    - The Mobile Wallet needs Blue 1, and p0 has room 1.
    - The Server Farm's $12 is over p0's 7.
    - A refused seller ends the action, its AP spent (ruling 22, the spec's call).
  - **Example 4:** a Consultant returns when its product leaves the Founder's Board (§17.B.4). The Smart Lock is $6: p0 7 − 6 = 1, p1 7 + 6 = 13; p2's capital doesn't change. p0's Red room is 1 (the Junior Hardware Eng).
  - **Lines each example pins:**
    - 1: `Attachments:`, every `Sale price:` line and `Fire sale price:`;
    - 2: the acquire button's ask, pay, Online and move lines, and the consent's agree;
    - 3: the three guards, the rooms' first and last lines, and refuse;
    - 4: the Consultant line, without which the move refuses the other player's card still on it.
    - Task 1's room test pins the rooms' Consultant lines.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
  - 8-1's checks give no diagnostic: the consent phase takes turns, has no go-to, After line or cost, isn't first, and its lines let the action go ahead or stop it.
  - The long runs pass with Acquisitions made and refused.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
# and each other designer test file this task re-pinned, by path
git commit -F - <<'EOF'
feat(games): Startup Simulator works out each product's M&A Price, and an Acquisition buys a rival's product at it with the seller's consent and spare bandwidth in each colour

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: Divest: the Market Sale and the Fire Sale

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` only where it pins the actions phase's offered buttons or the phase list

**Interfaces:**
- Consumes: Task 1; 8-1 Tasks 2, 6, 7.
- Produces (rules): the flag `for sale`; the button `divest a card in their operations`; `Phase: market sale` with `buy a card in another player's operations` and `pass on the sale`.
- Produces (test file): `DIVEST`, `BUY`, `PASS_SALE` (those move types). `ANSWERS` gains `BUY` and `PASS_SALE`.

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₁₀ + 6; the designer page's count too. `PHASES` gains `'market sale'` after `'consent'`. `playGame`'s skipped set adds moves whose `before.turn.phase` is `market sale`.
  - **Money (`keepsTheRules`, judged moves).**
    - A `DIVEST` press that opens no ask gives the mover the card's `fire sale price` (read in `before`) from the bank.
    - One that opens an ask changes no capital.
    - `BUY`: the mover pays the card's `sale price` (in `before`) to its owner (in `before`).
    - `PASS_SALE` that closes the ask (no ask waits in `after`): the ask's `by` gains the card's `fire sale price` (in `before`); otherwise no capital changes.
  - **Invariants:**
    - **For sale.** At most one card is `for sale`, only while the phase is `market sale`, and it is the card of the ask's press.
    - **The asked set.** A `DIVEST` that opens an ask asks exactly the other seats still in, from the mover's left, whose capital covers the card's `sale price` and whose `blue room` and `red room` cover its `blue maint` and `red maint`, all read in `before`.
    - **A Fire Sale** (a move after which a card that was in a seat's operations is in the open idea pool):
      - the card holds no `blue cubes`, `red cubes`, `cut blue cubes`, `cut red cubes`, `bugs`, `hype` or `scandal`, and is neither `offline` nor `for sale`;
      - each card that sat on it in `before` and was in an ops team is in that seat's bench, on no card;
      - each card of that seat's ops team that sat on no card is still there.
    - Task 1's `AGREE` invariant also holds after a `BUY`, the seller being the card's owner in `before`.
    - 4-2's offline invariant widens: a product's `offline` also clears in an `AGREE` or `BUY` of it, and as it goes to the open idea pool. 6-2a's hype invariant widens: hype falls to 0 as its card goes to the open idea pool.
    - `askOf(state)` is set only while the phase is `consent` or `market sale`.
  - **The auto-player.**
    - `divesting()`, planned when `(t + a) % 13 === 7` and the seat runs 2 or more products: divest its product with the lowest `sale price`, the first of those.
    - **In `market sale`,** the current seat buys the card `for sale` when `t % 3 !== 1`, else passes.
  - **Append `it('passes the turn on after a Divest on the seller’s last action, whether a rival buys or the bank takes it (Review Focus)')`.**
    - From `setUp(2, 1)`, with S the start player at 1 action, S's operations a Dating App and a To-Do List with two Junior Software Devs in S's ops team, and O, the other seat, at 20 capital with a Junior Software Dev in its ops team:
      - S divests the Dating App;
      - O buys it: S's turn has run the Engine (`ranTheEngine` with `turnOf`), and the next turn has started.
    - The same table with O at 2 capital: the divest alone ends with the Dating App in the open idea pool and the turn moved on.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Cards.** After `  Cards can be offered.` add `  Cards can be for sale.`
  - **Divest** (§6 Divest, §7.2–3, ruling 24). In `Phase: actions`, right before `  A player may end their actions.` add:

```text
  A player may divest a card in their operations.
    It costs 1 action.
    Then:
      It is for sale.
      Each other player has the market sale, in turn from their left.
        Only if they have at least the card's sale price in capital.
        Only if their blue room is at least the card's blue maint.
        Only if their red room is at least the card's red maint.
      It is not for sale.
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
```

  - **The Market Sale** (§7.2, the spec's call). After the `Phase: consent` block add:

```text
Phase: market sale
  Players take turns.
  Hint: A rival is selling a product at its M&A Price. Buy it, paying them, or pass it on to the next player.
  A player may buy a card in another player's operations.
    Only if it is for sale.
    Then:
      It is not for sale.
      The other players' cards on it go to their owners' portfolio.
      They pay its sale price to its owner.
      It is not offline.
      Move it to their operations, with everything on it.
      The action does not go ahead.
  A player may pass on the sale.
    Then:
      The market sale passes to the left.
```

  - **Append these 2 examples.**

```text
Example: a Market Sale offers the product to each rival in turn from the seller's left who has its M&A Price and the bandwidth to run it; the first who accepts pays the seller and takes it, and a Consultant on it goes back to its Investor (section 6, section 7, section 17, the spec's call)
  Given 5 players
  And the phase is actions
  And p0's operations has a Dating App
  And the Dating App in p0's operations has 1 hype
  And p1 has 10 capital
  And p1's ops team has a Junior Software Dev
  And p2 has 20 capital
  And p2's portfolio has an Equity whose founder is p0
  And the Equity whose founder is p0 in p2's portfolio is on the Dating App in p0's operations
  And the Equity whose founder is p0 in p2's portfolio is blue consultant
  And p3 has 20 capital
  And p3's ops team has a Junior Software Dev
  And p4 has 20 capital
  And p4's ops team has a Junior Software Dev
  When p0 divests the Dating App
  Then the phase is veto
  And it is p2's turn
  When p2 lets the action go ahead
  Then the phase is market sale
  And it is p3's turn
  And the Dating App in p0's operations is for sale
  When p3 passes on the sale
  Then it is p4's turn
  When p4 buys the Dating App
  Then the phase is actions
  And it is p0's turn
  And p0 has 2 actions
  And p0 has 18 capital
  And p4 has 9 capital
  And p3 has 20 capital
  And p4's operations has a Dating App
  And the Dating App in p4's operations has 1 hype
  And the Dating App in p4's operations is not for sale
  And the Equity whose founder is p0 in p2's portfolio is on no card

Example: when no rival buys, the bank takes the product in a Fire Sale for half its M&A Price, rounded down: the card goes to the open idea pool stripped of its cubes and tokens, its attached Specialist to the seller's bench, a Consultant to its Investor, and the pooled staff stay (section 7, section 15, section 17, ruling 24)
  Given 3 players
  And the phase is actions
  And p0's operations has a Smart Thermostat and a To-Do List
  And p0's ops team has a Junior Hardware Eng and a Junior Software Dev
  And the Smart Thermostat in p0's operations has a Sales Rep on it
  And the Smart Thermostat in p0's operations is offline
  And the Smart Thermostat in p0's operations has 1 blue cube
  And the Smart Thermostat in p0's operations has 3 red cubes
  And the Smart Thermostat in p0's operations has 1 cut blue cube
  And the Smart Thermostat in p0's operations has 1 cut red cube
  And the Smart Thermostat in p0's operations has 2 bugs
  And the Smart Thermostat in p0's operations has 1 hype
  And the Smart Thermostat in p0's operations has 1 scandal
  And p1 has 20 capital
  And p1's ops team has a Junior Software Dev
  And p1's portfolio has an Equity whose founder is p0
  And the Equity whose founder is p0 in p1's portfolio is on the Smart Thermostat in p0's operations
  And the Equity whose founder is p0 in p1's portfolio is red consultant
  And p2 has 9 capital
  And p2's ops team has a Junior Hardware Eng
  When p0 divests the Smart Thermostat
  Then the phase is veto
  And it is p1's turn
  When p1 lets the action go ahead
  Then the phase is market sale
  And it is p2's turn
  When p2 passes on the sale
  Then the phase is actions
  And it is p0's turn
  And p0 has 2 actions
  And p0 has 11 capital
  And p2 has 9 capital
  And p0's operations has a To-Do List
  And p0's ops team has a Junior Hardware Eng and a Junior Software Dev
  And p0's bench has a Sales Rep
  And the Equity whose founder is p0 in p1's portfolio is on no card
  And the open idea pool has a Smart Thermostat
  And the Smart Thermostat in the open idea pool has 0 blue cubes
  And the Smart Thermostat in the open idea pool has 0 red cubes
  And the Smart Thermostat in the open idea pool has 0 cut blue cubes
  And the Smart Thermostat in the open idea pool has 0 cut red cubes
  And the Smart Thermostat in the open idea pool has 0 bugs
  And the Smart Thermostat in the open idea pool has 0 hype
  And the Smart Thermostat in the open idea pool has 0 scandal
  And the Smart Thermostat in the open idea pool is not offline
  And the Smart Thermostat in the open idea pool is not for sale
```

  **How the numbers come** (§6 Divest, §7.2–3, §15.B.3, §17.B.4, §20.C, rulings 19, 24):
  - **Example 1:** the Dating App is $6 + $5 = $11 (§7).
    - Offered in turn from the seller's left to rivals with the price and the bandwidth (§6 Divest, §7.2; the spec's call):
      - p1's $10 is short;
      - p2 has no ops team, so no Blue room;
      - p3 is asked first and passes;
      - p4 buys.
    - p0 7 + 11 = 18; p4 20 − 11 = 9.
    - The window first asks p2, who holds p0's Equity (7-2b).
    - p2's token returns as its product leaves the Founder's Board (§17.B.4).
  - **Example 2:** the Smart Thermostat costs 2 Blue / 4 Red and is cut 1 of each (§19.A), so its tracks hold 1 and 3.
    - Its price is 6 + 5 (Hype) + 5 (the Sales Rep) − 5 (Scandal) − 2 (Bugs) = $9.
    - p1 has no Red room, so it isn't asked; p2's $9 and Red room 1 cover it, and p2 passes.
    - The bank pays 50%, rounded down: $4, and p0 has 7 + 4 = 11 (§7.3).
    - The card is scrapped to the Open Idea Pool (§7.3, §15.B.3).
    - Attached Specialists go to the seller's Bench; pooled Ops staff stay (§7.3).
  - **Lines each example pins:**
    - 1: the divest's `for sale` and ask lines (its cash and Blue room guards), `pass on the sale`, and the buy's six lines;
    - 2: the ask's Red room guard, and every Fire Sale line.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Divest offers a product to each rival in turn who can pay and run it, and sells it to the bank at half price when none buys

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: The Hit Piece, Scandal in the score, Crisis Management, and no Offline by choice at game end

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` only where it pins offered buttons or the phase list

**Interfaces:**
- Consumes: Task 1's `scandal`; 7-1's Immunity test; 6-1's `goes down by {int} for each`; 4-1's player-value comparisons.
- Produces (rules):
  - the count `cleared scandal`;
  - the flag `directing`;
  - player values `crisis supply`, `scandal load`, `crisis spent`, and `qa supply` refined;
  - the button `publish a card from their strategy hand to a card in another player's operations`;
  - `Phase: crisis` with `clear a card in their operations`.
- Produces (test file): `PUBLISH`, `CLEAR` (those move types).

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₁₀ + 10; the designer page's count too.
    - `PHASES` gains `'crisis'` right before `'engine'`, and so does `BEFORE_THE_ENGINE`.
    - The values test adds `directing` (flag). `playerValues` gains `'crisis supply', 'scandal load', 'crisis spent'` in section order.
    - Re-pin `shownFlags` / `shownPlayerValues` from HEAD and report the change.
  - **`scoreOf`** subtracts 5 for each `scandal` on each of the seat's products in operations that are not `offline` (§12.1).
  - **Money.** A `PUBLISH` press pays the card's `price` (in `before`); a `CLEAR` changes no capital.
  - **Invariants:**
    - **Where Scandal sits.** `scandal` sits only on cards in an operations.
    - **How it changes.** A card's `scandal` rises only in a `PUBLISH` press: by 1, on its target, in another seat's operations, whose owner's Equity the mover's portfolio held none of in `before`. It falls only:
      - in a move that leaves or passes through the mover's `crisis` step, on the mover's products, by no more than the mover's `crisis supply`;
      - or to 0 as its card goes to the open idea pool.
    - **Cleared Scandal.** `cleared scandal` sits on a card only while its owner's turn is in `crisis` or `engine`.
    - **Capacity.** In every state, a seat's `crisis spent` is at most its `crisis supply`, and a `CLEAR` removes exactly 1 Scandal, from its own card. Example 3 pins what the Engine then has for Bugs.
  - **The auto-player.**
    - **`publishing()`,** a free move made at most once a turn, right after `debuffing()`: when `t % 2 === 0` and it holds a Hit Piece it can pay for, it publishes it on the first product offered in other seats' operations whose press is allowed.
    - **`isPlayable`** counts a Hit Piece as playable.
    - **In `crisis`,** it clears the product at `t % n` among its products with `scandal`.
    - **Steering (P14):**
      - `training()` plays a Leadership Masterclass on a QA Engineer in its ops team before any other target when its products have Scandal;
      - `publishing()` targets a seat with a badged QA Engineer in its ops team first.
      - This makes a Director meet Scandal.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Cards.** `  Cards can have scandal.` becomes `  Cards can have scandal and cleared scandal.`
  - **Scandal in the score** (§12.1, ruling 25). In `Portfolio points:`, right after `  A card's portfolio points goes up by 5 for each hype.` add `  A card's portfolio points goes down by 5 for each scandal.`
  - **The Hit Piece** (§20.A, §17.B.2). In `Phase: actions`, right before `  A player may end their actions.` add:

```text
  A player may publish a card from their strategy hand to a card in another player's operations.
    Only if it is a Hit Piece card.
    Only if they have no card in their portfolio whose founder is the target card's owner.
    Only if they have at least the card's price in capital.
    Then:
      They pay the card's price.
      The target card gains 1 scandal.
      Move it to the strategy discard.
```

  - **The Director of QA** (§11.C restriction, §11.D.1). Right after the `Fire sale price:` section add:

```text
Directing:
  Only if it is a Bug Hunter card.
  Only if it is badged.
```

  - **Its capacity** (§11.D.1). Right after the `Red room:` section add:

```text
Crisis supply:
  A player's crisis supply is the total qa output of the cards in their ops team that are directing.

Scandal load:
  A player's scandal load is the total scandal of the cards in their operations.

Crisis spent:
  A player's crisis spent is the total cleared scandal of the cards in their operations.
```

  - **QA supply** (§11.D.1 "before any Bugs, up to its Bug-removal count"). At the end of `QA supply:` add `  A player's qa supply goes down by the total cleared scandal of the cards in their operations.`
  - **The step.** In `Phase: actions`, `  When they have less than 1 action, go to engine.` becomes `  When they have less than 1 action, go to crisis.` Re-read the file for any other `go to engine` and report it. Right before `Phase: engine` add:

```text
Phase: crisis
  Hint: Your Director of QA clears Scandal before any Bug, and can't clear it all. Pick the products, one Scandal at a time.
  A player may clear a card in their operations.
    Only if its scandal is more than 0.
    Then:
      It loses 1 scandal.
      It gains 1 cleared scandal.
  When their crisis supply is at least their scandal load:
    Only if their crisis spent is 0.
    For each card in their operations, its cleared scandal goes up by its scandal.
    For each card in their operations, it loses its scandal.
    Go to engine.
  When their crisis spent is at least their crisis supply, go to engine.
```

  - **Clearing the counts.** In `Phase: commit`'s `When this phase starts:`, right before `    Go to bench cleanup.` add `    For each card in their operations, it loses its cleared scandal.`
  - **6-2a's Warfare example.** Its title `Example: a Warfare card waits in the hand for slice 8: a Hit Piece is refused on one of the player's own staff (the spec's call, section 20)` becomes `Example: a Hit Piece goes only on a rival's product: the Training and Buff button refuses it on the player's own staff (section 20)`. Its lines stay.
  - **Append these 4 examples.**

```text
Example: a Hit Piece costs $3 and no action and adds 1 Scandal to a rival's product, an Offline one too, but never to a product of a Founder whose Equity the player holds (section 20, section 17, ruling 25)
  Given 3 players
  And the phase is actions
  And p0's strategy hand has a Hit Piece, a Hit Piece and a Headhunter
  And p0's portfolio has an Equity whose founder is p2
  And p1's operations has a Dating App
  And the Dating App in p1's operations is offline
  And p2's operations has a To-Do List
  When p0 publishes a Hit Piece to the To-Do List
  Then it is rejected because "they have no card in their portfolio whose founder is the target card's owner"
  When p0 publishes the Headhunter to the Dating App
  Then it is rejected because "it is a Hit Piece card"
  When p0 publishes a Hit Piece to the Dating App
  Then it is accepted
  And p0 has 4 capital
  And p0 has 3 actions
  And the Dating App in p1's operations has 1 scandal
  And the strategy discard has a Hit Piece
  Given p0 has 2 capital
  When p0 publishes the Hit Piece to the Dating App
  Then it is rejected because "they have at least the card's price in capital"
  And the Dating App in p1's operations has 1 scandal

Example: each Scandal costs an Active product 5 points, which can take it below 0, and at the game-end check a product is never taken Offline by choice when everything fits (section 12, the slice's R3)
  Given the crash pile has the Market Crash
  And it is p1's turn
  And p0 has 30 capital
  And p0's operations has a Dating App
  And p0's ops team has a Junior Software Dev
  And the Dating App in p0's operations has 2 scandal
  Then the Dating App in p0's operations has -5 portfolio points
  When p1 ends their actions
  Then the game is over
  And the Dating App in p0's operations is not offline
  And p0 scores 1
  And p1 scores 1

Example: a Director of QA in the ops team clears Scandal before any Bug, up to its Bug-removal count, from its owner's products, Offline ones too, and what it clears there it no longer has for Bugs (section 11, section 5, ruling 25)
  Given the phase is actions
  And p0's operations has a Dating App and a To-Do List
  And p0's ops team has a QA Engineer and a Junior QA Tester
  And the QA Engineer in p0's ops team is badged
  And the QA Engineer in p0's ops team has 1 training xp
  And the To-Do List in p0's operations is offline
  And the Dating App in p0's operations has 1 scandal
  And the Dating App in p0's operations has 2 bugs
  And the To-Do List in p0's operations has 1 scandal
  Then the QA Engineer in p0's ops team is directing
  And p0's crisis supply is 2
  And p0's scandal load is 2
  When p0 ends their actions
  Then it is p1's turn
  And the Dating App in p0's operations has 0 scandal
  And the To-Do List in p0's operations has 0 scandal
  And the Dating App in p0's operations has 1 bug
  And the Dating App in p0's operations has 0 cleared scandal

Example: when its Director can't clear every Scandal, the owner picks the products one Scandal at a time, and neither an unbadged QA Engineer nor a badged Junior QA Tester clears any (section 11, ruling 25)
  Given the phase is actions
  And p0's operations has a Dating App, a To-Do List and a USB Gadget
  And p0's ops team has a QA Engineer and a Junior QA Tester
  And p0's bench has a QA Engineer
  And the QA Engineer in p0's ops team is badged
  And the QA Engineer in p0's ops team has 1 training xp
  And the Junior QA Tester in p0's ops team is badged
  And the Dating App in p0's operations has 2 scandal
  And the To-Do List in p0's operations has 1 scandal
  Then the Junior QA Tester in p0's ops team is not directing
  And the QA Engineer in p0's bench is not directing
  When p0 ends their actions
  Then the phase is crisis
  When p0 clears the USB Gadget
  Then it is rejected because "its scandal is more than 0"
  When p0 clears the Dating App
  Then the phase is crisis
  And p0's crisis spent is 1
  When p0 clears the To-Do List
  Then it is p1's turn
  And the Dating App in p0's operations has 1 scandal
  And the To-Do List in p0's operations has 0 scandal
```

  **How the numbers come** (§5 Phase D, §11.C–D, §12.1–2, §17.B.2, §20.A–B, ruling 25, R3):
  - **The Hit Piece:** $3 and 0 AP (§20.A, §6 Play Strategy Card); +1 Scandal on an opponent's Maintenance product; not against a Founder whose Equity the player holds (§17.B.2). 7 − 3 = 4; at $2 it is refused.
  - **Scandal in the score:** −5 VP each on an Active product, which can score below 0 (§12.1). The Dating App's val 5 − 10 = −5. p0: $30 is 6 points, and 6 − 5 = 1; p1: $7 is 1 (§12.2).
  - **R3:** the Junior's Blue 1 runs the Dating App, so everything fits and nothing goes Offline (§12.2).
  - **Crisis Management:** a QA Engineer with a Gold Badge in the Ops Zone removes Scandal before any Bugs, up to its Bug-removal count, from any of its owner's Maintenance products, Offline ones included (§11.D.1).
    - A QA Engineer with 1 XP removes 2 (§11.D.1); a Junior QA Tester 1 (§20.B.2).
    - Example 3: it clears both Scandals (2 of its 2). The ops QA then has 3 − 2 = 1 for the Dating App's 2 Bugs: 1 is left.
    - A badged QA Junior can't remove Scandal (§11.C restriction), nor can an unbadged QA Engineer.
    - Example 4: capacity 2 against 3 Scandal, so the owner picks.
  - **Lines each example pins:**
    - 1: the publish button's lines;
    - 2: the Portfolio points Scandal line (R3 is a guard);
    - 3: `Crisis supply:`, `Scandal load:`, `Crisis spent:`, the QA supply line, the step's first rule and its lines, actions' `go to crisis`, and commit's clearing line;
    - 4: the clear button's lines, the step's last rule, the first rule's `Only if their crisis spent is 0.` (without it the second press would clear the rest at once), and both `Directing:` lines (the badged Junior QA Tester, the unbadged QA Engineer on the bench).
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
  - If `-5 portfolio points` doesn't parse as an expect, replace that line with the score lines alone and report it: the score already shows −5.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Hit Piece adds Scandal to a rival's product, each Scandal costs 5 points and $5 of M&A Price, and a Director of QA clears it before any Bug

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: Integration

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `tableaux.test.ts` and `playtest-fitted.test.tsx` where they pin the marked zones, the operations row or the actions phase's offered buttons

**Interfaces:**
- Consumes: 8-1 Tasks 4–5; Tasks 1–2's buying and Fire Sale lines.
- Produces (rules):
  - the operations mark;
  - the pairing `host`;
  - flags `running`, `stacked`, `integrated`, `hosting`; `rev`, `decaying` and `portfolio points` refined;
  - the button `integrate a card from their operations to a card in their operations`;
  - the stack-breaking line in the three sale routes.
- Produces (test file):

```ts
const INTEGRATE = 'integrate a card from their operations to a card in their operations';
/** The Clients in `seat`'s operations: products there that sit on a product there (R2). */
const clientsOf = (state: GameState, seat: PlayerId): CardState[];
```

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₁₀ + 14; the designer page's count too.
    - The values test adds `running`, `stacked`, `integrated`, `hosting` (flags).
    - `'lays out the table …'`: the marked zones gain operations' entry as the compiled spec gives it (`onCards: 'some'`, no holders), read and pinned.
    - **The pairing.** `game.pairings` is `{ host: { column: 'tag', pairs: { device: […], iot: […], robotics: […], platform: […], cloud: […], metaverse: […], fusion: […] }, line } }`:
      - each entry as §10.B lists it;
      - values canonical as 8-1 Task 5 stores them, read and pinned;
      - `line` from `lineOf`.
    - Re-pin `shownFlags` from HEAD and report the change.
  - **`scoreOf`** adds 5 for each of the seat's products the runtime calls `hosting` (§10.C.3, §12.1).
  - **Invariants (the spec's Proof 2, R2):**
    - **Where Clients sit.** A card in an operations that sits on a card sits on a card in the same operations. That card sits on no card, and no other card of that operations sits on it ("no Host with two Clients"; no chain).
    - **What may pair.** For each such pair, `canPair(game.pairings.host, host.data.tag, client.data.tag)` holds.
    - **What makes a stack.** A card in an operations comes to sit on a card only in an `INTEGRATE` press, and the press's card sits on its target after it.
    - **What breaks one.** In a move after which a product that was in a seat's operations is anywhere else, that product has no card of an operations on it and sits on no card; the Client it held, or the Host it sat on, is still in its owner's operations, on no card.
    - 7-2a's attachment invariant widens to: "… or in an operations, on a card of the same operations".
  - **The auto-player.**
    - **`integrating()`,** a free move made at most once a turn, right after `publishing()`, when `t % 3 !== 2`: the first pair (card, target), card before target in operations order, whose `INTEGRATE` press is allowed.
    - **The ops check and the final check** switch a stack's two halves off together when they must switch off one of them: §10.E's strategy note. Report the change.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Table** (R2). `  Each player has an operations row that everyone can see.` becomes `  Each player has an operations row that everyone can see, where some cards are on cards.`
  - **Cards** (§10.B, ruling 21). After `  Cards can have scandal and cleared scandal.` add:

```text
  Cards can host cards by their tag:
    | tag       | hosts                      |
    | Device    | App, Data, Media and AI    |
    | IoT       | App, Data, Media and AI    |
    | Robotics  | App, Data, Media and AI    |
    | Platform  | Commerce, Crypto and Media |
    | Cloud     | Commerce, Crypto and Media |
    | Metaverse | Social, Media and Commerce |
    | Fusion    | Bio, Energy and IoT        |
```

  - **The flags** (§10.A, §10.E). Right after the `Directing:` section add:

```text
Running:
  Only if it is in an operations.

Stacked:
  Only if one of:
    The card it is on is running.
    Some card on it is running.

Integrated:
  Only if it is running.
  Only if it is not offline.
  Only if the card it is on is not offline.

Hosting:
  Only if some card on it is integrated.
```

  - **The bonuses** (§10.C).
    - In `Rev:`, right after `  A card's rev goes up by the total rev bonus of the cards on it.` add `  An integrated card's rev goes up by 2.`
    - At the end of `Decaying:` add `  Only if it is not integrated.`
    - In `Portfolio points:`, right after `  A card's portfolio points goes down by 5 for each scandal.` add `  A hosting card's portfolio points goes up by 5.`
  - **Integrate** (§6, §10.A, 0 AP). In `Phase: actions`, right before `  A player may end their actions.` add:

```text
  A player may integrate a card from their operations to a card in their operations.
    Only if the target card can host the card.
    Only if it is not stacked.
    Only if the target card is not stacked.
    Then:
      It goes to their operations, on the target card.
```

  - **Breaking the stack on a sale** (§10.D, R2). In `acquire …`'s `Then:` right after `      Its owner has the consent.`, in the market sale's `buy …` right after `      It is not for sale.`, and in `divest …` right after its `      It is not for sale.`, add `      Every card on it in the same zone comes off it.`
  - **Append these 4 examples.**

```text
Example: Integrating an App under a Device is free and takes no action; while both run, the App earns $2 more and its Bugs cost it nothing, and the Device scores 5 more; an attached Specialist is no Client (section 10)
  Given the phase is actions
  And p0's operations has a USB Gadget, a To-Do List and a Dating App
  And p0's ops team has a Junior Software Dev
  And the Dating App in p0's operations has a Sales Rep on it
  And the To-Do List in p0's operations has 2 bugs
  Then the To-Do List in p0's operations has 0 rev
  When p0 integrates the To-Do List to the USB Gadget
  Then it is accepted
  And p0 has 3 actions
  And the To-Do List in p0's operations is on the USB Gadget in p0's operations
  And the To-Do List in p0's operations is integrated
  And the To-Do List in p0's operations has 3 rev
  And the USB Gadget in p0's operations has 6 portfolio points
  And the Dating App in p0's operations has 5 portfolio points

Example: only the pairs of the table integrate, one Client to a Host: a Host takes no second Client, a Client can't be a Host, and a Host can't be a Client (section 10, ruling 21, ruling 25)
  Given the phase is actions
  And p0's operations has a Smart Lock, a To-Do List, a Health Tracker, a Dating App, a Pet Tracker, a USB Gadget and a Fusion Reactor
  When p0 integrates the Dating App to the Smart Lock
  Then it is rejected because "the target card can host the card"
  When p0 integrates the To-Do List to the Smart Lock
  Then it is accepted
  When p0 integrates the Health Tracker to the Smart Lock
  Then it is rejected because "the target card is not stacked"
  When p0 integrates the Smart Lock to the Fusion Reactor
  Then it is rejected because "it is not stacked"
  When p0 integrates the Pet Tracker to the Fusion Reactor
  Then it is accepted
  When p0 integrates the Health Tracker to the Pet Tracker
  Then it is rejected because "the target card is not stacked"
  When p0 integrates the To-Do List to the USB Gadget
  Then it is rejected because "it is not stacked"
  And the Health Tracker in p0's operations is on no card
  And the To-Do List in p0's operations is on the Smart Lock in p0's operations
  And the Pet Tracker in p0's operations is on the Fusion Reactor in p0's operations

Example: an Integration is live only while both halves are Online: with the Host Offline the Client earns no bonus and its Bugs cost it, and with the Client Offline the Host scores no more (section 10)
  Given the phase is actions
  And p0's operations has a USB Gadget, a To-Do List, a Smart Lock and a Health Tracker
  And the To-Do List in p0's operations is on the USB Gadget in p0's operations
  And the Health Tracker in p0's operations is on the Smart Lock in p0's operations
  And the To-Do List in p0's operations has 1 bug
  And the USB Gadget in p0's operations is offline
  And the Health Tracker in p0's operations is offline
  Then the To-Do List in p0's operations is not integrated
  And the To-Do List in p0's operations has 0 rev
  And the Health Tracker in p0's operations is not integrated
  And the Smart Lock in p0's operations has 3 portfolio points

Example: a stack breaks when either card is sold: the Host goes without its Client, which stays with its owner on no card, in an Acquisition, a Market Sale and a Fire Sale (section 10, section 7, the slice's R2)
  Given the phase is actions
  And p0 has 20 capital
  And p0 has 4 actions
  And p0's operations has a Smart Lock, a To-Do List, a Tech Blog and a Mobile Wallet
  And p0's ops team has a Junior Software Dev, a Junior Software Dev, a Junior Software Dev, a Junior Software Dev and a Junior Hardware Eng
  And the To-Do List in p0's operations is on the Smart Lock in p0's operations
  And the Mobile Wallet in p0's operations is on the Tech Blog in p0's operations
  And p1's operations has a USB Gadget and a Health Tracker
  And p1's ops team has a Junior Software Dev and a Junior Software Dev
  And the Health Tracker in p1's operations is on the USB Gadget in p1's operations
  When p0 acquires the USB Gadget
  And p1 agrees to the sale
  Then the USB Gadget in p0's operations has no cards on it
  And the Health Tracker in p1's operations is on no card
  And p0 has 14 capital
  When p0 divests the Tech Blog
  Then the phase is market sale
  And it is p1's turn
  When p1 buys the Tech Blog
  Then p1's operations has a Health Tracker and a Tech Blog
  And the Mobile Wallet in p0's operations is on no card
  And p0 has 20 capital
  When p0 divests the Smart Lock
  Then the phase is actions
  And the To-Do List in p0's operations is on no card
  And p0's bench is empty
  And the open idea pool has a Smart Lock
  And p0 has 23 capital
```

  **How the numbers come** (§6, §7, §10, §12.1, §20.C, rulings 21, 25):
  - **The pairs** go by each card's provided Tag (§10.A–B):
    - the USB Gadget is a Device and the To-Do List an App;
    - the Smart Lock and the Pet Tracker are IoT, a Hardware Host;
    - the Fusion Reactor (Tag Fusion) hosts Bio, Energy and IoT;
    - the Dating App is Social, which no Hardware Host takes;
    - the Health Tracker is Data; the Tech Blog is Platform and the Mobile Wallet Commerce.
  - **Limits:** a Host supports only 1 Client, a Client sits under only 1 Host, and a Client can't be a Host (§10.A–B, ruling 25's "a Client sits under only one Host").
  - **Bonuses** while both are Active (§10.C, §10.E):
    - Example 1: the To-Do List earns 1 + 2 = 3, its 2 Bugs costing nothing; without the stack, 1 − 2 floors at 0 (§5 Phase B).
    - The USB Gadget's val 1 + 5 = 6. The Dating App with a Sales Rep scores its val, 5.
  - **Broken by Offline** (§10.E): the To-Do List with its Host Offline is 1 − 1 = 0; the Smart Lock with its Client Offline is its val, 3.
  - **Example 4.**
    - p0's Blue room is 4 − 3 = 1 for the USB Gadget's Blue 1; its $6 leaves 20 − 6 = 14.
    - p1's room is 2 − 1 = 1, and its $13 covers the Tech Blog's $6: p0 14 + 6 = 20.
    - p1 has no Red room for the Smart Lock, so the bank pays 6 / 2 = 3: 23.
    - Four actions are arranged so the turn stays p0's.
  - **Lines each example pins:**
    - 1: the integrate button's move, `Running:`, `Integrated:`'s running line, `Hosting:`, the Rev, Decaying and Portfolio points lines;
    - 2: the pairing guard, both `Stacked:` alternatives, and both stacked guards;
    - 3: `Integrated:`'s two Offline lines;
    - 4: the breaking line in each sale route. Without it, Acquisition and the Market Sale refuse to move a card still on a card in its own zone, and the Fire Sale sends the Client to the bench.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
  - Every earlier example passes unchanged. No example puts a staff member on a product with 7-1's `… is on …` Given: the `has … on it` Given still puts it in the ops team.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
# and each other designer test file this task re-pinned, by path
git commit -F - <<'EOF'
feat(games): Startup Simulator integrates a Client under a Host in operations by the Tag table, for $2 more and no Bug decay on the Client and 5 points on the Host while both run, and every sale breaks the stack first

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: Long runs: every slice-8a path tallied, whole games replayed; the README and the checks

**Files:**
- Modify: `src/games/startup-simulator.test.ts`, `README.md`

**Interfaces:**
- Consumes: every constant and policy above and in plans 4-2 to 7-2b; `askOf`, `salePriceOf`, `clientsOf`, `windowJudge`, `turnOf`, `enteredIncome`.
- **`happenings` gains these keys** (on judged moves, read through the runtime):
  - **Sales:**
    - `a product acquired` (an `AGREE`) and `an Acquisition refused` (a `REFUSE_SALE`);
    - `a product bought at a Market Sale` (a `BUY`) and `a Market Sale passed` (a `PASS_SALE`);
    - `a Market Sale asking two or more rivals`, for a `DIVEST` opening an ask with `asked.length` above 1;
    - `a Fire Sale`, and `a Fire Sale with no rival asked` for a `DIVEST` after which no ask waits;
    - for the product of an `AGREE` or `BUY`, by its state in `before`: `a product sold with Hype`, `… with Scandal`, `… with Bugs`, `… with a Specialist on it`, `an Offline product bought`;
    - `a Consultant sent back by a sale`, for a sale or Fire Sale of a product with a card in `othersOn` in `before`.
  - **Scandal:**
    - `a Hit Piece published`;
    - `a Hit Piece refused by Immunity`, from the `refused` callback;
    - `Scandal cleared by a Director at once`, for a move that left `crisis` with no `CLEAR` this turn, Scandal having fallen;
    - `Scandal cleared by a press`, for a `CLEAR`.
  - **Integration:**
    - `an Integration under a Hardware Host`, `… a Digital Host`, `… a Unicorn Host`, for an `INTEGRATE` by its target's `tag`;
    - `a Client's $2 at Income` and `a Client's Bugs ignored at Income`, for each `integrated` product, with `bugs` above 0 for the second, of the seat `enteredIncome` names;
    - `a stack left dead by an Offline half at Income`, for each Client of that seat with either half `offline`;
    - `a stack broken by a sale`, for a sale or Fire Sale of a Host or a Client.
- **At each run's result** the long-run `it.each` also sums, like `marketShare`:
  - `products scored with Scandal`: Online products with `scandal` above 0;
  - `Hosts scored`: products the runtime calls `hosting`.

- [ ] **Step 1: Write the tests.**
  - **`'made every move in those runs …'`** also expects `ACQUIRE`, `AGREE`, `REFUSE_SALE`, `DIVEST`, `BUY`, `PASS_SALE`, `PUBLISH`, `CLEAR` and `INTEGRATE` above 0.
  - **Append `it('played slice 8’s products in those runs: Acquisitions agreed and refused, Market Sales bought, passed and asking several, Fire Sales with and without an asked rival, products sold with Hype, Scandal, Bugs and a Specialist, Offline products bought, Consultants sent back, Hit Pieces published and refused, Scandal cleared at once and by a press, Integrations under each kind of Host, Clients paid and spared their Bugs, stacks dead by Offline and broken by a sale, and Scandal and Hosts scored')`.** It expects every key above, and both sums, above 0.
  - **Append `it('takes back the last move and rebuilds whole games from their logs, through consents, Market Sales, crisis presses and Integrations (Review Focus: 4 players, seeds 1 to 5)')`.**
    - Play each game to its result, keeping the state before each move.
    - A fresh engine given `loadLog(log)` equals the final state, and `engine.undo()` gives the state before the last move.
    - Across the five logs, some log holds an `AGREE`, a `BUY`, a `CLEAR` and an `INTEGRATE` (count them through the watch).
    - For one move in a market sale, `engine.undo()` gives the state before it, its `waitingOf` equal to the stored one.
  - **The view check (Review Focus 5).** 7-2b's check of each move that opens a window also runs for each move that opens an ask: every seat's `seatExtras(…).waiting` has `by` the actor, and its `JSON.stringify` holds no card id and no name of a card in a zone that seat can't see.
  - **Kept as they are:** `'plays the same game through the page’s view as without it'` (now through consents and Market Sales answered by other seats) and every earlier tally.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`.
  - If a required key stays at 0, print the tally and change the auto-player, never the rules. Ways to reach each key:
    - **a refused Acquisition:** refuse at another `t`;
    - **a Market Sale asking several rivals:** divest at 4–5 players when rivals have room;
    - **an Offline product bought:** prefer an Offline target in `acquiring()`;
    - **a Unicorn Host:** prefer a Metaverse or Fusion Reactor target in `integrating()`;
    - **a stack dead by Offline:** switch off one half in the ops check at `t % 5 === 0`;
    - **Scandal cleared at once:** keep the Director's seat's Scandal to one product;
    - **a Hit Piece refused by Immunity:** try the founder's product first.
  - Report a key that stays unreachable, with the tally, and pin its path with an arranged test in the shape of 6-2b Task 5's.
- [ ] **Step 3: Write the README.**
  - **The Startup paragraph** becomes "**Startup Simulator (slice 8, products)**". After plan 7-2b's sentence, add:
    - products are bought by Acquisition with the seller's consent, or sold by Divest to the first rival in turn who can pay and run them, else to the bank at half price, all at the M&A Price;
    - a Hit Piece adds Scandal, −5 points and −$5 each, and a Director of QA clears it before any Bug;
    - a Client stacks under a Host by Tag, for $2 more, no Bug decay and 5 points on the Host while both run.
    - Its rulings list adds 21, 22 and 24 where missing.
  - **"It still leaves out"** drops selling, Hit Piece and Scandal, Integration, and the Director of QA's perk. It keeps poaching (with Immunity, Vest, the CTO, the Headhunter, Corporate Raider, Cease & Desist, Flight Risk's effect, Recruiter Frenzy and Headhunter Holiday) and the HR Manager's perk for plan 8-2b.
  - **Plan 8-1's README paragraph** gains a last bullet, `- **Startup Simulator** plays slice 8's products this way: …`, naming these lines:
    - `A card's sale price goes down by 5 for each scandal.`
    - `A card's fire sale price is 50% of its sale price, rounded down.`
    - `A player's blue room goes down by the total blue maint of the cards in their operations that are not offline.`
    - `They pay its sale price to its owner.`
    - `Its owner has the consent.` and `Each other player has the market sale, in turn from their left.`
    - `Every card on it in the same zone comes off it.` and `Move it to their operations, with everything on it.`
    - `Cards can host cards by their tag:` and `Only if the target card can host the card.`
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
  - run the removal probe once more over every line this plan added or changed.
- [ ] **Step 6: Run the games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
- [ ] **Step 7: Commit**

```bash
git add src/games/startup-simulator.test.ts README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's long runs acquire, divest, fire-sell, smear and stack products at 2 to 5 players, every path tallied and whole games rebuilt from their logs through consents and Market Sales

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Forward notes

- **Plan 8-2b** builds on this plan's names. Its Task 2 adds `For each card on it, it loses its vest.` to `acquire …` and the market sale's `buy …`, right before `      They pay its sale price to its owner.`, and its Task 3 the same for `cto`. Its placing button reads `running`.
- **Plan 8-3 (the page):**
  - the Client tucked under its Host in the operations row (a card on a card beside it);
  - Scandal as a badge, with `for sale` on the offered product;
  - the consent and Market Sale prompts in the asked seat's strip, from `SeatExtras.waiting`;
  - the crisis step's Hint;
  - the integrate button's refusals in words;
  - the browser check of an Acquisition, a Market Sale, a Fire Sale, a Hit Piece and an Integration.
  - `shownFlags` now holds whatever Tasks 3–4 re-pinned (`integrated` and `hosting` read through `the card it is on`, so they are not shown: fail closed).
- **Slice 9:** Settle's cover reads `fire sale price`, a worked number on every product in operations.
- **Slice 10:**
  - Liquidation reuses the Market Sale's ask and the Fire Sale's lines. A bankrupt is asked only with spare cash, one more `Only if` line under the ask.
  - Legacy Status's reset goes before the move in all three sale routes.
  - The Broken Chain's Come Clean is a second ask at a sale, which 8-1 refuses until slice 10's nested interrupts.

## Gaps against plan 8-1

None that needs a new phrase for this half: every line above is written with plans 4-1 to 8-1's phrases. These calls follow from what the language reads:
- **The rooms repeat the supplies' lines.** No phrase sets a player value from another player value (`a player's blue room is their blue supply`), so `Blue room:` and `Red room:` copy `Blue supply:` and `Red supply:` line for line. A later change to a supply must be made in its room too. Task 1's room test fails if they drift on a Consultant; the examples on staff.
- **The buying lines are written twice** (Acquisition after the consent, the Market Sale's buy), since no line runs another button's lines. 8-2b edits both.
- **Crisis Management is a step of its own** (`crisis`) before the Engine. Ordering "Scandal before any Bugs" inside the Engine would need a "Scandal done" guard on each of its ops-QA rules and its clean button, and no player value can say "Scandal left and capacity left" as one number.
- **A buyer's press in the Market Sale has no guard of its own.** The ask's `Only if` lines fixed who may buy when it opened, and only passes run in between.
- **Same-Tag stacking needs no line,** since §10.B's table pairs no Tag with itself. "A card can't go onto itself" is 8-1 Task 4's `ONTO_ITSELF`, pinned there.
