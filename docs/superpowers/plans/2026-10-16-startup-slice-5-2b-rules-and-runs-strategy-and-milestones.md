# Startup Simulator Slice 5-2b (Rules text and long runs: Strategy and Milestones) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Startup Simulator plays the rest of slice 5: all 30 Strategy cards in a deck that reshuffles its discard, a hidden Strategy Hand held to 3 at Cleanup, Brainstorm with its flush and its PM bonus, the five Training cards, and the six Milestones (3 revealed, claimed at the moment or as play happens, last checked after the final Ops check, scored at face value). The long runs play it at 2 to 5 players, and reach the talent paths only Training opens.

**Architecture:**
- **This is plan 5-2b, the second half of R13's plan 5-2** (it grew past eight tasks, so it is two plans). Plan 5-2a (`docs/superpowers/plans/2026-10-16-startup-slice-5-2a-rules-and-runs-talent.md`, talent) is built first; plan 5-3 (the page) comes after. This plan writes only the rules text, its examples and the long runs. It adds no phrase and changes no shared code.
- **Five tasks:**
  1. the Strategy deck, the Strategy Hand, Brainstorm and the strategy cleanup (R10);
  2. the five Training cards (R6);
  3. the Milestones: cards, the reveal, the score, and the claims at a moment (R1);
  4. the claims as play happens, the guard against an undecided Offline set, and the last check (R1);
  5. long runs: every Strategy, Training, Milestone and Training-dependent talent path tallied, whole games replayed; the README and the checks.
