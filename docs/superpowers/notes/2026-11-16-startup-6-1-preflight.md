# Pre-flight: plan 6-1, Tasks 1–6, and the notes' owner-scope player-value ruling

- **HEAD scanned:** `2c347c0` on `claude/peaceful-curie-rdfkow`. Re-checked at the end of the scan: unchanged, working tree clean. Nothing under the repo was edited except this file.
- **Inputs:**
  - the plan: Global Constraints with the controller amendment (2026-11-16), Review Focus, Assumed list, Tasks 1–6, Left to 6-2/6-3, Gaps and Forward notes;
  - `task-1…6-brief.md` (each is verbatim from the plan), `constraints.md` and `progress.md`;
  - `docs/superpowers/notes/2026-10-19-startup-notes-for-6-preflight.md` (the 6-1 item and G1), and 5-3's pre-flight report for style;
  - the code and tests named in §1, `README.md`, and the five games' rules.
- **Probe paths.** All are under `SP = /tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/`.
  - **`pf61/`**: `git archive HEAD` plus `node_modules`, kept as its own local git repo (it is not the turnhout repo). It holds one commit per step:
    - `238b599` base;
    - `a6f674e` Task 1;
    - `5a65350` Task 2;
    - `ce64252` and `718e7d1` Task 3;
    - `b46c8ff` Task 4;
    - `1ea43fb` Task 4's typecheck fix and Task 5;
    - `a112ffc` Task 6 as written (V1);
    - `7a7be93` Task 6 with R1 (V2) and its tests;
    - `7ea5964` R5 (the owner-scope ruling).
  - **`pf61/src/zprobe/`**: `bun` scripts, untracked.
    - `atonce.ts`: the full diagnostics of Task 4's at-once case.
    - `lowerhidden.ts`: Task 3's lower-of lines with Task 1's hidden target.
    - `t1extra.ts` and `t1engine.ts`: the kept `tired` line, and a 3-player `JINX_GAME` engine.
  - **`pf61.diff`**: the probe against base, 39 files, +1294 / −55.
  - **`pf61-base/`**: an untouched archive.
  - **`pf61-snap-<tag>/`**: the snapshots the full runs used.
  - **`pf61-tools/`**:
    - `vt.sh <dir> <log> files…` runs single files;
    - `full.sh <tag>` runs `bun run test` and `bun run typecheck` on a snapshot.
  - **Logs** (`SP/pf61-*.log`):
    - `base` (3658);
    - per task: `t1-…t6-` `step2`, `step4`, `full` and `tsc`;
    - `t6-step2b`, `t6-ex-noclaim` and `t6-startup-new`;
    - `t6v1-full` and `t6v1-tsc` (Task 6 as written);
    - `owner-step2` and `owner`;
    - `final-full` and `final-tsc`.
  - Every vitest and bun run was in the foreground and has finished; `pgrep` finds no vitest, bun or node process.

## Summary

**Works as written? No.** Task 5 passes as written. Tasks 1, 2, 4 and 6 each fail at their own Step 4 until they are corrected; Task 3 fails only through a trap in its test helper.
- **Task 6 (High).** As written, it says to rename unless the Setup runner says Setup. That makes 4 existing shuffle tests fail, and the plan forbids changing them. **R1** tells Setup apart from play with no new field: a shuffle renames only while the turn is in one of the game's own phases.
- **Task 1.** The list "another player's workshop or another player's crew" is read whole, and does not compile (R2). Two of its tests need small fixes, and `worked-view.ts` needs a narrowing the plan does not list (R6).
- **Task 2.** `CHARM_GAME`'s `Charmed:` line is not card-only, so `shownFlags` is `[]` (R3).
- **Task 4.** One expected refusal message is wrong (R4). The at-once case gives four more diagnostics, and `back` needs a narrowing (R7).
- **The notes' 6-1 item** is R5. It is homed in Task 2, written and probed. Startup's pins are unchanged at HEAD.

**Rulings:** 10 in all.
- 1 High: R1.
- 4 Medium: R2, R3, R4, R5.
- 5 Low: R6–R10.

**Gaps:** 5 that no ruling inside the plan fixes (§5).

**Tests:** the final probe, with all six tasks and R1–R9 applied, gives **3726 passed, 0 failed, 120 files** (BASE 3658 / 119). **Typecheck is clean.**

**Constraint checks:** the words, protected-file and purity checks print nothing. The only test line removed is the phrase-set title. Outside the language, only `src/games/startup-simulator.test.ts` changes (+26, appended).

**The other games:**
- Startup's 243 examples and Rent Day's 108 are unchanged, and so are the long-run tallies.
- Color Match's in-play shuffle now renames cards. None of its tests pins an id.

## 1. Names at HEAD

