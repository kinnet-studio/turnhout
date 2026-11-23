# SDD ledger — plan: docs/superpowers/plans/2026-11-23-startup-long-runs-speed-2.md

- Started 2026-11-23 after plan 6-2a (HEAD 078c161 + plan commit). Spec: the overview (behaviour unchanged).
- Ruling: no separate pre-flight — the profiling agent's proposal (perf2/proposal.md, copied to docs/superpowers/notes/2026-11-23-startup-speed-2-proposal.md) measured and identity-checked the exact patch rebased onto 078c161 (tsc clean, 3784 pass, tallies and 20 games' hashes byte-identical, two mutations' failure text identical, C1's 2M cache hits recomputed with 0 mismatches); that is a pre-flight of this plan's code. Cost if wrong: a gap the unit tests (Task 1) or final review must catch.
- Ruling: cache scope — `ofCard` is a field of LangRuntime (one runtime per compiled game), so advice/broken variants can't share kept values; Task 1's tests pin it.

## Conflict scan
| Pair / task | Produces → consumes | Found |
|---|---|---|
| T1 → T2 | engine behaviour only (no API) → test file | independent hunks; both apply cleanly to HEAD (`git apply --check` per include) |
| T1 self | card-alone.ts + runtime/board-view hunks vs new unit tests | tests are new (not in the patch); consistent with Interfaces |
| T2 self | C5/C6/C7 hunks vs "no existing test line changes except those Task 2 names" | C6 changes the Greenlight test body (named); C5/C7 change check code (named) |
| Rubric-defect mandates | none | — |
- Task 1: BASE 274030b; implementer dispatched (sonnet).
- Task 1: implementer DONE c726e4d (15 new tests, 3799 pass, tsc clean; Startup 27.10→21.03 s best, not interleaved; mutation 'all names card-alone' fails 5 tests). Concern: its 'card it sits on' runtime test can't bite (it moves the card); the classifier test pins it. Review dispatched (opus: shared-engine cache).
- Task 1 review (opus): Needs fixes — no Critical (no stale-read path in any shipped game; every trusted phrase checked). Important: RF1 coverage (owner, game number), RF4 played-game test can't bite under 'all card-alone', guards against future phrases (pin the trusted list; testedBy null for unknown filter variants). Minors: holder test of the right shape, plain line error, type nit, alternate timing. Findings → task-1-review-findings.md. Ruling: fix all Important and Minors; the testedBy change departs from the measured patch — accepted, it changes no current classification (confirm 63/91). Fix round 1: resume implementer.
- Task 1 fix round 1: implementer DONE c578bcf (pushed) — 3802 pass, tsc clean; each new test fails under its mutation (M1: 6 fail incl. played-game; fake trusted phrase; testedBy widened); Startup 28.64 (BASE 274030b) → 21.02 s, interleaved B/A ×3; 63/91 card-alone unchanged. Scoped re-review dispatched (sonnet).
- Task 1 re-review (sonnet): Approved — all 8 findings FIXED. Minors parked: (a) card-alone.test.ts:265 driver cycles only onto-presses when any exist and the step bound fell 160→140 (canaries sampled>4, stacked>5 catch a stall); (b) :148-149 owned/fee paid not separately asserted worked (the first review confirmed they compile as worked; M1 failing 6 tests consistent). Ruling: park both — test robustness notes, no shipped-code risk — cost if wrong: a vacuous assertion the final review re-checks.
- Task 1: complete (c726e4d, c578bcf).
- Task 2: BASE c578bcf.
- Task 2: implementer dispatched (sonnet); identity via perf2/tools/ident.sh on worktrees at BASE and at its commit (never on the main checkout — ident.sh checks out the test file and rules).
- Task 2: implementer DONE 1b6a4c4 (pushed) — 3802 pass, tsc clean, 278 examples; tallies cmp byte-identical (t2-base vs t2-head); mut2 identical apart from lines/frames; mut1 same plus the one greenlitGame frame (as the profile saw for C6). Timing B c578bcf 21.82 vs A 21.93 — no measurable gain (profile: C5 −2.0 s, C6 −0.8, C7 ~0, all near its noise; C1 likely took C5's share, since its which-text read worked values now kept). Ruling: keep Task 2 — identity proven, C6 adds the rebuilt-state check, costs nothing — cost if wrong: none beyond the diff. Overall Startup 28.64 (274030b) → ~21.9 s (−23%; the profile's −29% was 27.07→19.23 on a quieter machine). Review dispatched (sonnet).
- Task 2 review (sonnet): Approved — all 5 named risks ✅ (lazy which per-iteration, constants same order, junior skip can't push, Greenlight rebuilds+falls back+can't pass vacuously, C7 skip loses no branch). Minor: attributesOn(c) computed twice in C7 (nit; parked).
- Task 2: complete (1b6a4c4).
- Final review: range 274030b..1b6a4c4, opus.
- Final review (opus): Ready — no Critical/Important; core sound (all 33 trusted phrases read only the card, no in-place mutation, caches per runtime/game, constraints hold). Minors: F1 played-game test can't see M2 (cards-on-it) or M3 (holder) misclassification; F2 guards check patterns not code (override after card-subject; IT_IS_FLAGGED unpinned; message); F3 vacuity guard; F4 attributesOn twice. Ruling: one fix wave for F1–F3 (the regression net later slices rely on), F4 parked; F1 by a transplant test (a card object moved into another sampled state keeps its card-alone values, fresh runtimes) plus a power canary, inside card-alone.test.ts only (6-2b pre-flight probes the Startup test file in parallel) — cost if wrong: a weaker net, caught by Startup's long runs as M2 already shows. Fix wave: resume Task 1 implementer. Findings → final-review-findings.md.
- Final fix wave: DONE_WITH_CONCERNS 91a2401 (pushed) — card-alone.test.ts only; 3805 pass, tsc clean. Transplant test fails under M1 and M2 (c28 pitched, state 0 into 21); M3 doesn't bite (no Startup value reads the holder line — accepted case; the small-game holder tests cover it); F2 override and fake phrase each fail. Power for M2 comes from variant states (every card toxic/visionary/Rainmaker). card-alone.test.ts 3.4→6.3 s (parallel file, not the watch). Scoped re-review dispatched (sonnet).
- Verification (controller): full suite at 91a2401 failed 1 test once under load (another agent probing in parallel), name not captured; re-run 3805/3805. card-alone's two played-game tests take ~2.7 s and ~3.0 s alone, nearest vitest's 5 s default. Ruling: give both a 60 s timeout like the Startup long runs (f7d21d4) — cost if wrong: the flake was elsewhere and recurs; it would show in a later run's log. Re-run after: 3805/3805, tsc clean.
- Final: speed-up 2 complete (c726e4d, c578bcf, 1b6a4c4, 91a2401, f7d21d4). Startup 28.64 → ~21.9 s.

