# Startup Simulator Slice 4-2 (Rules text and long runs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Startup Simulator plays slice 4: flex Seniors and the Fixer work in a declared mode, Income checks each player's Blue and Red Ops bandwidth and lets them switch products Offline, Bugs come from the Hacker and the Growth Hacker, cost revenue and block Launch, QA staff clean them, the Growth Hacker sits on its product, the Architect shields, and a final Ops check runs before the score. The long runs play all of it at 2 to 5 players.

**Architecture:**
- **Plan 4-2 of three** (spec R10). Plan 4-1 (language) is built first; plan 4-3 (the page) comes after. This plan writes only the rules text, its examples and the long runs. It adds no phrase and changes no shared code.
- **Six tasks:**
  1. modes, and Income rebuilt as phases;
  2. the ops check and Offline;
  3. Bugs and QA;
  4. the Growth Hacker, the Architect and the two marked teams (R5, M1);
  5. the final check before the score (R1);
  6. long runs: every new path tallied, whole games replayed; the README and the checks.

  Each rules task keeps the existing long runs passing. It adds the auto-player's handling of the phase it creates, and the long-run invariants its rule needs. Task 6 adds the tallies.
- **Phases, in order** (the first is where a turn starts, and "the turn passes to the left" runs no start lines there):
  - `modes`, then `ops check`, then `income`, `actions`, `research`, `sourcing`, `engine`, `commit`, `bench cleanup`, `backlog cleanup`;
  - then `final check`, reached only through the End's steps.

  `modes` has no start lines. Its go-to skips it when no card on the Board is declarable. `ops check` clears Offline on entry, and a rule leads to `income` when everything fits. `income` earns revenue and Market Share in its start lines, no longer a turn-start rule (R2), so End is still checked before any go-to.
- **Builder calls this plan makes** (the spec leaves wordings and the auto-player to the builder):
  - **The declaration** is one button per Board zone, `declare a card in their development team` / `… ops team`, with a block of options `Blue:`, `Red:`, `QA:`. Examples say `…, choosing red`. `confirm their modes` ends it.
  - **The Offline buttons:**
    - `switch off a card in their operations` and `switch on a card in their operations`, in the ops check and in the final check;
    - `confirm the products online` in the ops check only.

    In the final check, the rule that passes the step on fires as soon as the Online set fits, so a confirm there could never be pressed. A player who must choose switches products on first, then off.
  - **"Everything fits" and "the Online set fits"** need two colors, so they are `When …:` rules with an `Only if` line, never go-to lines. R1's "bring everything back Online" is such a rule. It is written before the pass-on rule and stops holding once nothing is Offline (P5).
  - **Ops QA (R3).**
    - Automatic only at the step's start (`Only if their qa spent is 0`): every Bug when the QA covers them all; the shared total, first card first, when one product alone has Bugs.
    - "One product alone" is counted through a worked flag `bugged` and a value `bug mark`.
    - Otherwise each `clean a card in their operations` press removes 1 Bug and counts it as `fixed bugs` on that product. The counts are cleared as the step ends.
  - **The Growth Hacker's Bug and the shield** are one `If …,` line in the turn's last rule, over a worked flag `viral` on products ("some card on it is spreading bugs").
  - **R5's "… to a card in their operations" routes keep the rulebook's verbs:** `assign some cards from their bench …`, `hire a card from the agency row …`, `hire some cards from their scouting …` and the §6 `reassign a card from their ops team …`. Each sits beside the development form of the same verb. An example such as `When p0 assigns the Growth Hacker to the To-Do List` presses the operations form because the To-Do List is in p0's operations (plan 4-1's P16). Following R5:
    - each route puts an attaching card on the target and sends any other card to the pool;
    - the untargeted forms refuse an attaching card.
  - **The Growth Hacker's +$3 is not cancelled by Onboarding.** Every turn start clears every Onboarding Token, so no Income ever sees one.
