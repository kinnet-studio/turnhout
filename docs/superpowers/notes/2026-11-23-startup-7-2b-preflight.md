# Pre-flight report: plan 7-2b (Startup Simulator slice 7, "Equity moved")

Plan: `/home/user/turnhout/docs/superpowers/plans/2026-10-16-startup-slice-7-2b-rules-and-runs-equity-moved.md`, 846 lines. Line numbers below are the plan's.

Probe:
- Clone: `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf72b2/probe`, branch `pf72b`, HEAD `9086274`, clean.
- BASE is tag `BASE` (`5728c59`).
- The cut is on branch `cut-replay` (`4124947`), in worktree `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf72b2/cut`.
- Logs: `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf72b2/logs`. Scripts: `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf72b2/scripts`.
- **The real repo.** No tracked file was touched. One file outside git was. The probe's `node_modules` is a symlink to the real repo's, so my first vitest runs updated vitest's run-order cache at `/home/user/turnhout/node_modules/.vite/vitest/<hash>/results.json`. That file is gitignored, and the implementers' own runs write it too. Every run after that used `--no-cache`.

## Summary

**Blockers.** As written, Task 1 can't pass its own Step 4:
- typecheck fails (R2);
- every long run stalls at the first round step (R1).

Both have exact amendments below, so nothing is out of the plan's reach. Three rulings are needed:
- **R9:** when the auto-player vetoes. The plan's cadence breaks 11 earlier keys, and the spec says "The auto-player passes".
- **R21:** the 4-player replay that 7-2a's R29(a) dropped.
- **R23:** timing, which goes over 7-2a's 30 s line.

**Findings.** 24 in all: 21 fix-in-plan and 3 ruling-needed.

**Tests.**
- **Full suite:** 4029 at BASE and 4031 at the end. The +2 are new `it()`s: the slice-7 moving-Equity tally and the 4-player replay. All pass and typecheck is clean.
- **Startup file:** 114 tests at BASE, 116 at the end, 115 on the cut branch.
- **Startup examples:** N₉ = 331 at BASE and 346 at the end. Per task that is +5, +12 and +15 cumulative, as l.332 and l.609 say. The designer page's count is 346.
- **Other games** pass on their own, and Rent Day still has 108 examples.
- **Global checks:** 1–3 print nothing. Check 4 prints only the count lines and Task 3's File-button pins (R18).
- **Removal probe** over the 167 rules lines of 7-2a and 7-2b, with the amendments in: 124 pinned by examples, 43 refused by diagnostics, 0 survivors. As written, 7 lines survive (R5, R13).

**Timing.** This is the vitest `tests` figure for `src/games/startup-simulator.test.ts`, best of 3, alternating, under `nice -n 19`:

| Set | BASE | End | Change | `cut-replay` |
|---|---|---|---|---|
| Set 1 | 31.72 s | 36.55 s | +4.83 s, ×1.152 | — |
| Set 2 | 28.89 s | 33.31 s | +4.42 s, ×1.153 | 29.48 s (+0.59 s, ×1.020) |

- **Projection.** I scaled against ≈24 s quiet before 7-2a, plus 5.4 s for 7-2a, so ≈29.4 s at BASE.
  - The end projects to ≈33.9 s, over 7-2a's 30 s line.
  - The cut projects to ≈30.0 s, right on it.
- **The plan's own rule.** l.98's "more than a third longer" is not hit: the file is +15%.
- **Where the time goes.**
  - The 4-player replay costs ≈3.8 s of the +4.4 s.
  - The other ≈0.6 s is the windows' extra presses in the long runs, a cost the spec accepts (l.61).

## Results table

"S+D" means `src/games` plus `src/pages/designer` (21 files).

