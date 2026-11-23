# SDD ledger — plan: docs/superpowers/plans/2026-10-16-startup-slice-6-2b-rules-and-runs-events.md
- Started 2026-11-23 after the speed-up 2 (HEAD 0d9442e). Spec: docs/superpowers/specs/2026-10-16-startup-slice-6-attributes-utility-events-design.md (R1–R3 win) under the overview. builder-check-startup-6.md is gone from the scratchpad; the spec carries its rulings.
- Pre-flight: dispatched (opus) on a local clone at 1b6a4c4 (HEAD since differs only in card-alone.test.ts and docs) → scratchpad pf62b/report.md.
- Sequencing (both plans' Global Constraints): 6-2b T1 → 6-3 T1 (the view reads the card in play) → 6-2b T2–T6 → 6-3 T2–T5. Told the pre-flight agent to probe 6-3 T1 in that slot (findings S1…). 6-3 gets its own pre-flight for T2–T5 after 6-2b.
- Pre-flight (opus) back: NO blocker. 20 fix-in-plan (R1–R3, R5–R21) + 1 ruling-needed (R4) against 6-2b; 4 fix-in-plan (S1–S4) against 6-3 from probing its Task 1 in the slot. Probe (pf62b/work, branch chain2, 25 commits from 1b6a4c4) final 0e8c470: 3814 pass, tsc clean, examples 278 → 305 (N₇+27), other games unchanged (Rent Day 108). Startup file +33.5% (median 19.8 → 27.0 s; 2.7–3.5 s under the watch) — Event flags in six output/bandwidth values take them out of the card-alone cache (63 → 59). Report → docs/superpowers/notes/2026-11-23-startup-6-2b-preflight.md.
- Ruling R4: (a) — a required path the Event deck's replay leaves to fewer than 2 of the 20 games is counted-not-required with a named pin (`HELD_BY_FEWER_THAN_TWO`, 14 paths at the probe, 8 at none), as 6-2a did — why: T1 reshuffles every seeded game, so a retune here is open-ended design work inside a rules plan, and every one of the 14 is pinned by an example or test — cost if wrong: 8 paths seen only in examples until the next retune. Paired with: a mini plan right after 6-2b (before 6-3 T2–T5), "long-runs retune 2 and speed-up 3": aim the auto-player at R4's 14 paths and the older counted keys (Gap 2), and win back the +33% (Gap 1).
- Ruling (timing, l.64 "report if > a third longer"): reported +33.5% median; accepted — under the watch; the mini plan above follows.
- Ruling: every fix-in-plan amendment (R1–R3, R5–R21; S1–S4) accepted as the report writes it — each was built and run in the probe; amendments applied to both plans by one amender agent, with a "Controller amendment (pre-flight 2026-11-23)" bullet in each plan's Architecture. Per-task example ends become N₇ + 4, + 15, + 21, + 24, + 27 (R7, R10, R15).
- Ruling: 6-3 Task 1 runs inside this sequence (after 6-2b T1, before T2) and is ledgered here as "6-3 Task 1"; 6-3's own ledger will record it done, with S1–S3 applied. S4 is 6-3 T5's.
- Ruling: implementers get the probe commit for their task as a cross-check reference (pf62b/work); the amended plan text is the requirement, and a difference from the probe is reported, not copied silently.
- Plans amended at 2228e05 (6-2b +236 lines, 6-3 S1–S4; the controller fixed three stale spots the amender flagged: Trade Show's numbers 7 − 3 − 2 − 2, a numbers line for Chip Shortage's guards, Review Focus "examples 1–3", and 6-3 l.78's scratch path like S4). Briefs re-cut from the amended plan.
- BASE for the plan: 2228e05; full suite 3805 pass; N₇ = 278.

## Conflict scan (from the pre-flight's probe of the amended text)
| Pair / task | Produces → consumes | Found |
|---|---|---|
| T1 → 6-3 T1 | event zones, Event table, `EVENTS` → 6-3 T1's Assumed (S1 split) | consistent after S1 |
| 6-3 T1 → T2 | `inPlayZones` = [] → T2 re-pins ['event in play'] (R8/S2) | named in both plans |
| T1 → T6 | interim `HELD_BY_FEWER_THAN_TWO` (8) → final set (14) | R4(a) text in T1 and T6 |
| T2 → T3 | `Price:`/`Rev:`/`Cost:` sections → T3 refines `cost`, `price` | probe built both |
| T2 → T4 | Event output lines above Burnout's 0 (R3) → T4's Crunch added values after Toxic | line-order probe clean |
| T3 → T6 | Trade Show prices → 6-2a's '$2 with a Sales Rep' key (R17) | T6 narrows the key |
| T5 → T6 | event check, turn checks (R13) → REPLAYED in 2-player (R16) | consistent |
| T1–T5 self | counts N₇+4/15/21/24/27; each example's numbers | agree after amendment; probe passed each |
| Rubric-defect mandates | none (no assert-nothing test; the removal and line-order probes pin every line) | — |
- 6-3 Task 1 brief cut into 6-3's workspace; it runs after T1 here.
- Task 1: BASE 2228e05; implementer dispatched (sonnet). Probe cross-check: f9981cb (T1), 2886ed0 (A1/R2), ddf22de (A3/R3+R4 interim).
- Task 1 implementer agent: abf8ed485aa654279 (resume for fix rounds 1–3).
- Task 1: implementer DONE 258f812 (pushed) — 3807 pass, tsc clean, 282 examples (N₇+4); removal probe: round header gives a diagnostic, the two reveal lines fail examples, Setup's shuffle fails only the new pin (as planned). Test changes taken from the probe's commits (allowed as cross-check; reviewer to judge). Review dispatched (sonnet).
- Task 1 review (sonnet): Approved — all 5 named risks ✅. Minor parked: the game-end Event pin (test.ts ~3634) skips silently if no round start is seen (every long run crosses rounds) — carry to Task 6 / the final fix wave as an assert.
- Task 1: complete (258f812).
- 6-3 Task 1: BASE 258f812; implementer dispatched (sonnet). Probe cross-check: aee551f (as planned), 71ac85e (S2's pin).
- 6-3 Task 1: implementer DONE 92408f7 (pushed) — 3814 pass (+7), tsc clean, no existing test line changed; matches the probe (aee551f + 71ac85e). Review dispatched (sonnet).
- 6-3 Task 1 review (sonnet): Approved — centre defaults false (pressFlags/holderFlags untouched), only public shared zones count, testsCentre walks every group, inPlayZones in Table order, card-alone closed to CENTRE_HAS. Minors parked: testsCentre line >140 chars (worked-view.ts ~326); fixture could assert hidden !== gale; zones matched by string (safe direction). Carry the line wrap into 6-3's next push of worked-view.ts.
- 6-3 Task 1: complete (92408f7).
- Task 2: BASE 92408f7; implementer dispatched (sonnet). Probe cross-check: 8f69782 (T2 as written), 2fc96ae (R6 gates), 8820621 (R8 inPlayZones), afb7311 (R7 gate examples), 30a3be8 (R7 order examples).
- Task 2 implementer agent: a26d23d79ee769a42.
- Task 2: implementer DONE_WITH_CONCERNS e87e5b1 (pushed) — 3814 pass, tsc clean, 293 examples (N₇+15); removal probe: 30 new lines, no survivor; line-order probe: every brief-required move fails. Concern: Hackathon's line moved below the qa-mode/blue-mode 0 lines survives (not required by the brief). Controller's reading: not commutative — a hardware card in QA or Blue mode is 'hackathon boosted' (gate: hardware card OR red mode), so below the mode 0 it would make 1 Red. Review dispatched (sonnet) with this as a named risk.
- Task 2 review (sonnet): Needs fixes — Important: Hackathon's place above the qa/blue-mode 0 lines is unpinned and not commutative (a hardware unit in QA/Blue is 'hackathon boosted'; below the 0 it'd make 1 Red), a gap in the brief too; OSB is pinned by example 7 (any move crosses the red-mode 0 first). Minor: the output invariant's exemption is card-object identity (looser than the brief's list of causes).
- Ruling: fix round 1 adds the reviewer's Fixer-in-QA Hackathon example (Engineer 3 + 1 = 4 red cubes, Fixer 0; a misplaced line gives 5) — 'every rules line is pinned' binds over the brief's probe list; the optional Blue twin is skipped (the one example pins every lower placement while the mode lines keep their order) — cost if wrong: a reorder of the mode lines themselves goes unseen. Counts shift +1 from here: Task 2 ends at N₇+16 = 294, Tasks 3/4/5 at N₇+22/25/28 = 300/303/306; later dispatches carry the shifted numbers.
- Ruling (invariant identity): keep — cards are never changed in place and unchanged cards keep their object across moves (the card-alone cache's 2M hits and the transplant test rest on it), so an identity change means some field changed; field-by-field JSON compares per card per move would cost long-run time the file can't spare (+33%) — cost if wrong: a card re-made with equal data skips one check that move. Parked for the final review.
- Task 2 fix round 1: DONE ffe851b (pushed) — the Fixer-in-QA example verbatim, counts 294 in test/designer/README; 3814 pass, tsc clean; Hackathon moved below the qa-mode 0 fails it, and below the blue-mode 0 too. Ruling: the scoped re-review is the controller's own read of the 13-line diff (it is exactly the reviewer's example plus three counts) — cost if wrong: none beyond the final review.
- Task 2: complete (e87e5b1, ffe851b).
- Task 3: BASE ffe851b; implementer dispatched (sonnet). Counts shifted +1: Task 3 ends at N₇+22 = 300 (brief says +21). Probe cross-check: bcd6e33 (T3), 1926f03 (R9), 3704c87 (R10).
- Task 3 implementer agent: a1ea18f148442f6f8.
- Task 3: implementer DONE 169b076 (pushed) — 3814 pass, tsc clean, 300 examples; removal probe: every line fails an example or compile; line-order swaps that carry a ruling fail; survivors listed as independent. Review dispatched (sonnet).
- Task 3 review (sonnet): Approved — round-start resets before Event lines; Chip Shortage reaches University/agency/scouting/open market with check = charge; discounts can't stack or go below 0; R9/R10 ✅; order survivors carry no ruling (785/786 are guarded by different Events, one in play). Minors parked → final fix wave: the sourcing Hint (rules:1320) says 'at their printed cost', stale under Chip Shortage (a Hint is not exact-copy-bound; reword 'at their cost'); no example of a scouting hire under Chip Shortage (same worked cost the agency example pins).
- Task 3: complete (169b076).
- Task 4: BASE 169b076; implementer dispatched (sonnet). Ends at N₇+25 = 303 (brief +24). Probe cross-check: e1f2087 (T4), 07aacba (R11).
- Task 4 implementer agent: a0921058ec137e973.
- Task 4: implementer DONE e059c7f (pushed) — 3815 pass (+1, the added-values test), tsc clean, 303 examples. Notes: 'not blue covered' pinned only by the added-values test (as the brief names); the Bug line before the new cubes is unobservable (commutative), and its place before the Pending lines and Development QA is pinned. Review dispatched (sonnet).
- Task 4 review (sonnet): Approved — exact copy; Crunch cube after Toxic's (example 3 pins R1); Bug before Pending/QA pinned by example 2; 'not blue covered' pinned by the added-values test; R11 no view pin changed; 303. Reviewer didn't open suwa's apply_crunch_time_bonus (the pre-flight checked §20.D's numbers). Minor: README's 'still leaves out … Events and Crunch Time' — Task 6 rewrites it (R19).
- Task 4: complete (e059c7f).
- Task 5: BASE e059c7f; implementer dispatched (sonnet). Ends at N₇+28 = 306 (brief +27). Probe cross-check: 0ee804d (T5), d4c5594 (R5's Whistleblower lines), ad9c27f (R13), 00a8be1 (R14), 71c546d (R15).
- Task 5 implementer agent: ae1d91dc2670a7db3.
- Task 5: implementer DONE b6eb33f (pushed) — 3816 pass, tsc clean, 306 examples, Startup ~25 s; removal probe no survivors (steps line, pay-and-pass rule and phase header give diagnostics); Phase: event check's place pinned by the PHASES order test, not an example; R5's Whistleblower line added to the three examples that failed (Server Crash already has it from Task 2). Review dispatched (sonnet).
- Task 5 review (sonnet): Approved — exact copy; Angel (dev+ops, ≥1 product, all Tier 1) and Audit ($1 per salaried, 0–1 XP Juniors exempt, pay as soon as able, let-go only of taxed, fired as at Income) match §20.D and suwa; flow pinned by examples 1–2; R13 exact and not vacuous; R14 reaches the waiting let-gos. Minors parked → final fix wave: a guarded capital>=0 loop duplicating the 'capital below 0' check (test diff +490); stepsDone's null for roundStepsOf === true wants a comment.
- Task 5: complete (b6eb33f).
- Task 6: BASE b6eb33f; implementer dispatched (sonnet). Examples stay 306. Controller addition: Task 1's parked minor (the game-end Event pin's soft 'if (revealed !== null)' → assert). Probe cross-check: d8aee6f (T6), 44e8843 (R16), cc07c0c (R4 final set), 3e4d934 (R17); R7/R18 already in Tasks 2/1.
- Task 6 implementer agent: aa804ee50a447bb13.
- Task 6: implementer DONE a526ffe (pushed) — 3817 pass, tsc clean, 306 examples, other games 100 tests (Rent Day 108). HELD_BY_FEWER_THAN_TWO final 14 (8 at none, 6 at one — same as the probe; 'Buff on a bench card' and 'Clean Coder played' came out). Removal probe 309 lines: 9 survive the examples, each fails 1–5 tests (Toxic gates, not blue covered, Shuffle the event deck). Step 5 + R20 clean. Timing (tests, alternating): BASE 2228e05 best 20.56 (22.29/21.65/20.56) vs a526ffe best 26.04 (26.04/27.85/29.57) — ratio 1.27 best, 1.29 median, under the 1.33 report line; HEAD's runs rose run to run, the last 29.57 s near the 30 s watch. Stale seed comments corrected (Attributes-boxed and Workaholic-at-the-Engine tallies now 0). Review dispatched (sonnet).
- Task 6 review (sonnet): Approved — set of 14 filtered exactly; the two that left are required again; R16 counted and required in the 2-player replay; R17 reads worked price; game-end pin strict; README per brief; Event keys ungated. Minors → final fix wave: the set's doc comment names no pin for 'a trained Junior declared red' (rules ~3595/3617); a self-contradicting comment at test.ts ~4065 ('Held by none … but by one game'). Parked: ANGEL_PAID inferred from a predicate on before, not an observed $3 (examples + 12-game tally cover it).
- Task 6: complete (a526ffe).
- Final review: range 2228e05..a526ffe (6-2b T1–T6 and 6-3 T1), opus.
- Final review dispatched (opus, background); report → final-review.md.
- Final review (opus): With fixes — 0 Critical, 0 Important, 9 Minor (final-review.md). Focus 1–4 and 6 clean; 5 (timing) Minor.
- Ruling (final wave scope): fix Minors 1, 2, 3, 4, 6, 7 in one dispatch (sonnet); examples 306 → 307 (Chip Shortage sourcing hire) — the rulebook §20.D names Source, and sourcing alone pays through `the total cost of the picked cards` — moving the three count pins is cheap. Minor 6 (the "at work" tallies count a unit zeroed by a mode/onboarding/Burnout line) fixed now: the tallies should count what the effect did, and the keys are held by 10–15 games — cost if wrong: a key dips under 2 games, which the run shows at once.
- Ruling (Minor 5, timing): to the mini plan "long-runs retune 2 and speed-up 3"; forwarded to the speed probe (perf3) — 26.04 s is under the 30 s watch.
- Ruling (Minors 8–9, shared doc comments and positional booleans in worked-view.ts/card-alone.ts): leave to 6-3 Task 2's edit of worked-view.ts (or to speed-up 3 if it rewrites card-alone.ts first) — keeps this wave out of src/engine/** — cost if wrong: a maintainer reads a stale comment meanwhile; the card-alone pin tests still guard the behaviour.
- Rulings (parked): ANGEL_PAID left (the money check asserts the $3 on the same move); identity exemption left (ledger ruling); testsCentre wrap → 6-3 T2.
- Final fix wave: BASE a526ffe; implementer dispatched (sonnet), brief final-fix-brief.md, report → final-fix-report.md.
- Final fix wave: DONE_WITH_CONCERNS (872a6b0) — 3817 tests (the example runs inside 'passes every example', so no new test), examples 307 in three pins; at-work keys 10→9, 14→12, 15→12 games; mutation checks bite (item 6 via the examples, item 3 via the remaining capital check). Re-review dispatched (sonnet), package review-a526ffe..872a6b0.diff.
- Re-review (sonnet): all findings addressed, no new Critical/Important; Minor: the new example's title overclaimed a Junior contrast → controller trimmed it (8aedd05); two long comment lines (cosmetic, left). Controller verify: bun run test 3817/3817, typecheck clean, examples 307. Pushed 8aedd05.
- Plan 6-2b: complete.

