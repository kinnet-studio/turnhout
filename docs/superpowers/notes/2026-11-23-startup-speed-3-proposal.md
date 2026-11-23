# Startup Simulator's test file: where the time went, and what wins it back

A scratch clone at a526ffe (`perf3/work`, `node_modules` linked from the repo), with 2228e05 (`perf3/base0`) for the time before 6-2b.
Nothing here touched `/home/user/turnhout`. Every figure is vitest's `tests` figure for `src/games/startup-simulator.test.ts` alone
unless it says otherwise; "BASE" is an unchanged a526ffe worktree (`perf3/base`) run in turn with the others.

**The machine was shared.** Four cores, and other agents' vitest jobs came and went through every round (`other=a/b` counts the
vitest processes outside perf3 at the start and end of each run; a run with `other>0` ran beside one). Runs beside another job ran
25–45% slower, so every run is reported, and the deterministic counters (phrase calls, worked-value hits, moves) and CPU seconds
(`cpu=`, vitest and its worker, user+sys) stand beside the wall-clock figures.

## Summary

**Recommended: C1 + C2 + C3 + C5 (`all-changes.diff`).**

| best of 3, `tests` | a526ffe | rec | 2228e05 |
|---|---:|---:|---:|
| round 3, the quietest | 26.03 s | **23.26 s** | 19.95 s |
| round 2 | 26.61 s | **22.65 s** | 20.75 s |

- rec is 9–11% faster than a526ffe: a paired median of 0.908, and 23.26 s against 26.03 s in round 3. It wins back about half of the
  +27%.
- The games, tallies and hashes are byte-identical, and the checks fail with the same words under four rules mutations.
- `bun run test`, `bun run typecheck` and the five game files pass on it.

**The cause of the +27%:**
- 6-2b's Events made `blue output`, `red output` and 17 other values read the Event in play. That test of a shared zone took them out
  of the runtime's per-card cache.
- At the same time, 6-2b's new outputs invariant reads them for every staff card on every move.
- So `blue output` went from 26,621 kept reads of 31,985 to none of 173,443.
- The rest is new work: 4% more moves, 28 more examples, and the advice test running every example again.

**The candidates:**

| | change | time won | risk |
|---|---|---|---|
| C1 | keep a value that reads its card and a shared zone's cards, keyed by both (engine) | ≈1.5 s; phrase calls −75% | low–medium |
| C2 | the advice tests run only the 10 examples they add | ≈1.1 s | very low |
| C3 | `cardsOn` reads an index kept per cards array (engine) | ≈0.9 s with the others; not measurable alone | low |
| C4 | per-state memo in the long-run checks (test) | ≈1 s alone, 0 on top of C1 | low; not recommended |
| C5 | the outputs invariant reads each value once (test) | not measurable | very low |

## 1. Where the time went (2228e05 → a526ffe, +27%: 20.56 s → 26.04 s)

### 1.1 By test (one quiet `--reporter=verbose` run of each, ms; `verbose-base0.txt`, `verbose-base.txt`)

| test | 2228e05 | a526ffe | Δ |
|---|---:|---:|---:|
| long runs, 2 players | 2894 | 4014 | +1120 |
| long runs, 3 players | 3545 | 4367 | +822 |
| long runs, 4 players | 3140 | 3418 | +278 |
| long runs, 5 players | 2941 | 3061 | +120 |
| passes every example (278 → 306 examples) | 852 | 1496 | +644 |
| takes back a Greenlight that asked a choice (4p, seeds 1–30) | 1001 | 1464 | +463 |
| the advice test that runs every example again ("asks an example which hire it means…") | 978 | 1324 | +346 |
| the two "takes back the last move and rebuilds whole games" (3p) | 2875 | 3026 | +151 |
| undo every move, 3p seed 2 / 3p seed 1 | 2057 / 786 | 1944 / 757 | −142 |
| plays the same game through the page's view | 640 | 515 | −125 |
| sum of all tests | 22881 | 27023 | +4142 |

The four long runs are +2.34 s of the +4.1 s; examples +0.64 s; Greenlight +0.46 s; advice +0.35 s.

### 1.2 Inside the long runs (instrumented with `performance.now()`, `tools/instr.py`; quietest round, ms; instrumentation inflates)

| part | 2228e05 | a526ffe | Δ |
|---|---:|---:|---:|
| long runs (20 games) | 12928 | 16231 | +3304 |
| engine dispatch (applying the move) | 3443 | 3995 | +551 |
| watch: rules (`keepsTheRules`) | 5598 | 8036 | +2438 |
| … of which the new outputs invariant (Review Focus 4) | — | 1836 | +1836 |
| watch: happenings | 1785 | 1841 | +55 |
| watch: budget, keeping | 140 | 171 | +31 |
| auto-player (playTurn less dispatch and watch) | 1884 | 2070 | +186 |
| (cross-cut) worked values, outermost calls | 1952 | 4277 | +2325 |
| moves | 4297 | 4464 | +3.9% |
| canDispatch calls | 40276 | 44588 | +10.7% |