- **Names.**
  - Flags kept on cards: `red mode`, `qa mode`, `offline`.
  - Counts: `bugs`, `fixed bugs`.
  - Worked numbers:
    - new: `qa output`, `qa team output`, `blue bandwidth`, `red bandwidth`, `rev bonus`, `portfolio points`, `bug mark`;
    - refined: `rev`.
  - Worked flags: `declarable`, `bugged`, `attaching`, `spreading bugs`, `viral`.
  - Player values: `blue supply`, `red supply`, `blue demand`, `red demand`, `blue load`, `red load`, `qa supply`, `bug load`, `qa spent`, `bugged products`. Plan 4-3 pairs `… supply` with `… demand` for the gauges; `… load` counts every product, Offline ones too.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-4-modes-ops-bugs-design.md` is binding. Its "Builder-check rulings" R1–R10 win over its body; this plan is R10's 4-2. It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding, with its anti-goals and its rule "every number comes from the rulebook, and examples say where". The other inputs:
- plan 4-1 (`docs/superpowers/plans/2026-10-16-startup-slice-4-1-language.md`) and its pre-flight (`.superpowers/sdd/2026-10-16-startup-slice-4-1-language/preflight.md`: P1, P5, P14, N1, N3, N4);
- `builder-check-startup-4.md` (D1–D12) in the session scratchpad;
- `suwa/rulebook.md` v6.0 §5 Phase B and D, §6, §9.A, §11.C.2, §12, §20.B, §20.C, §20.E, Rulings #4, #5, #8, #14, #19, #24, #25;
- where those are silent, suwa's `phases/engine.rs`, `ops_bandwidth.rs` and `talent_output.rs`.

## Global Constraints

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.** This plan adds no key: flags and counts live in the rules text.
- **No Startup Simulator words in shared code.** The banned list includes tag, lead, license, tier, stall, sector, expertise, mode, bandwidth, bug, qa, online, offline, maint, supply, demand, with plan 1b-2's words. This plan touches no shared code.
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged. Rent Day keeps its 108 examples.
- **Every number comes from the rulebook, and examples say where:** a section or ruling in each title, as the existing examples do.
- **Files this plan changes:** `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md`, and test lines under `src/pages/designer/**` that pin Startup's rules text (controller ruling). Those are the Startup example count in `designer-page.test.tsx` and the offered-button lists and `HIRES` in `playtest-fitted.test.tsx`. No page source changes, and nothing under `src/engine/**`. Each task's Files list names the test files it touches.
- **Depends on plan 4-1's P16:** an example's press is narrowed by the zone of the target card it names. Task 4's examples, and the existing examples of the development forms, rely on it.
- **Pre-flight rulings carried from plan 4-1:**
  - **P-17 / N1:** no `Go to` in a round-start line.
  - **N3:** game-end examples reach the steps through the round end; no Given sets `lang:end-steps`.
  - **P1:** the final check phase has no go-to line, no After line and no "the turn passes to the left".
  - **P14:** Task 4 re-marks the development team `…, where every card is on a card in their development`, which closes 1b-2's M1, as well as the ops team.
  - **N4:** Market Share keeps `For each card in their operations whose rev is more than 0`; an Offline product's `rev` is 0.
- **Anti-goals (spec and overview):**
  - a product changing Online state outside Income and the final check;
  - an Offline set that leaves the Online products over bandwidth;
  - a game that can't end;
  - an auto-player that hides a rule that never fires;
  - a rule approximated without a recorded call.
- **Example counts.** N₂ is the count the committed test pins (`results` length) when Task 1 starts: 101 at `a2b422e`, plus whatever plan 3-1's fix wave and plan 3-2 add. The tasks end at N₂ + 7, + 15, + 26, + 34 and + 39. Each task updates `results` in `startup-simulator.test.ts`, the Startup test in `designer-page.test.tsx` and the README's "Its N examples".
- **Commands.**
  - Single file: `bunx vitest run src/games/startup-simulator.test.ts`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1:
    - record `BASE=$(git rev-parse HEAD)`;
    - run `bun run test` once for the passing count and the long runs' time;
    - note N₂.
- **Existing tests.** Only the lines each task names change. If any other existing test fails, stop and report it.
- **Long runs.** If an invariant shows a wrong rule, fix the rules text. If a tally stays at 0, change the auto-player, never the rules. If a rule can't be written with plan 4-1's phrases, report it. If the long runs take more than a third longer than at BASE, report the timing.
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefix `feat(games):` (`docs:` for a README-only commit).
  - TDD every task: change the test first, watch it fail, then the rules, pass, `bun run typecheck`, commit.
  - Every rules line below is exact copy. Insertion points name a line or section by its text, never by a line number.

## Review Focus

- **Ops QA partway through its step, when one product is left with Bugs or the QA covers what is left.**
  - Expected: the automatic lines fire only at the step's start. Partway through, each Bug costs a press, and the QA never cleans more Bugs than it has. With no QA and Bugs on two products, the Engine goes straight on.
  - Test: Task 3, the Review Focus test.
- **A flex Senior or the Fixer moving about the Board.**
  - Expected: a declared mode stays on a card that moves between projects and the ops team, and is lost as the card leaves the Board (bench, open job market).
  - Test: Task 1's long-run invariant, with examples 4 and 7.
- **The last player's staff still onboarding at the final check.**
  - Expected: they give no bandwidth there, since no turn start has cleared the token.
  - Test: Task 5, example 39.
- **A product's Offline state between Incomes.**
  - Expected: a Launch, a recall, an assign or a dismissal mid-turn never takes a product Offline or brings it back. Only the owner's ops check and the final check change it.
  - Test: Task 2's long-run invariant, with examples 11 and 12.
- **Undo and replay across a declaration's choice, a join's Bug, an Ops QA press and the final check.**
  - Expected: the log alone rebuilds the finished game, and undo of the last move gives the state before it.
  - Test: Task 6.

## Assumed from earlier plans (check before Task 1)

Plan 4-1 is built with its pre-flight rulings, and so is plan 3-2, after plan 3-1's fix wave. Re-read each item; if one is missing or differs, stop and report it.

- **4-1 phrases** (its Interfaces blocks):
  - values: `a {cardflag} card's {attribute} is its {attribute}`, `a card's {attribute} goes up by the total {attribute} of {cardgroup}`, `a card's {attribute} is at least {int}`;
  - player values: `a player's {playervalue} is the total {attribute} of {cardgroup}`, with conditions `their {playervalue} is at least their {playervalue}`, `… is more than their …`, `… is {int}`;
  - group flag tests: `the cards in … that are (not) …`;
  - conditions: `they have (no) card in {zones} {cardclause}`, `some card in {zones} is {cardflag}`, `no card in {zones} is {cardflag}`;
  - effects: `every card in {zone} is not {cardflag}`;
  - card rules: `a card in a {perzone} is {cardflag}`, `a card in {sharedzone} is {cardflag}`;
  - numbers going down: `its {attribute} go down by its {attribute}`, `it loses {int} {attribute}`, `its {attribute} are {int}`, and `{cardgroup} lose {attribute} between them, up to their {playervalue}, first card first`;
  - the join moment `{cardclass} joins a card in a {perzone}`, with `the card it joins gains {int} {attribute}`;
  - zone lines `…, where every card is on a card in their {name}` and `…, where some cards are on cards in their {name}`, with the Given picking the marked zone by the holder's zone;
  - placement: `the picked cards that are (not) {cardflag} go to {zone}[, on the target card]`, `no picked card is {cardflag}`, `it is on a card`, `every card on it that is (not) {cardflag} goes to {zone}[, staying on it]`;
  - the End line `Before the score, each player has the {phase}, in turn from the start player.` and the effect `The {phase} passes to the left.`;
  - the expect `{player}'s {playervalue} is {int}`.
- **4-1's P16:** with a Vase in a workshop and a Statue on a shelf, `When p0 hires a Potter to the Vase` and `When p0 hires a Smith to the Statue` each press their own `hire … to a card in …` button (its `card-pick-phrases.test.ts` tests pass).
- **4-1 runtime:** `LangRuntime.playerValue(state, seat, name)`, `CompiledGame.playerValues`, `END_STEPS_KEY` (`turns.ts`), `ZoneSpec.onCards: 'every' | 'some'` and `holders`.
- **3-2:** `standIns` and `shownFlags` (`lang/worked-view.ts`), and `seatExtras(…).worked`. If 3-2 put its `describe('what the view says the rules work out')` into `startup-simulator.test.ts`, Tasks 1–3 change its pins. Each task reads the pins from the committed test when it starts, since 3-2 is still being executed, and applies only the change it names (see "Forward notes for plan 4-3"). The product tables' column order is 3-2's.
- **The rules text** (by text): `Stalled:` starts `Only if it is in a development.`; `In every phase:` holds the refill and FIFO rules; `Phase: income` has `When a player's turn starts:` with the revenue and Market Share lines; the actions, sourcing, engine and backlog cleanup phases are as at `a2b422e`.
- **The test file** (names, not lines): `arrange`, `setUp`, `idOf`, `fresh`, `playTurn`, `playGame`, `keepsTheRules`, `keepsTheBudget`, `happenings`, `turnsIn`, `turnStarted`, `ranTheEngine`, `atTheEngine`, `scoreOf`, `payrollOf`, `viewedCards`, `buttonOf`, `Onto`, `onProject`, `pick`, `pickSome`, `PHASES`, `BEFORE_THE_ENGINE`, `REASSIGNS`, `AGENCY_HIRES`, `SOURCE_HIRES`, `HIRES`, `EARNS`, `LET_GO`, `DIVA_REFUSED`, and the long-run `describe` with its tallies.

---

### Task 1: Modes, and Income rebuilt as phases

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: plan 4-1's player values, `a {cardflag} card's … is its …`, the card rules for flags, `no card in {zones} is {cardflag}`, the expect `{player}'s {playervalue} is {int}`.
- Produces (rules): flags `red mode`, `qa mode`; worked `blue bandwidth`, `red bandwidth`, flag `declarable`; player values `blue supply`, `red supply`; phase `modes`; buttons `declare a card in their development team`, `declare a card in their ops team`, `confirm their modes`.
- Produces (test file, for later tasks):

```ts
/** The buttons that declare a mode, by the Board row they pick from (§11.C.2). */
const DECLARE: Record<string, string>;      // 'development team' | 'ops team' → 'declare a card in their … team'
const CONFIRM_MODES = 'confirm their modes';
/** The phases a turn passes through before its Income; Task 2 adds 'ops check'. */
const PRE_INCOME: string[];                  // ['modes']
/** The seat that reached its Income in the move: its turn started in the move or it was in a PRE_INCOME phase, and it is now past them with no result. Null for a move that reached none. */
function enteredIncome(before: GameState, after: GameState): PlayerId | null;
```

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₂ + 7, all `pass`.
    - `PHASES` gains `'modes'` first; the setup test's comment says a turn starts in modes, skipped with no flex staff on the Board.
    - `BEFORE_THE_ENGINE` gains `'modes'`.
  - **Append** `it('works out slice 4’s values for cards and players (§5, §11.C.2, §20.B)')`:
    - `game.worked` has `blue bandwidth` and `red bandwidth` (`kind: 'number'`, `refines: false`) and `declarable` (`kind: 'flag'`);
    - `Object.keys(game.playerValues!)` is `['blue supply', 'red supply']`.

    Tasks 2–4 extend both lists.
  - **3-2's pin, if present:** `standIns(game)` also maps `'blue output'` to `'blue bandwidth'` and `'red output'` to `'red bandwidth'`.
  - **Money and Market Share are earned on the move that reaches Income** (R2), in `keepsTheRules` and in `happenings`' `EARNS`:
    - `earned(seat)` and `earners(seat)` use `enteredIncome(before, after)` in place of `turnStarted`;
    - the rev is read as the rules work it out: `runtime.workedValue(after, id, 'rev')`.
  - **Invariant (Review Focus 2):**
    - after every move, no card outside a development team and an ops team has `red mode` or `qa mode`;
    - `red mode` sits only on a declarable card, and `qa mode` only on a `QA Skill` card;
    - a card's `red mode` or `qa mode` changes in a move only when the move is a declare press of that card, or the card left both teams in it.
  - **The auto-player in `modes`:**
    - When `t % 4 === 3`, it presses `confirm their modes` at once.
    - Otherwise it declares each card of its Board for which `runtime.workedFlag(state, id, 'declarable')` holds, once each: the development team's first, then the ops team's, in slot order. Each press goes through `pick`, so its choice is answered with option `(t + at) % options.length`. Then it confirms.
  - **Designer page:** the Startup test's name and text read N₂ + 7.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`. Expected: FAIL (the count, `PHASES`, the new values).
- [ ] **Step 3: Change the rules text.**
  - **Cards.** After `  Cards can be onboarding.` add:

```text
  Cards can be red mode.
  Cards can be qa mode.
```

  - **Output.** In `Blue output:`, before `  An onboarding card's blue output is 0.`, add `  A red mode card's blue output is 0.` In `Red output:`, before `  An onboarding card's red output is 0.`, add `  A red mode card's red output is its output.` and `  A qa mode card's red output is 0.`
  - **Bandwidth.** After the `Red team output:` section add:

```text
Blue bandwidth:
  A card's blue bandwidth is its blue output.

Red bandwidth:
  A card's red bandwidth is its red output.
```

  - **Declarable.** After the `Salary:` section add:

```text
Declarable:
  Only if one of:
    It is a flex card.
    It is a QA Skill card.
```

  - **Supply.** After the `Feature complete:` section add:

```text
Blue supply:
  A player's blue supply is the total blue bandwidth of the cards in their ops team.

Red supply:
  A player's red supply is the total red bandwidth of the cards in their ops team.
```

  - **Forgetting** (R4). At the end of `In every phase:` add:

```text
  When a card in a bench is red mode:
    It is not red mode.
  When a card in a bench is qa mode:
    It is not qa mode.
  When a card in the open job market is red mode:
    It is not red mode.
  When a card in the open job market is qa mode:
    It is not qa mode.
```

  - **The modes phase.** Right before `Phase: income` add the block below. Task 2 changes its two `income` targets to `ops check`.

