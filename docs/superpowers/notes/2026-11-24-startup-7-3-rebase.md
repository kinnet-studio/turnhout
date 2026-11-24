# Plan 7-3: its pre-flight probe rebased onto 7-2b's head (the second amendment's source)


**Where things are.** `<HEAD>` = **b5ec716b3054639f802b872a4df0c05e8ba7a65a**. The rebased probe is `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf73b/probe`, branch `pf73-r`, head `4267a26`: 12 `R:` picks, then 2 `R2:` commits, and the tree is clean. BASE worktree: `…/scratchpad/pf73b/base`. Logs are in `…/pf73b/logs` and the browser check in `…/pf73b/browser`. I touched nothing tracked in /home/user/turnhout (`git status` is clean). The turnhout branch gained `759412d` while I worked. It is docs only (handoff and 7-2b ledger, plan file unchanged), and I ignored it as told.

Baseline at b5ec716, confirmed before picking: 4035 tests in 122 files, Startup's file 115, the page file 101, Startup examples 348 (designer-page pin), Rent Day 108. tsc is clean.

### (a) Picks
All 12 picks were **clean**: 75a6be1 T1, 6b94bb8 A-T1, fcf903d T2, a243f85 A-T2, 168f448 T3, 51f76b5 A-T3, 38faf16 T4, 8acbaca A-T4, 6940676 T5, 74ed1e9 A-T5, 11e193d T6, then 7350d21 OPTION (every).
- After each pick, the whitespace-blind +/- lines matched the original commit exactly.
- Startup's test file merged without conflict. T1 touches only the import block, the top-level helper `function viewedCards` (b5ec716 l.778, l.786) and the file's end. No split section is touched.
- The README merged cleanly: HEAD's changes are at l.150 and the slice-6 bullet, and T6's are elsewhere.
- **T5 and the rules:** no commit in `4124947..7350d21` touches `startup-simulator.rules`; T5 changes only the two test files. Its Startup test still had its pre-R12 name, which R2 #2 fixes.
- With the picks alone, tsc is clean and the suite is 4073/4074. The one failure is R15's pin: `(qa consultant)` where the page gives `(qa consultant, moved this round)`.

### (b) R2 commits
1. `523d3f5`: Task 5's Round Start pin becomes `` `with ${SECOND2}'s Equity whose founder is ${FIRST2} (qa consultant, moved this round)` ``, with a comment. 7-2a's fix wave sets the flag on a place. This is the R15 pin as the amended plan l.638 already states it.
2. `4267a26`: Task 5's test names follow the amended plan (R12). The Startup test becomes `it('says Venture Capital Rain is in effect, as 7-2a made it (§20.D 1)')`, and the page's Event-line test becomes `(guard) writes Venture Capital Rain's effect…`. Nothing at HEAD needed this; it is plan conformance only.

Nothing else was needed. The fix wave's colour checks and `investPriceOf`, and 7-2b's colour exemptions, trade pricing and new offer Hint, break none of 7-3's flows. Every pin reads the Hint through `hint('offer')`.

### (c) Second amendment (plan line numbers at b5ec716, unchanged at 759412d; applied in the same commit as this note)
1. **l.72.**
   - Old: "BASE is plan 7-2b's finished head, not the pre-flight probe's (which had 4030 tests, Startup 115 tests and 346 examples). Counts are read from BASE's committed tests: the plan adds 39 `it()`s in all (…)".
   - New: "BASE is plan 7-2b's finished head (b5ec716, or a docs-only descendant): 4035 tests in 122 files, Startup's file 115, the page file 101, Startup's examples 348 (`designer-page.test.tsx`), Rent Day 108. The plan adds 39 `it()`s (T1 10, T2 8, T3 6, T4 9, T5 6) and ends at 4074 in 122 files, Startup's file 117, the page file 115, examples 348."
2. **l.73.**
   - Old: "A second amendment follows from the probe rebased onto that head (7-2b's real end: 348 examples, the split test file, the second amendment's colour checks)."
   - New: "Amended a second time from that probe rebased onto b5ec716 (`pf73b/probe`, `pf73-r`). All 12 picks applied clean. The head needed only R15's `moved this round` pin, already in Task 5. 7-2a's fix wave and 7-2b's colour checks, trade pricing and offer Hint change none of 7-3's flows or pins."
