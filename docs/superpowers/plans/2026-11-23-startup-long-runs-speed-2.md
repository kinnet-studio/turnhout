# Startup Simulator Long Runs Speed-up 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `src/games/startup-simulator.test.ts` runs about 30% faster (its vitest `tests` figure from about 27 s to about 19 s) with byte-identical behaviour. The 30 s watch then has room again before slices 6-2b to 10 add more rules and runs.

**Architecture:**
- A profile of the file at 08fe9a0 found the time in several places:
  - the long runs' checks (about 51%), then play (engine 31%, auto-player 18%);
  - worked-value evaluation (about 25% of the file);
  - `workOut`'s JSON keys and the library lookup in `call`;
  - the view re-deriving what a game shows on every call.
- The profile is in the controller's scratchpad, `perf2/proposal.md`, and its measured patch, rebased onto 078c161, is `perf2/all-changes-078c161.diff`.
- Three engine changes take most of the time back. None of them touches a protected file.
  - A worked value whose lines read nothing but its own card is kept per card object. A card is never changed once made.
  - The runtime finds each ref's phrase code once, and keeps a stack in place of JSON keys.
  - The board view reads what a game shows once per compiled game.
- Three test-file changes take the rest:
  - lazy failure text in the rules checks;
  - the 4-player Greenlight test reads its game from the long run;
  - an exact gate on the ride-along invariant.
- Run this plan after plan 6-2a and before 6-2b. Apply the patch's hunks per task, rather than retyping them. Each task adds what the patch lacks: Task 1's unit tests.

**Tech Stack:** TypeScript, vitest.

**Spec:** the overview, `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`. Its proof is long runs at 2–5 players that check the rules after every move. This plan changes no behaviour, so the spec's rules bind only as "nothing changes".

## Global Constraints

- **Branch and commits:**
  - Develop on `claude/peaceful-curie-rdfkow` and commit by pathspec.
  - Every commit message ends with these two lines and contains no model identifiers:
    `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
    `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:**
  - no pixi, react or DOM in `src/engine/core/**`;
  - no `Math.random` or `Date.now`;
  - state stays Json-only, and replay stays exact;
  - no Startup Simulator words in shared code.
- **Behaviour is byte-identical:**
  - Every existing test passes, and no existing test line changes except those Task 2 names.
  - Hearts, Color Match, Venom and Rent Day are unchanged. Rent Day keeps 108 examples.
  - Startup's example count stays 278.
  - Every long-run tally is unchanged, and so is each long-run game's log and end state.
- **Coverage is unchanged:** every invariant still runs after every move. Nothing is sampled or checked every Nth move.
- **Caches:**
  - A cache is keyed only on objects never changed after they are made: a card object, a compiled game's refs, a compiled game.
  - It is held in a WeakMap, or in a field of a runtime, which belongs to one compiled game.
  - A value whose lines threw is never kept.
- **Timing:** measure the Startup test file (`tests` figure, best of 3, alternating with BASE) before and after each task, and report both.

## Review Focus

