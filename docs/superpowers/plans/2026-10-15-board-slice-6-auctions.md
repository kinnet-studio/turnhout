# Board Games Slice 6 (Auctions) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the lander does not buy a space nobody owns, Rent Day auctions it. Every player still in bids in turn or drops out, the last bidder pays and owns the space, and play goes back to the lander's turn exactly as it was. All of it is written in Rent Day's own text. To get there, the language gains buttons that carry an amount, numbers that belong to the game, phrases about every player's flags and about the one flagged space, and a phase that interrupts a turn and goes back to it, with a turn order that skips players.

**Architecture:**
- **Language layer only.** New work is in the language (`src/engine/core/lang/`), the views, the designer page and Rent Day's text. Core `game-state.ts`, `flow.ts` and `game-engine.ts` stay untouched. Nothing about auctions exists outside `src/games/rent-day.rules` and tests.
- **Built on slice 5's finished state, as its plan describes it.** That includes:
  - `Any player may …` buttons, and `transfer`'s debt record (`recordDebt`, `owedTo`);
  - `no player has less than {int} {counter}`;
  - `spaces can be {name}`, with `it is {spaceflag}`, `it is not {spaceflag}` and the Given and Then lines `{space} is {spaceflag}`;
  - `BoardView.owes` and `SpaceView.stripes`;
  - Rent Day's 70 examples, and the auto-player that settles debts.
- **The amount rides on the press.**
  - A move may carry `amount`. `aboutPress` puts it on `Subject.amount`.
  - The move is refused in this order: the flow gate (the engine's), the seat checks, a missing or bad amount, then every `Only if` group.
  - Phrases that read the amount are marked `needsAmount`, and the compiler accepts them only where `LineCtx.amount` is set: in a button whose wording ends in " an amount".
  - The seat view asks `canDispatch` without an amount. When that gets as far as the amount prompt, `amountReady` judges the groups that do not read the amount.
- **Game numbers are facts about the game.**
  - `FactSpec` becomes a union with `GameNumber` (`on: 'game'`, plus `start`).
  - A value a rule sets lives in `lang:facts` under `game`. Reading falls back to the declared start, so nothing is written when the game starts.
- **Interrupting a turn is an effect.**
  - It writes `lang:interrupted`, sets `turn.phase` and `turn.current`, clears both turn logs, then runs the phase's start lines through `env.runLine`.
  - The flow carries on from that state: `runFlow` looks the phase up again on every pass.
  - `go back to the interrupted turn` restores the record exactly.
  - The start phrase is marked `entersPhase`, and `warnUnreachable` counts the phase it names.
- **Where the new phrases live.**
  - Game numbers: new `library/game-numbers.ts`.
  - The amount: new `library/amount-phrases.ts`.
  - Every player's flags: `library/player-facts.ts`.
  - The flagged space: `library/fact-phrases.ts`.
  - `someone owns it` and `it has no {spaceattr}`: `library/board-phrases.ts`.
  - Interrupt, go back, and the skipping turn phrase: `library/flow-phrases.ts`.
  - The interrupted-turn record: `board-state.ts`.
- **Task order follows the breakdown, with one change the code forces.**
  - Rent Day's new guards say `it has no price` and `someone owns it`. The library has neither: it has `it has a {spaceattr}`, `no one owns it` and `someone else owns it`.
  - Task 3 adds both, next to the other phrases about a space.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19, Playwright (installed globally; Chromium in `/opt/pw-browsers`) for the browser check.

**Spec:** `docs/superpowers/specs/2026-10-15-board-slice-6-auctions-design.md`, including its settled builder-check calls (Q1–Q9). It is part of `docs/superpowers/specs/2026-10-15-board-games-overview-design.md`.

## Global Constraints

- **Branch and commands.**
  - Work on `claude/peaceful-curie-rdfkow`.
  - Single test file: `bunx vitest run <path>`.
  - Full suite: `bun run test`. Every test of slice 5's final count passes at the start; run it once first to get the number.
  - Types: `bun run typecheck`.
- **No new dependencies.**
- **Pure core.** `src/engine/core/**` stays pure: no pixi, react or DOM imports, no `Math.random` or `Date.now`.
- **Files not to touch:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, and `src/pages/hearts-demo/**`.
- **Json shapes.**
  - Everything in `CompiledGame` and `SeatExtras`, every `lang:*` value and every move is `Json`.
  - Declare these shapes with `type` aliases, and use `null` (never `undefined`) inside them.
  - `Subject` is not stored anywhere, so its new `amount?: number` may be optional.
- **No Monopoly words in shared code.**
  - Banned words: rent, house, hotel, street, station, utility, money and jail. They must not appear in engine or language code outside `src/engine/core/lang/library/rent-day.ts`, not even in comments.
  - "chance", "treasury" and "get out of jail free" must not appear in engine, language or page code at all.
  - "mortgage", "mortgaged" and "bankrupt" must not appear in engine, language or page code outside `library/rent-day.ts`, comments included.
  - **"auction", "bid", "bidder" and "high bid" must not appear in engine, language or page code at all, `library/rent-day.ts` included, comments included.** The auction is written in Rent Day's text alone.
    - The one exception is already there: `refs.ts`'s table of irregular participles lists `bid: 'bid'` as plain English. It stays.
  - All of these words may appear in tests, test fixtures (`lang/testing.ts`), `src/games/*.rules` and docs.
  - These are general words and may appear anywhere: "owe", "give up", "any player", "debt", percentages, "amount", "interrupted turn", "every player", "no player", and game numbers ("a number the game has").
  - No non-test file under `src/pages/designer/` may contain "jail" or "mortgaged". The page shows flags, debts and game numbers by a general rule.
- **No engine words in front of designers.** Diagnostics, rejection reasons, example results and the page never show engine vocabulary (`FlowDef`, `anyActor`, `NamedRef`, `zoneId`, `lang:`) or stack traces.
- **Existing behaviour stays.**
  - Hearts, Color Match and Venom compile with no diagnostics and pass their examples.
  - A button whose wording does not end in " an amount" compiles and plays exactly as before.
  - Rent Day's 70 examples keep passing, except the two that Task 5 changes because a turn can no longer end on, or roll past, an unbought space.
  - Task 5 also changes the one playtest test whose p0 ends a turn on a space nobody owns.
  - The seat status puts the phase's name first only while a turn is interrupted (controller ruling, replacing the spec's "not the first phase"). So Hearts, Color Match, Venom and Rent Day outside an auction show exactly the status they show today.
- **Style and commits.**
  - 2-space indent, single quotes, chainable registrars, and comments that say why.
  - Commit prefixes: `feat(lang):`, `feat(games):`, `feat(designer):`, `docs:`.
  - Stage files by path, never `git add -A`.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.

## Review Focus

- **An amount that is not a whole number of 0 or more never reaches a phrase.** That covers 1.5, -5, the text "50", `null`, `true` and no amount at all. Each is refused with "Say how much to raise." before any `Only if` line reads it. Test in Task 2.
- **Players who are out are never counted.** This holds for `every player is …`, `no player is …` (as an effect and as a condition) and `no other player is …`, even when an out player still carries the flag from before they went out. Test in Task 3.
- **The interrupted turn comes back exactly as it was.**
  - A turn-log or rolls key that was absent comes back absent.
  - Presses made during the interruption are gone.
  - Going back with no turn interrupted is an error with a plain message, and so is a second interruption while one is open.
  - Test in Task 4.
- **The last player still bidding wins with their own bid, at once.** Everyone else has dropped out with no bid on the table. The remaining player's bid ends the auction then and there: they pay it, own the space, and the lander's turn resumes. Test in Task 5.
- **The page never makes up an amount.** An empty box sends a move with no amount, and the seat sees "Say how much to bid.". A typed number goes as typed, and a too-low one flashes the `Only if` line that refused it. Test in Task 6.

---

### Task 1: Numbers that belong to the game

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`ThingFact`, `GameNumber`, `FactSpec`)
- Modify: `src/engine/core/lang/refs.ts` (`GAMENUMBER`, added to `VOCAB_TYPES`)
- Modify: `src/engine/core/lang/board-state.ts` (`Facts.game`, `gameNumber`, `setGameNumber`)
- Modify: `src/engine/core/lang/library/fact-phrases.ts` (type only: `declares` and `isFlagOn` take `ThingFact['on']`)
- Create: `src/engine/core/lang/library/game-numbers.ts` (`registerGameNumberPhrases`)
- Modify: `src/engine/core/lang/library/index.ts` (add it to `REGISTRARS` right after `registerDebtPhrases`)
- Modify: `src/engine/core/lang/board-view.ts` (`BoardView.gameNumbers`, `readSeatExtras`)
- Modify: the hand-built `BoardView`s in tests gain `gameNumbers: []`: `board-view.test.ts`, `src/pages/designer/board-parts.test.tsx` (`board()`) and `src/pages/designer/seat-status.test.ts` (`boardExtras`)
- Test: create `src/engine/core/lang/library/game-numbers.test.ts`; `src/engine/core/lang/board-view.test.ts`

**Interfaces:**
- **`types.ts`:**

```ts
/** A fact the game keeps about every space, card or player: a count, or something that is either so or not. */
export type ThingFact = { name: string; on: 'space' | 'card' | 'player'; kind: 'number' | 'flag' };
/** A number that belongs to the game itself, to no player and no space, and the value it starts at. */
export type GameNumber = { name: string; on: 'game'; kind: 'number'; start: number };
export type FactSpec = ThingFact | GameNumber;
```

  Existing `FactSpec` literals stay valid as `ThingFact`s. `FactItem` stays `Pick<FactSpec, 'name' | 'kind'>`.