| Commit | What | Passing |
|---|---|---|
| BASE `5728c59` | full suite | 4029/4029 (122 files), typecheck clean |
| T1 `df90859` as written | Startup + designer page | 121/145, typecheck fails (TS6133 `ANSWERS`, R2). Failures: every long run and test that plays a game, which stall (R1); the waiting-view check (R6); 3 examples, the Launch, Pivot and example 5 (R3, R4); the designer page's example test |
| A-T1 `48eb994`, `2230cb5` | S+D | 592/592 |
| T2 `e7b4208` as written | S+D | 581/592. Failures: "the Board after p1's sell back … sits on no card with a colour" (R5); "Crunch Time's Bugs after p0's sell a card …" (R11); 6 tallies; the 2-player replay; the reshuffle test at "+0 to be 1" (R12) |
| A-T2 `e9851f4` | S+D | 592/592 |
| T3 `08f87ba` as written | S+D | 570/592. Failures: 4 long runs on the sued token's colours (R5) and Crunch Time after a filing (R15); 6 tallies, the replay and the reshuffle test (R19); 4 playtest-fitted layout pins (R16); 2 File-button pins (R18); 3 view tests on `buyout due` (R17) |
| A-T3 `47a0e20`, `298b69d` | S+D | 592/592 |
| T4 `e19493b` as written | Startup file | 114/116. Failures: the new tally test, which never sees two window keys or "a last action vetoed" (R20, R4); the 4-player replay, at `{"vetoes":4,"sales back":0,"suits":1}` (R21) |
| A-T4 `9fd08c8`, `9086274` | full suite | 4031/4031, typecheck clean |
| `cut-replay` `4124947` | Startup file | 115/115 |

## Findings

### R1 (fix-in-plan) — T1: `playTurn` and `turnOf` read `TURN_OF_KEY`, which is unset in round steps and the final check, so every game stalls

**Evidence.**
- As written, every long run fails with "2 players, seed 1: the result after 6 turns: expected undefined to be defined", and the same at 3, 4 and 5 players. Every other test that plays a game fails with them.
- `TURN_OF_KEY` is set only inside a seat's turn. In a round's steps and in the final check it is absent, so `going` is false at once.
- l.304's "The long runs pass with windows opening once a seat holds Equity" is false as written. It holds once R1, R7 and R8 land.

**Amendment.**
- l.177: replace the doc comment with: "/** The seat whose turn it is (`TURN_OF_KEY`, or `turn.current` where no turn is under way: a round's steps and the final check), and the phase its turn stands in: `waitingOf(state).back.phase` during a window; the interrupted phase during an offer (Task 2) or a lawsuit (Task 3), but not during research, a brainstorm, graduation or sourcing, which also set `INTERRUPTED_KEY` and are the turn's own phases; else `turn.phase`. */"
- l.192: "It goes on while `turnOf(state).seat` is `by`, not while `turn.current` is."

### R2 (fix-in-plan) — T1: `ANSWERS` is declared and never read

**Evidence.** `bun run typecheck` reports `src/games/startup-simulator.test.ts(276,7): error TS6133: 'ANSWERS' is declared but its value is never read.` l.165–166 declare it, and nothing in Task 1 reads it.

**Amendment.**
- l.190: "**`turnsIn`.** `playGame` adds to the skipped set the log index of each move whose type is in `ANSWERS`, so turns are still runs of the actor's moves."
- l.334: delete the line. `ANSWERS` gains the offer answers (l.329), which covers it.

### R3 (fix-in-plan) — T1: two of 7-2a's examples now open a window, and the plan doesn't name them

**Evidence.** As written:
- "a Launch moves the Founder's staff to the ops team …" fails with "Expected p0's operations to have a Dating App, but it is empty."
- "a Pivot sends the Founder's staff to the bench …" fails with "Expected the open idea pool to have a Dating App, but it is empty."

A Launch and a Pivot cost AP, and p1–p3 hold p0's Equity, so both now wait in the veto phase.

**Amendment.** In Task 1 Step 3, after l.301, add an "Existing examples that change" bullet:
- In 'a Launch moves the Founder's staff to the ops team and leaves the Investor's Consultant on the product (section 6, section 17, the slice's R1)', after `  When p0 launches the Dating App` add `  And p1 lets the action go ahead`.
- In 'a Pivot sends the Founder's staff to the bench and the Investors' Consultants back to them, unplaced and with no colour (…)', after `  When p0 pivots the Dating App` add these three lines:
  ```
    And p1 lets the action go ahead
    And p2 lets the action go ahead
    And p3 lets the action go ahead
  ```

### R4 (fix-in-plan) — T1 and T4: after a vetoed last action the turn waits at 0 actions for End; the Engine doesn't run

**Evidence.**
- Example 5 fails with "Expected it to be p1's turn, but it is p0's turn."
- 7-1's retune holds the actions phase at 0 actions until `end their actions`, and the Engine runs only after that.
- So Task 4's "a last action vetoed" key, keyed on `ranTheEngine` (l.757), is never seen.