3. **After l.73, add this bullet:** "**The split test file** (speed-up 4; the handoff's 'Every later plan (from speed-up 4)' rules). No task touches the long runs' sections (`rulesPartN`, `happeningsPartN`, from l.2770 at b5ec716).
   - Task 1's `nameWithPlayers` import is a new line in the import block.
   - Task 1's two `viewedCards` lines are in the top-level `function viewedCards` (l.778, l.786), outside every section.
   - Tasks 1 and 5 append their `it()`s at the file's end, after the last top-level `it`.
   - So no section, `return { … }` or caller changes, and neither hazard arises (a read before its call; a `return` that ends only its section). Never rerun `split.py`."
4. **l.266.**
   - Old: "the two name comparisons read `nameWithPlayers(card, game)` in place of `nameOf`".
   - New: "the two name comparisons (l.778 and l.786 at b5ec716) read `nameWithPlayers(card, game!)` and `nameWithPlayers(target, game!)` in place of `nameOf`. The file's `game` is `compileGame`'s `CompiledGame | undefined`, so the bare `game` fails TS2345."
5. **l.281, append:** "The rebased probe confirms it at b5ec716: Startup's file passes 117/117 with them."
6. **l.534, append:** "(At b5ec716 the window is not an interrupted turn, and no `veto — ` appears.)"
7. **l.779.**
   - Old: "The passing count is the starting count plus 39 (T1 10, T2 8, T3 6, T4 9, T5 6); Startup's file gains 2 tests and the page file 14, and Startup's examples are unchanged."
   - New: same sentence + " (at b5ec716: 4035 → 4074; Startup's file 115 → 117; the page file 101 → 115; examples 348)."
8. **l.833 (G8).**
   - Old: "With `moved this round`, the Round Start label is longer still."
   - New: "With `moved this round`, the Round Start label (`red consultant, moved this round`, `10-round-start.png`) runs to four lines, still clear of the corner index, and the face's `moved this round: yes` reaches the card's right edge."
9. **l.843.**
   - Old: "re-run Task 1's Step 4 and Task 5 at the real head after 7-2b. R6 and R15 depend on the real tests and rules; the second amendment (the probe rebased onto 7-2b's head) may change them."
   - New: "R6 and R15 hold at 7-2b's head (b5ec716). Task 6's test-lines check prints exactly R6's three lines, and Task 5's Round Start pin and screenshot 10 read `moved this round`. Re-run Task 1's Step 4 and Task 5 at HEAD all the same."
10. **l.844.**
    - Old: "(7-2b's rebase note expects 4035 tests in 122 files, Startup's file at 115 tests and 348 examples after 7-2b.)"
    - New: "(At b5ec716: 4035 → 4074 in 122 files, Startup's file 115 → 117, the page file 101 → 115, 348 examples, Rent Day 108.)"
11. **l.845.**
    - Old: "(`CONSULTANT_COLOURS`, `startup-simulator.test.ts` near l.119), not view names, so T1's naming shouldn't touch them. The probe can't confirm it."
    - New: "(`CONSULTANT_COLOURS`, `startup-simulator.test.ts` l.121 at b5ec716), not view names, so T1's naming doesn't touch them: the rebased probe's Startup file passes 117/117."
12. **After l.845, add:** "Timing on the rebased probe (bench.sh, best of 3, alternating): Startup's file 18.34 s → 18.48 s (+0.14 s); the page file 7.00 s → 8.24 s (+1.24 s for 14 tests)."

Everything else holds at b5ec716:
- Tasks 1–5's code and pins, R1–R18, R5 (a) and its option test;
- the global checks;
- the probe's setup lines and seeds;
- screenshots 1–11, R16's setup and R17's screenshot 8.

