# SDD ledger — plan: docs/superpowers/plans/2026-10-16-startup-slice-6-2a-rules-and-runs-attributes-and-utility.md

- Started 2026-11-23 after the long-runs retune (HEAD 83ab6f9). Spec: docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md.
- Pre-flight dispatched (opus, own copy pf62a/), report → preflight.md
- Pre-flight back (preflight.md): no blocker, no shared-code change; every task applied in pf62a/work (base 702ec9c = 83ab6f9), full suite 3777 → 3782, tsc clean, Rent Day 108.

## Pre-flight rulings
- Ruling: R1 (scoreOf takes (state, seat)) — accepted — HEAD's signature; cost if wrong: none (Assumed list only).
- Ruling: R2 Buffs only on turns with t % 3 === 0 — the only probed cadence that keeps all 95 keys and the three seed-pinned tests (Engineer-in-ops, two reshuffle checks); cost if wrong: fewer Buffs in the runs (still 3+6 games hold the Buff keys), revisited by Gap 5's later cadence work.
- Ruling: R3 (a)–(d) narrow Task 1's Training checks to isTraining, conservation counts only STRATEGY_CARDS in the box, the held-count check defers the box to Task 2 — accepted — each refuses a legal Buff/eviction otherwise; cost if wrong: a looser invariant than planned (the narrowing is exactly the card kinds the rules let through).
- Ruling: R4 fitted page pin gains DEBUFF (Task 1) and TO_PRODUCT/ALONE (Task 5) — accepted — the page offers every Strategy button greyed with a reason; whether it should is 6-3's (Gap 2).
- Ruling: R5 box invariant admits attributes-in-play cards boxed with an evicted Talent; pressFlags gains 'egotistic' — accepted — the Diva's Ego line isn't a library phrase, so the flag stays; showing it is 6-3's (Gap 1).
- Ruling: R6 Task 3 anchors fitted to HEAD ("working blue/red xp"; visionary lines added to HEAD's Leading groups in G4 form) — accepted.
- Ruling: R7 Workaholic's +2 reads three per-colour flags (overworked in blue/red/qa) — accepted; serious — outputs start at 0 (they refine no table column), so the plan's line gave +2 in every colour and failed its own examples 1–2; cost if wrong: three extra flags in the view's pins (the view keeps its stand-ins and supplies, checked).
- Ruling: R8 example 6 amended, example 8 appended (counts 260/269/275) — accepted — pins two visionary lines and the mode alternatives the removal probe found unpinned.
- Ruling: R9 Task 4 flags in G4 form; plan's Gap 1 deleted — accepted — keeps stand-ins and supplies; shownFlags gains only 'burned out'.
- Ruling: R10 drop 6 redundant lines, add 3 made-values cases — accepted — the probe shows those lines changed nothing; every remaining added line is then pinned (182 lines, verified).
- Ruling: R11 Toxic invariants narrowed to teams/pools holding a Toxic card — accepted — only those can make less than their team value; saves ~12 s; cost if wrong: an invariant breach in a non-Toxic team goes unseen (none can occur: the losing flags need a Toxic holder).
- Ruling: R12 Task 5's three shifted tests (backlog ≤ 9, undo 55, Growth Hacker test boxes Sprints) and the Growth Hacker in example 1 — accepted.
- Ruling: R13 Task 6 requires the 18 keys held by 2+ games; 11 new keys and the existing scouting-to-ops key become counted-not-required, each with a named pin (the scouting key and TechCrunch $2 get arranged tests) — the user delegated calls; the retune's rule is "required only when 2+ games hold it"; cost if wrong: 12 behaviours checked by arranged tests and examples rather than by the long runs.
- Ruling: R14 recount every tally-comment holder list from a probe of the final runs — accepted — the retune made those exact; stale comments mislead later cadence work.
- Ruling: R15 accept the memo (3-player games kept for replay); the plan's "a third over BASE" limit is replaced by "best of 3 ≤ 30 s" (the watch); a speed-up mini plan follows 6-2a, before 6-2b — the probe's ~27.5 s is under the watch, and 6-2b's events will add more rules text, so the speed-up belongs before it; cost if wrong: 6-2a's implementers wait ~7 s longer per Startup run.
- Ruling: R16 README: "Hype and Scandal" → "Scandal" — accepted.
- Gaps 1–5 → the plan's forward notes (6-3: egotistic label, greyed Strategy buttons, shown-flags list; 6-2b: price floor; later: the 12 counted keys). Gap 6 answered by R15's ruling. Gap 7: briefs re-cut after the amendment.
- Plan amendment dispatched (opus) → amend-report.md.
- Plan amended (amend-report.md), plus the memo's two stale comments added to Task 6's recount; committed and pushed. Briefs and constraints.md re-cut (Gap 7).
- Ruling: R3(d) (isTraining on the TRAINING_ON key and the replay's Training counter) was never run in the probe — keep it; it only narrows counts that Training presses already fill; cost if wrong: the 2-player replay's 'Training that asked a choice' count falls to 0, which Task 1's run shows at once.
- Ruling: R13's two arranged tests (pitched pick, scouting hire to ops) are prose-only in the plan — Task 6's implementer writes them in 4-2's arranged shape; cost if wrong: a review round.

## Conflict scan
| Pair / task | Produces → consumes | Found |
|---|---|---|
| T1 → T2 | counts, attributes-in-play pile, held-count invariant → T2's strips/eviction, narrows held check to non-box | consistent (R3c/R5 amended; probe ran in order) |
| T1 → T3, T4 | counts (workaholic, clean coder, visionary, toxic personality, burnout) → flags in G4 form | consistent |
| T1 → T5 | playtest-fitted offered list [PLAY, DEBUFF, FLUSH] → T5 adds TO_PRODUCT, ALONE after DEBUFF | consistent (R4) |
| T3 → T4 | shownFlags pin (overworked ×4 first) → T4 adds 'burned out' after them | consistent |
| T4 → T5 | shownFlags pin → T5 adds 'pitched' after 'burned out' | consistent |
| T1–T5 → T6 | moves PLAY_DEBUFF/TO_PRODUCT/ALONE, keys, REPLAYED watch → tallies, replay memo | consistent (R13/R15) |
| T1–T5 shared files | rules, test, README count, designer-page count | sequential edits; counts 246/252/260/269/275 agree across Global Constraints and pins |
| Each task self-consistent | tests vs code vs examples | probe applied each task as amended: focused tests pass, removal probe clean (182 lines), tsc clean |
| Rubric-defect mandates | none found (made-values test asserts values; no duplicated logic block mandated) | — |
- Task 1: BASE 8c19086; implementer dispatched (sonnet, a895290f58db18c1c).
- Task 1: implementer DONE 24cfa53 (3779 pass, tsc clean, 246 examples, removal probe clean, Startup tests 22.96 s alone); review dispatched (sonnet).
- Task 1 review: ✅ spec, Approved, no Critical/Important. ⚠️ checked by controller: `kind` column is `Attribute` (rules l.117–119); a second copy on one Talent can't happen (each Attribute has 1 copy, parked while held), so the ≤1 invariant is structural. Minors parked: README "leaves out … (Attributes, …)" stale until Task 6's README step (which drops them); no Buff own-seat invariant (button zones guard it); no check that a Buff/Debuff card lands in attributes-in-play specifically (conservation + held⇔in-play cover it).
- Task 1: complete (24cfa53).
- Task 2: BASE 24cfa53; implementer dispatched (sonnet).
- Task 2: implementer DONE 5cf08a6 (3779 pass, tsc clean, 252 examples, removal probe clean, Startup tests 24.88 s one run); review dispatched (sonnet).
- Task 2 review: ✅ spec, Approved, no Critical/Important. Minors parked: the ride-along invariant runs attributesOn (6 tokenOn) for every card on every move — gate on "held any count" (safe) — carry to the speed-up mini plan; `named` reverse lookup rebuilt per card; parkedBoxed alone is loose (per-card evicted branch ties it). Ruling: leave the invariant as committed — it passed the review, and the speed-up mini plan after 6-2a owns test-time work; cost if wrong: ~a second of test time until then.
- Task 2: complete (5cf08a6).
- Task 3: BASE 5cf08a6; implementer dispatched (sonnet).
- Task 3: implementer DONE 046f25d (3779 pass, tsc clean, 260 examples, removal probe clean, Startup tests 27.97 s one run); review dispatched (sonnet).
- Task 3 review: ✅ spec, Approved, arithmetic checked against the brief, no Critical/Important. Minors: the 'stands each need in for its cost …' title/comment and the README's "red labels" bullet still list only Stalled/Efficient in ops/Experienced/Practised — carried to Task 6's dispatch (after Tasks 4–5 add 'burned out' and 'pitched'); the Hacker invariant reuses `attributes` with a second noneOf (harmless); a Buff `which` computes state it may not use (trivial).
- Controller timing at 046f25d (Startup file alone, `tests`): 27.27 / 28.15 / 28.84 s → best 27.3 s (probe had 25.4 s at T3). Ruling: carry on with Tasks 4–6; the 30 s figure is the watch that triggers the speed-up mini plan, which already follows 6-2a — if Task 6 lands above 30 s, record it and do that mini plan next (not a reason to stall 6-2a); cost if wrong: one slice runs ~1–3 s over the watch until the speed-up.
- Task 3: complete (046f25d).
- Task 4: BASE 046f25d; implementer dispatched (sonnet).
- Task 4: implementer DONE 3aa8ae8 (3780 pass, tsc clean, 269 examples, removal probe: 8 survivors = the brief's made-values lines, each fails that test; Startup tests 27.19/27.94/27.23 s); review dispatched (sonnet).
- Task 4 review: ✅ spec, Approved, no Critical/Important. ⚠️ rulebook arithmetic not opened by the reviewer — the pre-flight checked every example number against the rulebook (preflight.md "Numbers"), accepted. Minor: Burnout invariant covers staff zones only (faithful; staff only sit there).
- Task 4: complete (3aa8ae8).
- Task 5: BASE 3aa8ae8; implementer dispatched (sonnet).
- Task 5: implementer DONE 8c97016 (3780 pass, tsc clean, 275 examples, removal probe clean, fitted pin hand-applied; Startup tests 26.48/27.07/29.37 s); review dispatched (sonnet).
- Task 5 review: ✅ spec, Approved, rulebook numbers checked (TechCrunch l.1253/1284, Hype l.773, Sprint l.1254). Minors: utility()'s fallback picks among affordable products (`paid[t % paid.length]`) where the brief says "its product at t % n" — Ruling: keep (keeps the press legal; same as the probe that passed); note it in the final review package. techCrunchPrice doc wording cosmetic.
- Task 5: complete (8c97016).
- Task 6: BASE 8c97016; implementer dispatched (opus — prose-only arranged tests and the holder-list recount need judgment). Carries Task 3's stale-wording minors and Task 1's README minor.
- Task 6: implementer DONE_WITH_CONCERNS 8aee253 (3784 pass, tsc clean, checks clean, 18 required keys at 2+ games, scouting key 1 game; arranged tests shown to bite; Startup tests 28.60/28.05/27.09 s → best 27.09 s, under the 30 s watch). Concerns: CLEAN_CODER_VIRAL counted per shielded product (tighter than brief; 0 either way); four arranged-test comments recounted; README heading "(slice 5)" kept; four older counted keys now at 2+ games (reshuffle, Full Stack Founder, Revenue Leader, mode carried); 3p s1 no Launch.
- Ruling: README heading stays "(slice 5)" — 5-2b (the slice's last rules plan, 2a6147d) changed it to slice 5, so 6-2b changes it to slice 6; noted for 6-2b. Cost if wrong: one heading lags a plan.
- Ruling: don't promote the four older counted keys now — the speed-up mini plan follows and may shift play; promote at the next long-runs touch if they still hold 2+; noted. Cost if wrong: four behaviours stay pinned by arranged tests rather than runs a while longer.
- Task 6: review dispatched (sonnet).
- Task 6 review: ✅ spec, Approved, no Critical/Important. Minors: CLEAN_CODER_VIRAL per shielded product (matches rules l.636/1380 and ruling 19; accepted); TOXIC_OPS reads the after-state flag (counted-only, pinned by examples; accepted); README heading (ruled above, 6-2b); wall Duration 30.6–31.8 s vs `tests` 27.09 s (the watch reads `tests`).
- Task 6: complete (8aee253).
- Final review: range 8c19086..08fe9a0 (code 8c19086..8aee253); dispatched (opus).
- Final review (opus, final-review.md): With fixes. Important 1: R3's Burnout-after-Workaholic order and Workaholic's salary order unpinned (line-order probe) — reviewer's example fails under both reorders.
- Rulings on the final review (one fix wave, opus):
  - Ruling: Important 1 — add the reviewer's example verbatim — R3 is the spec's own ruling and 6-2b's Events go in the same blocks; cost if wrong: none (one example).
  - Ruling: Minor 1 (Toxic invariant asserts exactly one cube, Blue→Red→QA order, onboarding takes none, on the teams already selected) — fix now — few reads on already-selected teams; cost if wrong: a little test time.
  - Ruling: Minor 2 (backlog comment) — reword: the bound follows the auto-player's one-utility-a-turn cadence.
  - Ruling: Minor 3 ('Design Sprints' in the 3-player replay's seen/REPLAYED) — fix, in the 3-player test's required list only (the 2-player test keeps its own list).
  - Ruling: Minor 4 (a Buff press changes only the target's one count and the card's place) — add the invariant — runs on Buff presses only.
  - Ruling: Minor 5 (Pending lines read raw team output) — add the example (a lone Toxic Junior making 1 Blue: 0 cubes, still its Pending blue) — pins a line the plan's call rests on.
  - Ruling: Minors 6, 7, 9 (stale auto-player comments, the actions Hint, the impossible HIRE_AGENCY_TO_PROJECT branch comment) — fix.
  - Ruling: Minor 8 (qaForBugs reads qa team output, not qa made) — decline now: changing the auto-player shifts every seed-pinned test and tally; noted for later long-runs work.
  - Ruling: Recommendation (a line-order probe beside the removal probe where a line's place carries a ruling) — noted for 6-2b's pre-flight and later plans.
- Fix wave dispatched (opus), BASE 08fe9a0.
- Fix wave DONE_WITH_CONCERNS 850550f: 278 examples (reviewer's example + a Red/QA one, since the reviewer's Blue-only Junior didn't catch the Red/QA reorders), Minor 5 example, stronger Toxic and Buff invariants shown to bite, Design Sprints in the 3p replay (2p keeps its 11), comments/Hint fixed; 3784 pass, tsc clean, checks clean, Rent Day 108; timings 32.03/34.73/31.41 s while the profiling agent ran beside it (HEAD 28.9–32.7 s in the same window). Scoped re-review dispatched (sonnet).
- Fix wave re-review (sonnet): All addressed, Approved; it re-ran the Startup file (103/103) and probed each reorder and the Pending line itself.
- Plan complete. Controller check at 95c8aae: full suite 3784 pass (120 files), tsc clean. Archived: ledger + final review → docs/superpowers/notes/2026-11-23-startup-6-2a-ledger.md; workspace → scratchpad archive-6-2a/.


---

# Appendix: the final review

## Final review: plan 6-2a (Attributes and Utility Strategy cards)

Range 8c19086..08fe9a0. The code ends at 8aee253. I reviewed it against:

- the plan;
- the slice-6 spec, whose R1–R3 win over its body;
- the overview spec;
- rulebook §20, §11 and §12.1;
- the ledger. I re-raise none of its rulings below; where a point touches one, I say why it falls outside the ruling.

How I checked:

- I ran the probes in a separate worktree at 08fe9a0, then removed the worktree.
- `src/games/startup-simulator.test.ts`: 103 tests pass; `tests` took 28.41 s.
- I ran a removal probe over every added rules line, line-order probes, mutation probes, and 9 extra scenario examples (made in the probe only).

The diff touches only these files: the Startup rules and test, README, the two designer-page pins, and a notes file. It changes no shared code and no protected file.

### Strengths

- **Every added line still changes something.**
  - The removal probe deleted each of the 156 added non-example lines in turn.
  - Only 8 deletions left all 275 examples passing. All 8 are the `Only if` guards on Losing and Pool losing (rules l.441–467).
  - Each of those 8 fails the made-values test (test l.2762). This matches the ledger's Task 4 entry.
- **R1 (Toxic) holds at every edge I tried:**
  - a team making one colour, or none;
  - a Stalled team, which loses nothing;
  - an onboarding Toxic card, which takes nothing;
  - a dev-team Toxic card, which never reaches the ops pool;
  - a pool with no Blue, which loses a Red;
  - a pool with neither Blue nor Red, which loses a QA.

  The made values are computed after Synergy (`blue made` reads `blue team output`, which includes the PM count). The Engine reads them for cubes and cleaning (rules l.1325–1330).
- **R2 (Attributes as counts plus a parked card) holds on every path:**
  - Strips: a Dismiss, an unpaid let-go, and the Diva's Pivot (`Every card on it that is egotistic is fired`).
  - Kept: a Recall, a Pivot to the bench, a bench discard, and a rehire (counts go to the new owner).
  - Eviction to the box goes through the new box rule at l.765.

  The held-to-parked invariant and the box admission in the test file guard both directions.
- **R3 (Burnout) gives the right results.** A burned-out card has 0 output in every mode (flex, red, QA, blue-mode hardware, QA tester, Bug Hunter). It gives no Synergy and keeps its salary. A burned-out PM still gives Brainstorm its third card (plan call).
- **Workaholic and Clean Coder interact correctly with earlier slices.**
  - The three per-colour flags (R7) put +2 only on a colour the card already makes, in every mode.
  - Clean Coder blocks both the Hacker's Bug (pooled and attached) and Viral.
  - A Visionary leads both kinds of project. An onboarding Visionary does not lead.
- **TechCrunch and Design Sprint are right at the edges.**
  - TechCrunch costs $5, or $2 when pitched. It works on an Offline product and is refused when the player can't pay.
  - Design Sprint works on an empty deck.

  Each Hype adds 5 to a product's score. The offline line comes after the Hype line, so an offline product scores 0, Hype included, as rulebook l.773 requires. I checked every example number against the rulebook.
- **The long runs reach the new paths.** The 18 required keys each occur in 2 or more games. The 3-player replay covers Debuffs, strips and a TechCrunch Feature, and undoing the last move works across them. Task 6's report shows that each new arranged test (Debuff targets, the pitched pick, scouting to ops) fails when its behaviour is broken.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

1. **Neither R3's order (Burnout after Workaholic) nor Workaholic's salary order is pinned by any test.**
   - **Location:** `src/games/startup-simulator.rules`:
     - l.184 against l.188 (Blue), l.194 against l.198 (Red), l.206 against l.210 (QA);
     - salary: l.572–574.
   - **What is wrong:**
     - I moved each `A burned out card's … output is 0.` line above its `An overworked in … card's … output goes up by 2.` line. All 275 examples still pass, as do the whole Startup file (103 tests) and the designer page (134 tests). With that order a Workaholic burned-out card makes 2 in its colour, which breaks R3.
     - Separately, I moved `An overworked card's salary goes up by 2.` above the two `… salary is 1.` lines. All 103 Startup tests still pass. With that order an experienced or efficient-in-ops Workaholic is paid $1 instead of $3.
     - Review Focus 3 (plan l.96–98) says Task 4 examples 1–2 test "Burnout meeting Workaholic". Neither example (rules l.4808, l.4825) gives any card a Workaholic.
     - The long-run Burnout invariant would catch the first reorder only if a card in the runs held both counts. None does.
   - **Why it matters:**
     - R3 is the spec's own ruling: "0 output after every modifier, Events included".
     - 6-2b adds the Events as more `goes up by` lines in these same blocks. Its authors will need a pinned "Burnout last" to place them, and today a misplaced line passes silently.
     - The salary order is the plan's own Review Focus expectation ("Workaholic's +$2 salary stays").
     - The removal probe, the plan's main check that each line is pinned, cannot see line order. This is a gap in the plan's verification method, not only in this slice.
   - **How to fix:** add one example. I ran this one in the probe: it passes as committed and fails under each reorder.

     ```
     Example: an experienced Junior with Workaholic and Burnout is paid $1 + $2 and makes nothing, and the Engineer with Workaholic in the ops team is paid $1 + $2 (section 20, the slice's R3)
       Given p1's development has a Dating App
       And p1's operations has a Smart Lock
       And p1's ops team has the Engineer
       And the Dating App in p1's development has a Junior Software Dev on it
       And the Junior Software Dev in p1's development team has 2 blue xp tokens
       And the Junior Software Dev in p1's development team has 1 workaholic
       And the Junior Software Dev in p1's development team has 1 burnout
       And the Engineer in p1's ops team has 1 workaholic
       And the turn passes to the left
       Then the phase is income
       When p1 pays salaries
       Then p1 has 3 capital
       When p1 ends their actions
       Then the Dating App in p1's development has 0 blue cubes
     ```

     Adding it changes the example count to 276, so the README, `designer-page.test.tsx` and the plan's counts change with it. For later plans, add a line-order probe next to the removal probe for any block where a line's position carries a ruling: swap adjacent lines and expect a failure.

#### Minor (Nice to Have)

1. **The narrowed Toxic invariant checks bounds only.** Test l.2447–2460.
   - R11 narrowed which teams the invariant checks. That narrowing stands. This point is about what the check asserts on the teams it does check.
   - It asserts only `team − 1 ≤ made ≤ team` and `made ≥ 0` per colour. It does not assert R1's colour order (Blue first, Red only when Blue is 0). It does not assert that exactly one cube comes off in total, or that an onboarding Toxic card takes nothing.
   - A regression that took Red from a team still making Blue, or one cube from every colour, would pass the long runs. Examples 3–9 and the made-values test still pin it, but only in arranged states.
   - The ops-pool half (`supply ≥ 0`, l.2456–2459) can never fail by construction: the pool-losing guards need a positive bandwidth. Toxic in the ops team occurs in 0 runs (test l.3635).
   - Fix: on the same teams, assert that `Σ(team − made)` is exactly 1 when a non-onboarding Toxic card is on the team and some colour is above 0, and 0 otherwise. Also assert that the colour losing the cube is the first non-zero one in Blue, Red, QA order. The cost is a few `workedValue` reads on the teams already selected.

2. **The backlog bound comment states a rules ceiling that does not exist.** Test l.2100–2101.
   - R12 accepted the shifted test. This point is only about the comment's claim.
   - The comment says a Design Sprint "deals up to 5 past the 4", which presents 9 as the rules' ceiling. The deck has two Sprints, and in the probe two Sprints played in one turn took a backlog of 1 to 11. After a research that leaves 4, the rules allow 14.
   - 9 holds only because `utility()` plays at most one utility card a turn. A later cadence change that plays both would trip the bound and look like a rules bug.
   - Fix: say in the comment that the bound follows the auto-player's one-utility cadence, or make the bound `4 + 5 × (Sprints played this turn)`.

3. **The 3-player replay's title claims a Design Sprint that no assertion covers.** Test l.4006–4011.
   - `seen` and `REPLAYED` (l.1440–1443) count Debuffs, strips and TechCrunch Features, but not Design Sprints. The comment says seeds 1, 2 and 5 hold one, but nothing fails if they stop.
   - Fix: add `'Design Sprints'` to `REPLAYED` and the `seen` sum.

4. **A Buff press has no "changes nothing else" check.**
   - Under ruling R3(a), the Training-press invariant only checks `isTraining` cards (test l.2335). The narrowing itself is accepted; the gap is that nothing replaced it for Buffs.
   - Nothing checks that a Buff press changes only the target's one count and the card's place. A Buff that also cleared a Pending token, say, would pass.
   - Fix: a small invariant for `PLAY_TRAINING` with a Buff card. The target gains exactly that one count, the card moves to `attributes in play`, and no other card changes.

5. **The Pending XP lines reading raw team output are unpinned.** Rules l.1327–1329.
   - These lines give Pending XP from `… team output`, not from `… made`. Per the plan, a Toxic cube does not cost a teammate its Pending.
   - Changing l.1327 to read `blue made` passes every example. The difference shows only when Toxic takes a team's last cube.
   - Fix: add an example with a lone Toxic Junior Software Dev that makes 1 Blue. It makes 0 cubes and still gains its Pending blue. The pending-green-with-Toxic call itself is declined below.

6. **Stale "Training is the only kind played" comments in the test file.** None of these should be counted under R14, which was about tally-comment holder lists.
   - l.129: the `isTraining` doc.
   - l.618: the auto-player doc on free moves. `training()` now also plays Buffs when `t % 3 === 0`.
   - l.686: the auto-player doc on the brainstorm keep and the strategy cleanup. Both use `isPlayable` now.
   - l.976: the `training()` doc.
   - l.1248–1251: the `brainstorming()` doc.
   - l.1399: the cleanup comment.

   Later cadence work reads these as the auto-player's specification.

7. **The actions Hint is stale.** Rules l.891: "Greenlighting, Training and dismissing cost no actions". A Debuff, a TechCrunch Feature and a Design Sprint also cost no actions. Fix it in this plan, or note it for 6-3, which owns the player-facing text.

8. **The auto-player picks QA by `qa team output`.** Test l.1081–1085. `qaForBugs` treats a project as having no cleaning QA only when its `qa team output` is 0. A team whose only QA output is taken by Toxic (`qa made` 0) is treated as cleaned and gets no QA. This affects only the auto-player's play, not the rules. Read `qa made` if the runs should send QA to such a project.

9. **A path in the Clean Coder Hacker key cannot occur.** The key's HIRE_AGENCY_TO_PROJECT branch can never see counts on the Hacker, since a card from the agency row holds no Attributes. It is harmless, but drop it or comment it so later readers do not take it as covered.

### Declined to judge

- R1 takes Blue first even when the project's Blue need is already met: the spec rules this. For the owner: Crunch Time keys on need, Toxic on what is made.
- Visionary on a PM counts as a lead: plan call.
- An attached (product) Toxic card hits the ops pool: plan call.
- A burned-out PM stays Agile and still gives Brainstorm its third card: plan call.
- Flight Risk is inert and Cease & Desist is refused in 6-2a: spec call (6-2b).
- Design Sprint has no pay line: plan call.
- The egotistic label, the greyed Strategy buttons and the shown-flags list: 6-3 (ledger Gaps 1–2, R4, R5).
- The README heading "(slice 5)": already ruled (6-2b).
- The 11 new keys and the scouting key are counted but not required: R13.
- `utility()` picks among affordable products: already ruled (Task 5).
- A burned-out Architect, Sales Rep or QA Engineer keeps its non-output perks: the spec is silent, and keeping them is a reasonable reading of "0 Output".
- Stripping Hype when a product leaves operations: later slices.
- Pending green with Toxic: plan call.
- Startup test time (27–28.6 s `tests`, about 31 s wall): R15's watch and the speed-up mini plan own it.

### Recommendations

- Add the Important example before 6-2b starts. 6-2b's Event lines go into the same output blocks and need "Burnout last" pinned first.
- Add a line-order probe to the plan template's verification steps, next to the removal probe. Use it where a line's position carries a ruling: outputs (R3) and salary.
- Fold Minor 1, the stronger Toxic invariant, into the speed-up mini plan's pass over the invariants. It reuses the teams already selected, so it costs almost nothing.
- Fix the comments and Hint (Minors 2, 3, 6 and 7) in the same small commit as the example.

### Assessment

**Ready to merge?** With fixes

**Reasoning:** The rules match R1–R3, the earlier slices and the rulebook in every edge case I tried, and every added line is pinned. But R3's "Burnout after every modifier" and Workaholic's salary order rest on line order that no test checks, and 6-2b's Events depend on that order. One example closes the gap.
