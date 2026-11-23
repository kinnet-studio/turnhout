# SDD ledger — plan: docs/superpowers/plans/2026-11-23-startup-long-runs-speed-4.md

Spec: docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md (binds only as "nothing changes").
Profile: docs/superpowers/notes/2026-11-23-startup-speed-4-proposal.md (c87027d). Patch: perf4/candidates/set-on-wave.diff, `git apply --check` clean on cad1f0b.

## Pre-flight scan

| rows | produces / consumes | found |
|---|---|---|
| Task 1 ↔ Task 2 | T1 produces playerValue kept per state; T2 consumes it through behaviour only (the long runs call runtime.playerValue via phrases and the auto-player) | no shared file; Task 2's identity check covers both |
| Task 1 self | tests (5, from the patch) against the runtime hunk (from the patch) | consistent; Step 2 first said two tests fail at BASE — three do (counts on a value asked again): fixed in the plan (cad1f0b) |
| Task 2 self | the test-file hunk = T1 (regenerated on 5d500b6) + T2 + T3; test file unchanged since 5d500b6 | applies as is; fallback (regenerate) only if it doesn't |
| Gaps | "re-split with split-iterate" | split.py is NOT idempotent (rerun on perf4/wave wraps again, 2373 diff lines): the plan says so (1cd4a3b) |

Ruling: execute as planned, sonnet implementers (patch application + verification), sonnet task reviewers, opus final review — the patch was measured and verified on 5d500b6 by the profiler — cost if wrong: a re-run of the verification.
Ruling: the checker is set once per runtime (build.ts:220), so E1 does not clear `ofState` on setChecker — a second setChecker would be the only way a kept value outlives what it read through env.check — cost if wrong: one line in setChecker.