| # | Name (plan's) | ✓ / differs | Evidence |
|---|---|---|---|
| 1 | `END_STEPS_KEY`, `STEP_PASSES_PHRASE`, `roundFinished`, `clearTurnMarkers`, `startPlayerOf`, `ROUND_KEY`, `TURN_OF_KEY`, `LAST_TURN_KEY` | ✓ | `turns.ts:24/27/78/107/47/21/15/18` |
| 2 | `stepPassesLeft`, `nextStep` (private), `turnPassesLeft`, `STEP_OUTSIDE_THE_STEPS`, `TURN_IN_THE_STEPS` | ✓ | `turn-phrases.ts:52/40/24/14/12` |
| 3 | `startTurn`, `turnWaiting`, `endStepsDue`, `startEndSteps`, `endStepsDone`, `runInPhase`, `env.runLine` | ✓ | `runtime.ts:366/308/329/340/353/240/105` |
| 4 | `compileEveryPhase`, `everyPhaseEffects`, `effectsOf`, `linesDoing`, `warnUnreachable`, `endSteps`, `warnStepsNeverPass` | ✓ | `compile.ts:667/688/693/759/704/735/769` |
| 5 | `STEPS_NEVER_PASS`, `STEPS_GO_TO`, `STEPS_AFTER`, `STEPS_AT_ONCE` | ✓ | `compile.ts:108/103/105/100` |
| 6 | `GO_TO_PHASE` | **differs** | It is `GO_TO_PHRASE = 'go to {phase}'` (`library/flow-phrases.ts:143`), imported by `compile.ts:11`. R10. |
| 7 | `LINE_ABOUT` "ends at ` goes up by `" | ✓ (wider) | `compile.ts:80`: `(?:is\|are\|goes up by\|goes down by)`. Task 2's "This line is about “wage”" test passes. |
| 8 | `FLAGGED_VALUES` (4 entries), `flaggedHas`, `flaggedHasIts` | ✓ | `card-value-phrases.ts:22/28/31` |
| 9 | `FROM_COLUMN`, `CARDS_ON_IT`, `… is at least {int}`, `… times its {attribute}` (last) | ✓ | `card-subject-phrases.ts:42/33/95/99` |
| 10 | P16: `Press`, `buttonsFor`, `fitsWording`, `wordingsOf`, `pressesCardButton` | ✓ | `card-pick-phrases.ts:105/125/112/141/221` |
| 11 | `ontoZoneOf` | **differs** | It is `ontoZonesOf` (`card-pick-phrases.ts:108`). It returns `(string \| null)[]` from `ontoPlaces` + `moveZoneId`. With Task 1 it reads `ontoZoneIds`, so the `ontoPlaces` import line (`:11`) becomes unused and goes, under `noUnusedLocals`. R6, R10. |
| 12 | 5-1: `ontoAlso`, `ontoPlaces`, `OR_SEPARATORS`, `splitList`, `compileCardPick`, `reportHiddenCardReads`, `ontoPrompt`, `ontoCandidates`, `aboutCards` | ✓ | `types.ts:86`, `declared-moves.ts:36`, `phrases.ts:21/29`, `compile-phase.ts:534/597`, `declared-actions.ts:94/125/180` |
| 13 | The target phrases; the reshuffling deal | ✓ | `card-pick-phrases.ts:272`; `queue-phrases.ts:136`. `dealUpToShuffling` is at `:66`, and its shuffle at `:77` as the plan says. |
| 14 | Phrase-set test "are these 22"; `COACH_GAME`; `pressFlags`, `holderFlags` | ✓ | `worked-view.test.ts:142`; `testing.ts:521`; `worked-view.ts:153/164` |
| 15 | `numberIfAny` (private), `cardNumber`, `cardHasFlag`, `cardValueOf`, `movedCard`, `theTargetCard`, `theyOf`, `describeZone`, `soleZone` | ✓ | `support.ts:139/129/111/103/38/77/46/17/25` |
| 16 | `gameNumber`, `setGameNumber`, `isOut`, `markOut`, `playersIn`, `nextIn`; `transfer` | ✓ | `board-state.ts:186/193/237/242/247/252`; `board-phrases.ts:141` |
| 17 | `zoneIdFor`, `zoneInfo`, `resolveZoneIds`, `relocate`, `chooseNext`, `HOLDER_KEY`; `setPhase`; `innerEffect` | ✓ | `zones.ts:45/58/120/163/211/13`. `relocate` takes `game` as its 4th argument. `game-state.ts:45`; `compile-util.ts:408`. |
| 18 | `seatExtras`, `pickedAs` | ✓ | `board-view.ts:539`. `pickedAs` (`:356`) is private and is reached through `seatExtras`. |
| 19 | `the {gamenumber} is {int}`; `fill`; fixtures | ✓ | `game-numbers.ts:56`. `testing.ts`: `TURN_GAME:345`, `ROUNDS_GAME:368`, `STEPS_GAME:385`, `CREW_GAME:400`, `WORKED_GAME:444`, `RESHUFFLE_GAME:536`, `fixtureEnv:730`, `fixturePhase:767`, `vocabFor:779`, `runPhrase:801`. |
| 20 | Task 6: `NEXT_CARD_KEY`, `makeCard`, `buildCards`, `deckOf`, `homePileOf` and its two callers, `claimer`, `shuffleOne`, `shuffle`, `shuffleRestInto`, `isRevealed` | ✓ | `cards.ts:173/180/125/147/163`; `draw-phrases.ts:65` (`:71`); `debt-phrases.ts:58`; `examples.ts:36`; `flow-phrases.ts:35/48/86`; `derive-scene.ts:10`. `deckOf` has no other caller. |
| 21 | "How Setup's lines are run (`runtime.ts`)" | **differs** | They run in the flow's first `PhaseDef`, `SETUP_PHASE = '__setup'` (`build.ts:28`, `:67` `onEnter: game.setup.map(effect)`), through `lang:effect` → `runtime.run`. The turn's phase is `'__setup'` while they run. No `PhraseEnv` field says "Setup". **R1.** |
| 22 | `lang:*` keys holding card ids | none | In `state.data`, no `lang:*` key holds a card id. `lang:last-drawn` (`board-state.ts:53`) holds a name and sentences, and `lang:turn` (`:26`) holds move types. Only a card's `data['lang:on']` (`HOLDER_KEY`) holds one, and `renameCards` refuses such a card (`NOT_TOLD_APART`). |
| 23 | Zone visibilities that rename | — | **Startup:** the strategy deck is secret (rules `:159`), the discard public (`:160`), and the strategy hand and brainstorm owner (`:172–173`). The talent, seed, growth and milestone decks are secret but shuffled in Setup only. **Color Match:** the draw pile is secret and the discard public; its in-play `Shuffle the discard pile, except its top card, into the draw pile.` renames. **Hearts, Venom, Rent Day:** Setup only. |
| 24 | The 2-player seed 4 long run | ✓ (with a note) | It holds the only reshuffle. `twoPlayerGame` (`startup-simulator.test.ts:2973`) is local to the long-runs describe, while `playGame` (`:1281`) is top-level. R8. |
| 25 | README l.152 ("Until plan 6-1, a reshuffle keeps each card's id …") | ✓ | `README.md:152` |
| 26 | The owner-scope phrases; `readsOnlyCards`, `readsTheCardAlone`, `totalSeenByAll`, `everyoneSees`, `shownPlayerValues` | ✓ | `compare-phrases.ts:98–99`, inline strings; `worked-view.ts:78/178/184/172/197` |

Counts: 23 ✓, 3 differ (rows 6, 11, 21), 0 missing.

## 2. Probes

