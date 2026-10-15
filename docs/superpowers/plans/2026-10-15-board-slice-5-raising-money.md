# Board Games Slice 5 (Raising Money) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rent Day stops putting a player out the moment their money goes below 0. A player in debt mortgages, sells buildings back or gives up, at any time and on anyone's turn, and the game waits for them, all written in Rent Day's own text. To get there, the language gains buttons any player may press, debts with the player or bank they are owed to, handing everything a player owns to that creditor, percentages of a space's details, yes-or-no space facts that rules set and clear, and a few bank and building phrases.

**Architecture:**
- **Language layer only.** New work is in the language (`src/engine/core/lang/`), the views, the designer page and Rent Day's text. Core `game-state.ts`, `flow.ts` and `game-engine.ts` stay untouched. Nothing about mortgages or bankruptcy exists outside `src/games/rent-day.rules`, `library/rent-day.ts` and tests.
- **"Any player may …" uses the flow's existing exemption.** Its buttons compile like "A player may …" with `DeclaredAction.anyone: true`. `flowDefFor` lists their move types in the phase's `anyActor`, which today only serves `reorder`. Their presses are never written to the turn log (ruling 4), and an After line can't name them, so they never pass a turn.
- **Where the new state lives.**
  - A debt is a new key, `lang:owes`: `{ [seat]: seat | 'bank' }`. It is written by the shared `transfer` and by the each-other-player payments of the pay-with counter. It is never cleared: it is read only while the seat's pay-with counter is below 0 (ruling 2).
  - A mortgage is an ordinary space flag in `lang:facts`, declared by `Spaces can be mortgaged.`
- **Where the new phrases live.**
  - Debts and handing everything over go in a new file, `library/debt-phrases.ts`.
  - Percentages go in `library/board-phrases.ts`, next to `amountOf`.
  - Space flags, bank counts and the color phrase about a flag go in `library/fact-phrases.ts`.
  - "more buildings", "a building" and the mortgaged-rent column line go in `library/rent-day.ts`.
  - The bottom card goes in `library/example-phrases.ts`.
- **Views.** `BoardView.owes` lists who each seat in debt owes. `SpaceView.stripes` names the flags set on a space that no bank item goes with, so the page stripes them; nothing on the page names "mortgaged".
- **Task order follows the breakdown.** Tasks 4 and 5 use the `spaces can be {name}` declaration from Task 3, and Task 5 uses `ANY_PLAYER_BOARD` from Task 1. Task 6 changes the page tests that relied on players going out by themselves. Task 7 builds on slice 4's page commit (kept cards on the money line).

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19, Playwright (installed globally) for the browser check.

**Spec:** `docs/superpowers/specs/2026-10-15-board-slice-5-raising-money-design.md`, including its *Builder-check rulings*. It is part of `docs/superpowers/specs/2026-10-15-board-games-overview-design.md`.

## Global Constraints

- **Branch and commands.** Work on `claude/peaceful-curie-rdfkow`. Single test file: `bunx vitest run <path>`. Full suite: `bun run test` (1807 tests pass at the start). Types: `bun run typecheck`.
- **No new dependencies.**
- **Pure core.** `src/engine/core/**` stays pure: no pixi, react or DOM imports, no `Math.random` or `Date.now`.
- **Files not to touch:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, and `src/pages/hearts-demo/**`.
- **Json shapes.** Everything in `CompiledGame` and every `lang:*` value is `Json`. Declare these shapes with `type` aliases, and use `null` (never `undefined`) inside them.
- **No Monopoly words in shared code.**
  - Banned words: rent, house, hotel, street, station, utility, money and jail. They must not appear in engine or language code outside `src/engine/core/lang/library/rent-day.ts`, not even in comments.
  - "chance", "treasury" and "get out of jail free" must not appear in engine, language or page code at all.
  - "mortgage", "mortgaged" and "bankrupt" must not appear in engine, language or page code outside `library/rent-day.ts`, comments included.
  - All of these may appear in tests, test fixtures (`lang/testing.ts`) and `src/games/*.rules`.
  - "owe", "give up", "any player", "debt" and percentages are general words and may appear anywhere.
  - No non-test file under `src/pages/designer/` may contain "jail" or "mortgaged": the page shows flags and debts by a general rule.
- **No engine words in front of designers.** Diagnostics, rejection reasons, example results and the page never show engine vocabulary (`FlowDef`, `anyActor`, `NamedRef`, `zoneId`, `lang:`) or stack traces.
- **Existing behaviour stays.**
  - Hearts, Color Match and Venom compile with no diagnostics and pass their examples.
  - A line starting "A player may" compiles and plays exactly as before.
  - Rent Day's 56 examples keep passing, except the three Task 6 changes because going out now needs "Give up". Task 6 also changes the two playtest tests that relied on a player going out by themselves.
- **Style and commits.**
  - 2-space indent, single quotes, chainable registrars, and comments that say why.
  - Commit prefixes: `feat(lang):`, `feat(games):`, `feat(designer):`, `docs:`.
  - Stage files by path, never `git add -A`.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.

## Review Focus

- **A press of an "Any player may" button by a seat whose turn it isn't leaves the turn and every turn log as they were.** The current player's "they have rolled this turn" still holds after someone else presses, and slice 3's "only the current seat has turn entries" invariant holds. Test in Task 1.
- **"No player has less than 0 money" counts only players still in.** A player who gave up keeps their money below 0 for good. Counting them would grey every turn button for the rest of the game. Test in Task 2.
- **A debt ends as soon as the money is back at 0 or more, by any route.** That covers salary, a card, a sale and a mortgage. Nothing clears the record, so `they owe the bank`, `p0 owes p1` and the view read it only while the money is below 0. Test in Task 2.
- **Handing everything over loses nothing and mixes up no decks.**
  - A mortgaged space stays mortgaged with its new owner.
  - To a player, every kept card goes to the same zone of theirs, face up.
  - To the bank, each card goes face down under the pile its own deck starts in, even when two decks have a card of the same name.
  - Test in Task 2.
- **A mortgaged space charges nothing on every path that reads its rent.** That includes a card's "they pay its rent to its owner" (the nearest-station card), not only landing. Test in Task 4.

---

### Task 1: Buttons any player may press

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`DeclaredAction.anyone`, `Vocab['actions'][number].anyone`)
- Modify: `src/engine/core/lang/compile-phase.ts` (`ACTION_LINE`, `actionOf`, `compileAction`, `afterNamesOf`, `readAfter`)
- Modify: `src/engine/core/lang/compile.ts` (`readActions`)
- Modify: `src/engine/core/lang/refs.ts` (`DONE`)
- Modify: `src/engine/core/lang/build.ts` (`flowDefFor`)
- Modify: `src/engine/core/lang/declared-actions.ts` (`choose`, `apply`)
- Modify: `src/engine/core/lang/testing.ts` (`vocabFor`, new `ANY_PLAYER_BOARD`)
- Modify: the tests that build a `DeclaredAction` or a vocab action by hand, or compare compiled actions whole, give each `anyone: false`: `src/engine/core/lang/refs.test.ts`, `src/engine/core/lang/phrases.test.ts`, `src/engine/core/lang/library/board-phrases.test.ts`, `declared-actions.test.ts` and `compile-phase.test.ts`. (Grep `targeted:` and `label: '` in tests to find them.)
- Test: `src/engine/core/lang/declared-actions.test.ts`, `src/engine/core/lang/compile-phase.test.ts`, `src/engine/core/lang/board-view.test.ts`

**Interfaces:**
- **`types.ts`:**
  - `DeclaredAction.anyone: boolean` is true for a line that starts "Any player may": any seat still in may press it, whoever's turn it is.
  - `Vocab['actions'][number]` gains `anyone: boolean`.
- **`compile-phase.ts`:**
  - `ACTION_LINE = /^(?:a|any) player may (\w+)(?:\s+(.+))?$/i`. The groups are unchanged.
  - `actionOf(found)` also returns `anyone: boolean`, which is true when `found[0]` starts with "any player may" (any capitals). `compileAction` copies it into the `DeclaredAction`.
  - The move-line regexes still start "a player may". So "Any player may take a card from the draw pile to their hand." is a card move the phase can't read, and it gets `MALFORMED_MOVE`. Only buttons can be pressed by any player.
  - `afterNamesOf(moveVerbs, buttons: { verb: string; words: string; anyone: boolean }[])` returns `AfterNames` with a new field, `anyone: Set<string>`. It holds the move types of the anyone buttons. Their names stay in `names` and `shared`, so the line is cut at the same comma as before.
  - In `readAfter`, a word whose move is in `anyone` is reported as `` `“${word}” names a button any player may press at any time, so it can't pass the turn.` ``, and the line counts as not known.
- **`compile.ts` `readActions`** passes `anyone` through.
- **`refs.ts` `DONE`:**
  - It still recognises every button's done-wording.
  - `resolve` drops anyone buttons from the moves it found.
  - When nothing is left, it returns `` { error: `“${text}” names a button any player may press at any time, which is never part of a turn.` } ``.