6-2b's final review measured the same split without instrumentation (long runs alone: 10.56 s → 14.35 s; `keepsTheRules` 4.62 → 7.35 s;
the outputs invariant 1.43 s; happenings 1.46 → 1.78 s; engine plus auto-player ≈4.45 → 5.19 s). Both say the same thing: about 70% of
the long runs' growth is the rules check, and most of that is worked values.

### 1.3 Why: the Event-reading values lost their cache

The runtime keeps a worked value per card object when its lines read nothing but the card (`cardAloneValues`, `keptFor` in
runtime.ts): a card object never changes, so neither does the value. 6-2b's round-long Events add lines such as `An open source
boosted card's blue output goes up by 1.`, where `Open source boosted:` begins `Only if the event in play has the Open Source Boom.` — the
test of what a shared zone holds (`CENTRE_HAS`). That test reads another zone, so the classifier rightly refused it, and with it
everything that reads it: 19 of the 114 values (`blue output`, `red output`, `blue bandwidth`, `red bandwidth`, `cost`, `learning blue`,
`learning red`, `rehire price`, and the 11 Event flags). Counted in the long runs (`stats-instr-*.json`):

| | 2228e05 | a526ffe | a526ffe + C1 |
|---|---:|---:|---:|
| `blue output` calls (kept hits) | 31,985 (26,621) | 173,443 (0) | 131,159 (125,924) |
| `red output` calls (kept hits) | 29,711 (23,994) | 128,253 (0) | 122,122 (116,781) |
| `burned out` calls | 29,396 | 315,756 | 24,636 |
| phrase calls (`runtime.call`) | n/a | 4,781,896 | 1,206,088 (−75%) |

Each Board card's `blue output` was worked out afresh 6–7 times a move (the rules check, the outputs invariant's two halves, the
happenings, the engine's own reads), and each time it re-read `working blue xp`, `overworked in blue`, `burned out` and the Event flags
below it. The new outputs invariant (6-2b, Review Focus 4) reads four such values of every staff card in `after`, and two in `before`,
on every move: 1.84 s instrumented, 1.43 s by 6-2b's measure.

The rest of the +4.1 s:
- **examples +0.64 s**: 28 more examples, but timed one by one (best of 3, `examples.probe.test.ts`) all 306 take 726 ms against 630 ms
  for 278. The test is the file's first heavy one and pays the JIT's warm-up; its own work grew by 0.1 s.
- **Greenlight +0.46 s**, **3p replays +0.15 s**: longer games (+4% moves) replayed from their logs, at the same slower move.
- **advice +0.35 s**: `adviceRan` compiles the rules with the advice's 10 examples added and runs *every* example again (306 + 10),
  only to keep the last 10 results; the 28 new examples made that repeat dearer.

### 1.4 The CPU profile (`--cpu-prof`, 500 µs sampling, `tools/prof.sh`, `prof-base*`, `cats-base*.txt`)

Profiling inflates the file's time about 1.7×, so these are shares only.

- **In the long runs at a526ffe:** the watch 64%, the engine's dispatch 23%, `seatExtras` 4% (seed 1 only, through the page's view),
  canDispatch 1%.
- **Engine functions, as a share of the whole profile** (total time, callees included):

| function | a526ffe | a526ffe + C1 |
|---|---:|---:|
| `triggerSubject` | 7.3% | 8.3% |
| `cardsByZone` | 4.7% | 5.2% |
| `cardsOn` | 3.5% | 4.8% |
| `cardById` | 3.3% | 3.6% |
| `faceKeyOf` (with `parseTextFaceKey`) | 3.2% | 3.5% |
| `seatExtras` | 3.0% | 3.3% |
| `attachmentProblem` | 2.8% | 3.2% |
| the whole profile | 43.6 s | 36.0 s |

  The shares rise with C1 because the worked values shrink around them. `cardsOn` led to C3.

## 2. Candidates

Each is a commit on its own branch in `perf3/work` (`c1` … `c5`), its patch in `candidates/cN.diff`, checked out as `perf3/cN`.

Every run of every candidate is in §2.6, with BASE run before it in the same round.

### 2.1 C1: keep a value that reads its card and what a shared zone holds (engine; `card-alone.ts`, `runtime.ts`)

**What it changes.**
- The classifier (`card-alone.ts`) now also accepts the test of what a shared zone holds (`CENTRE_HAS`, `'{sharedzone} has {card}'`),
  noting the zone's id.
