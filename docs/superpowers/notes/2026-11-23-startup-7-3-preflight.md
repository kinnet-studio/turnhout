# Pre-flight report: plan 7-3 (Startup Simulator slice 7, the page)

Plan: `/home/user/turnhout/docs/superpowers/plans/2026-10-16-startup-slice-7-3-the-page.md`, 830 lines. Line numbers below are the plan's unless a file is named.

Probe:
- Clone: `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf73/probe`, branch `pf73`, HEAD `11e193d`, clean.
- BASE is tag `BASE` (`4124947`, the 7-2b probe's `cut-replay`: 7-2a, then 7-2b as its pre-flight amended it, the 4-player replay cut).
- Option branches, each on the probe and all green: `pf73-every` `7350d21` and `pf73-whose` `0428654` (R5), `pf73-speed` `f7934d9` (timing).
- Worktrees: `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf73/base` (BASE) and `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf73/speed` (`pf73-speed`).
- Logs: `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf73/logs`. Scripts: `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf73/scripts` (`global.sh` runs Task 6's checks, `time3.sh` the timing).
- Browser check: `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf73/browser` (`probe.ts`, `check.cjs`, `check.log`, `edited.rules`, `zones.json`, the PNGs, all at deviceScaleFactor 1).
- **The real repo.** I touched no tracked file, and every vitest run used `--no-cache`. The staged changes now in `/home/user/turnhout` are 7-2b's executor's, not mine.
  - One cache outside git was written: the browser check's dev server re-optimized Vite's dependencies into `/home/user/turnhout/node_modules/.vite/deps` (23:04 UTC). `node_modules` is linked, and the probe's path changes Vite's config hash. It's gitignored, and Vite rebuilds it on the next dev-server start in the real repo.
  - `node_modules/.vite/vitest/<hash>/results.json` was last written at 23:49. The writer was another process's vitest run in `/home/user/turnhout` (`src/games/zzprobe-removal.test.ts`), not one of mine.

**How the probe differs from the real head (`8cf3c6b`).**
- **The real repo moved during this pre-flight.**
  - 7-2b's execution began, after a second amendment of 7-2b (`720edd1`). HEAD was `f84e6b3` (7-2b's Veto) when I wrote this, with more staged.
  - Every real-head line number below is `8cf3c6b`'s (`git show 8cf3c6b:<file>`).
  - None of 7-3's source files changes between `8cf3c6b` and `f84e6b3`.
- **The real head** has 7-2a's fix wave and speed-up 4, but not 7-2b yet.
  - The fix wave brings the `moved this round` flag, the long-run colour checks, and Consultants and the Share Price counted from card data.
  - Speed-up 4 (`c6776eb`, `baaebcd`) brings the runtime's per-state values about a player and the split long runs.
- **The probe** has 7-2b and none of those.
- **Startup examples:** 333 at 7-2a's head and 346 in the probe. 7-3 leaves the probe's count at 346. After 7-2b, 348 are expected at the real head.
- **The files 7-3 changes are byte-identical at the real head and at BASE:** `card-facts.ts`, `board-view.ts`, `board-text.ts`, `card-pick.ts`, `playtest.tsx`, `fit-layout.ts`, `seat-status.ts`, `zones.ts` and `action-window.ts`. Every code finding therefore carries over.
- **Findings that depend on the difference:**
  - R15 (`moved this round`, real head only);
  - R6 (7-2b's real tests may differ from the probe's);
  - the absolute timings (speed-up 4).
- **`viewedCards`' two named lines** are at the real head's `startup-simulator.test.ts` l.702 and l.710, and at BASE's l.767 and l.775.

## Summary

**Blockers.** None that the plan can't fix: each failure has an exact amendment below. As written, these steps fail:
- **Task 1:** typecheck fails (R1). The BUY_GAME test can't be set up as described (R3).
- **Task 2:**
  - an existing BASE test fails, which l.105 says is a stop (R7);
  - a new pin is wrong (R8).
- **Task 3:** the hover-line pin is wrong (R10).
- **Task 5:**
  - Step 2's expected failures pass already, and Step 3 has nothing to change. Venture Capital Rain is already in effect (R12).
  - The Round Start flow waits for an income step that never comes (R13).
- **Task 6:**
  - the browser setup can't run as written (R16);
  - screenshot 8 fails (R17).
- **At the real head only:** two pins miss the fix wave's `moved this round` (R15).

One ruling is needed:
- **R5:** an Invest's waiting line no longer says whose Equity is being bought.

**Findings.** 18 in all: 17 fix-in-plan (two of them minor, R11 and R18) and 1 ruling-needed.

**Tests.**
- **Full suite:** 4030 at BASE (122 files) and 4068 at the end (122 files), all passing. Typecheck is clean at BASE and at the end.
- **New `it()`s: +38.** By task: T1 10, T2 8 (one an amendment test), T3 6, T4 8, T5 6. By file:

  | File | New |
  |---|---|
  | `card-facts.test.ts` | 4 |
  | `board-view.test.ts` | 2 |
  | `board-text.test.ts` | 6 |
  | `card-pick.test.ts` | 3 |
  | `fit-layout.test.ts` | 5 |
  | `seat-status.test.ts` | 3 |
  | `playtest-fitted.test.tsx` | 13 |
  | `startup-simulator.test.ts` | 2 |

- **Test file counts:**
  - Startup: 115 → 117 tests, and its examples stay at 346.
  - The page file: 101 → 114.
- **Other games alone** (Step 5's command): 11 files and 112 tests pass. Rent Day still has 108 examples (asserted at `rent-day.test.ts` l.813), and no file under `src/games` changes except Startup's test file.
- **Global checks:**
  - words, protected files and pure core print nothing;
  - the rules check prints nothing, where l.782 expects the Venture Capital Rain row (R12);
  - the test-lines check prints exactly the three named lines (R6).
  - Separately:
    - `veto`, `supply` and `partner` appear in no `+` line of shared code;
    - `court`, `lawsuit` and `offer` appear in none either;
    - `stake` appears only as 7-1's fixture card, in two doc comments;
    - the only existing import lines edited are R1's two.

**Browser.**
- `probe.ts`: 101/101 checks across seeds 1–10.
- `check.cjs`: 70/71 checks, with no `pageerror` and no console error. The one failure is screenshot 8 as written (R17). The run continued with the amended step, which passes.

**Timing.** This is vitest's `tests` figure, best of 3, alternating, under `nice -n 19`, with `--no-cache`. "Others" is the number of other vitest processes on the machine, counted before each run.

| File | Set | Others | BASE | End | Change |
|---|---|---|---|---|---|
| `startup-simulator.test.ts` | quiet, BASE first | 0 | 27.03 s | 27.96 s | +0.93 s (×1.034); `pf73-speed` 27.69 s |
| `startup-simulator.test.ts` | quiet, end first | 0 | 27.28 s | 27.43 s | +0.15 s (×1.005) |
| `startup-simulator.test.ts` | loaded | 2 | 29.94 s | 32.56 s | +2.62 s (×1.088) |
| `playtest-fitted.test.tsx` | mostly quiet | 0–2 | 9.32 s | 11.24 s | +1.92 s for 13 new tests |

- A fourth Startup set, with 4 others running, spread 28.5–35.1 s within one side, so I didn't use it.
- There were 4 other vitest processes when I started, and 0–4 during timing.
- **Cost.** 7-3 costs the Startup file +0.15 to +0.93 s quiet: T1's `viewedCards` now calls `nameWithPlayers`, and there are 2 new tests. That is far under l.98's "a third longer", and the end stays under 7-2a's 30 s line.
- **No timing ruling is needed.** `pf73-speed` (working out a game's player facts once) is optional.
- **Absolute figures** at the real head will be lower (speed-up 4). The deltas come from naming and page work, so they should carry over.

## Results table

"S+E+G" is Step 4's first command, `vitest run src/engine src/pages src/games` (121 files). The full suite is 122 files.

| Commit | What | Passing |
|---|---|---|
| BASE `4124947` | full suite; typecheck | 4030/4030; clean |
| T1 `75a6be1` as written | Startup file; S+E+G; typecheck | 116/116; 4031/4031; **fails**: TS6133 `pickName` at `board-view.ts(14,30)` and `board-text.ts(9,35)` (R1). The BUY_GAME test was built by hand (R3) |
| A-T1 `6b94bb8` | typecheck | clean |
| T2 `fcf903d` as written | S+E+G | 4036/4038. Fails BASE's `board-text.test.ts` "lists the cards on a card from any zone and seat…" (R7), and the `boardOf(N)` `endsWith` (R8) |
| A-T2 `a243f85` | S+E+G (+1 amendment test, R9) | 4039/4039 |
| T3 `168f448` as written | S+E+G | 4044/4045. Fails the hover line, "hangs first in the column under the product…" (R10) |
| A-T3 `51f76b5` | S+E+G | 4045/4045 |
| T4 `38faf16` as written | Step 2: seat-status + page file | fails as expected (`waitingLine` and the line are missing) |
| T4 `38faf16` as written | Step 4: S+E+G; typecheck | 4053/4053; clean. The Veto picker pin needed a Cancel filter to pass (R11) |
| A-T4 `8acbaca` | the Veto picker pinned whole | page file passes |
| T5 `6940676` as written | Step 2: Startup + page files | The Venture Capital Rain test and the Event's line **pass** (R12); the Round Start fails (R13) |
| T5 `6940676` as written | Step 4: S+E+G; typecheck | 4058/4059 (Round Start, R13); clean |
| A-T5 `74ed1e9` | page file | 114/114 |
| T6 `11e193d` | README; full suite; typecheck; other games alone | 4068/4068 (122 files); clean; 11 files and 112 tests |

Notes on T5's Step 2 run:
- It also failed two flows on pins I'd guessed before reading the view: the offer's seat buttons, and the court's `owner`. The plan leaves those "as the view gives it", and R14 gives them.
- It also failed one Startup long run, because the `-t` filter skipped the tests it counts on. The full file passes.

## Findings

### R1 (fix-in-plan) — T1: two existing import lines must drop `pickName`, or typecheck fails

**Evidence.**
- At T1 as written, `bun run typecheck` reports:

  ```
  src/engine/core/lang/board-view.ts(14,30): error TS6133: 'pickName' is declared but its value is never read.
  src/pages/designer/board-text.ts(9,35): error TS6133: 'pickName' is declared but its value is never read.
  ```

- `pickedAs` and `cardLabel` were each file's only reader. Dropping the name edits an existing import line, and l.104 allows only new ones. A-T1 makes that edit:
  - `import { cardFact, cardName, pickName } from './card-facts';` becomes `import { cardFact, cardName } from './card-facts';`
  - `import { cardAttribute, cardFact, pickName } from '@/engine/core/lang/card-facts';` becomes `import { cardAttribute, cardFact } from '@/engine/core/lang/card-facts';`

**Amendment.**
- **l.104:** after "New names are imported on new `import` lines.", add: "The one exception: Task 1 drops `pickName` from the `card-facts` import line of `board-view.ts` and of `board-text.ts`, whose `pickedAs` and `cardLabel` were its only readers (TS6133)."
- **l.213:** after "(`cardLabel`)", add: "; each drops `pickName` from its `card-facts` import line".
- **Under R5 (a)**, `board-view.ts` still reads `pickName` and keeps its line. Only `board-text.ts`'s line changes, so both texts name only that file.

### R2 (fix-in-plan) — T1 and T2: there's no shared `stake(state, game, zoneId, maker)`

**Evidence.** At BASE, each test file that needs one defines its own Stake maker, each with its own signature, and none is exported. `testing.ts` has none.
- `attach.test.ts` l.209: `stake(state, zoneId, maker)`, with the game fixed to `post`;
- `compare-phrases.test.ts` l.245: `stake(state, zoneId, by)`, with the game fixed to `maker`;
- `action-window.test.ts` l.263: `stake(maker, ...zones): Prepare`.

**Amendment.**
- **l.183:** replace "the test-local `stake(state, game, zoneId, maker)`;" with "`makeCard` (`cards.ts`); 7-1's tests each define their own `stake`, none shared;".
- **l.242 and l.322:** after "arranged with `stake`", add "(defined in the describe: `const stake = (state: GameState, game: CompiledGame, zoneId: string, by: string) => makeCard(state, game, { name: 'Stake', maker: by }, zoneId)!;`)".

### R3 (fix-in-plan) — T1: a 3-player `BUY_GAME` engine can't run its Setup

**Evidence.**
- `BUY_GAME` is `MAKER_GAME` with a buy button. Its Setup's `Deal 2 cards from the pile to each stash.` deals 6 cards at 3 players, from a pile of 4.
- The probe's test passes the engine a state built by hand, which skips Setup. Its four names are `Stake` ×4.

**Amendment.** At l.248, replace "A 3-player `BUY_GAME` engine, p0 to act:" with:
> A 3-player `BUY_GAME` engine on a state made by hand, since its Setup deals 6 cards from a pile of 4:
> - `initialState(buy, 1)`, with two Stakes made in each `purse-pN` (`makeCard(…, { name: 'Stake', maker: pN }, 'purse-pN')`);
> - then `withBoardData(markTurnStarted({ ...state, turn: { current: 'p0', phase: 'working' } }), buy, seatsFor(3))`;
> - passed to `createEngine(buy, lib, 3, start)`, p0 to act.

### R4 (fix-in-plan) — T1: 7-1's `waitingView` names its cards beside `pickedAs`, so a naming fact would be said twice

**Evidence.**
- BASE's `waitingView` (`board-view.ts` l.625–630) takes `pickedAs(…).name`, then appends ` whose {fact} is {seat}` for every fact naming a player.
- Once `pickedAs` reads `nameWithPlayers`, a Stake whose maker is p0 in p1's holdings would read `Stake whose maker is p0 whose maker is p0`.
- The plan leaves it open:
  - l.181 says "through `pickedAs` or beside it";
  - l.213 says "the waiting view's names if it names cards itself";
  - l.238 says `WaitingView.cards` simply follows.
- T1 as written replaces the map with `ids.map((id) => pickedAs(runtime, state, seat, id).name)`.
- `WaitingView`'s doc comment (`board-view.ts` l.128–132) still says "with the player each of its facts names". A-T1 rewrites it to say the cards are named "as the seat's picker names them (`pickedAs`)…".

**Amendment** (with R5 (c); see R5 for (a) and (b)).
- **l.181:** "(its cards are named by `pickedAs`, then every naming fact is appended beside it)".
- **l.213:** replace "(`pickedAs`; the waiting view's names if it names cards itself)" with "(`pickedAs`; `waitingView`'s cards become `pickedAs(…).name` alone, dropping 7-1's appended naming facts, and `WaitingView`'s doc comment says its cards are named as the seat's picker names them)".

### R5 (ruling-needed) — T1 and T4: an Invest's waiting line no longer says whose Equity

**Evidence.**
- With the waiting cards on `nameWithPlayers`, a token in its Founder's own equity is named `Equity`.
- When S invests, the holders asked read `p1 wants to invest in a card in another player's equity: Equity.` Neither the label nor the card says whose. `INVEST_PLACING` reads `…: Equity to Dating App, choosing Blue.`
- The picker has the place `(p0's equity)` to say whose. The waiting line has no place.
- At BASE, 7-1's appended facts said `Equity whose founder is p0`.
- Buyback and Secondary Trade lines are unaffected, since there the token is in another player's portfolio.

**Options** (each built and green):
- **(a) every — recommended.** The waiting cards keep 7-1's naming: every player a card names is said, the zone's seat too, so `…: Equity whose founder is p0.`
  - Branch `pf73-every` `7350d21`, on the end.
  - `waitingView` keeps 7-1's map, reading `pickName`, so `board-view.ts`'s import line stays (R1 shrinks to `board-text.ts`). It adds one page test (`(option) names every player a waiting card names: an Invest says whose Equity`).
  - No other pin changes.
  - **Plan text:**
    - l.29: drop "and the waiting line" from Call 1's list. Add: "The waiting line names every player a card names, the zone's seat too, since it says no place (7-1's naming, unchanged)."
    - l.181: as R4.
    - l.213: "(`pickedAs`; `waitingView` keeps 7-1's naming of its cards)".
    - l.238: "So `PickCardView.name` and the offer's name follow; `WaitingView.cards` keep 7-1's names."
    - T4's page tests: add the option test.
  - It's the smallest change, and it keeps 7-1 Task 9's behaviour as 7-1 decided it.
- **(b) whose.** A seen card in a zone of a player other than the presser gets `{seat}'s` before its name, as the hover line does (l.116).
  - It reads `…: p0's Equity.` and `…: p0's Equity to p0's Dating App, choosing Blue.`
  - Branch `pf73-whose` `0428654`, on A-T5. It changes T5's Buyback pins (l.582, l.585) to `` `${S} wants to buy back a card in another player's portfolio: ${N}'s Equity whose founder is ${S}.` ``.
  - The line reads like the Board's `p1's …`, but `WaitingView` gains a second naming rule.
- **(c) as written.** Add a Gap: "the waiting line doesn't say whose Equity an Invest takes".

### R6 (fix-in-plan) — T1, T3, T6 and G3: the named classes hold exactly three lines; say so

**Evidence.**
- With the amendments, T1's Step 4 fails no test line of 7-1 to 7-2b on a name.
- Task 6's last check prints exactly three lines:

  ```
  -  sameList(offered.map((card) => card.name), zone.map(nameOf), () => `the names the view gives the cards of ${at}`);
  -      const named = targets.map((target) => [target.id, nameOf(target)]);
  -    const ids = fittedLayout(game.zones, S).map((z) => z.id);
  ```

  The first two are `viewedCards`' (BASE l.767 and l.775, real head l.702 and l.710). The third is `playtest-fitted.test.tsx` l.98.
- No other page-test line compares a whole zone list with a two-argument `fittedLayout`.
- **Depends on the probe:** 7-2b's real tests may differ from the probe's, so Task 1's Step 4 at the real head is still the check.

**Amendment.**
- **l.102:** replace ", and any test line of plans 7-1 to 7-2b that pins … in a portfolio)" with "(the pre-flight found no other line of plans 7-1 to 7-2b in this class; one that fails on a name at HEAD is listed in the report)".
- **l.272:** add "The pre-flight found none besides `viewedCards`' two."
- **l.425:** add "The pre-flight found no other."
- **l.783 and G3 (l.808–812):** "prints exactly `viewedCards`' two lines (`zone.map(nameOf)`, `nameOf(target)`) and `const ids = fittedLayout(game.zones, S).map((z) => z.id);`, unless Task 1's report lists more."

### R7 (fix-in-plan) — T2: `{seat}'s` under a card for any other seat's card breaks a BASE pin; give it to `across` zones only

**Evidence.**
- T2 as written fails BASE's `board-text.test.ts` l.127–135, "lists the cards on a card from any zone and seat…".
- There, p1's Potter in `crew-p1` sits on p0's Vase, and the pin expects `… with Smith, Potter (tired), Smith, Potter and Tinker; …`. The any-seat prefix makes one of them `p1's Potter`.
- That test isn't in a named class, so l.105 says stop.
- A-T2 limits the prefix to cards of a zone whose cards sit on other players' cards (`across`). All of 7-3's own pins still hold.

**Amendment.**
- **l.111 (Page copy):** "**Under the card it sits on, a card of another seat's zone whose cards sit on other players' cards (`across`):** `{seat}'s {entry}` …".
- **l.315:** "under the card it sits on, a card of an `across` zone whose seat is not that card's zone's seat reads `{seat}'s {entry}`; a card of any other zone reads as before (BASE's pin at `board-text.test.ts` l.127–135, p1's Potter on p0's Vase, stays)". In code:

  ```ts
  const heldEntry = (other: CardState) => {
    const info = zoneInfo(game, other.zoneId);
    return info?.spec.across === true && info.seat !== seatOf(card) ? `${info.seat}'s ${entry(other)}` : entry(other);
  };
  ```

- **l.333:** name that test among the guards.

### R8 (fix-in-plan) — T2: N's Board line doesn't end with the token

**Evidence.**
- `boardOf(N)` is `development: Dating App (…) [Blue 0/6, Red 0/0] with ${S}'s Equity whose founder is ${N} (blue consultant) · equity: Equity`.
- N's remaining token follows the development, so the line can't end with S's token.

**Amendment.** l.345: "`boardOf(N)` contains `` `[Blue 0/6, Red 0/0] with ${S}'s Equity whose founder is ${N} (blue consultant) · equity: Equity` ``."

### R9 (fix-in-plan) — T2: `placesOf` names the card twice for two placed cards on one card

**Evidence.**
- Two cards of one name and one place, both sitting on one card, get 6-3's tie-break `, on {card}` after a place that already says it.
- At 3 players the case is a seat holding two of one Founder's tokens, both Consultants on one product. Both read `Equity whose founder is p1 (on Dating App in p1's development, on Dating App)`.
- The amendment test (A-T2, `card-pick.test.ts`) puts the second Stake on the Vase too.
  - As written, p1's places are `on Vase in p0's workshop, on Vase` for both.
  - Amended, they're `on Vase in p0's workshop, lit` and `on Vase in p0's workshop`: the label tells them apart.
- A-T2 keeps the set of cards `sitsOn` placed, and the tie-break returns null for them.

**Amendment.**
- **l.318:** add "A card whose place `sitsOn` already names never gains 6-3's `, on {card}` tie-break; labels still tell such cards apart."
- **l.334–337:** add the check "(two placed) the second Stake put on the Vase too, labels `{ [p1's placed Stake]: 'lit' }`:
  - for p1: `on Vase in p0's workshop, lit` and `on Vase in p0's workshop`;
  - for p0: `p1's holdings, on Vase in p0's workshop, lit` and `p1's holdings, on Vase in p0's workshop`."

### R10 (fix-in-plan) — T3: the hover line leaves the labelled fact off the columns

**Evidence.**
- T3 as written fails at l.442. It expects `` `${A}'s ${cardDetail(faceKey)} — blue consultant` ``, which is `p0's Equity — founder p1 · blue consultant yes — blue consultant`. The page gives `p0's Equity — founder p1 — blue consultant`.
- 6-3's hover line passes the label's flags to `cardDetail`, so a flag is said once. The browser shows the same (screenshot 3).

**Amendment.**
- **l.116:** "`p0's Equity — founder p1 — blue consultant` (6-3's hover line leaves a fact the label says off the columns)".
- **l.442:** "`detail()` is `` `${A}'s ${cardDetail(faceKey, ['blue consultant'])} — blue consultant` ``, that is `` `${A}'s Equity — founder ${S} — blue consultant` ``; pin both."

### R11 (fix-in-plan, minor) — T4 and T5: a picker's buttons end with Cancel

**Evidence.** Every picker ends with Cancel. "Only button" is false as worded: T4 as written had to filter Cancel out.

**Amendment.**
- **l.525:** "its picker's buttons are `` [`Equity whose founder is ${S}`, 'Cancel'] ``".
- **l.618:** "the picker's buttons are `` [`Equity whose founder is ${FIRST2} (on To-Do List in ${FIRST2}'s development)`, 'Cancel'] ``".

### R12 (fix-in-plan) — T5: Venture Capital Rain is already in effect

**Evidence.**
- 7-2a's `103ad6b` dropped `Not in effect yet.` from the row. Both BASE's and the real head's `startup-simulator.rules` l.138 read exactly l.572's row.
- In T5's Step 2, the new Startup test and the Event's line pass before any change. Three Events still end `Not in effect yet.`: Recruiter Frenzy, Headhunter Holiday and Whistleblower Protection Act.
- Step 3 has nothing to change, and the global rules check prints nothing.

**Amendment.**
- l.10: drop ", and Venture Capital Rain's effect no longer says it isn't in effect".
- l.14: "It changes no line of the rules: 7-2a (`103ad6b`) already dropped Venture Capital Rain's `Not in effect yet.`"
- l.21: drop ", and Venture Capital Rain's effect".
- l.97: delete the rules bullet.
- l.559: drop ", and Venture Capital Rain's Effect" from the title.
- l.564: delete the Modify line.
- l.569–573: "Produces: no page code and no rules change (Calls 5–6)". Delete the row block.
- l.576: rename the test `it('says Venture Capital Rain is in effect, as 7-2a made it (§20.D 1)')`, a guard.
- l.580: mark the Event's line as a guard.
- l.632–634: "Expected: all pass (guards, Calls 5–6, Tasks 1–4); say so in the report".
- l.636: delete Step 3.
- l.641: drop the rules file.
- l.643: drop ", and Venture Capital Rain's effect says it is in effect".
- l.776–777 and l.782: "the rules: no line changed (prints nothing)".

### R13 (fix-in-plan) — T5: the Round Start's second seat has no income step

**Evidence.**
- T5 as written fails at l.615. After FIRST2 ends their actions, SECOND2's status ends with `hint('actions')`, not `hint('income')`.
- No one of SECOND2's draws a salary (§20.B), so Income passes at once, as in 6-3's all-pass test.

A-T5:

```ts
press('End your actions');
selected(`${SECOND2} — to act`);
expect(status()!.endsWith(hint('actions')), status()!).toBe(true);
press('End your actions');
```

**Amendment.** l.615: "Press `End your actions` (FIRST2's). `` tab(`${SECOND2} — to act`) `` is selected and `status()` ends with `hint('actions')`: no income step comes, since no one of SECOND2's draws a salary (§20.B). Press `End your actions`."

### R14 (fix-in-plan) — T1 and T5: the pins left "as the view gives it", and a label the list lacks

**Evidence.** These are the view's values in the probe. The offer's buttons include the take-and-place button, which l.195–204 don't list.

**Amendment.**
- **l.202:** add `TAKE_PLACING` = `Take a card from another player's portfolio to a card in another player's development or another player's operations`.
- **l.265:** "its reason (`title`) is `it is a card whose founder is them`".
- **l.584:** "`seatButtons()` is `[SELL_BACK, TAKE, TAKE_PLACING, DECLINE]`".
- **l.600:** "`fittedLayout(game.zones, S)` has `court` with `layout` `'pile'` and `owner` `'shared'`".
- **l.617:** "`seatButtons()` is `['Let go of a card in your development team', 'Let go of a card in your ops team', PLACE, CONFIRM]`".

### R15 (fix-in-plan; depends on the real head) — T5 and T6: a Round Start place sets `moved this round`

**Evidence.**
- The fix wave's place button (real head `startup-simulator.rules` l.1643–1649) reads `Only if it is not moved this round.` and sets `It is moved this round.` The flag is declared right after the three colours (l.179) and cleared at each round start (l.878).
- The probe lacks the flag. With it added to the probe's rules, T5's check at l.622 fails:

  ```
  Expected: "with p0's Equity whose founder is p1 (qa consultant)"
  Received: "operations: Dating App (tier Tier 1, tag Social, sector Consumer) [Blue 0/6, Red 0/0] with p0's Equity whose founder is p1 (qa consultant, moved this round)"
  ```

- The token's label joins its flags with `, ` (`boardBadges`), so it reads `qa consultant, moved this round`.
- At 7-2b's real head, the take-and-place button must decide whether it sets the flag too. 7-3's flows don't press that button.

**Amendment.**
- **l.622:** "`` `with ${SECOND2}'s Equity whose founder is ${FIRST2} (qa consultant, moved this round)` `` (7-2a's fix wave: a placed token is moved this round)".
- **l.731:** "labelled `red consultant, moved this round`".
- **l.732:** "`board-p0` contains `with p1's Equity whose founder is p0 (red consultant, moved this round)`".

### R16 (fix-in-plan) — T6: the browser check's setup can't run as written

**Evidence.**
- **The scratch path.** `/tmp/claude-0/-home-user-turnhout/…` (l.107, l.656) doesn't exist. This session's scratchpad is `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad`, and 6-3's `check.cjs` is in `browser-6-3` there, so l.682's `$SCRATCH/../browser-6-3` resolves only from that root.
- **Playwright.** `require('playwright')` fails from the scratch directory: the global install is in `/opt/node22/lib/node_modules`.
- **`pressIn`.** 6-3's `pressIn` clicks `getByRole('button', { name, exact: true })`, which fails Playwright's strict mode on a picker listing one Founder's tokens alike. Screenshot 2's picker has three `Equity (p1's equity)` buttons.

**Amendment.**
- **l.107 and l.656:** `SCRATCH=/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-7-3`, or the executing session's own scratchpad, with 6-3's check copied from there.
- **l.106:** add "Run the check with `NODE_PATH=/opt/node22/lib/node_modules`."
- **l.682:** add "`press` and `pressIn` click the first match (`.first()`): a picker lists one Founder's tokens alike."

### R17 (fix-in-plan) — T6: screenshot 8: p1 waits at 0 actions for End

**Evidence.**
- After p0's Sell back, the `p1 — to act` tab stays selected at `p1 33 capital, 0 actions` (`08a-p1-at-0-actions.png`). A turn that comes back from the window or the offer at 0 actions waits for End, as 7-2b's R4 has it.
- The check as written fails (`check.log` l.67). Once p1 presses `End your actions`, `p2 — to act` is selected, and the rest of step 8 passes.
- Separately, the sell-back picker's only token is `Equity whose founder is p1 (on Dating App in p1's development)`, so l.718's "the token" can be named.

**Amendment.** l.718–719: "p0 presses `SELL_BACK` and picks `Equity whose founder is p1 (on Dating App in p1's development)`. The `p1 — to act` tab is selected, p1 at 0 actions (a turn back from the offer waits for End); p1 presses `End your actions`. Then the `p2 — to act` tab is selected."

### R18 (fix-in-plan, minor) — Gaps: G1 is stale

**Evidence.** A token that comes off a product has its colour flags cleared on every path:
- **Pivot:**
  - real head `startup-simulator.rules` l.1395–1397;
  - the probe, l.1406–1408.
- **Sell back, Veto and sue:** 7-2b's R5.

T3's Pivot flow confirms it: after the Pivot, `table!.decor` has no key for either returned token.

**Amendment.** l.802–806: replace G1 with:
> **G1. A token keeps `moved this round` until the next round start.** 7-2a and 7-2b clear the three colour flags on every path a token comes off a product. But a token placed at this round's start that leaves its card in the same round keeps `moved this round` until `No card is moved this round.` (7-2b's rebase note, edit 6, at the real head). The page labels it so in the portfolio or supply. This needs no page work, and no test here pins it.

## Gaps (with homes)

- **No waiting line during an offer or a lawsuit.**
  - The buyer's status says "You are offered an Equity token at its Founder's Share Price". Who offers it and at what price is left to the Board's `(offered)` and the buttons' verdicts.
  - Home: a later page plan, once 7-2b's offer stores a `WaitingView`. Slice 8's Vest note says the same.
- **The Share Price and `buyout due` aren't on the page.** This is G2, parked.
- **Faces break mid-word.** In the milestone row, `Platfor|m Power` and `Talent Magne|t` break, as do the Whistleblower Protection Act's face in the event-in-play pile (`07-offer.png`, `01-table.png`).
  - This predates 7-3. Home: a card-face text-fit fix in shared drawing code.
- **Greyed reasons mix sentences and lowercase clauses.** `it is a card whose founder is them` (R14) sits beside `There is no card in another player's portfolio.`
  - This predates 7-3. Home: a reason-wording pass.
- **A two-flag label runs to three lines** in the token's corner (`blue consultant, offered`, `07-offer.png`). It's readable and leaves the corner index clear. With `moved this round` (R15), the Round Start label is longer still.
  - Home: a later page plan.
- **The face repeats the label** (`blue consultant: yes`, `offered: yes`, under `founder: p1`).
  - Home: 4-3's face and label split.
- **File shows, greyed, on every Strategy card.** That's correct, but noisy.
  - Home: a later page plan.

## Forward notes

- **For 7-3's executor:**
  - re-run Task 1's Step 4 and Task 5 at the real head after 7-2b. R6 and R15 depend on the real tests and rules.
  - **Expected counts.** 7-2b's rebase note expects 4035 tests in 122 files, a Startup file of 115 tests and 348 examples after 7-2b. 7-3 should then end at 4073 tests (+38), a Startup file of 117 and the page file +13, with the examples still at 348.
  - The fix wave's long-run colour checks read flags from card data (`CONSULTANT_COLOURS`, real head `startup-simulator.test.ts` l.119), not view names, so T1's naming shouldn't touch them. The probe can't confirm it.
- **For 7-2b's executor:**
  - the take-and-place button's `moved this round` decision (R15) changes nothing in 7-3's flows.
  - README l.150 reads "Its 333 examples" at `8cf3c6b`. That count is 7-2b's to update; 7-3 adds no example.
- **Slice 8:**
  - the Vest / Cease & Desist window can reuse `waitingLine`;
  - under R5 (a) or (b), its cards say whose they are.
- **`pf73-speed`** works out a game's player facts once per compiled game (a `WeakMap`). It's optional. It would matter only if a later slice calls `nameWithPlayers` in a hot loop.

## Checked and clean

- **Numbers match `/home/user/suwa/rulebook.md`:**
  - §17.A: $5 at Tier 1 or no product;
  - §17.C.2: the Suit's $4 cost and $5 payment (the $4 card is at the rules' l.1244);
  - §17.C.4 and §17.C.5: Buyback and Secondary Trade at the Share Price;
  - §17.D: the last token is kept;
  - §6 and §13.A: a Recruit costs $2;
  - §4: three Juniors on the bench;
  - §20.D 15: Headhunter Holiday;
  - §20.B: a Junior with no XP draws no salary;
  - §9: Operational Revenue $0, so no dividend.

  Every capital line in Tasks 4–6 and the browser check came out as the plan's arithmetic says.