- **`refs.ts`:** `GAMENUMBER = declaredWord('gamenumber', '[game number]', 'game number', factNames('game', 'number'), false)`.
- **`board-state.ts`:**
  - `Facts` gains `game: { [name: string]: number }`, and `factsOf`'s default gains `game: {}`.
  - `setFact`'s table stays `'spaces' | 'players'`.
  - `gameNumber(state: GameState, game: CompiledGame, name: string): number` gives the value a rule last set. Before any rule sets it, it gives the declared `start`. A name the game never declared throws `Error` `` `The game has no number called “${name}”.` ``.
  - `setGameNumber(state: GameState, name: string, value: number): GameState`.
- **`game-numbers.ts`** (say "number" and "game", never the banned words):
  - Declare `'the game has a {name} of {int}'` and `'the game has an {name} of {int}'` both give `[{ name, on: 'game', kind: 'number', start }]`. They are read under `Board:`, as every declaration is.
  - Effect `'the {gamenumber} is {int}'` sets it.
  - Effect `'they pay the {gamenumber}'` (needsPlayer, needsPayment) is `transfer(env, theyOf(env), null, gameNumber(…))`, so slice 5's debt record applies to it.
  - Given `'the {gamenumber} is {int}'` sets it.
  - Expect `'the {gamenumber} is {int}'` fails with `` `Expected the ${name} to be ${n}, but it is ${have}.` ``.
- **`board-view.ts`:**
  - `BoardView.gameNumbers: { name: string; value: number }[]` lists the game's numbers that are not 0, in the order the game declares them. Every seat sees the same.
  - `readSeatExtras` requires `gameNumbers` to be a list of `{ name: text, value: number }`.

- [ ] **Step 1: Write the failing tests.**

Create `library/game-numbers.test.ts`:

```ts
const lib = createDefaultLibrary();
const POT = TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  The game has a pot of 5.');
const game = compileGame(POT, lib).game!;
const start = fixtureBoardState(game);
const about = (state: GameState) => fixtureEnv(state, { game, seats: ['p0', 'p1'], subject: { player: 'p0', space: null, card: null } });
const bare = (state: GameState) => fixtureEnv(state, { game, seats: ['p0', 'p1'] });

it('declares a number of the game and where it starts', () => {
  expect(compileGame(POT, lib).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(game.facts).toEqual([{ name: 'pot', on: 'game', kind: 'number', start: 5 }]);
  expect(gameNumber(start, game, 'pot')).toBe(5);
});
it('is set by a rule, and paid to the bank from the counter players pay with', () => {
  const s = runPhrase<GameState>(lib, 'effect', 'the pot is 30', about(start));
  expect(gameNumber(s, game, 'pot')).toBe(30);
  expect(counterOf(runPhrase<GameState>(lib, 'effect', 'they pay the pot', about(s)), 'money', 'p0')).toBe(1470);
});
it('notes a debt to the bank when paying it takes them below 0', () => {
  const s = runPhrase<GameState>(lib, 'effect', 'they pay the pot', about(setGameNumber(setCounter(start, 'money', 'p0', 10), 'pot', 30)));
  expect([counterOf(s, 'money', 'p0'), owedTo(s, 'p0', 'money')]).toEqual([-20, 'bank']);
});
```

Also add these:
- **Given and Then.**
  - Given `the pot is 50`, then expect `the pot is 50`, gives `true`.
  - Expect `the pot is 40` on that state gives `Expected the pot to be 40, but it is 50.`
- **Twice.** `POT` with a second `  The game has a pot of 0.` reports `There are two facts called “pot”.` on that line.
- **Needs.** `lib.get('effect', 'they pay the {gamenumber}')` matches `{ needsPlayer: true, needsPayment: true }`.

In `board-view.test.ts`, add `describe("seat views of the game's numbers")`, on a two-player engine of `POT` (the same text as above):
- A fresh engine's `board!.gameNumbers` is `[{ name: 'pot', value: 5 }]` for both seats.
- On a state with `setGameNumber(…, 'pot', 0)`, it is `[]`.
- `readSeatExtras` gives null for a board without `gameNumbers`, and for `gameNumbers: [{ name: 'pot', value: '5' }]`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/game-numbers.test.ts src/engine/core/lang/board-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the two files and `bunx vitest run src/pages/designer`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/refs.ts src/engine/core/lang/board-state.ts \
  src/engine/core/lang/library/fact-phrases.ts src/engine/core/lang/library/game-numbers.ts src/engine/core/lang/library/index.ts \
  src/engine/core/lang/board-view.ts src/engine/core/lang/library/game-numbers.test.ts src/engine/core/lang/board-view.test.ts \
  src/pages/designer/board-parts.test.tsx src/pages/designer/seat-status.test.ts
git commit -m "feat(lang): numbers that belong to the game: declared with where they start, set, paid, and shown when not 0"
```

---

### Task 2: Buttons that carry an amount

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`DeclaredAction.amount`, `Vocab['actions'][number].amount`, `Subject.amount`)
- Modify: `src/engine/core/lang/phrases.ts` (`PhraseOpts.needsAmount`, `Entry`, `add`, `get`)
- Modify: `src/engine/core/lang/compile-util.ts` (`LineCtx.amount`, `unmetNeed`)
- Modify: `src/engine/core/lang/compile-phase.ts` (`AMOUNT_WORDING`, `actionOf`, `compileAction`)
- Modify: `src/engine/core/lang/compile.ts` (`readActions`, and `amount: false` in `stage`)
- Modify: `src/engine/core/lang/refs.ts` (`AMOUNTACTION`)
- Modify: `src/engine/core/lang/runtime.ts` (`readsAmount`)
- Modify: `src/engine/core/lang/declared-actions.ts` (`pickedAmount`, `aboutPress`, `amountPrompt`, `amountReady`)
- Modify: `src/engine/core/lang/board-view.ts` (`ActionView.amount`, `actionViews`, `isAction`)
- Modify: `src/engine/core/lang/library/support.ts` (`theAmount`)
- Create: `src/engine/core/lang/library/amount-phrases.ts` (`registerAmountPhrases`, added to `REGISTRARS` right after `registerGameNumberPhrases`)
- Modify: `src/engine/core/lang/testing.ts` (`vocabFor`, new `AMOUNT_BOARD`)
- Modify: tests that build a vocab action, a `DeclaredAction`, an `ActionView` or a `LineCtx` by hand, or compare compiled actions or action views whole. Each gains `amount: false`. To find them, grep `anyone:`, `target: null` and `drawn: false` in tests. They include:
  - `refs.test.ts`, `phrases.test.ts`, `library/board-phrases.test.ts`;
  - `compile-phase.test.ts`, `compile-util.test.ts`;
  - `board-view.test.ts` and `src/pages/designer/board-parts.test.tsx`.
- Test: create `src/engine/core/lang/library/amount-phrases.test.ts`; `declared-actions.test.ts`, `compile-phase.test.ts`, `board-view.test.ts`

**Interfaces:**
- Consumes `{gamenumber}`, `gameNumber`, `setGameNumber` and `they pay the {gamenumber}` (Task 1).
- **`types.ts`:**
  - `DeclaredAction.amount: boolean` is true for a button whose wording ends in " an amount" and that picks no space.
    - Its `base` and `label` leave " an amount" out: `bid an amount` has base `'bid'` and label `'Bid'`.
    - Its `words`, which are its move type, keep the whole wording.
  - `Vocab['actions'][number]` gains `amount: boolean`.
  - `Subject` gains `amount?: number`: the amount the press carries, set only for an amount button.
- **`phrases.ts`:** `PhraseOpts.needsAmount?: boolean`: the phrase reads the amount a button's press carries. `get` returns it with the other needs.
- **`compile-util.ts`:**
  - `LineCtx.amount: boolean` is true only for the lines of an amount button.
  - `unmetNeed`, after the card checks: `` `“${clean}” only makes sense in a button whose wording ends in “an amount”, like “A player may give an amount.”` ``.
- **`compile-phase.ts`:**
  - `AMOUNT_WORDING = /^(.+) an amount$/i` is tried on the wording of a button that picks no space.
  - `actionOf` also returns `amount: boolean`. For an amount button, `base` and `baseWritten` are group 1.
  - `compileAction` reads the body with `{ ...ctx, player: true, space: true, amount }`, and copies `amount` into the `DeclaredAction`.
- **`compile.ts`:** `readActions` passes `amount`.
- **`refs.ts`:** `AMOUNTACTION = wordType('amountaction', '[action]', (v) => v.actions.filter((a) => a.amount).map((a) => [thirdPersonWords(a.base), a.words]), undefined)`. It is added to `VOCAB_TYPES`. `ACTION` still lists amount buttons by their whole wording, so "p0 raises an amount" sends no amount.
- **`runtime.ts`:** `readsAmount(group: CondGroup): boolean` is true when a ref of the group names a phrase whose entry has `needsAmount`.
- **`declared-actions.ts`:**
  - `pickedAmount(m: Move): number | null` (file-private) gives `m.amount` when it is a number, a whole number, and 0 or more. Otherwise it gives null.
  - `export function amountPrompt(action: DeclaredAction): string` is `` `Say how much to ${secondPersonWords(action.base)}.` ``
  - `aboutPress`, for an amount button: a null `pickedAmount` gives `amountPrompt(action)`. Otherwise it gives `{ player: by, space: null, card: null, amount }`.
  - So `choose` refuses in this order: no such button or seat, out of the game, the amount, then the first failing group. The flow gate comes before all of them.
  - `export function amountReady(runtime: LangRuntime, action: DeclaredAction, state: GameState, seat: PlayerId): true | string`:
    - It gives `"You're out of the game."` for a seat that is out.
    - Otherwise it gives the first failing group among those that do not `readsAmount`, about `{ player: seat, space: null, card: null }`, or `true`.
- **`board-view.ts`:**
  - `ActionView` gains `amount: boolean`.
  - For an amount button, `allowed` is:
    - `OUT_OF_GAME` for a seat that is out;
    - otherwise `allowedNow(engine, state, seat, move)` with no amount. When that equals `amountPrompt(action)`, `allowed` is `amountReady(…)` instead, and a throw there gives `friendlyError(e)`.
  - Every other button has `amount: false`.
  - `isAction` requires `amount` to be a boolean.
- **`support.ts`:** `theAmount(env: PhraseEnv): number` gives `env.subject.amount`. Without one, it throws `Error` `This phrase needs an amount, but the button carries none.`
- **`amount-phrases.ts`:**
  - Condition `'the amount is more than the {gamenumber}'` (needsAmount).
  - Condition `'they have at least the amount in {counter}'` (needsPlayer, needsAmount).
  - Effect `'the {gamenumber} is the amount'` (needsAmount).
  - Action `'{player} {amountaction} {int}'` gives `{ by, move: { type: words, amount: n } }`. `{int}` takes negatives, and the move refuses them.
- **`testing.ts`:**
  - `vocabFor` passes `amount: a.amount`.
  - New `AMOUNT_BOARD`, written as below. Task 2 uses it.

```ts
/**
 * TINY_BOARD_HEAD with a pot the game keeps and a button that carries an amount: after rolling, a player may raise the pot to more
 * than it is, as long as they have that much, and ending the turn pays the pot to the bank and empties it. Line 15 declares the
 * pot; `A player may raise an amount.` is line 24 and `A player may end their turn.` line 30.
 */
