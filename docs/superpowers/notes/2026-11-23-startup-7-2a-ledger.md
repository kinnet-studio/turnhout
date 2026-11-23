# Plan 7-2a (rules and long runs: Equity held): SDD ledger

Kept from the SDD workspace (git-ignored) when the plan finished. Plan: `docs/superpowers/plans/2026-10-16-startup-slice-7-2a-rules-and-runs-equity-held.md`; pre-flight: `2026-11-23-startup-7-2a-preflight.md`. The final review and the fix wave's brief follow as appendices.


- Started 2026-11-23 after plan 7-1 (HEAD dbb2f34, 4026 tests). Spec: the slice 7 spec under the overview (via the plan header); rulebook /home/user/suwa/rulebook.md.
- Pre-flight (opus) back: no blocker in the plan text; 29 findings — 27 fix-in-plan (R1–R22, R24–R28), 2 ruling-needed (R23, R29). Probe pf72a/work, BASE 21ed452 (d3b054c + 7-1's probe), branch probe72a 6740cc7, opt-cut bdafc5c: 4006/4006, tsc clean; Startup 307 → 331 examples; checks 1–3 clean, check 4 only the named pins. Saved → docs/superpowers/notes/2026-11-23-startup-7-2a-preflight.md.
- Ruling: every fix-in-plan amendment (R1–R22, R24–R28) accepted as the report writes it — each was built and run in the probe — the plan text is amended to match.
- Ruling R23: (a) demote the four earlier keys (a Junior PM promoted at a Launch; Pending tokens returned by a pivot; Trade Show's $2 TechCrunch Feature; a trained Junior declared blue) to HELD_BY_FEWER_THAN_TWO, each with its named pin — why: the precedent of 6-2b's R4(a) and the retune 2, nine cadences tried, each key is pinned by an arranged example — cost if wrong: four paths covered by examples only, not by long runs; a later retune can promote them back.
- Ruling R29: (a) now — take opt-cut (drop the 4-player replay; the 2- and 3-player replays count placing Invests, Round Start placements and Consultant pivots; keeping back to players <= 3) — why: the cheapest built cut (+5.4 s instead of +7.9 s, ×1.25), coverage kept — cost if wrong: one fewer seat count replayed whole. And (d): at 7-2a's end the controller times Startup's file alternating BASE/HEAD; if HEAD's best is over 30 s (or 7-2b's pre-flight projects it over with the Veto stop), a "speed-up 4" mini plan runs before 7-2b, as speed-ups 2 and 3 did. R20 stays (b) (no auto-pass): 7-3's pre-flight carries it.
- Probe rebased onto the real 7-1 head dbb2f34 (pf72a/rebase, branch rebase72a; all 20 commits cherry-picked with no conflict): full suite 4029/4029 (4026 + 4 new − the dropped 4-player replay), tsc clean. So 7-1's real head (R21's `, choosing`, the fix wave's window refusals, passOnFromOut, highest below 0, the dragged-to refusal) changes none of 7-2a's findings.
- Ruling: implementers get the rebased probe commits (pf72a/rebase) as cross-check references: T1 bc8acfd + A-T1 5214a34; T2 973bc7d + A-T2 e9822a4; T3 b341997 + A-T3 27965b3; T4 d77401d + A-T4 4ba752b; T5 273acd2 + A-T5 e685ac8 + A-T5b 0303346 + A-T5c 3780f3e; T6 d619263 + A-T6 302c978 + A-T6b d51a2b6; T7 2f82124 + A-T7 d53dd16 + A-T7b 9b48d4a + A-T7c ba1205e + OPT 81959dd (R29(a)). The amended plan text is the requirement.
- Amender dispatched (sonnet): R1–R28 as the report writes them, R23(a), R29(a), BASE note (dbb2f34 code, 4026 tests).
- 7-2b pre-flight dispatched (opus, background) on pf72b2: dbb2f34 + 7-2a's rebased probe (dbb2f34..rebase72a) as its BASE; timing decides R29(d).
- Amender DONE (3529c3e, pushed): plan 1243 → 1462 lines; small deviations (R25 parenthetical replaced, R4 git add on l.275, R7 l.456 wording, R27 antecedent, R10 no doc bullet for the Workaholic key, R21 list replaced whole) accepted; 3 new it()s, end count 4029. BASE for Task 1 = 3529c3e (code as at dbb2f34, 4026 tests, Startup 307).
- Task 1 dispatched (sonnet), BASE 3529c3e; references bc8acfd + 5214a34 in pf72a/rebase.
- Task 1 DONE (2e20abc, pushed): applied the probe's bc8acfd+5214a34; tsc clean; full 4026 (examples inside one it()); Startup 309; removal probe kills Setup and score lines. Review dispatched (sonnet) on review-3529c3e..2e20abc.diff.
- Task 1 review: spec ✅, quality Approved, no findings (one non-issue Minor). Task 1: complete.
- Task 2 dispatched (sonnet), BASE 2e20abc; references 973bc7d + e9822a4.
- Task 2 DONE (103ad6b, pushed): probe diff 5214a34..e9822a4 applied (same stat); tsc clean; full 4027; Startup 313 (~26 s); removal probe: every added line fails an example or compiles a diagnostic. Review dispatched (sonnet).
- Task 2 review: spec ✅, quality Approved. Minor parked: no tally of Invests / VC Rain Invests in the long runs — Ruling: no change now — Task 7 adds the slice-7a tallies (Invests at $5/$10/$15, VC Rain) — cost if wrong: none, T7's review checks it.
- Task 2: complete.
- Task 3 dispatched (sonnet), BASE 103ad6b; references b341997 + 27965b3.
- Task 3 DONE (9840be3, pushed): probe diff e9822a4..27965b3 applied (same stat); tsc clean; full 4028; Startup 317 (= N₈ + 10); removal probe: each added line fails. Review dispatched (sonnet).
- Task 3 review: spec ✅, quality Approved. Minors parked: (1) dividendsTo reads the rules' own `dividend` value — Ruling: keep — the brief prescribes it and the edges test plus examples pin the table independently; the reviewer's removal of Income's line broke the money check in every long run — cost if wrong: none. (2) no FAIL-first step (probe diff applied) — Ruling: accept — the removal probes show each line is tested — cost if wrong: none.
- Task 3: complete.
- Task 4 dispatched (sonnet), BASE 9840be3; references d77401d + 4ba752b.
- Task 4 DONE (a512fa7, pushed): written by hand, not the probe's patch — the rules part matches the probe; the test file's License check differs (asserts a Partner's net is 0 rather than capping its Licenses at 0), the old one-line comment kept, two comment lines run long. tsc clean; full 4028; Startup 321; each of the 6 guard lines' removal fails the examples. Review dispatched (sonnet), told to check the License check, the comment and the line widths.
- Task 4 review: spec ✅, quality Approved; License check judged correct. 3 Minors (comment-only): l.2245 doc bullet 187 cols, l.1617 HELD bullet 386 cols, l.2376 stale "the mover lacks" comment beside a second one. Ruling: fix all three myself now (comment-only, no behaviour) — cheaper than a fix round — cost if wrong: none.
- Fix 54ccf26 (pushed): the two lines rewrapped, the two comments merged into one accurate one; tsc clean, Startup 113/113.
- Task 4: complete.
- Task 5 dispatched (sonnet), BASE 54ccf26; references 273acd2 + A-T5 e685ac8 + A-T5b 0303346 + A-T5c 3780f3e.
- Task 5 DONE (e3d2032, pushed): applied the probe's 273acd2, e685ac8, 0303346 and 3780f3e (my dispatch wrongly named 4ba752b..3780f3e as the whole task — that range also holds T6 and T7; the implementer applied the four commits alone). Rules diff byte-identical to the probe's 4ba752b..0303346; ON_SEAT_KEY put on a new import line (the probe edited an existing one). tsc clean; full 4028; Startup 329; 29.0 s test time; removal probe over 32 rules lines all fail. Review dispatched (sonnet).
- Note for later dispatches: name the probe's task commits one by one (T6: d619263, 302c978, d51a2b6; T7: 2f82124, d53dd16, 9b48d4a, ba1205e, 81959dd), never a range.
- Task 5 review: spec ❌ (one gap), quality Changes requested. Important: the long runs' structural Invest check (one card moved, from its Founder's equity of 2 or more, to the mover's portfolio) still read only INVEST, though the brief says "an INVEST_PLACING press is checked as an INVEST (Task 2)". Ruling: fix it myself (a one-condition change; the probe carried the same gap) — cost if wrong: none.
- Fix 100a8d3 (pushed): the check reads [INVEST, INVEST_PLACING]; Startup 113/113, 29.0 s; a temporary failing assert inside it for INVEST_PLACING failed 11 tests, so the 13 placing presses do reach it. Minors parked: ON_SEAT_KEY on its own import line (by our rule); the Toxic exclusions read the rules' consultant values (examples 3–6 pin the amounts) — no change.
- Note for 7-2a's final review / 7-2b: the probe had this gap too — 7-2b's pre-flight probe (pf72b2) carries it; its amender should know.
- Task 5: complete.
- Task 6 dispatched (sonnet), BASE 100a8d3; references d619263, 302c978, d51a2b6 named one by one.
- Task 6 DONE_WITH_CONCERNS (8631877, pushed): ported d619263, 302c978 (HELD hunk by hand), d51a2b6; rules diff equals the probe's net result. tsc clean; designer 524; full 4028; Startup 331; ~32 s test time; removal probe over the event-check block all fail.
- Ruling (T6 concern): the 3p seed-1 undo pin is 50, not the brief's 51 — the brief's 51 came from the probe's older t % 3 cadence, while the amended brief mandates t % 4 === 1 (A-T7's cadence), which plays 50 moves; keep t % 4 and 50 — Task 7 re-pins it anyway — cost if wrong: one pin. Task 7's brief line "pins 52 moves (it pinned 51 after Task 6)" reads "(it pinned 50 after Task 6)"; T7 pins what it measures.
- Ruling: playtest-fitted.test.tsx changed though Step 5's git add omits it — Step 1 asks for the pin — accepted.
- Timing watch: Startup ~32 s under load after T6 (29.0 s after T5). R29(d) decides at plan end on alternating BASE/HEAD runs.
- Review dispatched (sonnet).
- Task 6 review: spec ✅, quality Approved. 3 Minors + timing info: stepsEndedIn's pre-7-2a "no steps this round" branch stale (harmless: only the Audit caller); README l.296 quotes the removed "acting once" line; the view test's eventFlags lists the gone 'acting once'. Ruling: fix all three myself (small, no behaviour change in the rules) — cost if wrong: none.
- Fix 3d368a3 (pushed): stepsEndedIn → `stepsDone(after, seats) ?? seats` with a comment; README quotes "Each player has the event check, in turn from the start player."; 'acting once' dropped. tsc clean; Startup 113/113 (27.0 s tests).
- Task 6: complete.
- Task 7 dispatched (sonnet), BASE 3d368a3; references 2f82124, d53dd16, 9b48d4a, ba1205e, 81959dd named one by one.
- Task 7 DONE (c8c7a88, pushed): ported 2f82124, d53dd16, 9b48d4a, ba1205e, 81959dd. tsc clean; full 4029 (= plan's end count); Startup 331, 114 tests, ~37 s under load; games alone pass, Rent Day 108. Tallies match the brief's table (Invest $5 20 games, $10 1, $15 0, VC Rain 3, hard cap 3, dividend $1 16/$2 2/$3 0, Partner waiver 14, placed Blue/Red/QA 20/9/13, Engine cube 20/Bug 6/Stalled 9, bandwidth 15, Ops QA Bug 0, Launch keeps 16, Pivot returns 3, Round Start placed 13/moved 17, two on one product 2). HELD_BY_FEWER_THAN_TWO: +4 unreachable ($10, $15, $3 dividend, Ops QA Bug), +4 demoted by R23(a); the two provisional entries removed. Undo pins: 3p seed 1 → 52; assign-launch-pivot-reassign → 3p seed 4, 64 moves.
- Step 5 shell checks over dbb2f34..HEAD run by me: checks 1–3 print nothing; check 4 prints only the count and the pins Tasks 1 and 6 reported.
- Review dispatched (sonnet), with the skipped Step 5 checks (≤3 tokens per player in examples; numbers spot-check).
- Task 7 review: spec ✅, quality Approved. 2 Minors parked for the final fix wave: (1) the tally tests require `tally[key] > 0` over all games, so "held by 2 or more games" lives only in comments (the file's existing convention since slice 3); (2) older tally-test comments (l.4346–4352, 4390) still give the per-seed counts the 7-2a steer changed for the four demoted keys. Ruling: both go to the final reviewer and the fix wave — cost if wrong: none.
- Task 7: complete. All 7 tasks complete; HEAD c8c7a88.
- Plan-end timing (Startup's test file, alternating BASE dbb2f34 / HEAD c8c7a88 in a worktree, load avg ~5–6.5 from the 7-2b pre-flight): BASE 28.4 / 29.7 / 36.0 s; HEAD 38.1 / 45.3 / 48.2 s. Best: BASE 28.4, HEAD 38.1 (+9.7 s, ×1.34 — over the pre-flight's +5.4 s estimate). Ruling R29(d) applies: HEAD's best is over 30 s, so a speed-up mini plan runs before 7-2b — cost if wrong: a plan's worth of time.
- Final review dispatched (opus) over dbb2f34..c8c7a88 (package review-dbb2f34..c8c7a88.diff).
- Speed-4 profiling proposal dispatched (opus, background) on perf4/ (clone at c8c7a88; BASE c8c7a88, pre-7-2a dbb2f34) — the input to the speed-up mini plan R29(d) calls for.
- Final review (opus) back (final-review.md): no Critical; rules match the rulebook number for number; invariants independent and strong. 1 Important, 4 Minors.
  - Ruling Important 1 (a Round Start token can be placed again and again in one step, so "not on the target card" is bypassed by a bounce): fix — §17.B.4 "you may move the token to a different card", once per Round Start — with a `moved this round` flag cleared as each round starts, a guard and a setter on the place button (not on the placing Invest), and two examples (bounce refused; moves again next round) — cost if wrong: two examples and four lines.
  - Ruling Minor 1 (colour invariant checks one colour, not the one chosen): fix — 7-2b adds three token paths — cost if wrong: none.
  - Ruling Minor 2 (long runs read amounts back from the rules): partly — count Consultants from card data in the Toxic checks and tally keys, work the Invest price from tiers; keep the dividend check (Task 3 ruling) and add no Engine "blue added" comparison (example 3 pins it) — cost if wrong: a weaker net on one line.
  - Ruling Minor 3 (README l.346 Board line, l.296 steps line): fix. Parked Task 7 Minor (stale per-seed comments): fix in the same commit. Parked `> 0` convention: keep.
  - Minor 4 (where the time goes: the supplies' pooled Consultant reads, ~393 confirms, investing()'s reduce): sent to the speed-4 profiler.
  - For 7-2b: its amender takes the 7-2a head after this fix wave as BASE (the probe's test file lacks 100a8d3, 3d368a3 and this wave); its take-and-place button must also respect `moved this round`.
- Fix wave dispatched (sonnet) with fix-brief.md: F1 moved-this-round, F2 colour chosen, F3 card-data counts and tier price, F4 README and comments.
- Fix wave DONE: 5 commits; tsc clean; full 4029; Startup 333; designer 411. F1 removal probe: each of the four lines fails (the declaration by compile error). F2 mutation (Blue/Red swapped) fails the long runs at 2–5 players, but the fixer did not confirm the failing check is the new one — sent to the re-review to verify. F3 probe: deleting `share price is 10` fails the 2p long run's money check. F4 done (Trade Show's count trimmed rather than noted). Tallies unchanged.
- Ruling: the fixer's commits carried "Co-Authored-By: Claude Sonnet 5.5" (its own harness's attribution line) against the session's standing trailer rule; rewrote the five unpushed commits' messages to `Claude Opus 5.5` with filter-branch (trees identical), then pushed — fix-wave head b120ee2 — cost if wrong: none (never pushed before the rewrite).
- Scoped re-review dispatched (sonnet) on review-c8c7a88..b120ee2.diff, with the F2 mutation to check in a scratch worktree.
- Scoped re-review (fix-re-review.md): Important 1, Minors 1–3 all addressed ✅, with evidence (F1 each line's removal fails an example; F2 the Blue/Red swap fails on the new colour check — "the colour c150 was placed in, answered Blue … expected ['red consultant'] to deeply equal ['blue consultant']"; a stray `No card is blue consultant.` at the Round Start fails the colour-flags half; F3 consultantsOn mirrors rules l.317–326, the price mirrors §17.A). New Minors: the Share Price jsdoc stranded above consultantsOn; a ragged tally comment; a 148-col code line (code, not counted).
- Fix 9cd552f (pushed): jsdoc back above sharePriceOf, the comment rewrapped; tsc clean; Startup 114/114 (29.5 s tests). Residuals: none open.
- Plan 7-2a: DONE. Head 9cd552f; 4029 tests, Startup 333 examples, Rent Day 108.

## Appendix: the final review (opus), adjudicated above

### Final review: plan 7-2a

#### Strengths

- **The rules match the rulebook, number for number.** I checked:
  - 3 tokens (§2, §4.4);
  - $5 / $10 / $15 by the highest Active Tier, with Offline left out (§8, §17.A, §9.A, ruling 5);
  - dividends of $1 / $2 / $3 from $1 / $11 / $21, paid by the bank at the Founder's Income, after revenue and Market Share (§5 Phase B, §9.B);
  - the hard cap (§17.D), Venture Capital Rain's +$3 (§20.D 1) and 5 VP per rival token (§12.4).

  I recomputed every number in the 24 new examples, and the edges test pins 10→$1, 11→$2, 20→$2 and 21→$3.
- **Edge cases I ran as extra examples in a scratch worktree behave as the rulebook says:**
  - Partnership is not transitive: p0 tied to p1 and p1 tied to p2 means p0 pays p2.
  - Two players holding each other's tokens are each paid only at the other's Income.
  - A QA Consultant plus a Junior QA on 3 Bugs removes 2. Pending green comes only from `qa team output`.
  - A hard-capped Invest during Venture Capital Rain is refused and pays nothing.
  - A placing Invest onto a Maintenance product raises the Founder's supply by 1.
  - Launch keeps Consultants on the product and Pivot returns them. Both blocks' "cards on it" read only the Founder's own staff (R1), and Pivot is the only rule in 7-2a that takes a product off a Board.
- **The structural invariants are independent of the rules' own values, and strong:**
  - conservation: 3 tokens per Founder, each in that Founder's equity or a rival's portfolio, with no stray cards;
  - a Founder's equity is never empty;
  - an Invest moves exactly one card, from an equity of 2 or more;
  - attachment: a placed token sits on its Founder's development or operations, with the right on-seat, never on its own Investor's product;
  - exactly one colour while placed and none while unplaced;
  - a token's place changes only by a placement or a Pivot return;
  - the License check works out Partners from portfolio data (`tiedTo`);
  - the money check covers who gets dividends and when, and Venture Capital Rain from `eventOf`.

  These will also catch 7-2b's most likely slips: a returned token still placed or still coloured, a fourth token, or a token in the wrong zone.
- **Global constraints hold:**
  - No shared code, page source or protected file changed. The only page-test edits are the named pins.
  - The two new import lines are separate lines; no existing import was edited.
  - All 12 commits carry both trailers and no model identifiers.
  - The Startup file passes at HEAD: 114/114, 32.3 s of tests.
- **The rules text at HEAD is byte-identical to the probe 7-2b's pre-flight was built on.**

#### Issues

**Critical:** none.

**Important**

1. **Round Start placements are unlimited, so the "different card" guard can be bypassed** (`src/games/startup-simulator.rules:1641–1655`, guard at 1643).
   - **What happens:** `Only if it is not on the target card.` refuses recolouring a token where it sits. But nothing limits how often a token is placed in one step, so two presses do it. Probe: p1's red token is on p0's Smart Lock. Placing it on the Smart Lock is refused; placing it on the Dating App and then back on the Smart Lock choosing blue is accepted, and the token ends blue on the Smart Lock. A token can also be placed three times in one step.
   - **Why it matters:** the rulebook (§17.B.4: "you may move the token to a different card") and the spec (l.38: "may move it to another of the Founder's product cards (and pick its color again)") both allow one move to a different card. The auto-player places at most once per step (`startup-simulator.test.ts:1624–1625`), so no long run, tally or example meets this. 7-3 will put the button on the page, where any player can find it. No ruling in the ledger covers it.
   - **Fix (tried on c8c7a88):** no diagnostic, the 331 examples plus the new one pass, and the Startup file's 114 tests pass. The rules lines:
     - `  Cards can be moved this round.` after `Cards can be qa consultant.`;
     - `    No card is moved this round.` just before the steps line (l.877);
     - in the place button, `    Only if it is not moved this round.` after the target guard, and `      It is moved this round.` after `It goes to their portfolio, on the target card.`
   - **Pins it needs:**
     - an example where the bounce is refused with "it is not moved this round";
     - an example where a token moved at one Round Start moves again at the next. Without it, removing the clearing line fails nothing, because `choose` falls back to confirm.
     - a re-run of the designer tests, since a moved token now carries a flag the Board text may list (7-3 may want it unshown).
   - **Alternative, as a recorded builder call:** drop the "not on the target card" guard and let a Round Start recolour in place. That is more generous than the rulebook.

**Minor**

1. **The colour invariant checks that a placed token has one colour, not that it is the colour just chosen** (`test.ts:2761`, `2803–2814`). Review Focus 2 claims the long runs check "the one just chosen".
   - Fix: on `INVEST_PLACING` and `PLACE`, check `colours` equals `[CONSULTANT_COLOURS[answersOf(move)[0]]]`.
   - Extend the place-change loop to the three colour flags: they change only in a placement of that token or the Pivot that returns it.
   - 7-2b adds three more paths that touch tokens. Today a stray colour line would show only if it left two colours.
2. **The long runs read amounts back from the rules rather than checking them:**
   - the Invest price (`test.ts:2522`) and the dividend (`2527`, ruled in Task 3);
   - the Consultant counts in the Toxic checks (`3038`, `3053`) and in the tally keys (`2002`, `2343`).

   So "a Consultant's cube at the Engine", held in 20 games, proves only that a coloured, unstalled token sat on a project, not that a cube was added. Removing `A card's blue added goes up by its consultant blue.` fails only example 3. Cheap fixes:
   - count Consultants from card data (`othersOn(state, id).filter((t) => t.data?.[flag] === true).length`, 0 when stalled) and use that count in the Toxic checks and the keys;
   - at the Engine, compare `blue added − blue made − Crunch's cube` with that count;
   - work the price paid out from the Founder's online operations' `data.tier`, and the dividend from `earned` with a three-line table.

   I agree with the Task 3 ruling that the edges test and examples pin the dividend table; this tightens the check rather than reversing the ruling.
3. **README:**
   - l.346 quotes Startup's Board line as it read before 7-2a. Every seat's line now ends ` · equity: Equity; Equity; Equity`, which is exactly the change the `BOARD` pin in `playtest-fitted.test.tsx` got.
   - l.296 files the now-unconditional steps line under "plays slice 6 this way". It is 7-2a's line: add "(every round since plan 7-2a)", or move it to the slice-7 bullet at l.324.
4. **Where the time likely goes:**
   - Every supply now sums the operations' pools as well, and every pool reads three "other players' cards on it" groups. Supplies are read by the ops check's guards, the gauges and several invariants after every move, so this is the likely bulk of the +20% per move. Count the `playerValue` calls for the supplies before choosing a cut.
   - The 393 confirms are about 7% more moves, each running every invariant (R20(b), carried to 7-3).
   - `investing()`'s reduce calls `priceOf`/`revenueOf` (both `playerValue`) twice per comparison, on every action while Venture Capital Rain is in play. Memoizing per Founder is a small gain.

#### Declined to judge

- **A Consultant's bandwidth counts on an Offline product:** a recorded call from suwa's `ops_bandwidth.rs`. The rulebook is silent, and counting it avoids a circular Offline choice.
- **A QA Consultant's Ops Bug goes into the pooled Ops QA:** a builder call recorded as settled.
- **Crunch Time's "still needs Blue" ignores the Consultant's cube:** a recorded call following suwa's `run_generate` order.
- **Open Source Boom, Hardware Hackathon, Server Crash and Supply Chain Logjam don't touch a Consultant's +1:** the rulebook names staff, or is ambiguous ("All Hardware output"). This is consistent with "the output is the product's".
- **An Investor stops at every Round Start even with nothing to do:** R20(b), ruled and carried to 7-3.
- **Immunity has no line:** no Headhunter or Hit Piece button exists until slice 8 (the plan's Gaps).
- **A seat with an empty portfolio sees "Confirm your consultants" on the page:** 7-3's wording.
- **A placed token is listed under the Founder's product, not in the portfolio, in the Board text:** 7-3, R1's page bullet.
- **Tier 1 has no `tier number`:** a plan call; a top tier of 0 covers "Tier 1 only or none".
- **R23(a), R29(a), the `> 0` tally convention, the stale per-seed comments, `TWO_CONSULTANTS` counted per move, `ANGEL_PAID` at the reveal move:** all ruled, parked or known. I think each ruling is right.
- **The tie phrase reads any player-naming fact:** only `founder` exists, and only cards in portfolios count. Slice 8 should keep new player-naming facts out of portfolios.

#### Assessment

7-2a is ready to build 7-2b on once Important 1 is fixed, or the owner rules to accept repeated placements as a builder call. There is nothing Critical, and the rules agree with the rulebook everywhere I checked. The names 7-2b leans on (`founderOf`, `portfolioOf`, `sharePriceOf`, `CONSULTANT_COLOURS`, `foundersBoards`, the Invest buttons, the conservation and colour invariants, the Round Start step) are sound. `foundersBoards`' order matches `ontoZoneIds`: every rival's development, then every rival's operations.

The fix touches only the event check, which 7-2b's Veto doesn't open on, so it fits the fix wave or the speed-up mini plan. Two notes for 7-2b:
- Its amender should take c8c7a88 as BASE. The probe's test file lacks 100a8d3's placing-Invest check and 3d368a3, though the rules text is the same.
- The Invest tallies and the money check key off the move type alone, so they must sit inside 7-2b's judged-move scheme once a Veto can cancel an Invest. Its plan already says so.

The review was read-only: I ran the probes and the fix trial in a scratch worktree at c8c7a88 and removed it afterwards. `git worktree list` shows only the main checkout, which is still clean at c8c7a88 on `claude/peaceful-curie-rdfkow`.
## Appendix: the fix wave's brief

### Plan 7-2a fix wave — brief

Repo `/home/user/turnhout`, branch `claude/peaceful-curie-rdfkow`, HEAD c8c7a88. Plan 7-2a ("Equity held") is implemented; its whole-plan
review is at `final-review.md` in this directory (read it: Important 1 and Minors 1–3 below quote it). The plan is
`docs/superpowers/plans/2026-10-16-startup-slice-7-2a-rules-and-runs-equity-held.md`; read only lines 84–198 (Global Constraints, Review
Focus, Assumed) and whatever a fix below points to. Rulebook: `/home/user/suwa/rulebook.md` (§17.B.4 for F1).

Make the fixes below, each as its own commit (F1 may be two: rules + examples, then the test-file pins), in this order. Every commit is
by pathspec, never `git add -A`, and its message ends with exactly:

    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC

#### F1 (Important 1): a Consultant moves at most once per Round Start (§17.B.4 "you may move the token to a different card")

Today `Only if it is not on the target card.` is bypassed by two presses (place it elsewhere, then back with a new colour), and a token
can be placed any number of times in one step. Add, as the reviewer tried and checked on c8c7a88:
- `  Cards can be moved this round.` right after `  Cards can be qa consultant.` (rules l.178);
- `    No card is moved this round.` just before `    Each player has the event check, in turn from the start player.` (l.877, in the
  block that starts a round);
- in `A player may place a card from their portfolio to a card in another player's development or another player's operations.`: the
  guard `    Only if it is not moved this round.` right after `    Only if it is not on the target card.`, and `      It is moved this round.`
  right after `      It goes to their portfolio, on the target card.`
Do NOT add the flag to the placing Invest (`INVEST_PLACING`): a token bought this turn is placed once by the Invest itself and the
rulebook lets it move at the next Round Start.

Pins:
- two new examples at the end of the rules file, written in the same style as the plan's Task 6 examples (read them: the last examples in
  the file): (a) at a Round Start's event check, a player moves their Consultant to another of the Founder's products, then pressing
  `place` again for the same token (back to the first product, or to a third) is refused with the reason the guard gives
  (`it is not moved this round` as the language words it — run the example to read the exact refusal text); (b) a token moved at one
  Round Start moves again at the next (so removing `No card is moved this round.` fails an example). If an example arranges a round start,
  follow how the existing Round Start examples arrange theirs.
- Startup's example count goes 331 → 333: `results` in `startup-simulator.test.ts`, the designer page's two pins
  (`src/pages/designer/designer-page.test.tsx`: the test title and `333 of 333 examples pass`), and the README's count.
- The new flag must not break the designer tests: run `npx vitest run src/pages/designer` and update only pins that list card flags
  (e.g. a `shownFlags`/Board-text pin) if they now list `moved this round`; say which in the report. If a page pin would show the flag on a
  Board line, prefer leaving the page as it is and report it (plan 7-3 owns the page); only update test pins.
- Run the removal probe over the four new rules lines: each removal must fail an example.

#### F2 (Minor 1): the long runs check the colour just chosen, and colour flags change only with their token

In `src/games/startup-simulator.test.ts` (the colour invariant near l.2761 and the place-change loop near l.2803–2814):
- on an `INVEST_PLACING` or `PLACE` press, the placed token's colour flags equal exactly `[CONSULTANT_COLOURS[answer]]` where `answer` is
  the press's choice answer (read how the file gets a press's answers — e.g. `answersOf(move)` — and use that; the answer indexes Blue,
  Red, QA in the button's order);
- extend the place-change loop so the three colour flags (`blue consultant`, `red consultant`, `qa consultant`) of a token change only in a
  placement of that token or in the Pivot that returns it.
Check both bite: a temporary mutation (e.g. swap the `Red:` and `Blue:` option effects in the place button) must fail the long runs; then
restore. Say in the report what you mutated and what failed.

#### F3 (Minor 2, partly): count Consultants from card data, and the Invest price from tiers

- Where the long runs read the rules' `consultant blue` / `consultant red` / `consultant qa` values to count Consultants (the Toxic checks
  near l.3038 and l.3053; the tally keys near l.2002 and l.2343), count them from card data instead: the cards on the product
  (`othersOn(state, product.id)`) whose colour flag is set, and 0 when the product is Stalled where the rules say so. Keep each check's and
  key's meaning; if a site needs the stalled rule, read how the rules define `consultant blue` (it is 0 on a Stalled product) and mirror it.
- The Invest money check (near l.2522) reads the founder's `share price` from the rules; work it out instead from the Founder's online
  operations' `data.tier` in `before` ($5 with no Active Tier 2 or 3 product, $10 with a Tier 2, $15 with a Tier 3; an Offline product is not
  Active — check how the file already tells Offline apart, e.g. `product.data?.offline !== true`). Keep a comment citing §17.A.
- Do NOT change the dividend check (ruled in Task 3) or add an Engine "blue added" comparison.
Check one bites: delete the rules line `A player's share price is 10 if their top tier is at least 2.` temporarily and confirm a long run
fails on the money check (not only an example); restore.

#### F4 (Minor 3 + parked Task 7 Minor): README and stale comments

- README l.346 quotes Startup's Board line as it read before 7-2a: add the ` · equity: Equity; Equity; Equity` it now ends with (match the
  `BOARD` pin in `src/pages/designer/playtest-fitted.test.tsx`).