- `keptValues(game)` gives each value that reads only its card, or its card and some shared zones, those zones' ids, sorted. A value
  that reads its card alone has `[]`. `cardAloneValues` is now the `[]` entries and is unchanged: the same 59 of Startup's 114 values.
- In Startup, 19 more values are kept, each on `event-in-play`: `angel funded`, `blue bandwidth`, `blue output`, `bubbly`, `chip short`,
  `cost`, `course priced`, `hackathon boosted`, `learning blue`, `learning red`, `logjammed`, `open source boosted`, `payroll tax`,
  `red bandwidth`, `red output`, `rehire price`, `server crashed`, `show priced` and `taxed` (`classify-c1.json`).
- `LangRuntime.keptFor` keeps such a value for the card object and for the card objects the zones hold in that state, in slot order.
  - The key is a chain of WeakMaps: one step for each card the zone holds, then one step to close that zone, then, at the end, a
    WeakMap keyed by the card.
  - A card-alone value keeps its existing per-card WeakMap.
  - The chain's roots sit in a `Map` on the runtime, keyed by `keptValues`' zone arrays. A runtime and its `keptValues` belong to one
    compiled game.

**Why it is safe.**
- **The zone test is a function of the zone's cards.** `sharedZoneHas` is
  `zoneCards(env.state, zoneIdFor(zone)).some((card) => matchesCard(card, match))`.
  - `zone` and `match` are the compiled line's own arguments.
  - `matchesCard` reads only `card.data`.
  - `zoneCards` is a function of `state.cards`, through zone-index's WeakMap.
  - The rest of the value reads only the card, by the classifier's existing rule.
  - So the same card object, with the same card objects in the same order in those zones, gives the same value. The key is
    order-sensitive, which is stricter than the test needs, so it can only miss a hit, never give a wrong one.
- **The keys never change.** Card objects and `state.cards` arrays are never changed once made: the convention zone-index.ts and
  attach.ts already key on. Everything is in WeakMaps, apart from the roots, and the zone arrays the roots are keyed by are fixed for
  each compiled game.
- **A throw is never kept.** `work()` runs before `kept.set`. A value that reads itself throws `WORKED_FROM_ITSELF` from `workOut`
  inside `work()` every time, and tests show both.
- **The phrase's code is pinned.** The trusted-code test now also checks that the default library's `CENTRE_HAS` code is
  queue-phrases' own, compared as `String(fn)`. A later registrar that replaced the phrase would fail it.
- **The core stays pure and game-neutral.** No protected file is touched, nothing is impure, and the shared code has no Startup word.
  Its words are "shared zone", "card" and "zone".

**Unit tests** (`card-alone.test.ts`: 12 new tests and 3 extended; the file's 33 tests all pass):
- **Classifier (6).**
  - A zone-testing flag is kept with its zone and is not card-alone.
  - These are kept with the zone they inherit: one that also reads its card, one that reads such a flag, and a number that reads one.
  - A flag that tests two zones keeps both, sorted.
  - These are not kept: one that also reads the cards on it, and the existing other-zone, owner and game-number values.
  - The `[]` entries are exactly `cardAloneValues`.
  - The same map comes back every time.
- **Runtime (6), on a crew game with a Statue in the scrap.**
  - One working-out serves the same card in two states whose scrap and hall hold the same cards. This is counted with a spy on
    `call`.
  - A value is worked out afresh when a card in the zone changes, the zone empties, or another card replaces it, and each state keeps
    its own answer.
  - Each of two zones counts.
  - Two runtimes over two games stay apart.
  - A self-reading value throws every time.
  - A line that throws does so every time, with nothing kept.
- **Played Startup game.**
  - A long-lived runtime against a fresh one, for every card and all 78 kept values, over 140 steps.
  - The card-moved test now also covers values kept for a zone's cards:
    - moved into a state where every other card is changed but the zone's cards are the same, they come to the same (more than
      5,000 reads);
    - moved into a state with another Event, at least 3 of them are seen to differ.
- **Mutation.** Making the cache blind to the zone (kept by card only) fails 4 of these, the played-game one among them.
- **Rules mutation 4** (§5) adds a Blue output line that reads the strategy discard, a second zone. It gives the same failure text with
  and without C1.

**Counted** (long runs, `stats-instr-base-r1.json` / `stats-instr-c1-r1.json`):
- Phrase calls fall 75%, from 4.78 M to 1.21 M.
- `blue output` is kept for 125,924 of its 131,159 reads.
- The instrumented long runs fall 1.41 s (16.23 → 14.82 s), of which the outputs invariant is 1.42 s (1836 → 417 ms).
- Moves, dispatches, canDispatch and triggerSubject calls are all identical.

**Risk: low-to-medium.** It is engine code every game runs. The proof is local (one phrase, read in full) and pinned by the
trusted-code test.

