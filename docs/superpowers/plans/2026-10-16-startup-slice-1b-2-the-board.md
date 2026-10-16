# Startup Simulator Slice 1b-2 (The Board) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Startup Simulator plays slice 1b's Board: players Greenlight Tier 1 products, put staff on them, generate and commit cubes, Launch, earn revenue and Market Share at Income, pay salaries or let staff go, Pivot, Recall, Reassign, Dismiss and Source, and the score counts Val and Market Share. To get there the language gains cards that sit on cards with a check after every change, numbers on cards used in arithmetic, values worked out for cards, sums and "for each", a "Go to {phase}." effect, a look at as many cards as were picked, a left-end entry for rows, and two score lines.

**Architecture:**
- **This is plan 1b-2 of three** (spec R9). It runs after plans 1a-1, 1a-2 and 1b-1 are complete and takes their interfaces as given (see "Assumed from earlier plans" below). Plan 1b-3 (the Board on the canvas, canvas clicking, the browser check) is not here: this plan touches the page only where an existing page test spells out Startup Simulator's zones.
- **Language layer only.** New work is in `src/engine/core/lang/`, `src/games/startup-simulator.*` and `README.md`. The six pieces:
  - **Attachment (R3).** A card's holder is the id under `data['lang:on']` (`HOLDER_KEY`). `relocate`, `toBottom` and the bottom-fifth phrase drop it, so every move detaches. Placing phrases set it after their move. A zone line ending ", where every card is on a card" marks a per-player zone whose every card sits on a card (`ZoneSpec.onCards: 'every'`). `build.ts` runs `runtime.checkAttachments` after every declared move, every button and every lang flow effect; a broken table throws a `RuleError`, so the engine keeps its old state.
  - **Card numbers (Task 2)** are read through one helper, `cardNumber`, which Task 3 points at the worked-out values.
  - **Worked-out values (R4)** are top-level sections, one per value, compiled into `CompiledGame.worked`. A number section's lines are a new phrase kind, `value`, which refines the card's number the way `Rent:` refines a space's. A flag section is a block of `Only if` lines. `LangRuntime.workedValue` and `workedFlag` answer them, and every phrase that reads a card's number or flag goes through them.
  - **Sums and "for each" (R6)** share one parameter type, `{cardgroup}`: "the cards in {zones}" with an optional "whose {attribute} is more than {int}", "the cards on it", and "the picked cards". "For each card …, <effect>" is a compiler frame, like "If …, …".
  - **Flow pieces.** "Go to {phase}." runs the target's start lines as an advance does (R2). Phase-scoped turn-start rules and the first-phase warning were built by plan 1a-1 (its C2 and C3) and are not rebuilt here.
  - **The rules text** comes in two halves (R9), then the long runs.
