# Plan 7-2b (rules and long runs: Equity moved): SDD ledger

Kept from the SDD workspace (git-ignored) when the plan finished. Plan: `docs/superpowers/plans/2026-10-16-startup-slice-7-2b-rules-and-runs-equity-moved.md`; pre-flight: `2026-11-23-startup-7-2b-preflight.md`; its probe rebased onto speed-up 4's head: `2026-11-23-startup-7-2b-rebase.md`.


- Pre-flight (opus) ran during 7-2a's execution, on a probe (pf72b2/probe, branch pf72b, BASE 5728c59 = dbb2f34 + 7-2a's rebased probe; 331 examples, 4029 tests). Report saved: docs/superpowers/notes/2026-11-23-startup-7-2b-preflight.md. Blockers as written: T1 fails typecheck (R2) and every long run stalls at the first round step (R1); both have exact amendments. 24 findings: 21 fix-in-plan, 3 ruling-needed (R9, R21, R23). End as amended: 4031 tests (+2 it()s), Startup 331 → 346 examples (+5, +12, +15 cumulative), typecheck clean, removal probe 0 survivors over 167 lines. Timing (probe, nice 19, best of 3 alternating): BASE 28.89 → end 33.31 s (×1.153); the cut-replay branch 29.48 s.
- Ruling: every fix-in-plan amendment (R1–R8, R10–R20, R22, R24) accepted as the report writes it — each was built and run in the probe — cost if wrong: rework caught by the task reviews.
- Ruling R9: (a) — the auto-player vetoes only in the last round (`lastRound() && (t + w) % 7 === 3`); the slice's R2 sale veto stays unconditional; the spec's l.59–61 "The auto-player passes" is amended to say so — why: the spec's intent is that windows don't reshuffle the long runs' earlier paths, and (a) keeps every earlier key at 2+ games (0 under 2) while the long runs' invariants still meet vetoed actions, burned Consultants and a vetoed last action (9, 8 and 5 games); (b) would leave those paths to examples alone — cost if wrong: one auto-player condition and a spec line.
- Ruling R21: (b) — the 4-player replay stays dropped (7-2a's R29(a)); the 3-player replay requires a Veto, a sale back and a suit and takes back a move made in a window (cut-replay 4124947); R12's "(any capital at 4 or more players)" stays — why: ≈3.8 s of the file for one more replay, with the file already over its line — cost if wrong: the 4-player games are rebuilt from their logs by no test (the long runs still play them).
- Ruling R23: R21(b), and the speed-up 4 mini plan (7-2a's R29(d), profile under way) runs before 7-2b; add to l.98 "and if the Startup file's best is over 30 s (7-2a's line)", so 7-2b's own plan-end timing can call another speed-up before 7-3 — cost if wrong: a speed-up's worth of time.
- Ruling: the probe's BASE is not the real 7-2a head. The real head (9cd552f code; 4029 tests; Startup 333 examples) adds 100a8d3 (placing Invest checked as an Invest), 3d368a3 (stepsEndedIn, README, flags), the fix wave (`moved this round` + 2 examples; the colour-chosen check and "colour flags change only with their token" exemption; consultantsOn; the tier-based Invest price) and 9cd552f. And the speed-up 4 will land before 7-2b. So: amend the plan now from R1–R24 and these rulings; once speed-4 lands, rebase the probe onto that head and take the rebase's findings as a second, small amendment (expected: counts +2 → N₉ = 333, end 348; the colour-flags exemption gains the Veto's burned token, `sell back`, `take`, `take … to a card` and `sue`; the colour-chosen check gains `take … to a card`; `take … to a card` does not touch `moved this round` — the flag only gates the Round Start place button and is cleared as each round starts).
- Amender dispatched (sonnet): R1–R24 as the report writes them, R9(a) with the spec's l.59–61, R21(b) (end 4030 tests: only the tally it() is new), R23 (l.98), Gaps and 7-3 Forward notes, a Controller bullet (BASE = speed-up 4's head; N₉ = 333, end 348; a second amendment from the rebased probe follows).
- Amender DONE (5d500b6, pushed): plan 846 → 930 lines; spec l.59–61 amended (R9 a). Deviations accepted: the 7-3 starting budget written as ≈30.0 s with a note that speed-up 4 and the plan-end timing replace it; R3's block fenced in its sub-bullet; R7/R8 as extra bullets in the Judged list. End: 4030 tests (one new it()), Startup N₉ = 333 → 348.
- 7-3 pre-flight dispatched (opus, background) on pf73/probe = 7-2b's probe cut-replay 4124947 (BASE tag); to be rebased onto the real head later.
- Speed-4 done in code (baaebcd). Rebase of the probe (cut-replay 5728c59..4124947) onto the real head dispatched (opus, background): brief scratchpad/pf72b3/brief.md; report → pf72b3/report.md; its (c) list becomes the second amendment.
- Rebase DONE (opus): probe pf72b3/probe branch pf72b-r at baaebcd, head 66e5054 (12 R: picks + 3 R2:). Suite 4035, Startup 115 tests, 348 examples, Rent Day 108; tsc, purity, import checks clean; 25 paths added (182 → 207), every required key on 2+ games; per-game holds identical to the old probe's, so 7-2a's fix wave changed no auto-player path. Timing: best 23.93 s vs BASE 23.01 s (×1.04; CPU 38.5 vs 36.4 s). Report saved: docs/superpowers/notes/2026-11-23-startup-7-2b-rebase.md.
- Ruling (f)1: keep R2 66e5054 and edit 8 — trades priced by `investPriceOf` from the Founder's online tiers, as the fix wave prices an Invest, so a broken `share price` line is caught by the long runs — cost if wrong: one check line per trade arm.
- Ruling (f)1b: a SUE keeps reading the rules' own `buyout due`; Gap added (a later retune can count the court's $5 per Suit) — cost if wrong: a broken buyout line caught only by Task 3's examples.
- Ruling (f)2–4: no action (the amended plan lands each colour-check exemption in the task that adds its clearing lines; the implementer follows l.861 for R24's README; Task 4's happenings block stands unwrapped).
- Second amendment applied by the controller: the report's 15 edits (c)1–15 + the SUE Gap.
- Task 1: BASE 01ef070; implementer dispatched (sonnet) with probe commits 75b1d0c, dbafcc0, db19398 + the VETO part of 1c74466, named one by one; removal probe via pf72b2/scripts/zzprobe-removal.test.ts + t1-lines.json.
- Task 1: implementer DONE f84e6b3 (pushed) — probe commits applied clean, VETO part of 1c74466 by hand; equals the probe; 4034; 338 examples; removal probe 7 pinned / 6 DIAG / 0 survive.
- Task 1: review dispatched (sonnet). Task 2: BASE f84e6b3; implementer dispatched (sonnet) with 95b231f, 3768247, 70a2c40, the SELL_BACK/TAKE part of 1c74466, 66e5054, named one by one; expected 345 examples.
- Task 1 review (sonnet): Spec ✅, Approved (static read; the working tree held Task 2's work in progress — Task 1's own green state is the implementer's run at f84e6b3: 4034, tsc clean). Minors parked:
  - M1 nothing in the long runs asserts a window opens or a Veto happens — Ruling: park — Task 4's tally requires 'an action vetoed' (9 games) and the window keys, per the plan — cost if wrong: none after Task 4.
  - M2 windowJudge's `opened!` on a run that starts mid-window — Ruling: park — no run starts mid-window — cost: a less helpful message.
  - M3 the actor's actions checked through the whole counters — Ruling: park, cosmetic.
- Task 1: complete (f84e6b3)
- Task 2: implementer DONE 2e31e0a (pushed) — equals probe 3768247 + the three R2 changes (SELL_BACK/TAKE only); 4034; 345 examples; removal probe 0 survive.
- Task 2: review dispatched (sonnet). Task 3: BASE 07631fa; implementer dispatched (sonnet) with 5728952, c8b565e, 9289135, the SUE part of 1c74466, named one by one; expected 348 examples.
- Task 2 review (sonnet): Spec ✅ with one Important, Approved after it is ruled. Findings:
  - I1 `buyingBack()` lacks the brief's "any capital at 4 or more players (R21)" — Ruling: lands in Task 4 with the probe's 1db18f4 (A-T4: `>= (runtime.seats.length >= 4 ? 0 : 2)`), as the probe ordered it; Tasks 2–3 assert no tally that needs it, and Task 4's tallies are built after it — cost if wrong: none; Task 4's dispatch names 1db18f4 and its review checks the line.
  - M1 Examples 1 and 3 order `not offered` before the colour lines (the probe's A-T2) — Ruling: park — same meaning, the probe's order was built and run — cost: none.
  - M2 the §17.C.5 check runs only on a SELL_EQUITY press that enters `offer`; a sale that opens a veto window hands the offer over in the LET_IT_GO_AHEAD move, unchecked — Ruling: fix in the plan-end fix wave (also check any move that ends in `offer` while `waitingOf(before)?.move` is a SELL_EQUITY) — cost if wrong: one more check line.
  - M3 a local `selling` shadows the planner `selling(a)` in the veto branch — Ruling: fix wave (rename to `sale`) — cost: none.
- Task 2: complete (2e31e0a)
- Task 3: implementer DONE 1743516 (pushed) — equals probe 9289135 + the R2 changes; 4034; 348 examples; removal probe 15 pinned / 5 DIAG / 0 survive; playtest-fitted.test.tsx committed too (Files names it; the brief's git add line missed it — Ruling: correct).
- Task 3: review dispatched (sonnet). Task 4: BASE 1743516; implementer dispatched (sonnet) with 9ab9f9b, fd80532, 1db18f4, b43d7f5, named one by one; end check: src identical to the probe's head 66e5054; README + R24 wording.
- Task 3 review (sonnet): Spec ✅, Approved. Minors parked:
  - M1 README's "It still leaves out the Veto, Buyback, Secondary Trade and the Non-Compete Suit (plan 7-2b)" stale until Task 4 — Ruling: Task 4's Step 3 owns it ("It still leaves out" drops them) — cost: none.
  - M2 `suing()`'s guard duplicates the rules' Investor guard — Ruling: keep (keeps 2-player reshuffle path) — cost: none.
  - M3 `named[t % named.length]` with empty `named` — Ruling: park; unreachable (filing needs a token) — cost: none.
  - Note: Task 3's `git add` line omits playtest-fitted.test.tsx — plan text fix in the plan-end docs commit.
- Task 3: complete (1743516)
- Task 4: implementer DONE 344197a (pushed) — src byte-identical to the rebased probe's head 66e5054 (controller verified); README + R24; 4035; Startup 115.
- Task 4 review (sonnet): Spec ✅, Approved (8 targeted tests pass incl. the tally and both replays; buyingBack's 4+ any-capital rule landed — closes Task 2's I1). Minors parked:
  - M1 the tally test depends on the earlier it.each filling `tally` (existing pattern); the two keys at exactly 2 games are fragile and "2+ games" is by convention — Ruling: park; the plan's Gaps name both keys for the next retune — cost: a cadence change could drop one to 1 game unnoticed.
  - M2 two blank lines after the new it — Ruling: fix wave (style).
  - M3 the replay takes back only the first window move — Ruling: park; as the brief asks.
- Task 4: complete (344197a)
- Plan-end timing (controller, perf4/tools/bench.sh 3, alternating, other=0): BASE baaebcd 20.12 / 20.18 / 19.80 s (cpu 31.9 / 30.9 / 31.1) vs HEAD 344197a 21.66 / 20.73 / 20.94 s (cpu 33.2 / 33.1 / 33.5). Best 19.80 → 20.73 s (×1.047), CPU +7%. Under 30 s: no speed-up before 7-3 (R23's line). Saved scratchpad/pf72b3/plan-end-bench.txt.
- Final review: dispatched (opus) over 01ef070..344197a.
- Container restarted during the final review (lost); re-dispatched (opus), same prompt.
- Final review (opus): no Critical, no Important. Rules match the rulebook and suwa; all 15 new examples' numbers check; removal probe over all 98 added lines: 69 pinned, 29 DIAG, 0 survive; no split hazard; constraints and trailers hold; every new path happens (1115 windows, 14 vetoes, 38 sales, 8 Buybacks, 4 Suits). Minors 1–9 → fix brief.
- Ruling: drop ledger item (a) — the §17.C.5 check already runs on the let-go (the long run passes judged.press = the SELL_EQUITY; measured 38/38 sales checked, mutation caught through the let-go) — a comment instead. Ledger Task 2 M2 was wrong.
- Ruling: the fix brief's 9 items accepted as written (renames, the opening press's no-change check, the view check's window count, two comments, the offer Hint for a Buyback, plan docs incl. the plan-end timing, README's $4) — cost if wrong: small, all reviewed.
- Fix wave: dispatched (sonnet) from fix-brief.md, BASE 344197a.
- Fix wave (sonnet): DONE, all 9 items — ac520b9 (test file, rules Hint) + b5ec716 (plans, README), pushed. Item 4's mutation (opening press changes the cards) bit: 14 tests failed with "the cards after p1's research the seed deck…". 4035 tests; designer + games 593; no model names in the diff.
- Fix wave re-review: dispatched (sonnet), 344197a..b5ec716 against fix-brief.md.
- Ruling: 7-3's probe rebase starts now at b5ec716 in parallel with the re-review — the close-out adds docs only — cost if wrong: a re-review code fix would need a one-line note in the rebase's second amendment.
- Fix wave re-review (sonnet): All addressed — every item done as briefed, no unasked change, imports and trailers clean, 115/115, tsc clean. No findings.
- Plan 7-2b: complete (last code commit ac520b9; docs b5ec716). 4035 tests; Startup 115 tests, 348 examples.

## Appendix: the final review (opus), adjudicated above, with the fix brief the fix wave ran from

### Final review

The range 01ef070..344197a (f84e6b3, 2e31e0a, 1743516, 344197a) is ready once a small fix wave lands. I found nothing Critical or Important.

What I checked and found clean:
- **Builds and tests:** tsc is clean. The Startup file passes 115/115 (22.3 s). `src/games` + `src/pages/designer` pass 593/593.
- **Rules against the rulebook:** the Veto (AP buttons only, all in `actions`; window before any payment; token to the Founder's equity with its three colours cleared), Buyback and Trade (§6, §17.C.4–5, §20.D 1), and the Suit (§17.C.2 and §20.A: $4 price, $5 buyout, $9 to file) all match. The suwa resolvers agree where the rulebook is silent.
- **Example numbers:** every number in the 15 new examples checks out. No example puts more than 3 tokens of one Founder in play; the most is 3, in 7-2a's Pivot example.
- **Interactions:** no case misbehaves. No Suit can be filed during a window. An offer can always be declined and a lawsuit always has a target, so neither can strand a game. 2-player trades are refused. `moved this round` is harmless, and Partners and dividends simply read the portfolios.
- **Removal probe:** I ran it over all 98 rules lines this plan added. 69 are pinned by an example, 29 raise a diagnostic, none survive. Task 4's report had left this probe, the number read and the token-count check undone; all three are now done.
- **Split-file hazards:** none. The new section code reads only outer names or names returned earlier, no early `return` was added, and Task 4's block stands unwrapped after `happeningsPart9()`.
- **Constraints:** nothing changed under `src/engine`, `src/utils`, the page source or the protected files. The other games are untouched (Rent Day still 108 examples). The two new imports are on new lines. All four commit messages end with exactly the two required trailers and name no other model.
- **Long-run coverage:** every new path happens in the runs. 1115 windows opened; 14 vetoes; 38 sales (5 accepted, 33 declined); 8 Buybacks; 4 Suits. 'a window asked two or more holders' and 'a Secondary Trade vetoed by its token's Founder' each happen in exactly 2 games (3p5 and 4p2), as the plan's Gaps say.

**Critical:** none. **Important:** none.

**Minor**
1. **Ledger M2 is wrong: the §17.C.5 check already runs when the let-go hands the offer over** (startup-simulator.test.ts:2996). The long run calls `rules(before, judged.press, after)` (:4693). For the closing let-go, that press is the SELL_EQUITY itself, so `move.type === SELL_EQUITY` holds and the phase after is `offer`.
   - Measured: all 38 sales that reached `offer` were checked, 8 directly and 30 through the let-go.
   - Mutation: I loosened the hand-off clause to "who has at least 0 capital". The 3-, 4- and 5-player runs then fail on "the seat offered …", and 2 of the 3 first failures came through the let-go path.
   - So drop fix (a); a comment is enough.
2. **The press that opens a window is never checked** (:3825). `rules` is skipped for 'cost' moves, and `keepsTheWindow` checks only who is asked. The anti-goal "a vetoed action pays or moves nothing" is therefore checked only on the VETO move.
   - Failure scenario: an engine that charged at declaration and again at go-ahead would pass the long runs. Only examples 1 and 3 of Task 1 would catch it.
   - Measured: all 1115 openings left every card unchanged and changed only the `actions` counter.
3. **The view check could pass with no window in seed 1** (:4700). Nothing asserts it ran. Today it runs 58, 75, 33 and 15 times at 2, 3, 4 and 5 players.
4. **The `offer` Hint is wrong for a Buyback** (startup-simulator.rules:1721). The Investor answering a Buyback reads "You are offered an Equity token … Accept it, placing it…", but they are being asked to sell their token back. 7-3's page shows this Hint in its status line.
5. **Names that shadow other names:**
   - the veto branch's `selling` (:1672) hides the planner `selling(a)` (ledger b);
   - the locals `const turnOf` in `turnStarted` (:2023) and `keepsTheBudget` (:3798) hide the new `turnOf()`;
   - the long run's `const window` (:4688) hides the DOM global;
   - the top-level `owners` (:254) is hidden by `keepsTheRules`' local `owners` Map (:2742).
6. **Two blank lines** after the new tally `it` (:5033–5034) (ledger c).
7. **Two comments are off:**
   - :1895 says "of the four trades the runs accept". There are five, in four games: TAKE_PLACING at 4p2 (twice), 5p2 and 5p5, and the plain take at 3p5.
   - :321's doc for `turnOf` leaves out `lawsuit`.
8. **Plan docs:**
   - Task 3 Step 5's `git add` (plan l.823) leaves out playtest-fitted.test.tsx (the ledger already notes this).
   - The 7-3 starting budget (l.923) never records the plan-end timing: 19.80 → 20.73 s.
   - The Slice 10 note (l.929) gives a seizure line that would leave colour flags on the returned tokens.
   - The Gaps don't say that no replay test rebuilds a buyer's placement. TAKE_PLACING happens only at 4–5 players, which no replay test plays (R21(b)).
   - Review Focus l.130 says a Veto never burns "the token being traded". That holds for a sale, not for a Buyback: the Investor may burn the very token being bought back, which is legal but worse for them than declining.
9. **README:** "the Non-Compete Suit forces a token back for $5" leaves out the Suit's $4 price.

### Fix brief (the fix wave's brief, as accepted)

1. **startup-simulator.test.ts, rulesPart11 (~l.2996).** Do NOT add the ledger's item (a). Above `if (move.type === SELL_EQUITY && after.turn!.phase === 'offer')`, add this comment: `// A sale's closing let-go reaches this check as the sale itself (the long run passes judged.press), so it runs whether or not a window opened first.`
2. **Same file, renames only, no behaviour change:**
   - in `playTurn`'s veto branch, `const selling = …` (and its one use) becomes `sale`;
   - in `turnStarted` and in `keepsTheBudget`, the local `const turnOf = after.data[TURN_OF_KEY]` (and its uses on the next line) becomes `marker`;
   - in the long-run `it.each`, `const window = keepsTheWindow(seats)` (and its call `window(before, move, after)`) becomes `windowCheck`;
   - the top-level helper `owners` (l.254, used only in the view check) becomes `ownRowSeats`.
3. **Same file:** remove one of the two blank lines after the `it('played slice 7’s moving Equity …')` block (~l.5033), leaving one.
4. **Same file, `keepsTheWindow`, inside `if (waitingOf(before) === null && waiting !== null) {`, after the `asked` check.** Add:
   ```ts
   // The press that opened it spent its cost and did nothing else (§17.B.5).
   sameAs(JSON.stringify(after.cards), JSON.stringify(before.cards), () => `the cards ${at}`);
   const { actions: _had, ...wasCounters } = (before.data[COUNTERS_KEY] ?? {}) as Record<string, unknown>;
   const { actions: _left, ...nowCounters } = (after.data[COUNTERS_KEY] ?? {}) as Record<string, unknown>;
   sameAs(JSON.stringify(nowCounters), JSON.stringify(wasCounters), () => `the counters but actions ${at}`);
   ```
   `keepsTheBudget` already checks the actions. Update the function's doc comment to say this too.
5. **Same file, the view check:**
   - `const viewChecks = { targets: 0, sets: 0 }` (~l.756) gains `windows: 0`;
   - inside `if (seed === 1 && judged.as === 'cost' && playing !== null) {` (~l.4700), add `viewChecks.windows += 1;`;
   - in the `if (seed === 1) {` block (~l.4725), add `expect(viewChecks.windows - checked.windows, `${where}: windows whose waiting view was checked`).toBeGreaterThan(0);`.
6. **Same file, comments:**
   - l.1895: change "of the four trades the runs accept, one is a plain take (3 players seed 5)" to "of the five trades the runs accept (four games), one is a plain take (3 players seed 5)";
   - l.321: change "during a window or an offer" to "during a window, an offer or a lawsuit".
7. **startup-simulator.rules, `Phase: offer`'s Hint** becomes: `Hint: An Equity token is offered at its Founder's Share Price. Sell it back if it is yours; else take it, placing it on one of the Founder's products if you like, or decline.` Hint lines are unpinned, so no example or count changes. In `docs/superpowers/plans/2026-10-16-startup-slice-7-3-the-page.md`, G5 (~l.827) quotes the old Hint: update the quote to the new text.
8. **docs/superpowers/plans/2026-10-16-startup-slice-7-2b-rules-and-runs-equity-moved.md:**
   - Task 3 Step 5's `git add` (l.823) gains `src/pages/designer/playtest-fitted.test.tsx`;
   - append to l.923: "plan-end (controller, best of 3 alternating): BASE baaebcd 19.80 s, HEAD 344197a 20.73 s (×1.047, CPU +7%), under 30 s";
   - l.929 adds: "with the three colour clearing lines (or the flag-clearing phrase the Gaps ask for), as the Veto has";
   - add a Gap: "No replay test rebuilds a buyer's placement: TAKE_PLACING comes only at 4 and 5 players (4p2, 5p2, 5p5), which no replay test plays (R21(b)); the placing Invest's replay covers the same choice mechanism. Home: a later retune";
   - Review Focus l.130 adds: "(for a Buyback the Investor may burn the token being bought back: legal, and worse for them than declining)".
9. **README.md, the Startup paragraph:** "and the Non-Compete Suit forces a token back for $5" becomes "and the Non-Compete Suit ($4) forces a token back for $5 paid to its Investor".

Verify after the fix wave: `npx tsc --noEmit -p .`; `npx vitest run src/games/startup-simulator.test.ts` stays at 115 tests and 348 examples; `npx vitest run src/pages/designer src/games` stays at 593; `git diff --stat` shows nothing under `src/engine`, `src/utils` or the page source.