### 2.2 C2: the advice tests run only the examples they add (test file)

**What.** `adviceRan` used to compile the rules with the 10 advice examples appended, run all 316 examples, and keep the last 10. It now
runs the compiled game with `examples` cut to those 10: `{ ...advised, examples: advised.examples.slice(-added.flat().length) }`.

**Why it is safe.**
- `runExamples(game, lib)` is `game.examples.map((example) => runExample(game, lib, example))`, and each example plays on a table of
  its own. A result never depends on the other examples, and the 10 results are the ones the old slice took.
- The rules' own 306 still run, and are counted, in "passes every example".

**Unit tests.** None needed beyond the advice tests, which assert on each of the 10 results as before. The whole file's output under
rules mutations 1 and 2 is unchanged with C2 (§5).

**Risk: very low.**

### 2.3 C3: `cardsOn` reads an index kept per cards array (engine; `attach.ts`)

**What.** `cardsOn(state, holderId)` used to filter all of `state.cards`, then each zone that holds a card on it, for every call. It now builds, once per `state.cards`
array, a map from each holder id to the cards on it, held in a `WeakMap` keyed by the array. The build takes:
- the zones of held cards, sorted;
- each zone's cards in `zoneCards` slot order;
- each card pushed to its holder's list.

A call returns a copy of the list.

**Why it is safe.**
- It is the old definition, grouped:
  - the same zone order, sorted ids of the zones that hold a card on a card;
  - the same slot order within a zone;
  - the same `holderIdOf` test.
- The key is never changed, the WeakMap holds it weakly, and the caller gets a new array, as before.

**Unit tests** (`attach.test.ts`, 3 more, all pass on master and on C3):
- Two zones are listed by zone id, then slot, and each call gives a new list.
- Each state reads its own cards, including the states before and after a move.
- 20 random forged states, with cards on cards across zones at random, give the old definition's answer for every card and for a
  missing id.

**Mutation.** Dropping the copy fails one of them; dropping the zone sort fails two.

**Risk: low.**

### 2.4 C4: the long runs' checks keep worked values per state (test file; the coordinator's suggestion 1)

**What.** `keptPerState(runtime)` wraps the long runs' check runtime in a Proxy. It memoizes `workedValue`, `workedFlag` and
`playerValue` in `WeakMap<GameState, Map<string, unknown>>`, keyed `kind\0of\0name`.
- Each move's `before` is the last move's `after`, so this move's checks read what the last move's checks worked out.
- A throw is not kept.

The engine's own runtime is untouched: only the checks, happenings and replay keeping read through the wrapper.

**Why it is safe.**
- A state is never changed once made, and these three are pure functions of the state.
- It is test-only, and the tally and hashes are identical.

**Risk: low** (test only), but it adds a Proxy that a later reader must understand.

### 2.5 C5: the outputs invariant reads each value of `after` once (test file; the safe form of the coordinator's suggestion 2)

**What.**
- The invariant reads four values of every staff card in `after`, then reads `blue output` and `red output` of `after` again for the
  `before`/`after` equality half.
- With C5 it reads the four once (`OUTPUT_NAMES`) and reuses the first two as `now`.

**Why it is safe.** Nothing is skipped: the same values are compared, and the same cards and moves are checked. The failure text is
identical under rules mutation 3, which trips the `< 0` half, and mutation 4, which trips the equality half (§5).

**Risk: very low.**

### 2.6 Every run

`tools/bench.sh N file dir…` runs the directories in turn, N rounds. Each cell gives:
- vitest's `tests` figure;
- in brackets, the CPU seconds;
- `a/b`, the other vitest jobs on the machine at the start and end of the run.

"Quiet best" is the best run with no other job at either end. BASE (`base`) and every candidate ran a526ffe's rules with its own test
file. `base0` is 2228e05, which has 103 tests to a526ffe's 109.

`bench-round1.txt`

| | run 1 | run 2 | run 3 | best of 3 | best CPU | quiet best |
|---|---:|---:|---:|---:|---:|---:|
| base | 29.79 s (54.2; 4/0) | 27.42 s (52.5; 0/0) | 27.86 s (53.6; 0/0) | **27.42 s** | 52.5 s | 27.42 s |
| c1 | 25.25 s (50.4; 0/0) | 26.73 s (51.2; 0/7) | 29.05 s (51.9; 0/4) | **25.25 s** | 50.4 s | 25.25 s |
| c2 | 26.47 s (51.6; 0/0) | 35.75 s (55.4; 7/7) | 28.74 s (50.2; 4/3) | **26.47 s** | 50.2 s | 26.47 s |
| c3 | 24.30 s (48.3; 0/0) | 38.65 s (52.9; 7/11) | 26.06 s (51.8; 3/0) | **24.30 s** | 48.3 s | 24.30 s |
| c4 | 25.37 s (50.0; 0/0) | 34.89 s (53.3; 11/0) | 40.62 s (55.5; 0/7) | **25.37 s** | 50.0 s | 25.37 s |
| c5 | 29.46 s (51.7; 0/0) | 27.09 s (53.4; 0/0) | 35.02 s (52.9; 7/0) | **27.09 s** | 51.7 s | 27.09 s |