**Amendment.**
- **l.110:** "Expected: its AP is spent and nothing else happens. The turn then goes on exactly as after any last action: at 0 actions the Founder can only end their actions, and then the Engine, the cleanups and the next seat follow."
- **l.189:** delete the second sentence ("A move that closes a window on the actor's last action runs the Engine …"). Put in its place: "No window move runs the Engine: after a last action, vetoed or let go ahead, the turn waits at 0 actions for `end their actions` (7-1's retune)."
- **l.282:** retitle example 5 to `Example: a Veto of the Founder's last action still spends it, so they can only end their actions, and a Consultant burned in a Veto leaves its product (section 17, the overview's call)`.
- **l.290–291:** replace with:
  ```
    Then the phase is actions
    And it is p0's turn
    And p0 has 0 actions
    When p0 ends their actions
    Then it is p1's turn
  ```
  R5 adds the colour lines to this example.
- **l.300:** "**Example 5:** the Founder's last action is spent, so at 0 actions they can only end their actions, and the Engine runs after that. The burned Consultant no longer sits on the Dating App, which gets no cube (§17.B.4), and keeps none of its colours."
- **l.757:** "`a last action vetoed`, for a `VETO` after which the actor has 0 actions (`counterOf(after, 'actions', waiting.by) === 0`);"

### R5 (fix-in-plan) — T1, T2 and T3: a token that leaves a card keeps its colour flags

**Evidence.**
- 7-2a's invariant fires in the long runs:
  - at T1, "the Board after p1's veto with a card in their portfolio c147: … c147 (Equity) in equity-p0 sits on no card with a colour";
  - at T2, the same after `sell back`;
  - at T3, the same after `sue`, three times.
- Nothing in the plan clears `blue/red/qa consultant` when the Veto, `sell back`, `take` or `sue` moves a placed token. `take … to a card` has its own clearing lines (l.396–414), and that is the only path that does.
- Once the lines were added with only `blue` arranged, the removal probe left `It is not red consultant.` and `It is not qa consultant.` surviving. So each example below arranges all three colours.

**Amendment, rules.** Add these three lines, at the Then's indentation, before the move line in four places:
```
      It is not blue consultant.
      It is not red consultant.
      It is not qa consultant.
```
- the Veto, between l.219 `    Then:` and l.220 `      Move it to its founder's equity.`;
- `sell back`, between l.385 `      It is not offered.` and l.386 `      Move it to its founder's equity.`;
- `take`, between l.393 `      It is not offered.` and l.394 `      Move it to their portfolio.`;
- `sue`, between l.665 `      They pay its founder's buyout due to its owner.` and l.666 `      Move it to their equity.`

**Amendment, examples.**
- **T1 example 5:**
  - after l.287 add `  And the Equity whose founder is p0 in p1's portfolio is red consultant` and `  And the Equity whose founder is p0 in p1's portfolio is qa consultant`;
  - after l.294 add the three lines `  And the Equity whose founder is p0 in p0's equity is not blue consultant`, then `… is not red consultant` and `… is not qa consultant`.
- **T2 example 1:**
  - after l.428 add:
    ```
      And the Equity whose founder is p0 in p1's portfolio is on the Neobank in p0's operations
      And the Equity whose founder is p0 in p1's portfolio is blue consultant
      And the Equity whose founder is p0 in p1's portfolio is red consultant
      And the Equity whose founder is p0 in p1's portfolio is qa consultant
    ```
  - after l.442 add:
    ```
      And the Equity whose founder is p0 in p0's equity is on no card
      And the Equity whose founder is p0 in p0's equity is not blue consultant
      And the Equity whose founder is p0 in p0's equity is not red consultant
      And the Equity whose founder is p0 in p0's equity is not qa consultant
    ```
- **T2 example 3:** after l.472 add the same four "in p1's portfolio" lines. After l.484 add the four "on no card / not … consultant" lines, reading `in p2's portfolio`.
- **T3 example 1:**
  - after l.677 add `  And p0's operations has a Neobank`;
  - after l.678 add the four "in p1's portfolio" lines;
  - after l.688 add the four "in p0's equity" lines.
- **Pins:**
  - l.301: "1 … and, with 5, the Veto's three clearing lines";
  - l.569: "`sell back`'s lines, its three clearing lines included";
  - l.571: "the sale's lines and `take`'s lines, its clearing lines included";
  - l.728: "… the lawsuit's lines, its three clearing lines included".

### R6 (fix-in-plan) — T1: the waiting-view check flags words that name a card's kind

