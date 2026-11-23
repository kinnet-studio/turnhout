# Startup Simulator tests: where the time goes, and a measured speed-up

Base: turnhout `claude/peaceful-curie-rdfkow` at 08fe9a0, copied to `perf2/work` (git `master` = b58f9f4 "base").
Nothing in /home/user/turnhout was touched. Each candidate is a branch in `perf2/work`, with a worktree `perf2/<cN>`.
The recommended set is the `rec4` branch (worktree `perf2/rec4`). Its patch is `perf2/all-changes.diff` (`git diff master rec4`), and each candidate's own patch is in `perf2/candidates/`.

Timings are vitest's "tests" figure for `src/games/startup-simulator.test.ts`, in seconds. Runs alternate between directories with `tools/bench.sh` (`cpu=` is user+sys of vitest and its worker).
Another vitest run on /home/user/turnhout overlapped rounds 2–4 (load 3–7 on 4 cores). Those rounds spread by ±3 s. Round 5 and the final round ran quiet (load under 2). Raw runs are in `bench-round*.txt` and `bench-final.txt`.

## 1. Profile summary (base, tests ≈ 27.5–28 s quiet)

Sources: CPU profiles at 500 µs (`prof-base/`, `prof-c1/`), `--reporter=verbose` (`base-verbose.txt`), and instrumented block timers (`stats-blocks.json`).

| Where | Time | Notes |
|---|---|---|
| Long runs: 4 `it.each` tests (2p–5p × seeds 1–5) | 14.9 s | 2p 3.8, 3p 4.0, 4p 3.9, 5p 3.2 |
| ·· invariant checks (the per-move watch) | ~51% of the long runs | `keepsTheRules` 6.8 s instrumented: Board 1.6, Attributes 1.1, XP tokens 0.8, Toxic/Burnout 0.55, Pending 0.5, hidden faces 0.5, modes 0.47. `happenings` 1.85. Budget and keeping < 0.1 each |
| ·· the engine applying moves (dispatch → runFlow) | ~31% | |
| ·· auto-player deliberation (`pickFrom`, `offers`, `freeMove`, `pressChoices`) | ~18% | seed 1's `seatExtras` 1.65 s |
| Undo and replay tests | ~9.7 s | 3p s2 undo 2.3 s, 2p replays 2.0, 3p replays 1.8, 4p Greenlight 1.5, 3p s1 undo 0.9, view replay 0.8, reshuffle 0.4. Undo replays the whole log, so the 3p s2 test is O(n²): its play is only ~0.07 s, its 83 undos ~2.25 s. Greenlight: play ~0.6 s, replays ~1.0 s |
| Examples | ~2.0 s (7%) | "passes every example" 0.96 s, advice compile+run 1.08 s |
| Compiling the game | ~2.0 s profiled | module load, plus the advice and BROKEN variants. Each is needed |
| GC | 7% | |

Answers to the brief's questions:
- **Play vs checks.** In the long runs, checks take ~51% and play ~49% (engine 31%, auto-player 18%).
- **Worked values vs press choices.**
  - Worked-value evaluation (`workedValue`/`workedFlag`/`workOut`, flags and numbers) is ~25% of the whole file (8.1 s profiled). `xp` (460k calls) and the flag `holding attributes` (449k calls, 2.1 s instrumented) lead, mostly from the rules' "every phase" triggers and the checks.
  - Press-choice enumeration (`pressChoices`/`pressUpToChoices`) is ~8% (2.6 s).
- **Examples' share.** ~2 s (7%).
- **Dominant lang/\*\* functions.**
  - `workOut`, which builds a JSON.stringify key per call.
  - `cardById` (11.5M calls) and `cardsByZone` index builds (66k).
  - `cardValueOf`.
  - `PhraseLibrary.get`, which allocates a 16-field object per `call`.
  - `triggerSubject`: 1.22M calls (player rules 2.2 s, `which` rules 2.16 s, `sharedCardsFlagged` over the box 1.9 s). Only 1.8% of these calls repeat an earlier (state, rule) pair, so a per-state memo of it would not pay.
  - worked-view's `cardOnlyNames`/`readsOnlyCards`/`namedByLine`, re-derived on every `seatExtras` call (~1.2 s of seatExtras' 2.35 s).

## 2. Candidates, each alone against base

Δ is each candidate's best run minus base's best (27.63 s, round 5, quiet). The rounds column lists the candidate's runs. Its runs in the quiet round 5 sat next to base's 28.99 / 27.63.

