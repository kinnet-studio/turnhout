# Pre-flight: plan 6-2a (Attributes and Utility cards)

- **HEAD scanned:** `83ab6f9` on `claude/peaceful-curie-rdfkow` (repo untouched).
- **Inputs:** the plan; the slice 6 spec (R1–R3 win) and the overview spec; `/home/user/suwa/rulebook.md`; `docs/superpowers/notes/2026-10-19-startup-notes-for-6-preflight.md` and the handoff; the 6-1 and retune ledgers; this SDD folder (the task briefs copy the plan's text, so they need re-cutting after the amendments).
- **Probe:** a copy at `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf62a/work`, base commit `702ec9c` (= HEAD). One commit per task as written, then each amendment as its own commit:
  `f5963ac` T1 as planned · `3a64258` T1 cadence (R2) · `9bdd817` T2 · `55040f1` T3 · `bf085a7` T3 amendments · `91ca8c7` T4 · `d4e0224` T4 narrowed invariants · `ba5b507` (scratch test removed) · `04031e4` T4 amendments · `618e38e` T5 · `9af1be8` T5 amendment · `797dc81` T6 as planned · `5ef73ba` T6 3-player memo (R15) · `59dce90` T6 README (R16).
  Logs and probe scripts: `.../pf62a/logs`, `.../pf62a/scripts` (removal probe `zz-removal.test.ts`, tally probe `probe6.py`, tallies `logs/probe-base.json` and `logs/probe-t6.json`).
- **Result with the amendments:** every task's focused tests pass. Full suite at T2/T4/T6 is 3779/3780/3782 (BASE 3777, plus 5 new tests). `tsc --noEmit` is clean at T2, T4 and T6. The only failure left is the slice-6 tally test as written (R13). Examples go 243 → 246, 252, 260, 269, 275. No shared code changes, so there is **no blocker**.

## Findings

**R1 (fix-in-plan) — Assumed list: `scoreOf`'s signature.**
Evidence: test.ts l.1711 `function scoreOf(state: GameState, seat: PlayerId): number`.
Amendment, plan l.104: `` `scoreOf(runtime, state, seat)` `` → `` `scoreOf(state, seat)` ``.

**R2 (fix-in-plan) — Task 1's Buff cadence breaks three existing tests.**
Evidence: with `training()` taking a Buff whenever one fits (`f5963ac`), the focused run fails 3 of 98:
- slice 3's tally: 'the Engineer paid 1 in the ops team' is held by 0 games;
- the 2-player replay test sees `reshuffles` 0;
- 6-1's 'leaves no id … (2 players seed 4)' sees no reshuffle.

The cause: Buffs spend the money and Strategy draws those games relied on. Five required keys fall to 1 game.

Variants probed (`logs/probe-var{A..F}.json`):
- trainfirst: still fails.
- nobuff: passes, but plays no Buff.
- keeptrain: still fails.
- buffcap8: no Workaholic is ever played.
- buffcap5: still fails.
- **buffmod3** (a Buff only when `t % 3 === 0`): 98/98 pass, and all 95 existing keys are held. One key is held by only 1 game (R13).

Amendments:
- Plan l.149 → "`training()` also takes Buff cards, only on a turn where `t % 3 === 0` (a Buff every turn spends the money slice 3's Engineer-in-ops and the reshuffle tests need): the first Training card, or on such a turn Buff card, of its strategy hand that has a target the rules take; a Buff goes on the taken target at `t % n`." The code: `const fits = (card) => (isTraining(card) || (BUFFS.includes(nameOf(card) as string) && t % 3 === 0)) && zones.some(…)`.
- Global Constraints l.67, add: "Seed-pinned tests that the new moves shift change only where a task names them (Task 5: R12)."

**R3 (fix-in-plan) — Task 1's invariants as written refuse legal moves.**
Evidence: the focused run at `f5963ac` before these fixes.

Amendments to Task 1 Step 1 "Invariants":
- (a) Add: the Training-press check (test.ts l.2121 `if (move.type === PLAY_TRAINING) {`, 'the Strategy cards played that are not Training') becomes `if (move.type === PLAY_TRAINING && isTraining(card!)) {`. A Buff goes to the attributes in play, and that check refuses it.
- (b) "conservation also counts the `attributes-in-play` pile and the box" → "… the `attributes-in-play` pile and the box's cards named in `STRATEGY_CARDS` (the box also holds Milestones, ideas and evicted Talents)".
- (c) "exactly when its count is 1 on some card not in the box" → "exactly when its count is 1 on some card (Task 2 narrows this to a card not in the box: until its eviction rule, an evicted Talent keeps its count in the box)". Task 2 Step 1 gains that narrowing.
- (d) Note: happenings' `TRAINING_ON` key (l.1655) and the 'Training that asked a choice or had it filled in' counter (l.1358) also count Buff presses. The T6 probe shows keys such as 'Training: Clean Coder on a Full Stack Ninja' and 'Training: Workaholic on a Junior'. Add `&& isTraining(card!)` to both.

**R4 (fix-in-plan) — the fitted page pin gains the new buttons.**
Evidence: the full suite at T2 fails 'Review Focus: plays Training onto a card in the bench, development team or ops team, and greys a target it doesn't fit' (playtest-fitted l.1574). It fails the same way at T5.

Amendments:
- Task 1 Pins add: playtest-fitted l.1574 `[[PLAY, true], [FLUSH, true]]` → `[[PLAY, true], [DEBUFF, "There is no card in another player's development team or another player's ops team."], [FLUSH, true]]`, with `const DEBUFF = "Play a card from your strategy hand to a card in another player's development team or another player's ops team";`.
- Task 5 Pins add: the list gains, after DEBUFF, `[TO_PRODUCT, 'There is no card in your operations.'], [ALONE, 'it is a Design Sprint card']`, with `const TO_PRODUCT = 'Play a card from your strategy hand to a card in your operations';` and `const ALONE = 'Play a card in your strategy hand';`.

**R5 (fix-in-plan) — Task 2: the box invariant and the press-flag pin.**
Evidence:
- Without (a), the 4-player long run fails at an eviction: `cards new in the box after p3's lay off …: expected ['c112', 'c132'] to deeply equal ['c132']` (test.ts l.2278). It was re-checked at the final commit.
- The T2 focused run fails 'labels Managing, Agile, Coaching, the pending Badge and Attaching, …' (l.4194).

Amendments to Task 2 Step 1:
- (a) Invariants add: l.2277–2278's "only the pools send cards to the box" check also allows cards that were in the attributes in play before the move: `const parkedBoxed = box.filter((id) => !boxed.has(id) && cardById(before, id)?.zoneId === 'attributes-in-play'); sameList(box.filter((id) => !boxed.has(id)).sort(), [...letGoNow, ...parkedBoxed].sort(), …)`, and its comment is rewritten to match.
- (b) Pins add: `pressFlags(game)` → `['managing', 'agile', 'egotistic', 'coaching', 'pending badge', 'attaching']`. The Diva now carries a permanent "egotistic" press label (Gap 1). `Every card on it whose trait is Ego is fired.` is not in the phrase library, so the flag stays.

The removal probe for Task 2 is clean.

**R6 (fix-in-plan) — Task 3's anchors are worded differently at HEAD.**
Evidence: rules l.180 and l.188 read `its working blue xp` / `its working red xp`. HEAD's Leading sections use `It is a card whose badge points are more than 0.` and `It is a card whose blue/red skill tokens are more than 0.`.

Amendments:
- Plan l.521: `its blue xp.` → `its working blue xp.`, and `its red xp.` → `its working red xp.`.
- Plan l.547–573 (the two replacement sections) → "In `Leading software:` and `Leading hardware:`, add `    It is a card whose visionary is more than 0.` as the last line of each of the two `Only if one of:` groups." (The card-whose form is G4, which keeps the leads card-only for the view.)

**R7 (fix-in-plan, serious) — Workaholic as written gives +2 in every colour.**
A worked number that refines no table column starts from 0 (runtime.ts ~l.498–500), so `blue output` is 0 for a hardware card, not nothing. `An overworked card's blue output goes up by 2.` therefore gives a Junior Hardware Eng 2 Blue and a Junior PM 2 in every colour.

Evidence: the plan's own examples fail. Example 1 gets 4 Blue instead of 3. Example 2 gets 6 Blue instead of 2. The plan's `Only if its workaholic is more than 0.` (not G4) also drops the blue/red output stand-ins and all three supplies from the view.

Amendments:
- Architecture l.26: "a card with no output in a colour stays with none (6-1's "nothing so far stays nothing"), which gives …" → "outputs start from 0 (they refine no table column), so the +2 reads per-colour flags that hold only for a card working in that colour (its skill, flex, its declared mode, or a Bug Hunter for QA); this gives …".
- Plan l.521 lines → `  An overworked in blue card's blue output goes up by 2.` / `  An overworked in red card's red output goes up by 2.` / `  An overworked in qa card's qa output goes up by 2.`. The salary line is unchanged and still reads `overworked`; every talent has a salary column, so it is clean.
- Plan l.526–527 → the block below. Add the three flags to Names (l.37) and to the values test.

```text
Overworked:
  Only if it is a card whose workaholic is more than 0.

Overworked in blue:
  Only if it is overworked.
  Only if one of:
    It is a software card.
    It is a flex card.
    It is blue mode.

Overworked in red:
  Only if it is overworked.
  Only if one of:
    It is a hardware card.
    It is red mode.

Overworked in qa:
  Only if it is overworked.
  Only if one of:
    It is a qa card.
    It is qa mode.
    It is a Bug Hunter card.
```

- Plan l.514 pins: "`shownFlags(game)` gains `'overworked'`" → "gains `'overworked'`, `'overworked in blue'`, `'overworked in red'`, `'overworked in qa'` (first, before `'stalled'`), at both pins (test.ts l.4121 and l.4200); `standIns` is unchanged".

With these, examples 1–2 pass and the view keeps its stand-ins and supplies.

**R8 (fix-in-plan) — Task 3: two visionary lines and the mode lines are unpinned.**
Evidence (`logs/rm-t3*.out`):
- With example 6's lone Junior Hardware Eng, Leading hardware's skill-group visionary line survives the removal probe.
- R7's mode alternatives (flex, blue mode, red mode, qa mode, Bug Hunter) survive.

Amendments:
- Example 6's title → `Example: a Junior with Visionary leads in both colours, so a Tier 2 hybrid with no other lead progresses and Launches (section 20, section 11, section 3)`. Its two staff lines → `  And the Drone Delivery in p0's development has a Junior Software Dev and a Junior Hardware Eng on it` / `  And the Junior Software Dev in p0's development team has 1 visionary`.
- Append example 8:

```text
Example: Workaholic's +2 follows the mode a unit works in: a flex Senior makes Blue unless declared Red, a Junior in Blue mode makes Blue, and the Fixer in QA mode and a QA Engineer clean 2 more Bugs each (section 20, section 11)
  Given the phase is actions
  And p0's development has a Gig Economy, a Genetics Kit and a Dating App
  And the Dating App in p0's development has 6 bugs
  And the Gig Economy in p0's development has a Firmware Specialist and a Junior Hardware Eng on it
  And the Genetics Kit in p0's development has a Full Stack Ninja on it
  And the Dating App in p0's development has the Fixer and a QA Engineer on it
  And the Junior Hardware Eng in p0's development team has 1 blue skill token
  And the Junior Hardware Eng in p0's development team is blue mode
  And the Full Stack Ninja in p0's development team is red mode
  And the Fixer in p0's development team is qa mode
  And the Firmware Specialist in p0's development team has 1 workaholic
  And the Junior Hardware Eng in p0's development team has 1 workaholic
  And the Full Stack Ninja in p0's development team has 1 workaholic
  And the Fixer in p0's development team has 1 workaholic
  And the QA Engineer in p0's development team has 1 workaholic
  When p0 ends their actions
  Then the Gig Economy in p0's development has 7 blue cubes
  And the Genetics Kit in p0's development has 5 red cubes
  And the Genetics Kit in p0's development has 0 blue cubes
  And the Dating App in p0's development has 0 bugs
  And the Dating App in p0's development has 0 blue cubes
```

How the numbers come (§20.A, §20.B):
- The Firmware Specialist is flex, output 2, Blue by default: 2 + 2 = 4. The blue-mode Hardware Junior: 1 + 2 = 3. That makes 7 against the Gig Economy's 8 Blue.
- The red-mode Ninja is flex, output 3: 3 + 2 = 5 Red and 0 Blue on the Genetics Kit (8 Red).
- The Fixer in QA mode cleans 1 + 2 = 3, and the QA Engineer (Bug Hunter, 1) 1 + 2 = 3. That is 6 against 6 Bugs, and 0 Blue.

Lines each example pins:
- 6: both Senior-or-badged visionary lines and Leading hardware's skill-group line.
- 7: Leading software's skill-group line, so it is no longer only a guard.
- 8: Overworked in blue/red/qa's alternatives.

Counts: Task 3 ends at N₆ + 17, Task 4 at + 26, Task 5 at + 32 (260 / 269 / 275). Update l.63 and the Task 3–5 pins. The probe is clean after this (`rm-t3b`, `rm-t3c`).

**R9 (fix-in-plan) — Task 4: write the flags in G4 form; the view pins differ from the plan's prediction.**
Evidence: with the plan's `Its burnout is more than 0.` / `Its toxic personality is more than 0.` / `Its burnout is 0.`, the view loses the blue/red output stand-ins and all three supplies.

Amendments:
- Plan l.728–737: `Burned out:` → `  Only if it is a card whose burnout is more than 0.`; `Giving synergy:`'s second line → `  Only if it is not burned out.`; `Poisoning:`'s first line → `  Only if it is a card whose toxic personality is more than 0.`.
- Plan l.695–696 → "`shownFlags(game)` gains only `'burned out'` (after the overworked flags); `standIns(game)` and `shownPlayerValues(game)` are unchanged (6-1's R5 counts the owner-scope ops-team tests as public)".
- Delete the plan's Gap 1 (it does not arise) and the "(see the Gaps)" pointer at l.684.

**R10 (fix-in-plan) — Task 4: redundant lines, and pins claimed by examples that don't hold.**
Evidence (`logs/rm-t4.out`, then `logs/rm-all.out`):
- `A card's pool blue/red/qa is 0.` survives the probe: numbers start at 0, so the plan's "pinned by 7 and 8 (the Toxic PM's value would stay nothing)" is false.
- The three Pool losing flags' `Only if it is in an ops team.` survive. Pool values are read only through ops-team totals.
- Losing qa's `blue team output is 0` / `red team output is 0` and Pool losing qa's `has a card … qa output` survive every example.