1. **A value misclassified as card-alone** would be kept when the state around its card changes. Examples: a line that reads the cards on it, the card it sits on, its owner, a player, the round, or "the card" a press moves. `cardAloneValues` must exclude each. Test each kind of line, on a small compiled game.
2. **Two runtimes over the same state**, for two compiled games (Startup's tests compile advice and broken variants), must not share kept values. Test it.
3. **Errors are kept as before:**
   - A value that reads itself, directly or through another value, still throws `WORKED_FROM_ITSELF` the first time and every time after it.
   - A value that throws is never kept.

   Test both.
4. **A kept value must equal a fresh one.** Test it on a played game: at a few states of the 2-player seed-1 long-run game, every card-alone value of every card from the long-lived runtime equals the one a fresh runtime works out for that state. Sampling is fine in this unit test.
5. **The failure text of a broken invariant is unchanged.** Run a mutation check: break two rules lines, and compare the failure text before and after Task 2. They must match apart from line numbers and code frames.

---

### Task 1: The runtime keeps card-alone values per card, finds phrase code once, and the view reads a game's shown names once

**Files:**
- Create: `src/engine/core/lang/card-alone.ts`, from the patch.
- Create: `src/engine/core/lang/card-alone.test.ts`, which is new and not in the patch.
- Modify: `src/engine/core/lang/runtime.ts` and `src/engine/core/lang/board-view.ts`, from the patch.

**Interfaces:**
- Produces:
  - `cardAloneValues(game: CompiledGame): ReadonlySet<string>`, which gives the worked values whose lines, all the way down, read only the card's own numbers, counts, flags, kind and zone. It is kept per compiled game.
  - In `LangRuntime`, the private `keptFor(card, name, work)`, used by `workedValue` and `workedFlag`.
  - `call` keeps each ref's library entry in a WeakMap by ref; an entry that comes back `undefined` is kept too.
  - `workOut` keeps a stack of key arrays.
  - `board-view.ts`'s `shownOf(game)` is kept per compiled game.

- [ ] **Step 1: Write `card-alone.test.ts`** (Review Focus 1–4).
  - **Classifier tests:** compile a small game from rules text, in the shape of the lang tests that already compile games. Then:
    - a number reading `its X` and a flag reading `it is a … card` are card-alone;
    - one reading a card-alone value is card-alone;
    - one reading the cards on it, the card it sits on, its owner, or a non-card-alone value is not.
  - **Runtime tests:**
    - the same card in two states gives a kept value;
    - two runtimes for two games over one state each give their own game's value;
    - a self-reading value throws `WORKED_FROM_ITSELF` twice in a row;
    - a value whose line throws, throws again.
  - **The played-game test** of Review Focus 4.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/card-alone.test.ts`. Expected: FAIL, because the module does not exist yet.
- [ ] **Step 3: Apply the patch's engine hunks:**

```bash
git apply --include='src/engine/*' /tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/perf2/all-changes-078c161.diff
```

- [ ] **Step 4: Verify.**
  - The new tests pass.
  - `bun run test` passes: 3784 plus the new tests.
  - `bun run typecheck` is clean.
  - Time the Startup file (best of 3, alternating with BASE) and the four other games' files.
  - Hearts, Color Match, Venom, Rent Day (108 examples) and hearts-demo pass.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/card-alone.ts src/engine/core/lang/card-alone.test.ts src/engine/core/lang/runtime.ts src/engine/core/lang/board-view.ts
git commit -m "perf(lang): the runtime keeps a value that reads its card alone per card object, finds each phrase's code once, and the view reads what a game shows once per game"
```

### Task 2: The long runs build failure text only on a failure, the Greenlight test reads the 4-player long run, and the ride-along check skips cards with nothing to carry

**Files:**
- Modify: `src/games/startup-simulator.test.ts`, from the patch's test-file hunks.

**Interfaces:**
- Consumes: Task 1, through behaviour only.

- [ ] **Step 1: Record BASE's failure text:**
  1. Run the Startup file with `Only if its pending blue is 0.` deleted from `Learning blue:` in the rules, and save its output.
  2. Run it again with the line that moves a fired card's Workaholic to the strategy discard deleted, and save that output.
  3. Restore the rules.
- [ ] **Step 2: Apply the patch's test-file hunks:**

```bash
git apply --include='src/games/*' /tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/perf2/all-changes-078c161.diff
```

  The hunks make three changes:
  - **(C5)** `which` becomes a function called only inside a pushed failure. Fixed name lists move to module constants, in the same order. `junior` is tested before the token loop. The per-mode closure is inlined, and `rowOf` replaces the per-card `row` closure.
  - **(C6)** The 4-player long run records its first answered Greenlight: the moves watched, plus the states before and after. The Greenlight test rebuilds from that log and checks the rebuilt state equals the kept one. It plays its own game when a `-t` filter left the long run out.
  - **(C7)** The ride-along invariant skips a card that held no Attribute count and holds none.
- [ ] **Step 3: Mutation check.** Repeat Step 1's two breaks. The output must match BASE's, apart from line numbers, code frames and one `greenlitGame` frame. Restore the rules.
- [ ] **Step 4: Verify.**
  - `bun run test` and `bun run typecheck` pass.
  - The example count is still 278.
  - The tallies are unchanged: compare the slice tally tests' output, or a dump of `tally` and the kept games' hashes, before and after.
  - Time the Startup file (best of 3, alternating with BASE).
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.test.ts
git commit -m "perf(games): Startup Simulator's long runs build a check's failure text only when it fails, read the 4-player Greenlight from the long run, and skip the ride-along check for cards with nothing to carry"
```

## Gaps

- The profile's next candidates, for a later speed-up:
  - the 3-player seed-2 undo test (2.3 s, O(n²) by design: 83 full replays);
  - the auto-player's `seatExtras` (1.65 s at seed 1);
  - `triggerSubject` over the box (1.9 s; a per-state memo was measured at 1.8% repeats, so it would need another approach).
- The classifier trusts that the phrases registered by the card-number, card-value and card-subject libraries read only the card. A later phrase in those libraries that reads more must be excluded there. A note goes to every later plan's pre-flight.
