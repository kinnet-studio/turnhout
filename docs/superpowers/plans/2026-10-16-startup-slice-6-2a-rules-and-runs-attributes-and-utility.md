# Startup Simulator Slice 6-2a (Rules text and long runs: Attributes and Utility cards) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Startup Simulator plays slice 6's Strategy cards: the six Attributes go on a Talent as counts, their cards parked in a public pile, ride with it through the Bench and the Job Market and leave when it is fired or evicted; Workaholic, Clean Coder, Visionary, Toxic Personality and Burnout change output, salary, Bugs, leads and Synergy; TechCrunch Feature adds Hype for the lower of two prices; Design Sprint deals 5 Seed cards; Hype scores. The long runs play all of it at 2 to 5 players.

**Architecture:**
- **Slice 6's rules plan is two plans, because it grew past eight tasks.** This is **6-2a, Attributes and Utility cards** (six tasks). **6-2b, Events** (`docs/superpowers/plans/2026-10-16-startup-slice-6-2b-rules-and-runs-events.md`, six tasks) comes next. Plan 6-3 (the page) follows both. The seam: 6-2a writes everything a Strategy card does; 6-2b writes the Event deck and everything an Event does, on top of 6-2a's values.
- This plan writes only the rules text, its examples and the long runs. It adds no phrase and changes no shared code. Plans 4-2, 4-3, 5-1, 5-2a, 5-3 Task 1, 5-2b, 5-3 Tasks 2–4 and 6-1 are built first, in that order.
- **Six tasks:**
  1. Attribute cards played: Buffs on the player's own staff, Debuffs on a rival's Board staff, the attributes in play (R2);
  2. Attributes ride with their Talent and leave when it is fired or evicted (R2, §15.A.3, §15.C);
  3. Workaholic, Clean Coder and Visionary;
  4. Toxic Personality and Burnout (R1, R3);
  5. TechCrunch Feature with Hype, and Design Sprint;
  6. long runs: every Attribute and Utility path tallied, whole games replayed; the README and the checks.

  Each rules task keeps the existing long runs passing, adds the auto-player's handling of the buttons it creates and the invariants its rules need. Task 6 adds the tallies.