`bench-round2.txt`

| | run 1 | run 2 | run 3 | best of 3 | best CPU | quiet best |
|---|---:|---:|---:|---:|---:|---:|
| base | 32.03 s (51.2; 5/5) | 26.61 s (49.0; 0/0) | 30.39 s (54.5; 3/0) | **26.61 s** | 49.0 s | 26.61 s |
| c1 | 31.35 s (50.6; 5/5) | 26.74 s (49.0; 0/0) | 27.65 s (52.1; 0/0) | **26.74 s** | 49.0 s | 26.74 s |
| c2 | 29.18 s (51.5; 5/0) | 25.96 s (49.7; 0/0) | 28.86 s (52.6; 0/0) | **25.96 s** | 49.7 s | 25.96 s |
| c3 | 27.24 s (53.7; 0/0) | 25.11 s (49.6; 0/0) | 27.76 s (54.0; 0/0) | **25.11 s** | 49.6 s | 25.11 s |
| c4 | 27.79 s (54.1; 0/0) | 25.45 s (50.7; 0/0) | 32.03 s (52.5; 0/0) | **25.45 s** | 50.7 s | 25.45 s |
| c5 | 28.69 s (51.4; 2/0) | 33.30 s (52.1; 0/9) | 27.87 s (54.3; 0/3) | **27.87 s** | 51.4 s | — |
| rec | 22.65 s (47.0; 0/0) | 38.84 s (49.9; 9/5) | 23.86 s (46.1; 3/0) | **22.65 s** | 46.1 s | 22.65 s |
| all | 22.44 s (45.4; 0/0) | 31.97 s (52.3; 5/5) | 26.44 s (49.2; 0/7) | **22.44 s** | 45.4 s | 22.44 s |
| base0 | 20.75 s (38.4; 0/0) | 21.88 s (42.0; 5/3) | 32.63 s (43.7; 7/11) | **20.75 s** | 38.4 s | 20.75 s |

`bench-round3.txt`

| | run 1 | run 2 | run 3 | best of 3 | best CPU | quiet best |
|---|---:|---:|---:|---:|---:|---:|
| base | 30.65 s (54.3; 4/0) | 28.23 s (54.8; 0/0) | 26.03 s (51.9; 0/0) | **26.03 s** | 51.9 s | 26.03 s |
| rec | 23.97 s (49.5; 0/0) | 23.71 s (48.6; 0/0) | 23.26 s (48.7; 0/0) | **23.26 s** | 48.6 s | 23.26 s |
| base0 | 22.31 s (44.5; 0/0) | 21.26 s (42.5; 0/0) | 19.95 s (40.5; 0/0) | **19.95 s** | 40.5 s | 19.95 s |

`bench-longruns.txt`: `-t 'long runs'`, the long-runs describe alone. That is 50 tests: the four long runs and the replay, undo and
Greenlight tests.

| | run 1 | run 2 | run 3 | best of 3 | best CPU | quiet best |
|---|---:|---:|---:|---:|---:|---:|
| base | 31.12 s (51.8; 7/1) | 21.60 s (45.4; 0/0) | 22.14 s (45.5; 0/0) | **21.60 s** | 45.4 s | 21.60 s |
| c1 | 20.75 s (44.1; 1/0) | 20.93 s (43.9; 0/4) | 22.12 s (46.5; 0/0) | **20.75 s** | 43.9 s | 22.12 s |
| c3 | 22.03 s (46.2; 0/0) | 24.54 s (45.3; 4/0) | 20.82 s (43.7; 0/0) | **20.82 s** | 43.7 s | 20.82 s |
| c4 | 22.36 s (47.6; 0/0) | 22.68 s (48.7; 0/0) | 22.06 s (46.1; 0/0) | **22.06 s** | 46.1 s | 22.06 s |
| c5 | 23.59 s (49.0; 0/0) | 23.33 s (49.2; 0/0) | 22.37 s (46.2; 0/4) | **22.37 s** | 46.2 s | 23.33 s |
| rec | 21.12 s (45.0; 0/0) | 22.49 s (44.7; 0/0) | 26.59 s (45.8; 4/0) | **21.12 s** | 44.7 s | 21.12 s |
| all | 20.59 s (44.6; 0/0) | 23.91 s (46.0; 0/0) | 29.74 s (47.9; 0/4) | **20.59 s** | 44.6 s | 20.59 s |
| base0 | 16.99 s (37.2; 0/0) | 19.80 s (39.2; 0/0) | 23.95 s (41.0; 4/4) | **16.99 s** | 37.2 s | 16.99 s |