- **`build.ts` `flowDefFor`:** each phase's `anyActor` is the words of its anyone actions, in written order, plus `'reorder'` when it rearranges. The key is left out when that list is empty, so existing games' flows are unchanged.
- **`declared-actions.ts`:**
  - `choose` refuses with `` `You can't ${calledBy(move, runtime)} now.` `` a `by` that is not one of `runtime.seats`. The existing `isOut` check refuses a seat that is out with "You're out of the game."
  - `apply` skips `recordAction` for an anyone action.
- **`board-view.ts`** needs no change: `allowedNow` asks the engine for each seat, and the gate lets an anyone button through.
- **`testing.ts`:**
  - `vocabFor` passes `anyone: a.anyone`.
  - New `ANY_PLAYER_BOARD`, written as below. Tasks 1 and 5 use it.

```ts
/**
 * TINY_BOARD_HEAD with two buttons any player may press: waving gets 5 money, and planting a flag on a street they own pays 10
 * while they have at least 10. Nothing puts a player out, so a player below 0 stays in. Rose Lane is space 3 and charges 14.
 * The anyone buttons are on lines 25 and 28, and the After line is line 34.
 */
export const ANY_PLAYER_BOARD = [
  TINY_BOARD_HEAD,
  '  A player may roll the dice.', '    Only if they have not rolled this turn.', '    Then:', '      Roll the dice.',
  '      Their piece moves forward by the roll.',
  '  A player may end their turn.', '    Only if they have rolled this turn.',
  '  Any player may wave.', '    Then:', '      They get 5 money.',
  '  Any player may plant a flag on a street they own.', '    Only if they have at least 10 money.', '    Then:', '      They pay 10.',
  '  When a player lands on a street someone else owns:', '    They pay its rent to its owner.',
  '  After a player ends their turn, the turn passes to the left.',
  '', 'End:', '  The game ends when one player is left.', '  That player wins.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**

In `declared-actions.test.ts`, add `describe('buttons any player may press', …)` with `const anyone = compileGame(ANY_PLAYER_BOARD, lib).game!` and the file's `engineWith`:

```ts
it('compiles with no diagnostics, and the flow lets any seat send them', () => {
  expect(compileGame(ANY_PLAYER_BOARD, lib).diagnostics).toEqual([]);
  expect(anyone.phases[0].actions.map((a) => [a.words, a.anyone]))
    .toEqual([['roll the dice', false], ['end their turn', false], ['wave', true], ['plant a flag on a street they own', true]]);
  expect(flowDefFor(anyone, ['p0', 'p1']).phases[1].anyActor).toEqual(['wave', 'plant a flag on a street they own']);
  expect(flowDefFor(game, ['p0', 'p1']).phases[1]).not.toHaveProperty('anyActor');
});
it('Review Focus: a press out of turn leaves the turn and every turn log as they were', () => {
  const engine = engineWith((s) => queueRoll(s, [1, 2]), anyone);
  expect(engine.dispatch({ type: 'roll the dice', by: 'p0' }).ok).toBe(true);
  expect(engine.dispatch({ type: 'wave', by: 'p1' }).ok).toBe(true);
  expect(engine.dispatch({ type: 'wave', by: 'p0' }).ok).toBe(true);
  const s = engine.getState();
  expect([counterOf(s, 'money', 'p0'), counterOf(s, 'money', 'p1'), s.turn!.current]).toEqual([1505, 1505, 'p0']);
  expect(s.data[TURN_KEY]).toEqual({ p0: ['roll the dice'] });
  expect(engine.canDispatch({ type: 'end their turn', by: 'p0' })).toBe(true);
});
```

Also add these to the same describe:
- **Who may press.**
  - Use three players, since two with one out would end the game at once: `createEngine(anyone, lib, 3, markOut(withBoardData(initialState(anyone, 1), anyone, seatsFor(3)), 'p1')).engine`. Its `canDispatch({ type: 'wave', by: 'p1' })` is `You're out of the game.`
  - On a two-player engine, `canDispatch({ type: 'wave', by: 'p7' })` is `You can't wave now.`
- **Its Only if lines and its pick still decide.** With `setOwner(s, 1, 'p1')`:
  - p1 planting on 1 is accepted, and p1 then has 1490;
  - p1 planting on 3 is refused with `That isn't a street you own.`;
  - with p1 set to 5 money, planting on 1 is refused with `they have at least 10 money`.
- **As an example.** Add this example to the end of `ANY_PLAYER_BOARD`. `runExamples` gives one result, and it passes.

```text
Example: anyone may press it on someone else's turn
  Given p1 owns Mill Lane
  When p1 waves
  And p1 plants a flag on Mill Lane
  Then it is accepted
  And p1 has 1495 money
  And it is p0's turn
```

In `compile-phase.test.ts`, add `describe('buttons any player may press', …)`. Each check is a `toContainEqual` on `diagnostics.map((d) => [d.line, d.message])`:
- **An After line can't name one.** `ANY_PLAYER_BOARD.replace('After a player ends their turn,', 'After a player ends their turn or waves,')` reports `[34, '“waves” names a button any player may press at any time, so it can't pass the turn.']`.
- **A done-wording can't name one.** Replace `'  A player may end their turn.\n    Only if they have rolled this turn.'` with `'  A player may end their turn.\n    Only if they have waved this turn.'`. It reports `[24, '“waved” names a button any player may press at any time, which is never part of a turn.']`.
- **A card move stays "A player may".** Insert `'  Any player may take a card from the draw pile to their hand.'` after line 24. It reports `[25, MALFORMED_MOVE]` with the message as the file has it.

In `board-view.test.ts`, add this to `describe('seat views of a board game')`:
- **Out-of-turn buttons in the view.** On a fresh `ANY_PLAYER_BOARD` engine, p1's `seatExtras(…).actions.map((a) => [a.move, a.allowed])` is:

```ts
[['roll the dice', "It's p0's turn."], ['end their turn', "It's p0's turn."], ['wave', true], ['plant a flag on a street they own', 'There is no street you own.']]
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/board-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the three files, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/compile-phase.ts src/engine/core/lang/compile.ts src/engine/core/lang/refs.ts \
  src/engine/core/lang/build.ts src/engine/core/lang/declared-actions.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/board-view.test.ts \
  src/engine/core/lang/refs.test.ts src/engine/core/lang/phrases.test.ts src/engine/core/lang/library/board-phrases.test.ts