- **Phases.** Task 1 adds `brainstorm` (an interrupt, after `Phase: graduation`) and `strategy cleanup` (between `bench cleanup` and `backlog cleanup`, §5 Phase D step 7). Phase order after this plan: `modes`, `ops check`, `income`, `actions`, `research`, `sourcing`, `graduation`, `brainstorm`, `engine`, `commit`, `bench cleanup`, `strategy cleanup`, `backlog cleanup`, `final check`.
- **Builder calls this plan makes** (recorded for the owner):
  - **Brainstorm's flush is the button `brainstorm after flushing some cards from their strategy hand`.** R10's "brainstorm, flushing some cards …" can't be read: a pick line's words before "some cards" must start with a word and a space, and the comma breaks that. Examples say `When p0 brainstorms after flushing the Hit Piece`.
  - **Training is one button, not five** (a departure from R6's wording, not its rules). Five buttons that each pick "a card from their strategy hand to a card in their bench, their development team or their ops team" share their words, their source and their target zones, so an example's `When p0 plays the Full Stack Bootcamp to …` (plan 5-1's vocabulary) could press none of them alone (plan 4-1's P16 narrows by the target's zone only). The one button carries, for each card, a guard "the card is not this one, or the target fits it" and an option block whose options are each card's effect. Each option's guards leave exactly one option for every fitting press but a Bootcamp on a Junior QA Tester, which asks Blue or Red (R6). A card with no fitting target is refused before anything is paid (§6, M6).
  - **Strategy cards whose systems come later** (22 of 30) are in the deck and can be drawn, kept and discarded, but the button refuses them ("the card is a Training card"), as the spec's call says.
  - **The guard against an undecided Offline set** is the player flag `choosing offline products`, set by the ops check's and the final check's start lines and cleared as each passes on. It guards Platform Power and Full Stack Founder. Talent Magnet doesn't read Offline products, so its rule has no guard (a guard there could fail no example).
  - **Revenue Leader** reads a player value `operational revenue`, the total rev of the cards in their operations (§9.A), claimed in Income's start lines with plan 5-1's `If … and …`.
  - **The Strategy discard is public** (R10): its pile is one everyone can see.
- **Names.**
  - Zones: `strategy deck` (pile, secret), `strategy discard` (pile, public), `milestone deck` (pile, secret), `milestone row` (row, public); each player's `strategy hand` and `brainstorm` (rows only they see) and `milestones` (row everyone sees).
  - Columns: Strategy cards `kind`, `price`; Milestones `vp`.
  - Player flag `choosing offline products`; player values `operational revenue`, `active tags`.
  - Worked flags: `blue trainable`, `red trainable`, `green trainable`, `fully trained`, `certifiable`, `seminar ready`, `masterclass ready`, `workshop ready`, `hardware side`, `software side`.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-5-talent-growth-design.md` is binding; its "Builder-check rulings" R1–R13 win over its body. It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding, with its rule "every number comes from the rulebook, and examples say where" and its anti-goals (a rival seeing the Strategy Hand or the Brainstorm look among them). The other inputs:
- plan 5-2a, whose Global Constraints, names and test helpers this plan builds on;
- plan 5-1 (`docs/superpowers/plans/2026-10-16-startup-slice-5-1-language.md`) and plan 4-2 (`docs/superpowers/plans/2026-10-16-startup-slice-4-2-rules-and-runs.md`);
- `builder-check-startup-5.md` (M1, M6, M10, M12) in the session scratchpad;
- `suwa/rulebook.md` v6.0 §3 (Your Three Hands), §4.1 and §4.3, §5 Phase B and Phase D step 7, §6 Brainstorm and Play Strategy Card, §9.A, §12, §15.C, §20.A, §20.G, Rulings #5, #10, #14, #24, #25;
- where those are silent, suwa's `resolvers/{admin_actions,strategy_effects,strategy_actions}.rs`, `milestones.rs` and `phases/game_end.rs`.

## Global Constraints

- **Sequencing (controller ruling).** Plan 5-3's Task 1 (a fitted table that needs more room grows taller) runs before this plan: this plan's new zones don't fit today's fitted table (the development team's hanging cards overlap the private strip after Task 1; the four board rows are 98 tall after Task 3, so `misfits` fails). Take the fitted Startup pins from the committed tests when each task starts.

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.** This plan adds no key.
- **No Startup Simulator words in shared code.** The banned list is plan 5-1's (its Global Constraints), slice 5's words included: xp, pending, skill, badge, rank, mentor, synergy, agile, graduate, training, brainstorm, strategy, milestone, senior. This plan touches no shared code.
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged. Rent Day keeps its 108 examples.
- **Files this plan changes:** `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md`, and test-file pins under `src/pages/designer/**` that read the rules text (the Startup example count in `designer-page.test.tsx`; any offered list in `playtest-fitted.test.tsx` that gains the Brainstorm or Training buttons, and any pinned zone list or Board text in `tableaux.test.ts`, pinned as the view now says it and reported). No page source changes, and nothing under `src/engine/**`.
- **Every number comes from the rulebook, and examples say where:** a section or ruling in each title, and each task's "How the numbers come".
- **Anti-goals (spec and overview):** a rival seeing the Strategy Hand or the Brainstorm look; a Milestone claimed from a state a player hasn't chosen yet; a rule approximated without a recorded call; a game that can't end; an auto-player that hides a rule that never fires.
- **Every rules line is pinned.** Each line this plan adds or changes, other than `Hint:` lines, table rows and `Players can …` declarations, fails some example when it alone is removed. Each task's Step 4 runs plan 5-2a's removal probe.
- **Example counts.** N₅ is the count the committed test pins when Task 1 starts: plan 5-2a's N₄ + 48, plus whatever fix waves add. The tasks end at N₅ + 9, + 19, + 24 and + 33. Each task updates `results` in `startup-simulator.test.ts`, the Startup test in `designer-page.test.tsx` and the README's "Its N examples".
- **The seeded games change.** `Shuffle the strategy deck.` (Task 1) and the Milestones' shuffle (Task 3) draw from the state's random numbers at Setup, so every seeded game plays differently from Task 1 on. Pins that read a seeded game by position rather than by rule are read again from the new games, and the change reported; a long-run tally that drops to 0 is handled as below.
- **Commands.**
  - Single file: `bunx vitest run src/games/startup-simulator.test.ts`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1: record `BASE=$(git rev-parse HEAD)`; run `bun run test` once for the passing count and the long runs' time; note N₅.
- **Existing tests.** Only the lines each task names change. If any other existing test fails, stop and report it.
- **Long runs.** If an invariant shows a wrong rule, fix the rules text. If a required tally stays at 0, change the auto-player (cadences, targets), never the rules; report a key that stays unreachable. If a rule can't be written with plans 4-1 and 5-1's phrases, report it. If the long runs take more than a third longer than at BASE, report the timing.
- **Pre-flight notes carried from plan 4-2:** take every `shownFlags` / `standIns` pin from HEAD and apply only the change named; never write `For each card … that is X`; read counts as numbers with missing as 0, never with `hasOwn`.
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefix `feat(games):` (`docs:` for a README-only commit).
  - TDD every task: change the test first, watch it fail, then the rules, pass, `bun run typecheck`, commit.
  - Every rules line below is exact copy. Insertion points name a line or section by its text, never by a line number. **Re-read the committed rules file before each task:** plans 4-2 and 5-2a's text is the base.

## Review Focus

- **Brainstorm on a short deck.**
  - Expected: with one card left it is kept at once; with the deck empty the discard is shuffled in, flushed cards included; with both empty the press is refused and spends nothing; replay gives the same cards.
  - Tests: Task 1, examples 4–7, and Task 5's replay.
- **Training on a card that doesn't fit it, without its price, or on a Senior.**
  - Expected: refused before anything is paid, the card still in hand; a Bootcamp asks a colour only when both fit, and fills in the one that does.
  - Tests: Task 2, examples 2–4 and 8–9.
- **A Milestone met while an Offline set is undecided, at the final check, or by two players at once.**
  - Expected: nothing is claimed until the set is chosen; the last check runs after every player's final check and before the score, from the player whose turn ended the round; at one moment the Active Player wins it, else the next in turn order.
  - Tests: Task 4, examples 2, 4, 5, 7 and 8.
- **Hidden hands.**
  - Expected: a rival sees no face in another player's Strategy Hand or Brainstorm row, only how many; the Strategy discard is public.
  - Test: Task 1's hidden-zone test and the long-run hidden-zone invariant.
- **Undo and replay across a reshuffle, a Training choice and a claim at the last check.**
  - Expected: the log alone rebuilds the finished game (the reshuffle uses the state's random numbers), and undo of the last move gives the state before it.
  - Test: Task 5.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name. If one is missing or differs, stop and report it.

- **Plan 5-2a, built:** its rules names (the counts, flags and worked values in its "Names", the `graduation` phase, `Managing:`, `Agile:`), and in the test file `TOKENS`, `tokenOn`, `PENDING`, `GRADUATION`, `KEEP_PENDING`, `MENTOR`, `pmToProject`, `scoreOf(runtime, state, seat)`, the values test `works out slice 5’s values …` and the slice-5 talent tallies.
- **Plan 4-2, built:** the `ops check` phase (its start line `Every card in their operations is not offline.`, its confirm button, its `When their blue supply is at least their blue load:` rule); the `final check` phase (its two rules); `Phase: income`'s `When this phase starts:`; the End's `Before the score, each player has the final check, in turn from the start player.`; the test file's `SWITCH_OFF`, `SWITCH_ON`, `CONFIRM_ONLINE`, `FINAL_CHECK`, `turnsIn(log, skipped)`, `Run.finalCheck`, `shortOf`.
- **Plan 5-1, built:** `deal up to {int} card(s) from {zone} to {zone}, shuffling {zone} into it when it runs out`; targets in several zones (`CardPick.ontoAlso`, `ontoCandidates` zone by zone); `the target card is (not) {cardflag}`; `the target card gains {int} {attribute}`; `the target card is {cardflag}` (effect); `a player's {playervalue} is the number of different {attribute} values among {cardgroup}`; `they have at least {int} cards in {zones} whose {cardfilter}`; `it is a card whose {cardfilter}`; the `When a player …:` frame asked in turn from the player whose turn last started; End waiting for rules about a player in `In every phase:`; `If <condition> and <condition>, <effect>`.
- **Plans 4-1 and earlier:** `a player's {playervalue} is the total {attribute} of {cardgroup}`, `their {playervalue} is at least {int}`, `players can be {name}`, `they are (not) {playerflag}`, `no player is {playerflag}`, `move {card} from {zone} to {zone}`, `{sharedzone} has {card}`, `deal up to {int} cards from {zone} to {zone}`, `move {zone} to {zone}`, `move the picked cards to {zone}`, `the card is (not) {cardclass}`, `they have at least the card's {attribute} in {counter}`, `they pay the card's {attribute}`, the expect `{player}'s {playervalue} is {int}`, P16's `… to {card} in {zone}`.

---

### Task 1: The Strategy deck, the Strategy Hand, Brainstorm and the strategy cleanup

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` and `tableaux.test.ts` only if they pin what this task changes

**Interfaces:**
- Consumes: plan 5-1's reshuffling deal; plan 5-2a's `Managing:`.
- Produces (rules): the Strategy table and zones; buttons `brainstorm`, `brainstorm after flushing some cards from their strategy hand`, `keep a card in their brainstorm`, `discard a card in their strategy hand`; phases `brainstorm`, `strategy cleanup`.
- Produces (test file):

```ts
const BRAINSTORM = 'brainstorm';
const BRAINSTORM_FLUSHING = 'brainstorm after flushing some cards from their strategy hand';
const KEEP_STRATEGY = 'keep a card in their brainstorm';
const DISCARD_STRATEGY = 'discard a card in their strategy hand';
/** A Strategy card's kind is Training, the only kind this slice plays (§20.A). */
const isTraining = (card: CardState) => card.data?.kind === 'Training';
```

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₅ + 9; the designer page's count too.
    - `PHASES` gains `'brainstorm'` right after `'graduation'` and `'strategy cleanup'` right after `'bench cleanup'`; `BEFORE_THE_ENGINE` gains `'brainstorm'`.
    - `'has 87 cards …'` becomes `'has 117 cards: 22 talent, 30 seed products, 34 growth products with the Market Crash, and 30 Strategy cards'`, adding `expect(inZone(cards, 'strategy-deck')).toHaveLength(30)`.
    - `'makes the Juniors after the 87 dealt cards, c87 to c95 at 3 players'` becomes `… after the 117 dealt cards, c117 to c125 …`, with `NEXT_CARD_KEY` 126.
    - `'lays out the table …'`: after `['crash-pile', false, 'pile', 'public']` add `['strategy-deck', false, 'pile', 'secret']` and `['strategy-discard', false, 'pile', 'public']`; after `['scouting', true, 'row', 'owner']` add `['strategy-hand', true, 'row', 'owner']` and `['brainstorm', true, 'row', 'owner']`.
    - The setup test (`sets up a table of %i players at every seed`) also expects the strategy deck at 30 and every seat's strategy hand empty.
    - `OWN_ROWS` gains `'strategy hand'` and `'brainstorm'`, so the hidden-zone invariant covers them.
  - **Append `it('has the Strategy deck of §20.A: 30 cards, 8 of them Training, with their prices')`:** `nameCounts` of the strategy deck is `{ 'Full Stack Bootcamp': 2, 'QA Certification': 2, 'Sales Seminar': 2, 'Leadership Masterclass': 1, 'Agile Workshop': 1, Headhunter: 4, 'Corporate Raider': 2, 'Hit Piece': 2, 'Non-Compete Suit': 2, Workaholic: 1, 'Clean Coder': 1, Visionary: 1, 'Toxic Personality': 1, Burnout: 1, 'Flight Risk': 1, 'TechCrunch Feature': 2, 'Design Sprint': 2, 'Cease & Desist': 2 }`; 8 are `Training`, 10 `Warfare`, 6 `Attribute`, 6 `Utility`; `sum(…, 'price')` is 63.
  - **Append `it('shows the Strategy Hand and the Brainstorm look only to their owner, and the strategy discard to everyone (§15.C, the spec’s anti-goal)')`:** `arrange({ 'strategy-deck': ['Headhunter', 'Burnout', 'Hit Piece'].map(idOf), 'strategy-hand-p0': [idOf('Visionary')] })`; p0 presses `BRAINSTORM`; for p1, `deriveScene` gives `HIDDEN_FACE_KEY` to the cards of `strategy-hand-p0` and `brainstorm-p0`, and for p0 their faces; after p0 keeps the Hit Piece, p1 sees the Burnout's face in `strategy-discard`.
  - **Invariants (Review Focus 1, 4):**
    - the Strategy cards are conserved: by name, the strategy deck, the strategy discard, every strategy hand and every brainstorm row together hold the counts of the table (§20.A);
    - a seat's brainstorm row holds cards only while its turn is in `brainstorm`, and at most 3;
    - every seat whose turn it is not holds at most 3 strategy cards (§5 Phase D step 7, ruling 10);
    - the strategy deck gains cards only in a `BRAINSTORM` or `BRAINSTORM_FLUSHING` press (the reshuffle).
  - **The auto-player.**
    - **`brainstorming()`**, in the planned list for actions after the first, right before `...board()`: when `(t + a) % 5 === 2`, it presses `BRAINSTORM_FLUSHING` with every non-Training card of its strategy hand (`pickSome`) when `t % 2 === 1` and it holds one, else `BRAINSTORM`. A refused press falls through as every planned move does.
    - **In `brainstorm`:** it keeps the first Training card of the row, else the row's card at `t` (mod its length).
    - **`CLEANUPS`** gains `'strategy cleanup': { row: 'strategy hand', discard: DISCARD_STRATEGY }`; the cleanup handler's kept cards are, in the strategy hand, its Training cards.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Cards** (§20.A). Right after the growth products' table (before `  Cards can be onboarding.`) add:

```text
  A deck called strategy cards, starting in the strategy deck:
    | name                   | kind      | price | copies |
    | Full Stack Bootcamp    | Training  | 3     | 2      |
    | QA Certification       | Training  | 3     | 2      |
    | Sales Seminar          | Training  | 2     | 2      |
    | Leadership Masterclass | Training  | 3     | 1      |
    | Agile Workshop         | Training  | 3     | 1      |
    | Headhunter             | Warfare   | 0     | 4      |
    | Corporate Raider       | Warfare   | 2     | 2      |
    | Hit Piece              | Warfare   | 3     | 2      |
    | Non-Compete Suit       | Warfare   | 4     | 2      |
    | Workaholic             | Attribute | 2     | 1      |
    | Clean Coder            | Attribute | 3     | 1      |
    | Visionary              | Attribute | 3     | 1      |
    | Toxic Personality      | Attribute | 3     | 1      |
    | Burnout                | Attribute | 0     | 1      |
    | Flight Risk            | Attribute | 2     | 1      |
    | TechCrunch Feature     | Utility   | 5     | 2      |
    | Design Sprint          | Utility   | 0     | 2      |
    | Cease & Desist         | Utility   | 0     | 2      |
```

  - **Table.** After `  The crash pile is a pile in the center that everyone can see.` add the first two lines, and after `  Each player has a scouting row that only they can see.` the last two:

```text
  The strategy deck is a pile in the center that no one can see.
  The strategy discard is a pile in the center that everyone can see.
```

```text
  Each player has a strategy hand row that only they can see.
  Each player has a brainstorm row that only they can see.
```

  - **Setup** (§4.1). After `  Shuffle the talent deck.` add `  Shuffle the strategy deck.`
  - **Brainstorm** (§6, R10). In `Phase: actions`, right after the `A player may research the growth deck.` button and its lines add:

```text
  A player may brainstorm.
    It costs 1 action.
    Only if one of:
      The strategy deck is not empty.
      The strategy discard is not empty.
    Then:
      If some card in their development team and their ops team is managing, deal up to 3 cards from the strategy deck to their brainstorm, shuffling the strategy discard into it when it runs out.
      If no card in their development team and their ops team is managing, deal up to 2 cards from the strategy deck to their brainstorm, shuffling the strategy discard into it when it runs out.
      The brainstorm phase starts with them.
  A player may brainstorm after flushing some cards from their strategy hand.
    It costs 1 action.
    Then:
      Move the picked cards to the strategy discard.
      If some card in their development team and their ops team is managing, deal up to 3 cards from the strategy deck to their brainstorm, shuffling the strategy discard into it when it runs out.
      If no card in their development team and their ops team is managing, deal up to 2 cards from the strategy deck to their brainstorm, shuffling the strategy discard into it when it runs out.
      The brainstorm phase starts with them.
```

  - **The brainstorm phase.** Right after the `Phase: graduation` block add:

```text
Phase: brainstorm
  Hint: Keep one of the Strategy cards you drew. The rest go to the strategy discard.
  A player may keep a card in their brainstorm.
    Then:
      Move it to their strategy hand.
      Move their brainstorm to the strategy discard.
      Go back to the interrupted turn.
  When their brainstorm has 1 card:
    Move their brainstorm to their strategy hand.
    Go back to the interrupted turn.
```

  - **Cleanup** (§5 Phase D step 7, ruling 10). In `Phase: bench cleanup`, `  When their bench has fewer than 6 cards, go to backlog cleanup.` becomes `  When their bench has fewer than 6 cards, go to strategy cleanup.` Right after the `Phase: bench cleanup` block add:

```text
Phase: strategy cleanup
  Hint: Your strategy hand holds 3 cards. Discard the rest to the strategy discard.
  A player may discard a card in their strategy hand.
    Only if their strategy hand has more than 3 cards.
    Then:
      Move it to the strategy discard.
  When their strategy hand has fewer than 4 cards, go to backlog cleanup.
```

  - **Append these 9 examples.**

```text
Example: the Strategy deck holds all 30 cards, and no player starts with one (section 4, section 20, ruling 25)
  Given the game is set up
  Then the strategy deck has 30 cards
  And the strategy discard is empty
  And p0's strategy hand is empty
  And p1's strategy hand is empty

Example: Brainstorm draws 2 Strategy cards for 1 action and keeps 1, and the other goes to the strategy discard (section 6, section 15)
  Given the strategy deck has a Headhunter, a Burnout and a Hit Piece
  When p0 brainstorms
  Then it is accepted
  And the phase is brainstorm
  And p0 has 2 actions
  And p0's brainstorm has a Hit Piece and a Burnout
  When p0 keeps the Hit Piece
  Then the phase is actions
  And p0's strategy hand has a Hit Piece
  And the strategy discard has a Burnout
  And the strategy deck has a Headhunter
  And p0's brainstorm is empty

Example: with a working PM on the Board, even in the ops team, Brainstorm draws 3 and keeps 1 (section 6, ruling 25)
  Given the phase is actions
  And p0's operations has a To-Do List
  And p0's ops team has a Junior PM
  And the strategy deck has a Headhunter, a Burnout, a Hit Piece and a Visionary
  When p0 brainstorms
  Then p0's brainstorm has a Visionary, a Hit Piece and a Burnout
  When p0 keeps the Visionary
  Then the strategy discard has a Hit Piece and a Burnout
  And the strategy deck has a Headhunter

Example: a PM onboarding this turn gives Brainstorm no third card (section 6, ruling 8)
  Given the phase is actions
  And p0's development has a Dating App
  And p0's operations has a To-Do List
  And p0's ops team has a Junior PM
  And the strategy deck has a Headhunter, a Burnout and a Hit Piece
  When p0 reassigns the Junior PM to the Dating App
  And p0 brainstorms
  Then p0's brainstorm has a Hit Piece and a Burnout

Example: Brainstorm on an empty Strategy deck shuffles the discard in to form a new deck (section 15)
  Given the strategy deck is empty
  And the strategy discard has a Headhunter, a Burnout and a Hit Piece
  When p0 brainstorms
  Then p0's brainstorm has 2 cards
  And the strategy deck has 1 card
  And the strategy discard is empty

Example: Brainstorm may flush Strategy cards first; they go to the discard before the draw, so a reshuffle can bring them back (section 6, section 15)
  Given p0's strategy hand has a Hit Piece and a Burnout
  And the strategy deck is empty
  When p0 brainstorms after flushing the Hit Piece and the Burnout
  Then it is accepted
  And p0 has 2 actions
  And p0's strategy hand is empty
  And p0's brainstorm has a Hit Piece and a Burnout
  When p0 keeps the Burnout
  Then p0's strategy hand has a Burnout
  And the strategy discard has a Hit Piece

Example: with the Strategy deck and its discard both empty, Brainstorm is refused and spends nothing (section 6, section 15)
  Given the strategy deck is empty
  When p0 brainstorms
  Then it is rejected because "the strategy deck is not empty or the strategy discard is not empty"
  And p0 has 3 actions

Example: a Brainstorm that draws a single card keeps it at once (section 6, the slice's R10)
  Given the strategy deck has a Hit Piece
  When p0 brainstorms
  Then the phase is actions
  And p0's strategy hand has a Hit Piece
  And p0 has 2 actions

Example: the Strategy Hand holds 3 at Cleanup, discarded after the Bench and before the Backlog (section 5, ruling 10)
  Given the phase is bench cleanup
  And p0's bench has a QA Engineer, a QA Engineer, a QA Engineer, a Sales Rep, a Sales Rep and a Sales Rep
  And p0's strategy hand has a Hit Piece, a Burnout, a Headhunter and a Visionary
  And p0's backlog has a To-Do List, a Smart Lock, a Dating App and a Mobile Wallet
  When p0 discards a Sales Rep
  Then the phase is strategy cleanup
  When p0 discards the Burnout
  Then the phase is backlog cleanup
  And the strategy discard has a Burnout
  And p0's strategy hand has 3 cards
  When p0 discards the Smart Lock
  Then it is p1's turn
```

  **How the numbers come** (§3 Your Three Hands, §5 Phase D step 7, §6 Brainstorm, §15.C, §20.A):
  - **Brainstorm:** 1 AP (§6); draw 2, keep 1, discard the rest; draw 3 with a PM on the Board without an Onboarding Token (§6, ruling 25); flushed cards are discarded first (§15.C); an empty deck reshuffles the discard (§15.C).
  - **The deck:** a Given lists a pile bottom first, so the last card named is drawn first (as the seed deck's refills show).
  - **The Strategy Hand:** limit 3 at the end of the turn, enforced after the Bench and before the Backlog (§5 D.7, ruling 10).
  - **Lines each example pins:** 1 the table; 2 the 2-card draw line, the keep button and the phase; 3 the 3-card draw line; 5 the reshuffle (the deal's last words); 6 the flush button's lines; 7 the button's guard; 8 the single-card rule; 9 the cleanup phase and the bench cleanup's new go-to. 4 is a guard (ruling 8).
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Strategy deck of 30 cards, Brainstorm with its flush, its PM bonus and its reshuffled discard, and a hidden Strategy Hand held to 3 at Cleanup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: The five Training cards

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` only if it pins an offered list this button joins

**Interfaces:**
- Consumes: Task 1's Strategy Hand; plan 5-1's several target zones, `the target card is (not) {cardflag}`, `the target card gains {int} {attribute}`, `the target card is {cardflag}`; plan 5-2a's tokens and `badged`.
- Produces (rules): the button `play a card from their strategy hand to a card in their bench, their development team or their ops team`; worked flags `blue trainable`, `red trainable`, `green trainable`, `fully trained`, `certifiable`, `seminar ready`, `masterclass ready`, `workshop ready`.
- Produces (test file):

```ts
const PLAY_TRAINING = 'play a card from their strategy hand to a card in their bench, their development team or their ops team';
/** The rows a Training card's target is picked in, in the order the button names them (§20.A: Bench or Board). */
const TRAINING_TARGETS = ['bench', 'development team', 'ops team'];
// `Onto.zoneId` becomes `string | string[]`: a button that picks its target in several zones offers the cards of each, in turn.
```

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₅ + 19; the designer page's count too. The values test adds the eight flags above.
  - **Several target zones in the test helpers.** `Onto.zoneId` may be a list; `offers` and `viewedCards` read a target list as the cards of each zone in turn, which `ontoCandidates` must equal (plan 5-1's Task 3 order).
  - **Money (`keepsTheRules`):** a `PLAY_TRAINING` press pays the played card's `price`.
  - **Invariants:** a Strategy card leaves a strategy hand for the strategy discard in a `PLAY_TRAINING` press only when it is a Training card; a `PLAY_TRAINING` press changes its target's `blue skill`, `red skill`, `green skill`, `training xp` or `badged` and nothing else of any card's tokens.
  - **The auto-player: `training()`**, a free move made at most once a turn, after the Greenlight: the first Training card of its strategy hand that has a target the rules take (`pressChoices` on `{ type: PLAY_TRAINING, by, cardId, onto }` gives a list, not a refusal), on the target chosen so: for a Leadership Masterclass, the first taken target whose kind (`Junior` by role, else its name) is `['Junior', 'QA Engineer', 'Sales Rep'][t % 3]`, else the first taken target; for any other card, the taken target at `t % n`. Its choice is answered by `pick`, so a Bootcamp on a Junior QA Tester takes Blue or Red by `t`.
  - **Append `it('plays a Training card the auto-player holds on a target it fits, answering the colour by t, through the page’s view and without it (§20.A)')`.** From `setUp(2, 1)`, with S its start player: a Full Stack Bootcamp goes to `strategy-hand-S`, and S's Junior Software Dev and Junior Hardware Eng go from its bench to the box, leaving its Junior QA Tester. For t = 0 and t = 1, `playTurn` stops at the first `PLAY_TRAINING`, which gives the QA Tester `blue skill` at t = 0 and `red skill` at t = 1 (the choice at 0 answered with option `(t + 0) % 2`); the logs with and without the view are equal.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **The fits.** Right after the `Agile:` section add:

```text
Blue trainable:
  Only if it is a Junior card.
  Only if it is not a software card.
  Only if its blue skill is 0.

Red trainable:
  Only if it is a Junior card.
  Only if it is not a hardware card.
  Only if its red skill is 0.

Green trainable:
  Only if it is a Junior card.
  Only if it is not a qa card.
  Only if its green skill is 0.

Fully trained:
  Only if its training xp is more than 1.

Certifiable:
  Only if it is a Bug Hunter card.
  Only if it is not fully trained.

Seminar ready:
  Only if it is a Rainmaker card.
  Only if it is not fully trained.

Masterclass ready:
  Only if one of:
    It is a Junior card.
    It is a Bug Hunter card.
    It is a Rainmaker card.
  Only if it is not badged.

Workshop ready:
  Only if it is a Synergy card.
  Only if it is not badged.
```

  - **The button** (§6 Play Strategy Card, §20.A, R6, ruling 14). In `Phase: actions`, right after the `A player may greenlight a card in their backlog.` button and its lines add:

```text
  A player may play a card from their strategy hand to a card in their bench, their development team or their ops team.
    Only if the card is a Training card.
    Only if they have at least the card's price in capital.
    Only if one of:
      The card is not a Full Stack Bootcamp.
      The target card is blue trainable.
      The target card is red trainable.
    Only if one of:
      The card is not a QA Certification.
      The target card is green trainable.
      The target card is certifiable.
    Only if one of:
      The card is not a Sales Seminar.
      The target card is seminar ready.
    Only if one of:
      The card is not a Leadership Masterclass.
      The target card is masterclass ready.
    Only if one of:
      The card is not an Agile Workshop.
      The target card is workshop ready.
    Then:
      They pay the card's price.
      They choose one:
        Blue:
          Only if the card is a Full Stack Bootcamp.
          Only if the target card is blue trainable.
          The target card gains 1 blue skill.
        Red:
          Only if the card is a Full Stack Bootcamp.
          Only if the target card is red trainable.
          The target card gains 1 red skill.
        Green:
          Only if the card is a QA Certification.
          Only if the target card is green trainable.
          The target card gains 1 green skill.
        XP:
          Only if one of:
            The card is a QA Certification.
            The card is a Sales Seminar.
          Only if the target card is not a Junior card.
          The target card gains 1 training xp.
        Badge:
          Only if one of:
            The card is a Leadership Masterclass.
            The card is an Agile Workshop.
          The target card is badged.
      Move it to the strategy discard.
```

  - **Append these 10 examples.**

```text
Example: Full Stack Bootcamp gives a Junior Hardware Eng a Blue Skill token for $3 and no action, and it declares Blue at its next turn (section 20, section 11)
  Given the phase is actions
  And p0's strategy hand has a Full Stack Bootcamp
  And p0's development has a Dating App
  And the Dating App in p0's development has a Junior Hardware Eng on it
  When p0 plays the Full Stack Bootcamp to the Junior Hardware Eng
  Then it is accepted
  And p0 has 4 capital
  And p0 has 3 actions
  And the Junior Hardware Eng in p0's development team has 1 blue skill
  And the strategy discard has a Full Stack Bootcamp
  When p0 ends their actions
  And p1 ends their actions
  Then the phase is modes
  When p0 declares the Junior Hardware Eng, choosing blue
  And p0 confirms their modes
  And p0 ends their actions
  Then the Dating App in p0's development has 1 blue cube

Example: Full Stack Bootcamp asks a Junior QA Tester which colour, gives it the other one next and then fits it no more, and gives a Junior Software Dev Red, the colour it lacks (section 20, section 11)
  Given p0 has 9 capital
  And p0's strategy hand has a Full Stack Bootcamp and a Full Stack Bootcamp
  And p0's bench has a Junior QA Tester and a Junior Software Dev
  When p0 plays a Full Stack Bootcamp to the Junior QA Tester
  Then it is rejected because "Choose one: blue or red."
  When p0 plays a Full Stack Bootcamp to the Junior QA Tester, choosing red
  And p0 plays the Full Stack Bootcamp to the Junior QA Tester
  Then the Junior QA Tester in p0's bench has 1 red skill
  And the Junior QA Tester in p0's bench has 1 blue skill
  Given p0's strategy hand has a Full Stack Bootcamp
  When p0 plays the Full Stack Bootcamp to the Junior QA Tester
  Then it is rejected because "the card is not a Full Stack Bootcamp or the target card is blue trainable or the target card is red trainable"
  When p0 plays the Full Stack Bootcamp to the Junior Software Dev
  Then it is accepted
  And the Junior Software Dev in p0's bench has 1 red skill
  And p0 has 0 capital

Example: QA Certification gives a Junior without QA a Green Skill token, and fits no Junior that has QA already (section 20, the slice's ruling b)
  Given p0's strategy hand has a QA Certification and a QA Certification
  And p0's bench has a Junior Hardware Eng, a Junior QA Tester and a Junior Software Dev
  And the Junior Software Dev in p0's bench has 1 green skill
  When p0 plays a QA Certification to the Junior QA Tester
  Then it is rejected because "the card is not a QA Certification or the target card is green trainable or the target card is certifiable"
  When p0 plays a QA Certification to the Junior Software Dev
  Then it is rejected because "the card is not a QA Certification or the target card is green trainable or the target card is certifiable"
  When p0 plays a QA Certification to the Junior Hardware Eng
  Then it is accepted
  And the Junior Hardware Eng in p0's bench has 1 green skill
  And p0 has 4 capital

Example: QA Certification gives a QA Engineer 1 XP, up to 2, and fits neither a Sales Rep nor a Senior (section 20, section 11, ruling 14)
  Given p0's strategy hand has a QA Certification and a QA Certification
  And p0's bench has a QA Engineer, a Sales Rep and the Architect
  And the QA Engineer in p0's bench has 1 training xp
  When p0 plays a QA Certification to the Sales Rep
  Then it is rejected because "the card is not a QA Certification or the target card is green trainable or the target card is certifiable"
  When p0 plays a QA Certification to the Architect
  Then it is rejected because "the card is not a QA Certification or the target card is green trainable or the target card is certifiable"
  When p0 plays a QA Certification to the QA Engineer
  Then it is accepted
  And the QA Engineer in p0's bench has 2 training xp
  When p0 plays the QA Certification to the QA Engineer
  Then it is rejected because "the card is not a QA Certification or the target card is green trainable or the target card is certifiable"

Example: Sales Seminar gives a Sales Rep 1 XP for $2, up to 2, and fits no QA Engineer (section 20, section 11)
  Given the phase is actions
  And p0's strategy hand has a Sales Seminar and a Sales Seminar
  And p0's operations has a Dating App
  And the Dating App in p0's operations has a Sales Rep on it
  And the Sales Rep in p0's ops team has 1 training xp
  And p0's bench has a QA Engineer
  When p0 plays a Sales Seminar to the QA Engineer
  Then it is rejected because "the card is not a Sales Seminar or the target card is seminar ready"
  When p0 plays a Sales Seminar to the Sales Rep
  Then it is accepted
  And p0 has 5 capital
  And the Sales Rep in p0's ops team has 2 training xp
  When p0 plays the Sales Seminar to the Sales Rep
  Then it is rejected because "the card is not a Sales Seminar or the target card is seminar ready"

Example: Leadership Masterclass badges a University Junior, a QA Engineer or a Sales Rep that has no Badge, and fits no Junior PM (section 20, section 11)
  Given the phase is actions
  And p0 has 9 capital
  And p0's strategy hand has a Leadership Masterclass
  And p0's bench has a Junior QA Tester, a QA Engineer, a Sales Rep and a Junior PM
  And p0's operations has a Dating App
  And the Dating App in p0's operations has a Sales Rep on it
  And the Sales Rep in p0's ops team is badged
  When p0 plays the Leadership Masterclass to the Junior PM
  Then it is rejected because "the card is not a Leadership Masterclass or the target card is masterclass ready"
  When p0 plays the Leadership Masterclass to the Sales Rep in p0's ops team
  Then it is rejected because "the card is not a Leadership Masterclass or the target card is masterclass ready"
  When p0 plays the Leadership Masterclass to the Junior QA Tester
  Then it is accepted
  And the Junior QA Tester in p0's bench is badged
  Given p0's strategy hand has a Leadership Masterclass
  When p0 plays the Leadership Masterclass to the QA Engineer
  Then the QA Engineer in p0's bench is badged
  Given p0's strategy hand has a Leadership Masterclass
  When p0 plays the Leadership Masterclass to the Sales Rep
  Then the Sales Rep in p0's bench is badged
  And p0 has 0 capital

Example: Agile Workshop badges a Junior PM, which is then Agile, and fits neither the Senior PM nor a Junior PM badged already (section 20, section 11)
  Given the phase is actions
  And p0's strategy hand has an Agile Workshop
  And p0's bench has the Senior PM
  And p0's development has a Dating App and a To-Do List
  And the Dating App in p0's development has a Junior PM on it
  And the To-Do List in p0's development has a Junior Software Dev on it
  When p0 plays the Agile Workshop to the Senior PM
  Then it is rejected because "the card is not an Agile Workshop or the target card is workshop ready"
  When p0 plays the Agile Workshop to the Junior PM
  Then it is accepted
  And the Junior PM in p0's development team is badged
  When p0 reassigns the Junior Software Dev to the Dating App
  Then the Junior Software Dev in p0's development team is not onboarding
  Given p0's strategy hand has an Agile Workshop
  When p0 plays the Agile Workshop to the Junior PM
  Then it is rejected because "the card is not an Agile Workshop or the target card is workshop ready"

Example: no Training card fits a Senior: a Full Stack Bootcamp is refused on the Architect and on the Diva, and nothing is paid (ruling 14, section 11)
  Given p0's strategy hand has a Full Stack Bootcamp
  And p0's bench has the Architect and the Diva
  When p0 plays the Full Stack Bootcamp to the Architect
  Then it is rejected because "the card is not a Full Stack Bootcamp or the target card is blue trainable or the target card is red trainable"
  When p0 plays the Full Stack Bootcamp to the Diva
  Then it is rejected because "the card is not a Full Stack Bootcamp or the target card is blue trainable or the target card is red trainable"
  And p0 has 7 capital

Example: Training is refused without its printed price, and nothing changes (section 6, section 20)
  Given p0 has 2 capital
  And p0's strategy hand has a Full Stack Bootcamp
  And p0's bench has a Junior Software Dev
  When p0 plays the Full Stack Bootcamp to the Junior Software Dev
  Then it is rejected because "they have at least the card's price in capital"
  And p0 has 2 capital
  And p0's strategy hand has a Full Stack Bootcamp

Example: only a Training card can be played in this slice: a Hit Piece waits in the hand (the spec's call, section 20)
  Given p0's strategy hand has a Hit Piece
  And p0's bench has a Junior Software Dev
  When p0 plays the Hit Piece to the Junior Software Dev
  Then it is rejected because "the card is a Training card"
```

  **How the numbers come** (§6, §11.C–E, §20.A, §20.B, ruling 14):
  - **Prices:** Bootcamp $3, QA Certification $3, Sales Seminar $2, Masterclass $3, Agile Workshop $3; 0 AP each (§20.A). So 7 − 3 = 4; 9 − 3 − 3 − 3 = 0; 7 − 2 = 5.
  - **Fits:** Bootcamp, a Blue or Red Skill token the Junior lacks; QA Certification, a Green token to a Junior without QA, else +1 XP to a QA Engineer up to 2; Sales Seminar +1 XP to a Sales Rep up to 2; Masterclass, a Badge to an unbadged University Junior, QA Engineer or Sales Rep; Agile Workshop, a Badge to an unbadged Junior PM, which makes it Agile (§20.A, §11.D, §11.E.3). No card fits a Senior (§11.F, ruling 14).
  - **Agile:** the badged Junior PM spares the reassigned Software Dev its token (§11.E.3).
  - **Lines each example pins:** 1 the Blue option, `They pay the card's price.`, the move to the discard and Red trainable's Hardware line; 2 the Red option, Red trainable's Red Skill line, Blue trainable's Blue Skill and Software lines, the Green option's card line; 3 the QA guard, Green trainable's QA and Green Skill lines, the Green option, the Blue option's card line, the XP option's Junior line; 4 Certifiable's two lines, Fully trained, Green trainable's Junior line, the XP option and the Green option's fit line; 5 the Seminar guard, Seminar ready's two lines, the Badge option's card line; 6 the Masterclass guard, Masterclass ready's four lines, the Badge option, the XP option's card line, the Red option's card line; 7 the Workshop guard and Workshop ready's two lines; 8 the Bootcamp guard and both Trainables' Junior lines; 9 the price guard; 10 the Training guard.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Training cards give Skill tokens, Specialists' XP and Gold Badges for their printed price, only on an employee they fit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: The Milestones: cards, the reveal, the score and the claims at a moment

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `tableaux.test.ts` only if it pins the shared zones

**Interfaces:**
- Consumes: plan 5-1's `If … and …`; plan 4-1's player values.
- Produces (rules): the Milestone table and zones; player value `operational revenue`; the Launch and Income claim lines; the score line.
- Produces (test file): `const MILESTONES = ['First Mover Advantage', 'Talent Magnet', 'Platform Power', 'Revenue Leader', 'Clean Launch', 'Full Stack Founder'];` `scoreOf` adds the `vp` of every card in the seat's milestones row.

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₅ + 24; the designer page's count too.
    - `'has 117 cards …'` becomes `'has 123 cards: …, 30 Strategy cards and 6 Milestones'`; the Juniors are made after the 123 dealt cards, c123 to c131, `NEXT_CARD_KEY` 132.
    - `'lays out the table …'`: after `['strategy-discard', false, 'pile', 'public']` add `['milestone-deck', false, 'pile', 'secret']` and `['milestone-row', false, 'row', 'public']`; after `['brainstorm', true, 'row', 'owner']` add `['milestones', true, 'row', 'public']`.
    - The setup test expects 3 cards in the milestone row, the milestone deck empty, 3 Milestones in the box and every seat's milestones row empty.
    - `Object.keys(game.playerValues!)` gains `'operational revenue'` last.
  - **Append `it('has the 6 Milestones of §20.G with their VP')`:** the six names, one each, and `sum(…, 'vp')` 41.
  - **Invariants:**
    - the 6 Milestones: the milestone row and every milestones row hold 3 together, and the box the other 3;
    - a card enters a milestones row only from the milestone row, and never leaves one;
    - a First Mover Advantage is claimed only in a `LAUNCH` press of a `Tier 2` card, a Clean Launch only in a `LAUNCH` press, and a Revenue Leader only by the seat that reached its Income in the move (`enteredIncome`) with an `operational revenue` of 10 or more.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Cards** (§20.G). Right after the Strategy table add:

```text
  A deck called milestones, starting in the milestone deck:
    | name                  | vp | copies |
    | First Mover Advantage | 5  | 1      |
    | Talent Magnet         | 8  | 1      |
    | Platform Power        | 10 | 1      |
    | Revenue Leader        | 6  | 1      |
    | Clean Launch          | 5  | 1      |
    | Full Stack Founder    | 7  | 1      |
```

  - **Table.** After `  The strategy discard is a pile in the center that everyone can see.` add the first two lines, and after `  Each player has a brainstorm row that only they can see.` the third:

```text
  The milestone deck is a pile in the center that no one can see.
  The milestone row is a row in the center that everyone can see.
```

```text
  Each player has a milestones row that everyone can see.
```

  - **Setup** (§4.3). After `  The market crash goes into the bottom fifth of the growth deck.` add:

```text
  Shuffle the milestone deck.
  Deal up to 3 cards from the milestone deck to the milestone row.
  Move the milestone deck to the box.
```

  - **Operational revenue** (§9.A). Right after the last player-value section plan 4-2 wrote (`Bugged products:`) add:

```text
Operational revenue:
  A player's operational revenue is the total rev of the cards in their operations.
```

  - **Launch** (R1, ruling 24). In the launch button, right before `      The graduation phase starts with them.` add:

```text
      If it is a Tier 2 card and the milestone row has a First Mover Advantage, move the first mover advantage from the milestone row to their milestones.
      If the milestone row has a Clean Launch, move the clean launch from the milestone row to their milestones.
```

  - **Income** (R1). In `Phase: income`'s `When this phase starts:`, after `    For each card in their operations whose rev is more than 0, they get 1 market share.` add:

```text
    If their operational revenue is at least 10 and the milestone row has a Revenue Leader, move the revenue leader from the milestone row to their milestones.
```

  - **The score** (§12.5). After `  Each card in a player's ops team scores its human capital.` add `  Each card in a player's milestones scores its vp.`
  - **Append these 5 examples.**

```text
Example: setup reveals 3 of the 6 Milestones and puts the rest in the box (section 4, section 20)
  Given the game is set up
  Then the milestone row has 3 cards
  And the milestone deck is empty
  And the box has 3 cards
  And p0's milestones is empty

Example: the first Tier 2 Launch claims First Mover Advantage, and the first Launch of any product claims Clean Launch, each for good (section 12, section 20, ruling 24)
  Given the phase is actions
  And the milestone row has a First Mover Advantage, a Clean Launch and a Platform Power
  And p0's development has a Neobank and a Dating App
  And the Neobank in p0's development has 10 blue cubes
  And the Neobank in p0's development has the Architect on it
  And the Dating App in p0's development has 6 blue cubes
  When p0 launches the Neobank
  Then p0's milestones has a First Mover Advantage and a Clean Launch
  And the milestone row has a Platform Power
  When p0 launches the Dating App
  Then it is accepted
  And p0's milestones has 2 cards

Example: a Tier 3 Launch claims no First Mover Advantage, though it is a Clean Launch (section 20)
  Given the phase is actions
  And the milestone row has a First Mover Advantage, a Clean Launch and a Talent Magnet
  And p0's development has a Quantum Computer
  And the Quantum Computer in p0's development has 18 red cubes
  And the Quantum Computer in p0's development has the Engineer on it
  When p0 launches the Quantum Computer
  Then it is accepted
  And p0's milestones has a Clean Launch
  And the milestone row has a First Mover Advantage and a Talent Magnet

Example: the first player to collect $10 of Operational Revenue in one Income claims Revenue Leader (section 9, section 20)
  Given the milestone row has a Revenue Leader, a Clean Launch and a Talent Magnet
  And p1's operations has an App Store, a Trading Bot and a Mobile Wallet
  And p1's ops team has the Architect and a Junior Software Dev
  And the turn passes to the left
  Then the phase is income
  And p1 has 17 capital
  And p1's milestones has a Revenue Leader

Example: each Milestone claimed scores its face value (section 12)
  Given the crash pile has the Market Crash
  And it is p1's turn
  And p0's milestones has a Platform Power and a Clean Launch
  When p1 ends their actions
  Then the game is over
  And p0 scores 16
  And p1 scores 1
```

  **How the numbers come** (§4.3, §9.A, §12, §20.C, §20.G):
  - **The reveal:** 3 of the 6 face up, the rest returned to the box (§4.3).
  - **VP:** First Mover 5, Talent Magnet 8, Platform Power 10, Revenue Leader 6, Clean Launch 5, Full Stack Founder 7 (§20.G); 7 capital is 1, so 1 + 10 + 5 = 16.
  - **Revenue Leader:** App Store 4 + Trading Bot 4 + Mobile Wallet 2 = 10 (§20.C.1); maintenance 1 + 2 + 1 = 4 Blue against the Architect's 3 and a Junior's 1; 7 + 10 = 17; the Architect's $2 keeps p1 at Income.
  - **Launches:** the Neobank (Tier 2, 10 Blue) led by the Architect; the Quantum Computer (Tier 3, 18 Red, pure Hardware) led by the Engineer (§3).
  - **Lines each example pins:** 1 the reveal's three lines; 2 both Launch lines and their row tests (a second Launch would throw without them); 3 First Mover's Tier 2 test; 4 the Income line and Operational revenue; 5 the score line.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator reveals 3 of the 6 Milestones, claims First Mover, Clean Launch and Revenue Leader at their moment, and scores each at face value

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: The claims as play happens, the guard against an undecided Offline set, and the last check

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: plan 5-1's `When a player …:` frame, End waiting for it, `they have at least {int} cards in {zones} whose {cardfilter}`, `a player's {playervalue} is the number of different {attribute} values among {cardgroup}`, `it is a card whose {cardfilter}`; plan 4-2's ops check and final check.
- Produces (rules): the player flag `choosing offline products`; the player value `active tags`; worked flags `hardware side`, `software side`; three rules in `In every phase:`.

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₅ + 33; the designer page's count too. `Object.keys(game.playerValues!)` gains `'active tags'` last; the values test adds `hardware side`, `software side` (flags).
  - **Invariants (Review Focus 3):**
    - a seat is `choosing offline products` (`playerFact(state, seat, 'choosing offline products') === true`) only while its turn is in `ops check`, or its step in `final check`;
    - a Talent Magnet, Platform Power or Full Stack Founder enters a seat's milestones row only in a move after which that seat meets it, read through the runtime: 2 or more of its cards in bench, development team and ops team with a worked `xp` above 2; `active tags` of 3 or more; a card in its operations that is `hardware side` and one that is `software side`;
    - a Platform Power or Full Stack Founder never enters the milestones row of a seat that is `choosing offline products` after the move (a claim from its own undecided set). Another seat may be choosing by then: a claim made before the turn passed on stands.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Players.** After `  Players can have mentoring.` add `  Players can be choosing offline products.`
  - **The ops check** (R1, M1). In `Phase: ops check`:
    - after `    Every card in their operations is not offline.` add `    They are choosing offline products.`;
    - in `A player may confirm the products online.`, before `      Go to income.` add `      They are not choosing offline products.`;
    - in `When their blue supply is at least their blue load:`, before `    Go to income.` add `    They are not choosing offline products.`
  - **The final check.** In `Phase: final check`, right after its `Hint:` line add:

```text
  When this phase starts:
    They are choosing offline products.
```

    and in `When their blue supply is at least their blue demand:`, before `    The final check passes to the left.` add `    They are not choosing offline products.`
  - **Active tags** (§20.G, ruling 5). Right after the `Operational revenue:` section add:

```text
Active tags:
  A player's active tags is the number of different tag values among the cards in their operations that are not offline.
```

  - **The sides** (§20.G's lists, ruling 25). Right after the `Workshop ready:` section add:

```text
Hardware side:
  Only if it is not offline.
  Only if one of:
    It is a card whose tag is IoT.
    It is a card whose tag is Robotics.
    It is a card whose tag is Energy.
    It is a card whose tag is Fusion.
    It is a card whose tag is Longevity.
    It is a card whose tag is Quantum.

Software side:
  Only if it is not offline.
  Only if one of:
    It is a card whose tag is App.
    It is a card whose tag is Social.
    It is a card whose tag is Commerce.
    It is a card whose tag is Media.
    It is a card whose tag is Crypto.
    It is a card whose tag is Metaverse.
    It is a card whose tag is DeFi.
```

  - **The claims as play happens** (§12.5, R1). At the end of `In every phase:` add:

```text
  When a player has at least 2 cards in their bench, their development team and their ops team whose xp is more than 2:
    Only if the milestone row has a Talent Magnet.
    Move the talent magnet from the milestone row to their milestones.
  When a player's active tags is at least 3:
    Only if no player is choosing offline products.
    Only if the milestone row has a Platform Power.
    Move the platform power from the milestone row to their milestones.
  When a player has a card in their operations that is hardware side:
    Only if they have a card in their operations that is software side.
    Only if no player is choosing offline products.
    Only if the milestone row has a Full Stack Founder.
    Move the full stack founder from the milestone row to their milestones.
```

  - **Append these 9 examples.**

```text
Example: Talent Magnet goes to the first player with 2 employees of 3 or more Permanent XP, a Junior on the bench included, once a Launch graduates the second (section 12, section 20, ruling 25)
  Given the phase is actions
  And the milestone row has a Talent Magnet, a Clean Launch and a Platform Power
  And p0's bench has a Junior Software Dev
  And the Junior Software Dev in p0's bench has 3 blue xp
  And p0's development has a Smart Lock
  And the Smart Lock in p0's development has 1 blue cube
  And the Smart Lock in p0's development has 5 red cubes
  And the Smart Lock in p0's development has a Junior Hardware Eng on it
  And the Junior Hardware Eng in p0's development team has 2 red xp
  And the Junior Hardware Eng in p0's development team has 1 pending red
  Then the milestone row has a Talent Magnet, a Clean Launch and a Platform Power
  When p0 launches the Smart Lock
  Then p0's milestones has a Talent Magnet and a Clean Launch

Example: two players meeting Talent Magnet at the same moment: it goes to the Active Player (section 12)
  Given 3 players
  And it is p2's turn
  And the milestone row has a Talent Magnet, a Clean Launch and a Platform Power
  And p0's bench has a Junior Software Dev and a Junior Hardware Eng
  And the Junior Software Dev in p0's bench has 3 blue xp
  And the Junior Hardware Eng in p0's bench has 3 red xp
  And p2's bench has a Junior Software Dev and a Junior Hardware Eng
  And the Junior Software Dev in p2's bench has 3 blue xp
  And the Junior Hardware Eng in p2's bench has 3 red xp
  When p2 recruits a junior qa tester
  Then p2's milestones has a Talent Magnet
  And p0's milestones is empty

Example: Platform Power needs 3 Active products providing different Tags: two of one Tag count once, and an offline product not at all (section 20, ruling 5)
  Given the phase is actions
  And the milestone row has a Platform Power, a Clean Launch and a Talent Magnet
  And p0's operations has a Dating App, a Viral Video App, a Mobile Wallet and a To-Do List
  And the To-Do List in p0's operations is offline
  And p0's development has a Smart Lock
  And the Smart Lock in p0's development has 1 blue cube
  And the Smart Lock in p0's development has 5 red cubes
  Then p0's active tags is 2
  When p0 launches the Smart Lock
  Then p0's milestones has a Platform Power and a Clean Launch

Example: nothing is claimed from the products an ops check brings back online until the player has chosen which to switch off (section 5, the slice's R1)
  Given the milestone row has a Platform Power, a Clean Launch and a Talent Magnet
  And p1's operations has a Dating App, a Mobile Wallet, a To-Do List and a Health Tracker
  And the To-Do List in p1's operations is offline
  And the Health Tracker in p1's operations is offline
  And p1's ops team has a Junior Software Dev, a Junior Software Dev and a Junior Software Dev
  And the turn passes to the left
  Then the phase is ops check
  And p1's milestones is empty
  When p1 switches off the Health Tracker
  And p1 confirms the products online
  Then the phase is actions
  And p1's milestones has a Platform Power

Example: Full Stack Founder is not claimed from an Offline set still undecided either (section 5, the slice's R1)
  Given the milestone row has a Full Stack Founder, a Clean Launch and a Talent Magnet
  And p1's operations has a Smart Lock and a Dating App
  And the Smart Lock in p1's operations is offline
  And p1's ops team has a Junior Software Dev
  And the turn passes to the left
  Then the phase is ops check
  And p1's milestones is empty
  When p1 switches off the Smart Lock
  And p1 confirms the products online
  Then the phase is actions
  And p1's milestones is empty

Example: Full Stack Founder needs Active products on the hardware side and on the software side: an offline one doesn't count, and a Platform Tag is neither (section 20, ruling 5)
  Given the phase is actions
  And the milestone row has a Full Stack Founder, a Clean Launch and a Talent Magnet
  And p0's operations has a Smart Thermostat, a Dating App and a Cloud Storage
  And the Smart Thermostat in p0's operations is offline
  And p0's development has a Smart Lock and a Viral Video App
  And the Smart Lock in p0's development has 1 blue cube
  And the Smart Lock in p0's development has 5 red cubes
  And the Viral Video App in p0's development has 6 blue cubes
  Then p0's milestones is empty
  Given the Dating App in p0's operations is offline
  When p0 launches the Smart Lock
  Then the milestone row has a Full Stack Founder and a Talent Magnet
  When p0 launches the Viral Video App
  Then p0's milestones has a Full Stack Founder and a Clean Launch

Example: a product the game-end Ops check brings back online claims Platform Power before the score (section 12, the slice's R1)
  Given the crash pile has the Market Crash
  And it is p1's turn
  And the milestone row has a Platform Power, a Clean Launch and a Talent Magnet
  And p0's operations has a Dating App, a Mobile Wallet and a To-Do List
  And the To-Do List in p0's operations is offline
  And p0's ops team has a Junior Software Dev, a Junior Software Dev and a Junior Software Dev
  When p1 ends their actions
  Then the game is over
  And p0's milestones has a Platform Power
  And p0 scores 19

Example: the last Milestone check runs after every player's game-end Ops check, from the player whose turn ended the round (section 12, the slice's R1)
  Given the crash pile has the Market Crash
  And it is p1's turn
  And the milestone row has a Platform Power, a Clean Launch and a Talent Magnet
  And p0's operations has a Dating App, a Mobile Wallet and a To-Do List
  And the To-Do List in p0's operations is offline
  And p0's ops team has a Junior Software Dev, a Junior Software Dev and a Junior Software Dev
  And p1's operations has a Viral Video App, a Payment Gateway and a Basic Website
  And the Basic Website in p1's operations is offline
  And p1's ops team has a Junior Software Dev, a Junior Software Dev and a Junior Software Dev
  When p1 ends their actions
  Then the game is over
  And p1's milestones has a Platform Power
  And p0's milestones is empty

Example: an ops check that can run every product claims Platform Power once it passes (section 5, section 20)
  Given the milestone row has a Platform Power, a Clean Launch and a Talent Magnet
  And p1's operations has a Dating App, a Mobile Wallet and a To-Do List
  And the To-Do List in p1's operations is offline
  And p1's ops team has a Junior Software Dev, a Junior Software Dev and a Junior Software Dev
  And the turn passes to the left
  Then the phase is actions
  And p1's milestones has a Platform Power
```

  **How the numbers come** (§5 Phase B, §12, §20.C, §20.G, rulings 5, 24, 25):
  - **Talent Magnet:** 2 employees, Bench or Board, with 3 or more Permanent XP each (§20.G); the Hardware Eng graduates its Red token at Launch, 2 + 1 = 3 (§11.B.2).
  - **Ties:** at one moment, the Active Player, else the next in turn order (§12.5); at the last check, the player whose turn ended the round (the Rust engine's reading, R1).
  - **Tags** (§20.C.1): Dating App and Viral Video App Social, Mobile Wallet and Payment Gateway Commerce, To-Do List App, Health Tracker Data, Smart Lock and Smart Thermostat IoT, Cloud Storage and Basic Website Platform. Social, Commerce and App are software side; IoT hardware side; Platform and Data neither (§20.G).
  - **Bandwidth:** each Junior Software Dev gives Blue 1; the four products of the ops-check example need 4, so one goes off; the Smart Lock needs Red 1, which no one gives.
  - **The final check's score:** 7 capital is 1, vals 5 + 2 + 1 = 8, Platform Power 10: 19.
  - **Lines each example pins:** 1 the Talent Magnet rule; 3 the Platform Power rule and Active tags' `not offline`; 4 the ops check's start flag, the confirm's clear and Platform Power's guard; 5 Full Stack Founder's guard; 6 the Full Stack Founder rule, both sides' `not offline` and their Tag lines for IoT and Social; 7 the final check's clear; 8 the final check's start flag (without it p0 would claim at its own step); 9 the ops check's other clear. 2 is a guard (§12.5, plan 5-1's order). The Tag lines no example names (Robotics, Energy, Fusion, Longevity, Quantum, App, Commerce, Media, Crypto, Metaverse, DeFi) survive a single removal: they are table data copied from §20.G, checked by the test below, not by the probe.
  - **Append `it('puts every Tag of §20.G on its side, and no other (§20.G)')`:** for each product of the seed and growth decks with a `tag`, in an operations row and online, `hardware side` holds exactly for IoT, Robotics, Energy, Fusion, Longevity and Quantum, and `software side` exactly for App, Social, Commerce, Media, Crypto, Metaverse and DeFi (read through `runtime.workedFlag`).
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe (the Tag lines excepted, as above).
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator claims Talent Magnet, Platform Power and Full Stack Founder as play happens, never from an undecided Offline set, with the last check after every final Ops check and ties to the Active Player

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: Long runs: every Strategy, Training and Milestone path tallied, whole games replayed; the README and the checks

**Files:**
- Modify: `src/games/startup-simulator.test.ts`, `README.md`

**Interfaces:**
- Consumes: every constant and policy above and in plan 5-2a.
- **The auto-player gains `mentorToProject()`**, in the planned list right after `pmToProject()`: when the bench holds a `Mentor` card and a project of its development has a card on it with worked `skills` above 0, it assigns the Mentor card there (`ASSIGN_TO_PROJECT`).
- **`happenings` gains these keys:**
  - `a brainstorm drawing 2` and `a brainstorm drawing 3`, for a `BRAINSTORM` or `BRAINSTORM_FLUSHING` press by the cards its brainstorm row holds after it (or the hand gained, when one card was kept at once);
  - `a single strategy card kept at once`, for such a press whose `after` phase is not `brainstorm`;
  - `the strategy discard shuffled into the deck`, for such a press after which the strategy deck holds a card the discard held before;
  - `a strategy card discarded at cleanup`, for each `DISCARD_STRATEGY` press;
  - `Training: <card name> on a <kind>`, for each `PLAY_TRAINING` press, the kind being `Junior` for a Junior card and the card's name otherwise;
  - `a trained Junior declared <answer>`, for each declare press of a card with worked `skills` above 0 whose answer is not its native colour (`blue` for `software`, `red` for `hardware`, `qa` for `qa`);
  - `a badged Junior leading at the Engine`, in a move that ran the Engine, for each project of the mover with a `badged` Junior card on it that is `leading software` or `leading hardware` there;
  - `Bug Decay stopped by a QA Engineer` and `Bug Decay waived by a VP of Sales`, for the seat that reached its Income in the move, for each of its online products with `bugs` that is not `decaying`, by which flag spared it;
  - `a Sales Rep's XP bonus`, for the seat that reached its Income, for each online product with a card on it whose trait is `Rainmaker`, not onboarding, with `training xp` above 0;
  - `a milestone claimed: <name>`, for each card that entered a milestones row, and `a milestone claimed at the last check` for one that entered it in the move that set the result.

- [ ] **Step 1: Write the tests.**
  - **`'made every move in those runs …'`** also expects above 0: `BRAINSTORM`, `BRAINSTORM_FLUSHING`, `KEEP_STRATEGY`, `DISCARD_STRATEGY`, `PLAY_TRAINING`, each of `KEEP_PENDING`'s three buttons, and `MENTOR`.
  - **Append `it('played slice 5’s Strategy and Milestones in those runs: Brainstorms of 2 and 3, a flush and a reshuffle, the cleanup, every Training card on every kind it fits, trained Juniors declared, and five of the six Milestones claimed')`.** It expects above 0:
    - `a brainstorm drawing 2`, `a brainstorm drawing 3`, `the strategy discard shuffled into the deck`, `a strategy card discarded at cleanup`;
    - `Training: Full Stack Bootcamp on a Junior`, `Training: QA Certification on a Junior`, `Training: QA Certification on a QA Engineer`, `Training: Sales Seminar on a Sales Rep`, `Training: Leadership Masterclass on a Junior`, `Training: Leadership Masterclass on a QA Engineer`, `Training: Leadership Masterclass on a Sales Rep`, `Training: Agile Workshop on a Junior PM`;
    - `a trained Junior declared blue`, `a trained Junior declared red`, `a trained Junior declared qa`;
    - `a milestone claimed: First Mover Advantage`, `… Clean Launch`, `… Revenue Leader`, `… Platform Power`, `… Full Stack Founder`.

    Counted but not required, each pinned by its examples: `a single strategy card kept at once`; `a badged Junior leading at the Engine`, `Bug Decay stopped by a QA Engineer`, `Bug Decay waived by a VP of Sales` and `a Sales Rep's XP bonus` (each needs one Training card, or two, on one card that then works where it matters); `a milestone claimed: Talent Magnet` (two employees of 3 XP take three graduations each) and `a milestone claimed at the last check`.
  - **Plan 5-2a's talent test** also requires `a token kept by choice` and `the Mentor's second token`, now that Training gives Skill tokens.
  - **Append `it('takes back the last move and rebuilds whole games from their logs, through Brainstorms, a reshuffle, Training and Milestone claims (Review Focus: 3 players, seeds 1 to 5)')`.** Play each game to its result, keeping the state before each move; `loadLog` rebuilds the final state and `engine.undo()` gives the state before the last move. Across the five logs some log holds a reshuffle, a `PLAY_TRAINING` that answered a choice or had it filled in, and a Milestone claim (count them through the watch).
  - **Kept as they are:** `'plays the same game through the page’s view as without it'` (now through Training's several target zones) and every earlier tally.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`.
  - If a required key stays at 0, print the tally and change the auto-player (Brainstorm's cadence, Training's target rule, `mentorToProject`), never the rules.
  - Report a key that stays unreachable.
- [ ] **Step 3: Write the README.**
  - **The Startup paragraph** becomes "**Startup Simulator (slice 5)**". After plan 5-2a's talent sentence, add: players Brainstorm for Strategy cards into a hidden hand held to 3, the deck reshuffling its discard; the five Training cards give Skill tokens, Specialists' XP and Badges; and 3 of the 6 Milestones go to the first player to meet them, claimed at the moment or as play happens and checked once more after the final Ops check. Its rulings list adds 10 and 24's Milestones.
  - **"It still leaves out"** becomes: the Strategy cards other than Training (Attributes, Utility, Warfare), the Events and Crunch Time, Face-Down Greenlight and the Audit, Partners' free License, Dividends and the Consultant, Integration, selling and poaching, the HR Manager's and the Director of QA's perks, and Hype and Scandal. Each comes in a later slice.
  - **Plan 5-1's README paragraph** ("Counting, targets in several zones, decks that shuffle back, and rules about a player.") gains a last bullet, `- **Startup Simulator** plays slice 5 this way: …`, naming `A card's blue team output goes up by its pm count times its blue workers.`, Brainstorm's `…, shuffling the strategy discard into it when it runs out.`, the Training button's three target zones, `A player's active tags is the number of different tag values among …`, and `When a player has at least 2 cards in their bench, their development team and their ops team whose xp is more than 2:`.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 5: Run the checks.** The first three print nothing. The fourth prints only the Startup count line in `designer-page.test.tsx` and any pin a task reported.

```bash
# no shared code and no page code changed
git diff --stat "$BASE" -- src/engine src/utils
git diff --stat "$BASE" -- src/pages ':!src/pages/designer/*.test.tsx' ':!src/pages/designer/*.test.ts'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# the page tests' changed lines
git diff "$BASE" -- src/pages/designer | grep -E '^[-+][^-+]'
```

  Also read every number in the new examples against each task's "How the numbers come", and run the removal probe once more over every line plans 5-2a and 5-2b added or changed (the Tag lines excepted).
- [ ] **Step 6: Run the games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
- [ ] **Step 7: Commit**

```bash
git add src/games/startup-simulator.test.ts README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's long runs Brainstorm, play every Training card, choose graduations with the Mentor and claim the Milestones at 2 to 5 players, every path tallied and whole games rebuilt from their logs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Forward notes for plan 5-3

- **Hidden zones:** each player's `strategy hand` and `brainstorm` are rows only they see; rivals need their sizes (§3, the overview's page). The `strategy discard` is a public pile, the `milestone row` a public shared row, each player's `milestones` a public row.
- **The page's buttons:** the Training button picks its target in three zones (plan 5-1's `ontoAlso`); its Bootcamp asks Blue or Red only when both fit. Brainstorm's flush picks a set from the Strategy Hand.
- **No new shown flag or stand-in:** the Training fits and the sides are read by no value line.

## Forward notes for later slices

- **Slice 6:** each Attribute and Utility card gets its own guard in the Training button's shape, or a button of its own where it targets other zones (debuffs target an opponent's Board); Online Course Boom changes the price guard and `They pay the card's price.` to $1 while the Event is in play.
- **Slice 8:** a Market Sale's buyer meeting Platform Power or Full Stack Founder is asked in turn from the last turn's seat (plan 5-1); Cease & Desist becomes playable.

## Gaps against plan 5-1

None that needs engine work: every line above is written with plan 4-1's and 5-1's phrases. Two wordings differ from R6 and R10 because of what the language reads, and are recorded as calls in the Architecture:
- R10's `brainstorm, flushing some cards …` can't be a button line (a pick line's base must not hold a comma), so it is `brainstorm after flushing some cards from their strategy hand`.
- R6's five Training buttons can't be told apart by an example (same words, source and target zones; P16 narrows by target zone only), so Training is one button with a guard per card.