### Task 1 (`a6f674e`)
- **Step 2:** 8 failed across the 5 files (`pf61-t1-step2.log`), and `declared-actions.test.ts` fails at collection.
- **As written, `JINX_GAME` does not compile.**
  - The whole target text "another player's workshop or another player's crew" matches `ANOTHER_PLAYERS`, because `(.+)` is greedy. `splitList` tries the whole text first, so it is taken as one part.
  - It gives `I don't understand “their workshop or another player's crew” here.` (R2).
- **With R2:**
  - `pick` is exactly the plan's. `workshp` gives the plan's diagnostic with `['workshop']`, and the scrap gives the plan's diagnostic.
  - The Review Focus `Only if` line is refused with the plan's message, and the CREW guard holds.
- **The OTHERS_ONLY_AS_TARGET case gives a second error** while it keeps `      The target card is tired.` (`zprobe/t1extra.ts`): `“The target card is tired” only makes sense in a button that picks a card and the card it goes to, like “A player may stack a card from their hand to a card in the row.”` (R6a).
- **"A 3-player `JINX_GAME` engine" can't be built through Setup:** `There are no cards left in the pile.` (`zprobe/t1engine.ts`). `CREW_GAME` deals 2 jobs to each stash. The probe builds an arranged 3-player state with turn `{ current: 'p0', phase: 'working' }`, as Task 4's `table` does. All of the plan's candidates, presses and refusals then hold (R6b).
- **Typecheck flags `everyoneSees`** (`worked-view.ts:172`), a narrowing on `ZoneRef` that the plan does not list (R6c).
- **Step 4:** the 5 files pass, 573 tests (`pf61-t1-step4.log`). The full suite gives 3670 (+12), and typecheck is clean.
- Startup's three "asks an example …" tests, `TWO_HIRES_GAME` and `COACH_GAME` pass unchanged.

### Task 2 (`5a65350`)
- **Step 2:** 4 failed (`pf61-t2-step2.log`), and `card-value-phrases.test.ts` fails at collection.
- **As written, `shownFlags(CHARM_GAME)` is `[]`.**
  - `Only if its charms are more than 0.` is registered in `card-number-phrases.ts:121`, which is outside `CARD_ONLY`.
  - That is the same class as 4-3's G1, noted on Startup's pin (`startup-simulator.test.ts:~4047`: "its bugs are more than 0" is not counted as reading only the card).
  - **R3:** `Only if it is a card whose charms are more than 0.` gives `['charmed']`.
- **Every value is as planned:**
  - Potter: 1/1/1/null; charmed 3/3/2;
  - with the Statue: 2, uncharmed 0, Tinker 1, Smith 0;
  - tired 0;
  - Vase: 3/1, and 9/3 with 2 charms;
  - a charmed Vase's `wage` is null.
- **Compiled:**
  - the bonus refs and gusty's `{sharedzone} has {card}` are as planned;
  - `This line is about “wage”, but it is under Bonus:.`;
  - `There is no card fact called “charmd”.`
- **Phrase-set test:** "are these 30", with the 8 new entries. `CARDS_ON_IT` is unchanged.
- **Step 4:** 317 pass. The full suite gives 3675 (+5), and typecheck is clean. Startup's `shownFlags`, `standIns` and `shownPlayerValues` pins are unchanged. There is no `ambiguous` diagnostic.

### Task 3 (`ce64252`, `718e7d1`)
- **Step 2:** 4 failed, and one file fails at collection.
- **Step 4:** 267 pass. The full suite gives 3682 (+7). Typecheck is clean once a probe-only unused `statue2` is removed.
- **Every price is as planned:** 7/8/8; 8/8 with a Vase in the scrap; at 1 coin, 0 or refused with the line's words; both `NEITHER_HAS` messages. The fee goes 1 → 3, `fea` is refused, and the example passes.
- **Helper trap (R9).**
  - A test table that sets coins on `initialState` and then calls `createEngine` loses them: `createEngine`'s `withBoardData` resets the counters unless `PIECES_KEY` is set.
  - The first probe run saw 9 coins → 8 where 0 was expected.
  - Calling `withBoardData(state, game, seats)` before `setCounter` fixes it.
- **Hidden targets** (`zprobe/lowerhidden.ts`, Task 1 × Task 3):
  - the lower-of `Only if` line on `another player's stash` is refused with the hidden-read message;
  - on `another player's workshop` it gives no diagnostic;
  - the `Then:` payment on a hidden target gives no diagnostic (Gap G1).

### Task 4 (`b46c8ff`, `1ea43fb`)
- **Step 2:** 21 failed, and the 2 guards pass (`pf61-t4-step2.log`).
- **Step 4,** with `end-steps.test.ts` and `runtime.test.ts`: 142 pass. The full suite gives 3705 / 120 files (+23). Rent Day keeps its 108 examples.
- **The plan's refusal is wrong.**
  - As built, p0's `work` is refused with `move work not allowed in phase levy`: the phase gate comes before the turn check.
  - `not p0's turn` is what p0 gets for pawning a card of `list-p1` (R4).
- **The at-once case gives more than the plan's one error** (`zprobe/atonce.ts`). There is the plan's error on line 24, plus:
  - `warning 58 Nothing leads to the phase “levy”.`;
  - `error 64 “they have at least 2 coins” only makes sense in a rule about a player, such as a move, an action or a “When a player …” rule.`;
  - `error 65 “They pay 2” only makes sense in a rule about a player, …`;
  - `error 67 “their list is empty” only makes sense in a rule about a player's move.`

  These follow from the phase no longer taking turns (R7a).
- **Typecheck** (`pf61-t4-tsc.log`):
  - `turn-phrases.ts(107)`: `string | undefined` is not assignable to `RoundSteps.back`, because `turn.phase` is optional (R7b).
  - A copied, unused `thrown` gives TS6133 (R7c).
- **Every other bullet holds as written,** with the plan's numbers:
  - the start, the pawns and every step at once;
  - the out seat and the next round;
  - "not finished as its steps end";
  - both refusals while playing;
  - undo and replay, clearing, and the example.

