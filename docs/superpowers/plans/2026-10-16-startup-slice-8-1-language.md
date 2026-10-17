# Startup Simulator Slice 8-1 (Language) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The rules language gains every general piece slice 8 needs that plans 4-1 to 7-1 left out:
- value lines that step down for each of a count, and a share of another number rounded up or down;
- prices paid through a card and its owner or read from a target card, and a player's room compared with a card's number;
- a zone of a card's owner;
- cards on cards inside one zone (R2), the card a card is on read by a flag, and a card moved with everything on it;
- pairs from a table written in the rules text;
- asking players part-way through a button's lines, in turn or one owner, on public facts only (R4).

All of it is tested with fixtures in general words. Startup Simulator's text does not change.

**Architecture:**
- **This is plan 8-1.** Plan 8-2 writes the rules text and the long runs (it may split as 7-2 did); plan 8-3 the page. Nothing here touches `src/games/**` or `src/pages/**`.
- **Eight tasks.** The spec's "What the language gains" maps onto them like this:
  1. **Steps down and shares** (item 4: Scandal −$5 and −5 VP, Bug −$1, ×2 / ×1.5 rounded up, the Fire Sale's 50% rounded down).
  2. **Prices paid and compared** (item 4 and item 1's payments: the M&A Price to the seller, the bank's Fire Sale, the poach fee and its guard, bandwidth after Online products).
  3. **A zone of a card's owner** (item 1: a sale destroys the seller's locked token, R1).
  4. **Cards on cards in their own zone, and a card moved with everything on it** (item 1 and R2).
  5. **Pairs from a table** (item 5).
  6. **Asking players part-way through a button: the line and its refusals** (items 2 and 3, compiled; R4).
  7. **Asking players part-way through a button: played** (items 2 and 3, at runtime).
  8. **An example for each piece, the README and the checks** (item 6).