Amendments:
- Drop the three `is 0` lines and the three `in an ops team` lines.
- Add three made-values cases:
  - `onProject('Dating App', [Junior Software Dev, Junior QA Tester], the Tester)` → `[0, 0, 1]`;
  - `onProject('Smart Lock', [Junior Hardware Eng, Junior QA Tester], the Tester)` → `[0, 0, 1]`;
  - `supplies([Junior PM])` with the PM toxic → `[0, 0, 0]`.
- Plan l.928's last sentence → "the `… team output is more than 0` lines of the three Losing flags, Losing qa's two `… team output is 0` lines, and Pool losing qa's three owner lines, by the made-values test above."

Verified at the final commit: each of those 8 lines fails that test when removed alone, and every other line this plan adds fails an example.

**R11 (fix-in-plan, timing) — Task 4's invariants cost about 12 s.**
Evidence: as written (every development card's made values and every seat's supplies, after every move), the long runs take 40.9 s against 28.9 s narrowed.

Amendment, plan l.706–707:
- "every card in a development **with a card holding `toxic personality` on it** has …"
- "every seat **whose ops team holds a card with `toxic personality`** has …"

Only such a team or pool can make less than its team value.

**R12 (fix-in-plan) — Task 5 shifts three existing tests and leaves one line unpinned.**
Evidence: the T5 focused run, and `logs/rm-t5*.out`.