## Appendix: the final review (opus), adjudicated above

## Final review: plan 6-2b (Events) and plan 6-3 Task 1, range 2228e05..a526ffe

Reviewer: opus, read-only on the checkout. I read the review package in three passes (shared code and README; rules; test file). I also read the plan, the pre-flight report, the ledger and rulebook §5, §12, §13, §15.D and §20.A/D.

I ran three things outside the checkout. Each used a `git archive` copy in the session scratchpad, with node_modules symlinked:
1. The 20 long-run games at HEAD, instrumented to record which games hold each tally key. This checks focus 3.
2. A check of who makes each move in the event check. This checks focus 4.
3. Alternating timing runs at BASE and HEAD, with each long-run watch timed. This checks focus 5.

I did not run the full suite.

#### Strengths

- **The round-start order is right, and every Event-set number is reset before the new Event's lines run.**
  - The rules order is: move the old Event out; deal the new one; set `license` to 3, `junior price` to 2 and `hardware junior price` to 2; then the new Event's `If …` lines; then the `acting once` steps line, last.
  - Every other Event effect is a worked value. Each is gated by a flag whose first line reads `the event in play has …`, so nothing is stored that could outlast the round.
  - A long-run invariant checks the three game numbers against the Event in play after every move. It is not vacuous: Patent Trolls, Intern Season and Chip Shortage are each revealed in 2 to 14 games, and another round follows each.
  - Examples pin each effect's end at the next Round Start:
    - Tech Bubble: p0's Income after the reveal is $1 lower;
    - Patent Trolls: the License goes back to $3;
    - Intern Season: the price goes back to $2;
    - Hackathon then Logjam: red supply goes 2 → 0.
