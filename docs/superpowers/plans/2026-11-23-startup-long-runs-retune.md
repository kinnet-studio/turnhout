# Startup Simulator Long Runs Retune Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- The actions phase waits for the player to end their actions, so a free action can still be taken at 0 (rulebook l.172–173: free actions "can be done at any time during your Action Phase (Phase C)").
- The long runs' auto-player is retuned so that all 20 games Launch. At HEAD 11 do.
- Every required key is held by at least 2 games, or is pinned by an arranged test.
- Startup's test file stays under its 30 s watch, aiming for 20 s or less of test time.

**Architecture:**
- **D1 is one rules line.**
  - The end button's Then gains `Go to engine.`, and `When they have less than 1 action, go to engine.` goes.
  - No language change is needed: a button's Then may already go to a phase. The four rewritten examples and the other 239 pass, with no diagnostics.
  - This reverses slice 1a's recorded call "a turn moves on by itself at 0 AP" (spec `2026-10-16-startup-slice-1a-table-money-turns-design.md` l.69; handoff "Rule readings" l.33). Task 3 updates the handoff.
- **Task 1 leaves every long-run game as it is at HEAD.**
  - At 0 actions the auto-player presses the end before any free move.
  - Measured: all 20 games end with HEAD's scores, HEAD's moves (end presses aside) and HEAD's card layout.
  - Task 2 then lets the free moves run at 0 too, as part of the retune. On its own that change drops "the Engineer paid 1 in the ops team" to 0 games (measured), so it can't land in Task 1.
- **D2 and D3 are test-side only.**
  - Rule 4-2 allows steering "beyond a task's brief when the rules alone would leave a tallied path unreached". No rules line changes for them.
  - The changes:
    - a Launch first at the first action;
    - a seed idea first for a researching seat until its first product;
    - the bench's makers of a colour the first open project lacks are assigned to it (a project with a cut first);
    - the agency row's Diva is hired onto a project;
    - a fix for the cycle's recruit, which only ever recruited a Junior Software Dev.
  - Three keys move to "counted, not required", each pinned by its examples and by a test: two new arranged tests and 6-1's 2-player seed-4 test.
- **D4 needs no change.**
  - The shared 2-player runs are already memoized (`twoPlayerGames`, commit 656d6eb, 5-2b). The long run, the replay test and the view test share them; the view test plays only its viewed game.
  - Measured after the retune: 19.04 s best of 3, against 13.34 s for BASE on the same machine.
  - Task 3 re-measures this as a gate.

**Tech Stack:** TypeScript, vitest, the Startup rules language.

**Inputs:**
- the rulebook, l.172–173;
- `docs/superpowers/notes/2026-10-19-startup-handoff.md`, item 3;
- `docs/superpowers/notes/2026-10-19-startup-notes-for-6-preflight.md`, "From 5-2b's final review";
- rule 4-2.

## Global Constraints

- **Branch:** develop on `claude/peaceful-curie-rdfkow`.
- **Commits:** commit by pathspec, never `git add -A`. Every commit message ends with the two lines
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
  and contains no model identifiers.
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi, react or DOM in `src/engine/core/**`, and no `Math.random` or `Date.now`. State stays Json-only under `lang:*` keys. Replay stays exact.
- **Other games:** Hearts, Color Match, Venom and Rent Day are unchanged, and Rent Day keeps its 108 examples.
- **No Startup words in shared code:** use the banned-word regex of plan 6-1, Task 5 Step 5's first check (`docs/superpowers/plans/2026-10-16-startup-slice-6-1-language.md`). This plan changes no shared code; the only file it touches under `src/pages` is a test, and the regex finds nothing in its added lines (measured).
- **Numbers:** every number in the rules comes from the rulebook. This plan adds none.
- **Startup's example count stays 243.**
- **Tests:**
  - Existing test lines change only where this plan names them.
  - Every tally change is explained by the retune, never loosened to pass.
  - Every invariant still runs after every move; nothing is sampled.
