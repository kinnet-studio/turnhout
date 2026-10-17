# Startup Simulator Slice 7-2a (Rules text and long runs: Equity held) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Startup Simulator plays the half of slice 7 in which Equity is held:
- three Equity tokens per player, each naming its Founder, in a public supply;
- Invest at the Share Price ($5 / $10 / $15 by the highest Active Tier), never the last token in a supply, with Venture Capital Rain's +$3;
- Dividends from the bank at each Founder's Income ($0 / $1 / $2 / $3 by Operational Revenue);
- Partners' free License, both ways;
- the Consultant: placed when bought or at a Round Start, in a colour the Investor picks, adding a cube, a Bug removed or Ops bandwidth, kept by a Launch and sent back by a Pivot;
- Portfolio scoring (5 VP per rival token).

The long runs play all of it at 2 to 5 players.

**Architecture:**
- **Slice 7's rules plan is two plans, because it grew past eight tasks (11).** The seam is the one a reviewer sees in the spec's §17 headings:
  - **This is 7-2a, "Equity held"** (§17.A, §17.B.1, B.3, B.4, §17.D, §12 line 4): seven tasks. Every button it adds is an ordinary action or step, and no new interrupt or window phase exists.
  - **7-2b, "Equity moved"** (`docs/superpowers/plans/2026-10-16-startup-slice-7-2b-rules-and-runs-equity-moved.md`; §17.B.5, §17.C): four tasks. It adds the Veto window and the consent and lawsuit phases, which change how the long runs judge a move.
  - Plan 7-3 (the page) follows both.
- This plan writes only the rules text, its examples and the long runs. It adds no phrase and changes no shared code. It runs after plans 4-2, 4-3, 5-1, 5-2a, 5-3 Task 1, 5-2b, 5-3 Tasks 2–4, 6-1, 6-3 Task 1, 6-2a, 6-2b, 6-3 Tasks 2–5 and 7-1, in that order.
- **Seven tasks:**
  1. Equity cards, the supply and the portfolio, Portfolio scoring;
  2. Share Price and Invest, the hard cap, Venture Capital Rain;
  3. Dividends;
  4. Partners and the License waiver;
  5. the Consultant: Invest that places it, its output in Development and in Ops, Launch and Pivot;
  6. Consultants placed and moved at the Round Start;
  7. long runs: every slice-7a path tallied, whole games replayed; the README and the checks.

  Each rules task keeps the existing long runs passing. It adds the auto-player's handling of the buttons it creates and the invariants its rules need. Task 7 adds the tallies.
