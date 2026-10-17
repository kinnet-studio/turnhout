# Startup Simulator Slice 6-1 (Language) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The rules language gains every general piece slice 6 needs that plans 4-1 and 5-1 left out:
- a button's target card picked in another player's zone;
- value lines that a flag turns on and that go up or down by a number or by another of the card's numbers, plus any card's number, and a number for each of a count;
- the lower of a card's number and its target card's, asked and paid, and a game number that goes up;
- steps each player takes in turn from the start player when a round starts, before the start player's turn.

All of it is tested with fixtures in general words. Startup Simulator's text does not change.

**Architecture:**
- **This is plan 6-1 of three.** Plan 6-2 writes the rules text and the long runs; plan 6-3 the page. Nothing here touches `src/games/**` or `src/pages/**`.
- **Five tasks.** The spec's "What the language gains" maps onto them like this:
  1. **Targets in another player's zone** (item 1, the Debuffs' "an opponent's Board staff").
  2. **Value lines a flag turns on, any card's number, and a number for each of a count** (items 1 and 2: Workaholic, the Events' modifiers, Hype).
  3. **The lower of two prices, and a game number that goes up** (item 4, plus Chip Shortage and Intern Season on the University).
  4. **Steps at the start of a round** (item 5, plus the per-player half of item 3).
  5. **An example for each piece, a card revealed at a round's start that acts once, the README and the checks** (items 3 and 6).
- **Where things live.**
  - Target zones: `ZoneRef` gains `{ others: string }`. Compile reads it in `compile-phase.ts`; the zone ids come from `ontoZoneIds` in `declared-moves.ts`.
  - Value lines: `card-value-phrases.ts` (flagged, joining `FLAGGED_VALUES`) and `card-subject-phrases.ts` (any card). Both are card-only to `worked-view.ts`.
  - Prices: `card-pick-phrases.ts`, plus one effect in `game-numbers.ts`.
  - Round steps:
    - `turns.ts`: `ROUND_STEPS_KEY`, `ROUND_STEPS_PHRASE`, `roundFinished`;
    - `turn-phrases.ts`: the effect, and the pass that ends a step;
    - `runtime.ts`: `startTurn`, `turnWaiting`, `endStepsDue`;
    - `compile.ts`: the checks and `EveryPhase.roundSteps`.
  - `lang:round-steps` is the only new `state.data` key. No card `data` key, no `CardState` change, no new flow rule.
