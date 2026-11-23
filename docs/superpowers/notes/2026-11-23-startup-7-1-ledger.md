# Plan 7-1 (the language for Equity): SDD ledger

Kept from the SDD workspace (git-ignored) when the plan finished. Plan: `docs/superpowers/plans/2026-10-16-startup-slice-7-1-language.md`; pre-flight: `2026-11-23-startup-7-1-preflight.md`. The final review and the fix wave's brief are appendices.

- Started 2026-11-23 after plan 6-3 (HEAD 32da5d9, 3862 tests). Spec: docs/superpowers/specs/ slice 7 (R1–R2 win over its body) under the overview.
- Pre-flight (opus) back: no blocker; 19 fix-in-plan (R1–R19), 2 ruling-needed (R20, R21); 6 gaps with homes. Probe pf71/work off 88303f0, final 4db3ec6: 3973 pass (+140 incl. amendments), tsc clean, other games 100 tests, Rent Day 108, Startup 307, flowDefFor byte-identical. Rebased onto 32da5d9 (pf71/rebase, final 20e40c2): 4002 pass, tsc clean; one textual conflict (board-view.test appended describes, keep both). Timing: 7-1 costs nothing measurable; Startup file ≈24 s after 6-3 (6 s under the watch). Report → docs/superpowers/notes/2026-11-23-startup-7-1-preflight.md.
- Ruling R20 (maker condition for the Round Start Consultant step): (b) keep 7-2a's accepted stop (one confirm per Investor per Round Start; its example 2 stays as pinned) — why: (a) adds a phrase card-alone must exclude (the speed-up 2 pin fails until decided), two worked flags and an auto-pass guard in 7-2a, for page comfort only — cost if wrong: one extra press per Investor per round; recorded for 7-3's pre-flight as a comfort item.
- Ruling R21 (`, choosing p3` for a player choice that isn't a payment): (a) add it in Task 3 — when a press asks a player (CHOICE_LINE) and has no named options, words after `, choosing` that read as players fill the player choice; `, paying` stays valid — why: 7-2b's three `, paying` lines read oddly (its l.844 flags them), and ~10 lines buy examples that say what they mean — cost if wrong: a second spelling for one choice (both tested).
- Ruling: every fix-in-plan amendment (R1–R19) accepted as the report writes it — each was built and run in the probe (except R18/R19, which are check-text fixes run at d8cdc2a). Gap 5 (a card fact named "player" collides with Rent Day's `its player gets …`) goes into the plan's recorded limits; Gaps 1–3 (naming cards alike in placesOf — 6-3's "equivalent to the seat" is false for them; the Share Price before pressing; a posted stake on the page) and R20(a) go to notes-for-7 for 7-3's pre-flight; Gap 4 needs nothing (R8 covers it).
- Ruling: BASE for the plan is 32da5d9 plus docs commits (Task 10's checks run from 32da5d9's successor that holds the amended plan); implementers get the rebased probe commits (pf71/rebase, onto 32da5d9) as cross-check references: T1 63b983c + A-T1 b45a347; T2 976367e; T3 c364c45 + A-T3 7ae8b39 (R21 is new, not in the probe); T4 43affef + A-T4 30c6c93; T5 59adacf + A-T5 acb5bc2; T6 754bf22 + A-T6 6f92383 + A-T6b 702b7a8; T7 7d80e18 + A-T7 cdfddce + A-T7b 28e9ee1 (+ e01a078 header wording); T8 9675122 + A-T8 ce0a4d2; T9 515bc09 + A-T9 d7d82a6; T10 aac629d + A-T10 9dcaae4 + d77218f (README) + A-T10b 3acfd1a; 20e40c2 import lines. The amended plan text is the requirement; a difference from the probe is reported.
- Amender dispatched (sonnet) for R1–R19, R21(a), Gap 5, BASE 32da5d9 in Task 10.
- 7-2a pre-flight dispatched (opus, background) on a clone at d3b054c + 7-1's rebased probe (pf71/rebase 32da5d9..20e40c2) → scratchpad pf72a; report in its final message. Runs alongside 7-1's execution; re-check its 7-1-dependent findings once 7-1 lands (R21 `, choosing` is not in that probe).
- Amender DONE: plan 1491 → 1540 lines; all of R1–R19, R21, Gap 5, BASE placed (59 replacements, each matched once). Committed 08dbe1b.
- Ruling (amender's R21 design: `readWhen` reads words after `, choosing` as players when there is no `, paying`, args `[action, players, option, true]`; `namedChoices(…, fromChoosing = false)` fills the player choices only when the press asks a player and has no named options, else reads the option as before): accepted — the compile-time reading gives `, choosing p9` the players type's own error on the line, and the runtime fallback leaves every press with named options unchanged — cost if wrong: an option whose text reads as players (`p2`) in a press that asks a player and has no named options would be read as a player; no game has one.
- Conflict scan: the pre-flight built every task in order on the plan text (its R1–R19 are the scan's rows, each now amended); R21's text is new and unprobed — Task 3's reviewer gets it as a named risk.
- BASE (plan) 08dbe1b; 3862 tests, Startup 307 examples.
- Task 1: BASE 08dbe1b; implementer dispatched (sonnet), probe ref 63b983c + A-T1 b45a347 (pf71/rebase).
- Task 1: implementer DONE e538f19 (pushed) — 3880 pass (+18), tsc clean; the probe's 63b983c + b45a347 applied and every non-test hunk checked against the brief (no difference); only existing test line changed: refs.test's pinned VOCAB_TYPES list (gains cardplayer). Review dispatched (sonnet).
- Task 1 review (sonnet): Needs fixes — Important: attach-phrases.ts adds namingFacts to an existing import line (plan: new names on new lines); Minor: scrap test uses a Statue (brief: a Vase), compile-util test matches stringContaining where the brief names NEEDS_ONTO. Named risks all clean (identity, passes, worked-view/card-alone fail closed, whose parsing gated on a player fact, failure copy unchanged elsewhere). Fix round 1: implementer resumed for all three.
- Fix round 1: d33b172 (import on its own line; no other import slip; Vase in the scrap; exact NEEDS_ONTO text inline, the constant isn't exported) — 3880 pass, tsc clean. Controller's read stands as the re-review (8-line diff); controller tightened the scrap case to the maker's own Vase (true → false), ee051bd, focused test passes.
- Task 1: complete (ee051bd).
- Task 2: BASE ee051bd; implementer dispatched (sonnet), probe ref 976367e.
- Task 2: implementer DONE 8a6b8be (pushed) — 3892 pass (+12), tsc clean; probe 976367e applied (one test hunk by hand), no difference; changed test line: 6-1's jinx refusal, as the brief names. Review dispatched (sonnet).
- Task 2: complete (8a6b8be) — review Approved (sonnet). Minor parked for the final fix wave: a card move whose `to` is another player's zone (no cost line) gets the old one-zone refusal, not OTHERS_IN_A_MOVE (`moveZones` tests only the from text); outside the brief.
- Task 3: BASE 8a6b8be; implementer dispatched (sonnet), probe ref c364c45 + A-T3 7ae8b39; R21 (`, choosing`) is new — built from the brief alone.
- Task 3: implementer DONE 78fa0c1 (pushed) — 3914 pass (+22), tsc clean; probe c364c45 + 7ae8b39 applied; `, choosing` built from the brief (its tests were red only because RATE_GAME didn't compile yet — not seen red for the choosing code itself; no case of a press that asks a player and has named options). No existing test line changed. Review dispatched (sonnet), with the choosing fallback as a named risk.
- Task 3: complete (78fa0c1) — review Approved (sonnet). The choosing tests do fail without the choosing code (traced). Minor parked for the final fix wave: no test of `, choosing <option>` on a press that asks a player AND has named options (path traced correct: an option block keeps the option reading); an option label shaped like a player list (`p9`) would be reported as a bad player — no game has one (Startup's options: red, blue, qa, cut …).
- Task 4: BASE 78fa0c1; implementer dispatched (sonnet), probe ref 43affef + A-T4 30c6c93.
- Task 4: implementer DONE 044b9fa (pushed) — 3925 pass (+11), tsc clean; probe 43affef + 30c6c93 applied, no difference; changed test line: worked-view.test's pinned player-value list (+4 lookups), as R5 names. Review dispatched (sonnet).
- Task 4: complete (044b9fa) — review Approved (sonnet). Minor parked: `is the highest` starts at 0, so an all-negative group gives 0 (within the brief's "0 when no card has one"; say so in its doc); no direct test that shownPlayerValues(LOOKUP_GAME) omits the four lookups (holds by construction).
- Task 5: BASE 044b9fa; implementer dispatched (sonnet), probe ref 59adacf + A-T5 acb5bc2.
- Task 5: implementer DONE 68335e2 (pushed) — 3942 pass (+17), tsc clean; probe 59adacf + acb5bc2 with every new import on its own line (the probe had extended lines); no existing test line changed. Review dispatched (sonnet).
- Task 5: complete (68335e2) — review Approved (sonnet): cardsOn still copies, index per cards array, own == old index where no card carries lang:on-seat. Minor parked: the stale `compile-phase.ts` ~677 comment about cardsOn and hidden flags (final fix wave); an across card with a holder but no lang:on-seat reports "which is now in …" (unreachable in shipped games).
- Task 6: BASE 68335e2; implementer dispatched (sonnet), probe ref 754bf22 + A-T6 6f92383 + A-T6b 702b7a8.
- Task 6: implementer DONE d09441b (pushed) — 3955 pass (+13), tsc clean; probe 754bf22 + 6f92383 + 702b7a8 with imports split onto new lines; no existing test line changed; card-alone excludes the new group (cardgroup not in OF_THE_CARD), its test untouched. Review dispatched (sonnet).
- Task 6: complete (d09441b) — review Approved (sonnet): the new group goes through cardsOnCardsArePublic, never card-alone (cardgroup ∉ OF_THE_CARD); stakes return to their own seat's zone with lang:on/on-seat dropped. Minor parked: the "in no player's zone" branch untested (unreachable); a test titled `is the RIVAL_GAME` guards POST_GAME (rename).
- Task 7: BASE d09441b; implementer dispatched (sonnet), probe ref 7d80e18 + A-T7 cdfddce + A-T7b 28e9ee1 + e01a078 (header wording) + the window-local naming from A-T10b 3acfd1a.
- Task 7: implementer DONE (a884c93, pushed) — 3975 tests, tsc clean; 20 new tests; only phrases.test.ts's pinned get line changed (needsActing: false); purity grep empty. Concern: the (guard) test only asserts flowDefFor truthy (as the probe).
- Task 7: review dispatched (sonnet) on review-d09441b..a884c93.diff.
- Task 7: complete (a884c93) — review Approved (sonnet), Spec ✅. Minors parked for the final fix wave: (1) the (guard) test asserts only flowDefFor truthy — compare against the flow at BASE and pin crew.everyPhase's keys; (2) hiddenZoneRead's `seen` cycle guard untested — add a value that reads itself; (3) the `holds` amendment case uses .replace unchecked — use swap(); (4) second `import type … from './types'` lines are what the rule asks — Ruling: keep — the import-line rule is the plan's — a lint rule against duplicate imports would need a sweep.
- Task 8: BASE a884c93; implementer dispatched (sonnet), probe ref 9675122 + A-T8 ce0a4d2 + 3acfd1a's build.ts naming (answering).
- Task 8: implementer DONE (4afdc84, pushed) — 3991 tests (+16), tsc clean; Rent Day 108; no existing test line changed; purity grep empty. (Its note that compile.ts's checkWindow still names a parameter window is wrong: HEAD names it answering.)
- Task 8: review dispatched (sonnet) on review-a884c93..4afdc84.diff.
- Task 8: complete (4afdc84) — review Approved (sonnet), Spec ✅. Minors parked for the final fix wave: (5) "finishes no round while an action waits" can't fail without the guard (current p2 ≠ start player p0 already) — set START_PLAYER_KEY 'p2' and use an absent key, not null; (6) runtime.ts imports ./zones twice — Ruling: keep — the plan's import-line rule — same as (4).
- Task 9: BASE 4afdc84; implementer dispatched (sonnet), probe ref 515bc09 + A-T9 d7d82a6.
- Task 9: implementer DONE (3d3acdd, pushed) — 3998 tests (+7), tsc clean; no existing test line changed; purity grep empty; matches probe 515bc09 + d7d82a6.
- Task 9: review dispatched (sonnet) on review-4afdc84..3d3acdd.diff.
- Task 9: complete (3d3acdd) — review Approved (sonnet), Spec ✅. Minor parked for the final fix wave: (7) no test that a face-down card naming a player shows exactly `a face-down card` (no ` whose maker is …`) — add a Stake in p0's stash swapped, p1's text exact; (8) the label's `waiting.move` fallback is unreachable — Ruling: keep, document — harmless.
- Task 10: BASE 3d3acdd (the checks diff from plan BASE 08dbe1b); implementer dispatched (sonnet), probe ref aac629d + A-T10 9dcaae4 + d77218f (README).
- Ruling: Task 10's README paragraph goes after 6-1's whole paragraph (its last bullet is the Startup slice 6 one, after the In-the-playtest bullet), right before 'A table too big for one screen' — the brief's 'right after that bullet, before A table too big' predates the Startup bullet's position — a wrong spot is a one-paragraph move.
- Task 10: implementer DONE (71830a9, pushed) — 4005 tests (+7), tsc clean; every example passed first run; checks as expected (VOCAB_TYPES was added as a new line, so check 4 doesn't print it); Rent Day 108, Startup 307; Startup timed 32.3 s (vs ~24 s) — re-timing.
- Task 10: review dispatched (sonnet) on review-3d3acdd..71830a9.diff.
- Task 10: complete (71830a9) — review Approved (sonnet), Spec ✅; minors (mid-file import line, "Written in fixture words:") consistent with the file — no change.
- Startup timing re-measured, alternating clean copies of 08dbe1b and 71830a9 under the same load (4 CPUs, load 5–7): base 35.7 / 28.5 s, head 36.0 / 30.0 s. Ruling: no slowdown attributable to 7-1 (within ~1.5 s, inside run-to-run noise); the 32 s Task 10 saw is the machine's load (the 7-2a pre-flight's tsc/vitest) — re-time at the plan end when the machine is quiet — if wrong, a later plan's speed work picks it up.
- All 10 tasks complete. Final review next (opus) over 08dbe1b..71830a9.
- Final review dispatched (opus) on review-08dbe1b..71830a9.diff.
- Final review (opus) back: With fixes — 0 Critical, 3 Important, 12 Minor; saved → final-review.md. Adjudication:
  - Ruling: fix Important 1 (a seat going out mid-window: skip out seats in passAnswer, goesOut passes the answer on, closeWindow stops an out actor's action and passes the turn as goesOut would) — a rules writer combining "They are out." with a window gets a locked game — ~10 lines, latent for Startup.
  - Ruling: fix Important 2 (WINDOW_ENTERED via refuseEnteringSteps without a second first-phase message; WINDOW_GO_TO also for phase-starting and go-back lines in the window phase; openWindow guard) — README promises these are refused — copy new: "The players go to the {phase} only to answer an action, so no line can go to it."
  - Ruling: fix Important 3 (an owner-only {counter} read by the clause is hidden: WINDOW_READS_HIDDEN('their coins')) — whether a seat is asked is public.
  - Ruling: fix Minors 1–6, 9 (README "A stopped action"), 10 (widen the plan's recorded limit), 12 (rename), Rec. 4 (closeWindow comment); parked (1),(2),(3),(5),(7),(8 comment), T2 (new OTHERS_NOT_WHERE_DRAGGED copy), T4, T5, T6; T3 if cheap. Leave (4),(6),11 and T5/T6's unreachable branches.
  - Ruling: carry Minors 7 (a choice option guarded by a hidden fact could show in the waiting view) and 8 (the waiting view leaves out the picked player, amount, space) to 7-3's notes — no Startup button with a cost has such options; 7-3 builds the waiting strip.
- Fix wave dispatched (opus) with fix-brief.md.
- Fix wave DONE_WITH_CONCERNS (8888444, pushed) — 4025 tests (+20), tsc clean; Rent Day 108, Startup 307; every item done (T3 included); the 'player value reads the hidden counter' case written as a worked flag (no player-value phrase takes a counter).
- Fix-wave concerns ruled (same agent resumed, one more commit): Ruling: fix concern 1 (an Any-player button with a cost: the turn's seat going out mid-window is handed the turn back — closeWindow passes on from back.current too) — a lock — a few lines; Ruling: fix concern 2 (table check on the pass-on path) — consistency; Ruling: record concern 3 ("In every phase" / window When rules can still start a phase while an action waits; steps phases share it) in the plan's Recorded limits — Startup's veto phase writes none — a later slice that does needs the refusal.
- Fix-wave follow-up DONE (8bb910a, pushed) — 4026 tests, tsc clean; concern 1 fixed with a test (first failure: turn handed back to out p0), concern 2 fixed (no cheap test), concern 3 recorded at plan l.1537.
- Scoped re-review dispatched (sonnet) on review-71830a9..8bb910a.diff.
- Scoped re-review (sonnet): Approved — every ruled item Fixed (Important 1–3, items 1–17, follow-ups 1–3); the worked-flag stand-in for Important 3's player-value case judged sound. Residual Minors: (a) the window-first test pinned WINDOW_FIRST with toContainEqual — tightened to exactly one by the controller (165bd8a, 52/52, tsc clean); (b) Ruling: accept — a stopped action whose button can't be found now throws in closeWindow, reachable only from a stored state read against changed rules (the ahead path already threw) — no supported path; (c) same-module import lines — the plan's rule.
- Plan 7-1 complete: 4026 tests, tsc clean; Rent Day 108, Startup 307.

## Appendix: the final review (opus), adjudicated above

### Final review: plan 7-1

Range 08dbe1b..71830a9, 12 commits, all 10 tasks. I read the diff in six passes:
1. Static and constraint checks.
2. The window across the rest of the turn engine.
3. Hidden information.
4. Cards across zones and the other players' cards.
5. Lookups, compile-time refusals and test strength.
6. The parked Minors.

I checked the doubtful paths with probe tests run against a `git archive` of 71830a9 in the scratchpad. They are in /tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/fr71/head/src/engine/core/lang/ (probe-fr71.test.ts through probe5-fr71.test.ts). The working tree, index, HEAD and branch were not touched.

### Strengths
- **Constraints all hold.**
  - No protected file changed (game-state.ts, flow.ts, game-engine.ts, hearts-demo).
  - Nothing changed under src/games or src/pages, so Rent Day and Startup keep their examples.
  - The core stays pure, and new state is Json under `lang:*`.
  - None of the added lines contain "veto", "supply" or "partner", and "stake" is only the fixture card.
  - Task 10's checks are clean: check 1 prints only the readsPressCard line, and check 4 prints only the jinx lines and the phrases.test pin.
- **The window's normal paths are right**: stopped, going ahead, an action with choices, an action that starts another phase, the last move of the game, and undo and replay from the log. `back` puts the turn log and rolls back exactly. `turnWaiting`, `endStepsDue` and `roundFinished` all wait while a Waiting exists. Asked seats run from the actor's left and skip seats already out when the window opens.
- **Cards across seats match R1 cleanly.** `heldOf` splits each card's cards into its owner's (`cardsOn`) and other seats' (`othersOn`). `putOn` and `withoutHolder` keep the seat key in step. The across branch of `attachmentProblem` gives ACROSS_OWN, accepts a holder in a public zone of the stored seat, and otherwise reports "which is now in".
- **The card-alone cache is safe.** `testedBy` returns null for a names filter, and `OF_THE_CARD` excludes cardgroup, so nothing that reads a player is cached as card-alone. `unmetNeed` covers needsActing, the target owner and named zones.
- **The waiting view is careful.** It carries no card ids, names a card the seat can't see as "a face-down card", and shows the naming suffix only when the seat sees the face. The board-view tests pin all of this, including a check that the hidden card's id is absent and a `readSeatExtras` round trip.
- **R16, R20(b) and Gap 1 are deferred to 7-3,** consistently with the plan's "Left to 7-3". R21 (`readWhen`'s fourth argument and `namedChoices(..., fromChoosing)`) is done as ruled.
- **The README stays in fixture words.**

### Issues

#### Critical
None.

#### Important

**1. A seat that goes out while the window is open can strand the game or hand the answer to the wrong seat.**
- Where:
  - runtime.ts:391-398 (`askedFor` filters out seats only when the window opens).
  - library/turn-phrases.ts:131-139 (`passAnswer` makes `waiting.asked[at]` current with no out check).
  - library/board-phrases.ts:421-430 (`goesOut` calls `passStep`, which is null for the window phase, then `chooseNext(nextIn(...))`).
  - runtime.ts:427-442 (`closeWindow` gives the turn back to `back.current` with no out check).
- What the probes showed, using OBJECT_GAME plus an objection button "Any player may give up. Then: They are out.":
  - (a) p1 and p2 are asked, and p2 gives up. When p1 lets it go, p2 is made current anyway. p2 gets "You're out of the game", every other seat gets "not p2's turn", and the game is stuck.
  - (b) Only p1 is asked, and p1 gives up. The answer goes to p2, who was never asked; p2 can let it go and the action goes ahead, with `at` unchanged.
  - (c) The actor p0 gives up during the window. When it closes, the turn goes back to the out p0 and the game is stuck.
- Why it matters: a rules writer who combines "They are out." with a window gets a game that locks or a player who answers without being asked. It is latent, since Startup never eliminates a player, so it does not block 7-2.
- Fix (about 10 lines):
  - `passAnswer` steps `at` past seats now out.
  - `goesOut` sends the answer on through `passAnswer` while a Waiting with no verdict exists and the window phase is current.
  - `closeWindow` treats an out actor as a stopped action and passes the turn on as `turnPassesLeft` does.
- Alternative: record it as a known limit beside l.1536 of the plan.

**2. Nothing at compile time stops play from going into the window phase, or a window-phase line from starting another phase or going back.**
- Where:
  - compile.ts:793-826. `checkWindow` refuses only `GO_TO_PHRASE` and the phase's own `goTo` line.
  - runtime.ts:404-416. `openWindow` doesn't check for a Waiting already there.
  - The steps phases have this check (`refuseEnteringSteps`, compile.ts:935, built on `phaseStartedBy`, compile.ts:695); the window phase doesn't.
- What the probes showed (each compiled with `[]`):
  - `Go to objection.` in working: at runtime "let it go" throws WINDOW_PASS_OUTSIDE and no other button is allowed, so the game is stuck.
  - `The objection phase starts with them.` elsewhere: the same.
  - A window-phase line that starts another phase lets a second window open, and `openWindow` overwrites the first Waiting.
  - A window-phase button saying `Go back to the interrupted turn.` (BACK_GAME probe): if the window opened inside an interrupt, the window is left behind. After that, every turn pass throws TURN_IN_THE_WINDOW out of `engine.dispatch`.
- Why it matters: README.md:322 says "Lines that would leave a player unable to answer … are refused when the rules are read". These lines aren't refused, and the game they produce locks with no message the rules writer can act on.
- Fix:
  - Call `refuseEnteringSteps(window.phase, WINDOW_ENTERED(...), ...)` for the window phase, as done for STEPS_ENTERED and ROUND_STEPS_ENTERED.
  - Extend the WINDOW_GO_TO loop to refs where `phaseStartedBy(ref, library) !== null` or `ref.phrase === GO_BACK_PHRASE`.
  - Add a guard that throws if `openWindow` finds a Waiting already there.

**3. The "who may answer" clause can read a counter only its owner sees, and it is not refused.**
- Where: compile.ts:832-872. `hiddenZoneRead` walks zones, cardgroups, player values and worked values, but never checks `{counter}` arguments. A CounterSpec can be owner-only, and board-view.ts:248 hides such counters from other seats.
- What the probe showed: `who has at least 5 coins` with coins "that only they can see" compiles with `[]`.
- Why it matters: whether a seat is asked is public, so the window reveals each seat's hidden count. That is exactly what README.md:322 and WINDOW_READS_HIDDEN promise to refuse. It is latent, since Startup's counters are public.
- Fix: in `hiddenZoneRead`, treat a `{counter}` argument that names an owner-only CounterSpec as hidden, and word the message like the zone one. Because the walk already goes down through player values, this covers them too.

#### Minor
1. **Two doc comments are orphaned.** At library/compare-phrases.ts:84-90 and library/card-pick-phrases.ts:298-304, the registrars' doc comments now sit above the inserted helpers `theyAreNamed` and `targetOwnerIsNamed`. Editors and readers attach them to the wrong function. Fix: move each comment down to `registerComparePhrases` (l.138) and `registerCardPickPhrases` (l.312).
2. **A move to another player's zone gets the wrong message.** compile-phase.ts:276 tests only `found[2]` (the from zone) against ANOTHER_PLAYERS. A move *to* another player's zone gets "I don't understand “another player's purse” here", which doesn't tell the rules writer what to write. Fix: test `found[3]` too, with a message for the destination (parked T2).
3. **"highest" is wrong for negative values.** library/player-value-phrases.ts:38-39 starts the reduce at 0, so a group whose values are all negative gives 0, which no card has. Fix: reduce from null, take the max of the numbers present, then `?? 0` (parked T4).
4. **A test has a local named `window`.** action-window.test.ts:66 declares `const window = ...`, which the project forbids. Fix: rename it to `answering`.
5. **A comment is stale.** types.ts:28 (PlayerWho) still says "(Task 7 adds 'acting')", but 'acting' is already there. Fix: drop the parenthesis.
6. **Another stale comment.** compile-phase.ts:677-680 says narrowing `cardsOn` "would not close it", but `cardsOn` and `othersOn` are now split. Fix: rewrite it to match the code (parked T5).
7. **The waiting view shows the press's choices to every seat.** In board-view.ts:616 (`waitingView`), a ChoiceOption can carry conditions, so an option guarded by a hidden fact of the press's card could leak to the other seats. No Startup button with a cost has such options, so this is latent. Fix: show an option only when the seat could see what decides it, or record it with Gap 1 for 7-3.
8. **The waiting view leaves out the picked player and the amount** (`subject.picked`, `amount`, `space`), so the asked seats aren't told them. This is a forward note for 7-3's page work.
9. **README wording.** README.md:320 "An answered action has spent its cost and done nothing else" should say "A stopped action". README.md:322 overclaims until Important 2 and 3 are fixed.
10. **The recorded limit is accurate but too narrow** (plan l.1536).
    - It isn't only window buttons that can change what the action reads: the window phase's start lines and rules for every phase can too.
    - The action can also go ahead silently on a changed table, for example relocating a card from wherever the window moved it.
    - "The last pass is then refused" in fact means `dispatch` throws.
    - Fix: widen the wording. Its claim about 7-2's veto holds.
11. **STEPS_NEVER_PASS accepts a passing line in any phase.** This matches the steps check. Leave it.
12. **A test title is wrong.** card-value-phrases.test.ts:505 is titled 'is the RIVAL_GAME' but asserts on POST_GAME. Rename it (parked T6).

### Parked Minors
- **(1)** The guard test (action-window.test.ts:71) only asserts that `flowDefFor` is truthy. **Fix now:** pin that CREW_GAME's trigger ids lack the window rule, and that the rule comes first in OBJECT_GAME's flow.
- **(2)** The `seen` cycle guard in `hiddenZoneRead` is untested. **Add a test if cheap.** The risk is low.
- **(3)** The `holds` case (action-window.test.ts:131) uses an unchecked `.replace`. **Fix now:** use `swap`, so a drift in the fixture fails loudly.
- **(4)** Duplicate import lines. **Leave**, per the ruling.
- **(5)** The 'finishes no round' test (action-window.test.ts:329) can't fail without the guard, because current is p2 and the start player is p0. **Fix now:** make p0 current as the start player with TURN_OF_KEY 'p2', and use an absent key rather than null.
- **(6)** runtime.ts imports ./zones twice. **Leave**, per the ruling.
- **(7)** There is no test of a face-down card that names a player. **Add now:** it is a cheap hidden-information test.
- **(8)** The waiting view's label fallback is unreachable. **Leave**, and say so in a comment.
- **T2** The move-to-another-player's-zone message. **Fix now** (Minor 2).
- **T3** `, choosing` on a press with named options is untested. **Add the test if cheap.** An option labelled "p2" is a leave.
- **T4** "highest" with negatives. **Fix now** (Minor 3). The missing `shownPlayerValues` test can be left, since it holds by construction.
- **T5** The stale comment. **Fix now** (Minor 6). The unreachable "which is now in" for a card with no seat key can be left.
- **T6** The "in no player's zone" branch is unreachable. **Leave.** Rename the test (Minor 12).

### Declined to judge
- Card ids of face-down cards listed for picks: this is the 6-1 design, and the scene keeps the ids anyway.
- The picker showing "Stake" with no maker: Gap 1, deferred to 7-3.
- Lookups not shown on the page: Gap 2, 7-3.
- A posted stake on the page: Gap 3, 7-3.
- R20(a): deferred by ruling.
- A pass button with an Only-if line that might be false: this is the rules writer's choice, and the steps phases have the same shape.
- A tie reading every player fact: a recorded limit.
- A pick's own zone being one place: a recorded limit.
- Card counts of hidden zones being public: existing design.
- Startup timing: the controller measured it.
- `flowDefFor` being byte-identical: the pre-flight verified it.
- RuleErrors in flow triggers escaping `engine.dispatch` as exceptions: existing engine behaviour in a protected file.

### Recommendations
1. Fix Important 2 and 3 now. Each is a small refusal in the existing pattern (`refuseEnteringSteps`, or a check in `hiddenZoneRead`) and makes README.md:322 true.
2. For Important 1, either add the three out checks or record "a player going out while an action waits" as a known limit. The fix is small enough to prefer.
3. Take the cheap parked fixes in one commit: (1), (3), (5), (7), T2, T4, T5 and the T6 rename. Add Minors 1, 4, 5 and 9 to the same commit.
4. Add a one-line comment in `closeWindow`: it skips `endsTurn && clearTurnLog` (declared-actions.ts:384-397), which is safe only because AFTER_NAMES_ACTION keeps a button with a cost out of an After line.
5. Carry Minors 7 and 8 into 7-3's waiting-view work.

### Assessment
**Ready to merge? With fixes.**

Nothing is Critical, and none of the issues blocks 7-2's Startup text: Startup eliminates no one, never goes into its window phase from elsewhere, and has only public counters. The core of the work is sound and well tested:
- The window's normal life.
- Undo and replay.
- The cross-seat split.
- The card-alone cache.
- The hidden-card handling in the waiting view.

The three Important issues are all latent, but each lets rules that compile cleanly either lock the game or leak hidden information. Each one breaks a promise the README makes to rules writers, and each costs little to close now while the window code is fresh. Merge after Important 2 and 3, Important 1 (fixed or recorded), and the cheap parked fixes.
## Appendix: the fix wave's brief

### Plan 7-1 final fix wave

Repo `/home/user/turnhout`, branch `claude/peaceful-curie-rdfkow`, HEAD 71830a9 (4005 tests, typecheck clean). The plan's BASE is 08dbe1b.

The final review is `/home/user/turnhout/.superpowers/sdd/2026-10-16-startup-slice-7-1-language/final-review.md`. Read it first. Its probes, which reproduce Important 1–3, are in `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/fr71/head/src/engine/core/lang/probe*-fr71.test.ts`. Use them as starting points for your tests, but write your tests in the repo's own files.

The controller's rulings follow. Each item says what to build and the exact copy where copy is new. Do every item. Where an item is wrong at HEAD, say so in the report rather than guess.

## Important 1: a seat that goes out while an action waits

Ruling: fix. Out seats are never asked or handed an answer, and an out player's waiting action never goes ahead.

- **Skipping out seats (`library/turn-phrases.ts`, `passAnswer`).** The next asked seat is the first at an index after `at` that is not out (`isOut`). With none left, the verdict is `'ahead'`, and `at` is unchanged.
- **The current answerer goes out (`library/board-phrases.ts`, `goesOut`).** If the player who goes out is the current seat, and an action waits with no verdict in the window phase, the answer passes on through `passAnswer`, before `passStep` and `chooseNext`. Export `passAnswer`, or a wrapper, from `turn-phrases.ts`.
- **The actor is out when the window closes (`runtime.ts`, `closeWindow`).**
  - The turn is put back as today. The action does not go ahead, whatever the verdict, and its cost stays spent.
  - The turn then passes on exactly as `goesOut` would have passed it had they gone out on their own turn: through `passStep` in `back.phase` when that gives a state, else `chooseNext(nextIn(...))`.
  - Factor the shared continuation into one helper used by both, rather than copying it.
- **Tests** (`action-window.test.ts`, a new `describe('a seat that goes out while an action waits')`). Use `OBJECT_GAME` with an objection button `Any player may give up.` / `Then: They are out.`, or the probe's equivalent fixture.
  - (a) p1 and p2 are asked, p2 gives up, then p1 lets it go. The action goes ahead, the current seat is p0, and nothing throws.
  - (b) Only p1 is asked, and p1 gives up. The action goes ahead, the current seat is p0, and p2 was never made current.
  - (c) The actor p0 gives up during the window, and p1 lets it go. The action did not go ahead (the Potter is still in the hall), and the current seat is the next seat still in after p0.
  - Each case also passes undo and replay: a fresh table given `loadLog(engine.getLog())` equals the engine's state.

## Important 2: entering the window phase, and leaving it other than by its own words

Ruling: fix, in the existing pattern.

- **New message in `compile.ts`, next to the other WINDOW_ messages:**
  `const WINDOW_ENTERED = (phase: string) => \`The players go to the ${phase} only to answer an action, so no line can go to it.\`;`
- **Refuse entering the window.** When the window survives `checkWindow` (non-null), refuse each line elsewhere that goes to or starts the window phase. Use `refuseEnteringSteps(phase, WINDOW_ENTERED(phase), elsewhere, phases, library, diagnostics)`, called beside the STEPS_ENTERED / ROUND_STEPS_ENTERED calls.
  - The window phase coming first must still give only `WINDOW_FIRST`, on the window line, as Task 7's test pins. It must not give a second message on the phase line.
  - Give `refuseEnteringSteps` an option to skip its first-phase check, or skip the call's first-phase part some other clean way.
- **Refuse other ways of leaving the window phase.** The `WINDOW_GO_TO(id)` loop over the window phase's own lines also refuses:
  - a line whose `phaseStartedBy(ref, library)` is not null, meaning it starts a phase;
  - a line that is `GO_BACK_PHRASE`.

  Both use the same `WINDOW_GO_TO(id)` message.
- **A runtime guard.** `openWindow` throws `new Error('An action waited while another was waiting.')` when a Waiting is already in `state.data`.
- **Tests** (`action-window.test.ts`, in the existing `describe('the line and its refusals')`). Each is the exact diagnostic `[[lineOf(text, line), message]]`:
  - `Go to objection.` added under a working button's `Then:` gives `WINDOW_ENTERED('objection')`;
  - `The objection phase starts with them.` there gives the same;
  - a working phase `go to` rule naming objection gives the same;
  - a window-phase button line `The answer phase starts with its owner.` (or any phase-starting line the fixture has) gives `WINDOW_GO_TO('objection')`;
  - `Go back to the interrupted turn.` in the window phase gives `WINDOW_GO_TO('objection')`;
  - (guard) `OBJECT_GAME` itself still compiles with no diagnostics.
  - A runtime test of the `openWindow` guard. Call the runtime directly on a state that already holds a Waiting.

## Important 3: the clause reads a counter only its owner sees

Ruling: fix.

- In `hiddenZoneRead`, a `{counter}` argument naming a counter whose `visibility` is `'owner'` is hidden. It is said as `their <counter>`, so the message reads `WINDOW_READS_HIDDEN('their coins')`.
- Pass the game's counters (`board?.counters`) into `checkWindow` / `hiddenZoneRead`.
- Since the walk already goes down through player values and worked values, a counter read through them is covered as well.
- **Tests:**
  - a clause `who has at least 5 coins`, with coins declared `that only they can see`, gives that diagnostic on the window line;
  - (guard) the same clause with public coins compiles clean;
  - a player value that reads the hidden counter, used in the clause, gives it too.

## Minors and parked findings (all in one commit with the above, or a second commit)

1. **Orphaned doc comments.** In `library/compare-phrases.ts` (~84–90) and `library/card-pick-phrases.ts` (~298–304), move each registrar's doc comment back above its registrar (`registerComparePhrases`, `registerCardPickPhrases`). The inserted helpers keep their own short comments.
2. **A move to another player's zone** (parked T2, `compile-phase.ts` `moveZones`). Test `found[3]` against `ANOTHER_PLAYERS` too, and give this new message:
   `const OTHERS_NOT_WHERE_DRAGGED = (text: string) => \`A card is dragged only to the player's own zones or the center: say whose zone “${text}” is, as in “their ${text.replace(ANOTHER_PLAYERS, '$1')}”.\`;`
   Test: `Players may move a card from their stash to another player's purse.` (or the fixture's equivalent) gives exactly that message on its line.
3. **"highest" with negative values** (parked T4, `library/player-value-phrases.ts` `valueIsTheHighest`). It is the highest number present, and 0 only when no card has one. Update the doc comment. Test: a group whose cards' values are all negative (−2 and −5) gives −2, and an empty group gives 0.
4. **A local named `window`** in `action-window.test.ts` (~66). Rename it `answering`.
5. **A stale comment** at `types.ts:28` (PlayerWho): drop "(Task 7 adds 'acting')".
6. **A stale comment** in `compile-phase.ts` ~672–680 (parked T5), on `reportHiddenCardReads`. Reword the sentence about narrowing `cardsOn` to match the code: `cardsOn` now gives only the holder's owner's cards, and `othersOn` the rest. Say what that does and doesn't close, in the comment's own voice.
7. **The test title** at `card-value-phrases.test.ts` ~505 says 'is the RIVAL_GAME' but asserts on POST_GAME (parked T6). Rename it to match what it asserts.
8. **README.md ~320.** "An answered action has spent its cost and done nothing else" becomes "A stopped action has spent its cost and done nothing else". Once Important 2 and 3 are in, line ~322's claim is true; leave it.
9. **The plan's recorded limit** (`docs/superpowers/plans/2026-10-16-startup-slice-7-1-language.md`, the first "Recorded limits" bullet, ~l.1536). Widen it:
   - not only a window button, but the window phase's start lines and the rules for every phase can change what the waiting action reads;
   - the action may then throw as it goes ahead (`dispatch` throws), or go ahead on the changed table;
   - keep the sentences about slice 7's veto and about a later window.
10. **A comment in `closeWindow`.** It skips the `endsTurn` / `clearTurnLog` handling a press gets in `declared-actions.ts`. That is safe only because `AFTER_NAMES_ACTION` keeps a button with a cost out of an After line. Say so in one line.
11. **Parked (1): the guard test** (`action-window.test.ts` ~71). Replace `expect(flowDefFor(crew, SEATS)).toBeTruthy()` with assertions that bite:
    - `CREW_GAME`'s flow trigger ids do not include `WINDOW_RULE`;
    - `OBJECT_GAME`'s first trigger id is `WINDOW_RULE`.
12. **Parked (2).** Add a test that a clause reading a worked value that reads itself (for example a worked flag defined through itself), or two values that read each other, compiles without hanging and with the expected diagnostics.
13. **Parked (3).** In the `holds` case (~131), use `swap(...)`, which asserts that its text was found, instead of an unchecked `.replace`.
14. **Parked (5): 'finishes no round while an action waits'** (~329). Make it bite: current p0 with p0 the start player, `TURN_OF_KEY` 'p2', `ROUND_KEY` 1, and `lang:window` set gives `roundFinished` false. Then the same state with the `lang:window` key absent (not null) gives true.
15. **Parked (7).** In `board-view.test.ts`'s `describe('a waiting action')`, cover a face-down card that names a player. p0 swaps a Stake whose maker is p2 from `stash-p0`, or whatever the fixture allows. p1's `waiting.cards` is exactly `['a face-down card']`, with no `whose maker`, and p0's is `['Stake whose maker is p2']`. If the fixture can't put a Stake where `swap` picks, report it and add the nearest equivalent.
16. **Parked (8).** In `waitingView`, a one-line comment saying the label's `waiting.move` fallback is never reached for a compiled game, and is kept for a stored state read against changed rules.
17. **Parked T3**, only if cheap: a test of the log line's `, choosing <option>` on a press that both asks a player and has named options. Otherwise say it was skipped.

## Constraints (unchanged from the plan)

- **Protected files.** Never touch `src/engine/core/game-state.ts`, `flow.ts`, `game-engine.ts` or `src/pages/hearts-demo/**`.
- **Purity.** `git diff 71830a9 -- src/engine/core ':!*.test.ts' | grep '^+[^+]' | grep -E "from '(pixi|react|@/components|@/utils)|(^|[^.[:alnum:]_])(document|window)\.|Math\.random|Date\.now"` prints nothing, and no local is named `window`.
- **State and words.** State is Json-only, under `lang:*`. No Startup Simulator words, and never "veto", "supply" or "partner" in code, comments or tests. The plan doc's existing text keeps its own words.
- **Imports.** New imported names go on NEW import lines. `git diff 71830a9 -- src | grep '^-import'` prints nothing.
- **Existing test lines.** Test lines that existed at 08dbe1b do not change. This plan's own tests, added since 08dbe1b, may change where an item above says so. List every changed test line in the report.
- **Other games.** Hearts, Color Match, Venom and Rent Day are unchanged, and Rent Day keeps 108 examples. Startup keeps 307, and `src/games/startup-simulator.test.ts` passes.
- **Commits.** Commit by pathspec, never `git add -A`, prefix `fix(lang):`, ending with:
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
- **Verification.** TDD: see each new test fail for its reason first. Then run `bun run test` once at the end, and `bun run typecheck`.