- **Phases.** No phase is added. Task 6 makes 6-2b's `event check` steps run at every Round Start. Seats with nothing to do pass at once, and Investors stop to place or confirm.
- **Builder calls this plan makes** (the spec leaves wordings and the auto-player to the builder; each is recorded here for the owner):
  - **Names follow 7-1's "Left to 7-2" list:**
    - the supply is `their equity`, the held tokens `their portfolio`, and the token `Equity`;
    - the fact is `founder`;
    - the cards are made by a stack that never runs out, three per player at Setup, after the Juniors.
  - **Share Price reads only Tier 2 and 3** (`tier number` 2 or 3, else none):
    - `top tier` is 0 with only Tier 1 products or none, and the price line for 5 covers both (§17.A "Tier 1 Only, or no Active product");
    - a Tier 1 line could fail no example, so there is none;
    - Active is "in operations and not offline" (§9.A, ruling 5).
  - **Dividends are one Income start line** after Market Share, reading 5-2b's `operational revenue`, which already excludes dividends and cash (§9.A). The bank pays (§9.B).
  - **Two Invest buttons share the verb:** `invest in a card in another player's equity` and `invest in a card from another player's equity to a card in another player's development or another player's operations`. They are told apart by whether the example names a card to go on (4-1's P16 forms). The second is the overview's "placed when bought".
  - **A Consultant's colour is three flags** on the token: `blue consultant`, `red consultant`, `qa consultant`.
    - Each placement button first clears all three, then its choice (`Blue:` / `Red:` / `QA:`) sets one.
    - The flags are read only through "the other players' cards on it", so an unplaced token's old colour does nothing, and every placement picks again (§17.B.4 "made when you place the token").
  - **A Consultant's output is the project's, not the team's** (§17.B.4 "That product gains +1 Output"; suwa's `run_generate` adds it after Crunch Time):
    - Blue and Red go into 6-2b's `blue added` / `red added`;
    - QA goes into 6-2a's `qa made`, after Toxic Personality's line;
    - so Toxic never takes it, Crunch Time's "still needs Blue" doesn't count it, and Pending XP never reads it;
    - all three are 0 on a Stalled project (§17.B.4; suwa's `run_clean` skips Stalled projects for QA too).
  - **In Ops it is bandwidth and Ops QA:**
    - each supply goes up by the products' consultant values, Offline products included (suwa's `ops_bandwidth.rs`);
    - QA joins the pooled `qa supply` (builder check, settled).
  - **The Round Start step** (6-2b's forward note):
    - 6-1 allows one steps line per game, so 6-2b's conditional line becomes `Each player has the event check, in turn from the start player.`, and `Acting once:` goes.
    - Its pass rule gains `Only if their portfolio is empty.`. An Investor places or moves Consultants, then presses `confirm their consultants`, which pays 6-2b's Regulation Audit tax and passes the step on.
    - The phase keeps its name `event check`, so 6-2b's and 6-3's pins stay; its Hint says both jobs.
  - **Partners are 7-1's tie:** `another player tied to them by a card in their portfolio …`.
    - Every Greenlight guard that lets a player's own Tag stand in for the License gains the tie as one more alternative.
    - Every License payment line gains its negation.
    - "Your choice if several do" then means a tied provider is always the free choice (§6 Greenlight, ruling 11).
  - **Immunity (§17.B.2) gets no line here:** no button exists to carry it until slice 8 (see Gaps).
- **Names.**
  - Zones: each player's `equity` (row, public) and `portfolio` (row, public, `…, where some cards are on other players' cards`).
  - Card stack `equity tokens` (`| name |` / `| Equity |`). Fact `founder`. Flags `blue consultant`, `red consultant`, `qa consultant`.
  - Worked numbers: `tier number`, `consultant blue`, `consultant red`, `consultant qa`; refined `blue added`, `red added`, `qa made`.
  - Player values: `top tier`, `share price`, `dividend`; refined `blue supply`, `red supply`, `qa supply`.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-7-equity-design.md` is binding, and its "Builder-check rulings" win over its body:
- R1: a placed Consultant keeps `lang:on` in the Investor's own zone; "the cards on it" are the holder owner's; a rule that takes a product off a Board returns the tokens explicitly.
- R2: a Founder may Veto a Secondary Trade of their own token (7-2b).

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding, with its rule "every number comes from the rulebook, and examples say where" and its anti-goals.

The other inputs:
- plan 7-1 (`docs/superpowers/plans/2026-10-16-startup-slice-7-1-language.md`), whose Interfaces blocks are the phrases this plan writes with, and whose "Left to 7-2" list is this plan's floor (with 7-2b);
- plans 4-2, 5-2a, 5-2b, 6-2a and 6-2b, whose rules text this plan edits, and plans 4-1, 5-1 and 6-1's phrases;
- `builder-check-startup-7.md` in the session scratchpad (Q1 settled as R1, Q2 as R2);
- `suwa/rulebook.md` v6.0 §2, §4, §5 Phase A and B, §6 Greenlight, §8, §9, §12, §17.A, §17.B, §17.D, §20.D 1, Rulings #5, #11, #16, #25;
- where those are silent, suwa's `resolvers/economy_actions.rs` (`invest`, `place_consultant`), `phases/engine.rs` (`run_generate`, `run_clean`) and `ops_bandwidth.rs`.

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
- **State is Json-only, under `lang:*` keys.** This plan adds no key. Flags, counts and the fact `founder` live in the rules text; `lang:on` and `lang:on-seat` are 7-1's.
- **No Startup Simulator words in shared code.**
  - The banned list is plan 7-1's (its Global Constraints): plan 6-1's list plus slice 7's equity, investor, founder, consultant, dividend, veto, partner, immunity, portfolio, buyback, stock.
  - This plan touches no shared code.
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged. Rent Day keeps its 108 examples.
- **Files this plan changes:**
  - `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts` and `README.md`;
  - test-file pins under `src/pages/designer/**` that read the rules text: the Startup example count in `designer-page.test.tsx`; any offered-button list in `playtest-fitted.test.tsx` that gains the Invest or Round Start buttons; any zone list, Board text, fitted-table height or shown-value list in `tableaux.test.ts` or `playtest-fitted.test.tsx` that the two new rows change.
  - Each such pin is pinned as the view now says it and reported. No page source may change, and nothing under `src/engine/**`.
- **Every number comes from the rulebook, and examples say where:** a section or ruling in each title, and each task's "How the numbers come".
  - The numbers are: 3 tokens (§2, §4.4); $5 / $10 / $15 (§8, §17.A); $1 / $2 / $3 at $1 / $11 / $21 (§8, §9.B, §17.B.1); 2 tokens for sale at most (§17.D); 5 VP (§12.4); +$3 (§20.D 1).
- **Anti-goals (spec and overview):**
  - Startup words in shared code;
  - more than 3 Equity tokens of one Founder in play, or a Founder selling their last;
  - a Consultant on its own Investor's product or on a Talent card;
  - a rule approximated without a recorded call;
  - a game that can't end;
  - an auto-player that hides a rule that never fires.
- **Every rules line is pinned.**
  - Each line this plan adds or changes fails some example when it alone is removed. Excepted are `Hint:` lines, table rows and `Cards can …` declarations.
  - Never leave a rulebook line out because no example fails without it: show it is redundant, or reach it with an example.
- **Examples arrange at most 3 Equity tokens naming one player.** The stack never runs out, so an example could make a fourth; none may.
- **Example counts.** N₈ is the count the committed test pins (`results` length) when Task 1 starts: plan 6-2b's N₇ + 19, plus whatever fix waves add.
  - The tasks end at N₈ + 2, + 6, + 10, + 14, + 22 and + 24.
  - Each task updates `results` in `startup-simulator.test.ts`, the Startup test in `designer-page.test.tsx` and the README's "Its N examples".
- **Commands.**
  - Single file: `bunx vitest run src/games/startup-simulator.test.ts`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1: record `BASE=$(git rev-parse HEAD)`; run `bun run test` once for the passing count and the long runs' time; note N₈.
- **Existing tests.** Only the lines each task names change. If any other existing test fails, stop and report it.
- **Long runs.** If an invariant shows a wrong rule, fix the rules text. If a required tally stays at 0, change the auto-player (cadences, targets), never the rules; report a key that stays unreachable and pin its path with an arranged test (6-2b's shape). If a rule can't be written with plans 4-1, 5-1, 6-1 and 7-1's phrases, report it. If the long runs take more than a third longer than at BASE, report the timing.
- **Pre-flight notes carried from plans 4-2 to 6-2b:**
  - take every `shownFlags` / `standIns` / `shownPlayerValues` pin from HEAD and apply only the change named;
  - never write `For each card … that is X` (the lines below use `whose`);
  - read counts as numbers with missing as 0, never with `hasOwn`.
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefix `feat(games):` (`docs:` for a README-only commit).
  - TDD every task: change the test first, watch it fail, then the rules, pass, `bun run typecheck`, commit.
  - Every rules line below is exact copy. Insertion points name a line or section by its text, never by a line number.
  - **Re-read the committed rules file before each task:** the text of plans 4-2, 5-2a, 5-2b, 6-2a and 6-2b is the base, and line numbers have moved. If a named anchor line is missing or worded otherwise, stop and report it.
  - If a line reads two ways (an `ambiguous` diagnostic), stop and report it.

## Review Focus

- **A product that moves or leaves the Board with a Consultant on it.**
  - Expected: a Launch keeps the token on the product in operations, and the Founder's staff go to the ops team without it. A Pivot sends the token back to its holder's portfolio, on no card, and the staff to the bench. No other slice-7a rule moves a product.
  - Tests: Task 5, examples 7–8, and the long-run attachment invariant.
- **A token placed again: bought back into a supply it left placed, or moved at a Round Start.**
  - Expected: exactly one colour, the one just chosen; an old colour never adds output.
  - Tests: Task 5 example 1, Task 6 example 1, and the long-run colour invariant.
- **Share Price and Dividend at their edges.**
  - Expected: no product, or only Tier 1, $5; an Offline Tier 2 product $5 (ruling 5); a Tier 3 $15. Operational Revenue of $0, $6, $12 and $21 pays $0, $1, $2 and $3 per token, and a holder of two tokens is paid twice. A Founder's own dividend income is never Operational Revenue.
  - Tests: Tasks 2–3.
- **A Greenlight whose Tag several players provide, one of them a Partner.**
  - Expected: no License for that Tag, to anyone, in either direction of the tie. A Tier 3 card pays only for the Tag no Partner provides.
  - Tests: Task 4, examples 1–4, and the long-run License invariant.
- **A Round Start with an Investor short of the Regulation Audit tax, and one whose Founders have no product.**
  - Expected: each stops in its step. The first lets staff go until it can confirm (paying the tax); the second can only confirm. Seats with an empty portfolio and the tax in hand pass at once.
  - Tests: Task 6, examples 1–2.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name. If one is missing or differs, stop and report it.

- **Plan 7-1, built (its Interfaces):**
  - `Cards can name a {name}.` and `{int} new {cardclass} cards go to each {perzone}, each naming its owner as its {cardplayer}`; card words `an Equity whose founder is p0`;
  - a button's own card in `another player's …` (`fromZoneIds`, offered seat by seat from the presser's left), with the zone named in an example as `… from p2's equity`;
  - `its owner has at least {int} cards in their {perzone}`, `they have at least its {cardplayer}'s {playervalue} in {counter}`, `they pay its {cardplayer}'s {playervalue} to its owner`, `its owner gets its {cardplayer}'s {playervalue}`, `its {cardplayer} gets {int} {counter}`;
  - `another player tied to them by a card in their {perzone} has a card in their {perzone} whose {cardfilter}` and the `no other player …` form;
  - `the target card's owner is its {cardplayer}`;
  - `a player's {playervalue} is {int}`, `… is {int} if their {playervalue} is at least {int}`, `… is the highest {attribute} of {cardgroup}`, `… goes up by the total {attribute} of {cardgroup}`;
  - the zone line `…, where some cards are on other players' cards`, `othersOn`, the group `the other players' cards on it` with `GROUP_TESTS`, `the other players' cards on it go to their owners' {perzone}`;
  - the example lines `{card} in {zone} is on {card} in {zone}` and `{card} in {zone} is on no card`;
  - `whose {cardplayer} is them` in a For-each's group;
  - the score line `each {cardclass} in a player's {perzone} scores {int} points`.
- **Plan 6-2b, built:**
  - the `When a round starts:` lines, ending `    If some card in the event in play is acting once, each player has the event check, in turn from the start player.`;
  - `Acting once:`;
  - `Phase: event check` with its `Hint:`, start line, two let-go buttons and the pass rule `  When they have at least the total payroll tax of the cards in their development team and their ops team in capital:`;
  - `Payroll tax:`; `Blue added:` (ending `  A crunching blue card's blue added goes up by 1.`) and `Red added:` (ending `  A crunching red card's red added goes up by 1.`); the Engine reading `its blue added` / `its red added`;
  - the Event zones and `the event in play has the …`;
  - in the test file `EVENTS`, `eventOf`, `EVENT_CHECK`, `payrollTaxOf`, its money check for round steps and its `event check` invariant and auto-player.
- **Plan 6-2a, built:**
  - `QA made:` (ending `  A losing qa card's qa made goes down by 1.`);
  - `  A player's blue supply is the total pool blue of the cards in their ops team.` and its red and qa forms;
  - `isPlayable`, `debuffZones` and the Strategy-card conservation invariant in the test file.
- **Plan 5-2b, built:**
  - `Operational revenue:` (`  A player's operational revenue is the total rev of the cards in their operations.`);
  - Income's start lines ending with the Revenue Leader claim;
  - the zones up to `  Each player has a milestones row that everyone can see.` (or whichever per-player row is last).
- **Plan 5-2a, built:** Pivot's block (its lines from `      Every card on it that is egotistic is fired.` to `      Move it to the open idea pool.`); Launch's block; `scoreOf(runtime, state, seat)`.
- **Plan 4-2, built:**
  - the `ops check` and `final check` phases reading the supplies;
  - `Stalled:`;
  - the test file's `enteredIncome`, `ranTheEngine`, `atTheEngine`, `turnsIn(log, skipped)`, `Onto`, `onProduct`, `viewedCards` and the attachment invariant ("every card that sits on a card is in a development team or an ops team, on a card of the same seat's …").
- **Plans 1a–3:** the Greenlight guards and License lines as they read at HEAD (Task 4 quotes them); `GREENLIGHT`, `LAUNCH`, `PIVOT` in the test file.

---

### Task 1: Equity cards, the supply and the portfolio, Portfolio scoring

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `tableaux.test.ts` and `playtest-fitted.test.tsx` only where they pin the per-player rows, the fitted table or the next card id

**Interfaces:**
- Consumes: 7-1 Task 1's declaration and per-player cards; 7-1 Task 5's zone line; 7-1 Task 10's score line.
- Produces (rules): the stack `equity tokens`, the fact `founder`, the zones `equity` and `portfolio`, the Setup line, the score line.
- Produces (test file):

```ts
/** Each player's Equity tokens (§2, §4.4). */
const EQUITY_TOKENS = 3;
/** The seat an Equity token names, or undefined for any other card. */
const founderOf = (card: CardState): PlayerId | undefined;
/** The Equity tokens in `seat`'s portfolio: the stakes it holds in other players (§17). */
const portfolioOf = (state: GameState, seat: PlayerId): CardState[];
```

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₈ + 2; the designer page's count too.
    - `'makes the Juniors after the 141 dealt cards, c141 to c149 at 3 players'` keeps its Juniors. Its `NEXT_CARD_KEY` becomes 159. It also expects `equity-p0` to hold `c150`–`c152`, `equity-p1` `c153`–`c155` and `equity-p2` `c156`–`c158`, each with `data` `{ name: 'Equity', founder: <its seat> }` (7-1: zone by zone in seat order).
    - The setup test (`sets up a table of %i players at every seed`) also expects every seat's equity to hold `EQUITY_TOKENS` cards whose `founder` is that seat, and every portfolio to be empty.
    - `'lays out the table …'`:
      - after the last per-player entry add `['equity', true, 'row', 'public']` and `['portfolio', true, 'row', 'public']`;
      - the marked zones (`[name, onCards, holders]`) gain `portfolio`'s entry as the compiled spec gives it (`onCards: 'some'`), read and pinned.
  - **`scoreOf`** adds 5 for each card in the seat's portfolio (§12.4, ruling 16).
  - **Invariant (the spec's Proof 2 and anti-goal), after every move, for each seat F:**
    - exactly `EQUITY_TOKENS` cards in play name F as `founder`, each in `equity-F` or in `portfolio-S` for some S ≠ F;
    - no card without a `founder` is in an equity or a portfolio;
    - `equity-F` is never empty (§17.D: nobody sells the last; slice 8's Vest and CTO will change this line).
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`. Expected: FAIL (the count, the table, the setup).
- [ ] **Step 3: Change the rules text.**
  - **Cards** (§2, §4.4). Right after the Event table (6-2b's `  A deck called events, starting in the event deck:` and its rows) add:

```text
  A stack called equity tokens that never runs out:
    | name   |
    | Equity |
```

  - After the last `  Cards can …` line add `  Cards can name a founder.`
  - **Table** (§17.A, R1). After the last `  Each player has …` line add:

```text
  Each player has an equity row that everyone can see.
  Each player has a portfolio row that everyone can see, where some cards are on other players' cards.
```

  - **Setup** (§4.4). Right after `  A new Junior QA Tester goes to each bench.` add `  3 new Equity cards go to each equity, each naming its owner as its founder.`
  - **The score** (§12.4, ruling 16). Right after `  Each player scores 2 points for each market share.` add `  Each Equity in a player's portfolio scores 5 points.`
  - **Append these 2 examples.**

```text
Example: each player starts with 3 Equity tokens of their own in their supply, and holds none (section 2, section 4)
  Given the game is set up
  Then p0's equity has an Equity whose founder is p0, an Equity whose founder is p0 and an Equity whose founder is p0
  And p1's equity has an Equity whose founder is p1, an Equity whose founder is p1 and an Equity whose founder is p1
  And p0's portfolio is empty
  And p1's portfolio is empty

Example: each rival's Equity token held scores 5 points, and a player's own tokens score nothing (section 12, ruling 16)
  Given 3 players
  And p1's portfolio has an Equity whose founder is p0 and an Equity whose founder is p2
  And p0's equity has an Equity whose founder is p0
  Then p1 scores 11
  And p0 scores 1
  And p2 scores 1
```

  **How the numbers come** (§2, §4.4, §12.1–4, ruling 16):
  - 3 Equity Tokens per player (§2, §4.4).
  - Each seat's 7 capital scores 1 (§12.2). p1's two rival tokens score 5 each: 1 + 10 = 11 (§12.4). p0's own token in its supply scores 0 (ruling 16).
  - **Lines each example pins:** 1 the Setup line; 2 the score line.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
# and each other designer test file this task re-pinned, by path
git commit -F - <<'EOF'
feat(games): Startup Simulator gives each player 3 Equity tokens naming them, in a supply everyone sees, and scores 5 points for each rival token held

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: Share Price and Invest, the hard cap, Venture Capital Rain

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` only where it pins the actions phase's offered buttons

**Interfaces:**
- Consumes: Task 1; 7-1 Task 2's pick in another player's zone; 7-1 Task 3's payments and `its owner has at least …`; 7-1 Task 4's lookups; 6-2b's `the event in play has the …`.
- Produces (rules):
  - worked `tier number`; player values `top tier`, `share price`;
  - the button `invest in a card in another player's equity`.
- Produces (test file):

```ts
const INVEST = "invest in a card in another player's equity";
/** A seat's Share Price as the rules work it out (§17.A). */
const sharePriceOf = (runtime: LangRuntime, state: GameState, seat: PlayerId): number;
/** Every other seat's equity, seat by seat from `by`'s left: the zones an Invest picks in, in the order 7-1's fromZoneIds offers them. */
const equitiesFrom = (seats: PlayerId[], by: PlayerId): string[];
```

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₈ + 6; the designer page's count too.
    - The values test adds `tier number` (`kind: 'number'`, `refines: false`). `Object.keys(game.playerValues!)` gains `'top tier', 'share price'` right after `'operational revenue'`.
    - `shownPlayerValues(game)` and `shownFlags(game)` are re-read and pinned as the view gives them, and the change reported.
  - **`viewedCards`** takes its pick zone as `string | string[]`. For a list, the button's candidates and the view's cards are those zones' cards in the list's order. `offers` in `playTurn` passes the same list.
  - **Money (`keepsTheRules`).** An `INVEST` press:
    - the mover pays the card's founder's `share price`, read in `before`;
    - the founder gains it, plus 3 when the Event in play in `before` is Venture Capital Rain (§20.D 1);
    - nobody else's capital changes.
  - **Invariant:** an `INVEST` press moves exactly its card, from `equity-F` to the mover's portfolio, and `equity-F` held 2 or more in `before` (§17.D).
  - **The auto-player.** `investing()` goes in the planned list for actions after the first, right before `brainstorming()`.
    - When `(t + a) % 7 === 3`, it invests in the first card offered (`equitiesFrom` order) whose press is allowed and whose founder's `share price` leaves it 2 or more capital.
    - With none, it falls through as every planned move does.
  - **Append `it('works out the Share Price from the highest Active Tier, Offline products left out (§17.A, §9.A, ruling 5)')`.** On `setUp(2, 1)`, with O the second seat and `sharePriceOf` read for O, by O's operations:
    - empty: 5; a Dating App: 5;
    - a Neobank: 10; a Neobank with `offline: true`: 5;
    - a Neobank and a Quantum Computer: 15.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Tier number** (§17.A). Right after the `Payroll tax:` section add:

```text
Tier number:
  A Tier 2 card's tier number is 2.
  A Tier 3 card's tier number is 3.
```

  - **Top tier and Share Price** (§8, §17.A, §9.A, ruling 5). Right after the `Operational revenue:` section add:

```text
Top tier:
  A player's top tier is the highest tier number of the cards in their operations that are not offline.

Share price:
  A player's share price is 5.
  A player's share price is 10 if their top tier is at least 2.
  A player's share price is 15 if their top tier is at least 3.
```

  - **Invest** (§17.A, §17.D, §20.D 1). In `Phase: actions`, right before `  A player may end their actions.` add:

```text
  A player may invest in a card in another player's equity.
    It costs 1 action.
    Only if its owner has at least 2 cards in their equity.
    Only if they have at least its founder's share price in capital.
    Then:
      They pay its founder's share price to its owner.
      If the event in play has the Venture Capital Rain, its founder gets 3 capital.
      Move it to their portfolio.
```

  - **Append these 4 examples.**

```text
Example: Invest pays the Founder their Share Price: $5 with only Tier 1, $10 with an Active Tier 2, $15 with a Tier 3 (section 17, section 8)
  Given 4 players
  And p0 has 30 capital
  And p0 has 4 actions
  And p1's equity has an Equity whose founder is p1 and an Equity whose founder is p1
  And p2's equity has an Equity whose founder is p2 and an Equity whose founder is p2
  And p3's equity has an Equity whose founder is p3 and an Equity whose founder is p3
  And p1's operations has a Dating App
  And p2's operations has a Neobank
  And p3's operations has a Quantum Computer
  Then p1's share price is 5
  And p2's share price is 10
  And p3's share price is 15
  When p0 invests in the Equity whose founder is p1
  And p0 invests in the Equity whose founder is p2
  And p0 invests in the Equity whose founder is p3
  Then it is accepted
  And p0 has 0 capital
  And p0 has 1 action
  And p1 has 12 capital
  And p2 has 17 capital
  And p3 has 22 capital
  And p0's portfolio has an Equity whose founder is p1, an Equity whose founder is p2 and an Equity whose founder is p3
  And p1's equity has an Equity whose founder is p1

Example: an Offline product isn't Active, so a Founder whose only Tier 2 product is Offline sells at $5 (section 9, section 17, ruling 5)
  Given p1's equity has an Equity whose founder is p1 and an Equity whose founder is p1
  And p1's operations has a Neobank
  And the Neobank in p1's operations is offline
  Then p1's share price is 5
  When p0 invests in the Equity whose founder is p1
  Then p0 has 2 capital
  And p1 has 12 capital

Example: a Founder never sells the last token in their supply, and an Investor must pay the full price; a Founder with no product sells at $5 (section 17, ruling 16)
  Given 3 players
  And p0 has 5 capital
  And p1's equity has an Equity whose founder is p1 and an Equity whose founder is p1
  And p2's equity has an Equity whose founder is p2 and an Equity whose founder is p2
  When p0 invests in the Equity whose founder is p1
  Then p0 has 0 capital
  And p1 has 12 capital
  When p0 invests in the Equity whose founder is p1
  Then it is rejected because "its owner has at least 2 cards in their equity"
  When p0 invests in the Equity whose founder is p2
  Then it is rejected because "they have at least its founder's share price in capital"
  And p0 has 2 actions
  And p1's equity has an Equity whose founder is p1

Example: during Venture Capital Rain the bank pays the Founder $3 more on every Invest (section 20)
  Given the event in play has the Venture Capital Rain
  And p1's equity has an Equity whose founder is p1 and an Equity whose founder is p1
  When p0 invests in the Equity whose founder is p1
  Then p0 has 2 capital
  And p1 has 15 capital
```

  **How the numbers come** (§8, §9.A, §17.A, §17.D, §20.C, §20.D 1, ruling 5):
  - **Share Price by the Founder's highest Active product:** $5 for Tier 1 only or none, $10 with a Tier 2, $15 with a Tier 3 (§8, §17.A). The Dating App is Tier 1, the Neobank Tier 2 and the Quantum Computer Tier 3 (§20.C). An Offline product is not Active (§9.A, ruling 5).
  - **Example 1:** 30 − 5 − 10 − 15 = 0. The Founders have 7 + 5 = 12, 7 + 10 = 17 and 7 + 15 = 22. Four actions are arranged, so the third Invest leaves 1 and the turn stays p0's.
  - **Hard cap:** a Founder never sells the last token in their supply, so at most 2 are for sale (§17.D, ruling 16). With 2, one Invest leaves 1, and the next is refused.
  - **Venture Capital Rain:** +$3 from the bank to the Founder on an Invest this round (§20.D 1): 7 + 5 + 3 = 15.
  - **Lines each example pins:** 1 both `Tier number:` lines, `Top tier:`, the three Share Price lines, the pay line and the move; 2 `that are not offline` in Top tier; 3 the hard cap and the capital guard; 4 the Venture Capital Rain line.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Invest buys a rival's Equity token at their Share Price, $5, $10 or $15 by their highest Active Tier, never their last, with Venture Capital Rain's $3 to the Founder

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: Dividends

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: Task 1; 5-2b's `operational revenue`; 7-1 Task 3's `its owner gets its {cardplayer}'s {playervalue}`; 7-1 Task 4's stepped lookup.
- Produces (rules): player value `dividend`; Income's dividend line.
- Produces (test file): `dividendOf(runtime, state, seat): number`.

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₈ + 10; the designer page's count too.
    - `playerValues` gains `'dividend'` right after `'share price'`.
  - **Money (`keepsTheRules`'s `earned`).** For the seat F that reached its Income in the move (`enteredIncome`), every seat S ≠ F also earns `dividendOf(runtime, after, F)` times the number of cards in S's portfolio whose `founder` is F (§9.B: the bank pays).
  - **Append `it('pays a dividend by the Founder’s Operational Revenue: $0, $1 from $1, $2 from $11, $3 from $21 (§9.B, §17.B.1)')`.** Read through `runtime.playerValue` on `setUp(2, 1)`, with O's operations arranged so that `operational revenue` is 0, 1, 10, 11, 20 and 21. The expected `dividend` values are 0, 1, 1, 2, 2 and 3.
    - Use products of §20.C whose rev sums give each total; read the total back before the dividend.
    - This test pins each range's edge; the examples pin each line.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Dividend** (§8, §9.B, §17.B.1). Right after the `Share price:` section add:

```text
Dividend:
  A player's dividend is 1 if their operational revenue is at least 1.
  A player's dividend is 2 if their operational revenue is at least 11.
  A player's dividend is 3 if their operational revenue is at least 21.
```

  - **Income** (§5 Phase B step 3, §9). In `Phase: income`'s `When this phase starts:`, right after `    For each card in their operations whose rev is more than 0, they get 1 market share.`, add:

```text
    For each card in each portfolio whose founder is them, its owner gets its founder's dividend.
```

  - **Append these 4 examples.**

```text
Example: at the Founder's Income the bank pays each of their Equity tokens a dividend: $12 of Operational Revenue pays $2 a token (section 5, section 9, section 17)
  Given 3 players
  And p1's operations has a Search Engine and a Streaming Service
  And p1's ops team has a Junior Software Dev, a Junior Software Dev, a Junior Software Dev and a Junior Software Dev
  And p0's portfolio has an Equity whose founder is p1
  And p2's portfolio has an Equity whose founder is p1
  And the turn passes to the left
  Then it is p1's turn
  And the phase is actions
  And p1 has 19 capital
  And p0 has 9 capital
  And p2 has 9 capital

Example: Operational Revenue counts bonuses and Bug decay, and $6 pays $1 a token (section 9)
  Given p1's operations has a Search Engine
  And the Search Engine in p1's operations has 2 bugs
  And the Search Engine in p1's operations has a Sales Rep on it
  And p1's ops team has a Junior Software Dev and a Junior Software Dev
  And p0's portfolio has an Equity whose founder is p1
  And the turn passes to the left
  Then the phase is actions
  And p1's operational revenue is 6
  And p1 has 13 capital
  And p0 has 8 capital

Example: $21 of Operational Revenue pays $3 a token, and an Investor with two tokens is paid twice (section 9, section 17)
  Given p1's operations has an Immortality Pill and a Search Engine
  And p1's ops team has a Junior Software Dev, a Junior Software Dev, a Junior Software Dev, a Junior Software Dev, a Junior Hardware Eng and a Junior Hardware Eng
  And p0's portfolio has an Equity whose founder is p1 and an Equity whose founder is p1
  And the turn passes to the left
  Then the phase is actions
  And p1 has 28 capital
  And p0 has 13 capital

Example: dividends are not Operational Revenue: a Founder paid a dividend but earning nothing from products pays their own Investors nothing (section 9)
  Given 3 players
  And p2 is the start player
  And it is p2's turn
  And p2's operations has a Search Engine and a Streaming Service
  And p2's ops team has a Junior Software Dev, a Junior Software Dev, a Junior Software Dev and a Junior Software Dev
  And p1's portfolio has an Equity whose founder is p2
  And p0's portfolio has an Equity whose founder is p1
  Then p2 has 19 capital
  And p1 has 9 capital
  When p2 ends their actions
  And p0 ends their actions
  Then it is p1's turn
  And the phase is actions
  And p1 has 9 capital
  And p0 has 7 capital
```

  **How the numbers come** (§5 Phase B, §9.A–C, §17.B.1, §17.D, §20.B, §20.C):
  - **Example 1:** the Search Engine and the Streaming Service earn 6 each, so 7 + 12 = 19. The bandwidth is 4 Blue against maintenance 2 + 2, and the Juniors draw no salary. $11–$20 pays $2 per token from the bank: 7 + 2 = 9 each.
  - **Example 2 (§9.C's scenario):** the Search Engine's 6, plus the Sales Rep's 2, less 2 Bugs, is 6; 7 + 6 = 13. $1–$10 pays $1: 8. The Sales Rep draws no salary (§20.B).
  - **Example 3:** the Immortality Pill earns 15 and the Search Engine 6, so 21 and 7 + 21 = 28. The bandwidth is 4 Blue and 2 Red against maintenance 2 + 2 Blue and 2 Red. $21+ pays $3 per token, two tokens: 7 + 6 = 13 (§17.D, dividends cumulative).
  - **Example 4:**
    - With p2 as start player the round runs p2, p0, p1, so no Round Start comes between.
    - p2's Income runs as the example begins: 7 + 12 = 19, and p1, holding p2's token, gets $2: 9.
    - At p1's Income its Operational Revenue is $0, since dividends are excluded (§9.A). p0, holding p1's token, gets nothing: 7.
  - **Lines each example pins:** 1 the Income line and `2 if … 11`; 2 `1 if … 1`; 3 `3 if … 21`. 4 is a guard of §9.A ("no Ponzi schemes").
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's bank pays each Equity token a dividend of $1, $2 or $3 by its Founder's Operational Revenue at their Income, dividends never counted as revenue

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: Partners and the License waiver

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: Task 1; 7-1 Task 3's tie conditions.
- Produces (rules): the Greenlight guards and License lines read Partners.
- Produces (test file): `tiedTo(state: GameState, a: PlayerId, b: PlayerId): boolean`, true when either seat's portfolio holds a card whose `founder` is the other (§17.B.3).

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₈ + 14; the designer page's count too.
  - **The License check (`keepsTheRules`, Review Focus 4).** A Greenlight now pays a License for each Tag the card requires that neither the mover's operations nor the operations of a seat tied to the mover (in `before`) provide. No tied seat is ever paid.
- [ ] **Step 2: Run** the file. Expected: FAIL (the count).
- [ ] **Step 3: Change the rules text** (§6 Greenlight, §17.B.3, ruling 11). In `A player may greenlight a card in their backlog.`:
  - In the `Only if one of:` block holding `      They have a card in their operations whose tag is the card's requires.` and `      They have at least the license in capital.`, right after the first of those add:

```text
      Another player tied to them by a card in their portfolio has a card in their operations whose tag is the card's requires.
```

  - In the block holding `      They have a card in their operations whose tag is the card's also requires.` and `      They have at least the license in capital.`, right after the first add:

```text
      Another player tied to them by a card in their portfolio has a card in their operations whose tag is the card's also requires.
```

  - In the block ending `      They have at least 2 times the license in capital.`, right before that line add:

```text
      Another player tied to them by a card in their portfolio has a card in their operations whose tag is the card's requires.
      Another player tied to them by a card in their portfolio has a card in their operations whose tag is the card's also requires.
```

  - Under `      They pay the license to another player of their choice who has a card in their operations whose tag is the card's requires.`, after `        Only if they have no card in their operations whose tag is the card's requires.` add:

```text
        Only if no other player tied to them by a card in their portfolio has a card in their operations whose tag is the card's requires.
```

  - Under the `… also requires.` payment line, after `        Only if they have no card in their operations whose tag is the card's also requires.` add:

```text
        Only if no other player tied to them by a card in their portfolio has a card in their operations whose tag is the card's also requires.
```

  - **Append these 4 examples.**

```text
Example: Partners use each other's Tags for free, both ways: the Investor's Greenlight and the Founder's pay no License (section 6, section 17, ruling 11)
  Given the phase is actions
  And p0 has 2 capital
  And p0's portfolio has an Equity whose founder is p1
  And p0's operations has a Mobile Wallet
  And p1's operations has a Dating App
  And p1's ops team has a Junior Software Dev
  And p0's backlog has a Streaming Service
  And p1's backlog has a Neobank
  When p0 greenlights the Streaming Service
  Then it is accepted
  And p0 has 2 capital
  And p1 has 7 capital
  When p0 ends their actions
  Then it is p1's turn
  And p1 has 8 capital
  And p0 has 3 capital
  When p1 greenlights the Neobank
  Then it is accepted
  And p1 has 8 capital
  And p0 has 3 capital
  And p1's development has a Neobank

Example: a Tier 3 card pays a License only for the Tag no Partner provides: a Partner's Tag counts toward the two Licenses' worth of capital (section 6, section 17, ruling 11)
  Given 3 players
  And p0 has 3 capital
  And p0's portfolio has an Equity whose founder is p1
  And p1's operations has a Neobank
  And p2's operations has a Server Farm
  And p0's backlog has a Global Currency
  When p0 greenlights the Global Currency
  Then it is accepted
  And p0 has 0 capital
  And p1 has 7 capital
  And p2 has 10 capital

Example: a Partner providing a Tier 3 card's second Tag is paid nothing, and the provider of its first is paid (section 6, section 17, ruling 11)
  Given 3 players
  And p0 has 3 capital
  And p0's portfolio has an Equity whose founder is p1
  And p1's operations has a Server Farm
  And p2's operations has a Neobank
  And p0's backlog has a Global Currency
  When p0 greenlights the Global Currency
  Then it is accepted
  And p0 has 0 capital
  And p1 has 7 capital
  And p2 has 10 capital

Example: a player who provides one Tag and is Partners with the provider of the other Greenlights a Tier 3 card with no capital to spare (section 6, section 17, ruling 11)
  Given the phase is actions
  And p0 has 2 capital
  And p0's operations has a Server Farm
  And p0's portfolio has an Equity whose founder is p1
  And p1's operations has a Smart Lock
  And p0's backlog has a Planetary Wi-Fi
  When p0 greenlights the Planetary Wi-Fi
  Then it is accepted
  And p0 has 2 capital
  And p1 has 7 capital
```

  **How the numbers come** (§6 Greenlight, §14.B.2, §17.B.3, §20.C, ruling 11):
  - **Partners:** two players are Partners while either holds the other's Equity, and the License for a Tag a Partner owns is $0 (§17.B.3, ruling 11). A $3 License per missing Tag is paid otherwise (§6). Tags: the Streaming Service requires Social (the Dating App's); the Neobank requires Commerce (the Mobile Wallet's); the Global Currency requires Crypto (the Neobank's) and Cloud (the Server Farm's); the Planetary Wi-Fi requires Cloud and IoT (the Smart Lock's) (§20.C).
  - **Example 1:**
    - p0's 2 capital is below one License, yet the Greenlight goes ahead.
    - At p1's Income the Dating App earns 1 (7 + 1 = 8), and p1's $1–$10 Operational Revenue pays p0's token $1 (2 + 1 = 3).
    - p1 Greenlights the Neobank on p0's Commerce and pays nothing, since p0 holds p1's token.
  - **Example 2:** 3 capital covers one License, not two. Crypto is p1's, a Partner's, and Cloud p2's: 3 − 3 = 0, and p2 has 10.
  - **Example 3:** the mirror: Cloud is the Partner's and Crypto p2's.
  - **Example 4:**
    - p0 provides Cloud itself, and its Partner provides IoT: 2 capital, nothing paid.
    - The Planetary Wi-Fi and the Server Farm are Infra, so Domain Expertise asks no cut (§19.A). The Global Currency examples have no product of p0's, so none is asked there either.
  - **Lines each example pins:** 1 the tie in the `requires` capital block and the `requires` payment guard; 2 the `requires` tie in the two-Licenses block; 3 the `also requires` tie in the two-Licenses block and the `also requires` payment guard; 4 the tie in the `also requires` capital block.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Partners, either holding the other's Equity, use each other's Tags for free at a Greenlight, both ways

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: The Consultant: Invest that places it, its output in Development and in Ops, Launch and Pivot

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` and `tableaux.test.ts` only where they pin the offered buttons, the Board text or shown values this changes

**Interfaces:**
- Consumes:
  - Tasks 1–3;
  - 7-1 Tasks 5–6: the cross-seat zone, `othersOn`, the group `the other players' cards on it`, the return line, the example lines;
  - 7-1 Task 2's pick in another player's zone with a target in another player's zone;
  - 5-1's `a card's {attribute} is the number of {cardgroup}` and `a card's {attribute} goes up by its {attribute}`;
  - 7-1 Task 4's `goes up by the total`.
- Produces (rules):
  - flags `blue consultant`, `red consultant`, `qa consultant`;
  - worked `consultant blue`, `consultant red`, `consultant qa`; refined `blue added`, `red added`, `qa made`, `blue supply`, `red supply`, `qa supply`;
  - the button `invest in a card from another player's equity to a card in another player's development or another player's operations`; Pivot's return line.
- Produces (test file):

```ts
const INVEST_PLACING = "invest in a card from another player's equity to a card in another player's development or another player's operations";
/** The three colours a Consultant is placed in, by its choice's option (§17.B.4). */
const CONSULTANT_COLOURS: Record<string, string> = { Blue: 'blue consultant', Red: 'red consultant', QA: 'qa consultant' };
/** Where a placement may go for `by`: every other seat's development and operations, in ontoCandidates' order (re-check 6-2a's debuffZones at HEAD and follow it). */
const foundersBoards = (seats: PlayerId[], by: PlayerId): string[];
```

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₈ + 22; the designer page's count too.
    - The values test adds `consultant blue`, `consultant red` and `consultant qa` (numbers, `refines: false`); `blue added`, `red added`, `qa made` keep their entries.
    - `shownFlags(game)`, `standIns(game)` and `shownPlayerValues(game)` are re-read and pinned, and any change reported. The supplies must stay shown, since the group reads only the public portfolio (7-1 Task 6).
  - **The attachment invariant (4-2's, R1).** "Every card that sits on a card is in a development team or an ops team, on a card of the same seat's …" gains its exception. A card in a portfolio that sits on a card:
    - names a `founder` F;
    - sits on a card in F's development or operations;
    - has `lang:on-seat` F;
    - is never on a card of its own zone's seat (§17.B.4; a Consultant is never on its own Investor's product).
  - **Invariant (Review Focus 2):** every Equity card that sits on a card has exactly one of the three `CONSULTANT_COLOURS` flags `=== true`.
  - **Invariant (Review Focus 1):**
    - an Equity card's `lang:on` changes only in an `INVEST_PLACING` press of it, or in a `PIVOT` of the card it sat on, which leaves it in the same portfolio on no card (Task 6 adds its placement);
    - a `LAUNCH` leaves every Equity card on the launched product.
  - **Money:** an `INVEST_PLACING` press is checked as an `INVEST` (Task 2).
  - **The auto-player.** `investing()` presses `INVEST_PLACING` in place of `INVEST` when `t % 2 === 0` and the founder has a product: the target is the founder's first card in `foundersBoards` order. The colour is the choice's answer as any press's is (`(t + at) % 3`).
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Cards.** After `  Cards can name a founder.` add:

```text
  Cards can be blue consultant.
  Cards can be red consultant.
  Cards can be qa consultant.
```

  - **The product's Consultant values** (§17.B.4, R1). Right after 6-2b's `Red added:` section add:

```text
Consultant blue:
  A card's consultant blue is the number of the other players' cards on it that are blue consultant.
  A stalled card's consultant blue is 0.

Consultant red:
  A card's consultant red is the number of the other players' cards on it that are red consultant.
  A stalled card's consultant red is 0.

Consultant qa:
  A card's consultant qa is the number of the other players' cards on it that are qa consultant.
  A stalled card's consultant qa is 0.
```

  - **Development** (§17.B.4, §5 Phase D steps 1–2).
    - In `Blue added:`, after `  A crunching blue card's blue added goes up by 1.`, add `  A card's blue added goes up by its consultant blue.`
    - In `Red added:`, after `  A crunching red card's red added goes up by 1.`, add `  A card's red added goes up by its consultant red.`
    - In `QA made:`, after `  A losing qa card's qa made goes down by 1.`, add `  A card's qa made goes up by its consultant qa.`
  - **Ops** (§17.B.4, ruling 25).
    - In `Blue supply:`, after `  A player's blue supply is the total pool blue of the cards in their ops team.`, add `  A player's blue supply goes up by the total consultant blue of the cards in their operations.`
    - Likewise in `Red supply:` add `  A player's red supply goes up by the total consultant red of the cards in their operations.`
    - In `QA supply:` add `  A player's qa supply goes up by the total consultant qa of the cards in their operations.`
  - **Invest that places the token** (§17.A, §17.B.4, the overview's call). Right after Task 2's Invest button and its lines add:

```text
  A player may invest in a card from another player's equity to a card in another player's development or another player's operations.
    It costs 1 action.
    Only if the target card's owner is its founder.
    Only if its owner has at least 2 cards in their equity.
    Only if they have at least its founder's share price in capital.
    Then:
      They pay its founder's share price to its owner.
      If the event in play has the Venture Capital Rain, its founder gets 3 capital.
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
```

  - **Pivot** (§17.B.4 "Lost product", R1). In `A player may pivot a card in their development.`, right before its `      Move it to the open idea pool.` add `      The other players' cards on it go to their owners' portfolio.`
  - **Append these 8 examples.**

```text
Example: an Investor may place the token as a Consultant on one of the Founder's products as they buy it, picking its colour afresh, never on another Founder's product (section 17, the overview's call)
  Given 4 players
  And p0 has 15 capital
  And p0 has 4 actions
  And p1's equity has an Equity whose founder is p1 and an Equity whose founder is p1
  And p2's equity has an Equity whose founder is p2 and an Equity whose founder is p2
  And p3's equity has an Equity whose founder is p3 and an Equity whose founder is p3
  And the Equity whose founder is p1 in p1's equity is blue consultant
  And the Equity whose founder is p1 in p1's equity is qa consultant
  And the Equity whose founder is p2 in p2's equity is red consultant
  And p1's development has a Smart Lock
  And p2's development has a Dating App
  And p3's development has a To-Do List
  When p0 invests in the Equity whose founder is p1 to the Dating App, choosing red
  Then it is rejected because "the target card's owner is its founder"
  When p0 invests in the Equity whose founder is p1 to the Smart Lock, choosing red
  And p0 invests in the Equity whose founder is p2 to the Dating App, choosing blue
  And p0 invests in the Equity whose founder is p3 to the To-Do List, choosing qa
  Then it is accepted
  And p0 has 0 capital
  And p1 has 12 capital
  And the Equity whose founder is p1 in p0's portfolio is on the Smart Lock in p1's development
  And the Equity whose founder is p1 in p0's portfolio is red consultant
  And the Equity whose founder is p1 in p0's portfolio is not blue consultant
  And the Equity whose founder is p1 in p0's portfolio is not qa consultant
  And the Equity whose founder is p2 in p0's portfolio is on the Dating App in p2's development
  And the Equity whose founder is p2 in p0's portfolio is blue consultant
  And the Equity whose founder is p2 in p0's portfolio is not red consultant
  And the Equity whose founder is p3 in p0's portfolio is on the To-Do List in p3's development
  And the Equity whose founder is p3 in p0's portfolio is qa consultant

Example: an Invest that places the token pays the same price, keeps the hard cap and earns Venture Capital Rain's $3 (section 17, section 20)
  Given the event in play has the Venture Capital Rain
  And p0 has 4 capital
  And p1's equity has an Equity whose founder is p1 and an Equity whose founder is p1
  And p1's development has a Smart Lock
  When p0 invests in the Equity whose founder is p1 to the Smart Lock, choosing red
  Then it is rejected because "they have at least its founder's share price in capital"
  Given p0 has 10 capital
  When p0 invests in the Equity whose founder is p1 to the Smart Lock, choosing red
  Then p0 has 5 capital
  And p1 has 15 capital
  When p0 invests in the Equity whose founder is p1 to the Smart Lock, choosing blue
  Then it is rejected because "its owner has at least 2 cards in their equity"

Example: a Consultant on a Development project adds 1 cube of its colour at the Engine, or removes 1 Bug, and is no teammate (section 17, ruling 25)
  Given 4 players
  And p0's development has a Dating App and a Smart Lock
  And the Smart Lock in p0's development has 1 bug
  And p1's portfolio has an Equity whose founder is p0
  And p2's portfolio has an Equity whose founder is p0
  And p3's portfolio has an Equity whose founder is p0
  And the Equity whose founder is p0 in p1's portfolio is on the Dating App in p0's development
  And the Equity whose founder is p0 in p1's portfolio is blue consultant
  And the Equity whose founder is p0 in p2's portfolio is on the Smart Lock in p0's development
  And the Equity whose founder is p0 in p2's portfolio is red consultant
  And the Equity whose founder is p0 in p3's portfolio is on the Smart Lock in p0's development
  And the Equity whose founder is p0 in p3's portfolio is qa consultant
  Then the Smart Lock in p0's development has no cards on it
  When p0 ends their actions
  Then the Dating App in p0's development has 1 blue cube
  And the Smart Lock in p0's development has 1 red cube
  And the Smart Lock in p0's development has 0 bugs

Example: a Consultant on a Stalled project adds no cube and removes no Bug (section 17, section 3)
  Given 4 players
  And p0's development has a Neobank and a Server Farm
  And the Neobank in p0's development has 2 bugs
  And p1's portfolio has an Equity whose founder is p0
  And p2's portfolio has an Equity whose founder is p0
  And p3's portfolio has an Equity whose founder is p0
  And the Equity whose founder is p0 in p1's portfolio is on the Neobank in p0's development
  And the Equity whose founder is p0 in p1's portfolio is blue consultant
  And the Equity whose founder is p0 in p3's portfolio is on the Neobank in p0's development
  And the Equity whose founder is p0 in p3's portfolio is qa consultant
  And the Equity whose founder is p0 in p2's portfolio is on the Server Farm in p0's development
  And the Equity whose founder is p0 in p2's portfolio is red consultant
  When p0 ends their actions
  Then the Neobank in p0's development is stalled
  And the Neobank in p0's development has 0 blue cubes
  And the Neobank in p0's development has 2 bugs
  And the Server Farm in p0's development has 0 red cubes

Example: a Consultant on a Maintenance product adds 1 Ops bandwidth of its colour at the Founder's Income, or removes 1 Bug in Ops QA (section 17, ruling 25)
  Given 4 players
  And p1's operations has a Smart Lock and a Dating App
  And the Dating App in p1's operations has 1 bug
  And p0's portfolio has an Equity whose founder is p1
  And p2's portfolio has an Equity whose founder is p1
  And p3's portfolio has an Equity whose founder is p1
  And the Equity whose founder is p1 in p0's portfolio is on the Smart Lock in p1's operations
  And the Equity whose founder is p1 in p0's portfolio is red consultant
  And the Equity whose founder is p1 in p2's portfolio is on the Dating App in p1's operations
  And the Equity whose founder is p1 in p2's portfolio is blue consultant
  And the Equity whose founder is p1 in p3's portfolio is on the Dating App in p1's operations
  And the Equity whose founder is p1 in p3's portfolio is qa consultant
  And the turn passes to the left
  Then it is p1's turn
  And the phase is actions
  And p1's blue supply is 1
  And p1's red supply is 1
  And p1's qa supply is 1
  And p1 has 9 capital
  And p0 has 8 capital
  When p1 ends their actions
  Then the Dating App in p1's operations has 0 bugs

Example: two Consultants on one product give it +2 (section 17, ruling 25)
  Given 3 players
  And p1's operations has a Smart Grid
  And p0's portfolio has an Equity whose founder is p1
  And p2's portfolio has an Equity whose founder is p1
  And the Equity whose founder is p1 in p0's portfolio is on the Smart Grid in p1's operations
  And the Equity whose founder is p1 in p0's portfolio is red consultant
  And the Equity whose founder is p1 in p2's portfolio is on the Smart Grid in p1's operations
  And the Equity whose founder is p1 in p2's portfolio is red consultant
  And the turn passes to the left
  Then the phase is actions
  And p1's red supply is 2
  And p1 has 14 capital
  And p0 has 8 capital
  And p2 has 8 capital

Example: a Launch moves the Founder's staff to the ops team and leaves the Investor's Consultant on the product (section 6, section 17, the slice's R1)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has 6 blue cubes
  And the Dating App in p0's development has a Junior Software Dev on it
  And p1's portfolio has an Equity whose founder is p0
  And the Equity whose founder is p0 in p1's portfolio is on the Dating App in p0's development
  And the Equity whose founder is p0 in p1's portfolio is blue consultant
  When p0 launches the Dating App
  Then p0's operations has a Dating App
  And p0's ops team has a Junior Software Dev
  And the Equity whose founder is p0 in p1's portfolio is on the Dating App in p0's operations
  And p0's blue supply is 2

Example: a Pivot sends the Founder's staff to the bench and the Investor's Consultant back to them, unplaced (section 6, section 17, the slice's R1)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has a Junior Software Dev on it
  And p1's portfolio has an Equity whose founder is p0
  And the Equity whose founder is p0 in p1's portfolio is on the Dating App in p0's development
  And the Equity whose founder is p0 in p1's portfolio is blue consultant
  When p0 pivots the Dating App
  Then the open idea pool has a Dating App
  And p0's bench has a Junior Software Dev
  And p1's portfolio has an Equity whose founder is p0
  And the Equity whose founder is p0 in p1's portfolio is on no card
```

  **How the numbers come** (§3, §5 Phase B and D, §6 Launch and Pivot, §8, §17.A, §17.B.4, §17.D, §20.C, §20.D 1, ruling 25):
  - **Placement:** the token goes on one of the Founder's product cards, Development or Maintenance, never a Talent, in Blue, Red or QA, chosen as it is placed (§17.B.4). The overview places it, optionally, as it is bought. Each Founder sells at $5 here (no Active product): 15 − 15 = 0; 7 + 5 = 12.
  - **Example 2:** 4 capital is below $5. Then 10 − 5 = 5, and 7 + 5 + 3 = 15 under Venture Capital Rain (§20.D 1). With one token left, the hard cap refuses (§17.D).
  - **Development:** +1 cube of its colour at the Engine, or +1 Bug removed for QA (§17.B.4).
    - The Dating App and the Smart Lock are Tier 1, so neither Stalls.
    - The Smart Lock "has no cards on it": the Founder's own staff only (R1).
  - **Stalled:** the Neobank (Tier 2 Software) and the Server Farm (Tier 2 Hardware) have no lead, so 0 output, QA included (§3; suwa's `run_clean`).
  - **Ops:** +1 Ops bandwidth of its colour at the Founder's Income, or +1 Bug removed by Ops QA (§17.B.4, ruling 25).
    - Example 5: the Smart Lock needs 0/1 and the Dating App 1/0, so the products fit with no staff. Income: Smart Lock 2, plus the Dating App's 1 less its Bug, 0: 7 + 2 = 9.
    - The $2 of Operational Revenue pays each of the three tokens $1 (§9.B): p0 8.
    - Ops QA 1 meets the one Bug at the Engine.
  - **Two tokens:** +2 Output (§17.D). The Smart Grid needs 2 Red and earns 7: 7 + 7 = 14; $7 pays $1 a token.
  - **Launch** moves the product and its staff to Ops (§6); the token stays on the product (R1). The Junior's Blue 1 and the Consultant's 1 make 2.
  - **Pivot:** the product leaves the Founder's board, so the token returns to the Investor (§17.B.4); the staff go to the Bench (§6).
  - **Lines each example pins:**
    - 1: the target guard, the placement line, the three clearing lines (the stale `blue consultant` and `qa consultant` on p1's token, `red consultant` on p2's) and the three options;
    - 2: the capital guard, the Venture Capital Rain line, the pay line and the hard cap of the placing Invest;
    - 3: the three Consultant counts and the three added and made lines;
    - 4: the three Stalled lines;
    - 5: the three supply lines;
    - 7: the Launch guard (no line: R1's reading, kept as a guard);
    - 8: the Pivot's return line.
    - 6 is a guard of §17.D's stacking.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Investors may place a bought Equity token on one of the Founder's products as a Consultant, adding a cube, a Bug removed or Ops bandwidth in the colour they pick, kept by a Launch and sent back by a Pivot

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 6: Consultants placed and moved at the Round Start

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` and the 6-3 page tests only where they pin the `event check` buttons, its Hint or whether a Round Start stops

**Interfaces:**
- Consumes: Task 5's colours and `foundersBoards`; 6-1's steps line; 6-2b's `event check`.
- Produces (rules): the unconditional steps line; the buttons `place a card from their portfolio to a card in another player's development or another player's operations` and `confirm their consultants`; the pass rule's guard. `Acting once:` is removed.
- Produces (test file): `PLACE`, `CONFIRM_CONSULTANTS` (those move types).

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₈ + 24; the designer page's count too.
    - The values test drops `acting once`.
    - The setup test still expects the first round's steps to pass at once: every portfolio is empty and no tax is due.
  - **6-2b's `event check` invariant** becomes: the phase is `event check` only while `roundStepsOf(state)` names it, and the current seat either holds a card in its portfolio or has less capital than `payrollTaxOf(runtime, state, seat)`.
  - **Money.** A `PLACE` press changes no capital. A `CONFIRM_CONSULTANTS` press is inside 6-2b's "checked as a whole" round-step moves: it pays the presser's payroll tax.
  - **The Task 5 invariant on `lang:on`** gains: … or in a `PLACE` press of it.
  - **The auto-player in `event check`,** after 6-2b's let-gos have made the tax payable:
    - when the seat's portfolio is not empty and `t % 3 === 1`, it places its first token on no card, else its first token, on the founder's first card (`foundersBoards` order) the token is not on, the colour answered as any choice is;
    - then it presses `CONFIRM_CONSULTANTS`.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **The steps line** (§5 Phase A, §17.B.4, ruling 13). In `  When a round starts:`, `    If some card in the event in play is acting once, each player has the event check, in turn from the start player.` becomes `    Each player has the event check, in turn from the start player.`
  - **Remove** the `Acting once:` section (its header and its four lines).
  - **The event check.**
    - Its `  Hint:` line becomes: `  Hint: Move each Consultant you hold to another of its Founder's products if you like, picking its colour again, then confirm. Under a Regulation Audit, pay $1 for each employee on your Board who draws a salary, letting staff go as you choose until you can.`
    - Right after its two let-go buttons (before `  When they have at least the total payroll tax …:`) add:

```text
  A player may place a card from their portfolio to a card in another player's development or another player's operations.
    Only if the target card's owner is its founder.
    Only if it is not on the target card.
    Then:
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
  A player may confirm their consultants.
    Only if they have at least the total payroll tax of the cards in their development team and their ops team in capital.
    Then:
      They pay the total payroll tax of the cards in their development team and their ops team.
      The event check passes to the left.
```

    - Right after `  When they have at least the total payroll tax of the cards in their development team and their ops team in capital:` add `    Only if their portfolio is empty.`
  - **Append these 2 examples.**

```text
Example: at each Round Start an Investor may move a Consultant to another of the Founder's products, or place one held unplaced, picking its colour again; players holding none pass at once (section 5, section 17, ruling 25)
  Given 3 players
  And it is p2's turn
  And p0's development has a Smart Lock and a Dating App
  And p2's development has a Server Farm and a To-Do List
  And p1's portfolio has an Equity whose founder is p0 and an Equity whose founder is p2
  And p2's portfolio has an Equity whose founder is p0
  And the Equity whose founder is p0 in p1's portfolio is on the Smart Lock in p0's development
  And the Equity whose founder is p0 in p1's portfolio is red consultant
  And the Equity whose founder is p2 in p1's portfolio is on the Server Farm in p2's development
  And the Equity whose founder is p2 in p1's portfolio is blue consultant
  And the Equity whose founder is p0 in p2's portfolio is qa consultant
  When p2 ends their actions
  Then the phase is event check
  And it is p1's turn
  When p1 places the Equity whose founder is p0 to the To-Do List, choosing qa
  Then it is rejected because "the target card's owner is its founder"
  When p1 places the Equity whose founder is p0 to the Smart Lock, choosing qa
  Then it is rejected because "it is not on the target card"
  When p1 places the Equity whose founder is p0 to the Dating App, choosing qa
  And p1 places the Equity whose founder is p2 to the To-Do List, choosing red
  And p1 confirms their consultants
  Then it is p2's turn
  And the phase is event check
  When p2 places the Equity whose founder is p0 to the Smart Lock, choosing blue
  And p2 confirms their consultants
  Then it is p0's turn
  And the phase is actions
  And the Equity whose founder is p0 in p1's portfolio is on the Dating App in p0's development
  And the Equity whose founder is p0 in p1's portfolio is qa consultant
  And the Equity whose founder is p0 in p1's portfolio is not red consultant
  And the Equity whose founder is p2 in p1's portfolio is on the To-Do List in p2's development
  And the Equity whose founder is p2 in p1's portfolio is red consultant
  And the Equity whose founder is p2 in p1's portfolio is not blue consultant
  And the Equity whose founder is p0 in p2's portfolio is on the Smart Lock in p0's development
  And the Equity whose founder is p0 in p2's portfolio is blue consultant
  And the Equity whose founder is p0 in p2's portfolio is not qa consultant

Example: an Investor's Round Start step also pays a Regulation Audit, letting staff go until they can (section 5, section 17, section 20)
  Given it is p1's turn
  And the phase is actions
  And the event deck has the Regulation Audit
  And p1 has 1 capital
  And p1's development has a Dating App
  And the Dating App in p1's development has the Architect and the Veteran on it
  And p1's portfolio has an Equity whose founder is p0
  When p1 ends their actions
  Then the event in play has the Regulation Audit
  And the phase is event check
  And it is p1's turn
  When p1 confirms their consultants
  Then it is rejected because "they have at least the total payroll tax of the cards in their development team and their ops team in capital"
  When p1 lets go of the Veteran
  And p1 confirms their consultants
  Then it is p0's turn
  And p1 has 0 capital
  And the open job market has the Veteran
```

  **How the numbers come** (§5 Phase A, §17.B.4, §20.D 6, ruling 13, ruling 25):
  - **Mobility:** at each Round Start an Investor may move the token to a different card on the Founder's board, picking its colour again (§17.B.4; the spec's call). An unplaced token may be placed then too (the overview's call). The steps run from the Start Player, p0, who holds nothing and passes.
  - **Example 2:**
    - The Regulation Audit taxes $1 per Board employee with a salary: the Architect and the Veteran, $2, against p1's $1 (§20.D 6).
    - After the Veteran is let go, the $1 is paid: 0.
    - p0's step passes at once: no portfolio, and its tax is 0.
  - **Lines each example pins:**
    - 1: the steps line, both place guards, the placement, the three clearing lines (p0's token in p1's portfolio was red, p2's token blue, the token in p2's portfolio a stale QA), the three options, the pass rule's `Only if their portfolio is empty.` (p0 passes at once, p1 stops) and the confirm button's pass;
    - 2: the confirm button's tax guard and pay line.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe. 6-1's checks give no diagnostic: the step phase passes on, has no go-to and no After line, and is reached.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Investors place or move their Consultants at each Round Start, picking the colour again, in the Round Start step every player now takes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 7: Long runs: every slice-7a path tallied, whole games replayed; the README and the checks

**Files:**
- Modify: `src/games/startup-simulator.test.ts`, `README.md`

**Interfaces:**
- Consumes: every constant and policy above and in plans 4-2 to 6-2b; `enteredIncome`, `ranTheEngine`, `atTheEngine`, `sharePriceOf`, `dividendOf`, `tiedTo`, `founderOf`, `portfolioOf`.
- **`happenings` gains these keys** (read through the runtime):
  - `an Invest at $5`, `… $10`, `… $15`, for an `INVEST` or `INVEST_PLACING` press, by the founder's `share price` in `before`; `an Invest during Venture Capital Rain`;
  - `a dividend of $1`, `$2`, `$3`, once for each token paid at the Income `enteredIncome` names, by the founder's `dividend` in `after`;
  - `a License waived between Partners`, for a `GREENLIGHT` with a required Tag the mover's operations lacked in `before` that a seat tied to the mover provided;
  - `a Consultant placed: Blue`, `… Red`, `… QA`, for an `INVEST_PLACING` or `PLACE` press, by the flag its card has in `after`;
  - `a Consultant's cube at the Engine`, in a move that ran the Engine for the mover, for each of its projects not `stalled` (read in `atTheEngine`) whose `consultant blue` or `consultant red` was above 0;
  - `a Consultant's Bug at the Engine`, likewise for `consultant qa` above 0 on a project that had `bugs` in `before`;
  - `a Consultant on a Stalled project at the Engine`, for a `stalled` project with a card in `othersOn`;
  - `a Consultant's bandwidth at an Income`, for the seat `enteredIncome` names when the total `consultant blue` and `consultant red` of its operations is above 0;
  - `a Consultant's Bug in Ops QA`, in a move that ran the Engine for a seat whose operations' total `consultant qa` and `bug load` were both above 0 in `before`;
  - `a Consultant kept by a Launch` and `a Consultant sent back by a Pivot`, for a `LAUNCH` or `PIVOT` of a card with a card in `othersOn(before, …)`;
  - `a Consultant placed at a Round Start` and `a Consultant moved at a Round Start`, for a `PLACE` of a card that was on no card / on a card in `before`;
  - `two Consultants on one product`, for a move after which some card has two or more cards in `othersOn`;
  - `the hard cap refused an Invest`, from the `refused` callback when its reason is `its owner has at least 2 cards in their equity`.

- [ ] **Step 1: Write the tests.**
  - **`'made every move in those runs …'`** also expects `INVEST`, `INVEST_PLACING`, `PLACE` and `CONFIRM_CONSULTANTS` above 0.
  - **Append `it('played slice 7’s held Equity in those runs: Invests at every price and during Venture Capital Rain, the hard cap, dividends of $1, $2 and $3, a License waived between Partners, Consultants placed in each colour and at work in Development, on a Stalled project, in Ops bandwidth and Ops QA, kept by a Launch, sent back by a Pivot, stacked, and placed and moved at a Round Start, and rival tokens scored')`.**
    - It expects every key above to be above 0.
    - It also expects the portfolio cards held at the runs' results, summed like `marketShare`, to be above 0.
  - **Append `it('takes back the last move and rebuilds whole games from their logs, through Invests, placements, dividends and Round Start steps (Review Focus: 4 players, seeds 1 to 5)')`.**
    - Play each game to its result, keeping the state before each move.
    - A fresh engine given `loadLog(log)` equals the final state, and `engine.undo()` gives the state before the last move.
    - Across the five logs, some log holds an `INVEST_PLACING`, a `PLACE` and a Pivot of a product with a Consultant (count them through the watch).
  - **Kept as they are:** `'plays the same game through the page’s view as without it'` (now through picks in other players' equities and targets on their products) and every earlier tally.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`.
  - If a required key stays at 0, print the tally and change the auto-player, never the rules:
    - invest in the Founder whose Share Price is highest among those it can pay, for $10 and $15;
    - prefer a Founder whose operations provide a Tag its backlog needs, for the License waiver;
    - place on a Stalled project or a product with Bugs first;
    - pivot a project with a Consultant on it;
    - recruit QA staff less often when a Consultant QA is placed.
  - Report a key that stays unreachable, with the tally, and pin its path with an arranged test in the shape of 6-2b Task 5's.
- [ ] **Step 3: Write the README.**
  - **The Startup paragraph** becomes "**Startup Simulator (slice 7, Equity held)**". After plan 6-2b's sentence, add:
    - each player has 3 Equity tokens in a supply everyone sees;
    - Invest buys a rival's token at their Share Price ($5 / $10 / $15 by the highest Active Tier), never their last, with Venture Capital Rain's $3;
    - the bank pays $1–$3 a token at the Founder's Income;
    - Partners use each other's Tags for free;
    - a token may sit on one of the Founder's products as a Consultant, placed when bought or at a Round Start, adding a cube, a Bug removed or Ops bandwidth;
    - each rival token held scores 5.
    - Its rulings list adds 11 and 16.
  - **"It still leaves out"** becomes: the Veto, Buyback, Secondary Trade and the Non-Compete Suit (plan 7-2b); selling and poaching, with Immunity, Vest, the CTO, the Headhunter, Corporate Raider, Cease & Desist, Flight Risk's effect, Recruiter Frenzy and Headhunter Holiday; Hit Piece and Scandal; Integration; Stealth and audits, with Partners' Secured Access, Whistleblower Protection Act and Patent Trolls' other fees; Bankruptcy and the Broken Chain; and the HR Manager's and the Director of QA's perks. Each comes in a later slice.
  - **Plan 6-2b's bullet** in plan 6-1's README paragraph quotes `If some card in the event in play is acting once, …`; it now quotes `Each player has the event check, in turn from the start player.`
  - **Plan 7-1's README paragraph** gains a last bullet, `- **Startup Simulator** plays slice 7 this way: …`, naming these lines:
    - `3 new Equity cards go to each equity, each naming its owner as its founder.`
    - `Each player has a portfolio row that everyone can see, where some cards are on other players' cards.`
    - `A player's share price is 10 if their top tier is at least 2.`
    - `For each card in each portfolio whose founder is them, its owner gets its founder's dividend.`
    - `Another player tied to them by a card in their portfolio has a card in their operations whose tag is the card's requires.`
    - `A card's consultant blue is the number of the other players' cards on it that are blue consultant.`
    - `The other players' cards on it go to their owners' portfolio.`
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
feat(games): Startup Simulator's long runs invest at every price, pay every dividend tier, waive Licenses between Partners and place, work, carry, return and move Consultants at 2 to 5 players, every path tallied and whole games rebuilt from their logs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Forward notes

- **Plan 7-2b** builds on this plan's names: `founderOf`, `portfolioOf`, `sharePriceOf`, `CONSULTANT_COLOURS`, `foundersBoards`, the Invest buttons and the conservation invariant.
  - Its Veto window opens for each of this plan's action buttons (both Invests included).
  - Its take-and-place button repeats Task 5's clearing lines and options.
- **Plan 7-3 (the page)** shows:
  - each tableau's `equity` and `portfolio` with founders, and Consultants with their colours (R1's page bullet);
  - the `event check` step's place and confirm buttons, and the seat switcher following it.
- **Slice 8:**
  - **Immunity:** `Only if they have no card in their portfolio whose founder is the target card's owner.` on the Headhunter and Hit Piece buttons (7-1's forward note).
  - **Product sales** return Consultants with `The other players' cards on it go to their owners' portfolio.`, after breaking an Integration stack (slice 8 R2).
  - **Vest and the CTO** may take the last token in a supply, so Task 1's "`equity-F` is never empty" invariant changes then.
- **Slice 9:** Partners' Secured Access reads the same tie as Task 4.
- **Slice 10:** Bankruptcy's seizure moves every portfolio card to `its founder's equity`, unpaid. Liquidation returns Consultants with the Pivot's line.

## Gaps against plan 7-1

None that needs a new phrase for this half: every line above is written with plans 4-1, 5-1, 6-1 and 7-1's phrases. These calls follow from what the language reads:
- **Immunity (§17.B.2) has no line.** No Headhunter or Hit Piece button exists to carry the condition until slice 8. A worked flag can't read "them", and a line nothing reads would fail the removal probe. It is recorded in the forward notes.
- **A Consultant's colour is three flags,** cleared and set again by each placement button (two here, a third in 7-2b). No line clears a card's flags as it leaves a card, so an unplaced token keeps its old colour. That colour is inert, since only "the other players' cards on it" are read.
- **One steps line per game (6-1).** 6-2b's conditional line becomes unconditional, and `Acting once:` goes. An Investor stops at every Round Start to confirm, even when its Founders have no product: no test of a token reads the products of the player it names (5-1's `its owner has …` reads the owner).
- **The `equity tokens` stack never runs out,** so an example could make a fourth token of a player. Only the long-run invariant and the Global Constraint hold the count at 3.
- **The phase keeps the name `event check`** while it also places Consultants, so 6-2b's and 6-3's pins stay; its Hint names both jobs.