| # | Candidate | Runs (tests s) | Best | Δ best | min cpu (base 49.7) | Files | Shared code? | Risk |
|---|---|---|---|---|---|---|---|---|
| C1 | Card-alone worked values memoized per card object | 23.85 23.77 25.41 · 28.86 24.75 30.00 · 26.43 25.27 26.38 · 25.11 22.34 | 22.34 | **−5.3** | 44.4 | new `lang/card-alone.ts`, `lang/runtime.ts` | yes (engine, not protected) | low–medium |
| C3 | Runtime: each ref's phrase code found once (WeakMap by ref); `workOut` cycle stack without JSON keys | 28.01 28.56 30.54 · 25.38 25.86 · 27.03 26.20 | 25.38 | **−2.3** | 47.7 | `lang/runtime.ts` | yes | low |
| C5 | Rules checks: build the `which` text only for a failure; hoist fixed names (attribute counts, track keys, Engine counts); test `junior` before the token loop; inline the per-mode closure | 33.08 29.97 25.59 · 27.04 28.74 · 29.72 28.14 | 25.59 | **−2.0** | 47.5 | test file only | no | low |
| C4 | Board view: what a game shows (`standIns`, shown/press/holder flags, shown player values) read once per compiled game (WeakMap) | 31.96 32.39 32.20 · 29.84 27.21 27.61 · 26.96 28.28 · 27.52 27.75 | 26.96 | −0.7 | 48.8 | `lang/board-view.ts` | yes | low |
| C6 | The 4p Greenlight test takes its game (log, state before and after the first answered Greenlight) from the 4p long run; it plays its own when a `-t` filter left the long run out | 29.75 33.49 28.56 · 32.83 26.80 · 28.63 29.74 | 26.80 | −0.8 | 49.3 | test file only | no | low |
| C7 | Ride-along invariant: skip a card that held no Attribute count and holds none (every branch would find nothing) | 31.60 30.32 27.97 · 37.02 27.93 · 29.80 28.65 | 27.93 | ~0 (+0.3) | 49.7 | test file only | no | very low |
| C2 | Worked values and flags kept per state object (WeakMap<GameState, …>) | 29.75 32.04 34.23 · 29.38 32.23 34.00 · 32.20 28.24 | 28.24 | +0.6 (no gain) | 50.9 | `lang/runtime.ts` | yes | low |

Only C1 stands clear of the noise on its own. C3 and C5 are probably real: their profiles predict ~0.5 s and ~1 s, and both their best runs and their CPU seconds agree. C4, C6 and C7 are each under a second, inside the noise. Their profiled shares are ~1.2 s of `seatExtras` analysis (C4), ~0.6 s of Greenlight play (C6) and ~0.2 s (C7).

### What each does, and how identity was checked

Identity checks, for every candidate and for the recommended set:

1. **Typecheck.** `tsc --noEmit` is clean.
2. **Startup file.** 103/103 pass.
3. **Tallies.** `tools/dump-tally.py` adds an `afterAll` that writes the long runs' `tally`, `marketShare` and `keptGames` (log length, moves watched, `seen` counts, and hashes of each kept game's log, `beforeLast` and end). It also writes a hash of the log and the end state of all 20 long-run games (2p–5p × seeds 1–5).
   - Each candidate's JSON is byte-identical to base's (`ident/tally-*.json`).
   - The example count is still 275, asserted by "passes every example".
4. **Failure text.** `tools/ident.sh` applies two rule mutations, runs the file, and compares the output with base's after stripping line numbers and code frames (`ident/mut*.txt`):
   - **Mutation 1** deletes "Only if its pending blue is 0." from *Learning blue*. That gives 18 failures: the Pending invariant in the long runs, an example, the tally tests, and the auto-player's "no move" errors.
   - **Mutation 2** deletes the line that moves a fired card's Workaholic to the strategy discard. That trips the Attributes invariant, with "the Attributes after p0's let go of a card in their development team c140 …", and an example.
   - **Results.**
     - C1–C4: the outputs are byte-identical, line numbers included, since the test file is unchanged.
     - C5 and C7: identical apart from line numbers and code frames.
     - C6: identical apart from line numbers and code frames, plus one extra stack frame (`greenlitGame`). Under mutation 1 the long run fails, so the Greenlight test falls back to playing its own game. It throws the same "p3 has no move in turn 19, phase graduation." through the new helper.
5. **Full suite.** Run for C1, C2, C3, C4 and the recommended set (`ident/full-*.txt`): 120 files and 3784 tests pass each time. That includes Rent Day's 108 examples (`rent-day.test.ts:813`). C5–C7 change only the Startup file, so the full suite reduces to that file plus base.