Amendments to Task 5 Step 1:
- (a) The backlog invariant `atMost(own('backlog'), 4)` (test.ts l.1888) → `9`, with the comment "A Design Sprint deals up to 5 past the 4 a turn's research leaves; Cleanup cuts the backlog back to 3 (§20.A, §5 Phase D)."
- (b) The undo test '… through recruits and research (3 players, seed 1)' (l.3337–3345): 52 → 55 in both `toHaveLength` and in the comment, which adds "a Design Sprint and its cleanup came before it from plan 6-2a".
- (c) 'runs the Growth Hacker on a product through its owner’s Engine and its next Income: …': box both Design Sprints with the Architect (`relocate(start, [architect, ...sprints], 'box', game!)`). A dealt Sprint sends the turn through backlog cleanup, whose last discard ends the turn after the Engine's move.
- (d) `shownFlags` gains `'pitched'`, as the plan predicted. Pitching's `Only if it is a Rainmaker card.` survives the probe. In example 1, after `  And p0's operations has a Dating App and a To-Do List` add `  And the Dating App in p0's operations has a Growth Hacker on it`. Verified: the example then fails without the line.

**R13 (fix-in-plan) — Task 6: 7 required keys are never reached, and 5 more are held by 1 game.**
Evidence: `logs/probe-t6.json`, 20 games. Launches are 56, in 19 of 20 games (3p s1 has none); BASE had 60, in 20/20.
- At 0 games: Attributes rehired; Clean Coder stopping the Hacker's Bug; Clean Coder shielding a viral product; Toxic: a Bug left; Toxic in the ops team; Burnout: a PM giving no Synergy; TechCrunch for $2 with a Sales Rep.
- At 1 game:
  - Attributes boxed (4p s4);
  - Workaholic's +2 (5p s2);
  - a Visionary leading (5p s4);
  - Toxic Blue (4p s3);
  - the existing key 'hire some cards from their scouting to their ops team' (5p s3; it was at 3 games, and falls to 1 under every Buff cadence tried except trainfirst and keeptrain, which fail other tests).
