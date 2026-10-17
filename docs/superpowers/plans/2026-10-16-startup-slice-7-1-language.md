# Startup Simulator Slice 7-1 (Language) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The rules language gains every general piece slice 7 needs that plans 4-1, 5-1 and 6-1 left out:
- cards that name a player, made per player and read in tests, prices and payments;
- a button's card picked in another player's zone;
- values about a player by lookup;
- a zone whose cards sit on other players' cards (R1), and the cards a card holds read as its own player's by default;
- a window where other players may answer an action before it goes ahead, opened only when someone could, that never shows a hidden pick.

All of it is tested with fixtures in general words. Startup Simulator's text does not change.

**Architecture:**
- **This is plan 7-1 of three.** Plan 7-2 writes the rules text and the long runs; plan 7-3 the page. Nothing here touches `src/games/**` or `src/pages/**`.
- **Ten tasks.** The spec's "What the language gains" maps onto them like this:
  1. **Cards that name a player** (item 1, and item 4's "they hold an Equity card of X"): the declaration, the cards made at setup, tests, faces and the example words.
  2. **A button's card picked in another player's zone** (Invest, Buyback, the buyer's acceptance, the Non-Compete Suit): 6-1's `another player's …` as the zone a card is picked in.
  3. **What a card's players pay and get, where it goes back to, players tied by a card, and a phase handed to a card's owner or a chosen player** (item 4's "Partners", and the consent windows of Buyback and the Secondary Trade).
  4. **Values about a player by lookup** (item 2).
  5. **A zone whose cards sit on other players' cards** (R1: the mark, the check, and "the cards on it" read as the holder owner's).
  6. **The other players' cards on a card** (R1: read, counted and sent back).
  7. **Answering an action: the line and its refusals** (item 3, compiled).
  8. **Answering an action: the window played** (item 3, at runtime).
  9. **What each seat sees of a waiting action** (item 3; the hidden-information anti-goal).
  10. **An example for each piece, the README and the checks** (items 5 and 6).
- **Where things live.**
  - Player facts on cards: `ThingFact.kind` gains `'player'`; the type `{cardplayer}` in `refs.ts`; `CardFilter` gains a player test, read by `passes` (`support.ts`).
  - Picks in another player's zone: `compile-phase.ts`, `declared-moves.ts` (`fromZoneIds`), `declared-actions.ts`, P16 in `card-pick-phrases.ts`.
  - Payments and ties: `compare-phrases.ts`, `card-pick-phrases.ts`, `board-phrases.ts`; the zone of the player a card names is a `SeatRef` (`{ named }`); the two phase hand-offs live in `flow-phrases.ts` beside `startPhase`.
  - Lookups: `player-value-phrases.ts`.
  - Cross-seat cards: `ZoneSpec.across`, `ON_SEAT_KEY` (`zones.ts`), `othersOn` and the check (`attach.ts`), the group `'others on it'` (`types.ts`, `refs.ts`, `support.ts`), the return effect (`attach-phrases.ts`).
  - The window: a new `action-window.ts` (`WINDOW_KEY`, `WINDOW_LINE`, `Waiting`, `waitingOf`, `actingPlayer`), read by `compile.ts`, `declared-actions.ts`, `runtime.ts`, `build.ts`, `turns.ts`, `library/turn-phrases.ts` and `board-view.ts`.
  - New state: `lang:window` in `state.data`; `lang:on-seat` in a card's `data`. No `CardState` change, no new flow rule in `flow.ts`.
- **Builder calls this plan makes** (the spec leaves wordings to the builder):
  - **A card names a player through a fact the game declares:** `Cards can name a maker.` The value is a seat id. It shows on the card's face like any fact (`maker: p0`); how the page says it is 7-3's.
  - **Cards made per player:** `2 new Stake cards go to each purse, each naming its owner as its maker.` Zone by zone in seat order, each zone's cards in a row, so p0's take the first ids.
  - **Tests by the named player** follow "whose": `whose maker is them`, `whose maker is the target card's owner`, and (Task 7) `whose maker is the player acting`. A card without the fact never passes. `them` needs a player, the target card's owner a target, the player acting a waiting action: each is refused when the rules are read where it can't be known.
  - **Example words:** a card may be written `a Stake whose maker is p0`. A claim takes such a card from the table, else makes one naming p0 from a stack that never runs out. So examples that skip Setup still have the cards, and examples after `Given the game is set up` move the ones made there.
  - **Picks in another player's zone** extend 6-1 to the zone a button picks its own card in (`A player may buy a card in another player's purse.`). Cards are offered seat by seat from the presser's left, skipping seats that are out; a zone only its owner sees is offered face down. Only one card: "some cards" from another player's zone is refused. A card move (no cost line) can't drag from another player's zone, and no button puts cards into one.
  - **Payments read the named player and the card's owner:** `They pay its maker's rate to its owner.` covers Invest (owner and maker are one) and the buyer's acceptance (owner is the seller). `They get its maker's rate from its maker.` is the Investor accepting a Buyback. `Its owner gets its maker's rate.` is a dividend, from the bank. `Its maker gets 3 coins.` is Venture Capital Rain. `They pay 5 to its owner.` is the Non-Compete Suit's $5. The hard cap is `its owner has at least 2 cards in their purse`.
  - **Where a card goes back to:** `Move it to its maker's purse.` (the Veto's burn, an accepted Buyback, Bankruptcy's seizure in slice 10).
  - **Partners are a relation read from cards, both ways:** `another player tied to them by a card in their holdings has a card in their workshop whose name is Statue`. Two players are tied by a card in a zone when either has there a card that names the other. It is one condition and its negation (`no other player tied to them …`), so the License waiver is one `Only if` line; no relation is stored.
  - **Consent stays Rent Day's pattern:** an interrupt phase where the other player accepts or declines. Two hand-offs are new: `The answer phase starts with its owner.` (Buyback: the Investor answers) and `Hand the answer phase to another player of their choice who is not the card's maker.` (the Secondary Trade's buyer, whom the seller names). A choice with no one to pick would skip its line silently, so the button is guarded with `Only if some other player is not the card's maker.`
  - **Lookups are player-value lines read in order, the last that applies winning:** `A player's rate is 5.`, `A player's rate is 10 if their top worth is at least 3.`, and `A player's top worth is the highest worth of the cards in their workshop.` (0 when no card has it). Every number of the rulebook's tables stays in the text, one per line, so a price change is a one-number edit.
  - **Held cards in one zone (R1):** `Each player has a holdings row that everyone can see, where some cards are on other players' cards.` A placed card stays in its owner's zone with `lang:on` and `lang:on-seat` (the holder's seat when it was placed). An unplaced one sits on nothing in the same zone. So dividends, ties, the window, scoring and trades read one zone, and placing or returning is `It goes to their holdings, on the target card.` / `The other players' cards on it go to their owners' holdings.` Only `'some'` is offered: a zone where every card must sit on another player's card is not needed by slice 7.
  - **"The cards on it" are the holder owner's (R1):** `cardsOn` leaves out every card with `lang:on-seat`, and `othersOn` reads only those. Every 1b–6 line keeps its meaning, as 5-1 arranged (every reader of "the cards on it" goes through `cardsOn`). The rivals' cards are `the other players' cards on it`, a group like `the cards on it`, so the existing totals, counts and tests read them with no new value phrase.
  - **Scoring per held card needs no new phrase** (item 5): a player's own cards never sit in the zone held cards are kept in, so `Each Stake in a player's holdings scores 5 points.` scores rivals' cards only. Ruling #16's "own tokens score 0" is then pinned by an example (Task 10, and 7-2).
  - **The window** is written under `In every phase:`, mirroring 4-1's steps before the score: `Before an action goes ahead, each player who has a card in their holdings whose maker is the player acting has the objection, in turn from the left of the player acting.`
    - It opens for every press of a button with a cost, after the press is judged in full (pick, cost, `Only if` lines and choices), once its cost is spent, and only when some player qualifies.
    - The press then waits. Nothing else is paid or moved, and its picked card does not move.
    - The asked players answer in turn in the named phase. `The objection passes to the left.` asks the next; after the last, the action goes ahead as pressed. `The action does not go ahead.` ends the window with nothing done but the cost.
    - Either way the turn goes back exactly as it stood: the phase, the seat, and what was done and rolled. So a vetoed action has spent its AP (the overview's ruling).
    - The asked set is fixed when the window opens: the clause is judged once, about each seat, from the left of the player acting.
    - Its clause may read only what everyone sees, so whether the window opens gives nothing hidden away (slice 8 Q4's lesson).
  - **What a seat sees of a waiting action** is the player acting, the button's label, its choices, and the name of each card it picked and its target as that seat sees it (`a face-down card` otherwise, with no id). The stored press never reaches a seat: the net layer sends the scene, the turn and the extras only.
  - **Example vocabulary needs no other new phrase** (item 6). `When p0 hires a Potter to the Vase`, `Then the phase is objection`, `And it is p1's turn` and `When p1 objects with the Stake whose maker is p0` all exist. Tasks 1, 5 and 8 add `{card} in {zone} is on {card} in {zone}` (Given and expect) and `{card} in {zone} is on no card`.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-7-equity-design.md` is binding, and its "Builder-check rulings" R1–R2 win over its body.
- R1: a placed Consultant keeps `lang:on` in the Investor's own zone. The zone is marked as one whose cards sit on other players' cards. The check accepts a holder only in a public zone of the seat it had when placed. "The cards on it" are the holder owner's. Rules that take a product off a Board return the tokens explicitly.
- R2: a Founder may Veto a Secondary Trade of their own token when they hold the seller's Equity.

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding as amended (its attachment bullet carries R1), especially its anti-goals:
- Startup words in shared code;
- hidden information leaking;
- a game that can't end.

The evidence is `builder-check-startup-7.md` in the session scratchpad. Slices 8–10's specs and builder checks say what this plan must leave in place:
- slice 8 R2: a product leaving its owner's Board first breaks its stack, then returns Consultants;
- slice 8 R4: a window opens on public facts only;
- slice 9 R3: no prompt names a Face-Down card;
- slice 9 R4 and slice 10: Fold, the sales and Liquidation return Consultants.

Plans 4-1, 5-1 and 6-1 (their Interfaces blocks and Global Constraints amendments) are inputs, as are 4-2 to 6-3 where named.

## Global Constraints

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.**
  - `lang:window` is the only new `state.data` key.
  - `lang:on-seat` is the only new key in a card's `data` (R1: the holder's seat, stored with the card).
  - A card fact naming a player is the game's own fact, under its declared name, like any fact.
  - New fields are optional and left out, never set to `undefined`: `ZoneSpec.across`, `EveryPhase.window`, `SeatExtras.waiting`, `PhraseOpts.needsActing`, `LineCtx.acting`.
  - So `compile.test.ts`'s `everyPhase` `toEqual`s hold, and a game without the new lines builds exactly the same `FlowDef` and compiled shape as before.
- **No Startup Simulator words in shared code** (code, comments, test names and fixture strings), in every form:
  - plan 6-1's list: 1b-2's, slice 3's, slice 4's, slice 5's and slice 6's words;
  - **slice 7's:** equity, investor, founder, consultant, dividend, veto, partner, immunity, portfolio, buyback, stock.
  - Ordinary words to avoid:
    - "a mistake in the code", not "a bug";
    - "waiting", not "pending";
    - "goes to", not "leads";
    - "moment" or "happening", not "event";
    - "purse", never "supply";
    - "answer" or "stop", never "veto";
    - "tied", never "partner".
  - The existing comment on `hasCost` in `declared-actions.ts` says "veto": Task 8 rewords it.
  - **`CREW_GAME`'s hands have a `skill` column.** New fixture lines read `wage`, `pay`, `worth` or a worked value by its own name.
  - The banned words may appear in `src/games/startup-simulator.*`, `README.md` and `docs/`.
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged; Rent Day keeps its 108 examples. Startup Simulator compiles with `[]` and its examples pass in the same number as at BASE.
- **Every number comes from the rulebook.** This plan's numbers are fixture numbers. Plan 7-2 cites the rulebook for each of Startup's: 3 tokens, $5/$10/$15, $1/$2/$3 at $1/$11/$21, 5 VP, $5, $3.
- **Hidden information (3-2's to 6-1's lessons).**
  - What a seat's view shows is decided by the compiled rules alone, and never reveals a hidden card or zone.
  - **The window must not reveal a hidden pick:**
    - its view names a card only as the seat sees it, with no id;
    - its clause reads only zones everyone sees, through every value it reads;
    - the waiting press stays in `state.data`, which no seat receives.
  - `worked-view.ts` counts every phrase of `registerCardSubjectPhrases` and `registerCardValuePhrases` as card-only. A task that adds a phrase there updates the phrase-set test in `worked-view.test.ts`: its list, and the count in its title. It also adds the phrase to `CARDS_ON_IT` if it reads the cards on a card.
    - No task here adds a phrase to those registrars, so the phrase-set test and `CARDS_ON_IT` stay as they are.
    - Task 6's group of other players' cards is judged against `cardsOnCardsArePublic`. A cross-seat zone must be one everyone sees (Task 5 refuses any other), so the rule holds.
    - A card test that reads a player (Task 1) makes a line not card-only (fail closed).
  - Every phrase that reads a card carries its needs flags (`needsCard`, `needsCards`, `needsOnto`, `needsMove`), so `readsPressCard` and `reportHiddenCardReads` judge it. A pick zone of another player's is judged by its own visibility (6-1).
- **Every new phrase that changes a card's count or flag declares `writes`.** None here changes a card's count or flag.
- **Refuse what strands play.** A game that can't end, or a press that silently does nothing, is an anti-goal.
  - Task 7 refuses, when the rules are read, every window that could leave an asked player unable to answer:
    - a phase nothing passes on;
    - a go-to, an After line or a cost in it;
    - a phase where everyone acts at once;
    - the game's first phase;
    - a step phase;
    - an After line naming a button with a cost.
  - Task 3's lines on a card that names no such player throw a RuleError, so the press is refused; its conditions are false.
  - Task 2 refuses picks that can't be offered.