### Task 5 (`1ea43fb`)
- **Step 2:** PASS, 69 tests, as the plan expects (`pf61-t5-step2.log`).
  - Every `.replace` of `OMEN_GAME` finds its text, and the last one hits the take button.
  - CHARM (with R3), PRICE, both OMEN examples and the failing PRICE example (it names its line) all behave as planned.
- **Full suite:** 3710 (+5). Typecheck is clean.
- The README paragraph and Step 5's checks were run over the probe (see "Constraints" below). The README itself was not written in the probe.

### Task 6 (`a112ffc` V1, `7a7be93` V2)
- **V1, the plan as written** (rename unless Setup, where Setup means `'__setup'` or a flag from the Setup runner): **4 existing tests fail** (`pf61-t6v1-full.log`). Each is a fixture test that runs a shuffle with no turn, so V1 renames:
  - `flow-phrases.test.ts > shuffle > reorders the zone with the game’s own rng and rewrites the slots`: expected `['d0','d5','d2','d4','d3','d1']`, got `c52…`;
  - `… > shuffle > shuffles every zone of “each hand”`;
  - `… > moving cards > shuffles all but the top card of one zone into another`;
  - `queue-phrases.test.ts > a deal that shuffles a discard back in > shuffles the done pile into the pile when the pile runs out, and goes on dealing`: expected `['c0','c1','c4']`, got `['c0','c14','c15']`.

  The constraints forbid changing these, so this is **R1**.
- **V2** (R1: rename only while `state.turn.phase` is one of `game.phases`): every existing test passes. The full suite gives **3723 (+13)**, and typecheck is clean (`pf61-t6-full.log`, `pf61-t6-tsc.log`).
- **New tests** (13):
  - **`flow-phrases` (4).** A 9-card `fixtureGame` with `fixturePhase('play', [])`:
    - the deck becomes `c9–c12` in slots 0–3, as the last four of `state.cards`;
    - `RENAMED_KEY` maps each to the shuffled order's old id, and `NEXT_CARD_KEY` is 13;
    - the Setup guard (turn phase `'__setup'`) and the public guard pass;
    - shuffled-into gives deck `['c5','c9','c10','c11','c12']` and leaves the discard's top `c4`.
  - **`queue-phrases` (4), on `RESHUFFLE_GAME` with turn `working`:**
    - a deal after the reshuffle gives list `['c0','c14','c15']`, `NEXT_CARD_KEY` 16, and `dealtIdOf` gives the done-pile ids;
    - **no one can follow it:** from done piles A,B and B,A with equal rng, every seat's `deriveScene` shows the same ids in the same slots;
    - twice renamed: one entry, and the `buildCards` id;
    - replay with `loadLog` is equal, and `undo()` gives back the old ids.
  - **`cards.test.ts` (2):** `NOT_TOLD_APART` reads `The Vase in p0's workshop has a card on it, or sits on one, so the others could still tell it apart.` (and the same for `The Potter in p0's crew`), and the map flattens.
  - **`draw-phrases.test.ts` (1):** a renamed Free Pass goes to `fate-pile`. Before the change, it threw `A card made from a stack that never runs out has no pile to go back to.`
  - **`examples.test.ts` (1):** the example fails with `Line N (…): No card matches “a Dust”.`, asserted with `stringContaining` (R8).
  - **`startup-simulator.test.ts` (1, appended):** it plays `playGame(2, 4, watch)` itself, and checks every Brainstorm press whose deck or draws hold an id not in the deck before. There is 1 reshuffle, and more than 0 ids are checked.
- **Step 2,** with the interfaces in place but `renameShuffled` switched off (`pf61-t6-step2.log`, `-step2b.log`):
  - 6 new tests fail (flow 2, queue 4), and the guards pass.
  - The Startup test fails: `p0 after move brainstorm after flushing some cards from their strategy hand: expected [ 'c87 in strategy-deck', …(24) ] to deeply equal []`. That is 25 ids the rival could follow.
  - With the `claimer` change reverted, the examples test fails (`pf61-t6-ex-noclaim.log`): the Given takes the renamed Dust again.
- **The controller's checklist:**
  - **Which games break:** none.
    - Color Match renames in play (its draw pile is secret), and its tests pin no id; its example only counts.
    - Hearts, Venom and Rent Day shuffle in Setup only.
    - Startup's 243 examples, the long-run tallies and the replay test are unchanged. Its test file takes 13.4 s → 14.1 s.
  - **Telling Setup apart:** R1. No field is needed. A Setup-runner field fails because the fixtures above run with no turn and no flag.
    - An inverse field (`inPlay`, set by the runtime for every line after Setup) would work, but it needs plumbing in `runtime.run`, `fixtureEnv` and the examples' env.
    - The phase test derives the same thing from the state. `example-phrases.ts` (`declaredMove`) already uses the same test: `env.game.phases.find((p) => p.id === env.state.turn?.phase)`.
  - **`lang:*` keys holding card ids:** none (row 22). `HOLDER_KEY` is refused with `NOT_TOLD_APART`.
    - That cannot happen in legal play: `attachmentProblem` already refuses a card that sits on a card gone out of sight, and a pile is out of sight.
    - The plan's "Say which in the report" is answered: refused.
  - **Undo and replay** stay exact, since renaming is deterministic (no rng, the counter in state). See the queue test above.
  - **Examples:** `claimer` claims by `dealtIdOf`.
  - **`homePileOf` / `deckOf`:** both callers read `dealtIdOf`. `deckOf` has no other caller, and `byCardId` only orders.
  - **Page animation:** `TableModel.setScene` places a new id at its target with no glide, and drops the vanished ids. A reshuffle's cards therefore jump into the deck instead of gliding (Gap G3; `diff.ts`'s `reconcile` is not wired).
  - **Pinned ids:** nothing in Startup's tests pins an id or `NEXT_CARD_KEY` after a reshuffle.
  - **Task 5's omen reshuffle** renames too: round-start lines run in a game phase. No Task 5 example reshuffles, so nothing there changes.
  - **The 2-player seed 4 test** can be written, as an appended describe that plays its own game (R8). It took 0.24 s alone.
  - **`state.cards` order:** renamed cards move to the end of `state.cards`, as the plan says. That reorders `byCardId` example picks and `everyFlaggedCardGoesTo` only among renamed cards. No test or tally changed.