- At 2 or more games:

  | Key | Games |
  |---|---|
  | Attribute played: Workaholic | 3 |
  | Attribute played: Clean Coder | 5 |
  | Attribute played: Visionary | 3 |
  | Attribute played: Toxic Personality | 4 |
  | Attribute played: Burnout | 12 |
  | Attribute played: Flight Risk | 14 |
  | Buff on a bench card | 3 |
  | Buff on a Board card | 6 |
  | Debuff on a development team card | 17 |
  | Debuff on an ops team card | 4 |
  | discarded with a fired Talent | 8 |
  | kept through a bench discard | 2 |
  | Toxic Red | 2 |
  | Burnout idle | 8 |
  | TechCrunch $5 | 6 |
  | Hype scored | 3 |
  | Design Sprint dealing 5 | 15 |
  | Design Sprint dealing fewer | 3 |

- A targeted variant (Toxic prefers ops targets, Burnout prefers a managing PM, `HIRE_MARKET` prefers a card holding Attributes) lifts rehired and Toxic-ops to 1 game each, but drops the Engineer key to 1 game.

Amendment, plan Task 6 Step 1, "It expects every key above above 0." → "It requires the 18 keys held by 2 or more games: … (list above). These are counted but not required, and a comment names each one's pin:
- rehired: T2 ex 4;
- boxed: T2 ex 5–6;
- Workaholic's +2: T3 ex 1, 2, 8;
- the Hacker's Bug: T3 ex 3;
- shielding: T3 ex 4–5;
- Visionary leading: T3 ex 6–7;
- Toxic Blue / Bug left: T4 ex 3 / 6;
- Toxic in the ops team: T4 ex 7–9;
- a PM giving no Synergy: T4 ex 2;
- TechCrunch for $2: T5 ex 1, plus an arranged test of `utility()`'s pitched pick, in the shape of 4-2's 'cleans the Bug the auto-player picks …';
- and the scouting hire to the ops team: an arranged test, since no accepted example presses it (rules l.2943 only refuses it)."