# If the full run or typecheck needed `anyone: false` in another test file, stage it by path too.
git commit -m "feat(lang): buttons any player may press at any time, which never pass the turn"
```

---

### Task 2: Debts, and handing everything to the player owed

**Files:**
- Modify: `src/engine/core/lang/board-state.ts` (`OWES_KEY`, `Creditor`, `recordDebt`, `owedTo`)
- Modify: `src/engine/core/lang/library/board-phrases.ts` (`transfer`, `swapsWithEachOther`)
- Create: `src/engine/core/lang/library/debt-phrases.ts` (`registerDebtPhrases`)
- Modify: `src/engine/core/lang/library/index.ts` (add it to `REGISTRARS` right after `registerDrawPhrases`)
- Test: `src/engine/core/lang/board-state.test.ts`, `src/engine/core/lang/library/board-phrases.test.ts`, create `src/engine/core/lang/library/debt-phrases.test.ts`

**Interfaces:**
- **`board-state.ts`:**
  - `OWES_KEY = 'lang:owes'`, holding `{ [seat]: Creditor }`. It is written only when a payment leaves its payer below 0, so a game where nobody goes below 0 never gets it.
  - `export type Creditor = PlayerId | 'bank'`.
  - `recordDebt(state: GameState, seat: PlayerId, to: Creditor): GameState` replaces the seat's record.
  - `owedTo(state: GameState, seat: PlayerId, counter: string): Creditor | null`:
    - It gives the seat's record while `counterOf(state, counter, seat) < 0`.
    - It gives null when the counter is at 0 or more, or when nothing was recorded.
    - A recorded player who is out reads as `'bank'`: there is no one left to hand things to.
- **`board-phrases.ts`:**
  - `transfer` is unchanged in signature. When `amount > 0` and the payer ends below 0, it also does `recordDebt(…, from, to ?? 'bank')`. A payment of 0, such as a mortgaged space's rent, records nothing.
  - `swapsWithEachOther` pays each pair through `transfer({ ...env, state }, payer, payee, n)` when `counter` is the board's pay-with counter, in the same seat order. So the last payment that leaves a payer below 0 names their creditor. Any other counter is moved with `addToCounter` as today, and records nothing.
- **`debt-phrases.ts`** (keep the banned words out, comments included):
  - Condition `'they have less than {int} {counter}'` (needsPlayer).
  - Condition `'no player has less than {int} {counter}'` holds when every seat in `playersIn` has at least n. Players who are out are skipped.
  - Condition `'they owe the bank'` (needsPlayer, needsPayment) is `owedTo(…, payWith) === 'bank'`.
  - Effect `'everything they own goes to the player they owe'` (needsPlayer, needsBoard, needsPayment):
    - With `to = owedTo(state, they, payWith)` null, it throws RuleError `They owe no one: no payment took them below 0.`
    - Every space they own gets `to` as its owner, or no owner for `'bank'`. Its facts are left as they are: the rules clear what they mean to clear first.
    - Every card in their per-player zones whose visibility is `public` moves, zone by zone in Table order and slot by slot.
      - To a player, it is `relocate`d to `zoneIdFor(zone.name, to)`.
      - To the bank, it goes `toBottom` of `zoneIdFor(deckOf(env.game.cards, id)!.start)`.
    - Their counters are left as they are: giving up hands over things, not money.
  - Expect `'{player} owes {player}'` and expect `'{player} owes the bank'`. Each fails with `` `Expected ${who} to owe ${them}, but they owe ${p2 | the bank | no one}.` ``, where `them` is the named seat or `the bank`.

- [ ] **Step 1: Write the failing tests.**

In `board-state.test.ts`:

```ts
describe('debts', () => {
  it('reads whom a seat owes only while its counter is below 0, and a creditor who is out as the bank', () => {
    let s = fixtureBoardState(fixtureBoardGame(), ['p0', 'p1', 'p2']);
    expect(owedTo(s, 'p0', 'money')).toBeNull();
    s = recordDebt(setCounter(s, 'money', 'p0', -5), 'p0', 'p1');
    expect(owedTo(s, 'p0', 'money')).toBe('p1');
    expect(owedTo(setCounter(s, 'money', 'p0', 0), 'p0', 'money')).toBeNull();
    expect(owedTo(markOut(s, 'p1'), 'p0', 'money')).toBe('bank');
    expect(owedTo(recordDebt(s, 'p0', 'bank'), 'p0', 'money')).toBe('bank');
    expect(JSON.parse(JSON.stringify(s.data[OWES_KEY]))).toEqual({ p0: 'p1' });
  });
});
```

In `board-phrases.test.ts`, add `describe('debts recorded by payments')`. Use `seats = ['p0', 'p1', 'p2']`, `start = fixtureBoardState(game, seats)`, and a `pay(text, state, space = null)` that runs an effect about p0:
- **Rent and the bank.**
  - `they pay its rent to its owner` from Rose Lane (5), owned by p1, with p0 at 10, leaves p0 at -4 and `owedTo(…, 'p0', 'money')` at `'p1'`.
  - `they pay 20` with p0 at 10 gives `'bank'`.
- **No record at 0.** `they pay 10` with p0 at 10 leaves `s.data[OWES_KEY]` undefined.
- **The latest payment names the creditor.**
  - From `recordDebt(setCounter(start, 'money', 'p0', -4), 'p0', 'p1')`, `they pay 1` gives `'bank'`.
  - From p0 at 40, `they pay 50 money to each other player` gives `'p2'`: paying p1 leaves p0 at -10, and paying p2 leaves them at -60.
- **Collecting.** `they get 50 money from each other player`, with p1 at 30 and p2 at 20, gives `['p0', 'p0']` for p1 and p2.
- **Another counter.** In the `tokens` game of `an amount with the counter named`, `they pay 50 tokens to each other player` leaves `s.data[OWES_KEY]` undefined.

Create `library/debt-phrases.test.ts`, with these helpers:

```ts
const lib = createDefaultLibrary();
const HEAD = '| name | says |';
const PASS = '| Free Pass | They keep this card in their kept cards. |';
const game = compileGame(deckGameText([HEAD, PASS, '| Dividend | They get 50 money. |'], [HEAD, PASS, '| Calm | They get 0 money. |']), lib).game!;
const SEATS = ['p0', 'p1', 'p2'];
const start: GameState = { ...withBoardData(initialState(game, 1), game, SEATS), turn: { current: 'p0', phase: 'playing' } };
/** The Free Pass of the deck that starts in `pile`. */
const passOf = (pile: string) => start.cards.find((c) => c.data?.name === 'Free Pass' && zoneIdFor(deckOf(game.cards, c.id)!.start) === pile)!.id;
/** p0 is 4 below 0 owing `to`, owns Mill Lane (1) and a mortgaged Rose Lane (4), and keeps both Free Passes, the lucky one first. */
function owing(to: Creditor): GameState {
  const kept = relocate(start, [passOf('lucky-pile'), passOf('fate-pile')], 'kept-cards-p0', game);
  const owned = setSpaceFact(setOwner(setOwner(kept, 1, 'p0'), 4, 'p0'), 4, 'mortgaged', true);
  return recordDebt(setCounter(owned, 'money', 'p0', -4), 'p0', to);
}
const about = (state: GameState) => fixtureEnv(state, { game, seats: SEATS, subject: { player: 'p0', space: null, card: null } });
const condition = (text: string, state: GameState) => runPhrase<boolean>(lib, 'condition', text, about(state));
const handOver = (state: GameState) => runPhrase<GameState>(lib, 'effect', 'everything they own goes to the player they owe', about(state));
const expectThat = (text: string, state: GameState) => runPhrase<true | string>(lib, 'expect', text, fixtureEnv(state, { game, seats: SEATS }));
```

```ts
it('Review Focus: no player has less than an amount, counting only players still in', () => {
  const broke = setCounter(start, 'money', 'p1', -50);
  expect(condition('no player has less than 0 money', start)).toBe(true);
  expect(condition('no player has less than 0 money', broke)).toBe(false);
  expect(condition('no player has less than 0 money', markOut(broke, 'p1'))).toBe(true);
});
it('Review Focus: they owe only while they are below 0, however the money came back', () => {
  expect(condition('they owe the bank', owing('bank'))).toBe(true);
  expect(condition('they owe the bank', owing('p1'))).toBe(false);
  const repaid = addToCounter(owing('bank'), 'money', 'p0', 4);
  expect(condition('they owe the bank', repaid)).toBe(false);
  expect(expectThat('p0 owes the bank', repaid)).toBe('Expected p0 to owe the bank, but they owe no one.');
});
it('Review Focus: hands every space, its facts and all, and every card they keep in view to the player they owe', () => {
  const s = handOver(owing('p1'));
  expect([ownerOf(s, 1), ownerOf(s, 4), spaceFact(s, 4, 'mortgaged')]).toEqual(['p1', 'p1', true]);
  expect(zoneCards(s, 'kept-cards-p0')).toEqual([]);
  expect(zoneCards(s, 'kept-cards-p1').map((c) => [c.id, c.faceUp])).toEqual([[passOf('lucky-pile'), true], [passOf('fate-pile'), true]]);
  expect([counterOf(s, 'money', 'p0'), counterOf(s, 'money', 'p1')]).toEqual([-4, 1500]);
});
it('Review Focus: gives everything to the bank: spaces unowned, and each card under the pile its own deck starts in', () => {
  const s = handOver(owing('bank'));
  expect([ownerOf(s, 1), ownerOf(s, 4)]).toEqual([null, null]);
  expect(spaceFact(s, 4, 'mortgaged')).toBe(true);
  expect([zoneCards(s, 'lucky-pile')[0].id, zoneCards(s, 'fate-pile')[0].id]).toEqual([passOf('lucky-pile'), passOf('fate-pile')]);
  expect(s.cards.filter((c) => c.data?.name === 'Free Pass').every((c) => !c.faceUp)).toBe(true);
});
```

Also add these:
- **Less than.** `they have less than 0 money` is true at -1 and false at 0.
- **Owing no one.** `handOver(setCounter(owing('p1'), 'money', 'p0', 5))` throws `They owe no one: no payment took them below 0.`
- **The Then lines.** On `owing('p1')`:
  - `p0 owes p1` is true;
  - `p0 owes p2` gives `Expected p0 to owe p2, but they owe p1.`;
  - `p0 owes the bank` gives `Expected p0 to owe the bank, but they owe p1.`
  - On `start`, `p0 owes p1` gives `Expected p0 to owe p1, but they owe no one.`
- **Needs.** `lib.get('effect', 'everything they own goes to the player they owe')` matches `{ needsPlayer: true, needsBoard: true, needsPayment: true }`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/board-state.test.ts src/engine/core/lang/library/board-phrases.test.ts src/engine/core/lang/library/debt-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. In `debt-phrases.ts` say "counter", "space" and "kept cards", never the banned words.
- [ ] **Step 4: Run** the three files, then `bun run test` and `bun run typecheck`. Rent Day still passes: its own rule puts a player below 0 out, and the debt record changes nothing it reads.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/board-state.ts src/engine/core/lang/library/board-phrases.ts src/engine/core/lang/library/debt-phrases.ts \
  src/engine/core/lang/library/index.ts src/engine/core/lang/board-state.test.ts src/engine/core/lang/library/board-phrases.test.ts \
  src/engine/core/lang/library/debt-phrases.test.ts
git commit -m "feat(lang): debts: whom a payment below 0 is owed to, and handing everything a player owns to them"
```

