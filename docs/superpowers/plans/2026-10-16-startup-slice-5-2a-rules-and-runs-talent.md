# Startup Simulator Slice 5-2a (Rules text and long runs: talent growth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Startup Simulator plays slice 5's talent rules: Juniors carry Permanent XP and Skill tokens that raise their output and salary and work in a declared mode, earn Pending XP on projects and graduate it at Launch (with the Veteran's Mentor), PMs give Synergy and Agile and earn their Badge, badged Juniors lead, the QA Engineer and the Sales Rep do their jobs, fired staff lose their tokens, and Human Capital scores. The long runs play all of it that needs no Strategy card at 2 to 5 players.

**Architecture:**
- **R13's plan 5-2 is two plans, because it grew past eight tasks.** This is **5-2a, talent** (seven tasks). **5-2b, Strategy and Milestones** (`docs/superpowers/plans/2026-10-16-startup-slice-5-2b-rules-and-runs-strategy-and-milestones.md`, five tasks) comes next: the Strategy deck, Brainstorm, Training and the Milestones, and the long-run tallies that only Training can reach. Plan 5-3 (the page) follows both.
- This plan writes only the rules text, its examples and the long runs. It adds no phrase and changes no shared code. Plans 4-2 and 5-1 are built first.
- **Seven tasks:**
  1. tokens, the Juniors' `role`, outputs with XP and Skill tokens, multi-skilled modes, the salary bump (R5);
  2. firing strips tokens, bench discards keep them, Human Capital in the score (R4, §12.6);
  3. Pending XP at the Engine, and the Pivot that returns it (R7);
  4. Launch: the graduation step, the Mentor, the Junior PM's Badge (R2, R8);
  5. the QA Engineer and the Sales Rep (R9);
  6. Synergy, Agile and badged Juniors as leads (R8, §11.C);
  7. long runs: every talent path tallied, whole games replayed; the README and the checks.

  Each rules task keeps the existing long runs passing, adds the auto-player's handling of what it creates and the invariants its rules need. Task 7 adds the tallies.
- **Phases.** Task 4 adds `graduation`, an interrupt like `research`, placed after `Phase: sourcing`. Phase order after this plan: `modes`, `ops check`, `income`, `actions`, `research`, `sourcing`, `graduation`, `engine`, `commit`, `bench cleanup`, `backlog cleanup`, `final check`.
- **Builder calls this plan makes** (the spec leaves wordings and the auto-player to the builder; each is recorded here for the owner):
  - **Modes.** A Junior's Skill token in another colour lets it be declared in that colour. `blue mode` is set only on a card with a Blue Skill token; a native colour needs no flag. Mid-turn arrivals carry no flag, so they work in their native colour (the spec's correction a). A Junior's `output` column is 1, so `A red mode card's red output is its output.` already gives a Junior 1.
  - **XP, Skills and Human Capital start from `A Junior card's …` / `A Specialist card's …`, never from `A card's X is its Y.`,** so `standIns` gains no entry and no face shows a worked number in place of a count.
  - **Firing marks the card `fired`,** and one rule in `In every phase:` strips a fired card's tokens in the open job market. Four buttons say `It is fired.` in place of eleven lines each. Bench discards set no mark, so they keep their tokens (§13.B, §15.A.3).
  - **The Diva's Pivot strips nothing:** a Senior never holds XP, Skill, Pending or Badge tokens (§11.F; Training fits no Senior, ruling 14), so R4's Diva line would be dead text that no example could pin.
  - **Graduation** follows R2 and plan 5-1's Task 7 shape. A Junior with one Pending token graduates by a rule with no press; one with more chooses with `keep … on`; the Mentor's `mentor` press needs a Junior that has kept one. A Junior at 4 XP is neither, so the finishing rule returns its tokens: R2's separate "loses its Pending tokens" rule is not needed. "At 4" is the flag `maxed out` (`its xp is more than 3`), since card numbers have no "less than".
  - **The Mentor's press is not optional** once a mentorable Junior is left: the rulebook's "lets" names the benefit, and R2 gives the step no pass.
  - **Agile is read before the move,** so a PM arriving in the same Assign doesn't count (R8, the Rust engine's reading, on the owner's call list). It needs no "in a development team" line: only an Assign or Reassign to a Development project reads it.
  - **The VP of Sales' flag (`waiving decay`) needs no Rainmaker line:** only Sales Reps and Growth Hackers sit on products, and only a Sales Rep can be badged (§20.A).
  - **The Growth Hacker's rev bonus is 0 while onboarding,** like every effect of an onboarding card (§6 Reassign). No Income ever sees it, since turn starts clear the token.