---

## Appendix: the final review's findings (opus) and the fix wave's brief

### Final review (opus) — speed-up 2 — fix wave

Verdict: Ready (no Critical/Important). Everything core-side verified sound: each of the 32 trusted patterns + IT_IS_FLAGGED reads only the card (data, zoneId, game, same-card worked values); no in-place CardState mutation; classifier `seen` sound; workOut stack ≡ old set; codeOf/shownOf per runtime/game; constraints hold; every invariant still runs after every move.

Controller ruling: one fix wave for Minors 1–3 (they are the regression net every later slice relies on); Minor 4 stays parked.

## F1 — the played-game test can't catch what RF4 is for (card-alone.test.ts:253-307)
Reviewer evidence: over its 140 steps the driver makes 80 dev-team↔development reassigns; no Launch, nothing reaches ops/XP/modes/Pending. Of 28 non-alone values only `qa team output`, `qa workers`, `qa made` ever change while a card object persists. So:
- M2 (remove the CARDS_ON_IT exclusion, card-alone.ts:39): played-game test PASSES (only 3 small-game tests and 5 Startup tests fail).
- M3 (trust the holder line `the card it is on is …`): played-game test PASSES (only the 2 small-game holder tests fail).

Fix, controller's chosen approach (keep it inside card-alone.test.ts; do NOT touch src/games/startup-simulator.test.ts — another agent is probing plan 6-2b against that file):
- Add a **transplant test** that checks the classifier's claim directly on real game states, independent of the cache:
  - Play a game (the existing driver is fine; drive it longer or vary it if that gives more states with varied surroundings — e.g. prefer presses that build/staff projects and launch).
  - Keep a list of sampled states.
  - For pairs of sampled states (S1, S2) and every card id present in both, build S2' = S2 with that card's object replaced by S1's object, keeping the order in `cards`.
  - With FRESH runtimes, every card-alone value of that card in S2' must equal its value in S1. Treat "both throw the same error" as equal.
  - A value that reads only its card can't tell S1 from S2'.
- Add a **power canary** for the transplant test. Over the same transplants, count the non-card-alone values that DO differ between S1 and S2'.
  - Assert that the count is above a floor.
  - Assert that it includes at least one value read through the cards on it, such as `stalled`, `fully led` or whatever Startup's names are.
  - This proves the test can see a misclassification of that kind.
- Keep the existing kept-vs-fresh check (it's RF4's literal form). Tighten it only if that's cheap.
- Show the following, and record a failing line for each in the report:
  - M1 (every worked name card-alone) fails the transplant test;
  - M2 (CARDS_ON_IT exclusion removed) fails the transplant test;
  - M3 (trust `the card it is on …`): report whether it fails. It's acceptable that it doesn't if the holder's data never differ between transplanted states, but say so.
- Keep the file's runtime modest: report the card-alone.test.ts duration before and after, and aim for under ~3 s added.

## F2 — the guards against future phrases check patterns, not code (card-alone.test.ts:54-80)
- (a) `PhraseLibrary.add` overwrites (`phrases.ts:471-474`), and `createDefaultLibrary` runs 15 registrars after card-subject. In the pin test, also assert for each trusted (kind, pattern) that `createDefaultLibrary()`'s entry is the very function, or failing that the same source, registered by the three libraries. Today all 34 match, according to the reviewer.
- (b) Pin `condition: it is {cardflag}` (IT_IS_FLAGGED, `fact-phrases.ts:115` `itIsFlagged`) in the same way.
- (c) Make the pin test's failure message say what to do: "a phrase newly trusted as card-alone needs a SECTIONS line in this file and a runtime test showing it reads only the card".

## F3 — vacuity guard (card-alone.test.ts:106-107)
Assert that every SECTIONS name is a worked value of the compiled game, e.g. `expect(Object.keys(game.worked!)).toEqual(expect.arrayContaining([...names]))`. This stops a "not card-alone" assertion passing vacuously.

## Parked
- F4: C7 computes `attributesOn(c)` twice. This is negligible.