- **Existing code and tests.**
  - New imported names go on new `import` lines in existing files.
  - Existing test lines change only where a task names them:
    - the pinned `VOCAB_TYPES` list in `refs.test.ts` (Task 1);
    - 6-1 Task 1's test that `A player may jinx a card in another player's workshop.` is refused (Task 2).
  - Tests may be appended and fixtures added to `testing.ts`.
  - If any other existing test fails, stop and report it instead of changing it.
  - **After widening a type, run `bun run typecheck` and read every narrowing on it.** At the time of writing:
    - `ThingFact.kind` (Task 1): `shownFact` (`card-facts.ts`), `factNames` (`refs.ts`), `vocabFrom` (`phrases.ts`), `setFacts` (`board-view.ts`), the declaring functions in `fact-phrases.ts` and `player-facts.ts`.
    - `CardFilter` (Tasks 1 and 7): `passes` (`support.ts`), `testNames` and `cardOnlyNames` (`worked-view.ts`), `comparesWith` (`compile-util.ts`), `columnCompared` (`choices.ts`), `resolveCardFilter` (`refs.ts`).
    - `CardGroup` (Task 6): `cardsIn` (`support.ts`), `cardOnlyNames`, `readsItsCard` (`compile-util.ts`), `resolveCardGroup`.
    - `SeatRef` (Task 3): `describeZone` and `OWNER_WORDS` (`support.ts`), `resolveZoneIds` (`zones.ts`), `moveZoneId` (`declared-moves.ts`), `mentionsActor` (`compile-util.ts`), `mayHideFromPresser` (`compile-phase.ts`).
    - `PhraseOpts` (Task 7): `RegisteredOpts`' defaults in `phrases.ts`.
    - Whatever plans 4-2 to 6-3 added.
- **Earlier plans come first.**
  - In execution order: 4-1 (built), 4-2, 4-3, 5-1, 5-2a, 5-3 Task 1, 5-2b, 5-3 Tasks 2–4, 6-1, 6-3 Task 1, 6-2a, 6-2b, 6-3 Tasks 2–5.
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
  - `stake(state, game, zoneId, maker)` in a test is `makeCard(state, game, { name: 'Stake', maker }, zoneId)!.state` (Task 1 makes this work); define it locally where needed.
- **Fixture words** (general, never Startup's): maker, Stake, stakes, purse, holdings, rate, top worth, yield, reach, wanted, answer, ask back, sell back, take, refuse, offer, sue, cash in, post, shelve, hide, lit, lift, help, helped, crew wage, objection, object with, let it go, sell, tidy, swap, call, tied.

## Review Focus

- **An action answered when an asked player is out, when nobody may answer, when it spends the actor's last move, when it carries choices, or when it is undone or replayed mid-window.**
  - Expected:
    - out seats and players the clause refuses are never asked;
    - with nobody to ask the press goes ahead at once;
    - after a last move, the turn passes once the window closes, whichever way it closes;
    - choices are carried to the action;
    - undo and the log give the same state.
  - Tests: Task 8.
- **A card on another player's card when that card moves to another zone its player shows everyone, to a hidden zone, or to the center, and a card put on its own player's card.**
  - Expected: it stays on it; the move is refused; refused until the line returning it is written; refused.
  - Tests: Tasks 5 and 6.
- **A card picked in another player's zone that only they see, in a seat that is out, or in the presser's own zone.**
  - Expected:
    - offered face down, and an `Only if` reading it is refused when the rules are read;
    - not offered;
    - refused with the button's prompt.
  - Tests: Task 2.
- **Lookups at every edge of a range, with no card, and with lines in another order.**
  - Expected:
    - 0, 1, 2, 3 change exactly at 1, 3 and 5;
    - the highest of nothing is 0;
    - the last line that applies wins.
  - Tests: Task 4.
- **What a seat sees of an action picked from a zone it can't see, and a window whose clause would read such a zone.**
  - Expected:
    - the view says `a face-down card` with no id;
    - the clause is refused when the rules are read, through a worked flag too.
  - Tests: Tasks 7 and 9.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name, not by line. If one is missing or differs, stop and report it.

- **Plan 1b-1, built:** `hasCost`, `costRefusal`, `payCost`, `declaredActionHandler`, `pressUpToChoices`, `choose` and the private `Allowed`/`Press` types (`declared-actions.ts`).
- **Plan 4-1, built:**
  - `END_STEPS_KEY`, `STEP_PASSES_PHRASE`, `roundFinished`, `clearTurnMarkers` (`turns.ts`);
  - `stepPassesLeft`, the private `nextStep`, `turnPassesLeft`, `STEP_OUTSIDE_THE_STEPS`, `TURN_IN_THE_STEPS` (`library/turn-phrases.ts`);
  - `turnWaiting`, `endStepsDue`, `runInPhase`, `env.runLine`, `checkAttachments` (`runtime.ts`);
  - in `compile.ts`: `compileEveryPhase`, `ONLY_WHEN_RULES`, `effectsOf`, `linesDoing`, `warnUnreachable(…, reached)`, `endSteps`, `STEPS_NEVER_PASS`, `phaseStartedBy`;
  - the flow triggers `END_STEPS_RULE` and `TURN_START_RULE`, and `flowRegistryFor` (`build.ts`);
  - `ZoneSpec.onCards: 'every' | 'some'` and `holders`, `playerRowMarked`, `MARK_NEEDS_EVERYONE`, `sharedZoneOnCards` (`setup-phrases.ts`);
  - `putOn`, `cardsOn`, `holderIdOf`, `onCardsZoneOf`, `attachmentProblem` (`attach.ts`); `HOLDER_KEY`, `withoutHolder`, `relocate` (`zones.ts`);
  - `onCardsZone`, `itGoesOnTarget`, `announceJoins`, `cardHasOnItGiven`, `onItIs` (`attach-phrases.ts`);
  - `PLAYERVALUE`, `CARDCLAUSE`, `CARDFILTER`, `CARDGROUP`, `GROUP_TESTS`, `ON_IT`, `testsOf`, `withTests`, `declaredWord`, `factNames`, `VOCAB_TYPES` (`refs.ts`);
  - `registerPlayerValuePhrases`, `playerValueOf`, `LINE_UNDER_OTHER`;
  - `cardsOnCardsArePublic`, `testNames`, `cardOnlyNames` (`worked-view.ts`);
  - P16 in `card-pick-phrases.ts`: `Press`, `buttonsFor`, `fitsWording`, `cardFor`, `pressesCardButton`;
  - `FORCE_GAME`, `YARD_GAME`, `TWO_HIRES_GAME`.
- **Plan 5-1:**
  - `ownerOf` (`support.ts`);
  - `its owner has a card in their {perzone} {cardclause}`;
  - `it is a card whose {cardfilter}` and `FROM_CARDS_COUNT` ("a card's {attribute} is the number of {cardgroup}");
  - `numberOfCards`, `ontoPlaces`, `CardPick.ontoAlso`;
  - `a player's {playervalue} is the number of {cardgroup}`;
  - `COUNT_GAME`;
  - the phrase-set test's count after 5-1.
- **Plan 6-1:**
  - `ZoneRef`'s `{ others: string }`, `othersZoneIds` (`zones.ts`), `ontoZoneIds` (`declared-moves.ts`);
  - in `compile-phase.ts`: `ANOTHER_PLAYERS`, `OTHERS_ONLY_AS_TARGET`, `othersZone`, `isOneZone`, `mayHideFromPresser`;
  - `numberIfAny` exported, `FLAGGED_VALUES` (10 entries);
  - `ROUND_STEPS_KEY`, `RoundSteps`, `roundStepsOf`, `ROUND_STEPS_PHRASE`, `ROUND_STEP_OUTSIDE`, `TURN_IN_THE_ROUND_STEPS`, `EveryPhase.roundSteps`;
  - the private walk shared by `endSteps` and the round-steps checks, if 6-1 made one;
  - `JINX_GAME`, `CHARM_GAME`, `LEVY_GAME`;
  - 6-1 Task 1's compile test of `A player may jinx a card in another player's workshop.`
- **Plans 4-3, 5-3 and 6-3:** whatever they added to `worked-view.ts` and `board-view.ts` (`shownPlayerValues`, `pressFlags`, `holderFlags`, the Event labels). Leave it as found.
- **The language at HEAD:**
  - `cardFact`, `faceKeyOf`, `changeCard` (`card-facts.ts`);
  - `makeCard`, `NEXT_CARD_KEY` (`cards.ts`);
  - `newCardGoes`, `registerStackPhrases` (`stack-phrases.ts`);
  - `startPhase` (private), `GO_TO_PHRASE` (`flow-phrases.ts`);
  - `interruptTurn`, `resumeTurn`, `interruptedTurn`, `InterruptedTurn`, `TURN_KEY`, `TURN_ROLLS_KEY`, `recordAction`, `didThisTurn`, `playersIn`, `nextIn`, `markOut`, `isOut` (`board-state.ts`);
  - `transfer`, `payCounter` (`board-phrases.ts`);
  - `matchEffectLine`, `unmetNeed`, `readsPressCard`, `cardArgsOf`, `NEEDS_ONTO` (`compile-util.ts`);
  - `CHOICE_LINE`, `readChoiceLine` (`compile-choice.ts`); `askPlayer` (`choices.ts`);
  - `seesFace`, `pickedAs`, `seatExtras`, `readSeatExtras` (`board-view.ts`);
  - `claimCards`, `fill`, `claimer` (`examples.ts`);
  - `testing.ts`: `CREW_GAME`, `MAKER_GAME`'s base, `fixtureEnv`, `vocabFor`, `runPhrase`.

---

### Task 1: Cards that name a player

Before starting: re-check `factNames`, `declaredWord`, `CARDFILTER`, `resolveCardFilter`, `VOCAB_TYPES` and its pinned test, `shownFact`, `makeCard`, `passes`, `unmetNeed`, 5-1's `ownerOf` and `it is a card whose {cardfilter}`.

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`ThingFact.kind`, `CardFilter`).
- Modify: `src/engine/core/lang/library/fact-phrases.ts` (the declaration), `refs.ts` (`CARDPLAYER`; `CARDFILTER`'s player test; `CARD`/`CARDLIST`'s suffix), `card-facts.ts` (`shownFact`), `cards.ts` (`makeCard`), `library/stack-phrases.ts` (one effect).
- Modify: `src/engine/core/lang/library/support.ts` (`passes`), `compile-util.ts` (`unmetNeed`, `readsPressCard`), `worked-view.ts` (`cardOnlyNames`).
- Modify: `src/engine/core/lang/library/card-pick-phrases.ts` (one condition), `library/compare-phrases.ts` (two conditions).
- Modify: `src/engine/core/lang/testing.ts` (`MAKER_GAME`).
- Test: `refs.test.ts` (the pinned list changes; the rest appended), `library/stack-phrases.test.ts`, `library/compare-phrases.test.ts`, `library/card-pick-phrases.test.ts`, `compile-util.test.ts`, `worked-view.test.ts`, `library/example-phrases.test.ts`.

**Interfaces:**
- Consumes: `factNames`, `declaredWord`, `ownerOf`, `theTargetCard`, `theyOf`, `cardFact`, `changeCard`, `makeCard`, `resolveZoneIds`.
- Produces (for Tasks 2–10 and plan 7-2):

```ts
// types.ts
export type ThingFact = { name: string; on: 'space' | 'card' | 'player'; kind: 'number' | 'flag' | 'player' };  // 'player': on 'card' only
/** Whom a card's test compares the player it names with: the player the line is about, or the target card's owner (Task 7 adds 'acting'). */
export type PlayerWho = 'them' | 'target owner';
export type CardFilter = /* … as built … */ | { names: string; player: PlayerWho };   // “whose maker is them”
// fact-phrases.ts — declarations
'cards can name a {name}'   'cards can name an {name}'     // → { name, on: 'card', kind: 'player' }
// refs.ts — in VOCAB_TYPES right after CARDCLAUSE
const CARDPLAYER = declaredWord('cardplayer', '[card player]', 'card fact', factNames('card', 'player'), false);
// CARDFILTER also reads “{cardplayer} is them” and “{cardplayer} is the target card's owner”.
// CARD and CARDLIST also read “<card> whose {cardplayer} is p<n>”: the match gains [fact]: 'p<n>' (a seat of the game, else seatResult's error).
// stack-phrases.ts — effect
'{int} new {cardclass} cards go to each {perzone}, each naming its owner as its {cardplayer}'
// card-pick-phrases.ts — condition, needsCard, needsOnto: the target card's zone's seat is the seat the card names; false with either missing
"the target card's owner is its {cardplayer}"
// compare-phrases.ts — conditions, needsMove, needsPlayer: the card a press moves names them, or does not (a card naming no one: not)
"they are the card's {cardplayer}"     "they are not the card's {cardplayer}"
```

- **The effect** makes n cards in each zone, zone by zone in seat order, through `makeCard`, and sets the fact to the zone's seat on each through `changeCard`. A `{cardclass}` no stack that never runs out has is refused as `newCardGoes` refuses it.
- **`makeCard`** finds its identity by the match's attributes that are no card fact naming a player, and the made card also has each such fact of the match, set through `changeCard` so its face shows it. `a new {cardclass} goes to {zone}` behaves as before.
- **`shownFact`** shows a set player fact by its seat (`'p0'`), so `faceKeyOf` puts `maker: 'p0'` on the face.
- **`passes`** for `{ names, player }`: the card's fact equals `theyOf(env)` (`them`) or `ownerOf(env, theTargetCard(env))` (`target owner`). A card without the fact, or a target with no owner, fails.
- **Needs.**
  - `unmetNeed` treats a test of `them` as `needsPlayer` and one of `target owner` as `needsOnto`, with their messages, wherever the test sits (a group's `whose`, a clause, a lone `{cardfilter}`).
  - `readsPressCard` is true for a line holding a `target owner` test.
  - `cardOnlyNames` returns null for a ref whose args hold a player test (fail closed).
- **A misnamed fact** in `whose makr is them` is explained as `{cardplayer}` explains it, not as an attribute.
- **`testing.ts`:**

```ts
/**
 * CREW_GAME where each player starts with 2 Stakes in their purse, each naming them as its maker, and keeps the stakes they buy in their
 * holdings. A Stake is made from a stack, never dealt.
 */
export const MAKER_GAME = CREW_GAME
  .replace('  Cards can be tired.', ['  A stack called stakes that never runs out:', '    | name  |', '    | Stake |', '  Cards can be tired.',
    '  Cards can name a maker.'].join('\n'))
  .replace('  Each player has an idle row that everyone can see.', ['  Each player has an idle row that everyone can see.',
    '  Each player has a purse row that everyone can see.', '  Each player has a holdings row that everyone can see.'].join('\n'))
  .replace('  Deal 2 cards from the pile to each stash.',
    '  Deal 2 cards from the pile to each stash.\n  2 new Stake cards go to each purse, each naming its owner as its maker.');
