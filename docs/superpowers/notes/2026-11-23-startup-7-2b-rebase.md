# Plan 7-2b: its pre-flight probe rebased onto speed-up 4's head (the second amendment's source)

**Where things are**
- Clone: `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf72b3/probe`, branch `pf72b-r`, cut at the real head **baaebcd**. Its head is `66e5054`: 12 `R:` picks, then 3 `R2:` commits, and the tree is clean.
- BASE worktree: `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf72b3/base`. Logs and tools are in `logs/` and `tools/` beside it.
- The turnhout branch has since moved to `8cf3c6b`, which is docs only (the speed-up 4 ledger and handoff). The plan file is unchanged, so the line numbers below hold.
- Nothing tracked in turnhout was touched. The prescribed `bench.sh` runs vitest without `--no-cache`, so it updated vitest's gitignored run-order cache through the `node_modules` symlink (`/home/user/turnhout/node_modules/.vite/vitest/<hash>/results.json`), as the pre-flight's runs did. My other runs used `--no-cache`.

### (a) Picks
In every pick, the counts are the probe's plus 2 (README, `results`, designer page): 338, 345, 348.
1. `75b1d0c` T1: conflicted.
   - README and the designer page: counts only.
   - Rules: both sides appended examples at the end. I kept 7-2a's two `moved this round` examples, then T1's five.
   - Test: `rulesPart16`, where the fix wave's colour checks now wrap the `lang:on` check. I put T1's `vetoed` exemption and comment inside the section and left the colour checks as they were.
   - tsc fails with TS6133 `ANSWERS`, as on the probe (R2). The next pick fixes it.