- **Builder calls this plan makes** (the spec leaves wordings to the builder):
  - **Another player's zone.**
    - It is written `… to a card in another player's development team or another player's ops team.` It is read only as a zone a button picks its target card in; anywhere else it is refused on the line.
    - The targets are offered place by place in the order written. Within one place they go seat by seat from the presser's left, and a seat that is out is skipped.
    - An example's `… to the Hacker` takes the first such zone that holds one. `… to the Hacker in p2's development team` (4-1's P16) names another.
  - **Round-long modifiers** are worked flags that read the card shown with the built `{sharedzone} has {card}` (`Only if the event in play has the Tech Bubble.`). Value lines turn on by those flags.
    - Task 2 proves both.
    - It also proves that the view never labels a flag that reads a zone in the centre. That fails closed, and 6-3 decides whether to label Event modifiers.
  - **The value lines are explicit patterns, not a frame.** Each flagged line joins `FLAGGED_VALUES`, so the page labels the flag as it labels `stalled`.
    - Nothing so far stays nothing.
    - No line floors at 0: `a card's {attribute} is at least {int}` (4-1) says where.
    - The set is what slice 6 needs:
      - up by a number: Workaholic's output and salary, Tech Bubble, the two Booms;
      - down by a number: Server Crash, Logjam, Toxic's cube;
      - up by another number: Legacy Code through 5-2a's `bug decay`;
      - a constant for any card: Chip Shortage's rehire price;
      - a number for each of a count: Hype's +5.
  - **Prices that don't stack:** `the lower of the card's {attribute} and the target card's {attribute}`.
    - A side without the number is left out.
    - TechCrunch's Trade Show price is a flagged value on the played card. Its Sales Rep price is a value the product has only when a Sales Rep is on it: a section named after the Strategy table's `price` column, so a product with no Rep has no price.
    - The lower one is paid, never both discounts.
  - **University prices** are game numbers set in the round's start lines: `The hardware junior price is 2.`, then `If the event in play has the Chip Shortage, the hardware junior price goes up by 3.` This keeps the rulebook's "+$3" in the text.
  - **Reveal effects need no new phrase.** The reveal is a round-start line, so "once, when revealed" means the lines after the deal in the same `When a round starts:` (`If the event in play has the Angel Investors, …`). A per-player reveal goes through Task 4's steps. Task 5 plays the pattern through.
  - **Steps at the start of a round:** `Each player has the levy, in turn from the start player.`
    - Where it may stand: only under `When a round starts:` (an `If …,` around it is fine), as the last such line, and at most once in the game.
    - What it does: it enters the phase at the start player (or the next seat still in), and runs the phase's start lines about each seat as its step begins. The step passes with 4-1's `The levy passes to the left.`
    - After the last seat, the turn that was waiting starts, in the phase it was waiting in: no round starts again and no turn line runs twice.
    - While the steps run, or have just ended, the round is not finished, so End is not decided in that moment.
    - A step phase that nothing passes on, or where everyone acts at once, is refused, and so is a go-to or After line in it.
  - **One set of steps per round** keeps a stranded round impossible to write. 6-2 puts Angel Investors and Regulation Audit in one step phase, and slice 7's Consultant moves join it (forward note).
  - **Toxic Personality in the Ops pool needs no player-value refinement.**
    - The cube comes off a value on the Toxic card itself: `A pool toxic blue card's pool blue goes down by 1.`
    - The flag reads 5-1's owner scope (`its owner has a card in their ops team that is … and whose blue output is more than 0`).
    - The team totals become totals of that value. It is recorded here so 6-2 doesn't stop for it.
  - **Example vocabulary needs no new phrase.** `When p0 jinxes the Statue to the Vase in p2's workshop`, `Then the fee is 3`, `Then the phase is levy`, `And it is p1's turn` and `Then the omen has the Toll` all exist. Tasks 1, 3, 4 and 5 prove each.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-6-attributes-utility-events-design.md` is binding, and its "Builder-check rulings" R1–R3 win over its body.
- R1: Toxic is one cube off the team total, Blue first.
- R2: Attributes are counts on the Talent plus a parked card.
- R3: Burnout is absolutely 0.

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding as amended, especially its anti-goals:
- Startup words in shared code;
- hidden information leaking;
- a game that can't end.

The evidence is `builder-check-startup-6.md` in the session scratchpad. Plans 4-1 and 5-1 (their Interfaces blocks and Global Constraints amendments) are inputs, as are 4-2, 5-2a, 5-2b and 5-3 where named.

## Global Constraints

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.**
  - `lang:round-steps` is the only new `state.data` key. No new key in a card's `data`.
  - The new field `EveryPhase.roundSteps` is optional and left out, never set to `undefined`, so `compile.test.ts`'s `everyPhase` `toEqual`s hold.
  - A game without the new lines builds exactly the same `FlowDef` and compiled shape as before.
- **No Startup Simulator words in shared code** (code, comments, test names and fixture strings), in every form:
  - plan 5-1's list (1b-2's, slice 3's, slice 4's and slice 5's words);
  - **slice 6's:** workaholic, clean coder, visionary, toxic, burnout, flight risk, techcrunch, design sprint, cease, desist, hype, utility, buff, debuff, venture capital, bubble, patent, troll, angel, investor, legacy, regulation, audit, open source, hackathon, chip shortage, crunch, server crash, logjam, frenzy, intern, headhunter, course boom, whistleblower, trade show, event.
  - **"Attribute" in the game's sense** (a kind of Strategy card) is never written. The language's `{attribute}` type and `CardFilter.attribute` keep their names.
  - Ordinary words to avoid: "a mistake in the code", not "a bug"; "waiting", not "pending"; "goes to", not "leads"; "moment" or "happening", not "event".
  - **`CREW_GAME`'s hands have a `skill` column.** New fixture lines read `wage`, `pay`, `worth` or a worked value by its own name. Plan 4-1's `MEND_GAME` already reads `skill`, so it is left alone.
  - The banned words may appear in `src/games/startup-simulator.*`, `README.md` and `docs/`.
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged; Rent Day keeps its 108 examples. Startup Simulator compiles with `[]` and its examples pass in the same number as at BASE.
- **Every number comes from the rulebook.** This plan's numbers are fixture numbers. Plan 6-2 cites the rulebook for each of Startup's.
- **Hidden information (3-2's, 4-1's and 5-1's lessons).**
  - What a seat's view shows is decided by the compiled rules alone, and never reveals a hidden card or zone.
  - `worked-view.ts` counts every phrase of `registerCardSubjectPhrases` and `registerCardValuePhrases` as card-only. A task that adds a phrase there updates the phrase-set test in `worked-view.test.ts`: its list, and the count in its title. It also adds the phrase to `CARDS_ON_IT` if it reads the cards on a card; none here does. A phrase that reads anything else of the table goes in another registrar.
  - Every phrase that reads a card carries its needs flags (`needsCard`, `needsCards`, `needsOnto`, `needsMove`), so `readsPressCard` and `reportHiddenCardReads` judge it. A target zone of another player's is judged by its own visibility.
  - A target the seat can't see is offered as `a face-down card` (`pickedAs`).
- **Every new phrase that changes a card's count or flag declares `writes`.** None here changes a card.
- **Refuse what strands play.** A game that can't end, or a press that silently does nothing, is an anti-goal.
  - Task 4's step lines are refused when the rules are read wherever they could leave a round unable to go on.
  - Task 3's payment with no number on either side throws a RuleError, so the press is refused.
- **Existing code and tests.**
  - New imported names go on new `import` lines in existing files.
  - Existing test lines change only where a task names them: the phrase-set test's title and list in `worked-view.test.ts` (Task 2). Tests may be appended and fixtures added to `testing.ts`.
  - If any other existing test fails, stop and report it instead of changing it.
  - **After widening a type, run `bun run typecheck` and read every narrowing on it.** Task 1 widens `ZoneRef`. Its narrowings at the time of writing:
    - `describeZone` (`library/support.ts`);
    - `moveZoneId` (`declared-moves.ts`);
    - `resolveZoneIds` (`zones.ts`);
    - `isOneZone` and `mayHideFromPresser` (`compile-phase.ts`);
    - the `'shared' in ref` test in `library/setup-phrases.ts`;
    - and whatever plan 5-1 added.
- **Earlier plans come first.** In execution order: 4-1, 4-2, 4-3, 5-1, 5-2a, 5-3 Task 1, 5-2b, then 5-3 Tasks 2–4.
  - Their code is named here as their Interfaces blocks name it.
  - Each task re-checks, at HEAD and by name, the names it consumes, and stops and reports one that differs.
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1: record `BASE=$(git rev-parse HEAD)`, run `bun run test` once for the passing count, and note Startup Simulator's example count.
- **Style.**
  - 2-space indent, single quotes, chainable registrars, comments that say why.
  - Commit prefix `feat(lang):`.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.
  - A test marked "(guard)" passes before and after its task.
  - `lineOf(text, line)` is `text.split('\n').indexOf(line) + 1`; define it locally where needed.
- **Fixture words** (general, never Startup's): jinx, charm, charmed, gusty, bonus, toast, cheap, bargain, fee, raise, levy, pawn, omen, omen deck, omen discard, Gale, Toll.

## Review Focus

- **A round's steps when every seat's step passes at once, when a seat is out, or when a step's own start lines pass it on.**
  - Expected: the start player's turn starts in the same flow, after every step; a seat that is out has no step.
  - Tests: Task 4.
- **The moment a round's steps end.**
  - Expected: the game is not decided then (the round has only begun), the round counter does not move again, and the turn's start lines run once.
  - Tests: Task 4, "the round is not finished as its steps end".
- **A target in another player's zone that only they can see, in a seat that is out, or in the presser's own zone.**
  - Expected:
    - an `Only if` line reading such a target is refused when the rules are read;
    - the view offers that zone's cards as face-down cards;
    - an out seat's cards are not offered, and a press naming one is refused;
    - the presser's own card is refused with the button's prompt.
  - Tests: Task 1.
- **A line a flag turns on, for a card without that number, and a flag that reads a zone in the centre.**
  - Expected: nothing so far stays nothing. The flag still changes the value, but the page never labels it.
  - Tests: Task 2.
- **The lower of two prices** when one side has no number, neither has one, both are discounted, or the player has only the lower amount.
  - Expected:
    - the side with a number is paid;
    - with neither, the press is refused with the line's words;
    - with both, the lower is paid, never less;
    - the player can afford the lower amount.
  - Tests: Task 3.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name, not by line. If one is missing or differs, stop and report it.

- **Plan 4-1, built:**
  - `END_STEPS_KEY`, `STEP_PASSES_PHRASE`, `roundFinished`, `clearTurnMarkers`, `startPlayerOf`, `ROUND_KEY`, `TURN_OF_KEY` (`turns.ts`);
  - `stepPassesLeft`, the private `nextStep`, `turnPassesLeft`, `STEP_OUTSIDE_THE_STEPS`, `TURN_IN_THE_STEPS` (`library/turn-phrases.ts`);
  - `startTurn`, `turnWaiting`, `endStepsDue`, `startEndSteps`, `endStepsDone`, `runInPhase`, `env.runLine` (`runtime.ts`);
  - in `compile.ts`:
    - `compileEveryPhase`, `everyPhaseEffects`, `effectsOf`, `linesDoing`;
    - `warnUnreachable(…, reached)`, `endSteps`, `warnStepsNeverPass`;
    - `STEPS_NEVER_PASS`, `STEPS_GO_TO`, `STEPS_AFTER`, `STEPS_AT_ONCE`, `GO_TO_PHASE`;
  - `FLAGGED_VALUES` and `flaggedHas`/`flaggedHasIts` (`library/card-value-phrases.ts`);
  - `FROM_COLUMN`, `CARDS_ON_IT`, and `a card's {attribute} is at least {int}` (`library/card-subject-phrases.ts`);
  - `LINE_ABOUT` (`compile.ts`, ends at ` goes up by `);
  - P16 in `library/card-pick-phrases.ts`: `Press`, `buttonsFor`, `fitsWording`, `wordingsOf`, `ontoZoneOf`, `pressesCardButton`, and the `… to {card} in {zone}` patterns;
  - `STEPS_GAME`, and `end-steps.test.ts`'s local `table`, `press`, `round`, `coinsOf`, `withCoins`, `thrown`, `compiled`, `errorsOf` (copy them).
- **Plan 5-1, built:**
  - `CardPick.ontoAlso`, `ontoPlaces` (`declared-moves.ts`), `OR_SEPARATORS` and `splitList` (`phrases.ts`);
  - `compileCardPick`'s several target zones, with `reportHiddenCardReads` checking each;
  - `ontoPrompt`, `ontoCandidates` and `aboutCards` over several zones;
  - the target conditions and effects (`the target card is {cardflag}`, `the target card gains {int} {attribute}`);
  - `a card's {attribute} goes up by its {attribute}` and `… times its {attribute}` at the end of `registerCardSubjectPhrases`, with the phrase-set test titled "are these 22";
  - `deal up to {int} card(s) from {zone} to {zone}, shuffling {zone} into it when it runs out`;
  - `If … and …, …`; `LAST_TURN_KEY`; `COACH_GAME`.
- **Plan 5-3:** `pressFlags` and `holderFlags` in `worked-view.ts`. If 5-3 changed the phrase-set test's count, Task 2 adds 8 to the count it finds.
- **The language at HEAD:**
  - `numberIfAny` (private), `cardNumber`, `cardHasFlag`, `cardValueOf`, `movedCard`, `theTargetCard`, `theyOf`, `describeZone`, `soleZone` (`library/support.ts`);
  - `gameNumber`, `setGameNumber`, `markOut`, `playersIn`, `nextIn`, `isOut` (`board-state.ts`);
  - `transfer` (`library/board-phrases.ts`);
  - `zoneIdFor`, `relocate`, `chooseNext`, `resolveZoneIds` (`zones.ts`);
  - `setPhase` (`game-state.ts`, read only);
  - `innerEffect` (`compile-util.ts`);
  - `seatExtras` and `pickedAs` (`board-view.ts`);
  - `registerGameNumberPhrases`' `the {gamenumber} is {int}` (`library/game-numbers.ts`);
  - `fill` behind the Given `{zone} has {cardlist}`, which empties the zone first (`library/example-phrases.ts`);
  - `testing.ts`: `TURN_GAME`, `ROUNDS_GAME`, `CREW_GAME`, `WORKED_GAME`, `fixtureEnv`, `vocabFor`, `runPhrase`.