- **Names.**
  - Kept on cards: counts `blue xp`, `red xp`, `green xp`, `training xp`, `blue skill`, `red skill`, `green skill`, `pending blue`, `pending red`, `pending green`; flags `badged`, `blue mode`, `fired`, `graduated`. Kept on players: the number `mentoring`.
  - Worked numbers: `xp`, `skills`, `badge points`, `human capital`, `pending tokens`, `bug decay`, `pm count`, `blue workers`, `red workers`, `qa workers`; refined: `blue output`, `red output`, `qa output`, `blue team output`, `red team output`, `qa team output`, `rev`, `rev bonus`, `salary`.
  - Worked flags: `experienced`, `blue learner`, `red learner`, `green learner`, `coaching`, `up for promotion`, `maxed out`, `due to graduate`, `choosing a token`, `mentorable`, `practised`, `waiving decay`, `stopping decay`, `decaying`, `managing`, `agile`.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-5-talent-growth-design.md` is binding; its "Builder-check rulings" R1–R13 win over its body. It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding, with its rule "every number comes from the rulebook, and examples say where" and its anti-goals. The other inputs:
- plan 5-1 (`docs/superpowers/plans/2026-10-16-startup-slice-5-1-language.md`), whose Interfaces blocks are the phrases this plan writes with, and whose "Left to 5-2" list is this plan's floor (with 5-2b);
- plan 4-2 (`docs/superpowers/plans/2026-10-16-startup-slice-4-2-rules-and-runs.md`), whose rules text this plan edits, and plan 4-1's phrases;
- `builder-check-startup-5.md` (M1–M12) in the session scratchpad;
- `suwa/rulebook.md` v6.0 §3 (Your Three Hands, Talent Growth), §5 Phase D steps 1–2, §6 Assign, Reassign, Launch, Pivot, §7.B, §11, §12.6, §13.B, §15.A.3, §18.B, §20.B, Rulings #1, #8, #14, #19, #20, #25;
- where those are silent, suwa's `talent_output.rs`, `phases/engine.rs`, `resolvers/{product_actions,talent_actions}.rs` and `economy.rs`.

## Global Constraints

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.** This plan adds no key: tokens, flags and `mentoring` live in the rules text.
- **No Startup Simulator words in shared code.** The banned list is plan 5-1's (its Global Constraints), slice 5's words included: xp, pending, skill, badge, rank, mentor, synergy, agile, graduate, training, brainstorm, strategy, milestone, senior. This plan touches no shared code.
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged. Rent Day keeps its 108 examples.
- **Files this plan changes:** `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md`, and test-file pins under `src/pages/designer/**` that read the rules text (the Startup example count in `designer-page.test.tsx`; any pinned Board text, offered list or flag list in `playtest-fitted.test.tsx` or `tableaux.test.ts` that the new rules change, pinned as the view now says it and reported). No page source changes, and nothing under `src/engine/**`.
- **Every number comes from the rulebook, and examples say where:** a section or ruling in each title, as the existing examples do, and each task's "How the numbers come".
- **Anti-goals (spec and overview):** a rival seeing a hidden zone; a rule approximated without a recorded call; a game that can't end; an auto-player that hides a rule that never fires.
- **Every rules line is pinned.** Each line this plan adds or changes, other than `Hint:` lines and `Cards can …` / `Players can …` declarations, fails some example when it alone is removed (the lesson of plan 3-1's final review). Each task's Step 4 runs that removal probe.
- **Example counts.** N₄ is the count the committed test pins (`results` length) when Task 1 starts: 101 at `97899e5`, plus plan 4-2's 39 and whatever fix waves add. The tasks end at N₄ + 8, + 12, + 20, + 32, + 39 and + 48. Each task updates `results` in `startup-simulator.test.ts`, the Startup test in `designer-page.test.tsx` and the README's "Its N examples".
- **Commands.**
  - Single file: `bunx vitest run src/games/startup-simulator.test.ts`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1: record `BASE=$(git rev-parse HEAD)`; run `bun run test` once for the passing count and the long runs' time; note N₄.
- **Existing tests.** Only the lines each task names change. If any other existing test fails, stop and report it.
- **Long runs.** If an invariant shows a wrong rule, fix the rules text. If a required tally stays at 0, change the auto-player (cadences, targets), never the rules; report a key that stays unreachable. If a rule can't be written with plans 4-1 and 5-1's phrases, report it. If the long runs take more than a third longer than at BASE, report the timing.
- **Pre-flight notes carried from plan 4-2:** take every `shownFlags` / `standIns` pin from HEAD and apply only the change named (a flag read through anything but the card fails closed); never write `For each card … that is X` (a For-each takes no flag test; the lines below use `whose`, `on it` or a zone); a count at 0 may have no key, so the test file reads counts as numbers with missing as 0, never with `hasOwn`.
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefix `feat(games):` (`docs:` for a README-only commit).
  - TDD every task: change the test first, watch it fail, then the rules, pass, `bun run typecheck`, commit.
  - Every rules line below is exact copy. Insertion points name a line or section by its text, never by a line number. **Re-read the committed rules file before each task:** plan 4-2's text is the base, and its line numbers will have moved.

## Review Focus

- **A trained Junior moving about the Board.**
  - Expected: a declared mode stays while it moves between projects and the ops team and is lost on the bench or in the open job market; one reaching the Board after the declaration works in its native colour; it never works in a colour it has no skill in.
  - Tests: Task 1, examples 7–8 and the long-run mode invariant.
- **Staff leaving the Board with tokens.**
  - Expected: a Dismiss or an unpaid let-go strips XP, Skill, Pending and Badge tokens; a bench discard or a Layoff keeps them, so the next hirer gets them for $1.
  - Tests: Task 2, examples 2–4 and the long-run firing invariant.
- **A Launch whose step has nothing to choose, or only part of a choice.**
  - Expected: Juniors with one token graduate with no press; a Junior at 4 XP graduates nothing; the Mentor waits only while a Junior that has kept one still holds another; the turn goes back to its actions, or on to the Engine after the last action.
  - Tests: Task 4, examples 1, 2, 6 and 7, and the arranged auto-player test.
- **Agile and Synergy around onboarding cards.**
  - Expected: an onboarding PM gives neither; an onboarding teammate is no worker; a PM arriving in the same Assign spares no one; a PM that moves itself is onboarding.
  - Tests: Task 6, examples 3–6.
- **Undo and replay across Pending tokens, a graduation and an Agile spare.**
  - Expected: the log alone rebuilds the finished game, and undo of the last move gives the state before it.
  - Test: Task 7.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name. If one is missing or differs, stop and report it.

- **Plan 4-2, built:**
  - the rules sections `Blue output:`, `Red output:`, `QA output:`, `Blue team output:`, `Red team output:`, `QA team output:`, `Declarable:`, `Rev:`, `Rev bonus:`, `Attaching:`, `Salary:`; the phases `modes` (two `declare a card in their … team` buttons with the options `Blue:`, `Red:`, `QA:`), `ops check`, `income` (with `When this phase starts:`), `engine` (as 4-2's Task 3 writes it), `final check`; the four `When a card in … is red mode / qa mode:` rules at the end of `In every phase:`; Launch's `Every card on it that is attaching goes to their ops team, staying on it.`; Pivot's `It loses its bugs.`;
  - in the test file: `DECLARE`, `CONFIRM_MODES`, `PRE_INCOME`, `enteredIncome`, `CLEAN`, `ASSIGN_TO_PRODUCT`, `HIRE_AGENCY_TO_PRODUCT`, `HIRE_SCOUTED_TO_PRODUCT`, `REASSIGN_TO_PRODUCT`, `onProduct`, `FINAL_CHECK`, `turnsIn(log, skipped)`, `qaForBugs`, `hireGrowthHacker`, `moveGrowthHacker`, `scoreOf`, the mode invariant, the values test `works out slice 4’s values …`, and the long-run tallies.
- **Plan 5-1, built (its Interfaces):** `a card's {attribute} is the number of {cardgroup}`; `it is (not) a card whose {cardfilter}`; `a card's {attribute} goes up by its {attribute}` and `… times its {attribute}`; `its owner has (a / no) card in their {perzone} {cardclause}`; `the card it is on is (not) {cardclass}`; targets in several zones, `some / no card on the target card is {cardflag}`, `every picked card is (not) {cardflag}`; `{cardgroup} gain {int} {attribute}` and `up to its {attribute} of {cardgroup} gain {int} {attribute}, first card first`; `every card on it that is {cardflag} is {cardflag}`; the graduation step's pieces (Task 7's `SORT_GAME`).
- **Plans 4-1 and earlier:** `a {cardflag} card's {attribute} is {int}` / `… is its {attribute}`, `{cardclass}'s {attribute} is {int}` / `… is its {attribute}`, the group flag test `the cards on it that are {cardflag}`, `a card in an {perzone} is {cardflag}`, `a card in {sharedzone} is {cardflag}`, `no card in {zones} is {cardflag}`, `every card in {zone} is not {cardflag}`, `its {attribute} are {int}`, `its {attribute} are more than {int}`, `it loses its {attribute}`, `the {phase} phase starts with them`, `go back to the interrupted turn`, `players can have {factlist}`, `they gain {int} {playernumber}`, `their {playernumber} go back to {int}`, `they have {int} {playernumber}`; `playerFact` (`board-state.ts`).

---

### Task 1: Tokens, the Juniors' role, outputs with XP and Skill tokens, multi-skilled modes, the salary bump

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: plan 4-2's modes and outputs; plan 5-1's `goes up by its {attribute}`.
- Produces (rules): the counts and flags in "Names"; the `role` column `Junior` on the three University stacks; worked `xp`, `skills`, `experienced`; `blue mode`.
- Produces (test file): `const TOKENS = ['blue xp', 'red xp', 'green xp', 'training xp', 'blue skill', 'red skill', 'green skill', 'pending blue', 'pending red', 'pending green'] as const;` and `const tokenOn = (card: CardState, name: string) => (card.data?.[name] as number | undefined) ?? 0;`.

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₄ + 8. `designer-page.test.tsx`'s Startup test reads N₄ + 8.
  - **Append `it('works out slice 5’s values for cards: XP, Skill tokens and the salary bump (§3, §11.A)')`:** `game.worked` has `xp` and `skills` (`kind: 'number'`, `refines: false`) and `experienced` (`kind: 'flag'`); `salary` still `refines: true`. Tasks 2–6 extend it.
  - **3-2's pins:** `shownFlags(game)` gains `'experienced'` right after `'efficient in ops'`; `standIns(game)` is unchanged.
  - **Invariants (Review Focus 1)**, in `keepsTheRules`, after every move:
    - only a `Junior` card holds `blue xp`, `red xp`, `green xp`, `blue skill`, `red skill` or `green skill`, and none holds a Skill token of its native colour (`blue skill` on a `software` card, `red skill` on a `hardware` card, `green skill` on a `qa` card);
    - a Junior's worked `xp` is at most 4;
    - `blue mode` sits only on a card with `blue skill` above 0, in a development team or an ops team;
    - 4-2's mode invariant widens: `qa mode` sits only on a `QA Skill` card, a `qa` card or a card with `green skill` above 0; `red mode` only on a declarable card; and a card's `blue mode` changes in a move only by a declare press of that card or its leaving both teams.
  - **The auto-player:** no change. Check that 4-2's `modes` handler finds declarable cards through `runtime.workedFlag(…, 'declarable')`; it then declares trained Juniors too.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`. Expected: FAIL (the count, the values test).
- [ ] **Step 3: Change the rules text.**
  - **The University stacks** (R5). Each of the three tables gains a last column `role` holding `Junior`:

```text
  A stack called junior software devs that never runs out:
    | name                | cost | skill    | output | salary | role   |
    | Junior Software Dev | 2    | software | 1      | 0      | Junior |
  A stack called junior hardware engineers that never runs out:
    | name                | cost | skill    | output | salary | role   |
    | Junior Hardware Eng | 2    | hardware | 1      | 0      | Junior |
  A stack called junior qa testers that never runs out:
    | name             | cost | skill | output | salary | role   |
    | Junior QA Tester | 2    | qa    | 1      | 0      | Junior |
```

  - **Cards.** After `  Cards can be qa mode.` add:

```text
  Cards can be blue mode.
  Cards can have blue xp, red xp, green xp and training xp.
  Cards can have blue skill, red skill and green skill.
  Cards can have pending blue, pending red and pending green.
  Cards can be badged.
```

  - **Blue output.** The section becomes:

```text
Blue output:
  A software card's blue output is its output.
  A flex card's blue output is its output.
  A blue mode card's blue output is its output.
  A card's blue output goes up by its blue xp.
  A red mode card's blue output is 0.
  A qa mode card's blue output is 0.
  An onboarding card's blue output is 0.
```

  - **Red output.** The section becomes:

```text
Red output:
  A hardware card's red output is its output.
  A red mode card's red output is its output.
  A card's red output goes up by its red xp.
  A qa mode card's red output is 0.
  A blue mode card's red output is 0.
  An onboarding card's red output is 0.
```

  - **QA output.** The section becomes (Task 5 adds two lines):

```text
QA output:
  A qa card's qa output is its output.
  A qa mode card's qa output is 1.
  A card's qa output goes up by its green xp.
  A red mode card's qa output is 0.
  A blue mode card's qa output is 0.
  An onboarding card's qa output is 0.
```

  - **XP, Skills, Experienced.** Right before `Salary:` add:

```text
XP:
  A Junior card's xp is its blue xp.
  A card's xp goes up by its red xp.
  A card's xp goes up by its green xp.

Skills:
  A Junior card's skills is its blue skill.
  A card's skills goes up by its red skill.
  A card's skills goes up by its green skill.

Experienced:
  Only if it is a Junior card.
  Only if its xp is more than 1.
```

  - **Salary.** After `  An efficient in ops card's salary is 1.` add `  An experienced card's salary is 1.`
  - **Declarable.** The section becomes:

```text
Declarable:
  Only if one of:
    It is a flex card.
    It is a QA Skill card.
    Its skills are more than 0.
```

  - **The declaration.** In both `A player may declare a card in their development team.` and `A player may declare a card in their ops team.`, the block under `They choose one:` becomes:

```text
        Blue:
          Only if one of:
            It is a flex card.
            It is a software card.
            Its blue skill is more than 0.
          It is not red mode.
          It is not qa mode.
          If its blue skill is more than 0, it is blue mode.
        Red:
          Only if one of:
            It is a flex card.
            It is a hardware card.
            Its red skill is more than 0.
          It is red mode.
          It is not qa mode.
          It is not blue mode.
        QA:
          Only if one of:
            It is a QA Skill card.
            It is a qa card.
            Its green skill is more than 0.
          It is qa mode.
          It is not red mode.
          It is not blue mode.
```

  - **Forgetting** (R5, ruling 24). After `  When a card in the open job market is qa mode:` and its line add:

```text
  When a card in a bench is blue mode:
    It is not blue mode.
  When a card in the open job market is blue mode:
    It is not blue mode.
```

  - **Append these 8 examples.**

```text
Example: a Junior Software Dev with 2 Blue XP makes 3 Blue, and from 2 XP its salary is $1 (section 3, section 11)
  Given p1's development has a Dating App
  And the Dating App in p1's development has a Junior Software Dev on it
  And the Junior Software Dev in p1's development team has 2 blue xp
  And the turn passes to the left
  Then it is p1's turn
  And the phase is income
  When p1 pays salaries
  Then p1 has 6 capital
  When p1 ends their actions
  Then the Dating App in p1's development has 3 blue cubes

Example: XP adds to a Junior's output only in its own colour, a Junior with 1 XP is paid nothing, and XP of every colour counts toward the $1 (section 3, section 11)
  Given p1's development has a Smart Lock
  And the Smart Lock in p1's development has 3 bugs
  And the Smart Lock in p1's development has a Junior Hardware Eng and a Junior QA Tester on it
  And the Junior Hardware Eng in p1's development team has 1 red xp
  And the Junior QA Tester in p1's development team has 1 green xp
  And the Junior QA Tester in p1's development team has 1 red xp
  And the Junior QA Tester in p1's development team has 1 red skill
  And the turn passes to the left
  Then the phase is modes
  When p1 confirms their modes
  Then the phase is income
  When p1 pays salaries
  Then p1 has 6 capital
  When p1 ends their actions
  Then the Smart Lock in p1's development has 2 red cubes
  And the Smart Lock in p1's development has 1 bug

Example: a Junior Software Dev with 2 Blue XP and a Red Skill token declared Red makes 1 Red, its Blue XP idle (section 11, the slice's R11)
  Given p1's development has a Smart Lock
  And the Smart Lock in p1's development has a Junior Software Dev on it
  And the Junior Software Dev in p1's development team has 2 blue xp
  And the Junior Software Dev in p1's development team has 1 red skill
  And the turn passes to the left
  Then the phase is modes
  When p1 declares the Junior Software Dev, choosing red
  And p1 confirms their modes
  Then the phase is income
  When p1 pays salaries
  And p1 ends their actions
  Then the Smart Lock in p1's development has 1 red cube
  And the Smart Lock in p1's development has 0 blue cubes
  And p1 has 6 capital

Example: a Junior Hardware Eng with a Blue Skill token declared Blue makes 1 Blue, its Red XP idle (section 11)
  Given p1's development has a Smart Lock
  And the Smart Lock in p1's development has a Junior Hardware Eng on it
  And the Junior Hardware Eng in p1's development team has 2 red xp
  And the Junior Hardware Eng in p1's development team has 1 blue skill
  And the turn passes to the left
  Then the phase is modes
  When p1 declares the Junior Hardware Eng, choosing blue
  And p1 confirms their modes
  And p1 pays salaries
  And p1 ends their actions
  Then the Smart Lock in p1's development has 1 blue cube
  And the Smart Lock in p1's development has 0 red cubes

Example: multi-skilled Juniors and a flex Senior work in the mode declared each turn, and in their own colour again when declared so (section 11, section 5)
  Given p1's development has a Cloud Storage
  And the Cloud Storage in p1's development has 3 bugs
  And the Cloud Storage in p1's development has a Junior Hardware Eng, a Junior QA Tester, a Junior Software Dev and a Firmware Specialist on it
  And the Junior Hardware Eng in p1's development team has 1 blue skill
  And the Junior QA Tester in p1's development team has 1 red skill
  And the Junior Software Dev in p1's development team has 1 green skill
  And the turn passes to the left
  Then the phase is modes
  When p1 declares the Junior Hardware Eng, choosing blue
  And p1 declares the Junior QA Tester, choosing red
  And p1 declares the Junior Software Dev, choosing qa
  And p1 declares the Firmware Specialist, choosing red
  And p1 confirms their modes
  And p1 pays salaries
  And p1 ends their actions
  Then the Cloud Storage in p1's development has 1 blue cube
  And the Cloud Storage in p1's development has 3 red cubes
  And the Cloud Storage in p1's development has 2 bugs
  When p0 ends their actions
  Then it is p1's turn
  And the phase is modes
  When p1 declares the Junior Hardware Eng, choosing red
  And p1 declares the Junior QA Tester, choosing qa
  And p1 declares the Junior Software Dev, choosing blue
  And p1 declares the Firmware Specialist, choosing blue
  And p1 confirms their modes
  And p1 pays salaries
  And p1 ends their actions
  Then the Cloud Storage in p1's development has 4 blue cubes
  And the Cloud Storage in p1's development has 4 red cubes
  And the Cloud Storage in p1's development has 1 bug

Example: a Junior QA Tester with a Blue Skill token declared Blue makes Blue and cleans no Bug, until it is declared QA again (section 11)
  Given p1's development has a Dating App
  And the Dating App in p1's development has 2 bugs
  And the Dating App in p1's development has a Junior QA Tester on it
  And the Junior QA Tester in p1's development team has 1 blue skill
  And the turn passes to the left
  Then the phase is modes
  When p1 declares the Junior QA Tester, choosing blue
  And p1 confirms their modes
  Then the phase is actions
  When p1 ends their actions
  Then the Dating App in p1's development has 1 blue cube
  And the Dating App in p1's development has 2 bugs
  When p0 ends their actions
  Then the phase is modes
  When p1 declares the Junior QA Tester, choosing qa
  And p1 confirms their modes
  And p1 ends their actions
  Then the Dating App in p1's development has 1 blue cube
  And the Dating App in p1's development has 1 bug

Example: a trained Junior that reaches the Board after the declaration works in its native colour (section 11, ruling 24)
  Given the phase is actions
  And p0's development has a Smart Lock
  And p0's bench has a Junior Hardware Eng
  And the Junior Hardware Eng in p0's bench has 1 blue skill
  When p0 assigns the Junior Hardware Eng to the Smart Lock
  And p0 ends their actions
  Then the Smart Lock in p0's development has 1 red cube
  And the Smart Lock in p0's development has 0 blue cubes

Example: staff that leave the Board forget a declared Blue mode, on the bench and in the open job market (ruling 24)
  Given the phase is actions
  And p0's operations has a Smart Lock
  And p0's ops team has a Junior Hardware Eng and a Junior QA Tester
  And the Junior Hardware Eng in p0's ops team has 1 blue skill
  And the Junior Hardware Eng in p0's ops team is blue mode
  And the Junior QA Tester in p0's ops team has 1 blue skill
  And the Junior QA Tester in p0's ops team is blue mode
  When p0 recalls the Junior Hardware Eng
  And p0 dismisses the Junior QA Tester
  Then the Junior Hardware Eng in p0's bench is not blue mode
  And the Junior QA Tester in the open job market is not blue mode
```

  **How the numbers come** (§3 Talent Growth, §11.A–C, §20.B, §20.C):
  - **Juniors:** output 1 in their native colour or a Skill token's (§11.A.1), plus 1 per Permanent XP of the colour they work in (§11.C.3); salary $0 at 0–1 XP and $1 at 2 or more, any colour (§3, §11.A.3). So 1 + 2 = 3 Blue; 1 + 1 = 2 Red; 1 + 1 = 2 Bugs; 7 − 1 = 6.
  - **The Firmware Specialist:** flex, output 2, salary $2 (§20.B): 7 − 2 − 2 = 3 after two Incomes.
  - **Products:** Dating App 6 Blue; Smart Lock 1 Blue / 5 Red; Cloud Storage 4 Blue / 4 Red, Tier 1, so no lead (§20.C.1).
  - **The Cloud Storage example:** first turn Blue 1 (Hardware Eng), Red 1 + 2 (QA Tester, Firmware Specialist), Bugs 3 − 1 (Software Dev in QA); second turn Blue 1 + 1 + 2 = 4, Red 3 + 1 = 4, Bugs 2 − 1 = 1.
  - **Lines each example pins** (for the removal probe): 1 the xp line and `blue xp` output; 2 `red xp` and `green xp` outputs, the XP lines' red and green, `more than 1`; 3–4 `Its skills …`, the Skills lines, `blue mode` and the Blue/Red skill alternatives; 5 every option's alternatives and clearing lines but the QA option's `It is not blue mode.`, which 6 pins with `A blue mode card's qa output is 0.`; 8 both forgetting rules. 7 is a guard (R5's correction a).
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`. Then the removal probe: a throwaway script in the session scratchpad (never committed) compiles the rules once without each line this task added or changed, alone, and runs the examples; every removal must fail an example or give a diagnostic. Report any line that survives.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Juniors carry XP and Skill tokens that raise their output and salary, and multi-skilled Juniors work in the mode their owner declares

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: Firing strips tokens, bench discards keep them, Human Capital in the score

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: Task 1's tokens, `xp`, `skills`, `TOKENS`, `tokenOn`.
- Produces (rules): the flag `fired`; worked `badge points`, `human capital`; three score lines.
- Produces (test file): `scoreOf(runtime: LangRuntime, state: GameState, seat: PlayerId): number`, every caller passing its runtime.

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₄ + 12; the designer page's count too.
  - **The values test** adds `badge points` and `human capital` (numbers, `refines: false`).
  - **`scoreOf`** takes the runtime and adds, for each card in the seat's bench, development team and ops team, `runtime.workedValue(state, id, 'human capital')`, a null counting 0 (§12.6, ruling 25).
  - **Invariants (Review Focus 2):**
    - a card that moves from a development team or an ops team to the open job market in a `DISMISS_FROM_PROJECT`, `DISMISS_FROM_OPS` or `LET_GO` press holds no count of `TOKENS` and is not `badged` after the move;
    - a card that moves from a bench to the open job market (a bench cleanup discard or a Layoff) holds after the move exactly the `TOKENS` counts and `badged` it held before;
    - no card is `fired` after any move;
    - only a `Bug Hunter` or `Rainmaker` card holds `training xp`, at most 2; no `Senior Developer` card is `badged`.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Cards.** After `  Cards can be badged.` add `  Cards can be fired.`
  - **Firing** (R4, §18.B). In each of `A player may dismiss a card in their development team.`, `A player may dismiss a card in their ops team.`, `A player may let go of a card in their development team.` and `A player may let go of a card in their ops team.`, right before `      Move it to the open job market.` add `      It is fired.`
  - **The strip.** At the end of `In every phase:` add:

```text
  When a card in the open job market is fired:
    It loses its blue xp.
    It loses its red xp.
    It loses its green xp.
    It loses its training xp.
    It loses its blue skill.
    It loses its red skill.
    It loses its green skill.
    It loses its pending blue.
    It loses its pending red.
    It loses its pending green.
    It is not badged.
    It is not fired.
```

  - **Human Capital.** Right after the `Experienced:` section add:

```text
Badge points:
  A badged card's badge points is 2.

Human capital:
  A Junior card's human capital is its xp.
  A Specialist card's human capital is its training xp.
  A card's human capital goes up by its skills.
  A card's human capital goes up by its badge points.
```

  - **The score** (§12.6). After `  Each player scores 2 points for each market share.` add:

```text
  Each card in a player's bench scores its human capital.
  Each card in a player's development team scores its human capital.
  Each card in a player's ops team scores its human capital.
```

  - **Append these 4 examples.**

```text
Example: Human Capital scores 1 point for each Permanent XP and Skill token and 2 for each Badge, on the bench and on the Board, and nothing for a Pending token (section 12, ruling 25)
  Given the crash pile has the Market Crash
  And it is p1's turn
  And p0's bench has a Junior Software Dev and a QA Engineer
  And the Junior Software Dev in p0's bench has 2 blue xp
  And the Junior Software Dev in p0's bench has 1 red skill
  And the Junior Software Dev in p0's bench is badged
  And the QA Engineer in p0's bench has 1 training xp
  And p0's development has a Smart Lock
  And the Smart Lock in p0's development has a Junior Hardware Eng and a Junior PM on it
  And the Junior Hardware Eng in p0's development team has 1 red xp
  And the Junior Hardware Eng in p0's development team has 1 blue skill
  And the Junior Hardware Eng in p0's development team has 1 pending red
  And the Junior PM in p0's development team is badged
  And p0's operations has a Dating App
  And p0's ops team has a Junior Software Dev
  And the Junior Software Dev in p0's ops team has 1 green xp
  And the Junior Software Dev in p0's ops team has 1 green skill
  When p1 ends their actions
  Then the game is over
  And p0 scores 18
  And p1 scores 1

Example: staff dismissed from the Board lose their XP, Skill, Pending and Badge tokens in the open job market (section 18)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has a Junior Hardware Eng on it
  And the Junior Hardware Eng in p0's development team has 1 blue xp
  And the Junior Hardware Eng in p0's development team has 1 red xp
  And the Junior Hardware Eng in p0's development team has 1 green xp
  And the Junior Hardware Eng in p0's development team has 1 blue skill
  And the Junior Hardware Eng in p0's development team has 1 green skill
  And the Junior Hardware Eng in p0's development team has 1 pending blue
  And the Junior Hardware Eng in p0's development team has 1 pending red
  And the Junior Hardware Eng in p0's development team has 1 pending green
  And the Junior Hardware Eng in p0's development team is badged
  And p0's operations has a To-Do List
  And p0's ops team has a Junior Software Dev and a QA Engineer
  And the Junior Software Dev in p0's ops team has 1 red skill
  And the QA Engineer in p0's ops team has 2 training xp
  And the QA Engineer in p0's ops team is badged
  When p0 dismisses the Junior Hardware Eng
  And p0 dismisses the Junior Software Dev
  And p0 dismisses the QA Engineer
  Then the open job market has a Junior Hardware Eng, a Junior Software Dev and a QA Engineer
  And the Junior Hardware Eng in the open job market has 0 blue xp
  And the Junior Hardware Eng in the open job market has 0 red xp
  And the Junior Hardware Eng in the open job market has 0 green xp
  And the Junior Hardware Eng in the open job market has 0 blue skill
  And the Junior Hardware Eng in the open job market has 0 green skill
  And the Junior Hardware Eng in the open job market has 0 pending blue
  And the Junior Hardware Eng in the open job market has 0 pending red
  And the Junior Hardware Eng in the open job market has 0 pending green
  And the Junior Hardware Eng in the open job market is not badged
  And the Junior Hardware Eng in the open job market is not fired
  And the Junior Software Dev in the open job market has 0 red skill
  And the QA Engineer in the open job market has 0 training xp
  And the QA Engineer in the open job market is not badged

Example: staff let go unpaid at Income lose their tokens, from a project and from the ops team (section 5, section 18)
  Given p1's development has a Dating App
  And the Dating App in p1's development has a Junior Software Dev on it
  And the Junior Software Dev in p1's development team has 2 blue xp
  And p1's operations has a Smart Lock
  And p1's ops team has a Junior Hardware Eng
  And the Junior Hardware Eng in p1's ops team has 2 red xp
  And the turn passes to the left
  Then the phase is income
  When p1 lets go of the Junior Software Dev
  And p1 lets go of the Junior Hardware Eng
  Then the phase is actions
  And the open job market has a Junior Software Dev and a Junior Hardware Eng
  And the Junior Software Dev in the open job market has 0 blue xp
  And the Junior Hardware Eng in the open job market has 0 red xp

Example: a trained Junior discarded from the bench keeps its tokens, and another player hires it for $1 with them (section 15, section 13)
  Given the phase is bench cleanup
  And p0's bench has a Junior Software Dev, a QA Engineer, a QA Engineer, a QA Engineer, a Sales Rep and a Sales Rep
  And the Junior Software Dev in p0's bench has 2 blue xp
  And the Junior Software Dev in p0's bench has 1 red skill
  When p0 discards the Junior Software Dev
  Then it is p1's turn
  And the Junior Software Dev in the open job market has 2 blue xp
  When p1 hires the Junior Software Dev
  Then it is accepted
  And p1 has 6 capital
  And the Junior Software Dev in p1's bench has 2 blue xp
  And the Junior Software Dev in p1's bench has 1 red skill
```

  **How the numbers come** (§12, §18.B, §13.B, §20.B):
  - **Human Capital** (§12.6): bench Software Dev 2 XP + 1 Skill + 2 for its Badge = 5; QA Engineer 1 Training XP = 1; Hardware Eng 1 XP + 1 Skill = 2, its Pending token 0; badged Junior PM 2; ops Software Dev 1 XP + 1 Skill = 2. Total 12.
  - **The score** (§12): 7 capital is 1; the Dating App online (the ops Software Dev's Blue 1 covers its maintenance 1, so the final check passes) is val 5; 1 + 5 + 12 = 18. p1 scores 1.
  - **Let go:** each Junior has 2 XP, so a $1 salary (§3); the Smart Lock's $2 rev and the Hardware Eng's Red 1 + 2 cover it; letting both go leaves no salary, so Income goes on to actions.
  - **The open job market:** $1 (§13.A), 7 − 1 = 6.
  - **Lines each example pins:** 1 the three score lines and every Human Capital, Badge points and XP line; 2 the dismiss lines and the strip rule's lines; 3 the two let-go lines; 4 is a guard (bench discards keep, §15.A.3).
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe as in Task 1.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's fired staff lose their XP, Skill, Pending and Badge tokens while bench discards keep them, and Human Capital joins the score

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: Pending XP at the Engine, and the Pivot that returns it

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: Task 1's outputs; plan 5-1's `{cardgroup} gain {int} {attribute}` and `up to its {attribute} of {cardgroup} gain {int} {attribute}, first card first`.
- Produces (rules): worked flags `blue learner`, `red learner`, `green learner`; three Engine lines; three Pivot lines.
- Produces (test file): `const PENDING = ['pending blue', 'pending red', 'pending green'] as const;`.

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₄ + 20; the designer page's count too.
  - **The values test** adds `blue learner`, `red learner` and `green learner` (flags).
  - **Invariants:**
    - no card holds more than 1 of any `PENDING` count;
    - a card holds a `PENDING` count only in a development team or an ops team (Task 4 narrows this);
    - a card's `PENDING` count rises in a move only when the move ran the Engine for the card's owner (`ranTheEngine`) and the card sits on a project of that owner's development.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Learners.** Right after the `Human capital:` section add:

```text
Blue learner:
  Only if it is a Junior card.
  Only if its blue output is more than 0.
  Only if its pending blue is 0.

Red learner:
  Only if it is a Junior card.
  Only if its red output is more than 0.
  Only if its pending red is 0.

Green learner:
  Only if it is a Junior card.
  Only if its qa output is more than 0.
  Only if its pending green is 0.
```

  - **Generate & Learn, Clean & Learn** (§5 Phase D steps 1–2, R7). In `Phase: engine`'s `When this phase starts:`, right after `    For each card in their development, its new red cubes go up by its red team output.` add (the Green line comes before the Bugs are cut, which is why it reads `its bugs`):

```text
    For each card in their development whose blue team output is more than 0, the cards on it that are blue learners gain 1 pending blue.
    For each card in their development whose red team output is more than 0, the cards on it that are red learners gain 1 pending red.
    For each card in their development whose qa team output is more than 0, up to its bugs of the cards on it that are green learners gain 1 pending green, first card first.
```

  - **Pivot** (§6, §11.B.3). In the pivot button, right before `      Every card on it goes to their bench.` add:

```text
      For each card on it, it loses its pending blue.
      For each card on it, it loses its pending red.
      For each card on it, it loses its pending green.
```

  - **Append these 8 examples.**

```text
Example: a Junior making Blue gains one Blue Pending token, never two, even at 4 XP, and a Senior beside it gains none (section 11, ruling 1)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has a Junior Software Dev and the Architect on it
  And the Junior Software Dev in p0's development team has 4 blue xp
  When p0 ends their actions
  Then the Junior Software Dev in p0's development team has 1 pending blue
  And the Architect in p0's development team has 0 pending blue
  When p1 ends their actions
  And p0 pays salaries
  And p0 ends their actions
  Then the Junior Software Dev in p0's development team has 1 pending blue

Example: a Junior Hardware Eng on a Blue-only project gains a Red Pending token for the cubes it wastes, once, and no one gains a token of a colour they don't make (ruling 25, section 11)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has a Junior Software Dev, a Junior Hardware Eng and the Diva on it
  When p0 ends their actions
  Then the Dating App in p0's development has 0 red cubes
  And the Junior Hardware Eng in p0's development team has 1 pending red
  And the Junior Hardware Eng in p0's development team has 0 pending blue
  And the Junior Software Dev in p0's development team has 0 pending red
  And the Diva in p0's development team has 0 pending red
  When p1 ends their actions
  And p0 pays salaries
  And p0 ends their actions
  Then the Junior Hardware Eng in p0's development team has 1 pending red

Example: a Junior QA Tester cleaning a Bug off its project gains a Green Pending token, and a Junior Software Dev beside it does not (section 5, section 11, ruling 1)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has 2 bugs
  And the Dating App in p0's development has a Junior Software Dev and a Junior QA Tester on it
  When p0 ends their actions
  Then the Dating App in p0's development has 1 bug
  And the Junior QA Tester in p0's development team has 1 pending green
  And the Junior Software Dev in p0's development team has 0 pending green

Example: with one Bug and two Juniors who could clean it, the first on the project gains Green, and once it holds one the next does (section 11, the Rust engine's team order)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has 1 bug
  And the Dating App in p0's development has a Junior Hardware Eng and a Junior QA Tester on it
  And the Junior Hardware Eng in p0's development team has 1 green skill
  And the Junior Hardware Eng in p0's development team is qa mode
  When p0 ends their actions
  Then the Junior Hardware Eng in p0's development team has 1 pending green
  And the Junior QA Tester in p0's development team has 0 pending green
  Given the Dating App in p0's development has 1 bug
  When p1 ends their actions
  Then the phase is modes
  When p0 confirms their modes
  And p0 ends their actions
  Then the Junior QA Tester in p0's development team has 1 pending green

Example: a Junior takes the Green token ahead of a Senior cleaning beside it (section 11, the Rust engine's order)
  Given the phase is actions
  And p0's development has a Server Farm
  And the Server Farm in p0's development has 1 bug
  And the Server Farm in p0's development has the Fixer and a Junior QA Tester on it
  And the Fixer in p0's development team is qa mode
  When p0 ends their actions
  Then the Server Farm in p0's development has 0 bugs
  And the Junior QA Tester in p0's development team has 1 pending green
  And the Fixer in p0's development team has 0 pending green

Example: a Stalled project teaches nothing: no Pending token of any colour (section 3, the slice's R7)
  Given the phase is actions
  And p0's development has a Neobank and a Server Farm
  And the Neobank in p0's development has 1 bug
  And the Neobank in p0's development has a Junior Software Dev and a Junior QA Tester on it
  And the Server Farm in p0's development has a Junior Hardware Eng on it
  When p0 ends their actions
  Then the Neobank in p0's development is stalled
  And the Server Farm in p0's development is stalled
  And the Neobank in p0's development has 1 bug
  And the Junior Software Dev in p0's development team has 0 pending blue
  And the Junior QA Tester in p0's development team has 0 pending green
  And the Junior Hardware Eng in p0's development team has 0 pending red

Example: an onboarding Junior learns nothing, and neither does work in the ops team (section 5, ruling 8)
  Given the phase is actions
  And p0's development has a Dating App and a To-Do List
  And the To-Do List in p0's development has a Junior Software Dev on it
  And p0's operations has a Mobile Wallet
  And the Mobile Wallet in p0's operations has 1 bug
  And p0's ops team has a Junior QA Tester
  When p0 reassigns the Junior Software Dev to the Dating App
  And p0 ends their actions
  Then the Junior Software Dev in p0's development team has 0 pending blue
  And the Mobile Wallet in p0's operations has 0 bugs
  And the Junior QA Tester in p0's ops team has 0 pending green

Example: Pending tokens stay with a Junior who is Reassigned, and a Pivot returns them all (section 11, section 6)
  Given the phase is actions
  And p0's development has a Dating App and a Smart Lock
  And the Dating App in p0's development has a Junior Software Dev, a Junior Hardware Eng and a Junior QA Tester on it
  And the Junior Software Dev in p0's development team has 1 pending blue
  And the Junior Hardware Eng in p0's development team has 1 pending red
  And the Junior QA Tester in p0's development team has 1 pending green
  When p0 reassigns the Junior Software Dev to the Smart Lock
  Then the Junior Software Dev in p0's development team has 1 pending blue
  When p0 pivots the Dating App
  Then p0's bench has a Junior Hardware Eng and a Junior QA Tester
  And the Junior Hardware Eng in p0's bench has 0 pending red
  And the Junior QA Tester in p0's bench has 0 pending green
  When p0 pivots the Smart Lock
  Then the Junior Software Dev in p0's bench has 0 pending blue
```

  **How the numbers come** (§3, §5 Phase D, §11.B, §20.B, §20.C):
  - **One per colour** (ruling 1): a second turn of the same work leaves 1.
  - **Salaries at p0's second Income:** the Software Dev at 4 XP $1 and the Architect $2 (§3, §20.B), well within 7; the Diva $1.
  - **Bugs:** the QA Tester removes 1 (§20.B.2); the Hardware Eng in QA mode 1 and the QA Tester 1, so one Bug needs only the first; the Fixer in QA mode 1 (§20.B), and he leads the Server Farm in any mode (plan 4-2's example).
  - **Stalled:** the Neobank (Tier 2 Software) and the Server Farm (Tier 2 Hardware) have no Senior (§3).
  - **Lines each example pins:** 1 the Blue line, Blue learner's Junior and `pending blue is 0`; 2 the Red line, Blue learner's output test, all three Red learner lines; 3 the Green line and Green learner's output test; 4 `up to its bugs … first card first` and `pending green is 0`; 5 Green learner's Junior line; 6 the three `whose … team output is more than 0` filters; 8 the three Pivot lines. 7 is a guard (§5 D.2: Ops QA earns nothing; ruling 8).
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe. The Pivot removal probe (`'      Every card on it goes to their bench.\n'`) still finds that line exactly once.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Juniors gain one Pending XP token per colour they make or Bugs they clean on a working project, Juniors first for Green, and a Pivot returns them

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: Launch's graduation step, the Mentor and the Junior PM's Badge

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: Tasks 1–3; plan 5-1's `the card it is on is not {cardclass}`, `every card on it that is {cardflag} is {cardflag}` and its Task 7 step.
- Produces (rules): the player number `mentoring`; the flag `graduated`; worked `pending tokens`, `coaching`, `up for promotion`, `maxed out`, `due to graduate`, `choosing a token`, `mentorable`; phase `graduation` with buttons `keep blue on a card in their ops team`, `keep red on …`, `keep green on …`, `mentor a card in their ops team`.
- Produces (test file):

```ts
const GRADUATION = 'graduation';
/** The buttons that keep one Pending token Permanent, by its colour (§11.B.2). */
const KEEP_PENDING: Record<'blue' | 'red' | 'green', string>;   // 'keep blue on a card in their ops team', …
const MENTOR = 'mentor a card in their ops team';
```

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₄ + 32; the designer page's count too. `PHASES` gains `'graduation'` right after `'sourcing'`; `BEFORE_THE_ENGINE` gains `'graduation'`.
  - **The values test** adds `pending tokens` (number) and `coaching`, `up for promotion`, `maxed out`, `due to graduate`, `choosing a token`, `mentorable` (flags).
  - **Invariants (Review Focus 3)**, replacing Task 3's second:
    - a card holds a `PENDING` count only in a development team, or in the ops team of the seat whose turn is in `graduation`;
    - a card is `graduated` only in that ops team, while that seat is in `graduation`;
    - every seat's `playerFact(state, seat, 'mentoring')` is 0 or absent unless its turn is in `graduation`;
    - after a `LAUNCH` press whose `after` phase is not `graduation`, no card of the mover holds a `PENDING` count outside a development team.
  - **The auto-player in `graduation`**, while the step is its: it presses `KEEP_PENDING` in the colour order `['blue', 'red', 'green']` rotated by `t % 3`, each on the first card of its ops team the press allows (`pick`, with `allows`); with none allowed, `MENTOR` on the first card allowed, its choice answered by `pick` as every choice is.
  - **Append `it('makes the graduation choices the auto-player picks, through the page’s view and without it (§11.B.2, ruling 25)')`.**
    - From `setUp(2, 1)`, with S its start player: a Cloud Storage goes to `development-S` with 4 blue cubes and 4 red cubes; the Veteran and S's Junior Software Dev and Junior QA Tester (from its bench) are `putOn` it; the Software Dev gets `pending blue` 1, `pending red` 1, `red skill` 1; the QA Tester `pending blue` 1, `pending green` 1, `blue skill` 1 (`changeCard`).
    - For t = 0 and t = 1, `playTurn` with `throughView` false and true runs until the log holds a `MENTOR` press. At t = 0 the keeps are blue on the Software Dev, then blue on the QA Tester, and the Mentor gives the Software Dev red; at t = 1, red on the Software Dev, green on the QA Tester, and the Mentor gives the Software Dev blue.
    - The two logs at each t are equal.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Players.** After `  Players pay with capital.` add `  Players can have mentoring.`
  - **Cards.** After `  Cards can be fired.` add `  Cards can be graduated.`
  - **The step's values.** Right after the `Green learner:` section add:

```text
Pending tokens:
  A Junior card's pending tokens is its pending blue.
  A card's pending tokens goes up by its pending red.
  A card's pending tokens goes up by its pending green.

