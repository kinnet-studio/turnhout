# Startup Simulator Slice 1b-1 (Picks and Costs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Buttons can cost part of the turn budget in one shared shape ("It costs 1 action."), and buttons can pick cards: one card, a card and the card it goes to, or a set. The playtest page picks cards from a DOM list. Startup Simulator's slice 1a is rewritten with these: every card line is a button, and every AP line is a cost line. Its 21 examples keep their meaning, its long runs still end, and the game is still playable in the designer, now by clicking.

**Architecture:**
- **This is plan 1b-1 of three** (spec R9). It runs after plans 1a-1 and 1a-2 are complete, and takes their interfaces as given (see "Assumed from plans 1a-1 and 1a-2" below). Plan 1b-2 (the Board) and 1b-3 (the page's Board and canvas clicking) build on this one.
- **The cost line (R5)** is read by the phase compiler under any button and stored as `DeclaredAction.cost`. The button's move handler judges it after the press's own pick and before every `Only if`, and spends it before the `Then:` lines. Both steps are two exported functions, `costRefusal` and `payCost`. `hasCost` is what the overview means by "an action". Slice 7's Veto hooks into that one place.
- **Card-pick buttons (R1)** are ordinary declared buttons (`DeclaredAction`) with a `pick` field. The move type is still the whole wording. The press carries `cardId`, or `cardIds` for a set, and `onto` for the target card. Whether a line is a card move or a button is decided by its words and by whether a cost line sits under it, as R1 says.
  - A one-card pick's lines are read as a move about the picked card. They are compiled with `inMove`, `player` and `card` on, and run with a `MoveInfo` and a subject whose `card` is the picked card. So 1a-1's "the card's cost" phrases, "the card is …" and "it" all read the picked card, with no change to those phrases.
  - A set's lines have no single card. They read "the picked cards".
  - A target is "the target card".
- **The view** (`seatExtras`) gives each pick button a `cards` field: every card it may pick, judged alone, and for a target form every target for each card. The page's new `CardPicker` shows that list under the buttons. It is the 1a-2 plan's "DOM card picker between the buttons and the canvas". Canvas clicking is 1b-3's.
- **Order of tasks.** The DOM picker (Task 4) comes before Startup Simulator is rewritten (Task 5), so that every commit stays green. Rewriting the text breaks every test that drags or dispatches its card moves, so Task 5 converts all of them at once. Task 6 makes the long runs press through the view and check the budget.
- **Builder calls this plan makes** (the spec leaves them open):
  - **What the "to" forms do.** In "… a card from {zone} to {zone}" and "… some cards from {zone} to {zone}", the picked cards move to the second zone after the cost is spent and before the `Then:` lines, as a card move moves its card. The other forms ("a card in {zone}", "some cards from {zone}", "… to a card in {zone}") move nothing by themselves: their `Then:` lines say where cards go.
  - **Names in lines.** In a one-card pick, the picked card is "it" and "the card". In a set it is "the picked cards". In a target form, the target is "the target card".
    - New general phrases: `the target card is {cardclass}` and `the target card is not {cardclass}`, `move the picked cards to {zone}`, and `they picked at most {int} card(s)`.
  - **Only a number each player has each turn can be a cost.** So "costs AP" and "has a cost" are the same thing, which is what the Veto reads.
    - The refusal reads `they have at least 2 actions`, in the words 1a's examples already expect.
    - A button may have one cost line, and a cost line with a problem leaves its button out.
  - **Refusal order:** the turn and phase gate, then the press's pick, then the cost, then each `Only if`.
  - **Piles.** A pick from a pile offers and accepts only the pile's top card, as card moves do.
  - **Hidden cards in the view.** A candidate in a zone the seat can't see is named `a face-down card` in the view. Its id is still offered.
  - **Pick buttons don't mark `movedBy`.** Only trick games read it, and they use card moves.
  - **New fields are optional and left out where they don't apply:** `DeclaredAction.cost` and `.pick`, `Vocab.actions[].picksCard`, `ActionView.cards`, `LineCtx.cards` and `.onto`, `Subject.onto` and `.cards`. This follows the `anyActor` precedent. No existing test literal changes.
  - **Example phrases:**
    - `{player} {cardaction} {cardlist}`, `… {cardlist} to {card}` and `… {cardlist} to {zone}`;
    - the third picks between buttons by destination;
    - when two buttons could take the named card, the example says so.
  - **The unreadable-card-line message** `I can't read this card move. Write it as “A player may <verb> a card from <zone> to <zone>.”` stays as it is for every card line that is neither form, because existing tests pin it. Likewise `I don't understand this line under a move. Use Only if…, Only if one of: or Then:.` keeps its words.
  - **Startup Simulator's hints** that said "Drag …" now say "Discard …" or "Press …, then pick the card." No ruling or number changes.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-1b-building-design.md` (binding; its "Builder-check rulings" win where they differ from the shape), especially R1, R5 and R9. It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, which is binding, notably "AP-costing buttons share one shape". The evidence is `builder-check-startup-1b.md` B1, B5, B9 and B11. Its prototype of a one-card pick is the `PROBE` edits in its `p1b/` copy (`types.ts`, `compile-phase.ts`, `declared-actions.ts`).

## Global Constraints

- **Controller amendment (after plan 1a-1's final review, before this plan runs).**
  - **Tally keys.** 1a-1's Task 10 also tallies three rule paths so the auto-player can't hide a rule (the overview's anti-goal): the open idea pool letting a card go to the box, the Market Crash reaching the crash pile from the growth market, and from a research row. Wherever this plan lists the tally keys, keep those three as well and expect each above 0.
  - **Example counts.** 1a-1's final fix wave adds examples to `startup-simulator.rules` (research with the last action, a 1-card research deck, the Crash on the last seat's turn) and moves the Market Crash into the growth products table as its first row (its card id is no longer fixed). Wherever this plan says "21 examples" or "21 of 21", read the count the committed file has when this plan starts, and add this plan's examples to it.

- **Hard constraints (verbatim):**
  - Protected files must not change: `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, and anything under `src/pages/hearts-demo/**`.
  - The core is pure: no pixi/react/DOM imports in `src/engine/core/**`, no `Math.random` or `Date.now`.
  - State stays Json-only, with new keys under `lang:*` in `state.data`; moves are Json.
  - No Startup Simulator words in shared code (capital, talent, agency, junior, backlog, growth, crash, vaporware, university, bench, ideation, startup, research, recruit, product, job market, idea pool, "seed" meaning a deck/market/card/product, plus 1b's: greenlight, launch, pivot, salary, project, cube, ops); they stay in the rules text and its test.
  - Hearts, Color Match, Venom and Rent Day pass unchanged (card moves and dragging stay for them); `bun run typecheck` clean; full `bun run test` passes.
  - Startup Simulator's rulings and numbers don't change: converting its text keeps every example's meaning; an example may be reworded only where the move's shape changes.
- **Where the banned words may appear.** They may appear in:
  - `src/games/startup-simulator.rules` and `src/games/startup-simulator.test.ts`;
  - `src/pages/designer/samples.ts`, `designer-page.test.tsx`, `playtest-fitted.test.tsx` and `tableaux.test.ts`;
  - README and docs.

  They may not appear in any other file under `src/engine`, `src/pages` or `src/utils`, comments included, and `src/engine/core/lang/testing.ts` counts as shared. Fixtures use general words: gems, coins, moves, shop, stash, case, pile. Don't name a variable `ops`.
- **State and moves.**
  - No new `state.data` keys.
  - A press may carry `cardId: string`, `cardIds: string[]` and `onto: string`.
  - Every new field of `CompiledGame`, `Vocab` and `SeatExtras` is `Json`. An optional field is left out, never set to `undefined`.
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1, record `BASE=$(git rev-parse HEAD)` and run `bun run test` once to get the passing count.
- **No new dependencies.**
- **Existing tests.**
  - Tasks 1 to 4 change no existing test line.
  - Task 5 changes only these:
    - the Startup Simulator dispatches and long-run keys in `src/games/startup-simulator.test.ts`;
    - the drag steps that move Startup Simulator cards in `src/pages/designer/playtest-fitted.test.tsx` (named in Task 5).
  - Task 6 changes only the long runs in `startup-simulator.test.ts`.
  - If any other existing test fails, stop and report it instead of changing it.
- **Page copy (exact):**
  - The picker is `<div role="group" aria-label="Pick cards">`. It shows the view's prompt as text.
  - Each card is a `<button type="button" aria-label="Pick {name}">{name}</button>`. A card the move refuses is `aria-disabled="true"`, with the reason as its `title`.
  - A set adds `aria-pressed` on each card and a `Confirm` button. The picker always ends with `Cancel`.
- **Style and commits.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefixes `feat(lang):`, `feat(designer):`, `feat(games):`.
  - Stage files by path, never `git add -A`.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.
  - `at(text, line)` in tests is the 1-based number of `line` in `text`, as in 1a-1.

## Review Focus

- **A press that names cards the button can't take is refused with the button's own prompt, before the cost, and changes nothing.** That covers a card in another zone, an id not on the table, an id that isn't a string, a pile's card under the top, a target that is the picked card or isn't in the target zone, a set with no cards, a set with an id twice, and a set with one card outside the zone. Tests in Task 2 (one card) and Task 3 (targets and sets).
- **A pick from a zone the presser can't see leaks no names.** The view calls each candidate `a face-down card`, and the press by id still works. Test in Task 2.
- **A press that can't pay costs nothing.** It is refused in the words `they have at least 2 actions`, before any `Only if`. A press that is accepted spends before its `Then:` lines. Undo gives the spend back. Test in Task 1.
- **The picker outlives its view.** A button that greys while its picker is open closes the picker. A card that left the zone drops out of a set, and `Confirm` never sends it. Tests in Task 4.
- **Two buttons can take the card an example names** ("When p0 buys the Ruby" with a buy to the stash and a buy to the case). The example fails with a message naming both wordings, and "… to p0's case" picks one. Test in Task 2.

## Assumed from plans 1a-1 and 1a-2 (check before Task 1)

Neither plan is finished as this is written: 1a-1 has Tasks 1–2 committed and 1a-2 has not started. Before Task 1, check each item below. If one is missing or differs, stop and report it.

- **1a-1, every task committed.** Task 10's word check is clean, `src/games/startup-simulator.rules` passes its 21 examples, and its long runs pass.
- **1a-1 Task 3.** `TURN_GAME` in `src/engine/core/lang/testing.ts` holds these lines verbatim:
  - `'  A player may work.', '    Only if they have at least 1 move.', '    Then:', '      They spend 1 move.', '      They get 1 coin.'`;
  - `'  When they have less than 1 move, go to tidying.'`.

  The effect `the turn passes to the left` exists. A `When they have less than 1 move:` rule in a turn-taking phase is about the current player.
- **1a-1 Task 4.**
  - Per-turn counters go back to their start when a turn starts: `usesTurns`, the `a turn starts` trigger, `markTurnStarted` and `TURN_OF_KEY` in `turns.ts`.
  - An example's first table counts as a started turn.
  - A game that uses turns with no start-player line starts with p0.
- **1a-1 Task 6.** In `library/move-phrases.ts`:
  - condition `they have at least the card's {attribute} in {counter}`, registered `{ needsMove: true, needsPlayer: true }`;
  - effect `they pay the card's {attribute}`, registered `{ needsMove: true, needsPayment: true }`.

  Both read `movedCard(env)`.
- **1a-1 Task 8.** The expect `{zone} has {cardlist}, in that order` exists.
- **1a-1 Tasks 9a/9b/10.**
  - `src/games/startup-simulator.rules` is exactly the text of 9a and 9b.
  - `src/games/startup-simulator.test.ts` holds:
    - the 9b engine tests: short decks, the Crash as the last growth card, hidden zones;
    - Task 10's `playGame`, `playTurn`, `keepsTheRules`, the move tally `it`, and undo and replay.
  - `SAMPLES` lists Startup Simulator.
  - The README has the **Card games with turns** paragraph.
- **The library already has:**
  - `counted(1, 'actions') === '1 action'` (in `refs.ts` today);
  - the given and expect `{player} has {int} {counter}`;
  - the effect `they get {int} {counter}`.
- **1a-2, every task committed.**
  - `playtest.tsx` has the fitted page:
    - `SeatTabs`, one `SeatCanvas` with `fitted`, and `Tableaux`;
    - `ActionButtons` in the seat's panel;
    - `showsCards` true for a board with no spaces.
  - `entryFor` reads a counter at 1 in the singular ("1 move").
  - `src/pages/designer/playtest-fitted.test.tsx` exists with the scaffold helpers `mount`, `cardsIn`, `lineOf`, `status`, `press`, `drop`, `hint`, `startOf` and `after`, and these tests:
    - Task 2's **Dragging on the fitted table** and **A refused drag**;
    - Task 4's `it('recruits from every source, drafts, researches, discards and passes the turn')`.

---

### Task 1: "It costs N {counter}." on buttons

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`ActionCost`, `DeclaredAction.cost`, `Vocab.budgets`)
- Modify: `src/engine/core/lang/phrases.ts` (`emptyVocab`, `vocabFrom`)
- Modify: `src/engine/core/lang/compile-phase.ts` (`readRuleBody`, `compileAction`)
- Modify: `src/engine/core/lang/declared-actions.ts` (`hasCost`, `costRefusal`, `payCost`; `choose`, `apply`, `amountReady`)
- Test: `src/engine/core/lang/compile-phase.test.ts`, `src/engine/core/lang/declared-actions.test.ts`, `src/engine/core/lang/phrases.test.ts`

**Interfaces:**
- **`types.ts`:**
  - `export type ActionCost = { amount: number; counter: string; line: number }`. `counter` is the declared (plural) name.
  - `DeclaredAction.cost?: ActionCost`, present only on a button with a cost line.
  - `Vocab.budgets: string[]`: the counters each player has each turn, the only ones a button may cost.
- **`phrases.ts`:** `emptyVocab().budgets` is `[]`. `vocabFrom` sets it to the names of `board.counters` whose `perTurn` is true.
- **`compile-phase.ts`:**
  - `readRuleBody(node, ctx)` also reads a child whose normalized text matches `/^it costs (.+)$/i`. It returns `{ conditions, effects, cost: ActionCost | null, badCost: boolean }`.
    - The rest must be `/^(\d+) (.+)$/`. Else the diagnostic on that line is:
      `COST_SHAPE = 'Write a cost as “It costs 1 action.”: a whole number, then a number each player has each turn.'`
    - The counter is read with `parseParam('counter', …)`, which accepts the singular. A name that is no counter gets the counter type's own explanation (`There is no counter called “mvoe”.`, with its suggestions).
    - A counter not in `vocab.budgets` gets:
      `` notABudget = (counter: string) => `A button can only cost a number each player has each turn, like “Each player has 3 actions each turn.”; ${counter} isn't one.` ``
    - A second cost line gets `TWO_COSTS = 'A button can have only one “It costs …” line.'`
    - Any of these sets `badCost`.
  - `compileAction` returns null when `badCost`, and otherwise adds `cost` only when there is one. `compileMove` ignores the cost: a card move never has one, since R1 makes such a line a button (Task 2).
- **`declared-actions.ts`:**
  - `export function hasCost(action: DeclaredAction): boolean`: the button is "an action", the kind slice 7's Veto may answer.
  - `export function costRefusal(action: DeclaredAction, state: GameState, by: PlayerId): string | null` is null without a cost, or when `counterOf(state, counter, by) >= amount`. Otherwise it gives `` `they have at least ${counted(amount, counter)}` ``.
  - `export function payCost(action: DeclaredAction, state: GameState, by: PlayerId): GameState` is `addToCounter(state, counter, by, -amount)`, or the state unchanged without a cost.
  - `choose` order: the phase, the action and the seat; out; `aboutPress`; `costRefusal`; then `failedGroup`.
  - `apply`: `recordAction`, then `payCost`, then the `Then:` lines.
  - `amountReady` asks `costRefusal` before the groups that don't read the amount.

- [ ] **Step 1: Write the failing tests.**

In `compile-phase.test.ts`, add `describe('a button that costs part of the turn budget')`.
- `WORK = '  A player may work.\n    Only if they have at least 1 move.\n    Then:\n      They spend 1 move.\n'`.
- `COSTED = TURN_GAME.replace(WORK, '  A player may work.\n    It costs 1 move.\n    Then:\n')`. Expect `TURN_GAME` to contain `WORK`.

The tests:
- **Read.** `COSTED` compiles with `[]`.
  - Working's `work` has `cost` equal to `{ amount: 1, counter: 'moves', line: at(COSTED, '    It costs 1 move.') }`.
  - `'cost' in stop` is false.
  - `hasCost(work)` is true, and `hasCost(stop)` false.
- **Anywhere under the button.** Moving the cost line below the `Then:` block gives the same `amount` and `counter`.
- **Numbers.** `It costs 2 moves.` gives amount 2. `It costs 0 moves.` gives amount 0, and `hasCost` is true.
- **Problems.** Each gives exactly one error, on the cost line, and no game:
  - `It costs 1 coin.` → `notABudget('coins')`;
  - `It costs 1 mvoe.` → `There is no counter called “mvoe”.`;
  - `It costs one move.` → `COST_SHAPE`;
  - a second `    It costs 1 move.` → `TWO_COSTS` on the second line.

In `phrases.test.ts`: `vocabFrom` with a board whose counters are `coins` (`perTurn: false`) and `moves` (`perTurn: true`) gives `budgets` `['moves']`.

In `declared-actions.test.ts`, add `describe('buttons that cost part of the turn budget')`.
- `base(text)` is `createEngine(g, lib, 2, { ...initialState(g, 1), turn: { current: 'p0', phase: 'working' } }).engine.getState()` for `g = compileGame(text, lib).game!`. It is a started turn with p0 at 2 moves.
- `engineAt(text, arrange)` builds a new engine on `arrange(base(text))`.
- `COST2` is `COSTED` with `It costs 2 moves.` and `    Only if they have at least 5 coins.` under work.

The tests:
- **Spent.** On `COSTED`, p0 works: accepted, and p0 has 1 move and 1 coin.
- **Spent before the Then lines.** With `      If they have at least 2 moves, they get 10 coins.` added under work's `Then:`, p0 works and has 1 coin, not 11.
- **Refused in order (R5).** On `COST2`:
  - p1 working gives `not p0's turn`;
  - p0 at 1 move and 0 coins gives `they have at least 2 moves`, the cost before the `Only if`;
  - p0 at 2 moves and 0 coins gives `they have at least 5 coins`.
- **Review Focus: nothing spent on a refusal.** After the refused press p0 still has 1 move. After an accepted press, `engine.undo()` brings back 2 moves and 0 coins.
- **The view of an amount button.** `AMOUNT_BOARD.replace('  The game has a pot of 0.', '  The game has a pot of 0.\n  Each player has 2 moves each turn.')`, with `    It costs 1 move.` under `  A player may raise an amount.`, compiles with `[]`.
  - Take the state of a 2-player engine after Setup.
  - `amountReady(runtime, raise, setCounter(state, 'moves', 'p0', 0), 'p0')` gives `they have at least 1 move`, ahead of its `they have rolled this turn`.
- **An example.** `COSTED` with `It costs 2 moves.` and this example appended passes (`runExamples`):

```text
Example: a press that can't pay costs nothing
  Given p0 has 1 move
  When p0 works
  Then it is rejected because "they have at least 2 moves"
  And p0 has 1 move
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the three files and `bunx vitest run src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/phrases.ts src/engine/core/lang/compile-phase.ts src/engine/core/lang/declared-actions.ts \
  src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/phrases.test.ts
git commit -m "feat(lang): “It costs 1 action.” under a button: judged before every Only if, spent before the Then lines, one shape for every action"
```

---

### Task 2: Buttons that pick one card

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`CardPick`, `DeclaredAction.pick`, `Vocab.actions[].picksCard`)
- Modify: `src/engine/core/lang/compile-phase.ts` (`PickWords`, `pickLine`, `cardMoveVerb`, `actionLine`, `compileCardPick`, `compilePhase`)
- Modify: `src/engine/core/lang/compile.ts` (the verbs and `readActions` read phase lines as nodes)
- Modify: `src/engine/core/lang/declared-moves.ts` (export `yours`)
- Modify: `src/engine/core/lang/declared-actions.ts` (`aboutCards`, `cardPrompt`, `noCardIn`, `cardCandidates`; `choose` and `apply`)
- Modify: `src/engine/core/lang/refs.ts` (`CARDACTION`)
- Create: `src/engine/core/lang/library/card-pick-phrases.ts` (`registerCardPickPhrases`, in `REGISTRARS` right after `registerPickPhrases`); Modify: `src/engine/core/lang/library/index.ts`
- Modify: `src/engine/core/lang/board-view.ts` (`PickCardView`, `CardPickView`, `ActionView.cards`, `seesFace`, `cardPickView`, `allowedNow`, `readSeatExtras`)
- Modify: `src/engine/core/lang/testing.ts` (`CARD_PICK_GAME`; `vocabFor` passes `picksCard`)
- Test: `src/engine/core/lang/compile-phase.test.ts`, `src/engine/core/lang/declared-actions.test.ts`, `src/engine/core/lang/board-view.test.ts`, `src/engine/core/lang/library/card-pick-phrases.test.ts` (new)

**Interfaces:**
- **`types.ts`:**
  - `export type CardPick`:
    `{ some: boolean; from: ZoneRef; fromText: string; to: ZoneRef | null; onto: ZoneRef | null; ontoText: string | null }`.
    - `some` is true for a set ("some cards").
    - `fromText` is the zone as written ('their stash').
    - `to` is the zone the picked cards move to before the `Then:` lines.
    - `onto` is the zone the target card is picked in (Task 3).
    - A one-card pick with `to` and `onto` both null was written "a card in {zone}".
  - `DeclaredAction.pick?: CardPick`.
  - `Vocab.actions[i].picksCard?: boolean`, set only to true.
- **`testing.ts`:** `CARD_PICK_GAME`, written as below. Task 3 extends it, and Tasks 3–4 build on it. `vocabFor` adds `picksCard: true` for an action with a `pick`.

```ts
/**
 * A card game whose buttons pick cards. Buying one from the shop costs a move and its cost in coins; selling one from your stash
 * is free and gives a coin. Each player has 2 moves each turn, and the turn passes once they have none.
 */
export const CARD_PICK_GAME = [
  'Game: Gem Picks', 'Players: 2 to 3', '  Each player has 7 coins that everyone can see.', '  Each player has 2 moves each turn.',
  '  Players pay with coins.', '',
  'Cards:', '  A deck called gems, starting in the pile:', '    | name | cost | copies |', '    | Ruby | 3    | 4      |', '    | Opal | 1    | 4      |', '',
  'Table:', '  The pile is a pile in the center that no one can see.', '  The shop is a row in the center that everyone can see.',
  '  Each player has a stash row that only they can see.', '  Each player has a case row that everyone can see.', '',
  'Setup:', '  Deal 2 cards from the pile to the shop.', '',
  'Phase: shopping', '  Players take turns.',
  '  A player may buy a card from the shop to their stash.', '    It costs 1 move.', "    Only if they have at least the card's cost in coins.",
  '    Then:', "      They pay the card's cost.",
  '  A player may sell a card in their stash.', '    Then:', '      Move it to the pile.', '      They get 1 coin.',
  '  A player may stop.', '    Then:', '      Their moves go back to 0.',
  '  When they have less than 1 move:', '    The turn passes to the left.', '',
  'End:', '  The game ends when the pile is empty.', '  The highest score wins.',
].join('\n');
```

- **`compile-phase.ts`, the grammar (R1).** All matching is on the normalized line. A cost line under it is any child that matches `/^it costs /i`. With `BASE = '(\\w+(?: .+?)?)'`, the forms are, in this order:
  1. `PICK_ONTO = ^(?:a|any) player may BASE (a card|some cards) from (.+?) to a card in (.+)$`: cards and a target (Task 3 reads it fully; in this task it is recognised and left as `unread`).
  2. `LOOSE_MOVE_LINE` (as today), with no cost line under it: a card move, read exactly as today.
  3. `PICK_TO = ^(?:a|any) player may BASE (a card|some cards) from (.+?) to (.+)$`, with a cost line for "a card". Sets need none.
  4. `PICK_SOME = ^(?:a|any) player may BASE some cards from (.+)$` (Task 3).
  5. `PICK_IN = ^(?:a|any) player may BASE a card in (.+)$`.
  6. Any other line that mentions a card is `unread`: reported with `MALFORMED_MOVE` as today.
- **The functions:**
  - `export type PickWords`:
    `{ verb: string; words: string; written: string; base: string; anyone: boolean; some: boolean; fromText: string; toText: string | null; ontoText: string | null }`.
    - `words` is the lowercase text after "may", which is the move type.
    - `base` is the lowercase words before " a card" or " some cards".
    - `verb` is the first word of the base.
  - `export function pickLine(node: OutlineNode): PickWords | null`. In this task it returns only the "a card" lines of items 3 and 5. Items 1 and 4, and "some cards" in item 3, stay `unread` until Task 3.
  - `export function cardMoveVerb(node: OutlineNode): string | null`: the verb of a card move or of an `unread` card line.
  - `export function actionLine(node: OutlineNode): RegExpExecArray | null`: a button that picks no card.

  `compile.ts` calls all three with the phase's child nodes:
  - `verbs` comes from `cardMoveVerb`;
  - `readActions` takes `actionLine` buttons as now, and `pickLine` buttons as `{ verb, words, base, targeted: false, anyone, amount: false, picksPlayer: false, picksCard: true }`.
- **`compileCardPick(node, words: PickWords, ctx): DeclaredAction | null`:**
  - Its zones are read with today's `moveZone`, so a misnamed zone gets the same message as in a card move. Each must be one zone (`ONE_ZONE`).
  - Its lines are read with `readRuleBody(node, { ...ctx, inMove: true, player: true, card: true })` for one card.
  - It returns `{ verb, words, base, label: actionLabel(written), target: null, anyone, amount: false, picksPlayer: false, conditions, effects, line, pick, ...cost }`.
  - It is null on a reserved verb, a zone it can't read, or `badCost`.
  - In `compilePhase` a pick button goes through the same checks as any button: `repeated`, `labelled`, `sameVerb` against card moves, and `moveElsewhere`. Its `verb` joins `uses.actions`.
- **`declared-actions.ts`:**
  - `export function cardPrompt(action: DeclaredAction): string` is the refusal for a press without a card it accepts:
    - `` `Pick a card in ${yours(fromText)} to ${secondPersonWords(base)}.` `` for the "a card in" form, e.g. `Pick a card in your stash to sell.`;
    - `` `Pick a card from ${yours(fromText)} to ${secondPersonWords(base)}.` `` otherwise, e.g. `Pick a card from the shop to buy.`;
    - a set's prompt is Task 3's.
  - `` export const noCardIn = (zoneText: string): string => `There is no card in ${yours(zoneText)}.` ``
  - `export function cardCandidates(runtime: LangRuntime, action: DeclaredAction, state: GameState, seat: PlayerId): string[]`: the ids in the from-zone for `seat`, in slot order. For a pile it is only its top card, and `[]` when the zone resolves to no seat at this table.
  - **`aboutCards`** checks the press, after the out check:
    - `m.cardId` must be a string;
    - the card must be on the table, in the from-zone for `by`;
    - from a pile it must be the top card, else `` `You can only take the top card of ${yours(fromText)}.` ``;
    - else `cardPrompt`.
  - **On success:**
    - the subject is `{ player: by, space: null, card: cardId }`;
    - the lines see `MoveInfo` `{ verb: action.verb, by, cardId, from: <the card's zone>, to: <the to-zone id, else the card's zone> }`;
    - `failedGroup` gets the same `MoveInfo` and subject.
  - **`apply`** runs `recordAction`, then `payCost`, then `relocate([cardId], toZoneId)` when `pick.to` is set, then the `Then:` lines with the `MoveInfo` and subject. No `movedBy` mark.
- **`declared-moves.ts`:** `export const yours` (unchanged).
- **`refs.ts`:** `CARDACTION = wordType('cardaction', '[action]', (v) => v.actions.filter((a) => a.picksCard === true).map((a) => [thirdPersonWords(a.base), a.base]), undefined)`, added to `VOCAB_TYPES`. Several buttons may share a base.
- **`library/card-pick-phrases.ts`:** the example actions, registered through a helper `pressesCardButton(form)`:
  - `{player} {cardaction} {cardlist}`;
  - `{player} {cardaction} {cardlist} to {zone}`.

  The algorithm (Task 3 adds `to {card}` and sets):

```text
by = the seat; buttons = every pick button with this base, the current phase's first, then the other phases' in written order
keep those the words fit: “to {zone}” → pick.to resolves for by to the zone named (soleZone(zone, env, by));
  no “to …” → pick.onto is null. A list of more than one card → pick.some.
none fit → RuleError `No button lets ${by} ${base} a card to ${describeZone(zone)}.`
takers = the fitting buttons of the current phase whose from-zone (for by) holds a distinct in-play card matching each named card
one taker → it; several → RuleError
  `${by} could ${base} ${describeCard(first)} with more than one button: ${joinOr(wordings.map((w) => `“${w}”`))}. Say where it goes.`
none → the first fitting button (the game refuses the press in its own words)
each named card: the lowest-id match in its from-zone not yet taken, else the lowest-id match in play (not in BOX_ZONE) not yet taken,
  else RuleError `I can't find ${describeCard(match)} for ${by} to ${base}.`
move: { type: button.words, cardId }   (a set: cardIds, Task 3)
```

- **`board-view.ts`:**
  - `export type PickCardView = { id: string; name: string; allowed: true | string }`.
  - `export type CardPickView = { some: boolean; prompt: string; cards: PickCardView[]; onto: { prompt: string; targets: { [cardId: string]: PickCardView[] } } | null }`.
  - `ActionView.cards?: CardPickView`, only on a pick button.
  - `seesFace(game: CompiledGame, card: CardState, seat: PlayerId): boolean`, by the same rule as `isRevealed`: the card is face up; or its zone is public; or its zone is owner-visible and the seat owns it; or `revealTo` names the seat or is `'all'`.
  - `cardPickView(engine, runtime, state, seat, action): { cards: CardPickView; allowed: true | string }`:
    - `prompt` is `cardPrompt(action)` without its final period.
    - For each candidate, `name` is `cardName(card, game)` when `seesFace`, else `'a face-down card'`. `allowed` is `allowedNow(engine, state, seat, words, { cardId })`.
    - The button's `allowed`:
      - once the game is over, `The game is over.`;
      - with no candidates, `noCardIn(fromText)`;
      - otherwise true when any candidate is, else the first candidate's verdict.
    - For a seat that is out it gives `OUT_OF_GAME` and `cards: []`.
  - `allowedNow`'s pick gains `cardId`, `cardIds` and `onto`, each put on the move only when given.
  - `readSeatExtras` accepts an action whose `cards` is absent or has this shape.

- [ ] **Step 1: Write the failing tests.**

In `compile-phase.test.ts`, add `describe('buttons that pick a card')`, on `CARD_PICK_GAME`:
- **Read.** It compiles with `[]`, and `phase.moves` is `[]`. `buy` matches:
  - `words: 'buy a card from the shop to their stash'`, `base: 'buy'`, `label: 'Buy a card from the shop to your stash'`;
  - `pick: { some: false, from: { shared: 'shop' }, fromText: 'the shop', to: { of: { who: 'actor' }, zone: 'stash' }, onto: null, ontoText: null }`;
  - `cost: { amount: 1, counter: 'moves' }`.

  `sell` has `pick.from` `{ of: { who: 'actor' }, zone: 'stash' }`, `to: null`, and no `cost` key.
- **R1: no cost line, still a card move.** With the buy's `    It costs 1 move.` removed, `phase.moves.map((m) => m.verb)` is `['buy']`, and no action has the base `buy`.
- **"it" and "the card" in a pick.** These compile with `[]`:
  - with `  Cards can have shine.` under `Cards:` and `      It gains 1 shine.` under sell's `Then:`;
  - with `    Only if the card is not a Ruby.` under sell.

  `      Move it to the pile.` under stop's `Then:` reports `“Move it to the pile” only makes sense in a rule about a card, such as “When a card …”.`
- **Problems.**
  - `  A player may sell a card in their stsh.` gives the same message as the card move line `  A player may buy a card from the shop to their stsh.` does.
  - `  A player may sell a card in each stash.` gives `A move goes from one zone to one zone.`
  - `  A player may sell a card from their stash.` gives `MALFORMED_MOVE`.
  - Each makes no button.
- **One kind per verb.** In a two-phase variant, `A player may buy a card from the shop to their stash.` as a card move in one phase and the costed button in the other gives today's `buttonElsewhere` / `moveElsewhere` message on the later line.

In `declared-actions.test.ts`, add `describe('buttons that pick a card')`.
- `picks(arrange)` is an engine on `arrange(started)`, where `started` is the state after Setup of a 2-player `CARD_PICK_GAME` (seed 1).
- The arrangement:
  - `r1` and `o1` (a Ruby and an Opal) are relocated to the shop, which holds nothing else;
  - `r2` and `o2` to `stash-p0`;
  - `BUY` and `SELL` are the two move types.

The tests:
- **Buying.** `{ type: BUY, by: 'p0', cardId: r1 }` is accepted:
  - r1 is in `stash-p0`;
  - p0 has 4 coins and 1 move;
  - r1's data has no `movedBy`.
- **Selling, free.** `{ type: SELL, by: 'p0', cardId: o2 }` is accepted. o2 is the pile's top card, and p0 has 8 coins and 2 moves.
- **"the card" is the picked card.** With `Only if the card is not a Ruby.` under sell, selling r2 is refused with `the card is not a Ruby`.
- **Review Focus: refused presses.** Each of these is refused with `Pick a card from the shop to buy.`:
  - no `cardId`;
  - `cardId: r2` (p0's stash);
  - `'c999'`;
  - `7`.

  Also: p1's press gives `not p0's turn`, and p0 at 2 coins buying r1 gives `they have at least the card's cost in coins`. After each refusal, the state equals the one before it.
- **A pile gives its top card.** With `  A player may take a card in the pile.` added:
  - `cardCandidates` for p0 is `[<the pile's top id>]`;
  - a press with the card under it gives `You can only take the top card of the pile.`
- **Candidates.** For p0, `cardCandidates` gives `[r1, o1]` for `BUY` and `[r2, o2]` for `SELL`. For p1, `SELL` gives `[]`.
- **Undo and replay.** After the buy, `engine.undo()` restores the state. A fresh engine given `loadLog(engine.getLog())` equals the engine's state.

In `board-view.test.ts`, add `describe('buttons that pick a card')`, on the same arrangement:
- **p0's buy** equals:

```ts
{
  move: BUY, label: 'Buy a card from the shop to your stash', allowed: true, target: null, amount: false, players: null,
  cards: {
    some: false, prompt: 'Pick a card from the shop to buy',
    cards: [{ id: r1, name: 'Ruby', allowed: true }, { id: o1, name: 'Opal', allowed: true }], onto: null,
  },
}
```

- **Sell and stop.** p0's sell lists r2 and o2, named, with the prompt `Pick a card in your stash to sell`. `'cards' in stop` is false.
- **Money.**
  - At 2 coins, the Ruby's `allowed` is `they have at least the card's cost in coins`, the Opal's true, and the button's true.
  - At 0 coins, the button's `allowed` is the Ruby's reason.
- **Not the seat's turn.** For p1, each buy candidate and the button read `It's p0's turn.`. p1's sell has `cards: []` and `allowed` `There is no card in your stash.`
- **Out and over.** p1 out (`markOut`) gives buy `allowed` `You're out of the game.` and `cards: []`. With a result set, each candidate and the button read `The game is over.`
- **Review Focus: hidden cards.** With `  A player may peek a card in the other player's stash.\n    Then:\n      Move it to their case.` added and two cards in `stash-p1`:
  - p0's peek names both `a face-down card`;
  - pressing it with the first id is accepted, and the card is then in `case-p0`.
- **`readSeatExtras`.** It accepts these extras. It gives null when `cards.cards[0].allowed` is `3`, and when `cards` is `{ prompt: 'x' }`.

In the new `library/card-pick-phrases.test.ts`, run examples (`runExamples`) on `CARD_PICK_GAME` plus:

```text
Example: buying and selling by name
  Given the shop has a Ruby and an Opal
  And p0's stash has an Opal
  When p0 sells the Ruby
  Then it is rejected because "Pick a card in your stash to sell."
  When p0 buys the Ruby
  Then it is accepted
  And p0 has 4 coins
  And p0 has 1 move
  And p0's stash has an Opal and a Ruby
  When p0 sells the Opal
  Then it is accepted
  And p0 has 5 coins
  And p0's stash has a Ruby
  And the shop has an Opal
```

- It passes.
- **Review Focus: two buttons.** `TWO_WAYS` adds `  A player may buy a card from the shop to their case.\n    It costs 1 move.` after the first buy.
  - The example `Given the shop has a Ruby` / `When p0 buys the Ruby to p0's case` / `Then p0's case has a Ruby` passes.
  - `When p0 buys the Ruby` fails, its message ending `p0 could buy a Ruby with more than one button: “buy a card from the shop to their stash” or “buy a card from the shop to their case”. Say where it goes.`
- **No fit.** On `CARD_PICK_GAME`:
  - an example `Given the shop has a Ruby` / `When p0 buys the Ruby to p0's stash` / `Then p0's stash has a Ruby` passes;
  - an example `When p0 sells the Opal to p0's case` fails with a message ending `No button lets p0 sell a card to p0's case.`

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/board-view.test.ts src/engine/core/lang/library/card-pick-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the four files and `bunx vitest run src/engine/core/lang src/games`. The existing tests for card lines it can't read (`compile-phase.test.ts`) pass unchanged. Then run `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/compile-phase.ts src/engine/core/lang/compile.ts src/engine/core/lang/declared-moves.ts \
  src/engine/core/lang/declared-actions.ts src/engine/core/lang/refs.ts src/engine/core/lang/library/card-pick-phrases.ts \
  src/engine/core/lang/library/index.ts src/engine/core/lang/board-view.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/board-view.test.ts \
  src/engine/core/lang/library/card-pick-phrases.test.ts
git commit -m "feat(lang): buttons that pick one card, read as a move about it, with its candidates in the view and examples that name it"
```

---

### Task 3: A card and the card it goes to, and sets of cards

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`Subject.onto`, `Subject.cards`)
- Modify: `src/engine/core/lang/compile-util.ts` (`LineCtx.cards`, `LineCtx.onto`, `unmetNeed`)
- Modify: `src/engine/core/lang/phrases.ts` (`PhraseOpts.needsCards`, `needsOnto`, both copy sites)
- Modify: `src/engine/core/lang/compile-phase.ts` (`pickLine` reads `PICK_ONTO` and `PICK_SOME`; the line contexts)
- Modify: `src/engine/core/lang/declared-actions.ts` (`aboutCards` for sets and targets, `ontoPrompt`, `ontoCandidates`; `apply`)
- Modify: `src/engine/core/lang/library/card-pick-phrases.ts`, `src/engine/core/lang/library/support.ts` (`theTargetCard`, `thePickedCards`)
- Modify: `src/engine/core/lang/board-view.ts` (`cardPickView` for sets and targets)
- Modify: `src/engine/core/lang/testing.ts` (`CARD_PICK_GAME` gains show and trade)
- Test: `src/engine/core/lang/compile-phase.test.ts`, `src/engine/core/lang/declared-actions.test.ts`, `src/engine/core/lang/board-view.test.ts`, `src/engine/core/lang/library/card-pick-phrases.test.ts`

**Interfaces:**
- **`testing.ts`:** insert before `'  A player may stop.'` in `CARD_PICK_GAME`:

```ts
'  A player may show a card from their stash to a card in their case.', '    It costs 1 move.', '    Only if the target card is not a Ruby.',
'    Then:', '      Move it to their case.',
'  A player may trade some cards from their stash to the shop.', '    It costs 1 move.', '    Only if they picked at most 2 cards.',
```

- **`types.ts`:** `Subject.onto?: string` is the target card's id. `Subject.cards?: string[]` is a set's ids, in the order the press gave them.
- **`compile-util.ts`:**
  - `LineCtx.cards?: boolean` is true for a set's lines. `LineCtx.onto?: boolean` is true for a target form's lines. Absent means false.
  - `unmetNeed` adds:
    - `` NEEDS_CARDS = (clean) => `“${clean}” only makes sense in a button that picks some cards, like “A player may discard some cards from their hand.”` ``;
    - `` NEEDS_ONTO = (clean) => `“${clean}” only makes sense in a button that picks a card and the card it goes to, like “A player may stack a card from their hand to a card in the row.”` ``.
- **`compile-phase.ts`:** a target form reads its target zone with `moveZone` and the one-zone check. The lines are read with:
  - one card: `{ ...ctx, inMove: true, player: true, card: true, onto }`;
  - a set: `{ ...ctx, player: true, cards: true, onto }`, with no `inMove` and no `card`.
- **`declared-actions.ts`:**
  - **Prompts.**
    - A set's `cardPrompt` is `` `Pick one or more cards from ${yours(fromText)} to ${secondPersonWords(base)}.` ``
    - `export function ontoPrompt(action): string` is `` `Pick where it goes: a card in ${yours(ontoText)}.` ``, with `they go` for a set.
  - **`export function ontoCandidates(runtime, action, state, seat): string[]`**: the ids in the target zone for `seat`, in slot order. A pile gives only its top card.
  - **`aboutCards`, a set:**
    - `m.cardIds` must be a non-empty array of distinct strings;
    - each id must be on the table, in the from-zone (a pile: its top card);
    - else `cardPrompt`.
  - **`aboutCards`, a target form:**
    - `m.onto` must be a string;
    - the card must be in the target zone for `by` (a pile: its top card);
    - it must not be one of the picked cards;
    - else `ontoPrompt`.
    - It is checked after the card or cards.
  - **The subject:**
    - a set: `{ player: by, space: null, card: null, cards, ...(onto) }`, with no `MoveInfo`;
    - one card: as in Task 2, plus `onto`.
  - **`apply`** for a set with `to` relocates the ids, in the press's order, before the `Then:` lines.
- **`card-pick-phrases.ts`:**
  - condition `the target card is {cardclass}` and condition `the target card is not {cardclass}` (`needsOnto`);
  - effect `move the picked cards to {zone}` (`needsCards`): relocate in the press's order;
  - condition `they picked at most {int} card(s)` (`needsCards`);
  - action `{player} {cardaction} {cardlist} to {card}`.
    - It keeps buttons with `pick.onto`.
    - The target is the lowest-id in-play match in the target zone for `by` that isn't one of the picked cards, else any such match in play, else the `I can't find …` error.
    - With no fitting button: `No button lets ${by} ${base} a card to another card.`
  - A list of two or more cards presses a set button with `cardIds`. A list of one may press either kind; both kinds fitting is the two-buttons error.
- **`support.ts`:** `theTargetCard(env): CardState` and `thePickedCards(env): string[]`. Each throws a plain `Error` when the subject lacks it, since the compiler only lets such phrases in where it is given.
- **`board-view.ts`, `cardPickView`:**
  - **A set.** `some: true`. Each card's `allowed` is the move with `cardIds: [id]`, each card judged alone (R1).
  - **A target form.** `onto` is `{ prompt: ontoPrompt(action) without its period, targets }`. `targets[id]` lists each target of `ontoCandidates`, named as in Task 2, with `allowed` from the move with the card (or `[id]`) and `onto: target`.
    - A card's own `allowed` is true when any of its targets is. Otherwise it is the first target's verdict, or `noCardIn(ontoText)` with no targets.

- [ ] **Step 1: Write the failing tests.**

In `compile-phase.test.ts`, extend `describe('buttons that pick a card')`:
- **Read.** The extended `CARD_PICK_GAME` compiles with `[]`.
  - `show.pick` is `{ some: false, from: { of: { who: 'actor' }, zone: 'stash' }, fromText: 'their stash', to: null, onto: { of: { who: 'actor' }, zone: 'case' }, ontoText: 'their case' }`.
  - `trade.pick` is `{ some: true, …, to: { shared: 'shop' }, onto: null, ontoText: null }`.
- **The two other set forms.**
  - `  A player may toss some cards from their stash.\n    Then:\n      Move the picked cards to the pile.` compiles with `pick.to` null.
  - `… some cards from their stash to a card in their case.` compiles with `pick.some` true and `pick.onto` set.
- **Needs.**
  - `Only if the target card is a Ruby.` under sell gives `NEEDS_ONTO`.
  - `Move the picked cards to the pile.` under sell gives `NEEDS_CARDS`.
  - Under trade, `Move it to the pile.` gives the needs-a-card message, and `Only if the card is a Ruby.` gives `“the card is a Ruby” only makes sense in a rule about a player's move.`

In `declared-actions.test.ts`, extend `describe('buttons that pick a card')`. Add `o3`, an Opal, to `case-p0`; `SHOW` and `TRADE` are the move types.
- **Show.**
  - `{ type: SHOW, by: 'p0', cardId: o2, onto: o3 }` is accepted. o2 is in `case-p0`, and p0 has 1 move.
  - With a Ruby `r3` in `case-p0` instead, the target `r3` gives `the target card is not a Ruby`.
- **Review Focus: refused targets.** Each of these gives `Pick where it goes: a card in your case.`, and nothing changes:
  - no `onto`;
  - `onto: r1` (the shop);
  - `onto: o2` (the picked card);
  - `onto: 5`.
- **Trade.** `{ type: TRADE, by: 'p0', cardIds: [o2, r2] }` is accepted. `shop` then holds r1, o1, o2, r2 in slot order, and p0 has 1 move.
- **Judged as a whole (R1).**
  - With a third stash card `o4`, `cardIds: [r2, o2, o4]` gives `they picked at most 2 cards`.
  - `canDispatch` with each id alone (`[r2]`, `[o2]`, `[o4]`) is true.
- **Review Focus: refused sets.** Each of these gives `Pick one or more cards from your stash to trade.`, and nothing changes:
  - `[]`;
  - `[r2, r2]`;
  - `[r2, r1]`;
  - `'r2'`;
  - no `cardIds`.
- **The press's order.** `TOSS` is `CARD_PICK_GAME` plus the toss button from the compile test. Its toss with `[o2, r2]` leaves r2 on the pile's top and o2 under it.

In `board-view.test.ts`, extend the describe:
- **p0's show** has `cards` equal to:

```ts
{
  some: false, prompt: 'Pick a card from your stash to show',
  cards: [{ id: r2, name: 'Ruby', allowed: true }, { id: o2, name: 'Opal', allowed: true }],
  onto: { prompt: 'Pick where it goes: a card in your case', targets: { [r2]: [{ id: o3, name: 'Opal', allowed: true }], [o2]: [{ id: o3, name: 'Opal', allowed: true }] } },
}
```

- **Only a Ruby in the case.** Each target reads `the target card is not a Ruby`, and so do each card and the button.
- **An empty case.** Each card and the button read `There is no card in your case.`, and `targets` is `{ [r2]: [], [o2]: [] }`.
- **p0's trade** has `some: true`, the prompt `Pick one or more cards from your stash to trade`, and both cards `allowed: true`.

In `card-pick-phrases.test.ts`, append and run:

```text
Example: showing a card on a card
  Given p0's stash has an Opal
  And p0's case has a Ruby and an Opal
  When p0 shows the Opal to the Ruby
  Then it is rejected because "the target card is not a Ruby"
  When p0 shows the Opal to the Opal
  Then it is accepted
  And p0's case has a Ruby, an Opal and an Opal
  And p0 has 1 move

Example: trading at most two cards
  Given p0's stash has a Ruby, an Opal and an Opal
  And the shop is empty
  When p0 trades the Ruby, the Opal and the Opal
  Then it is rejected because "they picked at most 2 cards"
  When p0 trades the Ruby and the Opal
  Then it is accepted
  And the shop has a Ruby and an Opal, in that order
  And p0's stash has an Opal
```

Both pass. `When p0 sells the Opal to the Ruby` fails with a message ending `No button lets p0 sell a card to another card.`

- [ ] **Step 2: Run** the four test files. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them and `bunx vitest run src/engine/core/lang src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/compile-util.ts src/engine/core/lang/phrases.ts src/engine/core/lang/compile-phase.ts \
  src/engine/core/lang/declared-actions.ts src/engine/core/lang/library/card-pick-phrases.ts src/engine/core/lang/library/support.ts \
  src/engine/core/lang/board-view.ts src/engine/core/lang/testing.ts src/engine/core/lang/compile-phase.test.ts \
  src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/board-view.test.ts src/engine/core/lang/library/card-pick-phrases.test.ts
git commit -m "feat(lang): buttons that pick a card and the card it goes to, or a set judged card by card in the view and as a whole when pressed"
```

---

### Task 4: The card picker on the playtest page

**Files:**
- Create: `src/pages/designer/card-picker.tsx`, `src/pages/designer/card-picker.test.tsx`
- Modify: `src/pages/designer/board-controls.tsx` (`ActionButton`'s press)
- Modify: `src/pages/designer/playtest.tsx` (`SeatCanvas`)
- Test: `src/pages/designer/playtest.test.tsx` (append)

**Interfaces:**
- Consumes `CardPickView` and `ActionView.cards` (Tasks 2–3).
- **`card-picker.tsx`:** `CardPicker({ pick, onSend, onRefused, onCancel })`.
  - `pick: CardPickView`.
  - `onSend(chosen: { cardId: string; onto?: string } | { cardIds: string[]; onto?: string }): void`.
  - `onRefused(reason: string): void` and `onCancel(): void`.
  - It renders the page copy under Global Constraints, wrapping like `ActionButtons`.
  - **One card, no target.** A live card sends `{ cardId }`.
  - **One card and a target.** A live card switches the picker to its targets: the text becomes `pick.onto.prompt`, and the buttons are `pick.onto.targets[cardId]`. A live target sends `{ cardId, onto }`.
  - **A set.** A live card toggles `aria-pressed`, keeping the order clicked. `Confirm`:
    - with nothing picked, calls `onRefused(<pick.prompt>.)`, the prompt with a period added;
    - with no target, sends `{ cardIds }`;
    - with a target, switches to the targets. A target is live when every picked card's verdict for it is true; otherwise it is greyed with the first verdict that isn't. A live one sends `{ cardIds, onto }`.
  - **A refused card or target** calls `onRefused(reason)` and stays open.
  - **Ids dropped from the view.** Ids no longer in `pick.cards` are dropped from what is picked.
  - **`Cancel`** calls `onCancel()`.
- **`board-controls.tsx`:** `ActionButton` calls `onPick(action)` for `action.cards !== undefined` too.
- **`playtest.tsx`, `SeatCanvas`:**
  - `choosingCards` is `action?.allowed === true && action.cards !== undefined ? { move: action.move, pick: action.cards } : null`, and it counts against `stale` like the other two.
  - Right after `ActionButtons`, in both panel layouts, it renders `<CardPicker key={choosingCards.move} pick={choosingCards.pick} …/>`.
    - `onSend` clears the error, ends picking and sends `{ type: move, ...chosen }`.
    - `onRefused` is `flash`, and `onCancel` ends picking.

- [ ] **Step 1: Write the failing tests.**

In `card-picker.test.tsx`, render `CardPicker` with hand-made views and `vi.fn()` callbacks:
- **One card.**
  - The cards are `c1` 'Ruby' (live) and `c2` 'Opal' refused `they have at least the card's cost in coins`.
  - The group `Pick cards` shows the prompt.
  - `Pick Opal` has `aria-disabled="true"` and that reason as its title.
  - Clicking it calls `onRefused` with the reason and sends nothing.
  - Clicking `Pick Ruby` calls `onSend({ cardId: 'c1' })`.
- **A target.**
  - The targets of `c1` are `c9` 'Opal' (live) and `c8` 'Ruby' refused `the target card is not a Ruby`.
  - Clicking `Pick Ruby` shows the onto prompt and `Pick Opal`, `Pick Ruby` and `Cancel`.
  - The refused target flashes.
  - `Pick Opal` sends `{ cardId: 'c1', onto: 'c9' }`.
- **A set.**
  - Click `c1`, then `c3`, then `c1` again, then `c2`. `aria-pressed` follows, and `Confirm` sends `{ cardIds: ['c3', 'c2'] }`.
  - `Confirm` with none picked calls `onRefused('Pick one or more cards from your stash to trade.')`.
- **A set and a target.** With `c1` and `c2` picked and `c2`'s verdict for `c9` refused `x`, the target `c9` is greyed with `x`.
- **Review Focus: a card leaves.** With `c1` and `c3` picked, rerender with a view without `c3`. `Confirm` sends `{ cardIds: ['c1'] }`.
- **`Cancel`** calls `onCancel`.

In `playtest.test.tsx`, append `describe('Playtest: picking cards')`.
- `pickGame = compileGame(CARD_PICK_GAME, lib).game!` at 2 players.
- `initial` is the after-Setup state, arranged with the shop holding a Ruby and an Opal, `stash-p0` a Ruby and an Opal, and `case-p0` a Ruby and an Opal.
- `panelOf(seat)` and `submit()` are as in **picking another player**.
- `picker = () => within(panelOf('p0')).queryByRole('group', { name: 'Pick cards' })`.

The tests:
- **Buy.** Press p0's `Buy a card from the shop to your stash`.
  - The picker shows `Pick a card from the shop to buy`, `Pick Ruby` and `Pick Opal`.
  - Click `Pick Ruby`: the picker closes, and the money line reads `p0 4 coins, 1 move` (in both panels).
- **A refused card.** At 2 coins, `Pick Ruby` is greyed with the reason. Clicking it sends nothing, shows the reason in p0's panel, and leaves the picker open.
- **Sell.** Press `Sell a card in your stash` and click `Pick Opal`: `p0 8 coins, 2 moves`.
- **Show.** Press `Show a card from your stash to a card in your case` and click `Pick Opal`.
  - The case's `Pick Ruby` is greyed `the target card is not a Ruby`.
  - Clicking `Pick Opal` sends (`submit` spy) `('p0', expect.objectContaining({ type: SHOW, cardId: <the stash Opal>, onto: <the case Opal> }))`.
- **Trade.** Press `Trade some cards from your stash to the shop`, click `Pick Opal`, then `Pick Ruby`, then `Confirm`. The submit is called with `cardIds: [<stash Opal>, <stash Ruby>]`.
- **Another seat.** p1's buy button reads `It's p0's turn.` on hover. Pressing it opens no picker in p1's panel.
- **Pressing another button closes the picker.** Open p0's buy picker, then press p0's `Stop`. p0 has no picker.
- **Review Focus: the button greys while the picker is open.**
  - Press p0's `Stop`, so it is p1's turn, and open p1's buy picker.
  - Press `Undo`. It is p0's turn again, p1's buy reads `It's p0's turn.`, and p1's picker is gone.
  - Once p0 presses `Stop` again, p1's picker does not open by itself.
- **Review Focus: Undo removes a picked card.**
  - The stash starts with only an Opal. p0 buys the shop's Ruby, opens Trade, and picks the Opal and the Ruby.
  - Press `Undo`. The Ruby is back in the shop, and the picker stays open without it.
  - `Confirm` sends `cardIds: [<the Opal>]`.
- **Cancel** closes the picker without sending.

- [ ] **Step 2: Run** `bunx vitest run src/pages/designer`. Expected: the new tests FAIL, and the existing ones pass.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/pages/designer src/pages/hearts-demo`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/pages/designer/card-picker.tsx src/pages/designer/card-picker.test.tsx src/pages/designer/board-controls.tsx \
  src/pages/designer/playtest.tsx src/pages/designer/playtest.test.tsx
git commit -m "feat(designer): a button that picks cards lists them under the buttons, greyed with reasons, with Confirm for a set and a second list for the card it goes to"
```

---

### Task 5: Startup Simulator's slice 1a, rewritten with costs and picks

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`
- Modify: `src/pages/designer/playtest-fitted.test.tsx`, `README.md`

**Interfaces:**
- **Move types**, all buttons, and `src/games/startup-simulator.rules` has no card move left:
  - `HIRE_AGENCY = 'hire a card from the agency row to their bench'`;
  - `HIRE_MARKET = 'hire a card from the open job market to their bench'`;
  - `DRAFT_SEED = 'draft a card from the seed market to their backlog'`;
  - `DRAFT_GROWTH = 'draft a card from the growth market to their backlog'`;
  - `DRAFT_POOL = 'draft a card from the open idea pool to their backlog'`;
  - `KEEP = 'keep a card in their research'`;
  - `DISCARD_BENCH = 'discard a card in their bench'`;
  - `DISCARD_BACKLOG = 'discard a card in their backlog'`;
  - the three recruits, the two researches and `end their actions` as before.
- **Their labels on the page:**
  - `Hire a card from the agency row to your bench` and `Hire a card from the open job market to your bench`;
  - `Draft a card from the seed market to your backlog`, and the same for the growth market and the open idea pool;
  - `Keep a card in your research`;
  - `Discard a card in your bench` and `Discard a card in your backlog`.

- [ ] **Step 1: Rewrite the four phases.** Replace `Phase: actions` through the end of `Phase: backlog cleanup` with this text. The `When their research has the market crash:` and `When their research is empty:` rules of research stay as they are.

```text
Phase: actions
  Players take turns.
  Hint: Spend 3 actions: recruit, draft ideas or research. Press hire or draft, then pick the card.
  A player may recruit a junior software dev.
    It costs 1 action.
    Only if they have at least 2 capital.
    Then:
      They pay 2.
      A new Junior Software Dev goes to their bench.
  A player may recruit a junior hardware eng.
    It costs 1 action.
    Only if they have at least 2 capital.
    Then:
      They pay 2.
      A new Junior Hardware Eng goes to their bench.
  A player may recruit a junior qa tester.
    It costs 1 action.
    Only if they have at least 2 capital.
    Then:
      They pay 2.
      A new Junior QA Tester goes to their bench.
  A player may hire a card from the agency row to their bench.
    It costs 1 action.
    Only if they have at least the card's cost in capital.
    Then:
      They pay the card's cost.
  A player may hire a card from the open job market to their bench.
    It costs 1 action.
    Only if they have at least 1 capital.
    Then:
      They pay 1.
  A player may draft a card from the seed market to their backlog.
    It costs 1 action.
    Only if their backlog has fewer than 4 cards.
  A player may draft a card from the growth market to their backlog.
    It costs 1 action.
    Only if their backlog has fewer than 4 cards.
  A player may draft a card from the open idea pool to their backlog.
    It costs 2 actions.
    Only if their backlog has fewer than 4 cards.
  A player may research the seed deck.
    It costs 1 action.
    Only if their backlog has fewer than 4 cards.
    Only if the seed deck is not empty.
    Then:
      Deal up to 3 cards from the seed deck to their research.
      The research phase starts with them.
  A player may research the growth deck.
    It costs 1 action.
    Only if their backlog has fewer than 4 cards.
    Only if the growth deck is not empty.
    Then:
      Deal up to 3 cards from the growth deck to their research.
      The research phase starts with them.
  A player may end their actions.
    Then:
      Their actions go back to 0.
  When they have less than 1 action, go to bench cleanup.

Phase: research
  Hint: Keep one of the cards you drew. The rest go to the open idea pool.
  A player may keep a card in their research.
    Then:
      Move it to their backlog.
      Move their research to the open idea pool.
      Go back to the interrupted turn.
  …its two When rules, unchanged…

Phase: bench cleanup
  Hint: Your bench holds 5 cards. Discard the rest to the open job market.
  A player may discard a card in their bench.
    Only if their bench has more than 5 cards.
    Then:
      Move it to the open job market.
  When their bench has fewer than 6 cards, go to backlog cleanup.

Phase: backlog cleanup
  Hint: Your backlog holds 3 cards. Discard the rest to the open idea pool.
  A player may discard a card in their backlog.
    Only if their backlog has more than 3 cards.
    Then:
      Move it to the open idea pool.
  When their backlog has fewer than 4 cards:
    The turn passes to the left.
```

Why the meaning is unchanged:
- **Costs and refusals.** Each old `Only if they have at least N action(s)` came first and is now the cost line. That line is judged first and refuses in the same words.
- **When AP is spent.** Each old `They spend N action(s)` is spent before the `Then:` lines, as before, ahead of any interrupt.
- **Hires and drafts** still move the card to the same zone before paying.
- **Keep and the discards** put the card where the card move did, in the same order.
- **The 21 examples need no change of text.** `When p0 hires the Diva`, `… drafts the Smart Lock`, `… keeps the Dating App` and `… discards a Sales Rep` each find the one button whose zone holds the named card.

- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`. Expected:
  - the 21 examples pass unchanged;
  - the engine tests and long runs fail with unknown move types (`hire`, `draft`, `keep`, `discard`).

  An example that fails is a bug in Tasks 1–3 or in this text. Fix that, never the example.
- [ ] **Step 3: Update `startup-simulator.test.ts`.**
  - **Move types.** Add the move-type constants above. Every dispatched or `canDispatch`ed move of type `hire`, `draft`, `keep` or `discard` becomes `{ type: <the button for its source zone>, by, cardId }`. That covers the 9b engine tests and Task 10's auto-player. `toZone` keys are dropped.
  - **Task 10's tally keys** become the 14 move types: the three recruits, `HIRE_AGENCY`, `HIRE_MARKET`, `DRAFT_SEED`, `DRAFT_GROWTH`, `DRAFT_POOL`, the two researches, `KEEP`, `end their actions`, `DISCARD_BENCH` and `DISCARD_BACKLOG`. Each is expected above 0.
  - **The money invariant's cases:**
    - 2 for a recruit;
    - the card's cost (read before) for `HIRE_AGENCY`;
    - 1 for `HIRE_MARKET`;
    - 0 otherwise.
  - Nothing else in the file changes.
- [ ] **Step 4: Update `playtest-fitted.test.tsx`.** Add the helpers:
  - `const picker = () => screen.getByRole('group', { name: 'Pick cards' });`
  - `const pickFirst = () => fireEvent.click(within(picker()).getAllByRole('button', { name: /^Pick / })[0]);`
  - `const pickNamed = (name: string) => fireEvent.click(within(picker()).getAllByRole('button', { name: `Pick ${name}` })[0]);`

  Then:
  - **"Dragging on the fitted table"** becomes **"Picking a card on the fitted table"**. Take the same affordable agency card, `press('Hire a card from the agency row to your bench')`, and `pickNamed(<its name>)`. The expected `lineOf(S)` is unchanged.
  - **"A refused drag"** stays as it is. No card move is left, so every drop is `No rule lets you move a card there.`
  - **In `recruits from every source, …`, each drop becomes a press and a pick.** The checks after each step are unchanged.
    - Step 2: `press('Discard a card in your bench')`, then `pickFirst()`.
    - Step 3: `press('Hire a card from the open job market to your bench')`, then `pickFirst()`.
    - Step 4: `press('Hire a card from the agency row to your bench')`, then `pickNamed(<the affordable card's name>)`.
    - Step 7: `press('Keep a card in your research')`, then `pickFirst()`.
    - Step 8: `press('Draft a card from the seed market to your backlog')`, then `pickFirst()`.
- [ ] **Step 5: Update the README.** In 1a-1's **Card games with turns** paragraph, the bullet about "the card's cost" says "in a button that picks a card" instead of "in a card move". After that paragraph, add a **Buttons that pick cards** paragraph:
  - **The forms:**
    - "A player may buy a card from the shop to their stash." with a cost line is a button that asks for a card from the shop. The card moves there before the `Then:` lines.
    - "… a card in their stash" picks one card and moves nothing by itself.
    - "… a card from … to a card in …" picks a card and the card it goes to.
    - "… some cards from …" picks one or more.
  - **What the lines call them:** "it" and "the card", "the target card", "the picked cards" ("Move the picked cards to the pile.", "Only if they picked at most 2 cards.").
  - **Card moves.** A line with no cost that reads exactly "a card from … to …" is still a card move, moved by dragging.
  - **Costs.** "It costs 1 action." under any button:
    - it refuses with "they have at least 1 action" before every `Only if`;
    - it spends before the `Then:` lines;
    - only a number each player has each turn can be a cost.
  - **Examples** name the card: "When p0 hires the Hacker", "When p0 shows the Opal to the Ruby", "When p0 trades the Ruby and the Opal", "When p0 buys the Ruby to p0's case".
  - **The page** lists the cards a pressed button may pick under the buttons. A set ends with Confirm.
  - **Startup Simulator** is played by picking cards.
- [ ] **Step 6: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 7: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/playtest-fitted.test.tsx README.md
git commit -m "feat(games): Startup Simulator's slice 1a with cost lines and card-pick buttons, played by picking cards; examples unchanged"
```

---

### Task 6: Long runs that press through the view and keep the budget, and the final checks

**Files:**
- Modify: `src/games/startup-simulator.test.ts`

**Interfaces:**
- Consumes:
  - `seatExtras` (`board-view.ts`);
  - `hasCost` and the actions' `cost` (Task 1);
  - `cardCandidates` (Task 2);
  - `TURN_OF_KEY`, `counterOf` and `zoneCards`.
- `playGame(players, seed, watch, { throughView })` also keeps the `runtime` from `createEngine`.
- **`keepsTheBudget(seats)`** is a `watch`, run in every long run alongside `keepsTheRules`. For each move by `by`:
  - `cost` is the pressed button's `cost?.amount ?? 0` in the phase of `before`.
  - `counterOf(after, 'actions', by)` is 0 after `end their actions`. Otherwise it is `counterOf(before, 'actions', by) - cost`.
  - Every other seat's actions are unchanged. The exception is the seat whose turn started in this move (`TURN_OF_KEY` changed to it), which has 3.
- **`throughView: true`** is used for seed 1 at each player count.
  - Before each pick press, the auto-player reads `seatExtras(engine, runtime, state, by)` and the `ActionView` of the button it will press.
  - It picks from that view: the candidate it would have chosen, which must have `allowed === true`.
  - It checks the view:
    - the candidates' ids equal `cardCandidates(runtime, action, state, by)`, which equal the from-zone's cards in slot order;
    - each candidate's `name` is its card's `name`;
    - the button's `allowed` is true exactly when some candidate's is.
  - Other seeds pick as in Task 5.

- [ ] **Step 1: Write the tests.**
  - Add `keepsTheBudget` to the `it.each([2, 3, 4, 5])` runs, and `throughView` for seed 1.
  - In the same `describe`, add **"a refused press spends nothing"**. Take a 2-player game at seed 1, on the start player's turn after Setup, and set that seat's capital to 0 (`setCounter`), so no agency card is affordable.
    - `canDispatch` of `HIRE_AGENCY` for each agency card gives `they have at least the card's cost in capital`.
    - `seatExtras` greys the button with that reason.
    - After a refused `dispatch`, the seat still has 3 actions.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`.
  - When it fails, find out why before changing anything.
  - Change the auto-player, never the rules or an invariant. Report a rule the text can't express.
- [ ] **Step 3: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 4: Run the checks.** Each must print nothing.

```bash
# Startup Simulator's words in shared code, 1b's included
git diff "$BASE" -- src/engine src/pages src/utils ':!*.test.ts' ':!*.test.tsx' ':!src/pages/designer/samples.ts' | grep '^+' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|projects?|cubes?|ops)\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# no existing test line removed outside the two files this plan converts
git diff "$BASE" -- '*.test.ts' '*.test.tsx' ':!src/games/startup-simulator.test.ts' ':!src/pages/designer/playtest-fitted.test.tsx' | grep -E '^-[^-]'
```

- [ ] **Step 5: Run the four games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes. Rent Day still has 108 examples.
- [ ] **Step 6: Commit**

```bash
git add src/games/startup-simulator.test.ts
git commit -m "feat(games): Startup Simulator's long runs press through the page's view and spend actions only through cost lines"
```