```text
Phase: modes
  Hint: Choose what each flex Senior and the Fixer work on this turn: Blue or Red, or Bugs for the Fixer. Each keeps its mode until you change it.
  A player may declare a card in their development team.
    Only if it is declarable.
    Then:
      They choose one:
        Blue:
          Only if it is a flex card.
          It is not red mode.
        Red:
          It is red mode.
          It is not qa mode.
        QA:
          Only if it is a QA Skill card.
          It is qa mode.
          It is not red mode.
  A player may declare a card in their ops team.
    Only if it is declarable.
    Then:
      They choose one:
        Blue:
          Only if it is a flex card.
          It is not red mode.
        Red:
          It is red mode.
          It is not qa mode.
        QA:
          Only if it is a QA Skill card.
          It is qa mode.
          It is not red mode.
  A player may confirm their modes.
    Then:
      Go to income.
  When no card in their development team and their ops team is declarable, go to income.
```

  - **Income.** In `Phase: income`, `  When a player's turn starts:` becomes `  When this phase starts:`. Its two lines stay as they are.
  - **Examples that arrange the current seat's products.** At build, the chain of skips now runs income's start lines, so such an example would be paid revenue before its first step. Every example applies this rule:
    - it puts a card in the operations of the seat whose turn it is when the engine is built (the first When or Then);
    - it has no `the phase is …` Given;
    - it crosses no Income.

    Such an example gets `Given the phase is actions` as its first line, its old first `Given` becoming `And`. When its first line is `Given 3 players` or `Given 4 players`, it gets `And the phase is actions` right after that line. At `a2b422e` this covers:
    - "a Tier 2 Greenlight is free when you provide its Tag";
    - "a player who provides the Tag pays nobody, even when rivals provide it too";
    - "a player who provides one of a Tier 3's Tags pays a License only for the other, …";
    - "a player who provides both of a Tier 3's Tags Greenlights it with no capital at all";
    - "card text wins: NFT Marketplace needs Platform, not Commerce";
    - "an Active product of the sector cuts 2 cubes, Tier 1 included";
    - "no Domain Expertise for Infrastructure or the Concept cards";
    - "a hybrid's owner chooses how to split the cut";
    - "the cut is locked at Greenlight";
    - "Domain Expertise never takes a product below 1 cube";
    - the five cut examples "a hybrid cut 1 of each …", "a pure Hardware product is cut 2 red …", "a hybrid of 1 blue can't be cut 2 blue …", "a hybrid of 2 blue and 1 red …", "a hybrid of 1 blue and 2 red …", and "a pure Hardware product of 2 red is cut by 1, …";
    - "Greenlighting without a lead is allowed, and the project is Stalled";
    - "the ops team takes staff only while operations runs a product" (R2: examples that arrange Ops products name their phase);
    - 3-2's Stalled example, if present.

    Re-read the file for others added since.
  - **Rename** "flex staff work in blue until modes arrive (section 11)" to `a flex Senior with no mode declared works in Blue (section 11, ruling 24)`.
  - **Append these 7 examples.**