Coaching:
  Only if it is a Mentor card.
  Only if it is not onboarding.

Up for promotion:
  Only if it is a Synergy card.
  Only if it is not badged.
  Only if the card it is on is not a Tier 1 card.

Maxed out:
  Only if its xp is more than 3.

Due to graduate:
  Only if its pending tokens are 1.
  Only if it is not graduated.
  Only if it is not maxed out.

Choosing a token:
  Only if its pending tokens are more than 1.
  Only if it is not graduated.
  Only if it is not maxed out.

Mentorable:
  Only if it is graduated.
  Only if it is not maxed out.
  Only if its pending tokens are more than 0.
```

  - **Launch** (§6, §11.B.2, §11.E.2, R2, R8). In the launch button's `Then:`, before `      Every card on it that is attaching goes to their ops team, staying on it.` add the first two lines, and after `      Every card on it that is not attaching goes to their ops team.` add the third:

```text
      If some card on it is coaching, they gain 1 mentoring.
      Every card on it that is up for promotion is badged.
      The graduation phase starts with them.
```

  - **The graduation phase.** Right after the `Phase: sourcing` block add:

```text
Phase: graduation
  Players take turns.
  Hint: Each Junior on the launched team keeps one of its Pending XP tokens as Permanent XP. With the Veteran on the team, one Junior that kept one may keep a second.
  When a card in an ops team is due to graduate:
    If its pending blue is 1, it gains 1 blue xp.
    If its pending red is 1, it gains 1 red xp.
    If its pending green is 1, it gains 1 green xp.
    It loses its pending blue.
    It loses its pending red.
    It loses its pending green.
  A player may keep blue on a card in their ops team.
    Only if it is choosing a token.
    Only if its pending blue is 1.
    Then:
      It gains 1 blue xp.
      It loses its pending blue.
      It is graduated.
  A player may keep red on a card in their ops team.
    Only if it is choosing a token.
    Only if its pending red is 1.
    Then:
      It gains 1 red xp.
      It loses its pending red.
      It is graduated.
  A player may keep green on a card in their ops team.
    Only if it is choosing a token.
    Only if its pending green is 1.
    Then:
      It gains 1 green xp.
      It loses its pending green.
      It is graduated.
  A player may mentor a card in their ops team.
    Only if they have 1 mentoring.
    Only if it is mentorable.
    Then:
      They choose one:
        Blue:
          Only if its pending blue is 1.
          It gains 1 blue xp.
        Red:
          Only if its pending red is 1.
          It gains 1 red xp.
        Green:
          Only if its pending green is 1.
          It gains 1 green xp.
      Their mentoring go back to 0.
  When no card in their ops team is choosing a token:
    Only if one of:
      They have 0 mentoring.
      No card in their ops team is mentorable.
    Every card in their ops team is not graduated.
    For each card in their ops team, it loses its pending blue.
    For each card in their ops team, it loses its pending red.
    For each card in their ops team, it loses its pending green.
    Their mentoring go back to 0.
    Go back to the interrupted turn.
