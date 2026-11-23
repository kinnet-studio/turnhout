# Pre-flight: plan 6-2b (Rules text and long runs: Events)

- **HEAD scanned:** `1b6a4c4` on `claude/peaceful-curie-rdfkow`. The repo was not touched.
- **Inputs:**
  - the plan `docs/superpowers/plans/2026-10-16-startup-slice-6-2b-rules-and-runs-events.md`;
  - the slice 6 spec (its R1–R3 win over its body) and the overview spec;
  - `/home/user/suwa/rulebook.md` v6.0 (§20.D l.1396–1418), and suwa's Rust where the rulebook is silent;
  - `docs/superpowers/notes/2026-10-19-startup-notes-for-6-preflight.md`, the handoff and the 6-2a ledger;
  - the 6-2a pre-flight report, whose shape this report follows;
  - for the coordinator's addition, plan 6-3's Task 1 (l.126–215) and its Assumed list (l.111–125).
- **Probe:** a copy at `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf62b/work`, branch `chain2`, base `1b6a4c4` (= HEAD).
  - One commit per task as written, then each amendment as its own commit. 6-3 Task 1 sits between T1 and T2, as the plan's sequencing ruling (l.43) puts it. There is no A2: that probe was reverted.
  - The commits, in order:
    - `f9981cb` T1 · `2886ed0` A1 · `ddf22de` A3 · `aee551f` S1 (6-3 Task 1 as planned) · `71ac85e` AS1;
    - `8f69782` T2 · `2fc96ae` A4 · `8820621` A8 · `afb7311` A5;
    - `bcd6e33` T3 · `1926f03` A6 · `3704c87` A7;
    - `e1f2087` T4 · `07aacba` A9;
    - `0ee804d` T5 · `d4c5594` A10 · `ad9c27f` A11 · `00a8be1` A12 · `71c546d` A13;
    - `d8aee6f` T6 · `44e8843` A14 · `cc07c0c` A15 · `3e4d934` A16 · `30a3be8` A17 · `0e8c470` A18 (final).
  - Logs and scripts are in `.../pf62b/logs` and `.../pf62b/scripts`:
    - removal probe: `zz-removal.test.ts`, with per-task results in `logs/rm-t*.out` and `logs/rm-final.out`;
    - line-order probe: `zz-order.test.ts`, results in `logs/order-final.out`;
    - survivors against the whole Startup file: `rm-tests.sh`, results in `logs/rm-tests-final.out`;
    - tally probe: `probe6b.py`, results in `logs/tally-base-t6.txt`;
    - timing: `timing.sh`, results in `logs/timing.txt`.
- **Result with the amendments:**
  - Every task's focused run passes.
  - Full suite (`bun run test`):

    | Point | Passing tests |
    |---|---|
    | BASE | 3802 |
    | S1 + AS1 and T2 | 3810 |
    | T4 | 3811 |
    | T6 at A16 | 3813 |
    | final `0e8c470` | 3814 |

    The final count is BASE plus 12 new tests: S1's 7, and T1, T4, T5, T6 and A18 one each. The 4-player replay test the plan adds is removed by R16.
  - `tsc --noEmit` is clean at S1, T2, T4, T6 and the final commit.
  - Examples go from 278 (N₇) to 282, 290, 296, 299, 302 and 305 (N₇ + 27).
  - The other games pass alone: 8 files, 100 tests, and Rent Day keeps its 108 examples.
  - 6-2b changes no shared code. The only engine diff from BASE is 6-3 Task 1's own four files.
  - So there is **no blocker**: 20 fix-in-plan findings, 1 ruling-needed (R4), and 4 fix-in-plan findings against plan 6-3 (S1–S4).
- **Speed:** the Startup file's `tests` figure, three alternating runs each, on 4 cores:

  | | Run 1 | Run 2 | Run 3 | Load (1-min) |
  |---|---|---|---|---|
  | BASE | 20.21 s | 19.01 s | 20.23 s | 1.31–1.84 |
  | final | 26.46 s | 27.27 s | 26.98 s | 1.51–1.99 |

  - That is +33.5% median to median, and +39% best to best. It sits 2.7–3.5 s under the 30 s ceiling, and just past the plan's one-third report line (l.64).
  - BASE ran below the expected ~21.9 s today.
  - Cause: Event flags now feed `blue output`, `red output`, `blue bandwidth`, `red bandwidth`, `learning blue` and `learning red`. Those six leave the per-card cache. Six tests are also new.
  - R16's removal of the 4-player replay saved about 2.5 s. With that test kept, the file would sit at about 29.5 s.

## Findings

**R1 (fix-in-plan) — The Assumed list and Task 2's anchors name Workaholic lines that don't exist.**
Evidence:
- HEAD's rules read `  An overworked in blue card's blue output goes up by 2.` (l.184) and `  An overworked in red card's red output goes up by 2.` (l.194).
- `An overworked card's` appears only in the salary line (l.574).
- The plan's l.70 says to stop on a missing anchor.