---

### Task 3: Percentages, and space flags that rules set and clear

**Files:**
- Modify: `src/engine/core/lang/library/board-phrases.ts` (percent effects and condition)
- Modify: `src/engine/core/lang/library/fact-phrases.ts` (declaration, flag effects, conditions, Given and Then)
- Test: `src/engine/core/lang/library/board-phrases.test.ts`, `src/engine/core/lang/library/fact-phrases.test.ts`

**Interfaces:**
- Consumes `transfer`'s debt record (Task 2).
- **`board-phrases.ts`:**
  - `percentOf(env: PhraseEnv, n: number, attr: string): number` (file-private) is `Math.floor((n * amountOf(env, attr)) / 100)`, which rounds down to a whole number.
  - Effect `'they get {int}% of its {spaceattr}'` (needsPlayer, needsSpace, needsPayment) adds that much to the pay-with counter.
  - Effect `'they pay {int}% of its {spaceattr}'` (needsPlayer, needsSpace, needsPayment) is `transfer(env, they, null, …)`.
  - Condition `'they have at least {int}% of its {spaceattr} in {counter}'` (needsPlayer, needsSpace).
- **`fact-phrases.ts`:**
  - Declare `'spaces can be {name}'` gives `[{ name, on: 'space', kind: 'flag' }]`, like `cards can be {name}`.
  - Conditions `'it is {spaceflag}'` and `'it is not {spaceflag}'` (needsSpace). A flag nobody set is not set.
  - Effects `'it is {spaceflag}'` and `'it is not {spaceflag}'` (needsSpace) do `setSpaceFact(state, itOf(env), fact, true / false)`.
  - Effect `'their spaces are no longer {spaceflag}'` (needsPlayer, needsBoard) sets the flag false on every space they own.
  - Given `'{space} is {spaceflag}'` and `'{space} is not {spaceflag}'` set it true or false.
  - Expect `'{space} is {spaceflag}'` fails with `` `Expected ${name} to be ${fact}, but it isn't.` ``, and `'{space} is not {spaceflag}'` fails with `` `Expected ${name} not to be ${fact}, but it is.` ``

- [ ] **Step 1: Write the failing tests.**

In `board-phrases.test.ts`, add `describe('a percentage of a detail of the space')`, with `run(kind, text, state, space)` about p0:

```ts
it('gets and pays a percentage, rounded down to a whole number', () => {
  // Power Works (6) costs 150: half is 75, and 55% is 82.5, so 82. Mill Lane (1) costs 60: 33% is 19.8, so 19.
  expect(counterOf(run('effect', 'they get 50% of its price', fixtureBoardState(), 6), 'money', 'p0')).toBe(1575);
  expect(counterOf(run('effect', 'they pay 55% of its price', fixtureBoardState(), 6), 'money', 'p0')).toBe(1418);
  expect(counterOf(run('effect', 'they get 33% of its price', fixtureBoardState(), 1), 'money', 'p0')).toBe(1519);
});
it('judges whether they have at least the percentage', () => {
  const at = (n: number) => setCounter(fixtureBoardState(), 'money', 'p0', n);
  expect(run('condition', 'they have at least 55% of its price in money', at(82), 6)).toBe(true);
  expect(run('condition', 'they have at least 55% of its price in money', at(81), 6)).toBe(false);
});
```

Also add these:
- **Paying below 0.** `they pay 55% of its price` on Power Works with p0 at 10 gives `owedTo(…)` of `'bank'`.
- **No such detail.** `they get 50% of its price` on Go (0) throws `Go has no price.`

In `fact-phrases.test.ts`, add `describe('a yes-or-no that rules set and clear on a space')`. Its game is `const FLAGGED = fixtureBoardGame({ facts: [...FACTS, { name: 'mortgaged', on: 'space', kind: 'flag' }], board: game.board! })`.

```ts
it('sets and clears the flag on the space the rule is about, and judges it', () => {
  const on = effect('it is mortgaged', fresh(FLAGGED), ROSE, FLAGGED);
  expect(spaceFact(on, ROSE, 'mortgaged')).toBe(true);
  expect([condition('it is mortgaged', on, ROSE, FLAGGED), condition('it is not mortgaged', on, ROSE, FLAGGED)]).toEqual([true, false]);
  expect(condition('it is not mortgaged', fresh(FLAGGED), ROSE, FLAGGED)).toBe(true);
  expect(spaceFact(effect('it is not mortgaged', on, ROSE, FLAGGED), ROSE, 'mortgaged')).toBe(false);
});
it('clears it on every space they own, and only theirs', () => {
  const flagged = [ROSE, 1, LILY].reduce((s, at) => setSpaceFact(s, at, 'mortgaged', true), setOwner(setOwner(setOwner(fresh(FLAGGED), ROSE, 'p0'), 1, 'p0'), LILY, 'p1'));
  const s = effect('their spaces are no longer mortgaged', flagged, null, FLAGGED);
  expect([ROSE, 1, LILY].map((at) => spaceFact(s, at, 'mortgaged'))).toEqual([false, false, true]);
});
```

Also add these:
- **The declaration.** `compileGame(TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  Spaces can be mortgaged.'), lib)`:
  - has no errors (`TINY_BOARD_HEAD` alone carries the "Without an End: section" warning);
  - its `game!.facts` equals `[{ name: 'mortgaged', on: 'space', kind: 'flag' }]`.
- **Given and Then.** Run these through `runPhrase(lib, 'given' | 'expect', …, bare(state, FLAGGED))`:
  - Given `Rose Lane is mortgaged`, then `Rose Lane is not mortgaged`, leaves `spaceFact(…, ROSE, 'mortgaged')` at true, then false.
  - Expect `Rose Lane is mortgaged` on a fresh state gives `Expected Rose Lane to be mortgaged, but it isn't.`
  - Expect `Rose Lane is not mortgaged` on a flagged state gives `Expected Rose Lane not to be mortgaged, but it is.`
  - Each passes (`true`) the other way round.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/board-phrases.test.ts src/engine/core/lang/library/fact-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the two files, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/board-phrases.ts src/engine/core/lang/library/fact-phrases.ts \
  src/engine/core/lang/library/board-phrases.test.ts src/engine/core/lang/library/fact-phrases.test.ts
