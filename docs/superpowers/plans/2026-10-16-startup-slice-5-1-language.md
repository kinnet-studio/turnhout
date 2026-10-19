# Startup Simulator Slice 5-1 (Language) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The rules language gains every general piece slice 5 needs: counting cards and the kinds of a value among them, a test of the card a rule is about by any column, sums and products of a card's own numbers, what a card's owner has and what card it sits on, a button's target card picked in several zones with tests and changes of that card, a deal that shuffles a discard back in, a number given to a group or to its first few cards, rules about a player asked in turn from the player whose turn last started (and written with any condition said of one player), an End that waits for them, an `If` line with two conditions, and a flag set on some cards on a card. All of it is tested with fixtures in general words. Startup Simulator's text does not change.

**Architecture:**
- **This is plan 5-1 of three** (spec R13). Plan 5-2 writes the rules text and the long runs; plan 5-3 the page. Nothing here touches `src/games/**` or `src/pages/**`.
- **Eight tasks, as R13 lists them:**
  1. counting and text equality;
  2. Synergy's shape (a card's numbers added and multiplied) and owner scope (with the card it is on);
  3. multi-zone targets, and tests and changes of the target card and the picked cards;
  4. the reshuffling deal and "the first N";
  5. the `When a player …:` frame, asked in turn from the player whose turn last started;
  6. End waiting for rules for every phase about a player, and `If … and …, …` for claims at a moment;
  7. the graduation step's pieces, played through a fixture;
  8. an example for each piece, the README, and the checks (word check included).