- **Language:** none of this needs a change in `src/engine/core/lang/**`. If one turns out to be needed, it stays game-neutral, and you stop and report first.
- **Timing:** measure the Startup test file best of 3, alternating with BASE (e942193, the same code as 153cf28), before and after Tasks 1 and 2, and report both. "Time" is the `tests` figure on vitest's Duration line, not the wall Duration.
- **Controller amendment (2026-11-23, after the pre-flight, `.superpowers/sdd/…/preflight.md` R1–R8):** the task text below already carries each ruling.
  - R1: Task 2's ops-team hire test fails at Task 1 and passes from Step 3's recruit fix on; the bench-discard test passes at Task 1.
  - R2: the two "first seed" comments get the exact words in Task 2 Step 7.
  - R3: the four counted keys the retune brings to 2 or more games become required (the plan's own rule for secondary measures): `REASSIGN_TO_PRODUCT`, `HIRE_SCOUTED_TO_PRODUCT`, `EXPERIENCED_PAID`, `BADGED_LEADING`. Required keys: 95. Three comments the retune makes false are corrected.
  - R4: time is the `tests` figure; a time over 20 s and under 30 s takes Task 3's record-and-go-on branch.
  - R5: 7-2b's and 8-2a's later plans rely on the turn moving on at the last action; Task 3 notes both.
  - R6: Step 7's lists are completed. R7: Step 5 builds the first action's ideas only at the first action (same games, faster). R8: small text points.

## Review Focus

1. **A human at 0 AP has no obvious way to end the turn on the page.**
   - The actions hint now names Training among the free actions (its button has no cost line) and ends "End your actions when you are done.", and it stays on the status line at 0.
   - The new Startup test checks three things:
     - the page's view allows the end button and a Greenlight at 0;
     - it greys a recruit with "they have at least 1 action";
     - nothing moves on until the end is pressed.
   - `playtest-fitted.test.tsx`'s round presses "End your actions" at 0 through the real page, twice.
   - Check that the end button is not greyed and is easy to find at 0.
2. **The auto-player loops forever without pressing "end".**
   - Every press `choose` makes in the actions phase either spends an action (every paid button has a cost line) or is the end.
   - The free moves run at most once a turn each.
   - `playTurn` now throws if the seat is still in its actions after `ACTIONS_EACH_TURN + 1` presses.
   - `MAX_TURNS` still bounds a game.
   - Check that the guard fires before any free move, and that no free move can be offered twice in a turn.
3. **A steering rule hides a rules bug.**
   - Every steered press goes through `choose`, so the engine accepts it or it is skipped. Every invariant still runs after every move.
   - Two paths the long runs reached at HEAD are no longer reached:
     - the bench cleanup's discard (in all 5 games at 5 players);
     - the agency row's hire to the ops team (2 players, seed 4).
   - Each is now pinned by an arranged auto-player test and by its examples.
   - Check that neither driver goes round a press the rules should refuse:
     - `hireDiva` uses the agency hire onto a project, whose cost and money checks stay the rules';
     - `makersToProject` uses the bench assign, which the Stalled check and the Efficient card already shape.
4. **Replay or undo with the new end press.**
   - Every long-run log now holds an end press per turn: 700 in all after the retune, 530 at Task 1.
   - These tests replay or undo across them, and all pass:
     - the 2-player replay test (`loadLog`, then undo of the last move);
     - the 3-player undo tests (every move taken back);
     - the view test (equal logs).
   - The 3-player seed-1 test now runs until a recruit and a research (52 moves), not 40.
   - The new Task 1 test undoes the end and then the Greenlight, and checks the actions phase at 0 with the end and the Greenlight allowed again.
   - Check that undo of an end press gives back the actions phase at 0, with the free actions still offered.

## Measured numbers

**Launches.** Every number below comes from the probes listed under Probe evidence.

| Run | Launches | Games with a Launch | 2p (seeds 1–5) | 3p | 4p | 5p |
|---|---|---|---|---|---|---|
| HEAD | 23 | 11/20 | 1 3 1 2 0 (4/5) | 0 2 0 4 1 (3/5) | 0 0 0 2 1 (2/5) | 0 3 0 3 0 (2/5) |
| Task 1 (D1, end at 0 first) | 23 | 11/20 | as HEAD | as HEAD | as HEAD | as HEAD |
| D1, free moves at 0, no steering | 23 | 11/20 | as HEAD | as HEAD | as HEAD | as HEAD |
| After Task 2 | 60 | 20/20 | 5 4 2 5 2 (5/5) | 2 4 3 6 2 (5/5) | 1 3 1 3 4 (5/5) | 1 1 2 6 3 (5/5) |

**Game length.**
- Moves:
  - The 2-player games: 720 at HEAD (89, 213, 81, 261, 76) and 1180 after the retune (231, 231, 193, 329, 196).
  - All 20 games: 3051 with D1 and free moves at 0, and 4318 after the retune.
- Turns: 530 at D1 and 700 after the retune. Every turn ends with an end press.
- Brainstorms: 186 at D1 and 223 after the retune.

**Why Board play was low** (measured at D1, before any steering):
- **Odd seeds play short games.** Seats that research take growth ideas at t % 4 ∈ {0, 2}, so their games run 15–20 turns, only 3–4 turns a seat at 4–5 players.
  - 8 of the 9 games with no Launch are odd seeds.
  - A Tier 1 card needs at least 4 cubes, and a Junior makes 1 a turn.
- **Tier 2 and 3 cards stall.** 45 were greenlit and 1 launched; 93 Stalled projects reached the Engine.
- **Assigns to a project are rare.** They are 1 action in the cycle's 9 (action 3), and the Brainstorm at `(t + a) % 5 === 2` comes before the Board.
- **Pivots outnumber Launches.** There were 121 pivots against 23 Launches; 98 of them were of a project with no cubes and no staff.
- **Action 0 always recruits the Software Dev.** It recruits `RECRUITS[(t + a) % 3]` when `(t + a) % 9 === 0`, which always gives a Junior Software Dev.
- **A seat that could Launch at its first action drafts first.**

**What each steering change added**, cumulative, as Launches, games with a Launch and required keys held by fewer than 2 games:

| Variant | Launches | Games | Keys short |
|---|---|---|---|
| makers to the first open project | 47 | 17/20 | – |
| + seed first while researching, + the recruit fix | 55 | 20/20 | 6 |
| + a Launch first at a = 0 | 63 | 20/20 | 6 |
| + a project with a cut first | 64 | 20/20 | 5 |
| + the Diva's hire (this plan) | 60 | 20/20 | 3 |

- The 3 keys still short at the end are the bench's discard (0), the agency row's hire to the ops team (0) and the reshuffle (1, at 2p s4).
- **Tried and dropped:**

  | Variant | Launches | Games | Why dropped |
  |---|---|---|---|
  | a Brainstorm cap of one per 3 turns | 25 | 13/20 | – |
  | seed first plus Tier 1 Greenlights only | 28 | 16/20 | – |
  | an idea gate | 23 | 10/20 | – |
  | pivot only idle projects | 30 | 14/20 | 5 keys short |
  | without the recruit fix | 71–74 | – | the QA recruit falls to 0, and Synergy, the Engineer and the reshuffle fall to 1 game |
  | assigning the Diva to a project | no effect | – | she is hired only 5 times in 20 games |

**D3: the keys held by one game at HEAD** (ten; six on 3p s4, as the notes say). Game counts are HEAD → after Task 2.

| Key | HEAD → after | Games after Task 2 |
|---|---|---|
| assign to the ops team | 1 → 5 | 2p s2–s4, 3p s4, 5p s3 |
| a Tier 2 or 3 card launched | 1 → 2 | 2p s4, 3p s4 |
| the Engineer paid $1 in the ops team | 1 → 2 | 2p s4, 4p s4 |
| the Sales Rep's bonus | 1 → 6 | – |
| Sales Seminar on a Sales Rep | 1 → 2 | 2p s4, 4p s4 |
| the Sales Rep's XP bonus | 1 → 2 | 2p s4, 4p s4 |
| the scouting's hire to the ops team | 1 → 3 | – |
| Synergy at the Engine | 1 → 2 | 2p s2, 4p s2 |
| the agency row's hire to the ops team | 1 → 0 | moved, see below |
| the reshuffle | 1 → 1 (2p s4) | moved, see below |

- One more key falls with the retune: the bench's discard, 5 games (all 5-player) → 0. The retuned seats put their makers on projects, so no bench overflows.
- **The three keys that move:**
  - The bench's discard and the agency row's hire to the ops team each get an arranged auto-player test and keep their examples:
    - "the bench is cut to 5, …" (rules l.1303) and "a trained Junior discarded from the bench keeps its tokens, …" (l.3340);
    - "an agency hire may go straight onto the board" (l.1586), which hires the Veteran to the ops team.
  - The reshuffle keeps its examples (l.3927, l.3935) and 6-1's test "leaves no id a seat saw face up … at 2 players seed 4", which asserts that game's one reshuffle.
- After Task 2 the tallies require 91 keys, and none is held by fewer than 2 games. Step 6 then promotes four counted keys the retune brings to 2 or more games (pre-flight R3), so 95.

**Secondary measures** (each reached by at least 2 games would become a required key; none is, so none is added, and none is forced):

| Measure | HEAD | D1 + free moves at 0 | After Task 2 | Why it stays rare |
|---|---|---|---|---|
| a Junior past 2 XP | 0 | 0 | 0 | The most per game is 2 (4 games). A Junior earns XP only at the Launches it works on, and the retuned seats spread their Juniors over 1–6 Launches a game. |
| an Income of $10 or more | 0 | 0 | 0 | The most is $9 (2p s4). A seat runs one or two Tier 1 products at a time. |
| 3 active Tags | 0 | 1 (3p s4) | 0 | The most is 2. |
| a Brainstorm drawing 3 | 0 | 0 | 1 (4p s2) | A PM must be working on the seat's Board when it Brainstorms. |
| a keep press | 0 | 2 (2p s1, 2p s2) | 1 (3p s2) | It needs a Junior with Pending tokens of two colours at a Launch. The arranged test "makes the graduation choices the auto-player picks, …" pins it. |
| a Mentor press | 0 | 0 | 0 | It needs the Veteran in the ops team at such a graduation (same test). |

**Test time** (test time, best of 3, alternating with BASE, same machine):

| Run | Times | Best |
|---|---|---|
| BASE | 14.32, 13.98, 13.34 s | 13.34 s |
| After Task 2 | 20.76, 19.04, 20.07 s | 19.04 s |

- BASE measured 11.52 s best of 3 earlier the same day.
- Task 1 alone measured 14.34 s in one run.
- After Task 2, per test (HEAD in brackets):
  - the long runs at 2 to 5 players: 2.9 / 2.4 / 2.2 / 2.3 s (1.6 / 1.5 / 1.4 / 1.4);
  - the 3-player seed-2 undo test: 2.0 s (1.1);
  - the 4-player Greenlight test: 1.8 s (1.2);
  - the 2-player replay test: 1.4 s (0.76);
  - the view test: 0.45 s (0.40).

## Probe evidence

All probes are under `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/retune/`, in copies made with `git archive HEAD`.

**Copies:**
- `base/` is a clean HEAD.
- `final/` is HEAD plus every edit of Tasks 1 and 2, exactly as this plan gives them. It passes the full suite (120 files, 3777 tests) and typecheck.
- `t1check/` is HEAD plus Task 1 only. It passes the full suite (120 files, 3775 tests) and typecheck.
- `probe-*/` are instrumented copies:
  - `probe-head`: HEAD;
  - `probe-t1`: Task 1;
  - `probe-steer`: the variants, switched by `STEER`;
  - `probe-final`: `final/` instrumented.

**Scripts** (`scripts/`):
- `task1_test.py`, `task1_page.py`, `task2_test.py`, `task2b_test.py` and `task2c_test.py` apply this plan's edits as exact old/new pairs.
- `probe_patch.py` writes per-game tallies, the secondary measures and the required lists to `$PROBE_OUT`.
- `steer_patch.py`, `trace2_patch.py`, `diva_patch.py`, `hirediva_patch.py` and `why_patch.py` hold the variants and traces.
- `run.sh <copy> <label> <STEER>` plays the long runs and calls `analyse.py`.

**Outputs** (`out/`):
- `head.json`/`head.txt`: HEAD.
- `t1.json`/`t1.txt`: Task 1. `res-head.txt` and `res-t1.txt` hold the 20 games' results and move counts without end presses; they are identical.
- `w0.json`/`w0.txt`: D1 with free moves at 0, no steering.
- `c2`, `e3`, `g2`, `h1`–`h4` (`.json`, `.txt`, `.log`): the variants.
- `fin.json`/`fin.txt`: after Task 2, equal to `h4`.
- `final-t1b.log`: the Startup file, green at Task 1.
- `final-t2b.log`: the Startup file, green at Task 2.
- `t1-all.log` and `final-all2.log`: the full suites.
- `task1.diff` and `final.diff`: the whole change against HEAD.

---

### Task 1: The actions phase waits for the player to end their actions (D1)

**Files:**
- Modify: `src/games/startup-simulator.rules`:
  - the actions hint (l.729);
  - the end button (l.1007–1010);
  - four examples (l.1237, l.1381, l.1427, l.1866).
- Modify: `src/games/startup-simulator.test.ts`:
  - the Layoff hand-back test (l.2890);
  - one new test before l.2913;
  - `playTurn` (l.612 and l.1219);
  - four comments (l.1377–1379, l.1591–1592, l.1721, l.2021–2022).
- Modify: `src/pages/designer/playtest-fitted.test.tsx`: the round test (l.240).

- [ ] **Step 1: Write the failing tests.**

  **The page's view at 0.** Add this test right before `it('finds nothing wrong with a whole table: …')` (l.2913), indented as its neighbours (`it(` at 2 spaces more than shown here):

  ```ts
  it('waits at 0 actions with the end button and a Greenlight allowed on the page and a recruit greyed by its cost, and ends the actions only on the seat’s press (rulebook l.172–173, Review Focus)', () => {
    const dating = idOf('Dating App');
    const arranged = arrange({ 'backlog-p0': [dating], 'development-p0': [] }).getState();
    const { engine, runtime } = createEngine(game!, lib, 2, setCounter(arranged, 'actions', 'p0', 0));
    const allowed = () => Object.fromEntries(seatExtras(engine, runtime, engine.getState(), 'p0').actions.map((action) => [action.move, action.allowed]));
    expect(allowed()[END_ACTIONS]).toBe(true);
    expect(allowed()[GREENLIGHT]).toBe(true);
    expect(allowed()[RECRUITS[0]]).toBe('they have at least 1 action');
    expect(engine.dispatch({ type: RECRUITS[0], by: 'p0' })).toMatchObject({ ok: false, reason: 'they have at least 1 action' });
    expect(engine.dispatch({ type: GREENLIGHT, by: 'p0', cardId: dating }).ok).toBe(true);
    expect(engine.getState().turn).toMatchObject({ current: 'p0', phase: 'actions' });
    expect(allowed()[END_ACTIONS]).toBe(true);
    expect(engine.dispatch({ type: END_ACTIONS, by: 'p0' }).ok).toBe(true);
    expect(engine.getState().turn).toMatchObject({ current: 'p1', phase: 'actions' });
    // Undo of the end gives back the actions at 0 with the end still allowed, and undo of the Greenlight gives it back too (Review Focus 4).
    engine.undo();
    expect(engine.getState().turn).toMatchObject({ current: 'p0', phase: 'actions' });
    expect(counterOf(engine.getState(), 'actions', 'p0')).toBe(0);
    expect(allowed()[END_ACTIONS]).toBe(true);
    engine.undo();
    expect(allowed()[GREENLIGHT]).toBe(true);
  });
  ```

  **The Layoff hand-back test** (l.2890).
  - Rename it to `'hands the turn back to the actions at 0 once the cards a Layoff with the last action found are passed on, and the turn goes on to the next player once the seat ends its actions (Review Focus)'`.
  - Replace its two lines `expect(passed.turn).toMatchObject({ current: 'p1', phase: 'actions' });` and `expect(counterOf(passed, 'actions', 'p1')).toBe(ACTIONS_EACH_TURN);` with:

  ```ts
      // Free actions may still be taken at 0, so the turn waits on the seat (rulebook l.172–173).
      expect(passed.turn).toMatchObject({ current: 'p0', phase: 'actions' });
      expect(counterOf(passed, 'actions', 'p0')).toBe(0);
      expect(engine.dispatch({ type: END_ACTIONS, by: 'p0' }).ok).toBe(true);
      const ended = engine.getState();
      expect(ended.turn).toMatchObject({ current: 'p1', phase: 'actions' });
      expect(counterOf(ended, 'actions', 'p1')).toBe(ACTIONS_EACH_TURN);
  ```

  Its scouting, agency-row and job-market lines stay as they are.

  **The page's round** (`playtest-fitted.test.tsx` l.240).
  - After the three recruits' `expect(lineOf(S)).toBe(…)`, and before `expect(status()).toBe(… hint('bench cleanup') …)`, add:

    ```ts
        // At 0 actions the turn waits on the seat, which may still take a free action, until it ends its actions (rulebook l.172–173).
        expect(status()).toBe(`seat: ${S} — Your turn — ${hint('actions')}`);
        press('End your actions');
    ```

  - After N's `press('Keep a card in your research'); pickFirst();`, `selected(`${T} — to act`);` becomes `selected(`${N} — to act`);`.
  - After the `expect(lineOf(N)).toContain('0 actions, …')` line that follows, add:

    ```ts
        press('End your actions');
        selected(`${T} — to act`);
    ```

- [ ] **Step 2: Run them.** Run `npx vitest run src/games/startup-simulator.test.ts src/pages/designer/playtest-fitted.test.tsx`. Measured against HEAD's rules, these fail:
  - The new test fails at its first `allowed()[END_ACTIONS]`: HEAD passes the turn on as soon as the engine starts at 0, and the view answers "It's p1's turn.".
  - The Layoff test receives `{ current: 'p1', phase: 'actions' }`.
  - The page round's status already shows the bench-cleanup hint.

  The examples still pass.

- [ ] **Step 3: Change the rules.**

  **The end button** (l.1007–1010):

  ```text
    A player may end their actions.
      Then:
        Their actions go back to 0.
        Go to engine.
  ```

  The line `  When they have less than 1 action, go to engine.` goes. `Their actions go back to 0.` stays, so an end pressed with actions left leaves 0 (`keepsTheBudget` reads that).

  **The hint** (l.729) becomes:

  ```text
    Hint: Spend 3 actions on hiring, drafting, research and your board. Greenlighting, Training and dismissing cost no actions, though a product may need Licenses. Press a button, then pick the cards. End your actions when you are done.
  ```

  **The examples that relied on the automatic end** (the count stays 243):
  - **"a turn has 3 actions"** (l.1237) pinned the automatic end. It now pins the new rule.
    - Its new title is `Example: a turn has 3 actions, and at 0 the free actions are still there until the player ends their actions (section 6)`.
    - After `Given p0's bench has …`, add `  And p0's backlog has a Dating App`.
    - Replace its `  And the phase is bench cleanup` line with these lines. The example's last two lines (`And it is p0's turn` and the bench line) stay after them:

      ```text
        And the phase is actions
        And it is p0's turn
        When p0 recruits a junior software dev
        Then it is rejected because "they have at least 1 action"
        When p0 greenlights the Dating App
        Then it is accepted
        And p0 has 0 actions
        And p0's development has a Dating App
        And the phase is actions
        When p0 ends their actions
        Then it is accepted
        And the phase is bench cleanup
      ```

  - **"research with the last action keeps a card, then the turn goes on through cleanup to the next player (ruling 18)"** (l.1381): `  And it is p1's turn` becomes

    ```text
      And the phase is actions
      And it is p0's turn
      When p0 ends their actions
      Then it is p1's turn
    ```

  - **"the open idea pool costs 2 actions (section 14)"** (l.1427): its last line, `  And it is p1's turn`, becomes `  When p0 ends their actions` and `  Then it is p1's turn`.
  - **"sourcing from an empty talent deck with the last action reveals nothing, and the turn goes on (this slice's call)"** (l.1866): `  And it is p1's turn` becomes

    ```text
      And it is p0's turn
      When p0 ends their actions
      Then it is p1's turn
    ```

- [ ] **Step 4: Change the auto-player.** Keep Task 1's games as HEAD's.

  **The actions branch** (l.1219). Right after `} else if (phase === 'actions') {`, add:

  ```ts
        // Each press below spends an action or ends them, so a seat still in its actions after 3 presses and the end didn't end them.
        if (a > ACTIONS_EACH_TURN) throw new Error(`${by} at t = ${t}: still in its actions after ${a} presses`);
        // At 0 actions it ends them at once, as the phase used to by itself, so the games are the ones played before (Task 1).
        const free = counterOf(engine.getState(), 'actions', by) > 0 ? freeMove() : null;
  ```

  This replaces `const free = freeMove();`. Task 2 removes the 0-action gate again.

  **The doc comment** (l.612). `*   lacking the Junior of kind `(t + a) % 3`, else ends its actions.` gains a second sentence on a new comment line:

  ```text
   *   lacking the Junior of kind `(t + a) % 3`, else ends its actions. At 0 actions the rules refuse every press but the free ones and
   *   the end, and it ends its actions there at once: the phase no longer ends by itself (rulebook l.172–173).
  ```

  **The four comments that said a move spending the last action starts the next turn.** Each now says the end does.
  - l.1378–1379: `A move that spends the last action runs the Engine and may then start the next turn` becomes `The end of a seat's actions runs the Engine and may then start the next turn` (re-wrap the two lines).
  - l.1591: `// A move that spends the last action starts the next turn,` becomes `// The end of a seat's actions may start the next turn,`.
  - l.1721: `since a move that spends the last action starts the next turn,` becomes `since the end of a seat's actions may start the next turn,`.
  - l.2021–2022: `A move that spends the last action starts` / `// the next turn,` becomes `The end of a seat's actions may start` / `// the next turn,`.

- [ ] **Step 5: Verify.**
  - **The tests:**
    - `npx vitest run src/games/startup-simulator.test.ts` passes 94 tests (measured), with 243 examples and every tally list and comment unchanged.
    - `npx vitest run` passes 120 files and 3775 tests (measured).
    - `npx tsc --noEmit` passes.
  - **The games are HEAD's** (measured: the 20 results, the move counts without end presses and the card layouts equal HEAD's). Only the end presses are new: 530 of them, one a turn.
  - **The tally probe sees one difference.** At 3 players seed 4 it counts one Bug added and one cleaned, now that the end runs the Engine as its own move. No test reads that difference.
  - **Plan 6-1's checks:** run the five checks of Task 5 Step 5 against BASE.
    - The banned-word check prints nothing.
    - The protected-files and pure-core checks print nothing.
    - The removed-test-lines check prints only the lines named above.
  - **The other games:** `npx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, with Rent Day's 108 examples.
  - **Time:** time the Startup file, best of 3, alternating with BASE.

- [ ] **Step 6: Commit.**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/playtest-fitted.test.tsx
git commit -m "fix(games): Startup Simulator's actions phase waits at 0 actions until the player ends them, so a free action can still be taken (rulebook l.172–173)

The end button now goes to the Engine itself, and the line that ended the phase at 0 actions goes; this reverses slice 1a's call that a turn moves on by itself at 0. The examples that relied on it press the end, and 'a turn has 3 actions' pins the new rule. The auto-player ends its actions at once at 0, so the long runs play the same games.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC"
```

