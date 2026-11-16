# SDD ledger — plan: docs/superpowers/plans/2026-10-16-startup-slice-5-3-the-page.md
Setup: workspace, 4 briefs, constraints. Sequencing: T1 before 5-2b (G1). Pre-flight of T1 only dispatched (opus) at c3ac18a; T2–T4 get their own pre-flight after 5-2b
Pre-flight T1: 19 names (1 differs), works as written; 7 rulings F1–F7 (F2 forward to 5-2b), 3 gaps (Ga parked, Gb optional browser smoke, Gc 5-2b's pins). Ruling: accept all; plan amended, constraints and briefs regenerated
Task 1: dispatching at BASE a28e52a with F1–F7
Task 1: dispatched (opus, BASE a28e52a) with F1–F7, optional browser smoke; implementer ac0bce603b1b7c4f4
Task 1: implemented bbe5c92 (DONE; 3618 tests, +25; other games' layouts byte-identical; browser smoke passed 1200×1380). Extra: an off-centre setPosition case; isPrivate/isAttached to module scope, linesOf shared
Task 1: review dispatched (sonnet) on a28e52a..bbe5c92
Task 1: review (sonnet) — ✅ Approved. Minors parked for 5-3's final review: (m1) 'multiple of 8' lacks a why-comment; (m2) TABLE_BOUNDS import could join the type import; (m3) misfits/misfitsIn duplication (5-2b may collapse); (m4) fittedBounds memo not gated on fitted; (m5) TALL_GAME via replace
Task 1: complete (bbe5c92). Tasks 2–4 wait for plan 5-2b, then their own pre-flight
Pre-flight T2–T4: dispatched (opus) at 2a6147d while 5-2b's T5 review runs
Pre-flight T2–T4: at 2a6147d; 29 names (6 differ); 7 rulings (R1 High, R2/R3/R6 Medium, R4/R5/R7 Low), 3 gaps parked (milestone face names wrap mid-word; 'Only if one of' greyed reasons with mid-sentence capitals; G1 → 6-1). Ruling: accept all 7; plan amended, constraints and briefs regenerated. Also killed an orphaned vitest (pid 15987) left by 5-2b's final reviewer in a deleted worktree
Task 2: dispatched (opus, BASE 656d6eb = BASE2) with R1, R5; implementer a333e86846d0ce61c
Task 2: implementer stopped at the user's pause (no files changed; tree clean at 656d6eb). Resume: re-dispatch Task 2 from its brief with R1, R5
Resume (new container, 2026-11-16): workspace rebuilt from docs/superpowers/notes; deps reinstalled; HEAD a0be4b0
Baseline at a0be4b0: typecheck clean; 3638 tests pass (56.6 s)
Task 2: re-dispatched (opus, BASE a0be4b0 = BASE2) with R1, R5; implementer a27de1b7344406c06
Task 2: implemented cca9bf1 (DONE; 3650 tests; 12 mutations caught; rival views clean). Concerns: For-each group flags also read (call 2 covers); torn guard can't fail (kept, single guard added); 2 extra tests; stale '(guard)' title on the changed pin
Task 2: review dispatched (opus) on a0be4b0..cca9bf1
Task 2: review (opus) — ✅ Approved, no Critical/Important. Minors: (m1) For-each group flags read — in scope, kept; (m2) stale '(guard)' title at playtest-fitted.test.tsx:1385 — optional retitle in Task 4; (m3) pressFlags runs twice per workedView, no memo — parked; (m4) forward: seesFace uses isRevealed, true for any public-zone card whatever faceUp — carried to slice 9's notes (plan l.760 overclaims)
Task 2: complete (cca9bf1)
Task 3: dispatching at BASE 5f175ea (Task 2 cca9bf1 + notes commit) with R2, R3, R4
Task 3: dispatched (opus, BASE 5f175ea) with R2, R3, R4; implementer aed439de0fac8881a
Task 3: implemented db57012 (DONE_WITH_CONCERNS; 3658 tests, +8; typecheck clean; Step 2 as §6). Concerns: stale comment above R2's pin (~l.1261) left; face-down test is HIDDEN_FACE_KEY like flagsOn/loneCounts (exact for the scene the page passes)
Task 3: review dispatched (opus) on 5f175ea..db57012
Task 3: review (opus) — spec compliant; Changes requested on one Important: (I1) the comment above R2's pin (playtest-fitted.test.tsx:1261-1262) contradicts its new assertion and calls it a guard. Minors: (m1) undeclared-zone skip in keptBadges undocumented/untested; (m2) board-text module header too narrow; (m3) forward: slice 9's fix must be in the projection (projectCard/isRevealed give HIDDEN_FACE_KEY and strip data), not seesFace alone; (m4) potter2 labelled with faceUp:false in raw test state — needs a why-comment; (m5) keptBadges/boardBadges near-identical loops — parked
Ruling: R2 extends to the two comment lines above its pin (a comment is not a test line; R2 changed the test's meaning) — cost if wrong: two comment lines. Task 4 Step 4's test-diff check then also prints those two removed comment lines. Fold m1, m2, m4 into the same fix round (same files, tiny); m3 controller adds to slice-9 notes; m5 parked for the final review
Task 3: fix round 1 — resume implementer aed439de0fac8881a with I1, m1, m2, m4
Notes: slice-9 m3 note committed d568168 (pushed) while fix round 1 runs; fix-round re-review range starts at d568168
Task 3: fix round 1 — 99db1ce (I1 comment, m1 doc + box assertion, mutation caught; m2 header; m4 comment) + e21f718 (rewrap). Controller scoped re-review (17-line diff, read in full): all four addressed, new import on its own line, no new banned words; focused files 127/127 re-run by controller. Changed existing test lines vs 5f175ea: R2's two comment lines, title, l.1271
Task 3: complete (db57012, 99db1ce, e21f718). Carry to Task 4: Step 4's test-diff check also prints R2's two removed comment lines; optional retitle of Task 2's stale '(guard)' title at playtest-fitted.test.tsx:1385
Task 4: dispatching at BASE e21f718 with R3 (Task 4 labels), R5 (ranges: Task 1 bbe5c92, BASE2 a0be4b0; start 3638, expect 3658), R6 a–f, R7; scratch path corrected to this machine's scratchpad; 3-2/4-3 browser helpers gone with the old machine → rebuild from 1b-3 plan l.640–658 + R6(d). Ruling: leave Task 2's '(guard)' title (still true of 4-3's change; a retitle would add a changed test line)
Task 4: dispatched (opus, BASE e21f718); implementer a790a10ed8f0ad525
Task 4: implemented ef32883 (DONE_WITH_CONCERNS; README only +6 −3; 3658 tests; typecheck clean; Step 4 checks print only R2's four lines + Task 2's BOARD_LINE; four games alone 112 pass, Rent Day 108 examples; probe 71 checks seeds 1–10; browser 13 steps, 52/52 checks, no page/console errors; every screenshot read)
Task 4: controller review — README diff read in full against Step 3 + R7: all four Step 3 items and R7 present, R3 names used; 11-rival.png viewed (p0's brainstorm names hidden on p1's tab, sizes only). No leftover processes. ✅ Approved. New page gaps parked for 6-3's pre-flight: (Gc) a three-line off-Board label covers most of the bench card's name; (Gd) p0's line shows '· 1 mentoring ·' during graduation (5-2b's working count). Ga seen again (milestone names break mid-word)
Task 4: complete (ef32883)
Final review: package review-final-5-3.diff (bbe5c92 + a0be4b0..44c98dd, docs excluded)
Final review: dispatched (opus) on bbe5c92 + a0be4b0..44c98dd
Final review (opus): Ready — no Critical/Important; 6 minors. Parked minors: T1 m1 fix now; T1 m2–m5, T2 m3, T3 m5 keep parked (reasons in the review)
Final fix wave (controller, inline — six one-line doc/comment/test edits): fd0c4a3 — scene.ts world comment; fit-layout 'multiple of 8' why (T1 m1); worked-view doc without '(Call 2/3)'; README lists `managing` and says off-Board labels show counts no column reads; the hanging-team pin checks the fourth card (3·STACK_STEP). Slice-9 note: isRevealed treats __box as public. Typecheck clean; full suite 3658 pass (56 s)
Plan 5-3: complete (bbe5c92, cca9bf1, db57012, 99db1ce, e21f718, ef32883, fd0c4a3)