- **Every number matches the rulebook.** I checked every rules line and every number in all 28 new examples against §20.D (and §20.A for Strategy prices, §13.C for the $1 and $2). Examples:
  - Chip Shortage: 30 → 25 → 16 → 12 → 6.
  - Online Course Boom: the $2 Workaholic is refused at $1.
  - Audit: p1 pays its last $1 after two let-gos.
  - Crunch: Cloud Storage gets 4 blue and 1 red.
- **The design calls are sound and recorded.**
  - Event output lines sit above the mode and Burnout zero lines, so they reach only the colour a unit works in.
  - Server Crash has a floor of 0.
  - Legacy reads `decaying`.
  - Crunch Time's cube is added after Toxic's cube is taken.
  - The Audit's "pay as soon as able" means a player who can pay can't let staff go instead.
  - §12.2's "the Event in play" at the game-end Ops check is honoured: no reveal happens after the last round.
- **6-3 Task 1 is small and safe.**
  - `CENTRE_HAS` is the only condition queue-phrases registers, and that is pinned by a spy test.
  - The centre path counts only shared zones with public visibility.
  - `testsCentre` keeps Event flags off every face.
  - The Startup pin asserts that none of the 17 Event flags is shown.
  - No banned word, protected file or other game is touched (I grepped the shared diff: no matches).