### Task 2: The auto-player builds what it greenlights, and every required key is held twice (D2, D3)

**Files:**
- Modify: `src/games/startup-simulator.test.ts`. The HEAD line numbers below shift with Task 1.
  - In `playTurn`:
    - the doc comment (l.570, l.586–587, l.593);
    - two new helpers before l.1053;
    - `boardAction` (l.1126–1131);
    - the actions branch (l.1219–1232).
  - Four tests:
    - l.3273, the 3-player seed-1 undo test;
    - l.3610, the QA reassign test;
    - l.3042, the every-move tally;
    - l.3161, the Strategy tally.
  - Two new tests before l.3952.
  - The re-counted comments: l.1034–1035, l.3073–3076, l.3106–3108, l.3132–3134, l.3156–3157, l.3186–3188, l.3530–3531.
  - The four promoted keys (Step 6) and the comments the retune makes false (Step 7): l.3053–3058, l.3141, l.3149–3155, l.3170–3178, l.3193–3194, l.3302–3303, l.3718–3719.

**Interfaces:** none. Everything is inside the test file.

- [ ] **Step 1: Write the failing tests.** Add these two right before `it('hires the card a Layoff found onto its first product while it has one, …')` (l.3952).

  ```ts
      it('hires the agency row’s first Senior it can pay for to the ops team when it can’t go to a product, through the page’s view and without it (§13.A, ruling 20)', () => {
        // The retuned long runs never make this hire (D3). Here t = 8, so the turn's third action, a = 2, is action 1 at place 2 with
        // ⌊t / 9⌋ even, and the seat runs a To-Do List, which the Veteran doesn't attach to, with $13, no project and an empty bench.
        const seats = seatsFor(2);
        const veteran = idOf('Veteran');
        const arranged = arrange({
          'operations-p0': [idOf('To-Do List')], 'backlog-p0': [], 'development-p0': [], 'bench-p0': [],
          'agency-row': ['Veteran', 'Architect', 'Engineer', 'Fixer'].map(idOf),
        }).getState();
        const state = setCounter(arranged, 'capital', 'p0', 13);
        const logs = [false, true].map((throughView) => {
          const { engine, runtime } = createEngine(game!, lib, 2, state);
          playTurn(engine, 8, 'drafts', keepsTheRules(seats, runtime), (log) => log.some((move) => move.type === HIRE_AGENCY_TO_OPS), runtime,
            throughView);
          return engine.getLog();
        });
        expect(logs[0].map((move) => move.type)).toEqual([DRAFT_GROWTH, RECRUITS[2], HIRE_AGENCY_TO_OPS]);
        expect(logs[0].at(-1)).toEqual({ type: HIRE_AGENCY_TO_OPS, by: 'p0', cardId: veteran });
        expect(logs[1]).toEqual(logs[0]);
      });

      it('discards the bench’s first card at the bench cleanup once it ends its actions with more than 5 there, through the page’s view and without it (rulings 10 and 12)', () => {
        // The retuned long runs never overflow a bench (D3). Here the bench holds 6 cards and the seat has no project, so at t = 2 it
        // drafts its idea, recruits twice and ends its actions with 8 on the bench.
        const seats = seatsFor(2);
        const bench = ['Hacker', 'Architect', 'Veteran', 'Engineer', 'Fixer', 'HR Manager'].map(idOf);
        const state = arrange({ 'bench-p0': bench, 'backlog-p0': [], 'development-p0': [] }).getState();
        const logs = [false, true].map((throughView) => {
          const { engine, runtime } = createEngine(game!, lib, 2, state);
          playTurn(engine, 2, 'drafts', keepsTheRules(seats, runtime), (log) => log.some((move) => move.type === DISCARD_BENCH), runtime,
            throughView);
          return engine.getLog();
        });
        expect(logs[0].map((move) => move.type)).toEqual([DRAFT_GROWTH, RECRUITS[0], RECRUITS[1], END_ACTIONS, DISCARD_BENCH]);
        expect(logs[0].at(-1)).toEqual({ type: DISCARD_BENCH, by: 'p0', cardId: bench[0] });
        expect(logs[1]).toEqual(logs[0]);
      });
  ```

  - The bench-discard test passes at Task 1. The ops-team hire test fails at Task 1 on its second move: at t = 8, a = 1, the cycle's recruit is still `recruit(a)` = `RECRUITS[0]`, the Junior Software Dev, where the test expects Step 3's `RECRUITS[2]`. It passes from Step 3 on (measured). Both pin presses the retune is about to stop reaching in the long runs, so they go in first.
  - Run `npx vitest run src/games/startup-simulator.test.ts -t "first Senior it can pay for to the ops team|bench’s first card at the bench cleanup"`.
  - D2's failing check is the probe, not a test line. With Task 1's auto-player the long runs Launch in 11 of 20 games; the target is at least 18, and this plan measures 20 of 20 with 60 Launches. No test asserts the Launch count. The tallies and the tests that name seeds are what the retune must keep.