**R14 (fix-in-plan) — Task 6: the tally comments' holder lists go stale.**
Evidence: 67 of the 95 required keys change holders between `probe-base.json` and `probe-t6.json`. The comments at test.ts l.3124–3139, l.3160–3170, l.3206–3218 and the slice-5 Strategy comment name seeds and counts. The retune made those exact.

Amendment, Task 6 Step 2, add: "Recount every holder list the tally comments, the replay comment and the 'first seed' comments name from a probe of the final runs. 'Kept as they are' applies to the tests, not their comments."

**R15 (fix-in-plan, timing) — the long runs end 37–45% over BASE.**
Evidence (the Startup file's `tests` figure, interleaved runs):

| Commit | Best | Runs |
|---|---|---|
| BASE | 20.13 s | 20.13–27.62, 9 runs |
| T1 | 21.45 s | best of 2 |
| T2 | 23.99 s | best of 2 |
| T3 | 25.42 s | best of 2 |
| T4, narrowed | 27.27 s | best of 2 |
| T5 | 26.92 s | best of 2 |
| T6 as planned, with R11 | 29.29 s | 29.29–34.20, 6 runs |
| T6 + memo | 27.55 s | 27.55–31.29, 6 runs |

A third over BASE is 26.8 s. Without R11, T6 would be about 41 s.

Amendment, Task 6 Step 1's replay test: "the long run keeps each 3-player game for replay (`keepingForReplay` for `players <= 3`; `twoPlayerGames` becomes `keptGames` keyed `${players} ${seed}`, with `keptGame(players, seed)` and `twoPlayerGame = (seed) => keptGame(2, seed)`); `REPLAYED` adds `'Debuffs'`, `'strips'`, `'TechCrunch Features'`, counted in `keepingForReplay`'s watch; the 3-player test reads `keptGame(3, seed)` instead of replaying". This is commit `5ef73ba`, and it saves about 1.7 s.

The rest of the growth comes from the larger rules text, task by task. Ruling needed: accept about 27.5 s (under the 30 s watch at best of 3), or a speed-up mini plan (see Gaps).

**R16 (note) — README.**
Step 3 leaves "and Hype and Scandal" in "It still leaves out", but Hype now scores. Amendment: add to Step 3 "and 'Hype and Scandal' becomes 'Scandal'". Hype's +$5 sale price comes with selling, which stays on the list.

## Gaps (with homes)

1. **6-3:** the Diva's permanent "egotistic" press label (R5). Decide whether it shows.
2. **6-3:** every Strategy card now shows all four Strategy buttons, three of them greyed with reasons (R4).
3. **6-3:** the new shown flags are `overworked` and its three colour flags, `burned out` and `pitched`; `losing …` is not shown. Rewrite the plan's Forward note l.1173 to match, and drop "the bandwidth gauges (Gap 1)" from it.
4. **6-2b:** the price floor (`A card's price is at least 0.`) when Online Course Boom or Chip Shortage discounts a price. In 6-2a, TechCrunch's lower of $5 and $2 can't go below 0.
5. **Later long-runs work:** the 11 keys and the scouting key moved to counted, not required (R13). A later cadence change may promote them.
6. **Controller:** whether the T6 time (about 27.5 s, +37%) is accepted, or a speed-up mini plan follows (R15).
7. **Plan text:** cut the task briefs again from the amended plan (`task-3-brief.md` copies the `its blue xp` anchors and the Workaholic lines).

## Checked and clean

- **Global Constraints:**
  - `git diff 702ec9c` touches only the rules, the Startup test, the README, `designer-page.test.tsx` (the count) and `playtest-fitted.test.tsx` (R4). Step 5's first three checks print nothing, and the fourth prints only the count lines and R4's pin.
  - No protected file, engine, utils or page source changes, so no shared code and no banned words.
  - Hearts, Color Match, Venom, Rent Day and hearts-demo pass alone (8 files, 100 tests), and Rent Day keeps 108 examples.
- **Tests fail first, then pass,** at every task. The T1/T3/T4/T5 failures were the expected new pins plus the R2–R12 items above.
- **Example counts:** N₆ = 243 at HEAD, then 246 and 252 as planned, then 260/269/275 with R8. The designer-page count and the README follow.
- **Numbers:** every number in the plan's examples matches the rulebook:
  - prices (Workaholic 2, Clean Coder 3, Visionary 3, Toxic 3, Burnout 0, Flight Risk 2, TechCrunch 5/2, Design Sprint 0);
  - Hype +5 (§12.1);
  - the open job market $1, the queue of 5;
  - salaries;
  - the Drone Delivery 6/6, the Neobank 10, the Cloud Storage 4/4.

  The only exceptions are the Workaholic examples R7 fixes.
- **The auto-player:** `debuffing()` and `utility()` fit the retuned `playTurn` as free moves after `training()`. The Debuff/Training view-and-plain tests pass, and 'plays the same game through the page’s view as without it' passes.
- **The removal probe over all 182 added or changed lines at the final commit:** every line fails an example, except the 8 lines pinned by the made-values test (each verified).
- **Notes items:**
  - The rival-bench press is pinned by `ontoCandidates` (passes).
  - The Training money check reads the worked price.
  - The Hit Piece example's title and reason are updated.
  - Workaholic's salary keeps nothing as nothing (every talent has a salary column).
  - Owner-scope supplies stay shown (6-1's R5), which G4 needed.
  - G1's lower-of rule is used only on the player's own public operations.
  - ≥18 of 20 games Launch: 19.
  - No seat goes out, and no steps phase is reached.
- **The Task 6 replay test:** across 3p seeds 1–5 it sees a Debuff, a strip and a TechCrunch Feature. Load-log replay and undo pass, both with and without the memo.
