# Board Games Slice 2 (Sets and Buildings) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rent Day gains its economy (full sets, houses and hotels built by picking a street, a limited bank, rent that grows with buildings), and cards gain facts that change during play, proven by a small card game, Venom.

**Architecture:**
- **Language layer only.** All new work is in the language (`src/engine/core/lang/`), plus views and the designer page. Core `game-state.ts`, `flow.ts` and `game-engine.ts` stay untouched.
- **Where facts live.** Facts on spaces (and later players), plus the bank's numbers, are kept in `GameState.data` under `lang:*` keys. Facts on cards are kept in the card's own `data`, next to its table attributes, so they travel with the card and view projection already hides them on cards a seat can't see.
- **New phrase kinds.**
  - `declare`: fact declarations.
  - `column`: definitions in a section named after a table column, such as `Rent:`.
  - `target`: what a button may be pointed at.
  - `which`: rules about each card they match.
- **Monopoly-specific phrases** go in `library/rent-day.ts`.
- **Buttons are identified by their whole wording,** which becomes their move type.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19. Pixi only through the existing text card face.

**Spec:** `docs/superpowers/specs/2026-10-15-board-slice-2-sets-and-buildings-design.md` (part of `docs/superpowers/specs/2026-10-15-board-games-overview-design.md`).

## Global Constraints

- **Branch and commands.** Work on `claude/peaceful-curie-rdfkow`. Single test file: `bunx vitest run <path>`. Full suite: `bun run test` (1215 tests pass at the start). Types: `bun run typecheck`.
- **No new dependencies.**
- **Pure core.** `src/engine/core/**` stays pure: no pixi, react or DOM imports, no `Math.random` or `Date.now`.
- **Files not to touch:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, and `src/pages/hearts-demo/**`.
- **Json shapes.** Everything in `CompiledGame` and every `lang:*` value is `Json`. Declare these shapes with `type` aliases, and use `null` (never `undefined`) inside them.
- **No Monopoly words in shared code.** The words rent, house, hotel, street, station, utility, money and jail must not appear in engine or language code outside `src/engine/core/lang/library/rent-day.ts`. They may appear in tests, test fixtures (`lang/testing.ts`), and `src/games/*.rules`.
- **No engine words in front of designers.** Diagnostics, rejection reasons, example results and the page never show engine vocabulary (`FlowDef`, `NamedRef`, `zoneId`, `lang:`) or stack traces.
- **Existing behaviour stays.** Hearts, Color Match and Rent Day's 16 slice-1 examples keep compiling with no diagnostics and passing. Slice 1's move types change from verbs to whole wordings (Task 1); every test that names them is updated there.
- **Style and commits.** 2-space indent, single quotes, chainable registrars, and comments that say why. Commit prefixes: `feat(lang):`, `fix(lang):`, `feat(net):`, `feat(games):`, `feat(designer):`, `docs:`. TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.

## Review Focus

- **A fact declared with the same name as a table column** (`Spaces can have a price.`) is an error on the declaration line, never a silent pick between the two. Test in Task 4.
- **A targeted move with no target, an out-of-range target, or a target the phrase doesn't allow** (a hand-made move, a second click after the board changed) is refused with a sentence, never a crash. Test in Task 7.
- **A build button with nothing to pick is greyed,** with a sentence such as "There is no street you own.", and picking mode never opens. Tests in Task 9 and Task 12.
- **A hidden card's facts** ("poisoned" on a card in another player's hand) never reach a seat that can't see the card: neither in `data` nor in its face key. Test in Task 8.
- **Houses and hotels are never created or lost.** Houses on the board plus the bank's houses always total 32 (hotels: 12), including when a player goes out or a hotel replaces four houses. Test in Task 10.

---

### Task 1: Buttons are identified by their whole wording

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`CompiledPhase.after`)
- Modify: `src/engine/core/lang/compile-phase.ts` (duplicate check, After names)
- Modify: `src/engine/core/lang/refs.ts` (`{action}` and `{done}` resolve to wordings)
- Modify: `src/engine/core/lang/build.ts`, `src/engine/core/lang/declared-actions.ts`, `src/engine/core/lang/board-state.ts` (parameter names), `src/engine/core/lang/board-view.ts`, `src/engine/core/lang/library/board-phrases.ts`
- Modify: `src/pages/designer/board-controls.tsx`, `src/pages/designer/playtest.tsx`
- Test: `src/engine/core/lang/compile-phase.test.ts`, `src/engine/core/lang/declared-actions.test.ts`, and every test that dispatches `roll`, `buy` or `end` (`src/games/rent-day.test.ts`, `src/engine/core/lang/board-view.test.ts`, `src/engine/core/lang/runtime.test.ts`, `src/pages/designer/*.test.tsx` and any other a grep finds)

**Interfaces:**
- **Move types.** A button's move type is its `DeclaredAction.words`, the full lowercase wording, for example `'roll the dice'`. Card moves keep their verb (`'play'`).
- **`CompiledPhase.after`** becomes `{ moves: string[]; next: PhraseRef; line: number } | null`. `moves` holds the move types the After line names. The field `verbs` is renamed.
- **Same-phase check.** It compares wordings. "build a house" and "build a hotel" may both exist. The message for two equal wordings stays `sameVerb`-style: `Two rules in this phase say “A player may ${words}”.`
- **Cross-phase check.** The card-move versus button check in `VerbUses` still compares first words, unchanged.
- **Naming a button in an After line:**
  - Its whole third-person wording (`ends their turn`) always names it.
  - Its bare verb (`ends`) names it only when exactly one button in the phase has that verb.
  - Otherwise the bare verb is an error: `“builds” could be “build a house” or “build a hotel”; write the whole wording.`
- **`{action}` and `{done}`.**
  - `{action}` resolves to the wording.
  - `{done}` resolves `participle(verb)` to the wording when exactly one button has that verb. Otherwise it gives `{ error: '“built” could mean “build a house” or “build a hotel”.' }`.
- **Turn memory.** `didThisTurn(state, seat, move)`, `recordAction(state, seat, move)` and `endsTurn(phase, move)` take the move type. Only the parameter names change.
- **Seat view.** `ActionView` renames `verb` to `move`, the move type to send. `readSeatExtras` checks `move`, and the page sends `{ type: action.move }`.

- [ ] **Step 1: Write the failing tests.** In `compile-phase.test.ts`, using `TINY_BOARD_HEAD` from `lang/testing.ts`:

```ts
it('lets two buttons share a first word', () => {
  const { game, diagnostics } = phase(['A player may build a house.', 'A player may build a hotel.']);
  expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(game!.phases[0].actions.map((a) => a.words)).toEqual(['build a house', 'build a hotel']);
});
it('needs the whole wording in an After line when a verb is shared', () => {
  const { diagnostics } = phase(['A player may build a house.', 'A player may build a hotel.', 'After a player builds, the turn passes to the left.']);
  expect(diagnostics).toContainEqual(expect.objectContaining({ message: '“builds” could be “build a house” or “build a hotel”; write the whole wording.' }));
  const whole = phase(['A player may build a house.', 'A player may build a hotel.', 'After a player builds a hotel, the turn passes to the left.']);
  expect(whole.game!.phases[0].after).toMatchObject({ moves: ['build a hotel'] });
});
```

In `declared-actions.test.ts`, change every `{ type: 'roll' | 'buy' | 'end' }` to `'roll the dice' | 'buy the space they are on' | 'end their turn'`, and add:

```ts
it("a button's move type is its wording", () => {
  const engine = engineWith((s) => queueRoll(s, [1, 2]));
  expect(engine.dispatch({ type: 'roll', by: 'p0' }).ok).toBe(false);
  expect(engine.dispatch({ type: 'roll the dice', by: 'p0' }).ok).toBe(true);
});
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/declared-actions.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Then grep the repo for the old move types (`'roll'`, `'buy'`, `'end'` used as `type:`) and update every test. `examples.ts` already dispatches what `{player} {action}` returns.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. All pass, including the 16 Rent Day examples, Hearts and Color Match.
- [ ] **Step 5: Commit** `feat(lang): buttons are identified by their whole wording`

---

### Task 2: Slice 1 leftovers

**Files:**
- Modify: `src/engine/core/lang/refs.ts` (`participle`; `{space}` stub order)
- Modify: `src/engine/core/lang/library/board-phrases.ts` (`moveByRoll`)
- Test: `src/engine/core/lang/refs.test.ts`, `src/engine/core/lang/phrases.test.ts`, `src/engine/core/lang/library/board-phrases.test.ts`

**Interfaces:**
- **`participle(verb)` doubles a final consonant** when the verb has one vowel followed by one consonant other than w, x or y: stop→stopped, skip→skipped, swap→swapped, plan→planned. `roll`, `play`, `open` and `visit` are unchanged. `run` joins the irregulars as `run`.
- **The `{space}` type loses its `stubOrder`.** A developer stub never turns words into `{space}`, so "They go to jail." becomes the stub `'they go to jail'`.
- **`moveByRoll` stops walking** as soon as a pass rule has moved the piece somewhere other than the space it just placed it on, or taken the player out. It then announces no landing.

- [ ] **Step 1: Write the failing tests:**
  - `expect(['stop', 'skip', 'swap', 'plan', 'roll', 'play', 'open', 'visit', 'run'].map(participle)).toEqual(['stopped', 'skipped', 'swapped', 'planned', 'rolled', 'played', 'opened', 'visited', 'run'])`.
  - `stubFor('effect', 'They go to jail.', boardVocab, …)` contains `library.effect('they go to jail'`. `boardVocab` is a vocab whose spaces include "Go To Jail".
  - In `board-phrases.test.ts`, an `announce` that moves the piece to space 2 on the first pass. The walk from 6 by `[1, 2]` then announces exactly one moment, `{ kind: 'pass', seat: 'p0', space: 7 }`, and the piece ends on 2.
- [ ] **Step 2: Run** the three files. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the files, then `bun run test`.
- [ ] **Step 5: Commit** `fix(lang): doubled participles, no space names in stubs, a passes rule may move the piece`

---

### Task 3: Facts on spaces and cards, and the bank: the store

**Files:**
- Modify: `src/engine/core/lang/types.ts`
- Modify: `src/engine/core/lang/board-state.ts`
- Create: `src/engine/core/lang/card-facts.ts`
- Modify: `src/engine/core/lang/testing.ts` (fixtures get `facts: []`, `bank: []`, `card: null`)
- Test: `src/engine/core/lang/board-state.test.ts`, `src/engine/core/lang/card-facts.test.ts`

**Interfaces:**
- **New types** in `types.ts`:
  - `type FactSpec = { name: string; on: 'space' | 'card' | 'player'; kind: 'number' | 'flag' }`.
  - `type BankSpec = { name: string; start: number }`. The name is plural, for example `'houses'`.
  - `BoardSpec` gains `bank: BankSpec[]`. `CompiledGame` gains `facts: FactSpec[]`. `Vocab` gains `facts: FactSpec[]; bank: string[]`.
  - `Subject` gains `card: string | null`. Update every literal (`{ player, space }` becomes `{ player, space, card: null }`).
- **`board-state.ts`:**
  - **`FACTS_KEY = 'lang:facts'`:** `{ spaces: { [index]: { [fact]: number | boolean } }, players: { [seat]: { [fact]: number | boolean } } }`.
  - **`BANK_KEY = 'lang:bank'`:** `{ [name]: number }`.
  - **`withBoardData`** also fills the bank from `board.bank`.
  - **Fact readers and writers:**
    - `spaceFact(state, space, fact): number | boolean | null` (null when never set) and `setSpaceFact(state, space, fact, value)`.
    - `playerFact` and `setPlayerFact`, the same for seats. They are unused until slice 3 and only tested.
  - **Bank:** `bankOf(state, name): number` (0 when unset) and `setBank(state, name, value)`.
- **`card-facts.ts`:**
  - `cardFact(card: CardState, fact: string): Json | null`.
  - `changeCard(state: GameState, cardId: string, data: { [k: string]: Json | null }, game: CompiledGame): GameState`. It merges into `data` (null deletes a key) and refreshes the face key.
  - `faceKeyOf(card: CardState, game: CompiledGame): string`.
    - A table card (face key starting `t:`) gets `textFaceKey` of its table columns in table order, read from its current `data`. After those come its card facts that are set: a flag that is true shows as `yes`, and a number that is not 0 shows as its value.
    - Any other card keeps its face key.
    - Bookkeeping keys such as `movedBy` never appear.

- [ ] **Step 1: Write the failing tests:**
  - **Bank:** `withBoardData` on a board with `bank: [{ name: 'houses', start: 32 }]` gives `bankOf(s, 'houses') === 32`. `setBank` works.
  - **Space facts:** `spaceFact` is null until set. `setSpaceFact(s, 5, 'houses', 2)` reads back as 2, and other spaces are untouched.
  - **Card facts.** With a table card `{ id: 'c0', faceKey: textFaceKey({ name: 'Knight', health: 3 }), data: { name: 'Knight', health: 3, movedBy: 'p0' } }` in a game whose `facts` include `{ name: 'poisoned', on: 'card', kind: 'flag' }`:
    - `changeCard(s, 'c0', { health: 2, poisoned: true }, game)` gives the card `data` `{ name: 'Knight', health: 2, movedBy: 'p0', poisoned: true }`;
    - and `faceKey === textFaceKey({ name: 'Knight', health: 2, poisoned: 'yes' })`;
    - `changeCard(s, 'c0', { poisoned: null }, game)` removes it;
    - a standard-deck card's face key never changes.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/board-state.test.ts src/engine/core/lang/card-facts.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Find a card's table columns from the identity attribute keys of `game.cards` sets, as `describeCards` in `library/example-phrases.ts` does.
- [ ] **Step 4: Run** the tests, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit** `feat(lang): a store for facts on spaces, cards and players, and the bank`

---

### Task 4: Declaring facts and the bank

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`PhraseKind` gains `'declare'`; `DeclareFn`; `BoardPart` gains `{ kind: 'bank'; bank: BankSpec[] }`)
- Modify: `src/engine/core/lang/phrases.ts` (`declare` registrar, static types, `vocabFrom`)
- Modify: `src/engine/core/lang/refs.ts` (new vocab types)
- Create: `src/engine/core/lang/library/fact-phrases.ts` (`registerFactPhrases`, declarations only in this task; add it to `REGISTRARS` after `registerBoardPhrases`)
- Modify: `src/engine/core/lang/library/board-phrases.ts` (`the bank has {banklist}`)
- Modify: `src/engine/core/lang/compile.ts`
- Test: `src/engine/core/lang/phrases.test.ts`, `src/engine/core/lang/refs.test.ts`, `src/engine/core/lang/compile.test.ts`

**Interfaces:**
- **Phrase kind.** `type DeclareFn = (args: Json[]) => FactSpec[]` and `PhraseLibrary.declare(pattern, fn)`. `stubParams('declare')` gives `args`.
- **Static types:**
  - `{factlist}`: "houses and a hotel" → `[{ name: 'houses', kind: 'number' }, { name: 'hotel', kind: 'flag' }]`. A plural noun is a number and "a"/"an" + noun is a flag. Items are separated as card lists are.
  - `{banklist}`: "32 houses and 12 hotels" → `[{ name: 'houses', start: 32 }, { name: 'hotels', start: 12 }]`.
  - `{ints}`: "25, 50, 100 or 200" → `[25, 50, 100, 200]`.
- **Vocab types:**
  - `{spacekind}`: a bare text value of a board column, singular or plural ("street", "streets"), resolving to a `SpaceClass`.
  - `{spaceflag}` and `{spacenumber}`: space facts of that kind.
  - `{cardflag}`: card flag facts.
  - `{banked}`: a bank name, singular or plural ("house", "houses" → `'houses'`).
  - Each has a loose form that says "There is no … called “…”." with suggestions.
- **`fact-phrases.ts` (declare):** `'spaces can have {factlist}'`, `'cards can have {factlist}'`, `'cards can be {name}'`. Each sets `on`.
- **`board-phrases.ts` (board):** `'the bank has {banklist}'`.
- **`compile.ts`:**
  - `Board:` lines match kind `board` with fallback `declare`, and `Cards:` lines match `cards` with fallback `declare`. `matchLine`'s fallback accepts `PhraseKind | PhraseKind[]` from here on.
  - Facts go into `CompiledGame.facts`, and the bank into `BoardSpec.bank`. Both are passed to `vocabFrom`.
  - Errors are reported on the later or offending line:
    - `There are two facts called “houses”.`
    - `“price” is already a column of the table; give the fact another name.` (checked against both board and card table columns)
    - `There is already a “The bank has …” line above.`

- [ ] **Step 1: Write the failing tests:**

```ts
it('declares facts on spaces and a bank', () => {
  const { game, diagnostics } = compileGame(TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  Spaces can have houses and a hotel.\n  The bank has 32 houses and 12 hotels.'), createDefaultLibrary());
  expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(game!.facts).toEqual([{ name: 'houses', on: 'space', kind: 'number' }, { name: 'hotel', on: 'space', kind: 'flag' }]);
  expect(game!.board!.bank).toEqual([{ name: 'houses', start: 32 }, { name: 'hotels', start: 12 }]);
});
it('refuses a fact named like a column', () => {
  const { diagnostics } = compileGame(TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  Spaces can have a price.'), createDefaultLibrary());
  expect(diagnostics).toContainEqual(expect.objectContaining({ line: 15, message: '“price” is already a column of the table; give the fact another name.' }));
});
it('declares a card fact under Cards:', () => {
  const text = COLOR_MATCH_TEXT.replace('    | blue   | 1 to 9 | 2      |', '    | blue   | 1 to 9 | 2      |\n  Cards can be poisoned.');
  expect(compileGame(text, createDefaultLibrary()).game!.facts).toEqual([{ name: 'poisoned', on: 'card', kind: 'flag' }]);
});
```

`COLOR_MATCH_TEXT` is `src/games/color-match.rules` imported with `?raw`. Also add `refs.test.ts` cases for each new type, including `parseParam('spacekind', 'streets', v)` → `{ value: { attribute: 'kind', values: ['street'] } }` and `parseParam('banked', 'a house', v)` failing (the article belongs in the pattern) while `'house'` gives `'houses'`.
- [ ] **Step 2: Run** the three files. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, then `bun run test`. Hearts, Color Match and Rent Day compile unchanged.
- [ ] **Step 5: Commit** `feat(lang): declare facts on spaces and cards, and the bank's numbers`

---

### Task 5: Phrases over space facts, the bank, and owning sets

**Files:**
- Modify: `src/engine/core/lang/library/fact-phrases.ts`
- Test: `src/engine/core/lang/library/fact-phrases.test.ts`

**Interfaces:**
- Consumes the fact store (Task 3) and types (Task 4). A number fact never set reads as 0 and a flag as false.
- **Conditions** (needsSpace unless noted):
  - `'it has a {spaceflag}'`, `'it has no {spaceflag}'`
  - `'it has {int} {spacenumber}'`, `'it has fewer than {int} {spacenumber}'`
  - `'the bank has a {banked}'` (no flags)
  - `'they own every {spacekind} of its {spaceattr}'` (needsPlayer, needsSpace, needsBoard)
- **Bank and fact mapping.** A bank name goes with the number fact of the same name, or else the flag fact named its singular. With neither, a RuleError: `No fact goes with the bank's ${name}.`
- **Effects:**
  - `'it gets a {banked} from the bank'` (needsSpace): it takes 1 from the bank and adds 1 to the number fact, or sets the flag. An empty bank is a RuleError: `The bank has no ${name} left.`
  - `'its {spacenumber} go back to the bank'` (needsSpace): it adds the fact's value to the bank and sets the fact to 0.
  - `'their {banked} go back to the bank'` (needsPlayer, needsBoard): the same for every space they own. A set flag returns 1 and is cleared.
- **Moment:** `'a player lands on a space someone else owns'`.
- **Given** (examples):
  - `'{space} has {int} {spacenumber}'`, `'{space} has a {spaceflag}'`
  - `'the bank has {int} {banked}'`
  - These arrange the state directly and don't touch the bank.
- **Expect** (examples):
  - `'{space} has {int} {spacenumber}'`: "Expected Rose Lane to have 1 house, but it has 0."
  - `'{space} has a {spaceflag}'`: "Expected Rose Lane to have a hotel, but it has none."
  - `'{space} has no {spaceflag}'`
  - `'the bank has {int} {banked}'`: "Expected the bank to have 31 houses, but it has 32."

- [ ] **Step 1: Write the failing tests** with `runPhrase`. In the test file, build a game from `fixtureBoardGame` with `facts` `[{ name: 'houses', on: 'space', kind: 'number' }, { name: 'hotel', on: 'space', kind: 'flag' }]`, `bank` `[{ name: 'houses', start: 32 }, { name: 'hotels', start: 12 }]`, and spaces `[...FIXTURE_SPACES, Lily Lane]`, where Lily Lane is a second orange street (index 8, price 180, rent 14). Leave the shared `FIXTURE_SPACES` alone: slice 1's walk tests depend on its eight spaces. Then check:
  - `it gets a house from the bank` on space 5 gives `spaceFact(s, 5, 'houses') === 1` and `bankOf(s, 'houses') === 31`.
  - The same with the bank at 0 throws `The bank has no houses left.`
  - `it gets a hotel from the bank` sets the hotel flag and leaves `hotels` at 11.
  - `its houses go back to the bank` with 4 houses gives 0 houses and the bank +4.
  - `their hotels go back to the bank` returns one hotel per owned space that has one.
  - `they own every street of its color` is true when p0 owns 5 and 8, and false with only 5.
  - The moment `a player lands on a space someone else owns` holds for a land on an owned station or utility.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/fact-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test, then `bun run test`.
- [ ] **Step 5: Commit** `feat(lang): phrases for space facts, the bank, and owning a full set`

---

### Task 6: Sections named after a table column, and Rent Day's own phrases

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`PhraseKind` gains `'column'`; `ColumnFn`; `CompiledGame.columns`; `PhraseEnv.valueOf`)
- Modify: `src/engine/core/lang/phrases.ts` (`column` registrar), `src/engine/core/lang/compile.ts`, `src/engine/core/lang/runtime.ts`
- Modify: `src/engine/core/lang/library/board-phrases.ts` (`amountOf` reads through `env.valueOf`)
- Create: `src/engine/core/lang/library/rent-day.ts` (`registerRentDayPhrases`; add it to `REGISTRARS`)
- Test: `src/engine/core/lang/compile.test.ts`, `src/engine/core/lang/library/rent-day.test.ts`

**Interfaces:**
- **Phrase kind.** `type ColumnFn = (env: PhraseEnv, args: Json[], value: number | null) => number | null` and `PhraseLibrary.column(pattern, fn, opts?)`.
- **Compiled game.** `CompiledGame.columns: { [column: string]: PhraseRef[] }` holds a column section's lines in written order.
- **Reading sections.**
  - A section header that is not one of the fixed names and matches a board-table column (`canon`) is a column section.
  - Its lines are matched as kind `column` with `{ space: true }`.
  - Any other unknown header gets `I don't understand this section. Sections are Game, Players, Cards, Table, Board, Setup, Phase, End and Example, or a column of the board's table.`, with suggestions from both.
- **`PhraseEnv.valueOf?: (state: GameState, space: number, column: string) => number | null`.**
  - The runtime supplies it: `LangRuntime.valueOf(state, space, column)` is a public method with that signature, and `env()` passes it on. Tests and the Rent Day auto-player call the method.
  - It starts from the cell (a number, null when blank, or a RuleError `${space}'s ${column} isn't a number.` for text).
  - Each column line then runs in order with subject `{ player: null, space, card: null }`.
  - `amountOf` reads through it (falling back to the cell without a runtime), so "its rent" uses `Rent:`.
- **`rent-day.ts` phrases.** Fixed wording; Monopoly words are allowed in this file only.
  - Column `"a street's rent depends on its houses and hotel"`: on a street with the `hotel` flag it returns the `with hotel` cell. With `houses` n ≥ 1 it returns the `1 house` or `${n} houses` cell. Otherwise it returns `value`.
  - Column `'a street in a full set with no buildings has double rent'`: when the street's owner owns every street of its color and it has no houses and no hotel, it returns `value * 2`. Otherwise `value`.
  - Column `"a station's rent is {ints} when its owner has {ints} stations"`: on a station, the owner's station count picks the matching amount. Otherwise `value`.
  - Column `"a utility's rent is {int} times the roll, or {int} times when its owner has both"`: on a utility, it charges the first number times the roll, or the second when the owner has every utility. Otherwise `value`.
  - Condition `'no {spacekind} of its {spaceattr} has fewer buildings'` (needsSpace): buildings are houses plus five for a hotel.

- [ ] **Step 1: Write the failing tests.**
  - **`compile.test.ts`:** a `Rent:` section under `TINY_BOARD_HEAD` gives `game.columns.rent` with one ref. A `Rnt:` header gets the unknown-section message with `suggestions` containing `Rent`.
  - **`rent-day.test.ts`:** use a fixture board with Rose Lane, Lily Lane and Iris Road (all orange, `rent` 14/14/16, `1 house` 70, `2 houses` 200, `with hotel` 950), two stations and two utilities. Call the column functions through `runtime.valueOf` built on that game. Check:
    - Rose Lane owned alone: 14. All three owned: 28.
    - Two houses: 200. A hotel: 950.
    - Stations: one owned gives 25, two give 50.
    - Utilities with a roll of `[1, 2]`: one owned gives 12, both give 30.
    - `no street of its color has fewer buildings` is false on Rose Lane with 1 house while Lily Lane has 0.
- [ ] **Step 2: Run** the two files. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, then `bun run test`.
- [ ] **Step 5: Commit** `feat(lang): sections named after a table column, and Rent Day's rent phrases`

---

### Task 7: Buttons that pick a target

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`PhraseKind` gains `'target'`; `TargetFn`; `DeclaredAction` gains `base` and `target`; `Vocab.actions` entries gain `base` and `targeted`)
- Modify: `src/engine/core/lang/phrases.ts`, `src/engine/core/lang/compile-phase.ts`, `src/engine/core/lang/declared-actions.ts`, `src/engine/core/lang/refs.ts` (`{targetaction}`)
- Modify: `src/engine/core/lang/library/fact-phrases.ts` (target phrases), `src/engine/core/lang/library/board-phrases.ts` (example action)
- Test: `src/engine/core/lang/compile-phase.test.ts`, `src/engine/core/lang/declared-actions.test.ts`

**Interfaces:**
- **Phrase kind.** `type TargetFn = (env: PhraseEnv, args: Json[], space: number) => boolean`, where `env.subject.player` is the presser. `PhraseLibrary.target(pattern, fn)`.
- **Target phrases** (`fact-phrases.ts`): `'a {spacekind} they own'`, `'a {spacekind}'`, `'a space they own'`.
- **Compiling a targeted button.**
  - An action line whose words end with ` on a …` or ` on an …` is targeted. The text after the last ` on ` is matched as kind `target` (unknown text gets the usual diagnostics), so a mistyped target never becomes a plain button.
  - `base` is the lowercase wording before ` on `. `words` stays the whole lowercase line, and so stays the move type. `label` is `actionLabel` of the written base ("Build a house").
  - An untargeted button has `base === words` and `target: null`.
- **The move.** It carries `target: number`, the space index. The handler's `legal` refuses in this order:
  - not this phase's button: `You can't ${base} now.`
  - out: "You're out of the game."
  - missing or out-of-range target: `Pick where to ${second-person base}.`
  - the target phrase is false: `That isn't ${second-person target text}.` ("That isn't a street you own.")
  - otherwise, the first failing `Only if` group, with subject `{ player: by, space: target, card: null }`.
  - `apply` uses the same subject, so "it" is the target.
- **`targetCandidates(runtime: LangRuntime, action: DeclaredAction, state: GameState, seat: PlayerId): number[]`** in `declared-actions.ts`: the spaces the target phrase allows for that seat, in board order.
- **Examples.** The action phrase `'{player} {targetaction} on {space}'` returns `{ by, move: { type: words, target: space } }`. `{targetaction}` covers `thirdPersonWords(base)` of targeted buttons only. `{action}` covers untargeted buttons only.

- [ ] **Step 1: Write the failing tests:**
  - **Compiling.** In a phase under a board with `Spaces can have houses and a hotel.`, `The bank has 32 houses and 12 hotels.` and `Players pay with money.`, the line `A player may build a house on a street they own.` with `Then: It gets a house from the bank.` compiles to `{ words: 'build a house on a street they own', base: 'build a house', label: 'Build a house', target: { kind: 'target', phrase: 'a {spacekind} they own' } }`.
  - **A mistyped target.** `A player may build a house on a stret they own.` reports `There is no kind of space called “stret”.` on that line and creates no button.
  - **Handler, using a TINY_BOARD variant with that button:**
    - with no `target` → `Pick where to build a house.`
    - `target: 99` → the same sentence;
    - on a street someone else owns → `That isn't a street you own.`
    - on their own street → accepted, `spaceFact(..., 'houses') === 1`;
    - `targetCandidates` lists exactly the streets they own.
  - **Example.** `When p0 builds a house on Rose Lane` runs through `runExamples`.
- [ ] **Step 2: Run** the two files. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, then `bun run test`.
- [ ] **Step 5: Commit** `feat(lang): buttons that pick a space on the board`

---

### Task 8: Rules about cards: facts that change, card rules, and the other player

**Files:**
- Modify: `src/engine/core/lang/types.ts`:
  - `PhraseKind` gains `'which'`;
  - new `WhichFn`;
  - `SeatRef` gains `{ who: 'other' }`;
  - `PhraseOpts` gains `needsCard`;
  - `LineCtx` gains `card`.
- Modify: `src/engine/core/lang/phrases.ts`, `src/engine/core/lang/compile-util.ts`, `src/engine/core/lang/compile-phase.ts`, `src/engine/core/lang/runtime.ts`, `src/engine/core/lang/refs.ts`, `src/engine/core/lang/zones.ts`, `src/engine/core/lang/library/support.ts`
- Modify: `src/engine/core/lang/library/fact-phrases.ts`
- Test: `src/engine/core/lang/library/fact-phrases.test.ts`, `src/engine/core/lang/compile-phase.test.ts`, `src/engine/core/lang/runtime.test.ts`, `src/engine/core/derive-scene.test.ts`

**Interfaces:**
- **Phrase kind.** `type WhichFn = (env: PhraseEnv, args: Json[]) => string[]` returns card ids in a fixed order (by zone, then slot). `PhraseLibrary.which(pattern, fn)`.
- **Compiling card rules.**
  - `compileTrigger` matches `when` as `condition`, then `who`, then `which`.
  - A `which` rule's body is compiled with `{ ...ctx, card: true }`.
  - `matchLine` refuses a `needsCard` phrase elsewhere: `“${clean}” only makes sense in a rule about a card, such as “When a card …”.`
- **Running card rules.** `runtime.triggerSubject` returns `{ player: null, space: null, card: id }` for the first card from `which()` whose `Only if` groups hold. `support.ts` gains `cardOf(env): string`.
- **The other player.**
  - A zone reference `the other player's <zone>` resolves to `{ of: { who: 'other' }, zone }`.
  - In a game whose `Players:` allows more than two it is an error on the line: `“the other player” needs a game for two players.`
  - `resolveSeat` gives the seat that isn't the actor.
  - `mentionsActor` counts `'other'` too.
- **Card phrases** (`fact-phrases.ts`):
  - **Which:** `'a card in a {perzone} has {int} {attribute}'`.
  - **Conditions:** `'it is {cardflag}'` (needsCard) and `'the card is {cardflag}'` (the move's card, needsMove), the spec's "the card is poisoned".
  - **Effects:**
    - `'move it to {zone}'` (needsCard). It moves the card like `relocate`; its facts stay with it.
    - `'every card in {zone} is {cardflag}'`.
    - `'each {cardflag} card in {zone} loses {int} {attribute}'`.
    - All three change cards through `changeCard`, so faces refresh.
  - **Winner:** `'the player with the most cards in their {perzone} wins'`. A tie goes to the earliest seat.
- **Examples:**
  - Given `'{card} in {zone} is {cardflag}'`.
  - Expect `'{card} in {zone} is {cardflag}'` ("Expected the Knight in p1's camp to be poisoned, but it isn't.").
  - Expect `'{card} in {zone} is not {cardflag}'`.
  - Expect `'{card} in {zone} has {int} {attribute}'` ("Expected the Knight in p1's camp to have 2 health, but it has 3.").

- [ ] **Step 1: Write the failing tests.**
  - **`fact-phrases.test.ts`**, on a card fixture game with zones `deck`, `discard pile`, per-player `hand` and `camp` (row, public), a creatures table (name, health) and `facts: [{ name: 'poisoned', on: 'card', kind: 'flag' }]`:
    - `every card in the other player's camp is poisoned` (subject p0) poisons p1's camp only;
    - `each poisoned card in their camp loses 1 health` lowers only poisoned cards, and their face keys change;
    - the which phrase `a card in a camp has 0 health` lists exactly the camp cards at 0;
    - `move it to the discard pile` (subject card c3) moves c3 with `poisoned` still true;
    - `it is poisoned` (subject card c3) is true, and false for an unpoisoned card.
  - **`compile-phase.test.ts`:**
    - `When a card in a camp has 0 health:` with `Move it to the discard pile.` compiles, and the trigger's `when.kind` is `'which'`;
    - `Move it to the discard pile.` under `Setup:` gets the needs-a-card message;
    - `the other player's camp` in a `Players: 2 to 4` game gets the two-players message.
  - **`derive-scene.test.ts`:** a card in p0's hand with `data: { name: 'Knight', health: 3, poisoned: true }` and its refreshed face key, projected for p1, has `faceKey === 'back'` and no `poisoned` and no `health` in `data`.
- [ ] **Step 2: Run** the files. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, then `bun run test`.
- [ ] **Step 5: Commit** `feat(lang): facts on cards that change, rules about each card, and the other player`

---

### Task 9: Views: facts on spaces, the bank, and what a targeted button may pick

**Files:**
- Modify: `src/engine/core/lang/board-view.ts`
- Test: `src/engine/core/lang/board-view.test.ts`

**Interfaces:**
- **`SpaceView`** gains `facts: { [fact: string]: number | boolean }`. Only facts that are set appear: numbers other than 0, flags that are true.
- **`BoardView`** gains `bank: { name: string; count: number }[]` in declared order.
- **`ActionView`** gains `target: { prompt: string; spaces: { [space: string]: true | string } } | null`:
  - `prompt` is `Pick ${second-person target text}` ("Pick a street you own").
  - `spaces` holds every candidate from `targetCandidates`, each `true` or the reason from `engine.canDispatch({ type, by, target })` (run through `friendlyReason`).
  - For a targeted button, `allowed` is `true` when any candidate is `true`. Otherwise it is the first candidate's reason, or, with no candidates, `There is no ${second-person target text}.` ("There is no street you own.").
- **`readSeatExtras`** checks the new fields.

- [ ] **Step 1: Write the failing tests** on a TINY_BOARD variant with houses, a hotel, the bank and the build button. p0 owns both streets of one color, and one of them has 1 house. Check:
  - the space view's `facts` is `{ houses: 1 }`;
  - the bank lists `[{ name: 'houses', count: 32 }, …]` as given;
  - the build button's `target.spaces` has the street with fewer buildings as `true` and the other with the even-building sentence;
  - p1's build button reads `There is no street you own.` when p1 owns none;
  - `readSeatExtras` round-trips.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/board-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test, then `bun run test`.
- [ ] **Step 5: Commit** `feat(lang): seat views show facts, the bank, and where a button may be pointed`

---

### Task 10: Rent Day, slice 2

**Files:**
- Modify: `src/games/rent-day.rules`
- Modify: `src/games/rent-day.test.ts`

**Interfaces:**
- Consumes everything above. The move types are `'roll the dice'`, `'buy the space they are on'`, `'build a house on a street they own'` (with `target`) and `'end their turn'`.

- [ ] **Step 1: Change the board table** to these columns:

```text
    | space | kind | color | price | house price | rent | 1 house | 2 houses | 3 houses | 4 houses | with hotel | tax |
```

  - **Streets:** fill each street's `house price`, `1 house`…`with hotel` with the values in the spec's table.
  - **Stations and utilities:** keep the price and leave rent blank.
  - **Other spaces:** unchanged.
- [ ] **Step 2: Under `Board:`, after the dice line, add:**

```text
  Spaces can have houses and a hotel.
  The bank has 32 houses and 12 hotels.

Rent:
  A street's rent depends on its houses and hotel.
  A street in a full set with no buildings has double rent.
  A station's rent is 25, 50, 100 or 200 when its owner has 1, 2, 3 or 4 stations.
  A utility's rent is 4 times the roll, or 10 times when its owner has both.
```

- [ ] **Step 3: In `Phase: playing`:**
  - Replace the hint with `Hint: Roll the dice, then buy, build, or end your turn.`
  - Add this button after the buy button:

```text
  A player may build a house on a street they own.
    Only if they own every street of its color.
    Only if it has no hotel.
    Only if no street of its color has fewer buildings.
    Only if they have at least its house price in money.
    Only if one of:
      it has fewer than 4 houses
      the bank has a hotel
    Only if one of:
      it has 4 houses
      the bank has a house
    Then:
      They pay its house price.
      If it has 4 houses, it gets a hotel from the bank.
      If it has a hotel, its houses go back to the bank.
      If it has no hotel, it gets a house from the bank.
```

  - Replace the two lands-on rent rules (street or station, and utility) with:

```text
  When a player lands on a space someone else owns:
    They pay its rent to its owner.
```

  - In the "less than 0 money" rule, before `Their spaces go back to the bank.`, add `Their houses go back to the bank.` and `Their hotels go back to the bank.`.

- [ ] **Step 4: Append these examples** after the 16 existing ones (which stay, unchanged):

```text
Example: a full set doubles the base rent
  Given p1 owns Rose Lane
  And p1 owns Lily Lane
  And p1 owns Iris Road
  And p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0 has 1472 money
  And p1 has 1528 money

Example: a player builds a house on a full set
  Given p1 owns Rose Lane
  And p1 owns Lily Lane
  And p1 owns Iris Road
  And it is p1's turn
  When p1 builds a house on Rose Lane
  Then it is accepted
  And Rose Lane has 1 house
  And p1 has 1400 money
  And the bank has 31 houses

Example: building needs the full set
  Given p1 owns Rose Lane
  And p1 owns Lily Lane
  And it is p1's turn
  When p1 builds a house on Rose Lane
  Then it is rejected because "they own every street of its color"

Example: building is refused on someone else's street
  Given p0 owns Rose Lane
  And p0 owns Lily Lane
  And p0 owns Iris Road
  And it is p1's turn
  When p1 builds a house on Rose Lane
  Then it is rejected because "That isn't a street you own."

Example: houses are built evenly
  Given p1 owns Rose Lane
  And p1 owns Lily Lane
  And p1 owns Iris Road
  And Rose Lane has 1 house
  And it is p1's turn
  When p1 builds a house on Rose Lane
  Then it is rejected because "no street of its color has fewer buildings"

Example: houses raise the rent
  Given p1 owns Rose Lane
  And p1 owns Lily Lane
  And p1 owns Iris Road
  And Rose Lane has 2 houses
  And Lily Lane has 2 houses
  And Iris Road has 2 houses
  And p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0 has 1300 money
  And p1 has 1700 money

Example: four houses become a hotel
  Given p1 owns Rose Lane
  And p1 owns Lily Lane
  And p1 owns Iris Road
  And Rose Lane has 4 houses
  And Lily Lane has 4 houses
  And Iris Road has 4 houses
  And the bank has 20 houses
  And it is p1's turn
  When p1 builds a house on Rose Lane
  Then it is accepted
  And Rose Lane has a hotel
  And Rose Lane has 0 houses
  And the bank has 24 houses
  And the bank has 11 hotels
  And p1 has 1400 money

Example: a hotel charges its rent
  Given p1 owns Rose Lane
  And p1 owns Lily Lane
  And p1 owns Iris Road
  And Rose Lane has a hotel
  And Lily Lane has 4 houses
  And Iris Road has 4 houses
  And p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0 has 550 money
  And p1 has 2450 money

Example: building takes the bank's last house
  Given p1 owns Rose Lane
  And p1 owns Lily Lane
  And p1 owns Iris Road
  And the bank has 1 house
  And it is p1's turn
  When p1 builds a house on Rose Lane
  Then it is accepted
  And Rose Lane has 1 house
  And the bank has 0 houses

Example: no houses left in the bank
  Given p1 owns Rose Lane
  And p1 owns Lily Lane
  And p1 owns Iris Road
  And the bank has 0 houses
  And it is p1's turn
  When p1 builds a house on Rose Lane
  Then it is rejected because "it has 4 houses or the bank has a house"

Example: two stations charge 50
  Given p1 owns North Station
  And p1 owns East Station
  And p0 is on Go
  And the next roll is 2 and 3
  When p0 rolls the dice
  Then p0 has 1450 money
  And p1 has 1550 money

Example: both utilities charge 10 times the roll
  Given p1 owns Power Works
  And p1 owns Pump House
  And p0 is on Cedar Avenue
  And the next roll is 1 and 2
  When p0 rolls the dice
  Then p0 has 1470 money
  And p1 has 1530 money

Example: going out returns your buildings to the bank
  Given 3 players
  And p0 owns Rose Lane
  And p0 owns Lily Lane
  And p0 owns Iris Road
  And Rose Lane has 1 house
  And Lily Lane has 1 house
  And Iris Road has 1 house
  And the bank has 29 houses
  And p1 owns The Promenade
  And p0 has 30 money
  And p0 is on Harbour Heights
  And the next roll is 1 and 1
  When p0 rolls the dice
  Then p0 is out
  And the bank has 32 houses
  And Rose Lane has 0 houses
  And no one owns Rose Lane
```

- [ ] **Step 5: Extend `rent-day.test.ts`:**
  - **Examples:** all 29 pass.
  - **The auto-player** (`playTurn`):
    - it rolls;
    - it buys when allowed;
    - while the build button's `targetCandidates` contains a target `canDispatch` accepts, it builds on the first such target;
    - then it ends its turn (unless it went out).
  - **Long run:**
    - The existing 60-round long run keeps its money invariant, now with building costing exactly the house price and rent read through the runtime's `valueOf`.
    - Add the bank invariant: houses on the board plus `bankOf(houses)` equals 32 after every move, and hotels equal 12.
  - **2-player ending:** at least 9 of the seeds 1 to 10 reach a winner within 3000 turns. The test names the seeds that don't.
  - **4 and 8 players with full sets:**
    - Before the first move, each seat owns one whole color set: seat i gets the i-th color in board order, using `setOwner` on `withBoardData(initialState(...))`.
    - With seeds 1, 2 and 3, each game reaches a winner within 5000 turns, and the winner is the only player still in.
    - If a seed doesn't finish, try the next seed and say so in the commit. Don't raise the cap past 20000.
- [ ] **Step 6: Run** `bunx vitest run src/games/rent-day.test.ts`. Fix any failure in the phrases, not the example numbers. The numbers come from the spec's table.
- [ ] **Step 7: Run** `bun run test` and `bun run typecheck`.
- [ ] **Step 8: Commit** `feat(games): Rent Day slice 2: sets, houses, hotels, the bank, and rent that grows`

---

### Task 11: Venom

**Files:**
- Create: `src/games/venom.rules`
- Create: `src/games/venom.test.ts`

- [ ] **Step 1: Write `src/games/venom.rules`.**
  - Use the spec's Venom text, with the rule line `When a card in a camp has 0 health:`.
  - Under `Table:`, write the camp line as `Each player has a camp that everyone can see.`. A per-player zone whose name doesn't end in "hand" is a pile, which shows only its top card. If the camp must be a row to show every card, add a phrase `each player has a {name} row that {visibility}` in `setup-phrases.ts` (per-player row) and write `Each player has a camp row that everyone can see.`. Choose whichever shows every camp card on the playtest page, and say which in the commit.
  - Then append these examples:

```text
Example: a Viper poisons the other camp
  Given p0 holds a Viper
  And p1's camp has a Knight
  When p0 plays a Viper
  Then the Knight in p1's camp is poisoned

Example: a freshly poisoned card loses no health yet
  Given p0 holds a Viper
  And p1's camp has a Knight
  When p0 plays a Viper
  Then the Knight in p1's camp has 3 health

Example: poisoned cards lose health when their owner plays
  Given it is p1's turn
  And p1 holds an Archer
  And p1's camp has a Knight
  And the Knight in p1's camp is poisoned
  When p1 plays an Archer
  Then the Knight in p1's camp has 2 health

Example: a card at 0 health goes to the discard pile
  Given it is p1's turn
  And p1 holds an Archer
  And p1's camp has a Viper
  And the Viper in p1's camp is poisoned
  When p1 plays an Archer
  Then the discard pile has a Viper
  And p1's camp has an Archer

Example: an unpoisoned card keeps its health
  Given it is p1's turn
  And p1 holds an Archer
  And p1's camp has a Knight
  When p1 plays an Archer
  Then the Knight in p1's camp has 3 health

Example: you draw only with an empty hand
  Given p0 holds a Knight
  When p0 draws a card
  Then it is rejected because "their hand is empty"

Example: the most cards in a camp wins
  Given the deck is empty
  And p0 holds a Knight
  And p1's hand is empty
  And p0's camp has a Knight
  And p1's camp has an Archer
  When p0 plays a Knight
  Then p0 wins
```

- [ ] **Step 2: Write `src/games/venom.test.ts`** in the shape of `color-match.test.ts`:
  - it compiles with no diagnostics;
  - all 7 examples pass;
  - 16 cards with text faces;
  - an auto-player that plays its first card, or draws when its hand is empty, reaches a winner with seeds 1 to 5;
  - after a Viper is played in a seeded game, at least one camp card's face key contains `poisoned`.
- [ ] **Step 3: Run** `bunx vitest run src/games/venom.test.ts`, fix phrases if needed, then run `bun run test` and `bun run typecheck`.
- [ ] **Step 4: Commit** `feat(games): Venom, a small card game where cards gain facts that matter later`

---

### Task 12: The playtest: houses, hotels, picking a street, the bank, and Venom; README

**Files:**
- Modify: `src/pages/designer/board-grid.tsx`, `src/pages/designer/board-controls.tsx`, `src/pages/designer/playtest.tsx`, `src/pages/designer/samples.ts`, `README.md`
- Test: `src/pages/designer/board-parts.test.tsx`, `src/pages/designer/playtest.test.tsx`, `src/pages/designer/designer-page.test.tsx`

**Interfaces:**
- Consumes `SpaceView.facts`, `BoardView.bank` and `ActionView.target` (Task 9).
- **Board grid.**
  - A space's number facts draw as that many small squares on its color band, up to 4. A larger number draws as one square and the number.
  - Its true flags draw as one red block per flag.
  - Its `title` gains the facts (`Rose Lane — 2 houses, …`).
- **Picking.** `BoardGrid` takes an optional `picking?: { spaces: { [space: string]: true | string }; onPick(space: number): void; onRefused(reason: string): void }`:
  - pickable spaces get an outline and `role="button"` with `aria-label` `Pick ${name}`;
  - refused ones are dashed and clicking them calls `onRefused(reason)`;
  - other spaces fade;
  - the middle says the prompt.
- **Controls.** `MoneyLine` gains a bank line, `bank: 31 houses, 12 hotels`.
- **Buttons.** `ActionButtons` treats a targeted button as follows:
  - when allowed, pressing it opens picking (`onPick(action)`);
  - when greyed, it shows the reason as today.
- **The seat panel.** In picking mode it shows a banner with the prompt and a Cancel button. A pick sends `{ type: action.move, target }` and leaves picking mode.
- **Samples.** `SAMPLES` gains Venom.
- **Venom's cards** use the existing text face. Their refreshed face keys show health and "poisoned" without page changes.

- [ ] **Step 1: Write the failing tests:**
  - **`board-parts.test.tsx`:**
    - a space with `facts: { houses: 2 }` renders 2 house marks (`data-testid="house"`);
    - a space with `{ hotel: true }` renders 1 `data-testid="flag"`;
    - in picking mode a pickable space has `role="button"`, and clicking it calls `onPick` with its index;
    - a refused space click calls `onRefused` with its reason.
  - **`playtest.test.tsx`:**
    - Mount Rent Day with 2 players, seed 1, and a game state where p0 owns the three orange streets. Use a test-only `initial` prop on `Playtest`, or build the server directly as other tests do; this is the builder's choice.
    - Press p0's "Build a house". The banner `Pick a street you own` appears.
    - Click `Pick Rose Lane`. The seat's money line drops by 100, Rose Lane's title says `1 house`, and the bank line says `31 houses`.
    - Cancel leaves picking mode without sending.
    - p1, who owns no street, sees "Build a house" greyed with `There is no street you own.`; pressing it opens no banner.
  - **`designer-page.test.tsx`:**
    - loading Rent Day shows 29 of 29 examples passing;
    - loading Venom shows 7 of 7 and enables Play.
- [ ] **Step 2: Run** `bunx vitest run src/pages/designer`. Expected: FAIL.
- [ ] **Step 3: Implement.** Then check in the browser: run `bun run dev`, open `/#designer`, play Rent Day to a build, and play Venom to a poisoning. A throwaway Playwright script is fine, but don't commit it.
- [ ] **Step 4: Run** `bunx vitest run src/pages/designer`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: README.** Under *Designing a game*, add Venom to the samples and add short notes on facts ("Spaces can have …", "Cards can be …"), buttons that pick a space, and column sections (`Rent:`). In the roadmap, mark slice 2 done.
- [ ] **Step 6: Commit** `feat(designer): build by picking a street, houses and hotels on the board, the bank, and Venom; docs: README`
