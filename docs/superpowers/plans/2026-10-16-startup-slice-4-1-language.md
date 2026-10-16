# Startup Simulator Slice 4-1 (Language) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The rules language gains every general piece slice 4 needs: values worked out for each player and compared, groups of cards filtered by a flag, a card rule about a flag, numbers on cards that go down, one total shared among cards, three new value lines, a moment when a card joins a card, zones where only some cards sit on cards (and the zone those cards sit in), steps each player takes before the score, and the example words for them. All of it is tested with fixtures in general words. Startup Simulator's text does not change.

**Architecture:**
- **This is plan 4-1 of three** (spec R10). Plan 4-2 writes the rules text and the long runs; plan 4-3 the page. Nothing here touches `src/games/startup-simulator.*` or `src/pages/**`.
- **R10's first item is two tasks here** ("values about a player" and "filters and the card rule"), so the plan has seven tasks:
  1. values about a player;
  2. flag tests on groups, cards in a zone that are so, and the card rule for flags;
  3. card numbers going down, a total shared among cards, and three value lines;
  4. a card that joins a card (R8);
  5. zones where some cards sit on cards, and the zone they sit in (R5, with 1b-2's M1);
  6. steps each player takes before the score (R1);
  7. example words, examples for each piece, the README, and the checks.
- **Where things live.**
  - Values about a player are a new `CompiledGame.playerValues`, worked out by `LangRuntime.playerValue`. They are read like card values: the same loop guard, and a missing number counts as nothing.
  - The view does not list them yet. Plan 4-3 adds them, for the gauges.
  - Card flags and counts stay in the card's own `data`. The holder stays under `lang:on`.
  - `lang:end-steps` is the only new `state.data` key.
- **Builder calls this plan makes** (the spec leaves them open):
  - **A value about a player** has one line shape:
    - `A player's X is the total Y of <cards>.` It starts from 0.
    - Conditions compare one value with another, or with a whole number: `is`, `is at least`, `is more than`.
    - A name that is already a counter or a player fact is refused.
  - **Flag tests.**
    - On groups: `the cards in … that are (not) X`, optionally followed by `and whose …`.
    - On one card: `they have (no) card in … that is (not) X [and whose …]`. This is what Domain Expertise's "not offline" needs (R2).
  - **Going down.**
    - A count never goes below 0, and at 0 its key is removed, as `It loses its …` does.
    - The shared total's cap is a value about the player. The cards share it in group order.
  - **New value lines.** A value with nothing so far stays nothing.
  - **Joins.**
    - A join moment may be written under a phase or under `In every phase:`.
    - "they" is the owner of the zone the card joined, "it" the joining card, and "the card it joins" the target card (`Subject.onto`).
    - Every line that puts a card on a target card announces one join per card, in placing order. A Given, and "staying on it", never announce one.
  - **Placement filters** use a card flag, not a kind of card. A later slice can then add a line to the flag (slice 5's Sales Rep) instead of a new phrase.
  - **1b-2's M1.** A marked zone may name the zone its cards sit on cards in (`…, in their shelf`), and the check then holds the card to that zone. An example's Given picks the marked zone by the holder's zone. R5 re-marks the ops team, so this is the cheap moment to close M1.
  - **The steps before the score.**
    - `lang:end-steps` holds the seat that took the first step while the steps run, and `true` once every seat has had one.
    - A seat that is out has no step.
    - The step phase must be one where players take turns.
    - `The <phase> passes to the left.` is refused anywhere else.
  - **Example words.** The only new phrase is `{player}'s {playervalue} is {int}`. The rest exist: `the phase is …`, `it is p2's turn`, `the game is over`, flags and counts on cards.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-4-modes-ops-bugs-design.md` is binding, and its "Builder-check rulings" R1–R10 win over its body. Plan 4-1 implements R1, R4's card rule, R5, R7's language, R8 and R10's 4-1 list. It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding as amended by slices 6–10, especially its anti-goals: Startup words in shared code, and hidden information leaking. The evidence is `builder-check-startup-4.md` (D1–D12) in the session scratchpad. 1b-2's archived final review (`final-review-startup-1b-2.md`, M1 and P-17) and pre-flight (P7) are there too.

## Global Constraints

- **Hard constraints (verbatim from plan 3-1, with slice 4's words added):**
  - Protected files must not change: `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, and anything under `src/pages/hearts-demo/**`.
  - The core is pure: no pixi/react/DOM imports in `src/engine/core/**`, no `Math.random` or `Date.now`.
  - State stays Json-only, with new keys under `lang:*`.
  - No Startup Simulator words in shared code. The banned words, in every form:
    - plan 1b-2's: capital, talent, agency, junior, backlog, growth, crash, vaporware, university, bench, ideation, startup, research, recruit, product, job market, idea pool, "seed" meaning a deck/market/card/product, greenlight, launch, pivot, salary, payroll, project, cube, ops, operations, onboarding, scouting, source/sourcing in the game sense, market share;
    - slice 3's: tag, lead, license, tier, stall, sector, expertise. "Lead" is banned in its plain sense too, so write "goes to";
    - **slice 4's: mode, bandwidth, bug, qa, online, offline, maint (and maintenance), supply, demand.**
  - Hearts, Color Match, Venom and Rent Day pass unchanged. Startup Simulator still compiles with `[]`, and its examples pass in the same number as at BASE. `bun run typecheck` is clean and the full `bun run test` passes.
- **Words in new shared code.**
  - These banned words come up in ordinary comments, so avoid them:
    - write "a mistake in the code", not "a bug";
    - write "gives", not "supplies";
    - avoid "on demand".
  - `CondGroup` has a field called `mode`. New lines reach it only through the existing helpers (`failedGroup`, `workedFlag`), so they never spell it out.
  - The banned words may appear in `src/games/startup-simulator.*`, the designer test files 3-1 lists, `samples.ts`, the README and docs.
  - Fixtures use general words:
    - plan 3-1's: guild, jobs, hands, workshop, stash, hall, scrap, crew, coins, moves, fee, mark, wants, mood, size, trim;
    - this plan's: resting, cracks, dents, force, load, mend, worth, shelf, yard, clinging, post, ship, transfer, final count.
- **Every phrase that reads a card carries its needs flags:** `needsCard`, `needsCards`, `needsOnto` or `needsMove`, as the card it reads requires. The view's face-down judgement and the compile-time hidden-pick check (`readsPressCard`, `reportHiddenCardReads`) rely on them. A group or a test inside a phrase's arguments is counted through `cardArgsOf`.
- **Every new phrase that changes a card's count or flag declares `writes`** (the index of that name among its arguments), so `writesWorked` refuses a value worked out from lines when the rules are read.
- **State and types.**
  - No new keys in a card's `data` from shared code. `lang:on` is reused.
  - `lang:end-steps` is the only new `state.data` key.
  - New fields of `CompiledGame`, `CompiledEnd`, `EveryPhase`, `ZoneSpec` and `Subject` are optional and Json. An optional field is left out, never set to `undefined`. This keeps `compile.test.ts`'s `everyPhase` `toEqual` and every existing game's compiled shape as they are.
  - A game without the new lines builds exactly the same `FlowDef` as before.
- **Existing tests.**
  - Tasks 1–7 change one existing test line: the pinned `VOCAB_TYPES` list in `refs.test.ts`, in Task 1 (`playervalue`) and Task 2 (`cardclause`).
  - They may add fixtures to `testing.ts` and append tests.
  - If any other existing test fails, stop and report it instead of changing it.
- **Left alone here.**
  - P-17: `startTurn` reads the phase before the round-start lines. Plan 4-2 must put no `Go to` in a round-start line.
  - The page and the view of player values: plan 4-3.
  - The rules text: plan 4-2.
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1:
    - record `BASE=$(git rev-parse HEAD)`;
    - run `bun run test` once for the passing count;
    - note Startup Simulator's example count.
- **Style and commits.**
  - 2-space indent, single quotes, chainable registrars, and comments that say why.
  - Commit prefix `feat(lang):`, or `docs:` for the README. Stage files by path, never `git add -A`.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.
  - A bullet marked "(guard: passes before and after)" is a regression guard.
  - `lineOf(text, line)` in a test is `text.split('\n').indexOf(line) + 1`. Define it locally where needed.

## Review Focus

- **The steps before the score when a seat is out, or when every seat's step needs nothing.**
  - Expected: an out seat has no step. When each seat's own rule passes its step at once, the move that finished the round also ends the game.
  - In both cases no turn and no round starts.
  - Tests: Task 6.
- **A press refused after a card joined a card.**
  - Expected: whatever the moment did is gone with the press, and the engine keeps the state from before it.
  - Test: Task 4, with a moment line that fails.
- **A shared total larger than the cards' counts, of 0, or over cards that have none.**
  - Expected: no card goes below 0, and the surplus is lost.
  - A cap of 0 changes nothing.
  - Cards at 0 are passed over without using any of the total.
  - Test: Task 3.
- **A flag nobody ever set, a flag set to no, and a flag worked out from lines, in a group's test or a card rule.**
  - Expected: the first two are "not so", and a worked flag is read through its lines.
  - A rule that would clear a worked flag is refused when the rules are read.
  - Tests: Task 2.
- **Undo and replay across a join and across the steps before the score.**
  - Expected: the log alone rebuilds the same state, the dents and `lang:end-steps` included.
  - Tests: Tasks 4 and 6.

## Assumed from earlier plans (check before Task 1)

The line numbers are at `90cd99f`. Plan 3-1 Task 7 is built, and nothing under `src/engine` has changed since `2f5e411`. Plan 3-1's Task 8 and its final review and fix wave run first, so re-read each item before Task 1. If one is missing or differs, stop and report it.

- **1b-2: cards on cards.**
  - `HOLDER_KEY = 'lang:on'` (`zones.ts:12`).
  - `holderIdOf`, `cardsOn` and `putOn` (`attach.ts:16`, `:22`, `:28`).
  - `onCardsZoneOf(game, seat)` picks the first `'every'` zone (`attach.ts:41`).
  - `attachmentProblem` (`attach.ts:56-80`), per P7:
    - rule 1 applies only to `onCards === 'every'` (`:66`);
    - rule 2 only to zones with no mark (`:69`);
    - rule 4 requires a public zone of the same seat (`:74`).
  - `ZoneSpec.onCards?: 'every'` (`types.ts:35-37`).
  - The zone lines `playerRowOnCards` and `sharedZoneOnCards` (`setup-phrases.ts:43`, `:49`, registered at `:57-70`).
  - In `attach-phrases.ts`:
    - `onCardsZone` refuses an unmarked zone (`:15`);
    - `itGoesOnTarget` and `pickedGoOnTarget` (`:25`, `:29`);
    - `cardHasOnItGiven` calls `onCardsZoneOf(env.game, seat)` (`:54-62`);
    - the registrar is at `:85-95`.
  - `runtime.checkAttachments` (`runtime.ts:446`). A press that throws keeps the engine's state, since `GameEngine.dispatch` throws before it commits.
- **1b-2: worked values.**
  - `WorkedValue`, `CompiledGame.worked` and `PhraseEnv.workedValue`/`workedFlag` (`types.ts:129`, `:147`, `:215-217`).
  - In `runtime.ts`:
    - `workedValue` and `workedFlag` (`:385`, `:403`);
    - the one loop guard `workOut` (`:429`);
    - `unlessNoSuchNumber` (`:59`).
  - In `support.ts`: `cardValueOf`, `cardHasFlag`, `mustBeKept`, `cardNumber` and the private `numberIfAny` (`:102`, `:110`, `:118`, `:128`, `:138`).
  - In `compile.ts`: `readCardSections`, `compileWorked`, `ABOUT_A_CARD`, `LINE_ABOUT` and `LINE_UNDER_OTHER` (`:161`, `:196`, `:73`, `:78`, `:83`).
  - `WORKED_KEPT`, `writesWorked` and `PhraseOpts.writes` (`compile-util.ts:43`, `:262`; `phrases.ts:230-234`).
- **1b-2: totals, For each and Go to.**
  - `cardsIn` and `totalOf` (`support.ts:198`, `:208`).
  - `registerTotalPhrases` (`total-phrases.ts:29`).
  - `matchEffectLine` (`compile-util.ts:406`): a `For each` takes one plain effect, and an `If` frame's effect is matched with `matchLine`.
  - `go to {phase}` with `entersPhase` (`flow-phrases.ts:273`).
- **1a / 1b-2: turns and the End.**
  - In `turns.ts`:
    - `START_PLAYER_KEY`, `TURN_OF_KEY`, `ROUND_KEY` and `ROUND_FRAME` (`:10`, `:13`, `:16`, `:22`);
    - `startPlayerOf`, `roundFinished`, `clearTurnMarkers` and `usesTurns` (`:33`, `:49`, `:79`, `:88`).
  - In `runtime.ts`:
    - `test`'s round frame (`:115`), `turnSubject` (`:226`) and `runInPhase` (`:236`);
    - `turnWaiting` (`:280-283`), `startTurn` (`:293`), `announce` (`:325-345`) and `runLine` (`:351`).
  - In `build.ts`:
    - `TURN_START_RULE` (`:31`) and `EndParams` (`:54`);
    - the trigger list `[...turnStart, ...ruleTriggers]` (`:92-95`) and `endWhen` (`:102-106`);
    - `flowRegistryFor` (`:119-149`).
  - `turnPassesLeft` and `registerTurnPhrases` (`turn-phrases.ts:18-24`, `:39-44`).
  - `isOut`, `playersIn`, `nextIn` (which throws when no other seat is in) and `interruptedTurn` (`board-state.ts:237`, `:247`, `:252`, `:313`).
  - `compileEnd`, `endCondition`, `warnUnreachable`, `compileEveryPhase` and `everyPhaseEffects` (`compile.ts:613`, `:606`, `:589`, `:556`, `:574`).
  - `EveryPhase` and `CompiledEnd` (`types.ts:120`, `:121`).
- **1a: moments.**
  - `Moment` and `MomentFn` (`types.ts:189`, `:228`).
  - `MOMENT_LINE` (`compile-phase.ts:24`), the private `compileMoment` (`:621`) and the moment branch of `compilePhase` (`:859-861`).
  - The board moment functions, which all test `moment.kind` (`board-phrases.ts:200-213`).
- **3-1 Tasks 1–2.**
  - `CardFilter` and `CardGroup.whose?: CardFilter[]` (`types.ts:19-30`).
  - In `refs.ts`: `CARDFILTER` (`:592`), `ON_IT`/`CARDS_IN`/`cardGroupSource`/`withTest`/`resolveCardGroup` (`:602-640`), `CARDGROUP` (`:646`), `declaredWord` (`:779`), `CARDFLAG` (`:797`), `PERZONE`/`SHAREDZONE` (`:321`, `:330`) and `VOCAB_TYPES` (`:930-934`).
  - `passes` and `cardsInZones` (`support.ts:171`, `:145`).
  - `cardArgsOf`, `withTheirTests`, `readsPressCard` and `unmetNeed` (`compile-util.ts:196`, `:192`, `:222`, `:239`).
  - `registerComparePhrases` (`compare-phrases.ts:56`).
  - `card-subject-phrases.ts` (`:48`): `it is not {cardflag}`, `its {attribute} is {int}` and `a card's {attribute} goes down by its {attribute}`.
  - `card-number-phrases.ts`: `changeable` (private, `:14`) and the registrar (`:57`).
  - `card-value-phrases.ts`: `flaggedHas` (`:19`) and the registrar (`:25`).
  - `fact-phrases.ts`: `itCard`, `cardsWithNumber`, `noCardIs`, `everyCardIsFlagged`, `changeNumber`, `itGains` and the registrar (`:100`, `:120`, `:303`, `:310`, `:322`, `:328`, `:451-523`).
- **Library and fixtures.**
  - `REGISTRARS` (`library/index.ts:28-54`).
  - `emptyVocab` and `vocabFrom` (`phrases.ts:134`, `:148-204`). `PhraseLibrary.value`, `which` and `moment` (`:363`, `:368`, `:371`). The `moment` registrar takes no options. Two patterns matching one line is an `ambiguous` error (`:412`).
  - `testing.ts`:
    - the fixtures `TURN_GAME`, `ROUNDS_GAME`, `CREW_GAME`, `WORKED_GAME` and `GUILD_GAME` (`:345`, `:368`, `:385`, `:418`, `:448`);
    - the helpers `fixtureEnv`, `vocabFor` and `runPhrase` (`:517-538`, `:562-579`, `:583`).
  - `runExample` (`examples.ts:52-108`): the engine is built at the first When or Then, and the Givens run through an arranging runtime with `checkAttachments`.
  - `registerExamplePhrases` (`example-phrases.ts:318-346`).
- **1b-3: C7.**
  - `fit-layout.ts:122`: `isAttached` holds only for `onCards === 'every'`, so a `'some'` zone stays a Board row.
  - `board-text.ts:18`: `isBoardZone` is `onCards !== 'every'`.

---

### Task 1: Values about a player

**Files:**
- Modify: `src/engine/core/lang/types.ts`: `PlayerValue`, `CompiledGame.playerValues`, `Vocab.playerValues` and `PhraseEnv.playerValue`.
- Modify: `src/engine/core/lang/phrases.ts`: `vocabFrom` and `emptyVocab`.
- Modify: `src/engine/core/lang/refs.ts`: `PLAYERVALUE`, in `VOCAB_TYPES` after `CARDFILTER`.
- Modify: `src/engine/core/lang/compile.ts`: `readPlayerSections` and `compilePlayerValues`, wired into `compile`.
- Modify: `src/engine/core/lang/runtime.ts`: `playerValue`, and `env`.
- Modify: `src/engine/core/lang/library/support.ts`: `playerValueOf`.
- Create: `src/engine/core/lang/library/player-value-phrases.ts`. Add `registerPlayerValuePhrases` to `library/index.ts` right after `registerComparePhrases`.
- Modify: `src/engine/core/lang/testing.ts`: `FORCE_GAME`; `fixtureEnv` takes `playerValue`; `vocabFor` passes `playerValues`.
- Test: `src/engine/core/lang/library/player-value-phrases.test.ts` (new), `src/engine/core/lang/compile.test.ts`, `src/engine/core/lang/refs.test.ts` (the pinned list).

**Interfaces:**
- Consumes: `totalOf`, `cardsIn`, `workOut`, `unlessNoSuchNumber`, `declaredWord`, `LINE_UNDER_OTHER`, `matchLine`.
- Produces (for Tasks 2, 3, 7 and plan 4-2):

```ts
// types.ts
/** A value a section works out for each player: from 0, each line has its say in the order written. `line` is the section's own. */
export type PlayerValue = { refs: PhraseRef[]; line: number };
// CompiledGame:  playerValues?: { [name: string]: PlayerValue };   left out when the game has none
// Vocab:         playerValues: string[];
// PhraseEnv:     playerValue?: (state: GameState, seat: PlayerId, name: string) => number;
// phrases.ts:    vocabFrom({ …, playerValues?: string[] })
// refs.ts:       const PLAYERVALUE = declaredWord('playervalue', '[player value]', 'player value', (v) => v.playerValues, false);
// runtime.ts:    readonly playerValue = (state: GameState, seat: PlayerId, name: string): number
// support.ts:    export function playerValueOf(env: PhraseEnv, seat: PlayerId, name: string): number   // through env.playerValue
// compile.ts:    function readPlayerSections(others: OutlineNode[], board: BoardSpec | null, facts: FactSpec[], diagnostics: Diagnostic[]):
//                  { sections: Section[]; rest: OutlineNode[] }
//                function compilePlayerValues(sections: Section[], ctx: LineCtx): { [name: string]: PlayerValue }
```

- **`compile`.**
  - `readPlayerSections` runs on the top-level `others` before `readCardSections`. A header whose first line starts `A player's ` (any apostrophe) is a value about players, even when it names a column of a card table. Its name is the header, canonical.
  - A name that is a counter or a player fact is refused on the header's line with `` `“${name}” is already a number each player has; a value worked out for players needs a name of its own.` `` That section is left out.
  - Every vocabulary from the actions stage on carries the names.
  - `compilePlayerValues` reads each line as kind `value` with `{ ...ctx, player: true }`:
    - a line that does not start `A player's ` gets `Write each line of a value about players as “A player's … is …”.`;
    - a line about another player value (read after `player's ` up to ` is `) gets `LINE_UNDER_OTHER`.
- **`runtime.playerValue`.**
  - It starts from 0. Each ref runs as a `ValueFn` about `{ player: seat, space: null, card: null }`.
  - It goes through `unlessNoSuchNumber` and `workOut`, the latter with a key of its own (`['player', seat, name]`). A line that comes to nothing leaves the value as it was.
  - An unknown name is a mistake in the code (`Error`).
- **`player-value-phrases.ts`**, every phrase `needsPlayer`:
  - value `a player's {playervalue} is the total {attribute} of {cardgroup}`;
  - conditions:
    - `their {playervalue} is at least their {playervalue}`;
    - `their {playervalue} is more than their {playervalue}`;
    - `their {playervalue} is {int}`;
    - `their {playervalue} is at least {int}`;
    - `their {playervalue} is more than {int}`.
- **`testing.ts`:**

```ts
/** WORKED_GAME with two values about each player: the red work of the hands in their crew, and the red need of the jobs in their workshop. */
export const FORCE_GAME = [
  WORKED_GAME, '',
  'Red force:', "  A player's red force is the total red work of the cards in their crew.", '',
  'Red load:', "  A player's red load is the total red need of the cards in their workshop.",
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**

  In the new `player-value-phrases.test.ts`:
  - **The engine.** A 3-player `FORCE_GAME` engine. Read through `runtime.playerValue`, and conditions through `runPhrase` with `fixtureEnv({ game, subject: { player, space: null, card: null }, playerValue, workedValue, workedFlag })` taken from the runtime.
  - **The arrangement**, with `relocate` and `putOn`:
    - p0's workshop holds a Vase with a Potter and a Tinker on it, in `crew-p0`;
    - p1's workshop holds a Statue with a Smith on it.
  - **Values.**
    - p0's `red force` is 2 and `red load` 2.
    - p1's are 0 and 1, and p2's 0 and 0.
    - With `tired: true` on p0's Potter, p0's `red force` is 1: the worked `red work` is read.
  - **Conditions.**
    - `their red force is at least their red load` holds about p0, not about p1.
    - `their red load is more than their red force` does not hold about p0, and holds about p1.
    - About p0: `their red force is 2` holds, `their red force is at least 3` does not, and `their red force is more than 1` holds.
  - **A card without the number.** `FORCE_GAME` with the force line changed to `… the total worth of the cards in their crew.` gives p0 0: hands have no worth.
  - **In a button.**
    - `FORCE_GAME` with `    Only if their red force is at least their red load.` under `  A player may stop.` compiles with `[]`.
    - With a Statue added to p0's workshop, `{ type: 'stop', by: 'p0' }` is refused with `their red force is at least their red load`.
    - With the Vase alone it is accepted.

  In `compile.test.ts`, `describe('values about a player')`:
  - **Compiled.**
    - `FORCE_GAME` compiles with `[]`.
    - `game.playerValues` has `red force` and `red load`, each with one ref of phrase `a player's {playervalue} is the total {attribute} of {cardgroup}`, and `line` its header's.
    - `vocabFor(game).playerValues` is `['red force', 'red load']`.
    - `WORKED_GAME`'s game has no `playerValues` key.
  - **Errors.**
    - Under `Red load:`, `  A player's red force is the total red work of the cards in their crew.` gives `This line is about “red force”, but it is under Red load:.` on its line.
    - A section `Coins:` with `  A player's coins is the total pay of the cards in their workshop.` gives `“coins” is already a number each player has; a value worked out for players needs a name of its own.` on `Coins:`'s line, and `coins` is in no `playerValues`.
    - `  Only if they have at least 1 coin.` under `Red force:` gives `Write each line of a value about players as “A player's … is …”.`
    - `  A player's red force is the total red work of the cards on it.` gives `“A player's red force is the total red work of the cards on it” only makes sense in a rule about a card, such as “When a card …”.`
    - `    Only if their red forse is at least their red load.` under `A player may stop.` gives `There is no player value called “red forse”.`
  - **A column's name.** A section `Worth:` with `  A player's worth is the total worth of the cards in their workshop.` is a value about players: `playerValues` has `worth`, and `game.worked` has no `worth`.

  In `refs.test.ts`, **changed line**: the pinned `VOCAB_TYPES` list gains `['playervalue', '[player value]']` after `['cardfilter', '[test]']`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/player-value-phrases.test.ts src/engine/core/lang/compile.test.ts src/engine/core/lang/refs.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/phrases.ts src/engine/core/lang/refs.ts src/engine/core/lang/compile.ts \
  src/engine/core/lang/runtime.ts src/engine/core/lang/library/support.ts src/engine/core/lang/library/player-value-phrases.ts \
  src/engine/core/lang/library/index.ts src/engine/core/lang/testing.ts src/engine/core/lang/library/player-value-phrases.test.ts \
  src/engine/core/lang/compile.test.ts src/engine/core/lang/refs.test.ts
git commit -m "feat(lang): values worked out for each player from the cards in their zones, compared with each other or a number"
```

---

### Task 2: Flag tests on groups, cards in a zone that are so, and the card rule for flags

**Files:**
- Modify: `src/engine/core/lang/types.ts`: a flag test in `CardFilter`; the `CardGroup` doc.
- Modify: `src/engine/core/lang/refs.ts`: `CARDGROUP`'s flag forms; `CARDCLAUSE`, in `VOCAB_TYPES` after `PLAYERVALUE`.
- Modify: `src/engine/core/lang/library/support.ts` (`passes`) and `src/engine/core/lang/compile-util.ts` (`cardArgsOf` reads `{cardclause}`).
- Modify: `src/engine/core/lang/library/compare-phrases.ts` (two conditions) and `src/engine/core/lang/library/fact-phrases.ts` (two conditions, one effect, three card rules).
- Modify: `src/engine/core/lang/testing.ts`: `RESTING_GAME`.
- Test: `src/engine/core/lang/refs.test.ts`, `src/engine/core/lang/compile-util.test.ts`, `src/engine/core/lang/library/compare-phrases.test.ts`, `src/engine/core/lang/library/fact-phrases.test.ts`.

**Interfaces:**
- Consumes: Task 1's `FORCE_GAME` and `playerValue`; `cardHasFlag`, `cardsInZones`, `changeCard`, `mustBeKept`.
- Produces (for Task 3 and plan 4-2):

```ts
// types.ts
export type CardFilter =
  | { attribute: string; above: number }
  | { attribute: string; is: Json }
  | { attribute: string; sameAs: { of: 'the card' | 'it'; attribute: string } }
  | { flag: string; wanted: boolean };   // the card is so (wanted) or is not, read as cardHasFlag reads it
```

- **`CARDGROUP`** reads each of its three groups in these forms:
  - `<group>`;
  - `<group> whose {cardfilter}`, as built;
  - `<group> that are {cardflag}` and `<group> that are not {cardflag}`;
  - either of those followed by ` and whose {cardfilter}`.

  The flag test comes first in `whose`. A misnamed flag is explained as `{cardflag}` explains it.
- **`CARDCLAUSE`**, type `'cardclause'`, label `'[that is …]'`. It reads `that is {cardflag}` or `that is not {cardflag}`, each optionally followed by ` and whose {cardfilter}`. Its value is a `CardFilter[]`, with the flag first.
- **`passes`.** A flag test holds when `cardHasFlag(env, card, flag) === wanted`.
- **`cardArgsOf`.** The `{cardclause}` arguments count as tests, flattened, so their `sameAs` needs a move or a card and is counted by `readsPressCard`.
- **`compare-phrases.ts`**, both `needsPlayer`:
  - condition `they have a card in {zones} {cardclause}`;
  - condition `they have no card in {zones} {cardclause}`.
- **`fact-phrases.ts`:**
  - conditions `some card in {zones} is {cardflag}` and `no card in {zones} is {cardflag}`;
  - effect `every card in {zone} is not {cardflag}` (`writes: 1`). It removes the key from each card that has it, as `no card is …` does;
  - card rules (`which`) `a card in a {perzone} is {cardflag}`, `a card in an {perzone} is {cardflag}` and `a card in {sharedzone} is {cardflag}`. They give the ids seat by seat and slot by slot, as `cardsWithNumber` does.
- **`testing.ts`:**

```ts
/** FORCE_GAME where a job can be resting, and a player's red load counts only the jobs in their workshop that are not resting. */
export const RESTING_GAME = FORCE_GAME
  .replace('  Cards can be tired.', '  Cards can be tired.\n  Cards can be resting.')
  .replace('red need of the cards in their workshop.', 'red need of the cards in their workshop that are not resting.');
```

- [ ] **Step 1: Write the failing tests.**

  In `refs.test.ts`, with `vocabFor(compileGame(RESTING_GAME).game)`:
  - **Groups.**
    - `the cards in their workshop that are not resting` gives `{ kind: 'in', zones: [{ of: { who: 'actor' }, zone: 'workshop' }], whose: [{ flag: 'resting', wanted: false }] }`.
    - `the cards on it that are tired` gives `{ kind: 'on it', whose: [{ flag: 'tired', wanted: true }] }`.
    - `the picked cards that are not tired and whose skill is more than 1` gives `whose: [{ flag: 'tired', wanted: false }, { attribute: 'skill', above: 1 }]`.
    - `the cards on it whose skill is more than 1` keeps its one-test `whose` (guard: passes before and after).
    - `the cards in their workshop that are restng` gives `There is no card fact called “restng”.`
  - **`cardclause`.**
    - `that is not resting and whose pay is the card's pay` gives `[{ flag: 'resting', wanted: false }, { attribute: 'pay', sameAs: { of: 'the card', attribute: 'pay' } }]`.
    - `that is tired` gives `[{ flag: 'tired', wanted: true }]`.
  - **Changed line:** the pinned `VOCAB_TYPES` list gains `['cardclause', '[that is …]']` after `['playervalue', '[player value]']`.

  In `fact-phrases.test.ts`, `describe('cards in a zone that are so')`, a 3-player `RESTING_GAME` runtime with a Vase then a Statue in p0's workshop:
  - **The load.**
    - p0's `red load` is 3. With `resting: true` on the Statue it is 2.
    - **Review Focus:** with `resting: false` on the Statue (set to no) it is 3, as with no key.
  - **Some and no.**
    - `the total red need of the cards in their workshop that are resting is 1` holds with the Statue resting.
    - `some card in their workshop is resting` and `no card in their workshop is resting` hold each way about p0.
  - **Clearing.**
    - `every card in their workshop is not resting` leaves neither job with a `resting` key.
    - A resting job in p1's workshop keeps its key.
  - **Review Focus: a worked flag.**
    - In `WORKED_GAME`, with `red done: 2` on p0's Vase, `the total pay of the cards in their workshop that are done is 1`: Done's lines are read.
    - `      Every card in their workshop is not done.` under a button's `Then:` gives `“done” is worked out from its lines, so no rule can change it.` on its line.
  - **The card rule.** `RESTING_GAME` with `In every phase:\n  When a card in an idle is tired:\n    It is not tired.\n  When a card in the hall is tired:\n    It is not tired.`:
    - after p0 finishes the Vase with a Potter and a Smith on it, `idle-p0`'s cards have no `tired` key;
    - a tired Potter in `crew-p0` stays tired;
    - an engine built (turn p0, phase `working`) with a tired Potter in the hall has it not tired;
    - the `which` of `a card in an idle is tired` gives p0's tired idle cards before p1's, slot by slot.

  In `compare-phrases.test.ts`, `RESTING_GAME`. Conditions are judged about a press moving a Vase (pay 1) from p0's stash, with a Vase in p0's workshop:
  - `they have a card in their workshop that is not resting and whose pay is the card's pay` holds;
  - with the workshop's Vase resting, it does not;
  - `they have no card in …` is its negation in both.

  In `compile-util.test.ts`:
  - `    Only if they have a card in their workshop that is not resting and whose pay is the card's pay.` under `A player may stop.` gives `“they have a card in their workshop that is not resting and whose pay is the card's pay” only makes sense in a rule about a player's move.`
  - `readsPressCard` is true for that ref's group, and false for `… that is not resting and whose pay is 1`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/refs.test.ts src/engine/core/lang/compile-util.test.ts src/engine/core/lang/library/compare-phrases.test.ts src/engine/core/lang/library/fact-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`.
  - A Startup or board-game line now read two ways is an `ambiguous` diagnostic. Stop and report it.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/refs.ts src/engine/core/lang/library/support.ts src/engine/core/lang/compile-util.ts \
  src/engine/core/lang/library/compare-phrases.ts src/engine/core/lang/library/fact-phrases.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/refs.test.ts src/engine/core/lang/compile-util.test.ts src/engine/core/lang/library/compare-phrases.test.ts \
  src/engine/core/lang/library/fact-phrases.test.ts
git commit -m "feat(lang): groups of cards that are or are not so, a card in a zone that is so, and a rule for each card in a zone that is so"
```

---

### Task 3: Card numbers going down, a total shared among cards, and three value lines

**Files:**
- Modify: `src/engine/core/lang/library/card-number-phrases.ts`: going down; export `changeable`.
- Modify: `src/engine/core/lang/library/fact-phrases.ts`: `it loses {int} {attribute}`.
- Modify: `src/engine/core/lang/library/card-subject-phrases.ts`: `its {attribute} are {int}` and `… is at least {int}`.
- Modify: `src/engine/core/lang/library/card-value-phrases.ts`: a flagged card's value is its other number.
- Modify: `src/engine/core/lang/library/total-phrases.ts`: goes up by a total; the shared total.
- Modify: `src/engine/core/lang/compile.ts`: `LINE_ABOUT` also ends at ` goes up by `.
- Modify: `src/engine/core/lang/testing.ts`: `MEND_GAME`.
- Test: `src/engine/core/lang/library/card-number-phrases.test.ts`, `src/engine/core/lang/library/total-phrases.test.ts`, `src/engine/core/lang/library/card-value-phrases.test.ts`, `src/engine/core/lang/compile.test.ts`.

**Interfaces:**
- Consumes: Task 1's `playerValueOf`, the `{playervalue}` type and `FORCE_GAME`; `cardsIn`, `totalOf`, `cardNumber`, `changeCard`, `mustBeKept`, `isCardCount`.
- Produces (for plan 4-2):
  - `export function changeable(env: PhraseEnv, name: string): string` (`card-number-phrases.ts`), unchanged in behaviour.
  - **Effects:**
    - `its {attribute} go down by its {attribute}` and `its {attribute} goes down by its {attribute}` (`needsCard`, `writes: 0`). The count less the other number, never below 0. At 0 the key is removed.
    - `it loses {int} {attribute}` (`needsCard`, `writes: 1`). The same floor and key, through `changeable`.
    - `{cardgroup} lose {attribute} between them, up to their {playervalue}, first card first` (`needsPlayer`, `writes: 1`):
      - the total is the player's value;
      - each card of the group, in its order, loses what it has of the count up to what is left of the total, and the rest goes on;
      - a card at 0 uses none of it;
      - the name must pass `changeable`.
  - **Condition** `its {attribute} are {int}` (`needsCard`), the plural of `its … is …`.
  - **Values** (`needsCard`):
    - `a card's {attribute} is at least {int}` gives `max(so far, n)`;
    - `a card's {attribute} goes up by the total {attribute} of {cardgroup}` gives so far plus the total;
    - `a {cardflag} card's {attribute} is its {attribute}` and `an {cardflag} card's {attribute} is its {attribute}`: a card that is so has its other number (`cardNumber`), and any other card keeps the value so far.

    Nothing so far (null) stays null for the first two.
- **`testing.ts`:**

```ts
/**
 * FORCE_GAME where jobs gather cracks, a player's mend is the skill of the hands in their idle, and a job's worth goes up with the skill
 * of the hands on it and down with its cracks, never below 0. A tired hand's rest work is its skill.
 */
export const MEND_GAME = [
  FORCE_GAME.replace('new red and new gold.', 'new red, new gold and cracks.'), '',
  'Mend:', "  A player's mend is the total skill of the cards in their idle.", '',
  'Worth:', "  A card's worth goes up by the total skill of the cards on it.", "  A card's worth goes down by its cracks.",
  "  A card's worth is at least 0.", '',
  'Rest work:', "  A tired card's rest work is its skill.",
].join('\n');
```

- [ ] **Step 1: Write the failing tests.** All use a 3-player `MEND_GAME` runtime, with phrases run through `runPhrase` and the runtime's `workedValue`, `workedFlag` and `playerValue`.

  In `card-number-phrases.test.ts`:
  - **Going down.**
    - A Vase (pay 1) with `cracks: 3`: `its cracks go down by its pay` gives 2.
    - A Statue (pay 2) with `cracks: 1` has no `cracks` key after `its cracks goes down by its pay`.
  - **Losing a number.**
    - `it loses 1 crack` takes 2 to 1.
    - It takes 1 to no key, and leaves a card at 0 without one.
  - **Refused.**
    - `it loses 1 pay` throws `Only a number the game keeps on cards can change, like “Cards can have charges.”; pay isn't one.`
    - `      Its worth goes down by its pay.` under a button's `Then:` gives `“worth” is worked out from its lines, so no rule can change it.`
  - **Plural.** `its cracks are 0` holds for a fresh Vase. With `cracks: 2`, `its cracks are 2` holds.

  In `card-value-phrases.test.ts`, worth and rest work:
  - **Worth.**
    - A Vase (worth 3) with a Potter (skill 1) and a Smith (skill 2) on it is worth 6.
    - With `cracks: 2` it is worth 4, and with `cracks: 9` it is worth 0.
    - A Potter's `worth` is null.
  - **Rest work.**
    - A tired Smith's `rest work` is 2, an untired Smith's 0, and a tired Potter's 1.
    - A tired Vase's is 0: it has no skill, so the line is not about it.

  In `total-phrases.test.ts`, `describe('a total shared among cards')`. p0's workshop holds a Vase (`cracks: 2`) then a Statue (`cracks: 3`), and p0's idle a Potter and a Smith, so `mend` is 3. `The cards in their workshop lose cracks between them, up to their mend, first card first.` runs about p0:
  - **First card first.** The Vase has no `cracks` key and the Statue has 2.
  - **Review Focus: more than enough.** With a second Smith in the idle (mend 5), both jobs have none.
  - **Review Focus: none.** With the idle empty (mend 0), nothing changes.
  - **Review Focus: a job at 0.** A Vase at 0 then a Statue at 3, with mend 2: the Vase has no key and the Statue has 1.
  - **Other players.** p1's jobs with cracks are untouched.
  - **Refused.**
    - `… lose red work between them …` in a `Then:` gives `“red work” is worked out from its lines, so no rule can change it.`
    - `… lose pay between them …` throws the `changeable` message.

  In `compile.test.ts`: under `Worth:`, `  A card's red work goes up by the total skill of the cards on it.` gives `This line is about “red work”, but it is under Worth:.` on its line.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/card-number-phrases.test.ts src/engine/core/lang/library/card-value-phrases.test.ts src/engine/core/lang/library/total-phrases.test.ts src/engine/core/lang/compile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/card-number-phrases.ts src/engine/core/lang/library/fact-phrases.ts \
  src/engine/core/lang/library/card-subject-phrases.ts src/engine/core/lang/library/card-value-phrases.ts \
  src/engine/core/lang/library/total-phrases.ts src/engine/core/lang/compile.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/library/card-number-phrases.test.ts src/engine/core/lang/library/card-value-phrases.test.ts \
  src/engine/core/lang/library/total-phrases.test.ts src/engine/core/lang/compile.test.ts
git commit -m "feat(lang): numbers on a card that go down to 0, a player's total shared among cards first card first, and values that go up by a total, keep a floor or follow a flag"
```

---

### Task 4: A card that joins a card

**Files:**
- Modify: `src/engine/core/lang/types.ts`:
  - `Moment` becomes a union;
  - `EveryPhase.moments?`;
  - the `Subject.onto` doc.
- Modify: `src/engine/core/lang/compile-phase.ts`: `JOIN_MOMENT`; `MOMENT_LINE` takes it; `compileMoment`, exported, reads a join with a card context.
- Modify: `src/engine/core/lang/compile.ts`: `compileEveryPhase` reads join moments into `moments`; `everyPhaseEffects` includes their effects.
- Modify: `src/engine/core/lang/runtime.ts`: `announce`.
- Modify: `src/engine/core/lang/library/attach-phrases.ts`:
  - the moment;
  - `the card it joins gains …`;
  - the two placing effects announce.
- Modify: `src/engine/core/lang/library/board-phrases.ts`. In `landsOnClassOwnedByOther`, narrow `moment.kind` before reading `moment.space`. This is a type-only change.
- Modify: `src/engine/core/lang/testing.ts`: `JOIN_GAME`.
- Test: `src/engine/core/lang/library/attach-phrases.test.ts` (append `describe('a card that joins a card')`), `src/engine/core/lang/compile.test.ts`.

**Interfaces:**
- Consumes: `putOn`, `zoneInfo`, `matchesCard`, Task 3's `changeable` with `changeCard`, `theTargetCard`; the runtime's moment depth cap.
- Produces (for Task 5 and plan 4-2):

```ts
// types.ts
export type Moment =
  | { kind: 'pass' | 'land'; seat: PlayerId; space: number }
  | { kind: 'join'; seat: PlayerId; card: string; holder: string };   // `card` joined `holder`; `seat` owns the zone it joined
// EveryPhase:  moments?: CompiledMoment[];   only join moments; left out when there are none
// compile-phase.ts
export const JOIN_MOMENT = /^when (an? .+ joins a card in .+):$/i;
export function compileMoment(node: OutlineNode, clean: string, whenText: string, ctx: LineCtx): CompiledMoment;
// a join's lines are read with { ...ctx, player: true, card: true, onto: true }; a pass or land keeps { ...ctx, player: true, space: true }
```

- **`announce`.**
  - It runs `everyPhase.moments`, then the current phase's moments, in the order written.
  - A join is about `{ player: seat, space: null, card, onto: holder }`, and a pass or land about what it was before.
- **`attach-phrases.ts`:**
  - moments `{cardclass} joins a card in a {perzone}` and `{cardclass} joins a card in an {perzone}`. Each holds for a join whose card matches and whose holder is in that per-player zone of any seat;
  - effect `the card it joins gains {int} {attribute}` (`needsOnto`, `writes: 1`). It adds to the target card's count through Task 3's `changeable`, so only a count the game keeps on cards. `it gains …` would quietly change a column such as pay;
  - `It goes to …, on the target card.` and `The picked cards go to …, on the target card.` announce one join per placed card, in order, after the placing and only when `env.announce` exists. Givens call `putOn` directly and announce nothing.
- **`testing.ts`:**

```ts
/** CREW_GAME where a Smith that joins a job in a workshop leaves a dent in it, whatever the phase. */
export const JOIN_GAME = CREW_GAME
  .replace('  Cards can be tired.', '  Cards can be tired.\n  Cards can have dents.')
  .replace('Phase: working', ['In every phase:', '  When a Smith card joins a card in a workshop:', '    The card it joins gains 1 dent.', '',
    'Phase: working'].join('\n'));
```

- [ ] **Step 1: Write the failing tests.**

  In `compile.test.ts`:
  - `JOIN_GAME` compiles with `[]`.
  - Its `everyPhase.moments` holds one moment with `when.phrase` `{cardclass} joins a card in a {perzone}`, and its effect's phrase `the card it joins gains {int} {attribute}`.
  - `CREW_GAME`'s `everyPhase` has no `moments` key (guard: passes before and after).

  In `attach-phrases.test.ts`, a 2-player `JOIN_GAME` engine, p0 to act, with a Vase and a Statue in p0's workshop:
  - **Hiring.**
    - Hiring a Smith and a Potter onto the Vase gives the Vase 1 dent and the Statue none.
    - Hiring two Smiths onto it gives 2.
  - **Shifting.** Shifting the Smith from the Vase to the Statue gives the Statue 1 dent, and the Vase keeps its own.
  - **No join.**
    - An example `Given the Vase in p0's workshop has a Smith on it` (through `runExamples`, with a Then checking 0 dents) gives no dent.
    - Finishing the Vase gives no dent anywhere.
  - **Who and when.**
    - With the moment's line `    They get 1 coin.` instead, hiring the Smith gives p0 10 coins.
    - With `    Only if it is not tired.` under the moment, hiring a tired Smith gives no dent.
  - **Where the rule is written.**
    - The same rule under `Phase: working` instead of `In every phase:` gives the same dent.
    - Under a second phase the game never reaches, it gives none.
    - `When a Smith card joins a card in an idle:` gives none for a hire onto the workshop.
  - **Review Focus: a press refused after a join.**
    - With `    The card it joins gains 1 pay.` as the moment's line, the hire throws a RuleError `Only a number the game keeps on cards can change, like “Cards can have charges.”; pay isn't one.` on that line's number.
    - The engine's state is as before the press: the Smith is in the hall.
  - **Review Focus: undo and replay.**
    - After a hire that dents, `engine.undo()` gives the state before it.
    - A fresh engine given `loadLog(engine.getLog())` equals the engine's state.
  - **Errors.**
    - `When a Smth card joins a card in a workshop:` gives `There is no card value called “Smth”.`
    - `      The card it joins gains 1 dent.` under `A player may stop.`'s `Then:` gives `“The card it joins gains 1 dent” only makes sense in a button that picks a card and the card it goes to, like “A player may stack a card from their hand to a card in the row.”`
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/attach-phrases.test.ts src/engine/core/lang/compile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. Rent Day's pass and land rules must behave as before.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/compile-phase.ts src/engine/core/lang/compile.ts src/engine/core/lang/runtime.ts \
  src/engine/core/lang/library/attach-phrases.ts src/engine/core/lang/library/board-phrases.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/library/attach-phrases.test.ts src/engine/core/lang/compile.test.ts
git commit -m "feat(lang): a rule for when a card joins a card in a zone, run once for each card a line puts on a card, never for a Given"
```

---

### Task 5: Zones where some cards sit on cards, the zone they sit in, and moves that keep cards on theirs

**Files:**
- Modify: `src/engine/core/lang/types.ts`: `ZoneSpec.onCards?: 'every' | 'some'` and `holders?: string`.
- Modify: `src/engine/core/lang/library/setup-phrases.ts`: the zone lines.
- Modify: `src/engine/core/lang/compile.ts`: `compileTable` checks `holders`.
- Modify: `src/engine/core/lang/attach.ts`:
  - `onCardsZoneOf` takes the holder's zone;
  - rule 4 follows `holders`.
- Modify: `src/engine/core/lang/library/attach-phrases.ts`:
  - the Given picks the zone by the holder;
  - four effects and two conditions.
- Modify: `src/engine/core/lang/testing.ts`: `YARD_GAME`.
- Test: `src/engine/core/lang/library/setup-phrases.test.ts`, `src/engine/core/lang/attach.test.ts`, `src/engine/core/lang/library/attach-phrases.test.ts`, `src/engine/core/lang/fit-layout.test.ts` (guard).

**Interfaces:**
- Consumes: Task 4's announcing helper; `putOn`, `relocate`, `cardsOn`, `holderIdOf`, `cardHasFlag`, `zoneInfo`.
- Produces (for plan 4-2):
  - **Zone lines**, each with an `an` form:
    - `each player has a {name} row that {visibility}, where some cards are on cards` gives `onCards: 'some'`;
    - `…, where every card is on a card in their {name}` gives `onCards: 'every', holders`;
    - `…, where some cards are on cards in their {name}` gives `onCards: 'some', holders`.

    The shared forms of the new marks are refused with `Only a zone each player has can hold cards on cards.`
  - **`compileTable`.** A `holders` that is no zone each player has gives `` `There is no zone each player has called “${holders}”.` `` on its line, with the closest such zones as suggestions.
  - **`attachmentProblem`.** For a card in a zone with `holders`, rule 4 requires the holder to be in that zone of the same seat, with the existing message. Rules 1 and 2 are as built: a `'some'` zone needs neither.
  - **`onCardsZoneOf`:**

    ```ts
    export function onCardsZoneOf(game: CompiledGame, seat: PlayerId, holderZone?: string): string
    ```

    - **With a `holderZone`,** it picks the first marked zone each player has whose `holders` is that zone.
    - **Otherwise,** or when none matches, it picks the first `'every'` zone with no `holders`. With no `holderZone` this is the old pick, and a `'some'` zone is never it.
    - **With neither,** it throws `` `No zone each player has holds cards on cards in their ${holderZone}.` ``, or the old message when no `holderZone` was given.
    - The Given passes the holder's zone name.
  - **`attach-phrases.ts`:**
    - condition `it is on a card` (`needsCard`);
    - condition `no picked card is {cardflag}` (`needsCards`);
    - effect `the picked cards that are {cardflag} go to {zone}, on the target card` (`needsCards`, `needsOnto`). It puts those cards there, then announces their joins;
    - effect `the picked cards that are not {cardflag} go to {zone}` (`needsCards`). It moves the rest, on nothing;
    - effect `every card on it that is {cardflag} goes to {zone}, staying on it` (`needsCard`). It moves them with `putOn`, back onto "it", through `onCardsZone`, and announces nothing;
    - effect `every card on it that is not {cardflag} goes to {zone}` (`needsCard`).
- **`testing.ts`:**

```ts
/**
 * CREW_GAME with a shelf of finished jobs and a yard where some hands sit on a job on the shelf: a Smith clings to its job. Posting hands
 * to a shelved job puts a clinging one on it and the rest in the yard; shipping a job to the shelf takes its clinging crew along, on it,
 * and the rest to the yard; a clinging hand transfers to another shelved job.
 */
export const YARD_GAME = CREW_GAME
  .replace('  Each player has an idle row that everyone can see.', ['  Each player has an idle row that everyone can see.',
    '  Each player has a shelf row that everyone can see.',
    '  Each player has a yard row that everyone can see, where some cards are on cards in their shelf.'].join('\n'))
  .replace('  A player may stop.', [
    '  A player may post some cards from the hall to a card in their shelf.', '    Then:',
    '      The picked cards that are clinging go to their yard, on the target card.',
    '      The picked cards that are not clinging go to their yard.',
    '  A player may post some cards from the hall to their yard.', '    Only if no picked card is clinging.',
    '  A player may ship a card from their workshop to their shelf.', '    It costs 1 move.', '    Then:',
    '      Every card on it that is clinging goes to their yard, staying on it.',
    '      Every card on it that is not clinging goes to their yard.',
    '  A player may transfer a card from their yard to a card in their shelf.', '    Only if it is on a card.',
    '    Only if it is not on the target card.', '    Then:', '      It goes to their yard, on the target card.',
    '  A player may stop.'].join('\n'))
  + '\n\nClinging:\n  Only if it is a Smith card.';
```

- [ ] **Step 1: Write the failing tests.**

  In `setup-phrases.test.ts`:
  - `Each player has a yard row that everyone can see, where some cards are on cards.` gives `{ name: 'yard', perPlayer: true, layout: 'row', visibility: 'public', onCards: 'some' }`, and so does the `an` form of another name.
  - `…, where some cards are on cards in their shelf.` adds `holders: 'shelf'`.
  - `…, where every card is on a card in their workshop.` gives `onCards: 'every', holders: 'workshop'`.
  - `The yard is a row in the center that everyone can see, where some cards are on cards.` gives `Only a zone each player has can hold cards on cards.`

  In `attach.test.ts`, on `YARD_GAME`:
  - **Compiled.** It compiles with `[]`. With `in their shelff`, it gives `There is no zone each player has called “shelff”.` on the yard's line.
  - **The yard.** `attachmentProblem` is null:
    - for a Smith in `yard-p0` on nothing;
    - for one on a Vase in `shelf-p0`.
  - **The yard, refused.** On a Vase in `workshop-p0` it is `The Smith in p0's yard is on the Vase, which is now in p0's workshop. Move the cards on a card along with it.` On a Vase in `shelf-p1` it names p1's shelf.
  - **M1.**
    - With the crew line ending `…, where every card is on a card in their workshop.`, a Potter in `crew-p0` on a Vase in `shelf-p0` gives `The Potter in p0's crew is on the Vase, which is now in p0's shelf. Move the cards on a card along with it.`
    - With the crew line as it is, the same table gives null (guard: passes before and after).
  - **`onCardsZoneOf`.**
    - `(game, 'p0', 'shelf')` is `'yard-p0'`, and `(game, 'p0', 'workshop')` and `(game, 'p0')` are `'crew-p0'`.
    - A game whose only marked zone names `holders: 'shelf'` throws `No zone each player has holds cards on cards in their workshop.` for `'workshop'`.

  In `attach-phrases.test.ts`, a 2-player `YARD_GAME` engine, p0 to act, with a Vase and a Statue in p0's shelf:
  - **Posting onto a job.** Posting a Smith and a Potter onto the shelved Vase puts both in `yard-p0`: the Smith with `lang:on` the Vase, and the Potter with no `lang:on`.
  - **Posting to the yard.** Posting a Smith is refused with `no picked card is clinging`. Posting two Potters is accepted.
  - **Shipping.** p0 ships a Vase from the workshop with a Smith and a Potter on it in `crew-p0`:
    - the Vase is in `shelf-p0`;
    - the Smith is in `yard-p0` on the Vase;
    - the Potter is in `yard-p0` on nothing;
    - `crew-p0` is empty.
  - **Transferring.**
    - Transferring the Smith to the shelved Statue puts it on the Statue.
    - A Potter on nothing is refused with `it is on a card`.
    - The card it is on is refused with `it is not on the target card`.
  - **Givens.** An example's `Given the Vase in p0's shelf has a Smith on it` puts the Smith in `yard-p0`, and `Given the Vase in p0's workshop has a Potter on it` puts the Potter in `crew-p0`. Run through `runExamples`, with Then lines `p0's yard has a Smith` and `p0's crew has a Potter`.
  - **Joins.** `YARD_GAME` with `Cards can have dents.` and `In every phase:\n  When a Smith card joins a card in a shelf:\n    The card it joins gains 1 dent.`:
    - posting a Smith onto the shelved Vase gives it 1 dent;
    - shipping a job with a Smith on it gives its job none ("staying on it" is no join).

  In `fit-layout.test.ts` (guard: passes before and after; it type-checks only after this task): `fittedLayout` of `BOARD` with `idle` marked `onCards: 'some', holders: 'workshop'` and `crew` given `holders: 'workshop'`:
  - `idle-p1` stays a board row: `layout: 'row'`, bounds height 776;
  - `crew-p1` stays `layout: 'free'`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/setup-phrases.test.ts src/engine/core/lang/attach.test.ts src/engine/core/lang/library/attach-phrases.test.ts src/engine/core/lang/fit-layout.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/library/setup-phrases.ts src/engine/core/lang/compile.ts src/engine/core/lang/attach.ts \
  src/engine/core/lang/library/attach-phrases.ts src/engine/core/lang/testing.ts src/engine/core/lang/library/setup-phrases.test.ts \
  src/engine/core/lang/attach.test.ts src/engine/core/lang/library/attach-phrases.test.ts src/engine/core/lang/fit-layout.test.ts
git commit -m "feat(lang): zones where some cards sit on cards, a zone line that names the zone they sit in, and moves that send some cards along, still on theirs"
```

---

### Task 6: Steps each player takes before the score

**Files:**
- Modify: `src/engine/core/lang/types.ts`: `CompiledEnd.steps?`.
- Modify: `src/engine/core/lang/compile.ts`:
  - `compileEnd` reads the line;
  - `warnUnreachable` counts the phase it names as reached.
- Modify: `src/engine/core/lang/turns.ts`: `END_STEPS_KEY`; `clearTurnMarkers` drops it.
- Modify: `src/engine/core/lang/runtime.ts`: `endStepsDue`, `startEndSteps`, `endStepsDone` and `turnWaiting`.
- Modify: `src/engine/core/lang/build.ts`: the entry rule, End's predicate and the registry.
- Modify: `src/engine/core/lang/library/turn-phrases.ts`: `the {phase} passes to the left`.
- Modify: `src/engine/core/lang/testing.ts`: `STEPS_GAME`.
- Test: `src/engine/core/lang/end-steps.test.ts` (new).

**Interfaces:**
- Consumes: `startPlayerOf`, `isOut`, `nextIn`, `playersIn`, `chooseNext`, `runInPhase`, `checkAttachments`, `env.runLine`, `parseParam('phase')`, `suggestNames`.
- Produces (for plan 4-2):

```ts
// types.ts — CompiledEnd gains: steps?: { phase: string; line: number };   left out when the End has no such line
// turns.ts
/** Absent before the steps before the score; while they run, the seat that took the first step; true once every seat still in has had one. */
export const END_STEPS_KEY = 'lang:end-steps';
// runtime.ts
endStepsDue(state: GameState): boolean      // the End has steps, none has begun, no result, a game phase, and runtime.test(end.when) holds (its round frame included)
startEndSteps(state: GameState): GameState  // see below
endStepsDone(state: GameState): boolean     // state.data[END_STEPS_KEY] === true
// build.ts
const END_STEPS_RULE = 'the steps before the score start';
type EndParams = { when: PhraseRef; rules: TriggerParams[]; afterSteps?: true };
```

- **`compileEnd`** reads `/^before the score, each player has the (.+), in turn from the start player$/i`:
  - a phase the game lacks gives `There is no phase called “…”.` with the closest phases;
  - a second such line gives `There is already a line saying what comes before the score.`;
  - a phase where everyone acts at once gives `` `The steps before the score are taken in turn, so “${phase}” can't be a phase where everyone acts at once.` `` on the line.
- **`flowDefFor`**, for a game whose End has `steps`:
  - `triggers` is `[entry, ...turnStart, ...ruleTriggers]`. The entry is `{ id: END_STEPS_RULE, when: { name: 'lang:end-steps-due' }, then: [{ name: 'lang:end-steps-start' }] }`;
  - End is `{ name: 'lang:end-when', params: { when, rules: cardRules, afterSteps: true } }`, which also needs `endStepsDone`.

  Any other game's `FlowDef` is unchanged.
- **`startEndSteps`:**
  - the phase becomes `steps.phase`;
  - the current seat is the start player, or the first seat still in after them when they are out;
  - `END_STEPS_KEY` is that seat;
  - then the phase's `When this phase starts:` lines run about that seat, checked as `lang:phase-effect` checks.
- **`turnWaiting`** is false while `END_STEPS_KEY` is in `state.data`.
- **Effect `the {phase} passes to the left`:**
  - **Refused.** It throws `` `The ${phase} passes to the left only while the players take it before the score.` `` unless the steps are running and the game is in that phase, which is the End's.
  - **The next seat.** The next seat is `nextIn` the current one. With no other seat in, or when the next seat is the first, `END_STEPS_KEY` becomes `true` and the current seat the first.
  - **Otherwise** it hands the step on with `chooseNext`, and runs the phase's start lines about the new seat through `env.runLine`.
- **`testing.ts`:**

```ts
/**
 * ROUNDS_GAME whose End waits for the round once the done pile has a card, and gives each player a final count before the score, in turn
 * from the start player: its start line gives them 1 coin, and they pass it on by counting (2 coins more), or at once with 6 coins or
 * more. Coins score 1 point for every 2.
 */
export const STEPS_GAME = [
  ROUNDS_GAME.replace('  The game ends when the pile is empty.\n  The highest score wins.', [
    '  The game ends when the done pile is not empty and the round is finished.',
    '  Before the score, each player has the final count, in turn from the start player.',
    '  Each player scores 1 point for every 2 coins.', '  The highest score wins, and tied players share the win.'].join('\n')), '',
  'Phase: final count', '  Players take turns.', '  When this phase starts:', '    They get 1 coin.',
  '  A player may count.', '    Then:', '      They get 2 coins.', '      The final count passes to the left.',
  '  When they have at least 6 coins:', '    The final count passes to the left.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**

  In `end-steps.test.ts`:
  - **The engine.** `table(game, prepare?)` is a 3-player engine from `initialState(game, 1)`, with turn `{ current: 'p0', phase: 'working' }` and the counters filled by `withBoardData`. `prepare` may set coins or mark a seat out first. p0 is the start player.
  - **`round(engine)`** has p0, p1 and p2 each press `stop`.
  - **Compiled.**
    - `STEPS_GAME` compiles with `[]`, with no "Nothing leads to the phase “final count”." warning.
    - `game.end.steps` is `{ phase: 'final count', line: <the Before line> }`.
    - `final cont` gives `There is no phase called “final cont”.` with suggestions `['final count']`.
    - A second Before line gives `There is already a line saying what comes before the score.`
    - `Everyone acts at once.` under `Phase: final count` gives the at-once message on the Before line.
  - **The flow.**
    - `flowDefFor(steps, seatsFor(3))` has trigger ids starting `['the steps before the score start', 'a turn starts']`.
    - Its End is `lang:end-when` with `afterSteps: true`.
  - **Games without the line** (guard: passes before and after):
    - The `ENDING` text of `runtime.test.ts` (copied) gives trigger ids `['a turn starts', 'line 26: When the done pile has more than 2 cards']` and End `[{ when: { name: 'lang:cond', params: <its when> }, result: 'lang:result' }]`.
    - Hearts and Rent Day (from `@/games/*.rules?raw`) have no trigger with the entry's id, and no End params with `afterSteps`.
  - **The steps start, and no turn or round does.** After `round(table(steps))`:
    - the phase is `final count` and the current seat p0;
    - `data[END_STEPS_KEY]` is `'p0'` and `ROUND_KEY` is 1;
    - the done pile holds 1 card;
    - coins are `[3, 2, 2]`;
    - there is no result.
  - **Pressing on.**
    - p1's `count` is refused with `not p1's turn`.
    - After p0's count, the current seat is p1, with coins `[5, 3, 2]`.
    - After p1's and p2's counts:
      - the result is `{ scores: { p0: 2, p1: 2, p2: 2 }, winner: 'p0', winners: ['p0', 'p1', 'p2'] }`;
      - `END_STEPS_KEY` is `true`;
      - coins are `[5, 5, 5]`;
      - `ROUND_KEY` is 1.
  - **A rule that passes the step on.** With p1 at 9 coins before the round, after `round` and p0's count, the current seat is p2, with coins `[5, 12, 3]`.
  - **Review Focus: every step passes at once.** With every seat at 9 coins, p2's `stop` ends the game: coins `[12, 12, 12]`, scores 6 each, and `ROUND_KEY` 1.
  - **Review Focus: a seat that is out.** With p1 marked out:
    - after `stop` by p0 and p2, then p0's count, the current seat is p2;
    - p1 has 0 coins;
    - p2's count ends the game.
  - **Refused outside the steps.**
    - `STEPS_GAME` with `      The final count passes to the left.` added under working's `A player may stop.` `Then:` makes p0's `stop` throw `The final count passes to the left only while the players take it before the score.` on that line.
    - The engine's state is unchanged.
  - **Review Focus: undo and replay.**
    - After `round`, p0's count and p1's count, a fresh `table(steps)` given `loadLog(engine.getLog())` equals the engine's state.
    - `engine.undo()` gives the state after p0's count: current p1, coins `[5, 3, 2]`.
  - **After the end.** p0's `count` is refused with `game is over`.
  - **Clearing.** `clearTurnMarkers` drops `lang:end-steps`.
  - **An example.** `STEPS_GAME` with this appended passes `runExamples`:

```text
Example: everyone counts before the score, from the start player
  Given 3 players
  And the done pile has a Sweep
  And it is p2's turn
  When p2 stops
  Then the phase is final count
  And it is p0's turn
  When p0 counts
  Then it is p1's turn
  When p1 counts
  And p2 counts
  Then the game is over
  And p2 wins
```

  The example's numbers: p2 has 1 (tidying) + 1 + 2 = 4 coins, and p0 and p1 have 1 + 2 = 3 each. The scores are 2, 1 and 1.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/end-steps.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** it, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. `runtime.test.ts`'s End and round tests must pass unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/compile.ts src/engine/core/lang/turns.ts src/engine/core/lang/runtime.ts \
  src/engine/core/lang/build.ts src/engine/core/lang/library/turn-phrases.ts src/engine/core/lang/testing.ts src/engine/core/lang/end-steps.test.ts
git commit -m "feat(lang): steps each player takes in turn from the start player once the game is decided and before it is scored, with no turn or round started"
```

---

### Task 7: Example words, an example for each piece, the README, and the checks

**Files:**
- Modify: `src/engine/core/lang/library/player-value-phrases.ts`: an expect.
- Test: `src/engine/core/lang/library/player-value-phrases.test.ts`, `src/engine/core/lang/examples.test.ts`.
- Modify: `README.md`: a paragraph after "Choices and comparing cards".

**Interfaces:**
- Consumes: every fixture above, and `runExamples`.
- Produces: expect `{player}'s {playervalue} is {int}`. A miss says `` `Expected ${seat}'s ${name} to be ${n}, but it is ${have}.` ``

- [ ] **Step 1: Write the failing tests.**

  In `player-value-phrases.test.ts`:
  - On `FORCE_GAME` with the Task 1 arrangement, `p0's red force is 2` is true.
  - `p0's red force is 3` gives `Expected p0's red force to be 3, but it is 2.`

  In `examples.test.ts`, `describe('the words for slice 4's pieces')`. Each fixture, with its example appended, passes `runExamples`:
  - **`RESTING_GAME`:**

```text
Example: a resting job adds nothing to the red load
  Given p0's workshop has a Vase and a Statue
  And the Statue in p0's workshop is resting
  Then p0's red load is 2
  And p0's red force is 0
```

  - **`MEND_GAME`**, with `  A player may mend.\n    Then:\n      The cards in their workshop lose cracks between them, up to their mend, first card first.` before `  A player may stop.`:

```text
Example: mending shares the idle hands' skill among the jobs, first job first
  Given p0's workshop has a Vase and a Statue
  And the Vase in p0's workshop has 2 cracks
  And the Statue in p0's workshop has 3 cracks
  And p0's idle has a Potter and a Smith
  When p0 mends
  Then the Vase in p0's workshop has 0 cracks
  And the Statue in p0's workshop has 2 cracks
  And the Vase in p0's workshop has 3 worth
```

  - **`JOIN_GAME`:**

```text
Example: a Smith that joins a job dents it, a Potter does not
  Given p0's workshop has a Vase
  When p0 hires a Smith and a Potter to the Vase
  Then it is accepted
  And the Vase in p0's workshop has 1 dent
```

  - **`YARD_GAME`:**

```text
Example: shipping a job takes its clinging hand along, on it
  Given p0's workshop has a Vase
  And the Vase in p0's workshop has a Smith and a Potter on it
  When p0 ships the Vase
  Then the Vase in p0's shelf has the Smith on it
  And p0's yard has a Smith and a Potter
```

  - **A failing example.** `RESTING_GAME` with `Then p0's red load is 9` fails with `Expected p0's red load to be 9, but it is 2.` on that line.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/player-value-phrases.test.ts src/engine/core/lang/examples.test.ts`. Expected: FAIL (the new expect).
- [ ] **Step 3: Implement** the expect. Then write the README paragraph, **"Values about players, flags on groups, cards that join cards and steps before the score."** It is written with this plan's fixtures; plan 4-2 may swap in Startup's lines. One bullet each:
  - values about a player, with their comparisons and `Then p0's red force is 2`;
  - `that are (not) …` and `and whose …` on groups;
  - `they have a card in … that is not …`, `some/no card in … is …` and `Every card in … is not ….`;
  - the card rule `When a card in an idle is tired:`;
  - going down, `It loses 1 crack.`, `its cracks are 0` and the shared total;
  - the three value lines;
  - joins, announced by the lines that put a card on a card and never by a Given;
  - `…, where some cards are on cards` and `… in their shelf`, the placement lines, `staying on it`, `it is on a card` and `no picked card is …`, and the Given picking the zone by the holder;
  - the steps before the score: the End line, `The final count passes to the left.`, and that no turn starts during them.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 5: Run the checks.** Each must print nothing.

```bash
# Startup Simulator's words in shared code, slices 3 and 4 included, tests included
git diff "$BASE" -- src/engine src/pages src/utils ':!src/pages/designer/designer-page.test.tsx' ':!src/pages/designer/playtest-fitted.test.tsx' \
  ':!src/pages/designer/tableaux.test.ts' ':!src/pages/designer/samples.ts' | grep '^+[^+]' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share|tags?|leads?|leading|licen[cs]es?|tiers?|stall(s|ed|ing)?|sectors?|expertise|modes?|bandwidths?|bugs?|qa|online|offline|maint(enance)?|suppl(y|ies)|demands?)\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# no existing test line removed outside the one this plan names
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
# nothing outside the language
git diff --stat "$BASE" -- src/games src/pages
```

  The fourth check prints exactly the pinned `VOCAB_TYPES` line(s) of `refs.test.ts`. Also read the `+` lines of `src/engine` for "source" in the game sense.
- [ ] **Step 6: Run the games alone.**
  - `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
  - `bunx vitest run src/games/startup-simulator.test.ts` passes with BASE's example count.
- [ ] **Step 7: Commit**

```bash
git add src/engine/core/lang/library/player-value-phrases.ts src/engine/core/lang/library/player-value-phrases.test.ts \
  src/engine/core/lang/examples.test.ts README.md
git commit -m "feat(lang): examples check a value about a player, and one example for each of slice 4's pieces; the README describes them"
```