- **Phases.** No phase is added.
- **Builder calls this plan makes** (the spec leaves wordings and the auto-player to the builder; each is recorded here for the owner):
  - **Buffs join 5-2b's one Strategy button** (`play a card from their strategy hand to a card in their bench, their development team or their ops team`) as three more options with guards, since a second button with the same words and target zones could not be told apart by an example (4-1's P16; 6-1's "Left to 6-2"). **Debuffs get a button of their own** whose target is `a card in another player's development team or another player's ops team` (6-1's Task 1). A Debuff aimed at the player's own staff therefore presses the Buff button and is refused by its guard. A rival's bench is no target of any button, so a press naming a card there finds no button; a test of `ontoCandidates` pins that, not an example (see the Gaps).
  - **Flight Risk is playable now**: it goes on a rival's staff as a count and does nothing until slice 8 reads it for the poach multiplier (the spec lists it among the Attributes, its effect arriving in slice 8). **Cease & Desist stays refused** by every button (spec call: it moves to slice 8).
  - **The counts are named after their cards** (`workaholic`, `clean coder`, `visionary`, `toxic personality`, `burnout`, `flight risk`, as R2's "1 workaholic"); each is 0 or 1, since §20.A prints one copy of each and its card stays parked while the count is on a Talent.
  - **Firing strips the counts in 5-2a's `When a card in the open job market is fired:` rule**, moving the parked card named by each count to the strategy discard. **The Diva's Pivot now marks her fired** (`Every card on it that is egotistic is fired.`): 5-2a left R4's Diva line out because a Senior then held no token, but a Senior may hold Attributes (§11.F), so the line is reachable and an example pins it.
  - **Eviction strips the counts in a `When a card in the box is holding attributes:` rule** and sends the parked cards to the box (R2: eviction is not firing).
  - **Workaholic's +2 goes in each output before the mode lines that zero it**, so it lands only in the colour the unit works in; a card with no output in a colour stays with none (6-1's "nothing so far stays nothing"), which gives PMs, Sales Reps, HR Managers and the Growth Hacker only the salary. A QA Engineer or a QA-mode unit gets +2 Bugs removed (§20.A "+2 Output in its current mode"; suwa's `talent_output.rs` adds the 2 after the Bug Hunter's output).
  - **Clean Code is a worked flag `clean coding`** (the Architect's trait or a Clean Coder count, while not onboarding). A pooled clean-coding card shields every product from the Growth Hacker, an attached one only the product it sits on (§20.B Clean Code; suwa's `run_end_of_turn_traits`). The Hacker's own join Bug reads his Clean Coder count with no onboarding test (§20.B: "unless he has Clean Code himself").
  - **Visionary makes any unit a lead in both colours, PMs included** (§11.G.1 "Any unit with the Visionary Attribute"; suwa's `lead_coverage` has no exception). §11.E's "PMs … cannot fulfill the Lead Requirement" is about the Gold Badge; this call is on the owner's list.
  - **Burnout is the last line of each output** (R3), and a burned-out PM gives no Synergy through a new flag `giving synergy` that `PM count:` counts. `Managing:` keeps the burned-out PM, so it still gives Brainstorm its third card and stays Agile: Burnout's text names only Output and Synergy, and suwa's `has_working_pm` ignores it.
  - **Toxic Personality (R1) in a Development team** splits each team value into the raw one (5-2a's `blue team output`, with Synergy) and a final `blue made` / `red made` / `qa made`, which the Engine reads. The cube comes off the first colour the raw team makes (Blue, then Red, then QA), only while the Toxic card is not onboarding, even when it makes nothing itself. **Pending XP keeps reading the raw team output**: the Juniors did the work, and the cube is the team's loss (R1 "one cube off the team's total").
  - **Toxic in the ops pool** takes the cube off a value on the Toxic card itself (6-1's Architecture): `pool blue`, `pool red`, `pool qa` start at 0 so that a Toxic card that makes nothing still carries the −1, and the three supplies become totals of them. Every card of the ops team counts as the pool, an attached Sales Rep or Growth Hacker included (§3: attached staff are still Ops Zone staff; only their revenue bonus is tied to a product).
  - **TechCrunch Feature's Sales Rep price** is a `Price:` value a product has only while a working Sales Rep sits on it (`pitched`), so `They pay the lower of the card's price and the target card's price.` pays $5, or $2 with the Rep (6-1's Task 3). An onboarding Rep gives no discount (§6 Reassign, ruling 8; suwa's `pr_target_has_sales_rep`). TechCrunch may target an Offline product: it is still a Maintenance product (§20.A; suwa's `pr_campaign`).
  - **Design Sprint has no pay line**: its printed price is $0 and no Event changes it, so a pay line could fail no example.
- **Names.**
  - Zone: `attributes in play` (a pile in the center that everyone can see).
  - Counts on cards: `workaholic`, `clean coder`, `visionary`, `toxic personality`, `burnout`, `flight risk`, `hype`.
  - Worked flags: `egotistic`, `holding attributes`, `overworked`, `clean coding`, `guarding the pool`, `burned out`, `giving synergy`, `poisoning`, `losing blue`, `losing red`, `losing qa`, `pool losing blue`, `pool losing red`, `pool losing qa`, `pitching`, `pitched`.
  - Worked numbers: new `blue made`, `red made`, `qa made`, `pool blue`, `pool red`, `pool qa`; refined `price` (a `Price:` section on the Strategy table's column), `salary`, `blue output`, `red output`, `qa output`, `portfolio points`.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-6-attributes-utility-events-design.md` is binding; its "Builder-check rulings" R1–R3 win over its body. It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding, with its rule "every number comes from the rulebook, and examples say where" and its anti-goals. The other inputs:
- plan 6-1 (`docs/superpowers/plans/2026-10-16-startup-slice-6-1-language.md`), whose Interfaces blocks are the phrases this plan writes with, and whose "Left to 6-2" list is this plan's floor (with 6-2b);
- plans 4-2, 5-2a and 5-2b, whose rules text this plan edits, and plans 4-1 and 5-1's phrases;
- `builder-check-startup-6.md` (Q1–Q3, settled as R1–R3) in the session scratchpad;
- `suwa/rulebook.md` v6.0 §3 (The Zones), §6 (Reassign, Pivot, Play Strategy Card), §11.E–G, §12, §13.B, §15.A.3–4, §15.C, §18.B, §20.A, §20.B, Rulings #8, #9, #23, #25;
- where those are silent, suwa's `talent_output.rs`, `phases/engine.rs`, `phases/income.rs`, `project_rules.rs` and `resolvers/{strategy_actions,strategy_effects,admin_actions}.rs`.

## Global Constraints

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.** This plan adds no key: counts, flags and the parked cards live in the rules text.
- **No Startup Simulator words in shared code.** The banned list is plan 6-1's (its Global Constraints), slice 6's words included: workaholic, clean coder, visionary, toxic, burnout, flight risk, techcrunch, design sprint, cease, desist, hype, utility, buff, debuff, venture capital, bubble, patent, troll, angel, investor, legacy, regulation, audit, open source, hackathon, chip shortage, crunch, server crash, logjam, frenzy, intern, headhunter, course boom, whistleblower, trade show, event; and "Attribute" in the game's sense. This plan touches no shared code.
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged. Rent Day keeps its 108 examples.
- **Files this plan changes:** `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md`, and test-file pins under `src/pages/designer/**` that read the rules text (the Startup example count in `designer-page.test.tsx`; any offered-button list in `playtest-fitted.test.tsx` that gains the new Strategy buttons; any pinned zone list, Board text or flag list in `tableaux.test.ts` that the new zone or flags change), each pinned as the view now says it and reported. No page source changes, and nothing under `src/engine/**`.
- **Every number comes from the rulebook, and examples say where:** a section or ruling in each title, and each task's "How the numbers come".
- **Anti-goals (spec and overview):** Startup words in shared code; a rival seeing a hidden zone (a count on a bench card hides with the card); a rule approximated without a recorded call; a game that can't end; an auto-player that hides a rule that never fires.
- **Every rules line is pinned.** Each line this plan adds or changes, other than `Hint:` lines, table rows and `Cards can …` declarations, fails some example when it alone is removed, or is named in its task as pinned by a test instead. Each task's Step 4 runs plan 5-2a's removal probe. Never leave a rulebook line out because no example fails without it: show it is redundant, or reach it with an example.
- **Example counts.** N₆ is the count the committed test pins (`results` length) when Task 1 starts: plan 5-2b's N₅ + 33, plus whatever fix waves add. The tasks end at N₆ + 3, + 9, + 16, + 25 and + 31. Each task updates `results` in `startup-simulator.test.ts`, the Startup test in `designer-page.test.tsx` and the README's "Its N examples".
- **Commands.**
  - Single file: `bunx vitest run src/games/startup-simulator.test.ts`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1: record `BASE=$(git rev-parse HEAD)`; run `bun run test` once for the passing count and the long runs' time; note N₆.
- **Existing tests.** Only the lines each task names change. If any other existing test fails, stop and report it.
- **Long runs.** If an invariant shows a wrong rule, fix the rules text. If a required tally stays at 0, change the auto-player (cadences, targets), never the rules; report a key that stays unreachable. If a rule can't be written with plans 4-1, 5-1 and 6-1's phrases, report it. If the long runs take more than a third longer than at BASE, report the timing.
- **Pre-flight notes carried from plans 4-2 and 5-2:**
  - Take every `shownFlags` / `standIns` / `shownPlayerValues` pin from HEAD and apply only the change named; a flag or value read through anything but the card fails closed.
  - Never write `For each card … that is X` (a For-each takes no flag test); the lines below use `whose`, `on it`, `each {cardflag} card in {zone}` or a zone.
  - A count at 0 may have no key: the test file reads counts as numbers with missing as 0 (`tokenOn`), never with `hasOwn`.
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefix `feat(games):` (`docs:` for a README-only commit).
  - TDD every task: change the test first, watch it fail, then the rules, pass, `bun run typecheck`, commit.
  - Every rules line below is exact copy. Insertion points name a line or section by its text, never by a line number. **Re-read the committed rules file before each task:** plans 4-2, 5-2a and 5-2b's text is the base, and line numbers will have moved. If a named anchor line is missing or worded otherwise, stop and report it.
  - If a line reads two ways (an `ambiguous` diagnostic: the counts share their cards' names), stop and report it.

## Review Focus

- **A Talent with Attributes leaving the Board every way there is.**
  - Expected: a Dismiss, an unpaid let-go and the Diva's Pivot strip the counts and send their cards to the strategy discard; a Recall, a Pivot to the bench and a bench discard keep them; a rehire hands them to the new owner; an eviction sends counts' cards to the box.
  - Tests: Task 2, examples 1–6, and the long-run Attribute invariant.
- **Toxic Personality on a team that makes one colour, none at all, or is Stalled, and while it onboards.**
  - Expected: the cube comes off the first colour made, Blue then Red then QA; no team value, made value or supply goes below 0; nothing comes off while the Toxic card onboards.
  - Tests: Task 4, examples 3–9, the made-values test and the long-run invariant.
- **Burnout meeting Workaholic, Synergy, QA mode and the bench.**
  - Expected: 0 output in every colour whatever else holds; a burned-out PM gives no Synergy but still counts for Brainstorm; Workaholic's +$2 salary stays.
  - Tests: Task 4, examples 1–2, and the long-run Burnout invariant.
- **TechCrunch Feature's price at the edge.**
  - Expected: $5, or $2 with a working Sales Rep on the target; never both discounts; refused, with nothing paid, when the player can't pay the lower price; an onboarding Rep gives nothing.
  - Tests: Task 5, examples 1–2 (6-2b adds Trade Show).
- **Undo and replay across an Attribute play, a strip, a TechCrunch Feature and a Design Sprint.**
  - Expected: the log alone rebuilds the finished game, and undo of the last move gives the state before it.
  - Test: Task 6.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name. If one is missing or differs, stop and report it.

- **Plan 6-1, built (its Interfaces):** a button target `… to a card in another player's development team or another player's ops team` (`{ others: … }`, `ontoZoneIds`, `othersZoneIds`); value lines `a/an {cardflag} card's {attribute} goes up by {int}`, `… goes down by {int}`, `… goes up by its {attribute}`; `a card's {attribute} is {int}`; `a card's {attribute} goes up by {int} for each {attribute}`; `they have at least the lower of the card's {attribute} and the target card's {attribute} in {counter}` and `they pay the lower of the card's {attribute} and the target card's {attribute}`.
- **Plan 5-2b, built:** the Strategy table (`kind`, `price`), the strategy deck, discard, hand and brainstorm zones; the button `A player may play a card from their strategy hand to a card in their bench, their development team or their ops team.` with `Only if the card is a Training card.`, its option block `Blue:`/`Red:`/`Green:`/`XP:`/`Badge:` and its last line `Move it to the strategy discard.`; the example "only a Training card can be played in this slice: a Hit Piece waits in the hand (the spec's call, section 20)"; the worked flag sections ending with `Software side:`; in the test file `PLAY_TRAINING`, `TRAINING_TARGETS`, `isTraining`, `training()`, `brainstorming()`, the brainstorm keep policy, `CLEANUPS['strategy cleanup']`, the Strategy-card conservation invariant, `Onto.zoneId` as `string | string[]`, the values test `works out slice 5’s values …`.
- **Plan 5-2a, built:** `Cards can be fired.` and the rule `When a card in the open job market is fired:` ending `    It is not fired.`; the four dismiss / let-go buttons' `      It is fired.`; the sections `Blue output:`, `Red output:`, `QA output:` (with `  A practised card's qa output is 2.`), `Salary:` (ending `  An experienced card's salary is 1.`), `Blue team output:`, `Red team output:`, `QA team output:`, `PM count:` (`  A card's pm count is the number of the cards on it that are managing.`), `QA workers:`, `Leading software:`, `Leading hardware:`, `Managing:`; the engine's start lines (the new-cube lines, the three Pending lines and `    For each card in their development, its bugs go down by its qa team output.`); in the test file `TOKENS`, `tokenOn`, `scoreOf(runtime, state, seat)`, the firing invariant, `pmToProject()`.
- **Plan 4-2, built:** `Blue bandwidth:`, `Red bandwidth:`, `Blue supply:`, `Red supply:`, `QA supply:` (`  A player's qa supply is the total qa output of the cards in their ops team.`), `Rev:`, `Portfolio points:` (`  A card's portfolio points is its val.` / `  An offline card's portfolio points is 0.`), `Attaching:`, `Viral:`, the Hacker's rule `  When a Spaghetti Code card joins a card in a development:`, the backlog cleanup line `    If they have no card in their ops team that is not onboarding and whose trait is Clean Code, each viral card in their operations gains 1 bug.`, the Pivot's `      Every card on it whose trait is Ego goes to the open job market.`, the ops-team product routes; in the test file `DECLARE`, `CONFIRM_MODES`, `SWITCH_OFF`, `SWITCH_ON`, `CONFIRM_ONLINE`, `shortOf`, `enteredIncome`, `onProduct`, `CLEAN`, `REASSIGN_TO_PRODUCT`, `ASSIGN_TO_PRODUCT`, `FINAL_CHECK`.
- **Plans 4-3 and 5-3, built:** the `shownFlags`, `standIns` and `shownPlayerValues` pins in `startup-simulator.test.ts` (`describe('what the view says the rules work out')`); the fitted table's Startup pins.
- **Plans 4-1 and 5-1:** `If <condition> and <condition>, <effect>`; `every card on it that is {cardflag} is {cardflag}`; `its owner has (a / no) card in their {perzone} {cardclause}`; `a card in {sharedzone} is {cardflag}` as a rule; `move {card} from {zone} to {zone}`; `deal up to {int} cards from {zone} to {zone}`; `the target card gains {int} {attribute}`; `some / no card on it is {cardflag}`; `a card's {attribute} goes up by its {attribute}`; `a card's {attribute} is the number of {cardgroup}`.

---

### Task 1: Attribute cards played: Buffs on the player's own staff, Debuffs on a rival's Board staff, the attributes in play

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` and `tableaux.test.ts` only if they pin what this task changes

**Interfaces:**
- Consumes: 5-2b's Strategy button and table; 6-1's `another player's` targets.
- Produces (rules): the zone `attributes in play`; the six counts; the Buff options; the button `play a card from their strategy hand to a card in another player's development team or another player's ops team`.
- Produces (test file):

```ts
const PLAY_DEBUFF = "play a card from their strategy hand to a card in another player's development team or another player's ops team";
/** Each Attribute card by name, with the count it puts on a Talent (§20.A, the slice's R2). */
const ATTRIBUTES: Record<string, string> = {
  Workaholic: 'workaholic', 'Clean Coder': 'clean coder', Visionary: 'visionary',
  'Toxic Personality': 'toxic personality', Burnout: 'burnout', 'Flight Risk': 'flight risk',
};
const BUFFS = ['Workaholic', 'Clean Coder', 'Visionary'];
const DEBUFFS = ['Toxic Personality', 'Burnout', 'Flight Risk'];
/** A Strategy card a button of slices 5 and 6 plays: Training, an Attribute, TechCrunch Feature or Design Sprint (§20.A). */
const isPlayable = (card: CardState): boolean;
/** The zones a Debuff's target is offered in for `by`, as 6-1 orders them: each other seat's development team from `by`'s left, then each one's ops team. */
const debuffZones = (seats: PlayerId[], by: PlayerId): string[];
```

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₆ + 3; the designer page's count too.
    - `'lays out the table …'`: after `['strategy-discard', false, 'pile', 'public']` add `['attributes-in-play', false, 'pile', 'public']`.
  - **Append `it('offers a Debuff only another seat’s Board staff, development teams first, seat by seat from the presser’s left (§20.A, plan 6-1)')`.** At 3 players from `setUp(3, 1)`, with p0 to act: a Burnout in `strategy-hand-p0`; each seat's Junior Software Dev `putOn` a project in its own development; p1 and p2 each running a product in their operations, with their Junior QA Testers pooled in their ops teams. `ontoCandidates(runtime, debuff, state, 'p0')` is p1's development-team card, p2's, then p1's ops-team card, p2's; p0's own cards and every bench card are absent.
  - **Money (`keepsTheRules`):** a `PLAY_DEBUFF` press pays the played card's worked `price` (read with `runtime.workedValue(before, cardId, 'price')`); `PLAY_TRAINING` reads the worked `price` too.
  - **Invariants (Review Focus 1):**
    - 5-2b's Strategy-card conservation also counts the `attributes-in-play` pile and the box;
    - each Attribute card is in the attributes in play exactly when its count is 1 on some card not in the box (`tokenOn`), and no card holds more than 1 of any count;
    - only a card with a `role` of `Senior Developer`, `Specialist` or `Junior` holds an Attribute count;
    - a count rises in a move only on the target of a `PLAY_TRAINING` or `PLAY_DEBUFF` press of that Attribute, by 1; a `PLAY_DEBUFF` target is in a seat other than the mover's (Task 2 adds the moves that lower a count).
  - **The auto-player.**
    - `training()` also takes Buff cards: the first Training or Buff card of its strategy hand that has a target the rules take; a Buff goes on the taken target at `t % n`.
    - **`debuffing()`**, a free move made at most once a turn, right after `training()`: the first Debuff card of its strategy hand with a target the rules take (`pressChoices` on `{ type: PLAY_DEBUFF, by, cardId, onto }` gives a list, not a refusal), on the taken target at `t % n` among `ontoCandidates` (its `Onto.zoneId` is `debuffZones(seats, by)`).
    - The brainstorm keep policy, the cleanup's kept cards and the flush read `isPlayable` in place of `isTraining`.
  - **Append `it('plays a Debuff the auto-player holds on the rival card picked by t, through the page’s view and without it (§20.A)')`.** From `setUp(2, 1)` with S its start player and O the other seat: a Burnout to `strategy-hand-S`, two of O's Juniors onto a project of O's development. For t = 0 and t = 1, `playTurn` stops at the first `PLAY_DEBUFF`, whose target differs between the two; the logs with and without the view are equal.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`. Expected: FAIL (the count, the zone, the new tests).
- [ ] **Step 3: Change the rules text.**
  - **Cards** (R2). After the last `  Cards can …` line (5-2a's `  Cards can be fired.` or whatever follows it) add:

```text
  Cards can have workaholic, clean coder, visionary, toxic personality, burnout and flight risk.
```

  - **Table** (R2). After `  The strategy discard is a pile in the center that everyone can see.` add:

```text
  The attributes in play is a pile in the center that everyone can see.
```

  - **The Buffs** (§20.A, R2). In `A player may play a card from their strategy hand to a card in their bench, their development team or their ops team.`:
    - `    Only if the card is a Training card.` becomes:

```text
    Only if one of:
      The card is a Training card.
      The card is a Workaholic.
      The card is a Clean Coder.
      The card is a Visionary.
```

    - right after the `Badge:` option and its lines (inside `They choose one:`) add:

```text
        Workaholic:
          Only if the card is a Workaholic.
          The target card gains 1 workaholic.
        Clean Coder:
          Only if the card is a Clean Coder.
          The target card gains 1 clean coder.
        Visionary:
          Only if the card is a Visionary.
          The target card gains 1 visionary.
```

    - its last line `      Move it to the strategy discard.` becomes:

```text
      If the card is a Training card, move it to the strategy discard.
      If the card is an Attribute card, move it to the attributes in play.
```

  - **The Debuffs** (§20.A, R2). Right after that button and its lines add:

```text
  A player may play a card from their strategy hand to a card in another player's development team or another player's ops team.
    Only if one of:
      The card is a Toxic Personality.
      The card is a Burnout.
      The card is a Flight Risk.
    Only if they have at least the card's price in capital.
    Then:
      They pay the card's price.
      If the card is a Toxic Personality, the target card gains 1 toxic personality.
      If the card is a Burnout, the target card gains 1 burnout.
      If the card is a Flight Risk, the target card gains 1 flight risk.
      Move it to the attributes in play.
```

  - **5-2b's Hit Piece example.** Its title becomes `Example: a Warfare card waits in the hand for slice 8: a Hit Piece is refused on one of the player's own staff (the spec's call, section 20)`, and its `Then` line becomes `  Then it is rejected because "the card is a Training card or the card is a Workaholic or the card is a Clean Coder or the card is a Visionary"`.
  - **Append these 3 examples.**

```text
Example: a Buff goes on one of the player's own staff, on the bench or the Board, for its printed price and no action, and its card waits in the attributes in play (section 20, section 15, the slice's R2)
  Given the phase is actions
  And p0 has 9 capital
  And p0's strategy hand has a Workaholic, a Clean Coder and a Visionary
  And p0's bench has the Hacker
  And p0's development has a Dating App
  And p0's operations has a To-Do List
  And p0's ops team has a Junior QA Tester
  And the Dating App in p0's development has a Junior Software Dev on it
  When p0 plays the Clean Coder to the Hacker
  Then it is accepted
  And p0 has 6 capital
  And p0 has 3 actions
  And the Hacker in p0's bench has 1 clean coder
  When p0 plays the Workaholic to the Junior Software Dev
  And p0 plays the Visionary to the Junior QA Tester
  Then p0 has 1 capital
  And the Junior Software Dev in p0's development team has 1 workaholic
  And the Junior QA Tester in p0's ops team has 1 visionary
  And the attributes in play has a Clean Coder, a Workaholic and a Visionary
  And p0's strategy hand is empty

Example: a Debuff goes on a rival's staff on a project or in the ops team for its printed price, one Talent may hold several, and none goes on the player's own staff (section 20, section 15, the slice's R2)
  Given p0 has 4 capital
  And p0's strategy hand has a Toxic Personality, a Burnout and a Flight Risk
  And p0's bench has a Junior Software Dev
  And p1's development has a Smart Lock
  And p1's operations has a Dating App
  And p1's ops team has a Junior QA Tester
  And the Smart Lock in p1's development has the Engineer on it
  When p0 plays the Burnout to the Junior Software Dev
  Then it is rejected because "the card is a Training card or the card is a Workaholic or the card is a Clean Coder or the card is a Visionary"
  When p0 plays the Toxic Personality to the Engineer
  Then it is accepted
  And p0 has 1 capital
  And p0 has 3 actions
  And the Engineer in p1's development team has 1 toxic personality
  When p0 plays the Flight Risk to the Engineer
  Then it is rejected because "they have at least the card's price in capital"
  And p0 has 1 capital
  And p0's strategy hand has a Burnout and a Flight Risk
  When p0 plays the Burnout to the Junior QA Tester
  Then the Junior QA Tester in p1's ops team has 1 burnout
  And p0 has 1 capital
  Given p0 has 2 capital
  When p0 plays the Flight Risk to the Engineer
  Then the Engineer in p1's development team has 1 flight risk
  And p0 has 0 capital
  And the attributes in play has a Toxic Personality, a Burnout and a Flight Risk

Example: only a Debuff goes on a rival's staff, and a Cease & Desist waits in the hand for slice 8's poaching (section 20, the spec's call)
  Given p0's strategy hand has a Workaholic and a Cease & Desist
  And p0's bench has a Junior Software Dev
  And p1's development has a Smart Lock
  And the Smart Lock in p1's development has the Engineer on it
  When p0 plays the Workaholic to the Engineer
  Then it is rejected because "the card is a Toxic Personality or the card is a Burnout or the card is a Flight Risk"
  When p0 plays the Cease & Desist to the Engineer
  Then it is rejected because "the card is a Toxic Personality or the card is a Burnout or the card is a Flight Risk"
  When p0 plays the Cease & Desist to the Junior Software Dev
  Then it is rejected because "the card is a Training card or the card is a Workaholic or the card is a Clean Coder or the card is a Visionary"
  And p0 has 7 capital
  And p0's strategy hand has a Workaholic and a Cease & Desist
```

  **How the numbers come** (§20.A, §15.C, R2):
  - **Prices:** Workaholic $2, Clean Coder $3, Visionary $3, Toxic Personality $3, Burnout $0, Flight Risk $2; 0 AP each (§20.A "Play Strategy Card (0 AP)", §6). So 9 − 3 − 2 − 3 = 1; 4 − 3 = 1, Flight Risk's $2 refused, Burnout $0 leaves 1; 2 − 2 = 0.
  - **Targets:** Buffs one of the player's own employees, Bench or Board; Debuffs an opponent's Board staff, Development or Ops (§20.A). One Talent may hold several (§20.A).
  - **Where the cards go:** an Attribute is tucked under its Talent (§15.C), here parked in the attributes in play (R2); a Training card goes to the strategy discard (§15.C).
  - **Lines each example pins:** 1 the guard's three Buff alternatives, the three Buff options' gains and `If the card is an Attribute card, …`; 2 the Debuff guard's alternatives, its price guard and payment, its three gains and its move; 3 the Debuff guard against a Buff and both guards against Cease & Desist. Each Buff option's `Only if the card is …` is pinned by 5-2b's Training examples, which would be asked "Choose one" without it; `If the card is a Training card, …` by 5-2b's "the strategy discard has a …" lines.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`. Then the removal probe: a throwaway script in the session scratchpad (never committed) compiles the rules once without each line this task added or changed, alone, and runs the examples; every removal must fail an example or give a diagnostic. Report any line that survives.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Attribute cards go on a Talent as counts for their printed price, Buffs on the player's own staff and Debuffs on a rival's Board, their cards parked in the attributes in play

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: Attributes ride with their Talent and leave when it is fired or evicted

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: Task 1's counts and pile; 5-2a's `fired` and its strip rule; 5-1's `every card on it that is {cardflag} is {cardflag}`.
- Produces (rules): worked flags `egotistic`, `holding attributes`; the Pivot's fired line; the strip lines; the box rule.
- Produces (test file): `const attributesOn = (card: CardState) => Object.values(ATTRIBUTES).filter((count) => tokenOn(card, count) > 0);`

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₆ + 9; the designer page's count too. The values test adds `egotistic` and `holding attributes` (flags).
  - **Invariants (Review Focus 1)**, widening Task 1's "a count rises only …":
    - a card that moves from a development team or an ops team to the open job market in a `DISMISS_FROM_PROJECT`, `DISMISS_FROM_OPS`, `LET_GO` or `PIVOT` press holds no Attribute count after the move, and each Attribute card it held in `before` (`attributesOn`) is in the strategy discard after it;
    - a card that moves from a bench to the open job market (`DISCARD_BENCH`, `LAY_OFF`), from a development team or an ops team to a bench (`RECALL`, `PIVOT`), or from the open job market to a bench (`HIRE_MARKET`) holds after the move exactly the counts it held before;
    - a card that moves from the open job market to the box holds no count after the move, and each Attribute card it held is in the box;
    - a count falls in a move only in those three ways.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **The flags.** Right after the `Software side:` section add:

```text
Egotistic:
  Only if it is an Ego card.

Holding attributes:
  Only if one of:
    Its workaholic is more than 0.
    Its clean coder is more than 0.
    Its visionary is more than 0.
    Its toxic personality is more than 0.
    Its burnout is more than 0.
    Its flight risk is more than 0.
```

  - **The Diva's Pivot** (§6 Pivot, ruling 9, §15.C). In the pivot button, right before `      Every card on it whose trait is Ego goes to the open job market.` add:

```text
      Every card on it that is egotistic is fired.
```

  - **Firing** (§15.C "until the Talent is Fired (then Discarded)", R2). In `  When a card in the open job market is fired:`, right before `    It is not fired.` add:

```text
    If its workaholic is more than 0, move the workaholic from the attributes in play to the strategy discard.
    If its clean coder is more than 0, move the clean coder from the attributes in play to the strategy discard.
    If its visionary is more than 0, move the visionary from the attributes in play to the strategy discard.
    If its toxic personality is more than 0, move the toxic personality from the attributes in play to the strategy discard.
    If its burnout is more than 0, move the burnout from the attributes in play to the strategy discard.
    If its flight risk is more than 0, move the flight risk from the attributes in play to the strategy discard.
    It loses its workaholic.
    It loses its clean coder.
    It loses its visionary.
    It loses its toxic personality.
    It loses its burnout.
    It loses its flight risk.
```

  - **Eviction** (§15.A.4, R2). At the end of `In every phase:` add:

```text
  When a card in the box is holding attributes:
    If its workaholic is more than 0, move the workaholic from the attributes in play to the box.
    If its clean coder is more than 0, move the clean coder from the attributes in play to the box.
    If its visionary is more than 0, move the visionary from the attributes in play to the box.
    If its toxic personality is more than 0, move the toxic personality from the attributes in play to the box.
    If its burnout is more than 0, move the burnout from the attributes in play to the box.
    If its flight risk is more than 0, move the flight risk from the attributes in play to the box.
    It loses its workaholic.
    It loses its clean coder.
    It loses its visionary.
    It loses its toxic personality.
    It loses its burnout.
    It loses its flight risk.
```

  - **Append these 6 examples.**

```text
Example: a Talent dismissed from the Board loses its Attributes, and their cards go to the strategy discard (section 15, section 18, the slice's R2)
  Given the phase is actions
  And p0's development has a Smart Lock
  And the attributes in play has a Workaholic, a Toxic Personality, a Flight Risk and a Burnout
  And the Smart Lock in p0's development has the Engineer on it
  And the Engineer in p0's development team has 1 workaholic
  And the Engineer in p0's development team has 1 toxic personality
  And the Engineer in p0's development team has 1 flight risk
  When p0 dismisses the Engineer
  Then the open job market has the Engineer
  And the Engineer in the open job market has 0 workaholic
  And the Engineer in the open job market has 0 toxic personality
  And the Engineer in the open job market has 0 flight risk
  And the strategy discard has a Workaholic, a Toxic Personality and a Flight Risk
  And the attributes in play has a Burnout

Example: a Talent let go unpaid at Income loses its Attributes too (section 5, section 18, the slice's R2)
  Given p1 has 1 capital
  And p1's development has a Dating App
  And the attributes in play has a Clean Coder and a Visionary
  And the Dating App in p1's development has the Hacker on it
  And the Hacker in p1's development team has 1 clean coder
  And the Hacker in p1's development team has 1 visionary
  And the turn passes to the left
  Then the phase is income
  When p1 lets go of the Hacker
  Then the phase is actions
  And the Hacker in the open job market has 0 clean coder
  And the Hacker in the open job market has 0 visionary
  And the strategy discard has a Clean Coder and a Visionary
  And the attributes in play is empty

Example: the Diva fired by a Pivot loses her Attributes, while the staff the Pivot benches keep theirs (section 6, ruling 9, the slice's R2)
  Given the phase is actions
  And p0's development has a Smart Lock
  And the attributes in play has a Burnout and a Workaholic
  And the Smart Lock in p0's development has the Diva and a Junior Hardware Eng on it
  And the Diva in p0's development team has 1 burnout
  And the Junior Hardware Eng in p0's development team has 1 workaholic
  When p0 pivots the Smart Lock
  Then the open job market has the Diva
  And the Diva in the open job market has 0 burnout
  And the Junior Hardware Eng in p0's bench has 1 workaholic
  And the strategy discard has a Burnout
  And the attributes in play has a Workaholic

Example: a Talent discarded from the bench keeps its Attributes, and the rival who hires it from the open job market gets them (section 13, section 15, the slice's R2)
  Given the phase is bench cleanup
  And p0's bench has a Junior Software Dev, a QA Engineer, a QA Engineer, a QA Engineer, a Sales Rep and a Sales Rep
  And the attributes in play has a Workaholic
  And the Junior Software Dev in p0's bench has 1 workaholic
  When p0 discards the Junior Software Dev
  Then it is p1's turn
  And the Junior Software Dev in the open job market has 1 workaholic
  When p1 hires the Junior Software Dev
  Then it is accepted
  And p1 has 6 capital
  And the Junior Software Dev in p1's bench has 1 workaholic
  And the attributes in play has a Workaholic

Example: Talents evicted from the open job market take their Attributes to the box, cards and all, whichever they hold (section 15, the slice's R2)
  Given the phase is actions
  And the open job market has the Hacker, the Architect, the Veteran, the Diva and the Engineer
  And the attributes in play has a Workaholic, a Clean Coder, a Visionary, a Toxic Personality and a Burnout
  And p0's development has a Dating App
  And the Hacker in the open job market has 1 workaholic
  And the Architect in the open job market has 1 clean coder
  And the Veteran in the open job market has 1 visionary
  And the Diva in the open job market has 1 toxic personality
  And the Engineer in the open job market has 1 burnout
  And the Dating App in p0's development has a Junior Software Dev, a Junior Software Dev, a Junior Software Dev, a Junior Software Dev and a Junior Software Dev on it
  When p0 dismisses a Junior Software Dev
  And p0 dismisses a Junior Software Dev
  And p0 dismisses a Junior Software Dev
  And p0 dismisses a Junior Software Dev
  And p0 dismisses a Junior Software Dev
  Then the box has the Hacker, the Architect, the Veteran, the Diva, the Engineer, a Workaholic, a Clean Coder, a Visionary, a Toxic Personality and a Burnout
  And the Hacker in the box has 0 workaholic
  And the Architect in the box has 0 clean coder
  And the Veteran in the box has 0 visionary
  And the Diva in the box has 0 toxic personality
  And the Engineer in the box has 0 burnout
  And the attributes in play is empty
  And the strategy discard is empty

Example: a Talent evicted with Flight Risk takes it to the box (section 15, the slice's R2)
  Given the phase is actions
  And the open job market has the Fixer, a Junior PM, a Junior PM, a Growth Hacker and an HR Manager
  And the attributes in play has a Flight Risk
  And p0's development has a Dating App
  And the Fixer in the open job market has 1 flight risk
  And the Dating App in p0's development has a Junior Software Dev on it
  When p0 dismisses the Junior Software Dev
  Then the box has the Fixer and a Flight Risk
  And the Fixer in the box has 0 flight risk
  And the attributes in play is empty
```

  **How the numbers come** (§13.A, §15.A.3–4, §15.C, §18.B, R2):
  - **Firing** (Dismiss, an unpaid let-go, the Diva's Pivot) discards the Attributes (§15.C, §18.B); a Bench discard keeps them, and a rehire hands them on (§15.A.3, §13.B); eviction is not firing, and the card leaves the game with its Attributes (R2, suwa's `resolvers/common.rs`).
  - **Money:** the Hacker's $2 salary is more than p1's $1, so p1 stays at Income until it lets him go (§5 Phase B); the open job market costs $1, 7 − 1 = 6 (§13.A).
  - **The queue:** a 6th card in the open job market sends its oldest (the first named) to the box (§15.A.4, ruling 12); each dismissed Junior is the newest.
  - **Lines each example pins:** 1 the strip's workaholic, toxic personality and flight risk lines (move and lose); 2 its clean coder and visionary lines; 3 its burnout lines, `Every card on it that is egotistic is fired.` and Egotistic; 5 the box rule, five of its move and lose pairs and five of Holding attributes' alternatives; 6 the flight risk pair and alternative. 4 is a guard (§15.A.3).
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Attributes ride with their Talent to the bench and the open job market, go to the strategy discard when it is fired, the Diva's Pivot included, and to the box when it is evicted

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: Workaholic, Clean Coder and Visionary

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: Task 1's counts; 6-1's `a/an {cardflag} card's {attribute} goes up by {int}`; 4-2's Hacker rule, `Viral:` and the backlog cleanup's viral line; 5-2a's outputs, `Salary:` and leads.
- Produces (rules): worked flags `overworked`, `clean coding`, `guarding the pool`; refined `blue output`, `red output`, `qa output`, `salary`, `Leading software`, `Leading hardware`, `Viral`.

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₆ + 16; the designer page's count too. The values test adds `overworked`, `clean coding` and `guarding the pool` (flags). `shownFlags(game)` gains `'overworked'` (its value lines read only the card); `standIns(game)` is unchanged. If the view says otherwise, pin what it says and report it.
  - **Invariants:**
    - every `overworked` card on a Board has a worked `salary` of at least 2;
    - a project's `bugs` never rise in an assign, reassign or hire that moves a `Spaghetti Code` card with `clean coder` 1 onto it (4-2's Hacker invariant, if present, reads the count).
  - **The auto-player.** `training()`'s Buff targets: a Workaholic goes on the first taken target with a worked `blue output`, `red output` or `qa output` above 0, else at `t % n`; a Clean Coder on a taken card whose trait is `Spaghetti Code`, else on an attaching card in its ops team, else at `t % n`; a Visionary on a taken Junior on a project of its development that is `stalled`, else at `t % n`.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Workaholic's output** (§20.A). In `Blue output:`, right after `  A card's blue output goes up by its blue xp.`, add `  An overworked card's blue output goes up by 2.` In `Red output:`, right after `  A card's red output goes up by its red xp.`, add `  An overworked card's red output goes up by 2.` In `QA output:`, right after `  A practised card's qa output is 2.`, add `  An overworked card's qa output goes up by 2.`
  - **Workaholic's salary.** At the end of `Salary:` (after `  An experienced card's salary is 1.`) add `  An overworked card's salary goes up by 2.`
  - **The flags.** Right after the `Holding attributes:` section add:

```text
Overworked:
  Only if its workaholic is more than 0.

Clean coding:
  Only if one of:
    It is a Clean Code card.
    Its clean coder is more than 0.
  Only if it is not onboarding.

Guarding the pool:
  Only if it is clean coding.
  Only if it is not attaching.
```

  - **Clean Coder on the Hacker** (§20.B "unless he has Clean Code himself"). Under `  When a Spaghetti Code card joins a card in a development:`, before `    The card it joins gains 1 bug.`, add `    Only if its clean coder is 0.`
  - **Clean Coder against the Growth Hacker** (§20.B Clean Code, ruling 19). In `Viral:`, after `  Only if some card on it is spreading bugs.`, add `  Only if no card on it is clean coding.` In backlog cleanup, `    If they have no card in their ops team that is not onboarding and whose trait is Clean Code, each viral card in their operations gains 1 bug.` becomes:

```text
    If they have no card in their ops team that is guarding the pool, each viral card in their operations gains 1 bug.
```

  - **Visionary** (§20.A, §11.G.1). `Leading software:` and `Leading hardware:` become:

```text
Leading software:
  Only if one of:
    It is a Senior Developer card.
    It is badged.
    Its visionary is more than 0.
  Only if one of:
    It is a software card.
    It is a flex card.
    Its blue skill is more than 0.
    Its visionary is more than 0.
  Only if it is not onboarding.

Leading hardware:
  Only if one of:
    It is a Senior Developer card.
    It is badged.
    Its visionary is more than 0.
  Only if one of:
    It is a hardware card.
    It is a flex card.
    Its red skill is more than 0.
    Its visionary is more than 0.
  Only if it is not onboarding.
```

  - **Append these 7 examples.**

```text
Example: Workaholic gives +2 output in the colour its staff member makes and +$2 salary (section 20)
  Given p1's development has a Cloud Storage
  And the Cloud Storage in p1's development has a Junior Software Dev and a Junior Hardware Eng on it
  And the Junior Software Dev in p1's development team has 1 workaholic
  And the Junior Hardware Eng in p1's development team has 1 workaholic
  And the turn passes to the left
  Then the phase is income
  When p1 pays salaries
  Then p1 has 3 capital
  When p1 ends their actions
  Then the Cloud Storage in p1's development has 3 blue cubes
  And the Cloud Storage in p1's development has 3 red cubes

Example: a Workaholic Junior PM gets only the +$2 salary, as it makes no output, and a Workaholic Junior QA Tester cleans 2 more Bugs (section 20, section 11)
  Given p1's development has a Dating App
  And the Dating App in p1's development has 3 bugs
  And the Dating App in p1's development has a Junior PM, a Junior Software Dev and a Junior QA Tester on it
  And the Junior PM in p1's development team has 1 workaholic
  And the Junior QA Tester in p1's development team has 1 workaholic
  And the turn passes to the left
  Then the phase is income
  When p1 pays salaries
  Then p1 has 2 capital
  When p1 ends their actions
  Then the Dating App in p1's development has 2 blue cubes
  And the Dating App in p1's development has 0 bugs

Example: the Hacker with Clean Coder adds no Bug to the projects he joins (section 20)
  Given the phase is actions
  And p0's strategy hand has a Clean Coder
  And p0's bench has the Hacker
  And p0's development has a Dating App and a To-Do List
  When p0 plays the Clean Coder to the Hacker
  And p0 assigns the Hacker to the Dating App
  Then the Dating App in p0's development has 0 bugs
  When p0 reassigns the Hacker to the To-Do List
  Then the To-Do List in p0's development has 0 bugs
  And p0 has 4 capital

Example: a Sales Rep with Clean Coder shields only the product it is on, so the Growth Hacker still adds its Bug to another (section 20, ruling 19)
  Given the phase is actions
  And p0's operations has a Dating App and a To-Do List
  And p0's ops team has a Junior Software Dev and a Junior Software Dev
  And the Dating App in p0's operations has a Growth Hacker on it
  And the To-Do List in p0's operations has a Sales Rep on it
  And the Sales Rep in p0's ops team has 1 clean coder
  When p0 ends their actions
  Then the Dating App in p0's operations has 1 bug
  And the To-Do List in p0's operations has 0 bugs

Example: a Sales Rep with Clean Coder on the Growth Hacker's own product stops its Bug (section 20, ruling 19)
  Given the phase is actions
  And p0's operations has a Dating App
  And the Dating App in p0's operations has a Growth Hacker and a Sales Rep on it
  And the Sales Rep in p0's ops team has 1 clean coder
  When p0 ends their actions
  Then the Dating App in p0's operations has 0 bugs

Example: a Junior with Visionary leads in both colours, so it builds a Tier 2 hybrid and Launches it alone (section 20, section 11, section 3)
  Given the phase is actions
  And p0's development has a Drone Delivery
  And the Drone Delivery in p0's development has 6 blue cubes
  And the Drone Delivery in p0's development has 5 red cubes
  And the Drone Delivery in p0's development has a Junior Hardware Eng on it
  And the Junior Hardware Eng in p0's development team has 1 visionary
  When p0 ends their actions
  Then the Drone Delivery in p0's development has 6 red cubes
  When p1 ends their actions
  And p0 launches the Drone Delivery
  Then it is accepted
  And p0's operations has a Drone Delivery

Example: Visionary makes any unit a lead, a Junior PM included, so its Tier 2 project isn't Stalled (section 11, section 20, the Rust engine's lead rule)
  Given the phase is actions
  And p0's development has a Neobank
  And the Neobank in p0's development has a Junior PM and a Junior Software Dev on it
  And the Junior PM in p0's development team has 1 visionary
  When p0 ends their actions
  Then the Neobank in p0's development has 2 blue cubes
```

  **How the numbers come** (§3, §11, §20.A, §20.B, §20.C):
  - **Workaholic:** +2 Output in the unit's current mode, +$2 salary; PMs, Sales Reps and HR Managers produce no Output, so only the salary (§20.A). Juniors make 1 (§20.B.2): 1 + 2 = 3 Blue and 3 Red on the Cloud Storage (4/4); salaries 0 + 2 each, 7 − 4 = 3. The Junior PM's $1 + 2 and the QA Tester's $0 + 2: 7 − 5 = 2.
  - **Synergy** (5-2a): +1 for each working teammate in its colour: Blue 1 + 1 = 2; QA (1 + 2) + 1 = 4 against 3 Bugs.
  - **Clean Coder:** $3, 7 − 3 = 4 (§20.A); the unit gains Clean Code (§20.B): the Hacker adds no Bug when he joins; a working unit in the pool shields every product from Growth Hackers, an attached one only its own (§20.B, ruling 19; suwa's `run_end_of_turn_traits`).
  - **Visionary:** a Software and a Hardware Lead for any Tier (§20.A, §11.G.1). The Drone Delivery is Tier 2, 6 Blue / 6 Red (§20.C.2): a Junior alone would leave it Stalled (§3); with Visionary it progresses (1 Red) and Launches with both leads. The Neobank is Tier 2 Software, 10 Blue: Junior 1 + Synergy 1 = 2.
  - **Lines each example pins:** 1 the Blue and Red Workaholic lines, the salary line and Overworked; 2 the QA Workaholic line (5-2a's Bug Hunter and practised lines set the value before it); 3 the Hacker rule's `Only if its clean coder is 0.`; 4 Guarding the pool's `not attaching` and `clean coding` lines (the pooled Juniors would otherwise guard) and the backlog cleanup line; 5 Viral's new line and Clean coding's count alternative; 6 the four `Its visionary is more than 0.` lines (a Launch needs both leads); 7 is a guard of the call. Clean coding's trait alternative and onboarding line are pinned by 4-2's Architect examples.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Workaholic adds 2 output in its mode and $2 salary, Clean Coder gives a unit Clean Code, and Visionary makes any unit a lead in both colours

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: Toxic Personality and Burnout

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); any designer pin of `shownPlayerValues` or the bandwidth gauges (see the Gaps)

**Interfaces:**
- Consumes: Task 1's counts; 6-1's `goes down by {int}` and `a card's {attribute} is {int}`; 5-1's owner scope and `goes up by its {attribute}`; 5-2a's team values and `PM count:`.
- Produces (rules): worked flags `burned out`, `giving synergy`, `poisoning`, `losing blue`, `losing red`, `losing qa`, `pool losing blue`, `pool losing red`, `pool losing qa`; worked numbers `blue made`, `red made`, `qa made`, `pool blue`, `pool red`, `pool qa`; the Engine's lines read the made values; the three supplies read the pool values.
- Produces (test file): `const MADE = ['blue made', 'red made', 'qa made'] as const;` and `const POOL = ['pool blue', 'pool red', 'pool qa'] as const;`.

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₆ + 25; the designer page's count too.
    - The values test adds `blue made`, `red made`, `qa made`, `pool blue`, `pool red`, `pool qa` (numbers, `refines: false`) and the nine flags above.
    - `shownFlags(game)` gains `'burned out'`, `'losing blue'`, `'losing red'` and `'losing qa'` (the `pool losing …` flags read their owner's ops team, so they fail closed). `standIns(game)` gains `'blue team output': 'blue made'`, `'red team output': 'red made'` and `'qa team output': 'qa made'` (no card keeps those as facts, so no face changes).
    - `shownPlayerValues(game)` (4-3) loses `'blue supply'`, `'red supply'` and `'qa supply'`: each is now a total of a value that reads the owner's ops team. Pin what the view says and report it as this plan's Gap 1.
    - If the view says otherwise in any pin, pin what it says and report it.
  - **Append `it('takes Toxic Personality’s cube only from a colour its team makes, so no made value or supply is ever below 0 (§20.A, the slice’s R1)')`.** Each table is arranged on `setUp(2, 1)` with S its start player; values are read with `runtime.workedValue` and `runtime.playerValue`:
    - the Engineer with 1 toxic personality alone on a Smart Lock in S's development: `blue made` 0, `red made` 2, `qa made` 0;
    - a Junior QA Tester and a QA Engineer with 1 toxic personality on a Dating App: `blue made` 0, `red made` 0, `qa made` 1;
    - a Junior PM with 1 toxic personality alone on a To-Do List: all three 0;
    - S's ops team holding a Junior Software Dev, a Junior QA Tester and a Junior PM with 1 toxic personality: `blue supply` 0, `red supply` 0, `qa supply` 1;
    - S's ops team holding a Junior Hardware Eng, a Junior QA Tester and a Junior PM with 1 toxic personality: `blue supply` 0, `red supply` 0, `qa supply` 1.
  - **Invariants (Review Focus 2, 3)**, after every move:
    - every card with a `burnout` count above 0 on a Board has worked `blue output`, `red output` and `qa output` each 0 or null, and is never counted by `pm count`;
    - every card in a development has `blue made`, `red made` and `qa made` of 0 or more, each at most its team value and at least that less 1;
    - every seat's `blue supply`, `red supply` and `qa supply` is 0 or more.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Burnout** (§20.A, R3). Each of `Blue output:`, `Red output:` and `QA output:` ends, after its `… onboarding card's … output is 0.` line, with in turn:

```text
  A burned out card's blue output is 0.
```

```text
  A burned out card's red output is 0.
```

```text
  A burned out card's qa output is 0.
```

  - **Synergy without the burned-out PM** (§20.A). In `PM count:`, `  A card's pm count is the number of the cards on it that are managing.` becomes `  A card's pm count is the number of the cards on it that are giving synergy.`
  - **The flags.** Right after the `Guarding the pool:` section add:

```text
Burned out:
  Only if its burnout is more than 0.

Giving synergy:
  Only if it is managing.
  Only if its burnout is 0.

Poisoning:
  Only if its toxic personality is more than 0.
  Only if it is not onboarding.

Losing blue:
  Only if some card on it is poisoning.
  Only if its blue team output is more than 0.

Losing red:
  Only if some card on it is poisoning.
  Only if its blue team output is 0.
  Only if its red team output is more than 0.

Losing qa:
  Only if some card on it is poisoning.
  Only if its blue team output is 0.
  Only if its red team output is 0.
  Only if its qa team output is more than 0.

Pool losing blue:
  Only if it is poisoning.
  Only if it is in an ops team.
  Only if its owner has a card in their ops team that is not onboarding and whose blue bandwidth is more than 0.

Pool losing red:
  Only if it is poisoning.
  Only if it is in an ops team.
  Only if its owner has no card in their ops team that is not onboarding and whose blue bandwidth is more than 0.
  Only if its owner has a card in their ops team that is not onboarding and whose red bandwidth is more than 0.

Pool losing qa:
  Only if it is poisoning.
  Only if it is in an ops team.
  Only if its owner has no card in their ops team that is not onboarding and whose blue bandwidth is more than 0.
  Only if its owner has no card in their ops team that is not onboarding and whose red bandwidth is more than 0.
  Only if its owner has a card in their ops team that is not onboarding and whose qa output is more than 0.
```

  - **The team's made values** (R1 in a Development team). Right after the `QA workers:` section add:

```text
Blue made:
  A card's blue made is its blue team output.
  A losing blue card's blue made goes down by 1.

Red made:
  A card's red made is its red team output.
  A losing red card's red made goes down by 1.

QA made:
  A card's qa made is its qa team output.
  A losing qa card's qa made goes down by 1.
```

  - **The pool's values** (R1 in the ops pool). Right after the `Red bandwidth:` section add:

```text
Pool blue:
  A card's pool blue is 0.
  A card's pool blue goes up by its blue bandwidth.
  A pool losing blue card's pool blue goes down by 1.

Pool red:
  A card's pool red is 0.
  A card's pool red goes up by its red bandwidth.
  A pool losing red card's pool red goes down by 1.

Pool qa:
  A card's pool qa is 0.
  A card's pool qa goes up by its qa output.
  A pool losing qa card's pool qa goes down by 1.
```

  - **The supplies.** `  A player's blue supply is the total blue bandwidth of the cards in their ops team.` becomes `  A player's blue supply is the total pool blue of the cards in their ops team.`; `  A player's red supply is the total red bandwidth of the cards in their ops team.` becomes `  A player's red supply is the total pool red of the cards in their ops team.`; `  A player's qa supply is the total qa output of the cards in their ops team.` becomes `  A player's qa supply is the total pool qa of the cards in their ops team.`
  - **The Engine.** In `Phase: engine`'s `When this phase starts:`:
    - `    For each card in their development, its new blue cubes go up by its blue team output.` becomes `    For each card in their development, its new blue cubes go up by its blue made.`;
    - `    For each card in their development, its new red cubes go up by its red team output.` becomes `    For each card in their development, its new red cubes go up by its red made.`;
    - `    For each card in their development, its bugs go down by its qa team output.` becomes `    For each card in their development, its bugs go down by its qa made.`;
    - the three Pending lines are unchanged: they read the team before Toxic's cube (the call above).
  - **Append these 9 examples.**

```text
Example: Burnout makes its staff member produce nothing in any colour, so it learns nothing and is no working teammate for Synergy (section 20, the slice's R3)
  Given p1's development has a Cloud Storage
  And the Cloud Storage in p1's development has 2 bugs
  And the Cloud Storage in p1's development has a Junior PM, a Junior Software Dev, the Hacker, a Junior Hardware Eng and a Junior QA Tester on it
  And the Hacker in p1's development team has 1 burnout
  And the Junior Hardware Eng in p1's development team has 1 burnout
  And the Junior QA Tester in p1's development team has 1 burnout
  And the turn passes to the left
  Then the phase is income
  When p1 pays salaries
  Then p1 has 4 capital
  When p1 ends their actions
  Then the Cloud Storage in p1's development has 2 blue cubes
  And the Cloud Storage in p1's development has 0 red cubes
  And the Cloud Storage in p1's development has 2 bugs
  And the Junior Hardware Eng in p1's development team has 0 pending red

Example: a Junior PM with Burnout gives no Synergy, though it still gives Brainstorm its third card (section 20, section 6, the Rust engine's PM bonus)
  Given p1's development has a Dating App
  And the strategy deck has a Headhunter, a Hit Piece and a Visionary
  And the Dating App in p1's development has a Junior PM and a Junior Software Dev on it
  And the Junior PM in p1's development team has 1 burnout
  And the turn passes to the left
  When p1 pays salaries
  And p1 brainstorms
  Then p1's brainstorm has 3 cards
  When p1 keeps the Visionary
  And p1 ends their actions
  Then the Dating App in p1's development has 1 blue cube

Example: Toxic Personality takes one cube off its team's total after Synergy, Blue first, though the Toxic staff member makes nothing itself (section 20, ruling 25, the slice's R1)
  Given the phase is actions
  And p0's development has a Cloud Storage
  And the Cloud Storage in p0's development has a Junior PM, a Junior Software Dev and a Junior Hardware Eng on it
  And the Junior PM in p0's development team has 1 toxic personality
  When p0 ends their actions
  Then the Cloud Storage in p0's development has 1 blue cube
  And the Cloud Storage in p0's development has 2 red cubes

Example: a Toxic staff member onboarding this turn takes nothing off its new team (ruling 8, the slice's R1)
  Given the phase is actions
  And p0's development has a Cloud Storage and a Dating App
  And the Cloud Storage in p0's development has a Junior Software Dev on it
  And the Dating App in p0's development has the Hacker on it
  And the Hacker in p0's development team has 1 toxic personality
  When p0 reassigns the Hacker to the Cloud Storage
  And p0 ends their actions
  Then the Cloud Storage in p0's development has 1 blue cube
  And the Cloud Storage in p0's development has 1 bug

Example: a team that makes no Blue loses a Red cube to Toxic Personality (section 20, the slice's R1)
  Given the phase is actions
  And p0's development has a Smart Lock
  And the Smart Lock in p0's development has the Engineer on it
  And the Engineer in p0's development team has 1 toxic personality
  When p0 ends their actions
  Then the Smart Lock in p0's development has 2 red cubes
  And the Smart Lock in p0's development has 0 blue cubes

Example: a team that makes neither Blue nor Red cleans one Bug fewer for Toxic Personality (section 20, the slice's R1)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has 3 bugs
  And the Dating App in p0's development has a Junior QA Tester and a QA Engineer on it
  And the QA Engineer in p0's development team has 1 toxic personality
  When p0 ends their actions
  Then the Dating App in p0's development has 2 bugs

Example: in the ops team Toxic Personality takes one off the Blue bandwidth first, though the Toxic PM makes nothing, so a product goes offline (section 20, section 5, the slice's R1)
  Given p1's operations has a Dating App and a Smart Lock
  And p1's ops team has a Junior Software Dev, a Junior Hardware Eng and a Junior PM
  And the Junior PM in p1's ops team has 1 toxic personality
  And the turn passes to the left
  Then the phase is ops check
  And p1's blue supply is 0
  And p1's red supply is 1
  When p1 switches off the Dating App
  And p1 confirms the products online
  Then the phase is income
  And p1 has 9 capital

Example: an ops team that makes no Blue loses a Red to Toxic Personality, and its Blue stays at none (section 20, section 5, the slice's R1)
  Given p1's operations has a Smart Lock, a Smart Thermostat and a Smart Toy
  And p1's ops team has the Engineer
  And the Engineer in p1's ops team has 1 toxic personality
  And the turn passes to the left
  Then the phase is ops check
  And p1's red supply is 2
  And p1's blue supply is 0
  When p1 switches off the Smart Toy
  And p1 confirms the products online
  Then p1 has 11 capital

Example: an ops team that makes neither Blue nor Red cleans one Bug fewer for Toxic Personality (section 20, section 5, the slice's R1)
  Given the phase is actions
  And p0's operations has a Dating App
  And p0's ops team has a Junior QA Tester and a QA Engineer
  And the Dating App in p0's operations has 2 bugs
  And the QA Engineer in p0's ops team has 1 toxic personality
  Then p0's qa supply is 1
  And p0's red supply is 0
  When p0 ends their actions
  Then the Dating App in p0's operations has 1 bug
```

  **How the numbers come** (§5, §11.E, §20.A, §20.B, §20.C, rulings 8 and 25, R1, R3):
  - **Burnout:** 0 Output; a PM with Burnout gives no Synergy (§20.A); absolute, after every modifier (R3). On the Cloud Storage: Blue Junior 1 + the Hacker 0, Synergy 1 for its one working Blue teammate: 2; Red 0; QA 0, so 2 Bugs stay. Salaries: Junior PM $1, the Hacker $2: 7 − 3 = 4.
  - **Brainstorm:** a PM on the Board without an Onboarding Token draws 3 (§6); Burnout names only Output and Synergy, and suwa's `has_working_pm` ignores it. Junior Software Dev 1 Blue, no Synergy.
  - **Toxic Personality:** −1 to its team's total Output (§20.A; ruling 25 "its whole team"); Blue if the team makes any, else Red, else QA; after Synergy; nothing while it onboards (ruling 8); even when the Toxic card makes nothing (R1). Cloud Storage: Blue 1 + 1 Synergy − 1 = 1, Red 1 + 1 = 2. The Engineer: 3 Red − 1 = 2. QA: 1 + 1 − 1 = 1 Bug cleaned.
  - **The onboarding Hacker** still adds his join Bug (4-2) and makes nothing: Blue 1.
  - **The ops pool:** Junior Software Dev Blue 1 − 1 = 0 against the Dating App's 1; the Junior Hardware Eng's Red 1 runs the Smart Lock (rev 2): 7 + 2 = 9, the Junior PM's $1 keeping p1 at Income. The Engineer's Red 3 − 1 = 2 runs two of three products of Red maintenance 1 (rev 2 each): 7 + 4 = 11, its $1 in the ops team keeping p1 at Income. Ops QA 1 + 1 − 1 = 1 against 2 Bugs on one product (4-2's shared step).
  - **Lines each example pins:** 1 the three Burnout lines and Burned out; 2 Giving synergy's Burnout line and the PM count line; 3 Poisoning's count line, Losing blue's poisoning line, Blue made and the Engine's Blue line; 4 Poisoning's onboarding line; 5 Losing red's lines, Red made and the Engine's Red line; 6 Losing qa's lines, QA made and the Engine's Bug line; 7 Pool losing blue's lines, Pool blue and the Blue supply line, and Pool losing red's `no card … blue` line (else Red 0); 8 Pool losing red's other lines, Pool red, the Red supply line, and Pool losing blue's owner line (else Blue −1); 9 Pool losing qa's lines, Pool qa and the QA supply line. Pool blue's and Pool red's `is 0` lines are pinned by 7 and 8 (the Toxic PM's value would stay nothing); the `… team output is more than 0` lines of the three Losing flags and Pool losing qa's two `no card` lines, by the made-values test above.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe (the lines named as pinned by the made-values test excepted, which that test fails without).
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Toxic Personality takes one cube off its team's total, Blue first, on a project and in the ops team, and Burnout leaves its staff member producing nothing and a PM giving no Synergy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: TechCrunch Feature with Hype, and Design Sprint

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` only if it pins an offered list the two new buttons join

**Interfaces:**
- Consumes: 6-1's lower-of payment and `goes up by {int} for each {attribute}`; 4-2's `Portfolio points:`; 4-1's `deal up to {int} cards from {zone} to {zone}`.
- Produces (rules): the count `hype`; worked flags `pitching`, `pitched`; the `Price:` section; the buttons `play a card from their strategy hand to a card in their operations` and `play a card in their strategy hand`.
- Produces (test file):

```ts
const PLAY_TO_PRODUCT = 'play a card from their strategy hand to a card in their operations';
const PLAY_ALONE = 'play a card in their strategy hand';
/** What a TechCrunch Feature on `product` costs `by`: the lower of the card's worked price and the product's, a side without one left out (§20.A). */
const techCrunchPrice = (runtime: LangRuntime, state: GameState, cardId: string, productId: string): number;
```

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₆ + 31; the designer page's count too. The values test adds `price` (`kind: 'number'`, `refines: true`) and `pitching`, `pitched` (flags). `shownFlags(game)` gains `'pitched'`; `standIns(game)` is unchanged. Pin what the view says if it differs, and report it.
  - **`scoreOf`** adds 5 for each `hype` on each of the seat's products in operations that are not `offline` (§12.1).
  - **Money (`keepsTheRules`):** a `PLAY_TO_PRODUCT` press pays `techCrunchPrice(runtime, before, cardId, ontoId)`; a `PLAY_ALONE` press pays nothing.
  - **Invariants:**
    - `hype` sits only on cards in an operations; a card's `hype` rises only in a `PLAY_TO_PRODUCT` press, by 1, on its target, and never falls;
    - a `PLAY_ALONE` press of a Design Sprint adds to the mover's backlog the cards the seed deck lost, at most 5;
    - a TechCrunch Feature, Design Sprint or Cease & Desist never sits in the attributes in play.
  - **The auto-player.**
    - **`utility()`**, a free move made at most once a turn, after `debuffing()`: a TechCrunch Feature it can pay for goes on its first product with a card on it that is `pitching`, else on its product at `t % n` in operations; else, when `t % 3 === 0`, a Design Sprint is played.
    - The cleanup's kept cards and the brainstorm keep policy already take these through `isPlayable`.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Cards.** After `  Cards can have workaholic, clean coder, visionary, toxic personality, burnout and flight risk.` add `  Cards can have hype.`
  - **Hype in the score** (§12.1, ruling 25). In `Portfolio points:`, right after `  A card's portfolio points is its val.`, add `  A card's portfolio points goes up by 5 for each hype.`
  - **The Sales Rep's price.** Right after the `Pool losing qa:` section add:

```text
Pitching:
  Only if it is a Rainmaker card.
  Only if it is not onboarding.

Pitched:
  Only if some card on it is pitching.

Price:
  A pitched card's price is 2.
```

  - **The Utility buttons** (§20.A, ruling 23). In `Phase: actions`, right after the Debuff button and its lines add:

```text
  A player may play a card from their strategy hand to a card in their operations.
    Only if the card is a TechCrunch Feature.
    Only if they have at least the lower of the card's price and the target card's price in capital.
    Then:
      They pay the lower of the card's price and the target card's price.
      The target card gains 1 hype.
      Move it to the strategy discard.
  A player may play a card in their strategy hand.
    Only if it is a Design Sprint card.
    Then:
      Deal up to 5 cards from the seed deck to their backlog.
      Move it to the strategy discard.
```

  - **Append these 6 examples.**

```text
Example: TechCrunch Feature adds 1 Hype to one of the player's products for $5 and no action, or $2 when a working Sales Rep is on that product (section 20, ruling 23)
  Given the phase is actions
  And p0 has 9 capital
  And p0's strategy hand has a TechCrunch Feature and a TechCrunch Feature
  And p0's operations has a Dating App and a To-Do List
  And the To-Do List in p0's operations has a Sales Rep on it
  When p0 plays a TechCrunch Feature to the Dating App
  Then it is accepted
  And p0 has 4 capital
  And p0 has 3 actions
  And the Dating App in p0's operations has 1 hype
  When p0 plays the TechCrunch Feature to the To-Do List
  Then p0 has 2 capital
  And the To-Do List in p0's operations has 1 hype
  And the strategy discard has a TechCrunch Feature and a TechCrunch Feature

Example: a Sales Rep reassigned to the product this turn gives no discount, and without the $5 TechCrunch Feature is refused and nothing changes (section 20, ruling 8)
  Given the phase is actions
  And p0 has 4 capital
  And p0's strategy hand has a TechCrunch Feature
  And p0's operations has a Dating App and a To-Do List
  And the To-Do List in p0's operations has a Sales Rep on it
  When p0 reassigns the Sales Rep to the Dating App
  And p0 plays the TechCrunch Feature to the Dating App
  Then it is rejected because "they have at least the lower of the card's price and the target card's price in capital"
  And p0 has 4 capital
  And p0's strategy hand has a TechCrunch Feature
  And the Dating App in p0's operations has 0 hype

Example: each Hype scores 5 points on an Active product, and nothing on an offline one (section 12, ruling 25)
  Given the crash pile has the Market Crash
  And it is p1's turn
  And p0's operations has a Dating App and a To-Do List
  And p0's ops team has a Junior Software Dev
  And the Dating App in p0's operations has 2 hype
  And the To-Do List in p0's operations has 1 hype
  And the To-Do List in p0's operations is offline
  When p1 ends their actions
  Then the game is over
  And p0 scores 16
  And p1 scores 1

Example: Design Sprint deals 5 cards from the Seed Deck to the backlog for $0 and no action, past the backlog's limit, and Cleanup cuts it back to 3 (section 20, section 5, the overview's call)
  Given p0's strategy hand has a Design Sprint
  And p0's backlog has a Smart Lock
  And the seed market has a Gig Economy and a Dev Tools
  And the seed deck has a To-Do List, a Dating App, a Mobile Wallet, a Smart Toy, a Tech Blog and a Pet Tracker
  When p0 plays the Design Sprint
  Then it is accepted
  And p0 has 3 actions
  And p0 has 7 capital
  And p0's backlog has 6 cards
  And the seed deck has a To-Do List
  And the strategy discard has a Design Sprint
  When p0 ends their actions
  Then the phase is backlog cleanup
  When p0 discards the Smart Lock
  And p0 discards the Pet Tracker
  And p0 discards the Tech Blog
  Then it is p1's turn
  And p0's backlog has a Dating App, a Mobile Wallet and a Smart Toy

Example: Design Sprint on a Seed Deck of 2 deals both (section 20, ruling 25)
  Given p0's strategy hand has a Design Sprint
  And the seed market has a Gig Economy and a Dev Tools
  And the seed deck has a Tech Blog and a Pet Tracker
  When p0 plays the Design Sprint
  Then p0's backlog has a Tech Blog and a Pet Tracker
  And the seed deck is empty

Example: each Utility card plays only as itself: a Design Sprint goes on no product, and a Cease & Desist waits in the hand for slice 8 (section 20, the spec's call)
  Given the phase is actions
  And p0's strategy hand has a Design Sprint and a Cease & Desist
  And p0's operations has a Dating App
  When p0 plays the Design Sprint to the Dating App
  Then it is rejected because "the card is a TechCrunch Feature"
  When p0 plays the Cease & Desist
  Then it is rejected because "it is a Design Sprint card"
  And p0's strategy hand has a Design Sprint and a Cease & Desist
```

  **How the numbers come** (§5 Phase D, §12, §20.A, §20.B, rulings 8, 23 and 25):
  - **TechCrunch Feature** (formerly "PR Campaign", ruling 23): +1 Hype on one of the player's Maintenance products for $5, $2 with a Sales Rep attached to it (§20.A, §20.B Rainmaker); an onboarding Rep's effects are cancelled (§6 Reassign, ruling 8). So 9 − 5 = 4, then 4 − 2 = 2; 4 < 5 is refused.
  - **Hype** scores +5 VP on an Active product; Offline products score 0 (§12.1). p0: 7 capital is 1 point; the Dating App's val 5 + 2 × 5 = 15; the To-Do List offline 0: 16. The Junior's Blue 1 runs the Dating App alone, so the game-end check leaves the To-Do List offline (§12.2). p1: 7 capital, 1.
  - **Design Sprint:** $0, draw 5 from the Seed Deck into the Backlog, fewer if it runs short; Cleanup discards down to 3 (§20.A, §5 Phase D step 7). A Given lists a pile bottom first, so the last 5 named are drawn. The seed market's two cards keep the build's refill off the deck.
  - **Lines each example pins:** 1 the TechCrunch button's guard on price, its payment, its Hype, its move, Pitched, Pitching's Rainmaker line and the `Price:` line; 2 Pitching's onboarding line and the price guard; 3 the Hype line in Portfolio points (and its place before the Offline line); 4 the Design Sprint button's deal and move; 6 both buttons' card guards. 5 is a guard (the deal stops short).
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's TechCrunch Feature adds Hype for $5, or $2 with a working Sales Rep on the product, Hype scores 5 points on an Active product, and Design Sprint deals 5 Seed cards to the backlog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 6: Long runs: every Attribute and Utility path tallied, whole games replayed; the README and the checks

**Files:**
- Modify: `src/games/startup-simulator.test.ts`, `README.md`

**Interfaces:**
- Consumes: every constant and policy above and in plans 4-2, 5-2a and 5-2b; `runtime.workedValue`, `workedFlag`, `playerValue`; `atTheEngine`, `ranTheEngine`, `enteredIncome`.
- **`happenings` gains these keys** (read through the runtime):
  - `an Attribute played: <card name>`, for each `PLAY_TRAINING` or `PLAY_DEBUFF` press of an Attribute card;
  - `a Buff on a bench card` and `a Buff on a Board card`, by the zone of a `PLAY_TRAINING` press's target of a Buff; `a Debuff on a development team card` and `a Debuff on an ops team card`, likewise for `PLAY_DEBUFF`;
  - `Attributes discarded with a fired Talent`, for each card that held a count in `before` and moved to the open job market in a dismiss, `LET_GO` or `PIVOT` press;
  - `Attributes kept through a bench discard`, for each card holding a count that moved from a bench to the open job market; `Attributes rehired`, for a `HIRE_MARKET` press of such a card; `Attributes boxed with an evicted Talent`, for each card holding a count in `before` that is in the box after;
  - `a Workaholic's +2 at the Engine`, in a move that ran the Engine for the mover, for each of its projects not `stalled` in `atTheEngine(before, move, after)` with an `overworked` card on it whose worked output in some colour is above 0;
  - `Clean Coder stopping the Hacker's Bug`, for an `ASSIGN_TO_PROJECT`, `REASSIGN_FROM_PROJECT`, `REASSIGN_FROM_OPS` or `HIRE_AGENCY_TO_PROJECT` press moving a `Spaghetti Code` card with `clean coder` 1 onto a project whose `bugs` did not rise; `Clean Coder shielding a viral product`, for a turn's end (the backlog cleanup's last press) of a seat with a `Viral Loop` card on a product and a card with `clean coder` 1 that is `clean coding`;
  - `a Visionary leading`, in a move that ran the Engine, for each project not Tier 1 of the mover with a card on it with `visionary` 1 that is `leading software` or `leading hardware`, and no other card on it leading;
  - `Toxic: a Blue cube taken`, `Toxic: a Red cube taken`, `Toxic: a Bug left`, in a move that ran the Engine, for each project of the mover that was `losing blue`, `losing red` or `losing qa` at the Engine; `Toxic in the ops team`, for the seat that reached Income, for each card of its ops team that was `pool losing blue`, `pool losing red` or `pool losing qa`;
  - `Burnout: a unit idle`, in a move that ran the Engine, for each `burned out` card on a project of the mover; `Burnout: a PM giving no Synergy` likewise for a burned-out card that is `managing`;
  - `TechCrunch for $5` and `TechCrunch for $2 with a Sales Rep`, by what a `PLAY_TO_PRODUCT` press paid; `Hype scored`, for the move that set the result, for each seat with an online product holding `hype`;
  - `Design Sprint dealing 5` and `Design Sprint dealing fewer`, by how many cards a `PLAY_ALONE` press added to the backlog.

- [ ] **Step 1: Write the tests.**
  - **`'made every move in those runs …'`** also expects above 0: `PLAY_DEBUFF`, `PLAY_TO_PRODUCT`, `PLAY_ALONE`.
  - **Append `it('played slice 6’s Strategy cards in those runs: every Attribute on its targets, Attributes discarded, kept, rehired and boxed, their effects at work, TechCrunch at both prices, Hype scored and Design Sprints')`.** It expects every key above above 0.
  - **Append `it('takes back the last move and rebuilds whole games from their logs, through Attribute plays, strips, a TechCrunch Feature and a Design Sprint (Review Focus: 3 players, seeds 1 to 5)')`.** Play each game to its result, keeping the state before each move; a fresh engine given `loadLog(log)` equals the final state, and `engine.undo()` gives the state before the last move. Across the five logs some log holds a `PLAY_DEBUFF`, a strip (an Attribute card reaching the strategy discard) and a `PLAY_TO_PRODUCT` (count them through the watch).
  - **Kept as they are:** `'plays the same game through the page’s view as without it'` (now through the Debuff's targets in other seats' zones) and every earlier tally.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`.
  - If a required key stays at 0, print the tally and change the auto-player (`training()`'s Buff targets, `debuffing()`'s cadence, `utility()`'s cadence, the brainstorm keep order, the bench cleanup's discard order putting a Buffed bench card out first for `Attributes kept through a bench discard` and `… boxed …`), never the rules.
  - Report a key that stays unreachable, with the tally, and pin its path with an arranged test in the shape of 4-2's `'cleans the Bug the auto-player picks …'`.
- [ ] **Step 3: Write the README.** In the Startup paragraph, after plan 5-2b's sentence, add: the six Attributes go on a Talent as counts, their cards parked until the Talent is fired (then discarded) or evicted (then boxed); Workaholic, Clean Coder, Visionary, Toxic Personality and Burnout change output, salary, Bugs, leads and Synergy, and Flight Risk waits for poaching; TechCrunch Feature adds Hype, which scores; Design Sprint deals 5 Seed cards. Its rulings list adds 23. "It still leaves out" drops the Attributes and the Utility cards but Cease & Desist, and keeps the Events (plan 6-2b).
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

  Also read every number in the new examples against each task's "How the numbers come", and run the removal probe once more over every line this plan added or changed (the lines named as pinned by a test excepted).
- [ ] **Step 6: Run the games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
- [ ] **Step 7: Commit**

```bash
git add src/games/startup-simulator.test.ts README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's long runs play every Attribute on its targets, strip, keep, rehire and box them, and play TechCrunch Feature and Design Sprint at 2 to 5 players, every path tallied and whole games rebuilt from their logs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Forward notes

- **Plan 6-2b** builds on `blue made` / `red made` / `qa made` (Crunch Time adds its cube after Toxic's, in new `blue added` / `red added` values the Engine reads), the outputs (the Events' lines go after the Workaholic lines and before the mode lines, Burnout staying last), `Rev:`, `Bug decay:`, `Price:` (Online Course Boom and Trade Show) and the counts (a Regulation Audit let-go fires its staff through the same strip).
- **Plan 6-3 (the page):** the counts as labels under their Talent (5-3's lone-count labels), Hype as a label on the product; the attributes in play pile on the shared table; the Debuff picker over other seats' cards (6-1's Left-to-6-3); the bandwidth gauges (Gap 1); `burned out`, `losing blue/red/qa`, `overworked` and `pitched` are new shown flags.
- **Slice 8** reads `flight risk` (the poach multiplier ×1), counts the six Attribute counts in a poached Talent's Token Value (+$2 each), keeps them on a poached Talent (§15.C, §16.D.3), and makes Cease & Desist playable in its reaction window.

## Gaps against plan 6-1

1. **The ops pool's Toxic cube takes the supplies off the page.** 6-1's Architecture puts the cube on a value of the Toxic card that reads its owner's ops team (5-1's owner scope), and makes the supplies totals of it. Owner scope is not card-only, so 4-3's `shownPlayerValues` stops showing `blue supply`, `red supply` and `qa supply`, and the bandwidth gauges leave the page from Task 4 until 6-3 lets an owner-scope test of a zone everyone sees count as public (or a language follow-up adds a player value that goes down by a number). Task 4 pins the view as it then is and reports it.
2. **A press naming a card no button offers can't be said to be refused.** A Debuff aimed at a rival's bench finds no button (P16 finds no target zone holding the card), so an example fails with "I can't find …" instead of `it is rejected`. Task 1 pins the targets with `ontoCandidates` instead.

Everything else is written with plans 4-1, 5-1 and 6-1's phrases. These calls follow from what the language reads, and are listed so a later plan can revisit them:
- The six alternatives of `Holding attributes:` are each pinned only because each evicted card in Task 2's examples holds one Attribute.
- Three `… team output is more than 0` lines and two pool `no card` lines change only values no example can read directly (a made value below 0); Task 4's made-values test pins them.