- [ ] **Step 2: Let the free moves run at 0.** In the actions branch, `const free = counterOf(engine.getState(), 'actions', by) > 0 ? freeMove() : null;` and its comment line above become `const free = freeMove();`. The throw stays.

- [ ] **Step 3: The recruit fix.**
  - In `boardAction`, `case 0:` `return recruit(a);` becomes `return press(RECRUITS[(t + Math.floor(t / 9)) % 3]);`.
  - `boardAction` no longer uses `a`, so drop the parameter. Its doc line becomes `/** The move the action numbered `action` makes, or null when it has nothing to pick (see above). */`, and its signature becomes `const boardAction = (action: number): Move | null => {`.
  - The two calls in the actions branch become `boardAction(action)` and `boardMovesAfter(action).map((next) => boardAction(next))`.
  - The doc comment's line `*   0. recruit the Junior of kind `(t + a) % 3`;` becomes `*   0. recruit the Junior of kind `(t + ⌊t / 9⌋) % 3` (`(t + a) % 3` is 0 whenever `(t + a) % 9` is);`.

- [ ] **Step 4: The two drivers.** Add them right before `/** Whether this turn has moved a card from one product to another. */` (l.1053):

  ```ts
    /**
     * The agency row's Diva, hired onto the seat's first project when it can pay for her: the cheapest Senior (§20.B.1), whom the cycle's
     * hire seldom reaches, so the Diva's Ego and her firing by a pivot are seen in more than one game (D3).
     */
    const hireDiva = (): Move | null => {
      const diva = (row: CardState[]) => row.find((card) => isDiva(card) && canPay(card));
      if (diva(cards('agency-row')) === undefined || cards(own('development')).length === 0) return null;
      return pick(HIRE_AGENCY_TO_PROJECT, 'agency-row', diva, onProject());
    };
    /**
     * The bench's makers of a colour the seat's first open project lacks, assigned to it: a project with a cut first, else the first one,
     * passing over a Stalled project, whose makers make nothing until it has its leads (§3). An Efficient card stays on the bench. Null with
     * no such project or no such maker (D2: a project left waiting for its makers is what kept Launches down).
     */
    const makersToProject = (): Move | null => {
      const open = (project: CardState) => lacks(project).length > 0 && runtime.workedFlag(engine.getState(), project.id, 'stalled') !== true;
      const projects = cards(own('development'));
      const project = projects.find((candidate) => open(candidate) && isCut(candidate)) ?? projects.find(open);
      if (project === undefined) return null;
      const makes = (card: CardState) => !efficient(card) && lacks(project).includes(COLOR_OF_SKILL[card.data?.skill as string]);
      return pickSome(ASSIGN_TO_PROJECT, own('bench'), (bench) => bench.filter(makes),
        onProject((targets) => targets.find((target) => target.id === project.id)));
    };
  ```

