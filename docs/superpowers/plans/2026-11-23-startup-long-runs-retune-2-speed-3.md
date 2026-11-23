# Startup Simulator Long Runs Retune 2 and Speed-up 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Win back most of what plan 6-2b added to `src/games/startup-simulator.test.ts`: its vitest `tests` figure went from about 20.6 s to about 26.0 s. The aim is about 23 s, with the same games.
- Retune the long runs' auto-player so that 6 of the 17 paths 6-2b's games left to fewer than 2 of the 20 games are held by 2 or more and become required. 5 other counted keys the retune brings to 2 or more games become required too.

**Architecture:**
- **Two measured probes** (scratch clones of `a526ffe`, both patches applying to `8aedd05`):
  - **The speed probe:** `docs/superpowers/notes/2026-11-23-startup-speed-3-proposal.md`. Its recommended set, `rec` = C1 + C2 + C3 + C5, is at `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/perf3/all-changes.diff` (branch `rec` in `perf3/work`).
  - **The retune probe:** `docs/superpowers/notes/2026-11-23-startup-retune-2-proposal.md`. Its patch is `…/scratchpad/retune2/all-changes.diff` (branch `final` in `retune2/work`; drivers D1–D5 in `retune2/drivers/`).
- **What the time went to:**
  - 6-2b's Event flags made `blue output`, `red output` and 17 other values read the Event in play (`CENTRE_HAS`, `'{sharedzone} has {card}'`). That took them out of the runtime's per-card cache: `blue output` went from 26,621 cached reads of 31,985 to none of 173,443.
  - The new per-move outputs invariant reads those values for every staff card on every move.
- **Task 1 (engine), C1 and C3:**
  - **C1:** the runtime also keeps a value whose lines read only its card and what some shared zones hold. The key is a chain of WeakMaps over the card objects those zones hold, in slot order, ending in the card object.
    - `keptValues(game)` gives each such value its zones' ids, sorted.
    - `cardAloneValues(game)` is unchanged: its `[]` entries, the same 59 values.
    - Phrase calls fall 75%.
  - **C3:** `cardsOn` reads an index built once per `state.cards` array (`attach.ts`).