- **Hidden information:**
  - the Assign through the window names both Juniors as `a face-down card` on N's tab, and N's page text contains neither name;
  - no costed Startup button has a choice guarded by a hidden fact, so the waiting line's choices leak nothing.
- **Choices in the waiting line.** A 4-player Sell's buyer shows as `, choosing p3`.
- **The seat switcher** follows the window, the offer and the lawsuit with no new code (Call 5).
- **No `veto — ` prefix:** the window isn't an interrupted turn (l.514's branch isn't taken).
- **End is live** at 0 actions after a vetoed last action.
- **No `z` pin moved** on a fitted Startup table (l.457).
- **`unreachableZones`** is unchanged but for the rival zones (T3's Drops check).
- **Color Match:**
  - no `waiting` test id at 3 players (T4's guard and screenshot 11);
  - three 800 × 600 canvases, no tabs.
- **The standing constraints:**
  - Hearts, Color Match, Venom and Rent Day are unchanged;
  - protected files are unchanged;
  - the core is pure;
  - no Startup words appear in shared code, and never "veto", "supply" or "partner";
  - new names come on new import lines only, except R1's two edits.
- **The README:** Step 3's additions fit its sections at the real head too ("The other seats", "The Board", "Buttons that pick cards" `In the playtest`, and 7-1's paragraph at l.298).
- **Screenshots 1–11** were each opened and checked against their lists:
  - captions such as `on Dating App` / `in p1's development` sit under their tokens, clear of neighbours;
  - hanging tokens show their top strip and label under the product's counts;
  - the waiting line is in p1's colour (`rgb(59, 130, 246)`).
- **The edited rules** compile with no problems. The examples panel reads 231 of 346, as expected, since the edits change Setup.
- **Real-head facts:**
  - the 7-3 source files are byte-identical at the real head and at BASE;
  - `viewedCards`' lines are there (l.702, l.710).

## The probe's commit list

`BASE..pf73`, oldest first:

| Commit | Message |
|---|---|
| `75a6be1` | T1 (as written) |
| `6b94bb8` | A-T1: pickName dropped from the two import lines it leaves unused (typecheck); WaitingView's comment names its cards as the picker does |
| `fcf903d` | T2 (as written) |
| `a243f85` | A-T2: only a card of an across zone is named by its seat under the card it sits on (the existing any-seat pin stays); placesOf names the card a placed card sits on once (two tokens on one product); N's Board line contains the token, its equity after it |
| `168f448` | T3 (as written) |
| `51f76b5` | A-T3: the hover line of a rival's token leaves its labelled colour off the columns (6-3's hover line), pinned whole |
| `38faf16` | T4 (as written) |
| `8acbaca` | A-T4: the Veto picker's buttons are pinned whole, its Cancel last |
| `6940676` | T5 (as written) |
| `74ed1e9` | A-T5: the Round Start's second seat has no one on a salary, so no income step comes: End your actions twice, as 6-3's all-pass test does |
| `11e193d` | T6 (as written) |

Options, not on `pf73`:

| Branch | Commit | Parent | Message |
|---|---|---|---|
| `pf73-every` | `7350d21` | `11e193d` | OPTION (every): the waiting cards keep 7-1's names, every player a card names said (an Invest says whose Equity); board-view.ts's import line stays as it was |
| `pf73-whose` | `0428654` | `74ed1e9` | OPTION (whose): a seen waiting card in a zone of another player than the presser's is named by whose zone it is (an Invest says whose Equity) |
| `pf73-speed` | `f7934d9` | `11e193d` | OPTION (speed): nameWithPlayers reads only the facts that name a player, worked out once a game |