- **Where things live.**
  - Value lines: `card-subject-phrases.ts` and `card-value-phrases.ts` (card-only). Player values and their comparison: `player-value-phrases.ts`.
  - Payments: `board-phrases.ts` (through "its", beside 7-1's) and `card-pick-phrases.ts` (through the target card, beside 6-1's lower-of).
  - The owner's zone: `SeatRef` (`types.ts`), read in `refs.ts`, `support.ts`, `zones.ts`.
  - Cards on cards: `attach.ts` (`moveWithEverything`, the loop check), `attach-phrases.ts`, `declared-actions.ts` (`aboutCards`).
  - Pairs: a new `pairings.ts`, read by `compile.ts` in `Cards:`; the condition in `card-pick-phrases.ts`.
  - Asks: `action-window.ts` (7-1's file), read by `compile-phase.ts`, `compile.ts`, `compile-util.ts`, `declared-actions.ts`, `runtime.ts` and `library/turn-phrases.ts`.
  - No new `state.data` key, no new card `data` key, no `CardState` change, no new flow rule.
- **Builder calls this plan makes** (the spec leaves wordings to the builder):
  - **Steps down and shares are value lines,** like 6-1's.
    - `A card's sale price goes down by 5 for each scandal.` mirrors 6-1's `goes up by {int} for each`.
    - `A card's poach fee is 150% of its poach base, rounded up.` and `…, rounded down.` set the value from the other number, as `… is its …` does; a flagged `rounded up` form joins `FLAGGED_VALUES`.
    - A share is a percentage because cards hold whole numbers: the rulebook's ×2, ×1.5 and 50% are each one.
    - "The lowest multiplier applies" is the last line that applies, as for every value.
  - **Payments read the card the line is about and its owner:** `They pay its sale price to its owner.` (Acquisition, a Market Sale's buyer) and `They get its fire sale price.` (from the bank).
  - **A target card's price** is paid with `They pay the target card's poach fee.` and guarded with `they have at least the card's price plus the target card's poach fee in capital`: a Strategy card's printed price plus the fee, so a Corporate Raider's $2 is read from its card. The refund is Task 6's `The player acting gets the target card's fee paid.`
  - **Room for a card is a player value that goes down by a total,** compared with the card's number: `A player's blue room goes down by the total blue maint of the cards in their operations that are not offline.` and `Only if their blue room is at least the card's blue maint.`
  - **A zone of a card's owner:** `its owner's locked equity`. A line about a card that changes hands reaches the old owner's zone with it, as in `For each card on it that is vested, move the top card of its owner's locked equity to the box.` A card fact may no longer be called `owner`.
  - **Cards on cards in their own zone (R2).**
    - A zone marked `, where some cards are on cards` may hold a card on a card in the same zone.
    - `Every card on it in the same zone comes off it.` breaks such a pair in place.
    - A card can't be put on itself (refused at the press) or sit in a loop (refused by the check after every change).
  - **With everything on it.** `Move it to their operations, with everything on it.` moves the card. Every card on it, all the way down, goes to the zone of the same name of the player it goes to, still on its card.
    - It refuses a card still on it in its own zone, another player's card still on it, and a zone in the center, each a RuleError.
    - So R2's order (break the stack, return Consultants, move) is checked, not trusted, and "with everything on it" never carries a Client or a rival's Consultant.
  - **The card it is on, by a flag:** `the card it is on is (not) {cardflag}` (a Client's live link, an HR Manager's team). It stays outside the card-only set, like 5-1's `the card it is on is {cardclass}`.
  - **Pairs from a table:** `Cards can host cards by their tag:` and a two-column table under it. `Only if the target card can host the card.` reads it.
    - A value no card has in that column is refused.
    - Values compare in any capitals.
  - **Asking players part-way through a button's lines.** Three line forms, each a top-level line of a button's `Then:`:
    - `Each other player has the market sale, in turn from their left.`
    - `Its owner has the consent.` (the owner of the card the button picked)
    - `The target card's owner has the counter-offer.`
    - Who may be asked:
      - The candidates are every other seat still in, from the presser's left; or the one owner. The presser and seats that are out are never asked.
      - `Only if` lines under the line (`Only if one of:` too) are judged once, about each candidate, when the line is reached; the asked set is fixed then.
    - When it waits:
      - With nobody asked, the lines go on.
      - Otherwise the press waits as 7-1's window does: 7-1's `Waiting` under `lang:window`, with `resume`, the index of the next line.
    - How the asked players answer, in turn, in the named phase:
      - `The market sale passes to the left.` asks the next; after the last, the rest of the lines run.
      - `The action goes ahead.` (new) runs them at once.
      - `The action does not go ahead.` ends it with nothing more run.
      - Either way the turn goes back as it stood at the line.
    - **Why a `Then:` line, not an `In every phase:` line like the Veto's:**
      - it comes after payment (§16.D, the spec's call) and after the Veto (a vetoed Divest offers nothing);
      - it asks the players of one button only.
      - The Veto's window always closes before the lines that ask run, so two never wait at once.
    - **What it may read (R4).** Whether a window opens, and whom it asks, is seen by every seat. So its `Only if` lines read:
      - a zone's cards only where everyone sees them;
      - the size of any zone (a hidden zone is shown as face-down cards);
      - the press's card or target only from a zone everyone sees.
      - 7-1's window clause gets the same rule for sizes.
    - **Limits until slice 10:** one ask per button, and none in a button of an answering phase or a steps phase (nesting).
  - **Example vocabulary needs no new phrase.** `Then the phase is market sale`, `And it is p2's turn`, `When p2 bids on the Vase`, 7-1's `… is on … in …` and `… is on no card`, and `Then p0's red room is 1` all exist. Tasks 1–8 prove each in general words.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-8-selling-poaching-design.md` is binding, and its "Builder-check rulings" R1–R4 win over its body.
- R1: Vest and CTO are a mark on the employee plus a parked "locked equity" card. A sale destroys the seller's token on an attached employee; a Fire Sale keeps it.
- R2: an Integration is attachment inside operations. Every rule that takes a product off its owner's Board breaks the stack, returns Consultants, then moves the product with everything on it. One Client per Host.
- R3: no voluntary Offline at game end (8-2's example; no language).
- R4: the Vest / Cease & Desist window opens on an Equity token in supply or a non-empty Strategy Hand, public facts only.

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding as amended by slice 7 R1 and slice 8 R1–R2. Its anti-goals bind especially: Startup words in shared code; hidden information leaking; a game that can't end.

The evidence is `builder-check-startup-8.md` in the session scratchpad (Q1–Q4). Slices 9–10's specs and builder checks say what this plan must leave in place:
- slice 9 R3: no prompt names a Face-Down card, and rivals see the `cto`/`vest` marks;
- slice 10: the Market Sale and Fire Sale are reused by Liquidation (nested, a bankrupt asked only with spare cash), and Come Clean offers go in turn from the seller's left at a sale.

Plans 4-1, 5-1, 6-1 and 7-1 (their Interfaces blocks and Global Constraints amendments) are inputs, as are 4-2 to 7-3 where named.

## Global Constraints

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.**
  - No new `state.data` key: an ask waits under 7-1's `lang:window`, its `Waiting` gaining `resume`.
  - No new key in a card's `data`: a card on a card in its own zone uses `lang:on`.
  - New fields are optional and left out, never set to `undefined`: `CompiledGame.pairings`, `Waiting.resume`, `PhraseOpts.countsOnly`. `Vocab.pairings` is `[]` when the game has none.
  - A game without the new lines builds exactly the same `FlowDef` and compiled shape as before.
- **No Startup Simulator words in shared code** (code, comments, test names and fixture strings), in every form:
  - plan 7-1's list: 6-1's list (1b-2's, slices 3–6's words) and slice 7's;
  - **slice 8's:** poach, vest, cto, acquisition, fire sale, hit piece, scandal, integration, host, client, headhunter, crisis; and, from the spec's "M&A and the like", m&a, divest, raider, market sale, counter-offer.
  - Ordinary words to avoid:
    - "a mistake in the code", not "a bug";
    - "waiting", not "pending";
    - "goes to", not "leads";
    - "moment" or "happening", not "event";
    - "purse", never "supply";
    - "answer" or "stop", never "veto";
    - "tied", never "partner";
    - "the card it is on" or "holder", never "host";
    - "the card on it", never "client";
    - "take" or "buy", never "acquire";
    - "tired", never "offline", in fixtures and comments.
  - **`CREW_GAME`'s hands have a `skill` column.** New fixture lines read `wage`, `pay`, `worth`, `red need` or a worked value by its own name.
  - The banned words may appear in `src/games/startup-simulator.*`, `README.md` and `docs/`.
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged; Rent Day keeps its 108 examples. Startup Simulator compiles with `[]` and its examples pass in the same number as at BASE.
- **Every number comes from the rulebook.** This plan's numbers are fixture numbers. Plan 8-2 cites the rulebook for each of Startup's: $6/$12/$20, +$5, −$5, −$1, the $0 floor, 50% rounded down, ×2/×1.5/×1 with ×1.5 rounded up, +$2/+$4, $3, $5, +$2, +5 VP, −5 VP.
- **Hidden information (3-2's to 7-1's lessons).**
  - What a seat's view shows is decided by the compiled rules alone, and never reveals a hidden card or zone.
  - **Whether an ask opens, and whom it asks, every seat sees (R4).** Its `Only if` lines may read:
    - a zone's cards only where everyone sees them;
    - any zone's size;
    - the press's card or target card only from a zone everyone sees;
    - all of it through every value they read.
  - The waiting press stays in `state.data`, which no seat receives, and the waiting view names cards only as each seat sees them (7-1 Task 9).
  - `worked-view.ts` counts every phrase of `registerCardSubjectPhrases` and `registerCardValuePhrases` as card-only. A task that adds a phrase there updates the phrase-set test in `worked-view.test.ts`: its list, and the count in its title. It also adds the phrase to `CARDS_ON_IT` if it reads the cards on a card.
    - Task 1 adds five such phrases. None reads the cards on a card, so `CARDS_ON_IT` stays as it is.
    - Task 4's `the card it is on is …` goes in `attach-phrases.ts`, outside the card-only set (fail closed): in slice 9 the card under a visible card may be face down.
  - Every phrase that reads a card carries its needs flags (`needsCard`, `needsCards`, `needsOnto`, `needsMove`), so `readsPressCard` and `reportHiddenCardReads` judge it.
- **Every new phrase that changes a card's count or flag declares `writes`.** None here changes a card's count or flag: taking a card off a card changes `lang:on`, not a fact.
- **Refuse what strands play.** A game that can't end, or a press that silently does nothing, is an anti-goal.
  - **Task 6** refuses, when the rules are read, every ask that could leave an asked player unable to answer. Its phase may not be:
    - a phase where everyone acts at once, the game's first, or a steps phase;
    - one with a go-to, an After line or a cost;
    - one where no line passes the answer on or lets the action go ahead.
  - **Task 6** also refuses:
    - an ask outside a button's top-level `Then:` lines, a second ask in one button, or an ask in a button of an answering or steps phase;
    - an After line naming a button that asks.
  - **Task 4** refuses:
    - a card put on itself or in a loop;
    - a move "with everything on it" that would carry a card in its own zone or another player's card, or go to the center.
  - **Task 2**'s payments on a card with no owner or no such number throw a RuleError, so the press is refused; its conditions are false.
  - **Task 5** refuses a pairing table that names a value no card has.
- **Existing code and tests.**
  - New imported names go on new `import` lines in existing files.
  - Existing test lines change only where a task names them:
    - the phrase-set test's title and list in `worked-view.test.ts` (Task 1);
    - the pinned `VOCAB_TYPES` list in `refs.test.ts` (Task 5);
    - 7-1 Task 7's `Dusty:` line in `action-window.test.ts` (Task 6).
  - Tests may be appended and fixtures added to `testing.ts`.
  - If any other existing test fails, stop and report it instead of changing it.
  - **After widening a type, run `bun run typecheck` and read every narrowing on it.** At the time of writing:
    - `SeatRef` (Task 3): `describeZone` and `OWNER_WORDS` (`support.ts`), `resolveZoneIds` (`zones.ts`), `moveZoneId` (`declared-moves.ts`), `mentionsActor` (`compile-util.ts`), `mayHideFromPresser` (`compile-phase.ts`), 7-1's named-zone checks.
    - `CompiledGame` and `Vocab` (Task 5): `emptyVocab`, `vocabFrom` (`phrases.ts`), `vocabFor` (`testing.ts`).
    - `PhraseOpts` (Task 6): `RegisteredOpts`' defaults (`phrases.ts`).
    - `Waiting` (Task 7): `waitingOf`'s shape check, `waitingView` (`board-view.ts`).
    - Whatever plans 7-2a to 7-3 added.
- **Earlier plans come first.**
  - In execution order: 4-1 (built), 4-2, 4-3, 5-1, 5-2a, 5-3 Task 1, 5-2b, 5-3 Tasks 2–4, 6-1, 6-3 Task 1, 6-2a, 6-2b, 6-3 Tasks 2–5, 7-1, 7-2a, 7-2b, 7-3.
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
  - Each fixture `.replace` must find its text: assert it in the test that first uses the fixture.
- **Fixture words** (general, never Startup's): asking price, clearance, fee, rare, cheap, charms, cracks, room, red room, bribe, tip, set, lift, take, kit, perched, carry, carries, pair, auction, bidding, bid on, pass the bid, offered, claim, claimed, protest, protest with, let the claim go, keep, keeping, borrow, consent, agree, refuse the loan, dents.

## Review Focus

- **An ask that finds nobody, or only the presser or seats that are out; one on the presser's last move; one right after the Veto's window; one opened from an interrupt phase; one undone or replayed while it waits.**
  - Expected:
    - nobody asked: the lines go on at once;
    - after a last move the turn passes once the ask closes, whichever way it closes;
    - the Veto's window closes before the ask opens;
    - an interrupt's "go back" still reaches the turn it interrupted;
    - undo and the log give the same state.
  - Tests: Task 7.
- **A card moved with everything on it while a card in its own zone or another player's card is still on it, to the center, or two levels deep; a card put on itself; two cards put on each other.**
  - Expected: refused with the card named, three times; carried, still on their cards; refused at the press; refused after the press, the state kept.
  - Tests: Task 4.
- **What an ask may read: a hidden zone's cards, a hidden zone's size, the press's card from a hidden zone; and what a seat sees of a press whose card is still hidden.**
  - Expected:
    - refused, allowed, refused, when the rules are read;
    - the view says `a face-down card` with no id.
  - Tests: Tasks 6 and 7.
- **Shares at exact halves, at 0%, below 0 when no floor line follows, and for a card without the number; several flagged lines in order.**
  - Expected:
    - 4.5 up is 5 and 1.5 down is 1; 0% is 0;
    - −1.5 down is −2;
    - a card without the number gets nothing;
    - the last line that applies wins.
  - Tests: Task 1.
- **A pairing table naming a value no card has, values in other capitals, a card without the column, and a card paired onto itself.**
  - Expected: refused with suggestions; read alike; false; refused at the press.
  - Tests: Tasks 5 and 4.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name, not by line. If one is missing or differs, stop and report it.

- **Plan 4-1, built:**
  - `putOn`, `cardsOn`, `holderIdOf`, `onCardsZoneOf`, `attachmentProblem` (`attach.ts`); `HOLDER_KEY`, `withoutHolder`, `relocate`, `zoneIdFor`, `zoneInfo`, `zoneNameOf` (`zones.ts`);
  - `onCardsZone`, `announceJoins`, `registerAttachPhrases` (`attach-phrases.ts`);
  - `ZoneSpec.onCards: 'every' | 'some'`, `holders`;
  - `registerPlayerValuePhrases`, `playerValueOf`, `PLAYER_LINE_ABOUT`, `LINE_ABOUT`, `LINE_UNDER_OTHER`;
  - `STEPS_NEVER_PASS`, `linesDoing`, `effectsOf`, `warnUnreachable(…, reached)` (`compile.ts`);
  - `FORCE_GAME`, `WORKED_GAME`, `CREW_GAME`.
- **Plan 5-1:**
  - `ownerOf` (`support.ts`);
  - `the card it is on is {cardclass}` (`attach-phrases.ts`);
  - `the target card is {cardflag}`, `the target card gains {int} {attribute}`;
  - `FROM_CARDS_COUNT`, `splitList`, `OR_SEPARATORS`;
  - the phrase-set test's count after 5-1.
- **Plan 6-1:**
  - `numberIfAny` exported;
  - `FLAGGED_VALUES` (10 entries) and its functions;
  - `a card's {attribute} is {int}` and `a card's {attribute} goes up by {int} for each {attribute}` at the end of `registerCardSubjectPhrases`;
  - the phrase-set test titled with its count after 6-1 (30, or as 6-3 left it);
  - `ANOTHER_PLAYERS`, `othersZoneIds`, `ontoZoneIds`.
- **Plan 7-1:**
  - `ThingFact.kind` `'player'`, `CARDPLAYER` in `VOCAB_TYPES` and its pinned test line;
  - `SeatRef`'s `{ named }`, `NAMES_NO`, `NO_OWNER`, `NAMED_ZONE_IN_PICK`;
  - `fromZoneIds`;
  - `they pay {int} to its owner` (`board-phrases.ts`);
  - `a player's {playervalue} goes up by the total {attribute} of {cardgroup}`;
  - `ON_SEAT_KEY`, `othersOn`, `ZoneSpec.across`, `the other players' cards on it go to their owners' {perzone}`;
  - the Given and expects `{card} in {zone} is on {card} in {zone}` and `{card} in {zone} is on no card`;
  - in `action-window.ts`: `WINDOW_LINE`, `WINDOW_KEY`, `Waiting`, `waitingOf`, `NO_ACTION_WAITING`, `actingPlayer`;
  - `STOP_PHRASE` (`turn-phrases.ts`), `PhraseOpts.needsActing`, `LineCtx.acting`, `PlayerWho`'s `'acting'`;
  - the window checks and messages in `compile.ts`: `WINDOW_AT_ONCE`, `WINDOW_GO_TO`, `WINDOW_AFTER`, `WINDOW_COST`, `WINDOW_FIRST`, `WINDOW_IS_STEPS`, `AFTER_NAMES_ACTION`, `WINDOW_READS_HIDDEN`, `ACTING_ELSEWHERE`;
  - the walk of what the window's clause reads (private in `compile.ts`);
  - `askedFor`, `openWindow`, `windowAnswered`, `closeWindow` (`runtime.ts`); `WINDOW_RULE` (`build.ts`); `WINDOW_PASS_OUTSIDE`, `TURN_IN_THE_WINDOW` (`turn-phrases.ts`);
  - `WaitingView`, `SeatExtras.waiting`, `waitingView` (`board-view.ts`);
  - fixtures `MAKER_GAME`, `BUY_GAME`, `POST_GAME`, `RIVAL_GAME`, `OBJECT_GAME`; the test helper `stake` (7-1's Style: define it locally).
- **Plans 7-2a, 7-2b and 7-3:** whatever they added to `board-view.ts`, `worked-view.ts` and the README. Leave it as found.
- **The language at HEAD:**
  - `cardNumber`, `cardValueOf`, `cardHasFlag`, `soleZone`, `describeZone`, `theyOf`, `theTargetCard`, `movedCard`, `cardsIn`, `totalOf` (`support.ts`);
  - `itCard` (`fact-phrases.ts`);
  - `transfer`, `payCounter` (`board-phrases.ts`); `addToCounter` (`board-state.ts`);
  - `compileCards`, `acceptFacts` (`compile.ts`);
  - `readCondition`, `readRuleBody` (`compile-phase.ts`);
  - `matchEffectLine`, `unmetNeed`, `readsPressCard`, `innerEffect` (`compile-util.ts`);
  - `aboutCards` (`declared-actions.ts`);
  - `declaredWord`, `VOCAB_TYPES`, `parseParam`, `misnamedParam`, `canon` (`refs.ts`);
  - `seatExtras` (`board-view.ts`); `shownFlags`, `standIns` (`worked-view.ts`);
  - `testing.ts`: `fixtureEnv`, `vocabFor`, `runPhrase`.

---

### Task 1: Value lines that step down for each of a count, and a share of another number rounded up or down

Before starting: re-check 6-1's two card-subject values at the end of `registerCardSubjectPhrases`, `FLAGGED_VALUES` (10 entries) and its functions, the phrase-set test's title and list, `LINE_ABOUT`, `shownFlags`, `standIns`, `cardNumber`.

**Files:**
- Modify: `src/engine/core/lang/library/card-subject-phrases.ts` (three values), `src/engine/core/lang/library/card-value-phrases.ts` (`FLAGGED_VALUES[10..11]` and their function).
- Modify: `src/engine/core/lang/testing.ts` (`SHARE_GAME`).
- Test: `library/card-value-phrases.test.ts`, `compile.test.ts`, `worked-view.test.ts` (the phrase-set test's title and list change; the rest appended).

**Interfaces:**
- Consumes: `cardNumber`, `cardHasFlag`, `itCard`; 6-1's `goes up by {int} for each {attribute}`; 4-1's `a card's {attribute} is at least {int}`.
- Produces (for Task 8 and plan 8-2). Every line is `needsCard`. "So far" is what the lines before made of the value.

```ts
// card-subject-phrases.ts — appended at the end of the chain, in this order
"a card's {attribute} goes down by {int} for each {attribute}"      // so far − n × its number; nothing so far stays nothing
"a card's {attribute} is {int}% of its {attribute}, rounded up"     // Math.ceil(p × its number / 100)
"a card's {attribute} is {int}% of its {attribute}, rounded down"   // Math.floor(p × its number / 100)
// card-value-phrases.ts — FLAGGED_VALUES grows to 12; [10..11] with one function: a card that is so (cardHasFlag) gets the rounded-up
// share, any other card keeps the value so far
"a {cardflag} card's {attribute} is {int}% of its {attribute}, rounded up"
"an {cardflag} card's {attribute} is {int}% of its {attribute}, rounded up"
```

- A card without the number a line reads has nothing from that line, as `cardNumber` tells a worked value. No line floors at 0; `… is at least 0` says where.
- **`testing.ts`:**

```ts
/**
 * CREW_GAME where jobs gather charms and cracks: a job's asking price is its worth, 2 more for each charm and 3 less for each crack, never
 * below 0; it clears for half its asking price, rounded down; its fee is twice its worth, one and a half times its worth rounded up while it
 * is rare (one charm), and its worth alone while it is cheap (a Statue).
 */
export const SHARE_GAME = [
  CREW_GAME.replace('  Cards can be tired.', '  Cards can be tired.\n  Cards can have charms and cracks.'), '',
  'Asking price:', "  A card's asking price is its worth.", "  A card's asking price goes up by 2 for each charm.",
  "  A card's asking price goes down by 3 for each crack.", "  A card's asking price is at least 0.", '',
  'Clearance:', "  A card's clearance is 50% of its asking price, rounded down.", '',
  'Fee:', "  A card's fee is 200% of its worth, rounded up.", "  A rare card's fee is 150% of its worth, rounded up.",
  "  A cheap card's fee is its worth.", '',
  'Rare:', '  Only if its charms are 1.', '',
  'Cheap:', '  Only if it is a Statue card.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**
  - **Values** (`card-value-phrases.test.ts`, `describe('steps down and shares')`). A 2-player `SHARE_GAME` runtime, read through `runtime.workedValue`; jobs in `workshop-p0`, a Potter in `idle-p0`. A Vase is worth 3, a Statue 4.

    | card | asking price | clearance | fee |
    |---|---|---|---|
    | Vase | 3 | 1 | 6 |
    | Vase, 1 charm | 5 | 2 | 5 |
    | Vase, 1 crack | 0 | 0 | 6 |
    | Statue | 4 | 2 | 4 |
    | Statue, 1 crack | 1 | 0 | 4 |
    | Statue, 1 charm | 6 | 3 | 4 |
    | Potter | null | null | null |

    - **Review Focus.**
      - With `  A card's asking price is at least 0.` removed, a Vase with 2 cracks has asking price −3 and clearance −2. With `rounded up` in the Clearance line instead, its clearance is −1.
      - With the Clearance line reading `0%`, a Vase's clearance is 0.
      - A rare Statue's 150% line gives 6 exactly, and the cheap line after it still wins: its fee is 4 (the table's last row).
  - **Compiled** (`compile.test.ts`, `describe('steps down and shares')`).
    - `SHARE_GAME` compiles with `[]`.
    - `game.worked.fee.refs` have the phrases `["a card's {attribute} is {int}% of its {attribute}, rounded up", "a {cardflag} card's {attribute} is {int}% of its {attribute}, rounded up", "a {cardflag} card's {attribute} is its {attribute}"]`.
    - Under `Fee:`, `  A card's clearance is 50% of its asking price, rounded down.` gives `This line is about “clearance”, but it is under Fee:.` on its line.
    - `  A card's fee is 150% of its wrth, rounded up.` gives one error on its line whose message contains `“wrth”`.
  - **The view** (`worked-view.test.ts`).
    - Append `describe('steps down and shares')`:
      - `shownFlags(compiled(SHARE_GAME))` contains `'rare'` and `'cheap'`;
      - with `  A rare card's fee is 150% of its worth, rounded up.` removed it does not contain `'rare'`;
      - `standIns(compiled(SHARE_GAME))` is `{ worth: 'asking price' }`.
    - **Changed lines.** The phrase-set test's title count goes up by 5: from 30, or from the count found if 6-3 or 7-3 changed it. Its list gains:
      - the three card-subject lines, in the order above, right after `"value: a card's {attribute} goes up by {int} for each {attribute}"`;
      - the two flagged lines right after `"value: an {cardflag} card's {attribute} goes up by its {attribute}"`.

      `CARDS_ON_IT` is unchanged.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/card-value-phrases.test.ts src/engine/core/lang/compile.test.ts src/engine/core/lang/worked-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. A Startup or board-game line now read two ways is an `ambiguous` diagnostic: stop and report it.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/card-subject-phrases.ts src/engine/core/lang/library/card-value-phrases.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/library/card-value-phrases.test.ts src/engine/core/lang/compile.test.ts \
  src/engine/core/lang/worked-view.test.ts
git commit -F - <<'EOF'
feat(lang): value lines that step down for each of a count, and a share of another number rounded up or down

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: Prices paid through a card and its owner, a target card's price, and a player's room for a card

Before starting: re-check `transfer`, `payCounter`, `addToCounter`, `cardNumber`, 6-1's `numberIfAny`, 5-1's `ownerOf`, 7-1's `NO_OWNER`, `they pay {int} to its owner` and `goes up by the total`, move-phrases' `they have at least the card's {attribute} in {counter}`, and `FORCE_GAME`.

**Files:**
- Modify: `src/engine/core/lang/library/player-value-phrases.ts` (a value, a condition), `library/board-phrases.ts` (two effects), `library/card-pick-phrases.ts` (a condition, an effect).
- Modify: `src/engine/core/lang/testing.ts` (`TRADE_GAME`).
- Test: `library/player-value-phrases.test.ts`, `library/board-phrases.test.ts`, `library/card-pick-phrases.test.ts`, `compile.test.ts` (all appended).

**Interfaces:**
- Consumes: the names above.
- Produces (for Tasks 4, 6–8 and plan 8-2):

```ts
// player-value-phrases.ts
"a player's {playervalue} goes down by the total {attribute} of {cardgroup}"  // value, needsPlayer: so far − the total; no floor
"their {playervalue} is at least the card's {attribute}"                     // condition, needsMove, needsPlayer; the card's number as
                                                                             // numberIfAny reads it; none: false
// board-phrases.ts — effects; the number read as cardNumber reads it, so a card without it is a RuleError and the press is refused
"they pay its {attribute} to its owner"   // needsCard, needsPlayer, needsPayment: through transfer; no owner: RuleError NO_OWNER
"they get its {attribute}"                // needsCard, needsPlayer, needsPayment: from the bank, to what they pay with
// card-pick-phrases.ts
"they have at least the card's {attribute} plus the target card's {attribute} in {counter}"  // condition, needsMove, needsOnto, needsPlayer;
                                                                                            // each side as numberIfAny reads it, none = 0
"they pay the target card's {attribute}"  // effect, needsOnto, needsPlayer, needsPayment: to the bank through transfer
```

- **`testing.ts`:**

```ts
/**
 * FORCE_GAME where a player's red room is the red work of their crew less the red need of their jobs. They may buy another player's job for
 * its worth, paid to its owner, while their red room covers its red need; sell a job to the bank for its worth; and bribe another player's
 * hand with a job from their stash, paying the job's pay and the hand's wage when they have both.
 */
export const TRADE_GAME = [
  FORCE_GAME.replace('  A player may stop.', [
    "  A player may buy a card in another player's workshop.", '    It costs 1 move.', "    Only if they have at least the card's worth in coins.",
    "    Only if their red room is at least the card's red need.", '    Then:', '      They pay its worth to its owner.',
    '      Move it to their workshop.',
    '  A player may sell a card in their workshop.', '    It costs 1 move.', '    Then:', '      They get its worth.', '      Move it to the scrap.',
    "  A player may bribe a card from their stash to a card in another player's crew.",
    "    Only if they have at least the card's pay plus the target card's wage in coins.", '    Then:', "      They pay the card's pay.",
    "      They pay the target card's wage.", '      Move it to the scrap.',
    '  A player may stop.'].join('\n')), '',
  'Red room:', "  A player's red room is the total red work of the cards in their crew.",
  "  A player's red room goes down by the total red need of the cards in their workshop.",
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**
  - **Setup.** A 3-player `TRADE_GAME` engine, turn p0 in working, 9 coins and 3 moves each. `workshop-p0` holds a Statue with a Potter and a Tinker on it (`crew-p0`), and a Vase on its own. `workshop-p1` holds a Vase and a Statue. Each case starts from that table.
  - **Room** (`player-value-phrases.test.ts`, `describe('a player value that goes down by a total')`).
    - p0's `red room` is −1: red work 1 + 1, red need 1 + 2.
    - With p0's lone Vase moved to the scrap first, it is 1.
    - **Review Focus:** p1's is −3 (no crew, no floor).
    - Under `Red room:`, `  A player's red force goes down by the total red need of the cards in their workshop.` gives `This line is about “red force”, but it is under Red room:.` (`compile.test.ts`).
    - `  A player's red room goes down by the total red nede of the cards in their workshop.` gives one error on its line containing `“red nede”`.
  - **Buying** (`library/board-phrases.test.ts`, `describe('prices paid through a card and its owner')`). p0's lone Vase is in the scrap first, so p0's red room is 1.
    - p0 buys p1's Statue:
      - p0 has 5 coins and p1 13;
      - the Statue is in `workshop-p0`, and p0 has 2 moves;
      - p0's red room is 0.
    - p0 buying p1's Vase is refused with `their red room is at least the card's red need`.
    - **Review Focus:** at 3 coins, buying p1's Statue is refused with `they have at least the card's worth in coins`.
  - **Selling.** p0 sells its lone Vase: p0 has 12 coins, and the Vase is in the scrap.
  - **Through `runPhrase`** with `fixtureEnv` about p0 (Review Focus):
    - `they pay its worth to its owner` about a Vase in the scrap throws `It is in no player's zone, so it has no owner.`;
    - about a Potter in `idle-p1` it throws `This card has no worth.` (`cardNumber`'s message);
    - `they get its worth` about that Potter throws the same;
    - `their red room is at least the card's red need`, with a move whose card is that Potter, is false.
  - **Bribing** (`library/card-pick-phrases.test.ts`, `describe("a target card's price")`). `stash-p0` holds a Vase (pay 1); a Smith (wage 2) and a Tinker are on p1's Vase (`crew-p1`).
    - p0 bribes the Smith with the Vase: p0 has 6 coins, and the Vase is in the scrap.
    - At 2 coins it is refused with `they have at least the card's pay plus the target card's wage in coins`.
    - **Review Focus:** bribing the Tinker (wage 1, worked) at 2 coins is accepted, leaving 0.
  - **Refused when the rules are read** (`compile.test.ts`), each under `A player may stop.`:
    - `    Only if their red room is at least the card's red need.` gives `“their red room is at least the card's red need” only makes sense in a rule about a player's move.`;
    - `      They pay the target card's wage.` under its `Then:` gives `“They pay the target card's wage” only makes sense in a button that picks a card and the card it goes to, like “A player may stack a card from their hand to a card in the row.”`;
    - `      They pay its worth to its owner.` under its `Then:` gives `“They pay its worth to its owner” only makes sense in a rule about a card, such as “When a card …”.`
    - `TRADE_GAME` itself compiles with `[]`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/player-value-phrases.test.ts src/engine/core/lang/library/board-phrases.test.ts src/engine/core/lang/library/card-pick-phrases.test.ts src/engine/core/lang/compile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. Rent Day's `they pay its {spaceattr} to its owner` behaves as before, and no Rent Day line is now `ambiguous`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/player-value-phrases.ts src/engine/core/lang/library/board-phrases.ts \
  src/engine/core/lang/library/card-pick-phrases.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/library/player-value-phrases.test.ts src/engine/core/lang/library/board-phrases.test.ts \
  src/engine/core/lang/library/card-pick-phrases.test.ts src/engine/core/lang/compile.test.ts
git commit -F - <<'EOF'
feat(lang): prices paid through a card and its owner or read from a target card, and a player value that goes down by a total, compared with a card's number

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: A zone of a card's owner

Before starting: re-check `SeatRef` (with 7-1's `{ named }`), `OWNER_WORDS`, `describeZone`, `resolveZoneIds`, `moveZoneId`, `mentionsActor`, `mayHideFromPresser`, 7-1's zone source in `refs.ts` for `its <fact>'s <zone>`, `NAMED_ZONE_IN_PICK`, `NO_OWNER`, `acceptFacts`, and 5-1's `ownerOf`.

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`SeatRef`), `refs.ts` (zones read `its owner's <zone>`), `library/support.ts` (`OWNER_WORDS`), `zones.ts` (`resolveZoneIds`), `declared-moves.ts` (`moveZoneId`: null), `compile-util.ts` (`unmetNeed`: such a zone needs a card), `compile-phase.ts` (refused in a pick with 7-1's `NAMED_ZONE_IN_PICK`), `compile.ts` (`acceptFacts`: a card fact named `owner`).
- Modify: `src/engine/core/lang/testing.ts` (`TIP_GAME`).
- Test: `refs.test.ts`, `zones.test.ts`, `compile-phase.test.ts`, `compile.test.ts` (all appended).

**Interfaces:**
- Consumes: the names above.
- Produces (for Tasks 4, 8 and plan 8-2):

```ts
// types.ts
export type SeatRef = { seat: string } | { who: 'actor' | 'winner' | 'other' | 'owner' } | { named: string };  // 'owner': “its owner's purse”
// support.ts — OWNER_WORDS gains owner: "its owner's"
// zones.ts — resolveZoneIds: an `owner` seat is ownerOf(env, itCard(env)); a card in no player's zone throws RuleError NO_OWNER (7-1)
// compile.ts
const OWNER_IS_TAKEN = '“owner” already says whose zone a card is in; give the fact another name.';
```

- `its owner's <zone>` is read before 7-1's `its <fact>'s <zone>`, so `owner` is never taken for a card fact; a declared card fact named `owner` gets `OWNER_IS_TAKEN` on its line and is left out.
- **`testing.ts`:**

```ts
/** MAKER_GAME where a player may tip another player's job: the top stake of the job's owner's purse goes to their own purse. */
export const TIP_GAME = MAKER_GAME.replace('  A player may stop.', ["  A player may tip a card in another player's workshop.", '    Then:',
  "      Move the top card of its owner's purse to their purse.", '  A player may stop.'].join('\n'));
```

- [ ] **Step 1: Write the failing tests.**
  - **Read** (`refs.test.ts`, with `vocabFor(compileGame(TIP_GAME).game)`).
    - `its owner's purse` as a `{zone}` gives `{ of: { who: 'owner' }, zone: 'purse' }`, and `describeZone` of it is `its owner's purse`.
    - `its owner's purs` gives one error whose message contains `“purs”`.
  - **Resolved** (`zones.test.ts`). A 3-player `TIP_GAME` engine on p0's turn, after Setup (each purse holds 2 Stakes naming its seat), with a Vase in `workshop-p1`.
    - p0 tips the Vase: `purse-p1` holds 1 card, `purse-p0` holds 3, and the Stake that moved names p1 as its maker.
    - **Review Focus:** `runPhrase` of `move the top card of its owner's purse to the scrap` about a Vase in the scrap throws `It is in no player's zone, so it has no owner.`
  - **Refused when the rules are read.**
    - `      Move the top card of its owner's purse to their purse.` under `A player may stop.`'s `Then:` gives `“Move the top card of its owner's purse to their purse” only makes sense in a rule about a card, such as “When a card …”.` (`compile.test.ts`).
    - With a cost line, `A player may give a card from their stash to its owner's purse.` gives `“its owner's purse” can't be where a button picks or puts its cards: say whose zone it is, as in “their purse”.` (`compile-phase.test.ts`).
    - `  Cards can name an owner.` added to `TIP_GAME` gives `OWNER_IS_TAKEN` on its line, and `game.facts` has no `owner`.
    - (guard) `TIP_GAME` compiles with `[]`, and 7-1's `its maker's purse` still gives `{ of: { named: 'maker' }, zone: 'purse' }`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/refs.test.ts src/engine/core/lang/zones.test.ts src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/compile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `SeatRef` named in the Global Constraints.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/refs.ts src/engine/core/lang/library/support.ts src/engine/core/lang/zones.ts \
  src/engine/core/lang/declared-moves.ts src/engine/core/lang/compile-util.ts src/engine/core/lang/compile-phase.ts \
  src/engine/core/lang/compile.ts src/engine/core/lang/testing.ts src/engine/core/lang/refs.test.ts src/engine/core/lang/zones.test.ts \
  src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/compile.test.ts
git commit -F - <<'EOF'
feat(lang): a zone named by the owner of the card a line is about, so a card that changes hands can still reach its old owner's zones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: Cards on cards in their own zone, the card it is on by a flag, and a card moved with everything on it

Before starting: re-check `putOn`, `cardsOn`, 7-1's `othersOn` and `ON_SEAT_KEY`, `attachmentProblem`, `withoutHolder`, `relocate`, `zoneIdFor`, `zoneInfo`, `soleZone`, `aboutCards`, 5-1's `the card it is on is {cardclass}`, 7-1's `the other players' cards on it go to their owners' {perzone}`, `they pay {int} to its owner` and `… is on …` Given, Task 3's owner zone, and `POST_GAME`.

**Files:**
- Modify: `src/engine/core/lang/attach.ts` (`moveWithEverything`; `attachmentProblem` refuses a loop), `declared-actions.ts` (`aboutCards` refuses a target that is a picked card), `library/attach-phrases.ts` (two conditions, two effects).
- Modify: `src/engine/core/lang/testing.ts` (`NEST_GAME`).
- Test: `attach.test.ts`, `library/attach-phrases.test.ts`, `declared-actions.test.ts`, `worked-view.test.ts` (all appended).

**Interfaces:**
- Consumes: the names above.
- Produces (for Tasks 6–8 and plan 8-2):

```ts
// attach.ts
/**
 * Moves the card to `toZoneId`, a zone of a seat, and every card on it, all the way down, each to the zone of the same name of that seat,
 * still on the card it sat on, in the order cardsOn gives. Nothing moves when a card on it is another player's (ON_SEAT_KEY), sits in the
 * zone of the card it is on, or `toZoneId` is no seat's: each is a RuleError naming the card. No join is told: the cards stay on theirs.
 */
export function moveWithEverything(state: GameState, game: CompiledGame, cardId: string, toZoneId: string): GameState;
const OTHERS_STILL_ON = (card: string, holder: string) =>
  `${card} is still on the ${holder}: send the other players' cards on it back first, with “The other players' cards on it go to their owners' …”.`;
const SAME_ZONE_STILL_ON = (card: string, holder: string) =>
  `${card} is still on the ${holder}, in the same zone: take it off first, with “Every card on it in the same zone comes off it.”`;
const EVERYTHING_TO_THE_CENTER = (zone: string) =>
  `“with everything on it” takes the cards on a card to the same zones of the player it goes to, but ${zone} is no player's.`;
/** attachmentProblem: a card whose holder, or a holder of its holder, is the card itself. */
const ON_ITSELF = (card: string) => `${card} is on itself, or on a card that is on it.`;
// declared-actions.ts — aboutCards: a target that is the picked card, or one of the picked cards
const ONTO_ITSELF = "A card can't go onto itself: pick another card for it to go to.";
// attach-phrases.ts
'the card it is on is {cardflag}'               // condition, needsCard: read as cardHasFlag reads it; on no card: false
'the card it is on is not {cardflag}'           // condition, needsCard; on no card: false
'every card on it in the same zone comes off it'  // effect, needsCard: each such card, read through cardsOn, loses lang:on and stays put
'move it to {zone}, with everything on it'        // effect, needsCard: moveWithEverything(state, game, it, soleZone(zone))
```

- `${card}` in these messages is `attachmentProblem`'s way of naming a card (`The Statue in p0's workshop`); `${holder}` is the card it sits on by `pickName`.
- **`testing.ts`:**

```ts
/**
 * POST_GAME where a job may sit on another job in the same workshop, and a kit of stakes may sit on the hands of a crew. A player may set a
 * job on another and lift the jobs off one. They may take another player's job for 5 coins paid to its owner, with everything on it: the
 * jobs on it come off first, the other players' stakes on it go back, and each tired hand on it costs its owner a stake. A card on a tired
 * card is perched.
 */
export const NEST_GAME = POST_GAME
  .replace('  Each player has a workshop row that everyone can see.',
    '  Each player has a workshop row that everyone can see, where some cards are on cards.')
  .replace("  Each player has a holdings row that everyone can see, where some cards are on other players' cards.", [
    "  Each player has a holdings row that everyone can see, where some cards are on other players' cards.",
    '  Each player has a kit row that everyone can see, where every card is on a card in their crew.'].join('\n'))
  .replace('  A player may stop.', [
    '  A player may set a card from their workshop to a card in their workshop.', '    Then:', '      It goes to their workshop, on the target card.',
    '  A player may lift a card in their workshop.', '    Then:', '      Every card on it in the same zone comes off it.',
    "  A player may take a card in another player's workshop.", '    It costs 1 move.', '    Then:',
    '      Every card on it in the same zone comes off it.', "      The other players' cards on it go to their owners' holdings.",
    "      For each card on it that is tired, move the top card of its owner's purse to the scrap.",
    '      They pay 5 to its owner.', '      Move it to their workshop, with everything on it.',
    '  A player may stop.'].join('\n'))
  + '\n\nPerched:\n  Only if the card it is on is tired.';
```

- [ ] **Step 1: Write the failing tests.**
  - **The table** for the presses: a 3-player `NEST_GAME` engine on p0's turn, 9 coins and 3 moves each. `workshop-p0` holds a Vase and a Statue; a Potter is on the Vase (`crew-p0`). `purse-p0` holds two Stakes whose maker is p0 (`stake`).
  - **Set and lift** (`library/attach-phrases.test.ts`, `describe('cards on cards in their own zone')`).
    - p0 sets the Statue onto the Vase: the Statue is in `workshop-p0` with `lang:on` the Vase, and `attachmentProblem` is null.
    - p0 lifts the Vase:
      - the Statue is in `workshop-p0` with no `lang:on`;
      - the Potter still has `lang:on` the Vase.
    - **Review Focus:**
      - p0 setting the Vase onto itself is refused with `ONTO_ITSELF`;
      - with the Statue on the Vase, setting the Vase onto the Statue throws `The Vase in p0's workshop is on itself, or on a card that is on it.`, and the engine keeps its state.
  - **The card it is on** (through `runtime.workedFlag` and `runPhrase`). With the Statue on the Vase:
    - the Statue is perched when the Vase is tired, and not otherwise;
    - a Statue on no card is not perched, and `the card it is on is not tired` about it is false.
  - **Taking with everything on it.** Add to the table, with `putOn`:
    - the Potter is tired, and a Smith is on the Vase too (`crew-p0`);
    - the Statue is on the Vase;
    - a Stake whose maker is p0 sits in `kit-p0` on the Potter;
    - `holdings-p1` holds a Stake whose maker is p0, on the Vase (so it has `lang:on-seat` `'p0'`).

    Then, with the turn p1's, p1 takes the Vase:
    - p1 has 4 coins and p0 has 14; p1 has 2 moves;
    - the Statue is in `workshop-p0` on no card;
    - the Stake in `holdings-p1` is on no card, with no `lang:on-seat`;
    - `purse-p0` holds one Stake, and the scrap holds a Stake whose maker is p0;
    - the Vase is in `workshop-p1`; the Potter and the Smith are in `crew-p1`, each with `lang:on` the Vase;
    - the kit's Stake is in `kit-p1` with `lang:on` the Potter;
    - `attachmentProblem` is null.
  - **Refused** (Review Focus; each press throws, and the engine keeps its state):
    - without the line `      Every card on it in the same zone comes off it.` under take's `Then:`: `The Statue in p0's workshop is still on the Vase, in the same zone: take it off first, with “Every card on it in the same zone comes off it.”`;
    - without `      The other players' cards on it go to their owners' holdings.`: `The Stake in p1's holdings is still on the Vase: send the other players' cards on it back first, with “The other players' cards on it go to their owners' …”.`;
    - with `      Move it to the scrap, with everything on it.` in place of the last line: `“with everything on it” takes the cards on a card to the same zones of the player it goes to, but the scrap is no player's.`
  - **A card that sits on a card.** p1 takes the Statue while it sits on p0's Vase: the Statue is in `workshop-p1` on no card, and the Vase stays in `workshop-p0`.
  - **`aboutCards`** (`declared-actions.test.ts`). For p0's set button, a move with `cardId` and `onto` both the Vase is refused with `ONTO_ITSELF`; with `onto` the Statue it is allowed.
  - **The check** (`attach.test.ts`). With `putOn`, a Vase put on itself in `workshop-p0` gives `The Vase in p0's workshop is on itself, or on a card that is on it.`; a Vase and a Statue put on each other give it for the first in the state's order.
  - **The view** (`worked-view.test.ts`, guard: fail closed). `NEST_GAME` plus `Worth:` / `  A perched card's worth is 9.`: `shownFlags` does not contain `'perched'`.
  - (guard) `NEST_GAME` compiles with `[]`, and 7-1's `POST_GAME` and `RIVAL_GAME` tests pass unchanged.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/attach.test.ts src/engine/core/lang/library/attach-phrases.test.ts src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/worked-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. The loop check walks each card's holders with a set of ids seen, so it ends on any table.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`. Every Startup example passes unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/attach.ts src/engine/core/lang/declared-actions.ts src/engine/core/lang/library/attach-phrases.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/attach.test.ts src/engine/core/lang/library/attach-phrases.test.ts \
  src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/worked-view.test.ts
git commit -F - <<'EOF'
feat(lang): cards on cards in their own zone, taken off in place, never on themselves; the card it is on read by a flag; and a card moved to another player with everything on it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: Pairs from a table

Before starting: re-check `compileCards`, `acceptFacts`, `CardTable`, `CardSetSpec`, `declaredWord`, `VOCAB_TYPES` and its pinned test (with 7-1's `CARDPLAYER`), `emptyVocab`, `vocabFrom`, `vocabFor`, `splitList` and `OR_SEPARATORS`, `canon`, `suggestNames`, `cardValueOf`, and Task 4's `ONTO_ITSELF`.

**Files:**
- Create: `src/engine/core/lang/pairings.ts`.
- Modify: `src/engine/core/lang/types.ts` (`Pairing`, `CompiledGame.pairings`, `Vocab.pairings`), `phrases.ts` (`emptyVocab`, `vocabFrom`), `refs.ts` (`PAIRING`), `compile.ts` (`compileCards` reads the line; the checks after the tables), `library/card-pick-phrases.ts` (a condition).
- Modify: `src/engine/core/lang/testing.ts` (`PAIR_GAME`; `vocabFor` passes `pairings`).
- Test: `src/engine/core/lang/pairings.test.ts` (new), `refs.test.ts` (the pinned list changes).

**Interfaces:**
- Consumes: the names above.
- Produces (for Task 8 and plan 8-2):

```ts
// types.ts
/** Which values of a card column a card may take a card of, by that card's value in the same column; values canonical (canon). */
export type Pairing = { column: string; pairs: { [holds: string]: string[] }; line: number };
// CompiledGame gains: pairings?: { [verb: string]: Pairing };   left out when the game has none
// Vocab gains: pairings: string[];
// pairings.ts
/** A line in Cards: that declares a table of pairs: group 1 = the verb, group 2 = the column. */
export const PAIRING_LINE = /^cards can (.+?) cards by their (.+)$/i;
/** The pairs the table under the line gives; null, with the problem reported on the line, when the table is missing or misshapen. */
export function readPairing(verb: string, column: string, table: CardTable | null, line: number, diagnostics: Diagnostic[]): (Pairing & { verb: string }) | null;
/** The pairings whose column is a column of the card tables and whose every value some card has there; each problem on its line. */
export function checkPairings(read: (Pairing & { verb: string })[], cards: CardSetSpec[], diagnostics: Diagnostic[]): { [verb: string]: Pairing };
/** Whether a card whose column holds `holder` may take one whose column holds `held`; a missing value takes nothing and is taken by nothing. */
export function canPair(pairing: Pairing, holder: Json | null, held: Json | null): boolean;
// refs.ts — in VOCAB_TYPES right after CARDPLAYER
const PAIRING = declaredWord('pairing', '[pairing]', 'pairing', (v) => v.pairings, false);
// card-pick-phrases.ts — condition, needsMove, needsOnto: canPair with the target card's and the card's values, read as cardValueOf reads them
'the target card can {pairing} the card'
```

- **The table.**
  - Exactly two columns. The first is headed by the column's name; the second, headed by anything, lists the values each row's value takes, cut with `splitList` at `OR_SEPARATORS` (`, `, ` and `, ` or `).
  - **Messages:**

```ts
const PAIRS_NEED_A_TABLE = (column: string) =>
  `Under this line, write a table whose first column is “${column}” and whose second lists the ${column} values each one takes.`;
const PAIRS_FIRST_COLUMN = (column: string) => `This table has two columns: “${column}”, then the ${column} values each one takes.`;
const PAIR_ROW_TWICE = (value: string) => `“${value}” has two rows; put everything it takes in one.`;
const NO_CARD_HAS = (value: string, column: string) => `No card has “${value}” as its ${column}.`;   // with the closest values as suggestions
const PAIRING_TWICE = (verb: string) => `There are two tables of the cards that can ${verb} cards.`;
const PAIRING_VERB_TAKEN = (verb: string) =>
  `“Cards can ${verb} …” already declares something else; name what the cards do, like “Cards can carry cards by their craft.”`;
```

  - `PAIRING_LINE` is tried first in `Cards:`. The verbs `be`, `have` and `name` get `PAIRING_VERB_TAKEN`.
  - A column no card table has gets the message `misnamedParam('attribute', …)` gives, with its suggestions.
  - A pairing with a problem is left out.
- **`testing.ts`:**

```ts
/** CREW_GAME where a hand may be paired onto another hand in the idle when the table says the one carries the other's craft. */
export const PAIR_GAME = CREW_GAME
  .replace('  Cards can be tired.', ['  Cards can be tired.', '  Cards can carry cards by their craft:', '    | craft | carries       |',
    '    | gold  | red and mixed |', '    | mixed | red           |'].join('\n'))
  .replace('  A player may stop.', ['  A player may pair a card from their idle to a card in their idle.',
    '    Only if the target card can carry the card.', '    Then:', '      It is tired.', '  A player may stop.'].join('\n'));
```

- [ ] **Step 1: Write the failing tests** in `pairings.test.ts`.
  - **Compiled.**
    - `PAIR_GAME` compiles with `[]`.
    - `game.pairings` is `{ carry: { column: 'craft', pairs: { gold: ['red', 'mixed'], mixed: ['red'] }, line: lineOf(PAIR_GAME, '  Cards can carry cards by their craft:') } }`.
    - `vocabFor(game).pairings` is `['carry']`.
    - (guard) `compiled(CREW_GAME)` has no `pairings` key.
  - **Pressed** (`runExamples` on `PAIR_GAME`, with `Given p0's idle has a Potter, a Smith and a Tinker`):
    - `When p0 pairs the Potter to the Smith` then `Then the Potter in p0's idle is tired`;
    - `When p0 pairs the Smith to the Potter` then `Then it is rejected because "the target card can carry the card"`;
    - the Potter onto the Tinker is accepted; the Smith onto the Tinker is refused; the Tinker onto the Smith is accepted.
  - **Review Focus.**
    - With the table's rows written `| Gold | Red and Mixed |` and `| MIXED | red |`, the same five presses give the same results.
    - Through `runPhrase`, `the target card can carry the card` is false with a Vase as the target (no craft) and with a Vase as the card.
    - The Potter paired onto itself is refused with Task 4's `ONTO_ITSELF`.
  - **Refused when the rules are read**, each on the pairing line unless said:
    - no table under it gives `PAIRS_NEED_A_TABLE('craft')`;
    - `| kind | carries |` as the header gives `PAIRS_FIRST_COLUMN('craft')`;
    - `by their crafts` gives one error containing `“crafts”`, with suggestions `['craft']`;
    - a row `| golden | red |` gives `No card has “golden” as its craft.`, with suggestions `['gold']`;
    - a row `| gold | rad |` gives `No card has “rad” as its craft.`;
    - the gold row twice gives `PAIR_ROW_TWICE('gold')`;
    - the line and its table twice give `PAIRING_TWICE('carry')` on the second;
    - `  Cards can have cards by their craft:` gives `PAIRING_VERB_TAKEN('have')`;
    - `    Only if the target card can carri the card.` gives `There is no pairing called “carri”.` on its line;
    - `    Only if the target card can carry the card.` under `A player may stop.` gives the `needsOnto` message for that line.
  - **Changed line** (`refs.test.ts`): the pinned `VOCAB_TYPES` list gains `['pairing', '[pairing]']` right after `['cardplayer', '[card player]']`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/pairings.test.ts src/engine/core/lang/refs.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `CompiledGame` and `Vocab`.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/pairings.ts src/engine/core/lang/types.ts src/engine/core/lang/phrases.ts src/engine/core/lang/refs.ts \
  src/engine/core/lang/compile.ts src/engine/core/lang/library/card-pick-phrases.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/pairings.test.ts src/engine/core/lang/refs.test.ts
git commit -F - <<'EOF'
feat(lang): a table of which cards can take which by a column, written under Cards:, and a test that a target card can take the card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 6: Asking players part-way through a button's lines: the line and its refusals

Before starting: re-check:
- 7-1 Task 7's names and its walk of what the clause reads, and every window check in `compile.ts`;
- `readRuleBody`, `readCondition`, `matchEffectLine`, `unmetNeed`, `readsPressCard`, `linesDoing`, `STEPS_NEVER_PASS`;
- 6-1's round-steps phase and 4-1's end-steps phase (how a steps phase is known);
- `PhraseOpts`/`RegisteredOpts`, the size phrases in `flow-phrases.ts`;
- Tasks 2–4's phrases, and `OBJECT_GAME`.

**Files:**
- Modify: `src/engine/core/lang/action-window.ts` (the ask line's names), `compile-phase.ts` (`readRuleBody` reads an ask line under a button's `Then:`), `compile-util.ts` (`matchEffectLine` refuses one elsewhere), `compile.ts` (the checks; ask phases read with `acting`; `reached`; the shared walk honours `countsOnly`).
- Modify: `src/engine/core/lang/phrases.ts` (`PhraseOpts.countsOnly`), `library/flow-phrases.ts` (eight phrases marked), `library/turn-phrases.ts` (one effect), `library/card-pick-phrases.ts` (one effect).
- Modify: `src/engine/core/lang/testing.ts` (`ASK_GAME`).
- Test: `src/engine/core/lang/action-window.test.ts` (append `describe('asking part-way: the line and its refusals')`; one existing line changes, named below).

**Interfaces:**
- Consumes: the names above.
- Produces (for Tasks 7, 8 and plan 8-2):

```ts
// action-window.ts
/** group 1 = who is asked, group 2 = the phase they answer in, group 3 = “, in turn from their left” when written */
export const ASK_LINE = /^(each other player|its owner|the target card['‘’]s owner) has the (.+?)(, in turn from their left)?$/i;
export type AskWho = 'others' | 'owner' | 'target owner';
/** The compiler's ref for an ask line: { kind: 'lang', phrase: ASK_FRAME, args: [who: AskWho, phase: string, groups: CondGroup[]], line, text } */
export const ASK_FRAME = 'ask';
/** Every phase players answer an action in: the window line's (7-1) and every ask line's. */
export function windowPhases(game: CompiledGame): Set<string>;
// phrases.ts — PhraseOpts gains countsOnly?: boolean: the phrase reads only how many cards its zones hold, which every seat sees
// turn-phrases.ts — effect, needsActing: sets the waiting action's verdict to 'ahead'; RuleError NO_ACTION_WAITING when none waits
export const GO_AHEAD_PHRASE = 'the action goes ahead';
// card-pick-phrases.ts — effect, needsOnto, needsActing, needsPayment: from the bank to actingPlayer(state), the number as cardNumber reads it
"the player acting gets the target card's {attribute}"
```

- **Reading the line** (`readRuleBody`, only where `ctx.choices` says the lines are a button's).
  - A top-level `Then:` line matching `ASK_LINE` becomes the `ASK_FRAME` ref.
  - Its phase is read with `parseParam('phase', …)`, else `There is no phase called “…”.` with suggestions.
  - Its children are read with `readCondition` under `{ ...ctx, player: true, acting: true }`; any other child gets `NOT_UNDERSTOOD_IN_ASK`.
  - `its owner` needs what a `needsCard` phrase needs, and `the target card's owner` what a `needsOnto` phrase needs, with `unmetNeed`'s messages.
- **Messages:**

```ts
const ASK_ORDER = (phase: string) => `Say the order the other players are asked in: “Each other player has the ${phase}, in turn from their left.”`;
const ASK_ONE = 'One player is asked, so leave out “, in turn from their left”.';
const NOT_UNDERSTOOD_IN_ASK = 'Under a line that asks players, write only “Only if …” lines: they say who is asked.';
const ASK_ELSEWHERE = (text: string) => `“${text}” only makes sense among a button's Then: lines, where it asks players before the lines after it go ahead.`;
const ASK_TWICE = 'This button already asks players once; a second ask in one button is not written yet.';
const ASK_IN_A_WINDOW = (phase: string) => `Players are already answering an action in the ${phase}, so a button there can't ask them again.`;
const ASK_IN_STEPS = (phase: string) => `The players take the ${phase} in turn, so a button there can't stop to ask other players.`;
const AFTER_NAMES_ASK = "This button asks players part-way through its lines, so an After line can't name it: the turn would pass while they answer.";
```

- **The checks** (`compile.ts`, once the phases are read).
  - **On the ask line:**
    - its phase gets 7-1's `WINDOW_AT_ONCE`, `WINDOW_FIRST`, `WINDOW_IS_STEPS`;
    - `STEPS_NEVER_PASS(phase)` as an **error** when no line of the game passes it on. A line `the action goes ahead` counts as passing, for 7-1's window line too.
  - **In its phase:** 7-1's `WINDOW_GO_TO`, `WINDOW_AFTER` and `WINDOW_COST`, each on its line.
  - **Where an ask stands:**
    - an ask in a button of a phase in `windowPhases` gets `ASK_IN_A_WINDOW`;
    - in a button of the End's or the round's steps phase, `ASK_IN_STEPS`;
    - a second ask in one button, `ASK_TWICE`;
    - an After line naming a button that asks, `AFTER_NAMES_ASK`;
    - `ASK_LINE` matched by `matchEffectLine` anywhere else (rules, moments, phase start lines, options, Setup), `ASK_ELSEWHERE`.
  - **What the ask reads:**
    - the `Only if` lines go through 7-1's walk of what a clause reads, and its first zone not everyone sees gets `WINDOW_READS_HIDDEN`;
    - when `readsPressCard` holds for them, each zone the button picks its card or target in that is not public gets `WINDOW_READS_HIDDEN` too.
  - The walk skips the zone arguments of a phrase marked `countsOnly`, for 7-1's window clause as for asks.
  - Each ask phase joins `warnUnreachable`'s `reached`, and its lines are read with `{ ...ctx, acting: true }`.
- **`countsOnly`** is set on `{zone} has {int} card(s)`, `{zone} has fewer than {int} cards`, `{zone} has more than {int} card(s)`, `{zone} is empty`, `{zone} is not empty`, `{zone} are not empty`, `{zones} are empty` and `a player's {perzone} is empty`.
- **`testing.ts`:**

```ts
/**
 * OBJECT_GAME where a player may auction a job: each other player with its worth in coins is asked in turn from their left, and the first
 * to bid takes it for its worth with everything on it; if none does, the bank pays its worth and it goes to the scrap. A player may claim
 * another player's hand with a job from their stash, paying the hand's wage; its owner, if their purse or stash holds a card, may protest
 * with a stake, which dents the hand and refunds the wage; otherwise the claimer keeps the hand in their idle. And a player may borrow
 * another player's job for its worth, if its owner agrees.
 */
export const ASK_GAME = OBJECT_GAME
  .replace('  Cards can name a maker.', ['  Cards can name a maker.', '  Cards can be offered.', '  Cards can be claimed.',
    '  Cards can have dents.'].join('\n'))
  .replace('  A player may stop.', [
    '  A player may auction a card in their workshop.', '    It costs 1 move.', '    Then:', '      It is offered.',
    '      Each other player has the bidding, in turn from their left.', "        Only if they have at least the card's worth in coins.",
    '      It is not offered.', '      They get its worth.', '      Move it to the scrap.',
    "  A player may claim a card from their stash to a card in another player's crew.", '    Then:', '      Move it to the scrap.',
    "      They pay the target card's wage.", '      The target card is claimed.', "      The target card's owner has the protest.",
    '        Only if one of:', '          Their purse is not empty.', '          Their stash is not empty.',
    '      The keeping phase starts with them.',
    "  A player may borrow a card in another player's workshop.", '    It costs 1 move.',
    "    Only if they have at least the card's worth in coins.", '    Then:', '      Its owner has the consent.',
    '      They pay its worth to its owner.', '      Move it to their workshop, with everything on it.',
    '  A player may stop.'].join('\n'))
  .replace('End:', [
    'Phase: bidding', '  Players take turns.', "  A player may bid on a card in another player's workshop.", '    Only if it is offered.',
    '    Then:', '      They pay its worth to its owner.', '      It is not offered.', '      Move it to their workshop, with everything on it.',
    '      The action does not go ahead.', '  A player may pass the bid.', '    Then:', '      The bidding passes to the left.', '',
    'Phase: protest', '  Players take turns.', '  A player may protest with a card from their purse to a card in their crew.',
    '    Only if the target card is claimed.', '    Then:', '      Move it to their holdings.', '      The target card gains 1 dent.',
    "      The player acting gets the target card's wage.", '      The target card is not claimed.', '      The action does not go ahead.',
    '  A player may let the claim go.', '    Then:', '      The action goes ahead.', '',
    'Phase: keeping', '  Players take turns.', "  A player may keep a card in another player's crew.", '    Only if it is claimed.',
    '    Then:', '      It is not claimed.', '      Move it to their idle.', '      Go back to the interrupted turn.', '',
    'Phase: consent', '  Players take turns.', '  A player may agree.', '    Then:', '      The action goes ahead.',
    '  A player may refuse the loan.', '    Then:', '      The action does not go ahead.', '', 'End:'].join('\n'));
```

- [ ] **Step 1: Write the failing tests** in `action-window.test.ts`, `describe('asking part-way: the line and its refusals')`. `errorsOf` is as in `end-steps.test.ts`; copy it.
  - **Compiled.**
    - `ASK_GAME` compiles with `[]`, with no "Nothing leads to …" warning.
    - The auction button's `effects[1]` is an `ASK_FRAME` ref with args `['others', 'bidding', groups]`, where `groups` is one `all` group whose phrase is `they have at least the card's {attribute} in {counter}`.
    - The claim's `effects[3]` has `['target owner', 'protest', …]` with one `any` group of two refs whose phrase is `{zone} is not empty`.
    - The borrow's `effects[0]` has `['owner', 'consent', []]`.
    - `windowPhases(game)` holds `objection`, `bidding`, `protest` and `consent`.
    - (guard) `compiled(OBJECT_GAME)`'s buttons hold no `ASK_FRAME` ref, and `flowDefFor(OBJECT_GAME, SEATS)` is as at BASE.
  - **Refused when the rules are read** (each on the ask line unless said):
    - `      Each other player has the bidding.` gives `ASK_ORDER('bidding')`;
    - `      Its owner has the consent, in turn from their left.` gives `ASK_ONE`;
    - `bidding` misspelt `biding` gives `There is no phase called “biding”.` with suggestions `['bidding']`;
    - `Everyone acts at once.` for bidding's `Players take turns.` gives `WINDOW_AT_ONCE('bidding')`;
    - the bidding phase moved above `Phase: working` gives `WINDOW_FIRST('bidding')`;
    - `  When they have at least 20 coins, go to working.` under `Phase: bidding` gives `WINDOW_GO_TO('bidding')` on its line;
    - `    It costs 1 move.` under `  A player may pass the bid.` gives `WINDOW_COST('bidding')` on its line;
    - `      The bidding passes to the left.` replaced by `      They get 1 coin.` gives the `STEPS_NEVER_PASS('bidding')` text as an error;
    - (guard) the consent phase, which only lets the action go ahead or stops it, gives no such error;
    - `  When they have at least 20 coins:` / `    Each other player has the bidding, in turn from their left.` under working gives `ASK_ELSEWHERE("Each other player has the bidding, in turn from their left")` on its line;
    - the same line inside a `They choose one:` option of tidy gives `ASK_ELSEWHERE` too;
    - `      Its owner has the consent.` added as the first `Then:` line of bidding's `bid on` gives `ASK_IN_A_WINDOW('bidding')`, and in objection's `object with`, `ASK_IN_A_WINDOW('objection')`;
    - a second `      Its owner has the consent.` in borrow gives `ASK_TWICE` on the second;
    - `      Its owner has the consent.` under `A player may stop.`'s `Then:` gives the `needsCard` message for that line;
    - `      The target card's owner has the protest.` in borrow gives the `needsOnto` message;
    - `  After a player auctions, the turn passes to the left.` added to working gives `AFTER_NAMES_ASK` on its line (write it in the After form the compiler reads for the auction);
    - a child line `        Pay up.` under the auction's ask line gives `NOT_UNDERSTOOD_IN_ASK` on it.
  - **Review Focus: what an ask reads.**
    - Under the protest ask, `          They have a card in their stash whose name is Vase.` in place of `Their stash is not empty.` gives `WINDOW_READS_HIDDEN('their stash')`.
    - (guard) As written, `Their stash is not empty.` compiles: a zone's size is public.
    - `        Only if the card is a Vase.` added under the protest ask gives `WINDOW_READS_HIDDEN('their stash')`: the claim picks its card in the stash.
    - `        Only if the target card is tired.` there compiles: the target is in another player's crew.
    - **7-1's window clause:** 7-1 Task 7's `Dusty:` clause as 7-1 wrote it (`  Only if it is a Stake card.`, `  Only if the pile is not empty.`) now compiles with `[]`: it reads only the pile's size.
    - **Changed line:** 7-1 Task 7's Review Focus test whose `Dusty:` flag reads `  Only if the pile is not empty.` gets `  Only if the pile has a Vase.` instead, and still expects `WINDOW_READS_HIDDEN('the pile')`.
  - **Acting elsewhere.** `      The action goes ahead.` and `      The player acting gets the target card's wage.` under working's `A player may stop.`'s `Then:` each give 7-1's `ACTING_ELSEWHERE` with their text.
  - **The phrases on a hand-made window** (as in 7-1 Task 7): a 3-player `ASK_GAME` state whose `lang:window` is a `Waiting` with `by: 'p0'`, `phase: 'protest'`, `asked: ['p1']`, `at: 0`.
    - `the action goes ahead` sets the verdict to `'ahead'`.
    - `the player acting gets the target card's wage`, about p1 with `subject.onto` a Smith, gives p0 11 coins.
    - On a state with no `lang:window`, the first throws `No action is waiting for the players to answer it.`
  - **`countsOnly`.** In the library `REGISTRARS` build, each of the eight size phrases has `countsOnly` true, and `they have a card in {zones} whose {cardfilter}` has it false.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/action-window.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `PhraseOpts`.
- [ ] **Step 4: Run** it with `src/engine/core/lang/end-steps.test.ts` and the round-steps tests, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/action-window.ts src/engine/core/lang/compile-phase.ts src/engine/core/lang/compile-util.ts \
  src/engine/core/lang/compile.ts src/engine/core/lang/phrases.ts src/engine/core/lang/library/flow-phrases.ts \
  src/engine/core/lang/library/turn-phrases.ts src/engine/core/lang/library/card-pick-phrases.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/action-window.test.ts
git commit -F - <<'EOF'
feat(lang): a button's line that asks other players, its owner or its target's owner before the lines after it go ahead, refused wherever answering could never end or could tell what is hidden

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 7: Asking players part-way through a button's lines: played

Before starting: re-check:
- Task 6's names, and 7-1 Task 8's `askedFor`, `openWindow`, `closeWindow`, `windowAnswered`, `WINDOW_RULE` and `apply`'s window branch;
- `waitingOf` and its shape check, `stepPassesLeft`'s window branch, `WINDOW_PASS_OUTSIDE`, `TURN_IN_THE_WINDOW`;
- `runtime.failedGroup`, `playersIn`, `nextIn`, `isOut`, `ownerOf`;
- 7-1 Task 9's `waitingView`.

**Files:**
- Modify: `src/engine/core/lang/action-window.ts` (`Waiting.resume`), `runtime.ts` (`askedAt`, `runButtonLines`; `openWindow` takes the phase; `closeWindow` resumes), `declared-actions.ts` (`apply` runs its lines through `runButtonLines`), `library/turn-phrases.ts` (`WINDOW_PASS_OUTSIDE` for every phase of `windowPhases`).
- Test: `src/engine/core/lang/action-window.test.ts` (append `describe('asking part-way: played')`), `src/engine/core/lang/board-view.test.ts` (append).

**Interfaces:**
- Consumes: Task 6's `ASK_FRAME`, `AskWho`, `windowPhases`, `ASK_GAME`; 7-1's window names.
- Produces (for Task 8 and plan 8-2):

```ts
// action-window.ts — Waiting gains:
//   resume?: number;   the index of the button's next Then: line, for an ask; left out for 7-1's window, whose lines all wait
// runtime.ts
/**
 * The seats an ask asks, judged once on `state` with a Waiting naming `by` under WINDOW_KEY (so “the player acting” reads `by`). The
 * candidates: every seat still in but `by`, from `by`'s left ('others'); or the owner of the press's card ('owner') or target card
 * ('target owner') when that seat is still in and is not `by`. Each is kept when the ask's groups hold about them, with the press's
 * subject and card move.
 */
askedAt(state: GameState, ask: PhraseRef, by: PlayerId, subject: Subject, info?: MoveInfo): PlayerId[];
/**
 * Runs a button's Then: lines from `start`, about the press's subject and card move, as a press does. At an ask line with someone to ask,
 * it opens the window there, with `resume` the next line's index, and runs nothing after it; with no one to ask it goes on.
 */
runButtonLines(state: GameState, from: string, action: DeclaredAction, by: PlayerId, subject: Subject, info: MoveInfo | undefined, start: number): GameState;
openWindow(state: GameState, waiting: Omit<Waiting, 'at' | 'back'>): GameState;   // the phase is now given: 7-1's apply passes the window line's
```

- **`closeWindow` on `'ahead'`.**
  - A `Waiting` with `resume` runs `runButtonLines` from it, with no relocation.
  - One without moves the relocation's cards and runs `runButtonLines` from 0, so lines that ask after the Veto's window still ask.
  - On `'stopped'` nothing more runs, as 7-1 built it.
- **`runtime.run`** of an `ASK_FRAME` ref outside `runButtonLines` throws an `Error`: a mistake in the code.
- [ ] **Step 1: Write the failing tests** in `action-window.test.ts`, `describe('asking part-way: played')`.
  - **Setup.** Copy 7-1 Task 8's helpers, with `table(game = ASK_GAME, prepare)`:
    - a 3-player engine from `initialState(game, 1)`, turn `{ current: 'p0', phase: 'working' }`, p0's turn started;
    - 9 coins and 3 moves each;
    - `stake` arranges stakes.
  - **The first who bids takes it.** `workshop-p0` holds a Vase (worth 3); p1 has 2 coins.
    - After p0 auctions the Vase:
      - p0 has 2 moves, and the Vase is offered;
      - the phase is bidding, with p2 current;
      - `waitingOf(state)` has `by: 'p0'`, `from: 'working'`, `phase: 'bidding'`, `asked: ['p2']`, `at: 0` and `resume: 2`, and no `relocation` key.
    - p0's `stop` is refused with `not p0's turn`.
    - p2 bids on the Vase:
      - p2 has 6 coins and p0 12;
      - the Vase is in `workshop-p2`, not offered, and the scrap is empty;
      - the phase is working, p0 current, `lang:window` absent, and p0 has 2 moves.
  - **Nobody bids.** As above, p2 passes the bid: the Vase is in the scrap, not offered; p0 has 12 coins; the phase is working with p0 current.
  - **Asked in turn.** All at 9 coins: `asked` is `['p1', 'p2']`. After p1 passes, p2 is current with `at` 1. After p2 passes, the Vase is in the scrap.
  - **Review Focus.**
    - **Nobody to ask:** p1 and p2 at 2 coins. The auction scraps the Vase and pays p0 3 at once, and `lang:window` never appears.
    - **A seat that is out:** with p1 marked out at 9 coins, `asked` is `['p2']`.
    - **The last move:** p0 has 1 move. After the auction (p1 at 2 coins) and p2's pass, the Vase is scrapped and working's `When they have less than 1 move:` passes the turn: p1 is current, `TURN_OF_KEY` `'p1'`.
    - **Undo and replay:** after the auction (all at 9) and p1's pass:
      - a fresh `table(ASK_GAME, prepare)` given `loadLog(engine.getLog())` equals the engine's state;
      - `engine.undo()` gives the window with p1 current and `at` 0.
  - **The target card's owner.** `stash-p0` holds a Statue; `workshop-p1` holds a Vase with a Smith (wage 2) on it; `purse-p1` holds a Stake whose maker is p1.
    - After p0 claims the Statue to the Smith:
      - the Statue is in the scrap, p0 has 7 coins, and the Smith is claimed;
      - the phase is protest, with p1 current;
      - `asked` is `['p1']`, and `resume` is 4.
    - p1 protests with the Stake to the Smith:
      - the Stake is in `holdings-p1`;
      - the Smith has 1 dent, is not claimed, and is still in `crew-p1` on the Vase;
      - p0 has 9 coins;
      - the phase is working with p0 current.
    - p1 letting the claim go instead:
      - the phase is keeping with p0 current;
      - p0 keeps the Smith: it is in `idle-p0` on no card and not claimed, p0 has 7 coins, and the phase is working with p0 current.
  - **R4's shape: whether it opens reads public facts only.**
    - With `purse-p1` and `stash-p1` empty, the claim asks no one: the phase is keeping at once.
    - With `purse-p1` empty and a Vase in `stash-p1`, `asked` is `['p1']`.
  - **Its owner's consent.** `workshop-p1` holds a Vase with a Potter on it.
    - After p0 borrows it, the phase is consent with p1 current, and p0 has 2 moves.
    - p1 agrees:
      - p0 has 6 coins and p1 12;
      - the Vase is in `workshop-p0` with the Potter on it in `crew-p0`;
      - the phase is working.
    - p1 refusing the loan instead: nothing moves, and p0 has 9 coins and 2 moves.
  - **Review Focus: after the Veto's window.** `holdings-p1` holds a Stake whose maker is p0, and `workshop-p0` a Vase; all at 9 coins.
    - After p0 auctions, the phase is objection with p1 current, and the Vase is not offered.
    - p1 lets it go: the phase is bidding with p1 current, and `asked` is `['p1', 'p2']`.
    - With p1 objecting instead:
      - the Stake is in `purse-p0`;
      - the Vase stays in `workshop-p0`, not offered;
      - the phase is working, and p0 has 2 moves.
  - **Review Focus: an ask opened from an interrupt.** `ASK_GAME` with `      Its owner has the consent.` as the first `Then:` line of keep.
    - After the claim and p1's letting it go, p0 keeps the Smith: the phase is consent with p1 current.
    - p1 agrees: the Smith is in `idle-p0`, and the phase is working with p0 current (the interrupted turn).
  - **Refused while playing.** On a state in the bidding phase with no `lang:window`, `runPhrase` of `the bidding passes to the left` throws `The bidding passes to the left only while an action waits for the players to answer it.`
  - **The view** (`board-view.test.ts`, `describe('what each seat sees of an ask')`). With the claim's table:
    - After the claim, p1's and p2's `seatExtras(...).waiting` are `{ by: 'p0', label: claim.label, cards: ['Statue', 'Smith'], choices: [] }`.
    - p1's actions: `protest with …` and `let the claim go` are allowed, and every one of p0's has an `allowed` other than `true`.
    - **Review Focus:** with `      Move it to the scrap.` moved below the ask line, so the Statue is still in `stash-p0` while p1 answers:
      - p1's `waiting.cards` is `['a face-down card', 'Smith']`, and p0's is `['Statue', 'Smith']`;
      - `JSON.stringify(p1Extras.waiting)` does not contain the Statue's id.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/action-window.test.ts src/engine/core/lang/board-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `Waiting`.
- [ ] **Step 4: Run** them with `src/engine/core/lang/end-steps.test.ts`, the round-steps tests and `src/engine/core/lang/runtime.test.ts`, then `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`.
  - 7-1's window tests pass unchanged.
  - Rent Day keeps its 108 examples.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/action-window.ts src/engine/core/lang/runtime.ts src/engine/core/lang/declared-actions.ts \
  src/engine/core/lang/library/turn-phrases.ts src/engine/core/lang/action-window.test.ts src/engine/core/lang/board-view.test.ts
git commit -F - <<'EOF'
feat(lang): a button's lines wait at an ask while the players asked answer in turn, then go on from there, stop, or go ahead at once

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 8: An example for each piece, the README, and the checks

Before starting: re-check 7-1's README paragraph ("Cards that name a player, cards on other players' cards, lookups, and answering an action before it goes ahead.") and every fixture above.

**Files:**
- Test: `src/engine/core/lang/examples.test.ts` (append).
- Modify: `README.md` (a paragraph after 7-1's).

**Interfaces:**
- Consumes: every fixture above; `runExamples`.
- Produces: no phrase.

- [ ] **Step 1: Write the tests.** In `examples.test.ts`, `describe("the words for slice 8's pieces")`, each fixture with its example appended passes `runExamples`. Tasks 5 and 7 hold the examples of pairs and asks played.
  - **`SHARE_GAME`:**

```text
Example: a job's asking price, its clearance and its fee
  Given p0's workshop has a Vase and a Statue
  And the Vase in p0's workshop has 1 charm
  And the Statue in p0's workshop has 1 crack
  Then the Vase in p0's workshop has 5 asking price
  And the Vase in p0's workshop has 2 clearance
  And the Vase in p0's workshop has 5 fee
  And the Statue in p0's workshop has 1 asking price
  And the Statue in p0's workshop has 0 clearance
  And the Statue in p0's workshop has 4 fee
```

  - **`TRADE_GAME`:**

```text
Example: a job is bought for its worth, paid to its owner, only with red room for its red need
  Given p0's workshop has a Statue
  And the Statue in p0's workshop has a Potter and a Tinker on it
  And p1's workshop has a Vase and a Statue
  Then p0's red room is 1
  When p0 buys the Vase
  Then it is rejected because "their red room is at least the card's red need"
  When p0 buys the Statue
  Then p0 has 5 coins
  And p1 has 13 coins
  And p0's red room is 0
```

  - **`NEST_GAME`:**

```text
Example: a job taken with everything on it leaves the job set on it behind and sends other players' stakes back
  Given p0's workshop has a Vase and a Statue
  And the Vase in p0's workshop has a Potter on it
  And the Statue in p0's workshop is on the Vase in p0's workshop
  And p1's holdings has a Stake whose maker is p0
  And the Stake in p1's holdings is on the Vase in p0's workshop
  And it is p1's turn
  When p1 takes the Vase
  Then the Vase in p1's workshop has a Potter on it
  And the Statue in p0's workshop is on no card
  And the Stake in p1's holdings is on no card
  And p0 has 14 coins
```

  - **`ASK_GAME`:**

```text
Example: offered in turn from the seller's left, the first who bids takes it, and the bank pays nothing
  Given 3 players
  And p0's workshop has a Vase
  And p1 has 2 coins
  When p0 auctions the Vase
  Then the phase is bidding
  And it is p2's turn
  When p2 bids on the Vase
  Then p2's workshop has a Vase
  And p0 has 12 coins
  And p2 has 6 coins
  And the phase is working
  And it is p0's turn

Example: a protest stops the claim and gives the wage back
  Given 3 players
  And p0's stash has a Statue
  And p1's workshop has a Vase
  And the Vase in p1's workshop has a Smith on it
  And p1's purse has a Stake whose maker is p1
  When p0 claims the Statue to the Smith
  Then the phase is protest
  And it is p1's turn
  When p1 protests with the Stake to the Smith
  Then p0 has 9 coins
  And the Smith in p1's crew has 1 dent
  And the phase is working
  And it is p0's turn
```

  - **A failing example.** `SHARE_GAME` with `Then the Vase in p0's workshop has 6 fee` fails, and the failure names that line.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/examples.test.ts`. Expected: PASS, since there is no new phrase. If one fails, stop and report which line: that is a missing piece, to be planned, not worked round.
- [ ] **Step 3: Write the README paragraph** after 7-1's: **"Steps down and shares, cards that change hands with everything on them, pairs from a table, and asking players part-way through a button."** It is written in fixture words, and plan 8-2 may swap in Startup's lines. One bullet each:
  - **Steps down and shares.** `A card's asking price goes down by 3 for each crack.`, `A card's clearance is 50% of its asking price, rounded down.`, `A rare card's fee is 150% of its worth, rounded up.`; the last line that applies wins.
  - **Prices.**
    - `They pay its worth to its owner.`, `They get its worth.` (from the bank).
    - `They pay the target card's wage.` and `they have at least the card's pay plus the target card's wage in coins`.
    - `A player's red room goes down by the total red need of the cards in their workshop.` and `their red room is at least the card's red need`.
  - **The owner's zone.** `Move the top card of its owner's purse to their purse.`
  - **Cards on cards in their own zone.**
    - A zone marked `, where some cards are on cards` may hold a card on a card beside it.
    - `Every card on it in the same zone comes off it.`
    - `the card it is on is tired`.
    - A card can't go onto itself.
  - **With everything on it.** `Move it to their workshop, with everything on it.` takes the cards on it, all the way down, to the same zones of the new player. It refuses while a card beside it or another player's card is still on it: take those off and send them back first.
  - **Pairs from a table.** `Cards can carry cards by their craft:` with `| craft | carries |` rows, and `Only if the target card can carry the card.`
  - **Asking part-way.**
    - The lines:
      - `Each other player has the bidding, in turn from their left.`, `Its owner has the consent.` and `The target card's owner has the protest.`, among a button's `Then:` lines;
      - `Only if` lines under them say who is asked, and read only what every seat sees (a hidden zone's size is fine).
    - Answering:
      - the asked players answer in the named phase with `The bidding passes to the left.`, `The action goes ahead.` or `The action does not go ahead.`;
      - `The player acting gets the target card's wage.` gives back what the asker paid.
    - What runs: the lines after the ask run only when it goes ahead; the ones before have run.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 5: Run the checks.** Each must print nothing, except where noted.

```bash
# Startup Simulator's words in shared code, slices 3 to 8, tests included
git diff "$BASE" -- src/engine src/pages src/utils | grep '^+[^+]' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share|tags?|leads?|leading|licen[cs]es?|tiers?|stall(s|ed|ing)?|sectors?|expertise|modes?|bandwidths?|bugs?|qa|online|offline|maint(enance)?|suppl(y|ies)|demands?|xp|pending|skills?|badges?|badged|ranks?|mentor(s|ed|ing)?|synerg(y|ies)|agile|graduat(e|es|ed|ing|ion)|training|trained|brainstorm(s|ed|ing)?|strateg(y|ies)|milestones?|seniors?|workaholics?|clean coders?|visionar(y|ies)|toxic|burnouts?|flight risks?|techcrunch|design sprints?|cease|desist|hype|utilit(y|ies)|buffs?|debuffs?|venture capital|bubbles?|patents?|trolls?|angels?|investors?|legacy|regulations?|audits?|open source|hackathons?|chip shortage|crunch|server crash|logjam|frenz(y|ies)|interns?|headhunt(s|ed|ing|ers?)?|course boom|whistleblowers?|trade show|events?|equit(y|ies)|founders?|consultants?|dividends?|veto(es|ed|ing)?|partners?(hips?)?|immunit(y|ies)|portfolios?|buybacks?|stocks?|poach(es|ed|ing|ers?)?|vest(s|ed|ing)?|ctos?|acqui(re|res|red|ring|sitions?)|fire sales?|hit pieces?|scandals?|integrat(e|es|ed|ing|ions?)|hosts?|host(ed|ing)|clients?|cris(is|es)|m&a|divest(s|ed|ing|ments?)?|raiders?|market sales?|counter-offers?)\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# existing test lines removed or changed: only the named ones
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
# nothing outside the language
git diff --stat "$BASE" -- src/games src/pages
```

  - The fourth check prints only:
    - the phrase-set test's old title and any list line Task 1 rewrote (`worked-view.test.ts`);
    - the pinned `VOCAB_TYPES` line(s) of `refs.test.ts` (Task 5);
    - 7-1's `Dusty:` line in `action-window.test.ts` (Task 6).
  - Also read the `+` lines of `src/engine` for "supply", "offline", "host", "client" and "sale" used of products.
- [ ] **Step 6: Run the games alone.**
  - `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
  - `bunx vitest run src/games/startup-simulator.test.ts` passes with BASE's example count.
- [ ] **Step 7: Commit**

```bash
git add src/engine/core/lang/examples.test.ts README.md
git commit -F - <<'EOF'
feat(lang): an example for each of slice 8's pieces; the README describes steps down and shares, cards that change hands with everything on them, pairs from a table and asking players part-way through a button

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Forward notes

- **Slice 9.**
  - The `cto` mark is a count, so the Audit Shield reads it (`its cto is more than 0`) on the employee wherever it is. Rivals see it, as slice 9 R3 says.
  - The waiting view names a Face-Down card only as `a face-down card`, so an ask's prompt never names one.
  - A Fold returns Consultants with 7-1's line, and leaves no card on a card in its own zone, since none sits in development.
- **Slice 10.**
  - Liquidation reuses the Market Sale's ask and the Fire Sale's lines. A bankrupt's spare cash is one more `Only if` line under the ask (R2).
  - Come Clean offers "in turn from the seller's left at the moment of the sale" are a second ask, or an ask inside a window phase.
    - Both are refused here (`ASK_TWICE`, `ASK_IN_A_WINDOW`).
    - Slice 10's nested interrupts lift them by keeping a stack of `Waiting`s under `lang:window`.
  - Legacy Status cleared on a sale is one more line before `with everything on it`.

## Left to 8-2 / 8-3

**Plan 8-2 (rules text and long runs; it may split as 7-2 did)** writes, with this plan's pieces:
- **Cards and zones.**
  - `Each player has an operations row that everyone can see, where some cards are on cards.` (R2), with no `in their …`: the ops team's line already names operations.
  - A public per-player `locked equity` row (R1).
  - Counts `vest`, `cto`, `scandal`; flags `for sale`, `poached`, `raided`.
  - Examples put a Client on its Host with 7-1's `… is on … in …` Given. The `has … on it` Given would put it in the ops team.
- **Prices (§7, §16.B).**
  - `sale price`: Tier lines; +5 for each hype and for each attached staff (`the cards on it that are attaching`, R2's "name staff"); −5 for each scandal and −1 for each bug; at least 0.
  - `fire sale price` (50% rounded down).
  - `token value`, `poach base`.
  - `poach fee`: 200% rounded up; a Ninja's 150% rounded up; Flight Risk or Recruiter Frenzy its poach base. `raid fee` likewise, from 150%. `fee paid` (raided → raid fee).
  - Portfolio points −5 for each scandal.
  - **Check:** §16.B.1 asks for the literal printed cost. If 6-2b made `cost` a worked value that Chip Shortage raises, the poach base reads the printed column under another name, recorded as a call.
- **Room.** `blue room` / `red room` with `goes down by the total … that are not offline`, compared with `the card's blue maint`.
- **Acquisition.**
  - A pick in another player's operations, with cash and room guards.
  - `Its owner has the consent.`
  - Then, in order:
    - the stack broken (`Every card on it in the same zone comes off it.`) and Consultants returned;
    - Vest and CTO tokens on attached staff destroyed with `its owner's locked equity`;
    - `They pay its sale price to its owner.`, `It is not offline.`;
    - `Move it to their operations, with everything on it.`
- **Divest.**
  - `It is for sale.`, then the market sale ask with its cash and room `Only if` lines.
  - The market sale phase's buy (the Acquisition's lines, then `The action does not go ahead.`) and pass.
  - The Fire Sale lines: break, return, `Every card on it goes to their bench.`, strip the tokens, `They get its fire sale price.`, to the open idea pool.
- **Poaching.**
  - Headhunt and raid as two verbs (P16 tells them apart), each picking the Strategy card and a target in another player's development team.
  - Defenses as worked flags: HR on the team through `the card it is on is …` and `some card on it is …`; Vest, CTO, Headhunter Holiday; Immunity with 7-1's founder test.
  - The sum guard and `They pay the target card's poach fee.`
  - `The target card's owner has the counter-offer.` with R4's two `Only if one of:` lines.
  - The counter-offer phase: Vest from equity, Cease & Desist from the hand, each `The player acting gets the target card's fee paid.` and `The action does not go ahead.`; let it go.
  - The destination in a placing interrupt after the ask (ASK_GAME's keeping phase is the shape), with Onboarding, the join moment's Bug, and Stalled by its worked flag.
- **Hit Piece.** `The target card gains 1 scandal.`, guarded on the founder test.
- **Crisis Management.** Per-press, as 4-2 R3's Ops QA: Scandal before Bugs, with the Director's capacity left as a player value that goes down by a total.
- **Integration.**
  - `Cards can host cards by their tag:` with §10.B's seven rows.
  - The integrate button (0 AP), in operations to a card in operations, with the pairing and four flag guards (no card beside either; neither on a card).
  - The Client's +$2 and stickiness, and the Host's +5 VP, through flags reading `the card it is on is not offline`.
- **CTO.** $5, a token to `locked equity`, `1 cto`; at most one, the Bench counted.
- **Destroyed Equity.** Lines in every firing route (dismiss, let go, bench cleanup, the Diva, Regulation Audit).
- **7-2a's invariant** "`equity-F` is never empty" changes: Vest and CTO may take the last token.
- **Proof.**
  - Every example of the spec's table and R3's.
  - Rulings #6, #15, #16, #22, #24.
  - Immune targets pinned with `ontoCandidates` as 6-2a did, or a press naming the zone.
  - The long runs and their invariants, and the auto-player answering every ask.

**Plan 8-3 (the page):**
- The Client tucked under its Host in the operations row: a card on a card beside it.
- Vest and CTO marks and Scandal as badges; the locked equity pile on each tableau.
- An ask's waiting press in the asked seat's strip, from `SeatExtras.waiting`. The market sale's offer, the counter-offer and the consent prompts. The switcher following `turn.current` into each and back.
- The placing interrupt's picker; the pairing's refusals in words.
- The browser check of an Acquisition, a Market Sale, a Fire Sale, a poach with each defense, and an Integration.

## Gaps

None that needs a protected file or contradicts a binding call. Checked:
- An ask rides 7-1's `lang:window`, `WINDOW_RULE` and `closeWindow`, so `flow.ts` doesn't change. `SeatRef`, `Waiting`, `PhraseOpts`, `CompiledGame` and `Vocab` widen in the language only, and there is no `CardState` change.
- Every item of the spec's "What the language gains" is a task here:
  - item 1: Tasks 2–4;
  - items 2 and 3: Tasks 6–7;
  - item 4: Tasks 1–2;
  - item 5: Task 5;
  - item 6: Task 8, with no new phrase.

Recorded limits, none blocking slice 8:
- **No button picks three cards.** The poach's destination is named in a second press, in an interrupt after the ask. §16.A names it before the fee, so 8-2 records the order as a call.
- **One ask per button, none in a button of an answering or steps phase** (slice 10 lifts both with nested interrupts).
- **7-1's recorded limit holds for asks.** A button of an answering phase that changes what the waiting lines read, other than stopping them, can make them throw as they go on. The market sale's buy and the counter-offer's buttons stop the action, so it can't arise in slice 8.
- **A pairing reads one column and has no "can't" form.**
- **"With everything on it" keeps each card's zone name.** Launch, whose staff change zone name, keeps its lines.
- **Only the eight size phrases count as public reads of a hidden zone.** A value counting a hidden zone's cards (5-1's `a player's … is the number of the cards in their hand`) is still refused in an ask: conservative.
- **A card fact can't be called `owner`.**