**Evidence.** As written: "cards p3's waiting view gives away 4 players, seed 1: c149 (Junior QA Tester) in bench-p0, c150 … bench-p1, c151 … bench-p2". The label "recruits a junior QA tester" names a kind of card that also sits in other seats' hidden benches. The bare `text.includes(c.id)` also matches `c1` inside `c147`.

**Amendment.** l.202, replace the last sentence with: "The `JSON.stringify` of it holds no card id as a quoted string (`"c12"`), and each card the press picked (`subject.card` or `subject.cards`, and `subject.onto`) from a zone that seat can't see shows as `a face-down card` in its `waiting.cards`. A label may name a card's kind."

### R7 (fix-in-plan) — T1: `keepsTheRules`' per-seat limits must read `turnOf(after)`

**Evidence.** "backlog-p1 after p2's let the action go ahead: expected 4 to be less than or equal to 3". The limits took `after.turn.current` (p2, the seat answering) as the seat whose turn it is. So p1, mid-turn, was held to the out-of-turn backlog limit.

**Amendment.** After l.187, add: "`keepsTheRules`' per-seat limits read the seat and phase from `turnOf(after)`, not `after.turn`: a seat answering a window holds only what it holds outside its turn." R1's text for l.177 already limits the interrupted phase to offer and lawsuit.

### R8 (fix-in-plan) — T1: two existing consumers of raw moves aren't named among those that judge moves

**Evidence.** As written:
- the Board tally reads `{"launches":0,"products earning":0,"pivots":5,"let-gos":0,"market share":0}`;
- "Launches that raised XP" is 0.

`keepingForReplay` counts raw moves, and the opener of a window does nothing. Plan 6-1 Task 6's reshuffle test reads raw Brainstorms, and a Brainstorm that opens a window draws only as it goes ahead.

**Amendment.** l.188, add: "`keepingForReplay` builds its own `windowJudge()` and counts the judged press, skipping `cost`. Plan 6-1 Task 6's reshuffle test ('leaves no id a seat saw face up in the strategy discard …, at 2 players seed 2') judges moves the same way."

### R9 (ruling-needed) — T1: the veto cadence breaks earlier slices' paths, and the spec says the auto-player passes

**Evidence.**
- With l.193–194's `(t + w) % 7 === 3` from turn 1, a Veto burns a token and spends an AP early, which rewires every later move.
- Against BASE, 11 required keys fall under 2 of 20 games:
  - 3 fall to 0: 'a Consultant sent back by a Pivot' 3→0, 'a Consultant's Bug at the Engine' 6→0, 'the hard cap refused an Invest' 3→0;
  - 8 fall to 1: 'a Consultant's bandwidth at an Income' 15→1, 'a License waived between Partners' 14→1, 'a Sales Rep's XP bonus', 'a Tier 2 or 3 card launched', 'a dividend of $2', 'a license paid to a chosen provider', 'a milestone claimed: Platform Power', 'an Attribute played: Visionary'.
- In the suite:
  - the slice-7 held tally fails (the hard cap refused, 0);
  - 2 players seed 2 loses its Strategy reshuffle ("expected +0 to be 1");
  - the 2-player replay fails.
- I tried four other cadences:

  | Cadence | Keys under 2 games |
  |---|---|
  | only on last actions | 8 |
  | rarer | 9 |
  | last round, last actions | 1 |
  | last round | 0 |

- The spec (`docs/superpowers/specs/2026-10-16-startup-slice-7-equity-design.md` l.59–61) says "The auto-player passes". That conflicts with l.193–194 and with Task 4's veto keys (l.756–758, l.765).

**Options.**
- **(a), built.** Vetoes wait for the last round, `lastRound() && (t + w) % 7 === 3`; the slice's R2 sale veto stays unconditional. At the end: 'an action vetoed' in 9 games, 'a last action vetoed' 5, 'a Consultant burned in a Veto' 8, 'a Secondary Trade vetoed by its token's Founder' 2. Every earlier key is at 2 or more.
  - Amendment: l.194: "in the last round (`lastRound()`), it vetoes with the first card of its portfolio whose `founder` is the actor when `(t + w) % 7 === 3`, where `w` counts the windows opened so far in this turn. A Veto changes the game from there on, so vetoes wait for the last round." Also amend the spec's l.60–61 to match.