```text
Example: a Firmware Specialist declared Red gives Red bandwidth for the turn (section 11, section 5)
  Given p1's operations has a Smart Lock
  And p1's ops team has a Firmware Specialist
  And the turn passes to the left
  Then the phase is modes
  And p1's blue supply is 2
  And p1's red supply is 0
  When p1 declares the Firmware Specialist, choosing red
  Then p1's red supply is 2
  And p1's blue supply is 0
  When p1 confirms their modes
  Then the phase is income
  And p1 has 9 capital

Example: a declared mode stays until the next declaration, so confirming keeps Red (section 11, this slice's call)
  Given p1's operations has a Smart Lock
  And p1's ops team has a Firmware Specialist
  And the Firmware Specialist in p1's ops team is red mode
  And the turn passes to the left
  Then the phase is modes
  And p1's red supply is 2
  When p1 confirms their modes
  Then the phase is income
  And p1 has 9 capital

Example: a flex Senior hired onto a project after the declaration works in Blue (section 11, ruling 24)
  Given the phase is actions
  And the agency row has a Firmware Specialist, the Hacker, the Architect and the Veteran
  And p0's development has a Smart Lock
  When p0 hires the Firmware Specialist to the Smart Lock
  And p0 ends their actions
  Then the Smart Lock in p0's development has 1 blue cube
  And the Smart Lock in p0's development has 0 red cubes

Example: staff recalled to the bench forget their declared modes, so a flex Senior assigned again works in Blue (section 11, ruling 24)
  Given the phase is actions
  And p0's operations has a Smart Lock
  And p0's ops team has a Firmware Specialist and the Fixer
  And the Firmware Specialist in p0's ops team is red mode
  And the Fixer in p0's ops team is qa mode
  And p0's development has a Smart Toy
  When p0 recalls the Firmware Specialist and the Fixer
  Then the Firmware Specialist in p0's bench is not red mode
  And the Fixer in p0's bench is not qa mode
  When p0 assigns the Firmware Specialist to the Smart Toy
  And p0 ends their actions
  Then the Smart Toy in p0's development has 1 blue cube
  And the Smart Toy in p0's development has 0 red cubes

Example: the Fixer hired onto a project after the declaration works in Red, its own color (section 11, section 20)
  Given the phase is actions
  And the agency row has the Fixer, the Hacker, the Architect and the Veteran
  And p0's development has a Smart Lock
  When p0 hires the Fixer to the Smart Lock
  And p0 ends their actions
  Then the Smart Lock in p0's development has 3 red cubes

Example: with no flex Senior or Fixer on the Board the turn has no declaration, though one waits on the bench (section 5, section 11)
  Given p1's development has a Smart Lock
  And the Smart Lock in p1's development has the Engineer on it
  And p1's bench has a Firmware Specialist
  And the turn passes to the left
  Then it is p1's turn
  And the phase is income

Example: staff dismissed from the Board forget their declared modes in the open job market (ruling 24)
  Given the phase is actions
  And p0's operations has a Smart Lock
  And p0's ops team has a Firmware Specialist and the Fixer
  And the Firmware Specialist in p0's ops team is red mode
  And the Fixer in p0's ops team is qa mode
  When p0 dismisses the Firmware Specialist
  And p0 dismisses the Fixer
  Then the open job market has a Firmware Specialist and the Fixer
  And the Firmware Specialist in the open job market is not red mode
  And the Fixer in the open job market is not qa mode
```

  **How the numbers come** (§20.B, §20.C):
  - The Firmware Specialist is flex, output 2, salary $2. The Fixer is Hardware, output 3, cost $7; the Firmware Specialist costs $6.
  - The Smart Lock costs 1 Blue / 5 Red, earns rev 2 and has maintenance 0/1. The Smart Toy costs 1 Blue / 3 Red.
  - Income: 7 + 2 = 9, and the $2 salary keeps the seat at Income.
  - A flex Senior's 2 Blue is capped at the Smart Lock's and the Smart Toy's 1-cube Blue need. The Fixer's 3 Red goes on the Smart Lock.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`. The long runs pass with the modes step: some seats stop in it and confirm.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's flex Seniors and the Fixer work in a declared mode, forgotten off the Board, and Income runs as its own phase after the declaration

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: The ops check and Offline

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes Task 1's phases, `enteredIncome` and `PRE_INCOME`.
- Produces (rules): flag `offline`; `rev` refined; `portfolio points`; player values `blue demand`, `red demand`, `blue load`, `red load`; phase `ops check`; buttons `switch off a card in their operations`, `switch on a card in their operations`, `confirm the products online`.
- Produces (test file): `SWITCH_OFF`, `SWITCH_ON` and `CONFIRM_ONLINE` (those move types); `PRE_INCOME` becomes `['modes', 'ops check']`; `shortOf(runtime, state, seat): ('blue' | 'red')[]`, the colors whose supply is below their demand.

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₂ + 15.
    - `PHASES` gains `'ops check'` after `'modes'`, and `BEFORE_THE_ENGINE` gains it too.
    - The values test adds `rev` (`kind: 'number'`, `refines: true`) and `portfolio points` (number). `playerValues` adds `'blue demand', 'red demand', 'blue load', 'red load'`, in that order.
  - **3-2's pins, if present:**
    - `standIns(game)` also maps `val` to `'portfolio points'`;
    - in its `seatExtras(…).worked`, each product's `columns` gains `val`: the Neobank 10, the Viral Video App 3, the Search Engine 8.
  - **`'asks an example which hire it means when both rows hold the card…'`:** each generated example that arranges `p0's operations has a To-Do List` gains `  And the phase is actions` after its first line.
  - **`'checks the salaries a seat pays at Income …'`:** p1's operations hold a Smart Lock in place of the USB Gadget, since the Engineer's Red runs it (maintenance 0/1). p1 is at Income with 9 capital (7 + rev 2), and 8 after paying.
  - **`scoreOf`** adds the val of only the seat's products in operations that are not `offline` (§12, ruling 5).
  - **Invariants (Review Focus 4):**
    - After a move with `enteredIncome(before, after) === S`, S's blue supply is at least its blue demand and its red supply at least its red demand, read through `runtime.playerValue`.
    - A product's `offline` changes in a move only when its owner S:
      - pressed in its ops check (`before`: S's turn, phase `ops check`);
      - is in its ops check after the move;
      - or reached its Income in the move.
  - **The auto-player in `ops check`:**
    - When `t % 3 === 0` and it has pressed nothing in this ops check, it switches off its first product in operations and switches it on again.
    - Then, while `confirm the products online` is refused, it switches off a product:
      - among its online products with maintenance above 0 in a color of `shortOf`;
      - the first on an even `t`, the last on an odd `t`.
    - Then it confirms.
  - **Designer page:** N₂ + 15.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Cards.** After `  Cards can be qa mode.` add `  Cards can be offline.`
  - **After the `Declarable:` section** add:

```text
Rev:
  An offline card's rev is 0.

Portfolio points:
  A card's portfolio points is its val.
  An offline card's portfolio points is 0.
```

  - **After the `Red supply:` section** add:

```text
Blue demand:
  A player's blue demand is the total blue maint of the cards in their operations that are not offline.

Red demand:
  A player's red demand is the total red maint of the cards in their operations that are not offline.

Blue load:
  A player's blue load is the total blue maint of the cards in their operations.

Red load:
  A player's red load is the total red maint of the cards in their operations.
```

  - **Modes.** `      Go to income.` becomes `      Go to ops check.`, and `…is declarable, go to income.` becomes `…is declarable, go to ops check.`
  - **The ops check.** Between `Phase: modes` and `Phase: income` add:

```text
Phase: ops check
  Hint: Your ops team can't run all your products. Switch some off until the rest fit your Blue and Red bandwidth, then confirm. A product switched off earns nothing.
  When this phase starts:
    Every card in their operations is not offline.
  A player may switch off a card in their operations.
    Only if it is not offline.
    Then:
      It is offline.
  A player may switch on a card in their operations.
    Only if it is offline.
    Then:
      It is not offline.
  A player may confirm the products online.
    Only if their blue supply is at least their blue demand.
    Only if their red supply is at least their red demand.
    Then:
      Go to income.
  When their blue supply is at least their blue load:
    Only if their red supply is at least their red load.
    Go to income.
```

  - **Domain Expertise** (R2, ruling 5). In the greenlight's block, `        Only if they have a card in their operations whose sector is the card's sector.` becomes `        Only if they have a card in their operations that is not offline and whose sector is the card's sector.`
  - **The score** (R7). `  Each card in a player's operations scores its val.` becomes `  Each card in a player's operations scores its portfolio points.`
  - **Three 1b examples cross an Income with products and no bandwidth**, so they get Ops staff:
    - "income pays the total rev of the products in operations, …": after its first line add `  And p1's ops team has the Architect and the Veteran`, and its last line becomes `  And the phase is income`. The $4 of salaries keep p1 at Income.
    - "salaries are paid for every staff member on the board": `  And p1's ops team has a QA Engineer` becomes `  And p1's ops team has a QA Engineer and a Junior Software Dev`.
    - "the Engineer's salary is $1 in the ops team": `  And p1's ops team has the Engineer and a Junior QA Tester` becomes `  And p1's ops team has the Engineer and a Junior Software Dev`.
  - **Append these 8 examples.**

```text
Example: at Income an ops team with the bandwidth in both colors runs every product, and each earns (section 5, ruling 19)
  Given p1's operations has a Dating App and a Smart Lock
  And p1's ops team has a Junior Software Dev and a Junior Hardware Eng
  And the turn passes to the left
  Then it is p1's turn
  And the phase is actions
  And p1 has 10 capital
  And p1 has 2 market share

Example: short of Blue at Income, the player switches off a product of their choice, which earns nothing and no market share (section 5, ruling 19, ruling 24)
  Given p1's operations has a Dating App and a Mobile Wallet
  And p1's ops team has a Junior Software Dev
  And the turn passes to the left
  Then it is p1's turn
  And the phase is ops check
  And p1 has 7 capital
  When p1 confirms the products online
  Then it is rejected because "their blue supply is at least their blue demand"
  When p1 switches off the Dating App
  And p1 confirms the products online
  Then it is accepted
  And the phase is actions
  And the Dating App in p1's operations is offline
  And p1 has 9 capital
  And p1 has 1 market share

Example: a product with maintenance in both colors runs only when both fit: Drone Delivery goes offline with only Blue in the ops team (section 5, ruling 19)
  Given p1's operations has a Drone Delivery and a Dating App
  And p1's ops team has the Architect
  And the turn passes to the left
  Then the phase is ops check
  When p1 switches off the Dating App
  And p1 confirms the products online
  Then it is rejected because "their red supply is at least their red demand"
  When p1 switches on the Dating App
  And p1 switches off the Drone Delivery
  And p1 confirms the products online
  Then it is accepted
  And the phase is income
  And p1 has 8 capital

Example: recalling the ops team takes nothing offline until the next Income (section 5, ruling 25)
  Given the phase is actions
  And p0's operations has a Dating App
  And p0's ops team has a Junior Software Dev
  When p0 recalls the Junior Software Dev
  And p0 ends their actions
  Then it is p1's turn
  And the Dating App in p0's operations is not offline
  When p1 ends their actions
  Then it is p0's turn
  And the phase is ops check

Example: a product launched mid-turn comes in online, though no one in the ops team runs it (section 5, ruling 25)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has 6 blue cubes
  When p0 launches the Dating App
  Then it is accepted
  And p0's ops team is empty
  And the Dating App in p0's operations is not offline

Example: a product switched off at an earlier Income comes back online when the ops team can run everything (section 5, ruling 19)
  Given p1's operations has a Dating App
  And the Dating App in p1's operations is offline
  And p1's ops team has a Junior Software Dev
  And the turn passes to the left
  Then the phase is actions
  And the Dating App in p1's operations is not offline
  And p1 has 8 capital
  And p1 has 1 market share

Example: an offline product still provides its Tag, so a rival pays its owner the License (ruling 5, section 6)
  Given p0's operations has a Dating App
  And the Dating App in p0's operations is offline
  And p1's backlog has a Streaming Service
  And it is p1's turn
  When p1 greenlights the Streaming Service
  Then it is accepted
  And p1 has 4 capital
  And p0 has 10 capital

Example: an offline product gives no Domain Expertise, though its Tag still lets its owner Greenlight for free (ruling 5, section 19)
  Given the phase is actions
  And p0's operations has a Dating App
  And the Dating App in p0's operations is offline
  And p0's backlog has a Streaming Service
  When p0 greenlights the Streaming Service
  Then it is accepted
  And p0 has 7 capital
  And the Streaming Service in p0's development has 10 blue need
```

  **How the numbers come** (§20.C, §20.E):
  - **Products:**
    - Dating App: rev 1, maintenance 1/0, Consumer, Tag Social;
    - Mobile Wallet: rev 2, maintenance 1/0;
    - Smart Lock: rev 2, maintenance 0/1;
    - Drone Delivery: rev 5, maintenance 1/1;
    - Streaming Service: Consumer, 10 Blue, requires Social;
    - the 1b example's Trading Bot and DAO Nation: maintenance 2/0 each, rev 4 and 0.
  - **Staff:** a Junior makes 1 of its color. The Architect and the Veteran make 3 Blue each, salary $2.
  - **Money and Market Share:**
    - 7 + 1 + 2 = 10, with 2 Market Share;
    - 7 + 2 = 9, with 1;
    - 7 + 1 = 8;
    - the License is $3: 7 − 3 = 4 and 7 + 3 = 10;
    - an online Dating App would cut the Streaming Service to 8 (§19.A).
  - **Bandwidth:**
    - the Architect gives Blue 3 and Red 0, against the Drone Delivery's 1/1;
    - the 1b example's load is 1 + 2 + 2 = 5 Blue, against 6.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator checks each player's Blue and Red Ops bandwidth at Income, and products switched off earn, score and cut nothing but still provide their Tag

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: Bugs and QA

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes Tasks 1–2 and plan 4-1's join moment, numbers going down, the shared total and `its {attribute} are {int}`.
- Produces (rules):
  - counts `bugs`, `fixed bugs`;
  - worked `qa output`, `qa team output`, `bug mark`, and the flag `bugged`;
  - player values `qa supply`, `bug load`, `qa spent`, `bugged products`;
  - the button `clean a card in their operations`.
- Produces (test file): `CLEAN`.

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₂ + 26.
    - The values test adds `qa output`, `qa team output` and `bug mark` (numbers) and `bugged` (flag). `playerValues` adds `'qa supply', 'bug load', 'qa spent', 'bugged products'`.
    - 3-2's `shownFlags(game)`, if pinned, is `['stalled', 'efficient in ops', 'bugged']`.
  - **Invariants.**
    - `new blue cubes`, `new red cubes` and `fixed bugs` sit on a card only while its owner's turn is in the `engine` phase. This replaces "none keeps new cubes".
    - No `LAUNCH` press moves a card that had `bugs` in `before`.
    - No card outside a development and an operations has `bugs`.
    - Every card in an operations has a worked `rev` of 0 or more.
  - **The auto-player.**
    - **In `engine`**, while its turn is there, it cleans the product at `t % n` among its n products in operations with `bugs`, in slot order.
    - **`qaForBugs()`** goes in the planned list right after `launch()`. Its first project with `bugs` whose `qa team output` is 0 gets the bench's first card whose `qa output` is above 0, assigned to it with `ASSIGN_TO_PROJECT` (both read through the runtime). It is null with no such project or card.
    - **`recruitMaker`** recruits a junior qa tester when there is such a project but no such card.
  - **Append `it('Review Focus: cleans no more Bugs than its QA when one product is left with Bugs partway through the step (R3)')`.**
    - The arrangement, from `setUp(2, 1)` with S its start player and O the other seat:
      - a Dating App with `bugs` 1 and a Mobile Wallet with `bugs` 2 go to `operations-S`;
      - both seats' Junior QA Testers go to `ops-team-S`.
    - S presses `end their actions`: the phase is `engine`, and it is S's turn.
    - S cleans the Dating App. The phase is still `engine`; the Mobile Wallet has 2 bugs; the Dating App has 1 `fixed bugs`.
    - S cleans the Mobile Wallet. It is O's turn; the Mobile Wallet has 1 bug; no card has `fixed bugs`.
    - Rebuilt with both Testers on S's bench instead, `end their actions` passes the turn to O at once, and both products keep their Bugs.
  - **Append `it('cleans the Bug the auto-player picks when ops QA can't clean them all, through the page's view and without it (R3)')`.**
    - The arrangement, with `arrange`:
      - `operations-p0` holds a Dating App (`bugs` 1, `offline`) and a Payment Gateway (`bugs` 1);
      - `ops-team-p0` holds the Fixer with `qa mode`;
      - p0 has 1 action.
    - For t = 0 and t = 1, `playTurn(engine, t, …)` stops at the first `CLEAN`. That press cleans the Dating App at t = 0 and the Payment Gateway at t = 1.
    - The logs through the view and without it are equal.
  - **Designer page:** N₂ + 26.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Cards.** After `  Cards can have cut blue cubes and cut red cubes.` add `  Cards can have bugs and fixed bugs.`
  - **After the `Red output:` section** add:

```text
QA output:
  A qa card's qa output is its output.
  A qa mode card's qa output is 1.
  An onboarding card's qa output is 0.
```

  - **After the `Red team output:` section** add:

```text
QA team output:
  A card's qa team output is the total qa output of the cards on it.
  A stalled card's qa team output is 0.
```

  - **Rev.** In `Rev:`, before `  An offline card's rev is 0.`, add `  A card's rev goes down by its bugs.` and `  A card's rev is at least 0.`
  - **After the `Portfolio points:` section** add:

```text
Bugged:
  Only if its bugs are more than 0.

Bug mark:
  A bugged card's bug mark is 1.
```

  - **After the `Red load:` section** add:

```text
QA supply:
  A player's qa supply is the total qa output of the cards in their ops team.

Bug load:
  A player's bug load is the total bugs of the cards in their operations.

QA spent:
  A player's qa spent is the total fixed bugs of the cards in their operations.

Bugged products:
  A player's bugged products is the total bug mark of the cards in their operations.
```

  - **The Hacker** (R8). At the end of `In every phase:` add:

```text
  When a Spaghetti Code card joins a card in a development:
    The card it joins gains 1 bug.
```

  - **The engine phase** becomes, whole:

```text
Phase: engine
  Hint: Your ops team's QA can't fix every Bug on your products. Clean one Bug at a time from the products you choose.
  When this phase starts:
    For each card in their development, its new blue cubes go up by its blue team output.
    For each card in their development, its new red cubes go up by its red team output.
    For each card in their development, its bugs go down by its qa team output.
  A player may clean a card in their operations.
    Only if its bugs are more than 0.
    Only if their qa supply is more than their qa spent.
    Then:
      It loses 1 bug.
      It gains 1 fixed bug.
  When their qa supply is at least their bug load:
    Only if their qa spent is 0.
    For each card in their operations, it loses its bugs.
    Go to commit.
  When their bugged products is 1:
    Only if their qa spent is 0.
    The cards in their operations lose bugs between them, up to their qa supply, first card first.
    Go to commit.
  When their qa spent is at least their qa supply:
    For each card in their operations, it loses its fixed bugs.
    Go to commit.
```

  - **Launch.** After `    Only if it is fully led.` add `    Only if its bugs are 0.`
  - **Pivot** (R7, D10). After `      It loses its cut red cubes.` add `      It loses its bugs.`
  - **Append these 11 examples.**

```text
Example: the Hacker adds a Bug to a project when assigned to it, and another to the project he is reassigned to, though onboarding (section 20, section 6, ruling 25)
  Given the phase is actions
  And p0's development has a Dating App and a To-Do List
  And p0's bench has the Hacker
  When p0 assigns the Hacker to the Dating App
  Then it is accepted
  And the Dating App in p0's development has 1 bug
  When p0 reassigns the Hacker to the To-Do List
  Then it is accepted
  And the To-Do List in p0's development has 1 bug
  And the Dating App in p0's development has 1 bug
  And the Hacker in p0's development team is onboarding

Example: the Hacker hired from the agency row straight onto a project adds a Bug to it (section 20, section 13)
  Given the phase is actions
  And the agency row has the Hacker, the Architect, the Veteran and the Diva
  And p0's development has a Dating App
  When p0 hires the Hacker to the Dating App
  Then it is accepted
  And p0 has 1 capital
  And the Dating App in p0's development has 1 bug

Example: the Hacker in the ops team adds no Bug to any product (section 20)
  Given the phase is actions
  And p0's operations has a To-Do List
  And p0's bench has the Hacker
  When p0 assigns the Hacker to p0's ops team
  Then it is accepted
  And the To-Do List in p0's operations has 0 bugs

Example: each Bug costs its product $1 of revenue, never below $0, and a product earning $0 gives no market share (section 5, section 9)
  Given p1's operations has a Mobile Wallet and a Dating App
  And the Mobile Wallet in p1's operations has 3 bugs
  And p1's ops team has a Junior Software Dev and a Junior Software Dev
  And the turn passes to the left
  Then it is p1's turn
  And the phase is actions
  And p1 has 8 capital
  And p1 has 1 market share

Example: a project with a Bug can't Launch (section 6)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has 6 blue cubes
  And the Dating App in p0's development has 1 bug
  When p0 launches the Dating App
  Then it is rejected because "its bugs are 0"
  And p0 has 3 actions

Example: a pivot scraps the project's Bugs with it (section 6, this slice's call)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has 2 bugs
  When p0 pivots the Dating App
  Then it is accepted
  And the Dating App in the open idea pool has 0 bugs

Example: a Junior QA Tester removes a Bug from its own project at the Engine, but not from a Stalled one (section 5, section 3, ruling 14)
  Given the phase is actions
  And p0's development has a Dating App and a Neobank
  And the Dating App in p0's development has 2 bugs
  And the Dating App in p0's development has a Junior QA Tester on it
  And the Neobank in p0's development has 2 bugs
  And the Neobank in p0's development has a Junior QA Tester on it
  When p0 ends their actions
  Then it is p1's turn
  And the Dating App in p0's development has 1 bug
  And the Neobank in p0's development has 2 bugs
  And the Neobank in p0's development is stalled

Example: the Fixer in QA mode still leads a Tier 2 Hardware project, so it isn't Stalled; it removes 1 Bug and adds no Red (section 20, section 3, ruling 4)
  Given p0's development has a Server Farm
  And the Server Farm in p0's development has 2 bugs
  And the Server Farm in p0's development has the Fixer and a Junior Hardware Eng on it
  Then the phase is modes
  When p0 declares the Fixer, choosing qa
  And p0 confirms their modes
  Then the phase is income
  And the Server Farm in p0's development is not stalled
  When p0 pays salaries
  And p0 ends their actions
  Then the Server Farm in p0's development has 1 bug
  And the Server Farm in p0's development has 1 red cube

Example: a Junior QA Tester in the ops team removes a Bug from a product at the Engine (section 5, ruling 19)
  Given the phase is actions
  And p0's operations has a Dating App
  And the Dating App in p0's operations has 2 bugs
  And p0's ops team has a Junior QA Tester
  When p0 ends their actions
  Then it is p1's turn
  And the Dating App in p0's operations has 1 bug

Example: ops QA cleans an offline product too (section 5, ruling 19)
  Given the phase is actions
  And p0's operations has a Dating App and a Mobile Wallet
  And the Dating App in p0's operations is offline
  And the Dating App in p0's operations has 1 bug
  And the Mobile Wallet in p0's operations has 1 bug
  And p0's ops team has a Junior QA Tester and a Junior QA Tester
  When p0 ends their actions
  Then it is p1's turn
  And the Dating App in p0's operations has 0 bugs
  And the Mobile Wallet in p0's operations has 0 bugs

Example: when ops QA can't clean every Bug, the owner picks which, one Bug a press, here the online product's before the offline one's (section 5, ruling 25)
  Given the phase is actions
  And p0's operations has a Dating App and a Payment Gateway
  And the Dating App in p0's operations is offline
  And the Dating App in p0's operations has 1 bug
  And the Payment Gateway in p0's operations has 1 bug
  And p0's ops team has a Junior QA Tester
  When p0 ends their actions
  Then the phase is engine
  And it is p0's turn
  When p0 cleans the Payment Gateway
  Then it is accepted
  And it is p1's turn
  And the Payment Gateway in p0's operations has 0 bugs
  And the Payment Gateway in p0's operations has 0 fixed bugs
  And the Dating App in p0's operations has 1 bug
```

  **How the numbers come** (§20.B, §20.C, §5 Phase B):
  - **Costs:** the Hacker costs $6 (7 − 6 = 1); the Fixer's salary is $2.
  - **Revenue:** the Mobile Wallet's rev 2 less 3 Bugs is floored at $0, and the Dating App's 1 makes 8. Two Juniors give 2 Blue for maintenance 1 + 1.
  - **Feature complete:** the Dating App needs 6 Blue.
  - **The Server Farm** costs 0 Blue / 8 Red, Tier 2 Infra. The Fixer leads Hardware in any mode. In QA mode its Red is 0 and its QA 1, and the Junior Hardware Eng adds 1 Red.
  - **The Neobank** is a Tier 2 Software project with no Software lead, so it is Stalled and its QA is 0.
  - **The Payment Gateway** earns rev 3, so its Bug costs more than the Offline Dating App's (D3).
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`. The single-line removal probe ("Review Focus: a Pivot that forgets the staff on its project") passes unchanged: `      Every card on it goes to their bench.` still occurs once.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Hacker adds a Bug to each project he joins, Bugs cost revenue and block Launch, and QA cleans them on projects and, one press a Bug when it matters, in operations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: The Growth Hacker, the Architect and the two marked teams

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count), `src/pages/designer/playtest-fitted.test.tsx` (four offered lists and `HIRES`)

**Interfaces:**
- Consumes plan 4-1's zone marks, placement lines, `staying on it` and P16, and Tasks 1–3.
- Produces (rules):
  - the worked number `rev bonus`, and the flags `attaching`, `spreading bugs`, `viral`;
  - the buttons `assign some cards from their bench to a card in their operations`, `hire a card from the agency row to a card in their operations`, `hire some cards from their scouting to a card in their operations` and `reassign a card from their ops team to a card in their operations`.
- Produces (test file):
  - `ASSIGN_TO_PRODUCT`, `HIRE_AGENCY_TO_PRODUCT`, `HIRE_SCOUTED_TO_PRODUCT` and `REASSIGN_TO_PRODUCT` (those move types);
  - `AGENCY_HIRES` gains `HIRE_AGENCY_TO_PRODUCT`, `SOURCE_HIRES` gains `HIRE_SCOUTED_TO_PRODUCT` last, and `REASSIGNS` gains `REASSIGN_TO_PRODUCT`;
  - `onProduct(which?)`, an `Onto` on `own('operations')`, the first product by default.

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₂ + 34.
    - The values test adds `rev bonus` (number) and `attaching`, `spreading bugs` and `viral` (flags).
    - In `'lays out the table …'`, the marked zones are read as `[name, onCards, holders]` and equal `[['development team', 'every', 'development'], ['ops team', 'some', 'operations']]`.
  - **`'finds nothing wrong with a whole table …'`** also checks:
    - with the Growth Hacker `putOn` the To-Do List in `ops-team-p0`, `attachmentProblem` is null;
    - with the Architect `putOn` the To-Do List from `development-team-p0` (M1), it is `The Architect in p0's development team is on the To-Do List, which is now in p0's operations. Move the cards on a card along with it.`
  - **The Board invariant.**
    - A card that sits on a card is either in a development team, on a card in the same seat's development, or in an ops team, on a card in the same seat's operations.
    - A card in an ops team that sits on a card is `attaching`.
    - Every card in a development team sits on one.
  - **The auto-player.**
    - **`hireGrowthHacker()`**, after `qaForBugs()`: when the agency row holds an attaching card the seat can pay for, and its operations hold a product, it hires that card to its first product with `HIRE_AGENCY_TO_PRODUCT`.
    - **`moveGrowthHacker()`**, after that: when `t % 4 === 1`, a card in its ops team sits on a product, and its operations hold another, it reassigns the card to the first other product with `REASSIGN_TO_PRODUCT`.
    - **Action 1, place 2:** it hires to its first product (`HIRE_AGENCY_TO_PRODUCT`), in place of hiring to the ops team, when the card it picked is attaching or `⌊t / 9⌋ % 2 === 1`.
    - **Action 4:** it assigns to its first product (`ASSIGN_TO_PRODUCT`), in place of assigning to the ops team, when a picked card is attaching or `⌊t / 9⌋ % 2 === 1`.
    - **`sourcing()`, place 1:** the same rule, with `HIRE_SCOUTED_TO_PRODUCT`.
  - **`playtest-fitted.test.tsx`**, with `ASSIGN_TO_PRODUCT_LABEL = 'Assign some cards from your bench to a card in your operations'`. Change only these lines:
    - **`'assigns a set to the card it goes to by clicking only …'`:** the offered list becomes `[[ASSIGN, true], ['Assign some cards from your bench to your ops team', 'their operations is not empty'], [ASSIGN_TO_PRODUCT_LABEL, 'There is no card in your operations.'], [LAY_OFF, true]]`. If the view gives the new button another verdict, pin what it says and report it.
    - **`'Review Focus: offers another seat its buttons greyed …'`:** the list becomes `[ASSIGN, 'Assign some cards from your bench to your ops team', ASSIGN_TO_PRODUCT_LABEL, LAY_OFF]`.
    - **`'Review Focus: keeps an offer while its card has a button to take it …'`:**
      - the bench list is the same as in the test above;
      - the agency list becomes `` ['to your bench', 'to a card in your development', 'to your ops team', 'to a card in your operations'].map((to) => `Hire a card from the agency row ${to}`) ``.
    - **`HIRES`** becomes `` ['to your bench', 'to your ops team', 'to a card in your operations', 'to a card in your development'].map((to) => `Hire some cards from your scouting ${to}`) ``.
  - **Guards** (pass before and after): the three "asks an example which … it means" tests are unchanged.
    - A press with no target never takes an onto button.
    - In the reassign test, P16 keeps only the two buttons whose target zone holds the To-Do List (development), so the error and each wording read as today.
  - **Designer page:** N₂ + 34.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts src/pages/designer/playtest-fitted.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Table** (R5; P14 closes M1):

```text
  Each player has a development team row that everyone can see, where every card is on a card in their development.
  Each player has an ops team row that everyone can see, where some cards are on cards in their operations.
```

  - **Rev.** `A card's rev goes up by the total rev bonus of the cards on it.` becomes the first line of `Rev:`. After the `Rev:` section add:

```text
Rev bonus:
  A Viral Loop card's rev bonus is 3.
```

  - **After the `Bug mark:` section** add:

```text
Attaching:
  Only if it is a Viral Loop card.

Spreading bugs:
  Only if it is a Viral Loop card.
  Only if it is not onboarding.

Viral:
  Only if some card on it is spreading bugs.
```

  - **Actions.**
    - In `A player may hire a card from the agency row to their ops team.`, after `    Only if their operations is not empty.`, add `    Only if it is not attaching.` Right after that button add:

```text
  A player may hire a card from the agency row to a card in their operations.
    It costs 1 action.
    Only if they have at least the card's cost in capital.
    Then:
      They pay the card's cost.
      If it is attaching, it goes to their ops team, on the target card.
      If it is not attaching, move it to their ops team.
```

    - In `A player may assign some cards from their bench to their ops team.`, after `    Only if their operations is not empty.`, add `    Only if no picked card is attaching.` Right after that button add:

```text
  A player may assign some cards from their bench to a card in their operations.
    It costs 1 action.
    Then:
      The picked cards that are attaching go to their ops team, on the target card.
      The picked cards that are not attaching go to their ops team.
```

    - Right after `A player may reassign a card from their ops team to a card in their development.` and its lines add:

```text
  A player may reassign a card from their ops team to a card in their operations.
    It costs 1 action.
    Only if it is on a card.
    Only if it is not on the target card.
    Then:
      It goes to their ops team, on the target card.
      It is onboarding.
```

    - In the launch button, `      Every card on it goes to their ops team.` becomes:

```text
      Every card on it that is attaching goes to their ops team, staying on it.
      Every card on it that is not attaching goes to their ops team.
```

  - **Sourcing.** In `A player may hire some cards from their scouting to their ops team.`, after `    Only if their operations is not empty.`, add `    Only if no picked card is attaching.` Right after that button add:

```text
  A player may hire some cards from their scouting to a card in their operations.
    Only if they have at least the total cost of the picked cards in capital.
    Then:
      They pay the total cost of the picked cards.
      The picked cards that are attaching go to their ops team, on the target card.
      The picked cards that are not attaching go to their ops team.
```

  - **The turn's end** (§5 Phase D step 7). In backlog cleanup's `When their backlog has fewer than 4 cards:`, before `    The turn passes to the left.`, add:

```text
    If they have no card in their ops team that is not onboarding and whose trait is Clean Code, each viral card in their operations gains 1 bug.
```

  - **Append these 8 examples.**

```text
Example: the Growth Hacker adds $3 to the revenue of the product it is on (section 20, section 5)
  Given p1's operations has a Dating App
  And p1's ops team has a Junior Software Dev
  And the Dating App in p1's operations has the Growth Hacker on it
  And the turn passes to the left
  Then the phase is income
  And p1 has 11 capital
  And p1 has 1 market share

Example: the Growth Hacker adds a Bug to its product at the end of its owner's turn, even while the product is offline (section 5, section 20, ruling 25)
  Given the phase is actions
  And p0's operations has a Dating App
  And the Dating App in p0's operations is offline
  And the Dating App in p0's operations has the Growth Hacker on it
  When p0 ends their actions
  Then it is p1's turn
  And the Dating App in p0's operations has 1 bug

Example: a working Architect in the ops team stops the Growth Hacker's Bug (section 20, ruling 25)
  Given the phase is actions
  And p0's operations has a Dating App
  And p0's ops team has the Architect
  And the Dating App in p0's operations has the Growth Hacker on it
  When p0 ends their actions
  Then it is p1's turn
  And the Dating App in p0's operations has 0 bugs

Example: an Architect onboarding this turn shields nothing, so the Growth Hacker adds its Bug (ruling 8, section 20)
  Given the phase is actions
  And p0's operations has a Dating App
  And p0's ops team has the Architect
  And the Architect in p0's ops team is onboarding
  And the Dating App in p0's operations has the Growth Hacker on it
  When p0 ends their actions
  Then the Dating App in p0's operations has 1 bug

Example: the Growth Hacker reassigned to another product is onboarding, so it adds no Bug that turn, and pooled staff can't be reassigned to a product (section 6, ruling 8)
  Given the phase is actions
  And p0's operations has a Dating App and a To-Do List
  And p0's ops team has a Junior Software Dev
  And the Dating App in p0's operations has the Growth Hacker on it
  When p0 reassigns the Junior Software Dev to the To-Do List
  Then it is rejected because "it is on a card"
  When p0 reassigns the Growth Hacker to the To-Do List
  Then it is accepted
  And p0 has 2 actions
  And the To-Do List in p0's operations has the Growth Hacker on it
  And the Growth Hacker in p0's ops team is onboarding
  When p0 ends their actions
  Then the To-Do List in p0's operations has 0 bugs
  And the Dating App in p0's operations has 0 bugs

Example: the Growth Hacker assigned to the ops team goes on the product its owner picks, and the staff assigned with it join the pool (section 3, section 20)
  Given the phase is actions
  And p0's operations has a Dating App and a To-Do List
  And p0's bench has the Growth Hacker and a Junior Software Dev
  When p0 assigns the Growth Hacker and the Junior Software Dev to p0's ops team
  Then it is rejected because "no picked card is attaching"
  When p0 assigns the Growth Hacker and the Junior Software Dev to the To-Do List
  Then it is accepted
  And p0 has 2 actions
  And the To-Do List in p0's operations has the Growth Hacker on it
  And the Dating App in p0's operations has no cards on it
  And p0's ops team has the Growth Hacker and a Junior Software Dev

Example: the Growth Hacker hired from the agency row goes on a product its owner picks, never into the pool (section 3, section 13)
  Given the phase is actions
  And the agency row has the Growth Hacker, the Hacker, the Architect and the Veteran
  And p0's operations has a Dating App
  When p0 hires the Growth Hacker to p0's ops team
  Then it is rejected because "it is not attaching"
  When p0 hires the Growth Hacker to the Dating App
  Then it is accepted
  And p0 has 2 capital
  And the Dating App in p0's operations has the Growth Hacker on it

Example: a Growth Hacker on a project stays on it when it Launches, and the rest of the team joins the pool (section 6, section 20)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has 6 blue cubes
  And the Dating App in p0's development has the Growth Hacker and a Junior Software Dev on it
  When p0 launches the Dating App
  Then it is accepted
  And the Dating App in p0's operations has the Growth Hacker on it
  And p0's ops team has the Growth Hacker and a Junior Software Dev
```

  **How the numbers come** (§20.B, §20.C):
  - **The Growth Hacker:** cost $5 (7 − 5 = 2), salary $2, which keeps p1 at Income. Its +$3 on the Dating App's 1 gives 7 + 4 = 11, and 1 Market Share.
  - **Givens:** a `… has … on it` Given comes after the zone Givens, since `{zone} has …` replaces a zone's cards.
  - **Presses to a product:** `… to the To-Do List` and `… to the Dating App` press the operations form, because those cards are in p0's operations (4-1's P16).
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx src/pages/designer/playtest-fitted.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Growth Hacker sits on the product its owner picks for $3 and a Bug each turn, the Architect in the ops team stops that Bug, and the development team's cards sit only on projects

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: The final check before the score

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes plan 4-1's End line, `The final check passes to the left.` and `END_STEPS_KEY`, and Task 2's buttons.
- Produces (test file):
  - `FINAL_CHECK = 'final check'`;
  - `turnsIn(log, skipped: ReadonlySet<number>)`, which counts turns among the moves whose index is not in `skipped`;
  - `Run` gains `finalCheck?: Set<number>`. `playGame` adds to it the log index of each move whose `before.turn.phase` is `FINAL_CHECK`.

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₂ + 39.
    - `PHASES` gains `'final check'` last.
    - `enteredIncome` returns null when `after.turn.phase` is `final check`.
  - **The long runs.**
    - Turns, rounds and the last seat of the round are counted with `turnsIn(log, finalCheck)`, from the set `playGame` filled.
    - At the result, every seat's blue supply is at least its blue demand, and its red supply at least its red demand.
    - Task 2's `offline` invariant also allows a change when `before` or `after` is in `final check`, or when the move set the result.
  - **The auto-player in `final check`**, as the seat whose step it is:
    - when `t % 3 === 0` and it has switched nothing on in this step, it switches on its offline product with the highest val, if it has one;
    - then, while the step is its, it switches off the product with the lowest val (the first of those) among its online products with maintenance above 0 in a color of `shortOf`.
  - **Append `it('plays the final check for a seat short of bandwidth, switching products off until the rest fit, and scores only those online (§12)')`.**
    - The arrangement, with `arrange`:
      - the crash pile holds the Market Crash;
      - `operations-p0` holds a Neobank (`offline`), a Dating App, a Viral Video App, a Mobile Wallet and a Payment Gateway;
      - `ops-team-p0` holds the Architect;
      - p0 has 1 action.
    - Play `playTurn` at t = 1 (p0), t = 2 (p1), then t = 3, 4, … until the result.
    - The moves made in the final check are p0's: switch on the Neobank, then switch off the Mobile Wallet and the Payment Gateway.
    - The Neobank, the Dating App and the Viral Video App are online.
    - `result.scores` equals `scoreOf` for both seats.
  - **Designer page:** N₂ + 39.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **End** (R1). After `  The game ends when the crash pile is not empty and the round is finished.` add `  Before the score, each player has the final check, in turn from the start player.`
  - **After the `Phase: backlog cleanup` block** add:

```text
Phase: final check
  Hint: After the last round your ops team can't run all your products. Switch products off, or back on, until those still on fit your Blue and Red bandwidth.
  When their blue supply is at least their blue load:
    Only if their red supply is at least their red load.
    Only if some card in their operations is offline.
    Every card in their operations is not offline.
  When their blue supply is at least their blue demand:
    Only if their red supply is at least their red demand.
    The final check passes to the left.
  A player may switch off a card in their operations.
    Only if it is not offline.
    Then:
      It is offline.
  A player may switch on a card in their operations.
    Only if it is offline.
    Then:
      It is not offline.
```

  - **Two 1b examples reach the end with products and no bandwidth:**
    - "the round ends before the start player's next income": after `  And p0's operations has a Trading Bot` add `  And p0's ops team has the Architect`.
    - "the score adds each product's val in operations and 2 points for each market share": after `  And p0's operations has a Dating App and a Smart Lock` add `  And p0's ops team has a Junior Software Dev and a Junior Hardware Eng`.
  - **Append these 5 examples.**

```text
Example: after the last round, a player whose ops team can run every product has them all back online before the score (section 12, ruling 25)
  Given the crash pile has the Market Crash
  And it is p1's turn
  And p0's operations has a Dating App and a Mobile Wallet
  And p0's ops team has a Junior Software Dev and a Junior Software Dev
  And the Mobile Wallet in p0's operations is offline
  When p1 ends their actions
  Then the game is over
  And the Mobile Wallet in p0's operations is not offline
  And p0 scores 8

Example: after the last round, a player whose online products still fit keeps the others offline (section 12, ruling 25)
  Given the crash pile has the Market Crash
  And it is p1's turn
  And p0's operations has a Dating App and a Mobile Wallet
  And p0's ops team has a Junior Software Dev
  And the Mobile Wallet in p0's operations is offline
  When p1 ends their actions
  Then the game is over
  And the Mobile Wallet in p0's operations is offline
  And p0 scores 6

Example: after the last round each player short of bandwidth switches products off before the score, in turn from the start player (section 12, ruling 25)
  Given 3 players
  And p1 is the start player
  And the crash pile has the Market Crash
  And the phase is actions
  And it is p0's turn
  And p0's operations has a Dating App and a Viral Video App
  And p0's ops team has a Junior Software Dev
  And p1's operations has a Mobile Wallet
  When p0 ends their actions
  Then the phase is final check
  And it is p1's turn
  And the game is not over
  When p1 switches off the Mobile Wallet
  Then it is p0's turn
  When p0 switches off the Viral Video App
  Then the game is over
  And p0 scores 6
  And p1 scores 1
  And p2 scores 1
  And p0 wins

Example: after the last round a player may switch an offline product back on, so the one that scores most runs (section 12, ruling 25)
  Given the crash pile has the Market Crash
  And it is p1's turn
  And p0's operations has a Neobank, a Viral Video App and a Mobile Wallet
  And p0's ops team has a Junior Software Dev
  And the Neobank in p0's operations is offline
  When p1 ends their actions
  Then the phase is final check
  And it is p0's turn
  When p0 switches on the Neobank
  And p0 switches off the Viral Video App
  Then the game is not over
  When p0 switches off the Mobile Wallet
  Then the game is over
  And the Neobank in p0's operations is not offline
  And p0 scores 11

Example: at the final check, staff still onboarding from the last turn give no bandwidth (section 12, ruling 8)
  Given the crash pile has the Market Crash
  And the phase is actions
  And it is p1's turn
  And p1's development has a To-Do List
  And the To-Do List in p1's development has a Junior Software Dev on it
  And p1's operations has a Dating App
  When p1 pivots the To-Do List
  And p1 assigns the Junior Software Dev to p1's ops team
  And p1 ends their actions
  Then the phase is final check
  And it is p1's turn
  And p1's blue supply is 0
```

  **How the numbers come** (§12, §20.C):
  - **1 VP for every $5:** 7 capital scores 1.
  - **Vals:** Dating App 5, Mobile Wallet 2, Viral Video App 3, Neobank 10, each with Blue maintenance 1. So: 1 + 5 + 2 = 8; 1 + 5 = 6; 1 + 10 = 11.
  - **The 3-player order:** the round is p1, p2, p0. The steps go p1 (short), p2 (nothing, passed at once), then p0.
  - **Onboarding at the final check:** a pivot onboards its staff, and an assign keeps the token (§6). No turn start clears it before the score.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator ends with a final Ops check, in turn from the start player, that brings every product online when all fit and lets a player short of bandwidth choose before the score

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 6: Long runs: every new path tallied, whole games replayed; the README and the checks