**Paired runs** (`tools/pair.sh`, `bench-pairs.txt`, `bench-pairs-c3.txt`). The two run at the same moment, so the other jobs' load
falls on both; the times are slower than the runs above because each pair shares the four cores. The ratio is B/A.

| A → B | ratios | median |
|---|---|---:|
| base → rec | 0.908, 0.913, 0.946, 0.871, 0.884 | **0.908** |
| base0 → rec | 1.114, 1.104, 1.144 | 1.114 |
| rec → all (adds C4) | 0.966, 1.004, 1.028 | 1.004 |
| base → c1 | 0.939, 0.928, 0.989 | 0.939 |
| base → c3 | 1.038, 0.993, 0.988 | 0.993 |
| rec without C3 → rec (adds C3) | 0.975, 0.956, 0.916, 0.974 | 0.965 |

**Per test, paired** (`verbose-pair{1,2}-{base,rec}.txt`, ms, base → rec):
- The advice test fell from 1669 → 444 and 1533 → 440 (C2).
- The four long runs summed 21721 → 20519 and 19867 → 17813, noisy one by one.
- The replays and undo tests moved by −0.4 s and −0.2 s.
- "passes every example" moved by +0.1 s and −0.2 s.

### 2.7 What each wins

| | time won | how it shows | risk |
|---|---|---|---|
| C1 | ≈1.5 s (6%) | paired 0.94; long runs alone, best 20.75 vs 21.60 s; instrumented long runs −1.4 s; phrase calls −75% | low–medium: an engine cache every game uses, proved by one phrase's code and pinned by the trusted-code test |
| C2 | ≈1.1 s | the advice test 1.5–1.7 s → 0.44 s in both paired verbose runs | very low: test file only, the same results |
| C3 | ≈0.9 s with the others (3.5%); not measurable alone | paired 0.965 on top of C1+C2+C5; alone 0.993 | low: an index of the same reads, kept per cards array |
| C4 | ≈1 s alone; nothing on top of the others | alone, best 25.37/25.45 vs 27.42/26.61 s; paired with the others 1.004 | low, test only; not recommended, because C1 already keeps what it would |
| C5 | not measurable | alone, best 27.09 vs 27.42 s and long runs 22.37 vs 21.60 s, within noise; with C1 the two reads it saves are cache hits | very low: exact, nothing skipped |

## 3. The coordinator's three suggestions

The coordinator passed on 6-2b's final review (the timings in §1.2) and three suggestions to measure, not to take as given.

