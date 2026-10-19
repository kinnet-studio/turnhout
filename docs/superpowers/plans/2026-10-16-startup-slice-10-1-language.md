# Startup Simulator Slice 10-1 (Language) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The rules language gains every general piece slice 10 needs that plans 4-1 to 9-3 left out:
- levels of play that nest: a phase started, or an action waiting, while others are open, each going back in turn, last first;
- asks that come twice in one button, from inside an answer, and to every player from the left of the player who holds a flag;
- what an offer may read: whether a player has a card lying face down, a tie to a flag's holder, and the card of the action being answered;
- what a player owes, kept in order and paid as far as they can, and the values and comparisons that set it aside;
- a card flag that lasts until its card moves;
- proof, in general words, that owing, selling one job at a time, offers from the seller's left and a second debt inside the first play with these pieces.

All of it is tested with fixtures in general words. Startup Simulator's text does not change.

**Architecture:**
- **This is plan 10-1.** Plan 10-2 writes the rules text and the long runs (it may split as 7-2 and 8-2 did); plan 10-3 the page. Nothing here touches `src/games/**` or `src/pages/**`.
- **Ten tasks.** The spec's "What the language gains" maps onto them like this:
  1. **Levels of play on one stack** (item 1: interrupts inside interrupts).
  2. **An action waiting above another level** (item 1: an ask inside an interrupt inside an ask; what each seat is told).
  3. **Asks: twice in one button, inside an answer, and from the left of a flag's holder** (item 1; R1's order; 8-1's two limits lifted).
  4. **What an offer may read of a player** (R1: public facts only; 9-1's forward note).
  5. **The action being answered** (item 2's per-Tag check; R1's $3 to the new owner).
  6. **What a player owes** (R2: the debt set aside, two debts, paid in order).
  7. **Values from a counter and from what is owed** (R2's spare cash; Settle's cover).
  8. **A flag that lasts until its card moves** (item 2; R3's Legacy reset).
  9. **Levels played through** (items 1–3, proved in general words).
  10. **The README and the checks** (item 3).
- **Where things live.**
  - The stack: a new `frames.ts` (`NEST_KEY`, `Frame`, `framesOf`, `withFrames`, push and pop), `WINDOW_KEY` moved there and re-exported by 7-1's `action-window.ts`; `keptTurnOf` and `withTurnBack` in `board-state.ts`, under `interruptTurn` and `resumeTurn`.
  - Readers re-pointed to the stack: `flow-phrases.ts` (`startPhase`, going back), `runtime.ts` (7-1's and 8-1's window functions, `turnWaiting`, `endStepsDue`), `turns.ts` (`roundFinished`, `clearTurnMarkers`), `turn-phrases.ts` (the pass, the verdicts), `board-view.ts` (`interrupted`, `waitingUnder`).
  - Asks: 8-1's `action-window.ts`, `compile.ts`, `compile-phase.ts`, `runtime.ts`.
  - Offer reads: `compare-phrases.ts`, `player-facts.ts`, `worked-view.ts` (`faceBlindFlag`), the walk in `compile.ts`.
  - Owing: `board-state.ts` (`BILLS_KEY`, `Bill`, …), a new `library/bill-phrases.ts`, `board-view.ts` (`SeatExtras.bills`); values and comparisons in `player-value-phrases.ts`; a payment in `game-numbers.ts`.
  - The flag until it moves: `types.ts` (`ThingFact.untilMoved`), `fact-phrases.ts`, `card-facts.ts` (`leftBehind`), every function that changes a card's zone.
  - New state: `lang:nest` and `lang:bills` in `state.data`, each written only when needed. No new key in a card's `data`, no `CardState` change, no new flow rule.
- **Builder calls this plan makes** (the spec leaves wordings to the builder):
  - **Bankruptcy takes no seat out.** §7 Bankruptcy is seizure, liquidation and a forgiven shortfall; the player plays on (Rust's too). So nothing here calls `markOut`, and 4-1 P4 stays as built. The walks are still made to finish if some other game's rule takes a seat out while levels are open (Task 2).
  - **One stack of levels.** A level is a kept turn (`the X phase starts with …`) or an action waiting (7-1's window, 8-1's ask). Any number may be open; only the newest moves. Going back to a kept turn while an action waits above it is refused (R3: "each step suspends the one that caused it and resumes it when done").
    - **Today's shapes keep today's keys:** none; a kept turn (`lang:interrupted`); an action waiting (`lang:window`); an action waiting over a kept turn (both: an inspection's bid). Any other shape lives whole under `lang:nest`, the two slots left out. So Rent Day, every 7-1 to 9-3 state, and their tests are byte-for-byte as before.
    - Each level keeps its own context: its kept turn or `back`, its asked seats and place, its press. A nested level's turn log is gone when it goes back, so rules keep what must last in facts (R3).
  - **Asks lifted** (8-1's "until slice 10"): a button may ask more than once, one after another; a button of an answering phase may ask, the new action waiting above the one it answers. An ask into its own phase stays refused, and so do asks in a steps phase.
  - **`Each player has the come clean, in turn from the left of the seller.`** asks every player still in, from the left of the player who holds the flag, that player last (R1: the seller asked last), the presser among them. The order and the asked set are fixed as the ask opens.
  - **What an offer may read** (R1: only Partnerships, Tag providers, Face-Down counts, cash):
    - `they have a card in their development that is hidden`, where every line of `Hidden:` says only whether the card lies face down (9-1's forward note);
    - `another player tied to them by a card in their portfolio is the seller` and its negation (the seller's Partners);
    - `some player is the whistleblower` (Settle's bounty only when there is one).
  - **Reading the action being answered.** `its requires is the waiting card's tag` compares a card with the card of the action now waiting (the newest), so a Come Clean knows which Tag was sold at its own level. A waiting card some seat can't see is a RuleError, so no answer reads a hidden card. `They pay the license to the player acting.` pays whoever pressed the action being answered (the buyer, R1).
  - **Owing (R2).** `They owe 4 to the whistleblower.`, `They owe 1.` and `They owe the license to another player of their choice who …` keep bills in the order owed, each payee fixed as it is owed (R3: a Settlement's payees are fixed when it is chosen). `They pay up to what they owe.` pays them in order as far as the player's money goes, and the rest goes unpaid. Separate from Rent Day's `lang:owes`, which is untouched.
  - **Values that set the debt aside.** `A player's spare capital is their capital.`, `A player's spare capital goes down by what they owe.`, `Only if their spare capital is less than 0.` and `Only if their spare capital is at least the license.`
  - **Legacy Status is two flags that last until the card moves:** `A card can be requires legacy until it moves.` Every move to another zone drops it, so R3's "cleared whenever the card leaves its owner's Board" holds for every route, now and later. Turning a card, renaming it and moving it within its zone keep it.
  - **Example vocabulary:** `Given p0 owes 6 to p1`, `Given p0 owes 3`, `Then p0 owes 9`, `Then p0 owes nothing`. Flags and phases already have theirs.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-10-bankruptcy-broken-chain-design.md` is binding, and its "Builder-check rulings" R1–R3 win over its body:
- R1: vulnerable means a Face-Down project needing the sold Tag whose owner had Secured Access before the sale and has none after, checked after the move (the seller and the seller's Partners); every such owner with any Face-Down project is asked, the seller last from the seller's left; the offer reads public facts only; the $0 Partner rate can't arise.
- R2: from going Bankrupt until the liquidation ends, a player spends only cash above what they owe (Come Clean fee, Market Sale purchase); a second audit cost joins the first with no second seizure; Settle needs cash plus Fire Sale value to cover everything owed; debts are paid in the order they arose, only a Fold fine left unpaid; players' debts stay separate.
- R3: the Come Clean reveal checks Missing Dependency only, the sold Tag excused; Legacy is cleared whenever the card leaves its owner's Board; a paid Come Clean grants Legacy too; a Settlement's cost and payees are fixed when chosen; Fold and Settle for any owner at any moment, with no Whistleblower; nested interrupts are a stack with per-level context in facts.

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, binding as amended. Its anti-goals bind especially: a game that can't end; hidden information leaking; Startup words in shared code. The evidence is `builder-check-startup-10.md` in the session scratchpad (Q1–Q2 and "Checked, not asked").

Plans 4-1 to 9-3 and the speed-up plan (their Interfaces blocks and Global Constraints amendments) are inputs. Their forward notes for slice 10 are met here:
- 8-1's two limits (one ask per button; none in an answering phase) lift in Task 3; its "a bankrupt's spare cash is one more `Only if` line" is Task 7.
- 8-1's and 8-2a's "Legacy Status cleared on a sale is one more line" becomes Task 8's flag, cleared on every move.
- 9-1's "an ask reads whether a player has a face-down card" is Task 4; its "the Audit holds an interrupt and an ask at once" is the shape Task 1 keeps in today's keys.
- 9-2's "Settle's cover is cash plus Fire Sale value" is Task 7; "a Come Clean checks Missing Dependency only, the sold Tag excused" is Tasks 5 and 8.
- 8-3's and 9-3's "two asks at once need two waiting lines" is Task 2: `waiting` is the newest, `waitingUnder` the rest.
- 4-1 P4 and 9-3's "a bankrupt seat's projects leave with it" assumed a seat goes out; none does (the call above).

## Global Constraints

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.**
  - `lang:nest` is written only while the open levels are none of today's four shapes; `lang:bills` only while some seat owes. Each key goes when it would be empty.
  - No new key in a card's `data`; no `CardState` change. A flag that lasts until its card moves is the game's own fact, under its declared name.
  - New fields are optional and left out, never set to `undefined`: `ThingFact.untilMoved`, `SeatExtras.waitingUnder`, `SeatExtras.bills`, the fourth `ASK_FRAME` argument.
  - A game without the new lines builds exactly the same `TableDef`, `FlowDef`, compiled shape, states and views as before. Replay stays exact: every level lives in the state.
- **No Startup Simulator words in shared code** (code, comments, test names and fixture strings), in every form:
  - plan 9-1's list: 8-1's (7-1's, 6-1's, 1b-2's and slices 3–8's words) and slice 9's;
  - **slice 10's:** bankrupt, bankruptcy, liquidation (and liquidate), broken chain, creditor, insolvent; and, from the spec, come clean, seize / seizure, vulnerable.
  - New lines never name the existing `Creditor` type or `everythingGoesToCreditor`: write `PlayerId | 'bank'`.
  - Ordinary words to avoid, beyond 9-1's: "broke", never "bankrupt"; "sell off", never "liquidate"; "goes back to its maker", never "seized"; "whom they owe" or "payee", never "creditor"; "levels", never "chain"; "goes unpaid", never "forgiven".
  - **`CREW_GAME`'s hands have a `skill` column.** New fixture lines read `wage`, `pay`, `worth`, `dents` or a worked value by its own name.
  - The banned words may appear in `src/games/startup-simulator.*`, `README.md` and `docs/`.
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged; Rent Day keeps its 108 examples. Rent Day's going-out and debt pieces (`markOut`, `nextIn`, `playersIn`, `owedTo`, `recordDebt`, `lang:owes`, `everythingGoesToCreditor`) are byte-for-byte as before. Startup Simulator compiles with `[]` and its examples pass in the same number as at BASE.
- **Every number comes from the rulebook.** This plan's numbers are fixture numbers. Plan 10-2 cites the rulebook for each of Startup's: the $5 Fold ($4 to the Whistleblower, $1 to the bank), the whole $5 to the bank after a failed Come Clean, $3 + $3 per missing Tag (+$3 for Ghost Progress alone), the $3 Come Clean License ($5 under Patent Trolls), the free Come Clean after a Fire Sale, the Fire Sale's 50% rounded down, a $0 product kept, the $4 bounty ($8 under Whistleblower Protection Act).
- **Hidden information (3-2's to 9-1's lessons).**
  - What a seat's view shows is decided by the compiled rules alone, and never reveals a hidden card or zone. A card lying face down is a hidden card.
  - Whether an ask opens, and whom it asks, every seat sees (8-1 R4): its `Only if` lines read only what everyone sees. Task 4 lets through exactly one more read: whether a player has a card lying face down. Task 7's value line reads a counter only when everyone sees it.
  - An answer reads the waiting card only when every seat sees its face (Task 5's RuleError).
  - Each waiting line names cards only as its seat sees them (7-1's `waitingView`), at every level.
  - `worked-view.ts` counts every phrase of `registerCardSubjectPhrases` and `registerCardValuePhrases` as card-only, pinned by a phrase-set test in `worked-view.test.ts`. **No task here adds a phrase to those registrars**, so that test and `CARDS_ON_IT` stay as they are. New card phrases go in `compare-phrases.ts` (not card-only: fail closed).
  - Every phrase that reads a card carries its needs flags (`needsCard`, `needsCards`, `needsOnto`, `needsMove`), so `readsPressCard`, `readsHiddenFace` and `reportHiddenCardReads` judge it.
- **Every new phrase that changes a card's count or flag declares `writes`.** None here does: dropping a flag as a card moves is the move's doing, not a phrase's.
- **Refuse what strands play.** A game that can't end, or a press that silently does nothing, is an anti-goal.
  - **Task 1:** going back while an action waits above is a RuleError naming its phase, so the press is refused.
  - **Task 2:** an asked seat that has gone out is passed over; with none left, the action goes ahead.
  - **Task 3:** an ask into its own phase is refused when the rules are read; an ask from the left of a flag nobody holds is `holderOf`'s RuleError.
  - **Task 5:** the waiting card some seat can't see is a RuleError; with no waiting card, the comparison is false.
  - **Task 6:** owing to a flag nobody holds is `holderOf`'s RuleError; paying with nothing pays nothing, and never leaves a player below 0.
- **Existing code and tests.**
  - New imported names go on new `import` lines in existing files.
  - Existing test lines don't change unless a task names them. Named: 8-1 Task 6's three refusal tests in `action-window.test.ts` (`ASK_TWICE`, `ASK_IN_A_WINDOW('bidding')`, `ASK_IN_A_WINDOW('objection')`), Task 3; and, only if 7-1 built `WINDOW_GO_TO` to refuse a line that starts a phase, the test pinning that, Task 2. Tests may be appended and fixtures added to `testing.ts`.
  - `board-state.test.ts`'s "allows one at a time" stays as it is: `interruptTurn` keeps its behaviour, and the stack is a layer above it.
  - If any other existing test fails, stop and report it instead of changing it.
  - **After widening a type, run `bun run typecheck` and read every narrowing on it.** At the time of writing:
    - `AskWho` (Task 3): `askedAt`, 8-1's ask checks in `compile.ts`, `waitingView`, anything 8-3 or 9-3 switch on;
    - `SeatExtras` (Tasks 2 and 6): `readSeatExtras` and its `is…` helpers;
    - `ThingFact` (Task 8): `shownFact`, `factNames`, `vocabFrom`, `setFacts`, `acceptFacts`, the declaring functions in `fact-phrases.ts` and `player-facts.ts`;
    - whatever plans 4-3 to 9-3 added on those types.
- **Earlier plans come first.**
  - In execution order: 4-1, 4-2 and the speed-up plan (built), 4-3, 5-1, 5-2a, 5-3 Task 1, 5-2b, 5-3 Tasks 2–4, 6-1, 6-3 Task 1, 6-2a, 6-2b, 6-3 Tasks 2–5, 7-1, 7-2a, 7-2b, 7-3, 8-1, 8-2a, 8-2b, 8-3, 9-1, 9-2, 9-3.
  - Their code is named here as their Interfaces blocks name it. Lang modules read `zoneCards` and `cardById` from `zone-index.ts`; new code does too.
  - Each task re-checks, at HEAD and by name, the names it consumes, and stops and reports one that differs.
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1: record `BASE=$(git rev-parse HEAD)`, run `bun run test` once for the passing count, and note Startup Simulator's example count.
- **Style.**
  - 2-space indent, single quotes, chainable registrars, comments that say why.
  - Commit prefix `feat(lang):`; Task 10's is `docs:`.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.
  - A test marked "(guard)" passes before and after its task.
  - `lineOf(text, line)` is `text.split('\n').indexOf(line) + 1`; define it locally where needed.
  - Each fixture `.replace` must find its text: assert it in the test that first uses the fixture.
- **Fixture words** (general, never Startup's): appeal, drop the appeal, hearing, call a hearing, put up, close the hearing, seller, notice, free notice, take note, show, reveal, keep quiet, stay quiet, plans, plan, put away, veiled, hidden, heavy, fee, announce, claimant, take the blame, run a tab, square up, leeway, gems, splurge, fret, broke, selling, sell off, excused, noted, note.

## Review Focus

- **A level closed out of order: going back while an action waits above the kept turn; an asked seat that goes out while it is asked; undo and replay five levels deep.**
  - Expected: a RuleError naming the answering phase; the action moves to the next asked seat still in, or goes ahead with none; the same state.
  - Tests: Tasks 1, 2 and 9.
- **Today's shapes: one kept turn (Rent Day, `INTERRUPT_BOARD`), one action waiting, an action waiting over a kept turn (an inspection's bid).**
  - Expected: exactly today's keys, never `lang:nest`; every earlier test unchanged.
  - Tests: Tasks 1 and 2.
- **Paying what is owed with less than the first bill, with nothing, to a player who has gone out, to a flag nobody holds, and after owing twice.**
  - Expected: in the order owed, as far as the money goes, never below 0, the rest unpaid; the bank paid for a payee who is out; a RuleError naming the flag; Rent Day's `lang:owes` never written.
  - Tests: Task 6.
- **What an offer may read: a row where cards may lie face down through a flag that reads only how a card lies, through a flag or filter that reads its face, or through a flag cards keep; the waiting card in a zone only its owner sees; a counter only its owner sees, through a value.**
  - Expected: allowed; refused when the rules are read (three times); a RuleError at the answer; refused when the rules are read.
  - Tests: Tasks 4, 5 and 7.
- **A flag that lasts until its card moves: moved to another zone, with everything on it, to the bottom of a pile, onto a card; turned face up; renamed; moved within its own zone.**
  - Expected: dropped four times, its face key rebuilt; kept three times.
  - Tests: Task 8.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name, not by line. If one is missing or differs, stop and report it.

- **Plan 4-1, built:** the steps before the score (`END_STEPS_KEY`; the walk ends once the next seat still in has had its step, P4); `linesDoing`, `effectsOf` (`compile.ts`); `CREW_GAME`.
- **The speed-up plan:** `zoneCards`, `cardById` (`zone-index.ts`).
- **Plan 5-1:** `PLAYER_FRAME`, `playersInTurnOrder`, rules about a player under `In every phase:`; `If <a> and <b>, <effect>`.
- **Plan 7-1:** `action-window.ts` (`WINDOW_KEY`, `WINDOW_LINE`, `Waiting`, `waitingOf` and its shape check, `actingPlayer`, `NO_ACTION_WAITING`, `STOP_PHRASE`); in `runtime.ts`, `askedFor`, `openWindow`, `windowAnswered`, `closeWindow`, `turnWaiting`, `endStepsDue`; `WINDOW_RULE` (`build.ts`); `roundFinished`, `clearTurnMarkers` (`turns.ts`); the pass's window branch, `WINDOW_PASS_OUTSIDE`, `TURN_IN_THE_WINDOW` (`turn-phrases.ts`); the window checks `WINDOW_GO_TO` … `ACTING_ELSEWHERE` and the walk of what a clause reads (private in `compile.ts`); `WaitingView`, `waitingView`, `SeatExtras.waiting`, `readSeatExtras`; the tie conditions `another player tied to them by a card in their {perzone} has …` and `no other player …`; `Move it to its maker's purse.`; `the {phase} phase starts with its owner`; `MAKER_GAME`, `OBJECT_GAME`; 7-1 Task 8's engine helpers in `action-window.test.ts`.
- **Plan 8-1:** `ASK_LINE`, `AskWho`, `ASK_FRAME`, `windowPhases`, `GO_AHEAD_PHRASE`, `ASK_ORDER`, `ASK_ONE`, `ASK_TWICE`, `ASK_IN_A_WINDOW`, `ASK_IN_STEPS`, `AFTER_NAMES_ASK`, `NOT_UNDERSTOOD_IN_ASK`; `Waiting.resume`; `askedAt`, `runButtonLines`; `PhraseOpts.countsOnly`; `their {playervalue} is at least the card's {attribute}`; `a player's {playervalue} goes down by the total …`; `Move it to their …, with everything on it.` and the function behind it; `ASK_GAME`; 8-1 Task 7's claim table in `action-window.test.ts`.
- **Plan 9-1:** `seenBy`, `seenByAll` (`zones.ts`); `it is face down`, `TURN_FACE_DOWN` (`face-phrases.ts`); `PhraseOpts.faceBlind`, `readsHiddenFace`, `flagSeenOnCards`; `renameCards`; `they pay up to {int} to {holder}`; `VEIL_GAME`, `INSPECT_GAME`.
- **Plans 4-2 to 9-3:** whatever they added to `board-view.ts`, `worked-view.ts`, `compile.ts`, `runtime.ts`, `turn-phrases.ts` and the README. Leave it as found.
- **The language at HEAD:**
  - `interruptTurn`, `resumeTurn`, `interruptedTurn`, `InterruptedTurn`, `INTERRUPTED_KEY`, `TURN_KEY`, `TURN_ROLLS_KEY`, `clearTurnLog`, `holderOf`, `markOut`, `isOut`, `playersIn`, `nextIn`, `counterOf` (`board-state.ts`);
  - `startPhase`, `runStartLines`, `goBackToTheTurn`, `phaseStartsOnTheirLeft` (`flow-phrases.ts`);
  - `transfer`, `payCounter`, `isOutGiven` (`board-phrases.ts`); `they pay the {gamenumber} to {holder}` and `… to that player` (`game-numbers.ts`); `theyOf`, `seatOf`, `thePick`, `playerValueOf`, `cardValueOf`, `passes` and its private `sameValue` (`support.ts`);
  - `PLAYER_TOTAL`, `AT_LEAST_THEIRS` and the conditions in `player-value-phrases.ts`; `no player is {playerflag}`, `a player is {playerflag}` (`player-facts.ts`); `cards can be {name}` (`fact-phrases.ts`);
  - `acceptFacts` (`compile.ts`); `ThingFact` (`types.ts`); `relocate`, `toBottom`, `withoutHolder` (`zones.ts`); `putOn` (`attach.ts`); `changeCard`, `faceKeyOf` (`card-facts.ts`); `CHOICE_LINE`, `readChoiceLine` (`compile-choice.ts`);
  - `REGISTRARS` (`library/index.ts`); `INTERRUPT_BOARD`, `fixtureBoardState`, `runPhrase`, `vocabFor` (`testing.ts`); the INTERRUPT_BOARD engine helper in `board-view.test.ts` (`describe('seat views while a turn is interrupted')`).

---

### Task 1: Levels of play on one stack

Before starting: re-check `interruptTurn`, `resumeTurn`, `interruptedTurn`, `clearTurnLog`; every reader and writer of `INTERRUPTED_KEY`, `WINDOW_KEY` and `interruptedTurn(` in `src/engine/core/lang` (tests left out), sorted into the files named below; report any that fits none. Then 7-1's and 8-1's window names in "Assumed".

**Files:**
- Create: `src/engine/core/lang/frames.ts`, `src/engine/core/lang/frames.test.ts`.
- Modify: `src/engine/core/lang/board-state.ts` (`keptTurnOf`, `withTurnBack`), `action-window.ts` (`WINDOW_KEY` re-exported; `waitingOf`), `runtime.ts` (`openWindow`, `closeWindow`, `windowAnswered`, `askedFor`, `askedAt`, `turnWaiting`, `endStepsDue`), `turns.ts` (`roundFinished`, `clearTurnMarkers`), `library/turn-phrases.ts` (the pass, `TURN_IN_THE_WINDOW`, the two verdicts), `library/flow-phrases.ts` (`startPhase`, `goBackToTheTurn`), `board-view.ts` (`interrupted`), `testing.ts` (`APPEAL_BOARD`).
- Test: `frames.test.ts` (new), `library/flow-phrases.test.ts`, `board-view.test.ts` (appended).

**Interfaces:**
- Consumes: the names above.
- Produces (for Tasks 2–9 and plans 10-2, 10-3):

```ts
// frames.ts
/** Where an action waits for the players to answer it (7-1). Defined here so the stack needs nothing from action-window.ts at load. */
export const WINDOW_KEY = 'lang:window';
/**
 * Every open level of play, oldest first, written only while the open levels are none of the four shapes the two slots hold: none; a kept
 * turn (INTERRUPTED_KEY); an action waiting (WINDOW_KEY); an action waiting that opened over a kept turn (both). The two slots are then
 * left out. Never sent to a seat.
 */
export const NEST_KEY = 'lang:nest';
/** One level of play: a turn another phase interrupted, kept to go back to, or an action waiting for players to answer it. */
export type Frame = { kept: InterruptedTurn } | { waiting: Waiting };
export function framesOf(state: GameState): Frame[];                      // oldest first, from whichever layout the state has
export function withFrames(state: GameState, frames: Frame[]): GameState; // lays them out as above; [] leaves none of the three keys
export function topFrame(state: GameState): Frame | null;
export function newestKept(state: GameState): InterruptedTurn | null;
export function newestWaiting(state: GameState): Waiting | null;          // with 7-1's shape check
/** The state with the newest action waiting replaced; Error when none waits (a mistake in the code). */
export function withNewestWaiting(state: GameState, waiting: Waiting): GameState;
/** The turn beneath every open level: the oldest level's kept turn (or `back`); the turn itself when none is open; null with no turn. */
export function turnBeneath(state: GameState): { phase: string | null; current: PlayerId } | null;
/** Storage only: a level on top, or the top level taken off (Error with none). The turn is the caller's to change. */
export function pushFrame(state: GameState, frame: Frame): GameState;
export function popFrame(state: GameState): { state: GameState; frame: Frame };
/** interruptTurn on the stack: keeps the turn (keptTurnOf) as a level on top of any open ones and hands it to `next` in `phase`. */
export function pushKept(state: GameState, phase: string, next: PlayerId): GameState;
/** resumeTurn on the stack: back to the turn the top level kept (withTurnBack). RuleError NOTHING_TO_GO_BACK_TO or GO_BACK_WHILE_ANSWERING. */
export function popKept(state: GameState): GameState;
export const NOTHING_TO_GO_BACK_TO = 'There is no interrupted turn to go back to.';
export const GO_BACK_WHILE_ANSWERING = (phase: string) =>
  `Players are still answering an action in the ${phase}: go back to the interrupted turn once they have.`;
// action-window.ts — `export { WINDOW_KEY } from './frames';` in place of its definition; waitingOf(state) is newestWaiting(state)
// board-state.ts — the guts of interruptTurn and resumeTurn, which now call them, unchanged in behaviour
export function keptTurnOf(state: GameState): InterruptedTurn;                  // RuleError 'There is no turn to interrupt.' with no turn
export function withTurnBack(state: GameState, kept: InterruptedTurn): GameState; // turn, TURN_KEY and TURN_ROLLS_KEY as `kept` holds them
```

- **Re-pointed, each to the level it means:**
  - `startPhase` calls `pushKept`; going back calls `popKept`.
  - `openWindow` stores with `pushFrame`, `back` from `keptTurnOf`, then does what 7-1 built. `closeWindow` takes the top level with `popFrame` (Error unless it is an action waiting), puts the turn back with `withTurnBack`, then does what 7-1 and 8-1 built.
  - `windowAnswered`: the top level is an action waiting with a verdict.
  - `askedFor` and `askedAt` judge their clause on `pushFrame(state, { waiting: probe })`, so "the player acting" reads the probe at any depth.
  - The pass: only while the top level is an action waiting with no verdict, in its phase. `TURN_IN_THE_WINDOW`: only while the top level is an action waiting. The verdict phrases write with `withNewestWaiting`.
  - `turnWaiting`, `endStepsDue`, `roundFinished`: false while any level is open (`framesOf(state).length > 0`), which covers today's "an interrupted turn" and 7-1's "an action waiting".
  - `clearTurnMarkers` drops `NEST_KEY` with `WINDOW_KEY`.
  - `BoardView.interrupted` is `newestKept(state) !== null`.
- **Import order.** `frames.ts` imports `INTERRUPTED_KEY`, `InterruptedTurn`, `keptTurnOf`, `withTurnBack` and `clearTurnLog` from `board-state.ts`, and only `import type { Waiting }` from `action-window.ts`. `board-state.ts` imports nothing from it.
- **`testing.ts`:**

```ts
/**
 * INTERRUPT_BOARD where a voter may appeal: the appeal phase starts with the player on their left, the vote kept beneath it, and dropping
 * the appeal goes back to the vote.
 */
export const APPEAL_BOARD = INTERRUPT_BOARD
  .replace('  A player may close the vote.', ['  A player may appeal.', '    Then:', '      The appeal phase starts with the player on their left.',
    '  A player may close the vote.'].join('\n'))
  .replace('\nEnd:', ['', 'Phase: appeal', '  Hint: Drop the appeal.', '  A player may drop the appeal.', '    Then:',
    '      Go back to the interrupted turn.', '', 'End:'].join('\n'));
```

- [ ] **Step 1: Write the failing tests.**
  - **The layouts** (`frames.test.ts`, `describe('levels of play')`). `K1`, `K2` are hand-made `InterruptedTurn`s; `W1`, `W2` hand-made `Waiting`s as 7-1 Task 7's tests make one (`phase: 'bidding'`, `by: 'p0'`, `asked: ['p1']`, `at: 0`, `back: K1`).
    - `withFrames(s, [])` has none of `INTERRUPTED_KEY`, `WINDOW_KEY`, `NEST_KEY`; `[{ kept: K1 }]` has only `INTERRUPTED_KEY` equal to `K1`; `[{ waiting: W1 }]` only `WINDOW_KEY`; `[{ kept: K1 }, { waiting: W1 }]` both slots and no `NEST_KEY` (Review Focus: today's shapes).
    - `[{ waiting: W1 }, { kept: K1 }]`, `[{ kept: K1 }, { kept: K2 }]`, `[{ waiting: W1 }, { waiting: W2 }]` and `[{ kept: K1 }, { waiting: W1 }, { kept: K2 }, { waiting: W2 }]` each have only `NEST_KEY`, equal to the list.
    - For every list above, `framesOf(withFrames(s, list))` equals it, and `withFrames(withFrames(s, list), [])` has none of the three keys.
    - `newestKept` and `newestWaiting` of the four-level list are `K2` and `W2`; `topFrame` is `{ waiting: W2 }`; `turnBeneath` is `{ phase: K1.phase, current: K1.current }`; with no level, `turnBeneath` is the state's turn.
  - **Kept turns** (same file), from `recordAction(fixtureBoardState(), 'p0', 'call a vote')`:
    - `pushKept(s, 'vote', 'p1')` then `pushKept(…, 'appeal', 'p2')`: the turn is `{ current: 'p2', phase: 'appeal' }`, `NEST_KEY` holds two levels and `TURN_KEY` is `{}`;
    - `popKept` once: the turn is `{ current: 'p1', phase: 'vote' }`, `INTERRUPTED_KEY` holds the first kept turn, `NEST_KEY` is absent;
    - `popKept` again: `turn` and `data` equal the starting state's.
    - **Review Focus:** `popKept(withFrames(s, [{ kept: K1 }, { waiting: W1 }]))` throws `GO_BACK_WHILE_ANSWERING('bidding')`; `popKept(s)` with none throws `There is no interrupted turn to go back to.`; `pushKept` on a state with no turn throws `There is no turn to interrupt.`
  - **An appeal inside a vote** (`library/flow-phrases.test.ts`, `describe('a phase started while another is open')`). A 3-player `APPEAL_BOARD` engine built as `board-view.test.ts`'s INTERRUPT_BOARD helper builds one (turn p0 in playing, a roll of 1 and 2 queued):
    - `APPEAL_BOARD` compiles with `[]`, with no "Nothing leads to …" warning; each `.replace` finds its text.
    - p0 rolls and calls a vote; p1 appeals: the turn is `{ current: 'p2', phase: 'appeal' }` and `framesOf` holds two kept turns, `{ phase: 'playing', current: 'p0' }` then `{ phase: 'vote', current: 'p1' }`. (Before this task the appeal throws `A turn is already interrupted; …`.)
    - p2 drops the appeal: the turn is `{ current: 'p1', phase: 'vote' }`, `didThisTurn(state, 'p1', 'appeal')` is true, and `INTERRUPTED_KEY` holds the playing turn.
    - p1 closes the vote: the turn is `{ current: 'p0', phase: 'playing' }`, `rollsThisTurn(state, 'p0')` is `[[1, 2]]`, and none of the three keys is in `data`.
    - **Review Focus:** with p2 marked out on the starting state, p1's appeal starts with p0.
    - **Review Focus:** after the appeal, a fresh engine given `loadLog(engine.getLog())` equals the engine's state; `engine.undo()` gives the vote with p1 current and no `NEST_KEY`.
  - **What the seats are told** (`board-view.test.ts`, appended to `describe('seat views while a turn is interrupted')`): during the appeal, `board.interrupted` is true for all three seats.
  - (guard) INTERRUPT_BOARD's tests, 7-1's and 8-1's `action-window.test.ts`, 9-1's inspection examples and Rent Day's 108 examples pass unchanged.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/frames.test.ts src/engine/core/lang/library/flow-phrases.test.ts src/engine/core/lang/board-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces and the re-pointing.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/frames.ts src/engine/core/lang/frames.test.ts src/engine/core/lang/board-state.ts \
  src/engine/core/lang/action-window.ts src/engine/core/lang/runtime.ts src/engine/core/lang/turns.ts \
  src/engine/core/lang/library/turn-phrases.ts src/engine/core/lang/library/flow-phrases.ts src/engine/core/lang/board-view.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/library/flow-phrases.test.ts src/engine/core/lang/board-view.test.ts
git commit -F - <<'EOF'
feat(lang): levels of play on one stack: a phase started while another is open keeps that one beneath it, and each goes back in turn

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: An action waiting above another level

Before starting: re-check Task 1's names; 7-1's `WINDOW_GO_TO` and how it finds its lines; `waitingView`, `SeatExtras`, `readSeatExtras`; `windowAnswered`, `closeWindow`, the pass; `ASK_GAME` and 8-1 Task 7's claim table.

**Files:**
- Modify: `src/engine/core/lang/runtime.ts` (`windowAnswered`, `closeWindow`), `library/turn-phrases.ts` (the pass), `board-view.ts` (`SeatExtras.waitingUnder`, `readSeatExtras`), `testing.ts` (`NEST_GAME`); `compile.ts` only if `WINDOW_GO_TO` needs narrowing (below).
- Test: `src/engine/core/lang/action-window.test.ts`, `board-view.test.ts` (appended).

**Interfaces:**
- Consumes: Task 1's names; 7-1's and 8-1's window names.
- Produces (for Task 9 and plan 10-3):

```ts
// runtime.ts
windowAnswered(state: GameState): boolean;  // the top level is an action waiting with a verdict, or whose asked seat at `at` has gone out
closeWindow(state: GameState): GameState;   // with a verdict, as Task 1; with none (that seat went out), it moves on as the pass does
// turn-phrases.ts — the pass hands the action to the next asked seat still in (at + 1, at + 2, …); after the last, the verdict is 'ahead'
// board-view.ts — SeatExtras gains, left out when no action waits beneath the newest:
waitingUnder?: WaitingView[];   // each action waiting beneath the newest, oldest first, as waitingView words it for this seat
// readSeatExtras accepts it when absent or a list of what it accepts for `waiting`, and returns null otherwise
```

- **`WINDOW_GO_TO`.** If 7-1 built it to refuse a line that starts a phase (`the {phase} phase starts with …`, `hand the {phase} phase to that player`) in an answering phase, narrow it to `GO_TO_PHRASE`: such a line now opens a level above the action waiting. If a test pins that refusal, it is the one existing test line this task changes; name it in the report.
- **`testing.ts`:**

```ts
/**
 * ASK_GAME where a player asked to protest a claim may call a hearing instead: a phase of their own above the claim, where they may put up
 * a job of their workshop as the auction does, with no cost, and close the hearing to go back to the claim.
 */
export const NEST_GAME = ASK_GAME
  .replace('  A player may let the claim go.', ['  A player may call a hearing.', '    Then:', '      The hearing phase starts with them.',
    '  A player may let the claim go.'].join('\n'))
  .replace('\nEnd:', ['', 'Phase: hearing', '  Players take turns.', '  A player may put up a card in their workshop.', '    Then:',
    '      It is offered.', '      Each other player has the bidding, in turn from their left.',
    "        Only if they have at least the card's worth in coins.", '      It is not offered.', '      They get its worth.',
    '      Move it to the scrap.', '  A player may close the hearing.', '    Then:', '      Go back to the interrupted turn.', '',
    'End:'].join('\n'));
```

- [ ] **Step 1: Write the failing tests** in `action-window.test.ts`, `describe('an action waiting above another level')`.
  - **Setup.** 8-1 Task 7's claim table on `NEST_GAME`: 3 players, 9 coins and 3 moves each, p0's turn in working; `stash-p0` holds a Statue; `workshop-p1` holds a Vase with a Smith (wage 2) on it, and a Statue (worth 4); `purse-p1` holds a Stake whose maker is p1.
  - **Compiled.** `NEST_GAME` compiles with `[]`, with no "Nothing leads to …" warning; each `.replace` finds its text.
  - **Played**, checking the keys at each step:
    1. p0 claims the Statue to the Smith: phase protest, p1 current; only `WINDOW_KEY` of the three keys; p0 has 7 coins.
    2. p1 calls a hearing: phase hearing, p1 current; only `NEST_KEY`, with an action waiting (protest) then a kept turn (`{ phase: 'protest', current: 'p1' }`).
    3. p1 puts up the Statue in `workshop-p1`: phase bidding, p2 current; `framesOf` has three levels; `waitingOf(state)` has `by: 'p1'`, `phase: 'bidding'`, `asked: ['p2', 'p0']`, `at: 0`.
    4. p2 bids on the Statue: p2 has 5 coins and p1 13; the Statue is in `workshop-p2`; phase hearing, p1 current; two levels.
    5. p1 closes the hearing: phase protest, p1 current; only `WINDOW_KEY`.
    6. p1 lets the claim go: phase keeping, p0 current; only `INTERRUPTED_KEY`.
    7. p0 keeps the Smith: phase working, p0 current; none of the three keys; the Smith is in `idle-p0` on no card.
  - **Review Focus** (from step 3's state):
    - `runPhrase` of `go back to the interrupted turn` throws `GO_BACK_WHILE_ANSWERING('bidding')`.
    - With p2 marked out: `runtime.windowAnswered(s)` is true, and `runtime.closeWindow(s)` gives p0 current with `at` 1. With p0 marked out as well: the put-up goes ahead, the Statue is in the scrap, p1 has 13 coins, and the phase is hearing with p1 current.
    - With p0 marked out: p2 passes the bid, and the put-up goes ahead the same way.
    - A fresh engine given `loadLog(engine.getLog())` equals the engine's state; `engine.undo()` gives step 2's levels.
  - **What each seat is told** (`board-view.test.ts`, `describe('what each seat sees of the levels beneath')`). At step 3, for p0, p1 and p2:
    - `waiting` is `{ by: 'p1', label: <put up's label>, cards: ['Statue'], choices: [] }`;
    - `waitingUnder` is `[{ by: 'p0', label: <claim's label>, cards: ['Statue', 'Smith'], choices: [] }]`;
    - at step 1 and step 5, `waitingUnder` is undefined;
    - `readSeatExtras` gives back step 3's extras unchanged, and null for `waitingUnder: [{ by: 1 }]`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/action-window.test.ts src/engine/core/lang/board-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `SeatExtras`.
- [ ] **Step 4: Run** them with `src/engine/core/lang/end-steps.test.ts`, then `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/runtime.ts src/engine/core/lang/library/turn-phrases.ts src/engine/core/lang/board-view.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/action-window.test.ts src/engine/core/lang/board-view.test.ts
git commit -F - <<'EOF'
feat(lang): an action may wait above another level, each seat is told of the actions waiting beneath, and an asked seat that has gone out is passed over

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

Add `src/engine/core/lang/compile.ts` and the named test file to the pathspec if `WINDOW_GO_TO` was narrowed.

---

### Task 3: Asks: twice in one button, inside an answer, and from the left of a flag's holder

Before starting: re-check 8-1 Task 6's names and checks (`readRuleBody`'s ask branch, the checks in `compile.ts`), 8-1 Task 7's `askedAt` and `runButtonLines`, the `{holder}` type (`refs.ts`) and `holderOf`, Tasks 1–2's names, `ASK_GAME`.

**Files:**
- Modify: `src/engine/core/lang/action-window.ts` (`ASK_FROM_LINE`, `AskWho`), `compile-phase.ts` (reads it), `compile.ts` (the checks), `runtime.ts` (`askedAt`), `testing.ts` (`SALE_GAME`).
- Test: `src/engine/core/lang/action-window.test.ts` (append `describe('asks twice, inside an answer, and from a flag's holder')`; three existing lines change, named below).

**Interfaces:**
- Consumes: the names above.
- Produces (for Tasks 4–9 and plan 10-2):

```ts
// action-window.ts
/** group 1 = the phase, group 2 = the player who holds a flag ({holder}), from whose left every player is asked, that player last */
export const ASK_FROM_LINE = /^each player has the (.+?), in turn from the left of (.+)$/i;
export type AskWho = 'others' | 'owner' | 'target owner' | 'everyone';
// ASK_FRAME args: [who, phase, groups] as before; for 'everyone', [who, phase, groups, flag], the flag {holder} names
// compile.ts
const ASK_FROM_ORDER = (phase: string) =>
  `Say from whose left every player is asked: “Each player has the ${phase}, in turn from the left of the …”, they last.`;
const ASK_INTO_ITS_OWN_PHASE = (phase: string) => `A button of the ${phase} can't ask players into the ${phase} again: each answer would ask once more.`;
// ASK_TWICE and ASK_IN_A_WINDOW are removed. ASK_IN_STEPS, AFTER_NAMES_ASK and every 7-1 window check apply to the new form.
// runtime.ts — askedAt for 'everyone': every seat still in, from the left of holderOf(flag) round to that player, last, the presser
//   among them; each kept when the groups hold about them. holderOf's RuleError when no player, or several, hold the flag.
```

- **Reading.** A top-level `Then:` line matching `ASK_FROM_LINE` becomes the `ASK_FRAME` ref, its children read as 8-1 reads an ask's. `Each player has the X.` and `Each player has the X, in turn from their left.` get `ASK_FROM_ORDER(X)`. A misread `{holder}` gets that type's own message.
- **`testing.ts`:**

```ts
/**
 * ASK_GAME where whoever auctions a job is the seller, and every player with a card in their stash is told of the sale, in turn from the
 * seller's left, the seller last: after the bank takes it, by the auction's own lines, and after a bid, by the bid's lines while the
 * auction waits beneath.
 */
const TOLD = ['      Each player has the notice, in turn from the left of the seller.', '        Only if their stash is not empty.',
  '      No player is the seller.'];
export const SALE_GAME = ASK_GAME
  .replace('  Players pay with coins.', '  Players pay with coins.\n  Players can be the seller.')
  .replace('      Each other player has the bidding, in turn from their left.',
    '      They are the seller.\n      Each other player has the bidding, in turn from their left.')
  .replace('      They get its worth.\n      Move it to the scrap.', ['      They get its worth.', '      Move it to the scrap.', ...TOLD].join('\n'))
  .replace('      Move it to their workshop, with everything on it.\n      The action does not go ahead.',
    ['      Move it to their workshop, with everything on it.', ...TOLD, '      The action does not go ahead.'].join('\n'))
  .replace('\nEnd:', ['', 'Phase: notice', '  Players take turns.', '  A player may take note.', '    Then:',
    '      The notice passes to the left.', '', 'End:'].join('\n'));
```

- [ ] **Step 1: Write the failing tests.**
  - **Setup.** 8-1 Task 7's auction table on `SALE_GAME`: 3 players, 9 coins and 3 moves each, p0's turn in working; `workshop-p0` holds a Vase (worth 3); `stash-p0` a Statue, `stash-p1` a Statue, `stash-p2` a Vase.
  - **Compiled.**
    - `SALE_GAME` compiles with `[]`, with no "Nothing leads to …" warning; each `.replace` finds its text.
    - The auction's notice ref has args `['everyone', 'notice', groups, 'the seller']`.
    - **Changed lines** (8-1 Task 6): the three tests that expected `ASK_TWICE` (a second `Its owner has the consent.` in borrow), `ASK_IN_A_WINDOW('bidding')` (in bidding's `bid on`) and `ASK_IN_A_WINDOW('objection')` (in objection's `object with`) now expect `[]`.
  - **Refused when the rules are read** (on the ask line):
    - `      Each player has the notice.` and `      Each player has the notice, in turn from their left.` give `ASK_FROM_ORDER('notice')`;
    - `… from the left of the selller.` gives the `{holder}` type's message naming `the selller`;
    - in bid on, `      Each other player has the bidding, in turn from their left.` gives `ASK_INTO_ITS_OWN_PHASE('bidding')`;
    - (guard) 8-1 Task 6's `ASK_IN_STEPS` and `AFTER_NAMES_ASK` tests pass unchanged; `  After a player auctions, the turn passes to the left.` added to working still gives `AFTER_NAMES_ASK` (in the After form the compiler reads for the auction).
  - **Two asks in one button, the seller last.** p0 auctions the Vase; p1 and p2 pass the bid:
    - the Vase is in the scrap and p0 has 12 coins;
    - the phase is notice with p1 current, and `waitingOf(state).asked` is `['p1', 'p2', 'p0']`;
    - p1, p2 and p0 take note: the phase is working, p0 current, p0 has 2 moves, no player is the seller, and none of the three level keys is in `data`.
    - With `stash-p2` emptied first, `asked` is `['p1', 'p0']`.
  - **An ask inside an answer.** p0 auctions the Vase; p1 bids on it:
    - p1 has 6 coins and p0 12; the Vase is in `workshop-p1`;
    - the phase is notice with p1 current; `framesOf` holds two actions waiting, the auction (`by: 'p0'`) then the bid (`by: 'p1'`), and the bid's `asked` is `['p1', 'p2', 'p0']` (from the seller's left);
    - all three take note: the phase is working with p0 current, p0 has 2 moves, and no player is the seller.
  - **Review Focus:** with `      They are the seller.` removed, p1's bid is refused with `No player is the seller.`, and the state is unchanged.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/action-window.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `AskWho`.
- [ ] **Step 4: Run** it with `src/engine/core/lang/end-steps.test.ts`, then `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/action-window.ts src/engine/core/lang/compile-phase.ts src/engine/core/lang/compile.ts \
  src/engine/core/lang/runtime.ts src/engine/core/lang/testing.ts src/engine/core/lang/action-window.test.ts
git commit -F - <<'EOF'
feat(lang): a button may ask players more than once and from inside an answer, and may ask every player from the left of a flag's holder, that player last

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: What an offer may read of a player

Before starting: re-check 7-1's walk of what a clause reads and 8-1's ask checks, as 9-1 Task 4 left them (`seenByAll`, `readsHiddenFace`); the `{cardclause}` type and its `{ flag, wanted }` test; `PhraseOpts.faceBlind` and which phrases carry it; `flagSeenOnCards`; 7-1's tie conditions; `noPlayerIs`; Task 3's `SALE_GAME`.

**Files:**
- Modify: `src/engine/core/lang/worked-view.ts` (`faceBlindFlag`), `compile.ts` (the walk), `library/compare-phrases.ts` (two conditions), `library/player-facts.ts` (one condition), `testing.ts` (`PLANS_GAME`).
- Test: `worked-view.test.ts`, `action-window.test.ts`, `library/compare-phrases.test.ts`, `library/player-facts.test.ts` (all appended).

**Interfaces:**
- Consumes: the names above.
- Produces (for Tasks 5 and 9 and plan 10-2):

```ts
// worked-view.ts
/**
 * Whether a flag says nothing of a card's face: a worked flag every line of which is a faceBlind phrase, or says the card is (not) another
 * such flag. A flag cards keep never is: a seat that can't see a card sees none of its flags. A flag that comes back to itself is not.
 */
export function faceBlindFlag(game: CompiledGame, library: PhraseLibrary, flag: string): boolean;
// compile.ts — the walk of what a window's clause or an ask's Only if lines read lets a zone through that everyone sees but where cards may
//   lie face down when the ref is `they have a card in {zones} {cardclause}` or `they have no card in {zones} {cardclause}` and the clause
//   is one flag test of a faceBlindFlag, with no `and whose` test. Every other read of such a zone is reported as before.
// compare-phrases.ts — conditions, needsPlayer; Q still in, not them, tied to them as 7-1's tie conditions say
'another player tied to them by a card in their {perzone} is {playerflag}'
'no other player tied to them by a card in their {perzone} is {playerflag}'
// player-facts.ts — condition: a player still in has the flag
'some player is {playerflag}'
```

- **`testing.ts`:**

```ts
/** SALE_GAME where each player keeps plans that may lie face down, and a player is told of a sale only while one of their plans does. */
export const PLANS_GAME = [
  SALE_GAME
    .replace('  Each player has an idle row that everyone can see.', ['  Each player has an idle row that everyone can see.',
      '  Each player has a plans row that everyone can see, where cards may lie face down.'].join('\n'))
    .replaceAll('        Only if their stash is not empty.', '        Only if they have a card in their plans that is veiled.'),
  '', 'Veiled:', '  Only if it is face down.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**
  - **Compiled** (`action-window.test.ts`, `describe('what an offer may read')`):
    - `PLANS_GAME` compiles with `[]`; the `.replaceAll` finds two lines.
    - `that is not veiled` in place of `that is veiled` compiles; so does `that is hidden` with `Hidden:` / `  Only if it is veiled.` appended.
    - **Review Focus**, each on the first ask line, `WINDOW_READS_HIDDEN('their plans')`:
      - `whose name is Vase` in place of `that is veiled`;
      - `that is heavy` with `Heavy:` / `  Only if its worth is more than 3.` appended;
      - `Veiled:` with `  Only if it is a Vase card.` added;
      - `that is tired` (a flag cards keep).
    - (guard) `SALE_GAME` with `        Only if they have a card in their workshop that is heavy.` for its first `Only if` line and the `Heavy:` section compiles: its workshop has no mark.
    - (guard) 9-1's window-clause and ask tests over a marked row pass unchanged.
  - **The helper** (`worked-view.test.ts`): with `compiled(PLANS_GAME)` plus `Hidden:` and `Heavy:`, `faceBlindFlag` is true for `veiled` and `hidden`, false for `heavy`, `tired` and an undeclared name.
  - **Played** (`action-window.test.ts`). Task 3's auction table on `PLANS_GAME` with every stash empty (the deck has two Vases and two Statues), `plans-p1` holding a Statue lying face down and `plans-p2` a Statue face up. p0 auctions the Vase; p1 and p2 pass: the notice's `asked` is `['p1']` (p2's plan is face up; p0 has none).
  - **The tie to a flag's holder** (`library/compare-phrases.test.ts`, through `runPhrase` about each seat). A 3-player `PLANS_GAME` state; `holdings-p1` holds a Stake whose maker is p0; p0 is the seller:
    - `another player tied to them by a card in their holdings is the seller` holds about p1, and not about p2 or p0; `no other player …` is its negation for each;
    - **Review Focus:** with p0 marked out it fails about p1; with the Stake in `purse-p1` instead it fails about p1.
  - **Some player** (`library/player-facts.test.ts`): `some player is the seller` holds with p2 the seller, fails with none, and fails when only a seat that is out holds it.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/action-window.test.ts src/engine/core/lang/worked-view.test.ts src/engine/core/lang/library/compare-phrases.test.ts src/engine/core/lang/library/player-facts.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. No Startup or Rent Day line is now `ambiguous`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/worked-view.ts src/engine/core/lang/compile.ts src/engine/core/lang/library/compare-phrases.ts \
  src/engine/core/lang/library/player-facts.ts src/engine/core/lang/testing.ts src/engine/core/lang/action-window.test.ts \
  src/engine/core/lang/worked-view.test.ts src/engine/core/lang/library/compare-phrases.test.ts src/engine/core/lang/library/player-facts.test.ts
git commit -F - <<'EOF'
feat(lang): an offer may ask whether a player has a card lying face down, whether a player tied to them holds a flag, and whether some player does

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: The action being answered

Before starting: re-check `waitingOf`, `actingPlayer`, `NO_ACTION_WAITING`, `Waiting.subject`, `needsActing` and `ACTING_ELSEWHERE`, `cardValueOf`, `sameValue` (private in `support.ts`), `seenBy`, `transfer`, `gameNumber`, Task 4's `PLANS_GAME`.

**Files:**
- Modify: `src/engine/core/lang/library/support.ts` (export `sameValue`), `library/compare-phrases.ts` (one condition), `library/game-numbers.ts` (one effect), `testing.ts` (`SHOW_GAME`).
- Test: `library/compare-phrases.test.ts`, `library/game-numbers.test.ts`, `action-window.test.ts` (all appended).

**Interfaces:**
- Consumes: the names above.
- Produces (for Task 9 and plan 10-2):

```ts
// compare-phrases.ts — condition, needsCard, needsActing: the two values compared as sameValue compares them; false when the action
//   waiting picked no card. RuleError WAITING_CARD_UNSEEN when some seat can't see the waiting card's face (seenBy, every seat).
"its {attribute} is the waiting card's {attribute}"
export const WAITING_CARD_UNSEEN = "The card the action waits on is one not every player can see, so no line may read it.";
// game-numbers.ts — effect, needsPlayer, needsActing, needsPayment: through transfer to actingPlayer(state)
'they pay the {gamenumber} to the player acting'
// support.ts — sameValue is exported, unchanged
```

- "The waiting card" is the card of the newest action waiting (`waitingOf(state).subject.card`), at whatever depth: each answer reads the action it answers.
- **`testing.ts`:**

```ts
/**
 * PLANS_GAME where a player told of a sale may show a plan of the sold job's name lying face down, paying the fee to the player whose action
 * they answer; and a player may announce a job of their stash, told to the others as a sale is.
 */
export const SHOW_GAME = PLANS_GAME
  .replace('  Players pay with coins.', '  Players pay with coins.\n  The game has a fee of 2.')
  .replace('  A player may take note.', ['  A player may show a card in their plans.', '    Only if it is face down.',
    "    Only if its name is the waiting card's name.", '    Then:', '      Turn it face up.', '      They pay the fee to the player acting.',
    '  A player may take note.'].join('\n'))
  .replace('  A player may stop.', ['  A player may announce a card in their stash.', '    Then:', '      They are the seller.',
    '      Each player has the notice, in turn from the left of the seller.', '        Only if they have a card in their plans that is veiled.',
    '      No player is the seller.', '  A player may stop.'].join('\n'));
```

- [ ] **Step 1: Write the failing tests.**
  - **Compiled** (`action-window.test.ts`, `describe('the action being answered')`):
    - `SHOW_GAME` compiles with `[]`; each `.replace` finds its text.
    - Under working's `A player may stop.`, `    Only if its name is the waiting card's name.` and, under its `Then:`, `      They pay the fee to the player acting.` each give 7-1's `ACTING_ELSEWHERE` with their text.
  - **Played.** Task 3's auction table on `SHOW_GAME` with every stash empty, `plans-p2` holding a Vase and a Statue, each lying face down (p2 alone is told):
    - p0 auctions the Vase; p1 bids on it; p2 is asked. p2 shows the Vase: it lies face up, p2 has 7 coins and p1 8 (the player acting is the bidder). p2 takes note.
    - The same with p1 and p2 passing the bid: p2 shows the Vase, and p0 (the auctioneer) has 14 coins.
    - p2 showing the Statue is refused with `its name is the waiting card's name`.
    - **Review Focus:** with a Statue in `stash-p0`, p0 announces it; p2 is asked; p2 showing the Statue is refused with `WAITING_CARD_UNSEEN`, and p2's view and the reason name no card of `stash-p0`.
  - **The phrases on a hand-made window** (`library/compare-phrases.test.ts`, `library/game-numbers.test.ts`), a 3-player `SHOW_GAME` state whose newest action waiting has `by: 'p1'` and `subject.card` a Vase in the scrap:
    - about a Vase, `its name is the waiting card's name` holds; about a Statue it fails; with `subject.card` null it fails;
    - with the waiting Vase in `stash-p0` it throws `WAITING_CARD_UNSEEN`;
    - `they pay the fee to the player acting` about p2 gives p2 7 and p1 11; on a state with no action waiting it throws `No action is waiting for the players to answer it.`
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/action-window.test.ts src/engine/core/lang/library/compare-phrases.test.ts src/engine/core/lang/library/game-numbers.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. `worked-view.test.ts`'s phrase-set test passes unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/support.ts src/engine/core/lang/library/compare-phrases.ts src/engine/core/lang/library/game-numbers.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/action-window.test.ts src/engine/core/lang/library/compare-phrases.test.ts \
  src/engine/core/lang/library/game-numbers.test.ts
git commit -F - <<'EOF'
feat(lang): an answer may compare a card with the card of the action it answers, never one not every player can see, and pay a number of the game to the player acting

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 6: What a player owes

Before starting: re-check `transfer`, `payCounter`, `holderOf`, `isOut`, `thePick`, `CHOICE_LINE` and `readChoiceLine` (a choice's effect is read as "… to that player"), `REGISTRARS`, `seatExtras`, `SeatExtras`, `readSeatExtras`, `OWES_KEY` and Rent Day's debt phrases (`they owe the bank`, `{player} owes {player}`, `{player} owes the bank`), `CREW_GAME`.

**Files:**
- Create: `src/engine/core/lang/library/bill-phrases.ts`, `src/engine/core/lang/library/bill-phrases.test.ts`.
- Modify: `src/engine/core/lang/board-state.ts` (bills), `library/index.ts` (`registerBillPhrases` after `registerGameNumberPhrases`), `board-view.ts` (`SeatExtras.bills`, `readSeatExtras`), `testing.ts` (`TAB_GAME`).
- Test: `library/bill-phrases.test.ts` (new), `board-view.test.ts` (appended).

**Interfaces:**
- Consumes: the names above.
- Produces (for Tasks 7 and 9 and plans 10-2, 10-3):

```ts
// board-state.ts
/** What each seat owes, in the order they came to owe it: `{ [seat]: Bill[] }`. A seat that owes nothing has no entry; the key goes with the last. */
export const BILLS_KEY = 'lang:bills';
/** An amount a seat owes, and whom to: a seat, or the bank. */
export type Bill = { amount: number; to: PlayerId | 'bank' };
export function billsOf(state: GameState, seat: PlayerId): Bill[];
export function owedBy(state: GameState, seat: PlayerId): number;                 // their total; 0 with none
export function addBill(state: GameState, seat: PlayerId, bill: Bill): GameState;  // behind their others; a bill of 0 is not kept
export function clearBills(state: GameState, seat: PlayerId): GameState;
// bill-phrases.ts
'they owe {int}'                              // effect, needsPlayer, needsPayment: a bill to the bank
'they owe {int} to {holder}'                  // effect, needsPlayer, needsPayment: to holderOf(flag) as it is now
'they owe the {gamenumber} to that player'    // effect, needsPlayer, needsPick, needsPayment: read in a choice line
'they pay up to what they owe'                // effect, needsPlayer, needsPayment
'they owe something'                          // condition, needsPlayer
'they owe nothing'                            // condition, needsPlayer
'{player} owes {int}'                         // given: a bill to the bank; expect: their total
'{player} owes {int} to {player}'             // given
'{player} owes nothing'                       // expect
export function registerBillPhrases(lib: PhraseLibrary): PhraseLibrary;
// board-view.ts — SeatExtras gains, left out when no seat owes; the same for every seat looking:
bills?: { [seat: string]: Bill[] };
```

- **`they pay up to what they owe`** pays each of their bills in order: the lesser of its amount and what they have left, never below 0, through `transfer`, to its seat, or to the bank when it is the bank's or its seat has gone out. Then their bills are cleared: what was not paid goes unpaid. It never writes `OWES_KEY`.
- **Expect messages:** `Expected ${seat} to owe ${n}, but they owe ${have}.` and `Expected ${seat} to owe nothing, but they owe ${have}.`
- **`testing.ts`:**

```ts
/**
 * CREW_GAME where a player may take the blame for a job, owing 4 to the claimant and 1 to the bank; run a tab, owing the fee to a player of
 * their choice who has a Vase in their workshop; and square up, paying what they owe in the order they came to owe it, as far as their
 * coins go.
 */
export const TAB_GAME = CREW_GAME
  .replace('  Players pay with coins.', ['  Players pay with coins.', '  Players can be the claimant.', '  The game has a fee of 2.'].join('\n'))
  .replace('  A player may stop.', ['  A player may take the blame.', '    Then:', '      They owe 4 to the claimant.', '      They owe 1.',
    '  A player may run a tab.', '    Then:',
    '      They owe the fee to another player of their choice who has a card in their workshop whose name is Vase.',
    '  A player may square up.', '    Then:', '      They pay up to what they owe.', '  A player may stop.'].join('\n'));
```

- [ ] **Step 1: Write the failing tests** in `bill-phrases.test.ts`.
  - **Compiled.** `TAB_GAME` compiles with `[]`; each `.replace` finds its text. (guard) Rent Day compiles with `[]` and keeps its 108 examples.
  - **Owing in order.** A 3-player `TAB_GAME` engine, p0's turn in working, p2 the claimant, `workshop-p1` holding a Vase:
    - p0 takes the blame: `billsOf(state, 'p0')` is `[{ amount: 4, to: 'p2' }, { amount: 1, to: 'bank' }]`; p0 still has 9 coins;
    - p0 runs a tab (p1 is filled in): a third bill `{ amount: 2, to: 'p1' }`; `owedBy` is 7;
    - p0 squares up: p0 has 2, p2 13, p1 11; `BILLS_KEY` is absent.
  - **Review Focus:**
    - At 5 coins, p0 squares up after the blame and the tab: p2 gets 4, the bank 1, p1 nothing; p0 has 0 and owes nothing.
    - At 0 coins: nothing moves, and the bills are cleared.
    - With p2 marked out after the blame: the 4 goes to the bank; p2 keeps 9.
    - With no claimant, the blame throws `No player is the claimant.` and the state is unchanged.
    - After any of these, `state.data[OWES_KEY]` is absent and no seat's coins are below 0.
  - **The conditions** (`runPhrase`): `they owe something` holds about p0 after the blame and not about p1; `they owe nothing` is its negation.
  - **The example words** (`runExamples` on `TAB_GAME` with these appended):

```text
Example: what is owed is paid in the order it was owed, as far as the coins go, and the rest goes unpaid
  Given 3 players
  And p2 is the claimant
  And p0 has 5 coins
  And p0 owes 2 to p1
  When p0 takes the blame
  Then p0 owes 7
  When p0 squares up
  Then p0 owes nothing
  And p0 has 0 coins
  And p1 has 11 coins
  And p2 has 12 coins
```

    - It passes. With `Then p0 owes 6` in place of `Then p0 owes 7`, it fails with `Expected p0 to owe 6, but they owe 7.`
  - **What each seat is told** (`board-view.test.ts`, `describe('what each seat is told of what players owe')`): after the blame, every seat's `bills` is `{ p0: [{ amount: 4, to: 'p2' }, { amount: 1, to: 'bank' }] }`; before it and after squaring up, `bills` is undefined; `readSeatExtras` gives it back, and returns null for `bills: { p0: [{ amount: '4', to: 'p2' }] }`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/bill-phrases.test.ts src/engine/core/lang/board-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `SeatExtras`.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`. No Rent Day or Startup line is now `ambiguous`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/bill-phrases.ts src/engine/core/lang/library/bill-phrases.test.ts src/engine/core/lang/board-state.ts \
  src/engine/core/lang/library/index.ts src/engine/core/lang/board-view.ts src/engine/core/lang/testing.ts src/engine/core/lang/board-view.test.ts
git commit -F - <<'EOF'
feat(lang): what a player owes, kept in the order they came to owe it, each payee fixed as it is owed, and paid as far as they can

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 7: Values from a counter and from what is owed

Before starting: re-check `player-value-phrases.ts` as plans 5-1, 7-1 and 8-1 left it (value lines read in order, `goes up/down by` changing the value so far); `playerValueOf`, `counterOf`, `gameNumber`, `CounterSpec.visibility`; the walk of what a clause reads; 4-3's `shownPlayerValues`; Task 6's `owedBy` and `TAB_GAME`; Task 3's `SALE_GAME`.

**Files:**
- Modify: `src/engine/core/lang/library/player-value-phrases.ts` (two values, two conditions), `compile.ts` (the walk), `testing.ts` (`LEEWAY_GAME`).
- Test: `library/player-value-phrases.test.ts`, `action-window.test.ts` (appended).

**Interfaces:**
- Consumes: the names above.
- Produces (for Task 9 and plan 10-2):

```ts
// player-value-phrases.ts
"a player's {playervalue} is their {counter}"           // value, needsPlayer
"a player's {playervalue} goes down by what they owe"   // value, needsPlayer: so far − owedBy; no floor
'their {playervalue} is less than {int}'                // condition, needsPlayer
'their {playervalue} is at least the {gamenumber}'      // condition, needsPlayer
// compile.ts — the walk reports `their <counter>` (WINDOW_READS_HIDDEN) for a counter whose visibility is not 'public' read through the first line
```

- `shownPlayerValues` shows only total lines, so a value with these lines stays unshown (fail closed). Task 6's `bills` is how a page shows what is owed.
- **`testing.ts`:**

```ts
/** TAB_GAME where a player's leeway is their coins less what they owe: they may splurge the fee only with that much leeway, and fret below 0. */
export const LEEWAY_GAME = [
  TAB_GAME.replace('  A player may stop.', ['  A player may splurge.', '    Only if their leeway is at least the fee.', '    Then:',
    '      They pay the fee.', '  A player may fret.', '    Only if their leeway is less than 0.', '    Then:', '      They are the claimant.',
    '  A player may stop.'].join('\n')),
  '', 'Leeway:', "  A player's leeway is their coins.", "  A player's leeway goes down by what they owe.",
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**
  - **Values and comparisons** (`library/player-value-phrases.test.ts`, `describe('values from a counter and from what is owed')`). A 3-player `LEEWAY_GAME` engine, p0's turn in working, p2 the claimant:
    - `LEEWAY_GAME` compiles with `[]`; `runtime.playerValue(state, 'p0', 'leeway')` is 9;
    - after the blame, 4; at 5 coins after the blame and a tab owed to p1, −2;
    - with leeway 4 p0 may splurge and may not fret (`their leeway is less than 0`); with leeway −2 the reverse (`their leeway is at least the fee`);
    - `Then p0's leeway is 4` passes as an example's line after `When p0 takes the blame`.
  - **What an offer may read** (`action-window.test.ts`, appended to `describe('what an offer may read')`). `SALE_GAME` with `Leeway:` appended and its bidding `Only if` line `        Only if their leeway is at least the card's worth.`:
    - it compiles with `[]`;
    - **Review Focus:** with `  Each player has 0 gems that only they can see.` added under `  Each player has 9 coins that everyone can see.` and the leeway's first line `  A player's leeway is their gems.`, the auction's ask line gets `WINDOW_READS_HIDDEN('their gems')`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/player-value-phrases.test.ts src/engine/core/lang/action-window.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. 4-3's player-value and gauge tests pass unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/player-value-phrases.ts src/engine/core/lang/compile.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/library/player-value-phrases.test.ts src/engine/core/lang/action-window.test.ts
git commit -F - <<'EOF'
feat(lang): values about a player from a counter everyone sees and from what they owe, compared with a whole number or a number of the game

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 8: A flag that lasts until its card moves

Before starting: re-check `ThingFact`, `acceptFacts` ("There are two facts called …"), `cards can be {name}` and its `isFlagOn`, `changeCard`, `faceKeyOf`; every function in `src/engine/core/lang` (tests left out) that writes a card's `zoneId` (grep `zoneId:` and `zoneId =`), at least `relocate`, `toBottom`, `putOn` and 8-1's move with everything on it; report any other. Re-check 9-1's turning and `renameCards`.

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`ThingFact.untilMoved`), `library/fact-phrases.ts` (a declaration), `card-facts.ts` (`leftBehind`), `zones.ts` (`relocate`, `toBottom`), `attach.ts` and every other zone writer found, `testing.ts` (`NOTED_GAME`).
- Test: `card-facts.test.ts`, `zones.test.ts`, `compile.test.ts` (appended).

**Interfaces:**
- Consumes: the names above.
- Produces (for Task 9 and plan 10-2):

```ts
// types.ts — ThingFact gains, left out otherwise:
untilMoved?: true;   // a card flag a card loses whenever it moves to another zone
// fact-phrases.ts — declaration
'a card can be {name} until it moves'    // [{ name, on: 'card', kind: 'flag', untilMoved: true }]
// card-facts.ts
/** The card, moving to `toZoneId`: without each flag that lasts until it moves, its face key rebuilt, when the zone is another; else as it is. */
export function leftBehind(card: CardState, toZoneId: string, game: CompiledGame): CardState;
// every zone writer passes each card it moves through leftBehind
```

- **`testing.ts`:**

```ts
/** CREW_GAME where a job in a workshop may be noted, which lasts until it moves. */
export const NOTED_GAME = CREW_GAME
  .replace('  Cards can be tired.', '  Cards can be tired.\n  A card can be noted until it moves.')
  .replace('  A player may stop.', ['  A player may note a card in their workshop.', '    Then:', '      It is noted.', '  A player may stop.'].join('\n'));
```

- [ ] **Step 1: Write the failing tests.**
  - **Declared** (`compile.test.ts`, `describe('a flag that lasts until its card moves')`):
    - `NOTED_GAME` compiles with `[]`; `game.facts` holds `{ name: 'noted', on: 'card', kind: 'flag', untilMoved: true }`;
    - `  Cards can be noted.` added too gives `There are two facts called “noted”.`;
    - (guard) no fact of `compiled(CREW_GAME)` has an `untilMoved` key.
  - **Moves** (`zones.test.ts`), a 2-player `NOTED_GAME` engine, `workshop-p0` holding a Vase and a Statue, p0 noting the Vase:
    - the Vase is noted and its face key shows it (`parseTextFaceKey`);
    - p0 finishes it (to the scrap): it is not noted, and its face key no longer shows it;
    - **Review Focus**, each from a noted Vase: `toBottom` to the pile, `putOn` onto the Statue in `crew-p0`, and the move with everything on it (a Potter put on it, moved to `workshop-p1`) each drop it from every card moved; `relocate` to `workshop-p0` itself keeps it; `renameCards` of it keeps it.
  - **Turning** (`card-facts.test.ts`): on `VEIL_GAME` with the same declaration, a noted Vase turned face down and face up again keeps it.
  - **`leftBehind`** returns the very card when the game has no such flag or the zone is the same.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/compile.test.ts src/engine/core/lang/zones.test.ts src/engine/core/lang/card-facts.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `ThingFact`.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. No line is now `ambiguous` with `cards can be {name}`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/library/fact-phrases.ts src/engine/core/lang/card-facts.ts \
  src/engine/core/lang/zones.ts src/engine/core/lang/attach.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/compile.test.ts src/engine/core/lang/zones.test.ts src/engine/core/lang/card-facts.test.ts
git commit -F - <<'EOF'
feat(lang): a card flag that lasts until its card moves to another zone, on every route a card can take

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

Add any other zone writer found to the pathspec.

---

### Task 9: Levels played through

Before starting: re-check Tasks 1–8's names; 5-1's rules about a player under `In every phase:`; 7-1's `MAKER_GAME`, its `stake` helper and `Move it to its maker's purse.`; 8-1's bidding lines; 9-1's turning and Givens.

**Files:**
- Modify: `src/engine/core/lang/testing.ts` (`CHAIN_GAME`).
- Test: `src/engine/core/lang/examples.test.ts` (append `describe('levels played through')`), `src/engine/core/lang/board-view.test.ts` (appended).

**Interfaces:**
- Consumes: every piece of Tasks 1–8.
- Produces: `CHAIN_GAME`, the pattern plan 10-2 follows (spec items 1–3 in general words: owing → broke → stakes back → selling one job at a time, each first to a bid → after each sale an offer from the seller's left → a reveal that may owe more, which may make another player broke inside the first → what is owed paid in order).

```ts
/**
 * MAKER_GAME where players keep plans that may lie face down, each relying on a job of its name in its owner's workshop or a tied player's.
 * A player who takes the blame owes 4 to the claimant (else the bank) and 1 to the bank, and is broke when their leeway falls below 0. A broke
 * player's stakes go back to their makers, and they sell off their jobs one at a time: each to the first other player, from their left, whose
 * leeway covers its worth, else to the bank for its worth. After each sale the seller, and each player tied to them, who no longer has a job
 * of that name within reach and has a plan lying face down, is told in turn from the seller's left, the seller last. They may show a plan of
 * the sold job's name, paying the fee to the buyer (nothing after the bank), which is then excused until it moves and, if dented, owes 5.
 * Once a broke player's leeway is 0 or more, or their workshop is empty, they pay up to what they owe.
 */
const TOLD = (phase: string) => [`      Each player has the ${phase}, in turn from the left of the seller.`, '        Only if one of:',
  '          They are the seller.', '          Another player tied to them by a card in their holdings is the seller.',
  "        Only if they have no card in their workshop whose name is the card's name.",
  "        Only if no other player tied to them by a card in their holdings has a card in their workshop whose name is the card's name.",
  '        Only if they have a card in their plans that is veiled.', '      No player is the seller.'];
const PAID_UP = ['    They pay up to what they owe.', '    They are not broke.', '    They are not selling.', '    Go back to the interrupted turn.'];
export const CHAIN_GAME = [
  MAKER_GAME
    .replace('  Players pay with coins.', ['  Players pay with coins.', '  Players can be broke.', '  Players can be selling.',
      '  Players can be the seller.', '  Players can be the claimant.', '  The game has a fee of 2.'].join('\n'))
    .replace('  Cards can be tired.', ['  Cards can be tired.', '  Cards can be offered.', '  Cards can have dents.',
      '  A card can be excused until it moves.'].join('\n'))
    .replace('  Each player has an idle row that everyone can see.', ['  Each player has an idle row that everyone can see.',
      '  Each player has a plans row that everyone can see, where cards may lie face down.'].join('\n'))
    .replace('  A player may stop.', ['  A player may plan a card in their stash.', '    Then:', '      Move it to their plans.',
      '      Turn it face down.', '  A player may put away a card in their plans.', '    Then:', '      Move it to their stash.',
      '  A player may take the blame.', '    Then:', '      If some player is the claimant, they owe 4 to the claimant.',
      '      If no player is the claimant, they owe 4.', '      They owe 1.', '      If their leeway is less than 0, they are broke.',
      '  A player may stop.'].join('\n'))
    .replace('Phase: working', ['In every phase:', '  When a player owes something:', '    Only if they are not broke.',
      '    They pay up to what they owe.', '  When a player is broke:', '    Only if they are not selling.', '    They are selling.',
      "    For each card in their holdings, move it to its maker's purse.", '    The selling phase starts with them.', '',
      'Phase: working'].join('\n'))
    .replace('\nEnd:', ['', 'Phase: selling', '  Players take turns.', '  A player may sell off a card in their workshop.', '    Then:',
      '      They are the seller.', '      It is offered.', '      Each other player has the bidding, in turn from their left.',
      "        Only if their leeway is at least the card's worth.", '      It is not offered.', '      They get its worth.',
      '      Move it to the scrap.', ...TOLD('free notice'),
      '  When their leeway is at least 0:', ...PAID_UP, '  When their workshop is empty:', ...PAID_UP, '',
      'Phase: bidding', '  Players take turns.', "  A player may bid on a card in another player's workshop.", '    Only if it is offered.',
      '    Then:', '      It is not offered.', '      They pay its worth to its owner.', '      Move it to their workshop, with everything on it.',
      ...TOLD('notice'), '      The action does not go ahead.', '  A player may pass the bid.', '    Then:', '      The bidding passes to the left.', '',
      'Phase: notice', '  Players take turns.', '  When this phase starts:', '    No player is the seller.',
      '  A player may show a card in their plans.', '    Only if it is face down.', "    Only if its name is the waiting card's name.",
      '    Only if their leeway is at least the fee.', '    Then:', '      Turn it face up.', '      They pay the fee to the player acting.',
      '      It is excused.', '      If its dents are more than 0, they owe 5.', '      If their leeway is less than 0, they are broke.',
      '  A player may keep quiet.', '    Then:', '      The notice passes to the left.', '',
      'Phase: free notice', '  Players take turns.', '  When this phase starts:', '    No player is the seller.',
      '  A player may reveal a card in their plans.', '    Only if it is face down.', "    Only if its name is the waiting card's name.",
      '    Then:', '      Turn it face up.', '      It is excused.', '      If its dents are more than 0, they owe 5.',
      '      If their leeway is less than 0, they are broke.', '  A player may stay quiet.', '    Then:', '      The free notice passes to the left.',
      '', 'End:'].join('\n')),
  '', 'Leeway:', "  A player's leeway is their coins.", "  A player's leeway goes down by what they owe.", '',
  'Veiled:', '  Only if it is face down.',
].join('\n');
```

- If a line of `CHAIN_GAME` reads differently at HEAD (an earlier plan worded the same rule otherwise), use HEAD's wording for the same rule and say which in the report.

- [ ] **Step 1: Write the tests.**
  - **Compiled.** `CHAIN_GAME` compiles with `[]`, with no "Nothing leads to …" warning; each `.replace` finds its text.
  - **The examples.** `runExamples` on `CHAIN_GAME` with these appended passes, each example on its own. Every number is a fixture number: 9 coins each unless given, a Vase worth 3 and a Statue worth 4, a fee of 2.

```text
Example: what a player owes and can cover is paid at once, in the order owed
  Given 3 players
  And p2 is the claimant
  When p0 takes the blame
  Then p0 has 4 coins
  And p2 has 13 coins
  And p0 owes nothing
  And p0 is not broke

Example: a player who can't cover what they owe is broke: their stakes go back to their makers, and they sell one job at a time until they can, keeping the rest
  Given 3 players
  And p2 is the claimant
  And p0 has 2 coins
  And p0's holdings has a Stake whose maker is p1
  And p0's workshop has a Statue and a Vase
  When p0 takes the blame
  Then p0 is broke
  And p0 owes 5
  And p1's purse has a Stake whose maker is p1
  And p0's holdings is empty
  And the phase is selling
  And it is p0's turn
  When p0 sells off the Statue
  Then the phase is bidding
  And it is p1's turn
  When p1 bids on the Statue
  Then p1's workshop has a Statue
  And p1 has 5 coins
  And the phase is working
  And it is p0's turn
  And p0 has 1 coin
  And p2 has 13 coins
  And p0 owes nothing
  And p0 is not broke
  And p0's workshop has a Vase

Example: with nothing left to sell, what a broke player has goes to the first they owe, and the rest goes unpaid
  Given 3 players
  And p2 is the claimant
  And p0 has 2 coins
  When p0 takes the blame
  Then the phase is working
  And it is p0's turn
  And p0 has 0 coins
  And p2 has 11 coins
  And p0 owes nothing
  And p0 is not broke

Example: after a sale to the bank, a player tied to the seller who lost the job's name may reveal a plan of it for nothing, and it is excused until it moves
  Given 3 players
  And p0 has 2 coins
  And p1 has 2 coins
  And p2 has 2 coins
  And p0's workshop has a Vase
  And p1's holdings has a Stake whose maker is p0
  And p1's plans has a Vase
  And the Vase in p1's plans is face down
  And p2's plans has a Statue
  And the Statue in p2's plans is face down
  When p0 takes the blame
  And p0 sells off the Vase
  Then the phase is free notice
  And it is p1's turn
  When p1 reveals the Vase
  Then the Vase in p1's plans is face up
  And the Vase in p1's plans is excused
  And p1 has 2 coins
  When p1 stays quiet
  Then the phase is working
  And it is p0's turn
  And p0 has 0 coins
  And p0 owes nothing
  When p0 stops
  And p1 puts away the Vase
  Then the Vase in p1's stash is not excused

Example: a revealed plan with a dent makes its owner owe 5 more; one who can't cover it is broke and sells inside the first sale, which goes on once they are done; a broke player is not asked to bid though their coins would cover it
  Given 3 players
  And p2 is the claimant
  And p0 has 2 coins
  And p2 has 4 coins
  And p0's workshop has a Statue
  And p2's workshop has a Vase
  And p2's holdings has a Stake whose maker is p0
  And p2's plans has a Statue
  And the Statue in p2's plans has 1 dent
  And the Statue in p2's plans is face down
  When p0 takes the blame
  And p0 sells off the Statue
  And p1 bids on the Statue
  Then the phase is notice
  And it is p2's turn
  When p2 shows the Statue
  Then the Statue in p2's plans is face up
  And the Statue in p2's plans is excused
  And p1 has 7 coins
  And p2 owes 5
  And p2 is broke
  And p0's purse has a Stake whose maker is p0
  And the phase is selling
  And it is p2's turn
  When p2 sells off the Vase
  Then the phase is bidding
  And it is p1's turn
  When p1 passes the bid
  Then the scrap has a Vase
  And p2 has 0 coins
  And p2 owes nothing
  And p2 is not broke
  And the phase is notice
  And it is p2's turn
  When p2 keeps quiet
  Then the phase is working
  And it is p0's turn
  And p0 has 1 coin
  And p1 has 7 coins
  And p2 has 4 coins
  And p0 owes nothing
  And p0 is not broke

Example: a second debt of a broke player joins the first, no stake going back again, and the first is paid first
  Given 3 players
  And p2 is the claimant
  And p0 has 2 coins
  And p0's workshop has a Statue and a Vase
  And p0's plans has a Statue
  And the Statue in p0's plans has 1 dent
  And the Statue in p0's plans is face down
  When p0 takes the blame
  And p0 sells off the Statue
  And p1 passes the bid
  And p2 passes the bid
  Then the phase is free notice
  And it is p0's turn
  When p0 reveals the Statue
  Then p0 owes 10
  And p0 has 6 coins
  When p0 stays quiet
  Then the phase is selling
  And it is p0's turn
  When p0 sells off the Vase
  And p1 bids on the Vase
  Then the phase is working
  And it is p0's turn
  And p0 has 0 coins
  And p1 has 6 coins
  And p2 has 13 coins
  And p0 owes nothing
  And p0 is not broke

Example: players are told in turn from the seller's left, the seller last
  Given 3 players
  And p0 has 2 coins
  And p1 has 2 coins
  And p2 has 2 coins
  And p0's workshop has a Vase
  And p0's plans has a Statue
  And the Statue in p0's plans is face down
  And p1's holdings has a Stake whose maker is p0
  And p1's plans has a Statue
  And the Statue in p1's plans is face down
  And p2's holdings has a Stake whose maker is p0
  And p2's plans has a Vase
  And the Vase in p2's plans is face down
  When p0 takes the blame
  And p0 sells off the Vase
  Then the phase is free notice
  And it is p1's turn
  When p1 stays quiet
  Then it is p2's turn
  When p2 reveals the Vase
  And p2 stays quiet
  Then it is p0's turn
  When p0 stays quiet
  Then the phase is working

Example: a player who keeps the job's name through a tied player is not told; the seller who lost it is told though no plan of theirs bears its name, and their plan stays face down
  Given 3 players
  And p0 has 2 coins
  And p1 has 2 coins
  And p2 has 2 coins
  And p0's workshop has a Vase
  And p0's plans has a Statue
  And the Statue in p0's plans is face down
  And p1's holdings has a Stake whose maker is p0 and a Stake whose maker is p2
  And p1's plans has a Statue
  And the Statue in p1's plans is face down
  And p2's workshop has a Vase
  When p0 takes the blame
  And p0 sells off the Vase
  Then the phase is free notice
  And it is p0's turn
  When p0 reveals the Statue
  Then it is rejected because "its name is the waiting card's name"
  When p0 stays quiet
  Then the phase is working
  And the Statue in p0's plans is face down

Example: a broke player's leeway, not their coins, decides what they may spend
  Given 3 players
  And p0 has 2 coins
  And p0's workshop has a Statue and a Vase
  And p0's plans has a Statue
  And the Statue in p0's plans is face down
  When p0 takes the blame
  And p0 sells off the Statue
  And p1 bids on the Statue
  Then the phase is notice
  And it is p0's turn
  When p0 shows the Statue
  Then it is rejected because "their leeway is at least the fee"
  When p0 keeps quiet
  Then the phase is working
  And p0 has 1 coin
  And p0's workshop has a Vase
  And the Statue in p0's plans is face down
```

  - **How the numbers come** (fixture numbers; the reviewer reads each against these):
    - The blame: 4 + 1 = 5 owed; at 2 coins the leeway is −3.
    - Example 2: the Statue sells to p1 for 4 (p0 6, p1 5); leeway 1, so p0 pays 4 to p2 and 1 to the bank: p0 1, p2 13. The Vase is kept.
    - Example 3: nothing to sell; p0's 2 go to p2 (11), the bank's 1 goes unpaid.
    - Example 4: no leeway reaches 3, so the bank pays 3 (p0 5); p1 is tied to p0 and has no Vase; p2 is not tied; p0 has no plan lying face down. p0 pays 5: 0 coins.
    - Example 5: p1 pays 4 (p0 6, p1 5); p2 is told (tied, no Statue); p2 pays the fee to p1 (p2 2, p1 7), owes 5, leeway −3; p2's stake goes back to p0. p0's leeway is 6 − 5 = 1 < 3, so only p1 is asked for the Vase; the bank pays 3 (p2 5); p2 pays 5 (0). Back at p0: leeway 1, so p0 pays 4 to p2 (4) and 1: p0 1.
    - Example 6: the bank pays 4 (p0 6); p0 is told last and alone; the dent owes 5 more (10). The Vase sells to p1 for 3 (p0 9, p1 6); the workshop is empty, so p0 pays 4 to p2 (13), 1, then 4 of 5: p0 0.
    - Example 7: the bank pays 3 (p0 5); p1, p2 and p0 lost the Vase; p0 pays 5: 0.
    - Example 8: p1 keeps the name through p2, who is not tied to p0. p0 is tied to p1 only, who has no Vase.
    - Example 9: p1 pays 4 (p0 6, leeway 1 < 2); p0 pays 5: 1 coin.
  - **The deepest level, as each seat sees it** (`board-view.test.ts`, `describe('levels played through, as each seat sees them')`). A 3-player `CHAIN_GAME` engine arranged as example 5's Givens (`relocate`, coins with `setCounter`, the claimant with `setPlayerFact`, the stake as 7-1's `stake` helper arranges one, the plan's dent with `changeCard` and `faceUp: false`), pressed up to p2 selling off the Vase:
    - the turn is `{ current: 'p1', phase: 'bidding' }`; only `NEST_KEY` holds the levels; `framesOf(state)` is, oldest first, a kept turn `{ phase: 'working', current: 'p0' }`, an action waiting by p0 (bidding), one by p1 (notice), a kept turn `{ phase: 'notice', current: 'p2' }`, and one by p2 (bidding);
    - `turnBeneath(state)` is `{ phase: 'working', current: 'p0' }`;
    - for every seat: `waiting` has `by: 'p2'` and `cards: ['Vase']`; `waitingUnder` has `by` `'p0'` then `'p1'`, each with `cards: ['Statue']`; `bills` is `{ p0: [{ amount: 4, to: 'p2' }, { amount: 1, to: 'bank' }], p2: [{ amount: 5, to: 'bank' }] }`; `board.interrupted` is true;
    - **Review Focus:** a fresh engine given `loadLog(engine.getLog())` equals the engine's state; `engine.undo()` gives the turn `{ current: 'p2', phase: 'selling' }` with four levels;
    - after p1 passes and p2 keeps quiet: none of `INTERRUPTED_KEY`, `WINDOW_KEY`, `NEST_KEY` or `BILLS_KEY` is in `data`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/examples.test.ts src/engine/core/lang/board-view.test.ts`. Expected: PASS if Tasks 1–8 and plans 5-1, 7-1, 8-1 and 9-1 hold as their Interfaces say. If an example fails for want of something other than this plan's pieces, stop and report which line: that is a missing piece of slice 10's flow, to be planned, not worked round. If one fails only for an expect's wording, use HEAD's wording for the same check and say which.
- [ ] **Step 3: Run** `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`.
- [ ] **Step 4: Commit**

```bash
git add src/engine/core/lang/testing.ts src/engine/core/lang/examples.test.ts src/engine/core/lang/board-view.test.ts
git commit -F - <<'EOF'
feat(lang): levels played through: owing, selling one job at a time, offers from the seller's left, and a second debt inside the first, paid in order

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 10: The README and the checks

**Files:**
- Modify: `README.md`: the "Interrupting a turn" bullet's "one turn at a time can be interrupted"; 8-1's ask paragraph where it says one ask per button or none in an answer (re-check its words at HEAD); a paragraph after the one plan 9-1 added (re-check its first words at HEAD).

- [ ] **Step 1: Write the README.**
  - **"Interrupting a turn":** "one turn at a time can be interrupted" becomes "a phase started while another is open waits on top of it, and each goes back in turn, last first; going back while players are answering an action above is refused".
  - **8-1's paragraph:** its limits go; say a button may ask more than once, and a button of an answering phase may ask, the new action waiting above the one it answers.
  - **The new paragraph,** in general words, with these examples:
    - **Levels.** Phases started and actions waiting nest, each with its own turn kept; the playtest shows the action being answered and those waiting beneath it.
    - **Every player, from a flag holder's left.** `Each player has the notice, in turn from the left of the seller.`, that player last.
    - **What an offer may read.** `Only if they have a card in their plans that is veiled.` when every line of `Veiled:` says only how a card lies; `Another player tied to them by a card in their holdings is the seller.`; `some player is the claimant`.
    - **The action being answered.** `Only if its name is the waiting card's name.`, refused at the answer when not every player sees that card; `They pay the fee to the player acting.`
    - **Owing.** `They owe 4 to the claimant.`, `They owe 1.`, `They owe the fee to another player of their choice who …`, `They pay up to what they owe.`, `they owe something`; examples say `Given p0 owes 6 to p1` and `Then p0 owes nothing`. Separate from a board game's money below 0.
    - **Values.** `A player's leeway is their coins.`, `A player's leeway goes down by what they owe.`, `their leeway is less than 0`, `their leeway is at least the fee`.
    - **A flag until it moves.** `A card can be excused until it moves.`
    - **Levels played through.** The pattern of Task 9.
- [ ] **Step 2: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 3: Run the checks.** Each must print nothing.

```bash
# Startup Simulator's words in shared code, slices 3 to 10, tests included
git diff "$BASE" -- src/engine src/pages src/utils | grep '^+[^+]' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share|tags?|leads?|leading|licen[cs]es?|tiers?|stall(s|ed|ing)?|sectors?|expertise|modes?|bandwidths?|bugs?|qa|online|offline|maint(enance)?|suppl(y|ies)|demands?|xp|pending|skills?|badges?|badged|ranks?|mentor(s|ed|ing)?|synerg(y|ies)|agile|graduat(e|es|ed|ing|ion)|training|trained|brainstorm(s|ed|ing)?|strateg(y|ies)|milestones?|seniors?|workaholics?|clean coders?|visionar(y|ies)|toxic|burnouts?|flight risks?|techcrunch|design sprints?|cease|desist|hype|utilit(y|ies)|buffs?|debuffs?|venture capital|bubbles?|patents?|trolls?|angels?|investors?|legacy|regulations?|audits?|open source|hackathons?|chip shortage|crunch|server crash|logjam|frenz(y|ies)|interns?|headhunt(s|ed|ing|ers?)?|course boom|whistleblowers?|trade show|events?|equit(y|ies)|founders?|consultants?|dividends?|veto(es|ed|ing)?|partners?(hips?)?|immunit(y|ies)|portfolios?|buybacks?|stocks?|poach(es|ed|ing|ers?)?|vest(s|ed|ing)?|ctos?|acqui(re|res|red|ring|sitions?)|fire sales?|hit pieces?|scandals?|integrat(e|es|ed|ing|ions?)|hosts?|host(ed|ing)|clients?|cris(is|es)|m&a|divest(s|ed|ing|ments?)?|raiders?|market sales?|counter-offers?|stealth|audit(ed|ing|ors?)?|fold(s|ed|ing)?|settle(s|d|ments?|ing)?|ghosts?|bluff(s|ed|ing)?|disclos(e|es|ed|ing|ures?)|shield(s|ed|ing)?|dependenc(y|ies)|legality|fraud(s|ulent)?|bount(y|ies)|secured|transient|bankrupt(cy|s)?|liquidat(e|es|ed|ing|ions?)|broken chains?|creditors?|insolven(t|cy)|come clean|seiz(e|es|ed|ing|ures?)|vulnerab(le|ility))\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# existing test lines removed or changed: only the ones Tasks 2 and 3 name (compare by eye)
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
# nothing outside the language
git diff --stat "$BASE" -- src/games src/pages
git diff --stat "$BASE" -- src/engine ':!src/engine/core/lang'
```

  - Also read the `+` lines of `src/engine` for "chain", "forgive", "seller" used of anything but the fixtures, and "Creditor".
- [ ] **Step 4: Run the games alone.**
  - `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
  - `bunx vitest run src/games/startup-simulator.test.ts` passes with BASE's example count.
- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -F - <<'EOF'
docs: the README describes levels inside levels, offers from a flag holder's left, what an offer may read, what a player owes, and flags that last until a card moves

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Left to 10-2 / 10-3

**Plan 10-2 (rules text and long runs; it may split as 7-2 and 8-2 did)** writes, with this plan's pieces and `CHAIN_GAME`'s pattern:
- **Declarations.** Player flags `bankrupt`, `liquidating`, `the seller`; card flags `A card can be requires legacy until it moves.` and `A card can be also requires legacy until it moves.`, read in `Requires missing:` and `Also requires missing:` as `Only if it is not requires legacy.`; a worked flag `Hidden:` / `  Only if it is face down.`
- **Values (R2).** `spare capital` (`is their capital`, `goes down by what they owe`) and `cover` (`is their capital`, `goes up by the total fire sale price of the cards in their operations`, `goes down by what they owe`).
- **Fold and Settle for any owner (R3).**
  - The Fold owes: `If some player is the whistleblower, they owe 4 to the whistleblower.`, `If no player is the whistleblower, they owe 4.`, `They owe 1.` (§7.C, §7.E: the whole $5 to the bank with no Whistleblower).
  - Settle owes `They owe 3.`, `If it is ghost only, they owe 3.` and its two License lines as `They owe the license to another player of their choice who …`, payees fixed as chosen. Its guard becomes `Only if their cover is at least the card's settlement.` (R2), its bounty `If some player is the whistleblower, …`.
  - Both end `If their spare capital is less than 0, they are bankrupt.`; an every-phase rule pays a player who owes something and is not bankrupt.
  - Whether the Audit's Fold and Settle stay in `audit` beside a `reckoning` phase for a failed Come Clean, or move there, is 10-2's call; every copy is pinned by a test against its source, as 9-2 pins its copies.
- **Bankruptcy (§7).** An every-phase rule `When a player is bankrupt:` / `Only if they are not liquidating.`: the seizure (`For each card in their portfolio, move it to its founder's equity.`), `They are liquidating.`, `The liquidation phase starts with them.`
- **Liquidation.** `liquidate a card in their operations` with `Only if its fire sale price is more than 0.` ($0 kept), Divest's lines (copy pinned), `They are the seller.`, the Market Sale ask with `Only if their spare capital is at least the card's sale price.` (R2) and the bandwidth lines, the Fire Sale lines, the free Come Clean ask. Two end rules as `CHAIN_GAME`'s: pay up to what they owe, not bankrupt, not liquidating, go back.
- **The Broken Chain (R1).**
  - After every sale of a Tag source, the card moved, ask `Each player has the come clean, in turn from the left of the seller.` with the Only if lines `CHAIN_GAME` shows. They read `its tag` against operations and portfolios, and Face-Down counts through `Hidden`.
  - The places: Divest's Fire Sale path, Liquidation, the Market Sale's buy (before `The action does not go ahead.`), and Acquisition (its consent's agree sets `They are the seller.`).
  - The paid phase after a Market Sale or Acquisition: `come clean with a card in their development`, `Only if it is face down.`, `Only if one of: Its requires is the waiting card's tag. Its also requires is the waiting card's tag.`, `Only if their spare capital is at least the license.`; then `Turn it face up.`, `They pay the license to the player acting.`, the two `If its … is the waiting card's tag, it is … legacy.` lines, `If it is illegal, it is caught.`, `If it is caught, the reckoning phase starts with them.`
  - The free phase after a Fire Sale is the same without the fee. Each has a stay-hidden button that passes on, and a start line clearing `the seller`.
- **The spec's examples,** each pinned with its rulebook numbers, and the whole valuation (§12 lines 1–8) scored line by line.
- **Rulings.** The table the spec's Proof 3 asks for: each ruling with a play effect, across slices, and the example that pins it; #24 and #25's items here.
- **Test helpers.** 7-2b's `turnOf` and `windowJudge` and 8-2a's `askOf` read the levels through `framesOf`, `turnBeneath` and `waitingOf`.
- **Long runs at 2 to 5 players.**
  - Tallies: bankruptcies, seizures, liquidation sales (Market and Fire), Come Cleans paid and free, failed Come Cleans, second debts, unpaid shortfalls, the deepest stack.
  - Invariants after every move:
    - no seat goes out;
    - a Settlement owed is always paid in full;
    - a bankrupt never spends below what they owe;
    - Legacy flags only on face-up cards in a development row;
    - no level key once a turn passes;
    - each move opens or closes at most the levels its press and rules account for.
  - The auto-player answers every new phase.

**Plan 10-3 (the page):**
- The action being answered and the ones beneath it (`waiting`, `waitingUnder`) in the deciding seat's strip; the switcher following `turn.current` through the levels, with `turnBeneath`'s player shown as whose turn it is.
- What each player owes from `SeatExtras.bills` on the tableau, with whom to.
- The Bankruptcy and Come Clean prompts; Legacy flags as badges; Settle's price beside its cover (9-3's G1).
- The browser check of the spec's Nested example, with the Hearts demo's no-regression check.

## Gaps

None that needs a protected file or contradicts a binding call. Checked:
- Every item of the spec's "What the language gains" is a task here:
  - item 1: Tasks 1–3, with Tasks 4–7 for what the nested offers read and spend;
  - item 2: Tasks 5 and 8;
  - item 3: Task 6's words, and Task 9's examples.
- The stack keeps today's four shapes in today's keys, so Rent Day's interrupts and every 7-1 to 9-3 state are byte-for-byte as before. `interruptTurn` and `resumeTurn` keep their behaviour and their test.

Recorded limits, none blocking slice 10:
- **No seat goes out at a Bankruptcy** (§7 Bankruptcy; Rust agrees). 4-1 P4 and 9-3's note assumed one would; neither change is needed. Task 2 still passes over an asked seat that goes out, for other games.
- **A kept turn whose seat went out comes back to that seat,** as today: Rent Day's going-out rules must stay as they are, and no Startup rule takes a seat out.
- **Flags are not scoped to a level.** `CHAIN_GAME` clears `the seller` as its offer opens, so a nested sale can set it again; a second seller while the first is set is `holderOf`'s RuleError, refused rather than wrong.
- **`interruptedTurn` reads only its slot.** Nested layouts are read through `frames.ts`; every lang reader is re-pointed (Task 1), and nothing outside the language reads the slots.
- **What is owed is shown through `bills`, not as a player value.** `shownPlayerValues` shows only total lines, so `spare capital` and `cover` stay unshown (fail closed).
- **Hidden counters** are reported only when read through Task 7's value line. A clause reading one through an older counter phrase is as before.
- **The waiting card is judged as the answer is pressed,** not when the rules are read: a RuleError if some seat can't see it.
- **R1's $0 Partner rate can't arise**: a Partner of the new owner keeps access and is never asked. No language.