**Files:**
- Modify: `src/games/startup-simulator.test.ts`, `README.md`

**Interfaces:**
- Consumes every constant and policy above, `pressChoices`, `answersOf`, `runtime.workedValue`, `workedFlag` and `playerValue`.
- **`happenings` gains these keys:**
  - `a mode declared: <label>` for each declare press: its answer, or the press's only option (`answersOf(move)[0] ?? options[0]` from `pressChoices` on `before`);
  - `an offline product at Income`, for each `offline` product of the seat that reached its Income;
  - `a product earning less for its Bugs`, for each of that seat's online products with `bugs`;
  - `a Growth Hacker's $3 earned`, for each of that seat's online products that is `viral`;
  - `a Bug added to a project`, for each development card whose `bugs` rose in the move;
  - `a Bug added to a product in operation`, for each operations card whose `bugs` rose;
  - `a Bug cleaned on a project`, for each development card whose `bugs` fell in a move that ran the Engine;
  - `a Bug cleaned in operations by itself`, for each operations card whose `bugs` fell in a move that is no `CLEAN`;
  - `a product switched off at the final check` and `a product switched on at the final check`, for those presses with `before` in `final check`;
  - `every product back online at the final check`, for each `offline` cleared while `before` or `after` is in `final check`;
  - `a Growth Hacker's Bug stopped by the Architect`, for a move that passed the turn of a seat with a `viral` product whose Bugs did not rise.