```

  - **Append these 12 examples.**

```text
Example: at Launch a Junior with one Pending token makes it Permanent with no press, so the Veteran has nothing to mentor (section 6, section 11, section 20)
  Given the phase is actions
  And p0's development has a Cloud Storage
  And the Cloud Storage in p0's development has 4 blue cubes
  And the Cloud Storage in p0's development has 4 red cubes
  And the Cloud Storage in p0's development has the Veteran, a Junior Software Dev, a Junior Hardware Eng and a Junior QA Tester on it
  And the Junior Software Dev in p0's development team has 1 pending blue
  And the Junior Hardware Eng in p0's development team has 1 pending red
  And the Junior QA Tester in p0's development team has 1 pending green
  When p0 launches the Cloud Storage
  Then it is accepted
  And the phase is actions
  And p0 has 2 actions
  And p0 has 0 mentoring
  And the Junior Software Dev in p0's ops team has 1 blue xp
  And the Junior Hardware Eng in p0's ops team has 1 red xp
  And the Junior QA Tester in p0's ops team has 1 green xp
  And the Junior QA Tester in p0's ops team has 0 pending green

Example: a Junior with two Pending tokens keeps the one its owner picks, and the other returns to the supply (section 11, ruling 1)
  Given the phase is actions
  And p0's development has a Smart Lock
  And the Smart Lock in p0's development has 1 blue cube
  And the Smart Lock in p0's development has 5 red cubes
  And the Smart Lock in p0's development has a Junior Hardware Eng and a Junior Software Dev on it
  And the Junior Hardware Eng in p0's development team has 1 pending blue
  And the Junior Hardware Eng in p0's development team has 1 pending red
  And the Junior Hardware Eng in p0's development team has 1 blue skill
  And the Junior Software Dev in p0's development team has 1 pending red
  And the Junior Software Dev in p0's development team has 1 pending green
  And the Junior Software Dev in p0's development team has 1 red skill
  And the Junior Software Dev in p0's development team has 1 green skill
  When p0 launches the Smart Lock
  Then the phase is graduation
  When p0 keeps blue on the Junior Software Dev
  Then it is rejected because "its pending blue is 1"
  When p0 keeps green on the Junior Hardware Eng
  Then it is rejected because "its pending green is 1"
  When p0 keeps red on the Junior Hardware Eng
  And p0 mentors the Junior Hardware Eng
  Then it is rejected because "they have 1 mentoring"
  When p0 keeps green on the Junior Software Dev
  Then the phase is actions
  And the Junior Hardware Eng in p0's ops team has 1 red xp
  And the Junior Hardware Eng in p0's ops team has 0 blue xp
  And the Junior Hardware Eng in p0's ops team has 0 pending blue
  And the Junior Software Dev in p0's ops team has 1 green xp
  And the Junior Software Dev in p0's ops team has 0 pending red