git commit -m "feat(lang): percentages of a space's details, and yes-or-no space facts that rules set and clear"
```

---

### Task 4: Bank and building phrases, and the bottom card of a pile

**Files:**
- Modify: `src/engine/core/lang/board.ts` (new `bankItemOf`)
- Modify: `src/engine/core/lang/library/fact-phrases.ts` (bank and building phrases, the color phrase about a flag)
- Modify: `src/engine/core/lang/library/rent-day.ts` (two conditions, one column line)
- Modify: `src/engine/core/lang/library/example-phrases.ts` (bottom card)
- Test: `src/engine/core/lang/library/fact-phrases.test.ts`, `src/engine/core/lang/library/rent-day.test.ts`, `src/engine/core/lang/library/example-phrases.test.ts`

**Interfaces:**
- Consumes `spaces can be {name}` and the flag phrases (Task 3).
- **`board.ts`:** `bankItemOf(fact: FactItem, bank: BankSpec[]): string | null` names the bank item that goes with a fact on spaces:
  - for a count, the item of the same name;
  - for a flag, the item whose `singularForms` include the flag's name, so `hotel` goes with `hotels`;
  - null for none, so `mortgaged` has none.
- **`fact-phrases.ts`:**
  - Condition `'the bank has at least {int} {banked}'`.
  - Conditions `'it has a {spacenumber}'` and `'it has an {spacenumber}'` (needsSpace) mean at least one. `{spacenumber}` already takes the singular, so this reads "it has a house".
  - Effect `'it gets {int} {banked} from the bank'` (needsSpace), with `fact = factForBank(env, banked)`:
    - `n < 1` throws RuleError `Say how many, 1 or more.`;
    - a flag with `n > 1` throws `` `${space} can have only one ${fact.name}.` ``, and `n === 1` does what `it gets a {banked} from the bank` does;
    - a bank with fewer than n left throws `` `The bank has only ${counted(left, banked)} left.` `` and changes nothing;
    - otherwise it moves n from the bank to the space's count.
  - Effect `'one of its {spacenumber} goes back to the bank'` (needsSpace):
    - a space holding none throws `` `${space} has no ${fact}.` ``;
    - a count no bank item goes with throws `` `No bank item goes with the fact ${fact}.` ``, as `countGoesBack` does;
    - otherwise the space has one fewer and the bank one more.
  - Effect `'its {spaceflag} goes back to the bank'` (needsSpace):
    - the item is `bankItemOf({ name, kind: 'flag' }, board.bank)`; none throws `` `No bank item goes with the fact ${name}.` ``;
    - a space without the flag throws `` `${space} has no ${name}.` ``;
    - otherwise it is `giveBack(state, space, fact, item)`.
  - Condition `'no {spacekind} of its {spaceattr} is {spaceflag}'` (needsSpace) holds when no space of `setOf(spaces, it, kind, attr)` has the flag set. A space with no value in that column is in no set, so it holds there.
- **`rent-day.ts`:**
  - Condition `'no {spacekind} of its {spaceattr} has more buildings'` (needsSpace) holds when every space of the set has at most `buildingsOn(it)`. A hotel counts as 5, as in "fewer buildings".
  - Condition `'no {spacekind} of its {spaceattr} has a building'` (needsSpace) holds when every space of the set has `buildingsOn` 0. It holds for a space with no color.
  - Column `"a mortgaged space's rent is 0"` returns 0 when `spaceFact(state, it, 'mortgaged') === true`, and otherwise the value it was given.
- **`example-phrases.ts`:** expect `'the bottom card of {zone} is {card}'` reads `zoneCards(…)[0]`. It mirrors `topCardIs`, with `bottom` in place of `top` in its message.

- [ ] **Step 1: Write the failing tests.**

In `fact-phrases.test.ts`, using the file's `game` (houses, hotel, a bank of 32 and 12) and `FLAGGED` from Task 3:
- **At least.** `the bank has at least 4 houses` is true with `setBank(…, 'houses', 4)` and false with 3.
- **A house.** `it has a house` on Rose Lane is true with 1 house, false with none, and false with only a hotel.
- **Taking several.**
  - `it gets 4 houses from the bank` takes Rose Lane from none to 4, and the bank to 28.
  - With the bank at 3, it throws `The bank has only 3 houses left.`
  - `it gets 0 houses from the bank` throws `Say how many, 1 or more.`
  - `it gets 2 hotels from the bank` throws `Rose Lane can have only one hotel.`
  - `it gets 1 hotel from the bank` sets the hotel and leaves 11 hotels.
- **One back.**
  - `one of its houses goes back to the bank` takes Rose Lane from 3 to 2 houses, and the bank from 32 to 33.
  - On a bare Rose Lane it throws `Rose Lane has no houses.`
- **A flag back.**
  - `its hotel goes back to the bank` clears Rose Lane's hotel, and the bank goes from 12 to 13 hotels.
  - Without a hotel it throws `Rose Lane has no hotel.`
  - On `FLAGGED`, `its mortgaged goes back to the bank` throws `No bank item goes with the fact mortgaged.`
- **The color phrase, on `FLAGGED`.**
  - With Lily Lane flagged, `no street of its color is mortgaged` is false about Rose Lane.
  - It is true about Rose Lane with Mill Lane (brown) flagged instead.
  - It is true about North Station (3), which has no color.
- **The pairing.** `bankItemOf` gives `'hotels'` for `{ name: 'hotel', kind: 'flag' }`, `'houses'` for `{ name: 'houses', kind: 'number' }`, and null for `{ name: 'mortgaged', kind: 'flag' }`, against the file's bank.

In `library/rent-day.test.ts`:
- **The fixture.** `text()` gains `'  Spaces can be mortgaged.'` after its bank line, and `"  A mortgaged space's rent is 0."` after the utility line.
- **The section.** The first test expects five `'column'` refs.
- Add these:

```ts
describe("a mortgaged space's rent", () => {
  const mortgaged = (state: GameState, ...spaces: number[]) => spaces.reduce((s, at) => setSpaceFact(s, at, 'mortgaged', true), state);
  const full = owning([ROSE, 'p0'], [LILY, 'p0'], [IRIS, 'p0'], [NORTH, 'p0'], [POWER, 'p0']);
  it('is 0 whatever the lines before it made of it, and other spaces keep theirs', () => {
    const s = setRoll(mortgaged(full, ROSE, NORTH, POWER), [3, 4]);
    expect([ROSE, NORTH, POWER, LILY].map((at) => rentOf(s, at))).toEqual([0, 0, 0, 28]);
  });
  it('Review Focus: charges nothing when a rule other than landing makes them pay its rent', () => {
    const s = runPhrase<GameState>(lib, 'effect', 'they pay its rent to its owner', about(mortgaged(full, NORTH), NORTH, 'p1'));
    expect([counterOf(s, 'money', 'p0'), counterOf(s, 'money', 'p1')]).toEqual([1500, 1500]);
  });
});
describe('selling evenly, and a color with a building', () => {
  const cond = (text: string, state: GameState, space: number) => runPhrase<boolean>(lib, 'condition', text, about(state, space));
  it('no street of its color has more buildings, a hotel counting as five', () => {
    const s = withHouses(withHouses(withHouses(fresh(), ROSE, 2), LILY, 1), IRIS, 2);
    expect([ROSE, LILY, IRIS].map((at) => cond('no street of its color has more buildings', s, at))).toEqual([true, false, true]);
    const hotel = withHouses(withHouses(withHotel(fresh(), ROSE), LILY, 4), IRIS, 4);
    expect([ROSE, LILY].map((at) => cond('no street of its color has more buildings', hotel, at))).toEqual([true, false]);
  });
  it('no street of its color has a building, which holds for a space with no color', () => {
    expect(cond('no street of its color has a building', withHouses(fresh(), LILY, 1), ROSE)).toBe(false);
    expect(cond('no street of its color has a building', withHotel(fresh(), IRIS), ROSE)).toBe(false);
    expect(cond('no street of its color has a building', withHouses(fresh(), MILL, 1), ROSE)).toBe(true);
    expect(cond('no street of its color has a building', withHouses(fresh(), LILY, 1), NORTH)).toBe(true);
  });
});
```

In `example-phrases.test.ts`, next to `the top card of a zone`:
- With `at([std('c1', 'trick', 'C', 2, { slot: 0 }), std('c2', 'trick', 'S', 12, { slot: 1 })])`:
  - `the bottom card of the trick is the 2 of clubs` is true;
  - `the bottom card of the trick is the queen of spades` gives `Expected the bottom card of the trick to be the queen of spades, but it is the 2 of clubs.`;
  - `the bottom card of the deck is the 2 of clubs` gives `Expected the bottom card of the deck to be the 2 of clubs, but the deck is empty.`

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/fact-phrases.test.ts src/engine/core/lang/library/rent-day.test.ts src/engine/core/lang/library/example-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. "mortgaged", "buildings" and the column line belong only in `rent-day.ts`. `fact-phrases.ts` and `board.ts` say "flag", "count" and "bank item".
- [ ] **Step 4: Run** the three files, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/board.ts src/engine/core/lang/library/fact-phrases.ts src/engine/core/lang/library/rent-day.ts \
  src/engine/core/lang/library/example-phrases.ts src/engine/core/lang/library/fact-phrases.test.ts \
  src/engine/core/lang/library/rent-day.test.ts src/engine/core/lang/library/example-phrases.test.ts
git commit -m "feat(lang): taking and giving back several of a bank item, color phrases for flags and buildings, a mortgaged space's rent, and the bottom card of a pile"
```

---

### Task 5: Seat views show debts, and the flags to stripe

**Files:**
- Modify: `src/engine/core/lang/board-view.ts`
- Modify: `src/pages/designer/board-parts.test.tsx` (its `board()` fixture gains `owes: {}` and its `space()` helper `stripes: []`, which typecheck needs), and any other hand-built `BoardView` or `SpaceView` in tests (`board-view.test.ts` has several)
- Test: `src/engine/core/lang/board-view.test.ts`

**Interfaces:**
- Consumes `owedTo`/`Creditor` (Task 2) and `bankItemOf` (Task 4).
- **`SpaceView.stripes: string[]`** lists the flags set on the space that no bank item goes with (`bankItemOf(fact, board.bank) === null`), in the order the game declares them. They stay in `facts` too, so the space's title still names them.
- **`BoardView.owes: { [seat: string]: Creditor }`** has an entry for each seat still in whose `owedTo(state, seat, board.payWith)` is not null. It is `{}` for a board with no pay-with counter. Every seat sees the same: whom a player owes is public.
- **`readSeatExtras`** requires `owes` to be a map of text, and each space's `stripes` to be a list of text.

- [ ] **Step 1: Write the failing tests** in `board-view.test.ts`, in a new `describe('seat views of debts and of flags no bank item goes with')`.
- **Fixtures.**
  - `TEXT = ANY_PLAYER_BOARD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  Spaces can have a hotel.\n  Spaces can be mortgaged.\n  The bank has 12 hotels.')`.
  - It compiles with no diagnostics.
  - A two-player engine starts from p0's turn with p1 owning Rose Lane (3).