Amendments:
- l.94: `` `  An overworked card's blue output goes up by 2.` `` → `` `  An overworked in blue card's blue output goes up by 2.` ``, and `` `  An overworked card's red output goes up by 2.` `` → `` `  An overworked in red card's red output goes up by 2.` ``.
- l.285: the anchor becomes `  An overworked in blue card's blue output goes up by 2.`
- l.286: the anchor becomes `  An overworked in red card's red output goes up by 2.`

**R2 (fix-in-plan) — Task 1's Event-in-play invariant fails every game arranged without Setup.**
Evidence:
- At `f9981cb`, 14 tests fail. Nine of them are arranged tests failing on `the Events in play …`, among them:
  - 'reassigns the Growth Hacker …';
  - 'plays a TechCrunch Feature the auto-player holds …';
  - 'claims First Mover Advantage …';
  - 'tries the Diva's reassign …'.
- An arranged game has `ROUND_KEY` 1 but none in play until its next Round Start.
- At `2886ed0` (A1) only the five seed-shift failures remain (R3, R4).

Amendment, l.137: "the event in play holds exactly one card once one has been revealed: in `after`, whenever it held one in `before` or a round started in the move. A game arranged without Setup has `ROUND_KEY` 1 and no Event in play until its next Round Start." The code is `if (eventBefore !== null || rounds > 0) sameAs(zoneCards(after, 'event-in-play').length, 1, …)`.

**R3 (fix-in-plan) — Task 1's shuffle moves a position pin that Step 1 doesn't name.**
Evidence:
- 'takes back every move with undo, and rebuilds the game from its log, through recruits and rese…' pins the first recruit at move 55. Once Setup shuffles the Events, it comes at move 52.
- l.58 allows re-reading position pins, but l.63 says to stop on any other failing test.

Amendment, a new bullet after l.133: "The undo test's first recruit now comes at move 52 (it was 55): `expect(log).toHaveLength(52)` and `expect(states).toHaveLength(52)`, with its comment naming plan 6-2b's Event shuffle."

**R4 (ruling-needed) — The Event deck replays every seeded game, and 14 required paths fall below 2 of the 20 games.**
Evidence:
- At T1 + A1, four tally and replay tests fail. Eight required paths are at 0:
  - 'Attributes kept through a bench discard';
  - 'TechCrunch Features' (3-player replay);
  - 'Toxic: a Red cube taken';
  - 'a Buff on a bench card';
  - 'an Attribute played: Clean Coder';
  - 'an Attribute played: Workaholic';
  - 'hire a card from the agency row to their bench';
  - 'the Engineer paid 1 in the ops team'.
- At T6 as written (`d8aee6f`), the Events tally fails on three keys never seen:
  - 'Legacy Code at an Income';
  - 'Crunch Time: a Bug stopped by Clean Code';
  - 'Trade Show: a TechCrunch Feature for $2'.
- Final tally (`logs/tally-base-t6.txt`), 14 paths below 2 games:
  - **at none (8):** Attributes kept through a bench discard; Toxic: a Red cube taken; hire agency→bench; Engineer paid $1 in ops; TechCrunch Features (3p); Legacy Code at an Income; Crunch Time: a Bug stopped by Clean Code; Trade Show: a TechCrunch Feature for $2;
  - **at one (6):** TechCrunch for $5; a trained Junior declared red; Workaholic played; reassign ops team → operations; Intern Season: a free recruit; Patent Trolls: a $5 License.
- 'a Buff on a bench card' and Clean Coder played came back to 2 or more games by T6.
- l.64 and l.902 say to retune the auto-player. The probe did not: a cadence change shifts every seed-pinned test (6-2a's R2).
- Instead the probe followed 6-2a's precedent (notes l.39: require only keys held by 2 or more games; count the rest, each pinned). A3 adds an interim exemption set at T1. A15 makes it final as `HELD_BY_FEWER_THAN_TWO`, whose doc comment names the example or arranged test that pins each path.

Ruling: either (a) accept counted-not-required as below, or (b) retune at T1 and T6 as l.64 and l.902 say, and re-pin the seed tests that move.

Amendments for (a):
- l.64, add: "A required path that the Event deck's replay leaves to fewer than 2 of the 20 games is counted, not required, and named with its pinning example or test (6-2a's precedent)."
- Task 1 Step 1, after l.133: "**Paths the new games no longer reach.** After `REPLAYED`, add `const HELD_BY_FEWER_THAN_TWO = new Set<string>([…])` with the eight paths above. Each tally's and replay test's 'never seen' filter skips its keys. Its doc comment names, for each path, the example or arranged test that pins it."
- l.898: "… every key above above 0, the 18 `an Event revealed: …` keys included, but those in `HELD_BY_FEWER_THAN_TWO`."
- l.902–903, replace with: "If a required key is held by fewer than 2 games, add it to `HELD_BY_FEWER_THAN_TWO` with its pin, and take out any key now held by 2 or more. At the probe that leaves the 14 above. Report the set."

**R5 (fix-in-plan) — The deck-order premise is false: an example's Event deck reveals Regulation Audit first.**
Evidence:
- Examples skip Setup, and `buildCards` shuffles every set by the examples' seed. The probe `logs/try-t1.out` shows:
  - 'expected … Trade Show, but it has a Regulation Audit';
  - the next Round Start reveals Trade Show;
  - `Given the game is set up` reveals Headhunter Holiday.
- This is harmless until Task 5. Then the Audit taxes at the reveal, and four examples that cross a Round Start lose $1 ('Expected p0 to have 5 capital, but they have 4.', and three more like it):
  - 'an onboarding staff member generates nothing this turn and works the next (rulings 8 and 25)';
  - 'an onboarding Senior leads nothing that turn (section 6, ruling 8)';
  - 'a Junior Software Dev with 2 Blue XP and a Red Skill token declared Red makes 1 Red, its Blue XP idle (section 11, the slice's R11)';
  - Task 2's 'Server Crash takes 1 off …'.