```

- [ ] **Step 1: Write the failing tests.**
  - **Declared and made** (`library/stack-phrases.test.ts`).
    - `MAKER_GAME` compiles with `[]`; `game.facts` includes `{ name: 'maker', on: 'card', kind: 'player' }`; `vocabFor(game).facts` too.
    - A 2-player engine from `initialState(game, 1)`, through Setup:
      - `purse-p0` holds `c11` and `c12`, and `purse-p1` holds `c13` and `c14`;
      - each has `data` `{ name: 'Stake', maker: <its seat> }`;
      - `parseTextFaceKey(c11.faceKey)` is `{ name: 'Stake', maker: 'p0' }`.
    - `… each naming its owner as its makr.` gives one error on its line whose message contains `“makr”`.
    - `2 new Stoke cards go to each purse, …` gives the `{cardclass}` type's error for `Stoke`.
  - **Tests by the named player** (`refs.test.ts`, with `vocabFor(compileGame(MAKER_GAME).game)`).
    - `the cards in each holdings whose maker is them` gives `{ kind: 'in', zones: [{ each: 'holdings' }], whose: [{ names: 'maker', player: 'them' }] }`.
    - `maker is the target card's owner` as a `{cardfilter}` gives `{ names: 'maker', player: 'target owner' }`.
    - `makr is them` gives `There is no card fact called “makr”.`
    - `a Stake whose maker is p1` as a `{card}` gives `{ name: 'Stake', maker: 'p1' }`; in a `{cardlist}`, `a Stake whose maker is p1 and a Stake whose maker is p0` gives both.
    - **Changed line:** the pinned `VOCAB_TYPES` list gains `['cardplayer', '[card player]']` right after `['cardclause', '[that is …]']`.
  - **Conditions** (`library/compare-phrases.test.ts`). A 3-player `MAKER_GAME` state arranged with `stake`:
    - `holdings-p1` holds a Stake whose maker is p0;
    - `holdings-p2` holds one whose maker is p1;
    - `workshop-p0` and `workshop-p2` each hold a Vase.

    Each condition runs through `runPhrase` with `fixtureEnv`:
    - About p0, `they have a card in each holdings whose maker is them` holds; about p2 it does not.
    - About p1, with `subject.onto` p0's Vase, `they have no card in their holdings whose maker is the target card's owner` does not hold. With p2's Vase it holds.
    - With a move whose card is p1's held Stake (maker p0):
      - `they are the card's maker` holds about p0 and not about p1;
      - `they are not the card's maker` is the reverse;
      - for a Potter, `they are the card's maker` is false and the `not` form true.
  - **The target's owner** (`library/card-pick-phrases.test.ts`). With subject card p1's held Stake (maker p0), `the target card's owner is its maker` holds:
    - for p0's Vase: true;
    - for p2's Vase: false;
    - **Review Focus,** for a Vase in the scrap: false.
  - **Refused when the rules are read** (`compile-util.test.ts`).
    - `    Only if they have a card in their holdings whose maker is the target card's owner.` under `A player may stop.` gives NEEDS_ONTO's message for that line.
    - A section `Backed:` / `  Only if it is a card whose maker is them.` gives `“it is a card whose maker is them” only makes sense in a rule about a player, such as a move, an action or a “When a player …” rule.`
    - `readsPressCard` is true for a group holding the `target owner` test.
  - **The view** (`worked-view.test.ts`, appended): (guard) `shownFlags(compiled(MAKER_GAME))` is `[]`, and `standIns(compiled(MAKER_GAME))` is `{}`.
  - **Example words** (`library/example-phrases.test.ts`). `MAKER_GAME` with these appended passes `runExamples`; a copy whose last line reads `… maker is p2` fails on that line.

```text
Example: a card naming a player is made for an example that skips Setup
  Given p1's holdings has a Stake whose maker is p0
  Then p1's holdings has a Stake whose maker is p0

Example: after Setup, an example takes the card made then
  Given the game is set up
  And p1's holdings has a Stake whose maker is p0
  Then p0's purse has a Stake whose maker is p0
  And p1's purse has a Stake whose maker is p1 and a Stake whose maker is p1
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/stack-phrases.test.ts src/engine/core/lang/refs.test.ts src/engine/core/lang/library/compare-phrases.test.ts src/engine/core/lang/library/card-pick-phrases.test.ts src/engine/core/lang/compile-util.test.ts src/engine/core/lang/worked-view.test.ts src/engine/core/lang/library/example-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `ThingFact.kind` and `CardFilter` named in the Global Constraints.
- [ ] **Step 4: Run** the seven files, then `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`. A Startup or board-game line now read two ways is an `ambiguous` diagnostic: stop and report it.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/library/fact-phrases.ts src/engine/core/lang/refs.ts \
  src/engine/core/lang/card-facts.ts src/engine/core/lang/cards.ts src/engine/core/lang/library/stack-phrases.ts \
  src/engine/core/lang/library/support.ts src/engine/core/lang/compile-util.ts src/engine/core/lang/worked-view.ts \
  src/engine/core/lang/library/card-pick-phrases.ts src/engine/core/lang/library/compare-phrases.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/library/stack-phrases.test.ts src/engine/core/lang/refs.test.ts src/engine/core/lang/library/compare-phrases.test.ts \
  src/engine/core/lang/library/card-pick-phrases.test.ts src/engine/core/lang/compile-util.test.ts src/engine/core/lang/worked-view.test.ts \
  src/engine/core/lang/library/example-phrases.test.ts
git commit -F - <<'EOF'
feat(lang): cards that name a player, made for each player and tested by whom they name

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: A button's card picked in another player's zone

Before starting: re-check 6-1's `ANOTHER_PLAYERS`, `OTHERS_ONLY_AS_TARGET`, `othersZone`, `othersZoneIds`, `ontoZoneIds`, `mayHideFromPresser`, `isOneZone` and its compile test of the jinx line; `cardCandidates`, `takeableIds`, `cardIn`, `aboutCard`, `aboutSet`, `cardPrompt`; and P16's `cardFor` and `pressesCardButton`.

**Files:**
- Modify: `src/engine/core/lang/compile-phase.ts` (the pick's own zone may be another player's; three refusals).
- Modify: `src/engine/core/lang/declared-moves.ts` (`fromZoneIds`), `declared-actions.ts` (`cardCandidates`, `cardIn` for the pick's zone, `aboutSet`).
- Modify: `src/engine/core/lang/library/card-pick-phrases.ts` (P16 reads the pick's zones through `fromZoneIds`).
- Modify: `src/engine/core/lang/testing.ts` (`BUY_GAME`).
- Test: `compile-phase.test.ts` (one existing test changes, named below), `declared-actions.test.ts`, `board-view.test.ts`, `library/card-pick-phrases.test.ts` (appended).

**Interfaces:**
- Consumes: `othersZoneIds`, `othersZone`, `ANOTHER_PLAYERS`, `moveZoneId`, `isTakeable`, `pickedAs`, Task 1's `MAKER_GAME` and card words.
- Produces (for Tasks 3, 8 and plan 7-2):

```ts
// declared-moves.ts
/** Every zone a pick's own card may be in for `by`: othersZoneIds for an `others` zone, else the one zone moveZoneId gives ([] for none). */
export function fromZoneIds(state: GameState, seats: PlayerId[], by: PlayerId, pick: CardPick): string[];
// compile-phase.ts — OTHERS_ONLY_AS_TARGET is replaced by:
const OTHERS_NOT_WHERE_IT_GOES = (text: string) =>
  `“${text}” can't be where a button puts its cards: say whose zone it is, as in “their ${text.replace(ANOTHER_PLAYERS, '$1')}”.`;
const OTHERS_IN_A_MOVE = (text: string) =>
  `A card is dragged only from the player's own zones or the center. To pick one in ${text}, make the line a button with a cost line, or write “a card in ${text}”.`;
const SOME_FROM_OTHERS = (text: string) => `A button picks one card in ${text}: write “a card in ${text}”.`;
```

- **Reading it** (`compileCardPick`).
  - A `from` text, or the text after "a card in", that matches `ANOTHER_PLAYERS` is read by `othersZone` into `{ others: zone }`.
  - A `to` text that matches gets `OTHERS_NOT_WHERE_IT_GOES(text)` on the button's line, and no button is made.
  - A set ("some cards") from such a zone gets `SOME_FROM_OTHERS(text)`, and no button is made.
  - A card move (a line with no cost line, from a zone to a zone) from such a zone gets `OTHERS_IN_A_MOVE(text)`, and no move is made.
  - `mayHideFromPresser` judges the pick's zone as 6-1 judges a target zone.
- **Using it.** Every reader of the pick's own zone for a seat goes through `fromZoneIds`:
  - `cardCandidates` offers each zone's takeable cards in that order;
  - `cardIn` accepts the card in any of them;
  - P16's `cardFor` and `pressesCardButton` take the card from the zone the press names (`… from p2's purse`), else from the first zone in order that holds a match not taken.
  - `cardPrompt` keeps the text as written: `Pick a card in another player's purse to buy.`
- **`testing.ts`:**

```ts
/** MAKER_GAME where a player may buy a card in another player's purse for 1 move, into their holdings. */
export const BUY_GAME = MAKER_GAME.replace('  A player may stop.', [
  "  A player may buy a card in another player's purse.", '    It costs 1 move.', '    Then:', '      Move it to their holdings.',
  '  A player may stop.'].join('\n'));
```

- [ ] **Step 1: Write the failing tests.**
  - **Compiled** (`compile-phase.test.ts`, `describe("a card picked in another player's zone")`).
    - `BUY_GAME` compiles with `[]`. The buy button's `pick` is `{ some: false, from: { others: 'purse' }, fromText: "another player's purse", to: null, onto: null, ontoText: null }`, with no `ontoAlso` key.
    - With a cost line, `A player may give a card from their stash to another player's purse.` gives `“another player's purse” can't be where a button puts its cards: say whose zone it is, as in “their purse”.`, and no `give …` button.
    - With a cost line, `A player may take some cards from another player's purse to their holdings.` gives `A button picks one card in another player's purse: write “a card in another player's purse”.`
    - `A player may pass a card from another player's purse to their holdings.` (no cost line) gives `OTHERS_IN_A_MOVE("another player's purse")`, and no `pass` move.
    - **Review Focus.** `A player may peek a card in another player's stash.` with `    It costs 1 move.` and `    Only if it is a Vase card.` gives, on the `Only if` line, the message `reportHiddenCardReads` gives for a zone the presser can't see. 6-1 pins it as `This line would tell the player what the card is, though they can't see the cards in another player's stash. Check it in the Then: lines, after a reveal.`; pin what the compiler says and report it if it differs.
    - **Changed test:** 6-1 Task 1's test that `A player may jinx a card in another player's workshop.` is refused becomes: it compiles with `[]`, its pick has `from: { others: 'workshop' }` and `to: null`, and the phase has the `jinx …` button.
    - **Both zones another player's** (7-2's Invest that places its token). `BUY_GAME` with `A player may place a card from another player's purse to a card in another player's workshop.`, `    It costs 1 move.`, `    Then:`, `      Move it to their holdings.` compiles with `[]`. Its pick has `from: { others: 'purse' }`, `to: null` and `onto: { others: 'workshop' }`. In the engine below, with a Vase in `workshop-p1`, p0 placing `c13` to that Vase puts `c13` in `holdings-p0`.
  - **Offered and pressed** (`declared-actions.test.ts`). A 3-player `BUY_GAME` engine, p0 to act. `stake` arranges each seat's purse with 2 Stakes naming that seat: p0's are `c11` and `c12`, p1's `c13` and `c14`, p2's `c15` and `c16`.
    - `cardPrompt(buy)` is `Pick a card in another player's purse to buy.`
    - `cardCandidates(runtime, buy, state, 'p0')` is `['c13', 'c14', 'c15', 'c16']`; for `'p2'` it is `['c11', 'c12', 'c13', 'c14']`.
    - p0 buying `c15` puts it in `holdings-p0`, leaves `purse-p2` with `c16`, and leaves p0 2 moves.
    - p0 buying `c11` (their own) is refused with the prompt.
    - **Review Focus.** With p1 marked out, the candidates for `'p0'` are `['c15', 'c16']`, and buying `c13` is refused with the prompt.
  - **The view** (`board-view.test.ts`, Review Focus). In `BUY_GAME` with the peek button above and no `Only if` under it, and a Vase in `stash-p1`, p0's `seatExtras` lists that card under the peek button's `cards.cards` as `{ id, name: 'a face-down card', … }`.
  - **Examples** (`library/card-pick-phrases.test.ts`). `BUY_GAME` with this appended passes `runExamples`:

```text
Example: a card bought from another player's purse is the first from the left that matches, unless the press names the zone
  Given 3 players
  And p1's purse has a Stake whose maker is p1
  And p2's purse has a Stake whose maker is p2
  When p0 buys the Stake
  Then p0's holdings has a Stake whose maker is p1
  When p0 buys the Stake from p2's purse
  Then p0's holdings has a Stake whose maker is p1 and a Stake whose maker is p2
  And p2's purse is empty
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/board-view.test.ts src/engine/core/lang/library/card-pick-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the four files, then `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`. 6-1's `JINX_GAME` examples, 4-1's `TWO_HIRES_GAME` tests and Startup's three "asks an example which … it means" tests pass unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/compile-phase.ts src/engine/core/lang/declared-moves.ts src/engine/core/lang/declared-actions.ts \
  src/engine/core/lang/library/card-pick-phrases.ts src/engine/core/lang/testing.ts src/engine/core/lang/compile-phase.test.ts \
  src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/board-view.test.ts src/engine/core/lang/library/card-pick-phrases.test.ts
git commit -F - <<'EOF'
feat(lang): a button's card picked in another player's zone, offered seat by seat from the presser's left

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: What a card's players pay and get, where it goes back to, players tied by a card, and a phase handed on

Before starting: re-check `transfer`, `payCounter`, `playerValueOf`, `ownerOf`, `startPhase`, `OWNER_PREFIX` and the zone source in `refs.ts`, `describeZone`, `resolveZoneIds`, `mentionsActor`, `CHOICE_LINE`/`readChoiceLine`, and 4-1's `another player has a card in their {perzone} whose {cardfilter}`.

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`SeatRef` gains `{ named: string }`).
- Modify: `src/engine/core/lang/refs.ts` (zones read `its <fact>'s <zone>`), `library/support.ts` (`describeZone`), `zones.ts` (`resolveZoneIds`), `declared-moves.ts` (`moveZoneId`: null), `compile-util.ts` (`unmetNeed`: such a zone needs a card), `compile-phase.ts` (refused in a pick).
- Modify: `src/engine/core/lang/library/compare-phrases.ts` (four conditions), `library/board-phrases.ts` (five effects), `library/flow-phrases.ts` (two effects).
- Modify: `src/engine/core/lang/testing.ts` (`RATE_GAME`).
- Test: `library/compare-phrases.test.ts`, `library/board-phrases.test.ts`, `library/flow-phrases.test.ts`, `refs.test.ts`, `compile-phase.test.ts` (appended).

