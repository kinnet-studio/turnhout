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
