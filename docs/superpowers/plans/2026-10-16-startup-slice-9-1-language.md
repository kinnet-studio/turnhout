# Startup Simulator Slice 9-1 (Language) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The rules language gains every general piece slice 9 needs that plans 4-1 to 8-3 left out:
- cards that lie face down in a row everyone can see, seen by their owner alone, turned face up again by a line or by any move;
- a view that tells no other seat anything of such a card: not its name, its counts, a value worked out from it, or a total over its row;
- the few things every seat may still read of a card it can't see (whether it lies face down, whose it is, the flags of the cards on it), and nothing else;
- a line after which no other player can follow the card by its id (R1);
- paying what one can, and payments by and to the player who holds a flag;
- proof, in general words, that an offer once around the table, a bid once around from the declarer's left, a reveal and the owner's forced or free choice play with these pieces and 8-1's asks.

All of it is tested with fixtures in general words. Startup Simulator's text does not change.

**Architecture:**
- **This is plan 9-1.** Plan 9-2 writes the rules text and the long runs (it may split as 7-2 and 8-2 did); plan 9-3 the page. Nothing here touches `src/games/**` or `src/pages/**`.
- **Two files outside `lang/` change, as the overview planned:** `src/engine/core/table-def.ts` (`ZoneDef.faceDown`) and `src/engine/core/derive-scene.ts` (`isRevealed`). Neither is protected. No zone of the Hearts demo or of any other game carries the new field, so their scenes are unchanged by construction.
- **Eight tasks.** The spec's "What the language gains" maps onto them like this:
  1. **Face-down cards: the mark, the table and each seat's scene** (item 1).
  2. **Turning a card face down and up, telling how it lies, and the example words** (items 1 and 4).
  3. **What a seat is told of a face-down card** (item 1, R3, the anti-goal).
  4. **What every seat may read of a card it can't see** (item 1; what the Audit's pick needs).
  5. **No other player can tell it from the cards in their zone** (R1; item 4).
  6. **Paying what one can, and payments of the player who holds a flag** (item 3's money).
  7. **An inspection played through** (items 2 and 3, proved in general words).
  8. **The README and the checks.**
- **Where things live.**
  - The table rule: `isRevealed` (`derive-scene.ts`), `ZoneDef.faceDown` (`table-def.ts`); the mark: `setup-phrases.ts`, `ZoneSpec.faceDown` (`types.ts`), `zoneDef` (`auto-layout.ts`); one rule for "does this seat see it": `seenBy` and `seenByAll` (`zones.ts`), which `seesFace` (`board-view.ts`) returns.
  - The face phrases: a new `library/face-phrases.ts`, registered after `registerCardSubjectPhrases`.
  - The view: `board-view.ts` (kept-card names and flags, `SeatExtras.faceDown`), `worked-view.ts` (4-3's `shownPlayerValues` asks `seenByAll`; `flagSeenOnCards`).
  - Public reads: `PhraseOpts.faceBlind` (`phrases.ts`), `readsHiddenFace` (`compile-util.ts`), read by `reportHiddenCardReads` and `mayHideFromPresser` (`compile-phase.ts`), `faceDownReady` (`declared-actions.ts`), `runtime.ts`, and 7-1's and 8-1's walks in `compile.ts`.
  - Renaming: `RENAMED_KEY`, `dealtIdOf`, `renameCards` (`cards.ts`); followed by the examples' claimer (`examples.ts`) and the two `homePileOf` callers (`draw-phrases.ts`, `debt-phrases.ts`).
  - Payments: `board-phrases.ts`; `its owner is …`: `compare-phrases.ts`.
  - New state: `lang:renamed` in `state.data`, written only when cards are renamed. No new key in a card's `data`, no `CardState` change, no new flow rule.
- **Builder calls this plan makes** (the spec leaves wordings to the builder):
  - **The mark.** `Each player has a development row that everyone can see, where cards may lie face down.` Only a row each player has that everyone can see may carry it; one mark per Table line, as 4-1's and 7-1's marks are.
  - **A card lies face down when `faceUp` is false in a zone with the mark.** Its owner (the zone's seat) sees it; every other seat sees a back with no data, its id and slot kept, as for a hidden hand. The mark can't be a bare `faceUp: false` in a public zone: the Hearts demo's won piles are exactly that, and must stay shown.
  - **Every move turns a card face up wherever everyone sees it** (`relocate` already sets `faceUp` from the zone), so a Face-Down Launch, a Fold to the Open Idea Pool or a sale needs no line. `Turn it face down.` and `Turn it face up.` turn a card in place, only in a zone with the mark.
  - **What a seat is told.** Every per-card part of the view already asks `seesFace` (the worked view, 7-1's waiting line, 8-3's prices, 5-3's holder flags, the pickers); `seesFace` now knows the mark. The board view's kept-card names and flags ask it too. What is decided from the rules alone ("does everyone see this zone's cards?") asks `seenByAll`: a public zone without the mark. So 4-3's player totals over a row with the mark are never shown, to anyone (4-3's forward note: "stop showing such a total").
  - **What every seat may read of a card it can't see** (R3, and what the Audit needs): whether it lies face down, whose zone it is in, and the flags of the cards on it when every seat sees those cards and the flag is worked out from them alone. A phrase that reads only the first two is `faceBlind`. `readsHiddenFace` replaces `readsPressCard` wherever a hidden pick was judged. So the Audit's button may refuse a face-up card, another player's card or a shielded one, all public facts, and every other read of the card stays refused when the rules are read.
  - **Untrackable (R1).** `No other player can tell it from the cards in their backlog.`, the last line of a button's `Then:` lines. The card, then the zone's other cards in slot order, take the next ids from `lang:next-card`; the zone's slots are renumbered 0 to n-1; the renamed cards move to the end of `state.cards` in that order, so neither an id, a slot nor a place in the list says which card was picked. R1 foresaw two clashes, and both were found: `homePileOf` (an id beyond the dealt ones belongs to no deck) and the examples' claimer (a renamed card looks unclaimed). Both follow `lang:renamed` back to the dealt id, so R1's fall-back (per-viewer aliases) is not needed and no view code changes for it.
  - **The Audit needs no new flow piece** (items 2 and 3). An offer is an interrupt phase opened by a rule about a player (5-1), so it starts with the first qualifying player in turn order from the active player. The declarer's button holds 8-1's ask, `Each other player has the bidding, in turn from their left.`, which is once around from the declarer's left, and an `Only if` line about a player flag keeps the active player out. The reveal and the verdict are the button's lines after the ask. The owner's Fold and Settle are buttons in the active player's phase, and the forced branch is Settle's guard leaving Fold alone. Task 7 proves this in general words, with R4's restart.
  - **New money lines:** `They pay up to 4 to the high bidder.` and `They pay up to 1.` (the Fold, as far as cash goes, the Whistleblower first; slice 9's call before Bankruptcy), `The high bidder pays the high bid to its owner.` (a clean Audit, usable inside `If …,` where 3-1's `For …,` frame is not), `The high bidder gets 4 coins.` (the bounty). And `its owner is (not) {playerflag}`, a `faceBlind` test.
  - **Example vocabulary:** `Given the Vase in p0's workshop is face down`; `Then … is face down` / `… is face up`; `Then p1 sees …` / `Then p1 can't see …`; `Then p1 can't tell the Statue in p0's workshop from the cards in p0's stash`.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-9-stealth-audits-design.md` is binding, and its "Builder-check rulings" R1–R4 win over its body:
- R1: a Face-Down card can't be followed by its id; at a Face-Down Greenlight the greenlit card and every card left in that player's backlog get fresh ids from `lang:next-card`, keeping slot order, written as an effect in the game's text; per-viewer aliases in the seat view are the fall-back only for games with face-down placement.
- R2: no faking progress; Stalled applies Face-Down too; Ghost Progress is pinned by arranged examples only and recorded as never firing in long runs.
- R3: rivals see each staff card as it is (modes, Pending XP, XP, Skills, Attributes, Onboarding, the `cto`/`vest` marks) and nothing worked out from the hidden card: no Pending Badge, Stalled, need, cut or Feature complete, and no card name in any prompt, verdict reason or tableau line.
- R4: Patent Trolls' $5 Settlement Tag fee; a Fold returns Consultants; the declaration offer restarts from the active player's left after each verdict.

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, binding as amended. Its anti-goals bind especially: hidden information leaking above all; a game that can't end; Startup words in shared code. Its constraint: face-down cards in a public zone reach `derive-scene.ts`, which the Hearts demo also uses, and need a no-regression check on Hearts.

The evidence is `builder-check-startup-9.md` in the session scratchpad (Q1–Q3). Slice 10's spec and builder check say what this plan must leave in place:
- Fold and Settle are built for the active player in the Audit window here; slice 10 generalises them to any owner and no Whistleblower.
- Come Clean offers read only public facts (Partnerships, Tag providers, Face-Down counts, cash) and reveal nothing about a hidden card.
- Nested interrupts become a stack in slice 10; the Audit here holds one interrupt and one ask's window at once.

Plans 4-1 to 8-3 and the speed-up plan (their Interfaces blocks and Global Constraints amendments) are inputs. Their forward notes for slice 9 are met here: the worked view skips a face-down card (Task 3), 4-3's shown player values leave such a row out (Task 3), 5-3's Pending Badge stays off for a seat that can't see the card it is on (Task 3's guard), 7-1's and 8-1's prompts name a face-down card only as `a face-down card` (Tasks 3 and 7), 6-1's and 7-1's picks in another player's zone are judged by the mark (Task 4), and 8-3's prices skip it (Task 3).

## Global Constraints

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.**
  - `lang:renamed` is the only new `state.data` key, written only when cards are renamed; replay stays exact because new ids come from `lang:next-card` in the state.
  - No new key in a card's `data`; no `CardState` change.
  - New fields are optional and left out, never set to `undefined`: `ZoneDef.faceDown`, `ZoneSpec.faceDown`, `SeatExtras.faceDown`, `PhraseOpts.faceBlind`.
  - A game without the new lines builds exactly the same `TableDef`, `FlowDef`, scenes, views and compiled shape as before.
- **No Startup Simulator words in shared code** (code, comments, test names and fixture strings), in every form:
  - plan 8-1's list: 7-1's list (6-1's, 1b-2's, slices 3–7's words) and slice 8's;
  - **slice 9's:** stealth, audit, fold, settle, ghost, bluff, whistleblower, disclose / disclosure, shield, dependency, legality, fraud, bounty, secured, transient, and greenlight (already banned) in every form. "Face down" and "face up" are ordinary card-game words and are allowed.
  - Ordinary words to avoid, beyond 8-1's: "inspect", never "audit"; "give up", never "fold"; "patch up", never "settle"; "come to rest", never "settle", in comments too; "pay up to", never "forgive".
  - **`CREW_GAME`'s hands have a `skill` column.** New fixture lines read `wage`, `pay`, `worth`, `red need`, `dents` or a worked value by its own name.
  - The banned words may appear in `src/games/startup-simulator.*`, `README.md` and `docs/`.
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged; Rent Day keeps its 108 examples. The Hearts demo's tests pass unchanged (the derive-scene change). Startup Simulator compiles with `[]` and its examples pass in the same number as at BASE.
- **Every number comes from the rulebook.** This plan's numbers are fixture numbers. Plan 9-2 cites the rulebook for each of Startup's: $3 opening bid and $1 raise, $5 Fold ($4 to the Whistleblower, $1 to the bank), $3 + $3 per missing Tag (+$3 Ghost Progress only), $4 bounty ($8 under Whistleblower Protection Act), $5 Tag fee under Patent Trolls, $4 Late License ($3 + $1; $5 + $1 under Patent Trolls), +5 / +10 VP Stealth Bonus.
- **Hidden information (3-2's to 8-1's lessons).**
  - What a seat's view shows is decided by the compiled rules alone, and never reveals a hidden card or zone. A card lying face down is a hidden card: no rival's view contains its name, its counts, or a value worked out from it, in board text, captions, badges, gauges, worked values, prompts, verdict reasons or waiting lines.
  - The ids a rival sees must not locate a card it saw face up once that card lies face down (R1, Task 5).
  - `worked-view.ts` counts every phrase of `registerCardSubjectPhrases` and `registerCardValuePhrases` as card-only, with a phrase-set test in `worked-view.test.ts`. **No task here adds a phrase to those registrars**, so that test and `CARDS_ON_IT` stay as they are; the face phrases live in their own registrar and are not card-only (fail closed).
  - Every phrase that reads a card carries its needs flags (`needsCard`, `needsCards`, `needsOnto`, `needsMove`), so `readsPressCard`, `readsHiddenFace` and `reportHiddenCardReads` judge it.
- **Every new phrase that changes a card's count or flag declares `writes`.** None here does: turning a card changes `faceUp`, not a fact, and renaming changes ids.
- **Refuse what strands play.** A game that can't end, or a press that silently does nothing, is an anti-goal.
  - Task 2 refuses, when the rules are read, a line that turns a card in a game with no row that may hold one face down; at runtime, turning a card anywhere else is a RuleError, so the press is refused.
  - Task 5 refuses the renaming line anywhere but last in a button's `Then:` lines, and refuses to rename a card on a card or with one on it.
  - Task 6's payments name the player who holds a flag; none or two is a RuleError, so the press is refused.
  - Task 7's inspection loop ends in every case its examples cover: every player passes, a clean verdict, a caught card given up or patched up, two players with no one to bid.
- **Existing code and tests.**
  - New imported names go on new `import` lines in existing files.
  - Existing test lines don't change unless a task names them; no task here names one. Tests may be appended and fixtures added to `testing.ts`.
  - If any other existing test fails, stop and report it instead of changing it.
  - **After widening a type, run `bun run typecheck` and read every narrowing on it.** At the time of writing:
    - `ZoneDef` (Task 1): `isRevealed`'s parameter, `zoneDef`, `fittedLayout`'s defs, `validateTableDef`;
    - `ZoneSpec` (Task 1): the zone functions in `setup-phrases.ts`, `zoneDef`, `fitsTable`, `fittedLayout`, the zone checks in `compile.ts`;
    - `SeatExtras` (Task 3): `readSeatExtras` and its `is…` helpers;
    - `PhraseOpts` (Task 4): `RegisteredOpts`' defaults in `phrases.ts`, with 7-1's `needsActing` and 8-1's `countsOnly`;
    - whatever plans 4-2 to 8-3 added on those types.
- **Earlier plans come first.**
  - In execution order: 4-1 (built), 4-2, the speed-up plan, 4-3, 5-1, 5-2a, 5-3 Task 1, 5-2b, 5-3 Tasks 2–4, 6-1, 6-3 Task 1, 6-2a, 6-2b, 6-3 Tasks 2–5, 7-1, 7-2a, 7-2b, 7-3, 8-1, 8-2a, 8-2b, 8-3.
  - Their code is named here as their Interfaces blocks name it. Lang modules read `zoneCards` and `cardById` from `zone-index.ts` (the speed-up plan); new code does too.
  - Each task re-checks, at HEAD and by name, the names it consumes, and stops and reports one that differs.
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1: record `BASE=$(git rev-parse HEAD)`, run `bun run test` once for the passing count, and note Startup Simulator's example count.
- **Style.**
  - 2-space indent, single quotes, chainable registrars, comments that say why.
  - Commit prefix `feat(lang):`; Task 1's is `feat(core):` (it reaches `derive-scene.ts`) and Task 8's `docs:`.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.
  - A test marked "(guard)" passes before and after its task.
  - `lineOf(text, line)` is `text.split('\n').indexOf(line) + 1`; define it locally where needed.
  - Each fixture `.replace` must find its text: assert it in the test that first uses the fixture.
- **Fixture words** (general, never Startup's): veil, veiled, slip, show, dents, asking price, red force, red load, peek at, watched, guarding, return, inspect, inspection, inspected, offer, offered, pass the offer, bidding, raise, high bid, high bidder, pass the bid, caught, faulty, open, skipped, give up, patch up.

## Review Focus

- **A card lying face down that moves: to a row everyone sees, to a row only its owner sees, back into its own row; and one turned where cards can't lie face down.**
  - Expected: face up to all; hidden as that row hides cards, and never face down to its owner; face up on arrival; a RuleError naming the row.
  - Tests: Task 2.
- **A pick from another player's row with the mark, whose line reads the card's face, its owner, whether it lies face down, or the flags of the cards on it; and the press of such a card.**
  - Expected: the face refused when the rules are read; the other three allowed; the view's verdict and the engine's agree; a refusal names no card.
  - Tests: Task 4.
- **Two different cards slipped face down from the same table; an example Given after a slip; a renamed card sent back to the pile it came from; undo and replay.**
  - Expected: identical rival scenes; the slipped card is not claimed again; it reaches its pile; the same state.
  - Tests: Task 5.
- **Paying up to N with less than N, with nothing, and with no one or two players holding the flag.**
  - Expected: what they have, never a debt; nothing; a RuleError naming the flag.
  - Tests: Task 6.
- **The Hearts demo and every game without the mark.**
  - Expected: scenes, tables, views and example counts unchanged.
  - Tests: Tasks 1, 3 and 8.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name, not by line. If one is missing or differs, stop and report it.

- **Plan 4-1, built:** `putOn`, `cardsOn`, `holderIdOf`, `attachmentProblem` (`attach.ts`); `HOLDER_KEY`, `relocate`, `toBottom`, `zoneIdFor`, `zoneInfo` (`zones.ts`); `every card on it goes to {zone}`; `every card in {zone} is (not) {cardflag}`; `no card in {zones} is {cardflag}`; `they have (no) card in {zones} {cardclause}`; `linesDoing`, `effectsOf` (`compile.ts`); `CREW_GAME`.
- **The speed-up plan:** `zoneCards`, `cardById` (`zone-index.ts`).
- **Plan 4-3:** `shownPlayerValues` and its zone test, `PlayerValuesView`, `SeatExtras.playerValues`.
- **Plan 5-1:** `ownerOf` (`support.ts`); rules about a player (`PLAYER_FRAME`, `playersInTurnOrder`), asked in turn from the player whose turn last started; `the card it is on is {cardclass}` outside the card-only set.
- **Plan 5-3:** `pressFlags`, `holderFlags` and the fixture its Task 2 pins them with; `readsOnlyCards`'s `holder` parameter.
- **Plan 6-3:** worked-view's `centre` reading and `inPlayZones`.
- **Plan 7-1:** `OBJECT_GAME`, `MAKER_GAME`; `WaitingView`, `waitingView`, `SeatExtras.waiting`; `WINDOW_READS_HIDDEN` and the walk of what the window clause reads (private in `compile.ts`); `NO_OWNER`; `its owner has at least {int} cards in their {perzone}` (`compare-phrases.ts`); `the {phase} phase starts with its owner`.
- **Plan 8-1:** `ASK_LINE`, `ASK_FRAME`, `windowPhases`, `ASK_GAME`; the checks of what an ask reads; `PhraseOpts.countsOnly`; the zone `its owner's <zone>` (`SeatRef` `{ who: 'owner' }`); `runButtonLines`, `closeWindow`.
- **Plan 8-3:** `PricesView`, `SeatExtras.prices`.
- **Plans 4-2 to 8-2b:** whatever they added to `board-view.ts`, `worked-view.ts`, `compile-phase.ts` and the README. Leave it as found.
- **The language at HEAD:**
  - `isRevealed`, `projectCard`, `deriveScene`, `HIDDEN_FACE_KEY` (`derive-scene.ts`); `ZoneDef` (`table-def.ts`);
  - `ZoneSpec` (`types.ts`); the row lines and `MARK_NEEDS_EVERYONE` (`setup-phrases.ts`); `zoneDef` (`auto-layout.ts`); `fittedLayout`; `tableDefFor` (`build.ts`);
  - `seesFace`, `cardsKept`, `flagsOnCard`, `boardView`, `workedView`, `pickedAs`, `faceDownVerdict`, `seatExtras`, `readSeatExtras` (`board-view.ts`);
  - `readsPressCard`, `matchEffectLine`, `innerEffect` (`compile-util.ts`); `mayHideFromPresser`, `reportHiddenCardReads`, `tellsHiddenCard`, `choiceGroups` (`compile-phase.ts`);
  - `readsOnlyCards`, `cardsOnCardsArePublic`, `isWorked` (`worked-view.ts`); `CARDS_ON_IT` (`card-subject-phrases.ts`);
  - `faceDownReady` (`declared-actions.ts`); `runtime.readsCard`, `runtime.failedGroup`;
  - `NEXT_CARD_KEY`, `makeCard`, `deckOf`, `homePileOf` (`cards.ts`); `claimer`, `byCardId` (`examples.ts`); `keptGoesBack` (`draw-phrases.ts`), `everythingGoesToCreditor` (`debt-phrases.ts`);
  - `transfer`, `payCounter`, `they pay {int}` (`board-phrases.ts`); `holderOf`, `OWES_KEY` (`board-state.ts`); `they pay the {gamenumber} to {holder}` (`game-numbers.ts`); the `{holder}` type (`refs.ts`);
  - `acceptFacts` (`compile.ts`); `REGISTRARS` (`library/index.ts`); `HOLDING_BOARD`, `fixtureEnv`, `runPhrase`, `vocabFor` (`testing.ts`).

---

### Task 1: Face-down cards in a row everyone can see: the mark, the table and each seat's scene

Before starting: re-check `isRevealed`, `projectCard`, `deriveScene`, `ZoneDef`, `ZoneSpec` (with 7-1's `across`), the row lines in `setup-phrases.ts` and `MARK_NEEDS_EVERYONE`, `zoneDef`, `fittedLayout`, `tableDefFor`, `zoneInfo` and `seesFace`.

**Files:**
- Modify: `src/engine/core/table-def.ts` (`ZoneDef.faceDown`), `src/engine/core/derive-scene.ts` (`isRevealed` and its comment).
- Modify: `src/engine/core/lang/types.ts` (`ZoneSpec.faceDown`), `library/setup-phrases.ts` (three zone lines), `auto-layout.ts` (`zoneDef`), `zones.ts` (`seenBy`, `seenByAll`), `board-view.ts` (`seesFace` returns `seenBy`).
- Test: `src/engine/core/derive-scene.test.ts`, `src/engine/core/lang/compile.test.ts`, `src/engine/core/lang/auto-layout.test.ts`, `src/engine/core/lang/zones.test.ts` (all appended).

**Interfaces:**
- Consumes: the names above.
- Produces (for Tasks 2–7 and plans 9-2, 9-3):

```ts
// table-def.ts — ZoneDef gains, left out otherwise
/** Cards may lie face down here though the zone is public: one with `faceUp: false` is seen only by `owner`, and through `revealTo`. */
faceDown?: true;
// derive-scene.ts
export function isRevealed(card: CardState, zone: Pick<ZoneDef, 'visibility' | 'owner' | 'faceDown'> | undefined, viewer: PlayerId): boolean;
//   a card with faceUp false in a zone with faceDown is revealed to zone.owner and through revealTo only; every other card as before
// lang/types.ts — ZoneSpec gains faceDown?: true, left out otherwise
// setup-phrases.ts
'each player has a {name} row that {visibility}, where cards may lie face down'      // playerRow + faceDown: true
'each player has an {name} row that {visibility}, where cards may lie face down'
'the {name} is a {layout} in the center that {visibility}, where cards may lie face down'   // always RuleError FACE_DOWN_NEEDS_OWNER
const FACE_DOWN_NEEDS_EVERYONE =
  'Only a row everyone can see can end with “, where cards may lie face down”: in any other zone the other players see no face already.';
const FACE_DOWN_NEEDS_OWNER = 'Only a zone each player has can hold cards face down: its owner is the one who sees them.';
// auto-layout.ts — zoneDef(spec, …) adds faceDown: true when spec.faceDown; fittedLayout's defs come through it
// zones.ts
/** Whether `seat` sees the card's face: the table's rule (isRevealed) asked of the card's zone as the game lays it out. */
export function seenBy(game: CompiledGame, card: CardState, seat: PlayerId): boolean;
/** Whether every seat sees the face of every card in the zone: everyone can see it, and no card there may lie face down. */
export function seenByAll(spec: ZoneSpec): boolean;
// board-view.ts — seesFace(game, card, seat) keeps its signature and returns seenBy(game, card, seat)
```

- `deriveScene`'s render zones don't carry `faceDown`: the renderer draws what `projectCard` gives it and needs nothing new.

- [ ] **Step 1: Write the failing tests.**
  - **The table rule** (`derive-scene.test.ts`, `describe('a card lying face down in a zone everyone can see')`), with `const down = zone({ visibility: 'public', owner: 'me', faceDown: true })`:
    - `isRevealed(card(), down, 'me')` is true and `isRevealed(card(), down, 'opp')` false;
    - `isRevealed(card({ faceUp: true }), down, 'opp')` is true;
    - `isRevealed(card({ revealTo: ['opp'] }), down, 'opp')` is true.
    - With a def whose one zone is `{ id: 'row', layout: 'row', transform: { x: 0, y: 0 }, owner: 'me', visibility: 'public', faceDown: true }` and the card `{ id: 'r1', zoneId: 'row', faceUp: false, faceKey: 'AS', slot: 2, data: { suit: 'S', rank: 1 } }`:
      - `deriveScene(def, placement, 'opp').cards[0]` is `{ id: 'r1', zoneId: 'row', faceUp: false, faceKey: HIDDEN_FACE_KEY, slot: 2, data: {} }`;
      - for `'me'` it has `faceUp: true`, `faceKey: 'AS'` and its data;
      - `deriveScene(def, placement).zones[0]` has no `faceDown` key.
    - (guard) The same card in the same zone without `faceDown` is revealed to `'opp'` with its face.
  - **The mark** (`compile.test.ts`, `describe('cards that lie face down')`). `MARKED` is `CREW_GAME` with `  Each player has a workshop row that everyone can see.` replaced by `  Each player has a workshop row that everyone can see, where cards may lie face down.` (assert the replace finds its text):
    - it compiles with `[]`;
    - its workshop spec is `{ name: 'workshop', perPlayer: true, layout: 'row', visibility: 'public', faceDown: true }`, and no other zone has a `faceDown` key;
    - (guard) no zone of `compiled(CREW_GAME)` has one;
    - `  Each player has a stash row that only they can see, where cards may lie face down.` in its place gives `FACE_DOWN_NEEDS_EVERYONE` on its line;
    - `  The scrap is a row in the center that everyone can see, where cards may lie face down.` gives `FACE_DOWN_NEEDS_OWNER` on its line.
  - **The table** (`auto-layout.test.ts`):
    - `tableDefFor(compiled(MARKED), ['p0', 'p1'])`'s `workshop-p0` has `faceDown: true` and `owner: 'p0'`, and no other def has a `faceDown` key;
    - `fittedLayout(compiled(MARKED).zones, 'p0')`'s `workshop-p0` has `faceDown: true`;
    - (guard) no def of `tableDefFor(compiled(CREW_GAME), ['p0', 'p1'])` has the key.
  - **Who sees it** (`zones.test.ts`, with `compiled(MARKED)`):
    - `seenByAll` is false for the workshop, the stash and the pile, and true for the hall, the scrap, the crew and the idle;
    - a card in `workshop-p0` with `faceUp: false`: `seenBy` is true for p0 and false for p1; with `faceUp: true`, true for p1;
    - a card in `stash-p0`: true for p0, false for p1;
    - (guard) `seesFace` gives the same as `seenBy` in each case.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/derive-scene.test.ts src/engine/core/lang/compile.test.ts src/engine/core/lang/auto-layout.test.ts src/engine/core/lang/zones.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `ZoneDef` and `ZoneSpec`.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine src/games src/pages/hearts-demo src/pages/designer`, `bun run test` and `bun run typecheck`. The Hearts demo's tests pass unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/table-def.ts src/engine/core/derive-scene.ts src/engine/core/lang/types.ts \
  src/engine/core/lang/library/setup-phrases.ts src/engine/core/lang/auto-layout.ts src/engine/core/lang/zones.ts \
  src/engine/core/lang/board-view.ts src/engine/core/derive-scene.test.ts src/engine/core/lang/compile.test.ts \
  src/engine/core/lang/auto-layout.test.ts src/engine/core/lang/zones.test.ts
git commit -F - <<'EOF'
feat(core): a row each player has may hold cards face down, seen by their owner alone; every other seat's scene shows a back with nothing on it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: Turning a card face down and up, telling how it lies, and the example words

Before starting: re-check Task 1's names, `itCard`, `cardName`, how `attachmentProblem` names a card's place (`the Vase in p0's workshop`), the example helpers that find `{card} in {zone}` (`cardHasOnItGiven` and its finder), `acceptFacts` and 8-1's `OWNER_IS_TAKEN`, `linesDoing`, `effectsOf`, the every-phase and Setup lines `compile` walks, `REGISTRARS`, `relocate`, `CREW_GAME`.

**Files:**
- Create: `src/engine/core/lang/library/face-phrases.ts`, `src/engine/core/lang/library/face-phrases.test.ts`.
- Modify: `src/engine/core/lang/library/index.ts` (`registerFacePhrases` right after `registerCardSubjectPhrases`), `compile.ts` (`NO_FACE_DOWN_ZONE`, `FACE_IS_TAKEN`), `testing.ts` (`VEIL_GAME`).
- Test: `library/face-phrases.test.ts` (new), `compile.test.ts` (appended).

**Interfaces:**
- Consumes: Task 1's `seenBy`; `itCard`, `zoneInfo`, `relocate`.
- Produces (for Tasks 3–8 and plan 9-2):

```ts
// face-phrases.ts
export const TURN_FACE_DOWN = 'turn it face down';   // effect, needsCard: faceUp false; RuleError CANT_LIE_FACE_DOWN unless its zone has faceDown
export const TURN_FACE_UP = 'turn it face up';       // effect, needsCard: faceUp true; the same RuleError
'it is face down'   // condition, needsCard: its zone has faceDown and its faceUp is false
'it is face up'     // condition, needsCard: its zone is public and it is not face down; in a zone not everyone sees, neither holds
'{card} in {zone} is face down'        // given (turns it, with the effect's RuleError) and expect
'{card} in {zone} is face up'          // expect
'{player} sees {card} in {zone}'       // expect: seenBy
"{player} can't see {card} in {zone}"  // expect: not seenBy
export function registerFacePhrases(lib: PhraseLibrary): PhraseLibrary;
export const CANT_LIE_FACE_DOWN = (place: string) => `Cards don't lie face down in ${place}: end its Table line with “, where cards may lie face down”.`;
// compile.ts
const NO_FACE_DOWN_ZONE = 'No zone lets cards lie face down: end the Table line of the zone they lie in with “, where cards may lie face down”.';
const FACE_IS_TAKEN = '“face down” and “face up” already say how a card lies; give the fact another name.';
```

- `${place}` names the card's zone as `attachmentProblem` names a card's place: `the scrap`, `p0's stash`.
- **The expect messages** (`${card}` is `the Statue in p0's workshop`):
  - `Expected ${card} to lie face down, but it is face up.` / `Expected ${card} to be face up, but it lies face down.`
  - `Expected ${seat} to see ${card}, but it is face down to them.` / `Expected ${seat} not to see ${card}, but they see its face.`
- **`NO_FACE_DOWN_ZONE`**: when no zone has `faceDown`, each line `linesDoing` finds among Setup, the says cells, the every-phase rules and every phase's `effectsOf` whose phrase is `TURN_FACE_DOWN` or `TURN_FACE_UP` gets it on its line.
- **`FACE_IS_TAKEN`**: a card fact declared as `face down` or `face up`, in any capitals, gets it on its line and is left out of `game.facts`, as 8-1's `owner`.
- **`testing.ts`:**

```ts
/**
 * CREW_GAME whose workshops may hold jobs face down: a player may slip a job from their stash into their workshop face down, and show a
 * face-down job again. Jobs gather dents. A job's asking price is its worth plus the skill of the hands on it; a job is veiled while it lies
 * face down; a player's red force is the skill of their crew and their red load the red need of their workshop.
 */
export const VEIL_GAME = [
  CREW_GAME
    .replace('  Cards can be tired.', '  Cards can be tired.\n  Cards can have dents.')
    .replace('  Each player has a workshop row that everyone can see.',
      '  Each player has a workshop row that everyone can see, where cards may lie face down.')
    .replace('  A player may stop.', ['  A player may slip a card in their stash.', '    Then:', '      Move it to their workshop.',
      '      Turn it face down.', '  A player may show a card in their workshop.', '    Only if it is face down.', '    Then:',
      '      Turn it face up.', '  A player may stop.'].join('\n')), '',
  'Asking price:', "  A card's asking price is its worth.", "  A card's asking price goes up by the total skill of the cards on it.", '',
  'Veiled:', '  Only if it is face down.', '',
  'Red force:', "  A player's red force is the total skill of the cards in their crew.", '',
  'Red load:', "  A player's red load is the total red need of the cards in their workshop.",
].join('\n');
```

- [ ] **Step 1: Write the failing tests** in `face-phrases.test.ts`.
  - **Setup.** A 3-player `VEIL_GAME` engine on p0's turn in working; `stash-p0` holds a Vase and a Statue (`statue`), moved there with `relocate`. Each case starts from that table.
  - **Slipped and shown.** p0 slips the Statue:
    - it is in `workshop-p0` with `faceUp` false;
    - through `runPhrase` about it, `it is face down` is true and `it is face up` false; `runtime.workedFlag(state, statue, 'veiled')` is true;
    - p0 shows it: `faceUp` true, `it is face up` true, `veiled` false;
    - p0 showing it again is refused with `it is face down`.
  - **Where it may lie** (Review Focus):
    - `turn it face down` about a Vase in the scrap throws `Cards don't lie face down in the scrap: end its Table line with “, where cards may lie face down”.`; about the Vase in `stash-p0`, the same with `p0's stash`; `turn it face up` likewise;
    - about the Vase in `stash-p0`, `it is face down` and `it is face up` are both false; about a Potter in the hall, `it is face up` is true.
  - **Moves turn it face up** (Review Focus). From the slipped Statue, with `relocate`:
    - to `idle-p0`: `faceUp` true, and `seenBy` p1 true;
    - to `stash-p0`: `faceUp` false; `seenBy` p0 true and p1 false; `it is face down` false;
    - back to `workshop-p0`: `faceUp` true.
  - **The example words** (`runExamples` on `VEIL_GAME` with these appended):

```text
Example: a job slipped face down is seen by its owner alone
  Given 3 players
  And p0's stash has a Statue
  When p0 slips the Statue
  Then the Statue in p0's workshop is face down
  And p0 sees the Statue in p0's workshop
  And p1 can't see the Statue in p0's workshop
  When p0 shows the Statue
  Then the Statue in p0's workshop is face up
  And p1 sees the Statue in p0's workshop

Example: a Given lays a job face down
  Given 3 players
  And p0's workshop has a Vase
  And the Vase in p0's workshop is face down
  Then p2 can't see the Vase in p0's workshop
```

    - Both pass.
    - With `Then the Statue in p0's workshop is face up` right after the slip, the first fails with `Expected the Statue in p0's workshop to be face up, but it lies face down.`; with `Then p1 sees the Statue in p0's workshop` there, with `Expected p1 to see the Statue in p0's workshop, but it is face down to them.`
    - `And the Vase in the scrap is face down` as a Given, after `And the scrap has a Vase`, fails with `Cards don't lie face down in the scrap: …`.
  - **Refused when the rules are read** (`compile.test.ts`, `describe('turning cards')`):
    - `CREW_GAME` with `      Turn it face down.` added under start's `Then:` gives `NO_FACE_DOWN_ZONE` on that line;
    - `VEIL_GAME` with `  Cards can be face down.` added under `  Cards can be tired.` gives `FACE_IS_TAKEN` on its line, and `game.facts` has no `face down`;
    - (guard) `VEIL_GAME` compiles with `[]`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/face-phrases.test.ts src/engine/core/lang/compile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. A Startup or board-game line now read two ways is an `ambiguous` diagnostic: stop and report it.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/face-phrases.ts src/engine/core/lang/library/face-phrases.test.ts \
  src/engine/core/lang/library/index.ts src/engine/core/lang/compile.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/compile.test.ts
git commit -F - <<'EOF'
feat(lang): a card turned face down or up where its row allows it, tests of how it lies, and example words for what each seat sees

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: What a seat is told of a card that lies face down

Before starting: re-check `seatExtras` and every part of `SeatExtras` plans 4-3 to 8-3 added (`playerValues`, `waiting`, `prices`), `readSeatExtras` and its `is…` helpers, `boardView`, `cardsKept`, `flagsOnCard`, `workedView`, 4-3's `shownPlayerValues` and its zone test, 5-3's `holderFlags` and the fixture its Task 2 pins them with, 7-1's `waitingView` and `OBJECT_GAME`, `HOLDING_BOARD`, Task 1's `seenBy` and `seenByAll`, Task 2's `VEIL_GAME`. Then grep `'public'` in `src/engine/core/lang` (tests left out) and sort every hit into these kinds; report any that fits none:
1. Where an arriving card turns face up (`relocate`, `toBottom`, queue placement): unchanged.
2. How the table is drawn (fit-layout's private strip): unchanged.
3. Where cards may sit on cards, and their holders (`setup-phrases.ts`, `compile.ts`'s holders check, `attachmentProblem`): unchanged. A holder may lie face down; what sits on it stays seen.
4. Whether every seat sees a zone's cards, decided from the rules: `seenByAll`. At writing:
   - 4-3's `shownPlayerValues`;
   - `cardsOnCardsArePublic`: a zone of cards on cards can't carry the mark (one mark per line), so it is unchanged in effect; switch it to `seenByAll` and say so in its comment;
   - 6-3's `centre` reading: a zone in the center can't carry the mark; switch it all the same;
   - 7-1's window walk and 8-1's ask checks are Task 4's.

**Files:**
- Modify: `src/engine/core/lang/board-view.ts` (kept-card names and flags, `SeatExtras.faceDown`, `readSeatExtras`), `worked-view.ts` (the kind-4 checks above).
- Test: `src/engine/core/lang/board-view.test.ts`, `src/engine/core/lang/worked-view.test.ts` (appended).

**Interfaces:**
- Consumes: Tasks 1–2; the names above.
- Produces (for plan 9-3):

```ts
// board-view.ts
// BoardView.playerCards / playerCardFlags: a kept card `seat` doesn't see (seesFace) is named 'a face-down card' and has no flags
// SeatExtras gains:
faceDown?: string[];   // the ids of the cards `seat` sees that lie face down to the other seats (its own), in Table order then slot order;
                       // left out when none. readSeatExtras accepts it when absent or a list of text, and returns null otherwise.
```

- [ ] **Step 1: Write the failing tests.**
  - **Every per-card part of a seat's view** (`board-view.test.ts`, `describe('what each seat is told of a card lying face down')`):
    - **Setup.** A 3-player `VEIL_GAME` engine on p0's turn in working. `stash-p0` holds a Vase and a Statue (`statue`); every other job is in the pile. p0 slips the Statue. Then, on the state: the Statue has `dents: 2`; with `putOn`, a tired Potter and a Smith sit on it in `crew-p0`.
    - For p1 and p2, with `scene = deriveScene(tableDef, { cards: state.cards }, seat)` and `extras = seatExtras(engine, runtime, state, seat)`:
      - the Statue's scene card is `{ id: statue, zoneId: 'workshop-p0', slot, faceUp: false, faceKey: HIDDEN_FACE_KEY, data: {} }`;
      - `JSON.stringify({ scene, extras })` contains neither `Statue` nor `dents`;
      - no per-card map of `extras` (`worked`, 8-3's `prices`, any added since) has the key `statue`;
      - `extras.playerValues` has `red force` for every seat and no `red load` anywhere;
      - `extras.faceDown` is undefined;
      - the Potter's and the Smith's scene cards are face up with their names, `skill`, `wage`, the Potter's `tired`, and `lang:on` the Statue (R3: rivals see the staff as it is).
    - For p0: the Statue is face up with `dents: 2`; `extras.worked[statue].columns.worth` is 7 (4 + 1 + 2); `extras.faceDown` is `[statue]`.
    - After p0 shows the Statue: p1's scene card has its face and `dents: 2`; p1's `extras.worked[statue].columns.worth` is 7; p0's `faceDown` is undefined.
  - **A board game** (same `describe`). `HOLDING_BOARD` with `  Each player has a kept cards row that everyone can see.` marked: a 2-player engine; `kept-cards-p0` holds a Pass that is lent and lies face down.
    - p1's `board.playerCards.p0` is `['a face-down card']` and `playerCardFlags.p0` is `[[]]`;
    - p0's are `['Pass']` and `[['lent']]`.
  - (guard) **A waiting action** (7-1). `OBJECT_GAME` with its workshop row marked (assert the replace finds its text). p0 hires a Potter onto a Vase lying face down in `workshop-p0` while the window waits:
    - p1's `waiting.cards` is `['Potter', 'a face-down card']`, and `JSON.stringify(p1Extras.waiting)` contains no id;
    - p0's is `['Potter', 'Vase']`.
  - (guard) **A flag read through the card it is on** (5-3). 5-3 Task 2's fixture with a non-empty `holderFlags`, its holders' row marked and the holder turned face down: the flag is in p0's `worked` entry for the card on it and absent from p1's.
  - **`readSeatExtras`** returns extras with `faceDown: ['c1']` unchanged, and null for `faceDown: [1]`.
  - **Player values** (`worked-view.test.ts`, `describe('player values over a row where cards may lie face down')`):
    - `shownPlayerValues(compiled(VEIL_GAME))` is `['red force']`;
    - `CREW_GAME` with `VEIL_GAME`'s `Red force:` and `Red load:` sections appended (no mark, no turning lines) gives `['red force', 'red load']`;
    - (guard) Startup's `shownPlayerValues` pin and the board games' views pass unchanged.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/board-view.test.ts src/engine/core/lang/worked-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `SeatExtras`.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`. The designer page tests pass unchanged: they ignore a key they do not read.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/board-view.ts src/engine/core/lang/worked-view.ts \
  src/engine/core/lang/board-view.test.ts src/engine/core/lang/worked-view.test.ts
git commit -F - <<'EOF'
feat(lang): no other seat's view names, counts or works anything out from a card lying face down, and a seat is told which of its own cards lie so

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: What every seat may read of a card it can't see

Before starting: re-check `readsPressCard` and `cardArgsOf`, `reportHiddenCardReads`, `mayHideFromPresser`, `tellsHiddenCard`, `choiceGroups`, `faceDownReady`, `faceDownVerdict`, `runtime.readsCard`, `runtime.failedGroup`, `PhraseOpts`/`RegisteredOpts` and their defaults (with 7-1's `needsActing` and 8-1's `countsOnly`), `CARDS_ON_IT`, `readsOnlyCards` and its parameters at HEAD (5-3's `holder`, 6-3's `centre`), `isWorked`, 5-1's `ownerOf`, compare-phrases' registrations, 7-1's walk of what the window clause reads and `WINDOW_READS_HIDDEN`, 8-1's checks of what an ask reads, `OBJECT_GAME`, `ASK_GAME`, Task 1's `seenByAll`, Task 2's face conditions.

**Files:**
- Modify: `src/engine/core/lang/phrases.ts` (`PhraseOpts.faceBlind`), `library/face-phrases.ts` (the two conditions), `library/compare-phrases.ts` (two conditions), `compile-util.ts` (`readsHiddenFace`), `worked-view.ts` (`flagSeenOnCards`), `compile-phase.ts` (`mayHideFromPresser`, `reportHiddenCardReads`), `compile.ts` (passes `flagSeen`; 7-1's and 8-1's walks), `runtime.ts` (`readsHiddenFace`), `declared-actions.ts` (`faceDownReady`).
- Modify: `src/engine/core/lang/testing.ts` (`PEEK_GAME`).
- Test: `compile-phase.test.ts`, `worked-view.test.ts`, `board-view.test.ts`, `action-window.test.ts` (all appended).

**Interfaces:**
- Consumes: the names above.
- Produces (for Tasks 6–7 and plan 9-2):

```ts
// phrases.ts — PhraseOpts gains
faceBlind?: boolean;   // reads nothing of a card's face: only whether it lies face down and whose zone it is in, which every seat sees
// face-phrases.ts — 'it is face down' and 'it is face up' gain faceBlind: true
// compare-phrases.ts — conditions, needsCard, faceBlind; a card in no player's zone: false
'its owner is {playerflag}'
'its owner is not {playerflag}'
// worked-view.ts
/**
 * Whether a seat that sees the cards on a card sees whether one is so: every zone of cards on cards is seenByAll, and the flag is one cards
 * keep or a worked flag whose lines read only the card and the cards on it (readsOnlyCards, never the card it is on).
 */
export function flagSeenOnCards(game: Pick<CompiledGame, 'zones' | 'worked'>, flag: string): boolean;
// compile-util.ts
/**
 * readsPressCard, less each ref that reads the press's cards only through what every seat sees of a card it can't see: a faceBlind phrase,
 * or a CARDS_ON_IT phrase ('some card on it is …', 'no card on it is …') whose flag `flagSeen` passes.
 */
export function readsHiddenFace(library: PhraseLibrary, group: CondGroup, flagSeen: (flag: string) => boolean): boolean;
// compile-phase.ts
// mayHideFromPresser: a zone with faceDown may hide its cards from every seat but its owner, so from the presser unless it is `their …`
export function reportHiddenCardReads(phase: CompiledPhase, zones: ZoneSpec[], ctx: LineCtx, flagSeen: (flag: string) => boolean): void;
//   reports a group when readsHiddenFace holds for it (was readsPressCard)
// compile.ts
//   - passes (flag) => flagSeenOnCards({ zones, worked: values }, flag) to reportHiddenCardReads;
//   - 7-1's window walk and 8-1's ask checks report a zone that is not seenByAll (was: not 'public'), and judge the press's cards'
//     lines with readsHiddenFace (was readsPressCard)
// runtime.ts
readsHiddenFace(group: CondGroup): boolean;   // readsHiddenFace with this game's flagSeenOnCards
// declared-actions.ts — faceDownReady: the groups it judged before, as before; then the groups for which readsPressCard holds and
//   readsHiddenFace does not, about the seat with the card as “it” (and, for a button with a card to go to, `onto` as the target card)
```

- **`testing.ts`:**

```ts
/**
 * VEIL_GAME where a player may peek at another player's face-down job, adding a dent, while its owner is not watched and no untired Smith
 * on it is guarding it.
 */
export const PEEK_GAME = [
  VEIL_GAME
    .replace('  Players pay with coins.', '  Players pay with coins.\n  Players can be watched.')
    .replace('  A player may stop.', ["  A player may peek at a card in another player's workshop.", '    Only if its owner is not watched.',
      '    Only if it is face down.', '    Only if no card on it is guarding.', '    Then:', '      It gains 1 dent.', '  A player may stop.'].join('\n')),
  '', 'Guarding:', '  Only if it is a Smith card.', '  Only if it is not tired.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**
  - **Read when the rules are read** (`compile-phase.test.ts`, `describe('reading a card that may lie face down')`):
    - `PEEK_GAME` compiles with `[]`;
    - `    Only if it is a Vase card.` added under peek gives `tellsHiddenCard("another player's workshop")` on its line; so does `    Only if its dents are 0.`;
    - with `  Only if the card it is on is tired.` added under `Guarding:`, `    Only if no card on it is guarding.` gets it; with `  Only if its owner has at least 2 cards in their stash.` instead, it gets it too;
    - (guard) `CREW_GAME` with `  A player may peek at a card in another player's workshop.` / `    Only if it is a Vase card.` / `    Then:` / `      It is tired.` added above `  A player may stop.` compiles with `[]`: a row everyone sees hides nothing (`VEIL_GAME` unmarked would trip `NO_FACE_DOWN_ZONE` on its turning lines);
    - (guard) every existing hidden-pick test (1b-1's, 6-1's, 7-1's) passes unchanged.
  - **The helpers** (`worked-view.test.ts`, `describe('what every seat sees of a card it cannot see')`), with `compiled(PEEK_GAME)`:
    - `flagSeenOnCards(game, 'guarding')` and `flagSeenOnCards(game, 'tired')` are true;
    - with `  Only if the card it is on is tired.` under `Guarding:`, `guarding` is false;
    - for each of peek's `Only if` groups, `readsPressCard` is true for the three about the card and `readsHiddenFace` is false for all four.
  - **The view and the press** (`board-view.test.ts`, `describe('picking a card another seat sees face down')`). A 3-player `PEEK_GAME` engine on p1's turn in working; `workshop-p0` holds, in slot order, a Vase lying face down (`v`), a Statue lying face down with an untired Smith on it (`s`), and a Vase face up (`u`).
    - p1's peek button lists, in slot order, `{ id: v, name: 'a face-down card', allowed: true }`, `{ id: s, name: 'a face-down card', allowed: … }` and `{ id: u, name: 'Vase', allowed: … }`, where the two verdicts are the view's words (`friendlyReason`) for `no card on it is guarding` and `it is face down`; no entry has `choices`.
    - With p0 watched, every entry's verdict is the view's words for `its owner is not watched`.
    - **Review Focus.** `engine.dispatch` of p1 peeking `s` is `{ ok: false, reason: … }` with the reason for `no card on it is guarding`; neither the reason nor p1's view contains `Statue`.
    - p1 peeking `v` is accepted: `v` has 1 dent, lies face down, and p1's scene shows it as a back with `data: {}`.
  - **Windows and asks** (`action-window.test.ts`, `describe('cards that may lie face down, asked about')`):
    - `OBJECT_GAME` with its workshop row marked and its window clause reading `has a card in their workshop whose name is Vase` gives `WINDOW_READS_HIDDEN('their workshop')` on the window line; (guard) unmarked, the same clause compiles;
    - `ASK_GAME` with its workshop row marked gives `WINDOW_READS_HIDDEN('their workshop')` on the auction's ask line, whose `Only if they have at least the card's worth in coins.` reads the face of a card the asked can't see;
    - with that `Only if` line replaced by `        Only if it is face down.`, the marked `ASK_GAME` compiles with `[]`;
    - (guard) `ASK_GAME` as 8-1 wrote it compiles with `[]`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/worked-view.test.ts src/engine/core/lang/board-view.test.ts src/engine/core/lang/action-window.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then run `bun run typecheck` and read every narrowing on `PhraseOpts`.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`. Every Startup example passes unchanged, and `total-phrases.test.ts`'s and `declared-actions.test.ts`'s `faceDownReady` tests pass unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/phrases.ts src/engine/core/lang/library/face-phrases.ts src/engine/core/lang/library/compare-phrases.ts \
  src/engine/core/lang/compile-util.ts src/engine/core/lang/worked-view.ts src/engine/core/lang/compile-phase.ts \
  src/engine/core/lang/compile.ts src/engine/core/lang/runtime.ts src/engine/core/lang/declared-actions.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/worked-view.test.ts \
  src/engine/core/lang/board-view.test.ts src/engine/core/lang/action-window.test.ts
git commit -F - <<'EOF'
feat(lang): a line about a card a player can't see may read whether it lies face down, whose it is and the flags of the cards on it, and nothing else

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: No other player can tell a card from the cards in their zone

Before starting: re-check `NEXT_CARD_KEY`, `makeCard`, `buildCards`, `deckOf`, `homePileOf` and its two callers (`keptGoesBack`, `everythingGoesToCreditor`), `claimer` and `byCardId`, `zoneCards`/`cardById` (`zone-index.ts`), `HOLDER_KEY`, 7-1's `ON_SEAT_KEY`, `cardsOn`, `itCard`, `theyOf`, `zoneIdFor`, how `attachmentProblem` names a card, `linesDoing`, `innerEffect`, Task 2's `VEIL_GAME` and expect helpers.

**Files:**
- Modify: `src/engine/core/lang/cards.ts` (`RENAMED_KEY`, `dealtIdOf`, `renameCards`; `makeCard` reads the next number through the helper `renameCards` uses), `library/face-phrases.ts` (an effect, an expect), `compile.ts` (`TELL_APART_LAST`), `examples.ts` (`claimer`), `library/draw-phrases.ts` and `library/debt-phrases.ts` (`homePileOf` of `dealtIdOf`).
- Modify: `src/engine/core/lang/testing.ts` (`SLIP_GAME`).
- Test: `cards.test.ts`, `library/face-phrases.test.ts`, `examples.test.ts`, `compile.test.ts` (all appended).

**Interfaces:**
- Consumes: the names above.
- Produces (for Task 8 and plan 9-2):

```ts
// cards.ts
/** `{ [id]: the id it had before }` for each card given a new one. Written only when cards are renamed; never sent to a seat. */
export const RENAMED_KEY = 'lang:renamed';
/** The id a card was dealt or made with: its id, followed back through RENAMED_KEY. */
export function dealtIdOf(state: GameState, cardId: string): string;
/**
 * Gives each of `ids`, in that order, the next number makeCard would give, and puts them at the end of state.cards in that order, so that
 * neither a card's id nor its place in the list says which card it was. Everything else about each card stays. RENAMED_KEY gains each new
 * id with its old one, and NEXT_CARD_KEY moves on. A card with a card on it, or on a card, is not renamed: RuleError NOT_TOLD_APART.
 */
export function renameCards(state: GameState, game: CompiledGame, ids: string[]): GameState;
const NOT_TOLD_APART = (card: string) => `${card} has a card on it, or sits on one, so the others could still tell it apart.`;
// face-phrases.ts
export const TELL_APART = 'no other player can tell it from the cards in their {perzone}';   // effect, needsCard, needsPlayer:
//   renameCards(it, then that zone's other cards in slot order); then the zone's cards are numbered 0 to n-1 in slot order
"{player} can't tell {card} in {zone} from the cards in {zone}"   // expect
// compile.ts
const TELL_APART_LAST = (text: string) => `“${text}” must be the last line of a button's Then: lines: no line after it could still find the card.`;
// examples.ts — claimer: a card counts as claimed when its dealtIdOf is, and it records the dealtIdOf of each card it hands out
// draw-phrases.ts, debt-phrases.ts — homePileOf(env.game.cards, dealtIdOf(env.state, id))
```

- `${card}` in `NOT_TOLD_APART` is named as `attachmentProblem` names a card: `The Vase in p0's workshop`.
- **The expect** passes when the seat doesn't see the card's face, sees the face of no card in the second zone, and the card and every card in the second zone have an entry in `RENAMED_KEY`. Otherwise: `Expected ${seat} not to be able to tell ${card} from the cards in ${zone}, but ${reason}.`, the reason the first that applies of `they see its face`, `they see the face of the ${name} in ${zone}` and `the cards were never made impossible to tell apart`.
- **`TELL_APART_LAST`**: a `TELL_APART` ref is allowed only as a button's last `Then:` line, itself or inside its `If …,` frame (`innerEffect`). Anywhere else (an earlier line, a choice's option, a rule, Setup, a says cell) it gets the message on its line.
- **`testing.ts`:**

```ts
/** VEIL_GAME where no other player can tell a slipped job from the jobs left in the stash, and a player may put a Vase from their stash back under its pile. */
export const SLIP_GAME = VEIL_GAME
  .replace('      Turn it face down.\n', '      Turn it face down.\n      No other player can tell it from the cards in their stash.\n')
  .replace('  A player may stop.', ['  A player may return.', '    Then:',
    '      A Vase from their stash goes to the bottom of the pile it came from.', '  A player may stop.'].join('\n'));
```

- [ ] **Step 1: Write the failing tests.**
  - **Setup** (`cards.test.ts`, `describe('cards no other player can tell apart')`). A 3-player `SLIP_GAME` engine on p0's turn in working; `stash-p0` holds, in slots 0–2, a Vase (`v1`), a Statue (`s1`) and a Vase (`v2`), arranged with `relocate`. `CREW_GAME` deals 11 cards (4 jobs, 7 hands), so the next number is 11.
  - **Renamed.** p0 slips `s1`:
    - no card has the id `s1`, `v1` or `v2`;
    - `workshop-p0` holds `c11`, a Statue lying face down;
    - `stash-p0` holds `c12` (a Vase, slot 0) and `c13` (a Vase, slot 1);
    - the last three entries of `state.cards` are `c11`, `c12`, `c13`;
    - `data[RENAMED_KEY]` is `{ c11: s1, c12: v1, c13: v2 }` and `data[NEXT_CARD_KEY]` is 14;
    - `dealtIdOf(state, 'c13')` is `v2`; `dealtIdOf` of `v1` on the state before the slip is `v1`.
  - **No one can follow it** (Review Focus). From the same arranged table, a second engine where p0 slips `v1` instead: for p1 and for p2, `deriveScene(tableDef, { cards }, seat)` of the two states are equal; p0's are not.
  - **Replay** (Review Focus). A fresh engine from the arranged state given `loadLog(engine.getLog())` equals the engine's state; `engine.undo()` gives back `s1` in `stash-p0` at slot 1.
  - **Refused.** `renameCards` of a Vase in `workshop-p0` with a Potter put on it throws `The Vase in p0's workshop has a card on it, or sits on one, so the others could still tell it apart.`; of that Potter, the same naming `The Potter in p0's crew`.
  - **Back to its pile** (Review Focus). After the slip, p0 returns: `c12` is the bottom card of the pile and `stash-p0` holds `c13`. (Without `dealtIdOf` in `keptGoesBack` the press would throw `A card made from a stack that never runs out has no pile to go back to.`)
  - **The example words** (`face-phrases.test.ts`, `runExamples` on `SLIP_GAME`):

```text
Example: no other player can tell a job slipped face down from the jobs left in the stash
  Given 3 players
  And p0's stash has a Vase, a Statue and a Vase
  When p0 slips the Statue
  Then p1 can't tell the Statue in p0's workshop from the cards in p0's stash
  And p2 can't tell the Statue in p0's workshop from the cards in p0's stash
```

    - It passes on `SLIP_GAME`.
    - On `VEIL_GAME` it fails with `Expected p1 not to be able to tell the Statue in p0's workshop from the cards in p0's stash, but the cards were never made impossible to tell apart.`
    - On `SLIP_GAME` with `And p0 shows the Statue` before the Then, it fails with `…, but they see its face.`
  - **A renamed card is not claimed again** (`examples.test.ts`, Review Focus). On `SLIP_GAME`:

```text
Example: a Given after a slip does not take the slipped job again
  Given 3 players
  And p0's stash has a Statue
  And p1's stash has a Statue
  When p0 slips the Statue
  Given the scrap has a Statue
```

    - It fails at its last line with `No card matches “a Statue”.` (Before the claimer change it passed, taking the slipped Statue to the scrap.)
  - **Refused when the rules are read** (`compile.test.ts`):
    - (guard) `SLIP_GAME` compiles with `[]`;
    - the renaming line moved above `      Turn it face down.` gives `TELL_APART_LAST('No other player can tell it from the cards in their stash')` on its line;
    - under a `When they have less than 1 move:` rule of working it gives the same.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/cards.test.ts src/engine/core/lang/library/face-phrases.test.ts src/engine/core/lang/examples.test.ts src/engine/core/lang/compile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. Rent Day keeps its 108 examples: its `pile it came from` lines read the same with no renamed card.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/cards.ts src/engine/core/lang/library/face-phrases.ts src/engine/core/lang/compile.ts \
  src/engine/core/lang/examples.ts src/engine/core/lang/library/draw-phrases.ts src/engine/core/lang/library/debt-phrases.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/cards.test.ts src/engine/core/lang/library/face-phrases.test.ts \
  src/engine/core/lang/examples.test.ts src/engine/core/lang/compile.test.ts
git commit -F - <<'EOF'
feat(lang): no other player can tell a card from the cards left in a zone: each takes a fresh id from the game's counter, and decks and examples still know where it was dealt

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 6: Paying what one can, and payments of the player who holds a flag

Before starting: re-check `transfer`, `payCounter`, `addToCounter`, `counterOf`, `holderOf`, `OWES_KEY`, the `{holder}` type, `they pay {int}` and `they pay the {gamenumber} to {holder}` (where each is registered), `ownerOf`, 7-1's `NO_OWNER`, 8-1's ask (`ASK_LINE`) and `its owner's <zone>`, 5-1's rules about a player, Rent Day's amount buttons (`the amount is more than the {gamenumber}`, `the {gamenumber} is the amount`), and Tasks 2–5's names.

**Files:**
- Modify: `src/engine/core/lang/library/board-phrases.ts` (four effects).
- Modify: `src/engine/core/lang/testing.ts` (`INSPECT_GAME`).
- Test: `library/board-phrases.test.ts`, `compile.test.ts` (appended).

**Interfaces:**
- Consumes: the names above.
- Produces (for Task 7 and plan 9-2). Each RuleError below is `holderOf`'s when no player, or more than one, holds the flag:

```ts
// board-phrases.ts — effects
'they pay up to {int} to {holder}'              // needsPlayer, needsPayment: the lesser of the number and what they have, never below 0,
                                                // through transfer to holderOf(flag); it never leaves a debt
'they pay up to {int}'                          // needsPlayer, needsPayment: the same, to the bank
'{holder} pays the {gamenumber} to its owner'   // needsCard, needsPayment: through transfer from holderOf(flag) to ownerOf(it); RuleError NO_OWNER
'{holder} gets {int} {counter}'                 // from the bank
```

- **`testing.ts`.** `INSPECT_GAME` is the pattern Task 7 plays and plan 9-2 follows (Architecture: "the Audit needs no new flow piece"):

```ts
/**
 * VEIL_GAME where a player who runs out of moves is inspected. Each other player is offered, in turn from their left, a face-down job of
 * theirs with no Smith guarding it. The first who inspects opens the bid at 3; the others raise once around from their left; the job is
 * shown. A job with dents is caught, and its owner gives it up (paying the high bidder up to 4 and the bank up to 1) or, unless it is a
 * Statue, patches it up for 3 while the bank pays the high bidder 4. A clean job costs the high bidder the high bid, paid to its owner.
 * After each verdict the offer starts again, for the jobs not yet inspected.
 */
export const INSPECT_GAME = [
  VEIL_GAME
    .replace('  Players pay with coins.', ['  Players pay with coins.', '  Players can be inspected.', '  Players can be offered.',
      '  Players can be the high bidder.', '  The game has a high bid of 0.'].join('\n'))
    .replace('  Cards can have dents.', '  Cards can have dents.\n  Cards can be caught.\n  Cards can be skipped.')
    .replace('  When they have less than 1 move:\n    The turn passes to the left.', '  When they have less than 1 move, go to inspection.')
    .replace('\nEnd:', ['', 'Phase: inspection', '  Players take turns.',
      '  When this phase starts:', '    They are inspected.',
      '  When they have a card in their workshop that is open:', '    Only if no player is offered.', '    Only if no player is the high bidder.',
      '    Only if no card in their workshop is caught.', '    Every card in their workshop is skipped.', '    Every player is offered.',
      '    They are not offered.',
      '  When a player is offered:', '    Only if they have less than 3 coins.', '    They are not offered.',
      '  When a player is offered:', '    Only if they have at least 3 coins.', '    The offer phase starts with them.',
      '  When no player is offered:', '    Only if no player is the high bidder.', '    Only if no card in their workshop is caught.',
      '    Only if they have no card in their workshop that is open.', '    They are not inspected.',
      '    Every card in their workshop is not skipped.', '    The turn passes to the left.',
      '  A player may give up a card in their workshop.', '    Only if it is caught.', '    Then:', '      Every card on it goes to their idle.',
      '      Move it to the scrap.', '      They pay up to 4 to the high bidder.', '      They pay up to 1.', '      No player is the high bidder.',
      '  A player may patch up a card in their workshop.', '    Only if it is caught.', '    Only if it is not a Statue card.',
      '    Only if they have at least 3 coins.', '    Then:', '      It is not caught.', '      They pay 3.', '      The high bidder gets 4 coins.',
      '      No player is the high bidder.', '',
      'Phase: offer', '  Players take turns.',
      "  A player may inspect a card in another player's workshop.", '    Only if they are offered.', '    Only if its owner is inspected.',
      '    Only if it is face down.', '    Only if no card on it is guarding.', '    Only if they have at least 3 coins.', '    Then:',
      '      No player is offered.', '      The high bid is 3.', '      They are the high bidder.',
      '      Each other player has the bidding, in turn from their left.', '        Only if they are not inspected.',
      '      Turn it face up.', "      Every card in its owner's workshop is not skipped.", '      If it is faulty, it is caught.',
      '      If it is not faulty, the high bidder pays the high bid to its owner.', '      If it is not faulty, no player is the high bidder.',
      '      Go back to the interrupted turn.',
      '  A player may pass the offer.', '    Then:', '      They are not offered.',
      '  After a player passes the offer, the turn passes to the next player on the left who is offered.',
      '  When no player is offered:', '    Go back to the interrupted turn.', '',
      'Phase: bidding', '  Players take turns.', '  A player may raise an amount.', '    Only if the amount is more than the high bid.',
      '    Only if they have at least the amount in coins.', '    Then:', '      The high bid is the amount.', '      No player is the high bidder.',
      '      They are the high bidder.', '      The bidding passes to the left.',
      '  A player may pass the bid.', '    Then:', '      The bidding passes to the left.', '', 'End:'].join('\n')),
  '', 'Open:', '  Only if it is face down.', '  Only if it is not skipped.', '  Only if no card on it is guarding.', '',
  'Faulty:', '  Only if its dents are more than 0.', '',
  'Guarding:', '  Only if it is a Smith card.', '  Only if it is not tired.',
].join('\n');
```

- If a line of `INSPECT_GAME` other than this task's four reads differently at HEAD (an earlier plan worded it otherwise), use HEAD's wording for the same rule and say which in the report.

- [ ] **Step 1: Write the failing tests.**
  - **Compiled** (`compile.test.ts`): `INSPECT_GAME` compiles with `[]`, with no "Nothing leads to …" warning; each `.replace` finds its text.
  - **Paying** (`library/board-phrases.test.ts`, `describe('paying what one can, and the player who holds a flag')`), through `runPhrase` on a 3-player `INSPECT_GAME` state where p1 is the high bidder and every player has 9 coins:
    - `they pay up to 4 to the high bidder` about p0: p0 5 and p1 13; at 2 coins, p0 0 and p1 11; at 0, nothing changes; `state.data[OWES_KEY]` is absent each time;
    - `they pay up to 1` about p0 at 3 coins leaves 2; at 0, 0;
    - `the high bidder gets 4 coins`: p1 13;
    - with the high bid 5, `the high bidder pays the high bid to its owner` about a Vase in `workshop-p0`: p1 4 and p0 14.
  - **Review Focus:**
    - with no player the high bidder, the first, third and fourth each throw `No player is the high bidder.`;
    - with p1 and p2 both, `More than one player is the high bidder: p1 and p2.`;
    - about a Vase in the scrap, the fourth throws `It is in no player's zone, so it has no owner.`
  - (guard) Rent Day's 108 examples pass, its `They pay the high bid.` and `they pay the {gamenumber} to {holder}` lines among them.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/board-phrases.test.ts src/engine/core/lang/compile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, then `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`. No Rent Day or Startup line is now `ambiguous`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/board-phrases.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/library/board-phrases.test.ts src/engine/core/lang/compile.test.ts
git commit -F - <<'EOF'
feat(lang): paying what one can, up to a number, and the player who holds a flag paying a number of the game to a card's owner or being paid by the bank

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 7: An inspection played through

Before starting: re-check 5-1's rules about a player (`PLAYER_FRAME`, `playersInTurnOrder`), 8-1's ask at runtime (`runButtonLines`, `closeWindow`), the interrupt (`startPhase`, `resumeTurn`, `the {phase} phase starts with them`, `go back to the interrupted turn`), 7-1's `waitingView`, and Tasks 2–6's names and `INSPECT_GAME`.

**Files:**
- Test: `src/engine/core/lang/examples.test.ts` (append `describe('an inspection played through')`), `src/engine/core/lang/board-view.test.ts` (appended).

**Interfaces:**
- Consumes: `INSPECT_GAME` and every piece it reads.
- Produces: no code. The examples are slice 9's flow in general words, for plan 9-2 to follow (item 2: once around among the players other than the active one; item 3: a check that branches to the owner's choice, with a forced branch; R4: the offer starts again from the active player's left).

- [ ] **Step 1: Write the tests.** `runExamples` on `INSPECT_GAME` with these appended passes, each example on its own:

```text
Example: an inspection that finds nothing wrong pays the owner the high bid, and the job stays face up
  Given 3 players
  And p0's workshop has a Vase
  And the Vase in p0's workshop is face down
  When p0 stops
  Then the phase is offer
  And it is p1's turn
  When p1 inspects the Vase in p0's workshop
  Then the phase is bidding
  And it is p2's turn
  When p2 raises 5
  Then the phase is working
  And it is p1's turn
  And the Vase in p0's workshop is face up
  And p0 has 14 coins
  And p1 has 9 coins
  And p2 has 4 coins
  And p0 is not inspected

Example: a caught job that can't be patched up is given up, and its owner pays the high bidder what they have
  Given 3 players
  And p0's workshop has a Statue
  And the Statue in p0's workshop has 1 dent
  And the Statue in p0's workshop has a Potter on it
  And the Statue in p0's workshop is face down
  And p0 has 2 coins
  When p0 stops
  And p1 inspects the Statue in p0's workshop
  And p2 passes the bid
  Then the phase is inspection
  And it is p0's turn
  And the Statue in p0's workshop is caught
  When p0 patches up the Statue
  Then it is rejected because "it is not a Statue card"
  When p0 gives up the Statue
  Then the scrap has a Statue
  And p0's idle has a Potter
  And p0 has 0 coins
  And p1 has 11 coins
  And p1 is not the high bidder
  And it is p1's turn

Example: a caught job may be patched up, and the bank pays the high bidder
  Given 3 players
  And p0's workshop has a Vase
  And the Vase in p0's workshop has 1 dent
  And the Vase in p0's workshop is face down
  When p0 stops
  And p1 inspects the Vase in p0's workshop
  And p2 raises 4
  Then the Vase in p0's workshop is caught
  When p0 patches up the Vase
  Then the Vase in p0's workshop is not caught
  And the Vase in p0's workshop is face up
  And p0 has 6 coins
  And p1 has 9 coins
  And p2 has 13 coins

Example: when every player passes, the job stays face down and the turn goes on
  Given 3 players
  And p0's workshop has a Vase
  And the Vase in p0's workshop is face down
  When p0 stops
  And p1 passes the offer
  Then the phase is offer
  And it is p2's turn
  When p2 passes the offer
  Then the phase is working
  And it is p1's turn
  And the Vase in p0's workshop is face down

Example: only a face-down job of the player inspected, with no Smith guarding it, can be inspected
  Given 3 players
  And p0's workshop has a Vase and a Statue
  And p2's workshop has a Statue
  And the Vase in p0's workshop has a Smith on it
  And the Vase in p0's workshop is face down
  And the Statue in p0's workshop is face down
  And the Statue in p2's workshop is face down
  When p0 stops
  Then it is p1's turn
  When p1 inspects the Vase in p0's workshop
  Then it is rejected because "no card on it is guarding"
  When p1 inspects the Statue in p2's workshop
  Then it is rejected because "its owner is inspected"
  When p1 inspects the Statue in p0's workshop
  Then the phase is bidding

Example: the bid goes once around from the left of the player who opened it, never to the player inspected
  Given 3 players
  And p0's workshop has a Vase
  And the Vase in p0's workshop is face down
  When p0 stops
  And p1 passes the offer
  And p2 inspects the Vase in p0's workshop
  Then the phase is bidding
  And it is p1's turn
  When p1 raises 3
  Then it is rejected because "the amount is more than the high bid"
  When p1 raises 4
  Then the phase is working
  And p0 has 13 coins
  And p1 has 5 coins
  And p2 has 9 coins

Example: after a verdict the offer starts again from the left of the player inspected, for the jobs not yet inspected
  Given 3 players
  And p0's workshop has a Vase and a Statue
  And the Vase in p0's workshop is face down
  And the Statue in p0's workshop is face down
  When p0 stops
  And p1 passes the offer
  And p2 inspects the Statue in p0's workshop
  And p1 passes the bid
  Then the phase is offer
  And it is p1's turn
  And the Statue in p0's workshop is face up
  When p1 passes the offer
  And p2 passes the offer
  Then the phase is working
  And the Vase in p0's workshop is face down

Example: with no one else to bid, the player who opened it is the high bidder at 3
  Given 2 players
  And p0's workshop has a Vase
  And the Vase in p0's workshop is face down
  When p0 stops
  And p1 inspects the Vase in p0's workshop
  Then the phase is working
  And p0 has 12 coins
  And p1 has 6 coins

Example: a player short of the opening bid is passed over when the offer starts
  Given 3 players
  And p0's workshop has a Vase
  And the Vase in p0's workshop is face down
  And p1 has 2 coins
  When p0 stops
  Then the phase is offer
  And it is p2's turn
```

  - **What each seat is told during the bid** (`board-view.test.ts`, `describe('an inspection, as each seat sees it')`). A 3-player `INSPECT_GAME` engine: `workshop-p0` holds a Vase lying face down (`v`), every other job is in the pile, and p0 has stopped and p1 has inspected `v`, so p2 is to bid:
    - p1's and p2's `waiting` are `{ by: 'p1', label: <the inspect button's label>, cards: ['a face-down card'], choices: [] }`, and p0's `cards` is `['Vase']`;
    - `JSON.stringify` of p1's and p2's scene and extras contains no `Vase`, and their waiting lines no id;
    - p2's buttons are `raise an amount` and `pass the bid`, each allowed.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/examples.test.ts src/engine/core/lang/board-view.test.ts`. Expected: PASS if Tasks 1–6 and plans 5-1 and 8-1 hold as their Interfaces say. If an example fails for want of something other than this plan's pieces, stop and report which line: that is a missing piece of slice 9's flow, to be planned, not worked round. If one fails only for an expect's wording, use HEAD's wording for the same check and say which.
- [ ] **Step 3: Run** `bunx vitest run src/engine/core/lang src/games`, `bun run test` and `bun run typecheck`.
- [ ] **Step 4: Commit**

```bash
git add src/engine/core/lang/examples.test.ts src/engine/core/lang/board-view.test.ts
git commit -F - <<'EOF'
feat(lang): an inspection played through with the language's pieces: an offer in turn, a bid once around from the opener's left, the reveal, and the owner's choice or forced give-up

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 8: The README and the checks

**Files:**
- Modify: `README.md` (a paragraph after the one plan 8-1 added; re-check its first words at HEAD).

- [ ] **Step 1: Write the README paragraph.** In general words, with these examples:
  - **Cards face down where everyone could see them.**
    - `Each player has a workshop row that everyone can see, where cards may lie face down.`
    - `Turn it face down.`, `Turn it face up.`, `Only if it is face down.`
    - A card that moves turns face up wherever everyone sees it.
    - Its owner sees it; the others see a back, with the cards on it, and nothing worked out from it: no name, no numbers, no flags, and no totals over that row.
  - **What the others may still read.** A button that picks a card a player can't see may read only whether it lies face down, whose it is (`Only if its owner is not watched.`) and the flags of the cards on it (`Only if no card on it is guarding.`). Any other line about it is refused.
  - **No other player can tell it apart.** `No other player can tell it from the cards in their stash.`, the last line of a button.
  - **Paying what one can.** `They pay up to 4 to the high bidder.`, `They pay up to 1.`, `The high bidder pays the high bid to its owner.`, `The high bidder gets 4 coins.`
  - **An inspection.** The pattern of Task 7: a rule about a player opens an offer phase; `Each other player has the bidding, in turn from their left.` with `Only if they are not inspected.`; the reveal; the owner's buttons, one of them refused where it can't apply.
  - **Example words.** `Given the Vase in p0's workshop is face down`, `Then … is face down`, `… is face up`, `p1 sees …`, `p1 can't see …`, `p1 can't tell … from the cards in …`.
- [ ] **Step 2: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 3: Run the checks.** Each must print nothing.

```bash
# Startup Simulator's words in shared code, slices 3 to 9, tests included
git diff "$BASE" -- src/engine src/pages src/utils | grep '^+[^+]' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share|tags?|leads?|leading|licen[cs]es?|tiers?|stall(s|ed|ing)?|sectors?|expertise|modes?|bandwidths?|bugs?|qa|online|offline|maint(enance)?|suppl(y|ies)|demands?|xp|pending|skills?|badges?|badged|ranks?|mentor(s|ed|ing)?|synerg(y|ies)|agile|graduat(e|es|ed|ing|ion)|training|trained|brainstorm(s|ed|ing)?|strateg(y|ies)|milestones?|seniors?|workaholics?|clean coders?|visionar(y|ies)|toxic|burnouts?|flight risks?|techcrunch|design sprints?|cease|desist|hype|utilit(y|ies)|buffs?|debuffs?|venture capital|bubbles?|patents?|trolls?|angels?|investors?|legacy|regulations?|audits?|open source|hackathons?|chip shortage|crunch|server crash|logjam|frenz(y|ies)|interns?|headhunt(s|ed|ing|ers?)?|course boom|whistleblowers?|trade show|events?|equit(y|ies)|founders?|consultants?|dividends?|veto(es|ed|ing)?|partners?(hips?)?|immunit(y|ies)|portfolios?|buybacks?|stocks?|poach(es|ed|ing|ers?)?|vest(s|ed|ing)?|ctos?|acqui(re|res|red|ring|sitions?)|fire sales?|hit pieces?|scandals?|integrat(e|es|ed|ing|ions?)|hosts?|host(ed|ing)|clients?|cris(is|es)|m&a|divest(s|ed|ing|ments?)?|raiders?|market sales?|counter-offers?|stealth|audit(ed|ing|ors?)?|fold(s|ed|ing)?|settle(s|d|ments?|ing)?|ghosts?|bluff(s|ed|ing)?|disclos(e|es|ed|ing|ures?)|shield(s|ed|ing)?|dependenc(y|ies)|legality|fraud(s|ulent)?|bount(y|ies)|secured|transient)\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# existing test lines removed or changed: none in this plan
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
# nothing outside the language and the two core files Task 1 names
git diff --stat "$BASE" -- src/games src/pages
git diff --stat "$BASE" -- src/engine ':!src/engine/core/lang' ':!src/engine/core/derive-scene.ts' ':!src/engine/core/derive-scene.test.ts' ':!src/engine/core/table-def.ts'
```

  - Also read the `+` lines of `src/engine` for "pending", "supply", "host", "client" and "settle" used in any sense.
- [ ] **Step 4: Run the games alone.**
  - `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
  - `bunx vitest run src/games/startup-simulator.test.ts` passes with BASE's example count.
- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -F - <<'EOF'
docs: the README describes cards face down where everyone could see them, what the others may still read of them, cards no one can tell apart, paying what one can, and an inspection

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Forward notes

- **Slice 10.**
  - Come Clean is `Turn it face up.`, run in a rule or an answering phase.
  - Its offer asks every owner who has a face-down card (slice 10 R1), so an ask's `Only if` line reads whether a player has one (`they have a card in their development that is face down`). Task 4's walk still reports that row, since a group's tests are not judged as public reads. Slice 10's language plan lets a group of a row with the mark through when every test on its cards is `faceBlind`.
  - The Audit here holds an interrupt (the offer) and an ask's window (the bid) at once. Slice 10's stack of interrupts must keep that working.
  - Fold and Settle for any owner with no Whistleblower: `They pay up to 5.` is the whole fine to the bank, and Settle simply leaves out the bounty line.
  - `lang:renamed` only ever renames cards in a backlog and the card going face down. A Legacy Status fact rides on its card, so it is unaffected.

## Left to 9-2 / 9-3

**Plan 9-2 (rules text and long runs; it may split as 7-2 and 8-2 did)** writes, with this plan's pieces:
- **The table.** `Each player has a development row that everyone can see, where cards may lie face down.`
  - Then re-check every window and ask clause and every pick in another player's development: Task 4 refuses any that reads a face-down card's face.
  - Re-pin `shownPlayerValues`: a total over development is no longer shown. `standIns` and `shownFlags` pins stay.
- **The Face-Down Greenlight** (§6, §14.B.3, Rulings #11, #21).
  - A button of its own (or an option of greenlight), 0 AP.
  - Its guards: a free development slot, and some player provides each Tag; no License.
  - Its lines: `Move it to their development.`, the cut choice, `Turn it face down.`, and last `No other player can tell it from the cards in their backlog.` (R1).
- **Worked flags.** Lying face down; Ghost Progress (new cubes and Stalled); Missing Dependency per Tag (the owner provides it or is Partners with a provider, 7-1's tie); the shielding staff flag (a working CTO, from the `cto` mark); auditable.
- **The Audit** (Phase D step 3, §7.A–D, R4), on the pattern of `INSPECT_GAME`:
  - the engine's three `Go to commit.` become `Go to audit.`;
  - the offer as an interrupt opened by a rule about a player, with the opening $3 checked;
  - the declare button's `Only if` lines reading only public facts: `its owner is …`, `it is face down`, `no card on it is shielding`;
  - the bid as 8-1's ask from the declarer's left, with the active player kept out by a player flag;
  - the reveal and the verdict;
  - Fold (Pivot's lines without Onboarding, Consultants returned, the Diva fired, `They pay up to 4 to the whistleblower.`, `They pay up to 1.`) and Settle ($3 + $3 per missing Tag to a provider of their choice, $5 under Patent Trolls, Ghost-only $3 more, offered only when cash covers it until slice 10, the bounty $4 or $8 under Whistleblower Protection Act);
  - the restart from the active player's left after each verdict.
- **Voluntary Disclosure** (Phase C, 0 AP, Late License, impossible with no provider) and the **Face-Down Launch** (no Tag check; `If it is face down, …` before the move; Stealth Bonus markers +5 / +10 as a player number, scored on §12 line 7).
- **Examples.**
  - The spec's table, with `Then p1 can't see …`, `Then p1 sees …` (the staff) and `Then p1 can't tell the Neobank in p0's development from the cards in p0's backlog` (the Untrackable bluff).
  - Ghost Progress and its Settle arranged with Givens of new cubes (R2).
  - Rulings #4, #11, #17, #21 and #25's audit items.
- **R3 pins in the test file.** For a rival seat: `seatExtras` shows the staff's modes, Pending XP, XP, Skills, Attributes, Onboarding and marks, and no Pending Badge, Stalled, need, cut or Feature complete for the face-down project, and no `faceDown` key.
- **Long runs at 2 to 5 players.**
  - Tallies: face-down greenlights, audits, Folds, Settles, disclosures, face-down launches. Ghost Progress is tallied as 0 and recorded as never firing (R2).
  - New invariants after every move:
    - no rival's scene and extras (as JSON) contain a face-down card's name, its counts or a worked value of it;
    - no face-down card in a public zone carries an id that rival saw face up earlier in the game (track the ids each seat has seen face up);
    - each card is audited at most once.
  - The auto-player answers the offer, the bid and Fold or Settle.

**Plan 9-3 (the page):**
- A face-down project drawn as a back with its staff hung under it, `a face-down card` on rivals' Board lines; the owner's canvas shows it face up and marked, from `SeatExtras.faceDown`.
- The renamed backlog cards on the owner's canvas: new ids, so decide how they appear rather than animate from the old ones.
- The offer and the bid in the deciding seat's strip, from 7-3's waiting line. Which face-down card is audited is shown by its place, never by its name (see the Gaps).
- Stealth Bonus markers on the tableau.
- The browser check, with a no-regression check of the Hearts demo (the derive-scene change).

## Gaps

None that needs a protected file or contradicts a binding call. Checked:
- The table rule reaches only `derive-scene.ts` and `table-def.ts`, as the overview planned. No zone of the Hearts demo, Hearts, Color Match, Venom or Rent Day carries `faceDown`, so their scenes are unchanged by construction, and the Hearts demo's tests run in Tasks 1 and 8.
- Every item of the spec's "What the language gains" is a task here:
  - item 1: Tasks 1–5;
  - item 2: Task 7, with 8-1's ask, plus Task 6's payments;
  - item 3: Task 7, with Task 6;
  - item 4: Tasks 2 and 5.
- R1's re-keying is built and its fall-back is not. Both clashes R1 named were found (`homePileOf`, the examples' claimer) and both follow `lang:renamed`.

Recorded limits, none blocking slice 9:
- **The waiting line can't say which face-down card is in question.** 7-1 gives a waiting line no id, so a seat bidding on an Audit is told only `a face-down card` when the owner has two. The card's place is public; 9-3 may add it, never its name.
- **A RuleError on a press of a card the presser can't see shows its message to the presser.** Some messages name a card (the attachment checks). Only a rules mistake does this, and 9-2's long runs would fail on it first.
- **Public reads cover only `faceBlind` phrases and `some/no card on it is …`.** A total or a count over the cards on a face-down card is still refused in a hidden pick: conservative.
- **A button's `Only if` line about another player's row with the mark, through a player-level condition** (`another player has a card in their development whose …`), would tell the presser something through its verdict. The language doesn't refuse it, as it hasn't for rows only their owner sees since 1a. No Startup line does so at writing; 9-2 checks its own.
- **`it is face down` and `it is face up` are both false in a zone not everyone sees.**
- **Ids of cards in hidden rows still tell which deck they were dealt from.** This is as before; the seed and growth decks are public sources in Startup, and a renamed card's fresh id tells nothing.
- **`No other player can tell it …` must be a button's last line**, and refuses cards on cards.
- **Settle's cover by Fire Sale value** waits for slice 10. Until then Settle is offered only when cash covers it (the spec's call).