- **Debts.**
  - Before anything, both seats' `board!.owes` is `{}`.
  - With p0 at 10 money and `[1, 2]` queued, p0 rolls onto Rose Lane. Both seats' `owes` is then `{ p0: 'p1' }`.
  - After p0 waves (+5, back to 1), both are `{}` again.
- **Flags.**
  - On a state with Rose Lane's `hotel` and `mortgaged` both set, `spaces[3].facts` is `{ hotel: true, mortgaged: true }` and `spaces[3].stripes` is `['mortgaged']`.
  - Mill Lane's `stripes` is `[]`.
- **Plain data.**
  - `readSeatExtras(JSON.parse(JSON.stringify(extras)))` equals `extras` while p0 owes.
  - It gives null for `owes: { p0: 3 }`, for a missing `owes`, for a space with `stripes: [1]`, and for a space without `stripes`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/board-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test and `bunx vitest run src/pages/designer`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/board-view.ts src/engine/core/lang/board-view.test.ts src/pages/designer/board-parts.test.tsx
git commit -m "feat(lang): seat views show whom each player owes, and which space flags no bank item goes with"
```

---

### Task 6: Rent Day, slice 5

**Files:**
- Modify: `src/games/rent-day.rules`
- Modify: `src/games/rent-day.test.ts`
- Modify: `src/pages/designer/playtest.test.tsx` (the two tests whose player went out by themselves, and the card-table test whose card move starts with "take") and `src/pages/designer/designer-page.test.tsx` (the example count)

**Interfaces:**
- Consumes every phrase above, `owedTo`/`OWES_KEY` (Task 2) and `targetCandidates` (`declared-actions.ts`).
- **New move types and labels:**
  - `'take a mortgage on a space they own'`, labelled `Take a mortgage`;
  - `'pay off a mortgage on a space they own'`, labelled `Pay off a mortgage`;
  - `'sell a house on a street they own'`, labelled `Sell a house`;
  - `'give up'`, labelled `Give up`.
- **Board numbers:**
  - Go 0, Mill Lane 1 (price 60, house 50), Ferry Row 3, Income Tax 4 (200), Ash Street 6 (100);
  - Cedar Avenue 9, Rose Lane 16 (price 180, house 100, rent 14), Lily Lane 18, Iris Road 19;
  - Harbour Heights 37, The Promenade 39 (rent 50).
  - Chance cards are `c0`–`c15`, so a Given that hands p0 a Get Out Of Jail Free hands them the chance one.

- [ ] **Step 1: Board and Rent.**
  - Under `Board:`, add `  Spaces can be mortgaged.` right after `  Spaces can have houses and a hotel.`
  - Under `Rent:`, add `  A mortgaged space's rent is 0.` as the last line. The lands-on rule stays as it is (ruling 1).
- [ ] **Step 2: The turn buttons wait for debts.**
  - Add `    Only if no player has less than 0 money.` as the first line under each of the seven `A player may …` lines: roll the dice, pay to leave jail, roll for a double, use a Get Out Of Jail Free, buy, build and end their turn.
  - In the build button, add `    Only if no street of its color is mortgaged.` right after `    Only if no street of its color has fewer buildings.`
- [ ] **Step 3: Add the four buttons** right after the end-their-turn block (after `      they have rolled for a double this turn`). Then **delete** the `When a player has less than 0 money:` rule and its four lines.

```text
  Any player may take a mortgage on a space they own.
    Only if it is not mortgaged.
    Only if no street of its color has a building.
    Then:
      They get 50% of its price.
      It is mortgaged.
  Any player may pay off a mortgage on a space they own.
    Only if it is mortgaged.
    Only if they have at least 55% of its price in money.
    Then:
      They pay 55% of its price.
      It is not mortgaged.
  Any player may sell a house on a street they own.
    Only if one of:
      it has a house
      it has a hotel
    Only if no street of its color has more buildings.
    Only if one of:
      it has no hotel
      the bank has at least 4 houses
    Then:
      They get 50% of its house price.
      If it has no hotel, one of its houses goes back to the bank.
      If it has a hotel, it gets 4 houses from the bank.
      If it has a hotel, its hotel goes back to the bank.
  Any player may give up.
    Only if they have less than 0 money.
    Then:
      Their houses go back to the bank.
      Their hotels go back to the bank.
      If they owe the bank, their spaces are no longer mortgaged.
      Everything they own goes to the player they owe.
      They are out.
```

- [ ] **Step 4: Change the three earlier examples** that went out by themselves. In each, add `  And p0 gives up` right after `  When p0 rolls the dice`. Also:
  - `Example: going below 0 puts you out` is renamed `Example: giving up puts you out`, since going below 0 no longer does it. Its `  And no one owns Rose Lane` becomes `  And p1 owns Rose Lane`.
  - `Example: the last player left wins` changes nothing else.
  - In `Example: going out returns your buildings to the bank`, `  And no one owns Rose Lane` becomes `  And p1 owns Rose Lane`.
- [ ] **Step 5: Append these 12 examples** after the existing 56, for 68 in all.

```text
Example: mortgaging gives half the price
  Given p0 owns Rose Lane
  When p0 takes a mortgage on Rose Lane
  Then it is accepted
  And p0 has 1590 money
  And Rose Lane is mortgaged

Example: a mortgaged space charges no rent
  Given p1 owns Rose Lane
  And Rose Lane is mortgaged
  And p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0 is on Rose Lane
  And p0 has 1500 money
  And p1 has 1500 money

Example: paying off a mortgage costs 55% of the price
  Given p0 owns Rose Lane
  And Rose Lane is mortgaged
  When p0 pays off a mortgage on Rose Lane
  Then it is accepted
  And p0 has 1401 money
  And Rose Lane is not mortgaged

Example: you cannot mortgage a street while its color has buildings
  Given p0 owns Rose Lane
  And p0 owns Lily Lane
  And p0 owns Iris Road
  And Lily Lane has 1 house
  When p0 takes a mortgage on Rose Lane
  Then it is rejected because "no street of its color has a building"

Example: you cannot build on a color with a mortgaged street
  Given p1 owns Rose Lane
  And p1 owns Lily Lane
  And p1 owns Iris Road
  And Iris Road is mortgaged
  And it is p1's turn
  When p1 builds a house on Rose Lane
  Then it is rejected because "no street of its color is mortgaged"

Example: selling a house gives half the house price, evenly
  Given p0 owns Rose Lane
  And p0 owns Lily Lane
  And p0 owns Iris Road
  And Rose Lane has 2 houses
  And Lily Lane has 1 house
  And Iris Road has 1 house
  And the bank has 28 houses
  When p0 sells a house on Lily Lane
  Then it is rejected because "no street of its color has more buildings"
  When p0 sells a house on Rose Lane
  Then it is accepted
  And p0 has 1550 money
  And Rose Lane has 1 house
  And the bank has 29 houses

Example: selling a hotel puts four houses back on the street
  Given p0 owns Rose Lane
  And p0 owns Lily Lane
  And p0 owns Iris Road
  And Rose Lane has a hotel
  And Lily Lane has 4 houses
  And Iris Road has 4 houses
  And the bank has 24 houses
  And the bank has 11 hotels
  When p0 sells a house on Rose Lane
  Then it is accepted
  And Rose Lane has no hotel
  And Rose Lane has 4 houses
  And the bank has 20 houses
  And the bank has 12 hotels
  And p0 has 1550 money

Example: a hotel can't be sold while the bank has fewer than 4 houses
  Given p0 owns Rose Lane
  And p0 owns Lily Lane
  And p0 owns Iris Road
  And Rose Lane has a hotel
  And Lily Lane has 4 houses
  And Iris Road has 4 houses
  And the bank has 3 houses
  When p0 sells a house on Rose Lane
  Then it is rejected because "it has no hotel or the bank has at least 4 houses"

Example: any player may take a mortgage when it is not their turn
  Given p1 owns Rose Lane
  When p1 takes a mortgage on Rose Lane
  Then it is accepted
  And p1 has 1590 money
  And Rose Lane is mortgaged
  And it is p0's turn

Example: a debt must be paid before the turn can end
  Given p1 owns Rose Lane
  And p0 owns Mill Lane
  And p0 has 10 money
  And p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0 has -4 money
  And p0 owes p1
  When p0 ends their turn
  Then it is rejected because "no player has less than 0 money"
  When p0 takes a mortgage on Mill Lane
  Then p0 has 26 money
  When p0 ends their turn
  Then it is accepted
  And it is p1's turn

Example: giving up hands everything to the player you owe
  Given 3 players
  And p0 owns Mill Lane
  And p0 owns Ferry Row
  And Mill Lane has 1 house
  And Ferry Row has 1 house
  And the bank has 30 houses
  And p0 owns Ash Street
  And Ash Street is mortgaged
  And p0's kept cards has a Get Out Of Jail Free
  And p1 owns Rose Lane
  And p0 has 10 money
  And p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  And p0 gives up
  Then it is accepted
  And p0 is out
  And p1 owns Mill Lane
  And p1 owns Ash Street
  And Ash Street is mortgaged
  And Mill Lane has 0 houses
  And the bank has 32 houses
  And p1's kept cards has a Get Out Of Jail Free
  And p1 has 1514 money
  And it is p1's turn

Example: giving up to the bank returns everything to the bank
  Given 3 players
  And p0 owns Mill Lane
  And Mill Lane is mortgaged
  And p0's kept cards has a Get Out Of Jail Free
  And p0 has 100 money
  And p0 is on Go
  And the next roll is 1 and 3
  When p0 rolls the dice
  And p0 gives up
  Then it is accepted
  And p0 is out
  And no one owns Mill Lane
  And Mill Lane is not mortgaged
  And p0's kept cards are empty
  And the bottom card of the chance pile is a Get Out Of Jail Free
```