### (d) Counts (at 4267a26)
- **Full suite:** 4074/4074 in 122 files (4035 + 39). tsc is clean.
- **Files:** Startup's file 117 (+2), the page file 115 (+14), Startup examples 348 (designer-page passes), Rent Day 108.
- **Other games alone** (Step 5's command): 11 files, 112 tests. No file under `src/games` changed except Startup's test file.
- **Global checks:** words, protected files, pure core and rules each print nothing. The test-lines check prints exactly the three R6 lines (`zone.map(nameOf)`, `nameOf(target)`, `const ids = fittedLayout(game.zones, S)…`).
- **The brief's checks:** the purity grep is empty, and `-import` prints only `-import { cardAttribute, cardFact, pickName } from '@/engine/core/lang/card-facts';` (board-text.ts, R1 under R5 (a)).
- **`+` lines of shared code:** no veto, supply, partner, court, lawsuit or offer; `stake` only as 7-1's fixture card.

### (e) Browser check (Task 6, as amended)
- **Setup:** `probe.ts` passes 101/101 over seeds 1–10. `check.cjs` was copied from the pre-flight, with screenshot 8 per R17 and screenshot 10 per R15, plus a hover check that the label ends `red consultant, moved this round`.
- **Run:** a dev server from the rebased probe on 5173 (`--strictPort`), with NODE_PATH and `.first()`.
- **Result:** 73/73 checks pass, with no pageerror and no console error.
- **Details:**
  - The sample reads `348 of 348 examples pass`; the edited rules read `233 of 348`.
  - The offer status shows HEAD's new Hint.
  - Screenshot 8: p1 waits at `p1 33 capital, 0 actions`, presses End, and then `p2 — to act` is selected.
- **Visual check:** I opened the PNGs for screenshots 2, 3, 4, 7 and 10. The captions are clear and the hanging strips show. The waiting line is in `rgb(59, 130, 246)`.
- The dev server was stopped, and no pf73b processes remain.

### (f) Timing (`bench.sh 3`, BASE = b5ec716 worktree)
Startup's file:
```
base run1 19.19s cpu 30.8 other 0/0 seen 4 | probe run1 18.73s cpu 30.2 0/0 seen 4
base run2 19.44s cpu 30.9 0/0 seen 4 | probe run2 18.48s cpu 29.6 0/0 seen 4
base run3 18.34s cpu 29.1 0/7 seen 4 | probe run3 18.85s cpu 29.8 7/0 seen 10
```
Best: BASE 18.34 s, probe 18.48 s (+0.14 s, ×1.008).

The page file, first set (another session's suite running, seen 11 throughout):
```
base 7.48/15.0 | probe 9.15/16.6 | base 8.02/14.7 | probe 10.67/16.5 | base 9.03/14.6 | probe 10.66/17.0
```
The page file, second set:
```
base 7.89/14.9 seen 4 | probe 8.86/16.5 seen 9 | base 7.00/14.1 seen 9 | probe 8.54/16.2 seen 4 | base 7.27/14.7 seen 4 | probe 8.24/15.8 seen 4
```
Best: BASE 7.00 s, probe 8.24 s (+1.24 s for 14 tests). Taking only quiet runs, it is +0.97 s. No timing ruling is needed.

### (g) For the controller
1. R2 `4267a26` only renames two tests to the amended plan's names; HEAD didn't need it. Keep or drop.
2. Edit 4 (`game!`) was also wrong at the pre-flight's BASE. It is a real tsc failure for a literal implementer, so I included it.
3. Untracked caches written through the `node_modules` symlink: Vite's dev server re-optimized `/home/user/turnhout/node_modules/.vite/deps` (vite config hash). `bench.sh` runs vitest without `--no-cache`, so it may have updated `node_modules/.vite/vitest/<hash>/results.json`. Both are gitignored, and my other runs used `--no-cache`.
4. The browser files are in `pf73b/browser`, not `scratchpad/browser-7-3`, so the executor's path stays empty.
5. `759412d` (docs) landed during the work. It adds handoff notes "for 7-3", which I did not read, as told. Check them against this amendment before applying it.

## Controller

- The second amendment (c) 1–12 is applied to the plan as written. (g)1: R2 `4267a26` is kept (the amended plan's R12 test names). (g)5: the handoff's new "7-3 (from 7-2b)" note agrees with it (no Veto from the auto-player before the last round; the opening press only spends its actions).