1. **A per-state memo of worked values in the long-run watch, `WeakMap<GameState, Map>`.** Built as C4 and measured in §2.6.
   Alone it wins about 1 s (best 25.37 and 25.45 s against BASE's 27.42 and 26.61 s in the same rounds). On top of
   C1+C2+C3+C5 it wins nothing (paired 0.966, 1.004, 1.028; alternating `all` 22.44 s against `rec` 22.65 s), because C1 already
   keeps the values the checks read again: the Event-reading outputs, for the card and the Event. It is not in the recommended set.
2. **The outputs invariant's `< 0` scan only for changed cards, or when the Event moved.** Not taken.
   - An equivalence can be stated once C1 is in. All four values the scan reads are ones C1 keeps: `qa output` reads its card alone;
     `blue output`, `red output` and `blue bandwidth` read their card and `event-in-play`. So for a card object, and Event card
     objects, unchanged since the last check, the four values are unchanged.
   - But that equivalence is C1's own claim, and a skip built on it would stop the invariant checking it. Review Focus 4 exists to
     catch an output that changes when it should not; with the skip, a wrong classifier or cache would pass unseen.
   - As written, the skip is weaker still:
     - `eventOf` compares the Event's name, not its card object;
     - the start state is never scanned, so the induction has no base case;
     - the equality half covers only the Blue and Red outputs.
   - It would save little. With C1, each unchanged card's scan is four cached lookups: the whole invariant fell from 1.84 s to 0.42 s
     instrumented.
   - The brief's ban on skipping stands. C5 is the exact form of the saving: it reads each value once and skips nothing. Rules mutations
     3 and 4 (§5) trip each half of the invariant with the same text, with and without C5.
3. **An engine-side per-card cache keyed by the card object and the shared zone's cards.** This is C1, game-neutral: it is keyed by
   whatever shared zones a value tests, found from the compiled rules, not by the Event.

## 4. The recommended set

**`rec` = C1 + C2 + C3 + C5** (`all-changes.diff`, `git diff master rec`).
- Six files: `card-alone.ts`, `runtime.ts` and `attach.ts`, with their tests, and the Startup test file.
- 363 insertions and 37 deletions: 243 of the insertions are in test files and 120 in engine code.

| best of 3, `tests` | a526ffe (BASE) | rec | 2228e05 |
|---|---:|---:|---:|
| round 3 (the quietest; every rec and base0 run had no other job) | 26.03 s | **23.26 s** | 19.95 s |
| round 2 | 26.61 s | **22.65 s** | 20.75 s |
| paired, median ratio to a526ffe | 1 | **0.908** | ≈0.815 (0.908 / 1.114) |

- **Against BASE.** rec wins back 2.8–4.0 s of a526ffe's 26.0–26.6 s, 9–15%. The paired runs, which share the load, put it at 9%.
- **Against 2228e05.** rec is still 1.9–3.3 s slower (paired, 11%).
- **What is left of the gap** is work that 6-2b added, not lost caching:
  - 4% more moves and 11% more canDispatch calls;
  - 28 more examples;
  - the outputs invariant itself, 0.42 s instrumented with C1, mostly reads that are now cache hits;
  - a longer Greenlight test;
  - the new Event checks in `happenings`.

**Verified on `rec`:**
- `bun run typecheck` passes (`verify-typecheck.txt`).
- `bun run test`: 121 files and 3,832 tests pass (`verify-test-full.txt`).
- The five game files pass: 5 files and 176 tests (Hearts 11, Color Match 14, Venom 15, Rent Day 27 and Startup 109;
  `verify-games.txt`). Their example counts are unchanged and pass: Startup's 306, Rent Day's 108, Hearts' 11, Color Match's 7 and
  Venom's 7.
- Constraints:
  - No protected file is touched (`game-state.ts`, `flow.ts`, `game-engine.ts`, `src/pages/hearts-demo/**`).
  - The engine code added has no Startup word, Math.random, Date.now, DOM, pixi or react. The only Startup words in the diff are in
    the Startup test file and in `card-alone.test.ts`, whose played-game tests already used the Startup rules (`startup` is their
    existing local).
  - Every cache is keyed on objects never changed once made: card objects and `state.cards` arrays. It is held in a WeakMap, or in
    a field of a runtime that belongs to one compiled game.
  - A throw is never kept, and a self-reading value throws every time.
  - Every invariant runs after every move; nothing is sampled.

## 5. The same games, the same failures

### 5.1 The same games: tally and hashes

`tools/ident.sh <worktree> <name>` instruments a scratch copy of the test file (`tools/dump-tally.py`), runs the long runs, restores
the file, and writes `ident/tally-<name>.json`. The file holds:
- the whole tally (164 keys) and the market share;
- each of the 20 games' move count, with a hash of its log and of its end state;
- the 10 kept 2- and 3-player games (log length, what each saw, and hashes of the log, the state before the last move and the end);
- the five 4-player games kept for the Greenlight test (hashes of the log, the state before and the state after).

| worktree | games | moves | tally keys | market share | kept | greenlit | md5 of the dump |
|---|---:|---:|---:|---:|---:|---:|---|
| base (a526ffe) | 20 | 4464 | 164 | 230 | 10 | 5 | `34c141de39fcfa93799a83a576d5b0ec` |
| c1, c2, c3, c4, c5 | 20 | 4464 | 164 | 230 | 10 | 5 | `34c141de39fcfa93799a83a576d5b0ec` (each) |
| rec, all | 20 | 4464 | 164 | 230 | 10 | 5 | `34c141de39fcfa93799a83a576d5b0ec` (each) |

Every dump is byte-identical to BASE's. The rules' own examples still number 306 and all pass, and the file still has 109 tests.

### 5.2 The same failures: rules mutations

`tools/mutate.sh <worktree> <name> [n…]` runs the whole file with one rule changed, saves the output to `mut/<name>-<n>.txt` with
timings and line numbers blanked, and restores the rules.

| mutation | what it breaks | BASE |
|---|---|---|
| 1 | deletes `Only if its pending blue is 0.` from Learning blue | 18 failed: the examples, the four long runs, their tallies, the replays |
| 2 | deletes the line that moves a fired card's Workaholic to the strategy discard | 1 failed: the examples |
| 3 | sets a red mode card's Blue output to −1 | 13 failed: `the outputs after p1's declare a card in their development team c144` (the `< 0` half) and more |
| 4 | adds `A discard boosted card's blue output goes up by 1.`, where Discard boosted is `Only if the strategy discard has a Workaholic.` | 6 failed: `the outputs after p1's keep a card in their brainstorm c99: expected [ …(8) ]` (the equality half) and more |

Each worktree's output is the same as BASE's apart from the code-frame line numbers:
- mutations 1 and 2 on c2, c4, c5, rec and all;
- mutations 3 and 4 on c1, c5, rec and all.

So every check fails at the same move with the same words (`mut/compare.txt`). Mutation 4 also makes `blue output` a value kept for
two shared zones (`event-in-play` and `strategy-discard`), so it tests C1's key across zones in a real game.

## 6. Not taken, and the next candidates

- **The 3-player seed-2 undo test (1.9 s): not taken.**
  - It plays 83 moves, then undoes them one by one, comparing each state with `toEqual`.
  - `GameEngine.undo()` pops the log and `replay()`s every move from the start, so the test applies about 3,400 moves. That code is in
    `game-engine.ts`, which is protected.
  - The only test-side saving would be to compare fewer states, and the brief rules out sampling.
  - Each replayed move gets cheaper with C1 and C3, so the test speeds up with them.
- **`triggerSubject` over the box: next candidate, not built.**
  - The flow asks `triggerSubject` of every rule after every step: 297,821 calls in the long runs, 8.3% of C1's CPU profile.
  - Instrumented under load, the dearest rules were Talent Magnet's (567 ms), Platform Power's active tags (332 ms), "When a card in
    the box is holding attributes" (241 ms; a `which` rule that walks the whole box each time, though `holding attributes` is kept per
    card) and Full Stack Founder's (163 ms).
  - Two game-neutral options:
    - a per-state memo of `triggerSubject` in the runtime (`WeakMap<GameState, Map<CompiledTrigger, Subject | null>>`), since
      build.ts's `lang:trigger-when` and `lang:trigger-then` ask it of the same state;
    - a per-`state.cards` list of a zone's cards passing a card-alone flag, for `which` rules.
  - Estimated 0.3–0.6 s.
  - Reordering a rule's conditions (testing the milestone row first) was rejected: it changes which error surfaces when a line throws.
- **`seatExtras`: next candidate, not built.** It is 4% of the long runs' profile, in seed 1's play through the page's view only. A
  per-state memo in board-view would save at most about 0.4 s and touches the page's view code.
- **Engine indexes: later.**
  - `cardsByZone` (5.2% of C1's profile) and `cardById` (3.6%) are rebuilt for every new `state.cards` array, and every move makes new
    ones.
  - Deriving them incrementally in `changeCard` and `relocate` is the bigger prize, but duplicate ids and slot order need care, and so
    does the protected `game-state.ts` (`zoneCards` there is the reference).
  - `faceKeyOf`/`parseTextFaceKey` (3.5%) could keep a parsed key per card object.
- **The examples' warm-up.** "passes every example" pays the JIT's warm-up as the file's first heavy test. Its own work grew only
  0.1 s, so there is nothing to win there without moving tests around.

## 7. Files

All paths are under `perf3/` (`/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/perf3/`).

- **Patches.**
  - `all-changes.diff`: `git diff master rec`, the recommended set.
  - `candidates/c1.diff` … `candidates/c5.diff`: each `git diff master cN`.
- **Branches in `work`.**
  - `c1` … `c5`, with the worktrees `c1` … `c5`.
  - `rec`: C1+C2+C3+C5, worktree `rec`.
  - `all`: `rec` + C4, worktree `all`.
  - `noc3`: `rec` without C3, used only to measure C3 on top of the others.
  - `base` is a526ffe untouched; `base0` is 2228e05; `instr-*` are the instrumented copies.
- **Runs.**
  - `bench-round1.txt`, `bench-round2.txt`, `bench-round3.txt`: the whole file.
  - `bench-longruns.txt`: `-t 'long runs'`.
  - `bench-pairs.txt`, `bench-pairs-c3.txt`: the paired runs.
  - `verify-typecheck.txt`, `verify-test-full.txt`, `verify-games.txt`: the checks on `rec`.
  - `verbose-*.txt`: per-test timings.
- **Profiles.** `prof-*` (CPU profiles), `cats-*.txt` (their split by test and part), `stats-instr-*.json` (instrumented counters),
  `classify-*.json`, `examples-*.txt`.
- **Identity and mutations.** `ident/tally-*.json`; `mut/*.txt` (the mutation outputs), `mut/compare.txt`.
- **Tools, in `tools/`.**
  - `bench.sh`: alternating runs, with CPU and the other jobs counted.
  - `pair.sh`: paired runs.
  - `tables.py`: these tables.
  - `prof.sh` with `vitest.prof.config.ts`, `analyze.mjs`, `under.mjs`, `lines.mjs`, `cats.mjs`, `mkmarkers.mjs`, `tx.sh`: the CPU
    profiles.
  - `instr.py` and `stats.py`: the instrumented split and counters.
  - `pertest.py`: per-test diffs.
  - `dump-tally.py` and `ident.sh`: the identity dumps.
  - `mutate.sh`: the rules mutations.
  - `classify.probe.test.ts` and `examples.probe.test.ts`: probes.
