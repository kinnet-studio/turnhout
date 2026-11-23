# Pre-flight: plan 7-1 (The language for Equity)

- **HEAD scanned:** `88303f0` (the brief's BASE). Plan 6-3 then finished in the real repo, which is now at `32da5d9`. I rebased the probe onto it and ran everything again (see "6-3 dependencies"). The real repo was only read.
- **Inputs:**
  - the plan (1491 lines);
  - the slice 7 spec (R1–R2 win over its body) and the overview spec;
  - the rulebook: §17.B.5 (l.1097–1101), §17.C (l.1103–1119), §17.D (l.1122–1128);
  - every section of the notes-for-7 file;
  - the handoff's carried notes, plus 6-3's new "7–10" bullet;
  - plan 6-3's text and ledger at `32da5d9`;
  - the 6-2b report's shape.
- **Probe:** `S=/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf71`.
  - `$S/work` is branch `probe` off `88303f0`. Commits marked "probe:" fix my own slips, not the plan's.
    - `e4ee144` T1 · `85ac91d` T2 · `33d312a` T3 · `73e5319` T4 · `8f34316` A-T4 · `518614b` A-T3
    - `a0a0739` T5 · `1a37ea1` A-T5 · `31a72e9` T6 · `1ba1bd2` A-T6
    - `feab6e5` T7 · `11184ce` A-T7 · `b78ad2e` A-T7b · `e7e53d0` T8 · `2711d34` A-T8 · `2cb1808` T9
    - `8a68502` T10 (examples as written) · `e3ded94` A-T10 · `395e442` T10 Step 3 (README as written)
    - `ed15b57` A-T1 · `4212419` probe (a header comment of mine said "Veto") · `d8cdc2a` A-T10b · `7521126` A-T9 · `95a3cb8` A-T6b
    - `4db3ec6` probe (new imports on new lines, as the plan's l.130 says) — final.
  - `$S/rebase` is branch `rebase63`: all 27 commits cherry-picked onto `32da5d9`, final `20e40c2`.
  - Worktrees `$S/base` (`88303f0`) and `$S/head63` (`32da5d9`) were used for timing.
  - Scripts are in `$S/scripts`:
    - `flow-*.test.ts`: `flowDefFor` for every game, BASE against the end;
    - `ev63-*.test.ts`: 6-3's Event table against 7-1's library;
    - `choosing.test.ts`, `seize.test.ts`, and the `t1*` to `t7*` probes.
  - Timing results are in `$S/logs/timing.txt`.

## Results

| Point | Passing tests (files) |
|---|---|
| BASE `88303f0` | 3833 (121) |
| T1 / T2 / T3 | 3851 / 3863 / 3880 |
| T4 as written | 3890, 1 fail (R5) |
| T4 + A-T4 | 3891 |
| lang + games + designer after T9 | 3592 (77), all pass |
| `d8cdc2a` (all amendments but A-T9 and A-T6b) | 3971 (122) = BASE + 138 |
| `95a3cb8` (all amendments) | 3973 (122) |
| `32da5d9` (6-3 done) | 3862 (121) |
| rebased `702b7a8` | 4002 (122) = 3862 + 140 |

`4db3ec6` and `20e40c2` change only import lines; the two files they touch pass, 197 tests.

- `tsc --noEmit` is clean at `d8cdc2a`, `95a3cb8` and the rebased final.
- The other games pass alone: hearts, color-match, venom, rent-day and hearts-demo, 8 files and 100 tests. Rent Day still pins 108 examples.
- Startup keeps 307 examples at BASE, at the end and on `32da5d9`.
- `flowDefFor` gives byte-identical output at BASE and at the end, for CREW_GAME and all five `.rules` games. All compile with 0 errors.
- No protected file changes, and nothing under `src/games` or `src/pages`. The core is pure once check 3 is fixed (R18). State is Json-only under `lang:*`.
- 21 findings: 19 fix-in-plan and 2 ruling-needed (R20, R21).

**Speed** (Startup file alone, `nice -n 19`, alternating runs):

| | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| BASE `88303f0` | 20.56 s | 22.19 s | 24.71 s |
| probe `d8cdc2a` | 20.92 s | 22.44 s | 24.53 s |
| `32da5d9` | 24.43 s | 24.27 s | 24.30 s |
| rebased `3acfd1a` | 25.09 s | 24.52 s | 23.18 s |

7-1 costs nothing measurable, since Startup has no window, no across zone and no naming fact yet. The file now runs about 24 s after 6-3, leaving about 6 s of room for 7-2a and 7-2b.

## Findings

**R1 (fix-in-plan) — The Assumed and narrowing lists point at the wrong places.**
Evidence:
- `CHOICE_LINE` is in `compile-util.ts` (l.72); `readChoiceLine` is in `compile-choice.ts`.
- `claimCards` and `fill` are in `library/example-phrases.ts`; `claimer` is in `examples.ts`.
- `NAMES_NO` is thrown by `resolveZoneIds` in `zones.ts`, which can't import from `board-phrases.ts`.
- `totalSeenByAll` (`worked-view.ts`) reads `filter.attribute`, so a `{names, player}` filter fails typecheck there. Without a fix it would also be judged card-alone. l.138 doesn't list it.

Amendments:
- l.234 → "`CHOICE_LINE` (`compile-util.ts`), `readChoiceLine` (`compile-choice.ts`)".
- l.236 → "`claimCards`, `fill` (`library/example-phrases.ts`), `claimer` (`examples.ts`)".
- l.237: "`MAKER_GAME`'s base" → "`CREW_GAME` (the base `MAKER_GAME` is built on)".
- l.138: after "`testNames` and `cardOnlyNames`" add "and `totalSeenByAll` (which refuses a `names` test)". Add `testNames` and `totalSeenByAll` to Task 1's Modify list (l.248).
- l.495 and l.501: `NAMES_NO` is defined and exported in `zones.ts`, and `board-phrases.ts` imports it. Add `zones.ts` to Task 3's Modify list.

**R2 (fix-in-plan) — An example's failure doesn't say whom a card names.**
Evidence: as written, the l.338 failing copy reads `Expected p1's purse to have a Stake p1 and a Stake p2, but it has a Stake and a Stake.`
A-T1 (`ed15b57`) gives `… to have a Stake whose maker is p1 and a Stake whose maker is p2, but it has a Stake whose maker is p1 and a Stake whose maker is p1.`
Amendments:
- Task 1 Interfaces, in `library/example-phrases.ts`:
  - add `export const namingFacts = (game: CompiledGame | undefined): string[]`;
  - `describeCard(match, naming: readonly string[] = [])` writes each naming key as ` whose maker is p1`;
  - `describeCards` adds the naming facts;
  - `zoneHasExactly`, `zoneHasInOrder` and `cardHasOnItExpected` pass `namingFacts(env.game)`.
- l.338, append: "with the message `Expected p1's purse to have a Stake whose maker is p1 and a Stake whose maker is p2, but it has a Stake whose maker is p1 and a Stake whose maker is p1.`"
- Add `library/example-phrases.ts` and `library/attach-phrases.ts` to Task 1's Modify list.

**R3 (fix-in-plan) — A card move to or from `its maker's purse` compiles silently.**
Evidence: l.514 refuses a named zone only in a pick. At T3, `A player may give a card from their stash to its maker's purse.` with no cost line compiles with no diagnostic. The same holds for `from its maker's purse`. A-T3 (`518614b`) refuses both.
Amendments:
- After l.514: "in a card move's from or to zone (no cost line) it is refused and no move is made: `NAMED_ZONE_IN_MOVE(text)` = `` `“${text}” can't be where a card is dragged from or to: say whose zone it is, as in “their ${zone}”.` `` (`compile-phase.ts`, `moveZones`)."
- After l.586: "both give `NAMED_ZONE_IN_MOVE("its maker's purse")` on their line, and the phase has no moves."

**R4 (fix-in-plan) — The stored `Waiting` isn't Json to TypeScript, and `ACTING_ELSEWHERE` is in the wrong file.**
Evidence:
- `Subject` and `MoveInfo` are interfaces, so `{ ...state.data, [WINDOW_KEY]: waiting }` fails typecheck.
- `unmetNeed` (`compile-util.ts`) gives `ACTING_ELSEWHERE`, and `compile-util.ts` can't import from `compile.ts`.

Amendments:
- l.969: move `ACTING_ELSEWHERE` to `compile-util.ts`, beside `unmetNeed`.
- l.929–932, add: "written as `waiting as unknown as Json` (interfaces of Json values only), read back by `waitingOf` as `as unknown as Waiting`; the same for `actionStopped`'s write of `verdict`."

**R5 (fix-in-plan) — Task 4 changes a pinned test line it doesn't name.**
Evidence: worked-view.test 'what the view says about each player' pins the registered player-value phrases, so it fails at T4. The lookups stay unshown either way. A-T4 (`8f34316`) adds them to the pin.
Amendments:
- l.665, replace the "report rather than change it" sentence with: "`shownPlayerValues` judges the four lookups not shown. `worked-view.test.ts`'s pinned registered player-value list gains them in registration order, with a comment. That is the only changed test line."
- Add `worked-view.test.ts` to Task 4's Test list and its `git add`.
- l.131–133: add this pin to the list of test lines that may change.

**R6 (fix-in-plan) — The hide refusal names the Potter, not the Stake.**
Evidence: `attachmentProblem` walks `state.cards` in order, and the Potter comes first. So the message is `The Potter in p0's crew is on the Vase, which is now in p0's stash. …`. A-T5 (`1a37ea1`).
Amendment, l.767: "**Review Focus:** from a table with the Stake on the Vase and no Potter on it (the check names the first card left behind in table order), p0 hiding the Vase is refused with the stash message above, and the state is unchanged;"

**R7 (fix-in-plan) — RIVAL_GAME's `Helped:` line isn't card-only.**
Evidence: `its {attribute} is more than {int}` is a card-number phrase, and worked-view's `CARD_ONLY` holds only card-value and card-subject phrases. So `shownFlags(RIVAL_GAME)` is `[]`, not l.880's `['helped']`. 6-1's G4 note says to write such a flag as `it is a card whose …`. A-T6 (`1ba1bd2`).
Amendment, l.849: `'  Only if its help is more than 0.'` → `'  Only if it is a card whose help is more than 0.'`

**R8 (fix-in-plan) — No line can clear a flag on cards that a return sends back, though "Left to 7-2" relies on one.**
Evidence:
- l.1457 says "The color flags are stripped from returned tokens by a card rule". But the only card-rule moment is `{cardclass} joins a card in a {perzone}`.
- `For each card …` reads only "the cards …" groups.
- `every card on it is …` reads only the holder owner's cards (spec R1).
- `every card in {zone} is not …` would also clear tokens that are still placed.
- Task 6's own test pins a returned stake as still `lit`.
- The notes ask for the clear: notes-for-7 l.4–5, and 7-3's G1.

A-T6b (`95a3cb8`): RIVAL_GAME with the new line before its return sends the stake back unlit, and p0's lit Potter stays lit.
Amendments:
- Task 6 Interfaces, after l.830: `.effect("every other player's card on it is not {cardflag}", everyOtherCardOnItIsNot, { needsCard: true, writes: 0 })` (clears the flag on `othersOn`; `mustBeKept` refuses a worked flag).
- Task 6 Step 1, add that test.
- l.1457 → "Each return line is preceded by `Every other player's card on it is not blue consultant.` (and red, qa)."
- README "Cards on other players' cards" bullet: add "`Every other player's card on it is not lit.` clears a flag on them first."

**R9 (fix-in-plan) — "Both" passes-to-the-left lines, but there is one.**
Evidence: OBJECT_GAME has a single such line (l.1012).
Amendment, l.1029: "Both `… passes to the left.` lines replaced … give" → "The `      The objection passes to the left.` line replaced by `      They get 1 coin.` gives".

**R10 (fix-in-plan) — The window clause's walk misses `{sharedzone}`.**
Evidence: with a worked flag `Only if the pile has a Vase.` (`CENTRE_HAS`), the window line chooses whom it asks by a hidden pile, unreported. A-T7 (`11184ce`) reports it.
Amendments:
- l.986: add `{sharedzone}` to the zones walked.
- After l.1036: "the same `Dusty:` with `  Only if the pile has a Vase.` gives `WINDOW_READS_HIDDEN('the pile')`."

**R11 (fix-in-plan) — `needsActing` changes phrases.test's pinned line, which no task names.**
Evidence: `RegisteredOpts` is `Required<PhraseOpts>`, so every registered phrase gains `needsActing: false`, and phrases.test.ts's pinned `get` line changes. A-T7b (`b78ad2e`).
Amendments:
- l.131–133: list that line.
- Add `phrases.test.ts` to Task 7's Files and its `git add` (l.1050).

**R12 (fix-in-plan) — p0's `stop` meets the phase gate first.**
Evidence: the flow checks the phase gate before the turn gate.
Amendment, l.1121 → "p0's `stop` is refused with `move stop not allowed in phase objection`, and p0's `let it go` with `not p0's turn`."

**R13 (fix-in-plan) — p1 can't hire to p0's Vase.**
Evidence: `hire` hires to the Vase in `workshop-p0`. A-T8 (`2711d34`).
Amendment, l.1131 → "From p1's turn (started), with a Statue in `workshop-p1` and p1's stakes in `holdings-p2` and `holdings-p0`, p1 hires the first Potter of the hall to that Statue, and `asked` is `['p2', 'p0']`." `hire` takes `onto`.

**R14 (fix-in-plan) — The `start` case finds an empty stash.**
Evidence: Setup is skipped, so nothing is dealt. A-T8.
Amendment, l.1134 → "With p1 holding p0's stake and a Statue put in `stash-p0`, p0's `start` moves it at once."

**R15 (fix-in-plan) — "with p0's turn started" isn't pinned.**
Evidence: unless `TURN_OF_KEY` is set, the first press starts the turn and resets the per-turn moves.
Amendment, l.1117 → "… passed through `markTurnStarted` (`turns.ts`); a table on p1's turn is marked the same way." The same applies to Task 9's table (l.1219).

**R16 (fix-in-plan) — A waiting action doesn't say whom its cards name.**
Evidence:
- `waitingView` gives `pickName`, so in 7-2b holders see just `Equity`.
- In R2's case, A can't tell that the token being sold is A's.
- The view carries no ids by design (l.56), so 7-3 can't recover the founder.

A-T9 (`7521126`): p0 sells a Stake whose maker is p2, and every seat's `waiting.cards` is `['Stake whose maker is p2']`.
Amendments:
- l.1209–1212: "… by its name where the seat sees its face, with the player each of its facts names (“Stake whose maker is p1”), and as “a face-down card” elsewhere …".
- Task 9 Step 1: add that test.

**R17 (fix-in-plan) — The HELD_GAME example reads a score before the game ends.**
Evidence: the `scores` expect needs `state.result`, so as written the example fails with `The game hasn't ended.` A-T10 (`e3ded94`).
Amendments:
- l.1330, before `  Then p1 scores 10`, insert `  And the scrap has a Vase, a Vase, a Statue and a Statue` and `  When p0 stops` (CREW_GAME ends when the scrap has more than 3 cards).
- l.1359 → "the example with `  And p0 scores 5` in place of `  And p0 scores 0` fails on that line."

**R18 (fix-in-plan) — Check 3 (pure core) prints the plan's own names.**
Evidence:
- As written, `grep '^+'` matches the diff header `+++ …/action-window.ts`.
- `\bwindow\.` matches the pinned field read `everyPhase.window.phase`, and any local named `window`.
- The amended check prints nothing at `d8cdc2a`, against both `88303f0` and `32da5d9`. A-T10b renames the locals to `answering`.

Amendments:
- l.1396 → `git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+[^+]' | grep -E "from '(pixi|react|@/components|@/utils)|(^|[^.[:alnum:]_])(document|window)\.|Math\.random|Date\.now"`.
- Add to Global Constraints (near l.89): "a local holding `everyPhase.window` is named `answering`, never `window`."

**R19 (fix-in-plan) — Checks 1 and 4 expect the wrong lines.**
Evidence:
- Check 1 prints Task 1's test line `readsPressCard(lib, { mode: 'all', … })`. `mode` is the existing `CondGroup` field (`types.ts` l.53), and BASE uses the same field.
- Check 4 prints the jinx lines and phrases.test's pin (R11).
- Check 4 prints no `VOCAB_TYPES` line when the new entry goes on a new line, as l.316 allows.

Amendment, l.1403 → "The first check prints only Task 1's `readsPressCard(lib, { mode: 'all', … })` line (`CondGroup`'s field). The fourth prints only 6-1's jinx assertions (Task 2) and `phrases.test.ts`'s pinned options line (Task 7). It also prints the `VOCAB_TYPES` line if the new entry is written into it."

**R20 (ruling-needed) — Should the Round Start step skip an Investor whose Founders have no product? (notes-for-7 l.1)**
Evidence:
- No phrase tests the zones of the player a card names; `its owner has …` reads the owner.
- 7-1's `another player tied to them by …` is symmetric (it also ties players who hold your token) and needs a filter.
- 7-2a accepts the stop (l.1241) and pins it in its example 2 (l.152–153).

Options:
- **(a)** In Task 3, add `its {cardplayer} has a card in their {perzone}` and its `has no card` form (`needsCard`).
  - `card-alone.ts` must exclude both, so the speed-up 2 pin fails until that's decided.
  - 7-2a then needs two worked flags (development and operations) and a new auto-pass guard, and its example 2 changes.
- **(b)** Keep 7-2a's stop. It costs one confirm press per Investor per Round Start, and the auto-player confirms anyway.

Recommended: (b), with (a) recorded as a page-comfort item for 7-3's pre-flight.

**R21 (ruling-needed) — Add `, choosing p3` for a player choice that isn't a payment? (notes-for-7 l.2)**
Evidence (`choosing.test.ts`: RATE_GAME, 3 players):
- `When p0 offers the Stake, paying p2` passes;
- `When p0 offers the Stake, choosing p2` fails with `“p2” isn't a choice here: this press chooses nothing.`

7-2b's three `, paying` lines (l.535, l.541, l.543) are flagged at its l.844 as reading oddly.
Options:
- **(a)** In Task 3: when a press asks a player (`CHOICE_LINE`) and has no named options, words after `, choosing` that read as players fill the player choice. `, paying` stays valid.
  - Tests in `compile-example.test.ts`: `, choosing p2` passes like `, paying p2`; `, choosing p9` reports the unknown player.
- **(b)** Keep `, paying`.

Recommended: (a).

## 6-3 dependencies

6-3 is done at `32da5d9`. All 27 probe commits cherry-pick onto it, with one textual conflict: T2's appended `describe` in `board-view.test.ts` meets 6-3's appended `describe('prices')`; keeping both resolves it. On top of 6-3, the suite passes 4002 tests and `tsc` is clean. The steps that read text 6-3 changed:

- **T1 Step 3** (worked-view `testNames`, `cardOnlyNames`, `totalSeenByAll`) applies unchanged. 7-1 never calls `readsOnlyCards`, whose signature 6-3 changed, nor `thenRefs`, which 6-3 exported. T1's guards hold: `shownFlags(MAKER_GAME)` is `[]` and `standIns` is `{}`.
- **T2 Step 3** (`board-view.ts` pick lists): 6-3's `paidNumbers` and `gameNumbersIn` edits don't overlap.
- **T4 Step 4** (`shownPlayerValues`, now read with `centre`): the lookups stay unshown, and 6-3 didn't touch R5's pin.
- **T6 Step 3** (`cardOnlyNames` with 'others on it') applies unchanged. With R7, `shownFlags(RIVAL_GAME)` is `['helped']` under 6-3's centre reading.
- **T9 Step 3** (`SeatExtras`, `readSeatExtras`, `waitingView`): 6-3 didn't change these. Its new designer tests don't pin a whole `seatExtras` object, and they pass.
- **Every Step 4 that runs `src/pages/designer`** (T1, T2, T5, T9) passes against 6-3's new tests.
- **T10 Step 3:** 6-3 added an "In the playtest" bullet inside 6-1's paragraph. 7-1's paragraph still goes right after 6-1's, before "A table too big for one screen".
- **T10 Steps 5–6:** BASE becomes `32da5d9`.
  - Checks 2 and 5 print nothing.
  - Check 3 needs R18, and check 4 prints the lines R19 names.
  - The Startup count stays 307.
  - Re-time against `32da5d9`: about 24 s.
- **The Event table's `effect` column:** 6-3's exact table under BASE's library and 7-1's gives 0 diagnostics and 307 passing examples. With the real rules at `32da5d9`, the rebased suite passes.

## Gaps (with homes)

1. **7-3: telling apart cards that name different players.**
   - Two Stakes naming p0 and p2 in p1's holdings both read `Stake (p1's holdings)` in 6-3's `placesOf`. `keptBadges` and `boardBadges` are `{}`, and `cardLabel` gives `Stake`.
   - 6-3's ruling that cards still alike "are equivalent to the seat" is false for naming cards.
   - 7-3 should add the naming fact to the tie-breaker and the lists. l.1472 already asks for this; R16 covers the waiting view.
2. **7-3 (G2): the Share Price before pressing.**
   - Lookups are judged not shown (R5).
   - The Invest button's greyed reason gives words, not the price.
   - The rulebook makes the price public, so 7-3 must show a lookup or a price line.
3. **7-3: a posted stake on the page.**
   - Board text lists p1's stake under p0's Vase and leaves it off p1's line.
   - The canvas draws it on neither side.
   - This is l.1473's item, from spec R1.
4. **7-2a: Consultant colour.** With R8's three clearing lines before Pivot's return, plus its l.967 clearing at placement, no flag goes stale.
5. **Recorded limits (l.1487):** add that a card fact named "player" would make `its player's …` collide with Rent Day's `its player gets …`. Startup uses "founder".
6. **Plan text:** cut the task briefs again from the amended plan. R12–R15 change Task 8's Step 1, and R17 changes Task 10.

## Checked and clean

- **Global constraints.**
  - No Startup word in shared code. Check 1 prints only R19's line; my own "Veto" comment was fixed in `4212419`.
  - No protected file; nothing in `src/games` or `src/pages`.
  - New fields are optional; state is Json-only under `lang:*`.
  - The `+` lines contain no "supply", "partner" or "veto", and every "stake" is the fixture card, never money.
- **Spec R1.**
  - A placed card stays in its owner's across zone, holding `lang:on` and `lang:on-seat`.
  - The integrity check accepts a holder in another seat only for an across card, and only in a public zone of the stored seat. Anything else gets "which is now in".
  - `cardsOn` is the holder owner's own; `othersOn` gives the rest.
  - Every Startup example passes unchanged at each task.
- **Spec R2 and the rulebook.**
  - Task 8's R2-shaped case passes.
  - The burn goes back to the maker's purse, matching §17.B.5: "Burn … back to the Founder. … The AP is wasted".
  - Only buttons with a cost are answered.
  - Holders are asked from the acting player's left, skipping seats that are out.
- **Notes-for-7.**
  - The maker condition is R20; `, choosing` is R21.
  - Non-Compete's two presses are covered by `They pay 5 to its owner.` and `Move it to their purse.`
  - Stale flags: R8. 7-3 G2: Gap 2. 7-3 G3: Gap 1.
  - 7-1 doesn't change `fittedLayout`; T5's guard holds at 776.
  - Long-runs retune: the window restores the turn as it stood. The plan's "last move" case relies on CREW_GAME's own rule, not on the turn moving by itself.
  - 6-3's 7-3 notes are untouched: 7-1 adds no page text.
- **5-1 M2 / the handoff's "7" bullet: still unreachable.**
  - An across row must be public (`ACROSS_NEEDS_EVERYONE`), and centre zones can't hold cards on cards.
  - So slice 7 makes no owner-only zone of cards on a public card, and `mayHideFromPresser`/`reportHiddenCardReads` need no change.
- **Speed-up 2's card-alone pin.** No phrase was added to the card-number, card-value or card-subject libraries. `card-alone.ts` and its test are untouched. `OF_THE_CARD` excludes the new group, and `testedBy` returns null for a names filter.
- **Speed-up 3's `CENTRE_HAS`/`sharedZoneHas` pin.** No new phrase tests a shared zone.
- **The plan's forward notes.**
  - Slice 10's `For each card in their portfolio, move it to its founder's equity.` works in fixture words (`seize.test.ts`).
  - Slice 8's Immunity test is Task 1's `target owner` filter, which `readsPressCard` counts.
- **Rent Day:** its `they pay its … to its owner` and `its player gets …` behave as before, and its 108 examples pass.
- **The README as written** matches the built phrases word for word; R8 adds one clause.