Example: the Veteran's Mentor lets one Junior of its owner's choice, not the first on the team, make a second Pending token Permanent (section 20, ruling 25)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has 6 blue cubes
  And the Dating App in p0's development has the Veteran, a Junior Software Dev and a Junior QA Tester on it
  And the Junior Software Dev in p0's development team has 1 pending blue
  And the Junior Software Dev in p0's development team has 1 pending red
  And the Junior Software Dev in p0's development team has 1 red skill
  And the Junior QA Tester in p0's development team has 1 pending blue
  And the Junior QA Tester in p0's development team has 1 pending green
  And the Junior QA Tester in p0's development team has 1 blue skill
  When p0 launches the Dating App
  Then the phase is graduation
  When p0 keeps red on the Junior QA Tester
  Then it is rejected because "its pending red is 1"
  When p0 keeps red on the Junior Software Dev
  And p0 keeps blue on the Junior QA Tester
  Then the phase is graduation
  And p0 has 1 mentoring
  When p0 keeps green on the Junior QA Tester
  Then it is rejected because "it is choosing a token"
  When p0 mentors the Junior QA Tester
  Then the phase is actions
  And the Junior QA Tester in p0's ops team has 1 blue xp
  And the Junior QA Tester in p0's ops team has 1 green xp
  And the Junior Software Dev in p0's ops team has 1 red xp
  And the Junior Software Dev in p0's ops team has 0 blue xp
  And p0 has 0 mentoring

Example: the Mentor's second token must differ from the one kept, and comes only after the Junior keeps one (section 20, ruling 25)
  Given the phase is actions
  And p0's development has a Smart Lock
  And the Smart Lock in p0's development has 1 blue cube
  And the Smart Lock in p0's development has 5 red cubes
  And the Smart Lock in p0's development has the Veteran and a Junior Hardware Eng on it
  And the Junior Hardware Eng in p0's development team has 1 pending blue
  And the Junior Hardware Eng in p0's development team has 1 pending red
  And the Junior Hardware Eng in p0's development team has 1 blue skill
  When p0 launches the Smart Lock
  And p0 mentors the Junior Hardware Eng, choosing red
  Then it is rejected because "it is mentorable"
  When p0 keeps red on the Junior Hardware Eng
  And p0 keeps blue on the Junior Hardware Eng
  Then it is rejected because "it is choosing a token"
  When p0 mentors the Junior Hardware Eng
  Then the phase is actions
  And the Junior Hardware Eng in p0's ops team has 1 red xp
  And the Junior Hardware Eng in p0's ops team has 1 blue xp