2. `dbafcc0` A-T1: conflicted in the test only. The per-seat limits are now inside `rulesPart8`. There, `const { current, phase } = after.turn!` became `const { seat: current, phase } = turnOf(after)`, with A-T1's comment. Its `return { current, phase }` and the caller are unchanged.
3. `db19398` A-T1 (example 5's three colours): clean.
4. `95b231f` T2: conflicted.
   - Rules: `Cards can be moved this round.` and `Cards can be offered.` sit at the same anchor. I kept both, with `offered` last.
   - `rulesPart3`: kept the fix wave's `investPriceOf` for an Invest and added T2's `TAKE` and `SELL_BACK` arms.
   - `rulesPart4`: added T2's `proceeds` arms.
   - `rulesPart11`: T2's offer invariants go at its end, after the Equity checks. No new returned name.
   - `rulesPart16`: `placed` gained `TAKE_PLACING` as `(pressed || take-placing of it) && on === move.onto`, so the fix wave's `pressed` stayed as it was. `vetoed` gained `SELL_BACK` and `TAKE`.
5. `3768247` A-T2: clean.
6. `5728952` T3: conflicted, test only.
   - `FILE` and `SUE` go in `rulesPart3`, and `SUE` in `rulesPart4`.
   - `'court'` joins `rulesPart9`'s `strategyZones`.
   - The court invariant goes after the offer checks in `rulesPart11`.
   - `sued` goes in `rulesPart16`.
7. `c8b565e` and 8. `9289135` A-T3: clean.
9. `9ab9f9b` T4: conflicted.
   - README: I took T4's Startup paragraph, with the count at 348.
   - Test: the end of `happenings`. T4's context still had the old `consulting(…)`, while the head has `happeningsPart9` with `consultantsOn`. I kept the head's section. T4's "Plan 7-2b's paths" block stands unwrapped after `happeningsPart9();`, before `return keys;`.
10. `fd80532` and 11. `1db18f4` A-T4; 12. `b43d7f5` CUT: clean.

Checks on the picks:
- After each pick, the whitespace-blind +/- lines matched the original commit's, apart from the counts and the resolutions above.
- tsc was clean from pick 2 on.
- With the picks alone, the Startup file failed 12 of 115. The 4 long runs hit the fix wave's colour-flags check (after a `veto` twice, a `sue` and a `take … to a card`), and the 8 tally tests then had nothing to count.

### (b) R2 commits
1. `70a2c40`: `rulesPart16`'s `pressed` gains `TAKE_PLACING`. The colour-chosen check then reads a buyer's placement (it must leave exactly the colour chosen), and `placed` goes back to `pressed && on === move.onto`. Without this, the colour-flags check fails on every `take … to a card`.
2. `1c74466`: the colour-flags check gets a branch, `cleared`. A `VETO`, `SELL_BACK`, `TAKE` or `SUE` whose `cardId` is the token must leave it no colour (`[]`). Without this, the clearing lines R5 put in those four moves fail the check.
3. `66e5054`: `TAKE`, `TAKE_PLACING` and `SELL_BACK` are priced with `investPriceOf` (worked from the Founder's online tiers) instead of `sharePriceOf`. That is how the fix wave prices an Invest, so the check no longer reads the rules' own `share price`. No test needed this; see (f) 1.

Nothing was committed for `moved this round`: the ledger's item holds, and edit 6 below records it.

### (c) Second amendment (plan line numbers at baaebcd)
1. **l.68.** Old: "at the probe's BASE the full suite goes 4029 → 4030 and Startup's file 114 → 115." New: "at BASE (baaebcd) the full suite goes 4034 → 4035 (speed-up 4's E1 added 5) and Startup's file 114 → 115." N₉ = 333 and the end of 348 are confirmed.
2. **l.69.** Old: "A second amendment follows from the probe rebased onto that head (the 7-2a fix wave's colour checks and `moved this round`)." New: "Amended a second time from that probe rebased onto that head: the fix wave's two colour checks read this plan's moves, a trade is priced as the fix wave prices an Invest, and the test changes go into the split sections."
3. **After l.69, add this bullet:**
   - **The split test file (speed-up 4; the handoff's "Every later plan" rules).** The long runs' rules check and `happenings` are one arrow function per section.
   - A task puts each change inside the section where its anchor now sits, indented 2 more spaces.
   - A name a later section reads joins that section's `return { … }` and its caller's `const { … }`. This plan adds none.
   - A block that is a section of its own may stand unwrapped between sections.
   - Hazard: a section may read a returned name only after that name's `const { … } = rulesPartN();`. tsc misses an earlier read, which throws "Cannot access … before initialization".
   - Hazard: a `return` inside a section ends only that section, so a check that ends the move early stays unwrapped.
   - This plan hits neither hazard. It adds no early return, and its section changes read only outer names (`move`, `card`, `from`, `by`, `at`) and names returned earlier (`paid`, `board`).
   - Where the changes go:
     - Task 1: `rulesPart8` (the limits) and `rulesPart16`.
     - Task 2: `rulesPart3` (price), `rulesPart4` (proceeds), the end of `rulesPart11` (offer checks) and `rulesPart16`.
     - Task 3: the same sections, plus `rulesPart9` (court).
     - Task 4: its keys go in one unwrapped block after `happeningsPart9();`.
   - `playTurn`, `keepsTheBudget`, the window watch and `keepingForReplay` are not split. Never rerun `split.py`.
4. **l.134.** After `qa consultant` add: "`moved this round` (fix wave: cleared by `No card is moved this round.` as each round starts; the place button's `Only if it is not moved this round.` and `It is moved this round.`);".
5. **l.137.** Old: "the attachment and colour invariants." New: "the attachment and colour invariants; the fix wave's `investPriceOf` (`rulesPart3`), `consultantsOn`, and in `rulesPart16` the colour-chosen check and the 'colour flags change only with their token' check."
6. **l.37, append:** "It does not touch `moved this round`, which only gates the Round Start place button and is cleared as each round starts, before the event check; a token a buyer places may move at the next Round Start. A token that leaves its card in a Veto, sale back, take or suit may keep the flag until then, harmlessly."
7. **l.208, append:** "Its colour-flags check gains the burned token: a `VETO` of it leaves it no colour."
8. **l.363.** Old: "the mover gains the card's founder's `share price` (in `before`) from that founder;". New: "the mover gains from that founder the Share Price `investPriceOf` works out from the founder's online tiers in `before`, as an Invest's (7-2a's fix wave);". Drop this edit if (f) 1 is ruled no.
9. **l.370, append:** "and the colour-chosen check reads `TAKE_PLACING` as a placement (`pressed` gains it): it leaves exactly the colour the buyer chose;"
10. **l.371, append:** "; the colour-flags check gains a `SELL_BACK` or `TAKE` of the token, which leaves it no colour."
11. **l.382.** Old: "After `  Cards can be qa consultant.` add". New: "After `  Cards can be moved this round.` (7-2a's fix wave) add".
12. **l.678, append:** "; the colour-flags check gains a `SUE` of the token, which leaves it no colour."
13. **l.828.** Old: "(on judged moves, read through the runtime):". New: "(on judged moves, read through the runtime), in one block unwrapped after `happeningsPart9();`, under `// Plan 7-2b's paths: Equity moved (§17.B.5, §17.C).`:"
14. **l.867.** Old: "(at the pre-flight's BASE, 4029 → 4030; Startup's file 114 → 115)". New: "(at BASE, 4034 → 4035; Startup's file 114 → 115)".
15. **l.910.** Old: "the pre-flight projected ≈30.0 s for Startup's test file with R21(b)'s cut (R21, R23), on a BASE before speed-up 4;". New: "the rebased probe's best was 23.93 s against BASE's 23.01 s (alternating, best of 3; ×1.04, CPU 38.5 s against 36.4 s);".

Everything else in the plan holds at the real head: the rules text, the examples and their numbers, the 52 → 57 undo pin, R22's four excused keys, and the Gaps' "two keys at exactly 2 games". I measured per-game holds with the pre-flight's instrument script, at both ends:
- The rebased end matches the old probe's end key for key (207 paths over 20 games).
- The real head's BASE matches the old BASE key for key.
- So 7-2a's fix wave changed no auto-player path, and every required key is held by 2 or more games.

### (d) Counts
- Startup examples: 333 → 348 (338 and 345 after Tasks 1 and 2); the designer page pins 348. Rent Day: 108.
- Startup file: 114 → 115 tests, all passing.
- Full suite: 4035/4035 in 122 files (4034 at BASE plus the new tally test). tsc is clean.
- The purity grep is empty, and so is the `-import` grep. Checks 1–3 print nothing. Check 4 prints only the two count lines and the two File-button rows.
- Tally keys added: 25 paths (182 → 207). Games out of 20:
  - Windows: asked one holder 20, two or more 2. Actions: let go ahead 20, vetoed 9, last action vetoed 5. Consultant burned in a Veto 8. Sale vetoed by its token's Founder 2.
  - Buyback accepted 4, declined 4. Secondary Trade accepted 4, declined 10. Consultant placed by a buyer 3.
  - Suit filed 4, token sued back 4, Consultant sued back 4.
  - Moves: `veto` 9, `let the action go ahead` (counted as its own move) 2, `buy back` 6, `sell` 13, `sell back` 4, `take` 1 (excused), `take … to a card` 3, `decline` 12, `file` 4, `sue` 4.

### (e) Timing
`bench.sh 3`, alternating BASE (baaebcd) and the probe:
```
base run1 tests=23.17s cpu=35.6s load=1.90 other=6/0 seen=10 [114 passed (114)]
probe run1 tests=24.46s cpu=38.6s load=1.85 other=0/0 seen=4 [115 passed (115)]
base run2 tests=23.01s cpu=36.4s load=1.63 other=0/0 seen=4 [114 passed (114)]
probe run2 tests=23.96s cpu=37.6s load=1.93 other=0/0 seen=10 [115 passed (115)]
base run3 tests=23.05s cpu=35.9s load=1.70 other=0/0 seen=4 [114 passed (114)]
probe run3 tests=23.93s cpu=38.5s load=1.53 other=0/0 seen=4 [115 passed (115)]
```
- `seen` includes the run's own 3–4 processes: the script only leaves out working directories under perf4. So `seen=4` means no other job, and `seen=10` means one other job.
- Best: BASE 23.01 s (CPU 36.4 s); probe 23.93 s (CPU 38.5 s). That is +0.92 s (×1.040), with mean CPU +6%, about 6 s under the 30 s line.

### (f) For the controller
1. **R2 `66e5054` goes beyond the ledger.** It prices trades from the tiers, as the fix wave prices an Invest. Keep it with edit 8, or drop both. A `SUE` still reads the rules' own `buyout due`; working out $5 per Suit in the court independently would follow the same logic.
2. **The picks alone fail at the real head** (see a). That only matters for the probe's own commit order. An implementer following the amended plan won't see it, because edits 7, 9, 10 and 12 land in the same task as the clearing lines they allow.
3. **R24's README wording** ("selling products (Divest) and poaching") is in the plan at l.861, but the probe never carried it: T4 as written predates R24, and A-T4 left the README alone. The real head changes nothing here, so the implementer simply follows l.861.
4. **Task 4's `happenings` block is unwrapped.** Speed-up 4's rule allows a new section to stand unwrapped, and a later speed-up may wrap it.