**Interfaces:**
- Consumes: Tasks 1–2; `transfer`, `addToCounter`, `payCounter`, `playerValueOf`, `ownerOf`, `itCard`, `theyOf`, `startPhase`, `playersIn`, `cardsInZones`, `passes`.
- Produces (for Tasks 8, 10 and plan 7-2). "Its maker" below stands for `its {cardplayer}`, the seat the card the line is about names.

```ts
// types.ts
export type SeatRef = { seat: string } | { who: 'actor' | 'winner' | 'other' } | { named: string };  // “its maker's purse”: the seat it names
// compare-phrases.ts — conditions
'its owner has at least {int} cards in their {perzone}'                         // needsCard; no owner: false
"they have at least its {cardplayer}'s {playervalue} in {counter}"              // needsCard, needsPlayer; names no one: false
"some other player is not the card's {cardplayer}"                              // needsMove, needsPlayer: a seat still in, not them, not named
'another player tied to them by a card in their {perzone} has a card in their {perzone} whose {cardfilter}'     // needsPlayer
'no other player tied to them by a card in their {perzone} has a card in their {perzone} whose {cardfilter}'   // needsPlayer
// board-phrases.ts — effects; a card naming no such player, or with no owner, throws RuleError NAMES_NO / NO_OWNER
"they pay its {cardplayer}'s {playervalue} to its owner"      // needsCard, needsPlayer, needsPayment — through transfer
"they get its {cardplayer}'s {playervalue} from its {cardplayer}"   // needsCard, needsPlayer, needsPayment — transfer from the named seat
"its owner gets its {cardplayer}'s {playervalue}"             // needsCard, needsPayment — from the bank
'its {cardplayer} gets {int} {counter}'                       // needsCard — from the bank
'they pay {int} to its owner'                                 // needsCard, needsPlayer, needsPayment
const NAMES_NO = (fact: string) => `It names no ${fact}.`;
const NO_OWNER = 'It is in no player\'s zone, so it has no owner.';
// flow-phrases.ts — effects, entersPhase (args[0] is the phase), through startPhase
'the {phase} phase starts with its owner'                     // needsCard
'hand the {phase} phase to that player'                       // needsPick: read in a choice line, “Hand the answer phase to another player of their choice who …”
```

- **Two players tied by a card.** Seats P and Q (Q still in, not P) are tied by a card in the zone Z each has when either has, in their own Z, a card that names the other under any player fact of the game.
- **The second `{perzone}`** of the tie conditions is read for Q: `their workshop` is Q's.
- **`its {cardplayer}'s {perzone}`**:
  - it is read as a zone wherever a zone is: `{ of: { named: 'maker' }, zone: 'purse' }`;
  - `describeZone` gives `its maker's purse`;
  - `resolveZoneIds` reads the fact on `itCard(env)`, and throws `NAMES_NO(fact)` when there is none;
  - `unmetNeed` says such a zone needs a card, with the existing "only makes sense in a rule about a card" message;
  - in a pick's own zone, `to` or target it is refused: `NAMED_ZONE_IN_PICK(text)` = `` `“${text}” can't be where a button picks or puts its cards: say whose zone it is, as in “their ${zone}”.` ``.
- **`testing.ts`:**

```ts
/**
 * MAKER_GAME where a player's rate is the total pay of their jobs. Buying another player's stake costs its maker's rate, paid to its owner,
 * while its owner keeps 2 or more, and pays its maker 3 more while the scrap has a Vase. A maker may ask a stake back (its owner answers)
 * or sue for it; a holder may offer one to anyone but its maker, who answers; and a maker may pay every holder of theirs their rate.
 */