How each number comes from the board:
- Mortgages pay half the price, rounded down: Rose Lane 90 and Mill Lane 30. Paying off costs 55%: Rose Lane 99.
- A sale pays half the house price: 50 on an orange street.
- The bank starts with 32 houses and 12 hotels, less what the Given lines put on the board: 32 − 4 = 28, 32 − 8 = 24, 12 − 1 = 11 and 32 − 2 = 30.
- 3 + 4 from Cedar Avenue (9) lands on Rose Lane (16), whose base rent is 14: 10 − 14 = −4, and p1 then has 1514. That rent is 0 once Rose Lane is mortgaged.
- 1 + 3 from Go lands on Income Tax (4): 100 − 200 = −100, owed to the bank.
- The Promenade's rent of 50 (the three changed examples) takes p0 from 30 to −20, owed to p1.

- [ ] **Step 6: Extend `rent-day.test.ts`.**
  - **Examples:** `results` has length 68, and all pass.
  - **Constants:**
    - `SELL = 'sell a house on a street they own'`, `MORTGAGE = 'take a mortgage on a space they own'`;
    - `PAY_OFF = 'pay off a mortgage on a space they own'`, `GIVE_UP = 'give up'`;
    - `MORTGAGED = 'mortgaged'`, `PAY_OFF_RESERVE = 500`.
  - **Helpers:**
    - `isMortgaged(state, space)`;
    - `debtors(state, seats)`: the seats still in with money below 0, in seat order;
    - `accepted(table, by, words): number[]`, the spaces the button's target allows that `canDispatch` accepts, in board order. `buildable` becomes `accepted(table, by, BUILD)[0] ?? null`.
    - `const half = (n: number) => Math.floor((n * 50) / 100)`;
    - `const payOff = (n: number) => Math.floor((n * 55) / 100)`.
  - **The auto-player (`playTurn`).**
    - `make` dispatches, expects ok and calls `watch` as today. Then, unless it is already settling, it **settles debts**. While the game is not over and `debtors(state, seats)` is not empty, the first debtor acts, whoever's turn it is:
      - **An odd seat** presses GIVE_UP at once.
      - **An even seat** repeats these until it is out of debt:
        1. It presses SELL on the accepted street with the highest `house price`, the first in board order among equals.
        2. Else it presses MORTGAGE on the accepted space with the lowest `price`, the first among equals.
        3. Else it presses GIVE_UP.
      - Each sale or mortgage takes away a building or an unmortgaged space, so this always ends.
    - At the start of its turn, before USE, **an even seat pays off mortgages.** It presses PAY_OFF on each accepted space in board order while its money less `payOff(price)` stays at least `PAY_OFF_RESERVE`.
    - The rest is unchanged. A turn ends early when its player gave up (`stillTheirs()` is false).
    - Update its doc comment to say all this.
  - **`keepsTheRules`.**
    - **`walks`.** A walk never puts the mover out now. Replace `if (isOut(after, by)) return;` with `expect(isOut(after, by)).toBe(false)`. Rent is still read through the `Rent:` section, which makes it 0 on a mortgaged space.
    - **MORTGAGE** on `at = move.target`:
      - `moneyMoves(before, after, { [by]: half(price) }, …)`;
      - `[isMortgaged(before, at), isMortgaged(after, at), ownerOf(after, at)]` is `[false, true, by]`.
    - **PAY_OFF:**
      - `moneyMoves(…, { [by]: -payOff(price) }, …)`;
      - `[isMortgaged(before, at), isMortgaged(after, at)]` is `[true, false]`.
    - **SELL:**
      - before the move, every street of its color has at most `buildingsOn(before, at)`;
      - `moneyMoves(…, { [by]: half(house price) }, …)`;
      - `buildingsOn(after, at)` is one less, so a hotel (5) becomes 4 houses;
      - the owner is still `by`.
    - **GIVE_UP:**
      - `to = owedTo(before, by, 'money')` is not null;
      - `by` is out after, and `moneyMoves(before, after, {}, …)`;
      - every space `by` owned before is owned by `to` (null for `'bank'`) and has 0 buildings;
      - its `isMortgaged` is unchanged when `to` is a player, and false when it is the bank;
      - `by` keeps no cards, and when `to` is a player, `to` keeps as many as the two kept before between them.
    - **After every move:**
      - **Debts.** Every seat still in with money below 0 has `owedTo(after, seat, 'money')` not null.
      - **Mortgages.** Every mortgaged space has an owner, and a mortgaged street's color has no building on any of its streets.
      - **The turn.** When `after.turn.current` differs from `before.turn.current`, either:
        - the move was GIVE_UP by the seat whose turn it was; or
        - it was END and `debtors(before, seats)` was `[]`.
      - **Kept cards.** A kept card is in the kept cards of a seat that is still in. Bankruptcy now hands kept cards on, so drop the comment that a player who goes out keeps theirs.
      - The houses, hotels, 32-card, jail and turn-log checks stay. Anyone presses are never logged, so the turn-log check holds for them too.
  - **2-player ending.**
    - It stays: at least 9 of seeds 1 to 10 reach a winner within 3000 turns.
    - Next to the jail tallies, add `raising`: `'took a mortgage'`, `'paid off a mortgage'`, `'sold a building'`, `'gave up to a player'` and `'gave up to the bank'`. The last two are read from `owedTo(before, by, 'money')`.
    - Every tally must be above 0.
    - If one stays at 0, print the tallies and find out why before changing anything. If it is only chance, count it over the full-set runs as well: a counter shared by the `describe`, checked in a last `it`. Say so in the commit.
  - **4 and 8 players with full sets:**
    - These are unchanged: seeds 1, 2 and 3 within 5000 turns, a hotel built and someone going out holding buildings.
    - Odd seats give up at once, so players still go out holding buildings.
    - If a seed doesn't finish, try the next seed and say so in the commit. Don't raise the cap past 20000.
  - **The lean variant and undo:** unchanged. They now play through the settling auto-player.
- [ ] **Step 7: The page tests that read Rent Day.**
  - In `playtest.test.tsx`, the two tests that use `brokeRentDay` go on to press p0's Give up after the roll: `fireEvent.click(screen.getAllByRole('button', { name: 'Give up' })[0])`.
    - p0 then owes the bank for the tax. They are no longer out by the roll alone.
    - Each test's comment and `BROKE_SEED`'s comment say so: "they cannot pay it, and give up".
    - Everything they assert after that is unchanged.
  - In `playtest.test.tsx`, the test `draws the card table for a board game once a phase moves cards by hand` inserts `A player may take a card from the chance pile to their kept cards.` Its verb now clashes with `Any player may take a mortgage …` ("Two rules in this phase start “A player may take”"), so it inserts `A player may pick a card from the chance pile to their kept cards.` instead.
  - In `designer-page.test.tsx`, expect `68 of 68 examples pass`, and the test name says 68.
- [ ] **Step 8: Run** `bunx vitest run src/games/rent-day.test.ts src/pages/designer`. Fix any failure in the phrases, not in the example numbers: the numbers come from the board above. Then run `bun run test` and `bun run typecheck`.
- [ ] **Step 9: Commit**

```bash
git add src/games/rent-day.rules src/games/rent-day.test.ts src/pages/designer/playtest.test.tsx src/pages/designer/designer-page.test.tsx
git commit -m "feat(games): Rent Day slice 5: mortgages, selling buildings back, debts that hold the game, and giving up"
```

---

### Task 7: The playtest shows debts, striped flags and out-of-turn buttons; README

**Files:**
- Modify: `src/pages/designer/board-controls.tsx`, `src/pages/designer/board-grid.tsx`, `README.md`
- Test: `src/pages/designer/board-parts.test.tsx`, `src/pages/designer/playtest.test.tsx`

**Interfaces:**
- Consumes `BoardView.owes` and `SpaceView.stripes` (Task 5).
- **Money line.**
  - A seat still in reads its numbers, then `owes p1` or `owes the bank` when it has an entry in `owes`, then its facts, then its kept cards.
  - For example: `p0 -4 money · owes p1 · in jail · Get Out Of Jail Free`.
  - A seat that is out still reads only `p2 out`.