export const AMOUNT_BOARD = [
  TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  The game has a pot of 0.'),
  '  A player may roll the dice.', '    Only if they have not rolled this turn.', '    Then:', '      Roll the dice.',
  '      Their piece moves forward by the roll.',
  '  A player may raise an amount.', '    Only if they have rolled this turn.', '    Only if the amount is more than the pot.',
  '    Only if they have at least the amount in money.', '    Then:', '      The pot is the amount.',
  '  A player may end their turn.', '    Only if they have rolled this turn.', '    Then:', '      They pay the pot.', '      The pot is 0.',
  '  After a player ends their turn, the turn passes to the left.',
  '', 'End:', '  The game ends when one player is left.', '  That player wins.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**

In `declared-actions.test.ts`, add `describe('buttons that carry an amount', …)`. Use `const pot = compileGame(AMOUNT_BOARD, lib).game!`, `const RAISE = 'raise an amount'`, and `rolled()`: an `engineWith((s) => queueRoll(s, [1, 2]), pot)` on which p0 has rolled.

```ts
it('compiles, keeps “an amount” out of the label, and reads the amount from the move', () => {
  expect(compileGame(AMOUNT_BOARD, lib).diagnostics).toEqual([]);
  expect(pot.phases[0].actions.map((a) => [a.words, a.base, a.label, a.amount])).toEqual([
    ['roll the dice', 'roll the dice', 'Roll the dice', false], [RAISE, 'raise', 'Raise', true], ['end their turn', 'end their turn', 'End your turn', false],
  ]);
  const engine = rolled();
  expect(engine.dispatch({ type: RAISE, by: 'p0', amount: 50 }).ok).toBe(true);
  expect(gameNumber(engine.getState(), pot, 'pot')).toBe(50);
});
it('refuses in order: the turn, a missing amount, then every Only if line', () => {
  const fresh = engineWith((s) => s, pot);
  expect(fresh.canDispatch({ type: RAISE, by: 'p1', amount: 50 })).toBe("not p1's turn");
  expect(fresh.canDispatch({ type: RAISE, by: 'p0' })).toBe('Say how much to raise.');
  expect(fresh.canDispatch({ type: RAISE, by: 'p0', amount: 50 })).toBe('they have rolled this turn');
  const engine = rolled();
  expect(engine.canDispatch({ type: RAISE, by: 'p0', amount: 0 })).toBe('the amount is more than the pot');
  expect(engine.canDispatch({ type: RAISE, by: 'p0', amount: 1501 })).toBe('they have at least the amount in money');
});
it('Review Focus: an amount that is not a whole number of 0 or more is refused before any Only if line reads it', () => {
  const engine = rolled();
  for (const amount of [1.5, -5, '50', null, true]) expect(engine.canDispatch({ type: RAISE, by: 'p0', amount })).toBe('Say how much to raise.');
});
```

Also add this to the same describe: **As an example.** In the test (not in `testing.ts`), compile `AMOUNT_BOARD` with the example below appended. It has no diagnostics, and `runExamples` gives one result, which passes. The roll lands on Rose Lane (3), where no rule fires.

```text
Example: raising the pot
  Given the next roll is 1 and 2
  When p0 rolls the dice
  And p0 raises 0
  Then it is rejected because "the amount is more than the pot"
  When p0 raises an amount
  Then it is rejected because "Say how much to raise."
  When p0 raises 50
  Then it is accepted
  And the pot is 50
  When p0 ends their turn
  Then p0 has 1450 money
  And the pot is 0
```

In `compile-phase.test.ts`, add `describe('buttons that carry an amount', …)`:
- **Outside an amount button.** `AMOUNT_BOARD.replace('    Only if they have rolled this turn.\n    Then:\n      They pay the pot.', '    Only if the amount is more than the pot.\n    Then:\n      They pay the pot.')` gives diagnostics containing:
  - `[31, '“the amount is more than the pot” only makes sense in a button whose wording ends in “an amount”, like “A player may give an amount.”']`.
- **A button that picks a space is no amount button.** `AMOUNT_BOARD.replace('  A player may end their turn.', '  A player may plant an amount on a street they own.\n  A player may end their turn.')` compiles with no errors. Its new action has `amount: false`, `base: 'plant an amount'` and a `target`.

Create `library/amount-phrases.test.ts`. Use the compiled `AMOUNT_BOARD` game, and `about(state, amount)`: the env of a rule about p0 whose subject carries `amount`.
- **Comparing.**
  - With the pot set to 5, `the amount is more than the pot` is true for 6 and false for 5.
  - `they have at least the amount in money` is true for 1500 and false for 1501.
- **Setting.** `the pot is the amount` with amount 70 leaves `gameNumber(…, 'pot')` at 70.
- **Needs.**
  - The two conditions match `{ needsAmount: true }` and `{ needsPlayer: true, needsAmount: true }`.
  - The effect matches `{ needsAmount: true }`.
- **The example action.** `lib.match('action', 'p1 raises 50', vocabFor(pot))` is ok with args `['p1', 'raise an amount', 50]`. Running it gives `{ by: 'p1', move: { type: 'raise an amount', amount: 50 } }`.

In `board-view.test.ts`, add `describe('seat views of a button that carries an amount')`, on a two-player `AMOUNT_BOARD` engine with `[1, 2]` queued:
- **Before rolling.** p0's raise view is `{ move: RAISE, label: 'Raise', allowed: 'they have rolled this turn', target: null, amount: true }`.
- **After p0 rolls.**
  - p0's `allowed` is `true`, although no amount has been typed.
  - p1's is `"It's p0's turn."`.
- **No money.** On an engine where p0 has 0 money and has rolled, p0's `allowed` is still `true`: the amount lines wait for an amount.
- **Other buttons.** Roll and end their turn have `amount: false`.
- **Plain data.** `readSeatExtras` gives null for an action without `amount`, and for `amount: 'yes'`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/library/amount-phrases.test.ts src/engine/core/lang/board-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the four files and `bunx vitest run src/pages/designer`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/phrases.ts src/engine/core/lang/compile-util.ts src/engine/core/lang/compile-phase.ts \
  src/engine/core/lang/compile.ts src/engine/core/lang/refs.ts src/engine/core/lang/runtime.ts src/engine/core/lang/declared-actions.ts \
  src/engine/core/lang/board-view.ts src/engine/core/lang/library/support.ts src/engine/core/lang/library/amount-phrases.ts \
  src/engine/core/lang/library/index.ts src/engine/core/lang/testing.ts src/engine/core/lang/library/amount-phrases.test.ts \
  src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/compile-util.test.ts \
  src/engine/core/lang/board-view.test.ts src/engine/core/lang/refs.test.ts src/engine/core/lang/phrases.test.ts \
  src/engine/core/lang/library/board-phrases.test.ts src/pages/designer/board-parts.test.tsx
# If the full run or typecheck needed `amount: false` in another test file, stage it by path too.
git commit -m "feat(lang): buttons that carry an amount, refused when it is missing or not a whole number, and live before it is typed"
```

---

### Task 3: Every player's flags, the one flagged space, and two space guards

**Files:**
- Modify: `src/engine/core/lang/library/player-facts.ts`
- Modify: `src/engine/core/lang/library/fact-phrases.ts`
- Modify: `src/engine/core/lang/library/board-phrases.ts` (`someone owns it`, `it has no {spaceattr}`)
- Test: `src/engine/core/lang/library/player-facts.test.ts`, `src/engine/core/lang/library/fact-phrases.test.ts`, `src/engine/core/lang/library/board-phrases.test.ts`

**Interfaces:**
- **`player-facts.ts`.** Each of these counts only `playersIn(env.state, env.seats)`. A player who is out keeps whatever they had, and nothing reads it.
  - Effect `'every player is {playerflag}'` sets the flag true on every player still in.
  - Effect `'no player is {playerflag}'` sets it false on every player still in.
  - Condition `'no player is {playerflag}'` holds when no player still in has it set.
  - Condition `'no other player is {playerflag}'` (needsPlayer) holds when no player still in other than they has it set.
- **`fact-phrases.ts`:**
  - `theSpaceThatIs(env: PhraseEnv, flag: string): number` (file-private) gives the one space with the flag set. Its errors are:
    - with none, RuleError `` `No space is ${flag}.` ``;
    - with more than one, RuleError `` `More than one space is ${flag}: ${names}.` ``, where `names` are the spaces in board order, joined like "Mill Lane and Rose Lane".
  - Effect `'they own the space that is {spaceflag}'` (needsPlayer, needsBoard) is `setOwner(state, theSpaceThatIs(…), they)`.
  - Effect `'the space that is {spaceflag} is not {spaceflag}'` (needsBoard) sets the second flag false on the space the first one picks.
  - Effect `'no space is {spaceflag}'` (needsBoard) sets the flag false on every space that has it set.
- **`board-phrases.ts`.** Rent Day's guards (Task 5) need these:
  - Condition `'someone owns it'` (needsSpace, needsBoard) holds when the space has any owner, the player the rule is about included.
  - Condition `'it has no {spaceattr}'` (needsSpace) is the opposite of `it has a {spaceattr}`. It cannot clash with `it has no {spaceflag}`, since a fact may not be named like a column.

- [ ] **Step 1: Write the failing tests.**

In `player-facts.test.ts`, add `describe('a flag on every player at once')`. Use the file's `seats = ['p0', 'p1', 'p2']` and `in jail` flag, and `const jailed = (state: GameState, ...who: PlayerId[]) => who.reduce((s, seat) => setPlayerFact(s, seat, 'in jail', true), state)`.

```ts
it('Review Focus: sets it on every player still in, and never counts a player who is out', () => {
  const s = effect('every player is in jail', markOut(fresh(), 'p2'));
  expect(seats.map((seat) => playerFact(s, seat, 'in jail'))).toEqual([true, true, null]);
  const stale = markOut(jailed(fresh(), 'p2'), 'p2');
  expect(condition('no player is in jail', stale)).toBe(true);
  expect(condition('no other player is in jail', jailed(stale, 'p0'), 'p0')).toBe(true);
});
it('clears it on every player still in', () => {
  const s = effect('no player is in jail', jailed(fresh(), 'p0', 'p1'));
  expect(seats.map((seat) => playerFact(s, seat, 'in jail'))).toEqual([false, false, false]);
});
it('judges whether no player, or no player but them, has it', () => {
  expect(condition('no player is in jail', fresh())).toBe(true);
  expect(condition('no player is in jail', jailed(fresh(), 'p1'))).toBe(false);
  expect(condition('no other player is in jail', jailed(fresh(), 'p0'), 'p0')).toBe(true);
  expect(condition('no other player is in jail', jailed(fresh(), 'p0', 'p1'), 'p0')).toBe(false);
});
```

Also add: **Needs.** `lib.get('condition', 'no other player is {playerflag}')` matches `{ needsPlayer: true }`.

In `fact-phrases.test.ts`, add `describe('the one space with a flag')` on slice 5's `FLAGGED` game, with `effect(text, state, null, FLAGGED)` about p0:

```ts
it('gives the one flagged space an owner, and clears a flag on it', () => {
  const owned = effect('they own the space that is mortgaged', setSpaceFact(fresh(FLAGGED), ROSE, 'mortgaged', true), null, FLAGGED);
  expect(ownerOf(owned, ROSE)).toBe('p0');
  const cleared = effect('the space that is mortgaged is not mortgaged', owned, null, FLAGGED);
  expect([spaceFact(cleared, ROSE, 'mortgaged'), ownerOf(cleared, ROSE)]).toEqual([false, 'p0']);
});
it('is an error when no space, or more than one, has the flag', () => {
  expect(() => effect('they own the space that is mortgaged', fresh(FLAGGED), null, FLAGGED)).toThrow('No space is mortgaged.');
  const two = setSpaceFact(setSpaceFact(fresh(FLAGGED), ROSE, 'mortgaged', true), 1, 'mortgaged', true);
  expect(() => effect('they own the space that is mortgaged', two, null, FLAGGED)).toThrow('More than one space is mortgaged: Mill Lane and Rose Lane.');
  expect(() => effect('the space that is mortgaged is not mortgaged', two, null, FLAGGED)).toThrow('More than one space is mortgaged: Mill Lane and Rose Lane.');
});
it('clears it on every space', () => {
  const flagged = [1, ROSE, LILY].reduce((s, at) => setSpaceFact(s, at, 'mortgaged', true), fresh(FLAGGED));
  const s = effect('no space is mortgaged', flagged, null, FLAGGED);
  expect([1, ROSE, LILY].map((at) => spaceFact(s, at, 'mortgaged'))).toEqual([false, false, false]);
});
```

In `board-phrases.test.ts`, add `describe('whether a space has an owner, or a detail')`. Use conditions about p0 on the fixture board: Go 0, Mill Lane 1, Rose Lane 5.
- **An owner.** `someone owns it` on Rose Lane is true when p1 owns it, true when p0 owns it, and false when nobody does.
- **A detail.** `it has no price` is true on Go and false on Mill Lane.
- **Needs.** `lib.get('condition', 'someone owns it')` matches `{ needsSpace: true, needsBoard: true }`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/player-facts.test.ts src/engine/core/lang/library/fact-phrases.test.ts src/engine/core/lang/library/board-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the three files, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/player-facts.ts src/engine/core/lang/library/fact-phrases.ts src/engine/core/lang/library/board-phrases.ts \
  src/engine/core/lang/library/player-facts.test.ts src/engine/core/lang/library/fact-phrases.test.ts src/engine/core/lang/library/board-phrases.test.ts
git commit -m "feat(lang): flags on every player at once, the one space with a flag, and whether a space has an owner or lacks a detail"
```

---

### Task 4: A phase that interrupts a turn and goes back to it, and turn order that skips players

**Files:**
- Modify: `src/engine/core/lang/board-state.ts` (`INTERRUPTED_KEY`, `InterruptedTurn`, `interruptedTurn`, `interruptTurn`, `resumeTurn`)
- Modify: `src/engine/core/lang/phrases.ts` (`PhraseOpts.entersPhase`, `Entry`, `add`, `get`)
- Modify: `src/engine/core/lang/library/flow-phrases.ts` (two effects, one turn phrase)
- Modify: `src/engine/core/lang/compile.ts` (`warnUnreachable`)
- Modify: `src/engine/core/lang/declared-actions.ts` (`apply`)
- Modify: `src/engine/core/lang/testing.ts` (new `INTERRUPT_BOARD`)
- Test: `src/engine/core/lang/board-state.test.ts`, `src/engine/core/lang/library/flow-phrases.test.ts`, `src/engine/core/lang/compile.test.ts`, `src/engine/core/lang/declared-actions.test.ts`

**Interfaces:**
- Consumes `every player is {playerflag}` and `no player is {playerflag}` (Task 3).
- **`board-state.ts`:**
  - `INTERRUPTED_KEY = 'lang:interrupted'`. Add it to the file's list of keys.
  - `export type InterruptedTurn = { phase: string | null; current: PlayerId; log: Json | null; rolls: Json | null }`. `log` and `rolls` are the `TURN_KEY` and `TURN_ROLLS_KEY` values verbatim, or null where the key was absent.
  - `interruptedTurn(state: GameState): InterruptedTurn | null`.
  - `interruptTurn(state: GameState, phase: string, next: PlayerId): GameState` does these, in order:
    - With a record already open, it throws RuleError `A turn is already interrupted; go back to it before interrupting another.`
    - With no `state.turn`, it throws RuleError `There is no turn to interrupt.`
    - It writes the record.
    - It sets `turn.phase` to `phase` and `turn.current` to `next`.
    - It applies `clearTurnLog`, so slice 3's "only the current seat has turn entries" still holds.
  - `resumeTurn(state: GameState): GameState`:
    - With no record, it throws RuleError `There is no interrupted turn to go back to.`
    - Otherwise it puts back `turn.current`, and `turn.phase` (a null phase means none).
    - It sets `TURN_KEY` and `TURN_ROLLS_KEY` to the recorded values, deleting a key that was null.
    - It deletes the record. It does not set `chosen`.
- **`phrases.ts`:** `PhraseOpts.entersPhase?: boolean`: the phrase's first argument is a phase the line enters. `get` returns it.
- **`flow-phrases.ts`:**
  - Effect `'the {phase} phase starts with the player on their left'` (needsPlayer, entersPhase) does these, in order:
    1. `interruptTurn(env.state, phase, nextIn(env.state, theyOf(env), env.seats))`.
    2. It runs that phase's `onEnter` refs one by one with `env.runLine(state, ref, { player: null, space: null, card: null })`.
    - `go to` runs a phase's start lines; this does the same. A phase with start lines and no `env.runLine` is a bug: throw `Error`.
  - Effect `'go back to the interrupted turn'` is `resumeTurn(env.state)`.
  - Turn `'the turn passes to the next player on the left who is {playerflag}'` gives the first seat left of `turn.current`, going round, that is still in and has the flag set. With none, it gives `turn.current`: the turn stays where it is, and the phase's own rules end it.
- **`compile.ts`:**
  - `warnUnreachable(phases: CompiledPhase[], elsewhere: PhraseRef[], library: PhraseLibrary, diagnostics: Diagnostic[]): void`. `elsewhere` is the Setup lines and every says cell's refs.
  - A phase is reached by another phase's `go to`, as now.
  - It is also reached by an effect that names it as the first argument of an `entersPhase` phrase. The effect may be a line of another phase (button, card move, `When` rule, moment rule, start line) or a line of `elsewhere`, and an `If …, …` line counts through its effect.
  - A phase's own lines never reach it.
- **`declared-actions.ts`:** `apply` clears the turn log only when `endsTurn(phase, move) && done.turn?.phase === phase.id`. So a `Go back …` inside a button the After line names keeps the turn it went back to.
- **`testing.ts`:** new `INTERRUPT_BOARD`, written as below.

```ts
/**
 * TINY_BOARD_HEAD with a vote that interrupts the turn. After rolling, a player may call one: the vote phase starts with the player
 * on their left, and its start line makes every player voting. Voters abstain in turn, the turn skipping players who are not
 * voting; once no player is, play goes back to the caller's turn. Closing the vote goes back at once, and the After line names it.
 * `Phase: vote` is line 32.
 */
export const INTERRUPT_BOARD = [
  TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  Players can be voting.'),
  '  A player may roll the dice.', '    Only if they have not rolled this turn.', '    Then:', '      Roll the dice.',
  '      Their piece moves forward by the roll.',
  '  A player may call a vote.', '    Only if they have rolled this turn.', '    Then:', '      The vote phase starts with the player on their left.',
  '  A player may end their turn.', '    Only if they have rolled this turn.',
  '  After a player ends their turn, the turn passes to the left.',
  '', 'Phase: vote', '  Hint: Abstain, or close the vote.', '  When this phase starts:', '    Every player is voting.',
  '  A player may abstain.', '    Only if they are voting.', '    Then:', '      They are not voting.',
  '  A player may close the vote.', '    Then:', '      No player is voting.', '      Go back to the interrupted turn.',
  '  When no player is voting:', '    Go back to the interrupted turn.',
  '  After a player abstains or closes the vote, the turn passes to the next player on the left who is voting.',
  '', 'End:', '  The game ends when one player is left.', '  That player wins.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**

In `board-state.test.ts`:

```ts
describe('an interrupted turn', () => {
  const before = recordAction(fixtureBoardState(), 'p0', 'call a vote');
  it('Review Focus: comes back exactly as it was: a key that was absent comes back absent, and presses made meanwhile are gone', () => {
    const during = interruptTurn(before, 'vote', 'p1');
    expect(during.turn).toEqual({ current: 'p1', phase: 'vote' });
    expect(during.data[TURN_KEY]).toEqual({});
    expect(interruptedTurn(during)).toEqual({ phase: 'playing', current: 'p0', log: { p0: ['call a vote'] }, rolls: null });
    const after = resumeTurn(recordRoll(recordAction(during, 'p1', 'abstain'), 'p1', [3, 4]));
    expect(after.turn).toEqual(before.turn);
    expect(after.data).toEqual(before.data);
    expect(after.data).not.toHaveProperty(TURN_ROLLS_KEY);
    expect(after.data).not.toHaveProperty(INTERRUPTED_KEY);
  });
  it('Review Focus: allows one at a time, and going back needs one', () => {
    expect(() => interruptTurn(interruptTurn(before, 'vote', 'p1'), 'vote', 'p0'))
      .toThrow('A turn is already interrupted; go back to it before interrupting another.');
    expect(() => resumeTurn(before)).toThrow('There is no interrupted turn to go back to.');
  });
});
```

In `library/flow-phrases.test.ts`, add `describe('a phase that interrupts the turn')`. It uses `const vote = compileGame(INTERRUPT_BOARD, lib).game!` and two helpers:
- `voting(players, arrange)` gives a `createEngine(vote, lib, players, …)` engine. Its state is `withBoardData(initialState(vote, 1), …)` with the turn at p0 in playing, after `arrange`.
- `press(engine, type, by)` expects `engine.dispatch({ type, by }).reason` to be undefined.

```ts
it('starts with the player on the left, runs its start lines, and goes back to the turn exactly, its log and rolls and all', () => {
  const engine = voting(3, (s) => queueRoll(s, [1, 2]));
  press(engine, 'roll the dice', 'p0');
  press(engine, 'call a vote', 'p0');
  let s = engine.getState();
  expect(s.turn).toEqual({ current: 'p1', phase: 'vote' });
  expect(['p0', 'p1', 'p2'].map((seat) => playerFact(s, seat, 'voting'))).toEqual([true, true, true]);
  expect([s.data[TURN_KEY], s.data[TURN_ROLLS_KEY]]).toEqual([{}, {}]);
  for (const seat of ['p1', 'p2', 'p0']) press(engine, 'abstain', seat);
  s = engine.getState();
  expect(s.turn).toEqual({ current: 'p0', phase: 'playing' });
  expect(s.data[TURN_KEY]).toEqual({ p0: ['roll the dice', 'call a vote'] });
  expect(s.data[TURN_ROLLS_KEY]).toEqual({ p0: [[1, 2]] });
  expect(engine.canDispatch({ type: 'end their turn', by: 'p0' })).toBe(true);
});
it('starts with the next player still in, and passes only to players still in', () => {
  const engine = voting(4, (s) => markOut(queueRoll(s, [1, 2]), 'p1'));
  press(engine, 'roll the dice', 'p0');
  press(engine, 'call a vote', 'p0');
  expect(engine.getState().turn!.current).toBe('p2');
  press(engine, 'abstain', 'p2');
  press(engine, 'abstain', 'p3');
  expect(engine.getState().turn!.current).toBe('p0');
});
```

Also add these:
- **The turn phrase.** Run `the turn passes to the next player on the left who is voting` through `runPhrase(lib, 'turn', …)` with seats p0–p3. The state's turn is at `current`, and the listed seats are voting:
  - at p0 with p2 and p3 voting, it gives `'p2'`;
  - at p3 with p1 and p2 voting and p1 out, it gives `'p2'`;
  - at p1 with only p1 voting, it gives `'p1'`;
  - at p1 with nobody voting, it gives `'p1'`.
- **Needs.** `lib.get('effect', 'the {phase} phase starts with the player on their left')` matches `{ needsPlayer: true, entersPhase: true }`.

In `declared-actions.test.ts`, add this test:
- **A button the After line names that goes back keeps the turn it went back to.**
  - On a two-player `INTERRUPT_BOARD` engine with `[1, 2]` queued: p0 rolls, calls a vote, and p1 closes the vote.
  - The turn is then `{ current: 'p0', phase: 'playing' }`, and `TURN_KEY` is `{ p0: ['roll the dice', 'call a vote'] }`.

In `compile.test.ts`, add `describe('phases a line starts')`:
- `compileGame(INTERRUPT_BOARD, lib).diagnostics` is `[]`.
- Without the start line, the vote phase is unreachable. Replace `'      The vote phase starts with the player on their left.'` with `'      They get 5 money.'`. `messages(…)` is then `[[32, 'Nothing leads to the phase “vote”.']]`.
- A phase's own line does not count. On the text without the start line (above), also add `      The vote phase starts with the player on their left.` as the last line of `close the vote`'s `Then:`. The same warning comes back.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/board-state.test.ts src/engine/core/lang/library/flow-phrases.test.ts src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/compile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the four files, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/board-state.ts src/engine/core/lang/phrases.ts src/engine/core/lang/library/flow-phrases.ts \
  src/engine/core/lang/compile.ts src/engine/core/lang/declared-actions.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/board-state.test.ts src/engine/core/lang/library/flow-phrases.test.ts src/engine/core/lang/declared-actions.test.ts \
  src/engine/core/lang/compile.test.ts
git commit -m "feat(lang): a phase that interrupts the turn and goes back to it exactly, and a turn order that skips players"
```

---

### Task 5: Rent Day, slice 6

**Files:**
- Modify: `src/games/rent-day.rules`
- Modify: `src/games/rent-day.test.ts`
- Modify: `src/pages/designer/playtest.test.tsx` (the one test whose p0 ends a turn on a space nobody owns) and `src/pages/designer/designer-page.test.tsx` (the example count)

**Interfaces:**
- Consumes every phrase above, `gameNumber` (Task 1), `nextIn`, and slice 5's auto-player (`make`, the debt settling, `debtors`, `accepted`).
- **New move types and labels:**
  - `'auction the space they are on'`, labelled `Auction the space you are on`;
  - `'bid an amount'`, labelled `Bid`, which carries an amount;
  - `'drop out'`, labelled `Drop out`.
- **Board numbers:**
  - Go 0, Income Tax 4 (tax 200, no price), Ash Street 6 (price 100, rent 6);
  - Cedar Avenue 9, Rose Lane 16 (price 180).
  - Everyone starts with 1500.

- [ ] **Step 1: Board.** Add these four lines under `Board:`, right after `  Players can have jail turns.`:

```text
  Spaces can be up for auction.
  Players can be bidding.
  Players can be the high bidder.
  The game has a high bid of 0.
```

- [ ] **Step 2: The playing phase.**
  - **Roll the dice.** Right after its `Only if one of:` block (ending `      they rolled a double`), add the block below. Then add `      No space is up for auction.` as the first line under its `Then:`.

```text
    Only if one of:
      they have not rolled this turn
      it has no price
      someone owns it
      it is up for auction
```

  - **Auction.** Add the block below right after the buy block (after `      They own it.`).

```text
  A player may auction the space they are on.
    Only if no player has less than 0 money.
    Only if they have rolled this turn.
    Only if it has a price.
    Only if no one owns it.
    Only if it is not up for auction.
    Then:
      It is up for auction.
      Every player is bidding.
      The high bid is 0.
      The auction phase starts with the player on their left.
```

  - **End their turn.** Right after `      they have rolled for a double this turn`, add the lines below. They go before slice 5's `Any player may …` buttons.
    - The new group comes after the doubles group, so `you cannot end your turn on a double` keeps its reason.

```text
    Only if one of:
      it has no price
      someone owns it
      it is up for auction
    Then:
      No space is up for auction.
```

- [ ] **Step 3: The auction phase.**
  - Add the phase below after the playing phase's After line, before `End:`. It must come after playing: the game starts in the first phase written.
  - It has no `Players take turns.` line. The phase's default actor is the current player, and its After line sets the order.

```text
Phase: auction
  Hint: Bid more than the high bid, or drop out.
  A player may bid an amount.
    Only if they are bidding.
    Only if the amount is more than the high bid.
    Only if they have at least the amount in money.
    Then:
      The high bid is the amount.
      No player is the high bidder.
      They are the high bidder.
  A player may drop out.
    Only if they are bidding.
    Only if they are not the high bidder.
    Then:
      They are not bidding.
  When a player is the high bidder:
    Only if no other player is bidding.
    They pay the high bid.
    They own the space that is up for auction.
    They are not the high bidder.
    They are not bidding.
    The space that is up for auction is not up for auction.
    The high bid is 0.
    Go back to the interrupted turn.
  When no player is bidding:
    The high bid is 0.
    Go back to the interrupted turn.
  After a player bids or drops out, the turn passes to the next player on the left who is bidding.
```

- [ ] **Step 4: Change the two earlier examples** that a turn can no longer end on, or roll past, an unbought space:
  - In `Example: the turn passes to the left, skipping players who are out`, change `  And the next roll is 1 and 2` to `  And the next roll is 1 and 3`. The roll lands on Income Tax, which has no price, instead of Ferry Row, which nobody owns.
  - In `Example: a double rolls again`, add `  And p1 owns Ash Street` right after `  Given p0 is on Go`.
    - The spec's Q8 missed this one: its second roll is now refused while Ash Street is unbought.
    - p0 now pays Ash Street's rent of 6 on the way, which the example does not check.
  - Every other example keeps passing unchanged. In particular:
    - `you cannot roll twice in one turn`, `you cannot end your turn on a double` and `leaving jail by a double does not roll again` keep their reasons, because the new groups come last;
    - `a double that lands on Go To Jail still ends the turn` ends on Jail, which has no price;
    - `a debt must be paid before the turn can end` ends on Rose Lane, which p1 owns.
- [ ] **Step 5: Append these 12 examples** after the existing 70, for 82 in all. The last one is the Review Focus case.

```text
Example: declining to buy starts an auction
  Given p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  And p0 auctions the space they are on
  Then it is accepted
  And the phase is auction
  And it is p1's turn
  And Rose Lane is up for auction
  And p0 is bidding
  And p1 is bidding

Example: you cannot end your turn with the space unbought
  Given p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  And p0 ends their turn
  Then it is rejected because "it has no price or someone owns it or it is up for auction"

Example: a bid must beat the high bid
  Given p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  And p0 auctions the space they are on
  And p1 bids 0
  Then it is rejected because "the amount is more than the high bid"
  When p1 bids 50
  Then it is accepted
  And the high bid is 50
  And p1 is the high bidder
  And it is p0's turn

Example: you cannot bid more than you have
  Given p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  And p0 auctions the space they are on
  And p1 bids 1600
  Then it is rejected because "they have at least the amount in money"

Example: the last bidder wins and pays
  Given p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  And p0 auctions the space they are on
  And p1 bids 50
  And p0 drops out
  Then it is accepted
  And p1 owns Rose Lane
  And p1 has 1450 money
  And p0 has 1500 money
  And the phase is playing
  And it is p0's turn
  And the high bid is 0
  And p1 is not the high bidder
  And Rose Lane is not up for auction
  When p0 ends their turn
  Then it is accepted
  And it is p1's turn

Example: nobody bids
  Given p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  And p0 auctions the space they are on
  And p1 drops out
  And p0 drops out
  Then it is accepted
  And no one owns Rose Lane
  And the phase is playing
  And it is p0's turn
  And Rose Lane is up for auction
  When p0 ends their turn
  Then it is accepted
  And it is p1's turn
  And Rose Lane is not up for auction

Example: you cannot auction a space twice
  Given p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  And p0 auctions the space they are on
  And p1 drops out
  And p0 drops out
  And p0 auctions the space they are on
  Then it is rejected because "it is not up for auction"

Example: a double cannot roll past an unbought space
  Given p0 is on Go
  And the next roll is 3 and 3
  And the roll after that is 1 and 2
  When p0 rolls the dice
  And p0 rolls the dice
  Then it is rejected because "they have not rolled this turn or it has no price or someone owns it or it is up for auction"
  When p0 buys the space they are on
  And p0 rolls the dice
  Then it is accepted
  And p0 owns Ash Street
  And p0 is on Cedar Avenue

Example: the lander's turn resumes as it was
  Given p0 is on Go
  And the next roll is 3 and 3
  And the roll after that is 1 and 2
  When p0 rolls the dice
  And p0 auctions the space they are on
  And p1 bids 50
  And p0 drops out
  Then p1 owns Ash Street
  And it is p0's turn
  When p0 rolls the dice
  Then it is accepted
  And p0 is on Cedar Avenue

Example: the high bidder cannot drop out
  Given the phase is auction
  And p0 is bidding
  And p1 is bidding
  And p1 is the high bidder
  And it is p1's turn
  When p1 drops out
  Then it is rejected because "they are not the high bidder"

Example: the turn in an auction skips a player who dropped out
  Given 3 players
  And p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  And p0 auctions the space they are on
  And p1 drops out
  And p2 bids 50
  And p0 bids 60
  Then it is accepted
  And it is p2's turn
  And the high bid is 60
  And p1 is not bidding

Example: the last one bidding wins with their own bid
  Given 3 players
  And p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  And p0 auctions the space they are on
  And p1 drops out
  And p2 drops out
  And p0 bids 10
  Then it is accepted
  And p0 owns Rose Lane
  And p0 has 1490 money
  And the phase is playing
  And it is p0's turn
```

How each number comes from the board:
- 3 + 4 from Cedar Avenue (9) lands on Rose Lane (16), whose price is 180. No Go is passed.
- 3 + 3 from Go lands on Ash Street (6), whose price is 100. The roll after that, 1 + 2, then reaches Cedar Avenue (9).
- 1 + 3 from Go lands on Income Tax (4), which has no price.
- Everyone starts with 1500:
  - p1's bid of 1600 is more than they have;
  - a winning bid of 50 leaves 1450, and one of 10 leaves 1490.
- In the high-bidder example, p0 is also bidding, so `When a player is the high bidder:` does not fire on the Given lines. It would otherwise go back to a turn that was never interrupted.
- The auction starts with the player on the lander's left: p1, with 2 or 3 players. After p1 drops out, the turn skips them:
  - in the 3-player skip example: p2, then p0, then p2;
  - in the last example: p2, then p0.

- [ ] **Step 6: Extend `rent-day.test.ts`.**
  - **Examples:** `results` has length 82, and all pass.
  - **Constants:**
    - `AUCTION = 'auction the space they are on'`, `BID = 'bid an amount'`, `DROP = 'drop out'`;
    - `AUCTION_PHASE = 'auction'`, `UP = 'up for auction'`, `BIDDING = 'bidding'`, `HIGH_BIDDER = 'the high bidder'`, `HIGH_BID = 'high bid'`;
    - `RAISE = 10`, `KEEP = 200`.
  - **Helpers:**
    - `isUp(state, space)`, `isBidding(state, seat)`, `isHighBidder(state, seat)`;
    - `highBid(state)` is `gameNumber(state, game!, HIGH_BID)`;
    - `upForAuction(state): number[]` lists the spaces up for auction, in board order;
    - `nextBidder(state, from, seats)` is the first seat left of `from`, going round, that is still in and bidding, else `from`.
  - **The auto-player (`playTurn`).**
    - **`make`'s failure message** names `move.by`, not the turn's player: auction moves come from other seats.
    - **The lander.** `rollWith` makes the roll and then does one of these:
      - if `may(BUY)`, it buys;
      - else if `may(AUCTION)`, it makes `AUCTION` and then plays the auction (below).
    - **Playing the auction.** While the game is not over and the phase is `AUCTION_PHASE`, the current seat acts:
      - with `price` the price of `upForAuction(state)[0]` and `next = highBid + RAISE`:
        - it makes `{ type: BID, by, amount: next }` when `highBid < price` and its money less `next` is at least `KEEP`;
        - otherwise it makes `DROP`.
      - Each bid raises the high bid by 10, up to the price (every price is a multiple of 10), and each drop removes a bidder, so this always ends.
      - The auction is played inside the lander's turn, so a turn is still one `playTurn` call and the caps below keep their meaning.
    - **After the auction,** the turn is the lander's again: `stillTheirs()` holds. A double rolls again through the same loop, and the turn ends as before.
    - Update `playTurn`'s doc comment to say all this.
  - **`keepsTheRules`.** It keeps `open: { lander, at, log, rolls } | null` between moves.
    - **AUCTION**, with `at = pieceAt(before, by)`:
      - before: the space has a price and no owner, is not up for auction, and the phase is playing;
      - after: the phase is auction, `upForAuction(after)` is `[at]`, every seat still in is bidding and none is the high bidder, `highBid` is 0, and `turn.current` is `nextIn(before, by, seats)`;
      - `moneyMoves(before, after, {}, …)`;
      - `open = { lander: by, at, log: [...(before's TURN_KEY entry for by), AUCTION], rolls: before.data[TURN_ROLLS_KEY] ?? null }`.
    - **BID**:
      - before: the phase is auction, `by` is the current seat and is bidding, and `move.amount` is a whole number above `highBid(before)` and at most `by`'s money.
      - If the phase is still auction after: `highBid(after)` is the amount, `by` is the only high bidder, and no money moved.
      - Otherwise: `by` owns `open.at`, and `moneyMoves(…, { [by]: -amount }, …)`.
    - **DROP**:
      - before: the phase is auction, and `by` is the current seat, bidding, and not the high bidder.
      - If the phase is still auction after: `by` is not bidding, and no money moved.
      - Otherwise, with `w` the high bidder before (or null):
        - a `w` owns `open.at` and paid `highBid(before)`;
        - with no `w`, nobody owns it, no money moved, and it is still up for auction.
    - **Whenever an auction ends** (the phase goes from auction to playing):
      - `turn.current` is `open.lander`;
      - `after.data[TURN_KEY]` is `{ [lander]: open.log }`, and `after.data[TURN_ROLLS_KEY] ?? null` equals `open.rolls`;
      - `highBid` is 0, and no seat is bidding or the high bidder;
      - `isUp(after, open.at)` is `ownerOf(after, open.at) === null`.
      - Then set `open = null`.
    - **After every move:**
      - the phase is auction exactly while some seat still in is bidding;
      - `upForAuction(after)` has at most one space;
      - while the phase is playing, `highBid` is 0.
    - **The turn (Q7).** Slice 5's check widens. When `after.turn.current` differs from `before.turn.current`, one of these holds:
      - the move was GIVE_UP by the seat whose turn it was;
      - it was END and `debtors(before, seats)` was `[]`;
      - it was AUCTION and `after.turn.current` is `nextIn(before, by, seats)`;
      - it was BID or DROP in the auction phase, and `after.turn.current` is `nextBidder(after, by, seats)` while the auction goes on, or `open.lander` once it has ended.
    - **The money branch.** AUCTION, BID and DROP are handled above, before the final `expect(change).toBe(0)` branch.
    - The houses, hotels, cards, jail, debts, mortgages and turn-log checks stay. An auction's bids and drop-outs are logged and cleared within the auction, so "only the current seat has turn entries" holds throughout.
  - **2-player ending.**
    - It stays: at least 9 of seeds 1 to 10 reach a winner within 3000 turns.
    - Next to the jail and raising tallies, add `auctions`: `'won'` and `'nobody bid'`, counted when an auction ends. Both must be above 0.
    - If one stays at 0, print the tallies and find out why before changing anything. If it is only chance, count it over the full-set runs as well: a counter shared by the `describe`, checked in a last `it`. Say so in the commit.
  - **4 and 8 players with full sets:**
    - These are unchanged: seeds 1, 2 and 3 within 5000 turns, a hotel built, and someone going out holding buildings.
    - If a seed doesn't finish, try the next seed and say so in the commit. Don't raise the cap past 20000.
  - **The lean variant and undo:** unchanged. They now play through the auctioning auto-player.
- [ ] **Step 7: The page tests that read Rent Day.**
  - In `playtest.test.tsx`, the test `stops picking when the button can no longer be pressed, and does not start again by itself`:
    - p0's first roll there is 4 and 2, onto Ash Street, which nobody owns, so p0 could no longer end the turn.
    - Its `brown` fixture also gives p1 Ash Street: `['Mill Lane', 'Ferry Row', 'Ash Street']`.
    - Add a comment saying why. If the roll is not 4 and 2, give p1 the space p0 does land on.
  - In `designer-page.test.tsx`, expect `82 of 82 examples pass`, and the test name says 82.
- [ ] **Step 8: Run** `bunx vitest run src/games/rent-day.test.ts src/pages/designer`.
  - Fix any failure in the phrases, not in the example numbers: the numbers come from the board above.
  - Then run `bun run test` and `bun run typecheck`.
- [ ] **Step 9: Commit**

```bash
git add src/games/rent-day.rules src/games/rent-day.test.ts src/pages/designer/playtest.test.tsx src/pages/designer/designer-page.test.tsx
git commit -m "feat(games): Rent Day slice 6: a space the lander does not buy is auctioned, and a double no longer rolls past an unbought space"
```

---

### Task 6: The playtest shows the amount box, the game's numbers and the auction's turns; README

**Files:**
- Modify: `src/engine/core/lang/board-view.ts` (`BoardView.interrupted`), `src/pages/designer/board-controls.tsx`, `src/pages/designer/playtest.tsx`, `src/pages/designer/seat-status.ts`, `README.md`
- Test: `src/pages/designer/board-parts.test.tsx`, `src/pages/designer/playtest.test.tsx`, `src/pages/designer/seat-status.test.ts`

**Interfaces:**
- Consumes `BoardView.gameNumbers` (Task 1) and `ActionView.amount` (Task 2).
- **`MoneyLine`.** Under the seat entries, one line holds what the bank has left and then the game's numbers that are set, joined by ` · `. Each number is written as its name and its value, with `toLocaleString('en-US')`:
  - with a bank: `bank: 32 houses, 12 hotels · high bid 120`;
  - with no bank: `pot 5`;
  - with neither, there is no line.
- **`ActionButtons`.**
  - `onPress(move: string, amount?: number | null): void`. A button without an amount calls `onPress(move)`, as today.
  - An action with `amount: true` gets a number box (`<input type="number" min="0" step="1">`) right before its button.
    - The box's `aria-label` is `` `${label} amount` ``, for example "Bid amount".
    - The box is disabled while the button is greyed.
    - Pressing the button calls `onPress(move, n)`. `n` is `Number(text)` for a box that is not blank; for a blank box it is null.
    - The box keeps what was typed.
  - The look is the builder's.
- **`playtest.tsx`.**
  - `press` sends `{ type: move, amount }` when `amount` is a number, and `{ type: move }` otherwise.
  - A refused amount comes back as a rejection, which already flashes under the seat's status.
- **`BoardView.interrupted: boolean`** (`board-view.ts`) is true while `lang:interrupted` holds a record. `readSeatExtras` requires it to be a boolean. The hand-built boards in `board-view.test.ts`, `board-parts.test.tsx` (`board()`) and `seat-status.test.ts` (`boardExtras`) gain `interrupted: false`.
- **`seatStatus`.**
  - When the seat's board says `interrupted` and the view's phase has a hint, the status starts with `` `${phase.id} — ` ``, and the rest keeps its form:
    - `auction — Your turn — <hint>`;
    - `auction — <hint> — waiting for p1`.
  - A phase without a hint already shows its name, so it gets no prefix.
  - A game with no board (Hearts, Color Match) never gets the prefix.
- No page code names a game number, a phase or a flag.

- [ ] **Step 1: Write the failing tests.**

In `board-parts.test.tsx`:

```ts
describe("game numbers and buttons that carry an amount", () => {
  const raise = { move: 'raise an amount', label: 'Raise', allowed: true as const, target: null, amount: true };
  it('puts the game numbers that are set after the bank, and alone when there is no bank', () => {
    render(<MoneyLine board={board({ bank: [{ name: 'houses', count: 32 }], gameNumbers: [{ name: 'pot', value: 1200 }] })} />);
    expect(screen.getByText('bank: 32 houses · pot 1,200')).toBeTruthy();
    render(<MoneyLine board={board({ gameNumbers: [{ name: 'tally', value: 5 }] })} />);
    expect(screen.getByText('tally 5')).toBeTruthy();
  });
  it('gives an amount button a number box and sends the number typed in it', () => {
    const onPress = vi.fn();
    render(<ActionButtons actions={[raise]} onPress={onPress} onPick={vi.fn()} onRefused={vi.fn()} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Raise amount' }), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Raise' }));
    expect(onPress).toHaveBeenLastCalledWith('raise an amount', 50);
  });
  it('Review Focus: sends no amount from an empty box', () => {
    const onPress = vi.fn();
    render(<ActionButtons actions={[raise]} onPress={onPress} onPick={vi.fn()} onRefused={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Raise' }));
    expect(onPress).toHaveBeenLastCalledWith('raise an amount', null);
  });
});
```

Also add these:
- **Greyed.** With `allowed: 'they have rolled this turn'`, the box is disabled. Pressing the button calls `onRefused` with that reason and not `onPress`.
- **No amount, no box.** A button with `amount: false` has no `spinbutton`.

In `seat-status.test.ts`:
- **The phase's name while interrupted.** A board seat view (the existing `boardExtras` fixture) with `interrupted: true`, in a phase with a hint:
  - for the seat whose turn it is: `` `${phase} — Your turn — ${hint}` ``;
  - for another seat: `` `${phase} — ${hint} — waiting for p1` ``.
- **Not interrupted, no prefix.** The same view with `interrupted: false` gives today's status, unchanged.
- **Hearts unchanged.** Hearts in `playing`, for p0: `'Your turn — Drag a card to the center.'` (no board, no prefix).
- **No hint, no prefix.** An interrupted board view in a phase with no hint: `'Your turn — <phase>'`.

In `playtest.test.tsx` (import `placePiece` and `queueRoll` as already done):

```ts
describe('Playtest: an auction', () => {
  const start = { ...withBoardData(initialState(rentDay, SEED), rentDay, ['p0', 'p1', 'p2']), turn: { current: 'p0', phase: 'playing' } };
  // p0 on Cedar Avenue rolls 3 and 4 onto Rose Lane, which nobody owns.
  const landing = queueRoll(placePiece(start, 'p0', 9), [3, 4]);
  const named = (name: string) => screen.getAllByRole('button', { name });
  const boxes = () => screen.getAllByRole('spinbutton', { name: 'Bid amount' });
  const HINT = 'Bid more than the high bid, or drop out.';
  const auction = () => {
    mountRentDay({ initial: landing });
    fireEvent.click(rollButtons()[0]);
    fireEvent.click(named('Auction the space you are on')[0]);
  };

  it('gives every seat the box, names the auction and whose turn it is, and shows the high bid on every bank line', () => {
    auction();
    expect(screen.getByText(`seat: p1 — auction — Your turn — ${HINT}`)).toBeTruthy();
    expect(screen.getByText(`seat: p0 — auction — ${HINT} — waiting for p1`)).toBeTruthy();
    expect(boxes()).toHaveLength(3);
    expect(named('Bid')[1].getAttribute('aria-disabled')).toBe('false');
    expect(named('Bid')[0].getAttribute('title')).toBe("It's p1's turn.");
    fireEvent.change(boxes()[1], { target: { value: '120' } });
    fireEvent.click(named('Bid')[1]);
    expect(screen.getAllByText('bank: 32 houses, 12 hotels · high bid 120')).toHaveLength(3);
    expect(screen.getByText(`seat: p2 — auction — Your turn — ${HINT}`)).toBeTruthy();
  });
  it('Review Focus: sends no amount from an empty box, and flashes why an amount is refused', () => {
    auction();
    const sent = vi.spyOn(GameServer.prototype, 'submit');
    fireEvent.click(named('Bid')[1]);
    expect(sent).toHaveBeenLastCalledWith('p1', { type: 'bid an amount' });
    expect(screen.getByText('Say how much to bid.')).toBeTruthy();
    fireEvent.change(boxes()[1], { target: { value: '0' } });
    fireEvent.click(named('Bid')[1]);
    expect(sent).toHaveBeenLastCalledWith('p1', { type: 'bid an amount', amount: 0 });
    expect(screen.getByText('the amount is more than the high bid')).toBeTruthy();
  });
  it("goes back to the lander's turn once someone wins, and the high bid leaves the bank line", () => {
    auction();
    fireEvent.change(boxes()[1], { target: { value: '50' } });
    fireEvent.click(named('Bid')[1]);
    fireEvent.click(named('Drop out')[2]);
    fireEvent.click(named('Drop out')[0]);
    expect(screen.getAllByText('p1 1,450 money')).toHaveLength(3);
    expect(screen.getAllByText('bank: 32 houses, 12 hotels')).toHaveLength(3);
    expect(screen.getByText('seat: p0 — Your turn — Roll the dice, then buy, build, or end your turn. A double rolls again.')).toBeTruthy();
    expect(named('End your turn')[0].getAttribute('aria-disabled')).toBe('false');
  });
});
```

- [ ] **Step 2: Run** `bunx vitest run src/pages/designer`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Check it in the browser.**
  - Run `bun run dev`, open `/#designer`, load Rent Day and press Play with 2 players.
  - Write a throwaway Playwright script (Playwright is installed globally, Chromium in `/opt/pw-browsers`) in your own scratchpad directory, never in the repo.
  - **Getting to an auction.** Each turn, the current seat presses its enabled `Roll the dice` (again while it stays enabled). If `Auction the space you are on` is enabled, it presses that; otherwise it presses `End your turn`.
  - **Bidding.** Once the auction is on:
    - check that both status lines start `seat: pN — auction — ` and name whose turn it is;
    - type 50 in the current bidder's `Bid amount` box and press its `Bid`;
    - check that both bank lines end `· high bid 50`.
  - **Ending it.** The other seat presses `Drop out`. Check that the bank lines lose the high bid and the winner's money line is 50 lower.
  - Take a screenshot during the auction and look at it:
    - the box sits with its button and reads cleanly next to the other buttons;
    - the space up for auction is striped on both boards (slice 5's stripes);
    - the high bid is legible on the bank line.
- [ ] **Step 5: Run** `bunx vitest run src/pages/designer`, then `bun run test` and `bun run typecheck`. Then run the four checks below:
  - the first prints only the `library/index.ts` import of `./rent-day`;
  - the second and third print nothing;
  - the fourth prints only `refs.ts`'s irregular participle line (`bid: 'bid'`).

```bash
grep -rniE '\b(jail|rent|houses?|hotels?|streets?|stations?|utilit(y|ies)|money|mortgage[ds]?|bankrupt(cy)?)\b' src/engine/core/lang --include=*.ts | grep -v '\.test\.ts' | grep -v 'library/rent-day.ts' | grep -v 'lang/testing.ts'
grep -rniE '\b(chance|treasury|mortgage[ds]?|bankrupt(cy)?)\b|get out of jail free' src/engine src/pages --include=*.ts --include=*.tsx | grep -v '\.test\.' | grep -v 'lang/testing.ts' | grep -v 'library/rent-day.ts'
grep -rniwE 'jail|mortgaged' src/pages/designer | grep -v '\.test\.'
grep -rniE '\b(auction(s|ed)?|bid(s|der|ders|ding)?|high bid)\b' src/engine src/pages --include=*.ts --include=*.tsx | grep -v '\.test\.' | grep -v 'lang/testing.ts'
```

- [ ] **Step 6: Update the README.**
  - Under *Designing a game*, change "with 70 examples" to "with 82 examples".
  - After the **Raising money.** paragraph, add an **Auctions.** paragraph covering these points:
    - **Amount buttons.**
      - A button whose wording ends in "an amount" (`A player may bid an amount.`) carries a whole number of 0 or more. It is labelled without those words ("Bid"), and the playtest gives it a number box.
      - "the amount" reads it: `the amount is more than the high bid`, `they have at least the amount in money`, `The high bid is the amount.` Such a line anywhere else is reported.
      - A missing or bad amount is refused with "Say how much to bid.". The button is live before anything is typed, judged by its other lines.
      - Examples say `When p1 bids 50`.
    - **Game numbers.**
      - `The game has a high bid of 0.` declares a number that belongs to the game and says where it starts.
      - Rules: `The high bid is 0.`, `They pay the high bid.` Examples: `the high bid is 50`.
      - The playtest shows the game's numbers that aren't 0 on the bank line.
    - **Everyone's flags.**
      - `Every player is bidding.`, `No player is the high bidder.`, `no player is bidding` and `no other player is bidding`.
      - Players who are out never count.
    - **The flagged space.**
      - `They own the space that is up for auction.`, `The space that is up for auction is not up for auction.`, `No space is up for auction.`
      - Two such spaces at once is an error.
      - Also `someone owns it` and `it has no price`.
    - **Interrupting a turn.**
      - `The auction phase starts with the player on their left.` keeps the turn: its phase, whose turn, what they did and what they rolled. It runs the phase's start lines.
      - `Go back to the interrupted turn.` restores all of it exactly. One turn at a time can be interrupted.
      - `the turn passes to the next player on the left who is bidding` skips players who are out or not bidding.
      - A phase entered this way is not reported as unreachable.
    - **In the playtest,** the seat status names a phase that isn't the first (`auction — Your turn — …`), and the high bid shows on the bank line.
    - **Rent Day** auctions a space the lander doesn't buy. A turn can't end, and a double can't roll on, while the space is unbought and not yet auctioned.
  - In the roadmap, mark slice 6 shipped:
    - change "…, slice 4 (…) and slice 5 (…) have shipped" to "…, slice 4 (…), slice 5 (…) and slice 6 (…) have shipped";
    - the new entry reads "slice 6 (auctions: buttons that carry an amount, numbers that belong to the game, flags on every player at once, a phase that interrupts a turn and goes back to it, and turn order that skips players)".
- [ ] **Step 7: Commit**

```bash
git add src/engine/core/lang/board-view.ts src/engine/core/lang/board-view.test.ts \
  src/pages/designer/board-controls.tsx src/pages/designer/playtest.tsx src/pages/designer/seat-status.ts \
  src/pages/designer/board-parts.test.tsx src/pages/designer/playtest.test.tsx src/pages/designer/seat-status.test.ts README.md
git commit -m "feat(designer): a number box for buttons that carry an amount, game numbers on the bank line, and the phase in the seat status; docs: README"
```