Example: when the Junior has two Pending tokens left, its owner picks which one the Mentor makes Permanent (section 20, ruling 25)
  Given the phase is actions
  And p0's development has a Cloud Storage
  And the Cloud Storage in p0's development has 4 blue cubes
  And the Cloud Storage in p0's development has 4 red cubes
  And the Cloud Storage in p0's development has the Veteran and a Junior QA Tester on it
  And the Junior QA Tester in p0's development team has 1 pending blue
  And the Junior QA Tester in p0's development team has 1 pending red
  And the Junior QA Tester in p0's development team has 1 pending green
  And the Junior QA Tester in p0's development team has 1 blue skill
  And the Junior QA Tester in p0's development team has 1 red skill
  When p0 launches the Cloud Storage
  And p0 keeps green on the Junior QA Tester
  And p0 keeps red on the Junior QA Tester
  Then it is rejected because "it is choosing a token"
  When p0 mentors the Junior QA Tester
  Then it is rejected because "Choose one: blue or red."
  When p0 mentors the Junior QA Tester, choosing red
  Then the phase is actions
  And the Junior QA Tester in p0's ops team has 1 green xp
  And the Junior QA Tester in p0's ops team has 1 red xp
  And the Junior QA Tester in p0's ops team has 0 blue xp

Example: a Veteran onboarding this turn mentors nothing (section 20, ruling 8)
  Given the phase is actions
  And p0's development has a Dating App and a To-Do List
  And the Dating App in p0's development has 6 blue cubes
  And the Dating App in p0's development has a Junior Software Dev on it
  And the Junior Software Dev in p0's development team has 1 pending blue
  And the Junior Software Dev in p0's development team has 1 pending red
  And the Junior Software Dev in p0's development team has 1 red skill
  And the To-Do List in p0's development has the Veteran on it
  When p0 reassigns the Veteran to the Dating App
  And p0 launches the Dating App
  And p0 keeps blue on the Junior Software Dev
  Then the phase is actions
  And p0 has 0 mentoring
  And the Junior Software Dev in p0's ops team has 0 red xp

Example: a Junior at 3 XP graduates one token to reach 4, so the Mentor helps another Junior instead (section 11, section 20)
  Given the phase is actions
  And p0's development has a Cloud Storage
  And the Cloud Storage in p0's development has 4 blue cubes
  And the Cloud Storage in p0's development has 4 red cubes
  And the Cloud Storage in p0's development has the Veteran, a Junior Software Dev and a Junior Hardware Eng on it
  And the Junior Software Dev in p0's development team has 3 blue xp
  And the Junior Software Dev in p0's development team has 1 pending blue
  And the Junior Software Dev in p0's development team has 1 pending red
  And the Junior Software Dev in p0's development team has 1 red skill
  And the Junior Hardware Eng in p0's development team has 1 pending red
  And the Junior Hardware Eng in p0's development team has 1 pending blue
  And the Junior Hardware Eng in p0's development team has 1 blue skill
  When p0 launches the Cloud Storage
  And p0 keeps blue on the Junior Software Dev
  And p0 keeps red on the Junior Hardware Eng
  And p0 mentors the Junior Software Dev
  Then it is rejected because "it is mentorable"
  When p0 mentors the Junior Hardware Eng
  Then the phase is actions
  And the Junior Software Dev in p0's ops team has 4 blue xp
  And the Junior Software Dev in p0's ops team has 0 red xp
  And the Junior Hardware Eng in p0's ops team has 1 red xp
  And the Junior Hardware Eng in p0's ops team has 1 blue xp

Example: a Junior at 4 Permanent XP graduates nothing at Launch, and its Pending tokens return to the supply (section 11)
  Given the phase is actions
  And p0's development has a Cloud Storage
  And the Cloud Storage in p0's development has 4 blue cubes
  And the Cloud Storage in p0's development has 4 red cubes
  And the Cloud Storage in p0's development has a Junior Software Dev and a Junior QA Tester on it
  And the Junior Software Dev in p0's development team has 4 blue xp
  And the Junior Software Dev in p0's development team has 1 pending blue
  And the Junior Software Dev in p0's development team has 1 pending red
  And the Junior Software Dev in p0's development team has 1 red skill
  And the Junior QA Tester in p0's development team has 4 green xp
  And the Junior QA Tester in p0's development team has 1 pending green
  When p0 launches the Cloud Storage
  Then the phase is actions
  And the Junior Software Dev in p0's ops team has 4 blue xp
  And the Junior Software Dev in p0's ops team has 0 red xp
  And the Junior Software Dev in p0's ops team has 0 pending red
  And the Junior QA Tester in p0's ops team has 4 green xp
  And the Junior QA Tester in p0's ops team has 0 pending green

Example: a Junior PM on a Tier 2 team carries a pending Badge, made Permanent when the team Launches, and once badged it has none pending (section 11)
  Given the phase is actions
  And p0's development has a Neobank and a Server Farm
  And the Neobank in p0's development has 10 blue cubes
  And the Neobank in p0's development has the Architect, a Junior PM and a Junior Software Dev on it
  Then the Junior PM in p0's development team is up for promotion
  And the Junior Software Dev in p0's development team is not up for promotion
  When p0 launches the Neobank
  Then the Junior PM in p0's ops team is badged
  And the Junior Software Dev in p0's ops team is not badged
  When p0 reassigns the Junior PM to the Server Farm
  Then the Junior PM in p0's development team is not up for promotion