- **(b)** Follow the spec: pass always, except the slice's R2 case. Drop 'an action vetoed' (other than R2), 'a last action vetoed' and 'a Consultant burned in a Veto' from l.765, pinned by T1 examples 1 and 5. Not measured.

### R10 (fix-in-plan) — T1: the 3-player seed 1 undo test's length moves 52 → 57

**Evidence.** "expected […] to have a length of 52 but got 57". The first recruit now opens windows.

**Amendment.** l.183–184, add a pin: "'takes back every move with undo, and rebuilds the game from its log, through recruits and research (3 players, seed 1)': 52 → 57 in its comment and both `toHaveLength`s." It stays 57 through T4.

### R11 (fix-in-plan) — T1 and T2: `ranTheEngine` and `passedTurn` must read `turnOf` on both sides

**Evidence.**
- At T2: "Crunch Time's Bugs after p0's sell a card in their portfolio c153: c32 (Dev Tools) has 0 bugs, not 1", and the same after "buy back … c156".
- A press that hands the offer phase to another seat leaves `after.turn.current` at the buyer. As written (`turnOf(before)` only), the check reads that as the actor's turn passing.
- `atTheEngine` reads no seat or phase.

**Amendment.** l.189, first sentence: "**`ranTheEngine` and `passedTurn`** read the seat and phase from `turnOf` on both sides (`before` and `after`), not `turn`: handing an offer on, or answering a window or an offer, passes no turn and runs no Engine. `atTheEngine` stays as it is."

### R12 (fix-in-plan) — T2: Buybacks at 2 players reshuffle the 2-player paths

**Evidence.** At T2 as written, plan 6-1's reshuffle test at 2 players seed 2 fails with "expected +0 to be 1", and the 2-player replay loses its counts. A Buyback early in 2 players seed 2 removes the Strategy reshuffle.

**Amendment.** l.348: "**`buyingBack()`**, planned when `(t + a) % 9 === 6` at 3 or more players: buy back the first own token held by another seat whose price leaves the seat 2 or more capital (any capital at 4 or more players, R21)."

### R13 (fix-in-plan) — T2: five offer-phase lines survive the removal probe

**Evidence.** T2's removal probe as written:
- `Only if it is offered.` ×3 (`sell back`, `take`, `take … to a card`);
- `take … to a card`'s `Only if they have at least its founder's share price in capital.`;
- its `It is not offered.`

**Amendment.**
- **Example 2:** replace l.457 with:
  ```
    And p1 sells back the Equity whose founder is p2
    Then it is rejected because "it is offered"
    When p1 declines the offer
  ```
- **Example 5:**
  - after l.507 add `  And p0's development has a Dating App`;
  - replace l.508 and l.517 with `  And p1's portfolio has an Equity whose founder is p0 and an Equity whose founder is p2`;
  - replace l.511 with:
    ```
      And p2 takes the Equity whose founder is p2
      Then it is rejected because "it is offered"
      When p2 takes the Equity whose founder is p0
    ```
  - after l.512 add:
    ```
      When p2 takes the Equity whose founder is p0 to the Dating App, choosing blue
      Then it is rejected because "they have at least its founder's share price in capital"
    ```
- **Example 7:**
  - after l.539 add:
    ```
      When p3 takes the Equity whose founder is p2 to the Dating App, choosing red
      Then it is rejected because "it is offered"
    ```
  - after l.550 add `  And the Equity whose founder is p1 in p3's portfolio is not offered`.
- **Pins:**
  - l.570: "2: the Buyback's two guards, `sell back`'s `offered` guard and `decline the offer`'s two lines";
  - l.572: "5: `take`'s `offered` and capital guards, and `take … to a card …`'s capital guard";
  - l.574: "7: `take … to a card …`'s target and `offered` guards, placement, `It is not offered.`, clearing lines and options."

### R14 (fix-in-plan) — T2: buyers are named with `, paying`; 7-1 gave examples `, choosing pN`

