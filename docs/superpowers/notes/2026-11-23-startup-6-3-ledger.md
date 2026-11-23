# SDD ledger — plan: docs/superpowers/plans/2026-10-16-startup-slice-6-3-the-page.md
- Task 1 runs inside plan 6-2b's sequence (after 6-2b T1, before T2), per both plans' Global Constraints; its review and completion are recorded here and in 6-2b's ledger. Amended at 2228e05 (S1–S4 from the 6-2b pre-flight).
- Task 1: BASE 258f812 (after 6-2b T1); implementer dispatched (sonnet).
- 6-3 Task 1 implementer agent: a7bf37ab6bf9ee8d3.
- 6-3 Task 1: implementer DONE 92408f7 (pushed) — 3814 pass (+7), tsc clean, no existing test line changed; matches the probe (aee551f + 71ac85e). Review dispatched (sonnet).
- 6-3 Task 1 review (sonnet): Approved — centre defaults false (pressFlags/holderFlags untouched), only public shared zones count, testsCentre walks every group, inPlayZones in Table order, card-alone closed to CENTRE_HAS. Minors parked: testsCentre line >140 chars (worked-view.ts ~326); fixture could assert hidden !== gale; zones matched by string (safe direction). Carry the line wrap into 6-3's next push of worked-view.ts.
- 6-3 Task 1: complete (92408f7).
- Pre-flight for Tasks 2–5 dispatched (opus, background) at 0e16d25 (after 6-2b); probe in scratchpad pf63; report → pf63/report.md. To re-check after the mini plan 'long-runs retune 2 and speed-up 3' lands (it runs before Task 2).
- Pre-flight (Tasks 2–5) back: no blocker; 11 fix-in-plan (R1–R4, R6–R12), 2 ruling-needed (R5, R13). Probe pf63/work final ac3ed8a: 3840 pass (+23), tsc clean, browser 57/57, other games 112 tests, Rent Day 108. Report → docs/superpowers/notes/2026-11-23-startup-6-3-preflight.md.
- Ruling R5: option B — the hover line leaves off the columns the label already says (`cardDetail(faceKey, leaveOff)`, `labelledFacts(card, game)` in board-text.ts) — why: (A) shows each count twice (`workaholic 1 — 1 workaholic`), which a player reads as two things; B was built and passes (A7) — cost if wrong: Task 3 touches three more page files; reverting to A is the l.29 example and one parameter.
- Ruling R13: keep both 6-2a items as they are and record them as Calls 10–11 (a press flag stays a label even when nothing can change it; every button a card can be pressed with shows, greyed with its reason) — why: both follow earlier slices' conventions, and changing either needs a new shared rule — cost if wrong: a later page plan adds that rule.
- Ruling: every fix-in-plan amendment accepted as the report writes it (each was built and run in the probe). Applied by one amender agent with a "Controller amendment (pre-flight 2026-11-23, Tasks 2–5)" bullet.
- Ruling (Gaps 1–3: mid-word breaks now on Event faces, sentence-case greyed reasons, three-line labels): to the next page plan (7-3), whose pre-flight gets a note — a text-faces fix moves the four other games' face guards, which this plan must not touch — cost if wrong: Event names break mid-word on the page until 7-3.
- After the mini plan lands: re-check Task 2's appended test anchors, Step 4's example count, R4's card-alone.ts sentence (re-anchor or drop), record BASE2, compare the speed watch.
- Plan amended (amender sonnet; controller pinned the board-text test to the probe's exact test) and committed 0271a05. Tasks 2–5 wait for the mini plan.
- After mini plan T1: R4's card-alone.ts sentence dropped from the plan (speed-up 3's header already says it), card-alone.ts out of Task 2's Files and pathspec; readsOnlyCards' doc sentence now says card-alone keeps such values by the zone's cards (49a5885).
- Post-mini-plan re-checks: Task 2's anchors all exist at 88303f0 (`fresh`, `setUp`, `zoneCards`, `EVENTS`, `game`, `parseTextFaceKey`, the centre describe); example count 307; R4's card-alone sentence dropped. BASE2 = 88303f0: bun run test 3833 pass, typecheck clean, Startup file 25.98 s inside the full parallel suite (≈21.6 s alone, best).
- Ruling: implementers get the pre-flight probe's commits for their task as a cross-check reference (pf63/work: T2 d1ce82a + A1 a737462 + A2 1815046 + A3 bd0b510; T3 3d3a5dc + A4 2037cc5 + A7 ac3ed8a; T4 ecc2178 + A5 d60a634 + A6 d978957; T5 e3f4348); the amended plan text is the requirement, and a difference is reported, not copied silently. A3's card-alone.ts hunk is not to be applied (dropped after speed-up 3).
- Task 2: BASE 88303f0; implementer dispatched (sonnet).
- Task 2: implementer DONE d4ef90f (pushed) — 3847 pass (+14), tsc clean, examples 307; built from the probe's four commits less card-alone.ts; tests first, failing for the stated reasons; differs from the probe only in readsOnlyCards' doc (card-alone keeps such values, speed-up 3). Review dispatched (sonnet).
- Task 2: complete (d4ef90f) — review Approved (sonnet): no Critical/Important; Minor: scattered test imports, inPlayLines groups via cardsByZone (polish, left).
- Task 3: BASE d4ef90f; implementer dispatched (sonnet), probe ref 3d3a5dc + 2037cc5 + ac3ed8a, R5 option B; report in its final message (harness refuses subagent report files).
- Task 3: implementer DONE 596a080 (pushed) — 3850 pass (+3), tsc clean; option B as ac3ed8a; README hover line is Task 5's (plan l.646 already says option B), so the implementer's README concern is covered there. Review dispatched (sonnet).
- Task 3: complete (596a080) — review Approved (sonnet). Minor parked for the final fix wave: labelledFacts copies loneCounts' lone-count filter (share a helper); playtest-fitted's `label.endsWith('1 workaholic')` asserts a literal against itself; one assertion reuses cardDetail(…, ['workaholic']) before its literal twin.
- Task 4: BASE 596a080; implementer dispatched (sonnet), probe ref ecc2178 + d60a634 + d978957 (R8–R11).
- Task 4: implementer DONE 1d8e301 (pushed) — 3856 pass (+6), tsc clean, examples 307 / Rent Day 108; probe diff ecc2178~1..d978957 applied, one import hunk by hand; decor-filter assertion not seen red on its own (test stopped earlier). Review dispatched (sonnet).
- Task 4: complete (1d8e301) — review Approved (sonnet). Minor parked for the final fix wave: no test pins the picker's `a face-down card (p1's stash)` text (name from pickedAs); decor assertion judged by reading to bite.
- Task 5: BASE 1d8e301; implementer dispatched (sonnet); probe ref e3f4348 (README) and pf63/scripts/browser (check.cjs, probe.ts) + browser-v (variant.cjs, option B).
- Task 5: implementer DONE_WITH_CONCERNS 212857f (pushed) — README only; 3856 pass, tsc clean; four games 112 pass, Rent Day 108; probe 10 seeds ALL OK; browser 58/58, errors [], 305 of 307 examples as expected; every PNG checked; no label covers a corner index (the Hacker's label clipped by the hanging Veteran, hover gives it whole). Script fix: probe's check.cjs gave the Workaholic to the bench Junior; now the Hacker as the brief says.
- Ruling (Task 5 Step 4, Tasks 2–5 test-line check printed one line): accepted — it is Task 4's `card-pick` import line widened to add `placesOf`, no assertion removed or changed — cost if wrong: none (import only).
- Controller's Step 4 manual read: `source`/`Attribute` in + lines of src/engine, src/pages, src/utils over 258f812..92408f7 and 88303f0..HEAD — one hit, card-detail.ts's doc "Attributes the label does not already say", which is attributes in the engine sense (a card's key: value facts), not the Attribute card kind. Clean.
- Task 5: complete (212857f) — review Approved (sonnet). Minor parked for the final fix wave: README's hover sentence says "for a label that a card hanging over it covers" but the code appends the label on every labelled card's hover (narrower than the behaviour; the brief's own wording).
- All five tasks complete. Final whole-branch review dispatched (opus) over two ranges: 258f812..92408f7 (Task 1) and 88303f0..212857f (Tasks 2–5); between them lie 6-2b's and the mini plan's commits, not this plan's.
- Final review (opus) back: With fixes — 0 Critical, 1 Important, 4 Minor; perf fine (HEAD 23.3/28.6/27.0 s vs BASE2 25.2/23.7 s under load 5.25, all under the 30 s watch; this plan's own tests 21 ms + 8 ms). Saved → final-review.md.
- Ruling (Important 1, same-name rival cards in one zone read alike in the picker): fix now, in the fix wave — when two cards with a place read alike (same name, same place), each such place gains `, on {the card it sits on}` (that card's name only when face up), then, if still alike, `, {its label}` as the Board line gives it; face-down cards get their place alone, as now — why: slices 7 (Consultant) and 8 (poach, card-by-card price) build their pickers on placesOf, and a player at the seat can't pick a particular Junior today — cost if wrong: Call 6's copy grows a clause the README must say; a later slice may prefer a different disambiguator (cheap to change in one function).
- Ruling (Minors 2–5 and the parked Minors): all into the one fix wave, except the parked `cardDetail(…, ['workaholic'])` reuse assertion (harmless; its literal twin follows) — kept. Minor 2's forward notes for slices 9–10 and the WHISTLE pin go into the plan's Forward notes and the handoff by the controller (docs).
- Fix wave: DONE adbdbd3 (pushed) — 3862 pass (+6), tsc clean; F1–F6 as briefed; changed test lines: F4's three and F6's one; checks over 212857f..HEAD clean. Scoped re-review dispatched (sonnet).
- Scoped re-review (sonnet): all findings addressed (F1–F6). Residual Minors parked: the F6 face-down picker test hard-codes `a face-down card` (a render test of a hand-built view; the engine's `pickedAs` isn't exercised there); the F2 guard is a substring match over non-example, non-table lines (a name in prose counts as used) — both accepted, cheap if they bite.
- Plan 6-3: complete (last code commit adbdbd3). Archived → docs/superpowers/notes/2026-11-23-startup-6-3-ledger.md.

## Appendix: the final review (opus), adjudicated above

## Final review: plan 6-3 "the page", Task 1 (258f812..92408f7) and Tasks 2–5 (88303f0..212857f)

I read both diff packages in full, in passes (Task 1, then Tasks 2–5 in three chunks), and checked the code around them at HEAD: `card-alone.ts`, `derive-scene.ts`, `board-text.ts`, `playtest.tsx`, `declared-actions.ts` and the Startup rules. I also re-ran the plan's checks for banned words, protected files, core purity and changed test lines over both ranges. All are clean apart from the accepted import line. I timed the Startup test file and looked at three of the browser check's screenshots.

### Strengths
- **The centre reading fails closed where it should.**
  - `readsSeenCentre` (worked-view.ts:91) requires a public zone that isn't per player.
  - `matchesCard` reads only the centre card's own data, never a worked value, so `CENTRE_HAS` cannot pull in anything hidden.
  - `deriveScene` always shows the cards of a public zone face up, so no seat is told anything it couldn't already see.
  - A deck fails closed through `cardOnlyNames` returning null.
  - `pressFlags` and `holderFlags` don't take `centre`, so they are unchanged.
  - Speed-up 3's `keptValues` keys the cached values on the centre zone's cards, so the values follow a new reveal and an Undo.
- **The `Reads` options object** replaces three positional booleans, a real hazard in Task 1's six-argument signature. All five callers are correct.
- **`thenRefs` behaves exactly as the old walk did.** I traced `if`, `all`, `for`, `for each`, `CHOOSE_ONE`, `CHOOSE_PLAYER` and the other kinds, and `pressFlags` stays pinned.
- **The bank-line change is contained.** `paidNumbers` is worked out once per compiled game, and Rent Day is guarded.
- **`labelledFacts` matches the label today.** It uses the same `flagsOn` and the same lone-count filter as `boardBadges` and `keptBadges`, and `faceKeyOf` writes exactly those keys. There is no drift now; the duplication itself is already parked.
- **The decor filter's test really checks it.** `ringsOf` rings the targets a card can go to, so without the filter the rival target ids would be in `decor`.
- **Every Event's `effect` cell matches §20.D, and agrees with what 6-2b built:**
  - Patent Trolls: `They pay the license to …` is the only license line in the rules.
  - Chip Shortage: `cost` and `rehire price` are both raised, so "from any source" holds.
  - Trade Show: a pitched card and a show-priced card both set the price to 2, so the two don't stack.
- **Review Focus coverage is good:** a round start, Undo across it, the event check's tabs and "waiting for", and steps that all pass at once. The screenshots I opened (09, the 01 crop and the 04 crop) match the plan's lists.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
1. **Two rival cards of the same name in the same seat's zone can't be told apart in the picker.**
   - **Where:** `src/pages/designer/card-pick.ts:102` (`placesOf`) and `src/pages/designer/card-picker.tsx:44`.
   - **What's wrong:**
     - `ontoCandidates` lists card ids, with no grouping by name, and `pickName` is the plain name.
     - So when p2 has two Junior Software Devs in their development team, on different projects, the Debuff list shows two identical buttons: `Junior Software Dev (p2's development team)`.
     - The order of those buttons follows the zone's slot order, not the Board line's product order.
     - Rival cards aren't drawn, and the Board line isn't clickable (parked), so the page gives no way to pick a particular one.
   - **Why it matters:**
     - Duplicates are common: extra Juniors from the University, and several QA Engineers or Sales Reps.
     - Which one gets the Debuff matters, for example the Junior on the Tier 2 project.
     - The plan's own forward notes build slice 7's Consultant and slice 8's poach on `placesOf`. A poach's price differs card by card through Token Value, so slice 8 will hit this hard.
     - The Review Focus case "Two rival cards of the same name" is tested only in `card-picker.test.tsx`, with the two cards in different seats. The page test has no same-name pair.
   - **Fix:**
     - When name plus place isn't unique among the targets, extend the place with the card it sits on (`Junior Software Dev (p2's development team, on Dating App)`). If that still isn't unique, add the card's label.
     - Add a unit test with two same-named cards in one zone.
   - **Ruling needed:** this changes the plan's exact copy `{name} ({seat}'s {zone})`. Either fix it now, or carry it into 7-3 with a forward note before slices 7–8 build on `placesOf`.

#### Minor (Nice to Have)
2. **Nothing checks the "Not in effect yet." cells against the rules, and the forward notes name only three of the five cells.**
   - **Where:** `startup-simulator.rules:136–155`; plan, Forward notes, l.702–707.
   - The cells are accurate today. But slice 9 (Whistleblower; Patent Trolls' Late License and Settlement fee) and slice 10 (Come Clean) aren't in the forward notes; only slices 7 and 8 are named.
   - `WHISTLE` at `playtest-fitted.test.tsx:1721` pins one cell word for word. Slice 9 will therefore have to change an existing test line, which its plan should name.
   - **Fix:** add a Startup test: an Event's cell ends "Not in effect yet." exactly when its name is used nowhere in the rules outside the table. Today that set is the 4 named Events. Also add the slice 9 and 10 lines to the forward notes.
3. **The README and a code comment claim more than the page does.**
   - `README.md:322` and `:295` say a centre flag's changed values are shown. That holds only for Board stand-ins and gauges.
     - Under Chip Shortage, a hardware card's `cost` and `rehire price` are raised. Under Online Course Boom or Trade Show, a card's `price` changes.
     - None of these is ever shown: the face and the hover line give the printed `cost 6` or `price 5`.
   - `worked-view.ts:149` says a flag that tests the centre "holds for every card alike". That is false for flags with more than one condition: `taxed` (salary above 0), `chip short` (hardware) and `crunched` (no Clean Code on it).
   - **Fix:** reword both. Consider showing worked prices for cards off a Board in 7-3.
4. **The Debuff test checks less than the plan states.**
   - **Where:** `playtest-fitted.test.tsx:1935`.
   - The plan pins the label `burned out, 1 burnout` and `with Engineer (burned out) [1 burnout]`. The test works its bracket out from whatever the label is, so it would still pass if `burned out` disappeared.
   - This was copied from the probe (d978957) and wasn't reported. **Fix:** use the plan's two literals.
5. **README placement and wording.**
   - `README.md:95`: the sentence about leaving sentences off faces sits in Rent Day's `says` paragraph. That page has no card table and no hover line, so the line belongs under "Faces".
   - `README.md:169`: "since the table shows one seat at a time" — places are also passed on a table that fits every seat.

### Declined to judge
- Event names breaking mid-word on faces ("Regul ation Audit"), sentence-case greyed reasons and three-line labels: ruled to 7-3 (Gaps 1–3).
- The Hacker's label clipped by the Veteran hanging over it: Call 5's hover line is the plan's answer.
- The card in play's line on a page that fits one table, and clicking a rival's card on its Board line: parked by the plan.
- Option A versus B for the hover line: ruling R5 chose B.
- The Diva's permanent `egotistic` label, and every Strategy button showing greyed: R13, Calls 10–11.
- The Task 5 import-line acceptance, and `card-alone.ts` left out of Task 2: ruled.
- Every Minor already parked in the ledger. I judged none of them more severe.
- `;` inside effect text clashes with the in-play line's card separator: the Page copy is the plan's, and only one Event is ever in play.
- `testsCentre` matches `CENTRE_HAS` whatever the zone's visibility: harmless, because `readsOnlyCards` fails closed first.
- `a card in {sharedzone} is {cardflag}` is not counted by the centre reading: it fails closed, and nothing in the plan asks for it.
- Player totals over public per-player zones once slice 9 brings face-down products: 4-3's concern, already in the forward notes.
- The "1 bug" on the To-Do List in screenshot 09: earlier slices' rules.
- Worked prices of cards off a Board are not shown: outside the plan. Only the README's claim is reported (Minor 3).

### Recommendations
- Get a decision on Important 1 before slice 7 starts, because slices 7 and 8 both build on `placesOf`.
- Put Minors 2–5 in the final fix wave. Minor 2's guard test costs about 10 lines and catches a later slice that switches an Event on but forgets its cell.
- **Performance is fine.**
  - This plan's own new Startup tests take 21 ms and 8 ms.
  - The `tests` figure was 23.3, 28.6 and 27.0 s at HEAD, against 25.2 and 23.7 s at BASE2 in a temporary worktree, which I have removed.
  - The machine was loaded (load average 5.25 on 4 cores), so the spread is noise. Every run was under the 30 s watch, but the margin on this machine is only 1.5–7 s.

### Assessment
**Ready to merge?** With fixes

**Reasoning:** No hidden information leaks, and the fail-closed logic is sound. Tasks 1–5 deliver what the plan says, and the code is clean, tested and confined to what the plan allows. The one Important issue is a gap in the plan's Call 6 that a player at the seat would meet: two same-named rival cards in one zone can't be targeted separately. It needs a fix, or an explicit ruling with a forward note, before slices 7 and 8 build their pickers on it. The Minors can go in the final fix wave.

## Appendix: the final fix wave's brief

## Plan 6-3 — final fix wave (one dispatch)

Work on branch `claude/peaceful-curie-rdfkow` at 212857f (3856 pass, typecheck clean). One commit (or one per item if you prefer, all by pathspec). Tests first where an item adds behaviour; see each fail for the stated reason.

## F1 (Important). Same-name rival cards in one zone must read apart in the picker
- Now: `placesOf` (`src/pages/designer/card-pick.ts:~102`) gives `"{seat}'s {zone name}"`; `CardPicker` shows `{name} ({place})`. Two Junior Software Devs in p2's development team, on different products, show two identical buttons; rival cards aren't drawn on a fitted table, so the player can't pick a particular one.
- Ruling (the controller's): when two or more face-up cards with a place read alike (same name, same place), each such card's place gains `, on {name of the card it sits on}` — that holder's name only when the holder is face up. If two still read alike, each gains `, {its label}` — the label the Board line gives that card (the decor's badge text, as `boardOf` shows it in round brackets); pass labels into `placesOf` as an optional map if it needs them. Cards that still read alike after that are equivalent to the seat and may repeat. Face-down cards keep their place alone, as now (never name anything about them). Cards that don't collide keep `{seat}'s {zone}` unchanged, so every existing expected string stays.
- Example copy: `Junior Software Dev (p2's development team, on Dating App)`.
- Shared code: no Startup Simulator words in card-pick.ts / card-picker.tsx (use generic fixtures in their unit tests, e.g. the Vase/Potter/Statue tables already there).
- Tests:
  - `card-pick.test.ts`: two same-named cards in one rival zone on different holders → each place names its holder; same holder with different labels → the label is appended; a face-down holder is not named; a non-colliding card's place unchanged.
  - `playtest-fitted.test.tsx` (append): Review Focus — two rival Junior Software Devs in one seat's development team on different products; the Debuff list shows both with `, on {product}`, and picking the second puts the Debuff on that one.
- README: where the README says `Vase (p1's workshop)` (lines ~169 and ~295), add that two of the same name in one place are told apart by the card each sits on, then by its label.

## F2 (Minor). Guard the "Not in effect yet." cells
- Add a Startup Simulator test (beside Task 2's Event-table tests): an Event's `effect` cell ends `Not in effect yet.` exactly when the Event's name (case-insensitive) is used nowhere in the rules outside the Event table. Today that set is Venture Capital Rain, Recruiter Frenzy, Headhunter Holiday and Whistleblower Protection Act — assert the set too. If the rule as worded doesn't hold at HEAD, report what breaks it rather than bending the test.

## F3 (Minor). Claims that say more than the page does
- `README.md` ~295 ("though its values are shown") and ~322 ("though the values it changes are shown, gauges included"): say the values it changes show on the Board lines and the gauges; a card's own worked cost or price is not shown yet (its face and hover line give the printed one).
- `src/engine/core/lang/worked-view.ts:~149` comment ("holds for every card alike"): it is false for a flag with other conditions (`taxed`, `chip short`, `crunched`). Reword: a flag that tests the centre turns on with the card there (for every card its other conditions hold for), so the card in play says it once and no face is labelled with it. Comment only.

## F4 (Minor). The Debuff test checks less than the plan states
- `src/pages/designer/playtest-fitted.test.tsx:~1933–1936` works its bracket out from whatever the label is. Pin the plan's literals: the Engineer's label on N's tab is `burned out, 1 burnout`, and `boardOf(N)` contains `with Engineer (burned out) [1 burnout]`. If the page gives a different literal at HEAD, pin what it gives and report why it differs from the plan.

## F5 (Minor). README placement and wording
- `README.md:~95`: the sentence about a sentence value being left off a card's face (added by Task 5 to "Cards that say what they do") sits in Rent Day's `says` paragraph, whose page has no card table; move it under `The Board`'s **Faces** bullet (~302).
- `README.md:~169`: drop "since the table shows one seat at a time" (places are passed on any table); say instead that the place tells a rival's card apart, as F1 extends it.
- `README.md:~321`: "for a label that a card hanging over it covers" is narrower than the code, which appends the label to every labelled card's hover. Say the hover line names a card's whole label after its columns (which a card hanging over it may cover on the canvas).

## F6 (parked Minors from the task reviews)
- `board-text.ts`: `labelledFacts` copies `loneCounts`' lone-count filter. Share one small helper (the lone count names) between them; no behaviour change.
- `playtest-fitted.test.tsx`: remove `expect(label.endsWith('1 workaholic')).toBe(true)` (a literal checked against itself; the next assertion pins the whole label).
- Add a test that the picker lists an unseen card in a rival zone as `a face-down card ({seat}'s {zone})` (its name from the engine's `pickedAs`), e.g. in `card-picker.test.tsx` or `playtest-fitted.test.tsx` with a stashed card.

## Constraints and final checks
- Never touch `src/engine/core/game-state.ts`, `flow.ts`, `game-engine.ts`, `src/pages/hearts-demo/**`. Core pure. No Startup words in shared code (engine, utils, shared page code). Hearts, Color Match, Venom, Rent Day unchanged (Rent Day 108 examples). Startup 307 examples. No new state key, data key or move field. No hidden card's name reaches the page.
- `bun run test` (expect 3856 + your new tests) and `bun run typecheck` clean.
- Re-run over `212857f..HEAD`: the plan's shared-words grep, the core-purity grep, the protected-files stat (commands in Task 5's brief, `.superpowers/sdd/2026-10-16-startup-slice-6-3-the-page/task-5-brief.md` Step 4), and list every existing test line removed or changed (expected: the F4 lines and F6's removed assertion only).
- Commit trailers (end of every message):
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