- **The long-run watch** also counts `modes kept by a confirm alone`: a `CONFIRM_MODES` with no declare by that seat since its turn started.

- [ ] **Step 1: Write the tests.**
  - **`'made every move in those runs …'`** expects above 0, besides its keys: both `DECLARE` buttons, `CONFIRM_MODES`, `SWITCH_OFF`, `SWITCH_ON`, `CONFIRM_ONLINE`, `ASSIGN_TO_PRODUCT`, `HIRE_AGENCY_TO_PRODUCT`, `HIRE_SCOUTED_TO_PRODUCT` and `REASSIGN_TO_PRODUCT`.
  - **Append `it('played slice 4 in those runs: modes declared and kept, products offline at Income, Bugs added, costing revenue and cleaned, the Growth Hacker’s $3 and the final check')`.** It expects above 0:
    - `a mode declared: Blue`, `a mode declared: Red`, `a mode declared: QA` and `modes kept by a confirm alone`;
    - `an offline product at Income`, `a product earning less for its Bugs` and `a Growth Hacker's $3 earned`;
    - `a Bug added to a project`, `a Bug added to a product in operation`, `a Bug cleaned on a project` and `a Bug cleaned in operations by itself`;
    - `a product switched off at the final check`.

    `CLEAN`, `a product switched on at the final check`, `every product back online at the final check` and `a Growth Hacker's Bug stopped by the Architect` are counted but not required. Only the one Growth Hacker brings Bugs to products in operation, so two such products with Bugs at once are rare. Task 3's and Task 5's arranged tests pin the auto-player's handling of these.
  - **Append `it('takes back the last move and rebuilds whole games from their logs, through declarations, Bugs and the final check (Review Focus: 2 players, seeds 1 to 5)')`.**
    - Play each 2-player game at seeds 1 to 5 to its result, keeping the state before each move.
    - A fresh engine given `loadLog(log)` equals the final state.
    - `engine.undo()` gives the state before the last move.
    - Across the five logs, some log holds a declare, a `SWITCH_OFF` and a development card's Bug rising. Count these through the watch.
  - **Kept as they are:** `'plays the same game through the page’s view as without it'` and the slice-3 tallies pass unchanged.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`.
  - If a required key stays at 0, print the tally and change the auto-player (cadences, or which bench cards action 4 sends), never the rules.
  - Report a key that stays unreachable.
- [ ] **Step 3: Write the README.**
  - **The Startup paragraph** becomes "**Startup Simulator (slice 4)**". After the slice-3 sentence, add: it now runs products with an ops team, whose Blue and Red bandwidth must cover their maintenance at Income or the player switches some off, earning nothing from them; flex Seniors and the Fixer work in a mode their owner declares; the Hacker and the Growth Hacker add Bugs, which cost $1 of revenue each and block a Launch, and QA staff clean them; the Growth Hacker sits on its product for $3 more, and the Architect stops its Bugs; and after the last round each player has a final Ops check before the score. Its rulings list adds 4, 14 and 19.
  - **"It still leaves out"** becomes: XP and the Specialists' effects but the Growth Hacker's, the traits of the Veteran and the Full Stack Ninja, Face-Down Greenlight and the Audit, Partners' free License, Patent Trolls, badged Juniors and the Visionary as leads, the Events and Crunch Time, Dividends and the Consultant, Integration, selling and poaching, and Hype and Scandal. Each comes in a later slice.
  - Delete "Until modes arrive, flex staff work in Blue." The game-end line now names only the last Milestone check (§12.3).
  - **Plan 4-1's paragraph** gains a last bullet: `- **Startup Simulator** plays slice 4 this way: …`. It names:
    - `A player's blue supply is the total blue bandwidth of the cards in their ops team.`;
    - the ops check's `Every card in their operations is not offline.`;
    - the Hacker's `When a Spaghetti Code card joins a card in a development:`;
    - the ops team marked `…, where some cards are on cards in their operations`;
    - Ops QA's shared total, and the final check before the score.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 5: Run the checks.** The first three print nothing. The fourth prints only the lines this plan names: the Startup count in `designer-page.test.tsx`, and Task 4's four lists and `HIRES` in `playtest-fitted.test.tsx`.