Task 1: dispatched (sonnet), BASE cad1f0b
Task 1: implementer DONE c6776eb — Step 2 at BASE: 3 failed (as amended); 28/28 file tests; suite 4034; tsc clean (controller re-ran: 0); purity + import checks empty; ident md5 e23892e3… matches wavebase.
Task 1: review dispatched (sonnet) on review-cad1f0b..c6776eb.diff; Task 2: dispatched (sonnet), BASE c6776eb (in parallel with Task 1's read-only review)
Task 1 review (sonnet): Spec ✅, Approved. Focus 1–3 sound (player-value lines read only state/game/seats/subject; env.check only reachable from a needsMove condition; set/get both inside !checking; set only after reduce returns). Minors parked:
- M1 runtime.ts key `${seat}\n${name}` assumes no line break in seats or names — Ruling: park — seats are engine ids (p0…), value names are compiled rule names (one line) — cost if wrong: a shared value for two colliding keys, unreachable from rules text.
- M2 relies on states never mutated in place — Ruling: park — the same assumption as ofCard/byZones and every earlier speed-up; the engine's states are immutable by design — cost if wrong: same as the existing caches.
- M3 new imports appended after LOOKUP_GAME — Ruling: park — the new-import-lines rule mandates it.
Task 1: complete (c6776eb)
Task 2: implementer DONE_WITH_CONCERNS baaebcd — identity md5 matches; mutations 0-line diffs (14/7/2); suite 4034; bench best 22.98 vs 30.98 s, cpu −38%; pair median 0.889. Concerns minor (ident.sh's checkout reverted the uncommitted hunk once; re-applied — controller verified baaebcd's file = perf4/wave's measured file, md5 e551c8f6…).
Task 2: review dispatched (sonnet) on the -w diff + full package
Task 2 review (sonnet): Spec ✅, Approved. Every wrapper defined and called once in order (rulesPart 19, 35, 40, 42, 44 unwrapped); no top-level return/continue/break moved; only top-level let `generating` stays in its section's closure; T2 memo per call keyed by Founder on one state; T3 reads equal the old per-seat filters. Minors parked:
- M1 the name `once` for a per-call memo — Ruling: park — generated/measured code, harmless — cost: none.
- M2 `generating` lives in rulesPart15's closure — Ruling: park; goes into the handoff note on the split — cost: a later plan moving it out without returning it would fail tsc.
- M3 parts 1–7 closures read `current`/`phase` from rulesPart8's destructure (same TDZ as before) — Ruling: park; handoff note — cost: none now.
Task 2: complete (baaebcd)
Final review: dispatched (opus) over cad1f0b..baaebcd
Final review (opus): ready to close — no Critical, no Important; HEAD's runtime.ts and test file byte-identical to the measured perf4/wave; AST check: 52 wrappers each defined once and called once in place; 19 with a final `return { … }`; no top-level break/continue/yield/await; E1 sound for every caller (playerValuesView, phrases via playerValueOf, the test's auto-player and long runs); WeakMap memory same kind as ofCard/byZones. Four Minors, no code change:
- Correction to Task 2 M3: parts 1–7 read neither `current` nor `phase` today. The real hazard (final M1): a section reading a name returned by a LATER section's call is no longer a tsc error (closures, not IIFEs) — it throws at run time ("Cannot access … before initialization").
- M2: a `return` inside a section ends only that section; a check that ends the move early must stay unwrapped.
- M3: the proposal's "regenerate with split-iterate.py" is superseded by the plan's Gaps (split.py not idempotent; the tools live only in the scratchpad).
- M4: `generating` lives in rulesPart15's closure, reached through `atGenerate()`.
Ruling: no fix wave — the four Minors are notes for later plans, carried into the handoff's Notes ("Every later plan (from speed-up 4)") with the plan's two Gaps rules — cost if wrong: a later plan trips on the split and its task review catches it.
Ruling: plan-end timing is Task 2's bench/pair (best 22.98 s vs 30.98 s at 5d500b6, cpu 36 vs 59 s, paired median 0.889, under load 3.4–5.5) — the same files as the profile measured (md5) — cost if wrong: none; 7-2b times again at its end.
Plan complete: c6776eb, baaebcd. Suite 4034; Startup 114 tests, 333 examples; Rent Day 108.

---

## Appendix: the final review (opus), as returned

## Final review

**Verdict:** ready to close. I found no Critical or Important issues. E1 is sound for every caller, the split runs every invariant once per move in its original place, and the constraints and trailers hold. The four Minors below are notes for the handoff. None of them needs a code change.

**What I checked**
- **Commands:** `npx tsc --noEmit -p .` exits 0. `player-value-phrases.test.ts` passes 28/28.
- **Same files as measured:** HEAD's `runtime.ts` (md5 0824b18e…) and the Startup test file (md5 e551c8f6…) are byte-identical to the measured `perf4/wave` worktree. `ident/tally-{e1-head,set-head}.json` both have md5 e23892e3…, matching wavebase. `mut/head-5` and `mut/head-6` contain `rulesPart` frames, so the mutation runs used the split file, not the copy the checkout had reverted.
- **AST checks of the test file:**
  - All 52 wrappers (43 rules sections, 9 `happenings` sections) are defined once and called once, by the statement right after the definition.
  - Exactly 19 wrappers have a top-level return. Each is an object-literal `return { … }` and is the wrapper's last statement.
  - No wrapper uses `break`, `continue`, `yield` or `await` at its top level, and there are no hoisted `function` or `var` declarations.
  - No section reads a name that a later section returns. No section-local name shadows a module-level name or one of `keepsTheRules`' outer names.
- **Focus 1 (E1 is sound for every caller):**
  - **Callers:** `env.playerValue` is always called with `env.state`, through `playerValueOf` in the compare, board, total and player-value phrases. The only other engine caller is `playerValuesView` in board-view.ts:583, which passes the engine's state. The auto-player and the long runs exist only in the test file and pass `before`, `after`, `atTheEngine(…)` (pure, builds a new object) or `engine.getState()`. Scoring in `result()` reads `env(state)`.
  - **No in-place mutation:** searching for assignments, `push`/`splice`/`sort`, `Object.assign` and immer on `cards`, `data`, `turn` and `rng` in non-test code finds only view objects and the PIXI `table-model.ts`.
  - **`check` cannot be reached from a value:** `env.check` is reached only from `hasNoPlay`, which needs a move, and a value about a player's env has none (`currentMove` throws).
  - **`checking`:** it is set only inside `check`, and its `finally` resets it. Values worked out inside the checker are neither kept nor read. Outside it, the kept value belongs to the same state object, so it cannot be stale.
  - **Values that throw:** a cycle throws on the first working-out of any member, and nothing is kept on a throw. The only thing left behind is an empty `Map` for that state, which is harmless.
  - **Runtimes:** one runtime is built per compiled game and seats (`build.ts:202`, `examples.ts:76`). Seats are never mutated.
- **Focus 2 (memory):** `GameEngine` holds only `initial`, `current` and the move log, and undo replays the log. The pages keep no `GameState[]`. Each kept game holds 2 states, and the test-local `states[]` arrays live only as long as their test. Each stored map holds strings and numbers and no back-reference to its state. Memory use is the same kind as `ofCard` and `byZones`, so this is acceptable.
- **Focus 4 (constraints):** only three files changed, none of them protected. The engine lines have no pixi, react, DOM, `Math.random`, `Date.now`, `window`, Startup words, "veto", "supply" or "partner". Three import lines were added and none removed. T3's `namedAfter.get(…)` arrays are shared but only filtered, never mutated.
- **Focus 5 (commits):** both messages end with exactly the two required lines and contain no other model identifiers.

**Critical:** none.

**Important:** none.

**Minor**
1. **startup-simulator.test.ts:2703 (and every `const { … } = …PartN();`): the split moves a compile error to a runtime error.**
   - Unsplit, a top-level read of `current` before its declaration was a TS2448 compile error.
   - Now every read sits inside a closure that is not an IIFE. If a later plan adds `current` or `phase` to rulesPart5, tsc stays clean (I checked with a sample), and the long runs throw `ReferenceError: Cannot access 'current' before initialization`. The failure is loud, but it comes later than before.
   - The ledger's Task 2 M3 is inaccurate: parts 1–7 read neither `current` nor `phase` today.
   - Fix: a handoff line saying a section may read a returned name only if it comes after that name's call, and that tsc no longer checks this.
2. **Any wrapper, e.g. :2555–3530 and `happenings` :2034–2402: `return` inside a section ends only that section.**
   - A later check that means to stop the watch, or the `happenings` list, for this move with `return;` or `return keys;` would silently go on with the later sections. tsc does not flag a return value that a statement call ignores.
   - Fix: a handoff line saying a section never ends the move early; such a check stays unwrapped in the outer function.
3. **Plan :121–130 versus proposal :249 and :256: two conflicting instructions.**
   - The proposal still says the split is "regenerated, not maintained" and to "rerun `split-iterate.py`". The plan rightly overrides this, because `split.py` is not idempotent.
   - `split.py` and `split-iterate.py` live only in the scratchpad's `perf4/tools`, which a later session may not have.
   - Fix: the handoff should say the plan's Gaps override the proposal and that the tools may not exist.
4. **startup-simulator.test.ts:2865: `generating` lives in rulesPart15's closure.** Later sections reach it only through `atGenerate()`, which caches the value once per move. This is correct today, but it is part of the split's shape and should be noted. The handoff (`docs/superpowers/notes/2026-10-19-startup-handoff.md`) is not updated in this range. The plan's Gaps say the handoff's Notes will carry this, so it is close-out work.

The plan's Gaps notes are otherwise correct: new checks go inside their section, a returned name is added to both the `return { … }` and the caller's `const { … }`, a new section may stay unwrapped, and tsc's `noUnusedLocals` and narrowing catch the remaining mistakes loudly. E1's rule is correct and sufficient.

## Fix brief

- **Code:** none.
- **Close-out docs (the handoff's "Notes carried to later pre-flights", "Every later plan (from speed-up 4)"):**
  - Carry the plan's two Gaps rules: the split, and E1's rule.
  - Add one line each for Minors 1–4:
    - a section reads a returned name only after that name's call, and tsc no longer checks it;
    - a section never `return`s to end the move early, so such a check stays in the outer function;
    - `generating` is reached only through `atGenerate()`;
    - the proposal's "regenerate with `split-iterate.py`" is superseded, the tools may be gone, and new sections are wrapped by hand.
  - Correct the ledger's Task 2 M3: parts 1–7 read neither `current` nor `phase`, and the real hazard is Minor 1.