- [ ] **Step 5: The actions branch.** `const planned = a === 0 ? ideation() : [ …, divaToOps(), brainstorming(a), ...board(), ];` becomes:

  ```ts
        // A seat that researches takes a seed idea first until it runs a product: a Tier 1 card is the one it can build (D2).
        const ideas = () => (style === 'researches' && cards(own('operations')).length === 0
          ? [press(RESEARCH_SEED), first(DRAFT_SEED, 'seed-market'), ...ideation()]
          : ideation());
        const planned = a === 0 ? [launch(), ...ideas()] : [
          reassignDiva(), launch(), qaForBugs(), hireGrowthHacker(action), hireHacker(), moveGrowthHacker(), pmToProject(), pivotDiva(),
          divaToOps(), hireDiva(), makersToProject(), brainstorming(a), ...board(),
        ];
  ```

  - `ideas` is a function, so the first action's list is built only at the first action, as HEAD built `ideation()` (pre-flight R7: the same games, about 0.7 s less).
  - `hireDiva` comes after the PM's and the Diva's drivers.
  - Put before `pmToProject`, it took the arranged QA reassign test's action 5 (measured). After it, that test still needs Step 6's row change.

- [ ] **Step 6: Change the lines the retune moves.**
  - After Steps 2–5, exactly three tests fail (measured): the 3-player seed-1 undo test, the QA reassign test, and the every-move tally, which never sees `DISCARD_BENCH` or `HIRE_AGENCY_TO_OPS`.
  - The Strategy tally still passes, since the reshuffle is still held by 2p s4. Its key moves for D3, because one game is not two.
  - **The 3-player seed-1 undo test** (l.3273). The retuned seats put their makers on projects before they recruit, so the first recruit comes at move 52 (index 51; the first research is at index 1). Its `playGame(…, { moves: 40 })` and the two `toHaveLength(40)` lines become:

    ```ts
          // The retuned seats put their makers on projects before they recruit, so the first recruit comes at move 52 (it was within 40).
          const both = (log: readonly Move[]) => log.some((move) => RECRUITS.includes(move.type))
            && log.some((move) => move.type === RESEARCH_SEED || move.type === RESEARCH_GROWTH);
          const engine = playGame(3, 1, (_before, _move, after) => states.push(after), { until: both });
          const log = [...engine.getLog()];
          expect(log).toHaveLength(52);
          expect(states).toHaveLength(52);
    ```

  - **The QA reassign test** (l.3610). Its agency row `['Architect', 'Veteran', 'Diva', 'Engineer']` becomes `['Architect', 'Veteran', 'Fixer', 'Engineer']`. Its comment says "The agency row holds Seniors no planned hire takes", and the Diva is a planned hire now (measured: with her there, the seat hires her instead of the reassign).
  - **The every-move tally** (l.3042).
    - `DISCARD_BENCH` leaves the slice 1a line and `HIRE_AGENCY_TO_OPS` the Board's line, so the lines become `RESEARCH_SEED, RESEARCH_GROWTH, KEEP, END_ACTIONS, DISCARD_BACKLOG,` and `HIRE_AGENCY_TO_PROJECT, GREENLIGHT, ASSIGN_TO_PROJECT, ASSIGN_TO_OPS,`.
    - Its "Counted, but not required" list ends, after the graduation bullet (whose `.` becomes `;`), with:

      ```ts
            // - the bench's discard: the retuned seats put their makers on projects first, so no bench overflows (the retune's D3) ('discards
            //   the bench’s first card at the bench cleanup once it ends its actions with more than 5 there, …');
            // - the agency row's hire to the ops team: a seat with a product hires onto it, and the cycle seldom comes to the hire while one
            //   without has a Senior's price (the retune's D3) ('hires the agency row’s first Senior it can pay for to the ops team when it can’t
            //   go to a product, …').
      ```

  - **The four counted keys the retune brings to 2 or more games become required** (pre-flight R3; the same rule as the secondary measures). Each keeps its examples and its arranged test; its "Counted, but not required" bullet goes (for `BADGED_LEADING`, only its part of the bullet), and Step 7 names its holders.
    - The every-move tally: `REASSIGN_TO_PRODUCT` (3 games: 2p s1, 3p s2, 3p s4) and `HIRE_SCOUTED_TO_PRODUCT` (2 games: 2p s1, 2p s4) join slice 4's line, which becomes `ASSIGN_TO_PRODUCT, HIRE_AGENCY_TO_PRODUCT, REASSIGN_TO_PRODUCT, HIRE_SCOUTED_TO_PRODUCT,`, and the comment above it gains `, and the reassign and the scouting's hire onto one` before `.`.
    - The talent tally: `EXPERIENCED_PAID` (3 games: 3p s2, 4p s5, 5p s4) joins `paths` after `SALES_BONUS`.
    - The Strategy tally: `BADGED_LEADING` (5 games: 2p s1, 2p s4, 3p s4, 4p s1, 5p s5) joins `paths` before `SALES_XP_BONUS`, and its bullet becomes `// - Bug Decay stopped by a QA Engineer or waived by a VP of Sales: each needs one Training card, or two, on one card that then works where it matters;` (re-wrapped).
  - **The Strategy tally** (l.3161).
    - `RESHUFFLED` leaves `paths`, whose first line becomes `` `${BRAINSTORM_DRAWING} 2`, DISCARDED_AT_CLEANUP, ``.
    - Its "Counted, but not required" list gains this first bullet:

      ```ts
            // - the reshuffle: only 2 players seed 4 runs its Strategy deck dry, and 'leaves no id a seat saw face up in the strategy discard in
            //   the strategy deck, …' below pins its one reshuffle there (the retune's D3);
      ```