- **Task 2 (test file), C2 and C5:**
  - **C2:** the advice tests run only the 10 examples they add. The rules' own run in "passes every example".
  - **C5:** the outputs invariant reads each value of `after` once.
  - Both are byte-identical in games and failure text (the proposal's §5).
- **Task 3 (test file), the retune** (rule 4-2: test-side steering where the rules alone leave a tallied path unreached). Four drivers, each a few lines in `playTurn`, each only reordering what a seat tries first through `choose`:
  - **D1:** Intern Season's free recruit is the turn's last action.
  - **D2:** the Brainstorm keeps a TechCrunch Feature first.
  - **D3:** the Workaholic is played on any turn.
  - **D4:** the Growth Hacker's reassign runs on the seat's own turns where ⌊t/n⌋ is odd. Its arranged test is updated to match.
  - **D5:** the tallies' required sets, `HELD_BY_FEWER_THAN_TWO` and the comments.
- **Measured:**
  - **The speed set:** best of 3 was 23.26 s against `a526ffe`'s 26.03 s on the quietest round. Paired runs give a median ratio of 0.908.
  - **The retune:** moves 4464 → 4615 (+3.4%), Launches 52 → 61, and CPU time −5%. Two tests stop sooner (the Greenlight test, the 3-player seed-2 undo).
- **Order:** speed first, then the retune.
  - Tasks 1–2 are proven byte-identical against the games as they stand.
  - Task 3 then changes the games on the faster engine.
  - This plan runs after plan 6-2b and before plan 6-3's Tasks 2–5.

**Tech Stack:** TypeScript, vitest.

**Spec:** the overview, `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`. Its proof is long runs at 2–5 players that check the rules after every move. Tasks 1–2 change no behaviour. Task 3 changes only which legal move the auto-player tries first.

## Global Constraints

- **Branch and commits:**
  - Develop on `claude/peaceful-curie-rdfkow` and commit by pathspec, never `git add -A`.
  - Every commit message ends with these two lines and contains no model identifiers:
    `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
    `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:**
  - no pixi, react or DOM in `src/engine/core/**`;
  - no `Math.random` or `Date.now`;
  - state stays Json-only, and replay stays exact;
  - no Startup Simulator words in shared code. Use the banned-word regex of plan 6-1, Task 5 Step 5's first check; the engine hunks use only "shared zone", "card" and "zone".
- **Other games:** Hearts, Color Match, Venom and Rent Day are unchanged, and Rent Day keeps 108 examples.
- **Startup's example count stays 307.** No rules line changes in this plan.
- **Caches:**
  - A cache is keyed only on objects never changed once made: card objects, `state.cards` arrays, a compiled game.
  - It is held in a WeakMap, or in a field of a runtime that belongs to one compiled game.
  - A value whose lines threw is never kept.
  - A value that reads itself throws `WORKED_FROM_ITSELF` every time.
- **Coverage:** every invariant still runs after every move. Nothing is sampled, and no check is skipped for cards that "can't have changed".
- **Tasks 1–2 are byte-identical:**
  - the tally;
  - each of the 20 long-run games' move count and the hashes of its log and end state;
  - the 10 kept 2- and 3-player games and the 5 kept 4-player Greenlight games.

  Check them with the speed probe's `perf3/tools/ident.sh` (it instruments a scratch copy of the test file and restores it). Run it on BASE and on the task's head; the dumps' md5s must match.
- **Task 3 tally changes** must match the retune proposal's §1, §2 and §5 tables, except where plan 6-2b's fix wave (`872a6b0`) moved a key. Each required key stays at 2 or more games. Every change is explained by the retune, never loosened to pass.
- **Timing:**
  - Time the Startup file's `tests` figure, not the wall Duration, best of 3, alternating with BASE, before and after each task. Report every run and the 1-minute load.
  - The watch is 30 s.
- **The language:** no change in `src/engine/core/lang/**` beyond Task 1's three files and their tests. If one turns out to be needed, it stays game-neutral, and you stop and report first.

## Review Focus

1. **A value C1 keeps although it reads more than its card and a shared zone.** Examples: the cards on it, its holder or owner, a player, a game number, a zone that isn't shared, or `CENTRE_HAS` replaced by another registrar's code. The patch's classifier tests cover each, and its trusted-code test pins `CENTRE_HAS`'s code by `String(fn)`. Check that they fail when the classifier is loosened.
2. **A kept value reused when the zone's cards differ.** The cases: the same card with another card in the zone, the zone emptied, two zones with one changed, or two runtimes over two games. The key is order-sensitive, so it can only miss a hit. The runtime tests and the played-game test cover these (a zone-blind key fails 4 of them). Run that mutation.
3. **`cardsOn`'s index handed out and changed by a caller.** Every call returns a new array (C3's tests; dropping the copy fails one). Every other order, by zone id then slot, is the old definition's.
4. **A steered press goes round a rule.**
   - D1–D4 only reorder what `playTurn` tries. Each press goes through `choose`, which takes the first move the rules accept.
   - Check that no driver presses a move the engine hasn't offered, and that the D4 test's new turn parity still meets the reassign's own `Only if` lines.