- README l.296 files the now-unconditional steps line `Each player has the event check, in turn from the start player.` under "plays slice
  6 this way": add "(every round since plan 7-2a)" after that quote.
- The older tally-test comments (near `startup-simulator.test.ts` l.4346–4352 and l.4390) still give per-seed counts for the four keys plan
  7-2a's steer pushed under two games (`a Junior PM promoted at a Launch`, `Pending tokens returned by a pivot`, `Trade Show: a TechCrunch
  Feature for $2`, `a trained Junior declared blue`): end each such sentence with "(held by fewer since plan 7-2a; see
  HELD_BY_FEWER_THAN_TWO)" or trim the stale count — keep the line width under about 140 columns.

#### Rules for every fix

- Only `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` and the designer test pins change. No
  shared code. Protected files never change: `src/engine/core/game-state.ts`, `flow.ts`, `game-engine.ts`, `src/pages/hearts-demo/**`.
- New imported names go on NEW import lines; never edit an existing import line (`git diff c8c7a88 -- src | grep '^-import'` prints
  nothing).
- No "veto", "supply" or "partner" in shared code; no Startup words in shared code.
- Comment lines within about 140 columns, bullets wrapped with a three-space continuation indent.
- The auto-player's moves must not change: the long runs' tallies stay as Task 7 reported them (Invest $5 20 games, …). If a tally moves,
  stop and report why.
- Do not dispatch subagents. Do not push.

#### Before reporting

Run `npx tsc --noEmit -p .`, `npx vitest run src/games/startup-simulator.test.ts` (30–45 s under load), `npx vitest run src/pages/designer`,
then the full suite `npx vitest run` (expect 4029 tests; Startup 333 examples). Put the whole report in your final message under
`## 7-2a fix report`: per fix, the commit(s), what changed, the mutation/probe results, deviations and why; the test counts; concerns.