- **The turn checks (R13) are real checks.** See focus 4 below.

#### Focus areas, answered

1. **Leaks past Round Start: none.** Reasons in Strengths. `cost`, `rehire price`, `price`, `payroll tax`, `blue reached`, `blue added` and `red added` are all worked live from the Event in play. Bugs that Crunch adds are real tokens, as the rule wants. No Event-dependent value is card-alone (next item).
2. **The card-alone cache is safe.**
   - `card-alone.ts` builds its own trust set from the card-number, card-value and card-subject libraries. `CENTRE_HAS` is registered by queue-phrases, so `ABOUT_THE_CARD.get('condition', CENTRE_HAS)` is undefined, and `namesRead` returns null. Its argument types (`sharedzone`, `card`) are also outside `OF_THE_CARD`.
   - worked-view's new `centre` path is a separate function. The cache never calls it, so it can't widen what the cache trusts.
   - A `CardMatch` is raw data equality, so a centre test can't smuggle in a worked flag of another card.
   - Two tests would catch a regression: card-alone.test's TRUSTED pin, and its transplant test (its sampled states span several Events).
   - The pre-flight's T6 list agrees: 63 → 59 values. Six left (the outputs, the bandwidths and learning blue/red) and two arrived (`acting once` and `past tier 1`, which are card-only).