5. **A required key held by exactly 2 games** (Trade Show's $2 TechCrunch; Platform Power claimed) silently drops under a later change. It then fails the tally test loudly, as it should. Its comment names the two games, so a later plan's pre-flight can see it.

---

### Task 1: The runtime keeps a value that reads its card and what shared zones hold, and `cardsOn` reads an index per cards array

**Files:**
- Modify: `src/engine/core/lang/card-alone.ts`, `src/engine/core/lang/runtime.ts`, `src/engine/core/lang/attach.ts`
- Modify (tests): `src/engine/core/lang/card-alone.test.ts` (12 new tests, 3 extended), `src/engine/core/lang/attach.test.ts` (3 new)

**Interfaces:**
- Produces:
  - `keptValues(game: CompiledGame): ReadonlyMap<string, readonly string[]>`: each value whose lines, all the way down, read only its card, or its card and what shared zones hold (`CENTRE_HAS`). It maps the value to those zones' ids, sorted, and gives `[]` for a card-alone value. It is kept per compiled game.
  - `cardAloneValues(game)` is unchanged: `keptValues`' `[]` entries.
  - `LangRuntime.keptFor` keeps a zone-reading value by the card objects its zones hold, through a chain of WeakMaps. The chain's roots are in a `Map` on the runtime, keyed by `keptValues`' zone arrays.
  - `cardsOn(state, holderId)` is unchanged in result, and returns a new array each call.

- [ ] **Step 1: Record BASE.**
  - Run `bash /tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/perf3/tools/ident.sh <a clone at BASE> base` and keep its dump (read the script first: it takes a worktree path and a name).
  - Time the Startup file three times, alternating with nothing else of yours running.
- [ ] **Step 2: Apply the patch's engine hunks:**

```bash
git apply --include='src/engine/*' /tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/perf3/all-changes.diff
```

  If the scratchpad is gone, take the same hunks from `git diff master rec -- src/engine` in `perf3/work`. If both are gone, stop and report.
- [ ] **Step 3: Run** `bunx vitest run src/engine/core/lang/card-alone.test.ts src/engine/core/lang/attach.test.ts`. Expected: card-alone 33 tests pass; attach's new 3 pass.
- [ ] **Step 4: Mutation checks (Review Focus 1–3).** Make each change in turn, run the two files, then restore:
  1. Make `keptFor`'s key blind to the zone: keep a zone-reading value by its card alone. Expected: 4 card-alone tests fail, the played-game test among them.
  2. Make the classifier accept a value that also reads the cards on its card. Expected: a classifier test fails.
  3. Drop the copy in `cardsOn`. Expected: an attach test fails.
- [ ] **Step 5: Verify.**
  - `bun run test` passes: 3817 + 15 = 3832, unless the count at BASE differs; report it.
  - `bun run typecheck` is clean.
  - The five game files pass, with Rent Day's 108 examples.
  - `ident.sh` on the task's head gives the same md5 as BASE's.
  - `git diff --stat BASE -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo` prints nothing.
  - The banned-word regex finds nothing in the added engine lines.
  - Time the Startup file (best of 3, alternating with BASE).
- [ ] **Step 6: Commit**

```bash
git add src/engine/core/lang/card-alone.ts src/engine/core/lang/card-alone.test.ts src/engine/core/lang/runtime.ts src/engine/core/lang/attach.ts src/engine/core/lang/attach.test.ts
git commit -m "perf(lang): the runtime keeps a value that reads its card and what shared zones hold, keyed by those cards, and cardsOn reads an index kept per cards array"
```

### Task 2: The advice tests run only the examples they add, and the outputs invariant reads each value once

**Files:**
- Modify: `src/games/startup-simulator.test.ts`, from the patch's test-file hunks (C2 in `adviceRan`; C5 in the outputs invariant, `OUTPUT_NAMES`).

**Interfaces:**
- Consumes: Task 1, through behaviour only.

- [ ] **Step 1: Record BASE's failure text.** Run the Startup file under the speed probe's rules mutations 1–4 (`perf3/tools/mutate.sh`, proposal §5.2), and save the outputs. The script restores the rules.
- [ ] **Step 2: Apply the patch's test-file hunks:**

```bash
git apply --include='src/games/*' /tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/perf3/all-changes.diff
```

  The patch was cut against `a526ffe`. If a hunk misses because 6-2b's fix wave (`872a6b0`) moved its context, apply it by hand, unchanged.
- [ ] **Step 3: Mutation check.** Repeat Step 1's four mutations. The outputs must match BASE's, apart from line numbers and code frames.
- [ ] **Step 4: Verify.**
  - `bun run test` and `bun run typecheck` pass.
  - The example count is 307.
  - `ident.sh` gives BASE's md5.
  - Time the Startup file (best of 3, alternating with BASE, which is Task 1's head).
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.test.ts
git commit -m "perf(games): Startup Simulator's advice tests run only the examples they add, and the outputs check reads each value once"
```

### Task 3: The auto-player plays Intern Season's recruit, TechCrunch Features, the Workaholic and the Growth Hacker's reassign, and 11 more keys are required

**Files:**
- Modify: `src/games/startup-simulator.test.ts`, from the retune patch.

**Interfaces:**
- Consumes: the auto-player's `playTurn` and `choose`, and the tallies' required sets and `HELD_BY_FEWER_THAN_TWO`.

- [ ] **Step 1: Record BASE's tally per game** with the retune probe's `retune2/tools/run.sh` and `analyse.py`. Read them first: they write a per-game tally for the long runs.
- [ ] **Step 2: Apply the retune patch with a three-way merge:**

```bash
git apply -3 /tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/retune2/all-changes.diff
```

  Three hunks conflict at `8aedd05` + Tasks 1–2. Each is a comment or the `HELD_BY_FEWER_THAN_TWO` set: about l.1570 (the set and its doc comment), l.4106 and l.4178 (two "Held by" comments). Resolve each so that it keeps both:
  - **the fix wave's corrected pins:**
    - the agency-to-bench pin is 'the agency row slides left and refills from the talent deck, …' and the Chip Shortage bench example;
    - 'a trained Junior declared red' is pinned by the Junior Software Dev example declared Red;
    - "Held by one game" wording where one game holds it;
  - **the retune's new key lists and game counts:** the six keys leave the set; 'a trained Junior declared red' moves to "none".

  Every pin named must be an example or test title that exists. Grep each.
- [ ] **Step 3: Run** `bunx vitest run src/games/startup-simulator.test.ts`. Expected: all pass.
- [ ] **Step 4: Check the tally against the proposal.**
  - The six targets: 3p TechCrunch, Trade Show $2, TechCrunch $5, Workaholic played, the reassign, Intern Season.
  - The five promoted keys: a License paid to a chosen provider, a Junior PM promoted at a Launch, Toxic in the ops team, the Workaholic's +2 at the Engine, Platform Power claimed.
  - Each must reach the proposal's §1 and §2 game counts, and the moves 4615.
  - The three "at work" keys (6-2b's fix wave counts only where the Event's +1 or −1 applied) must each stay at 2 or more games. Report their counts.
  - Any other difference from the proposal is reported with its cause.
- [ ] **Step 5: Verify.**
  - `bun run test` passes; report the count. The probe ran 3817 at `a526ffe`, so expect Task 2's count unchanged.
  - `bun run typecheck` is clean.
  - The example count is 307.
  - Time the Startup file (best of 3, alternating with BASE, which is Task 2's head) and against `8aedd05`.
  - Report the end figure against the 30 s watch.
- [ ] **Step 6: Commit**

```bash
git add src/games/startup-simulator.test.ts
git commit -m "test(games): Startup Simulator's auto-player recruits for free in Intern Season, keeps TechCrunch Features first, plays the Workaholic on any turn and reassigns its Growth Hacker on alternate turns, so 11 more paths are held by two games and required"
```

## Gaps

- **The 11 keys left counted** each keep their pin (retune proposal §5): Toxic Red, the Engineer's $1 in Ops, Legacy Code at an Income, Crunch stopped by Clean Code, a trained Junior declared red, Attributes kept through a bench discard, the agency row to the bench, Patent Trolls' $5 License, Revenue Leader, Leadership Masterclass on a Sales Rep, and keep red in the ops team. A later cadence change may promote them. No 4-player game passes 13 rounds, so no 4-player Event reshuffle (Gap 3 of 6-2b's pre-flight) stays as it is.
- **The rest of the +27%** is work 6-2b added: 4% more moves, 28 more examples, a longer Greenlight test, and the Event checks in `happenings`. The next candidates are in the speed proposal's §6: `triggerSubject`, `seatExtras`, and the quadratic 3-player undo inside protected `game-engine.ts`.
- **Plan 6-3:** its R4 bullet gives `card-alone.ts`'s header the sentence "Nor does a line that tests what a shared zone holds …". Task 1 makes that false: C1 keeps such values, by the zone's cards. The controller drops that sentence from 6-3's plan after Task 1 and re-checks the other mini-plan items its pre-flight named.
