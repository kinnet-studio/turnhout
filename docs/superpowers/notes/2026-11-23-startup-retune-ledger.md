# SDD ledger — plan: docs/superpowers/plans/2026-11-23-startup-long-runs-retune.md

- Plan committed e942193 (drafted by an opus drafter with probes in scratchpad retune/; controller review fixed: D4 gate is 20 s aim / 30 s watch, not a stop at 20 s; Task 1's new test also undoes the end and the Greenlight (Review Focus 4); Task 2 Step 7 checks the two "first seed" comments; Task 3 puts the 8-2a note in notes-for-8-preflight and marks the 6-preflight item done).
- Spec: docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md (rulebook l.172–173 for D1).
- BASE for the plan: e942193.

## Conflict scan (controller, before pre-flight)
| Pair / task | Produces → consumes | Found |
|---|---|---|
| T1 ↔ T2 (startup-simulator.test.ts) | T1: 0-action gate on freeMove, the `a > ACTIONS_EACH_TURN` throw, the new 0-actions test; T2 Step 2 removes the gate, keeps the throw; T2's line numbers are HEAD's and shift | consistent |
| T1 ↔ T3 | T1's rules change (end button goes to engine) → T3 records 1a's reversal and the 8-2a note | consistent |
| T2 ↔ T3 | T2's measured tallies and time → T3's handoff numbers (now "as measured in Step 1") | consistent |
| T1 alone | Step 1 tests fail at Step 2 against HEAD rules; Step 3–4 make them pass; pathspec = the 3 files it touches | consistent |
| T2 alone | Step 1's two tests pass already at Task 1 (they pin presses the retune stops reaching); Step 6 names exactly the 3 tests that fail after Steps 2–5; pathspec = the test file | Ruling below |
| T3 alone | Files list = 3 notes files; pathspec matches | consistent |

Ruling: Task 2 Step 1's two tests are characterization tests that pass before the retune, not red-first TDD — accepted — they pin the auto-player's bench discard and agency-to-ops hire before the long runs stop reaching them (D3), and the long-run probe is D2's failing check — cost if wrong: none beyond a reviewer flagging it; reviewers are told.
- Pre-flight dispatched (opus, independent copy pf-retune/), report → preflight.md
- Pre-flight done: preflight.md (opus, own copy pf-retune/work). No blocker; Task 1 and Task 2 reproduce every measured claim (94/96 Startup tests, 3775/3777 suite, 60 Launches, 20/20, 91 keys, none < 2 games; Task 1 plays HEAD's games, 530 end presses).
Ruling: R1 accepted — the ops-team hire test fails at Task 1 (recruit(a) gives RECRUITS[0]) and passes from Step 3 — corrects my earlier conflict-scan ruling (which said both pass at Task 1) — cost if wrong: none.
Ruling: R2 accepted — exact words for the two "first seed" comments — two implementers would otherwise differ — cost: none.
Ruling: R3 option (a), promote all four (REASSIGN_TO_PRODUCT 3 games, HIRE_SCOUTED_TO_PRODUCT 2, EXPERIENCED_PAID 3, BADGED_LEADING 5) → 95 required keys; plus correct the three false comments — the plan's own rule (≥2 games → required) applied evenly; integrated coverage of four more paths — cost if wrong: a later slice's cadence change trips one of them sooner (2-game HIRE_SCOUTED_TO_PRODUCT is the thinnest); that slice then retunes or moves it, as every tally comment says.
Ruling: R4 accepted — time = vitest `tests` figure; 20–30 s records and goes on — the gate was a coin toss — cost: none.
Ruling: R5 accepted — notes for 7-2b (Veto at the last action, "a last action vetoed" key) and 8-2a (Divest at the last action) — cost if wrong: none (notes only).
Ruling: R6, R7, R8 accepted — R6 completes Step 7's lists; R7 makes `ideas` lazy (same games, ≈0.7 s); R8: indent at 2, Task 1's doc line describes Task 1 (Task 2 Step 8 changes it), Review Focus 1 names Training, Task 3 names the handoff's l.135, BASE = e942193 (same code as 153cf28).
- Task 1 dispatched (sonnet implementer), BASE 5b1f1d9 (code = e942193 = 153cf28)
- Task 1 implementer: DONE_WITH_CONCERNS, commit 989b9e0 (not pushed). RED 3 failures as predicted; 3775 suite, tsc clean, 94 Startup tests / 243 examples, Rent Day 108, 6-1 checks clean. Time BASE 12.64 s / Task 1 13.56 s.
Ruling: concern 1 (trailer names "Claude Opus 5.5") — keep; it is this session's required attribution, the "no model identifiers" rule is about commit subjects/bodies and code — cost: none.
Ruling: concern 2 (no move-by-move HEAD comparison) — accepted; the pre-flight hashed all 20 games at Task 1 against HEAD (identical apart from 530 end presses) on the same plan text, and the long runs and every tally pass unchanged here — cost if wrong: a game differs, which Task 2 replays anyway.
- Task 1 review dispatched (sonnet), package review-5b1f1d9..989b9e0.diff
- Task 1 review: ✅ spec, Approved, no Critical/Important. Minor: game equality asserted not shown — controller check: 989b9e0's rules and page test equal the pre-flight's hashed Task 1 copy (pf-retune/work 75c629d) byte for byte, and its test file differs only in two comment lines (R8's doc sentence, one re-wrap), so the pre-flight's 20-game hash comparison holds.
Task 1: complete (989b9e0)
- Task 2 dispatched (sonnet implementer), BASE 989b9e0; probe pf-retune/scripts/probe.py + an.py offered for Step 9
- Task 2 implementer: DONE_WITH_CONCERNS, commit e824269. Startup 96/96, suite 3777, tsc clean, other games 100; probe 60 Launches, 20/20, per seed as planned, 95 required, none < 2; comments match the probe; 6-1 checks clean. Time BASE 13.40 s / Task 2 18.79 s (single runs 18.8–21.0).
Ruling: the trailer names "Claude Sonnet 5.5" (the implementer's own model, per its attribution reminder) instead of the brief's line — accepted without rewrite, as for 6-1's a880885 — it is attribution, not a model id in the subject/body — cost: none.
Ruling: the added holders of "a cut chosen among options" in the slice-3 comment — left to the review to judge against the probe.
- Task 2 review dispatched (sonnet), package review-989b9e0..e824269.diff
- Task 2 review: ✅ spec, Approved, no Critical/Important. Minors: (1) slice-3 "a cut chosen among options" holders vs the view test's "Greenlight that asks a choice (Cut 2 blue)" at 2p s2 — controller check: CUT_CHOSEN is counted only when the cut has several options (test l.1515 `one ? CUT_FILLED_IN : CUT_CHOSEN`), so seed 2's one-option cut asks a choice but is "filled in"; the two comments are consistent, no change. (2) re-wrap churn in comments around the named edits — accepted. (3) buildCut now seldom reached for a Tier 1 cut project since makersToProject takes cut projects first — parked, no doc change (both still back the cycle).
Task 2: complete (e824269)
- Task 3 dispatched (sonnet), BASE e824269; controller additions: handoff header (date, 3777, retune commits), Done bullet, 95 keys in item 3, files list
- Task 3 implementer: DONE, commit 4465a5f (docs only). Gate: BASE 13.02 s, HEAD 18.92 s (tests figure, best of 3; singles 18.92–19.80; wall 22.3–23.0 s) → the ≤20 s branch; candidates still named.
Ruling: Task 3's review is the controller's own read of its 24-line docs diff (fully shown, four files, every target line as the brief quotes) rather than a dispatched reviewer — a docs-only diff with no logic; the final whole-branch review covers it again — cost if wrong: a wording slip in notes. Finding: the timing bullet's last clause ("the plan's gate ruling is that a time between 20 s and 30 s is recorded") reads as if the gate took the 20–30 s branch; it took the ≤20 s branch by the tests figure — fold into the final fix wave.
Task 3: complete (4465a5f)
- Final review dispatched (opus), range 5b1f1d9..4465a5f, report → final-review.md
- Final review (opus): With fixes; no Critical. I1 (Important, a plan defect in R5/Task 3): 7-3's browser step 8 (l.718–719) and 8-3's (l.784, l.814) expect the turn to run on at 0 actions, unnoted. Minors: M1 "seven" → eight of the ten single-game keys (handoff, plan self-review); M2 the handoff's timing clause (flagged at Task 3); M3 hireGrowthHacker's doc says the agency hire to the ops team "takes" (now never made); M4 the Strategy tally comment skips "a trained Junior declared blue" (4 games). Declined list reviewed: all already ruled or outside the plan (example titles at rules l.1393/l.1882 "the turn goes on" — cosmetic, bodies show the press; left).
Ruling: one fix wave by the controller (a1bfd05) — every fix is text (two test comments, four notes/plan lines), exact words given by the review — Startup file re-run 96/96 and tsc clean after it; M4's holders spot-checked in pf-retune/out/t2.json (2p s1, 2p s2, 3p s2, 3p s3) — the scoped re-review is the controller's read of the 20-line diff — cost if wrong: a wording slip in notes.
- Note: the Startup file's tests figure in that single run was 20.20 s (wall 23.6 s), under the 30 s watch; the gate's best-of-3 stays 18.92 s. Watch it at 6-2a's pre-flight.
- Plan complete. Archived: ledger → docs/superpowers/notes/2026-11-23-startup-retune-ledger.md (final review as appendix); workspace → scratchpad archive-retune.

## Appendix: final review (opus)

## Final review: Startup long-runs retune (5b1f1d9..4465a5f)

Reviewer: final whole-branch review (read-only). Read: the plan (Goal, Architecture, Global Constraints with R1–R8, Review Focus, Tasks), the ledger and its rulings, the pre-flight report, the review package diff, the rulebook l.160–180, the overview spec l.60–75, spec 1a l.64–72, and the code around each named risk. Spot-checks used the pre-flight's probe outputs (`pf-retune/out/t2.json`, `t2lazy.json`, `head.json`), read-only. No tests re-run: no doubt below needed one.

### Strengths

- **D1 is the smallest correct change.** One rules line moves (`startup-simulator.rules:1010`, `Go to engine.` under the end button), and the phase rule `When they have less than 1 action, go to engine.` goes. I checked every actions-phase button: the four free ones (Greenlight, Training, the two dismisses) and the end have no cost line, and every other button costs 1 or 2 actions. So at 0 the rules refuse exactly the paid presses, as the rulebook (l.172–173) asks. The end has no `Only if`, so a seat in its actions always has a live press.
- **"a turn has 3 actions" now pins the new rule.** It pins the paid press refused at 0 with the cost's reason, the free Greenlight accepted at 0, the phase still `actions`, and the end leading to bench cleanup. The other three examples gain explicit end presses. The count stays 243.
- **Task 1 is cleanly separated from Task 2.** Task 1 gates free moves at 0, so it plays HEAD's games; the pre-flight hashed all 20, and the controller confirmed byte equality with the hashed copy. Any later difference is therefore the retune's, not the rules change's.
- **All steering goes through the rules.** `hireDiva` (test.ts:1061) and `makersToProject` (test.ts:1071) return candidate moves into `choose`, which asks `engine.canDispatch`. The ideas list and the Launch at a = 0 do the same. No driver dispatches directly, and `keepsTheRules` still runs after every move.
- **The loop guard is right.** `if (a > ACTIONS_EACH_TURN) throw` (test.ts:1248) is the branch's first statement, ahead of `freeMove()`. Only non-free presses raise `a`. Each is accepted, because `END_ACTIONS` is last in `choose` and always allowed. Free moves are bounded by the per-turn `made` set.
- **The arranged tests really pin their keys.** Both new tests (test.ts:4018, 4039) assert the exact move log, through the view and without it. If the rules refused `HIRE_AGENCY_TO_OPS` or `DISCARD_BENCH`, `choose` would fall through to another candidate, or the turn would end without the press, and the `toEqual` would fail. The reshuffle's pin, 6-1's 2p s4 test (test.ts:4238), asserts `reshuffles === 1` and doesn't merely pass vacuously.
- **The recounted comments are exact.** From `t2.json` I rebuilt every holder list the five tally comments, the replay comment and the two "first seed" comments name: every count and every seed matches. `t2.json` and `t2lazy.json` give identical holders, so R7's lazy `ideas` plays the same games. The totals check out: 700 end presses and 4318 moves; HEAD's 94 required keys − 3 + 4 = 95.
- **The tallies changed only where the plan says.** The removals are `DISCARD_BENCH`, `HIRE_AGENCY_TO_OPS` and `RESHUFFLED`; the additions are `REASSIGN_TO_PRODUCT`, `HIRE_SCOUTED_TO_PRODUCT`, `EXPERIENCED_PAID` and `BADGED_LEADING`. No other `every`/`paths` entry, threshold or Board count changed. The 3p seed-1 test now runs longer (52 moves), which strengthens it.
- **The page round tests the real DOM.** `playtest-fitted.test.tsx` checks the status line at 0, which still shows the actions hint ending "End your actions when you are done.", and presses the end twice.
- **The 7-2b and 8-2a notes are precise.** They name lines, and the 8-2a note correctly moves its "go to crisis" target onto the end button's Then.

### Issues

#### Critical

None.

#### Important

**I1. Two later page plans rely on the automatic end, and nothing notes them** (Risk 2; a plan defect in R5 / Task 3).

- **Where.**
  - `docs/superpowers/plans/2026-10-16-startup-slice-7-3-the-page.md:718–719`, browser step 8: "p0 presses `SELL_BACK` and picks the token. p1 is out of actions, so its turn runs on to p2's. The `p2 — to act` tab is selected." Step 9 then has p2 press `INVEST`.
  - `docs/superpowers/plans/2026-10-16-startup-slice-8-3-the-page.md:784`, browser step 8: "p0 presses `PROMOTE_OPS_L` … p0 is out of actions, so its turn runs on to p1's and the `p1 — to act` tab is selected". Its numbers line, l.814, says "p0's third action ends its turn". Step 9 then has p1 press `ASSIGN`.
- **What's wrong.** After 989b9e0, both seats stay in their actions at 0 until they press "End your actions". The selected tab stays on p1 (7-3) or p0 (8-3), so each step's next assertion and the step that follows it fail.
- **Why it matters.**
  - The handoff's pointer (`2026-10-19-startup-handoff.md:26`) and the two pre-flight notes name only 7-2b and 8-2a, so they read as the complete list of affected plans.
  - 8-3's browser instructions say "A turn that stops at any other step not listed below: stop and report it" (l.760). Each of these plans will stall a browser check and cost a round trip, unless its pre-flight happens to grep for it.
  - The pre-flight's R5 grep used "last action" phrasing and missed "out of actions" / "runs on to".
- **How to fix.** Add a line to each notes file and widen the pointer:
  - In `2026-10-19-startup-notes-for-7-preflight.md`: `- 7-3 (from the long-runs retune): browser step 8 (l.718–719) expects p1's turn to run on to p2's after SELL_BACK at p1's last action; p1 now presses "End your actions" first.`
  - In `2026-10-19-startup-notes-for-8-preflight.md`: `- 8-3 (from the long-runs retune): browser step 8 (l.784, numbers l.814) expects p0's turn to run on to p1's after the CTO at its third action; p0 now presses "End your actions" first.`
  - In the handoff's pointer at l.26, change "7-2b / 8-2a" to "7-2b / 7-3 / 8-2a / 8-3".

  I grepped every other written plan from 6-2a to 10-3: their examples and steps either press the end explicitly or concern bench cleanup, round-start or window steps. Only these two are unnoted.

#### Minor

**M1. "Seven of the ten" should be eight.**
- **Where.** `docs/superpowers/notes/2026-10-19-startup-handoff.md:16`. The same miscount is in the plan's Self-review, `2026-11-23-startup-long-runs-retune.md:700`.
- **What's wrong.** The ten required keys held by one game at HEAD (checked in `head.json`) were:
  - the agency row's hire to the ops team;
  - the scouting's hire to the ops team;
  - the assign to the ops team;
  - a Tier 2 or 3 card launched;
  - the Engineer paid $1 in the ops team;
  - Synergy;
  - the Sales Rep's bonus;
  - the reshuffle;
  - Sales Seminar on a Sales Rep;
  - the Sales Rep's XP bonus.

  After the retune, eight are held by 2 or more games (the plan's own D3 table shows the same). The two that aren't are the agency row's hire to the ops team (0) and the reshuffle (1).
- **Why it matters.** The handoff is the durable record the owner reads.
- **How to fix.** "seven" → "eight", in the handoff (and in the plan if it is kept as a record).

**M2. The handoff's timing clause still reads as if the gate took the 20–30 s branch.**
- **Where.** `2026-10-19-startup-handoff.md:18`, "the plan's gate ruling is that a time between 20 s and 30 s is recorded, not fixed".
- **What's wrong.** The controller flagged this at Task 3 for the final fix wave, and it is still in HEAD.
- **How to fix.** For example: "by the gate's `tests` figure this takes the ≤ 20 s branch; the candidates below are named in case it drifts over".

**M3. Half a stale sentence in `hireGrowthHacker`'s doc.**
- **Where.** `src/games/startup-simulator.test.ts:1037–1038`, "would take a Sales Rep where the agency row's hire to the ops team takes a QA Engineer (3 players seed 4, 4 players seed 3)".
- **What's wrong.** The clause is present tense, but the retuned long runs make no agency hire to the ops team (0 games, the reason that key moved to "counted, not required"). Step 7 made only the sentence's second clause historical ("what was then the long runs' only Cut 2 red").
- **How to fix.** "… where the agency row's hire to the ops team then took a QA Engineer (…)".

**M4. The Strategy tally comment skips the key held by four games.**
- **Where.** `src/games/startup-simulator.test.ts:3249–3251`.
- **What's wrong.** It goes "by three: a trained Junior declared red …; by five: a badged Junior leading …" and omits "a trained Junior declared blue". That key is required and held by four games (2p s1, 2p s2, 3p s2, 3p s3), so the comment implies no required key sits at four.
- **Why it matters.** This is the same kind of gap the pre-flight's R6 closed in two other comments. It is a nit: nothing in the comment is false.
- **How to fix.** Optionally add "by four: a trained Junior declared blue (2 players seeds 1 and 2, 3 players seeds 2 and 3);".

### Recommendations

1. Fold I1 and M1–M3 (and M4 if wanted) into the final fix wave: three docs files and two test-file comment edits, with no code behaviour.
2. **Before merge**, add `docs/superpowers/notes/2026-11-23-startup-retune-ledger.md`. The handoff names it twice (l.9, l.151) and it doesn't exist yet. The handoff says "the controller adds the ledger at the end", so this is a known pending step, but HEAD has a dangling reference until it lands.
3. Optionally, in the commit that adds the ledger, mention that 4465a5f also added the 7-2b note: its subject names only 8-2a's.

#### Risk checks, one each

1. **A human at 0 actions on the page.**
   - **The button.** At 0 every paid button is greyed (opacity 0.5, the reason on hover; `board-controls.tsx:96`), and "End your actions" is live at full opacity, so it stands out. It is the last button, and the status line's hint names it.
   - **The "to act" tab.** `seatToAct` (`seat-status.ts`) reads `view.turn.current`, which stays the seat at 0, so the tab stays on the right seat.
   - **Timers and auto-advance.** None in `playtest.tsx`, `designer-page.tsx` or `src/engine/net` (the only timers are the notice fade and the editor debounce).
   - **Other games.** None used `less than 1 action`: Hearts, Color Match, Venom and Rent Day don't. The language fixtures that use `less than 1 move` are generic test games.
   - **README.** It makes no Startup claim about an automatic end.
   - **Saved logs.** The page persists only the rules text, so no saved Startup log is replayed against the new rules.
2. **Later plans.** I grepped all written Startup plans from 6-2a to 10-3 for "last action", "less than 1 action", "go to engine", "out of actions", "runs on to", "ends its turn" and "turn goes on". I also ran a heuristic over every `it is pN's turn` expectation not preceded by an end press. The noted plans hold, 7-2b (l.110, l.189, l.282–300, l.757/765/776) and 8-2a (l.163–167, l.210, l.505, l.759). The unnoted ones are 7-3 and 8-3 (I1). The other plans' later anchors ("right before `brainstorming()`") still exist.
3. **Steering and the pins.** Covered under Strengths: every steered press goes through `choose`. `makersToProject` passes over Stalled projects, but the cycle's action 3 and `leadForStalled` still reach them, and `a stalled project at the engine` is held by more than 13 games. The two new tests and 6-1's reshuffle test fail if the press is refused or never happens.
4. **Loosening and the comments.** No tally was loosened beyond the plan's named −3/+4. Every count and holder in the recounted comments matches the probe (M4 is an omission, not an error).
5. **Replay and undo across end presses.**
   - Every long-run log holds end presses, 700 in all.
   - The 3p seed-1 (52 moves) and seed-2 (83 moves) tests undo every move, end presses included, and compare each state with the recorded one.
   - The 2-player replay test rebuilds all five logs with `loadLog`.
   - The new Task 1 test undoes the end: it gives back p0's actions phase at 0 with the end allowed, and a second undo gives back the Greenlight.
   - `GameEngine.undo` replays from `initFlow(initial)`, which no longer moves on at 0.
   - No recorded logs or snapshots exist in the repo to go stale.

### Declined to judge

- **Whether the turn should end by itself when no free action is possible at 0** (it would save a click). The rulebook is silent, and the plan deliberately makes the end a press. Outside the plan.
- **Spec 1a l.69** ("A turn moves on by itself after the third action") left unannotated. Ruled under R8 as history; the handoff's Rule-readings line records the reversal.
- **Commit trailers that name the implementer's model.** Ruled in the ledger (Tasks 1 and 2).
- **Task 2 Step 1's tests written as characterization rather than red-first.** Ruled in the ledger, with R1's correction.
- **`buildCut` now largely shadowed by `makersToProject`.** Parked by the controller after Task 2's review.
- **Test time** (18.9 s `tests` figure, about 1.45× BASE, over 20 s wall). Within the plan's gate; I was told not to re-measure.
- **A designer's saved copy of the rules in localStorage keeps the old auto-end line.** That text is the user's own, and "Load sample" gives the new rules. Outside the plan.
- **Later plans' auto-player insertion points** ("right before `brainstorming()`") now land after `hireDiva` / `makersToProject`, which shifts their cadences. Each later plan's pre-flight re-measures, so this is outside this plan.
- **The `playTurn` guard would misfire if a later slice granted more than 3 actions in a turn.** No written plan does: the "has 4 actions" lines in 6-2b, 7-2a and 8-2a are example Givens, not auto-player turns. Speculative.
- **Secondary measures** (a Junior past 2 XP, an Income of $10 or more, 3 Tags) still at 0. The plan explicitly doesn't force them.
- **The three keys moved to "counted, not required" are no longer reached by the long runs.** This is the plan's explicit choice, and I checked their pins instead.
- **Example titles at rules l.1393 and l.1882 still say "the turn goes on"** though it now goes on only after the end. Their bodies show the press; cosmetic.

### Assessment

**Ready to merge: With fixes.**

The rules change is minimal and right by the rulebook, and the auto-player retune is test-side only and goes through the rules on every press. Every tally change is the one the plan names, and every recounted comment matches the probe. Replay and undo across end presses are well covered. No Critical issues.

The one Important issue is a documentation gap that this branch creates: two later page plans (7-3 and 8-3) expect a turn to run on by itself at 0 actions, and the carried notes don't mention them. It is a two-line notes fix plus a wider handoff pointer. The Minors are wording fixes in the handoff and two test comments. Add the pending ledger file before merge.