3. **`HELD_BY_FEWER_THAN_TWO` is exact.** My instrumented run gives the same 14 keys: 8 held by no game and 6 by exactly one game, in the games the comment names. No key held by 2 or more games is excused. The other one-game keys (16 in all) are counted, not required, in their own tests. Every one of the 14 has a pinning example or test. But the doc comment misnames one pin and omits another (Minor 1).
4. **The R13 checks are not vacuous.**
   - `waited`/`stepsStarted`: if the round counted at the turn start instead of the steps start, or counted twice, a check fails. The waiting path occurs in the long runs (let-gos in 4 games).
   - `keepsTheBudget`'s reorder is exercised: in 2 players seed 4 and 3 players seed 1, the start player was short, let go, and its own turn started in its own move.
   - The money check would fail if Angel didn't pay (12 games) or the Audit didn't tax (3 games). A missing event check falls back to "all seats ended", so the expected tax is still deducted.
   - `finalCheck` only skips event-check moves from turn counting. Separate checks cover the phase (steps present, Angel or Audit in play) and the let-go target (taxed only).
5. **Timing: the largest avoidable cost is the new per-move outputs invariant (Minor 5).** Numbers below.
6. **Constraints hold.**
   - Protected files and other games are unchanged.
   - No banned word appears in the shared diff.
   - The core stays pure, and no new `lang:*` key is added.
   - The page source is untouched; only `designer-page.test.tsx`'s count changed (306).

#### Issues

##### Critical (Must Fix)

None.

##### Important (Should Fix)

None.

##### Minor (Nice to Have)

