# Pre-flight — plan 5-3, Tasks 2–4 ("the flags a press reads", "faces off the Board", "the browser check")

- **HEAD scanned:** `2a6147d` (5-2b's last task). Re-checked at the end of the scan: unchanged, working tree clean. No 5-2b fix landed during the scan. 5-2b's reviewer was running its own vitest in `/tmp/review-2a6147d`; this scan did not touch it.
- **Inputs:**
  - the plan (header, Calls 2–6, Global Constraints, Review Focus, "Assumed from earlier plans", Tasks 2–4, Gaps, Forward notes);
  - `task-2/3/4-brief.md` (each verbatim from the plan), `constraints.md`, `preflight-t1.md`, `progress.md`;
  - 5-2a's pre-flight (P2, P4, the Agile note) and the carried notes `notes-5-3-preflight.md`;
  - the code and tests named in §1, and `README.md`.
- **Probe paths** (all under `/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/`):
  - `pf53/`: `git archive HEAD` plus `node_modules`, with Tasks 2 and 3 built as the plan writes them, P2's names, and rulings R1–R5. Its scratch probes are in `pf53/src/zprobe/` (`names`, `extra`, `r1`).
  - `pf53-base/`: an untouched `git archive HEAD`.
  - `pf53-t2s2/`: HEAD plus Task 2's tests and fixture, with no source change (the Step 2 state).
  - `pf53.diff`: the probe's diff against HEAD, without `zprobe`.
  - Logs:
    - `pf53-base.log`: baseline, 3637 tests;
    - `pf53-t2-asis.log`: Task 2 exactly as written;
    - `pf53-full.log`: Tasks 2–3 and R1, before R2;
    - `pf53-final.log`: everything applied;
    - `pf53-tsc.log`: typecheck;
    - `pf53-time-base.log` and `pf53-time-t23.log`: the long runs, timed.
  - `pf53-browser/`: Task 4 as probed.
    - `probe.ts` (Step 1, run with `bun`), `edited.rules`, `zones.json`;
    - `check.cjs` (Step 2) and `check.log`;
    - `filltime.cjs`, `where.cjs` and `examples.ts`;
    - the screenshots `01`–`13` and the crops.
    - The probe's Vite ran on port 5193 and was stopped. No process of this scan is left.

**Result:** Tasks 2 and 3 work as designed once the rulings below are applied. The browser check runs end to end through all 13 steps, with no page or console errors.

As written, they do not get through:
- **Task 2** never labels `agile`. Its two Startup pins fail, and so do Task 3's Senior PM label and Task 4's `managing, agile` (R1, High).
- **Task 3** breaks one existing 4-3 pin it does not name (R2).
- **The xp and skill labels and fixtures** in Tasks 3–4 use the names from before P2's rename (R3).
- **Task 4's browser script** stalls on `fill` and has a false-positive `innerText` check (R6).

Seven findings in all can be fixed inside the plan: 1 high, 3 medium and 3 low. Three gaps are left that no ruling inside the plan can fix, and one more is carried from 5-2b. No existing test changes except the named ones (R2 adds two lines). The words, `badge` and purity greps print nothing. Typecheck is clean. The long runs take no longer.

## 1. Names Tasks 2–4 consume or edit, at HEAD

| # | Name | ✓/✗/differs | Evidence |
|---|---|---|---|
| 1 | `readsOnlyCards(game, name, seen)` (private) | ✓ | `worked-view.ts:67`. A `holder` flag can go after `seen`. |
| 2 | `cardOnlyNames(game, ref)`, `testNames`, `isWorked`, `CARD_ONLY` (private) | ✓ | `:44`, `:34`, `:24`, `:21`. `CARD_ONLY` is the two registrars only. |
| 3 | `it is {cardflag}` counted as card-only | **differs** | It is registered in `fact-phrases.ts:504`, not in `CARD_ONLY`. Only `it is not {cardflag}` (card-subject `:86`) counts. **R1.** |
| 4 | `shownFlags` / `shownPlayerValues` pins (Startup) | ✓ | `startup-simulator.test.ts:3911` gives `['stalled','efficient in ops','experienced','practised']`. `:3938` gives 9 values without `operational revenue` or `active tags`. |
| 5 | `seesFace` (exported), `workedView`, `cardsKept`, `workedCard` (private) | ✓ | `board-view.ts:348`, `:483`, `:140`, `:466`. `cardsKept` covers public per-player zones only. |
| 6 | `holderIdOf`, `putOn` | ✓ | `attach.ts:17`, `:29`. |
| 7 | The holder conditions | ✓ | `attach-phrases.ts:206–207`, as inline strings. `HOLDER_PHRASES` is new. |
| 8 | `CHOOSE_ONE` / `CHOOSE_PLAYER` / `ChoiceOption` | ✓ | `choices.ts:13–21`. Args: `[at, guard, options]` and `[at, guard, who, effect]`. |
| 9 | Effect frames | ✓ | `if` is `[condition, effect]`, and its condition may be `lang 'all'` with two refs (`compile-util.ts:435/486`). `for` is `[holder, ref]` and `for each` is `[group, effect]`. |
| 10 | `SORT_GAME`, `BOOST_GAME`, `YARD_GAME`, `SHOWN`, `CREW_GAME` | ✓ | `testing.ts:658/568/490/594/400`. `PERCH_GAME`'s two `.replace` texts are both found. |
| 11 | "are these 22" | ✓ | `worked-view.test.ts:138`. It still passes with R1. |
| 12 | Startup `game.worked` order of the press flags | ✓ | `managing` (276), `agile` (282), `coaching` (412), `pending badge` (416), `attaching` (490). |
| 13 | Where the press flags are named | ✓ | `agile`: `some card on the target card is {cardflag}` (assign and the two reassigns). `managing`: `some card in {zones} is {cardflag}` (both Brainstorms). `coaching`, `pending badge`, `attaching`: Launch, the hires and assigns. |
| 14 | `Pending badge:` reads the card it is on | ✓ | `the card it is on is not {cardclass}`. Startup `holderFlags` = `['pending badge']`. |
| 15 | Counts (P2) | **differs** | `blue/red/green xp tokens`, `training xp`, `blue/red/green skill tokens`, `pending blue/red/green`. `counted` gives `1 … token` / `2 … tokens`. The plan uses `red xp`, `blue skill`, … (R3). |
| 16 | `countsRead`'s colour trap | ✓ (none) | Fronts are `blue xp`, `blue skill`, `pending`. No column starts with them, so every xp, skill or waiting count is lone. |
| 17 | `loneCounts`, `boardBadges`, `flagsOn` / `onABoard` / `isFaceDown` (private) | ✓ | `board-text.ts:97`, `:211`, `:121`, `:29`, `:34`. |
| 18 | `board-text.test.ts`: `CREW`, `TIRED`, `arrange`, `idsOf`, `cardOf` | ✓ | `:20–47`. |
| 19 | `playtest.tsx` decor | ✓ | `const badges = boardBadges(game, placed, worked);` (`:236`). `placed` = the scene's cards in drawn zones. |
| 20 | `playtest-fitted.test.tsx` helpers | ✓ | `mount`, `setUp`, `idOf(state, name, zoneId?)`, `S`/`N`/`O`, `hint`, `lineOf`, `status`, `press`, `picker`, `pickNamed`, `cardsIn`, `fittedZone`, `click`, `offer`, `choose`, `ring`, `inOrder`, `named`, `offered`, `noOffer`, `askedGroup`, `askedOptions`, `answerAsked`, `seatButtons`. `inOrder` returns cards, not names. `tab` and `boardOf` are local. |
| 21 | 4-3's Growth Hacker pin | ✓ | `BOARD_LINE` (`:1371`), used twice. One line changes. |
| 22 | 4-3's backlog pin | **differs (unnamed)** | `:1263–1274`, "badges no card in a backlog". Task 3 breaks it (R2). |
| 23 | Status of an interrupting phase | **differs** | `seat: S — brainstorm — Your turn — …` (`seat-status.ts:20`), as the research and sourcing pins have it. The plan omits `brainstorm —` (R4). |
| 24 | 5-2b's zones, buttons, phases and hints | ✓ | All second-person labels match: `PLAY`, `FLUSH`, `KEEP_IDEA`, `KEEP_*`, `MENTOR`, `LAUNCH`, `Discard a card in your strategy hand`. Mentor's greyed reason is `it is mentorable`. |
| 25 | Fitted positions Task 3 reads | ✓ | Strip at 830/650: `strategy-hand` (0,650), `brainstorm` (420,650). `milestones` (0,192). `milestone-row` (60,−446). `development` (−420,−266). |
| 26 | Task 4 tools | ✓ | Global playwright 1.56.1, `/opt/pw-browsers`, `NODE_PATH` already set, `browser-4-3/check.cjs` present. `bun probe.ts` resolves `@/` imports. |
| 27 | Task 4 edit anchors and Setup phrases | ✓ | The start line and the `Junior QA Tester` line each occur once. All 13 block lines compile. Seeds 1–10 give 63/63 checks (slot order). |
| 28 | `locator.fill` of the edited rules | **differs** | It does not finish in 60 s on the ~200 KB text (R6). |
| 29 | README targets | ✓ / **differs** | "A table too big for one screen", "The Board" and the slice-5 Startup bullet are all there. The 5-1 "Beyond the card" bullet says "The playtest never shows either on a face", which Task 2 makes false (R7). |

Counts: 23 ✓, 6 differ, 0 missing.

## 2. Probes

### Task 2 (`pf53`, `pf53-t2s2`)
- **As written** (`pf53-t2-asis.log`, `src/engine src/pages src/games`): 3 fail, 3635 pass.
  - The two Startup pins fail. `pressFlags(game)` is `['managing','coaching','pending badge','attaching']`, and the Senior PM and a badged Junior PM read `['managing']`.
  - The named Growth Hacker pin fails as expected.
  - No other existing test changes.
- **With R1** (`pf53-full.log`):
  - `pressFlags(game)` = `['managing','agile','coaching','pending badge','attaching']` and `holderFlags` = `['pending badge']`.
  - `shownFlags`, `standIns`, `shownPlayerValues`, `gaugePairs` and `dimFlags` are unchanged, and so is every existing test (only the named pin, plus R2's).
- **PERCH tests:** all plan bullets pass.
  - `pressFlags(PERCH)` = `['helping','eager','perched']` and `holderFlags` = `['perched']`. `shownFlags` is `[]`.
  - The torn guard gives the same list. YARD gives `['clinging']`, and BOOST and `SHOWN` give `[]`.
  - `watched` is left out.
  - The view: `{potter2:['perched'], smith:['helping'], tinker:['eager']}` with `columns: {}`. A tired Smith gets no entry.
  - With the Statue moved to `stash-p0`, p1 has no entry for potter2, p1 still gets the Smith's `['helping']`, and p0 keeps `['perched']`.
  - The spy test gives `[...HOLDER_PHRASES]`.
- **Step 2 state** (`pf53-t2s2`): 10 fail. That is 7 worked-view tests (including the `pressFlags(SHOWN)` "(guard)", R5), 2 Startup tests and the changed pin. Every existing test passes, and so does the fixture test.
- **Startup with a hidden holder** (`zprobe/extra`, an arranged state the rules never reach): with the Neobank in S's backlog, the Junior PM reads `['managing']` for the rivals and `['managing','pending badge']` for S.
- **A `{cardgroup}` test in an effect:** `The cards on it that are eager gain 1 red mark.` gives `['helping','eager']`. The walk collects it, but no planned test covers it (R5).
- **Long runs:** the Startup test file takes 23.6 s → 23.8 s. "Plays the same game through the page's view" takes 685 → 783 ms, well under a third more.

### Task 3 (`pf53`)
- **board-text:** both pass. `{ potter2: 'tired, 1 dent', smith2: '2 dents' }`, and a face-down card gives `{}`.
- **The page, "slice 5 on the page"** (5 tests): all pass with P2's names (R3), the brainstorm status (R4) and R1.
  - **Training:** the targets are `Junior Hardware Eng`, `Junior QA Tester` and `Junior Software Dev` (live) and `QA Engineer` (greyed). Its title is "The card is not a Full Stack Bootcamp or The target card is blue trainable or The target card is red trainable" (Gap Gb).
  - **Graduation:** the offer is `[KEEP_BLUE,true],[KEEP_RED,true],[KEEP_GREEN,true],[MENTOR,'it is mentorable']`.
  - **Undo** closes both the Brainstorm offer and the Mentor's question, with no ring left.
- **Step 2** (before the decor merge): "tokens on faces" and "Training" fail, along with the 2 board-text tests. "The strategy hand", "the strategy cleanup" and "graduation" pass already, so they are guards once Task 2 has landed.
- **Full suite:** the one unnamed casualty is 4-3's backlog pin, `expect(Object.keys(table!.decor!)).not.toContain(own)`. The seat's own backlog card is now labelled `3 bugs` (R2). Every decor `toEqual` guard passes.
- **Final** (`pf53-final.log`, every ruling applied, `zprobe` excluded): **3654 passed, 0 failed, 119 files** (123 s). That is 3637 + 17: worked-view +8, Startup +2, board-text +2, page +5. R1's test was probed separately in `zprobe/r1`, so it is outside this count; with it the total is +18. Typecheck is clean (`pf53-tsc.log`).
- **Task 4's greps** on `pf53.diff` (words, `badge` in core, purity) print nothing. The changed test lines are the Growth Hacker `BOARD_LINE` and R2's title and assertion.

### Task 4 (`pf53-browser`)
- **Step 1** (`bun probe.ts`): runnable as written.
  - The edited rules compile with no diagnostics.
  - Seeds 1–10: p0 is in `income`, the milestone row reads Clean Launch, First Mover Advantage, Talent Magnet (in that slot order), the hand is the Bootcamp, the Cloud Storage holds 4/4 cubes, the bench is SW, HW, QA, Veteran, the ops team is the Senior PM, and the HW Eng has 1/1/1.
  - `fittedBounds` is ±920.
  - The designer then reports **241 of 243 examples pass**: "setting up (ruling 25)" and "the Strategy deck holds all 30 cards", both because of the Setup edit. It still reads "No problems found."
- **Step 2** (Vite from `pf53` on 5193, Chromium with SwiftShader, viewport 1600×3000):
  - **`fill`** of the 200 KB rules timed out at 20 s and again at 60 s. The native value setter with one `input` event settled in ~2.5 s (`filltime.cjs`).
  - **Steps 01–12** all check out from the DOM:
    - canvas 1200×1380, Income hint, `ops team: Senior PM (managing, agile)`;
    - the Bootcamp offers `[PLAY, FLUSH]`;
    - the onto prompt with the Juniors live and the Veteran and Senior PM grey;
    - Choose one: Blue, Red;
    - `p0 1 capital`;
    - the assign line exactly as the plan's, with P2's names;
    - graduation with the keeps live and the Mentor grey;
    - after the keep, `(graduated) [1 red xp token, 1 pending blue, 1 pending green]`;
    - Mentor: Blue, Green;
    - `(experienced) [1 red xp token, 1 green xp token]` and `milestones: Clean Launch`;
    - Brainstorm draws 3;
    - on the p1 tab, `strategy hand 0 · brainstorm 3 · milestones 1` and the discard's hover shows the Bootcamp;
    - after the keep, `p1 — to act`.
  - **Step 13:** three 800×600 Color Match canvases. This needs 4-3's dialog handler ("Replace your current rules?").
  - **False positive in step 11:** in one run the drawn "Agile Workshop" was found in `document.body.innerText`. It comes from the designer's Examples panel, whose titles name Agile Workshop, Full Stack Bootcamp, QA Certification, Sales Seminar, Leadership Masterclass and Hit Piece (`where.cjs`). The playtest area held none of the names.
  - **Screenshots:**
    - The bench HW Eng label and `managing, agile` draw.
    - On the squeezed 5-card ops team (07), and on the four cards hanging in 05, each corner label is cut off by the next card. The Board line is the readable source.
    - The milestone faces break mid-word: "Clean Launc|h", "Talent Magne" (Gap Ga).

### Hidden information (rival views)
- **`pressFlags`:**
  - Every press flag reads only the card, the cards on it (only where every zone of cards on cards is public) and the card it is on.
  - A holder flag is worked out only when the seat `seesFace` the holder. This is probed on PERCH and on Startup.
  - At HEAD, `attachmentProblem` refuses a holder outside a public zone of the same seat, so the gate only acts on arranged states, and in slice 9 on face-down cards.
- **`keptBadges`:**
  - It reads only the scene's cards in drawn zones, and skips face-down cards.
  - On O's tab, S's bench is not drawn and `2 red xp` is absent.
  - The four games pick no cards, so they get no decor (probed).
- **Strategy hand and Brainstorm:** a rival gets sizes only, in the tableau line, on the page and in the browser.
- **Hover:** shows face-up cards only, and the public discard shows its top card.
- **Carried from 5-2b (G1):** reshuffled card ids are not visible on the page (Gap Gc).

## 3. Pair table

| Files / names | Tasks | Interaction | Status |
|---|---|---|---|
| `testing.ts` | T1 `TALL_GAME` after `CREW_GAME`; T2 `PERCH_GAME` after `SORT_GAME` | Independent. Both have the TDZ rule (each goes below its base). | ✓ (R5: write `PERCH_GAME` in Step 1, as F3 did) |
| `playtest.tsx` | T1 `fittedCanvas` memo; T3 decor merge (`:236`) | Different blocks | ✓ |
| `playtest-fitted.test.tsx` | T1 "a fitted table that grows" and `misfitsIn`; T2 `BOARD_LINE`; T3 append; 4-3's backlog pin | T3's above/below checks read T1's grown layout. T3's Senior PM label and Veteran `coaching` need T2 with R1. T3 breaks 4-3's backlog pin. | R1, R2 |
| `worked-view.ts`, `board-view.ts`, `attach-phrases.ts`, `fact-phrases.ts` | T2 (and R1) | `board-text`'s `boardBadges` (T3) and the Board line show T2's flags through `worked` | ✓ |
| `board-text.ts` | T3 `keptBadges` (uses `flagsOn`, `loneCounts`, `onABoard`, `isFaceDown`) | Only off-Board cards, so no overlap with `boardBadges` | ✓ |
| `startup-simulator.test.ts` | T2 append (new import line) | — | ✓ |
| `README.md` | T4 (T1's grown table, T2, T3) | 5-1's "Beyond the card" sentence becomes false after T2 | R7 |
| Browser check | T4 reads T1 (1200×1380, `zones.json`), T2 + R1 labels, T3 bench labels | — | R6 |
| Task 4 Step 4 diffs | Task 1 commit `bbe5c92` (BASE `a28e52a`) and `BASE2..HEAD` | "No rules changed" must be run over `BASE2..HEAD` only: `a28e52a..` includes 5-2b's rules | R5 note |

## 4. Rulings

**R1 — High (Task 2, which feeds Tasks 3 and 4). `agile` is never labelled.**
- **Evidence:**
  - `Agile:` reads `Only if it is managing.` and `It is badged.` through `it is {cardflag}`.
  - That phrase is registered in `fact-phrases.ts:504` and is not card-only to `worked-view`, so `readsOnlyCards('agile')` is false.
  - 5-2a's P4 left Agile worded this way because "nothing shown reads them". 5-3 is what reads them.
  - As written, Task 2's two Startup pins fail, Task 3's Senior PM `managing, agile` and its Board line fail, Task 4's 01/05+ `managing, agile` fail, and the README bullet naming `agile` is wrong.
- **Ruling:** in Task 2, count `it is {cardflag}` as reading the card, as its twin `it is not {cardflag}` already does.
  - `fact-phrases.ts` exports `IT_IS_FLAGGED = 'it is {cardflag}'` and uses it in its registration.
  - `worked-view`'s `cardOnlyNames` takes a `condition` ref with that phrase as card-only, so its `{cardflag}` arg is read and traced like any name.
  - Add a worked-view test: SORT_GAME with `Every card on it that is proud is keen.` and `Every card on it that is nosy is keen.` after the eager line, plus `Proud:` (`Only if it is helping.`), `Watched:` (`Only if its owner has a card in their stash that is tired.`) and `Nosy:` (`Only if it is watched.`). It gives `['helping','eager','proud']`, with `nosy` left out and `shownFlags` `[]`.
  - Add `src/engine/core/lang/library/fact-phrases.ts` to Task 2's Files and its commit pathspec.
- **Why not the alternatives:** rewording Agile breaks the plan's "no rules text changes" and Task 4's no-rules check. Dropping `agile` loses a stated goal (header, Call 2, README).
- **Probe:** `pf53-full.log` and `pf53-final.log`. No other existing test changes; Startup's `shownFlags`, `standIns`, `shownPlayerValues`, `gaugePairs` and `dimFlags` are unchanged; "are these 22" passes; `zprobe/r1`. Hidden information is safe: it reads only the card's own flag, and a worked flag is traced recursively, so `nosy` stays out.
- **Cost if wrong:** Task 2 stops at Step 4, or `agile` silently disappears from 3 tasks and the README.

**R2 — Medium (Task 3). An unnamed 4-3 pin breaks.**
- **Evidence:** "Review Focus: badges no card in a backlog, and never shows another seat's Bugs" (`playtest-fitted.test.tsx:1263`) asserts `not.toContain(own)`. S's own backlog card, with `bugs: 3`, is now labelled `3 bugs` for S. That is Call 4's intent, since S is given the card's face. The hidden-information half (O's card, `theirs`) still holds.
- **Ruling:** Task 3 names this pin as changed.
  - The title becomes `"Review Focus: badges a card in a backlog for its owner alone, and never shows another seat's Bugs"`.
  - Line 1271 becomes `expect(table!.decor![own]).toEqual({ badge: '3 bugs' });`.
  - Task 4 Step 4's last check then prints these two lines as well as Task 2's.
- **Probe:** the page file passes.
- **Cost if wrong:** Task 3 stops at Step 4.

**R3 — Medium (Tasks 3 and 4, constraints, Call 4). P2's names.**
- **Ruling:** use the names after P2's rename everywhere a count is named. `counted` makes `token` singular at 1.
- **Fixtures:**
  - `{ 'red xp tokens': 2, 'blue skill tokens': 1, badged: true }`;
  - `{ 'blue xp tokens': 2 }`;
  - `{ …, 'blue skill tokens': 1, 'green skill tokens': 1 }`.
- **Task 3 labels:**
  - `badged, 2 red xp tokens, 1 blue skill token`;
  - `2 blue xp tokens`;
  - `1 red skill token` (both Juniors), and `with Junior Software Dev [1 red skill token]`;
  - `1 blue xp token`;
  - `1 blue skill token, 1 green skill token, 1 pending blue, 1 pending red, 1 pending green`;
  - `graduated, 1 red xp token, 1 blue skill token, 1 green skill token, 1 pending blue, 1 pending green`;
  - `experienced, 1 red xp token, 1 green xp token, 1 blue skill token, 1 green skill token`;
  - `ops team: Veteran (coaching); Junior Software Dev [1 blue xp token]; Junior Hardware Eng (experienced) [1 red xp token, 1 green xp token, 1 blue skill token, 1 green skill token]`.
  - The negative check `2 red xp` still works as a substring.
- **Task 4:**
  - `1 red skill token`;
  - `Junior QA Tester [1 red skill token]`;
  - `graduated, 1 red xp token, 1 pending blue, 1 pending green`;
  - `experienced, 1 red xp token, 1 green xp token`.
- **Plan text:**
  - Call 4 (l.40): `badged, 2 blue xp tokens, 1 red skill token, 1 pending blue`;
  - Page copy (l.127): `badged, 2 red xp tokens, 1 blue skill token`;
  - Assumed list (l.186): counts `blue xp tokens` … `pending green`, `training xp`, `blue/red/green skill tokens`.
- **Probe:** every test and browser line above passes with these.
- **Cost if wrong:** about 15 failing assertions.

**R4 — Low (Task 3). Status and helper wording.**
- The Brainstorm status is `` `seat: ${S} — brainstorm — Your turn — ${hint('brainstorm')}` ``. An interrupting phase names itself, as the research and sourcing pins at `:137`/`:611` show.
- `inOrder(…)` returns cards. "Names" means `.map((c) => parseTextFaceKey(c.faceKey)!.name)`.
- Back on S's tab is `tab(`${S} — to act`)` while S acts.
- The milestone row's def is `table!.tableDef.zones.find((z) => z.id === 'milestone-row')`. "Lies below" means a larger `transform.y`.
- **Probe:** all 5 page tests pass.

**R5 — Low (Task 2). TDD wording, one missing case, and Task 4's commands.**
- "(guard) `pressFlags(SHOWN)` is `[]`" is a new test that fails at Step 2 (TypeError). The guard is the existing "the four games (guard)".
- Write `PERCH_GAME` in Step 1, below `SORT_GAME` (TDZ), so the fixture test passes at Step 2. The Step 2 state is then 10 fail (11 with R1's test): 7 (8) worked-view, 2 Startup and the pin.
- Add the `{cardgroup}` case: SORT_GAME with `      The cards on it that are eager gain 1 red mark.` in place of the eager line gives `['helping','eager']`. YARD's `clinging` is a `{cardflag}` argument, not a group test.
- `readsOnlyCards(game, name, seen = new Set(), holder = false)`.
- **Task 4 Step 4:** `BASE=a28e52a`, Task 1's commit `bbe5c92`, `BASE2=2a6147d`, or HEAD when Task 2 starts if a 5-2b fix lands first.
  - Run the checks over `bbe5c92^..bbe5c92` and `BASE2..HEAD`.
  - "No rules changed" applies to those ranges only.
  - The starting count is 3637 at `2a6147d`. The probe gives +17, or +18 with R1's test.

**R6 — Medium (Task 4). The browser check as written does not run.**
- **Ruling:**
  - (a) Put the rules in with the textarea's native value setter and one `input` event, then `settle`, and assert `inputValue() === edited`. Playwright's `fill` did not finish within 60 s on the ~200 KB edited rules.
  - (b) Keep 4-3's `page.on('dialog', accept)`. Color Match's sample asks "Replace your current rules?", and without it step 13 stays on Startup.
  - (c) After the edit, the designer reads `241 of 243 examples pass`: "setting up (ruling 25)" and "the Strategy deck holds all 30 cards" fail, as expected after a Setup edit. Don't wait on 243.
  - (d) `at()`: `k = box.width / 1600`, `x = box.x + box.width/2 + wx·k`, `y = box.y + box.height/2 + wy·k`.
  - (e) Step 11 checks the names against the playtest area's `innerText` (`Undo` → `xpath=../..`), not `document.body`. The Examples panel names Training cards, which gave a false hit on a drawn Agile Workshop.
  - (f) On the squeezed ops team (07) and the hanging team (05), a corner label is cut off by the next card. Read the label text from `board-p0` (and the hover line); the screenshot shows the label's start.
  - Slot order is 05's picks `SW, HW, QA, Veteran`. The ops team after Launch is `Senior PM, SW, HW, QA, Veteran`, so `rowCard(ops team p0, 2, 5, BOARD)` is the HW Eng.
- **Probe:** `check.log`, 13 steps, `errors: []`.
- **Cost if wrong:** Task 4 stops at Step 2.

**R7 — Low (Task 4 README).**
- 5-1's "**Beyond the card.**" bullet ends "The playtest never shows either on a face." Task 2 makes that false for the card it is on.
- **Ruling:** Task 4 amends that sentence, which is an existing README line, for example: "The playtest never shows a flag read through what its owner has; one read through the card it is on is shown only when a button's `Then:` lines read it, and only to a seat that sees that card."
- The new bullet naming `agile` holds only with R1.

## 5. Gaps (no ruling inside the plan fixes these)
- **Ga — milestone faces break names mid-word.** "Clean Launc|h", "Talent Magne", "First Mover" in `01-top.png` / `07-zoom-band.png`. The face renderer draws a large name for a card with few columns. The plan adds no page code for the Milestones. They can be read by hovering and from the Board line. Park for a later page plan.
- **Gb — greyed reasons from an `Only if one of:` group** read "The card is not a Full Stack Bootcamp or The target card is blue trainable or The target card is red trainable". That has capitals mid-sentence, and it states the condition rather than what is missing. It is in the `title` of a greyed Training target. This comes from 5-1/5-2b's friendly reasons, not from 5-3; it is for 5-2b's final review or a later plan.
- **Gc — carried: 5-2b's G1.** A reshuffle keeps card ids, so a card seen in the public discard can be followed by id into a rival's secret deck or Brainstorm in the scene. The page never shows ids, and Task 3's rival test cannot see this. Plan 6-1.
- **Squeezed rows clip corner labels.** Call 1 accepted this, and the Board line holds the full text. It is not a gap of this plan. It is listed only because R6(f) depends on it.

## 6. Brief edits per task

### Task 2
1. **Top:** re-check the names in §1 rows 1–14 and 21 instead of "re-check 5-1's … 5-2a's …". Note that row 3 differs, and that R1 is the ruling for it.
2. **Files:** add `src/engine/core/lang/library/fact-phrases.ts` (`IT_IS_FLAGGED`), to Modify and to the commit pathspec. In the Interfaces block, add: "`cardOnlyNames` counts a `condition` `it is {cardflag}` as card-only, as `it is not {cardflag}`" (R1).
3. **Step 1:**
   - Write `PERCH_GAME` first, below `SORT_GAME`.
   - Add R1's proud/watched/nosy test and R5's `{cardgroup}` case.
   - Drop "(guard)" from `pressFlags(SHOWN)`.
   - YARD's case is "a flag in an effect's `{cardflag}`".
4. **Step 2 expectation:** 11 fail (8 worked-view, 2 Startup, 1 changed pin). Every existing test passes.
5. **Step 4:** the only existing line that changes is `BOARD_LINE`. The long runs do not grow in time (probe: 23.6 → 23.8 s).

### Task 3
1. **Top:** re-check §1 rows 15–25.
2. **Step 1, fixtures and labels:** use R3's names throughout.
3. **Step 1, the Brainstorm status:** use R4's status and helper wording.
4. **Changed lines (R2):** 4-3's backlog pin, with the title and line 1271 as given.
5. **Step 2 expectation:**
   - "tokens on faces" and "Training" fail, as do both board-text tests.
   - "the strategy hand", "the strategy cleanup" and "graduation" pass already. They are guards, and say so.
6. **Step 4:** the changed test lines are Task 2's `BOARD_LINE` and R2's two lines.

### Task 4
1. **Step 1 probe:**
   - Read the zones in slot order (`zoneCards`).
   - Expected milestone row: `Clean Launch, First Mover Advantage, Talent Magnet`.
   - Expected bench: `Junior Software Dev, Junior Hardware Eng, Junior QA Tester, Veteran`.
   - The designer then shows `241 of 243 examples pass` (R6c).
2. **Step 2:** R6 (a)–(f). Its labels use R3's names.
3. **Step 3 README:** R7, and the `agile` bullet with R1.
4. **Step 4:**
   - `BASE=a28e52a`, Task 1's commit `bbe5c92`, `BASE2=2a6147d` (or HEAD when Task 2 starts).
   - Run the checks over `bbe5c92^..bbe5c92` and `BASE2..HEAD`.
   - The starting count is 3637.
   - The last check prints Task 2's `BOARD_LINE` and R2's two lines.
   - `fact-phrases.ts` appears in the core diff (R1). It adds no banned word.

### Plan text (controller)
- l.40 and l.127: R3.
- l.186: R3, the counts after P2's rename.
- l.187: `agile` is worked, but it is not card-only without R1.
