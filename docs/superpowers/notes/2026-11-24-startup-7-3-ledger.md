# Plan 7-3 (the page: Equity): SDD ledger (in progress, paused)

Copied from the SDD workspace (git-ignored) at the pause, so a new session can resume. Plan: `docs/superpowers/plans/2026-10-16-startup-slice-7-3-the-page.md`; pre-flight: `2026-11-23-startup-7-3-preflight.md`; rebase: `2026-11-24-startup-7-3-rebase.md`.


- Pre-flight (opus) ran during speed-up 4 and 7-2b, on a probe (pf73/probe, branch pf73, BASE = 7-2b's old probe cut-replay 4124947: 4030 tests, Startup 115 tests, 346 examples). Report saved: docs/superpowers/notes/2026-11-23-startup-7-3-preflight.md. As written: T1 typecheck (R1) and its 3-player BUY_GAME setup (R3); T2 breaks a BASE pin (R7) and pins wrongly (R8); T3's hover pin (R10); T5's Venture Capital Rain already in (R12) and an income step that never comes (R13); T6's browser setup (R16) and screenshot 8 (R17); at the real head, two pins miss `moved this round` (R15). End: 4068 (+38), Startup 117, page file 114, typecheck clean; browser 70/71 as written, all with the amended step. Timing +0.15…0.93 s quiet on the Startup file; no ruling needed.
- Ruling: every fix-in-plan finding (R1–R4, R6–R18) accepted as the report writes it — each was built and run in the probe — cost if wrong: rework caught by the task reviews.
- Ruling R5 (a): the waiting cards keep 7-1's naming (`Equity whose founder is p0`); branch pf73-every 7350d21; one page test added — the smallest change, keeps 7-1 Task 9's decision, and the waiting line, which names no place, still says whose Equity — cost if wrong: one naming rule to revisit in a later page plan.
- Ruling: `pf73-speed` (a game's player facts worked out once) not taken — the cost is under a second and the file is far under 30 s after speed-up 4 — cost if wrong: < 1 s per run.
- Ruling: the probe's BASE is 7-2b's old probe, not the real 7-2b head (348 examples, 4035 tests, the split test file, the second amendment's colour checks). So: amend the plan now from R1–R18 and R5(a), with counts written against BASE's committed tests (+38 new it()s; Startup +2; page file +13; examples unchanged); once 7-2b lands, rebase the probe onto that head and take the findings as a second amendment.
- Amender dispatched (sonnet): R1–R18 as written, R5(a), the Controller bullet (BASE = 7-2b's head; counts BASE-relative; second amendment from the rebased probe), Gaps/Forward; edits the plan only, no commit (the controller commits after 7-2b Task 2 lands).
- Amender DONE (plan 829 → 860 lines, uncommitted then committed by the controller): R1–R18 applied; R5(a) with its option test written by the amender (steps: S presses INVEST, picks the first `Equity (N's equity)`; on N's tab the waiting text reads `… : Equity whose founder is N.`) — the task reviewer checks the picker's label against the view; R12 drops the Venture Capital Rain rules change (Task 5 Steps renumbered 3–4); new-test count 39 (T1 10, T2 8, T3 6, T4 9 with the option test, T5 6): page file +14, Startup +2, examples unchanged; Gaps G5–G10 added, G1 replaced (R18).
- Rebase of the probe onto the real head dispatched (opus) with scratchpad pf73b/brief.md, <HEAD> = b5ec716 (7-2b's fix wave; 759412d after it is docs only).
- 7-2b closed (759412d). Plan 8-1's pre-flight dispatched (opus) in parallel on the real head (scratchpad pf81/brief.md); it lists any file 7-3 and 8-1 both change.
- Rebase (opus) DONE: pf73b/probe branch pf73-r, head 4267a26 on b5ec716; 12 picks clean; R2 523d3f5 (R15 pin) and 4267a26 (R12 names); 4074 tests; browser 73/73; timing Startup 18.34 → 18.48 s, page file 7.00 → 8.24 s. Report: docs/superpowers/notes/2026-11-24-startup-7-3-rebase.md.
- Second amendment (c) 1–12 applied; committed with the note (99c3548). Ruling: keep R2 4267a26 — it is the amended plan's R12 naming — cost: none.
- Pre-execution scan (the probe built every task in order on the real head, so each row was run, not read):
  | Pair / task | Shared file or interface | Found |
  |---|---|---|
  | T1→T2 | `nameWithPlayers` (card-facts.ts) → board-text.ts / card-pick.ts | T2 consumes T1's naming; built in order, clean |
  | T1→T4 | `waitingView` keeps 7-1's naming (R5 a, T1's Files) → T4's waiting line and its option test | the option commit bbdfc95 splits: board-view.ts hunk → T1; playtest-fitted hunk → T4 (applies at T4's end b3db831, checked) |
  | T2→T3 | playtest.tsx, playtest-fitted.test.tsx | T3 builds on T2's placesOf words; clean |
  | T3 | fit-layout.ts `fittedLayout(…, seats)` + `drawnCards` | the R6 test-lines check lists its `fittedLayout` call; clean |
  | T4→T5 | seat-status.ts, playtest.tsx tabs following the window | T5 reuses T4's line; clean |
  | T1, T5 | startup-simulator.test.ts | top-level `viewedCards` (T1, `game!` per edit 4) and appended `it()`s only; no split section |
  | T6 | README, browser check, global checks | reads every task; the -import check prints only board-text.ts's line (R1) |
  | each task | own tests vs own code | probe: as written + A-T commits make each pass; no self-contradiction left after the amendments |
- Probe commits per task (pf73b/probe): T1 0b073d9, 68cacff, bbdfc95 (board-view.ts only) · T2 5e114b7, 7c2867e · T3 8727026, f216180 · T4 77d22f1, b3db831, bbdfc95 (playtest-fitted only) · T5 bd257f4, fe77e1c, 523d3f5, 4267a26 · T6 ee10ca9 + the browser check.
- Task 1: BASE 99c3548; implementer dispatched (sonnet) with 0b073d9, 68cacff, bbdfc95 (board-view.ts only), named one by one.
- Task 1: implementer DONE a61fa62 (pushed) — every file equals the probe (68cacff; board-view.ts = bbdfc95), controller verified; 4045; Startup 116; page file 102; -import only board-text.ts's line (R1); purity clean.
- Task 1: review dispatched (sonnet). Task 2: BASE a61fa62; implementer dispatched (sonnet) with 5e114b7, 7c2867e, named one by one.
- Task 1 review (sonnet): Spec ✅, Approved (tsc clean, five files 454/454 on a clean archive of a61fa62). Minors:
  - M1 board-view.test.ts's R5 (a) test checks only cards whose zone seat differs from the maker, so a waitingView switched to pickedAs's name would pass — Ruling: park — Task 4's option test (bbdfc95's hunk) pins exactly that case (a token in its founder's own equity: `Equity whose founder is T`) — cost: none after Task 4.
  - M2 waitingView rebuilds the naming-facts string beside nameWithPlayers — Ruling: park for the final review (a shared helper is a refactor the probe didn't need) — cost: two places to keep in fact order.
  - M3 no change asked. M4 second import lines from one module — the constraint asks for it.
- Task 1: complete (a61fa62)
- Task 2: implementer DONE 573ca29 (pushed) — every file equals the probe's 7c2867e (controller verified); 4053; page file 103; -import and purity empty. Concern: card-pick.ts now imports board-text.ts (no cycle today).
- Task 2: review dispatched (sonnet). Task 3: BASE 573ca29; implementer dispatched (sonnet) with 8727026, f216180, named one by one.
- Task 2 review (sonnet): Spec ✅, Approved (tsc clean, 169/169 on a clean copy of 573ca29; no hidden-information leak found). Minors:
  - M1 no test pins `sitsOn` on a face-down holder (`on a face-down card in p0's workshop`) or a face-down placed card (null); a swap of cardLabel for pickName would pass — Ruling: fix wave, one `it` in board-text.test.ts — it pins the overview's anti-goal (hidden information) — cost if skipped: a leak route unpinned.
  - M2 card-pick.ts imports board-text.ts (no cycle; board-text owns cardLabel) — Ruling: park — cost: none until board-text needs card-pick.
- Task 2: complete (573ca29)
- Task 3: implementer DONE 2a41634 (pushed) — every file equals the probe's f216180 (controller verified); 4059; page file 104; -import and purity empty.
- Task 3: review dispatched (sonnet). Task 4: BASE 2a41634; implementer dispatched (sonnet) with 77d22f1, b3db831, bbdfc95 (playtest-fitted only), named one by one.
- Task 3 review (sonnet): Spec ✅, Approved (tsc clean, 190/190 on a clean copy of 2a41634). Minors:
  - M1 fittedLayout's rival filter reads `across === true` only, not the zone's visibility — Ruling: park — the language refuses `across` on a row not everyone can see (setup-phrases.ts `playerRowAcross` throws ACROSS_NEEDS_EVERYONE), so every `across` zone is public and per player — cost: none while that phrase is the only source.
  - M2 the stackOnHolders doc has an orphan line after the re-wrap — Ruling: fix wave (reflow) — cost: none.
- Task 3: complete (2a41634)
- Task 4: implementer DONE dc53fe6 (pushed) — files equal the probe's b3db831, the page test plus bbdfc95's option test (controller verified); 4068; page file 110 (controller run); -import and purity empty; no `veto — ` status at this head.
- Task 4: review dispatched (sonnet). Task 5: BASE dc53fe6; implementer dispatched (sonnet) with bd257f4, fe77e1c, 523d3f5, 4267a26, named one by one.
- Task 4 review (sonnet): Spec ✅, Approved (tsc clean, 136/136 on a clean copy of dc53fe6; holders asked in turn, the Veto pays nothing, Undo drops the line, hidden picks read face-down). Minors:
  - M1 waitingLine takes a target only when `cards.length > 1`, so a target-only press would read `: Vase` with no "to" — Ruling: fix wave, a one-line comment saying 7-1's view always carries the picked cards before the target — cost: none.
  - M2 a test comment says "(amendment)" — Ruling: fix wave, reword as a reason — cost: none.
  - M3 the actor's aria-disabled loop could pass on no buttons — Ruling: fix wave, `expect(buttons.length).toBeGreaterThan(0)` — cost: none.
  - M4 second import lines from one module — the constraint asks for it.
- Task 4: complete (dc53fe6)
- Container restart: the Task 5 implementer and the 8-1 pre-flight were lost. Task 5's staged work equalled the probe's final files (index and worktree).
- Ruling: the controller verifies and commits Task 5 itself (tsc clean; 4074/4074; no -import) rather than re-dispatching — the work was complete and byte-identical to the probe — cost if wrong: the TDD Step 2 record rests on the probe's run.
- Task 5: 7456567 (pushed). Report: task-5-report.md (controller). Review dispatched (sonnet). Task 6: BASE 7456567; implementer dispatched (sonnet) with ee10ca9 (README) and the rebased probe's browser check (pf73b/browser).
- 8-1 pre-flight re-dispatched (opus) to resume from pf81/probe at 92fd94e (T1–T4 built with amendments).
- Task 5 review (sonnet): Spec ✅, Approved (tsc clean, 232/232 on a clean copy of 7456567; rules untouched; no import change; every flow pins status, tab, money and court). Minors:
  - M1 the Buyback test's aria-disabled pin on the offer buttons is beyond the brief — Ruling: keep — it pins that a Founder can't take its own token (an anti-goal) — cost: a page restyle of disabled buttons would touch one line.
  - M2 two `toContain` lines redundant with the next `toEqual` — Ruling: fix wave, delete them — cost: none.
  - M3 a test comment says "(amendment)" — Ruling: fix wave, reword as a reason (with Task 4's M2) — cost: none.
- Task 5: complete (7456567)
- Task 6: implementer DONE e806d4c (pushed) — README equals the probe's (controller verified); browser check 73/73, no page or console error (scratchpad browser-7-3); global checks as the brief says; -import prints only R1's line; 4074; four games alone 112, Rent Day 108.
- Task 6: review dispatched (sonnet). Plan-end timing running (bench.sh 3, BASE worktree pf73b/base at b5ec716, src-identical to 99c3548).
- Final review: dispatched (opus) over 99c3548..e806d4c (final-review-brief.md), with the parked Minors to carry.
- Task 6 review (sonnet): Spec ✅, Approved (README's every claim checked against HEAD; check.cjs 11 steps + 08a + 3 crops, 73 assertions; screenshots 01, 02, 04 read). Minors:
  - M1 four brief checks are covered only by screenshots (01's empty court and faces, 02's caption, 11's no new label); 11 unread — Ruling: controller read 11-color-match.png: Color Match draws as before (no waiting line, no caption, no new label); the rest as checked by eye in the report and review — cost: none.
  - M2 the report gives no per-file counts — Ruling: the plan-end bench prints both files' pass counts (Startup 117, page 115); Task 4's controller run read the page file at 110 — cost: none.
  - M3 README "captioned with what it sits on on its owner's" reads clumsily — Ruling: fix wave ("…what it sits on, on its owner's table") — cost: none.
- Task 6: complete (e806d4c)
- Plan-end timing (controller, bench.sh 3, alternating): Startup's file BASE 19.65 / 17.92 / 19.34 s vs HEAD 20.50 / 19.06 / 18.99 s (115 → 117 tests); best 17.92 → 18.99 s (×1.06), CPU 28.9 → 29.9 s. Page file BASE 7.91 / 8.47 / 9.75 s vs HEAD 9.16 / 9.01 / 13.28 s (101 → 115; the last pair under other vitest jobs); best 7.91 → 9.01 s (+1.1 s for 14 tests). Startup well under 30 s: no speed-up before 8-1.
- PAUSED 2026-11-24 at the owner's request (weekly token budget). 8-1's pre-flight stopped after T6 (its commits saved to docs/superpowers/notes/2026-11-24-startup-8-1-preflight-partial.md). The final review is let finish; then stop. Resume: the fix wave from the final review's brief plus the parked Minors ruled 'fix wave' above.
- Final review (opus): no Critical; Important I1 — the `WaitingView` doc (board-view.ts) says the waiting cards drop the zone's seat, the opposite of R5 (a)'s code; Minors m1–m8 (four removal-probe survivors pinned by new tests, a T4/T5 seam test, stale docs, README, an "(amendment)" test name). Removal probe: 49 removals, 37 caught, 4 real gaps (m1–m4), 8 equivalent or unreachable. Clean: hidden information traced through every new path; shared code, imports, protected files, other games, trailers.
- Ruling: the fix brief's 12 items accepted as written; T4 M3 and T1 M2 dropped as the review argues (getAllByRole throws on none; the two namings differ on purpose and a helper would force a second core -import edit); the fix wave also carries Task 6 M3 (README "what it sits on, on its owner's table") — cost if wrong: small, all reviewed. After the wave: 4075 tests.
- Next (on resume): the fix wave (sonnet) from final-review.md's "## Fix brief" plus Task 6 M3, BASE = the head then; a scoped re-review; close-out.

## Appendix: the final review (opus), adjudicated above, with the fix brief the fix wave runs from

### Final review

**Range:** `99c3548..e806d4c` (6 commits). I checked it from a clean `git archive e806d4c` with node_modules symlinked, then deleted that copy and the second copy I used for trying the fixes. I edited, committed and pushed nothing in /home/user/turnhout, its working tree is clean, and no process I started is still running. HEAD has since moved to `ed9d931`, a docs-only pause commit by the controller that is outside this range.

**Checked and found clean**

- **Builds and counts:**
  - `npx tsc --noEmit -p .` is clean.
  - The full suite passes 4074/4074 in 122 files: Startup's file 117, the page file 115, Rent Day 108 (`rent-day.test.ts:813`), Startup's examples 348.
- **Hidden information (check 1).** I traced each named function for a face-down card on top, a face-down card underneath, and one as the waiting target.
  - **On top.** `derive-scene` keeps only x/y in a hidden card's data, so `holderIdOf` is null. So:
    - `sitsOn` and `sitsOnCaptions` are null;
    - `drawnCards` never draws a rival's face-down card;
    - `cardsOnCards` doesn't list it under a holder;
    - `placesOf` gives its zone only;
    - the hover line is null (`faceUp` is false);
    - `cardLabel` is `a face-down card`.
  - **Picks and the waiting line.** `pickedAs` and `waitingView` decide on `seesFace` against the real state. `nameWithPlayers` is never reached for a card the seat can't see.
  - **Underneath.** `sitsOn` says `on a face-down card in p0's workshop` through `cardLabel`. `placesOf`'s tie-break skips a face-down holder.
  - **As the target.** It reads `… to a face-down card`.
  - No line, caption, place, hover, status or picker carries a card id. The browser shots 04 and 07 agree.
- **The tasks together (check 2).** One card is named the same way by the Board, the picker, the offer, the caption and the waiting line, with two seams that are by design:
  - the waiting line names the zone's own player too (R5 (a)), so on one screen N sees `… : Equity whose founder is T.` above T's `equity: Equity; …`;
  - the hover line uses 6-3's column form (`p0's Equity — founder p1 — …`).

  No T5 flow shows a stale T4 line. The window's line is gone once the offer opens (browser `07-offer.png`), and no line appears after FILE. Neither is pinned by a test yet (Minor m5).
- **Shared code (check 3).**
  - Startup words: the plan's word grep prints nothing. Every court/lawsuit/offer/stake hit is 7-1's `Stake` fixture.
  - Protected files, the pure-core check and the rules diff all print nothing.
  - The changed-test-lines check prints exactly the three expected lines.
  - The `-import` check prints only `board-text.ts`'s line.
  - `card-facts → zones` adds no import cycle.
- **Other games (check 4).**
  - `fittedLayout` with two arguments gives `rivals = []`, so the defs are the same as at BASE.
  - Only Startup's rules have cards on cards, so `stackOnHolders`' merged column changes no other game.
  - The hover line shows only on fitted tables, where only `across` cards of other seats are drawn.
  - No other game has a window, so no other game gets a waiting line (browser `11-color-match.png`).
- **Commits (check 6).** Each message ends with exactly the two trailer lines, and no other model name appears in the range.
- **README (check 7).** It is accurate apart from m7.
- **Removal probe (check 5).** I made 49 removals across the 7 new source files and ran the page tests plus the card-facts, board-view and fit-layout tests for each.
  - 37 were caught. That includes a true revert of `stackOnHolders` to one column per zone.
  - 12 survived:
    - **Four real gaps:** m1–m4 below. Each new test in the fix brief catches its own; I confirmed this.
    - **Eight equivalent or unreachable under the language:**
      - `kind === 'player'` and `on === 'card'` in `nameWithPlayers`, which follow from the `ThingFact` type;
      - `if (holderId === null)` in `sitting`;
      - `at.seat === null` in `sitting`, since no seat's card sits on a shared-zone card today;
      - `info.seat !== seatOf(card)` in `heldEntry`, for an `across` card on its own seat's card, which Startup can't do;
      - the count-caption merge in playtest, since tokens carry no counts;
      - `cards.length > 1` in `waitingLine`, since `aboutSet` refuses an empty set;
      - the first-label `find`.
  - No new test passes vacuously.

**Critical:** none.

**Important**

- **I1. The `WaitingView` doc says the opposite of the code.**
  - Where: `src/engine/core/lang/board-view.ts:130-132`.
  - What it says: the waiting cards are named "as the seat's picker names it (`pickedAs`) … but the seat whose zone it is in".
  - What the code does (R5 (a)): `waitingView` names every player, the zone's seat too. Its own comment at l.629 says so, and the page's option test pins `Equity whose founder is T` for a token in T's equity.
  - T1 changed this doc to match the pre-R5 design; BASE's wording was right.
  - Failure scenario: slice 8's Vest window and slice 9 are told to reuse `WaitingView`. Someone following this doc would "fix" `waitingView` to use `pickedAs`'s name, and the waiting line would stop saying whose card it is.
  - Fix: put back BASE's meaning (fix item 1). Behaviour is unchanged.

**Minor**

- **m1 (T2 M1, kept).** `src/pages/designer/board-text.ts:57` (`sitting`). Swapping `cardLabel(holder)` for `nameWithPlayers(holder)` survives the probe. A face-down product would then be named by its hidden face. Fix: item 2.
- **m2.** `src/engine/core/lang/fit-layout.ts:223`, `if (owner === undefined) return false;` in `drawnCards`. Removing it survives. This line is what keeps a non-`across` zone of another seat off the viewer's table (the plan's hidden-information rule). Fix: item 3.
- **m3.** `src/pages/designer/playtest.tsx:456`. The waiting line's `seatColor(by)` is unpinned; removing it survives. Fix: item 4.
- **m4.** `src/pages/designer/seat-status.ts:44`. Dropping `action?.pick?.onto != null` survives. A press without a target that picked two cards would then read `A to B`. Fix: item 6.
- **m5.** The T4/T5 seam: no test pins that the waiting line is gone during an offer or a lawsuit. Fix: item 5. It passes at HEAD.
- **m6.** Stale docs:
  - `board-text.ts:203`: "A card that sits on a card is listed only under it" is no longer true for an `across` zone.
  - `fit-layout.ts:3`: "rivals' zones are left off".
  - `fit-layout.ts:146`: "nothing of the other players'".

  Fix: item 9.
- **m7.** `README.md:324` says a card is named "the player whose zone it is in going without saying", across the playtest. The waiting line (l.336) names every player. Fix: item 12.
- **m8.** `src/pages/designer/card-pick.test.ts:251` has a test *name* starting `(amendment)`, the same kind of note as T4 M2 and T5 M3. Fix: item 10.
- **The other parked Minors:**
  - **Kept:** T3 M2 (item 8), T4 M1 (item 7), T4 M2 / T5 M3 (item 10), T5 M2 (item 11).
  - **Dropped, T4 M3:** `getAllByRole` already throws when nothing matches, so the loop at `playtest-fitted.test.tsx:2204` can't pass with no buttons.
  - **Dropped, T1 M2:** the two namings differ on purpose (R5 (a)), and `waitingView`'s comment says why. A shared helper with a flag would hide that difference. It would also leave `pickName` unused in `board-view.ts`, forcing a second `-import` change in core code (TS6133), to save two lines. I1's doc fix keeps the contract stated instead.

### Fix brief (to run on resume, plus Task 6 M3)

Paths are under /home/user/turnhout. Items 2–6 were run at e806d4c in a scratch copy: board-text, fit-layout, seat-status and the page file pass 271/271, tsc is clean, and each catches the removal it is named for. After the wave: 4075 tests in 122 files (board-text.test 43 → 44; the page file stays 115; Startup 117; examples 348; Rent Day 108).

1. **`src/engine/core/lang/board-view.ts`, the `WaitingView` doc** (the comment above `export type WaitingView`).
   - Replace its three lines from `choices it carries, and the card it picked` to `would give it away.` with:
     ```
      * choices it carries, and the card it picked (or the picked cards, in the press's order) then the card they go to, each by its name where the
      * seat sees its face, with every player its facts name, the seat whose zone it is in too, since the line says no place (“Stake whose maker
      * is p1”), and as “a face-down card” elsewhere. No card's id is in it: one that locates a hidden card would give it away.
     ```
   - Optional: in `waitingView`, rename the inner `const card = cardById(state, id)!;` and its two uses to `shown`. It shadows the `card` taken from `waiting.subject`.
   - Test: tsc. Then `board-view.test.ts` "names a Stake in another player's holdings by its maker, in the picker and the waiting action", and the page's "(option) names every player a waiting card names" pass unchanged.
2. **`src/pages/designer/board-text.test.ts`, `describe("cards on other players' cards")`.** Append after the `it("captions a card whose holder the table doesn't draw, on two lines"…)` block:
   ```ts
     it('names a face-down card it sits on as a face-down card, and says nothing of a face-down card on one', () => {
       const hidden = (card: CardState): CardState => ({ ...card, faceUp: false, faceKey: HIDDEN_FACE_KEY, data: {} });
       const vaseHidden = all.map((c) => (c.id === A.vaseId ? hidden(c) : c));
       expect(sitsOn(rival, cardOf(A.state, A.placed), vaseHidden)).toBe("on a face-down card in p0's workshop");
       expect(sitsOn(rival, hidden(cardOf(A.state, A.placed)), all)).toBeNull();
     });
   ```
   `CardState` and `HIDDEN_FACE_KEY` are already imported. It fails if `sitting` names the holder with `nameWithPlayers`.
3. **`src/engine/core/lang/fit-layout.test.ts`, `it("draws another seat's card only where it sits on one of the viewer's")`.**
   - After `const d = fixtureCard('d', 'holdings-p1', {});` add `const e = fixtureCard('e', 'crew-p0', { 'lang:on': 'v' });`. This is a card of p0's non-`across` zone sitting on p1's card, made by hand.
   - Change the call to `drawnCards(defs, [v, a, b, w, c, d, e], 'p1')`. The expected `[v, a, d]` stays.
   - It fails if `drawnCards` loses `if (owner === undefined) return false;`.
4. **`src/pages/designer/playtest-fitted.test.tsx`, `describe('the Veto window on the page')`, `it('asks each holder in turn, then lets the action go ahead (Review Focus)')`.**
   - After the first `` expect(waitingText()).toBe(`${S} wants to recruit a junior software dev.`); `` add `` expect(screen.getByTestId('waiting').style.color).toBe(seatColor(S)); ``.
   - Add a new import line at the end of the import block: `import { seatColor } from './seat-colors';`.
   - It fails if the line loses its colour.
5. **Same file, `describe('consent, the lawsuit and the Round Start on the page')`.**
   - In the Buyback `it`, after the lines `press(LET_GO);` / `` selected(`${N} — to act`); `` that come before the offer's `status()` check, add `expect(screen.queryByTestId('waiting')).toBeNull();`.
   - In the Suit `it`, after `` expect(status()).toBe(`seat: ${S} — lawsuit — Your turn — ${hint('lawsuit')}`); `` add the same line.
   - These pin that no T4 line outlasts its window into T5's offer or lawsuit.
6. **`src/pages/designer/seat-status.test.ts`, `it('falls back on the label, its first letter lower-cased, for a label no button has')`.**
   - After the `Wave` expect add `expect(waitingLine(objects, { by: 'p0', label: 'Wave', cards: ['Potter', 'Vase'], choices: [] })).toBe('p0 wants to wave: Potter and Vase.');`.
   - It fails if `waitingLine` takes a target for a button without one.
7. **`src/pages/designer/seat-status.ts`, `waitingLine` (T4 M1).** Under `// A button that picks a target card names it last: the cards it picked go to it.` add:
   ```
     // A press picks one card or more (declared-actions' `aboutSet` refuses an empty set), so such a button always waits with two or more;
     // the length test only keeps a lone card from being read as its target.
   ```
   Test: tsc.
8. **`src/engine/core/lang/fit-layout.ts`, the `stackOnHolders` doc (T3 M2).** Rewrap from `` holder's cards hang in one column `` to `is the same object, and the order is kept.` with the same text, to the file's width. This removes the orphan line `` `STACK_GAP` below the holder's bottom edge and each ``. Test: tsc.
9. **Stale docs (m6).**
   - **`board-text.ts`, the `boardText` doc.** Replace `A card that sits on a card is listed only under it. Empty for a seat with nothing on its Board.` with `A card that sits on a card is listed only under it, but a zone whose cards sit on other players' cards lists every card it holds, a placed one followed by where it sits (`sitsOn`), and under the card it sits on such a card of another seat reads `p1's …`. Empty for a seat with nothing on its Board.` Then rewrap.
   - **`fit-layout.ts` file header.** Change `and rivals' zones are left off.` to `and rivals' zones are left off but for their cards that sit on the viewer's, which hang under them.` Then rewrap.
   - **`fittedLayout`'s first doc line.** Change `and nothing of the other players', in the world` to `and nothing of the other players' but their cards on the viewer's (the last paragraph), in the world`.
   - Test: tsc.
10. **`(amendment)` notes.**
    - `playtest-fitted.test.tsx`: `// (amendment) The picker's buttons end with its Cancel, as every picker's do.` becomes `// The picker's buttons end with its Cancel, as every picker's do.`
    - Same file: `// (amendment) SECOND2 has no one on a salary, so no income step comes: their actions follow at once.` becomes `// §20.B: SECOND2 has no one on a salary, so no income step comes: their actions follow at once.`
    - `src/pages/designer/card-pick.test.ts`: the test name `'(amendment) names the card two of them sit on once, and tells them apart by their labels'` becomes `'names the card two placed ones sit on once, and tells them apart by their labels'`.
    - Test: the two files pass.
11. **`playtest-fitted.test.tsx`, Round Start `it` (T5 M2).** Delete `expect(seatButtons()).toContain(PLACE);` and `expect(seatButtons()).toContain(CONFIRM);`. The next line's `toEqual` covers both.
12. **`README.md` (m7).**
    - In plan 7-1's `In the playtest` bullet, after `the player whose zone it is in going without saying` insert ` (the waiting line, which says no place, names every player)`.
    - In `The other seats`, change `its cards named as that seat sees them` to `its cards named as that seat sees them and with every player they name`.
    - Check: the README says only what the page does.

After the wave, run tsc and the full suite, and re-run Task 6's checks over `99c3548..HEAD`. The `-import` check still prints only `board-text.ts`'s line, and the changed-test-lines check still prints the same three lines.