- [ ] **Step 7: Re-count the comments that name games** (measured in `out/fin.json`). In the code comments, each line keeps its tally test's closing `A failure here means a cadence moved: retune the auto-player, never the rules.`

  | Where | New text |
  |---|---|
  | The every-move tally (l.3073–3076) | Held by two games each, the fewest: the agency row's hire to the bench (3 players seed 3, 4 players seed 4) and the scouting's hire onto a product (2 players, seeds 1 and 4); by three each: the scouting's hire to the ops team (2 and 3 players seed 4, 5 players seed 3) and the reassign from one product to another (2 players seed 1, 3 players seeds 2 and 4); by four: the scouting's hire to the bench (3 players seeds 2 and 4, 4 players seed 2, 5 players seed 4); by five each: the assign to the ops team, the assign onto a product and the agency row's hire onto a product; the ops team's let go by eight, and the ops check's switch on by seven and its confirm by thirteen. |
  | Slice 3 (l.3106–3108) | Held by two games each, the fewest: a Tier 2 or 3 card launched and a project launched with a cut (2 and 3 players, seed 4), and the Engineer paid $1 in the ops team (2 and 4 players, seed 4); by three: Cut 2 red (2 players seed 4, 3 and 4 players seed 2); by four: Cut 1 of each (2 and 3 players seed 4, 4 players seeds 2 and 4); by six each: a cut chosen among options, and the Diva refused a reassign from a project and fired by a pivot (2 and 3 players seeds 1 and 3, 4 and 5 players seed 3). |
  | Slice 4 (l.3132–3134) | Held by three games, the fewest: a mode forgotten on a bench (2, 3 and 4 players, seed 2); by six: a mode declared QA (2 players seeds 2 and 4, 3 players seeds 3 and 4, 4 and 5 players seed 2); an offline product at Income by thirteen. |
  | Slice 5's talent (l.3156–3157) | Held by two games, the fewest: Synergy at the Engine (2 and 4 players, seed 2); by three: an experienced Junior paid (3 players seed 2, 4 players seed 5, 5 players seed 4); the Sales Rep's bonus by six. |
  | Slice 5's Strategy (l.3186–3188) | Held by two games each, the fewest: Sales Seminar on a Sales Rep and the Sales Rep's XP bonus (2 and 4 players, seed 4); by three: a trained Junior declared red (2 players seed 3, 5 players seeds 1 and 3); by five: a badged Junior leading at the Engine (2 players seeds 1 and 4, 3 players seed 4, 4 players seed 1, 5 players seed 5). |
  | The 2-player replay test (l.3530–3531) | The declarations are in every seed, the reshuffle in seed 4 only, and a final-check switch-off is the last move taken back in seeds 1 to 3. |
  | `hireGrowthHacker`'s doc (l.1035) | "off the long runs' only Cut 2 red" becomes "off what was then the long runs' only Cut 2 red". |

  - **The two "first" comments** are false after the retune (pre-flight R2: 2p seed 1 now has two Greenlights that ask a choice; 3p seed 1 makes all four moves by its 116th). They become:
    - the view test (HEAD l.3193–3194):
      ```ts
            // Seed 2 has a Greenlight that asks a choice (a cut, Cut 2 blue), which the view must list for the card. The game played without
            // the view is the long run's, which plays seed 2 so.
      ```
    - the 3-player seed-2 undo test (HEAD l.3302–3303):
      ```ts
            // Seed 2 makes all four by its 83rd move, the soonest of the 3-player seeds 1 to 5 (seed 1 takes 116).
      ```
  - **Comments the retune makes false** (pre-flight R3; these keys stay counted, each held by one game):
    - the talent tally's Agile spare bullet (HEAD l.3149): `which the runs never play (P8)` becomes `which the runs play once (4 players seed 2, P8)`;
    - the Strategy tally's Milestones bullet (HEAD l.3177–3178): `and none both sides of the stack` becomes `and only 2 players seed 4 runs both sides of the stack (Full Stack Founder, once)`;
    - the Training `it.each` (HEAD l.3718–3719): `spend their QA Certifications and Masterclasses on Juniors, which are nearly always there to take them, and no seat holds a Junior PM as an Agile Workshop comes (plan 5-2b's P8)` becomes `spend their QA Certifications and Masterclasses on Juniors, which are nearly always there to take them (a Masterclass reaches a QA Engineer once, at 4 players seed 4), and a seat seldom holds a Junior PM as an Agile Workshop comes (once, at 4 players seed 2; plan 5-2b's P8)` (re-wrapped).
  - Measured but unchanged: the 4-player Greenlight test still needs seeds up to 7.
  - The replay comment's "none a keep or Mentor press" still holds; the one keep is at 3p s2.