```bash
# no shared code and no page code changed
git diff --stat "$BASE" -- src/engine src/utils
git diff --stat "$BASE" -- src/pages ':!src/pages/designer/designer-page.test.tsx' ':!src/pages/designer/playtest-fitted.test.tsx'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# the page tests' changed lines
git diff "$BASE" -- src/pages/designer/designer-page.test.tsx src/pages/designer/playtest-fitted.test.tsx | grep -E '^[-+][^-+]'
```

  Also read every number in the new examples against each task's "How the numbers come".
- [ ] **Step 6: Run the games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
- [ ] **Step 7: Commit**

```bash
git add src/games/startup-simulator.test.ts README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's long runs declare modes, switch products off, add and clean Bugs and play the final check at 2 to 5 players, every path tallied and whole games rebuilt from their logs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Forward notes for plan 4-3

- **New stand-ins in plan 3-2's view.** `standIns` reads three slice-4 sections as stand-ins, because each starts `A card's X is its Y.`:
  - `blue bandwidth` for `blue output`, and `red bandwidth` for `red output`;
  - `portfolio points` for `val`.

  So `seatExtras(…).worked` gains a `val` column on every Board product. No count part reads it today.
- **A new badge.** `shownFlags` gains `bugged` (read by `A bugged card's bug mark is 1.`), so a product with Bugs shows a `bugged` badge until 4-3 draws its Bug badges.
- **3-2's view pins.** Tasks 1–3 update them in `startup-simulator.test.ts`: `standIns`, `shownFlags` and the worked entries. Plan 3-2 is being executed now, so each task takes those pins from the committed test when it starts, not from the text quoted in this plan.