- **Striped spaces.**
  - A space with `stripes.length > 0` has `data-stripes={space.stripes.join(' ')}` and a diagonal stripe over its usual fill. The look is the builder's.
  - Its flags in `stripes` are not drawn as blocks: `factMarks` skips them. Other flags (the hotel) are still blocks.
  - Its title already names every set fact, the striped ones included.
- No page code names a fact, a pile or a card.
- **"Any player may" buttons** need no page change: each seat's view already says whether that seat may press them.

- [ ] **Step 1: Write the failing tests.**

In `board-parts.test.tsx`:

```ts
describe('debts and flags no bank item goes with', () => {
  it('names whom a seat owes right after its numbers', () => {
    render(<MoneyLine board={board({
      counters: [{ name: 'money', values: { p0: -4, p1: -20, p2: 40 } }], owes: { p0: 'p1', p1: 'bank' },
      playerFacts: { p0: { asleep: true } }, playerCards: { p0: ['Free Pass'] },
    })} />);
    expect(screen.getByText('p0 -4 money · owes p1 · asleep · Free Pass')).toBeTruthy();
    expect(screen.getByText('p1 -20 money · owes the bank')).toBeTruthy();
    expect(screen.getByText('p2 40 money')).toBeTruthy();
  });
  it('stripes a space for a flag no bank item goes with, and still draws a block for one that does', () => {
    const spaces = [space('Go'), space('Mill Lane', { facts: { pledged: true }, stripes: ['pledged'] }), space('Treasury'), space('Ferry Row', { facts: { hotel: true } })];
    render(<BoardGrid board={board({ spaces })} />);
    const mill = screen.getByTitle('Mill Lane — pledged');
    expect(mill.getAttribute('data-stripes')).toBe('pledged');
    expect(within(mill).queryAllByTestId('flag')).toHaveLength(0);
    const ferry = screen.getByTitle('Ferry Row — hotel');
    expect(ferry.getAttribute('data-stripes')).toBeNull();
    expect(within(ferry).getAllByTestId('flag')).toHaveLength(1);
  });
});
```

In `playtest.test.tsx` (import `setCounter` from board-state):

```ts
describe('Playtest: raising money', () => {
  const start = { ...withBoardData(initialState(rentDay, SEED), rentDay, ['p0', 'p1', 'p2']), turn: { current: 'p0', phase: 'playing' } };
  const named = (name: string) => screen.getAllByRole('button', { name });

  it('offers a button any player may press to a seat whose turn it is not, and the space it picks is striped on every board', () => {
    mountRentDay({ initial: setOwner(start, 16, 'p1') });
    expect(named('Take a mortgage')[1].getAttribute('aria-disabled')).toBe('false');
    expect(named('Take a mortgage')[0].getAttribute('title')).toBe('There is no space you own.');
    expect(rollButtons()[1].getAttribute('title')).toBe("It's p0's turn.");
    expect(named('Give up')[1].getAttribute('title')).toBe('they have less than 0 money');
    fireEvent.click(named('Take a mortgage')[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Pick Rose Lane' }));
    expect(screen.getAllByText('p1 1,590 money')).toHaveLength(3);
    expect(screen.getAllByTitle(/^Rose Lane — mortgaged, /)).toHaveLength(3);
    expect(document.querySelectorAll('[data-stripes="mortgaged"]')).toHaveLength(3);
    expect(rollButtons()[0].getAttribute('aria-disabled')).toBe('false');
  });
  it('names whom a seat owes on every money line, and the turn waits until the debt is paid', () => {
    // p0 on Cedar Avenue with 10 money rolls 3 and 4 onto p1's Rose Lane, whose rent is 14.
    const owing = queueRoll(placePiece(setCounter(setOwner(setOwner(start, 16, 'p1'), 1, 'p0'), 'money', 'p0', 10), 'p0', 9), [3, 4]);
    mountRentDay({ initial: owing });
    fireEvent.click(rollButtons()[0]);
    expect(screen.getAllByText('p0 -4 money · owes p1')).toHaveLength(3);
    expect(named('End your turn')[0].getAttribute('title')).toBe('no player has less than 0 money');
    expect(named('Give up')[0].getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(named('Take a mortgage')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Pick Mill Lane' }));
    expect(screen.getAllByText('p0 26 money')).toHaveLength(3);
    expect(named('End your turn')[0].getAttribute('aria-disabled')).toBe('false');
  });
});
```

- [ ] **Step 2: Run** `bunx vitest run src/pages/designer`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Check it in the browser.**
  - Run `bun run dev`, open `/#designer`, load Rent Day and press Play with 2 players.
  - Write a throwaway Playwright script (Playwright is installed globally) in your own scratchpad directory, never in the repo.
  - The script plays until p0 owns a space and it is p1's turn. Each turn, it presses the current seat's enabled `Roll the dice` (again while it stays enabled), `Buy the space you are on` when enabled, then `End your turn`.
  - Then it presses p0's `Take a mortgage`, picks the first outlined space on p0's board, and checks:
    - each board has one `[data-stripes="mortgaged"]`;
    - p0's money line reads the same on both panels;
    - p0's `Give up` is greyed with a reason on hover.
  - Take a screenshot and look at it. The stripe shows on a pale and on a colored space. The owner mark, the pieces and the space's name stay readable.
- [ ] **Step 5: Run** `bunx vitest run src/pages/designer`, then `bun run test` and `bun run typecheck`. Then run the three checks below:
  - the first prints only the `library/index.ts` import of `./rent-day`;
  - the second and third print nothing.

```bash
grep -rniE '\b(jail|rent|houses?|hotels?|streets?|stations?|utilit(y|ies)|money|mortgage[ds]?|bankrupt(cy)?)\b' src/engine/core/lang --include=*.ts | grep -v '\.test\.ts' | grep -v 'library/rent-day.ts' | grep -v 'lang/testing.ts'
grep -rniE '\b(chance|treasury|mortgage[ds]?|bankrupt(cy)?)\b|get out of jail free' src/engine src/pages --include=*.ts --include=*.tsx | grep -v '\.test\.' | grep -v 'lang/testing.ts' | grep -v 'library/rent-day.ts'
grep -rniwE 'jail|mortgaged' src/pages/designer | grep -v '\.test\.'
```

- [ ] **Step 6: Update the README.**
  - Under *Designing a game*, change "with 56 examples" to "with 68 examples".
  - In the bullet for `Spaces can have houses and a hotel.`, say that a yes-or-no no bank item goes with (`Spaces can be mortgaged.`) stripes the space instead of drawing a block.
  - After the **Cards that say what they do.** paragraph, add a **Raising money.** paragraph covering these points:
    - `Any player may …` makes a button every seat may press, whoever's turn it is. Its `Only if` lines still decide. It never passes the turn: an After line can't name it, and `they have … this turn` never counts it.
    - A payment that leaves a player below 0 notes whom they owe, a player or the bank. The latest such payment wins, and the debt lasts while they are below 0.
      - Conditions: `they have less than 0 money`, `no player has less than 0 money` (players who are out don't count) and `they owe the bank`.
      - Examples: `p0 owes p1`, `p0 owes the bank`.
    - `Everything they own goes to the player they owe.`
      - To a player, it hands over their spaces, facts and all, and the cards they keep in view.
      - To the bank, spaces become unowned and cards go under their own piles.
    - Percentages round down: `They get 50% of its price.`, `They pay 55% of its price.`, `they have at least 55% of its price in money`.
    - Space flags: `Spaces can be mortgaged.`, then `It is mortgaged.`, `It is not mortgaged.`, `Their spaces are no longer mortgaged.`, `it is mortgaged` and `Rose Lane is mortgaged`.
    - The bank and buildings:
      - `the bank has at least 4 houses`, `it gets 4 houses from the bank`;
      - `one of its houses goes back to the bank`, `its hotel goes back to the bank`;
      - `it has a house`, `no street of its color is mortgaged`.
    - In the playtest, a debt follows the player's numbers (`p0 -4 money · owes p1`), a mortgaged space is striped on every board, and an "Any player may" button is live on every seat that may press it.
  - In the roadmap, mark slice 5 shipped:
    - change "… slice 3 (…) and slice 4 (…) have shipped" to "… slice 3 (…), slice 4 (…) and slice 5 (…) have shipped";
    - the new entry reads "slice 5 (raising money: buttons any player may press at any time, debts and whom they are owed to, percentages, yes-or-no space facts such as a mortgage, selling buildings back, and giving up to a player or to the bank)".
- [ ] **Step 7: Commit**

```bash
git add src/pages/designer/board-controls.tsx src/pages/designer/board-grid.tsx src/pages/designer/board-parts.test.tsx src/pages/designer/playtest.test.tsx README.md
git commit -m "feat(designer): debts on the money line, striped space flags, and buttons any seat may press; docs: README"
```