**Evidence.** Both parse. `compile-example.ts` l.12–14 reads players after `, choosing` when there is no `, paying` (7-1's R21). So the Gap at l.844 is stale.

**Amendment.**
- l.535, l.541 and l.543: `, paying p3/p1/p2` → `, choosing p3/p1/p2`.
- l.567: "Each buyer is named with `, choosing …`, the words examples have for a player chosen."
- Delete l.844.

### R15 (fix-in-plan) — T3: `turnOf` must read the interrupted phase in `lawsuit` too

**Evidence.** "Crunch Time's Bugs after p0's file a card in their strategy hand …: c41 (Viral Video App) has 0 bugs, not 1". Filing moves the game to `lawsuit`, which reads as leaving the actions phase.

**Amendment.** l.610, add: "`turnOf` reads the interrupted phase during `lawsuit` as during `offer`." This is already in R1's text for l.177.

### R16 (fix-in-plan) — T3: the court after the event discard pushes the center onto a fourth line

**Evidence.** As written, four playtest-fitted tests fail, and one would need its title renamed:
- the canvas goes 1200×1380 → 1200×1518, and the world ±920 → ±1012;
- every Board y moves +92: bench 830→922, scouting 650→742, development −266→−178, milestones 192→280, development team −90→−2.

The failing tests are:
- 'is 1200 × 1380 for a game too big for one table …';
- 'hangs the development team under the development …';
- 'keeps the private rows in the strip along the bottom …';
- 'puts the Board in two lines …'.

After the growth deck, the court fits on line 1 and nothing moves.

**Amendment.**
- l.625: "**Table.** After `  The growth deck is a pile in the center that no one can see.` add `  The court is a pile in the center that everyone can see.`"
- l.612: "after `['growth-deck', false, 'pile', 'secret']` add `['court', false, 'pile', 'public']`."

### R17 (fix-in-plan) — T3: `buyout due` is a shown value, and three tests pin the shown values

**Evidence.** `shownPlayerValues` (`worked-view.ts:278`) shows a player value whose every line totals public zones, and the court is public. The failures read "expected ['blue supply', … (8)] to deeply equal [… (7)]" in two tests, plus the 5-1 guard test.

**Amendment.** l.611, add: "Three tests pin the shown values; add `'buyout due'` after `'qa spent'` in their lists, and `'buyout due': 0` in both value sets:
- 'shows the values that add up cards everyone sees …';
- 'gives every seat the same values of each player … (3 players, seed 1)';
- '(guard) shows the same flags beside a value … (Call 5)'."

Whether the page should show it goes to 7-3 (Gaps).

### R18 (fix-in-plan) — T3: the File button joins the Strategy-card button pins

**Evidence.** 'Review Focus: plays Training onto a card …' and 'Review Focus: labels an Attribute and Hype …' fail on one extra row. l.595 allows these pins, but the plan doesn't give them.

**Amendment.** In Step 1, add: "playtest-fitted: `const FILE = 'File a card in your strategy hand'`, and the row `[FILE, 'it is a Non-Compete Suit card']` in both tests."

### R19 (fix-in-plan) — T3: Suits at 2 players reshuffle the 2-player paths

**Evidence.** At T3, the reshuffle test fails at "+0 vs 1". The 2-player replay sees 0 reshuffles and 0 Consultant pivots.

**Amendment.** l.620: "**`suing()`**, … at 3 or more players: when its strategy hand holds …"

### R20 (fix-in-plan) — T4: the window keys count the opener, which the runs never judge

**Evidence.** At T4 as written, the tally fails with "a window asked one holder", "a window asked two or more holders" and "a last action vetoed" never seen. l.186 says happenings see nothing for `cost`, and l.755 keys on the opener.

**Amendment.** l.755: "`a window asked one holder` and `a window asked two or more holders`, for the move that closes one (a `VETO` or the closing let-go), by `waitingOf(before).asked.length`;"

### R21 (ruling-needed) — T4: the 4-player replay comes back, and it needs a 4-player Buyback

**Evidence.**
- 7-2a's amended plan (l.91) dropped the 4-player replay under R29(a). l.766–770 bring it back.
- As written it fails with `{"vetoes":4,"sales back":0,"suits":1}`: at 4–5 players no seat buys back with $2 to spare.
- It costs ≈3.2 s alone, ≈3.8 s of the file's best time.
- Buybacks at 4+ seats with any capital give 4 Buybacks accepted and 4 declined. That also lifts 'a Buyback declined' and 'hire some cards from their scouting to a card in their operations' from 1 game back to 2+, so the R12 amendment's "(any capital at 4 or more players)" stays under either option.

**Options.**
- **(a)** Keep l.766–770 as written plus R12's text. The end lands at ≈33.9 s projected.
- **(b), built on `cut-replay` `4124947`.** Replace l.766–770 with: "Extend the 3-player replay test ('… (3 players, seeds 1 to 5)'): across its logs some log holds a `VETO`, a `SELL_BACK` and a `SUE`, counted through `keepingForReplay`; and for the first move made while a window is open, `engine.undo()` gives the state before it, its `waitingOf` equal to the stored one. The 2-player replay leaves those three counts to it." The file is then at ≈30.0 s projected.

### R22 (fix-in-plan) — T2 and T4: four keys fall to one game once trades reshuffle the 3+ player games

**Evidence.** Holds at the end, with 14 cadence variants tried:
- `take a card in another player's portfolio`: 1 game (3p5);
- 'a Tier 2 or 3 card launched': 1 (2p4);
- 'a milestone claimed: Platform Power': 1 (2p2);
- 'a license paid to a chosen provider': 1 (4p4).

The last three fell at T2. Trades only in the last round keep them, but then no game holds a trade path. Every other required key is at 2 or more.

**Amendment.** After l.779, add: "Add to `HELD_BY_FEWER_THAN_TWO`, with a comment naming each pin:
- `"take a card in another player's portfolio"`, pinned by 'a Secondary Trade sells a token to a third player at its Founder's Share Price, …';
- 'a Tier 2 or 3 card launched' and 'a milestone claimed: Platform Power', pinned by 'claims First Mover Advantage, Platform Power and Full Stack Founder at one auto-player Launch of a Tier 2 card, …';
- 'a license paid to a chosen provider', pinned by 'the player chooses whom to pay when several provide the Tag (section 6, ruling 25)'."

### R23 (ruling-needed) — timing: the end is over 7-2a's 30 s line

**Evidence.** See the Summary's table. The end is ×1.153 of BASE, ≈33.3 s measured and ≈33.9 s projected. 7-2a's amended plan (l.92–94) set the 30 s line. The plan's l.98 rule (a third) is not hit.

**Ruling.** Choose between:
- R21(b), which brings the end to ≈30.0 s, at the line;
- R21(b) plus a speed-up mini plan for another ≈0.5–1 s of margin;
- accepting ≈33.9 s.

Either way, add to l.98: "and if the Startup file's best is over 30 s (7-2a's line)".

### R24 (fix-in-plan, minor) — T4: two wordings go stale

**Evidence.**
- With Secondary Trades in, the README's "It still leaves out selling and poaching" (README l.151) reads as if equity sales were still out.
- l.771 says the 2-player seed 2 view test now runs through offers. After R12, R19 and the rule that a trade needs a third player, it holds windows but no offers.

**Amendment.**
- l.786: add "and 'selling and poaching' becomes 'selling products (Divest) and poaching'".
- l.771: "(now through windows, answered by the other seat; offers and lawsuits come at 3 or more players)".

## Gaps (with homes)

- **The clearing lines are repeated.** There are now seven copies: 7-2a's Invest and Round Start placements, plus the Veto, `sell back`, `take`, `take … to a card` and `sue`. l.845's "a third copy" understates it; amend it to "seven copies in all (R5)". Home: a language phrase that clears a card's flags as it leaves a card (7-2a's Gaps, a later language plan).
- **`buyout due` is a per-player value over a shared pile.** It shows on every panel, at 0 outside a lawsuit. Home: 7-3's view.
- **The File button is greyed on every Strategy card but the Suit** ("it is a Non-Compete Suit card"). Home: 7-3's page.
- **A plain `take` comes in one game only,** because buyers are short of cash. Home: a later retune.
- **2-player games hold no Buyback, trade or Suit.** For trades that is the rule; for Buybacks and Suits it is the auto-player (R12, R19). Examples pin them. Home: a later retune, if wanted.
- **Two keys sit at exactly 2 games** ('a window asked two or more holders' and 'a Secondary Trade vetoed by its token's Founder', 3p5 and 4p2), so they are fragile. Home: the next retune.

## Forward notes for 7-3

- **The court** sits on the center's first line, after the growth deck (R16), and it is empty except during a lawsuit.
- **`buyout due` shows on every player's panel** (R17). 7-3 rules whether to show it.
- **The File button** shows greyed on every Strategy card (R18).
- **After a vetoed last action** the page must offer End at 0 actions (R4).
- **The seat switcher** must follow the veto and offer phases to the answering seat (`turn.current`) while the turn stays the actor's. The lawsuit stays with the filer.
- **Waiting labels** may name a card's kind; a picked card from a zone the viewer can't see shows face down (R6).
- **Starting budget:** 7-3 starts from ≈33.9 s, or ≈30.0 s with the cut (R21, R23).

## Checked and clean

- **Suite and checks.** Full suite 4031/4031 and typecheck clean at the end. Global checks 1–3 print nothing, and check 4 prints only the counts and the File pins.
- **Numbers match the rulebook** (§6, §13.A, §17.B–C, §20.A, §20.D 1, rulings 22 and 25):
  - **T1:** example 1, 7 capital; example 3, 7 − 2 = 5.
  - **T2:**
    - example 1: 10 − 10 = 0 and 17;
    - example 3: 0, 17 and 7, with no Venture Capital Rain bonus;
    - example 7: 7 + 15 = 22, and each buyer 2.
  - **T3:** example 1, 9 − 4 = 5, 5 − 5 = 0 and p1 12; example 2, $8 refused.
- **Equity tokens.** No example has more than 3 tokens per Founder.
- **7-1's window checks** give no diagnostic. The veto phase takes turns and passes on. It has no go-to, After line or cost, and it is neither first nor a step phase. Its clause reads only public portfolios.
- **7-1's recorded limits** (7-1 plan l.1535–1541): none is hit.
  - (1) Only `VETO` changes anything in a window, and it stops the action. `let the action go ahead` touches nothing, and offers and lawsuits are interrupts, not windows. l.846's claim holds.
  - (2) No veto rule takes the game out of the window.
  - (3) There is no tie.
  - (4) Each pick is one card in one zone.
  - (5) Portfolios hold only some cards on other players' cards.
  - (6) No card fact is named "player".
- **The auto-player pressed every window and offer button.**
  - In the window: `VETO` in 9 games; `LET_IT_GO_AHEAD` in all 20 (as 'ahead' in all, as 'own' in 2).
  - In the offer: `SELL_BACK` 4, `TAKE` 1, `TAKE_PLACING` 3, `DECLINE` 12.
  - In the lawsuit: `SUE` 4.
  - New keys:

    | Key | Games |
    |---|---|
    | a window asked one holder | 20 |
    | a window asked two or more holders | 2 |
    | an action vetoed | 9 |
    | a last action vetoed | 5 |
    | a Consultant burned in a Veto | 8 |
    | a Secondary Trade vetoed by its token's Founder | 2 |
    | a Buyback accepted | 4 |
    | a Buyback declined | 4 |
    | a Secondary Trade accepted | 4 |
    | a Secondary Trade declined | 10 |
    | a Consultant placed by a buyer | 3 |
    | a Non-Compete Suit filed | 4 |
    | a token sued back | 4 |
    | a Consultant sued back | 4 |
- **Holds.** Every required key is held by 2+ of 20 games, or excused (R22).
- **Replays.** The waiting-view check passes. Undo of a move in a window restores the window. Replays rebuild whole games at 2, 3 and 4 players.
- **Removal probe** over 167 lines (7-2a and 7-2b): 0 survivors with the amendments.
- **Rent Day** still has 108 examples, and the other games pass.

## The probe's commit list

Branch `pf72b`, from `BASE` (`5728c59`):
- `df90859` T1 (as written)
- `48eb994` A-T1: the runs answer windows (turnOf falls back to the current seat, limits read turnOf, the replay counts and reshuffle test judge moves, ANSWERS skips answers, the view check reads the picked cards); a Veto clears the colours; the two 7-2a examples let actions go ahead; example 5 ends the actions; vetoes wait for the last round; the undo test pins 57
- `2230cb5` A-T1: example 5 burns a token holding all three colours
- `e7b4208` T2 (as written)
- `e9851f4` A-T2: ranTheEngine and passedTurn read turnOf on both sides; sell back and take clear the colours; Buybacks at 3+ players; examples pin every guard, the clearing lines and take-placing's not-offered line; ", choosing"
- `08f87ba` T3 (as written)
- `47a0e20` A-T3: the sued token sheds its colours (example 1 pins it); turnOf reads the lawsuit's interrupted phase; the court on the first center line; buyout due pinned in the view tests; File in the Strategy button pins
- `298b69d` A-T3: Suits at 3+ players
- `e19493b` T4 (as written)
- `9fd08c8` A-T4: windows counted as they close; a last action vetoed keyed on 0 actions
- `9086274` A-T4: Buybacks at 4+ players with any capital; four keys excused with their pins

Side branch `cut-replay`:
- `4124947` CUT: the 4-player replay goes again (7-2a R29(a)); the 3-player replay requires a Veto, a sale back and a suit, and takes back a move made in a window