1. **The `HELD_BY_FEWER_THAN_TWO` doc comment misnames one pin and names none for another** (`src/games/startup-simulator.test.ts:1548–1565`).
   - What's wrong:
     - For 'hire a card from the agency row to their bench' it cites 'a Sales Rep hired from the open job market costs 1 …', which is an open-job-market hire. It also cites 'the Hacker hired from the agency row straight onto a project …', which is a hire to a project. Neither presses an agency-to-bench hire.
     - 'a trained Junior declared red' has no pin named.
   - Why it matters: the plan (Task 1 Step 1, R4(a)) requires each path's pin to be named. R4(a)'s acceptance rests on it.
   - The pins do exist, so this is documentation, not coverage:
     - agency to bench: 'the agency row slides left and refills from the talent deck, which never reshuffles (section 13)' hires the Architect and the Hacker to the bench; the Chip Shortage example hires the Engineer and the Firmware Specialist to the bench.
     - trained Junior declared red: 'a Junior Software Dev with 2 Blue XP and a Red Skill token declared Red makes 1 Red …', and the Hackathon/Logjam Junior QA Tester example.
   - Fix: name those examples.
2. **Two self-contradicting "Held by" comments** (test.ts:4065 and ~3943).
   - 4065 says "Held by none, the fewest: a trained Junior declared red, but by one game (5 players seed 2)". It was held by one game; the 'none' is wrong.
   - Fix: reword to "Held by one game, the fewest: a trained Junior declared red (5 players seed 2), in `HELD_BY_FEWER_THAN_TWO` …".
3. **Duplicate checks and helpers in the money check** (test.ts:2330–2348, and `stepsEndedIn` at 1641).
   - The guarded `for (const seat of ended) if (… capital < 0) expect(…)` is fully covered by the "capital below 0" check three lines later, which looks at every seat on every move. Delete it.
   - `stepsDone` (2330) copies `stepsEndedIn`'s inner `done` (1641). Put one module-level helper in their place.
   - That helper needs a comment on why `roundStepsOf(state) === true` reads as null. `true` lives only inside a move (runtime.ts:425 clears it as the waiting turn starts), so a state a move leaves never holds it. The `?? seats` fallback then means "all done".