### R5, the owner-scope ruling (`7ea5964`)
- **Without the ruling,** the first of the 3 new tests fails (`pf61-owner-step2.log`): `shownPlayerValues` is `[]`, where `['job pay']` is expected.
- **With it:** 64 of 64 pass in `worked-view.test.ts`, and the full suite gives **3726 / 120** (`pf61-final-full.log`). Typecheck is clean (`pf61-final-tsc.log`).
- **Startup at HEAD is unchanged.**
  - Both pinned `shownPlayerValues` lists (`:4044`, `:4098`) still pass.
  - `Decaying:` (rules `:473–475`) reads `its owner has no card in their ops team that is stopping decay`. But `Stopping decay:` reads `its training xp is more than 1`, which is not card-only (the same class as R3). So `operational revenue` stays unshown.

### Hidden information (rival views)
- **Task 1:**
  - an `others` zone is judged by its own visibility: `mayHideFromPresser` reads `others`, and an `owner` zone counts as another seat's;
  - an `Only if` reading a target in `another player's stash` is refused, for both `not tired` and Task 3's lower-of;
  - `seatExtras` offers such a target as `a face-down card`;
  - a seat that is out offers no candidates, and a press onto it is refused with the prompt, as is a press onto the presser's own card.
- **Task 2:** `gusty` reads the scrap and is never shown. `shownFlags` is `['charmed']` only.
- **Task 4:** no new reads. The seat switcher follows `turn.current` through the steps (left to 6-3).
- **Task 6:**
  - the server sends each seat `deriveScene(tableDef, { cards }, seat)` only (`game-server.ts:52`), so `lang:renamed` and `lang:next-card` never reach a seat;
  - in the scene a renamed card has a new id, sits at the end of the list, and is numbered in slot order;
  - the A,B / B,A test and the Startup test show that no seat can follow one.
- **R5:**
  - it applies only where every seat sees the owner's zone (`everyoneSees({ each })`), and the clause's own tests are traced through `readsOnlyCards`;
  - an owner-only zone stays unshown (guard test);
  - `shownFlags`, `standIns`, `pressFlags` and `holderFlags` don't change.

### Constraints (the plan's Task 5 Step 5 checks, run on `pf61` from `238b599` to `7ea5964`)
- **Words** (slices 3–6, with `events?`): nothing.
- **Protected files:** nothing.
- **Purity:** nothing.
- **Existing test lines removed or changed:** only `-  it('are these 22: …`.
- **Outside the language:** `src/games/startup-simulator.test.ts | 26 +` (appended). `README.md` would follow from Tasks 5 and 6; the probe did not write it.
- **New `state.data` keys:** `lang:round-steps` and `lang:renamed` only. No card `data` key is added.
- `compile.test.ts`'s `everyPhase` `toEqual`s hold, since `roundSteps` is left out.
- **Implementer note:** the probe edited some existing import lines to add names (`cards.ts`, `examples.ts`, `draw-phrases.ts`, `debt-phrases.ts`, `queue-phrases.ts`). The constraint puts new names on new `import` lines. The one exception is the `ontoPlaces` line in `card-pick-phrases.ts`, which goes because it becomes unused (row 11).

## 3. Pair table