- A10 adds the plan's own remedy line to each of the four.

Amendments:
- l.59: "… starts with none in play and its Event deck in the order `buildCards` leaves it at the examples' seed (examples skip Setup). Each Round Start it crosses reveals Regulation Audit, then Trade Show. From Task 5 the Audit taxes at the reveal, so such an example that checks money fails. Add `  And the event deck has the Whistleblower Protection Act` after its first Given and report it. Task 5 adds it to the three examples named in R5 of the pre-flight."
- l.143: "… confirms that the deck's top in an example that arranges no Event is Regulation Audit (`buildCards`' order at the examples' seed)."
- Task 2's Server Crash example, after l.369: `  And the event deck has the Whistleblower Protection Act`.

**R6 (fix-in-plan) — Task 2's Event output lines reach units that don't work in that colour, and Legacy reaches stopped decay.**
Evidence at `8f69782` (T2 as written):
- The Open Source Boom example ends with 'Expected the Dating App … to have 4 blue cubes, but it has 6.' The line reaches cards that make no Blue.
- In the long runs, Logjam's −1 reaches every card whose red output is 0. 6-2a's no-output-below-0 invariant fails ('the outputs after p0's end their actions: expected [ …(5) ] to deeply equal []').
- Two games stop with 'p1 has no move in turn 28, phase ops check', and 14 of the file's tests fail.
- Hackathon gives Red to software cards.
- l.20's call ("the lines go before the mode lines … so they reach only the colour a unit works in") holds only for flex and declared cards.
- `A legacy card's bug decay goes up by its bugs.` gives decay to a product whose decay a QA Engineer at 2 XP or a VP of Sales stops (§11, ruling 19).

Amendments:
- l.264–281: the flags become as below. Server crashed is unchanged, and its floor covers it.

  ```text
  Legacy:
    Only if the event in play has the Legacy Code.
    Only if it is decaying.

  Open source boosted:
    Only if the event in play has the Open Source Boom.
    Only if one of:
      It is a software card.
      It is a flex card.
      It is blue mode.

  Hackathon boosted:
    Only if the event in play has the Hardware Hackathon.
    Only if one of:
      It is a hardware card.
      It is red mode.

  Logjammed:
    Only if the event in play has the Supply Chain Logjam.
    Only if one of:
      It is a hardware card.
      It is red mode.
  ```

  The gates mirror the first lines of `Blue output:` and `Red output:`.
- l.20: "… Each Event output flag reads the colour a card works in (its skill or mode, as the first lines of `Blue output:` and `Red output:` do), and its line goes before the mode lines …". Legacy reads `decaying`, so a stopped decay stays stopped.

**R7 (fix-in-plan) — Task 2's gates and three line placements are unpinned. Six examples pin them.**
Evidence:
- With R6's gates, the removal probe at T2 (`logs/rm-t2.out`) finds four survivors: `Only if it is decaying.`, OSB's `It is blue mode.`, Hackathon's `It is red mode.` and Logjam's `It is red mode.`. A5's three examples pin them, and `rm-t2b.out` shows none survive.
- The line-order probe (notes l.43; `logs/order-final.out`) moves each order-carrying line one step. These survive:
  - Hackathon or Logjam below Burnout's `… is 0.` (R3);
  - Logjam below `A qa mode card's red output is 0.` (no unit below 0);
  - `A bubbly card's rev goes up by 1.` below the rev floor or the Offline 0 (l.283: Events come before Decay).
- A17's three examples each fail when their line moves (`logs/try-a17-*.out`).
- The other order survivors are commutative: two `goes up by` lines, two `is 0` lines, or price lines on disjoint kinds.

Amendments:
- l.300: "Append these 11 examples": the plan's five, then the six below.
- l.57: "The tasks end at N₇ + 4, + 15, + 21, + 24 and + 27." This counts R10's and R15's one each.
- l.395 adds: "6 Legacy's decaying gate; 7 OSB's blue-mode gate; 8 Hackathon's and Logjam's red-mode gates; 9 Hackathon above Burnout's 0; 10 Logjam above Burnout's 0 and the QA-mode 0; 11 Tech Bubble above the rev floor and the Offline 0."
- l.396 adds: "then the line-order probe: move each Event output line below Burnout's `… is 0.`, Logjam below the QA-mode 0, and Tech Bubble below `… is at least 0.` and the Offline 0, and expect each to fail an example."

The six examples:

```text
Example: Legacy Code doubles no Bug Decay that is stopped: a QA Engineer with 2 XP in the ops team keeps every Active product's full revenue (section 20, section 11, ruling 19)
  Given the event in play has the Legacy Code
  And p1's operations has a Dating App and a Mobile Wallet
  And the Dating App in p1's operations has 2 bugs
  And the Mobile Wallet in p1's operations has 1 bug
  And p1's ops team has a QA Engineer, a Junior Software Dev and a Junior Software Dev
  And the QA Engineer in p1's ops team has 2 training xp
  And the turn passes to the left
  Then the phase is income
  And p1 has 10 capital

Example: Open Source Boom gives its 1 more to a Junior trained in Blue and declared Blue, and nothing to a flex Senior declared Red (section 20, section 11)
  Given the event in play has the Open Source Boom
  And p1's operations has a To-Do List
  And p1's ops team has a Junior Hardware Eng and a Firmware Specialist
  And the Junior Hardware Eng in p1's ops team has 1 blue skill token
  And the turn passes to the left
  Then the phase is modes
  When p1 declares the Junior Hardware Eng, choosing blue
  And p1 declares the Firmware Specialist, choosing red
  And p1 confirms their modes
  Then p1's blue supply is 2
  And p1's red supply is 2

Example: Hardware Hackathon gives its 1 more, and Supply Chain Logjam its 1 less, to a Junior trained in Red and declared Red (section 20, section 11)
  Given the event in play has the Hardware Hackathon
  And the event deck has the Supply Chain Logjam
  And p1's operations has a Smart Thermostat
  And p1's ops team has a Junior QA Tester
  And the Junior QA Tester in p1's ops team has 1 red skill token
  And the turn passes to the left
  Then the phase is modes
  When p1 declares the Junior QA Tester, choosing red
  And p1 confirms their modes
  Then p1's red supply is 2
  When p1 pays salaries
  And p1 ends their actions
  And p0 ends their actions
  Then it is p1's turn
  And the event in play has the Supply Chain Logjam
  And p1's red supply is 0

Example: Hardware Hackathon gives a burned-out unit nothing, as Burnout's 0 comes after every Event (section 20, the slice's R3)
  Given the event in play has the Hardware Hackathon
  And the phase is actions
  And p0's development has a Smart Lock
  And the Smart Lock in p0's development has the Engineer and the Diva on it
  And the Diva in p0's development team has 1 burnout
  When p0 ends their actions
  Then the Smart Lock in p0's development has 4 red cubes

Example: Supply Chain Logjam takes nothing from a burned-out unit or from the Fixer working in QA, so no unit makes less than 0 (section 20, the slice's R3, the spec's call)
  Given the event in play has the Supply Chain Logjam
  And the phase is actions
  And p0's development has a Smart Lock
  And the Smart Lock in p0's development has the Engineer, the Diva and the Fixer on it
  And the Diva in p0's development team has 1 burnout
  And the Fixer in p0's development team is qa mode
  When p0 ends their actions
  Then the Smart Lock in p0's development has 2 red cubes

Example: Tech Bubble's $1 comes before Bug Decay and the $0 floor, and an Offline product gets none (section 20, section 5)
  Given the event in play has the Tech Bubble
  And p1's operations has a To-Do List and a Dating App
  And p1's ops team has a Junior Software Dev
  And the To-Do List in p1's operations has 2 bugs
  And the turn passes to the left
  Then the phase is ops check
  When p1 switches off the Dating App
  And p1 confirms the products online
  Then the phase is actions
  And p1 has 7 capital
  And p1 has 0 market share
```

How the numbers come:
- Legacy: the QA Engineer at 2 XP stops decay (ruling 19). The Dating App earns 1 and the Mobile Wallet 2: 7 + 3 = 10.
- OSB: the trained Junior's 1 + 1 = 2 Blue; the Firmware Specialist in Red makes 2 Red.
- Hackathon/Logjam: Red 1 + 1 = 2, then 1 − 1 = 0.
- Hackathon + Burnout: the Engineer's 3 + 1 = 4, and the burned-out Diva 0.
- Logjam: the Engineer's 3 − 1 = 2; the Diva 0; the Fixer in QA makes 0 Red, not −1.
- Bubble: the To-Do List's 1 + 1 − 2 = 0. The Offline Dating App earns nothing and no Market Share.

**R8 (fix-in-plan) — Task 2 must re-pin plan 6-3 Task 1's `inPlayZones`.**
Evidence: with S1 and AS1 in place, T2's flags make `inPlayZones(game)` `['event in play']`. The S1 Startup test fails until it is re-pinned (`logs/t2a4s-focused.log`).
Amendment, l.257, add: "6-3 Task 1's `inPlayZones(game)` pin (`[]` while it runs ahead, S2) becomes `['event in play']`."

**R9 (fix-in-plan) — Task 3's Intern Season example ends the wrong player's actions.**
Evidence: 'Expected the event in play to have a Venture Capital Rain, but it has an Intern Season.' It is p0's turn, and the actions phase no longer ends at 0 AP (the free-actions call).
Amendment, l.536: `  When p1 ends their actions` → `  When p0 ends their actions` + `  And p1 ends their actions`.

**R10 (fix-in-plan) — Five Task 3 lines survive the removal probe.**
Evidence (`logs/rm-t3.out`):
- Course priced's `Only if it is a Training card.` (l.457) survives. At $2 the Workaholic is refused even at $1.
- Show priced's `Only if it is a TechCrunch Feature card.` (l.461) survives. Only TechCrunch is played.
- The hardware recruit's `the hardware junior price` guard, the QA recruit's `the junior price` guard and the open job market's `rehire price` guard (l.446–447) survive. No example is refused by them.
- l.573 claims examples 3–5 pin them. A7 fixes them (`rm-t3b.out`: none survive).

Amendments:
- The Online Course Boom example: l.543 `And p0 has 3 capital`, l.547 `Then p0 has 2 capital`, l.549 `Then p0 has 1 capital`.
- The Trade Show example (l.553–564) becomes:

  ```text
  Example: during Trade Show TechCrunch Feature costs $2, and with a Sales Rep on the product still $2, as the discounts don't stack, while other Strategy cards keep their printed price (section 20, ruling 23)
    Given the event in play has the Trade Show
    And the phase is actions
    And p0 has 7 capital
    And p0's strategy hand has a TechCrunch Feature, a TechCrunch Feature and a Clean Coder
    And p0's operations has a Dating App and a To-Do List
    And the To-Do List in p0's operations has a Sales Rep on it
    And p0's bench has a Junior Software Dev
    When p0 plays the Clean Coder to the Junior Software Dev
    Then p0 has 4 capital
    When p0 plays a TechCrunch Feature to the Dating App
    Then p0 has 2 capital
    When p0 plays the TechCrunch Feature to the To-Do List
    Then p0 has 0 capital
    And the To-Do List in p0's operations has 1 hype
  ```

- Append, making Task 3's examples 6:

  ```text
  Example: during Chip Shortage a player with $3 can't recruit a Junior Hardware Eng for $5 or hire the Diva from the open job market for $4, and recruits a Junior QA Tester for $2 but not a second (section 20, section 13, section 6)
    Given the event deck has the Chip Shortage
    And the open job market has the Diva
    And it is p1's turn
    When p1 ends their actions
    Then the event in play has the Chip Shortage
    Given p0 has 3 capital
    When p0 recruits a junior hardware eng
    Then it is rejected because "they have at least the hardware junior price in capital"
    When p0 hires the Diva
    Then it is rejected because "they have at least the card's rehire price in capital"
    When p0 recruits a junior qa tester
    Then it is accepted
    And p0 has 1 capital
    When p0 recruits a junior qa tester
    Then it is rejected because "they have at least the junior price in capital"
    And p0 has 2 actions
  ```

- l.573 adds: "4 … Course priced's kind line (the Workaholic refused with $1 left); 5 … Show priced's kind line (the Clean Coder at its printed $3); 6 the hardware, QA and open job market guards."

**R11 (fix-in-plan) — Task 4's `standIns` pin never appears.**
Evidence: at `e1f2087` the view's `standIns` lacks `"blue made": "blue reached"`. `blue made` reads `losing blue`, whose `its blue team output` the view doesn't count as card-only, so `blue reached` stands in for nothing.
Amendment, l.600: "`standIns(game)` and `shownFlags(game)` are unchanged: `blue made` reads `losing blue` (`its blue team output`), which the view doesn't count as card-only, so `blue reached` stands in for nothing." S3 is the matching change in 6-3.

**R12 (fix-in-plan) — Task 5's Audit example uses a phrase that doesn't exist.**
Evidence: the compile diagnostic "“the Junior Hardware Eng in p1's development team has 2 red xp” isn't in the phrase library yet."
Amendment, l.838: `… has 2 red xp` → `… has 2 red xp tokens`.

**R13 (fix-in-plan) — Task 5 must teach the existing turn checks about a round's steps.**
Evidence: at `d4c5594` the long runs fail 'rounds started after p0's end their actions: expected 1 to be +0'. The round starts as the event check starts, not with the start player's turn, and the games that stop leave the tallies unseen. A11 fixes all three checks.
Amendment, after l.742:

"- **Turns under a round's steps** (6-1):
  - `keepsTheRules`' rounds check: a round starts in a move whose `after` has round steps and whose `before` has none, or, with no steps in `before`, as the start player's turn starts. The start player's turn that starts as the steps end starts no new round (`const waited = roundStepsOf(before) !== null; const stepsStarted = !waited && roundStepsOf(after) !== null;` then `stepsStarted || (!waited && started === startPlayerOf(after, seats))`).
  - `keepsTheBudget`: a seat whose turn starts in the move has `ACTIONS_EACH_TURN`, the mover included, since the start player's own step can end the steps.
  - `playGame` adds each move made in `event check` to `finalCheck`, as it does the final check's, since they are no turn for `turnsIn`."

**R14 (fix-in-plan) — Task 5's arranged Audit test never reaches the reveal as written.**
Evidence:
- At `d4c5594` the test fails with 'expected undefined not to be undefined'.
- With S as start player, S's end of turn passes to O's turn, not to a Round Start. O's Income then meets $3 of salaries with $1.
- `playTurn` for O plays O's whole turn, whose moves can take its staff off the Board before the reveal.

Amendment, l.744: "… O with the Engineer and the Diva on a project of its development and 4 capital. S ends its actions. `playTurn` plays O's turn until it pays its salaries ($3, leaving $1), and O ends its actions. The next Round Start reveals the Audit, which asks O $2. For t = 0 and t = 1, `playTurn` for O in `event check` lets go of a different card first …".

**R15 (fix-in-plan) — Two of Task 5's phase lines survive the removal probe.**
Evidence (`logs/rm-t5.out`):
- `  Players take turns.` (l.785) survives. The phase's default actor is the current player: the compiled game is the same without the line, and `Phase: final check` has none (`logs/a13-actor.out`).
- The ops team's `    Only if it is taxed.` (l.795) survives.

Amendments:
- Delete l.785.
- Append the example below, making Task 5's examples 3.
- l.865 adds: "3 the ops team's `Only if it is taxed.`".

```text
Example: Regulation Audit lets a player go only of the staff it taxes, in the ops team too (section 20, the spec's call)
  Given 2 players
  And the event deck has the Regulation Audit
  And p1 has 0 capital
  And p1's ops team has a Junior QA Tester and the Diva
  And it is p1's turn
  And the phase is actions
  When p1 ends their actions
  Then the event in play has the Regulation Audit
  And the phase is event check
  And it is p1's turn
  When p1 lets go of the Junior QA Tester
  Then it is rejected because "it is taxed"
  When p1 lets go of the Diva
  Then it is p0's turn
  And the open job market has the Diva
  And p1's ops team has a Junior QA Tester
```

How the numbers come: the Diva's $1 salary is taxed $1 against p1's $0. The 0-XP Junior is exempt (§20.D 6). Once the Diva is gone, the tax is $0.

**R16 (fix-in-plan) — The 4-player replay test (l.899) can't hold what it asks for.**
Evidence:
- At `d8aee6f` the test fails with `{"reshuffles":0,"let-gos in the event check":0}`.
- No 4-player game lasts the 19 Round Starts that a reshuffle of the 18-card deck needs, and no 4-player seat is short at an Audit. The test costs about 2.5 s.
- The 2-player logs hold both: reshuffles at seeds 2 and 4, let-gos at seeds 1 and 4.

Amendment, l.899 becomes: "**`REPLAYED` gains `'Event reshuffles'` and `'let-gos in the event check'`.** `keepingForReplay` counts them from `EVENTS_RESHUFFLED` and `AUDIT_LET_GO`, and the 2-player replay test's title adds 'reveals, an Event reshuffle and an event check that waited'. No 4-player game lasts the 19 rounds a reshuffle takes."

**R17 (fix-in-plan) — 6-2a's 'TechCrunch for $2 with a Sales Rep' key would count Trade Show plays.**
Evidence: 6-2a's `happenings` pushes `TECHCRUNCH_2` for every TechCrunch price but 5 (test.ts ~l.2060). Under Trade Show, a play on an unpitched product costs $2 too.
Amendment, after l.893: "6-2a's `TechCrunch for $2 with a Sales Rep` counts a `PLAY_TO_PRODUCT` only when the product's worked `price` is 2 in `before`."

**R18 (fix-in-plan) — `Shuffle the event deck.` survives every example.**
Evidence:
- The line survives in `rm-t1.out` and `rm-final.out`.
- Examples skip Setup, and 'Setup shuffles the 18 Events …' passes without the line: `buildCards` already shuffled the deck. l.230 says example 1 pins it.
- Without the line, A18's test fails, along with 4 long-run tests (`rm-tests-final.out`, line 813).

Amendments:
- Task 1 Step 1, append:

  ```ts
  it('shuffles the event deck at Setup, so the Events left after the first reveal are not in the order the deck was dealt in (§4, §15.D)', () => {
    for (const seed of [1, 2, 3]) {
      const set = setUp(2, seed);
      const dealt = namesIn(fresh(seed), 'event-deck').filter((name) => name !== eventOf(set));
      expect(namesIn(set, 'event-deck'), `seed ${seed}`).not.toEqual(dealt);
    }
  });
  ```

- l.230: "1 the deal (Setup's shuffle is pinned by the test above)".

**R19 (fix-in-plan) — The README text drops one item and adds one that is already there.**
Evidence:
- HEAD's README already lists ruling 13.
- HEAD's "It still leaves out" names "the Full Stack Ninja's trait", which l.906's text drops. The trait is a poach multiplier (rulebook l.1276).

Amendments:
- l.905: delete "Its rulings list adds 13."
- l.906: "… selling and poaching (with the Headhunter, Corporate Raider, Cease & Desist, Flight Risk's effect, the Full Stack Ninja's trait, Recruiter Frenzy and Headhunter Holiday) …".

**R20 (fix-in-plan) — Step 5's first check prints plan 6-3 Task 1's files.**
Evidence: `git diff --stat 1b6a4c4 -- src/engine src/utils` lists `queue-phrases.ts`, `testing.ts`, `worked-view.ts` and `worked-view.test.ts`. The sequencing ruling (l.43) puts 6-3 Task 1 inside this plan's span. From `aee551f` the check prints nothing.
Amendment, l.909/913: "The first check prints only plan 6-3 Task 1's four files. `git diff --stat <6-3 Task 1's commit> -- src/engine src/utils` prints nothing."

**R21 (fix-in-plan, minor) — The long-run tests' seed-specific comments go stale.**
Evidence: the "Held by two games, the fewest: …" lines name BASE's seeds. For example, test.ts l.3976 says the Engineer paid $1 in the ops team is held by two games; it is now held by none. Other examples are l.3938–3944, 4026–4027, 4060–4064 and 4099–4105, and the replay tests' seed lists at l.4474 and l.4485–4488.
Amendment, Task 6 Step 1, add: "Re-read the long-run tests' seed-specific comments (the 'Held by …' lines, and which seed holds what in the replay tests) from the new tallies."

### S: plan 6-3 Task 1, run ahead between 6-2b T1 and T2

Probe:
- `aee551f` is Task 1 as written, on T1 + A1 + A3. `71ac85e` is AS1.
- Step 2's run fails the Startup test only: 1 of 175.
- Full suite at S1: 3809 passed, 1 failed (S2). With AS1 the pin passes; the next full run, at T2, is 3810 passed.
- `tsc --noEmit` is clean.
- Without S1, T2 (with A4) fails four view tests, and they pass once S1 is in (`logs/t2a4-focused.log` vs `t2a4s-focused.log`):
  - 'stands each need in for its cost …';
  - 'shows the values that add up cards everyone sees, gauges each color's bandwidth …';
  - 'gives every seat the same values of each player …';
  - '(guard) shows the same flags beside a value …'.

  These are the failures the sequencing ruling (6-2b l.43) foresaw.

**S1 (fix-in-plan) — The 6-2b items in 6-3's Assumed list (l.122) don't exist when Task 1 runs ahead.**
Evidence: at `ddf22de` 6-2b has only Task 1. There is no `junior price`, `hardware junior price`, `event check`, let-go buttons or `acting once` line. l.113 says to stop on a missing item. Task 1 itself uses none of them.
Amendment, l.122 splits:
- "**6-2b Task 1 (built before this Task 1):** the zones `event deck`, `event in play`, `event discard`; the Event table; `EVENTS`."
- "**6-2b Tasks 2–5 (built before Task 2):** the game numbers …; the phase `event check` …; the round-start line …."

**S2 (fix-in-plan) — 6-3 l.190 pins `inPlayZones(game)` as `['event in play']`, but no worked value reads the Event yet.**
Evidence: S1's Startup test fails with `[]`.
Amendment, l.190: "`inPlayZones(game)` is `[]` while Task 1 runs ahead of 6-2b's Task 2 (G1). 6-2b's Task 2 changes it to `['event in play']` (6-2b R8)."

**S3 (fix-in-plan) — 6-3 l.193's "`standIns` also keeps 6-2b's `'blue made': 'blue reached'`" can't hold.**
Evidence: 6-2b's R11. When Task 1 runs ahead, the value doesn't exist yet.
Amendment: delete that sentence.

**S4 (fix-in-plan, for 6-3's browser step) — 6-3's `SCRATCH` points at a folder that doesn't exist.**
Evidence:
- l.509 sets `SCRATCH=/tmp/claude-0/-home-user-turnhout/fbd53c51-…/scratchpad/browser-6-3`. No `/tmp/claude-0/-home-user-turnhout*` exists, so l.542's `$SCRATCH/../browser-5-3/check.cjs` can't be found.
- The file is at `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-5-3/check.cjs`, with every helper l.117 and l.542 name.

Amendment, l.509: `SCRATCH=/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-6-3`.

Checked against the core:
- `git diff 2886ed0..aee551f -- src/engine` adds no banned word and no DOM, `Math.random` or `Date.now`. `GALE_GAME`'s words are the fixture's own.
- No protected file changes.
- No phrase is added. `CENTRE_HAS` names the condition `queue-phrases.ts` already registered.
- `runtime.ts` and `card-alone.ts` are untouched, and `card-alone.ts` doesn't trust `CENTRE_HAS`. So a value that reads the Event in play is never kept per card object. At T6 the card-alone set (`logs/card-alone-t6.out`, 63 → 59):
  - loses `blue output`, `red output`, `blue bandwidth`, `red bandwidth`, `learning blue` and `learning red`;
  - gains `acting once` and `past tier 1`, which read only the card's own name and tier.

  None of the 17 Event flags is card-alone, and nor is any value built on them (`rev`, `bug decay`, `cost`, `rehire price`, `price`, `blue reached`/`added`, `red added`, `payroll tax`). No worked value reads a game number or a player. card-alone.test.ts, its transplant test and its power canary pass in the final full run.

## Gaps (with homes)

1. **A speed-up mini plan after 6-2b (6-2a's precedent).** The Startup file runs +33.5% over BASE and is 2.7–3.5 s under the 30 s ceiling. Six output and bandwidth values lost the per-card cache.
2. **The next long-runs cadence change.** It covers R4's 14 paths and the old keys that 6-2b's games no longer reach: Revenue Leader, Leadership Masterclass on a Sales Rep, and keep red in the ops team. Those three are counted, not required. A Trade Show TechCrunch play, a Legacy Code Income with Bugs and a Crunch Bug stopped by Clean Code would each need the auto-player to aim at them (l.902's levers).
3. **The long-runs follow-up.** No 4-player game reveals past 18 rounds, so only the 2-player replay rebuilds an Event reshuffle (R16).
4. **A later Setup pass.** Every Setup `Shuffle` line survives the examples, for R18's reason: talent, strategy, seed, growth and milestone (`logs/rm-setup-shuffles.out`). This predates 6-2b. Pin them as R18 does, or record them as rulebook lines that `buildCards` makes redundant for examples.
5. **6-3.** Re-pin per S1–S3. The Forward note (l.939) still holds: every Event flag reads the Event in play, so `shownFlags` leaves them all out.
6. **Plan text.** Cut the task briefs again from the amended plan. Each task's example count and "Lines each example pins" change (R7, R10, R15).

## Checked and clean

- **Global Constraints:**
  - `git diff 1b6a4c4` outside 6-3 Task 1's four engine files touches only the rules, the Startup test, the README and `designer-page.test.tsx`. That file shows only its count lines, 278 → 305.
  - Step 5's checks 2–4 print nothing but those count lines.
  - No page source, protected file or banned word changes.
  - Hearts, Color Match, Venom, Rent Day and hearts-demo pass alone (8 files, 100 tests), and Rent Day keeps 108 examples.
- **Assumed items other than R1** (l.95–101) all exist at HEAD by name: 6-1's steps line and `ROUND_STEPS_KEY`, 5-2b's milestones and Setup shuffle, 5-2a's `Bug decay:` and `It is fired.`, 4-2's `Rev:` and `Blue bandwidth:`, the recruit and hire buttons' guards, the phrases, and the test helpers.
- **Task 1's pins as written:**
  - 141 cards; the Juniors c141–c149 at 3 players; `NEXT_CARD_KEY` 150;
  - the three table rows;
  - the setup test's 1 / 17 / 0;
  - examples 2–4 with their arranged decks.
- **Rulebook numbers** (§20.D l.1396–1418): every number in the plan's examples matches. Bubble +$1; Trolls' $5; Angel $3 for Tier 1 only, counting both rows; Legacy −$2 a Bug; Audit $1 per salaried employee with 0–1 XP Juniors exempt; OSB and Hackathon +1; Chip +$3 for native Hardware, flex untouched; Crunch +1 cube +1 Bug unless Clean Code; Server Crash −1 Blue bandwidth; Logjam −1; Intern $0; OCB $1; Trade Show $2, not stacking.
- **Price floor (notes l.28, l.38):** no 6-2b line can take a price below 0. Online Course Boom and Intern Season set a price (`is 1`, `is 0`), and Chip Shortage raises one.
- **The Training money check** reads the worked price (test.ts l.2301), so Online Course Boom's $1 is checked (notes l.14).
- **6-2a's Toxic lines** (rules l.488, 492–494, 507–509) survive the examples at BASE and at the end. Each fails Toxic's dedicated test, and most also fail long-run or view tests (`rm-tests-final.out`), as notes l.2 accepts.
- **`Only if it is not blue covered.`** (l.565) fails only Task 4's added-values test, as l.705 names.
- **The removal probe** over every line 6-2a and 6-2b added or changed at the final commit (309 lines) finds no other survivor. The steps line's place and the pay-and-pass rule give diagnostics when moved or removed.
- **The line-order probe** finds that Burnout stays last, the Event lines sit above it, and the round-start price lines keep their order. Its other survivors are commutative.
- **Card-alone:** see S above.
- **Long runs at 2–5 players:**
  - all 18 Events are revealed, at 2 to 18 games each;
  - the discard reshuffles in 2 games, and Angel pays in 12;
  - the Audit taxes in 3 and lets staff go in 4;
  - the Events' invariants hold after every move: conservation, one in play, changes only at a Round Start, the price numbers, the event check phase, let-gos of taxed cards only, and no capital below 0;
  - 'plays the same game through the page's view as without it' passes through round steps.
- **The undo test and load-log replay** rebuild every 2-player and 3-player game, Event reshuffles and let-gos included.