- **Builder calls this plan makes** (the spec and its rulings leave them open):
  - **The zone mark** reads ", where every card is on a card". It is allowed on a per-player zone only. Slice 5 can add a "some" form for the ops team. The zone lines also gain "an" ("Each player has an operations row …"). Builder check B9 expected plan 1a-1 to add that, but it doesn't.
  - **Example steps for attachment** read `Given the Dating App in p0's development has a Junior Software Dev and the Architect on it`, and the same as a Then, plus `Then the Dating App in p0's development has no cards on it`. R3's "Given p0's Junior Software Dev is on the Dating App" names neither the project's zone nor the zone the staff sit in. The Given puts the cards in the owner's first zone marked for cards on cards.
  - **Value names.** Each staff card has a `blue output` and a `red output`, and each project has a `blue team output` and a `red team output`, the total of its staff's. R4's example calls the project's value "new blue cubes", but that is the count Generate stores until Commit (R8), so the value needs a name of its own.
  - **Salary has no section in 1b.** It is read through the value mechanism from its column, so slices 3 and 5 only add a `Salary:` section with their lines. A section with no lines would say nothing.
  - **What a worked-out section is.** It is a top-level header that is not a fixed section and not a board column, in a game with a card table. Either the header names a column of a card table, or its first line starts "Only if " or "A/An … card's ". Any other unknown header is reported as today.
  - **Source hires are set buttons with no cost line.** A free one-card "a card from {zone} to {zone}" line is a card move under R1, and a Source hire costs no AP (#25), so it can carry no cost line. A set ("hire some cards from their scouting to their bench") is a button whatever its cost. So one press may hire several revealed cards, as §13.B.3 allows ("one (or more)").
  - **Wordings.**
    - "lay off some cards from their bench to the open job market" (Layoff / Source).
    - "let go of a card in their development team" / "… in their ops team" (unpaid staff).
    - "pass on the rest".
    - The zones are `development`, `operations`, `development team`, `ops team` and `scouting`.
  - **Engine to commit.** The engine phase's last start line is "Go to commit.", and commit's last is "Go to bench cleanup." This applies B8 to both hops. Slice 9 points the first one at its Audit window instead.
  - **Feature complete** uses "at least" ("its blue cubes are at least its blue cost"). With the cap at the cost this is the same as "are", and it matches Rust's `>=`.
  - **The Tier 1 limit** is "Only if the card is a Tier 1 card."
  - **When the check runs.** The attachment check runs after each lang flow effect, so each of a phase's start lines must leave the table whole on its own. It is skipped for a game with no zone marked for cards on cards.
  - **Filters** on sums and "for each" are only "whose {attribute} is (or are) more than {int}". That is the one form R6 names and 1b uses.
  - **"They get the total … of …"** adds to the number players pay with, as "They pay the card's cost." takes from it.
  - **1a's agency hires to the Bench** in three examples get "to p0's bench", since three buttons now hire from the agency row. 1b-1's rule allows rewording where a move's shape changes.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-1b-building-design.md` is binding. Its "Builder-check rulings" R1–R9 win where they differ from the shape section, especially R2, R3, R4, R6, R7, R8 and R9. It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding (attachment design, anti-goals, "Keep in view"). The evidence is `builder-check-startup-1b.md` B2–B10, with its probes in `scratchpad/p1b-rules/` and `scratchpad/p1b-scripts/`. Every rule and number comes from `kinnet-studio/suwa`'s `rulebook.md` (Version 6.0): §3, §5 B and D, §6, §9.A, §12, §13, §14.B, §15, §18, §20.B–C and the Rulings Log.

## Global Constraints

- **Controller amendment (after plan 1a-1's final review, before this plan runs).**
  - **Tally keys.** 1a-1's Task 10 also tallies three rule paths so the auto-player can't hide a rule (the overview's anti-goal): the open idea pool letting a card go to the box, the Market Crash reaching the crash pile from the growth market, and from a research row. Wherever this plan lists the tally keys, keep those three as well and expect each above 0.
  - **The open job market's eviction.** 1a's long runs can't reach it (no income). Once Income exists, this plan's long runs add a fourth trigger key, the open job market letting a card go to the box, expected above 0.
  - **Example counts.** 1a-1's final fix wave adds examples to `startup-simulator.rules` (research with the last action, a 1-card research deck, the Crash on the last seat's turn) and moves the Market Crash into the growth products table as its first row (its card id is no longer fixed). Wherever this plan says "21 examples" or "21 of 21", read the count the committed file has when this plan starts, and add this plan's examples to it.

- **Controller amendment (pre-flight, after plans 1a-2 and 1b-1 were built).** The scan is in the plan's SDD workspace
  (`preflight.md`). Each task's brief carries its rulings; in short:
  - **P1 (Task 8).** Adding ", 0 market share" after the actions count changes seven more money lines: `tableaux.test.ts:37`
    and `playtest-fitted.test.tsx` 137, 235, 242, 259, 263, 268 (`:259` becomes
    `'0 actions, 0 market share · bench 5 · backlog 2 · research 0'`). They count as money lines Task 8 may change.
  - **P2 (Tasks 7–8).** The rules hold 24 examples, so Task 7 ends at 34 and Task 8 at 53 (the test file, both places in
    `designer-page.test.tsx`, and the README's "Its 53 examples").
  - **P3 (Task 1).** `CREW_GAME` has `Each player has 3 moves each turn.`; the hire bullet expects "p0 has 2 moves".
  - **P4 (Task 3).** One loop guard keyed by card and name, shared by `workedValue` and `workedFlag`, cleared in `finally`;
    tests for a flag reading itself and for a value line reading a worked flag.
  - **P5 (Task 9).** The tally keeps 1a-1's three happenings and adds the open job market's eviction and the agency
    push-out (a card leaving `agency-row` for `open-job-market` in a move that isn't a hire), each above 0.
  - **P6 (Task 9).** The auto-player dismisses the first ops team card when `t % 9 === 4` and the first development team
    card when `t % 9 === 8`, at most once per turn.
  - **P7 (Task 1).** `onCardsZoneOf` picks the first per-player zone marked `'every'`; `attachmentProblem`'s rule 1 applies
    to `'every'` zones only, rule 2 to unmarked zones (slice 4 R5 and slice 8 R2 add `'some'` zones later).
  - **P8 (Task 4).** `runtime.readsCard` also counts a ref whose args hold a `CardGroup` of kind `picked` or `on it`.
  - **P9 (Task 2).** `it is not {cardflag}` removes the key.
  - **P10 (Task 8).** The README's tableau sample and its "When p0 hires the Hacker" line are updated to 1b.
  - **P11 (Tasks 1, 6).** 1b-1's `NEEDS_CARDS`/`NEEDS_ONTO` are private: tests spell the text.
  - **P12 (Task 9).** `Run` gains `until?: (log: readonly Move[]) => boolean`; the view check covers
    `ActionView.cards.onto.targets` against `ontoCandidates`, card by card (a set press is judged whole). 1b-1 built
    `playGame(players, seed, watch, { moves, throughView })` and `playTurn` taking a runtime.
  - **P13 (Tasks 4, 6).** T4's expected diagnostic is the `mentionsActor` one; its `for each` tests run through a host line.
    T6 puts a Potter in `crew-p0` and adds the stars counter to `CREW_GAME`'s players in the test.
  - **P14 (Tasks 1, 4).** Reuse `namedCardIn`/`noCardIn`/`cardsInZones` (exported from `fact-phrases.ts` or moved to
    `support.ts`); move `pickName` next to `cardName` in `card-facts.ts`, exported.
  - **P15 (Task 1).** A card with `lang:on` sent into the bottom fifth loses the key (a test in `queue-phrases.test.ts`).
  - **P16.** Bullets that pass before their task is built are marked "(guard: passes before and after)"; Task 5's PAYDAY is
    trimmed to what is new.
  - **P17 (Task 4).** `whose` stays `{ attribute; above } | null`; slice 3 widens it.
- **Hard constraints (verbatim):**
  - Protected files must not change: `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, and anything under `src/pages/hearts-demo/**`.
  - The core is pure: no pixi/react/DOM imports in `src/engine/core/**`, no `Math.random` or `Date.now`.
  - State stays Json-only, with new keys under `lang:*` in `state.data` (the holder key is `lang:on` in a card's data, per R3); moves are Json.
  - No Startup Simulator words in shared code (capital, talent, agency, junior, backlog, growth, crash, vaporware, university, bench, ideation, startup, research, recruit, product, job market, idea pool, "seed" meaning a deck/market/card/product, greenlight, launch, pivot, salary, payroll, project, cube, ops, operations, onboarding, scouting, source/sourcing in the game sense, market share); they stay in the rules text and its test.
  - Hearts, Color Match, Venom and Rent Day pass unchanged; `bun run typecheck` clean; full `bun run test` passes.
  - Every number in the rules text comes from the rulebook; examples state where (section or ruling).
- **Where the banned words may appear.** They may appear in:
  - `src/games/startup-simulator.rules` and `src/games/startup-simulator.test.ts`;
  - the page tests that play the real sample: `src/pages/designer/designer-page.test.tsx`, `playtest-fitted.test.tsx` and `tableaux.test.ts`;
  - `src/pages/designer/samples.ts`, README and docs.

  They may not appear anywhere else under `src/engine`, `src/pages` or `src/utils`, comments included. `src/engine/core/lang/testing.ts` counts as shared. Fixtures use general words: crew, workshop, hall, scrap, stash, idle, jobs, hands, coins, moves, stars, wage. Never name anything `ops`, `project` or `source`.
- **State and moves.**
  - No new `state.data` keys. The only new stored key is `lang:on` in a card's `data`.
  - Every new field of `CompiledGame`, `ZoneSpec`, `Vocab` and `PhraseRef` args is Json. An optional field is left out, never set to `undefined`.
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1, record `BASE=$(git rev-parse HEAD)` and run `bun run test` once to get the passing count.
- **No new dependencies.**
- **Existing tests.**
  - Tasks 1–6 change no existing test line. They may add options to `fixtureEnv` and fields to `vocabFor` in `testing.ts`, and they append tests.
  - Tasks 7–8 change only:
    - in `src/games/startup-simulator.test.ts`: the example count, the zones test, and Setup's per-player checks;
    - three hire lines inside the 1a examples in `startup-simulator.rules`;
    - the example count in `designer-page.test.tsx`;
    - the exact tableau and money lines of the real sample in `tableaux.test.ts` and `playtest-fitted.test.tsx`.
  - Task 9 changes only the long runs in `startup-simulator.test.ts`.
  - If any other existing test fails, stop and report it instead of changing it.
- **Style and commits.**
  - 2-space indent, single quotes, chainable registrars, comments that say why.
  - Commit prefixes `feat(lang):` and `feat(games):`.
  - Stage files by path, never `git add -A`.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.
  - `at(text, line)` in tests is the 1-based number of `line` in `text`, as in 1a-1.

## Review Focus

- **A rule that forgets the cards on a card.** For example, a "drop" that moves a job to the scrap but leaves its crew behind. The press must throw the designer-readable message naming both cards and where the holder went, and the engine must keep the state from before the press. Tests in Task 1 (fixture) and Task 8 (Pivot without its staff line).
- **A worked-out value that reads itself,** directly or through another value. It must give `“loop” is worked out from itself.` on the line that asked, never a stack overflow. Test in Task 3.
- **"For each" over a zone whose line moves the cards it walks** ("For each card in their workshop, move it to the scrap."). It must visit each card that was there when it began exactly once, in slot order, and never one that arrived during the walk. Test in Task 4.
- **A Source with the turn's last action, or on an empty Talent Deck.** The sourcing interrupt must hand the turn back and the turn must go on to the Engine and the next player, with nothing stuck in the scouting row. Example in Task 8.
- **Undo and replay across Launch, Pivot and Reassign.** Holders, cubes and onboarding come back exactly, and replaying the log rebuilds the same state. Tests in Task 1 (fixture) and Task 9 (real game).

## Assumed from earlier plans (check before Task 1)

At the time of writing, plan 1a-1 had Tasks 1–4, 6 and 8 committed, and plans 1a-2 and 1b-1 had not started. Before Task 1, check each item below. If one is missing or differs, stop and report it.

- **1a-1, built and verified in the code:**
  - phase-scoped `When a player's turn starts:` (`CompiledPhase.turnStarts`, run by `LangRuntime.startTurn` after the every-phase ones, C2);
  - the first-phase warning `FIRST_PHASE_STARTS` (C3);
  - `TURN_STARTS`, `usesTurns`, `markTurnStarted`, `TURN_OF_KEY`, `startPlayerOf`;
  - `queue-phrases.ts` with `dealUpTo` (a local const today; Task 6 exports it) and `goesIntoBottomFifth` (uses `insertAtSlot`);
  - Task 6's `they have at least the card's {attribute} in {counter}` and `they pay the card's {attribute}` with a local `cardNumber(env, attribute)` in `move-phrases.ts`.
- **1a-1, not built yet:**
  - Task 5: "… and the round is finished", `ROUND_FRAME`, `roundFinished`, tied winners, `each player scores {int} point(s) for every {int} {counter}`, and the expects `the game is over`, `the game is not over` and `{players} win`.
  - Task 7:
    - endless stacks;
    - `makeCard`;
    - `ExampleEnv.claim(match, text, state): { id: string; state: GameState }`;
    - `fill` threading the state.
  - Tasks 9a, 9b and 10: `src/games/startup-simulator.rules` with 21 examples, and its test with `playGame`, `playTurn`, `keepsTheRules` and the move tally.
- **1a-2 (not built yet):** `tableaux.test.ts` and `playtest-fitted.test.tsx` pin tableau lines such as `pN 7 capital, 3 actions · bench 3 · backlog 1 · research 0` (per-player zones in Table order).
- **1b-1 (not built yet):**
  - **The card-pick grammar and buttons:** `DeclaredAction.pick` and `.cost`; "a card in", "a card from … to …" with a cost, "… to a card in …" and "some cards from …".
  - **What the lines see:** `Subject.onto` and `.cards`; `LineCtx.cards` and `.onto`; `PhraseOpts.needsCards` and `.needsOnto` with their messages (`NEEDS_CARDS`, `NEEDS_ONTO`).
  - **Phrases and helpers:**
    - `theTargetCard(env): CardState` and `thePickedCards(env): string[]` in `support.ts`;
    - the effect `move the picked cards to {zone}`;
    - the example actions `{player} {cardaction} {cardlist}`, `… to {card}` and `… to {zone}`, with their button-choosing rules;
    - `cardCandidates`, `ontoCandidates` and `ActionView.cards`.
  - **Its Startup work:**
    - Task 5's rewrite of Startup Simulator (move-type constants `HIRE_AGENCY`, `HIRE_MARKET`, `DRAFT_SEED`, `DRAFT_GROWTH`, `DRAFT_POOL`, `KEEP`, `DISCARD_BENCH`, `DISCARD_BACKLOG`; actions phase with cost lines);
    - Task 6's `playGame(players, seed, watch, { throughView })` and `keepsTheBudget`.

---

### Task 1: Cards on cards, and the check after every change

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`ZoneSpec.onCards`)
- Modify: `src/engine/core/lang/zones.ts` (`HOLDER_KEY`, `withoutHolder`; `relocate` and `toBottom` drop the holder)
- Create: `src/engine/core/lang/attach.ts`
- Modify: `src/engine/core/lang/library/setup-phrases.ts` (the "an" and "where every card is on a card" zone lines)
- Create: `src/engine/core/lang/library/attach-phrases.ts` (`registerAttachPhrases`, in `REGISTRARS` right after `registerFactPhrases`); modify `library/index.ts`
- Modify: `src/engine/core/lang/library/queue-phrases.ts` (the bottom fifth drops the holder)
- Modify: `src/engine/core/lang/library/example-phrases.ts` (export `coversExactly`, `describeCards`; the Given and Expects)
- Modify: `src/engine/core/lang/runtime.ts` (`checkAttachments`), `src/engine/core/lang/build.ts` (the checks)
- Modify: `src/engine/core/lang/testing.ts` (`CREW_GAME`)
- Test: `src/engine/core/lang/attach.test.ts` (new), `src/engine/core/lang/zones.test.ts`, `src/engine/core/lang/library/attach-phrases.test.ts` (new), `src/engine/core/lang/compile.test.ts`

**Interfaces:**
- Consumes 1b-1: one-card, target and set picks; `theTargetCard`, `thePickedCards`; `needsCards`, `needsOnto`.
- **`types.ts`:** `ZoneSpec.onCards?: 'every'`: every card in this per-player zone must sit on a card, and only such a zone may hold a card that sits on one.
- **`zones.ts`:**
  - `export const HOLDER_KEY = 'lang:on'`.
  - `export function withoutHolder(card: CardState): CardState`: the card with `HOLDER_KEY` taken out of its data. A card without it comes back as the same object.
  - `relocate` and `toBottom` pass every moved card through `withoutHolder`, so every move detaches. Cards that don't move are untouched.
- **`attach.ts`** (pure):
  - `holderIdOf(card: CardState): string | null`.
  - `cardsOn(state: GameState, holderId: string): CardState[]`: the cards whose holder is `holderId`, by zone id, then slot.
  - `putOn(state: GameState, cardIds: string[], zoneId: string, holderId: string, game: CompiledGame): GameState`: `relocate`, then sets `HOLDER_KEY` on each card.
  - `onCardsZoneOf(game: CompiledGame, seat: PlayerId): string`: the seat's zone id for the first per-player zone with `onCards`, in Table order. With none it throws RuleError `This game has no zone where cards sit on cards. End a zone line each player has with “, where every card is on a card”.`
  - `attachmentProblem(game: CompiledGame, state: GameState): string | null` gives null at once for a game with no `onCards` zone. Otherwise it gives the first problem, in `state.cards` order. `{card}` is the card's `name` column, else `cardName`. `{zone}` is `pN's {zone name}` or `the {zone name}`.
    - A card in an `onCards` zone with no holder: `` `The ${card} in ${zone} isn't on any card, but every card there must be.` ``
    - A card with a holder outside an `onCards` zone: `` `The ${card} in ${zone} is on a card, but cards there don't sit on cards.` ``
    - A holder that is not on the table (no such id, or in `BOX_ZONE`): `` `The ${card} in ${zone} is on a card that is no longer on the table.` ``
    - A holder in a zone that is not public, or that belongs to another seat or to no seat: `` `The ${card} in ${zone} is on the ${holder}, which is now in ${where}. Move the cards on a card along with it.` ``
- **`runtime.ts`:** `checkAttachments(state: GameState): GameState` gives the state, or throws `RuleError(attachmentProblem(…))`.
- **`build.ts`:**
  - Each declared-move and button handler's `apply` result goes through `runtime.checkAttachments`.
  - So do the results of the flow effects `lang:effect`, `lang:phase-effect`, `lang:trigger-then` and `lang:turn-start`.
  - Core moves and `lang:result` are not checked.
- **`setup-phrases.ts`:**
  - Zone `each player has an {name} row that {visibility}` and zone `each player has an {unrowedname} that {visibility}`, as their "a" forms.
  - Zone `each player has a {name} row that {visibility}, where every card is on a card`, and its "an" form, give a row with `onCards: 'every'`.
  - Zone `the {name} is a {layout} in the center that {visibility}, where every card is on a card` throws RuleError `Only a zone each player has can hold cards on cards.`
- **`attach-phrases.ts`:**
  - Effect `it goes to {zone}, on the target card` (`needsCard`, `needsOnto`): `putOn` of the card onto the target card. A zone without `onCards` is a RuleError `` `${describeZone(zone)} doesn't hold cards on cards. End its Table line with “, where every card is on a card”.` ``
  - Effect `the picked cards go to {zone}, on the target card` (`needsCards`, `needsOnto`): the same for the set, in the press's order.
  - Effect `every card on it goes to {zone}` (`needsCard`): `relocate` of `cardsOn(it)`, in that order.
  - Effect `every card on it is {cardflag}` (`needsCard`) sets the flag on each.
  - Conditions `it is on the target card` and `it is not on the target card` (`needsCard`, `needsOnto`).
- **`example-phrases.ts`:**
  - Given `{card} in {zone} has {cardlist} on it`.
    - The holder is the zone's first card that is the named one, else RuleError `There is no {card} in {zone}.` (the wording `fill`'s neighbours use).
    - Each listed card is claimed as `fill` claims (1a-1 Task 7's `claim`), then put with `putOn` into `onCardsZoneOf(game, <the holder zone's seat>)`, after what is there.
    - A shared holder zone is a RuleError `` `${describeZone(zone)} belongs to no player, so no card can sit on a card in it.` ``
  - Expect `{card} in {zone} has {cardlist} on it`: exactly those cards are on it (`coversExactly`). Else: `` `Expected ${theCard} in ${describeZone(zone)} to have ${list} on it, but ${it has <describeCards> on it | there is nothing on it}.` ``
  - Expect `{card} in {zone} has no cards on it`.
- **`testing.ts`:** `CREW_GAME`, written as below. Tasks 2–6 build on it.

```ts
/**
 * A card game whose workers sit on the jobs they work on. Players start jobs from their stash in their workshop, hire workers
 * from the hall onto a job, shift a worker to another job and finish a job, which sends its crew to the idle row. Every card in a
 * crew sits on a job.
 */
export const CREW_GAME = [
  'Game: Crew', 'Players: 2 to 3', '  Each player has 9 coins that everyone can see.', '  Each player has 2 moves each turn.',
  '  Players pay with coins.', '',
  'Cards:', '  A deck called jobs, starting in the pile:',
  '    | name   | red need | gold need | pay | worth | copies |', '    | Vase   | 2        | 0         | 1   | 3     | 2      |',
  '    | Statue | 1        | 2         | 2   | 4     | 2      |',
  '  A deck called hands, starting in the hall:',
  '    | name   | craft | skill | wage | copies |', '    | Potter | red   | 1     | 1    | 3      |',
  '    | Smith  | gold  | 2     | 2    | 2      |', '    | Tinker | mixed | 1     | 0    | 2      |',
  '  Cards can be tired.', '',
  'Table:', '  The pile is a pile in the center that no one can see.', '  The hall is a row in the center that everyone can see.',
  '  The scrap is a row in the center that everyone can see.', '  Each player has a stash row that only they can see.',
  '  Each player has a workshop row that everyone can see.',
  '  Each player has a crew row that everyone can see, where every card is on a card.',
  '  Each player has an idle row that everyone can see.', '',
  'Setup:', '  Deal 2 cards from the pile to each stash.', '',
  'Phase: working', '  Players take turns.',
  '  A player may start a card in their stash.', '    Then:', '      Move it to their workshop.',
  '  A player may hire some cards from the hall to a card in their workshop.', '    It costs 1 move.', '    Then:',
  '      The picked cards go to their crew, on the target card.',
  '  A player may shift a card from their crew to a card in their workshop.', '    It costs 1 move.',
  '    Only if it is not on the target card.', '    Then:', '      It goes to their crew, on the target card.',
  '  A player may finish a card in their workshop.', '    It costs 1 move.', '    Then:',
  '      Every card on it is tired.', '      Every card on it goes to their idle.', '      Move it to the scrap.',
  '  A player may stop.', '    Then:', '      Their moves go back to 0.',
  '  When they have less than 1 move:', '    The turn passes to the left.', '',
  'End:', '  The game ends when the scrap has more than 3 cards.', '  The highest score wins.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.** `crew(arrange)` is a 2-player `CREW_GAME` engine on `arrange(<the state after Setup, seed 1>)`. The arrangements relocate cards by name: `vase`, `statue`, and `potter1`/`potter2` (the hall's first two Potters).

In `compile.test.ts`, add `describe('zones whose cards sit on cards')`:
- `CREW_GAME` compiles with `[]`.
- The crew zone equals `{ name: 'crew', perPlayer: true, layout: 'row', visibility: 'public', onCards: 'every' }`.
- `'onCards' in idle` is false. The idle zone is a public per-player row read from "an idle row".
- `  Each player has an apron that only they can see.` added to Table: compiles, as a per-player pile.
- `  The hall is a row in the center that everyone can see, where every card is on a card.` gives `Only a zone each player has can hold cards on cards.` on its line.

In `zones.test.ts`:
- `relocate` and `toBottom` of a card whose data is `{ name: 'Ruby', 'lang:on': 'c9' }` leave `{ name: 'Ruby' }`.
- A card not moved keeps its `lang:on`.
- A moved card without the key keeps the same `data` object (`toBe`).

In the new `attach.test.ts`, on a `CREW_GAME` state with the Vase in `workshop-p0`:
- **A whole table.** Potters 1 and 2 in `crew-p0` on the Vase give `null`.
- **The four problems,** each with the message exactly as above:
  - a Potter in `crew-p0` with no holder: `The Potter in p0's crew isn't on any card, but every card there must be.`;
  - a Potter in `idle-p0` with a holder: `The Potter in p0's idle is on a card, but cards there don't sit on cards.`;
  - a holder id `c999`: `The Potter in p0's crew is on a card that is no longer on the table.`;
  - the Vase in `scrap`: `The Potter in p0's crew is on the Vase, which is now in the scrap. Move the cards on a card along with it.`
  - The same last message with `p1's workshop` (another seat) and `p0's stash` (not public).
- **Skipped.** For `TEST_DUEL`'s game, `attachmentProblem` gives null even with a forged `lang:on` on a card.
- `cardsOn` gives the Potters in slot order. `onCardsZoneOf(game, 'p1')` is `crew-p1`. For `COUNTER_GAME`'s game it throws the message.

In the new `library/attach-phrases.test.ts`, on `crew(…)` with the Vase and the Statue in `workshop-p0`:
- **Hire onto a job.** `{ type: <hire>, by: 'p0', cardIds: [potter1, potter2], onto: vase }` is accepted.
  - Both Potters are in `crew-p0` with `data['lang:on']` the Vase's id.
  - p0 has 1 move.
- **Shift.**
  - Shifting `potter1` onto the Vase is refused with `it is not on the target card`.
  - Onto the Statue it is accepted, and its holder is the Statue.
- **Finish.** Finishing the Vase is accepted:
  - the Vase is in `scrap`;
  - `potter2` is in `idle-p0`, tired, with no `lang:on` key.
- **Review Focus: the forgotten crew.** `DROPPING = CREW_GAME.replace('  A player may stop.', '  A player may drop a card in their workshop.\n    Then:\n      Move it to the scrap.\n  A player may stop.')`.
  - After the hire, dropping the Vase throws RuleError `The Potter in p0's crew is on the Vase, which is now in the scrap. Move the cards on a card along with it.`
  - `engine.getState()` equals the state before the press.
- **Needs.**
  - `      It goes to their crew, on the target card.` under `start` gives the 1b-1 `NEEDS_ONTO` message.
  - `      Every card on it goes to their idle.` under `stop` gives the needs-a-card message.
- **The zone must hold cards on cards.** Run `it goes to their idle, on the target card` about `potter1` with `onto: vase`. It throws `their idle doesn't hold cards on cards. End its Table line with “, where every card is on a card”.`
- **Review Focus: undo and replay.** After hire, shift and finish, `engine.undo()` three times gives back each earlier state, holders included. A fresh engine given `loadLog(engine.getLog())` equals the engine's state.
- **Examples.** `CREW_GAME` with this appended passes (`runExamples`):

```text
Example: a crew sits on its job
  Given p0's workshop has a Vase and a Statue
  And the Vase in p0's workshop has a Potter and a Smith on it
  When p0 shifts the Smith to the Statue
  Then it is accepted
  And the Vase in p0's workshop has a Potter on it
  And the Statue in p0's workshop has a Smith on it
  When p0 finishes the Vase
  Then the scrap has a Vase
  And p0's idle has a Potter
  And the Statue in p0's workshop has a Smith on it
```

- An example ending `Then the Vase in p0's workshop has no cards on it` right after its Given fails with `Expected the Vase in p0's workshop to have no cards on it, but it has a Potter red 1 1 and a Smith gold 2 2 on it.` (`describeCards`' own wording).

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/attach.test.ts src/engine/core/lang/zones.test.ts src/engine/core/lang/library/attach-phrases.test.ts src/engine/core/lang/compile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. In `goesIntoBottomFifth`, pass the card through `withoutHolder` with its face, as `relocate` would.
- [ ] **Step 4: Run** the four files and `bunx vitest run src/engine/core/lang src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/zones.ts src/engine/core/lang/attach.ts src/engine/core/lang/library/setup-phrases.ts \
  src/engine/core/lang/library/attach-phrases.ts src/engine/core/lang/library/index.ts src/engine/core/lang/library/queue-phrases.ts \
  src/engine/core/lang/library/example-phrases.ts src/engine/core/lang/runtime.ts src/engine/core/lang/build.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/attach.test.ts src/engine/core/lang/zones.test.ts src/engine/core/lang/library/attach-phrases.test.ts \
  src/engine/core/lang/compile.test.ts
git commit -m "feat(lang): cards that sit on cards, moves that take them off, and a check after every change that keeps the old state when a card is left on nothing"
```

---

### Task 2: Numbers on cards in arithmetic, "it loses its …", and setting a flag on the card

**Files:**
- Modify: `src/engine/core/lang/library/support.ts` (`cardNumber`)
- Modify: `src/engine/core/lang/library/move-phrases.ts` (its local `cardNumber` gives way to `support.ts`'s)
- Create: `src/engine/core/lang/library/card-number-phrases.ts` (`registerCardNumberPhrases`, in `REGISTRARS` right after `registerAttachPhrases`); modify `library/index.ts`
- Test: `src/engine/core/lang/library/card-number-phrases.test.ts` (new)

**Interfaces:**
- **`support.ts`:** `export function cardNumber(env: PhraseEnv, card: CardState, name: string): number`.
  - It reads `cardAttribute(card, name, env.game)` (Task 3 points it at the worked-out value).
  - No such number is RuleError `` `This card has no ${name}.` ``.
  - A value that is not a number is `` `This card's ${name} isn't a number.` ``
  - `move-phrases.ts` uses it for the card being moved, so its two phrases keep their messages.
- **`card-number-phrases.ts`.** Every phrase is about "it" (`needsCard`). "Is" and "are" are both registered, since counts are plural ("its blue cubes are …") and columns singular ("its salary is …"). Writing phrases change only a count the game declares on cards, else RuleError `` `Only a number the game keeps on cards can change, like “Cards can have charges.”; ${name} isn't one.` ``
  - Effect `it loses its {attribute}`: the count goes back to 0. The key is removed, so the face shows nothing.
  - Effects `its {attribute} go up by its {attribute}` and `its {attribute} goes up by its {attribute}`: the count gains the second number.
  - Effects `its {attribute} go up by its {attribute}, up to its {attribute}` and the `goes up` form: the count becomes `Math.max(have, Math.min(have + gain, cap))`. A count already past the cap is never lowered.
  - Conditions `its {attribute} is at least its {attribute}` and `its {attribute} are at least its {attribute}`.
  - Conditions `its {attribute} is more than {int}` and `its {attribute} are more than {int}`.
  - Effects `it is {cardflag}` and `it is not {cardflag}`: they set the flag on it, or take it off.

- [ ] **Step 1: Write the failing tests.** In the new `card-number-phrases.test.ts`:
  - `NUMBERED` is `CREW_GAME` with `  Cards can have red done, gold done, new red and new gold.` after `  Cards can be tired.`
  - `about(card)` is `fixtureEnv(state, { game, subject: { player: 'p0', space: null, card } })`.
  - Run each line with `runPhrase`.
- **Going up.** With the Vase at 1 red done and 3 new red:
  - `its red done go up by its new red` gives 4;
  - `its red done go up by its new red, up to its red need` gives 2 (red need 2);
  - from 5 red done, the capped form leaves 5.
- **Losing.**
  - `it loses its new red` leaves no `new red` key, and `cardAttribute` reads 0.
  - `it loses its pay` throws `Only a number the game keeps on cards can change, like “Cards can have charges.”; pay isn't one.`
- **Comparing.**
  - `its red done is at least its red need` is false at 1 and true at 2.
  - `its red done are at least its red need` reads the same.
  - `its pay is more than 1` is false for the Vase (pay 1) and true for the Statue (pay 2).
- **Flags.** `it is tired` sets `tired: true`, and `it is not tired` sets `false`.
- **No such number.**
  - `its red done go up by its skill` about the Vase throws `This card has no skill.`
  - `its craft is more than 0` about a Potter throws `This card's craft isn't a number.`
- **Needs.** In `NUMBERED`, `      It loses its new red.` under `stop` gives the needs-a-card message on its line.
- **Unchanged.** `move-phrases.test.ts` passes untouched.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/card-number-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** it and `bunx vitest run src/engine/core/lang src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/support.ts src/engine/core/lang/library/move-phrases.ts src/engine/core/lang/library/card-number-phrases.ts \
  src/engine/core/lang/library/index.ts src/engine/core/lang/library/card-number-phrases.test.ts
git commit -m "feat(lang): a number on a card going up by another, up to a cap, lost, or compared, and a flag set on the card a rule is about"
```

---

### Task 3: Values worked out for cards

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`PhraseKind` gains `'value'`, `ValueFn`, `WorkedValue`, `CompiledGame.worked`, `PhraseEnv.workedValue` and `.workedFlag`)
- Modify: `src/engine/core/lang/phrases.ts` (`PhraseLibrary.value`, the stub case, `vocabFrom`'s `worked`)
- Modify: `src/engine/core/lang/compile.ts` (`readCardSections`, `compileWorked`, `compile`)
- Modify: `src/engine/core/lang/compile-phase.ts` (export `readCondition`)
- Modify: `src/engine/core/lang/runtime.ts` (`workedValue`, `workedFlag`, `env`)
- Modify: `src/engine/core/lang/library/support.ts` (`cardValueOf`, `cardHasFlag`, `mustBeKept`; `cardNumber` reads `cardValueOf`)
- Modify: `src/engine/core/lang/library/fact-phrases.ts` (flags and numbers read through them; writers call `mustBeKept`)
- Modify: `src/engine/core/lang/library/move-phrases.ts` (`sameAsTop` reads `cardValueOf`)
- Modify: `src/engine/core/lang/library/attach-phrases.ts`, `card-number-phrases.ts` (writers call `mustBeKept`)
- Create: `src/engine/core/lang/library/card-value-phrases.ts` (`registerCardValuePhrases`, right after `registerCardNumberPhrases`); modify `library/index.ts`
- Modify: `src/engine/core/lang/testing.ts` (`fixtureEnv` takes `workedValue` and `workedFlag`; `vocabFor` passes `worked`)
- Test: `src/engine/core/lang/compile.test.ts`, `src/engine/core/lang/runtime.test.ts`, `src/engine/core/lang/library/card-value-phrases.test.ts` (new)

**Interfaces:**
- **`types.ts`:**
  - `ValueFn = (env: PhraseEnv, args: Json[], value: number | null) => number | null`, a line of a number section about the card in `env.subject.card`.
  - `WorkedValue = { kind: 'number'; refines: boolean; refs: PhraseRef[]; line: number } | { kind: 'flag'; conditions: CondGroup[]; line: number }`. `refines` is true when the value is named after a card table column.
  - `CompiledGame.worked?: { [name: string]: WorkedValue }`, present only when the game has a section.
  - `PhraseEnv.workedValue?: (state: GameState, cardId: string, name: string) => Json | null` and `PhraseEnv.workedFlag?: (state: GameState, cardId: string, flag: string) => boolean`.
- **`phrases.ts`:**
  - `value(pattern, fn: ValueFn, opts?)` registers kind `'value'`. Its stub signature is that of `'column'`.
  - `vocabFrom({ …, worked?: { name: string; kind: 'number' | 'flag' }[] })`: a worked number joins `attributes` and a worked flag joins `facts` as `{ name, on: 'card', kind: 'flag' }`. So `{attribute}` and `{cardflag}` read them.
- **`compile.ts`:**
  - **`readCardSections(others, board, cards, facts, diagnostics)`** gives `{ sections: Section[]; rest: OutlineNode[] }`. It runs once facts are accepted, before buttons are read, and `rest` goes on to `readColumnSections`. A header is a card section when all of these hold:
    - the game has a set that is not `'standard'`;
    - the header is not a board column;
    - either the header names a column of a card table, or its first line, normalized, matches `/^only if /i` or `/^an? (?:.+ )?card['‘’]s /i`.
  - **The kind.** A section all of whose lines are `Only if` is a flag; any other is a number. The worked names go into the `vocabFrom` of buttons and of `ctx`.
  - **`compileWorked(sections, ctx)`** reads number lines with `matchLine('value', …, { ...ctx, card: true })`, and flag lines with `readCondition(…, { ...ctx, card: true })`. Each is reported on its line:
    - mixed lines: `Write a worked-out value's lines all as “Only if …” (it holds when they all do) or all as “A … card's … is …”, not both.`
    - a name the game declares as a card fact: `` `“${name}” is already a fact cards keep; a value worked out from lines needs a name of its own.` ``
    - a flag named after a column: `` `“${name}” is a column of the card table, so it is a number; work it out with lines like “A … card's ${name} is …”.` ``
    - a number line whose text after `card's` up to ` is`/` are` names another value: `` `This line is about “${said}”, but it is under ${header}:.` ``
  - **Other headers.** An unknown header that is not a card section is reported as today (`UNKNOWN_SECTION`).
- **`runtime.ts`:**
  - **`workedValue(state, cardId, name): Json | null`**, for a worked number:
    - it starts from the card's number under the name when `refines` (null without one), else from 0;
    - each ref then has its say about `{ player: null, space: null, card: cardId }`, in order.
    - Any other name gives `cardAttribute`.
    - While one `(card, name)` is being worked out, asking it again throws RuleError `` `“${name}” is worked out from itself.` `` (a `Set` of keys, cleared in `finally`).
  - **`workedFlag(state, cardId, flag): boolean`.** For a worked flag it is `failedGroup(conditions, state, undefined, { card }) === null`; for any other it is `cardFact(card, flag) === true`.
  - `env()` supplies both.
- **`support.ts`:**
  - `cardValueOf(env, card, name): Json | null` (`env.workedValue` when present, else `cardAttribute`).
  - `cardHasFlag(env, card, flag): boolean` (`env.workedFlag` when present, else the stored flag).
  - `mustBeKept(env, name): void` throws `` `“${name}” is worked out from its lines, so no rule can change it.` `` for a worked name.
  - `cardNumber` reads `cardValueOf`.
- **Readers changed:**
  - `fact-phrases.ts`: `isFlagged(env, card, fact)` via `cardHasFlag`, in every phrase that reads a flag; `cardsWithNumber` and the expect `{card} in {zone} has {int} {attribute}` via `cardValueOf`.
  - `move-phrases.ts`: `sameAsTop` via `cardValueOf`.
- **Writers changed:** `changeNumber`, `everyCardIsFlagged`, `noCardIs`, the Givens `{card} in {zone} is {cardflag}` and `… has {int} {attribute}`, Task 1's `every card on it is {cardflag}` and Task 2's writers each call `mustBeKept` first.
- **`card-value-phrases.ts`** (kind `value`):
  - `{cardclass}'s {attribute} is its {attribute}`: a card of that class has its other number, any other card keeps the value so far;
  - `{cardclass}'s {attribute} is {int}`;
  - `a {cardflag} card's {attribute} is {int}` and `an {cardflag} card's {attribute} is {int}`: a card with the flag has the number.
- **`testing.ts`:** `vocabFor` passes `worked` from `game.worked`, and `fixtureEnv` takes `workedValue` and `workedFlag`.

- [ ] **Step 1: Write the failing tests.** `WORKED` is `NUMBERED` (Task 2) with these sections appended:

```text
Red work:
  A red card's red work is its skill.
  A mixed card's red work is its skill.
  A tired card's red work is 0.

Gold work:
  A gold card's gold work is its skill.
  A mixed card's gold work is its skill.
  A tired card's gold work is 0.

Wage:
  A Tinker card's wage is 1.

Done:
  Only if its red done are at least its red need.
  Only if its gold done are at least its gold need.
```

In `compile.test.ts`, add `describe('values worked out for cards')`:
- `WORKED` compiles with `[]`.
- `game.worked` has `red work` and `gold work` (`kind: 'number'`, `refines: false`, 3 refs each), `wage` (`refines: true`, 1 ref) and `done` (`kind: 'flag'`, 2 groups).
- `vocabFor(game).attributes` contains `red work`, and `{cardflag}` reads `done`.
- **Problems,** each on its line, with no game:
  - an `Only if its pay is more than 0.` line added under `Red work:` gives the mixed message;
  - `Tired:\n  Only if its pay is more than 1.` gives the fact message;
  - `Pay:\n  Only if its red need is more than 1.` gives the column message;
  - `  A red card's gold work is 1.` under `Red work:` gives `This line is about “gold work”, but it is under Red work:.`
- **Unknown sections stay unknown.** `Setpu:\n  Deal 2 cards from the pile to each stash.` still gives `UNKNOWN_SECTION`, with Setup suggested.
- **Board games untouched.** Rent Day compiles as before, and its `Rent:` is still a column section.

In the new `card-value-phrases.test.ts`, with an engine on a `WORKED` state and `runtime = createEngine(…).runtime`:
- **Numbers:**
  - Potter: `red work` 1, `gold work` 0.
  - Smith: `gold work` 2, `red work` 0.
  - Tinker: 1 and 1.
  - A tired Potter: `red work` 0.
- **A column refined:** Potter `wage` 1, Smith 2, Tinker 1 (its column is 0).
- **A flag:** a Vase with 2 red done is `done`, and with 1 it isn't. A Statue needs 1 red and 2 gold done.
- **Read through.**
  - `it is done` (condition) about the Vase follows the flag.
  - Running `they have at least the card's wage in coins` on a move of a Tinker with p0 at 0 coins is false. At 1 coin it is true.
  - An example `Then the Potter in p0's crew has 1 red work` passes.
- **Written.**
  - `it gains 1 red work` throws `“red work” is worked out from its lines, so no rule can change it.`
  - `it is done` (effect) throws the same about `done`.
- **Review Focus: a value that reads itself.** `WORKED` plus `Loop:\n  A red card's loop is its loop.`: `runtime.workedValue(state, potter, 'loop')` throws RuleError `“loop” is worked out from itself.`

In `runtime.test.ts`: for `TEST_DUEL`'s game, `workedValue` of a card's `rank` equals `cardAttribute`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/compile.test.ts src/engine/core/lang/runtime.test.ts src/engine/core/lang/library/card-value-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them and `bunx vitest run src/engine/core/lang src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/phrases.ts src/engine/core/lang/compile.ts src/engine/core/lang/compile-phase.ts \
  src/engine/core/lang/runtime.ts src/engine/core/lang/library/support.ts src/engine/core/lang/library/fact-phrases.ts \
  src/engine/core/lang/library/move-phrases.ts src/engine/core/lang/library/attach-phrases.ts src/engine/core/lang/library/card-number-phrases.ts \
  src/engine/core/lang/library/card-value-phrases.ts src/engine/core/lang/library/index.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/compile.test.ts src/engine/core/lang/runtime.test.ts src/engine/core/lang/library/card-value-phrases.test.ts
git commit -m "feat(lang): values worked out for cards, a section each, numbers refined line by line and flags made of Only if lines, read by every phrase that reads a card"
```

---

### Task 4: Totals over cards, and "For each card …"

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`CardGroup`)
- Modify: `src/engine/core/lang/refs.ts` (`CARDGROUP`)
- Modify: `src/engine/core/lang/compile-util.ts` (the "for each" frame, `innerEffect`, `unmetNeed`)
- Modify: `src/engine/core/lang/runtime.ts` (`run` for `'for each'`)
- Modify: `src/engine/core/lang/library/support.ts` (`cardsIn`, `totalOf`)
- Create: `src/engine/core/lang/library/total-phrases.ts` (`registerTotalPhrases`, right after `registerCardValuePhrases`); modify `library/index.ts`
- Test: `src/engine/core/lang/refs.test.ts`, `src/engine/core/lang/compile-util.test.ts`, `src/engine/core/lang/library/total-phrases.test.ts` (new)

**Interfaces:**
- **`types.ts`:** `CardGroup = { kind: 'in'; zones: ZoneRef[]; whose: { attribute: string; above: number } | null } | { kind: 'on it' } | { kind: 'picked' }`.
- **`refs.ts`:** `CARDGROUP`, type `'cardgroup'`, label `'[cards]'`, added to `VOCAB_TYPES`.
  - It reads `the cards on it`, `the picked cards`, `the cards in {zones}` and `the cards in {zones} whose {attribute} is more than {int}` (or `are more than`).
  - The zones and the attribute are read with `parseParam('zones' | 'attribute', …)`. A misnamed one is explained by that type.
- **`compile-util.ts`:**
  - **The frame.** `FOR_EACH_FRAME = /^for each card (.+)$/i` is tried in `matchEffectLine` before the holder frame (R6). Its body is cut at each ", ":
    - the head is read as `{cardgroup}` with "the cards " put before it;
    - the first cut whose head and effect both read wins, then the first whose head reads, then the first cut;
    - the effect is read with `{ ...ctx, card: true, inMove: false }`, so "it" is each card and "they" stays whoever the line is about.
  - **The ref.** `{ kind: 'lang', phrase: 'for each', args: [group, effect], line, text }`.
  - **A head that reads no group.** It reports its misnamed zone or attribute, else `` `“${head}” doesn't say which cards. Write “For each card in their hand, …” or “For each card on it, …”.` ``
  - `innerEffect` also unwraps `'for each'`.
  - **`unmetNeed`**, and the frame's own check, add:
    - a `{ kind: 'on it' }` argument needs `ctx.card` (the needs-a-card message);
    - a `{ kind: 'picked' }` argument needs `ctx.cards` (1b-1's `NEEDS_CARDS`).
    - A group's "their" zones already need a player through `mentionsActor`.
- **`runtime.ts`, `run`:** for `'for each'`, `ids` are `cardsIn` about the line's subject, taken once before the first card. The effect then runs about `{ ...subject, card: id }` for each, with no move.
- **`support.ts`:**
  - `cardsIn(env, group): CardState[]`:
    - zone by zone, slot by slot, keeping a card whose `cardNumber` under `whose.attribute` is above `whose.above`;
    - the cards on `cardOf(env)` (`cardsOn`);
    - the cards of `thePickedCards(env)`, in the press's order.
  - `totalOf(env, attribute, group): number` is the sum of `cardNumber` over `cardsIn`.
- **`total-phrases.ts`:**
  - Condition `the total {attribute} of {cardgroup} is {int}`.
  - Condition `they have at least the total {attribute} of {cardgroup} in {counter}` (`needsPlayer`).
  - Effect `they get the total {attribute} of {cardgroup}` (`needsPlayer`, `needsPayment`) adds the total to their number players pay with.
  - Effect `they pay the total {attribute} of {cardgroup}` (`needsPlayer`, `needsPayment`) is `transfer(env, they, null, total)`.
  - Value `a card's {attribute} is the total {attribute} of {cardgroup}`.

- [ ] **Step 1: Write the failing tests.** `TOTALS` is `WORKED` (Task 3) plus:

```text
Crew red:
  A card's crew red is the total red work of the cards on it.
```

In `refs.test.ts`:
- `the cards in their crew and their idle` gives `{ kind: 'in', zones: [<their crew>, <their idle>], whose: null }`.
- `the cards in the hall whose skill is more than 1` gives `whose: { attribute: 'skill', above: 1 }`.
- `the cards on it` and `the picked cards` give their kinds.
- `the cards in their crwe` gives the zone type's misnamed message.

In `compile-util.test.ts`:
- `For each card in their workshop, it loses its new red.` reads as a `'for each'` ref whose effect is `it loses its {attribute}`.
- `For the player who is first, they get 1 coin.` still reads as the holder frame, in a game with a `first` player flag.
- `For each card in their workshop, they get 1 coin.` in a rule about no one gives the needs-a-player message.
- `For each card in their wrokshop, it is tired.` gives the misnamed zone.
- `For each card on it, it is tired.` in a rule about no card gives the needs-a-card message.

In the new `total-phrases.test.ts`, on a `TOTALS` state, p0's workshop holding the Vase (pay 1) and the Statue (pay 2), and on the Vase a Potter and a Tinker:
- **Sums.**
  - `they get the total pay of the cards in their workshop` takes p0 from 9 to 12 coins.
  - `they pay the total wage of the cards in their crew` (Potter 1 + Tinker 1) takes p0 to 7.
  - `they have at least the total wage of the cards in their crew in coins` is true at 2 coins and false at 1.
  - `the total wage of the cards in their idle is 0` is true.
- **Filtered.** `the total pay of the cards in their workshop whose pay is more than 1 is 2` is true.
- **A value made of a total.** The Vase's `crew red` is 2. With the Tinker tired it is 1.
- **A card that lacks the number.** `they pay the total pay of the cards in their crew` throws `This card has no pay.`
- **The picked cards.** In a set button `A player may count some cards from the hall.\n    Only if they have at least the total wage of the picked cards in coins.`, a press with the Smiths is accepted at 4 coins and refused at 3.
- **For each.**
  - `For each card in their workshop, its new red go up by its crew red.` leaves the Vase at 2 new red and the Statue at 0.
  - `For each card in their workshop whose pay is more than 1, they get 1 coin.` gives 1 coin.
- **Review Focus: a walk whose line moves its cards.**
  - `For each card in their workshop, move it to the scrap.` with Vase, Statue and a second Vase in the workshop leaves the scrap with exactly those three, in that order.
  - `For each card in their workshop, move the top card of the pile to their workshop.` with 2 cards in the workshop and 3 in the pile runs twice: the workshop ends with 4 cards and the pile with 1.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/refs.test.ts src/engine/core/lang/compile-util.test.ts src/engine/core/lang/library/total-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them and `bunx vitest run src/engine/core/lang src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/refs.ts src/engine/core/lang/compile-util.ts src/engine/core/lang/runtime.ts \
  src/engine/core/lang/library/support.ts src/engine/core/lang/library/total-phrases.ts src/engine/core/lang/library/index.ts \
  src/engine/core/lang/refs.test.ts src/engine/core/lang/compile-util.test.ts src/engine/core/lang/library/total-phrases.test.ts
git commit -m "feat(lang): totals of a number over cards in zones, on a card or picked, and lines that run for each card"
```

---

### Task 5: "Go to {phase}." and a first phase that starts each turn

**Files:**
- Modify: `src/engine/core/lang/library/flow-phrases.ts` (`goToPhase`)
- Test: `src/engine/core/lang/library/flow-phrases.test.ts`, `src/engine/core/lang/runtime.test.ts`

**Interfaces:**
- Consumes 1a-1's `TURN_GAME`, `ROUNDS_GAME`, "… and the round is finished" (Task 5) and phase-scoped turn starts (Task 4, C2). Nothing of C2 or C3 is rebuilt.
- **Effect `go to {phase}`** (`entersPhase: true`, so `warnUnreachable` counts it):
  - the phase becomes the named one (`setPhase`, imported from `game-state.ts`, not changed);
  - then its start lines run through `env.runLine`, about the player whose turn it is where players take turns and about no one where everyone acts at once, as an advance runs them (R2).
  - With no turn it is RuleError `There is no turn to move on.`

- [ ] **Step 1: Write the failing tests.**

In `flow-phrases.test.ts`, add `describe('Go to a phase')`. `HURRY` is `TURN_GAME` with `  A player may hurry.\n    Then:\n      Go to tidying.` before `  A player may stop.` Its engine is on `{ ...initialState(game, 1), turn: { current: 'p0', phase: 'working' } }`, as in 1a-1's Task 4, so p0 starts with an empty list and 0 coins.
- **The start lines run.** p0 hurries. Tidying's start line gives p0 1 coin. The turn passes on its rule, so it is p1's turn in working.
- **Reached only this way.** `HURRY` without `  When they have less than 1 move, go to tidying.` compiles with no `Nothing leads to` warning.
- **A misnamed phase.** `      Go to tidyng.` gives `There is no phase called “tidyng”.` with `tidying` suggested.

In `runtime.test.ts`, add `describe('a first phase that starts each turn')`. `PAYDAY` is `ROUNDS_GAME` with these changes:
- this phase inserted before `Phase: working`:

```text
Phase: payday
  When a player's turn starts:
    They get 5 coins.
  A player may settle.
    Then:
      Go to working.
```

- its End lines replaced by `  The game ends when the done pile is not empty and the round is finished.` and `  The highest score wins, and tied players share the win.`

The tests run 3 players on `{ ...initialState(game, 1), turn: { current: 'p0', phase: 'payday' } }`:
- `PAYDAY` compiles with `[]`.
- **Each turn starts in payday.** p0 has 6 coins (1 every phase, then 5). p0 settles: working. p0 stops: p0 has 7 (tidying's 1). It is p1's turn in payday, and p1 has 6.
- **R2's window.**
  - p1 settles and stops, and p2 settles and stops.
  - The game is over, round 1 finished.
  - p0 still has 7 coins: the round's end came before p0's next payday.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/flow-phrases.test.ts src/engine/core/lang/runtime.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** them, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/flow-phrases.ts src/engine/core/lang/library/flow-phrases.test.ts src/engine/core/lang/runtime.test.ts
git commit -m "feat(lang): “Go to a phase.” runs that phase's start lines, and a first phase whose turn-start lines stay out of the round's last window"
```

---

### Task 6: Looking at as many cards as were picked, the left end of a row, and two score lines

**Files:**
- Modify: `src/engine/core/lang/library/queue-phrases.ts` (export `dealUpTo`; two effects)
- Modify: `src/engine/core/lang/library/flow-phrases.ts` (a score), `src/engine/core/lang/library/board-phrases.ts` (a score)
- Test: `src/engine/core/lang/library/queue-phrases.test.ts`, `src/engine/core/lang/library/flow-phrases.test.ts`, `src/engine/core/lang/library/board-phrases.test.ts`

**Interfaces:**
- **`queue-phrases.ts`:**
  - Effect `deal up to as many cards as they picked from {zone} to {zone}` (`needsCards`) is `dealUpTo` with `thePickedCards(env).length`.
  - Effect `move {zone} to the left end of {zone}`: each card of the first zone, from its top card down, goes under every card of the second zone (`toBottom`). The second zone then holds the first's cards in their slot order, then its own (R7). The holders are dropped and the faces turned as `toBottom` does.
- **`flow-phrases.ts`:** score `each card in a player's {perzone} scores its {attribute}`: the sum of `cardNumber` over the seat's zone.
- **`board-phrases.ts`:** score `each player scores {int} point(s) for each {counter}`: `points × counter`.

- [ ] **Step 1: Write the failing tests.**

In `queue-phrases.test.ts`, on `CREW_GAME`:
- **As many as picked.**
  - About `{ player: 'p0', cards: [a, b] }`, `deal up to as many cards as they picked from the pile to their stash` deals the pile's top two to `stash-p0`, in pile order.
  - With 1 card in the pile it deals 1, and with none it deals none.
  - In a button that picks no set, the line gives `NEEDS_CARDS`.
- **The left end.**
  - With the hall holding h1, h2, h3 and `stash-p0` s1, s2, `move their stash to the left end of the hall` leaves the hall s1, s2, h1, h2, h3 in slot order, all face up, and the stash empty.
  - A card with `lang:on` loses it.
- **R7's push-out order.** `RETURNING` is `CREW_GAME` with two additions:
  - `In every phase:\n  When the hall has more than 4 cards:\n    Move the top card of the hall to the scrap.`;
  - `  A player may return some cards from their stash.\n    Then:\n      Move their stash to the left end of the hall.`

  With the hall h1–h4 and the stash s1, s2, p0 returns both. The hall is s1, s2, h1, h2, and the scrap h4, h3, in that order.

In `flow-phrases.test.ts`, with p0's workshop holding a Vase (worth 3) and a Statue (worth 4):
- `each card in a player's workshop scores its worth` gives 7 for p0 and 0 for p1.
- Over the crew it throws `This card has no worth.`

In `board-phrases.test.ts`: `each player scores 2 points for each star`, with `  Each player has 0 stars that everyone can see.` added and p0 at 3 stars, gives 6. At 0 it gives 0.

- [ ] **Step 2: Run** the three files. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/queue-phrases.ts src/engine/core/lang/library/flow-phrases.ts src/engine/core/lang/library/board-phrases.ts \
  src/engine/core/lang/library/queue-phrases.test.ts src/engine/core/lang/library/flow-phrases.test.ts src/engine/core/lang/library/board-phrases.test.ts
git commit -m "feat(lang): dealing as many cards as were picked, cards entering a row at its left end, and scoring a card's number or points per counter"
```

---

### Task 7: Startup Simulator, rules text A: the Board, and staff on it

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`
- Modify: `src/pages/designer/designer-page.test.tsx` (the example count), `src/pages/designer/tableaux.test.ts`, `src/pages/designer/playtest-fitted.test.tsx` (tableau lines)

**Interfaces:**
- **New move types:**
  - `greenlight a card in their backlog`;
  - `assign some cards from their bench to a card in their development` and `assign some cards from their bench to their ops team`;
  - `reassign a card from their development team to a card in their development` and `reassign a card from their ops team to a card in their development`;
  - `recall some cards from their ops team to their bench`;
  - `hire a card from the agency row to a card in their development` and `hire a card from the agency row to their ops team`;
  - `dismiss a card in their development team` and `dismiss a card in their ops team`.
- **New zone ids:** `development-pN`, `operations-pN`, `development-team-pN`, `ops-team-pN`.

- [ ] **Step 1: Change the rules text.**
  - **Table.** After `  Each player has a research row that only they can see.`, add:

```text
  Each player has a development row that everyone can see.
  Each player has an operations row that everyone can see.
  Each player has a development team row that everyone can see, where every card is on a card.
  Each player has an ops team row that everyone can see.
```

  - **Cards.** At the end of `Cards:`, add `  Cards can be onboarding.`
  - **In every phase.** At the top of `In every phase:`, add:

```text
  When a player's turn starts:
    No card is onboarding.
```

  - **Actions.**
    - The hint becomes `  Hint: Spend 3 actions on hiring, drafting, research and your board. Greenlighting and dismissing are free. Press a button, then pick the cards.`
    - Right after `  A player may hire a card from the open job market to their bench.` and its lines, add the following:

```text
  A player may hire a card from the agency row to a card in their development.
    It costs 1 action.
    Only if they have at least the card's cost in capital.
    Then:
      They pay the card's cost.
      It goes to their development team, on the target card.
  A player may hire a card from the agency row to their ops team.
    It costs 1 action.
    Only if their operations is not empty.
    Only if they have at least the card's cost in capital.
    Then:
      They pay the card's cost.
  A player may greenlight a card in their backlog.
    Only if their development has fewer than 3 cards.
    Only if the card is a Tier 1 card.
    Then:
      Move it to their development.
  A player may assign some cards from their bench to a card in their development.
    It costs 1 action.
    Then:
      The picked cards go to their development team, on the target card.
  A player may assign some cards from their bench to their ops team.
    It costs 1 action.
    Only if their operations is not empty.
  A player may reassign a card from their development team to a card in their development.
    It costs 1 action.
    Only if it is not on the target card.
    Then:
      It goes to their development team, on the target card.
      It is onboarding.
  A player may reassign a card from their ops team to a card in their development.
    It costs 1 action.
    Then:
      It goes to their development team, on the target card.
      It is onboarding.
  A player may recall some cards from their ops team to their bench.
    It costs 1 action.
  A player may dismiss a card in their development team.
    Then:
      Move it to the open job market.
  A player may dismiss a card in their ops team.
    Then:
      Move it to the open job market.
```

  Where the numbers come from:
  - 3 projects: §3 and §14.B.1.
  - Greenlight 0, and Assign, Reassign and Recall 1 each: §6, ruling 7.
  - Dismiss 0: §18.B, ruling 25.
  - Agency hires onto the Board: §13.A.2 Option B, ruling 20.
  - Onboarding: §6 Reassign, ruling 8.
  - Ops staff only with a product: the overview's call.
  - Tier 1 only: this slice's call.

  - **Three 1a examples reworded** (R1, now that three buttons hire from the agency row):
    - in "you can't pay, so you can't act", `When p0 hires the Diva` becomes `When p0 hires the Diva to p0's bench`;
    - in "the agency row slides left …", `When p0 hires the Architect` and `When p0 hires the Hacker` gain ` to p0's bench`.

- [ ] **Step 2: Append these 10 examples.** Each that puts staff on the Board starts with `Given the phase is actions`, so it still holds once Task 8 puts Income first.

```text
Example: greenlighting is free (ruling 7)
  Given p0's backlog has a Dating App and a Smart Lock
  When p0 greenlights the Dating App
  Then it is accepted
  And p0 has 3 actions
  And p0's development has a Dating App
  And p0's backlog has a Smart Lock

Example: three projects at most (section 3)
  Given p0's development has a To-Do List, a Dating App and a Mobile Wallet
  And p0's backlog has a Smart Lock
  When p0 greenlights the Smart Lock
  Then it is rejected because "their development has fewer than 3 cards"
  And p0's backlog has a Smart Lock

Example: only Tier 1 products are greenlit until Leads and Tags arrive (this slice's call)
  Given p0's backlog has a Neobank
  When p0 greenlights the Neobank
  Then it is rejected because "the card is a Tier 1 card"
  And p0's backlog has a Neobank

Example: assigning several staff to one project costs 1 action (section 6)
  Given the phase is actions
  And p0's development has a Dating App
  And p0's bench has a Junior Software Dev, the Architect and a Junior QA Tester
  When p0 assigns the Junior Software Dev and the Architect to the Dating App
  Then it is accepted
  And p0 has 2 actions
  And the Dating App in p0's development has a Junior Software Dev and the Architect on it
  And p0's bench has a Junior QA Tester

Example: the ops team takes staff only while operations runs a product (the overview's call)
  Given p0's bench has a Junior Software Dev
  When p0 assigns the Junior Software Dev to p0's ops team
  Then it is rejected because "their operations is not empty"
  And p0 has 3 actions
  Given p0's operations has a To-Do List
  When p0 assigns the Junior Software Dev to p0's ops team
  Then it is accepted
  And p0's ops team has a Junior Software Dev
  And p0 has 2 actions

Example: an agency hire may go straight onto the board (ruling 20)
  Given the phase is actions
  And p0 has 13 capital
  And the agency row has the Hacker, the Architect, the Veteran and the Diva
  And p0's development has a Dating App
  And p0's operations has a To-Do List
  When p0 hires the Architect to the Dating App
  Then it is accepted
  And p0 has 6 capital
  And p0 has 2 actions
  And the Dating App in p0's development has the Architect on it
  When p0 hires the Veteran to p0's ops team
  Then it is accepted
  And p0 has 0 capital
  And p0's ops team has the Veteran

Example: a reassigned staff member is onboarding until the next turn starts (ruling 8)
  Given the phase is actions
  And p0's development has a Dating App and a To-Do List
  And the Dating App in p0's development has a Junior Software Dev on it
  When p0 reassigns the Junior Software Dev to the Dating App
  Then it is rejected because "it is not on the target card"
  When p0 reassigns the Junior Software Dev to the To-Do List
  Then it is accepted
  And p0 has 2 actions
  And the To-Do List in p0's development has a Junior Software Dev on it
  And the Dating App in p0's development has no cards on it
  And the Junior Software Dev in p0's development team is onboarding
  When p0 ends their actions
  Then it is p1's turn
  And the Junior Software Dev in p0's development team is not onboarding

Example: pooled ops staff may move to a project (ruling 25)
  Given the phase is actions
  And p0's development has a Dating App
  And p0's operations has a To-Do List
  And p0's ops team has a Junior Software Dev and a Junior QA Tester
  When p0 reassigns the Junior Software Dev to the Dating App
  Then it is accepted
  And the Dating App in p0's development has a Junior Software Dev on it
  And p0's ops team has a Junior QA Tester
  And the Junior Software Dev in p0's development team is onboarding

Example: recall brings any number of ops staff back to the bench, but never project staff (section 6)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has the Veteran on it
  And p0's operations has a To-Do List
  And p0's ops team has a Junior Software Dev, a Junior QA Tester and the Architect
  When p0 recalls the Veteran
  Then it is rejected because "Pick one or more cards from your ops team to recall."
  When p0 recalls the Junior Software Dev and the Architect
  Then it is accepted
  And p0 has 2 actions
  And p0's bench has a Junior Software Dev and the Architect
  And p0's ops team has a Junior QA Tester

Example: dismissing board staff is free (section 18, ruling 25)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has the Architect on it
  And p0's operations has a To-Do List
  And p0's ops team has a Junior QA Tester
  When p0 dismisses the Architect
  Then it is accepted
  And p0 has 3 actions
  And the Dating App in p0's development has no cards on it
  When p0 dismisses the Junior QA Tester
  Then it is accepted
  And p0 has 3 actions
  And the open job market has the Architect and a Junior QA Tester, in that order
  And p0's ops team is empty
```

How the numbers come:
- 13 − $7 (the Architect) − $6 (the Veteran) = 0, by §20.B.
- A Junior's output and salary don't matter here.
- The onboarding clear is p1's turn start (§6 Pivot: "Tokens clear at the start of the next turn").

- [ ] **Step 3: Update `startup-simulator.test.ts`.**
  - **Examples:** 31 results, all `pass`.
  - **The zones:**
    - bench, backlog and research are owner rows;
    - development, operations, development team and ops team are public per-player rows;
    - only the development team has `onCards: 'every'`.
  - **Setup at every count:** each player's development, operations and both teams are empty.
  - **Ruling 20, by the buttons.**
    - Every actions-phase button whose `pick.from` is the open job market has `pick.to` the player's bench.
    - The three recruit buttons have no `pick`.
  - **Ruling 25 and §6, by the buttons.** The actions-phase buttons whose `pick.from` is the development team are exactly two:
    - the reassign, whose `pick.onto` is the development;
    - the dismiss, with no `pick.to`.

    So no press moves project staff to the ops team or the bench by itself. Launch and Pivot (Task 8) move a project's staff as part of their own lines (§6), and this test does not look at those.
- [ ] **Step 4: Update the page tests that spell out the sample's tableaux.**
  - In `tableaux.test.ts` and `playtest-fitted.test.tsx`, each exact tableau line gains ` · development 0 · operations 0 · development team 0 · ops team 0` right after its `research N`, before any ` · start player`.
  - Lines checked with "has" or "starts" stay as they are.
  - In `designer-page.test.tsx`, `21 of 21 examples pass` becomes `31 of 31 examples pass`.
- [ ] **Step 5: Run** `bunx vitest run src/games src/pages/designer`. The 1b-1 long runs must still pass unchanged: their auto-player presses none of the new buttons. Then run `bun run test` and `bun run typecheck`.
- [ ] **Step 6: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx \
  src/pages/designer/tableaux.test.ts src/pages/designer/playtest-fitted.test.tsx
git commit -m "feat(games): Startup Simulator's Board: Greenlight, Assign, Reassign with Onboarding, Recall, Dismiss and agency hires straight onto it"
```

---

### Task 8: Startup Simulator, rules text B: Income, the Engine, Launch, Pivot, Source and the score

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`
- Modify: `src/pages/designer/designer-page.test.tsx`, `src/pages/designer/tableaux.test.ts`, `src/pages/designer/playtest-fitted.test.tsx`, `README.md`

**Interfaces:**
- **New move types:**
  - `let go of a card in their development team`, `let go of a card in their ops team` and `pay salaries`;
  - `launch a card from their development to their operations`, `pivot a card in their development` and `lay off some cards from their bench to the open job market`;
  - in sourcing: `hire some cards from their scouting to their bench`, `… to their ops team`, `… to a card in their development` and `pass on the rest`.
- **New zone:** `scouting-pN`.
- **The phases, in order:** income, actions, research, sourcing, engine, commit, bench cleanup, backlog cleanup.

- [ ] **Step 1: Change the rules text.**
  - **Players.** After the actions line, add `  Each player has 0 market share that everyone can see.`
  - **Cards.** At the end of `Cards:`, add `  Cards can have blue cubes, red cubes, new blue cubes and new red cubes.`
  - **Table.** At the end of `Table:`, add `  Each player has a scouting row that only they can see.`
  - **Worked-out values.** After `Table:`, add:

```text
Blue output:
  A software card's blue output is its output.
  A flex card's blue output is its output.
  An onboarding card's blue output is 0.

Red output:
  A hardware card's red output is its output.
  An onboarding card's red output is 0.

Blue team output:
  A card's blue team output is the total blue output of the cards on it.

Red team output:
  A card's red team output is the total red output of the cards on it.

Feature complete:
  Only if its blue cubes are at least its blue cost.
  Only if its red cubes are at least its red cost.
```

  - **In every phase.** Add:

```text
  When the agency row has more than 4 cards:
    Move the top card of the agency row to the open job market.
```

  - **Income.** Before `Phase: actions`, add:

```text
Phase: income
  Hint: Pay every salary on your board. If you can't, or won't, let go of the staff you won't pay.
  When a player's turn starts:
    They get the total rev of the cards in their operations.
    For each card in their operations whose rev is more than 0, they get 1 market share.
  A player may let go of a card in their development team.
    Only if its salary is more than 0.
    Then:
      Move it to the open job market.
  A player may let go of a card in their ops team.
    Only if its salary is more than 0.
    Then:
      Move it to the open job market.
  A player may pay salaries.
    Only if they have at least the total salary of the cards in their development team and their ops team in capital.
    Then:
      They pay the total salary of the cards in their development team and their ops team.
      Go to actions.
  When the total salary of the cards in their development team and their ops team is 0, go to actions.
```

  - **Actions.** Before `  A player may end their actions.`, add:

```text
  A player may launch a card from their development to their operations.
    It costs 1 action.
    Only if it is feature complete.
    Then:
      Every card on it goes to their ops team.
  A player may pivot a card in their development.
    It costs 1 action.
    Then:
      Every card on it is onboarding.
      Every card on it goes to their bench.
      It loses its blue cubes.
      It loses its red cubes.
      Move it to the open idea pool.
  A player may lay off some cards from their bench to the open job market.
    It costs 1 action.
    Then:
      Deal up to as many cards as they picked from the talent deck to their scouting.
      The sourcing phase starts with them.
```

  - **Actions' last line** becomes `  When they have less than 1 action, go to engine.`
  - **Sourcing.** After the research phase, add:

```text
Phase: sourcing
  Hint: Hire any of the cards you found at their printed cost, to your bench or straight onto your board. The rest go to the agency row.
  A player may hire some cards from their scouting to their bench.
    Only if they have at least the total cost of the picked cards in capital.
    Then:
      They pay the total cost of the picked cards.
  A player may hire some cards from their scouting to their ops team.
    Only if their operations is not empty.
    Only if they have at least the total cost of the picked cards in capital.
    Then:
      They pay the total cost of the picked cards.
  A player may hire some cards from their scouting to a card in their development.
    Only if they have at least the total cost of the picked cards in capital.
    Then:
      They pay the total cost of the picked cards.
      The picked cards go to their development team, on the target card.
  A player may pass on the rest.
    Then:
      Move their scouting to the left end of the agency row.
  When their scouting is empty:
    Go back to the interrupted turn.
```

  - **The Engine.** Before `Phase: bench cleanup`, add:

```text
Phase: engine
  When this phase starts:
    For each card in their development, its new blue cubes go up by its blue team output.
    For each card in their development, its new red cubes go up by its red team output.
    Go to commit.

Phase: commit
  When this phase starts:
    For each card in their development, its blue cubes go up by its new blue cubes, up to its blue cost.
    For each card in their development, its red cubes go up by its new red cubes, up to its red cost.
    For each card in their development, it loses its new blue cubes.
    For each card in their development, it loses its new red cubes.
    Go to bench cleanup.
```

  - **End.** After `  Each player scores 1 point for every 5 capital.`, add:

```text
  Each card in a player's operations scores its val.
  Each player scores 2 points for each market share.
```

  Where the rules come from:
  - Income: §5 Phase B steps 2 and 4.
    - Market Share needs more than $0 (ruling 25).
    - Only salaried staff go unpaid (R2; Rust `income.rs`).
    - The $0 skip is the spec's call.
    - Every Ops product is Active until slice 4 (ruling 5).
  - Launch and Pivot: §6, ruling 7.
  - Generate, Commit and Complete: §5 Phase D steps 1, 4 and 5.
    - Flex staff work in Blue (§11.C.2).
    - Cubes are capped at the cost (R8).
  - Layoff / Source: §13.B, rulings 20 and 25. The left-end order is R7's.
  - The push-out at 4: §13.A.2 and §15.A.3.
  - Scores: §12 lines 1 and 3.

- [ ] **Step 2: Append these 19 examples,** for 50 in all.

```text
Example: income pays the total rev of the products in operations, and 1 market share for each that earned (section 5, ruling 25)
  Given p1's operations has a Dating App, a Trading Bot and a DAO Nation
  And the turn passes to the left
  Then it is p1's turn
  And p1 has 12 capital
  And p1 has 2 market share
  And the phase is actions

Example: salaries are paid for every staff member on the board (section 5)
  Given p1's development has a Dating App
  And the Dating App in p1's development has the Architect and a Junior Software Dev on it
  And p1's operations has a To-Do List
  And p1's ops team has a QA Engineer
  And the turn passes to the left
  Then the phase is income
  And p1 has 8 capital
  When p1 pays salaries
  Then it is accepted
  And p1 has 5 capital
  And the phase is actions

Example: a player who can't pay everyone chooses whom to let go (ruling 25)
  Given p1 has 1 capital
  And p1's development has a Smart Lock
  And the Smart Lock in p1's development has the Engineer, the Diva and a Junior Hardware Eng on it
  And the turn passes to the left
  When p1 pays salaries
  Then it is rejected because "they have at least the total salary of the cards in their development team and their ops team in capital"
  When p1 lets go of the Junior Hardware Eng
  Then it is rejected because "its salary is more than 0"
  When p1 lets go of the Engineer
  Then it is accepted
  And the open job market has the Engineer
  When p1 pays salaries
  Then it is accepted
  And p1 has 0 capital
  And the Smart Lock in p1's development has the Diva and a Junior Hardware Eng on it

Example: with no salary to pay, the step is skipped (section 5)
  Given p1's development has a Dating App
  And the Dating App in p1's development has a Junior Software Dev on it
  And the turn passes to the left
  Then it is p1's turn
  And the phase is actions

Example: a team generates cubes in its colors, and they go onto the tracks (section 5)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has a Junior Software Dev and the Architect on it
  When p0 ends their actions
  Then the Dating App in p0's development has 4 blue cubes
  And the Dating App in p0's development has 0 new blue cubes
  And the Dating App in p0's development is not feature complete

Example: cubes beyond the cost are lost (section 6)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has 4 blue cubes
  And the Dating App in p0's development has a Junior Software Dev and the Architect on it
  When p0 ends their actions
  Then the Dating App in p0's development has 6 blue cubes
  And the Dating App in p0's development has 0 new blue cubes
  And the Dating App in p0's development is feature complete

Example: staff of the wrong color add nothing (section 6)
  Given the phase is actions
  And p0's development has a Dating App
  And the Dating App in p0's development has a Junior Hardware Eng and a Junior QA Tester on it
  When p0 ends their actions
  Then the Dating App in p0's development has 0 blue cubes
  And the Dating App in p0's development has 0 red cubes

Example: flex staff work in blue until modes arrive (section 11)
  Given the phase is actions
  And p0's development has a Smart Lock
  And the Smart Lock in p0's development has the Firmware Specialist on it
  When p0 ends their actions
  Then the Smart Lock in p0's development has 1 blue cube
  And the Smart Lock in p0's development has 0 red cubes

Example: an onboarding staff member generates nothing this turn and works the next (rulings 8 and 25)
  Given the phase is actions
  And p0's development has a Dating App and a To-Do List
  And the Dating App in p0's development has the Architect on it
  When p0 reassigns the Architect to the To-Do List
  And p0 ends their actions
  Then the To-Do List in p0's development has 0 blue cubes
  And the Dating App in p0's development has 0 blue cubes
  And it is p1's turn
  When p1 ends their actions
  Then it is p0's turn
  When p0 pays salaries
  And p0 ends their actions
  Then p0 has 5 capital
  And the To-Do List in p0's development has 3 blue cubes

Example: staff pivoted this turn stay onboarding when assigned again (ruling 8)
  Given the phase is actions
  And p0's development has a Dating App and a To-Do List
  And the Dating App in p0's development has the Architect on it
  When p0 pivots the Dating App
  And p0 assigns the Architect to the To-Do List
  Then the Architect in p0's development team is onboarding
  When p0 ends their actions
  Then the To-Do List in p0's development has 0 blue cubes

Example: launching needs both tracks full and moves the team to the ops team (ruling 7)
  Given the phase is actions
  And p0's development has a Smart Lock
  And the Smart Lock in p0's development has 1 blue cube
  And the Smart Lock in p0's development has 4 red cubes
  And the Smart Lock in p0's development has a Junior Hardware Eng and the Diva on it
  When p0 launches the Smart Lock
  Then it is rejected because "it is feature complete"
  Given the Smart Lock in p0's development has 5 red cubes
  When p0 launches the Smart Lock
  Then it is accepted
  And p0 has 2 actions
  And p0's operations has a Smart Lock
  And p0's ops team has a Junior Hardware Eng and the Diva
  And p0's development is empty

Example: an ops zone runs any number of products (ruling 24)
  Given the phase is actions
  And p0's operations has a To-Do List, a Mobile Wallet and a Trading Bot
  And p0's development has a Dating App
  And the Dating App in p0's development has 6 blue cubes
  When p0 launches the Dating App
  Then it is accepted
  And p0's operations has a To-Do List, a Mobile Wallet, a Trading Bot and a Dating App

Example: a pivot scraps the project, its cubes and all, and costs 1 action even when empty (ruling 7)
  Given the phase is actions
  And p0's development has a Dating App and a Smart Lock
  And the Dating App in p0's development has 3 blue cubes
  And the Dating App in p0's development has a Junior Software Dev and the Architect on it
  When p0 pivots the Dating App
  Then it is accepted
  And p0 has 2 actions
  And the open idea pool has a Dating App
  And the Dating App in the open idea pool has 0 blue cubes
  And p0's bench has a Junior Software Dev and the Architect
  And the Architect in p0's bench is onboarding
  When p0 pivots the Smart Lock
  Then it is accepted
  And p0 has 1 action

Example: sourcing looks at as many cards as were laid off and hires at the printed cost (section 13, ruling 25)
  Given p0's bench has a Junior Software Dev, a Junior QA Tester and a Junior Hardware Eng
  And the agency row has the Hacker, the Architect, the Veteran and the Diva
  And the talent deck has a Sales Rep, a QA Engineer and the Fixer
  When p0 lays off the Junior Software Dev and the Junior QA Tester
  Then it is accepted
  And p0 has 2 actions
  And the phase is sourcing
  And p0's scouting has a QA Engineer and the Fixer, in that order
  And the open job market has a Junior Software Dev and a Junior QA Tester, in that order
  When p0 hires the Fixer to p0's bench
  Then it is accepted
  And p0 has 0 capital
  And p0 has 2 actions
  And p0's bench has a Junior Hardware Eng and the Fixer
  When p0 passes on the rest
  Then the phase is actions
  And the agency row has a QA Engineer, the Hacker, the Architect and the Veteran, in that order
  And the open job market has a Junior Software Dev, a Junior QA Tester and the Diva, in that order

Example: passed cards enter the agency row at its left end and push out the old 4th, then the old 3rd (section 13)
  Given p0's bench has a Junior Software Dev and a Junior QA Tester
  And the agency row has the Hacker, the Architect, the Veteran and the Diva
  And the talent deck has a Sales Rep, a QA Engineer and the Fixer
  When p0 lays off the Junior Software Dev and the Junior QA Tester
  And p0 passes on the rest
  Then the agency row has a QA Engineer, the Fixer, the Hacker and the Architect, in that order
  And the open job market has a Junior Software Dev, a Junior QA Tester, the Diva and the Veteran, in that order

Example: a short talent deck shows what it has, and a sourced card may go straight onto a project (section 13, ruling 20)
  Given p0's development has a Smart Lock
  And p0's bench has a Junior Software Dev and a Junior QA Tester
  And the agency row has the Hacker, the Architect, the Veteran and the Diva
  And the talent deck has the Fixer
  When p0 lays off the Junior Software Dev and the Junior QA Tester
  Then p0's scouting has the Fixer
  And the talent deck is empty
  When p0 hires the Fixer to the Smart Lock
  Then it is accepted
  And p0 has 0 capital
  And the Smart Lock in p0's development has the Fixer on it
  And the phase is actions

Example: sourcing from an empty talent deck with the last action reveals nothing, and the turn goes on (this slice's call)
  Given p0 has 1 action
  And p0's bench has a Junior Software Dev
  And the talent deck is empty
  When p0 lays off the Junior Software Dev
  Then it is accepted
  And it is p1's turn
  And p1 has 3 actions
  And p0's scouting is empty
  And the open job market has a Junior Software Dev

Example: the round ends before the start player's next income (rulings 13 and 25)
  Given the crash pile has the Market Crash
  And p0's operations has a Trading Bot
  And it is p1's turn
  When p1 ends their actions
  Then the game is over
  And p0 has 7 capital

Example: the score adds each product's val in operations and 2 points for each market share (section 12, rulings 5 and 25)
  Given the crash pile has the Market Crash
  And p0 has 12 capital
  And p0 has 3 market share
  And p0's operations has a Dating App and a Smart Lock
  And p0's development has a Mobile Wallet
  And p0's backlog has a To-Do List
  And p1 has 5 capital
  And it is p1's turn
  When p1 ends their actions
  Then the game is over
  And p0 has 12 capital
  And p0 scores 14
  And p1 scores 1
  And p0 wins
```

How the numbers come from the rulebook (§20.B–C):
- **Income.**
  - Dating App $1 + Trading Bot $4 + DAO Nation $0 = $5, so 7 + 5 = 12, and 2 products earned.
  - To-Do List $1, so 8. Salaries: the Architect $2, a Junior $0, a QA Engineer $1, so 3.
  - The Engineer $2, the Diva $1 and a Junior $0 make 3, against 1 capital.
- **Output.**
  - Junior 1 + the Architect 3 = 4 Blue. The Dating App costs 6 Blue, and 4 + 4 is capped at 6.
  - The Firmware Specialist makes 2, capped at the Smart Lock's 1 Blue.
  - The To-Do List costs 4 Blue, so the Architect's 3 fit.
- **Launch.** The Smart Lock costs 1 Blue and 5 Red.
- **Prices.** The Fixer costs $7.
- **Source.** The talent deck's top is the last card a Given names.
  - Laying off 2 deals the QA Engineer and the Fixer into scouting, in that order (`deal` keeps deck order).
  - Passing puts the Fixer, then the QA Engineer, at the left end, one at a time. Each pushes the rightmost card out: the Diva, then the Veteran (R7).
- **Score.**
  - p0: ⌊12/5⌋ = 2, plus Val 5 + 3, plus 2 × 3, minus 2 for the Tier 1 card in the backlog, = 14. The Mobile Wallet in development scores 0.
  - p1: ⌊5/5⌋ = 1.
  - p0 kept 12 capital: no Income came after the last pass.
- **The last action.** The Source spends p0's last action. The deck is empty, so sourcing ends at once. Back in actions with 0 left, the turn goes through the Engine and Cleanup to p1.

- [ ] **Step 3: Update `startup-simulator.test.ts`.**
  - **Examples:** 50 results, all `pass`.
  - **The zones:** scouting is an owner row.
  - **Setup at every count:**
    - the turn starts in income and goes on to actions, every Board being empty;
    - each player's scouting is empty;
    - each has 0 market share.
  - **Compiles** with `diagnostics` `[]`: no warning, so income has no "When this phase starts:" line.
  - **Engine tests.** Each arranges a two-player state as 1a-1's engine tests do.
    - **Hidden scouting.** After p0 lays off a card with 3 in the talent deck, `deriveScene(…, 'p1')` shows `scouting-p0`'s card with `HIDDEN_FACE_KEY`, and `deriveScene(…, 'p0')` shows its face.
    - **Review Focus: Pivot without its staff.** `BROKEN` is the text without its `      Every card on it goes to their bench.` line. With the Architect on p0's Dating App, p0's pivot throws RuleError `The Architect in p0's development team is on the Dating App, which is now in the open idea pool. Move the cards on a card along with it.` The state equals the one before.
- [ ] **Step 4: Update the page tests and the README.**
  - **Page tests.** In `tableaux.test.ts` and `playtest-fitted.test.tsx`, each exact tableau line now reads with two changes:
    - `, 0 market share` after its actions (`pN 7 capital, 3 actions, 0 market share · …`);
    - ` · scouting 0` after `ops team N`, before any ` · start player`.

    `designer-page.test.tsx` reads `50 of 50 examples pass`.
  - **README, Startup Simulator.** It now plays slice 1b: the Board, Income with Market Share and Salaries, the Engine, Launch, Pivot, Layoff / Source and the score's Val and Market Share. Its 50 examples pin rulings 5, 7, 8, 10, 12, 13, 18, 20, 24 and 25.
  - **README, what it still leaves out** (spec "What 1b leaves out"): Ops bandwidth and Offline, Bugs and QA, modes, XP and Specialists, the Senior traits, Tier 2/3, Face-Down and the Audit, Dividends, Integration, Hype and Scandal.
  - **README, a new "Cards on cards, values and totals" paragraph:**
    - ", where every card is on a card" on a zone line;
    - "It goes to their development team, on the target card." and "Every card on it goes to …";
    - sections that work out a value per card ("Blue output:", "Feature complete:");
    - "its … go up by its …, up to its …" and "It loses its …";
    - "the total … of the cards in …", "… on it" and "… of the picked cards";
    - "For each card in …, …";
    - "Go to {phase}.";
    - "deal up to as many cards as they picked" and "move … to the left end of …";
    - the two score lines;
    - examples "… has … on it" and "… has no cards on it".
- [ ] **Step 5: Run** `bunx vitest run src/games src/pages/designer`. The 1b-1 long runs must still pass:
  - their seats never put staff on the Board, so Income always skips to actions;
  - their score check still holds, with 0 Val and 0 Market Share;
  - the money check is unchanged, since no product reaches operations.

  If one fails, find out why before Task 9 changes the runs. Then run `bun run test` and `bun run typecheck`.
- [ ] **Step 6: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx \
  src/pages/designer/tableaux.test.ts src/pages/designer/playtest-fitted.test.tsx README.md
git commit -m "feat(games): Startup Simulator builds Tier 1 products: Income and Salaries, the Engine, Launch, Pivot, Layoff and Source, and Val and Market Share in the score"
```

---

### Task 9: Long runs at 2 to 5 players with the Board's invariants

**Files:**
- Modify: `src/games/startup-simulator.test.ts`

**Interfaces:**
- Consumes 1a-1's and 1b-1's `playGame`, `playTurn`, `keepsTheRules`, `keepsTheBudget`, the tally and `throughView`.
- Also consumes `HOLDER_KEY`, `cardsOn`, `seatExtras`, `cardCandidates` and `ontoCandidates`, `counterOf`, `TURN_OF_KEY` and `zoneIdFor`.
- **The auto-player (`playTurn`)** keeps 1a's first action (an Ideation) and its Cleanup and research choices. It adds:
  - **Income.**
    - While the payroll exceeds their capital, or once when `t % 6 === 5`: let go of their highest-salary salaried card, from the development team on even `t` and the ops team on odd `t` (the other zone when one has none).
    - Then pay salaries.
  - **Actions, free moves first, at most once each per turn:**
    - greenlight the first Tier 1 backlog card while the development has fewer than 3;
    - when `t % 9 === 4`, dismiss the first ops team card, else the first development team card.
  - **Actions, then:**
    - launch the first project that is feature complete, if any;
    - otherwise one action by `(t + a) % 9`:
      - 0: recruit the Junior kind `(t + a) % 3`;
      - 1: hire the first agency card it can pay for, to its bench, its first project, or its ops team, by `t % 3`;
      - 2: hire the first open job market card;
      - 3: assign the bench cards whose skill makes a color the first unfinished project still lacks (any one bench card when none does) to that project;
      - 4: assign up to two bench cards to the ops team;
      - 5: reassign the first ops team card to the first project, else a development team card to another project;
      - 6: recall every ops team card;
      - 7: pivot the first project with no cubes and no staff, else, when `t % 13 === 0`, the first project;
      - 8: lay off the first one or two bench cards.
    - When that move is refused or has nothing to pick, it recruits, else ends its actions.
  - **Sourcing.** Hire the first card it can pay for, to its bench, its ops team or its first project, by `t % 3`. Otherwise pass on the rest.
  - **With `throughView`,** a set or a target is picked from the button's view (`cards`, `onto.targets`), each pick `allowed === true`. The view's candidates equal `cardCandidates` (and `ontoCandidates` for targets).
- **`keepsTheRules` gains, after every move:**
  - **Money conserved.** Each seat's capital changes by what it paid plus what it earned.
    - What `by` paid:
      - 2 for a recruit;
      - the card's cost, read before, for any agency hire;
      - 1 for an open job market hire;
      - the total cost of the picked cards for a sourcing hire;
      - the payroll, read before, for pay salaries;
      - 0 for any other move.
    - What the seat whose turn started in this move earned: the total rev of its operations in `after`.
  - **Market Share.** It changes only for the seat whose turn started, by the number of its operations cards with rev above 0.
  - **The Board:**
    - no development holds more than 3;
    - every card with `lang:on` is in a development team, and its holder is in the same seat's development;
    - every development team card has a holder;
    - no card's blue cubes exceed its blue cost, or its red cubes its red cost;
    - every card's new blue and new red cubes are 0.
  - **Scouting.** Every seat's scouting is empty, except the current seat's in the sourcing phase.
  - **Hidden zones.** Scouting joins the bench, backlog and research: hidden from every other viewer.
- **At each game's end,** each score is ⌊capital / 5⌋ + the Val of its operations + 2 × Market Share − 2 / 5 / 10 per Tier 1 / 2 / 3 backlog card.

- [ ] **Step 1: Write the tests.**
  - **Every count ends.** `it.each([2, 3, 4, 5])` with seeds 1–5, timeout 120000, as before, with the new checks and the new end-of-game score.
  - **Every button is used.** The tally expects every move type above 0:
    - 1a's 14;
    - Task 7's 10;
    - Task 8's 10: two let-gos, pay salaries, launch, pivot, lay off, three sourcing hires, pass on the rest.
    - If one stays at 0, print the tallies and change the auto-player, never the rules.
  - **The Board is played.** Over all runs, at least one Launch, one product earning revenue, one Pivot and one let-go happened, and the summed Market Share is above 0.
  - **Review Focus: undo and replay with the Board.**
    - At 3 players, seed 1, play until the log holds an assign, a launch or a pivot, and a reassign, keeping each state.
    - A fresh engine with `loadLog` equals the state.
    - Undoing every move gives back each kept state in turn, holders and onboarding included.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`. Fix failures in the auto-player, or, when an invariant shows a wrong rule, in the text or the phrases. Report a rule the text can't express rather than relaxing an invariant.
- [ ] **Step 3: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 4: Run the checks.** Each must print nothing.

```bash
# Startup Simulator's words in shared code, 1b's included
git diff "$BASE" -- src/engine src/pages src/utils ':!*.test.ts' ':!*.test.tsx' ':!src/pages/designer/samples.ts' | grep '^+' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share)\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# no existing test line removed outside the files this plan names
git diff "$BASE" -- '*.test.ts' '*.test.tsx' ':!src/games/startup-simulator.test.ts' ':!src/pages/designer/designer-page.test.tsx' \
  ':!src/pages/designer/tableaux.test.ts' ':!src/pages/designer/playtest-fitted.test.tsx' | grep -E '^-[^-]'
```

  Also read the `+` lines of `src/engine` and `src/pages` for "source" in the game sense, which the grep can't tell from a regex source.
- [ ] **Step 5: Run the four games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
- [ ] **Step 6: Commit**

```bash
git add src/games/startup-simulator.test.ts
git commit -m "feat(games): Startup Simulator's long runs build, launch, pivot, source and pay salaries at 2 to 5 players, keeping money, the Board and every turn"
```