4. **The sourcing Hint says "printed cost"** (`src/games/startup-simulator.rules:1371`). This is stale under Chip Shortage, where a hardware card found by sourcing costs printed + $3 (§20.D 9 names "Source"). A player reading the Hint under Chip Shortage would expect the wrong price. Fix: "at their cost". A Hint is not exact-copy-bound.
5. **Timing: the new outputs invariant is about 10% of long-run time** (test.ts:2774–2791).
   - Measurement: the 20 long-run games alone (`-t "building on the Board"`), alternating runs, 4 cores, load 1.8–3.3:

     | | BASE best | HEAD best |
     |---|---|---|
     | Total | 10.56 s | 14.35 s |
     | Moves | 4297 | 4464 |
     | `keepsTheRules` | 4.62 s | 7.35 s |
     | of which the outputs invariant | — | 1.43 s |
     | `happenings` | 1.46 s | 1.78 s |
     | Engine and auto-player | ≈4.45 s | ≈5.19 s |

   - So the long-run delta is +3.79 s:
     - +2.73 s is the test's own checks; the outputs invariant alone is 1.43 s, 38% of the delta;
     - +0.74 s is the engine and auto-player (+17%; moves are up 3.9%).
   - Across five HEAD runs the outputs invariant took 1.43–2.59 s, always 9.7–10.3% of the run.
   - The card-alone loss (63 → 59) costs the test's invariants far more than the engine. Each staff card now evaluates `blue output` and `red output` uncached up to 6–7 times per move:
     - 4 times on `after`;
     - twice on `before`, values the previous move already worked out as its `after`;
     - and `blue bandwidth` evaluates `blue output` once more.
   - Not blocking: the file's best of 3 is 26.04 s, under the 30 s watch. For speed-up 3:
     - keep a per-state memo of worked values in the long-run watch (`WeakMap<GameState, Map<string, Json|null>>`; states are immutable, so it is sound), so each move's `before` reuses the last move's `after`;
     - run the `< 0` scan only for cards whose object changed, or when the Event moved. This is sound by induction with the equality half.
     - Engine-side, a per-card cache keyed by (card object, the shared zone's card array) would win back most of the rest.
6. **The "at work" tallies count a unit zeroed by a mode, onboarding or Burnout line** (test.ts:2111, `makes`). These are `Open Source Boom at work`, `Hardware Hackathon at work` and `Supply Chain Logjam at work`.
   - `makes` asks only that `blue output` or `red output` is not null. An `… is 0` line makes it 0, which is not null. So a project whose only staff are onboarding or in QA mode counts as "at work" though no +1/−1 applied. This follows the plan's own wording, so it is a plan-level imprecision.
   - It is harmless today: the keys are held by 10–15 games, and examples pin each effect.
   - Fix: count a staff card that holds the Event's flag (`open source boosted`, `hackathon boosted`, `logjammed`) and is not `onboarding`, `burned out` or in the other two modes.
7. **No example of a sourcing hire under Chip Shortage.**
   - §20.D 9 names four sources. The University, the agency and the open job market are pinned. Sourcing pays `the total cost of the picked cards`, a different phrase from the agency's `the card's cost`.
   - The long-run money check reads the worked `cost`, so a printed-cost regression would show only if a sourcing hire of a hardware card falls under Chip Shortage in some seed.
   - Fix: add one example (a Layoff finds the Diva under Chip Shortage and hires her for $8). The examples become 307, which moves the three count pins.
8. **The shared doc comments describe the old rule** (`src/engine/core/lang/worked-view.ts:1–10` header, `standIns` at 116–120, `shownFlags` at 132–136). Also `card-alone.ts:1–6`.
   - The worked-view comments still say a shown value reads "nothing but the card and the cards on it". It now may also read a public shared zone.
   - card-alone.ts's header says it reads "as worked-view's `readsOnlyCards` reads them", but must never follow the new centre path.
   - Why it matters: a maintainer who "aligns" the two would cache Event-dependent values. The tests would probably catch it (see focus 2), but the comments should say so.
   - Fix: one sentence in each place. Do it in 6-3's next push of worked-view.ts (Task 2 exports `thenRefs` there), together with item 9.
9. **Line length and positional booleans in shared code** (worked-view.ts:145).
   - `testsCentre` is 157 characters.
   - `readsOnlyCards(game, name, new Set(), false, false, true)` now carries three positional booleans at three call sites. An options object (`{ holder, owner, centre }`) would read better.
   - Fold this into 6-3 Task 2's touch of the file.

#### Parked minors — adjudication

| Parked minor | Ruling | Reason |
|---|---|---|
| Rules ~1320 (now 1371) sourcing Hint "at their printed cost" | **Fix** in the fix wave | Minor 4. One word, wrong under Chip Shortage, not exact-copy-bound. |
| Guarded `capital >= 0` loop duplicating "capital below 0" | **Fix**: delete | Minor 3. Strictly covered by the all-seats check on every move. |
| `stepsDone` null for `=== true` without a comment | **Fix**: comment, and merge with `stepsEndedIn`'s `done` | Minor 3. |
| `HELD_BY_FEWER_THAN_TWO` comment names no pin for 'a trained Junior declared red'; test.ts ~4065 contradicts itself | **Fix** | Minors 1–2. Also correct the agency-to-bench pin names. |
| ANGEL_PAID inferred from a predicate on `before` | **Leave** | The money check asserts +$3 for exactly the seats the same predicate names, on the same reveal move. So a tally without the payment fails conservation in that move. No press can change a seat's products between `before` and the reveal within one move. |
| Output invariant's card-identity exemption | **Leave** (agree with the ledger's ruling) | Cards are never changed in place, so a new object means changed data. Field-by-field compares would add cost to the invariant that is already the largest avoidable cost (Minor 5). |
| worked-view.ts ~326 (now line 145) long `testsCentre` line | **Leave to 6-3 Task 2** | That task edits worked-view.ts anyway (Minor 9). Keeps this plan's fix wave out of `src/engine/**`. |
| No example of a scouting hire under Chip Shortage | **Fix** (add one example) | Minor 7. §20.D names Source, and it is the one source using a different price phrase. Leaving it is defensible only if the controller wants to avoid moving the three count pins. |

#### Declined to judge

- **Server Crash on every card's Blue bandwidth.** It acts on every card with Blue bandwidth, not on "software" skill: a spec call, recorded. It is equivalent in effect, since only units working in Blue have bandwidth above 0.
- **Logjam leaves a hardware unit's QA output alone in QA mode.** A spec call, recorded and pinned.
- **Crunch "still needs Blue" counts this turn's team output.** This follows suwa's `apply_crunch_time_bonus`, which the pre-flight checked. I did not open the Rust.
- **The Audit lets go only of taxed staff.** A spec call; the rulebook is silent on whom.
- **R4(a)'s policy itself** (counted-not-required instead of a retune). Ruled by the controller. Speed-up 3 / retune 2 carries it.
- **The replay tests' one-seed requirements.** The 2-player strategy reshuffle and strips (seed 4), and the 3-player strips (seed 5), are still required although one seed holds each. This predates this plan; the 2-player reshuffle was seed-4-only at BASE.
- **The Setup `Shuffle` lines other than the Event deck's survive the examples** (pre-flight Gap 4). Pre-existing.
- **Seed-specific "Held by …" counts other than the 14 keys and the Event keys.** I verified only those against my instrumented run.
- **The removal and line-order probes.** I trusted the ledger and the pre-flight logs and did not re-run them.
- **The page's display of the Event, the prices and the event-check buttons.** Plan 6-3 Tasks 2–5.
- **Venture Capital Rain, Recruiter Frenzy, Headhunter Holiday, Whistleblower Protection Act, and Patent Trolls' other fees.** Later slices, by plan.
- **No Startup example has the start player short at the Audit.** Shared `round-steps.test.ts` ('with them …', p0 waiting) and two long-run games (2 players seed 4, which is also replayed, and 3 players seed 1) cover it. A tally key for it would keep a retune from dropping it silently, but the plan did not ask for one.

#### Recommendations

- The fix wave takes Minors 1–4 and 7 (test comments, the duplicate loop and helper, the Hint, one example). Minors 8–9 go with 6-3 Task 2's edit of worked-view.ts. Minors 5–6 go to the planned speed-up 3 / retune 2 mini plan.
- Speed-up 3 should start with the test side, not the engine. In my measurements 72% of the long-run regression is `keepsTheRules` (+2.73 of +3.79 s); the engine and auto-player are +0.74 s. A per-state memo in the watch, plus a narrower outputs invariant, should recover most of it without touching shared code.

#### Assessment

**Ready to merge?** With fixes

**Reasoning:** No Critical or Important issues. Event effects can't leak past a Round Start, the card-alone cache can't trust a centre read, the 14 excused keys are exactly the ones fewer than two games hold and each has a real pin, and the R13 checks fail on a broken rule. The fixes are small comment, Hint and test-hygiene items from the parked list, plus one missing Chip Shortage sourcing example. None needs a re-review beyond the controller's read.

## Appendix: the final fix wave's brief

## Final fix wave — plan 6-2b (one dispatch)

Read `final-review.md` in this directory first: its Minors 1, 2, 3, 4, 6 and 7 are your requirements, with the file:line references and the fixes it names. Do not fix Minors 5, 8 or 9 (ruled elsewhere).

1. Minor 1 — `HELD_BY_FEWER_THAN_TWO`'s doc comment in `src/games/startup-simulator.test.ts` (~1548–1565): name the real pins for 'hire a card from the agency row to their bench' (the agency row slide-and-refill example and the Chip Shortage example that hires to the bench) and for 'a trained Junior declared red' (the Junior Software Dev declared Red example, and the Hackathon/Logjam Junior QA Tester example). Use each example's exact title, as the comment does for the others (grep the rules file for the title).
2. Minor 2 — the self-contradicting "Held by" comments (~4065, and check ~3943): reword so each says how many games hold the key, as the review proposes.
3. Minor 3 — delete the guarded `capital >= 0` loop that the "capital below 0" check covers; replace `stepsDone` (~2330) and `stepsEndedIn`'s inner `done` (~1641) with one module-level helper, with a comment saying why `roundStepsOf(state) === true` reads as null (it lives only inside a move; runtime.ts ~425 clears it as the waiting turn starts) and what the `?? seats` fallback means.
4. Minor 4 — `src/games/startup-simulator.rules` ~1371: the sourcing Hint's "at their printed cost" → "at their cost".
5. Minor 6 — the "at work" tallies (`Open Source Boom at work`, `Hardware Hackathon at work`, `Supply Chain Logjam at work`; `makes` ~2111): count a staff card only when the Event's +1/−1 actually applied to it — it holds the Event's flag and is not onboarding, burned out, or in a mode whose line zeroes its output in that colour. Read the rules' output lines to get the exact conditions. Each key must still be held by at least 2 games (they are required); report the before/after game counts.
6. Minor 7 — add one example: a sourcing hire of a native Hardware card under Chip Shortage pays printed + $3 (rulebook `/home/user/suwa/rulebook.md` §20.D, Chip Shortage; and the sourcing rule). Put it beside the other Chip Shortage examples, in their style (Given/When/Then, a title that cites the sections). Check the card's printed cost in the cards data; do not trust the review's "$8" without checking. Startup's example count becomes 307: update the three count pins (the Startup test's example count, `README.md`, `src/pages/designer/designer-page.test.tsx`) and nothing else.

Constraints: no change under `src/engine/**` or `src/utils/**`; protected files untouched; every number from the rulebook; Hearts, Color Match, Venom, Rent Day (108 examples) unchanged; no Startup words in shared code; every invariant still runs after every move; commit by pathspec, never `git add -A`.

Verify: `bunx vitest run src/games/startup-simulator.test.ts` passes; `bun run test` passes (3817 + 1 = 3818 expected; report the real number); `bun run typecheck` clean; a mutation check for item 6 (break one Event's +1 line and show the matching "at work" key or its example fails) and for item 3 (make a seat's capital go below 0 and show the remaining check still fails).

Commit message (one commit):
fix(games): Startup Simulator's sourcing under Chip Shortage pays the raised price in an example, its sourcing hint says "at their cost", and the long runs count an Event at work only where its +1 or −1 applied, with named pins and one helper for the round steps

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