- **Where things live.**
  - Values: `total-phrases.ts` (a card counts its group), `player-value-phrases.ts` (a player counts a group, or the kinds of a value in it), `card-subject-phrases.ts` (a card's own numbers, and a test of the card by any column: card-only for the view).
  - Conditions reading beyond the card: `compare-phrases.ts` (at least some cards; its owner's zones) and `attach-phrases.ts` (the card it is on). Neither registrar is card-only, so no value read through them is ever shown on a face (fails closed).
  - Targets and picked cards: `card-pick-phrases.ts`; the zones a target may be picked in: `CardPick.ontoAlso` and `ontoPlaces` (`declared-moves.ts`).
  - Group changes: `card-number-phrases.ts`, through 4-1's `changeable`. The reshuffling deal: `queue-phrases.ts`.
  - Turn order for rules about a player: `turns.ts` (`LAST_TURN_KEY`, `playersInTurnOrder`, `PLAYER_FRAME`, `isPlayerRule`), read by `runtime.ts`, `compile-phase.ts` and `build.ts`.
  - `lang:last-turn` is the only new `state.data` key. No card `data` key, no `CardState` change.
- **Builder calls this plan makes** (the spec leaves wordings to the builder):
  - **Kinds of a value:** `the number of different {attribute} values among {cardgroup}`. "different tags" can't be read: `{attribute}` is bounded, so "tag" + "s" never matches, and a plural type would be a new vocab type. A card without the value adds no kind; text is compared in any capitals, as `passes` compares it.
  - **Text equality about a card subject** is `it is (not) a card whose {cardfilter}` ("it is a card whose tag is IoT"). `its {cardfilter}` would also read "its pay is 1", which `its {attribute} is {int}` reads already: two phrases on one line is an `ambiguous` error.
  - **Synergy's shape** is a product of two worked counts on the project: `A card's blue team output goes up by its pm count times its blue workers.` R3 allows either this or "the cards beside it"; the product needs one value line and reads only the card.
  - **A card's numbers added:** `a card's {attribute} goes up by its {attribute}`. R5's worked `xp`, `skills`, `pending tokens` and `human capital` are sums of a card's counts; nothing adds one of a card's numbers to a value today.
  - **Owner scope** is `its owner has (a / no) card in their {perzone} {cardclause}`; "their" is written in the pattern so that the line needs no player. A card in no seat's zone has no owner: "has a card" is false and "has no card" true.
  - **The card it is on** (`the card it is on is (not) {cardclass}`) is for R8's Pending Badge ("an unbadged Junior PM on a Tier 2/3 project"). A card on no card makes both forms false. It is not card-only: in slice 9 the card a visible card sits on may be face down (slice 9 R3 hides the Pending Badge), so a value read through it is never shown (forward note to 5-3).
  - **Several target zones** are written `… to a card in their bench, their development team or their ops team.` (`, `, ` or `, `, or `). `CardPick.onto`/`ontoText` keep the first zone; `ontoAlso` holds the rest, each with its text, and is left out when the line names one zone, so every compiled pick and its `toEqual` tests stay as they are. Targets are offered zone by zone in the order written, slot by slot. An example's `… to the Potter` presses the first zone that holds a match; `… to the Potter in p0's idle` (4-1's P16) picks another.
  - **Examples keep "to":** R3's "plays the Full Stack Bootcamp on …" is written `When p0 plays the Full Stack Bootcamp to the Junior QA Tester, choosing blue`, the existing form; an "on" alias would make a button whose base ends in "on" (`keep blue on`) ambiguous.
  - **The reshuffling deal** deals one card at a time; when the deck is empty and the discard is not, the whole discard goes into the deck and the deck is shuffled with the state's random numbers; it stops when both are empty. It says `card(s)`, so slice 6's Event deck can deal `up to 1 card`.
  - **"The first N"** is `up to its {attribute} of {cardgroup} gain {int} {attribute}, first card first`, beside `{cardgroup} gain {int} {attribute}`. R7's Green token is then `For each card in their development whose qa team output is more than 0, up to its bugs of the cards on it that are green learners gain 1 pending green, first card first.` The group's order is `cardsOn`'s: attach order (R7's team order).
  - **Every rule about a player is asked in turn order** from the seat whose turn last started, `When a player is …:` as much as the new frame. The builder check (M1) proposed this only for the new frame; this plan applies it to all, because two rules that read alike (`When a player has 3 jail turns:` and `When a player has at least 3 coins:`) must not ask players in two orders. No existing game has both turns and such a rule: Rent Day never starts a turn, so with no last turn the order is seat order and nothing changes (guard tests).
  - **The last turn** is kept under `lang:last-turn`, set wherever `lang:turn-of` is set and never cleared by the turn passing. `lang:turn-of` is cleared by "the turn passes to the left", so it can't say whose turn ended the round; R1's last check needs exactly that.
  - **The frame** is tried only when no condition, `who` or `which` phrase reads the `When` line: `When a player <words>:` is read as `they <words in the they form>` (`theyForm`, as a choice's clause is), and `When a player's <words>:` as `their <words>`. `When a player's turn starts:` is read before any rule, so it never reaches the frame.
  - **End waits** for rules for every phase about a player (a `who` rule or the frame), as it waits for card rules. Rules under a phase don't hold End back.
  - **`If <condition> and <condition>, <effect>`**: when the words before the comma are no condition as a whole, they are cut at an " and " where both halves read; the first such cut wins. Two conditions, not more. R1's claims at a moment need it: `move {card} from {zone} to {zone}` throws when the card is gone, and First Mover needs "a Tier 2 card" and "the milestone row has a First Mover Advantage" on Launch's line.
  - **Graduation needs one new phrase** (`every card on it that is {cardflag} is {cardflag}`, for R8's "Launch of a Tier 2/3 project badges every Synergy card on it"). Everything else R2 writes is built: Task 7 plays a whole step of per-card choices through a fixture to prove it.
  - **Example vocabulary needs no new phrase.** `When p0 keeps blue on the Junior Software Dev` is a button whose base is `keep blue on`; `When p0 mentors …, choosing red` is 3-1's choice suffix; `When p0 plays … to …, choosing blue` is 1b's `to {card}` with it; `Then p1's milestones has the Talent Magnet`, `Given … has 1 pending blue` and `Then p0's … is 2` exist. Tasks 3, 7 and 8 prove each in general words.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-5-talent-growth-design.md` is binding; its "Builder-check rulings" R1–R13 win over its body, and this plan is R13's 5-1 (with R3's piece list). It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding, especially its anti-goals: Startup words in shared code, and hidden information leaking. The evidence is `builder-check-startup-5.md` (M1–M12, N1–N13) in the session scratchpad. Plans 4-1 (`docs/superpowers/plans/2026-10-16-startup-slice-4-1-language.md`, with its Global Constraints amendment P1–P23), 4-2 and 4-3 are inputs.

## Global Constraints

- **Controller amendment (pre-flight at `fd9d0df`).** The scan is in the plan's SDD workspace (`preflight.md`; probes in the scratchpad's `pf51/`). 2 of 138 assumed items differ (A27: 4-1's line reads `… goes to {zone}, staying on it`; A36: P16's named zone travels as `Wording.to` — `fitsWording`, `buttonsFor` and `move.onto` are what Task 3 extends). The turn-order change was probed at HEAD: no outcome changes in any game (68 run records byte-identical; Rent Day never sets the last turn and keeps seat order), so it stands. Each task's brief carries its rulings:
  - **P1 (Task 1).** 4-3's test "counts one line as working out a value about a player…" (`worked-view.test.ts` ~:446) pins the player-value phrases to `[PLAYER_TOTAL]`; Task 1 updates that list to `PLAYER_TOTAL` plus its two count patterns, judged "not shown" (`shownPlayerValues` unchanged; 5-3 decides on showing counts). Task 8's check 4 prints that line.
  - **P2 (Task 1).** Write `Crowded:` as `Only if it is a card whose crew count is more than 1.` (`its {attribute} is more than {int}` isn't card-only, so it would never show).
  - **P3 (Task 1).** The Tinker's wage works out to 1, so `… at least 4 cards …` holds: assert 4 holds and 5 does not.
  - **P4 (Tasks 1, 2, 5).** 3-player CREW-based engines and CLAIM_GAME start with Setup skipped, as `end-steps.test.ts`'s `table` does (then the last turn reads p2 then p0).
  - **P5 (Task 5).** Take the `When a player …:` frame only when a phrase matches or the text misnames something (a small helper beside `libraryHasSayOn` in `compile-util.ts`; that one is also true on mere suggestions). The guard uses `toContainEqual` (a second diagnostic on `They are crowned.` exists at HEAD).
  - **P6 (Task 6).** The End example writes `Move the pile to their list.` (ROUNDS_GAME's done-pile rule would refill the pile while End waits).
  - **P7 (Task 3).** The hidden-zone case expects both diagnostics (the Gold option's `Only if the target card is a Smith.` too). G1 folds in: `board-view.ts`'s "There is no card in your …" names every target zone.
  - **P8 (all).** New code imports `zoneCards`/`cardById` from `zone-index.ts`.
  - **G2 (forward to 5-2/5-3).** Flags written `its … is more than …` or `it is {cardflag}` never show on a face; prefer `it is a card whose …` where a flag should show.

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`. The reshuffle uses the state's `rng`.
- **State is Json-only, under `lang:*` keys.** `lang:last-turn` is the only new `state.data` key. No new key in a card's `data`. New fields (`CardPick.ontoAlso`) are optional and left out, never set to `undefined`.
- **No Startup Simulator words in shared code** (code, comments, test names and fixture strings), in every form:
  - plan 1b-2's: capital, talent, agency, junior, backlog, growth, crash, vaporware, university, bench, ideation, startup, research, recruit, product, job market, idea pool, "seed" meaning a deck/market/card/product, greenlight, launch, pivot, salary, payroll, project, cube, ops, operations, onboarding, scouting, source/sourcing in the game sense, market share;
  - slice 3's: tag, lead, license, tier, stall, sector, expertise ("lead" in its plain sense too: write "goes to");
  - slice 4's: mode, bandwidth, bug, qa, online, offline, maint (and maintenance), supply, demand;
  - **slice 5's (R13 and the spec's anti-goal): xp, pending, skill, badge, rank, mentor, synergy, agile, graduate, training, brainstorm, strategy, milestone, senior.**
  - Ordinary words to avoid: write "a mistake in the code", not "a bug"; "gives", not "supplies"; "waiting", not "pending"; never "rank" or "strategy" in a comment.
  - **`CREW_GAME`'s hands have a `skill` column.** New fixture lines and tests read `wage` or `craft` instead, or a worked value (`red work`) by its own name.
  - The banned words may appear in `src/games/startup-simulator.*`, `README.md` and `docs/`.
  - The page's word "badge" (a card's corner label) is an older use in `src/pages/**`; this plan changes nothing there.
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged; Rent Day keeps its 108 examples. Startup Simulator compiles with `[]` and its examples pass in the same number as at BASE.
- **Every number comes from the rulebook.** This plan's numbers are fixture numbers; plan 5-2 cites the rulebook for each of Startup's.
- **Hidden information (3-2's and 4-1's lessons).**
  - What a seat's view shows is decided by the compiled rules alone, and never reveals a hidden card or zone.
  - `worked-view.ts` counts every phrase of `registerCardSubjectPhrases` and `registerCardValuePhrases` as card-only. A task that adds a phrase there updates the phrase-set test in `worked-view.test.ts` (its list and the count in its title), and adds the phrase to `CARDS_ON_IT` when it reads the cards on a card. A phrase that reads anything else of the table goes in another registrar.
  - A new card-only value that reads a group of "the cards on it" joins `FROM_CARDS_TOTAL`'s all-public rule in `cardOnlyNames`.
  - Every phrase that reads a card carries its needs flags (`needsCard`, `needsCards`, `needsOnto`, `needsMove`); a group or test among its arguments is counted through `cardArgsOf`. A target or test of a target read from a zone the presser may not see is reported by `reportHiddenCardReads`, for each target zone.
  - New readers of "the cards on it" go through `cardsOn` or `cardsIn` (4-1's P11), so slice 7 narrows them in one place.
- **Every new phrase that changes a card's count or flag declares `writes`**, and changes a count only through 4-1's `changeable`.
- **Existing code and tests.**
  - New imported names go on new `import` lines in existing files.
  - Existing test lines change only where a task names them: the phrase-set test's title and list in `worked-view.test.ts` (Tasks 1 and 2). Tests may be appended and fixtures added to `testing.ts`.
  - If any other existing test fails, stop and report it instead of changing it.
  - After widening a type, run `bun run typecheck` and read every `switch` and narrowing on it.
- **Plans 4-1 (built) and, where named, 4-2/4-3 come first.** Each task re-checks, at HEAD and by name, the names its Interfaces block consumes, and stops and reports one that differs. If plan 4-3 has landed, its `shownPlayerValues` is left as it is: the new player-value lines are no total lines, so they stay unshown.
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1: record `BASE=$(git rev-parse HEAD)`; run `bun run test` once for the passing count; note Startup Simulator's example count.
- **Style.** 2-space indent, single quotes, chainable registrars, comments that say why. Commit prefix `feat(lang):`, `docs:` for a README-only commit. TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit. A test marked "(guard)" passes before and after its task.
- **Fixture words** (general, never Startup's): crew size, hands at work, craft kinds, gilded, boosters, red makers, team red, polish, guarded, high, coach, rouse, drills, gold drills, cracks, tutor, gather, ready, crowned, counting, help, marks, stars, sorting, sorted, torn, single, helpable, helping, eager, keen.

## Review Focus

- **A rule about a player when no turn has started, or when the player whose turn last started is out.**
  - Expected: with no last turn (Rent Day, any game without turns, Setup) players are asked in seat order; an out seat is skipped and the next seat still in is asked first.
  - Tests: Task 5 (`playersInTurnOrder` and a guard on Rent Day).
- **The reshuffling deal when both piles are empty, when the deck runs out exactly, or when no shuffle is needed.**
  - Expected: it deals what there is, with no error; the random numbers move only when it shuffles; replay gives the same cards.
  - Tests: Task 4.
- **A press that meets a claim and also ends the game, and a claim met by the last step before the score.**
  - Expected: the claim is made before the score, from the seat whose turn ended the round; undo and replay give the same state.
  - Tests: Task 6.
- **A target named in two of its button's zones, or a target zone the presser can't see.**
  - Expected: an example's `… to the Potter` takes the first zone written; `… in p0's idle` takes another; a test of the target read from a hidden zone is refused when the rules are read.
  - Tests: Task 3.
- **Counting over cards that lack the value, and "up to its N" with N of 0, more than the group, or a card the group's test skips.**
  - Expected: a blank adds no kind and a worked value is read through its lines; nothing beyond the group gains, and a skipped card uses none of N.
  - Tests: Tasks 1 and 4.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name, not by line. If one is missing or differs, stop and report it.

- **Plan 4-1, built (its Interfaces blocks and P1–P23):**
  - T1: `PlayerValue`, `CompiledGame.playerValues`, `Vocab.playerValues`, `LangRuntime.playerValue`, `playerValueOf` (`support.ts`), `registerPlayerValuePhrases` with `a player's {playervalue} is the total {attribute} of {cardgroup}` and its five conditions, `FORCE_GAME`.
  - T2: `CardFilter`'s `{ flag; wanted }`, `CARDCLAUSE`, `some card in {zones} is {cardflag}`, `no card in {zones} is {cardflag}`, `every card in {zone} is not {cardflag}`, the `which` phrases `a card in a/an {perzone} is {cardflag}`, `RESTING_GAME`; `worked-view.ts`'s `testNames`.
  - T3: `changeable` exported from `card-number-phrases.ts`; `its {attribute} are {int}` and `a card's {attribute} is at least {int}` (the last entry of `registerCardSubjectPhrases`); `GOES_UP_BY_TOTAL` exported and read by `cardOnlyNames`; `LINE_ABOUT` ending at ` goes up by `; `MEND_GAME`; the phrase-set test titled "are these 18".
  - T4: `Moment`'s join kind, `announceJoins`, `JOIN_GAME`.
  - T5: `ZoneSpec.onCards: 'every' | 'some'` and `holders`; `every card on it that is {cardflag} goes to {zone}`; `YARD_GAME`.
  - T6: `END_STEPS_KEY`, `EndParams.afterSteps`, `endStepsDone`, `END_STEPS_RULE`, `STEPS_GAME`, and `end-steps.test.ts`'s `table`/`round` helpers (local there; copy them).
  - T7: the expect `{player}'s {playervalue} is {int}`; P16 (`Press` carries the target card and its named zone, `buttonsFor` narrows by it, the patterns `{player} {cardaction} {cardlist} to {card} in {zone}` and `… from {zone} to {card} in {zone}`, `TWO_HIRES_GAME`); the README paragraph "Values about players, flags on groups, cards that join cards and steps before the score."
- **The language at HEAD:**
  - `worked-view.ts`: `CARD_ONLY`, `cardOnlyNames`, `readsOnlyCards`, `standIns`, `shownFlags`. `card-subject-phrases.ts`: `CARDS_ON_IT`, `FROM_COLUMN`, `registerCardSubjectPhrases`. `total-phrases.ts`: `FROM_CARDS_TOTAL`, `registerTotalPhrases`.
  - `declared-actions.ts`: `ontoOf`, `ontoPrompt`, `ontoCandidates`, `cardIn`, `aboutCards`. `declared-moves.ts`: `moveZoneId`, `yours`. `card-pick-phrases.ts`: `targetIs`, `fitsWording`, `buttonsFor`, `cardFor`, `pressesCardButton`.
  - `compile-phase.ts`: `PICK_ONTO`, `compileCardPick`, `oneZones`, `moveZone`, `reportHiddenCardReads`, `mayHideFromPresser`, `compileTrigger`, `aboutOf`, `isPhraseOf`, `TURN_STARTS`. `compile-util.ts`: `matchEffectLine`, `matchLine`, `canRead`, `libraryHasSayOn`. `refs.ts`: `theyForm`, `joinOr`. `phrases.ts`: `splitList`, `OR_SEPARATORS` (private).
  - `runtime.ts`: `triggerSubject`, `startTurn`, `who`. `build.ts`: `flowDefFor`, `EndParams`, `cardRules`. `turns.ts`: `TURN_OF_KEY`, `markTurnStarted`, `clearTurnOf`, `clearTurnMarkers`. `example-phrases.ts`: `turnIs`. `examples.ts`: the `markTurnStarted` call in `runExample`.
  - `queue-phrases.ts`: `dealUpTo`. `flow-phrases.ts`: `deal`, private `shuffleOne`. `board-state.ts`: `playersIn`, `isOut`, `markOut`. `attach.ts`: `cardsOn`, `holderIdOf`, `putOn`. `support.ts`: `cardsIn`, `passes`, `cardValueOf`, `cardNumber`, `cardHasFlag`, `theTargetCard`, `thePickedCards`, `cardsInZones`, `theyOf`. `fact-phrases.ts`: `itCard`. `zones.ts`: `zoneInfo`, `relocate`, `BOX_ZONE`.
  - `testing.ts`: `CREW_GAME`, `WORKED_GAME`, `SHOWN`, `TURN_GAME`, `ROUNDS_GAME`, `fixtureEnv`, `vocabFor`, `runPhrase`.

---

### Task 1: Counting, the kinds of a value, at least some cards, and a test of the card by any column

Before starting: re-check 4-1's T1–T3 names above at HEAD.

**Files:**
- Modify: `src/engine/core/lang/library/support.ts` (`numberOfCards`, `kindsAmong`).
- Modify: `src/engine/core/lang/library/total-phrases.ts` (`FROM_CARDS_COUNT`), `library/player-value-phrases.ts` (two values), `library/compare-phrases.ts` (one condition), `library/card-subject-phrases.ts` (two conditions).
- Modify: `src/engine/core/lang/worked-view.ts` (`cardOnlyNames`).
- Modify: `src/engine/core/lang/testing.ts` (`COUNT_GAME`).
- Test: `library/total-phrases.test.ts`, `library/player-value-phrases.test.ts`, `library/compare-phrases.test.ts`, `library/card-subject-phrases.test.ts`, `compile.test.ts`, `worked-view.test.ts` (changed lines: the phrase-set test's title and list).

**Interfaces:**
- Consumes: `cardsIn`, `cardValueOf`, `passes`, `cardsInZones`, `theyOf`, `canon`, `itCard`, 4-1's `PLAYERVALUE` and `testNames`.
- Produces (for Tasks 2, 7, 8 and plan 5-2):

```ts
// support.ts
export function numberOfCards(env: PhraseEnv, group: CardGroup): number;                 // cardsIn(env, group).length
export function kindsAmong(env: PhraseEnv, attribute: string, group: CardGroup): number; // distinct non-null values, read as cardValueOf
                                                                                          // reads them; text in any capitals (canon)
// total-phrases.ts
export const FROM_CARDS_COUNT = "a card's {attribute} is the number of {cardgroup}";     // value, needsCard
// player-value-phrases.ts — values, needsPlayer
"a player's {playervalue} is the number of {cardgroup}"
"a player's {playervalue} is the number of different {attribute} values among {cardgroup}"
// compare-phrases.ts — condition, needsPlayer: at least n of the cards in their zones pass the test
'they have at least {int} cards in {zones} whose {cardfilter}'
// card-subject-phrases.ts — conditions, needsCard, appended at the end of the chain in this order
'it is a card whose {cardfilter}'        // passes(env, itCard(env), [filter])
'it is not a card whose {cardfilter}'
```

- **`worked-view.ts`.** `cardOnlyNames` counts `FROM_CARDS_COUNT` as it counts `FROM_CARDS_TOTAL` (card-only only for an "on it" group, and only where cards on cards are public), and traces a `{cardfilter}` argument with `testNames`, as it traces a clause.
- **`testing.ts`:**

```ts
/** WORKED_GAME with counts: the cards on a job, the hands in a player's crew, the kinds of craft among their hands, and a gold hand. */
export const COUNT_GAME = [
  WORKED_GAME, '',
  'Crew size:', "  A card's crew size is the number of the cards on it.", '',
  'Hands at work:', "  A player's hands at work is the number of the cards in their crew.", '',
  'Craft kinds:', "  A player's craft kinds is the number of different craft values among the cards in their crew and their idle.", '',
  'Gilded:', '  Only if it is a card whose craft is gold.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.** All on a 3-player `COUNT_GAME` runtime; p0's workshop holds a Vase with a Potter and a Smith on it (`crew-p0`, by `putOn`), and p0's idle a Tinker and a Potter.
  - **Values** (`runtime.workedValue`, `runtime.playerValue`):
    - the Vase's `crew size` is 2, a Statue alone in p0's workshop 0;
    - p0's `hands at work` 2, p1's 0;
    - p0's `craft kinds` 3 (red, gold, mixed); with the Smith and the Tinker moved to the scrap, 1; p1's 0.
  - **Review Focus** (`player-value-phrases.test.ts`, through `runPhrase` about p0 with the runtime's `workedValue`):
    - `a player's craft kinds is the number of different craft values among the cards in their workshop` gives 0: jobs have no craft;
    - `a player's craft kinds is the number of different red work values among the cards in their crew` gives 2: the worked red work (1 for the Potter, 0 for the Smith) is read, and 0 is a value.
  - **Conditions** (`compare-phrases.test.ts`, about p0): `they have at least 2 cards in their crew and their idle whose wage is more than 0` holds (wages 1, 2, 0, 1); `… at least 4 cards …` does not; `… at least 0 cards …` holds about p1.
  - **The card subject** (`card-subject-phrases.test.ts`): `workedFlag` of `gilded` is true for the Smith and false for a Potter and for the Vase; `it is not a card whose craft is gold` is true for the Vase; `it is a card whose wage is more than 1` is true for the Smith only.
  - **Compiled** (`compile.test.ts`, `describe('counting cards')`):
    - `COUNT_GAME` compiles with `[]`; `game.worked` has `crew size` (number) and `gilded` (flag); `game.playerValues` has `hands at work` and `craft kinds`.
    - Under `Crew size:`, `  A card's crew size is the number of the cards in their crew.` gives `“A card's crew size is the number of the cards in their crew” only makes sense in a rule about a player's move.`
    - Under `Gilded:`, `  Only if it is a card whose crft is gold.` gives `There is no card attribute called “crft”.`
  - **The view** (`worked-view.test.ts`, `describe('counting the cards on it, and a test by any column')`):
    - `SHOWN` plus `Crew count:` / `  A card's crew count is the number of the cards on it.`, `Crowded:` / `  Only if its crew count is more than 1.` and `"  A crowded card's red pay is 2."` under Red pay: `shownFlags` includes `crowded`; the same with crews only their owner sees: it doesn't; with `the cards in the hall` for the group: it doesn't.
    - `SHOWN` plus `Needy:` / `  Only if it is a card whose red need is more than 1.` and `"  A needy card's red pay is 3."`: `shownFlags` includes `needy`; with `Hall red:` / `  A card's hall red is the total red need of the cards in the hall.` and `Needy:` reading `whose hall red is more than 1`, it doesn't.
    - **Changed lines:** the phrase-set test's title says `20`, and its list gains `'condition: it is a card whose {cardfilter}'` and `'condition: it is not a card whose {cardfilter}'` right after `"value: a card's {attribute} is at least {int}"`. `CARDS_ON_IT` is unchanged.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/total-phrases.test.ts src/engine/core/lang/library/player-value-phrases.test.ts src/engine/core/lang/library/compare-phrases.test.ts src/engine/core/lang/library/card-subject-phrases.test.ts src/engine/core/lang/compile.test.ts src/engine/core/lang/worked-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. A Startup or board-game line now read two ways is an `ambiguous` diagnostic: stop and report it.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/support.ts src/engine/core/lang/library/total-phrases.ts \
  src/engine/core/lang/library/player-value-phrases.ts src/engine/core/lang/library/compare-phrases.ts \
  src/engine/core/lang/library/card-subject-phrases.ts src/engine/core/lang/worked-view.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/library/total-phrases.test.ts src/engine/core/lang/library/player-value-phrases.test.ts \
  src/engine/core/lang/library/compare-phrases.test.ts src/engine/core/lang/library/card-subject-phrases.test.ts \
  src/engine/core/lang/compile.test.ts src/engine/core/lang/worked-view.test.ts
git commit -F - <<'EOF'
feat(lang): counting cards and the kinds of a value among them, at least some cards that pass a test, and a test of a card by any column

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: A card's numbers added and multiplied, what its owner has, and the card it is on

Before starting: re-check `LINE_ABOUT` (` goes up by `), Task 1's `COUNT_GAME` and the phrase-set test at 20.

**Files:**
- Modify: `src/engine/core/lang/library/card-subject-phrases.ts` (two values), `library/compare-phrases.ts` (two conditions), `library/attach-phrases.ts` (two conditions), `library/support.ts` (`ownerOf`).
- Modify: `src/engine/core/lang/testing.ts` (`BOOST_GAME`).
- Test: `library/card-value-phrases.test.ts`, `library/compare-phrases.test.ts`, `library/attach-phrases.test.ts`, `worked-view.test.ts` (changed lines: the phrase-set test's title and list).

**Interfaces:**
- Consumes: Task 1's `FROM_CARDS_COUNT`; `cardNumber`, `itCard`, `cardsInZones`, `passes`, `holderIdOf`, `zoneInfo`, `matchesCard`.
- Produces (for Task 7 and plan 5-2):

```ts
// card-subject-phrases.ts — values, needsCard, appended at the end of the chain in this order. Nothing so far stays nothing; a card
// without a number read says so through cardNumber, which a worked value takes as a line not about it.
"a card's {attribute} goes up by its {attribute}"                        // so far + its number
"a card's {attribute} goes up by its {attribute} times its {attribute}"   // so far + its two numbers multiplied
// support.ts
export function ownerOf(env: PhraseEnv, card: CardState): PlayerId | null;  // the seat of the per-player zone it is in; null otherwise
// compare-phrases.ts — conditions, needsCard; a card with no owner: “has a card” false, “has no card” true
'its owner has a card in their {perzone} {cardclause}'
'its owner has no card in their {perzone} {cardclause}'
// attach-phrases.ts — conditions, needsCard; a card on no card makes both false
'the card it is on is {cardclass}'
'the card it is on is not {cardclass}'
```

- **`testing.ts`:**

```ts
/**
 * WORKED_GAME where a gold hand on a job boosts it: a job's team red is the red work of the cards on it, plus its boosters (gold hands
 * on it) times its red makers (cards on it that make red); a card's polish is its pay plus its worth; a card is guarded while its owner
 * has a tired card in their idle; a card is high while the card it is on is a Statue.
 */
export const BOOST_GAME = [
  WORKED_GAME, '',
  'Boosters:', "  A card's boosters is the number of the cards on it whose craft is gold.", '',
  'Red makers:', "  A card's red makers is the number of the cards on it whose red work is more than 0.", '',
  'Team red:', "  A card's team red is the total red work of the cards on it.", "  A card's team red goes up by its boosters times its red makers.", '',
  'Polish:', "  A card's polish is its pay.", "  A card's polish goes up by its worth.", '',
  'Guarded:', '  Only if its owner has a card in their idle that is tired.', '',
  'High:', '  Only if the card it is on is a Statue card.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.** A 3-player `BOOST_GAME` runtime.
  - **Team red** (`card-value-phrases.test.ts`, `describe('a card's numbers added and multiplied')`):
    - a Vase with a Potter, a Tinker and a Smith on it: 4 (red work 1 + 1 + 0, plus 1 booster × 2 red makers);
    - a Vase with two Smiths and a Potter: 3;
    - a Vase with a tired Potter and a Smith: 0;
    - a Vase with nothing on it: 0.
  - **Polish:** a Vase 4, a Statue 6, a Potter 0 (neither line is about it).
  - **Nothing so far:** with `Pay:` / `  A card's pay goes up by its worth.` (a column with no line before), a hand's `pay` is null; with `  A card's pay goes up by its worth times its worth.`, a Vase's pay is 10.
  - **Owner** (`compare-phrases.test.ts`): a Vase in p0's workshop is `guarded` with a tired Potter in p0's idle, not with an untired one, not with the tired Potter in p1's idle; a Vase in the scrap is not. `its owner has no card in their idle that is tired` holds for the scrap's Vase and for the Vase in p0's workshop with the untired Potter.
  - **The card it is on** (`attach-phrases.test.ts`): a Potter on a Statue is `high`; on a Vase it is not; in p0's idle on nothing it is not, and `the card it is on is not a Statue card` is false there too; on a Vase it is true.
  - **The view** (`worked-view.test.ts`):
    - `SHOWN` with `  A card's red left goes up by its red done times its cut red done.` and `  A card's red left goes up by its red done.` after its two lines: `standIns` is still `{ 'red need': 'red left' }`.
    - Review Focus: `SHOWN` plus `  A watched card's red pay is 2.` with `Watched:` / `  Only if its owner has a card in their stash that is tired.`: `shownFlags` leaves `watched` out; with `Perched:` / `  Only if the card it is on is a Statue card.` and `  A perched card's red pay is 2.`: it leaves `perched` out.
    - **Changed lines:** the phrase-set test's title says `22`, and its list gains `"value: a card's {attribute} goes up by its {attribute}"` and `"value: a card's {attribute} goes up by its {attribute} times its {attribute}"` right after `'condition: it is not a card whose {cardfilter}'`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/card-value-phrases.test.ts src/engine/core/lang/library/compare-phrases.test.ts src/engine/core/lang/library/attach-phrases.test.ts src/engine/core/lang/worked-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/card-subject-phrases.ts src/engine/core/lang/library/compare-phrases.ts \
  src/engine/core/lang/library/attach-phrases.ts src/engine/core/lang/library/support.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/library/card-value-phrases.test.ts src/engine/core/lang/library/compare-phrases.test.ts \
  src/engine/core/lang/library/attach-phrases.test.ts src/engine/core/lang/worked-view.test.ts
git commit -F - <<'EOF'
feat(lang): values that add another of a card's numbers or the product of two, and tests of what its owner has and of the card it is on

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: A target card picked in several zones, tests and changes of it, and flags on the picked cards

Before starting: re-check 4-1's P16 (`Press`, `buttonsFor`, `pressesCardButton`, the `to {card} in {zone}` patterns, `TWO_HIRES_GAME`) and the `declared-actions.ts` names above.

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`CardPick.ontoAlso`), `phrases.ts` (export `OR_SEPARATORS`), `declared-moves.ts` (`ontoPlaces`).
- Modify: `src/engine/core/lang/compile-phase.ts` (`compileCardPick` reads several target zones; `reportHiddenCardReads` checks each).
- Modify: `src/engine/core/lang/declared-actions.ts` (`ontoPrompt`, `ontoCandidates`, `aboutCards`).
- Modify: `src/engine/core/lang/library/card-pick-phrases.ts` (P16's narrowing and `pressesCardButton` read every target zone; four conditions and five effects).
- Modify: `src/engine/core/lang/testing.ts` (`COACH_GAME`).
- Test: `compile-phase.test.ts`, `declared-actions.test.ts`, `library/card-pick-phrases.test.ts`.

**Interfaces:**
- Consumes: `theTargetCard`, `thePickedCards`, `cardsOn`, `cardHasFlag`, `changeable`, `mustBeKept`, `changeCard`, `joinOr`, `yours`, `splitList`, P16's narrowing.
- Produces (for Task 8 and plan 5-2):

```ts
// types.ts — CardPick gains:
//   ontoAlso?: { zone: ZoneRef; text: string }[];   // the zones after the first a target may be picked in, each as written; left out for one
// declared-moves.ts
export function ontoPlaces(pick: CardPick): { zone: ZoneRef; text: string }[];   // [] for no target; else onto first, then ontoAlso
// card-pick-phrases.ts — conditions, needsOnto
'the target card is {cardflag}'                 'the target card is not {cardflag}'
'some card on the target card is {cardflag}'    'no card on the target card is {cardflag}'
// card-pick-phrases.ts — effects
'the target card gains {int} {attribute}'       // needsOnto, writes 1, through changeable
'the target card is {cardflag}'                 // needsOnto, writes 0
'the target card is not {cardflag}'             // needsOnto, writes 0
'every picked card is {cardflag}'               // needsCards, writes 0
'every picked card is not {cardflag}'           // needsCards, writes 0
```

- **Reading the zones** (`compileCardPick`). An `ontoText` that is one zone is read as today. Otherwise it is split with `splitList` at `OR_SEPARATORS` into parts that are each a zone; with no such split, each part (cut at every separator) is read with `moveZone`, which reports what it can't read. Each part must be one zone (`ONE_ZONE`). `ontoText` keeps the first part's text.
- **Using them.** `ontoPrompt` says each zone with `yours` and joins them with `joinOr`. `ontoCandidates` offers the takeable cards of each zone in turn. `aboutCards` accepts a target in any of them. `reportHiddenCardReads` adds a place for each, with its own text. P16's narrowing keeps a button when any of its target zones holds a match; `pressesCardButton` takes the target from the zone the press names, else from the first of the button's zones, in the order written, that holds a match not taken, else today's fall-through.
- **`testing.ts`:**

```ts
/**
 * CREW_GAME where cards gather drills: a player may coach a card from their stash onto a card in their workshop, their crew or their
 * idle that is not tired, which gains a drill, or a gold drill if it is a Smith, as they choose, and is tired when a card on it is; and
 * may rouse hands from the hall onto a job no tired hand is on, waking them.
 */
export const COACH_GAME = CREW_GAME
  .replace('  Cards can be tired.', '  Cards can be tired.\n  Cards can have drills and gold drills.')
  .replace('  A player may stop.', [
    '  A player may coach a card from their stash to a card in their workshop, their crew or their idle.',
    '    Only if the target card is not tired.', '    Then:',
    '      If some card on the target card is tired, the target card is tired.',
    '      They choose one:', '        Plain:', '          The target card gains 1 drill.',
    '        Gold:', '          Only if the target card is a Smith.', '          The target card gains 1 gold drill.',
    '      Move it to the scrap.',
    '  A player may rouse some cards from the hall to a card in their workshop.',
    '    Only if no card on the target card is tired.', '    Then:',
    '      Every picked card is not tired.', '      The picked cards go to their crew, on the target card.',
    '  A player may stop.'].join('\n'));
```

- [ ] **Step 1: Write the failing tests.**
  - **Compiled** (`compile-phase.test.ts`, `describe('a target card in several zones')`):
    - `COACH_GAME` compiles with `[]`. The coach button's `pick` is `{ some: false, from: { of: { who: 'actor' }, zone: 'stash' }, fromText: 'their stash', to: null, onto: { of: { who: 'actor' }, zone: 'workshop' }, ontoText: 'their workshop', ontoAlso: [{ zone: { of: { who: 'actor' }, zone: 'crew' }, text: 'their crew' }, { zone: { of: { who: 'actor' }, zone: 'idle' }, text: 'their idle' }] }`.
    - (guard) `CREW_GAME`'s hire button's pick has no `ontoAlso` key.
    - `… to a card in their workshop or their crw.` gives `There is no zone called “crw”.` on the button's line.
    - Review Focus: `A player may coach a card from their stash to a card in their workshop or p1's stash.` with `    Only if the target card is not tired.` gives `This line would tell the player what the card is, though they can't see the cards in p1's stash. Check it in the Then: lines, after a reveal.` on the Only if line.
    - `      The target card gains 1 drill.` under `A player may stop.`'s `Then:` gives `“The target card gains 1 drill” only makes sense in a button that picks a card and the card it goes to, like “A player may stack a card from their hand to a card in the row.”`; `      Every picked card is not tired.` under `A player may start a card in their stash.`'s `Then:` gives `“Every picked card is not tired” only makes sense in a button that picks some cards, like “A player may discard some cards from their hand.”`
    - `WORKED_GAME` with `  A player may coach a card from their stash to a card in their workshop.` / `    Then:` / `      The target card gains 1 red work.` before `  A player may stop.` gives `“red work” is worked out from its lines, so no rule can change it.`
  - **Offered and pressed** (`declared-actions.test.ts`), a 2-player `COACH_GAME` engine, p0 to act, with a Statue in p0's stash, a Vase in p0's workshop with a Potter on it (`crew-p0`), and a Smith in p0's idle:
    - `ontoPrompt(coach)` is `Pick where it goes: a card in your workshop, your crew or your idle.`;
    - `ontoCandidates(runtime, coach, state, 'p0')` is `[vase, potter, smith]`;
    - coaching the Statue onto the Potter (Gold is refused for a Potter, so Plain is filled in) gives the Potter 1 drill and puts the Statue in the scrap;
    - onto a card in the hall it is refused with the prompt above; onto a tired Smith with `the target card is not tired`;
    - onto the Vase with a tired Potter on it: the Vase gains 1 drill and is tired.
  - **The phrases** (`card-pick-phrases.test.ts`, `describe('the target card and the picked cards')`, through `runPhrase` with `subject.onto` or `subject.cards`): each condition holds each way; `the target card is not tired` clears the key; `every picked card is tired` sets it on each picked card and on no other; `the target card gains 1 wage` throws `Only a number the game keeps on cards can change, like “Cards can have charges.”; wage isn't one.`
  - **Rousing:** two tired Potters roused from the hall onto a Vase: both in `crew-p0` on it, neither tired; onto a Vase a tired hand is on: refused with `no card on the target card is tired`.
  - **Examples** (`card-pick-phrases.test.ts`, through `runExamples` on `COACH_GAME` with these appended), each passing:

```text
Example: a target in the last of three zones, with the choice it asks
  Given p0's stash has a Statue
  And p0's idle has a Smith
  When p0 coaches the Statue to the Smith, choosing gold
  Then the Smith in p0's idle has 1 gold drill

Example: Review Focus: the first zone written that holds the target, unless the press names another
  Given p0's stash has a Statue and a Vase
  And p0's workshop has a Vase
  And the Vase in p0's workshop has a Potter on it
  And p0's idle has a Potter
  When p0 coaches the Statue to the Potter
  Then the Potter in p0's crew has 1 drill
  When p0 coaches the Vase to the Potter in p0's idle
  Then the Potter in p0's idle has 1 drill
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/library/card-pick-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`. Startup's three "asks an example which … it means" tests and 4-1's `TWO_HIRES_GAME` tests pass unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/phrases.ts src/engine/core/lang/declared-moves.ts \
  src/engine/core/lang/compile-phase.ts src/engine/core/lang/declared-actions.ts src/engine/core/lang/library/card-pick-phrases.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/declared-actions.test.ts \
  src/engine/core/lang/library/card-pick-phrases.test.ts
git commit -F - <<'EOF'
feat(lang): a button's target card picked in any of several zones, tests and changes of the target card, and flags on the picked cards

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: A deal that shuffles a discard back in, and a number given to a group or to its first few cards

Before starting: re-check `dealUpTo`, `deal`, `shuffleOne` and 4-1's `changeable`.

**Files:**
- Modify: `src/engine/core/lang/library/flow-phrases.ts` (export `shuffleOne`, unchanged in behaviour).
- Modify: `src/engine/core/lang/library/queue-phrases.ts` (one effect), `library/card-number-phrases.ts` (two effects).
- Modify: `src/engine/core/lang/testing.ts` (`RESHUFFLE_GAME`, `DRILL_GAME`).
- Test: `library/queue-phrases.test.ts`, `library/card-number-phrases.test.ts`.

**Interfaces:**
- Consumes: `deal`'s refusal of a negative number, `soleZone`, `resolveZoneIds`, `relocate`, `cardsIn`, `cardNumber`, `itCard`, `changeable`, `changeCard`.
- Produces (for plan 5-2, and slice 6's Event deck):

```ts
// flow-phrases.ts
export function shuffleOne(state: GameState, zoneId: string): GameState;
// queue-phrases.ts — effect: to each zone in turn, one card at a time from the top; when the deck is empty and the discard is not, every
// card of the discard goes to the deck, which is shuffled; it stops at the number or when both are empty
'deal up to {int} card(s) from {zone} to {zone}, shuffling {zone} into it when it runs out'
// card-number-phrases.ts — effects
'{cardgroup} gain {int} {attribute}'                                                // writes 2: each card of the group gains n
'up to its {attribute} of {cardgroup} gain {int} {attribute}, first card first'    // needsCard, writes 3: the first (its number) cards
                                                                                   // of the group, in its order, each gain n
```

- **`testing.ts`:**

```ts
/** TURN_GAME where a player may gather 3 cards from the pile to their list, shuffling the done pile back into the pile when it runs out. */
export const RESHUFFLE_GAME = TURN_GAME.replace('  A player may stop.', ['  A player may gather.', '    Then:',
  '      Deal up to 3 cards from the pile to their list, shuffling the done pile into it when it runs out.', '  A player may stop.'].join('\n'));

/**
 * CREW_GAME where jobs gather cracks and cards drills: drilling a job gives each tired card on it a drill, and tutoring one gives a drill
 * to as many of the cards on it that are not tired as it has cracks, first card first.
 */
export const DRILL_GAME = CREW_GAME
  .replace('  Cards can be tired.', '  Cards can be tired.\n  Cards can have drills and cracks.')
  .replace('  A player may stop.', [
    '  A player may drill a card in their workshop.', '    Then:', '      The cards on it that are tired gain 1 drill.',
    '  A player may tutor a card in their workshop.', '    Then:',
    '      Up to its cracks of the cards on it that are not tired gain 1 drill, first card first.',
    '  A player may stop.'].join('\n'));
```

- [ ] **Step 1: Write the failing tests.**
  - **The deal** (`queue-phrases.test.ts`, `describe('a deal that shuffles a discard back in')`, through `runPhrase` about p0 on `RESHUFFLE_GAME`; arrange the pile and the done pile, the rest boxed):
    - pile 1, done pile 4: p0's list holds 3, the pile's card at slot 0; the pile holds 2 and the done pile none; every card in the pile is face down; `state.rng` changed;
    - Review Focus: pile 5, done pile 3: the list holds 3, the pile 2, the done pile 3, and `state.rng` equals the one before;
    - Review Focus: pile 3, done pile 2: the list holds 3, the done pile 2, `rng` unchanged (the deck ran out exactly);
    - Review Focus: pile 0, done pile 0: nothing moves, and no error;
    - pile 0, done pile 2: the list holds 2;
    - `deal up to -1 cards …` throws `A negative number of cards cannot be dealt.`;
    - **replay:** on a 2-player engine, after p0 gathers with pile 1 and done pile 4, a fresh engine given `loadLog(engine.getLog())` equals the engine's state.
  - **The group** (`card-number-phrases.test.ts`, `describe('a number given to a group, or to its first few')`, a 2-player `DRILL_GAME` runtime; a Vase in p0's workshop with a Potter, a Smith and a Tinker on it, in that order):
    - with the Potter and the Tinker tired, `the cards on it that are tired gain 1 drill` about the Vase gives them 1 drill each and the Smith none;
    - with none tired and the Vase at 2 cracks, `up to its cracks of …` gives the Potter and the Smith 1 each and the Tinker none;
    - Review Focus: at 0 cracks (no key) none gains; at 9, all three gain 1 and no more; with the Potter tired and 1 crack, the Smith gains and the Potter uses none of it;
    - `the cards on it gain 1 wage` throws `Only a number the game keeps on cards can change, like “Cards can have charges.”; wage isn't one.`;
    - `      The cards on it gain 1 red work.` under `WORKED_GAME`'s finish `Then:` gives `“red work” is worked out from its lines, so no rule can change it.`
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/queue-phrases.test.ts src/engine/core/lang/library/card-number-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/flow-phrases.ts src/engine/core/lang/library/queue-phrases.ts \
  src/engine/core/lang/library/card-number-phrases.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/library/queue-phrases.test.ts src/engine/core/lang/library/card-number-phrases.test.ts
git commit -F - <<'EOF'
feat(lang): a deal that shuffles a discard back into its deck when it runs out, and a number given to a group of cards or to its first few

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: Rules about a player, asked in turn from the player whose turn last started, with any condition said of one player

Before starting: re-check `triggerSubject`, `startTurn`, `compileTrigger`, `aboutOf`, `TURN_STARTS`, `turnIs` and `markTurnStarted`.

**Files:**
- Modify: `src/engine/core/lang/turns.ts` (`LAST_TURN_KEY`, `PLAYER_FRAME`, `playersInTurnOrder`, `isPlayerRule`; `markTurnStarted` and `clearTurnMarkers`).
- Modify: `src/engine/core/lang/runtime.ts` (`startTurn`, `triggerSubject`).
- Modify: `src/engine/core/lang/compile-phase.ts` (`compileTrigger` reads the frame; `aboutOf`).
- Modify: `src/engine/core/lang/library/example-phrases.ts` (`turnIs`).
- Modify: `src/engine/core/lang/testing.ts` (`CLAIM_GAME`).
- Test: `src/engine/core/lang/player-rules.test.ts` (new).

**Interfaces:**
- Consumes: `playersIn`, `theyForm`, `canRead`, `libraryHasSayOn`, `matchLine`.
- Produces (for Task 6 and plan 5-2):

```ts
// turns.ts
/** The seat whose turn last started. Unlike TURN_OF_KEY it stays when the turn passes, so a rule can still ask whose turn ended the round. */
export const LAST_TURN_KEY = 'lang:last-turn';
/** The compiler's frame for `When a player <words>:` that no phrase reads: args [the condition about “they”]. */
export const PLAYER_FRAME = 'a player';
/** Every seat still in, in turn order from LAST_TURN_KEY's seat; seat order when it is absent or no seat; an out seat is left out. */
export function playersInTurnOrder(state: GameState, seats: PlayerId[]): PlayerId[];
/** Whether a rule's When is about a player: a `who` phrase, or the frame. */
export function isPlayerRule(when: PhraseRef): boolean;
```

- **The last turn.** `startTurn` sets `LAST_TURN_KEY` beside `TURN_OF_KEY`; so do `markTurnStarted` and the Given `it is {player}'s turn` (where it sets `TURN_OF_KEY`). `clearTurnOf` keeps it; `clearTurnMarkers` drops it.
- **The frame** (`compileTrigger`). When neither a condition (with the context today's line uses), a `who` nor a `which` phrase can read the When text, and it matches `/^a player(['‘’]s)? (.+)$/i`: the condition text is `their <rest>` for the possessive, else `they ${theyForm(rest)}`. When `libraryHasSayOn('condition', text, { ...ctx, player: true })`, the When is `{ kind: 'lang', phrase: PLAYER_FRAME, args: [matchLine('condition', text, line, { ...ctx, player: true })], line, text: <the When text> }`, and its diagnostics are the frame's. Otherwise the line is read as today. `aboutOf` treats the frame as about a player.
- **Asking** (`triggerSubject`). For a rule where `isPlayerRule(when)`: the candidates are `playersInTurnOrder(state, seats)`, kept when the `who` phrase picked them, or for the frame when its condition holds about them; the rule is about the first whose `Only if` groups hold.
- **`testing.ts`:**

```ts
/**
 * ROUNDS_GAME where players can be ready and crowned: a player may ready everyone, and a rule for every phase crowns a ready player
 * while no player is crowned, asked in turn from the player whose turn last started.
 */
export const CLAIM_GAME = ROUNDS_GAME
  .replace('  Players pay with coins.', '  Players pay with coins.\n  Players can be ready.\n  Players can be crowned.')
  .replace('\nPhase: working', ['  When a player is ready:', '    Only if no player is crowned.', '    They are crowned.', '',
    'Phase: working'].join('\n'))
  .replace('  A player may stop.', '  A player may ready everyone.\n    Then:\n      Every player is ready.\n  A player may stop.');
```

- [ ] **Step 1: Write the failing tests** in `player-rules.test.ts`.
  - **`playersInTurnOrder`**, seats `['p0', 'p1', 'p2']`: `LAST_TURN_KEY` `'p1'` gives `['p1', 'p2', 'p0']`; no key gives `['p0', 'p1', 'p2']`; `'p5'` gives seat order; Review Focus: `'p1'` with p1 marked out (`markOut`) gives `['p2', 'p0']`.
  - **The last turn:** after a 3-player `CLAIM_GAME` engine (p0 the start player) has p0 and p1 each press `stop`, `data[LAST_TURN_KEY]` is `'p2'`; after p2's `stop` it is `'p0'` (the next round's first turn has started). `the turn passes to the left`, run through `runPhrase` on a state with `LAST_TURN_KEY` `'p2'` and `TURN_OF_KEY` `'p2'`, drops `TURN_OF_KEY` and keeps `LAST_TURN_KEY` `'p2'`. `clearTurnMarkers` drops it.
  - **Ordering** (`runExamples` on `CLAIM_GAME` with these appended; before this task the first gives p0):

```text
Example: the player whose turn it is is asked first
  Given 3 players
  And it is p2's turn
  When p2 readies everyone
  Then p2 is crowned
  And p0 is not crowned

Example: then the players after them, in turn
  Given 3 players
  And it is p1's turn
  When p1 readies everyone
  Then p1 is crowned
```

  - **The frame:**
    - `CLAIM_GAME` with the rule's line `  When a player has at least 3 coins:` compiles with `[]`; the rule's `when` has `kind: 'lang'`, `phrase: PLAYER_FRAME`, and its condition's phrase is `they have at least {int} {counter}` with args `[3, 'coins']`. With these Givens, `Then p2 is crowned` passes: `Given 3 players`, `And p0 has 3 coins`, `And p2 has 5 coins`, `And it is p1's turn` (seat order would crown p0).
    - With `  When a player's list has fewer than 2 cards:`, the condition's phrase is `{zone} has fewer than {int} cards`, and `Given 3 players`, `And it is p2's turn`, `Then p2 is crowned` passes.
    - `  When a player has at least 3 coinz:` gives `There is no counter called “coinz”.` on its line.
    - (guard) `  When a player sneezes:` gives `“a player sneezes” isn't in the phrase library yet.`
    - (guard) Rent Day (`@/games/rent-day.rules?raw`) compiles with `[]`, and its `When a player has 3 jail turns:` and `When a player is the high bidder:` rules keep `when.kind === 'who'`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/player-rules.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** it, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. Rent Day keeps its 108 examples; `runtime.test.ts`'s turn and round tests pass unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/turns.ts src/engine/core/lang/runtime.ts src/engine/core/lang/compile-phase.ts \
  src/engine/core/lang/library/example-phrases.ts src/engine/core/lang/testing.ts src/engine/core/lang/player-rules.test.ts
git commit -F - <<'EOF'
feat(lang): rules about a player ask in turn from the player whose turn last started, and take any condition said of one player

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 6: The End waits for rules for every phase about a player, and an If line tests two conditions

Before starting: re-check `flowDefFor`, `EndParams` (with 4-1's `afterSteps`), `STEPS_GAME`, `end-steps.test.ts`'s helpers, `matchEffectLine` and Task 5's `isPlayerRule`.

**Files:**
- Modify: `src/engine/core/lang/build.ts` (End's rules; the comment that says rules about a player never hold End back).
- Modify: `src/engine/core/lang/compile-util.ts` (`matchEffectLine`'s If frame).
- Test: `src/engine/core/lang/player-rules.test.ts` (append), `src/engine/core/lang/compile-util.test.ts` (append).

**Interfaces:**
- Consumes: Task 5's `isPlayerRule`, `CLAIM_GAME`, `LAST_TURN_KEY`; 4-1's `STEPS_GAME`, `END_STEPS_KEY`; `canRead`, `matchLine`.
- Produces (for plan 5-2):
  - **`flowDefFor`.** End's rules are every rule about a card, plus every rule for every phase (`phase: null`) where `isPlayerRule(trigger.when)`. Both End predicates (`afterSteps` or not) wait for them. A game with neither keeps the `FlowDef` it has.
  - **`If <a> and <b>, <effect>`.** When the words before the If's comma read as no condition, they are cut at each ` and ` in turn; the first cut where both halves read as conditions gives `{ kind: 'lang', phrase: 'all', args: [a, b], line, text }`, which `runtime.test` already reads. The comma is chosen as today, with such a pair counting as a condition. With neither, the whole is reported as today.
- [ ] **Step 1: Write the failing tests.**
  - **The End** (`player-rules.test.ts`, `describe('the End waits for rules about a player')`):
    - `CLAIM_GAME` with ready's `Then:` also `      Move the pile to the done pile.` (End: the pile is empty), and this example appended, passes (before this task the game ends and nobody is crowned):

```text
Example: a claim met by the move that ends the game is made before the score
  Given 3 players
  And it is p1's turn
  When p1 readies everyone
  Then the game is over
  And p1 is crowned
```

    - `flowDefFor(CLAIM_GAME, seatsFor(3))`'s End is `lang:end-when` whose `rules` hold the crown rule with `phase: null`.
    - (guard) `ROUNDS_GAME`'s End is `[{ when: { name: 'lang:cond', params: <its when> }, result: 'lang:result' }]`; `CLAIM_GAME` with the crown rule moved under `Phase: working` has that End too; Hearts' and Rent Day's `FlowDef`s have no End param with a rule about a player.
    - **Review Focus, with the steps before the score.** `STEPS_GAME` with `  Players can be ready.`, `  Players can be counting.` and `  Players can be crowned.`; the final count's start line also `    They are counting.`; count's `Then:` also `      They are not counting.` and `      They are ready.` before the pass; and for every phase `  When a player is ready:` / `    Only if no player is counting.` / `    Only if no player is crowned.` / `    They are crowned.` On the 3-player `table` (p0 the start player):
      - after `round`, then p0's and p1's counts: no one is crowned and there is no result;
      - after p2's count: p2 is crowned (the seat whose turn ended the round; seat order would give p0), there is a result, and `END_STEPS_KEY` is `true`;
      - a fresh `table` given `loadLog(engine.getLog())` equals the engine's state.
  - **Two conditions** (`compile-util.test.ts`, `describe('an If line with two conditions')`), on `CREW_GAME` with `      If it is a Vase card and the scrap is empty, they get 1 coin.` before finish's `Move it to the scrap.`:
    - it compiles with `[]`; the line's ref is `if` whose condition is `{ kind: 'lang', phrase: 'all' }` with the phrases `it is {cardclass}` and `{zone} is empty`;
    - on a 2-player engine, finishing a Vase with the scrap empty gives p0 10 coins; with a card in the scrap, 9; finishing a Statue with the scrap empty, 9;
    - (guard) `      If they have a card in their workshop and their idle whose wage is more than 1, they get 1 coin.` reads its condition whole: `they have a card in {zones} whose {cardfilter}`;
    - `      If it is a Vsae card and the scrap is empty, they get 1 coin.` gives one diagnostic, on its own line.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/player-rules.test.ts src/engine/core/lang/compile-util.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. `end-steps.test.ts` and `runtime.test.ts`'s End tests pass unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/build.ts src/engine/core/lang/compile-util.ts src/engine/core/lang/player-rules.test.ts \
  src/engine/core/lang/compile-util.test.ts
git commit -F - <<'EOF'
feat(lang): the game waits for rules for every phase about a player before it is scored, and an If line can test two conditions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 7: The graduation step's pieces: a flag for some cards on a card, and a step of per-card choices played through

Before starting: re-check 4-1's `a card in an {perzone} is {cardflag}`, `no card in {zones} is {cardflag}`, `every card in {zone} is not {cardflag}` and `its {attribute} are {int}`, Task 2's `goes up by its`, and `the {phase} phase starts with them` / `go back to the interrupted turn`.

**Files:**
- Modify: `src/engine/core/lang/library/attach-phrases.ts` (one effect).
- Modify: `src/engine/core/lang/testing.ts` (`SORT_GAME`).
- Test: `library/attach-phrases.test.ts`, `examples.test.ts` (append).

**Interfaces:**
- Consumes: `cardsOn`, `cardHasFlag`, `mustBeKept`, `changeCard`; the pieces listed above.
- Produces (for plan 5-2): effect `every card on it that is {cardflag} is {cardflag}` (`needsCard`, `writes: 1`). It sets the second flag on each card on it that is so, read as `cardHasFlag` reads it, and on no other.
- **`testing.ts`** (R2's step in general words: two marks are a hand's waiting pair, stars its kept ones, `help` the extra keep a helper gives):

```ts
/**
 * CREW_GAME where finishing a job starts a sorting step for its hands: a hand with one mark keeps it as a star with no press, a hand with
 * two keeps the one its owner picks, and an untired Smith on the job lets one sorted hand keep its other mark too; then every mark goes.
 * A Tinker on a finished job turns keen.
 */
export const SORT_GAME = [CREW_GAME
  .replace('  Players pay with coins.', '  Players pay with coins.\n  Players can have help.')
  .replace('  Cards can be tired.', ['  Cards can be tired.', '  Cards can be sorted.', '  Cards can be keen.',
    '  Cards can have red marks, gold marks, red stars and gold stars.'].join('\n'))
  .replace('      Every card on it is tired.\n', ['      If some card on it is helping, they gain 1 help.',
    '      Every card on it that is eager is keen.', '      Every card on it is tired.', ''].join('\n'))
  .replace('      Move it to the scrap.\n', '      Move it to the scrap.\n      The sorting phase starts with them.\n')
  .replace('\nEnd:', ['', 'Phase: sorting', '  Players take turns.', '  Hint: Keep one mark on each hand that has two.',
    '  When a card in an idle is single:', '    If its red marks are 1, it gains 1 red star.', '    If its gold marks are 1, it gains 1 gold star.',
    '    It loses its red marks.', '    It loses its gold marks.', '    It is sorted.',
    '  A player may keep red on a card in their idle.', '    Only if it is torn.', '    Only if its red marks are 1.', '    Then:',
    '      It gains 1 red star.', '      It loses its red marks.', '      It is sorted.',
    '  A player may keep gold on a card in their idle.', '    Only if it is torn.', '    Only if its gold marks are 1.', '    Then:',
    '      It gains 1 gold star.', '      It loses its gold marks.', '      It is sorted.',
    '  A player may help a card in their idle.', '    Only if they have 1 help.', '    Only if it is helpable.', '    Then:',
    '      They choose one:', '        Red:', '          Only if its red marks are 1.', '          It gains 1 red star.',
    '        Gold:', '          Only if its gold marks are 1.', '          It gains 1 gold star.', '      Their help go back to 0.',
    '  When no card in their idle is torn:', '    Only if one of:', '      They have 0 help.', '      No card in their idle is helpable.',
    '    Every card in their idle is not sorted.', '    For each card in their idle, it loses its red marks.',
    '    For each card in their idle, it loses its gold marks.', '    Their help go back to 0.', '    Go back to the interrupted turn.', '',
    'End:'].join('\n')), '',
  'Marks:', "  A card's marks is its red marks.", "  A card's marks goes up by its gold marks.", '',
  'Single:', '  Only if its marks is 1.', '  Only if it is not sorted.', '',
  'Torn:', '  Only if its marks is more than 1.', '  Only if it is not sorted.', '',
  'Helpable:', '  Only if it is sorted.', '  Only if its marks is more than 0.', '',
  'Helping:', '  Only if it is a Smith card.', '  Only if it is not tired.', '',
  'Eager:', '  Only if it is a Tinker card.',
].join('\n');
```

  Each `.replace` must find its text in `CREW_GAME` (assert it in the test); adjust the anchors, not the lines, if one doesn't.
- [ ] **Step 1: Write the failing tests.**
  - **The effect** (`attach-phrases.test.ts`): on `SORT_GAME`, `every card on it that is eager is keen` about a Vase with a Tinker and a Potter on it makes the Tinker keen and not the Potter; `      Every card on it that is eager is helping.` under a `Then:` gives `“helping” is worked out from its lines, so no rule can change it.`
  - **Compiled:** `SORT_GAME` compiles with `[]`; the `keep red on a card in their idle` button has `base` `'keep red on'`, `target` null, and `pick` `{ some: false, from: { of: { who: 'actor' }, zone: 'idle' }, fromText: 'their idle', to: null, onto: null, ontoText: null }`.
  - **The step** (`examples.test.ts`, `describe('a step of choices for each card')`): `SORT_GAME` with these appended passes `runExamples`:

```text
Example: a hand with one mark keeps it with no press, and the step closes by itself
  Given p0's workshop has a Vase
  And the Vase in p0's workshop has a Potter on it
  And the Potter in p0's crew has 1 red mark
  When p0 finishes the Vase
  Then the phase is working
  And the Potter in p0's idle has 1 red star
  And the Potter in p0's idle has 0 red marks
  And the Potter in p0's idle is not sorted

Example: a hand with two marks keeps the one picked and loses the other
  Given p0's workshop has a Vase
  And the Vase in p0's workshop has a Potter on it
  And the Potter in p0's crew has 1 red mark
  And the Potter in p0's crew has 1 gold mark
  When p0 finishes the Vase
  Then the phase is sorting
  When p0 keeps gold on the Potter
  Then the phase is working
  And the Potter in p0's idle has 1 gold star
  And the Potter in p0's idle has 0 red stars
  And the Potter in p0's idle has 0 red marks

Example: an untired Smith helps one sorted hand keep its other mark, the one colour left filled in
  Given p0's workshop has a Vase
  And the Vase in p0's workshop has a Potter and a Smith on it
  And the Potter in p0's crew has 1 red mark
  And the Potter in p0's crew has 1 gold mark
  When p0 finishes the Vase
  And p0 keeps red on the Potter
  Then the phase is sorting
  When p0 helps the Potter
  Then the phase is working
  And the Potter in p0's idle has 1 red star
  And the Potter in p0's idle has 1 gold star
  And p0 has 0 help

Example: only the finished job's hands are sorted, and an eager Tinker on it turns keen
  Given p0's workshop has a Vase and a Statue
  And the Vase in p0's workshop has a Potter on it
  And the Statue in p0's workshop has a Tinker on it
  And the Potter in p0's crew has 1 red mark
  And the Potter in p0's crew has 1 gold mark
  And the Tinker in p0's crew has 1 red mark
  When p0 finishes the Statue
  Then the Tinker in p0's idle has 1 red star
  And the Tinker in p0's idle is keen
  And the phase is working
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/attach-phrases.test.ts src/engine/core/lang/examples.test.ts`. Expected: FAIL (the new effect).
- [ ] **Step 3: Implement** the effect. If an example fails for want of something other than it, stop and report which line: that is a missing piece of the step, to be planned, not worked round.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/attach-phrases.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/library/attach-phrases.test.ts src/engine/core/lang/examples.test.ts
git commit -F - <<'EOF'
feat(lang): a flag set on the cards on a card that are so, and a step of choices for each card played through with the existing pieces

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 8: An example for each piece, the README, and the checks

**Files:**
- Test: `src/engine/core/lang/examples.test.ts` (append).
- Modify: `README.md` (a paragraph after 4-1's "Values about players, flags on groups, cards that join cards and steps before the score.").

**Interfaces:**
- Consumes: every fixture above, `runExamples`, 4-1's `{player}'s {playervalue} is {int}`.
- Produces: no phrase (see the Architecture's last call).

- [ ] **Step 1: Write the tests.** In `examples.test.ts`, `describe('the words for slice 5's pieces')`, each fixture with its example appended passes `runExamples`. Tasks 3, 5, 6 and 7 hold the examples of targets, claims and the step.
  - **`COUNT_GAME`:**

```text
Example: counting hands and the kinds of craft among them
  Given p0's workshop has a Vase
  And the Vase in p0's workshop has a Potter and a Smith on it
  And p0's idle has a Tinker
  Then the Vase in p0's workshop has 2 crew size
  And p0's hands at work is 2
  And p0's craft kinds is 3
  And the Smith in p0's crew is gilded
```

  - **`BOOST_GAME`:**

```text
Example: a gold hand on a job adds 1 red for each card on it that makes red
  Given p0's workshop has a Vase
  And the Vase in p0's workshop has a Potter, a Tinker and a Smith on it
  Then the Vase in p0's workshop has 4 team red
  And the Vase in p0's workshop has 4 polish
```

  - **`RESHUFFLE_GAME`:**

```text
Example: gathering past the end of the pile shuffles the done pile back in
  Given it is p0's turn
  And the pile has a Sweep
  And the done pile has a Dust and a Dust
  When p0 gathers
  Then p0's list has 3 cards
  And the done pile is empty
```

  - **`DRILL_GAME`:**

```text
Example: tutoring a job with 1 crack drills only its first card that is not tired
  Given p0's workshop has a Vase
  And the Vase in p0's workshop has a Potter and a Smith on it
  And the Vase in p0's workshop has 1 crack
  When p0 tutors the Vase
  Then the Potter in p0's crew has 1 drill
  And the Smith in p0's crew has 0 drills
```

  - **A failing example:** `COUNT_GAME` with `Then p0's craft kinds is 9` fails with `Expected p0's craft kinds to be 9, but it is 3.` on that line.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/examples.test.ts`. Expected: PASS (no new phrase; if one fails, stop and report it).
- [ ] **Step 3: Write the README paragraph**, **"Counting, targets in several zones, decks that shuffle back, and rules about a player."**, in fixture words (plan 5-2 may swap in Startup's lines), one bullet each:
  - counting: `A card's crew size is the number of the cards on it.`, `A player's craft kinds is the number of different craft values among …`, `they have at least 2 cards in … whose …`, and `it is a card whose craft is gold`;
  - a card's numbers: `… goes up by its worth.` and `… goes up by its boosters times its red makers.`;
  - beyond the card: `its owner has a card in their idle that is tired` and `the card it is on is a Statue card`, which the playtest never shows on a face;
  - a target in several zones (`… to a card in their workshop, their crew or their idle.`), offered zone by zone; `the target card is …`, `some card on the target card is …`, `The target card gains 1 drill.`, `Every picked card is not tired.`; an example's `… to the Potter in p0's idle`;
  - `Deal up to 3 cards from the pile to their list, shuffling the done pile into it when it runs out.`;
  - `The cards on it that are tired gain 1 drill.` and `Up to its cracks of the cards on it that are not tired gain 1 drill, first card first.`;
  - rules about a player ask in turn from the player whose turn last started (seat order where no turn has started); `When a player has at least 3 coins:` and `When a player's list …:` take any condition said of one player; the game waits for such rules in `In every phase:` before it is scored; `If it is a Vase card and the scrap is empty, …`;
  - `Every card on it that is eager is keen.`, and a step of per-card choices written with existing lines (the sorting step).
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 5: Run the checks.** Each must print nothing, except where noted.

```bash
# Startup Simulator's words in shared code, slices 3, 4 and 5 included, tests included
git diff "$BASE" -- src/engine src/pages src/utils | grep '^+[^+]' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share|tags?|leads?|leading|licen[cs]es?|tiers?|stall(s|ed|ing)?|sectors?|expertise|modes?|bandwidths?|bugs?|qa|online|offline|maint(enance)?|suppl(y|ies)|demands?|xp|pending|skills?|badges?|badged|ranks?|mentor(s|ed|ing)?|synerg(y|ies)|agile|graduat(e|es|ed|ing|ion)|training|trained|brainstorm(s|ed|ing)?|strateg(y|ies)|milestones?|seniors?)\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# existing test lines removed or changed: only the phrase-set test's
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
# nothing outside the language
git diff --stat "$BASE" -- src/games src/pages
```

  The fourth check prints exactly the phrase-set test's old title line and the list lines Tasks 1 and 2 replaced in `worked-view.test.ts`. Also read the `+` lines of `src/engine` for "source" in the game sense.
- [ ] **Step 6: Run the games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples. `bunx vitest run src/games/startup-simulator.test.ts` passes with BASE's example count.
- [ ] **Step 7: Commit**

```bash
git add src/engine/core/lang/examples.test.ts README.md
git commit -F - <<'EOF'
feat(lang): an example for each of slice 5's pieces, and the README describes counting, targets in several zones, decks that shuffle back and rules about a player

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Left to 5-2 / 5-3

**Plan 5-2 (rules text and long runs)** writes, with this plan's pieces:
- the `role` column (`Junior`) on the three University stacks; the counts and flags (R5); the worked `xp`, `skills`, `pending tokens`, `human capital` (`goes up by its`), outputs with XP, the salary bump, Rainmaker's rev bonus, bug decay with owner scope, the Bug Hunter's QA output (R9), Synergy's counts and products, Agile, and the Pending Badge (`the card it is on is not a Tier 1 card`) (R8);
- Pending XP: `For each card in their development whose blue team output is more than 0, the cards on it that are … gain 1 pending blue.` and Green with `up to its bugs of …, first card first` (R7); Pivot's and firing's stripping (R4);
- Launch: the Mentor's `they gain 1 mentoring`, `Every card on it that is … is badged.` behind `If it is not a Tier 1 card, …`, the graduation phase and its buttons (Task 7's shape), First Mover and Clean Launch with `If … and …` (R1, R2);
- Agile in assign and reassign (`no card on the target card is …` before the move; `Every picked card is not onboarding.`) (R8);
- the Strategy deck, hand and discard, Brainstorm's two buttons with the reshuffling deal (2 or 3 by `some card in … is …`), its private row and interrupt, and the strategy cleanup phase (R10);
- the five Training buttons with several target zones, the price guard, `the target card is …` through worked flags, and the move to the discard (R6);
- the Milestones: deck, reveal of 3, `milestones` rows, Revenue Leader with `If … and …`, the position claims as `When a player …:` rules in `In every phase:` with the "choosing offline products" guard set and cleared in the ops check and the final check, and the score lines (`… scores its vp`; Human Capital as three lines, one per zone) (R1);
- every example R11 lists, the long runs, the auto-player and the invariants.

**Plan 5-3 (the page):**
- faces with XP by colour, Skill tokens, Pending tokens, Badges, Agile and the Pending Badge. The Pending Badge reads `the card it is on`, which this plan keeps out of the view's card-only set (a face-down holder in slice 9 would leak through it); 5-3 decides how to show it safely;
- the Strategy Hand and the Brainstorm row in the private strip with counts for rivals; the milestone row and claimed Milestones on the shared table; the graduation and Mentor buttons;
- player values that count (`… is the number of …`) are not shown by 4-3's `shownPlayerValues`; 5-3 decides whether any should be;
- several target zones need no page change (the view offers each target); 5-3's browser check covers the Training picker.

## Gaps

None. Checked: no piece needs a protected file (End waiting is a predicate in `build.ts`, not a `flow.ts` change), a `CardState` change or a card `data` key; every R3 piece and every line R1–R10 asks of the language is a task here or is written with pieces already built. One call departs from the builder check's detail, not from a ruling: every rule about a player, not only the new frame, asks in turn order (see the Architecture's calls).

## Forward notes

- **Slice 6.** The reshuffling deal takes `card(s)`, so the Event deck's draw is `Deal up to 1 card from … , shuffling … into it when it runs out.` Toxic's −1 on a team total is one more value line on the same counts (`goes up by` / `goes down by`).
- **Slice 7.** Every new reader of "the cards on it" (`numberOfCards` through `cardsIn`, `some card on the target card`, the group gains) goes through `cardsOn`, so the holder-owner filter lands in one place.
- **Slice 8.** A non-active buyer meeting a position claim is asked in turn from the last turn's seat, as R1 orders; the Market Sale's offers in turn order may reuse `playersInTurnOrder`.
- **Slice 9.** `the card it is on` and owner scope stay out of the view's card-only set. `lang:last-turn` stores a seat, never a card id, so re-keying backlog ids leaves it alone.