- [ ] **Step 8: Update the doc comment.**
  - In the sentence Task 1 added, `and it ends its actions there at once` becomes `so once the free moves are made it ends its actions there`.
  - "The first action" starts: `launches the first project the engine takes (see `launch`), else it is an Ideation. A seat that researches and runs no product yet first researches the seed deck, else drafts the seed market's first card, since a Tier 1 card is what it can build (the retune's D2). Else the Ideation goes by `t % 4`: …`
  - In "Each later action", after the Diva's assign to the ops team, add `Else it hires the agency row's Diva onto its first project when it can pay for her (see `hireDiva`). Else it assigns the bench's makers of a colour its first open project lacks, a project with a cut first, to that project (see `makersToProject`).`

- [ ] **Step 9: Verify.**
  - **The Startup file:** `npx vitest run src/games/startup-simulator.test.ts` passes 96 tests (measured), with 243 examples.
  - **The suite:** `npx vitest run` passes 120 files and 3777 tests (measured). `npx tsc --noEmit` passes.
  - **The tallies** (re-run the probe if you can: `scripts/probe_patch.py` on a copy, then `run.sh <copy> <label> ""`):
    - 60 Launches; 20 of 20 games with a Launch.
    - Per seed: 2p 5 4 2 5 2, 3p 2 4 3 6 2, 4p 1 3 1 3 4, 5p 1 1 2 6 3.
    - 95 required keys (91 before Step 6's four promotions), none held by fewer than 2 games.
  - **The checks:**
    - Plan 6-1's checks as in Task 1. The removed-test-lines check prints only the lines this task names.
    - The other games' tests pass, with Rent Day's 108 examples.
  - **Time:** the Startup file best of 3, alternating with BASE, reading the `tests` figure. Measured 19.04 s against 13.34 s by the drafter; the pre-flight measured 19.69 and 21.16 s (two sets) against 13.07 and 13.35 s, before R7's saving.

- [ ] **Step 10: Commit.**

```bash
git add src/games/startup-simulator.test.ts
git commit -m "test(games): Startup Simulator's auto-player builds what it greenlights, so all 20 long runs Launch (11 before), and every required key is held by two games

It launches first, takes a seed idea while it researches and runs no product, puts the bench's makers on its first open project, hires the agency row's Diva onto a project, and recruits each kind of Junior at the cycle's recruit. Free moves run at 0 actions too. The bench's discard, the agency row's hire to the ops team and the reshuffle are counted, not required, each pinned by its examples and a test; the reassign onto a product, the scouting's hire onto one, an experienced Junior paid and a badged Junior leading, now each held by two games or more, become required.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC"
```

### Task 3: The time gate (D4) and the handoff

**Files:**
- Modify: `docs/superpowers/notes/2026-10-19-startup-handoff.md`.
- Modify: `docs/superpowers/notes/2026-10-19-startup-notes-for-8-preflight.md`.
- Modify: `docs/superpowers/notes/2026-10-19-startup-notes-for-7-preflight.md`.
- Modify: `docs/superpowers/notes/2026-10-19-startup-notes-for-6-preflight.md`.

- [ ] **Step 1: The D4 gate.** Time `npx vitest run src/games/startup-simulator.test.ts`, best of 3, alternating with BASE, reading the `tests` figure on vitest's Duration line (not the wall Duration). A result just over 20 s takes the "over 20 s" branch.
  - **At 20 s or less** (measured 19.04 s), nothing changes.
  - **Over 20 s but under 30 s:** no code change. Don't improvise a memo. Record the times in the handoff (Step 2) as over the 20 s aim, and name the next candidates there as a follow-up. The shared 2-player runs are already memoized (`twoPlayerGames`, 656d6eb). The candidates are:
    - the 3-player seed-2 undo test (2.0 s);
    - the 4-player Greenlight test (1.8 s, seeds 1–7);
    - either could take its game's moves from the long run's logs instead of playing them again.
  - **At 30 s or more:** stop and report.

- [ ] **Step 2: Update the handoff.**
  - **"Next to do"**, item 3: mark it done. Give the numbers:
    - Launches 23 → 60, games with a Launch 11 → 20 (per seat count: 2p 5/5, 3p 5/5, 4p 5/5, 5p 5/5);
    - the ten single-game keys now held by 2 or more, but for the agency row's hire to the ops team and the reshuffle, which moved with the bench's discard to arranged tests;
    - test time as measured in Step 1, against BASE's.
  - **"Rule readings"**, the 1a line: `a turn moves on by itself at 0 AP` becomes `a turn moved on by itself at 0 AP until the long-runs retune, which makes the player end their actions so a free action can be taken at 0 (rulebook l.172–173; this reverses 1a's call)`.
  - **`…-notes-for-8-preflight.md`** gains this line: `- 8-2a (from the long-runs retune): its step "In Phase: actions, When they have less than 1 action, go to engine. becomes … go to crisis." (plan l.759) and its l.210 summary name a line the retune removed; the end button's Then line Go to engine. is the one to change (and re-check for any other go to engine); also its Divest on the seller's last action (Review Focus l.163–167, test l.505) expects the turn to pass on by itself: the seller now ends their actions.`
  - **`…-notes-for-7-preflight.md`** gains this line: `- 7-2b (from the long-runs retune): the actions phase no longer ends at 0 actions; the player presses "end their actions", whose Then goes to the Engine. Its Review Focus (l.110), ranTheEngine/atTheEngine note (l.189), Example "a Veto of the Founder's last action …" (l.282–300) and the "a last action vetoed" key (l.757, l.765, l.776) assume the turn moves on by itself after a last action: add the end press, or re-key "a last action vetoed" to the vetoed action that left 0 actions.`
  - **"Notes carried to later pre-flights"** in the handoff gains a one-line pointer: `- **7-2b / 8-2a (from the long-runs retune):** the turn no longer moves on by itself at the last action, and the line 8-2a rewrites to go to the crisis moved into the end button's Then (details in …-notes-for-7-preflight.md and …-notes-for-8-preflight.md).`
  - **`…-notes-for-6-preflight.md`**, "From 5-2b's final review": the first bullet (the retune mini plan) gains `(done: the long-runs retune, 2026-11-23)`.
  - **The 5-2b entry** about free actions at 0 AP (the handoff's l.135, `- 5-2b final review: the actions phase ended at 0 AP, …`) gains `(done by the long-runs retune)`.

- [ ] **Step 3: Commit.**

```bash
git add docs/superpowers/notes/2026-10-19-startup-handoff.md docs/superpowers/notes/2026-10-19-startup-notes-for-8-preflight.md docs/superpowers/notes/2026-10-19-startup-notes-for-7-preflight.md docs/superpowers/notes/2026-10-19-startup-notes-for-6-preflight.md
git commit -m "docs: the long-runs retune is done; the handoff's numbers, 1a's reversed call on the end of the actions, and 8-2a's note

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC"
```

## Self-review

**The brief, item by item:**
- **D1:**
  - The rules line and the hint (Task 1 Step 3).
  - The examples gain the end (Step 3).
  - The example that pinned the automatic end pins the new rule: at 0 actions the phase waits, a paid press is refused with "they have at least 1 action", a free Greenlight is accepted, and the end leads to the bench cleanup.
  - The count stays 243.
  - The auto-player presses the end when nothing else is left (Step 4; Task 2 Step 2).
  - The reversal of 1a's call is stated in Architecture and recorded in Task 3.
  - The language had everything this needed. No language change.
- **D2:** both baselines are measured (HEAD and D1). The causes and the steering are measured. The before and after numbers are in "Measured numbers": Launches, games with a Launch, per seat count. The secondary measures are counted, with reasons, and none is forced or made required.
- **D3:**
  - The re-count at HEAD agrees with the notes (ten keys, six on 3p s4).
  - Seven of the ten reach 2 games or more.
  - Three keys move, each named with what pins it: the agency row's hire to the ops team, the reshuffle, and the bench's discard, which the retune itself dropped.
- **D4:** measured before and after. The memo the brief names exists already, so Task 3 is a gate.

**Global Constraints:** no shared code changes, no protected file, no new rules number. Startup words stay inside `src/games` and the Startup page test (the regex prints nothing). Every invariant runs after every move.

**Type and name consistency:** `hireDiva`, `makersToProject`, `boardAction(action)` and `ideas` are named the same in every step. The test names in the tally comments match the new tests' titles.

**Unresolved, for the controller:**
1. The two arranged tests and the 6-1 test pin the three moved keys; no driver reaches them in the long runs. A driver for the bench overflow would have to keep makers off projects, which works against D2. For the agency hire, seats lack a Senior's price when the cycle reaches it (27 occasions traced, $0–1 each).
2. D4's margin is small: 19.04 s against a 20 s target, on a machine where BASE varied from 11.5 to 14.3 s in one day. Controller ruling: 20 s is the aim and 30 s the watch, so Task 3 records a time between them and names the next candidates, and stops only at 30 s.
3. Task 1 keeps HEAD's games by ending at 0 before any free move. This is the auto-player's choice, not the rules': the rules offer the free moves there, and Task 2 takes them.
4. Some comments call a seed "the first" game to show something: the view test's "Seed 2 is the first 2-player game with a Greenlight that asks a choice" and the 3-player seed-2 undo test's. These weren't re-measured. The tests still pass on those seeds.