export const RATE_GAME = [
  MAKER_GAME
    .replace('  Cards can name a maker.', '  Cards can name a maker.\n  Cards can be wanted.')
    .replace('  A player may stop.', [
      "  A player may buy a card in another player's purse.", '    It costs 1 move.',
      '    Only if its owner has at least 2 cards in their purse.', "    Only if they have at least its maker's rate in coins.", '    Then:',
      "      They pay its maker's rate to its owner.", '      If the scrap has a Vase, its maker gets 3 coins.', '      Move it to their holdings.',
      "  A player may ask back a card in another player's holdings.", '    It costs 1 move.', '    Only if it is a card whose maker is them.',
      '    Then:', '      It is wanted.', '      The answer phase starts with its owner.',
      '  A player may offer a card in their holdings.', '    It costs 1 move.', "    Only if some other player is not the card's maker.",
      '    Then:', '      It is wanted.', "      Hand the answer phase to another player of their choice who is not the card's maker.",
      "  A player may sue a card in another player's holdings.", '    Only if it is a card whose maker is them.', '    Then:',
      '      They pay 5 to its owner.', '      Move it to their purse.',
      '  A player may cash in.', '    Then:', "      For each card in each holdings whose maker is them, its owner gets its maker's rate.",
      '  A player may stop.'].join('\n'))
    .replace('End:', ['Phase: answer', '  Players take turns.',
      '  A player may sell back a card in their holdings.', '    Only if it is wanted.', '    Then:',
      "      They get its maker's rate from its maker.", '      It is not wanted.', "      Move it to its maker's purse.",
      '      Go back to the interrupted turn.',
      "  A player may take a card in another player's holdings.", '    Only if it is wanted.', '    Then:',
      "      They pay its maker's rate to its owner.", '      It is not wanted.', '      Move it to their holdings.',
      '      Go back to the interrupted turn.',
      '  A player may refuse.', '    Then:', '      No card is wanted.', '      Go back to the interrupted turn.', '', 'End:'].join('\n')),
  '', 'Rate:', "  A player's rate is the total pay of the cards in their workshop.",
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**
  - **Setup for the presses.** A 3-player `RATE_GAME` engine, turn p0 in working, 9 coins and 3 moves each.
    - Purses as in Task 2.
    - `workshop-p1` holds a Statue (pay 2), so p1's rate is 2; `workshop-p2` holds a Vase (pay 1), so p2's rate is 1.
    - Each case starts from that table.
  - **Compiled.** `RATE_GAME` compiles with `[]`, with no "Nothing leads to the phase “answer”." warning.
  - **Buying** (`library/board-phrases.test.ts`, `describe("what a card's players pay and get")`).
    - p0 buys `c13`: p0 has 7 coins, p1 has 11, `holdings-p0` holds `c13`, `purse-p1` holds `c14`, and p0 has 2 moves.
    - Then buying `c14` is refused with `its owner has at least 2 cards in their purse`.
    - p0 buys `c15`: p0 has 8 and p2 has 10.
    - **Review Focus:** at 1 coin, buying `c13` is refused with `they have at least its maker's rate in coins`.
    - With a Vase in the scrap, p0 buys `c13`: p1 has 14 and p0 has 7.
  - **Paying every holder.** `holdings-p0` holds `c13` and `holdings-p2` holds `c14`. On p1's turn, p1 cashes in: p0 and p2 each have 11, and p1 has 9.
  - **Suing.** `holdings-p0` holds `c13`, on p1's turn. p1 sues `c13`: p1 has 4, p0 has 14, and `c13` is in `purse-p1` with no `lang:on`.
  - **Asking back** (`library/flow-phrases.test.ts`). `holdings-p0` holds `c13`, on p1's turn.
    - p1 asks back `c13`: `c13` is wanted, the phase is answer, the current seat p0, and `interruptedTurn(state)` has `{ phase: 'working', current: 'p1' }`. p1 has 2 moves.
    - p0 sells back `c13`: p0 has 11 and p1 has 7; `c13` is in `purse-p1` and not wanted; the phase is working and the current seat p1.
    - p1 asking back `c15` (p2's, in `holdings-p0`) is refused with `it is a card whose maker is them`.
  - **Offering.** `holdings-p0` holds `c13`.
    - p0 offers `c13`: only p2 qualifies, so it is filled in; the phase is answer with p2 current.
    - p2 takes `c13`: p2 has 7, p0 has 11, `c13` is in `holdings-p2` and not wanted, and the turn is p0's in working.
    - p2 refusing instead leaves `c13` in `holdings-p0` and not wanted.
    - **Review Focus:** a 2-player engine where p0 holds a Stake whose maker is p1. p0's offer is refused with `some other player is not the card's maker`, and the state is unchanged.
  - **Tied** (`library/compare-phrases.test.ts`, through `runPhrase` about each seat). `holdings-p0` holds `c13` (maker p1), and each workshop holds a Statue.
    - `another player tied to them by a card in their holdings has a card in their workshop whose name is Statue` holds about p0 and about p1, and not about p2. `no other player tied …` is its negation for each.
    - **Review Focus:**
      - with p1's Statue moved to the scrap, it fails about p0: p2 has one, but is not tied;
      - with p1 marked out, it fails about p0;
      - with `c13` in `purse-p0` instead, it fails about p0 and p1: a card in another zone ties no one.
  - **Where it goes back to** (`refs.test.ts`, `compile-phase.test.ts`, `library/board-phrases.test.ts`).
    - `its maker's purse` as a `{zone}` gives `{ of: { named: 'maker' }, zone: 'purse' }`, and `describeZone` of it is `its maker's purse`.
    - `      Move it to its maker's purse.` under `A player may stop.`'s `Then:` gives `“Move it to its maker's purse” only makes sense in a rule about a card, such as “When a card …”.`
    - With a cost line, `A player may give a card from their stash to its maker's purse.` gives `NAMED_ZONE_IN_PICK("its maker's purse")` with `their purse`.
    - **Review Focus:** `runPhrase` of `move it to its maker's purse` about a Potter throws `It names no maker.` `runPhrase` of `its owner gets its maker's rate` about a Stake whose maker is p1, lying in the scrap, throws `It is in no player's zone, so it has no owner.`
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/compare-phrases.test.ts src/engine/core/lang/library/board-phrases.test.ts src/engine/core/lang/library/flow-phrases.test.ts src/engine/core/lang/refs.test.ts src/engine/core/lang/compile-phase.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `SeatRef`.
- [ ] **Step 4: Run** the five files, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. Rent Day's `they pay its {spaceattr} to its owner` and `its player gets {int} {counter}` behave as before.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/refs.ts src/engine/core/lang/library/support.ts src/engine/core/lang/zones.ts \
  src/engine/core/lang/declared-moves.ts src/engine/core/lang/compile-util.ts src/engine/core/lang/compile-phase.ts \
  src/engine/core/lang/library/compare-phrases.ts src/engine/core/lang/library/board-phrases.ts src/engine/core/lang/library/flow-phrases.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/library/compare-phrases.test.ts src/engine/core/lang/library/board-phrases.test.ts \
  src/engine/core/lang/library/flow-phrases.test.ts src/engine/core/lang/refs.test.ts src/engine/core/lang/compile-phase.test.ts
git commit -F - <<'EOF'
feat(lang): prices and payments through the player a card names, the zone it goes back to, players tied by a card, and a phase handed to a card's owner or a chosen player

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: Values about a player by lookup

Before starting: re-check `registerPlayerValuePhrases`, `compilePlayerValues`, `LINE_UNDER_OTHER`, `playerValueOf`, `cardsIn`, `totalOf`, `cardValueOf` and `FORCE_GAME`.

**Files:**
- Modify: `src/engine/core/lang/library/player-value-phrases.ts` (four values).
- Modify: `src/engine/core/lang/testing.ts` (`LOOKUP_GAME`).
- Test: `library/player-value-phrases.test.ts`, `compile.test.ts` (appended).

**Interfaces:**
- Consumes: `cardsIn`, `cardValueOf`, `totalOf`, `playerValueOf`.
- Produces (for Task 10 and plan 7-2). Each is `needsPlayer`; "so far" is what the lines before made of the value, from 0.

```ts
"a player's {playervalue} is {int}"                                              // n
"a player's {playervalue} is {int} if their {playervalue} is at least {int}"     // n when the other value is at least m, else so far
"a player's {playervalue} is the highest {attribute} of {cardgroup}"             // the highest number among the group, read as cardValueOf
                                                                                 // reads it (worked values too); 0 when no card has one
"a player's {playervalue} goes up by the total {attribute} of {cardgroup}"       // so far + the total
```

- **`testing.ts`:**

```ts
/** FORCE_GAME with lookups: a rate from the highest worth in the workshop, a yield by ranges of red load, and a reach that adds two totals. */
export const LOOKUP_GAME = [
  FORCE_GAME, '',
  'Top worth:', "  A player's top worth is the highest worth of the cards in their workshop.", '',
  'Rate:', "  A player's rate is 5.", "  A player's rate is 10 if their top worth is at least 3.",
  "  A player's rate is 15 if their top worth is at least 4.", '',
  'Yield:', "  A player's yield is 1 if their red load is at least 1.", "  A player's yield is 2 if their red load is at least 3.",
  "  A player's yield is 3 if their red load is at least 5.", '',
  'Reach:', "  A player's reach is the total pay of the cards in their workshop.",
  "  A player's reach goes up by the total wage of the cards in their crew.",
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**
  - **Values** (`player-value-phrases.test.ts`, `describe('values by lookup')`). A 3-player `LOOKUP_GAME` runtime, read through `runtime.playerValue` about p0. A Vase has worth 3, red need 2 and pay 1; a Statue has worth 4, red need 1 and pay 2.

    | p0's workshop | top worth | rate | red load | yield | reach |
    |---|---|---|---|---|---|
    | empty | 0 | 5 | 0 | 0 | 0 |
    | a Vase | 3 | 10 | 2 | 1 | 1 |
    | a Statue | 4 | 15 | 1 | 1 | 2 |
    | a Vase, a Statue | 4 | 15 | 3 | 2 | 3 |
    | two Vases, a Statue | 4 | 15 | 5 | 3 | 4 |

    - The reach of a lone Vase with a Potter and a Smith on it (`crew-p0`) is 4. With a Tinker added it is 5: WORKED_GAME's `A Tinker card's wage is 1.` is read.
    - **Review Focus.**
      - `a player's top worth is the highest pay of the cards in their crew`, through `runPhrase` about p0 with a Potter in the crew, gives 0: hands have no pay.
      - With `Rate:`'s lines in the order "15 if …, 10 if …, 5", a Statue gives a rate of 5: the last line that applies wins.
  - **Compiled** (`compile.test.ts`, `describe('values by lookup')`).
    - `LOOKUP_GAME` compiles with `[]`, and `game.playerValues.rate.refs` has the phrases of the three lines in order.
    - Under `Rate:`, `  A player's yield is 1 if their red load is at least 1.` gives `This line is about “yield”, but it is under Rate:.`
    - `  A player's rate is 10 if their top wrth is at least 3.` gives `There is no player value called “top wrth”.`
    - `  A player's rate is the highest worth of the cards on it.` gives `“A player's rate is the highest worth of the cards on it” only makes sense in a rule about a card, such as “When a card …”.`
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/player-value-phrases.test.ts src/engine/core/lang/compile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. If 4-3's `shownPlayerValues` lists player values by their line phrases, the new lines stay unshown: report rather than change it.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/player-value-phrases.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/library/player-value-phrases.test.ts src/engine/core/lang/compile.test.ts
git commit -F - <<'EOF'
feat(lang): values about a player by lookup: a number, a number past a step of another value, the highest of a group, and a total added

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: A zone whose cards sit on other players' cards

Before starting: re-check `playerRowMarked`, `MARK_NEEDS_EVERYONE`, `sharedZoneOnCards`, `HOLDER_KEY`, `withoutHolder`, `putOn`, `cardsOn`, `attachmentProblem`, `onCardsZoneOf`, `itGoesOnTarget`, `cardHasOnItGiven`, `onItIs`, 4-1's fit-layout guard, and every reader of `cardsOn` at HEAD (5-1 to 6-3 added some).

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`ZoneSpec.across?: true`).
- Modify: `src/engine/core/lang/library/setup-phrases.ts` (two zone lines; the shared form refused).
- Modify: `src/engine/core/lang/zones.ts` (`ON_SEAT_KEY`; `withoutHolder` drops it).
- Modify: `src/engine/core/lang/attach.ts` (`putOn`, `cardsOn`, `othersOn`, `attachmentProblem`).
- Modify: `src/engine/core/lang/library/attach-phrases.ts` (a Given and two expects).
- Modify: `src/engine/core/lang/testing.ts` (`POST_GAME`).
- Test: `library/setup-phrases.test.ts`, `attach.test.ts`, `library/attach-phrases.test.ts`, `fit-layout.test.ts` (guard), all appended.

**Interfaces:**
- Consumes: Tasks 1–2 (`MAKER_GAME`, `the target card's owner is its {cardplayer}`, a pick's target in another player's zone from 6-1); `relocate`, `zoneInfo`, `namedCardIn`, `onCardsZone`.
- Produces (for Tasks 6, 8, 10 and plan 7-2):

```ts
// types.ts — ZoneSpec gains: across?: true;   // a row each player has, everyone sees, onCards 'some': its cards sit on other players' cards
// setup-phrases.ts — zone lines (shared forms: “Only a zone each player has can hold cards on cards.”)
"each player has a {name} row that {visibility}, where some cards are on other players' cards"     // and the “an” form
const ACROSS_NEEDS_EVERYONE = "Only a row everyone can see can end with “, where some cards are on other players' cards”.";
// zones.ts
/** The seat of the card a card sat on when it was put there, kept with a card in a zone whose cards sit on other players' cards (R1). */
export const ON_SEAT_KEY = 'lang:on-seat';
// attach.ts
export function cardsOn(state: GameState, holderId: string): CardState[];   // now leaves out every card with ON_SEAT_KEY: the holder owner's own
/** The cards of other players that sit on the card `holderId`, by zone id, then slot. */
export function othersOn(state: GameState, holderId: string): CardState[];
const ACROSS_OWN = (card: string, holder: string) => `${card} is on the ${holder}, but cards there sit only on other players' cards.`;
// attach-phrases.ts — example lines
'{card} in {zone} is on {card} in {zone}'        // given: puts the first card on the second where it is, through putOn
'{card} in {zone} is on {card} in {zone}'        // expect
'{card} in {zone} is on no card'                 // expect
```

- **`putOn`.** Moving cards into a zone with `across` sets `ON_SEAT_KEY` on each to the seat of the holder's zone now. `relocate`, through `withoutHolder`, drops both keys on every move.
- **`attachmentProblem`, for a card in a zone with `across`.**
  - Its holder must be on the table and out of the box, as today.
  - `ON_SEAT_KEY` equal to the card's own seat gives `ACROSS_OWN(theCard(card), holder's name)`.
  - Otherwise the holder must be in a zone everyone sees whose seat is `ON_SEAT_KEY`, else the existing "… which is now in …" message.
  - Every other zone is judged as today.
- **The Given** puts the first card, which must be in a zone marked for cards on cards (else `onCardsZone`'s message), on the second through `putOn` in its own zone, and tells no join. It works for any marked zone.
- **`testing.ts`:**

```ts
/**
 * MAKER_GAME where a stake can be posted on a job in its maker's workshop and stays in its holder's holdings, on that job. A job can be
 * shelved (to a zone everyone sees, its crew going idle) or hidden (to the stash).
 */
export const POST_GAME = MAKER_GAME
  .replace('  Each player has a holdings row that everyone can see.', [
    "  Each player has a holdings row that everyone can see, where some cards are on other players' cards.",
    '  Each player has a shelf row that everyone can see.'].join('\n'))
  .replace('  A player may stop.', [
    "  A player may post a card from their holdings to a card in another player's workshop.", '    It costs 1 move.',
    "    Only if the target card's owner is its maker.", '    Only if it is not on the target card.', '    Then:',
    '      It goes to their holdings, on the target card.',
    '  A player may shelve a card from their workshop to their shelf.', '    It costs 1 move.', '    Then:', '      Every card on it goes to their idle.',
    '  A player may hide a card from their workshop to their stash.', '    It costs 1 move.',
    '  A player may stop.'].join('\n'));
```

- [ ] **Step 1: Write the failing tests.**
  - **Zone lines** (`library/setup-phrases.test.ts`).
    - `Each player has a holdings row that everyone can see, where some cards are on other players' cards.` gives `{ name: 'holdings', perPlayer: true, layout: 'row', visibility: 'public', onCards: 'some', across: true }`; the `an` form of another name too.
    - `…that only they can see, where some cards are on other players' cards.` gives `ACROSS_NEEDS_EVERYONE`.
    - `The vault is a row in the center that everyone can see, where some cards are on other players' cards.` gives `Only a zone each player has can hold cards on cards.`
  - **The check** (`attach.test.ts`, on `POST_GAME`, 3 players, with `stake`, `relocate` and `putOn`). p1's Stake (maker p0) is in `holdings-p1`; p0's Vase is in `workshop-p0`.
    - `attachmentProblem` is null:
      - for the Stake on nothing;
      - for the Stake put on the Vase, which then has `lang:on` the Vase and `lang:on-seat` `'p0'`;
      - with the Vase then moved to `shelf-p0`.
    - It is refused:
      - with the Vase in `stash-p0`: `The Stake in p1's holdings is on the Vase, which is now in p0's stash. Move the cards on a card along with it.`;
      - with the Vase in `workshop-p2`: `… which is now in p2's workshop. …`;
      - with the Vase in the scrap: `… which is now in the scrap. …`;
      - **Review Focus,** for a Stake put on a Vase in `workshop-p1`: `The Stake in p1's holdings is on the Vase, but cards there sit only on other players' cards.`
    - `cardsOn(state, vase)` holds p0's Potter put on the Vase (`crew-p0`) and not the Stake; `othersOn(state, vase)` holds the Stake alone.
    - Relocating the Stake to the scrap leaves it with neither `lang:on` nor `lang:on-seat`.
    - (guard) `YARD_GAME`'s and `CREW_GAME`'s `attachmentProblem` tests pass unchanged.
  - **Pressed** (`library/attach-phrases.test.ts`). A 3-player `POST_GAME` engine on p1's turn. `holdings-p1` holds a Stake whose maker is p0; `workshop-p0` holds a Vase with a Potter on it; `workshop-p2` holds a Statue.
    - p1 posts the Stake to the Vase: the Stake is on the Vase with `lang:on-seat` `'p0'`, and p1 has 2 moves.
    - Posting it to p2's Statue is refused with `the target card's owner is its maker`.
    - From a table arranged with the Stake already on the Vase (`putOn`) and the turn p0's:
      - p0 shelves the Vase: the Vase is in `shelf-p0` with the Stake still on it, and the Potter is in `idle-p0`;
      - **Review Focus:** p0 hiding the Vase is refused with the stash message above, and the engine's state is unchanged;
      - **Review Focus:** p0 finishing the Vase is refused with the scrap message (Task 6 writes its return).
    - **Examples.** `POST_GAME` with these appended passes `runExamples`:

```text
Example: a stake on another player's job stays on it as the job is shelved, and the cards on the job are only its own player's
  Given p1's holdings has a Stake whose maker is p0
  And p0's workshop has a Vase
  And the Vase in p0's workshop has a Potter on it
  And the Stake in p1's holdings is on the Vase in p0's workshop
  Then the Vase in p0's workshop has a Potter on it
  When p0 shelves the Vase
  Then the Stake in p1's holdings is on the Vase in p0's shelf
  And the Vase in p0's shelf has no cards on it
  And p0's idle has a Potter

Example: a stake not yet posted is on no card
  Given p1's holdings has a Stake whose maker is p0
  Then the Stake in p1's holdings is on no card
```

    - **Review Focus.** `Given p0's holdings has a Stake whose maker is p1`, `And p0's workshop has a Vase`, `And the Stake in p0's holdings is on the Vase in p0's workshop` fails on the last line with `The Stake in p0's holdings is on the Vase, but cards there sit only on other players' cards.`
  - **The layout** (`fit-layout.test.ts`, guard: passes before and after; it type-checks only after this task). `fittedLayout` of `BOARD` with `idle` marked `onCards: 'some', across: true` keeps `idle-p1` a board row, as 4-1's guard pins for `'some'`: `layout: 'row'`, bounds height 776.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/setup-phrases.test.ts src/engine/core/lang/attach.test.ts src/engine/core/lang/library/attach-phrases.test.ts src/engine/core/lang/fit-layout.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`. Every Startup example passes unchanged: no zone of it is marked `across` yet, so `cardsOn` reads as before.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/library/setup-phrases.ts src/engine/core/lang/zones.ts src/engine/core/lang/attach.ts \
  src/engine/core/lang/library/attach-phrases.ts src/engine/core/lang/testing.ts src/engine/core/lang/library/setup-phrases.test.ts \
  src/engine/core/lang/attach.test.ts src/engine/core/lang/library/attach-phrases.test.ts src/engine/core/lang/fit-layout.test.ts
git commit -F - <<'EOF'
feat(lang): a zone whose cards sit on other players' cards, held to the seat they were put on, and the cards on a card read as its own player's

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 6: The other players' cards on a card: read, counted and sent back

Before starting: re-check Task 5's `othersOn`, `CARDGROUP`/`GROUP_TESTS`/`ON_IT`/`resolveCardGroup`/`misnamedCardGroup`, `cardsIn`, `readsItsCard`, `cardOnlyNames`, `cardsOnCardsArePublic`, 5-1's `FROM_CARDS_COUNT`, 4-1's `GOES_UP_BY_TOTAL`, and `FLAGGED_VALUES[0]`.

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`CardGroup` gains `{ kind: 'others on it'; whose?: CardFilter[] }`).
- Modify: `src/engine/core/lang/refs.ts` (`OTHERS_ON_IT`; the group's source, resolve and loose forms), `library/support.ts` (`cardsIn`), `compile-util.ts` (`readsItsCard`), `worked-view.ts` (`cardOnlyNames`).
- Modify: `src/engine/core/lang/library/attach-phrases.ts` (one effect).
- Modify: `src/engine/core/lang/testing.ts` (`RIVAL_GAME`).
- Test: `refs.test.ts`, `library/card-value-phrases.test.ts`, `library/attach-phrases.test.ts`, `worked-view.test.ts`, `compile.test.ts` (appended).

**Interfaces:**
- Consumes: Task 5's `othersOn` and `POST_GAME`; `relocate`, `zoneIdFor`, `zoneInfo`.
- Produces (for Task 10 and plan 7-2):

```ts
// refs.ts — the group “the other players' cards on it”, with the tests of GROUP_TESTS after it
const OTHERS_ON_IT = new RegExp(`^the other players['‘’] cards on it${GROUP_TESTS}$`, 'i');   // → { kind: 'others on it', whose? }
// support.ts — cardsIn: 'others on it' reads othersOn(env.state, cardOf(env)); compile-util.ts — readsItsCard: it needs a card, as 'on it' does
// worked-view.ts — cardOnlyNames: a group 'others on it' counts as 'on it' does, and only where cardsOnCardsArePublic
// attach-phrases.ts — effect, needsCard: each such card, in the order othersOn gives, to that zone of the seat whose zone it is in
"the other players' cards on it go to their owners' {perzone}"
```

- No new value phrase: `A card's crew wage goes up by the total lift of the other players' cards on it.` is 4-1's `GOES_UP_BY_TOTAL`, and `A card's help is the number of the other players' cards on it.` is 5-1's `FROM_CARDS_COUNT`. The phrase-set test and `CARDS_ON_IT` are unchanged.
- **`testing.ts`:**

```ts
/**
 * POST_GAME where a posted stake may be lit, lifting the crew wage of the job it is on by 1, and any stake makes the job helped (worth 9).
 * Finishing a job sends the other players' stakes on it back to their holdings, on no card.
 */
export const RIVAL_GAME = [
  POST_GAME
    .replace('  Cards can name a maker.', '  Cards can name a maker.\n  Cards can be lit.')
    .replace('      Move it to the scrap.', "      The other players' cards on it go to their owners' holdings.\n      Move it to the scrap."),
  '', 'Lift:', "  A lit card's lift is 1.", '',
  'Crew wage:', "  A card's crew wage is the total wage of the cards on it.",
  "  A card's crew wage goes up by the total lift of the other players' cards on it.", '',
  'Help:', "  A card's help is the number of the other players' cards on it.", '',
  'Helped:', '  Only if its help is more than 0.', '',
  'Worth:', "  A helped card's worth is 9.", '',
  'Reach:', "  A player's reach is the total crew wage of the cards in their workshop.",
].join('\n');
```

  Each `.replace` must find its text (assert it in the test). `      Move it to the scrap.` must be the finish button's line.
- [ ] **Step 1: Write the failing tests.**
  - **The group** (`refs.test.ts`).
    - `the other players' cards on it` gives `{ kind: 'others on it' }`.
    - `the other players' cards on it that are lit` gives `{ kind: 'others on it', whose: [{ flag: 'lit', wanted: true }] }`.
    - `the other players' cards on it that are lt` gives `There is no card fact called “lt”.`
  - **Values** (`library/card-value-phrases.test.ts`, `describe("the other players' cards on it")`). A 3-player `RIVAL_GAME` runtime. `workshop-p0` holds a Vase with a Potter (wage 1) on it in `crew-p0`; `holdings-p1` holds a Stake whose maker is p0, put on the Vase.
    - The Vase's `crew wage` is 1, its `help` 1 and its `worth` 9.
    - With the Stake `lit: true`: `crew wage` 2, and p0's `reach` 2.
    - With a second lit Stake of p1's on it: `crew wage` 3 and `help` 2.
    - With no Stake on it: `help` 0 and `worth` 3.
    - (guard) `Size:` / `  A card's size is the number of the cards on it.` gives the Vase 1: the Stake is not among "the cards on it".
  - **Sent back** (`library/attach-phrases.test.ts`, an engine on p0's turn with the table above, the Stake lit).
    - p0 finishes the Vase:
      - the Potter is tired, in `idle-p0`;
      - the Stake is in `holdings-p1`, still lit, with neither `lang:on` nor `lang:on-seat`;
      - the Vase is in the scrap;
      - p0 has 2 moves.
    - (guard) The Stake is not tired: `Every card on it is tired.` reads only p0's cards.
    - **Review Focus.** A second Stake whose maker is p0, in `holdings-p2` and on the Vase, goes back to `holdings-p2` on the same finish.
  - **Compiled** (`compile.test.ts`).
    - `RIVAL_GAME` compiles with `[]`.
    - `      The other players' cards on it go to their owners' holdngs.` gives one error on its line whose message contains `“holdngs”`.
    - The same line with `holdings` under `A player may stop.`'s `Then:` gives `“The other players' cards on it go to their owners' holdings” only makes sense in a rule about a card, such as “When a card …”.`
  - **The view** (`worked-view.test.ts`, appended, `describe("the other players' cards on it")`).
    - `shownFlags(compiled(RIVAL_GAME))` is `['helped']`: the group reads only cards everyone sees.
    - With `Help:`'s line reading `the cards in the hall` instead, it is `[]`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/refs.test.ts src/engine/core/lang/library/card-value-phrases.test.ts src/engine/core/lang/library/attach-phrases.test.ts src/engine/core/lang/compile.test.ts src/engine/core/lang/worked-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `CardGroup`.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/refs.ts src/engine/core/lang/library/support.ts src/engine/core/lang/compile-util.ts \
  src/engine/core/lang/worked-view.ts src/engine/core/lang/library/attach-phrases.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/refs.test.ts src/engine/core/lang/library/card-value-phrases.test.ts src/engine/core/lang/library/attach-phrases.test.ts \
  src/engine/core/lang/compile.test.ts src/engine/core/lang/worked-view.test.ts
git commit -F - <<'EOF'
feat(lang): the other players' cards on a card, read in totals, counts and tests, and sent back to their owners' zone

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 7: Answering an action: the line and its refusals

Before starting: re-check `compileEveryPhase`, `ONLY_WHEN_RULES`, `endSteps`, the round-steps checks and any walk 6-1 shares between them, `STEPS_NEVER_PASS`, `warnUnreachable(…, reached)`, `linesDoing`, `effectsOf`, `PhraseOpts`/`RegisteredOpts`, `LineCtx`, `unmetNeed`, `theyForm`, `InterruptedTurn`, and Task 1's `PlayerWho`.

**Files:**
- Create: `src/engine/core/lang/action-window.ts`.
- Modify: `src/engine/core/lang/types.ts` (`EveryPhase.window?`; `PlayerWho` gains `'acting'`), `phrases.ts` (`PhraseOpts.needsActing`), `compile-util.ts` (`LineCtx.acting`; `unmetNeed`).
- Modify: `src/engine/core/lang/compile.ts` (reads the line; the checks; the phase's lines read with `acting`), `refs.ts` (`… is the player acting`), `library/support.ts` (`passes` for `acting`), `library/turn-phrases.ts` (the stopping effect).
- Modify: `src/engine/core/lang/testing.ts` (`OBJECT_GAME`).
- Test: `src/engine/core/lang/action-window.test.ts` (new; this task's `describe('the line and its refusals')`).

**Interfaces:**
- Consumes: Tasks 1–3; `matchLine`, `parseParam`, `theyForm`, `InterruptedTurn`, `STEPS_NEVER_PASS`, `GO_TO_PHRASE`, `STEP_PASSES_PHRASE`.
- Produces (for Tasks 8–10 and plan 7-2):

```ts
// action-window.ts
/** group 1 = the clause a player is asked by, said of one player; group 2 = the phase they answer in */
export const WINDOW_LINE =
  /^before an action goes ahead, each player who (.+) has the (.+), in turn from the left of the player acting$/i;
/** Absent while no action waits; while one does, a Waiting. Never sent to a seat: views carry the scene, the turn and the extras. */
export const WINDOW_KEY = 'lang:window';
/**
 * A press of a button with a cost, judged and paid for, that waits while the players asked answer it: who pressed it (`by`), the phase
 * it was pressed in (`from`), its move type, what it is about (choices included), the card move and the moving of cards it makes, the
 * seats asked in turn from the left of `by` and the index of the one answering, the turn as it stood, and, once answered, the verdict.
 */
export type Waiting = {
  phase: string; by: PlayerId; from: string; move: string; subject: Subject; info?: MoveInfo;
  relocation?: { ids: string[]; to: string }; asked: PlayerId[]; at: number; back: InterruptedTurn; verdict?: 'ahead' | 'stopped';
};
export function waitingOf(state: GameState): Waiting | null;
export const NO_ACTION_WAITING = 'No action is waiting for the players to answer it.';
/** The player whose action waits; RuleError NO_ACTION_WAITING when none does. */
export function actingPlayer(state: GameState): PlayerId;
// types.ts — EveryPhase gains: window?: { phase: string; who: PhraseRef; line: number };  the clause is a condition about “they”
//            PlayerWho = 'them' | 'target owner' | 'acting'           (refs.ts reads “{cardplayer} is the player acting”)
// phrases.ts — PhraseOpts gains needsActing?: boolean;  compile-util.ts — LineCtx gains acting?: boolean
// turn-phrases.ts — effect, needsActing: sets the waiting action's verdict to 'stopped'; RuleError NO_ACTION_WAITING when none waits
export const STOP_PHRASE = 'the action does not go ahead';
```

- **Reading the line** (`compileEveryPhase`).
  - A line under `In every phase:` matching `WINDOW_LINE` gives `everyPhase.window`.
  - Its clause is read as `they <theyForm(clause)>`, kind `condition`, with `{ ...ctx, player: true, acting: true }`.
  - Its phase is read with `parseParam('phase', …)`, else `There is no phase called “…”.` with suggestions, and no `window`.
  - A second such line gets `WINDOW_TWICE`.
  - `compile` reads the lines of the named phase with `{ ...ctx, acting: true }`.
- **Needs.**
  - `unmetNeed` gives `ACTING_ELSEWHERE(clean)` for a phrase with `needsActing`, or a test of `the player acting`, where `ctx.acting` is not set.
  - `passes` reads `acting` as `actingPlayer(env.state)`.
- **The checks** (`compile.ts`, after the phases are read; each on the line named):

```ts
const WINDOW_TWICE = 'There is already a line saying who may answer an action before it goes ahead.';
const WINDOW_AT_ONCE = (phase: string) => `The players answer an action in turn, so “${phase}” can't be a phase where everyone acts at once.`;
const WINDOW_GO_TO = (phase: string) => `The players answer an action in the ${phase} in turn, so it can't go to another phase: pass it on with `
  + `“The ${phase} passes to the left.”, or stop the action with “The action does not go ahead.”`;
const WINDOW_AFTER = (phase: string) => `The players answer an action in the ${phase} in turn, so it can't have an After line: pass it on with `
  + `“The ${phase} passes to the left.”`;
const WINDOW_COST = (phase: string) => `The players answer an action in the ${phase}, so a button there can't cost anything: an answer is no action.`;
const WINDOW_FIRST = (phase: string) => `The ${phase} is only for answering an action, so it can't be the game's first phase.`;
const WINDOW_IS_STEPS = (phase: string) => `The ${phase} is where players answer an action, so it can't also be where they take steps in turn.`;
const AFTER_NAMES_ACTION = 'Players may answer an action that costs something before it goes ahead, so an After line can\'t name one: '
  + 'write “The turn passes to the left.” in its Then: lines instead.';
const WINDOW_READS_HIDDEN = (zone: string) =>
  `Every player sees who is asked to answer an action, so whether a player is asked can't depend on ${zone}, which not everyone can see.`;
const ACTING_ELSEWHERE = (clean: string) =>
  `“${clean}” only makes sense while an action waits for the players to answer it: in the phase where they answer it, or in the line that says who does.`;
```

  - On the window line:
    - `WINDOW_AT_ONCE`, and no `window`;
    - `WINDOW_FIRST` when the phase is `game.phases[0]`;
    - `WINDOW_IS_STEPS` when it is the End's steps phase or 6-1's round-steps phase;
    - `STEPS_NEVER_PASS(phase)` as an **error** when no line of the game passes it on;
    - `WINDOW_READS_HIDDEN(describeZone(ref))` for the first zone not everyone sees that the clause reads.
  - In the phase:
    - its go-to line, and any `go to` among its lines (`linesDoing`), get `WINDOW_GO_TO`;
    - its After line gets `WINDOW_AFTER`;
    - a cost line of one of its buttons gets `WINDOW_COST`.
  - In any phase, once a window exists, an After line naming a button with a cost gets `AFTER_NAMES_ACTION`.
  - The phase joins `warnUnreachable`'s `reached`.
- **What the clause reads**, walked once with a set of names seen:
  - every zone named by its arguments: a `{zone}`, `{zones}` or `{perzone}`, the zones of a `{cardgroup}`;
  - the lines of every player value and worked value it reads, all the way down.

  A zone whose `visibility` is not `'public'` is the one reported.
- **`testing.ts`:**

```ts
/**
 * MAKER_GAME where, before an action goes ahead, each player holding a stake of the player acting is asked in turn from their left: they
 * may object with that stake, which goes back to its maker's purse and stops the action, or let it go. Buttons with and without a cost,
 * with a choice, with a card from the stash, and one that starts an answer phase, are there to answer.
 */
export const OBJECT_GAME = MAKER_GAME
  .replace('  A player may stop.', [
    '  A player may sell a card in their holdings.', '    It costs 1 move.', '    Then:', '      Move it to the scrap.',
    '  A player may tidy a card in their workshop.', '    It costs 1 move.', '    Then:', '      They choose one:', '        Tire:',
    '          It is tired.', '        Pay:', '          They get 1 coin.',
    '  A player may swap a card from their stash to their workshop.', '    It costs 1 move.',
    "  A player may call a card in another player's holdings.", '    It costs 1 move.', '    Then:', '      The answer phase starts with its owner.',
    '  A player may stop.'].join('\n'))
  .replace('Phase: working', ['In every phase:',
    '  Before an action goes ahead, each player who has a card in their holdings whose maker is the player acting has the objection, in turn from the left of the player acting.',
    '', 'Phase: working'].join('\n'))
  .replace('End:', ['Phase: objection', '  Players take turns.',
    '  A player may object with a card in their holdings.', '    Only if it is a card whose maker is the player acting.', '    Then:',
    "      Move it to its maker's purse.", '      The action does not go ahead.',
    '  A player may let it go.', '    Then:', '      The objection passes to the left.', '',
    'Phase: answer', '  Players take turns.', '  A player may refuse.', '    Then:', '      Go back to the interrupted turn.', '', 'End:'].join('\n'));
```

  Each `.replace` must find its text (assert it in the test).
- [ ] **Step 1: Write the failing tests** in `action-window.test.ts`, `describe('the line and its refusals')`. `errorsOf` is as in `end-steps.test.ts`; copy it.
  - **Compiled.**
    - `OBJECT_GAME` compiles with `[]`, with no "Nothing leads to …" warning.
    - `game.everyPhase.window` has `phase: 'objection'` and `line: lineOf(OBJECT_GAME, <the window line>)`, and its `who.phrase` is `they have a card in {zones} whose {cardfilter}`.
    - The `who`'s filter is `{ names: 'maker', player: 'acting' }`.
    - (guard) `compiled(CREW_GAME).everyPhase` has no `window` key, and `flowDefFor(CREW_GAME, SEATS)` equals what it was at BASE.
  - **Refused when the rules are read.**
    - The window line twice gives `WINDOW_TWICE` on the second.
    - `… has the objectoin, …` gives `There is no phase called “objectoin”.`
    - `Phase: objection\n  Everyone acts at once.` for `…\n  Players take turns.` gives `WINDOW_AT_ONCE('objection')` on the window line.
    - `  When they have at least 5 coins, go to working.` added under `Phase: objection` gives `WINDOW_GO_TO('objection')` on its line.
    - `  After a player lets it go, the turn passes to the left.` added to objection gives `WINDOW_AFTER('objection')` on its line.
    - Both `      The objection passes to the left.` lines replaced by `      They get 1 coin.` give, as an error on the window line, `No line passes the objection on to the next player, so the first player's objection would never end. Write “The objection passes to the left.” where a player's objection ends.`
    - `    It costs 1 move.` added under `  A player may let it go.` gives `WINDOW_COST('objection')` on that line.
    - The objection phase moved above `Phase: working` gives `WINDOW_FIRST('objection')`.
    - `  After a player hires, the turn passes to the left.` added to working gives `AFTER_NAMES_ACTION` on its line. Write it in the After form the compiler reads for the hire; adjust the wording, not the check, if needed.
    - `  Before the score, each player has the objection, in turn from the start player.` added to End gives `WINDOW_IS_STEPS('objection')` on the window line.
    - **Review Focus:**
      - the clause `has a card in their stash whose name is Vase` gives `WINDOW_READS_HIDDEN('their stash')` on the window line;
      - the clause `has a card in their holdings that is dusty`, with `Dusty:` / `  Only if it is a Stake card.` / `  Only if the pile is not empty.`, gives `WINDOW_READS_HIDDEN('the pile')`.
    - `    Only if it is a card whose maker is the player acting.` under working's `A player may start a card in their stash.` gives `ACTING_ELSEWHERE("it is a card whose maker is the player acting")`.
    - `      The action does not go ahead.` under working's `A player may stop.`'s `Then:` gives `ACTING_ELSEWHERE('The action does not go ahead')`.
  - **The phrases on a hand-made window.** A 3-player `OBJECT_GAME` state whose `lang:window` is a `Waiting` with `by: 'p0'`, `phase: 'objection'`, `asked: ['p1']`, `at: 0`.
    - `actingPlayer(state)` is `'p0'`.
    - About p1, with a Stake whose maker is p0 in `holdings-p1`, `they have a card in their holdings whose maker is the player acting` holds; about p2 it does not.
    - `the action does not go ahead` sets the verdict to `'stopped'`.
    - On a state with no `lang:window`, it throws `No action is waiting for the players to answer it.`, and so does `actingPlayer`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/action-window.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `PlayerWho` and `PhraseOpts`.
- [ ] **Step 4: Run** it with `src/engine/core/lang/end-steps.test.ts` and the round-steps tests, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/action-window.ts src/engine/core/lang/types.ts src/engine/core/lang/phrases.ts src/engine/core/lang/compile-util.ts \
  src/engine/core/lang/compile.ts src/engine/core/lang/refs.ts src/engine/core/lang/library/support.ts src/engine/core/lang/library/turn-phrases.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/action-window.test.ts
git commit -F - <<'EOF'
feat(lang): a line that lets players answer an action before it goes ahead, refused wherever answering could never end or could tell what is hidden

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 8: Answering an action: the window played

Before starting: re-check Task 7's names; `declaredActionHandler.apply`, `recordAction`, `payCost`, `hasCost`; `turnWaiting`, `endStepsDue`, `roundFinished`, `clearTurnMarkers`; `stepPassesLeft`, `nextStep`, `turnPassesLeft` and 6-1's round-steps branch in each; `END_STEPS_RULE`, `TURN_START_RULE` and the trigger list in `flowDefFor`; `chooseNext`, `setPhase`, `TURN_KEY`, `TURN_ROLLS_KEY`.

**Files:**
- Modify: `src/engine/core/lang/declared-actions.ts` (`apply` opens the window; the `hasCost` comment reworded without "veto").
- Modify: `src/engine/core/lang/runtime.ts` (`askedFor`, `openWindow`, `windowAnswered`, `closeWindow`; `turnWaiting`, `endStepsDue`).
- Modify: `src/engine/core/lang/build.ts` (`WINDOW_RULE`, first of the triggers when the game has a window), `turns.ts` (`roundFinished`, `clearTurnMarkers`), `library/turn-phrases.ts` (the pass; the turn's pass refused).
- Test: `src/engine/core/lang/action-window.test.ts` (append `describe('the window played')`).

**Interfaces:**
- Consumes: Task 7's `Waiting`, `WINDOW_KEY`, `waitingOf`, `actingPlayer`, `OBJECT_GAME`; `nextIn`, `playersIn`, `isOut`, `chooseNext`, `setPhase`, `relocate`, `checkAttachments`.
- Produces (for Task 9 and plan 7-2):

```ts
// runtime.ts
/**
 * The seats still in, other than `by`, from `by`'s left round to `by`'s right, for whom the window's clause holds. It is judged on `state`
 * with a Waiting naming `by` under WINDOW_KEY, so that “the player acting” reads `by`.
 */
askedFor(state: GameState, by: PlayerId): PlayerId[];
/**
 * Writes the Waiting with `at` 0 and `back` the turn as it stands (its phase, seat, and what was done and rolled), then goes to the window
 * phase with asked[0] current, and runs that phase's start lines about them, the table checked after each.
 */
openWindow(state: GameState, waiting: Omit<Waiting, 'phase' | 'at' | 'back'>): GameState;
windowAnswered(state: GameState): boolean;       // a verdict is set
/**
 * Puts the turn back as `back` holds it and drops WINDOW_KEY. On 'ahead' it then moves the relocation's cards and runs the button's Then:
 * lines about the stored subject with the stored card move, as the press would have, the table checked on the button's line.
 */
closeWindow(state: GameState): GameState;
// build.ts
const WINDOW_RULE = 'an action is answered';   // when: 'lang:window-answered', then: 'lang:window-close'; ahead of every other trigger
// turn-phrases.ts
const WINDOW_PASS_OUTSIDE = (phase: string) => `The ${phase} passes to the left only while an action waits for the players to answer it.`;
const TURN_IN_THE_WINDOW = (phase: string) =>
  `The turn does not pass while the players answer an action in the ${phase}: write “The ${phase} passes to the left.” instead.`;
```

- **`apply`.**
  - It records the press (unless any player may press it) and spends its cost, as today.
  - Then, when the game has a window and the button has a cost, it calls `askedFor`. A non-empty list returns `openWindow` with the press's `by`, `from`, `move`, `subject`, `info` and `relocation`: no card moves and no Then: line runs.
  - Otherwise it goes on as today.
- **The pass** (`stepPassesLeft`). While a `Waiting` with no verdict is in `state.data`, and the line's phase is its phase and the game's:
  - the next asked seat (`at + 1`) becomes current, and the phase's start lines run about them;
  - after the last, the verdict becomes `'ahead'`.

  Outside, the refusal is `WINDOW_PASS_OUTSIDE(phase)` when the phase is `everyPhase.window?.phase`, else as built.
- **The turn's pass.** `turnPassesLeft` throws `TURN_IN_THE_WINDOW(phase)` while a `Waiting` is in `state.data`.
- **The flow.**
  - `windowAnswered` is the predicate of `WINDOW_RULE`, and `closeWindow` its effect.
  - While a `Waiting` is in `state.data`: `turnWaiting` and `endStepsDue` are false, and `roundFinished` is false.
  - `clearTurnMarkers` drops `lang:window`.
- [ ] **Step 1: Write the failing tests** in `action-window.test.ts`, `describe('the window played')`.
  - **Setup.** Copy `end-steps.test.ts`'s helpers, with `table(game = OBJECT_GAME, prepare)`: a 3-player engine from `initialState(game, 1)`, turn `{ current: 'p0', phase: 'working' }`, with p0's turn started. `stake` arranges stakes. `workshop-p0` holds a Vase, and the hall its usual hands; `hire(engine, by)` hires the first Potter of the hall to that Vase.
  - **A stopped action.** `holdings-p1` holds a Stake whose maker is p0.
    - After `hire(engine, 'p0')`:
      - the phase is objection, the current seat p1, and p0 has 2 moves;
      - the Potter is still in the hall;
      - `waitingOf(state)` has `by: 'p0'`, `from: 'working'`, `asked: ['p1']`, `at: 0`, and `back` with `phase: 'working'` and `current: 'p0'`.
    - p0's `stop` is refused with `not p0's turn`.
    - p1 objects with the Stake:
      - the Stake is in `purse-p0` on no card;
      - the phase is working and the current seat p0, and p0 has 2 moves;
      - the Potter is in the hall, `lang:window` is absent and `TURN_OF_KEY` is `'p0'`;
      - `didThisTurn(state, 'p0', <the hire's move type>)` is true.
  - **An action that goes ahead.** `holdings-p1` and `holdings-p2` each hold a Stake whose maker is p0.
    - After the hire, `asked` is `['p1', 'p2']`.
    - p1 lets it go: the current seat is p2, and `at` is 1.
    - p2 lets it go: the Potter is in `crew-p0` on the Vase, the phase is working, the current seat p0, and p0 has 2 moves.
    - From p1's turn, with stakes whose maker is p1 in `holdings-p2` and `holdings-p0`, `asked` is `['p2', 'p0']`.
  - **No window.**
    - With no stake held, the hire puts the Potter on the Vase at once, and `lang:window` never appears.
    - With p1 holding p0's stake, p0's `start` (no cost) moves the card from the stash at once.
  - **The maker answers a trade of their own stake (R2's shape).** `holdings-p0` holds a Stake whose maker is p1; `holdings-p1` holds one whose maker is p0. On p1's turn:
    - p1 sells the Stake whose maker is p0: `asked` is `['p0']`;
    - p0 objects with the Stake whose maker is p1: it is in `purse-p1`;
    - `holdings-p1` still holds the Stake whose maker is p0, the scrap is as before, and p1 has 2 moves.
  - **Review Focus.**
    - **A seat that is out.** With p2 marked out holding p0's stake and p1 holding one too, `asked` is `['p1']`.
    - **The last move.** p0 has 1 move. After the hire (0 moves), p1 lets it go: the Potter is on the Vase, then working's `When they have less than 1 move:` rule passes the turn, so the current seat is p1 with `TURN_OF_KEY` `'p1'`. With p1 objecting instead, the turn passes to p1 the same way.
    - **Choices.**
      - p0 tidies the Vase with choices `['Tire']`, p1 lets it go, and the Vase is tired.
      - With `['Pay']`, p0 has 10 coins after p1 lets it go.
    - **An action that starts another phase.** With p0's stakes in `holdings-p1` and `holdings-p2`:
      - p0 calls the Stake in `holdings-p1`, and p1 and p2 let it go;
      - the phase is answer, the current seat p1, and `interruptedTurn(state)` has `{ phase: 'working', current: 'p0' }`;
      - p1 refuses, and the phase is working with p0 current.
    - **Undo and replay.** After the hire and p1's pass (stakes in `holdings-p1` and `holdings-p2`):
      - a fresh `table(OBJECT_GAME, prepare)` given `loadLog(engine.getLog())` equals the engine's state;
      - `engine.undo()` gives the window with p1 current and `at` 0.
    - **The round.** `roundFinished` is false for a state with `lang:window` set, current p2, `ROUND_KEY` 1 and `TURN_OF_KEY` `'p0'`.
  - **Refused while playing.**
    - A rule `  When they have at least 1 coin:` / `    The turn passes to the left.` added under `Phase: objection` makes the hire throw `TURN_IN_THE_WINDOW('objection')`, and the engine keeps its state.
    - On a state in the objection phase with no `lang:window`, `runPhrase` of `the objection passes to the left` throws `The objection passes to the left only while an action waits for the players to answer it.`
  - **An example.** `OBJECT_GAME` with this appended passes `runExamples`:

```text
Example: holding a player's stake lets you stop their action, which spends its move and nothing else
  Given 3 players
  And p1's holdings has a Stake whose maker is p0
  And p0's workshop has a Vase
  When p0 hires a Potter to the Vase
  Then the phase is objection
  And it is p1's turn
  When p1 objects with the Stake whose maker is p0
  Then the phase is working
  And it is p0's turn
  And p0 has 2 moves
  And p0's crew is empty
  And p0's purse has a Stake whose maker is p0
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/action-window.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** it with `src/engine/core/lang/end-steps.test.ts`, the round-steps tests and `src/engine/core/lang/runtime.test.ts`, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. Rent Day keeps its 108 examples.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/declared-actions.ts src/engine/core/lang/runtime.ts src/engine/core/lang/build.ts src/engine/core/lang/turns.ts \
  src/engine/core/lang/library/turn-phrases.ts src/engine/core/lang/action-window.test.ts
git commit -F - <<'EOF'
feat(lang): an action with a cost waits while the players asked answer it in turn, then goes ahead as pressed or does nothing but spend its cost

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 9: What each seat sees of a waiting action

Before starting: re-check `seatExtras`, `SeatExtras`, `readSeatExtras` and its `is…` helpers, `pickedAs`, `seesFace`, and whatever plans 4-3 to 6-3 added to `board-view.ts`.

**Files:**
- Modify: `src/engine/core/lang/board-view.ts` (`WaitingView`, `SeatExtras.waiting`, `waitingView`, `readSeatExtras`).
- Test: `src/engine/core/lang/board-view.test.ts` (appended).

**Interfaces:**
- Consumes: Task 8's engine behaviour; `waitingOf`, `pickedAs`.
- Produces (for plan 7-3):

```ts
/**
 * An action that waits for the players to answer it, the same for every seat but for the cards: who pressed it, the button's label, the
 * choices it carries, and the card it picked (or the picked cards, in the press's order) then the card they go to, each by its name where the
 * seat sees its face and as “a face-down card” elsewhere. No card's id is in it: one that locates a hidden card would give it away.
 */
export type WaitingView = { by: PlayerId; label: string; cards: string[]; choices: string[] };
// SeatExtras gains: waiting?: WaitingView;   left out while no action waits
```

- `choices` are the press's non-null choices in order.
- `readSeatExtras` accepts `waiting` when it is absent or has that shape, and returns null otherwise.
- [ ] **Step 1: Write the failing tests** (`board-view.test.ts`, `describe('a waiting action')`). A 3-player `OBJECT_GAME` engine set up as in Task 8, with p1 and p2 each holding a Stake whose maker is p0.
  - After the hire, p1's `seatExtras(...).waiting` is `{ by: 'p0', label: hire.label, cards: ['Potter', 'Vase'], choices: [] }`, where `hire` is the compiled button. p2's and p0's are the same.
  - **Review Focus.** `stash-p0` holds a Statue, and p0 swaps it.
    - p1's `waiting.cards` is `['a face-down card']`, and p0's is `['Statue']`.
    - `JSON.stringify(p1Extras.waiting)` does not contain the Statue's id.
  - After a tidy with choices `['Pay']`: `waiting.choices` is `['Pay']` and `waiting.cards` is `['Vase']`.
  - p1's actions while the window is open:
    - `object with a card in their holdings` is allowed, with p1's Stake among its cards;
    - `let it go` is allowed;
    - every one of p0's actions has an `allowed` other than `true`.
  - (guard) With no stake held, and in `CREW_GAME`, `seatExtras` has no `waiting` key.
  - `readSeatExtras` returns the view unchanged with a `waiting`, and null for one whose `waiting` is `{ by: 'p0', label: 'Hire', cards: [1], choices: [] }`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/board-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** it, then `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`. The designer page tests pass unchanged: they ignore a key they do not read.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/board-view.ts src/engine/core/lang/board-view.test.ts
git commit -F - <<'EOF'
feat(lang): each seat sees who pressed a waiting action, its label, its choices and its cards as that seat sees them, with no card's id

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 10: An example for each piece, the README, and the checks

Before starting: re-check 6-1's README paragraph ("Other players' cards, lines a flag turns on, the lower of two prices, and steps at the start of a round.") and the score phrase `each {cardclass} in a player's {perzone} scores {int} point(s)`.

**Files:**
- Modify: `src/engine/core/lang/testing.ts` (`HELD_GAME`).
- Test: `src/engine/core/lang/examples.test.ts` (append).
- Modify: `README.md` (a paragraph after 6-1's).

**Interfaces:**
- Consumes: every fixture above; `runExamples`.
- Produces: no phrase.
- **`testing.ts`:**

```ts
/** RATE_GAME where each stake in a player's holdings scores 5, and their own stakes, kept in their purse, score nothing. */
export const HELD_GAME = RATE_GAME.replace('  The highest score wins.', "  Each Stake in a player's holdings scores 5 points.\n  The highest score wins.");
```

  The `.replace` must find its text (assert it in the test).

- [ ] **Step 1: Write the tests.** In `examples.test.ts`, `describe("the words for slice 7's pieces")`, each fixture with its examples appended passes `runExamples`. Tasks 1, 2, 5 and 8 hold the examples of naming, picking, posting and answering.
  - **`RATE_GAME`.** Buying at a rate, the last stake kept, and a stake asked back:

```text
Example: a stake costs its maker's rate, paid to its owner, and the last one in a purse can't be bought
  Given 3 players
  And p1's purse has a Stake whose maker is p1 and a Stake whose maker is p1
  And p1's workshop has a Statue
  When p0 buys the Stake whose maker is p1
  Then p0 has 7 coins
  And p1 has 11 coins
  When p0 buys the Stake whose maker is p1
  Then it is rejected because "its owner has at least 2 cards in their purse"

Example: a stake asked back is sold back at its maker's rate, with its owner's consent
  Given 3 players
  And p0's holdings has a Stake whose maker is p1
  And p1's workshop has a Statue
  And it is p1's turn
  When p1 asks back the Stake whose maker is p1
  Then the phase is answer
  And it is p0's turn
  When p0 sells back the Stake whose maker is p1
  Then p0 has 11 coins
  And p1 has 7 coins
  And p1's purse has a Stake whose maker is p1
  And the phase is working
  And it is p1's turn
```

  - **`LOOKUP_GAME`:**

```text
Example: a rate and a yield are read off their steps
  Given p0's workshop has a Vase and a Statue
  Then p0's rate is 15
  And p0's yield is 2
  And p0's top worth is 4
```

  - **`RIVAL_GAME`:**

```text
Example: a lit stake on another player's job lifts its crew wage, and goes back to its holdings when the job is finished
  Given p1's holdings has a Stake whose maker is p0
  And p0's workshop has a Vase
  And the Vase in p0's workshop has a Potter on it
  And the Stake in p1's holdings is on the Vase in p0's workshop
  And the Stake in p1's holdings is lit
  Then the Vase in p0's workshop has 2 crew wage
  And p0's reach is 2
  When p0 finishes the Vase
  Then the Stake in p1's holdings is on no card
  And p1's holdings has a Stake whose maker is p0
```

  - **`HELD_GAME`.** Score by zone; ruling #16's shape:

```text
Example: each stake held scores 5, and a player's own stakes score nothing
  Given p1's holdings has a Stake whose maker is p0 and a Stake whose maker is p2
  And p0's purse has a Stake whose maker is p0
  Then p1 scores 10
  And p0 scores 0
```

  - **`OBJECT_GAME`.** The maker answers a trade of their own stake (R2's shape), and a button with no cost asks no one:

```text
Example: holding the seller's stake, a stake's maker may stop its sale
  Given 3 players
  And p0's holdings has a Stake whose maker is p1
  And p1's holdings has a Stake whose maker is p0
  And it is p1's turn
  When p1 sells the Stake whose maker is p0
  Then it is p0's turn
  When p0 objects with the Stake whose maker is p1
  Then p1's purse has a Stake whose maker is p1
  And p1's holdings has a Stake whose maker is p0
  And it is p1's turn

Example: a button with no cost goes ahead at once
  Given 3 players
  And p1's holdings has a Stake whose maker is p0
  And p0's stash has a Vase
  When p0 starts the Vase
  Then p0's workshop has a Vase
  And the phase is working
```

  - **A failing example.** `HELD_GAME` with `Then p0 scores 5` fails, and the failure names that line.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/examples.test.ts`. Expected: PASS, since there is no new phrase. If one fails, stop and report which line: that is a missing piece, to be planned, not worked round.
- [ ] **Step 3: Write the README paragraph** after 6-1's: **"Cards that name a player, cards on other players' cards, lookups, and answering an action before it goes ahead."** It is written in fixture words, and plan 7-2 may swap in Startup's lines. One bullet each:
  - **Cards that name a player.**
    - `Cards can name a maker.` declares the fact. `2 new Stake cards go to each purse, each naming its owner as its maker.` makes them, p0's first.
    - Tests: `whose maker is them`, `whose maker is the target card's owner`, and in the answering phase `whose maker is the player acting`.
    - Examples write `a Stake whose maker is p0`, which takes such a card from the table or makes one.
  - **Another player's zone as a button's own.** `A player may buy a card in another player's purse.` is offered seat by seat from the left; `When p0 buys the Stake from p2's purse`.
  - **Through the player a card names.**
    - `They pay its maker's rate to its owner.`, `They get its maker's rate from its maker.`, `Its owner gets its maker's rate.` (from the bank), `Its maker gets 3 coins.` and `They pay 5 to its owner.`
    - `its owner has at least 2 cards in their purse`, `they are not the card's maker` and `Move it to its maker's purse.`
    - `another player tied to them by a card in their holdings has a card in their workshop whose name is Statue`: two players are tied when either holds a card naming the other.
    - `The answer phase starts with its owner.` and `Hand the answer phase to another player of their choice who is not the card's maker.` interrupt the turn as `The trade phase starts with them.` does.
  - **Lookups.**
    - `A player's rate is 5.`, `A player's rate is 10 if their top worth is at least 3.` (the last line that applies wins).
    - `A player's top worth is the highest worth of the cards in their workshop.` (0 when none has one).
    - `A player's reach goes up by the total wage of the cards in their crew.`
  - **Cards on other players' cards.**
    - `…, where some cards are on other players' cards` keeps a card in its owner's zone while it sits on a card of another player's, which must stay in a zone everyone sees of the player it sat on when placed. Moving it elsewhere is refused with the cards named.
    - "The cards on it" are always the card's own player's. `the other players' cards on it` reads the others, and `The other players' cards on it go to their owners' holdings.` sends them back.
    - Examples write `the Stake in p1's holdings is on the Vase in p0's workshop` and `… is on no card`.
  - **Answering an action.**
    - The line under `In every phase:`, the phase's buttons, and `The objection passes to the left.` / `The action does not go ahead.`
    - Only a button with a cost is answered. An answered action has spent its cost and done nothing else; one that goes ahead does exactly what the press would have.
    - Every seat sees who pressed it and its label, choices and cards, a card it can't see as a face-down card.
    - Lines that would leave a player unable to answer, or let the clause read what not everyone sees, are refused when the rules are read.
  - **Scoring held cards.** `Each Stake in a player's holdings scores 5 points.` A player's own stakes are kept in their purse, so they score nothing.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 5: Run the checks.** Each must print nothing, except where noted.

```bash
# Startup Simulator's words in shared code, slices 3 to 7, tests included
git diff "$BASE" -- src/engine src/pages src/utils | grep '^+[^+]' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share|tags?|leads?|leading|licen[cs]es?|tiers?|stall(s|ed|ing)?|sectors?|expertise|modes?|bandwidths?|bugs?|qa|online|offline|maint(enance)?|suppl(y|ies)|demands?|xp|pending|skills?|badges?|badged|ranks?|mentor(s|ed|ing)?|synerg(y|ies)|agile|graduat(e|es|ed|ing|ion)|training|trained|brainstorm(s|ed|ing)?|strateg(y|ies)|milestones?|seniors?|workaholics?|clean coders?|visionar(y|ies)|toxic|burnouts?|flight risks?|techcrunch|design sprints?|cease|desist|hype|utilit(y|ies)|buffs?|debuffs?|venture capital|bubbles?|patents?|trolls?|angels?|investors?|legacy|regulations?|audits?|open source|hackathons?|chip shortage|crunch|server crash|logjam|frenz(y|ies)|interns?|headhunters?|course boom|whistleblowers?|trade show|events?|equit(y|ies)|founders?|consultants?|dividends?|veto(es|ed|ing)?|partners?(hips?)?|immunit(y|ies)|portfolios?|buybacks?|stocks?)\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# existing test lines removed or changed: only the named ones
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
# nothing outside the language
git diff --stat "$BASE" -- src/games src/pages
```

  - The fourth check prints only the pinned `VOCAB_TYPES` lines of `refs.test.ts` (Task 1) and 6-1's jinx-line assertions in `compile-phase.test.ts` (Task 2).
  - Also read the `+` lines of `src/engine` for "supply", "partner" and "veto" in comments, and for "stake" used of money rather than the fixture's card.
- [ ] **Step 6: Run the games alone.**
  - `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
  - `bunx vitest run src/games/startup-simulator.test.ts` passes with BASE's example count.
- [ ] **Step 7: Commit**

```bash
git add src/engine/core/lang/testing.ts src/engine/core/lang/examples.test.ts README.md
git commit -F - <<'EOF'
feat(lang): an example for each of slice 7's pieces, held cards scored by zone; the README describes them

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Forward notes

- **Slice 8.**
  - The Headhunter and the Hit Piece read Immunity with `they have no card in their portfolio whose founder is the target card's owner` (Task 1).
  - Product sales return Consultants with Task 6's line, after breaking an Integration stack and before "with everything on it" (slice 8 R2).
  - The Vest / Cease & Desist window is a different window (the victim answers after payment). It may reuse Task 8's machinery with a clause of its own; its opening must read only public facts, as R4 requires.
- **Slice 9.**
  - A Face-Down project shows its Consultants (a public zone of the seat).
  - The waiting view names a Face-Down card only as the seat sees its face, so a Face-Down Launch's prompt names no card (slice 9 R3).
  - Fold returns Consultants with Task 6's line.
  - Secured Access is `they or a player tied to them …`: written as two lines, own Tag or a tied provider.
- **Slice 10.**
  - Bankruptcy's seizure is `For each card in their portfolio, move it to its founder's equity.` (Task 3's zone), unpaid.
  - Liquidation returns Consultants with Task 6's line.

## Left to 7-2 / 7-3

**Plan 7-2 (rules text and long runs)** writes, with this plan's pieces:
- **Equity.**
  - `Cards can name a founder.` and a stack of Equity cards.
  - `3 new Equity cards go to each equity, each naming its owner as its founder.` in Setup.
  - Zones: `their equity` (the supply, everyone sees) and `their portfolio` (`…, where some cards are on other players' cards`).
- **Prices.**
  - A tier number on products (`A Tier 2 card's tier number is 2.`).
  - `top tier` (highest of the Active products, §9.A's "Active"), `share price` (5 / 10 at 2 / 15 at 3).
  - `operational revenue` (the same total Income pays), `dividend` (1 at 1 / 2 at 11 / 3 at 21).
- **Invest.**
  - Two buttons, one that places the token: a target in `another player's development or another player's operations`, `Only if the target card's owner is its founder.`, a color choice.
  - The hard cap, Venture Capital Rain's `its founder gets 3 capital`, and the Event's flag.
- **Dividends.** In Income's start lines, after revenue: `For each card in each portfolio whose founder is them, its owner gets its founder's dividend.`
- **The Consultant.**
  - Per-color worked values on tokens.
  - The Development team outputs go up by the total of `the other players' cards on it`, before the Stalled line.
  - Ops supply and Ops QA go up through a per-product value and `a player's … goes up by the total …`.
  - Pivot's return line.
  - Round Start moves joining 6-2b's `event check` steps, whose calling line becomes unconditional or reads a flag covering both. The color flags are stripped from returned tokens by a card rule.
- **Partners.** The Greenlight guards and the License line, with `another player tied to them by a card in their portfolio …` and its negation (ruling #11).
- **The Veto.**
  - The window line under `In every phase:` and the veto phase: burn with `Move it to its founder's equity.`, then `The action does not go ahead.`, or pass.
  - The auto-player passes sometimes and vetoes sometimes, so long runs exercise both (the overview's "presses every button sometimes").
- **Losing and moving Equity.**
  - Buyback: a pick in `another player's portfolio`, then `The … phase starts with its owner.`, accept and decline.
  - Secondary Trade: `Hand the … phase to another player of their choice who is not the card's founder.` with `Only if some other player is not the card's founder.`, then the buyer's `take` and the decline.
  - Non-Compete Suit: a button picking the token, guarded on the hand, `They pay 5 to its owner.`, `Move it to their equity.`
  - Immunity's condition, recorded for slice 8.
- **Scoring.** Portfolio: `Each Equity in a player's portfolio scores 5 points.`
- **Proof.** Every example in the spec's table (R2's included), the long runs, and the invariants: each Founder's 3 tokens are accounted for, and money is conserved.

**Plan 7-3 (the page):**
- Each tableau's equity and portfolio with founders.
  - A token's face carries `founder: p0`, and `pickName` says only "Equity", so the picker and the lists must show the founder.
- Consultants on product cards and their colors. `cardsOn` no longer returns rivals' tokens, so the board text and the canvas read `othersOn` for the cards a rival keeps on the viewer's product, and the viewer's own placed tokens with the product they sit on (R1's page bullet).
- The waiting action from `SeatExtras.waiting` in the deciding player's strip, and the consent prompts. The switcher follows `turn.current` into the window and the answer phases.
- The browser check of a veto, a pass, a Buyback and a trade.

## Gaps

None that needs a protected file or contradicts a binding call. Checked:
- The window rides one new flow trigger in `build.ts` and two runtime predicates, so `flow.ts` doesn't change. `ZoneSpec`, `EveryPhase`, `SeatRef`, `CardFilter`, `CardGroup` and `ThingFact` widen in `types.ts` only, and there is no `CardState` change.
- Every item of the spec's "What the language gains" is a task here, or is written with built pieces:
  - item 5 (score lines per held card) is the built zone score, since a player's own cards never sit in the held zone;
  - item 6 needs no phrase beyond the card words and "is on".

  Both are recorded as calls.

Recorded limits, none blocking slice 7:
- **A window button that changes what the waiting action reads**, other than stopping it, can make the action throw as it goes ahead, and the last pass is then refused. The rules alone can't show that a line touches the picked cards. Slice 7's veto phase stops the action whenever it moves a token, so it can't arise there. A slice that writes another window must keep its passing buttons free of such lines.
- **A tie reads every player fact a game declares.** A game with two player facts can't tie by one only. Startup declares one.
- **A pick's own zone is one place:** "a card in another player's portfolio or another player's equity" is not read. Slice 7 keeps held cards in one zone, so it is not needed.
- **A zone where every card must sit on another player's card** is not offered (only `'some'`). Slice 7 doesn't need it.