Example: a Junior PM Reassigned from a Tier 2 to a Tier 1 project loses its pending Badge, so that Launch promotes nobody (section 11, the slice's R8)
  Given the phase is actions
  And p0's development has a Neobank and a Dating App
  And the Dating App in p0's development has 6 blue cubes
  And the Neobank in p0's development has a Junior PM on it
  Then the Junior PM in p0's development team is up for promotion
  When p0 reassigns the Junior PM to the Dating App
  Then the Junior PM in p0's development team is not up for promotion
  When p0 launches the Dating App
  Then the Junior PM in p0's ops team is not badged

Example: a Pivot loses a Junior PM's pending Badge (section 11)
  Given the phase is actions
  And p0's development has a Neobank
  And the Neobank in p0's development has a Junior PM on it
  When p0 pivots the Neobank
  Then the Junior PM in p0's bench is not up for promotion

Example: a QA Engineer on a Launching team gains no XP, since Specialists learn only from Training cards (ruling 14)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has 6 blue cubes
  And the Dating App in p0's development has a QA Engineer and a Junior Software Dev on it
  And the Junior Software Dev in p0's development team has 1 pending blue
  When p0 launches the Dating App
  Then the QA Engineer in p0's ops team has 0 training xp
  And the Junior Software Dev in p0's ops team has 1 blue xp
```

  **How the numbers come** (§6 Launch, §11.A–B, §11.E, §20.B, §20.C):
  - **Tracks:** Dating App 6 Blue, Smart Lock 1/5, Cloud Storage 4/4, all Tier 1; the Neobank 10 Blue, Tier 2 Software, led by the Architect; the Server Farm Tier 2.
  - **Graduation:** exactly one token each (§11.B.2); the Mentor a second, different one (§20.B, ruling 25); none at 4 Permanent XP (§11.B.2, the cap of §11.A.2); 3 + 1 = 4 leaves nothing for the Mentor.
  - **Actions:** a Launch is 1 AP (ruling 7): 3 − 1 = 2; the step's presses cost nothing.
  - **Lines each example pins:** 1 `Due to graduate` and its rule's six lines (without a loss line the Junior would stay mentorable), the finishing rule's `mentoring` reset; 2 the Blue and Green keeps' token tests, the mentor's `they have 1 mentoring`, Coaching's Mentor line and the finishing rule's Blue loss; 3 Launch's `mentoring` line, the Blue keep's three effects, the Red keep's token test, the Green keep's `choosing a token`, the Mentor's Green option and its reset; 4 Mentorable's `graduated`, the Red keep's three effects, the Blue keep's `choosing a token`, the Mentor's Blue option and `Due to graduate`'s `not graduated`; 5 the Green keep's three effects, the Red keep's `choosing a token`, the Mentor's Red option and `Choosing a token`'s `not graduated`; 6 Coaching's onboarding line; 7 Mentorable's `not maxed out` and Maxed out; 8 the two `not maxed out` lines and the finishing rule's Red and Green losses; 9 Up for promotion's Synergy and Badge lines and Launch's badge line; 10 its Tier 1 line. 11 and 12 are guards (§11.E.2, ruling 14).
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe. The long runs pass: every Launch now enters and leaves `graduation`.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Launch graduates each Junior's Pending XP, by its owner's choice when it has several, lets the Veteran add a second token, and promotes the Junior PMs of a Tier 2 or 3 team

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: The QA Engineer and the Sales Rep

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: Task 1's QA output, plan 4-2's `Rev:`, `Rev bonus:`, `Attaching:` and its ops-team routes, plan 5-1's `its owner has no card in their {perzone} {cardclause}`.
- Produces (rules): worked `practised`, `waiving decay`, `stopping decay`, `decaying`, `bug decay`; the Rainmaker in `Attaching:` and `Rev bonus:`.

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₄ + 39; the designer page's count too. The values test adds `bug decay` (number) and `practised`, `waiving decay`, `stopping decay`, `decaying` (flags). 3-2's `shownFlags(game)` gains `'practised'` right after `'experienced'`.
  - **`'asks an example which hire it means when both rows hold the card…'`:** a Sales Rep now sits on a product, so the hire to the ops team refuses it. The test uses a QA Engineer in its place throughout: its title says "a QA Engineer in both rows", the agency row is `the Hacker, the Architect, the Veteran and a QA Engineer`, the open job market `a QA Engineer`, and the pressed and expected lines name `a QA Engineer`. Nothing else in it changes.
  - **The auto-player.** Re-read `hireGrowthHacker()` and 4-2's place-2, action-4 and sourcing routes: each must read `runtime.workedFlag(…, 'attaching')`, never the Growth Hacker's name or trait. Change any that does not, so that Sales Reps go on products too. `qaForBugs()` reads `qa output` through the runtime, so it now sends QA Engineers.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **QA output.** Right after `  A card's qa output goes up by its green xp.` add:

```text
  A Bug Hunter card's qa output is 1.
  A practised card's qa output is 2.
```

  - **Rev.** `  A card's rev goes down by its bugs.` becomes `  A card's rev goes down by its bug decay.`
  - **Rev bonus.** The section becomes:

```text
Rev bonus:
  A Viral Loop card's rev bonus is 3.
  A Rainmaker card's rev bonus is 2.
  A card's rev bonus goes up by its training xp.
  An onboarding card's rev bonus is 0.
```

  - **Attaching** (R9, ruling 19). The section becomes:

```text
Attaching:
  Only if one of:
    It is a Viral Loop card.
    It is a Rainmaker card.
```

  - **The Specialists' flags.** Right after the `Rev bonus:` section add:

```text
Practised:
  Only if it is a Bug Hunter card.
  Only if its training xp is more than 0.

Waiving decay:
  Only if it is badged.
  Only if it is not onboarding.

Stopping decay:
  Only if it is a Bug Hunter card.
  Only if its training xp is more than 1.
  Only if it is not onboarding.

Decaying:
  Only if no card on it is waiving decay.
  Only if its owner has no card in their ops team that is stopping decay.

Bug decay:
  A decaying card's bug decay is its bugs.
```

  - **Append these 7 examples.**

```text
Example: a QA Engineer cleans 1 Bug a turn and 2 once it has 1 XP, and at 1 XP stops no Bug Decay (section 11, section 20)
  Given p1's development has a Dating App
  And the Dating App in p1's development has 3 bugs
  And the Dating App in p1's development has a QA Engineer on it
  And p1's operations has a Mobile Wallet
  And the Mobile Wallet in p1's operations has 3 bugs
  And p1's ops team has a QA Engineer and a Junior Software Dev
  And the QA Engineer in p1's ops team has 1 training xp
  And the turn passes to the left
  Then the phase is income
  And p1 has 7 capital
  And p1 has 0 market share
  When p1 pays salaries
  And p1 ends their actions
  Then the Dating App in p1's development has 2 bugs
  And the Mobile Wallet in p1's operations has 1 bug

Example: a QA Engineer with 2 XP working in the ops team stops Bug Decay on all its owner's Active products (section 11, ruling 19)
  Given p1's operations has a Dating App and a Mobile Wallet
  And the Dating App in p1's operations has 2 bugs
  And the Mobile Wallet in p1's operations has 1 bug
  And p1's ops team has a QA Engineer, a Junior Software Dev and a Junior Software Dev
  And the QA Engineer in p1's ops team has 2 training xp
  And the turn passes to the left
  Then the phase is income
  And p1 has 10 capital
  And p1 has 2 market share

Example: a Sales Rep with 2 XP adds $4 to its product's revenue, and neither stops Bug Decay nor cleans Bugs (section 11, section 20)
  Given p1's operations has a Dating App and a Mobile Wallet
  And the Mobile Wallet in p1's operations has 1 bug
  And p1's ops team has a Junior Software Dev and a Junior Software Dev
  And the Mobile Wallet in p1's operations has a Sales Rep on it
  And the Sales Rep in p1's ops team has 2 training xp
  And the turn passes to the left
  Then the phase is actions
  And p1 has 13 capital
  And p1 has 2 market share
  When p1 ends their actions
  Then the Mobile Wallet in p1's operations has 1 bug

Example: a badged Sales Rep, the VP of Sales, adds $2 and waives its product's Bug Decay (section 11)
  Given p1's operations has a Payment Gateway
  And the Payment Gateway in p1's operations has 2 bugs
  And p1's ops team has a Junior Software Dev
  And the Payment Gateway in p1's operations has a Sales Rep on it
  And the Sales Rep in p1's ops team is badged
  And the turn passes to the left
  Then the phase is actions
  And p1 has 12 capital

Example: a Sales Rep assigned to the ops team goes on the product its owner picks, never into the pool (section 3, ruling 19)
  Given the phase is actions
  And p0's operations has a Dating App and a To-Do List
  And p0's bench has a Sales Rep and a Junior Software Dev
  When p0 assigns the Sales Rep and the Junior Software Dev to p0's ops team
  Then it is rejected because "no picked card is attaching"
  When p0 assigns the Sales Rep and the Junior Software Dev to the To-Do List
  Then it is accepted
  And the To-Do List in p0's operations has a Sales Rep on it
  And p0's ops team has a Sales Rep and a Junior Software Dev

Example: a Sales Rep Reassigned to another product is onboarding: it adds nothing that turn, and even badged it waives no Bug Decay (section 6, section 11, ruling 8)
  Given the phase is actions
  And p0's operations has a Dating App and a To-Do List
  And the To-Do List in p0's operations has 1 bug
  And the Dating App in p0's operations has a Sales Rep on it
  And the Sales Rep in p0's ops team is badged
  Then the Dating App in p0's operations has 3 rev
  When p0 reassigns the Sales Rep to the To-Do List
  Then the To-Do List in p0's operations has 0 rev
  And the Dating App in p0's operations has 1 rev

Example: a QA Engineer with 2 XP stops no Bug Decay while it is onboarding after a Pivot (section 11, ruling 8)
  Given the phase is actions
  And p0's operations has a Dating App
  And the Dating App in p0's operations has 1 bug
  And p0's development has a To-Do List
  And the To-Do List in p0's development has a QA Engineer on it
  And the QA Engineer in p0's development team has 2 training xp
  When p0 pivots the To-Do List
  And p0 assigns the QA Engineer to p0's ops team
  Then the QA Engineer in p0's ops team is onboarding
  And the Dating App in p0's operations has 0 rev
```

  **How the numbers come** (§5 Phase B, §11.D, §20.B, §20.C):
  - **QA Engineer:** 1 Bug, 2 from 1 XP, and at 2 XP no Revenue Decay on the owner's Active products while it works in the Ops Zone (§11.D.1). Salary $1 each: 7 − 2 = 5.
  - **Ops QA** (plan 4-2): QA 2 against 3 Bugs on one product cleans 2 by itself.
  - **Sales Rep:** +$2, +$3 at 1 XP, +$4 at 2 XP; badged it waives Bug Decay on its product (§11.D.2); salary $0.
  - **Revenue:** Dating App 1, Mobile Wallet 2, Payment Gateway 3, To-Do List 1, $1 less per Bug, at least $0 (§5 Phase B). So 7 + 0 = 7; 7 + 1 + 2 = 10; 7 + 1 + (2 + 4 − 1) = 13; 7 + (3 + 2) = 12; Dating App 1 + 2 = 3, then 1; To-Do List 1 + 0 − 1 = 0 while the Sales Rep onboards (an onboarding card's effects are cancelled, §6 Reassign).
  - **Bandwidth:** each Junior Software Dev gives Blue 1 against maintenance 1 per product.
  - **Lines each example pins:** 1 the Bug Hunter line, Practised's training-XP line and Stopping decay's `more than 1`; 2 Decaying's owner line, Bug decay and the Rev line; 3 the Rainmaker's $2 and the training-XP bonus, Stopping decay's and Practised's Bug Hunter lines (a 2-XP Sales Rep would stop decay and clean); 4 Waiving decay's Badge line and Decaying's first line; 5 Attaching's Rainmaker line; 6 the onboarding rev bonus (else the To-Do List has 2) and Waiving decay's onboarding line (else 1), which no Income can show, since turn starts clear the token; 7 Stopping decay's onboarding line.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's QA Engineer cleans Bugs and at 2 XP stops Bug Decay, and the Sales Rep sits on its product for $2 to $4, waiving its Bug Decay once badged

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 6: Synergy, Agile and badged Juniors as leads

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: plan 5-1's `a card's {attribute} is the number of {cardgroup}`, `a card's {attribute} goes up by its {attribute} times its {attribute}`, `some card on the target card is {cardflag}`, `every picked card is not {cardflag}`.
- Produces (rules): worked `pm count`, `blue workers`, `red workers`, `qa workers`, `managing`, `agile`; Agile lines in the assign and the two reassigns to a project; the badged-Junior leads.
- Produces (test file): `pmToProject(): Move | null` in `playTurn`.

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₄ + 48; the designer page's count too. The values test adds `pm count`, `blue workers`, `red workers`, `qa workers` (numbers) and `managing`, `agile` (flags).
  - **Invariants (Review Focus 4):**
    - after a `REASSIGN_FROM_PROJECT` or `REASSIGN_FROM_OPS` press, the moved card is onboarding exactly when no card on the target in `before` was `agile` (`runtime.workedFlag(before, id, 'agile')`);
    - after an `ASSIGN_TO_PROJECT` press, each picked card that was onboarding in `before` is not onboarding in `after` exactly when some card on the target in `before` was `agile`.
  - **The auto-player: `pmToProject()`**, in the planned list right after `moveGrowthHacker()`. When `t % 3 === 1` and some project in its development has a card on it, the target is the project with the most cards on it (the first of those). The move is the bench's first card whose trait is `Synergy` or `Agile Synergy`, assigned to it (`ASSIGN_TO_PROJECT`); else the agency row's first such card the seat can pay for, hired onto it (`HIRE_AGENCY_TO_PROJECT`); else null.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Synergy** (§11.E.1, R8). In `Blue team output:`, `Red team output:` and `QA team output:`, right after each section's first line add, in turn:

```text
  A card's blue team output goes up by its pm count times its blue workers.
```

```text
  A card's red team output goes up by its pm count times its red workers.
```

```text
  A card's qa team output goes up by its pm count times its qa workers.
```

  - **The counts.** Right after the `QA team output:` section add:

```text
PM count:
  A card's pm count is the number of the cards on it that are managing.

Blue workers:
  A card's blue workers is the number of the cards on it whose blue output is more than 0.

Red workers:
  A card's red workers is the number of the cards on it whose red output is more than 0.

QA workers:
  A card's qa workers is the number of the cards on it whose qa output is more than 0.
```

  - **Leads** (§11.C, §7.B, ruling 25). `Leading software:` and `Leading hardware:` become:

```text
Leading software:
  Only if one of:
    It is a Senior Developer card.
    It is badged.
  Only if one of:
    It is a software card.
    It is a flex card.
    Its blue skill is more than 0.
  Only if it is not onboarding.

Leading hardware:
  Only if one of:
    It is a Senior Developer card.
    It is badged.
  Only if one of:
    It is a hardware card.
    It is a flex card.
    Its red skill is more than 0.
  Only if it is not onboarding.
```

  - **Managing and Agile** (§11.E.3, R8). Right after `Leading hardware:` add:

```text
Managing:
  Only if one of:
    It is a Synergy card.
    It is an Agile Synergy card.
  Only if it is not onboarding.

Agile:
  Only if it is managing.
  Only if one of:
    It is an Agile Synergy card.
    It is badged.
```

  - **Assign** (§6, ruling 8). In `A player may assign some cards from their bench to a card in their development.`, before `      The picked cards go to their development team, on the target card.` add `      If some card on the target card is agile, every picked card is not onboarding.`
  - **Reassign.** In `A player may reassign a card from their development team to a card in their development.` and in `A player may reassign a card from their ops team to a card in their development.`, the lines under `Then:` become (Agile is read before the card arrives, so a PM moving itself is onboarding):

```text
      It is onboarding.
      If some card on the target card is agile, it is not onboarding.
      It goes to their development team, on the target card.
```

  - **Append these 9 examples.**

```text
Example: a Junior PM adds 1 output for each working teammate, in that teammate's own colour (section 11, section 20)
  Given the phase is actions
  And p0's development has a Cloud Storage
  And the Cloud Storage in p0's development has a Junior PM, a Junior Software Dev and a Junior Hardware Eng on it
  When p0 ends their actions
  Then the Cloud Storage in p0's development has 2 blue cubes
  And the Cloud Storage in p0's development has 2 red cubes

Example: two PMs on one team each add their Synergy, and a QA teammate cleans 1 more Bug for each (section 11)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has 3 bugs
  And the Dating App in p0's development has a Junior PM, the Senior PM, a Junior Software Dev and a Junior QA Tester on it
  When p0 ends their actions
  Then the Dating App in p0's development has 3 blue cubes
  And the Dating App in p0's development has 0 bugs

Example: a PM Reassigned this turn is onboarding: it gives no Synergy, and staff moved to its team are onboarding too (section 11, ruling 8)
  Given the phase is actions
  And p0's development has a Dating App and a To-Do List
  And the Dating App in p0's development has the Senior PM and a Junior Hardware Eng on it
  And the To-Do List in p0's development has a Junior Software Dev on it
  When p0 reassigns the Senior PM to the To-Do List
  And p0 reassigns the Junior Hardware Eng to the To-Do List
  Then the Senior PM in p0's development team is onboarding
  And the Junior Hardware Eng in p0's development team is onboarding
  When p0 ends their actions
  Then the To-Do List in p0's development has 1 blue cube

Example: staff Reassigned to a team with a working Senior PM, from a project or from the ops team, get no Onboarding token and work at once (section 6, section 11, ruling 8)
  Given the phase is actions
  And p0's development has a Dating App and a To-Do List
  And the Dating App in p0's development has the Senior PM on it
  And the To-Do List in p0's development has a Junior Software Dev on it
  And p0's operations has a Smart Lock
  And p0's ops team has a Junior Hardware Eng
  When p0 reassigns the Junior Software Dev to the Dating App
  And p0 reassigns the Junior Hardware Eng to the Dating App
  Then the Junior Software Dev in p0's development team is not onboarding
  And the Junior Hardware Eng in p0's development team is not onboarding
  When p0 ends their actions
  Then the Dating App in p0's development has 2 blue cubes

Example: pivoted staff Assigned to a team with a working Senior PM clear their Onboarding token (section 6, ruling 8)
  Given the phase is actions
  And p0's development has a Dating App and a To-Do List
  And the Dating App in p0's development has the Senior PM on it
  And the To-Do List in p0's development has a Junior Software Dev on it
  When p0 pivots the To-Do List
  Then the Junior Software Dev in p0's bench is onboarding
  When p0 assigns the Junior Software Dev to the Dating App
  Then the Junior Software Dev in p0's development team is not onboarding

Example: a Senior PM Assigned together with pivoted staff does not clear their tokens yet (section 6, the Rust engine's reading)
  Given the phase is actions
  And p0's development has a Dating App and a To-Do List
  And the To-Do List in p0's development has a Junior Software Dev on it
  And p0's bench has the Senior PM
  When p0 pivots the To-Do List
  And p0 assigns the Senior PM and the Junior Software Dev to the Dating App
  Then the Junior Software Dev in p0's development team is onboarding
  And the Senior PM in p0's development team is not onboarding

Example: a Junior PM with a Badge is Agile (section 11, section 20)
  Given the phase is actions
  And p0's development has a Dating App and a To-Do List
  And the Dating App in p0's development has a Junior PM on it
  And the Junior PM in p0's development team is badged
  And the To-Do List in p0's development has a Junior Software Dev on it
  When p0 reassigns the Junior Software Dev to the Dating App
  Then the Junior Software Dev in p0's development team is not onboarding

Example: a badged Junior Software Dev leads a Tier 2 Software project, but a badged Junior QA Tester leads nothing (section 11, section 7, ruling 25)
  Given the phase is actions
  And p0's development has a Neobank and a Server Farm
  And the Neobank in p0's development has a Junior Software Dev on it
  And the Junior Software Dev in p0's development team is badged
  And the Server Farm in p0's development has a Junior QA Tester and a Junior Hardware Eng on it
  And the Junior QA Tester in p0's development team is badged
  When p0 ends their actions
  Then the Neobank in p0's development is not stalled
  And the Neobank in p0's development has 1 blue cube
  And the Server Farm in p0's development is stalled
  And the Server Farm in p0's development has 0 red cubes

Example: a badged Junior with Blue and Red Skill tokens leads both colours, so it Launches a hybrid alone (section 7, section 11)
  Given the phase is actions
  And p0's development has a Drone Delivery
  And the Drone Delivery in p0's development has 6 blue cubes
  And the Drone Delivery in p0's development has 6 red cubes
  And the Drone Delivery in p0's development has a Junior QA Tester on it
  And the Junior QA Tester in p0's development team has 1 blue skill
  And the Junior QA Tester in p0's development team has 1 red skill
  And the Junior QA Tester in p0's development team is badged
  When p0 launches the Drone Delivery
  Then it is accepted
  And p0's operations has a Drone Delivery
```

  **How the numbers come** (§3, §6, §7.B, §11.C, §11.E, §20.B, §20.C):
  - **Synergy:** +1 for each working teammate, in its colour, +1 Bug for a QA teammate, each PM adding its own (§11.E.1). Cloud Storage: 1 + 1 Blue, 1 + 1 Red. Dating App: 1 + 2 Blue; Bugs 1 + 2 = 3.
  - **Onboarding:** an onboarding card gives nothing, Synergy included (§6, ruling 8); To-Do List 1 Blue.
  - **Agile:** a Senior PM, or a PM holding a Badge, spares staff moved to its team (§11.E.3); 1 + 1 = 2 Blue on the Dating App.
  - **Leads:** a badged Junior leads in the colours of its skills; a QA-only one leads nothing (§11.C, §7.B, ruling 25). Neobank Tier 2 Software, Server Farm Tier 2 Hardware, Drone Delivery Tier 2 hybrid 6/6 (§20.C.2).
  - **Lines each example pins:** 1 the Blue and Red Synergy lines, PM count, Blue and Red workers, Managing's Synergy line; 2 the QA Synergy line, QA workers, Managing's Agile Synergy line; 3 Managing's onboarding line and Agile's `managing`; 4 both reassigns' Agile lines and Agile's Agile Synergy line; 5 the assign's Agile line; 6 the assign's order; 7 Agile's Badge line; 8 Leading software's Badge line; 9 the two Skill lines and Leading hardware's Badge line.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's PMs add Synergy to their team's output, Agile PMs spare staff moved to their team the Onboarding token, and badged Juniors lead in their skills' colours

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 7: Long runs: every talent path tallied, whole games replayed; the README and the checks

**Files:**
- Modify: `src/games/startup-simulator.test.ts`, `README.md`

**Interfaces:**
- Consumes: every constant and policy above, `runtime.workedValue`, `workedFlag`, `playerFact`, `atTheEngine`, `ranTheEngine`, `enteredIncome`.
- **`happenings` gains these keys** (read through the runtime):
  - `a Pending token gained: blue` (and `: red`, `: green`), for each card whose `pending <colour>` rose in the move;
  - `a Junior graduated with no press`, for each card whose `blue xp`, `red xp` or `green xp` rose in a `LAUNCH` press;
  - `a token kept by choice` for each `KEEP_PENDING` press, and `the Mentor's second token` for each `MENTOR` press;
  - `Pending tokens returned by a pivot`, for each card on the pivoted project in `before` holding a `PENDING` count;
  - `tokens stripped from fired staff`, for each card that held a `TOKENS` count or `badged` in `before` and moved to the open job market in a dismiss or let-go press;
  - `an experienced Junior paid`, in a `PAY_SALARIES` press, for each card of the mover's Board that was `experienced` in `before`;
  - `Synergy at the Engine`, in a move that ran the Engine for the mover, for each of its projects that is not `stalled` in `atTheEngine(before, move, after)`, with `pm count` above 0 and some `… workers` above 0 there;
  - `an onboarding token spared by an Agile PM`, for a reassign to a project whose moved card is not onboarding after, and for each picked card of an `ASSIGN_TO_PROJECT` that was onboarding before and is not after;
  - `a Junior PM promoted at a Launch`, for each card that became `badged` in a `LAUNCH` press;
  - `a Sales Rep's bonus earned`, for the seat that reached its Income in the move (`enteredIncome`), for each of its online products with a card on it whose trait is `Rainmaker` and that is not onboarding;
  - `a Bug cleaned by a QA Engineer`, in a move that ran the Engine, for each project of the mover with a `Bug Hunter` card on it whose `bugs` fell.

- [ ] **Step 1: Write the tests.**
  - **`'made every move in those runs …'`** is unchanged: the keep and mentor buttons need Strategy cards (plan 5-2b requires them).
  - **Append `it('played slice 5’s talent in those runs: Pending tokens gained and graduated, returned by pivots and stripped from fired staff, Synergy and the Agile spare, the Sales Rep’s bonus and experienced Juniors paid')`.** It expects above 0: the three `a Pending token gained` keys, `a Junior graduated with no press`, `Pending tokens returned by a pivot`, `tokens stripped from fired staff`, `an experienced Junior paid`, `Synergy at the Engine`, `an onboarding token spared by an Agile PM` and `a Sales Rep's bonus earned`.

    `a token kept by choice`, `the Mentor's second token`, `a Junior PM promoted at a Launch` and `a Bug cleaned by a QA Engineer` are counted but not required here: the first two need Skill tokens, which only Training gives (plan 5-2b requires them); the last two need a Junior PM on a Tier 2 or 3 Launch or a QA Engineer on a bugged project, which Task 4's and Task 5's examples and Task 4's arranged test pin.
  - **Append `it('takes back the last move and rebuilds whole games from their logs, through Pending tokens, graduation and the Agile spare (Review Focus: 2 players, seeds 1 to 5)')`.** Play each 2-player game at seeds 1 to 5 to its result, keeping the state before each move. A fresh engine given `loadLog(log)` equals the final state; `engine.undo()` gives the state before the last move. Across the five logs, some log holds a Pending token's rise and a `LAUNCH` that raised some card's XP (count them through the watch).
  - **Kept as they are:** `'plays the same game through the page’s view as without it'` and the slice-3 and slice-4 tallies.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`.
  - If a required key stays at 0, print the tally and change the auto-player (for `an experienced Junior paid`: have action 5 prefer an ops-team Junior holding XP; for the Agile spare or Synergy: `pmToProject`'s cadence), never the rules.
  - Report a key that stays unreachable.
- [ ] **Step 3: Write the README.** In the Startup paragraph, after the slice-4 sentence, add: Juniors now carry XP and Skill tokens that raise their output and salary and work in a declared mode, earn Pending XP on projects and keep one token at each Launch (the Veteran adds a second), PMs give Synergy and Agile and earn their Badge on a Tier 2 or 3 Launch, badged Juniors lead, the QA Engineer and the Sales Rep do their jobs, fired staff lose their tokens and Human Capital scores. Its rulings list adds 1 and 14. "It still leaves out" drops XP and the Specialists' effects and the Veteran's trait, and gains: the Strategy deck, Brainstorm and Training, and the Milestones (plan 5-2b).
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

  Also read every number in the new examples against each task's "How the numbers come", and run the removal probe once more over every line this plan added or changed.
- [ ] **Step 6: Run the games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
- [ ] **Step 7: Commit**

```bash
git add src/games/startup-simulator.test.ts README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's long runs gain and graduate Pending XP, return and strip tokens, and play Synergy, Agile and the Sales Rep at 2 to 5 players, every path tallied and whole games rebuilt from their logs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Forward notes

- **Plan 5-2b** requires the keys counted here (`a token kept by choice`, `the Mentor's second token`) once Training gives Juniors Skill tokens, and adds the Training-dependent talent tallies (a Junior working in a trained colour, a badged Junior leading, the QA Engineer's and the Sales Rep's XP, the VP of Sales).
- **Plan 5-3 (the page).**
  - `shownFlags` gains `experienced` and `practised`, both read only through the card. `up for promotion` reads `the card it is on` and `decaying` its owner's ops team, so neither is shown (plan 5-1 keeps both out of the card-only set); 5-3 decides how to show the pending Badge.
  - No new stand-in: the XP, Skills and Human Capital sections start from a kind of card, not from `A card's X is its Y.`
  - Faces need XP by colour, Skill tokens, Pending tokens marked as pending, Badges, and the graduation buttons in the strip.
- **Slice 6** adds Online Course Boom, Workaholic on PMs and Sales Reps, Burnout on a PM (one more `Managing` line), Toxic Personality on a Synergy team (one more team-output line), Regulation Audit on 2-XP Juniors (it reads `experienced`), Crunch Time's cube (no Pending token: it is no team output) and TechCrunch at $2 with a Sales Rep on the product (R12).
- **Slice 8** sets `fired` on a Market Sale's or a poach's departures only where §18.B says they are fired, keeps a poached Junior's Pending tokens, and reads `up for promotion` for a poached Junior PM (§16.D.3).

## Gaps against plan 5-1

None that needs engine work: every line above is written with plan 4-1's and 5-1's phrases. These calls follow from what the language reads, and are listed so a later plan can revisit them:
- "Under 4 XP" is the flag `maxed out` (`its xp is more than 3`), since card numbers have no "less than".
- R4's Diva line is left out (a Senior holds no token).
- Agile has no "in a development team" line, and `waiving decay` no Rainmaker line, since no line could fail without them.