---

### Task 1: A button's target card in another player's zone

Before starting: re-check 5-1's several-target-zone names (`ontoAlso`, `ontoPlaces`, the split in `compileCardPick`, `ontoPrompt`, `ontoCandidates`, `aboutCards`) and 4-1's P16 names.

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`ZoneRef`; the `CardPick` doc).
- Modify: `src/engine/core/lang/zones.ts` (`othersZoneIds`; `resolveZoneIds`), `library/support.ts` (`describeZone`), `declared-moves.ts` (`moveZoneId`; `ontoZoneIds`).
- Modify: `src/engine/core/lang/compile-phase.ts` (`ANOTHER_PLAYERS`, `OTHERS_ONLY_AS_TARGET`, `othersZone`; `compileCardPick`, `isOneZone`, `mayHideFromPresser`).
- Modify: `src/engine/core/lang/declared-actions.ts` (`ontoCandidates`, the target check in `aboutCards`), `library/card-pick-phrases.ts` (P16's narrowing and `pressesCardButton` read the target zones through `ontoZoneIds`).
- Modify: `src/engine/core/lang/testing.ts` (`JINX_GAME`).
- Test: `compile-phase.test.ts`, `zones.test.ts`, `declared-actions.test.ts`, `board-view.test.ts`, `library/card-pick-phrases.test.ts` (all appended).

**Interfaces:**
- Consumes: `ontoPlaces`, `splitList`, `moveZone`, `parseParam`, `playersIn`, `isOut`, `zoneIdFor`, `pickedAs`.
- Produces (for Task 5 and plan 6-2):

```ts
// types.ts — `{ others: name }`: that zone of each other player still in, from the left of the player the line is about. Only the zone a
// button picks its target card in is written so (“… to a card in another player's crew”).
export type ZoneRef = { shared: string } | { each: string } | { others: string } | { of: SeatRef; zone: string };
// zones.ts
/** The zone `name` of every seat still in but `by`, from `by`'s left. */
export function othersZoneIds(state: GameState, seats: PlayerId[], by: PlayerId, name: string): string[];
// resolveZoneIds: an `others` ref gives othersZoneIds(env.state, env.seats, actor ?? env.subject?.player, …); with no player, Error.
// support.ts — describeZone: “another player's crew”.
// declared-moves.ts — moveZoneId: null for an `others` ref, as for `each`.
/**
 * Every zone a pick's target card may be in for `by`: place by place in ontoPlaces' order, an `others` place giving othersZoneIds; [] for
 * a pick with no target.
 */
export function ontoZoneIds(state: GameState, seats: PlayerId[], by: PlayerId, pick: CardPick): string[];
// compile-phase.ts
const ANOTHER_PLAYERS = /^another player['‘’]s (.+)$/i;
const OTHERS_ONLY_AS_TARGET = (text: string) =>
  `“${text}” can only name the zone of the card a button's cards go to, as in “… to a card in ${text}”.`;
```

- **Reading it** (`compileCardPick`).
  - A target part that matches `ANOTHER_PLAYERS` counts as a zone when 5-1's split cuts the target text.
  - Such a part is read by the private `othersZone(text, line, ctx)`: its name is read as `their <name>` is, with that reading's diagnostics, and `{ of: { who: 'actor' }, zone }` becomes `{ others: zone }`.
  - A `from` or `to` text that matches `ANOTHER_PLAYERS` gets `OTHERS_ONLY_AS_TARGET(text)` on the button's line, and no button is made.
  - `isOneZone` is false for `others`. `mayHideFromPresser` reads its name from `others`, and treats it as another seat's zone.
- **Using it.** Every reader of a pick's target zones for a seat goes through `ontoZoneIds`:
  - `ontoCandidates`;
  - `aboutCards`' check that the target is in one of them;
  - P16's `buttonsFor`;
  - `pressesCardButton`, which takes the target from the zone the press names, else from the first zone in order that holds a match not taken;
  - `ontoZoneOf` and `wordingsOf`, which read the first id.
  - `ontoPrompt` keeps each place's text as written: `another player's crew` is not turned into "your".
- **`testing.ts`:**

```ts
/** CREW_GAME where a player may jinx another player's job or hand: a card from their stash goes to the scrap, and the card it is played on is tired. */
export const JINX_GAME = CREW_GAME.replace('  A player may stop.', [
  "  A player may jinx a card from their stash to a card in another player's workshop or another player's crew.",
  '    Then:', '      The target card is tired.', '      Move it to the scrap.',
  '  A player may stop.'].join('\n'));
```

- [ ] **Step 1: Write the failing tests.**
  - **Compiled** (`compile-phase.test.ts`, `describe("a target card in another player's zone")`).
    - `JINX_GAME` compiles with `[]`. The jinx button's `pick` is:

      ```ts
      { some: false, from: { of: { who: 'actor' }, zone: 'stash' }, fromText: 'their stash', to: null,
        onto: { others: 'workshop' }, ontoText: "another player's workshop",
        ontoAlso: [{ zone: { others: 'crew' }, text: "another player's crew" }] }
      ```

    - `… to a card in another player's workshp.` gives `There is no zone called “workshp”.` on the button's line, with suggestions `['workshop']`.
    - `… to a card in another player's scrap.` gives `“the scrap” is shared, so it has no owner.`
    - `A player may jinx a card in another player's workshop.` gives `“another player's workshop” can only name the zone of the card a button's cards go to, as in “… to a card in another player's workshop”.`, and the phase has no `jinx …` button.
    - **Review Focus.** `A player may jinx a card from their stash to a card in another player's stash.`, with `    Only if the target card is not tired.` under it, gives `This line would tell the player what the card is, though they can't see the cards in another player's stash. Check it in the Then: lines, after a reveal.` on the `Only if` line.
    - (guard) `CREW_GAME`'s hire pick has `onto: { of: { who: 'actor' }, zone: 'workshop' }` and no `ontoAlso` key.
  - **Zones** (`zones.test.ts`), 3 players.
    - `othersZoneIds(state, seats, 'p1', 'workshop')` is `['workshop-p2', 'workshop-p0']`.
    - With p2 marked out, it is `['workshop-p0']`.
    - `resolveZoneIds({ others: 'workshop' }, env, 'p1')` equals the first.
    - `describeZone({ others: 'crew' })` is `another player's crew`.
  - **Offered and pressed** (`declared-actions.test.ts`). A 3-player `JINX_GAME` engine, p0 to act. p0's stash holds a Statue. p1's workshop holds a Vase with a Potter on it (`crew-p1`). p2's workshop holds a Statue. p0's workshop holds a Vase.
    - `ontoPrompt(jinx)` is `Pick where it goes: a card in another player's workshop or another player's crew.`
    - `ontoCandidates(runtime, jinx, state, 'p0')` is `[p1's Vase, p2's Statue, p1's Potter]`. For `'p2'` it is `[p0's Vase, p1's Vase, p1's Potter]`.
    - p0 jinxing the Statue onto p1's Potter makes the Potter tired and puts the Statue in the scrap.
    - p0 jinxing it onto p0's own Vase is refused with the prompt above.
    - **Review Focus.** With p1 marked out, the candidates for `'p0'` are `[p2's Statue]`, and a jinx onto p1's Vase is refused with the prompt.
  - **The view** (`board-view.test.ts`, Review Focus). Take `JINX_GAME` with the target text `another player's stash` and no `Only if` line, and a Vase in p1's stash. In p0's `seatExtras`, the jinx button's `cards.onto.targets` lists that card as `{ id, name: 'a face-down card', … }`.
  - **Examples** (`library/card-pick-phrases.test.ts`). `JINX_GAME` with this appended passes `runExamples`:

```text
Example: a card played on another player's card goes to the first from the left that holds one, unless the press names its zone
  Given 3 players
  And p0's stash has a Statue and a Statue
  And p1's workshop has a Vase
  And p2's workshop has a Vase
  When p0 jinxes the Statue to the Vase
  Then the Vase in p1's workshop is tired
  And the Vase in p2's workshop is not tired
  When p0 jinxes the Statue to the Vase in p2's workshop
  Then the Vase in p2's workshop is tired
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/zones.test.ts src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/board-view.test.ts src/engine/core/lang/library/card-pick-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `ZoneRef` it names, and those listed in the Global Constraints.
- [ ] **Step 4: Run** the five files, then `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`.
  - Startup's three "asks an example which … it means" tests, 4-1's `TWO_HIRES_GAME` tests and 5-1's `COACH_GAME` tests pass unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/zones.ts src/engine/core/lang/library/support.ts \
  src/engine/core/lang/declared-moves.ts src/engine/core/lang/compile-phase.ts src/engine/core/lang/declared-actions.ts \
  src/engine/core/lang/library/card-pick-phrases.ts src/engine/core/lang/testing.ts src/engine/core/lang/compile-phase.test.ts \
  src/engine/core/lang/zones.test.ts src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/board-view.test.ts \
  src/engine/core/lang/library/card-pick-phrases.test.ts
git commit -F - <<'EOF'
feat(lang): a button's target card picked in another player's zone, offered seat by seat from the presser's left

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: Value lines a flag turns on, any card's number, and a number for each of a count

Before starting: re-check `FLAGGED_VALUES` (4 entries), the end of `registerCardSubjectPhrases` (5-1's `… times its {attribute}`), the phrase-set test's title and list, `LINE_ABOUT`, `shownFlags` and `standIns`.

**Files:**
- Modify: `src/engine/core/lang/library/card-value-phrases.ts` (`FLAGGED_VALUES[4..9]` and their functions), `library/card-subject-phrases.ts` (two values).
- Modify: `src/engine/core/lang/testing.ts` (`CHARM_GAME`).
- Test: `library/card-value-phrases.test.ts`, `compile.test.ts`, `worked-view.test.ts`. The changed lines are the phrase-set test's title and list; everything else is appended.

**Interfaces:**
- Consumes: `cardHasFlag`, `cardNumber`, `itCard`, `{sharedzone} has {card}` (queue phrases).
- Produces (for Task 5 and plan 6-2). Every line is `needsCard`. "So far" is what the lines before made of the value, and nothing so far (null) stays nothing except under `is {int}`.

```ts
// card-subject-phrases.ts — appended at the end of the chain, in this order
"a card's {attribute} is {int}"                                // any card: the number
"a card's {attribute} goes up by {int} for each {attribute}"   // so far + n × its number (a count it lacks: the line is not about it)
// card-value-phrases.ts — FLAGGED_VALUES grows to 10 entries; [4..9] in this order, each registered with its own function.
// A card that is so (cardHasFlag) gets the change; any other card keeps the value so far.
"a {cardflag} card's {attribute} goes up by {int}",  "an {cardflag} card's {attribute} goes up by {int}"    // so far + n
"a {cardflag} card's {attribute} goes down by {int}", "an {cardflag} card's {attribute} goes down by {int}"  // so far − n; no floor
"a {cardflag} card's {attribute} goes up by its {attribute}", "an {cardflag} card's {attribute} goes up by its {attribute}" // + its number
```

- **`testing.ts`:**

```ts
/**
 * WORKED_GAME where cards gather charms and a Statue in the scrap makes red hands gusty: a charmed card's red work and wage go up by 2, a
 * gusty one's red work goes down by 1 but never below 0, a job's worth goes up by 3 for each charm, and every card's bonus is 1, plus its
 * charms when it is charmed.
 */
export const CHARM_GAME = [
  WORKED_GAME
    .replace('new red and new gold.', 'new red, new gold and charms.')
    .replace("  A tired card's red work is 0.", ["  A charmed card's red work goes up by 2.", "  A gusty card's red work goes down by 1.",
      "  A card's red work is at least 0.", "  A tired card's red work is 0."].join('\n'))
    .replace("  A Tinker card's wage is 1.", "  A Tinker card's wage is 1.\n  A charmed card's wage goes up by 2."), '',
  'Worth:', "  A card's worth goes up by 3 for each charm.", '',
  'Bonus:', "  A card's bonus is 1.", "  A charmed card's bonus goes up by its charms.", '',
  'Charmed:', '  Only if its charms are more than 0.', '',
  'Gusty:', '  Only if the scrap has a Statue.', '  Only if it is a red card.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**
  - **Values** (`card-value-phrases.test.ts`, `describe('lines a flag turns on, any card\'s number, and a number for each of a count')`). A 3-player `CHARM_GAME` runtime, read through `runtime.workedValue`. Hands are in p0's idle and jobs in p0's workshop.
    - A Potter: `red work` 1, `wage` 1, `bonus` 1, and `worth` null (hands have no worth, so nothing stays nothing).
    - With 1 charm: `red work` 3, `wage` 3, `bonus` 2.
    - With a Statue in the scrap as well: `red work` 2. An uncharmed Potter's is 0, a Tinker's is 1 (mixed, so not gusty), and a Smith's is 0.
    - A tired charmed Potter's `red work` is 0.
    - A Vase: `worth` 3 and `bonus` 1. With 2 charms: `worth` 9 and `bonus` 3.
    - **Review Focus.** A charmed Vase's `wage` is null: jobs have no wage column, and a line a flag turns on gives nothing so far nothing.
  - **Compiled** (`compile.test.ts`, `describe('lines a flag turns on')`).
    - `CHARM_GAME` compiles with `[]`.
    - `game.worked.bonus.refs` have the phrases `["a card's {attribute} is {int}", "a {cardflag} card's {attribute} goes up by its {attribute}"]`.
    - `gusty` is a flag whose first condition's phrase is `{sharedzone} has {card}`.
    - Under `Bonus:`, `  A charmed card's wage goes up by 2.` gives `This line is about “wage”, but it is under Bonus:.` on its line.
    - `  A charmd card's bonus goes up by 2.` under `Bonus:` gives one error on its line, whose message contains `“charmd”` (the `{cardflag}` type's `There is no card fact called “charmd”.` is expected; pin what the compiler says and report it if it differs).
  - **The view** (`worked-view.test.ts`).
    - Append `describe('lines a flag turns on')`:
      - `shownFlags(compiled(CHARM_GAME))` is `['charmed']`;
      - **Review Focus:** `gusty` changes red work but reads the scrap, so it is never shown;
      - (guard) `standIns(compiled(CHARM_GAME))` is `{}`.
    - **Changed lines.** The phrase-set test's title count goes up by 8 (22 → 30 after 5-1). Its list gains:
      - `"value: a card's {attribute} is {int}"` and `"value: a card's {attribute} goes up by {int} for each {attribute}"`, right after `"value: a card's {attribute} goes up by its {attribute} times its {attribute}"`;
      - the six flagged lines, in the order above, right after `"value: an {cardflag} card's {attribute} is its {attribute}"`.

      `CARDS_ON_IT` is unchanged.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/card-value-phrases.test.ts src/engine/core/lang/compile.test.ts src/engine/core/lang/worked-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`.
  - A Startup or board-game line now read two ways is an `ambiguous` diagnostic: stop and report it.
  - Startup's `shownFlags` and `standIns` pins pass unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/card-value-phrases.ts src/engine/core/lang/library/card-subject-phrases.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/library/card-value-phrases.test.ts src/engine/core/lang/compile.test.ts \
  src/engine/core/lang/worked-view.test.ts
git commit -F - <<'EOF'
feat(lang): value lines a flag turns on that go up or down by a number or by another of the card's numbers, any card's number, and a number for each of a count

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: The lower of the card's number and its target card's, and a game number that goes up

Before starting: re-check `numberIfAny`, `movedCard`, `theTargetCard`, `transfer`, `gameNumber`, `setGameNumber`, and 4-1's `they pay the card's {attribute}` (`move-phrases.ts`).

**Files:**
- Modify: `src/engine/core/lang/library/support.ts` (export `numberIfAny`, unchanged in behaviour), `library/card-pick-phrases.ts` (a condition, an effect, `NEITHER_HAS`), `library/game-numbers.ts` (an effect).
- Modify: `src/engine/core/lang/testing.ts` (`PRICE_GAME`).
- Test: `library/card-pick-phrases.test.ts`, `library/game-numbers.test.ts`, `compile-phase.test.ts` (all appended).

**Interfaces:**
- Consumes: the built `a {cardflag} card's {attribute} is {int}`, `{sharedzone} has {card}`, `transfer`, `gameNumber`, `setGameNumber`.
- Produces (for plan 6-2):

```ts
// support.ts
export function numberIfAny(env: PhraseEnv, card: CardState, name: string): number | null;
// card-pick-phrases.ts — each side read as numberIfAny reads it; a side with no number is left out; neither throws a RuleError
"they have at least the lower of the card's {attribute} and the target card's {attribute} in {counter}" // condition: needsMove, needsOnto, needsPlayer
"they pay the lower of the card's {attribute} and the target card's {attribute}"                        // effect: needsMove, needsOnto, needsPayment
const NEITHER_HAS = (card: string, target: string) => (card === target
  ? `Neither the card nor the target card has a ${card}.` : `The card has no ${card}, and the target card has no ${target}.`);
// game-numbers.ts
"the {gamenumber} goes up by {int}"   // effect
```

- The payment goes to the bank through `transfer`, as `they pay the card's {attribute}` does.
- **`testing.ts`:**

```ts
/**
 * CREW_GAME where a player may toast a job from their stash to a hand in their idle, paying the lower of the job's pay and the hand's: only
 * a Smith has a pay (1, it is cheap), and a Statue's pay is 1 while the scrap holds a Vase (it is a bargain), so the two never come to less
 * than 1. Raising the fee, a game number that starts at 1, puts it up by 2.
 */
export const PRICE_GAME = [
  CREW_GAME
    .replace('  Players pay with coins.', '  Players pay with coins.\n  The game has a fee of 1.')
    .replace('  A player may stop.', [
      '  A player may toast a card from their stash to a card in their idle.',
      "    Only if they have at least the lower of the card's pay and the target card's pay in coins.", '    Then:',
      "      They pay the lower of the card's pay and the target card's pay.", '      Move it to the scrap.',
      '  A player may raise the fee.', '    Then:', '      The fee goes up by 2.',
      '  A player may stop.'].join('\n')), '',
  'Pay:', "  A cheap card's pay is 1.", "  A bargain card's pay is 1.", '',
  'Cheap:', '  Only if it is a Smith card.', '',
  'Bargain:', '  Only if it is a Statue card.', '  Only if the scrap has a Vase.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**
  - **Toasting** (`card-pick-phrases.test.ts`, `describe('the lower of two prices')`). A 2-player `PRICE_GAME` engine, p0 to act with 9 coins. p0's stash holds a Statue and a Vase; p0's idle holds a Potter and a Smith. Each case starts from that table.
    - Statue onto Potter: 7 coins. **Review Focus:** the Potter has no pay, so the Statue's 2 is paid. The Statue is then in the scrap.
    - Statue onto Smith: 8. Vase onto Potter: 8.
    - **Review Focus, with a Vase in the scrap:** Statue onto Potter 8, and Statue onto Smith 8 (both discounts, still 1).
    - **Review Focus, at 1 coin:** Statue onto Smith is accepted, leaving 0. Statue onto Potter is refused with `they have at least the lower of the card's pay and the target card's pay in coins`.
    - **Review Focus, neither side.** Through `runPhrase` with `fixtureEnv` about p0, with a move whose card is given and `subject.onto` the target:
      - `they pay the lower of the card's wage and the target card's pay`, card a Statue, target a Potter, throws `The card has no wage, and the target card has no pay.`;
      - `they pay the lower of the card's worth and the target card's worth`, card a Potter, target another Potter, throws `Neither the card nor the target card has a worth.`
  - **Compiled** (`compile-phase.test.ts`). `      They pay the lower of the card's pay and the target card's pay.` under `A player may start a card in their stash.`'s `Then:` gives `“They pay the lower of the card's pay and the target card's pay” only makes sense in a button that picks a card and the card it goes to, like “A player may stack a card from their hand to a card in the row.”`
  - **The game number** (`game-numbers.test.ts`).
    - `runPhrase` of `the fee goes up by 2` on `PRICE_GAME` with the fee at 1 makes it 3.
    - `The fea goes up by 2.` under a `Then:` gives `There is no game number called “fea”.`
    - `PRICE_GAME` with this appended passes `runExamples`:

```text
Example: raising the fee puts it up by 2
  When p0 raises the fee
  Then the fee is 3
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/card-pick-phrases.test.ts src/engine/core/lang/library/game-numbers.test.ts src/engine/core/lang/compile-phase.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/support.ts src/engine/core/lang/library/card-pick-phrases.ts src/engine/core/lang/library/game-numbers.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/library/card-pick-phrases.test.ts src/engine/core/lang/library/game-numbers.test.ts \
  src/engine/core/lang/compile-phase.test.ts
git commit -F - <<'EOF'
feat(lang): the lower of a card's number and its target card's, asked and paid, and a game number that goes up

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: Steps each player takes in turn when a round starts

Before starting: re-check 4-1's step names (`END_STEPS_KEY`, `STEP_PASSES_PHRASE`, `stepPassesLeft`, `nextStep`, `turnPassesLeft`, `startTurn`, `turnWaiting`, `endStepsDue`, `roundFinished`, `endSteps`, `warnUnreachable`, `warnStepsNeverPass`, `linesDoing`, `effectsOf`), `innerEffect` and `ROUNDS_GAME`.

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`EveryPhase.roundSteps?`).
- Modify: `src/engine/core/lang/turns.ts` (`ROUND_STEPS_KEY`, `ROUND_STEPS_PHRASE`, `RoundSteps`, `roundStepsOf`; `roundFinished`, `clearTurnMarkers`).
- Modify: `src/engine/core/lang/library/turn-phrases.ts` (the effect; `stepPassesLeft` and `turnPassesLeft`).
- Modify: `src/engine/core/lang/runtime.ts` (`startTurn`, `turnWaiting`, `endStepsDue`).
- Modify: `src/engine/core/lang/compile.ts` (the checks; `roundSteps` on the compiled `everyPhase`; `warnUnreachable`'s `reached`).
- Modify: `src/engine/core/lang/testing.ts` (`LEVY_GAME`).
- Test: `src/engine/core/lang/round-steps.test.ts` (new).

**Interfaces:**
- Consumes: `startPlayerOf`, `isOut`, `nextIn`, `playersIn`, `chooseNext`, `setPhase`, `env.runLine`, `innerEffect`, and 4-1's private `nextStep` (shared in `turn-phrases.ts`).
- Produces (for Task 5 and plan 6-2):

```ts
// types.ts — EveryPhase gains: roundSteps?: { phase: string; line: number };   the phase a round's steps are taken in, and that line's
//                                                                              number; left out when no round-start line gives them
// turns.ts
/** Absent outside a round's steps; while they run, a RoundSteps; true once every seat still in has had one and the waiting turn has not started. */
export const ROUND_STEPS_KEY = 'lang:round-steps';
export const ROUND_STEPS_PHRASE = 'each player has the {phase}, in turn from the start player';
/** The phase of a round's steps, the seat that took the first, and the phase the waiting turn starts in. */
export type RoundSteps = { phase: string; first: PlayerId; back: string };
export function roundStepsOf(state: GameState): RoundSteps | true | null;
// roundFinished: also false while ROUND_STEPS_KEY is in state.data. clearTurnMarkers drops it.
// compile.ts
const ROUND_STEPS_ELSEWHERE = (text: string) => `“${text}” only makes sense under “When a round starts:”.`;
const ROUND_STEPS_TWICE = 'There is already a line giving each player a step at the start of a round.';
const ROUND_STEPS_NOT_LAST =
  'The players take their steps once the other lines that start a round have run, so this must be the last line under “When a round starts:”.';
const ROUND_STEPS_AT_ONCE = (phase: string) =>
  `The steps at the start of a round are taken in turn, so “${phase}” can't be a phase where everyone acts at once.`;
const ROUND_STEPS_GO_TO = (phase: string) =>
  `The players take the ${phase} in turn at the start of a round, so it can't go to another phase: pass it on with “The ${phase} passes to the left.”`;
const ROUND_STEPS_AFTER = (phase: string) =>
  `The players take the ${phase} in turn at the start of a round, so it can't have an After line: pass it on with “The ${phase} passes to the left.”`;
// turn-phrases.ts
const ROUND_STEP_OUTSIDE = (phase: string) => `The ${phase} passes to the left only while the players take it in turn at the start of a round.`;
const TURN_IN_THE_ROUND_STEPS = (phase: string) =>
  `The turn does not pass while the players take the ${phase} at the start of a round: write “The ${phase} passes to the left.” instead.`;
```

- **The effect `ROUND_STEPS_PHRASE`** (`turn-phrases.ts`).
  - It throws an `Error` (a mistake in the code) when `ROUND_STEPS_KEY` is already set or there is no turn.
  - With no seat still in, the key becomes `true` and nothing else happens.
  - Otherwise:
    - `first` is the start player, or the next seat still in when they are out;
    - `back` is the phase the turn is in;
    - the phase becomes the named one, the current seat `first`, and the key `{ phase, first, back }`;
    - the phase's `When this phase starts:` lines run about `first` through `env.runLine`.
- **The pass** (`stepPassesLeft`).
  - While the key holds a `RoundSteps` whose `phase` is the line's phase and the game's, the next seat is `nextStep(state, seats, first, current)`:
    - null ends the steps: the phase becomes `back`, the current seat `first`, and the key `true`;
    - otherwise the step goes to that seat, and the phase's start lines run about them.
  - Otherwise it behaves as 4-1 built it.
  - Outside both, the refusal is `ROUND_STEP_OUTSIDE(phase)` when the phase is `everyPhase.roundSteps?.phase`, else 4-1's message, unchanged.
  - `turnPassesLeft` throws `TURN_IN_THE_ROUND_STEPS(phase)` while a `RoundSteps` runs.
- **The runtime.**
  - `startTurn`:
    - when the key is `true`, it drops it and starts no round, whoever's turn it is;
    - otherwise, after the start player's round lines, when the key is set (a `RoundSteps` or `true`), it returns the state, with its table checked as today, without resetting counters, running turn lines or setting `TURN_OF_KEY`. The flow's existing `a turn starts` rule starts the turn once the steps are done.
  - `turnWaiting` is false while a `RoundSteps` runs.
  - `endStepsDue` is false while a `RoundSteps` runs.
- **The checks** (`compile.ts`, after the phases are read). A steps line is one whose `innerEffect` has the phrase `ROUND_STEPS_PHRASE`.
  - Elsewhere: any such line outside `everyPhase.roundStarts` gets `ROUND_STEPS_ELSEWHERE(its text)` on its line. That covers Setup, says cells, turn-start lines, rules, moments, every phase's lines and choices (`linesDoing`).
  - In the round-start lines:
    - every steps line after the first gets `ROUND_STEPS_TWICE`;
    - the first gets `ROUND_STEPS_NOT_LAST` when a round-start line that is not a steps line comes after it.
  - The phase:
    - a phase where everyone acts at once gives `ROUND_STEPS_AT_ONCE` on the steps line, and no `roundSteps`;
    - a `go to` in the phase (as its go-to line, or a line of a button, rule or choice) gives `ROUND_STEPS_GO_TO` on that line;
    - an After line gives `ROUND_STEPS_AFTER` on its line;
    - no line of the game passing the phase on gives 4-1's `STEPS_NEVER_PASS(phase)` on the steps line, as an **error**.
  - The phase is reached: it joins `warnUnreachable`'s `reached`.
  - `everyPhase.roundSteps` is set from the first steps line.
  - End's checks and messages are as 4-1 built them. The walk over a phase's lines may be shared with `endSteps` through one private helper that takes the messages.
- **`testing.ts`:**

```ts
/**
 * ROUNDS_GAME where each round starts with a levy that each player takes in turn from the start player, before the start player's turn: a
 * player with 2 coins or more pays 2 and passes it on; one with fewer pawns cards from their list back to the pile for 1 coin each until
 * they can, and passes it on unpaid once their list is empty.
 */
export const LEVY_GAME = [
  ROUNDS_GAME.replace('    Move the top card of the pile to the done pile.\n',
    '    Move the top card of the pile to the done pile.\n    Each player has the levy, in turn from the start player.\n'), '',
  'Phase: levy', '  Players take turns.',
  '  A player may pawn a card in their list.', '    Then:', '      Move it to the pile.', '      They get 1 coin.',
  '  When they have at least 2 coins:', '    They pay 2.', '    The levy passes to the left.',
  '  When their list is empty:', '    The levy passes to the left.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests** in `round-steps.test.ts`.
  - **Setup.** Copy `end-steps.test.ts`'s helpers, with `table(game = levy, prepare)`: a 3-player engine from `initialState(game, 1)`, with turn `{ current: 'p0', phase: 'working' }` and no round yet, so p0 is the start player and round 1 starts as the engine is built. `pawn(engine, by)` pawns the first card of `list-<by>`.
  - **How the numbers come.**
    - Every turn start gives the player 1 coin (`ROUNDS_GAME`).
    - Tidying gives 1 coin.
    - The levy takes 2 from each seat that has 2 coins or more.
    - The round's start moves 1 card from the pile to the done pile.
  - **Compiled.**
    - `LEVY_GAME` compiles with `[]`: no "Nothing leads to the phase “levy”." warning.
    - `game.everyPhase.roundSteps` is `{ phase: 'levy', line: lineOf(LEVY_GAME, '    Each player has the levy, in turn from the start player.') }`.
    - (guard) `compiled(ROUNDS_GAME).everyPhase` has no `roundSteps` key.
    - (guard) `flowDefFor(levy, SEATS).triggers[0].id` is `'a turn starts'`.
  - **Refused when the rules are read** (`errorsOf`).
    - `      Each player has the levy, in turn from the start player.` added under working's `A player may stop.` `Then:` gives `“Each player has the levy, in turn from the start player” only makes sense under “When a round starts:”.` on its line.
    - The steps line twice in a row gives `ROUND_STEPS_TWICE` on the second.
    - The steps line moved above `    Move the top card of the pile to the done pile.` gives `ROUND_STEPS_NOT_LAST` on the steps line.
    - `'Phase: levy\n  Everyone acts at once.'` in place of `'Phase: levy\n  Players take turns.'` gives `The steps at the start of a round are taken in turn, so “levy” can't be a phase where everyone acts at once.` on the steps line.
    - `  When they have at least 5 coins, go to working.` added under `Phase: levy` gives `ROUND_STEPS_GO_TO('levy')` on its line.
    - Both `    The levy passes to the left.` lines replaced (`replaceAll`) by `    They get 1 coin.` give, as an error on the steps line, `No line passes the levy on to the next player, so the first player's levy would never end. Write “The levy passes to the left.” where a player's levy ends.`
    - `levvy` in the steps line gives `There is no phase called “levvy”.`
  - **The steps start, and no turn does.** `prepare` sets coins `[5, 0, 3]` and puts two of the pile's cards in `list-p1`. As built:
    - the phase is `levy` and the current seat `p1`;
    - coins are `[3, 0, 3]`, `ROUND_KEY` is 1, and the done pile holds 1 card;
    - `TURN_OF_KEY` is absent, and `ROUND_STEPS_KEY` is `{ phase: 'levy', first: 'p0', back: 'working' }`;
    - p0's `work` is refused with `not p0's turn`.
  - **Pawning through.** After `pawn(engine, 'p1')`, the phase is levy with coins `[3, 1, 3]`. After a second:
    - the phase is `working`, the current seat `p0`, and coins `[4, 0, 1]`;
    - `ROUND_KEY` is 1, `TURN_OF_KEY` is `'p0'`, and `ROUND_STEPS_KEY` is absent;
    - `list-p1` is empty and the pile holds 11 cards.
  - **Review Focus: every step passes at once.** With coins `[2, 2, 2]`, as built: the phase is working, the current seat p0, coins `[1, 0, 0]`, `ROUND_KEY` 1, and no `ROUND_STEPS_KEY`.
  - **Review Focus: a seat that is out.** With p1 marked out, coins `[2, 0, 2]` and one card in `list-p1`, as built: coins are `[1, 0, 0]`, the phase is working, and `list-p1` still holds its card.
  - **The next round.** With coins `[9, 9, 9]`, as built the coins are `[8, 7, 7]`. After `round(engine)` (each stops) they are `[8, 7, 7]` again, with `ROUND_KEY` 2, phase working, current seat p0 and the done pile at 2.
  - **Review Focus: the round is not finished as its steps end.**
    - Take `LEVY_GAME` with `  The game ends when the pile is empty.` replaced by `  The game ends when the done pile has more than 1 card and the round is finished.`, and coins `[9, 9, 9]`.
    - After `round(engine)` there is no result: `ROUND_KEY` is 2, the phase is working and the current seat p0.
    - After a second `round(engine)` there is a result.
    - `roundFinished` is false for a state with `ROUND_STEPS_KEY: true`, current p0, `ROUND_KEY` 1 and no `TURN_OF_KEY`.
  - **Refused while playing.**
    - With `      The levy passes to the left.` added under working's `A player may stop.` `Then:`, and coins `[2, 2, 2]`, p0's `stop` throws `The levy passes to the left only while the players take it in turn at the start of a round.`, and the engine's state is unchanged.
    - With the empty-list rule's line made `    The turn passes to the left.`, and coins `[0, 0, 0]`, building throws `The turn does not pass while the players take the levy at the start of a round: write “The levy passes to the left.” instead.`
  - **Review Focus: undo and replay.**
    - After both pawns, a fresh `table(levy, prepare)` given `loadLog(engine.getLog())` equals the engine's state.
    - `engine.undo()` gives the state after the first pawn: phase levy, current seat p1, coins `[3, 1, 3]`.
  - **Clearing.** `clearTurnMarkers` drops `lang:round-steps`.
  - **(guard)** `end-steps.test.ts` passes unchanged: run it in Step 4.
  - **An example.** `LEVY_GAME` with this appended passes `runExamples`:

```text
Example: a round starts with a levy from the start player, before the start player's turn
  Given 3 players
  And p1 has 1 coin
  And p1's list has a Sweep
  And it is p2's turn
  When p2 stops
  Then the phase is levy
  And it is p1's turn
  When p1 pawns the Sweep
  Then the phase is working
  And it is p0's turn
  And p0 has 1 coin
  And p1 has 0 coins
  And p2 has 1 coin
```

  The example's numbers:
  - p2 stops and tidies (1 coin).
  - Round 2 starts.
  - p0 has nothing to pay and no list, so passes.
  - p1 pawns the Sweep (1 + 1 = 2) and pays 2.
  - p2's list is empty, so p2 passes.
  - p0's turn starts (1 coin).
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/round-steps.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** it with `src/engine/core/lang/end-steps.test.ts` and `src/engine/core/lang/runtime.test.ts`, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. Rent Day keeps its 108 examples.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/turns.ts src/engine/core/lang/library/turn-phrases.ts \
  src/engine/core/lang/runtime.ts src/engine/core/lang/compile.ts src/engine/core/lang/testing.ts src/engine/core/lang/round-steps.test.ts
git commit -F - <<'EOF'
feat(lang): steps each player takes in turn from the start player when a round starts, before the start player's turn, with no round started again

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: An example for each piece, a card revealed at a round's start that acts once, the README, and the checks

Before starting: re-check 5-1's reshuffling deal and its README paragraph ("Counting, targets in several zones, decks that shuffle back, and rules about a player.").

**Files:**
- Modify: `src/engine/core/lang/testing.ts` (`OMEN_GAME`).
- Test: `src/engine/core/lang/examples.test.ts` (append).
- Modify: `README.md` (a paragraph after 5-1's).

**Interfaces:**
- Consumes: every fixture above; 5-1's `deal up to {int} card(s) … shuffling {zone} into it when it runs out`; `runExamples`.
- Produces: no phrase.
- **`testing.ts`:**

```ts
/**
 * LEVY_GAME where each round reveals an omen: the round's start moves the last omen to its discard, deals the next (shuffling the discard
 * back when the deck runs out), sets the fee to 1, puts it up by 2 while the Gale is shown, and calls the levy only as the Toll is revealed.
 * Taking a card from the pile costs the fee.
 */
export const OMEN_GAME = LEVY_GAME
  .replace('  Players pay with coins.', '  Players pay with coins.\n  The game has a fee of 1.')
  .replace('    | Dust  | 6      |', ['    | Dust  | 6      |', '  A deck called omens, starting in the omen deck:',
    '    | name | copies |', '    | Gale | 1      |', '    | Toll | 1      |'].join('\n'))
  .replace('  Each player has a list row that only they can see.', ['  Each player has a list row that only they can see.',
    '  The omen deck is a pile in the center that no one can see.', '  The omen is a row in the center that everyone can see.',
    '  The omen discard is a pile in the center that everyone can see.'].join('\n'))
  .replace('  The start player is chosen at random.', '  The start player is chosen at random.\n  Shuffle the omen deck.')
  .replace('    Each player has the levy, in turn from the start player.', ['    Move the omen to the omen discard.',
    '    Deal up to 1 card from the omen deck to the omen, shuffling the omen discard into it when it runs out.',
    '    The fee is 1.', '    If the omen has the Gale, the fee goes up by 2.',
    '    If the omen has the Toll, each player has the levy, in turn from the start player.'].join('\n'))
  .replace('    Only if they have at least 1 move.\n    Then:\n      They spend 1 move.\n  A player may stop.',
    '    Only if they have at least 1 move.\n    Only if they have at least the fee in coins.\n    Then:\n      They spend 1 move.\n'
    + '      They pay the fee.\n  A player may stop.');
```

  Each `.replace` must find its text (assert it in the test). The last one must hit the take button, the one just before `A player may stop.` in `TURN_GAME`; adjust the anchors, not the lines, if one misses.

- [ ] **Step 1: Write the tests.** In `examples.test.ts`, `describe("the words for slice 6's pieces")`, each fixture with its examples appended passes `runExamples`. Tasks 1, 3 and 4 hold the examples of targets, prices and steps.
  - **`CHARM_GAME`:**

```text
Example: a charmed hand works 2 more and earns 2 more, and works 1 less while a Statue lies in the scrap
  Given p0's idle has a Potter and a Tinker
  And the Potter in p0's idle has 1 charm
  And p0's workshop has a Vase
  And the Vase in p0's workshop has 2 charms
  And the scrap has a Statue
  Then the Potter in p0's idle has 2 red work
  And the Potter in p0's idle has 3 wage
  And the Potter in p0's idle has 2 bonus
  And the Tinker in p0's idle has 1 red work
  And the Vase in p0's workshop has 9 worth
```

  - **`PRICE_GAME`:**

```text
Example: a toast pays the lower of the two pays, never both off
  Given p0's stash has a Statue and a Statue
  And p0's idle has a Smith and a Potter
  And the scrap has a Vase
  When p0 toasts the Statue to the Smith
  Then p0 has 8 coins
  When p0 toasts the Statue to the Potter
  Then p0 has 7 coins
```

  - **`OMEN_GAME`.** A reveal that acts once, a round-long number, and steps called by the card. The Given `{zone} has {cardlist}` empties the zone first, so each deck below holds only the omen named.

```text
Example: the Toll, as it is revealed, calls the levy once, and the fee goes back to 1
  Given 3 players
  And the omen deck has the Toll
  And the omen discard has the Gale
  And the fee is 3
  And p1 has 2 coins
  And it is p2's turn
  When p2 stops
  Then the omen has the Toll
  And the omen discard has the Gale
  And the fee is 1
  And p1 has 0 coins
  And the phase is working
  And it is p0's turn

Example: while the Gale is shown the fee is 3, and no levy is called
  Given 3 players
  And the omen deck has the Gale
  And p1 has 2 coins
  And it is p2's turn
  When p2 stops
  Then the omen has the Gale
  And the omen discard is empty
  And the fee is 3
  And p1 has 2 coins
  And it is p0's turn
```

  - **A failing example.** `PRICE_GAME` with `Then p0 has 9 coins` after the first toast fails, and the failure names that line.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/examples.test.ts`. Expected: PASS, since there is no new phrase. If one fails, stop and report which line: that is a missing piece, to be planned, not worked round.
- [ ] **Step 3: Write the README paragraph** after 5-1's: **"Other players' cards, lines a flag turns on, the lower of two prices, and steps at the start of a round."** It is written in fixture words, and plan 6-2 may swap in Startup's lines. One bullet each:
  - **Targets in another player's zone.** `… to a card in another player's workshop or another player's crew.` is offered seat by seat from the presser's left, skipping players who are out; `When p0 jinxes the Statue to the Vase in p2's workshop`; a zone only its owner sees is offered face down, and an `Only if` line can't read it.
  - **Lines a flag turns on.** `A charmed card's red work goes up by 2.`, `A gusty card's red work goes down by 1.` and `A charmed card's bonus goes up by its charms.`; `A card's bonus is 1.`; `A card's worth goes up by 3 for each charm.`.
    - A flag may read a card in the centre (`Only if the scrap has a Statue.`), which makes a round-long modifier from the card shown.
    - Such a flag is never labelled on a face.
  - **The lower of two prices.** `They pay the lower of the card's pay and the target card's pay.` and its `Only if they have at least …` line; a side without the number is left out. `The fee goes up by 2.`
  - **Steps at the start of a round.** `Each player has the levy, in turn from the start player.`
    - It is written as the last line under `When a round starts:` (an `If …,` around it is fine), once in a game.
    - Each step begins with the phase's start lines about that player and ends with `The levy passes to the left.`
    - The start player's turn then starts, with no new round.
    - Lines that would strand a round are refused when the rules are read.
  - **A card revealed as a round starts.** The round's start lines move the last card away, deal the next (shuffling the discard back), and act on it once with `If the omen has the Toll, …`. Rules read the card shown for the rest of the round.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 5: Run the checks.** Each must print nothing, except where noted.

```bash
# Startup Simulator's words in shared code, slices 3 to 6, tests included
git diff "$BASE" -- src/engine src/pages src/utils | grep '^+[^+]' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share|tags?|leads?|leading|licen[cs]es?|tiers?|stall(s|ed|ing)?|sectors?|expertise|modes?|bandwidths?|bugs?|qa|online|offline|maint(enance)?|suppl(y|ies)|demands?|xp|pending|skills?|badges?|badged|ranks?|mentor(s|ed|ing)?|synerg(y|ies)|agile|graduat(e|es|ed|ing|ion)|training|trained|brainstorm(s|ed|ing)?|strateg(y|ies)|milestones?|seniors?|workaholics?|clean coders?|visionar(y|ies)|toxic|burnouts?|flight risks?|techcrunch|design sprints?|cease|desist|hype|utilit(y|ies)|buffs?|debuffs?|venture capital|bubbles?|patents?|trolls?|angels?|investors?|legacy|regulations?|audits?|open source|hackathons?|chip shortage|crunch|server crash|logjam|frenz(y|ies)|interns?|headhunters?|course boom|whistleblowers?|trade show|events?)\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# existing test lines removed or changed: only the phrase-set test's
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
# nothing outside the language
git diff --stat "$BASE" -- src/games src/pages
```

  The fourth check prints only lines of the phrase-set test in `worked-view.test.ts`: its old title, and any list line Task 2 rewrote. Also read the `+` lines of `src/engine` for "source" in the game sense, and for "Attribute" meaning a kind of card.
- [ ] **Step 6: Run the games alone.**
  - `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
  - `bunx vitest run src/games/startup-simulator.test.ts` passes with BASE's example count.
- [ ] **Step 7: Commit**

```bash
git add src/engine/core/lang/testing.ts src/engine/core/lang/examples.test.ts README.md
git commit -F - <<'EOF'
feat(lang): an example for each of slice 6's pieces and a card revealed at a round's start that acts once; the README describes them

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Left to 6-2 / 6-3

**Plan 6-2 (rules text and long runs)** writes, with this plan's pieces:
- **Attributes (R2).**
  - The counts on cards (one per Attribute) and the public "attributes in play" pile.
  - The Buffs join 5-2b's one `play a card from their strategy hand to a card in their bench, their development team or their ops team` button, as options with guards. A second button with the same words and target zones could not be told apart by 4-1's P16.
  - The Debuffs get their own button, `… to a card in another player's development team or another player's ops team` (Task 1).
  - Each play puts its count on the target and parks the card.
- **Firing and eviction.** Firing moves each counted card from the pile to the strategy discard and strips the count, in 5-2a's `When a card in the open job market is fired:` rule. The Diva's Pivot marks her fired, with 5-1's `every card on it that is … is fired`. Eviction does the same to the box, through a `When a card in the box is …:` rule (4-1).
- **Value lines** (Task 2):
  - Workaholic's +2 in its mode (not for PMs, Sales Reps or HR) and +$2 salary.
  - Clean Coder as Clean Code; Visionary in the leads.
  - Toxic (R1): Blue first, then Red, then QA, after Synergy and the Event lines, floored. A Development team splits into a raw and a final team value. The Ops pool takes the cube off the Toxic card's own pool value, through 5-1's owner scope (see the Architecture).
  - Burnout absolute as the last line of each output (R3).
  - Tech Bubble, Legacy Code (on `bug decay`), the two Booms, Server Crash and Logjam, each with its unit floor.
  - Chip Shortage on `cost` and on a rehire price (`A card's rehire price is 1.`).
  - Hype in `portfolio points` (`… goes up by 5 for each hype.`, before the Offline line).
- **Utility.**
  - TechCrunch Feature: a button to a card in their operations, with Task 3's lower-of, a `Price:` section (Trade Show on the card, a Sales Rep on the product), and `The target card gains 1 hype.`
  - Online Course Boom on Training prices.
  - Design Sprint: `Deal up to 5 cards from the seed deck to their backlog.`
  - Cease & Desist stays in the deck, refused (slice 8).
- **Events.**
  - The deck, `the event in play` and its discard; the round's reveal (move, reshuffling deal); game numbers reset each round start (License for Patent Trolls; the University prices with `… goes up by 3` and Intern Season's 0).
  - Angel Investors and Regulation Audit as one step phase called by one conditional last line (Task 4). Its buttons let staff go, and it passes when they can pay.
  - Crunch Time in the engine phase.
  - The Events of later slices are revealed with no effect.
- **Proof.** Every example in the spec's table, the long runs (exactly one Event in play after each Round Start, no unit's output below 0), and the auto-player for Attributes, Utility cards and the round's steps.

**Plan 6-3 (the page):**
- The Event in play on the shared table with its text, and the attributes pile.
- The counts as labels under Talents, and Hype on products (5-3's lone-count labels), checked for readability.
- The price game numbers on the bank line.
- The Debuff picker across other seats' cards on the one-seat-at-a-time table, where other seats' zones are left off. Its list under the buttons offers them; clicking needs a decision.
- The seat switcher following a round's steps (`turn.current`).
- Whether to label Event-driven modifiers. Flags that read the Event in play stay unshown by `shownFlags` (fail closed), and a rule that a public zone in the centre is safe to read would be a worked-view change for 6-3 to plan.
- 5-3's forward note on extra press-flag labels.

## Gaps

None that needs a protected file or contradicts a binding call. Checked:
- The round's steps ride the flow's existing `a turn starts` rule and two runtime predicates, so `flow.ts` doesn't change.
- `ZoneRef` and `EveryPhase` widen in `types.ts` only; no `CardState` change and no card `data` key.
- Every item of the spec's "What the language gains" is a task here, or is written with built pieces:
  - item 3 (reveal effects) is round-start lines plus Task 4;
  - item 6 (example vocabulary) needs no phrase.

  Both are recorded as calls, not gaps.
- R1, R2 and R3 are each expressible with this plan's and earlier plans' phrases. The Ops-pool half of R1 depends on 5-1's owner scope: if 6-2 can't pin it, that is a report, and a player-value `goes down by` line is the follow-up.

## Forward notes

- **Slice 7.** Consultants move at Round Start. A game has one set of round steps, as the last round-start line, so the Consultant moves join 6-2's step phase. Its calling line then becomes unconditional, or reads a flag that covers both.
- **Slice 8.** Hit Piece and the poach buttons pick their target with Task 1's `another player's …`. Scandal's −5 needs `a card's {attribute} goes down by {int} for each {attribute}`, which is not built here.
- **Slice 9.** A target zone of another player's is judged by its visibility, so a Face-Down product in a public zone is slice 9's to hide (as `pickedAs` does for an unseen card).