Per candidate:

- **C1 (card-alone memo).**
  - **What changes.** `cardAloneValues(game)` reads the compiled rules once per game, in a WeakMap. It marks the worked values whose lines, all the way down, read only the card's own numbers, flags, kind and zone, through the card-number, card-value and card-subject phrases and `it is {flag}`. Lines that read the cards on it or the card it sits on don't count. Startup has 63 such values of 91.
  - **The cache.** `workedValue`/`workedFlag` keep such a value per card object in a `WeakMap<CardState, Map>`. Cards are never changed once made, as zone-index.ts already relies on.
  - **Errors.** A value whose lines throw is not kept. The only error swallowed inside value evaluation is `unlessNoSuchNumber`, which catches only NoSuchNumber. Cycle (`WORKED_FROM_ITSELF`) and `DEPEND_ON_EACH_OTHER` errors propagate, so a kept value never depends on where it was asked.
  - **Extra check.** A run of the whole suite recomputed the value on every cache hit and compared: 120 files, 3784 tests, 0 mismatches (`memo-verify.log`). Hit rates were 90–99% for `holding attributes`, `xp`, blue/red need and `salary`.
  - **Risk.** A future phrase about "the card" that secretly reads more (another card, the round, a player) would be classed card-alone wrongly. The classifier allows only phrases registered by the three card-only libraries plus `it is {flag}`, and excludes `CARDS_ON_IT`. The weak point is the list of argument types in `OF_THE_CARD`.
- **C2 (per-state memo).** Hits are ~30%, but a Map per intermediate state costs as much as it saves. Not recommended. A per-state memo of `triggerSubject` was measured at 1.8% repeats and not built.
- **C3 (lookups).**
  - `call` keeps `library.get(kind, phrase)` per ref, in a WeakMap with undefined kept too, so the error path is unchanged. Refs are never mutated (checked by grep).
  - `workOut` keeps the values being worked out on a stack of key arrays instead of a Set of JSON strings. Entries come off LIFO in `finally`, so membership is the same.
- **C4 (view plan).** `workedView`/`playerValuesView` read `standIns`, `shownFlags`, `pressFlags`, `holderFlags` and `shownPlayerValues` once per compiled game, in a WeakMap.
  - The kept lists are only read, never handed out. worked-view.ts itself is unchanged, so its own tests and the designer page get fresh arrays as before.
  - No compiled game is mutated anywhere in src (checked by grep).
- **C5 (rules loops).**
  - `which` becomes a function, called only inside a pushed message, so the strings are the same.
  - Fixed arrays move to module constants, with the same order.
  - `junior` is tested before the token loop. Both tests are pure.
  - The `mayTake` closure is inlined, still called only when `now`.
  - `rowOf` replaces the per-card `row` closure. `zoneInfo` was already memoized.
  - Every check still runs after every move.
- **C6 (Greenlight from the long run).** The 4p long run's watch records the first answered Greenlight: the count of moves watched, and the before and after states. The test then rebuilds from that log as before. It also checks that the rebuilt state equals the kept `after`, which catches any off-by-one in the kept log.
  - **Behaviour change.** The undo now runs on the rebuilt engine (`replayed.undo()`) instead of the played one. Undo is the same replay from the initial state either way.
  - **Not taken from the kept logs.** The 3p seed-2 undo test's play costs ~0.07 s; its time is the 83 full replays it exists to test. The reshuffle test (~0.4 s) would need the 2p seed-4 Brainstorm states kept. Neither was taken.
- **C7 (ride-along gate).**
  - **The gate.** `if (held.length === 0 && attributesOn(c).length === 0) continue;`.
  - **Why it is exact.** With both empty:
    - fired or evicted pushes nothing, since `attributesOn(c)` is empty and `held` is empty;
    - kept is `sameList([], [])`, which passes without calling `expect` (sameList is guarded);
    - "fell" filters an empty `held`.

## 3. Recommended set: C1 + C3 + C4 + C5 + C6 + C7 (branch `rec4`)

C2 is left out. The set includes the shared engine changes C1, C3 and C4, in `src/engine/core/lang/{card-alone.ts (new), runtime.ts, board-view.ts}`. No protected file changes. The core stays pure: no DOM, randomness or time, and the caches are WeakMaps keyed on card objects, refs or compiled games.

Without the engine changes (C5 + C6 + C7 only), the measured gain is ~2–3 s at best, which does not reach the target. **So a shared-code change is needed for a real margin: C1 at least.**

Startup file, alternating:

| | Runs (tests s) | Best | cpu (min) |
|---|---|---|---|
| base | 28.31 28.15 27.07 (final) · 28.99 27.63 (round 5) | **27.07** | 47.6 |
| rec4 (recommended) | 19.79 19.23 21.47 (final) · 18.84 20.78 (round 5) | **19.23** final (18.84 in round 5) | 39.2 |
| rec (rec4 without C4) | 25.20 21.89 · 21.52 21.67 | 21.52 | 41.9 |

Identity for rec4:
- Tallies are byte-identical.
- Both mutations give the same failure text apart from line numbers, code frames and the C6 `greenlitGame` frame.
- The full suite passes: 120 files, 3784 tests.
- Typecheck is clean.

**Result.** Combined, measured best of 3 alternating: 27.07 s → 19.23 s, which is −7.8 s or −29%. The worst rec4 run was 21.47 s, against base's best of 27.07 s. That leaves ~8.5 s of headroom under the 30 s watch, where base had ~2–3 s.

The combined gain exceeds the sum of the singles' gains in this noise. The reason is that C1 and C3 both relieve the worked-value path and its GC (min cpu 47.6 → 39.2 s).

## 4. The other games and the hearts demo, before and after rec4

The files: `src/games/{hearts,color-match,venom,rent-day}.test.ts` and `src/pages/hearts-demo/*.test.ts`, alternating base and rec4.

Per-file durations, best of 3 alternating, with `--no-file-parallelism`. Raw runs are in `bench-perfile.txt`.

| File | base (ms) | rec4 (ms) |
|---|---|---|
| rent-day.test.ts (108 examples) | 12983 (13301 15897 12983) | 11925 (14002 12984 11925) |
| hearts.test.ts | 250 (346 294 250) | 324 (324 383 335) |
| color-match.test.ts | 72 | 73 |
| venom.test.ts | 47 | 53 |
| hearts-demo, 4 files together | 65 | 74 |
| all of them, tests figure | 13.44 s | 12.47 s |

With file parallelism on (`bench-others.txt`): base 14.96 / 13.81 / 13.07 against rec4 12.46 / 13.02 / 15.17.

All 100 tests pass on both sides, and no file is outside run-to-run noise. Hearts spreads 250–383 ms on both sides, and the hearts-demo files sit at a few ms each. The hearts-demo files themselves are untouched (protected).

## 5. The same set on the repo's current HEAD (078c161)

While this ran, the real repo moved from 08fe9a0 to 078c161. In between, commit 850550f changed the Startup rules (+40 lines) and the test file (+136/−47).
- **Applying it.** `all-changes.diff` applies there except two test-file hunks: the `GreenlitGame` type's context and the rewritten Toxic check's `zoneInfo` → `rowOf`. Both were redone by hand in `perf2/head`, a copy of 078c161 made with `git archive`, with the patch as its one commit.
- **Ready-to-apply patch.** `perf2/all-changes-078c161.diff`. No upstream `${which}` falls in a block that C5 made lazy (checked by grep). The new Buff and claims checks keep their own string `which`.
- **Identity.** Checked against `perf2/head-base`, which is 078c161 unchanged:
  - tsc is clean;
  - the Startup file passes 103/103;
  - the full suite passes, 120 files and 3784 tests (`ident/full-head.txt`);
  - the tally dump is byte-identical (20 games, 10 kept, 133 tally keys, market share 207);
  - both mutations give the same failure text apart from line numbers and the C6 `greenlitGame` frame.
- **C1 re-verified on the new rules.** The full suite ran with every card-alone cache hit recomputed and compared: over 2M hits, 0 mismatches (`ident/verify-head.log`).
- **Timing.** Alternating (`bench-head.txt`): 078c161 ran 29.81 / 27.27 / 28.83 s (best **27.27**); with the patch, 20.97 / 21.05 / 18.54 s (best **18.54**), which is −8.7 s.

## 6. Files

- `perf2/all-changes.diff`: the recommended set on 08fe9a0 (`git diff master rec4`).
- `perf2/all-changes-078c161.diff`: the same set rebased onto the repo's current HEAD.
- `perf2/candidates/*.diff`: each candidate alone.
- `perf2/tools/`:
  - `bench.sh` and `bench-files.sh`: alternating timings;
  - `ident.sh` and `dump-tally.py`: tallies and mutations;
  - `analyze.mjs`, `under.mjs`, `lines.mjs` and `callers.mjs`: profile reading.
- `perf2/ident/`: tally dumps, mutation outputs, typecheck and full-suite logs.
- `perf2/bench-round*.txt` and `perf2/bench-final.txt`: every timing run.