| Files / names | Tasks | Interaction | Status |
|---|---|---|---|
| `testing.ts` | T1 `JINX_GAME`, T2 `CHARM_GAME`, T3 `PRICE_GAME`, T4 `LEVY_GAME`, T5 `OMEN_GAME` | Each must go below its base (TDZ): JINX and PRICE below `CREW_GAME`, CHARM below `WORKED_GAME`, LEVY below `ROUNDS_GAME`, OMEN below LEVY. OMEN's anchors (LEVY's steps line, `TURN_GAME`'s take button, the zone and card lines) are all found. | ✓ (R3 changes CHARM's line) |
| `card-pick-phrases.ts` (+ test) | T1 (`ontoZonesOf` through `ontoZoneIds`), T3 (lower-of) | Different blocks. T3's condition carries `needsOnto`, so T1's hidden target refuses it in an `Only if` (`zprobe/lowerhidden`). | ✓; G1 for the `Then:` payment |
| `compile-phase.ts` / `.test.ts` | T1 (code and tests), T3 (one appended test) | — | ✓ |
| `support.ts` | T1 `describeZone`, T3 export `numberIfAny` | — | ✓ |
| `types.ts` | T1 `ZoneRef`, T4 `EveryPhase.roundSteps?` | — | ✓ |
| `worked-view.ts` | T1 (`everyoneSees` narrowing, R6c), R5 (`readsOnlyCards` owner mode) | R5 calls `everyoneSees({ each })`, which T1's narrowing leaves alone | ✓ |
| `worked-view.test.ts` | T2 (title and list), R5 (append) | — | ✓ |
| `compile.ts` / `compile.test.ts` | T4 code; T2 appended tests | — | ✓ |
| `turns.ts`, `turn-phrases.ts`, `runtime.ts` | T4 | T5's `If the omen has the Toll, each player has the levy …` wraps the steps line, and it works | ✓ |
| `game-numbers.ts` | T3 | T5's Gale line uses T3's `goes up by` | ✓ |
| `flow-phrases.ts`, `queue-phrases.ts` | T6 | T5's omen deck is `no one can see`, so its reshuffle renames. No T5 example reshuffles. | ✓ |
| `examples.ts` / `examples.test.ts` | T6 `claimer`; T5 and T6 append | — | ✓ |
| `cards.ts`, `draw-phrases.ts`, `debt-phrases.ts` | T6 | — | ✓ |
| `compare-phrases.ts` | R5 (export `OWNER_HAS_PHRASES`, same strings) | — | ✓ |
| `README.md` | T5 paragraph, T6 l.152, R5 sentence | Different places | ✓ |
| `startup-simulator.test.ts` | T6 (append only) | — | ✓ |
| Step 5 checks | T5 (and T6's rerun) | After T6, "outside the language" prints `README.md` and `startup-simulator.test.ts` | ✓ |

## 4. Rulings

**R1 — High — Task 6. Setup is told apart by the turn's phase, not by the Setup runner.**
- **Evidence:**
  - Setup's lines run while `turn.phase` is `'__setup'` (`build.ts:28/67`).
  - The examples' Setup and every fixture table run with no turn.
  - Renaming whenever the Setup runner does not say "Setup" breaks 4 existing tests (`pf61-t6v1-full.log`, §2). The constraint says to stop rather than change them.
- **Ruling: replacement texts in Task 6.**
  - **Before starting:** replace "and how Setup's lines are run (`runtime.ts`)" with "and how Setup's lines are run (`SETUP_PHASE` and `flowDefFor` in `build.ts`: the turn's phase is `'__setup'` while they run, and the examples' Setup runs before any turn)".
  - **Files:**
    - delete the bullet "The Setup runner: it tells the effects it runs that they run in Setup."
    - replace "`library/flow-phrases.ts` and `library/queue-phrases.ts`: the three shuffles." with "`library/flow-phrases.ts`: `renameShuffled` (exported) and the two shuffles; `library/queue-phrases.ts`: the reshuffling deal, through `renameShuffled` (on a new import line)."
  - **Interfaces,** append:

    ```ts
    // flow-phrases.ts
    /**
     * The state with `ids`, cards now in `zoneId` in a new order, renamed in their slot order (renameCards) when no seat may follow them: the
     * zone is not public, and the line runs in one of the game's phases. Setup's lines run in the flow's phase before them, and a table
     * arranged with no turn is in none, so neither renames.
     */
    export function renameShuffled(env: PhraseEnv, state: GameState, zoneId: string, ids: string[]): GameState;
    // its test: env.game.phases.some((p) => p.id === state.turn?.phase), as example-phrases' declaredMove reads the phase
    ```

  - **"Which shuffles rename":** replace "and not while Setup's lines run." with "and only while the turn is in one of the game's own phases. Setup's lines run in the flow's `'__setup'` phase, and the examples' Setup and a table arranged with no turn run in none, so they keep ids."
  - **Step 1, "Renamed":**
    - replace "run `Shuffle the deck.` outside Setup" with "run `Shuffle the deck.` on a table whose turn is in the game's phase (`fixturePhase('play', [])` in the game, turn `{ current: 'p0', phase: 'play' }`)";
    - replace "The same line run as a Setup line" with "The same line with the turn's phase `'__setup'`".
  - **Step 1, "The reshuffling deal",** add: "The state's turn is `{ current: 'p0', phase: 'working' }`."
  - **Step 4,** add: "The existing shuffle tests (`flow-phrases.test.ts`'s `shuffle` and `shuffles all but the top card …`, and `queue-phrases.test.ts`'s `shuffles the done pile into the pile …`) run with no turn and pass unchanged."
- **Probe:** `7a7be93`. 3723 then 3726, typecheck clean. Every Review Focus bullet holds, and Setup's ids are unchanged in every game.
- **Cost if wrong:** Task 6 stops at Step 4 on 4 existing tests, or an implementer edits them, which is forbidden.

**R2 — Medium — Task 1. A list of other players' zones is cut before it is read.**
- **Evidence:** as written, `JINX_GAME` gives `I don't understand “their workshop or another player's crew” here.` The greedy `ANOTHER_PLAYERS` matches the whole list, and `splitList` tries the whole first.
- **Ruling:** in "Reading it", replace "A target part that matches `ANOTHER_PLAYERS` counts as a zone when 5-1's split cuts the target text." with:

  > A target part counts as a zone when 5-1's split cuts the target text if it matches `ANOTHER_PLAYERS` **and** `their <name>` reads as a zone (a private `readsAsOthers(text, vocab)`), so the whole list, whose `<name>` is "workshop or another player's crew", is not one part.

  ```ts
  const readsAsOthers = (text: string, vocab: Vocab): boolean => {
    const name = ANOTHER_PLAYERS.exec(text)?.[1];
    return name !== undefined && readsAsZone(`their ${name}`, vocab);
  };
  // ontoTexts: splitList(text, (part) => (readsAsZone(part, vocab) || readsAsOthers(part, vocab) ? part : null), OR_SEPARATORS)
  ```

- **Probe:** `a6f674e`. All 5 compile tests pass, including `workshp`: `another player's workshp` is read as `their workshp`, which gives `There is no zone called “workshp”.`
- **Cost if wrong:** every Task 1 test that compiles `JINX_GAME` fails.

**R3 — Medium — Task 2. `CHARM_GAME`'s `Charmed:` line must read the card alone.**
- **Evidence:**
  - `its {attribute} are more than {int}` is registered in `card-number-phrases.ts:121`, outside `CARD_ONLY`, so `shownFlags(CHARM_GAME)` is `[]`.
  - Making card-number comparisons card-only instead would show `Bugged`, `Stopping decay` and more in Startup, which would change its existing pins.
- **Ruling:** in `CHARM_GAME`, replace `'Charmed:', '  Only if its charms are more than 0.', '',` with `'Charmed:', '  Only if it is a card whose charms are more than 0.', '',`. The doc comment needs no change.
- **Probe:** every value bullet and Task 5's CHARM example pass. `shownFlags` gives `['charmed']`.
- **Cost if wrong:** Task 2 stops at Step 4, or an implementer widens `worked-view` and breaks Startup's pins.
- **6-2 note:** a flag 6-2 wants labelled, or counted in a shown total, is written `it is a card whose … is more than …` (see R5's probe and G4).

**R4 — Medium — Task 4. The refusal while the steps run.**
- **Evidence:** p0's `work` gets `move work not allowed in phase levy` (`round-steps.test.ts:129`). The phase gate comes first.
- **Ruling:** in "The steps start, and no turn does", replace "p0's `work` is refused with `not p0's turn`." with:

  > p0's `work` is refused with `move work not allowed in phase levy`, and p0 pawning the first card of `list-p1` is refused with `not p0's turn`.

- **Probe:** both pass, at `round-steps.test.ts:129–130`.
- **Cost if wrong:** one failing assertion, and an implementer may reorder the runtime's gates to match it.

**R5 — Medium — Task 2 (home); the notes' 6-1 item. A player's total may read a flag that tests its owner's zone everyone sees.**
- **Evidence:**
  - The notes ask for it. Without it, 6-2a's lines that test what is in a player's ops pool would make blue/red/qa supply unshown, and the bandwidth gauges would vanish until 6-3.
  - Today `readsOnlyCards` refuses `its owner has … in their {perzone} …` everywhere.
- **Ruling:** Task 2 gains:
  - **Files:**
    - `src/engine/core/lang/worked-view.ts` (`readsOnlyCards` owner mode; `readsTheCardAlone`);
    - `library/compare-phrases.ts` (export `OWNER_HAS_PHRASES`, the two existing strings, used in its registration).

    Both also go on the commit pathspec.
  - **Interfaces:**

    ```ts
    // compare-phrases.ts
    /** Whether its owner has, or has no, card in a zone of theirs that passes a clause: args [the zone each player has, the clause]. */
    export const OWNER_HAS_PHRASES = ['its owner has a card in their {perzone} {cardclause}', 'its owner has no card in their {perzone} {cardclause}'] as const;
    // worked-view.ts
    // readsOnlyCards(game, name, seen = new Set(), holder = false, owner = false): with `owner`, a condition with an OWNER_HAS_PHRASES phrase
    // counts when everyoneSees(game, { each: args[0] }) and every worked name its clause tests (testNames of args[1]) reads only cards, at
    // every depth. readsTheCardAlone (used only by totalSeenByAll) passes owner = true. shownFlags, standIns, pressFlags and holderFlags do not.
    ```

  - **Step 1** (`worked-view.test.ts`, appended):

    ```ts
    describe('Review Focus: a value about a player read through what its owner has where everyone sees', () => {
      const VALUE = "Job pay:\n  A player's job pay is the total red pay of the cards in their workshop.";
      const rival = (zone: string, test = 'that is tired') =>
        [withPay(["  A rival card's red pay is 2."], 'Rival:', `  Only if its owner has a card in their ${zone} ${test}.`), '', VALUE].join('\n');
      it('shows it when the owner\'s zone is one everyone sees, and the clause reads the card alone', () => {
        expect(shownPlayerValues(compiled(rival('idle')))).toEqual(['job pay']);
        expect(shownPlayerValues(compiled(rival('idle', 'that is not tired')))).toEqual(['job pay']);
      });
      it('(guard) shows it not when only the owner sees that zone', () => {
        expect(shownPlayerValues(compiled(rival('stash')))).toEqual([]);
      });
      it('(guard) labels the flag on no face: the card-level rule is unchanged', () => {
        expect(shownFlags(compiled(rival('idle')))).not.toContain('rival');
      });
    });
    ```

  - **Step 4:** Startup's `shownFlags`, `standIns` and both `shownPlayerValues` pins pass unchanged. At HEAD, `Decaying:`'s owner line feeds `operational revenue` only through `Stopping decay:`, which reads `its training xp is more than 1` and is not card-only.
  - **Task 5's README,** in "Lines a flag turns on", add: "A player's total over zones everyone sees is still shown when a flag it reads asks what the card's owner has in a zone everyone sees (`Only if its owner has a card in their idle that is tired.`); the flag itself is not labelled." README l.266 ("never shows a flag read through what its owner has") stays true, since it is about faces.
- **Probe:** `7ea5964`. Without the change test 1 fails (`pf61-owner-step2.log`); with it 64 of 64 pass, the full suite gives 3726, and typecheck is clean.
- **Hidden information:** only zones every seat sees, and clauses traced; the guards pin both.
- **Cost if wrong:** if it is left out, 6-2a loses its supply values and gauges until 6-3. If it were too wide, a total would print a hidden card's effect; the stash guard pins that it doesn't.

**R6 — Low — Task 1. Tests, setup and Files.**
- **(a) OTHERS_ONLY_AS_TARGET test.** Replace "`A player may jinx a card in another player's workshop.` gives …" with: "`A player may jinx a card in another player's workshop.` in place of the jinx line, with its `      The target card is tired.` line removed, gives … (kept, that line adds `“The target card is tired” only makes sense in a button that picks a card and the card it goes to, …`)".
- **(b) The 3-player engine.** Replace "A 3-player `JINX_GAME` engine, p0 to act." with: "A 3-player `JINX_GAME` engine built from an arranged state: `initialState(JINX_GAME, 1)` with turn `{ current: 'p0', phase: 'working' }` and the cards relocated, as Task 4's `table` does. `CREW_GAME`'s Setup can't deal 2 jobs to each of 3 stashes (`There are no cards left in the pile.`)." The example's `Given 3 players` is fine as written.
- **(c) Files:** add `src/engine/core/lang/worked-view.ts` (`everyoneSees` reads `others`) to Modify and to the commit pathspec, and to the constraint's list of `ZoneRef` narrowings.
- **(d) Names:**
  - in "Using it", replace "`ontoZoneOf` and `wordingsOf`, which read the first id" with "`ontoZonesOf` (now `string[]`, through `ontoZoneIds`) and `wordingsOf`";
  - the `ontoPlaces` import of `card-pick-phrases.ts` goes, as it is unused.
- **Probe:** `a6f674e`.

**R7 — Low — Task 4. The at-once diagnostics and two type notes.**
- **(a)** Replace the at-once bullet's "gives `The steps … at once.` on the steps line" with: "gives, among its diagnostics, `The steps … at once.` on the steps line (assert with `toContainEqual`). The phase then takes no turns, so its `they`/`their` lines get their own errors, and no line leads to `levy`."
- **(b)** Under "The effect", add: "`back` is `state.turn.phase`. The no-turn `Error` also covers `turn.phase === undefined`, so `back` is a `string`."
- **(c)** In "Setup", add: "Copy only the helpers the file uses. `thrown`, if unused, fails typecheck (TS6133); the two 'Refused while playing' cases may use it."
- **Probe:** `b46c8ff`, `1ea43fb`, `zprobe/atonce.ts`.

**R8 — Low — Task 6. Test specifics.**
- **Examples test:**
  - `RESHUFFLE_GAME` ends when the pile is empty, so the example's Givens must leave a card in the pile (`And the pile has a Sweep`) before the done pile is reshuffled.
  - The failure reads `Line N (Given …): No card matches “a Dust”.`; assert with `expect.stringContaining('No card matches “a Dust”.')` and `atLine`.
  - The probe's lines:
    - `Given it is p0's turn`;
    - `And the pile has a Sweep`;
    - `And the done pile has a Dust, a Dust, a Dust, a Dust, a Dust and a Dust`;
    - `When p0 gathers`;
    - `Then p0's list has 3 cards`;
    - `Given the done pile has a Dust`.
- **Startup test:** `twoPlayerGame` is local to the long-runs describe. The appended describe plays `playGame(2, 4, watch)` itself, and the watch checks each `BRAINSTORM` / `BRAINSTORM_FLUSHING` press that brought an id new to the deck. Use a 120 s timeout. No import line is needed.
- **"Refused":** the name is `The <name> in <zone>` (as `attachmentProblem`'s `theCard`). The card on it is refused too.
- **Step 2:** with the interfaces written but not called, 6 shuffle tests and the Startup test fail; the guards, `cards.test.ts` and the draw test pass. The examples test fails only while `claimer` is unchanged.
- **Probe:** `7a7be93`.

**R9 — Low — Task 3. The test table's coins.**
- In "Toasting", add: "Build the table with `withBoardData(state, game, seats)` before `setCounter`. `createEngine` runs `withBoardData` itself unless `PIECES_KEY` is set, which resets coins set earlier."
- **Probe:** `ce64252` (9 → 8, where 0 was expected, before the fix).

**R10 — Low — Plan text (the Assumed list).**
- l.182: `GO_TO_PHASE` → `GO_TO_PHRASE` (`library/flow-phrases.ts`).
- l.186: `ontoZoneOf` → `ontoZonesOf`.
- l.258: as R6(d).
- Task 6's "Before starting": as R1.

## 5. Gaps (no ruling inside the plan fixes these)
- **G1 — a payment can tell the presser a hidden target's number.** `They pay the lower of the card's pay and the target card's pay.` is accepted in `Then:` for a target in `another player's stash` (`zprobe/lowerhidden`), and the coins paid reveal its pay. That is the existing rule that `Then:` lines may read a card ("Check it in the Then: lines, after a reveal"). 6-2 uses it on public targets only (TechCrunch on their operations). Park it for the slice that first pays against a hidden target.
- **G2 — 5-2b's T1 hidden-zone test is not given id assertions.** The notes say it "can assert ids too". Task 6's appended Startup test covers the same ground at 2 players seed 4, and Task 6 rewrites README l.152. Controller call: accept, or add a line to 5-2b's test in 6-2a.
- **G3 — the page shows no glide for a reshuffle.** `TableModel.setScene` drops the old ids and places the new ones at their target. The cards jump into the deck, and a drawn card appears without a glide from the deck. This is for 6-3 (`diff.ts`'s `reconcile` is not wired).
- **G4 — card-number comparisons are not card-only for the view.** This is 4-3's G1, noted on Startup's pin. R3 works around it in the fixture.
  - Startup's `operational revenue` stays unshown even with R5 (`Stopping decay:` reads `its training xp is more than 1`).
  - 6-2a's Toxic lines are shown only if their tests are written `it is a card whose …`.
  - Widening the rule changes Startup's pins, so that is a later worked-view plan.
- **G5 — `NOT_TOLD_APART` names a card in a hidden pile.** It is a `RuleError` for the designer. Legal play never reaches it, because `attachmentProblem` already refuses a card sitting on a card out of sight. Slice 9's face-down cards on cards would need it reworded.

## 6. Brief edits per task

### Task 1
1. **Top:** re-check the names of §1 rows 10–12, 15–18. Row 11 differs (`ontoZonesOf`).
2. **Reading it:** R2's replacement and `readsAsOthers`.
3. **Using it:** R6(d).
4. **Files and commit:** add `worked-view.ts` (R6c).
5. **Step 1:** R6(a) for the OTHERS_ONLY_AS_TARGET test, and R6(b) for the 3-player engine.
6. **Step 2 expectation:** 8 fail, and `declared-actions.test.ts` fails at collection.
7. **Step 4:** the 5 files give 573. The full suite is +12.

### Task 2
1. **`CHARM_GAME`:** R3's `Charmed:` line.
2. **R5:**
   - Files (`worked-view.ts`, `library/compare-phrases.ts`), Interfaces and the 3 appended tests;
   - add both files to the commit pathspec, and say "player values through what its owner has where everyone sees" in the message.
3. **Step 2 expectation:** 4 fail plus a collection failure; 5 with R5's first test. R5's two guards pass.
4. **Step 4:** the full suite is +8. Startup's `shownFlags`, `standIns`, `shownPlayerValues` and `gaugePairs` pins are unchanged.

### Task 3
1. **Toasting:** R9 (`withBoardData` before `setCounter`).
2. **Step 4:** the full suite is +7.

### Task 4
1. **Step 1:** R4's refusal; R7(a) for at-once; R7(c) for the helpers.
2. **The effect:** R7(b).
3. **Step 2 expectation:** 21 fail, and the 2 guards pass.
4. **Step 4:** the three files give 142, and the full suite is +23 (a new file, 120).

### Task 5
1. **README:** R5's sentence, in "Lines a flag turns on".
2. **Step 2:** PASS, 69 tests, as written.
3. **Step 4:** with R5 in Task 2, the starting count 3658 + 55 = 3713 here, and 3726 after Task 6.
4. **Step 5:** run over `BASE..HEAD`. The test-lines check prints only the phrase-set title.

### Task 6
1. **Before starting, Files, Interfaces, "Which shuffles rename", Step 1 and Step 4:** R1's texts.
2. **Step 1:** R8 (the examples test, the Startup test, "Refused").
3. **The report line asked for:** no `lang:*` key in `state.data` holds a card id. `HOLDER_KEY` is refused with `NOT_TOLD_APART` and is unreachable in legal play.
4. **Step 2:** as R8.
5. **Step 4:** the full suite is +13 (3726 with R5). Color Match renames in play and pins no id. The Startup test file takes 13.4 → 14.1 s.
6. **Import lines:** new names go on new `import` lines (§2 Constraints).

### Plan text (controller)
- R10.
- **Header / Gaps:** "The Ops-pool half of R1 depends on 5-1's owner scope" now has R5 for its shown values. G4's wording rule (`it is a card whose …`) goes to 6-2a's pre-flight.
