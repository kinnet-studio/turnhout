# Pre-flight: Startup long-runs retune (plan 2026-11-23)

- **HEAD scanned:** e942193 on `claude/peaceful-curie-rdfkow`. 153cf28 and e942193 hold the same code; e942193 adds only the plan.
- **Plan and briefs:** task-1/2/3-brief.md are the plan's text, word for word (checked with diff). constraints.md is the plan's Global Constraints.
- **My copy (built without the drafter's copies or outputs):** `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf-retune/`
  - `work/` was made with `git archive e942193` and has node_modules symlinked. It is a local git repo with these commits: `cb2ee26 base`, `98cd140 t1 step1`, `75c629d task 1`, `2538414 t2 step1`, `63f3235 t2 steps2-5`, `752c5bf t2 step6`, `babba6c t2 steps7-8`.
  - Every edit was typed in from the plan text, through `scripts/t1_step1.py`, `t1_step3.py`, `t1_step4.py`, `t2_step1.py`, `t2_steps2to5.py`, `t2_step6.py` and `t2_step78.py`. Each one asserts that its old text occurs exactly once.
  - `base/` is a clean e942193 and `t1copy/` is Task 1. Both are used for timing.
  - `probe-head/`, `probe-t1/`, `probe-w0/` (Task 1 with free moves at 0 and no steering) and `probe-t2/` are instrumented by my own `scripts/probe.py`. Per game it records the tallies, the result, the log with and without END presses (hashed), the final card layout and card state (hashed), and the moves that carry choices. It also records the five required lists. `scripts/an.py` summarises a run.
  - The outputs are in `out/` (`head.json`, `t1.json`, `w0.json`, `t2.json`, `*-b.json`). The diffs are `out/pf-task1.diff` and `out/pf-task2.diff`, and the logs are in `logs/`.
  - I read the drafter's `probe_patch.py`, `analyse.py` and `run.sh` for the approach only.

## Findings

### R1. Task 2 Step 1: one of the two "already pass at Task 1" tests fails at Task 1 (fix-in-plan)

- **Evidence.** At Task 1 (`2538414`), I ran `npx vitest run src/games/startup-simulator.test.ts -t "first Senior it can pay for to the ops team|bench’s first card at the bench cleanup"`.
  - The bench-discard test passes.
  - The ops-team hire test fails at `expect(logs[0].map(...)).toEqual([DRAFT_GROWTH, RECRUITS[2], HIRE_AGENCY_TO_OPS])`. It received `recruit a junior software dev` where `recruit a junior qa tester` was expected.
  - The cause: at t = 8 and a = 1, the cycle's action is 0, and Task 1's `recruit(a)` gives `RECRUITS[(8 + 1) % 3]` = RECRUITS[0]. Only Step 3's recruit fix gives `RECRUITS[(8 + ⌊8/9⌋) % 3]` = RECRUITS[2].
  - The test passes from Step 3 on: after Steps 2–5, only the three tests Step 6 names fail.
  - The ledger's ruling ("two characterization tests that pass before the retune") inherits the error.
- **Amendment (Step 1).** Replace "These two already pass at Task 1 (measured, with the logs above). They pin the auto-player's presses that the retune is about to stop reaching in the long runs, so they go in first." with:

  > The bench-discard test passes at Task 1. The ops-team hire test fails at Task 1 on its second move: at t = 8, a = 1, the cycle's recruit is still `recruit(a)` = `RECRUITS[0]`, the Junior Software Dev, where the test expects Step 3's `RECRUITS[2]`. It passes from Step 3 on (measured). Both pin presses the retune is about to stop reaching in the long runs, so they go in first.

  Also correct the ledger ruling. Step 6's "exactly three tests fail" stays true.

### R2. Both "first seed" comments are false after Task 2 (fix-in-plan: give the words)

- **Evidence** (`out/t2-b.json`):
  - **The view test.** 2p seed 1 now has 2 Greenlights that ask a choice (moves 156 and 170, each with a cut). Seed 2 has 1 (move 211, Cut 2 blue). So "Seed 2 is the first 2-player game with a Greenlight that asks a choice" is false. At HEAD, seed 1 had none.
  - **The 3-player seed-2 undo test.** Seed 1 now makes all four kinds of move (assign, Launch, Pivot, reassign) by move 116. So "Seed 2 is the first 3-player game to make all four" is false. The moves each seed needs for all four:

    | Seed | 1 | 2 | 3 | 4 | 5 |
    |---|---|---|---|---|---|
    | Moves | 116 | 83 | 118 | 117 | 85 |
- **Why the plan should give the words.** Step 7 leaves the rewording to the implementer, so two implementers would write different comments.
- **Amendment.** Give the text in Step 7.
  - **View test (HEAD l.3193–3194):**
    ```ts
          // Seed 2 has a Greenlight that asks a choice (a cut, Cut 2 blue), which the view must list for the card. The game played without
          // the view is the long run's, which plays seed 2 so.
    ```
  - **3-player seed-2 undo test (HEAD l.3302–3303):**
    ```ts
          // Seed 2 makes all four by its 83rd move, the soonest of the 3-player seeds 1 to 5 (seed 1 takes 116).
    ```

### R3. The retune falsifies test comments the plan doesn't name, so an implementer may not fix them (fix-in-plan)

- **Evidence.** I compared each non-required tally key between HEAD and Task 2 (`out/head.json` against `out/t2.json`).
- **Comments that become false:**
  - **l.3149**, talent tally: "Agile Workshop badges a Junior PM, which the runs never play". After the retune it is played at 4p s2.
  - **l.3177–3178**, Strategy tally: "and none both sides of the stack". After the retune, 2p s4 claims Full Stack Founder.
  - **l.3718–3719**, Training `it.each`: "spend their QA Certifications and Masterclasses on Juniors … and no seat holds a Junior PM as an Agile Workshop comes". After the retune a Masterclass goes on a QA Engineer at 4p s4, and an Agile Workshop on a Junior PM at 4p s2.
- **Keys counted but not required, now held by 2 or more games, whose comments give a rarity that no longer holds:**

  | Key | Comment | Games after Task 2 | Games at HEAD |
  |---|---|---|---|
  | `REASSIGN_TO_PRODUCT` | l.3064 | 3 (2p s1, 3p s2, 3p s4) | 1 |
  | `HIRE_SCOUTED_TO_PRODUCT` | l.3068 | 2 (2p s1, 2p s4) | 0 |
  | `EXPERIENCED_PAID` | l.3152 | 3 (3p s2, 4p s5, 5p s4) | 0 |
  | `BADGED_LEADING` | l.3175 | 5 (2p s1, 2p s4, 3p s4, 4p s1, 5p s5) | 0 |

  The plan's own Secondary-measures rule is "each reached by at least 2 games would become a required key", and it was applied only to its six measures.
- **Why this conflicts with the plan.** "Existing test lines change only where this plan names them" blocks the fix.
- **Amendment.** Add a Step 7 bullet. Two options, for the controller:
  - **(a) Promote** any of the four keys to the required lists. Then restate "91 required keys" (95 if all four are promoted).
  - **(b) Keep them counted and correct the comments.** At minimum, change these lines:
    - l.3149: "which the runs never play (P8)" → "which the runs play once (4 players seed 2, P8)".
    - l.3177–3178: "and none both sides of the stack" → "and only 2 players seed 4 runs both sides of the stack (Full Stack Founder, once)".
    - l.3718–3719: "…on Juniors, which are nearly always there to take them, and no seat holds a Junior PM as an Agile Workshop comes (plan 5-2b's P8)" → "…on Juniors, which are nearly always there to take them (a Masterclass reaches a QA Engineer once, at 4 players seed 4), and a seat seldom holds a Junior PM as an Agile Workshop comes (once, at 4 players seed 2; plan 5-2b's P8)".
    - For l.3064, l.3068, l.3152 and l.3175, add each key's holders, from the table above, in place of the rarity reason.

### R4. Task 3's D4 gate doesn't say which number is "test time", and on this machine the gate result depends on the run (fix-in-plan)

- **Evidence.** I timed the Startup file best of 3, alternating base, Task 1 and Task 2, in two sets. The table gives vitest's `tests` figure.

  | Set | BASE | Task 1 | Task 2 |
  |---|---|---|---|
  | 1 | 13.07 / 14.70 / 13.80 → **13.07 s** | 14.39 / 14.14 / 14.10 → **14.10 s** | 20.96 / 19.69 / 19.89 → **19.69 s** |
  | 2 | 13.35 / 13.83 / 13.87 → **13.35 s** | 14.46 / 14.82 / 14.28 → **14.28 s** | 21.90 / 21.16 / 21.21 → **21.16 s** |

  - Wall `Duration`, best of each set: BASE 16.83 / 16.44 s, Task 1 17.43 / 17.63 s, Task 2 23.11 / 24.49 s.
  - Task 2 is about 1.5× BASE (the plan measured 1.43×). Its `tests` figure falls on either side of 20 s from one set to the next, and its wall `Duration` is always over 20 s. All of it is under the 30 s watch.
- **Amendment** to Task 3 Step 1 and Task 2 Step 9: "Time = the `tests` figure on vitest's Duration line (not the wall Duration), best of 3." Also say that a result just over 20 s takes the "over 20 s" branch with no code change.
- **Optional** (see R7): make `ideas` lazy to win back about 0.7 s.

### R5. Task 3's notes miss later plans that rely on the turn moving on by itself at the last action (fix-in-plan)

- **Evidence:** `grep` over `docs/superpowers/plans`.
  - **7-2b:**
    - l.110 (Review Focus): "The turn then goes on exactly as after any last action: the Engine, the cleanups, the next seat."
    - l.189: "A move that closes a window on the actor's last action runs the Engine".
    - l.282–300: the Example "a Veto of the Founder's last action still spends it, so their turn goes on to the Engine", which expects `Then it is p1's turn`.
    - l.757, l.765, l.776: the `a last action vetoed` key, read as "the Engine had run for the actor".
  - **8-2a:**
    - l.163–167 (Review Focus): "on the last action, the turn goes on to the Engine either way".
    - l.505: the test "passes the turn on after a Divest on the seller’s last action". It expects that "the next turn has started".
  - Once the retune lands, none of these moves on without an end press.
- **Amendment** (Task 3 Step 2, and add `docs/superpowers/notes/2026-10-19-startup-notes-for-7-preflight.md` to Files and to the commit's pathspec):
  - In `…-notes-for-7-preflight.md`: `- 7-2b (from the long-runs retune): the actions phase no longer ends at 0 actions; the player presses "end their actions", whose Then goes to the Engine. Its Review Focus (l.110), ranTheEngine/atTheEngine note (l.189), Example "a Veto of the Founder's last action …" (l.282–300) and the "a last action vetoed" key (l.757, l.765, l.776) assume the turn moves on by itself after a last action: add the end press, or re-key "a last action vetoed" to the vetoed action that left 0 actions.`
  - Append to the 8-2a line in `…-notes-for-8-preflight.md`: `; also its Divest on the seller's last action (Review Focus l.163–167, test l.505) expects the turn to pass on by itself: the seller now ends their actions.`

### R6. Step 7's comment table repeats the keys HEAD's comments named, and two of its "each" lists are incomplete (note)

- **Evidence.** The holders I measured match every count the table gives. But the lists are not complete.
  - **The every-move tally.** "by five each: the assign to the ops team and the agency row's hire onto a product" leaves out the bench's assign onto a product. That key is also held by 5 games: 2p s4, 4p s2, 4p s4, 5p s4, 5p s5.
  - **Slice 3.** "by six each: the Diva …" leaves out "a cut chosen among options", which is also held by 6 games. It also skips Cut 1 of each, held by 4 games (2p s4, 3p s4, 4p s2, 4p s4), between three and six.
- **Amendment.**
  - **Every-move tally:** "…by five each: the assign to the ops team, the assign onto a product and the agency row's hire onto a product; …".
  - **Slice 3:** "…by three: Cut 2 red (…); by four: Cut 1 of each (2 and 3 players seed 4, 4 players seeds 2 and 4); by six each: a cut chosen among options, and the Diva refused … (…)".

### R7. Step 5 computes `ideas` (with `ideation()` and `first(DRAFT_SEED, …)`) on every action press, not only at a = 0 (note, optional)

- HEAD computed `ideation()` only inside `a === 0 ? … : …`.
- A lazy form plays the same games. I compared all 20 games' logs and card states: identical. It also took 0.6–2.7 s off the `tests` figure in four paired runs: 18.38 → 17.51, 19.64 → 18.89, 24.95 → 22.27 and 20.71 → 20.07 s.
- **Amendment (Step 5 code):**
  ```ts
        const ideas = () => (style === 'researches' && cards(own('operations')).length === 0
          ? [press(RESEARCH_SEED), first(DRAFT_SEED, 'seed-market'), ...ideation()]
          : ideation());
        const planned = a === 0 ? [launch(), ...ideas()] : [
  ```

### R8. Small text points (note)

- **Indentation.** Task 1's new test block is indented 2 spaces less than the plan's other blocks: relative to its fence, `it(` is at column 0. In the file it goes at 2, as the Layoff, Task 2 test and driver blocks already show.
- **Doc comment, Step 4.** The step says the sentence goes "on a new comment line", but its block continues the existing line and wraps. The block is clear, so this is cosmetic.
  - The new doc sentence ("once the free moves are made it ends its actions there") describes Task 2's auto-player. Task 1's auto-player skips the free moves at 0.
- **Hint, Step 3.** The new hint also adds "Training" ("Greenlighting, Training and dismissing cost no actions"). This is correct, since the Training button has no cost line, but neither Review Focus 1 nor the Self-review mentions it.
- **Task 3 Step 2.** "The 5-2b entry about free actions at 0 AP" names no file. It is the handoff's l.135, "- 5-2b final review: the actions phase ended at 0 AP, …". Name it.
- **Spec 1a.** Spec 1a l.68 ("A turn moves on by itself after the third action.") stays as written. That is fine as history, but the handoff line Task 3 writes is now the only record of the reversal.
- **BASE.** The Global Constraints say BASE = 153cf28, and the ledger says e942193. They hold the same code, so either works for the 6-1 checks and the timing.

## Checked and clean

- **Task 1, Step 2.** These fail against HEAD's rules exactly as stated:
  - The new test fails at its first `allowed()[END_ACTIONS]` with "It's p1's turn." (l.2923).
  - The Layoff test receives `{ current: 'p1', phase: 'actions' }`.
  - The page round's status shows the bench-cleanup hint.

  "passes every example" still passes.
- **Task 1, Steps 3–5.**
  - The Startup file passes 94 tests, with 243 examples.
  - `npx vitest run` passes 120 files and 3775 tests.
  - `npx tsc --noEmit` passes.
  - The page round presses "End your actions" at 0 twice and passes. `press` is `fireEvent.click`, and the assertions that follow show the press took effect.
- **The undo tail.** It passes. `GameEngine.undo` pops the log and replays from `this.initial` = `initFlow(arranged)`, which (after Task 1) keeps p0 in its actions at 0. I printed the state:
  - after the first undo: log 1, `allowed()[GREENLIGHT]` = "There is no card in your backlog.", END allowed;
  - after the second undo: log 0, `{ current: 'p0', phase: 'actions' }`, 0 actions, END allowed, development empty, Greenlight allowed.
- **The 20 long runs at Task 1 equal HEAD's games.** For each game, the result, the log without END presses, the final card layout and the whole final card state are identical (hashes). There are 530 END presses, one a turn; HEAD had 130.
  - The only tally difference is at 3p s4: +1 "a Bug added to a project" and +1 "a Bug cleaned on a project", as the plan says.
  - HEAD numbers: 23 Launches, 11/20 games with a Launch, per seed as in the plan, 2-player moves 720 (89, 213, 81, 261, 76), 94 required keys, 10 of them single-game.
- **The D1 variant without the 0-action gate** (`probe-w0`): 23 Launches, 11/20, 3051 moves, 186 Brainstorms. "The Engineer paid 1 in the ops team" drops to 0 and the slice 3 tally fails, which confirms why Task 1 gates the free moves. The other diagnostics are as the plan states: 45 Tier 2 or 3 cards greenlit, 1 launched, 93 Stalled projects at the Engine, 121 pivots.
- **Task 2, after Steps 2–5.** Exactly the three named tests fail, for the stated reasons:
  - the every-move tally misses `DISCARD_BENCH` and `HIRE_AGENCY_TO_OPS`;
  - the 3-player seed-1 test fails on its recruit check;
  - the QA reassign test's log lacks the reassign.

  Typecheck passes.
- **Task 2, after Steps 6–8.** The Startup file passes 96 tests, the suite 120 files and 3777 tests, and typecheck passes. The 3-player seed-1 test runs 52 moves.
- **The probe after Task 2.**
  - 60 Launches; 20/20 games with a Launch.
  - Launches per seed:

    | Players | Seeds 1–5 |
    |---|---|
    | 2 | 5 4 2 5 2 |
    | 3 | 2 4 3 6 2 |
    | 4 | 1 3 1 3 4 |
    | 5 | 1 1 2 6 3 |
  - 91 required keys, none held by fewer than 2 games.
  - Moves: 4318 in all, and 1180 for the 2-player games (231, 231, 193, 329, 196). 700 END presses and 223 Brainstorms.
  - The D3 table, from HEAD to after Task 2, matches key by key, as does the bench's discard (5 games, all at 5 players, → 0).
- **Step 7's table** matches the per-game holders for every count it states, with the omissions noted in R6.
  - The replay comment holds: there are declarations in every 2-player seed, the reshuffle is in seed 4 only, and a final-check switch-off is the last move in seeds 1–3.
  - No 2-player log has a clean, keep, Mentor or Agile press. The one keep is at 3p s2.
  - The 4-player Greenlight test still stops at seed 7, both at HEAD and after Task 2.
- **Review Focus 2.** No free move is offered twice in a turn, and the guard can't fire in legal play.
  - `freeMove` gates each free move by type in the per-turn `made` set: `GREENLIGHT`, `PLAY_TRAINING`, the cycle's dismiss (`made.has(dismiss)`), and the last-round dismiss, which shares the `DISMISS_FROM_OPS` key. So a turn makes at most four free moves, each once.
  - The free buttons in the actions phase are Greenlight, the Training play, the two dismisses and the end. They are the only actions-phase buttons with no cost line.
  - Every candidate in `planned`, `recruitMaker` and `board()` is a paid button. Each accepted press spends at least 1 action, and no rules line raises actions mid-turn. So after 3 accepted non-free presses only free moves and END are accepted, and END leaves the phase (Go to engine).
  - `a` therefore reaches 4 only after END, when the phase is no longer actions.
  - The guard is the branch's first statement, so it is checked before `freeMove` on every iteration. Free moves `continue` without raising `a`; `made` bounds them, not the guard.
- **Review Focus 3.** `hireDiva` and `makersToProject` return moves that go through `choose` → `accepts` → `engine.canDispatch`. Neither dispatches directly.
- **The old texts.** Every text the plan quotes from HEAD matches HEAD exactly. My edit scripts assert each once and found no mismatch. The line numbers are right to ±1, for example l.1377–1379 against l.1378–1379.
- **Plan 6-1, Task 5 Step 5's five checks**, run against base at Task 1 and at Task 2:
  - the banned-word check prints nothing;
  - the protected-files and pure-core checks print nothing;
  - the removed lines are only those the plan names;
  - only `src/games/startup-simulator.{rules,test.ts}` and `src/pages/designer/playtest-fitted.test.tsx` change.
- **The other games.** `npx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes 8 files and 100 tests. Rent Day asserts its 108 examples.
- **Task 3's targets exist:**
  - the handoff's item 3 (l.13);
  - the "Rule readings" 1a line (l.33);
  - "Notes carried to later pre-flights" (l.19);
  - notes-for-6's "From 5-2b's final review" first bullet (l.12);
  - 8-2a l.759 and l.210 name the removed line.
- **README.** It says "243 examples", which stays true.
